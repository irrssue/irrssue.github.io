/* ------------------------------------------------------------------
   Background pre-loader for the Gems page photos.

   Runs on the homepage. Once the homepage has finished loading and the
   browser is idle, it quietly warms the cache with the Gems photos so
   that when the visitor later opens /gems the images are already on
   disk and appear instantly.

   Design goals:
   - Never compete with the homepage's own load (waits for `load` + idle)
   - Polite on mobile: skips on Save-Data and slow/metered connections
   - Low network priority so it can't slow anything the user is doing now
   - Data-driven: reads the photo list from /data/gems.json, so changing
     a photo URL there needs no change here
   - Runs at most once per browser session

   Note: the Gems photos are served from Cloudflare with a 1-year
   immutable cache, so a single warm-up keeps them cached for repeat
   visits too.
------------------------------------------------------------------ */
(function () {
  // Only warm the cache once per session.
  if (sessionStorage.getItem("gemsPreloaded")) return;

  // Respect the visitor's connection: bail on Save-Data or slow links so
  // we never burn someone's mobile data on photos they may not open.
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    if (conn.saveData) return;
    if (/(^|-)2g$/.test(conn.effectiveType || "")) return;
  }

  function warm() {
    sessionStorage.setItem("gemsPreloaded", "1");

    fetch("data/gems.json")
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (gems) {
        if (!Array.isArray(gems)) return;

        gems
          .filter(function (g) { return g && g.type === "photo" && g.src; })
          .forEach(function (g, i) {
            var img = new Image();
            // Low priority: this is speculative work, the homepage and any
            // user action must always win the network.
            if ("fetchPriority" in img) img.fetchPriority = "low";
            img.decoding = "async";
            // Stagger slightly so all of them don't fire in the same tick.
            setTimeout(function () { img.src = g.src; }, i * 150);
          });
      })
      .catch(function () { /* preloading is best-effort; ignore failures */ });
  }

  function schedule() {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(warm, { timeout: 4000 });
    } else {
      setTimeout(warm, 1200);
    }
  }

  // Wait until the homepage itself is fully loaded before starting.
  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }
})();

/* ------------------------------------------------------------------
   Capability gate

   The current design is built out of things a 2013 browser has never
   heard of: custom properties, grid, sticky positioning, 3D transforms,
   backdrop-filter, the rotating project ring, the intro curtain. Half of
   that applied is worse than none of it, so the site asks one question
   before it commits to any of it — can this browser do custom
   properties? Nothing else in the modern design predates them in any
   engine, so a yes means the rest is safe and a no means none of it is.

   The answer is stamped on <html> as `modern` or `legacy`:

     modern  css/styles.css applies (it gates itself on the same test),
             and the animation scripts listed in this tag's data-enhance
             are fetched and run.
     legacy  css/legacy.css draws the site's older, plain design — the
             one where projects are a list of lines under Writing, the
             same shape as the Writing list — and not a byte of the
             animation JS is downloaded, let alone parsed.

   Written in ES3 on purpose: this file has to parse in the browsers it
   is here to detect, or it can never tell them apart. It is loaded
   un-deferred, ahead of the stylesheets, so the class is on <html>
   before the first paint and no design flashes into the other.
   ------------------------------------------------------------------ */
(function () {
    var root = document.documentElement;

    /* The same condition css/styles.css wraps itself in, written the same
       way, so the two gates can never disagree about a browser. */
    function hasCustomProperties() {
        try {
            return !!(window.CSS && window.CSS.supports && window.CSS.supports('(--gate: 0)'));
        } catch (error) {
            return false;
        }
    }

    /* Transitions, transforms and keyframes are what "animated" means here.
       Sniffing the style object catches engines that ship the properties
       without CSS.supports at all. */
    function hasAnimation() {
        var style = document.createElement('div').style;
        return 'transition' in style && 'transform' in style && 'animationName' in style;
    }

    /* Two answers, and they are deliberately not the same one.

       `paints` decides which stylesheet draws the page, and it asks the one
       question css/styles.css asks of itself — nothing more, so the class on
       <html> and the @supports gate in that file can never disagree and leave
       a page half drawn by each.

       `SITE_MODERN` decides whether the animated behaviour runs, and it wants
       the rest of the machinery too. A browser that paints the current design
       but cannot animate it simply gets it standing still, which is what the
       stylesheet already draws with scripting off. */
    var paints = hasCustomProperties();
    var capable = !!(
        paints &&
        hasAnimation() &&
        window.addEventListener &&
        window.requestAnimationFrame &&
        document.querySelectorAll &&
        root.classList
    );

    window.SITE_MODERN = capable;
    root.className = (root.className ? root.className + ' ' : '') + (paints ? 'modern' : 'legacy');

    if (!capable) return;

    /* Enhancement scripts. They live in this tag's data-enhance rather than
       in <script src> tags of their own so that an old browser never fetches
       them — several are written in syntax it cannot even parse. */
    var tag = document.getElementById('capability');
    var manifest = tag && tag.getAttribute('data-enhance');
    if (!manifest) return;

    var sources = [];
    var listed = manifest.split(',');
    for (var i = 0; i < listed.length; i++) {
        var src = listed[i].replace(/^\s+|\s+$/g, '');
        if (src) sources.push(src);
    }

    /* Fetch now, run later. Tags of their own would have been found by the
       preload scanner while the head was still parsing; injecting them only
       once the document is ready would give that back up, so the download is
       started here and the execution waits. */
    for (var j = 0; j < sources.length; j++) {
        var hint = document.createElement('link');
        hint.rel = 'preload';
        hint.as = 'script';
        hint.href = sources[j];
        document.head.appendChild(hint);
    }

    function run() {
        for (var k = 0; k < sources.length; k++) {
            var script = document.createElement('script');
            script.src = sources[k];
            /* Injected scripts default to async; this keeps them running in
               the order they are listed, the way `defer` used to. */
            script.async = false;
            document.head.appendChild(script);
        }
    }

    /* They all expect a parsed document, which is what `defer` bought them
       when they were plain tags at the end of <body>. */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();

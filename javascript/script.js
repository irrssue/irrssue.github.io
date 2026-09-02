/* ------------------------------------------------------------------
   Top hamburger navigation

   One pill at the top of every page that expands into the menu card.
   The markup is identical on every page, so the link for the page the
   visitor is on is marked here rather than hand-edited into each file.
   ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function () {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const toggle = nav.querySelector('.site-nav__toggle');
    const panel = nav.querySelector('.site-nav__panel');
    if (!toggle || !panel) return;

    // Highlight the current page. "/" only matches the homepage; every
    // other entry also covers its sub-pages (e.g. /writing/2026/a-post).
    const path = location.pathname.replace(/index\.html$/, '');
    nav.querySelectorAll('.site-nav__link').forEach(function (link) {
        const href = link.getAttribute('href');
        const isCurrent = href === '/'
            ? path === '/'
            : path === href || path.indexOf(href + '/') === 0;
        if (isCurrent) {
            link.classList.add('is-current');
            link.setAttribute('aria-current', 'page');
        }
    });

    function setOpen(open) {
        // The theme chip flies between two parking spots on every toggle.
        // Marking the first one keeps its opening move from playing itself
        // out on a page that has only just loaded.
        nav.classList.add('has-toggled');
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        setOpen(!nav.classList.contains('is-open'));
    });

    // Tapping anywhere else, or Escape, puts the menu away again.
    document.addEventListener('click', function (event) {
        if (nav.classList.contains('is-open') && !nav.contains(event.target)) {
            setOpen(false);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });

    // In-page links (and mailto) should close the menu behind them.
    panel.addEventListener('click', function (event) {
        if (event.target.closest('a')) setOpen(false);
    });
});

/* ------------------------------------------------------------------
   Gems photo prewarm

   The Gems photos are large full-resolution JPEGs hosted on a separate
   origin, so opening /gems cold means watching empty frames fill in.
   Every other page on the site quietly pulls them into the HTTP cache
   once it has finished its own work, so Gems is already warm by the
   time it is opened. The photo host sends `immutable, max-age=1y`, so a
   single prewarm covers every later visit too.

   Deliberately conservative — this must never slow down the page the
   visitor is actually looking at:
     - runs only after `load`, during idle time
     - skipped on Save-Data and on 2g/3g connections
     - one photo at a time at low priority, so it never competes for
       bandwidth while the visitor is still browsing
   ------------------------------------------------------------------ */
(function () {
    const DONE_KEY = 'irrssue-gems-prewarm';
    const MAX_PHOTOS = 12; // Safety cap so a growing gallery can't run away.

    // The Gems page loads its own photos — nothing to warm up here.
    if (/^\/gems(\/|$)/.test(location.pathname)) return;

    // These are big files: honour explicit data saving and slow connections.
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ''))) return;

    try {
        if (sessionStorage.getItem(DONE_KEY) === '1') return;
    } catch (error) {
        // Storage being unavailable just means we may prewarm again next page.
    }

    function markDone() {
        try {
            sessionStorage.setItem(DONE_KEY, '1');
        } catch (error) {
            // Nothing to do — the HTTP cache is the real guard against refetching.
        }
    }

    // Only http(s) sources are followed, matching the Gems page's own check.
    function httpUrl(raw) {
        try {
            const u = new URL(raw, location.href);
            return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
        } catch (error) {
            return null;
        }
    }

    function preconnect(href) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    }

    // Sequential on purpose: one 8–15 MB photo in flight at a time.
    function loadNext(urls, i) {
        if (i >= urls.length) {
            markDone();
            return;
        }
        const img = new Image();
        img.decoding = 'async';
        if ('fetchPriority' in img) img.fetchPriority = 'low';
        img.onload = img.onerror = function () { loadNext(urls, i + 1); };
        img.src = urls[i];
    }

    function prewarm() {
        fetch('/data/gems.json')
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                const urls = (Array.isArray(data) ? data : [])
                    .filter(g => g && g.type !== 'video' && g.src)
                    .map(g => httpUrl(g.src))
                    .filter(Boolean)
                    .slice(0, MAX_PHOTOS);

                if (!urls.length) {
                    markDone();
                    return;
                }

                // Get the TLS handshake out of the way before the first photo.
                const origins = [...new Set(urls.map(u => new URL(u).origin))]
                    .filter(o => o !== location.origin);
                origins.forEach(preconnect);

                loadNext(urls, 0);
            })
            .catch(() => { /* A cold Gems page is the worst case — no need to report. */ });
    }

    function schedule() {
        if (window.requestIdleCallback) requestIdleCallback(prewarm, { timeout: 3000 });
        else setTimeout(prewarm, 1200);
    }

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule);
})();

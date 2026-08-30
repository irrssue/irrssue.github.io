// Simple navigation highlighting
document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('.mobile-nav a');

    // Navigation functionality
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Only prevent default for anchor links (starting with #)
            if (href && href.startsWith('#')) {
                e.preventDefault();
            }

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');
        });
    });

    // Sliding hover pill effect for mobile nav
    const mobileNav = document.querySelector('.mobile-nav');
    const navItems = document.querySelectorAll('.mobile-nav-item');

    if (mobileNav && navItems.length > 0) {
        function updateHoverPillPosition(element) {
            const navRect = mobileNav.getBoundingClientRect();
            const itemRect = element.getBoundingClientRect();

            // Calculate position relative to the nav container
            const left = itemRect.left - navRect.left;
            const top = itemRect.top - navRect.top;
            const width = itemRect.width;
            const height = itemRect.height;

            mobileNav.style.setProperty('--hover-left', left + 'px');
            mobileNav.style.setProperty('--hover-top', top + 'px');
            mobileNav.style.setProperty('--hover-width', width + 'px');
            mobileNav.style.setProperty('--hover-height', height + 'px');
        }

        // Initialize pill position to the active item
        const activeItem = document.querySelector('.mobile-nav-item.active');
        if (activeItem) {
            updateHoverPillPosition(activeItem);
        }

        navItems.forEach(item => {
            item.addEventListener('mouseenter', function () {
                updateHoverPillPosition(this);
                // Force reflow
                void mobileNav.offsetWidth;
                mobileNav.classList.add('nav-hover-active');
            });
        });

        mobileNav.addEventListener('mouseleave', function () {
            mobileNav.classList.remove('nav-hover-active');

            // Wait for transition to finish then smoothly reset position to active item
            setTimeout(() => {
                const currentActive = document.querySelector('.mobile-nav-item.active');
                if (currentActive) {
                    mobileNav.style.setProperty('transition', 'none');
                    updateHoverPillPosition(currentActive);
                    void mobileNav.offsetWidth;
                    mobileNav.style.removeProperty('transition');
                }
            }, 250); // wait roughly same duration as CSS transition
        });

        window.addEventListener('resize', function () {
            if (!mobileNav.classList.contains('nav-hover-active')) {
                const currentActive = document.querySelector('.mobile-nav-item.active');
                if (currentActive) {
                    updateHoverPillPosition(currentActive);
                }
            }
        });
    }
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

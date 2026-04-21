(function () {
    // Paths handled by SPA navigation
    var SPA_PATHS = ['/', '/writing', '/bookmarks'];

    // Scripts that must never be re-executed (already init'd in shell)
    var GLOBAL_SCRIPTS = (function () {
        var s = new Set();
        document.querySelectorAll('script[src]').forEach(function (el) {
            s.add(new URL(el.src, location.origin).href);
        });
        return s;
    }());

    // CSS already loaded in shell
    var loadedCSS = (function () {
        var s = new Set();
        document.querySelectorAll('link[rel="stylesheet"]').forEach(function (el) {
            s.add(new URL(el.href, location.origin).href);
        });
        return s;
    }());

    function isSPAPath(pathname) {
        var p = pathname.replace(/\/$/, '') || '/';
        return SPA_PATHS.indexOf(p) !== -1;
    }

    function isInternalSPA(href) {
        try {
            var url = new URL(href, location.origin);
            return url.origin === location.origin && isSPAPath(url.pathname);
        } catch (e) { return false; }
    }

    function loadCSS(href) {
        var full = new URL(href, location.origin).href;
        if (loadedCSS.has(full)) return;
        loadedCSS.add(full);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function runScript(src) {
        var full = new URL(src, location.origin).href;
        if (GLOBAL_SCRIPTS.has(full)) return Promise.resolve();
        return new Promise(function (resolve) {
            var old = document.querySelector('script[src="' + src + '"]');
            if (old) old.parentNode.removeChild(old);
            var s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = resolve;
            document.body.appendChild(s);
        });
    }

    function updateNavActive(pathname) {
        var p = pathname.replace(/\/$/, '') || '/';
        document.querySelectorAll('.mobile-nav-item[href]').forEach(function (a) {
            try {
                var ap = new URL(a.href, location.origin).pathname.replace(/\/$/, '') || '/';
                a.classList.toggle('active', ap === p);
            } catch (e) {}
        });
    }

    function showPersistentPlayer(show) {
        var bar = document.getElementById('np-persistent');
        if (bar) bar.classList.toggle('np-persistent--visible', show);
    }

    async function navigateTo(url, pushState) {
        var parsed = new URL(url, location.origin);

        try {
            var res = await fetch(parsed.href);
            if (!res.ok) throw new Error('fetch failed');
            var html = await res.text();
            var doc = new DOMParser().parseFromString(html, 'text/html');

            // Load any CSS the target page needs
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
                loadCSS(l.href);
            });

            // Swap main content using importNode (safe — same-origin pages we control)
            var newMain = doc.querySelector('main.main-content');
            var curMain = document.querySelector('main.main-content');
            if (newMain && curMain) {
                var imported = document.importNode(newMain, true);
                curMain.parentNode.replaceChild(imported, curMain);
            }

            // Update title and URL
            document.title = doc.title;
            if (pushState) {
                history.pushState({ path: parsed.pathname }, document.title, parsed.pathname);
            }

            updateNavActive(parsed.pathname);

            var isHome = (parsed.pathname.replace(/\/$/, '') || '/') === '/';
            showPersistentPlayer(!isHome);

            // Re-run page-specific scripts in order
            var scripts = Array.from(doc.querySelectorAll('body script[src]'));
            for (var i = 0; i < scripts.length; i++) {
                await runScript(scripts[i].getAttribute('src'));
            }

            window.scrollTo(0, 0);

        } catch (e) {
            location.href = url;
        }
    }

    // Intercept internal link clicks
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href]');
        if (!a) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.target === '_blank') return;
        if (!isInternalSPA(a.href)) return;
        e.preventDefault();
        navigateTo(a.href, true);
    });

    // Handle browser back/forward
    window.addEventListener('popstate', function () {
        navigateTo(location.href, false);
    });

    // Show persistent player on non-home initial load
    document.addEventListener('DOMContentLoaded', function () {
        var p = location.pathname.replace(/\/$/, '') || '/';
        showPersistentPlayer(p !== '/');
    });
}());

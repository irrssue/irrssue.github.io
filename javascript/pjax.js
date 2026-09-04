/* ------------------------------------------------------------------
   Soft navigation between /, /writing, /writing/<post> and /bookmarks

   Clicking between these pages used to be a full browser navigation --
   a blank flash, every stylesheet and script re-fetched and re-run, and
   (worst of all) the YouTube embed torn down and rebuilt, cutting off
   whatever was playing. now-playing.js already patches over that by
   saving playback position/state to sessionStorage and resuming it on
   the next page, but the sound itself still has to stop and restart.

   This file fetches the destination page instead, and swaps only the
   part of the document that actually differs -- everything inside
   #pjax-root. The top nav and the invisible #yt-player div live outside
   that element in every page's markup for exactly this reason: a soft
   navigation never touches them, so the toggle/menu listeners bound to
   the nav stay attached and the YouTube player instance now-playing.js
   built keeps running, uninterrupted, for as long as the visitor stays
   inside this family of pages.

   It only ever intercepts links to that family (see ROUTE_RE below).
   Everything else -- Gems, external links, mailto, the admin page --
   is a plain, real navigation, same as if this file didn't exist. And
   since it's only loaded for browsers that already pass the capability
   gate, a browser that fails it (or has JS off) gets plain navigation
   everywhere, which is the site's actual no-JS baseline.
   ------------------------------------------------------------------ */
(function () {
    if (!window.SITE_MODERN) return;

    var root = document.getElementById('pjax-root');
    if (!root) return;

    // Home is "/", the writing index and every post under it share the
    // "/writing" prefix, and bookmarks is "/bookmarks". Gems and everything
    // else (resume, solarsystem, echoes, the admin/upload pages) are
    // deliberately left alone -- different CSP, no #yt-player, or both.
    var ROUTE_RE = /^\/(?:writing(?:\/.*)?|bookmarks)?\/?$/;

    // script.js and now-playing.js set up state (nav listeners, the YouTube
    // player) that must only ever run once per real page load -- re-running
    // them on a soft navigation would double the nav's click handlers and
    // spin up a second player on top of whatever's already playing. This
    // file is in the same boat as those two, for the same reason: it's
    // listed in every page's data-enhance so a real load fetches it, but
    // re-injecting it on its own swap would bind a second click/popstate
    // listener right here. Every other enhancement script (project-ring.js,
    // project-rail.js, post.js) is cheap to run fresh each time it's needed,
    // and self-cleans (see the isConnected checks in project-ring.js) once
    // its markup is swapped out.
    var PERSISTENT_SCRIPTS = ['/javascript/script.js', '/javascript/now-playing.js', '/javascript/pjax.js'];

    var ALWAYS_ON_STYLES = ['/css/styles.css', '/css/legacy.css'];

    var requestToken = 0;

    function resolvePath(src, base) {
        try {
            return new URL(src, base).pathname;
        } catch (error) {
            return src;
        }
    }

    function sameLocation(url) {
        return url.pathname === location.pathname && url.search === location.search;
    }

    function reconcileStylesheets(doc, baseUrl) {
        var want = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            want.push(resolvePath(link.getAttribute('href'), baseUrl));
        });

        Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]')).forEach(function (link) {
            var path = resolvePath(link.getAttribute('href'), location.href);
            if (ALWAYS_ON_STYLES.indexOf(path) !== -1) return;
            if (want.indexOf(path) === -1) link.parentNode.removeChild(link);
        });

        var have = [];
        document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            have.push(resolvePath(link.getAttribute('href'), location.href));
        });
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            var path = resolvePath(link.getAttribute('href'), baseUrl);
            if (have.indexOf(path) === -1) {
                var fresh = document.createElement('link');
                fresh.rel = 'stylesheet';
                // Resolved against the fetched page's URL, not the live
                // document's -- index.html's asset paths are written
                // relative (no leading "/"), unlike every other page's, and
                // by the time this runs the live location can be anywhere.
                fresh.href = new URL(link.getAttribute('href'), baseUrl).href;
                document.head.appendChild(fresh);
            }
        });
    }

    // The post template's only per-page <style> block (post.css's
    // .main-content width override). Reconciled the same way as the
    // stylesheet links above: added, removed, or left alone as needed.
    function reconcilePostOverrides(doc) {
        var incoming = doc.getElementById('post-overrides');
        var current = document.getElementById('post-overrides');
        if (incoming && !current) {
            document.head.appendChild(document.importNode(incoming, true));
        } else if (!incoming && current) {
            current.parentNode.removeChild(current);
        }
    }

    function reconcileDescription(doc) {
        var incoming = doc.querySelector('meta[name="description"]');
        var current = document.querySelector('meta[name="description"]');
        if (incoming) {
            if (current) current.setAttribute('content', incoming.getAttribute('content') || '');
            else document.head.appendChild(document.importNode(incoming, true));
        } else if (current) {
            current.parentNode.removeChild(current);
        }
    }

    // Materialize a fetched subtree's <script> tags as real, executable
    // script elements. Nodes parsed by DOMParser (like innerHTML) never run
    // their scripts; only elements actually created with createElement do.
    function activateScripts(node, baseUrl) {
        var old = node.querySelectorAll('script');
        for (var i = 0; i < old.length; i++) {
            var src = old[i];
            var fresh = document.createElement('script');
            for (var a = 0; a < src.attributes.length; a++) {
                var name = src.attributes[a].name;
                var value = src.attributes[a].value;
                // Resolved against the fetched page's URL -- see the
                // matching note in reconcileStylesheets().
                if (name === 'src') value = new URL(value, baseUrl).href;
                fresh.setAttribute(name, value);
            }
            fresh.text = src.textContent;
            src.parentNode.replaceChild(fresh, src);
        }
    }

    // Enhancement scripts that only matter on the page just swapped in --
    // the project ring/rail on the homepage, the date logic on a post.
    // Read straight from the fetched page's own capability tag, so this
    // list can never drift from what that page actually declares.
    function loadPageScripts(doc, baseUrl) {
        var tag = doc.getElementById('capability');
        var manifest = tag && tag.getAttribute('data-enhance');
        if (!manifest) return;
        manifest.split(',').forEach(function (raw) {
            var src = raw.replace(/^\s+|\s+$/g, '');
            if (!src) return;
            var path = resolvePath(src, baseUrl);
            if (PERSISTENT_SCRIPTS.indexOf(path) !== -1) return;
            var fresh = document.createElement('script');
            // Resolved against the fetched page's URL -- see the matching
            // note in reconcileStylesheets().
            fresh.src = new URL(src, baseUrl).href;
            fresh.async = false;
            document.head.appendChild(fresh);
        });
    }

    function applySwap(html, url, push, restoreY) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var incomingRoot = doc.getElementById('pjax-root');
        if (!incomingRoot) {
            location.href = url;
            return;
        }

        var imported = document.importNode(incomingRoot, true);
        activateScripts(imported, url);

        document.title = doc.title;
        reconcileDescription(doc);
        reconcileStylesheets(doc, url);
        reconcilePostOverrides(doc);
        document.body.className = doc.body.className;

        root.replaceWith(imported);
        root = imported;

        if (push) {
            history.pushState({ url: url, scrollY: 0 }, '', url);
            window.scrollTo(0, 0);
        } else {
            window.scrollTo(0, restoreY || 0);
        }

        // A real navigation lands keyboard/screen-reader focus at the top of
        // the document on its own; a soft one has to do that itself, or a
        // screen reader never announces that anything changed.
        imported.setAttribute('tabindex', '-1');
        imported.focus({ preventScroll: true });

        if (window.updateNavCurrent) window.updateNavCurrent();
        // The now-playing widget's title/artist/buttons live inside
        // #pjax-root (only the player itself lives outside it), so every
        // swap just replaced them with fresh, un-synced markup -- repaint
        // and rebind them from now-playing.js's in-memory playback state.
        // A no-op on pages without the widget (writing, bookmarks).
        if (window.npSyncControls) window.npSyncControls();
        loadPageScripts(doc, url);
    }

    function navigate(url, push) {
        // Stamp the entry we're leaving with where the visitor was reading,
        // so landing back on it later (via Back) restores that spot instead
        // of dropping them at the top of the page again.
        if (push) {
            history.replaceState({ url: location.href, scrollY: window.scrollY }, '', location.href);
        }
        var restoreY = push ? 0 : (history.state && history.state.scrollY) || 0;

        var token = ++requestToken;
        fetch(url, { credentials: 'same-origin' }).then(function (response) {
            if (!response.ok) throw new Error('bad status');
            return response.text();
        }).then(function (html) {
            if (token !== requestToken) return; // superseded by a later click
            var perform = function () { applySwap(html, url, push, restoreY); };
            if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                var transition = document.startViewTransition(perform);
                // The browser is free to skip a transition it can't run
                // cleanly (e.g. another one is still finishing); perform()
                // has already applied the swap either way, so there's
                // nothing to do here besides not letting that show up as an
                // unhandled rejection.
                var noop = function () {};
                transition.ready.catch(noop);
                transition.finished.catch(noop);
            } else {
                perform();
            }
        }).catch(function () {
            if (token === requestToken) location.href = url;
        });
    }

    document.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var link = event.target.closest && event.target.closest('a[href]');
        if (!link) return;
        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download')) return;

        var url;
        try {
            url = new URL(link.href, location.href);
        } catch (error) {
            return;
        }
        if (url.origin !== location.origin) return;
        if (!ROUTE_RE.test(url.pathname)) return;
        if (sameLocation(url) && url.hash) return; // same-page anchor

        event.preventDefault();
        if (sameLocation(url)) return;
        navigate(url.href, true);
    });

    window.addEventListener('popstate', function () {
        navigate(location.href, false);
    });

    history.replaceState({ url: location.href }, '', location.href);
})();

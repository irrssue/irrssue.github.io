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
    // project-rail.js, home.js, post.js) is cheap to run fresh each time
    // it's needed, and unhooks itself once its markup is swapped out --
    // `pjax:swap`, dispatched on document after every swap, is their cue.
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

    // "/writing", "/writing/" and "/writing/index.html" are one page --
    // GitHub Pages answers the first with a redirect to the second -- so
    // pages are compared by this key rather than by raw pathname.
    function pageKey(url) {
        var path = url.pathname.replace(/index\.html$/, '');
        if (path.length > 1) path = path.replace(/\/+$/, '');
        return path + url.search;
    }

    // The page whose content is on screen. A step through history that only
    // changes the #fragment leaves it exactly where it is.
    var renderedKey = pageKey(location);

    function sameLocation(url) {
        return pageKey(url) === renderedKey;
    }

    // What each stylesheet <link> actually loaded. The homepage writes its
    // hrefs relative ("css/styles.css"), and a relative href resolves against
    // the *current* address, which pushState keeps moving -- two levels deep
    // the site's own stylesheet stopped being recognised and was torn out and
    // re-added mid-navigation. So the path is worked out once, against the
    // address the link was loaded under, and kept on the element.
    function sheetPath(link) {
        if (!link.hasAttribute('data-pjax-path')) {
            link.setAttribute('data-pjax-path', resolvePath(link.getAttribute('href'), location.href));
        }
        return link.getAttribute('data-pjax-path');
    }

    function wantedSheets(doc, baseUrl) {
        var want = [];
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            want.push({ path: resolvePath(link.getAttribute('href'), baseUrl), link: link });
        });
        return want;
    }

    function liveSheets() {
        return Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
    }

    function hasSheet(path) {
        return liveSheets().some(function (link) {
            return sheetPath(link) === path;
        });
    }

    function addSheet(path, baseUrl, href, media) {
        var fresh = document.createElement('link');
        fresh.rel = 'stylesheet';
        if (media) fresh.media = media;
        fresh.setAttribute('data-pjax-path', path);
        // Resolved against the fetched page's URL, not the live document's
        // -- index.html's asset paths are written relative (no leading "/"),
        // unlike every other page's, and by the time this runs the live
        // location can be anywhere.
        fresh.href = new URL(href, baseUrl).href;
        document.head.appendChild(fresh);
        return fresh;
    }

    // Stylesheets the incoming page needs and this document doesn't have yet
    // are downloaded *before* the swap, held inert under media="print", and
    // switched on in the same frame as the new content -- a page reached
    // for the first time otherwise painted unstyled until its stylesheet
    // arrived. Waiting gives up after a few seconds, so one slow file can't
    // hold the navigation hostage.
    function stageStylesheets(doc, baseUrl) {
        var pending = [];
        wantedSheets(doc, baseUrl).forEach(function (sheet) {
            if (hasSheet(sheet.path)) return;
            var staged = addSheet(sheet.path, baseUrl, sheet.link.getAttribute('href'), 'print');
            staged.setAttribute('data-pjax-media', sheet.link.getAttribute('media') || 'all');
            pending.push(new Promise(function (resolve) {
                staged.onload = staged.onerror = resolve;
                window.setTimeout(resolve, 4000);
            }));
        });
        return Promise.all(pending);
    }

    function reconcileStylesheets(doc, baseUrl) {
        var want = wantedSheets(doc, baseUrl).map(function (sheet) { return sheet.path; });

        liveSheets().forEach(function (link) {
            var path = sheetPath(link);
            if (ALWAYS_ON_STYLES.indexOf(path) !== -1) return;
            if (want.indexOf(path) === -1) {
                // Not this page's -- including one staged for a navigation
                // that a later click superseded.
                link.parentNode.removeChild(link);
            } else if (link.hasAttribute('data-pjax-media')) {
                link.media = link.getAttribute('data-pjax-media');
                link.removeAttribute('data-pjax-media');
            }
        });

        // Anything staging gave up on goes in now, unstaged.
        wantedSheets(doc, baseUrl).forEach(function (sheet) {
            if (!hasSheet(sheet.path)) addSheet(sheet.path, baseUrl, sheet.link.getAttribute('href'), sheet.link.getAttribute('media'));
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
                // matching note in addSheet().
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
            // note in addSheet().
            fresh.src = new URL(src, baseUrl).href;
            fresh.async = false;
            // Once it has run the tag is spent; without this every visit
            // home would leave three more of them in <head>.
            fresh.onload = fresh.onerror = function () {
                fresh.parentNode.removeChild(fresh);
            };
            document.head.appendChild(fresh);
        });
    }

    // Where the visitor is reading, kept on the current history entry as
    // they scroll. It used to be stamped only when a new page was pushed on
    // top, so leaving a page with Forward never saved it, and coming Back to
    // it again restored wherever it had been the time before.
    var scrollTimer = 0;

    function rememberScroll() {
        window.clearTimeout(scrollTimer);
        var state = history.state;
        if (state && state.scrollY === window.scrollY) return;
        history.replaceState({ url: location.href, scrollY: window.scrollY }, '', location.href);
    }

    window.addEventListener('scroll', function () {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(rememberScroll, 150);
    }, { passive: true });

    function scrollToFragment(hash) {
        var id = '';
        try {
            id = decodeURIComponent(hash.slice(1));
        } catch (error) {
            id = hash.slice(1);
        }
        var target = id && document.getElementById(id);
        if (!target) return false;
        target.scrollIntoView();
        return true;
    }

    function applySwap(doc, url, push, restoreY) {
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

        // A scroll still pending from the outgoing page must not be saved
        // onto the entry for this one.
        window.clearTimeout(scrollTimer);
        if (push) {
            history.pushState({ url: url, scrollY: 0 }, '', url);
            if (!(location.hash && scrollToFragment(location.hash))) window.scrollTo(0, 0);
        } else {
            // Entries made before a redirect was followed carry the old
            // address; it is swapped for the real one, the place kept.
            if (url !== location.href) history.replaceState({ url: url, scrollY: restoreY || 0 }, '', url);
            window.scrollTo(0, restoreY || 0);
        }
        renderedKey = pageKey(location);

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
        // Lets scripts bound to the page just replaced notice they are
        // detached and unhook from window/document (see the header note).
        document.dispatchEvent(new CustomEvent('pjax:swap'));
        loadPageScripts(doc, url);
    }

    function navigate(url, push) {
        // Stamp the entry we're leaving with where the visitor was reading,
        // so landing back on it later (via Back) restores that spot instead
        // of dropping them at the top of the page again.
        if (push) rememberScroll();
        var restoreY = push ? 0 : (history.state && history.state.scrollY) || 0;
        var hash = new URL(url).hash;

        var token = ++requestToken;
        fetch(url, { credentials: 'same-origin' }).then(function (response) {
            if (!response.ok) throw new Error('bad status');
            // The address of the page actually served -- after GitHub Pages'
            // 301 from /writing to /writing/ -- so the address bar and every
            // relative URL in the new content agree with a real load. The
            // #fragment never reaches the server and is carried over.
            var served = response.url ? response.url.replace(/#.*$/, '') + hash : url;
            return response.text().then(function (html) {
                return { html: html, url: served };
            });
        }).then(function (page) {
            if (token !== requestToken) return; // superseded by a later click
            var doc = new DOMParser().parseFromString(page.html, 'text/html');
            return stageStylesheets(doc, page.url).then(function () {
                if (token !== requestToken) return;
                var perform = function () { applySwap(doc, page.url, push, restoreY); };
                if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    var transition = document.startViewTransition(perform);
                    // The browser is free to skip a transition it can't run
                    // cleanly (e.g. another one is still finishing); perform()
                    // has already applied the swap either way, so there's
                    // nothing to do here besides not letting that show up as
                    // an unhandled rejection.
                    var noop = function () {};
                    transition.ready.catch(noop);
                    transition.finished.catch(noop);
                } else {
                    perform();
                }
            });
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
        window.clearTimeout(scrollTimer);
        if (pageKey(location) === renderedKey) {
            // Only the #fragment moved -- an in-page link, or Back/Forward
            // over one. The right page is already on screen; just put the
            // reader where that entry was (fetching it again would have
            // thrown the page away and dropped them at the top).
            var state = history.state;
            if (state && typeof state.scrollY === 'number') window.scrollTo(0, state.scrollY);
            else if (location.hash) scrollToFragment(location.hash);
            return;
        }
        navigate(location.href, false);
    });

    // Scroll positions are put back by this file once the incoming page is
    // in place. Left to itself the browser restores them as soon as Back is
    // pressed, jumping the *outgoing* page around while the next one is
    // still downloading.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    // ...which also covers a reload, or coming back from another site to a
    // page this session had scrolled: the browser no longer restores those
    // either, so the position saved on the entry is applied here.
    var arrival = history.state;
    var arrivalType = '';
    try {
        arrivalType = performance.getEntriesByType('navigation')[0].type;
    } catch (error) {
        // Navigation Timing missing: treat it as a fresh visit.
    }
    if (arrival && typeof arrival.scrollY === 'number' && window.scrollY === 0 &&
        (arrivalType === 'reload' || arrivalType === 'back_forward')) {
        window.scrollTo(0, arrival.scrollY);
    }

    liveSheets().forEach(function (link) { sheetPath(link); });
    history.replaceState({ url: location.href, scrollY: window.scrollY }, '', location.href);
})();

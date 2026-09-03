/* ------------------------------------------------------------------
   Theme switch

   Two halves, and the order matters:

     1. Before the first paint, stamp the remembered theme onto <html>.
        This file is loaded un-deferred from the document head for that
        reason alone — deferring it would paint the old palette first
        and then flip it in the reader's face.
     2. Once the DOM is up, mint the toggle and park it beside the Menu
        pill. The button is built here rather than written into every
        page's markup: it does nothing without scripting, so with JS off
        there is simply no dead control sitting in the nav.

   Dark is the site's own look, so that is what a first-time visitor
   gets; only an explicit choice is remembered.
   ------------------------------------------------------------------ */
(function () {
    var STORAGE_KEY = 'irrssue-theme';
    var FADE_MS = 360;
    var root = document.documentElement;

    function remembered() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            return saved === 'light' || saved === 'dark' ? saved : null;
        } catch (error) {
            // Private browsing and friends: fall through to the default.
            return null;
        }
    }

    var theme = remembered() || 'dark';
    root.setAttribute('data-theme', theme);

    var fadeTimer;

    function paint(next) {
        theme = next;
        root.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            // The choice just won't survive the tab. Nothing else to do.
        }

        // Cross-fade the palette instead of cutting to it, then take the
        // class off so it never sits on top of the page's own transitions.
        root.classList.add('is-theme-switching');
        window.clearTimeout(fadeTimer);
        fadeTimer = window.setTimeout(function () {
            root.classList.remove('is-theme-switching');
        }, FADE_MS);
    }

    function build() {
        // The old design css/legacy.css draws is a single dark palette, and
        // the chip itself is a transform-and-gradient affair, so a browser
        // that failed the capability gate gets no toggle rather than a dead
        // one. The stamp above still runs — it costs nothing and keeps the
        // attribute consistent for anything else reading it.
        if (!window.SITE_MODERN) return;

        var nav = document.querySelector('.site-nav');
        if (!nav) return;

        var button = document.createElement('button');
        button.type = 'button';
        button.id = 'themeToggle';
        button.className = 'site-nav__theme';
        button.innerHTML = '<span class="site-nav__theme-orb" aria-hidden="true"></span>';

        function label() {
            var next = theme === 'dark' ? 'light' : 'dark';
            button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
            button.title = 'Switch to ' + next + ' theme';
        }

        label();

        button.addEventListener('click', function () {
            paint(theme === 'dark' ? 'light' : 'dark');
            label();
        });

        // Outside the pill's own surface: the surface clips its overflow,
        // and the chip has to sit beside it while the menu is shut.
        nav.appendChild(button);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();

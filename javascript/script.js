/* ------------------------------------------------------------------
   Top hamburger navigation

   One pill at the top of every page that expands into the menu card.
   The markup is identical on every page, so the link for the page the
   visitor is on is marked here rather than hand-edited into each file.
   ------------------------------------------------------------------ */
function buildNav() {
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
        // The theme chip glides between its closed and open parking spots.
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
}

/* javascript/capability.js loads this file once the document is parsed, so
   DOMContentLoaded may already have come and gone by the time we get here. */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
} else {
    buildNav();
}

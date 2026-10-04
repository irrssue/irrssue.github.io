/* ------------------------------------------------------------------
   Homepage hero: the cycling name and the social-link previews

   Both of these used to be inline scripts at the foot of index.html, so
   they only ever ran on a real load of the homepage. javascript/pjax.js
   replaces the hero wholesale on every soft navigation, which left the
   name in the plain system font, no longer changing, and the previews
   bound to links that were no longer on the page — and a visitor who
   arrived on another page and soft-navigated home never got either.

   As one of the homepage's listed enhancement scripts, this file is run
   again by pjax.js each time the homepage is swapped in, and every run
   binds to the hero that is on the page at that moment.
   ------------------------------------------------------------------ */
(function () {
    if (!window.SITE_MODERN) return;

    // Hero name font cycling: a new face every 5s, behind a glitch.
    function cycleName() {
        var heroName = document.querySelector('.hero-name');
        if (!heroName) return;

        var fonts = [
            { family: "'Fraunces', serif", weight: '300' },
            { family: "'Cormorant Garamond', serif", weight: '300' },
            { family: "'VT323', monospace", weight: '400' },
            { family: "'Bricolage Grotesque', sans-serif", weight: '700' },
            { family: "'Playfair Display', serif", weight: '700' },
            { family: "'DM Serif Display', serif", weight: '400' },
            { family: "'Cabinet Grotesk', sans-serif", weight: '700' },
            { family: "'Instrument Serif', serif", weight: '400' }
        ];

        var currentIndex = Math.floor(Math.random() * fonts.length);
        var GLITCH_MS = 440;
        // The glitch is a burst of flashes, skews and colour splits; anyone
        // who has asked for less motion keeps the face they were given.
        var still = window.matchMedia('(prefers-reduced-motion: reduce)');

        function applyFont(font) {
            heroName.style.fontFamily = font.family;
            heroName.style.fontWeight = font.weight;
        }

        // Apply a random starting font immediately
        applyFont(fonts[currentIndex]);

        var timer = window.setInterval(function () {
            // This hero has been swapped out by a soft navigation; the next
            // visit to the homepage runs this file again for the new one.
            if (!heroName.isConnected) {
                window.clearInterval(timer);
                return;
            }
            if (still.matches || document.hidden) return;

            var nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * fonts.length);
            } while (nextIndex === currentIndex);
            currentIndex = nextIndex;

            // Kill any transition, fire glitch animation
            heroName.style.transition = 'none';
            heroName.style.animation = 'hero-name-glitch ' + GLITCH_MS + 'ms ease-in forwards';

            // At 80% through the glitch opacity hits 0 — swap font there
            window.setTimeout(function () {
                applyFont(fonts[currentIndex]);
                heroName.style.animation = 'none';
                heroName.style.opacity = '0';
                // Two rAFs to ensure the opacity:0 is committed before transitioning in
                window.requestAnimationFrame(function () {
                    window.requestAnimationFrame(function () {
                        heroName.style.transition = 'opacity 0.3s ease';
                        heroName.style.opacity = '1';
                    });
                });
            }, Math.round(GLITCH_MS * 0.8));
        }, 5000);
    }

    // Link preview on hover (desktop only)
    function previewLinks() {
        if (window.matchMedia('(hover: none)').matches) return;

        var links = document.querySelectorAll('[data-preview]');
        if (!links.length) return;

        // Inside #pjax-root rather than on <body>, so the card leaves with
        // the page it belongs to instead of lingering, still showing, if a
        // soft navigation happens while the pointer rests on an icon.
        var preview = document.createElement('div');
        preview.id = 'link-preview';
        var img = document.createElement('img');
        img.alt = '';
        preview.appendChild(img);
        (document.getElementById('pjax-root') || document.body).appendChild(preview);

        var hideTimer;

        Array.prototype.forEach.call(links, function (link) {
            link.addEventListener('mouseenter', function () {
                clearTimeout(hideTimer);

                var mainContent = document.querySelector('.main-content');
                var contentRect = mainContent.getBoundingClientRect();
                var linkRect = link.getBoundingClientRect();
                var previewWidth = 260;
                var gap = 20;

                // Always position to the right of the content column
                var left = contentRect.right + gap;
                left = Math.min(left, window.innerWidth - previewWidth - 8);

                var top = linkRect.top + (linkRect.height / 2) - 90;
                top = Math.max(16, Math.min(top, window.innerHeight - 230));

                img.src = link.dataset.preview;
                preview.style.left = left + 'px';
                preview.style.top = top + 'px';
                preview.classList.add('visible');
            });

            link.addEventListener('mouseleave', function () {
                hideTimer = setTimeout(function () {
                    preview.classList.remove('visible');
                }, 80);
            });
        });
    }

    cycleName();
    previewLinks();
})();

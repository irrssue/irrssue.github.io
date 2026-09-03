/* ------------------------------------------------------------------
   Homepage project rail

   Below the ring breakpoint the projects lie in a track you swipe. The
   track scrolls and snaps on its own — that is the browser, not this
   file — so all this does is draw the dots underneath and keep the one
   under the resting card marked.

   The dots are built here rather than in the markup so they only exist
   when there is something keeping them honest. Without this file you
   get the track and no dots, which is the whole feature minus its
   ornament.
   ------------------------------------------------------------------ */
(function () {
    var track = document.getElementById('projectsRail');
    if (!track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll('.prail'));
    if (slides.length < 2) return;

    var narrow = window.matchMedia('(max-width: 1079px)');
    var dots = null;
    var pips = [];
    var ticking = false;

    function build() {
        if (dots) return;
        dots = document.createElement('div');
        dots.className = 'projects-rail__dots';
        // Decorative: the track itself is the thing being navigated, and it is
        // already reachable by tabbing through the cards.
        dots.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < slides.length; i++) {
            pips.push(dots.appendChild(document.createElement('i')));
        }
        track.parentNode.appendChild(dots);
    }

    /* Which card the track has come to rest on: the one whose left edge is
       nearest the left edge of the track. Measured rather than derived from
       scrollLeft, so it stays right whatever the card width works out to. */
    function current() {
        var edge = track.getBoundingClientRect().left;
        var best = 0;
        var least = Infinity;
        for (var i = 0; i < slides.length; i++) {
            var gap = Math.abs(slides[i].getBoundingClientRect().left - edge);
            if (gap < least) {
                least = gap;
                best = i;
            }
        }
        return best;
    }

    function mark() {
        var at = current();
        for (var i = 0; i < pips.length; i++) {
            pips[i].classList.toggle('is-current', i === at);
        }
    }

    track.addEventListener('scroll', function () {
        // Throttled to one read per animation frame so the dots track the
        // finger during the swipe instead of jumping into place once it stops.
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
            mark();
            ticking = false;
        });
    }, { passive: true });

    window.addEventListener('resize', function () {
        if (narrow.matches) mark();
    });

    function sync() {
        if (!narrow.matches) return;
        build();
        mark();
    }

    // Safari below 14 only has the deprecated listener form.
    if (narrow.addEventListener) narrow.addEventListener('change', sync);
    else narrow.addListener(sync);

    sync();
}());

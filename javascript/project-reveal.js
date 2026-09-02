/* ------------------------------------------------------------------
   Homepage project card entrance

   The ring and the rail already have their own ongoing motion (orbiting,
   swipe-and-snap); this is just the one-off animation the cards make on
   the way in, staggered a beat apart so they arrive as a sequence rather
   than all at once.

   Element.animate() rather than a CSS class + transition: a class toggled
   on the next frame relies on the browser having actually painted the
   hidden state in between, and in testing that frame was not reliable —
   occasionally both the hide and the reveal landed in the same paint and
   the transition never ran. animate() supplies both ends of the motion
   in one call, so there is nothing to race.

   Nothing here is load-bearing: without JS, or in a browser old enough
   not to have Element.animate, the cards are simply visible from the
   first paint.

   Held until the intro overlay says it's nearly done: the ring sits right
   where the overlay's curtain covers, so starting the cards while it's
   still fully drawn would just mean animating under something opaque.
   The overlay (inline script in index.html) fires 'intro:ending' at 90%
   through its own close, which is also the fallback for a visitor who
   has already seen it this session — see that script for the timing.
   ------------------------------------------------------------------ */
(function () {
    var ring = document.querySelector('.project-ring');
    var rail = document.getElementById('projectsRail');
    if (!ring && !rail) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!Element.prototype.animate) return;

    var STEP_MS = 55;      // gap between one card's entrance and the next
    var MAX_STEPS = 8;     // caps the tail so a long rail doesn't crawl in
    var DURATION = 600;
    var EASE = 'cubic-bezier(0.22, 0.68, 0.35, 1)';

    function enter(list, keyframes) {
        list.forEach(function (el, i) {
            el.animate(keyframes, {
                duration: DURATION,
                delay: Math.min(i, MAX_STEPS) * STEP_MS,
                easing: EASE,
                fill: 'backwards'
            });
        });
    }

    function reveal() {
        if (ring) {
            // A small scale rather than a slide: the frame sits inside the
            // ring's own tilted 3D transform, so a translateY here would read
            // as sliding in some rotated direction rather than straight up
            // the screen.
            enter(
                Array.prototype.slice.call(ring.querySelectorAll('.pcard__frame')),
                [{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'scale(1)' }]
            );
        }
        if (rail) {
            enter(
                Array.prototype.slice.call(rail.querySelectorAll('.prail')),
                [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }]
            );
        }
    }

    if (document.getElementById('introOverlay')) {
        document.addEventListener('intro:ending', reveal, { once: true });
    } else {
        reveal();
    }
}());

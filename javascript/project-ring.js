/* ------------------------------------------------------------------
   Homepage project ring

   The screenshots beside the hero orbit a point just off the right edge
   of the page. Every frame each card is placed from one angle: where it
   sits on the circle, a small tilt so the ring reads as a disc seen at
   an angle, and a stacking order that puts the near side on top.

   Pointing at a card eases the ring to a stop — it slows rather than
   freezing — dims the rest and shows a pill that follows the cursor.
   Scrolling gives the ring a short push that decays on its own. When the
   pointer is over the screenshots, the wheel belongs to the ring instead of
   the page, so it can be browsed deliberately with the same soft momentum.

   Without this file the stylesheet still lays the cards out around the
   ring from the same angles; they just do not turn.
   ------------------------------------------------------------------ */
(function () {
    var ring = document.querySelector('.project-ring');
    if (!ring) return;

    var stage = ring.querySelector('.project-ring__stage');
    var orbit = ring.querySelector('.project-ring__orbit');
    var tip = ring.querySelector('.project-ring__tip');
    var cards = Array.prototype.slice.call(ring.querySelectorAll('.pcard'));
    if (!stage || !orbit || !tip || !cards.length) return;

    // A full turn takes about a minute — present, never distracting.
    var BASE_SPEED = 0.1;               // radians a second
    var STEP = (Math.PI * 2) / cards.length;

    var wide = window.matchMedia('(min-width: 1080px)');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');

    var radius = 320;
    var angle = Math.PI;                // card 0 starts on the near side
    var speed = 0;
    var boost = 0;                      // spin picked up from scrolling
    var lastScroll = null;
    var lastFrame = 0;
    // The idle turn is intentionally slow. Rendering it at 30fps is visually
    // indistinguishable, while halving the style writes for all ten cards.
    // Interaction and wheel momentum still render at the display refresh rate.
    var IDLE_FRAME_MS = 1000 / 30;
    var frame = null;
    var hovered = null;

    /* Ring size follows the box it sits in: tall enough windows get a wider
       ring, narrow ones stay inside the column. Cards are sized off the
       radius so the ring keeps its proportions at every window size. */
    function measure() {
        var box = stage.getBoundingClientRect();
        radius = Math.min(Math.max(box.height * 0.32, 220), box.width * 0.55, 410);
        stage.style.setProperty('--ring-radius', radius + 'px');
        stage.style.setProperty('--card-w', Math.round(Math.max(radius * 1.05, 250)) + 'px');
    }

    function place() {
        for (var i = 0; i < cards.length; i++) {
            var a = angle + i * STEP;
            var card = cards[i];
            // Wrapped back into -180°..180° so the roll sweeps smoothly across
            // the ring instead of jumping a whole turn each lap.
            var roll = Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI));
            card.style.transform =
                'translate(-50%, -50%) translate3d(' +
                (Math.cos(a) * radius).toFixed(2) + 'px, ' +
                (Math.sin(a) * radius).toFixed(2) + 'px, 0) perspective(1100px)' +
                ' rotateX(' + (4 * Math.sin(a)).toFixed(2) + 'deg)' +
                ' rotateY(' + (10 * Math.cos(a)).toFixed(2) + 'deg)' +
                ' rotateZ(' + (roll * (180 / Math.PI) * 0.14).toFixed(2) + 'deg)';
            // Near side (cos -1) on top, far side underneath.
            card.style.zIndex = card === hovered
                ? '100'
                : String(Math.round(40 * (1 - Math.cos(a))));
        }
    }

    function tick(now) {
        // javascript/pjax.js replaces this ring's whole subtree wholesale on
        // every soft navigation rather than tearing it down explicitly, so
        // this is the loop's only chance to notice it's been detached and
        // stop -- otherwise it would keep animating an invisible, orphaned
        // ring forever, one extra instance per visit back to the homepage.
        if (!ring.isConnected) {
            stop();
            return;
        }
        var isInteractive = hovered || Math.abs(boost) > 0.01;
        if (!isInteractive && lastFrame && now - lastFrame < IDLE_FRAME_MS) {
            frame = window.requestAnimationFrame(tick);
            return;
        }
        var dt = Math.min(now - lastFrame, 64) / 1000;
        lastFrame = now;

        var y = window.scrollY;
        var moved = lastScroll === null ? 0 : y - lastScroll;
        lastScroll = y;
        // Page scrolling nudges the ring along; the nudge then decays away.
        boost = Math.max(-5, Math.min(5, boost + moved * 0.004)) *
            Math.exp(-1.6 * dt);

        // Ease towards the target speed so the ring coasts to a stop under the
        // pointer rather than stopping dead mid-turn.
        var target = hovered ? 0 : BASE_SPEED;
        speed += (target - speed) * (1 - Math.exp(-3.2 * dt));
        // The hover pause only stops the idle turn. A wheel gesture always
        // wins, letting a card under the pointer coast naturally through the
        // ring without making the document itself move.
        angle -= (speed + boost) * dt;

        place();
        frame = window.requestAnimationFrame(tick);
    }

    function start() {
        if (frame !== null || still.matches || !wide.matches || !ring.isConnected) return;
        lastFrame = window.performance.now();
        lastScroll = null;
        frame = window.requestAnimationFrame(tick);
    }

    function stop() {
        if (frame === null) return;
        window.cancelAnimationFrame(frame);
        frame = null;
    }

    // Sits below and right of the cursor, but flips back over it rather than
    // being cut off when the card is near the window's edge.
    function moveTip(x, y) {
        var w = tip.offsetWidth;
        var h = tip.offsetHeight;
        var tx = x + 16;
        var ty = y + 18;
        if (tx + w > window.innerWidth - 12) tx = x - 16 - w;
        if (ty + h > window.innerHeight - 12) ty = y - 18 - h;
        tip.style.transform =
            'translate3d(' + Math.max(12, tx) + 'px, ' + Math.max(12, ty) + 'px, 0)';
    }

    function hold(card, x, y) {
        hovered = card;
        ring.classList.add('is-holding');
        card.classList.add('is-active');
        tip.querySelector('b').textContent = card.dataset.name || '';
        tip.querySelector('span').textContent = card.dataset.desc || '';
        moveTip(x, y);
        tip.classList.add('is-visible');
    }

    function release(card) {
        if (hovered !== card) return;
        hovered = null;
        ring.classList.remove('is-holding');
        card.classList.remove('is-active');
        tip.classList.remove('is-visible');
    }

    cards.forEach(function (card) {
        card.addEventListener('mouseenter', function (event) {
            hold(card, event.clientX, event.clientY);
        });
        card.addEventListener('mousemove', function (event) {
            moveTip(event.clientX, event.clientY);
        });
        card.addEventListener('mouseleave', function () {
            release(card);
        });
        // Tabbing to a card does what pointing at one does. There is no cursor
        // to follow, so the pill sits under the card instead.
        card.addEventListener('focus', function () {
            var box = card.getBoundingClientRect();
            hold(card, box.left, box.bottom - 18);
        });
        card.addEventListener('blur', function () {
            release(card);
        });
    });

    function wheelDelta(event) {
        // Wheel deltas are expressed in pixels by modern browsers, but line
        // and page units remain possible in older mice and browsers.
        if (event.deltaMode === 1) return event.deltaY * 16;
        if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
        return event.deltaY;
    }

    // A mouse notch and a trackpad's natural-scroll swipe report opposite
    // deltaY signs for what reads as the same gesture direction: macOS
    // flips the trackpad's sign at the driver level so two fingers moving
    // up "drags" content up, while a wheel keeps the older up-means-back
    // convention. Chrome/Safari still expose the legacy wheelDelta beside
    // deltaY; its fixed -3x relationship to deltaY only holds for a wheel's
    // fixed-size notches; a trackpad's finer, variable deltas break it.
    // Firefox drops wheelDelta entirely and instead reports pixel-mode
    // (deltaMode 0) only for trackpads, line-mode for wheels.
    function isTrackpad(event) {
        if ('wheelDeltaY' in event) return event.wheelDeltaY !== -3 * event.deltaY;
        return event.deltaMode === 0;
    }

    ring.addEventListener('wheel', function (event) {
        if (!wide.matches || still.matches) return;
        var delta = wheelDelta(event);
        if (!delta) return;
        if (isTrackpad(event)) delta = -delta;

        // Keep the response proportional to a trackpad or wheel gesture,
        // while limiting the peak so the cards retain their reassuring weight.
        boost = Math.max(-5, Math.min(5, boost + delta * 0.009));
        event.preventDefault();
        start();
    }, { passive: false });

    function sync() {
        if (!wide.matches) {
            stop();
            return;
        }
        measure();
        place();
        start();
    }

    // Nothing to animate while the ring is scrolled past or the tab is hidden.
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) start();
            else stop();
        }).observe(stage);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop();
        else start();
    });

    window.addEventListener('resize', function () {
        if (!wide.matches) return;
        measure();
        place();
    });

    // Safari below 14 only has the deprecated listener form.
    if (wide.addEventListener) wide.addEventListener('change', sync);
    else wide.addListener(sync);

    sync();
}());

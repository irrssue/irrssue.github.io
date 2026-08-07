// Intro overlay: a rotating white brick block with "Hello" baked into the
// front face, shown once per browser (localStorage-gated), then faded out.
// Falls back to the plain "Hello" text (already in the DOM) if WebGL or the
// three.js CDN import fails, so the intro degrades gracefully without JS/WebGL.
import * as THREE from 'three';

(function () {
    var overlay = document.getElementById('introOverlay');
    if (!overlay) return;

    var seenKey = 'introSeen';
    if (localStorage.getItem(seenKey)) {
        overlay.remove();
        return;
    }
    localStorage.setItem(seenKey, '1');

    document.body.classList.add('intro-active');

    var raf = null;
    var onResize = null;

    try {
        initScene(document.getElementById('introCanvas'));
        overlay.classList.add('intro-overlay--3d');
    } catch (e) {
        // Leave the plain "Hello" text visible as the fallback
    }

    // Hold the block for 2.6s, then fade the overlay out and remove it
    setTimeout(function () {
        overlay.classList.add('intro-hidden');
        document.body.classList.remove('intro-active');
        overlay.addEventListener('transitionend', function () {
            if (raf) cancelAnimationFrame(raf);
            if (onResize) window.removeEventListener('resize', onResize);
            overlay.remove();
        }, { once: true });
    }, 2600);

    function initScene(canvas) {
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0.4, 5);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        var key = new THREE.DirectionalLight(0xffffff, 1);
        key.position.set(3, 4, 5);
        scene.add(key);
        var fill = new THREE.DirectionalLight(0xffffff, 0.4);
        fill.position.set(-4, -2, 2);
        scene.add(fill);

        var brickTex = makeBrickTexture(false);
        var frontTex = makeBrickTexture(true);

        var brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85 });
        var materials = [
            brickMat, brickMat, brickMat, brickMat, // sides + top/bottom
            new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.85 }), // +z, faces camera
            brickMat
        ];

        var block = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), materials);
        block.rotation.set(0.12, -0.35, 0);
        scene.add(block);

        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var clock = new THREE.Clock();
        (function animate() {
            raf = reduceMotion ? null : requestAnimationFrame(animate);
            if (!reduceMotion) block.rotation.y += clock.getDelta() * 0.35;
            renderer.render(scene, camera);
        })();

        onResize = function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);
    }

    // Procedural running-bond brick pattern on an off-white base;
    // `withText` bakes "Hello" into the middle of the pattern for the front face.
    function makeBrickTexture(withText) {
        var size = 512;
        var c = document.createElement('canvas');
        c.width = c.height = size;
        var ctx = c.getContext('2d');

        ctx.fillStyle = '#f5f2ec';
        ctx.fillRect(0, 0, size, size);

        var rows = 8;
        var rowH = size / rows;
        var colW = size / 4;

        for (var r = 0; r < rows; r++) {
            var y = r * rowH;
            var offset = (r % 2) * (colW / 2);

            for (var x = -offset; x < size; x += colW) {
                ctx.fillStyle = 'rgba(0, 0, 0, ' + (Math.random() * 0.035) + ')';
                ctx.fillRect(x, y, colW, rowH);
            }

            ctx.strokeStyle = 'rgba(120, 110, 95, 0.35)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
            for (var vx = -offset; vx < size; vx += colW) {
                ctx.beginPath();
                ctx.moveTo(vx, y);
                ctx.lineTo(vx, y + rowH);
                ctx.stroke();
            }
        }

        if (withText) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '700 ' + size * 0.22 + 'px Georgia, serif';
            ctx.fillStyle = 'rgba(40, 35, 30, 0.15)';
            ctx.fillText('Hello', size / 2 + 4, size / 2 + 6);
            ctx.fillStyle = '#2b2620';
            ctx.fillText('Hello', size / 2, size / 2);
        }

        var tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }
})();

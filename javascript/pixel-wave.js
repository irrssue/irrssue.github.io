/* =======================================================================
   PIXEL FLIP WAVE
   One wave crosses the grid, each cell flips like a split-flap board,
   then the screen goes quiet until the next one. Direction is random
   each pass. No dependencies, canvas 2D.
   ======================================================================= */
const PixelWave = (() => {
  const cfg = {
    color:   '255,255,255', // rgb triplet
    cell:    9,      // px, square size at full brightness
    gap:     3,      // px between cells
    sweep:   3700,   // ms for the front to cross the whole screen
    flip:    900,    // ms one cell takes to flip and fade out
    idleMin: 7000,   // ms of stillness between waves
    idleMax: 11000,
    jitter:  0.10,   // 0–1, how ragged the wave front is
    peak:    0.55,   // max opacity of a cell
    base:    0.00,   // resting opacity (0 = invisible between waves)
    diagonals: true
  };

  const canvas = document.getElementById('pixel-wave');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, step = 0, cols = 0, rows = 0;
  let weight, jit;                  // per-cell brightness + timing noise
  let dx = 1, dy = 0, pMin = 0, pRange = 1;
  let start = 0, raf = 0, timer = 0;

  const DIRS_STRAIGHT = [[1,0],[-1,0],[0,1],[0,-1]];
  const D = Math.SQRT1_2;
  const DIRS_DIAG = [[D,D],[-D,-D],[D,-D],[-D,D]];

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // this site has a light theme too — white squares vanish on white
    cfg.color = document.body.classList.contains('dark-mode') ? '255,255,255' : '0,0,0';
    ctx.fillStyle = 'rgb(' + cfg.color + ')';

    step = cfg.cell + cfg.gap;
    cols = Math.ceil(w / step) + 1;
    rows = Math.ceil(h / step) + 1;
    const n = cols * rows;
    weight = new Float32Array(n);
    jit = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      weight[i] = 0.25 + Math.random() * 0.75; // mottled halftone look
      jit[i] = Math.random();
    }
    drawIdle();
  }

  function pickDirection() {
    const pool = cfg.diagonals ? DIRS_STRAIGHT.concat(DIRS_DIAG) : DIRS_STRAIGHT;
    const d = pool[(Math.random() * pool.length) | 0];
    dx = d[0]; dy = d[1];
    // project the four corners so the front always spans the full screen
    const p = [0, w * dx, h * dy, w * dx + h * dy];
    pMin = Math.min.apply(null, p);
    pRange = Math.max.apply(null, p) - pMin || 1;
  }

  function drawIdle() {
    ctx.clearRect(0, 0, w, h);
    if (cfg.base <= 0.004) return;
    ctx.globalAlpha = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = cfg.base * weight[r * cols + c];
        if (a <= 0.004) continue;
        const size = cfg.cell * (0.35 + 0.65 * (a / cfg.peak));
        ctx.globalAlpha = a;
        ctx.fillRect(c * step + (cfg.cell - size) / 2, r * step + (cfg.cell - size) / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);

    for (let r = 0; r < rows; r++) {
      const y = r * step;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = c * step;

        // 0–1 position of this cell along the wave's direction of travel
        const n = ((x * dx + y * dy) - pMin) / pRange;
        const p = (t - (n + jit[i] * cfg.jitter) * cfg.sweep) / cfg.flip;

        let a = cfg.base * weight[i], sy = 1;
        if (p > 0 && p < 1) {
          // fast snap on, slower fade off
          const env = p < 0.18 ? p / 0.18 : Math.pow(1 - (p - 0.18) / 0.82, 2.2);
          a = Math.max(a, cfg.peak * env * weight[i]);
          // the flip itself: full -> edge-on -> full, early in the cell's life
          sy = Math.abs(Math.cos(Math.min(p / 0.45, 1) * Math.PI));
        }
        if (a <= 0.004) continue;

        const size = cfg.cell * (0.35 + 0.65 * (a / cfg.peak));
        const hgt = Math.max(1, size * sy);
        ctx.globalAlpha = a;
        ctx.fillRect(x + (cfg.cell - size) / 2, y + (cfg.cell - hgt) / 2, size, hgt);
      }
    }
    ctx.globalAlpha = 1;

    if (t < cfg.sweep * (1 + cfg.jitter) + cfg.flip) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      drawIdle();
      schedule();
    }
  }

  function run() {
    if (raf || document.hidden) { schedule(); return; }
    pickDirection();
    start = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, cfg.idleMin + Math.random() * (cfg.idleMax - cfg.idleMin));
  }

  // resize: rebuild the grid, restart the clock
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { cancelAnimationFrame(raf); raf = 0; build(); schedule(); }, 150);
  });

  // don't animate to an empty room
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; clearTimeout(timer); drawIdle(); }
    else schedule();
  });

  // theme toggle flips body.dark-mode — repaint with the readable colour
  new MutationObserver(() => {
    cfg.color = document.body.classList.contains('dark-mode') ? '255,255,255' : '0,0,0';
    ctx.fillStyle = 'rgb(' + cfg.color + ')';
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  build();
  if (!reduced) { timer = setTimeout(run, 1200); }

  return {
    cfg,
    trigger() { if (!raf) { cancelAnimationFrame(raf); run(); } },
    rebuild: build
  };
})();

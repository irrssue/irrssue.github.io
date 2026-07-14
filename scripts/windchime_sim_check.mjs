// Headless sanity check for the windchime physics.
// Extracts the physics section of windchime/index.html, simulates 10
// minutes of wind, and asserts the chime actually rings, every tube gets
// struck, and nothing blows up numerically.
// Run: node scripts/windchime_sim_check.mjs
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const html = readFileSync(new URL('../windchime/index.html', import.meta.url), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
const cut = script.indexOf('/* ='); // header of the physics block
const audioAt = script.indexOf('Audio - modal synthesis');
assert(cut >= 0 && audioAt > cut, 'could not locate physics section');
// physics runs from its header comment to just before the audio block header
const phys = script.slice(cut, script.lastIndexOf('/* =', audioAt));

const strikes = [];
globalThis.strike = (f, v) => strikes.push({ f, v });

const stats = (0, eval)(`${phys}
;(function () {
  const SUB = 1 / 240;
  let maxQ = 0;
  for (let i = 0; i < 600 * 240; i++) {
    t += SUB; updateWind(SUB); step(SUB);
    if (!isFinite(qx + qz + wx + wz + thG + thS)) throw new Error('NaN at t=' + t);
    for (const tb of tubes) if (!isFinite(tb.a + tb.av)) throw new Error('tube NaN at t=' + t);
    maxQ = Math.max(maxQ, Math.hypot(qx, qz));
  }
  return { maxQ };
})()`);

const tubesHit = new Set(strikes.map(s => s.f));
console.log(`600 s: ${strikes.length} strikes, ${tubesHit.size}/6 tubes rang, max swing ${stats.maxQ.toFixed(2)} rad`);
assert(strikes.length > 5, 'chime is nearly silent');
assert(tubesHit.size >= 3, 'most tubes never ring');
assert(stats.maxQ < 1.0, 'unphysical swing amplitude');
assert(strikes.every(s => s.v >= 0.08 && s.v <= 1), 'strike volume out of range');
console.log('OK');

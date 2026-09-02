import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = 'http://localhost:8899';
const browser = await chromium.launch();
let failures = 0;
const fail = m => { console.log('     FAIL ' + m); failures++; };

/* The site is allowed exactly one kind of external traffic: the Gems photo
   prewarm that javascript/script.js schedules on `load`, during idle time, so
   opening /gems is not a cold start. Everything else — a font CDN, an
   analytics tag, an icon library — is a regression.

   So a request is judged on two things: whether it beat the `load` event, and
   whether it went anywhere other than the photo host. The allowed origins are
   read out of gems.json rather than written down here, so moving the photos
   somewhere else does not quietly widen what this check permits. */
const prewarmOrigins = new Set(
  JSON.parse(readFileSync(new URL('../data/gems.json', import.meta.url), 'utf8'))
    .map(g => g && g.src)
    .filter(Boolean)
    .flatMap(src => { try { return [new URL(src).origin]; } catch { return []; } })
);
const origin = u => { try { return new URL(u).origin; } catch { return u; } };

async function open(path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], external = [], failed = [];
  let loaded = false;
  page.on('load', () => { loaded = true; });
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => {
    if (r.url().startsWith(BASE)) return;
    external.push({ url: r.url(), beforeLoad: !loaded });
  });
  page.on('requestfailed', r => failed.push(r.url()));
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(1200);            // let idle callbacks fire
  // Anything that beat `load`, and anything aimed off the photo host.
  const early = external.filter(r => r.beforeLoad);
  const foreign = external.filter(r => !prewarmOrigins.has(origin(r.url)));
  return { page, ctx, errors, external, early, foreign, failed };
}

console.log('--- page load: no JS errors, nothing external before load ---');
for (const p of ['/', '/writing', '/bookmarks',
                 '/writing/2026/4-hour-of-ci-rabbit-hole', '/writing/2025/Hi']) {
  const { ctx, errors, external, early, foreign, failed } = await open(p);
  const ok = !errors.length && !early.length && !foreign.length && !failed.length;
  if (!ok) failures++;
  const warm = external.length - early.length - foreign.length;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${p.padEnd(46)} ${warm} gems prewarm after load`);
  errors.forEach(e => console.log('       console: ' + e));
  failed.forEach(f => console.log('       failed : ' + f));
  early.forEach(r => console.log('       BEFORE LOAD: ' + r.url.slice(0, 80)));
  foreign.forEach(r => console.log('       FOREIGN    : ' + r.url.slice(0, 80)));
  await ctx.close();
}

console.log('\n--- content rendered ---');
{
  const { page, ctx } = await open('/');
  // Projects appear twice: the ring beside the column above 1080px, the swipe
  // rail below it. Both are written from data/projects.json, so a mismatch
  // means the build wrote one block and not the other.
  const ring = await page.locator('.pcard').count();
  const rail = await page.locator('.prail').count();
  const posts = await page.locator('.writing-post-item').count();
  const track = await page.locator('#npTitle').textContent();
  console.log(`homepage: ${ring} ring cards, ${rail} rail slides, ${posts} recent posts, now-playing = "${track}"`);
  if (ring === 0) fail('no project ring cards');
  if (ring !== rail) fail(`ring has ${ring} projects, rail has ${rail}`);
  if (posts !== 3) fail(`expected 3 recent posts, got ${posts}`);
  if (!track || track === '—') fail('now-playing title not shown without the YT API');
  await ctx.close();
}
{
  const { page, ctx } = await open('/writing/2026/4-hour-of-ci-rabbit-hole');
  const title = await page.locator('.post-title').textContent();
  const paras = await page.locator('.post-content p').count();
  const pre = await page.locator('.post-content pre').count();
  const date = await page.locator('.post-date').textContent();
  const full = await page.locator('.post-date').getAttribute('data-full-date');
  console.log(`post: "${title}" | ${paras} paras, ${pre} code blocks | date "${date}" (tooltip "${full}")`);
  if (paras < 3) fail('post body did not render');
  if (!/ago|just now/.test(date)) fail('relative date not applied');
  await ctx.close();
}

console.log('\n--- no-JS: content still there ---');
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  // Both project blocks are laid out by the stylesheet alone, so they have to
  // survive with scripting off — the ring stops turning and the rail loses its
  // dots, and that is the whole difference.
  const projectCount = JSON.parse(
    readFileSync(new URL('../data/projects.json', import.meta.url), 'utf8')
  ).filter(p => p.image).length;
  for (const [p, sel, min] of [['/', '.pcard', projectCount],
                               ['/', '.prail', projectCount],
                               ['/writing', '.bk-item', 7],
                               ['/bookmarks', '.bk-item', 4],
                               ['/writing/2026/4-hour-of-ci-rabbit-hole', '.post-content p', 3]]) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    const n = await page.locator(sel).count();
    const ok = n >= min;
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${p.padEnd(40)} ${n} x ${sel} without JS`);
  }
  await ctx.close();
}

console.log('\n--- YouTube loads only after pressing play ---');
{
  const { page, ctx, external } = await open('/');
  const ytBefore = external.filter(r => r.url.includes('youtube.com')).length;
  console.log(`before click: ${ytBefore} youtube requests`);
  if (ytBefore) fail('YouTube loaded before the play button was pressed');
  await page.locator('#npPlayBtn').click();
  await page.waitForTimeout(3000);
  const yt = external.filter(r => r.url.includes('youtube.com')).length;
  console.log(`after click : ${yt} youtube requests`);
  if (!yt) fail('play click did not load the YouTube API');
  await ctx.close();
}

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
await browser.close();
process.exit(failures ? 1 : 0);

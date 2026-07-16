import { chromium } from 'playwright';
const BASE = 'http://localhost:8899';
const browser = await chromium.launch();
let failures = 0;
const fail = m => { console.log('     FAIL ' + m); failures++; };

async function open(path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], external = [], failed = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => !r.url().startsWith(BASE) && external.push(r.url()));
  page.on('requestfailed', r => failed.push(r.url()));
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(1200);            // let idle callbacks fire
  return { page, ctx, errors, external, failed };
}

console.log('--- page load: no JS errors, no external requests ---');
for (const p of ['/', '/writing', '/bookmarks',
                 '/writing/2026/4-hour-of-ci-rabbit-hole', '/writing/2025/Hi']) {
  const { ctx, errors, external, failed } = await open(p);
  const ok = !errors.length && !external.length && !failed.length;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${p}`);
  errors.forEach(e => console.log('       console: ' + e));
  failed.forEach(f => console.log('       failed : ' + f));
  external.forEach(u => console.log('       EXTERNAL: ' + u.slice(0, 90)));
  await ctx.close();
}

console.log('\n--- content rendered ---');
{
  const { page, ctx } = await open('/');
  const projects = await page.locator('.project-item').count();
  const posts = await page.locator('.writing-post-item').count();
  const track = await page.locator('#npTitle').textContent();
  console.log(`homepage: ${projects} projects, ${posts} recent posts, now-playing = "${track}"`);
  if (projects !== 11) fail(`expected 11 projects, got ${projects}`);
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

console.log('\n--- tag filter hides rows ---');
for (const [path, tag] of [['/writing', 'homelab'], ['/bookmarks', 'ai']]) {
  const { page, ctx } = await open(path);
  const before = await page.locator('.bk-item:visible').count();
  await page.locator(`.bk-chip[data-tag="${tag}"]`).click();
  await page.waitForTimeout(150);
  const after = await page.locator('.bk-item:visible').count();
  const search = new URL(page.url()).search;
  console.log(`${path} "${tag}": ${before} -> ${after} visible, url${search}`);
  if (!(after > 0 && after < before)) fail(`${path}: filter did not hide rows`);
  if (search !== `?tag=${tag}`) fail(`${path}: url not updated`);
  await page.locator('.bk-chip[data-tag=""]').click();
  await page.waitForTimeout(150);
  if (await page.locator('.bk-item:visible').count() !== before) fail(`${path}: reset failed`);
  await ctx.close();
}

console.log('\n--- deep link ?tag= works on a cold load ---');
{
  const { page, ctx } = await open('/writing?tag=macos');
  const n = await page.locator('.bk-item:visible').count();
  console.log(`/writing?tag=macos -> ${n} visible`);
  if (n !== 3) fail(`expected 3 macos posts, got ${n}`);
  await ctx.close();
}

console.log('\n--- no-JS: content still there ---');
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const [p, sel, min] of [['/', '.project-item', 11],
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
  console.log(`before click: ${external.length} external requests`);
  if (external.length) fail('external requests before any interaction');
  await page.locator('#npPlayBtn').click();
  await page.waitForTimeout(3000);
  const yt = external.filter(u => u.includes('youtube.com')).length;
  console.log(`after click : ${external.length} external requests (${yt} youtube)`);
  if (!yt) fail('play click did not load the YouTube API');
  await ctx.close();
}

console.log(failures ? `\n${failures} FAILURES` : '\nall checks passed');
await browser.close();
process.exit(failures ? 1 : 0);

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = 'http://localhost:8899';
const browser = await chromium.launch();
let failures = 0;
const fail = m => { console.log('     FAIL ' + m); failures++; };

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
  return { page, ctx, errors, external, failed };
}

console.log('--- page load: no JS errors or background third-party traffic ---');
for (const p of ['/', '/writing', '/bookmarks',
                 '/writing/2026/4-hour-of-ci-rabbit-hole', '/writing/2025/Hi']) {
  const { ctx, errors, external, failed } = await open(p);
  const ok = !errors.length && !external.length && !failed.length;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${p.padEnd(46)} ${external.length} external requests`);
  errors.forEach(e => console.log('       console: ' + e));
  failed.forEach(f => console.log('       failed : ' + f));
  external.forEach(r => console.log('       EXTERNAL: ' + r.url.slice(0, 80)));
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

console.log('\n--- Gems data stays inert and defers unseen originals ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/data/gems.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([
      {
        id: 'first', type: 'photo', orient: 'landscape',
        src: 'https://upload.irrssue.com/first.jpg',
        title: '<img data-xss-probe src=x>', desc: '<script data-xss-probe>window.xss=true</script>',
        place: '<b data-xss-probe>place</b>', coords: '0, 0',
        camera: '<img data-xss-probe>', lens: '50mm', iso: '100', aperture: 'f/2', shutter: '1/100'
      },
      {
        id: 'second', type: 'photo', orient: 'landscape',
        src: 'https://upload.irrssue.com/second.jpg',
        title: 'Second', desc: '', place: '', coords: '', camera: '', lens: '', iso: '', aperture: '', shutter: ''
      }
    ])
  }));
  await page.goto(BASE + '/gems', { waitUntil: 'load' });
  await page.waitForTimeout(250);
  const injectedNodes = await page.locator('[data-xss-probe]').count();
  const deferred = await page.locator('.stack-card img[data-src]').count();
  const literalTitle = await page.locator('.title').textContent();
  const ok = injectedNodes === 0 && deferred === 1 && literalTitle === '<img data-xss-probe src=x>';
  if (!ok) fail(`Gems CMS data was not safely rendered (nodes=${injectedNodes}, deferred=${deferred})`);
  else console.log('ok  CMS text is inert; only the first stack image is requested initially');
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

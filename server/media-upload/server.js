// media-upload: drag-and-drop image upload service for upload.irrssue.com
// Zero dependencies. Runs under PM2 as user irrssue.
//
// Routes:
//   GET  /upload            -> drag-and-drop upload page
//   POST /upload?name=<fn>  -> save raw request body to /var/www/media/<fn>
//                              auth: X-Upload-Token header must match
//                              the contents of ~/.media-upload-token
//
// nginx (sites-available/media) proxies /upload on port 8088 to this app;
// everything else on upload.irrssue.com stays static via nginx.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3004;
const HOST = '127.0.0.1';
const MEDIA_DIR = process.env.MEDIA_DIR || '/var/www/media';
const TOKEN_FILE = path.join(process.env.HOME || '/home/irrssue', '.media-upload-token');
const PUBLIC_BASE = 'https://upload.irrssue.com';
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB
// The admin page is served from the custom domain; irrssue.github.io only
// redirects there, so a browser never sends that origin -- allowing it alone
// made every upload from the admin page fail its CORS preflight.
const ALLOWED_ORIGINS = new Set(['https://irrssue.com', 'https://irrssue.github.io']);
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif',
  '.mp4', '.webm', '.mov', '.m4v',
]);

const PAGE = fs.readFileSync(path.join(__dirname, 'upload.html'));

function tokenMatches(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  let secret;
  try {
    secret = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  } catch (err) {
    console.error('cannot read token file:', err.message);
    return false;
  }
  const a = crypto.createHash('sha256').update(candidate.trim()).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

function sanitizeName(raw) {
  const base = path.basename(String(raw || ''));
  const clean = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+/, '');
  if (!clean || clean === '.' || clean === '..') return null;
  return clean.slice(0, 200);
}

// Moves the finished upload into place under `name`, or -- if that name is
// taken -- under the name with a timestamp before the extension, so an upload
// never overwrites an existing photo. link() fails if the target exists,
// which closes the gap a check-then-rename leaves for two uploads of the same
// name arriving together. Returns the name used.
function publish(tmpPath, name) {
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0
      ? name
      : `${stem}-${Date.now()}${attempt > 1 ? '-' + crypto.randomBytes(3).toString('hex') : ''}${ext}`;
    try {
      fs.linkSync(tmpPath, path.join(MEDIA_DIR, candidate));
      fs.unlinkSync(tmpPath);
      return candidate;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  throw new Error('no free filename');
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  return ALLOWED_ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    : { 'Vary': 'Origin' };
}

function sendJSON(req, res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }, corsHeaders(req)));
  res.end(body);
}

function handleUpload(req, res, url) {
  if (!tokenMatches(req.headers['x-upload-token'])) {
    return sendJSON(req, res, 401, { error: 'invalid or missing upload token' });
  }
  const name = sanitizeName(url.searchParams.get('name'));
  if (!name) {
    return sendJSON(req, res, 400, { error: 'missing or invalid ?name= filename' });
  }
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return sendJSON(req, res, 400, { error: `type not allowed: ${ext || '(none)'}` });
  }

  const tmpPath = path.join(MEDIA_DIR, `.tmp-${crypto.randomBytes(8).toString('hex')}`);

  let received = 0;
  let failed = false;
  const out = fs.createWriteStream(tmpPath, { mode: 0o600 });

  function abort(status, message) {
    if (failed) return;
    failed = true;
    out.destroy();
    fs.unlink(tmpPath, () => {});
    sendJSON(req, res, status, { error: message });
  }

  req.on('data', (chunk) => {
    received += chunk.length;
    if (received > MAX_BYTES) abort(413, 'file too large (max 200 MB)');
  });
  req.on('error', () => abort(500, 'upload interrupted'));
  out.on('error', (err) => abort(500, `write failed: ${err.message}`));

  out.on('finish', () => {
    if (failed) return;
    if (received === 0) return abort(400, 'empty body');
    let finalName;
    try {
      fs.chmodSync(tmpPath, 0o644);
      finalName = publish(tmpPath, name);
    } catch (err) {
      return abort(500, `could not finalize file: ${err.message}`);
    }
    console.log(`uploaded ${finalName} (${received} bytes)`);
    sendJSON(req, res, 200, {
      url: `${PUBLIC_BASE}/${encodeURIComponent(finalName)}`,
      name: finalName,
      bytes: received,
    });
  });

  req.pipe(out);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname.replace(/\/+$/, '') || '/';

  if (route === '/upload' && req.method === 'OPTIONS') {
    res.writeHead(204, Object.assign({
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Upload-Token, Content-Type',
    }, corsHeaders(req)));
    return res.end();
  }
  if (route === '/upload' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': PAGE.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end(PAGE);
  }
  if (route === '/upload' && req.method === 'POST') {
    return handleUpload(req, res, url);
  }
  sendJSON(req, res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`media-upload listening on http://${HOST}:${PORT}`);
});

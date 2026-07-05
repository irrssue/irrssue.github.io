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

const PORT = 3004;
const HOST = '127.0.0.1';
const MEDIA_DIR = '/var/www/media';
const TOKEN_FILE = path.join(process.env.HOME || '/home/irrssue', '.media-upload-token');
const PUBLIC_BASE = 'https://upload.irrssue.com';
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

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

// If the name is taken, insert a timestamp before the extension so an
// upload never silently overwrites an existing photo.
function availableName(name) {
  if (!fs.existsSync(path.join(MEDIA_DIR, name))) return name;
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  return `${stem}-${Date.now()}${ext}`;
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function handleUpload(req, res, url) {
  if (!tokenMatches(req.headers['x-upload-token'])) {
    return sendJSON(res, 401, { error: 'invalid or missing upload token' });
  }
  const name = sanitizeName(url.searchParams.get('name'));
  if (!name) {
    return sendJSON(res, 400, { error: 'missing or invalid ?name= filename' });
  }

  const finalName = availableName(name);
  const finalPath = path.join(MEDIA_DIR, finalName);
  const tmpPath = path.join(MEDIA_DIR, `.tmp-${crypto.randomBytes(8).toString('hex')}`);

  let received = 0;
  let failed = false;
  const out = fs.createWriteStream(tmpPath, { mode: 0o600 });

  function abort(status, message) {
    if (failed) return;
    failed = true;
    out.destroy();
    fs.unlink(tmpPath, () => {});
    sendJSON(res, status, { error: message });
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
    try {
      fs.chmodSync(tmpPath, 0o644);
      fs.renameSync(tmpPath, finalPath);
    } catch (err) {
      return abort(500, `could not finalize file: ${err.message}`);
    }
    console.log(`uploaded ${finalName} (${received} bytes)`);
    sendJSON(res, 200, {
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

  if (route === '/upload' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': PAGE.length,
      'Cache-Control': 'no-store',
    });
    return res.end(PAGE);
  }
  if (route === '/upload' && req.method === 'POST') {
    return handleUpload(req, res, url);
  }
  sendJSON(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`media-upload listening on http://${HOST}:${PORT}`);
});

#!/usr/bin/env python3
"""Static media server + tiny upload page for the public gallery, behind Cloudflare Tunnel.

Serving (GET):  CORS for GitHub Pages, immutable caching, HTTP Range (206) for <video>.
Upload (POST /upload): token-gated drag-drop. The tunnel exposes this to the public internet, so uploads
require a secret token, sanitize the filename, allowlist media types, and cap size."""
import http.server, socketserver, os, re, mimetypes, json, cgi, secrets
from urllib.parse import unquote

ROOT   = "/var/www/media"
PORT   = 8088
ORIGIN = "https://irrssue.github.io"
PUBLIC_BASE = "https://upload.irrssue.com"
TOKEN_FILE  = os.path.expanduser("~/.media-upload-token")
MAX_BYTES   = 500 * 1024 * 1024          # 500 MB per file
ALLOWED_EXT = {".jpg",".jpeg",".png",".webp",".gif",".avif",
               ".mp4",".webm",".mov",".m4v"}

with open(TOKEN_FILE) as f:
    UPLOAD_TOKEN = f.read().strip()

UPLOAD_PAGE = """<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>media upload</title><style>
body{font:15px -apple-system,system-ui,sans-serif;background:#0b0a09;color:#f3efe8;
max-width:560px;margin:8vh auto;padding:0 20px}
h1{font-weight:500;font-size:18px}label{display:block;color:#8b847a;font-size:12px;margin:14px 0 5px}
input{width:100%;padding:9px;border:1px solid #333;border-radius:7px;background:#1c1c1c;color:#f3efe8;font:inherit}
#drop{margin-top:16px;border:1.5px dashed #444;border-radius:12px;padding:38px;text-align:center;color:#8b847a;cursor:pointer;transition:.15s}
#drop.over{border-color:#4f9cf9;background:#10161f;color:#f3efe8}
#out{margin-top:18px;font-size:13px;word-break:break-all}
.url{background:#141414;border:1px solid #272727;border-radius:7px;padding:10px;margin-top:8px;font-family:monospace;font-size:12px}
.ok{color:#22c55e}.err{color:#ef4444}button{margin-top:6px;padding:5px 10px;border-radius:6px;border:none;background:#4f9cf9;color:#fff;cursor:pointer;font:inherit}
</style></head><body>
<h1>Upload to gallery</h1>
<label>Upload token</label><input id=tok type=password placeholder="paste token" autocomplete=off>
<div id=drop>Drag a photo or video here, or click to choose</div>
<input id=file type=file accept="image/*,video/*" style=display:none>
<div id=out></div>
<script>
const drop=document.getElementById('drop'),file=document.getElementById('file'),
out=document.getElementById('out'),tok=document.getElementById('tok');
try{tok.value=localStorage.getItem('uptok')||''}catch(e){}
tok.addEventListener('change',()=>{try{localStorage.setItem('uptok',tok.value)}catch(e){}});
drop.onclick=()=>file.click();
['dragover','dragenter'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',ev=>{if(ev.dataTransfer.files[0])send(ev.dataTransfer.files[0])});
file.addEventListener('change',()=>{if(file.files[0])send(file.files[0])});
function send(f){
  if(!tok.value){out.innerHTML='<span class=err>Enter the token first.</span>';return}
  out.textContent='Uploading '+f.name+' ...';
  const fd=new FormData();fd.append('file',f);
  fetch('/upload',{method:'POST',headers:{'X-Upload-Token':tok.value},body:fd})
    .then(r=>r.json()).then(d=>{
      if(d.url){out.innerHTML='<span class=ok>✓ uploaded</span><div class=url id=u>'+d.url+'</div><button onclick="navigator.clipboard.writeText(document.getElementById(\\'u\\').textContent)">Copy URL</button>'}
      else out.innerHTML='<span class=err>'+(d.error||'failed')+'</span>';
    }).catch(e=>out.innerHTML='<span class=err>'+e+'</span>');
}
</script></body></html>"""

def safe_name(name):
    name = os.path.basename(name).replace("\\", "")
    name = re.sub(r"[^A-Za-z0-9._-]", "-", name).strip("-.") or "file"
    return name

class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "media/1.0"

    # ---------- helpers ----------
    def _media_path(self):
        path = unquote(self.path.split("?",1)[0].lstrip("/"))
        full = os.path.realpath(os.path.join(ROOT, path))
        if not (full == ROOT or full.startswith(ROOT+os.sep)): return None
        return full

    def _hdr(self, ctype, length=None):
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Type", ctype)
        if length is not None: self.send_header("Content-Length", str(length))

    # ---------- routes ----------
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "X-Upload-Token, Content-Type")
        self.end_headers()

    def do_HEAD(self): self._serve(True)
    def do_GET(self):
        if self.path.split("?",1)[0] in ("", "/"):
            self.send_response(302)
            self.send_header("Location", "/upload")
            self.send_header("Content-Length", "0")
            self.end_headers(); return
        if self.path.split("?",1)[0] == "/upload":
            body = UPLOAD_PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.send_header("Content-Length",str(len(body)))
            self.end_headers(); self.wfile.write(body); return
        self._serve(False)

    def do_POST(self):
        if self.path.split("?",1)[0] != "/upload":
            self.send_error(404); return
        tok = self.headers.get("X-Upload-Token","")
        if not (tok and secrets.compare_digest(tok, UPLOAD_TOKEN)):
            self._json(403, {"error":"bad token"}); return
        clen = int(self.headers.get("Content-Length") or 0)
        if clen > MAX_BYTES + 1024*1024:
            self._json(413, {"error":"file too large (max 500 MB)"}); return
        try:
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers,
                environ={"REQUEST_METHOD":"POST","CONTENT_TYPE":self.headers["Content-Type"]})
            item = form["file"]
        except Exception as e:
            self._json(400, {"error":"bad form: "+str(e)}); return
        if not getattr(item,"filename",None):
            self._json(400, {"error":"no file"}); return
        name = safe_name(item.filename)
        ext = os.path.splitext(name)[1].lower()
        if ext not in ALLOWED_EXT:
            self._json(400, {"error":"type not allowed: "+ext}); return
        # avoid clobber: suffix if exists
        dest = os.path.join(ROOT, name); base,e2 = os.path.splitext(name)
        while os.path.exists(dest):
            dest = os.path.join(ROOT, base+"-"+secrets.token_hex(3)+e2)
        data = item.file.read()
        if len(data) > MAX_BYTES:
            self._json(413, {"error":"file too large (max 500 MB)"}); return
        with open(dest,"wb") as f: f.write(data)
        self._json(200, {"url": PUBLIC_BASE+"/"+os.path.basename(dest)})

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type","application/json")
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Content-Length",str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def _serve(self, head):
        full = self._media_path()
        if not full or not os.path.isfile(full): self.send_error(404,"Not Found"); return
        size = os.path.getsize(full)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng.strip())
            if m:
                start = int(m.group(1)) if m.group(1) else 0
                end = int(m.group(2)) if m.group(2) else size-1
                end = min(end, size-1)
                if start>end or start>=size:
                    self.send_response(416); self.send_header("Content-Range",f"bytes */{size}")
                    self.end_headers(); return
                length=end-start+1
                self.send_response(206); self._hdr(ctype,length)
                self.send_header("Content-Range",f"bytes {start}-{end}/{size}")
                self.end_headers()
                if not head: self._send(full,start,length)
                return
        self.send_response(200); self._hdr(ctype,size); self.end_headers()
        if not head: self._send(full,0,size)

    def _send(self, full, start, length):
        with open(full,"rb") as f:
            f.seek(start); rem=length
            while rem>0:
                chunk=f.read(min(65536,rem))
                if not chunk: break
                try: self.wfile.write(chunk)
                except (BrokenPipeError,ConnectionResetError): break
                rem-=len(chunk)

    def log_message(self,*a): pass

socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1",PORT), Handler) as httpd:
    httpd.serve_forever()

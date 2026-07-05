# media-upload service

Drag-and-drop image uploader behind `https://upload.irrssue.com/upload`.
This code runs on the homelab, not on GitHub Pages - it is kept in this repo so the service can always be rebuilt if the server is lost.

## What it does

- `GET /upload` serves a drag-and-drop upload page (`upload.html`).
- `POST /upload?name=<filename>` saves the raw request body to `/var/www/media/<filename>` and returns JSON with the public URL.
- Auth is a shared secret: the `X-Upload-Token` header must match the contents of `/home/irrssue/.media-upload-token` on the homelab.
- Filenames are sanitized, and a name collision gets a timestamp suffix instead of overwriting.
- Uploaded URLs are pasted into `html/admin.html` (Gems tab), which writes them into `data/gems.json`.

## How it is deployed (homelab)

- Code lives at `/home/irrssue/media-upload/` and runs under PM2 as `media-upload` on `127.0.0.1:3004`.
- Nginx site `/etc/nginx/sites-available/media` (port 8088, root `/var/www/media`) proxies `location /upload` to port 3004 and redirects `/` to `/upload`; everything else is served as static files.
- Cloudflare Tunnel (`/etc/cloudflared/config.yml`) routes `upload.irrssue.com` to `localhost:8088`.

## Rebuilding from scratch

```sh
scp -r server/media-upload irrssue@homelab:/home/irrssue/media-upload
ssh irrssue@homelab 'cd ~/media-upload && pm2 start server.js --name media-upload && pm2 save'
```

Then make sure the nginx `media` site contains the `/upload` proxy block (see "How it is deployed") and that `~/.media-upload-token` exists.

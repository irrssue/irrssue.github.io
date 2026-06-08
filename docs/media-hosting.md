# Media hosting — self-hosted on the homelab

The Gems gallery embeds photos/videos by URL. Those bytes are served from a small
self-hosted service on the home server (Dell, Ubuntu 24.04), exposed to the public
internet over **Tailscale Funnel** with a real HTTPS cert. Only the URL is stored in
`data/gems.json` — no media is committed to this repo.

## The public URL
```
https://upload.irrssue.com/<filename>      # serves a media file
https://upload.irrssue.com/upload          # drag-drop upload page (token-gated)
```
GitHub Pages is HTTPS, so embedded media MUST be HTTPS too — Cloudflare provides that.

`irrssue.com/html/upload.html` is a tiny static redirect on the main site that forwards
to `upload.irrssue.com/upload`, kept as a memorable entry point.

## How to publish a new gem image/video
1. Open the upload page above, enter the upload token (see "Secrets" below).
2. Drag a photo or video in → it returns the public URL → copy it.
3. Paste that URL into the Gems admin (`html/admin.html`) `Media URL / path` field → save.

## Where everything lives (on the server)
| Thing | Path |
|---|---|
| Media files | `/var/www/media/` |
| Server script | `~/.local/bin/media-server.py` |
| systemd user unit | `~/.config/systemd/user/media-server.service` |
| Upload token | `~/.media-upload-token` (chmod 600) |

## Architecture
- `media-server.py` is a small Python (stdlib only) HTTP server bound to `127.0.0.1:8088`.
- **Cloudflare Tunnel** (`cloudflared`, existing `homelab` tunnel, system service at
  `/etc/cloudflared/config.yml`) serves `upload.irrssue.com` with a valid cert and proxies
  it to `localhost:8088`. The ingress rule sits just above the `http_status:404` catch-all,
  which MUST stay last. After editing that config: `sudo cloudflared tunnel ingress validate`
  then `sudo systemctl restart cloudflared`. Edit it with a tool that preserves 2-space
  indentation (a stray indent = `did not find expected key` and the tunnel won't start,
  taking ALL subdomains down — restore from `~/.cloudflared/config.yml.bak-*` if that happens).
- Tailscale Funnel ALSO still proxies `:443 → :8088` for `homelab.tailc7db4b.ts.net`. It is
  now redundant with the Cloudflare path; either is fine, Cloudflare gives the clean domain.
  To drop Funnel: `sudo tailscale funnel --https=443 off`.
- It does three things:
  - **Serve** `/var/www/media/*` with CORS (`Access-Control-Allow-Origin: https://irrssue.github.io`),
    immutable caching, and **HTTP Range / 206** (required for `<video>` seeking + Safari playback).
  - **GET `/upload`** → the drag-drop upload page.
  - **POST `/upload`** → token-gated upload: checks `X-Upload-Token`, sanitizes the filename,
    allowlists media extensions, caps size at 500 MB, never clobbers existing files.
- Runs as a **systemd user service** (no root needed to run it).

## Why this design
- Funnel over port-forwarding: no router config, no exposed home IP, no cert renewal,
  works behind CGNAT. Hostname/cert are managed by Tailscale.
- nginx on this box was dead (snap-Nextcloud's bundled Apache holds `:80`), so the media
  service deliberately does NOT depend on system nginx — it's a self-contained user service.
- Python stdlib only: nothing to install, nothing to keep patched beyond the OS Python.

## Operations / runbook
```bash
# status / restart / logs
systemctl --user status media-server.service
systemctl --user restart media-server.service
journalctl --user -u media-server.service -n 50

# is it actually up + reachable from the internet?
curl -sS -o /dev/null -w "%{http_code}\n" https://homelab.tailc7db4b.ts.net/<somefile>
tailscale funnel status        # should show :443 -> http://localhost:8088
```

### Persistence gotcha (important)
The media server is a **user** service, so it only survives logout/reboot if **lingering**
is enabled for the user:
```bash
sudo loginctl enable-linger irrssue
loginctl show-user irrssue | grep Linger      # want Linger=yes
```
If the gallery images 404 after a reboot, this is the first thing to check.

## Secrets
- The upload token lives only in `~/.media-upload-token` on the server (chmod 600).
  It is NOT committed here. To read it: `cat ~/.media-upload-token` on the homelab.
- To rotate it: write a new value to that file and `systemctl --user restart media-server.service`.

## Security model (Funnel = public internet)
- Anyone can GET a media file if they know the exact filename (fine — these are public gallery
  assets anyway). Directory listing is off.
- Uploads require the secret token, are media-type-allowlisted, size-capped, and filename-sanitized
  (no path traversal, no overwrite). The token is the only thing standing between the public and
  your disk — keep it private, rotate if leaked.
- Only `:443 -> :8088` is funneled. Immich, Jellyfin, Nextcloud, etc. are NOT exposed by this.

## Capacity caveat
Bytes are served from a residential uplink — fine for a low-traffic portfolio, not a CDN.
A viral post could saturate the home upload link. Acceptable for this use; revisit if traffic grows.

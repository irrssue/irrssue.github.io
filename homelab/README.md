# homelab — media server

Backup of the media/upload server that powers the **Gems** gallery. This runs on the
homelab box (`ssh irrssue@homelab`), **not** on GitHub Pages. These files are committed
here for recovery and history — editing them in the repo does **not** deploy. Deploy is
manual (see below).

## What it does
`media-server.py` is a small Python `http.server` (stdlib only, no deps) on
`127.0.0.1:8088`. It:

- **Serves** uploaded photos/videos from `/var/www/media` with CORS for
  `https://irrssue.github.io`, immutable caching, and HTTP Range (206) so `<video>` seeks.
- **Hosts** a token-gated drag-drop upload page at **`/upload`**.
- **Redirects** bare `/` → `/upload`.

## How it's exposed
Public traffic reaches it via **Cloudflare Tunnel** (`cloudflared`), not Tailscale:

```
upload.irrssue.com  →  Cloudflare  →  cloudflared tunnel  →  localhost:8088
```

The tunnel's ingress lives in `/etc/cloudflared/config.yml` on the box (root-owned, not
backed up here). `upload.irrssue.com` is a proxied DNS record in Cloudflare pointing at
the tunnel.

## Public URLs
- `https://upload.irrssue.com/upload` — upload page
- `https://upload.irrssue.com/<filename>` — a served media file
- `https://upload.irrssue.com/` — redirects to `/upload`

## Run / deploy (on the box)
Managed by a **systemd user service** (`media-server.service`), with linger on so it
survives logout/reboot. `Restart=always`.

```sh
# files live here on the box:
#   ~/.local/bin/media-server.py
#   ~/.config/systemd/user/media-server.service

systemctl --user daemon-reload          # after editing the .service
systemctl --user restart media-server   # after editing the .py
systemctl --user status media-server
journalctl --user -u media-server -f    # logs
```

To deploy a change from this repo:

```sh
scp homelab/media-server.py      irrssue@homelab:~/.local/bin/media-server.py
scp homelab/media-server.service irrssue@homelab:~/.config/systemd/user/media-server.service
ssh irrssue@homelab 'systemctl --user daemon-reload && systemctl --user restart media-server'
```

## Secrets (NOT in this repo)
- **Upload token**: `~/.media-upload-token` on the box. The server reads it at startup;
  uploads require it via the `X-Upload-Token` header. Never commit this.
- **Cloudflare tunnel credentials**: `~/.cloudflared/<tunnel-id>.json` (root). Not here.

## Limits / behavior
- Max 500 MB per file.
- Allowed types: `.jpg .jpeg .png .webp .gif .avif .mp4 .webm .mov .m4v`.
- Filenames are sanitized; collisions get a random suffix instead of clobbering.

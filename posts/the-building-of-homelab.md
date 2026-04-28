---
title: "The Building of Homelab"
date: "Apr 28, 2026"
tag: "homelab"
summary: ""
cover: ""
draft: false
---

# I Replaced Google Photos, Google Drive, and Netflix With a $7 Cable and an Old Laptop

> Total recurring cost: **$10.46/year**. That's a domain. Everything else is free, open-source, and running on a laptop that was about to be donated.

## Why I built this

I shoot a lot of footage. My Sony ZV-E10 fills SD cards faster than I can name folders, and at some point I realized my entire creative life had quietly migrated into Google's pricing tiers. Google Photos was nibbling at my wallet, Google Drive was about to start charging me for the privilege of holding files I'd already paid for once, and the only reason I tolerated Netflix was inertia.

So I asked myself a simple question: **what if I just hosted all of it myself?**

I had:

- An old laptop running Ubuntu Server
- A 2TB external SSD full of footage from Vietnam, San Francisco, ZV-E10 b-roll, and projects
- A vague idea that Tailscale and Cloudflare existed
- Zero patience for monthly subscriptions

Two weeks, three near-disasters, and one $7 Ethernet cable later, I had a fully working personal cloud at `irrssue.com`. This is the long story of how that happened, what I broke, what I learned, and what I'd do differently.

---

## The architecture, at a glance

Before we dive in, here's the shape of the thing:

```
                    Internet
                       │
                       ▼
              ┌──────────────────┐
              │  Cloudflare DNS  │   irrssue.com → tunnel UUID
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │ Cloudflare Tunnel│   (cloudflared, encrypted, no port forwarding)
              │   (HTTP/2 over   │
              │      QUIC)       │
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │  Ubuntu Server   │
              │   (homelab)      │
              ├──────────────────┤
              │ Docker           │
              │  ├─ Immich       │ → photos.irrssue.com  :2283
              │  ├─ Nextcloud    │ → drive.irrssue.com   :8080
              │  └─ Jellyfin     │ → tv.irrssue.com      :8096
              ├──────────────────┤
              │ /mnt/storage     │ → 2TB exFAT SSD (read-only into containers)
              └──────────────────┘
                       │
                       └─── Tailscale overlay (private mesh)
                              ├─ MacBook Air M1
                              ├─ iPhone 15 Pro
                              └─ Windows laptop (gaming machine)
```

The idea: **public traffic goes through Cloudflare Tunnel**, **private/heavy traffic goes through Tailscale**, and the laptop never has to expose a single port to the open internet. No port forwarding. No router config. No dynamic DNS. No static IP from my ISP. Just two encrypted tunnels meeting in the middle.

That last sentence took me a week to actually believe. Bear with me — it gets there.

---

## Phase 1 — Planning (and the first identity crisis)

The first decision was philosophical: **public or private?**

I kept flipping between two options:

1. **Tailscale only.** A private mesh VPN. Free forever. No domain needed. Devices on my Tailnet can hit the homelab at `100.100.200.29` like it's on the same LAN. Anyone not on my Tailnet sees nothing.
2. **Cloudflare Tunnel.** Real public URLs like `photos.irrssue.com`. Anyone can visit. Requires a domain.

The reasonable answer is **both**, which is what I ended up doing — but it took me a minute to get there. Tailscale is the daily driver because it's faster and there are no edge timeouts. Cloudflare Tunnel is for when I want to send a friend a link without making them install a VPN client.

Then there was the domain. I already owned `irrssue` as a brand — YouTube channel, GitHub, a portfolio at `irrssue.github.io`. So I bought `irrssue.com` through **Cloudflare Registrar for $10.46/year**. Cloudflare sells domains at cost with no markup, which is wild — most registrars mark up `.com` registrations 3-5x.

Quick aside: the checkout asked me for a VAT number. If you're a US individual, you skip that field. I almost typed in my SSN, which is the kind of decision-making that produces blog posts about homelabs.

I also pointed `irrssue.com` at my existing GitHub Pages portfolio. That meant:

- `irrssue.com` → portfolio (existing)
- `photos.irrssue.com` → Immich (planned)
- `drive.irrssue.com` → Nextcloud (planned)
- `tv.irrssue.com` → Jellyfin (planned)

Subdomains are free once you own the apex. I was already getting four URLs out of one $10.46 charge.

**Lesson #1:** Buy the domain even if you "don't need it yet." It's the cheapest piece of infrastructure you'll ever own.

---

## Phase 2 — The lid that wouldn't shut up

Before any of the cool stuff, there was a stupid hardware problem: this is a *laptop*. When you close a laptop, it goes to sleep. When it goes to sleep, your homelab dies.

The fix is a one-time edit to `systemd-logind`:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
sudo nano /etc/systemd/logind.conf
```

In that file, set:

```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

Then:

```bash
sudo systemctl restart systemd-logind
```

Now I can close the lid, shove the laptop on a shelf, and treat it as a headless server. This is so banal that nobody mentions it in the big homelab YouTube videos, and yet it's the difference between a working server and a $0 brick.

**Lesson #2:** Headless laptops need an explicit "ignore lid" config. The default behavior will quietly nuke your uptime.

---

## Phase 3 — Mounting the 2TB drive (and meeting exFAT)

The 2TB drive is where this whole project lives or dies. Two terabytes of ZV-E10 footage, family photos, project files, archived YouTube source material. I needed the server to mount it on boot, every time, no exceptions.

### Step 1 — find the drive

```bash
lsblk -f
```

There it was: `/dev/sdb1`, formatted as **exFAT**, labeled `"SSD"`, UUID `B2CA-AD86`.

I'd formatted it exFAT years ago because I needed it to work on both Mac and Windows. That decision is going to come back and bite me in about ten minutes — keep that filed away.

### Step 2 — install exFAT support

```bash
sudo apt install exfat-fuse exfat-utils -y
```

Ubuntu Server doesn't ship with exFAT support out of the box.

### Step 3 — mount it

```bash
sudo mkdir /mnt/storage
sudo mount /dev/sdb1 /mnt/storage
ls /mnt/storage
```

And there it all was — `Vietnam_2024/`, `SF_trip/`, `ZVE10_BROLL/`, every folder, every file, exactly as I'd left them. Mounting doesn't touch the data. (I asked Claude this three times. I'm a CS student. The fear is real.)

### Step 4 — make it permanent

A manual mount disappears on reboot. For permanent mounting, you add a line to `/etc/fstab`:

```fstab
UUID=B2CA-AD86 /mnt/storage exfat defaults,uid=1000,gid=1000,nofail 0 0
```

The MVP of this line is **`nofail`**. It tells systemd: "if this drive isn't plugged in at boot, don't panic, just keep going." Without it, your server refuses to boot whenever the drive is unplugged, which means a cable bump can soft-brick the entire homelab. With it, the worst case is your services come up without storage and complain politely in the logs.

```bash
sudo systemctl daemon-reload
sudo umount /mnt/storage
sudo mount -a
```

The `daemon-reload` cleared a systemd warning about fstab being modified. The `umount` + `mount -a` cycle is how you test that the fstab entry actually works without rebooting — if `mount -a` succeeds and your files come back, you're good.

**Lesson #3:** Always add `nofail` to fstab entries for removable drives. The five extra characters will save you a panicked recovery boot at 2am.

---

## Phase 4 — Immich, and the exFAT trap

Immich is the headline act. It's an open-source Google Photos clone with a beautiful UI, a real mobile app, facial recognition, map view, RAW support, and CLIP-based smart search. It's the closest thing to a drop-in Google Photos replacement that exists.

I created `~/docker/immich/`, downloaded the official `docker-compose.yml` and `.env` from the Immich release page, and made my first mistake.

### The mistake

The `.env` has one critical variable: `UPLOAD_LOCATION`. This is where Immich writes everything — uploads, thumbnails, metadata, the whole library. My instinct was to point it at the big drive:

```env
UPLOAD_LOCATION=/mnt/storage/immich-uploads
```

I ran `docker compose up -d`. The container immediately died with:

```
chown: changing ownership of '/usr/src/app/upload': Operation not permitted
```

### Why it failed

**exFAT does not support Linux file permissions.** It's a FAT-derived filesystem designed for cross-platform USB sticks. There's no concept of "this file is owned by user 1000, mode 0644." Immich's container starts up by running `chown` on its upload directory to make sure it has the right ownership, and on exFAT, `chown` is a hard no. The container can read files, but it cannot stamp permissions on them, so it crashes before it can even get to "hello world."

This is the cost of having formatted the drive exFAT five years ago for cross-platform compatibility. I now had two choices:

1. **Reformat the drive to ext4.** Cleanest fix. But that means moving 1+ TB of footage somewhere else first, reformatting, copying it back. I didn't have the spare storage to do that safely.
2. **Use the drive as a read-only library and store Immich's writable data on the OS drive.**

I went with option 2.

### The fix

I changed `UPLOAD_LOCATION` to a local path on the OS drive (which is ext4 and supports permissions just fine):

```env
UPLOAD_LOCATION=./library
```

This puts thumbnails, metadata, and any new uploads on the laptop's internal SSD.

Then I added the 2TB drive as a **read-only volume** in `docker-compose.yml`:

```yaml
services:
  immich-server:
    volumes:
      - ${UPLOAD_LOCATION}:/data
      - /etc/localtime:/etc/localtime:ro
      - /mnt/storage:/mnt/storage:ro    # ← the magic line
```

That `:ro` at the end is the entire workaround. Immich can read everything on the drive and serve it to the browser, but it can never try to write to it, so the chown problem evaporates.

Then in the Immich UI, I added `/mnt/storage` as an **External Library**. Immich rescanned, indexed, and pulled in everything I'd shot in the last decade. New uploads still work — they just land on the OS drive instead.

### Boot it up

```bash
docker compose up -d
```

Four containers came up:

```
✔ Container immich_redis            Started
✔ Container immich_postgres         Started
✔ Container immich_machine_learning Started
✔ Container immich_server           Started
```

I opened `http://100.100.200.29:2283` over Tailscale on my MacBook, walked through onboarding (turned off Google Cast and Storage Template — not needed), created the admin account, and was inside.

**Lesson #4:** exFAT and Docker do not mix. Either reformat to ext4, or use the read-only-library pattern. The read-only pattern is genuinely a clean way to mix old data with new uploads, and I now think it's the better default for anyone with a drive full of pre-existing content.

---

## Phase 5 — Cloudflare Tunnel, and the great config-file split

This was the hardest part to get right, not because it's technically complex but because the conceptual model isn't obvious until you've made every wrong assumption first.

### What a Cloudflare Tunnel actually is

You do not "expose ports" with a tunnel. The tunnel is an outbound, persistent connection from your server to Cloudflare's edge. Your server says, "Hi, I'm tunnel UUID `0a8aaea3-...`, I'll be holding this connection open." Cloudflare receives a request for `photos.irrssue.com`, looks up which tunnel UUID owns that hostname, and sends the request *down* the existing connection. Your server responds back up the same tunnel.

This means:

- **No inbound ports open on your router.** Goodbye port forwarding.
- **No public IP needed.** Your ISP can put you behind CGNAT and the tunnel still works.
- **TLS terminates at Cloudflare's edge.** You don't need a Let's Encrypt cert.
- **DDoS protection comes free.** You're behind Cloudflare's network.

### Setup

```bash
# 1. Install
# (download the .deb from https://github.com/cloudflare/cloudflared/releases)
sudo dpkg -i cloudflared-linux-amd64.deb

# 2. Authenticate (opens a browser to pick which Cloudflare zone)
cloudflared tunnel login
# → saves cert to ~/.cloudflared/cert.pem

# 3. Create the tunnel
cloudflared tunnel create homelab
# → returns a UUID like 0a8aaea3-74e6-4be1-be23-20eb4fa0b6da
# → saves credentials JSON to ~/.cloudflared/<UUID>.json

# 4. Write the config
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: 0a8aaea3-74e6-4be1-be23-20eb4fa0b6da
credentials-file: /home/irrssue/.cloudflared/0a8aaea3-74e6-4be1-be23-20eb4fa0b6da.json

ingress:
  - hostname: photos.irrssue.com
    service: http://127.0.0.1:2283
  - hostname: drive.irrssue.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

```bash
# 5. Map DNS
cloudflared tunnel route dns homelab photos.irrssue.com
cloudflared tunnel route dns homelab drive.irrssue.com
```

That last command creates a CNAME record on Cloudflare pointing the subdomain at the tunnel UUID. (One of mine timed out due to network instability and I had to add the CNAME manually in the dashboard — a foreshadowing of what was about to come.)

### Two mistakes that cost me an hour each

**Mistake 1: I left a placeholder in the config.** The first version of my config had `credentials-file: /home/irrssue/.cloudflared/YOUR-TUNNEL-ID.json` because I'd copy-pasted from a template and forgotten to edit. The tunnel started but couldn't authenticate. The error message wasn't great. I noticed it about thirty minutes in.

**Mistake 2: I used `localhost` instead of `127.0.0.1`.** In some contexts these resolve identically. Inside cloudflared, `localhost` was getting resolved in a way that didn't reach the Docker-published ports. Switching to the explicit IPv4 loopback fixed it instantly.

### The systemd config-file split (the one that bit everyone twice)

I ran `sudo cloudflared service install` to make the tunnel auto-start on boot. The first install failed with "config could not be found." Apparently the service installer doesn't always pick up `~/.cloudflared/config.yml` automatically. I had to point at it explicitly:

```bash
sudo cloudflared --config /home/irrssue/.cloudflared/config.yml service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

This is where the trap is.

The service installer **copies** the config to `/etc/cloudflared/config.yml` and reads from there. The original at `~/.cloudflared/config.yml` is now just a leftover. If you edit `~/.cloudflared/config.yml` after this point, **the running service will not pick up your changes.** You will edit the wrong file. You will restart the service. Nothing will change. You will lose a full evening to this.

I lost a full evening to this.

The correct mental model: **`/etc/cloudflared/config.yml` is the only file the service reads.** Always edit that one. The user-level copy is a vestigial artifact from setup.

```bash
sudo nano /etc/cloudflared/config.yml
sudo systemctl restart cloudflared
sudo systemctl status cloudflared
```

**Lesson #5:** When a tool has both a user-level config and a service config, find out which one is actually being read and only edit that one. Symlink the other if you need to keep them visually identical.

---

## Phase 6 — Nextcloud (which was almost boring, in a good way)

After the Immich + Cloudflare adventure, Nextcloud was a relief. I made `~/docker/nextcloud/`, dropped in a compose file with two services:

```yaml
services:
  nextcloud:
    image: nextcloud:latest
    container_name: nextcloud
    restart: always
    ports:
      - "8080:80"
    volumes:
      - nextcloud_data:/var/www/html
      - /mnt/storage:/mnt/storage      # for External Storage
    environment:
      - NEXTCLOUD_TRUSTED_DOMAINS=drive.irrssue.com localhost
    depends_on:
      - db

  db:
    image: mariadb:10.11
    container_name: nextcloud_db
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=<your-root-password>
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=<your-app-password>
    volumes:
      - db_data:/var/lib/mysql

volumes:
  nextcloud_data:
  db_data:
```

`docker compose up -d`, two containers came up clean, `drive.irrssue.com` started loading the setup wizard once I fixed the tunnel config. The Nextcloud setup (admin user, database connection) was straightforward web-form stuff.

The one thing worth calling out: I added `/mnt/storage` as an **External Storage** in Nextcloud admin settings, same trick as Immich's external library. Now my entire footage archive is browsable through both the Immich photo UI *and* the Nextcloud file manager. Different views, same data.

I also later installed **Nextcloud Talk** for video calls (an open-source Zoom replacement), which is a few clicks in Apps once Nextcloud is up. For calls outside my home network you need a TURN server (`coturn`) — but for Tailscale-to-Tailscale calls the routing handles itself.

---

## Phase 7 — The first real disaster: the 524 timeouts

This is the part where I learned something deep.

Immich came up. I uploaded a few test photos, they appeared. I added the 2TB external library, and Immich started indexing.

A 2TB photo/video library is not a small ask. Immich was doing all of these jobs simultaneously across thousands of files:

- Thumbnail generation
- EXIF metadata extraction
- **Facial recognition** (CNN-based, needs serious compute)
- **CLIP embeddings for smart search** (also CNN-based, also serious)
- **Duplicate detection**

The server has 4 CPU cores and 3.6GB of RAM. It is a six-year-old laptop. This was not a fair fight.

I tried loading `photos.irrssue.com`. The Immich logo appeared. Then nothing. After 100 seconds, Cloudflare returned a **524 timeout error**.

### The diagnostic process

I started with `docker stats`:

```
CONTAINER                   CPU %    MEM USAGE / LIMIT
immich_server               193%     905MB / 3.598GB
immich_machine_learning     332%     726MB / 3.598GB
immich_postgres             45%      280MB
immich_redis                3%       40MB
```

That's the entire CPU pegged, with the ML container alone consuming **332% CPU** (multiple cores at 100%) doing tasks I literally don't need. I'm not trying to CLIP-search "person on beach in 2019" across a video archive — I want to *look at my footage*.

Local response was fine:

```bash
$ curl -I http://localhost:2283
HTTP/1.1 200 OK
```

200 OK. Immediate. So the server itself works. The problem is that under that load, the API specifically takes too long to respond, and Cloudflare's free-tier edge has a hard 100-second timeout that I cannot increase, ever, no matter what.

That last part is the lesson. **Cloudflare's free-tier 100-second timeout is a structural ceiling.** No `originRequest: connectTimeout: 120s` config in the world will fix it, because the timeout is on Cloudflare's side, not the tunnel's side. I added `connectTimeout: 120s` and `noTLSVerify: true` to my config anyway because they help with other edge cases, but they don't move the 100s wall.

### The fix: kill the ML container

```bash
docker stop immich_machine_learning
```

CPU usage on `immich_server` dropped from 193% to **7.65%**. The site loaded instantly through Tailscale. Cloudflare still threw 502s sporadically (foreshadowing!), but Immich itself was finally responsive.

To make this permanent — so the ML container doesn't come back up next time I run `docker compose up -d` — I scaled it to zero:

```bash
docker compose up -d --scale immich-machine-learning=0
```

You can also comment out the ML service entirely in your compose file. I went with `--scale 0` because it leaves the door open to bring it back later when I have GPU acceleration on the new server.

### The Tailscale + Cloudflare split

The bigger architectural insight: **don't treat Cloudflare Tunnel as your daily driver.** It's free, fast, and convenient for browsing, but it's not built for heavy uploads or long-running ML jobs. The 100-second timeout is the killer.

The right pattern, which I now follow religiously:

| Path                  | Use for                                      |
|-----------------------|----------------------------------------------|
| **Tailscale**         | Photo uploads from phone, mobile sync, admin work, anything that takes more than ~30s |
| **Cloudflare Tunnel** | Quick browsing, sharing a link with a friend, casual viewing |

Both paths point at the same Immich instance. You just choose which one based on what you're doing.

**Lesson #6:** Cloudflare's free tier is amazing for what it gives you, but the 100-second timeout is non-negotiable. Architect around it. Don't fight it.

**Lesson #7:** Immich's ML features are a resource trap on constrained hardware. If you don't need facial recognition and smart search, turn them off — your server will run 10x faster.

---

## Phase 8 — The second real disaster: the WiFi keeps dying

I thought I'd solved everything. I'd killed the ML container. The server was responsive. Local curl returned in 0.11s. I went to bed.

The next morning, `photos.irrssue.com` was throwing **502 Bad Gateway** errors. Not 524. *502*. Different beast.

A 524 means: "Cloudflare reached your server, but it took too long to respond."
A 502 means: "Cloudflare couldn't reach your server *at all*."

The tunnel was registering as up. Immich was healthy locally. But traffic wasn't flowing.

### The smoking gun: cloudflared logs

```bash
sudo journalctl -u cloudflared --since "10 min ago" --no-pager
```

This was the moment everything clicked. The logs told a 45-second horror story, every time:

```
16:48:03  INF  timeout: no recent network activity        connIndex=0
16:48:03  INF  failed to accept QUIC stream               connIndex=0,1,2,3
16:48:06  WRN  retrying connection                         error=sendmsg: network is unreachable
16:48:07  WRN  retrying connection                         error=sendmsg: network is unreachable
16:48:15  ERR  failed to dial to edge                      error=network is unreachable
16:48:20  ERR  lookup region1.v2.argotunnel.com: i/o timeout
16:48:28  INF  Registered tunnel connection                connIndex=0
16:48:47  INF  Registered tunnel connection                connIndex=3   ← all 4 reconnected
```

For 45 seconds, the server had **no internet**. DNS resolution failed. All four tunnel connections died. Then everything came back. This was happening every few minutes, all night.

### The interface was `wlp2s0`

WiFi. The server was connected to my home network over WiFi, and WiFi cannot do "always-on for a server" reliably. There are too many things that can interrupt it:

- Power management putting the WiFi card into low-power mode under low activity
- Microwave / Bluetooth interference
- Heavy disk I/O competing with WiFi driver processing (Immich's indexing was a perfect storm here)
- Plain old signal flakiness

QUIC (the default cloudflared protocol, UDP-based) is *especially* sensitive to this because UDP doesn't retransmit lost packets the way TCP does.

### The interim mitigation: switch to HTTP/2

I added one line to `/etc/cloudflared/config.yml`:

```yaml
tunnel: 0a8aaea3-74e6-4be1-be23-20eb4fa0b6da
credentials-file: /home/irrssue/.cloudflared/0a8aaea3-74e6-4be1-be23-20eb4fa0b6da.json
protocol: http2          # ← this line

ingress:
  - hostname: photos.irrssue.com
    service: http://127.0.0.1:2283
    originRequest:
      noTLSVerify: true
      connectTimeout: 120s
  ...
```

HTTP/2 runs over TCP, which retransmits dropped packets and reconnects faster after interruption. It made the outages shorter and less frequent. It did not make them go away.

### The actual fix: a $7 Ethernet cable

Cat 8, 6 feet, ordered from Amazon for about $7. I'm now waiting on it as I write this. The plan once it arrives:

```bash
# After plugging in the Ethernet
ip a                                       # confirm new interface (eth0 or enp...)
sudo nmcli device disconnect wlp2s0       # force all traffic onto the wired connection
sudo systemctl restart cloudflared
```

That's it. The single most important line of code I'll write for this homelab is the one that says "stop using WiFi."

**Lesson #8:** WiFi for an always-on server is a non-starter. It's not a "nice to have wired" — it's a fundamental architectural requirement. The cheapest Cat 5e cable beats the fastest WiFi for reliability.

---

## Phase 9 — Jellyfin (the easy win)

After Immich and Nextcloud, Jellyfin felt almost suspiciously smooth. It's a self-hosted media server (think Plex, but fully open-source and free of the gradual feature-paywalling that has consumed Plex). It runs in a single Docker container, reads from `/mnt/storage`, and gives me a Netflix-like UI for any video library I throw at it.

I added a third subdomain — `tv.irrssue.com` → Jellyfin on port 8096 — and added the corresponding ingress rule to `/etc/cloudflared/config.yml`:

```yaml
- hostname: tv.irrssue.com
  service: http://127.0.0.1:8096
```

The cool part: Jellyfin reads the same `/mnt/storage` mount as Immich and Nextcloud. So one drive serves three different views of the same content — gallery, file manager, video streaming UI. That's the moment the homelab really starts to feel like a *platform* and not just a collection of services.

(I'll be honest, Jellyfin came together so fast I forgot to document the port until weeks later when I was prepping for a server migration. Always document your ports immediately. The next person to log in is future-you.)

---

## What's next: the Acer migration

The current homelab is on an old laptop with 4 cores and 3.6GB of RAM. It works, but Immich's ML container has been disabled because that hardware can't keep up.

The next phase is migrating the entire stack to an **Acer Nitro AN715-51** that I've barely touched since I stopped using it for gaming:

- **CPU:** Intel Core i7-9750H (6 cores / 12 threads)
- **RAM:** 16GB
- **GPU:** NVIDIA GeForce GTX 1660 Ti (6GB VRAM) ← the headline feature
- **Storage:** 477GB SSD
- **Currently:** Windows 10
- **Soon:** Ubuntu Server

The 1660 Ti is the unlock. With NVIDIA Container Toolkit and Immich's GPU acceleration, I can re-enable facial recognition and CLIP smart search and have them actually finish in a reasonable time. The 4-core laptop was choking on what's basically an entry-level ML workload for a real GPU.

The migration plan:

1. Back up Docker volumes from the old server (`docker run --rm -v immich_postgres:/data -v $(pwd):/backup ubuntu tar czf /backup/immich-pg.tgz /data` style)
2. Wipe Windows, install Ubuntu Server on the Acer
3. Install Docker, Tailscale, cloudflared, NVIDIA drivers, NVIDIA Container Toolkit
4. Restore Docker volumes
5. Move the 2TB drive over (same UUID, same fstab line — it just works)
6. Re-auth Tailscale on the new machine (the homelab Tailscale IP will change — `100.100.200.29` becomes whatever the new device gets)
7. Copy `/etc/cloudflared/config.yml` and the credentials JSON over (same tunnel UUID, no DNS changes needed)
8. Re-enable Immich ML with GPU passthrough and watch the indexer fly

Then the old laptop becomes a backup target or gets repurposed. Possibly as a Pi-hole. Possibly as a second redundant server in a tiny home cluster. Probably as a paperweight for a few months while I do other things.

---

## Total damage report

Here's the full damage. Everything I spent money on, everything I'd do differently, everything I'm proud of.

### Money

| Item                       | Cost     | Recurring  |
|----------------------------|----------|------------|
| `irrssue.com` domain       | $10.46   | yearly     |
| Cat 8 Ethernet cable, 6ft  | ~$7.00   | one-time   |
| Tailscale                  | $0       | —          |
| Cloudflare Tunnel          | $0       | —          |
| Immich                     | $0       | —          |
| Nextcloud                  | $0       | —          |
| Jellyfin                   | $0       | —          |
| Docker                     | $0       | —          |

**Total recurring: $10.46/year. One-time: ~$7. Hardware: the old laptop I already owned.**

For comparison, Google One at the 2TB tier is $9.99/month — about $120/year. The homelab pays for itself in five weeks. After that, it's pure margin.

### Things that worked first try

- Tailscale install on all three devices. (Genuinely the best onboarding flow I've used for any infrastructure tool, ever.)
- Mounting the 2TB drive once I knew the UUID and `nofail`.
- Nextcloud's docker-compose. It just worked.
- Jellyfin. Came up, scanned, played video.

### Things that did not work first try

- Pointing Immich at exFAT (`chown` fails — use the read-only library pattern instead)
- The `localhost` vs `127.0.0.1` thing in cloudflared (use the explicit IP)
- Editing `~/.cloudflared/config.yml` after service install (edit `/etc/cloudflared/config.yml` instead)
- Trying to fix the 524 with config tweaks (it's a Cloudflare-side limit, not configurable)
- Running a server on WiFi (don't)

### The principles I'd hand to past-me

1. **Always add `nofail` to fstab entries for removable drives.**
2. **exFAT is for sneakernet, ext4 is for servers.** If you can reformat, do.
3. **Read-only volume mounts are an underrated workaround** when you can't reformat.
4. **Cloudflare Tunnel's free-tier 100s timeout is a structural fact**, not a config knob. Architect around it.
5. **Tailscale for heavy/private use, Cloudflare Tunnel for light/public use.** They're not competitors, they're complements.
6. **Edit `/etc/cloudflared/config.yml`, never `~/.cloudflared/config.yml`** once the service is installed.
7. **WiFi is not a server-grade transport.** A $7 cable beats a $300 router for this use case.
8. **Immich's ML features will eat your CPU for breakfast.** Disable them unless you have GPU acceleration.
9. **Document your ports the moment you set up the service.** Future-you is not going to remember.
10. **Kill the lid switch on day zero.** `systemd-logind` takes one minute to configure and saves you an entire category of bug.

---

## Why this matters more than the dollars

Honestly, the $120/year I'm not paying Google is the smallest part of why I did this.

The bigger thing is that I now actually *understand* my infrastructure. I can SSH into my own server and read my own logs and edit my own configs. When something breaks, I fix it. When I want a new service, I write a docker-compose file and turn it on. There's no support ticket, no pricing page, no policy update I have to read every six months to find out what just got worse.

A lot of people in tech talk about "owning your stack." For me, this homelab is the smallest, scrappiest, most personal version of that idea. It's a single laptop in a corner of my apartment, holding two terabytes of footage and serving them to my MacBook and my iPhone over a private mesh network and a public tunnel, with no monthly fee and no terms-of-service page anyone could ever change on me.

I'm a CS student trying to build a software company, and eventually a robotics company. I'm going to need to build a lot of bigger systems than this one. But every concept in here — Docker, reverse tunnels, mesh VPNs, mounting filesystems, debugging from logs, working around platform limits — is the foundation of all of it.

You can't skip the small homelab. You build the small one to learn how to build the big one.

---

## Try it yourself

The full repo (sanitized configs, docker-compose files, the Cloudflare tunnel template, the fstab example, and step-by-step docs) is on GitHub:

**[github.com/irrssue/homelab](https://github.com/irrssue/homelab)**

Star it if you find it useful. Fork it if you want to build your own. Open an issue if I missed something or got something wrong — I'll be migrating to the Acer over the next couple weeks and updating as I go.

If you want to follow along with the migration, my YouTube is **[youtube.com/@irrssue](https://youtube.com/@irrssue)** — I'll be filming the Ubuntu install on the Acer and the GPU-accelerated Immich ML setup. It's gonna be fun.

Until then: shut your laptop lid, listen for the fans, and remember to add `nofail`.

— Liam

*irrssue.com — built on a laptop that was about to be donated, a 2TB drive that almost ended up in a drawer, and a Cat 8 Ethernet cable that I bought from amazon*
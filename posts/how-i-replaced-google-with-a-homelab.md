---
title: "How I Replaced Google With a Homelab"
date: "Apr 13, 2026"
tag: "homelab"
summary: ""
cover: ""
draft: false
---

# How I Replaced Google With a Homelab

*April 2026*

I pay Google roughly nothing for Photos and Drive. Most people do. And yet I spent a weekend replacing both of them with software I run on my own server. Why would anyone do this?

The short answer is that I wanted to. The longer answer is that I've been mass of thinking about what it means to actually *own* your data — your photos, your files, your memories — versus renting space on someone else's computer. Google Photos is free because you are the product. Your 2TB of vacation footage and selfies live on Google's infrastructure, indexed by Google's AI, subject to Google's terms. They could change the deal tomorrow. They've done it before.

So I decided to build something. And it turned out to be surprisingly doable.
*You don't need a server rack. Any old machine will do.*

---

## The Idea

The plan was simple: take a 2TB external hard drive, plug it into a spare machine running Ubuntu Server, and make its contents accessible from anywhere in the world through a web browser. Two open-source apps would handle the heavy lifting — [Immich](https://immich.app) for photos (a near-perfect Google Photos clone) and [Nextcloud](https://nextcloud.com) for files (a Google Drive replacement). Custom subdomains on my personal domain would point to each service, so I could pull up my photos from my phone at a coffee shop the same way I'd open Google Photos.

Total recurring cost: $10.46 a year for the domain name. Everything else is free.

---

## Mounting the Drive

The first real task was getting the server to see the external drive. I plugged in a 2TB drive formatted as exFAT and ran `lsblk -f` to find it. It showed up immediately. A quick install of `exfat-fuse` and `exfat-utils`, a mount point at `/mnt/storage`, and I could see everything — footage from trips, camera shoots, years of files.

To make the mount permanent (surviving reboots), I added an entry to `/etc/fstab` with the drive's UUID and the `nofail` flag. That last part is important: `nofail` means the server boots normally even if the drive isn't plugged in. Without it, an unplugged drive bricks your boot sequence. A small thing, but exactly the kind of small thing that eats an hour if you don't know about it.

---

## Setting Up Immich

Immich is the star of this project. It's an open-source, self-hosted Google Photos alternative, and it's *good*. It does facial recognition, smart search, EXIF parsing, timeline views, maps — the whole thing. It runs as a set of Docker containers: the main server, a machine learning service, a Postgres database, and a Redis cache.

*Immich's web interface feels remarkably close to Google Photos.*

Setting it up was mostly smooth, with one gotcha. My first instinct was to point Immich's upload directory straight at the external drive. This immediately failed. The error said "chown operation not permitted," which is Linux's way of telling you that exFAT doesn't support file permissions. Docker needs to set ownership on its data directories, and exFAT just can't do that.

The fix was to split things up: Immich's working directory (where it writes thumbnails, databases, etc.) stays on the server's main ext4 drive, and the 2TB external gets mounted as a read-only volume. Then you add it as an "External Library" in Immich's admin settings. This way Immich can *read* all your existing footage without needing to *write* to the exFAT filesystem. Clean separation.

Once that was done and the containers were running, Immich started its initial scan — generating thumbnails, reading metadata, running facial recognition across every photo and video on the drive. On 2TB of media, this takes hours. The machine learning container maxes out the CPU, the server gets sluggish, Docker reports the Immich container as "unhealthy." This is all normal. It calms down once indexing finishes.

---

## Making It Accessible From Anywhere

A server sitting on your home network is useful, but only if you're home. I needed remote access. There are two good approaches, and I ended up using both.

**Tailscale** is a mesh VPN. You install it on your server and on your phone and laptop, and they can all talk to each other over encrypted connections as if they were on the same local network. It's completely free for personal use, and it just works. This gives you private, device-to-device access — great for when you want to manage things directly, but it requires the Tailscale app on every device.

**Cloudflare Tunnel** is the public-facing option. It creates an encrypted tunnel from your server to Cloudflare's network, and Cloudflare handles the DNS routing. You set up subdomains — say, `photos.yourdomain.com` and `drive.yourdomain.com` — and Cloudflare routes traffic through the tunnel to the right service on your server. No port forwarding, no exposing your home IP. The tunnel client (`cloudflared`) runs as a systemd service, so it survives reboots.

*The basic architecture: Internet → Cloudflare → Tunnel → Your Server.*

Setting up the tunnel had its own gotchas. The main one: `cloudflared` keeps two config files. One lives in your home directory (created during setup), and one lives in `/etc/cloudflared/` (created when you install it as a system service). The running service reads from `/etc/cloudflared/`. If you edit the wrong file, nothing changes and you spend twenty minutes wondering why. Always edit the system config.

Another issue: my server was on WiFi. Under normal load this is fine. Under the heavy load of Immich's initial indexing, the WiFi connection started dropping entirely. The `cloudflared` logs filled up with "network is unreachable" errors. The fix is obvious — use an Ethernet cable — but if you're setting this up, just know that WiFi and heavy I/O don't mix well on a homelab.

---

## Nextcloud

Nextcloud is the Google Drive half of this project. The setup is simpler than Immich: two Docker containers (Nextcloud itself and a MariaDB database), a compose file, and you're running. Mount the same 2TB drive into the Nextcloud container and you can browse your files from a web browser.

*Nextcloud gives you a familiar file-browser experience, accessible from anywhere.*

I haven't fully set up Nextcloud's external storage integration yet — that's next on the list — but the core is working. Combined with the Cloudflare Tunnel, it'll be accessible at a custom subdomain just like Immich.

---

## What I Learned

A few things stood out.

**ExFAT is a headache on Linux.** It's the universal format that works on Mac, Windows, and Linux, which is why most external drives ship with it. But it doesn't support Unix file permissions, which means any Linux application that expects to set ownership on files (which is most of them) will choke. The workaround is always the same: use exFAT drives as read-only volumes and keep your application data on a native Linux filesystem like ext4.

**Docker makes everything easier and harder.** Easier because you can spin up complex multi-service applications with a single `docker compose up -d`. Harder because when something goes wrong, you're debugging across containers, volumes, networks, and environment files all at once. The abstraction is great until it isn't.

**Cloudflare's free tier is absurdly generous.** A domain costs about $10/year through their registrar. The tunnel service, DNS, and CDN are all free. For a personal project like this, you're getting enterprise-grade infrastructure for essentially nothing.

**The initial indexing is the worst part.** If you're throwing a large media library at Immich, expect the server to be miserable for a few hours. Timeouts, unhealthy containers, dropped connections. It all resolves once the scan finishes. Just be patient.

---

## The Architecture

Here's what the final setup looks like:

```
Internet
  └── Cloudflare DNS
        └── Cloudflare Tunnel (encrypted)
              └── Homelab Server (Ubuntu)
                    ├── Immich (photos.yourdomain.com)
                    │     ├── immich_server
                    │     ├── immich_machine_learning
                    │     ├── immich_postgres
                    │     └── immich_redis
                    ├── Nextcloud (drive.yourdomain.com)
                    │     ├── nextcloud
                    │     └── mariadb
                    └── /mnt/storage (2TB external drive)
```

Six Docker containers, one external drive, one tunnel, one domain. That's the whole thing.

---

## What's Next

There's still work to do. I need to finish configuring Nextcloud's external storage so it can browse the 2TB drive directly. I want to set up the Immich mobile app for automatic photo backup from my phone. Desktop and mobile sync clients for Nextcloud would make it a true Dropbox replacement. And I should probably set up automated database backups before I lose something I care about.

But the core is done. I have a self-hosted photo library and file manager, both accessible from anywhere, running on hardware I own, storing data on a drive I control. The total cost is a $10.46 domain renewal once a year. Everything else — Immich, Nextcloud, Docker, Tailscale, Cloudflare Tunnel — is free and open-source.

If you're the kind of person who's ever felt uneasy about handing all your photos and files to a company that makes money by knowing everything about you, this is a weekend project that actually solves the problem. The tools are mature enough now that you don't need to be a sysadmin to pull it off. You just need a spare machine, an external drive, and a free afternoon.

---

*If you found this useful or want to see more projects like this, I write about software, self-hosting, and building things at [irrssue.com](https://irrssue.com). You can also find me on [YouTube](https://youtube.com/@irrssue).*

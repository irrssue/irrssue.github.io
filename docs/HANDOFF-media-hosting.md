# Handoff: Media hosting for the Gems page

## Goal
On the Gems admin (`html/admin.html`), the user wants to **drag-and-drop a photo OR video**
and have it upload + auto-fill the media URL — no separate tab, no manual link pasting.
Uploaded media must then render on the public Gems page (`gems/index.html`), with **video
actually playing** in a `<video>` element.

## Current state (working, deployed)
Cloudinary unsigned upload widget is fully integrated and **functional**. Drag-drop works,
URL auto-fills, type (photo/video) auto-sets, video plays on the public page.

The ONE blocker that made the user want to switch: **Cloudinary free-tier unsigned uploads
cap each image at 10 MB** (video 100 MB). The user's camera JPGs are ~14.5 MB raw, so they
are rejected with `File size (14.57 MB) exceeds maximum allowed (10 MB)`.

### This is NOT a code bug — it is an account-tier limit.
It is fixable in ~30 seconds without touching code (see "Option 0" below). The integration
is otherwise complete and correct.

## Key facts learned (do not re-discover these)
- Site = static, GitHub Pages, vanilla HTML/CSS/JS, no build, no frameworks.
- The admin page already authenticates to GitHub via a Personal Access Token and commits
  `data/gems.json` directly through the GitHub Contents API. Media is NOT committed to the
  repo (binary commits bloat the repo + hit size caps) — media lives on an external host,
  only the URL is stored in `gems.json`. Keep this architecture.
- **Google Drive was rejected** as a host: it gives no clean direct media URL (share links
  are viewer pages, not raw files), it throttles/blocks hotlinks, it does not stream video
  for `<video>` embeds, and controlling it from the browser needs full OAuth. Worst option.
  Do not revisit Drive.
- **SRI + redirects gotcha (already fixed, don't regress):** the Cloudinary widget's rolling
  URL `widget.cloudinary.com/v2.0/global/all.js` 302/301-redirects to a versioned file, and
  browsers refuse to apply Subresource Integrity across a redirect (script silently blocked).
  The script tag now points at the final non-redirecting versioned URL
  `https://upload-widget.cloudinary.com/2.72.8/global/all.js` with a matching sha384. If you
  keep ANY redirect-based CDN script with SRI, you will hit this again.

## Cloudinary specifics (current credentials/config)
- Cloud name: `dzcir3j2u`
- Unsigned upload preset: `irrssue.com` (signing mode: Unsigned)
- Code anchors in `html/admin.html`:
  - line ~505: SRI-pinned `<script>` tag for the widget
  - line ~714: the upload button `onclick="openMediaUpload()"`
  - line ~1298: `CLOUDINARY_CLOUD` / `CLOUDINARY_PRESET` constants + `openMediaUpload()`
- Public render in `gems/index.html`: real `<video controls>` branch + `.media video` CSS;
  video poster is derived by swapping the extension for `.jpg` (Cloudinary auto-poster).

---

## Option 0 — Stay on Cloudinary, just fix the cap (RECOMMENDED, ~30s, no code)
The integration already works; the only issue is raw file size. Auto-shrink on upload:

Cloudinary dashboard → Settings → Upload presets → edit `irrssue.com` →
**Incoming Transformation** → set `width 2500, crop = limit, quality = auto`
(equivalent: `c_limit,w_2500,q_auto`) → Save.

Every upload is downscaled/compressed BEFORE the size check, so a 14.5 MB camera JPG lands
at ~2–4 MB, under the cap, with no visible quality loss for a web gallery. Retry the upload.

This is the lowest-effort path and keeps everything already built. Recommend trying this
before switching hosts, because **every free host has per-file limits** — switching trades
one cap for another plus a rewrite.

---

## If switching hosts anyway — ranked alternatives

### 1. Uploadcare — closest drop-in replacement
- Has a drag-drop upload **widget** very similar to Cloudinary's, so the admin UX stays the
  same and `openMediaUpload()` maps almost 1:1.
- Higher/configurable free limits; gives direct CDN URLs; handles images + video.
- Migration effort: LOW. Swap the widget script + the `createUploadWidget` call, keep the
  same "on success → fill `#gem-src`, set type, store URL in gems.json" flow.

### 2. Bunny.net — best if VIDEO matters most
- Bunny Storage + CDN for images; **Bunny Stream** for real video transcoding/streaming.
- No per-file cap; direct URLs; very cheap (~$0.01/GB, realistically ~$1/mo for this use).
- NOT free, and **no prebuilt drag-drop widget** — you build the upload UI against Bunny's
  HTTP API (PUT to storage zone, or Stream's tus upload). More code than Cloudinary.
- Migration effort: MEDIUM-HIGH (custom upload UI + progress + error handling).
- Security note: Bunny Storage uses an API/access key. It must NOT be embedded in the static
  admin page (it would be public). Either use a write-restricted key scoped to one storage
  zone and accept the exposure, or front uploads with a tiny serverless endpoint. This is the
  main reason Bunny is more work than Cloudinary's unsigned preset (which exposes no secret).

### 3. Cloudflare R2 — cheapest storage, most plumbing
- S3-compatible, 10 GB free, no egress fees, direct URLs.
- No upload widget and no video transcoding. Browser uploads need presigned URLs minted by a
  Cloudflare Worker (can't hold S3 creds in the static page). Video would be raw files (no
  adaptive streaming) — fine for short clips, not ideal for large video.
- Migration effort: HIGH (Worker for presigned URLs + custom upload UI).

## Decision guide
- Want it working today with least effort → **Option 0** (fix Cloudinary preset).
- Want to leave Cloudinary but keep the easy drag-drop UX → **Uploadcare**.
- Video is the priority and a tiny cost is fine → **Bunny.net**.
- Want cheapest storage and willing to run a Worker → **Cloudflare R2**.

## Hard constraints for whoever picks this up
- Static GitHub Pages site: any host secret embedded in `admin.html` is PUBLIC. Prefer hosts
  with unsigned/preset uploads (no secret) or front uploads with a serverless endpoint.
- Keep the architecture: media on external host, only the URL committed to `data/gems.json`.
- Public/outward email anywhere shipped = liam@irrssue.com (never the personal address).
- Project rule: commit + push after every change (`git add` / `git commit` / `git push origin main`).
- After any host swap, verify END-TO-END: drag-drop a photo AND a video in admin, confirm URL
  auto-fills + type auto-sets, save the gem, then confirm the public Gems page shows the photo
  and PLAYS the video.

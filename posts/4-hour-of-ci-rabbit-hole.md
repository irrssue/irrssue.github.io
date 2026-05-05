---
title: "4 hour of CI rabbit hole"
date: "May 5, 2026"
tag: "Web"
summary: ""
cover: ""
draft: false
---

It started small. I was scrolling my repo's git log and saw this:

```
auto: update NavBar.tsx
auto: update StoryList.tsx
auto: update NavBar.tsx
auto: update NavBar.tsx
```

A wall of identical, useless commit messages. My agent had been auto-committing my edits with whatever the laziest possible summary was, and `git log` had become a void. I wanted real messages — `feat(StoryList): paginate in batches of 30`, the kind of thing I could read in six months and actually understand.

Simple fix, right? Update `CLAUDE.md` with a strict commit message template. Done in five minutes.

Except I didn't stop there.

Somewhere in that five-minute fix I started thinking about the *deploy pipeline*. My homelab was running this Next.js app behind a Cloudflare tunnel, and I'd been deploying it by SSH-ing in and running `git pull && npm ci && npm run build && pm2 restart`. Boring. Manual. Surely I could automate it with GitHub Actions.

So I wrote a workflow. The CI runner needed to reach my homeserver, which lives on Tailscale, so I added the `tailscale/github-action`. Then OAuth instead of the deprecated authkey. Then `tag:ci`. Then `SSH_KNOWN_HOSTS` because strict host checking. Then a known-hosts mismatch because `ssh-keyscan` output didn't match my `SSH_HOST` secret. Then host-key copying problems because the terminal was wrapping the keys.

By the time I sat back and looked, I had:

- A broken workflow file
- A Tailscale OAuth client I didn't need
- Six new GitHub secrets
- A bunch of `fix(ci):` commits that were entirely about fixing CI, not the actual app
- And zero working deploys

So I gave up. Nuked the workflow. Just deleted `.github/workflows/deploy.yml` and pushed.

Then I went looking for a simpler path: cron polling. Server checks `origin/main` every 2 minutes, pulls + builds if there's a new commit. I started writing the script…

…and then ran `crontab -l`. There it was:

```
*/2 * * * * /bin/bash /home/irrssue/minimal-hackernews/scripts/deploy-hn.sh >> /home/irrssue/deploy-hn.log 2>&1
```

I had set this up weeks ago. Forgot about it. It had been quietly working the entire time. The reason the log went silent was that I'd been committing from the server itself — so by the time cron's `git fetch` ran, HEAD already matched origin, and there was nothing to pull.

The whole CI saga was solving a problem that didn't exist.

**The actual lesson:** before reaching for a new system, run `crontab -l`. Or `systemctl list-timers`. Or `ls ~/scripts/`. Half the time the thing you're about to build is already running on your own machine, doing exactly what you need, and the only reason it feels broken is that the trigger condition isn't being hit.

The commit message thing? Fixed in one CLAUDE.md edit. Took five minutes. Exactly like I thought at the start.
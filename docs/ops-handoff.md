# Ops handoff

Rolling handoff between the 5-hour maintenance sessions. Each session reads this
first and rewrites the "Current state" and "Log" sections last, then stops.

## Scope (defensive only)
- Keep https://irrssue.github.io/ and https://upload.irrssue.com/ up and correct.
- Run `scripts/check_security.py` and `scripts/check_site.mjs`; investigate failures.
- Watch for: broken pages, bad commits/PRs/workflow runs, leaked secrets
  (`run_secret_scanning`), suspicious changes to `html/`, `server/`, `.github/`.
- Keep docs current (`README.md`, `homelab/README.md`, this file).
- Never attack, probe, or retaliate against anyone. Contain by fixing, reverting,
  or reporting — nothing else.
- Home server: no direct access from the cloud. Only act on what the public URLs
  and the repo show. Anything needing the box goes under "Needs Liam".

## Current state
- Initialised 2026-10-09. No checks run yet.

## Needs Liam
- Home server (`ssh irrssue@homelab`) is unreachable from cloud sessions. To monitor
  it, expose a read-only status/health endpoint or run a cron script there.

## Log
- 2026-10-09: handoff system created.

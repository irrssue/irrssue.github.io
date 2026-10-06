# Project: irrssue.github.io

Personal portfolio and writing site. Vanilla HTML/CSS/JS — no frameworks, no build tools. Hosted on GitHub Pages from `main` branch. Design philosophy: minimal, fast, stable, and easy to extend.

## Structure
- `/index.html`: Homepage (front page)
- `/css/styles.css`: Shared stylesheet for every page — design tokens plus the current design
- `/css/legacy.css`: The older plain design, served to browsers that can't run the current one
- `/css/`: Page-specific stylesheets (`post.css`, `bookmarks.css`) and self-hosted font sheets (`fonts-*.css`)
- `/javascript/`: JS files (`capability.js` loads the enhancement scripts only in capable browsers)
- `/posts/`: Blog/writing content in Markdown
- `/writing/`: Rendered posts and the writing index (generated from `/posts/`)
- `/bookmarks/`: Bookmarks page
- `/data/`: Projects and bookmarks JSON the build renders from
- `/html/`: Admin and upload pages
- `/scripts/`: Site build, font build, and check scripts
- `.github/workflows/`: GitHub Actions for content pipeline

## Tech
- Plain HTML5, CSS3, vanilla JavaScript — no React, no Tailwind, no npm
- GitHub Pages serves static files directly from `main`
- GitHub Actions handles markdown-to-HTML for posts

## Design Direction
- The current design lives in `css/styles.css`: minimal and calm, light theme by default with a dark theme, the intro curtain, and the rotating project ring
- Everything in `css/styles.css` sits inside one `@supports (--gate: 0)` block — never add rules outside it
- Browsers without CSS custom properties skip that file and get `css/legacy.css` instead (every rule scoped under `html.legacy`) — keep it working when changing markup

## CSS Rules
- Use CSS custom properties (variables) for all design tokens — they're defined in `:root {}` at the top of `css/styles.css`
- Themes are two sets of token values, switched by `data-theme` on `<html>` (stamped by `javascript/theme.js`) — never write a second stylesheet for a theme
- Reuse existing tokens (`--bg`, `--text`, `--text-muted`, `--surface`, `--border`, …) before adding new ones
- Reference variables everywhere; never hardcode colors, fonts, or spacing values inline
- Keep CSS minimal and hand-written; no utility class patterns
- One shared base stylesheet (`css/styles.css`), page-specific styles in `/css/` only when needed
- Mobile-responsive: test at 375px and 768px breakpoints
- Prefer `rem` units for sizing, `em` for component-relative spacing

## Code Rules
- No frameworks or libraries unless absolutely necessary
- Semantic HTML (`<article>`, `<section>`, `<nav>`, `<header>`, `<main>`, `<footer>`)
- Keep the codebase flat and simple — easy for a future developer (or future me) to read and extend
- If adding a new page, follow the same HTML structure as existing pages
- Accessible: proper alt text, sufficient color contrast, keyboard navigable
- JS should be minimal and progressive — site must work fully without JS enabled

## Performance
- Target sub-1-second load time. No heavy assets.
- Zero external requests on initial load (no Google Fonts CDN, no analytics scripts, no icon libraries)
- Use system font stack or self-host fonts if custom fonts are needed (`scripts/build_fonts.py` downloads and subsets them)
- Optimize all images (compress, use modern formats like WebP) before committing
- Inline critical CSS if page count stays small; avoid render-blocking resources
- No JavaScript on pages that don't need it

## Deployment
- Push to `main` = live on https://irrssue.github.io/
- No build step for HTML/CSS/JS — files are served as-is
- GitHub Actions runs `scripts/build_site.py` when `posts/`, `data/projects.json`, `data/bookmarks.json` or the post template change: it renders `/writing/<year>/<slug>/` and rewrites the regions between `<!-- build:X -->` markers in `index.html`, `writing/index.html` and `bookmarks/index.html` — don't hand-edit those regions
- Test locally with `python3 -m http.server` or Live Server before pushing

## STRICT: Commit & Push After Every Change
**This is mandatory and non-negotiable.** After every file change — no matter how small — you MUST:
1. `git add` the changed files
2. `git commit` with a readable, descriptive message — describe the change in plain English (what behaviour/layout/fix shipped), not the file touched
3. `git push origin main`

Never finish a task without committing and pushing. Do not wait to be asked. Do not batch changes across multiple tasks. Each task = its own commit = pushed immediately.

## Important
- Never commit .DS_Store files (already in .gitignore)
- Internal links use root-relative, slash-terminated URLs (e.g., `/writing/`) so GitHub Pages doesn't redirect
- When editing posts workflow, check `.github/workflows/` for the action config

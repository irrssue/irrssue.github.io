# Project: irrssue.github.io

Personal portfolio and writing site. Vanilla HTML/CSS/JS — no frameworks, no build tools. Hosted on GitHub Pages from `main` branch. Design philosophy: minimal, fast, stable, and easy to extend.

## Structure
- `/index.html` + `/main.css`: Homepage (front page)
- `/html/`: Subpages (writing.html, bookmarks.html)
- `/css/`: Page-specific stylesheets
- `/javascript/`: JS files
- `/posts/`: Blog/writing content (markdown rendered via GitHub Actions)
- `/bookmarks/`: Bookmarks data
- `.github/workflows/`: GitHub Actions for content pipeline

## Tech
- Plain HTML5, CSS3, vanilla JavaScript — no React, no Tailwind, no npm
- GitHub Pages serves static files directly from `main`
- GitHub Actions handles markdown-to-HTML for posts

## Design Direction
The front page should follow a minimal single-column layout inspired by https://looskie.com/:
- Name and one-line tagline at top
- Row of social links (GitHub, LinkedIn, etc.) as simple text links
- "work" section: list of roles with company name (bold, linked), short description, and date range
- "projects" section: list of projects with name (bold, linked), short description
- No hero images, no animations, no cards — just clean typography and whitespace
- Dark background with light text (or configurable via CSS custom properties)
- The entire page should feel like a well-formatted text document

## CSS Rules
- Use CSS custom properties (variables) for all design tokens — define them in `:root {}`
- At minimum define: `--font-main`, `--font-mono`, `--bg`, `--text`, `--text-muted`, `--link`, `--link-hover`, `--max-width`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- Reference variables everywhere; never hardcode colors, fonts, or spacing values inline
- Keep CSS minimal and hand-written; no utility class patterns
- One shared base stylesheet (`main.css`), page-specific styles in `/css/` only when needed
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
- Use system font stack or self-host fonts if custom fonts are needed
- Optimize all images (compress, use modern formats like WebP) before committing
- Inline critical CSS if page count stays small; avoid render-blocking resources
- No JavaScript on pages that don't need it

## Deployment
- Push to `main` = live on https://irrssue.github.io/
- No build step for HTML/CSS/JS — files are served as-is
- GitHub Actions runs for post processing only
- Test locally with `python3 -m http.server` or Live Server before pushing

## Important
- Never commit .DS_Store files (already in .gitignore)
- All internal links should be relative paths (e.g., `html/writing.html`)
- When editing posts workflow, check `.github/workflows/` for the action config

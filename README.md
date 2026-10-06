# Saw Thura Zaw's playground

My personal portfolio and writing site, built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools.
Live at **[irrssue.com](https://irrssue.com)** (hosted on GitHub Pages).

The whole thing is intentionally minimal: fast to load, easy to read, and simple to extend.

## What's here

- **Homepage** — intro, projects, and a short writing section, in a minimal single-column layout.
- **Writing** — blog posts written in Markdown and rendered to HTML through GitHub Actions, listed by year.
- **Bookmarks** — a curated list of links, grouped by year.
- **Resume** — hosted PDF with an inline viewer and download link.

## Tech

- Plain HTML5, CSS3, and vanilla JavaScript — no React, no Tailwind, no npm.
- GitHub Pages serves the static files directly from `main`.
- GitHub Actions handles the Markdown-to-HTML pipeline for posts.
- Self-hosted fonts, zero external requests on load, and no analytics — the site works fully without JavaScript.

## Structure

```
index.html        Homepage
css/styles.css    Shared styles (css/legacy.css for old browsers, plus page-specific sheets)
html/             Subpages (admin, upload)
javascript/       Vanilla JS
posts/            Writing content in Markdown
writing/          Rendered posts and the writing index (generated)
bookmarks/        Bookmarks page
data/             Projects and bookmarks JSON the build renders from
resume/           Resume PDF + viewer
.github/workflows/ Content pipeline (Markdown → HTML)
```

## Design

Minimal and calm — the current design lives in `css/styles.css`, with `css/legacy.css` as a plain fallback for older browsers.
All design tokens (colors, fonts, spacing) live as CSS custom properties in `:root`, and the site supports light and dark themes.

## Local development

No build step. Serve the files with any static server:

```bash
python3 -m http.server
```

Then open <http://localhost:8000>.

## Writing a post

Add a Markdown file under `posts/`.
GitHub Actions renders it to HTML and wires up the route automatically on push to `main`.

## Archived pages

Gems is temporarily unpublished while its purpose and design are reconsidered.
The gallery and its design remain recoverable from Git history; its data and admin editor are retained for a future return. The public `/gems` routes return 404, and navigation omits the page.

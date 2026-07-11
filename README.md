# Saw Thura Zaw's playground

My personal portfolio and writing site, built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools.
Live at **[irrssue.com](https://irrssue.com)** (hosted on GitHub Pages).

The whole thing is intentionally minimal: fast to load, easy to read, and simple to extend.

## What's here

- **Homepage** — intro, projects, and a short writing section, in a minimal single-column layout.
- **Writing** — blog posts written in Markdown and rendered to HTML through GitHub Actions. Includes search and tag filtering.
- **Bookmarks** — a curated, tag-filterable list of links.
- **Gems** — small collected finds and moments.
- **Resume** — hosted PDF with an inline viewer and download link.

## Tech

- Plain HTML5, CSS3, and vanilla JavaScript — no React, no Tailwind, no npm.
- GitHub Pages serves the static files directly from `main`.
- GitHub Actions handles the Markdown-to-HTML pipeline for posts.
- System font stack, zero external requests on load, and no analytics — the site works fully without JavaScript.

## Structure

```
index.html        Homepage
main.css          Shared base styles
html/             Subpages (admin, upload)
css/              Page-specific stylesheets
javascript/       Vanilla JS
posts/            Writing content in Markdown
bookmarks/        Bookmarks data
gems/             Gems page
resume/           Resume PDF + viewer
.github/workflows/ Content pipeline (Markdown → HTML)
```

## Design

Minimal, single-column, and calm — see [docs/Design_goal.md](docs/Design_goal.md) for the full direction.
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

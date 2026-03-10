# CMS Plan — irrssue.github.io

A lightweight, self-built content management system using the GitHub API.
No backend. No database. No cost. Just a local admin page + vanilla JS.

---

## Goal

Build a simple admin UI to manage content on the site without touching raw files directly:
- Add / edit / remove **projects** (home page list)
- Add / edit / remove **bookmarks**
- Create / publish **blog posts**

---

## How It Works

1. Content lives in JSON or markdown files in the repo
2. Admin page reads/writes those files via the **GitHub Contents API**
3. Every write auto-commits to `main` → GitHub Pages serves the updated site
4. GitHub Actions handles any markdown → HTML processing (already set up for posts)

---

## Auth

- Generate a **Personal Access Token (PAT)** on GitHub (Settings → Developer Settings → PAT)
- Scope needed: `repo` (read/write contents)
- Paste into admin page once → saved to `localStorage`
- Never committed or exposed — only lives in the browser on your machine

---

## File Structure (planned)

```
/admin.html              ← the admin UI (local only, never linked publicly)
/data/projects.json      ← projects list data
/data/bookmarks.json     ← bookmarks data (may already exist, check /bookmarks/)
/posts/                  ← markdown blog posts (already exists)
```

---

## Admin Page — UI Plan

Single HTML file, 3 tabs:

### Projects tab
- Form: name, url, description, external (checkbox)
- Lists existing projects with edit / delete
- Writes to `/data/projects.json`

### Bookmarks tab
- Form: title, url, category/tag, note
- Lists existing bookmarks
- Writes to `/data/bookmarks.json`

### Posts tab
- Form: title, date, markdown body (textarea)
- On submit: creates `/posts/YYYY-MM-DD-slug.md` with front matter
- GitHub Actions picks it up and converts to HTML

---

## GitHub API Calls Used

```js
// Read a file
GET /repos/irrssue/irrssue.github.io/contents/{path}
// Returns: file content (base64) + SHA (needed for updates)

// Write (create or update) a file
PUT /repos/irrssue/irrssue.github.io/contents/{path}
// Body: { message, content (base64), sha (if updating) }
```

All calls use `Authorization: Bearer YOUR_PAT` header.

---

## Frontend Rendering

The live site renders content from the JSON files via vanilla JS `fetch()`:
- `index.html` fetches `/data/projects.json` → renders projects list
- `html/bookmarks.html` fetches `/data/bookmarks.json` → renders bookmarks
- Posts are pre-rendered HTML by GitHub Actions (no client fetch needed)

---

## Build Order

1. Create `/data/projects.json` — seed with current projects from `index.html`
2. Update `index.html` to render projects dynamically from JSON
3. Create `admin.html` with PAT input + Projects tab (start simple)
4. Test the full loop: fill form → API write → page updates
5. Add Bookmarks tab
6. Add Posts tab
7. Migrate bookmarks data to `/data/bookmarks.json` if not already structured

---

## Constraints

- Vanilla JS only — no frameworks, no npm
- `admin.html` kept local (not pushed) until intentionally shared
- PAT never committed to the repo
- Site must still work without JS (static fallback or pre-rendered HTML)
- Free tier only — GitHub API (5000 req/hr), Pages, Actions

---

## Status

- [ ] `/data/projects.json` created
- [ ] `index.html` renders projects from JSON
- [ ] `admin.html` scaffolded with PAT auth
- [ ] Projects tab working end-to-end
- [ ] Bookmarks tab working end-to-end
- [ ] Posts tab working end-to-end

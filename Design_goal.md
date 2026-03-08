# Design Goal — looskie.com Inspired Minimal Portfolio

Reference: https://looskie.com/
Goal: Replicate the minimal, text-document aesthetic for irrssue.github.io

---

## Core Philosophy

- The page should feel like a well-formatted plain text document
- No cards, no borders, no shadows, no animations (beyond the existing intro)
- No icons in navigation — text links only
- Every element earns its place; default is to remove, not add

---

## Layout

```
max-width:    600–650px   (current: 700px — reduce slightly)
margin:       0 auto      (centered)
padding:      60px 40px 120px 40px  (top / sides / bottom for mobile nav)
```

- Single column, block-level stacking — no grid, no flexbox on main content
- Breakpoints: 375px (mobile), 768px (tablet threshold)
- Mobile padding: `50px 20px 100px 20px`

---

## Typography

```
font-family:  system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
font-size:    1rem (16px base)
line-height:  1.6
```

### Heading sizes

| Element              | Size                              | Weight | Notes                        |
|----------------------|-----------------------------------|--------|------------------------------|
| `h1` (name)          | `clamp(1.2rem, 3vw + 0.6rem, 1.5rem)` | 700    | Small, not a giant hero      |
| `h2` (section label) | `0.85rem`                         | 500    | Lowercase, muted, label-like |
| Body text            | `1rem`                            | 400    | Normal reading size          |
| Muted / description  | `0.95rem`                         | 400    | Slightly smaller             |
| Date range           | `0.85rem`                         | 400    | Monospace or muted           |

**Key rule:** The name should NOT dominate the page. It's small and confident, not a giant hero.

---

## Color Tokens (CSS custom properties)

```css
:root {
  /* Layout */
  --max-width:      640px;
  --spacing-sm:     0.5rem;
  --spacing-md:     1.25rem;
  --spacing-lg:     3rem;

  /* Typography */
  --font-main:      system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono:      'Courier New', 'Monaco', 'Menlo', 'Consolas', monospace;

  /* Light mode colors */
  --bg:             #ffffff;
  --text:           rgb(30, 30, 30);       /* primary readable text */
  --text-muted:     rgb(115, 115, 115);    /* descriptions, dates, secondary */
  --link:           rgb(30, 30, 30);       /* links match body text, not blue */
  --link-hover:     rgb(0, 0, 0);          /* subtle darkening on hover */
  --heading:        rgb(26, 26, 26);       /* h1/h2 */
  --section-label:  rgb(115, 115, 115);    /* "work", "projects" labels */
  --separator:      rgb(180, 180, 180);    /* the — dash between name and desc */
}

body.dark-mode {
  --bg:             #000000;
  --text:           rgb(220, 220, 220);
  --text-muted:     rgb(163, 163, 163);
  --link:           rgb(220, 220, 220);
  --link-hover:     rgb(255, 255, 255);
  --heading:        rgb(250, 250, 250);
  --section-label:  rgb(130, 130, 130);
  --separator:      rgb(100, 100, 100);
}
```

**Current problem:** Colors are hardcoded everywhere instead of using variables. Goal is to refactor to use these tokens consistently.

---

## Link Styles

```css
a {
  color: var(--link);
  text-decoration: none;
}
a:hover {
  color: var(--link-hover);
  text-decoration: underline;   /* OR: just color change, no underline */
}
```

- **No rounded hover backgrounds** on inline links (current `.online-link-row a` has `padding + border-radius` — remove)
- Links blend into text; only differentiate on hover
- Exception: project name links can have a very subtle underline

---

## Page Structure (HTML outline)

```html
<main>
  <!-- 1. Name -->
  <h1>Thura Zaw</h1>

  <!-- 2. Tagline (one line, body size, muted) -->
  <p class="tagline">self-taught software engineer living in NYC</p>

  <!-- 3. Social links — text only, inline, separated by · -->
  <nav class="social-links">
    <a href="...">GitHub</a> ·
    <a href="...">LinkedIn</a> ·
    <a href="...">YouTube</a> ·
    <a href="mailto:...">Email</a>
  </nav>

  <!-- 4. Work section -->
  <section>
    <h2>work</h2>
    <div class="entry">
      <div class="entry-header">
        <span class="entry-name"><a href="...">Company</a></span>
        <span class="entry-role">— role title</span>
        <span class="entry-date">jan 2024 — present</span>
      </div>
      <p class="entry-desc">Short description of what the company does or what you did.</p>
    </div>
    <!-- repeat -->
  </section>

  <!-- 5. Projects section -->
  <section>
    <h2>projects</h2>
    <div class="entry">
      <span class="entry-name"><a href="...">Project Name</a></span>
      <span class="entry-separator"> — </span>
      <span class="entry-desc">Short description</span>
    </div>
    <!-- repeat -->
  </section>
</main>
```

---

## Section Styling

### Section label (`h2`)
```css
h2 {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--section-label);
  text-transform: lowercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.75rem;
  margin-top: var(--spacing-lg);   /* 3rem above each section */
}
```

### Entry row
```css
.entry {
  margin-bottom: 1.25rem;
}

.entry-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4em;
  margin-bottom: 0.2rem;
}

.entry-name {
  font-weight: 600;
  color: var(--text);
}

.entry-role {
  color: var(--text-muted);
  font-weight: 400;
}

.entry-date {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-left: auto;   /* pushes date to the right */
}

.entry-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}
```

---

## Social Links Row

```css
.social-links {
  margin-top: 0.75rem;
  margin-bottom: 0;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.social-links a {
  color: var(--text-muted);
  text-decoration: none;
}

.social-links a:hover {
  color: var(--link-hover);
  text-decoration: underline;
}
```

- Separator `·` is a plain text character between `<a>` tags, not styled
- **Remove** SVG icons from the social row entirely

---

## Intro Animation (keep as-is)

Current animation is good and should be preserved:
- Overlay fades in at `opacity: 1`
- Name starts at `12vw` (desktop) / `min(15vw, 12vh)` (mobile)
- Shrinks to hero-name size after 500ms
- Overlay fades out at 2700ms, removed at 3200ms
- Only plays once per session (`sessionStorage.introPlayed`)
- `intro-shrink` target size must match final `.hero-name` font-size exactly

```
Intro name start:  12vw (desktop), min(15vw, 12vh) (mobile)
Shrink delay:      500ms
Fade-out start:    2700ms
Cleanup:           3200ms
Easing:            cubic-bezier(0.16, 1, 0.3, 1)  (spring-like)
```

---

## Mobile Nav (keep, already good)

Current floating pill nav is polished and should stay. Key numbers:

```
bottom:          14px
border-radius:   22px
padding:         8px 14px
backdrop-filter: blur(20px)
grid-columns:    5 (desktop), 4 (mobile — theme toggle hidden)
item padding:    10px 13px
item radius:     14px
icon size:       17px × 17px
background:      rgba(30, 30, 30, 0.95)  light mode
                 rgba(40, 40, 40, 0.95)  dark mode
hover pill:      rgba(255, 255, 255, 0.15)
active dot:      3px × 3px, bottom: -3px, rgba(255,255,255,0.8)
```

---

## What to Remove / Simplify

| Current element        | Action                              |
|------------------------|-------------------------------------|
| `.hero-intro` (giant text 1.8–4.2rem) | Replace with normal `<p class="tagline">` at ~1rem |
| SVG social icons       | Replace with plain text link row    |
| `.online-section` grid | Remove entirely                     |
| `.dotted-line`         | Remove entirely                     |
| `.projects-section` with `margin-top: 100px` | Reduce to `var(--spacing-lg)` |
| Rounded hover bg on links | Remove (`.project-link` padding/bg) |
| Content cards          | Not used on index, remove CSS dead weight |
| Search box / overlay   | Only needed on subpages, not index  |

---

## What to Add

| Missing element        | Details                             |
|------------------------|-------------------------------------|
| Work history section   | 2–3 roles in `.entry` format        |
| CSS custom properties  | Full token system in `:root`        |
| Plain text social row  | GitHub · LinkedIn · YouTube · Email |
| `--max-width: 640px`   | Narrower than current 700px         |

---

## File Map

```
index.html          — Main page HTML
main.css            — Imports: css/styles.css, css/theme.css, css/post.css
css/styles.css      — Main stylesheet (layout, components, responsive)
css/theme.css       — Dark mode overrides + theme toggle
javascript/script.js — Theme, mobile nav, bookmarks, search logic
```

---

## Reference Measurements Summary

```
Max content width:    640px
Top padding:          60px (desktop), 50px (mobile)
Side padding:         40px (desktop), 20px (mobile)
Bottom padding:       120px (for mobile nav clearance)
Section gap:          3rem (between sections)
Entry gap:            1.25rem (between entries within a section)
Name font-size:       clamp(1.2rem, 3vw + 0.6rem, 1.5rem)
Tagline font-size:    1rem
Section label size:   0.85rem
Body text:            1rem / line-height 1.6
Muted text:           rgb(115,115,115) light / rgb(163,163,163) dark
```

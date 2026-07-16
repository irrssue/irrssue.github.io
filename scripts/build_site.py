#!/usr/bin/env python3
"""Render posts/*.md into static pages at build time.

Everything a reader needs is baked here: each post becomes a complete
/writing/<year>/<slug>/index.html, and the post lists on the homepage and
/writing are injected between BUILD markers. Nothing is fetched from the
GitHub API at runtime, so the pages render without JS and without any
external origin.

Run locally or via CI whenever posts/ or the templates change. Removes any
post directories whose source markdown no longer exists.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import yaml
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
WRITING_DIR = ROOT / "writing"
DATA_DIR = ROOT / "data"
TEMPLATE = (ROOT / "scripts" / "post_template.html").read_text(encoding="utf-8")

EXTERNAL_ICON = (
    '<svg class="external-icon" viewBox="0 0 24 24" fill="currentColor">'
    '<path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 '
    '2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>'
)

MAX_HOME_POSTS = 3
EXCERPT_LIMIT = 160

# Mirrors the old client-side markdown-it config exactly: the "js-default"
# preset is markdown-it's own "default", so tables/strikethrough/linkify and
# typographer quotes render the same as they did in the browser.
md = MarkdownIt(
    "js-default",
    {"html": True, "linkify": True, "typographer": True, "breaks": True},
)


def _external_link_open(self, tokens, idx, options, env):
    token = tokens[idx]
    href = token.attrGet("href") or ""
    if href.startswith(("http://", "https://")):
        token.attrSet("target", "_blank")
        token.attrSet("rel", "noopener noreferrer")
    return self.renderToken(tokens, idx, options, env)


md.add_render_rule("link_open", _external_link_open)


def parse_post(path: Path) -> dict | None:
    """Split front matter from body. Returns None for drafts/invalid posts."""
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not m:
        print(f"skip {path.name}: no front matter")
        return None

    fm = yaml.safe_load(m.group(1)) or {}
    if fm.get("draft") is True or str(fm.get("draft", "")).lower() == "true":
        return None

    date = parse_date(fm.get("date", ""))
    if not date:
        print(f"skip {path.name}: unparseable date {fm.get('date')!r}")
        return None

    tag = fm.get("tag") or ""
    if not tag and fm.get("tags"):
        tags = fm["tags"]
        tag = tags[0] if isinstance(tags, list) else tags
    tag = str(tag).split(" ")[0] if tag else ""

    body = m.group(2)
    slug = path.stem
    return {
        "slug": slug,
        "title": str(fm.get("title") or "Untitled"),
        "date": date,
        "date_raw": str(fm.get("date", "")),
        "tag": tag,
        "cover": fm.get("cover") or "",
        "excerpt": fm.get("summary") or first_paragraph(body),
        "body": body,
        "url": f"/writing/{date.year}/{slug}",
    }


def parse_date(value) -> datetime | None:
    """Accept the front matter's 'May 4, 2026' style, plus ISO dates."""
    if isinstance(value, datetime):
        return value
    if hasattr(value, "year"):  # yaml may hand back a date
        return datetime(value.year, value.month, value.day)
    text = str(value).strip().strip('"')
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def first_paragraph(body: str) -> str:
    """First prose line, stripped of markdown."""
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)  # authoring notes aren't prose
    for line in body.split("\n"):
        t = line.strip()
        if t and not t.startswith(("#", "!", "```", "---", ">")):
            t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
            t = re.sub(r"[*_`]", "", t)
            return t[: EXCERPT_LIMIT - 3] + "…" if len(t) > EXCERPT_LIMIT else t
    return ""


def e(value) -> str:
    return html.escape(str(value), quote=True)


def render_post_page(post: dict) -> str:
    cover = (
        f'<img src="{e(post["cover"])}" alt="{e(post["title"])}" class="post-cover-image">'
        if post["cover"]
        else ""
    )
    tag = (
        f'<a href="/writing?tag={e(post["tag"].lower())}">#{e(post["tag"])}</a>'
        if post["tag"]
        else ""
    )
    full_date = post["date"].strftime("%B %-d, %Y")
    article = (
        '<article>\n'
        '  <header class="post-header">\n'
        f"    {cover}\n"
        f'    <h1 class="post-title">{e(post["title"])}</h1>\n'
        '    <div class="post-meta">\n'
        f'      <span class="post-date" data-full-date="{e(full_date)}"'
        f' data-iso="{post["date"].strftime("%Y-%m-%d")}">{e(full_date)}</span>\n'
        f'      <span class="post-tag">{tag}</span>\n'
        "    </div>\n"
        "  </header>\n"
        f'  <div class="post-content">{md.render(post["body"])}</div>\n'
        "</article>"
    )
    return (
        TEMPLATE.replace("{{TITLE}}", e(post["title"]))
        .replace("{{DESCRIPTION}}", e(post["excerpt"]))
        .replace("{{ARTICLE}}", article)
    )


def render_home_list(posts: list[dict]) -> str:
    items = [
        f'<li class="writing-post-item reveal-item">'
        f'<a href="{p["url"]}" class="writing-post-link">{e(p["title"])}</a></li>'
        for p in posts[:MAX_HOME_POSTS]
    ]
    return "\n".join(items)


def render_projects() -> str:
    """data/projects.json is the source of truth; this just bakes it into HTML."""
    projects = json.loads((DATA_DIR / "projects.json").read_text(encoding="utf-8"))
    items = []
    for p in projects:
        external = p.get("external")
        attrs = ' target="_blank" rel="noopener noreferrer"' if external else ""
        items.append(
            '<li class="project-item reveal-item">'
            f'<a href="{e(p["url"])}" class="project-link{" external" if external else ""}"{attrs}>'
            f'<span class="project-name">{e(p["name"])}</span>'
            f'<span class="project-description">{e(p.get("description", ""))}</span>'
            f'{EXTERNAL_ICON if external else ""}'
            "</a></li>"
        )
    return "\n".join(items)


def render_header(heading: str, sub: str, entries: list[dict], noun: str, since: str) -> str:
    """The shared bk-header: title, blurb, counts and tag chips."""
    tags: dict[str, int] = {}
    for entry in entries:
        if entry["tag"]:
            key = entry["tag"].lower()
            tags[key] = tags.get(key, 0) + 1
    ranked = sorted(tags.items(), key=lambda kv: -kv[1])

    counts = "".join(
        f"<span><b>{b}</b> {rest}</span>"
        for b, rest in (
            (len(entries), noun if len(entries) == 1 else noun + "s"),
            (len(ranked), "tag" if len(ranked) == 1 else "tags"),
            ("since", since),
        )
    )
    chips = '<span class="bk-chip on" data-tag="">all</span>' + "".join(
        f'<span class="bk-chip" data-tag="{e(t)}">{e(t)} · {c}</span>' for t, c in ranked
    )
    return (
        f'<div class="bk-heading">{e(heading)}</div>'
        f'<div class="bk-sub">{e(sub)}</div>'
        f'<div class="bk-counts">{counts}</div>'
        f'<div class="bk-chips">{chips}</div>'
    )


def render_months(entries: list[dict], noun: str) -> str:
    """The shared month-grouped bk-item list. /writing and /bookmarks are the same shape."""
    groups: dict[str, list[dict]] = {}
    for entry in entries:
        groups.setdefault(entry["date"].strftime("%Y-%m"), []).append(entry)

    months = []
    for key in sorted(groups, reverse=True):
        items = groups[key]
        rows = []
        for it in items:
            attrs = (
                ' target="_blank" rel="noopener noreferrer"' if it.get("external") else ""
            )
            body = (
                f'<div class="bk-item-title">'
                f'<a href="{e(it["url"])}"{attrs}>{e(it["title"])}</a></div>'
            )
            if it.get("desc"):
                body += f'<div class="bk-item-desc">{e(it["desc"])}</div>'
            if it.get("src"):
                body += f'<div class="bk-item-src">{e(it["src"])}</div>'
            tag = (
                f'<span class="bk-item-tag" data-tag="{e(it["tag"].lower())}">'
                f'{e(it["tag"])}</span>'
                if it["tag"]
                else "<span></span>"
            )
            rows.append(
                f'<div class="bk-item" data-tag="{e(it["tag"].lower())}">'
                f'<span class="bk-item-date">{it["date"].strftime("%b %-d")}</span>'
                f'<div class="bk-item-body">{body}</div>{tag}</div>'
            )
        months.append(
            f'<div class="bk-month" data-month="{key}">'
            f'<div class="bk-month-header">'
            f'<span class="bk-month-name">{items[0]["date"].strftime("%B %Y")}</span>'
            f'<span class="bk-month-count">· {len(items)} {noun}'
            f'{"" if len(items) == 1 else "s"}</span></div>{"".join(rows)}</div>'
        )
    return "\n".join(months)


def bookmark_entries() -> list[dict]:
    """data/bookmarks.json -> the shared entry shape, newest first."""
    raw = json.loads((DATA_DIR / "bookmarks.json").read_text(encoding="utf-8"))
    entries = []
    for b in raw:
        date = parse_date(b.get("date", ""))
        if not date:
            print(f"skip bookmark {b.get('title')!r}: bad date {b.get('date')!r}")
            continue
        host = re.sub(r"^www\.", "", urlparse(b.get("url", "")).hostname or "")
        entries.append(
            {
                "date": date,
                "title": b.get("title") or "(untitled)",
                "url": b.get("url") or "#",
                "tag": b.get("tag") or "",
                "desc": b.get("note") or b.get("description") or "",
                "src": host,
                "external": True,
            }
        )
    entries.sort(key=lambda x: x["date"], reverse=True)
    return entries


def inject(path: Path, marker: str, content: str) -> None:
    """Replace whatever sits between <!-- build:X --> and <!-- /build:X -->."""
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"(<!-- build:{marker} -->)(.*?)(<!-- /build:{marker} -->)", re.S
    )
    if not pattern.search(text):
        raise SystemExit(f"{path}: missing build marker {marker!r}")
    new = pattern.sub(lambda m: f"{m.group(1)}\n{content}\n{m.group(3)}", text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        print(f"updated {path.relative_to(ROOT)} [{marker}]")


def main() -> None:
    posts = [p for md_file in sorted(POSTS_DIR.glob("*.md")) if md_file.name != "_template.md"
             for p in [parse_post(md_file)] if p]
    posts.sort(key=lambda p: p["date"], reverse=True)

    wanted = set()
    for post in posts:
        out_dir = WRITING_DIR / str(post["date"].year) / post["slug"]
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(render_post_page(post), encoding="utf-8")
        wanted.add((str(post["date"].year), post["slug"]))
        print(f"wrote {out_dir.relative_to(ROOT)}/index.html")

    inject(ROOT / "index.html", "recent-posts", render_home_list(posts))
    inject(ROOT / "index.html", "projects", render_projects())

    entries = [dict(p, desc=p["excerpt"]) for p in posts]
    inject(
        WRITING_DIR / "index.html",
        "writing-header",
        render_header(
            "Writing.",
            "Things I found in life as in blog format",
            entries,
            "essay",
            posts[-1]["date"].strftime("%b %Y") if posts else "",
        ),
    )
    inject(WRITING_DIR / "index.html", "writing-list", render_months(entries, "essay"))

    marks = bookmark_entries()
    inject(
        ROOT / "bookmarks" / "index.html",
        "bookmarks-header",
        render_header(
            "Bookmarks",
            "Articles and pages worth keeping. Updated as I find things.",
            marks,
            "link",
            str(marks[-1]["date"].year) if marks else "—",
        ),
    )
    inject(ROOT / "bookmarks" / "index.html", "bookmarks-list", render_months(marks, "link"))

    for year_dir in WRITING_DIR.iterdir():
        if not year_dir.is_dir() or not re.fullmatch(r"\d{4}", year_dir.name):
            continue
        for slug_dir in list(year_dir.iterdir()):
            if slug_dir.is_dir() and (year_dir.name, slug_dir.name) not in wanted:
                shutil.rmtree(slug_dir)
                print(f"removed orphan {slug_dir.relative_to(ROOT)}")
        if not any(year_dir.iterdir()):
            year_dir.rmdir()


if __name__ == "__main__":
    main()

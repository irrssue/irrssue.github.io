#!/usr/bin/env python3
"""Generate /writing/<year>/<slug>/index.html stubs for every non-draft post.

Run locally or via CI whenever posts/ or the template changes. Removes any
stub directories whose source markdown no longer exists.
"""
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
WRITING_DIR = ROOT / "writing"
TEMPLATE = (ROOT / "scripts" / "post_template.html").read_text(encoding="utf-8")

YEAR_RE = re.compile(r"(\d{4})")


def parse_front_matter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fm[key.strip()] = value.strip().strip('"').strip("'")
    return fm


def main() -> None:
    wanted: set[tuple[str, str]] = set()

    for md in sorted(POSTS_DIR.glob("*.md")):
        if md.name == "_template.md":
            continue
        text = md.read_text(encoding="utf-8")
        fm = parse_front_matter(text)
        if fm.get("draft", "").lower() == "true":
            continue
        date_str = fm.get("date", "")
        year_match = YEAR_RE.search(date_str)
        if not year_match:
            print(f"skip {md.name}: no year in date {date_str!r}")
            continue
        year = year_match.group(1)
        slug = md.stem
        out_dir = WRITING_DIR / year / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(TEMPLATE, encoding="utf-8")
        wanted.add((year, slug))
        print(f"wrote {out_dir.relative_to(ROOT)}/index.html")

    if not WRITING_DIR.exists():
        return

    for year_dir in WRITING_DIR.iterdir():
        if not year_dir.is_dir() or not re.fullmatch(r"\d{4}", year_dir.name):
            continue
        for slug_dir in list(year_dir.iterdir()):
            if not slug_dir.is_dir():
                continue
            if (year_dir.name, slug_dir.name) not in wanted:
                shutil.rmtree(slug_dir)
                print(f"removed orphan {slug_dir.relative_to(ROOT)}")
        if not any(year_dir.iterdir()):
            year_dir.rmdir()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Download and self-host the webfonts, so no page hits a font CDN.

Run this by hand when the font list changes; the .woff2 output is committed.
Two different jobs:

  hero  - purely decorative faces that only ever render the homepage's <h1>
          and the intro word, so they're subset to just those glyphs: ~20KB
          a face becomes ~2KB. The glyph set is read out of index.html, so
          renaming the hero and re-running is enough; main() then asserts
          every face really covers it.
  post  - real body text on post pages, so they keep Google's full 'latin'
          subset. Downloaded as-is; Google already subsets these well.

Needs: pip install fonttools brotli
"""
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "fonts"
CSS_DIR = ROOT / "css"

def hero_text() -> str:
    """Every glyph the homepage's display fonts draw, read from the page itself.

    Nothing else on the site sets these families, so whatever index.html puts
    in the hero <h1> and the intro overlay is the complete charset.
    """
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    parts = []
    for pattern in (
        r'class="hero-name"[^>]*>([^<]+)<',
        r'class="intro-overlay__word"[^>]*>([^<]+)<',
    ):
        m = re.search(pattern, html)
        if not m:
            raise SystemExit(f"index.html: no match for {pattern!r}")
        parts.append(m.group(1).strip())
    return "".join(parts)

# Chrome UA makes Google serve woff2 rather than legacy formats.
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

HERO_FONTS = {
    "Fraunces": "https://fonts.googleapis.com/css2?family=Fraunces:wght@300",
    "Cormorant Garamond": "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300",
    "VT323": "https://fonts.googleapis.com/css2?family=VT323",
    "Bricolage Grotesque": "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700",
    "Playfair Display": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700",
    "DM Serif Display": "https://fonts.googleapis.com/css2?family=DM+Serif+Display",
    "Instrument Serif": "https://fonts.googleapis.com/css2?family=Instrument+Serif",
    "Cabinet Grotesk": "https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700",
}

# (family, weight) -> (css url, variable-axis pins). These set real prose, so
# they keep the full latin charset. Pinning an axis we only ever render at one
# value drops the variable machinery: post titles are Fraunces at a fixed 34px
# (.post-title in css/post.css), so opsz is a constant there. Gems draws
# Fraunces at two sizes, so it keeps the axis.
TEXT_FACES = {
    ("Fraunces", 500): (
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500",
        {"opsz": 34},
    ),
    ("Fraunces", 400): (
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400",
        None,
    ),
    ("Inter", 400): ("https://fonts.googleapis.com/css2?family=Inter:wght@400", None),
    ("Inter", 600): ("https://fonts.googleapis.com/css2?family=Inter:wght@600", None),
    ("JetBrains Mono", 400): (
        "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400",
        None,
    ),
}

# Which faces each page's stylesheet declares. Only what the CSS actually
# selects - gems asked for EB Garamond and five extra weights it never used.
BUNDLES = {
    "post": [("Fraunces", 500), ("Inter", 400), ("Inter", 600), ("JetBrains Mono", 400)],
    "gems": [("Fraunces", 400), ("JetBrains Mono", 400)],
}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):  # the font CDNs throw transient 500s under a burst
        try:
            with urllib.request.urlopen(req) as r:
                return r.read()
        except urllib.error.HTTPError:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def latin_face(css: str) -> tuple[str, str]:
    """Pull the woff2 url + weight for the latin (or only) face in a CSS file."""
    blocks = re.findall(r"@font-face\s*{(.*?)}", css, re.S)
    chosen = None
    for block in blocks:
        # Google splits by unicode-range; the latin block covers U+0000-00FF.
        if "unicode-range" not in block or "U+0000-00FF" in block:
            chosen = block
            break
    if chosen is None:
        chosen = blocks[0]
    url = re.search(r"url\(['\"]?((?:https:)?//[^)'\"]+\.woff2)['\"]?\)", chosen)
    weight = re.search(r"font-weight:\s*([\d]+)", chosen)
    if not url:
        raise SystemExit(f"no woff2 in @font-face block:\n{chosen}")
    href = url.group(1)
    # fontshare hands back protocol-relative urls
    if href.startswith("//"):
        href = "https:" + href
    return href, (weight.group(1) if weight else "400")


def slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def face_css(family: str, file: str, weight: str, display: str) -> str:
    return (
        "@font-face {\n"
        f"    font-family: '{family}';\n"
        f"    src: url('/fonts/{file}') format('woff2');\n"
        f"    font-weight: {weight};\n"
        "    font-style: normal;\n"
        f"    font-display: {display};\n"
        "}\n"
    )


def build_hero(text: str) -> str:
    out = [
        "/* Generated by scripts/build_fonts.py - do not edit by hand. */\n"
        "/* Display faces, subset to the hero name + intro word only. */\n\n"
    ]
    for family, css_url in HERO_FONTS.items():
        url, weight = latin_face(get(css_url).decode())
        raw = FONT_DIR / f".{slug(family)}.raw.woff2"
        raw.write_bytes(get(url))
        name = f"{slug(family)}-{weight}.woff2"
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(raw),
                f"--text={text}",
                "--flavor=woff2",
                "--layout-features=*",
                f"--output-file={FONT_DIR / name}",
            ],
            check=True,
        )
        raw.unlink()
        size = (FONT_DIR / name).stat().st_size
        print(f"hero {family:22} {size/1024:5.1f} KB")
        # swap: decorative, so never block text on them
        out.append(face_css(family, name, weight, "swap"))
    return "".join(out)


def check_hero_coverage(text: str) -> None:
    """A dropped glyph silently falls back to a system font - catch it here."""
    needed = {ord(c) for c in text}
    for family in HERO_FONTS:
        matches = list(FONT_DIR.glob(f"{slug(family)}-*.woff2"))
        assert matches, f"{family}: no subset file written"
        font = TTFont(matches[0])
        covered = set()
        for table in font["cmap"].tables:
            covered |= set(table.cmap)
        missing = sorted(chr(c) for c in needed - covered)
        assert not missing, f"{family}: subset is missing {missing}"
    print(f"all {len(HERO_FONTS)} hero faces cover {''.join(sorted(set(text)))!r}")


def fetch_text_face(family: str, weight: int) -> str:
    """Download one body face, pinning variable axes where we can. Returns filename."""
    css_url, pins = TEXT_FACES[(family, weight)]
    url, _ = latin_face(get(css_url).decode())
    name = f"{slug(family)}-{weight}.woff2"
    dest = FONT_DIR / name
    dest.write_bytes(get(url))
    if pins:
        font = TTFont(dest)
        instantiateVariableFont(font, pins, inplace=True)
        font.flavor = "woff2"
        font.save(dest)
    print(f"text {family:22} {weight}  {dest.stat().st_size/1024:5.1f} KB")
    return name


def build_bundles() -> None:
    files: dict[tuple[str, int], str] = {}
    for bundle, faces in BUNDLES.items():
        css = [
            "/* Generated by scripts/build_fonts.py - do not edit by hand. */\n"
            f"/* Body faces for {bundle} pages: Google's full 'latin' subset. */\n\n"
        ]
        for key in faces:
            if key not in files:  # shared across bundles, fetch once
                files[key] = fetch_text_face(*key)
            css.append(face_css(key[0], files[key], str(key[1]), "swap"))
        (CSS_DIR / f"fonts-{bundle}.css").write_text("".join(css), encoding="utf-8")


def main() -> None:
    FONT_DIR.mkdir(exist_ok=True)
    text = hero_text()
    (CSS_DIR / "fonts-hero.css").write_text(build_hero(text), encoding="utf-8")
    build_bundles()
    check_hero_coverage(text)
    total = sum(f.stat().st_size for f in FONT_DIR.glob("*.woff2"))
    print(f"total self-hosted fonts: {total/1024:.1f} KB")


if __name__ == "__main__":
    main()

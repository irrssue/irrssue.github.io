#!/usr/bin/env python3
"""Fast, dependency-light checks for the static site's security boundaries."""

from __future__ import annotations

import base64
import hashlib
import importlib.util
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

PUBLIC_HTML = (
    "index.html",
    "gems/index.html",
    "echoes/index.html",
    "solarsystem/index.html",
    "resume/index.html",
    "html/upload.html",
    "writing/index.html",
    "bookmarks/index.html",
    "scripts/post_template.html",
)

HASHED_INLINE_SCRIPTS = {
    "index.html",
    "gems/index.html",
    "echoes/index.html",
    "solarsystem/index.html",
}


def fail(message: str) -> None:
    print(f"FAIL {message}")
    raise SystemExit(1)


def csp_for(html: str) -> str | None:
    match = re.search(
        r'<meta\s+http-equiv=["\']Content-Security-Policy["\']\s+content=(["\'])(.*?)\1',
        html,
        re.IGNORECASE,
    )
    return match.group(2) if match else None


def directive(csp: str, name: str) -> str:
    match = re.search(rf"(?:^|;)\s*{re.escape(name)}\s+([^;]+)", csp, re.IGNORECASE)
    return match.group(1) if match else ""


def inline_script_hash(script: str) -> str:
    digest = hashlib.sha256(script.encode("utf-8")).digest()
    return "sha256-" + base64.b64encode(digest).decode("ascii")


class BlankLinkAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        values = {key.lower(): (value or "") for key, value in attrs}
        if values.get("target", "").lower() != "_blank":
            return
        rel = set(values.get("rel", "").lower().split())
        if "noopener" not in rel:
            self.errors.append(values.get("href", "(no href)"))


def load_builder():
    spec = importlib.util.spec_from_file_location("build_site", ROOT / "scripts" / "build_site.py")
    if not spec or not spec.loader:
        fail("could not import the site builder")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def check_builder_sanitizers() -> None:
    builder = load_builder()
    if builder.md.options.get("html") is not False:
        fail("Markdown renderer permits raw HTML")
    rendered = builder.md.render('<script data-security-probe="1">alert(1)</script>')
    if "<script" in rendered.lower() or "data-security-probe" not in rendered:
        fail("raw HTML in Markdown was not rendered as inert text")

    cases = (
        (builder.safe_http_url("javascript:alert(1)"), None),
        (builder.safe_http_url("https://example.com/path"), "https://example.com/path"),
        (builder.safe_relative_url("//attacker.example"), None),
        (builder.safe_relative_url("/writing/safe"), "/writing/safe"),
        (builder.safe_asset_url("data:text/html,boom"), None),
        (builder.safe_link_url("mailto:test@example.com"), "mailto:test@example.com"),
    )
    for actual, expected in cases:
        if actual != expected:
            fail(f"unexpected URL sanitizer result: {actual!r} != {expected!r}")

    template = (ROOT / "posts" / "_template.md").read_text(encoding="utf-8")
    hostile_title = 'normal title"\n---\ndraft: false\n---\n'
    generated = template.replace('title: "Your Title"', "title: " + json.dumps(hostile_title))
    front_matter = re.match(r"^---\n(.*?)\n---", generated, re.DOTALL)
    if not front_matter:
        fail("the post template has no parseable front matter")
    data = builder.yaml.safe_load(front_matter.group(1))
    if data.get("title") != hostile_title or data.get("draft") is not True:
        fail("a hostile workflow title can alter post front matter")


def check_csp_and_links() -> None:
    for relative in PUBLIC_HTML:
        html = (ROOT / relative).read_text(encoding="utf-8")
        csp = csp_for(html)
        if not csp:
            fail(f"{relative} is missing a Content-Security-Policy")
        for required in ("default-src", "base-uri", "form-action", "script-src"):
            if not directive(csp, required):
                fail(f"{relative} CSP is missing {required}")
        script_src = directive(csp, "script-src")
        if "'unsafe-inline'" in script_src:
            fail(f"{relative} permits arbitrary inline scripts")

        if relative in HASHED_INLINE_SCRIPTS:
            scripts = re.findall(
                r"<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>", html, re.IGNORECASE
            )
            if not scripts:
                fail(f"{relative} was expected to have hashed inline scripts")
            for script in scripts:
                digest = inline_script_hash(script)
                if digest not in script_src:
                    fail(f"{relative} CSP is missing the hash for an inline script")

    for path in ROOT.rglob("*.html"):
        audit = BlankLinkAudit()
        audit.feed(path.read_text(encoding="utf-8"))
        if audit.errors:
            fail(f"{path.relative_to(ROOT)} has target=_blank links without noopener")


def check_credential_storage() -> None:
    for relative in ("html/admin.html", "server/media-upload/upload.html"):
        text = (ROOT / relative).read_text(encoding="utf-8")
        if re.search(r"(?:localStorage|sessionStorage)\.(?:getItem|setItem|clear)\s*\(", text):
            fail(f"{relative} persists a credential in browser storage")


def check_supply_chain_pins() -> None:
    workflow_files = (".github/workflows/build-post-routes.yml", ".github/workflows/new-post.yml")
    workflow_text = {}
    for relative in workflow_files:
        text = (ROOT / relative).read_text(encoding="utf-8")
        workflow_text[relative] = text
        for action in re.findall(r"uses:\s*[^@\s]+@([^\s#]+)", text):
            if not re.fullmatch(r"[0-9a-f]{40}", action):
                fail(f"{relative} has an unpinned action reference: {action}")
        if "if: github.ref == 'refs/heads/main'" not in text:
            fail(f"{relative} can write generated content from an untrusted ref")
        if "ref: main" not in text:
            fail(f"{relative} does not check out the protected main ref")
    requirements = (ROOT / "scripts" / "requirements.txt").read_text(encoding="utf-8")
    if "--require-hashes" not in workflow_text[".github/workflows/build-post-routes.yml"]:
        fail("the content workflow does not enforce dependency hashes")
    if "--hash=sha256:" not in requirements:
        fail("requirements are not hash-pinned")
    if "git commit -m \"new post\" ||" in workflow_text[".github/workflows/new-post.yml"]:
        fail("the new-post workflow masks commit failures")
    if "json.dumps(title" not in workflow_text[".github/workflows/new-post.yml"]:
        fail("the new-post workflow does not safely serialize post titles")
    for relative, text in workflow_text.items():
        if "persist-credentials: false" not in text:
            fail(f"{relative} leaves write credentials available to build steps")
        if "git remote set-url origin" not in text:
            fail(f"{relative} does not scope credentials to its final push")


if __name__ == "__main__":
    check_builder_sanitizers()
    check_csp_and_links()
    check_credential_storage()
    check_supply_chain_pins()
    print("security checks passed")

#!/usr/bin/env python3
"""Landscape artifact theme — wraps HTML in the CoreUI light demo look.

The one place every non-Landscape-app HTML artifact gets its styling from:
Claudine pages, scheduled-task reports, skill output.

Python:
    from artifact_theme import page, css
    html = page("Nightly Brief", body_html, subtitle="Claudine", meta="2026-09-23 06:00 MST")

CLI:
    python3 artifact_theme.py wrap BODY.html OUT.html --title "..." [--subtitle ...] [--meta ...]
    python3 artifact_theme.py css            # print the combined CSS
    python3 artifact_theme.py sample OUT.html

BODY.html is a fragment: CoreUI markup only (cards, tables, badges...), no
<html>/<head>/<style>. See README.md in this folder for the class cheat sheet.

Output is a complete, self-contained document (CSS inlined) that opens off
disk and publishes as an Artifact without external stylesheets. Light only.

When run from outside the repo (e.g. Claudine), the CSS is read from git ref
THEME_REF (default: origin/main, then main) of the repo at LANDSCAPE_REPO, so the checked-out
branch of the working copy never changes what artifacts look like.
"""
from __future__ import annotations

import argparse
import html as _html
import os
import subprocess
import sys
from datetime import datetime

REL_DIR = "docs/design-system/artifact-theme"
CSS_FILES = ("coreui-light.min.css", "artifact-theme.css")
VERSION = "1.0"

_HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None
LANDSCAPE_REPO = os.environ.get("LANDSCAPE_REPO", os.path.expanduser("~/landscape"))
# origin/main first: `git fetch` keeps it current, while the local main
# branch only moves when someone pulls it.
_REF_CANDIDATES = [r for r in (os.environ.get("THEME_REF"), "origin/main", "main") if r]


def _read_from_disk(name: str) -> str | None:
    if _HERE and os.path.exists(os.path.join(_HERE, name)):
        with open(os.path.join(_HERE, name), encoding="utf-8") as f:
            return f.read()
    return None


def _read_from_git(name: str) -> str | None:
    for ref in _REF_CANDIDATES:
        try:
            return subprocess.run(
                ["git", "-C", LANDSCAPE_REPO, "show", f"{ref}:{REL_DIR}/{name}"],
                check=True, capture_output=True, text=True).stdout
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    return None


_CSS_CACHE: str | None = None


def css() -> str:
    """Combined theme CSS. Raises if the theme cannot be found — never falls
    back to an unstyled or home-made look silently."""
    global _CSS_CACHE
    if _CSS_CACHE is None:
        parts = []
        for name in CSS_FILES:
            text = _read_from_disk(name) or _read_from_git(name)
            if text is None:
                raise FileNotFoundError(
                    f"artifact theme file {name} not found next to this script or in "
                    f"{LANDSCAPE_REPO} at refs {_REF_CANDIDATES}")
            parts.append(text)
        _CSS_CACHE = "\n".join(parts)
    return _CSS_CACHE


def _now_phoenix() -> str:
    # Arizona: UTC-7 all year, no DST
    from datetime import timedelta, timezone
    return datetime.now(timezone(timedelta(hours=-7))).strftime("%Y-%m-%d %-I:%M %p MST")


def page(title: str, body_html: str, subtitle: str = "", meta: str = "",
         footer: str = "", container: str = "container-lg", extra_css: str = "") -> str:
    """Return a complete HTML document in the CoreUI light demo look."""
    esc = _html.escape
    meta = meta or f"Generated {_now_phoenix()}"
    footer = footer or f"{esc(title)} &middot; artifact theme v{VERSION}"
    sub = f'<p class="artifact-subtitle">{esc(subtitle)}</p>' if subtitle else ""
    extra = f"\n<style>\n{extra_css}\n</style>" if extra_css else ""
    return f"""<!doctype html>
<html lang="en" data-coreui-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="generator" content="landscape-artifact-theme {VERSION}">
<title>{esc(title)}</title>
<style>
{css()}
</style>{extra}
</head>
<body>
<div class="artifact-brandbar"></div>
<header class="header artifact-header border-bottom">
  <div class="{container} d-flex align-items-center justify-content-between gap-3">
    <div><h1 class="artifact-title">{esc(title)}</h1>{sub}</div>
    <div class="artifact-meta">{meta}</div>
  </div>
</header>
<main class="artifact-main">
  <div class="{container}">
{body_html}
  </div>
</main>
<footer class="footer artifact-footer">
  <div class="{container} p-0">{footer}</div>
</footer>
</body>
</html>
"""


SAMPLE_BODY = """
<div class="row g-4 mb-4">
  <div class="col-sm-6 col-xl-3"><div class="card text-white bg-primary artifact-stat mb-0"><div class="card-body"><div class="fs-4">26</div><div>Open actions</div></div></div></div>
  <div class="col-sm-6 col-xl-3"><div class="card text-white bg-info artifact-stat mb-0"><div class="card-body"><div class="fs-4">12</div><div>Captures drained</div></div></div></div>
  <div class="col-sm-6 col-xl-3"><div class="card text-white bg-warning artifact-stat mb-0"><div class="card-body"><div class="fs-4">3</div><div>Waiting on Gregg</div></div></div></div>
  <div class="col-sm-6 col-xl-3"><div class="card text-white bg-danger artifact-stat mb-0"><div class="card-body"><div class="fs-4">1</div><div>Blocked</div></div></div></div>
</div>
<div class="card">
  <div class="card-header">Projects <span class="small">sample data</span></div>
  <div class="table-responsive">
  <table class="table table-hover mb-0 align-middle">
    <thead><tr><th>Project</th><th>Status</th><th>Next action</th><th class="num">Days</th></tr></thead>
    <tbody>
      <tr><td>Example A</td><td><span class="badge bg-success">On track</span></td><td>Send draft</td><td class="num">4</td></tr>
      <tr><td>Example B</td><td><span class="badge bg-warning text-dark">Waiting</span></td><td>Needs a decision</td><td class="num">11</td></tr>
      <tr><td>Example C</td><td><span class="badge bg-danger">Blocked</span></td><td>Access missing</td><td class="num">2</td></tr>
    </tbody>
  </table>
  </div>
</div>
<div class="row g-4">
  <div class="col-lg-6"><div class="card"><div class="card-header">Notes</div><div class="card-body">
    <div class="callout callout-info mt-0">Callout for context.</div>
    <div class="alert alert-warning mb-0">Alert for something that needs attention.</div>
  </div></div></div>
  <div class="col-lg-6"><div class="card"><div class="card-header">Progress</div><div class="card-body">
    <div class="small text-body-secondary">Captures drained</div>
    <div class="progress mb-3" style="height:6px"><div class="progress-bar bg-success" style="width:80%"></div></div>
    <ul class="list-group"><li class="list-group-item">List item one</li><li class="list-group-item">List item two</li></ul>
  </div></div></div>
</div>
"""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("wrap")
    w.add_argument("body"); w.add_argument("out")
    w.add_argument("--title", required=True); w.add_argument("--subtitle", default="")
    w.add_argument("--meta", default=""); w.add_argument("--footer", default="")
    sub.add_parser("css")
    s = sub.add_parser("sample"); s.add_argument("out")
    a = ap.parse_args(argv)
    if a.cmd == "css":
        sys.stdout.write(css()); return 0
    if a.cmd == "sample":
        doc = page("Artifact theme sample", SAMPLE_BODY, subtitle="CoreUI light demo look")
    else:
        with open(a.body, encoding="utf-8") as f:
            doc = page(a.title, f.read(), a.subtitle, a.meta, a.footer)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(doc)
    print(a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())

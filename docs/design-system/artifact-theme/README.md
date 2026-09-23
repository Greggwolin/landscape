# Artifact theme — CoreUI light (v1.0, 2026-09-23)

**The one look for every HTML artifact that is NOT the Landscape app itself**:
Claudine pages, the nightly and scheduled-task reports, skill output, one-off
reports. Decided by Gregg 2026-09-23: everything uses the CoreUI free Bootstrap
admin demo, light mode — https://coreui.io/demos/bootstrap/latest/free/?theme=light —
and the theme lives here, in the Landscape repo.

The Landscape app keeps its own CoreUI bridge (`src/styles/coreui-theme.css`).
Nothing in this folder is imported by the app.

## Files

| File | What it is |
|---|---|
| `coreui-light.min.css` | CoreUI 5.5.0 `dist/css/coreui.min.css`, dark-mode rules removed (light only, per Gregg's standing rule). Regenerate, don't hand-edit. |
| `artifact-theme.css` | The demo's own layout layer: grey canvas, white header bar, card + table defaults, stat tiles, footer, print. |
| `artifact_theme.py` | Wraps an HTML fragment into a complete, self-contained page with both CSS files inlined. |
| `build_coreui_light.py` | Rebuilds `coreui-light.min.css` from a CoreUI install. |
| `sample.html` | Rendered reference page. Open it to see the target look. |

## Use

Python generator:

```python
import sys, os
sys.path.insert(0, os.path.expanduser("~/landscape/docs/design-system/artifact-theme"))  # or load via git, see below
from artifact_theme import page
html = page("Title", body_html, subtitle="Project", meta="as of 2026-09-23 6:00 AM")
```

Scheduled task / LLM-written report: write only the body fragment, then

```
python3 artifact_theme.py wrap body.html out.html --title "Title" --subtitle "Project"
```

Output opens straight off disk and publishes as an Artifact (no external
stylesheets — the CSS is inlined, ~290 KB).

### Reading from `main`, not the checked-out branch

`~/landscape` is a working copy that changes branch. When the script cannot
find the CSS beside itself it reads it with `git show origin/main:<this folder>/…`
(then local `main`), so a feature-branch checkout never changes how the
nightly reports look. Override with `THEME_REF` / `LANDSCAPE_REPO`. If the
theme cannot be found it **raises** — it never falls back to a home-made look.

## Markup cheat sheet (CoreUI classes)

- Section: `<div class="card"><div class="card-header">Title <span class="small">note</span></div><div class="card-body">…</div></div>`
- Table: `<div class="card"><div class="card-header">…</div><div class="table-responsive"><table class="table table-hover mb-0 align-middle">…</table></div></div>` — `th.num`/`td.num` right-align numbers
- Stat tiles: `<div class="row g-4 mb-4"><div class="col-sm-6 col-xl-3"><div class="card text-white bg-primary artifact-stat mb-0"><div class="card-body"><div class="fs-4">26</div><div>Label</div></div></div></div>…</div>`
- Status: `badge bg-success | bg-warning text-dark | bg-danger | bg-info | bg-secondary`
- Callouts: `callout callout-info|warning|danger`; banners: `alert alert-warning|danger`
- Grid: `row g-4` + `col-lg-6` etc.; text: `text-body-secondary`, `small`, `fw-semibold`
- Code / prompts: `<pre class="artifact-pre">`

Don't add colours, fonts or dark-mode rules per page. If a page needs
something the theme lacks, add it to `artifact-theme.css` here so every page gets it.

## Regenerating `coreui-light.min.css`

From an install of `@coreui/coreui`: drop every top-level rule whose selectors
are all `[data-coreui-theme=dark]`, strip only the dark selectors from mixed
lists, and rename `:root,[data-coreui-theme=light]` to `:root`. That is what
`build_coreui_light.py SRC OUT` does. Afterwards check `.text-primary{`, `.card{`
and `.table{` still exist — a naive block-drop deletes them.

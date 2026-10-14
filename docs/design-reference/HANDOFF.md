# Handoff — Landscape UI Audit · design thread
2026-07-14 → 2026-10-14 · claude.ai design project · written by this chat (WRAP)

Coverage: **B** — visible conversation reviewed. Large earlier stretches were dropped from this chat's context to fit the window; those are known only from what survives (file state + summaries). No raw transcript was read. Not "complete".
Read first: this page · `INVARIANTS.md` · `COWORK-FORMAT-SPEC.md`

## 0 · Verify before doing anything
- Open `Slice 1 Reference Design.dc.html` → the sitemap card at top lists every frame; the coverage card should show no ✗ on live-linked routes. [V] as of 10-14.
- Grep it for `border-right: 1px solid var(--color-neutral-800); display: flex; flex-direction: column` containers with `background: var(--color-surface)` or `var(--color-neutral-900)` — expect none that are rails. Nav rails = `#08090A`, Landscaper panels = `#2A2B31`. [V] after last fixes; re-check, this regressed repeatedly.
- `design.css` token block should read `--ds-bg #161826 · --ds-surface #232532 · --ds-rail #08090A · --ds-border #3f424d · --ds-accent #2f9dd3`. [V]
- `design-reference/` must hold the current copies of the reference file, `design.css`, `COWORK-FORMAT-SPEC.md`, `INVARIANTS.md`, `support.js`, `slice1-switcher.js`. It is a manual sync — confirm dates match the root files. [I]
- Repo: `local_ls landscape` (attached 10-14) or GitHub `Greggwolin/landscape@main`.

## 1 · Where to pick up
Objective: get the `design` shell in the repo to render like the Slice 1 reference, and settle the pre-project **staging** model.
1. Get Gregg's answers to the four staging questions (§3), then redesign A5 (homepage) + the promote flow and add the rule to the Cowork spec.
2. Confirm with Gregg whether Claude Code's next pass with the corrected `design.css` + format spec now matches; fix only what he reports.

## 2 · Settled — do not reopen
- **Shell = 3 zones on every non-modal page**: nav rail `#08090A` · Landscaper chat panel `#2A2B31` · content `#161826`. Modals/overlays may omit the nav rail. (Gregg, repeatedly; root cause of "3 different colors" bug.)
- **Chat-driven 3-panel, not tiles/tabs on top** — the alpha's top nav tiles were rejected as too busy; that's why the redesign exists.
- **Badges, never pills.** Category badges white text or very light complementary tint.
- **Font is Inter** (Nocturne). Accent is Nocturne's current `#2f9dd3`, not the guide's blurple.
- **Frames must map to real routes**: the 8 studio folders + IC (screen map in old handoff, backed up). Settings = overlay; Project Details and Contacts = Home cards.
- **Read source before mocking** — field-by-field fidelity; Gregg rejects invented content (admin panel batch was rebuilt for this).
- **Benchmarks has exactly 4 categories** (Growth Rates, Transaction Costs, Commissions, Contingency Standards), single-column accordion.
- **Media/staging panel sits at the bottom of C9**, not separate. Staging panel hidden by default; "Pending" button left of Upload when items exist.
- **Everything is ingested** (no file-only). **Waterfall assumptions live in the project** (no platform defaults).
- **`design` wrapper**: Stage A restyle-only reusing every studio component verbatim, Stage B artifact-panel renderer later. Cowork writes, Claude Code wires. This project cannot write to the repo.
- **PDF re-cut dropped** ("forget the pdf").
- **Orphaned routes not drawn**: admin/changelog, settings/budget-categories, settings/contact-roles (repo's own audit marks them). Feedback is live and IS drawn (ADMIN-FB).
- Canonical Styles tab: discuss in a separate session.

## 3 · Waiting on Gregg
1. **Staging model** (asked 10-14): (a) one global pool or many parallel staging workspaces? (b) is the homepage itself the staging area, or a separate destination? (c) promote a whole workspace or cherry-pick items? (d) do unpromoted map features live in staging, Platform Intelligence, or both?
2. **Updated spec paste** (asked 10-14): I said it read identical to the current spec and asked "say go" to overwrite; no answer.

## 4 · Done — do not redo
[V] on disk:
- Every live-linked route has a frame in the reference: A1a–c, A2, A3, A5–A9, B-series, C1, C1-S, C1-K, C2 (+MF details, floor plans, rent roll, renovation), C3-MF operations, C3/C4 market, C5–C14, IC, ADMIN (Preferences, Benchmarks, Cost Library, DMS Admin, Users), ADMIN-FB.
- MF property sub-tabs and admin tabs switch in place (`slice1-switcher.js`).
- `Artifact Kit.dc.html` K0–K10 (panel-width artifact language).
- `design.css` corrected to exact Nocturne values + `#08090A` rail + map-chrome rules; `DESIGN-WRAPPER-PROMPT.md`; `COWORK-FORMAT-SPEC.md`; `INVARIANTS.md` (running log).
- Standalone offline export `Landscape Slice 1 Reference.html` (1.4 MB, no console errors).
Claimed, unverified: that Claude Code's build now matches the colors [I] — Gregg had reported 10 failed iterations before the corrected file.

## 5 · Traps — do not retry without new evidence
- **Inventing a palette.** The first `design.css` used made-up hexes (`#101120`, steel blue `#5b8dd6`); Claude Code chased it for 10 iterations. Always lift values from Nocturne `styles.css :root`.
- **Fixing color on one frame and calling it done.** Gregg had to report the rail colors four times (A1 → A3 → A2/C2/settings). Fix with a file-wide script and grep for every rail container, not per-frame edits.
- **`--color-neutral-900` (#292b31) vs `#2A2B31`** look alike in screenshots but are the bug. Don't use neutral-900 for any panel.
- **Inventing admin content** (9-category benchmarks, flyouts). Rebuild from the live screens only.
- **Assuming a route is orphaned** without checking `WrapperSidebar` NAV_ITEMS + `AdminNavBar` (Feedback was mis-filed).
- **Hash links to hidden switcher frames** land on `display:none` — the switcher reveals the target first; keep that handler.
- **`github_search_code` with a file as `path_prefix`** errors — prefix must be a directory.
- Print/PDF of this file: page breaks inside flex containers don't fragment; output was grainy. Dropped.

## 6 · Open and unverified
- Staging concept (pre-project research of property/location/market) is a critical, unbaked function; A5 homepage's Artifacts/Documents rail is its half-exposed form. Recommendation offered: homepage = chat + recents only, or conditional rail — not chosen.
- A8 Landscaper AI frame is a stub; needs a dedicated session.
- Stage B (artifact-panel renderer) not started.
- Whether `INVARIANTS.md` is complete — it accrues as pages are read; a targeted sweep was planned before wrapper coding and has not been run.
- Nothing was written to the Mac project logs, traps file, activity log or artifact register — this surface cannot reach them. **Those records still need this session's entry.**

## 7 · Deeper records, only if needed
- Prior handoff (07-14/07-17, screen map, locked conventions): `_backup/2026-10-14-HANDOFF.md`
- Behavior rules: `INVARIANTS.md` · Cowork build: `DESIGN-WRAPPER-PROMPT.md` · format: `COWORK-FORMAT-SPEC.md` · tokens: `design.css`
- Handoff bundle for the repo: `design-reference/`
- Earlier explorations: `Landscape UI Audit.dc.html` (+v2), `Land Concept Design Review.dc.html`, `land-review/tool-mapping.md`

# HANDOFF — Landscape Land Design Sessions
_Read this first in any new chat. Written 2026-07-14 at the end of the slice-1 design session._

## Who / what
Gregg Wolin (Crescent Bay Holdings) is building **Landscape**, an enterprise real-estate underwriting app (Next.js + CoreUI, repo attached as local folder `landscape/`). Claude designs here; **Cowork implements in the repo** (I am read-only on the repo). Gregg knows the domain deeply, relies on me for design/workflow judgment. Preference: concise, direct.

## The main deliverable
**`Slice 1 Reference Design.dc.html`** — the land-product reference design, organized as three chains with a sitemap card at top:
- **A · Platform**: A1 (`#1a`) map homepage — Google Earth-style, draw point/polygon/overlay, whole-page dropzone, features → platform intelligence, cascading family/type/product form
- **B · Intake flow** (once per deal): B1 (`#4a`) document read → B2 (`#4b`) entitlement chain/precedence → B3 (`#3a`) structure confirmation (renamable Level 1/2/3 chain) → B4 (`#3b`) decision docket pattern
- **C · Project workspace** (standing tabs): C1 (`#9a`) Project home (profile fields from ProjectTab.tsx, map, contacts, readiness, milestones, blockers) → C2 (`#1b`) Property/parcel authoring (expanded Studio nav drawn here) → C3 (`#6a`) Market·Economy (multi-geo indicator lists) → C4 (`#6b`) Market·Housing & comps (Redfin comps, competitive projects) → C5 (`#8a`) Costs (budget qty×rate + acquisition ledger) → C6 (`#7a`) Revenue (pricing w/ evidence + parcel sale schedule). **C7 Capitalization and C8 Reports not yet drawn.**

Other files: `Landscape UI Audit.dc.html` (+v2) — the original repo audit; `Land Concept Design Review.dc.html` — earlier options round; `land-review/tool-mapping.md` — 273-tool inventory mapped to designs; `uploads/land_session_transfer/` — Gregg's prototype HTMLs + locked decision register (D1–D12, conditions).

## Locked design conventions (do not re-litigate)
1. **Shell**: icon nav rail (56px, collapsible ↔ 232px expanded) | Landscaper chat rail (300px, full height, THE one conversational surface) | workspace. Mimics AI-chatbot 3-panel pattern (Claude/ChatGPT) deliberately.
2. **Project taxonomy**: Project · Property · Market · Costs · Revenue · Capitalization · Reports (top-bar seg + nav). NOT plan/economics/outputs. Family is set at project level; parcels only pick Type/Product.
3. **No Docket in nav** — docket tiles appear in-context on pages with ≥1 open decision (3b tile style: left accent border, blocker vs default-applied, in-tile Q&A). 3b page itself only exists when open decisions exist.
4. **Editable-field convention**: accent-bordered chip (dashed underline for picklists, e.g. "$/lot ▾"). Computed/derived values plain.
5. **"Analysis readiness"** (not "parcel table readiness") — % toward rendering ANY value conclusion/cashflow; per-section bars on C1; backed by `get_data_completeness`.
6. **Provenance tags everywhere**: read / derived / assumed / comp / benchmark / engineer-bid / library default. Honesty behaviors (flag unreadable docs, never silently infer) are pinned in DESIGN_RULES.md (Cowork side).
7. **Precedence**: recorded > approved > proposed. Underwriting models: no "closed" sale status; every parcel row has a sale date.
8. **One accent** (steel blue in mock), neutral dark surfaces, color reserved for land-use data. NOTE: mock's palette is a placeholder token set painted inline — project's bound DS are Modernist + Nocturne; the slice-1 file uses its own inline dark tokens deliberately (app-like), Nocturne-adjacent.
9. Market page: geography auto-resolves from project (no geo picker chips); indicators are multi-geo LISTS (US→AZ→MSA→county→city per tile); absorption analysis lives in Market, not Revenue. Sub-tabs: Economy | Housing & comps.
10. Workflow order: Market → Costs (budget) → Revenue (lot pricing + parcel sale schedule). Revenue events are PARCEL sales to builders, not lot absorption.

## Authoritative studio screen map (from `folderTabConfig.ts` + `ProjectContentRouter.tsx`) — frames MUST map to these
The studio shell renders ONLY the folder tree via `ProjectContentRouter`. There are **8 folders** (visibility filtered by project type / analysis type / value-add):
1. **Project** (home) — no subtabs → `ProjectTab` (Project Details card lives here)
2. **Property** — Income: Location · Market · Property Details · Rent Roll · Renovation(value-add) · Acquisition · | Land: Market · Land Use · Parcels · Acquisition
3. **Operations** (income, no subtabs → `OperationsTab`) / **Development·Sales** (land: Budget · Sales)
4. **Valuation** (income: Sales Comparison · Cost Approach · Income Approach · Reconciliation) / **Feasibility·Valuation** (land: Cash Flow · Returns · Sensitivity)
5. **Capitalization** — Debt · Equity
6. **Reports** — no subtabs
7. **Documents** — Documents(all/DMS) · Intelligence
8. **Map** — no subtabs
Also a routed screen: **IC** (`ICPage`, Investment Committee). NOT folder screens: **Settings** (legacy `/projects/[id]/settings` = ProjectDates + ProjectLandUseLabels), **Project Details** (a card on Home). Anything I draw as a "screen" must be one of the 8 folders/subtabs above (or IC) — otherwise label it an overlay/modal/card, like the C1-S settings overlay.

## Behavioral invariants — MUST survive the `design` wrapper (reuse the components, don't reimplement)
The `design` shell is a **restyle** of `studio` that reuses the same right-panel components (`ProjectContentRouter`, `PhysicalDescription`, `FloorPlanMatrix`, `OperatingStatement`, etc.) so backend-coupled logic can't be lost in the redesign. Named rules Gregg has flagged:
- **FloorPlanMatrix editability** (`FloorPlanMatrix.tsx`): data-source hierarchy keyed on **active/month-to-month leases**, not mere rent-roll presence. Active leases → aggregate from rent roll, badge "From Rent Roll", **read-only**. No active leases → `tbl_multifamily_unit_type` directly, badge "From Unit Types", **editable**. Do NOT make the matrix unconditionally editable.
- **PhysicalDescription**: 42 fields / 6 sections, click-to-edit inline, ratings as ★ dropdown, lot-size acres↔SF auto-convert (1 ac = 43,560 SF), per-section fill progress, extracted-value provenance.
- General: everything ingested (no "file only"); waterfall assumptions come from the project (no platform defaults); tabular inputs edit in place with no cell box; growth-rate fields = admin picklist + manual entry.

## Where we are / next steps (updated 2026-07-17)
Since the 07-14 note, drawn: C7 capital stack (K10 in Artifact Kit), C10 sales comparison, C11 income approach, C12 cash flow, MF rent roll (C2-MF), MF operating statement (C3-MF), **MF property details (C2-MF-D)**, Projects list (A3), standalone chat (folded into A1b), setup wizard (B-series). Artifact Kit built as a separate file (`Artifact Kit.dc.html`, K0–K10) — the panel-width artifact language. `design`-wrapper decision: **build A (restyle-only) first, then B (artifact-panel renderer) incrementally**; author files in Cowork, hand to Claude Code for repo wiring. Still to draw: Floor Plans grid, Renovation program, Reports (C8), Reconciliation, admin suite.

## Original next steps (superseded, kept for context)
1. **C7 Capitalization page** — next to draw (loans, equity, waterfall tiers; tools exist).
2. **C8 Reports** — after.
3. **Artifacts surface** — needs a home (recommended: slide-over right panel above workspace, not a 4th column). Not yet drawn.
4. **Then handoff package to Cowork** for implementation.
- Deferred: What-If/Scenario surface (22 tools, with valuation slice); Market rebuild w/ permits+pipeline tools (Gregg flags as "big deal", next slice); streets (v1.5); OCR'd staff report.

## Working method (matters to Gregg)
- **Always read the existing app's source before mocking a page** (`landscape/src/...`) — he checks field-by-field fidelity. Missing fields = rework. E.g. budget columns from `components/budget/ColumnDefinitions.tsx`, acquisition from `AcquisitionLedgerGrid.tsx`, profile from `[projectId]/components/tabs/ProjectTab.tsx`, contacts from `components/projects/contacts/`.
- Two demo projects appear in mocks: Peoria 1600 (Maricopa/Pinal 1,090ac MPC, structure-confirmation example) and Red Valley Ranch (164.34ac, 544 lots, 8 parcels, 2 phases — the main one).
- Screens are 1440×900 frames; content must fit (recurring verifier issue — check vertical budget when adding rows).
- Repo may disconnect between sessions; ask Gregg to re-attach if `local_ls landscape` fails.

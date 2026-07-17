# LANDSCAPE LAND — LOCKED DECISION REGISTER & SLICE 1 BRIEFING
**Source:** Claude.ai chat project, session VP (2026-07-11)
**Status:** Decisions locked by Gregg. This is a BRIEFING, not an implementation spec.
**Audience:** Cowork (Landscape project). CC executes only what Cowork specs after its own audit.

---

## ⚠️ READ FIRST — WHAT THIS DOCUMENT IS AND IS NOT

This document records product decisions and scope boundaries. It deliberately contains **no file paths, no schema references, no component names** — those must come from Cowork's own audit of the live codebase per §17.7 of the project instructions (schema audit before architectural proposals, active-code-path trace before any spec body). The strategy side has no repo access; nothing here should be treated as a claim about current code structure.

**Required first step on the coding side:** a read-only discovery audit of the existing map engine, drawing/measure tools, overlay engine (control-point fitting), county tax-parcel integration, land use taxonomy library (families → types → products), and the parcel data model — reported in plain English to Gregg before any implementation phasing is proposed.

---

## 1. PRODUCT DECISION (CONTEXT)

Landscape will ship **property-type-specific front doors** over shared infrastructure. The land development product is designed as if land is the only property type: its own layout, its own workflow spine, zero income-property compromises. Shared and untouched: database, calculation engines, DMS/extraction, knowledge layer, map engine, land use taxonomy. Shared design kit: existing component library and color tokens (CoreUI 5.x per project standards) — the doors share parts, not floor plans.

This session produced 10 disposable HTML prototypes (intake paradigms, decision docket, MPC parcel-table workflows on the Peoria 1600 exhibit, Red Valley Ranch entitlement-chain intake, map-driven navigation, spatial parcel-table authoring, street objects with derived quantities). They are interaction evidence, not code to reuse.

## 2. LOCKED DECISIONS (D1–D8)

| # | Decision | Locked answer |
|---|---|---|
| D1 | First slice | App-level map + boundary-first project creation + parcel table authoring |
| D2 | Conversation placement | Workspace owns the center in the land product. Chat = side rail during intake, summonable elsewhere. No chat-in-center layout for land. |
| D3 | Decision docket | Product-wide standard pattern for all judgment calls: blocker vs. default-applied tiers, per-tile Q&A affordance, accept-all-recommended, resolution recorded with rationale. |
| D4 | Geometry sources v1 | Reuse existing Landscape geometry machinery only: county tax parcels, draw/measure tools, overlay engine w/ control points — promoted to app-level scope; drawn shapes promoted from annotations to first-class records (a drawn parcel boundary IS a parcel-table row). Engineer-supplied CAD/GIS accepted when available. Exhibit-image auto-vectorization: deferred. |
| D5 | Streets & quantities | v1.5, after parcel workflow is in daily pilot use. (Design intent already prototyped: street segments as first-class map objects, class → standards-library defaults for ROW/pavement/walk, per-segment derived quantities, reconciliation loop against engineer quantity tabs.) |
| D6 | Pilot | Red Valley Ranch (CBLF1). Real entitlement record already located in the project folders: PAD narrative, pre-plat narrative (parcel data source: 8 parcels / 544 lots / 164.34 ac), preliminary plat SUB21-20, extension PPE23-01, Phase 1 final plat SUB24-09 (287 lots / 72.35 ac / 34 tracts). Precedence rule established: recorded > approved > proposed. |
| D7 | Design kit | Existing app kit + tokens. No new visual identity. |
| D8 | v1 exclusions | Automated takeoff from linework; exhibit-image shape extraction; MU vertical modeling; offsite/regional cost sharing; multi-project portfolio views; any income-property workflow. |

## 3. SLICE 1 — SCOPE STATEMENT

**"A land deal is born on the map."**

In scope:
1. App-scoped workspace map (map engine exists; the new part is a home for it outside any project) with county tax parcel layer and search.
2. Project creation from geometry: select tax parcel(s) OR draw a boundary → creates a land project with boundary geometry, gross acreage, and source parcel identifiers pre-populated.
3. Parcel table authoring, spatially: multi-select parcels on the plan → one attribute form applies to all selected; optional "paint" interaction (product brush assigns family/type/product/density in one click). Attribute validation via the existing canonical land use library (families → types → products, customizable), density defaults per product, live yield calc, grouped/flat table views in sync with the map.
4. Docket pattern v1: judgment calls surface as tiles (blocker / default-applied), with Q&A affordance and recorded resolutions.
5. Overlay engine available inside the new project for fitting a plan exhibit (existing control-point workflow) as the visual reference under drawn parcels.

Out of scope for slice 1: document extraction/intake pipeline changes; streets/quantities; absorption/takedown UI; any output work. (Takedown-tile and street interactions are prototyped and parked for later slices.)

Human gates: Gregg approves (a) the discovery-audit findings, (b) the proposed phasing, (c) each phase completion demoed against the Red Valley pilot.

## 4. WORKFLOW SPINE (FOR ORIENTATION — LATER SLICES)

0. Find & create (slice 1) → 1. Intake (docket, precedence, honesty tags, scanned-file flagging) → 2. Structure & parcel table (Area → Phase → Parcel confirmed, never silently inferred) → 3. Site systems & quantities (v1.5) → 4. Economics (existing engines) → 5. Analysis & outputs (design exercise after intake).

Canonical taxonomy reminder: land hierarchy is **Area → Phase → Parcel** (parcel IDs decode as Area.Phase+Parcel, e.g., 2.107 = Area 2, Phase 2.1, Parcel 07). Do not introduce alternative terms.

## 5. SUPPORTING MATERIAL PRODUCED THIS SESSION

- Locked register (plain-English HTML) — Gregg's copy.
- Engineering deliverables request one-pager (LandXML / DWG-DXF / GeoJSON / quantity spreadsheets / vector-PDF rule) — feeds D4's "engineer files when available" path.
- Street derivation worksheet (method + provenance tags: stated/measured/derived/assumed + reconciliation loop) — design reference for v1.5.
- Prototypes 1–10b (HTML, disposable).

*End of briefing. Next artifact expected from the coding side: read-only discovery audit report, plain English, before any phasing proposal.*

# Landscape Session Log

> Running log of development sessions. Newest first.
> Trigger: Say **"Document"** in any chat to add an entry.
> Claude Projects sessions use header: `Session [code] — [date] — Title (Claude Projects)`

## Alpha Cleanup + CLAUDE.md Sync — 2026-03-27

**What changed:**
- Verified all 20 report generators have real SQL with graceful degradation (Mar 25 session log incorrectly claimed 14 were stubs)
- Verified waterfall calc endpoint is fully wired (Next.js proxy → Django → Python engine) — was incorrectly flagged as 404
- Created `backend/apps/reports/migrations/0006_update_data_readiness.py` — updates stale `data_readiness` flags for all 20 report codes
- Migrated Operations save endpoints to Django: created `backend/apps/financial/views_operations.py` (2 views: `operations_inputs`, `operations_settings`), wired in `urls.py`, updated `useOperationsData.ts` and `OperationsTab.tsx` to call Django
- Updated CLAUDE.md: alpha readiness ~90%, Operations save ✅, Reports ✅, Waterfall ✅, corrected reportlab (not WeasyPrint), removed stale tech debt items
- CC verified all 7 checks pass: migration applied, both Django endpoints respond, waterfall not 404, data_readiness flags correct, report preview returns JSON, `npm run build` clean
- Reconciled 24 Claude Projects decision log sessions (Mar 11–25) into this session log

**Open items:**
- Operations GET endpoint (1,303-line P&L route) still on legacy Next.js — separate migration task, not alpha blocker
- Scanned PDF / OCR pipeline not implemented (only remaining alpha blocker)

**Cumulative Unfinished Business:**

🔴 Blocked (needs input or external action):
- Salman Ahmad docs color matching — blocked on: need MF user guide .docx with color metadata uploaded — last touched: 3/24 (from Claude Projects) ⚠️ stale

🟡 In Progress (started but incomplete):
- Operations GET migration — status: save endpoints migrated to Django, GET (1,303-line P&L) still on Next.js — next step: draft CC prompt to migrate GET route — last touched: 3/27
- Scanned PDF / OCR pipeline — status: OCRmyPDF identified as solution, not yet implemented — next step: build preprocessing step in `backend/apps/documents/` before `core_doc_text` ingestion — last touched: 3/20
- User guide production — status: MF Operations chapter complete, master outline done — next step: execute `COWORK_USER_GUIDE_BUILD_XK14.md` for full 14-chapter build — last touched: 3/16 (from Claude Projects, session XK) ⚠️ stale
- Conversational UI redesign — status: concept/spec complete, 6 HTML mockups produced — next step: begin Phase 1 layout shell implementation — artifact: `LANDSCAPE_CONVERSATIONAL_UI_CONCEPT_RX.md` — last touched: 3/23 (from Claude Projects, session RX)
- Thread list UI missing from Landscaper panel — status: no browse/switch thread capability — next step: build thread list sidebar in LandscaperPanel — last touched: 3/18
- Thread auto-selection race condition — status: new blank threads created before API returns existing threads — next step: debug mount sequence in Landscaper panel — last touched: 3/18

🟠 Queued (designed/specified but not started):
- DMS version control — artifact: `CC_DMS_VERSION_CONTROL_XR2.md` — waiting for: CC execution (from Claude Projects, session XR) ⚠️ stale
- Rent comp harvester implementation — artifact: `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md` — waiting for: schema migration on `tbl_rental_comparable` + CC execution (from Claude Projects, session GR)
- DMS Intelligence Layer — artifact: `COWORK_DMS_INTELLIGENCE_LAYER_KR17.md` — waiting for: Cowork execution (from Claude Projects, session KR)
- Acquisition picklist migration — artifact: `COWORK_ACQUISITION_PICKLIST_MIGRATION_GX5.md` — waiting for: Cowork/CC execution (from Claude Projects, session GX)
- Platform Intelligence Agents — artifact: `QWEN_MARKET_INTELLIGENCE_AGENT_PL1.md` — waiting for: Gern/Qwen execution (from Claude Projects, session PL) ⚠️ stale
- Platform knowledge audit — artifact: `CC_PLATFORM_KNOWLEDGE_AUDIT_XK18.md` — waiting for: CC execution (from Claude Projects, session XK) ⚠️ stale
- CoreUI audit — artifact: `COREUI_AUDIT_SKILL.md` — waiting for: OpenClaw/Qwen execution (from Claude Projects, session WX) ⚠️ stale
- Project templates seed — status: full design done (50-unit LA MF), brief needs regeneration with final numbers — waiting for: Cowork rebuild of `LANDSCAPE_TEMPLATES_COWORK_BRIEF.docx` (from Claude Projects) ⚠️ stale

🔵 Verify (completed but unverified):
- Dropzone fix (Landscaper Panel + Content Area) — needs: live test on all tabs — last touched: 3/19
- Redfin SFD pricing fix for land dev — needs: live test on Weyyakin project — last touched: 3/19 (from Claude Projects)
- Equity waterfall input components — needs: confirm restoration — last touched: 3/11 (from Claude Projects, session VF) ⚠️ stale
- Loan scope UI save round-trip — needs: browser test (save → reload → verify containerIds) — last touched: 3/11
- Geo auto-seeding end-to-end — needs: live test with Ketchum project (Census API calls need network) — last touched: 3/20
- Image reclassification — needs: "Rescan All PDFs" to run through updated classification prompt — last touched: 3/19

---

## Session KR — 2026-03-25 — Workflow Optimization (Claude Projects)

**Decisions:** Current workflow is Cowork (~90%), Claude Projects (architecture/strategy/KB), Terminal/CC (mechanical ops + DB). Permission prompts provide zero security value — `--dangerously-skip-permissions` or Auto Mode recommended for CC. Daily session log should be enhanced to include Claude Projects decision context via decision log reconciliation. Daily "unfinished business" prompt needed.

**Open questions:** Unfinished business prompt design (in progress during session)

---

## DB-Driven Report System (20 Reports) — 2026-03-25

**What was discussed:**
- Built and deployed the full DB-driven report system: 20 report definitions seeded into `tbl_report_definition`, property-type routing (LAND sees 13 reports, MF sees 14), 9 report categories, two-panel ReportsTab UI (ReportBrowser + ReportViewer).
- Created `PreviewBaseGenerator` base class with SQL helpers, formatting utilities, and section builders. All 20 generators inherit from it and implement `generate_preview()` returning structured JSON consumed by the React frontend.
- All 20 generators have real SQL queries with graceful degradation. CC verified all 8 success criteria passed.

**Open items:**
- ~~14 generators are stubs~~ — RESOLVED 3/27: all 20 have real SQL
- ~~PDF export pipeline not yet wired~~ — RESOLVED 3/27: reportlab PDF + openpyxl Excel in preview_base.py
- ~~CLAUDE.md needs update~~ — RESOLVED 3/27

---

## Session GX — 2026-03-24 — Acquisition Tab + Picklist Migration (Claude Projects)

**Decisions:** Acquisition Ledger event types migrate from hardcoded to `tbl_system_picklist`. Use existing `parent_id` column for grouping. `event_type` stores picklist codes not display names. "Closing Date" → "Closing" throughout.

**Artifacts:** `COWORK_ACQUISITION_PICKLIST_MIGRATION_GX5.md`

---

## Session VR — 2026-03-24 — ARGUS Report Catalog (Claude Projects)

**Decisions:** 106 reports across 3 ARGUS products (Enterprise 56, Developer 32, EstateMaster 18), ~75 unique after dedup. Three-phase Landscape implementation roadmap: 15 → 40 → 50+ reports.

**Artifacts:** `ARGUS_COMPREHENSIVE_REPORT_CATALOG.md`

---

## 2026-03-24 — ARGUS vs Landscape Technical Brief (Claude Projects)

**Decisions:** Landscape contains all inputs/calculations across 3-app ARGUS suite. ~35 capability rows mapped. Beyond ARGUS: 5 domains (AI/Doc Intelligence, Comparables, DMS, GIS, Platform Architecture). Estimated 85-90% cost reduction.

**Artifacts:** Technical brief (Word doc, 5 sections)

---

## 2026-03-24 — Alpha Tester Emails (Claude Projects)

**Decisions:** Mark Stapp email: avoid "appraisal" framing entirely, describe analytical foundation in plain language. Platform URL: https://landscape-hazel.vercel.app

**Artifacts:** Salman Ahmad email + architecture brief (2 docx files), Mark Stapp email draft

**Open questions:** Salman docs need color matching to MF user guide — pending .docx with color metadata

---

## 2026-03-24 — Cowork Project Instructions (Claude Projects)

**Decisions:** Adapted Claude Project Instructions v2.3 for Cowork. Key changes: §1.1 Capability Boundaries (no terminal/git/DB), CC prompts reframed as drafting, `.cjs` docx pattern added.

**Artifacts:** `COWORK_LANDSCAPE_PROJECT_INSTRUCTIONS_v1.0.md`

---

## 2026-03-23 — HEALTH CHECK FAILURE

**Failed checks:**
- Both servers DOWN — Next.js (port 3000) and Django (port 8000) not responding
- All 14 endpoint checks skipped due to servers being unavailable

**Passing checks:** 0 of 14 passed

**Possible causes:**
- Servers were not started in the Cowork VM environment (this is a sandboxed session — servers need to be launched manually)
- No recent commits suggest breaking changes — last commit was `3f1d84f chore: bump version to v0.1.09` (3 days ago)

---

## Session GV — 2026-03-23 — Altus/ARGUS Competitive Intelligence (Claude Projects)

**Decisions:** ARGUS Intelligence base tier included with every Enterprise subscription; Portfolio Manager and Benchmark Manager are paid add-ons. New CEO Mike Gordon, $800M capital return, Appraisals sold to Newmark. No named individuals in competitive materials.

**Artifacts:** `ALTUS_COMPETITIVE_INTELLIGENCE_UPDATE_GV5.docx`

---

## Session RX — 2026-03-23 — Conversational UI Redesign (Claude Projects)

**Decisions:** Studio tile/tab structure abandoned. Target: three-panel layout (collapsible sidebar, Landscaper chat center, dynamic worksheet right). Proposal cards in chat with "Go ahead/Hold on" confirmation. Float-to-window worksheets (`/projects/[id]/worksheet/[module]`). Phased implementation: Phase 1 layout shell, Phase 2 float-to-window, Phase 3 inline artifacts + Landscaper integration.

**Artifacts:** `LANDSCAPE_CONVERSATIONAL_UI_CONCEPT_RX.md`, 6 interactive HTML mockups

**Open questions:** Implementation not started — concept/spec phase only

---

## 2026-03-22 — Cowork Migration Assessment (Claude Projects)

**Decisions:** Migration from Claude.ai project to Cowork project NOT recommended. Two-workspace model: Claude.ai = primary brain (architecture, judgment, KB queries), Cowork = task execution (batch files, user guide, screenshots).

---

## Geo Auto-Seeding + Micropolitan Support + Location Tab Fixes — 2026-03-20

**What was discussed:**
- Multiple interconnected Location tab bugs traced and fixed: `jurisdiction_city` not syncing with `city` on project profile PATCH, mutation approval UI not rendering in thread-based `ai_handler.py`, state name normalization ("Arizona" vs "AZ") breaking geo_xwalk lookups, and location analysis not persisting on navigation.
- Built a complete auto-seeding system for `geo_xwalk` — any US city now auto-resolves its full geographic hierarchy (US → State → MSA/μSA → County → City) via Census Bureau APIs on first Location tab load. No manual seeding required.
- Added Micropolitan Statistical Area (μSA) support throughout the stack.

**Open items:**
- Test end-to-end with Ketchum project on running dev server (Census API calls need network access)
- Market data ingestion for Micropolitan areas — FRED/BLS series codes for μSAs not yet mapped
- Full Census CBSA delineation file parsing (currently uses hardcoded μSA fallback + dynamic geocoder extraction)

---

## Satellite Imagery Research + Rent Comp Harvester POC — 2026-03-20

**What was discussed:**
- Rent comp harvester POC tested across 4 sessions. Redfin rentals API validated as primary data source — 200-700+ properties per polygon query. Polygon search is only reliable approach.
- Schema migration needed on `tbl_rental_comparable`: missing 10+ columns.
- Satellite absorption concept validated conceptually but not POC-tested. Sentinel-2 sufficient for construction detection.

**Key artifacts:**
- `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md` — POC v2 prompt (Redfin rentals API)
- `LANDSCAPE_INTELLIGENT_MARKET_DATA_HARVESTING_CONCEPT.md` — Feature concept doc
- `backend/tools/redfin_ingest/rental_comp_poc_v2.py` — Working POC script

**Open items:**
- Scope rent comp harvester implementation — schema migration, backend service, API endpoint, frontend, Landscaper tool
- Test Redfin rentals API from Railway/production environment
- Evaluate paid API fallback (RentCast, HelloData, Dwellsy API IQ)
- Satellite POC — Maricopa API + Google Earth Engine (future session)

---

## Appraisal Extraction Pipeline — 2026-03-20

**What was discussed:**
- Built end-to-end appraisal/URAR document extraction support for Land Dev projects
- Created 4 new Landscaper tools for appraisal knowledge
- Added URAR-specific extraction prompt hints in `extraction_service.py`

**Open items:**
- `tbl_valuation_reconciliation` lacks unique constraint on `project_id`
- Comparable sales from appraisals not yet routed to structured `tbl_comparables`
- `source_page` still not populated by extraction pipeline
- No REST endpoint to query cross-project market data yet

---

## Session GR — 2026-03-20 — Satellite Imagery + Rent Comp Harvester (Claude Projects)

**Decisions:** Sentinel-2 (10m, free) sufficient for construction detection. Target: Sunbelt horizontal growth (Phoenix, DFW, Houston) — LA dropped. Redfin rentals API validated (231 Hawthorne, 709 Phoenix results). Polygon search only reliable approach. RentCafe/Yardi GA4 = best enrichment. "Appraiser" label too narrow — analytics serve developers, investors, lenders equally.

**Artifacts:** `LANDSCAPE_INTELLIGENT_MARKET_DATA_HARVESTING_CONCEPT.md`, `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md`, `backend/tools/redfin_ingest/rental_comp_poc_v2.py`

**Open questions:** Schema migration for `tbl_rental_comparable` not executed. Redfin API needs Railway/production test. Satellite POC not tested.

---

## Session KR — 2026-03-20 — DMS Intelligence Layer Design (Claude Projects)

**Decisions:** Universal document intelligence: any DMS upload auto-analyzed in background, surfaced via flag indicator. Flag click opens Landscaper triage. Screenshot drop zone: drag PNG → modal asks "use on page" or "add to DMS". Minimal friction UX, short naming, defer complexity, reuse infrastructure.

**Artifacts:** `COWORK_DMS_INTELLIGENCE_LAYER_KR17.md` — 12 sections, 5 phases, 6 deliverables

---

## Hierarchy Visibility, Dropzone Restrictions, Parcel Import Tools — 2026-03-19

**What was discussed:**
- Fixed hierarchy toggle not hiding Areas/Phases CCards
- Removed restrictive MIME-type accept filters from all 5 dropzone components
- Built 3 new Landscaper parcel import tools with modeling advisor instructions

**Open items:**
- Workbench tile tab config for land dev parcels — deferred
- `livable_sf` column migration on `tbl_parcel`
- Field registry CSV additions for parcel-level extraction
- Full spreadsheet extraction pipeline integration

---

## Documents Media Gallery — Visibility Fix, Favorites, Classification, Rescan — 2026-03-19

**What was discussed:**
- Fixed gallery clipped by CSS overflow
- Rewrote classification prompt to prioritize real photographs
- Added favorites (localStorage) and skip-deleted rescan option

**Open items:**
- Existing misclassified images need "Rescan All PDFs" run
- Django endpoint for doc 118 media hanging — possible performance issue
- Favorite state is client-side only (localStorage)

---

## Demographics On-Demand Loading + County Selector Fix — 2026-03-19

**What was discussed:**
- Expanded demographic loading from 4 states to all 50 + DC
- Built on-demand loading with polling UI
- Fixed county parcel selector visibility (Phoenix MSA only)

**Open items:**
- Only 5-mile ring visible on map UI (1 and 3-mile data exists in backend)
- Texas demographic data not yet loaded

---

## Dropzone Fix — Landscaper Panel + Content Area — 2026-03-19

**What was discussed:**
- Restored dropzone to LandscaperPanel with react-dropzone + useFileDrop()
- Fixed DropZoneWrapper CSS sizing inside flex parent

**Open items:**
- Needs live testing to confirm both dropzones trigger UnifiedIntakeModal on all tabs
- Verify CollapsedLandscaperStrip auto-expand still works on file drop

---

## 2026-03-19 — Sun Valley Issues + Redfin Fix (Claude Projects)

**Decisions:** Three issues identified: PDF ingestion gap (structured data ignored), missing Location sub-tab on land dev, broken Redfin SFD pricing. Redfin bug root cause: `minYearBuilt` default set to `currentYear - 2` filters out older stock. Full 4-file chain traced. PDF ingestion gap: preference for triage flow where Landscape surfaces categorized findings, user decides what to load.

**Artifacts:** Cowork handoff prompt for Redfin SFD fix (5 verification tests against Weyyakin project)

---

## 2026-03-19 — Interactive Map Navigation Research (Claude Projects)

**Decisions:** 35-tool inventory, 9 interaction patterns compiled. MapLibre GL JS confirmed. Deepblocks = closest analog but analytically shallow. Landscape's analytical depth (DCF, multi-phase hierarchy, time-series cash flow) = distinct whitespace. Click-to-navigate pattern: clicking spatial polygons to navigate hierarchy and edit project data = target UX.

**Artifacts:** Consolidated research document (35 tools, 9 patterns, executive summary)

---

## 2026-03-19 — Teravalis Demo / SAM Site Plan Extraction (Claude Projects)

**Decisions:** SAM (`segment-geospatial` v0.10.7, `vit_b` model, MPS backend) selected for polygon extraction. OpenCV color segmentation rejected (293 noisy polygons). Fastest demo path: obtain shapefiles from Teravalis team → GeoJSON → MapLibre layer → container hierarchy. Mac Mini M4 24GB = target machine.

**Open questions:** SAM extraction script + outputs not yet produced

---

## Intake Modal Fixes + Knowledge Search + Comp Pipeline — 2026-03-18

**What was discussed:**
- Fixed .xlsx upload failure, intake modal closing during form interaction, extraction queue trash button, knowledge intents creating queue entries
- Added RESPONSE STYLE, MANDATORY TOOL USE, AVOIDING REDUNDANCY to Landscaper system prompt
- Made `query_platform_knowledge` search both reference corpus and user-uploaded docs
- Fixed cap rate normalization in `update_sales_comparable`

**Open items:**
- Thread list UI missing from Landscaper panel — no way to browse/switch threads
- Thread auto-selection race condition on mount
- Landscaper response vanishing on refresh — related to thread race condition
- `docs/diagnostics/xlsx-upload-failure-2026-03-18.md` can be deleted

---

## Session ZK — 2026-03-17 — DMS Upload Failure Debug (Claude Projects)

**Decisions:** XLSX drag-drop failing with empty `{}` response from Django. File uploads to UploadThing successfully — failure is in Django document record creation. Hypothesis: missing `doc_type` or serializer validation failure.

**Artifacts:** `CC_DMS_XLSX_UPLOAD_DEBUG_ZK.md`

**Open questions:** Root cause not confirmed — needs Railway log inspection

---

## Session XK — 2026-03-16 — Alpha Documentation + User Guide + Platform Knowledge (Claude Projects)

**Decisions:** Alpha welcome copy finalized (Ferrari-builder analogy). Feedback: #FB tag in Landscaper → Discord. User guide: 14 chapters, 4 parts, PDF-exportable, function-by-function. Route: `/guide` (not `/documentation`). MF Operations chapter = formatting template. Platform knowledge: shared baseline + per-user extensibility, new-user seeding hook.

**Artifacts:** `LANDSCAPE_USER_GUIDE_MASTER_OUTLINE.md`, `COWORK_USER_GUIDE_BUILD_XK14.md`, `CC_PLATFORM_KNOWLEDGE_AUDIT_XK18.md`

**Open questions:** Platform knowledge migration pending Phase 0 audit

---

## 2026-03-16 — Google Stitch MCP / UI Skill Evaluation (Claude Projects)

**Decisions:** UI-UX-Pro-Max skill rejected — no awareness of existing component structure or CoreUI compliance. CoreUI theme token swap recommended for safe visual refresh. Standalone marketing/pitch page identified as safe use case. Key insight: flawless workflow execution more impactful for investor demos than visual rethemes.

---

## 2026-03-15 — Landscaper Toolset Redesign Recovery (Claude Projects)

**Decisions:** Tool filtering re-enabled after "nuclear option" period (Mar 9). Counts reduced from 217 (all tools) to 128-155 (property-type filtered). Landscaper switched from Opus to Sonnet 4. §19 Token Economy added to project instructions. System prompt trim initiated.

---

## Session WB — 2026-03-14 — Silent Write Failure (Site Acres) (Claude Projects)

**Decisions:** Confirmed §17 ALLOWED_UPDATES pattern. Likely cause: field name doesn't match `acres_gross` in `tbl_parcel`. Ownership_type refusal is separate Landscaper guard rail.

**Open questions:** Merge status of prior ALLOWED_UPDATES fix unconfirmed

---

## Session QT — 2026-03-14 — Reports System Design (Claude Projects)

**Decisions:** 20-report master inventory. "Export what I see" screen-level Excel = separate capability. Sources & Uses = foundational priority. TMR Investors Excel format = design reference. Phase 0 pilot: 3 screenshots first. Design all 20 now, wire live data as calculations come online.

**Artifacts:** `COWORK_REPORT_DISCOVERY_AND_DESIGN_QT9.md`

---

## 2026-03-14 — OpenClaw / Qwen Hardware Comparison (Claude Projects)

**Decisions:** PC: i9-9900K, RTX 4070 12GB VRAM, 32GB RAM. Qwen2.5-Coder-7B at Q6/Q8 viable on GPU. 32B requires significant CPU offloading.

**Open questions:** Mac Mini vs PC final recommendation never completed

---

## Session PL — 2026-03-13 — Platform Intelligence Agents (Claude Projects)

**Decisions:** 6 agents designed: Market Intel, Comp Research, Doc Intel, Underwriting, Planning/Regulatory, Portfolio. Market Intelligence is priority #1. Celery absent from codebase — keep agents in existing `market_agents` service. Agents are advisory never authoritative. `agent_insight` + `agent_run_log` = two new core tables. Rule-based Python first; LLM reserved for natural language synthesis only. Gern/Qwen runs locally, writes to Railway PostgreSQL.

**Artifacts:** Architecture spec (Word doc, 10 sections), `QWEN_MARKET_INTELLIGENCE_AGENT_PL1.md`

**Open questions:** UI surface for displaying agent insights

---

## 2026-03-13 — Loan Save Failure Debug (Claude Projects)

**Decisions:** Confirmed `debt_facilities` table (Phase 5 Capitalization) is relevant, not `tbl_loan` (Phase 1). Need HTTP status + response body from DevTools for targeted fix.

**Open questions:** Root cause not identified — awaiting browser DevTools output

---

## Session RJ — 2026-03-12 — Field Catalog Document Scoping (Claude Projects)

**Decisions:** Classification: Option C (input, display-only, calculated). Format matches user manual Chapter 10 MF document. Claude designs, Cowork executes.

**Open questions:** Chapter 10 MF document location disputed

---

## 2026-03-12 — CoStar Comp Search for LA Apartments (Claude Projects)

**Decisions:** MF, arms-length, last 12 months, 5-149 units, year built 1971-2009. 6-city rent control exclusion list (LA, Santa Monica, West Hollywood, Beverly Hills, Inglewood, Culver City). Hawthorne correctly excluded from list.

---

## 2026-03-12 — Project Templates Feature Design (Claude Projects)

**Decisions:** Shadow project pattern: `is_template = true` flag. Templates edited through normal project UI, cloned via deep-copy API. First seed: 50-unit LA MF property (GPR $1,824K, vacancy 5%, NOI $1,230K, 5.0% cap → $24.6M). Management 3% EGI. Replacement reserve $300/unit/yr.

**Artifacts:** `LANDSCAPE_TEMPLATES_COWORK_BRIEF.docx` (needs rebuild with final numbers)

**Open questions:** Per-category growth rate overrides (Prop 13 tax, insurance) — future requirement

---

## DMS Drag-to-Reclassify — 2026-03-11

**What was discussed:**
- Audited the full drag-to-reclassify implementation. Feature is already fully built — no code changes needed.

**Open items:**
- None

---

## Loan Scope UI + Cash Flow Stacking — 2026-03-11

**What was discussed:**
- Added container assignment UI to `LoanCard.tsx` — radio for "Entire Project" + area/phase checkboxes
- Wired `container_ids` into save payload, verified loan stacking in both cash flow services

**Open items:**
- Haven't tested the full save round-trip in browser
- Income property cash flow doesn't filter loans by container (acceptable for MF, may need attention for mixed-use)

---

## Waterfall Fixes — 2026-03-11

**What was discussed:**
- Created session logging system: `docs/daily-context/session-log.md`
- Added "Document" command instructions to CLAUDE.md

**Open items:**
- None

---

## Add Parcel Cascading Taxonomy — 2026-03-11

**What was discussed:**
- Fixed runtime error in `addParcelFromRow`
- Implemented progressive field reveal and cascading taxonomy dropdowns

**Open items:**
- None

---

## Session FH — 2026-03-11 — Cash Flow Pipeline Architecture Doc (Claude Projects)

**Decisions:** No consolidated cash flow pipeline documentation existed — scattered across ~5 prior sessions. Created single authoritative reference covering both project types: DCF, debt service, net cash flow, waterfall, partner distributions.

**Artifacts:** `LANDSCAPE_CASHFLOW_PIPELINE_ARCHITECTURE.md`

**Open questions:** 8 known gaps documented (priority-rated). Reversion PV bug fix convention documented.

---

## Session VF — 2026-03-11 — Equity Waterfall Interface Recovery (Claude Projects)

**Decisions:** Confirmed waterfall input components had been deleted from UI. Located three prior design sessions. Status left pending verification.

**Open questions:** Were deleted input components restored? Status unclear.

---

## Session XR — 2026-03-11 — DMS Version Control Implementation (Claude Projects)

**Decisions:** Full drag-to-link version control designed but never shipped (0 of 4 pieces implemented). CC prompt drafted with mandatory Phase 0 discovery to account for March 7-8 sprint changes.

**Artifacts:** `CC_DMS_VERSION_CONTROL_XR2.md` — 4 phases

**Open questions:** IntakeChoiceModal and UploadStagingContext flagged as regression risks

---

## Session WX — 2026-03-11 — CoreUI Audit Skill for OpenClaw (Claude Projects)

**Decisions:** 9 violation types defined. Skip rules for prototype/preview/legacy files. Specific routes excluded. P1/P2/P3 remediation prioritization.

**Artifacts:** `COREUI_AUDIT_SKILL.md`

---

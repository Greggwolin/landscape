# Landscape Session Log

> Running log of development sessions. Newest first.
> Trigger: Say **"Document"** in any chat to add an entry.

## 2026-03-23 — HEALTH CHECK FAILURE

**Failed checks:**
- Both servers DOWN — Next.js (port 3000) and Django (port 8000) not responding
- All 14 endpoint checks skipped due to servers being unavailable

**Passing checks:** 0 of 14 passed

**Possible causes:**
- Servers were not started in the Cowork VM environment (this is a sandboxed session — servers need to be launched manually)
- No recent commits suggest breaking changes — last commit was `3f1d84f chore: bump version to v0.1.09` (3 days ago)

---

## Geo Auto-Seeding + Micropolitan Support + Location Tab Fixes — 2026-03-20

**What was discussed:**
- Multiple interconnected Location tab bugs traced and fixed: `jurisdiction_city` not syncing with `city` on project profile PATCH, mutation approval UI not rendering in thread-based `ai_handler.py`, state name normalization ("Arizona" vs "AZ") breaking geo_xwalk lookups, and location analysis not persisting on navigation.
- Built a complete auto-seeding system for `geo_xwalk` — any US city now auto-resolves its full geographic hierarchy (US → State → MSA/μSA → County → City) via Census Bureau APIs on first Location tab load. No manual seeding required.
- Added Micropolitan Statistical Area (μSA) support throughout the stack. Ketchum, ID (Hailey μSA) was the test case — `cbsa_lookup.py` only covered Metropolitan areas, `geo_xwalk` had zero Idaho coverage, and no `MICRO` geo_level existed anywhere.
- Created `src/lib/geo/bootstrap.ts` — TypeScript port of `geo_bootstrap.py` with μSA support baked in. Uses Census ACS API for place FIPS, Census Geocoder for county + dynamic CBSA extraction, plus hardcoded fallback for common resort/mountain μSAs.
- Auto-bootstrap wired into `geos/route.ts`: on cache miss, calls Census APIs, upserts records, re-queries. Also removed the 404 on "no market data" — now returns geo hierarchy with a notice so Location tab can display scope even before data ingestion.
- LocationSubTab now dynamically swaps T2 tier label to "Micropolitan Statistical Area (μSA)" when geo data includes a MICRO target.

**Files created:**
- `src/lib/geo/constants.ts` — FIPS codes, state mappings, `normalizeState()`, `GEO_LEVEL_ORDER` with MICRO
- `src/lib/geo/bootstrap.ts` — Census API auto-resolution + geo_xwalk upsert
- `src/lib/geo/index.ts` — Barrel export
- `src/app/api/market/geos/bootstrap/route.ts` — POST endpoint for explicit bootstrap

**Files modified:**
- `src/app/api/projects/[projectId]/profile/route.ts` — jurisdiction_* sync on PATCH
- `src/app/api/market/geos/route.ts` — MICRO in ORDER, auto-bootstrap on miss, removed 404 on no data
- `src/app/projects/[projectId]/components/tabs/LocationSubTab.tsx` — MICRO in GEO_LEVEL_ORDER, dynamic T2 tier label, MICRO series codes
- `backend/apps/landscaper/ai_handler.py` — mutation_proposals tracking for Level 2 autonomy UI
- `services/market_ingest_py/market_ingest/cbsa_lookup.py` — COUNTY_TO_MICRO dict, `get_micro()`, `get_cbsa_or_micro()`
- `services/market_ingest_py/market_ingest/geo_bootstrap.py` — MICRO geo_level support
- `services/market_ingest_py/market_ingest/geo.py` — MICRO in hierarchy order

**Open items:**
- Test end-to-end with Ketchum project on running dev server (Census API calls need network access)
- Market data ingestion for Micropolitan areas — FRED/BLS series codes for μSAs not yet mapped
- Full Census CBSA delineation file parsing (currently uses hardcoded μSA fallback + dynamic geocoder extraction)
- CLAUDE.md needs update: geo auto-seeding feature, MICRO geo_level, new `src/lib/geo/` library

---

## Satellite Imagery Research + Rent Comp Harvester POC — 2026-03-20

**What was discussed:**
- Wide-ranging exploration triggered by Reddit post about replicating hedge fund satellite imagery analysis. Led to two feature concepts: (1) satellite-based absorption intelligence for land dev, and (2) automated rent comp harvesting for multifamily.
- Rent comp harvester POC tested across 4 sessions (GR21, GR30, GR37, GR39). Redfin rentals API (`/api/v1/search/rentals?poly={bbox}&num_homes=100`) validated as primary data source — returns 200-700+ properties with rent ranges per polygon query. Works nationwide; `market` parameter is ignored when polygon is provided. No API key needed.
- Polygon search confirmed as the only reliable approach. Region_id resolution is unreliable (unpredictable ID-to-city mapping, autocomplete returns 403 from server environments). Lat/lng → bounding box → polygon is deterministic and works from any environment.
- RentCafe/Yardi GA4 data attributes identified as best enrichment source for institutional comps (~15% of properties have own websites, but those are disproportionately the ones appraisers care about). Deterministic regex parser on `setGA4Cookie` calls — no LLM needed.
- Schema migration needed on `tbl_rental_comparable`: missing source_type, source_url, redfin_rental_id, redfin_property_id, google_place_id, as_of_date, last_refreshed, available_units, rent_range_min, rent_range_max, is_active.
- Satellite absorption concept validated conceptually but not POC-tested. Sentinel-2 (10m, free) sufficient for construction detection (binary yes/no), not car counting. Maricopa County Assessor API (free, REST) supports subdivision search. Click-to-expand boundary inference avoids data licensing costs.
- LA County dropped from satellite target markets (high-density infill, not subdivision absorption). Target: Sunbelt horizontal growth (Phoenix, DFW, Houston, etc.).
- Katona et al. paper findings: satellite parking lot imagery yields ~4.76% abnormal returns around earnings; bad-news signals ~3x more predictive than good-news. Requires 30cm commercial imagery ($100K+/yr) — free 10m Sentinel-2 cannot replicate car counting but CAN detect construction activity.
- Zonda acquired Bird.i (satellite) in 2020, has 3.3M+ parcels with construction status. Built for homebuilder audience, not underwriting.
- Fred Gortner (gernblanston) identified as key alpha tester for value-add MF workflow.

**Key artifacts:**
- `CC_RENT_COMP_HARVESTER_TEST_GR21.md` — POC v1 prompt (Google Places + website scraping)
- `CC_RENTAL_COMP_HARVESTER_REDFIN_GR30.md` — POC v2 prompt (Redfin rentals API)
- `COWORK_REDFIN_REGION_TEST_GR37.md` — Region_id resolution testing prompt
- `LANDSCAPE_INTELLIGENT_MARKET_DATA_HARVESTING_CONCEPT.md` — Feature concept doc (primary deliverable)
- `backend/tools/redfin_ingest/rental_comp_poc_v2.py` — Working POC script
- `backend/tools/redfin_ingest/rental_comp_poc_results_v2.json` — 231 Hawthorne results

**POC coverage progression:** Google Places + scraping: 3/20 (15%) → + Redfin sales CSV: still 15% (added nothing) → Redfin rentals API: 231 (Hawthorne), 709 (Phoenix)

**Open items:**
- Scope rent comp harvester implementation — schema migration, backend service, API endpoint, frontend, Landscaper tool
- Test Redfin rentals API from Railway/production environment (confirm works from actual backend)
- Evaluate paid API fallback (RentCast, HelloData, Dwellsy API IQ) for properties Redfin misses
- Satellite POC — Maricopa API + Google Earth Engine for a known subdivision (future session)
- CLAUDE.md updates needed: rent comp harvester feature, Redfin rentals API docs, `tbl_rental_comparable` migration queued, satellite concept on future roadmap

---

## Appraisal Extraction Pipeline — 2026-03-20

**What was discussed:**
- Built end-to-end appraisal/URAR document extraction support for Land Dev projects
- Updated `LandDev_Input_FieldRegistry_v3.csv`: added `appraisal` evidence type to 8 existing project fields (name, address, city, county, state, zip, description, flood_zone); added 28 new field rows covering valuation conclusions (→ `tbl_valuation_reconciliation`), cost approach details (→ `tbl_project_assumption`), and appraiser metadata (→ `tbl_project_assumption`)
- Created `backend/apps/landscaper/tools/appraisal_knowledge_tools.py` with 4 new Landscaper tools: `store_appraisal_valuation`, `store_market_intelligence`, `store_construction_benchmarks`, `get_appraisal_knowledge` — supports both project-scoped and platform-scoped (market_area entity) knowledge extraction
- Added URAR-specific extraction prompt hints in `extraction_service.py` via new `_build_appraisal_extraction_hints()` method — handles UAD abbreviation decoding, comp grid parsing, cost approach worksheets, and market narrative extraction
- Updated `extraction_writer.py` to handle `tbl_valuation_reconciliation` column writes (check-then-upsert pattern)
- Registered new tools in `tool_executor.py`, updated tool count to 225

**Open items:**
- `tbl_valuation_reconciliation` lacks a unique constraint on `project_id` — may want to add one if only one reconciliation row per project is intended
- Comparable sales from appraisals route to knowledge facts but not yet to structured `tbl_comparables` via the registry (would need `sales_comp` scope fields specific to URAR grid format)
- `source_page` still not populated by extraction pipeline (existing backlog item)
- Market intelligence tools store to knowledge entities/facts but no REST endpoint to query cross-project market data yet

---

---

## Hierarchy Visibility, Dropzone Restrictions, Parcel Import Tools — 2026-03-19

**What was discussed:**
- Property > Parcels tab: Level 1 checkbox unchecked but Area column still rendered in parcel detail table; Areas/Phases CCards rendered regardless of hierarchy toggle state
- All Landscaper dropzones rejected valid Excel files due to restrictive MIME-type accept filters — user wants all file types accepted everywhere
- Weyyakin Phase IV project: user uploaded investment summary PDF + proforma XLSM spreadsheet. PDF extraction didn't capture individual lot data. Spreadsheet has 14-lot roster (6 Lemhi Ct + 8 Waahni Ct) with lot SF, unit SF, build schedule, and per-lot cost draws
- Discussed Landscaper acting as "modeling advisor" during spreadsheet import — recognizing lot clusters, checking hierarchy config, guiding user to create phases when development cost profiles differ (Lemhi Ct = finished infrastructure, Waahni Ct = raw entitled land)

**What changed:**
- `src/app/api/project/granularity-settings/route.ts` — GET now SELECTs `level1_enabled`/`level2_enabled` from DB instead of hardcoding `true`; PUT now persists them
- `src/app/api/projects/[projectId]/config/route.ts` — GET returns `level1_enabled`/`level2_enabled` in config query
- `src/types/containers.ts` — Added `level1_enabled?`/`level2_enabled?` to ProjectConfig interface
- `src/hooks/useProjectConfig.ts` — Exposes `level1Enabled`/`level2Enabled` booleans
- `src/app/components/Planning/PlanningOverviewControls.tsx` — Reads actual DB enabled values instead of hardcoding `true`
- `src/app/components/Planning/PlanningContent.tsx` — Areas CCard hidden when L1 unchecked, Phases CCard hidden when L2 unchecked, Area/Phase columns in parcel detail table conditionally rendered, "Import PDF" button renamed to "Import Data" with updated modal copy
- Dropzone accept filters removed from all 5 components: `LandscaperPanel.tsx`, `DropZoneWrapper.tsx`, `DmsLandscaperPanel.tsx`, DMS `Dropzone.tsx`, `NewProjectDropZone.tsx` — all now accept any file type
- **NEW FILE:** `backend/apps/landscaper/tools/parcel_import_tools.py` — 3 new Landscaper tools: `parse_spreadsheet_lots` (reads Excel via openpyxl, finds lot roster rows, detects groupings by street), `get_hierarchy_config` (reads project hierarchy enabled state + counts), `bulk_create_parcels` (mutation tool — creates phases + parcels with propose_only pattern)
- `backend/apps/landscaper/tool_executor.py` — imports parcel_import_tools
- `backend/apps/landscaper/tool_schemas.py` — Claude-facing JSON schemas for all 3 new tools
- `backend/apps/landscaper/tool_registry.py` — Added tools to LAND_ONLY_TOOLS + `land_planning` page context
- `backend/apps/landscaper/ai_handler.py` — Added `PARCEL_IMPORT_PROMPT_ADDITION` with modeling advisor instructions; injected for land dev projects on property/planning page

**Open items:**
- Workbench tile tab config for land dev parcels (staging → review → commit UI) — deferred
- `livable_sf` column migration on `tbl_parcel` — currently stored as text in `lot_product` field
- Field registry CSV additions for parcel-level extraction pipeline integration
- Full spreadsheet extraction pipeline integration (currently tools work conversationally, not through Workbench staging flow)
- Landscaper tool count now 220 (was 217) — CLAUDE.md needs update

---

## Documents Media Gallery — Visibility Fix, Favorites, Classification, Rescan — 2026-03-19

**What was discussed:**
- User reported Project Media gallery missing from Documents tab — appeared deleted but was actually clipped by CSS overflow
- Traced layout chain: `DocumentsTab` had `className="h-full"` constraining height, parent `CCardBody` had `overflow: hidden` — gallery rendered in DOM but invisible below the fold
- Image classification accuracy: real photos being tagged as "Chart/Graph" or "Rendering" — AI prompt too vague on distinguishing photographs from other categories
- Requested favorite/heart icon to pin images to top of gallery
- Requested skip-deleted option on rescan so previously removed images don't reappear

**What changed:**
- `src/.../DocumentsTab.tsx` — Removed `h-full` constraint, replaced with plain `<div>` so both DMSView and ProjectMediaGallery flow naturally within `project-folder-content` scroll container
- `src/components/dms/ProjectMediaGallery.tsx`:
  - Tile sizing: `TILE_MAX_WIDTH` 420→320, `TILE_HEIGHT` 270→200 (guarantees 2+ per row)
  - Favorites: localStorage-persisted heart icon per card, favorites sort to top of grid
  - Rescan: "Rescan All" now opens confirmation modal with "Skip previously deleted images" checkbox (default: checked) instead of running immediately
- `backend/.../media_classification_service.py`:
  - Rewrote `CLASSIFICATION_PROMPT` — added explicit "CRITICAL RULE" prioritizing real photographs, expanded `property_photo` description, tightened `chart`/`rendering` criteria to prevent false positives
  - Heuristic fallback Rule 4: removed `rendering` as default for large low-bytes-per-pixel images, defaults to `property_photo` instead
  - Rule 6: bumped confidence 0.35→0.45 for medium images
- `backend/.../media_views.py` — `reset_document_media` now accepts `{ "skip_deleted": true }` in POST body, preserves `user_action='ignore'` rows when set
- `backend/.../media_extraction_service.py` — `_create_pending_record` checks for existing discarded records at same doc+page+method before inserting, skips if user previously deleted

**Open items:**
- Existing misclassified images need "Rescan All PDFs" to re-run through updated classification prompt
- Django endpoint for doc 118 media was hanging during testing — may be a backend performance issue worth investigating
- Favorite state is client-side only (localStorage) — if DB persistence is needed later, add `is_favorite` column to `core_doc_media`

---

## Demographics On-Demand Loading + County Selector Fix — 2026-03-19

**What was discussed:**
- User reported demographic rings not populating for Sun Valley, ID project — traced to Idaho not being in the `STATE_NAMES` whitelist in `load_block_groups.py` (only AZ and CA were supported)
- After loading Idaho data, rings still empty — stale NULL cache in `ring_demographics` table from before data existed. Cleared cache, PostGIS function returned correct data for all 3 rings.
- User requested on-demand demographic loading: prompt during project creation + button on map page if data unavailable
- User reported county parcel selector visible on Idaho project — should only show for Phoenix MSA (Maricopa/Pinal County)
- Discussed Census ACS data limitations for resort/rural markets (Sun Valley values appear low vs. market reality)

**What changed:**
- `backend/.../load_block_groups.py` — Expanded `STATE_NAMES` from 4 states to all 50 + DC
- `backend/.../demographics_service.py` — Added `get_state_coverage()`, `trigger_state_load()` (background thread), `_invalidate_state_project_caches()` (auto-clears stale ring caches when new state data loads), `STATE_ABBREV_TO_FIPS` mapping
- `backend/.../views.py` — Two new endpoints: `GET .../state-coverage/?state=ID`, `POST .../load-state/`
- `backend/.../urls.py` — Wired both new endpoints
- `src/.../LocationIntelligenceCard.tsx` — Added `projectState` prop, `handleLoadDemographics()` with polling, "Load Demographics" banner below map when no ring data
- `src/.../DemographicsPanel.tsx` — Enhanced empty state with loading/complete/error states + button
- `src/.../PropertyTab.tsx` — Added `state` to Project interface, passes `project.state` to card
- `src/.../NewProjectModal.tsx` — Auto-triggers `load-state` on project creation when state is set
- `src/.../types.ts` — Added `StateCoverage` interface, extended `DemographicsPanelProps`
- `src/components/map-tab/MapTab.tsx` — Added `isPhoenixMSA` memo, wrapped County Parcels panel so it only renders for AZ projects
- `CLAUDE.md` — Added "Demographics / Location Intelligence" section with on-demand loading docs, backend endpoints, county selector scope, and Census ACS data limitations for Landscaper context

**Open items:**
- Only 5-mile ring visible on map UI (1 and 3-mile data exists in backend) — likely frontend rendering/zoom issue, not investigated yet
- Texas demographic data not yet loaded (command supports it, just needs `load_block_groups --states=48`)

---

## Dropzone Fix — Landscaper Panel + Content Area — 2026-03-19

**What was discussed:**
- User reported neither the main content dropzone nor the Landscaper panel dropzone triggers the ingestion modal when files are dropped (Property > Parcels tab specifically, but likely all tabs)
- Traced full drag-and-drop chain: DropZoneWrapper → FileDropContext.addFiles() → pendingIntakeFiles useEffect → UnifiedIntakeModal
- Found Landscaper panel had ALL dropzone code stripped out — only existed in LandscaperPanel.tsx.bak. The old .bak had a full upload pipeline; the new architecture centralizes uploads in UnifiedIntakeModal
- Found DropZoneWrapper had `height: 100%` inside a flex-column CCardBody parent — known CSS issue where `height: 100%` doesn't resolve correctly when parent height comes from `flex: 1`

**What changed:**
- `src/components/landscaper/LandscaperPanel.tsx` — Added react-dropzone + useFileDrop() back. Simplified vs .bak: just forwards files to FileDropContext.addFiles() (no upload pipeline). Added drag overlay with visual feedback (dashed border, green/red states)
- `src/components/ui/DropZoneWrapper.tsx` — Changed `height: 100%` to `flex: 1; minHeight: 0; display: flex; flexDirection: column` for proper sizing inside flex parent

**Open items:**
- Needs live testing to confirm both dropzones now trigger UnifiedIntakeModal on all tabs
- Should verify CollapsedLandscaperStrip auto-expand still works on file drop (code is in ProjectLayoutClient useEffect watching pendingFiles)

---

## Intake Modal Fixes + Knowledge Search + Comp Pipeline — 2026-03-18

**What was discussed:**
- Diagnosed .xlsx upload failure (`{}` response from `/api/dms/docs` — missing auth headers in old LandscaperPanel.uploadFiles)
- Discovered previous session had built a full tiered modal system (UnifiedIntakeModal → ProjectKnowledgeModal / PlatformKnowledgeModal) — reverted conflicting UploadStagingProvider lift that would have broken it
- Fixed intake modals closing during form interaction: buttons defaulting to `type="submit"` inside `<CForm>`, missing `onSubmit` prevention, CModal `onClose` firing unexpectedly, modals unmounting during SWR revalidation (moved modal renders before loading guards in ProjectLayoutClient)
- Added `closeButton={false}`, removed `onClose` prop, added `backdrop="static"` + `keyboard={false}` to all three intake modals
- Added Start Over / Cancel buttons to knowledge modals with full upload rollback (DELETE to UploadThing + core_doc soft-delete)
- Fixed extraction queue trash button opening Workbench (missing `e.stopPropagation()` in ExtractionQueueSection.tsx)
- Fixed knowledge intents (`project_knowledge`, `platform_knowledge`) creating extraction queue entries — updated Zod schema, useIntakeStaging hook, and route.ts to skip queue for knowledge intents
- Added `RESPONSE STYLE`, `MANDATORY TOOL USE`, `AVOIDING REDUNDANCY` sections to Landscaper system prompt; updated `DATA LOOKUP PRIORITY` in BASE_INSTRUCTIONS to include `query_platform_knowledge` as step 2
- Added `query_platform_knowledge` to `mf_valuation` and `land_valuation` in PAGE_TOOLS (though actual filtering uses PROPERTY_TYPE_TOOL_MAP where it was already in UNIVERSAL_TOOLS)
- Made `query_platform_knowledge` tool search BOTH `tbl_platform_knowledge_chunks` (reference corpus) AND `knowledge_embeddings` (user-uploaded docs), merging results by similarity
- Fixed cap rate normalization in `update_sales_comparable` tool (values > 1 auto-converted to decimal)
- Manually approved 3 pending mutation proposals and populated missing comp fields from CoStar xlsx
- Added outer try-catch safety net to `/api/dms/docs` POST route

**Files modified (frontend):**
- `src/components/intake/UnifiedIntakeModal.tsx` — closeButton, onClose removal
- `src/components/intake/ProjectKnowledgeModal.tsx` — closeButton, onClose, onSubmit, type="button", Start Over
- `src/components/intake/PlatformKnowledgeModal.tsx` — same as above
- `src/components/landscaper/ExtractionQueueSection.tsx` — stopPropagation on trash button
- `src/hooks/useIntakeStaging.ts` — send intent for all file types
- `src/app/api/dms/docs/route.ts` — skip queue for knowledge intents, outer try-catch
- `src/app/api/dms/docs/schema.ts` — added knowledge intents to Zod enum
- `src/app/projects/[projectId]/ProjectLayoutClient.tsx` — moved intake modals before loading guards
- `src/components/landscaper/LandscaperPanel.tsx` — removed dead dropzone comment

**Files modified (backend):**
- `backend/apps/landscaper/ai_handler.py` — RESPONSE STYLE, MANDATORY TOOL USE, AVOIDING REDUNDANCY, DATA LOOKUP PRIORITY
- `backend/apps/landscaper/tool_executor.py` — dual-source knowledge search, cap rate normalization
- `backend/apps/landscaper/tool_registry.py` — query_platform_knowledge added to mf_valuation/land_valuation PAGE_TOOLS

**Open items:**
- Thread list UI missing from Landscaper panel — no way to browse/switch threads
- Thread auto-selection race condition on mount — new blank threads created before API returns existing threads, causing comp thread to disappear on refresh
- Landscaper response vanishing on refresh — related to thread race condition
- `docs/diagnostics/xlsx-upload-failure-2026-03-18.md` created during diagnostic phase — can be deleted (findings are superseded by this log entry)

---

## DMS Drag-to-Reclassify — 2026-03-11

**What was discussed:**
- Audited the full drag-to-reclassify implementation per the OpenClaw spec. Found the feature is already fully built across three layers:
- **AccordionFilters.tsx**: Drop target handlers (`handleHeaderDragOver/Enter/Leave/Drop`) keyed on `application/x-dms-reclassify` MIME type. Visual states (`isReclassifyDropTarget`, `isDropSuccess`) with CoreUI var inline styles. Document rows set reclassify drag data with multi-select support (drag ghost badge for bulk). Opacity 0.5 on drag, `aria-dropeffect="move"` on active targets.
- **AccordionFilters.module.css**: `.filterRowReclassifyTarget` (primary border-left + subtle bg) and `.filterRowDropSuccess` (success bg flash) classes defined.
- **DMSView.tsx**: `handleDocumentReclassify` callback with per-doc PATCH calls to `/api/dms/documents/{id}/profile`, error handling for 404/409, toast notifications, `loadFilters()` refresh. Prop `onDocumentDrop={handleDocumentReclassify}` already passed to both left/right AccordionFilters instances.
- One minor flag: drag ghost badge (line 375) has hardcoded `#321fdb` fallback alongside `var(--cui-primary)` — acceptable since it's a temporary off-screen element.
- Pre-existing type errors confirmed unrelated (`hideHeader` prop, `deleted_at` on DMSDocument type).

**Open items:**
- None — feature is complete and wired. No code changes were needed.

---

## Loan Scope UI + Cash Flow Stacking — 2026-03-11

**What was discussed:**

- Added container assignment UI to `LoanCard.tsx` — radio for "Entire Project" (default) + area/phase checkboxes
- Wired `container_ids` into save payload via `buildLoanPayload()`, round-trips through `LoanCreateUpdateSerializer._sync_containers()`
- Added scope badge to collapsed loan summary row (shows container name or count)
- CSS styles added for `.loan-scope-picker` and nested phase indentation
- Verified loan stacking: both `land_dev_cashflow_service.py` and `income_property_cashflow_service.py` already iterate loans independently and sum debt service as separate line items
- Land dev cash flow respects container scoping via `_fetch_loans()` filter; unscoped loans always included
- `allocation_pct` on `LoanContainer` exists but is unused in cash flow engine (all-or-nothing inclusion)

**Open items:**

- Haven't tested the full save round-trip in browser (save → reload → verify containerIds populated)
- Income property cash flow doesn't filter loans by container (acceptable for MF but may need attention for mixed-use)
- No lint or build errors, but no E2E test coverage on the new scope picker

---

## Waterfall Fixes — 2026-03-11

**What was discussed:**

- Continued from loan scope/stacking session (context carried over via compaction summary)
- Reviewed all 77+ scripts in `scripts/` — cataloged every documentation-related script (schema export, daily context generators, codebase audit, API audit, migration status, diff context, prototype notes export)
- Created session logging system: `docs/daily-context/session-log.md` as append-only log
- Added "Document" command instructions to `CLAUDE.md` under Common Tasks — any future session picks up the convention automatically
- Seeded first log entry with the loan scope work from earlier in this chat

**Open items:**

- None

---


## Add Parcel Cascading Taxonomy — 2026-03-11

**What was discussed:**
- Fixed runtime error "Failed to add Parcel: (intermediate value).find is not a function" — fallback fetch in `addParcelFromRow` was calling `.find()` on a non-array API response. Rewrote to use `areaOptions` first with guarded `Array.isArray()` fallback.
- Implemented progressive field reveal on Add Parcel inline row — columns 3-7 show "Select Area & Phase first" until both dropdowns have values, then reveal Use Family, Use Type, Product, Acres, Units inputs.
- Restored cascading taxonomy dropdowns (Family → Type → Product) on the Add Parcel row, matching EditableParcelRow pattern: Family loads types via `/api/landuse/types/{familyId}`, Type loads products via `/api/landuse/lot-products/{typeId}` with shared cache.
- All three taxonomy fields (`family_name`, `type_code`, `product_code`) now passed in POST `/api/parcels` body. State fully resets on save and cancel.

**Open items:**
- None

---

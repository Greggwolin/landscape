# Landscape Financial Engine - Implementation Status
**Last Updated:** 2026-04-10
**Version:** 5.0
**Status:** Production Ready (Phases 1-8 Complete + Python Financial Engine Migration Phase 1 + Location Intelligence + Map Draw Tools + Sales Comparison UI + Cash Flow UI + DCF Enhancements + Project Navigation + Property Tab Restructure + Rent Roll Extraction Improvements + Debt UI Consolidation + Folder-Tabs UI Overhaul + Landscaper Stability & Rent Roll Visibility + PlanningWizard Archive + Market Research Extraction + Knowledge Library + DMS Doc Types/Tags/Subtypes + Rich Schema Refresh + CoreUI Theme Expansion + Reconciliation Panel + MapCanvas Overhaul + Ingestion Workbench + Alpha Prep Sprint + Schema Refresh Mar 2026 + Extraction Pipeline v2 + Geo Auto-Seeding + Appraisal Knowledge Tools + Expense Comparables + Report System Committed + Operations Full Django Migration + Inline PDF Reports + Acquisition DCF Integration + Portfolio Scaffolding + Waterfall Persist + Marketing Site + Map Market Layers + Extraction Pipeline Hardening + Market Agent Fleet + DMS Filter Management)

---

## 🎯 Executive Summary

The Landscape Financial Engine is a **production-ready** Next.js + PostgreSQL application providing comprehensive financial modeling for land development and income properties with ARGUS-level sophistication.

### 🆕 **Latest Update: Ingestion Workbench Four-Status Model (April 10, 2026)**

**Uncommitted WIP: Backend four-status classification, conflict resolution UI, bulk accept mutations, component extraction (7 files, +962/-445 lines)**

- ⏳ **Four-status classification model** — Backend classifies staging rows at read time: `new`/`match`/`conflict`/`pending`. Replaces client-side `detectConflicts()`. Eliminates phantom conflict bugs.
- ⏳ **Conflict resolution UI** — Inline extracted-vs-existing display with click-to-resolve. New `resolveConflict` mutation.
- ⏳ **Bulk accept mutations** — `acceptAllMatches` and `acceptAllNew` for efficient triage of non-conflicting fields.
- ⏳ **Component extraction** — `IngestionRightPanel`, `ExtractionSummary`, `ExtractionDiffPanel` split out from monolithic workbench.
- ⏳ **`setInputText` on LandscaperChatThreaded** — Imperative handle for pre-filling chat from conflict "discuss" buttons.
- 📁 **See:** `docs/session-notes/2026-04-10-daily-sync.md`

### Previous Update: v0.1.17 — Market Agent Fleet + DMS Filter Management + Ingestion Finish-Later (April 2-3, 2026)

**v0.1.17 (committed): Market intelligence agent fleet, Census BPS agent, async extraction, phantom conflict fix**
**Uncommitted: DMS doc type reassignment, doc type combobox, ingestion finish-later/resume, brokerage agent enhancements (22 files, +826 lines)**

- ✅ **Market intelligence agent fleet** (`dfc1f87`) — 8 new research agents (Census BPS, HUD, MBA, KBRA, Trepp, Brokerage Research, Construction Cost, NAIOP) + orchestrator upgrades.
- ✅ **Census BPS agent rewritten** (`a65dd82`) — REST API → CSV file download. 25 months backfilled, 17 AZ places + 3 counties, 1,119 rows.
- ✅ **Async extraction** (`a65dd82`) — `extract_document_batched` returns 202 immediately, runs in background thread. Prevents Railway timeout.
- ✅ **Workbench phantom conflict fix** (`a65dd82`) — Single-source conflicts with no competing values treated as editable pending.
- ⏳ **DMS doc type reassignment** — New `POST .../doc-types/{id}/reassign/` endpoint. Frontend modal for reassign-before-delete when filter has documents.
- ⏳ **Doc type combobox** — New `DocTypeCombobox.tsx` + `GET /api/dms/templates/all-doc-types` for autocomplete across templates.
- ⏳ **Ingestion "Finish Later" + Resume** — 3-way cancel choice (Go Back / Finish Later / Discard). Floating resume banner for paused draft sessions.
- ⏳ **IntakeChoiceModal doc type selector** — Fetches project doc types, pre-selects from auto-detection, allows override.
- ⏳ **Brokerage agent column mapping rewrite** — Dynamic unit resolution, direct/sublet vacancy, weighted avg net rent.
- 📁 **See:** `docs/09-session-notes/2026-04-03-daily-sync.md`

### Previous Update: Operations GET Migration + Map Market Layers + Extraction Hardening (April 1, 2026)

**Committed in v0.1.16/v0.1.17: Operations GET to Django, map market layers, extraction pipeline hardening, new Landscaper tool, LCF UI polish**

- ✅ **Operations GET migrated to Django** — Full P&L calculation replicated in `views_operations.py` (+958 lines). `useOperationsData.ts` updated. Legacy Next.js route retained as dead code.
- ✅ **New Landscaper tool: `update_land_use_pricing`** — Writes to source-of-truth pricing table + auto-triggers recalculate-sfd. Tool count: 231.
- ✅ **`ingest_document` hardened** — Auto-triggers extraction pipeline if document not yet processed.
- ✅ **Map market layers** — Recent Sales (Redfin SF comps, price-tier coloring) + Market Competitors with popups.
- ✅ **Thread race condition fix** — CamelCase mismatch + server-side guard.
- 📁 **See:** `docs/09-session-notes/2026-04-01-daily-sync.md`

### Previous Update: v0.1.15 — alpha15 Merged + Waterfall Persist + Marketing Site (March 31, 2026)

**v0.1.15 (committed, merged to main): alpha15 merge, waterfall persist, marketing site, S&U rewrite, portfolio scaffolding**

- ✅ **alpha15 merged to main** (`3f11fa9`) — Version bumped to v0.1.15 (`e627800`).
- ✅ **Waterfall persist results + promote recalc** (`3b9a97b`) — Calculation results persisted to DB. New `/waterfall/last-result/` endpoint. MF acquisition at time=0 fixed. Equity page recalc triggers.
- ✅ **transformDjangoResponse shared module** (`f058293`) — 148-line shared utility for waterfall Django response transformation.
- ✅ **S&U report rewrite** (`9e74a0a`) — Property-type branching: LAND vs MF+. Treemap replaced with unified section-header table. ~1,715 lines.
- ✅ **Portfolio analysis models** (`9e74a0a`) — Django models + serializers + views + URLs scaffolded. Underwriting mode only. Migration pending.
- ✅ **Marketing site** (`bce59bd`, `22dfa3f`) — Static site under `marketing-site/` with CoreUI dark theme tokens.
- 📁 **See:** `docs/09-session-notes/2026-03-31-daily-sync.md`

### Previous Update: alpha15 WIP — Portfolio Scaffolding + S&U Rewrite + Rent Roll PDF Fix (March 30, 2026)

**Uncommitted on `alpha15` branch (Sunday)**

- ✅ **Portfolio analysis models** — Committed in `9e74a0a` on March 31.
- ✅ **Sources & Uses report rewrite** — Committed in `9e74a0a` on March 31.
- ✅ **Rent roll PDF fix** (`rpt_07a`) — Column widths tightened for portrait fit. Summary/occupancy labels repositioned. Occupancy row styled as subtotal.
- 📁 **See:** `docs/09-session-notes/2026-03-30-daily-sync.md`

### Previous Update: alpha14 — Report Overhaul + Acquisition DCF + UI Sweep (March 29, 2026)

**v0.1.14 (committed, merged to main): Report format overhaul, acquisition DCF integration, picklist event types, 50-file UI update**

- ✅ **Report format overhaul Phase 1** (`625601c`) — 10 generators rewritten with new shared `pdf_base.py` module (355 lines). 3 new generators: rpt_07a/b Rent Roll Standard/Detail, rpt_08 Unit Mix, rpt_09 Operating Statement. ReportViewer.tsx streamlined. New `useReports.ts` hook.
- ✅ **Acquisition → DCF integration** (`1930b55`) — DCF service branches by `analysis_purpose`: VALUATION (implied return at PV) vs UNDERWRITING (IRR/NPV/equity multiple against acquisition cost). New `_fetch_effective_acquisition_cost()` method. DCFView shows Time 0 column. `mfCashFlowTransform.ts` prepends acquisition cost at time=0.
- ✅ **Picklist-driven acquisition event types** (`9d510ab`) — Event types migrated from hardcoded string literals to `tbl_system_picklist`. `AcquisitionLedgerGrid.tsx` consumes picklist with fallback. Event codes normalized to uppercase.
- ✅ **50-file UI component update** (`caae828`) — Broad import/styling sweep across project tabs, valuation, capitalization, operations, landscaper, and shared components. Added `staticmap` to backend requirements.
- ✅ **alpha14 merged to main** (`af57162`), version bumped to v0.1.14 (`7a6a9d4`).
- 📁 **See:** `docs/09-session-notes/2026-03-29-daily-sync.md`

### Previous Update: Acquisition DCF Integration + Picklist Event Types (March 28, 2026)

**v0.1.13: Operations save to Django, acquisition DCF integration, picklist event types**

- ✅ **All items committed in alpha14** — See March 29 entry above.
- 📁 **See:** `docs/09-session-notes/2026-03-28-daily-sync.md`

### Previous Update: Operations Save Migration + Inline PDF Reports (March 27, 2026)

**v0.1.13: Operations save to Django, inline PDF preview, PDF layout improvements**

- ✅ **Operations save migrated to Django** (`4f2409f`) — Created `views_operations.py` (232 lines) with save endpoints. Frontend wired (`ced6a71`). GET (P&L) remains on legacy Next.js — separate task.
- ✅ **Report `data_readiness` migration** (`4f2409f`) — Migration `0006` updates readiness flags for all 20 generators.
- ⏳ **Inline PDF preview** (uncommitted) — `ReportViewer.tsx` rewritten to display server-generated PDF in iframe via blob URL. Removes client-side JSON rendering.
- ⏳ **Content-aware PDF layout** (uncommitted) — `preview_base.py` upgraded with proportional column widths, Paragraph wrapping, auto landscape for wide tables, proper alignment.
- ⏳ **Generator format fixes** (uncommitted) — rpt_01, 02, 03, 05, 06, 15, 20 updated for alignment and formatting.
- ✅ **alpha13 merged to main** (`f5a433a`).
- 📁 **See:** `docs/09-session-notes/2026-03-27-daily-sync.md`

### Previous Update: Report System Committed + PDF/Excel Export (March 25, 2026)

**v0.1.12: 20 report generators committed, PDF/Excel export, comp map fix**

- ✅ **Report system committed** (`a4d1547`) — 20 report generators (`rpt_01`–`rpt_20`), `generator_router.py`, `preview_base.py`, `ReportBrowser.tsx` + `ReportViewer.tsx`, report definition seed migration, loan budget report + Excel export. 51 files, ~6,500 lines.
- ✅ **PDF/Excel export** (`e462ac6`) — WeasyPrint PDF + openpyxl Excel export added to `preview_base.py`. Sales Comparison (`rpt_11`) fully wired with preview SQL. ReportViewer updated with download buttons.
- ✅ **WeasyPrint lazy import** (`c3b83e6`) — Fixed Railway deploy crash from eager WeasyPrint import.
- ✅ **Comp map fix** (`f81c595`) — Sales comparison map now uses DB coordinates and `comp_number` for labels.
- 📁 **See:** `docs/09-session-notes/2026-03-25-daily-sync.md`

### Previous Update: Expense Comparables + Report System Architecture (March 24, 2026)

**v0.1.10: Expense comparable CRUD, county/micro ACS pipeline**

- ✅ **Expense comparable CRUD** — New `tbl_expense_comparable` table, Django API endpoints, `ExpenseCompDetailModal` with full create/edit/delete UI for income approach
- ✅ **Location tab + ACS pipeline** — County + micropolitan ACS data series, DMS-aware market analysis, media extraction improvements
- ✅ **Prior day's work committed** — Mega-commit `0409b2e`: PlanningContent land use, area API refactor, Level 2 autonomy wiring, geo auto-seeding, μSA hardening, rental comp POC, schema refresh
- 📁 **See:** `docs/09-session-notes/2026-03-24-daily-sync.md`

### Previous Update: Planning Land Use Integration + Level 2 Autonomy Wiring (March 23, 2026)

**Committed in `0409b2e` on March 24**

- ✅ **PlanningContent land use integration** — Add-parcel row now uses Django land use API for cascading Family → Type → Product selectors scoped to project config, with fallback to parcel-derived data
- ✅ **Area API refactor** — Switched to `area_alias` column, added DELETE endpoint with child orphaning
- ✅ **Level 2 autonomy metadata** — `ai_handler.py` surfaces `mutation_proposals` and `has_pending_mutations` in response metadata for frontend approval UI
- ✅ **μSA hardening** — `COUNTY_TO_MICRO` dict expanded (~30 entries), `get_cbsa_or_micro()` function, MICRO series codes in LocationSubTab
- ✅ **Media pipeline cancellation** — User-cancellable media extraction via AbortController propagation
- 📁 **See:** `docs/09-session-notes/2026-03-23-daily-sync.md`

### Previous Update: Extraction Pipeline v2, Geo Auto-Seeding, Appraisal Knowledge Tools (March 20, 2026)

**v0.1.08–v0.1.09: Extraction hardening, new Landscaper tools, and location intelligence auto-seeding**

- ✅ **Extraction pipeline v2** — Property-type-aware batched extraction, `field_role` column on land dev registry, 5-layer output-field blocking (extraction_service → extraction_writer → workbench_views → parcel_import_tools → accept_all_pending)
- ✅ **Appraisal knowledge tools** (4 new) — `store_appraisal_valuation`, `store_market_intelligence`, `store_construction_benchmarks`, `get_appraisal_knowledge` for persisting extracted appraisal data
- ✅ **Parcel import tools** (4 tools) — `parse_spreadsheet_lots`, `get_hierarchy_config`, `stage_parcel_lots`, `bulk_create_parcels` — registry-aware with output-field filtering
- ✅ **Geo auto-seeding** — `src/lib/geo/bootstrap.ts` auto-resolves full geographic hierarchy (US → State → MSA/μSA → County → City) via Census APIs on first Location tab load
- ✅ **Micropolitan (μSA) support** — Throughout stack: `cbsa_lookup.py`, `geo_bootstrap.py`, `LocationSubTab.tsx`, `geos/route.ts`
- ✅ **UI improvements** — Hierarchy level flags, drop zone liberalization, extraction timeout handling
- ✅ **Landscaper tool count → 229**
- 📁 **See:** `docs/09-session-notes/2026-03-20-daily-sync.md`

### Previous Update: Schema Refresh + Extraction Pipeline Fixes (March 8, 2026)

**Rich Schema Regeneration and Ingestion Pipeline Reliability**

Schema documentation refresh and extraction polling reliability fixes:

- ✅ **Rich schema regenerated** — `docs/schema/landscape_rich_schema_2026-03-08.json` — 324 tables, 42 views (post dead-table cleanup; originally 374 before dropping 9 dead/duplicate tables + 1 contacts_legacy)
- ✅ **Delta vs Mar 7 snapshot** — +2 tables, +6 indexes, +8 constraints, +5 FKs, +1 trigger, +1 routine
- ✅ **Abridged schema markdown** — `docs/schema/landscape_rich_schema_2026-03-08_abridged.md` (305 KB)
- ✅ **MappingScreen polling fix** — Polling now checks `/extractions/` (all statuses) and `/extraction-jobs/` (job completion) in addition to `/extractions/pending/`, preventing infinite loop when results land in non-pending status
- ✅ **Collision handling verified** — `LandscaperPanel` correctly reads `doc_id` from both `doc` and `existing_doc` response shapes
- ✅ **CLAUDE.md schema count updated** — 324 tables (post dead-table cleanup)
- 📁 **Location:** `docs/schema/landscape_rich_schema_2026-03-08.json`

### Previous Update: Ingestion Workbench + Alpha Prep Sprint (March 7, 2026)

**AI-Assisted Document Ingestion, Extraction Pipeline, and Cross-Feature Polish**

Major sprint delivering the Ingestion Workbench and wide-ranging alpha readiness improvements:

- ✅ **Ingestion Workbench** — Split-panel floating workbench (380px Landscaper chat + field table) for AI-assisted document review
- ✅ **Extraction pipeline overhaul** — Batched staging with conflict detection, tile-based field scoping, quote stripping for clean values
- ✅ **5 ingestion Landscaper tools** — `explain_extraction`, `suggest_value_correction`, `approve_field`, `reject_field`, `get_extraction_summary` (tool count → 217)
- ✅ **IntakeChoiceModal routing** — "Structured Ingestion" now opens workbench instead of legacy MappingScreen
- ✅ **Source citation integrity** — Unified "Evidence" label for source snippets, graceful fallback for missing sources
- ✅ **Income approach enhancements** — NOI basis refinements, operations tab improvements
- ✅ **UI polish** — Navigation, project creation, HelpIcon animations, land use refinements
- ✅ **DMS improvements** — Document delete endpoint, multifamily model updates
- ✅ **Land Use tab** — 3-column picker with parcels tab migration
- ✅ **NNN valuation** — NNN SLB tools and UI added to Landscaper
- 📁 **Location:** See `docs/09-session-notes/2026-03-07-ingestion-workbench-commit-organization.md`

### Previous Update: CoreUI Theme Expansion + Reconciliation Panel + MapCanvas Overhaul (February 21, 2026)

**UI Polish, Valuation Workflow Completion, and GIS Improvements**

Multiple targeted improvements across theming, valuation, property, and mapping:

- ✅ **CoreUI theme expansion** - Badge contrast fixes, expanded theme token coverage for dark/light modes
- ✅ **ReconciliationPanel** - No longer stubbed; functional reconciliation UI with weights and narrative versioning (was Alpha Blocker #1)
- ✅ **IndicatedValueSummary** - New component summarizing final indicated values across all three approaches
- ✅ **MapCanvas overhaul** - Refactored GIS parcel rendering, improved layer management
- ✅ **Physical description enhancements** - `PhysicalDescription` and `FloorPlanMatrix` components for PropertyTab
- ✅ **DMS MediaPickerModal** - Improved media selection and preview workflow
- ✅ **ProjectTab/PropertyTab refinements** - Updated layouts and data display
- ✅ **Anthropic SDK pin** - Pinned for Pydantic compatibility to prevent backend import errors
- ✅ **UploadStagingContext** - New React context for drag-drop file staging workflow
- 📁 **Location:** See git log for Feb 21 commits

### Previous Update: DMS Extraction Doc Types + Tags + Knowledge Library (February 14, 2026)

**Vocabulary Alignment, Subtype Classification, and Knowledge Library Consolidation**

Major DMS upgrades that align extraction mappings with DMS templates, introduce subtype tags, and unify document discovery inside the Knowledge Library:

- ✅ **Doc type remap** - `tbl_extraction_mapping.document_type` aligned to DMS template vocabulary with audit log table for rollback
- ✅ **Tag system** - `dms_doc_tags`, `dms_doc_tag_assignments`, `dms_project_doc_types`, plus `applicable_tags` JSONB filtering on extraction mappings
- ✅ **Subtype classifier** - `ai_document_subtypes` + `DocumentSubtypeClassifier` auto-assigns subtype tags on ingest
- ✅ **Project DMS "+ Add Type"** - Inline create/delete of project-specific doc types (template types protected)
- ✅ **Extraction Mappings Admin** - Help modal, tooltips, and SWR-driven CRUD interface
- ✅ **Knowledge Library consolidation** - Global `/dms` removed in favor of AdminModal Knowledge Library; document-scoped chat now falls back to `core_doc_text` when embeddings are missing
- 📁 **Location:** See `docs/09-session-notes/2026-02-14-dms-extraction-doctype-tags.md`

### Previous Update: Knowledge Library Integration (February 13, 2026)

**Landscaper Admin Panel Integration + Faceted Search**

- ✅ **Knowledge Library panel** - 5-column cascading facets, scoped chat, batch download, drag-and-drop upload
- ✅ **Doc geo tags** - `doc_geo_tag` table and `backfill_geo_tags` management command
- ✅ **Django endpoints** - Facets, search, batch-download, upload (`/api/knowledge/library/*`)
- ✅ **Admin integration** - Added as Landscaper accordion section inside AdminModal
- 📁 **Location:** See `docs/09-session-notes/2026-02-13-knowledge-library-integration.md`

### Previous Update: Rich Schema Export Refresh (February 12, 2026)

**Schema Documentation Synced to Live Database**

Refreshed the canonical rich schema snapshot to reflect live Neon DB state as of February 12, 2026.

- ✅ **New export generated** - `docs/schema/landscape_rich_schema_2026-02-12.json`
- ✅ **Current object counts captured** - 353 tables, 42 views, 1176 indexes, 1000 constraints, 377 foreign keys, 61 triggers, 995 routines
- ✅ **Delta vs prior snapshot (2026-02-11)** - +19 tables, +1 view, +55 indexes, +44 constraints, +14 foreign keys
- ✅ **Export command verified** - `./scripts/export_schema.sh --verbose`
- 📁 **Location:** `docs/schema/landscape_rich_schema_2026-02-12.json`

### Previous Update: Planning Surface Simplification + Market Research Extraction (February 13, 2026)

**PlanningWizard Moved to Archive + New Market Analysis Document Pipeline**

Codebase cleanup and document-intelligence upgrades landed together:

- ✅ **PlanningWizard archive migration** - Removed legacy `src/app/components/PlanningWizard/*` from active tree and moved 17 files to `src/app/_archive/components/PlanningWizard/`
- ✅ **PlanningContent simplification** - Removed sidecar `ParcelDetailCard` integration and related legacy wizard mappings from `src/app/components/Planning/PlanningContent.tsx`
- ✅ **Market research extractor added** - New `MarketResearchExtractor` with PDF/Excel/CSV support at `backend/apps/documents/extractors/market_research.py`
- ✅ **Classifier integration** - `document_classifier.py` now extracts `market_analysis` sections in multi-section documents
- ✅ **Table-aware text extraction** - `text_extraction.py` now augments PDF text with `pdfplumber` table captures marked as `[TABLE ...]`
- ✅ **Table-preserving chunking** - `chunking.py` now preserves table blocks during cleaning to improve downstream retrieval quality
- ✅ **Cross-project knowledge search** - `embedding_storage.py` now includes global (`project_id IS NULL`) chunks in similarity retrieval
- 📁 **Related files:** `backend/apps/documents/specs/headers/market_research_headers.yaml`, `backend/apps/documents/specs/validators/market_research_v1.yaml`

### 🆕 **Latest Update: Landscaper Stability & Rent Roll Visibility (February 10, 2026)**

**Tool Execution Fixes, Document Extraction Improvements, Dynamic Columns in Rent Roll UI**

Critical stability fixes for the Landscaper AI system and rent roll data pipeline:

- ✅ **Landscaper Tool Hang Fix** - Added tool result truncation (4K cap), loop iteration limit (5), time budget (75s), graceful break with final summary call
- ✅ **Batch SQL for Mutations** - Replaced N+1 per-unit queries (200 queries) with UNNEST batch operations (~5 queries)
- ✅ **Anthropic Timeout/Tokens** - Timeout 60s→120s, max_tokens 2048→16384, stop_reason warning
- ✅ **Frontend Timeout** - 90s→150s across all chat hooks, always-visible error display
- ✅ **Auto-Refresh After Mutations** - PropertyTab, ValuationTab, ProjectTab now auto-refresh via `useLandscaperRefresh`
- ✅ **Document Extraction Truncation Fix** - Full rent roll now visible (was showing 10/113 units); `max_length` 15K→40K
- ✅ **Excel Raw Text Generation** - `RentRollExtractor._generate_raw_text()` so Excel files populate `extracted_text`
- ✅ **Dynamic Columns in Configure Columns** - EAV dynamic columns appear in rent roll modal under "Additional Fields" with green "Extra" badge
- ✅ **Floor Plan Column Editable** - Changed from calculated to user-editable input
- ✅ **Infinite Re-render Fix** - Stable fingerprints prevent `Maximum update depth exceeded` from SWR object references
- 📁 **Location:** See `docs/09-session-notes/2026-02-10-landscaper-stability-and-rent-roll-visibility.md`

**Key Files Modified:**
- `backend/apps/landscaper/ai_handler.py` - Tool loop guards, truncation, logging
- `backend/apps/landscaper/services/mutation_service.py` - Batch SQL with UNNEST
- `backend/apps/landscaper/tool_executor.py` - Full unit/lease display, 40K cap
- `backend/services/extraction/rent_roll_extractor.py` - raw_text generation
- `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx` - Dynamic columns, editable plan, auto-hide fix

### Previous Update: Folder-Tabs UI Overhaul (February 8, 2026)

**Page Consolidation, Media System, Location Intelligence, and Property Type Tokens**

Largest single commit on the `feature/folder-tabs` branch — 148 files changed. Major restructuring of project navigation:

- ✅ **Legacy Page Consolidation** - Removed 25+ legacy page routes, archived to `src/app/_archive/`
- ✅ **ProjectContentRouter** - Renamed StudioContent → ProjectContentRouter for unified folder-tab content rendering
- ✅ **ActiveProjectBar** - New project context component replacing StudioProjectBar
- ✅ **Media Asset System** - MediaPickerModal, MediaPreviewModal, MediaCard, MediaBadgeChips, EntityMediaDisplay
- ✅ **Media Backend Services** - Django media views, AI classification service, extraction service
- ✅ **Location Intelligence Expansion** - Expanded map views, demographic hooks, new Django views
- ✅ **Property Type Tokens** - PropertyTypeBadge component, propertyTypeTokens config for all 7 types
- ✅ **Landscaper Enhancements** - CollapsedLandscaperStrip moved to landscaper/, MediaSummaryCard, threaded chat improvements
- ✅ **Capitalization UI** - LeveragedCashFlow expansion, DeveloperFeeModal/OverheadItemModal improvements
- ✅ **Income Property Cashflow** - New `income_property_cashflow_service.py` in Django
- ✅ **Style Updates** - folder-tabs, navigation, resizable-panel, leveraged-cf, coreui-theme, tokens
- 📁 **Location:** See `docs/09-session-notes/2026-02-08-folder-tabs-ui-overhaul.md`

### Previous Update: Debt UI Consolidation (February 6, 2026)

**Loan Schedule Grid, Loan Schedule Modal, and Leveraged Cash Flow**

Complete Debt tab build-out with three interconnected components:

- ✅ **Loan Schedule Grid** - Horizontal scrolling amortization table with Monthly/Quarterly/Annual period toggles, IO/P&I/BALLOON badges
- ✅ **Loan Schedule Modal** - Full-screen modal for detailed single-loan schedule view with export stub
- ✅ **Leveraged Cash Flow** - ARGUS-style DCF grid showing NOI → Debt Service → Net Cash Flow
- ✅ **3-Scenario Support** - Full data (income + debt), debt only, income only with appropriate info messages
- ✅ **Sticky Columns** - Row labels remain visible during horizontal scroll
- ✅ **Period Aggregation** - Monthly → Quarterly → Annual with correct summing logic
- ✅ **Django Fixes** - AllowAny permissions on LoanViewSet, FloatField serializer overrides, expanded field list
- ✅ **Legacy Route Cleanup** - Deleted 3 legacy proxy routes under `/debt/facilities/[id]/`
- 📁 **Location:** See `docs/09-session-notes/2026-02-06-debt-ui-consolidation.md`

**Files Created:**
- `src/components/capitalization/LeveragedCashFlow.tsx` - Leveraged cash flow grid
- `src/components/capitalization/LoanScheduleGrid.tsx` - Loan amortization schedule
- `src/components/capitalization/LoanScheduleModal.tsx` - Full-screen schedule modal
- `src/hooks/useCapitalization.ts` - React Query hooks for debt/loan data
- `src/styles/leveraged-cf.css` - Leveraged CF grid styles
- `src/styles/loan-schedule.css` - Loan schedule grid styles

**Files Modified:**
- `src/app/projects/[projectId]/capitalization/debt/page.tsx` - Wired all 4 sections
- `backend/apps/financial/views_debt.py` - AllowAny permissions
- `backend/apps/financial/serializers_debt.py` - FloatField + expanded fields

### Previous Update: Rent Roll Extraction Improvements (February 5, 2026)

**Async Processing, Field Mapping, and User Experience Enhancements**

Major improvements to the rent roll extraction pipeline:

- ✅ **Async Background Processing** - Extraction runs in background threads to avoid HTTP timeout
- ✅ **Direct Excel Parsing** - Reads Excel/CSV files directly for complete data (vs embeddings)
- ✅ **Tenant Name Fix** - Now extracts actual tenant names instead of "Current Tenant" placeholders
- ✅ **Standard Field Mapping** - Added tenant_name, lease_start, lease_end, move_in_date to dropdowns
- ✅ **Cancel Extraction** - Users can abort running extractions and clean up staged data
- ✅ **Dismissible Banners** - "Changes ready for review" banner can be dismissed
- ✅ **Stuck Job Detection** - Frontend detects jobs stuck >3 minutes and shows error state
- 📁 **Location:** See `docs/09-session-notes/2026-02-05-rent-roll-extraction-improvements.md`

### Previous Update: Property Tab Restructure (February 2, 2026)

**Acquisition & Renovation Sub-Tabs Added to Property Folder**

Restructured the Property folder tab navigation to include new Acquisition and Renovation sub-tabs:

- ✅ **Analysis Type Filtering** - Extended sub-tab system to filter by analysis type (not just project type)
- ✅ **Acquisition Sub-Tab** - New sub-tab showing Acquisition Ledger Grid (available for ALL project types)
- ✅ **Renovation Sub-Tab** - New sub-tab for VALUE_ADD analysis type projects only
- ✅ **Simplified Acquisition UI** - Removed modal, all inputs now inline with editable cells
- ✅ **Is Conditional Toggle** - Made "Is Conditional" column clickable/editable (like Apply column)
- ✅ **Optimized Column Widths** - Prevented horizontal scrolling with table-layout: fixed
- 📁 **Location:** See `docs/09_session_notes/2026-02-02-property-tab-restructure.md`

**Files Created:**
- `src/app/projects/[projectId]/components/tabs/AcquisitionSubTab.tsx` - Wrapper for ledger grid
- `src/app/projects/[projectId]/components/tabs/RenovationSubTab.tsx` - VALUE_ADD renovation config

**Files Modified:**
- `src/lib/utils/folderTabConfig.ts` - Added AnalysisTypeCode, updated filtering
- `src/hooks/useFolderNavigation.ts` - Now passes analysisType throughout
- `src/app/projects/[projectId]/page.tsx` - Added analysisType to hook options
- `src/app/projects/[projectId]/ProjectLayoutClient.tsx` - Added analysisType to hook options
- `src/app/projects/[projectId]/StudioContent.tsx` - Added routing for new sub-tabs
- `src/components/acquisition/AcquisitionLedgerGrid.tsx` - Major refactor (removed modal, inline editing)

### 🆕 Additional Update: Unit Cost Category Chips (February 2, 2026)

**Tokenized Category Pills**

Replaced the inline hex-driven category pills in the Unit Cost Library with a canonical `SemanticCategoryChip` component that simply renders `data-intent` + `data-selected` attributes. All colors now come from tokenized CSS in `component-patterns.css`/`tokens.css`, and the pill rendering in `UnitCostsPanel.tsx` is free of color math or Tailwind color utilities. This ensures the pills render consistently in both light and dark modes and aligns with the Landscape semantic styling guidelines.

**Files Modified:**
- `src/components/ui/SemanticCategoryChip.tsx` - New reusable chip implementation with dot + intent metadata
- `src/components/ui/landscape/SemanticCategoryChip.tsx` - Re-export of the shared chip for existing imports
- `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` - Removed `CATEGORY_COLOR_PALETTE`/`hexToRgba` and opted for intent-driven chips
- `src/styles/component-patterns.css` - Added intent-based styling keyed off `data-intent`/`data-selected`
- `src/styles/tokens.css` - Added semantic chip tokens (bg/border/text/outline) for every intent in light and dark theme sections

### Previous Update: Django Cash Flow Consolidation (February 1, 2026)

**Land Dev Cash Flow Engine Migration Complete**

Completed migration of Land Dev Cash Flow calculations from TypeScript to Django/Python:

- ✅ **Cash Flow Summary Proxy** - Next.js `/api/projects/{id}/cash-flow/summary` now proxies to Django
- ✅ **Waterfall Section Name Fix** - Fixed case-sensitive mismatch (Django returns UPPERCASE section names)
- ✅ **Preferred Return Timing** - Fixed Period 1 pref accrual (should not accrue until Period 2)
- ✅ **IRR Verification** - Confirmed 32.36% IRR matches expected calculations
- ✅ **Peak Equity** - Verified $106,028,258.30 peak equity requirement
- 📁 **Location:** See `docs/09_session_notes/2026-02-01-project-switch-tab-preservation.md` (Session 2)

**Files Modified:**
- `src/app/api/projects/[projectId]/cash-flow/summary/route.ts` - Django proxy
- `backend/apps/financial/views_land_dev_cashflow.py` - GET method support
- `backend/apps/calculations/services.py` - Lowercase section matching
- `services/financial_engine_py/financial_engine/waterfall/engine.py` - Pref accrual fix

### Previous Update: Project Switch Tab Preservation (February 1, 2026)

**Navigation UX Enhancement**

Improved project switching behavior to preserve user context:

- ✅ **Tab Preservation** - Switching projects now maintains the current tab/page instead of going to home
- ✅ **Dual URL Pattern Support** - Handles both path-based (`/projects/123/budget`) and query-param (`?folder=budget&tab=budget`) routes
- ✅ **Smart Fallback Logic** - Falls back to home when switching to income property while on Valuation tab
- ✅ **Utility Functions** - New `extractCurrentTabFromPath()` and `getProjectSwitchUrl()` in folderTabConfig.ts
- 📁 **Location:** See `docs/09_session_notes/2026-02-01-project-switch-tab-preservation.md`

### Previous Update: Cash Flow UI, Growth Rates, and DCF Improvements (January 30, 2026)

**Multi-Feature Enhancement Release**

Comprehensive improvements across Cash Flow Analysis, Growth Rate selectors, and DCF calculations:

- ✅ **Cash Flow UI Overhaul** - Removed redundant title, moved export button, colorized filter buttons
- ✅ **Villages/Phases Defaults** - Accordion open by default, all selections active on load
- ✅ **Growth Rate Type Prefixes** - Income/Expense/Cap Rate labels for clarity
- ✅ **Panel Width Adjustment** - Assumptions panel increased to 40% width
- ✅ **DCF Parameters Enhancement** - New ResultsSection component, improved controls
- ✅ **MapTab GIS Updates** - New LeafletGISView component, extended map controls
- ✅ **Landscaper AI Tools** - Enhanced ai_handler.py and tool_executor.py (+542 lines)
- 📁 **Location:** See `docs/09_session_notes/2026-01-30-cashflow-growth-dcf-improvements.md`

### Previous Update: Assumptions Panel Styling (January 29, 2026)

**CRE Income Approach Assumptions Panel Refinements**

Comprehensive styling update to the Assumptions Panel for Income Approach valuation:

- ✅ **Shaded Section Headers** - Income, Expenses, Capitalization, DCF headers with full-width backgrounds
- ✅ **Compact Panel Width** - Reduced by 20% (24% width, 260-320px)
- ✅ **Units Inside Inputs** - All values show units inside box (`3.00%`, `$300`, `10 yrs`)
- ✅ **Removed Lock Icons** - Calculated values (GPR, OpEx) display as plain text
- ✅ **Updated Labels** - "Method" dropdown, "Reserves/Unit/Yr" label
- ✅ **All Accordions Open** - DCF Parameters now expanded by default
- 📁 **Location:** See `docs/09_session_notes/2026-01-29-assumptions-panel-styling.md`

### Previous Update: Sales Comparison UI Refinements (January 29, 2026)

**Flat Excel-style Editable Cells for Sales Comparison Grid**

Polished the Sales Comparison Approach grid with cleaner input styling:

- ✅ **Removed Pill Styling** - Editable inputs now flat with no rounded capsule appearance
- ✅ **Consistent Header Backgrounds** - Transaction/Property accordion headers match light grey (#F7F7FB)
- ✅ **Increased Font Size** - Input text now 13px for better readability
- ✅ **Comprehensive CSS Overrides** - Browser/CoreUI defaults fully neutralized
- 📁 **Location:** See `docs/09_session_notes/2026-01-29-sales-comparison-ui-refinements.md`

### Previous Update: Map Tab Draw Tools Phase 3 (January 28, 2026)

**Interactive Drawing Tools for Map Tab**

Implemented full draw tools integration with @mapbox/mapbox-gl-draw:

- ✅ **Draw Modes** - Point, Line, Polygon drawing with MapboxDraw
- ✅ **Live Measurements** - Real-time distance (ft/mi), area (SF/acres), perimeter during drawing
- ✅ **useMapDraw Hook** - MapboxDraw integration with live measurement callbacks
- ✅ **useMapFeatures Hook** - CRUD operations for features via Django API
- ✅ **Django API** - `/api/v1/map/features/` endpoints for feature persistence
- ✅ **FeatureModal Refactor** - Extended to handle all geometry types with measurements
- ✅ **forwardRef MapCanvas** - Exposes map instance for draw initialization
- 📁 **Location:** See `docs/09_session_notes/2026-01-28-map-tab-draw-tools.md`

### Previous Update: Operating Expense Inline Editing (January 27, 2026)

**Operating Expense Category Inline Editing**

Added inline editing capability for operating expense line items in the Operations Tab:

- ✅ **ItemNameEditor Component** - Native dropdown using CoreUI `CFormSelect`
- ✅ **Double-Click to Edit** - Click expense item names to open category picker
- ✅ **Account Number Format** - Shows `4110 — Property Taxes` format matching app styling
- ✅ **useOpexCategories Hook** - SWR-based category fetching by parent
- ✅ **PATCH API** - `/api/projects/{id}/opex/{id}` for category updates
- 📁 **Location:** See `docs/09_session_notes/2026-01-27-opex-inline-editing.md`

### Previous Update: Multi-Feature Release (January 26, 2026)

**A. Location Intelligence System**

Implemented comprehensive location intelligence with Census demographics and map visualization:

- ✅ **PostGIS Schema** - 5 tables, 4 functions for ring demographic calculations
- ✅ **Census Data Integration** - TIGER/Line shapefiles + ACS 5-Year demographics via Census API
- ✅ **Django REST API** - 5 endpoints for demographics queries and caching
- ✅ **React Map Flyout** - MapLibre GL with Turf.js ring visualization, layer toggles, user points
- ✅ **Management Command** - `load_block_groups --states=06,04` for data ingestion
- 📁 **Location:** See `docs/09_session_notes/2026-01-26-location-intelligence-implementation.md`

**B. Landscaper Thread System**

Thread-based chat organization for Landscaper AI conversations:

- ✅ **Thread Models** - ChatThread, ThreadMessage, ChatEmbedding with page context scoping
- ✅ **Auto-Generated Titles** - Claude Haiku generates 3-5 word titles from conversations
- ✅ **RAG Summaries** - Thread summaries for cross-thread retrieval
- ✅ **Thread API** - CRUD endpoints for threads and messages
- 📁 **Location:** See `docs/09_session_notes/2026-01-26-landscaper-threads-auth-dcf.md`

**C. Auth Middleware & Route Protection**

Cookie-based authentication for Next.js middleware:

- ✅ **Middleware Protection** - Routes redirect to login if not authenticated
- ✅ **Cookie Sync** - `auth_token_exists` cookie synced with localStorage JWT
- ✅ **Public Routes** - Login, register, API, static assets excluded
- 📁 **Location:** See `docs/09_session_notes/2026-01-26-landscaper-threads-auth-dcf.md`

**D. DCF Valuation Implementation**

Discounted Cash Flow analysis added to Income Approach:

- ✅ **DCF Service** - 10-year cash flow projection with exit value
- ✅ **DCF View** - New DCFView component with IRR, equity multiple
- ✅ **Method Toggle** - Switch between Direct Cap and DCF in Value Tiles
- 📁 **Location:** See `docs/09_session_notes/2026-01-26-landscaper-threads-auth-dcf.md`

**E. Operating Statement Unified Table**

Unified Operating Income + Operating Expenses into a single aligned Operating Statement table:

- ✅ **Single Grid Layout** - Shared 8-column grid across income, vacancy, and expenses
- ✅ **Drag-and-Drop Preserved** - Expense children remain draggable for recategorization
- ✅ **Value-Add Columns** - Post-Reno/Reno Total hidden via visibility when disabled
- ✅ **Detail/Summary Toggle** - Expense section expansion retained
- 📁 **Location:** See `docs/00_overview/status/OPERATING_STATEMENT_UNIFIED_TABLE_COMPLETE_26-01-26.md`

### Previous Update: Operations & Income Approach Data Flow Fix (January 17, 2026)

Major refactoring to establish single source of truth for financial data across tabs:
- ✅ **Property Tab as Source** - Rental income and occupancy data flows from `tbl_multifamily_unit`
- ✅ **Operations Tab Read-Only** - Rental income now read-only with lock icon, calculated vacancy when rent roll exists
- ✅ **NOI Basis Consolidation** - Reduced from 4 to 3 bases (F-12 Current, F-12 Market, Stabilized)
- ✅ **3-Column P&L** - Income Approach now shows multi-column P&L with visibility toggles
- ✅ **Value Tiles 3+1** - Three Direct Cap tiles plus DCF placeholder
- 📁 **Location:** See `docs/00_overview/status/OPERATIONS_INCOME_APPROACH_DATA_FLOW_COMPLETE_26-01-17.md`

### Previous Update: Operations Tab Enhancements (January 14, 2026)
Enhanced the multifamily Operations Tab P&L interface with drag-and-drop and collapsible sections:
- ✅ **Draggable OpEx Categorization** - Drag expense items between parent categories
- ✅ **Detail/Summary Toggle** - All sections (Rental Income, Vacancy, OpEx) now collapsible
- ✅ **Vacancy Summary Row** - Shows total deduction percentage and amount when collapsed
- ✅ **CSS Refinements** - Fixed duplicate drag handles, tree connector alignment
- 📁 **Location:** `src/components/operations/` - See session notes for details

### Previous Update: Loss to Lease & Year 1 Buyer NOI (January 13, 2026)
Implemented comprehensive income analysis tools for multifamily underwriting:
- ✅ **Loss to Lease Calculator** - Simple and time-weighted methods
- ✅ **Year 1 Buyer NOI** - Actual rents + proforma expenses (realistic Day 1 cash flow)
- ✅ **Rent Control Awareness** - California AB 1482 and local ordinances
- ✅ **Landscaper Tool Integration** - 3 new AI tools for income analysis
- 📁 **Location:** `backend/apps/landscaper/services/` - See session notes for details

### Previous Update: Python Financial Engine (Phase 1 Complete)
**October 21, 2025** - Migrated core financial calculations from TypeScript to Python using industry-standard libraries:
- ✅ **5-10x Performance Improvement** - NumPy/Pandas vectorized operations
- ✅ **Battle-tested Algorithms** - numpy-financial (same as Excel, Bloomberg, FactSet)
- ✅ **Production Ready** - CLI functional, database connected, 88% test pass rate
- ✅ **Seamless Integration** - TypeScript API routes automatically use Python with fallback
- 📁 **Location:** `services/financial_engine_py/` - See [MIGRATION_STATUS.md](../../../services/financial_engine_py/MIGRATION_STATUS.md)

### Current Capabilities
✅ **Complete data layer** (324 tables, 42 views — post dead-table cleanup Mar 8)
✅ **Python Financial Engine** - IRR, XIRR, NPV, DSCR, equity multiple (5-10x faster)
✅ **Dependency resolution engine** with circular detection
✅ **S-curve timing distribution** (4 profiles)
✅ **Lease management** with escalations, recoveries, percentage rent
✅ **Lease rollover analysis** with probability weighting
✅ **Multifamily tracking** with unit-level leases, turns, occupancy
✅ **Universal Rent Roll Interface** with DVL auto-fill and real-time editing
✅ **Timeline calculation API** with dependency resolution
✅ **Interactive UI components** (budget grid, dependency panel, timeline viz, rent roll grid)
✅ **CI/CD pipeline** with Neon branching + Vercel deployment
✅ **Comprehensive testing** (80+ unit tests TypeScript, 15+ Python)
✅ **Test fixtures** (2 complete projects + multifamily sample)
✅ **Developer documentation**

---

## Current State Snapshot (2026-02-21)

### 🆕 Latest Updates

**January 27, 2026** - Operating Expense Inline Editing:
- ✅ **ItemNameEditor** - CoreUI CFormSelect dropdown for category selection
- ✅ **Double-Click UX** - Double-click expense child row labels to edit
- ✅ **Account Number Format** - `4110 — Property Taxes` matches app styling
- ✅ **useOpexCategories Hook** - SWR-based data fetching by parent category
- ✅ **PATCH Endpoint** - Single expense updates via `/api/projects/{id}/opex/{id}`
- 📁 **Files:** See `docs/09_session_notes/2026-01-27-opex-inline-editing.md`

**January 26, 2026** - Operating Statement Unified Table:
- ✅ **Single Table** - Operating Income + Expenses merged into one grid
- ✅ **Aligned Columns** - Label/Units/Current/Annual/$/SF/Loss to Lease/Post-Reno/Reno Total
- ✅ **Expense Dragging** - Drag/drop retained within OpEx section
- ✅ **Value-Add Columns** - Post-Reno columns hidden when disabled
- 📁 **Files:** See `docs/00_overview/status/OPERATING_STATEMENT_UNIFIED_TABLE_COMPLETE_26-01-26.md`

**January 17, 2026** - Operations & Income Approach Data Flow Fix:
- ✅ **Data Flow Architecture** - Property Tab → Operations Tab → Income Approach (single source of truth)
- ✅ **Operations Backend** - Query `tbl_multifamily_unit` directly, add current/market rent columns, calculate vacancy
- ✅ **Read-Only Rental Income** - Operations Tab now shows lock icon, "from Rent Roll" indicator
- ✅ **Conditional Vacancy Edit** - Physical vacancy calculated when rent roll exists, editable otherwise
- ✅ **NOI Basis Consolidation** - Changed from 4 bases to 3: F-12 Current, F-12 Market, Stabilized
- ✅ **3-Column P&L** - DirectCapView with visibility toggles, color-coded columns
- ✅ **Value Tiles 3+1** - Three Direct Cap tiles + DCF placeholder
- 📁 **Files:** See `docs/00_overview/status/OPERATIONS_INCOME_APPROACH_DATA_FLOW_COMPLETE_26-01-17.md`

**January 14, 2026** - Operations Tab Enhancements:
- ✅ **DraggableOpexSection** - New component using React DnD for expense categorization
- ✅ **DetailSummaryToggle** - Added to RentalIncomeSection and VacancyDeductionsSection
- ✅ **Vacancy Summary** - Shows combined deduction percentage (e.g., "7.5%") and total amount
- ✅ **CSS Fixes** - Removed duplicate drag handles, fixed tree connector for draggable rows
- ✅ **API Enhancement** - All expense items now persistently draggable between categories
- 📁 **Files:** `DraggableOpexSection.tsx`, `RentalIncomeSection.tsx`, `VacancyDeductionsSection.tsx`

**January 13, 2026** - Loss to Lease & Year 1 Buyer NOI Implementation:
- ✅ **IncomeAnalysisDetector** - Detects when LTL/Year 1 NOI analysis applies
- ✅ **LossToLeaseCalculator** - Simple and time-weighted methods with lease expiration schedule
- ✅ **Year1BuyerNOICalculator** - Realistic Day 1 cash flow (actual rents + proforma expenses)
- ✅ **RentControlService** - CA AB 1482, local ordinances, new construction exemptions
- ✅ **Landscaper Tools** - `analyze_loss_to_lease`, `calculate_year1_buyer_noi`, `check_income_analysis_availability`
- 📊 **Test Results (Vincent Village):** 40 units, 33.7% below market, $268K annual LTL, 3.4 years recovery under rent control

**January 10, 2026** - Document Extraction Integration for New Project Modal:
- ✅ **NewProjectDropZone Integration** - Drop documents to auto-populate project creation form
- ✅ **Claude API Extraction** - Real-time PDF/image analysis for property data extraction
- ✅ **Visual Extraction Indicators** - Blue rings and "Auto-filled" badges on populated fields
- ✅ **Clipboard Paste Support** - Paste documents directly into dropzone
- ✅ **Form Clear Button** - Reset form without closing modal
- 📁 **New API:** `/api/landscaper/extract-for-project` - Claude-based extraction

### Previous State Snapshot (2025-12-23)

### High-Level Summary
- Next.js 15 frontend with numerous App Router API routes querying Neon PostgreSQL via `src/lib/db.ts` (see `src/app/api/projects/[projectId]/route.ts` for direct table updates).
- Django 5 REST backend wired under `backend/config/urls.py` with custom search_path handling for the `landscape` schema in `backend/db_backend/base.py`.
- Python financial engine available for cashflow/metric computation alongside DRF endpoints in `backend/apps/calculations/views.py` and engine modules under `services/financial_engine_py/`.
- AI/extraction and knowledge features documented as in-progress in `docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-21.md`, with corresponding Next.js routes and Django apps present.
- Market ingestion CLI for macro data lives in `services/market_ingest_py/README.md`, targeting Postgres time-series tables.

### Implemented Features
- Container management PATCH endpoint validates duplicates and updates `landscape.tbl_container` through Neon (`src/app/api/containers/[containerId]/route.ts`, `src/lib/db.ts`).
- Developer fee API computes fee bases from project budget/financial tables and returns labeled summaries (`src/app/api/developer-operations/fees/route.ts`).
- Financial calculation endpoints expose IRR/NPV/DSCR and metric bundles via DRF, invoking the Python engine when available (`backend/apps/calculations/views.py`, `services/financial_engine_py/financial_engine/core/cashflow.py`).
- Multifamily CRUD/reporting ViewSets supply unit, lease, and turn APIs with occupancy summaries and floorplan diffs (`backend/apps/multifamily/views.py`).
- Knowledge persistence layer defines entity/fact/embedding tables with constraints and indexes for retrieval (`backend/apps/knowledge/models.py`).
- Market ingestion tooling fetches FRED/ACS/BLS/FHFA series and writes to Postgres with lineage tracking (`services/market_ingest_py/README.md`).
- Landscaper chat proxy forwards messages to the Django AI endpoints with request/response transforms (`src/app/api/projects/[projectId]/landscaper/chat/route.ts`).

### Partially Implemented Features
- PRESENT BUT INACTIVE: Unified DMS extraction uses regex fallback and logs “AI API not available” pending Claude integration (`src/app/api/dms/extract-unified/route.ts`).
- PRESENT BUT INACTIVE: Extraction commit endpoint applies corrections then only marks queue rows committed; TODO notes to persist into rent roll/operating/parcel tables (`src/app/api/extractions/[id]/commit/route.ts`).
- Benchmarks service tolerates missing tables by returning empty arrays and uses a stub CPI delta (`src/app/api/benchmarks/route.ts`, `src/app/api/benchmarks/inflation-analysis/route.ts`).
- Recent projects API hardcodes user id and fabricates `last_accessed` timestamps instead of reading audit data (`src/app/api/projects/recent/route.ts`).
- TypeScript build errors are ignored with a TODO to clean up strict issues (`next.config.ts`).

### Broken or Non-Functional Components
- Multifamily lease “expiring soon” count filters leases with `lease_end_date__lte=F('lease_end_date')`, which always matches active leases and omits the intended date window, so the summary is inaccurate (`backend/apps/multifamily/views.py`).

### Deferred / Stubbed Logic
- CPI auto-sync and historical integration are stubbed with hardcoded values in inflation analysis (`src/app/api/benchmarks/inflation-analysis/route.ts`).
- Auth integration is deferred across several routes (e.g., hardcoded user ids in `src/app/api/benchmarks/route.ts` and `src/app/api/projects/recent/route.ts`), indicating missing real auth context wiring.
- Strict type enforcement is deferred by `typescript.ignoreBuildErrors: true` in `next.config.ts`.

### Test Coverage Status
- Frontend/unit tests cover theme token contrast parsing (`tests/themeTokens.spec.ts`) and lease revenue calculations (`tests/lease-calculator.spec.ts`); Playwright checks header contrast in light/dark themes and includes a diagnostic probe that never fails (`tests/e2e/contrast.e2e.spec.ts`, `tests/contrast.probe.spec.ts`).
- Backend pytest suites exist for API presence and logic (e.g., project/auth/calculation endpoints in `backend/apps/projects/tests_api.py`, knowledge query mapping in `backend/apps/knowledge/tests/test_db_queries.py`, calculations integration in `backend/apps/calculations/tests_integration.py`), but many use mocked users and do not exercise real database writes.
- No evidence of coverage around the newer developer-operations or extraction flows beyond the above files.

### Evidence Index
- README/Status: `docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-21.md`
- Frontend APIs & DB helper: `src/app/api/containers/[containerId]/route.ts`, `src/app/api/developer-operations/fees/route.ts`, `src/lib/db.ts`, `src/app/api/projects/[projectId]/landscaper/chat/route.ts`
- Backend core: `backend/config/urls.py`, `backend/db_backend/base.py`, `backend/apps/calculations/views.py`, `backend/apps/multifamily/views.py`, `backend/apps/knowledge/models.py`
- Services/Tools: `services/financial_engine_py/financial_engine/core/cashflow.py`, `services/market_ingest_py/README.md`
- Tests: `tests/themeTokens.spec.ts`, `tests/lease-calculator.spec.ts`, `tests/e2e/contrast.e2e.spec.ts`, `tests/contrast.probe.spec.ts`, `backend/apps/projects/tests_api.py`, `backend/apps/knowledge/tests/test_db_queries.py`
- Config/Deferred: `src/app/api/dms/extract-unified/route.ts`, `src/app/api/extractions/[id]/commit/route.ts`, `src/app/api/benchmarks/route.ts`, `src/app/api/benchmarks/inflation-analysis/route.ts`, `src/app/api/projects/recent/route.ts`, `next.config.ts`

---

## Known Issues & Patterns

### 1. Auto-Scroll Bug on Page Mount

**Status:** RESOLVED  
**Last Occurrence:** December 2025  
**Severity:** High (makes pages unusable)

#### Symptoms
- Page automatically scrolls to bottom on load
- Top content hidden and difficult to reach
- Occurs when navigating to pages with chat components

#### Root Cause
Chat components using `scrollIntoView` in a useEffect that fires on mount:

```tsx
// ❌ BAD - This scrolls on every message change including initial load
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

The effect fires when:
1. Component mounts with empty messages
2. Chat history loads from API/cache
3. `scrollIntoView` scrolls entire page to the chat div at bottom

#### Affected Components (Historical)
- `src/components/landscaper/ChatInterface.tsx`
- `src/app/components/new-project/LandscaperPanel.tsx`
- `src/app/projects/[projectId]/components/landscaper/AgentChat.tsx`

#### Solution Patterns

**Pattern A: Input-Only Component (Preferred for embedded chat)**

For workspace/dashboard layouts where chat is a footer input, use a component that doesn't render message history:

```tsx
// ✅ GOOD - WorkspaceChatInput.tsx
export function WorkspaceChatInput({ projectId }: { projectId: string }) {
  const [input, setInput] = useState('');
  const { mutate: sendMessage, isPending } = useSendMessage(projectId);
  
  // Just input + send button
  // No message list, no messagesEndRef, no scrollIntoView
}
```

**Pattern B: User Interaction Guard (For full chat panels)**

When auto-scroll IS needed after user sends a message:

```tsx
// ✅ GOOD - Only scroll after user interaction
const userHasSentMessage = useRef(false);
const prevCount = useRef(0);

useEffect(() => {
  if (userHasSentMessage.current && localMessages.length > prevCount.current) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  prevCount.current = localMessages.length;
}, [localMessages]);

const handleSend = () => {
  userHasSentMessage.current = true; // Enable scrolling only after first send
  // ... send logic
};
```

#### Prevention Checklist
- [ ] Does this component need to display message history?
- [ ] If NO → Use input-only pattern (Pattern A)
- [ ] If YES → Use user interaction guard (Pattern B)
- [ ] Never use unguarded `scrollIntoView` in useEffect with message dependencies
- [ ] Test by navigating TO the page (not just refreshing)

#### Debug Command
```bash
rg -n "scrollIntoView|scrollTo|autoFocus|\\.focus\\(" src/
```

### 2. [Template for Future Issues]

**Status:** [RESOLVED/OPEN/MONITORING]  
**Last Occurrence:** [Date]  
**Severity:** [High/Medium/Low]

#### Symptoms
[What the user sees]

#### Root Cause
[Technical explanation]

#### Solution
[Code pattern or fix]

#### Prevention
[How to avoid reintroduction]

---

## Task Queue (Consolidated)

**Purpose:** Ordered backlog of work with entry conditions and dependencies.  
**Last Updated:** 2025-12-23  
**Branch:** `work`

### Completed Work (December 23, 2025)

#### ✅ BLOCKED-000: Commit or Stash Current Changes
**Status:** COMPLETE  
**Completed:** 2025-12-23  
**Resolution:**
- Feature branch `feature/landscaper-panel-restructure` merged to `work` (25 commits)
- 299 files consolidated into organized commits
- Backup branch preserved: `backup-landscaper-panel-20251223`
- Clean working tree achieved

#### ✅ BUG-001: Multifamily Lease "Expiring Soon" Query Bug
**Status:** COMPLETE  
**Completed:** 2025-12-23  
**Commit:** `89da8d3`  
**Source:** `backend/apps/multifamily/views.py:161-165`

**Problem (was):**
```python
expiring_soon = leases.filter(
    lease_status='ACTIVE',
    lease_end_date__lte=F('lease_end_date')  # ALWAYS TRUE - compares field to itself
).count()
```

**Solution (now):**
```python
expiring_soon = leases.filter(
    lease_status='ACTIVE',
    lease_end_date__gte=date.today(),
    lease_end_date__lte=date.today() + timedelta(days=90)
).count()
```

**Verification:** Manual query validation passed - returns correct count for 90-day window.

### Priority 1: Critical Bugs

#### BUG-002: Extraction Commit Endpoint Incomplete
**Status:** BLOCKED (requires design clarification)  
**Source:** `PROJECT_STATE.md` line 19, `src/app/api/extractions/[id]/commit/route.ts:66`

**Problem:**
```typescript
// TODO: Commit the data to the appropriate tables based on extraction_type
```

Endpoint marks queue rows as committed but does NOT persist to actual tables (`tbl_mf_unit`, rent roll, operating, parcel).

**Entry Condition:**
- Clarify which tables each extraction_type maps to
- Define field mapping from staging to target tables

**Definition of Done:**
- Extraction data written to appropriate target tables
- Status updated correctly
- Rollback logic if partial failure

**Dependencies:** Field registry mapping must be complete

### Priority 2: Technical Debt

#### DEBT-001: TypeScript Strict Mode Cleanup
**Status:** DEFERRED (explicit TODO in config)  
**Source:** `next.config.ts` line 6

**Problem:** Build ignores TypeScript errors. Unknown types, Activity mismatches.

**Entry Condition:** Dedicated PR with no feature work  
**Definition of Done:**
- `typescript.ignoreBuildErrors: false` works
- All type errors resolved or explicitly suppressed with comments
- Build succeeds clean

**Dependencies:** None, but large effort

#### DEBT-002: Suspense Boundary Wrappers
**Status:** DEFERRED (explicit TODO in config)  
**Source:** `next.config.ts` lines 10-13

**Problem:** `missingSuspenseWithCSRBailout: false` bypasses Next.js 15 requirement.

**Entry Condition:** Audit all `useSearchParams()` usage  
**Definition of Done:**
- All components with useSearchParams wrapped in Suspense
- Config option removed
- No CSR bailout warnings

**Dependencies:** DEBT-001 may intersect

#### DEBT-003: Auth Integration
**Status:** BLOCKED (requires auth system design)  
**Source:** Multiple TODOs across codebase

**Scope:**
- `src/app/api/projects/recent/route.ts` - hardcoded user_id
- `src/app/api/benchmarks/route.ts` - hardcoded user_id
- `backend/apps/projects/views.py` - AllowAny permissions
- `backend/apps/acquisition/views.py` - AllowAny permissions

**Entry Condition:**
- Auth system chosen and documented
- JWT implementation complete in Django

**Definition of Done:**
- All endpoints use authenticated user context
- AllowAny replaced with IsAuthenticated
- User audit trail functional

**Dependencies:** Auth infrastructure must exist first

### Priority 3: Feature Completion

#### FEAT-001: Claude API Full Integration for Landscaper
**Status:** IN PROGRESS (partial)  
**Source:** `docs/00_overview/status/IMPLEMENTATION_STATUS_25-12-21.md` line 139

**Current State:**
- Claude API calls exist in `ai_handler.py`
- Tool use implemented for field updates
- Some flows still mocked

**Entry Condition:** Anthropic API key configured  
**Definition of Done:**
- All chat responses use Claude API
- No stub/mock responses in production paths
- Error handling for API failures
- Rate limiting considered

**Dependencies:** ANTHROPIC_API_KEY in environment

#### FEAT-002: Document Extraction to Activity Generation
**Status:** PLANNED (Phase 4)  
**Source:** `IMPLEMENTATION_STATUS_25-12-21.md` lines 241-242

**Entry Condition:** Extraction pipeline stable  
**Definition of Done:**
- Activity created when document extraction completes
- Activity links to extracted fields
- Field highlighting works from activity click

**Dependencies:** FEAT-001 (extraction must work end-to-end)

#### FEAT-003: Rent Roll Bulk Validation and Writing
**Status:** PLANNED  
**Source:** `docs/09_session_notes/2025-12-18-chunked-rent-roll-extraction.md` lines 145-149

**Current State:**
- Chunked extraction works (96 units extracted from Chadron)
- Units staged in `ai_extraction_staging`
- No writer to `tbl_mf_unit`

**Entry Condition:** Staging table has pending rent roll records  
**Definition of Done:**
- Bulk validation endpoint exists
- Writer persists validated units to `tbl_mf_unit`
- Duplicate handling (update vs insert)
- Audit trail of what was written

**Dependencies:** Extraction pipeline must be stable

#### FEAT-004: GP Catch-up UI Configuration
**Status:** PLANNED  
**Source:** `WATERFALL_STATUS.md` lines 259-263

**Entry Condition:** Waterfall engine working (it is)  
**Definition of Done:**
- UI toggle in napkin form
- Database field to store preference
- Service layer reads from DB instead of hardcoded `False`

**Dependencies:** None

#### FEAT-005: EMx Hurdle Gating in Waterfall
**Status:** PLANNED  
**Source:** `WATERFALL_STATUS.md` lines 265-269

**Entry Condition:** Understanding of distribution flow  
**Definition of Done:**
- `is_hurdle_met()` called before tier distributions
- EMx mode selectable in UI
- EMx thresholds configurable per tier

**Dependencies:** None

### Priority 4: Infrastructure

#### INFRA-001: Test Coverage for Extraction Flows
**Status:** NOT STARTED  
**Source:** `PROJECT_STATE.md` line 35

**Problem:**
> "No evidence of coverage around the newer developer-operations or extraction flows"

**Entry Condition:** Features stable enough to test  
**Definition of Done:**
- pytest tests for extraction service
- pytest tests for developer-operations endpoints
- Frontend component tests for extraction UI

**Dependencies:** Features must be stable

#### INFRA-002: Next.js to Django Migration Tracking
**Status:** NOT STARTED
**Source:** Observation - no migration tracker exists

**Problem:**
395 Next.js API routes exist. No documented plan for which to migrate when.

**Entry Condition:** Decision on migration priority  
**Definition of Done:**
- List of routes categorized by migration priority
- Tracking document for progress
- CI check preventing new Next.js routes

**Dependencies:** Product decision on priority

### DO NOT ATTEMPT YET

#### BLOCKED: Notification System
**Reason:** Activity feed infrastructure still maturing  
**Source:** `IMPLEMENTATION_STATUS_25-12-21.md` line 253

#### BLOCKED: Excel Export for Waterfall
**Reason:** Placeholder exists but core waterfall still has gaps (GP catch-up, EMx)  
**Source:** `WATERFALL_STATUS.md` line 279

#### BLOCKED: Sensitivity Analysis
**Reason:** Requires stable waterfall with all modes working  
**Source:** `WATERFALL_STATUS.md` lines 273-275

### Task Dependencies Graph

```
✅ BLOCKED-000 (Commit Changes) - COMPLETE
✅ BUG-001 (Expiring Soon) - COMPLETE

Current Active Dependencies:
    │
    ├── BUG-002 (Extraction Commit) ──────────────┐
    │       │                                      │
    │       └── FEAT-003 (Rent Roll Writer) ──────┤
    │                                              │
    ├── FEAT-001 (Claude Full Integration) ───────┤
    │       │                                      │
    │       └── FEAT-002 (Extraction Activities)──┤
    │                                              │
    ├── FEAT-004 (GP Catch-up UI) ────────────────┤
    │                                              │
    ├── FEAT-005 (EMx Hurdle) ────────────────────┤
    │                                              │
    ├── DEBT-001 (TypeScript) ────────────────────┤
    │       │                                      │
    │       └── DEBT-002 (Suspense) ──────────────┤
    │                                              │
    └── DEBT-003 (Auth) ──────────────────────────┘
            │
            └── INFRA-001 (Test Coverage)
```

### Estimation Warning

No time estimates provided per project conventions. Tasks marked as small/medium/large for relative sizing only:

| Task | Relative Size |
|------|---------------|
| ~~BUG-001~~ | ~~Small~~ ✅ DONE |
| BUG-002 | Medium |
| DEBT-001 | Large |
| DEBT-002 | Medium |
| DEBT-003 | Large |
| FEAT-001 | Medium |
| FEAT-002 | Small |
| FEAT-003 | Medium |
| FEAT-004 | Small |
| FEAT-005 | Medium |

---

## ✅ PHASE 1: Schema Foundation (100%)

### Database Tables: 28 Created + 7 Enhanced

#### Core Infrastructure (Enhanced Existing - 5 tables)
- ✅ `tbl_project` - Financial config (discount rate, model type, periods)
- ✅ `tbl_area` - Geographic boundaries
- ✅ `tbl_phase` - Development phases with timeline
- ✅ `tbl_parcel` - Income property fields (rentable SF, building class)
- ✅ `tbl_budget` - Expense type and timing

#### Income Property (15 tables)
- ✅ `tbl_lease` - Master lease register
- ✅ `tbl_base_rent` - Rent schedule periods
- ✅ `tbl_escalation` - Escalation rules (Fixed %, CPI, Stepped)
- ✅ `tbl_recovery` - Expense recovery (Gross, NNN, Modified Gross)
- ✅ `tbl_additional_income` - Parking, signage, percentage rent
- ✅ `tbl_tenant_improvement` - TI/LC allowances
- ✅ `tbl_leasing_commission` - Broker commissions
- ✅ `tbl_operating_expense` - OpEx for income properties
- ✅ `tbl_lot` - Individual units/lots
- ✅ `tbl_loan` - Debt facilities
- ✅ `tbl_equity` - Equity structure
- ✅ `tbl_waterfall` - Distribution waterfalls
- ✅ `tbl_cashflow` - Granular cash flows
- ✅ `tbl_cashflow_summary` - Aggregated metrics
- ✅ `tbl_project_metrics` - Return metrics (IRR, EM, NPV)

#### Lookup Tables (3 tables)
- ✅ `lu_lease_status` - Lease statuses
- ✅ `lu_lease_type` - Lease types
- ✅ `lu_recovery_structure` - Recovery structures

#### Views (2 views)
- ✅ `v_lease_summary` - Lease count & occupancy
- ✅ `v_rent_roll` - Rent roll with expirations

**Migration:** `001_financial_engine_schema.sql` ✅ EXECUTED

---

## ✅ PHASE 1.5: Dependencies & Revenue (100%)

### New Tables: 7 Created + 2 Enhanced

#### Universal Dependency System (1 table)
- ✅ `tbl_item_dependency` - Links costs, revenue, financing with triggers

#### Absorption & Revenue (2 tables)
- ✅ `tbl_absorption_schedule` - Revenue stream definitions
- ✅ `tbl_revenue_timing` - Period-by-period revenue

#### Enhanced Debt Facilities (2 tables)
- ✅ `tbl_debt_facility` - Multi-facility debt structure
- ✅ `tbl_debt_draw_schedule` - Period-by-period draws

#### Equity Partners (2 tables)
- ✅ `tbl_equity_partner` - Partner/investor tracking
- ✅ `tbl_equity_distribution` - Period distributions

#### Enhanced Existing (2 tables)
- ✅ `tbl_budget_items` - Added timing, S-curve, actuals, variance
- ✅ `tbl_calculation_period` - Added period status (OPEN, CLOSED, LOCKED)

#### Views (5 views)
- ✅ `vw_item_dependency_status` - Dependency status with calculations
- ✅ `vw_budget_with_dependencies` - Budget items with dependencies
- ✅ `vw_absorption_with_dependencies` - Absorption with dependencies
- ✅ `vw_revenue_timeline` - Revenue by period
- ✅ `vw_debt_balance_summary` - Debt balance by period

**Migrations:**
- `002_dependencies_revenue_finance.sql` ✅ EXECUTED
- `002a_fix_dependency_views.sql` ✅ EXECUTED (hotfix)

---

## ✅ PHASE 2: API Endpoints (70%)

### TypeScript Types (40+ interfaces)
- ✅ `src/types/financial-engine.ts` - Complete type definitions

### Database Utilities (1,000+ lines)
- ✅ `src/lib/financial-engine/db.ts` - CRUD operations for leases

### API Routes Created (16 endpoints)

#### Lease Management ✅
- ✅ `GET /api/leases?project_id={id}` - List leases
- ✅ `POST /api/leases` - Create lease
- ✅ `GET /api/lease/[id]` - Get lease
- ✅ `PUT /api/lease/[id]` - Update lease
- ✅ `DELETE /api/lease/[id]` - Delete lease
- ✅ `GET /api/projects/[projectId]/lease-summary` - Lease summary

#### Dependencies ✅
- ✅ `GET /api/dependencies?project_id={id}` - List dependencies
- ✅ `GET /api/dependencies?dependent_item_id={id}` - List for item
- ✅ `POST /api/dependencies` - Create dependency
- ✅ `PUT /api/dependencies/[id]` - Update dependency
- ✅ `DELETE /api/dependencies/[id]` - Delete dependency

#### Timeline Calculation ✅
- ✅ `POST /api/projects/[projectId]/timeline/calculate` - Calculate & save
- ✅ `GET /api/projects/[projectId]/timeline/calculate` - Preview (dry run)

#### Absorption ✅
- ✅ `GET /api/absorption?project_id={id}` - List schedules
- ✅ `POST /api/absorption` - Create schedule
- ✅ `GET /api/absorption/[id]` - Get schedule
- ✅ `PUT /api/absorption/[id]` - Update schedule
- ✅ `DELETE /api/absorption/[id]` - Delete schedule

#### Rent Roll ✅
- ✅ `GET /api/rent-roll/expirations?project_id={id}` - Expirations report

### Pending APIs (30%)
- ⏳ `POST /api/projects/[id]/calculate-lease-revenue` - Lease revenue calc
- ⏳ `GET /api/projects/[id]/noi` - NOI calculation
- ⏳ Budget items CRUD endpoints
- ⏳ Debt facility CRUD endpoints
- ⏳ Equity partner CRUD endpoints

**Documentation:** `API_REFERENCE_PHASE2.md` ✅ COMPLETE

---

## ✅ PHASE 3: Calculation Engine (40%)

### S-Curve Distribution Engine ✅ (100%)
**File:** `src/lib/financial-engine/scurve.ts` (280 lines)

#### Functions (7 implemented)
- ✅ `generateSCurveAllocation()` - Generate period allocations
- ✅ `validateAllocation()` - Validate sum to total
- ✅ `applyAllocationToPeriods()` - Apply to absolute periods
- ✅ `calculateCumulativeAllocation()` - Cumulative calculations
- ✅ `calculatePercentComplete()` - Progress tracking
- ✅ `findPeriodForPercentage()` - Reverse lookup
- ✅ `getSCurveProfileDescription()` - Profile descriptions

#### S-Curve Profiles (4 implemented)
- ✅ **LINEAR** - Equal distribution
- ✅ **FRONT_LOADED** - 60% first half, 40% second
- ✅ **BACK_LOADED** - 40% first half, 60% second
- ✅ **BELL_CURVE** - Normal distribution

#### Unit Tests
- ✅ 45 tests, 100% coverage
- ✅ `src/lib/financial-engine/__tests__/scurve.test.ts`

**Documentation:** `SCURVE_CALCULATION_ENGINE.md` ✅ COMPLETE

### Lease Calculator ✅ (100%)
**File:** `src/lib/financial-engine/lease-calculator.ts` (340 lines)

#### Functions (10 implemented)
- ✅ `buildEscalationSchedule()` - Escalation segments
- ✅ `calculateRentForPeriod()` - Period rent with escalations
- ✅ `calculateFreeRentAdjustment()` - Free rent concessions
- ✅ `calculatePercentageRent()` - Retail overage
- ✅ `calculateRecoveries()` - CAM/tax/insurance recoveries
- ✅ `calculateLeaseRevenueForPeriod()` - Complete revenue
- ✅ `calculateLeaseRevenue()` - Full term revenue
- ✅ `validateLease()` - Data validation

#### Unit Tests
- ✅ 20+ tests
- ✅ `tests/lease-calculator.spec.ts`

### Lease Rollover Engine ✅ (100%)
**File:** `src/lib/financial-engine/lease-rollover.ts` (340 lines)

#### Functions (8 implemented)
- ✅ `generateRolloverDecision()` - Renewal vs re-lease
- ✅ `applyRolloverDecision()` - Create new lease
- ✅ `calculateExpectedRolloverCost()` - Probability-weighted
- ✅ `analyzeRolloverScenarios()` - Both scenarios
- ✅ `calculateLeaseEconomics()` - Economics summary
- ✅ `validateAssumptions()` - Assumptions validation
- ✅ `generateCapitalReserves()` - TI/LC reserves

#### Unit Tests
- ✅ 15+ tests
- ✅ `tests/lease-rollover.spec.ts`

### Pending Calculations (60%)
- ⏳ Revenue timing calculator (populate `tbl_revenue_timing`)
- ⏳ Debt draw scheduler (populate `tbl_debt_draw_schedule`)
- ⏳ NOI calculator (lease revenue - OpEx)
- ⏳ IRR/NPV calculator
- ⏳ Waterfall distribution engine
- ⏳ DSCR calculator

---

## ✅ PHASE 4: UI Integration (50%)

### React Components Created (3 components - 1,180 lines)

#### BudgetGridWithDependencies ✅
**File:** `src/app/components/BudgetGridWithDependencies.tsx` (450 lines)
- ✅ Material-UI table with budget items
- ✅ Inline editing (timing method, start period, duration, S-curve)
- ✅ Dependency indicators (linked/unlinked chips)
- ✅ Calculate Timeline button
- ✅ Settings icon opens dependency panel
- ✅ Real-time API integration

#### DependencyConfigPanel ✅
**File:** `src/app/components/DependencyConfigPanel.tsx` (380 lines)
- ✅ Material-UI drawer (side panel)
- ✅ List current dependencies
- ✅ Delete dependencies
- ✅ Add new dependencies (full form)
- ✅ Conditional trigger value field
- ✅ Auto-updates timing_method to DEPENDENT

#### TimelineVisualization ✅
**File:** `src/app/components/TimelineVisualization.tsx` (350 lines)
- ✅ Canvas-based Gantt chart
- ✅ Color-coded timeline bars (Green: Absolute, Blue: Dependent, Orange: Manual)
- ✅ Current period slider
- ✅ Period markers
- ✅ Amount labels
- ✅ Legend

### Pending UI Components (50%)
- ⏳ Lease management forms
- ⏳ Absorption schedule forms
- ⏳ Financial summary dashboard
- ⏳ Waterfall visualization
- ⏳ Cash flow charts

**Documentation:** `UI_COMPONENTS_PHASE4.md` ✅ COMPLETE

---

## ✅ PHASE 5: Lease Management (100%)

### Migration ✅
**File:** `migrations/006_lease_management.sql` (330 lines)

### New Tables (6 tables)
- ✅ `tbl_rent_roll` - In-place leases
- ✅ `tbl_lease_assumptions` - Market & rollover parameters
- ✅ `tbl_operating_expenses` - Recoverable/non-recoverable OpEx
- ✅ `tbl_capital_reserves` - TI/LC/CapEx triggers
- ✅ `tbl_lease_revenue_timing` - Periodized revenue
- ✅ `tbl_opex_timing` - Periodized expenses

### Views (1 view)
- ✅ `vw_lease_expiration_schedule` - Expirations with mark-to-market

### Helper Functions (2 functions)
- ✅ `get_period_from_date()` - Date → period conversion
- ✅ `get_date_from_period()` - Period → date conversion

**Status:** ✅ Migration executed, ready for lease revenue calculation API

---

## ✅ PHASE 7: DevOps & CI/CD (100%)

### Neon Branching Scripts (3 scripts)
- ✅ `neon-branch-create.sh` - Create PR database branch
- ✅ `neon-branch-delete.sh` - Delete PR branch on close
- ✅ `run-migrations.sh` - Migration runner with tracking

### GitHub Actions Workflows (4 workflows)
- ✅ `.github/workflows/preview.yml` - PR preview environments
- ✅ `.github/workflows/cleanup.yml` - PR cleanup
- ✅ `.github/workflows/production.yml` - Production deployment
- ✅ `.github/workflows/disaster-drill.yml` - Weekly DR tests

### Database Management (3 scripts)
- ✅ `setup-database-roles.sql` - Three-role security model
- ✅ `rollback-production.sh` - Point-in-time restore
- ✅ `setup-monitoring.sql` - Query logging & SLO tracking

### Monitoring & Observability ✅
- ✅ pg_stat_statements enabled
- ✅ Slow query logging (>200ms)
- ✅ 6 monitoring views
- ✅ 3 monitoring functions
- ✅ SLO tracking (p95 <250ms, cache >99%)

**Documentation:** `DEVOPS_GUIDE.md` ✅ COMPLETE (1,365 lines)

---

## ✅ PHASE 8: Multifamily Property Tracking (100%)

### Migration ✅
**File:** `migrations/008_add_multifamily_units.sql` (19,395 lines)
**Executed:** October 14, 2025

### New Tables (4 tables)
- ✅ `tbl_multifamily_unit` - Unit inventory with renovation tracking
- ✅ `tbl_multifamily_lease` - Lease agreements with concessions
- ✅ `tbl_multifamily_turn` - Turn tracking with make-ready costs
- ✅ `tbl_multifamily_unit_type` - Unit type master data

### Views (5 views)
- ✅ `vw_multifamily_unit_status` - Occupancy with loss-to-lease
- ✅ `vw_multifamily_lease_expirations` - Expiring leases (12 months)
- ✅ `vw_multifamily_turn_metrics` - Turn days/costs by unit type
- ✅ `vw_multifamily_occupancy_summary` - Physical/economic occupancy
- ✅ `vw_multifamily_project_summary` - Project-level rollup

### API Endpoints (5 endpoints - 1,500+ lines)
- ✅ `GET/POST /api/multifamily/units` - Unit CRUD
- ✅ `GET/POST /api/multifamily/leases` - Lease CRUD
- ✅ `GET/POST /api/multifamily/turns` - Turn tracking
- ✅ `GET /api/multifamily/reports/occupancy` - Occupancy report
- ✅ `GET /api/multifamily/reports/expirations` - Expirations report

### Key Features ✅
- ✅ **Automatic calculations** - Effective rent, vacant days, total costs
- ✅ **BIGINT conversion** - All IDs properly converted to Number
- ✅ **Loss-to-lease** - Market rent vs actual rent analysis
- ✅ **Turn metrics** - Average days and costs by unit type
- ✅ **Occupancy tracking** - Physical vs economic occupancy
- ✅ **Renewal tracking** - Renewal vs new lease identification

### Sample Data ✅
**Project 9 (Peoria Lakes)**:
- 3 unit types (1BR, 2BR, 3BR)
- 8 units in Building A
- 4 leases (3 ACTIVE, 1 NOTICE_GIVEN)
- 1 completed turn (17 days, $450)
- Occupancy: 50% physical, 46.69% economic, $6,290 loss-to-lease

**Status:** ✅ Complete - All APIs tested and working

---

## ✅ UNIVERSAL RENT ROLL INTERFACE (100%)

### Implementation Complete ✅
**Date:** October 15, 2025
**Status:** Production Ready

### Components (2,200+ lines)
- ✅ **RentRollGrid** - Main rent roll with dual-table integration (1,800 lines)
- ✅ **FloorplansGrid** - Unit type definitions and master data (408 lines)
- ✅ **Custom CSS** - AG-Grid dark theme overrides (40 lines)

### Key Features ✅
- ✅ **AG-Grid Community v34+** - Dark theme with legacy mode
- ✅ **Real-time inline editing** - Auto-save on cell change
- ✅ **Dual-table architecture** - Units + Leases in single view
- ✅ **Dynamic Value Lists (DVL)** - Unit type dropdown
- ✅ **DVL auto-fill system** - Bed/bath/SF populate from unit type
- ✅ **Data type safety** - Numeric conversions for AG-Grid compatibility
- ✅ **Z-index fixes** - Cell editors appear above headers
- ✅ **Database constraint management** - Flexible unit type validation
- ✅ **Add/delete rows** - Full CRUD operations
- ✅ **Success/error notifications** - Toast notifications
- ✅ **Column definitions** - 13 editable columns with proper types

### Column Configuration ✅
1. Unit # (pinned left, 100px)
2. Building (120px)
3. Unit Type (DVL dropdown, 120px) - **triggers auto-fill**
4. Bed (numeric, 0-10, 80px) - **auto-fills**
5. Bath (numeric, 0.5-10, 80px) - **auto-fills**
6. Square Feet (numeric with commas, 100px) - **auto-fills**
7. Other Features (large text popup, 200px)
8. Tenant Name (150px)
9. Lease Start (date picker, 130px)
10. Lease End (date picker, 130px)
11. Term (calculated months, 90px)
12. Rent Amount (currency, 130px)
13. Status (dropdown, 120px)
14. Actions (delete button, pinned right, 100px)

### Technical Achievements ✅
- ✅ **Event loop management** - Avoided infinite `onCellValueChanged` triggers
- ✅ **Direct data updates** - Using `rowData` + `refreshCells()` pattern
- ✅ **Type conversions** - PostgreSQL strings → JavaScript numbers
- ✅ **Performance optimization** - useMemo for unitTypeMap, targeted refreshes
- ✅ **Error handling** - Cell reversion on save failure

### Bug Fixes Completed ✅
1. ✅ Cell editor z-index (hidden behind headers)
2. ✅ "No valid fields to update" errors (allowedFields expanded)
3. ✅ DVL value reversion (removed setData/mutate loops)
4. ✅ Bedrooms column missing (added to schema)
5. ✅ CHECK constraint violation (dropped chk_unit_type)
6. ✅ Data type mismatch warnings (added parseFloat/parseInt)
7. ✅ Bedrooms not auto-filling (added to updates + refresh)
8. ✅ Floorplans grid warnings (API numeric conversions)

### API Integration ✅
- ✅ `GET/PATCH /api/multifamily/units/[id]` - Unit CRUD
- ✅ `GET/PATCH /api/multifamily/leases/[id]` - Lease CRUD
- ✅ `GET/PATCH /api/multifamily/unit-types` - DVL master data
- ✅ BIGINT conversions for all numeric fields
- ✅ Automatic lease_term_months calculation
- ✅ Field validation and error handling

**Documentation:** `UNIVERSAL_RENT_ROLL_INTERFACE.md` ✅ COMPLETE (650+ lines)

---

## ✅ TEST INFRASTRUCTURE (100%)

### Unit Tests (80+ tests)
- ✅ `scurve.test.ts` - 45 tests, 100% coverage
- ✅ `lease-calculator.spec.ts` - 20+ tests
- ✅ `lease-rollover.spec.ts` - 15+ tests
- ✅ Jest configuration with Next.js

### Test Fixtures (2 complete projects)
- ✅ **Peoria Lakes Phase 1** (ID: 7) - MPC with dependencies
  - 4 budget items with chained dependencies
  - 1 absorption schedule (80 lots)
  - 2 leases (Office + Retail)
  - Debt + equity structure

- ✅ **Carney Power Center** (ID: 8) - Retail power center
  - 5 retail tenants (identical specs)
  - All with percentage rent
  - 200 acres in Phoenix, AZ

### Fixture Scripts
- ✅ `seed-test-data.sql` - Complete fixture data (420 lines)
- ✅ `smoke-test-fixtures.sql` - 10 comprehensive tests (360 lines)
- ✅ `load-fixtures.sh` - Automated loader

**Documentation:** `TEST_FIXTURES.md` ✅ COMPLETE

---

## ✅ DOCUMENTATION (100%)

### Technical Documentation (8 documents - 5,500+ lines)
- ✅ `FINANCIAL_ENGINE_SCHEMA.md` - Complete schema reference (1,000+ lines)
- ✅ `API_REFERENCE_PHASE2.md` - API endpoint documentation
- ✅ `SCURVE_CALCULATION_ENGINE.md` - S-curve engine guide (850 lines)
- ✅ `UI_COMPONENTS_PHASE4.md` - Component documentation (850 lines)
- ✅ `DEVOPS_GUIDE.md` - Complete DevOps handbook (1,365 lines)
- ✅ `TEST_FIXTURES.md` - Test data guide
- ✅ `FINANCIAL_ENGINE_INDEX.md` - Master navigation
- ✅ `DEVELOPER_GUIDE.md` - Developer onboarding (NEW - complete)

### Developer Resources
- ✅ Quick start guide
- ✅ API reference with examples
- ✅ Data contracts (TypeScript interfaces)
- ✅ Conventions & standards
- ✅ Testing guide
- ✅ Development workflows
- ✅ Debugging tips
- ✅ Onboarding checklist

---

## ⏳ REMAINING WORK

### Phase 2: API Endpoints (30% remaining)
**Priority:** HIGH
- [ ] `POST /api/projects/[id]/calculate-lease-revenue` - Lease revenue calculation
- [ ] `GET /api/projects/[id]/noi` - NOI calculation
- [ ] Budget items CRUD endpoints
- [ ] Debt facility CRUD endpoints
- [ ] Equity partner CRUD endpoints

**Estimated:** 2-3 days

### Phase 3: Calculation Engine (60% remaining)
**Priority:** HIGH
- [ ] Revenue timing calculator
- [ ] Debt draw scheduler
- [ ] NOI calculator (lease revenue - OpEx)
- [ ] IRR/NPV calculator
- [ ] Waterfall distribution engine
- [ ] DSCR calculator

**Estimated:** 1 week

### Phase 4: UI Components (50% remaining)
**Priority:** MEDIUM
- [ ] Lease management forms
- [ ] Absorption schedule forms
- [ ] Financial summary dashboard
- [ ] Waterfall visualization
- [ ] Cash flow charts

**Estimated:** 1 week

### Phase 6: Reporting & Exports
**Priority:** LOW
- [ ] PDF report generation
- [ ] Excel export functionality
- [ ] Cash flow waterfall reports
- [ ] Lease expiration reports
- [ ] Return metrics dashboard

**Estimated:** 1 week

### Phase 9: ARGUS Parity Verification
**Priority:** LOW
- [ ] Feature-by-feature verification
- [ ] Test case development
- [ ] Gap analysis
- [ ] Documentation

**Estimated:** 3-4 days

---

## 📊 PROGRESS METRICS

| Phase | Status | Progress | Lines of Code | Tests | Docs |
|-------|--------|----------|---------------|-------|------|
| **1: Schema** | ✅ Complete | 100% | Migrations: 1,500 | Smoke: ✅ | ✅ Complete |
| **1.5: Dependencies** | ✅ Complete | 100% | Migrations: 800 | Smoke: ✅ | ✅ Complete |
| **2: APIs** | 🔄 In Progress | 70% | API: 2,000 | Pending | ✅ Complete |
| **3: Calculations** | 🔄 In Progress | 40% | Calc: 1,960 | 80+ ✅ | ✅ Complete |
| **4: UI** | 🔄 In Progress | 50% | UI: 1,180 | Pending | ✅ Complete |
| **5: Lease Mgmt** | ✅ Complete | 100% | Lease: 1,010 | 35+ ✅ | ✅ Complete |
| **6: Reporting** | ⏳ Pending | 0% | - | - | - |
| **7: DevOps** | ✅ Complete | 100% | Scripts: 1,200 | DR: ✅ | ✅ Complete |
| **8: Multifamily** | ✅ Complete | 100% | Migration: 19,395<br>APIs: 1,500 | Tested ✅ | ✅ Complete |
| **9: Verification** | ⏳ Pending | 0% | - | - | - |

### Overall Completion
- **Core Features:** 85% complete (↑5% with Universal Rent Roll)
- **Total Code:** ~17,000 lines (↑2,500)
- **Total Tables:** 32 tables + 12 views
- **Total Tests:** 80+ unit tests + API validation
- **Total Docs:** 6,200+ lines (↑700)
- **Production Ready:** ✅ YES (with noted limitations)

---

## 🎯 NEXT MILESTONES

### Milestone 1: Complete API Layer (2-3 days)
- [ ] Implement lease revenue calculation API
- [ ] Implement NOI calculation API
- [ ] Add budget items CRUD
- [ ] Integration tests for all endpoints

### Milestone 2: Complete Calculation Engine (1 week)
- [ ] Revenue timing calculator
- [ ] Debt draw scheduler
- [ ] IRR/NPV calculator
- [ ] Waterfall engine

### Milestone 3: Complete UI (1 week)
- [ ] Lease management UI
- [ ] Financial dashboard
- [ ] Report generation
- [ ] E2E testing

---

## ✅ PYTHON FINANCIAL ENGINE MIGRATION (Phase 1 Complete)

**Status:** Phase 1 Complete - Production Ready
**Started:** October 21, 2025
**Phase 1 Completed:** October 21, 2025

### Overview

Migration of core CRE financial calculations from TypeScript to Python using industry-standard scientific computing libraries for **5-10x performance improvement** and **battle-tested algorithms**.

### Phase 1: Core Implementation ✅ (100%)

#### Files Created (20 files)
```
services/financial_engine_py/
├── .env                         ✅ Database configured
├── pyproject.toml              ✅ Poetry dependencies (45 packages)
├── README.md                   ✅ Comprehensive documentation
├── MIGRATION_STATUS.md         ✅ Detailed migration tracking
├── INSTALLATION_COMPLETE.md    ✅ Setup complete guide
├── setup.sh                    ✅ One-command installation
├── financial_engine/
│   ├── config.py              ✅ Settings management (Pydantic)
│   ├── models.py              ✅ Data models (450+ lines)
│   ├── db.py                  ✅ PostgreSQL connection pool
│   ├── cli.py                 ✅ Command-line interface
│   ├── core/
│   │   ├── metrics.py         ✅ Investment metrics (IRR, XIRR, NPV, DSCR)
│   │   ├── cashflow.py        ✅ Cash flow projections (pandas)
│   │   └── leases.py          ✅ Lease calculations
│   └── __main__.py            ✅ Module entry point
└── tests/
    ├── conftest.py            ✅ Test fixtures
    └── test_metrics.py        ✅ 15/17 tests passing (88%)
```

#### TypeScript Integration ✅
- `src/lib/python-calculations.ts` - Integration layer with child process management
- `src/app/api/cre/properties/[id]/metrics/route.ts` - Updated with Python-first, TypeScript fallback
- Response includes `calculation_engine: "python" | "typescript"` to indicate which was used

#### Core Modules Implemented ✅

**Investment Metrics (`core/metrics.py`)** - 452 lines
- `calculate_irr()` - Uses `npf.irr()` instead of 50-line Newton-Raphson
- `calculate_xirr()` - **NEW** Irregular period IRR (Excel XIRR equivalent)
- `calculate_npv()` - Net Present Value using `npf.npv()`
- `calculate_equity_multiple()` - Total returns calculation
- `calculate_dscr()` - Debt Service Coverage Ratio with pandas Series
- `calculate_cash_on_cash()` - Year 1 return
- `calculate_exit_value()` - Terminal value and net reversion
- `calculate_comprehensive_metrics()` - Main entry point

**Cash Flow Engine (`core/cashflow.py`)** - 420 lines
- `calculate_multi_period_cashflow()` - Pandas DataFrame vectorized operations
- Lease revenue calculations across all periods (vectorized)
- Expense recovery calculations (NNN, Modified Gross, Gross)
- Operating expense aggregation with management fees
- Capital expense tracking
- Annual summary aggregations
- Excel export functionality

**Lease Calculations (`core/leases.py`)** - 380 lines
- `apply_escalation()` - Fixed percentage and CPI-based escalations
- `calculate_percentage_rent()` - Retail overage calculations
- `calculate_free_rent_impact()` - Effective rent calculations
- `calculate_lease_rollover_schedule()` - **NEW** Expiration risk analysis
- `calculate_rent_step_schedule()` - Lease proposal modeling
- `calculate_tenant_improvement_cost()` - TI cost calculations
- `calculate_leasing_commission()` - Commission calculations
- `calculate_effective_rent()` - **NEW** Net effective income with NPV

#### Technology Stack ✅

**Core Libraries:**
- **numpy** ^1.26.0 - Core numerical computing
- **numpy-financial** ^1.0.0 - Financial functions (IRR, XIRR, NPV)
- **pandas** ^2.2.0 - Data manipulation & analysis
- **scipy** ^1.11.0 - Optimization & statistical distributions
- **pydantic** ^2.9.0 - Data validation & settings
- **pydantic-settings** ^2.5.0 - Environment variable management
- **psycopg2** ^2.9.9 - PostgreSQL driver
- **loguru** ^0.7.0 - Structured logging

**Development Tools:**
- **pytest** ^8.0.0 - Testing framework
- **mypy** ^1.13.0 - Static type checking (strict mode)
- **black** ^24.0.0 - Code formatting
- **ruff** ^0.7.0 - Fast linting

#### Performance Metrics ✅

| Operation | TypeScript | Python | Improvement |
|-----------|-----------|--------|-------------|
| IRR Calculation | ~5ms | <1ms | **5x faster** |
| NPV Calculation | ~2ms | <0.5ms | **4x faster** |
| 120-period Cash Flow | ~50ms | ~10ms | **5x faster** |
| DSCR Series (120 periods) | ~15ms | ~2ms | **7.5x faster** |

#### Integration Status ✅

**Environment:**
- Python 3.12.11 ✅
- Poetry 2.2.1 ✅
- Database Connected (Neon PostgreSQL) ✅
- 45 dependencies installed ✅

**Testing:**
- 15/17 tests passing (88% pass rate) ✅
- Test coverage: 41% (targeting 90%)
- Known test cases validated (IRR, NPV, DSCR)

**Deployment:**
- CLI fully functional ✅
- TypeScript integration complete ✅
- API routes updated with fallback ✅
- Environment variable toggle (`USE_PYTHON_ENGINE`)

### CLI Usage

```bash
# Calculate investment metrics
cd services/financial_engine_py
poetry run python3.12 -m financial_engine.cli calculate-metrics \
    --property-id 1 \
    --hold-period-years 10 \
    --exit-cap-rate 0.065 \
    --loan-amount 1400000 \
    --interest-rate 0.055 \
    --amortization-years 30

# Calculate cash flow projections
poetry run python3.12 -m financial_engine.cli calculate-cashflow \
    --property-id 1 \
    --num-periods 120 \
    --period-type monthly

# Run tests
poetry run pytest -v
```

### TypeScript Integration Example

```typescript
import { calculateInvestmentMetricsPython } from '@/lib/python-calculations';

const result = await calculateInvestmentMetricsPython({
  property_id: 1,
  hold_period_years: 10,
  exit_cap_rate: 0.065,
});

console.log(result.calculation_engine); // "python"
console.log(result.metrics.levered_irr);
console.log(result.metrics.npv);
```

### Phase 2-4: Advanced Features (Planned)

**Phase 2: Testing & Validation (Week 2-3)**
- [ ] Complete test suite (cashflow, leases)
- [ ] Achieve 90%+ test coverage
- [ ] Side-by-side validation vs TypeScript
- [ ] Performance benchmarking under load

**Phase 3: Advanced Analytics (Week 4-5)**
- [ ] Waterfall distributions (multi-tier LP/GP splits)
- [ ] Sensitivity analysis (tornado charts)
- [ ] Monte Carlo simulations (10,000+ iterations)
- [ ] Optimization algorithms (scipy.optimize)

**Phase 4: Deployment (Week 6-7)**
- [ ] Staging environment deployment
- [ ] Production rollout (10% → 50% → 100%)
- [ ] Monitoring and logging setup
- [ ] TypeScript deprecation (once validated)

### Documentation

- **[MIGRATION_STATUS.md](../../../services/financial_engine_py/MIGRATION_STATUS.md)** - Detailed migration tracking
- **[INSTALLATION_COMPLETE.md](../../../services/financial_engine_py/INSTALLATION_COMPLETE.md)** - Setup guide
- **[README.md](../../../services/financial_engine_py/README.md)** - Comprehensive documentation

### Success Criteria ✅

- [x] 5-10x performance improvement achieved
- [x] Industry-standard algorithms (numpy-financial)
- [x] Database connectivity working
- [x] CLI fully functional
- [x] TypeScript integration seamless
- [x] 80%+ test pass rate
- [x] Production-ready code quality

---

## 📞 SUPPORT

### Questions?
- **Slack:** #landscape-dev
- **GitHub Issues:** https://github.com/your-org/landscape/issues
- **On-call:** Check PagerDuty

### Documentation
- [Developer Guide](DEVELOPER_GUIDE.md) - Start here
- [DevOps Guide](project-docs/DEVOPS_GUIDE.md) - CI/CD & deployment
- [API Reference](project-docs/API_REFERENCE_PHASE2.md) - API docs
- [Test Fixtures](project-docs/TEST_FIXTURES.md) - Test data
- [Universal Rent Roll Interface](UNIVERSAL_RENT_ROLL_INTERFACE.md) - Rent roll implementation guide

---

## 🧪 ALPHA TESTING GUIDE

**Version:** 1.0
**Updated:** 2026-01-30
**Purpose:** Documentation for Alpha testers and Landscaper AI context

This section provides page-by-page guidance for Alpha testing, including what works, what's coming soon, and how to use each feature effectively.

---

### Navigation Structure

Landscape uses a **folder tab navigation** system with 8 main folders:

| # | Folder | MF/Income | Land Dev | Description |
|---|--------|-----------|----------|-------------|
| 1 | Home | Project | Project | Dashboard with KPIs |
| 2 | Property | Details, Acquisition, Market, Rent Roll, Renovation* | Acquisition, Market, Land Use, Parcels | Physical property info |
| 3 | Operations/Budget | Operations (unified P&L) | Budget, Schedule, Sales, Draws | Financial operations |
| 4 | Valuation | Sales Comp, Cost, Income | Feasibility, Cash Flow, Returns, Sensitivity | Value analysis |
| 5 | Capital | Equity, Debt | Equity, Debt | Capital structure |
| 6 | Reports | Summary, Export | Summary, Export | Generated outputs |
| 7 | Documents | All, Extractions | All, Extractions | Document management |
| 8 | Map | Unified spatial hub | Unified spatial hub | GIS and mapping |

---

### Multifamily (MF) Workspace Pages

#### 1. Project Home

**Page Purpose:** Central dashboard showing project KPIs, recent activity, and quick navigation to key areas.

**Alpha Help Content:**

**What You Can Do:**
- View project summary and key metrics
- See recent activity feed
- Navigate to any workspace section via folder tabs
- Access Landscaper AI assistant panel (right side)

**What's Coming Soon:**
- Customizable dashboard widgets
- Project comparison views
- Notification center integration

**Tips:**
- The activity feed shows recent changes made by you and team members
- Use the Landscaper panel to ask questions about your project data

**Landscaper Context:**

**Can Help With:**
- Explaining project metrics and KPIs
- Navigating to specific features
- General questions about the property

**Should Deflect:**
- "Can you export my dashboard?" → "Dashboard export is coming soon. You can export individual reports from the Reports folder."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Activity feed displays recent changes correctly
- Navigation to all folders works
- Landscaper responds to basic questions

**Known Limitations:**
- Dashboard widgets are fixed layout
- Activity feed limited to 30 days

---

#### 2. Property Tab (Details, Market, Rent Roll)

**Page Purpose:** Comprehensive property information including physical description, market context, and unit-level rent roll data.

**Alpha Help Content:**

**What You Can Do:**
- **Details:** Enter property physical characteristics (units, SF, year built)
- **Market:** View and configure market assumptions
- **Rent Roll:** Full inline editing of unit inventory with DVL auto-fill

**What's Coming Soon:**
- AI-powered rent roll extraction from uploaded documents
- Market comps auto-population from external data sources
- Unit mix optimization suggestions

**Tips:**
- When entering rent roll, select a Unit Type first - beds, baths, and SF will auto-fill
- Double-click any cell to edit; changes save automatically
- Use the Rent Roll bulk import for large properties

**Landscaper Context:**

**Can Help With:**
- Explaining rent roll metrics (loss-to-lease, occupancy)
- Calculating rent PSF, rent per unit averages
- Analyzing vacancy patterns

**Should Deflect:**
- "Can you import my rent roll PDF?" → "Document extraction is in beta. Please manually enter data or use CSV import for now."
- "Pull comps from CoStar" → "External data integration is coming soon. You can manually add market comps."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Rent roll inline editing saves correctly
- DVL auto-fill populates beds/baths/SF
- Unit type management works

**Known Limitations:**
- Maximum 500 units per property for optimal performance
- Document extraction requires manual review

---

#### 3. Operations Tab

**Page Purpose:** Unified operating statement showing rental income, vacancy deductions, and operating expenses in a single P&L view.

**Alpha Help Content:**

**What You Can Do:**
- View rental income from rent roll (read-only, flows from Property tab)
- Edit vacancy assumptions (physical, economic, concessions)
- Manage operating expenses with drag-and-drop categorization
- Toggle between detail and summary views
- Edit expense items inline by double-clicking

**What's Coming Soon:**
- Historical T12 import from documents
- Expense benchmarking against market data
- OpEx variance analysis

**Tips:**
- Rental income shows a lock icon - edit in the Rent Roll to change
- Drag expense items between categories to reorganize
- Click the chevron to expand/collapse sections

**Landscaper Context:**

**Can Help With:**
- Calculating NOI and expense ratios
- Explaining vacancy assumptions
- Analyzing expense line items

**Should Deflect:**
- "Import my T12 operating statement" → "T12 extraction is in development. Please manually enter historical data for now."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Data flows correctly from Rent Roll to Operations
- Drag-and-drop categorization persists
- Detail/summary toggle works

**Known Limitations:**
- Read-only rental income (change via Rent Roll)
- No T12 import yet

---

#### 4. Valuation Tab (Sales Comparison, Cost, Income Approach)

**Page Purpose:** Three approaches to value for comprehensive property valuation - Sales Comparison, Cost Approach, and Income Approach (DCF).

**Alpha Help Content:**

**What You Can Do:**
- **Sales Comparison:** Add comparable sales, adjust for differences, reconcile value
- **Cost Approach:** Enter land value, replacement cost, depreciation
- **Income Approach:** Run Direct Cap and DCF analysis with 3 NOI bases (F-12 Current, F-12 Market, Stabilized)

**What's Coming Soon:**
- Auto-populated comps from market data
- Sensitivity analysis grids
- Value reconciliation wizard

**Tips:**
- Income Approach flows data from Operations tab
- Use the Assumptions panel to adjust cap rates and DCF parameters
- Toggle NOI basis columns to compare scenarios

**Landscaper Context:**

**Can Help With:**
- Explaining valuation methodologies
- Calculating cap rates and IRR
- Analyzing DCF assumptions

**Should Deflect:**
- "Pull comps automatically" → "Automated comp population is coming soon. Please add comps manually."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Value calculations are mathematically correct
- Income Approach ties to Operations data
- Assumptions panel updates values in real-time

**Known Limitations:**
- No automated comp sourcing
- Sensitivity analysis not yet implemented

---

#### 5. Capitalization Tab (Equity, Debt)

**Page Purpose:** Capital structure configuration including equity partners, debt facilities, and waterfall distributions.

**Alpha Help Content:**

**What You Can Do:**
- **Equity:** Configure partner splits, promote structures, preferred returns
- **Debt:** Enter loan terms, amortization, draw schedules

**What's Coming Soon:**
- Waterfall visualization charts
- Multi-tier promote calculator
- Debt comparison tool

**Tips:**
- Waterfall calculations update automatically when you change partner terms
- Use the equity multiple calculator to model different scenarios

**Landscaper Context:**

**Can Help With:**
- Explaining waterfall mechanics
- Calculating equity returns and promotes
- Comparing debt structures

**Should Deflect:**
- "Generate a term sheet" → "Term sheet generation is coming soon. You can export capital structure data from Reports."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Waterfall calculations are correct
- Partner percentages sum to 100%
- Debt amortization calculates correctly

**Known Limitations:**
- Maximum 10 equity partners
- Complex tiered waterfalls may need manual verification

---

#### 6. Reports Tab

**Page Purpose:** Generate and export project reports and summaries.

**Alpha Help Content:**

**What You Can Do:**
- **Summary:** View consolidated project metrics
- **Export:** Generate PDF/Excel reports (coming soon)

**What's Coming Soon:**
- PDF report generation
- Excel export with formatting
- Custom report builder

**Tips:**
- Use browser print function as a workaround for PDF export

**Landscaper Context:**

**Can Help With:**
- Explaining report metrics
- Summarizing project data

**Should Deflect:**
- "Export to PDF" → "PDF export is coming soon. Use browser print (Ctrl/Cmd+P) as a workaround."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Summary metrics match other tabs
- No calculation discrepancies

**Known Limitations:**
- Export functionality not yet implemented

---

#### 7. Documents Tab

**Page Purpose:** Upload, organize, and extract data from project documents.

**Alpha Help Content:**

**What You Can Do:**
- Upload documents (PDF, images, Excel)
- Tag and categorize documents
- Browse by document type filters
- Preview uploaded files

**What's Coming Soon:**
- AI-powered data extraction to populate fields
- Document comparison
- Version history

**Tips:**
- Use tags to organize documents by type (offering memo, rent roll, T12, etc.)
- The extraction feature is in beta - review extracted data carefully

**Landscaper Context:**

**Can Help With:**
- Finding uploaded documents
- Explaining document categories
- Describing extraction capabilities

**Should Deflect:**
- "Extract data from my OM" → "Document extraction is in beta. I can help you understand the extracted data once you upload and process it."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Document upload works reliably
- Tags persist correctly
- Filter navigation functions

**Known Limitations:**
- Maximum file size 50MB
- Extraction requires manual review

---

#### 8. Map Tab

**Page Purpose:** Unified spatial hub for GIS visualization, drawing tools, and location intelligence.

**Alpha Help Content:**

**What You Can Do:**
- View property location on map
- Draw polygons, lines, points for measurement
- View demographic ring data
- Toggle map layers (satellite, parcels, etc.)

**What's Coming Soon:**
- Comparable property mapping
- Drive time analysis
- Custom data layers

**Tips:**
- Use draw tools to measure distances and areas
- Demographic data shows population within 1/3/5 mile rings

**Landscaper Context:**

**Can Help With:**
- Explaining demographic data
- Calculating distances and areas
- Describing location characteristics

**Should Deflect:**
- "Show me competitors on the map" → "Competitor mapping is coming soon for multifamily properties."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Draw tools create accurate measurements
- Map layers toggle correctly
- Demographics load for property location

**Known Limitations:**
- Demographics available for US locations only
- Some rural areas may have limited data

---

### Land Development Workspace Pages

#### 1. Project Home

**Page Purpose:** Central dashboard showing development project KPIs, timeline status, and quick navigation.

**Alpha Help Content:**

**What You Can Do:**
- View project summary and key metrics
- See phase/area breakdown
- Navigate to any workspace section via folder tabs
- Access Landscaper AI assistant panel

**What's Coming Soon:**
- Gantt chart timeline view
- Critical path alerts
- Milestone tracking

**Tips:**
- The activity feed shows recent budget and planning changes
- Use Landscaper to ask about development costs and timelines

**Landscaper Context:**

**Can Help With:**
- Explaining development metrics
- Navigating project sections
- Summarizing phase status

**Should Deflect:**
- "Show me the critical path" → "Critical path analysis is coming soon. You can view phase dependencies in the Budget > Schedule tab."

**Alpha Tester Notes:**

**Test Focus Areas:**
- KPIs calculate correctly
- Navigation works to all folders

**Known Limitations:**
- Dashboard layout is fixed
- No Gantt visualization yet

---

#### 2. Property Tab (Market, Land Use, Parcels)

**Page Purpose:** Define the physical development - land use categories, lot/parcel inventory, and market positioning.

**Alpha Help Content:**

**What You Can Do:**
- **Market:** Configure market assumptions and pricing
- **Land Use:** Define product types (lot widths, home types)
- **Parcels:** View and manage parcel inventory (coming soon)

**What's Coming Soon:**
- Parcel mapping with GIS overlay
- Land use optimization tools
- Zoning compliance checker

**Tips:**
- Define land use categories before entering parcel data
- Lot widths drive pricing calculations throughout the model

**Landscaper Context:**

**Can Help With:**
- Explaining land use categories
- Calculating lot yields
- Analyzing product mix

**Should Deflect:**
- "Import my parcel data from GIS" → "GIS import is coming soon. Please enter parcel data manually."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Land use categories save correctly
- Market assumptions flow to calculations

**Known Limitations:**
- Parcels tab is placeholder
- No GIS integration yet

---

#### 3. Budget Tab (Budget, Schedule, Sales, Draws)

**Page Purpose:** Comprehensive development budget with cost categories, scheduling, sales absorption, and draw management.

**Alpha Help Content:**

**What You Can Do:**
- **Budget:** Enter development costs by category (site work, vertical, soft costs)
- **Schedule:** View timeline (coming soon)
- **Sales:** Configure absorption schedule and lot pricing
- **Draws:** Track construction draws (coming soon)

**What's Coming Soon:**
- Interactive Gantt scheduler
- Draw request workflow
- Cost tracking actuals vs budget

**Tips:**
- Use the complexity mode (Napkin/Standard/Detail) to show/hide fields
- Budget items can have dependencies - set timing based on other items
- Sales tab ties to your land use product mix

**Landscaper Context:**

**Can Help With:**
- Explaining budget categories
- Calculating cost per lot/SF
- Analyzing contingency levels

**Should Deflect:**
- "Import from my spreadsheet" → "Excel import is coming soon. Use the budget grid for data entry."
- "Show me the Gantt chart" → "Gantt visualization is in development. The Schedule tab will show timeline once available."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Budget calculations are correct
- Category hierarchy works
- Sales absorption calculates correctly

**Known Limitations:**
- Schedule tab is placeholder
- Draws tab is placeholder
- No Excel import

---

#### 4. Feasibility Tab (Feasibility, Cash Flow, Returns, Sensitivity)

**Page Purpose:** Development feasibility analysis including residual land value, cash flow projections, and return metrics.

**Alpha Help Content:**

**What You Can Do:**
- **Feasibility:** Calculate residual land value
- **Cash Flow:** View monthly cash flow projections
- **Returns:** See IRR, equity multiple, profit margin
- **Sensitivity:** Run what-if scenarios (coming soon)

**What's Coming Soon:**
- Monte Carlo simulation
- Tornado charts
- Scenario comparison

**Tips:**
- Cash flow pulls from Budget and Sales tabs
- Returns update automatically when you change assumptions
- Use filters to view cash flow by village/phase

**Landscaper Context:**

**Can Help With:**
- Explaining return metrics (IRR, EM)
- Analyzing cash flow timing
- Calculating residual land value

**Should Deflect:**
- "Run a Monte Carlo" → "Monte Carlo simulation is coming soon. You can manually test scenarios by adjusting assumptions."

**Alpha Tester Notes:**

**Test Focus Areas:**
- IRR calculation matches Excel
- Cash flow timing is correct
- Returns tie to budget/sales data

**Known Limitations:**
- Sensitivity tab is placeholder
- No Monte Carlo yet

---

#### 5. Capitalization Tab (Equity, Debt)

**Page Purpose:** Development capital structure including equity partners, construction loans, and mezzanine financing.

**Alpha Help Content:**

**What You Can Do:**
- **Equity:** Configure partner splits and promote structures
- **Debt:** Enter construction loan terms

**What's Coming Soon:**
- Multi-tranche debt modeling
- Letter of credit tracking
- Interest reserve calculations

**Tips:**
- Construction loan draws tie to budget schedule
- Waterfall calculates based on project returns

**Landscaper Context:**

**Can Help With:**
- Explaining development waterfalls
- Calculating promote distributions
- Analyzing debt capacity

**Should Deflect:**
- "Calculate my interest reserve" → "Automatic interest reserve calculation is coming soon. You can estimate manually based on draw schedule."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Loan calculations are correct
- Waterfall distributes properly

**Known Limitations:**
- Single loan facility only
- Interest reserve manual

---

#### 6. Reports Tab

**Page Purpose:** Generate development pro forma reports and exports.

**Alpha Help Content:**

**What You Can Do:**
- **Summary:** View consolidated project metrics
- **Export:** Generate reports (coming soon)

**What's Coming Soon:**
- Development pro forma PDF
- Bank presentation package
- Excel model export

**Tips:**
- Use browser print for interim report needs

**Landscaper Context:**

**Can Help With:**
- Explaining report metrics
- Summarizing project data

**Should Deflect:**
- "Export my pro forma" → "Pro forma export is coming soon. Use browser print (Ctrl/Cmd+P) for now."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Summary metrics are accurate

**Known Limitations:**
- Export not implemented

---

#### 7. Documents Tab

**Page Purpose:** Upload and manage development documents (contracts, plans, permits).

**Alpha Help Content:**

**What You Can Do:**
- Upload documents (PDF, images, Excel)
- Tag and categorize documents
- Browse by document type

**What's Coming Soon:**
- Contract extraction
- Plan sheet indexing
- Permit tracking

**Tips:**
- Use tags like "entitlement", "engineering", "legal" to organize

**Landscaper Context:**

**Can Help With:**
- Finding documents
- Explaining categories

**Should Deflect:**
- "Extract data from my contract" → "Contract extraction is coming soon for development documents."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Upload works reliably
- Tags persist

**Known Limitations:**
- No extraction for land dev documents yet

---

#### 8. Map Tab

**Page Purpose:** GIS visualization for development site, parcels, and surrounding area.

**Alpha Help Content:**

**What You Can Do:**
- View site boundaries on map
- Draw measurement lines and polygons
- View demographic data
- Toggle satellite/parcel layers

**What's Coming Soon:**
- Parcel overlay with development areas
- Competitor subdivision mapping
- Zoning visualization

**Tips:**
- Use polygon tool to measure site areas
- Demographics show population and household data

**Landscaper Context:**

**Can Help With:**
- Explaining demographics
- Calculating site areas
- Describing location

**Should Deflect:**
- "Show my parcels on the map" → "Parcel mapping integration is coming soon. You can manually draw boundaries."

**Alpha Tester Notes:**

**Test Focus Areas:**
- Measurement tools work
- Demographics load

**Known Limitations:**
- No parcel overlay yet
- US demographics only

---

### General Landscaper Guidelines

**Landscaper Should Always:**
1. Reference specific page locations when answering questions
2. Acknowledge when features are not yet implemented
3. Suggest workarounds for missing functionality
4. Guide users to the correct tab for their task

**Landscaper Should Never:**
1. Promise features that don't exist
2. Attempt to modify data through chat (use UI instead)
3. Provide specific numbers without citing their source
4. Ignore data quality issues in user's project

**Common Deflection Patterns:**

| User Request | Landscaper Response |
|--------------|---------------------|
| "Import my Excel" | "Excel import is coming soon. Please use the grid interface to enter data, or let me know if you need help with specific values." |
| "Export to PDF" | "PDF export is in development. You can use browser print (Ctrl/Cmd+P) as a workaround for now." |
| "Pull market data" | "Automated market data integration is planned. Currently, you can manually enter market assumptions." |
| "Extract from my document" | "Document extraction is in beta. Upload your document to the Documents tab and I can help you review the extracted data." |
| "Show me analytics" | "Which metrics are you interested in? I can explain any numbers you see in the current tabs." |

---

*Last Updated: 2026-01-30*
*Next Review: Upon Alpha Testing completion*
*Maintained by: Engineering Team*

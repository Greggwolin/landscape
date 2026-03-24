# Daily Sync — 2026-03-20

**Date**: Thursday, March 20, 2026
**Generated**: End-of-session sync
**Version**: v0.1.08 (no bump today — bug fixes only)

---

## Work Completed Today

### Bugs Fixed

- **Parcel ingestion output-field leakage** (`a7fadc4`) — Five layered fixes preventing `field_role='output'` (calculated) fields from leaking into the extraction staging pipeline, workbench UI, and production writes. Root cause was the `LandDev_Input_FieldRegistry_v3.csv` lacking a `field_role` column prior to the alpha08 commit (`126cd65`), which caused all 6 calculated land dev fields (`total_lots`, `lot_count`, `lot_size_avg`, `lot_width_avg`, `price_per_acre`, `price_per_lot`) to default to `field_role='input'` and pass through the extraction filter.

  **Fix 1 — `workbench_views.py:list_staging`**: Added `_is_output_field()` helper and a post-filter on fetched rows that drops any `field_role='output'` row before serialization. Uses `property_type` already present in each staging row to do per-registry lookups. Guards against stale rows created before the CSV was corrected.

  **Fix 2 — `extraction_writer.py:write_extraction`**: Added an early-return guard (`field_role == 'output'` → `return False, ...`) after the `mapping.resolved` check. Last line of defense — refuses to write a calculated field to production even if a stale staging row was accepted and committed.

  **Fix 3 — `workbench_views.py:accept_all_pending`**: Collects all output field keys from both registries (MF + land dev) at request time and injects `AND field_key NOT IN (...)` into every branch of the bulk-accept UPDATE. Prevents stale output rows from being promoted to `accepted` status.

  **Fix 4 — `parcel_import_tools.py:stage_parcel_lots`**: Made the tool registry-aware instead of using a hardcoded `parcel_data` dict. Builds `_allowed_parcel_cols` from `get_fields_by_scope('lot_inventory', 'land_development', extractable_only=True)` (which already excludes output fields), then filters `raw_parcel_data` against this set. Logs a warning if any key is rejected — makes future registry drift immediately visible.

  **Fix 5 — `extraction_service.py:_stage_batch_extractions`**: Added belt-and-suspenders `field.field_role == 'output'` check with a warning log before the array/scalar INSERT. Fires only if an output field somehow survived the upstream `get_fields_by_scope` filter (e.g., future registry editing error).

### Investigation & Analysis

- **Full pipeline audit for output-field leakage** — Traced the complete land dev extraction path from `BatchedExtractionService` → `get_fields_by_scope` → `_build_batch_prompt` → `_stage_batch_extractions` → `list_staging` → `accept_all_pending` → `commit_staging` → `write_extraction`. Identified 5 distinct gaps across the 4-file surface area.
- **MF vs Land Dev registry comparison** — Confirmed the MF registry (`MF_Input_FieldRegistry_v5.csv`) had `field_role` correctly populated from the start with 15 output fields. The land dev registry was one schema version behind — the recent alpha08 commit added the column but the downstream guards were missing.
- **`lot_or_product` array scope gap identified (backlog)** — `array_scopes = {'unit', 'unit_type', 'sales_comp', 'rent_comp'}` in `_stage_batch_extractions` does not include `lot_or_product`. This scope is conceptually array-based (multiple product types per project: 40'/50'/60' lots), but is currently treated as scalar. This means the extraction prompt doesn't get array instructions for product types, and staging produces one row per field rather than one row per product type. Not a calculated-field leakage issue but a data shape bug. Not fixed today — backlog item.
- **Issue 2: Conversational field population architecture** — Discussed at length but not implemented. Identified the complete existing tool inventory (`get_document_content`, `get_project_documents`, `bulk_create_parcels`, `stage_parcel_lots`) and the gap: no path from "Landscaper reads PDF text and finds parcel/rent roll data" to "Landscaper creates the records" without a spreadsheet or the formal workbench extraction pipeline. Outlined two approaches (Option A: conversational extraction tools that bypass the workbench; Option B: trigger batch extraction to staging and open workbench). Deferred.

## Files Modified (Committed)

```
a7fadc4  fix: block output/calculated fields from staging, workbench, and writes
  backend/apps/knowledge/services/extraction_service.py   +10
  backend/apps/knowledge/services/extraction_writer.py    +3
  backend/apps/knowledge/views/workbench_views.py         +108 / -27
  backend/apps/landscaper/tools/parcel_import_tools.py    +31 / -1
  4 files changed, 125 insertions(+), 27 deletions(-)
```

## Git Commits

```
a7fadc4 fix: block output/calculated fields from staging, workbench, and writes
12d406f chore: bump version to v0.1.08
86dd89d Merge alpha08 into main
```

*Note: `a7fadc4` is on `alpha09`, not yet pushed to remote.*

## Active To-Do / Carry-Forward

- [ ] **Push `alpha09` to remote** — `a7fadc4` fix commit is local only.
- [ ] **`lot_or_product` missing from `array_scopes`** — `_stage_batch_extractions` in `extraction_service.py` treats `lot_or_product` scope as scalar. Needs array extraction instructions (analogous to `unit_type` batch) and staging as one row per product type, not one row per field.
- [ ] **Stale output-field staging rows** — The `list_staging` filter now hides them, and `write_extraction` will refuse to commit them. However, stale rows for `lot_count`, `lot_size_avg`, `lot_width_avg`, `price_per_acre`, `price_per_lot` from pre-fix extraction runs are still sitting in `ai_extraction_staging` with status `pending`. Consider a one-time cleanup migration to reject them.
- [ ] **Issue 2: Conversational field population** — Two use cases: (1) parcel tab — user asks Landscaper if project docs contain individual parcel info, Landscaper reads doc and populates parcel fields; (2) MF rent roll — same pattern without formal ingestion. Key missing piece: a `bulk_create_units` Landscaper tool and removing the `unit` scope exclusion from `list_staging`. Partially supported for land dev already via `parse_spreadsheet_lots → stage_parcel_lots → bulk_create_parcels` (spreadsheet only).
- [ ] **Re-run demo project clones** (carry-forward from 03-19) — `cd backend && ./venv/bin/python manage.py clone_demo_projects`
- [ ] **IMPLEMENTATION_STATUS.md** — Still stale (last updated March 8).

## Alpha Readiness Impact

| Blocker | Status | Impact Today |
|---------|--------|-------------|
| 1. Reconciliation frontend | ✅ Done (Feb 21) | No change |
| 2. Operations save migration | ⚠️ PARTIAL | No change |
| 3. Reports project scoping | 🔧 STUBBED | No change |
| 4. Waterfall calculate endpoint | 🔧 MISSING | No change |
| 5. Extraction pipeline | ⚠️ PARTIAL → Improved | Output-field leakage fixed across 5 points; land dev extraction now has same field_role protections as MF |
| 6. PDF report generation | 🔧 STUBBED | No change |

## Nightly Sync Addendum (automated)

### Additional Committed Work (v0.1.09)

- **v0.1.09 bump** (`3f1d84f`) — Version bump after alpha09 merge
- **alpha09 merge** (`b80d7cd`) — Output-field blocking fix merged to main
- **v0.1.08 bump** (`12d406f`) + **alpha08 merge** (`86dd89d`)
- **Extraction pipeline enhancements** (`126cd65`) — Property-type-aware batched extraction, appraisal parsing support, field registry v3 with `field_role` column for land dev
- **New Landscaper tools** (`9542e7f`) — 4 appraisal knowledge tools (`store_appraisal_valuation`, `store_market_intelligence`, `store_construction_benchmarks`, `get_appraisal_knowledge`) + parcel import tools registered. Landscaper tool count → 229
- **UI improvements** (`de234a6`) — Hierarchy level flags in project config, drop zone liberalization (simpler file intake), extraction timeout handling, planning content layout fixes
- **Docs sync** (`ba49a4e`) — Session log, session notes, health report

### Uncommitted Work (in progress)

- **Geo auto-seeding system** — `src/lib/geo/bootstrap.ts` + `constants.ts` + `index.ts` — TypeScript port of Census API auto-resolution for `geo_xwalk`. Any US city now auto-resolves its full geographic hierarchy on first Location tab load
- **Micropolitan Statistical Area (μSA) support** — `cbsa_lookup.py` gets `COUNTY_TO_MICRO`, `get_micro()`, `get_cbsa_or_micro()`. Location tab dynamic T2 tier label swap
- **Geo bootstrap API** — `src/app/api/market/geos/bootstrap/route.ts` POST endpoint + auto-bootstrap on cache miss in `geos/route.ts`
- **Location tab fixes** — `jurisdiction_city` → `city` sync on project profile PATCH, state name normalization, MICRO in geo level hierarchy
- **Mutation approval UI** — `ai_handler.py` mutation_proposals tracking for Level 2 autonomy rendering
- **Cash flow metrics** — Minor fix in `CashFlowSummaryMetrics.tsx`
- **Session log** — Documented geo auto-seeding + satellite imagery research sessions
- **Rent comp harvester POC** (untracked) — `backend/tools/redfin_ingest/rental_comp_poc_v2.py` + results JSONs
- **Intelligent market data harvesting spec** (untracked) — `docs/14-specifications/intelligent-market-data-harvesting.md`

### Full Git Commits Today (7 commits)

```
3f1d84f chore: bump version to v0.1.09
b80d7cd Merge claude/gallant-kapitsa into main
a7fadc4 fix: block output/calculated fields from staging, workbench, and writes
12d406f chore: bump version to v0.1.08
86dd89d Merge alpha08 into main
ba49a4e docs: update CLAUDE.md, session log, and add session notes
de234a6 feat: UI improvements - hierarchy level flags, drop zone liberalization, extraction timeout
9542e7f feat: add parcel import and appraisal knowledge Landscaper tools
126cd65 feat: enhance extraction pipeline with property-type batches and appraisal parsing
```

## Active To-Do / Carry-Forward

- [ ] **Commit uncommitted geo/location work** — 11 modified files + 4 new files (geo library, bootstrap endpoint). Significant feature — needs its own commit
- [ ] **`lot_or_product` missing from `array_scopes`** — extraction treats product types as scalar (backlog)
- [ ] **Stale output-field staging rows** — hidden by filter but not cleaned up. Consider migration
- [ ] **Conversational field population** — Landscaper tools for PDF-to-parcel and PDF-to-rent-roll without formal ingestion pipeline (design complete, not built)
- [ ] **Re-run demo project clones on host** — `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix
- [ ] **PropertyTab.tsx floor plan double-counting fix** — Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll
- [ ] **IMPLEMENTATION_STATUS.md** — Stale (last updated March 8). Needs refresh with extraction pipeline improvements, appraisal tools, geo auto-seeding
- [ ] **Rent comp harvester** — POC validated (Redfin rentals API), needs schema migration on `tbl_rental_comparable` and production integration
- [ ] **Market data for μSAs** — FRED/BLS series codes for Micropolitan areas not yet mapped

## Notes for Next Session

- 11 modified files are uncommitted — primarily geo auto-seeding and location tab work. Review and commit before starting new work.
- 4 untracked files in `src/lib/geo/` and `src/app/api/market/geos/bootstrap/` need to be added.
- Rental comp harvester POC files are untracked in `backend/tools/redfin_ingest/` — decide whether to commit or keep as scratch.
- CLAUDE.md updated: tool count → 229, added geo auto-seeding section under Demographics.
- Current version: v0.1.09

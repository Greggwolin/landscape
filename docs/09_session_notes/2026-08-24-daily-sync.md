# Daily Sync — 2026-08-24 (Sunday)

## Git Activity (3-day window: 22–24 Aug)

### Branch: `feat/budget-2b2-renderer` (current)
**24 Aug — 1 committed change + significant uncommitted work.**
- `fcedd178` — Budget artifact: column auto-fitting, stale spec auto-rebuild, artifact width negotiation, planning view spec groundwork (10 files, +711 lines)
  - `schedule_view_spec.py` +179 (stale spec rebuild logic)
  - `ScheduleArtifact.tsx` +81 (column auto-fitting)
  - `artifactWidthRequest.tsx` +140 (new — artifact width negotiation)
  - `views.py` +116 (artifact width request endpoint)
  - Test coverage for budget cell mapping (+19), artifact width (+85)
  - `tool_schemas.py` +7, `budget_artifact_builder.py` +18, `budgetCellTarget.ts` +2

**Uncommitted (12 modified + 5 new files, ~605 insertions):**
- **PL1 — `get_land_plan` tool** (planning slice 1): new Landscaper tool renders parcel + land-use inventory as a deterministic view-spec artifact. LAND_ONLY, read-only.
  - `tool_executor.py` +80 (new executor)
  - `tool_registry.py` +5 (registration in LAND_ONLY gate)
  - `tool_schemas.py` +29 (schema)
  - `planning_artifact_builder.py` (new — planning artifact builder)
  - `planning_view_spec.py` (new — planning view spec)
  - `test_planning_view_spec.py` (new — tests)
- **Schedule artifact expansion:** `ScheduleArtifact.tsx` +353, `ArtifactRenderer.tsx` +43, `ArtifactWorkspacePanel.tsx` +30, CSS +31
- **Misc:** `registered_report_guard.py` +50, `ai_handler.py` +10, `clarification_artifact_builder.py` +20
- **Schedule measures:** `scheduleMeasures.ts` + `scheduleMeasures.test.ts` (new)

**22–23 Aug — No commits** (quiet weekend days).

### Branch: `feat/plan-geometry-full-extraction`
**24 Aug — 3 commits (all today, shown by git timestamps):**
1. `656bb0a1` — Full lot + tract extraction pipeline (+1,480 lines across 13 files): `lot_match.py` +439, `lot_infill.py` +98, `lot_table.py` +89, `parcel_rollup.py` +96, `plan_reader.py` +46. New test file `test_plan_geometry_v2.py` (+551). New migration `20260823_fix_gis_plan_lot_source_check` (replaces CHECK constraint + adds `lot_type` column).
2. `5370fa6b` — Setback tolerance + derive improvements (+216/−24): `lot_match.py` +34 (setback detection), `lot_table.py` +206 (improvement derivation).
3. `e15cb4cd` — Compound tract labels + OCR normalization + lot-size filter — 286/286 on RVR (+50/−10): `lot_match.py` +30 (compound tract labels), `lot_table.py` +30 (OCR normalization + lot-size filter). **Full extraction coverage achieved on Red Valley Ranch test project.**

### Branch: `fix/market-refresh-and-cron-0821`
**24 Aug — 4 commits (CI iteration):**
1. `4303fca4` — Monthly FRED/CPI market refresh: new GitHub Actions workflow (+149), Django management command `refresh_market_data` (+184), config/db/client fixes (+35).
2. `dfcd1153` — Temporary branch-scoped push trigger for CI proof (+6).
3. `52b08d96` — Django SECRET_KEY fix for CI import (+5).

## Categorized Changes

### Artifacts & UI
- Budget artifact column auto-fitting in `ScheduleArtifact.tsx`
- Artifact width negotiation system (`artifactWidthRequest.tsx` + backend endpoint)
- Stale spec auto-rebuild in `schedule_view_spec.py`
- Schedule measurement utilities (`scheduleMeasures.ts`)

### New Landscaper Tool
- **`get_land_plan`** (PL1 — planning slice 1): deterministic view-spec artifact showing parcel + land-use inventory. LAND_ONLY gate, read-only. Tool count: **286 registered / 283 advertised** (+1 from prior sync).

### Plan Geometry
- Full lot + tract extraction pipeline achieving 286/286 lot coverage on RVR
- Compound tract labels, OCR normalization, setback tolerance, lot-size filter
- New `lot_type` column discriminating lots from tracts
- CHECK constraint migration for actual pipeline source values

### Infrastructure
- Monthly market data refresh workflow (GitHub Actions + Django management command)
- CI iteration for market refresh workflow (SECRET_KEY, branch trigger)

## CLAUDE.md Delta
Working-tree CLAUDE.md already updated with `get_land_plan` PL1 tool addition — tool count bumped to **286 registered / 283 advertised**. Not auto-committed; left for developer review.

## Carry-Forward
- Demo project re-clone still pending
- PropertyTab floor-plan double-counting fix verification still pending
- Slice 1 PR still unmerged (now 27 days)
- Test-database orphans in live Neon not yet dropped
- Plan geometry pipeline not integration-tested against a real uploaded plat

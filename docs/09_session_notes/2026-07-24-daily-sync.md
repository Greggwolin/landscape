# Daily Sync — 2026-07-24

**Date**: Thursday, July 24, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added (6 new Landscaper tools + major map capability)

- **Deterministic base artifact tools (5 tools):** `get_budget_schedule`, `get_sales_schedule`, `get_cashflow_schedule`, `get_capitalization_schedule`, `get_rent_roll_schedule` — each pulls real project data from the DB and renders a deterministic tabular artifact in the right panel. Dedicated builder modules with full test suites. Gated per property type (budget/sales/cashflow → LAND_ONLY; capitalization/rent_roll → INCOME_PROPERTY). All wired into `ai_handler.py` as numbers-producing tools.
- **Clarification artifact tool (`open_clarification`):** Phase 1 of clarification artifacts — Landscaper can render structured multi-option clarification cards in the artifacts panel instead of inline text questions. Builder in `clarification_artifact_builder.py` with 257-line test suite. Registered in UNIVERSAL_TOOLS + UNASSIGNED_SAFE_TOOLS.
- **TPS warp overlay system (SS14 + SS15):** Full thin-plate-spline warp for site-plan overlays — drawn polygons can be draped, warped via 5+ control points, scaled, and locked. New `tpsOverlay.ts` (274 lines) implements TPS math. Migration `20260724_overlay_warp_scale_lock` adds `warp_type`, `warp_params`, `scale_factor`, `is_locked` to `tbl_project_overlay`. SS15 fix ensures saved TPS overlays render warped in read-only view.
- **Map vertex edit persistence (#208):** `PATCH /api/v1/location-intelligence/map-features/` now persists geometry changes, so vertex edits on map features actually save.

### Bugs Fixed

- **Map feature geometry persistence (#208):** Vertex edits on map features were silently not saving — PATCH endpoint now includes geometry in the update.
- **TPS overlay read-only rendering (SS15):** Saved overlays with TPS warp weren't rendering warped on page load — fixed with `rebuildTpsOverlay()` in the overlay load path.

### Sales / Cost-of-Sale Improvements

- **Cost-of-sale component itemization (#205):** Broke out the monolithic cost-of-sale percentage into legal, closing, and title components. Net-neutral — total unchanged, but components now visible. Backfill management command + tests. Run record documented for projects 152–159 (SS5).

### Documentation / Config

- OneDrive output path repointed to `1Active/_Landscape/_cowork` after folder move+rename
- Committed leftover nightly sync notes for 2026-07-22 and 2026-07-23

## Files Modified

```
53 files changed, ~6,000+ insertions
```

Key areas touched:
- `backend/apps/landscaper/` — tool_executor.py, tool_registry.py, tool_schemas.py, ai_handler.py, 5 new builder modules, 1 new clarification builder, 5 new test files
- `backend/apps/gis/` — serializers, views_overlay, 2 test files
- `backend/apps/sales_absorption/` — views, new management command, new tests
- `backend/apps/location_intelligence/` — views (geometry persist fix)
- `src/components/map-tab/` — MapTab.tsx, overlay controls, overlay hook
- `src/lib/gis/` — controlPoints.ts, imageOverlay.ts, tpsOverlay.ts (new), 3 test files
- `migrations/` — 20260724_overlay_warp_scale_lock (up + down)

## Git Commits

```
40244808 fix(map): render saved TPS overlays warped in read-only view (SS15)
030afe7a feat(map): drape drawn polygons + TPS warp + scale + lock (SS14) (#212)
21a36a53 feat(landscaper): add open_clarification tool + builder (clarification artifact Phase 1) (#213)
48fbcee5 feat(landscaper): add get_rent_roll_schedule deterministic base artifact (#211)
da48063b feat(landscaper): add get_capitalization_schedule deterministic base artifact (#210)
9de6bfb6 docs: commit leftover instructions bump + nightly sync notes (#209)
00e71194 fix(map): persist geometry on map-feature PATCH so vertex edits save (#208)
28d02df6 feat(landscaper): add get_cashflow_schedule deterministic base artifact (#207)
6481bd14 docs(sales): SS5 run record — cost-of-sale component sweep, projects 152-159 (#206)
88ada2b1 fix(sales): itemize cost-of-sale components (legal/closing/title), net-neutral (#205)
41a2525d chore(brief): repoint OneDrive output to 1Active/_Landscape/_cowork after folder move+rename
2433d0d8 feat(landscaper): deterministic sales-schedule artifact (get_sales_schedule) (#204)
32eaeeeb feat(landscaper): deterministic development-budget artifact (get_budget_schedule) (#203)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Clarification artifact Phase 2 — frontend renderer for the clarification card type in ArtifactRenderer.tsx (Phase 1 is backend-only today).
- [ ] TPS warp — test with real site plans to validate accuracy at scale; TPS rubber-sheet warp (5+ points) path flagged by `recommendTpsWarp`.

## Alpha Readiness Impact

No movement on alpha blockers. Today's work is feature expansion (deterministic artifact tools, map TPS warp) and data quality (cost-of-sale components). Landscaper tool count increased from 274 → 280 advertised (277 → 283 registered).

## Notes for Next Session

- **Tool count:** 283 registered, 280 advertised (6 new today: 5 deterministic schedule artifacts + `open_clarification`). CLAUDE.md updated.
- **TPS overlay system is live** — new migration `20260724_overlay_warp_scale_lock` adds columns to `tbl_project_overlay`. Needs Railway deploy for production.
- **Cost-of-sale backfill** ran on projects 152–159. Other projects may need the same treatment.
- **Clarification artifacts** — backend tool + builder done; frontend renderer is the next step.

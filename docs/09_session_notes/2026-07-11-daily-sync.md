# Daily Sync — 2026-07-11

**Date**: Friday, July 11, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Technical Debt Addressed
- **Retired dead `core_budget_category` path** (#157, -3,245 lines): Deleted `variance_calculator.py`, `views_variance.py`, `views_budget_categories.py`, `IncompleteCategoriesReminder.tsx`, `useBudgetVariance.ts`, `useEditGuard.ts`, 6 `.bak` files, and 3 legacy API routes. Cleaned residual references from `ColumnDefinitions.tsx` and `GroupRow.tsx`. Major dead-code cleanup in the budget subsystem.

### Bugs Fixed
- **Media re-scan deduplication** (#156): `MediaExtractionService` now deduplicates already-extracted images during re-scan, preventing duplicate entries. Added `test_media_rescan_dedup.py` test (+149 lines).
- **Studio media gallery positioning** (#155): Fixed media gallery being buried below Project Documents in the Documents tab; stopped idle gallery polling when the gallery isn't visible (+36 lines).

## Files Modified

| PR | Files | Lines |
|----|-------|-------|
| #157 (budget cleanup) | 19 files | -3,245 |
| #156 (media dedup) | 2 files | +149 |
| #155 (gallery fix) | 3 files | +36 |

## Git Commits

```
bd8600f2 refactor(budget): retire dead core_budget_category path (variance + incomplete reminder) (#157)
5683833e fix(dms): stop media re-scan from duplicating already-extracted images (#156)
0297eda0 fix(studio): media gallery buried below Project Documents; stop idle gallery poll (#155)
```

## Recent Context (Last 3 Days)

```
c8534b56 fix(nav): Projects icon flyout lists recent projects; opens list on click (#154)
edf23bec fix(studio): keep collapsed-rail submenu flyout open across the icon→menu gap (#153)
2a9887d2 feat(studio): per-icon submenu flyouts in collapsed left-nav (#152)
eacdac92 feat(map): 3D tilt slider + fold Demo Rings into Market group (#151)
705da3f1 fix(map): constrain Maricopa parcel-outline source to county zoom range — stop 502 spam (#150)
a9f04d43 refactor(map): compact Layers panel — fold Drawn Items into Annotations (#149)
8139eec5 ci(production): fix red Production Deployment — JWT_SIGNING_KEY + tests/health-check only (#148)
46fbdcbd fix(map): disambiguate legend Annotations + per-shape visibility toggle (#147)
ce06c4eb feat(map): legend drag-reorder + terrain/hillshade (#146)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] 11 untracked daily-sync files in `docs/09_session_notes/` dating back to 2026-06-26 — consider batch-committing via the scoped committer.
- [ ] Several untracked CC prompt files in `docs/cc-prompts/` (LN7, LN8, LN9, branch-cleanup recovery, GIS MVP handoff) — review and commit or discard.

## Alpha Readiness Impact

No alpha blocker movement today. Today's work was focused on technical debt reduction (-3,245 lines of dead budget-category code) and DMS stability (media dedup, gallery positioning). The scanned-PDF/OCR pipeline remains the only open alpha blocker.

## Notes for Next Session

- The budget subsystem is significantly cleaner after #157. The `core_budget_category`-based variance path, incomplete-categories reminder, and edit guard are fully retired. Budget grid now relies solely on the `core_fin_fact_budget` / `tbl_budget_category` path.
- Media re-scan is now idempotent (#156) — safe to re-process documents without creating duplicate extracted images.
- Studio left-nav flyout system (#152–#154) is complete across the last two days. Projects icon now shows a flyout with recent projects and opens the full list on click.
- Map UI improvements from Jul 9 (#146–#151) added legend drag-reorder, terrain/hillshade, 3D tilt, and cleaned up the Layers panel significantly.

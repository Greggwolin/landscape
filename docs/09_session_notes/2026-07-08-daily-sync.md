# Daily Sync — 2026-07-08

**Date**: Wednesday, July 8, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

No commits or new development activity today.

## Files Modified

No changes since the July 6 commit. The same uncommitted working-tree changes persist on `feature/map-sales-match-market`:

```
 M src/components/map-tab/MapTab.tsx   (Redfin radius 5→3 mi, days 365→180)
 M src/lib/redfinClient.ts             (year-built null filter for vintage-gated comps)
```

Untracked files (unchanged):
```
?? backend/apps/market_intel/management/commands/ingest_maricopa_sales.py
?? backend/tools/market_ingest/maricopa_sales.py
?? docs/cc-prompts/gis-mvp-architecture-handoff.md
```

## Git Commits

None today. Last commit: `e422adb8` on 2026-07-06 — "fix(map): match land-project map sales layer to Market screen — live Recent Sales on by default, stale Sale Comps off".

## Current Branch

`feature/map-sales-match-market` — 1 commit ahead of `main`. Two uncommitted tracked changes + three untracked files on this branch.

## Active To-Do / Carry-Forward

- [ ] **Commit uncommitted fixes** — MapTab radius/days adjustment + redfinClient year-built null filter have been sitting uncommitted since July 6 (3 days). Should be committed on this branch.
- [ ] **Merge `feature/map-sales-match-market` → `main`** once uncommitted changes are committed.
- [ ] **Maricopa County sales ingestion pipeline** — new/untracked (`ingest_maricopa_sales.py`, `maricopa_sales.py`). Needs staging and commit when ready.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Nine untracked daily-sync notes have accumulated in `docs/09_session_notes/` — commit script should pick them up.

## Alpha Readiness Impact

No change. Alpha status remains ~92%.

## Notes for Next Session

- Uncommitted changes on `feature/map-sales-match-market` are now 3 days old. The two fixes are small, well-scoped, and ready to commit:
  1. `MapTab.tsx` — aligns map Recent Sales radius/days (3 mi / 180 days) to match the Market screen defaults.
  2. `redfinClient.ts` — year-built null filter excludes comps with unknown vintage when a year-built filter is active, preventing unconfirmed-vintage comps from polluting year-based pricing sets.
- Maricopa sales ingestion pipeline remains untracked — review and stage when ready to formalize.
- Daily-sync notes keep accumulating untracked — run the commit script to batch-commit them.

# Daily Sync — 2026-07-06

**Date**: Monday, July 6, 2026
**Generated**: Nightly automated sync (updated 20:45 MST)

---

## Work Completed Today

### Features / Bug Fixes

- **Map sales layer alignment** (`e422adb8`, committed): Land-project maps now default to showing live Recent Sales (on) and stored Sale Comps (off), matching the Property > Market screen's live feed. `getDefaultLayerGroups()` takes an `isDevelopment` flag to flip defaults per property type.
- **Redfin search window tightened** (uncommitted, `MapTab.tsx`): `useSfComps` call changed from 5 mi / 365 days to 3 mi / 180 days so the map's Recent Sales count matches the Market screen's comp count.
- **Redfin year-built filter null handling** (uncommitted, `redfinClient.ts`): When a year-built bound is set, comps with unknown (null) year built are now excluded. Previously nulls passed through vintage filters, polluting year-based pricing sets.
- **Maricopa County sales ingestion pipeline** (untracked, 504 lines): New Django management command `ingest_maricopa_sales` + parser module `backend/tools/market_ingest/maricopa_sales.py`. Handles SalesAffidavits.txt + ResidentialMaster.txt + Parcels.csv with market/non-market classification and `--dry-run` mode. Session tag: `SM10-COUNTY-SALES-CONNECTOR-0706`.

### Technical Debt

- None addressed today.

## Files Modified

Committed:
```
src/components/map-tab/MapTab.tsx    |  2 +-
src/components/map-tab/constants.ts  | 11 ++++++++---
```

Uncommitted (working tree):
```
src/components/map-tab/MapTab.tsx    |  6 ++++--  (Redfin radius/days)
src/lib/redfinClient.ts              |  8 +++++---  (year-built null filter)
```

Untracked (new files):
```
backend/apps/market_intel/management/commands/ingest_maricopa_sales.py  (92 lines)
backend/tools/market_ingest/maricopa_sales.py                          (412 lines)
```

## Git Commits

```
e422adb8 fix(map): match land-project map sales layer to Market screen — live Recent Sales on by default, stale Sale Comps off (Gregg Wolin, 2026-07-06 13:46:42 -0700)
```

## Current Branch

`feature/map-sales-match-market` — 1 commit ahead of `main`. Uncommitted changes + untracked Maricopa ingestion files on this branch.

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Merge `feature/map-sales-match-market` → `main` once uncommitted Redfin + year-built changes are committed.
- [ ] Maricopa County sales ingestion pipeline is new/untracked — needs staging and commit when ready.
- [ ] Seven+ untracked daily-sync notes — commit script should pick them up.
- [ ] Two git stashes remain: overlay-durable WIP and guide-work backup — review for cleanup.
- [ ] 13 unmerged branches (local + remote) — several look stale (e.g., `wip/property-type-badge-0624`, `fix/retire-budget-category-deadpath`). Worth a cleanup pass.

## Alpha Readiness Impact

No movement on alpha blockers. Alpha readiness remains at ~92%. Sole remaining blocker: scanned-PDF/OCR pipeline. Today's work is market-data UX polish (map layer defaults, Redfin filter correctness) — improves the appraiser workflow but doesn't gate alpha.

## Notes for Next Session

- Currently on `feature/map-sales-match-market` with uncommitted changes — commit the Redfin radius/year-built fixes before switching branches.
- Maricopa sales ingestion is a significant new capability (county-level recorded sales vs. Redfin scraping) — needs testing with real Maricopa data files before merging.
- The `getDefaultLayerGroups(isDevelopment)` pattern could be extended for other property-type-specific map defaults (MF vs. Office vs. Retail).
- No CLAUDE.md changes needed — today's work is feature-level, no architectural shifts.

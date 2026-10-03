# Daily Sync — 2026-10-03

**Date**: Friday, October 3, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Yesterday (Oct 2)

- **QV8/QV14 — Land IRR on actual dates; Screens dropdown opens land Feasibility/Valuation (#319)**: The land cash flow engine now computes IRR on actual calendar dates rather than period indices. The Screens dropdown in the panel view now includes a Feasibility/Valuation entry for land projects. The IRR check notebook was updated to match the new date-based calculations. Modified `land_dev_cashflow_service.py`, `whatif_engine.py`, `land_cashflow_irr_check.ipynb`, and `folderTabConfig.ts` (+72/−61 across 4 files).

### Nightly doc commits (Oct 1 evening)

- **docs: nightly health check 2026-10-01** — created `2026-10-02-daily-sync.md` (84 lines).
- **docs: nightly health check 2026-09-30** — created `2026-09-30-daily-sync.md` (107 lines).

## Files Modified (Oct 2 QV8/QV14 commit)

```
backend/apps/landscaper/services/land_dev_cashflow_service.py | 69 +++++-----
backend/apps/landscaper/services/whatif_engine.py             | 13 +-
backend/notebooks/engine_checks/land_cashflow_irr_check.ipynb | 45 +++---
src/lib/utils/folderTabConfig.ts                              |  6 +-
4 files changed, 72 insertions(+), 61 deletions(-)
```

## Git Commits (last 3 days)

```
5ed9bc73 QV8/QV14 — land IRR on actual dates; Screens dropdown opens land Feasibility/Valuation (#319) (Gregg Wolin, Oct 2 09:40 MST)
c80eb487 docs: nightly health check 2026-10-01 (Gregg Wolin, Oct 1 20:48 MST)
eeaf6583 docs: nightly health check 2026-09-30 (Gregg Wolin, Oct 1 20:48 MST)
b68e61a1 QV6 — land cash flow and IRR check notebook (#318) (Gregg Wolin, Oct 1)
02ec9256 HQ112 — budget stage: Improvements can be saved (#317) (Gregg Wolin, Oct 1)
f671dfc9 BM14 — parcel table: unsaved-changes bar above the table, warn before leaving (#314) (Gregg Wolin, Sep 30)
bbad7dfc fix(dms): uploaded spreadsheets were hidden on arrival; cost-library files were never uploaded (#310) (Gregg Wolin, Sep 30)
b38678b3 fix: Property > Location loads in the chat-first panel; chat-logged feedback reaches the tracker (#316) (Gregg Wolin, Sep 30)
0eb436e8 Screen sub-pages as links beside the Screen dropdown (#315) (Gregg Wolin, Sep 30)
36447d9d BM1-BM10: confirmed Landscaper changes write; direct writes except deletes; parcels no-area + land-use fill (#313) (Gregg Wolin, Sep 30)
```

## Uncommitted Working Tree

- **Modified**: `docs/09_session_notes/CARRY_FORWARD.md` (3 new items added by prior nightly run)
- **Untracked**: ~50 `_claude/` screenshot/design files (HQ150–HQ169 series)
- **Untracked**: 2 migration files (`migrations/20260928_division_trigger_functions_rename.{up,down}.sql`) — sitting since Sep 28

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host — existing clones predate MF units, leases, cost approach, and all changes since Sep 4.
- [ ] PropertyTab.tsx floor plan double-counting fix — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Two untracked migration files in working tree since Sep 28 — commit, review, or discard.
- [ ] Verify Sep 30 features: Landscaper direct writes (BM1–BM10), Improvements budget save (HQ112), parcels unsaved-changes guard (BM14).
- [ ] Run land cash flow IRR check notebook on host after QV8/QV14 update.
- [ ] Verify QV8/QV14: land IRR now on actual dates; Screens dropdown shows Feasibility/Valuation for land projects.

## Alpha Readiness Impact

No movement on core alpha blockers today. The QV8/QV14 commit improves the financial engine's accuracy (actual dates vs. period indices) which strengthens alpha readiness, but the primary blocker — the scanned-PDF/OCR pipeline — remains unchanged.

## Notes for Next Session

The land cash flow engine now uses actual calendar dates for IRR, which is a correctness improvement over period-index math. The IRR check notebook was updated to match — running it on the host (`cd backend && bash notebooks/engine_checks/run_land_check.sh`) will confirm the new date-based calculations are correct. The Screens dropdown now shows Feasibility/Valuation for land projects, which was previously missing. Both should be verified hands-on.

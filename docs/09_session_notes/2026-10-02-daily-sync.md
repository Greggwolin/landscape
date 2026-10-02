# Daily Sync — 2026-10-02

**Date**: Thursday, October 2, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

No commits landed on `origin/main` today (Oct 2). The most recent commit was yesterday afternoon.

### Yesterday (Oct 1)

- **QV6 — Land cash flow and IRR check notebook (#318)**: Added a Jupyter notebook (`land_cashflow_irr_check.ipynb`) and runner script under `backend/notebooks/engine_checks/` for verifying land cash flow and IRR calculations. Updated `.gitignore` for notebook outputs. (+394 lines across 3 files)

### Sep 30 (6 commits)

- **HQ112 — Budget stage: Improvements can be saved (#317)**: Migration `20260930_budget_stage_improvements` enables saving the Improvements stage of the budget. Artifact view spec updated for schedule artifacts.
- **BM14 — Parcel table: unsaved-changes bar (#314)**: Parcels artifact now shows an unsaved-changes warning bar and warns before navigating away. Shared `StandardArtifactFrame` cleaned up across 7 artifact types.
- **fix(dms): uploaded spreadsheets hidden on arrival (#310)**: Spreadsheets were being hidden when uploaded; cost-library files were never uploaded at all. Both fixed in DMS staging and upload context.
- **fix: Property > Location loads in chat-first panel (#316)**: Location screen now loads in the `/w/` chat-first surface. Chat-logged feedback now reaches the feedback tracker.
- **Screen sub-pages as links (#315)**: Screen sub-pages rendered as clickable navigation links beside the Screen dropdown in the panel view.
- **BM1–BM10: Landscaper confirmed writes (#313)**: The Landscaper can now write confirmed changes directly to the database (all operations except deletes). Parcels handle no-area assignments and land-use fills. Pending mutations replay without expiry. (+583 lines across 14 files)

### Sep 29–30 (additional context)

- **MQ1 market data slice 1 (#312)**: Daily macro refresh with revision history. Codes built from each place.
- **fix(dms): dropping >10 files (#309)**: Batch drops of more than ten files no longer silently fail; refused files now say why.
- **fix(plans): drawing reader no longer misreads agreements as plats (#307)**: Stops files from being moved out of the folder they were placed in.
- **fix(dms): proxy sign-in on nine routes (#306)**: Forward sign-in headers on document proxy routes; refused drag-drops explain the reason.

## Files Modified

**Oct 1 (3 files):**
- `.gitignore` (+3)
- `backend/notebooks/engine_checks/land_cashflow_irr_check.ipynb` (+371)
- `backend/notebooks/engine_checks/run_land_check.sh` (+20)

**Uncommitted (working tree):**
- `migrations/20260928_division_trigger_functions_rename.down.sql` (untracked)
- `migrations/20260928_division_trigger_functions_rename.up.sql` (untracked)

## Git Commits (last 3 days, origin/main)

```
b68e61a1 QV6 — land cash flow and IRR check notebook (#318) — Oct 1
02ec9256 HQ112 — budget stage: Improvements can be saved (#317) — Sep 30
f671dfc9 BM14 — parcel table: unsaved-changes bar above the table (#314) — Sep 30
bbad7dfc fix(dms): uploaded spreadsheets hidden on arrival; cost-library files never uploaded (#310) — Sep 30
b38678b3 fix: Property > Location loads in chat-first panel; feedback reaches tracker (#316) — Sep 30
0eb436e8 Screen sub-pages as links beside the Screen dropdown (#315) — Sep 30
36447d9d BM1-BM10: confirmed Landscaper changes write; direct writes except deletes (#313) — Sep 30
cd1f3a22 MQ1 market data slice 1: daily macro refresh, revision history (#312) — Sep 29
6af135c8 fix(dms): dropping more than ten files did nothing; refused files shown (#309) — Sep 29
6a3bfc56 fix(plans): drawing reader no longer reads agreements as plats (#307) — Sep 29
ec28e770 fix(dms): forward sign-in on nine document proxy routes (#306) — Sep 29
```

## Active To-Do / Carry-Forward

From `CARRY_FORWARD.md` (developer list):
- [ ] Re-run demo project clones on host — existing clones predate unit, lease, cost-approach fix and all changes since Sep 4.
- [ ] PropertyTab.tsx floor plan double-counting fix — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

From today's scan:
- [ ] Two untracked migration files for division trigger function rename — not committed or reviewed.
- [ ] Land cash flow and IRR check notebook merged — verify the notebook runs cleanly on host with `run_land_check.sh`.
- [ ] Three features from Sep 30 awaiting verification: Landscaper direct writes, Improvements budget save, parcels unsaved-changes guard.

## Alpha Readiness Impact

No alpha blocker movement today. The sole remaining alpha gap is the scanned-PDF / OCR pipeline (OCRmyPDF identified, not yet implemented). Overall alpha readiness remains at ~92% on the legacy `/projects/[id]` surface.

Yesterday's land cash flow IRR check notebook supports validation of the financial engine but does not directly move an alpha blocker.

## Notes for Next Session

- The pace of daily shipping continues — 11 commits in the last 3 days. The main themes are the editing spine (Landscaper writes directly, budget saves, parcels guards) and DMS reliability (six upload/visibility fixes).
- The two untracked division-trigger-rename migrations from Sep 28 remain in the working tree. Decision needed: commit or discard.
- The IRR check notebook is a new testing/validation tool for the land cash flow engine — worth running to confirm correctness.

## Nightly Sync Addendum

This note was generated by the `nightly-landscape-sync` scheduled task at 2026-10-02 03:40 MST.

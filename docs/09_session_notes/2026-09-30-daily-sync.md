# Daily Sync — 2026-09-30

**Date**: Tuesday, September 30, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added or Progressed
- **Landscaper mutation writes are live** (#313, BM1-BM10) — confirmed Landscaper changes now write directly to the database (all operations except deletes). Parcels support no-area assignment and land-use fill. Mutation service expanded with direct-write path alongside the existing approval flow.
- **Budget stage: Improvements can be saved** (#317, HQ112) — the Improvements stage in the budget schedule now persists correctly. Migration added to support the change.
- **Parcel table unsaved-changes guard** (#314, BM14) — an unsaved-changes bar now appears above the parcel table, and the user is warned before navigating away with unsaved edits. All artifact renderers updated consistently.
- **Screen sub-pages as navigation links** (#315) — screen sub-pages now appear as clickable links beside the Screen dropdown, replacing a deeper menu path.

### Bugs Fixed
- **DMS: uploaded spreadsheets hidden on arrival** (#310) — spreadsheets uploaded via DMS were not visible until a page reload; cost-library files were silently dropped. Both fixed.
- **Property > Location loads in chat-first panel** (#316) — the Location screen was not rendering in the chat-first `/w/` surface. Also fixed: chat-logged feedback now reaches the feedback tracker.

### Technical Debt Addressed
- View spec consistency across seven artifact types (capitalization, cashflow, parcels, pricing register, rent roll, sales, schedule) — all updated in the BM14 commit.
- Mutation service refactored to support both confirmed-write and proposal paths cleanly.


## Files Modified

```
backend/apps/artifacts/views.py                               | 36 ++++++++++------------
backend/apps/landscaper/ai_handler.py                          |  4 +-
backend/apps/landscaper/services/mutation_service.py           | 156 +++++++++++++++++++--
backend/apps/landscaper/tool_executor.py                       | 244 +++++++++++++++++++++++++++---
backend/apps/landscaper/tools/capitalization_view_spec.py      |  2 +-
backend/apps/landscaper/tools/cashflow_view_spec.py            |  2 +-
backend/apps/landscaper/tools/parcels_view_spec.py             | 38 ++++-
backend/apps/landscaper/tools/pricing_register_view_spec.py    |  2 +-
backend/apps/landscaper/tools/rent_roll_view_spec.py           |  2 +-
backend/apps/landscaper/tools/sales_view_spec.py               |  2 +-
backend/apps/landscaper/tools/schedule_view_spec.py            | 10 +-
backend/apps/landscaper/views.py                               | 47 +++++++
migrations/20260929_pending_mutations_replay_no_expiry.down.sql| 12 ++
migrations/20260929_pending_mutations_replay_no_expiry.up.sql  | 16 +++
migrations/20260930_budget_stage_improvements.down.sql         |  8 ++
migrations/20260930_budget_stage_improvements.up.sql           | 11 +++
src/app/api/dms/docs/route.ts                                 | 12 ++++----
src/app/api/parcels/route.ts                                   |  4 +
src/app/api/phases/route.ts                                    | 11 +-
src/app/components/Planning/PlanningContent.tsx                |  3 +-
src/app/w/projects/[projectId]/layout.tsx                      | 12 +++++
src/components/dms/staging/StagingRow.tsx                       |  2 +-
src/components/landscaper/MutationProposalCard.tsx             | 39 ++++--
src/components/wrapper/ArtifactWorkspacePanel.tsx              | 13 ++
src/components/wrapper/CapitalizationArtifact.tsx              |  1 -
src/components/wrapper/CashflowArtifact.tsx                    |  1 -
src/components/wrapper/PanelScreenView.tsx                     | 37 ++++++++++
src/components/wrapper/ParcelsArtifact.tsx                     | 203 ++++++++++++++++++++++---
src/components/wrapper/PricingRegisterArtifact.tsx             |  5 +-
src/components/wrapper/RentRollArtifact.tsx                    |  7 +-
src/components/wrapper/SalesArtifact.tsx                       |  7 +-
src/components/wrapper/ScheduleArtifact.module.css             | 10 +-
src/components/wrapper/ScheduleArtifact.tsx                    | 26 ++-------
src/components/wrapper/StandardArtifactFrame.tsx               | 15 ++---
src/contexts/UploadStagingContext.tsx                           |  8 +++--
src/contexts/WrapperProjectContext.tsx                          |  6 +++
src/hooks/useLandscaperThreads.ts                              |  8 ++
src/styles/wrapper.css                                         | 38 ++++++++++++
```


## Git Commits (origin/main, today)

```
02ec9256 HQ112 — budget stage: Improvements can be saved (#317) (Gregg Wolin, 8 hours ago)
f671dfc9 BM14 — parcel table: unsaved-changes bar above the table, warn before leaving (#314) (Gregg Wolin, 9 hours ago)
bbad7dfc fix(dms): uploaded spreadsheets were hidden on arrival; cost-library files were never uploaded (#310) (Gregg Wolin, 9 hours ago)
b38678b3 fix: Property > Location loads in the chat-first panel; chat-logged feedback reaches the tracker (#316) (Gregg Wolin, 10 hours ago)
0eb436e8 Screen sub-pages as links beside the Screen dropdown (#315) (Gregg Wolin, 12 hours ago)
36447d9d BM1-BM10: confirmed Landscaper changes write; direct writes except deletes; parcels no-area + land-use fill (#313) (Gregg Wolin, 12 hours ago)
```

## Recent Commits (last 3 days)

```
cd1f3a22 MQ1 market data slice 1: daily macro refresh, revision history, codes built from each place (#312) (29 hours ago)
6af135c8 fix(dms): dropping more than ten files did nothing; refused files are now shown (#309) (31 hours ago)
6a3bfc56 fix(plans): the drawing reader no longer reads recorded agreements as plats or moves files out of the folder they were put in (#307) (34 hours ago)
ec28e770 fix(dms): forward sign-in on nine document proxy routes; say why a dragged file was not added (#306) (34 hours ago)
9611c678 feat(nav): Gregg's navigation rules on the chat-first surface, R1-R12 (#301, #302) (2 days ago)
7b35ec97 fix(proforma): Year 1 is today's run rate; Year N carries N-1 years of growth (#303) (2 days ago)
162caa0b fix(intake): name the real cause when document processing fails; restore missing import (#305) (2 days ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host — existing clones predate MF units, leases, and cost approach fixes. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Two untracked migration files on working tree: `20260928_division_trigger_functions_rename.{up,down}.sql` — not staged or committed.

## Alpha Readiness Impact

No alpha blocker moved today. The Landscaper mutation writes (#313) and budget stage persistence (#317) strengthen the editing workflow but do not address the remaining alpha gap (scanned-PDF/OCR pipeline).

## Notes for Next Session

- The mutation service now has two code paths: direct write (for confirmed edits) and proposal (for review-before-write). Both need testing under load.
- Seven view specs were touched in BM14 for consistency — any artifact rendering regression should be checked against that commit.
- Two untracked migration files for division trigger function renames sit in the working tree. Unclear if they are ready to commit.
- CW_TO_CHAT_SYNC.md was 29 days stale at seq 23 (2026-09-01). Updated to seq 24 in this run.

# Daily Sync — 2026-07-31

**Date**: Thursday, July 31, 2026
**Generated**: Nightly automated sync
**Branch at scan**: `chore/ci-gate-stacked-prs` (stale — today's work landed on `main` and `feat/budget-artifact-slice1`)

---

## Work Completed Today

### Committed to `main` (3 PRs merged today)

1. **`09f2de33` feat(artifacts): editing spine slice 4 — cash-flow assumptions editable cells (CC3) (#236)** — Cash-flow assumption cells are now editable end-to-end through the artifact editing spine. `cashflow_artifact_builder.py` expanded from ~100 to ~500 lines with full cell-commit write path. New `commit_cashflow_cell` endpoint in `views.py` (+223 lines). `tool_executor.py` updated (+49 lines). Full pytest suite (`test_commit_cashflow_cell.py`, 252 lines; `test_cashflow_schedule_tool.py` expanded +180 lines). New artifact types added to `artifact.ts`. **+1,111/-104 lines across 7 files.**

2. **`e02fe157` feat(artifacts): stale-cell guard — refuse an edit whose pointer no longer matches (CC11) (#237)** — Safety guard: if the artifact's data has been refreshed since the user clicked a cell (e.g., another edit landed), the commit endpoint now rejects the stale pointer with a clear error rather than silently writing to the wrong cell. New `test_stale_cell_guard.py` (142 lines). `cashflow_artifact_builder.py` gained fingerprint helpers (+27 lines). **+336/-5 lines across 3 files.**

3. **`aa2bb92c` feat(artifacts): row-moved guard — the click names the ROW, not the slot (CC13) (#238)** — Companion to CC11: the frontend now sends a row identifier (e.g., category name) alongside the positional index so the backend can detect if rows shifted between render and commit. `ArtifactRenderer.tsx` enhanced (+38 lines), `useArtifact.ts` hook extended (+11 lines), `artifact.ts` types expanded (+14 lines). New `test_row_moved_guard.py` (143 lines). **+248/-13 lines across 6 files.**

### Committed to `feat/budget-artifact-slice1` (1 commit, WIP branch)

4. **`2d112fdc` feat(artifacts): budget slice 1 — the schedule renders from a view specification (EB1)** — New architecture for budget schedule rendering: a `schedule_view_spec.py` (321 lines) defines the view specification declaratively, `budget_artifact_builder.py` produces it, and a new `ScheduleArtifact.tsx` (676 lines) + `ScheduleArtifact.module.css` (405 lines) renders it in the right panel with full styling. `ArtifactWorkspacePanel.tsx` updated to dispatch to the new renderer. **+1,498/-2 lines across 6 files. Not yet merged to main.**

### Uncommitted Changes

On `chore/ci-gate-stacked-prs` (likely stale copies of EB1 work):
- Modified: `views.py`, `budget_artifact_builder.py`, `ArtifactWorkspacePanel.tsx` (+96 lines)
- Untracked: `schedule_view_spec.py`, `ScheduleArtifact.module.css`, `ScheduleArtifact.tsx`
- Untracked: `docs/09_session_notes/2026-07-30-daily-sync.md` (yesterday's sync — not committed by last night's run)

### Summary by Category

**Features:** Editing spine extended to cash-flow assumptions (CC3) — the third domain after budget (CB6/CB8) and sales (CB9). New budget schedule view-specification architecture (EB1, WIP branch).

**Safety/Integrity:** Two new edit guards shipped — stale-cell (CC11) and row-moved (CC13). Together they prevent silent data corruption when the artifact changes between the user clicking a cell and the commit arriving. Both have full pytest coverage.

**Tests:** 4 new test files totaling ~680 lines of pytest coverage for the editing spine write path and guards.

## Files Modified (Today's Commits on `main`)

```
 backend/apps/artifacts/tests/test_commit_cashflow_cell.py   | 252 +++++++++
 backend/apps/artifacts/tests/test_row_moved_guard.py        | 143 ++++++
 backend/apps/artifacts/tests/test_stale_cell_guard.py       | 142 ++++++
 backend/apps/artifacts/views.py                             | 436 +++++++++++-
 backend/apps/landscaper/tool_executor.py                    |  49 +-
 backend/apps/landscaper/tools/cashflow_artifact_builder.py  | 527 +++++++++++++---
 backend/apps/landscaper/tests/test_cashflow_schedule_tool.py| 180 ++++++
 src/components/wrapper/ArtifactRenderer.tsx                 |  44 +-
 src/components/wrapper/ArtifactWorkspacePanel.tsx           |  14 +-
 src/hooks/useArtifact.ts                                    |  11 +
 src/types/artifact.ts                                       |  19 +-
```

**Total on `main`**: 11 files changed, ~1,695 insertions, ~122 deletions.

## Git Commits (Last 3 Days)

```
2d112fdc feat(artifacts): budget slice 1 — the schedule renders from a view specification (EB1) (4h ago, feat/budget-artifact-slice1)
aa2bb92c feat(artifacts): row-moved guard — the click names the ROW, not the slot (CC13) (#238) (4h ago, main)
e02fe157 feat(artifacts): stale-cell guard — refuse an edit whose pointer no longer matches (CC11) (#237) (5h ago)
09f2de33 feat(artifacts): editing spine slice 4 — cash-flow assumptions editable cells (CC3) (#236) (6h ago)
cfd10a4c ci: gate every pull request, including stacked ones (CC15) (32h ago)
b89c8c9e docs: restore CLAUDE.md audit entries lost from the shared checkout (CC7) (35h ago)
9047bd89 fix(landscaper): send artifacts somewhere they can actually render (TA5) (#230) (2d ago)
d600c6fc feat(artifacts): editing spine slice 3 — sales schedule editable cells (CB9) (#229) (2d ago)
5e0ab71f feat(artifacts): UOM picklist cell + editable-cell affordance (CB10) (#232) (2d ago)
2c9d2173 fix(sales): batch recalc passes sale_period — stops flattening the offset (CB12) (#231) (2d ago)
0cce5ef8 fix(sales): fixed transaction-cost benchmarks survive an override (CB13) (#233) (2d ago)
475c8057 fix(sales): improvement offset resolves by unit of measure, or refuses (CB14) (#234) (2d ago)
```

## Active To-Do / Carry-Forward

- [ ] **EB1 budget view-spec architecture** — Committed on `feat/budget-artifact-slice1`, not yet merged. New `ScheduleArtifact.tsx` renderer + `schedule_view_spec.py` declarative spec. Review and merge pending.
- [ ] **Stale uncommitted on `chore/ci-gate-stacked-prs`** — EB1 files duplicated as uncommitted changes on this branch. Clean up or discard once EB1 merges via its own branch.
- [ ] **Yesterday's sync note uncommitted** — `docs/09_session_notes/2026-07-30-daily-sync.md` is untracked. Will be picked up by tonight's committer if on the right branch.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement. Today's work deepens the artifact editing spine (cash-flow assumptions now editable, CC3) and hardens edit integrity (stale-cell guard CC11, row-moved guard CC13). The EB1 branch introduces a view-specification architecture that will likely become the standard for all schedule artifact rendering. Scanned-PDF / OCR remains the only significant alpha gap.

## Notes for Next Session

- The artifact editing spine now covers **three domains**: budget cells (CB6/CB8/CB10), sales cells (CB9), and cash-flow assumption cells (CC3). Each has a full write path with backend tests.
- **Two new safety guards** (CC11 stale-cell, CC13 row-moved) protect against concurrent-edit data corruption across ALL editable artifact types. They're implemented at the `views.py` level and apply universally.
- **EB1 (view-spec architecture)** on `feat/budget-artifact-slice1` is a design shift: instead of the LLM composing table HTML, the backend produces a structured view specification and a dedicated `ScheduleArtifact.tsx` renderer handles layout/styling. This is likely the path forward for all schedule artifacts — review the spec shape in `schedule_view_spec.py` before extending.
- The `chore/ci-gate-stacked-prs` branch has stale uncommitted copies of EB1 files — these should be discarded (the real work is on the EB1 branch).

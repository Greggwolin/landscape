# Daily Sync — 2026-08-07

**Date**: Thursday, August 7, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### No Commits Today

No commits landed on `chore/ci-gate-stacked-prs` (or any branch) today.

### Uncommitted WIP — Budget Artifact View Specification (EB1)

4 tracked files modified, 3 new untracked files — all part of the EB1 budget view-specification architecture (`feat/budget-artifact-slice1` work):

**Modified (tracked):**
- `CLAUDE.md` — audit entry updated to 2026-07-31 reflecting CC3/CC11/CC13 + EB1 WIP
- `backend/apps/artifacts/views.py` — `_refresh_artifact_after_write` now rebuilds the budget view specification after an editing-spine write so the view config and block schema stay in sync (+18 lines)
- `backend/apps/landscaper/tools/budget_artifact_builder.py` — new `build_budget_view_config_for_project()` function; `create_budget_artifact()` now embeds `budget_view_config` in `params_json` alongside the block schema; budget query expanded to include `division_id`, `activity`, `internal_memo` for the view spec (+61 lines)
- `src/components/wrapper/ArtifactWorkspacePanel.tsx` — routing: when `params_json.budget_view_config` is present, renders the new `ScheduleArtifact` component; falls back to the block renderer for older artifacts (+19 lines)

**New (untracked):**
- `backend/apps/landscaper/tools/schedule_view_spec.py` (321 lines) — declarative view specification builder: 8-knob model (scope, filter, window, basis, detail, grouping, sort, predicate); reads project hierarchy labels from `tbl_project_config` to avoid hard-coding "Area"/"Phase"
- `src/components/wrapper/ScheduleArtifact.tsx` (676 lines) — React renderer for the view specification
- `src/components/wrapper/ScheduleArtifact.module.css` (405 lines) — styles for the schedule artifact

**Total new code:** ~1,402 lines across the 3 new files; +98 lines in tracked modifications.

## Files Modified

```
 CLAUDE.md                                          |   3 +-
 backend/apps/artifacts/views.py                    |  18 +
 backend/apps/landscaper/tools/budget_artifact_builder.py | 61 +
 src/components/wrapper/ArtifactWorkspacePanel.tsx  |  19 +
 (new) backend/apps/landscaper/tools/schedule_view_spec.py | 321
 (new) src/components/wrapper/ScheduleArtifact.tsx  | 676
 (new) src/components/wrapper/ScheduleArtifact.module.css  | 405
```

## Git Commits

```
(none today — last commit: acfaebd2 docs: nightly health check 2026-08-06, 24h ago)
```

## Active Branch

`chore/ci-gate-stacked-prs` — CI gating for stacked PRs (landed 8 days ago as cfd10a4c). EB1 view-spec work appears to be staged on top of this branch but not yet committed.

## Active To-Do / Carry-Forward

- [ ] **EB1 view-specification architecture** — ~1,500 lines of uncommitted WIP. The declarative spec replaces LLM-composed table HTML for budget schedules. Needs commit + PR.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. The EB1 view-specification work is a quality improvement to the artifacts system (already marked ✅ WORKS), not a blocker resolution.

## Notes for Next Session

- The EB1 view-spec work is substantial (~1,500 lines) but entirely uncommitted — 3 new files are untracked. This should be committed and PR'd before more work stacks on top.
- Current branch `chore/ci-gate-stacked-prs` may not be the intended home for the EB1 changes — verify whether a `feat/budget-artifact-slice1` branch should be created.
- The `schedule_view_spec.py` design doc header is clear and well-structured (8-knob model, project-label-aware hierarchy). The "AREA AND PHASE ARE NOT REAL WORDS" section addresses a real generalization risk.

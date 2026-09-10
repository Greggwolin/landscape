# Daily Sync — 2026-08-03

**Date**: Sunday, August 3, 2026
**Generated**: Nightly automated sync
**Branch at scan**: `chore/ci-gate-stacked-prs`

---

## Work Completed Today

### No new commits today (Sunday).

Last commit across all branches was `2d112fdc` (EB1 budget view-spec) on `feat/budget-artifact-slice1` at 2026-07-31.

### Uncommitted Changes (unchanged since Jul 31)

On `chore/ci-gate-stacked-prs` — same 4 modified + 3 untracked source files as prior three syncs:
- **Modified:** `CLAUDE.md` — audit entry updated to 2026-07-31
- **Modified:** `backend/apps/artifacts/views.py` — +18 lines (EB1 spillover)
- **Modified:** `backend/apps/landscaper/tools/budget_artifact_builder.py` — +61 lines
- **Modified:** `src/components/wrapper/ArtifactWorkspacePanel.tsx` — +19 lines
- **Untracked:** `schedule_view_spec.py`, `ScheduleArtifact.tsx`, `ScheduleArtifact.module.css` — EB1 files that belong on `feat/budget-artifact-slice1`

These EB1 source files are stale copies on the wrong branch. The canonical EB1 work lives on `feat/budget-artifact-slice1`.

## Files Modified

No files modified today.

## Git Commits (Last 3 Days)

None. Last commits were Jul 31:
```
2d112fdc feat(artifacts): budget slice 1 — the schedule renders from a view specification (EB1) (feat/budget-artifact-slice1)
aa2bb92c feat(artifacts): row-moved guard — the click names the ROW, not the slot (CC13) (#238) (main)
e02fe157 feat(artifacts): stale-cell guard — refuse an edit whose pointer no longer matches (CC11) (#237) (main)
09f2de33 feat(artifacts): editing spine slice 4 — cash-flow assumptions editable cells (CC3) (#236) (main)
```

## Active To-Do / Carry-Forward

- [ ] **EB1 budget view-spec architecture** — Committed on `feat/budget-artifact-slice1`, not yet merged to main. `ScheduleArtifact.tsx` renderer + `schedule_view_spec.py` declarative spec. Review and merge pending.
- [ ] **Stale uncommitted on `chore/ci-gate-stacked-prs`** — EB1 source files duplicated as uncommitted changes. Discard once EB1 merges via its own branch. CLAUDE.md edit and daily-sync notes still need committing.
- [ ] **Sync note accumulation** — Five sync notes now untracked (Jul 30 through Aug 3). The nightly committer likely can't commit on this branch. Manual intervention needed — switch to `main` or run `git checkout -- <stale files>` to clear the uncommitted EB1 spillover, then commit the sync notes.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No change. Scanned-PDF / OCR pipeline remains the only significant alpha gap. Overall alpha readiness at ~92%.

## Notes for Next Session

- **Third consecutive day with no commits** (weekend). The editing spine sprint (CB/CC series) and EB1 view-spec both wrapped Jul 31.
- **Branch cleanup overdue:** `chore/ci-gate-stacked-prs` has stale EB1 uncommitted files for 4 days now. Recommended: `git checkout -- backend/apps/artifacts/views.py backend/apps/landscaper/tools/budget_artifact_builder.py src/components/wrapper/ArtifactWorkspacePanel.tsx` to discard the spillover, then switch to `main` for normal work.
- **Five uncommitted sync notes** (Jul 30–Aug 3) — growing daily. The scoped committer may be blocked by branch policy or the stale uncommitted changes. Resolve Monday.
- **EB1 merge review** — `feat/budget-artifact-slice1` has the `schedule_view_spec.py` + `ScheduleArtifact.tsx` (321 + 676 lines) ready for review. This is the declarative spec architecture that replaces LLM-composed table HTML for budget schedules.

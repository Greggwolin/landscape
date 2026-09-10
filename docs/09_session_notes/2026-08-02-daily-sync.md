# Daily Sync — 2026-08-02

**Date**: Saturday, August 2, 2026
**Generated**: Nightly automated sync
**Branch at scan**: `chore/ci-gate-stacked-prs`

---

## Work Completed Today

### No new commits today (Saturday).

Last commit across all branches was `2d112fdc` (EB1 budget view-spec) on `feat/budget-artifact-slice1` at 2026-07-31.

### Uncommitted Changes (unchanged from yesterday)

On `chore/ci-gate-stacked-prs` — same 4 modified + 3 untracked source files as prior two syncs:
- **Modified:** `CLAUDE.md` — audit entry updated to 2026-07-31
- **Modified:** `backend/apps/artifacts/views.py` — +18 lines (EB1 spillover)
- **Modified:** `backend/apps/landscaper/tools/budget_artifact_builder.py` — +61 lines
- **Modified:** `src/components/wrapper/ArtifactWorkspacePanel.tsx` — +19 lines
- **Untracked:** `schedule_view_spec.py`, `ScheduleArtifact.tsx`, `ScheduleArtifact.module.css` — EB1 files that belong on `feat/budget-artifact-slice1`

These EB1 source files are stale copies on the wrong branch. The canonical EB1 work lives on `feat/budget-artifact-slice1`.

## Files Modified

No files modified today.

## Git Commits (Last 3 Days)

```
cfd10a4c ci: gate every pull request, including stacked ones (CC15) (Gregg Wolin, 3 days ago)
b89c8c9e docs: restore CLAUDE.md audit entries lost from the shared checkout (CC7) (Gregg Wolin, 3 days ago)
```

No other commits within 3 days on any branch.

## Active To-Do / Carry-Forward

- [ ] **EB1 budget view-spec architecture** — Committed on `feat/budget-artifact-slice1`, not yet merged to main. `ScheduleArtifact.tsx` renderer + `schedule_view_spec.py` declarative spec. Review and merge pending.
- [ ] **Stale uncommitted on `chore/ci-gate-stacked-prs`** — EB1 source files duplicated as uncommitted changes. Discard once EB1 merges via its own branch. CLAUDE.md edit and daily-sync notes still need committing.
- [ ] **Sync note accumulation** — Four sync notes now untracked (Jul 30, Jul 31, Aug 1, Aug 2). If the nightly committer keeps failing due to branch mismatch or lock file, manual intervention is needed.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No change. Scanned-PDF / OCR pipeline remains the only significant alpha gap.

## Notes for Next Session

- **Weekend pause** — second consecutive day with no commits. The editing spine sprint (CB/CC series) wrapped Jul 31. EB1 view-spec on its feature branch awaits review/merge.
- **Branch cleanup needed:** `chore/ci-gate-stacked-prs` has stale EB1 uncommitted files. Either discard them (`git checkout -- <files>`) or switch to `main` before resuming work.
- **Committer likely blocked:** Four sync notes accumulating suggests the scoped committer can't commit on this branch (possibly because it's not `main`, or a lock issue). Investigate on Monday.

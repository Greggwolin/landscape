# Daily Sync — 2026-05-27

**Date**: Tuesday, May 27, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

**No commits or code changes today.** Second consecutive workday with no new commits (last commit: `0848ed5b` on 2026-05-21).

### Pending Branch State

- **Current branch:** `feat/spec-hidden-and-header-align` — 1 commit ahead of `main` (`0848ed5b feat(reports): modification_spec adds hidden denylist + alignment overrides`)
- **Merge prompt:** `LSCMD-SPEC-EXTEND-0521.md` (untracked) contains a PR + squash-merge prompt for this branch. Now **6 days pending** — should be prioritized immediately.

### Unmerged Feature Branches (8 total)

| Branch | Age | Summary |
|--------|-----|---------|
| `feat/spec-hidden-and-header-align` | 6d | Report modification_spec hidden denylist + alignment overrides |
| `feature/feedback-dashboard-endpoint` | 7d | Feedback dashboard data endpoint for morning-refresh skill |
| `fix/rpt07b-subtitle-not-using-location` | 7d | Artifact auto-refresh + report subtitle fix |
| `feature/artifact-takeover-pass2` | 8d | Claude-style whole-panel takeover behavior |
| `feature/artifact-takeover` | 9d | Document-style visual treatment paired with takeover (WIP) |
| `hotfix/dms-auth-headers` | 9d | DMS auth headers fix for Django doc-types + tag fetches |
| `feature/dms-previewer` | 10d | File previewer wiring-gap fix |
| `fix/ci-neon-branch-role` | 10d | CI migration role swap |

## Files Modified

No files modified today.

## Git Commits

No new commits today. Last commit: `0848ed5b` (2026-05-21).

## Active To-Do / Carry-Forward

- [ ] **Merge `feat/spec-hidden-and-header-align` into main** — 6 days pending, merge prompt ready (`LSCMD-SPEC-EXTEND-0521.md`). First priority on next working session.
- [ ] **Review and merge accumulated feature branches** — 8 branches unmerged, oldest 10 days. Risk of merge conflicts growing.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — remains the primary alpha blocker (unchanged)
- [ ] BASE_INSTRUCTIONS migration — ~80 lines of superseded T-12 rules could be removed now that the OS guard handles enforcement programmatically

## Alpha Readiness Impact

No alpha blocker movement today. Overall alpha readiness remains at ~92%.

## Notes for Next Session

- **Immediate action:** merge `feat/spec-hidden-and-header-align` branch. 6 days stale — merge prompt is ready in `LSCMD-SPEC-EXTEND-0521.md`.
- **Branch hygiene concern:** 8 unmerged branches accumulating. Consider a batch review/merge session to prevent drift.
- After merge, clean up the untracked `LSCMD-SPEC-EXTEND-0521.md` file.
- 5 prior daily-sync notes (5/22–5/26) remain untracked — consider `git add` in the next commit.

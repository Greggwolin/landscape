# Daily Sync — 2026-05-28

**Date**: Wednesday, May 28, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

**No commits or code changes today.** Third consecutive workday with no new commits (last commit: `0848ed5b` on 2026-05-21, 7 days ago).

### Pending Branch State

- **Current branch:** `feat/spec-hidden-and-header-align` — 1 commit ahead of `main` (`0848ed5b feat(reports): modification_spec adds hidden denylist + alignment overrides`)
- **Merge prompt:** `LSCMD-SPEC-EXTEND-0521.md` (untracked) contains a PR + squash-merge prompt for this branch. Now **7 days pending** — overdue for merge.

### Unmerged Feature Branches (9 local, additional remote-only)

| Branch | Age | Summary |
|--------|-----|---------|
| `feat/spec-hidden-and-header-align` | 7d | Report modification_spec hidden denylist + alignment overrides |
| `feature/feedback-dashboard-endpoint` | 8d | Feedback dashboard data endpoint for morning-refresh skill |
| `fix/rpt07b-subtitle-not-using-location` | 8d | Artifact auto-refresh + report subtitle fix |
| `feature/artifact-takeover-pass2` | 9d | Claude-style whole-panel takeover behavior |
| `feature/artifact-takeover` | 10d | Document-style visual treatment paired with takeover (WIP) |
| `fix/ci-neon-branch-role` | 11d | CI migration role swap |
| `feature/dms-previewer` | 11d | File previewer wiring-gap fix |
| `feature/dashboard-artifacts-closed` | 12d | Dashboard artifacts closed state |

Remote-only branches not checked out locally: `chore/auth-and-ownership-rollout` (12d), `fix/profile-invention-guard` (10d), `fix/report-visual-pass-0521` (7d).

## Files Modified

No files modified today.

## Git Commits

No new commits today. Last commit: `0848ed5b` (2026-05-21).

## Active To-Do / Carry-Forward

- [ ] **Merge `feat/spec-hidden-and-header-align` into main** — 7 days pending, merge prompt ready (`LSCMD-SPEC-EXTEND-0521.md`). Overdue — first priority on next working session.
- [ ] **Review and merge accumulated feature branches** — 9+ branches unmerged, oldest 12 days. Merge conflict risk is growing daily.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — remains the primary alpha blocker (unchanged)
- [ ] BASE_INSTRUCTIONS migration — ~80 lines of superseded T-12 rules could be removed now that the OS guard handles enforcement programmatically

## Alpha Readiness Impact

No alpha blocker movement today. Overall alpha readiness remains at ~92%.

## Notes for Next Session

- **Critical: branch hygiene.** 7 days without a commit and 9+ unmerged branches is a red flag. Next session should prioritize a batch merge pass before any new feature work.
- **Merge order suggestion:** Start with `feat/spec-hidden-and-header-align` (merge prompt ready), then `fix/rpt07b-subtitle-not-using-location`, `feature/feedback-dashboard-endpoint`, and `fix/ci-neon-branch-role` (fixes first, then features).
- After merges, clean up the untracked `LSCMD-SPEC-EXTEND-0521.md` file.
- 7 daily-sync notes (5/22–5/28) remain untracked — `git add` in the next commit.

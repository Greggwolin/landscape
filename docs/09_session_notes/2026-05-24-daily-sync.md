# Daily Sync — 2026-05-24

**Date**: Saturday, May 24, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

**No commits or code changes today.** Weekend — no new commits since 2026-05-21.

### Pending Branch State

- **Branch:** `feat/spec-hidden-and-header-align` — 1 commit ahead of `main` (`0848ed5b feat(reports): modification_spec adds hidden denylist + alignment overrides`)
- **Merge prompt:** `LSCMD-SPEC-EXTEND-0521.md` (untracked) contains a PR + squash-merge prompt for this branch. Still pending execution — third day waiting.

## Files Modified

No files modified today.

## Git Commits

No new commits today. Last commit: `0848ed5b` (2026-05-21).

## Active To-Do / Carry-Forward

- [ ] **Merge `feat/spec-hidden-and-header-align` into main** — branch is 1 commit ahead, merge prompt (`LSCMD-SPEC-EXTEND-0521.md`) is ready. Third day pending — should be first action on next working session.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — remains the primary alpha blocker (unchanged)
- [ ] BASE_INSTRUCTIONS migration — ~80 lines of superseded T-12 rules could be removed now that the OS guard handles enforcement programmatically

## Alpha Readiness Impact

No alpha blocker movement today. Overall alpha readiness remains at ~92%.

## Notes for Next Session

- Immediate action: merge `feat/spec-hidden-and-header-align` branch (merge prompt ready in `LSCMD-SPEC-EXTEND-0521.md`). This has been pending since Wednesday.
- After merge, clean up the untracked `LSCMD-SPEC-EXTEND-0521.md` file.
- Landscaper tool count: 275 registered (unchanged).
- Consider prioritizing OCR pipeline or BASE_INSTRUCTIONS cleanup as next substantive work.

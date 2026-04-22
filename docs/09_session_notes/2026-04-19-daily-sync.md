# Daily Sync — April 19, 2026

**Date**: Saturday, April 19, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### No Activity — Weekend

Zero commits today. No manual work detected. Last commit was the nightly health check on April 18 (`f81e208`).

## Files Modified

None.

## Git Commits

None today. Most recent:

```
f81e208 docs: nightly health check 2026-04-18 (Gregg Wolin, 2026-04-18 08:01:13 -0700)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **Dead table refs (from Apr 18 health check):** `tbl_market_comparable`, `tbl_knowledge_fact`, `tbl_knowledge_entity` referenced in Landscaper tools but may not exist in DB — verify and fix
- [ ] Tool gap analysis P2/P3 gaps (scenario comparison, what-if, portfolio tools) — prioritize
- [ ] Test agent framework scenarios S5/S6/S8/S10 need calibration runs against live backend
- [ ] Excel audit phases 4-7 still pending (waterfall classifier, Python replication, S&U balance, trust score, HTML report)
- [ ] P1 analysis tools (8 new from Apr 17) need end-to-end verification with real project data
- [ ] Thread search endpoint needs frontend wiring in `/w/` chat interface

## Alpha Readiness Impact

No movement. All 6 original alpha blockers remain resolved. Overall alpha readiness holds at ~90%.

## Notes for Next Session

1. **Stale git worktrees** — 12 orphaned worktree entries in `.git/worktrees/` reference paths on the host machine (`/Users/5150east/landscape/.claude/worktrees/...`). These cause `git diff` and `git status` to fail in sandbox environments. Consider running `git worktree prune` on the host machine to clean up.
2. **Dead tool refs remain open** — 3 Landscaper tools reference tables that may not exist. Highest-priority quick fix for Monday.
3. **P1 analysis tools still untested e2e** — second day without verification. Risk of shipping broken tools grows.
4. **No IMPLEMENTATION_STATUS.md found** at `docs/00_overview/status/` — either the path has changed or the file was never created. Not blocking but the nightly sync can't update it.

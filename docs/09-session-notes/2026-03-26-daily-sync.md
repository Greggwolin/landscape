# Daily Sync — 2026-03-26

**Date**: Wednesday, March 26, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.12 (unchanged)

---

## Work Completed Today

### No Commits Today

No new commits on any branch. The `alpha13` branch is current with no new code changes.

### Uncommitted Items (Pending from Yesterday)

The following documentation changes from yesterday's sync are staged but not yet committed:

- CLAUDE.md updates (alpha readiness → 82%, reports blocker mostly resolved, PDF blocker resolved)
- IMPLEMENTATION_STATUS_3-8-26.md updates
- COMPLETION_LOG.md updates
- 2026-03-25-daily-sync.md (yesterday's session note — new file)

### Health Check Run

Automated health check ran at 08:03 MST (`health-2026-03-26_0803.json`):

- **CoreUI compliance auditor**: FAIL — 6,854 violations (longstanding; MUI imports: 139, hardcoded hex: 790, forbidden Tailwind: 843, dark variants: 80, inline styles: 5,002)
- **Django API route enforcer**: PASS — No new Next.js API routes added
- **CLAUDE.md sync checker**: PASS — No stale references
- **Extraction queue monitor**: SKIP — Table not found
- **Dead tool detector**: FAIL — 2 dead table references in Landscaper tools

## Files Modified

```
(no committed changes)

Unstaged:
  docs/UX/health-reports/health-2026-03-26_0803.json (new)

Staged (from yesterday, not yet committed):
  CLAUDE.md
  docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md
  docs/00-overview/status/COMPLETION_LOG.md
  docs/09-session-notes/2026-03-25-daily-sync.md
```

## Git Commits

```
(none today)

Last commit: 35113e3 chore: bump version to v0.1.12 (Gregg Wolin, ~28 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Wire preview SQL for remaining 19 report generators (only Sales Comparison `rpt_11` is fully wired)
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Operations save migration — Move to Django from legacy Next.js route
- [ ] Waterfall calculate endpoint — Wire to financial engine
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF identified but not implemented
- [ ] Commit staged documentation changes from yesterday's sync
- [ ] Dead tool detector: 2 dead table references in Landscaper tools need investigation

## Alpha Readiness Impact

No movement today. Status remains at **~82% Alpha-Ready**.

## Notes for Next Session

- Yesterday's doc sync is staged but uncommitted — commit it early or it'll keep accumulating.
- Health check flagged 2 dead table references in Landscaper tools — worth investigating to prevent silent failures.
- CoreUI compliance violations (6,854) are longstanding technical debt, not new regressions.
- Priority work items remain: wiring preview SQL for report generators, operations save migration, waterfall endpoint.

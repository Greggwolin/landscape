# Daily Sync — April 18, 2026

**Date**: Friday, April 18, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Quiet Day — No Manual Commits

Only automated output today:
- **Nightly Health Check** (`f81e208`): Health report generated at `docs/UX/health-reports/health-2026-04-18_0800.json`

### Health Check Findings

| Agent | Status | Notes |
|-------|--------|-------|
| CoreUI Compliance Auditor | FAIL | 7,186 violations (5,248 inline styles, 876 hardcoded hex, 843 forbidden Tailwind, 139 MUI imports, 80 dark variants) — long-standing tech debt, no regression |
| Django API Route Enforcer | PASS | 0 new Next.js violations (420 legacy routes, 22 Django viewsets) |
| CLAUDE.md Sync Checker | PASS | 0 stale files |
| Extraction Queue Monitor | SKIP | Table not found (expected — OCR pipeline not yet implemented) |
| Dead Tool Detector | FAIL | 3 dead table refs: `tbl_market_comparable` in map_tools.py, `tbl_knowledge_fact` and `tbl_knowledge_entity` in appraisal_knowledge_tools.py |
| Allowed Updates Auditor | PASS | 0 mismatches |

**Actionable from health check:** The 3 dead table references are worth investigating — these tools will silently fail if invoked. Likely need table renames or the tables were dropped/never created.

## Files Modified

```
docs/UX/health-reports/health-2026-04-18_0800.json | 77 +++
```

## Git Commits (1 today)

```
f81e208 docs: nightly health check 2026-04-18 (Gregg Wolin, 13 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **Dead table refs (from health check):** `tbl_market_comparable`, `tbl_knowledge_fact`, `tbl_knowledge_entity` referenced in Landscaper tools but may not exist in DB — verify and fix
- [ ] Tool gap analysis P2/P3 gaps (scenario comparison, what-if, portfolio tools) — prioritize
- [ ] Test agent framework scenarios S5/S6/S8/S10 need calibration runs against live backend
- [ ] Excel audit phases 4-7 still pending (waterfall classifier, Python replication, S&U balance, trust score, HTML report)
- [ ] P1 analysis tools (8 new from Apr 17) need end-to-end verification with real project data
- [ ] Thread search endpoint needs frontend wiring in `/w/` chat interface

## Alpha Readiness Impact

No movement today. All 6 original alpha blockers remain resolved. CoreUI compliance violations are tech debt, not alpha blockers.

## Notes for Next Session

1. **Dead tool detector flagged 3 tables** — these are likely real issues that would cause silent tool failures. Quick fix: verify table names in DB, update tool SQL references
2. **CoreUI violation count (7,186)** is stable — not regressing but also not being addressed. Consider whether to batch-fix inline styles before alpha
3. **Yesterday's P1 tools still untested e2e** — highest-value next step is verifying the full Landscaper → tool → endpoint → response chain

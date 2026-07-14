# Daily Sync — 2026-07-13

**Date**: Sunday, July 13, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Bug Fixes
- **Landscaper tool-gate fix (#158):** 13 tools that had working executors and schemas but were absent from every property-type gate list in `tool_registry.py` were attached to their correct gates. Previously these tools only reached the model via the unknown-project-type fallback. Breakdown: 4 DMS tools + 3 acquisition-event tools → `UNIVERSAL_TOOLS`; `delete_budget_category` + 2 category-lifecycle tools → `LAND_ONLY_TOOLS`; 3 expense-comparable tools → `INCOME_PROPERTY_TOOLS`. Additive only — no tool added/removed, no schema/DB change. Session: LSCMD-TOOLGATE-0712-VP1.
- **Login TOS display fix:** Removed the "Terms accepted on {date}" card from `LoginForm.tsx` that forced returning users to click Sign In twice. The dead `tosAcceptedAt` state and `formattedAcceptedDate` memo were cleaned up. TOS persistence and the new-user acceptance checkbox are unchanged. (-22 lines)

### Documentation
- CLAUDE.md Landscaper tool count refreshed: master list now shows **273 advertised** unique tools (288 registered executors), dated 2026-07-13.

## Files Modified

| File | Changes |
|------|---------|
| `CLAUDE.md` | +4 / -3 (tool count refresh) |
| `backend/apps/landscaper/tool_registry.py` | +16 (gate list additions) |
| `src/app/login/LoginForm.tsx` | -22 (dead TOS display code) |

## Git Commits

```
a09ffec5 fix(landscaper): gate 13 ungated tools into their property-type gates (#158) (Gregg Wolin, 9 hours ago)
0c548e7e fix(login): remove TOS-accepted-date display on sign-in (Gregg Wolin, 11 hours ago)
```

## Recent Context (Last 3 Days)

```
bd8600f2 refactor(budget): retire dead core_budget_category path (variance + incomplete reminder) (#157) (Jul 11)
5683833e fix(dms): stop media re-scan from duplicating already-extracted images (#156) (Jul 11)
0297eda0 fix(studio): media gallery buried below Project Documents; stop idle gallery poll (#155) (Jul 11)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline remains the primary alpha blocker (OCRmyPDF integration seam exists but binaries not provisioned).
- [ ] 12 untracked daily-sync files accumulated in `docs/09_session_notes/` — consider batch-committing.

## Alpha Readiness Impact

No alpha blocker movement today. The tool-gate fix improves Landscaper reliability (tools now fire correctly per property type instead of relying on the fallback path) but doesn't change the overall ~92% alpha-ready assessment. The login fix improves UX for returning users.

## Notes for Next Session

- The tool-gate fix was purely additive to `tool_registry.py` — the tool count didn't change (273 advertised), only the routing improved. If new tools are added, they must be placed in the correct gate list at registration time.
- 12 daily-sync files are untracked — the nightly commit script will pick them up automatically on the next run.

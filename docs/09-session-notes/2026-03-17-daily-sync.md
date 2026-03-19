# Daily Sync — 2026-03-17

**Date**: Monday, March 17, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Documentation
- **Nightly health check** (`3c8ed10`) — Committed the 2026-03-16 daily sync note and the 2026-03-17 health report JSON. This was the only commit today.

### Health Check Results (2026-03-17 08:00)
- **CoreUI Compliance:** FAIL — 6,619 violations (inline styles: 4,765, forbidden Tailwind: 844, hardcoded hex: 791, MUI imports: 139, dark variants: 80). Unchanged from previous.
- **Django API Route Enforcer:** PASS — 0 new Next.js violations (416 Next.js routes, 22 Django viewsets).
- **CLAUDE.md Sync:** PASS — no stale files.
- **Dead Tool Detector:** PASS — 8 tools scanned, 0 dead refs.
- **Allowed Updates Auditor:** PASS — 0 critical mismatches.
- **Extraction Queue Monitor:** SKIP — table not found.

### Uncommitted Work in Progress
Active modifications (not yet committed) suggest work on a **unified intake / file-drop refactor**:
- `ProjectLayoutClient.tsx` — +68 lines (likely intake integration at layout level)
- `LandscaperPanel.tsx` — -302 lines (major cleanup/extraction of file-drop logic)
- `FileDropContext.tsx` — +31/-8 (context refactor for unified drop handling)
- `DMSView.tsx` — minor adjustments
- `dms/page.tsx` — 2 lines removed

New untracked files:
- `src/components/intake/` — new intake component directory
- `src/hooks/useIntakeStaging.ts` — intake staging hook
- `src/app/api/projects/[projectId]/dms/update-doc-type/` — new API route
- `docs/14-specifications/unified-intake-design.md` — design spec
- `docs/02-features/dms/USER-GUIDE-DOCUMENT-UPLOAD.md` — upload user guide
- Several mockup files at repo root (html, jsx)
- `data/seed/Costar_MF_partial.xlsx` — seed data

## Files Modified

```
3c8ed10 docs: nightly health check 2026-03-17
 docs/09-session-notes/2026-03-16-daily-sync.md     | 82 +++
 docs/UX/health-reports/health-2026-03-17_0800.json | 64 +++
 2 files changed, 146 insertions(+)
```

## Git Commits

```
3c8ed10 docs: nightly health check 2026-03-17 (Gregg Wolin, 12h ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Verify Railway deployment stability after simplejwt upgrade (9-commit chain from 3/16).
- [ ] Income approach refactor — verify ExpenseCompsView and RentCompsView render correctly in deployed app.
- [ ] Unified intake / file-drop refactor — WIP in working tree, not yet committed. Includes new `src/components/intake/` directory, `useIntakeStaging` hook, and significant LandscaperPanel cleanup (-302 lines).
- [ ] Clean up repo root mockup files (unified-intake-mockup.html, .jsx, .jsx.bak, knowledge-intake-mockups.html) before next commit.

## Alpha Readiness Impact

No alpha blocker movement today. The uncommitted unified intake refactor may eventually improve the extraction pipeline (blocker #5), but it's not complete yet.

**Alpha blockers unchanged:**
1. Reconciliation frontend — still stubbed
2. Operations save migration — still on legacy Next.js
3. Reports project scoping — still hardcoded to project 17
4. Waterfall calculate endpoint — still 404
5. Extraction pipeline (OCR) — still not implemented
6. PDF report generation — not started

## Notes for Next Session

1. **Unified intake refactor is in progress** — significant uncommitted changes across 5 tracked files + 7 new untracked files/dirs. This is the main active work stream.
2. **LandscaperPanel.tsx lost 302 lines** — file-drop logic appears to be moving to FileDropContext and/or the new intake components. Verify Landscaper still functions after this extraction.
3. **Several mockup/prototype files at repo root** should be moved or cleaned up before committing.
4. **Branch is `alpha-prep`** — working tree is dirty with the intake refactor WIP.
5. **Health check agents are all green** except the persistent CoreUI compliance violations (6,619 — known tech debt, not blocking alpha).

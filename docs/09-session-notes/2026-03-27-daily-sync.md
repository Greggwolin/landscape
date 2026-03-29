# Daily Sync — 2026-03-27

**Date**: Thursday, March 27, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.13

---

## Work Completed Today

### Committed

1. **Operations save migrated to Django** (`4f2409f`) — Created `backend/apps/financial/views_operations.py` (232 lines) with Django endpoints replacing legacy Next.js routes for operations save. Updated `financial/urls.py`. Added migration `0006_update_data_readiness.py` updating report `data_readiness` flags. Also created `2026-03-25-daily-sync.md` and updated CLAUDE.md + IMPLEMENTATION_STATUS.
2. **Frontend wired to Django operations** (`ced6a71`) — `OperationsTab.tsx` and `useOperationsData.ts` updated to call Django endpoints instead of legacy Next.js. CLAUDE.md alpha readiness updated to ~90%.
3. **Version bump to v0.1.13** (`b894ab3`) — package.json + package-lock.json.
4. **Merge alpha13 → main** (`f5a433a`) — All alpha13 work now on main branch.

### Uncommitted (In Progress)

5. **ReportViewer rewrite — inline PDF preview** — Complete rewrite of `ReportViewer.tsx` (445 lines removed/refactored). Switched from JSON preview rendering to inline PDF preview via `<iframe>` with blob URL. Added refresh button, simplified component significantly by removing client-side table/map rendering.
6. **`useReportPdfPreview` hook** — New React Query hook in `useReports.ts` that fetches PDF blob from Django export endpoint and returns a blob URL for iframe display. 5-minute cache for expensive PDF generation.
7. **`preview_base.py` major PDF improvements** — Content-aware column width calculation (proportional to content length), Paragraph-based cell wrapping (no more clipped text), automatic landscape orientation for tables with 7+ columns, proper text alignment (left/right) per column format, bold styling for header/total rows, XML-safe escaping.
8. **`rpt_03_loan_budget.py` rewrite** — Major overhaul (+130/-50 lines) of loan budget report generator.
9. **Multiple generator format fixes** — rpt_01 (sources & uses), rpt_02 (debt summary), rpt_05 (assumptions), rpt_06 (project summary), rpt_15 (budget cost summary), rpt_20 (budget vs actual) all received format/alignment updates.
10. **`staticmap>=0.5.7` added** to `backend/requirements.txt` — Static map image generation dependency (likely for comp map in PDF reports).
11. **Session log updated** — `docs/daily-context/session-log.md` significantly expanded.

## Files Modified

### Committed
```
CLAUDE.md                                          | 25 +++---
backend/apps/financial/urls.py                     |  5 +
backend/apps/financial/views_operations.py         | 232 ++++++ (NEW)
backend/apps/financial/migrations/0006_update_data_readiness.py | 85 +++ (NEW)
docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md   | 21 +-
docs/00-overview/status/COMPLETION_LOG.md          |  2 +
docs/09-session-notes/2026-03-25-daily-sync.md     | 94 +++ (NEW)
docs/09-session-notes/2026-03-26-daily-sync.md     | 77 +++ (NEW)
docs/UX/health-reports/health-2026-03-26_0803.json | 73 +++ (NEW)
src/app/.../tabs/OperationsTab.tsx                 | 10 +-
src/hooks/useOperationsData.ts                     |  6 +-
package.json                                       |  2 +-
package-lock.json                                  |  4 +-
```

### Uncommitted
```
backend/apps/reports/generators/preview_base.py    | 436 +++++++---
backend/apps/reports/generators/rpt_01_sources_and_uses.py  |   6 +-
backend/apps/reports/generators/rpt_02_debt_summary.py      |   8 +-
backend/apps/reports/generators/rpt_03_loan_budget.py       | 180 +++++--
backend/apps/reports/generators/rpt_05_assumptions_summary.py |  12 +-
backend/apps/reports/generators/rpt_06_project_summary.py   |   6 +-
backend/apps/reports/generators/rpt_15_budget_cost_summary.py |  11 +-
backend/apps/reports/generators/rpt_20_budget_vs_actual.py  |   6 +-
backend/requirements.txt                           |   1 +
docs/daily-context/session-log.md                  | 544 +++++------
src/components/reports/ReportViewer.tsx            | 445 +++-------
src/hooks/useReports.ts                            |  36 ++
```

## Git Commits

```
b894ab3 chore: bump version to v0.1.13 (Gregg Wolin, 10 hours ago)
f5a433a Merge alpha13 into main (Gregg Wolin, 10 hours ago)
ced6a71 feat: route Operations save calls to Django from frontend (Gregg Wolin, 10 hours ago)
4f2409f feat: migrate Operations save to Django + update report data_readiness (Gregg Wolin, 10 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Commit uncommitted report improvements (PDF preview rewrite, preview_base upgrades, generator fixes)
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Operations GET (P&L calculation) still on legacy Next.js — save is migrated, read is not
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF identified but not implemented
- [ ] Dead tool detector: 2 dead table references in Landscaper tools (flagged in 3/26 health check)

## Alpha Readiness Impact

**Operations save migration: ✅ RESOLVED** — Alpha blocker #2 closed. Django endpoints created and frontend wired. GET (P&L) is separate migration task, not a blocker.

**Reports system: Enhanced** — Inline PDF preview replaces client-side JSON rendering. This is a quality improvement, not a status change (reports were already ✅ WORKS).

**Overall: ~90% Alpha-Ready** (unchanged from CLAUDE.md update in today's commits).

Resolved blockers today:
- ~~Operations save migration~~ → ✅ Done (commits `4f2409f` + `ced6a71`)

Remaining blockers:
- Extraction pipeline (scanned PDF/OCR) — no movement
- Operations GET migration (P&L) — deferred, not blocking alpha

## Notes for Next Session

- The uncommitted report work is substantial and high quality — should be committed as a cohesive unit: "feat: inline PDF preview + content-aware PDF layout for report generators"
- `staticmap` was added to requirements.txt — verify it deploys cleanly on Railway (may need system deps)
- The ReportViewer rewrite removed a lot of client-side rendering complexity. If any reports relied on the old JSON preview map rendering, verify those still work via the PDF path.
- alpha13 branch merged to main — verify Vercel deploys from main correctly.
- Operations GET endpoint (1,303-line legacy route) is the last major Next.js → Django migration task.

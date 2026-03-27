# Daily Sync — 2026-03-25

**Date**: Tuesday, March 25, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.11 → v0.1.12

---

## Work Completed Today

### Features Added
- **Report preview system committed** (`a4d1547`) — Massive commit: 20 report generators (`rpt_01` through `rpt_20`), `generator_router.py`, `preview_base.py`, `ReportBrowser.tsx`, `ReportViewer.tsx`, report definition seed migration, loan budget report + Excel export. 51 files changed, ~6,500 lines added. This was previously uncommitted work — now fully in the repo.
- **PDF/Excel export for report previews** (`e462ac6`) — Added WeasyPrint PDF export and openpyxl Excel export to `preview_base.py`. Sales Comparison report (`rpt_11`) fully wired with preview SQL. ReportViewer updated with download buttons. 6 files, ~1,000 lines added.

### Bugs Fixed
- **WeasyPrint lazy import** (`c3b83e6`) — Fixed Railway deploy crash caused by WeasyPrint import at module level. Now lazy-imports only when PDF generation is requested.
- **Comp map coordinates** (`f81c595`) — Sales comparison map now uses DB coordinates and `comp_number` for labels instead of hardcoded values.

### Version Bumps
- v0.1.11 (`67186da`) — After report system commit
- v0.1.12 (`35113e3`) — After PDF/Excel export + comp map fix

### Documentation Updated
- CLAUDE.md updated with report system status
- Session log entry added
- Health report generated (`health-2026-03-25_0802.json`)
- Field classification truth document added
- ARGUS report catalog reference added (`reports/ARGUS_REPORT_CATALOG_JW22.md`)
- Report system architecture doc added (`reports/REPORT_SYSTEM_ARCHITECTURE.md`)

## Files Modified (Today's Commits)

```
CLAUDE.md                                           |  27 +-
backend/apps/reports/generator_router.py            |  68 ++++
backend/apps/reports/generators/__init__.py         |  10 +-
backend/apps/reports/generators/base_report.py      |   8 +-
backend/apps/reports/generators/loan_budget.py      | 353 +++++++++
backend/apps/reports/generators/preview_base.py     | 675 ++++++++++++++++++
backend/apps/reports/generators/rpt_01–rpt_20      | ~2,200 lines (20 generators)
backend/apps/reports/migrations/0004, 0005          | 405 +++++++++
backend/apps/reports/models.py                      |  89 ++-
backend/apps/reports/serializers.py                 |  41 +-
backend/apps/reports/urls.py                        |  21 +-
backend/apps/reports/views.py                       | 360 ++++++---
backend/apps/reports/views_loan_budget.py           |  45 +++
src/app/.../valuation/comps/map/route.ts            |  86 +--
src/app/.../components/tabs/ReportsTab.tsx          | 179 ++----
src/components/map/ValuationSalesCompMap.tsx        |  10 +-
src/components/reports/LoanBudgetReport.tsx         | 204 ++++++
src/components/reports/ReportBrowser.tsx            | 149 ++++
src/components/reports/ReportPlaceholder.tsx        |  63 ++
src/components/reports/ReportViewer.tsx             | 493 ++++++++++++
src/hooks/useLoanBudgetSummary.ts                   | 140 ++++
src/hooks/useReports.ts                             | 120 +++-
src/lib/exports/loanBudgetExcel.ts                  | 193 +++++
src/types/report-definitions.ts                     | 107 +++
package.json                                        | v0.1.12
```

## Git Commits

```
35113e3 chore: bump version to v0.1.12 (Gregg Wolin, 4 hours ago)
c0861db Merge alpha12 into main (Gregg Wolin, 4 hours ago)
f81c595 fix: comp map uses DB coordinates and comp_number for labels (Gregg Wolin, 4 hours ago)
e462ac6 feat: add PDF/Excel export to report preview generators (Gregg Wolin, 4 hours ago)
861279a Merge alpha12 — fix weasyprint lazy import for Railway (Gregg Wolin, 5 hours ago)
c3b83e6 fix: lazy-import weasyprint to prevent Railway deploy crash (Gregg Wolin, 5 hours ago)
67186da chore: bump version to v0.1.11 (Gregg Wolin, 5 hours ago)
a4d1547 feat: Report preview system — 20 generators, ReportViewer, SQL fixes (Gregg Wolin, 5 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Wire preview SQL for remaining 19 report generators (only Sales Comparison `rpt_11` is fully wired)
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Operations save migration — Move to Django from legacy Next.js route
- [ ] Waterfall calculate endpoint — Wire to financial engine
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF identified but not implemented

## Alpha Readiness Impact

- **Reports (Blocker #3):** Major progress. 20 generators + PDF/Excel export now committed. Moved from "IN PROGRESS (uncommitted)" to "MOSTLY RESOLVED." Only Sales Comparison has full preview SQL — remaining 19 generators need wiring.
- **PDF report generation (Blocker #6):** ✅ RESOLVED. WeasyPrint PDF + openpyxl Excel export added with Railway-safe lazy imports.
- **Alpha readiness estimate:** ~78% → **~82%** (reports system commitment is a significant milestone)

## Notes for Next Session

- The report system is the big win today — 20 generators are in the repo and the export pipeline works. The immediate next step is wiring preview SQL for the other generators (start with high-value ones like Sources & Uses, Operating Statement, Direct Cap).
- WeasyPrint requires lazy import on Railway — the pattern in `base_report.py` should be followed for any future PDF dependencies.
- Comp map now reads from DB coordinates — if comps have null lat/lng, they won't appear on the map. May need validation.
- v0.1.12 is the current version on main.

# Daily Sync — 2026-03-24

**Date**: Monday, March 24, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.10

---

## Work Completed Today

### Features Added / Progressed

- **Expense comparable CRUD** (`af9e59d`) — New `tbl_expense_comparable` table + Django API + ExpenseCompDetailModal UI for income approach. Full create/read/update/delete with modal detail form. 10 files, +1,310 lines.
- **Location tab fixes + county/micro ACS pipeline** (`8dfadd2`) — DMS-aware market analysis, county + micropolitan ACS data series, media extraction service improvements. 15 files, +431/−74 lines.
- **Reports system (UNCOMMITTED)** — Major new report infrastructure: 20 report generators (`rpt_01` through `rpt_20`), `generator_router.py`, `ReportBrowser.tsx`, `ReportViewer.tsx`, `ReportPlaceholder.tsx`, `LoanBudgetReport.tsx`, report definition types, loan budget summary hook + Excel export. Modified: reports models, serializers, views, urls, ReportsTab, useReports. New report seed migration. 35+ new/modified files.

### Infrastructure / Docs

- **Version bump to v0.1.10** (`fb6f4eb`)
- **Nightly health check** (`0409b2e`) — Prior day's uncommitted work committed: PlanningContent land use integration, area API refactor, geo auto-seeding hardening, Landscaper Level 2 autonomy wiring, μSA improvements, media pipeline cancellation, rental comp POC scripts. 40 files, +19,899/−301 lines.
- **ARGUS report catalog** — `reports/ARGUS_REPORT_CATALOG_JW22.md` reference doc added
- **Report system architecture** — `reports/REPORT_SYSTEM_ARCHITECTURE.md` design doc
- **20 individual report specs** — `reports/RPT_01_*.md` through `RPT_20_*.md`
- **Schema inventory** — `docs/schema-inventory/FIELD_CLASSIFICATION_TRUTH_2026-03-24.md`
- **User guide chapters** — `public/guide/Landscape_User_Guide_ChE.pdf`, `ChF.pdf`

### Previous Day's Work (committed in `0409b2e`)

- Geo auto-seeding with full Census hierarchy resolution
- `cbsa_lookup.py` COUNTY_TO_MICRO dict (~30 μSA entries)
- Rental comp POC test scripts + results (Redfin ingest)
- Rich schema refresh (`landscape_rich_schema_2026-03-24_abridged.md`)
- Session notes backfill (Mar 20, 22, 23)

## Files Modified (Committed)

```
af9e59d: +1,310 / −38 across 10 files (expense comparables)
fb6f4eb: +1 / −1 (version bump)
8dfadd2: +431 / −74 across 15 files (location/ACS/media)
0409b2e: +19,899 / −301 across 40 files (mega-commit: geo, planning, landscaper, docs)
```

## Files Modified (Uncommitted — Reports System)

```
 M backend/apps/reports/generators/__init__.py
 M backend/apps/reports/models.py               (+89 lines)
 M backend/apps/reports/serializers.py           (+41 lines)
 M backend/apps/reports/urls.py                  (+19 lines)
 M backend/apps/reports/views.py                 (+356 lines)
 M src/app/.../tabs/ReportsTab.tsx               (rewritten)
 M src/hooks/useReports.ts                       (+112 lines)

 + backend/apps/reports/generator_router.py      (NEW)
 + backend/apps/reports/generators/rpt_01 – rpt_20  (20 NEW generators)
 + backend/apps/reports/generators/preview_base.py   (NEW)
 + backend/apps/reports/generators/loan_budget.py    (NEW)
 + backend/apps/reports/views_loan_budget.py         (NEW)
 + backend/apps/reports/migrations/0002_seed_report_definitions.py (NEW)
 + src/components/reports/ReportBrowser.tsx       (NEW)
 + src/components/reports/ReportViewer.tsx        (NEW)
 + src/components/reports/ReportPlaceholder.tsx   (NEW)
 + src/components/reports/LoanBudgetReport.tsx    (NEW)
 + src/hooks/useLoanBudgetSummary.ts             (NEW)
 + src/lib/exports/loanBudgetExcel.ts            (NEW)
 + src/types/report-definitions.ts               (NEW)
 + reports/*.md                                  (22 spec/arch docs)
```

## Git Commits

```
af9e59d Add expense comparable CRUD — table, Django API, modal UI (4h ago)
fb6f4eb chore: bump version to v0.1.10 (10h ago)
8dfadd2 feat: Location tab fixes + county/micro ACS pipeline + DMS-aware analysis (10h ago)
0409b2e docs: nightly health check 2026-03-24 (12h ago)
```

## Active To-Do / Carry-Forward

- [ ] **Reports system commit** — 20 generators + ReportBrowser/Viewer + models/views/serializers all uncommitted. Needs: review, test, commit.
- [ ] **Report preview rendering** — Generator stubs exist but actual data-to-HTML preview pipeline not yet wired.
- [ ] **Report PDF export** — No PDF rendering pipeline yet. Generators produce data; need a render-to-PDF step.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

**Alpha readiness: ~70% → ~78%**

Key movements:
- **Reports (Blocker #3 + #6):** Major progress. 20-report catalog defined and generator infrastructure built. No longer "hardcoded to project 17." Still needs preview rendering and PDF export to fully resolve.
- **Expense Comparables:** New feature for income approach — fills a gap in the valuation workflow.
- **Location/ACS:** County + micropolitan series pipeline strengthened.
- **Reconciliation (Blocker #1):** Already resolved Feb 21; CLAUDE.md table updated to reflect this.

## Notes for Next Session

1. **Reports are the priority.** The generator infrastructure is built but uncommitted. Next steps: wire preview rendering, test with live project data, implement PDF export. This is the biggest remaining alpha blocker.
2. **Expense comps modal** just landed — may need UI polish pass (CoreUI styling consistency, compact density).
3. **The mega-commit `0409b2e`** bundled a lot of prior uncommitted work (geo, planning, landscaper, rental comps). Future sessions should commit more incrementally.
4. **Version is now v0.1.10.**

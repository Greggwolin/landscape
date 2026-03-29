# Daily Sync — 2026-03-28

**Date**: Saturday, March 28, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.13 (no version bump today)

---

## Work Completed Today

### No Commits Today

All work is uncommitted — continuation of the 3/27 session's in-progress items plus significant new feature work.

### Uncommitted Changes (23 files, +2,090 / -1,093 lines)

#### Features Added

1. **Acquisition ledger → DCF integration** — DCF calculation service (`dcf_calculation_service.py`) now fetches acquisition costs from `tbl_acquisition` ledger and branches metrics by `analysis_purpose`:
   - **VALUATION mode**: IRR is implied return at indicated value (existing behavior)
   - **UNDERWRITING mode**: IRR computed against actual acquisition cost, NPV = PV - acquisition cost, equity multiple = total cash / acquisition cost
   - New `_fetch_effective_acquisition_cost()` method with priority: ledger events → contract price fallback
   - Response includes `acquisition.effective_cost` and `acquisition.source` fields

2. **DCF Time 0 acquisition cost column** — `DCFView.tsx` fetches acquisition price summary and prepends a "Time 0" column to the cash flow grid. `mfCashFlowTransform.ts` gains `prependAcquisitionCost()` function (+57 lines) that inserts an Acquisition Cost section with negative cash flow at period 0.

3. **Income property cash flow acquisition section** — `income_property_cashflow_service.py` gains `_build_acquisition_section()` (+70 lines) that queries `tbl_acquisition` ledger and inserts costs at time=0 as negative cash flow in the P&L/cash flow grid.

4. **Picklist-driven acquisition event types** — Acquisition event types migrated from hardcoded string literals to `tbl_system_picklist`-driven options:
   - New `useAcquisitionEventTypeOptions` hook via `usePicklistOptions.ts`
   - Lookups API route expanded with `acquisition-event-types` picklist type
   - `AcquisitionLedgerGrid.tsx` refactored to consume picklist options with fallback to hardcoded constants
   - Group splitting logic (milestone vs financial) reads `parent_id` from picklist hierarchy

5. **Acquisition event type code normalization** — All event type references migrated from display names to uppercase codes:
   - `'Closing Date'` → `'CLOSING'`, `'Deposit'` → `'DEPOSIT'`, `'Fee'` → `'FEE'`, etc.
   - Backend `AcquisitionPriceSummaryView` updated to use new codes
   - Acquisition cost calculation ungated from closing date — costs now flow through as entered

6. **Acquisition types overhaul** — `src/types/acquisition.ts` rewritten (+128/-15 lines):
   - `AcquisitionEventTypeOption` interface for picklist-driven options
   - `FALLBACK_MILESTONE_OPTIONS` / `FALLBACK_FINANCIAL_OPTIONS` constants
   - `isMilestoneAction()` / `isFinancialAction()` helpers accept optional `milestoneCodeSet` for picklist-aware checking
   - Debit/credit classification helpers retained

#### Report System Improvements (Carried from 3/27)

7. **Inline PDF preview** — `ReportViewer.tsx` rewritten to display server-generated PDF in iframe via blob URL (removes client-side JSON rendering). New `useReportPdfPreview` hook with 5-minute cache.

8. **Content-aware PDF layout** — `preview_base.py` upgraded with proportional column widths, Paragraph-based cell wrapping, auto landscape for wide tables, proper text alignment, tighter spacing throughout.

9. **Generator format fixes** — rpt_01 (sources & uses, +559/-minor), rpt_02 (debt summary, +273/-minor), rpt_03 (loan budget, +180/-50), rpt_05, rpt_06, rpt_15, rpt_20 all received format/alignment updates.

#### Other

10. **`staticmap>=0.5.7` added** to `backend/requirements.txt`

## Files Modified

```
.claude/settings.local.json                        |    4 +-
backend/apps/acquisition/views.py                  |   57 +--
backend/apps/financial/services/dcf_calculation_service.py  |   80 ++-
backend/apps/financial/services/income_property_cashflow_service.py |   70 +++
backend/apps/reports/generators/preview_base.py    |  469 +++++++---
backend/apps/reports/generators/rpt_01_sources_and_uses.py  |  559 +++++++++---
backend/apps/reports/generators/rpt_02_debt_summary.py      |  273 +++++--
backend/apps/reports/generators/rpt_03_loan_budget.py       |  180 +++++--
backend/apps/reports/generators/rpt_05_assumptions_summary.py |   12 +-
backend/apps/reports/generators/rpt_06_project_summary.py   |    6 +-
backend/apps/reports/generators/rpt_15_budget_cost_summary.py |   11 +-
backend/apps/reports/generators/rpt_20_budget_vs_actual.py  |    6 +-
backend/requirements.txt                           |    1 +
docs/daily-context/session-log.md                  |  544 +++++------
src/app/api/lookups/[type]/route.ts                |    3 +-
src/app/projects/[projectId]/components/tabs/IncomeApproachContent.tsx |    1 +
src/components/acquisition/AcquisitionLedgerGrid.tsx |  141 ++++--
src/components/reports/ReportViewer.tsx            |  445 +++------
src/components/valuation/income-approach/DCFView.tsx |   37 +-
src/components/valuation/income-approach/mfCashFlowTransform.ts |   51 ++
src/hooks/usePicklistOptions.ts                    |    1 +
src/hooks/useReports.ts                            |   36 ++
src/types/acquisition.ts                           |  196 +++---
```

## Git Commits

No commits today. Last commits (from 3/27):
```
b894ab3 chore: bump version to v0.1.13 (Gregg Wolin, 34 hours ago)
ced6a71 feat: route Operations save calls to Django from frontend (Gregg Wolin, 34 hours ago)
4f2409f feat: migrate Operations save to Django + update report data_readiness (Gregg Wolin, 34 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] **Commit today's work** — Two logical commits suggested:
  1. `feat: acquisition ledger → DCF integration + picklist-driven event types` (acquisition views, DCF service, cashflow service, acquisition grid/types, picklist hook, lookups route, DCFView, mfCashFlowTransform, IncomeApproachContent)
  2. `feat: inline PDF preview + content-aware PDF layout for report generators` (ReportViewer, useReports, preview_base, rpt_01–rpt_20, requirements.txt)
- [ ] **Seed `ACQUISITION_EVENT_TYPE` picklist** — The picklist hook is wired but the picklist rows need to be seeded into `tbl_system_picklist`. Without the seed, the grid falls back to hardcoded constants (functional but not DB-driven).
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Operations GET (P&L calculation) still on legacy Next.js — save is migrated, read is not
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF identified but not implemented
- [ ] Verify `staticmap` deploys cleanly on Railway (may need system deps)
- [ ] Verify acquisition event type codes match existing DB data (may need a data migration to normalize old rows from display names to codes)

## Alpha Readiness Impact

**No alpha blocker movement today.** All work enhances existing ✅ WORKS features:

- **Income Approach** (✅ WORKS → enhanced): DCF now supports UNDERWRITING mode with acquisition-based IRR/NPV/equity multiple, plus Time 0 cash flow column
- **Acquisition Ledger** (existing feature → enhanced): Picklist-driven event types, code normalization, ungated cost flow
- **Reports** (✅ WORKS → enhanced): Inline PDF preview, improved PDF layout quality

**Overall: ~90% Alpha-Ready** (unchanged).

Remaining blockers:
- Extraction pipeline (scanned PDF/OCR) — no movement
- Operations GET migration (P&L) — deferred, not blocking alpha

## Notes for Next Session

- The acquisition event type code migration (`'Closing Date'` → `'CLOSING'`) may break existing data. Check if `tbl_acquisition` rows in Peoria Lakes or other test projects use the old display-name format. If so, need a SQL migration to normalize existing rows.
- The `ACQUISITION_EVENT_TYPE` picklist needs to be seeded. Without it, the grid works via fallback constants but isn't truly DB-driven.
- DCF underwriting mode is wired in the backend but the frontend doesn't yet expose a toggle for `analysis_purpose`. Currently reads from `project.analysis_purpose` — verify this field is settable somewhere in the UI.
- The `prependAcquisitionCost()` function in `mfCashFlowTransform.ts` adds zero values for Time 0 to all existing rows. Watch for edge cases where totals might accidentally include the zero.
- Two verification files were generated (`CC_VERIFY_ACQUISITION_CASHFLOW.md`, `CC_VERIFY_ACQUISITION_PICKLIST.md`) — these are temp artifacts, not for commit.

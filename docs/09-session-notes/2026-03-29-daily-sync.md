# Daily Sync — March 29, 2026

**Date**: Saturday, March 29, 2026
**Generated**: Nightly automated sync
**Version**: v0.1.14 (alpha14 merged to main)

---

## Work Completed Today

### Features Added / Progressed

1. **Report format overhaul — Phase 1** (`625601c`) — 10 generators rewritten with new shared `pdf_base.py` module (355 lines). Generators updated: rpt_01 Sources & Uses, rpt_02 Debt Summary, rpt_03 Loan Budget, rpt_05 Assumptions, rpt_06 Project Summary, rpt_07a/b Rent Roll (Standard + Detail — NEW), rpt_08 Unit Mix (NEW), rpt_09 Operating Statement (NEW), rpt_14 Parcel Table, rpt_15 Budget Cost Summary, rpt_16 Sales Schedule, rpt_17 Cashflow Monthly. ReportViewer.tsx significantly rewritten (445 lines removed, streamlined). New `useReports.ts` hook added.

2. **Acquisition → DCF integration** (`1930b55`) — DCF calculation service branches by `analysis_purpose` (VALUATION vs UNDERWRITING). New `_fetch_effective_acquisition_cost()` method. DCFView.tsx now shows Time 0 column with negative acquisition cost. `mfCashFlowTransform.ts` prepends Time 0 period. Income property cashflow service builds acquisition section at time=0.

3. **Acquisition event type picklist + CLOSING cost fix** (`9d510ab`) — Event types migrated from hardcoded strings to `tbl_system_picklist`. `AcquisitionLedgerGrid.tsx` consumes picklist with fallback. Event codes normalized to uppercase. Types file (`acquisition.ts`) rewritten with proper interfaces.

### UI Component Updates

4. **50-file UI component update** (`caae828`) — Broad sweep across project tabs, valuation, capitalization, operations, landscaper, and shared components. Added `staticmap` to backend requirements. Touched: ProjectTab, PropertyPage, RentRoll, FloorPlanMatrix, LocationSubTab, MarketTab, OperationsTab, ValuationTab, ReconciliationPanel, BudgetGridTab, and ~35 more files. Primarily import/styling adjustments.

### Documentation

5. **Session notes + status updates** (`5c548e2`) — Created `2026-03-28-daily-sync.md`, updated IMPLEMENTATION_STATUS, updated session-log.md with 544-line rewrite.

### Version / Merge

6. **alpha14 merged to main** (`af57162`) — All previously-uncommitted work from alpha14 branch now on main.
7. **Version bumped to v0.1.14** (`7a6a9d4`)

## Files Modified

| Commit | Files | Insertions | Deletions |
|--------|-------|------------|-----------|
| 625601c (report overhaul) | 24 | +4,482 | -783 |
| 1930b55 (acquisition DCF) | 7 | +331 | -121 |
| 9d510ab (picklist + CLOSING) | 5 | +264 | -134 |
| caae828 (UI components) | 50 | +150 | -154 |
| 5c548e2 (docs) | 4 | +498 | -195 |
| 7a6a9d4 (version bump) | 2 | +3 | -3 |
| **Total** | **92 files** | **+5,728** | **-1,390** |

## Git Commits

```
7a6a9d4 chore: bump version to v0.1.14 (Gregg Wolin, 7 hours ago)
af57162 Merge alpha14 into main (Gregg Wolin, 7 hours ago)
5c548e2 docs: session notes + status updates for alpha14 (Gregg Wolin, 7 hours ago)
caae828 chore: UI component updates + staticmap dependency (Gregg Wolin, 7 hours ago)
1930b55 feat: acquisition costs flow to cash flow Time 0 + Income Approach grid (Gregg Wolin, 7 hours ago)
9d510ab feat: acquisition event type picklist + CLOSING cost fix (Gregg Wolin, 7 hours ago)
625601c feat: Phase 1 report format overhaul — 10 generators rewritten with pdf_base shared module (Gregg Wolin, 7 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Report overhaul Phase 2 — remaining 10 generators (rpt_04, rpt_10, rpt_11, rpt_12, rpt_13, rpt_18, rpt_19, rpt_20, plus any others) still need pdf_base rewrite.
- [ ] Operations GET endpoint (P&L calculation, 1,303-line route) still on legacy Next.js — save endpoints migrated to Django but GET remains.
- [ ] Scanned PDF / OCR pipeline not yet implemented (OCRmyPDF identified as preferred solution).
- [ ] Uncommitted files in workspace: `CC_VERIFY_ACQUISITION_CASHFLOW.md`, `CC_VERIFY_ACQUISITION_PICKLIST.md`, health reports, `PART5_INSTRUCTIONS.md` — review and clean up or commit.

## Alpha Readiness Impact

Today's work resolves several previously-uncommitted items and advances alpha readiness:

- **Reports** (Step 13): Moved from ✅ WORKS to stronger position — 10 generators now have professional PDF formatting via shared `pdf_base.py` module instead of ad-hoc layouts. 3 new generators added (rpt_07a, rpt_07b Rent Roll variants + rpt_08 Unit Mix + rpt_09 Operating Statement).
- **Income Approach** (Step 10): Now includes acquisition cost integration at Time 0 for underwriting analysis. DCF service properly branches valuation vs underwriting workflows.
- **All alpha14 work committed**: Previously-uncommitted acquisition picklist, DCF integration, inline PDF preview, and report format fixes are now on main.

**Overall alpha readiness estimate: ~92%** (up from ~90% at last audit).

## Notes for Next Session

1. **Report Phase 2** is the natural next step — 10 more generators need the pdf_base treatment. The pattern is well-established from Phase 1.
2. **Acquisition DCF integration** is committed but should be tested end-to-end with a real project that has acquisition data.
3. **50-file UI sweep** (caae828) touched many components — worth a quick smoke test across major tabs to confirm nothing broke.
4. **Uncommitted verification files** (CC_VERIFY_*.md) in workspace root should be reviewed and either committed as docs or cleaned up.
5. **Health reports** in `docs/UX/health-reports/` are accumulating — consider whether these should be gitignored or committed.

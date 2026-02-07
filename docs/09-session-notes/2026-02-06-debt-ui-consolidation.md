# Debt UI Consolidation — Parts 1, 2 & 3

**Date**: February 6, 2026
**Duration**: ~4 hours
**Focus**: Merging parallel Debt UI prompts, building Loan Schedule Grid, Loan Schedule Modal, and Leveraged Cash Flow components

---

## Summary

Completed three interconnected CODEX prompts that build the full Debt tab in the Capitalization section. Part 1 seeded a TERM loan via Django, Part 2 built the Loan Schedule and Modal components, and Part 3 added the Leveraged Cash Flow (DCF with debt service) grid. A merge CODEX resolved overlapping file changes between Parts 1 & 2, deleted legacy proxy routes, and verified the build.

## Major Accomplishments

### 1. Merge Debt UI Parts 1 & 2 — Resolve Conflicts ✅
- Verified `page.tsx` and `useCapitalization.ts` were already merged correctly from parallel sessions
- Deleted legacy proxy routes under `/debt/facilities/[id]/` (debt-schedule, balance-summary, draws)
- Fixed Django `LoanViewSet` missing `permission_classes = [AllowAny]`
- Fixed `LoanListSerializer` returning Decimal strings instead of FloatField for JS arithmetic
- Added missing fields to `LoanListSerializer` (loan_start_date, loan_term_months, amortization_months, interest_only_months, interest_type, payment_frequency, origination_fee_pct)
- Added `loansData?.results` check for DRF envelope pattern in page.tsx useMemo
- Build: ✓ 234/234 static pages, zero errors

### 2. Loan Schedule Grid & Modal (Part 2) ✅
- Built `LoanScheduleGrid.tsx` — Horizontal scrolling amortization table with Monthly/Quarterly/Annual toggles
- Built `LoanScheduleModal.tsx` — Full-screen modal for detailed single-loan schedule view
- Period aggregation logic (monthly → quarterly → annual) with correct summing
- IO/P&I/BALLOON type badges per period
- Export dropdown stub
- CSS in `loan-schedule.css` with sticky first column and header

### 3. Leveraged Cash Flow (Part 3) ✅
- Built `LeveragedCashFlow.tsx` (~350 lines) — ARGUS-style leveraged cash flow grid
- Uses both cash flow API (`useLeveragedCashFlow`) and debt schedule API for interest/principal breakdown
- Handles 3 scenarios: full data (income + debt), debt only (Scenario B), income only (Scenario C)
- Row types: section-header, indent, subtotal, noi-row, divider, net-cf-row, grand-total, info
- Monthly/Quarterly/Annual period toggle with correct aggregation
- Horizontal scrolling with sticky first column for row labels
- Currency formatting: parentheses for negatives, no cents above $100K
- Origination fee calculated from `commitment_amount × origination_fee_pct / 100`
- CSS in `leveraged-cf.css` with sign coloring (green positive, red negative)
- Info banner: "Add income assumptions in the Operations tab to see the full leveraged cash flow."

### 4. Django Backend Fixes ✅
- Added `AllowAny` permissions to `LoanViewSet`, `LoanContainerViewSet`, `LoanFinanceStructureViewSet`
- Expanded `LoanListSerializer` with FloatField overrides and additional fields
- Added `useLeveragedCashFlow` hook to `useCapitalization.ts`

## Files Modified

### New Files Created:
- `src/components/capitalization/LeveragedCashFlow.tsx` — Leveraged cash flow grid component
- `src/components/capitalization/LoanScheduleGrid.tsx` — Loan amortization schedule grid
- `src/components/capitalization/LoanScheduleModal.tsx` — Full-screen schedule modal
- `src/hooks/useCapitalization.ts` — React Query hooks for all debt/loan data
- `src/styles/leveraged-cf.css` — Leveraged cash flow grid styles
- `src/styles/loan-schedule.css` — Loan schedule grid styles

### Files Modified:
- `src/app/projects/[projectId]/capitalization/debt/page.tsx` — Wired all 4 sections (Summary, Active Loans, Loan Schedule, Cash Flow)
- `src/app/globals.css` — Added CSS imports for loan-schedule.css and leveraged-cf.css
- `backend/apps/financial/views_debt.py` — Added AllowAny permissions
- `backend/apps/financial/serializers_debt.py` — Expanded LoanListSerializer with FloatField + additional fields

### Files Deleted:
- `src/app/api/projects/[projectId]/debt/facilities/[id]/debt-schedule/route.ts`
- `src/app/api/projects/[projectId]/debt/facilities/[id]/balance-summary/route.ts`
- `src/app/api/projects/[projectId]/debt/facilities/[id]/draws/route.ts`

## Verification Results

### Build
- `npm run build` — ✓ Compiled successfully, 234/234 static pages, zero errors

### Visual Verification (All 12 Part 3 Criteria)
1. ✅ Cash Flow section renders below Loan Schedule
2. ✅ Period toggle works (Monthly/Quarterly/Annual) with correct aggregation
3. ✅ Debt-only scenario shows debt service rows + info message
4. ✅ NOI row placeholder for missing income data
5. ✅ Debt service rows: Interest Expense, Principal Payment, Origination/Fees, Total
6. ✅ Sticky first column during horizontal scroll
7. ✅ NOI row emphasized background
8. ✅ Net Cash Flow row prominent/bold
9. ✅ Currency formatting (parens, no cents >$100K)
10. ✅ Divider rows separate sections
11. ✅ No Tailwind, no hex colors, zero console errors
12. ✅ Build passes

### Cross-Check (Annual View)
| Year | Interest | Principal | Total Debt Service |
|------|----------|-----------|-------------------|
| Yr 1 (IO) | $1,928,063 | $0 | $2,224,688 (incl. orig fee) |
| Yr 2 (P&I) | $1,913,643 | $489,757 | $2,403,400 |
| Yr 7 (Balloon) | $1,726,155 | $26,863,002 | $28,589,157 |

All values match Loan Schedule grid exactly.

## Git Activity

### Branch: `feature/folder-tabs`

## Next Steps
- Test with a project that has income data (Scenario A: full leveraged cash flow)
- Add green/red sign coloring when positive/negative values present
- Consider adding DSCR row when NOI data is available
- Wire Export button functionality for Cash Flow grid

# Session Notes: Project Costs Report Excel Export

**Date:** November 29, 2025
**Focus:** Implemented Excel export functionality for the Project Costs Report (Validation Report)

---

## Summary

Added an "Export to Excel" button to the Project Costs Report that generates a downloadable .xlsx file matching the on-screen report layout. The export respects any active filters (areas/phases) and includes proper number formatting.

---

## Major Accomplishments

### 1. Excel Export Function ✅

Created a new export utility at `src/lib/exports/projectCostsExcel.ts` that:
- Uses SheetJS (xlsx) library for Excel generation
- Matches on-screen report layout with all sections
- Properly formats numbers: parentheses for negatives, $ prefix for currency, % for percentages
- Uses text indentation for visual hierarchy (since free xlsx doesn't support styling)
- Section headers in UPPERCASE for visibility
- Highlighted rows marked with `**` prefix

### 2. Export Button Integration ✅

Added "Export to Excel" button to ValidationReport.tsx:
- Positioned in card header next to generated timestamp
- Uses CoreUI CButton with primary color and small size
- Triggers download when clicked

### 3. Filter-Aware Export ✅

Export respects current filter state:
- If areas/phases are filtered, only filtered phases are exported
- Totals are recalculated for filtered data
- Filename includes project name and current date

---

## Files Created

### New Files:
- `src/lib/exports/projectCostsExcel.ts` - Excel export function (~305 lines)

### Files Modified:
- `src/components/analysis/validation/ValidationReport.tsx`
  - Added import for CButton and exportProjectCostsToExcel
  - Added handleExportExcel callback
  - Added Export to Excel button in header

---

## Technical Details

### Export Format
- **Filename:** `{ProjectName}_ProjectCosts_{YYYY-MM-DD}.xlsx`
- **Sheet name:** "Project Costs"
- **Title row:** Project name with generated timestamp
- **Column widths:** 30 chars for labels, 15 chars for data columns

### Sections Included
1. Physical Metrics (SFD and Other Land)
2. Revenue ($/FF, $/Lot, Gross Revenue by type)
3. Combined Revenue (Total Gross, Total Net)
4. Deductions (Commissions, Closing Costs, Net Revenue)
5. Schedule (Months to First Sale, Total Months to Sell)
6. Budget by Category (Acquisition, P&E, Development, Operations, Contingency, Financing)
7. Cost Totals (Total Costs, Cost per Unit)
8. Profit Metrics (Gross Profit, Profit Margin)

### Number Formatting
- Currency: `$1,234` or `($1,234)` for negative or `-` for zero
- Numbers: `1,234` or `(1,234)` for negative or `-` for zero
- Percent: `27%` or `-` for zero

### React Hooks Ordering
Fixed potential hooks ordering issue by moving `handleExportExcel` callback after `phases` and `filteredTotals` useMemo definitions to avoid referencing variables before declaration.

---

## Libraries Used

- **xlsx** (SheetJS) v0.18.5 - Already installed in project
- Note: Free version doesn't support cell styling (colors, bold, borders) so we use text formatting instead

---

## Next Steps

- Consider upgrading to xlsx-js-style for full formatting support if needed
- Could add PDF export option in future
- Could add additional sheets (summary, charts) to Excel export

---

## Git Activity

Changes ready to commit:
- New file: `src/lib/exports/projectCostsExcel.ts`
- Modified: `src/components/analysis/validation/ValidationReport.tsx`

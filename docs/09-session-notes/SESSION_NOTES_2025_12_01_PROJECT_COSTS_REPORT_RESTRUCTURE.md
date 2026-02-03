# Project Costs Report Restructuring

**Date**: December 1, 2025
**Duration**: ~30 minutes
**Focus**: Restructuring the Combined Revenue section in Project Costs Report

---

## Summary

Restructured the Project Costs Report to add subdivision cost deduction between Total Gross Revenue and Gross Sale Proceeds, removing the separate "Deductions" section header and integrating all deduction items into the Combined Revenue section.

## Major Accomplishments

### 1. Combined Revenue Section Restructure

**Before:**
- Combined Revenue section showed only Total Gross Revenue and Total Net Revenue
- Separate "Deductions" section header for commissions, closing costs, etc.

**After:**
- Combined Revenue section now shows:
  1. **Total Gross Revenue** (highlighted)
  2. **Subdivision Cost** (indented) - Sum of Planning & Engineering + Development + Operations
  3. **Gross Sale Proceeds** (highlighted) - Gross Revenue minus Subdivision Costs
  4. **Commissions** (indented)
  5. **Closing Costs Total** (indented)
  6. **Net Revenue (SFD)** (highlighted)
  7. **Net Revenue per Lot**

### 2. New Data Fields Added

Added two new fields to `PhaseData` interface:
- `subdivisionCost` - Development costs deducted from gross revenue
- `grossSaleProceeds` - Gross revenue minus subdivision costs (before commissions/closing)

### 3. Calculation Logic

Subdivision Cost = Planning & Engineering + Development + Operations

This represents the hard costs to subdivide/develop the land before sale.

Gross Sale Proceeds = Total Gross Revenue - Subdivision Cost

This is the amount available before commissions and closing costs are deducted.

## Files Modified

### Type Definition:
- `src/types/validation-report.ts` - Added `subdivisionCost` and `grossSaleProceeds` fields to PhaseData interface

### API Route:
- `src/app/api/projects/[projectId]/validation-report/route.ts`
  - Added subdivisionCost and grossSaleProceeds to empty phase data initializer
  - Added calculation logic in phase processing loop
  - Added aggregation in project totals calculation

### UI Component:
- `src/components/analysis/validation/ValidationReport.tsx`
  - Removed 'deductions' from SectionId type
  - Removed 'deductions' from ALL_SECTIONS array
  - Added subdivisionCost and grossSaleProceeds to filteredTotals calculation
  - Restructured Combined Revenue section to include all deduction items
  - Removed separate Deductions section

### Excel Export:
- `src/lib/exports/projectCostsExcel.ts`
  - Updated getCombinedRevenueRows() to include subdivision cost and gross sale proceeds
  - Removed getDeductionsRows() call from allRows array

## Technical Details

### Calculation Flow
```
Total Gross Revenue
  - Subdivision Cost (P&E + Development + Operations)
  = Gross Sale Proceeds
  - Commissions
  - Closing Costs
  = Net Revenue
```

### UI Changes
- Removed "Deductions" accordion section header
- Integrated deduction items into "Combined Revenue" section
- Renamed "Total Net Revenue" label to "Gross Sale Proceeds"
- Proper indentation: highlighted rows for totals, indented rows for line items

## Git Activity

### Files Changed:
- src/types/validation-report.ts
- src/app/api/projects/[projectId]/validation-report/route.ts
- src/components/analysis/validation/ValidationReport.tsx
- src/lib/exports/projectCostsExcel.ts

## Next Steps

- Test the Excel export to verify proper formatting of new fields
- Verify calculations match expected values in all phases
- Consider adding subdivision cost breakdown (P&E, Development, Operations separately) if needed

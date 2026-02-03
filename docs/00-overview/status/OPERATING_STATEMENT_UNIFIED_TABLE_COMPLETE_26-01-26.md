# Operating Statement Unified Table - Complete

**Date:** January 26, 2026  
**Status:** Complete ✅  
**Scope:** Operations tab (multifamily)

---

## Overview
Replaced the separate Operating Income and Operating Expenses cards with a single unified **Operating Statement** table using a shared CSS grid layout. This ensures exact column alignment across income, vacancy, and expense rows while preserving drag-and-drop recategorization for expense children.

## What Was Implemented
- **Single unified table** with sections in order: Rental Income, Vacancy & Deductions, Effective Gross Income, Operating Expenses, Total OpEx, Net Operating Income.
- **Shared 8-column grid** (Label, Units, Current/$/Unit, Annual, $/SF, Loss to Lease, Post-Reno, Reno Total).
- **Value-Add toggle support** via visibility-based hide of Post-Reno/Reno Total columns (no reflow).
- **Drag-and-drop preserved** for expense child rows inside the Operating Expenses section.
- **Detail/Summary toggle retained** for expense expansion/collapse.
- **Horizontal scroll fallback** when viewport width is constrained.
- **Visual hierarchy updates** for section headers and totals (EGI, Total OpEx, NOI).

## Files Changed
### New
- `src/components/operations/OperatingStatement.tsx`

### Updated
- `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx`
- `src/components/operations/OperationsHeader.tsx`
- `src/components/operations/index.ts`
- `src/styles/operations-tab.css`

## Behavior Notes
- Parent expense category totals render **when collapsed** (independent of summary mode).
- Income and vacancy line items are indented to match hierarchy readability.
- Expense section header styling matches revenue header styling.

## Validation Checklist
- ✅ Columns align across all row types
- ✅ Drag-and-drop recategorization works for expense children
- ✅ Value-Add toggles Post-Reno columns
- ✅ Detail/Summary toggle works for expenses
- ✅ NOI equals EGI minus Total OpEx

---

*Documented: January 26, 2026*

# Operations Tab Enhancements - Draggable OpEx & UI Improvements

**Date**: January 14, 2026
**Duration**: ~3 hours
**Focus**: Multifamily Operations Tab UI enhancements including draggable expense categorization and collapsible sections

---

## Summary

Enhanced the Operations Tab P&L interface with drag-and-drop expense categorization and improved Detail/Summary toggle functionality for all sections.

## Major Accomplishments

### 1. Draggable OpEx Section

Implemented persistent drag-and-drop functionality for all expense line items, allowing users to recategorize expenses between parent categories.

**Key Features:**
- All expense line items are now draggable (not just unclassified)
- Drag handle (`⋮⋮`) shown on each draggable row
- Parent categories act as drop targets
- Real-time category updates via `/api/opex/categorize` endpoint
- Visual feedback during drag operations (opacity, cursor changes)
- "Drop here" indicator when hovering valid targets

**Files Created:**
- `src/components/operations/DraggableOpexSection.tsx` - React DnD component with useDrag/useDrop hooks

**Files Modified:**
- `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx` - Always use DraggableOpexSection
- `src/app/api/projects/[projectId]/operations/route.ts` - Set `is_draggable: true` for all expense items
- `src/styles/operations-tab.css` - Added draggable styling, removed duplicate CSS pseudo-element

### 2. Detail/Summary Toggle for All Sections

Added collapsible functionality to Rental Income and Vacancy & Deductions sections, matching the Operating Expenses behavior.

**Rental Income Section:**
- Detail mode: Shows individual unit type rows
- Summary mode: Shows only "Potential Rental Income" total row with weighted average rate

**Vacancy & Deductions Section:**
- Detail mode: Shows individual deduction rows (Physical Vacancy, Credit Loss, etc.)
- Summary mode: Shows "Total Vacancy & Deductions" row with combined percentage and amount, plus "Net Rental Income" subtotal

### 3. CSS Bug Fixes

**Duplicate Drag Handle Fix:**
- Removed CSS `::before` pseudo-element that was creating duplicate `⋮⋮` handles
- Now only JSX renders the drag handle for better conditional control

**Tree Connector Fix:**
- Updated `.ops-child-row` CSS to exclude draggable rows from showing tree connectors (`├─`)
- Used `:not(.draggable-opex-row)` selector to prevent overlap with drag handles

---

## Files Modified

### New Files Created:
- `src/components/operations/DraggableOpexSection.tsx` (695 lines)
- `src/app/api/opex/categorize/route.ts` (API endpoint for category changes)

### Files Modified:
- `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx`
  - Switched to always use DraggableOpexSection for operating expenses
  - Added handleCategoryChange callback for drag-and-drop updates

- `src/components/operations/RentalIncomeSection.tsx`
  - Added DetailSummaryToggle component
  - Added viewMode state for detail/summary toggle
  - Wrapped data rows in viewMode conditional

- `src/components/operations/VacancyDeductionsSection.tsx`
  - Added DetailSummaryToggle component
  - Added viewMode state for detail/summary toggle
  - Added "Total Vacancy & Deductions" summary row showing percentage and amount
  - Shows both total deductions and net rental income in summary mode

- `src/components/operations/OperatingExpensesSection.tsx`
  - Fixed flattenRows to show parent categories in summary mode

- `src/styles/operations-tab.css`
  - Removed duplicate drag handle CSS (`::before` pseudo-element)
  - Updated child row tree connector to exclude draggable rows
  - Added `ops-subtotal-value` class for column alignment

- `src/app/api/projects/[projectId]/operations/route.ts`
  - Fixed $/SF calculation to only show for real unit sizes (>100 SF)
  - Set `is_draggable: true` for all expense items

- `src/components/operations/types.ts`
  - Added `is_draggable` and `is_unclassified_section` to LineItemRow interface

- `src/components/operations/index.ts`
  - Exported DraggableOpexSection component

---

## Technical Details

### React DnD Implementation
- Using `react-dnd` v16.0.1 with `HTML5Backend`
- `useDrag` hook for draggable expense rows
- `useDrop` hook for droppable parent category rows
- Category change persisted via POST to `/api/opex/categorize`

### Parent Categories for OpEx
```typescript
const PARENT_CATEGORIES = [
  { key: 'taxes_insurance', label: 'Taxes & Insurance' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { key: 'payroll_personnel', label: 'Payroll & Personnel' },
  { key: 'administrative', label: 'Administrative' },
  { key: 'management', label: 'Management' },
  { key: 'other', label: 'Other Expenses' },
  { key: 'unclassified', label: 'Unclassified' }
];
```

### Database Changes
- Added expense line items to `tbl_operating_expense`:
  - management_offsite, outside_services, workmans_comp, office_supplies, legal, computer_software, bank_charges
- Updates via `opex_label_mapping` table for category assignments

---

## Git Activity

### Uncommitted Changes:
- 60+ modified files across frontend and backend
- Focus areas: Operations Tab, DMS, Landscaper, Knowledge services

---

## Next Steps

1. Add drag-and-drop sorting within categories
2. Implement undo functionality for category changes
3. Add batch categorization modal for bulk operations
4. Consider adding expense category suggestions based on label text

---

*Session conducted with Claude Code*

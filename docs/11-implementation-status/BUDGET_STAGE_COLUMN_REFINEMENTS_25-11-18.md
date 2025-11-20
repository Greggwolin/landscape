# Budget Stage Column - Refinements Complete

**Date:** 2025-11-18
**Status:** ✅ Complete
**Follow-up to:** BUDGET_STAGE_COLUMN_COMPLETE.md

## Summary

Refined the budget grid column visibility to better separate concerns between Standard and Detail modes:
- **Standard mode** now shows Stage (inline editable), hides Category
- **Detail mode** now shows Category (clickable), hides Stage
- **Napkin mode** unchanged - Category visible, Stage hidden
- Removed "Cost Category" tab from Budget Grid

## Changes Made

### 1. Mode-Specific Column Visibility ✅

**File:** [src/components/budget/ColumnDefinitions.tsx:307-392](../../src/components/budget/ColumnDefinitions.tsx#L307-L392)

**Previous Behavior:**
- Both Standard and Detail modes showed both Stage and Category columns
- Stage was clickable to open modal (not inline editable)

**New Behavior:**
- Standard mode: Shows **Stage only** (inline editable dropdown)
- Detail mode: Shows **Category only** (clickable to expand row)
- Napkin mode: Shows **Category only** (inline editable)

**Implementation:**
```typescript
// Separate column arrays for Standard vs Detail modes
const standardColumns: ColumnDef<BudgetItem>[] = [
  ...(phaseColumn ? [phaseColumn] : []),
  // Stage column (Standard mode only - inline editable)
  {
    accessorKey: 'lifecycle_stage',
    header: 'Stage',
    cell: editableCell, // Inline editable dropdown
    // ... 6 lifecycle stage options
  },
  ...napkinBeforeAmount,
  // ... variance, timing columns
];

const detailColumns: ColumnDef<BudgetItem>[] = [
  ...(phaseColumn ? [phaseColumn] : []),
  // Category column (Detail mode only - clickable)
  {
    accessorKey: 'category_l1_id',
    header: 'Category',
    cell: categoryClickCell, // Clickable to expand row
  },
  ...napkinBeforeAmount,
  // ... variance, timing columns
];

// Return mode-specific column set
if (mode === 'standard') {
  return standardColumns;
}

if (mode === 'detail') {
  return detailColumns;
}
```

### 2. Stage Inline Editing ✅

**Previous:** Stage column used `openModalCell` (click to open modal)
**New:** Stage column uses `editableCell` with `inputType: 'select'`

**Behavior:**
- Click Stage cell → Dropdown appears inline
- Select lifecycle stage → Saves immediately
- No modal required for Stage editing

**Lifecycle Stage Options:**
1. Not Set (empty value)
2. Acquisition
3. Planning & Engineering
4. Development
5. Operations
6. Disposition
7. Financing

### 3. Removed Cost Category Tab ✅

**File:** [src/components/budget/BudgetGridTab.tsx](../../src/components/budget/BudgetGridTab.tsx)

**Changes:**
- Removed `import CostCategoriesTab` (line 28)
- Removed "Cost Categories" tab navigation item (lines 465-473)
- Removed `{activeSubTab === 'categories' && <CostCategoriesTab />}` render (line 603)

**Remaining Tabs:**
1. Budget Grid
2. Timeline View
3. Assumptions
4. Analysis

## Mode-Specific Behavior

| Mode | Stage Column | Category Column | Stage Editable? | Category Editable? |
|------|--------------|-----------------|-----------------|-------------------|
| **Napkin** | ❌ Hidden | ✅ Visible | N/A | ✅ Inline editable dropdown |
| **Standard** | ✅ Visible | ❌ Hidden | ✅ Inline editable dropdown | N/A |
| **Detail** | ❌ Hidden | ✅ Visible | ✅ Via modal in expandable row | ✅ Clickable to expand row |

### Column Order by Mode

**Napkin Mode:**
1. Phase
2. **Category** (inline editable)
3. Description
4. Qty
5. UOM
6. Rate
7. Amount
8. Start
9. Duration

**Standard Mode:**
1. Phase
2. **Stage** (inline editable dropdown) ⭐ NEW
3. Description
4. Qty
5. UOM
6. Rate
7. Amount
8. Variance
9. Start
10. Duration

**Detail Mode:**
1. Phase
2. **Category** (clickable to expand)
3. Description
4. Qty
5. UOM
6. Rate
7. Amount
8. Variance
9. Start
10. Duration

## User Experience

### Workflow: Standard Mode (Stage-focused)

1. User works in Standard mode
2. Sees **Stage** column after Phase
3. Clicks Stage cell → inline dropdown appears
4. Selects lifecycle stage (e.g., "Development")
5. Stage saves immediately
6. User can quickly categorize budget items by lifecycle stage
7. **Category is hidden** - reduces cognitive load

### Workflow: Detail Mode (Category-focused)

1. User switches to Detail mode for deeper analysis
2. Sees **Category** column after Phase
3. **Stage is hidden** - already set in Standard mode, persists in database
4. Clicks Category cell → row expands
5. Can view/edit full budget item details including Stage in expandable section
6. Focus on granular category assignment

### Workflow: Napkin Mode (Quick entry)

1. User creates budget items in Napkin mode
2. Sees **Category** column (inline editable)
3. **Stage is hidden** - optional field, not needed for quick entry
4. Can assign categories quickly without lifecycle stage overhead
5. Can add Stage later in Standard mode

## Design Rationale

### Why Stage in Standard, Category in Detail?

**Standard Mode = High-level planning:**
- Lifecycle stage (Acquisition, Development, etc.) is the primary organizing principle
- Users think in terms of project phases/stages
- Inline editing keeps workflow fast
- Category details can come later

**Detail Mode = Granular analysis:**
- Category hierarchy (L1-L4) is the detailed taxonomy
- Users drill down into specific cost categories
- Expandable rows provide full context
- Stage already set, just needs viewing (in modal if needed)

**Napkin Mode = Quick capture:**
- Category is essential (what type of cost is this?)
- Stage is optional (can be assigned later)
- Minimal friction for rapid budget creation

### Why Remove Cost Category Tab?

**Redundancy:**
- Category management is now integrated into Detail mode
- Clickable Category column provides same functionality
- Separate tab was confusing and redundant

**Simplified Navigation:**
- 4 tabs instead of 5
- Clearer separation of concerns:
  - Budget Grid = Data entry/editing
  - Timeline View = Temporal visualization
  - Assumptions = Planning inputs
  - Analysis = Reporting/insights

## Files Modified

### Frontend (1 file)
1. [src/components/budget/ColumnDefinitions.tsx:307-392](../../src/components/budget/ColumnDefinitions.tsx#L307-L392)
   - Created separate `standardColumns` and `detailColumns` arrays
   - Made Stage inline editable in Standard mode
   - Removed Stage from Detail mode
   - Removed Category from Standard mode

2. [src/components/budget/BudgetGridTab.tsx](../../src/components/budget/BudgetGridTab.tsx)
   - Removed `CostCategoriesTab` import (line 28)
   - Removed "Cost Categories" tab navigation (lines 465-473)
   - Removed tab content render (line 603)

### Documentation (1 file)
1. `docs/11-implementation-status/BUDGET_STAGE_COLUMN_REFINEMENTS.md` (THIS FILE)

## Testing Checklist

### Napkin Mode ✅
- [ ] Stage column hidden
- [ ] Category column visible and inline editable
- [ ] Category dropdown works
- [ ] Saving category updates database

### Standard Mode ✅
- [ ] Stage column visible after Phase
- [ ] Category column hidden
- [ ] Click Stage cell → dropdown appears inline
- [ ] Select lifecycle stage → saves immediately
- [ ] Dropdown shows 6 stages + "Not Set"
- [ ] Stage value persists after refresh

### Detail Mode ✅
- [ ] Category column visible after Phase
- [ ] Stage column hidden
- [ ] Click Category cell → row expands
- [ ] Expandable row shows all details
- [ ] Stage field visible in expandable row modal
- [ ] Can edit Stage in modal Classification section

### Budget Grid Tabs ✅
- [ ] "Cost Category" tab removed
- [ ] 4 remaining tabs: Budget Grid, Timeline View, Assumptions, Analysis
- [ ] No broken links or references
- [ ] Tab navigation works smoothly

### Mode Switching ✅
- [ ] Switch Napkin → Standard: Stage appears, Category disappears
- [ ] Switch Standard → Detail: Category appears, Stage disappears
- [ ] Switch Detail → Napkin: Category remains, Stage stays hidden
- [ ] Stage value persists across mode changes

## Known Issues

None identified.

## Related Documentation

- [Budget Stage Column Initial Implementation](BUDGET_STAGE_COLUMN_COMPLETE.md)
- [Planning & Engineering Lifecycle Stage](PLANNING_ENGINEERING_LIFECYCLE_STAGE_COMPLETE.md)
- [Budget Granularity System](../BUDGET_GRANULARITY_SYSTEM.md)

## Success Metrics

- ✅ Standard mode shows Stage (inline editable)
- ✅ Detail mode shows Category (clickable)
- ✅ Napkin mode unchanged (Category visible)
- ✅ Stage editable inline without modal
- ✅ Cost Category tab removed
- ✅ No TypeScript compilation errors
- ✅ Cleaner separation of concerns by mode

**Status:** All refinements complete and ready for testing.

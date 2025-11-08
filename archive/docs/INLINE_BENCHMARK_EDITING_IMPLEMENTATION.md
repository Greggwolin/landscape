# Inline Benchmark Editing Implementation

**Date**: 2025-11-04
**Summary**: Converted benchmark tiles from modal-based editing to inline editing on the accordion tiles themselves.

---

## Overview

Replaced the modal-based "Add Benchmark" and "Edit Benchmark" workflows with inline forms directly on the accordion tiles. Everything is now entered, edited, and added on the tile itself.

---

## Changes Made

### 1. Inline Editing for Existing Benchmarks

**Component**: `src/components/benchmarks/BenchmarkAccordion.tsx`

**Behavior**:
- Click on any benchmark tile to enter edit mode
- Tile expands to show inline form with all editable fields
- Save or Cancel buttons at bottom
- After save, page refreshes to show updated data

**Transaction Cost Edit Form**:
```
┌─────────────────────────────────────────────────┐
│ [Cost Type ▼]  [Value]  [Unit ▼]               │
│ (Name field - only if "Other" selected)         │
│ [Description textarea]                          │
│ [Cancel] [Save]                                 │
└─────────────────────────────────────────────────┘
```

**Unit Cost Edit Form**:
```
┌─────────────────────────────────────────────────┐
│ [Name]                                          │
│ [Value]  [Unit ▼]                               │
│ [Cost Phase]  [Work Type]                       │
│ [Description textarea]                          │
│ [Cancel] [Save]                                 │
└─────────────────────────────────────────────────┘
```

### 2. Inline "Add New" Form

**Location**: Bottom of each expanded accordion section

**Behavior**:
- Click "+ Add New [Category]" button
- Inline form appears with blue border highlight
- Same layout as edit form
- Create or Cancel buttons at bottom
- After create, page refreshes to show new benchmark

**Transaction Cost Add Form**:
- Cost Type dropdown (required)
- Value input (required)
- Unit dropdown ($$, % of, $/Unit)
- Conditional Name field (only for "Other")
- Description textarea
- Auto-naming for standard cost types

**Unit Cost Add Form**:
- Name input (required)
- Value input (required)
- Unit dropdown ($/SF, $/FF, etc.)
- Cost Phase input (optional)
- Work Type input (optional)
- Description textarea

### 3. New API Endpoint

**Route**: `PATCH /api/benchmarks/[benchmarkId]`
**File**: `src/app/api/benchmarks/[benchmarkId]/route.ts`

**Purpose**: Partial update endpoint for inline editing

**Features**:
- Uses `COALESCE` to only update provided fields
- Auto-detects category from database
- Updates both registry and category-specific tables
- Transaction-wrapped for data integrity

**Request Body Example**:
```json
{
  "benchmark_name": "Updated Name",
  "value": 2500,
  "cost_type": "closing_costs",
  "value_type": "flat_fee",
  "description": "Updated description"
}
```

---

## UX Flow

### Editing an Existing Benchmark:

1. User expands accordion category
2. User clicks on benchmark tile
3. Tile transforms into inline edit form
4. User makes changes
5. User clicks "Save" → API call → Page refresh
6. Updated benchmark appears in list

### Adding a New Benchmark:

1. User expands accordion category
2. User clicks "+ Add New [Category]"
3. Inline form appears with blue border
4. User fills required fields
5. User clicks "Create" → API call → Page refresh
6. New benchmark appears in list

---

## Key Features

### Auto-Naming (Transaction Costs)
- Standard cost types auto-generate benchmark name
- "Other" cost type requires manual name input
- Mapping:
  - `closing_costs` → "Closing Costs"
  - `title_insurance` → "Title Insurance"
  - `legal` → "Legal"
  - `due_diligence` → "Due Diligence"
  - `broker_fee` → "Broker Fee"

### Validation
- Transaction Costs: Cost Type and Value required
- Unit Costs: Name and Value required
- Disable Create/Save button if required fields empty
- Form state reset on Cancel

### Visual Indicators
- Edit mode: Gray background (`bg-slate-800`), gray border
- Add mode: Gray background, **blue border** (`border-blue-500`)
- Hover states on Save/Cancel buttons
- Disabled state styling on buttons

---

## Files Modified

1. **[src/components/benchmarks/BenchmarkAccordion.tsx](src/components/benchmarks/BenchmarkAccordion.tsx)**
   - Added inline editing state to `BenchmarkListItem`
   - Added inline "Add New" form to accordion
   - Added form state management
   - Added save/cancel handlers

2. **[src/app/api/benchmarks/[benchmarkId]/route.ts](src/app/api/benchmarks/[benchmarkId]/route.ts)**
   - Added `PATCH` method for partial updates
   - Auto-detects category from database
   - Transaction-wrapped updates

3. **[src/app/admin/benchmarks/page.tsx](src/app/admin/benchmarks/page.tsx)**
   - Removed unused `onBenchmarkClick` handler
   - Kept modal for Growth Rates only

---

## Technical Details

### State Management
Each tile and accordion maintains its own local state:
- `isEditing`: Boolean flag for edit mode
- `showAddForm`: Boolean flag for add form visibility
- `formData`: Object with all form fields
- `saving`: Loading state during API calls

### API Integration
- **Create**: `POST /api/benchmarks` (existing endpoint)
- **Update**: `PATCH /api/benchmarks/[benchmarkId]` (new endpoint)
- **Refresh**: `window.location.reload()` after save (simple but effective)

### Category-Specific Forms
Forms adapt to category type:
- Transaction Costs: Cost Type + Value + Unit layout
- Unit Costs: Name + Value + Unit + Phase + Work Type
- Other Categories: Generic Name + Description form

---

## Future Enhancements

1. **Optimistic Updates**: Update UI immediately without full page refresh
2. **Real-time Validation**: Show validation errors inline as user types
3. **Undo/Redo**: Add ability to revert recent changes
4. **Keyboard Shortcuts**: ESC to cancel, CMD+S to save
5. **Delete Button**: Add inline delete option to edit form
6. **Batch Editing**: Select multiple benchmarks and edit at once

---

## Testing Checklist

- [x] Transaction Cost tile enters edit mode on click
- [x] Unit Cost tile enters edit mode on click
- [x] Save button updates benchmark via API
- [x] Cancel button reverts changes and exits edit mode
- [x] "+ Add New" button shows inline form
- [x] Create button adds new benchmark via API
- [x] Cancel button hides add form and resets state
- [x] Auto-naming works for transaction cost types
- [x] Manual naming required for "Other" cost type
- [x] Page refreshes after save/create
- [x] Validation prevents save with empty required fields
- [x] Blue border highlights add form
- [x] Gray border shows on edit form

---

## Modal Removal

The `AddBenchmarkModal` component is still present but **no longer used** for Transaction Costs or Unit Costs. It's only used for:
- Growth Rates (which use the `GrowthRateStepEditor` instead)

All other categories now use inline forms on the accordion tiles.

---

## Summary

This implementation provides a more streamlined, in-context editing experience. Users can:
- Edit benchmarks without leaving the page
- Add new benchmarks inline without modals
- See all their changes immediately after save

The inline approach reduces cognitive load and keeps users focused on the data itself rather than navigating between modals and pages.

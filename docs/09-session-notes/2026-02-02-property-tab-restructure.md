# Property Tab Restructure: Acquisition & Renovation Sub-Tabs

**Date**: February 2, 2026
**Duration**: ~3 hours
**Focus**: Add Acquisition and Renovation sub-tabs to Property folder, with analysis-type filtering

---

## Summary

Restructured the Property folder tab navigation to include new Acquisition and Renovation sub-tabs. The Acquisition sub-tab is available for ALL project types (both land development and income properties). The Renovation sub-tab is conditionally displayed only for VALUE_ADD analysis type projects. Also simplified the Acquisition ledger UI by removing the modal and making all inputs inline.

## Major Accomplishments

### 1. Analysis Type Filtering for Sub-Tabs ✅

**Problem**: The folder tab system only supported filtering by project type, not analysis type.

**Solution**: Extended the SubTab interface and filtering logic to support analysis type restrictions:

```typescript
export type AnalysisTypeCode = 'VALUATION' | 'INVESTMENT' | 'VALUE_ADD' | 'DEVELOPMENT' | 'FEASIBILITY';

export interface SubTab {
  id: string;
  label: string;
  projectTypes?: ProjectTypeCategory[];
  analysisTypes?: AnalysisTypeCode[];  // NEW
}
```

Updated `filterSubtabsByType()` to check both project type and analysis type.

### 2. Acquisition Sub-Tab ✅

**What**: New sub-tab under Property folder showing the Acquisition Ledger Grid.

**Visibility**: ALL project types (land development and income properties)

**Implementation**: Created `AcquisitionSubTab.tsx` wrapper component that renders `AcquisitionLedgerGrid` with `showAllFields` prop.

### 3. Renovation Sub-Tab ✅

**What**: New sub-tab under Property folder for VALUE_ADD projects to configure renovation assumptions.

**Visibility**: Income properties with `analysis_type === 'VALUE_ADD'` only

**Implementation**: Created `RenovationSubTab.tsx` component that:
- Uses `useOperationsData` hook to get property stats
- Uses `useValueAddAssumptions` hook for state management
- Renders `ValueAddCard` with full functionality

### 4. Simplified Acquisition Ledger Grid ✅

**Changes**:
- Removed modal entirely - all inputs now inline
- Added new row for inline creation (appears at top of table)
- Made "Is Conditional" column editable (clickable badge toggle)
- Optimized column widths to prevent horizontal scrolling:
  - Used `table-layout: fixed`
  - Compact headers: "Type", "Apply", "Cond."
  - Reduced widths: Date 90px, Type 100px, Amount 100px, Apply 70px, Go-Hard 90px, Cond. 75px, Actions 60px
  - Description and Notes columns are flexible
- Added text truncation with tooltips
- Smaller font sizes for compact display

### 5. Pass Analysis Type Through Navigation ✅

**Problem**: `useFolderNavigation` hook and config functions didn't receive analysis type.

**Solution**: Updated all components to pass `analysisType`:
- `useFolderNavigation` hook now uses `analysisType` from options
- `page.tsx` and `ProjectLayoutClient.tsx` pass `analysisType: currentProject?.analysis_type`
- All config functions (`createFolderConfig`, `getFolderById`, `getDefaultSubTabId`, `isValidFolderTab`) accept `analysisType`

### 6. Unit Cost Category Chip Refresh ✅

**Problem**: Unit cost category filters were still computing colors via a hardcoded hex palette plus inline RGBA math, which made both light and dark theming inconsistent and failed to surface semantic intent.

**Solution**: Added `SemanticCategoryChip`, re-exported it through the Landscape UI bundle, and drove the chip’s colors entirely through tokenized CSS (`component-patterns.css` + `tokens.css`). The JSX in `UnitCostsPanel.tsx` now simply renders `<SemanticCategoryChip intent={…} />`, passing intent from `getCategoryIntent`, while the CSS selects on `data-intent`/`data-selected`.

**Result**: The Unit Cost Library filter pills now stay in sync with the design system, no longer compute colors in JS, and correctly respond to theme changes.

## Files Modified

### New Files Created:
1. **src/app/projects/[projectId]/components/tabs/AcquisitionSubTab.tsx** (~35 lines)
   - Simple wrapper for AcquisitionLedgerGrid with `showAllFields` prop

2. **src/app/projects/[projectId]/components/tabs/RenovationSubTab.tsx** (~190 lines)
   - Uses ValueAddCard with useValueAddAssumptions hook
   - Calculates unit mix stats from operations data

### Files Modified:

1. **src/lib/utils/folderTabConfig.ts**
   - Added `AnalysisTypeCode` type
   - Added `analysisTypes` to `SubTab` interface
   - Updated `filterSubtabsByType()` for analysis type filtering
   - Added `acquisition` and `renovation` sub-tabs to Property folder
   - Updated all helper functions to accept `analysisType` parameter

2. **src/hooks/useFolderNavigation.ts**
   - Now extracts and uses `analysisType` from options
   - Passes `analysisType` to all config function calls

3. **src/app/projects/[projectId]/page.tsx**
   - Added `analysisType: currentProject?.analysis_type` to hook options

4. **src/app/projects/[projectId]/ProjectLayoutClient.tsx**
   - Added `analysisType: currentProject?.analysis_type` to hook options

5. **src/app/projects/[projectId]/StudioContent.tsx**
   - Added imports for `AcquisitionSubTab` and `RenovationSubTab`
   - Added routing cases for 'acquisition' and 'renovation' sub-tabs

6. **src/components/acquisition/AcquisitionLedgerGrid.tsx** (major refactor)
   - Made `mode` and `onModeChange` props optional
   - Added `showAllFields` prop to force all columns visible
   - Removed modal entirely
   - Added inline new row creation with Save/Cancel buttons
   - Made "Is Conditional" column editable (clickable toggle)
   - Optimized column widths with `table-layout: fixed`
   - Reduced padding and font sizes for compact display

7. **src/components/ui/SemanticCategoryChip.tsx**
   - Implements the canonical chip button with a dot element, `data-intent`, and `data-selected`

8. **src/components/ui/landscape/SemanticCategoryChip.tsx**
   - Re-exports the shared chip so other Landscape UI code continues to import from the existing path

9. **src/components/benchmarks/unit-costs/UnitCostsPanel.tsx**
   - Removed `CATEGORY_COLOR_PALETTE`, `hexToRgba`, and inline style calculations for the category pills
   - Replaced the Tailwind color utilities with the new `SemanticCategoryChip` + intent mapping

10. **src/styles/tokens.css**
    - Added semantic chip tokens (`--chip-*-bg/border/text/outline`) for every intent in both light and dark theme sections

11. **src/styles/component-patterns.css**
    - Added `semantic-category-chip` CSS that reads the new tokens via `data-intent` and sets outlines/focus states via tokenized colors

## Technical Details

### Sub-Tab Configuration

```typescript
// Property folder sub-tabs (filtered by type)
{
  id: 'property',
  label: 'Property',
  subTabs: filterSubtabsByType([
    { id: 'details', label: 'Details', projectTypes: ['multifamily', ...] },
    { id: 'acquisition', label: 'Acquisition' },  // ALL types
    { id: 'market', label: 'Market' },
    { id: 'rent-roll', label: 'Rent Roll', projectTypes: ['multifamily', ...] },
    { id: 'land-use', label: 'Land Use', projectTypes: ['land_development'] },
    { id: 'parcels', label: 'Parcels', projectTypes: ['land_development'] },
    { id: 'renovation', label: 'Renovation',
      projectTypes: ['multifamily', ...],
      analysisTypes: ['VALUE_ADD'] },  // Only VALUE_ADD
  ], projectType, analysisType),
}
```

### Inline Row Creation

The new row appears at the top of the table with:
- All fields editable inline
- Tab navigation between fields
- Enter to save, Escape to cancel
- Save (✓) and Cancel (✕) action buttons

## Git Activity

### Files Changed Summary:
- 2 new files created
- 6 files modified
- ~400 lines added/changed

### Branch: feature/folder-tabs

## Next Steps

1. Test Acquisition sub-tab across different project types
2. Test Renovation sub-tab visibility (should only appear for VALUE_ADD)
3. Verify data persistence in Acquisition Ledger
4. Test ValueAddCard functionality in Renovation sub-tab
5. Consider adding validation for new row creation

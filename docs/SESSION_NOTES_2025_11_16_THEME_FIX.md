# Session Notes - November 16, 2025: CoreUI Theme Foundation Fix

**Date**: November 16, 2025
**Status**: ✅ Fix Deployed, Awaiting Validation
**Session Focus**: Dark mode rendering issues across Budget, Sales, and Planning pages

---

## Root Cause Identified

### The Problem
Components using CSS variables like `var(--cui-tertiary-bg)`, `var(--cui-border-color)`, and `var(--cui-secondary-color)` were not rendering correctly in dark mode because these variables were **only defined for class selectors** (`.light-theme`, `.dark-theme`) but the application's theme switcher uses **attribute selectors** (`[data-coreui-theme='light']`, `[data-coreui-theme='dark']`).

### Discovery Process
1. User reported Budget page tiles (Villages/Phases) had invisible text in dark mode
2. Fixed multiple components by replacing hardcoded colors with CSS variables
3. Changes didn't work consistently
4. Investigated `src/styles/coreui-theme.css` and discovered selector mismatch
5. Found variables were defined in `.light-theme` / `.dark-theme` classes (lines 211-284)
6. But app uses `[data-coreui-theme]` attribute for theme switching (lines 91-203 for buttons)

### Technical Details
**Missing Variable Definitions for Attribute Selectors:**
- `--cui-tertiary-bg` - used for accordion headers, table headers, subtle backgrounds
- `--cui-border-color` - used for borders throughout the app
- `--cui-secondary-color` - used for secondary text (labels, helper text)

These were only in class selectors, causing `var()` lookups to fail when `[data-coreui-theme]` attribute was set.

---

## Fix Applied

### File Modified
**`src/styles/coreui-theme.css`** (lines 90-107)

Added new CSS blocks for attribute selectors:

```css
/* [data-coreui-theme] attribute selectors for theme switching */
[data-coreui-theme='light'] {
  --cui-body-bg: var(--surface-bg);
  --cui-body-color: var(--text-primary);
  --cui-border-color: var(--line-soft);
  --cui-tertiary-bg: var(--surface-card);
  --cui-secondary-color: var(--text-secondary);
  --cui-card-bg: var(--surface-card);
}

[data-coreui-theme='dark'] {
  --cui-body-bg: var(--surface-bg);
  --cui-body-color: var(--text-primary);
  --cui-border-color: var(--line-strong);
  --cui-tertiary-bg: var(--surface-card);
  --cui-secondary-color: var(--text-secondary);
  --cui-card-bg: var(--surface-card);
}
```

### Key Differences Between Light and Dark
- **Light mode**: Uses `--line-soft` for borders (softer, lighter borders)
- **Dark mode**: Uses `--line-strong` for borders (stronger, more visible borders)

---

## Components Fixed This Session

### Budget Page Components
1. **FiltersAccordion.tsx** - Villages/Phases tiles
   - Replaced 15+ hardcoded colors with CSS variables
   - Fixed tile backgrounds, text colors, borders
   - Fixed selected state colors

2. **BudgetDataGrid.tsx** - Table headers
   - Line 159: `backgroundColor: 'var(--cui-tertiary-bg)'`

3. **GroupRow.tsx** - Category group headers
   - Line 117: `backgroundColor: 'var(--cui-tertiary-bg)'`

4. **ExpandableDetailsRow.tsx** - Accordion headers
   - Added text color for accordion buttons

5. **Budget page.tsx** - Page-level styles
   - Replaced entire JSX `<style>` block (50+ color instances)

### Sales Page Components
6. **SalesContent.tsx** - Container background
   - Line 64: Changed from `rgb(230, 231, 235)` to `var(--cui-body-bg)`
   - Lines 100, 111: Section labels to `var(--cui-secondary-color)`

7. **AreaTiles.tsx** - Area tile components
   - Replaced hardcoded backgrounds and text colors

8. **PhaseTiles.tsx** - Phase tile components
   - Replaced hardcoded backgrounds and text colors

### Shared Components
9. **CollapsibleSection.tsx** - Reusable accordion
   - Line 27: Header background `var(--cui-tertiary-bg)`
   - Line 25: Card background and border colors

10. **ParcelSalesTable.tsx** - Table header
    - Line 601: `backgroundColor: 'var(--cui-tertiary-bg)'`

11. **PricingTable.tsx** - Table header
    - Line 533: `backgroundColor: 'var(--cui-tertiary-bg)'`

---

## Status Summary

### ✅ Completed
- Root cause identified and documented
- CSS variable foundation fixed in `coreui-theme.css`
- Budget page components migrated to CSS variables
- Sales page components migrated to CSS variables
- Shared components (CollapsibleSection, tables) migrated

### ⏳ Awaiting Validation
- User needs to hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Verify Budget page Villages/Phases tiles render correctly in dark mode
- Verify Sales page renders correctly in dark mode
- Verify accordion headers and table headers render correctly

### 🔍 Known Issues Remaining
**Planning Page** - Extensive hardcoded colors found:
- `PlanningContent.tsx` - ~30 hardcoded color values
- `ProjectCanvas.tsx` - ~40 hardcoded color values
- `PlanningOverviewControls.tsx` - ~5 hardcoded values
- `AddContainerModal.tsx` - ~10 hardcoded values
- `ParcelForm.tsx` - ~20 hardcoded values
- `ContainerTreeView.tsx` - ~10 hardcoded values

See detailed audit in agent exploration results.

---

## Next Steps

### Phase 2: Component Cleanup
**Reference**: `docs/GLOBAL_CSS_CLEANUP_PROMPT.md` (to be created)

**Priority Order:**
1. ✅ **Budget page** - COMPLETE
2. ✅ **Sales page** - COMPLETE
3. 🔄 **Planning page** - IN PROGRESS (foundation fix applied, component cleanup needed)
4. ⏸️ **Dashboard page** - Not started
5. ⏸️ **Valuation page** - Not started
6. ⏸️ **Other pages** - Not started

**Recommended Approach for Planning:**
- Option A: Quick win - Fix `PlanningContent.tsx` main container only (~30 values)
- Option B: Complete solution - Fix all 6 Planning files (~115+ values)
- Option C: Document and defer - Add to systematic cleanup backlog

### Phase 3: Systematic Cleanup
Per the [UI Colors Inventory](./landscape_ui_colors_inventory.md):
- **Total hardcoded color instances**: 3,499
- **Fixed in this session**: ~75-100 instances
- **Remaining**: ~3,400 instances
- **Completion**: ~2-3%

---

## Technical Lessons Learned

### 1. CSS Variable Scope Matters
Always define CSS variables in **both** class selectors AND attribute selectors if your app uses both patterns for theme switching.

### 2. Browser Cache is Aggressive
CSS changes require hard refresh to see. Added reminder to all fix instructions.

### 3. Color Variable Naming
The existing system uses descriptive names:
- `--cui-body-bg` - main page background
- `--cui-card-bg` - card/panel background
- `--cui-tertiary-bg` - subtle backgrounds (hover, headers)
- `--cui-border-color` - all borders
- `--cui-secondary-color` - muted text

This is clearer than generic names like `--color-1`, `--color-2`.

### 4. Test in Both Modes
Always verify changes work in BOTH light and dark modes. Some fixes broke one mode while fixing the other.

---

## Files Modified This Session

1. `src/styles/coreui-theme.css` - Added attribute selector variable definitions
2. `src/components/budget/FiltersAccordion.tsx` - 15+ color replacements
3. `src/components/budget/BudgetDataGrid.tsx` - Table header background
4. `src/components/budget/custom/GroupRow.tsx` - Category header background
5. `src/components/budget/custom/ExpandableDetailsRow.tsx` - Accordion text color
6. `src/app/projects/[projectId]/budget/page.tsx` - Full JSX style block replacement
7. `src/components/sales/SalesContent.tsx` - Container and label colors
8. `src/components/shared/AreaTiles.tsx` - Tile colors
9. `src/components/sales/PhaseTiles.tsx` - Tile colors
10. `src/app/components/Planning/CollapsibleSection.tsx` - Accordion colors
11. `src/components/sales/ParcelSalesTable.tsx` - Table header
12. `src/components/sales/PricingTable.tsx` - Table header

---

## Related Documentation

- [BUDGET_PAGE_DARK_MODE_FIXES.md](./BUDGET_PAGE_DARK_MODE_FIXES.md) - Budget page specific fixes
- [UI Colors Inventory](./landscape_ui_colors_inventory.md) - Complete catalog of 3,499 hardcoded colors
- [COREUI_THEME_MIGRATION_STATUS.md](./COREUI_THEME_MIGRATION_STATUS.md) - Overall migration progress (if exists)
- `GLOBAL_CSS_CLEANUP_PROMPT.md` - Template for systematic cleanup (to be created)

---

## Deployment Checklist

- [x] CSS foundation fix applied to `coreui-theme.css`
- [x] Budget page components migrated
- [x] Sales page components migrated
- [x] Shared components migrated
- [ ] User validation - hard refresh required
- [ ] Planning page cleanup (Phase 2)
- [ ] Remaining pages cleanup (Phase 3)

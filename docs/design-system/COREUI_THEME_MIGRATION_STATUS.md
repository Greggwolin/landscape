# CoreUI Theme Migration Status

**Last Updated**: November 16, 2025
**Migration Goal**: Replace all hardcoded Tailwind color classes with CoreUI CSS variables for proper light/dark theme support
**Related Documents**:
- [Landscape UI Colors Inventory](./landscape_ui_colors_inventory.md) - Complete catalog of all 3,499 hardcoded color instances
- [Session Notes 2025-11-16](./SESSION_NOTES_2025_11_16.md) - Today's implementation details

## Migration Overview

### Problem Statement
After CoreUI migration, many pages had hardcoded Tailwind color classes that prevented proper theme switching between light and dark modes. Input fields, borders, and text colors would not adapt to the selected theme.

A comprehensive UI color audit (November 14, 2025) identified **3,499 hardcoded color instances** across the codebase. These instances are cataloged in [landscape_ui_colors_inventory.md](./landscape_ui_colors_inventory.md) with specific file locations and line numbers.

### Solution Approach
Systematically replace hardcoded color classes with CoreUI CSS variables:
- `bg-white`, `bg-gray-*` → `var(--cui-body-bg)` or `var(--cui-card-bg)`
- `border-gray-*` → `var(--cui-border-color)`
- `text-gray-*` → `var(--cui-body-color)` or `var(--cui-secondary-color)`

### Progress Tracking
- **Total Instances**: 3,499 (from audit)
- **Estimated Completed**: ~175-225 instances (7 pages/components)
- **Remaining**: ~3,275 instances
- **Completion**: ~6-7%

## Current Status: 🟡 In Progress

---

## ⚡ BREAKING THROUGH: CSS Variable Foundation Fix (Nov 16, 2025)

### Critical Issue Discovered & Resolved
**Root Cause**: CSS variables were only defined for class selectors (`.light-theme`, `.dark-theme`) but the app uses **attribute selectors** (`[data-coreui-theme='light']`, `[data-coreui-theme='dark']`) for theme switching.

**Impact**: All components using `var(--cui-tertiary-bg)`, `var(--cui-border-color)`, and `var(--cui-secondary-color)` were failing in dark mode because these variables were undefined.

**Fix Applied**: Added `[data-coreui-theme]` selector blocks to `src/styles/coreui-theme.css` (lines 90-107) defining:
- `--cui-border-color` - borders (soft in light, strong in dark)
- `--cui-tertiary-bg` - subtle backgrounds (headers, hover states)
- `--cui-secondary-color` - muted text (labels, helper text)

**Files Modified**: `src/styles/coreui-theme.css`

**Status**: ✅ Deployed, awaiting validation (hard refresh required)

**Documentation**: See [SESSION_NOTES_2025_11_16_THEME_FIX.md](./SESSION_NOTES_2025_11_16_THEME_FIX.md) for complete technical details

---

### Completed Pages ✅

#### 1. Operating Expenses Page
**Location**: `/projects/[projectId]/opex`
**File**: `src/app/projects/[projectId]/opex/page.tsx`
**Status**: ✅ Complete
**Changes**: 27 color instances fixed
- Page header background and borders
- Summary metrics text colors
- All input field backgrounds and borders
- Save button and unsaved changes notification

#### 2. Admin Preferences - Planning Standards
**Location**: `/admin/preferences`
**File**: `src/app/admin/preferences/page.tsx`
**Status**: ✅ Complete
**Changes**:
- Planning efficiency input field background
- All section headers and descriptions
- Tile backgrounds and borders

#### 3. Admin Preferences - Unit Cost Categories
**Location**: `/admin/preferences` → Unit Cost Categories
**Files**:
- `src/app/admin/preferences/components/CategoryDetailPanel.tsx`
- `src/app/admin/preferences/components/category-taxonomy.css`

**Status**: ✅ Complete
**Major Changes**:
- Removed 3 hardcoded color constants (TAG_COLORS, CHIP_COLORS, getTagColor)
- Fixed tag chip border styling (thick border issue resolved)
- All tag chips now use CSS classes instead of inline styles
- Borders use `var(--cui-border-color)` for theme adaptation

**Technical Details**:
```css
/* Before: Base class with border, child classes override width */
.tag-chip { border: 1px solid transparent; }
.tag-chip.filled { border-width: 2px; border-color: var(--cui-primary); }
.tag-chip.outline { border-width: 1px; border-color: #d8dbe0; }

/* After: No base border, full declaration in child classes */
.tag-chip { /* no border */ }
.tag-chip.filled { border: 1px solid var(--cui-primary); }
.tag-chip.outline { border: 1px solid var(--cui-border-color); }
```

#### 4. Benchmarks Page
**Location**: `/admin/benchmarks`
**File**: `src/components/benchmarks/BenchmarkAccordion.tsx`
**Status**: ✅ Complete
**Changes**: ~50+ instances fixed
- All input field backgrounds: `bg-surface-card` → `backgroundColor: 'var(--cui-body-bg)'`
- All input borders: `border-line-strong` → `borderColor: 'var(--cui-border-color)'`
- All label colors: `text-text-secondary` → `color: 'var(--cui-secondary-color)'`
- All textarea and select elements
- Transaction costs form fields now have visible borders in dark mode

#### 5. DMS Page
**Location**: `/dms`
**File**: `src/app/dms/page.tsx`
**Status**: 🟡 Partial
**Changes**: Main sections completed
- Page header and navigation
- Document list containers
- **Remaining**: Modal dialogs, form inputs

#### 6. Land Use Taxonomy Manager
**Location**: `/admin/preferences` → Land Use Taxonomy
**Files**:
- `src/app/settings/taxonomy/taxonomy.css`
- `src/components/taxonomy/FamilyDetails.tsx`
- `src/components/taxonomy/ProductsList.tsx`

**Status**: ✅ Complete
**Changes**:
- Active type card background: `#e0f2fe` → `var(--cui-primary-bg)`
- CoreUI icons for edit/delete (replaced emojis)
- All tree items, labels, and descriptions theme-aware
- Loading states use `var(--cui-secondary-color)`
- ProductsList modal: All form fields, labels, buttons now theme-aware

#### 7. Budget Page (Expanded - Nov 16, 2025)
**Location**: `/projects/[projectId]/budget`
**Files**:
- `src/app/projects/[projectId]/budget/page.tsx` - JSX styles (50+ instances)
- `src/components/budget/FiltersAccordion.tsx` - Villages/Phases tiles (15+ instances)
- `src/components/budget/ModeSelector.tsx` - Mode selector buttons
- `src/components/budget/BudgetDataGrid.tsx` - Table headers
- `src/components/budget/custom/ExpandableDetailsRow.tsx` - Accordion headers
- `src/components/budget/custom/GroupRow.tsx` - Category group headers

**Status**: ✅ Complete
**Changes**:
- **Budget Page**: Entire JSX `<style>` block (lines 162-335) replaced hardcoded colors with CSS variables
- **FiltersAccordion**: Villages/Phases tiles - backgrounds, borders, text colors all theme-aware
- **Mode Selector**: All buttons use `variant="outline"` with `.active` className for subtle active state
- **Table Headers**: `backgroundColor: 'var(--cui-tertiary-bg)'`
- **Group Rows**: Category headers use `var(--cui-tertiary-bg)` background
- **Accordion Headers**: Added text color `var(--cui-body-color)` for visibility

**Documentation**: [BUDGET_PAGE_DARK_MODE_FIXES.md](./BUDGET_PAGE_DARK_MODE_FIXES.md)

#### 8. Sales & Absorption Page (New - Nov 16, 2025)
**Location**: `/projects/[projectId]/sales` or Sales tab
**Files**:
- `src/components/sales/SalesContent.tsx` - Container and section labels
- `src/components/shared/AreaTiles.tsx` - Area tile components
- `src/components/sales/PhaseTiles.tsx` - Phase tile components
- `src/components/sales/ParcelSalesTable.tsx` - Table headers
- `src/components/sales/PricingTable.tsx` - Table headers

**Status**: ✅ Complete
**Changes**:
- **SalesContent**: Page background `rgb(230, 231, 235)` → `var(--cui-body-bg)`
- **Section Labels**: `text-gray-600` → `color: 'var(--cui-secondary-color)'`
- **AreaTiles**: Unselected backgrounds and text colors now theme-aware
- **PhaseTiles**: Unselected backgrounds and text colors now theme-aware
- **Table Headers**: `rgb(241, 242, 246)` → `var(--cui-tertiary-bg)`

#### 9. Shared Components (New - Nov 16, 2025)
**Location**: Various (used across multiple pages)
**Files**:
- `src/app/components/Planning/CollapsibleSection.tsx` - Reusable accordion

**Status**: ✅ Complete
**Changes**:
- **CollapsibleSection**: Header background, card background, and borders all use CSS variables
- Used by Budget, Sales, Planning pages

### In Progress 🟡

#### Planning Page (Foundation Complete, Component Cleanup Needed)
**Location**: `/projects/[projectId]/planning`
**Status**: 🟡 Foundation ready, ~115 hardcoded colors identified
**Files Needing Cleanup**:
- `PlanningContent.tsx` - ~30 hardcoded values (page container, tables, badges)
- `ProjectCanvas.tsx` - ~40 hardcoded values (Material Design blues, dark grays)
- `PlanningOverviewControls.tsx` - ~5 hardcoded values
- `AddContainerModal.tsx` - ~10 hardcoded values
- `ParcelForm.tsx` - ~20 hardcoded values
- `ContainerTreeView.tsx` - ~10 hardcoded values

**Next Steps**: See [SESSION_NOTES_2025_11_16_THEME_FIX.md](./SESSION_NOTES_2025_11_16_THEME_FIX.md) for detailed audit and cleanup options

#### Pages with Partial Fixes
1. **DMS** - Modal dialogs and form inputs remaining
2. **Dashboard** - Some tiles may have hardcoded colors

### Not Started ❌

Based on initial grep analysis (3,499 total hardcoded color instances):

#### High Priority
1. **Rent Roll** (`src/app/projects/[projectId]/rent-roll/*`)
   - 18 hardcoded color instances identified
   - Affects: Tenant list, lease details, rent schedules

2. **Market** (`src/app/projects/[projectId]/market/*`)
   - 14 hardcoded color instances identified
   - Affects: Market data inputs, comparison tables

3. **Valuation** (`src/app/projects/[projectId]/valuation/*`)
   - Multiple components with hardcoded colors
   - Files: AdjustmentMatrix, ComparablesGrid, etc.

#### Medium Priority
4. **Budget** - Various budget-related pages
5. **Timeline** - CPM and milestone views
6. **Sales/Absorption** - Sales tracking and projections

#### Low Priority
7. **Navigation Components** - TopNavigationBar, ProjectContextBar
8. **Shared Components** - Various utility components
9. **Prototype Pages** - Development/testing pages

## CoreUI CSS Variable Reference

### Primary Variables
```css
/* Backgrounds */
--cui-body-bg          /* Main page background */
--cui-card-bg          /* Card/panel backgrounds */
--cui-tertiary-bg      /* Subtle background for sections */
--cui-primary-bg       /* Primary color background (light) */

/* Text Colors */
--cui-body-color       /* Primary text color */
--cui-secondary-color  /* Secondary/muted text */

/* Borders */
--cui-border-color     /* Standard border color */

/* Brand Colors */
--cui-primary          /* Primary brand color */
--cui-success          /* Success state */
--cui-warning          /* Warning state */
--cui-danger           /* Error/danger state */
--cui-info             /* Info state */

/* RGB Variables (for opacity) */
--cui-primary-rgb      /* RGB values for opacity: rgba(var(--cui-primary-rgb), 0.2) */
--cui-success-rgb
--cui-warning-rgb
--cui-danger-rgb
--cui-info-rgb
```

### Common Patterns

#### Input Fields
```tsx
<input
  className="px-3 py-2 border rounded"
  style={{
    backgroundColor: 'var(--cui-body-bg)',
    borderColor: 'var(--cui-border-color)',
    color: 'var(--cui-body-color)'
  }}
/>
```

#### Labels
```tsx
<label
  className="text-sm font-medium"
  style={{ color: 'var(--cui-secondary-color)' }}
>
```

#### Cards/Panels
```tsx
<div
  className="rounded-lg shadow-sm border"
  style={{
    backgroundColor: 'var(--cui-card-bg)',
    borderColor: 'var(--cui-border-color)'
  }}
>
```

#### Headers
```tsx
<h1
  className="text-2xl font-bold"
  style={{ color: 'var(--cui-body-color)' }}
>
```

#### Buttons (when not using LandscapeButton)
```tsx
<button
  className="px-4 py-2 rounded"
  style={{
    backgroundColor: 'var(--cui-primary)',
    color: 'white'
  }}
>
```

## Migration Checklist

### Per-Page Process
- [ ] Read file and identify all hardcoded color classes
- [ ] Group by element type (inputs, labels, containers, headers)
- [ ] Replace with appropriate CSS variables using inline styles
- [ ] Test in both light and dark modes
- [ ] Verify build compiles successfully
- [ ] Update this document

### Common Replacements

#### Tailwind → CSS Variables
```
bg-white             → backgroundColor: 'var(--cui-body-bg)'
bg-gray-50           → backgroundColor: 'var(--cui-tertiary-bg)'
bg-gray-100          → backgroundColor: 'var(--cui-card-bg)'
bg-surface-card      → backgroundColor: 'var(--cui-body-bg)'

text-gray-900        → color: 'var(--cui-body-color)'
text-gray-600        → color: 'var(--cui-secondary-color)'
text-text-secondary  → color: 'var(--cui-secondary-color)'

border-gray-200      → borderColor: 'var(--cui-border-color)'
border-gray-300      → borderColor: 'var(--cui-border-color)'
border-line-strong   → borderColor: 'var(--cui-border-color)'

Invalid classes to remove:
cui-card-bg         → Use inline style instead
cui-border          → Use inline style instead
```

## Known Issues & Solutions

### Issue 1: Thick Borders on Tag Chips ✅ RESOLVED
**Problem**: Tag chips had double-thick borders
**Cause**: Base class defined border, child classes redefined border-width
**Solution**: Remove base border, define full `border` property in child classes

### Issue 2: Next.js Cache Corruption
**Problem**: Internal server errors, routes-manifest.json ENOENT
**Cause**: Turbopack build manifest corruption
**Solution**:
```bash
rm -rf .next
npx next dev --port 3000  # Without Turbopack
```

### Issue 3: Icons Not Theme-Aware
**Problem**: Emoji icons don't adapt to theme
**Solution**: Use CoreUI `<CIcon>` components with `cilPencil`, `cilTrash`, etc.

## Testing Guidelines

### Manual Testing Checklist
For each modified page:
- [ ] Load page in light mode
- [ ] Verify all text is visible and readable
- [ ] Verify all input fields have visible borders
- [ ] Verify all buttons render correctly
- [ ] Switch to dark mode
- [ ] Verify all text is visible against dark background
- [ ] Verify all input field borders are visible
- [ ] Verify no hardcoded white backgrounds show through
- [ ] Test interactive states (hover, focus, active)

### Automated Checks
```bash
# TypeScript compilation
npx tsc --noEmit

# Find remaining hardcoded colors
grep -r "bg-gray\|bg-white\|text-gray\|border-gray" src/ --include="*.tsx"

# Check for invalid CSS class usage
grep -r "cui-card-bg\|cui-border" src/ --include="*.tsx"
```

## Performance Considerations

### CSS Variables vs Inline Styles
- **CSS Variables**: Allow theme switching without re-rendering
- **Inline Styles**: Necessary when Tailwind classes can't be used
- **Best Practice**: Use CSS classes when possible, inline styles when needed

### Build Size Impact
- Removing unused Tailwind classes reduces bundle size
- CSS variables add minimal overhead
- Theme switching has no performance impact (pure CSS)

## Documentation Updates

Files updated:
- ✅ `SESSION_NOTES_2025_11_16.md` - Detailed session notes
- ✅ `COREUI_THEME_MIGRATION_STATUS.md` - This file

Files to update:
- [ ] `CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md` - Tag chip fixes
- [ ] Main README - Link to theme migration status

## Future Improvements

### Short Term
1. Complete migration of all remaining pages
2. Create automated test for theme switching
3. Add theme preview in Storybook/dev tools

### Long Term
1. Create ESLint rule to prevent hardcoded color usage
2. Build theme validator tool
3. Document custom theme creation process
4. Consider CSS-in-JS solution for better type safety

## Resources

### Documentation
- [CoreUI Documentation](https://coreui.io/react/)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Tailwind to CSS Variables Migration Guide](https://tailwindcss.com/docs/customizing-colors#using-css-variables)

### Internal Documents
- **[Landscape UI Colors Inventory](./landscape_ui_colors_inventory.md)** - Complete catalog of 3,499 hardcoded instances with file locations
- **[Session Notes 2025-11-16](./SESSION_NOTES_2025_11_16.md)** - Implementation details, technical learnings, commands reference
- **[Category Taxonomy UI Implementation](./CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md)** - Tag chip theme fixes documentation

### Session Notes Archive
- November 16, 2025 - Tag chips, benchmarks, planning standards, taxonomy icons
- November 14, 2025 - UI color audit generated
- January 14, 2025 - Initial CoreUI migration work

## Using the Color Inventory

The [landscape_ui_colors_inventory.md](./landscape_ui_colors_inventory.md) file is your roadmap for migration:

1. **Find Components**: Search for specific components or pages
2. **Check Patterns**: Identify common color patterns (e.g., `bg-blue-600 hover:bg-blue-700`)
3. **Prioritize**: Start with high-frequency patterns or critical user flows
4. **Track Progress**: Mark completed sections in the inventory
5. **Verify**: Test both light and dark modes after changes

### Example Workflow
```bash
# 1. Find rent roll color instances in inventory
grep -A5 "rent-roll" docs/landscape_ui_colors_inventory.md

# 2. Open the file and identify patterns
# 3. Replace with CSS variables following patterns in this doc
# 4. Test in both themes
# 5. Update inventory with ✅ Complete marker
```

## Contact

For questions about theme migration:
- Check [Session Notes 2025-11-16](./SESSION_NOTES_2025_11_16.md) for implementation details
- Review this document for patterns and examples
- Consult [landscape_ui_colors_inventory.md](./landscape_ui_colors_inventory.md) for specific instances
- Reference CoreUI docs for variable specifications

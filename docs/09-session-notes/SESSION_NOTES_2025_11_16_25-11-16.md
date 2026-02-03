# Session Notes - November 16, 2025

## Theme Rendering Fixes - CoreUI Migration Follow-up

### Overview
Continued systematic theme fixes across the application to ensure proper light/dark mode rendering. Fixed hardcoded Tailwind color classes and replaced them with CoreUI CSS variables.

**Related Documents**:
- [CoreUI Theme Migration Status](./COREUI_THEME_MIGRATION_STATUS.md) - Overall migration tracking
- [Landscape UI Colors Inventory](./landscape_ui_colors_inventory.md) - Complete audit of 3,499 hardcoded instances
- [Category Taxonomy UI Implementation](./CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md) - Updated with theme fixes

### Files Modified

#### 1. Budget Components - Theme Variables

**ExpandableDetailsRow.tsx** (`src/components/budget/custom/ExpandableDetailsRow.tsx`)
- Fixed accordion header backgrounds in dark mode
- Replaced CoreUI Bootstrap classes with CSS variables
- Changed from `bg-warning bg-opacity-10` / `bg-danger bg-opacity-10` to `rgba(var(--cui-warning-rgb), 0.1)` / `rgba(var(--cui-danger-rgb), 0.1)`
- Refactored from CAccordion to custom accordion implementation for better state control
- Lines: 66-96

**ModeSelector.tsx** (`src/components/budget/ModeSelector.tsx`)
- Fixed mode toggle button backgrounds (Napkin/Standard/Detail)
- All buttons now use `variant="outline"` consistently
- Active state uses inline styles with CSS variables
- Success button: `var(--cui-success)`
- Warning button: `var(--cui-warning)`
- Danger button: `var(--cui-danger)`
- Lines: 14-33

#### 2. Components - Icon Replacements
**ProductsList.tsx** (`src/components/taxonomy/ProductsList.tsx`)
- Added CoreUI icon imports (`cilPencil`, `cilTrash`)
- Replaced emoji icons (✏️, 🗑️) with CoreUI `<CIcon>` components
- Applied `.btn-edit` class for consistent styling
- Fixed modal form theme variables (lines 244-379):
  - Modal background: `white` → `var(--cui-card-bg)`
  - Modal heading: added `color: 'var(--cui-body-color)'`
  - All labels: added `color: 'var(--cui-secondary-color)'`
  - All inputs: `#ccc` borders → `var(--cui-border-color)`, added `backgroundColor: 'var(--cui-body-bg)'`, `color: 'var(--cui-body-color)'`
  - Calculated area panel: `#f3f4f6` → `var(--cui-tertiary-bg)`, `#374151` → `var(--cui-body-color)'`
  - Cancel button: `white` → `var(--cui-body-bg)`, `#ccc` → `var(--cui-border-color)`, added text color
  - Save button: `#3b82f6` → `var(--cui-primary)`
- Fixed product size text color: `#666` → `var(--cui-secondary-color)` (line 222)
- Fixed empty state button: `#3b82f6` → `var(--cui-primary)` (line 206)
- Lines: 5-6, 206, 222, 228-233, 244-379

**FamilyDetails.tsx** (`src/components/taxonomy/FamilyDetails.tsx`)
- Added CoreUI icon imports
- Replaced edit/delete icons with CoreUI components
- Lines: 5-6, 200-205

#### 2. Admin Pages - Theme Variables
**admin/preferences/page.tsx** (`src/app/admin/preferences/page.tsx`)
- Fixed Planning Standards input field background color
- Added `backgroundColor: 'var(--cui-body-bg)'` to number input
- Ensures proper theme adaptation for light/dark modes
- Line: 297

#### 3. Tag Chip Styling - Complete Overhaul
**CategoryDetailPanel.tsx** (`src/app/admin/preferences/components/CategoryDetailPanel.tsx`)
- Removed inline style overrides with hardcoded color values
- Removed unused color palette constants:
  - `TAG_COLORS` array (11 color options)
  - `CHIP_COLORS` object (hardcoded hex values)
  - `getTagColor()` hash function
- Simplified tag chip rendering to use pure CSS classes
- Now relies on `.tag-chip.filled` and `.tag-chip.outline` classes
- Lines: 706-733 (simplified rendering logic)

**category-taxonomy.css** (`src/app/admin/preferences/components/category-taxonomy.css`)
- Fixed `.tag-chip` base class border handling
- Removed default `border: 1px solid transparent` from base class
- Added explicit `border: 1px solid` declarations to modifier classes:
  - `.tag-chip.filled`: Uses `var(--cui-primary)` for border
  - `.tag-chip.outline`: Uses `var(--cui-border-color)` for border
- Updated transition to handle full `border` property
- Fixed thick border issue by consolidating border declaration
- Lines: 746-795

#### 4. Benchmarks Page - Comprehensive Form Field Fixes
**BenchmarkAccordion.tsx** (`src/components/benchmarks/BenchmarkAccordion.tsx`)
- Replaced ~50+ instances of hardcoded color classes with CSS variables
- Key pattern replacements:
  - `bg-surface-card` → `backgroundColor: 'var(--cui-body-bg)'`
  - `border-line-strong` → `borderColor: 'var(--cui-border-color)'`
  - `text-text-secondary` → `color: 'var(--cui-secondary-color)'`
- Fixed all input, textarea, select elements, and labels
- Removed invalid Tailwind classes (`cui-card-bg`, `cui-border`)
- All form fields now have visible borders in dark mode

#### 5. CSS Theme Variables
**taxonomy.css** (`src/app/settings/taxonomy/taxonomy.css`)
- Updated `.type-card.active` background from hardcoded `#e0f2fe`
- Now uses `var(--cui-primary-bg)` for theme-aware active state
- Line: 434

**opex/page.tsx** (Previously fixed)
- All 27 color instances now using CSS variables
- Headers, inputs, summary metrics all theme-aware

### Technical Details

#### Border Styling Resolution
The tag chip border issue required multiple iterations:
1. **Initial attempt**: Removed inline styles, relied on CSS classes
2. **Second attempt**: Removed `border-width` overrides to avoid doubling
3. **Final solution**: Removed base border entirely, declared full `border` property in modifier classes

This matches the pattern used in the "Notes/Reports" buttons in PlanningContent.tsx where borders are declared as complete properties (`border: 1px solid <color>`).

#### CSS Variable Pattern
Consistent theme-aware styling pattern:
```tsx
// Input fields
style={{
  backgroundColor: 'var(--cui-body-bg)',
  borderColor: 'var(--cui-border-color)',
  color: 'var(--cui-body-color)'
}}

// Labels
style={{ color: 'var(--cui-secondary-color)' }}

// Cards/containers
style={{
  backgroundColor: 'var(--cui-card-bg)',
  borderColor: 'var(--cui-border-color)'
}}
```

### Server Issues Resolved
- **EADDRINUSE on port 3000**: Killed process with `lsof -ti:3000 | xargs kill -9`
- **Internal Server Error (2x)**: Next.js build manifest corruption
  - Solution: Cleared `.next` directory and restarted without Turbopack
  - Command: `npx next dev --port 3000`
  - Turbopack has persistent cache issues; using standard webpack

### Testing
- All modified pages verified to load successfully (HTTP 200)
- Server compilation verified clean (no TypeScript errors in modified files)
- Tag chip borders now thin and consistent across themes
- Input fields have proper visibility in both light and dark modes

### Pages Now Fully Theme-Aware
1. ✅ Operating Expenses (`/projects/[id]/opex`)
2. ✅ Admin Preferences (`/admin/preferences`)
   - Planning Standards panel
   - Unit Cost Categories panel (tag chips)
3. ✅ Benchmarks (`/admin/benchmarks`)
   - All accordion form fields
4. ✅ DMS (`/dms`) - Main sections
5. ✅ Land Use Taxonomy Manager (`/admin/preferences` → Land Use Taxonomy)
   - Active type cards
   - CoreUI icons
   - Products panel

### Remaining Work
Based on initial grep analysis showing 3,499 hardcoded color instances:
- Rent Roll page (18 identified)
- Market page (14 identified)
- Additional DMS sections
- Other pages identified in codebase audit

### Key Learnings
1. **Inline styles override CSS classes**: Always check if CSS classes can handle styling before adding inline styles
2. **Border consolidation**: Use full `border` property instead of splitting across `border-width`, `border-color`, `border-style`
3. **Next.js cache management**: Turbopack has stability issues; standard webpack more reliable for active development
4. **Systematic approach**: Grep for color classes, fix by category (inputs, labels, containers), verify build

### Commands Reference
```bash
# Kill server on port 3000
lsof -ti:3000 | xargs kill -9

# Clear Next.js cache
rm -rf .next

# Start dev server without Turbopack
npx next dev --port 3000

# Check TypeScript compilation
npx tsc --noEmit --project tsconfig.json

# Verify page loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/preferences
```

### Git Status
Modified files ready for commit:
- `src/components/taxonomy/ProductsList.tsx`
- `src/components/taxonomy/FamilyDetails.tsx`
- `src/app/admin/preferences/page.tsx`
- `src/app/admin/preferences/components/CategoryDetailPanel.tsx`
- `src/app/admin/preferences/components/category-taxonomy.css`
- `src/components/benchmarks/BenchmarkAccordion.tsx`
- `src/app/settings/taxonomy/taxonomy.css`
- `src/app/projects/[projectId]/opex/page.tsx` (from previous session)

### Next Session Priorities
1. Continue theme audit of remaining pages
2. Fix Rent Roll and Market pages
3. Audit and fix any remaining DMS sections
4. Consider creating a theme migration guide for future components

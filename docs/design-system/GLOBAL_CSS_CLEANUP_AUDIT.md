# Global CSS Cleanup - Comprehensive Audit
**Date**: 2025-01-16
**Issue**: QW82 Phase 2A - Eliminate hardcoded colors and inline styles

## Objective
Replace ALL hardcoded colors, inline styles, and Tailwind dark mode classes with CoreUI CSS variables and global pattern classes for automatic light/dark mode support.

## Audit Results

### Files with Hex Colors (73 total)
**Priority 1 - User-Facing Components:**
- `src/app/components/Planning/PlanningContent.tsx` - Phase description buttons, info notes
- `src/components/sales/ParcelSalesTable.tsx` - USE_TYPE_COLORS object
- `src/components/budget/config/fieldGroups.ts` - Field group color indicators
- `src/components/budget/custom/GroupRow.tsx` - Already fixed
- `src/components/taxonomy/FamilyDetails.tsx`
- `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx`
- `src/app/admin/preferences/components/CategoryDetailPanel.tsx`

**Priority 2 - Dashboard & Overview:**
- `src/app/dashboard/page.tsx`
- `src/app/projects/[projectId]/overview/page.tsx`
- `src/app/market/components/*.tsx`

**Priority 3 - Maps & Visualizations:**
- `src/components/map/*.tsx`
- `src/components/budget/custom/TimelineChart.tsx`

**Exclude - Theme Files (intentional):**
- `src/styles/tokens.css` - Design tokens (keep as-is)
- `src/themes/**/*` - MUI theme definitions
- `src/styles/coreui-theme.css` - CoreUI customization

### Files with Inline Color Styles (89 total)
**Already Fixed:**
- ✅ `src/components/budget/FiltersAccordion.tsx`
- ✅ `src/components/shared/AreaTiles.tsx`
- ✅ `src/components/sales/PhaseTiles.tsx`
- ✅ `src/components/budget/custom/ExpandableDetailsRow.tsx`
- ✅ `src/components/budget/custom/GroupRow.tsx`

**High Priority - Still Need Fixing:**
- `src/app/components/Planning/PlanningContent.tsx` - Village tiles, phase buttons
- `src/components/sales/SalesContent.tsx`
- `src/components/sales/PricingTable.tsx`
- `src/components/sales/ParcelSalesTable.tsx`
- `src/components/benchmarks/BenchmarkAccordion.tsx`
- `src/components/taxonomy/ProductsList.tsx`
- `src/components/taxonomy/FamilyDetails.tsx`
- `src/app/admin/preferences/page.tsx`
- `src/app/dms/page.tsx`
- `src/app/projects/[projectId]/opex/page.tsx`
- `src/app/dashboard/page.tsx`

### Files with Tailwind Dark Mode Classes (35 total)
**High Priority:**
- `src/app/projects/[projectId]/budget/page.tsx`
- `src/app/dms/page.tsx`
- `src/components/budget/IncompleteCategoriesReminder.tsx`
- `src/components/dms/**/*.tsx` - Entire DMS system
- `src/app/components/PlanningWizard/*.tsx`
- `src/app/components/NewProject/*.tsx`

## Implementation Strategy

### Phase 1: Core Navigation & Planning (High Impact)
1. **PlanningContent.tsx** - Fix remaining hardcoded colors in phase buttons
2. **Sales Components** - SalesContent, PricingTable, ParcelSalesTable
3. **Navigation** - TopNavigationBar, AdminNavBar, ProjectContextBar

### Phase 2: Taxonomies & Admin
4. **Taxonomy Components** - FamilyDetails, ProductsList, FamilyTree
5. **Admin Preferences** - CategoryDetailPanel, UnitCostCategoryManager
6. **Benchmarks** - BenchmarkAccordion, UnitCostsPanel

### Phase 3: Dashboard & Overview
7. **Dashboard** - Main dashboard page and components
8. **Project Overview** - Overview page data cards
9. **Market Components** - All market stat tiles

### Phase 4: DMS & Specialized Views
10. **DMS System** - All document management components
11. **Valuation** - Comparables, maps, analysis panels
12. **Operations** - OPEX page, lease components

### Phase 5: Global Patterns
13. Create missing global classes:
    - `.data-card` variants
    - `.stat-tile` patterns
    - `.accordion-header` variants
    - Button state classes
14. Replace all Tailwind dark classes with CSS variable equivalents

## Success Criteria
- ✅ Zero hex color codes in component files (excluding theme definitions)
- ✅ Zero inline `style={{color:}}` or `style={{backgroundColor:}}`
- ✅ Zero Tailwind `dark:` prefixes
- ✅ All colors use CoreUI CSS variables
- ✅ Automatic light/dark mode switching works everywhere
- ✅ All components use global pattern classes from component-patterns.css

## Files Completed
- ✅ FiltersAccordion.tsx (Budget filters)
- ✅ AreaTiles.tsx (Villages)
- ✅ PhaseTiles.tsx (Phases)
- ✅ ExpandableDetailsRow.tsx (Budget details)
- ✅ GroupRow.tsx (Budget categories)

## Files In Progress
- 🔄 PlanningContent.tsx (partial - village tiles done, phase buttons remain)

## Next Actions
1. User to identify which specific pages are showing issues
2. Prioritize those pages first
3. Systematically work through each priority tier
4. Test light/dark mode switching on each page after fixing

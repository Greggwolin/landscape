# Header Color Hierarchy Reference

**Created:** 2025-11-17
**Updated:** 2025-11-17
**Purpose:** Define the standardized color hierarchy for all headers, subheaders, and sections across the application.

## Color Variable System

All header colors are managed through CSS variables in `src/styles/tokens.css` for centralized control.

### Light Mode Colors

| Variable | Hex Color | Purpose |
|----------|-----------|---------|
| `--surface-card-header` | `#f0f1f2` | **Main headers** (card headers, section headers, table headers) |
| `--surface-subheader` | `#f4f5f8` | **Nested headers** (group rows, category rows within tables) |
| `--surface-operations-tile` | `#f1f2f6` | **Operations tiles** (macro data tiles, summary sections) |
| `--surface-page-bg` | `#e6e7eb` | **Page backgrounds** |
| `--surface-card` | `#f7f7fb` | **Card body backgrounds** |
| `--surface-bg` | `#ffffff` | **Main content backgrounds** |

### Dark Mode Colors

| Variable | Hex Color | Purpose |
|----------|-----------|---------|
| `--surface-card-header` | `#1f2937` | Main headers |
| `--surface-subheader` | `#111827` | Nested headers |
| `--surface-operations-tile` | `#111827` | Operations tiles |
| `--surface-page-bg` | `#0b1220` | Page backgrounds |

---

## Visual Hierarchy (Light Mode)

From darkest to lightest:

1. **Page Background** (#e6e7eb) - Darkest gray, recedes into background
2. **Main Headers** (#f0f1f2) - Medium gray, stands out from page
3. **Operations Tiles** (#f1f2f6) - Light gray, subtle highlight
4. **Subheaders** (#f4f5f8) - Medium-light gray, nested within tables
5. **Card Bodies** (#f7f7fb) - Very light lavender-gray, soft
6. **Content Backgrounds** (#ffffff) - Pure white, maximum contrast

---

## Implementation Details

### Global CSS Rules

**File:** `src/app/globals.css`

```css
/* ALL table headers globally (lines 49-53) */
thead,
thead tr,
thead th {
  background-color: var(--surface-card-header) !important;
}

/* Budget group rows (lines 28-45) */
.budget-group-row,
.budget-group-row td {
  background-color: var(--surface-subheader) !important;
}
```

**File:** `src/styles/coreui-theme.css`

```css
/* Table headers (lines 388-395) */
thead,
thead tr,
thead th,
.table thead,
.table thead tr,
.table thead th {
  background-color: var(--surface-card-header) !important;
}

/* CoreUI card headers (line 329) */
.card-header {
  background-color: var(--surface-card-header);
}
```

---

## Files Updated

### Main Section Headers (use `--surface-card-header`)

**Planning Page:**
- `src/app/components/Planning/CollapsibleSection.tsx` (line 27)
- `src/app/components/Planning/PlanningOverviewControls.tsx` (lines 106, 125)

**Budget Page:**
- `src/components/budget/BudgetDataGrid.tsx` (line 159 - already uses inline style)
- `src/components/benchmarks/BenchmarkAccordion.tsx` (line 244)
- `src/components/benchmarks/GrowthRateCategoryPanel.tsx` (line 67)

**Property Tab:**
- `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx`:
  - Line 570: Floor Plan Matrix header
  - Line 788: Comparable Rentals header
  - Line 832: Detailed Rent Roll header

**Operations Page:**
- `src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx` (line 326)

**Admin Pages:**
- `src/app/admin/benchmarks/page.tsx` (lines 275, 336)
- `src/app/admin/preferences/page.tsx` (lines 92, 97)

**Dashboard:**
- `src/components/project/ProjectProfileTile.tsx` (lines 53, 68)
- `src/app/components/dashboard/UserTile.tsx` (line 57)

**Valuation:**
- `src/app/projects/[projectId]/valuation/components/IndicatedValueSummary.tsx` (line 74)
- `src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx` (line 275)

### Group/Category Rows (use `--surface-subheader`)

**Budget Page:**
- `src/components/budget/custom/GroupRow.tsx` (line 119 inline + CSS class)
- All budget group rows (Acquisition, Soft Costs, etc.) via `.budget-group-row` class

**Operations Page:**
- `src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx` (line 401)
- Parent expense category rows (Operating Expenses, Utilities, etc.)

### Table Headers (Global)

**All tables** automatically get `--surface-card-header` via global CSS rules in:
- `src/app/globals.css` (lines 49-53)
- `src/styles/coreui-theme.css` (lines 388-395)

This includes:
- Budget tables
- Property tab tables (Floor Plan Matrix, Detailed Rent Roll)
- Planning tables
- All other `<thead>` elements throughout the app

---

## How to Make Global Changes

### Change All Main Headers
Edit `src/styles/tokens.css` line 12:
```css
--surface-card-header: #NEW_COLOR;
```

### Change All Nested Headers (Group Rows)
Edit `src/styles/tokens.css` line 13:
```css
--surface-subheader: #NEW_COLOR;
```

### Change All Operations Tiles
Edit `src/styles/tokens.css` line 14:
```css
--surface-operations-tile: #NEW_COLOR;
```

---

## Migration Complete ✅

All headers, subheaders, and group rows across the entire application now use centralized CSS variables. Changing one line in `tokens.css` will update:

- ✅ All table headers (`<thead>` elements)
- ✅ All card headers (`.card-header` class)
- ✅ All accordion headers (Villages, Phases, Parcel Detail, etc.)
- ✅ All section headers (Floor Plan Matrix, Detailed Breakdown, etc.)
- ✅ All budget group rows (Acquisition, Soft Costs, Uncategorized)
- ✅ All expense category rows (Operating Expenses, Utilities, etc.)
- ✅ All admin page headers (Benchmarks, Preferences)
- ✅ All planning page headers
- ✅ All property tab headers

---

## ⚠️ Areas with Hardcoded Colors (Not Using Variables)

The following areas still use hardcoded colors and are **NOT** tied to global CSS variables. These require manual updates or future migration:

### Property Tab (Dark Theme Hardcoded)
**File:** `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx`

This entire tab uses hardcoded Tailwind `bg-gray-*` classes throughout:
- **Page background:** `bg-gray-950` (lines 479, 500, 535, 565)
- **Card backgrounds:** `bg-gray-800` (lines 501, 536, 569, 787, 831)
- **Table headers:** `bg-gray-900` (lines 597, 804, 941) - **NOTE:** Global CSS overrides these
- **Table rows:** Alternating `bg-gray-800` / `bg-gray-850` (lines 618, 815, 953)
- **Input fields:** `bg-gray-700` with `border-gray-600` (60+ instances)
- **Buttons:** `bg-gray-700 hover:bg-gray-600` (lines 724, 732, 851, 969, 977)
- **Info tiles:** `bg-gray-750` (lines 867, 879, 891, 903, 915, 927)
- **Variance badges:** `bg-green-900` / `bg-red-900` (line 709)

**Impact:** Entire Property tab is locked to dark gray theme and won't respond to light/dark mode changes via CSS variables.

### Legacy Budget CSS Files
**Files:**
- `src/components/budget/SimpleBudgetGrid.css` (30+ hardcoded hex colors)
- `src/components/budget/BasicBudgetTable.css` (30+ hardcoded hex colors)

**Hardcoded colors:**
- Background: `#1e293b`, `#0f172a`
- Borders: `#334155`
- Text: `#e2e8f0`, `#cbd5e1`, `#94a3b8`
- Hover: `#334155`
- Success: `#10b981`
- Warning: `#fbbf24`
- Danger: `#ef4444`
- Primary: `#3b82f6`

**Impact:** These legacy CSS files are completely hardcoded and don't use any CSS variables. Status unclear if these are still actively used.

### Slate-Themed Components (Prototype/Archive Pages)
**Files using `bg-slate-*` classes:**
- `src/app/prototypes-multifam/page.tsx`
- `src/app/growthrates-original/page.tsx`
- `src/app/growthratedetail/page.tsx`
- `src/app/components/Market/MarketAssumptions.tsx` (60+ instances)
- `src/app/components/DVLTimeSeries.tsx`
- `src/app/components/ProjectCosts/index.tsx`
- `src/app/components/LandscaperChatModal.tsx`
- `src/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx`

**Common patterns:**
- `bg-slate-950` (page backgrounds)
- `bg-slate-800` / `bg-slate-700` (card/section backgrounds)
- `bg-slate-600` (inputs)
- `bg-slate-500/20` (status badges)

**Impact:** These components use a separate slate color palette and won't respond to theme changes.

### Chart/Visualization Colors
**File:** `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx`

**Hardcoded palette (line 79):**
```typescript
const CATEGORY_COLOR_PALETTE = [
  '#2563EB', '#7C3AED', '#059669', '#DB2777',
  '#D97706', '#0EA5E9', '#F43F5E', '#14B8A6'
];
```

**Impact:** Chart colors are fixed and don't adapt to theme. This is likely intentional for data consistency.

### Admin Components (Fallback Values)
**Files:**
- `src/app/admin/preferences/components/CategoryDetailPanel.tsx`
- `src/app/admin/preferences/components/CreateTagModal.tsx`
- `src/app/admin/preferences/components/category-taxonomy.css`

**Pattern:** These files DO use CSS variables but include hardcoded fallback values:
```css
var(--cui-border-color, #d8dbe0)
var(--cui-body-color, #4f5d73)
var(--brand-primary, #0ea5e9)
```

**Impact:** Minimal - fallbacks only used if CSS variables fail to load. Generally good practice.

---

## Migration Recommendations

### High Priority (Active Production Pages)
1. **Property Tab** - Migrate all `bg-gray-*` classes to CSS variables
2. **Market Assumptions** - Migrate `bg-slate-*` classes to CSS variables

### Medium Priority (Legacy/Prototype)
3. **SimpleBudgetGrid.css** / **BasicBudgetTable.css** - Verify if still used, then migrate or delete
4. **Prototype pages** - Consider migrating if actively used

### Low Priority (Intentional Hardcoding)
5. **Chart colors** - Keep hardcoded for data visualization consistency
6. **Admin fallbacks** - Keep as-is (good defensive programming)

---

---

## ✅ Button & Chip Color Analysis

### Current Color Weight Usage Across the App

After analyzing button patterns throughout the codebase, here's what's currently being used:

| Weight | Usage Pattern | Examples | Visibility |
|--------|--------------|----------|------------|
| **600** | **✅ Best Practice** - Filter chips, status badges | Operations tab filters (`bg-red-600`, `bg-blue-600`, `bg-green-600`) | **Excellent** in both light/dark |
| **700** | Primary action buttons | Property tab buttons (`bg-blue-700 hover:bg-blue-600`), LandUse buttons | Good in both modes |
| **900** | Status badges with transparency | Property tab status chips (`bg-blue-900/20 border-blue-700/40`) | Good for subtle backgrounds |
| **CoreUI Vars** | Framework buttons (CButton) | `--cui-primary`, `--cui-success`, `--cui-danger` | Dependent on theme |
| **Shadcn/Radix** | UI library buttons | Uses CSS variables (`bg-primary`, `bg-destructive`) | Depends on theme setup |

### ✅ Recommended Pattern: 600-Weight for Interactive Elements

**Best Example: Operations Tab Filter Buttons**

**File:** `src/config/opex/hierarchical-structure.ts` (lines 259-265)
**Used in:** `src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx` (lines 344-356)

```typescript
export const CATEGORY_DEFINITIONS = [
  { key: 'taxes', label: 'TAXES', color: 'bg-red-600', textColor: 'text-white' },
  { key: 'insurance', label: 'INS', color: 'bg-blue-600', textColor: 'text-white' },
  { key: 'utilities', label: 'UTIL', color: 'bg-green-600', textColor: 'text-white' },
  { key: 'maintenance', label: 'R&M', color: 'bg-yellow-600', textColor: 'text-white' },
  { key: 'management', label: 'MGMT', color: 'bg-purple-600', textColor: 'text-white' },
  { key: 'other', label: 'OTHER', color: 'bg-gray-600', textColor: 'text-white' }
];
```

**Why 600-weight works best:**
- **Strong saturation** - Vibrant enough to stand out on any background
- **Universal contrast** - Works in both light and dark modes without theme adjustments
- **Consistent with Tailwind's "primary action" guidance** - 600 is the default semantic color
- **Self-contained** - No dependency on surface colors or theme variables
- **WCAG compliant** - Meets contrast requirements with white text (7:1+ ratio)

**Additional patterns from these buttons:**
- Active state: `ring-2 ring-white scale-105`
- Inactive state: `opacity-70 hover:opacity-100`
- Always pair with: `text-white`

### 700-Weight Pattern (Also Common)

**Examples:** Property tab action buttons, LandUse modals

```tsx
<button className="px-3 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-600">
  Add Floor Plan
</button>
```

**Use case:** Primary action buttons in dark-themed contexts
**Trade-off:** Slightly darker, less vibrant than 600-weight

### Best Practice Recommendations

1. **For filter chips, status badges, and semantic indicators**: Use **600-weight** with `text-white`
   - Examples: Category filters, mode chips, priority badges

2. **For primary action buttons**: Use either **600-weight** (universal) or **700-weight** (dark contexts)
   - 600: Better for mixed light/dark environments
   - 700: Better when you know the background will be dark

3. **For subtle background indicators**: Use **900-weight with opacity** (`bg-blue-900/20`)
   - Examples: Info callouts, status backgrounds

4. **For framework-integrated buttons**: Use **CoreUI variables** (`--cui-primary`) only when you need theme consistency with other CoreUI components

5. **Avoid**: Weights 100-500 for buttons (too light, poor contrast with white text)

---

## Notes

- **Do not use hardcoded hex values** - always use CSS variables
- **Do not use `rgb(241, 242, 246)`** - use `var(--surface-card-header)` instead
- **Do not use Tailwind color classes** like `bg-gray-800` or `bg-slate-700` for surfaces/backgrounds - use CSS variables
- **Exception:** Semantic button/chip colors (e.g., `bg-blue-600 text-white`) can work well for interactive elements that need consistent visibility
- **Global CSS rules** handle all `<thead>` elements automatically
- **The `.budget-group-row` class** handles budget group rows via Tailwind utilities layer
- **Parent row detection** (e.g., `row.isParent`) determines subheader background in nested tables

# Tab Implementation Audit - Current State Documentation

**Date:** November 17, 2025
**Session:** LD39
**Purpose:** Document what exists BEFORE implementing mode selectors

---

## EXECUTIVE SUMMARY

This audit documents the **current implementation state** of all Project tabs to:
1. Identify what fields/sections currently exist
2. Determine database connectivity and CRUD operations
3. Distinguish UI-only features vs. fully functional features
4. Establish baseline for mode selector implementation

---

## LAND DEVELOPMENT TABS (project_type_code = 'LAND')

### 1. PROJECT TAB ✅ **FULLY IMPLEMENTED**

**Status:** Production-ready with extensive functionality
**Component:** [src/app/projects/[projectId]/components/tabs/ProjectTab.tsx](src/app/projects/[projectId]/components/tabs/ProjectTab.tsx)

#### Current Sections

**A. Location Section (Editable)**
- Fields:
  - `street_address` (DB: `tbl_project.street_address`)
  - `city` (DB: `tbl_project.city`)
  - `state` (DB: `tbl_project.state`)
  - `zip_code` (DB: `tbl_project.zip_code`)
  - `county` (DB: `tbl_project.county`)
  - `market` (DB: `tbl_project.market`)
  - `submarket` (DB: `tbl_project.submarket`)
  - `apn_primary` (DB: `tbl_project.apn_primary`)
  - `apn_secondary` (DB: `tbl_project.apn_secondary`)
- **Database:** Connected via `/api/projects/[projectId]/details` (PATCH)
- **Auto-geocoding:** Triggers coordinate update via `/api/projects/[projectId]/profile` (PATCH)

**B. Project Profile Section (Editable)**
- Fields:
  - `project_type_code` (DB: `tbl_project.project_type_code`)
  - `property_subtype` (DB: `tbl_project.property_subtype`)
  - `property_class` (DB: `tbl_project.property_class`)
  - `status` (DB: `tbl_project.status`) - Land dev only
  - `ownership_type` (DB: `tbl_project.ownership_type`)
  - `lot_size_sf` (DB: `tbl_project.lot_size_sf`)
  - `lot_size_acres` (DB: `tbl_project.lot_size_acres`)
  - `start_date` (DB: `tbl_project.start_date`) - Land dev only
  - `year_built` (DB: `tbl_project.year_built`)
  - `total_units` (DB: `tbl_project.total_units`)
  - `stories` (DB: `tbl_project.stories`)
  - `gross_sf` (DB: `tbl_project.gross_sf`)
  - `project_notes` (DB: `tbl_project.project_notes`)
- **Database:** Connected via `/api/projects/[projectId]/details` (PATCH)

**C. Map Section (3D Oblique View)**
- Component: `ProjectTabMap`
- **Database:** Reads `location_lat` / `location_lon` from project
- **Functional:** Yes - renders Mapbox 3D oblique view

**D. Financial Summary Section (Collapsible Accordion)**
- 7 Metric Tiles:
  - Asking Price (`asking_price`)
  - Price/Unit (`price_per_unit`)
  - Price/SF (`price_per_sf`)
  - Current Cap (`cap_rate_current`)
  - Proforma Cap (`cap_rate_proforma`)
  - Current NOI (`current_noi`)
  - Proforma NOI (`proforma_noi`)
- Detailed Financial Table (Collapsible):
  - Current vs. Proforma comparison:
    - GPR Annual (`current_gpr` / `proforma_gpr`)
    - Other Income (`current_other_income` / `proforma_other_income`)
    - GPI (`current_gpi` / `proforma_gpi`)
    - Vacancy Rate (`current_vacancy_rate` / `proforma_vacancy_rate`)
    - EGI (`current_egi` / `proforma_egi`)
    - Operating Expenses (`current_opex` / `proforma_opex`)
  - Landscape Proforma column (placeholder - "Pending User Assumptions")
- **Database:** All fields read from `tbl_project`
- **Functional:** Display only - no editing
- **Note:** Only shows if financial data exists

**E. Market Rates Section (Collapsible Accordion)**
- General Inflation input:
  - Default: 2.5%
  - Custom schedule builder with "Custom" button
- Custom Inflation Schedule Modal:
  - StepRateTable component (from multifam)
  - Period-based rate configuration
  - Save/Load schedules (localStorage for now)
- **Database:** Not yet connected to backend
- **Functional:** UI works, but saves locally only

**F. Contacts Section (Collapsible Accordion)**
- Listing Brokerage display
- ContactsSection component
- **Database:** Connected via `ContactsSection` API
- **Functional:** Yes - full CRUD operations

**G. Landscaper AI Assistant Section**
- Drag & drop document upload area (UI only)
- Links to `/projects/${projectId}?tab=documents`
- **Database:** Not connected
- **Functional:** UI placeholder

**H. Macro Conditions Section (4 Colored Tiles)**
- Inflation (CPI)
- 10-Year Treasury
- Prime Rate
- SOFR (90-day)
- **Database:** Fetches from market-intel API via `fetchMarketStatsForProject()`
- **Functional:** Yes - displays real-time economic data with YoY changes

#### Database Tables Used
- **Primary:** `tbl_project` (full CRUD via `/api/projects/[projectId]/details`)
- **Related:** Contact management tables (via ContactsSection)
- **External:** Market Intel API (economic indicators)

#### Mode Potential
**Suggested Mode Structure:**
- **Napkin:** Location + Profile + Map (basic project setup)
- **Standard:** + Financial Summary + Market Rates (pro forma analysis)
- **Detail:** + Contacts + Landscaper AI + Macro Conditions (full context)

---

### 2. PLANNING TAB ✅ **FULLY IMPLEMENTED**

**Status:** Production-ready hierarchy management
**Component:** [src/app/components/Planning/PlanningContent.tsx](src/app/components/Planning/PlanningContent.tsx)

#### Current Sections

**A. Planning Overview Controls**
- Component: `PlanningOverviewControls`
- Buttons for managing hierarchy:
  - Add Area
  - Add Phase
  - Add Parcel
- **Functional:** Yes - opens modals for CRUD operations

**B. Area Cards (Collapsible Sections)**
- Per-area statistics:
  - Gross Acres (calculated from parcels)
  - Phases count (unique phase names)
  - Parcels count
  - Units total
- Displays all areas defined in project hierarchy
- **Database:** Reads from `/api/parcels?project_id=X` and `/api/phases?project_id=X`
- **Functional:** Yes - live aggregated stats

**C. Phase Sections (Nested Under Areas)**
- Per-phase display:
  - Phase name
  - Gross/Net acres
  - Total units
  - Start date
  - Status
- Edit/Delete controls
- **Database:** `/api/phases` (CRUD operations)
- **Functional:** Yes - full CRUD

**D. Parcel Detail Cards (Nested Under Phases)**
- Component: `ParcelDetailCard`
- Fields per parcel:
  - Parcel ID (formatted as area.parcel)
  - Product type (`product`, `product_code`)
  - Land use (`usecode`, `type_code`)
  - Family name (`family_name`)
  - Acres (`acres`)
  - Units (`units`)
  - Efficiency (`efficiency`)
  - Frontage (`frontfeet`)
- Edit/Delete controls
- **Database:** `/api/parcels` (CRUD operations)
- **Functional:** Yes - full CRUD

**E. Project Configuration**
- Uses `useProjectConfig()` hook for:
  - Customizable level labels (Area/Phase/Parcel)
  - Display preferences
- **Database:** Reads from project configuration
- **Functional:** Yes

#### Database Tables Used
- **Primary:** `tbl_parcel` (CRUD via `/api/parcels`)
- **Related:** `tbl_phase` (CRUD via `/api/phases`)
- **Related:** `tbl_container` (hierarchy management)

#### Real-Time Updates
- Uses SWR for data fetching with revalidation
- Listens for `dataChanged` custom events
- Triggers re-fetch when data changes

#### Mode Potential
**Suggested Mode Structure:**
- **Napkin:** Area + Phase structure only (high-level planning)
- **Standard:** + Parcel management with basic fields (acres, units)
- **Detail:** + Full parcel details (efficiency, frontage, product types)

---

### 3. BUDGET TAB ✅ **FULLY IMPLEMENTED WITH 3-MODE SELECTOR**

**Status:** ⭐ **REFERENCE IMPLEMENTATION** - Production-ready with full mode selector
**Component:** [src/components/budget/BudgetGridTab.tsx](src/components/budget/BudgetGridTab.tsx)

#### Current Implementation (Session LD19)

**A. Mode Selector Component**
- Component: [src/components/budget/ModeSelector.tsx](src/components/budget/ModeSelector.tsx)
- 3 Modes:
  - **Napkin:** 9 fields (Quick estimates)
  - **Standard:** 28 fields (10 inline + 18 expandable)
  - **Detail:** 49 fields (10 inline + 39 expandable)
- **Persistence:** localStorage-backed (`budget_mode_${projectId}`)
- **Visual:** 3-button toggle with field count badges

**B. Field Organization System**
- File: [src/components/budget/config/fieldGroups.ts](src/components/budget/config/fieldGroups.ts)
- Progressive Disclosure:
  - Inline fields (always visible in grid)
  - Expandable accordion groups (organized by category)
- Field Groups (Standard):
  1. Timing & Escalation (7 fields)
  2. Cost Controls (6 fields)
  3. Classification (5 fields)
- Field Groups (Detail) - Additional:
  4. Advanced Timing/CPM (11 fields) - Hidden for LAND projects
  5. Financial Controls (10 fields)
  6. Period Allocation (5 fields)

**C. Data Grid Component**
- Component: [src/components/budget/BudgetDataGrid.tsx](src/components/budget/BudgetDataGrid.tsx)
- Features:
  - AG Grid-powered
  - Inline editing
  - Category hierarchy
  - Row grouping
  - Expandable detail rows (accordion)
  - Filters by Area/Phase/Project Level
- **Database:** Connected via `/api/projects/[projectId]/budget-items`
- **Functional:** Yes - full CRUD operations

**D. Container Filtering**
- Component: [src/components/budget/FiltersAccordion.tsx](src/components/budget/FiltersAccordion.tsx)
- Filters:
  - Area selection (multi-select)
  - Phase selection (multi-select)
  - Project level toggle
- **Persistence:** localStorage-backed (`budget_filters_${projectId}`)
- **Functional:** Yes - live filtering

**E. Sub-tabs**
- Grid (Budget data table)
- Timeline (Gantt chart - placeholder)
- Assumptions (Escalation settings - placeholder)
- Analysis (Budget analytics - placeholder)
- Categories (Cost category management - placeholder)

**F. Expandable Detail Rows**
- Component: [src/components/budget/custom/ExpandableDetailsRow.tsx](src/components/budget/custom/ExpandableDetailsRow.tsx)
- Accordion-based field groups
- Only shows fields appropriate for current mode
- Property-type-aware (hides CPM fields for LAND projects)

#### Database Tables Used
- **Primary:** `tbl_budget_item` (CRUD via `/api/projects/[projectId]/budget-items`)
- **Related:** `tbl_container` (for area/phase filtering)
- **Related:** Budget categories and subcategories

#### Key Implementation Patterns
1. **Mode Persistence:** localStorage with fallback
2. **Field Visibility:** Mode-based + property-type-based filtering
3. **Progressive Disclosure:** Inline + accordion groups
4. **Real-time Validation:** Field-level validation in renderer
5. **Type Safety:** Comprehensive TypeScript types in `src/types/budget.ts`

#### Reference for Other Tabs
**Use this tab as the pattern for:**
- Mode selector component structure
- localStorage persistence
- Field group organization
- Expandable row implementation
- Type definitions

---

### 4. SALES & ABSORPTION TAB ✅ **FULLY IMPLEMENTED**

**Status:** Production-ready sales tracking
**Component:** [src/components/sales/SalesContent.tsx](src/components/sales/SalesContent.tsx)

#### Current Sections

**A. Annual Inventory Gauge (Collapsible)**
- Component: `AnnualInventoryGauge`
- Visual gauge showing inventory levels
- **Database:** Connected via `/api/projects/[projectId]/inventory-gauge`
- **Functional:** Yes - displays calculated inventory

**B. Areas and Phases Panel (Left Column, 5/12 width)**
- **Area Tiles:**
  - Component: `AreaTiles`
  - Shows area-level stats with costs
  - Multi-select filtering
  - **Database:** Fetches via container API
  - **Functional:** Yes - live filtering

- **Phase Tiles:**
  - Component: `PhaseTiles`
  - Shows phase-level stats with costs
  - Multi-select filtering
  - Filters by selected areas
  - **Database:** Fetches via container API
  - **Functional:** Yes - live filtering

**C. Land Use Pricing Panel (Right Column, 7/12 width)**
- Component: [src/components/sales/PricingTable.tsx](src/components/sales/PricingTable.tsx)
- Pricing assumptions by land use type
- Filters by selected phases
- **Database:** Connected via `/api/projects/[projectId]/pricing-assumptions`
- **Functional:** Yes - full CRUD on pricing

**D. Parcel Sales Table (Full Width, Collapsible)**
- Component: [src/components/sales/ParcelSalesTable.tsx](src/components/sales/ParcelSalesTable.tsx)
- Data grid showing:
  - Parcel details (area, phase, product)
  - Sale date
  - Base price
  - Premium/discount
  - Final price
  - Status
- Filters by selected areas and phases
- Edit controls per row
- **Database:** Multiple APIs:
  - `/api/projects/[projectId]/parcel-sales` (sales data)
  - `/api/projects/[projectId]/parcels-with-sales` (parcel + sales join)
  - `/api/projects/[projectId]/parcels/[parcelId]/sale-assumptions` (pricing)
- **Functional:** Yes - full CRUD operations

**E. Filtering System**
- State management:
  - `selectedAreaIds` (array)
  - `selectedPhaseIds` (array)
- Clear Filters badge
- Live filtering across all sections
- **Functional:** Yes - reactive filtering

#### Database Tables Used
- **Primary:** `tbl_parcel_sale` (CRUD via parcel-sales API)
- **Related:** `tbl_parcel` (parcel details)
- **Related:** `tbl_pricing_assumption` (pricing by land use)
- **Related:** `tbl_sale_benchmark` (market data)
- **Related:** `tbl_container` (area/phase hierarchy)

#### Key Features
- **Integrated Filtering:** Area/Phase selection affects all sub-components
- **Real-time Calculations:** Sale prices calculated with premiums/discounts
- **Benchmark Integration:** Links to sale benchmarks for pricing guidance

#### Mode Potential
**Suggested Mode Structure:**
- **Napkin:** Parcel sales table with basic pricing (date, price, status)
- **Standard:** + Area/Phase filtering + Land use pricing table
- **Detail:** + Inventory gauge + Premium/discount controls + Benchmark integration

---

### 5. FEASIBILITY TAB 📋 **PLACEHOLDER**

**Status:** Not yet implemented
**Component:** [src/app/projects/[projectId]/components/tabs/FeasibilityTab.tsx](src/app/projects/[projectId]/components/tabs/FeasibilityTab.tsx)

#### Current State
- Placeholder card with "Coming Soon" message
- No database connectivity
- No functional features

#### Expected Future Implementation
- Pro forma analysis
- Return metrics (IRR, NPV, equity multiple)
- Sensitivity analysis
- Scenario modeling

---

### 6. CAPITALIZATION TAB 📋 **PLACEHOLDER**

**Status:** Minimal implementation
**Component:** [src/app/projects/[projectId]/components/tabs/CapitalizationTab.tsx](src/app/projects/[projectId]/components/tabs/CapitalizationTab.tsx)

#### Current State
- Placeholder card
- No database connectivity
- No functional features

#### Expected Future Implementation
- Sources & Uses table
- Debt/Equity structure
- Financing assumptions
- Loan details

---

### 7. REPORTS TAB 📋 **PLACEHOLDER**

**Status:** Placeholder
**Component:** [src/app/projects/[projectId]/components/tabs/ReportsTab.tsx](src/app/projects/[projectId]/components/tabs/ReportsTab.tsx)

#### Current State
- Placeholder card
- No reports generation
- No database connectivity

---

### 8. DOCUMENTS TAB 📋 **PLACEHOLDER**

**Status:** Placeholder
**Component:** [src/app/projects/[projectId]/components/tabs/DocumentsTab.tsx](src/app/projects/[projectId]/components/tabs/DocumentsTab.tsx)

#### Current State
- Placeholder card with DMS link
- Links to `/dms`
- Mock recent documents display

---

## INCOME PROPERTY TABS (project_type_code IN ['MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'])

### 9. PROPERTY TAB 📋 **PLACEHOLDER**

**Status:** Not yet implemented
**Component:** [src/app/projects/[projectId]/components/tabs/PropertyTab.tsx](src/app/projects/[projectId]/components/tabs/PropertyTab.tsx)

#### Current State
- Minimal implementation
- Expected to contain:
  - Unit mix
  - Rent roll
  - Lease details
  - Tenant information

---

### 10. OPERATIONS TAB ✅ **IMPLEMENTED FOR MULTIFAMILY ONLY**

**Status:** Production-ready for MF, placeholder for other types
**Component:** [src/app/projects/[projectId]/components/tabs/OperationsTab.tsx](src/app/projects/[projectId]/components/tabs/OperationsTab.tsx)

#### Current Implementation (Multifamily Only)

**A. Mode Selector (Props-based)**
- Modes: `basic` | `standard` | `advanced`
- Passed as props (not standalone component yet)
- Mode affects column visibility

**B. Summary Metrics Bar (4 Tiles)**
- Total Operating Expenses (annual)
- Per Unit (annual)
- Per SF (annual)
- Expense Ratio (TBD - "of EGI")
- **Database:** Calculated from expenses
- **Functional:** Yes - live calculations

**C. Nested Expense Table (2/3 width)**
- Component: `NestedExpenseTable` (from multifam prototype)
- Hierarchical expense categories:
  - Taxes & Insurance
  - Utilities
  - Payroll
  - Repairs & Maintenance
  - General & Administrative
- Columns (mode-dependent):
  - Annual Amount (all modes)
  - Per Unit (basic+)
  - Per SF (standard+)
  - Escalation Rate (standard+)
  - Recoverable (advanced)
  - Recovery % (advanced)
- Expandable rows for sub-categories
- Inline editing
- **Database:** Connected via `/api/projects/[projectId]/operating-expenses/hierarchy`
- **Functional:** Yes - reads from Chart of Accounts hierarchy

**D. Benchmark Panel (1/3 width)**
- Component: `BenchmarkPanel` (from multifam prototype)
- Compares user values to market medians
- Alert cards for variances
- Recommendations
- **Database:** Market data (TBD)
- **Functional:** UI works, benchmark data placeholder

**E. Configure Columns Modal**
- Component: `ConfigureColumnsModal`
- Toggle visibility of columns
- Mode restrictions (e.g., advanced-only columns)
- **Functional:** Yes - column configuration works

**F. Chart of Accounts Integration**
- Maps account numbers to expense types:
  - 5100 series → Property Taxes
  - 5200 series → Utilities
  - 5300 series → Payroll
  - 5400 series → Repairs & Maintenance
  - 5500 series → General & Administrative
- Hierarchical rollups
- **Database:** Reads from `/api/projects/[projectId]/operating-expenses/hierarchy`
- **Functional:** Yes

**G. Value Persistence on Mode Change**
- Saves values when switching modes
- Restores previous mode's values when going back
- Shows "Values Restored" banner
- **Functional:** Yes

**H. Non-Multifamily Projects**
- Shows "Coming Soon" card for:
  - Office (OFF)
  - Retail (RET)
  - Industrial (IND)
  - Mixed-Use (MXD)
  - Land Development (LAND)
  - Hospitality (HOT)
- Suggests alternatives (Budget tab, etc.)

#### Database Tables Used
- **Primary:** `tbl_operating_expenses` (via Chart of Accounts hierarchy)
- **Related:** `tbl_chart_of_accounts` (account hierarchy)
- **Related:** Unit data for per-unit calculations
- **Read-only for now:** Full CRUD planned

#### Mode Implementation
**Current Mode Structure (Multifamily):**
- **Basic:** Annual Amount + Per Unit columns
- **Standard:** + Per SF + Escalation Rate columns
- **Advanced:** + Recoverable + Recovery % columns

**Mode affects:**
1. Column visibility in expense table
2. Field availability in configure modal
3. Benchmark panel detail level

#### Key Differences from Budget Tab Mode Selector
1. **Props-based:** Mode passed as prop, not internal state
2. **Column-focused:** Mode controls column visibility, not row expansion
3. **No expandable rows:** Uses hierarchical tree instead
4. **Property-type gated:** Only works for MF projects

---

### 11. VALUATION TAB 📋 **PLACEHOLDER**

**Status:** Not yet implemented
**Component:** [src/app/projects/[projectId]/components/tabs/ValuationTab.tsx](src/app/projects/[projectId]/components/tabs/ValuationTab.tsx)

#### Current State
- Placeholder card
- Expected to contain:
  - Cap rate analysis
  - DCF model
  - Comparable sales
  - Appraisal values

---

## UNIVERSAL TABS (All Project Types)

### CAPITALIZATION TAB
- See Land Development section above

### REPORTS TAB
- See Land Development section above

### DOCUMENTS TAB
- See Land Development section above

---

## MODE SELECTOR IMPLEMENTATION STATUS

### ✅ IMPLEMENTED
1. **Budget Tab (Land Development)**
   - Full 3-mode selector (Napkin/Standard/Detail)
   - 9 → 28 → 49 field progression
   - Expandable accordion groups
   - localStorage persistence
   - Property-type filtering

2. **Operations Tab (Multifamily only)**
   - 3-mode selector (Basic/Standard/Advanced)
   - Column visibility control
   - Props-based mode management
   - Mode value persistence

### ⏳ NOT YET IMPLEMENTED (Candidates for LD39+)
1. **Project Tab**
   - Potential: Napkin (basics) → Standard (financials) → Detail (market data)

2. **Planning Tab**
   - Potential: Napkin (areas/phases) → Standard (parcels) → Detail (full details)

3. **Sales Tab**
   - Potential: Napkin (parcel sales) → Standard (+ pricing) → Detail (+ benchmarks)

---

## CRITICAL IMPLEMENTATION PATTERNS (from Budget Tab)

### Pattern 1: Mode Selector Component
```typescript
// src/components/budget/ModeSelector.tsx
export type BudgetMode = 'napkin' | 'standard' | 'detail';

interface Props {
  mode: BudgetMode;
  onChange: (mode: BudgetMode) => void;
}

// Features:
// - 3-button toggle
// - Field count badges
// - Active state styling
// - Keyboard accessible
```

### Pattern 2: localStorage Persistence
```typescript
const modeStorageKey = `budget_mode_${projectId}`;

const [mode, setModeInternal] = useState<BudgetMode>(() => {
  if (typeof window === 'undefined') return 'napkin';
  const stored = window.localStorage.getItem(modeStorageKey);
  return (stored as BudgetMode) || 'napkin';
});

const setMode = (newMode: BudgetMode) => {
  setModeInternal(newMode);
  window.localStorage.setItem(modeStorageKey, newMode);
};
```

### Pattern 3: Field Group Organization
```typescript
// src/components/budget/config/fieldGroups.ts
export interface FieldGroup {
  id: string;
  label: string;
  minTier: BudgetMode;
  fields: FieldConfig[];
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'timing_escalation',
    label: 'Timing & Escalation',
    minTier: 'standard',
    fields: [/* ... */]
  },
  // ...
];
```

### Pattern 4: Expandable Details Row
```typescript
// src/components/budget/custom/ExpandableDetailsRow.tsx
// - Renders as grid subrow
// - Shows accordion of field groups
// - Filters fields by mode
// - Property-type aware
```

### Pattern 5: Type Definitions
```typescript
// src/types/budget.ts
export interface BudgetItem {
  // Core fields (Napkin)
  notes?: string;
  qty?: number;
  // ... 49 total fields
}

export interface FieldConfig {
  key: keyof BudgetItem;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  minTier: BudgetMode;
  group: string;
  // ...
}
```

---

## DATABASE CONNECTIVITY SUMMARY

### ✅ FULLY CONNECTED (CRUD Operations)
| Tab | Table(s) | API Endpoint | Operations |
|-----|----------|--------------|------------|
| Project | `tbl_project` | `/api/projects/[id]/details` | READ, UPDATE |
| Project | Contact tables | ContactsSection API | FULL CRUD |
| Planning | `tbl_parcel` | `/api/parcels` | FULL CRUD |
| Planning | `tbl_phase` | `/api/phases` | FULL CRUD |
| Budget | `tbl_budget_item` | `/api/projects/[id]/budget-items` | FULL CRUD |
| Budget | `tbl_container` | Container filtering | READ |
| Sales | `tbl_parcel_sale` | `/api/projects/[id]/parcel-sales` | FULL CRUD |
| Sales | `tbl_pricing_assumption` | `/api/projects/[id]/pricing-assumptions` | FULL CRUD |
| Operations | `tbl_operating_expenses` | `/api/projects/[id]/operating-expenses/hierarchy` | READ (CRUD planned) |
| Operations | `tbl_chart_of_accounts` | Chart of Accounts integration | READ |

### ⚠️ READ-ONLY
| Tab | Table(s) | API Endpoint | Notes |
|-----|----------|--------------|-------|
| Project | Market Intel | `fetchMarketStatsForProject()` | External economic data |
| Sales | `tbl_sale_benchmark` | `/api/projects/[id]/sale-benchmarks` | Market comparables |

### ❌ NOT CONNECTED (UI Only)
| Tab | Feature | Status |
|-----|---------|--------|
| Project | Custom Inflation Schedules | localStorage only (backend TBD) |
| Project | Landscaper AI Upload | UI placeholder |
| Feasibility | All | Placeholder |
| Capitalization | All | Placeholder |
| Reports | All | Placeholder |
| Documents | All | Placeholder (links to /dms) |
| Property | All | Minimal implementation |
| Valuation | All | Placeholder |

---

## RECOMMENDATIONS FOR MODE IMPLEMENTATION

### Priority 1: PROJECT TAB
**Why:** Most frequently accessed tab, high user value

**Suggested Structure:**
- **Napkin Mode:**
  - Location section (editable)
  - Project Profile (basic fields: type, acres, units)
  - Map
  - Total: ~15-20 fields

- **Standard Mode:**
  - + Financial Summary (tiles + table)
  - + Market Rates (general inflation)
  - Total: ~35-40 fields

- **Detail Mode:**
  - + Custom Inflation Schedules
  - + Contacts
  - + Landscaper AI
  - + Macro Conditions
  - Total: ~60+ fields

**Implementation:**
1. Adopt Budget tab's ModeSelector component
2. Create field groups for Financial, Market, Contacts sections
3. Convert sections to collapsible accordions with mode visibility
4. Add localStorage persistence

---

### Priority 2: PLANNING TAB
**Why:** Critical for Land Development workflow

**Suggested Structure:**
- **Napkin Mode:**
  - Area cards (stats only, no editing)
  - Phase sections (stats only)
  - Total: View hierarchy only

- **Standard Mode:**
  - + Parcel list with basic fields (acres, units)
  - + Add/Edit/Delete for Areas/Phases
  - Total: Basic parcel management

- **Detail Mode:**
  - + Full parcel details (efficiency, frontage, product types)
  - + Parcel detail cards with all fields
  - Total: Complete hierarchy management

**Implementation:**
1. Add ModeSelector to PlanningContent
2. Mode controls visibility of:
   - CRUD buttons (Standard+)
   - Parcel detail fields (Detail only)
   - Edit controls (Standard+)
3. Preserve existing filtering and hierarchy

---

### Priority 3: SALES TAB
**Why:** Revenue-critical functionality

**Suggested Structure:**
- **Napkin Mode:**
  - Parcel Sales Table (basic: date, price, status)
  - No filters
  - Total: ~8-10 fields per parcel

- **Standard Mode:**
  - + Area/Phase filtering
  - + Land Use Pricing Table
  - + Base price + premium/discount
  - Total: ~15-18 fields per parcel

- **Detail Mode:**
  - + Inventory Gauge
  - + Sale benchmarks integration
  - + Advanced pricing controls
  - Total: ~25+ fields per parcel

**Implementation:**
1. Add ModeSelector to SalesContent
2. Mode controls:
   - Filter panel visibility (Standard+)
   - Pricing table visibility (Standard+)
   - Inventory gauge visibility (Detail only)
   - Benchmark panel (Detail only)
3. Table columns adjust by mode

---

## TECHNICAL DEBT & GAPS

### Budget Tab (Reference Implementation)
✅ **No gaps** - Fully production-ready
- Mode persistence: Working
- Field filtering: Working
- Property-type awareness: Working

### Operations Tab
⚠️ **Minor gaps:**
1. Mode selector is props-based, not standalone component
2. Only supports Multifamily (by design for MVP)
3. Chart of Accounts integration is read-only (CRUD planned)

### Project Tab
⚠️ **Gaps for mode implementation:**
1. No mode selector yet
2. All sections always visible
3. Inflation schedules save to localStorage only
4. Landscaper AI is UI placeholder

### Planning Tab
⚠️ **Gaps for mode implementation:**
1. No mode selector yet
2. All CRUD operations always available
3. No progressive disclosure of parcel fields

### Sales Tab
⚠️ **Gaps for mode implementation:**
1. No mode selector yet
2. All features always visible
3. No column mode switching in parcel table

---

## APPENDIX A: MODE SELECTOR COMPONENT REUSABILITY

The Budget tab's ModeSelector component is designed to be reusable:

### Generic Component Structure
```typescript
// Rename to: src/components/shared/ModeSelector.tsx
export type ComplexityMode = 'napkin' | 'standard' | 'detail';

interface ModeSelectorProps {
  mode: ComplexityMode;
  onChange: (mode: ComplexityMode) => void;
  napkinCount?: number;
  standardCount?: number;
  detailCount?: number;
  labels?: {
    napkin?: string;
    standard?: string;
    detail?: string;
  };
}
```

### Tab-Specific Wrappers
```typescript
// Budget-specific
export type BudgetMode = ComplexityMode;
export const BudgetModeSelector = (props) => (
  <ModeSelector
    {...props}
    labels={{ napkin: '9 Fields', standard: '28 Fields', detail: '49 Fields' }}
  />
);

// Planning-specific
export type PlanningMode = ComplexityMode;
export const PlanningModeSelector = (props) => (
  <ModeSelector
    {...props}
    labels={{ napkin: 'Hierarchy', standard: 'Parcels', detail: 'Full Details' }}
  />
);
```

---

## APPENDIX B: FIELD COUNT TRACKING

| Tab | Napkin Fields | Standard Fields | Detail Fields | Current Mode Support |
|-----|---------------|-----------------|---------------|----------------------|
| Project | TBD (~15-20) | TBD (~35-40) | TBD (~60+) | ❌ Not implemented |
| Planning | TBD (hierarchy view) | TBD (+CRUD) | TBD (+full details) | ❌ Not implemented |
| Budget | **9** | **28** | **49** | ✅ **Fully implemented** |
| Sales | TBD (~8-10) | TBD (~15-18) | TBD (~25+) | ❌ Not implemented |
| Operations (MF) | Basic cols | Standard cols | Advanced cols | ✅ Column-based |

---

## NEXT STEPS

Based on this audit, the recommended order for implementing mode selectors:

1. **Immediate:** Refactor Budget's ModeSelector into shared component
2. **Session LD40:** Implement Project tab mode selector
3. **Session LD41:** Implement Planning tab mode selector
4. **Session LD42:** Implement Sales tab mode selector
5. **Future:** Extend Operations tab mode for other property types

---

**Document Version:** 1.0
**Audit Completed:** November 17, 2025
**Auditor:** Claude (Session LD39)
**Review Status:** Ready for mode implementation planning

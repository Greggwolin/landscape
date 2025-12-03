# Phase 4: Feasibility/Valuation Tab - Complete

**Date**: 2025-11-20
**Branch**: `feature/nav-restructure-phase4`
**Status**: ✅ Complete

## Overview

Phase 4 successfully implements the Feasibility/Valuation Tab with two subtabs: Market Data and Sensitivity Analysis. This provides comprehensive tools for market research, comparable tracking, and assumption testing with real-time financial impact calculations.

## Implemented Features

### 1. Feasibility Tab Navigation Structure

**Location**: New main tab in navigation restructure

**Sub-tabs**:
- **Market Data**: Track comparable land sales, housing prices, and absorption rates
- **Sensitivity Analysis**: Test assumptions with ±100% sliders and view IRR/NPV impact

### 2. Market Data Subtab

**Route**: `/projects/[projectId]/feasibility/market-data`

**Three Collapsible Sections**:

#### A. Comparable Land Sales
- Property name, location, sale date
- Acres, price per acre, total price
- Add/Edit/Delete via modal dialog

#### B. Housing Price Comparables
- Project name, location, product type
- Average price, price per SF, date reported
- Full CRUD functionality

#### C. Absorption Rate Comparables
- Project name, location, product type
- Monthly/annual absorption rates, date reported
- Complete CRUD operations

**Features**:
- Reusable ComparablesTable component
- Modal-based add/edit forms (per user clarification: Option A)
- Type-aware formatting (currency, number, date)
- Empty state messages
- Delete confirmation with optimistic UI

### 3. Sensitivity Analysis Subtab

**Route**: `/projects/[projectId]/feasibility/sensitivity`

**Assumption Sliders** (±100% range):
- Units Sold
- Price Per Unit
- Absorption Rate (units/month)
- Development Cost
- Operating Expenses
- Discount Rate

**Impact Metric Cards**:

1. **Residual Land Value**
   - Prominently displayed
   - Red card with warning when negative (per user clarification: Option B - inline)
   - Formula: `(Revenue - Costs) / (1 + discount rate)`

2. **Internal Rate of Return (IRR)**
   - Uses Newton-Raphson method from existing calculation engine
   - Displays "N/A" with info tooltip if doesn't converge (per user clarification: Option A)
   - Percentage format

3. **Net Present Value (NPV)**
   - Color-coded (green positive, red negative)
   - Currency format

**Calculation Behavior**:
- Real-time updates with 300ms debounce (per user clarification: Option A)
- Loading spinner during calculation
- Uses existing `calculateIRR` and `calculateNPV` from [src/lib/calculations/metrics.ts](src/lib/calculations/metrics.ts:66-118)

**Saved Scenarios**:
- Per-project (all users see same scenarios) (per user clarification: Option B)
- Chip-based UI for quick load/delete
- Stores assumption adjustments + calculated metrics
- Scenario name input with validation

**Reset Functionality**:
- "Reset All" button to return all sliders to 0%
- Immediately recalculates base case

### 4. Base Assumptions Data Source

**Endpoint**: GET `/api/projects/[projectId]/assumptions/base`

**Dynamic Calculation** (per user clarification: Option C):
- Units Sold: Count from `tbl_parcel` where `current_value_per_unit > 0`
- Price Per Unit: Average of `current_value_per_unit` from parcels
- Absorption Rate: Units sold / 12 (default 12-month sellout)
- Development Cost: Sum of `core_fin_fact_budget.amount`
- Operating Expenses: Sum of annual opex from `tbl_operating_expenses`
- Discount Rate: Default 10%

**No new assumptions table created** - all derived from existing project data.

## API Endpoints

### Market Data CRUD

**Land Sales**:
- `GET /api/projects/[projectId]/market-data/land-sales`
- `POST /api/projects/[projectId]/market-data/land-sales`
- `PUT /api/projects/[projectId]/market-data/land-sales/[id]`
- `DELETE /api/projects/[projectId]/market-data/land-sales/[id]`

**Housing Prices**:
- `GET /api/projects/[projectId]/market-data/housing-prices`
- `POST /api/projects/[projectId]/market-data/housing-prices`
- `PUT /api/projects/[projectId]/market-data/housing-prices/[id]`
- `DELETE /api/projects/[projectId]/market-data/housing-prices/[id]`

**Absorption Rates**:
- `GET /api/projects/[projectId]/market-data/absorption-rates`
- `POST /api/projects/[projectId]/market-data/absorption-rates`
- `PUT /api/projects/[projectId]/market-data/absorption-rates/[id]`
- `DELETE /api/projects/[projectId]/market-data/absorption-rates/[id]`

### Sensitivity Analysis

**Base Assumptions**:
```http
GET /api/projects/[projectId]/assumptions/base
```

**Response**:
```json
{
  "units_sold": 100,
  "price_per_unit": 500000,
  "absorption_rate": 8.33,
  "development_cost": 25000000,
  "operating_expenses": 1200000,
  "discount_rate": 0.10
}
```

**Calculate Sensitivity**:
```http
POST /api/projects/[projectId]/sensitivity/calculate
```

**Request**:
```json
{
  "adjustments": {
    "units_sold": {
      "baseValue": 100,
      "adjustment": 20,
      "adjustedValue": 120
    },
    "price_per_unit": {
      "baseValue": 500000,
      "adjustment": -10,
      "adjustedValue": 450000
    }
  }
}
```

**Response**:
```json
{
  "landValue": 28500000,
  "irr": 0.15,
  "npv": 5200000,
  "calculatedAt": "2025-11-20T12:00:00.000Z"
}
```

**Note**: IRR may be `null` if calculation doesn't converge.

### Saved Scenarios

**Get All Scenarios**:
```http
GET /api/projects/[projectId]/scenarios
```

**Response**:
```json
{
  "scenarios": [
    {
      "id": 1,
      "name": "Optimistic Case",
      "assumptions": {
        "units_sold": 20,
        "price_per_unit": 15,
        "absorption_rate": 10
      },
      "metrics": {
        "landValue": 32000000,
        "irr": 0.18,
        "npv": 8500000
      },
      "created_at": "2025-11-20T10:30:00.000Z"
    }
  ]
}
```

**Save Scenario**:
```http
POST /api/projects/[projectId]/scenarios
```

**Request**:
```json
{
  "name": "Conservative Case",
  "assumptions": {
    "units_sold": -15,
    "price_per_unit": -10
  },
  "metrics": {
    "landValue": 18000000,
    "irr": 0.08,
    "npv": 2100000
  }
}
```

**Delete Scenario**:
```http
DELETE /api/projects/[projectId]/scenarios/[scenarioId]
```

## Database Schema

### Migration 027: Market Data Tables

**File**: `backend/migrations/027_market_data_tables.sql`

**Tables**:

```sql
CREATE TABLE landscape.market_data_land_sales (
  comp_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  property_name VARCHAR(200),
  location VARCHAR(200),
  sale_date DATE,
  acres NUMERIC(10, 2),
  price_per_acre NUMERIC(12, 2),
  total_price NUMERIC(14, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE landscape.market_data_housing_prices (
  comp_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  project_name VARCHAR(200),
  location VARCHAR(200),
  product_type VARCHAR(100),
  avg_price NUMERIC(12, 2),
  price_per_sf NUMERIC(8, 2),
  date_reported DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE landscape.market_data_absorption_rates (
  comp_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  project_name VARCHAR(200),
  location VARCHAR(200),
  product_type VARCHAR(100),
  monthly_absorption NUMERIC(6, 2),
  annual_absorption NUMERIC(6, 2),
  date_reported DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Migration 028: Sensitivity Scenarios

**File**: `backend/migrations/028_sensitivity_scenarios.sql`

**Table**:

```sql
CREATE TABLE landscape.sensitivity_scenarios (
  scenario_id SERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES landscape.tbl_project(project_id) ON DELETE CASCADE,
  scenario_name VARCHAR(200) NOT NULL,
  assumptions JSONB NOT NULL, -- { "units_sold": -10, "price_per_unit": 15, ... }
  metrics JSONB NOT NULL,     -- { "landValue": 1500000, "irr": 0.12, "npv": 2500000 }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── assumptions/
│   │           │   └── base/
│   │           │       └── route.ts                      [NEW]
│   │           ├── market-data/
│   │           │   ├── land-sales/
│   │           │   │   ├── route.ts                      [NEW]
│   │           │   │   └── [id]/
│   │           │   │       └── route.ts                  [NEW]
│   │           │   ├── housing-prices/
│   │           │   │   ├── route.ts                      [NEW]
│   │           │   │   └── [id]/
│   │           │   │       └── route.ts                  [NEW]
│   │           │   └── absorption-rates/
│   │           │       ├── route.ts                      [NEW]
│   │           │       └── [id]/
│   │           │           └── route.ts                  [NEW]
│   │           ├── scenarios/
│   │           │   ├── route.ts                          [NEW]
│   │           │   └── [scenarioId]/
│   │           │       └── route.ts                      [NEW]
│   │           └── sensitivity/
│   │               └── calculate/
│   │                   └── route.ts                      [NEW]
│   └── projects/
│       └── [projectId]/
│           └── feasibility/
│               ├── market-data/
│               │   └── page.tsx                          [NEW]
│               └── sensitivity/
│                   └── page.tsx                          [NEW]
├── components/
│   └── feasibility/
│       ├── FeasibilitySubNav.tsx                         [NEW]
│       ├── ComparablesTable.tsx                          [NEW]
│       ├── ComparableModal.tsx                           [NEW]
│       ├── MarketDataContent.tsx                         [NEW]
│       └── SensitivityAnalysisContent.tsx                [NEW]
└── lib/
    └── calculations/
        ├── metrics.ts                                     [EXISTING - REUSED]
        └── sensitivity.ts                                 [EXISTING - NOT USED IN PHASE 4]

backend/
└── migrations/
    ├── 027_market_data_tables.sql                        [NEW - not committed]
    └── 028_sensitivity_scenarios.sql                     [NEW - not committed]

package.json                                               [UPDATED - added use-debounce]
```

## Integration Points

### 1. Navigation Structure

**Feasibility Tab**:
- New main tab in top navigation (to be wired in Phase 7)
- Uses FeasibilitySubNav for secondary navigation
- Sub-tab routing via Next.js App Router

### 2. Existing Calculation Engine

**Leveraged Functions**:
- `calculateIRR()` from [src/lib/calculations/metrics.ts](src/lib/calculations/metrics.ts:71-118)
- `calculateNPV()` from [src/lib/calculations/metrics.ts](src/lib/calculations/metrics.ts:123-141)

**Not Used** (different use case):
- `runFullSensitivityAnalysis()` from [src/lib/calculations/sensitivity.ts](src/lib/calculations/sensitivity.ts:143-402)
- Phase 4 uses simpler slider-based approach vs. comprehensive ±10%/±20% variance testing

### 3. Project Context

**ProjectContextBar**: Displayed on all Feasibility pages
**Project ID**: Passed through route params to all components

## Design System Compliance

### Button Classes Used

**Primary Actions**:
- `btn btn-primary` - Add Comparable, Save Scenario
- `btn btn-success` - (Future: scenario confirmation)

**Secondary Actions**:
- `btn btn-secondary` - Modal cancel
- `btn btn-ghost-secondary` - Edit/Reset buttons
- `btn btn-ghost-danger` - Delete comparable

**Sizes**:
- `btn-sm` - Icon-only buttons in tables

### Components Used

**CoreUI Components**:
- `CCard`, `CCardBody`, `CCardHeader` - Container cards
- `CTable`, `CTableHead`, `CTableBody` - Comparables tables
- `CModal`, `CModalHeader`, `CModalBody`, `CModalFooter` - Add/Edit dialogs
- `CForm`, `CFormLabel`, `CFormInput` - Form controls
- `CButton` - All actions
- `CBadge` - Scenario chips
- `CSpinner` - Loading states
- `CNav`, `CNavItem`, `CNavLink` - Sub-tab navigation
- `CRow`, `CCol` - Grid layout

### CSS Custom Properties

**Colors**:
- `--cui-card-bg` - Card backgrounds
- `--cui-border-color` - Borders
- `--cui-body-color` - Primary text
- `--cui-secondary-color` - Muted text
- `--cui-primary` - Active states, adjusted values
- `--cui-success` - Positive metrics
- `--cui-danger` - Negative land value, negative NPV
- `--cui-tertiary-bg` - Sub-nav background

**Layout**:
- `d-flex`, `justify-content-between`, `align-items-center`
- `gap-2`, `gap-3`
- `mb-2`, `mb-3`, `p-3`, `p-4`

### Accessibility

**ARIA Labels**:
- "Add [Comparable Type]" - Add buttons
- "Edit comparable" - Edit buttons
- "Delete comparable" - Delete buttons
- "Delete [Scenario Name]" - Scenario delete icons
- "Reset all adjustments" - Reset button

**Form Validation**:
- Required field feedback
- Type validation (number, currency, date)
- Visual error states with `invalid` prop

**Keyboard Navigation**:
- Tab order logical
- Enter submits forms
- Escape closes modals
- Sliders keyboard-accessible

## Testing Checklist

### Visual Testing
- ✅ Sub-tab navigation switches correctly
- ✅ Comparables tables render with proper formatting
- ✅ Empty states display appropriate messages
- ✅ Modal dialogs open/close smoothly
- ✅ Impact cards layout responsive
- ✅ Negative land value shows red warning
- ✅ Sliders render with correct range (-100 to +100)
- ✅ Scenario chips display/delete correctly
- ✅ Loading spinners appear during calculations
- ✅ Dark mode styling works

### Functional Testing
- ✅ Add comparable saves to database
- ✅ Edit comparable updates existing record
- ✅ Delete comparable removes from list
- ✅ Base assumptions fetch from project data
- ✅ Slider adjustment triggers debounced calculation
- ✅ IRR displays "N/A" when doesn't converge
- ✅ NPV calculates correctly
- ✅ Land value formula accurate
- ✅ Reset button returns sliders to 0%
- ✅ Save scenario persists to database
- ✅ Load scenario restores adjustments and metrics
- ✅ Delete scenario removes from list

### Data Integrity Testing
- ✅ Comparables isolated by project_id
- ✅ Scenarios isolated by project_id
- ✅ Cascade delete removes comparables when project deleted
- ✅ Cascade delete removes scenarios when project deleted
- ✅ JSONB fields store/retrieve correctly
- ✅ Date fields format consistently (YYYY-MM-DD)
- ✅ Currency values round to cents
- ✅ Percentage calculations precise

## Dependencies Added

**NPM Package**:
- `use-debounce@^10.0.4` - Debounced callback hook for slider calculations

**Installation**:
```bash
npm install use-debounce --legacy-peer-deps
```

## Known Limitations & Future Enhancements

### Phase 4 Limitations

1. **Simplified IRR Calculation**: Uses basic cash flow projection (even monthly distribution). Full implementation should use detailed timing from project schedule.

2. **No External Data Integration**: Comparables are manually entered. Future: integrate with MLS, CoStar, or other market data APIs.

3. **Static Assumption List**: Six hardcoded assumptions. Future: allow users to add custom assumptions.

4. **No Scenario Comparison**: Can load one scenario at a time. Future: side-by-side scenario comparison table.

5. **No Tornado Chart**: Sensitivity results shown in cards. Future: tornado chart visualization showing assumption impact ranking.

### Future Enhancements (Post-Phase 4)

1. **Assumption Templates**: Save/load assumption sets for different project types (residential, commercial, mixed-use).

2. **Monte Carlo Simulation**: Run probabilistic scenarios with defined ranges for each assumption.

3. **Export Functionality**: Export comparables and sensitivity results to Excel/PDF.

4. **Historical Tracking**: Track how assumptions change over time (audit log).

5. **Market Data Charts**: Visualize comparable trends (pricing over time, absorption rate trends).

6. **Scenario Sharing**: Share scenarios with external stakeholders via link.

7. **Bulk Import**: CSV upload for comparables data.

8. **Advanced Formulas**: Allow users to define custom land value formulas.

## Acceptance Criteria

Phase 4 is complete when:

1. ✅ Market Data page displays three collapsible comparable sections
2. ✅ Add/Edit/Delete functionality works for all comparable types
3. ✅ Modal dialogs validate inputs and show errors
4. ✅ Sensitivity Analysis page displays six assumption sliders
5. ✅ Sliders adjust ±100% with real-time calculation (300ms debounce)
6. ✅ Impact cards show Land Value, IRR, NPV with proper formatting
7. ✅ Negative land value displays inline red warning
8. ✅ IRR shows "N/A" with tooltip when doesn't converge
9. ✅ Save scenario persists adjustments and metrics
10. ✅ Load scenario restores previous state
11. ✅ Delete scenario removes chip and database record
12. ✅ Base assumptions calculated from existing project data
13. ✅ All API endpoints handle errors gracefully
14. ✅ Database migrations create tables with correct schema
15. ✅ No TypeScript errors or console warnings
16. ✅ Works in both light and dark themes

## Performance Considerations

- React Query caching prevents redundant API calls
- 300ms debounce prevents excessive calculations during slider dragging
- useMemo for computed values (adjusted values, formatted strings)
- Optimistic UI updates for delete operations
- JSONB columns indexed for fast scenario queries
- Pagination not needed (comparables typically <100 per project)

## Migration Instructions

**Run migrations manually** (not committed to git per .gitignore):

```bash
# Connect to database
psql $DATABASE_URL

# Run migrations
\i backend/migrations/027_market_data_tables.sql
\i backend/migrations/028_sensitivity_scenarios.sql
```

**Verify migrations**:
```sql
-- Check tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'landscape'
  AND tablename LIKE 'market_data%' OR tablename = 'sensitivity_scenarios';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'landscape'
  AND indexname LIKE 'idx_market%' OR indexname LIKE 'idx_sensitivity%';
```

## User Clarifications Applied

All 8 user clarifications from Phase 4 Step 1 were implemented:

1. **IRR/NPV Calculation**: Option A - New `/sensitivity/calculate` endpoint calling existing functions ✅
2. **Base Assumptions**: Option C - Calculated dynamically from project data ✅
3. **Market Data Pre-population**: Option A - Start empty, manual entry only ✅
4. **Calculation Performance**: Option A - Real-time with 300ms debounce ✅
5. **IRR Convergence**: Option A - Display "N/A" with tooltip ✅
6. **Negative Land Value**: Option B - Inline next to Land Value card (red background) ✅
7. **Scenarios Scope**: Option B - Per-project (all users see same) ✅
8. **Market Data CRUD**: Option A - Modal dialogs for add/edit ✅

---

**Phase 4 Status**: ✅ **COMPLETE**

**Ready for**: Phase 5 (Capitalization Tab)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

# Grid/Table Component Inventory

> **Audit Date:** 2026-01-09
> **Purpose:** Comprehensive inventory for ARGUS-style tabular input standardization effort

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Grid/Table Components** | 28 |
| **Fully DB-Connected** | 23 (82%) |
| **Inline Editing Support** | 15 (54%) |
| **Full CRUD Support** | 12 (43%) |
| **Read-Only Components** | 13 (46%) |

### Library Distribution

| Library | Components | Status |
|---------|------------|--------|
| TanStack React Table | 6 | **PRIMARY** - Recommended |
| AG Grid Community | 3 | SECONDARY - Complex grids |
| CoreUI CTable | 7 | ACCEPTABLE - Read-only views |
| Native HTML Table | 9 | ACCEPTABLE - Simple displays |
| react-data-grid | 2 | **DEPRECATED** |
| Handsontable | 1 | **DEPRECATED** |

---

## 1. Component Inventory Table

| Component Name | File Path | Grid Library | DB Connected | CRUD Status | Inline Edit | Notes |
|----------------|-----------|--------------|--------------|-------------|-------------|-------|
| BudgetDataGrid | `src/components/budget/BudgetDataGrid.tsx` | TanStack | Yes | Full CRUD | Yes | Primary budget grid, uses useBudgetData hook |
| BudgetGridTab | `src/components/budget/BudgetGridTab.tsx` | Wrapper | Yes | Full CRUD | Yes | Orchestrates BudgetDataGrid + modals |
| BudgetGanttGrid | `src/components/budget/BudgetGanttGrid.tsx` | SVAR Gantt | Yes | Full CRUD | Yes | Timeline/Gantt view of budget items |
| SimpleBudgetGrid | `src/components/budget/SimpleBudgetGrid.tsx` | react-data-grid | Yes | Read + Update | Yes | MVP grid, being replaced |
| BasicBudgetTable | `src/components/budget/BasicBudgetTable.tsx` | HTML Table | Yes | Read-only | No | Simple display table |
| RentRollGrid | `src/app/rent-roll/components/RentRollGrid.tsx` | AG Grid | Yes | Full CRUD | Yes | Multifamily rent roll with leases |
| FloorplansGrid | `src/app/rent-roll/components/FloorplansGrid.tsx` | AG Grid | Yes | Full CRUD | Yes | Unit type/floorplan management |
| UniversalInventoryTable | `src/app/components/UniversalInventory/UniversalInventoryTable.tsx` | AG Grid | Yes | Full CRUD | Yes | Dynamic columns per property type |
| ParcelSalesTable | `src/components/sales/ParcelSalesTable.tsx` | TanStack | Yes | Full CRUD | Partial | Sale period editing, phase assignment |
| PricingTable | `src/components/sales/PricingTable.tsx` | TanStack | Yes | Full CRUD | Yes | Pricing assumptions |
| TransactionGrid | `src/components/sales/TransactionGrid.tsx` | TanStack | Yes | Read-only | No | Transaction display |
| DebtFacilitiesTable | `src/components/capitalization/DebtFacilitiesTable.tsx` | CoreUI | Yes | Full CRUD | No | Modal editing only |
| EquityPartnersTable | `src/components/capitalization/EquityPartnersTable.tsx` | CoreUI | Yes | Full CRUD | No | Modal editing only |
| DrawScheduleTable | `src/components/capitalization/DrawScheduleTable.tsx` | CoreUI | Props | Read-only | No | Display only |
| WaterfallStructureTable | `src/components/capitalization/WaterfallStructureTable.tsx` | CoreUI | Props | Read-only | No | Display only |
| DeveloperFeesTable | `src/components/capitalization/DeveloperFeesTable.tsx` | CoreUI | Yes | Full CRUD | No | Modal editing only |
| ManagementOverheadTable | `src/components/capitalization/ManagementOverheadTable.tsx` | CoreUI | Yes | Full CRUD | No | Modal editing only |
| WaterfallDistributionTable | `src/components/capitalization/WaterfallDistributionTable.tsx` | CoreUI | Props | Read-only | No | Display only |
| CashFlowTable | `src/components/analysis/cashflow/CashFlowTable.tsx` | HTML Table | Props | Read-only | No | Financial statement display |
| CashFlowPhaseTable | `src/components/analysis/cashflow/CashFlowPhaseTable.tsx` | HTML Table | Props | Read-only | No | Phase-level cash flow |
| ComparablesTable | `src/components/feasibility/ComparablesTable.tsx` | HTML Table | Yes | Full CRUD | No | Modal editing, reusable |
| ProjectTable | `src/components/dashboard/ProjectTable.tsx` | HTML Table | Yes | Read-only | No | Project list |
| DataTableModal | `src/components/landscaper/DataTableModal.tsx` | HTML Table | Props | Read-only | No | AI response tables |
| ResultsTable | `src/components/dms/search/ResultsTable.tsx` | HTML Table | Yes | Read-only | No | Document search results |
| PlanningContentHot | `src/app/components/Archive/PlanningContentHot.tsx` | Handsontable | Yes | Full CRUD | Yes | **ARCHIVED** - Land use editing |
| PlanningContentGrid | `src/app/components/Archive/PlanningContentGrid.tsx` | react-data-grid | Yes | Full CRUD | Yes | **ARCHIVED** - Planning data |
| LandUseInputTableTanStack | `src/app/components/Admin/LandUseInputTableTanStack.tsx` | TanStack | Yes | Full CRUD | Yes | Admin land use taxonomy |
| ExtractionHistoryReport | `src/components/reports/ExtractionHistoryReport.tsx` | TanStack | Yes | Read-only | No | Document extraction history |

---

## 2. Detailed Component Analysis

### Budget Components

#### BudgetDataGrid

**Location:** `src/components/budget/BudgetDataGrid.tsx`

**Purpose:** Primary budget line item grid with hierarchical grouping, variance display, and inline editing.

**Grid Technology:**
- Library: TanStack React Table v8
- Features: Column resizing, custom cell renderers, expandable rows

**Data Source:**
- Hook: `useBudgetData` (src/components/budget/hooks/useBudgetData.ts)
- API Endpoint: `/api/budget/gantt?projectId={id}`
- Database Table: `core_fin_fact_budget`

**Current Capabilities:**
- [x] Read data from DB
- [x] Create new rows (via modal)
- [x] Update existing rows (inline)
- [x] Update existing rows (modal)
- [x] Delete rows
- [ ] Bulk operations
- [ ] Virtual scrolling
- [x] Column sorting (limited)
- [ ] Column filtering
- [x] Column reordering
- [ ] Column show/hide
- [x] Row grouping/hierarchy
- [x] Subtotals/aggregations

**UI Characteristics:**
- Row height: ~40px
- Inline dropdowns: Yes (UOM, Phase, Category via custom cells)
- Color coding: Variance indicators (red/green)
- Edit mode trigger: Click on editable cell

**Editable Fields:**
- qty, rate, uom_code, notes, division_id, activity
- start_period, periods_to_complete, start_date, end_date
- vendor_name, escalation_rate, contingency_pct
- timing_method, funding_id, curve_id, milestone_id
- category_l1_id through category_l4_id

**Known Issues/Limitations:**
- No virtualization for large datasets (>5000 rows may lag)
- Category editing requires expandable row, not inline dropdown
- No multi-select/bulk operations

**ARGUS Parity Gap:**
- Need denser row height (28-32px)
- Need keyboard navigation (arrow keys, tab between cells)
- Need copy/paste support
- Need inline category dropdown (not expandable row)

---

#### BudgetGridTab

**Location:** `src/components/budget/BudgetGridTab.tsx`

**Purpose:** Container component orchestrating BudgetDataGrid, modals, filters, and mode selector.

**Data Source:**
- Hook: `useBudgetData` (passed to BudgetDataGrid)
- Uses `useContainers` for phase filtering
- Uses `useProjectInflationSettings` for escalation

**Key Features:**
- Mode selector (Napkin/Standard/Detail)
- Container filtering (Area/Phase)
- Timeline toggle
- Quick-add category modal
- CRUD operations coordination

---

### Multifamily Components

#### RentRollGrid

**Location:** `src/app/rent-roll/components/RentRollGrid.tsx`

**Purpose:** Full rent roll with lease data, metrics, and floorplan auto-fill.

**Grid Technology:**
- Library: AG Grid Community v33+
- Features: Pinned columns, cell editors, custom renderers

**Data Source:**
- Hook: SWR with custom fetchers
- API Endpoints:
  - `/api/multifamily/leases?project_id={id}`
  - `/api/multifamily/units?project_id={id}`
  - `/api/multifamily/unit-types?project_id={id}`
- Database Tables: `tbl_lease`, `tbl_unit`, `tbl_unit_type`

**Current Capabilities:**
- [x] Read data from DB
- [x] Create new rows
- [x] Update existing rows (inline)
- [x] Delete rows
- [ ] Bulk operations
- [x] Virtual scrolling (AG Grid built-in)
- [x] Column sorting
- [x] Column filtering (basic)
- [ ] Column reordering
- [ ] Column show/hide
- [ ] Row grouping/hierarchy
- [x] Subtotals/aggregations (metrics tiles)

**UI Characteristics:**
- Row height: 36px
- Inline dropdowns: Yes (unit type)
- Color coding: Lease status badges, floorplan indicator
- Edit mode trigger: Click on cell

**Editable Fields:**
- unit_number, building_name, unit_type
- bedrooms, bathrooms, other_features
- base_rent_monthly, lease dates

**Auto-Fill Feature:**
When unit_type is changed, automatically populates:
- bedrooms, bathrooms, square_feet, market_rent (from floorplan)

**Known Issues/Limitations:**
- Loss-to-lease calculated on every render
- FloorplanUpdateDialog flow could be streamlined

**ARGUS Parity Gap:**
- Already close to ARGUS density
- Could add keyboard navigation
- Need bulk operations for move-in/move-out

---

#### FloorplansGrid

**Location:** `src/app/rent-roll/components/FloorplansGrid.tsx`

**Purpose:** Unit type / floorplan definition and market rent management.

**Grid Technology:**
- Library: AG Grid Community
- Features: Number editors, currency formatting

**Data Source:**
- API: `/api/multifamily/unit-types?project_id={id}`
- Database Table: `tbl_unit_type`

**Current Capabilities:**
- [x] Full CRUD
- [x] Inline editing
- [x] Auto-save on change

**Editable Fields:**
- unit_type_code, bedrooms, bathrooms
- avg_square_feet, current_market_rent, total_units
- notes, other_features

---

### Sales Components

#### ParcelSalesTable

**Location:** `src/components/sales/ParcelSalesTable.tsx`

**Purpose:** Parcel sales schedule with sale phase grouping and pricing.

**Grid Technology:**
- Library: TanStack React Table
- Features: Custom sorting, cell renderers

**Data Source:**
- Hooks: `useParcelsWithSales`, `useAssignParcelToPhase`, `useCreateSalePhase`
- API: `/api/projects/{id}/parcels-with-sales/`
- Database Tables: `tbl_parcel`, `tbl_sale_phase`, `tbl_sale_event`

**Current Capabilities:**
- [x] Read data from DB
- [x] Create sale phases
- [x] Update sale period (inline)
- [x] Assign parcels to phases
- [ ] Bulk operations
- [x] Column sorting

**Editable Fields:**
- sale_period (number input)
- sale_phase (dropdown with create option)

**Known Issues/Limitations:**
- Growth rate display only (not editable inline)
- No bulk parcel assignment

---

#### PricingTable

**Location:** `src/components/sales/PricingTable.tsx`

**Purpose:** Pricing assumptions per product type.

**Grid Technology:**
- Library: TanStack React Table
- Database Tables: `tbl_pricing_assumption`

**Current Capabilities:**
- [x] Full CRUD
- [x] Inline editing (price, growth rate)
- [x] Benchmark save/load

---

### Capitalization Components

All capitalization tables use **CoreUI CTable** with props-based data and modal editing:

| Component | Table | Editable | Notes |
|-----------|-------|----------|-------|
| DebtFacilitiesTable | tbl_debt_facility | Modal | Facility CRUD |
| EquityPartnersTable | tbl_equity_partner | Modal | Partner CRUD |
| DrawScheduleTable | - | No | Calculated |
| WaterfallStructureTable | - | No | Display |
| DeveloperFeesTable | tbl_developer_fee | Modal | Fee CRUD |
| ManagementOverheadTable | tbl_overhead_item | Modal | Overhead CRUD |
| WaterfallDistributionTable | - | No | Calculated |

**ARGUS Parity Gap:**
- All need inline editing conversion
- Should migrate to TanStack for consistency
- Need dense ARGUS-style layout

---

### Analysis Components

#### CashFlowTable

**Location:** `src/components/analysis/cashflow/CashFlowTable.tsx`

**Purpose:** Project cash flow statement with time periods as columns.

**Grid Technology:**
- Library: Native HTML with CTable wrapper
- Data: Props-based (AggregatedSchedule)

**Characteristics:**
- Read-only display
- Accounting-style formatting (parentheses for negatives)
- Section headers with indentation

**ARGUS Parity Gap:**
- Already has good density
- Could add collapsible sections
- Consider frozen first column

---

### Archive/Legacy Components

#### PlanningContentHot (DEPRECATED)

**Location:** `src/app/components/Archive/PlanningContentHot.tsx`

**Purpose:** Land use and parcel editing with Handsontable.

**Status:** **ARCHIVED - Do not extend**

**Reason for Deprecation:**
- License complexity
- TanStack provides better DX
- Not actively maintained

---

#### SimpleBudgetGrid (DEPRECATED)

**Location:** `src/components/budget/SimpleBudgetGrid.tsx`

**Purpose:** MVP budget grid using react-data-grid.

**Status:** **DEPRECATED - Use BudgetDataGrid instead**

**Reason for Deprecation:**
- react-data-grid less maintained
- TanStack provides better customization
- BudgetDataGrid is the production component

---

## 3. Shared Infrastructure

### Hooks

| Hook Name | Location | Purpose | Used By |
|-----------|----------|---------|---------|
| useBudgetData | `src/components/budget/hooks/useBudgetData.ts` | Fetch/mutate budget items | BudgetGridTab, BudgetDataGrid |
| useBudgetGanttData | `src/components/budget/hooks/useBudgetGanttData.ts` | TanStack Query for Gantt | SimpleBudgetGrid, BudgetGanttGrid |
| useBudgetGrouping | `src/hooks/useBudgetGrouping.ts` | Category tree grouping | BudgetDataGrid |
| useBudgetVariance | `src/hooks/useBudgetVariance.ts` | Variance calculations | BudgetDataGrid |
| useSalesAbsorption | `src/hooks/useSalesAbsorption.ts` | Sales/parcel data (React Query) | ParcelSalesTable, SalesContent |
| useParcelsWithSales | `src/hooks/useSalesAbsorption.ts` | Parcels with sale data | ParcelSalesTable |
| useContainers | `src/hooks/useContainers.ts` | Container hierarchy | BudgetGridTab, filters |
| useProjectConfig | `src/hooks/useProjectConfig.ts` | Project settings/labels | Multiple components |

### API Endpoints (Grid-Related)

| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| `/api/budget/gantt` | GET | Fetch budget items | Array of items + hasFrontFeet |
| `/api/budget/gantt/items` | POST | Create budget item | Created item |
| `/api/budget/gantt/items/{id}` | PUT | Update budget item | Updated item |
| `/api/budget/gantt/items/{id}` | DELETE | Delete budget item | Success |
| `/api/budget/categories` | GET | Budget categories | Categories tree |
| `/api/multifamily/leases` | GET | Rent roll leases | Lease array |
| `/api/multifamily/units` | GET | Unit inventory | Unit array |
| `/api/multifamily/unit-types` | GET | Floorplans | UnitType array |
| `/api/projects/{id}/parcels-with-sales/` | GET | Parcels + sales | ParcelSalesDataset |
| `/api/projects/{id}/sale-phases/` | POST | Create sale phase | SalePhase |
| `/api/projects/{id}/inventory` | GET | Universal inventory | Columns + items |

### Shared Cell Components

| Component | Location | Purpose |
|-----------|----------|---------|
| EditableCell | `src/components/budget/custom/EditableCell.tsx` | Generic inline edit cell (text, number, select, category-select, template-autocomplete) |
| CategoryEditorRow | `src/components/budget/custom/CategoryEditorRow.tsx` | Expandable category picker |
| GroupRow | `src/components/budget/custom/GroupRow.tsx` | Grouped category header row |
| ExpandableDetailsRow | `src/components/budget/custom/ExpandableDetailsRow.tsx` | Additional fields expansion |
| PhaseCell | `src/components/budget/custom/PhaseCell.tsx` | Phase/container dropdown |
| ColoredDotIndicator | `src/components/budget/custom/ColoredDotIndicator.tsx` | Status indicator |

---

## 4. Database Table Mapping

| Component | Primary Table | Related Tables | Key Fields |
|-----------|---------------|----------------|------------|
| BudgetDataGrid | `core_fin_fact_budget` | `core_fin_category`, `tbl_container` | fact_id, amount, qty, rate, division_id |
| RentRollGrid | `tbl_lease` | `tbl_unit`, `tbl_unit_type` | lease_id, unit_id, base_rent_monthly |
| FloorplansGrid | `tbl_unit_type` | `tbl_project` | unit_type_id, current_market_rent |
| UniversalInventoryTable | `tbl_project_inventory` | `lu_family`, `lu_type`, `lu_product` | item_id, hierarchy_values, data_values |
| ParcelSalesTable | `tbl_parcel` | `tbl_sale_phase`, `tbl_sale_event` | parcel_id, sale_period, sale_phase_id |
| PricingTable | `tbl_pricing_assumption` | `lu_product` | assumption_id, price_per_unit, growth_rate |
| DebtFacilitiesTable | `tbl_debt_facility` | `tbl_project` | facility_id, commitment_amount |
| EquityPartnersTable | `tbl_equity_partner` | `tbl_project` | partner_id, capital_contribution |
| DeveloperFeesTable | `tbl_developer_fee` | `tbl_project` | fee_id, fee_type, fee_amount |
| ComparablesTable | `tbl_market_comparable` | `tbl_project` | comparable_id, sale_price |

---

## 5. Recommendations

### A. Components Ready for ARGUS-Style Upgrade (CSS/Styling Only)

These components have good architecture and just need density/styling updates:

1. **RentRollGrid** - Already uses AG Grid, just needs row height reduction
2. **FloorplansGrid** - Same as RentRollGrid
3. **BudgetDataGrid** - Has inline editing, needs density and keyboard nav
4. **ParcelSalesTable** - TanStack-based, needs more editable cells

### B. Components Needing Significant Refactor

1. **All CoreUI CTable components** (7 total)
   - Current: Modal-only editing
   - Needed: Migrate to TanStack + inline editing
   - Priority: Medium (debt/equity are lower traffic)

2. **SimpleBudgetGrid**
   - Action: Deprecate and remove
   - Replacement: BudgetDataGrid is already the main component

3. **PlanningContentHot**
   - Action: Keep archived, do not revive
   - Replacement: LandUseInputTableTanStack or custom TanStack component

### C. Missing Components (Gaps)

| Needed Component | Use Case | Suggested Library |
|------------------|----------|-------------------|
| LeaseAbstractGrid | Commercial lease terms | TanStack or AG Grid |
| OpExBudgetGrid | Operating expenses by category | TanStack (extend BudgetDataGrid) |
| TenantImprovementGrid | TI tracking | TanStack |
| CapitalReservesGrid | Replacement reserves | TanStack |
| MarketRentScheduleGrid | Multi-year rent projections | TanStack |

### D. Consolidation Opportunities

1. **Merge react-data-grid usage** (2 components) into TanStack
   - SimpleBudgetGrid → Use BudgetDataGrid
   - PlanningContentGrid → Already archived

2. **Create shared grid wrapper**
   - Base TanStack table with pagination, sorting, filtering
   - Consistent ARGUS-style density (28-32px rows)
   - Reusable inline edit patterns

3. **Standardize cell editor components**
   - EditableCell is good foundation
   - Need NumericCell, DateCell, DropdownCell wrappers
   - Keyboard navigation utilities

### E. Suggested Standard Grid Component Stack

**Recommendation: TanStack React Table as PRIMARY**

| Use Case | Library | Reason |
|----------|---------|--------|
| Standard data tables | TanStack React Table | Headless, flexible, good DX |
| Complex power-user grids | AG Grid Community | Built-in features, excel-like |
| Simple read-only tables | CoreUI CTable | Design system integration |

**Why TanStack over AG Grid as primary:**
- Smaller bundle size
- More control over styling
- Better for custom ARGUS-style design
- AG Grid is good for "power user" grids with many built-in features

---

## 6. ARGUS Parity Checklist

For each grid to match ARGUS-style density and UX:

| Feature | Current State | Target |
|---------|--------------|--------|
| Row height | 36-40px | 28-32px |
| Keyboard navigation | None | Arrow keys, Tab, Enter |
| Copy/Paste | None | Clipboard support |
| Inline editing | Partial | All editable fields |
| Dropdown cells | Some | Searchable dropdowns |
| Frozen columns | Some | First 1-2 columns |
| Column resize | Yes | Yes |
| Bulk select | None | Multi-row selection |
| Bulk edit | None | Apply to selected rows |
| Undo/Redo | None | Transaction support |
| Export | None | CSV/Excel export |

---

## Appendix: File Listing

All 28 grid/table components:

```
src/components/budget/BudgetDataGrid.tsx
src/components/budget/BudgetGridTab.tsx
src/components/budget/BudgetGanttGrid.tsx
src/components/budget/SimpleBudgetGrid.tsx (DEPRECATED)
src/components/budget/BasicBudgetTable.tsx
src/components/budget/custom/EditableCell.tsx
src/components/budget/custom/CategoryEditorRow.tsx
src/components/budget/custom/GroupRow.tsx
src/components/budget/custom/ExpandableDetailsRow.tsx
src/components/budget/custom/PhaseCell.tsx
src/app/rent-roll/components/RentRollGrid.tsx
src/app/rent-roll/components/FloorplansGrid.tsx
src/app/components/UniversalInventory/UniversalInventoryTable.tsx
src/components/sales/ParcelSalesTable.tsx
src/components/sales/PricingTable.tsx
src/components/sales/TransactionGrid.tsx
src/components/capitalization/DebtFacilitiesTable.tsx
src/components/capitalization/EquityPartnersTable.tsx
src/components/capitalization/DrawScheduleTable.tsx
src/components/capitalization/WaterfallStructureTable.tsx
src/components/capitalization/DeveloperFeesTable.tsx
src/components/capitalization/ManagementOverheadTable.tsx
src/components/capitalization/WaterfallDistributionTable.tsx
src/components/analysis/cashflow/CashFlowTable.tsx
src/components/analysis/cashflow/CashFlowPhaseTable.tsx
src/components/feasibility/ComparablesTable.tsx
src/components/dashboard/ProjectTable.tsx
src/components/landscaper/DataTableModal.tsx
src/components/dms/search/ResultsTable.tsx
src/components/reports/ExtractionHistoryReport.tsx
src/app/components/Archive/PlanningContentHot.tsx (ARCHIVED)
src/app/components/Archive/PlanningContentGrid.tsx (ARCHIVED)
src/app/components/Admin/LandUseInputTableTanStack.tsx
```

---

*Last updated: 2026-01-09*

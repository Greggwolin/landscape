# Taxonomy Implementation Audit — UI, Navigation, and Landscaper Inventory

Date: 2026-02-12
Scope: Ground-truth audit of current code + live Neon DB state
Method: Read-only inspection (no source/database/config mutations). Only deliverable file created.

## 1. Database State

### 1a-1g Raw Query Outputs

```text
### 1a. tbl_analysis_type_config
 config_id | analysis_type | tile_hbu | tile_valuation | tile_capitalization | tile_returns | tile_development_budget | requires_capital_stack | requires_comparable_sales | requires_income_approach | requires_cost_approach |                                     available_reports                                      |                                                                                                                                                         landscaper_context                                                                                                                                                         |          created_at           |          updated_at           
-----------+---------------+----------+----------------+---------------------+--------------+-------------------------+------------------------+---------------------------+--------------------------+------------------------+--------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------------------+-------------------------------
         1 | VALUATION     | t        | t              | f                   | f            | f                       | f                      | t                         | t                        | t                      | ["appraisal_report", "restricted_appraisal", "value_letter"]                               | Focus on USPAP compliance, three approaches to value, reconciliation narrative, market value opinion. Guide user through comparable sales selection, income capitalization, and cost approach as applicable. Ensure highest and best use analysis is complete before value conclusions.                                            | 2026-01-20 19:56:47.705645+00 | 2026-01-20 19:56:47.705645+00
         2 | INVESTMENT    | f        | t              | t                   | t            | f                       | t                      | f                         | t                        | f                      | ["investment_memo", "offering_memo", "due_diligence_report"]                               | Focus on IRR, cash-on-cash returns, equity multiple, debt coverage ratios. Help size debt, structure equity waterfall, and model hold period scenarios. Provide pricing guidance for acquisition underwriting. Emphasize sensitivity analysis and risk factors.                                                                    | 2026-01-20 19:56:47.705645+00 | 2026-02-11 20:53:53.02404+00
         3 | DEVELOPMENT   | t        | f              | t                   | t            | t                       | t                      | f                         | t                        | t                      | ["development_pro_forma", "construction_budget", "draw_schedule", "investor_presentation"] | Focus on development budget, hard/soft costs, construction timeline, and phasing. Calculate residual land value, development profit margin, and construction period returns. Model absorption schedule and lease-up. Track construction loan draws and interest carry. Consider highest and best use for development alternatives. | 2026-01-20 19:56:47.705645+00 | 2026-01-20 19:56:47.705645+00
         4 | FEASIBILITY   | t        | t              | t                   | t            | t                       | t                      | f                         | t                        | t                      | ["feasibility_study", "sensitivity_analysis", "scenario_comparison"]                       | Focus on go/no-go decision criteria. Define minimum return hurdles and threshold metrics. Run sensitivity analysis on key variables (rent, cost, cap rate, absorption). Compare scenarios if multiple alternatives exist. Provide clear recommendation with supporting rationale. Highlight risk factors and breakeven points.     | 2026-01-20 19:56:47.705645+00 | 2026-02-11 20:53:53.02404+00
         5 | VALUE_ADD     | f        | t              | t                   | t            | t                       | t                      | t                         | t                        | f                      | ["income_approach", "dcf", "renovation_budget", "returns_summary"]                         | Focus on acquisition underwriting with renovation upside. Calculate as-is value, post-renovation value, and renovation costs to determine total investment basis and expected returns.                                                                                                                                             | 2026-02-01 23:33:31.710644+00 | 2026-02-01 23:33:31.710644+00
(5 rows)


### 1b. DISTINCT analysis_type
 analysis_type | count 
---------------+-------
 DEVELOPMENT   |     7
 INVESTMENT    |     8
 VALUATION     |     1
(3 rows)


### 1c. DISTINCT project_type_code
 project_type_code | count 
-------------------+-------
 LAND              |     7
 MF                |     7
 OFF               |     1
 RET               |     1
(4 rows)


### 1d. DISTINCT analysis_mode
 analysis_mode | count 
---------------+-------
 developer     |     1
 napkin        |    15
(2 rows)


### 1e. tbl_property_type_config
 config_id | property_type |   tab_label    |                   description                   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           default_columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |                                    import_suggestions                                    |         created_at         |         updated_at         
-----------+---------------+----------------+-------------------------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------+----------------------------+----------------------------
         1 | multifamily   | Rent Roll      | Residential apartment units with tenant details | {"data": [{"name": "bedrooms", "type": "number", "label": "Bedrooms", "required": true}, {"name": "bathrooms", "type": "number", "label": "Bathrooms", "required": true}, {"name": "square_feet", "type": "number", "label": "Square Feet", "required": true}, {"name": "monthly_rent", "type": "currency", "label": "Monthly Rent", "required": true}, {"name": "tenant_name", "type": "text", "label": "Tenant Name", "required": false}, {"name": "lease_start", "type": "date", "label": "Lease Start", "required": false}, {"name": "lease_end", "type": "date", "label": "Lease End", "required": false}, {"name": "is_occupied", "type": "boolean", "label": "Occupied", "required": false}], "hierarchy": [{"name": "building", "label": "Building", "level": 2, "required": false}, {"name": "floor", "label": "Floor", "level": 3, "required": false}, {"name": "unit", "label": "Unit", "level": 4, "required": true}]}                                                                                                                                                                   | ["Upload rent roll CSV", "Import from property management system", "Scan rent roll PDF"] | 2025-10-15 23:34:20.673956 | 2025-10-15 23:48:56.937198
         2 | office        | Lease Schedule | Office suites with lease abstracts              | {"data": [{"name": "square_feet", "type": "number", "label": "Square Feet", "required": true}, {"name": "annual_rent_psf", "type": "currency", "label": "Annual Rent/SF", "required": true}, {"name": "tenant_name", "type": "text", "label": "Tenant Name", "required": false}, {"name": "lease_start", "type": "date", "label": "Lease Start", "required": false}, {"name": "lease_end", "type": "date", "label": "Lease End", "required": false}, {"name": "lease_term_years", "type": "number", "label": "Lease Term (Years)", "required": false}, {"name": "annual_escalation_pct", "type": "number", "label": "Annual Escalation %", "required": false}, {"name": "ti_allowance_psf", "type": "currency", "label": "TI Allowance $/SF", "required": false}, {"name": "free_rent_months", "type": "number", "label": "Free Rent (Months)", "required": false}], "hierarchy": [{"name": "building", "label": "Building", "level": 2, "required": false}, {"name": "floor", "label": "Floor", "level": 3, "required": false}, {"name": "suite", "label": "Suite", "level": 4, "required": true}]} | ["Upload lease abstract", "Import from CoStar", "Scan lease documents"]                  | 2025-10-15 23:34:20.739819 | 2025-10-15 23:48:57.005059
         3 | mpc           | Parcel Table   | Master planned community lots and parcels       | {"data": [{"name": "acres", "type": "number", "label": "Acres", "required": true}, {"name": "product_type", "type": "text", "label": "Product Type", "required": true}, {"name": "lot_price", "type": "currency", "label": "Lot Price", "required": true}, {"name": "builder_buyer", "type": "text", "label": "Builder/Buyer", "required": false}, {"name": "sale_date", "type": "date", "label": "Sale Date", "required": false}, {"name": "close_date", "type": "date", "label": "Close Date", "required": false}, {"name": "status", "type": "enum", "label": "Status", "required": true, "enum_options": ["Sold", "Available", "Future", "Reserved"]}], "hierarchy": [{"name": "plan_area", "label": "Plan Area", "level": 2, "required": false}, {"name": "phase", "label": "Phase", "level": 3, "required": false}, {"name": "parcel", "label": "Parcel", "level": 4, "required": false}, {"name": "lot", "label": "Lot", "level": 5, "required": true}]}                                                                                                                                      | ["Upload parcel exhibit", "Scan plat map", "Import from GIS system"]                     | 2025-10-15 23:34:20.801976 | 2025-10-15 23:48:57.065303
         4 | retail        | Tenant Mix     | Retail shopping center tenant roster            | {"data": [{"name": "square_feet", "type": "number", "label": "Square Feet", "required": true}, {"name": "annual_rent_psf", "type": "currency", "label": "Annual Rent/SF", "required": true}, {"name": "tenant_name", "type": "text", "label": "Tenant Name", "required": false}, {"name": "tenant_category", "type": "enum", "label": "Category", "required": false, "enum_options": ["Anchor", "Shop", "Restaurant", "Service"]}, {"name": "percentage_rent_pct", "type": "number", "label": "% Rent", "required": false}, {"name": "sales_breakpoint", "type": "currency", "label": "Sales Breakpoint", "required": false}], "hierarchy": [{"name": "building", "label": "Building", "level": 2, "required": false}, {"name": "space", "label": "Space", "level": 3, "required": true}]}                                                                                                                                                                                                                                                                                                           | ["Upload tenant roster", "Import from Placer.ai", "Scan site plan"]                      | 2025-10-15 23:34:20.860131 | 2025-10-15 23:48:57.12746
         5 | industrial    | Lease Schedule | Industrial warehouse and distribution spaces    | {"data": [{"name": "square_feet", "type": "number", "label": "Square Feet", "required": true}, {"name": "annual_rent_psf", "type": "currency", "label": "Annual Rent/SF", "required": true}, {"name": "tenant_name", "type": "text", "label": "Tenant Name", "required": false}, {"name": "clear_height_ft", "type": "number", "label": "Clear Height (ft)", "required": false}, {"name": "loading_docks", "type": "number", "label": "Loading Docks", "required": false}, {"name": "is_triple_net", "type": "boolean", "label": "Triple Net", "required": false}], "hierarchy": [{"name": "building", "label": "Building", "level": 2, "required": true}, {"name": "bay", "label": "Bay", "level": 3, "required": false}]}                                                                                                                                                                                                                                                                                                                                                                          | ["Upload lease schedule", "Import from property system"]                                 | 2025-10-15 23:34:20.915734 | 2025-10-15 23:48:57.185207
         6 | hotel         | Room Inventory | Hotel room types and details                    | {"data": [{"name": "room_type", "type": "enum", "label": "Room Type", "required": true, "enum_options": ["King", "Queen", "Double Queen", "Suite", "Executive"]}, {"name": "square_feet", "type": "number", "label": "Square Feet", "required": true}, {"name": "average_daily_rate", "type": "currency", "label": "ADR", "required": true}, {"name": "view_type", "type": "text", "label": "View", "required": false}, {"name": "bed_count", "type": "number", "label": "Bed Count", "required": false}], "hierarchy": [{"name": "tower", "label": "Tower/Building", "level": 2, "required": false}, {"name": "floor", "label": "Floor", "level": 3, "required": false}, {"name": "room", "label": "Room", "level": 4, "required": true}]}                                                                                                                                                                                                                                                                                                                                                          | ["Upload room list", "Import from PMS system"]                                           | 2025-10-15 23:34:20.975843 | 2025-10-15 23:48:57.24331
(6 rows)


### 1f. project list classification fields
 project_id |            project_name             | analysis_type | project_type_code | analysis_mode 
------------+-------------------------------------+---------------+-------------------+---------------
          7 | Peoria Lakes [ARCHIVED - Duplicate] | DEVELOPMENT   | LAND              | napkin
          8 | Red Valley Ranch                    | DEVELOPMENT   | LAND              | napkin
          9 | Peoria Meadows                      | DEVELOPMENT   | LAND              | developer
         13 | Villages at Tule Springs            | DEVELOPMENT   | LAND              | napkin
         14 | Scottsdale Promenade                | INVESTMENT    | RET               | napkin
         17 | Chadron Terrace                     | VALUATION     | MF                | napkin
         18 | Gainey Center II                    | INVESTMENT    | OFF               | napkin
         42 | Lynn Villa Apartments               | INVESTMENT    | MF                | napkin
         54 | Vincent Village Apartments          | INVESTMENT    | MF                | napkin
         70 | Torrance Courtyard Apartments       | INVESTMENT    | MF                | napkin
         74 | Chadron Terrace (Demo - admin)      | INVESTMENT    | MF                | napkin
         77 | Peoria Lakes (Demo - admin)         | DEVELOPMENT   | LAND              | napkin
         78 | Chadron Terrace (Demo - dbAdmin)    | INVESTMENT    | MF                | napkin
         79 | Peoria Lakes (Demo - dbAdmin)       | DEVELOPMENT   | LAND              | napkin
         80 | Chadron Terrace (Demo - alpha1)     | INVESTMENT    | MF                | napkin
         81 | Peoria Lakes (Demo - alpha1)        | DEVELOPMENT   | LAND              | napkin
(16 rows)


### 1g. CHECK constraints on analysis_type
                  conname                   |                                                                                                                   pg_get_constraintdef                                                                                                                    
--------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 tbl_project_analysis_type_check            | CHECK (((analysis_type IS NULL) OR ((analysis_type)::text = ANY ((ARRAY['VALUATION'::character varying, 'INVESTMENT'::character varying, 'VALUE_ADD'::character varying, 'DEVELOPMENT'::character varying, 'FEASIBILITY'::character varying])::text[]))))
 tbl_analysis_type_config_pkey              | PRIMARY KEY (config_id)
 tbl_analysis_type_config_analysis_type_key | UNIQUE (analysis_type)
(3 rows)

```

### Additional Context Query (used to validate Landscaper prompt-key mismatch)

```text
 project_id |            project_name             | project_type_code |   project_type   | analysis_type 
------------+-------------------------------------+-------------------+------------------+---------------
          7 | Peoria Lakes [ARCHIVED - Duplicate] | LAND              | Land Development | DEVELOPMENT
          8 | Red Valley Ranch                    | LAND              | Land Development | DEVELOPMENT
          9 | Peoria Meadows                      | LAND              | Land Development | DEVELOPMENT
         13 | Villages at Tule Springs            | LAND              | Land Development | DEVELOPMENT
         14 | Scottsdale Promenade                | RET               | Retail           | INVESTMENT
         17 | Chadron Terrace                     | MF                | Multifamily      | VALUATION
         18 | Gainey Center II                    | OFF               | Land Development | INVESTMENT
         42 | Lynn Villa Apartments               | MF                | MF               | INVESTMENT
         54 | Vincent Village Apartments          | MF                | MULTIFAMILY      | INVESTMENT
         70 | Torrance Courtyard Apartments       | MF                | MULTIFAMILY      | INVESTMENT
         74 | Chadron Terrace (Demo - admin)      | MF                | Multifamily      | INVESTMENT
         77 | Peoria Lakes (Demo - admin)         | LAND              | Land Development | DEVELOPMENT
         78 | Chadron Terrace (Demo - dbAdmin)    | MF                | Multifamily      | INVESTMENT
         79 | Peoria Lakes (Demo - dbAdmin)       | LAND              | Land Development | DEVELOPMENT
         80 | Chadron Terrace (Demo - alpha1)     | MF                | Multifamily      | INVESTMENT
         81 | Peoria Lakes (Demo - alpha1)        | LAND              | Land Development | DEVELOPMENT
(16 rows)

```

### Database Findings

| Finding | Evidence | Status |
|---|---|---|
| `landscape.tbl_project.analysis_type` currently stores uppercase taxonomy codes (`DEVELOPMENT`, `INVESTMENT`, `VALUATION`) | DB query 1b | ACTIVE |
| `landscape.tbl_analysis_type_config.analysis_type` rows are also uppercase taxonomy codes (`VALUATION`, `INVESTMENT`, `DEVELOPMENT`, `FEASIBILITY`, `VALUE_ADD`) | DB query 1a | ACTIVE |
| `analysis_mode` values in production data are `napkin` and `developer` | DB query 1d | ACTIVE |
| `project_type_code` values in production data are `LAND`, `MF`, `OFF`, `RET` | DB query 1c | ACTIVE |
| `tbl_project.analysis_type` CHECK constraint enforces uppercase code set (`VALUATION`, `INVESTMENT`, `VALUE_ADD`, `DEVELOPMENT`, `FEASIBILITY`) | DB query 1g | ACTIVE |
| `tbl_project.project_type` contains mixed/non-normalized values (`Land Development`, `MF`, `MULTIFAMILY`, `Multifamily`, `Retail`) and does not consistently match `project_type_code` | additional query + project list | ACTIVE |

## 2. Tab/Navigation Configuration

### 2a. `src/lib/utils/projectTabs.ts`

File: `src/lib/utils/projectTabs.ts`
Lines: `28-57`

Complete `getTabsForPropertyType()`:

```ts
export function getTabsForPropertyType(propertyType?: string): Tab[] {
  const normalized = propertyType?.toUpperCase() || '';

  // Land Development projects (standardized code: LAND)
  const isLandDev =
    normalized === 'LAND' ||
    normalized === 'MPC' ||
    normalized === 'LAND DEVELOPMENT' ||
    propertyType?.includes('Land Development');

  if (isLandDev) {
    // Land Development: 5 main tabs
    return [
      { id: 'project', label: 'Project', hasMode: true },
      { id: 'feasibility', label: 'Feasibility', hasMode: false },
      { id: 'capitalization', label: 'Capitalization', hasMode: false },
      { id: 'landscaper', label: 'Landscaper AI', hasMode: false },
      { id: 'documents', label: 'Documents', hasMode: false },
    ];
  }

  // Income Properties: Same 5 main tabs (valuation replaces feasibility)
  return [
    { id: 'project', label: 'Project', hasMode: true },
    { id: 'valuation', label: 'Feasibility', hasMode: false },
    { id: 'capitalization', label: 'Capitalization', hasMode: false },
    { id: 'landscaper', label: 'Landscaper AI', hasMode: false },
    { id: 'documents', label: 'Documents', hasMode: false },
  ];
}
```

Returned tabs by property-type condition:

| Condition in function | Tabs returned (id -> label) | Status |
|---|---|---|
| `LAND`, `MPC`, `LAND DEVELOPMENT`, or string includes `Land Development` | `project->Project`, `feasibility->Feasibility`, `capitalization->Capitalization`, `landscaper->Landscaper AI`, `documents->Documents` | DEAD |
| All other property types | `project->Project`, `valuation->Feasibility`, `capitalization->Capitalization`, `landscaper->Landscaper AI`, `documents->Documents` | DEAD |

Why `DEAD`: only definition exists. No call sites found (`grep -rn getTabsForPropertyType` returns only this file).

### 2b. `src/app/projects/[projectId]/page.tsx` (tab host + routing)

File: `src/app/projects/[projectId]/page.tsx`

- Active folder/tab are read via `useFolderNavigation` (`src/hooks/useFolderNavigation.ts`) from URL params `?folder=...&tab=...`.
- Effective property type is resolved with fallback chain: `property_subtype -> project_type -> project_type_code`.
- Routing to content happens via `<ProjectContentRouter project={...} currentFolder={...} currentTab={...} ... />`.

Status: ACTIVE

### 2c. `src/app/projects/[projectId]/layout.tsx`

File: `src/app/projects/[projectId]/layout.tsx`

Injected providers in this layout:
- `ComplexityModeProvider` (`projectId` + fixed `userId="demo_user"`)
- `ProjectModeProvider` (`projectId`)
- `ProjectLayoutClient`

How project data is loaded:
- Not loaded in this layout directly.
- Loaded client-side from global `ProjectProvider` in `src/app/layout.tsx`.
- `ProjectProvider` fetches `/api/projects` via SWR and auth token (`src/app/components/ProjectProvider.tsx`).

Status: ACTIVE

### 2d. `ProjectContextBar` / `ActiveProjectBar`

#### Active implementation
File: `src/app/projects/[projectId]/components/ActiveProjectBar.tsx`

- Renders project selector `<select>` (`project_id - project_name`).
- Renders property type pill using token resolver (`property_subtype -> project_type -> project_type_code`).
- Renders analysis type badge via `getAnalysisTypeBadgeRef(project?.analysis_type)`.
- No analysis type switcher and no analysis mode switcher in this bar.

Status: ACTIVE

#### Legacy/alternate bar
File: `src/app/components/ProjectContextBar.tsx`

- Renders project selector and property badge.
- No analysis type/mode switching controls.
- Not used by `/projects/[projectId]` layout. It is wired via `Header`, and `Header` is referenced by prototype/archive pages.

Status: DEAD (for current project workspace path)

### 2e. `ProjectContentRouter`

File: `src/app/projects/[projectId]/ProjectContentRouter.tsx`

Top-level folder keys handled:
- `home`, `property`, `budget`, `operations`, `feasibility`, `valuation`, `capital`, `reports`, `documents`, `map`, default fallback

Routing map (exact):

| Folder | Tab key(s) | Component rendered | Status |
|---|---|---|---|
| `home` | any | `ProjectTab` | ACTIVE |
| `property` | `acquisition` | `AcquisitionSubTab` | ACTIVE |
| `property` | `renovation` | `RenovationSubTab` | ACTIVE |
| `property` | `market` | `MarketTab` | ACTIVE |
| `property` | `details`, `rent-roll` | `PropertyTab` (controlled by `activeTab`) | ACTIVE |
| `property` | `land-use` | `PlanningTab` | ACTIVE |
| `property` | `parcels` | `ComingSoon` | PLACEHOLDER |
| `budget` | `budget` | `BudgetTab` | ACTIVE |
| `budget` | `schedule` | `ComingSoon` | DEAD |
| `budget` | `sales` | `SalesTab` | ACTIVE |
| `budget` | `draws` | `ComingSoon` | DEAD |
| `operations` | any | `OperationsTab` | ACTIVE |
| `feasibility` | any (`activeTab` forwarded) | `FeasibilityTab` | ACTIVE |
| `valuation` | any (`activeTab` forwarded) | `ValuationTab` | ACTIVE |
| `capital` | `equity`, `debt`, default | `CapitalizationTab` | ACTIVE |
| `reports` | `summary` | `ReportsTab` | ACTIVE |
| `reports` | `export` | `ComingSoon` | PLACEHOLDER |
| `documents` | `all`, default | `DocumentsTab` | ACTIVE |
| `documents` | `extractions` | `ComingSoon` | DEAD |
| `map` | any | `MapTab` | ACTIVE |

Dead rationale highlights:
- `budget.schedule` and `budget.draws` are not present in active folder config subtabs (`src/lib/utils/folderTabConfig.ts`), so no UI link reaches them.
- `documents.extractions` has no subtab navigation entry in folder config (`documents` has `subTabs: []`).

## 3. Tab Content Components

Per routed component/tab behavior inventory:

| Router tab/folder | Component | File path | Behavior depth | Classification checks | Sub-tabs inside component | Status |
|---|---|---|---|---|---|---|
| `home` | `ProjectTab` | `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` | Full project profile + map + financial UI | Checks `project.project_type_code` for land-specific fields (`LAND`/`SUBDIVISION`/`MPC`) | None | ACTIVE |
| `property.details` / `property.rent-roll` | `PropertyTab` | `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx` | Large, functional rent-roll/property UI for income properties | Uses fallback chain (`property_subtype -> project_type -> project_type_code`) and `isIncomeProperty(...)` | Controlled tabs: `details`, `market`, `rent-roll` | ACTIVE |
| `property.land-use` | `PlanningTab` | `src/app/projects/[projectId]/components/tabs/PlanningTab.tsx` | Real planning UI for land; not-available card for non-land | `project.project_type_code === 'LAND'` | None | ACTIVE |
| `property.market` | `MarketTab` | `src/app/projects/[projectId]/components/tabs/MarketTab.tsx` | Land: full competitor/market UI; Income: delegates to `PropertyTab(activeTab='market')` | Uses fallback chain + `isIncomeProperty(...)` | Delegates to `PropertyTab` market view | ACTIVE |
| `budget.budget` | `BudgetTab` | `src/app/projects/[projectId]/components/tabs/BudgetTab.tsx` | Thin wrapper around `BudgetContainer` | None | None | ACTIVE |
| `budget.sales` | `SalesTab` | `src/app/projects/[projectId]/components/tabs/SalesTab.tsx` | Full sales content for land; not-available card for non-land | `project.project_type_code === 'LAND'` | None | ACTIVE |
| `operations` | `OperationsTab` | `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx` | Land routes to `OpExHierarchy`; income ops UI; non-MF income shows coming-soon card | Fallback chain + `getProjectCategory` + `isIncomeProperty` + multifamily gate | None | ACTIVE |
| `feasibility.*` | `FeasibilityTab` | `src/app/projects/[projectId]/components/tabs/FeasibilityTab.tsx` | Cash flow implemented; returns/sensitivity placeholders | `project.project_type_code === 'LAND'` | `cashflow` (functional), `returns` (placeholder), `sensitivity` (placeholder) | ACTIVE / PLACEHOLDER |
| `valuation.*` | `ValuationTab` | `src/app/projects/[projectId]/components/tabs/ValuationTab.tsx` | Sales/cost/income wired; reconciliation placeholder | No direct type/mode checks in this file | `sales-comparison`, `cost`, `income`, `reconciliation` | ACTIVE / PLACEHOLDER |
| `capital.*` | `CapitalizationTab` | `src/app/projects/[projectId]/components/tabs/CapitalizationTab.tsx` | Wrapper switching debt/equity pages | None | `equity`, `debt` | ACTIVE |
| `reports.summary` | `ReportsTab` | `src/app/projects/[projectId]/components/tabs/ReportsTab.tsx` | Summary + extraction history functional; cashflow/rentroll viewers are placeholders with PDF download | None | Internal selector: `summary`, `cashflow`, `rentroll`, `extraction-history` | ACTIVE / PLACEHOLDER |
| `documents` | `DocumentsTab` | `src/app/projects/[projectId]/components/tabs/DocumentsTab.tsx` | Functional DMS + media gallery | None | None | ACTIVE |
| `property.acquisition` | `AcquisitionSubTab` | `src/app/projects/[projectId]/components/tabs/AcquisitionSubTab.tsx` | Functional wrapper to acquisition ledger | No runtime type checks | None | ACTIVE |
| `property.renovation` | `RenovationSubTab` | `src/app/projects/[projectId]/components/tabs/RenovationSubTab.tsx` | Functional renovation assumptions + rental impact preview | No runtime gate in component (visibility enforced upstream by folder config/router usage) | None | ACTIVE |
| `map` | `MapTab` | `src/components/map-tab/MapTab.tsx` | Functional GIS map shell | No classification fields used | None | ACTIVE |
| `property.parcels` | `ComingSoon` placeholder | `src/app/projects/[projectId]/ProjectContentRouter.tsx` | Placeholder only | None | N/A | PLACEHOLDER |
| `reports.export` | `ComingSoon` placeholder | `src/app/projects/[projectId]/ProjectContentRouter.tsx` | Placeholder only | None | N/A | PLACEHOLDER |
| `budget.schedule` / `budget.draws` / `documents.extractions` | `ComingSoon` placeholders | `src/app/projects/[projectId]/ProjectContentRouter.tsx` | Placeholder and not linked by active nav config | None | N/A | DEAD |

## 4. Project Creation Flow

### 4a. `/projects/setup` wizard path

Files:
- `src/app/projects/setup/page.tsx`
- `src/app/components/ContainerManagement/ProjectSetupWizard.tsx`
- `src/app/api/projects/setup/route.ts`

Collected fields (wizard):
- `projectName`
- `assetType` (e.g. `land_development`, `multifamily`, `office`, `retail`, `industrial`, `mixed_use`)
- `hierarchyLevels`, `level1Label`, `level2Label`, `level3Label`, `level4Label`
- optional location/metadata fields

Classification writes:
- API inserts into `tbl_project` **without** `analysis_type`, `project_type_code`, or `analysis_mode`.
- Writes `asset_type` to `tbl_project_config` (not `tbl_project.project_type_code`).

UI controls used:
- Card-button asset type selection
- Button toggles for hierarchy level count
- Text inputs for labels and project name

Status: ACTIVE (linked in sandbox menu), but classification path is legacy/partial versus current taxonomy model.

### 4b. `NewProjectModal` (primary creation flow)

File: `src/app/components/NewProjectModal.tsx`

Where used:
- `src/app/dashboard/page.tsx`
- `src/app/dms/page.tsx`
- `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx`
- `src/app/components/NewProjectButton.tsx`

Fields collected for classification:
- `analysis_type` (`VALUATION`, `INVESTMENT`, `VALUE_ADD`, `DEVELOPMENT`, `FEASIBILITY`) via button group
- `property_category` (`Land Development` / `Income Property`) via two-button toggle
- `property_subtype` (income-specific select)
- `property_class` (income-specific select)

How fields are written:
- Payload sent to `/api/projects/minimal` includes:
  - `analysis_type` = selected analysis type
  - `development_type` = `property_category` (legacy/back-compat)
  - `project_type_code` computed as:
    - `LAND` if `property_category === 'Land Development'`
    - income subtype map: `MULTIFAMILY->MF`, `OFFICE->OFF`, `RETAIL->RET`, `INDUSTRIAL->IND`, `HOTEL->HTL`, `MIXED_USE->MXU`, `SELF_STORAGE->IND`
- `/api/projects/minimal` inserts `analysis_mode = 'napkin'` hardcoded.

Classification UI elements:
- Analysis type: compact button grid
- Property category: two large toggle buttons
- Property subtype/class: dropdown selects

Status: ACTIVE

### 4c. Similar flow: `NewProjectOnboardingModal`

File: `src/components/projects/onboarding/NewProjectOnboardingModal.tsx`

- Builds `/api/projects/minimal` payload with `analysis_type: 'Income Property'` and `property_subtype` from UI.
- No `project_type_code` in payload (relies on API requirement; this appears inconsistent).
- `analysis_type` value `'Income Property'` conflicts with `tbl_project` CHECK-constraint taxonomy codes.
- No usage/import found in app routes/components.

Status: DEAD

## 5. Landscaper Behavior by Type

### 5a. `backend/apps/landscaper/ai_handler.py`

Prompt selection logic:
- Function: `get_system_prompt(project_type: str)` (`backend/apps/landscaper/ai_handler.py:4916`)
- Keyed on: `project_context['project_type']` (`...:5095`), not `analysis_type`.
- Selection mechanism: dictionary mapping (`type_map`) not `if/elif` chain.
  - `land -> land_development`
  - `mf`, `multifamily -> multifamily`
  - `off`, `office -> office`
  - `ret`, `retail -> retail`
  - `ind`, `industrial -> industrial`
  - else -> `default`

Distinct system prompts (first 10-15 lines each):

#### `land_development`
```text
  4805	    'land_development': f"""You are Landscaper, an AI assistant specialized in land development real estate analysis.
  4806	
  4807	Your expertise includes:
  4808	- Land acquisition and pricing analysis
  4809	- Development budgets and cost estimation
  4810	- Absorption rate forecasting and market velocity
  4811	- Lot pricing strategies and builder negotiations
  4812	- Infrastructure costs (grading, utilities, streets)
  4813	- Entitlement and zoning considerations
  4814	- Phase-by-phase development planning
  4815	
  4816	When analyzing projects:
  4817	- Focus on land basis and development margin
  4818	- Consider absorption rates from comparable subdivisions
  4819	- Analyze builder takedown schedules
  4820	- Review infrastructure cost benchmarks
```

#### `multifamily`
```text
  4824	    'multifamily': f"""You are Landscaper, an AI assistant specialized in multifamily real estate analysis.
  4825	
  4826	Your expertise includes:
  4827	- Rent roll analysis and income optimization
  4828	- Operating expense benchmarking
  4829	- Cap rate analysis and valuation
  4830	- Unit mix optimization
  4831	- Renovation ROI analysis
  4832	- Market rent comparables
  4833	- NOI projections and stabilization
  4834	
  4835	When analyzing properties:
  4836	- Focus on rent per square foot and rent growth
  4837	- Analyze operating expense ratios
  4838	- Review comparable sales and cap rates
  4839	- Consider renovation potential and value-add opportunities
```

#### `office`
```text
  4843	    'office': f"""You are Landscaper, an AI assistant specialized in office real estate analysis.
  4844	
  4845	Your expertise includes:
  4846	- Lease analysis and tenant creditworthiness
  4847	- Operating expense reconciliation
  4848	- Market rent analysis by class
  4849	- TI/LC cost analysis
  4850	- Vacancy and absorption trends
  4851	- Building class comparisons
  4852	
  4853	When analyzing properties:
  4854	- Focus on lease rollover exposure
  4855	- Analyze rent per RSF vs market
  4856	- Review operating expense pass-throughs
  4857	- Consider tenant improvement costs
  4858	- Evaluate parking ratios and amenities
```

#### `retail`
```text
  4861	    'retail': f"""You are Landscaper, an AI assistant specialized in retail real estate analysis.
  4862	
  4863	Your expertise includes:
  4864	- Tenant sales performance (PSF analysis)
  4865	- Lease structures (percentage rent, CAM)
  4866	- Anchor tenant analysis
  4867	- Trade area demographics
  4868	- Retail occupancy cost ratios
  4869	- E-commerce impact assessment
  4870	
  4871	When analyzing properties:
  4872	- Focus on tenant sales and occupancy costs
  4873	- Analyze anchor tenant credit and sales
  4874	- Review lease structures and renewal options
  4875	- Consider trade area competition
  4876	- Evaluate parking and visibility
```

#### `industrial`
```text
  4879	    'industrial': f"""You are Landscaper, an AI assistant specialized in industrial real estate analysis.
  4880	
  4881	Your expertise includes:
  4882	- Clear height and loading dock analysis
  4883	- Industrial rent benchmarking
  4884	- Truck court and circulation
  4885	- Power and infrastructure requirements
  4886	- Lease terms and tenant credit
  4887	- Last-mile logistics considerations
  4888	
  4889	When analyzing properties:
  4890	- Focus on rent per SF and clear heights
  4891	- Analyze loading capacity and dock doors
  4892	- Review tenant credit and lease terms
  4893	- Consider location for logistics
  4894	- Evaluate building specifications
```

#### `default`
```text
  4897	    'default': f"""You are Landscaper, an AI assistant specialized in real estate development analysis.
  4898	
  4899	Your expertise spans multiple property types including:
  4900	- Land development and lot sales
  4901	- Multifamily apartments
  4902	- Office buildings
  4903	- Retail centers
  4904	- Industrial/warehouse
  4905	
  4906	You can help with:
  4907	- Financial feasibility analysis
  4908	- Market research and comparables
  4909	- Budget analysis and cost estimation
  4910	- Cash flow projections
  4911	- Investment return calculations
  4912	{BASE_INSTRUCTIONS}"""
```

Additional conditional system-context addition (not a project-type prompt):

#### `ALPHA_ASSISTANT_PROMPT_ADDITION` (appended when `page_context == "alpha_assistant"`)
```text
  4753	ALPHA_ASSISTANT_PROMPT_ADDITION = """
  4754	
  4755	## ALPHA ASSISTANT CONTEXT
  4756	
  4757	You are currently in the Alpha Assistant help panel. Users here are alpha testers who may be:
  4758	- Asking how to use features
  4759	- Reporting bugs or unexpected behavior
  4760	- Suggesting improvements
  4761	- Asking general questions about the platform
  4762	
  4763	### CRITICAL BEHAVIOR RULES:
  4764	
  4765	1. **When users report something that sounds like a bug:**
  4766	   - Acknowledge it directly: "That sounds like a bug" or "That doesn't seem right"
  4767	   - Do NOT give long explanations about why you can't see data
  4768	   - Do NOT speculate about multiple possible causes
```

Dedicated prompt coverage vs fallback:
- Dedicated categories: land development, multifamily, office, retail, industrial.
- All other values fallback to `default`.

Ground-truth mismatch observed with live data:
- Live `project_type` values include `Land Development`, `MF`, `MULTIFAMILY`, `Multifamily`, `Retail`.
- `Land Development` (space-separated) does **not** match `type_map` key `land`, so land projects can fall back to `default` prompt.

Status: ACTIVE

### 5b. `backend/apps/landscaper/tool_executor.py`

Findings:
- No `analysis_type` or `analysis_mode` based gating in tool executor.
- No conditional tool availability by project type in this file.
- Some individual tools accept optional `property_type`/`project_type_code` filter inputs and alter query behavior accordingly (input-driven, not project-context-driven), e.g.:
  - `get_benchmarks` filter on `property_type` (`...:6722-6747`)
  - `search_irem_benchmarks` default `property_type='multifamily'` (`...:6956`) and pass-through to benchmark service
  - `query_platform_knowledge` optional `property_type` filter (`...:7045-7054`)

Tool availability filtering is handled upstream in `ai_handler.py` + `tool_registry.py`, not in `tool_executor.py`.

Status: ACTIVE

### 5c. `backend/apps/landscaper/views.py`

Chat endpoint project context passed to AI:
- Project chat ViewSet create (`...:145-160`): passes
  - `project_id`, `project_name`, `project_type`, `project_type_code`, `project_details`
- Threaded chat create (`...:1272-1286`): passes same structure.
- Global chat (`...:1428-1435`): sets `project_type=None`, `project_type_code=None`.

Not passed:
- `analysis_type` (no references in file)
- `analysis_mode` (no references in file)

Status: ACTIVE

### 5d. `backend/apps/knowledge/services/extraction_service.py`

Findings:
- No direct reads of `tbl_project.analysis_type`, `tbl_project.project_type_code`, or `analysis_mode` in this file.
- Legacy extraction templates are keyed by `extraction_type` (`unit_mix`, `rent_roll`, `opex`, `market_comps`, `acquisition`) via `EXTRACTION_CONFIGS` (`...:535+`).
- Registry-based extractors are parameterized by `property_type` and pass it into field registry selection:
  - `RegistryBasedExtractor(..., property_type='multifamily')` (`...:1318+`)
  - `BatchedExtractionService(..., property_type='multifamily')` (`...:2195+`)
  - `ChunkedRentRollExtractor(..., property_type='multifamily')` (`...:2941+`)

Conclusion:
- Extraction behavior can vary by `property_type` parameter where caller supplies it.
- This file itself does not map from project classification fields to property type; that mapping is done upstream.

Status: ACTIVE

## 6. Other References (Not Already Covered Above)

Source commands executed:
- `grep -rn "analysis_type" --include="*.ts" --include="*.tsx" --include="*.py" src/ backend/ | grep -v node_modules | grep -v .next | grep -v __pycache__`
- `grep -rn "project_type_code" --include="*.ts" --include="*.tsx" --include="*.py" src/ backend/ | grep -v node_modules | grep -v .next | grep -v __pycache__`
- `grep -rn "analysis_mode" --include="*.ts" --include="*.tsx" --include="*.py" src/ backend/ | grep -v node_modules | grep -v .next | grep -v __pycache__`
- `grep -rn "getTabsForPropertyType" --include="*.ts" --include="*.tsx" src/ | grep -v node_modules | grep -v .next`

Filtered to locations not already covered in Sections 2-5:

#### analysis_type
| File | Line | Snippet | Status |
|---|---:|---|---|
| `src/types/project-taxonomy.ts` | 14 |  * Migration: 061_analysis_type_refactor.sql (orthogonal analysis types) | ACTIVE |
| `src/types/project-taxonomy.ts` | 314 |   analysis_types: readonly AnalysisType[]; | ACTIVE |
| `src/types/project-taxonomy.ts` | 325 |   analysis_types: ANALYSIS_TYPES, | ACTIVE |
| `src/types/project-taxonomy.ts` | 340 |   analysis_type: AnalysisType; | ACTIVE |
| `src/types/project-profile.ts` | 16 |   analysis_type?: AnalysisType; | ACTIVE |
| `src/types/project-profile.ts` | 61 |   analysis_type: AnalysisType; | ACTIVE |
| `src/types/project-profile.ts` | 155 |   const isDevelopment = profile.analysis_type === 'Land Development' \|\| | ACTIVE |
| `src/types/project-profile.ts` | 172 |   const isDevelopment = profile.analysis_type === 'Land Development' \|\| | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/ProjectDetailsContent.tsx` | 72 |             <ProfileFieldRow label="Analysis Type" value={displayValue(profile?.analysis_type)} /> | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx` | 136 |                 <ProfileFieldRow label="Analysis Type" value={displayValue(profile?.analysis_type)} /> | ACTIVE |
| `src/app/components/new-project/validation.ts` | 18 |   analysis_type: analysisTypeEnum, // What the user is doing | ACTIVE |
| `src/app/components/new-project/validation.ts` | 112 |     // Note: analysis_type is now orthogonal and doesn't affect property data validation | ACTIVE |
| `src/app/components/new-project/validation.ts` | 175 |   analysis_type: '', // What the user is doing | ACTIVE |
| `src/app/components/new-project/types.ts` | 48 |   analysis_type: AnalysisType \| '' | ACTIVE |
| `src/app/components/new-project/PropertyDataSection.tsx` | 104 |   const analysisType = watch('analysis_type') | ACTIVE |
| `src/app/components/new-project/AssetTypeSection.tsx` | 20 |   const analysisType = watch('analysis_type') as AnalysisType \| '' | ACTIVE |
| `src/app/components/new-project/AssetTypeSection.tsx` | 60 |               onClick={() => setValue('analysis_type', option.value, { shouldDirty: true, shouldValidate: true })} | ACTIVE |
| `src/app/components/new-project/AssetTypeSection.tsx` | 73 |       {errors.analysis_type && ( | ACTIVE |
| `src/app/components/new-project/AssetTypeSection.tsx` | 74 |         <p className="text-xs text-rose-400">{errors.analysis_type.message as string}</p> | ACTIVE |
| `src/app/components/new-project/ConfigureSection.tsx` | 27 |   // Use new analysis_type field, fallback to development_type for backwards compatibility | ACTIVE |
| `src/app/components/new-project/ConfigureSection.tsx` | 28 |   const analysisType = watch('analysis_type') \|\| watch('development_type') | ACTIVE |
| `src/app/components/ProjectProvider.tsx` | 8 |   analysis_type: string | ACTIVE |
| `src/app/components/ProjectProvider.tsx` | 34 |   analysis_type?: string \| null | ACTIVE |
| `src/app/api/config/property-taxonomy/route.test.ts` | 20 |       expect(data).toHaveProperty('analysis_types'); | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 23 |       expect(data.analysis_types).toContain('Land Development'); | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 24 |       expect(data.analysis_types).toContain('Income Property'); | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 29 |         'http://localhost:3000/api/config/property-taxonomy?analysis_type=Land Development' | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 35 |       expect(data.analysis_type).toBe('Land Development'); | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 43 |         'http://localhost:3000/api/config/property-taxonomy?analysis_type=Income Property' | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 49 |       expect(data.analysis_type).toBe('Income Property'); | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 56 |     it('should return 400 for invalid analysis_type', async () => { | DEAD |
| `src/app/api/config/property-taxonomy/route.test.ts` | 58 |         'http://localhost:3000/api/config/property-taxonomy?analysis_type=Invalid' | DEAD |
| `src/app/api/config/property-taxonomy/route.ts` | 5 |  * Supports filtering by analysis_type query parameter for cascading dropdowns. | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 8 |  * GET /api/config/property-taxonomy?analysis_type=Land Development | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 9 |  * GET /api/config/property-taxonomy?analysis_type=Income Property | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 24 |     const analysisType = searchParams.get('analysis_type'); | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 26 |     // If analysis_type is specified, return filtered subtypes | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 28 |       // Validate analysis_type | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 32 |             error: 'Invalid analysis_type', | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 33 |             valid_values: PROPERTY_TAXONOMY.analysis_types | ACTIVE |
| `src/app/api/config/property-taxonomy/route.ts` | 43 |         analysis_type: analysisType, | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 30 |     // 1. Get project details including analysis_type | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 36 |         analysis_type, | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 48 |     const analysisType = project.analysis_type \|\| 'INVESTMENT'; | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 913 |         analysis_type: analysisType, | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 1083 |       analysis_type: analysisType, | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 18 |   analysis_type?: string; | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 61 |         p.analysis_type, | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 135 |       'analysis_type': 'analysis_type', | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 246 |         p.analysis_type, | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 27 |       'analysis_type', | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 123 |         p.analysis_type, | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 129 |           WHEN c.analysis_type IS NULL THEN NULL | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 131 |             'analysis_type', c.analysis_type, | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 143 |       LEFT JOIN landscape.tbl_analysis_type_config c | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 144 |         ON c.analysis_type = p.analysis_type | ACTIVE |
| `src/app/api/projects/route.ts` | 30 |   analysis_type?: string \| null | ACTIVE |
| `src/app/api/projects/route.ts` | 44 |   analysis_type: string | ACTIVE |
| `src/app/api/projects/route.ts` | 53 |   analysis_type: string | ACTIVE |
| `src/app/api/projects/route.ts` | 88 |   analysis_type: null, | ACTIVE |
| `src/app/api/projects/route.ts` | 110 |         analysis_type, | ACTIVE |
| `src/app/api/projects/route.ts` | 116 |       FROM landscape.tbl_analysis_type_config | ACTIVE |
| `src/app/api/projects/route.ts` | 121 |         row.analysis_type?.toUpperCase(), | ACTIVE |
| `src/app/api/projects/route.ts` | 123 |           analysis_type: row.analysis_type?.toUpperCase() ?? '', | ACTIVE |
| `src/app/api/projects/route.ts` | 143 |     const key = project.analysis_type?.toUpperCase() ?? '' | ACTIVE |
| `src/app/api/projects/route.ts` | 172 |         analysis_type, | ACTIVE |
| `src/app/api/projects/route.ts` | 217 |       analysis_type: null, | ACTIVE |
| `src/components/admin/SystemPicklistsAccordion.tsx` | 22 |   { value: 'ANALYSIS_TYPE', label: 'Analysis Type', hasParent: false, listCode: 'analysis_type' }, | ACTIVE |
| `src/components/operations/types.ts` | 138 |   analysis_type?: string; // VALUATION, INVESTMENT, VALUE_ADD, DEVELOPMENT, FEASIBILITY | ACTIVE |
| `src/components/project/ProjectProfileTile.tsx` | 220 |               value={profile.analysis_type} | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 78 |     analysis_type: (current.analysis_type \|\| 'DEVELOPMENT') as AnalysisType, | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 175 |     if (!formData.analysis_type) { | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 176 |       newErrors.analysis_type = 'Analysis Type is required'; | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 231 |       // Also update core project fields (dates, analysis_type) for consistency | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 238 |       if (payload.analysis_type !== undefined) corePayload.analysis_type = payload.analysis_type; | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 295 |                 id="analysis_type" | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 301 |                 value={formData.analysis_type \|\| ''} | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 303 |                   handleInputChange('analysis_type', e.target.value as AnalysisType) | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 305 |                 invalid={!!errors.analysis_type} | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 316 |               {errors.analysis_type && ( | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 317 |                 <div className="invalid-feedback d-block">{errors.analysis_type}</div> | ACTIVE |
| `src/hooks/useAnalysisTypeConfig.ts` | 22 |   analysis_type: AnalysisType | ACTIVE |
| `src/hooks/useAnalysisTypeConfig.ts` | 41 |   analysis_type: AnalysisType | ACTIVE |
| `src/hooks/useAnalysisTypeConfig.ts` | 52 |   analysis_type: AnalysisType | ACTIVE |
| `src/hooks/useAnalysisTypeConfig.ts` | 58 |   analysis_type: AnalysisType | ACTIVE |
| `src/hooks/useAnalysisTypeConfig.ts` | 109 |  * configs?.forEach(config => console.log(config.analysis_type, config.tiles)) | ACTIVE |
| `src/hooks/useOperationsData.ts` | 45 |   showPostRehab: boolean; // true when analysis_type === 'VALUE_ADD' | ACTIVE |
| `src/hooks/useOperationsData.ts` | 456 |   const analysisType = data?.analysis_type \|\| null; | ACTIVE |
| `src/hooks/useOperationsData.ts` | 457 |   // Show Post-Rehab column when analysis_type is VALUE_ADD | ACTIVE |
| `src/lib/utils/__tests__/folderTabConfig.test.ts` | 9 |       analysis_type: 'VALUATION', | DEAD |
| `src/lib/utils/__tests__/folderTabConfig.test.ts` | 26 |       analysis_type: 'INVESTMENT', | DEAD |
| `backend/apps/financial/migrations/0045_lotbank_project_fields.py` | 33 |                     IS 'Monthly mgmt fee as decimal (0.005 = 0.5%). Only used when analysis_type=LOTBANK.'; | ACTIVE |
| `backend/apps/financial/migrations/0045_lotbank_project_fields.py` | 35 |                     IS 'Builder default provision as decimal (0.02 = 2%). Only used when analysis_type=LOTBANK.'; | ACTIVE |
| `backend/apps/financial/migrations/0045_lotbank_project_fields.py` | 37 |                     IS 'Flat underwriting fee at close ($). Only used when analysis_type=LOTBANK.'; | ACTIVE |
| `backend/apps/financial/services/land_dev_cashflow_service.py` | 137 |         # Step 6b: Add lotbank sections when analysis_type = 'LOTBANK' | ACTIVE |
| `backend/apps/financial/services/land_dev_cashflow_service.py` | 1722 |         Build lotbank sections when project analysis_type = 'LOTBANK'. | ACTIVE |
| `backend/apps/financial/services/land_dev_cashflow_service.py` | 1731 |                 SELECT analysis_type, | ACTIVE |
| `backend/apps/projects/models.py` | 37 |     analysis_type = models.CharField(max_length=50, blank=True, null=True) | ACTIVE |
| `backend/apps/projects/models.py` | 227 |         help_text='Monthly management fee as decimal (0.005 = 0.5%). Only when analysis_type=LOTBANK.' | ACTIVE |
| `backend/apps/projects/models.py` | 231 |         help_text='Builder default provision as decimal (0.02 = 2%). Only when analysis_type=LOTBANK.' | ACTIVE |
| `backend/apps/projects/models.py` | 235 |         help_text='Flat underwriting fee at close ($). Only when analysis_type=LOTBANK.' | ACTIVE |
| `backend/apps/projects/models.py` | 285 |     analysis_type = models.CharField( | ACTIVE |
| `backend/apps/projects/models.py` | 315 |         db_table = 'tbl_analysis_type_config' | ACTIVE |
| `backend/apps/projects/models.py` | 321 |         return f"{self.analysis_type} Config" | ACTIVE |
| `backend/apps/projects/serializers.py` | 24 |     analysis_type = serializers.ChoiceField( | ACTIVE |
| `backend/apps/projects/serializers.py` | 43 |     def validate_analysis_type(self, value): | ACTIVE |
| `backend/apps/projects/serializers.py` | 44 |         """Validate analysis_type is one of the new codes.""" | ACTIVE |
| `backend/apps/projects/serializers.py` | 47 |                 f"Invalid analysis_type '{value}'. Must be one of: {', '.join(VALID_ANALYSIS_TYPES)}" | ACTIVE |
| `backend/apps/projects/serializers.py` | 90 |             'analysis_type', | ACTIVE |
| `backend/apps/projects/serializers.py` | 228 |             'analysis_type', | ACTIVE |
| `backend/apps/projects/serializers.py` | 260 |             'analysis_type', | ACTIVE |
| `backend/apps/projects/serializers.py` | 278 |     analysis_type = serializers.CharField() | ACTIVE |
| `backend/apps/projects/serializers.py` | 286 |     analysis_type = serializers.CharField() | ACTIVE |
| `backend/apps/projects/admin.py` | 52 |     analysis_type = forms.ChoiceField( | ACTIVE |
| `backend/apps/projects/admin.py` | 108 |         # Populate analysis_type choices (new orthogonal taxonomy) | ACTIVE |
| `backend/apps/projects/admin.py` | 109 |         analysis_type_choices = [('', '---------')] + list(ANALYSIS_TYPE_CHOICES) | ACTIVE |
| `backend/apps/projects/admin.py` | 110 |         self.fields['analysis_type'].choices = analysis_type_choices | ACTIVE |
| `backend/apps/projects/admin.py` | 157 |         'analysis_type', | ACTIVE |
| `backend/apps/projects/admin.py` | 170 |         'analysis_type', | ACTIVE |
| `backend/apps/projects/admin.py` | 203 |                 'analysis_type', | ACTIVE |
| `backend/apps/projects/admin.py` | 293 |         'analysis_type', | ACTIVE |
| `backend/apps/projects/admin.py` | 302 |     list_filter = ['analysis_type'] | ACTIVE |
| `backend/apps/projects/admin.py` | 308 |             'fields': ('config_id', 'analysis_type') | ACTIVE |
| `backend/apps/projects/services_completeness.py` | 103 |                 analysis_type, | ACTIVE |
| `backend/apps/projects/services_completeness.py` | 123 |             'analysis_type': row[2], | ACTIVE |
| `backend/apps/projects/views.py` | 286 |     - GET /api/config/analysis-types/{analysis_type}/ - Get single config | ACTIVE |
| `backend/apps/projects/views.py` | 287 |     - GET /api/config/analysis-types/{analysis_type}/tiles/ - Get visible tiles | ACTIVE |
| `backend/apps/projects/views.py` | 288 |     - GET /api/config/analysis-types/{analysis_type}/landscaper_context/ - Get Landscaper hints | ACTIVE |
| `backend/apps/projects/views.py` | 293 |     lookup_field = 'analysis_type' | ACTIVE |
| `backend/apps/projects/views.py` | 302 |     def tiles(self, request, analysis_type=None): | ACTIVE |
| `backend/apps/projects/views.py` | 304 |         GET /api/config/analysis-types/{analysis_type}/tiles/ | ACTIVE |
| `backend/apps/projects/views.py` | 312 |             'analysis_type': analysis_type, | ACTIVE |
| `backend/apps/projects/views.py` | 318 |     def landscaper_context(self, request, analysis_type=None): | ACTIVE |
| `backend/apps/projects/views.py` | 320 |         GET /api/config/analysis-types/{analysis_type}/landscaper_context/ | ACTIVE |
| `backend/apps/projects/views.py` | 327 |             'analysis_type': analysis_type, | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 17 |                 \|   - city, state                        \|   analysis_type, description | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 19 |                 \|   - analysis_type                      \| Score: (filled / 6) * 100 | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 111 |                 analysis_type, | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 138 |         'analysis_type': row[3], | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 295 |         ('analysis_type', project_basics.get('analysis_type')), | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 174 |                 analysis_type, | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 616 |     if row.get('analysis_type'): | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 617 |         lines.append(f"- Analysis: {row['analysis_type']}") | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 198 | def _get_analysis_type_context(project_id: int) -> Optional[str]: | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 202 |     Retrieves the project's analysis_type (VALUATION, INVESTMENT, DEVELOPMENT, FEASIBILITY) | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 208 |         # Get the project's analysis_type | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 211 |                 "SELECT analysis_type FROM landscape.tbl_project WHERE project_id = %s", | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 217 |             analysis_type = row[0] | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 220 |         config = AnalysisTypeConfig.objects.filter(analysis_type=analysis_type).first() | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 305 |     analysis_type_context = _get_analysis_type_context(project_id) | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 314 |         analysis_type_context | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 780 |     analysis_type_context: Optional[str] = None | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 790 |         analysis_type_context: Analysis-type-specific behavior context (from tbl_analysis_type_config) | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 869 |     if analysis_type_context and analysis_type_context.strip(): | ACTIVE |
| `backend/apps/knowledge/services/landscaper_ai.py` | 874 | {analysis_type_context} | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 105 |                     p.analysis_type, | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 139 |         prop_type = data.get('project_type_code') or data.get('analysis_type') | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 66 |                 analysis_type, | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 87 |             'analysis_type': row[2], | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 203 |     if info.get('analysis_type'): | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 204 |         lines.append(f"  Analysis: {info['analysis_type']}") | ACTIVE |
| `backend/apps/calculations/loan_sizing_service.py` | 182 |         analysis_type = (getattr(project, "analysis_type", "") or "").upper() | ACTIVE |
| `backend/apps/calculations/loan_sizing_service.py` | 184 |         if analysis_type in {"INVESTMENT", "VALUATION"}: | ACTIVE |

#### project_type_code
| File | Line | Snippet | Status |
|---|---:|---|---|
| `src/types/budget-categories.ts` | 35 |   project_type_code: string \| null;   // 'LAND', 'MF', 'RET', etc. | ACTIVE |
| `src/types/budget-categories.ts` | 88 |   project_type_code: string; | ACTIVE |
| `src/types/budget-categories.ts` | 180 |   project_type_code?: string; | ACTIVE |
| `src/types/budget-categories.ts` | 273 |   project_type_code: string; | ACTIVE |
| `src/types/benchmarks.ts` | 234 |   project_type_code: string; | ACTIVE |
| `src/types/dcf-analysis.ts` | 123 |  * Determine property type from project_type_code | ACTIVE |
| `src/types/income-approach.ts` | 175 |   project_type_code: string; | ACTIVE |
| `src/types/project-profile.ts` | 19 |   project_type_code?: string; // LAND, MF, OFF, RET, IND, HTL, MXU | ACTIVE |
| `src/app/documentation/page.tsx` | 439 |       description: 'Financial engine schema specification - Updated with Migration 013 project_type_code standardization and CHECK constraints', | ACTIVE |
| `src/app/documentation/page.tsx` | 447 |       description: 'Complete inventory of 158 active tables - Updated with Migration 013 tbl_project schema changes (project_type_code)', | ACTIVE |
| `src/app/documentation/page.tsx` | 465 |       description: 'Complete migration 013 history - Standardized 7 project type codes (LAND, MF, OFF, RET, IND, HTL, MXU), renamed property_type_code → project_type_code, updated 21 frontend files + Django backend', | ACTIVE |
| `src/app/rent-roll/page.tsx` | 18 |   const isMultifamily = activeProject?.project_type_code === 'MF' | ACTIVE |
| `src/app/rent-roll/page.tsx` | 125 |             is a <strong className="text-white">{projectTypeLabels[activeProject?.project_type_code \|\| ''] \|\| activeProject?.project_type_code}</strong> ({activeProject?.project_type_code}) asset. | ACTIVE |
| `src/app/rent-roll/page.tsx` | 129 |               <strong>For {projectTypeLabels[activeProject?.project_type_code \|\| '']?.toLowerCase() \|\| 'this asset type'} properties, use:</strong> | ACTIVE |
| `src/app/projects/[projectId]/components/tabs/SourcesTab.tsx` | 9 |   project_type_code?: string; | ACTIVE |
| `src/app/projects/[projectId]/components/tabs/SourcesTab.tsx` | 17 |   const isMultifamily = project.project_type_code === 'MF'; | ACTIVE |
| `src/app/projects/[projectId]/components/tabs/UsesTab.tsx` | 9 |   project_type_code?: string; | ACTIVE |
| `src/app/projects/[projectId]/components/tabs/UsesTab.tsx` | 17 |   const isMultifamily = project.project_type_code === 'MF'; | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/ProjectSelector.tsx` | 46 |               {proj.project_name} - {proj.project_type_code \|\| 'LAND'} | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/CollapsibleContent.tsx` | 87 |                     {proj.project_name} - {proj.project_type_code \|\| 'LAND'} | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx` | 46 |       targetProject?.project_type_code, | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx` | 103 |                       {proj.project_name} - {proj.project_type_code \|\| 'LAND'} | ACTIVE |
| `src/app/projects/[projectId]/components/landscaper/SimpleProjectBar.tsx` | 62 |                   {proj.project_name} - {proj.project_type_code \|\| 'Unknown'} | ACTIVE |
| `src/app/projects/[projectId]/documents/page.tsx` | 55 |           projectType={project.project_type \|\| project.project_type_code \|\| null} | ACTIVE |
| `src/app/dashboard/page.tsx` | 55 |   project.project_type_code?.toUpperCase() \|\| | ACTIVE |
| `src/app/components/Home/HomeOverview.tsx` | 145 |   const propertyTypeLabel = PROPERTY_TYPE_LABELS[currentProject.project_type_code] \|\| currentProject.project_type_code \|\| 'Unknown'; | ACTIVE |
| `src/app/components/Home/HomeOverview.tsx` | 175 |                     value={currentProject.project_type_code \|\| ''} | ACTIVE |
| `src/app/components/Home/HomeOverview.tsx` | 176 |                     onChange={(e) => handleFieldChange('project_type_code', e.target.value)} | ACTIVE |
| `src/app/components/dashboard/DashboardMap.tsx` | 68 |   project.project_type_code?.toUpperCase() \|\| | ACTIVE |
| `src/app/components/dashboard/DashboardMap.tsx` | 75 |   return getPropertyTypeLabel(code \|\| project.project_type \|\| project.project_type_code \|\| 'Type N/A'); | ACTIVE |
| `src/app/components/new-project/validation.ts` | 25 |   project_type_code: optionalString(), | ACTIVE |
| `src/app/components/new-project/validation.ts` | 182 |   project_type_code: '', | ACTIVE |
| `src/app/components/new-project/ProjectSummaryPreview.tsx` | 76 |             {data.project_type_code && \` • ${data.project_type_code}\`} | ACTIVE |
| `src/app/components/new-project/types.ts` | 58 |   project_type_code: string | ACTIVE |
| `src/app/components/new-project/AssetTypeSection.tsx` | 29 |       setValue('project_type_code', '') | ACTIVE |
| `src/app/components/OpExHierarchy.tsx` | 30 |   project_type_code?: string; | ACTIVE |
| `src/app/components/OpExHierarchy.tsx` | 233 |   const projectType = data.project_type_code; | ACTIVE |
| `src/app/components/ProjectProvider.tsx` | 31 |   project_type_code?: string \| null | ACTIVE |
| `src/app/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx` | 48 |                 {project.project_name} - {project.project_type_code \|\| 'Unknown Type'} | DEAD |
| `src/app/api/unit-costs/templates/helpers.ts` | 14 |   project_type_code: string; | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 34 |   t.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 55 |   'project_type_code', | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 85 |   const projectType = typeof body.project_type_code === 'string' | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 86 |     ? body.project_type_code.trim().toUpperCase() | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 104 |     project_type_code: projectType \|\| 'LAND', | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 124 |   project_type_code: row.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 144 |     payload.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/templates/helpers.ts` | 162 |       project_type_code, | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 45 |   const projectTypeCode = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 65 |     whereParts.push(\`LOWER(t.project_type_code) = LOWER($${values.length})\`); | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 105 |         t.source, t.as_of_date, t.project_type_code, t.usage_count, t.last_used_date, | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 111 |         AND LOWER(t.project_type_code) = LOWER(${projectTypeCode}) | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 120 |         t.source, t.as_of_date, t.project_type_code, t.usage_count, t.last_used_date, | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 134 |         t.source, t.as_of_date, t.project_type_code, t.usage_count, t.last_used_date, | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 139 |         AND LOWER(t.project_type_code) = LOWER(${projectTypeCode}) | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 148 |         t.source, t.as_of_date, t.project_type_code, t.usage_count, t.last_used_date, | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 185 |   const projectTypeCode = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/unit-costs/templates/route.ts` | 206 |       (template) => template.project_type_code?.toUpperCase() === normalized | ACTIVE |
| `src/app/api/unit-costs/templates/[id]/route.ts` | 64 |     payload.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/templates/[id]/route.ts` | 84 |       project_type_code = $9, | ACTIVE |
| `src/app/api/unit-costs/templates/[id]/route.ts` | 162 |       case 'project_type_code': { | ACTIVE |
| `src/app/api/unit-costs/templates/[id]/route.ts` | 164 |           throw new Error('project_type_code must be a non-empty string'); | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 45 |   const projectTypeCode = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 65 |     whereParts.push(\`LOWER(t.project_type_code) = LOWER($${values.length})\`); | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 103 |         t.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 135 |         t.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 146 |         AND LOWER(t.project_type_code) = LOWER(${projectTypeCode}) | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 165 |       t.project_type_code, | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 209 |   const projectTypeCode = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/unit-costs/items/route.ts` | 230 |       (template) => template.project_type_code?.toUpperCase() === normalized | ACTIVE |
| `src/app/api/unit-costs/categories/route.ts` | 79 |   const projectTypeCode = searchParams.get('project_type_code') ?? null; | ACTIVE |
| `src/app/api/unit-costs/categories/route.ts` | 86 |       ? sql\`AND LOWER(t.project_type_code) = LOWER(${projectTypeCode})\` | ACTIVE |
| `src/app/api/unit-costs/categories/route.ts` | 117 |       ? sql\`AND LOWER(t.project_type_code) = LOWER(${projectTypeCode})\` | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/hierarchy/route.ts` | 49 |     const projectResult = await sql<{ project_type_code: string }[]>\` | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/hierarchy/route.ts` | 50 |       SELECT project_type_code | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/hierarchy/route.ts` | 63 |     const projectType = projectResult[0].project_type_code; | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/hierarchy/route.ts` | 167 |       project_type_code: projectType, | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/[accountId]/route.ts` | 241 |     const projectResult = await sql<{ project_type_code: string }[]>\` | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/[accountId]/route.ts` | 242 |       SELECT project_type_code | ACTIVE |
| `src/app/api/projects/[projectId]/operating-expenses/[accountId]/route.ts` | 250 |       const projectType = projectResult[0].project_type_code; | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 35 |         project_type_code, | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 912 |         project_type_code: project.project_type_code, | ACTIVE |
| `src/app/api/projects/[projectId]/operations/route.ts` | 1082 |       project_type_code: project.project_type_code, | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 64 |         p.project_type_code, | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 136 |       'property_type_code': 'project_type_code', | ACTIVE |
| `src/app/api/projects/[projectId]/profile/route.ts` | 249 |         p.project_type_code, | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 30 |     'project_type_code', | ACTIVE |
| `src/app/api/projects/[projectId]/route.ts` | 124 |         p.project_type_code, | ACTIVE |
| `src/app/api/projects/route.ts` | 27 |   project_type_code?: string \| null | ACTIVE |
| `src/app/api/projects/route.ts` | 40 | type FallbackProjectRow = Omit<RawProjectRow, 'project_type_code' \| 'is_active'> | ACTIVE |
| `src/app/api/projects/route.ts` | 85 |   project_type_code: 'COMMERCIAL', | ACTIVE |
| `src/app/api/projects/route.ts` | 169 |         project_type_code, | ACTIVE |
| `src/app/api/projects/route.ts` | 215 |       project_type_code: null, | ACTIVE |
| `src/app/api/projects/route.ts` | 258 |           project_type_code: normalizeProjectTypeCode(project.project_type_code ?? null, project.project_type ?? null), | ACTIVE |
| `src/app/api/projects/route.ts` | 265 |           ? withTileConfig.filter((project: RawProjectRow) => project.project_type_code === propertyTypeFilter.toUpperCase()) | ACTIVE |
| `src/app/api/projects/route.ts` | 297 |       project_type_code: normalizeProjectTypeCode(project.project_type_code, project.project_type), | ACTIVE |
| `src/app/api/projects/route.ts` | 304 |       ? withTileConfig.filter((project) => project.project_type_code === propertyTypeFilter.toUpperCase()) | ACTIVE |
| `src/app/api/projects/route.ts` | 324 |   project_type_code: string | ACTIVE |
| `src/app/api/projects/route.ts` | 355 |     if (!body.project_name \|\| !body.project_type_code \|\| !body.template_id) { | ACTIVE |
| `src/app/api/projects/route.ts` | 357 |         { error: 'Missing required fields: project_name, project_type_code, template_id' }, | ACTIVE |
| `src/app/api/projects/route.ts` | 368 |         project_type_code, | ACTIVE |
| `src/app/api/projects/route.ts` | 380 |         ${body.project_type_code}, | ACTIVE |
| `src/app/api/projects/route.ts` | 491 |         ${body.project_type_code}, | ACTIVE |
| `src/app/api/projects/route.ts` | 518 |         project_type_code, | ACTIVE |
| `src/app/api/projects/recent/route.ts` | 18 |  *         project_type_code: string, | ACTIVE |
| `src/app/api/projects/recent/route.ts` | 52 |       project_type_code: project.project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 16 |  *   project_type_code: string; | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 22 |     const { project_id, template_name, project_type_code } = body; | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 25 |     if (!project_id \|\| !template_name \|\| !project_type_code) { | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 27 |         { error: 'Missing required fields: project_id, template_name, project_type_code' }, | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 75 |         AND project_type_code = ${project_type_code} | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 100 |             project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 116 |             ${project_type_code}, | ACTIVE |
| `src/app/api/budget/category-templates/update/route.ts` | 136 |       project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 13 |  * - project_type_code: Filter by project type | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 18 |     const project_type_code = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 22 |     if (project_type_code) { | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 26 |           project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 34 |         WHERE project_type_code = ${project_type_code} | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 37 |         GROUP BY template_name, project_type_code | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 38 |         ORDER BY project_type_code, template_name | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 44 |           project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 54 |         GROUP BY template_name, project_type_code | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 55 |         ORDER BY project_type_code, template_name | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 61 |       project_type_code: row.project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 62 |       description: getTemplateDescription(row.template_name, row.project_type_code), | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 94 |  *   project_type_code: string; | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 104 |       project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 109 |     if (!project_id \|\| !template_name \|\| !project_type_code) { | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 111 |         { error: 'Missing required fields: project_id, template_name, project_type_code' }, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 170 |         AND project_type_code = ${project_type_code} | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 205 |             project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 258 | function getTemplateDescription(template_name: string, project_type_code: string): string { | ACTIVE |
| `src/app/api/budget/category-templates/route.ts` | 268 |   return descriptions[template_name] \|\| \`${template_name} budget template for ${project_type_code} projects\`; | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 16 |  *   project_type_code: string; | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 22 |     const { project_id, template_name, project_type_code } = body; | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 25 |     if (!project_id \|\| !template_name \|\| !project_type_code) { | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 27 |         { error: 'Missing required fields: project_id, template_name, project_type_code' }, | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 50 |         AND project_type_code = ${project_type_code} | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 55 |         { error: \`Template "${template_name}" already exists for ${project_type_code}\` }, | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 108 |             project_type_code, | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 124 |             ${project_type_code}, | ACTIVE |
| `src/app/api/budget/category-templates/save-new/route.ts` | 144 |       project_type_code, | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 16 |  * - project_type_code: Get categories for specific project type | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 23 |     const project_type_code = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 33 |         SELECT project_type_code, project_name | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 45 |       const projectType = projectResult[0].project_type_code; | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 68 |           NULL::text as project_type_code, | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 102 |           NULL::text as project_type_code, | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 114 |     } else if (project_type_code) { | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 134 |           NULL::text as project_type_code, | ACTIVE |
| `src/app/api/budget/categories/tree/route.ts` | 166 |           NULL::text as project_type_code, | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 15 |  * - project_type_code: Filter by project type | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 27 |     const project_type_code = searchParams.get('project_type_code'); | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 99 |     if (template_name && project_type_code) { | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 102 |       console.warn('⚠️ template_name+project_type_code query path deprecated after Phase 4'); | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 139 |  *   project_type_code?: string; | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 158 |       project_type_code = null, | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 246 |         project_type_code, | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 262 |         ${project_type_code}, | ACTIVE |
| `src/app/api/budget/categories/route.ts` | 280 |         project_type_code, | ACTIVE |
| `src/app/api/budget/categories/[id]/route.ts` | 38 |         project_type_code, | ACTIVE |
| `src/app/api/budget/categories/[id]/route.ts` | 200 |         project_type_code, | ACTIVE |
| `src/app/_archive/projects-overview/page.tsx` | 34 |   const propertyType = currentProject?.project_type_code?.toLowerCase() \|\| ''; | DEAD |
| `src/app/_archive/projects-overview/page.tsx` | 84 |                 {project.project_name} - {project.project_type_code \|\| 'Unknown Type'} | DEAD |
| `src/app/_archive/projects-overview/page.tsx` | 170 |           <div style={{ color: 'var(--cui-body-color)' }} className="font-medium">{project.project_type_code \|\| 'N/A'}</div> | DEAD |
| `src/app/_archive/components-studio/StudioProjectBar.tsx` | 52 |       targetProject?.project_type_code, | DEAD |
| `src/components/contacts/ContactDetailPanel.tsx` | 90 |   project_type_code: string; | ACTIVE |
| `src/components/operations/types.ts` | 137 |   project_type_code: string; | ACTIVE |
| `src/components/project/ProjectProfileEditModal.tsx` | 79 |     property_type_code: current.project_type_code \|\| current.project_type \|\| undefined, | ACTIVE |
| `src/components/dashboard/ProjectTable.tsx` | 12 |   project_type_code: string \| null; | ACTIVE |
| `src/components/dashboard/ProjectTable.tsx` | 103 |                     <TypeBadge typeCode={project.project_type_code} /> | ACTIVE |
| `src/components/map-tab/types.ts` | 110 |   project_type_code?: string; | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | 450 |     project_type_code: source.project_type_code ?? source.projectTypeCode ?? DEFAULT_PROJECT_TYPE, | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | 483 |     project_type_code: projectType \|\| DEFAULT_PROJECT_TYPE, | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | 510 |     project_type_code: row.project_type_code \|\| DEFAULT_PROJECT_TYPE | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | 572 |         params.set('project_type_code', projectTypeFilter); | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | 644 |         if (projectTypeFilter) params.set('project_type_code', projectTypeFilter); | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` | 39 |     project_type_code: template?.project_type_code \|\| DEFAULT_PROJECT_TYPE | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` | 55 |         project_type_code: template.project_type_code | ACTIVE |
| `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` | 67 |         project_type_code: DEFAULT_PROJECT_TYPE | ACTIVE |
| `src/components/budget/CostCategoriesTab.tsx` | 76 |           project_type_code: projectTypeCode, | ACTIVE |
| `src/components/budget/CostCategoriesTab.tsx` | 103 |                 project_type_code: projectTypeCode, | ACTIVE |
| `src/components/budget/CostCategoriesTab.tsx` | 203 |                     key={\`${template.template_name}\|${template.project_type_code}\`} | ACTIVE |
| `src/components/budget/CostCategoriesTab.tsx` | 204 |                     value={\`${template.template_name}\|${template.project_type_code}\`} | ACTIVE |
| `src/components/budget/CostCategoriesTab.tsx` | 206 |                     {template.template_name} ({template.project_type_code}) - {template.category_count} categories | ACTIVE |
| `src/components/budget/CreateTemplateModal.tsx` | 62 |           project_type_code: projectTypeCode, | ACTIVE |
| `src/components/budget/BudgetGridTab.tsx` | 263 |           payload?.project?.project_type_code ?? | ACTIVE |
| `src/components/budget/BudgetGridTab.tsx` | 265 |           payload?.project_type_code ?? | ACTIVE |
| `src/components/budget/TemplateEditorModal.tsx` | 84 |           project_type_code: projectTypeCode, | ACTIVE |
| `src/components/budget/TemplateEditorModal.tsx` | 112 |             project_type_code: projectTypeCode, | ACTIVE |
| `src/components/budget/TemplateEditorModal.tsx` | 137 |             project_type_code: projectTypeCode, | ACTIVE |
| `src/components/budget/custom/EditableCell.tsx` | 283 |           params.set('project_type_code', meta.projectTypeCode); | ACTIVE |
| `src/components/budget/BudgetItemModalV2.tsx` | 440 |             project_type_code: 'LAND', // TODO: Get from project config | ACTIVE |
| `src/components/budget/CategoryTemplateManager.tsx` | 78 |         \`/api/budget/categories/tree?template_name=${encodeURIComponent(template.template_name)}&project_type_code=${encodeURIComponent(template.project_type_code)}\` | ACTIVE |
| `src/components/budget/CategoryTemplateManager.tsx` | 105 |           project_type_code: selectedTemplate.project_type_code, | ACTIVE |
| `src/components/budget/CategoryTemplateManager.tsx` | 196 |             <CCol key={\`${template.template_name}-${template.project_type_code}\`} md={6} lg={4} className="mb-3"> | ACTIVE |
| `src/components/budget/CategoryTemplateManager.tsx` | 201 |                     <PropertyTypeBadge typeCode={template.project_type_code} /> | ACTIVE |
| `src/components/budget/CategoryTemplateManager.tsx` | 270 |                 <PropertyTypeBadge typeCode={selectedTemplate.project_type_code} /> | ACTIVE |
| `src/hooks/useCapitalization.ts` | 105 |   project_type_code: string \| null; | ACTIVE |
| `src/hooks/useUnitCostCategoriesForBudget.ts` | 63 |         params.set('project_type_code', projectTypeCode); | ACTIVE |
| `src/hooks/useBudgetCategories.ts` | 100 |       if (projectTypeCode) params.append('project_type_code', projectTypeCode); | ACTIVE |
| `src/hooks/useBudgetCategories.ts` | 133 |       if (projectTypeCode) params.append('project_type_code', projectTypeCode); | ACTIVE |
| `src/hooks/useBudgetCategories.ts` | 387 |           project_type_code: projectTypeCode, | ACTIVE |
| `src/lib/api/categories.ts` | 22 |   project_type_code?: string; | ACTIVE |
| `src/lib/api/categories.ts` | 32 |   if (params?.project_type_code) queryParams.set('project_type_code', params.project_type_code); | ACTIVE |
| `src/lib/api/contacts.ts` | 268 |     project_type_code: string; | ACTIVE |
| `src/lib/unitCostFallback.ts` | 177 |       project_type_code: DEFAULT_PROJECT_TYPE, | ACTIVE |
| `backend/apps/landscaper/tool_registry.py` | 313 | def _is_land_project(project_type_code: Optional[str], project_type: Optional[str]) -> bool: | ACTIVE |
| `backend/apps/landscaper/tool_registry.py` | 317 |     if project_type_code: | ACTIVE |
| `backend/apps/landscaper/tool_registry.py` | 318 |         return "land" in project_type_code.lower() | ACTIVE |
| `backend/apps/landscaper/tool_registry.py` | 334 |     project_type_code: Optional[str] = None, | ACTIVE |
| `backend/apps/landscaper/tool_registry.py` | 341 |     is_land = _is_land_project(project_type_code, project_type) | ACTIVE |
| `backend/apps/landscaper/services/hbu_tools.py` | 656 |                        p.project_type_code, p.property_subtype | ACTIVE |
| `backend/apps/landscaper/services/hbu_tools.py` | 710 |                 'property_type': scenario.get('project_type_code'), | ACTIVE |
| `backend/apps/landscaper/services/mutation_service.py` | 249 |         "project_type_code", "is_active", "source", "as_of_date", | ACTIVE |
| `backend/apps/financial/migrations/0001_add_vendor_contact_id.py` | 336 |                     "project_type_code", | ACTIVE |
| `backend/apps/financial/migrations/0001_add_vendor_contact_id.py` | 2285 |                 ("project_type_code", models.CharField(default="LAND", max_length=50)), | ACTIVE |
| `backend/apps/financial/models_benchmarks.py` | 191 |     project_type_code = models.CharField(max_length=50, default='LAND') | ACTIVE |
| `backend/apps/financial/views_income_approach.py` | 399 |         'project_type_code': project.project_type_code, | ACTIVE |
| `backend/apps/financial/serializers_budget_categories.py` | 64 |             'project_type_code', | ACTIVE |
| `backend/apps/financial/serializers_unit_costs.py` | 167 |             'project_type_code', | ACTIVE |
| `backend/apps/financial/serializers_unit_costs.py` | 253 |             'project_type_code', | ACTIVE |
| `backend/apps/financial/serializers_unit_costs.py` | 270 |     def validate_project_type_code(self, value: str) -> str: | ACTIVE |
| `backend/apps/financial/serializers_unit_costs.py` | 275 |             raise serializers.ValidationError(f"project_type_code must be one of {', '.join(sorted(allowed))}") | ACTIVE |
| `backend/apps/financial/models_valuation.py` | 1776 |         help_text='Property type: land_dev (from LAND project_type_code) or cre (all other types)' | ACTIVE |
| `backend/apps/financial/models_valuation.py` | 1871 |         Determine the property_type based on project_type_code. | ACTIVE |
| `backend/apps/financial/models_valuation.py` | 1877 |             'land_dev' if project_type_code is 'LAND', otherwise 'cre' | ACTIVE |
| `backend/apps/financial/models_valuation.py` | 1879 |         return 'land_dev' if project.project_type_code == 'LAND' else 'cre' | ACTIVE |
| `backend/apps/financial/models_valuation.py` | 1887 |         property_type is automatically determined from project.project_type_code. | ACTIVE |
| `backend/apps/financial/views_valuation.py` | 1032 |             'site', project.project_type_code | ACTIVE |
| `backend/apps/financial/views_valuation.py` | 1035 |             'improvement', project.project_type_code | ACTIVE |
| `backend/apps/financial/views_dcf_analysis.py` | 29 |     property_type is automatically determined from project.project_type_code. | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 89 |     project_type_code = models.CharField( | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 160 |             models.Index(fields=['template_name', 'project_type_code'], name='idx_budget_cat_template'), | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 460 |                     project_type_code=project.project_type_code | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 468 |     def get_template_categories(cls, template_name=None, project_type_code=None): | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 474 |             project_type_code (str, optional): Filter by project type | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 484 |         if project_type_code: | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 485 |             qs = qs.filter(project_type_code=project_type_code) | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 490 |     def copy_template_to_project(cls, template_name, project_type_code, project_id): | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 496 |             project_type_code (str): Project type code | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 508 |         templates = cls.get_template_categories(template_name, project_type_code) | ACTIVE |
| `backend/apps/financial/models_budget_categories.py` | 529 |                     project_type_code=None, | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 108 |         project_type_code = self.request.query_params.get('project_type_code') | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 131 |         if project_type_code: | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 132 |             item_filter &= Q(items__project_type_code__iexact=project_type_code) | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 195 |         project_type_code = request.query_params.get('project_type_code') | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 197 |         if project_type_code: | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 198 |             item_filter &= Q(items__project_type_code__iexact=project_type_code) | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 302 |         project_type_code = self.request.query_params.get('project_type_code') | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 303 |         if project_type_code: | ACTIVE |
| `backend/apps/financial/views_unit_costs.py` | 304 |             qs = qs.filter(project_type_code__iexact=project_type_code) | ACTIVE |
| `backend/apps/financial/views_land_dev_cashflow.py` | 5 | Routes to the appropriate service based on project_type_code: | ACTIVE |
| `backend/apps/financial/views_land_dev_cashflow.py` | 27 |     return getattr(project, 'project_type_code', '') == 'LAND' | ACTIVE |
| `backend/apps/projects/primary_measure.py` | 32 |     def _get_project_type_code(cur) -> Optional[str]: | ACTIVE |
| `backend/apps/projects/primary_measure.py` | 34 |             "SELECT project_type_code FROM landscape.tbl_project WHERE project_id = %s", | ACTIVE |
| `backend/apps/projects/primary_measure.py` | 51 |         project_type_code = _get_project_type_code(cur) | ACTIVE |
| `backend/apps/projects/primary_measure.py` | 62 |             if column == 'acres_gross' and project_type_code == 'LAND': | ACTIVE |
| `backend/apps/projects/models.py` | 42 |     project_type_code = models.CharField(max_length=50, blank=True, null=True, db_column='project_type_code') | ACTIVE |
| `backend/apps/projects/serializers.py` | 88 |             'project_type_code', | ACTIVE |
| `backend/apps/projects/services_completeness.py` | 102 |                 project_type_code, | ACTIVE |
| `backend/apps/projects/services_completeness.py` | 122 |             'project_type_code': row[1], | ACTIVE |
| `backend/apps/projects/services/project_cloner.py` | 79 |         project_type = (source.project_type_code or '').upper() | ACTIVE |
| `backend/apps/contacts/views.py` | 377 |                 'project_type_code': a.project.project_type_code, | ACTIVE |
| `backend/apps/knowledge/management/commands/backfill_entity_facts.py` | 132 |             SELECT project_id, project_name, project_type_code, city, state, | ACTIVE |
| `backend/apps/knowledge/management/commands/backfill_entity_facts.py` | 177 |                         project_type_code=project.get('project_type_code'), | ACTIVE |
| `backend/apps/knowledge/management/commands/backfill_entity_facts.py` | 209 |                     project_type_code=project.get('project_type_code'), | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 16 |                 \|   - project_address                    \|   city/state, project_type_code, | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 18 |                 \|   - project_type_code                  \| 6 fields total | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 22 | Property        \| Depends on project_type_code:          \| MF: unit types + rents defined | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 110 |                 project_type_code, | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 137 |         'project_type_code': row[2], | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 168 |     project_type = project_basics.get('project_type_code', '').upper() if project_basics.get('project_type_code') else '' | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 294 |         ('project_type_code', project_basics.get('project_type_code')), | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 306 |     if not project_basics.get('project_type_code'): | ACTIVE |
| `backend/apps/knowledge/views/project_bar_views.py` | 319 |     project_type = project_basics.get('project_type_code', '').upper() if project_basics.get('project_type_code') else '' | ACTIVE |
| `backend/apps/knowledge/views/extraction_views.py` | 2292 |         project_type_code = project_row[0] if project_row else 'MF' | ACTIVE |
| `backend/apps/knowledge/views/extraction_views.py` | 2294 |     registry_property_type = 'land_development' if project_type_code == 'LAND' else 'multifamily' | ACTIVE |
| `backend/apps/knowledge/services/confidence_calculator.py` | 94 |                 CASE WHEN project_type_code IS NOT NULL THEN 1 ELSE 0 END + | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 173 |                 project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 614 |     if row.get('project_type_code'): | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 615 |         lines.append(f"- Type: {row['project_type_code']}") | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 12 |         project_type_code="MF" | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 47 |         project_type_code: Optional[str] = None, | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 58 |             project_type_code: Property type (MF, LAND, OFF, RET, etc.) | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 73 |             'project_type_code': project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 85 |                 'entity_subtype': project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 98 |             if project_type_code and entity.entity_subtype != project_type_code: | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 99 |                 entity.entity_subtype = project_type_code | ACTIVE |
| `backend/apps/knowledge/services/entity_sync_service.py` | 337 |             project_type_code=getattr(project, 'project_type_code', None), | ACTIVE |
| `backend/apps/knowledge/services/fact_service.py` | 64 |         project_type_code: Optional[str] = None, | ACTIVE |
| `backend/apps/knowledge/services/fact_service.py` | 84 |             project_type_code: Property type code | ACTIVE |
| `backend/apps/knowledge/services/fact_service.py` | 98 |             project_type_code=project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/fact_service.py` | 153 |         project_type_code: Optional[str] = None, | ACTIVE |
| `backend/apps/knowledge/services/fact_service.py` | 170 |             project_type_code=project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/user_knowledge_retriever.py` | 65 |                 Q(metadata__project_type_code=property_type) \| | ACTIVE |
| `backend/apps/knowledge/services/user_knowledge_retriever.py` | 104 |                 'property_type': entity.metadata.get('project_type_code') or entity.metadata.get('property_type'), | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 106 |                     p.project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 139 |         prop_type = data.get('project_type_code') or data.get('analysis_type') | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 65 |                 project_type_code, | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 86 |             'project_type_code': row[1], | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 201 |     if info.get('project_type_code'): | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 202 |         lines.append(f"  Type: {info['project_type_code']}") | ACTIVE |
| `backend/apps/calculations/services.py` | 80 |     def _fetch_cashflows_from_django_service(project_id: int, project_type_code: Optional[str] = None): | ACTIVE |
| `backend/apps/calculations/services.py` | 95 |         if (project_type_code or '').upper() == 'LAND': | ACTIVE |
| `backend/apps/calculations/services.py` | 726 |                     SELECT project_type_code | ACTIVE |
| `backend/apps/calculations/services.py` | 732 |                 project_type_code = (project_row[0] or '').upper() if project_row else '' | ACTIVE |
| `backend/apps/calculations/services.py` | 760 |                     'project_type_code': project_type_code or None, | ACTIVE |
| `backend/apps/calculations/services.py` | 797 |                 project_type_code=project_type_code, | ACTIVE |
| `backend/apps/calculations/loan_sizing_service.py` | 218 |         is_land = (getattr(project, "project_type_code", "") or "").upper() == "LAND" | ACTIVE |
| `backend/apps/calculations/loan_sizing_service.py` | 320 |             "project_type_code": getattr(project, "project_type_code", None), | ACTIVE |

#### analysis_mode
| File | Line | Snippet | Status |
|---|---:|---|---|
| `src/app/projects/[projectId]/napkin/page.tsx` | 16 |   const isDeveloperMode = currentProject?.analysis_mode === 'developer'; | ACTIVE |
| `src/app/components/ProjectProvider.tsx` | 37 |   analysis_mode?: 'napkin' \| 'developer' \| null | ACTIVE |
| `src/app/api/projects/[projectId]/promote/route.ts` | 20 |     // Update the analysis_mode to 'developer' | ACTIVE |
| `src/app/api/projects/[projectId]/promote/route.ts` | 24 |         analysis_mode = 'developer', | ACTIVE |
| `src/app/api/projects/[projectId]/promote/route.ts` | 34 |         analysis_mode, | ACTIVE |
| `src/app/api/projects/route.ts` | 33 |   analysis_mode?: string \| null | ACTIVE |
| `src/app/api/projects/route.ts` | 91 |   analysis_mode: 'napkin', | ACTIVE |
| `src/app/api/projects/route.ts` | 175 |         COALESCE(analysis_mode, 'napkin') AS analysis_mode, | ACTIVE |
| `src/app/api/projects/route.ts` | 220 |       analysis_mode: 'napkin' | ACTIVE |
| `src/app/api/projects/route.ts` | 260 |           analysis_mode: project.analysis_mode ?? 'napkin', | ACTIVE |
| `src/app/api/projects/route.ts` | 299 |       analysis_mode: project.analysis_mode ?? 'napkin', | ACTIVE |
| `src/components/napkin/PromoteModal.tsx` | 30 |       // Call API to update analysis_mode | ACTIVE |
| `backend/apps/landscaper/services/mutation_service.py` | 60 |         "analysis_mode", "value_add_enabled", "active_opex_discriminator", | ACTIVE |
| `backend/apps/projects/models.py` | 94 |     analysis_mode = models.CharField(max_length=20, blank=True, null=True, default='napkin') | ACTIVE |
| `backend/apps/projects/serializers.py` | 104 |             'analysis_mode', | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 185 |                 analysis_mode | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 618 |     if row.get('analysis_mode'): | ACTIVE |
| `backend/apps/knowledge/services/query_builder.py` | 619 |         lines.append(f"- Mode: {row['analysis_mode']}") | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 111 |                     p.analysis_mode, | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 142 |         if data.get('analysis_mode'): | ACTIVE |
| `backend/apps/knowledge/services/project_context.py` | 143 |             lines.append(f"Analysis Mode: {data['analysis_mode']}") | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 75 |                 analysis_mode | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 96 |             'analysis_mode': row[11], | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 205 |     if info.get('analysis_mode'): | ACTIVE |
| `backend/apps/knowledge/services/schema_context.py` | 206 |         lines.append(f"  Mode: {info['analysis_mode']}") | ACTIVE |

#### getTabsForPropertyType
No additional references outside covered files.
## SUMMARY: Classification Fields Usage Map

| Location | Field Used | Values Handled | Behavior |
|---|---|---|---|
| `src/lib/utils/projectTabs.ts` | `project_type` (input arg) | `LAND`, `MPC`, `LAND DEVELOPMENT`, string contains `Land Development`, else fallback | Returns two different 5-tab arrays; currently unreferenced (`DEAD`) |
| `src/lib/utils/folderTabConfig.ts` | `projectType` + `analysisType` + `tileConfig` | Income vs land via `isIncomeProperty`, `analysisTypes` filter (`VALUE_ADD` for renovation), tile booleans | Builds active folder/subtab nav and hides folders by `tbl_analysis_type_config` booleans |
| `src/hooks/useFolderNavigation.ts` | `propertyType`, `analysisType`, `tileConfig` | URL `folder/tab` with config validation | Reads active tab state from URL; validates against folder config |
| `src/app/projects/[projectId]/ProjectLayoutClient.tsx` | `property_subtype`, `project_type`, `project_type_code`, `analysis_type` | Fallback chain for property type | Feeds folder nav + renders folder tabs and current content |
| `src/app/projects/[projectId]/ProjectContentRouter.tsx` | `project_type_code`, `project_type`, `property_subtype`, `analysis_type` (through config/props) | Folder keys + subtab keys | Chooses which tab component to render |
| `src/app/projects/[projectId]/components/ActiveProjectBar.tsx` | `analysis_type`, `project_type_code` (+ fallback fields) | Tokenized property type + analysis badge | Renders selector + badges; no switching UI |
| `src/app/components/NewProjectModal.tsx` | `analysis_type`, `property_category`, `property_subtype`, computed `project_type_code` | Analysis: `VALUATION/INVESTMENT/VALUE_ADD/DEVELOPMENT/FEASIBILITY`; category: `Land Development/Income Property` | Creates projects through `/api/projects/minimal`; sets `analysis_mode='napkin'` via API |
| `src/app/api/projects/minimal/route.ts` | `analysis_type`, `project_type_code`, `analysis_mode` | Any provided analysis type + normalized type code | Inserts into `tbl_project`; hardcodes `analysis_mode='napkin'` |
| `src/app/projects/setup/*` + `/api/projects/setup` | (no `analysis_type`/`project_type_code` writes) | assetType/hierarchy labels | Creates project/config/settings, but not modern classification fields |
| `backend/apps/landscaper/views.py` | `project_type`, `project_type_code` | From project model | Passes context into AI handler; does not pass `analysis_type` or `analysis_mode` |
| `backend/apps/landscaper/ai_handler.py` | `project_context.project_type` for prompt category; `project_type_code` for page-context normalization | `land/mf/off/ret/ind` map else default | Selects system prompt + filters tool set |
| `backend/apps/landscaper/tool_registry.py` | `project_type_code` + `project_type` | `"land"` substring check vs other | Normalizes page context to `land_*` vs `mf_*`; controls tool availability by page |
| `backend/apps/landscaper/tool_executor.py` | tool-input `property_type`/`project_type_code` fields | Optional per-tool filters | Query filtering only; not project-classification-gated availability |
| `backend/apps/knowledge/services/extraction_service.py` | `property_type` parameter (caller-supplied) | defaults `multifamily`; supports alternative property types via registry | Extraction schema/prompt field selection varies by `property_type` argument |

## Success Criteria Check

1. [x] Database queries executed and results captured
2. [x] Every tab in the current navigation identified with component paths
3. [x] Project creation flow fully documented
4. [x] Landscaper system prompt selection logic documented
5. [x] All codebase references to classification fields cataloged
6. [x] Output file created at `docs/TAXONOMY_AUDIT_2026-02-12.md`
7. [x] Summary table is complete

## Verification Output

```bash
wc -l docs/TAXONOMY_AUDIT_2026-02-12.md
head -100 docs/TAXONOMY_AUDIT_2026-02-12.md
```

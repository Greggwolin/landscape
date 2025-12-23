# Current Page Structure Documentation
Generated: 2025-12-05

## Navigation Overview

### Standard Mode Nav Tiles
| Tile | Color | Route | Description |
|------|-------|-------|-------------|
| Project Home | Blue #3d99f5 | `/projects/{projectId}` | Main project dashboard with tabs |
| Planning | Green #57c68a | `/projects/{projectId}/planning/market` | Market analysis, land use, budget |
| Budget | Purple #7a80ec | `/projects/{projectId}/budget` | Development budget management |
| Sales | Pink #e64072 | `/projects/{projectId}/sales-marketing` | Sales & absorption tracking |
| Cash Flow | Yellow #f2c40d | `/projects/{projectId}/results` | Project cash flow analysis |
| Waterfall | Orange #d97706 | `/projects/{projectId}/capitalization/equity` | Equity structure & waterfall |
| Reports | Gray #6b7785 | `/projects/{projectId}/analysis` | Feasibility & valuation |
| Documents | Dark #272d35 | `/projects/{projectId}/documents` | Document management |

### Napkin Mode Nav Tiles
| Tile | Color | Route | Description |
|------|-------|-------|-------------|
| Project Home | Blue #3d99f5 | `/projects/{projectId}` | Project overview |
| Analysis | Gray #6b7785 | `/projects/{projectId}/analysis` | Quick analysis tools |
| Documents | Dark #272d35 | `/projects/{projectId}/documents` | Document management |

---

## Page Details

---

### DASHBOARD: `/dashboard`

**Layout:** Two-column with sticky header

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| ProjectCountTiles | Filter tiles showing project counts by type | Yes | tbl_projects |
| ProjectAccordion | Scrollable list of projects with metadata | Yes | tbl_projects |
| DashboardMap | MapLibre map showing project locations | Yes | tbl_projects (lat/lon) |
| UserTile | AI assistant input (Landscaper) | No | N/A (placeholder) |
| NewProjectModal | Create new project dialog | Yes | tbl_projects (insert) |

**API Endpoints:**
- Project list via `useProjectContext()` → `/api/projects`

---

### DOCUMENTS (Global): `/dms`

**Layout:** Two-tab interface (Documents / Upload)

**Documents Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| DocTypeFilters | Accordion filter by document type | Yes | core_doc, dms_templates |
| FilterDetailView | Document list for selected type | Yes | core_doc |

**Upload Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| Dropzone | File upload handler | Yes | core_doc (insert) |
| ProfileForm | Document metadata editor | Yes | core_doc.profile_json |

**API Endpoints:**
- `GET /api/dms/templates/doc-types` - Document type templates
- `GET /api/dms/filters/counts` - Document counts by type
- `GET /api/dms/search` - Document search
- `PATCH /api/dms/documents/{id}/profile` - Update document metadata

---

### DOCUMENTS REVIEW: `/documents/review`

**Layout:** Three-tab interface (Queue / Detail / Analytics)

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| ExtractionQueue | List of documents pending review | Yes | dms_extract_queue |
| ExtractionDetail | View/correct extracted fields | Yes | dms_extract_queue, ai_correction_log |
| CorrectionAnalytics | Training accuracy metrics | Yes | ai_correction_log |

**API Endpoints:**
- `GET /api/extractions/queue` - Queue listing
- `POST /api/ai/analyze-document` - Trigger extraction
- `GET /api/extractions/{id}/review` - Extraction details
- `POST /api/extractions/{id}/correct` - Log correction
- `POST /api/extractions/{id}/commit` - Commit to database

---

## Project Pages

---

### PROJECT HOME: `/projects/[projectId]`

**Tabs:** (via `?tab=` query parameter)
| Tab Name | Query Param | Status | Project Types |
|----------|-------------|--------|---------------|
| Project | `?tab=project` (default) | Active | All |
| Planning | `?tab=planning` | Active | LAND only |
| Budget | `?tab=budget` | Active | All |
| Sales | `?tab=sales` | Active | LAND only |
| Feasibility | `?tab=feasibility` | Active | LAND only |
| Property | `?tab=property` | Active | MF only |
| Operations | `?tab=operations` | Active | MF, LAND |
| Valuation | `?tab=valuation` | Partial | All |
| Capitalization | `?tab=capitalization` | Placeholder | All |
| Reports | `?tab=reports` | Active | All |
| Documents | `?tab=documents` | Active | All |

---

**Project Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| ProjectHeader | Project name, type, location | Yes | tbl_projects |
| ProfileSection | Address, coordinates, APNs | Yes | tbl_projects |
| FinancialSummary | GPR, GPI, EGI, NOI, Cap Rates | Yes | tbl_projects, financial calcs |
| MapView | 3D oblique aerial map | Yes | tbl_projects (coordinates) |
| GlobalAssumptions | Inflation schedules | Partial | tbl_projects (TODO: backend persist) |
| ContactsSection | Listing brokerage, contacts | No | N/A (placeholder) |
| MacroConditionsTiles | CPI, Treasury, Prime, SOFR | Yes | External market API |

**API Endpoints:**
- `GET /api/projects/{id}/details`
- `PATCH /api/projects/{id}/profile`
- `fetchMarketStatsForProject()` - External market data

---

**Planning Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| PlanningContent | Full land planning interface | Yes | See Planning section below |

---

**Budget Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| BudgetContainer | Budget management container | Yes | See Budget section below |

---

**Sales Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| SalesContent | Sales & absorption interface | Yes | See Sales section below |

---

**Feasibility Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| FeasibilitySubNav | Sub-tab navigation | No | N/A |
| ValidationReport | Project validation checks | Yes | Multiple tables |
| CashFlowAnalysisTab | DCF analysis | Partial | Financial engine |
| MarketDataContent | Comparable sales | Yes | tbl_market_* |
| ResidualLandValue | RLV calculations | No | Coming Soon |

---

**Property Tab Components (MF only):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| RentRollTable | Unit-level rent details | Yes | tbl_units, tbl_leases |
| FloorPlanMatrix | Unit type summary | Yes | tbl_unit_types |
| CompRentalMap | Comparable rentals map | Yes | External API |
| OccupancyMetrics | Occupancy KPIs | Yes | tbl_units, tbl_leases |

---

**Operations Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| OpExHierarchy | Operating expense tree | Yes | Chart of Accounts (5100-5550) |
| ExpenseCategories | Expense breakdown | Yes | tbl_operating_expenses |
| BenchmarkPanel | Market comparisons | Yes | tbl_benchmarks |

**API Endpoints:**
- `GET /api/projects/{id}/operating-expenses/hierarchy`
- `POST /api/projects/{id}/opex`

---

**Valuation Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| SalesComparisonApproach | Comparable sales analysis | Yes | Valuation API |
| CostApproach | Replacement cost analysis | No | Coming Phase 2 |
| IncomeApproach | Income capitalization | No | Coming Phase 2 |

---

**Capitalization Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| CapitalizationPlaceholder | Coming soon message | No | N/A |

---

**Reports Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| ReportTypeSelector | Report type dropdown | No | N/A |
| ScenarioSelector | Current/Proforma toggle | No | N/A |
| PropertySummaryView | Summary display | Yes | Project summary data |
| PDFDownloadLinks | Download report PDFs | Yes | Backend report generation |

**API Endpoints:**
- `GET {backendUrl}/api/reports/{id}/property-summary.pdf`
- `GET {backendUrl}/api/reports/{id}/cash-flow.pdf`
- `GET {backendUrl}/api/reports/{id}/rent-roll.pdf`

---

**Documents Tab Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| DMSView | Full DMS interface | Yes | core_doc, dms_templates |

---

### PLANNING: `/projects/[projectId]/planning/`

**Sticky Tabs:**
| Tab Name | Route | Status |
|----------|-------|--------|
| Market Analysis | `/planning/market` | Active |
| Land Use & Parcels | `/planning/land-use` | Active |
| Budget | `/planning/budget` | Active |

---

**Market Analysis Page (`/planning/market`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| NapkinSfdPricing | SFD pricing by lot size bands | Yes | tbl_sf_comp |
| LandscaperPanel | AI chat interface | No | Mock chat (placeholder) |
| CompetitorsList | Competitive projects | Yes | tbl_market_competitors |

**API Endpoints:**
- `GET /api/projects/{id}/market/competitors`
- `POST/PATCH/DELETE /api/projects/{id}/market/competitors/{cid}`
- `useSfComps()` - Comparable sales hook

---

**Land Use & Parcels Page (`/planning/land-use`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| AreaPhaseSummary | Collapsible area/phase tree | Yes | tbl_areas, tbl_phases |
| PhaseDetailTable | Phase editing | Yes | tbl_phases |
| ParcelDetailTable | Parcel CRUD with cascading dropdowns | Yes | tbl_parcels |
| LandUseFamilyDropdown | Land use family selection | Yes | tbl_landuse_families |

**API Endpoints:**
- `GET/POST/PATCH/DELETE /api/parcels`
- `GET/POST/PATCH/DELETE /api/phases`
- `GET/POST/PATCH/DELETE /api/areas`
- `GET /api/landuse/families`
- `GET /api/landuse/types/{familyId}`
- `GET /api/landuse/lot-products/{typeId}`

---

**Planning Budget Page (`/planning/budget`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| BudgetGridTab | Filtered to Planning & Engineering | Yes | tbl_budget_items |

---

### BUDGET: `/projects/[projectId]/budget`

**Sub-tabs:**
| Tab Name | Status |
|----------|--------|
| Budget Grid | Active |
| Timeline View | Active |
| Assumptions | Active |
| Analysis | Active |
| Cost Categories | Active |

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| BudgetDataGrid | Main editable grid | Yes | tbl_budget_items |
| BudgetItemModalV2 | Add/edit budget items | Yes | tbl_budget_items |
| FiltersAccordion | Area/phase filters | Yes | tbl_divisions |
| TimelineChart | Gantt-style timeline | Yes | tbl_budget_items |
| ModeSelector | Napkin/Mid/Pro toggle | Yes | tbl_user_preferences |

**API Endpoints:**
- `useBudgetData()` - Budget CRUD
- `GET /api/projects/{id}/inflation-settings`
- `GET /api/projects/{id}/containers`

---

### SALES & MARKETING: `/projects/[projectId]/sales-marketing`

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| AnnualInventoryGauge | Inventory visualization | Yes | tbl_parcels, tbl_phases |
| AreaTiles | Area selection | Yes | tbl_areas |
| PhaseTiles | Phase selection | Yes | tbl_phases |
| PricingTable | Land use pricing by phase | Yes | tbl_pricing_assumptions |
| ParcelSalesTable | Parcel sales data | Yes | tbl_parcel_sales |

**API Endpoints:**
- `GET /api/projects/{id}/containers`
- `GET /api/projects/{id}/phases`
- `GET /api/projects/{id}/parcels-with-sales`

---

### CASH FLOW / RESULTS: `/projects/[projectId]/results`

**Tabs:**
| Tab Name | Status |
|----------|--------|
| Sales Comparison Analysis | Active |
| Feasibility Analysis | Placeholder |
| Valuation Summary | Placeholder |

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| SalesComparisonApproach | Land sales comparison | Yes | Market comps |
| FeasibilityPlaceholder | Coming soon | No | N/A |
| ValuationPlaceholder | Coming soon | No | N/A |

---

### CAPITALIZATION: `/projects/[projectId]/capitalization/`

**Sub-navigation:**
| Tab Name | Route | Status |
|----------|-------|--------|
| Debt | `/capitalization/debt` | Active |
| Equity | `/capitalization/equity` | Partial |
| Developer Operations | `/capitalization/operations` | Active |

---

**Debt Page (`/capitalization/debt`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| MetricCards | Capacity, Balance, Available, Rate | Yes | tbl_debt_facility |
| DebtFacilitiesTable | Facilities list with CRUD | Yes | tbl_debt_facility |
| DebtFacilityModal | Add/edit facility | Yes | tbl_debt_facility |
| DrawScheduleTable | Draw events display | Yes | tbl_debt_draw_schedule |

**API Endpoints:**
- `GET /api/projects/{id}/debt/facilities`
- `POST/PUT/DELETE /api/projects/{id}/debt/facilities`
- `GET /api/projects/{id}/debt/draw-events`

---

**Equity Page (`/capitalization/equity`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| MetricCards | Committed, Deployed, Remaining | Partial | Returns empty |
| EquityPartnersTable | Partner list | No | Not implemented |
| WaterfallStructureTable | Waterfall tiers | No | Not implemented |

**Note:** Equity partner and waterfall tables return empty arrays. Use Napkin Waterfall instead.

---

**Developer Operations Page (`/capitalization/operations`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| MetricCards | Developer fee summaries | Yes | developer_fees |
| DeveloperFeesTable | Fees display | Yes | developer_fees |

**API Endpoints:**
- `GET /api/projects/{id}/developer/fees`

---

### ANALYSIS / FEASIBILITY: `/projects/[projectId]/analysis/`

**Sub-navigation:**
| Tab Name | Route | Status |
|----------|-------|--------|
| Market Data | `/analysis/market-data` | Active |
| Sensitivity Analysis | `/analysis/sensitivity` | Active |

---

**Market Data Page (`/analysis/market-data`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| MarketDataContent | Comparable analysis | Yes | tbl_market_* |
| LandSalesComps | Land sale comparables | Yes | tbl_market_comparable_land_sales |
| HousingPriceComps | Housing price comps | Yes | tbl_market_housing_prices |
| AbsorptionRateComps | Absorption data | Yes | tbl_market_absorption_rates |

---

**Sensitivity Analysis Page (`/analysis/sensitivity`):**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| SensitivityAnalysisContent | IRR/NPV sensitivity | Partial | Project assumptions |
| AssumptionSliders | Variable adjustment | No | Client-side calculation |

---

### SETTINGS: `/projects/[projectId]/settings`

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| ProjectDates | Timeline configuration | Yes | tbl_projects |
| ProjectLandUseLabels | Land use taxonomy labels | Yes | tbl_project_config |

**API Endpoints:**
- `PATCH /api/projects/{id}` - Update dates
- `PATCH /api/projects/{id}/config` - Update labels

---

### ASSUMPTIONS: `/projects/[projectId]/assumptions`

**Baskets (accordion sections):**
| Basket | Description | Database Wired | Table(s) Used |
|--------|-------------|----------------|---------------|
| The Deal (Acquisition) | Purchase assumptions | Partial | API endpoints called but not implemented |
| The Cash In (Revenue) | Revenue assumptions | Partial | API endpoints called but not implemented |
| The Cash Out (Expenses) | Expense assumptions | Partial | API endpoints called but not implemented |
| The Financing | Debt assumptions | Partial | API endpoints called but not implemented |
| The Split (Equity) | Equity assumptions | Partial | API endpoints called but not implemented |

**Note:** Auto-save with 1s debounce. API endpoints are called but backend implementation incomplete.

---

## Napkin Mode Pages

---

### NAPKIN ANALYSIS: `/projects/[projectId]/napkin`

**Layout:** Two-column (Analysis tiles + Landscaper panel)

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| NapkinSfdPricing | SFD pricing by lot bands | Yes | tbl_sf_comp |
| NapkinAttachedPricing | Attached product pricing | Yes | tbl_sf_comp |
| NapkinCompsMap | Map of comparable sales | Yes | tbl_sf_comp, project coords |
| RlvSummaryCard | Residual land value summary | No | Mock data |
| InfrastructurePanel | Infrastructure costs | No | Mock data |
| CommercialPanel | Commercial analysis | No | Mock data |
| LandscaperPanel | Chat-based data ingestion | No | Mock chat interface |
| PromoteModal | Upgrade to Developer mode | Yes | tbl_projects.analysis_mode |

---

### NAPKIN WATERFALL: `/projects/[projectId]/napkin/waterfall`

**Layout:** Two-column top (Form + Summary) + Full-width bottom (Period table)

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| NapkinWaterfallForm | Waterfall configuration | Yes | tbl_waterfall_tier, tbl_equity, tbl_equity_structure |
| WaterfallResults | Calculation results display | Yes | Python waterfall engine via Django proxy |

**API Endpoints:**
- `GET /api/projects/{id}/cash-flow/summary` - Peak equity
- `GET /api/projects/{id}/waterfall` - Load configuration
- `POST /api/projects/{id}/waterfall/napkin` - Save configuration
- `GET /api/projects/{id}/waterfall/calculate` - Run calculation

**Database Tables:**
- `tbl_waterfall_tier` - Tier configuration (hurdle rates, splits)
- `tbl_equity` - Equity partners (LP/GP)
- `tbl_equity_structure` - Structure summary

---

## Admin Pages

---

### ADMIN BENCHMARKS: `/admin/benchmarks`

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| BenchmarkAccordion | 9 category accordion | Yes | tbl_benchmark |
| GrowthRatesPanel | Growth rate management | Yes | tbl_growth_rates |
| AbsorptionVelocityPanel | Absorption data | Yes | tbl_absorption_velocity |
| SaleBenchmarksPanel | Transaction costs | Yes | tbl_sale_benchmarks |
| AISuggestionsPanel | AI-generated benchmarks | Yes | tbl_benchmark |

**API Endpoints:**
- `GET /api/benchmarks`
- `GET /api/sale-benchmarks/global`
- `GET /api/benchmarks/growth-rates`
- `GET /api/benchmarks/absorption-velocity`
- `GET /api/unit-costs/templates`

---

### ADMIN COST LIBRARY: `/admin/benchmarks/cost-library`

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| UnitCostsPanel | Cost templates by stage | Yes | tbl_unit_cost_templates |
| StageFilter | Entitlements/Engineering/Dev | Yes | tbl_unit_cost_templates |
| CostTypeFilter | Hard/Soft/Deposits/Other | Yes | tbl_unit_cost_templates |

---

### ADMIN PREFERENCES: `/admin/preferences`

**Accordion Sections:**
| Section | Description | Database Wired | Table(s) Used |
|---------|-------------|----------------|---------------|
| Pro Features | Toggle pro tier access | Yes | User tier |
| Unit Cost Categories | Cost category hierarchy | Yes | tbl_unit_cost_categories |
| Land Use Taxonomy | Land use configuration | Yes | tbl_land_use_taxonomy |
| Units of Measure | Measurement units | Yes | tbl_measures |
| System Picklists | Dropdown values | Yes | tbl_system_picklist |

**API Endpoints:**
- `GET/POST /api/admin/measures`
- `GET/POST /api/admin/picklists`

---

### ADMIN USERS: `/admin/users`

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| UserTable | User list with actions | Yes | auth_user |
| UserModal | Add/edit user | Yes | auth_user |
| PasswordResetButton | Reset password | Yes | auth_user |
| StatusToggle | Activate/deactivate | Yes | auth_user |

**API Endpoints:**
- `GET /api/admin/users`
- `POST/PATCH/DELETE /api/admin/users`
- `POST /api/admin/users/{id}/set-password`
- `POST /api/admin/users/{id}/activate`
- `POST /api/admin/users/{id}/deactivate`

---

### ADMIN DMS TEMPLATES: `/admin/dms/templates`

**Components:**
| Component | Description | Database Wired | Table(s) Used |
|-----------|-------------|----------------|---------------|
| TemplateList | Template management | Yes | dms_templates |
| TemplateModal | Add/edit template | Yes | dms_templates |

**API Endpoints:**
- `GET /api/dms/templates`
- `POST/PATCH/DELETE /api/dms/templates`

---

## Database Wiring Summary

### Fully Wired (Read + Write)
- Dashboard (project list, create)
- DMS (documents, templates, uploads)
- Planning - Land Use (parcels, phases, areas)
- Planning - Market (competitors)
- Budget (full CRUD)
- Debt Facilities (full CRUD)
- Developer Fees (read)
- Napkin Waterfall (configuration + calculation)
- Project Settings (dates, labels)
- Admin pages (all sections)

### Partially Wired (Read Only or Incomplete)
- Project Tab (inflation schedules TODO)
- Sales & Marketing (read-only display)
- Assumptions (API called but not implemented)
- Equity Page (returns empty)
- Valuation (only Sales Comparison active)
- Feasibility (RLV coming soon)

### Not Wired (UI Placeholders)
- Capitalization Tab (Project Home)
- Cash Flow - Feasibility Analysis
- Cash Flow - Valuation Summary
- Napkin - RlvSummaryCard
- Napkin - InfrastructurePanel
- Napkin - CommercialPanel
- Napkin - LandscaperPanel (mock chat)
- Contacts Section (Project Tab)

---

## Key Database Tables Reference

### Core Project Tables
- `tbl_projects` - Project master data
- `tbl_project_config` - Project configuration/labels
- `tbl_areas` - Plan areas
- `tbl_phases` - Development phases
- `tbl_parcels` - Individual parcels

### Financial Tables
- `tbl_budget_items` - Budget line items
- `tbl_debt_facility` - Debt facilities
- `tbl_debt_draw_schedule` - Draw schedule
- `tbl_equity` - Equity partners
- `tbl_equity_structure` - Equity structure
- `tbl_waterfall_tier` - Waterfall tiers
- `developer_fees` - Developer fees

### Market Data Tables
- `tbl_sf_comp` - Single-family comparables
- `tbl_market_competitors` - Competitive projects
- `tbl_market_comparable_land_sales` - Land sales
- `tbl_market_housing_prices` - Housing prices
- `tbl_market_absorption_rates` - Absorption rates

### DMS Tables
- `core_doc` - Documents
- `dms_templates` - Document templates
- `dms_extract_queue` - AI extraction queue
- `ai_correction_log` - Extraction corrections

### Admin Tables
- `tbl_benchmark` - Benchmarks
- `tbl_growth_rates` - Growth rate sets
- `tbl_unit_cost_templates` - Cost templates
- `tbl_measures` - Units of measure
- `tbl_system_picklist` - Picklist values
- `tbl_land_use_taxonomy` - Land use types
- `auth_user` - Users (Django)

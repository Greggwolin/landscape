# Database Table Inventory

**Version:** 1.0
**Last Updated:** October 21, 2025
**Database:** land_v2 (Neon PostgreSQL)
**Schema:** landscape

---

## Executive Summary

The Landscape platform database contains **158 active tables** (excluding 5 legacy/backup tables), organized across 25 functional areas supporting:
- Commercial Real Estate Analytics (ARGUS-equivalent)
- Community/Land Development Planning
- GIS & Spatial Analysis
- Document Intelligence & Management
- Universal Financial Modeling Engine

---

## Table Count by Functional Area

| Category | Tables | Purpose |
|----------|--------|---------|
| **CRE Analysis Engine** | 36 | Property/lease/tenant/revenue/expense/returns analysis |
| **Financial Engine (Core)** | 15 | Universal budgeting & financial modeling framework |
| **Multifamily** | 4 | Residential property-specific analytics |
| **General Leasing** | 8 | Lease management & rent rolls |
| **Revenue Streams** | 4 | Income stream analysis & tracking |
| **Operating Expenses** | 3 | OpEx management & recovery |
| **Budgets & Timing** | 2 | Budget planning & phasing (2 deprecated) |
| **Capital Structure** | 11 | Equity, debt, waterfall distributions |
| **Cash Flow & Metrics** | 4 | Returns calculation (IRR, NPV, DSCR) |
| **Reserves & Escalations** | 5 | Capital planning & inflation |
| **Acquisition & Costs** | 5 | Acquisition & leasing transaction costs |
| **Market Data** | 2 | Market assumptions & benchmarks |
| **Project & Containers** | 8 | Project management & organizational structure |
| **Land Use & Zoning** | 11 | Land use classifications & regulatory controls |
| **Phasing & Lots** | 3 | Lot type classifications (3 deprecated) |
| **GIS & Boundaries** | 9 | Spatial data & parcel boundaries |
| **Approvals & Jurisdictions** | 2 | Entitlements & government relations |
| **Planning Documents** | 2 | Document tracking for planning |
| **Contacts** | 1 | Stakeholder management |
| **Dependencies & Measures** | 3 | Item relationships & measurement units |
| **DMS - Core** | 5 | Document storage & organization |
| **DMS - Attributes** | 2 | Metadata management |
| **DMS - Extraction** | 6 | AI extraction & processing |
| **AI Processing** | 2 | AI ingestion & review tracking |
| **Core System** | 5 | Lookups, workspace, migrations |
| **Total Active** | **158** | |

---

## Commercial Real Estate Analytics Tables

### 1. CRE-Specific Tables (36 tables)

**Property & Space Management (4 tables):**
- `tbl_cre_property` (25 columns) - Property master data
- `tbl_cre_space` (17 columns) - Leasable space inventory
- `tbl_cre_tenant` (20 columns) - Tenant information
- `tbl_cre_lease` (29 columns) - Lease agreements

**Revenue Analysis (7 tables):**
- `tbl_cre_base_rent` (11 columns) - Base rent schedules
- `tbl_cre_rent_escalation` (14 columns) - Rent escalation patterns
- `tbl_cre_rent_concession` (15 columns) - Concessions/free rent
- `tbl_cre_percentage_rent` (10 columns) - Percentage rent structures
- `tbl_cre_cam_charge` (18 columns) - Common area maintenance
- `tbl_cre_expense_recovery` (11 columns) - Expense recovery
- `tbl_cre_expense_reimbursement` (11 columns) - Tenant reimbursements
- `tbl_cre_expense_stop` (15 columns) - Expense stop clauses

**Operating Expenses (1 table):**
- `tbl_cre_operating_expense` (14 columns) - Operating expense details

**Capital & Returns (8 tables):**
- `tbl_cre_tenant_improvement` (11 columns) - TI allowances
- `tbl_cre_leasing_commission` (19 columns) - Leasing commissions
- `tbl_cre_leasing_legal` (7 columns) - Legal costs
- `tbl_cre_capital_reserve` (7 columns) - Capital reserves
- `tbl_cre_major_maintenance` (7 columns) - Major maintenance capex
- `tbl_cre_cash_flow` (13 columns) - Cash flow projections
- `tbl_cre_dcf_analysis` (18 columns) - Discounted cash flow analysis
- `tbl_cre_cap_rate` (14 columns) - Capitalization rates

**Performance Metrics (4 tables):**
- `tbl_cre_noi` (17 columns) - Net Operating Income
- `tbl_cre_vacancy` (12 columns) - Vacancy analysis
- `tbl_cre_absorption` (10 columns) - Lease-up/absorption schedules
- `tbl_cre_stabilization` (11 columns) - Stabilization analysis

### 2. Multifamily-Specific Tables (4 tables)
- `tbl_multifamily_unit_type` (13 columns) - Unit type definitions
- `tbl_multifamily_unit` (15 columns) - Individual units
- `tbl_multifamily_lease` (19 columns) - Residential leases
- `tbl_multifamily_turn` (16 columns) - Unit turnover costs

### 3. General Lease & Rent Roll Tables (8 tables)
- `tbl_lease` (41 columns) - Universal lease table
- `tbl_lease_assumptions` (17 columns) - Leasing assumptions
- `tbl_lease_revenue_timing` (14 columns) - Revenue timing
- `tbl_rent_roll` (29 columns) - Current rent roll
- `tbl_rent_roll_unit` (13 columns) - Rent roll by unit
- `tbl_base_rent` (15 columns) - Base rent schedules
- `lu_lease_status` (5 columns) - Lease status lookup
- `lu_lease_type` (4 columns) - Lease type lookup

### 4. Revenue & Income Tables (4 tables)
- `tbl_revenue_rent` (17 columns) - Rental revenue
- `tbl_revenue_other` (22 columns) - Other income streams
- `tbl_revenue_timing` (13 columns) - Revenue recognition timing
- `tbl_additional_income` (8 columns) - Additional income sources

### 5. Operating Expenses (3 tables)
- `tbl_operating_expense` (15 columns) - Operating expenses
- `tbl_operating_expenses` (15 columns) - Additional operating expenses
- `tbl_expense_detail` (13 columns) - Expense detail tracking

### 6. Financial Engine - Core Tables (15 tables)
- `core_fin_budget_version` (6 columns) - Budget versioning
- `core_fin_category` (10 columns) - Financial categories
- `core_fin_category_uom` (2 columns) - Category units of measure
- `core_fin_fact_budget` (26 columns) - Budget facts (star schema)
- `core_fin_fact_actual` (11 columns) - Actual facts
- `core_fin_fact_tags` (9 columns) - Fact tagging
- `core_fin_curve` (4 columns) - S-curve distributions
- `core_fin_growth_rate_sets` (7 columns) - Growth rate sets
- `core_fin_growth_rate_steps` (8 columns) - Growth rate steps
- `core_fin_funding_source` (7 columns) - Funding sources
- `core_fin_confidence_policy` (6 columns) - Confidence levels
- `core_fin_crosswalk_ad` (3 columns) - ARGUS Developer crosswalk
- `core_fin_crosswalk_ae` (3 columns) - ARGUS Enterprise crosswalk
- `core_fin_uom` (5 columns) - Units of measure
- `core_fin_container_applicability` (2 columns) - Container links

### 7. Budget & Timing Tables (2 tables)
- `tbl_budget` (12 columns) - Budget master
- `tbl_budget_items` (20 columns) - **DEPRECATED** - Migrated to `core_fin_fact_budget` (2025-10-02)
- `tbl_budget_structure` (14 columns) - **DEPRECATED** - Migrated to `core_fin_category` (2025-10-02)
- `tbl_budget_timing` (6 columns) - Budget timing

### 8. Capital Structure & Financing (11 tables)
- `tbl_equity` (15 columns) - Equity investments
- `tbl_equity_partner` (12 columns) - Equity partners
- `tbl_equity_structure` (12 columns) - Equity structure
- `tbl_equity_distribution` (11 columns) - Distribution waterfall
- `tbl_debt_facility` (20 columns) - Debt facilities
- `tbl_debt_draw_schedule` (16 columns) - Draw schedules
- `tbl_loan` (26 columns) - Loan details
- `tbl_waterfall` (7 columns) - Waterfall structures
- `tbl_waterfall_tier` (12 columns) - Waterfall tiers
- `tbl_capital_call` (10 columns) - Capital calls
- `tbl_capitalization` (5 columns) - Cap tables

### 9. Cash Flow & Returns (4 tables)
- `tbl_cashflow` (15 columns) - Project cash flows
- `tbl_cashflow_summary` (21 columns) - Cash flow summaries
- `tbl_calculation_period` (12 columns) - Calculation periods
- `tbl_project_metrics` (22 columns) - IRR, NPV, equity multiples

### 10. Capital Reserves & Escalations (5 tables)
- `tbl_capital_reserves` (14 columns) - Reserve accounts
- `tbl_capex_reserve` (20 columns) - CapEx reserves
- `tbl_escalation` (15 columns) - Cost escalation
- `tbl_recovery` (7 columns) - Expense recovery
- `lu_recovery_structure` (4 columns) - Recovery structure types

### 11. Acquisition & Leasing Costs (5 tables)
- `tbl_property_acquisition` (23 columns) - Property acquisition
- `tbl_acquisition` (13 columns) - General acquisition
- `tbl_leasing_commission` (8 columns) - Commission structures
- `tbl_tenant_improvement` (10 columns) - TI costs
- `tbl_vacancy_assumption` (16 columns) - Vacancy assumptions

### 12. Market Data & Assumptions (2 tables)
- `market_assumptions` (12 columns) - Market-level assumptions
- `tbl_absorption_schedule` (22 columns) - Market absorption data

---

## Community Development & Land Planning Tables

### 13. Project & Container Management (8 tables)
- `tbl_project` (40 columns) - Master project container
- `tbl_container` (11 columns) - Universal container system
- `tbl_project_config` (7 columns) - Project-level configuration
- `tbl_project_settings` (9 columns) - User preferences per project
- `tbl_inventory_item` (22 columns) - Universal inventory
- `tbl_property_type_config` (8 columns) - Inventory table structure definitions
- `tbl_property_use_template` (8 columns) - Reusable templates
- `tbl_template_column_config` (15 columns) - Column definitions for templates
- `tbl_project_inventory_columns` (19 columns) - Custom columns per project

### 14. Land Use & Zoning (11 tables)
- `tbl_landuse` (10 columns) - Land use designations
- `tbl_landuse_program` (10 columns) - Land use programs/mixes
- `lu_type` (7 columns) - Land use type lookup
- `lu_subtype` (9 columns) - Land use subtypes
- `lu_family` (5 columns) - Land use family groupings
- `lu_res_spec` (18 columns) - Residential specifications
- `lu_com_spec` (15 columns) - Commercial specifications
- `land_use_pricing` (8 columns) - Pricing by land use
- `tbl_zoning_control` (19 columns) - Zoning requirements
- `glossary_zoning` (33 columns) - Comprehensive zoning terminology
- `density_classification` (12 columns) - Density classifications

### 15. Development Phasing & Lots (3 tables)
- `tbl_phase` (11 columns) - **DEPRECATED** - Replaced by container system at level 2
- `tbl_area` (4 columns) - **DEPRECATED** - Replaced by container system at level 1
- `tbl_lot` (23 columns) - **DEPRECATED** - Replaced by `tbl_inventory_item`
- `tbl_lot_type` (4 columns) - Lot type classifications
- `res_lot_product` (5 columns) - Residential lot products
- `type_lot_product` (2 columns) - Lot product type lookup

### 16. GIS & Boundary Management (9 tables)

**Note:** GIS infrastructure is active with working API routes and database tables. The GIS Setup Wizard UI exists in test pages (`/gis-test`, `/gis-simple-test`, `/map-debug`, `/parcel-test`) but is not yet integrated into production navigation.

**Core Tables:**
- `tbl_parcel` (40 columns) - Tax parcels/land parcels (active, used for GIS/legal tracking)
- `gis_project_boundary` (5 columns) - Project boundary geometries
- `gis_boundary_history` (7 columns) - Tracks boundary selections
- `gis_tax_parcel_ref` (7 columns) - Tax parcel references
- `gis_plan_parcel` (11 columns) - Plan parcels
- `gis_mapping_history` (7 columns) - Field mapping history
- `project_boundaries` (7 columns) - Project boundary definitions
- `project_parcel_boundaries` (9 columns) - Individual boundary parcels
- `spatial_ref_sys` (5 columns) - Spatial reference systems

**API Routes:** `/api/gis/project-boundary`, `/api/gis/ingest-parcels`, `/api/gis/plan-parcels`, `/api/gis/project-mapping`

**Components:** GISSetupWorkflow, ProjectBoundarySetup, GISMap (MapLibre), PlanNavigation

### 17. Approvals & Entitlements (2 tables)
- `tbl_approval` (5 columns) - Development approvals
- `project_jurisdiction_mapping` (10 columns) - Jurisdiction mappings

### 18. Planning Documents (2 tables)
- `planning_doc` (9 columns) - Planning documents
- `gis_document_ingestion` (12 columns) - GIS document ingestion tracking

### 19. Contacts & Relationships (1 table)
- `tbl_contacts` (22 columns) - Contacts and stakeholders

### 20. Dependencies & Measures (3 tables)
- `tbl_item_dependency` (14 columns) - Universal dependency tracking
- `tbl_measures` (9 columns) - Measurement tracking
- `tbl_assumptionrule` (4 columns) - Assumption rules

---

## Document Management System Tables

### 21. Core Document Tables (5 tables)
- `core_doc` (23 columns) - Document master records
- `core_doc_text` (6 columns) - Full-text extraction
- `core_doc_folder` (9 columns) - Folder hierarchy
- `core_doc_folder_link` (4 columns) - Document-folder links
- `core_doc_smartfilter` (6 columns) - Saved searches

### 22. Document Attributes (2 tables)
- `core_doc_attr_enum` (5 columns) - Enumerated attribute options
- `core_doc_attr_lookup` (4 columns) - Lookup attribute sources

### 23. DMS Extraction & AI (6 tables)
- `dms_templates` (8 columns) - Document templates
- `dms_template_attributes` (5 columns) - Template attributes
- `dms_attributes` (13 columns) - Extracted attributes
- `dms_assertion` (16 columns) - Quantitative/qualitative assertions with provenance
- `dms_unmapped` (15 columns) - Unmapped extracted fields
- `dms_extract_queue` (11 columns) - Extraction job queue
- `dms_profile_audit` (9 columns) - Profile audit tracking
- `dms_workspaces` (7 columns) - DMS workspaces

---

## AI & System Tables

### 24. AI Processing (2 tables)
- `ai_ingestion_history` (7 columns) - AI ingestion tracking
- `ai_review_history` (8 columns) - AI review history

### 25. Core System Tables (5 tables)
- `core_lookup_list` (5 columns) - Lookup list definitions
- `core_lookup_item` (7 columns) - Lookup list items
- `core_workspace_member` (4 columns) - Workspace memberships
- `_migrations` (4 columns) - Database migration history
- `tmp_search_results` (4 columns) - Temporary search results

---

## Legacy/Deprecated Tables

**Note:** The following tables are marked as DEPRECATED and will be dropped after testing/migration completion:

### Budget System Migration (Completed 2025-10-02)
- `tbl_budget_items` (20 columns) - Migrated to `core_fin_fact_budget`
- `tbl_budget_structure` (14 columns) - Migrated to `core_fin_category`
- `tbl_budget_items_backup` - Backup of migrated data
- `tbl_budget_structure_backup` - Backup of migrated data

### Container System Migration (In Progress)
- `tbl_area` (4 columns) - Replaced by `tbl_container` at level 1
  - **Status:** PlanningWizard migrated; HomeOverview/ProjectCanvas in progress
  - **Data:** 4 rows remaining (legacy Project 7 data)
  - **Migration Plan:** [CONTAINER_MIGRATION_CHECKLIST.md](../12-migration-plans/CONTAINER_MIGRATION_CHECKLIST.md)

- `tbl_phase` (11 columns) - Replaced by `tbl_container` at level 2
  - **Status:** PlanningWizard migrated; HomeOverview/ProjectCanvas in progress
  - **Data:** 10 rows remaining (legacy Project 7 data)
  - **Migration Plan:** [CONTAINER_MIGRATION_CHECKLIST.md](../12-migration-plans/CONTAINER_MIGRATION_CHECKLIST.md)

- `tbl_lot` (23 columns) - Replaced by `tbl_inventory_item`
  - **Status:** No active data
  - **Data:** 0 rows
  - **Replacement:** Universal inventory system (`tbl_inventory_item` with 53 rows)

### Why These Tables Still Exist
These deprecated tables remain in the schema during a parallel population period to:
1. Support backward compatibility during gradual migration
2. Allow rollback if issues are discovered
3. Provide reference data for validation
4. Support components not yet migrated to the new system

**Total Deprecated Tables:** 7 (excluded from active count)

---

## Schema Statistics

| Metric | Value |
|--------|-------|
| **Total Active Tables** | 151 |
| **Deprecated Tables** | 7 |
| **Total Tables in Schema** | 158 |
| **Total Columns** | ~2,400+ |
| **CRE Analytics Tables** | 88 (2 deprecated) |
| **Community Development Tables** | 39 (3 deprecated) |
| **Document Management Tables** | 13 |
| **AI & System Tables** | 7 |
| **Financial Engine Core** | 15 |

---

## Table Naming Conventions

The database follows a consistent naming pattern:

- **`tbl_*`** - Primary business entities (project, parcel, phase, lease, etc.)
- **`core_*`** - Framework/platform tables (finance, documents, lookups)
- **`dms_*`** - Document management subsystem
- **`gis_*`** - Geographic/spatial subsystem
- **`lu_*`** - Lookup/reference data tables

---

## Related Documentation

- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Complete technical schema specification
- [MIGRATION-SUMMARY.md](MIGRATION-SUMMARY.md) - Migration history and changes
- [db-schema.md](db-schema.md) - Auto-generated schema dump (may be outdated)

---

## Maintenance Notes

**Last Schema Update:** October 2, 2025 (Budget consolidation migration)
**Last Migration:** Migration 008 - Multifamily Property Tracking (October 14, 2025)
**Active Migrations:** Container system migration (PlanningWizard complete, HomeOverview in progress)
**Next Cleanup:** Drop 7 deprecated tables after migration completion

---

**Document Maintained By:** Engineering Team
**Last Updated:** October 21, 2025
**Document Version:** 1.0

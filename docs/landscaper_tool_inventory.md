# Landscaper Tool Inventory

> Generated: 2026-04-17  
> Branch: feature/unified-ui  
> Source: `backend/apps/landscaper/tool_schemas.py`, `tool_registry.py`  
> Tool count: **233**

---

## Tool Inventory

| # | Tool Name | Description | R/W | Group | Triggered By |
|---|-----------|-------------|-----|-------|--------------|
| 1 | update_project_field | Update a single project field value. | W | Universal | Any project, any page |
| 2 | bulk_update_fields | Update multiple project fields at once. | W | Universal | Any project, any page |
| 3 | get_cashflow_results | Get cash flow / DCF assumptions and results. | R | Universal | Any page — surfaced on: MF Valuation, Land Valuation, Reports, Investment Committee |
| 4 | compute_cashflow_expression | Evaluate a math expression against cash flow results. | R | Universal | Any page — surfaced on: MF Valuation, Land Valuation, Investment Committee |
| 5 | update_cashflow_assumption | Update a cashflow/DCF assumption field. Always set confirm=true. | W | Universal | Any page — surfaced on: MF Valuation, Land Valuation |
| 6 | get_project_fields | Get current project field values from specified tables. | R | Universal | Any page — surfaced on: Alpha Assistant |
| 7 | get_field_schema | Get the database schema for a project table. | R | Universal | Any project, any page |
| 8 | get_project_documents | List all uploaded documents for this project. | R | Universal | Any project, any page |
| 9 | get_document_content | Get extracted text content from a document. | R | Universal | Any page — surfaced on: Ingestion Workbench |
| 10 | get_document_page | Get a specific page from a document. | R | Universal | Any page — surfaced on: Ingestion Workbench |
| 11 | get_document_assertions | Get AI-extracted assertions from a document. | R | Universal | Any project, any page |
| 12 | ingest_document | Extract data from an uploaded document and auto-populate project fields. | W | Universal | Any project, any page |
| 13 | get_document_media_summary | Get summary of images/tables in a document. | R | Universal | Any project, any page |
| 14 | analyze_rent_roll_columns | Analyze uploaded rent roll columns for mapping. | R | Multifamily | Multifamily projects only |
| 15 | confirm_column_mapping | Confirm column mapping and extract rent roll data. | W | Multifamily | Multifamily projects only |
| 16 | compute_rent_roll_delta | Compute differences between extracted and existing rent roll data. | R | Multifamily | Multifamily projects only |
| 17 | update_operating_expenses | Create or update operating expense line items. | W | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 18 | update_rental_comps | Bulk update rental comparable properties. | W | Multifamily | Multifamily projects only |
| 19 | update_project_contacts | Update project contact assignments. | W | Universal | Any project, any page |
| 20 | get_acquisition | Get acquisition/purchase details for this project. | R | Income Property | MF, Office, Retail, Industrial — MF Property |
| 21 | update_acquisition | Update acquisition/purchase fields. | W | Income Property | MF, Office, Retail, Industrial — MF Property |
| 22 | get_revenue_rent | Get rent revenue assumptions. | R | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 23 | update_revenue_rent | Update rent revenue assumptions. | W | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 24 | get_revenue_other | Get other income line items. | R | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 25 | update_revenue_other | Update other income line items. | W | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 26 | get_vacancy_assumptions | Get vacancy and collection loss assumptions. | R | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 27 | update_vacancy_assumptions | Update vacancy and collection loss assumptions. | W | Income Property | MF, Office, Retail, Industrial — MF Operations |
| 28 | get_unit_types | Get unit type mix (floorplans) for this project. | R | Multifamily | Multifamily projects only — MF Property, Reports, Investment Committee |
| 29 | update_unit_types | Create or update unit type definitions. | W | Multifamily | Multifamily projects only — MF Property |
| 30 | get_units | Get individual units with lease data. | R | Multifamily | Multifamily projects only — MF Property |
| 31 | update_units | Create or update units. Two modes: (1) per-unit 'records' with unit_number, (2) 'bulk_updates' to set fields on ALL units matching a filter (preferred for type-wide changes like setting market_rent by plan). Provide r… | W | Multifamily | Multifamily projects only — MF Property |
| 32 | delete_units | Delete units. Requires confirmation phase. | W | Multifamily | Multifamily projects only — MF Property |
| 33 | get_leases | Get lease records for this project. | R | Multifamily | Multifamily projects only — MF Property |
| 34 | update_leases | Create or update lease records. | W | Multifamily | Multifamily projects only — MF Property |
| 35 | get_sales_comparables | Get sales comparable properties. Optionally filter by property_type to see only land comps, multifamily comps, etc. | R | Universal | Any page — surfaced on: MF Valuation |
| 36 | update_sales_comparable | Create or update a sales comparable. Set property_type to classify as 'LAND', 'MULTIFAMILY', etc. | W | Universal | Any page — surfaced on: MF Valuation |
| 37 | delete_sales_comparable | Delete a sales comparable by ID. | W | Universal | Any page — surfaced on: MF Valuation |
| 38 | get_sales_comp_adjustments | Get adjustment grid for sales comparables. | R | Universal | Any page — surfaced on: MF Valuation |
| 39 | update_sales_comp_adjustment | Update a sales comp adjustment value. | W | Universal | Any page — surfaced on: MF Valuation |
| 40 | get_land_comp_detail | Retrieve land-specific detail for a sales comparable — zoning, entitlement status, utilities availability, environmental conditions, topography, and other land attributes not stored in the main comparables record. | R | Land Dev | Land dev projects only |
| 41 | update_land_comp_detail | Create or update land-specific detail for a sales comparable. | W | Land Dev | Land dev projects only |
| 42 | get_parcel_sale_assumptions | Retrieve sale assumptions for one or all parcels in a project. Returns per-parcel lot pricing, price escalation, closing costs, commission rates, and transaction cost assumptions. | R | Land Dev | Land dev projects only |
| 43 | update_parcel_sale_assumptions | Create or update sale assumptions for a single parcel. Use to set base pricing, inflation rate, closing cost percentage, broker commission, and other transaction cost assumptions. One record per parcel. | W | Land Dev | Land dev projects only |
| 44 | bulk_update_parcel_sale_assumptions | Update sale assumptions for multiple parcels in one operation. | W | Land Dev | Land dev projects only |
| 45 | update_land_use_pricing | Update lot pricing in the land_use_pricing table (source of truth for all pricing). | W | Land Dev | Land dev projects only — Land Schedule |
| 46 | get_rental_comparables | Get rental comparable properties. | R | Multifamily | Multifamily projects only — MF Property |
| 47 | update_rental_comparable | Create or update a rental comparable. | W | Multifamily | Multifamily projects only — MF Property |
| 48 | delete_rental_comparable | Delete a rental comparable by ID. | W | Multifamily | Multifamily projects only — MF Property |
| 49 | get_loans | Get loan/debt structure for this project. | R | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 50 | update_loan | Create or update a loan record. | W | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 51 | delete_loan | Delete a loan by ID. | W | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 52 | get_equity_structure | Get equity structure (GP/LP splits, promote). | R | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 53 | update_equity_structure | Update equity structure fields. | W | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 54 | get_waterfall_tiers | Get equity waterfall tier definitions. | R | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 55 | update_waterfall_tiers | Update equity waterfall tiers. | W | Universal | Any page — surfaced on: MF Capital, Land Capital |
| 56 | get_budget_categories | Get budget category tree. | R | Land Dev | Land dev projects only — Land Budget, Settings |
| 57 | update_budget_category | Create or update a budget category. | W | Land Dev | Land dev projects only — Land Budget |
| 58 | get_budget_items | Get budget line items with optional filters. | R | Land Dev | Land dev projects only — Land Budget, Reports, Investment Committee |
| 59 | update_budget_item | Create or update a budget line item. | W | Land Dev | Land dev projects only — Land Budget |
| 60 | delete_budget_item | Delete a budget item by ID. | W | Land Dev | Land dev projects only — Land Budget |
| 61 | get_areas | Get area (level 1) containers for this project. | R | Land Dev | Land dev projects only — Land Planning, Land Valuation |
| 62 | update_area | Create or update an area container. | W | Land Dev | Land dev projects only — Land Planning |
| 63 | delete_area | Delete an area container by ID. | W | Land Dev | Land dev projects only — Land Planning |
| 64 | get_phases | Get phase (level 2) containers for this project. | R | Land Dev | Land dev projects only — Land Planning, Land Valuation |
| 65 | update_phase | Create or update a phase container. | W | Land Dev | Land dev projects only — Land Planning |
| 66 | delete_phase | Delete a phase container by ID. | W | Land Dev | Land dev projects only — Land Planning |
| 67 | get_parcels | Get parcel (level 3) containers for this project. | R | Land Dev | Land dev projects only — Land Planning |
| 68 | update_parcel | Create or update a parcel record. | W | Land Dev | Land dev projects only — Land Planning |
| 69 | delete_parcel | Delete a parcel by ID. | W | Land Dev | Land dev projects only — Land Planning |
| 70 | get_milestones | Get project milestones/timeline events. | R | Land Dev | Land dev projects only — Land Planning |
| 71 | update_milestone | Create or update a milestone. | W | Land Dev | Land dev projects only — Land Planning |
| 72 | delete_milestone | Delete a milestone by ID. | W | Land Dev | Land dev projects only — Land Planning |
| 73 | get_land_use_families | Get land use families (level 1 taxonomy). | R | Land Dev | Land dev projects only — Land Planning |
| 74 | update_land_use_family | Create or update a land use family. | W | Land Dev | Land dev projects only — Land Planning |
| 75 | get_land_use_types | Get land use types (level 2 taxonomy). | R | Land Dev | Land dev projects only — Land Planning |
| 76 | update_land_use_type | Create or update a land use type. | W | Land Dev | Land dev projects only — Land Planning |
| 77 | get_residential_products | Get residential products (level 3 taxonomy). | R | Land Dev | Land dev projects only — Land Planning |
| 78 | update_residential_product | Create or update a residential product. | W | Land Dev | Land dev projects only — Land Planning |
| 79 | get_measures | Get measure definitions (units of measurement). | R | Admin | Admin, Settings |
| 80 | update_measure | Create or update a measure definition. | W | Admin | Admin |
| 81 | get_picklist_values | Get picklist/dropdown values for a field. | R | Admin | Admin, Settings |
| 82 | update_picklist_value | Create or update a picklist value. | W | Admin | Admin |
| 83 | delete_picklist_value | Delete a picklist value by ID. | W | Admin | Admin users only |
| 84 | get_benchmarks | Get benchmark data (IREM, market, custom). | R | Admin | Benchmarks, Admin, Settings |
| 85 | update_benchmark | Create or update a benchmark record. | W | Admin | Benchmarks, Admin |
| 86 | delete_benchmark | Delete a benchmark by ID. | W | Admin | Admin |
| 87 | get_cost_library_items | Get cost library items for budgeting. | R | Admin | Admin users only |
| 88 | update_cost_library_item | Create or update a cost library item. | W | Admin | Admin users only |
| 89 | delete_cost_library_item | Delete a cost library item by ID. | W | Admin | Admin users only |
| 90 | get_report_templates | Get available report templates. | R | Admin | Admin users only |
| 91 | get_dms_templates | Get document management system templates. | R | Admin | Admin users only |
| 92 | update_template | Update a report or DMS template. | W | Admin | Admin users only |
| 93 | get_cre_tenants | Get commercial tenants for this project. | R | CRE | Office, Retail, Industrial only |
| 94 | update_cre_tenant | Create or update a commercial tenant. | W | CRE | Office, Retail, Industrial only |
| 95 | delete_cre_tenant | Delete a commercial tenant by ID. | W | CRE | Office, Retail, Industrial only |
| 96 | get_cre_spaces | Get commercial spaces/suites for this project. | R | CRE | Office, Retail, Industrial only |
| 97 | update_cre_space | Create or update a commercial space. | W | CRE | Office, Retail, Industrial only |
| 98 | delete_cre_space | Delete a commercial space by ID. | W | CRE | Office, Retail, Industrial only |
| 99 | get_cre_leases | Get commercial lease records. | R | CRE | Office, Retail, Industrial only |
| 100 | update_cre_lease | Create or update a commercial lease. | W | CRE | Office, Retail, Industrial only |
| 101 | delete_cre_lease | Delete a commercial lease by ID. | W | CRE | Office, Retail, Industrial only |
| 102 | get_cre_properties | Get commercial property records. | R | CRE | Office, Retail, Industrial only |
| 103 | update_cre_property | Create or update a commercial property. | W | CRE | Office, Retail, Industrial only |
| 104 | get_cre_rent_roll | Get commercial rent roll summary. | R | CRE | Office, Retail, Industrial only |
| 105 | get_competitive_projects | Get competitive/comparable development projects. | R | Land Dev | Land dev projects only — Land Schedule |
| 106 | update_competitive_project | Create or update a competitive project. | W | Land Dev | Land dev projects only — Land Schedule |
| 107 | delete_competitive_project | Delete a competitive project by ID. | W | Land Dev | Land dev projects only — Land Schedule |
| 108 | get_absorption_benchmarks | Get absorption rate benchmarks. | R | Land Dev | Land dev projects only — Land Schedule |
| 109 | get_market_assumptions | Get market growth and trend assumptions. | R | Universal | Any page — surfaced on: MF Valuation, Land Valuation, Investment Committee |
| 110 | update_market_assumptions | Update market growth and trend assumptions. | W | Universal | Any page — surfaced on: MF Valuation, Land Valuation, Investment Committee |
| 111 | get_absorption_schedule | Get lot/unit absorption schedule. | R | Land Dev | Land dev projects only — Land Schedule |
| 112 | update_absorption_schedule | Create or update absorption schedule entries. | W | Land Dev | Land dev projects only — Land Schedule |
| 113 | delete_absorption_schedule | Delete an absorption schedule entry. | W | Land Dev | Land dev projects only — Land Schedule |
| 114 | get_parcel_sale_events | Get planned parcel sale events. | R | Land Dev | Land dev projects only — Land Schedule |
| 115 | update_parcel_sale_event | Create or update a parcel sale event. | W | Land Dev | Land dev projects only — Land Schedule |
| 116 | delete_parcel_sale_event | Delete a parcel sale event by ID. | W | Land Dev | Land dev projects only — Land Schedule |
| 117 | get_extraction_results | Get document extraction results for review. | R | Universal | Any project, any page |
| 118 | update_extraction_result | Accept or reject an extraction result. | W | Universal | Any project, any page |
| 119 | get_extraction_corrections | Get user corrections to extraction results. | R | Universal | Any project, any page |
| 120 | log_extraction_correction | Log a user correction to an extraction result. | W | Universal | Any project, any page |
| 121 | get_knowledge_entities | Get knowledge graph entities for this project. | R | Universal | Any page — surfaced on: MF Home, Land Home, Documents, DMS (+ pre-project) |
| 122 | get_knowledge_facts | Get knowledge graph facts (subject-predicate-object). | R | Universal | Any page — surfaced on: MF Home, Land Home, Documents, DMS (+ pre-project) |
| 123 | get_knowledge_insights | Get AI-generated insights for this project. | R | Universal | Any page — surfaced on: MF Home, Land Home, Dashboard, Benchmarks (+ pre-project) |
| 124 | acknowledge_insight | Mark an insight as acknowledged/dismissed. | W | Universal | Any page — surfaced on: MF Home, Land Home, Dashboard (+ pre-project) |
| 125 | analyze_loss_to_lease | Analyze loss-to-lease between contract and market rents. | R | Income Property | MF, Office, Retail, Industrial — MF Valuation |
| 126 | calculate_year1_buyer_noi | Calculate Year 1 buyer NOI projection. | R | Income Property | MF, Office, Retail, Industrial — MF Valuation |
| 127 | check_income_analysis_availability | Check what income analysis data is available. | R | Income Property | MF, Office, Retail, Industrial — MF Valuation |
| 128 | whatif_compute | Apply a what-if adjustment to a field. | R | What-If / Scenario | Valuation & scenario analysis |
| 129 | whatif_compound | Apply multiple what-if adjustments at once. | W | What-If / Scenario | Valuation & scenario analysis |
| 130 | whatif_reset | Reset what-if adjustments (all or specific fields). | W | What-If / Scenario | Valuation & scenario analysis |
| 131 | whatif_attribute | Attach a note/attribution to a what-if adjustment. | R | What-If / Scenario | Valuation & scenario analysis |
| 132 | whatif_status | Get current what-if overlay status. | R | What-If / Scenario | Valuation & scenario analysis |
| 133 | scenario_save | Save current what-if state as a named scenario. | W | What-If / Scenario | Valuation & scenario analysis |
| 134 | scenario_load | Load a saved scenario into the what-if overlay. | R | What-If / Scenario | Valuation & scenario analysis |
| 135 | scenario_log_query | Log a natural language scenario query for analytics. | R | What-If / Scenario | Valuation & scenario analysis |
| 136 | whatif_commit | Commit all what-if adjustments to the database. | W | What-If / Scenario | Valuation & scenario analysis |
| 137 | whatif_commit_selective | Commit specific what-if adjustments to the database. | W | What-If / Scenario | Valuation & scenario analysis |
| 138 | whatif_undo | Undo the last what-if adjustment. | W | What-If / Scenario | Valuation & scenario analysis |
| 139 | scenario_replay | Replay a saved scenario's adjustments step by step. | R | What-If / Scenario | Valuation & scenario analysis |
| 140 | scenario_compare | Compare two scenarios side by side. | R | What-If / Scenario | Valuation & scenario analysis |
| 141 | scenario_diff | Get detailed diff between two scenarios. | R | What-If / Scenario | Valuation & scenario analysis |
| 142 | scenario_branch | Create a new scenario branching from an existing one. | W | What-If / Scenario | Valuation & scenario analysis |
| 143 | scenario_apply_cross_project | Apply a scenario to a different project. | W | What-If / Scenario | Valuation & scenario analysis |
| 144 | get_kpi_definitions | Get KPI definitions and thresholds. | R | What-If / Scenario | Valuation & scenario analysis |
| 145 | update_kpi_definitions | Update KPI definitions and thresholds. | W | What-If / Scenario | Valuation & scenario analysis |
| 146 | ic_start_session | Start an Investment Committee review session. | R | What-If / Scenario | Valuation & scenario analysis |
| 147 | ic_challenge_next | Get the next IC challenge question. | R | What-If / Scenario | Valuation & scenario analysis |
| 148 | ic_respond_challenge | Submit a response to an IC challenge. | W | What-If / Scenario | Valuation & scenario analysis |
| 149 | sensitivity_grid | Run sensitivity analysis grid on two variables. | R | What-If / Scenario | Valuation & scenario analysis |
| 150 | search_cabinet_contacts | Search contacts in the cabinet by name/company/email. | R | Universal | Any page — surfaced on: MF Home, Land Home, Dashboard |
| 151 | get_project_contacts_v2 | Get all contacts assigned to this project with roles. | R | Universal | Any page — surfaced on: MF Home, Land Home, Dashboard |
| 152 | get_contact_roles | Get available contact role definitions. | R | Universal | Any project, any page |
| 153 | create_cabinet_contact | Create a new contact in the cabinet. | W | Universal | Any project, any page |
| 154 | assign_contact_to_project | Assign an existing contact to this project with a role. | W | Universal | Any project, any page |
| 155 | remove_contact_from_project | Remove a contact's role assignment from this project. | W | Universal | Any project, any page |
| 156 | extract_and_save_contacts | Extract contacts from document content and save to project. | R | Universal | Any project, any page |
| 157 | get_hbu_scenarios | Get H&BU analysis scenarios for this project. | R | Universal | Any project, any page |
| 158 | create_hbu_scenario | Create a new H&BU analysis scenario. | W | Universal | Any project, any page |
| 159 | update_hbu_scenario | Update an existing H&BU scenario. | W | Universal | Any project, any page |
| 160 | compare_hbu_scenarios | Compare and rank H&BU scenarios by productivity metric. | R | Universal | Any project, any page |
| 161 | generate_hbu_narrative | Gather context for generating H&BU narratives. | R | Universal | Any project, any page |
| 162 | get_hbu_conclusion | Get the maximally productive H&BU conclusion. | R | Universal | Any project, any page |
| 163 | add_hbu_comparable_use | Add a comparable use to an H&BU scenario. | R | Universal | Any project, any page |
| 164 | get_property_attributes | Get site and improvement attributes for this project. | R | Universal | Any page — surfaced on: MF Property, Map |
| 165 | update_property_attributes | Update property attributes (core fields and JSONB). | W | Universal | Any page — surfaced on: MF Property, Map |
| 166 | get_attribute_definitions | Get configurable property attribute definitions. | R | Universal | Any page — surfaced on: MF Property |
| 167 | update_site_attribute | Update a single site attribute by code. | W | Universal | Any page — surfaced on: MF Property, Map |
| 168 | update_improvement_attribute | Update a single improvement attribute by code. | W | Universal | Any page — surfaced on: MF Property |
| 169 | calculate_remaining_economic_life | Calculate remaining economic life and depreciation. | R | Universal | Any project, any page |
| 170 | create_analysis_draft | Create a new analysis draft for conversational underwriting. | W | Universal | Any page — surfaced on: Dashboard (+ pre-project) |
| 171 | update_analysis_draft | Update an existing analysis draft with new inputs. | W | Universal | Any page — surfaced on: Dashboard (+ pre-project) |
| 172 | run_draft_calculations | Run financial calculations on a draft's inputs. | R | Universal | Any page — surfaced on: Dashboard (+ pre-project) |
| 173 | convert_draft_to_project | Convert a draft into a full Landscape project. | W | Universal | Any page — surfaced on: Dashboard (+ pre-project) |
| 174 | get_zoning_info | Get zoning, FAR, and site coverage data. | R | Universal | Any project, any page |
| 175 | search_irem_benchmarks | Search IREM expense benchmarks by property type and category. | R | Universal | Any page — surfaced on: DMS, Benchmarks (+ pre-project) |
| 176 | query_platform_knowledge | Search platform knowledge base (RAG) for real estate concepts. | R | Universal | Any page — surfaced on: MF Home, MF Valuation, Land Home, Land Valuation, DMS, Benchmarks (+ pre-project) |
| 177 | get_portfolio_summary | List all projects owned by the current user with key metrics. | R | Universal | Any project, any page |
| 178 | get_portfolio_assumptions | Read key assumptions from another user project for comparison (read-only). | R | Universal | Any project, any page |
| 179 | get_project_assumptions_detail | Get detailed market assumptions and growth rates from another user project (read-only). | R | Universal | Any project, any page |
| 180 | land_planning_run | Compute three-case land planning yield analysis (read-only, no persistence). | R | Land Dev | Land dev projects only |
| 181 | land_planning_save | Compute land planning cases and propose mutations to persist assumptions. | W | Land Dev | Land dev projects only |
| 182 | configure_project_hierarchy | Set the hierarchy level labels for a land development project (e.g., Area/Phase/Parcel). Updates tbl_project_config tier labels. Only for LAND projects. | R | Land Dev | Land dev projects only — Land Home, Land Planning |
| 183 | create_land_dev_containers | Bulk create the Area → Phase → Parcel hierarchy for a land development project. Writes to legacy tables (tbl_area, tbl_phase, tbl_parcel). Only for LAND projects. | W | Land Dev | Land dev projects only — Land Home, Land Planning |
| 184 | update_lot_mix | Set or update lot type inventory for a phase. Each entry becomes one tbl_parcel row (one row per lot type). Only for LAND projects. | W | Land Dev | Land dev projects only — Land Planning |
| 185 | update_land_use_budget | Set land use allocations for a land dev project (gross-to-net acreage by use type). Writes to tbl_acreage_allocation. Only for LAND projects. | W | Land Dev | Land dev projects only — Land Planning |
| 186 | get_multifamily_property | Retrieve multifamily property attributes including physical characteristics, construction details, amenities, parking, and utility/regulatory information. | R | Multifamily | Multifamily projects only |
| 187 | update_multifamily_property | Create or update multifamily property attributes. One record per project. Use for year built, construction type, number of stories, parking, amenities, utility metering, rent control, and property status. | W | Multifamily | Multifamily projects only |
| 188 | get_income_approach | Retrieve income approach valuation parameters including cap rates, NOI capitalization basis, DCF discount rate, terminal cap rate, and indicated values. | R | Universal | Any project, any page |
| 189 | update_income_approach | Save or update income approach parameters. Use after running income calculations to persist cap rates, NOI selections, DCF assumptions, and the indicated value conclusion. | W | Universal | Any project, any page |
| 190 | get_income_property | Retrieve the income property master record including property type, building SF, rentable SF, year built, parking, property status, and acquisition details. | R | Universal | Any project, any page |
| 191 | update_income_property | Save or update the income property master record. Use to set property type, building area, rentable SF, year built, number of units/floors, parking, property status, and acquisition price. | W | Universal | Any project, any page |
| 192 | get_income_property_mf_ext | Retrieve multifamily-specific income property extensions including unit mix counts, amenity flags, parking breakdown, utility metering, class rating, and rent control/affordable housing details. | R | Multifamily | Multifamily projects only |
| 193 | update_income_property_mf_ext | Save or update multifamily income extensions. | W | Multifamily | Multifamily projects only |
| 194 | get_valuation_reconciliation | Retrieve the valuation reconciliation record showing approach weights, indicated values by approach, reconciled final value, narrative, and valuation date. | R | Universal | Any project, any page |
| 195 | update_valuation_reconciliation | Save or update the valuation reconciliation. | W | Universal | Any project, any page |
| 196 | get_lease_assumptions | Retrieve lease assumption defaults for a project. Returns market rent, TI, leasing commissions, free rent, renewal probability, downtime, and effective dates. Optionally filter by space_type. | R | Multifamily | Multifamily projects only |
| 197 | update_lease_assumptions | Create or update lease assumption defaults using the live table key `(project_id, space_type, effective_date)`. | W | Multifamily | Multifamily projects only |
| 198 | get_value_add_assumptions | Retrieve value-add renovation assumptions for a project. Returns the single project-scoped record if present. | R | Multifamily | Multifamily projects only |
| 199 | update_value_add_assumptions | Create or update value-add renovation assumptions. Uses the live table columns verified from the database. | W | Multifamily | Multifamily projects only |
| 200 | get_unit_turns | Retrieve multifamily unit turn records for a project, optionally filtered to a specific unit_id. | R | Multifamily | Multifamily projects only |
| 201 | create_unit_turn | Create a unit turn record after verifying the unit belongs to the current project. | W | Multifamily | Multifamily projects only |
| 202 | get_cost_approach | Retrieve the latest cost approach valuation record for the project. | R | Universal | Any project, any page |
| 203 | update_cost_approach | Create or update cost approach valuation inputs using the live cost approach columns from the database. | W | Universal | Any project, any page |
| 204 | get_lots | Retrieve lot records for the project. Supports parcel, parcel lot_type_id, and status filtering. | R | Land Dev | Land dev projects only |
| 205 | create_lot | Create a lot record under a parcel after verifying the parcel belongs to the current project. | W | Land Dev | Land dev projects only |
| 206 | update_lot | Update a lot record after verifying the lot belongs to the current project. | W | Land Dev | Land dev projects only |
| 207 | get_lot_types | Retrieve lot type definitions currently associated with the project's parcels. | R | Land Dev | Land dev projects only |
| 208 | update_lot_type | Create or update a lot type definition. The live schema uses `producttype_id` as the key and scopes project ownership through parcel usage. | W | Land Dev | Land dev projects only |
| 209 | get_sale_phases | Retrieve sale phase records for the project. | R | Land Dev | Land dev projects only |
| 210 | update_sale_phase | Create or update a sale phase record. The live schema keys sale phases by `phase_code`. | W | Land Dev | Land dev projects only |
| 211 | get_location_analysis | Retrieve the saved location analysis narrative for a specific tier. | R | Universal | Any project, any page |
| 212 | get_ingestion_staging | Get extracted field values from the ingestion workbench for the current document. | R | Ingestion | Ingestion Workbench (+ pre-project) |
| 213 | update_staging_field | Update the extracted value of a staging field. Use when the user wants to correct or override an extracted value before accepting it. | W | Ingestion | Ingestion Workbench (+ pre-project) |
| 214 | approve_staging_field | Accept/approve an extracted field value, marking it ready for commit. Can approve a single field or multiple fields at once. | W | Ingestion | Ingestion Workbench (+ pre-project) |
| 215 | reject_staging_field | Reject an extracted field value. Use when the extraction is wrong and should not be committed. | W | Ingestion | Ingestion Workbench (+ pre-project) |
| 216 | explain_extraction | Explain why a specific field was extracted with its current value. | R | Ingestion | Ingestion Workbench (+ pre-project) |
| 217 | update_location_analysis | Update the location analysis narrative text for a specific tier. | W | Universal | Any project, any page |
| 218 | create_project | Create a new project. Use from dashboard or any page. Returns project_id and navigation URL. | W | Universal | Any page — surfaced on: Dashboard (+ pre-project) |
| 219 | parse_spreadsheet_lots | Parse a spreadsheet (Excel/CSV) to identify lot roster data. | R | Land Dev | Land dev projects only — Land Planning |
| 220 | get_hierarchy_config | Get the project's hierarchy configuration — which levels (Area/Phase/Parcel) are enabled and their labels. | R | Land Dev | Land dev projects only — Land Planning |
| 221 | stage_parcel_lots | Stage parsed lot data into the Ingestion Workbench for user review before committing to the database. | W | Land Dev | Land dev projects only — Land Planning |
| 222 | bulk_create_parcels | Bulk-create parcels and optionally phases from structured lot data. | W | Land Dev | Land dev projects only — Land Planning |
| 223 | open_input_modal | Open a structured editing interface (modal) for the user. | R | Universal | Any project, any page (+ pre-project) |
| 224 | classify_excel_file | Classify an uploaded Excel workbook (.xlsx/.xlsm) into one of three audit tiers: 'flat' (tabular data, no formulas worth auditing), 'assumption_heavy' (labeled inputs across sheets, limited model logic), or 'full_model' (waterfall/debt/cash flow with interdependent formulas). | R | Universal | Any project, any page (+ pre-project) |
| 225 | run_structural_scan | Phase 1 of the Excel audit. Returns sheet inventory (names, dimensions, hidden flag), named ranges, and any external workbook links. External links are a portability red flag. Run after classify_excel_file on assumpti… | R | Universal | Any project, any page (+ pre-project) |
| 226 | run_formula_integrity | Phase 2 of the Excel audit. Runs four integrity checks and returns a findings list with Sheet!Cell references: (2a) error cells like #REF!/#DIV/0!, (2b) broken references inside formulas, (2c) hardcoded numeric overri… | R | Universal | Any project, any page (+ pre-project) |
| 227 | extract_assumptions | Phase 3 of the Excel audit. Scans the workbook for labeled input values (label-left-of-value heuristic) and writes them to ai_extraction_staging as pending rows with extraction_type='excel_audit_assumption'. Requires… | R | Universal | Any project, any page (+ pre-project) |
| 228 | generate_map_artifact | Generate an interactive aerial/satellite map artifact centered on the project location. | R | Universal | Any page — surfaced on: Map |
| 229 | log_alpha_feedback | Log user feedback (bug, suggestion, question) from chat. | W | Universal | Any page — surfaced on: Alpha Assistant (+ pre-project) |
| 230 | store_appraisal_valuation | Store appraisal valuation conclusions (reconciled value, approach values, appraiser info) as project knowledge facts. | R | Universal | Any project, any page |
| 231 | store_market_intelligence | Store market intelligence from an appraisal (sales volume, pricing trends, absorption, vacancy) as platform-level knowledge reusable across projects. | R | Universal | Any project, any page |
| 232 | store_construction_benchmarks | Store construction cost benchmarks from an appraisal (cost per SF, site improvements, profit margins) as platform-level knowledge. | R | Universal | Any project, any page |
| 233 | get_appraisal_knowledge | Query stored appraisal knowledge — project-level valuation facts or market-level benchmarks and intelligence. | R | Universal | Any project, any page |

## Group Summary

| Group | Read | Write | Total |
|-------|------|-------|-------|
| Universal | 54 | 34 | 88 |
| Land Dev | 22 | 34 | 56 |
| Multifamily | 11 | 13 | 24 |
| Income Property | 7 | 5 | 12 |
| CRE | 5 | 7 | 12 |
| Ingestion | 2 | 3 | 5 |
| What-If / Scenario | 12 | 10 | 22 |
| Admin | 6 | 8 | 14 |
| **Total** | **119** | **114** | **233** |

## Registry Architecture

**File:** `backend/apps/landscaper/tool_registry.py`

Tools are assembled per request via `get_tools_for_page()`, which unions:

1. **UNIVERSAL_TOOLS** (88 tools) — available on every page, every property type
2. **LAND_ONLY_TOOLS** (56 tools) — land dev projects only
3. **MF_ONLY_TOOLS** (24 tools) — multifamily projects only
4. **INCOME_PROPERTY_TOOLS** (12 tools) — MF + Office + Retail + Industrial
5. **CRE_ONLY_TOOLS** (12 tools) — Office + Retail + Industrial only
6. **INGESTION_TOOLS** (5 tools) — document ingestion workbench
7. **WHATIF_TOOLS** (22 tools) — what-if / scenario / IC analysis
8. **ADMIN_TOOLS** (14 tools) — admin configuration

**UNASSIGNED_SAFE_TOOLS** (22 tools) — safe for pre-project threads (no `project_id`). These are a subset of the above groups, whitelisted for conversations before a project has been created.

**`PAGE_TOOLS`** maps page contexts to tool names (22 page contexts):
`mf_home`, `mf_property`, `mf_operations`, `mf_valuation`, `mf_capitalization`, `land_home`, `land_planning`, `land_budget`, `land_schedule`, `land_valuation`, `land_capitalization`, `documents`, `map`, `reports`, `alpha_assistant`, `dashboard`, `dms`, `benchmarks`, `admin`, `settings`, `ingestion`, `investment_committee`

**Request-time filtering inputs:** `page_context`, `project_type_code`, `is_admin`, `unassigned` (null project).

---

*Regenerated 2026-04-17 from live registry. Previous version (2026-02-26) listed 169 tools.*

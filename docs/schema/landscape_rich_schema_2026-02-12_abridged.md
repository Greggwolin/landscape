# Landscape Rich Schema (Abridged) - 2026-02-12

- Generated at: 2026-02-12T21:58:59.531650Z
- Database host: ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech
- Schema: landscape
- Source JSON: `docs/schema/landscape_rich_schema_2026-02-12.json`
- Basis: condensed inventory format aligned to prior table-inventory style.

## Object Counts

| Object | Count |
|---|---:|
| tables | 353 |
| views | 42 |
| indexes | 1176 |
| constraints | 1000 |
| foreign_keys | 377 |
| triggers | 61 |
| routines | 995 |

## Delta vs Previous Snapshot

Compared against `docs/schema/landscape_rich_schema_2026-02-11.json`.

- Tables: 334 -> 353 (+19)
- Views: 41 -> 42 (+1)
- Indexes: 1121 -> 1176 (+55)
- Constraints: 956 -> 1000 (+44)
- Foreign_keys: 363 -> 377 (+14)
- Triggers: 61 -> 61 (+0)
- Routines: 995 -> 995 (+0)

- Added tables (19): `lkp_building_class`, `lkp_buyer_seller_type`, `lkp_price_status`, `lkp_sale_type`, `tbl_sales_comp_contacts`, `tbl_sales_comp_history`, `tbl_sales_comp_hospitality`, `tbl_sales_comp_industrial`, `tbl_sales_comp_land`, `tbl_sales_comp_manufactured`, `tbl_sales_comp_market_conditions`, `tbl_sales_comp_office`, `tbl_sales_comp_retail`, `tbl_sales_comp_self_storage`, `tbl_sales_comp_specialty_housing`, `tbl_sales_comp_storage_unit_mix`, `tbl_sales_comp_tenants`, `tbl_sales_comp_unit_mix`, `v_sales_comparables_full`
- Removed tables (0): none
- Added views (1): `v_sales_comparables_full`
- Removed views (0): none

## Table Prefix Inventory

| Prefix | Tables | Columns |
|---|---:|---:|
| tbl_ | 177 | 3438 |
| core_ | 35 | 367 |
| vw_ | 30 | 548 |
| lu_ | 13 | 104 |
| dms_ | 8 | 91 |
| v_ | 8 | 229 |
| landscaper_ | 7 | 80 |
| ai_ | 6 | 66 |
| auth_ | 6 | 34 |
| gis_ | 6 | 49 |
| knowledge_ | 6 | 71 |
| bmk_ | 5 | 105 |
| market_ | 5 | 73 |
| django_ | 4 | 18 |
| lkp_ | 4 | 14 |
| mkt_ | 3 | 135 |
| opex_ | 3 | 32 |
| project_ | 3 | 26 |
| doc_ | 2 | 21 |
| user_ | 2 | 10 |
| (no_prefix) | 1 | 4 |
| density_ | 1 | 12 |
| developer_ | 1 | 14 |
| extraction_ | 1 | 10 |
| geography_ | 1 | 7 |
| geometry_ | 1 | 7 |
| glossary_ | 1 | 33 |
| land_ | 1 | 13 |
| management_ | 1 | 12 |
| mutation_ | 1 | 17 |
| mv_ | 1 | 28 |
| pending_ | 1 | 19 |
| planning_ | 1 | 9 |
| report_ | 1 | 10 |
| res_ | 1 | 9 |
| sale_ | 1 | 6 |
| spatial_ | 1 | 5 |
| tester_ | 1 | 22 |
| type_ | 1 | 2 |
| zonda_ | 1 | 26 |

## Tables by Prefix

### tbl_ (177 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| tbl_absorption_schedule | 23 | 5 | 6 |
| tbl_acquisition | 17 | 5 | 7 |
| tbl_acquisition_backup_20260202 | 17 | 0 | 0 |
| tbl_acreage_allocation | 15 | 5 | 5 |
| tbl_additional_income | 8 | 1 | 3 |
| tbl_ai_adjustment_suggestions | 9 | 1 | 4 |
| tbl_alpha_feedback | 9 | 0 | 4 |
| tbl_analysis_type_config | 16 | 0 | 3 |
| tbl_approval | 5 | 1 | 1 |
| tbl_area | 4 | 1 | 2 |
| tbl_assumptionrule | 4 | 0 | 1 |
| tbl_base_rent | 15 | 1 | 4 |
| tbl_benchmark_ai_suggestions | 23 | 4 | 6 |
| tbl_benchmark_contingency | 4 | 1 | 2 |
| tbl_benchmark_transaction_cost | 10 | 1 | 3 |
| tbl_benchmark_unit_cost | 11 | 1 | 4 |
| tbl_budget | 12 | 2 | 1 |
| tbl_budget_fact | 17 | 4 | 5 |
| tbl_budget_items | 20 | 3 | 4 |
| tbl_budget_structure | 14 | 1 | 3 |
| tbl_budget_timing | 6 | 2 | 4 |
| tbl_cabinet | 8 | 0 | 3 |
| tbl_calculation_period | 12 | 1 | 3 |
| tbl_cap_rate_comps | 9 | 1 | 2 |
| tbl_capex_reserve | 20 | 1 | 2 |
| tbl_capital_call | 10 | 2 | 2 |
| tbl_capital_reserves | 14 | 2 | 5 |
| tbl_capitalization | 5 | 1 | 1 |
| tbl_cashflow | 15 | 5 | 6 |
| tbl_cashflow_summary | 21 | 1 | 3 |
| tbl_changelog | 8 | 0 | 3 |
| tbl_closing_event | 24 | 1 | 5 |
| tbl_commercial_lease | 30 | 3 | 7 |
| tbl_contact | 26 | 1 | 8 |
| tbl_contact_relationship | 11 | 3 | 7 |
| tbl_contact_role | 12 | 1 | 4 |
| tbl_contacts_legacy | 31 | 1 | 3 |
| tbl_cost_allocation | 11 | 3 | 5 |
| tbl_cost_approach | 25 | 1 | 2 |
| tbl_cost_approach_depreciation | 14 | 1 | 2 |
| tbl_dcf_analysis | 24 | 5 | 4 |
| tbl_debt_draw_schedule | 30 | 2 | 4 |
| tbl_division | 18 | 2 | 5 |
| tbl_document_project | 6 | 2 | 5 |
| tbl_dynamic_column_definition | 14 | 3 | 5 |
| tbl_dynamic_column_value | 11 | 2 | 6 |
| tbl_equity | 43 | 1 | 3 |
| tbl_equity_distribution | 11 | 2 | 4 |
| tbl_equity_partner | 12 | 1 | 3 |
| tbl_equity_structure | 12 | 1 | 1 |
| tbl_escalation | 15 | 1 | 3 |
| tbl_expansion_option | 23 | 3 | 3 |
| tbl_expense_detail | 13 | 2 | 3 |
| tbl_expense_recovery | 11 | 1 | 1 |
| tbl_extraction_job | 13 | 1 | 11 |
| tbl_extraction_log | 16 | 1 | 4 |
| tbl_extraction_mapping | 18 | 0 | 5 |
| tbl_field_catalog | 21 | 0 | 5 |
| tbl_finance_structure | 18 | 2 | 6 |
| tbl_global_benchmark_registry | 23 | 2 | 7 |
| tbl_hbu_analysis | 39 | 2 | 5 |
| tbl_hbu_comparable_use | 15 | 1 | 3 |
| tbl_hbu_zoning_document | 13 | 2 | 3 |
| tbl_income_approach | 16 | 1 | 2 |
| tbl_income_property | 26 | 2 | 4 |
| tbl_income_property_ind_ext | 42 | 1 | 3 |
| tbl_income_property_mf_ext | 37 | 1 | 2 |
| tbl_income_property_ret_ext | 32 | 1 | 2 |
| tbl_inventory_item | 22 | 5 | 12 |
| tbl_item_dependency | 14 | 0 | 3 |
| tbl_land_comp_adjustments | 7 | 1 | 2 |
| tbl_land_comparables | 20 | 1 | 2 |
| tbl_landuse | 10 | 1 | 5 |
| tbl_landuse_program | 10 | 0 | 1 |
| tbl_lease | 42 | 3 | 7 |
| tbl_lease_assumptions | 17 | 1 | 4 |
| tbl_lease_ind_ext | 21 | 1 | 1 |
| tbl_lease_mf_ext | 21 | 1 | 1 |
| tbl_lease_ret_ext | 31 | 1 | 2 |
| tbl_lease_revenue_timing | 14 | 2 | 6 |
| tbl_leasing_commission | 8 | 1 | 3 |
| tbl_loan | 85 | 3 | 6 |
| tbl_loan_container | 6 | 2 | 4 |
| tbl_loan_finance_structure | 5 | 2 | 4 |
| tbl_lot | 23 | 3 | 6 |
| tbl_lot_type | 4 | 0 | 2 |
| tbl_market_rate_analysis | 36 | 1 | 3 |
| tbl_measures | 10 | 0 | 4 |
| tbl_milestone | 15 | 4 | 4 |
| tbl_msa | 9 | 0 | 2 |
| tbl_multifamily_lease | 19 | 1 | 7 |
| tbl_multifamily_property | 59 | 1 | 5 |
| tbl_multifamily_turn | 16 | 1 | 5 |
| tbl_multifamily_unit | 34 | 1 | 7 |
| tbl_multifamily_unit_type | 19 | 2 | 5 |
| tbl_narrative_change | 10 | 1 | 2 |
| tbl_narrative_comment | 12 | 1 | 2 |
| tbl_narrative_version | 11 | 0 | 2 |
| tbl_operating_expense | 16 | 2 | 5 |
| tbl_operating_expenses | 23 | 3 | 10 |
| tbl_operations_user_inputs | 25 | 2 | 6 |
| tbl_opex_accounts_deprecated | 10 | 1 | 5 |
| tbl_opex_timing | 9 | 2 | 6 |
| tbl_parcel | 45 | 5 | 3 |
| tbl_parcel_sale_assumptions | 31 | 1 | 3 |
| tbl_parcel_sale_event | 26 | 1 | 5 |
| tbl_participation_payment | 16 | 2 | 6 |
| tbl_percentage_rent | 10 | 1 | 1 |
| tbl_phase | 11 | 1 | 1 |
| tbl_platform_knowledge | 24 | 0 | 4 |
| tbl_platform_knowledge_chapters | 14 | 1 | 4 |
| tbl_platform_knowledge_chunks | 14 | 2 | 5 |
| tbl_project | 133 | 5 | 14 |
| tbl_project_assumption | 13 | 2 | 5 |
| tbl_project_config | 19 | 1 | 3 |
| tbl_project_contact | 9 | 3 | 7 |
| tbl_project_inventory_columns | 19 | 1 | 4 |
| tbl_project_metrics | 22 | 1 | 4 |
| tbl_project_settings | 11 | 1 | 2 |
| tbl_property_acquisition | 24 | 1 | 2 |
| tbl_property_apn | 8 | 1 | 3 |
| tbl_property_attribute_def | 18 | 0 | 5 |
| tbl_property_type_config | 8 | 0 | 2 |
| tbl_property_use_template | 8 | 0 | 2 |
| tbl_recovery | 7 | 1 | 3 |
| tbl_renewal_option | 32 | 1 | 4 |
| tbl_rent_comparable | 21 | 1 | 3 |
| tbl_rent_concession | 22 | 1 | 3 |
| tbl_rent_escalation | 14 | 1 | 1 |
| tbl_rent_roll | 29 | 1 | 5 |
| tbl_rent_roll_unit | 13 | 1 | 2 |
| tbl_rent_schedule | 11 | 1 | 2 |
| tbl_rent_step | 22 | 1 | 4 |
| tbl_rental_comparable | 23 | 1 | 3 |
| tbl_revenue_other | 23 | 1 | 3 |
| tbl_revenue_rent | 17 | 1 | 2 |
| tbl_revenue_timing | 13 | 2 | 4 |
| tbl_sale_benchmarks | 18 | 1 | 4 |
| tbl_sale_phases | 9 | 1 | 2 |
| tbl_sale_settlement | 29 | 2 | 8 |
| tbl_sales_comp_adjustments | 20 | 1 | 2 |
| tbl_sales_comp_contacts | 12 | 1 | 2 |
| tbl_sales_comp_history | 13 | 1 | 3 |
| tbl_sales_comp_hospitality | 27 | 1 | 4 |
| tbl_sales_comp_industrial | 27 | 1 | 3 |
| tbl_sales_comp_land | 36 | 1 | 4 |
| tbl_sales_comp_manufactured | 27 | 1 | 3 |
| tbl_sales_comp_market_conditions | 20 | 1 | 3 |
| tbl_sales_comp_office | 29 | 1 | 3 |
| tbl_sales_comp_retail | 25 | 1 | 4 |
| tbl_sales_comp_self_storage | 25 | 1 | 3 |
| tbl_sales_comp_specialty_housing | 25 | 1 | 4 |
| tbl_sales_comp_storage_unit_mix | 13 | 1 | 2 |
| tbl_sales_comp_tenants | 27 | 1 | 4 |
| tbl_sales_comp_unit_mix | 25 | 1 | 3 |
| tbl_sales_comparables | 125 | 1 | 9 |
| tbl_scenario | 19 | 3 | 5 |
| tbl_scenario_comparison | 9 | 1 | 2 |
| tbl_security_deposit | 29 | 1 | 3 |
| tbl_space | 18 | 1 | 4 |
| tbl_space_ind_ext | 17 | 1 | 2 |
| tbl_space_mf_ext | 28 | 1 | 3 |
| tbl_space_ret_ext | 22 | 1 | 2 |
| tbl_system_picklist | 10 | 1 | 5 |
| tbl_template_column_config | 15 | 1 | 2 |
| tbl_tenant | 20 | 0 | 3 |
| tbl_tenant_improvement | 10 | 1 | 3 |
| tbl_termination_option | 25 | 1 | 3 |
| tbl_uom_calculation_formulas | 8 | 0 | 3 |
| tbl_user_landscaper_profile | 16 | 1 | 2 |
| tbl_user_preference | 9 | 1 | 11 |
| tbl_vacancy_assumption | 16 | 1 | 2 |
| tbl_valuation_reconciliation | 13 | 1 | 2 |
| tbl_value_add_assumptions | 15 | 1 | 2 |
| tbl_waterfall | 7 | 1 | 3 |
| tbl_waterfall_tier | 21 | 1 | 2 |
| tbl_zoning_control | 19 | 0 | 4 |

### core_ (35 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| core_category_lifecycle_stages | 5 | 1 | 3 |
| core_category_lifecycle_stages_backup_20260126 | 5 | 0 | 0 |
| core_category_tag_library | 9 | 0 | 4 |
| core_doc | 34 | 6 | 10 |
| core_doc_attr_enum | 5 | 1 | 1 |
| core_doc_attr_lookup | 4 | 1 | 1 |
| core_doc_folder | 9 | 1 | 4 |
| core_doc_folder_link | 4 | 2 | 2 |
| core_doc_media | 34 | 4 | 9 |
| core_doc_media_link | 9 | 1 | 5 |
| core_doc_smartfilter | 6 | 0 | 2 |
| core_doc_text | 6 | 1 | 2 |
| core_fin_budget_version | 6 | 1 | 1 |
| core_fin_category_uom | 2 | 1 | 1 |
| core_fin_confidence_policy | 6 | 0 | 1 |
| core_fin_crosswalk_ad | 3 | 0 | 1 |
| core_fin_crosswalk_ae | 3 | 0 | 1 |
| core_fin_curve | 4 | 0 | 2 |
| core_fin_division_applicability | 2 | 0 | 1 |
| core_fin_fact_actual | 12 | 4 | 5 |
| core_fin_fact_budget | 81 | 11 | 23 |
| core_fin_fact_tags | 9 | 0 | 5 |
| core_fin_funding_source | 7 | 0 | 1 |
| core_fin_growth_rate_sets | 10 | 1 | 5 |
| core_fin_growth_rate_steps | 8 | 1 | 3 |
| core_fin_uom | 5 | 0 | 1 |
| core_item_benchmark_link | 5 | 2 | 3 |
| core_lookup_item | 7 | 1 | 2 |
| core_lookup_list | 5 | 0 | 1 |
| core_lookup_vw | 7 | 0 | 0 |
| core_planning_standards | 8 | 0 | 2 |
| core_unit_cost_category | 12 | 1 | 7 |
| core_unit_cost_category_backup_20260126 | 12 | 0 | 0 |
| core_unit_cost_item | 19 | 3 | 9 |
| core_workspace_member | 4 | 1 | 2 |

### vw_ (30 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| vw_absorption_with_dependencies | 21 | 0 | 0 |
| vw_acreage_allocation | 17 | 0 | 0 |
| vw_budget_grid_items | 42 | 0 | 0 |
| vw_budget_variance | 9 | 0 | 0 |
| vw_budget_with_dependencies | 25 | 0 | 0 |
| vw_category_hierarchy | 11 | 0 | 0 |
| vw_debt_balance_summary | 20 | 0 | 0 |
| vw_doc_media_summary | 10 | 0 | 0 |
| vw_extraction_mapping_stats | 14 | 0 | 0 |
| vw_item_dependency_status | 12 | 0 | 0 |
| vw_lease_expiration_schedule | 17 | 0 | 0 |
| vw_map_plan_parcels | 14 | 0 | 0 |
| vw_map_tax_parcels | 5 | 0 | 0 |
| vw_mkt_absorption_by_lot_width | 10 | 0 | 0 |
| vw_mkt_absorption_by_lu_product | 7 | 0 | 0 |
| vw_mkt_current_projects | 101 | 0 | 0 |
| vw_mkt_landscaper_summary | 8 | 0 | 0 |
| vw_mkt_pricing_by_city_lotwidth | 8 | 0 | 0 |
| vw_multifamily_lease_expirations | 22 | 0 | 0 |
| vw_multifamily_occupancy_summary | 16 | 0 | 0 |
| vw_multifamily_project_summary | 13 | 0 | 0 |
| vw_multifamily_turn_metrics | 15 | 0 | 0 |
| vw_multifamily_unit_status | 22 | 0 | 0 |
| vw_parcels_with_sales | 28 | 0 | 0 |
| vw_permit_annual_by_jurisdiction | 5 | 0 | 0 |
| vw_permit_msa_monthly | 6 | 0 | 0 |
| vw_project_acquisition_summary | 12 | 0 | 0 |
| vw_rent_roll | 12 | 0 | 0 |
| vw_revenue_timeline | 19 | 0 | 0 |
| vw_zoning_glossary_export | 27 | 0 | 0 |

### lu_ (13 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| lu_acreage_allocation_type | 8 | 0 | 2 |
| lu_com_spec | 15 | 2 | 1 |
| lu_family | 5 | 0 | 3 |
| lu_lease_status | 5 | 0 | 1 |
| lu_lease_type | 4 | 0 | 1 |
| lu_market | 5 | 0 | 2 |
| lu_media_classification | 11 | 0 | 2 |
| lu_picklist_display_config | 6 | 0 | 2 |
| lu_property_subtype | 7 | 0 | 2 |
| lu_recovery_structure | 4 | 0 | 1 |
| lu_res_spec | 18 | 2 | 1 |
| lu_subtype | 9 | 1 | 2 |
| lu_type | 7 | 1 | 4 |

### dms_ (8 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| dms_assertion | 16 | 1 | 6 |
| dms_attributes | 13 | 0 | 2 |
| dms_extract_queue | 16 | 1 | 4 |
| dms_profile_audit | 9 | 1 | 1 |
| dms_template_attributes | 5 | 2 | 1 |
| dms_templates | 10 | 2 | 1 |
| dms_unmapped | 15 | 1 | 5 |
| dms_workspaces | 7 | 0 | 2 |

### v_ (8 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| v_ai_review_summary | 6 | 0 | 0 |
| v_contact_projects | 12 | 0 | 0 |
| v_contact_relationships | 13 | 0 | 0 |
| v_lease_summary | 8 | 0 | 0 |
| v_project_contacts | 15 | 0 | 0 |
| v_project_contacts_detail | 23 | 0 | 0 |
| v_rent_roll | 15 | 0 | 0 |
| v_sales_comparables_full | 137 | 0 | 0 |

### landscaper_ (7 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| landscaper_absorption_detail | 25 | 1 | 6 |
| landscaper_activity | 16 | 1 | 7 |
| landscaper_advice | 9 | 2 | 7 |
| landscaper_chat_embedding | 6 | 2 | 4 |
| landscaper_chat_message | 8 | 2 | 7 |
| landscaper_chat_thread | 10 | 1 | 5 |
| landscaper_thread_message | 6 | 1 | 3 |

### ai_ (6 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| ai_correction_log | 11 | 1 | 5 |
| ai_debug_log | 4 | 0 | 1 |
| ai_extraction_staging | 27 | 2 | 7 |
| ai_extraction_warnings | 9 | 1 | 4 |
| ai_ingestion_history | 7 | 1 | 1 |
| ai_review_history | 8 | 1 | 4 |

### auth_ (6 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| auth_group | 2 | 0 | 3 |
| auth_group_permissions | 3 | 2 | 4 |
| auth_permission | 4 | 1 | 3 |
| auth_user | 19 | 0 | 3 |
| auth_user_groups | 3 | 2 | 4 |
| auth_user_user_permissions | 3 | 2 | 4 |

### gis_ (6 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| gis_boundary_history | 7 | 1 | 3 |
| gis_document_ingestion | 12 | 1 | 2 |
| gis_mapping_history | 7 | 1 | 3 |
| gis_plan_parcel | 11 | 2 | 4 |
| gis_project_boundary | 5 | 1 | 3 |
| gis_tax_parcel_ref | 7 | 0 | 2 |

### knowledge_ (6 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| knowledge_embeddings | 10 | 0 | 8 |
| knowledge_entities | 7 | 1 | 9 |
| knowledge_facts | 14 | 4 | 16 |
| knowledge_insights | 14 | 2 | 10 |
| knowledge_interactions | 15 | 1 | 6 |
| knowledge_sessions | 11 | 1 | 7 |

### bmk_ (5 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| bmk_absorption_velocity | 8 | 1 | 3 |
| bmk_builder_communities | 27 | 0 | 8 |
| bmk_builder_inventory | 23 | 0 | 9 |
| bmk_builder_plans | 20 | 0 | 7 |
| bmk_resale_closings | 27 | 0 | 7 |

### market_ (5 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| market_activity | 11 | 0 | 6 |
| market_assumptions | 12 | 0 | 3 |
| market_competitive_project_exclusions | 5 | 1 | 3 |
| market_competitive_project_products | 23 | 2 | 5 |
| market_competitive_projects | 22 | 1 | 4 |

### django_ (4 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| django_admin_log | 8 | 2 | 3 |
| django_content_type | 3 | 0 | 2 |
| django_migrations | 4 | 0 | 1 |
| django_session | 3 | 0 | 3 |

### lkp_ (4 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| lkp_building_class | 3 | 0 | 1 |
| lkp_buyer_seller_type | 3 | 0 | 1 |
| lkp_price_status | 4 | 0 | 1 |
| lkp_sale_type | 4 | 0 | 1 |

### mkt_ (3 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| mkt_data_source_registry | 18 | 0 | 3 |
| mkt_new_home_project | 101 | 1 | 15 |
| mkt_permit_history | 16 | 1 | 6 |

### opex_ (3 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| opex_account_migration_map | 5 | 0 | 1 |
| opex_benchmark | 19 | 0 | 6 |
| opex_label_mapping | 8 | 0 | 2 |

### project_ (3 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| project_boundaries | 7 | 1 | 3 |
| project_jurisdiction_mapping | 10 | 3 | 1 |
| project_parcel_boundaries | 9 | 2 | 5 |

### doc_ (2 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| doc_extracted_facts | 10 | 1 | 4 |
| doc_processing_queue | 11 | 1 | 5 |

### user_ (2 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| user_profile | 6 | 1 | 2 |
| user_settings | 4 | 0 | 1 |

### (no_prefix) (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| _migrations | 4 | 0 | 2 |

### density_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| density_classification | 12 | 0 | 2 |

### developer_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| developer_fees | 14 | 1 | 2 |

### extraction_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| extraction_commit_snapshot | 10 | 3 | 5 |

### geography_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| geography_columns | 7 | 0 | 0 |

### geometry_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| geometry_columns | 7 | 0 | 0 |

### glossary_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| glossary_zoning | 33 | 0 | 8 |

### land_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| land_use_pricing | 13 | 2 | 8 |

### management_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| management_overhead | 12 | 1 | 2 |

### mutation_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| mutation_audit_log | 17 | 0 | 4 |

### mv_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| mv_doc_search | 28 | 0 | 0 |

### pending_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| pending_mutations | 19 | 1 | 5 |

### planning_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| planning_doc | 9 | 0 | 1 |

### report_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| report_templates | 10 | 0 | 2 |

### res_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| res_lot_product | 9 | 1 | 4 |

### sale_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| sale_names | 6 | 1 | 3 |

### spatial_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| spatial_ref_sys | 5 | 0 | 1 |

### tester_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| tester_feedback | 22 | 2 | 6 |

### type_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| type_lot_product | 2 | 2 | 1 |

### zonda_ (1 tables)

| Table | Columns | FK Count | Index Count |
|---|---:|---:|---:|
| zonda_subdivisions | 26 | 0 | 7 |

## Widest Tables (Top 30 by Column Count)

| Rank | Table | Columns |
|---:|---|---:|
| 1 | v_sales_comparables_full | 137 |
| 2 | tbl_project | 133 |
| 3 | tbl_sales_comparables | 125 |
| 4 | mkt_new_home_project | 101 |
| 5 | vw_mkt_current_projects | 101 |
| 6 | tbl_loan | 85 |
| 7 | core_fin_fact_budget | 81 |
| 8 | tbl_multifamily_property | 59 |
| 9 | tbl_parcel | 45 |
| 10 | tbl_equity | 43 |
| 11 | tbl_income_property_ind_ext | 42 |
| 12 | tbl_lease | 42 |
| 13 | vw_budget_grid_items | 42 |
| 14 | tbl_hbu_analysis | 39 |
| 15 | tbl_income_property_mf_ext | 37 |
| 16 | tbl_market_rate_analysis | 36 |
| 17 | tbl_sales_comp_land | 36 |
| 18 | core_doc | 34 |
| 19 | core_doc_media | 34 |
| 20 | tbl_multifamily_unit | 34 |
| 21 | glossary_zoning | 33 |
| 22 | tbl_income_property_ret_ext | 32 |
| 23 | tbl_renewal_option | 32 |
| 24 | tbl_contacts_legacy | 31 |
| 25 | tbl_lease_ret_ext | 31 |
| 26 | tbl_parcel_sale_assumptions | 31 |
| 27 | tbl_commercial_lease | 30 |
| 28 | tbl_debt_draw_schedule | 30 |
| 29 | tbl_rent_roll | 29 |
| 30 | tbl_sale_settlement | 29 |

## Highest FK Density (Top 30)

| Rank | Table | Foreign Keys |
|---:|---|---:|
| 1 | core_fin_fact_budget | 11 |
| 2 | core_doc | 6 |
| 3 | tbl_absorption_schedule | 5 |
| 4 | tbl_acquisition | 5 |
| 5 | tbl_acreage_allocation | 5 |
| 6 | tbl_cashflow | 5 |
| 7 | tbl_dcf_analysis | 5 |
| 8 | tbl_inventory_item | 5 |
| 9 | tbl_parcel | 5 |
| 10 | tbl_project | 5 |
| 11 | core_doc_media | 4 |
| 12 | core_fin_fact_actual | 4 |
| 13 | knowledge_facts | 4 |
| 14 | tbl_benchmark_ai_suggestions | 4 |
| 15 | tbl_budget_fact | 4 |
| 16 | tbl_milestone | 4 |
| 17 | core_unit_cost_item | 3 |
| 18 | extraction_commit_snapshot | 3 |
| 19 | project_jurisdiction_mapping | 3 |
| 20 | tbl_budget_items | 3 |
| 21 | tbl_commercial_lease | 3 |
| 22 | tbl_contact_relationship | 3 |
| 23 | tbl_cost_allocation | 3 |
| 24 | tbl_dynamic_column_definition | 3 |
| 25 | tbl_expansion_option | 3 |
| 26 | tbl_lease | 3 |
| 27 | tbl_loan | 3 |
| 28 | tbl_lot | 3 |
| 29 | tbl_operating_expenses | 3 |
| 30 | tbl_project_contact | 3 |

## View Inventory

| View Name |
|---|
| core_lookup_vw |
| geography_columns |
| geometry_columns |
| mv_doc_search |
| v_ai_review_summary |
| v_contact_projects |
| v_contact_relationships |
| v_lease_summary |
| v_project_contacts |
| v_project_contacts_detail |
| v_rent_roll |
| v_sales_comparables_full |
| vw_absorption_with_dependencies |
| vw_acreage_allocation |
| vw_budget_grid_items |
| vw_budget_variance |
| vw_budget_with_dependencies |
| vw_category_hierarchy |
| vw_debt_balance_summary |
| vw_doc_media_summary |
| vw_extraction_mapping_stats |
| vw_item_dependency_status |
| vw_lease_expiration_schedule |
| vw_map_plan_parcels |
| vw_map_tax_parcels |
| vw_mkt_absorption_by_lot_width |
| vw_mkt_absorption_by_lu_product |
| vw_mkt_current_projects |
| vw_mkt_landscaper_summary |
| vw_mkt_pricing_by_city_lotwidth |
| vw_multifamily_lease_expirations |
| vw_multifamily_occupancy_summary |
| vw_multifamily_project_summary |
| vw_multifamily_turn_metrics |
| vw_multifamily_unit_status |
| vw_parcels_with_sales |
| vw_permit_annual_by_jurisdiction |
| vw_permit_msa_monthly |
| vw_project_acquisition_summary |
| vw_rent_roll |
| vw_revenue_timeline |
| vw_zoning_glossary_export |


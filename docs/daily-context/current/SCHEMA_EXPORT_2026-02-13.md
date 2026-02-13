# Schema Export

## Summary
- **Generated:** 2026-02-13 10:54:33 
- **Schema:** landscape
- **Table Count:** 314
- **Index Count:** 1187
- **Foreign Key Count:** 382

## Tables by Domain Prefix
- **tbl_:** 179 tables
- **core_:** 34 tables
- **bmk_:** 5 tables
- **lu_:** 13 tables
- **dms_:** 8 tables
- **ai_:** 6 tables
- **knowledge_:** 6 tables
- **other:** 63 tables

## Foreign Key Relationship Map
| Table | References |
|-------|------------|
| ai_correction_log | queue_id -> dms_extract_queue.queue_id |
| ai_extraction_staging | doc_id -> core_doc.doc_id; project_id -> tbl_project.project_id |
| ai_extraction_warnings | queue_id -> dms_extract_queue.queue_id |
| ai_ingestion_history | project_id -> tbl_project.project_id |
| ai_review_history | project_id -> tbl_project.project_id |
| auth_group_permissions | group_id -> auth_group.id; permission_id -> auth_permission.id |
| auth_permission | content_type_id -> django_content_type.id |
| auth_user_groups | group_id -> auth_group.id; user_id -> auth_user.id |
| auth_user_user_permissions | permission_id -> auth_permission.id; user_id -> auth_user.id |
| bmk_absorption_velocity | benchmark_id -> tbl_global_benchmark_registry.benchmark_id |
| core_category_lifecycle_stages | category_id -> core_unit_cost_category.category_id |
| core_doc | cabinet_id -> tbl_cabinet.cabinet_id; parcel_id -> tbl_parcel.parcel_id; parent_doc_id -> core_doc.doc_id; phase_id -> tbl_phase.phase_id; project_id -> tbl_project.project_id; workspace_id -> dms_workspaces.workspace_id |
| core_doc_attr_enum | attr_id -> dms_attributes.attr_id |
| core_doc_attr_lookup | attr_id -> dms_attributes.attr_id |
| core_doc_folder | parent_id -> core_doc_folder.folder_id |
| core_doc_folder_link | doc_id -> core_doc.doc_id; folder_id -> core_doc_folder.folder_id |
| core_doc_media | classification_id -> lu_media_classification.classification_id; doc_id -> core_doc.doc_id; project_id -> tbl_project.project_id; workspace_id -> dms_workspaces.workspace_id |
| core_doc_media_link | media_id -> core_doc_media.media_id |
| core_doc_text | doc_id -> core_doc.doc_id |
| core_fin_budget_version | project_id -> tbl_project.project_id |
| core_fin_category_uom | uom_code -> core_fin_uom.uom_code |
| core_fin_fact_actual | container_id -> tbl_division.division_id; project_id -> tbl_project.project_id; scenario_id -> tbl_scenario.scenario_id; uom_code -> core_fin_uom.uom_code |
| core_fin_fact_budget | budget_id -> core_fin_budget_version.budget_id; category_id -> core_unit_cost_category.category_id; curve_id -> core_fin_curve.curve_id; division_id -> tbl_division.division_id; finance_structure_id -> tbl_finance_structure.finance_structure_id; funding_id -> core_fin_funding_source.funding_id; growth_rate_set_id -> core_fin_growth_rate_sets.set_id; project_id -> tbl_project.project_id; scenario_id -> tbl_scenario.scenario_id; uom_code -> core_fin_uom.uom_code; vendor_contact_id -> tbl_contacts_legacy.contact_id |
| core_fin_growth_rate_sets | benchmark_id -> tbl_global_benchmark_registry.benchmark_id |
| core_fin_growth_rate_steps | set_id -> core_fin_growth_rate_sets.set_id |
| core_item_benchmark_link | benchmark_id -> tbl_global_benchmark_registry.benchmark_id; item_id -> core_unit_cost_item.item_id |
| core_lookup_item | list_key -> core_lookup_list.list_key |
| core_unit_cost_category | parent_id -> core_unit_cost_category.category_id |
| core_unit_cost_item | category_id -> core_unit_cost_category.category_id; created_from_project_id -> tbl_project.project_id; default_uom_code -> tbl_measures.measure_code |
| core_workspace_member | workspace_id -> dms_workspaces.workspace_id |
| developer_fees | project_id -> tbl_project.project_id |
| django_admin_log | content_type_id -> django_content_type.id; user_id -> auth_user.id |
| dms_assertion | project_id -> tbl_project.project_id |
| dms_extract_queue | doc_id -> core_doc.doc_id |
| dms_profile_audit | doc_id -> core_doc.doc_id |
| dms_template_attributes | attr_id -> dms_attributes.attr_id; template_id -> dms_templates.template_id |
| dms_templates | project_id -> tbl_project.project_id; workspace_id -> dms_workspaces.workspace_id |
| dms_unmapped | project_id -> tbl_project.project_id |
| doc_extracted_facts | doc_id -> core_doc.doc_id |
| doc_processing_queue | doc_id -> core_doc.doc_id |
| document_tables | doc_id -> core_doc.doc_id |
| extraction_commit_snapshot | committed_by -> auth_user.id; doc_id -> core_doc.doc_id; project_id -> tbl_project.project_id |
| gis_boundary_history | project_id -> tbl_project.project_id |
| gis_document_ingestion | project_id -> tbl_project.project_id |
| gis_mapping_history | project_id -> tbl_project.project_id |
| gis_plan_parcel | parcel_id -> tbl_parcel.parcel_id; project_id -> tbl_project.project_id |
| gis_project_boundary | project_id -> tbl_project.project_id |
| knowledge_entities | created_by_id -> auth_user.id |
| knowledge_facts | created_by_id -> auth_user.id; object_entity_id -> knowledge_entities.entity_id; subject_entity_id -> knowledge_entities.entity_id; superseded_by_id -> knowledge_facts.fact_id |
| knowledge_insights | acknowledged_by_id -> auth_user.id; subject_entity_id -> knowledge_entities.entity_id |
| knowledge_interactions | session_id -> knowledge_sessions.session_id |
| knowledge_sessions | user_id -> auth_user.id |
| land_use_pricing | benchmark_id -> tbl_global_benchmark_registry.benchmark_id; growth_rate_set_id -> core_fin_growth_rate_sets.set_id |
| landscaper_absorption_detail | benchmark_id -> tbl_global_benchmark_registry.benchmark_id |
| landscaper_activity | project_id -> tbl_project.project_id |
| landscaper_advice | message_id -> landscaper_chat_message.message_id; project_id -> tbl_project.project_id |
| landscaper_chat_embedding | message_id -> landscaper_thread_message.id; thread_id -> landscaper_chat_thread.id |
| landscaper_chat_message | project_id -> tbl_project.project_id; user_id -> auth_user.id |
| landscaper_chat_thread | project_id -> tbl_project.project_id |
| landscaper_thread_message | thread_id -> landscaper_chat_thread.id |
| lu_com_spec | doc_id -> planning_doc.doc_id; type_id -> lu_type.type_id |
| lu_res_spec | doc_id -> planning_doc.doc_id; type_id -> lu_type.type_id |
| lu_subtype | family_id -> lu_family.family_id |
| lu_type | family_id -> lu_family.family_id |
| management_overhead | project_id -> tbl_project.project_id |
| market_competitive_project_exclusions | project_id -> tbl_project.project_id |
| market_competitive_project_products | competitive_project_id -> market_competitive_projects.id; product_id -> res_lot_product.product_id |
| market_competitive_projects | project_id -> tbl_project.project_id |
| mkt_new_home_project | source_id -> mkt_data_source_registry.source_id |
| mkt_permit_history | source_id -> mkt_data_source_registry.source_id |
| pending_mutations | project_id -> tbl_project.project_id |
| project_boundaries | project_id -> tbl_project.project_id |
| project_jurisdiction_mapping | density_code -> density_classification.code; glossary_id -> glossary_zoning.glossary_id; project_id -> tbl_project.project_id |
| project_parcel_boundaries | boundary_id -> project_boundaries.boundary_id; project_id -> tbl_project.project_id |
| res_lot_product | type_id -> lu_type.type_id |
| sale_names | project_id -> tbl_project.project_id |
| tbl_absorption_schedule | area_id -> tbl_area.area_id; parcel_id -> tbl_parcel.parcel_id; phase_id -> tbl_phase.phase_id; project_id -> tbl_project.project_id; scenario_id -> tbl_scenario.scenario_id |
| tbl_acquisition | category_id -> core_unit_cost_category.category_id; contact_id -> tbl_contacts_legacy.contact_id; measure_id -> tbl_measures.measure_id; project_id -> tbl_project.project_id; subcategory_id -> core_unit_cost_category.category_id |
| tbl_acreage_allocation | allocation_type_id -> lu_acreage_allocation_type.allocation_type_id; parcel_id -> tbl_parcel.parcel_id; phase_id -> tbl_phase.phase_id; project_id -> tbl_project.project_id; source_doc_id -> core_doc.doc_id |
| tbl_additional_income | lease_id -> tbl_lease.lease_id |
| tbl_ai_adjustment_suggestions | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_approval | project_id -> tbl_project.project_id |
| tbl_area | project_id -> tbl_project.project_id |
| tbl_assumption_snapshot | scenario_log_id -> tbl_scenario_log.scenario_log_id |
| tbl_base_rent | lease_id -> tbl_lease.lease_id |
| tbl_benchmark_ai_suggestions | created_benchmark_id -> tbl_global_benchmark_registry.benchmark_id; document_id -> core_doc.doc_id; existing_benchmark_id -> tbl_global_benchmark_registry.benchmark_id; project_id -> tbl_project.project_id |
| tbl_benchmark_contingency | benchmark_id -> tbl_global_benchmark_registry.benchmark_id |
| tbl_benchmark_transaction_cost | benchmark_id -> tbl_global_benchmark_registry.benchmark_id |
| tbl_benchmark_unit_cost | benchmark_id -> tbl_global_benchmark_registry.benchmark_id |
| tbl_budget | devphase_id -> tbl_phase.phase_id; measure_id -> tbl_measures.measure_id |
| tbl_budget_fact | category_id -> core_unit_cost_category.category_id; phase_id -> tbl_phase.phase_id; project_id -> tbl_project.project_id; source_doc_id -> core_doc.doc_id |
| tbl_budget_items | actual_period_id -> tbl_calculation_period.period_id; project_id -> tbl_project.project_id; structure_id -> tbl_budget_structure.structure_id |
| tbl_budget_structure | measure_id -> tbl_measures.measure_id |
| tbl_budget_timing | fact_id -> core_fin_fact_budget.fact_id; period_id -> tbl_calculation_period.period_id |
| tbl_calculation_period | project_id -> tbl_project.project_id |
| tbl_cap_rate_comps | income_approach_id -> tbl_income_approach.income_approach_id |
| tbl_capex_reserve | project_id -> tbl_project.project_id |
| tbl_capital_call | period_id -> tbl_calculation_period.period_id; project_id -> tbl_project.project_id |
| tbl_capital_reserves | project_id -> tbl_project.project_id; trigger_lease_id -> tbl_rent_roll.rent_roll_id |
| tbl_capitalization | project_id -> tbl_project.project_id |
| tbl_cashflow | lease_id -> tbl_lease.lease_id; lot_id -> tbl_lot.lot_id; parcel_id -> tbl_parcel.parcel_id; phase_id -> tbl_phase.phase_id; project_id -> tbl_project.project_id |
| tbl_cashflow_summary | project_id -> tbl_project.project_id |
| tbl_closing_event | sale_event_id -> tbl_parcel_sale_event.sale_event_id |
| tbl_commercial_lease | income_property_id -> tbl_income_property.income_property_id; space_id -> tbl_space.space_id; tenant_id -> tbl_tenant.tenant_id |
| tbl_contact | cabinet_id -> tbl_cabinet.cabinet_id |
| tbl_contact_relationship | cabinet_id -> tbl_cabinet.cabinet_id; contact_id -> tbl_contact.contact_id; related_to_id -> tbl_contact.contact_id |
| tbl_contact_role | cabinet_id -> tbl_cabinet.cabinet_id |
| tbl_contacts_legacy | project_id -> tbl_project.project_id |
| tbl_cost_allocation | container_id -> tbl_division.division_id; finance_structure_id -> tbl_finance_structure.finance_structure_id; scenario_id -> tbl_scenario.scenario_id |
| tbl_cost_approach | project_id -> tbl_project.project_id |
| tbl_cost_approach_depreciation | project_id -> tbl_project.project_id |
| tbl_dcf_analysis | cost_inflation_set_id -> core_fin_growth_rate_sets.set_id; expense_growth_set_id -> core_fin_growth_rate_sets.set_id; income_growth_set_id -> core_fin_growth_rate_sets.set_id; price_growth_set_id -> core_fin_growth_rate_sets.set_id; project_id -> tbl_project.project_id |
| tbl_debt_draw_schedule | loan_id -> tbl_loan.loan_id; period_id -> tbl_calculation_period.period_id |
| tbl_division | parent_division_id -> tbl_division.division_id; project_id -> tbl_project.project_id |
| tbl_document_project | document_id -> core_doc.doc_id; project_id -> tbl_project.project_id |
| tbl_dynamic_column_definition | created_by_id -> auth_user.id; project_id -> tbl_project.project_id; proposed_from_document_id -> core_doc.doc_id |
| tbl_dynamic_column_value | column_definition_id -> tbl_dynamic_column_definition.id; extracted_from_id -> core_doc.doc_id |
| tbl_equity | project_id -> tbl_project.project_id |
| tbl_equity_distribution | partner_id -> tbl_equity_partner.partner_id; period_id -> tbl_calculation_period.period_id |
| tbl_equity_partner | project_id -> tbl_project.project_id |
| tbl_equity_structure | project_id -> tbl_project.project_id |
| tbl_escalation | lease_id -> tbl_lease.lease_id |
| tbl_expansion_option | exercised_space_id -> tbl_space.space_id; lease_id -> tbl_lease.lease_id; target_space_id -> tbl_space.space_id |
| tbl_expense_detail | expense_id -> tbl_operating_expense.expense_id; project_id -> tbl_project.project_id |
| tbl_expense_recovery | lease_id -> tbl_commercial_lease.lease_id |
| tbl_extraction_job | created_by_id -> auth_user.id |
| tbl_extraction_log | mapping_id -> tbl_extraction_mapping.mapping_id |
| tbl_finance_structure | project_id -> tbl_project.project_id; scenario_id -> tbl_scenario.scenario_id |
| tbl_global_benchmark_registry | source_document_id -> core_doc.doc_id; source_project_id -> tbl_project.project_id |
| tbl_hbu_analysis | legal_zoning_source_doc_id -> core_doc.doc_id; project_id -> tbl_project.project_id |
| tbl_hbu_comparable_use | hbu_id -> tbl_hbu_analysis.hbu_id |
| tbl_hbu_zoning_document | document_id -> core_doc.doc_id; hbu_id -> tbl_hbu_analysis.hbu_id |
| tbl_income_approach | project_id -> tbl_project.project_id |
| tbl_income_property | parcel_id -> tbl_parcel.parcel_id; project_id -> tbl_project.project_id |
| tbl_income_property_ind_ext | income_property_id -> tbl_income_property.income_property_id |
| tbl_income_property_mf_ext | income_property_id -> tbl_income_property.income_property_id |
| tbl_income_property_ret_ext | income_property_id -> tbl_income_property.income_property_id |
| tbl_inventory_item | container_id -> tbl_division.division_id; family_id -> lu_family.family_id; product_id -> res_lot_product.product_id; project_id -> tbl_project.project_id; type_id -> lu_type.type_id |
| tbl_land_comp_adjustments | land_comparable_id -> tbl_land_comparables.land_comparable_id |
| tbl_land_comparables | project_id -> tbl_project.project_id |
| tbl_landuse | type_id -> lu_type.type_id |
| tbl_lease | lot_id -> tbl_lot.lot_id; parcel_id -> tbl_parcel.parcel_id; project_id -> tbl_project.project_id |
| tbl_lease_assumptions | project_id -> tbl_project.project_id |
| tbl_lease_ind_ext | lease_id -> tbl_lease.lease_id |
| tbl_lease_mf_ext | lease_id -> tbl_lease.lease_id |
| tbl_lease_ret_ext | lease_id -> tbl_lease.lease_id |
| tbl_lease_revenue_timing | lease_id -> tbl_rent_roll.rent_roll_id; project_id -> tbl_project.project_id |
| tbl_leasing_commission | lease_id -> tbl_lease.lease_id |
| tbl_loan | maturity_period_id -> tbl_calculation_period.period_id; project_id -> tbl_project.project_id; takes_out_loan_id -> tbl_loan.loan_id |
| tbl_loan_container | division_id -> tbl_division.division_id; loan_id -> tbl_loan.loan_id |
| tbl_loan_finance_structure | finance_structure_id -> tbl_finance_structure.finance_structure_id; loan_id -> tbl_loan.loan_id |
| tbl_lot | parcel_id -> tbl_parcel.parcel_id; phase_id -> tbl_phase.phase_id; project_id -> tbl_project.project_id |
| tbl_market_rate_analysis | project_id -> tbl_project.project_id |
| tbl_milestone | phase_id -> tbl_phase.phase_id; predecessor_milestone_id -> tbl_milestone.milestone_id; project_id -> tbl_project.project_id; source_doc_id -> core_doc.doc_id |
| tbl_multifamily_lease | unit_id -> tbl_multifamily_unit.unit_id |
| tbl_multifamily_property | project_id -> tbl_project.project_id |
| tbl_multifamily_turn | unit_id -> tbl_multifamily_unit.unit_id |
| tbl_multifamily_unit | project_id -> tbl_project.project_id |
| tbl_multifamily_unit_type | container_id -> tbl_division.division_id; project_id -> tbl_project.project_id |
| tbl_narrative_change | version_id -> tbl_narrative_version.id |
| tbl_narrative_comment | version_id -> tbl_narrative_version.id |
| tbl_operating_expense | parcel_id -> tbl_parcel.parcel_id; project_id -> tbl_project.project_id |
| tbl_operating_expenses | account_id -> tbl_opex_accounts_deprecated.account_id; category_id -> core_unit_cost_category.category_id; project_id -> tbl_project.project_id |
| tbl_operations_user_inputs | category_id -> core_unit_cost_category.category_id; project_id -> tbl_project.project_id |
| tbl_opex_accounts_deprecated | parent_account_id -> tbl_opex_accounts_deprecated.account_id |
| tbl_opex_timing | opex_id -> tbl_operating_expenses.opex_id; project_id -> tbl_project.project_id |
| tbl_parcel | area_id -> tbl_area.area_id; density_code -> density_classification.code; landuse_code -> tbl_landuse.landuse_code; lot_type_id -> tbl_lot_type.producttype_id; phase_id -> tbl_phase.phase_id |
| tbl_parcel_sale_assumptions | parcel_id -> tbl_parcel.parcel_id |
| tbl_parcel_sale_event | project_id -> tbl_project.project_id |
| tbl_participation_payment | project_id -> tbl_project.project_id; settlement_id -> tbl_sale_settlement.settlement_id |
| tbl_percentage_rent | lease_id -> tbl_commercial_lease.lease_id |
| tbl_phase | area_id -> tbl_area.area_id |
| tbl_platform_knowledge_chapters | document_id -> tbl_platform_knowledge.id |
| tbl_platform_knowledge_chunks | chapter_id -> tbl_platform_knowledge_chapters.id; document_id -> tbl_platform_knowledge.id |
| tbl_project | cabinet_id -> tbl_cabinet.cabinet_id; created_by_id -> auth_user.id; dms_template_id -> dms_templates.template_id; msa_id -> tbl_msa.msa_id; template_id -> tbl_property_use_template.template_id |
| tbl_project_assumption | project_id -> tbl_project.project_id; source_doc_id -> core_doc.doc_id |
| tbl_project_config | project_id -> tbl_project.project_id |
| tbl_project_contact | contact_id -> tbl_contact.contact_id; project_id -> tbl_project.project_id; role_id -> tbl_contact_role.role_id |
| tbl_project_inventory_columns | project_id -> tbl_project.project_id |
| tbl_project_metrics | project_id -> tbl_project.project_id |
| tbl_project_settings | project_id -> tbl_project.project_id |
| tbl_property_acquisition | project_id -> tbl_project.project_id |
| tbl_property_apn | project_id -> tbl_project.project_id |
| tbl_recovery | lease_id -> tbl_lease.lease_id |
| tbl_renewal_option | lease_id -> tbl_lease.lease_id |
| tbl_rent_comparable | project_id -> tbl_project.project_id |
| tbl_rent_concession | lease_id -> tbl_lease.lease_id |
| tbl_rent_escalation | lease_id -> tbl_commercial_lease.lease_id |
| tbl_rent_roll | project_id -> tbl_project.project_id |
| tbl_rent_roll_unit | project_id -> tbl_project.project_id |
| tbl_rent_schedule | lease_id -> tbl_commercial_lease.lease_id |
| tbl_rent_step | lease_id -> tbl_lease.lease_id |
| tbl_rental_comparable | project_id -> tbl_project.project_id |
| tbl_revenue_other | project_id -> tbl_project.project_id |
| tbl_revenue_rent | project_id -> tbl_project.project_id |
| tbl_revenue_timing | absorption_id -> tbl_absorption_schedule.absorption_id; period_id -> tbl_calculation_period.period_id |
| tbl_sale_benchmarks | project_id -> tbl_project.project_id |
| tbl_sale_phases | project_id -> tbl_project.project_id |
| tbl_sale_settlement | container_id -> tbl_division.division_id; project_id -> tbl_project.project_id |
| tbl_sales_comp_adjustments | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_contacts | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_history | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_hospitality | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_industrial | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_land | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_manufactured | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_market_conditions | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_office | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_retail | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_self_storage | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_specialty_housing | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_storage_unit_mix | storage_comp_id -> tbl_sales_comp_self_storage.storage_id |
| tbl_sales_comp_tenants | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comp_unit_mix | comparable_id -> tbl_sales_comparables.comparable_id |
| tbl_sales_comparables | project_id -> tbl_project.project_id |
| tbl_scenario | cloned_from_scenario_id -> tbl_scenario.scenario_id; created_by -> auth_user.id; project_id -> tbl_project.project_id |
| tbl_scenario_comparison | project_id -> tbl_project.project_id |
| tbl_scenario_log | parent_scenario_id -> tbl_scenario_log.scenario_log_id; project_id -> tbl_project.project_id; thread_id -> landscaper_chat_thread.id |
| tbl_security_deposit | lease_id -> tbl_lease.lease_id |
| tbl_space | income_property_id -> tbl_income_property.income_property_id |
| tbl_space_ind_ext | space_id -> tbl_space.space_id |
| tbl_space_mf_ext | space_id -> tbl_space.space_id |
| tbl_space_ret_ext | space_id -> tbl_space.space_id |
| tbl_system_picklist | parent_id -> tbl_system_picklist.picklist_id |
| tbl_template_column_config | template_id -> tbl_property_use_template.template_id |
| tbl_tenant_improvement | lease_id -> tbl_lease.lease_id |
| tbl_termination_option | lease_id -> tbl_lease.lease_id |
| tbl_user_landscaper_profile | user_id -> auth_user.id |
| tbl_user_preference | user_id -> auth_user.id |
| tbl_vacancy_assumption | project_id -> tbl_project.project_id |
| tbl_valuation_reconciliation | project_id -> tbl_project.project_id |
| tbl_value_add_assumptions | project_id -> tbl_project.project_id |
| tbl_waterfall | project_id -> tbl_project.project_id |
| tbl_waterfall_tier | equity_structure_id -> tbl_equity_structure.equity_structure_id |
| tester_feedback | duplicate_of_id -> tester_feedback.id; user_id -> auth_user.id |
| type_lot_product | product_id -> res_lot_product.product_id; type_id -> lu_type.type_id |
| user_profile | user_id -> auth_user.id |

## Group: tbl_

## tbl_absorption_schedule
**Row Count (estimated):** 1
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| absorption_id | bigint | NO | nextval('tbl_absorption_schedule_absorption_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| area_id | bigint | YES | — | tbl_area.area_id |
| phase_id | bigint | YES | — | tbl_phase.phase_id |
| parcel_id | bigint | YES | — | tbl_parcel.parcel_id |
| revenue_stream_name | character varying(200) | NO | — | — |
| revenue_category | character varying(100) | YES | — | — |
| lu_family_name | character varying(100) | YES | — | — |
| lu_type_code | character varying(50) | YES | — | — |
| product_code | character varying(100) | YES | — | — |
| start_period | integer | YES | — | — |
| periods_to_complete | integer | YES | — | — |
| timing_method | character varying(50) | YES | 'ABSOLUTE'::character varying | — |
| units_per_period | numeric(8,2) | YES | — | — |
| total_units | integer | YES | — | — |
| base_price_per_unit | numeric(12,2) | YES | — | — |
| price_escalation_pct | numeric(6,5) | YES | 0 | — |
| scenario_name | character varying(100) | YES | 'Base Case'::character varying | — |
| probability_weight | numeric(5,4) | YES | 1.0 | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| scenario_id | integer | YES | — | tbl_scenario.scenario_id |

**Indexes:**
- `idx_absorption_parcel` — `CREATE INDEX idx_absorption_parcel ON landscape.tbl_absorption_schedule USING btree (parcel_id)`
- `idx_absorption_phase` — `CREATE INDEX idx_absorption_phase ON landscape.tbl_absorption_schedule USING btree (phase_id)`
- `idx_absorption_product` — `CREATE INDEX idx_absorption_product ON landscape.tbl_absorption_schedule USING btree (product_code)`
- `idx_absorption_project_period` — `CREATE INDEX idx_absorption_project_period ON landscape.tbl_absorption_schedule USING btree (project_id, start_period)`
- `idx_absorption_scenario` — `CREATE INDEX idx_absorption_scenario ON landscape.tbl_absorption_schedule USING btree (scenario_id)`
- `tbl_absorption_schedule_pkey` — `CREATE UNIQUE INDEX tbl_absorption_schedule_pkey ON landscape.tbl_absorption_schedule USING btree (absorption_id)`

**Check Constraints:**
- `CHECK (((probability_weight >= (0)::numeric) AND (probability_weight <= (1)::numeric)))`
- `CHECK (((timing_method)::text = ANY ((ARRAY['ABSOLUTE'::character varying, 'DEPENDENT'::character varying, 'MANUAL'::character varying])::text[])))`

## tbl_acquisition
**Row Count (estimated):** 7
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| acquisition_id | integer | NO | nextval('tbl_acquisition_acquisition_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| contact_id | integer | YES | — | tbl_contacts_legacy.contact_id |
| event_date | date | YES | — | — |
| event_type | character varying(100) | YES | — | — |
| description | text | YES | — | — |
| amount | numeric(15,2) | YES | — | — |
| is_applied_to_purchase | boolean | YES | true | — |
| units_conveyed | numeric(10,2) | YES | — | — |
| measure_id | integer | YES | — | tbl_measures.measure_id |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| goes_hard_date | date | YES | — | — |
| is_conditional | boolean | YES | false | — |
| category_id | integer | YES | — | core_unit_cost_category.category_id |
| subcategory_id | integer | YES | — | core_unit_cost_category.category_id |

**Indexes:**
- `idx_acquisition_category_id` — `CREATE INDEX idx_acquisition_category_id ON landscape.tbl_acquisition USING btree (category_id)`
- `idx_acquisition_contact_id` — `CREATE INDEX idx_acquisition_contact_id ON landscape.tbl_acquisition USING btree (contact_id)`
- `idx_acquisition_project_id` — `CREATE INDEX idx_acquisition_project_id ON landscape.tbl_acquisition USING btree (project_id)`
- `idx_acquisition_subcategory_id` — `CREATE INDEX idx_acquisition_subcategory_id ON landscape.tbl_acquisition USING btree (subcategory_id)`
- `idx_tbl_acquisition_category_id` — `CREATE INDEX idx_tbl_acquisition_category_id ON landscape.tbl_acquisition USING btree (category_id)`
- `idx_tbl_acquisition_subcategory_id` — `CREATE INDEX idx_tbl_acquisition_subcategory_id ON landscape.tbl_acquisition USING btree (subcategory_id)`
- `tbl_acquisition_pkey` — `CREATE UNIQUE INDEX tbl_acquisition_pkey ON landscape.tbl_acquisition USING btree (acquisition_id)`

## tbl_acquisition_backup_20260202
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| acquisition_id | integer | YES | — | — |
| project_id | integer | YES | — | — |
| contact_id | integer | YES | — | — |
| event_date | date | YES | — | — |
| event_type | character varying(100) | YES | — | — |
| description | text | YES | — | — |
| amount | numeric(15,2) | YES | — | — |
| is_applied_to_purchase | boolean | YES | — | — |
| units_conveyed | numeric(10,2) | YES | — | — |
| measure_id | integer | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | — | — |
| updated_at | timestamp without time zone | YES | — | — |
| goes_hard_date | date | YES | — | — |
| is_conditional | boolean | YES | — | — |
| category_id | integer | YES | — | — |
| subcategory_id | integer | YES | — | — |

**Indexes:** none

## tbl_acreage_allocation
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| allocation_id | integer | NO | nextval('tbl_acreage_allocation_allocation_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| phase_id | bigint | YES | — | tbl_phase.phase_id |
| parcel_id | bigint | YES | — | tbl_parcel.parcel_id |
| allocation_type_id | integer | YES | — | lu_acreage_allocation_type.allocation_type_id |
| allocation_type_code | character varying(50) | YES | — | — |
| acres | numeric(12,4) | NO | — | — |
| source_doc_id | bigint | YES | — | core_doc.doc_id |
| source_page | integer | YES | — | — |
| source_snippet | text | YES | — | — |
| confidence_score | numeric(3,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |

**Indexes:**
- `idx_acreage_project` — `CREATE INDEX idx_acreage_project ON landscape.tbl_acreage_allocation USING btree (project_id)`
- `idx_acreage_project_phase` — `CREATE INDEX idx_acreage_project_phase ON landscape.tbl_acreage_allocation USING btree (project_id, phase_id)`
- `idx_acreage_project_type` — `CREATE INDEX idx_acreage_project_type ON landscape.tbl_acreage_allocation USING btree (project_id, allocation_type_code)`
- `idx_acreage_type` — `CREATE INDEX idx_acreage_type ON landscape.tbl_acreage_allocation USING btree (allocation_type_code)`
- `tbl_acreage_allocation_pkey` — `CREATE UNIQUE INDEX tbl_acreage_allocation_pkey ON landscape.tbl_acreage_allocation USING btree (allocation_id)`

**Check Constraints:**
- `CHECK ((acres >= (0)::numeric))`

## tbl_additional_income
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| additional_income_id | integer | NO | — | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| parking_spaces | integer | YES | 0 | — |
| parking_rate_monthly | numeric(10,2) | YES | — | — |
| parking_annual | numeric(15,2) | YES | — | — |
| other_income | jsonb | YES | '[]'::jsonb | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_additional_income_lease` — `CREATE INDEX idx_additional_income_lease ON landscape.tbl_additional_income USING btree (lease_id)`
- `tbl_additional_income_pkey` — `CREATE UNIQUE INDEX tbl_additional_income_pkey ON landscape.tbl_additional_income USING btree (additional_income_id)`
- `uq_additional_income_lease` — `CREATE UNIQUE INDEX uq_additional_income_lease ON landscape.tbl_additional_income USING btree (lease_id)`

## tbl_ai_adjustment_suggestions
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| ai_suggestion_id | integer | NO | nextval('tbl_ai_adjustment_suggestions_ai_suggestion_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| adjustment_type | character varying(50) | NO | — | — |
| suggested_pct | numeric(7,4) | YES | — | — |
| confidence_level | character varying(20) | YES | — | — |
| justification | text | YES | — | — |
| model_version | character varying(50) | YES | — | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_ai_suggestions_comparable` — `CREATE INDEX idx_ai_suggestions_comparable ON landscape.tbl_ai_adjustment_suggestions USING btree (comparable_id)`
- `idx_ai_suggestions_type` — `CREATE INDEX idx_ai_suggestions_type ON landscape.tbl_ai_adjustment_suggestions USING btree (adjustment_type)`
- `tbl_ai_adjustment_suggestions_comparable_id_adjustment_type_key` — `CREATE UNIQUE INDEX tbl_ai_adjustment_suggestions_comparable_id_adjustment_type_key ON landscape.tbl_ai_adjustment_suggestions USING btree (comparable_id, adjustment_type)`
- `tbl_ai_adjustment_suggestions_pkey` — `CREATE UNIQUE INDEX tbl_ai_adjustment_suggestions_pkey ON landscape.tbl_ai_adjustment_suggestions USING btree (ai_suggestion_id)`

**Check Constraints:**
- `CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'none'::character varying])::text[])))`

## tbl_alpha_feedback
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('tbl_alpha_feedback_id_seq'::regclass) | — |
| page_context | character varying(100) | YES | — | — |
| project_id | integer | YES | — | — |
| user_id | integer | YES | — | — |
| feedback | text | NO | — | — |
| status | character varying(50) | YES | 'new'::character varying | — |
| notes | text | YES | — | — |
| submitted_at | timestamp without time zone | YES | now() | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_alpha_feedback_page` — `CREATE INDEX idx_alpha_feedback_page ON landscape.tbl_alpha_feedback USING btree (page_context)`
- `idx_alpha_feedback_status` — `CREATE INDEX idx_alpha_feedback_status ON landscape.tbl_alpha_feedback USING btree (status)`
- `idx_alpha_feedback_submitted` — `CREATE INDEX idx_alpha_feedback_submitted ON landscape.tbl_alpha_feedback USING btree (submitted_at)`
- `tbl_alpha_feedback_pkey` — `CREATE UNIQUE INDEX tbl_alpha_feedback_pkey ON landscape.tbl_alpha_feedback USING btree (id)`

## tbl_analysis_type_config
**Row Count (estimated):** 9
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| config_id | bigint | NO | nextval('tbl_analysis_type_config_config_id_seq'::regclass) | — |
| analysis_type | character varying(50) | NO | — | — |
| tile_valuation | boolean | YES | false | — |
| tile_capitalization | boolean | YES | false | — |
| tile_returns | boolean | YES | false | — |
| tile_development_budget | boolean | YES | false | — |
| requires_capital_stack | boolean | YES | false | — |
| requires_comparable_sales | boolean | YES | false | — |
| requires_income_approach | boolean | YES | false | — |
| requires_cost_approach | boolean | YES | false | — |
| available_reports | jsonb | YES | '[]'::jsonb | — |
| landscaper_context | text | YES | — | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| analysis_perspective | character varying(50) | YES | — | — |
| analysis_purpose | character varying(50) | YES | — | — |

**Indexes:**
- `idx_analysis_config_perspective_purpose` — `CREATE INDEX idx_analysis_config_perspective_purpose ON landscape.tbl_analysis_type_config USING btree (analysis_perspective, analysis_purpose)`
- `tbl_analysis_type_config_pkey` — `CREATE UNIQUE INDEX tbl_analysis_type_config_pkey ON landscape.tbl_analysis_type_config USING btree (config_id)`
- `uq_analysis_config_perspective_purpose` — `CREATE UNIQUE INDEX uq_analysis_config_perspective_purpose ON landscape.tbl_analysis_type_config USING btree (analysis_perspective, analysis_purpose)`

**Check Constraints:**
- `CHECK (((analysis_perspective IS NULL) OR ((analysis_perspective)::text = ANY ((ARRAY['INVESTMENT'::character varying, 'DEVELOPMENT'::character varying])::text[]))))`
- `CHECK (((analysis_purpose IS NULL) OR ((analysis_purpose)::text = ANY ((ARRAY['VALUATION'::character varying, 'UNDERWRITING'::character varying])::text[]))))`

## tbl_approval
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| approval_id | integer | NO | — | — |
| project_id | integer | YES | — | tbl_project.project_id |
| approval_type | character varying(100) | YES | — | — |
| approval_date | date | YES | — | — |
| notes | text | YES | — | — |

**Indexes:**
- `tbl_approval_pkey` — `CREATE UNIQUE INDEX tbl_approval_pkey ON landscape.tbl_approval USING btree (approval_id)`

## tbl_area
**Row Count (estimated):** 4
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| area_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| area_alias | character varying(255) | NO | — | — |
| area_no | integer | YES | — | — |

**Indexes:**
- `tbl_planarea_pkey` — `CREATE UNIQUE INDEX tbl_planarea_pkey ON landscape.tbl_area USING btree (area_id)`
- `ux_planarea_project_area` — `CREATE UNIQUE INDEX ux_planarea_project_area ON landscape.tbl_area USING btree (project_id, area_no) WHERE (area_no IS NOT NULL)`

## tbl_assumption_snapshot
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| snapshot_id | bigint | NO | nextval('tbl_assumption_snapshot_snapshot_id_seq'::regclass) | — |
| scenario_log_id | bigint | NO | — | tbl_scenario_log.scenario_log_id |
| field | character varying(100) | NO | — | — |
| table_name | character varying(100) | NO | — | — |
| record_id | character varying(100) | YES | — | — |
| original_value | jsonb | YES | — | — |
| override_value | jsonb | YES | — | — |
| label | character varying(200) | YES | — | — |
| unit | character varying(30) | YES | — | — |
| applied_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `idx_assumption_snapshot_field` — `CREATE INDEX idx_assumption_snapshot_field ON landscape.tbl_assumption_snapshot USING btree (field, table_name)`
- `idx_assumption_snapshot_scenario` — `CREATE INDEX idx_assumption_snapshot_scenario ON landscape.tbl_assumption_snapshot USING btree (scenario_log_id)`
- `tbl_assumption_snapshot_pkey` — `CREATE UNIQUE INDEX tbl_assumption_snapshot_pkey ON landscape.tbl_assumption_snapshot USING btree (snapshot_id)`

## tbl_assumptionrule
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| rule_id | integer | NO | — | — |
| rule_category | character varying(50) | YES | — | — |
| rule_key | character varying(100) | YES | — | — |
| rule_value | text | YES | — | — |

**Indexes:**
- `tbl_assumptionrule_pkey` — `CREATE UNIQUE INDEX tbl_assumptionrule_pkey ON landscape.tbl_assumptionrule USING btree (rule_id)`

## tbl_base_rent
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| base_rent_id | integer | NO | — | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| period_number | integer | NO | — | — |
| period_start_date | date | NO | — | — |
| period_end_date | date | NO | — | — |
| rent_type | character varying(50) | YES | 'Fixed'::character varying | — |
| base_rent_psf_annual | numeric(10,2) | YES | — | — |
| base_rent_annual | numeric(15,2) | YES | — | — |
| base_rent_monthly | numeric(15,2) | YES | — | — |
| percentage_rent_rate | numeric(5,2) | YES | — | — |
| percentage_rent_breakpoint | numeric(15,2) | YES | — | — |
| percentage_rent_annual | numeric(15,2) | YES | — | — |
| free_rent_months | integer | YES | 0 | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_base_rent_dates` — `CREATE INDEX idx_base_rent_dates ON landscape.tbl_base_rent USING btree (period_start_date, period_end_date)`
- `idx_base_rent_lease` — `CREATE INDEX idx_base_rent_lease ON landscape.tbl_base_rent USING btree (lease_id)`
- `tbl_base_rent_pkey` — `CREATE UNIQUE INDEX tbl_base_rent_pkey ON landscape.tbl_base_rent USING btree (base_rent_id)`
- `uq_base_rent_lease_period` — `CREATE UNIQUE INDEX uq_base_rent_lease_period ON landscape.tbl_base_rent USING btree (lease_id, period_number)`

**Check Constraints:**
- `CHECK ((period_end_date >= period_start_date))`

## tbl_benchmark_ai_suggestions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| suggestion_id | bigint | NO | nextval('tbl_benchmark_ai_suggestions_suggestion_id_seq'::regclass) | — |
| user_id | text | NO | — | — |
| document_id | bigint | NO | — | core_doc.doc_id |
| project_id | bigint | YES | — | tbl_project.project_id |
| extraction_date | timestamp without time zone | YES | now() | — |
| category | character varying(50) | NO | — | — |
| subcategory | character varying(100) | YES | — | — |
| suggested_name | character varying(200) | NO | — | — |
| suggested_value | numeric(12,4) | NO | — | — |
| suggested_uom | character varying(20) | YES | — | — |
| market_geography | character varying(100) | YES | — | — |
| property_type | character varying(50) | YES | — | — |
| confidence_score | numeric(3,2) | YES | — | — |
| extraction_context | jsonb | YES | — | — |
| existing_benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| variance_percentage | numeric(6,2) | YES | — | — |
| inflation_adjusted_comparison | jsonb | YES | — | — |
| status | character varying(20) | YES | 'pending'::character varying | — |
| user_response | jsonb | YES | — | — |
| reviewed_at | timestamp without time zone | YES | — | — |
| reviewed_by | text | YES | — | — |
| created_benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_ai_suggestion_category` — `CREATE INDEX idx_ai_suggestion_category ON landscape.tbl_benchmark_ai_suggestions USING btree (category)`
- `idx_ai_suggestion_document` — `CREATE INDEX idx_ai_suggestion_document ON landscape.tbl_benchmark_ai_suggestions USING btree (document_id)`
- `idx_ai_suggestion_extraction_date` — `CREATE INDEX idx_ai_suggestion_extraction_date ON landscape.tbl_benchmark_ai_suggestions USING btree (extraction_date)`
- `idx_ai_suggestion_status` — `CREATE INDEX idx_ai_suggestion_status ON landscape.tbl_benchmark_ai_suggestions USING btree (status)`
- `idx_ai_suggestion_user` — `CREATE INDEX idx_ai_suggestion_user ON landscape.tbl_benchmark_ai_suggestions USING btree (user_id)`
- `tbl_benchmark_ai_suggestions_pkey` — `CREATE UNIQUE INDEX tbl_benchmark_ai_suggestions_pkey ON landscape.tbl_benchmark_ai_suggestions USING btree (suggestion_id)`

**Check Constraints:**
- `CHECK (((category)::text = ANY ((ARRAY['growth_rate'::character varying, 'transaction_cost'::character varying, 'unit_cost'::character varying, 'absorption'::character varying, 'contingency'::character varying, 'market_timing'::character varying, 'land_use_pricing'::character varying, 'commission'::character varying, 'op_cost'::character varying, 'income'::character varying, 'capital_stack'::character varying, 'debt_standard'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'modified'::character varying])::text[])))`

## tbl_benchmark_contingency
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| benchmark_id | integer | NO | — | tbl_global_benchmark_registry.benchmark_id |
| percentage | numeric(5,2) | NO | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_benchmark_contingency_benchmark_id` — `CREATE INDEX idx_benchmark_contingency_benchmark_id ON landscape.tbl_benchmark_contingency USING btree (benchmark_id)`
- `tbl_benchmark_contingency_pkey` — `CREATE UNIQUE INDEX tbl_benchmark_contingency_pkey ON landscape.tbl_benchmark_contingency USING btree (benchmark_id)`

**Check Constraints:**
- `CHECK (((percentage >= (0)::numeric) AND (percentage <= (100)::numeric)))`

## tbl_benchmark_transaction_cost
**Row Count (estimated):** 7
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| transaction_cost_id | bigint | NO | nextval('tbl_benchmark_transaction_cost_transaction_cost_id_seq'::regclass) | — |
| benchmark_id | bigint | NO | — | tbl_global_benchmark_registry.benchmark_id |
| cost_type | character varying(50) | NO | — | — |
| value | numeric(12,2) | YES | — | — |
| value_type | character varying(20) | NO | — | — |
| basis | character varying(50) | YES | — | — |
| deal_size_min | numeric(12,2) | YES | — | — |
| deal_size_max | numeric(12,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_transaction_cost_benchmark` — `CREATE INDEX idx_transaction_cost_benchmark ON landscape.tbl_benchmark_transaction_cost USING btree (benchmark_id)`
- `idx_transaction_cost_type` — `CREATE INDEX idx_transaction_cost_type ON landscape.tbl_benchmark_transaction_cost USING btree (cost_type)`
- `tbl_benchmark_transaction_cost_pkey` — `CREATE UNIQUE INDEX tbl_benchmark_transaction_cost_pkey ON landscape.tbl_benchmark_transaction_cost USING btree (transaction_cost_id)`

**Check Constraints:**
- `CHECK (((value_type)::text = ANY ((ARRAY['percentage'::character varying, 'flat_fee'::character varying, 'per_unit'::character varying])::text[])))`

## tbl_benchmark_unit_cost
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| unit_cost_id | bigint | NO | nextval('tbl_benchmark_unit_cost_unit_cost_id_seq'::regclass) | — |
| benchmark_id | bigint | NO | — | tbl_global_benchmark_registry.benchmark_id |
| value | numeric(12,2) | NO | — | — |
| uom_code | character varying(20) | NO | — | — |
| uom_alt_code | character varying(20) | YES | — | — |
| low_value | numeric(12,2) | YES | — | — |
| high_value | numeric(12,2) | YES | — | — |
| cost_phase | character varying(50) | YES | — | — |
| work_type | character varying(100) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_unit_cost_benchmark` — `CREATE INDEX idx_unit_cost_benchmark ON landscape.tbl_benchmark_unit_cost USING btree (benchmark_id)`
- `idx_unit_cost_phase` — `CREATE INDEX idx_unit_cost_phase ON landscape.tbl_benchmark_unit_cost USING btree (cost_phase)`
- `idx_unit_cost_work_type` — `CREATE INDEX idx_unit_cost_work_type ON landscape.tbl_benchmark_unit_cost USING btree (work_type)`
- `tbl_benchmark_unit_cost_pkey` — `CREATE UNIQUE INDEX tbl_benchmark_unit_cost_pkey ON landscape.tbl_benchmark_unit_cost USING btree (unit_cost_id)`

## tbl_budget
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| budget_id | integer | NO | — | — |
| devphase_id | integer | YES | — | tbl_phase.phase_id |
| budget_category | text | NO | — | — |
| budget_subcategory | text | YES | — | — |
| amount | numeric | YES | — | — |
| source_table | character varying(50) | YES | — | — |
| source_id | integer | YES | — | — |
| measure_id | integer | YES | — | tbl_measures.measure_id |
| cost_per_unit | numeric(15,2) | YES | — | — |
| quantity | numeric(10,2) | YES | — | — |
| expense_type | character varying(50) | YES | 'Capital'::character varying | — |
| budget_timing_method | character varying(50) | YES | 'Lump Sum'::character varying | — |

**Indexes:**
- `tbl_budget_pkey` — `CREATE UNIQUE INDEX tbl_budget_pkey ON landscape.tbl_budget USING btree (budget_id)`

## tbl_budget_fact
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| budget_fact_id | integer | NO | nextval('tbl_budget_fact_budget_fact_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| phase_id | bigint | YES | — | tbl_phase.phase_id |
| category_id | bigint | YES | — | core_unit_cost_category.category_id |
| category_name | character varying(200) | YES | — | — |
| line_item_name | character varying(200) | YES | — | — |
| total_cost | numeric(15,2) | YES | — | — |
| cost_per_unit | numeric(12,2) | YES | — | — |
| cost_per_sf | numeric(10,2) | YES | — | — |
| quantity | numeric(12,2) | YES | — | — |
| unit_of_measure | character varying(50) | YES | — | — |
| source_doc_id | bigint | YES | — | core_doc.doc_id |
| confidence_score | numeric(3,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |

**Indexes:**
- `idx_budget_fact_category` — `CREATE INDEX idx_budget_fact_category ON landscape.tbl_budget_fact USING btree (category_id)`
- `idx_budget_fact_project` — `CREATE INDEX idx_budget_fact_project ON landscape.tbl_budget_fact USING btree (project_id)`
- `idx_budget_fact_project_category` — `CREATE INDEX idx_budget_fact_project_category ON landscape.tbl_budget_fact USING btree (project_id, category_name)`
- `tbl_budget_fact_pkey` — `CREATE UNIQUE INDEX tbl_budget_fact_pkey ON landscape.tbl_budget_fact USING btree (budget_fact_id)`
- `uq_budget_project_category` — `CREATE UNIQUE INDEX uq_budget_project_category ON landscape.tbl_budget_fact USING btree (project_id, category_name)`

## tbl_budget_items
**Row Count (estimated):** 8
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| budget_item_id | integer | NO | nextval('tbl_budget_items_budget_item_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| structure_id | integer | NO | — | tbl_budget_structure.structure_id |
| amount | numeric(15,2) | YES | — | — |
| quantity | numeric(10,2) | YES | — | — |
| cost_per_unit | numeric(15,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| migrated_at | timestamp with time zone | YES | — | — |
| timing_method | character varying(50) | YES | 'ABSOLUTE'::character varying | — |
| timing_locked | boolean | YES | false | — |
| s_curve_profile | character varying(50) | YES | 'LINEAR'::character varying | — |
| actual_amount | numeric(15,2) | YES | 0 | — |
| actual_quantity | numeric(12,2) | YES | 0 | — |
| actual_period_id | bigint | YES | — | tbl_calculation_period.period_id |
| variance_amount | numeric(15,2) | YES | — | — |
| variance_pct | numeric(6,4) | YES | — | — |
| start_period | integer | YES | — | — |
| periods_to_complete | integer | YES | — | — |

**Indexes:**
- `idx_budget_items_project` — `CREATE INDEX idx_budget_items_project ON landscape.tbl_budget_items USING btree (project_id)`
- `idx_budget_items_structure` — `CREATE INDEX idx_budget_items_structure ON landscape.tbl_budget_items USING btree (structure_id)`
- `idx_budget_items_timing` — `CREATE INDEX idx_budget_items_timing ON landscape.tbl_budget_items USING btree (project_id, start_period, timing_method)`
- `tbl_budget_items_pkey` — `CREATE UNIQUE INDEX tbl_budget_items_pkey ON landscape.tbl_budget_items USING btree (budget_item_id)`

**Check Constraints:**
- `CHECK (((s_curve_profile)::text = ANY ((ARRAY['LINEAR'::character varying, 'FRONT_LOADED'::character varying, 'BACK_LOADED'::character varying, 'BELL_CURVE'::character varying])::text[])))`
- `CHECK (((timing_method)::text = ANY ((ARRAY['ABSOLUTE'::character varying, 'DEPENDENT'::character varying, 'MANUAL'::character varying])::text[])))`

## tbl_budget_structure
**Row Count (estimated):** 27
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| structure_id | integer | NO | nextval('tbl_budget_structure_structure_id_seq'::regclass) | — |
| scope | character varying(100) | NO | — | — |
| category | character varying(100) | NO | — | — |
| detail | character varying(200) | NO | — | — |
| cost_method | character varying(20) | YES | '$$'::character varying | — |
| measure_id | integer | YES | — | tbl_measures.measure_id |
| is_system | boolean | YES | true | — |
| created_by | integer | YES | — | — |
| sort_order | integer | YES | 0 | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| start_period | integer | YES | — | — |
| periods_to_complete | integer | YES | — | — |
| migrated_at | timestamp with time zone | YES | — | — |

**Indexes:**
- `idx_budget_structure_scope` — `CREATE INDEX idx_budget_structure_scope ON landscape.tbl_budget_structure USING btree (scope)`
- `tbl_budget_structure_pkey` — `CREATE UNIQUE INDEX tbl_budget_structure_pkey ON landscape.tbl_budget_structure USING btree (structure_id)`
- `tbl_budget_structure_scope_category_detail_key` — `CREATE UNIQUE INDEX tbl_budget_structure_scope_category_detail_key ON landscape.tbl_budget_structure USING btree (scope, category, detail)`

## tbl_budget_timing
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| timing_id | bigint | NO | — | — |
| fact_id | bigint | NO | — | core_fin_fact_budget.fact_id |
| period_id | bigint | NO | — | tbl_calculation_period.period_id |
| amount | numeric | NO | — | — |
| timing_method | character varying(20) | YES | 'distributed'::character varying | — |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_budget_timing_fact` — `CREATE INDEX idx_budget_timing_fact ON landscape.tbl_budget_timing USING btree (fact_id)`
- `idx_budget_timing_period` — `CREATE INDEX idx_budget_timing_period ON landscape.tbl_budget_timing USING btree (period_id)`
- `tbl_budget_timing_pkey` — `CREATE UNIQUE INDEX tbl_budget_timing_pkey ON landscape.tbl_budget_timing USING btree (timing_id)`
- `uq_budget_timing` — `CREATE UNIQUE INDEX uq_budget_timing ON landscape.tbl_budget_timing USING btree (fact_id, period_id)`

## tbl_cabinet
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| cabinet_id | bigint | NO | nextval('tbl_cabinet_cabinet_id_seq'::regclass) | — |
| cabinet_name | character varying(200) | NO | — | — |
| owner_user_id | text | NO | — | — |
| cabinet_type | character varying(50) | YES | 'standard'::character varying | — |
| settings | jsonb | YES | '{}'::jsonb | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| is_active | boolean | YES | true | — |

**Indexes:**
- `idx_cabinet_active` — `CREATE INDEX idx_cabinet_active ON landscape.tbl_cabinet USING btree (is_active) WHERE (is_active = true)`
- `idx_cabinet_owner` — `CREATE INDEX idx_cabinet_owner ON landscape.tbl_cabinet USING btree (owner_user_id)`
- `tbl_cabinet_pkey` — `CREATE UNIQUE INDEX tbl_cabinet_pkey ON landscape.tbl_cabinet USING btree (cabinet_id)`

**Check Constraints:**
- `CHECK (((cabinet_type)::text = ANY ((ARRAY['standard'::character varying, 'enterprise'::character varying, 'personal'::character varying])::text[])))`

## tbl_calculation_period
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| period_id | bigint | NO | — | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| period_start_date | date | NO | — | — |
| period_end_date | date | NO | — | — |
| period_type | character varying(20) | NO | — | — |
| period_sequence | integer | NO | — | — |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| fiscal_year | integer | YES | — | — |
| fiscal_quarter | integer | YES | — | — |
| period_status | character varying(50) | YES | 'OPEN'::character varying | — |
| closed_date | timestamp without time zone | YES | — | — |
| closed_by_user_id | bigint | YES | — | — |

**Indexes:**
- `idx_calculation_period_project` — `CREATE INDEX idx_calculation_period_project ON landscape.tbl_calculation_period USING btree (project_id, period_sequence)`
- `tbl_calculation_period_pkey` — `CREATE UNIQUE INDEX tbl_calculation_period_pkey ON landscape.tbl_calculation_period USING btree (period_id)`
- `uq_calculation_period_sequence` — `CREATE UNIQUE INDEX uq_calculation_period_sequence ON landscape.tbl_calculation_period USING btree (project_id, period_sequence)`

**Check Constraints:**
- `CHECK (((period_status)::text = ANY ((ARRAY['OPEN'::character varying, 'CLOSED'::character varying, 'LOCKED'::character varying])::text[])))`
- `CHECK ((period_end_date >= period_start_date))`

## tbl_cap_rate_comps
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| cap_rate_comp_id | integer | NO | nextval('tbl_cap_rate_comps_cap_rate_comp_id_seq'::regclass) | — |
| income_approach_id | integer | YES | — | tbl_income_approach.income_approach_id |
| property_address | character varying(255) | YES | — | — |
| sale_price | numeric(15,2) | YES | — | — |
| noi | numeric(12,2) | YES | — | — |
| implied_cap_rate | numeric(5,4) | YES | — | — |
| sale_date | date | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_cap_rate_comps_income_approach` — `CREATE INDEX idx_cap_rate_comps_income_approach ON landscape.tbl_cap_rate_comps USING btree (income_approach_id)`
- `tbl_cap_rate_comps_pkey` — `CREATE UNIQUE INDEX tbl_cap_rate_comps_pkey ON landscape.tbl_cap_rate_comps USING btree (cap_rate_comp_id)`

## tbl_capex_reserve
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| capex_id | bigint | NO | nextval('tbl_capex_reserve_capex_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| capex_per_unit_annual | numeric(8,2) | NO | 300 | — |
| immediate_capex | numeric(12,2) | YES | 0 | — |
| roof_reserve_per_unit | numeric(6,2) | YES | 50 | — |
| hvac_reserve_per_unit | numeric(6,2) | YES | 75 | — |
| appliance_reserve_per_unit | numeric(6,2) | YES | 100 | — |
| other_reserve_per_unit | numeric(6,2) | YES | 75 | — |
| roof_replacement_year | integer | YES | — | — |
| roof_replacement_cost | numeric(12,2) | YES | — | — |
| hvac_replacement_cycle_years | integer | YES | 15 | — |
| hvac_replacement_cost_per_unit | numeric(8,2) | YES | — | — |
| parking_lot_reseal_year | integer | YES | — | — |
| parking_lot_reseal_cost | numeric(10,2) | YES | — | — |
| exterior_paint_cycle_years | integer | YES | 7 | — |
| exterior_paint_cost | numeric(10,2) | YES | — | — |
| elevator_modernization_cost | numeric(10,2) | YES | — | — |
| unit_renovation_per_turn | numeric(8,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_capex_project` — `CREATE INDEX idx_capex_project ON landscape.tbl_capex_reserve USING btree (project_id)`
- `tbl_capex_reserve_pkey` — `CREATE UNIQUE INDEX tbl_capex_reserve_pkey ON landscape.tbl_capex_reserve USING btree (capex_id)`

## tbl_capital_call
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| capital_call_id | bigint | NO | nextval('tbl_capital_call_capital_call_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| period_id | bigint | YES | — | tbl_calculation_period.period_id |
| call_amount | numeric(12,2) | NO | — | — |
| call_date | date | YES | — | — |
| call_purpose | character varying(200) | YES | — | — |
| lp_amount | numeric(12,2) | YES | — | — |
| gp_amount | numeric(12,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_capital_call_project` — `CREATE INDEX idx_capital_call_project ON landscape.tbl_capital_call USING btree (project_id)`
- `tbl_capital_call_pkey` — `CREATE UNIQUE INDEX tbl_capital_call_pkey ON landscape.tbl_capital_call USING btree (capital_call_id)`

## tbl_capital_reserves
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| reserve_id | bigint | NO | nextval('tbl_capital_reserves_reserve_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| reserve_type | character varying(50) | NO | — | — |
| reserve_name | character varying(200) | NO | — | — |
| trigger_type | character varying(50) | NO | — | — |
| trigger_lease_id | bigint | YES | — | tbl_rent_roll.rent_roll_id |
| trigger_period | integer | YES | — | — |
| amount | numeric(12,2) | NO | — | — |
| amount_per_sf | numeric(10,2) | YES | — | — |
| recurrence_frequency_months | integer | YES | — | — |
| recurrence_end_period | integer | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_capital_reserves_lease` — `CREATE INDEX idx_capital_reserves_lease ON landscape.tbl_capital_reserves USING btree (trigger_lease_id)`
- `idx_capital_reserves_project` — `CREATE INDEX idx_capital_reserves_project ON landscape.tbl_capital_reserves USING btree (project_id)`
- `idx_capital_reserves_trigger` — `CREATE INDEX idx_capital_reserves_trigger ON landscape.tbl_capital_reserves USING btree (trigger_type)`
- `idx_capital_reserves_type` — `CREATE INDEX idx_capital_reserves_type ON landscape.tbl_capital_reserves USING btree (reserve_type)`
- `tbl_capital_reserves_pkey` — `CREATE UNIQUE INDEX tbl_capital_reserves_pkey ON landscape.tbl_capital_reserves USING btree (reserve_id)`

**Check Constraints:**
- `CHECK (((reserve_type)::text = ANY ((ARRAY['TI'::character varying, 'LC'::character varying, 'CAPEX'::character varying, 'STRUCTURAL_RESERVE'::character varying])::text[])))`
- `CHECK (((trigger_type)::text = ANY ((ARRAY['LEASE_EXPIRATION'::character varying, 'SCHEDULED'::character varying, 'RECURRING'::character varying, 'IMMEDIATE'::character varying])::text[])))`

## tbl_capitalization
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| capitalization_id | integer | NO | — | — |
| project_id | integer | YES | — | tbl_project.project_id |
| capital_source | text | NO | — | — |
| amount | numeric | YES | — | — |
| notes | text | YES | — | — |

**Indexes:**
- `tbl_capitalization_pkey` — `CREATE UNIQUE INDEX tbl_capitalization_pkey ON landscape.tbl_capitalization USING btree (capitalization_id)`

## tbl_cashflow
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| cashflow_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| period_id | integer | NO | — | — |
| parcel_id | integer | YES | — | tbl_parcel.parcel_id |
| phase_id | integer | YES | — | tbl_phase.phase_id |
| lot_id | integer | YES | — | tbl_lot.lot_id |
| lease_id | integer | YES | — | tbl_lease.lease_id |
| cashflow_category | character varying(100) | NO | — | — |
| cashflow_subcategory | character varying(100) | YES | — | — |
| amount | numeric(15,2) | NO | — | — |
| cumulative_amount | numeric(15,2) | YES | — | — |
| calculation_method | character varying(50) | YES | — | — |
| source_table | character varying(100) | YES | — | — |
| source_id | integer | YES | — | — |
| calculated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_cashflow_category` — `CREATE INDEX idx_cashflow_category ON landscape.tbl_cashflow USING btree (cashflow_category)`
- `idx_cashflow_lease` — `CREATE INDEX idx_cashflow_lease ON landscape.tbl_cashflow USING btree (lease_id, period_id)`
- `idx_cashflow_parcel` — `CREATE INDEX idx_cashflow_parcel ON landscape.tbl_cashflow USING btree (parcel_id, period_id)`
- `idx_cashflow_phase` — `CREATE INDEX idx_cashflow_phase ON landscape.tbl_cashflow USING btree (phase_id, period_id)`
- `idx_cashflow_project_period` — `CREATE INDEX idx_cashflow_project_period ON landscape.tbl_cashflow USING btree (project_id, period_id)`
- `tbl_cashflow_pkey` — `CREATE UNIQUE INDEX tbl_cashflow_pkey ON landscape.tbl_cashflow USING btree (cashflow_id)`

## tbl_cashflow_summary
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| summary_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| period_id | integer | NO | — | — |
| gross_revenue | numeric(15,2) | YES | 0 | — |
| vacancy_loss | numeric(15,2) | YES | 0 | — |
| credit_loss | numeric(15,2) | YES | 0 | — |
| effective_gross_income | numeric(15,2) | YES | 0 | — |
| operating_expenses | numeric(15,2) | YES | 0 | — |
| net_operating_income | numeric(15,2) | YES | 0 | — |
| capital_expenditures | numeric(15,2) | YES | 0 | — |
| tenant_improvements | numeric(15,2) | YES | 0 | — |
| leasing_commissions | numeric(15,2) | YES | 0 | — |
| debt_service | numeric(15,2) | YES | 0 | — |
| interest_expense | numeric(15,2) | YES | 0 | — |
| principal_payment | numeric(15,2) | YES | 0 | — |
| cash_flow_before_tax | numeric(15,2) | YES | 0 | — |
| equity_contributions | numeric(15,2) | YES | 0 | — |
| equity_distributions | numeric(15,2) | YES | 0 | — |
| net_cash_flow | numeric(15,2) | YES | 0 | — |
| cumulative_net_cash_flow | numeric(15,2) | YES | 0 | — |
| calculated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_summary_project_period` — `CREATE INDEX idx_summary_project_period ON landscape.tbl_cashflow_summary USING btree (project_id, period_id)`
- `tbl_cashflow_summary_pkey` — `CREATE UNIQUE INDEX tbl_cashflow_summary_pkey ON landscape.tbl_cashflow_summary USING btree (summary_id)`
- `uq_summary_project_period` — `CREATE UNIQUE INDEX uq_summary_project_period ON landscape.tbl_cashflow_summary USING btree (project_id, period_id)`

## tbl_changelog
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| changelog_id | integer | NO | — | — |
| version | character varying(20) | NO | — | — |
| deployed_at | timestamp with time zone | NO | — | — |
| auto_generated_notes | text | YES | — | — |
| published_notes | text | YES | — | — |
| is_published | boolean | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |

**Indexes:**
- `idx_changelog_deployed` — `CREATE INDEX idx_changelog_deployed ON landscape.tbl_changelog USING btree (deployed_at DESC)`
- `idx_changelog_version` — `CREATE INDEX idx_changelog_version ON landscape.tbl_changelog USING btree (version)`
- `tbl_changelog_pkey` — `CREATE UNIQUE INDEX tbl_changelog_pkey ON landscape.tbl_changelog USING btree (changelog_id)`

## tbl_closing_event
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| closing_id | bigint | NO | nextval('tbl_closing_event_closing_id_seq'::regclass) | — |
| sale_event_id | bigint | NO | — | tbl_parcel_sale_event.sale_event_id |
| closing_sequence | integer | NO | — | — |
| closing_date | date | NO | — | — |
| lots_closed | integer | NO | — | — |
| base_price_per_unit | numeric(12,2) | YES | — | — |
| inflated_price_per_unit | numeric(12,2) | YES | — | — |
| uom_code | character varying(10) | YES | — | — |
| gross_proceeds | numeric(15,2) | YES | — | — |
| gross_value | numeric(15,2) | YES | — | — |
| onsite_costs | numeric(15,2) | YES | — | — |
| less_commissions_amount | numeric(12,2) | YES | — | — |
| commission_amount | numeric(15,2) | YES | — | — |
| less_closing_costs | numeric(12,2) | YES | — | — |
| closing_costs | numeric(15,2) | YES | — | — |
| less_improvements_credit | numeric(12,2) | YES | — | — |
| net_proceeds | numeric(15,2) | YES | — | — |
| cumulative_lots_closed | integer | YES | — | — |
| lots_remaining | integer | YES | — | — |
| escrow_release_amount | numeric(12,2) | YES | — | — |
| escrow_release_date | date | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_closing_date` — `CREATE INDEX idx_closing_date ON landscape.tbl_closing_event USING btree (closing_date)`
- `idx_closing_sale_event` — `CREATE INDEX idx_closing_sale_event ON landscape.tbl_closing_event USING btree (sale_event_id)`
- `idx_closing_sequence` — `CREATE INDEX idx_closing_sequence ON landscape.tbl_closing_event USING btree (sale_event_id, closing_sequence)`
- `tbl_closing_event_pkey` — `CREATE UNIQUE INDEX tbl_closing_event_pkey ON landscape.tbl_closing_event USING btree (closing_id)`
- `tbl_closing_event_sale_event_id_closing_sequence_key` — `CREATE UNIQUE INDEX tbl_closing_event_sale_event_id_closing_sequence_key ON landscape.tbl_closing_event USING btree (sale_event_id, closing_sequence)`

**Check Constraints:**
- `CHECK ((closing_sequence > 0))`
- `CHECK ((lots_closed > 0))`

## tbl_commercial_lease
**Row Count (estimated):** 5
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lease_id | integer | NO | nextval('tbl_cre_lease_lease_id_seq'::regclass) | — |
| income_property_id | integer | YES | — | tbl_income_property.income_property_id |
| space_id | integer | YES | — | tbl_space.space_id |
| tenant_id | integer | YES | — | tbl_tenant.tenant_id |
| lease_number | character varying(50) | YES | — | — |
| lease_type | character varying(50) | YES | — | — |
| lease_status | character varying(50) | YES | — | — |
| lease_execution_date | date | YES | — | — |
| lease_commencement_date | date | YES | — | — |
| rent_commencement_date | date | YES | — | — |
| lease_expiration_date | date | YES | — | — |
| lease_term_months | integer | YES | — | — |
| leased_sf | numeric(10,2) | YES | — | — |
| number_of_options | integer | YES | — | — |
| option_term_months | integer | YES | — | — |
| option_notice_months | integer | YES | — | — |
| early_termination_allowed | boolean | YES | false | — |
| termination_notice_months | integer | YES | — | — |
| termination_penalty_amount | numeric(12,2) | YES | — | — |
| security_deposit_amount | numeric(12,2) | YES | — | — |
| security_deposit_months | numeric(4,2) | YES | — | — |
| expansion_rights | boolean | YES | false | — |
| right_of_first_refusal | boolean | YES | false | — |
| exclusive_use_clause | text | YES | — | — |
| co_tenancy_clause | text | YES | — | — |
| radius_restriction | text | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| lease_type_code | character varying(10) | YES | 'CRE'::character varying | — |

**Indexes:**
- `idx_cre_lease_expiration` — `CREATE INDEX idx_cre_lease_expiration ON landscape.tbl_commercial_lease USING btree (lease_expiration_date)`
- `idx_cre_lease_space_id` — `CREATE INDEX idx_cre_lease_space_id ON landscape.tbl_commercial_lease USING btree (space_id)`
- `idx_cre_lease_status` — `CREATE INDEX idx_cre_lease_status ON landscape.tbl_commercial_lease USING btree (lease_status)`
- `idx_cre_lease_tenant` — `CREATE INDEX idx_cre_lease_tenant ON landscape.tbl_commercial_lease USING btree (tenant_id)`
- `idx_cre_lease_tenant_id` — `CREATE INDEX idx_cre_lease_tenant_id ON landscape.tbl_commercial_lease USING btree (tenant_id)`
- `idx_lease_income_property` — `CREATE INDEX idx_lease_income_property ON landscape.tbl_commercial_lease USING btree (income_property_id)`
- `tbl_cre_lease_pkey` — `CREATE UNIQUE INDEX tbl_cre_lease_pkey ON landscape.tbl_commercial_lease USING btree (lease_id)`

## tbl_contact
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| contact_id | bigint | NO | nextval('tbl_contact_contact_id_seq'::regclass) | — |
| cabinet_id | bigint | NO | — | tbl_cabinet.cabinet_id |
| contact_type | character varying(50) | NO | — | — |
| name | character varying(200) | NO | — | — |
| display_name | character varying(200) | YES | — | — |
| first_name | character varying(100) | YES | — | — |
| last_name | character varying(100) | YES | — | — |
| title | character varying(100) | YES | — | — |
| company_name | character varying(200) | YES | — | — |
| entity_type | character varying(100) | YES | — | — |
| email | character varying(255) | YES | — | — |
| phone | character varying(50) | YES | — | — |
| phone_mobile | character varying(50) | YES | — | — |
| address_line1 | character varying(255) | YES | — | — |
| address_line2 | character varying(255) | YES | — | — |
| city | character varying(100) | YES | — | — |
| state | character varying(50) | YES | — | — |
| postal_code | character varying(20) | YES | — | — |
| country | character varying(100) | YES | 'United States'::character varying | — |
| notes | text | YES | — | — |
| tags | jsonb | YES | '[]'::jsonb | — |
| custom_fields | jsonb | YES | '{}'::jsonb | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |
| is_active | boolean | YES | true | — |

**Indexes:**
- `idx_contact_active` — `CREATE INDEX idx_contact_active ON landscape.tbl_contact USING btree (cabinet_id, is_active) WHERE (is_active = true)`
- `idx_contact_cabinet` — `CREATE INDEX idx_contact_cabinet ON landscape.tbl_contact USING btree (cabinet_id)`
- `idx_contact_company` — `CREATE INDEX idx_contact_company ON landscape.tbl_contact USING btree (cabinet_id, company_name) WHERE (company_name IS NOT NULL)`
- `idx_contact_email` — `CREATE INDEX idx_contact_email ON landscape.tbl_contact USING btree (cabinet_id, email) WHERE (email IS NOT NULL)`
- `idx_contact_name` — `CREATE INDEX idx_contact_name ON landscape.tbl_contact USING btree (cabinet_id, name)`
- `idx_contact_search` — `CREATE INDEX idx_contact_search ON landscape.tbl_contact USING gin (to_tsvector('english'::regconfig, (((((COALESCE(name, ''::character varying))::text || ' '::text) || (COALESCE(company_name, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text)))`
- `idx_contact_type` — `CREATE INDEX idx_contact_type ON landscape.tbl_contact USING btree (cabinet_id, contact_type)`
- `tbl_contact_pkey` — `CREATE UNIQUE INDEX tbl_contact_pkey ON landscape.tbl_contact USING btree (contact_id)`

**Check Constraints:**
- `CHECK (((contact_type)::text = ANY ((ARRAY['Person'::character varying, 'Company'::character varying, 'Entity'::character varying, 'Fund'::character varying, 'Government'::character varying, 'Other'::character varying])::text[])))`

## tbl_contact_relationship
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| relationship_id | bigint | NO | nextval('tbl_contact_relationship_relationship_id_seq'::regclass) | — |
| cabinet_id | bigint | NO | — | tbl_cabinet.cabinet_id |
| contact_id | bigint | NO | — | tbl_contact.contact_id |
| related_to_id | bigint | NO | — | tbl_contact.contact_id |
| relationship_type | character varying(50) | NO | — | — |
| role_title | character varying(200) | YES | — | — |
| start_date | date | YES | — | — |
| end_date | date | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_contact_rel_cabinet` — `CREATE INDEX idx_contact_rel_cabinet ON landscape.tbl_contact_relationship USING btree (cabinet_id)`
- `idx_contact_rel_contact` — `CREATE INDEX idx_contact_rel_contact ON landscape.tbl_contact_relationship USING btree (contact_id)`
- `idx_contact_rel_current` — `CREATE INDEX idx_contact_rel_current ON landscape.tbl_contact_relationship USING btree (contact_id, related_to_id) WHERE (end_date IS NULL)`
- `idx_contact_rel_related` — `CREATE INDEX idx_contact_rel_related ON landscape.tbl_contact_relationship USING btree (related_to_id)`
- `idx_contact_rel_type` — `CREATE INDEX idx_contact_rel_type ON landscape.tbl_contact_relationship USING btree (relationship_type)`
- `tbl_contact_relationship_pkey` — `CREATE UNIQUE INDEX tbl_contact_relationship_pkey ON landscape.tbl_contact_relationship USING btree (relationship_id)`
- `uq_contact_relationship` — `CREATE UNIQUE INDEX uq_contact_relationship ON landscape.tbl_contact_relationship USING btree (contact_id, related_to_id, relationship_type)`

**Check Constraints:**
- `CHECK (((relationship_type)::text = ANY ((ARRAY['Employee'::character varying, 'Principal'::character varying, 'Subsidiary'::character varying, 'Affiliate'::character varying, 'Member'::character varying, 'Counsel'::character varying, 'Advisor'::character varying, 'Spouse'::character varying, 'Other'::character varying])::text[])))`
- `CHECK ((contact_id <> related_to_id))`

## tbl_contact_role
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| role_id | integer | NO | nextval('tbl_contact_role_role_id_seq'::regclass) | — |
| cabinet_id | bigint | YES | — | tbl_cabinet.cabinet_id |
| role_code | character varying(50) | NO | — | — |
| role_label | character varying(100) | NO | — | — |
| role_category | character varying(50) | NO | — | — |
| typical_contact_types | jsonb | YES | '["Company", "Entity", "Person"]'::jsonb | — |
| description | text | YES | — | — |
| display_order | integer | YES | 100 | — |
| is_system | boolean | YES | false | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_contact_role_cabinet` — `CREATE INDEX idx_contact_role_cabinet ON landscape.tbl_contact_role USING btree (cabinet_id)`
- `idx_contact_role_category` — `CREATE INDEX idx_contact_role_category ON landscape.tbl_contact_role USING btree (role_category)`
- `idx_contact_role_unique` — `CREATE UNIQUE INDEX idx_contact_role_unique ON landscape.tbl_contact_role USING btree (COALESCE(cabinet_id, (0)::bigint), role_code)`
- `tbl_contact_role_pkey` — `CREATE UNIQUE INDEX tbl_contact_role_pkey ON landscape.tbl_contact_role USING btree (role_id)`

**Check Constraints:**
- `CHECK (((role_category)::text = ANY ((ARRAY['Principal'::character varying, 'Financing'::character varying, 'Advisor'::character varying, 'Contact'::character varying, 'Other'::character varying])::text[])))`

## tbl_contacts_legacy
**Row Count (estimated):** 1
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| contact_id | integer | NO | nextval('tbl_contacts_contact_id_seq'::regclass) | — |
| company_name | character varying(255) | YES | — | — |
| contact_person | character varying(255) | YES | — | — |
| email | character varying(255) | YES | — | — |
| phone | character varying(50) | YES | — | — |
| address_line1 | character varying(255) | YES | — | — |
| address_line2 | character varying(255) | YES | — | — |
| city | character varying(100) | YES | — | — |
| state | character varying(50) | YES | — | — |
| zip | character varying(20) | YES | — | — |
| is_parent | boolean | YES | false | — |
| parent_company_name | character varying(255) | YES | — | — |
| parent_contact_person | character varying(255) | YES | — | — |
| parent_email | character varying(255) | YES | — | — |
| parent_phone | character varying(50) | YES | — | — |
| parent_address_line1 | character varying(255) | YES | — | — |
| parent_address_line2 | character varying(255) | YES | — | — |
| parent_city | character varying(100) | YES | — | — |
| parent_state | character varying(50) | YES | — | — |
| parent_zip | character varying(20) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| contact_role | character varying(50) | YES | — | — |
| title | character varying(100) | YES | — | — |
| company | character varying(200) | YES | — | — |
| phone_direct | character varying(50) | YES | — | — |
| phone_mobile | character varying(50) | YES | — | — |
| notes | text | YES | — | — |
| sort_order | integer | YES | 0 | — |
| project_id | integer | YES | — | tbl_project.project_id |
| contact_name | character varying(255) | YES | — | — |

**Indexes:**
- `idx_contacts_company_name` — `CREATE INDEX idx_contacts_company_name ON landscape.tbl_contacts_legacy USING btree (company_name)`
- `idx_contacts_project_role` — `CREATE INDEX idx_contacts_project_role ON landscape.tbl_contacts_legacy USING btree (project_id, contact_role)`
- `tbl_contacts_pkey` — `CREATE UNIQUE INDEX tbl_contacts_pkey ON landscape.tbl_contacts_legacy USING btree (contact_id)`

## tbl_cost_allocation
**Row Count (estimated):** 3
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| allocation_id | bigint | NO | nextval('tbl_cost_allocation_allocation_id_seq'::regclass) | — |
| finance_structure_id | bigint | NO | — | tbl_finance_structure.finance_structure_id |
| container_id | bigint | NO | — | tbl_division.division_id |
| allocation_percentage | numeric(6,3) | NO | — | — |
| allocation_basis | character varying(50) | YES | — | — |
| allocated_budget_amount | numeric(15,2) | YES | — | — |
| spent_to_date | numeric(15,2) | YES | 0 | — |
| cost_to_complete | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| scenario_id | integer | YES | — | tbl_scenario.scenario_id |

**Indexes:**
- `idx_cost_alloc_container` — `CREATE INDEX idx_cost_alloc_container ON landscape.tbl_cost_allocation USING btree (container_id)`
- `idx_cost_alloc_structure` — `CREATE INDEX idx_cost_alloc_structure ON landscape.tbl_cost_allocation USING btree (finance_structure_id)`
- `idx_cost_allocation_scenario` — `CREATE INDEX idx_cost_allocation_scenario ON landscape.tbl_cost_allocation USING btree (scenario_id)`
- `tbl_cost_allocation_pkey` — `CREATE UNIQUE INDEX tbl_cost_allocation_pkey ON landscape.tbl_cost_allocation USING btree (allocation_id)`
- `unique_allocation` — `CREATE UNIQUE INDEX unique_allocation ON landscape.tbl_cost_allocation USING btree (finance_structure_id, container_id)`

**Check Constraints:**
- `CHECK (((allocation_percentage >= (0)::numeric) AND (allocation_percentage <= (100)::numeric)))`

## tbl_cost_approach
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| cost_approach_id | integer | NO | nextval('tbl_cost_approach_cost_approach_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| land_valuation_method | character varying(50) | YES | — | — |
| land_area_sf | numeric(12,2) | YES | — | — |
| land_value_per_sf | numeric(10,2) | YES | — | — |
| total_land_value | numeric(15,2) | YES | — | — |
| cost_method | character varying(50) | YES | — | — |
| building_area_sf | numeric(12,2) | YES | — | — |
| cost_per_sf | numeric(10,2) | YES | — | — |
| base_replacement_cost | numeric(15,2) | YES | — | — |
| entrepreneurial_incentive_pct | numeric(5,2) | YES | — | — |
| total_replacement_cost | numeric(15,2) | YES | — | — |
| physical_curable | numeric(12,2) | YES | — | — |
| physical_incurable_short | numeric(12,2) | YES | — | — |
| physical_incurable_long | numeric(12,2) | YES | — | — |
| functional_curable | numeric(12,2) | YES | — | — |
| functional_incurable | numeric(12,2) | YES | — | — |
| external_obsolescence | numeric(12,2) | YES | — | — |
| total_depreciation | numeric(15,2) | YES | — | — |
| depreciated_improvements | numeric(15,2) | YES | — | — |
| site_improvements_cost | numeric(12,2) | YES | — | — |
| site_improvements_description | text | YES | — | — |
| indicated_value | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_cost_approach_project` — `CREATE UNIQUE INDEX idx_cost_approach_project ON landscape.tbl_cost_approach USING btree (project_id)`
- `tbl_cost_approach_pkey` — `CREATE UNIQUE INDEX tbl_cost_approach_pkey ON landscape.tbl_cost_approach USING btree (cost_approach_id)`

**Check Constraints:**
- `CHECK (((cost_method)::text = ANY ((ARRAY['comparative_unit'::character varying, 'unit_in_place'::character varying, 'quantity_survey'::character varying, 'marshall_swift'::character varying, 'other'::character varying])::text[])))`
- `CHECK (((land_valuation_method)::text = ANY ((ARRAY['sales_comparison'::character varying, 'allocation'::character varying, 'extraction'::character varying, 'other'::character varying])::text[])))`

## tbl_cost_approach_depreciation
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| depreciation_id | integer | NO | — | — |
| physical_curable | numeric(12,2) | NO | — | — |
| physical_incurable_short | numeric(12,2) | NO | — | — |
| physical_incurable_long | numeric(12,2) | NO | — | — |
| functional_curable | numeric(12,2) | NO | — | — |
| functional_incurable | numeric(12,2) | NO | — | — |
| external_obsolescence | numeric(12,2) | NO | — | — |
| effective_age_years | integer | YES | — | — |
| remaining_life_years | integer | YES | — | — |
| depreciation_method | character varying(50) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |

**Indexes:**
- `tbl_cost_approach_depreciation_pkey` — `CREATE UNIQUE INDEX tbl_cost_approach_depreciation_pkey ON landscape.tbl_cost_approach_depreciation USING btree (depreciation_id)`
- `tbl_cost_approach_depreciation_project_id_key` — `CREATE UNIQUE INDEX tbl_cost_approach_depreciation_project_id_key ON landscape.tbl_cost_approach_depreciation USING btree (project_id)`

## tbl_dcf_analysis
**Row Count (estimated):** 7
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| dcf_analysis_id | bigint | NO | nextval('tbl_dcf_analysis_dcf_analysis_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| property_type | character varying(20) | NO | — | — |
| hold_period_years | integer | YES | — | — |
| discount_rate | numeric(6,4) | YES | — | — |
| exit_cap_rate | numeric(6,4) | YES | — | — |
| selling_costs_pct | numeric(5,4) | YES | — | — |
| going_in_cap_rate | numeric(6,4) | YES | — | — |
| cap_rate_method | character varying(20) | YES | — | — |
| sensitivity_interval | numeric(6,4) | YES | — | — |
| vacancy_rate | numeric(5,4) | YES | — | — |
| stabilized_vacancy | numeric(5,4) | YES | — | — |
| credit_loss | numeric(5,4) | YES | — | — |
| management_fee_pct | numeric(5,4) | YES | — | — |
| reserves_per_unit | numeric(10,2) | YES | — | — |
| income_growth_set_id | integer | YES | — | core_fin_growth_rate_sets.set_id |
| expense_growth_set_id | integer | YES | — | core_fin_growth_rate_sets.set_id |
| price_growth_set_id | integer | YES | — | core_fin_growth_rate_sets.set_id |
| cost_inflation_set_id | integer | YES | — | core_fin_growth_rate_sets.set_id |
| bulk_sale_enabled | boolean | YES | false | — |
| bulk_sale_period | integer | YES | — | — |
| bulk_sale_discount_pct | numeric(5,4) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_dcf_analysis_project` — `CREATE INDEX idx_dcf_analysis_project ON landscape.tbl_dcf_analysis USING btree (project_id)`
- `idx_dcf_analysis_property_type` — `CREATE INDEX idx_dcf_analysis_property_type ON landscape.tbl_dcf_analysis USING btree (property_type)`
- `tbl_dcf_analysis_pkey` — `CREATE UNIQUE INDEX tbl_dcf_analysis_pkey ON landscape.tbl_dcf_analysis USING btree (dcf_analysis_id)`
- `uq_dcf_analysis_project_type` — `CREATE UNIQUE INDEX uq_dcf_analysis_project_type ON landscape.tbl_dcf_analysis USING btree (project_id, property_type)`

**Check Constraints:**
- `CHECK (((cap_rate_method IS NULL) OR ((cap_rate_method)::text = ANY ((ARRAY['comp_sales'::character varying, 'band'::character varying, 'survey'::character varying, 'direct_entry'::character varying])::text[]))))`
- `CHECK (((property_type)::text = ANY ((ARRAY['cre'::character varying, 'land_dev'::character varying])::text[])))`

## tbl_debt_draw_schedule
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| draw_id | bigint | NO | — | — |
| loan_id | bigint | NO | — | tbl_loan.loan_id |
| period_id | bigint | NO | — | tbl_calculation_period.period_id |
| draw_number | integer | YES | — | — |
| draw_amount | numeric(15,2) | YES | — | — |
| cumulative_drawn | numeric(15,2) | YES | — | — |
| available_remaining | numeric(15,2) | YES | — | — |
| beginning_balance | numeric(15,2) | YES | — | — |
| ending_balance | numeric(15,2) | YES | — | — |
| draw_date | date | YES | — | — |
| draw_purpose | character varying(200) | YES | — | — |
| draw_status | character varying(20) | YES | 'PROJECTED'::character varying | — |
| interest_rate_pct | numeric(6,4) | YES | — | — |
| interest_amount | numeric(12,2) | YES | — | — |
| interest_expense | numeric(12,2) | YES | — | — |
| interest_paid | numeric(12,2) | YES | — | — |
| deferred_interest | numeric(12,2) | YES | 0 | — |
| cumulative_interest | numeric(12,2) | YES | — | — |
| principal_payment | numeric(12,2) | YES | — | — |
| outstanding_balance | numeric(15,2) | YES | — | — |
| unused_fee_charge | numeric(10,2) | YES | 0 | — |
| commitment_fee_charge | numeric(10,2) | YES | 0 | — |
| other_fees | numeric(10,2) | YES | 0 | — |
| request_date | date | YES | — | — |
| approval_date | date | YES | — | — |
| funding_date | date | YES | — | — |
| inspector_approval | boolean | YES | — | — |
| lender_approval | boolean | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_debt_draw_loan` — `CREATE INDEX idx_debt_draw_loan ON landscape.tbl_debt_draw_schedule USING btree (loan_id, period_id)`
- `idx_debt_draw_period` — `CREATE INDEX idx_debt_draw_period ON landscape.tbl_debt_draw_schedule USING btree (period_id)`
- `tbl_debt_draw_schedule_loan_id_period_id_key` — `CREATE UNIQUE INDEX tbl_debt_draw_schedule_loan_id_period_id_key ON landscape.tbl_debt_draw_schedule USING btree (loan_id, period_id)`
- `tbl_debt_draw_schedule_pkey` — `CREATE UNIQUE INDEX tbl_debt_draw_schedule_pkey ON landscape.tbl_debt_draw_schedule USING btree (draw_id)`

**Check Constraints:**
- `CHECK (((draw_status)::text = ANY ((ARRAY['PROJECTED'::character varying, 'REQUESTED'::character varying, 'FUNDED'::character varying, 'ACTUAL'::character varying])::text[])))`

## tbl_division
**Row Count (estimated):** 788
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| division_id | bigint | NO | — | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| parent_division_id | bigint | YES | — | tbl_division.division_id |
| tier | integer | NO | — | — |
| division_code | character varying(50) | NO | — | — |
| display_name | character varying(200) | NO | — | — |
| sort_order | integer | YES | 0 | — |
| attributes | jsonb | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| sale_phase_code | character varying(20) | YES | — | — |
| custom_sale_date | date | YES | — | — |
| has_sale_overrides | boolean | YES | false | — |
| option_deposit_pct | numeric(5,4) | YES | — | — |
| option_deposit_cap_pct | numeric(5,4) | YES | — | — |
| retail_lot_price | numeric(12,2) | YES | — | — |
| premium_pct | numeric(5,4) | YES | — | — |

**Indexes:**
- `idx_container_project_level` — `CREATE INDEX idx_container_project_level ON landscape.tbl_division USING btree (project_id, tier, sort_order, division_id)`
- `idx_container_sale_phase` — `CREATE INDEX idx_container_sale_phase ON landscape.tbl_division USING btree (project_id, sale_phase_code) WHERE (sale_phase_code IS NOT NULL)`
- `idx_division_parent` — `CREATE INDEX idx_division_parent ON landscape.tbl_division USING btree (parent_division_id)`
- `tbl_container_pkey` — `CREATE UNIQUE INDEX tbl_container_pkey ON landscape.tbl_division USING btree (division_id)`
- `uq_container_code` — `CREATE UNIQUE INDEX uq_container_code ON landscape.tbl_division USING btree (project_id, division_code)`

**Check Constraints:**
- `CHECK ((((tier = 1) AND (parent_division_id IS NULL)) OR ((tier = ANY (ARRAY[2, 3, 4, 5])) AND (parent_division_id IS NOT NULL))))`
- `CHECK (((tier >= 1) AND (tier <= 5)))`

## tbl_document_project
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| document_project_id | bigint | NO | nextval('tbl_document_project_document_project_id_seq'::regclass) | — |
| document_id | bigint | NO | — | core_doc.doc_id |
| project_id | bigint | NO | — | tbl_project.project_id |
| relationship_type | character varying(50) | YES | 'attached'::character varying | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |

**Indexes:**
- `idx_doc_project_doc` — `CREATE INDEX idx_doc_project_doc ON landscape.tbl_document_project USING btree (document_id)`
- `idx_doc_project_project` — `CREATE INDEX idx_doc_project_project ON landscape.tbl_document_project USING btree (project_id)`
- `idx_doc_project_type` — `CREATE INDEX idx_doc_project_type ON landscape.tbl_document_project USING btree (relationship_type)`
- `tbl_document_project_pkey` — `CREATE UNIQUE INDEX tbl_document_project_pkey ON landscape.tbl_document_project USING btree (document_project_id)`
- `uq_document_project` — `CREATE UNIQUE INDEX uq_document_project ON landscape.tbl_document_project USING btree (document_id, project_id)`

**Check Constraints:**
- `CHECK (((relationship_type)::text = ANY ((ARRAY['attached'::character varying, 'reference'::character varying, 'source'::character varying])::text[])))`

## tbl_dynamic_column_definition
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| table_name | character varying(100) | NO | — | — |
| column_key | character varying(100) | NO | — | — |
| display_label | character varying(100) | NO | — | — |
| data_type | character varying(20) | NO | — | — |
| format_pattern | character varying(50) | YES | — | — |
| source | character varying(20) | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| is_active | boolean | NO | — | — |
| is_proposed | boolean | NO | — | — |
| display_order | integer | NO | — | — |
| created_by_id | bigint | YES | — | auth_user.id |
| project_id | integer | NO | — | tbl_project.project_id |
| proposed_from_document_id | bigint | YES | — | core_doc.doc_id |

**Indexes:**
- `tbl_dynamic_column_defin_project_id_table_name_co_83f0e5e0_uniq` — `CREATE UNIQUE INDEX tbl_dynamic_column_defin_project_id_table_name_co_83f0e5e0_uniq ON landscape.tbl_dynamic_column_definition USING btree (project_id, table_name, column_key)`
- `tbl_dynamic_column_definit_proposed_from_document_id_2d43666b` — `CREATE INDEX tbl_dynamic_column_definit_proposed_from_document_id_2d43666b ON landscape.tbl_dynamic_column_definition USING btree (proposed_from_document_id)`
- `tbl_dynamic_column_definition_created_by_id_9b1688b7` — `CREATE INDEX tbl_dynamic_column_definition_created_by_id_9b1688b7 ON landscape.tbl_dynamic_column_definition USING btree (created_by_id)`
- `tbl_dynamic_column_definition_pkey` — `CREATE UNIQUE INDEX tbl_dynamic_column_definition_pkey ON landscape.tbl_dynamic_column_definition USING btree (id)`
- `tbl_dynamic_column_definition_project_id_1c6c3338` — `CREATE INDEX tbl_dynamic_column_definition_project_id_1c6c3338 ON landscape.tbl_dynamic_column_definition USING btree (project_id)`

## tbl_dynamic_column_value
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| row_id | integer | NO | — | — |
| value_text | text | YES | — | — |
| value_number | numeric(18,4) | YES | — | — |
| value_boolean | boolean | YES | — | — |
| value_date | date | YES | — | — |
| confidence | double precision | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| column_definition_id | bigint | NO | — | tbl_dynamic_column_definition.id |
| extracted_from_id | bigint | YES | — | core_doc.doc_id |

**Indexes:**
- `tbl_dynamic_column__134554_idx` — `CREATE INDEX tbl_dynamic_column__134554_idx ON landscape.tbl_dynamic_column_value USING btree (column_definition_id, row_id)`
- `tbl_dynamic_column_value_column_definition_id_2b1ec228` — `CREATE INDEX tbl_dynamic_column_value_column_definition_id_2b1ec228 ON landscape.tbl_dynamic_column_value USING btree (column_definition_id)`
- `tbl_dynamic_column_value_column_definition_id_row_e387982d_uniq` — `CREATE UNIQUE INDEX tbl_dynamic_column_value_column_definition_id_row_e387982d_uniq ON landscape.tbl_dynamic_column_value USING btree (column_definition_id, row_id)`
- `tbl_dynamic_column_value_extracted_from_id_9be121bb` — `CREATE INDEX tbl_dynamic_column_value_extracted_from_id_9be121bb ON landscape.tbl_dynamic_column_value USING btree (extracted_from_id)`
- `tbl_dynamic_column_value_pkey` — `CREATE UNIQUE INDEX tbl_dynamic_column_value_pkey ON landscape.tbl_dynamic_column_value USING btree (id)`
- `tbl_dynamic_row_id_9def5e_idx` — `CREATE INDEX tbl_dynamic_row_id_9def5e_idx ON landscape.tbl_dynamic_column_value USING btree (row_id)`

## tbl_equity
**Row Count (estimated):** 4
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| equity_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| equity_name | character varying(255) | NO | — | — |
| equity_class | character varying(50) | NO | — | — |
| equity_tier | integer | YES | 1 | — |
| commitment_amount | numeric(15,2) | NO | — | — |
| funded_amount | numeric(15,2) | YES | 0 | — |
| preferred_return_pct | numeric(5,2) | YES | — | — |
| preferred_return_compounds | boolean | YES | false | — |
| promote_pct | numeric(5,2) | YES | — | — |
| promote_tier_2_threshold | numeric(15,2) | YES | — | — |
| promote_tier_2_pct | numeric(5,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| partner_type | character varying(10) | YES | — | — |
| partner_name | character varying(200) | YES | — | — |
| ownership_pct | numeric(5,2) | YES | 0 | — |
| capital_contributed | numeric(15,2) | YES | 0 | — |
| unreturned_capital | numeric(15,2) | YES | 0 | — |
| cumulative_distributions | numeric(15,2) | YES | 0 | — |
| accrued_preferred_return | numeric(12,2) | YES | 0 | — |
| preferred_return_paid_to_date | numeric(12,2) | YES | 0 | — |
| catch_up_pct | numeric(5,2) | YES | — | — |
| promote_trigger_type | character varying(20) | YES | 'irr'::character varying | — |
| promote_tier_1_threshold | numeric(6,3) | YES | — | — |
| promote_tier_3_threshold | numeric(6,3) | YES | — | — |
| promote_tier_3_pct | numeric(5,2) | YES | — | — |
| irr_target_pct | numeric(6,3) | YES | — | — |
| equity_multiple_target | numeric(5,2) | YES | — | — |
| cash_on_cash_target_pct | numeric(6,3) | YES | — | — |
| distribution_frequency | character varying(20) | YES | 'Quarterly'::character varying | — |
| distribution_priority | integer | YES | — | — |
| can_defer_distributions | boolean | YES | false | — |
| management_fee_pct | numeric(5,3) | YES | — | — |
| management_fee_base | character varying(20) | YES | 'equity'::character varying | — |
| acquisition_fee_pct | numeric(5,3) | YES | — | — |
| disposition_fee_pct | numeric(5,3) | YES | — | — |
| promote_fee_pct | numeric(5,3) | YES | — | — |
| has_clawback | boolean | YES | false | — |
| clawback_threshold_pct | numeric(6,3) | YES | — | — |
| has_lookback | boolean | YES | true | — |
| lookback_at_sale | boolean | YES | true | — |

**Indexes:**
- `idx_equity_project` — `CREATE INDEX idx_equity_project ON landscape.tbl_equity USING btree (project_id)`
- `idx_equity_tier` — `CREATE INDEX idx_equity_tier ON landscape.tbl_equity USING btree (project_id, equity_tier)`
- `tbl_equity_pkey` — `CREATE UNIQUE INDEX tbl_equity_pkey ON landscape.tbl_equity USING btree (equity_id)`

## tbl_equity_distribution
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| distribution_id | bigint | NO | nextval('tbl_equity_distribution_distribution_id_seq'::regclass) | — |
| partner_id | bigint | NO | — | tbl_equity_partner.partner_id |
| period_id | bigint | YES | — | tbl_calculation_period.period_id |
| distribution_type | character varying(50) | NO | — | — |
| amount | numeric(15,2) | NO | — | — |
| cumulative_amount | numeric(15,2) | YES | — | — |
| unpaid_preferred_return | numeric(15,2) | YES | 0 | — |
| distribution_date | date | YES | — | — |
| distribution_status | character varying(50) | YES | 'PROJECTED'::character varying | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_equity_distribution_partner` — `CREATE INDEX idx_equity_distribution_partner ON landscape.tbl_equity_distribution USING btree (partner_id, period_id)`
- `idx_equity_distribution_period` — `CREATE INDEX idx_equity_distribution_period ON landscape.tbl_equity_distribution USING btree (period_id)`
- `idx_equity_distribution_type` — `CREATE INDEX idx_equity_distribution_type ON landscape.tbl_equity_distribution USING btree (distribution_type)`
- `tbl_equity_distribution_pkey` — `CREATE UNIQUE INDEX tbl_equity_distribution_pkey ON landscape.tbl_equity_distribution USING btree (distribution_id)`

**Check Constraints:**
- `CHECK (((distribution_status)::text = ANY ((ARRAY['PROJECTED'::character varying, 'APPROVED'::character varying, 'PAID'::character varying])::text[])))`
- `CHECK (((distribution_type)::text = ANY ((ARRAY['CAPITAL_CALL'::character varying, 'RETURN_OF_CAPITAL'::character varying, 'PREFERRED_RETURN'::character varying, 'PROMOTE'::character varying, 'RESIDUAL'::character varying])::text[])))`

## tbl_equity_partner
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| partner_id | bigint | NO | nextval('tbl_equity_partner_partner_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| partner_name | character varying(200) | NO | — | — |
| partner_class | character varying(50) | NO | — | — |
| ownership_pct | numeric(5,4) | YES | — | — |
| committed_capital | numeric(15,2) | YES | — | — |
| preferred_return_pct | numeric(6,5) | YES | — | — |
| promote_pct | numeric(5,4) | YES | — | — |
| hurdle_irr_pct | numeric(6,5) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_equity_partner_class` — `CREATE INDEX idx_equity_partner_class ON landscape.tbl_equity_partner USING btree (partner_class)`
- `idx_equity_partner_project` — `CREATE INDEX idx_equity_partner_project ON landscape.tbl_equity_partner USING btree (project_id)`
- `tbl_equity_partner_pkey` — `CREATE UNIQUE INDEX tbl_equity_partner_pkey ON landscape.tbl_equity_partner USING btree (partner_id)`

**Check Constraints:**
- `CHECK (((partner_class)::text = ANY ((ARRAY['GP'::character varying, 'LP'::character varying, 'COMMON'::character varying, 'PREFERRED'::character varying])::text[])))`

## tbl_equity_structure
**Row Count (estimated):** 2
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| equity_structure_id | bigint | NO | nextval('tbl_equity_structure_equity_structure_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| lp_ownership_pct | numeric(5,2) | NO | — | — |
| gp_ownership_pct | numeric(5,2) | NO | — | — |
| preferred_return_pct | numeric(6,3) | NO | 0.08 | — |
| gp_promote_after_pref | numeric(5,2) | YES | 0.20 | — |
| catch_up_pct | numeric(5,2) | YES | — | — |
| equity_multiple_target | numeric(5,2) | YES | — | — |
| irr_target_pct | numeric(6,3) | YES | — | — |
| distribution_frequency | character varying(20) | YES | 'Quarterly'::character varying | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `tbl_equity_structure_pkey` — `CREATE UNIQUE INDEX tbl_equity_structure_pkey ON landscape.tbl_equity_structure USING btree (equity_structure_id)`

## tbl_escalation
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| escalation_id | integer | NO | — | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| escalation_type | character varying(50) | NO | — | — |
| escalation_pct | numeric(5,2) | YES | — | — |
| escalation_frequency | character varying(50) | YES | 'Annual'::character varying | — |
| compound_escalation | boolean | YES | true | — |
| cpi_index | character varying(100) | YES | — | — |
| cpi_floor_pct | numeric(5,2) | YES | — | — |
| cpi_cap_pct | numeric(5,2) | YES | — | — |
| tenant_cpi_share_pct | numeric(5,2) | YES | 100.00 | — |
| annual_increase_amount | numeric(15,2) | YES | — | — |
| step_schedule | jsonb | YES | — | — |
| first_escalation_date | date | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_escalation_lease` — `CREATE INDEX idx_escalation_lease ON landscape.tbl_escalation USING btree (lease_id)`
- `idx_escalation_type` — `CREATE INDEX idx_escalation_type ON landscape.tbl_escalation USING btree (escalation_type)`
- `tbl_escalation_pkey` — `CREATE UNIQUE INDEX tbl_escalation_pkey ON landscape.tbl_escalation USING btree (escalation_id)`

## tbl_expansion_option
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| expansion_option_id | integer | NO | nextval('tbl_expansion_option_expansion_option_id_seq'::regclass) | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| option_type | character varying(50) | YES | — | — |
| target_space_id | integer | YES | — | tbl_space.space_id |
| target_space_description | character varying(255) | YES | — | — |
| expansion_sf_min | numeric(10,2) | YES | — | — |
| expansion_sf_max | numeric(10,2) | YES | — | — |
| option_start_date | date | YES | — | — |
| option_end_date | date | YES | — | — |
| must_take_date | date | YES | — | — |
| notice_period_days | integer | YES | — | — |
| landlord_notice_required | boolean | YES | false | — |
| response_period_days | integer | YES | — | — |
| expansion_rent_method | character varying(50) | YES | — | — |
| expansion_rent_psf | numeric(8,2) | YES | — | — |
| expansion_rent_spread_psf | numeric(8,2) | YES | — | — |
| option_exercised | boolean | YES | false | — |
| exercise_date | date | YES | — | — |
| exercised_space_id | integer | YES | — | tbl_space.space_id |
| exercised_sf | numeric(10,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_expansion_lease` — `CREATE INDEX idx_expansion_lease ON landscape.tbl_expansion_option USING btree (lease_id)`
- `idx_expansion_target` — `CREATE INDEX idx_expansion_target ON landscape.tbl_expansion_option USING btree (target_space_id)`
- `tbl_expansion_option_pkey` — `CREATE UNIQUE INDEX tbl_expansion_option_pkey ON landscape.tbl_expansion_option USING btree (expansion_option_id)`

## tbl_expense_detail
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| expense_detail_id | bigint | NO | nextval('tbl_expense_detail_expense_detail_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| expense_id | bigint | YES | — | tbl_operating_expense.expense_id |
| expense_category | character varying(100) | NO | — | — |
| expense_subcategory | character varying(100) | YES | — | — |
| amount_annual | numeric(12,2) | NO | — | — |
| per_unit_monthly | numeric(8,2) | YES | — | — |
| per_sf_annual | numeric(6,2) | YES | — | — |
| escalation_pct | numeric(5,3) | YES | 0.03 | — |
| escalation_start_year | integer | YES | 1 | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_expense_detail_category` — `CREATE INDEX idx_expense_detail_category ON landscape.tbl_expense_detail USING btree (expense_category)`
- `idx_expense_detail_project` — `CREATE INDEX idx_expense_detail_project ON landscape.tbl_expense_detail USING btree (project_id)`
- `tbl_expense_detail_pkey` — `CREATE UNIQUE INDEX tbl_expense_detail_pkey ON landscape.tbl_expense_detail USING btree (expense_detail_id)`

## tbl_expense_recovery
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| expense_recovery_id | integer | NO | nextval('tbl_expense_recovery_expense_recovery_id_seq'::regclass) | — |
| lease_id | integer | YES | — | tbl_commercial_lease.lease_id |
| recovery_structure | character varying(50) | YES | — | — |
| recovery_method | character varying(50) | YES | — | — |
| property_tax_recovery_pct | numeric(6,3) | YES | 0 | — |
| insurance_recovery_pct | numeric(6,3) | YES | 0 | — |
| cam_recovery_pct | numeric(6,3) | YES | 0 | — |
| utilities_recovery_pct | numeric(6,3) | YES | 0 | — |
| expense_cap_psf | numeric(8,2) | YES | — | — |
| expense_cap_escalation_pct | numeric(6,3) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `tbl_cre_expense_recovery_pkey` — `CREATE UNIQUE INDEX tbl_cre_expense_recovery_pkey ON landscape.tbl_expense_recovery USING btree (expense_recovery_id)`

## tbl_extraction_job
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| job_id | bigint | NO | — | — |
| project_id | bigint | NO | — | — |
| document_id | bigint | NO | — | — |
| scope | character varying(50) | NO | — | — |
| status | character varying(20) | NO | — | — |
| total_items | integer | YES | — | — |
| processed_items | integer | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| started_at | timestamp with time zone | YES | — | — |
| completed_at | timestamp with time zone | YES | — | — |
| error_message | text | YES | — | — |
| result_summary | jsonb | YES | — | — |
| created_by_id | bigint | YES | — | auth_user.id |

**Indexes:**
- `tbl_extract_project_e44a1d_idx` — `CREATE INDEX tbl_extract_project_e44a1d_idx ON landscape.tbl_extraction_job USING btree (project_id, scope, status)`
- `tbl_extract_project_f3cb1f_idx` — `CREATE INDEX tbl_extract_project_f3cb1f_idx ON landscape.tbl_extraction_job USING btree (project_id, created_at)`
- `tbl_extraction_job_created_at_a693d081` — `CREATE INDEX tbl_extraction_job_created_at_a693d081 ON landscape.tbl_extraction_job USING btree (created_at)`
- `tbl_extraction_job_created_by_id_01e1ec43` — `CREATE INDEX tbl_extraction_job_created_by_id_01e1ec43 ON landscape.tbl_extraction_job USING btree (created_by_id)`
- `tbl_extraction_job_document_id_fe10aa7e` — `CREATE INDEX tbl_extraction_job_document_id_fe10aa7e ON landscape.tbl_extraction_job USING btree (document_id)`
- `tbl_extraction_job_pkey` — `CREATE UNIQUE INDEX tbl_extraction_job_pkey ON landscape.tbl_extraction_job USING btree (job_id)`
- `tbl_extraction_job_project_id_443a23a8` — `CREATE INDEX tbl_extraction_job_project_id_443a23a8 ON landscape.tbl_extraction_job USING btree (project_id)`
- `tbl_extraction_job_scope_5f01c2d9` — `CREATE INDEX tbl_extraction_job_scope_5f01c2d9 ON landscape.tbl_extraction_job USING btree (scope)`
- `tbl_extraction_job_scope_5f01c2d9_like` — `CREATE INDEX tbl_extraction_job_scope_5f01c2d9_like ON landscape.tbl_extraction_job USING btree (scope varchar_pattern_ops)`
- `tbl_extraction_job_status_31566a48` — `CREATE INDEX tbl_extraction_job_status_31566a48 ON landscape.tbl_extraction_job USING btree (status)`
- `tbl_extraction_job_status_31566a48_like` — `CREATE INDEX tbl_extraction_job_status_31566a48_like ON landscape.tbl_extraction_job USING btree (status varchar_pattern_ops)`

## tbl_extraction_log
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| log_id | integer | NO | nextval('tbl_extraction_log_log_id_seq'::regclass) | — |
| mapping_id | integer | YES | — | tbl_extraction_mapping.mapping_id |
| project_id | integer | YES | — | — |
| doc_id | integer | YES | — | — |
| source_pattern_matched | character varying(200) | YES | — | — |
| extracted_value | text | YES | — | — |
| transformed_value | text | YES | — | — |
| previous_value | text | YES | — | — |
| confidence_score | numeric(5,4) | YES | — | — |
| extraction_context | text | YES | — | — |
| was_written | boolean | NO | false | — |
| was_accepted | boolean | YES | — | — |
| rejection_reason | text | YES | — | — |
| extracted_at | timestamp with time zone | YES | now() | — |
| reviewed_at | timestamp with time zone | YES | — | — |
| reviewed_by | integer | YES | — | — |

**Indexes:**
- `idx_extraction_log_doc` — `CREATE INDEX idx_extraction_log_doc ON landscape.tbl_extraction_log USING btree (doc_id)`
- `idx_extraction_log_mapping` — `CREATE INDEX idx_extraction_log_mapping ON landscape.tbl_extraction_log USING btree (mapping_id)`
- `idx_extraction_log_project` — `CREATE INDEX idx_extraction_log_project ON landscape.tbl_extraction_log USING btree (project_id)`
- `tbl_extraction_log_pkey` — `CREATE UNIQUE INDEX tbl_extraction_log_pkey ON landscape.tbl_extraction_log USING btree (log_id)`

## tbl_extraction_mapping
**Row Count (estimated):** 134
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| mapping_id | integer | NO | nextval('tbl_extraction_mapping_mapping_id_seq'::regclass) | — |
| document_type | character varying(50) | NO | — | — |
| source_pattern | character varying(200) | NO | — | — |
| source_aliases | jsonb | YES | — | — |
| target_table | character varying(100) | NO | — | — |
| target_field | character varying(100) | NO | — | — |
| data_type | character varying(20) | NO | 'text'::character varying | — |
| transform_rule | character varying(100) | YES | — | — |
| confidence | character varying(10) | NO | 'Medium'::character varying | — |
| auto_write | boolean | NO | true | — |
| overwrite_existing | boolean | NO | false | — |
| is_active | boolean | NO | true | — |
| is_system | boolean | NO | true | — |
| notes | text | YES | — | — |
| created_by | integer | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_by | integer | YES | — | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_extraction_mapping_active` — `CREATE INDEX idx_extraction_mapping_active ON landscape.tbl_extraction_mapping USING btree (is_active) WHERE (is_active = true)`
- `idx_extraction_mapping_doctype` — `CREATE INDEX idx_extraction_mapping_doctype ON landscape.tbl_extraction_mapping USING btree (document_type)`
- `idx_extraction_mapping_target` — `CREATE INDEX idx_extraction_mapping_target ON landscape.tbl_extraction_mapping USING btree (target_table, target_field)`
- `tbl_extraction_mapping_pkey` — `CREATE UNIQUE INDEX tbl_extraction_mapping_pkey ON landscape.tbl_extraction_mapping USING btree (mapping_id)`
- `uq_mapping_pattern_field` — `CREATE UNIQUE INDEX uq_mapping_pattern_field ON landscape.tbl_extraction_mapping USING btree (document_type, source_pattern, target_table, target_field)`

**Check Constraints:**
- `CHECK (((confidence)::text = ANY ((ARRAY['High'::character varying, 'Medium'::character varying, 'Low'::character varying])::text[])))`
- `CHECK (((data_type IS NULL) OR ((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'currency'::character varying, 'date'::character varying, 'boolean'::character varying, 'enum'::character varying])::text[]))))`
- `CHECK (((data_type)::text = ANY ((ARRAY['text'::character varying, 'integer'::character varying, 'decimal'::character varying, 'boolean'::character varying, 'date'::character varying, 'json'::character varying])::text[])))`

## tbl_field_catalog
**Row Count (estimated):** 3651
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| field_id | bigint | NO | nextval('tbl_field_catalog_field_id_seq'::regclass) | — |
| table_name | character varying(100) | NO | — | — |
| field_name | character varying(100) | NO | — | — |
| display_name | character varying(200) | YES | — | — |
| description | text | YES | — | — |
| data_type | character varying(50) | NO | — | — |
| is_editable | boolean | YES | true | — |
| is_required | boolean | YES | false | — |
| is_calculated | boolean | YES | false | — |
| calculation_source | text | YES | — | — |
| valid_values | jsonb | YES | — | — |
| default_value | text | YES | — | — |
| unit_of_measure | character varying(50) | YES | — | — |
| min_value | numeric | YES | — | — |
| max_value | numeric | YES | — | — |
| field_group | character varying(100) | YES | — | — |
| display_order | integer | YES | 0 | — |
| applies_to_types | ARRAY | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_field_catalog_editable` — `CREATE INDEX idx_field_catalog_editable ON landscape.tbl_field_catalog USING btree (is_editable) WHERE (is_editable = true)`
- `idx_field_catalog_group` — `CREATE INDEX idx_field_catalog_group ON landscape.tbl_field_catalog USING btree (field_group)`
- `idx_field_catalog_table` — `CREATE INDEX idx_field_catalog_table ON landscape.tbl_field_catalog USING btree (table_name)`
- `tbl_field_catalog_pkey` — `CREATE UNIQUE INDEX tbl_field_catalog_pkey ON landscape.tbl_field_catalog USING btree (field_id)`
- `tbl_field_catalog_table_name_field_name_key` — `CREATE UNIQUE INDEX tbl_field_catalog_table_name_field_name_key ON landscape.tbl_field_catalog USING btree (table_name, field_name)`

## tbl_finance_structure
**Row Count (estimated):** 2
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| finance_structure_id | bigint | NO | nextval('tbl_finance_structure_finance_structure_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| structure_code | character varying(50) | NO | — | — |
| structure_name | character varying(200) | NO | — | — |
| description | text | YES | — | — |
| structure_type | character varying(50) | NO | — | — |
| total_budget_amount | numeric(15,2) | YES | — | — |
| budget_category | character varying(100) | YES | — | — |
| is_recurring | boolean | YES | false | — |
| recurrence_frequency | character varying(20) | YES | — | — |
| annual_amount | numeric(12,2) | YES | — | — |
| allocation_method | character varying(50) | NO | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| created_by | character varying(100) | YES | — | — |
| updated_by | character varying(100) | YES | — | — |
| scenario_id | integer | YES | — | tbl_scenario.scenario_id |

**Indexes:**
- `idx_finance_structure_active` — `CREATE INDEX idx_finance_structure_active ON landscape.tbl_finance_structure USING btree (is_active) WHERE (is_active = true)`
- `idx_finance_structure_project` — `CREATE INDEX idx_finance_structure_project ON landscape.tbl_finance_structure USING btree (project_id)`
- `idx_finance_structure_scenario` — `CREATE INDEX idx_finance_structure_scenario ON landscape.tbl_finance_structure USING btree (scenario_id)`
- `idx_finance_structure_type` — `CREATE INDEX idx_finance_structure_type ON landscape.tbl_finance_structure USING btree (structure_type)`
- `tbl_finance_structure_pkey` — `CREATE UNIQUE INDEX tbl_finance_structure_pkey ON landscape.tbl_finance_structure USING btree (finance_structure_id)`
- `unique_structure_code` — `CREATE UNIQUE INDEX unique_structure_code ON landscape.tbl_finance_structure USING btree (project_id, structure_code)`

**Check Constraints:**
- `CHECK (((allocation_method)::text = ANY ((ARRAY['equal'::character varying, 'by_area'::character varying, 'by_units'::character varying, 'by_custom_pct'::character varying])::text[])))`
- `CHECK (((recurrence_frequency IS NULL) OR ((recurrence_frequency)::text = ANY ((ARRAY['annual'::character varying, 'monthly'::character varying, 'quarterly'::character varying])::text[]))))`
- `CHECK (((structure_type)::text = ANY ((ARRAY['capital_cost_pool'::character varying, 'operating_obligation_pool'::character varying])::text[])))`

## tbl_global_benchmark_registry
**Row Count (estimated):** 22
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| benchmark_id | bigint | NO | nextval('tbl_global_benchmark_registry_benchmark_id_seq'::regclass) | — |
| user_id | text | NO | — | — |
| category | character varying(50) | NO | — | — |
| subcategory | character varying(100) | YES | — | — |
| benchmark_name | character varying(200) | NO | — | — |
| description | text | YES | — | — |
| market_geography | character varying(100) | YES | — | — |
| property_type | character varying(50) | YES | — | — |
| source_type | character varying(50) | NO | — | — |
| source_document_id | bigint | YES | — | core_doc.doc_id |
| source_project_id | bigint | YES | — | tbl_project.project_id |
| extraction_date | date | YES | — | — |
| confidence_level | character varying(20) | YES | 'medium'::character varying | — |
| usage_count | integer | YES | 0 | — |
| as_of_date | date | NO | CURRENT_DATE | — |
| cpi_index_value | numeric(10,4) | YES | — | — |
| context_metadata | jsonb | YES | — | — |
| is_active | boolean | YES | true | — |
| is_global | boolean | YES | false | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| created_by | text | YES | — | — |
| updated_by | text | YES | — | — |

**Indexes:**
- `idx_benchmark_registry_active` — `CREATE INDEX idx_benchmark_registry_active ON landscape.tbl_global_benchmark_registry USING btree (is_active)`
- `idx_benchmark_registry_as_of_date` — `CREATE INDEX idx_benchmark_registry_as_of_date ON landscape.tbl_global_benchmark_registry USING btree (as_of_date)`
- `idx_benchmark_registry_category` — `CREATE INDEX idx_benchmark_registry_category ON landscape.tbl_global_benchmark_registry USING btree (category, subcategory)`
- `idx_benchmark_registry_geography` — `CREATE INDEX idx_benchmark_registry_geography ON landscape.tbl_global_benchmark_registry USING btree (market_geography)`
- `idx_benchmark_registry_property_type` — `CREATE INDEX idx_benchmark_registry_property_type ON landscape.tbl_global_benchmark_registry USING btree (property_type)`
- `idx_benchmark_registry_user` — `CREATE INDEX idx_benchmark_registry_user ON landscape.tbl_global_benchmark_registry USING btree (user_id)`
- `tbl_global_benchmark_registry_pkey` — `CREATE UNIQUE INDEX tbl_global_benchmark_registry_pkey ON landscape.tbl_global_benchmark_registry USING btree (benchmark_id)`

**Check Constraints:**
- `CHECK (((category)::text = ANY ((ARRAY['growth_rate'::character varying, 'transaction_cost'::character varying, 'unit_cost'::character varying, 'absorption'::character varying, 'contingency'::character varying, 'market_timing'::character varying, 'land_use_pricing'::character varying, 'commission'::character varying, 'op_cost'::character varying, 'income'::character varying, 'capital_stack'::character varying, 'debt_standard'::character varying])::text[])))`
- `CHECK (((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[])))`
- `CHECK (((source_type)::text = ANY ((ARRAY['user_input'::character varying, 'document_extraction'::character varying, 'project_data'::character varying, 'system_default'::character varying])::text[])))`

## tbl_hbu_analysis
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| hbu_id | bigint | NO | nextval('tbl_hbu_analysis_hbu_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| scenario_name | character varying(200) | NO | — | — |
| scenario_type | character varying(50) | NO | — | — |
| legal_permissible | boolean | YES | — | — |
| legal_zoning_code | character varying(100) | YES | — | — |
| legal_zoning_source_doc_id | bigint | YES | — | core_doc.doc_id |
| legal_permitted_uses | jsonb | YES | — | — |
| legal_requires_variance | boolean | YES | false | — |
| legal_variance_type | character varying(200) | YES | — | — |
| legal_narrative | text | YES | — | — |
| physical_possible | boolean | YES | — | — |
| physical_site_adequate | boolean | YES | — | — |
| physical_topography_suitable | boolean | YES | — | — |
| physical_utilities_available | boolean | YES | — | — |
| physical_access_adequate | boolean | YES | — | — |
| physical_constraints | jsonb | YES | — | — |
| physical_narrative | text | YES | — | — |
| economic_feasible | boolean | YES | — | — |
| economic_development_cost | numeric(15,2) | YES | — | — |
| economic_stabilized_value | numeric(15,2) | YES | — | — |
| economic_residual_land_value | numeric(15,2) | YES | — | — |
| economic_profit_margin_pct | numeric(5,2) | YES | — | — |
| economic_irr_pct | numeric(5,2) | YES | — | — |
| economic_feasibility_threshold | character varying(50) | YES | — | — |
| economic_narrative | text | YES | — | — |
| is_maximally_productive | boolean | YES | false | — |
| productivity_rank | integer | YES | — | — |
| productivity_metric | character varying(50) | YES | — | — |
| productivity_narrative | text | YES | — | — |
| conclusion_use_type | character varying(200) | YES | — | — |
| conclusion_density | character varying(100) | YES | — | — |
| conclusion_summary | text | YES | — | — |
| conclusion_full_narrative | text | YES | — | — |
| status | character varying(50) | YES | 'draft'::character varying | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |
| updated_by | text | YES | — | — |

**Indexes:**
- `idx_hbu_maximally_productive` — `CREATE INDEX idx_hbu_maximally_productive ON landscape.tbl_hbu_analysis USING btree (project_id, is_maximally_productive) WHERE (is_maximally_productive = true)`
- `idx_hbu_project` — `CREATE INDEX idx_hbu_project ON landscape.tbl_hbu_analysis USING btree (project_id)`
- `idx_hbu_scenario_type` — `CREATE INDEX idx_hbu_scenario_type ON landscape.tbl_hbu_analysis USING btree (project_id, scenario_type)`
- `idx_hbu_status` — `CREATE INDEX idx_hbu_status ON landscape.tbl_hbu_analysis USING btree (project_id, status)`
- `tbl_hbu_analysis_pkey` — `CREATE UNIQUE INDEX tbl_hbu_analysis_pkey ON landscape.tbl_hbu_analysis USING btree (hbu_id)`

**Check Constraints:**
- `CHECK (((scenario_type)::text = ANY ((ARRAY['as_vacant'::character varying, 'as_improved'::character varying, 'alternative'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'ai_generated'::character varying, 'user_reviewed'::character varying, 'final'::character varying])::text[])))`

## tbl_hbu_comparable_use
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| comparable_use_id | bigint | NO | nextval('tbl_hbu_comparable_use_comparable_use_id_seq'::regclass) | — |
| hbu_id | bigint | NO | — | tbl_hbu_analysis.hbu_id |
| use_name | character varying(200) | NO | — | — |
| use_category | character varying(100) | YES | — | — |
| is_legally_permissible | boolean | YES | — | — |
| is_physically_possible | boolean | YES | — | — |
| is_economically_feasible | boolean | YES | — | — |
| proposed_density | character varying(100) | YES | — | — |
| development_cost | numeric(15,2) | YES | — | — |
| stabilized_value | numeric(15,2) | YES | — | — |
| residual_land_value | numeric(15,2) | YES | — | — |
| irr_pct | numeric(5,2) | YES | — | — |
| feasibility_rank | integer | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_hbu_comparable_use_hbu` — `CREATE INDEX idx_hbu_comparable_use_hbu ON landscape.tbl_hbu_comparable_use USING btree (hbu_id)`
- `idx_hbu_comparable_use_rank` — `CREATE INDEX idx_hbu_comparable_use_rank ON landscape.tbl_hbu_comparable_use USING btree (hbu_id, feasibility_rank)`
- `tbl_hbu_comparable_use_pkey` — `CREATE UNIQUE INDEX tbl_hbu_comparable_use_pkey ON landscape.tbl_hbu_comparable_use USING btree (comparable_use_id)`

## tbl_hbu_zoning_document
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| zoning_doc_id | bigint | NO | nextval('tbl_hbu_zoning_document_zoning_doc_id_seq'::regclass) | — |
| hbu_id | bigint | NO | — | tbl_hbu_analysis.hbu_id |
| document_id | bigint | NO | — | core_doc.doc_id |
| jurisdiction_name | character varying(200) | YES | — | — |
| zoning_designation | character varying(100) | YES | — | — |
| permitted_uses_extracted | jsonb | YES | — | — |
| conditional_uses_extracted | jsonb | YES | — | — |
| prohibited_uses_extracted | jsonb | YES | — | — |
| development_standards_extracted | jsonb | YES | — | — |
| extraction_confidence | numeric(5,4) | YES | — | — |
| extraction_date | timestamp with time zone | YES | — | — |
| user_verified | boolean | YES | false | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_hbu_zoning_doc_document` — `CREATE INDEX idx_hbu_zoning_doc_document ON landscape.tbl_hbu_zoning_document USING btree (document_id)`
- `idx_hbu_zoning_doc_hbu` — `CREATE INDEX idx_hbu_zoning_doc_hbu ON landscape.tbl_hbu_zoning_document USING btree (hbu_id)`
- `tbl_hbu_zoning_document_pkey` — `CREATE UNIQUE INDEX tbl_hbu_zoning_document_pkey ON landscape.tbl_hbu_zoning_document USING btree (zoning_doc_id)`

## tbl_income_approach
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| income_approach_id | integer | NO | nextval('tbl_income_approach_income_approach_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| market_cap_rate_method | character varying(50) | YES | — | — |
| selected_cap_rate | numeric(5,4) | YES | — | — |
| cap_rate_justification | text | YES | — | — |
| direct_cap_value | numeric(15,2) | YES | — | — |
| forecast_period_years | integer | YES | — | — |
| terminal_cap_rate | numeric(5,4) | YES | — | — |
| discount_rate | numeric(5,4) | YES | — | — |
| dcf_value | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| noi_capitalization_basis | character varying(20) | YES | 'forward_12'::character varying | — |
| stabilized_vacancy_rate | numeric(5,4) | YES | 0.05 | — |
| cap_rate_interval | numeric(5,4) | YES | 0.0050 | — |
| discount_rate_interval | numeric(5,4) | YES | 0.0050 | — |

**Indexes:**
- `idx_income_approach_project` — `CREATE UNIQUE INDEX idx_income_approach_project ON landscape.tbl_income_approach USING btree (project_id)`
- `tbl_income_approach_pkey` — `CREATE UNIQUE INDEX tbl_income_approach_pkey ON landscape.tbl_income_approach USING btree (income_approach_id)`

**Check Constraints:**
- `CHECK (((market_cap_rate_method)::text = ANY ((ARRAY['comp_sales'::character varying, 'band_investment'::character varying, 'investor_survey'::character varying, 'other'::character varying])::text[])))`
- `CHECK (((noi_capitalization_basis)::text = ANY ((ARRAY['trailing_12'::character varying, 'forward_12'::character varying, 'avg_straddle'::character varying, 'stabilized'::character varying])::text[])))`
- `CHECK (((selected_cap_rate IS NULL) OR ((selected_cap_rate >= 0.01) AND (selected_cap_rate <= 0.15))))`
- `CHECK (((stabilized_vacancy_rate IS NULL) OR ((stabilized_vacancy_rate >= (0)::numeric) AND (stabilized_vacancy_rate <= 0.50))))`
- `CHECK (((terminal_cap_rate IS NULL) OR ((terminal_cap_rate >= 0.01) AND (terminal_cap_rate <= 0.15))))`

## tbl_income_property
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| income_property_id | integer | NO | nextval('tbl_income_property_income_property_id_seq'::regclass) | — |
| project_id | integer | YES | — | tbl_project.project_id |
| parcel_id | integer | YES | — | tbl_parcel.parcel_id |
| property_name | character varying(200) | YES | — | — |
| property_type | character varying(50) | YES | — | — |
| property_subtype | character varying(50) | YES | — | — |
| total_building_sf | numeric(12,2) | YES | — | — |
| rentable_sf | numeric(12,2) | YES | — | — |
| usable_sf | numeric(12,2) | YES | — | — |
| common_area_sf | numeric(12,2) | YES | — | — |
| load_factor | numeric(5,4) | YES | — | — |
| year_built | integer | YES | — | — |
| year_renovated | integer | YES | — | — |
| number_of_floors | integer | YES | — | — |
| number_of_units | integer | YES | — | — |
| parking_spaces | integer | YES | — | — |
| parking_ratio | numeric(5,2) | YES | — | — |
| property_status | character varying(50) | YES | — | — |
| stabilization_date | date | YES | — | — |
| stabilized_occupancy_pct | numeric(5,2) | YES | — | — |
| acquisition_date | date | YES | — | — |
| acquisition_price | numeric(15,2) | YES | — | — |
| current_assessed_value | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| property_type_code | character varying(10) | YES | 'CRE'::character varying | — |

**Indexes:**
- `idx_cre_property_status` — `CREATE INDEX idx_cre_property_status ON landscape.tbl_income_property USING btree (property_status)`
- `idx_cre_property_type` — `CREATE INDEX idx_cre_property_type ON landscape.tbl_income_property USING btree (property_type)`
- `idx_income_property_project` — `CREATE INDEX idx_income_property_project ON landscape.tbl_income_property USING btree (project_id)`
- `tbl_cre_property_pkey` — `CREATE UNIQUE INDEX tbl_cre_property_pkey ON landscape.tbl_income_property USING btree (income_property_id)`

## tbl_income_property_ind_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| income_property_id | integer | NO | — | tbl_income_property.income_property_id |
| industrial_type | character varying(50) | YES | — | — |
| building_class | character varying(10) | YES | — | — |
| clear_height_ft | numeric(6,2) | YES | — | — |
| min_clear_height_ft | numeric(6,2) | YES | — | — |
| column_spacing | character varying(50) | YES | — | — |
| floor_thickness_inches | numeric(4,1) | YES | — | — |
| floor_load_psf | numeric(8,2) | YES | — | — |
| dock_high_doors | integer | YES | 0 | — |
| grade_level_doors | integer | YES | 0 | — |
| drive_in_doors | integer | YES | 0 | — |
| dock_door_ratio | numeric(8,4) | YES | — | — |
| dock_levelers | integer | YES | 0 | — |
| dock_seals | integer | YES | 0 | — |
| truck_court_depth_ft | numeric(8,2) | YES | — | — |
| trailer_parking_spaces | integer | YES | 0 | — |
| auto_parking_spaces | integer | YES | 0 | — |
| secured_truck_yard | boolean | YES | false | — |
| electrical_service | character varying(50) | YES | — | — |
| electrical_amps | integer | YES | — | — |
| electrical_volts | integer | YES | — | — |
| backup_generator | boolean | YES | false | — |
| generator_kw | integer | YES | — | — |
| sprinkler_system | character varying(50) | YES | — | — |
| sprinkler_density | character varying(50) | YES | — | — |
| fire_pump | boolean | YES | false | — |
| fire_pump_gpm | integer | YES | — | — |
| hvac_type | character varying(50) | YES | — | — |
| office_hvac_tons | integer | YES | — | — |
| warehouse_hvac_tons | integer | YES | — | — |
| rail_served | boolean | YES | false | — |
| rail_car_capacity | integer | YES | — | — |
| rail_siding_ft | numeric(8,2) | YES | — | — |
| phase_1_date | date | YES | — | — |
| phase_2_required | boolean | YES | false | — |
| environmental_issues | text | YES | — | — |
| food_grade | boolean | YES | false | — |
| pharma_grade | boolean | YES | false | — |
| temperature_controlled | boolean | YES | false | — |
| temperature_zones | integer | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_income_property_ind_clear_height` — `CREATE INDEX idx_income_property_ind_clear_height ON landscape.tbl_income_property_ind_ext USING btree (clear_height_ft)`
- `idx_income_property_ind_type` — `CREATE INDEX idx_income_property_ind_type ON landscape.tbl_income_property_ind_ext USING btree (industrial_type)`
- `tbl_income_property_ind_ext_pkey` — `CREATE UNIQUE INDEX tbl_income_property_ind_ext_pkey ON landscape.tbl_income_property_ind_ext USING btree (income_property_id)`

## tbl_income_property_mf_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| income_property_id | integer | NO | — | tbl_income_property.income_property_id |
| total_units | integer | YES | — | — |
| total_bedrooms | integer | YES | — | — |
| avg_unit_sf | numeric(10,2) | YES | — | — |
| studio_count | integer | YES | 0 | — |
| one_bed_count | integer | YES | 0 | — |
| two_bed_count | integer | YES | 0 | — |
| three_bed_count | integer | YES | 0 | — |
| four_plus_bed_count | integer | YES | 0 | — |
| has_pool | boolean | YES | false | — |
| has_fitness_center | boolean | YES | false | — |
| has_clubhouse | boolean | YES | false | — |
| has_business_center | boolean | YES | false | — |
| has_pet_park | boolean | YES | false | — |
| has_ev_charging | boolean | YES | false | — |
| has_package_lockers | boolean | YES | false | — |
| has_controlled_access | boolean | YES | false | — |
| surface_parking_spaces | integer | YES | 0 | — |
| covered_parking_spaces | integer | YES | 0 | — |
| garage_parking_spaces | integer | YES | 0 | — |
| parking_revenue_monthly | numeric(12,2) | YES | — | — |
| utility_billing_type | character varying(50) | YES | — | — |
| water_metering | character varying(50) | YES | — | — |
| electric_metering | character varying(50) | YES | — | — |
| gas_metering | character varying(50) | YES | — | — |
| class_rating | character varying(10) | YES | — | — |
| repositioning_potential | boolean | YES | false | — |
| value_add_score | integer | YES | — | — |
| is_rent_controlled | boolean | YES | false | — |
| rent_control_jurisdiction | character varying(100) | YES | — | — |
| allowable_annual_increase_pct | numeric(5,2) | YES | — | — |
| has_affordable_units | boolean | YES | false | — |
| affordable_unit_count | integer | YES | 0 | — |
| lihtc_expiration_date | date | YES | — | — |
| section_8_contract_date | date | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_income_property_mf_class` — `CREATE INDEX idx_income_property_mf_class ON landscape.tbl_income_property_mf_ext USING btree (class_rating)`
- `tbl_income_property_mf_ext_pkey` — `CREATE UNIQUE INDEX tbl_income_property_mf_ext_pkey ON landscape.tbl_income_property_mf_ext USING btree (income_property_id)`

## tbl_income_property_ret_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| income_property_id | integer | NO | — | tbl_income_property.income_property_id |
| retail_type | character varying(50) | YES | — | — |
| anchor_count | integer | YES | 0 | — |
| junior_anchor_count | integer | YES | 0 | — |
| inline_shop_count | integer | YES | — | — |
| pad_site_count | integer | YES | 0 | — |
| outparcel_count | integer | YES | 0 | — |
| daily_traffic_count | integer | YES | — | — |
| traffic_count_date | date | YES | — | — |
| signalized_intersection | boolean | YES | false | — |
| highway_visibility | boolean | YES | false | — |
| pylon_sign | boolean | YES | false | — |
| monument_sign | boolean | YES | false | — |
| population_1_mile | integer | YES | — | — |
| population_3_mile | integer | YES | — | — |
| population_5_mile | integer | YES | — | — |
| median_hh_income_3_mile | numeric(12,2) | YES | — | — |
| daytime_population_3_mile | integer | YES | — | — |
| parking_ratio | numeric(5,2) | YES | — | — |
| surface_parking_spaces | integer | YES | — | — |
| structured_parking_spaces | integer | YES | — | — |
| parking_field_condition | character varying(50) | YES | — | — |
| national_tenant_pct | numeric(5,2) | YES | — | — |
| regional_tenant_pct | numeric(5,2) | YES | — | — |
| local_tenant_pct | numeric(5,2) | YES | — | — |
| food_tenant_pct | numeric(5,2) | YES | — | — |
| service_tenant_pct | numeric(5,2) | YES | — | — |
| sales_psf_inline | numeric(10,2) | YES | — | — |
| sales_psf_anchor | numeric(10,2) | YES | — | — |
| occupancy_cost_ratio | numeric(5,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_income_property_ret_type` — `CREATE INDEX idx_income_property_ret_type ON landscape.tbl_income_property_ret_ext USING btree (retail_type)`
- `tbl_income_property_ret_ext_pkey` — `CREATE UNIQUE INDEX tbl_income_property_ret_ext_pkey ON landscape.tbl_income_property_ret_ext USING btree (income_property_id)`

## tbl_inventory_item
**Row Count (estimated):** 51
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| item_id | bigint | NO | nextval('tbl_inventory_item_item_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| property_type | character varying(50) | NO | — | — |
| item_code | character varying(100) | NO | — | — |
| hierarchy_values | jsonb | YES | '{}'::jsonb | — |
| container_id | bigint | YES | — | tbl_division.division_id |
| data_values | jsonb | YES | '{}'::jsonb | — |
| available_date | date | YES | — | — |
| absorption_month | integer | YES | — | — |
| lease_start_date | date | YES | — | — |
| lease_end_date | date | YES | — | — |
| status | character varying(50) | YES | — | — |
| is_speculative | boolean | YES | false | — |
| is_active | boolean | YES | true | — |
| sort_order | integer | YES | 0 | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| family_id | bigint | YES | — | lu_family.family_id |
| type_id | bigint | YES | — | lu_type.type_id |
| product_id | bigint | YES | — | res_lot_product.product_id |
| density_code | character varying(10) | YES | — | — |

**Indexes:**
- `idx_inventory_active` — `CREATE INDEX idx_inventory_active ON landscape.tbl_inventory_item USING btree (is_active) WHERE (is_active = true)`
- `idx_inventory_code` — `CREATE INDEX idx_inventory_code ON landscape.tbl_inventory_item USING btree (item_code)`
- `idx_inventory_container` — `CREATE INDEX idx_inventory_container ON landscape.tbl_inventory_item USING btree (container_id)`
- `idx_inventory_data_gin` — `CREATE INDEX idx_inventory_data_gin ON landscape.tbl_inventory_item USING gin (data_values)`
- `idx_inventory_family` — `CREATE INDEX idx_inventory_family ON landscape.tbl_inventory_item USING btree (family_id)`
- `idx_inventory_hierarchy_gin` — `CREATE INDEX idx_inventory_hierarchy_gin ON landscape.tbl_inventory_item USING gin (hierarchy_values)`
- `idx_inventory_product` — `CREATE INDEX idx_inventory_product ON landscape.tbl_inventory_item USING btree (product_id)`
- `idx_inventory_project` — `CREATE INDEX idx_inventory_project ON landscape.tbl_inventory_item USING btree (project_id)`
- `idx_inventory_status` — `CREATE INDEX idx_inventory_status ON landscape.tbl_inventory_item USING btree (status)`
- `idx_inventory_type` — `CREATE INDEX idx_inventory_type ON landscape.tbl_inventory_item USING btree (property_type)`
- `tbl_inventory_item_pkey` — `CREATE UNIQUE INDEX tbl_inventory_item_pkey ON landscape.tbl_inventory_item USING btree (item_id)`
- `uq_inventory_item_code` — `CREATE UNIQUE INDEX uq_inventory_item_code ON landscape.tbl_inventory_item USING btree (project_id, item_code)`

## tbl_item_dependency
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| dependency_id | bigint | NO | nextval('tbl_item_dependency_dependency_id_seq'::regclass) | — |
| dependent_item_type | character varying(50) | NO | — | — |
| dependent_item_table | character varying(100) | NO | — | — |
| dependent_item_id | bigint | NO | — | — |
| trigger_item_type | character varying(50) | YES | — | — |
| trigger_item_table | character varying(100) | YES | — | — |
| trigger_item_id | bigint | YES | — | — |
| trigger_event | character varying(50) | NO | 'ABSOLUTE'::character varying | — |
| trigger_value | numeric(15,2) | YES | — | — |
| offset_periods | integer | YES | 0 | — |
| is_hard_dependency | boolean | YES | false | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_item_dependency_dependent` — `CREATE INDEX idx_item_dependency_dependent ON landscape.tbl_item_dependency USING btree (dependent_item_type, dependent_item_id)`
- `idx_item_dependency_trigger` — `CREATE INDEX idx_item_dependency_trigger ON landscape.tbl_item_dependency USING btree (trigger_item_type, trigger_item_id)`
- `tbl_item_dependency_pkey` — `CREATE UNIQUE INDEX tbl_item_dependency_pkey ON landscape.tbl_item_dependency USING btree (dependency_id)`

**Check Constraints:**
- `CHECK (((dependent_item_type)::text = ANY ((ARRAY['COST'::character varying, 'REVENUE'::character varying, 'FINANCING'::character varying])::text[])))`
- `CHECK (((trigger_event)::text = ANY ((ARRAY['ABSOLUTE'::character varying, 'START'::character varying, 'COMPLETE'::character varying, 'PCT_COMPLETE'::character varying, 'CUMULATIVE_AMOUNT'::character varying, 'UNIT_COUNT'::character varying, 'PERIOD_COUNT'::character varying])::text[])))`

## tbl_land_comp_adjustments
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| adjustment_id | integer | NO | — | — |
| adjustment_type | character varying(50) | NO | — | — |
| adjustment_pct | numeric(6,3) | YES | — | — |
| adjustment_amount | numeric(12,2) | YES | — | — |
| justification | text | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| land_comparable_id | integer | NO | — | tbl_land_comparables.land_comparable_id |

**Indexes:**
- `tbl_land_comp_adjustments_land_comparable_id_366c2e08` — `CREATE INDEX tbl_land_comp_adjustments_land_comparable_id_366c2e08 ON landscape.tbl_land_comp_adjustments USING btree (land_comparable_id)`
- `tbl_land_comp_adjustments_pkey` — `CREATE UNIQUE INDEX tbl_land_comp_adjustments_pkey ON landscape.tbl_land_comp_adjustments USING btree (adjustment_id)`

## tbl_land_comparables
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| land_comparable_id | integer | NO | — | — |
| comp_number | integer | YES | — | — |
| address | character varying(255) | YES | — | — |
| city | character varying(100) | YES | — | — |
| state | character varying(2) | YES | — | — |
| zip | character varying(10) | YES | — | — |
| sale_date | date | YES | — | — |
| sale_price | numeric(15,2) | YES | — | — |
| land_area_sf | numeric(12,2) | YES | — | — |
| land_area_acres | numeric(10,4) | YES | — | — |
| price_per_sf | numeric(10,2) | YES | — | — |
| price_per_acre | numeric(12,2) | YES | — | — |
| zoning | character varying(100) | YES | — | — |
| source | character varying(100) | YES | — | — |
| latitude | numeric(10,7) | YES | — | — |
| longitude | numeric(10,7) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |

**Indexes:**
- `tbl_land_comparables_pkey` — `CREATE UNIQUE INDEX tbl_land_comparables_pkey ON landscape.tbl_land_comparables USING btree (land_comparable_id)`
- `tbl_land_comparables_project_id_ed54f396` — `CREATE INDEX tbl_land_comparables_project_id_ed54f396 ON landscape.tbl_land_comparables USING btree (project_id)`

## tbl_landuse
**Row Count (estimated):** 36
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| landuse_id | integer | NO | — | — |
| landuse_code | character varying(10) | NO | — | — |
| landuse_type | character varying(50) | YES | — | — |
| type_id | integer | YES | — | lu_type.type_id |
| name | character varying(100) | YES | — | — |
| description | text | YES | — | — |
| active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| subtype_id | integer | YES | — | — |

**Indexes:**
- `idx_tbl_landuse_active` — `CREATE INDEX idx_tbl_landuse_active ON landscape.tbl_landuse USING btree (active)`
- `idx_tbl_landuse_code` — `CREATE INDEX idx_tbl_landuse_code ON landscape.tbl_landuse USING btree (landuse_code)`
- `idx_tbl_landuse_subtype` — `CREATE INDEX idx_tbl_landuse_subtype ON landscape.tbl_landuse USING btree (type_id)`
- `tbl_landuse_landuse_code_key` — `CREATE UNIQUE INDEX tbl_landuse_landuse_code_key ON landscape.tbl_landuse USING btree (landuse_code)`
- `tbl_landuse_pkey` — `CREATE UNIQUE INDEX tbl_landuse_pkey ON landscape.tbl_landuse USING btree (landuse_id)`

## tbl_landuse_program
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| landuse_code | character varying(64) | NO | — | — |
| rsf_to_gfa_eff | numeric(5,3) | YES | — | — |
| employee_density | numeric(10,2) | YES | — | — |
| floor_plate_efficiency | numeric(5,2) | YES | — | — |
| clear_height_ft | numeric(6,2) | YES | — | — |
| loading_dock_ratio | numeric(8,3) | YES | — | — |
| truck_court_depth_ft | numeric(6,2) | YES | — | — |
| trailer_parking_ratio | numeric(8,3) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `tbl_landuse_program_pkey` — `CREATE UNIQUE INDEX tbl_landuse_program_pkey ON landscape.tbl_landuse_program USING btree (landuse_code)`

## tbl_lease
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lease_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| parcel_id | integer | YES | — | tbl_parcel.parcel_id |
| lot_id | integer | YES | — | tbl_lot.lot_id |
| tenant_name | character varying(255) | NO | — | — |
| tenant_contact | character varying(255) | YES | — | — |
| tenant_email | character varying(255) | YES | — | — |
| tenant_phone | character varying(50) | YES | — | — |
| tenant_classification | character varying(50) | YES | — | — |
| lease_status | character varying(50) | YES | 'Speculative'::character varying | — |
| lease_type | character varying(50) | YES | — | — |
| suite_number | character varying(50) | YES | — | — |
| floor_number | integer | YES | — | — |
| lease_execution_date | date | YES | — | — |
| lease_commencement_date | date | NO | — | — |
| rent_start_date | date | YES | — | — |
| lease_expiration_date | date | NO | — | — |
| lease_term_months | integer | NO | — | — |
| leased_sf | numeric(12,2) | NO | — | — |
| usable_sf | numeric(12,2) | YES | — | — |
| number_of_renewal_options | integer | YES | 0 | — |
| renewal_option_term_months | integer | YES | — | — |
| renewal_notice_months | integer | YES | — | — |
| renewal_probability_pct | numeric(5,2) | YES | 50.00 | — |
| early_termination_allowed | boolean | YES | false | — |
| termination_notice_months | integer | YES | — | — |
| termination_penalty_amount | numeric(15,2) | YES | — | — |
| security_deposit_amount | numeric(15,2) | YES | — | — |
| security_deposit_months | integer | YES | — | — |
| affects_occupancy | boolean | YES | true | — |
| expansion_rights | boolean | YES | false | — |
| right_of_first_refusal | boolean | YES | false | — |
| exclusive_use_clause | text | YES | — | — |
| co_tenancy_clause | text | YES | — | — |
| radius_restriction | character varying(255) | YES | — | — |
| notes | text | YES | — | — |
| lease_metadata | jsonb | YES | '{}'::jsonb | — |
| created_at | timestamp with time zone | YES | now() | — |
| created_by | character varying(100) | YES | — | — |
| updated_at | timestamp with time zone | YES | now() | — |
| updated_by | character varying(100) | YES | — | — |
| lease_type_code | character varying(10) | YES | 'CRE'::character varying | — |

**Indexes:**
- `idx_lease_expiration` — `CREATE INDEX idx_lease_expiration ON landscape.tbl_lease USING btree (lease_expiration_date)`
- `idx_lease_lot` — `CREATE INDEX idx_lease_lot ON landscape.tbl_lease USING btree (lot_id)`
- `idx_lease_parcel` — `CREATE INDEX idx_lease_parcel ON landscape.tbl_lease USING btree (parcel_id)`
- `idx_lease_project` — `CREATE INDEX idx_lease_project ON landscape.tbl_lease USING btree (project_id)`
- `idx_lease_status` — `CREATE INDEX idx_lease_status ON landscape.tbl_lease USING btree (lease_status, affects_occupancy)`
- `idx_lease_tenant` — `CREATE INDEX idx_lease_tenant ON landscape.tbl_lease USING btree (tenant_name)`
- `tbl_lease_pkey` — `CREATE UNIQUE INDEX tbl_lease_pkey ON landscape.tbl_lease USING btree (lease_id)`

**Check Constraints:**
- `CHECK ((lease_end_date > lease_start_date))`
- `CHECK ((lease_expiration_date >= lease_commencement_date))`

## tbl_lease_assumptions
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| assumption_id | bigint | NO | nextval('tbl_lease_assumptions_assumption_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| space_type | character varying(50) | NO | — | — |
| market_rent_psf_annual | numeric(10,2) | NO | — | — |
| market_rent_growth_rate | numeric(6,5) | YES | 0.025 | — |
| renewal_probability | numeric(5,4) | YES | 0.70 | — |
| downtime_months | integer | YES | 6 | — |
| ti_psf_renewal | numeric(10,2) | YES | 0 | — |
| ti_psf_new_tenant | numeric(10,2) | YES | 0 | — |
| lc_psf_renewal | numeric(10,2) | YES | 0 | — |
| lc_psf_new_tenant | numeric(10,2) | YES | 0 | — |
| free_rent_months_renewal | integer | YES | 0 | — |
| free_rent_months_new_tenant | integer | YES | 3 | — |
| effective_date | date | YES | CURRENT_DATE | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_lease_assumptions_project` — `CREATE INDEX idx_lease_assumptions_project ON landscape.tbl_lease_assumptions USING btree (project_id)`
- `idx_lease_assumptions_space_type` — `CREATE INDEX idx_lease_assumptions_space_type ON landscape.tbl_lease_assumptions USING btree (space_type)`
- `tbl_lease_assumptions_pkey` — `CREATE UNIQUE INDEX tbl_lease_assumptions_pkey ON landscape.tbl_lease_assumptions USING btree (assumption_id)`
- `tbl_lease_assumptions_project_id_space_type_effective_date_key` — `CREATE UNIQUE INDEX tbl_lease_assumptions_project_id_space_type_effective_date_key ON landscape.tbl_lease_assumptions USING btree (project_id, space_type, effective_date)`

**Check Constraints:**
- `CHECK (((renewal_probability >= (0)::numeric) AND (renewal_probability <= (1)::numeric)))`
- `CHECK (((space_type)::text = ANY ((ARRAY['OFFICE'::character varying, 'RETAIL'::character varying, 'INDUSTRIAL'::character varying, 'MEDICAL'::character varying, 'FLEX'::character varying, 'OTHER'::character varying])::text[])))`

## tbl_lease_ind_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lease_id | integer | NO | — | tbl_lease.lease_id |
| rent_structure | character varying(50) | YES | — | — |
| cam_includes_roof | boolean | YES | true | — |
| cam_includes_structure | boolean | YES | true | — |
| cam_includes_parking | boolean | YES | true | — |
| management_fee_pct | numeric(5,2) | YES | — | — |
| landlord_ti_allowance | numeric(12,2) | YES | — | — |
| landlord_ti_psf | numeric(8,2) | YES | — | — |
| tenant_ti_investment | numeric(12,2) | YES | — | — |
| clear_height_requirement_ft | numeric(6,2) | YES | — | — |
| dock_requirement | integer | YES | — | — |
| power_requirement_amps | integer | YES | — | — |
| operating_hours | character varying(100) | YES | — | — |
| hazmat_use | boolean | YES | false | — |
| hazmat_description | text | YES | — | — |
| expansion_option_sf | numeric(10,2) | YES | — | — |
| expansion_option_rent_psf | numeric(8,2) | YES | — | — |
| contraction_option | boolean | YES | false | — |
| contraction_date | date | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `tbl_lease_ind_ext_pkey` — `CREATE UNIQUE INDEX tbl_lease_ind_ext_pkey ON landscape.tbl_lease_ind_ext USING btree (lease_id)`

## tbl_lease_mf_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lease_id | integer | NO | — | tbl_lease.lease_id |
| base_rent_monthly | numeric(10,2) | YES | — | — |
| pet_rent_monthly | numeric(10,2) | YES | — | — |
| parking_rent_monthly | numeric(10,2) | YES | — | — |
| storage_rent_monthly | numeric(10,2) | YES | — | — |
| other_rent_monthly | numeric(10,2) | YES | — | — |
| move_in_concession | numeric(10,2) | YES | — | — |
| recurring_concession | numeric(10,2) | YES | — | — |
| concession_months | integer | YES | — | — |
| net_effective_rent | numeric(10,2) | YES | — | — |
| household_size | integer | YES | — | — |
| household_income | numeric(12,2) | YES | — | — |
| income_to_rent_ratio | numeric(5,2) | YES | — | — |
| mtm_rate_premium_pct | numeric(5,2) | YES | — | — |
| renewal_probability_pct | numeric(5,2) | YES | — | — |
| is_affordable_unit | boolean | YES | false | — |
| ami_percentage | integer | YES | — | — |
| voucher_type | character varying(50) | YES | — | — |
| voucher_amount | numeric(10,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `tbl_lease_mf_ext_pkey` — `CREATE UNIQUE INDEX tbl_lease_mf_ext_pkey ON landscape.tbl_lease_mf_ext USING btree (lease_id)`

## tbl_lease_ret_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lease_id | integer | NO | — | tbl_lease.lease_id |
| rent_structure | character varying(50) | YES | — | — |
| cam_base_year | integer | YES | — | — |
| cam_base_amount | numeric(12,2) | YES | — | — |
| cam_cap_amount | numeric(12,2) | YES | — | — |
| cam_cap_escalation_pct | numeric(5,2) | YES | — | — |
| cam_controllable_cap | boolean | YES | false | — |
| admin_fee_pct | numeric(5,2) | YES | — | — |
| tax_base_year | integer | YES | — | — |
| tax_base_amount | numeric(12,2) | YES | — | — |
| tax_cap_amount | numeric(12,2) | YES | — | — |
| insurance_base_year | integer | YES | — | — |
| insurance_base_amount | numeric(12,2) | YES | — | — |
| natural_breakpoint | boolean | YES | false | — |
| artificial_breakpoint | boolean | YES | false | — |
| breakpoint_amount | numeric(14,2) | YES | — | — |
| percentage_rate | numeric(5,2) | YES | — | — |
| percentage_rent_exclusions | text | YES | — | — |
| opening_co_tenancy | text | YES | — | — |
| operating_co_tenancy | text | YES | — | — |
| co_tenancy_remedy | character varying(50) | YES | — | — |
| rent_reduction_pct | numeric(5,2) | YES | — | — |
| exclusive_use_clause | text | YES | — | — |
| exclusive_radius_miles | numeric(5,2) | YES | — | — |
| kick_out_date | date | YES | — | — |
| kick_out_sales_threshold | numeric(14,2) | YES | — | — |
| assignment_fee | numeric(10,2) | YES | — | — |
| subletting_allowed | boolean | YES | false | — |
| profit_sharing_pct | numeric(5,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_lease_ret_structure` — `CREATE INDEX idx_lease_ret_structure ON landscape.tbl_lease_ret_ext USING btree (rent_structure)`
- `tbl_lease_ret_ext_pkey` — `CREATE UNIQUE INDEX tbl_lease_ret_ext_pkey ON landscape.tbl_lease_ret_ext USING btree (lease_id)`

## tbl_lease_revenue_timing
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| timing_id | bigint | NO | nextval('tbl_lease_revenue_timing_timing_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| lease_id | bigint | NO | — | tbl_rent_roll.rent_roll_id |
| period_id | integer | NO | — | — |
| base_rent | numeric(12,2) | YES | 0 | — |
| escalated_rent | numeric(12,2) | YES | 0 | — |
| percentage_rent | numeric(12,2) | YES | 0 | — |
| cam_recovery | numeric(12,2) | YES | 0 | — |
| tax_recovery | numeric(12,2) | YES | 0 | — |
| insurance_recovery | numeric(12,2) | YES | 0 | — |
| vacancy_loss | numeric(12,2) | YES | 0 | — |
| free_rent_adjustment | numeric(12,2) | YES | 0 | — |
| effective_gross_rent | numeric(12,2) | YES | 0 | — |
| calculation_date | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_lease_revenue_timing_lease` — `CREATE INDEX idx_lease_revenue_timing_lease ON landscape.tbl_lease_revenue_timing USING btree (lease_id)`
- `idx_lease_revenue_timing_period` — `CREATE INDEX idx_lease_revenue_timing_period ON landscape.tbl_lease_revenue_timing USING btree (period_id)`
- `idx_lease_revenue_timing_project` — `CREATE INDEX idx_lease_revenue_timing_project ON landscape.tbl_lease_revenue_timing USING btree (project_id)`
- `idx_lease_revenue_timing_project_period` — `CREATE INDEX idx_lease_revenue_timing_project_period ON landscape.tbl_lease_revenue_timing USING btree (project_id, period_id)`
- `tbl_lease_revenue_timing_lease_id_period_id_key` — `CREATE UNIQUE INDEX tbl_lease_revenue_timing_lease_id_period_id_key ON landscape.tbl_lease_revenue_timing USING btree (lease_id, period_id)`
- `tbl_lease_revenue_timing_pkey` — `CREATE UNIQUE INDEX tbl_lease_revenue_timing_pkey ON landscape.tbl_lease_revenue_timing USING btree (timing_id)`

## tbl_leasing_commission
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| commission_id | integer | NO | — | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| base_commission_pct | numeric(5,2) | YES | — | — |
| renewal_commission_pct | numeric(5,2) | YES | — | — |
| tiers | jsonb | YES | '[]'::jsonb | — |
| commission_amount | numeric(15,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_commission_lease` — `CREATE INDEX idx_commission_lease ON landscape.tbl_leasing_commission USING btree (lease_id)`
- `tbl_leasing_commission_pkey` — `CREATE UNIQUE INDEX tbl_leasing_commission_pkey ON landscape.tbl_leasing_commission USING btree (commission_id)`
- `uq_commission_lease` — `CREATE UNIQUE INDEX uq_commission_lease ON landscape.tbl_leasing_commission USING btree (lease_id)`

## tbl_loan
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| loan_id | bigint | NO | — | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| loan_name | character varying(255) | NO | — | — |
| loan_type | character varying(50) | NO | — | — |
| structure_type | character varying(20) | NO | 'TERM'::character varying | — |
| lender_name | character varying(255) | YES | — | — |
| seniority | integer | NO | 1 | — |
| status | character varying(20) | YES | 'active'::character varying | — |
| commitment_amount | numeric(15,2) | NO | — | — |
| loan_amount | numeric(15,2) | YES | — | — |
| loan_to_cost_pct | numeric(5,2) | YES | — | — |
| loan_to_value_pct | numeric(5,2) | YES | — | — |
| interest_rate_pct | numeric(6,3) | YES | — | — |
| interest_rate_decimal | numeric(6,5) | YES | — | — |
| interest_type | character varying(50) | YES | 'Fixed'::character varying | — |
| interest_index | character varying(50) | YES | — | — |
| interest_spread_bps | integer | YES | — | — |
| rate_floor_pct | numeric(6,3) | YES | — | — |
| rate_cap_pct | numeric(6,3) | YES | — | — |
| rate_reset_frequency | character varying(20) | YES | — | — |
| interest_calculation | character varying(50) | YES | 'SIMPLE'::character varying | — |
| interest_payment_method | character varying(50) | YES | 'paid_current'::character varying | — |
| loan_start_date | date | YES | — | — |
| loan_maturity_date | date | YES | — | — |
| maturity_period_id | bigint | YES | — | tbl_calculation_period.period_id |
| loan_term_months | integer | YES | — | — |
| loan_term_years | integer | YES | — | — |
| amortization_months | integer | YES | — | — |
| amortization_years | integer | YES | — | — |
| interest_only_months | integer | YES | 0 | — |
| payment_frequency | character varying(50) | YES | 'MONTHLY'::character varying | — |
| commitment_date | date | YES | — | — |
| origination_fee_pct | numeric(5,4) | YES | — | — |
| exit_fee_pct | numeric(5,3) | YES | — | — |
| unused_fee_pct | numeric(5,4) | YES | — | — |
| commitment_fee_pct | numeric(5,3) | YES | — | — |
| extension_fee_bps | integer | YES | — | — |
| extension_fee_amount | numeric(12,2) | YES | — | — |
| prepayment_penalty_years | integer | YES | — | — |
| interest_reserve_amount | numeric(15,2) | YES | — | — |
| interest_reserve_funded_upfront | boolean | YES | false | — |
| reserve_requirements | jsonb | YES | '{}'::jsonb | — |
| replacement_reserve_per_unit | numeric(8,2) | YES | — | — |
| tax_insurance_escrow_months | integer | YES | — | — |
| initial_reserve_months | integer | YES | — | — |
| covenants | jsonb | YES | '{}'::jsonb | — |
| loan_covenant_dscr_min | numeric(5,3) | YES | — | — |
| loan_covenant_ltv_max | numeric(5,2) | YES | — | — |
| loan_covenant_occupancy_min | numeric(5,2) | YES | — | — |
| covenant_test_frequency | character varying(20) | YES | 'Quarterly'::character varying | — |
| guarantee_type | character varying(50) | YES | — | — |
| guarantor_name | character varying(200) | YES | — | — |
| recourse_carveout_provisions | text | YES | — | — |
| extension_options | integer | YES | 0 | — |
| extension_option_years | integer | YES | — | — |
| draw_trigger_type | character varying(50) | YES | 'COST_INCURRED'::character varying | — |
| commitment_balance | numeric(15,2) | YES | — | — |
| drawn_to_date | numeric(15,2) | YES | 0 | — |
| is_construction_loan | boolean | YES | false | — |
| release_price_pct | numeric(5,2) | YES | — | — |
| minimum_release_amount | numeric(15,2) | YES | — | — |
| takes_out_loan_id | bigint | YES | — | tbl_loan.loan_id |
| can_participate_in_profits | boolean | YES | false | — |
| profit_participation_tier | integer | YES | — | — |
| profit_participation_pct | numeric(6,3) | YES | — | — |
| monthly_payment | numeric(12,2) | YES | — | — |
| annual_debt_service | numeric(12,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| created_by | text | YES | — | — |
| updated_by | text | YES | — | — |
| interest_reserve_inflator | numeric(5,2) | YES | 1.0 | — |
| repayment_acceleration | numeric(5,2) | YES | 1.0 | — |
| closing_costs_appraisal | numeric(12,2) | YES | — | — |
| closing_costs_legal | numeric(12,2) | YES | — | — |
| closing_costs_other | numeric(12,2) | YES | — | — |
| recourse_type | character varying(30) | YES | 'FULL'::character varying | — |
| collateral_basis_type | character varying(30) | YES | 'PROJECT_COST'::character varying | — |
| commitment_sizing_method | character varying(30) | YES | 'MANUAL'::character varying | — |
| ltv_basis_amount | numeric(15,2) | YES | — | — |
| ltc_basis_amount | numeric(15,2) | YES | — | — |
| calculated_commitment_amount | numeric(15,2) | YES | — | — |
| governing_constraint | character varying(10) | YES | — | — |
| net_loan_proceeds | numeric(15,2) | YES | — | — |

**Indexes:**
- `idx_loan_project` — `CREATE INDEX idx_loan_project ON landscape.tbl_loan USING btree (project_id)`
- `idx_loan_seniority` — `CREATE INDEX idx_loan_seniority ON landscape.tbl_loan USING btree (project_id, seniority)`
- `idx_loan_structure` — `CREATE INDEX idx_loan_structure ON landscape.tbl_loan USING btree (structure_type)`
- `idx_loan_takes_out` — `CREATE INDEX idx_loan_takes_out ON landscape.tbl_loan USING btree (takes_out_loan_id) WHERE (takes_out_loan_id IS NOT NULL)`
- `idx_loan_type` — `CREATE INDEX idx_loan_type ON landscape.tbl_loan USING btree (loan_type)`
- `tbl_loan_pkey` — `CREATE UNIQUE INDEX tbl_loan_pkey ON landscape.tbl_loan USING btree (loan_id)`

**Check Constraints:**
- `CHECK ((((governing_constraint)::text = ANY ((ARRAY['LTV'::character varying, 'LTC'::character varying, 'MANUAL'::character varying])::text[])) OR (governing_constraint IS NULL)))`
- `CHECK (((commitment_sizing_method)::text = ANY ((ARRAY['MANUAL'::character varying, 'LTV'::character varying, 'LTC'::character varying, 'MIN_LTV_LTC'::character varying])::text[])))`
- `CHECK (((draw_trigger_type)::text = ANY ((ARRAY['COST_INCURRED'::character varying, 'MANUAL'::character varying, 'MILESTONE'::character varying, 'PCT_COMPLETE'::character varying])::text[])))`
- `CHECK (((interest_calculation)::text = ANY ((ARRAY['SIMPLE'::character varying, 'COMPOUND'::character varying])::text[])))`
- `CHECK (((interest_payment_method)::text = ANY ((ARRAY['paid_current'::character varying, 'accrued_simple'::character varying, 'accrued_compound'::character varying])::text[])))`
- `CHECK (((interest_type)::text = ANY ((ARRAY['Fixed'::character varying, 'Floating'::character varying])::text[])))`
- `CHECK (((loan_type)::text = ANY ((ARRAY['CONSTRUCTION'::character varying, 'BRIDGE'::character varying, 'PERMANENT'::character varying, 'MEZZANINE'::character varying, 'LINE_OF_CREDIT'::character varying, 'PREFERRED_EQUITY'::character varying])::text[])))`
- `CHECK (((payment_frequency)::text = ANY ((ARRAY['MONTHLY'::character varying, 'QUARTERLY'::character varying, 'SEMI_ANNUAL'::character varying, 'ANNUAL'::character varying, 'AT_MATURITY'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'pending'::character varying, 'closed'::character varying, 'defeased'::character varying])::text[])))`
- `CHECK (((structure_type)::text = ANY ((ARRAY['TERM'::character varying, 'REVOLVER'::character varying])::text[])))`

## tbl_loan_container
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| loan_container_id | bigint | NO | — | — |
| loan_id | bigint | NO | — | tbl_loan.loan_id |
| division_id | bigint | NO | — | tbl_division.division_id |
| allocation_pct | numeric(5,2) | YES | — | — |
| collateral_type | character varying(50) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_loan_container_division` — `CREATE INDEX idx_loan_container_division ON landscape.tbl_loan_container USING btree (division_id)`
- `idx_loan_container_loan` — `CREATE INDEX idx_loan_container_loan ON landscape.tbl_loan_container USING btree (loan_id)`
- `tbl_loan_container_loan_id_division_id_key` — `CREATE UNIQUE INDEX tbl_loan_container_loan_id_division_id_key ON landscape.tbl_loan_container USING btree (loan_id, division_id)`
- `tbl_loan_container_pkey` — `CREATE UNIQUE INDEX tbl_loan_container_pkey ON landscape.tbl_loan_container USING btree (loan_container_id)`

## tbl_loan_finance_structure
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| loan_fs_id | bigint | NO | — | — |
| loan_id | bigint | NO | — | tbl_loan.loan_id |
| finance_structure_id | bigint | NO | — | tbl_finance_structure.finance_structure_id |
| contribution_pct | numeric(5,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_loan_fs_loan` — `CREATE INDEX idx_loan_fs_loan ON landscape.tbl_loan_finance_structure USING btree (loan_id)`
- `idx_loan_fs_structure` — `CREATE INDEX idx_loan_fs_structure ON landscape.tbl_loan_finance_structure USING btree (finance_structure_id)`
- `tbl_loan_finance_structure_loan_id_finance_structure_id_key` — `CREATE UNIQUE INDEX tbl_loan_finance_structure_loan_id_finance_structure_id_key ON landscape.tbl_loan_finance_structure USING btree (loan_id, finance_structure_id)`
- `tbl_loan_finance_structure_pkey` — `CREATE UNIQUE INDEX tbl_loan_finance_structure_pkey ON landscape.tbl_loan_finance_structure USING btree (loan_fs_id)`

## tbl_lot
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lot_id | integer | NO | — | — |
| parcel_id | integer | NO | — | tbl_parcel.parcel_id |
| phase_id | integer | YES | — | tbl_phase.phase_id |
| project_id | integer | NO | — | tbl_project.project_id |
| lot_number | character varying(50) | YES | — | — |
| unit_number | character varying(50) | YES | — | — |
| suite_number | character varying(50) | YES | — | — |
| unit_type | character varying(50) | YES | — | — |
| lot_sf | numeric(12,2) | YES | — | — |
| unit_sf | numeric(12,2) | YES | — | — |
| bedrooms | integer | YES | — | — |
| bathrooms | numeric(3,1) | YES | — | — |
| floor_number | integer | YES | — | — |
| base_price | numeric(15,2) | YES | — | — |
| price_psf | numeric(10,2) | YES | — | — |
| options_price | numeric(15,2) | YES | — | — |
| total_price | numeric(15,2) | YES | — | — |
| lot_status | character varying(50) | YES | 'Available'::character varying | — |
| sale_date | date | YES | — | — |
| close_date | date | YES | — | — |
| lease_id | integer | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_lot_parcel` — `CREATE INDEX idx_lot_parcel ON landscape.tbl_lot USING btree (parcel_id)`
- `idx_lot_phase` — `CREATE INDEX idx_lot_phase ON landscape.tbl_lot USING btree (phase_id)`
- `idx_lot_sale_date` — `CREATE INDEX idx_lot_sale_date ON landscape.tbl_lot USING btree (sale_date) WHERE (sale_date IS NOT NULL)`
- `idx_lot_status` — `CREATE INDEX idx_lot_status ON landscape.tbl_lot USING btree (project_id, lot_status)`
- `tbl_lot_pkey` — `CREATE UNIQUE INDEX tbl_lot_pkey ON landscape.tbl_lot USING btree (lot_id)`
- `uq_lot_project_number` — `CREATE UNIQUE INDEX uq_lot_project_number ON landscape.tbl_lot USING btree (project_id, lot_number)`

## tbl_lot_type
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| producttype_id | integer | NO | — | — |
| producttype_name | character varying(50) | NO | — | — |
| typical_lot_width | double precision | YES | — | — |
| typical_lot_depth | double precision | YES | — | — |

**Indexes:**
- `tbl_producttype_pkey` — `CREATE UNIQUE INDEX tbl_producttype_pkey ON landscape.tbl_lot_type USING btree (producttype_id)`
- `tbl_producttype_producttype_name_key` — `CREATE UNIQUE INDEX tbl_producttype_producttype_name_key ON landscape.tbl_lot_type USING btree (producttype_name)`

## tbl_market_rate_analysis
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| analysis_id | integer | NO | nextval('tbl_market_rate_analysis_analysis_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| unit_type | character varying(50) | YES | — | — |
| bedrooms | numeric(3,1) | YES | — | — |
| bathrooms | numeric(3,1) | YES | — | — |
| subject_sqft | integer | YES | — | — |
| comp_count | integer | YES | — | — |
| min_rent | numeric(10,2) | YES | — | — |
| max_rent | numeric(10,2) | YES | — | — |
| avg_rent | numeric(10,2) | YES | — | — |
| median_rent | numeric(10,2) | YES | — | — |
| avg_rent_per_sf | numeric(6,2) | YES | — | — |
| location_adjustment | numeric(6,3) | YES | 0 | — |
| condition_adjustment | numeric(6,3) | YES | 0 | — |
| amenity_adjustment | numeric(6,3) | YES | 0 | — |
| size_adjustment_per_sf | numeric(6,3) | YES | 0 | — |
| recommended_market_rent | numeric(10,2) | YES | — | — |
| recommended_rent_per_sf | numeric(6,2) | YES | — | — |
| confidence_level | character varying(20) | YES | 'MEDIUM'::character varying | — |
| analysis_notes | text | YES | — | — |
| analyzed_by | character varying(100) | YES | — | — |
| analysis_date | date | YES | CURRENT_DATE | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| population_1mi | integer | YES | — | — |
| population_3mi | integer | YES | — | — |
| population_5mi | integer | YES | — | — |
| median_hh_income_1mi | numeric(12,2) | YES | — | — |
| median_hh_income_3mi | numeric(12,2) | YES | — | — |
| avg_hh_income_5mi | numeric(12,2) | YES | — | — |
| employment_5mi | integer | YES | — | — |
| submarket_vacancy | numeric(5,4) | YES | — | — |
| submarket_rent_growth | numeric(5,4) | YES | — | — |
| submarket_avg_rent | numeric(10,2) | YES | — | — |
| submarket_occupancy | numeric(5,4) | YES | — | — |
| new_supply_pipeline | integer | YES | — | — |

**Indexes:**
- `idx_market_rate_analysis_project` — `CREATE INDEX idx_market_rate_analysis_project ON landscape.tbl_market_rate_analysis USING btree (project_id)`
- `idx_market_rate_analysis_unit_type` — `CREATE INDEX idx_market_rate_analysis_unit_type ON landscape.tbl_market_rate_analysis USING btree (unit_type)`
- `tbl_market_rate_analysis_pkey` — `CREATE UNIQUE INDEX tbl_market_rate_analysis_pkey ON landscape.tbl_market_rate_analysis USING btree (analysis_id)`

## tbl_measures
**Row Count (estimated):** 19
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| measure_id | integer | NO | nextval('tbl_measures_measure_id_seq'::regclass) | — |
| measure_code | character varying(10) | NO | — | — |
| measure_name | character varying(50) | NO | — | — |
| measure_category | character varying(20) | NO | — | — |
| is_system | boolean | YES | true | — |
| created_by | integer | YES | — | — |
| property_types | jsonb | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| sort_order | integer | YES | 0 | — |

**Indexes:**
- `idx_measures_code` — `CREATE INDEX idx_measures_code ON landscape.tbl_measures USING btree (measure_code)`
- `idx_tbl_measures_sort_order` — `CREATE INDEX idx_tbl_measures_sort_order ON landscape.tbl_measures USING btree (sort_order)`
- `tbl_measures_measure_code_key` — `CREATE UNIQUE INDEX tbl_measures_measure_code_key ON landscape.tbl_measures USING btree (measure_code)`
- `tbl_measures_pkey` — `CREATE UNIQUE INDEX tbl_measures_pkey ON landscape.tbl_measures USING btree (measure_id)`

## tbl_milestone
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| milestone_id | integer | NO | nextval('tbl_milestone_milestone_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| phase_id | bigint | YES | — | tbl_phase.phase_id |
| milestone_name | character varying(200) | NO | — | — |
| milestone_type | character varying(50) | YES | — | — |
| target_date | date | YES | — | — |
| actual_date | date | YES | — | — |
| status | character varying(20) | YES | 'pending'::character varying | — |
| predecessor_milestone_id | bigint | YES | — | tbl_milestone.milestone_id |
| notes | text | YES | — | — |
| source_doc_id | bigint | YES | — | core_doc.doc_id |
| confidence_score | numeric(3,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |

**Indexes:**
- `idx_milestone_project` — `CREATE INDEX idx_milestone_project ON landscape.tbl_milestone USING btree (project_id)`
- `idx_milestone_target_date` — `CREATE INDEX idx_milestone_target_date ON landscape.tbl_milestone USING btree (target_date)`
- `idx_milestone_type` — `CREATE INDEX idx_milestone_type ON landscape.tbl_milestone USING btree (milestone_type)`
- `tbl_milestone_pkey` — `CREATE UNIQUE INDEX tbl_milestone_pkey ON landscape.tbl_milestone USING btree (milestone_id)`

## tbl_msa
**Row Count (estimated):** 40
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| msa_id | integer | NO | nextval('tbl_msa_msa_id_seq'::regclass) | — |
| msa_name | character varying(200) | NO | — | — |
| msa_code | character varying(10) | YES | — | — |
| state_abbreviation | character varying(2) | NO | — | — |
| primary_city | character varying(100) | YES | — | — |
| is_active | boolean | YES | true | — |
| display_order | integer | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_msa_active_display_order` — `CREATE INDEX idx_msa_active_display_order ON landscape.tbl_msa USING btree (is_active, display_order) WHERE (is_active = true)`
- `tbl_msa_pkey` — `CREATE UNIQUE INDEX tbl_msa_pkey ON landscape.tbl_msa USING btree (msa_id)`

## tbl_multifamily_lease
**Row Count (estimated):** 168
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| lease_id | integer | NO | nextval('tbl_multifamily_lease_lease_id_seq'::regclass) | — |
| unit_id | bigint | NO | — | tbl_multifamily_unit.unit_id |
| resident_name | character varying(200) | YES | — | — |
| lease_start_date | date | YES | — | — |
| lease_end_date | date | YES | — | — |
| lease_term_months | integer | YES | — | — |
| base_rent_monthly | numeric(10,2) | NO | — | — |
| effective_rent_monthly | numeric(10,2) | YES | — | — |
| months_free_rent | integer | YES | 0 | — |
| concession_amount | numeric(10,2) | YES | 0 | — |
| security_deposit | numeric(10,2) | YES | 0 | — |
| pet_rent_monthly | numeric(8,2) | YES | 0 | — |
| parking_rent_monthly | numeric(8,2) | YES | 0 | — |
| lease_status | character varying(50) | YES | 'ACTIVE'::character varying | — |
| notice_date | date | YES | — | — |
| notice_to_vacate_days | integer | YES | — | — |
| is_renewal | boolean | YES | false | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_multifamily_lease_end_date` — `CREATE INDEX idx_multifamily_lease_end_date ON landscape.tbl_multifamily_lease USING btree (lease_end_date)`
- `idx_multifamily_lease_is_renewal` — `CREATE INDEX idx_multifamily_lease_is_renewal ON landscape.tbl_multifamily_lease USING btree (is_renewal)`
- `idx_multifamily_lease_notice_date` — `CREATE INDEX idx_multifamily_lease_notice_date ON landscape.tbl_multifamily_lease USING btree (notice_date) WHERE (notice_date IS NOT NULL)`
- `idx_multifamily_lease_start_date` — `CREATE INDEX idx_multifamily_lease_start_date ON landscape.tbl_multifamily_lease USING btree (lease_start_date)`
- `idx_multifamily_lease_status` — `CREATE INDEX idx_multifamily_lease_status ON landscape.tbl_multifamily_lease USING btree (lease_status)`
- `idx_multifamily_lease_unit` — `CREATE INDEX idx_multifamily_lease_unit ON landscape.tbl_multifamily_lease USING btree (unit_id)`
- `tbl_multifamily_lease_pkey` — `CREATE UNIQUE INDEX tbl_multifamily_lease_pkey ON landscape.tbl_multifamily_lease USING btree (lease_id)`

**Check Constraints:**
- `CHECK (((lease_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'EXPIRED'::character varying, 'NOTICE_GIVEN'::character varying, 'MONTH_TO_MONTH'::character varying, 'CANCELLED'::character varying])::text[])))`
- `CHECK (((months_free_rent >= 0) AND (months_free_rent <= lease_term_months)))`
- `CHECK ((lease_end_date > lease_start_date))`
- `CHECK ((lease_expiration_date >= lease_commencement_date))`

## tbl_multifamily_property
**Row Count (estimated):** 3
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| multifamily_property_id | integer | NO | nextval('tbl_multifamily_property_multifamily_property_id_seq'::regclass) | — |
| project_id | integer | YES | — | tbl_project.project_id |
| parcel_id | integer | YES | — | — |
| property_name | character varying(200) | YES | — | — |
| property_class | character varying(10) | YES | — | — |
| property_subtype | character varying(50) | YES | — | — |
| year_built | integer | YES | — | — |
| year_renovated | integer | YES | — | — |
| number_of_buildings | integer | YES | — | — |
| number_of_floors | integer | YES | — | — |
| total_units | integer | YES | — | — |
| rentable_units | integer | YES | — | — |
| total_building_sf | numeric(12,2) | YES | — | — |
| avg_unit_sf | numeric(8,2) | YES | — | — |
| parking_spaces_total | integer | YES | — | — |
| parking_ratio | numeric(5,2) | YES | — | — |
| parking_type | character varying(50) | YES | — | — |
| garage_spaces | integer | YES | — | — |
| covered_spaces | integer | YES | — | — |
| tandem_spaces | integer | YES | — | — |
| surface_spaces | integer | YES | — | — |
| has_manager_unit | boolean | YES | false | — |
| manager_unit_count | integer | YES | 0 | — |
| manager_rent_credit_monthly | numeric(10,2) | YES | — | — |
| leasing_office_count | integer | YES | 0 | — |
| leasing_office_sf | integer | YES | — | — |
| has_commercial_space | boolean | YES | false | — |
| commercial_sf | numeric(10,2) | YES | — | — |
| commercial_unit_count | integer | YES | 0 | — |
| commercial_type | character varying(100) | YES | — | — |
| assessed_value | numeric(15,2) | YES | — | — |
| assessment_year | integer | YES | — | — |
| property_tax_rate | numeric(8,6) | YES | — | — |
| direct_assessments_annual | numeric(10,2) | YES | — | — |
| tax_jurisdiction | character varying(200) | YES | — | — |
| utility_recovery_method | character varying(50) | YES | — | — |
| rubs_recovery_pct | numeric(5,2) | YES | — | — |
| gas_metered_individually | boolean | YES | false | — |
| electric_metered_individually | boolean | YES | false | — |
| water_metered_individually | boolean | YES | false | — |
| has_solar_panels | boolean | YES | false | — |
| solar_capacity_kw | numeric(8,2) | YES | — | — |
| has_tankless_water_heaters | boolean | YES | false | — |
| has_ev_charging | boolean | YES | false | — |
| ev_charging_spaces | integer | YES | — | — |
| energy_star_certified | boolean | YES | false | — |
| rent_control_exempt | boolean | YES | true | — |
| rent_control_ordinance | text | YES | — | — |
| exemption_reason | character varying(200) | YES | — | — |
| has_section8_units | boolean | YES | false | — |
| section8_unit_count | integer | YES | 0 | — |
| affordable_housing_program | character varying(100) | YES | — | — |
| property_status | character varying(50) | YES | — | — |
| stabilization_date | date | YES | — | — |
| stabilized_occupancy_pct | numeric(5,2) | YES | — | — |
| acquisition_date | date | YES | — | — |
| acquisition_price | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_multifamily_property_class` — `CREATE INDEX idx_multifamily_property_class ON landscape.tbl_multifamily_property USING btree (property_class)`
- `idx_multifamily_property_project` — `CREATE INDEX idx_multifamily_property_project ON landscape.tbl_multifamily_property USING btree (project_id)`
- `idx_multifamily_property_status` — `CREATE INDEX idx_multifamily_property_status ON landscape.tbl_multifamily_property USING btree (property_status)`
- `tbl_multifamily_property_pkey` — `CREATE UNIQUE INDEX tbl_multifamily_property_pkey ON landscape.tbl_multifamily_property USING btree (multifamily_property_id)`
- `tbl_multifamily_property_project_id_key` — `CREATE UNIQUE INDEX tbl_multifamily_property_project_id_key ON landscape.tbl_multifamily_property USING btree (project_id)`

## tbl_multifamily_turn
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| turn_id | integer | NO | nextval('tbl_multifamily_turn_turn_id_seq'::regclass) | — |
| unit_id | bigint | NO | — | tbl_multifamily_unit.unit_id |
| move_out_date | date | NO | — | — |
| make_ready_complete_date | date | YES | — | — |
| next_move_in_date | date | YES | — | — |
| total_vacant_days | integer | YES | — | — |
| cleaning_cost | numeric(10,2) | YES | 0 | — |
| painting_cost | numeric(10,2) | YES | 0 | — |
| carpet_flooring_cost | numeric(10,2) | YES | 0 | — |
| appliance_cost | numeric(10,2) | YES | 0 | — |
| other_cost | numeric(10,2) | YES | 0 | — |
| total_make_ready_cost | numeric(10,2) | YES | — | — |
| turn_status | character varying(50) | YES | 'VACANT'::character varying | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_multifamily_turn_make_ready_complete` — `CREATE INDEX idx_multifamily_turn_make_ready_complete ON landscape.tbl_multifamily_turn USING btree (make_ready_complete_date)`
- `idx_multifamily_turn_move_out` — `CREATE INDEX idx_multifamily_turn_move_out ON landscape.tbl_multifamily_turn USING btree (move_out_date)`
- `idx_multifamily_turn_status` — `CREATE INDEX idx_multifamily_turn_status ON landscape.tbl_multifamily_turn USING btree (turn_status)`
- `idx_multifamily_turn_unit` — `CREATE INDEX idx_multifamily_turn_unit ON landscape.tbl_multifamily_turn USING btree (unit_id)`
- `tbl_multifamily_turn_pkey` — `CREATE UNIQUE INDEX tbl_multifamily_turn_pkey ON landscape.tbl_multifamily_turn USING btree (turn_id)`

**Check Constraints:**
- `CHECK (((make_ready_complete_date IS NULL) OR (make_ready_complete_date >= move_out_date)))`
- `CHECK (((next_move_in_date IS NULL) OR (next_move_in_date >= move_out_date)))`
- `CHECK (((turn_status)::text = ANY ((ARRAY['VACANT'::character varying, 'MAKE_READY'::character varying, 'READY'::character varying, 'LEASED'::character varying])::text[])))`

## tbl_multifamily_unit
**Row Count (estimated):** 216
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| unit_id | integer | NO | nextval('tbl_multifamily_unit_unit_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| unit_number | character varying(50) | NO | — | — |
| building_name | character varying(100) | YES | — | — |
| unit_type | character varying(50) | NO | — | — |
| bedrooms | numeric(3,1) | YES | — | — |
| bathrooms | numeric(3,1) | YES | — | — |
| square_feet | integer | NO | — | — |
| market_rent | numeric(10,2) | YES | — | — |
| renovation_status | character varying(50) | YES | 'ORIGINAL'::character varying | — |
| renovation_date | date | YES | — | — |
| renovation_cost | numeric(12,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| other_features | text | YES | — | — |
| is_section8 | boolean | YES | false | — |
| section8_contract_date | date | YES | — | — |
| section8_contract_rent | numeric(10,2) | YES | — | — |
| has_balcony | boolean | YES | false | — |
| has_patio | boolean | YES | false | — |
| balcony_sf | integer | YES | — | — |
| ceiling_height_ft | numeric(4,1) | YES | — | — |
| view_type | character varying(50) | YES | — | — |
| is_manager | boolean | YES | false | — |
| current_rent | numeric(10,2) | YES | — | — |
| current_rent_psf | numeric(6,2) | YES | — | — |
| market_rent_psf | numeric(6,2) | YES | — | — |
| lease_start_date | date | YES | — | — |
| lease_end_date | date | YES | — | — |
| occupancy_status | character varying(20) | YES | — | — |
| floor_number | integer | YES | — | — |
| extra_data | jsonb | YES | — | — |
| unit_category | character varying(50) | YES | — | — |
| unit_designation | character varying(100) | YES | — | — |

**Indexes:**
- `idx_mf_unit_extra_data_gin` — `CREATE INDEX idx_mf_unit_extra_data_gin ON landscape.tbl_multifamily_unit USING gin (extra_data) WHERE (extra_data IS NOT NULL)`
- `idx_multifamily_unit_building` — `CREATE INDEX idx_multifamily_unit_building ON landscape.tbl_multifamily_unit USING btree (building_name)`
- `idx_multifamily_unit_project` — `CREATE INDEX idx_multifamily_unit_project ON landscape.tbl_multifamily_unit USING btree (project_id)`
- `idx_multifamily_unit_renovation_status` — `CREATE INDEX idx_multifamily_unit_renovation_status ON landscape.tbl_multifamily_unit USING btree (renovation_status)`
- `idx_multifamily_unit_type` — `CREATE INDEX idx_multifamily_unit_type ON landscape.tbl_multifamily_unit USING btree (unit_type)`
- `tbl_multifamily_unit_pkey` — `CREATE UNIQUE INDEX tbl_multifamily_unit_pkey ON landscape.tbl_multifamily_unit USING btree (unit_id)`
- `uq_unit_project_number` — `CREATE UNIQUE INDEX uq_unit_project_number ON landscape.tbl_multifamily_unit USING btree (project_id, unit_number)`

**Check Constraints:**
- `CHECK (((renovation_status)::text = ANY ((ARRAY['ORIGINAL'::character varying, 'RENOVATED'::character varying, 'IN_PROGRESS'::character varying, 'PLANNED'::character varying])::text[])))`

## tbl_multifamily_unit_type
**Row Count (estimated):** 64
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| unit_type_id | integer | NO | nextval('tbl_multifamily_unit_type_unit_type_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| unit_type_code | character varying(50) | YES | — | — |
| bedrooms | numeric(3,1) | YES | — | — |
| bathrooms | numeric(3,1) | YES | — | — |
| avg_square_feet | integer | YES | — | — |
| current_market_rent | numeric(10,2) | YES | — | — |
| total_units | integer | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| notes | text | YES | — | — |
| other_features | text | YES | — | — |
| floorplan_doc_id | bigint | YES | — | — |
| container_id | bigint | YES | — | tbl_division.division_id |
| unit_type_name | character varying(100) | YES | — | — |
| unit_count | integer | YES | — | — |
| market_rent | numeric(10,2) | YES | — | — |
| current_rent_avg | numeric(10,2) | YES | — | — |
| concessions_avg | numeric(10,2) | YES | — | — |

**Indexes:**
- `idx_multifamily_unit_type_code` — `CREATE INDEX idx_multifamily_unit_type_code ON landscape.tbl_multifamily_unit_type USING btree (unit_type_code)`
- `idx_multifamily_unit_type_project` — `CREATE INDEX idx_multifamily_unit_type_project ON landscape.tbl_multifamily_unit_type USING btree (project_id)`
- `tbl_multifamily_unit_type_pkey` — `CREATE UNIQUE INDEX tbl_multifamily_unit_type_pkey ON landscape.tbl_multifamily_unit_type USING btree (unit_type_id)`
- `uq_unit_type_project_code` — `CREATE UNIQUE INDEX uq_unit_type_project_code ON landscape.tbl_multifamily_unit_type USING btree (project_id, unit_type_code)`
- `uq_unit_type_project_name` — `CREATE UNIQUE INDEX uq_unit_type_project_name ON landscape.tbl_multifamily_unit_type USING btree (project_id, unit_type_name)`

**Check Constraints:**
- `CHECK ((avg_square_feet > 0))`
- `CHECK ((total_units >= 0))`

## tbl_narrative_change
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| change_type | character varying(20) | NO | — | — |
| original_text | text | YES | — | — |
| new_text | text | YES | — | — |
| position_start | integer | NO | — | — |
| position_end | integer | NO | — | — |
| is_accepted | boolean | NO | — | — |
| accepted_at | timestamp with time zone | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| version_id | bigint | NO | — | tbl_narrative_version.id |

**Indexes:**
- `tbl_narrative_change_pkey` — `CREATE UNIQUE INDEX tbl_narrative_change_pkey ON landscape.tbl_narrative_change USING btree (id)`
- `tbl_narrative_change_version_id_a0640063` — `CREATE INDEX tbl_narrative_change_version_id_a0640063 ON landscape.tbl_narrative_change USING btree (version_id)`

## tbl_narrative_comment
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| comment_text | text | NO | — | — |
| position_start | integer | NO | — | — |
| position_end | integer | NO | — | — |
| is_question | boolean | NO | — | — |
| is_resolved | boolean | NO | — | — |
| resolved_by | integer | YES | — | — |
| resolved_at | timestamp with time zone | YES | — | — |
| landscaper_response | text | YES | — | — |
| created_by | integer | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| version_id | bigint | NO | — | tbl_narrative_version.id |

**Indexes:**
- `tbl_narrative_comment_pkey` — `CREATE UNIQUE INDEX tbl_narrative_comment_pkey ON landscape.tbl_narrative_comment USING btree (id)`
- `tbl_narrative_comment_version_id_97cf6d0c` — `CREATE INDEX tbl_narrative_comment_version_id_97cf6d0c ON landscape.tbl_narrative_comment USING btree (version_id)`

## tbl_narrative_version
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| project_id | integer | NO | — | — |
| approach_type | character varying(50) | NO | — | — |
| version_number | integer | NO | — | — |
| content | jsonb | NO | — | — |
| content_html | text | YES | — | — |
| content_plain | text | YES | — | — |
| status | character varying(20) | NO | — | — |
| created_by | integer | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |

**Indexes:**
- `tbl_narrative_version_pkey` — `CREATE UNIQUE INDEX tbl_narrative_version_pkey ON landscape.tbl_narrative_version USING btree (id)`
- `tbl_narrative_version_project_id_approach_type_4a4b4b01_uniq` — `CREATE UNIQUE INDEX tbl_narrative_version_project_id_approach_type_4a4b4b01_uniq ON landscape.tbl_narrative_version USING btree (project_id, approach_type, version_number)`

## tbl_operating_expense
**Row Count (estimated):** 116
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| expense_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| parcel_id | integer | YES | — | tbl_parcel.parcel_id |
| expense_category | character varying(100) | NO | — | — |
| expense_subcategory | character varying(100) | YES | — | — |
| amount_type | character varying(50) | YES | 'Annual'::character varying | — |
| amount | numeric(15,2) | YES | — | — |
| amount_psf | numeric(10,2) | YES | — | — |
| percentage_of_revenue | numeric(5,2) | YES | — | — |
| is_recoverable | boolean | YES | true | — |
| recovery_pool | character varying(50) | YES | — | — |
| annual_growth_pct | numeric(5,2) | YES | 3.00 | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| category_name | character varying(200) | YES | — | — |

**Indexes:**
- `idx_opex_category` — `CREATE INDEX idx_opex_category ON landscape.tbl_operating_expense USING btree (expense_category)`
- `idx_opex_parcel` — `CREATE INDEX idx_opex_parcel ON landscape.tbl_operating_expense USING btree (parcel_id)`
- `idx_opex_project` — `CREATE INDEX idx_opex_project ON landscape.tbl_operating_expense USING btree (project_id)`
- `tbl_operating_expense_pkey` — `CREATE UNIQUE INDEX tbl_operating_expense_pkey ON landscape.tbl_operating_expense USING btree (expense_id)`
- `uq_opex_project_category` — `CREATE UNIQUE INDEX uq_opex_project_category ON landscape.tbl_operating_expense USING btree (project_id, expense_category)`

## tbl_operating_expenses
**Row Count (estimated):** 93
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| opex_id | bigint | NO | nextval('tbl_operating_expenses_opex_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| expense_category | character varying(100) | NO | — | — |
| expense_type | character varying(50) | NO | — | — |
| annual_amount | numeric(12,2) | NO | — | — |
| amount_per_sf | numeric(10,2) | YES | — | — |
| is_recoverable | boolean | YES | true | — |
| recovery_rate | numeric(6,5) | YES | 1.0 | — |
| escalation_type | character varying(50) | YES | 'FIXED_PERCENT'::character varying | — |
| escalation_rate | numeric(6,5) | YES | 0.03 | — |
| start_period | integer | NO | — | — |
| payment_frequency | character varying(50) | YES | 'MONTHLY'::character varying | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| account_id | integer | YES | — | tbl_opex_accounts_deprecated.account_id |
| calculation_basis | character varying(50) | YES | 'FIXED_AMOUNT'::character varying | — |
| unit_amount | numeric(10,2) | YES | — | — |
| is_auto_calculated | boolean | YES | false | — |
| category_id | integer | YES | — | core_unit_cost_category.category_id |
| statement_discriminator | character varying(100) | YES | 'default'::character varying | — |
| parent_category | character varying(100) | YES | 'unclassified'::character varying | — |
| source | character varying(20) | YES | 'user'::character varying | — |

**Indexes:**
- `idx_operating_expenses_account` — `CREATE INDEX idx_operating_expenses_account ON landscape.tbl_operating_expenses USING btree (account_id)`
- `idx_operating_expenses_category_id` — `CREATE INDEX idx_operating_expenses_category_id ON landscape.tbl_operating_expenses USING btree (category_id)`
- `idx_opex_project_account` — `CREATE INDEX idx_opex_project_account ON landscape.tbl_operating_expenses USING btree (project_id, account_id)`
- `idx_opex_project_statement` — `CREATE INDEX idx_opex_project_statement ON landscape.tbl_operating_expenses USING btree (project_id, statement_discriminator)`
- `idx_opex_recoverable` — `CREATE INDEX idx_opex_recoverable ON landscape.tbl_operating_expenses USING btree (is_recoverable)`
- `idx_opex_source` — `CREATE INDEX idx_opex_source ON landscape.tbl_operating_expenses USING btree (source)`
- `idx_opex_type` — `CREATE INDEX idx_opex_type ON landscape.tbl_operating_expenses USING btree (expense_type)`
- `tbl_operating_expenses_pkey` — `CREATE UNIQUE INDEX tbl_operating_expenses_pkey ON landscape.tbl_operating_expenses USING btree (opex_id)`
- `ux_opex_proj_acct_stmt` — `CREATE UNIQUE INDEX ux_opex_proj_acct_stmt ON landscape.tbl_operating_expenses USING btree (project_id, account_id, statement_discriminator) WHERE (account_id IS NOT NULL)`
- `ux_opex_proj_cat_stmt` — `CREATE UNIQUE INDEX ux_opex_proj_cat_stmt ON landscape.tbl_operating_expenses USING btree (project_id, category_id, statement_discriminator) WHERE (category_id IS NOT NULL)`

**Check Constraints:**
- `CHECK (((calculation_basis)::text = ANY ((ARRAY['FIXED_AMOUNT'::character varying, 'PER_UNSOLD_PARCEL'::character varying, 'PER_UNSOLD_ACRE'::character varying, 'PER_PCT_UNSOLD'::character varying])::text[])))`
- `CHECK (((escalation_type)::text = ANY ((ARRAY['NONE'::character varying, 'FIXED_PERCENT'::character varying, 'CPI'::character varying])::text[])))`
- `CHECK (((expense_type)::text = ANY ((ARRAY['CAM'::character varying, 'TAXES'::character varying, 'INSURANCE'::character varying, 'MANAGEMENT'::character varying, 'UTILITIES'::character varying, 'REPAIRS'::character varying, 'OTHER'::character varying])::text[])))`
- `CHECK (((payment_frequency)::text = ANY ((ARRAY['MONTHLY'::character varying, 'QUARTERLY'::character varying, 'ANNUAL'::character varying])::text[])))`
- `CHECK (((recovery_rate >= (0)::numeric) AND (recovery_rate <= (1)::numeric)))`

## tbl_operations_user_inputs
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| input_id | integer | NO | nextval('tbl_operations_user_inputs_input_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| section | character varying(50) | NO | — | — |
| line_item_key | character varying(100) | NO | — | — |
| category_id | integer | YES | — | core_unit_cost_category.category_id |
| label | character varying(200) | YES | — | — |
| parent_key | character varying(100) | YES | — | — |
| sort_order | integer | YES | 0 | — |
| as_is_value | numeric(14,2) | YES | — | — |
| as_is_count | integer | YES | — | — |
| as_is_rate | numeric(14,4) | YES | — | — |
| as_is_per_sf | numeric(10,4) | YES | — | — |
| as_is_growth_rate | numeric(6,4) | YES | — | — |
| as_is_growth_type | character varying(20) | YES | 'global'::character varying | — |
| post_reno_value | numeric(14,2) | YES | — | — |
| post_reno_count | integer | YES | — | — |
| post_reno_rate | numeric(14,4) | YES | — | — |
| post_reno_per_sf | numeric(10,4) | YES | — | — |
| post_reno_growth_rate | numeric(6,4) | YES | — | — |
| is_percentage | boolean | YES | false | — |
| is_calculated | boolean | YES | false | — |
| calculation_base | character varying(50) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_ops_inputs_category` — `CREATE INDEX idx_ops_inputs_category ON landscape.tbl_operations_user_inputs USING btree (category_id) WHERE (category_id IS NOT NULL)`
- `idx_ops_inputs_parent` — `CREATE INDEX idx_ops_inputs_parent ON landscape.tbl_operations_user_inputs USING btree (project_id, section, parent_key) WHERE (parent_key IS NOT NULL)`
- `idx_ops_inputs_project` — `CREATE INDEX idx_ops_inputs_project ON landscape.tbl_operations_user_inputs USING btree (project_id)`
- `idx_ops_inputs_section` — `CREATE INDEX idx_ops_inputs_section ON landscape.tbl_operations_user_inputs USING btree (project_id, section)`
- `tbl_operations_user_inputs_pkey` — `CREATE UNIQUE INDEX tbl_operations_user_inputs_pkey ON landscape.tbl_operations_user_inputs USING btree (input_id)`
- `tbl_operations_user_inputs_project_id_section_line_item_key_key` — `CREATE UNIQUE INDEX tbl_operations_user_inputs_project_id_section_line_item_key_key ON landscape.tbl_operations_user_inputs USING btree (project_id, section, line_item_key)`

**Check Constraints:**
- `CHECK (((section)::text = ANY ((ARRAY['rental_income'::character varying, 'vacancy_deductions'::character varying, 'other_income'::character varying, 'operating_expenses'::character varying])::text[])))`

## tbl_opex_accounts_deprecated
**Row Count (estimated):** 40
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| account_id | integer | NO | nextval('tbl_opex_accounts_account_id_seq'::regclass) | — |
| account_number | character varying(10) | NO | — | — |
| account_name | character varying(200) | NO | — | — |
| account_level | integer | NO | — | — |
| parent_account_id | integer | YES | — | tbl_opex_accounts_deprecated.account_id |
| is_calculated | boolean | YES | true | — |
| is_active | boolean | YES | true | — |
| sort_order | integer | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| applicable_property_types | ARRAY | YES | ARRAY['MF'::text, 'OFF'::text, 'RET'::text, 'IND'::text, 'HTL'::text, 'MXU'::text, 'LAND'::text] | — |

**Indexes:**
- `idx_opex_accounts_level` — `CREATE INDEX idx_opex_accounts_level ON landscape.tbl_opex_accounts_deprecated USING btree (account_level)`
- `idx_opex_accounts_number` — `CREATE INDEX idx_opex_accounts_number ON landscape.tbl_opex_accounts_deprecated USING btree (account_number)`
- `idx_opex_accounts_parent` — `CREATE INDEX idx_opex_accounts_parent ON landscape.tbl_opex_accounts_deprecated USING btree (parent_account_id)`
- `tbl_opex_accounts_account_number_key` — `CREATE UNIQUE INDEX tbl_opex_accounts_account_number_key ON landscape.tbl_opex_accounts_deprecated USING btree (account_number)`
- `tbl_opex_accounts_pkey` — `CREATE UNIQUE INDEX tbl_opex_accounts_pkey ON landscape.tbl_opex_accounts_deprecated USING btree (account_id)`

**Check Constraints:**
- `CHECK ((((account_level = 1) AND (parent_account_id IS NULL)) OR ((account_level = 2) AND (parent_account_id IS NOT NULL)) OR ((account_level = 3) AND (parent_account_id IS NOT NULL))))`
- `CHECK ((account_level = ANY (ARRAY[1, 2, 3])))`

## tbl_opex_timing
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| timing_id | bigint | NO | nextval('tbl_opex_timing_timing_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| opex_id | bigint | NO | — | tbl_operating_expenses.opex_id |
| period_id | integer | NO | — | — |
| expense_amount | numeric(12,2) | YES | 0 | — |
| recoverable_amount | numeric(12,2) | YES | 0 | — |
| recovery_collected | numeric(12,2) | YES | 0 | — |
| net_expense | numeric(12,2) | YES | 0 | — |
| calculation_date | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_opex_timing_opex` — `CREATE INDEX idx_opex_timing_opex ON landscape.tbl_opex_timing USING btree (opex_id)`
- `idx_opex_timing_period` — `CREATE INDEX idx_opex_timing_period ON landscape.tbl_opex_timing USING btree (period_id)`
- `idx_opex_timing_project` — `CREATE INDEX idx_opex_timing_project ON landscape.tbl_opex_timing USING btree (project_id)`
- `idx_opex_timing_project_period` — `CREATE INDEX idx_opex_timing_project_period ON landscape.tbl_opex_timing USING btree (project_id, period_id)`
- `tbl_opex_timing_opex_id_period_id_key` — `CREATE UNIQUE INDEX tbl_opex_timing_opex_id_period_id_key ON landscape.tbl_opex_timing USING btree (opex_id, period_id)`
- `tbl_opex_timing_pkey` — `CREATE UNIQUE INDEX tbl_opex_timing_pkey ON landscape.tbl_opex_timing USING btree (timing_id)`

## tbl_parcel
**Row Count (estimated):** 219
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| parcel_id | integer | NO | — | — |
| area_id | integer | YES | — | tbl_area.area_id |
| phase_id | integer | YES | — | tbl_phase.phase_id |
| landuse_code | character varying(10) | YES | — | tbl_landuse.landuse_code |
| landuse_type | character varying(50) | YES | — | — |
| acres_gross | double precision | YES | — | — |
| lot_width | double precision | YES | — | — |
| lot_depth | double precision | YES | — | — |
| lot_product | character varying(50) | YES | — | — |
| lot_area | double precision | YES | — | — |
| units_total | integer | YES | — | — |
| lots_frontfeet | double precision | YES | — | — |
| planning_loss | double precision | YES | — | — |
| plan_efficiency | double precision | YES | — | — |
| saledate | date | YES | — | — |
| saleprice | double precision | YES | — | — |
| lot_type_id | integer | YES | — | tbl_lot_type.producttype_id |
| project_id | integer | YES | — | — |
| family_name | text | YES | — | — |
| density_code | text | YES | — | density_classification.code |
| type_code | text | YES | — | — |
| product_code | text | YES | — | — |
| site_coverage_pct | numeric | YES | — | — |
| setback_front_ft | numeric | YES | — | — |
| setback_side_ft | numeric | YES | — | — |
| setback_rear_ft | numeric | YES | — | — |
| subtype_id | bigint | YES | — | — |
| parcel_code | character varying(20) | YES | — | — |
| parcel_name | character varying(255) | YES | — | — |
| building_name | character varying(255) | YES | — | — |
| building_class | character varying(20) | YES | — | — |
| year_built | integer | YES | — | — |
| year_renovated | integer | YES | — | — |
| rentable_sf | numeric(12,2) | YES | — | — |
| common_area_sf | numeric(12,2) | YES | — | — |
| load_factor_pct | numeric(5,2) | YES | — | — |
| parking_spaces | integer | YES | — | — |
| parking_ratio | numeric(5,2) | YES | — | — |
| is_income_property | boolean | YES | false | — |
| property_metadata | jsonb | YES | '{}'::jsonb | — |
| description | text | YES | — | — |
| sale_phase_code | character varying(20) | YES | — | — |
| custom_sale_date | date | YES | — | — |
| has_sale_overrides | boolean | YES | false | — |
| sale_period | integer | YES | — | — |

**Indexes:**
- `idx_parcel_sale_phase` — `CREATE INDEX idx_parcel_sale_phase ON landscape.tbl_parcel USING btree (project_id, sale_phase_code) WHERE (sale_phase_code IS NOT NULL)`
- `idx_tbl_parcel_code` — `CREATE INDEX idx_tbl_parcel_code ON landscape.tbl_parcel USING btree (project_id, parcel_code)`
- `tbl_parcels_pkey` — `CREATE UNIQUE INDEX tbl_parcels_pkey ON landscape.tbl_parcel USING btree (parcel_id)`

## tbl_parcel_sale_assumptions
**Row Count (estimated):** 39
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| assumption_id | integer | NO | nextval('tbl_parcel_sale_assumptions_assumption_id_seq'::regclass) | — |
| parcel_id | integer | NO | — | tbl_parcel.parcel_id |
| sale_date | date | NO | — | — |
| base_price_per_unit | numeric(12,2) | YES | — | — |
| price_uom | character varying(10) | YES | — | — |
| inflation_rate | numeric(8,6) | YES | — | — |
| inflated_price_per_unit | numeric(12,2) | YES | — | — |
| gross_parcel_price | numeric(15,2) | YES | — | — |
| improvement_offset_per_uom | numeric(12,2) | YES | — | — |
| improvement_offset_total | numeric(15,2) | YES | — | — |
| improvement_offset_source | character varying(50) | YES | — | — |
| improvement_offset_override | boolean | YES | false | — |
| gross_sale_proceeds | numeric(15,2) | YES | — | — |
| legal_pct | numeric(5,4) | YES | — | — |
| legal_amount | numeric(12,2) | YES | — | — |
| legal_override | boolean | YES | false | — |
| commission_pct | numeric(5,4) | YES | — | — |
| commission_amount | numeric(12,2) | YES | — | — |
| commission_override | boolean | YES | false | — |
| closing_cost_pct | numeric(5,4) | YES | — | — |
| closing_cost_amount | numeric(12,2) | YES | — | — |
| closing_cost_override | boolean | YES | false | — |
| title_insurance_pct | numeric(5,4) | YES | — | — |
| title_insurance_amount | numeric(12,2) | YES | — | — |
| title_insurance_override | boolean | YES | false | — |
| custom_transaction_costs | jsonb | YES | '[]'::jsonb | — |
| total_transaction_costs | numeric(15,2) | YES | — | — |
| net_sale_proceeds | numeric(15,2) | YES | — | — |
| net_proceeds_per_uom | numeric(12,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_parcel_sale_assumptions_parcel` — `CREATE INDEX idx_parcel_sale_assumptions_parcel ON landscape.tbl_parcel_sale_assumptions USING btree (parcel_id)`
- `tbl_parcel_sale_assumptions_parcel_id_key` — `CREATE UNIQUE INDEX tbl_parcel_sale_assumptions_parcel_id_key ON landscape.tbl_parcel_sale_assumptions USING btree (parcel_id)`
- `tbl_parcel_sale_assumptions_pkey` — `CREATE UNIQUE INDEX tbl_parcel_sale_assumptions_pkey ON landscape.tbl_parcel_sale_assumptions USING btree (assumption_id)`

## tbl_parcel_sale_event
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| sale_event_id | bigint | NO | nextval('tbl_parcel_sale_event_sale_event_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| parcel_id | bigint | NO | — | — |
| phase_id | integer | YES | — | — |
| sale_type | character varying(50) | NO | — | — |
| buyer_entity | character varying(200) | YES | — | — |
| buyer_contact_id | integer | YES | — | — |
| contract_date | date | YES | — | — |
| total_lots_contracted | integer | NO | — | — |
| base_price_per_lot | numeric(12,2) | YES | — | — |
| price_escalation_formula | text | YES | — | — |
| deposit_amount | numeric(12,2) | YES | — | — |
| deposit_date | date | YES | — | — |
| deposit_terms | character varying(100) | YES | — | — |
| deposit_applied_to_purchase | boolean | YES | true | — |
| has_escrow_holdback | boolean | YES | false | — |
| escrow_holdback_amount | numeric(12,2) | YES | — | — |
| escrow_release_terms | text | YES | — | — |
| commission_pct | numeric(5,2) | YES | — | — |
| closing_cost_per_unit | numeric(12,2) | YES | — | — |
| onsite_cost_pct | numeric(5,2) | YES | — | — |
| has_custom_overrides | boolean | YES | false | — |
| sale_status | character varying(50) | YES | 'pending'::character varying | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_sale_event_parcel` — `CREATE INDEX idx_sale_event_parcel ON landscape.tbl_parcel_sale_event USING btree (parcel_id)`
- `idx_sale_event_project` — `CREATE INDEX idx_sale_event_project ON landscape.tbl_parcel_sale_event USING btree (project_id)`
- `idx_sale_event_status` — `CREATE INDEX idx_sale_event_status ON landscape.tbl_parcel_sale_event USING btree (sale_status)`
- `idx_sale_event_type` — `CREATE INDEX idx_sale_event_type ON landscape.tbl_parcel_sale_event USING btree (sale_type)`
- `tbl_parcel_sale_event_pkey` — `CREATE UNIQUE INDEX tbl_parcel_sale_event_pkey ON landscape.tbl_parcel_sale_event USING btree (sale_event_id)`

**Check Constraints:**
- `CHECK (((sale_status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'closed'::character varying, 'cancelled'::character varying])::text[])))`
- `CHECK (((sale_type)::text = ANY ((ARRAY['single_closing'::character varying, 'multi_closing'::character varying, 'structured_sale'::character varying, 'bulk_assignment'::character varying])::text[])))`
- `CHECK ((total_lots_contracted > 0))`

## tbl_participation_payment
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| payment_id | bigint | NO | nextval('tbl_participation_payment_payment_id_seq'::regclass) | — |
| settlement_id | bigint | NO | — | tbl_sale_settlement.settlement_id |
| project_id | bigint | NO | — | tbl_project.project_id |
| payment_date | date | NO | — | — |
| payment_period | integer | YES | — | — |
| homes_closed_count | integer | YES | — | — |
| gross_home_sales | numeric(15,2) | YES | — | — |
| participation_base | numeric(15,2) | YES | — | — |
| participation_amount | numeric(15,2) | NO | — | — |
| less_base_allocation | numeric(15,2) | YES | 0 | — |
| net_participation_payment | numeric(15,2) | NO | — | — |
| cumulative_homes_closed | integer | YES | — | — |
| cumulative_participation_paid | numeric(15,2) | YES | — | — |
| payment_status | character varying(50) | YES | 'calculated'::character varying | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_participation_date` — `CREATE INDEX idx_participation_date ON landscape.tbl_participation_payment USING btree (payment_date)`
- `idx_participation_period` — `CREATE INDEX idx_participation_period ON landscape.tbl_participation_payment USING btree (payment_period)`
- `idx_participation_project` — `CREATE INDEX idx_participation_project ON landscape.tbl_participation_payment USING btree (project_id)`
- `idx_participation_settlement` — `CREATE INDEX idx_participation_settlement ON landscape.tbl_participation_payment USING btree (settlement_id)`
- `idx_participation_status` — `CREATE INDEX idx_participation_status ON landscape.tbl_participation_payment USING btree (payment_status)`
- `tbl_participation_payment_pkey` — `CREATE UNIQUE INDEX tbl_participation_payment_pkey ON landscape.tbl_participation_payment USING btree (payment_id)`

**Check Constraints:**
- `CHECK (((payment_status)::text = ANY ((ARRAY['calculated'::character varying, 'paid'::character varying, 'disputed'::character varying])::text[])))`
- `CHECK ((gross_home_sales >= (0)::numeric))`
- `CHECK ((homes_closed_count >= 0))`
- `CHECK ((net_participation_payment >= (0)::numeric))`
- `CHECK ((participation_amount >= (0)::numeric))`

## tbl_percentage_rent
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| percentage_rent_id | integer | NO | nextval('tbl_percentage_rent_percentage_rent_id_seq'::regclass) | — |
| lease_id | integer | YES | — | tbl_commercial_lease.lease_id |
| breakpoint_amount | numeric(15,2) | YES | — | — |
| percentage_rate | numeric(6,3) | YES | — | — |
| reporting_frequency | character varying(20) | YES | — | — |
| reporting_deadline_days | integer | YES | — | — |
| prior_year_sales | numeric(15,2) | YES | — | — |
| current_year_sales_projection | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `tbl_cre_percentage_rent_pkey` — `CREATE UNIQUE INDEX tbl_cre_percentage_rent_pkey ON landscape.tbl_percentage_rent USING btree (percentage_rent_id)`

## tbl_phase
**Row Count (estimated):** 16
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| phase_id | integer | NO | — | — |
| area_id | integer | NO | — | tbl_area.area_id |
| phase_name | character varying(255) | NO | — | — |
| phase_no | integer | YES | — | — |
| project_id | integer | YES | — | — |
| label | text | YES | — | — |
| description | text | YES | — | — |
| phase_status | character varying(50) | YES | 'Planning'::character varying | — |
| phase_start_date | date | YES | — | — |
| phase_completion_date | date | YES | — | — |
| absorption_start_date | date | YES | — | — |

**Indexes:**
- `tbl_devphase_pkey` — `CREATE UNIQUE INDEX tbl_devphase_pkey ON landscape.tbl_phase USING btree (phase_id)`

## tbl_platform_knowledge
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('tbl_platform_knowledge_id_seq'::regclass) | — |
| document_key | character varying(100) | NO | — | — |
| title | character varying(500) | NO | — | — |
| subtitle | character varying(500) | YES | — | — |
| edition | character varying(50) | YES | — | — |
| publisher | character varying(255) | YES | — | — |
| publication_year | integer | YES | — | — |
| isbn | character varying(20) | YES | — | — |
| knowledge_domain | character varying(100) | NO | — | — |
| property_types | jsonb | YES | '[]'::jsonb | — |
| description | text | YES | — | — |
| total_chapters | integer | YES | — | — |
| total_pages | integer | YES | — | — |
| file_path | character varying(500) | YES | — | — |
| file_hash | character varying(64) | YES | — | — |
| file_size_bytes | bigint | YES | — | — |
| ingestion_status | character varying(50) | YES | 'pending'::character varying | — |
| chunk_count | integer | YES | 0 | — |
| last_indexed_at | timestamp without time zone | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| created_by | character varying(100) | YES | 'system'::character varying | — |
| page_count | integer | YES | — | — |

**Indexes:**
- `idx_pk_document_active` — `CREATE INDEX idx_pk_document_active ON landscape.tbl_platform_knowledge USING btree (is_active) WHERE (is_active = true)`
- `idx_pk_document_property_types_gin` — `CREATE INDEX idx_pk_document_property_types_gin ON landscape.tbl_platform_knowledge USING gin (property_types jsonb_path_ops)`
- `tbl_platform_knowledge_document_key_key` — `CREATE UNIQUE INDEX tbl_platform_knowledge_document_key_key ON landscape.tbl_platform_knowledge USING btree (document_key)`
- `tbl_platform_knowledge_pkey` — `CREATE UNIQUE INDEX tbl_platform_knowledge_pkey ON landscape.tbl_platform_knowledge USING btree (id)`

## tbl_platform_knowledge_chapters
**Row Count (estimated):** 201
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('tbl_platform_knowledge_chapters_id_seq'::regclass) | — |
| document_id | integer | NO | — | tbl_platform_knowledge.id |
| chapter_number | integer | YES | — | — |
| chapter_title | character varying(500) | NO | — | — |
| page_start | integer | YES | — | — |
| page_end | integer | YES | — | — |
| topics | jsonb | YES | '[]'::jsonb | — |
| property_types | jsonb | YES | '[]'::jsonb | — |
| applies_to | jsonb | YES | '[]'::jsonb | — |
| summary | text | YES | — | — |
| key_concepts | jsonb | YES | '{}'::jsonb | — |
| chunk_ids | jsonb | YES | '[]'::jsonb | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_pk_chapters_property_types_gin` — `CREATE INDEX idx_pk_chapters_property_types_gin ON landscape.tbl_platform_knowledge_chapters USING gin (property_types jsonb_path_ops)`
- `idx_pk_chapters_topics_gin` — `CREATE INDEX idx_pk_chapters_topics_gin ON landscape.tbl_platform_knowledge_chapters USING gin (topics jsonb_path_ops)`
- `tbl_platform_knowledge_chapters_document_id_chapter_number_key` — `CREATE UNIQUE INDEX tbl_platform_knowledge_chapters_document_id_chapter_number_key ON landscape.tbl_platform_knowledge_chapters USING btree (document_id, chapter_number)`
- `tbl_platform_knowledge_chapters_pkey` — `CREATE UNIQUE INDEX tbl_platform_knowledge_chapters_pkey ON landscape.tbl_platform_knowledge_chapters USING btree (id)`

## tbl_platform_knowledge_chunks
**Row Count (estimated):** 1216
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('tbl_platform_knowledge_chunks_id_seq'::regclass) | — |
| document_id | integer | NO | — | tbl_platform_knowledge.id |
| chapter_id | integer | YES | — | tbl_platform_knowledge_chapters.id |
| chunk_index | integer | NO | — | — |
| content | text | NO | — | — |
| content_type | character varying(50) | YES | 'text'::character varying | — |
| page_number | integer | YES | — | — |
| section_path | character varying(500) | YES | — | — |
| embedding | USER-DEFINED | YES | — | — |
| embedding_model | character varying(100) | YES | 'text-embedding-3-small'::character varying | — |
| token_count | integer | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| category | character varying(100) | NO | — | — |
| metadata | jsonb | NO | — | — |

**Indexes:**
- `idx_pk_chunks_chapter` — `CREATE INDEX idx_pk_chunks_chapter ON landscape.tbl_platform_knowledge_chunks USING btree (chapter_id)`
- `idx_pk_chunks_document` — `CREATE INDEX idx_pk_chunks_document ON landscape.tbl_platform_knowledge_chunks USING btree (document_id)`
- `idx_pk_chunks_embedding` — `CREATE INDEX idx_pk_chunks_embedding ON landscape.tbl_platform_knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100')`
- `tbl_platform_knowledge_chunks_document_id_chunk_index_key` — `CREATE UNIQUE INDEX tbl_platform_knowledge_chunks_document_id_chunk_index_key ON landscape.tbl_platform_knowledge_chunks USING btree (document_id, chunk_index)`
- `tbl_platform_knowledge_chunks_pkey` — `CREATE UNIQUE INDEX tbl_platform_knowledge_chunks_pkey ON landscape.tbl_platform_knowledge_chunks USING btree (id)`

## tbl_project
**Row Count (estimated):** 16
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| project_id | integer | NO | — | — |
| project_name | character varying(255) | NO | — | — |
| acres_gross | double precision | YES | — | — |
| location_lat | double precision | YES | — | — |
| location_lon | double precision | YES | — | — |
| start_date | date | YES | — | — |
| jurisdiction_city | character varying(100) | YES | — | — |
| jurisdiction_county | character varying(100) | YES | — | — |
| jurisdiction_state | character varying(10) | YES | — | — |
| uses_global_taxonomy | boolean | YES | true | — |
| taxonomy_customized | boolean | YES | false | — |
| jurisdiction_integrated | boolean | YES | false | — |
| gis_metadata | jsonb | YES | '{}'::jsonb | — |
| location_description | text | YES | — | — |
| target_units | integer | YES | — | — |
| price_range_low | numeric(12,2) | YES | — | — |
| price_range_high | numeric(12,2) | YES | — | — |
| ai_last_reviewed | timestamp with time zone | YES | — | — |
| project_address | text | YES | — | — |
| legal_owner | text | YES | — | — |
| county | character varying(100) | YES | — | — |
| existing_land_use | text | YES | — | — |
| assessed_value | numeric(15,2) | YES | — | — |
| project_type | character varying(50) | YES | 'Land Development'::character varying | — |
| financial_model_type | character varying(50) | YES | 'Development'::character varying | — |
| analysis_start_date | date | YES | — | — |
| analysis_end_date | date | YES | — | — |
| calculation_frequency | character varying(20) | YES | 'Monthly'::character varying | — |
| discount_rate_pct | numeric(5,2) | YES | 10.00 | — |
| cost_of_capital_pct | numeric(5,2) | YES | — | — |
| schema_version | integer | YES | 1 | — |
| last_calculated_at | timestamp with time zone | YES | — | — |
| description | text | YES | — | — |
| developer_owner | text | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| template_id | bigint | YES | — | tbl_property_use_template.template_id |
| street_address | character varying(200) | YES | — | — |
| city | character varying(100) | YES | — | — |
| state | character varying(10) | YES | — | — |
| zip_code | character varying(20) | YES | — | — |
| country | character varying(100) | YES | 'United States'::character varying | — |
| market | character varying(100) | YES | — | — |
| submarket | character varying(100) | YES | — | — |
| apn_primary | character varying(50) | YES | — | — |
| apn_secondary | character varying(50) | YES | — | — |
| ownership_type | character varying(50) | YES | — | — |
| property_subtype | character varying(100) | YES | — | — |
| property_class | character varying(50) | YES | — | — |
| lot_size_sf | numeric | YES | — | — |
| lot_size_acres | numeric | YES | — | — |
| gross_sf | numeric | YES | — | — |
| total_units | integer | YES | — | — |
| year_built | integer | YES | — | — |
| stories | integer | YES | — | — |
| asking_price | numeric | YES | — | — |
| price_per_unit | numeric | YES | — | — |
| price_per_sf | numeric | YES | — | — |
| cap_rate_current | numeric | YES | — | — |
| cap_rate_proforma | numeric | YES | — | — |
| current_gpr | numeric | YES | — | — |
| current_other_income | numeric | YES | — | — |
| current_gpi | numeric | YES | — | — |
| current_vacancy_rate | numeric | YES | — | — |
| current_egi | numeric | YES | — | — |
| current_opex | numeric | YES | — | — |
| current_noi | numeric | YES | — | — |
| proforma_gpr | numeric | YES | — | — |
| proforma_other_income | numeric | YES | — | — |
| proforma_gpi | numeric | YES | — | — |
| proforma_vacancy_rate | numeric | YES | — | — |
| proforma_egi | numeric | YES | — | — |
| proforma_opex | numeric | YES | — | — |
| proforma_noi | numeric | YES | — | — |
| listing_brokerage | character varying(200) | YES | — | — |
| job_number | character varying(50) | YES | — | — |
| version_reference | character varying(50) | YES | — | — |
| analysis_type | character varying(50) | YES | — | — |
| project_type_code | character varying(50) | NO | 'LAND'::character varying | — |
| msa_id | integer | YES | — | tbl_msa.msa_id |
| planning_efficiency | numeric(5,4) | YES | — | — |
| market_velocity_annual | integer | YES | — | — |
| velocity_override_reason | text | YES | — | — |
| analysis_mode | character varying(20) | YES | 'napkin'::character varying | — |
| dms_template_id | bigint | YES | — | dms_templates.template_id |
| topography | character varying(50) | YES | — | — |
| flood_zone | character varying(20) | YES | — | — |
| overlay_zones | jsonb | YES | '[]'::jsonb | — |
| has_takedown_agreement | boolean | YES | false | — |
| current_zoning | character varying(100) | YES | — | — |
| proposed_zoning | character varying(100) | YES | — | — |
| general_plan | character varying(100) | YES | — | — |
| acquisition_price | numeric(15,2) | YES | — | — |
| acquisition_date | date | YES | — | — |
| walk_score | integer | YES | — | — |
| bike_score | integer | YES | — | — |
| transit_score | integer | YES | — | — |
| active_opex_discriminator | character varying(100) | YES | 'default'::character varying | — |
| value_add_enabled | boolean | NO | false | — |
| primary_count | integer | YES | — | — |
| primary_count_type | character varying(50) | YES | — | — |
| primary_area | numeric(15,2) | YES | — | — |
| primary_area_type | character varying(50) | YES | — | — |
| cabinet_id | bigint | YES | — | tbl_cabinet.cabinet_id |
| project_focus | character varying(50) | YES | — | — |
| site_shape | character varying(50) | YES | — | — |
| site_utility_rating | integer | YES | — | — |
| location_rating | integer | YES | — | — |
| access_rating | integer | YES | — | — |
| visibility_rating | integer | YES | — | — |
| building_count | integer | YES | — | — |
| net_rentable_area | numeric(12,2) | YES | — | — |
| land_to_building_ratio | numeric(6,3) | YES | — | — |
| construction_class | character varying(20) | YES | — | — |
| construction_type | character varying(50) | YES | — | — |
| condition_rating | integer | YES | — | — |
| quality_rating | integer | YES | — | — |
| parking_spaces | integer | YES | — | — |
| parking_ratio | numeric(5,2) | YES | — | — |
| parking_type | character varying(50) | YES | — | — |
| effective_age | integer | YES | — | — |
| total_economic_life | integer | YES | — | — |
| remaining_economic_life | integer | YES | — | — |
| site_attributes | jsonb | YES | '{}'::jsonb | — |
| improvement_attributes | jsonb | YES | '{}'::jsonb | — |
| created_by_id | integer | YES | — | auth_user.id |
| collateral_enforcement | character varying(20) | YES | 'STRICT'::character varying | — |
| lotbank_management_fee_pct | numeric(5,4) | YES | — | — |
| lotbank_default_provision_pct | numeric(5,4) | YES | — | — |
| lotbank_underwriting_fee | numeric(12,2) | YES | — | — |
| analysis_perspective | character varying(50) | NO | — | — |
| analysis_purpose | character varying(50) | NO | — | — |

**Indexes:**
- `idx_project_active_opex_discriminator` — `CREATE INDEX idx_project_active_opex_discriminator ON landscape.tbl_project USING btree (active_opex_discriminator)`
- `idx_project_analysis_type` — `CREATE INDEX idx_project_analysis_type ON landscape.tbl_project USING btree (analysis_type)`
- `idx_project_cabinet` — `CREATE INDEX idx_project_cabinet ON landscape.tbl_project USING btree (cabinet_id)`
- `idx_project_flood_zone` — `CREATE INDEX idx_project_flood_zone ON landscape.tbl_project USING btree (flood_zone) WHERE (flood_zone IS NOT NULL)`
- `idx_project_focus` — `CREATE INDEX idx_project_focus ON landscape.tbl_project USING btree (project_focus) WHERE (project_focus IS NOT NULL)`
- `idx_project_improvement_attributes` — `CREATE INDEX idx_project_improvement_attributes ON landscape.tbl_project USING gin (improvement_attributes)`
- `idx_project_msa_id` — `CREATE INDEX idx_project_msa_id ON landscape.tbl_project USING btree (msa_id)`
- `idx_project_property_subtype` — `CREATE INDEX idx_project_property_subtype ON landscape.tbl_project USING btree (property_subtype)`
- `idx_project_site_attributes` — `CREATE INDEX idx_project_site_attributes ON landscape.tbl_project USING gin (site_attributes)`
- `idx_project_template` — `CREATE INDEX idx_project_template ON landscape.tbl_project USING btree (template_id)`
- `idx_project_topography` — `CREATE INDEX idx_project_topography ON landscape.tbl_project USING btree (topography) WHERE (topography IS NOT NULL)`
- `idx_tbl_project_created_by_id` — `CREATE INDEX idx_tbl_project_created_by_id ON landscape.tbl_project USING btree (created_by_id)`
- `tbl_project_pkey` — `CREATE UNIQUE INDEX tbl_project_pkey ON landscape.tbl_project USING btree (project_id)`
- `tbl_project_project_name_key` — `CREATE UNIQUE INDEX tbl_project_project_name_key ON landscape.tbl_project USING btree (project_name)`

**Check Constraints:**
- `CHECK (((access_rating >= 1) AND (access_rating <= 5)))`
- `CHECK (((analysis_perspective)::text = ANY ((ARRAY['INVESTMENT'::character varying, 'DEVELOPMENT'::character varying])::text[])))`
- `CHECK (((analysis_purpose)::text = ANY ((ARRAY['VALUATION'::character varying, 'UNDERWRITING'::character varying])::text[])))`
- `CHECK (((analysis_type IS NULL) OR (length(TRIM(BOTH FROM analysis_type)) > 0)))`
- `CHECK (((condition_rating >= 1) AND (condition_rating <= 5)))`
- `CHECK (((location_rating >= 1) AND (location_rating <= 5)))`
- `CHECK (((project_focus)::text = ANY ((ARRAY['Valuation'::character varying, 'Investment'::character varying, 'Feasibility'::character varying, 'Operations'::character varying])::text[])))`
- `CHECK (((project_type_code)::text = ANY ((ARRAY['LAND'::character varying, 'MF'::character varying, 'OFF'::character varying, 'RET'::character varying, 'IND'::character varying, 'HTL'::character varying, 'MXU'::character varying])::text[])))`
- `CHECK (((quality_rating >= 1) AND (quality_rating <= 5)))`
- `CHECK (((site_utility_rating >= 1) AND (site_utility_rating <= 5)))`
- `CHECK (((visibility_rating >= 1) AND (visibility_rating <= 5)))`

## tbl_project_assumption
**Row Count (estimated):** 19
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| assumption_id | integer | NO | nextval('tbl_project_assumption_assumption_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| assumption_key | character varying(100) | NO | — | — |
| assumption_value | text | YES | — | — |
| assumption_type | character varying(50) | YES | 'user'::character varying | — |
| scope | character varying(50) | YES | 'project'::character varying | — |
| scope_id | bigint | YES | — | — |
| notes | text | YES | — | — |
| source_doc_id | bigint | YES | — | core_doc.doc_id |
| confidence_score | numeric(3,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | — | — |

**Indexes:**
- `idx_assumption_key` — `CREATE INDEX idx_assumption_key ON landscape.tbl_project_assumption USING btree (assumption_key)`
- `idx_assumption_project` — `CREATE INDEX idx_assumption_project ON landscape.tbl_project_assumption USING btree (project_id)`
- `tbl_project_assumption_pkey` — `CREATE UNIQUE INDEX tbl_project_assumption_pkey ON landscape.tbl_project_assumption USING btree (assumption_id)`
- `uq_project_assumption` — `CREATE UNIQUE INDEX uq_project_assumption ON landscape.tbl_project_assumption USING btree (project_id, assumption_key)`
- `uq_project_assumption_key` — `CREATE UNIQUE INDEX uq_project_assumption_key ON landscape.tbl_project_assumption USING btree (project_id, assumption_key)`

## tbl_project_config
**Row Count (estimated):** 5
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| project_id | bigint | NO | — | tbl_project.project_id |
| asset_type | character varying(50) | NO | — | — |
| tier_1_label | character varying(50) | NO | 'Area'::character varying | — |
| tier_2_label | character varying(50) | NO | 'Phase'::character varying | — |
| tier_3_label | character varying(50) | NO | 'Parcel'::character varying | — |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| land_use_level1_label | character varying(50) | YES | 'Family'::character varying | — |
| land_use_level1_label_plural | character varying(50) | YES | 'Families'::character varying | — |
| land_use_level2_label | character varying(50) | YES | 'Type'::character varying | — |
| land_use_level2_label_plural | character varying(50) | YES | 'Types'::character varying | — |
| land_use_level3_label | character varying(50) | YES | 'Product'::character varying | — |
| land_use_level3_label_plural | character varying(50) | YES | 'Products'::character varying | — |
| analysis_type | character varying(50) | YES | — | — |
| level1_enabled | boolean | YES | true | — |
| level2_enabled | boolean | YES | true | — |
| level3_enabled | boolean | YES | true | — |
| auto_number | boolean | YES | false | — |
| tier_0_label | character varying(50) | YES | 'Project'::character varying | — |

**Indexes:**
- `idx_project_config_asset_type` — `CREATE INDEX idx_project_config_asset_type ON landscape.tbl_project_config USING btree (asset_type)`
- `idx_project_config_land_use_labels` — `CREATE INDEX idx_project_config_land_use_labels ON landscape.tbl_project_config USING btree (land_use_level1_label, land_use_level2_label, land_use_level3_label)`
- `tbl_project_config_pkey` — `CREATE UNIQUE INDEX tbl_project_config_pkey ON landscape.tbl_project_config USING btree (project_id)`

## tbl_project_contact
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| project_contact_id | bigint | NO | nextval('tbl_project_contact_project_contact_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| contact_id | bigint | NO | — | tbl_contact.contact_id |
| role_id | integer | NO | — | tbl_contact_role.role_id |
| is_primary | boolean | YES | false | — |
| is_billing_contact | boolean | YES | false | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_project_contact_billing` — `CREATE INDEX idx_project_contact_billing ON landscape.tbl_project_contact USING btree (project_id, is_billing_contact) WHERE (is_billing_contact = true)`
- `idx_project_contact_contact` — `CREATE INDEX idx_project_contact_contact ON landscape.tbl_project_contact USING btree (contact_id)`
- `idx_project_contact_primary` — `CREATE INDEX idx_project_contact_primary ON landscape.tbl_project_contact USING btree (project_id, is_primary) WHERE (is_primary = true)`
- `idx_project_contact_project` — `CREATE INDEX idx_project_contact_project ON landscape.tbl_project_contact USING btree (project_id)`
- `idx_project_contact_role` — `CREATE INDEX idx_project_contact_role ON landscape.tbl_project_contact USING btree (role_id)`
- `tbl_project_contact_pkey` — `CREATE UNIQUE INDEX tbl_project_contact_pkey ON landscape.tbl_project_contact USING btree (project_contact_id)`
- `uq_project_contact_role` — `CREATE UNIQUE INDEX uq_project_contact_role ON landscape.tbl_project_contact USING btree (project_id, contact_id, role_id)`

## tbl_project_inventory_columns
**Row Count (estimated):** 16
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| column_config_id | bigint | NO | nextval('tbl_project_inventory_columns_column_config_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| column_name | character varying(50) | NO | — | — |
| column_label | character varying(100) | NO | — | — |
| column_type | character varying(50) | NO | — | — |
| container_level | integer | YES | — | — |
| data_type | character varying(50) | YES | — | — |
| enum_options | jsonb | YES | — | — |
| is_required | boolean | YES | false | — |
| is_visible | boolean | YES | true | — |
| display_order | integer | NO | — | — |
| default_value | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| data_source_table | character varying(100) | YES | — | — |
| data_source_value_col | character varying(50) | YES | — | — |
| data_source_label_col | character varying(50) | YES | — | — |
| parent_column_name | character varying(50) | YES | — | — |
| junction_table | character varying(100) | YES | — | — |

**Indexes:**
- `idx_project_columns_order` — `CREATE INDEX idx_project_columns_order ON landscape.tbl_project_inventory_columns USING btree (project_id, display_order)`
- `idx_project_columns_project` — `CREATE INDEX idx_project_columns_project ON landscape.tbl_project_inventory_columns USING btree (project_id)`
- `tbl_project_inventory_columns_pkey` — `CREATE UNIQUE INDEX tbl_project_inventory_columns_pkey ON landscape.tbl_project_inventory_columns USING btree (column_config_id)`
- `uq_project_column` — `CREATE UNIQUE INDEX uq_project_column ON landscape.tbl_project_inventory_columns USING btree (project_id, column_name)`

**Check Constraints:**
- `CHECK (((column_type)::text = ANY ((ARRAY['hierarchy'::character varying, 'data'::character varying])::text[])))`
- `CHECK (((data_type IS NULL) OR ((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'currency'::character varying, 'date'::character varying, 'boolean'::character varying, 'enum'::character varying])::text[]))))`
- `CHECK (((data_type)::text = ANY ((ARRAY['text'::character varying, 'integer'::character varying, 'decimal'::character varying, 'boolean'::character varying, 'date'::character varying, 'json'::character varying])::text[])))`

## tbl_project_metrics
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| metrics_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| total_equity_invested | numeric(15,2) | YES | — | — |
| total_debt_proceeds | numeric(15,2) | YES | — | — |
| total_project_cost | numeric(15,2) | YES | — | — |
| project_irr_pct | numeric(6,3) | YES | — | — |
| equity_irr_pct | numeric(6,3) | YES | — | — |
| levered_irr_pct | numeric(6,3) | YES | — | — |
| unlevered_irr_pct | numeric(6,3) | YES | — | — |
| equity_multiple | numeric(6,3) | YES | — | — |
| stabilized_noi | numeric(15,2) | YES | — | — |
| exit_cap_rate_pct | numeric(5,2) | YES | — | — |
| exit_value | numeric(15,2) | YES | — | — |
| residual_land_value_per_acre | numeric(15,2) | YES | — | — |
| residual_land_value_per_unit | numeric(15,2) | YES | — | — |
| peak_debt | numeric(15,2) | YES | — | — |
| avg_dscr | numeric(6,3) | YES | — | — |
| min_dscr | numeric(6,3) | YES | — | — |
| development_duration_months | integer | YES | — | — |
| absorption_duration_months | integer | YES | — | — |
| calculated_at | timestamp with time zone | YES | now() | — |
| calculation_version | integer | YES | 1 | — |

**Indexes:**
- `idx_metrics_latest` — `CREATE INDEX idx_metrics_latest ON landscape.tbl_project_metrics USING btree (project_id, calculation_version DESC)`
- `idx_metrics_project` — `CREATE INDEX idx_metrics_project ON landscape.tbl_project_metrics USING btree (project_id)`
- `tbl_project_metrics_pkey` — `CREATE UNIQUE INDEX tbl_project_metrics_pkey ON landscape.tbl_project_metrics USING btree (metrics_id)`
- `uq_metrics_project_version` — `CREATE UNIQUE INDEX uq_metrics_project_version ON landscape.tbl_project_metrics USING btree (project_id, calculation_version)`

## tbl_project_settings
**Row Count (estimated):** 3
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| project_id | bigint | NO | — | tbl_project.project_id |
| default_currency | character varying(3) | YES | 'USD'::character varying | — |
| default_period_type | character varying(20) | YES | 'monthly'::character varying | — |
| global_inflation_rate | numeric | YES | 0.03 | — |
| analysis_start_date | date | YES | — | — |
| analysis_end_date | date | YES | — | — |
| discount_rate | numeric | YES | 0.10 | — |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |
| cost_inflation_set_id | bigint | YES | — | — |
| price_inflation_set_id | bigint | YES | — | — |

**Indexes:**
- `idx_project_settings_currency` — `CREATE INDEX idx_project_settings_currency ON landscape.tbl_project_settings USING btree (default_currency)`
- `tbl_project_settings_pkey` — `CREATE UNIQUE INDEX tbl_project_settings_pkey ON landscape.tbl_project_settings USING btree (project_id)`

**Check Constraints:**
- `CHECK (((analysis_end_date IS NULL) OR (analysis_start_date IS NULL) OR (analysis_end_date >= analysis_start_date)))`

## tbl_property_acquisition
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| acquisition_id | bigint | NO | nextval('tbl_property_acquisition_acquisition_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| purchase_price | numeric(15,2) | YES | — | — |
| acquisition_date | date | YES | — | — |
| hold_period_years | numeric(5,2) | YES | — | — |
| exit_cap_rate | numeric(6,4) | YES | — | — |
| sale_date | date | YES | — | — |
| closing_costs_pct | numeric(6,3) | YES | 0.015 | — |
| due_diligence_days | integer | YES | 30 | — |
| earnest_money | numeric(12,2) | YES | — | — |
| sale_costs_pct | numeric(6,3) | YES | 0.015 | — |
| broker_commission_pct | numeric(6,3) | YES | 0.025 | — |
| price_per_unit | numeric(10,2) | YES | — | — |
| price_per_sf | numeric(8,2) | YES | — | — |
| legal_fees | numeric(10,2) | YES | — | — |
| financing_fees | numeric(10,2) | YES | — | — |
| third_party_reports | numeric(10,2) | YES | — | — |
| depreciation_basis | numeric(15,2) | YES | — | — |
| land_pct | numeric(5,2) | YES | 20.0 | — |
| improvement_pct | numeric(5,2) | YES | 80.0 | — |
| is_1031_exchange | boolean | YES | false | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| grm | numeric(8,2) | YES | — | — |

**Indexes:**
- `idx_acquisition_project` — `CREATE INDEX idx_acquisition_project ON landscape.tbl_property_acquisition USING btree (project_id)`
- `tbl_property_acquisition_pkey` — `CREATE UNIQUE INDEX tbl_property_acquisition_pkey ON landscape.tbl_property_acquisition USING btree (acquisition_id)`

## tbl_property_apn
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| property_apn_id | bigint | NO | nextval('tbl_property_apn_property_apn_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| apn | character varying(50) | NO | — | — |
| is_primary | boolean | YES | false | — |
| county | character varying(100) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_property_apn_apn` — `CREATE INDEX idx_property_apn_apn ON landscape.tbl_property_apn USING btree (apn)`
- `idx_property_apn_project` — `CREATE INDEX idx_property_apn_project ON landscape.tbl_property_apn USING btree (project_id)`
- `tbl_property_apn_pkey` — `CREATE UNIQUE INDEX tbl_property_apn_pkey ON landscape.tbl_property_apn USING btree (property_apn_id)`

## tbl_property_attribute_def
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| attribute_id | bigint | NO | nextval('tbl_property_attribute_def_attribute_id_seq'::regclass) | — |
| category | character varying(50) | NO | — | — |
| subcategory | character varying(50) | YES | — | — |
| attribute_code | character varying(50) | NO | — | — |
| attribute_label | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| data_type | character varying(20) | NO | — | — |
| options | jsonb | YES | — | — |
| default_value | text | YES | — | — |
| is_required | boolean | YES | false | — |
| sort_order | integer | YES | 0 | — |
| display_width | character varying(20) | YES | 'full'::character varying | — |
| help_text | text | YES | — | — |
| property_types | jsonb | YES | — | — |
| is_system | boolean | YES | false | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_prop_attr_def_category` — `CREATE INDEX idx_prop_attr_def_category ON landscape.tbl_property_attribute_def USING btree (category, is_active)`
- `idx_prop_attr_def_property_types` — `CREATE INDEX idx_prop_attr_def_property_types ON landscape.tbl_property_attribute_def USING gin (property_types)`
- `idx_prop_attr_def_subcategory` — `CREATE INDEX idx_prop_attr_def_subcategory ON landscape.tbl_property_attribute_def USING btree (category, subcategory)`
- `tbl_property_attribute_def_category_attribute_code_key` — `CREATE UNIQUE INDEX tbl_property_attribute_def_category_attribute_code_key ON landscape.tbl_property_attribute_def USING btree (category, attribute_code)`
- `tbl_property_attribute_def_pkey` — `CREATE UNIQUE INDEX tbl_property_attribute_def_pkey ON landscape.tbl_property_attribute_def USING btree (attribute_id)`

**Check Constraints:**
- `CHECK (((category)::text = ANY ((ARRAY['site'::character varying, 'improvement'::character varying])::text[])))`
- `CHECK (((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'select'::character varying, 'multiselect'::character varying, 'rating'::character varying, 'narrative'::character varying])::text[])))`

## tbl_property_type_config
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| config_id | bigint | NO | nextval('tbl_property_type_config_config_id_seq'::regclass) | — |
| property_type | character varying(50) | NO | — | — |
| tab_label | character varying(50) | NO | — | — |
| description | text | YES | — | — |
| default_columns | jsonb | NO | — | — |
| import_suggestions | jsonb | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `tbl_property_type_config_pkey` — `CREATE UNIQUE INDEX tbl_property_type_config_pkey ON landscape.tbl_property_type_config USING btree (config_id)`
- `tbl_property_type_config_property_type_key` — `CREATE UNIQUE INDEX tbl_property_type_config_property_type_key ON landscape.tbl_property_type_config USING btree (property_type)`

## tbl_property_use_template
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| template_id | bigint | NO | nextval('tbl_property_use_template_template_id_seq'::regclass) | — |
| template_name | character varying(100) | NO | — | — |
| property_type | character varying(50) | NO | — | — |
| template_category | character varying(50) | YES | — | — |
| description | text | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_template_property_type` — `CREATE INDEX idx_template_property_type ON landscape.tbl_property_use_template USING btree (property_type, is_active)`
- `tbl_property_use_template_pkey` — `CREATE UNIQUE INDEX tbl_property_use_template_pkey ON landscape.tbl_property_use_template USING btree (template_id)`

## tbl_recovery
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| recovery_id | integer | NO | — | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| recovery_structure | character varying(50) | YES | 'Triple Net'::character varying | — |
| expense_cap_pct | numeric(5,2) | YES | — | — |
| categories | jsonb | NO | '[]'::jsonb | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_recovery_lease` — `CREATE INDEX idx_recovery_lease ON landscape.tbl_recovery USING btree (lease_id)`
- `tbl_recovery_pkey` — `CREATE UNIQUE INDEX tbl_recovery_pkey ON landscape.tbl_recovery USING btree (recovery_id)`
- `uq_recovery_lease` — `CREATE UNIQUE INDEX uq_recovery_lease ON landscape.tbl_recovery USING btree (lease_id)`

## tbl_renewal_option
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| renewal_option_id | integer | NO | nextval('tbl_renewal_option_renewal_option_id_seq'::regclass) | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| option_number | integer | NO | — | — |
| option_term_months | integer | NO | — | — |
| option_term_years | numeric(4,1) | YES | — | — |
| notice_period_months | integer | YES | — | — |
| earliest_notice_date | date | YES | — | — |
| latest_notice_date | date | YES | — | — |
| notice_received | boolean | YES | false | — |
| notice_received_date | date | YES | — | — |
| rent_determination_method | character varying(50) | YES | — | — |
| fixed_rent_psf | numeric(8,2) | YES | — | — |
| fixed_rent_annual | numeric(12,2) | YES | — | — |
| market_rent_floor_psf | numeric(8,2) | YES | — | — |
| market_rent_ceiling_psf | numeric(8,2) | YES | — | — |
| cpi_adjustment_pct | numeric(5,2) | YES | — | — |
| formula_description | text | YES | — | — |
| option_escalation_type | character varying(50) | YES | — | — |
| option_escalation_pct | numeric(5,2) | YES | — | — |
| option_escalation_frequency | character varying(20) | YES | — | — |
| fmv_determination_period_days | integer | YES | — | — |
| fmv_arbitration_required | boolean | YES | false | — |
| fmv_appraiser_selection | character varying(100) | YES | — | — |
| option_exercised | boolean | YES | false | — |
| exercise_date | date | YES | — | — |
| exercised_rent_psf | numeric(8,2) | YES | — | — |
| exercised_rent_annual | numeric(12,2) | YES | — | — |
| exercise_conditions | text | YES | — | — |
| no_default_required | boolean | YES | true | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_renewal_lease` — `CREATE INDEX idx_renewal_lease ON landscape.tbl_renewal_option USING btree (lease_id)`
- `idx_renewal_lease_number` — `CREATE UNIQUE INDEX idx_renewal_lease_number ON landscape.tbl_renewal_option USING btree (lease_id, option_number)`
- `idx_renewal_notice` — `CREATE INDEX idx_renewal_notice ON landscape.tbl_renewal_option USING btree (latest_notice_date)`
- `tbl_renewal_option_pkey` — `CREATE UNIQUE INDEX tbl_renewal_option_pkey ON landscape.tbl_renewal_option USING btree (renewal_option_id)`

## tbl_rent_comparable
**Row Count (estimated):** 42
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| comparable_id | integer | NO | nextval('tbl_rent_comparable_comparable_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| property_name | character varying(200) | NO | — | — |
| address | character varying(300) | YES | — | — |
| distance_miles | numeric(5,2) | YES | — | — |
| year_built | integer | YES | — | — |
| total_units | integer | YES | — | — |
| unit_type | character varying(50) | YES | — | — |
| bedrooms | numeric(3,1) | YES | — | — |
| bathrooms | numeric(3,1) | YES | — | — |
| avg_sqft | integer | YES | — | — |
| asking_rent | numeric(10,2) | YES | — | — |
| effective_rent | numeric(10,2) | YES | — | — |
| concessions | character varying(500) | YES | — | — |
| amenities | text | YES | — | — |
| notes | text | YES | — | — |
| data_source | character varying(100) | YES | — | — |
| as_of_date | date | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_rent_comparable_project` — `CREATE INDEX idx_rent_comparable_project ON landscape.tbl_rent_comparable USING btree (project_id)`
- `idx_rent_comparable_unit_type` — `CREATE INDEX idx_rent_comparable_unit_type ON landscape.tbl_rent_comparable USING btree (unit_type)`
- `tbl_rent_comparable_pkey` — `CREATE UNIQUE INDEX tbl_rent_comparable_pkey ON landscape.tbl_rent_comparable USING btree (comparable_id)`

## tbl_rent_concession
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| concession_id | integer | NO | nextval('tbl_rent_concession_concession_id_seq'::regclass) | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| concession_type | character varying(50) | YES | — | — |
| concession_start_date | date | YES | — | — |
| concession_end_date | date | YES | — | — |
| concession_months | integer | YES | — | — |
| concession_amount_monthly | numeric(10,2) | YES | — | — |
| concession_amount_total | numeric(12,2) | YES | — | — |
| concession_psf | numeric(8,2) | YES | — | — |
| concession_pct_of_rent | numeric(5,2) | YES | — | — |
| concession_timing | character varying(50) | YES | — | — |
| applies_to_base_rent | boolean | YES | true | — |
| applies_to_cam | boolean | YES | false | — |
| applies_to_taxes | boolean | YES | false | — |
| burn_off_upon_default | boolean | YES | false | — |
| burn_off_upon_assignment | boolean | YES | false | — |
| remaining_concession_value | numeric(12,2) | YES | — | — |
| amortized_over_months | integer | YES | — | — |
| amortization_start_date | date | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_concession_dates` — `CREATE INDEX idx_concession_dates ON landscape.tbl_rent_concession USING btree (concession_start_date, concession_end_date)`
- `idx_concession_lease` — `CREATE INDEX idx_concession_lease ON landscape.tbl_rent_concession USING btree (lease_id)`
- `tbl_rent_concession_pkey` — `CREATE UNIQUE INDEX tbl_rent_concession_pkey ON landscape.tbl_rent_concession USING btree (concession_id)`

## tbl_rent_escalation
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| escalation_id | integer | NO | nextval('tbl_rent_escalation_escalation_id_seq'::regclass) | — |
| lease_id | integer | YES | — | tbl_commercial_lease.lease_id |
| escalation_type | character varying(50) | YES | — | — |
| escalation_pct | numeric(6,3) | YES | — | — |
| escalation_frequency | character varying(20) | YES | — | — |
| compound_escalation | boolean | YES | true | — |
| cpi_index | character varying(50) | YES | — | — |
| cpi_floor_pct | numeric(6,3) | YES | — | — |
| cpi_cap_pct | numeric(6,3) | YES | — | — |
| annual_increase_amount | numeric(10,2) | YES | — | — |
| step_schedule | text | YES | — | — |
| first_escalation_date | date | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `tbl_cre_rent_escalation_pkey` — `CREATE UNIQUE INDEX tbl_cre_rent_escalation_pkey ON landscape.tbl_rent_escalation USING btree (escalation_id)`

## tbl_rent_roll
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| rent_roll_id | bigint | NO | nextval('tbl_rent_roll_rent_roll_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| tenant_name | character varying(255) | NO | — | — |
| space_type | character varying(50) | YES | — | — |
| lease_start_date | date | NO | — | — |
| lease_end_date | date | NO | — | — |
| lease_term_months | integer | NO | — | — |
| leased_sf | numeric(12,2) | NO | — | — |
| base_rent_psf_annual | numeric(10,2) | NO | — | — |
| escalation_type | character varying(50) | YES | 'NONE'::character varying | — |
| escalation_value | numeric(10,4) | YES | — | — |
| escalation_frequency_months | integer | YES | 12 | — |
| recovery_structure | character varying(50) | YES | 'GROSS'::character varying | — |
| cam_recovery_rate | numeric(6,5) | YES | 1.0 | — |
| tax_recovery_rate | numeric(6,5) | YES | 1.0 | — |
| insurance_recovery_rate | numeric(6,5) | YES | 1.0 | — |
| free_rent_months | integer | YES | 0 | — |
| free_rent_start_month | integer | YES | 1 | — |
| rent_abatement_amount | numeric(12,2) | YES | 0 | — |
| has_percentage_rent | boolean | YES | false | — |
| percentage_rent_rate | numeric(6,5) | YES | — | — |
| percentage_rent_breakpoint | numeric(12,2) | YES | — | — |
| ti_allowance_psf | numeric(10,2) | YES | 0 | — |
| lc_allowance_psf | numeric(10,2) | YES | 0 | — |
| lease_status | character varying(50) | YES | 'ACTIVE'::character varying | — |
| is_vacancy | boolean | YES | false | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_rent_roll_end_date` — `CREATE INDEX idx_rent_roll_end_date ON landscape.tbl_rent_roll USING btree (lease_end_date)`
- `idx_rent_roll_project` — `CREATE INDEX idx_rent_roll_project ON landscape.tbl_rent_roll USING btree (project_id)`
- `idx_rent_roll_space_type` — `CREATE INDEX idx_rent_roll_space_type ON landscape.tbl_rent_roll USING btree (space_type)`
- `idx_rent_roll_status` — `CREATE INDEX idx_rent_roll_status ON landscape.tbl_rent_roll USING btree (lease_status)`
- `tbl_rent_roll_pkey` — `CREATE UNIQUE INDEX tbl_rent_roll_pkey ON landscape.tbl_rent_roll USING btree (rent_roll_id)`

**Check Constraints:**
- `CHECK (((escalation_type)::text = ANY ((ARRAY['NONE'::character varying, 'FIXED_DOLLAR'::character varying, 'FIXED_PERCENT'::character varying, 'CPI'::character varying, 'STEPPED'::character varying])::text[])))`
- `CHECK (((lease_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'EXPIRED'::character varying, 'TERMINATED'::character varying, 'PENDING'::character varying])::text[])))`
- `CHECK (((recovery_structure)::text = ANY ((ARRAY['GROSS'::character varying, 'NNN'::character varying, 'MODIFIED_GROSS'::character varying, 'INDUSTRIAL_GROSS'::character varying])::text[])))`
- `CHECK (((space_type)::text = ANY ((ARRAY['OFFICE'::character varying, 'RETAIL'::character varying, 'INDUSTRIAL'::character varying, 'MEDICAL'::character varying, 'FLEX'::character varying, 'OTHER'::character varying])::text[])))`
- `CHECK ((leased_sf > (0)::numeric))`

## tbl_rent_roll_unit
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| rent_roll_id | bigint | NO | nextval('tbl_rent_roll_unit_rent_roll_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| unit_id | bigint | YES | — | — |
| unit_number | character varying(20) | NO | — | — |
| unit_type | character varying(50) | YES | — | — |
| square_feet | integer | YES | — | — |
| current_rent | numeric(10,2) | YES | — | — |
| market_rent | numeric(10,2) | YES | — | — |
| lease_start_date | date | YES | — | — |
| lease_end_date | date | YES | — | — |
| tenant_name | character varying(200) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_rent_roll_unit` — `CREATE INDEX idx_rent_roll_unit ON landscape.tbl_rent_roll_unit USING btree (unit_id)`
- `tbl_rent_roll_unit_pkey` — `CREATE UNIQUE INDEX tbl_rent_roll_unit_pkey ON landscape.tbl_rent_roll_unit USING btree (rent_roll_id)`

## tbl_rent_schedule
**Row Count (estimated):** 13
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| base_rent_id | integer | NO | nextval('tbl_rent_schedule_rent_schedule_id_seq'::regclass) | — |
| lease_id | integer | YES | — | tbl_commercial_lease.lease_id |
| period_start_date | date | NO | — | — |
| period_end_date | date | NO | — | — |
| period_number | integer | YES | — | — |
| base_rent_annual | numeric(12,2) | YES | — | — |
| base_rent_monthly | numeric(12,2) | YES | — | — |
| base_rent_psf_annual | numeric(8,2) | YES | — | — |
| rent_type | character varying(50) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_cre_base_rent_lease_id` — `CREATE INDEX idx_cre_base_rent_lease_id ON landscape.tbl_rent_schedule USING btree (lease_id)`
- `tbl_cre_base_rent_pkey` — `CREATE UNIQUE INDEX tbl_cre_base_rent_pkey ON landscape.tbl_rent_schedule USING btree (base_rent_id)`

## tbl_rent_step
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| rent_step_id | integer | NO | nextval('tbl_rent_step_rent_step_id_seq'::regclass) | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| step_number | integer | NO | — | — |
| step_effective_date | date | NO | — | — |
| step_end_date | date | YES | — | — |
| base_rent_psf | numeric(8,2) | YES | — | — |
| base_rent_monthly | numeric(12,2) | YES | — | — |
| base_rent_annual | numeric(14,2) | YES | — | — |
| step_type | character varying(50) | YES | — | — |
| step_increase_pct | numeric(5,2) | YES | — | — |
| step_increase_amount | numeric(10,2) | YES | — | — |
| cumulative_increase_pct | numeric(5,2) | YES | — | — |
| cpi_index | character varying(100) | YES | — | — |
| cpi_base_value | numeric(10,2) | YES | — | — |
| cpi_current_value | numeric(10,2) | YES | — | — |
| cpi_floor_pct | numeric(5,2) | YES | — | — |
| cpi_cap_pct | numeric(5,2) | YES | — | — |
| rent_psf_change | numeric(8,2) | YES | — | — |
| rent_annual_change | numeric(14,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_rent_step_date` — `CREATE INDEX idx_rent_step_date ON landscape.tbl_rent_step USING btree (step_effective_date)`
- `idx_rent_step_lease` — `CREATE INDEX idx_rent_step_lease ON landscape.tbl_rent_step USING btree (lease_id)`
- `idx_rent_step_lease_number` — `CREATE UNIQUE INDEX idx_rent_step_lease_number ON landscape.tbl_rent_step USING btree (lease_id, step_number)`
- `tbl_rent_step_pkey` — `CREATE UNIQUE INDEX tbl_rent_step_pkey ON landscape.tbl_rent_step USING btree (rent_step_id)`

## tbl_rental_comparable
**Row Count (estimated):** 31
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| comparable_id | integer | NO | nextval('tbl_rental_comparable_comparable_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| property_name | character varying(200) | NO | — | — |
| address | character varying(300) | YES | — | — |
| latitude | numeric(10,6) | YES | — | — |
| longitude | numeric(11,6) | YES | — | — |
| distance_miles | numeric(5,2) | YES | — | — |
| year_built | integer | YES | — | — |
| total_units | integer | YES | — | — |
| unit_type | character varying(50) | NO | — | — |
| bedrooms | numeric(3,1) | NO | — | — |
| bathrooms | numeric(3,1) | NO | — | — |
| avg_sqft | integer | NO | — | — |
| asking_rent | numeric(10,2) | NO | — | — |
| effective_rent | numeric(10,2) | YES | — | — |
| concessions | character varying(500) | YES | — | — |
| amenities | text | YES | — | — |
| notes | text | YES | — | — |
| data_source | character varying(100) | YES | — | — |
| as_of_date | date | NO | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_rental_comp_location` — `CREATE INDEX idx_rental_comp_location ON landscape.tbl_rental_comparable USING btree (latitude, longitude)`
- `idx_rental_comp_project` — `CREATE INDEX idx_rental_comp_project ON landscape.tbl_rental_comparable USING btree (project_id)`
- `tbl_rental_comparable_pkey` — `CREATE UNIQUE INDEX tbl_rental_comparable_pkey ON landscape.tbl_rental_comparable USING btree (comparable_id)`

## tbl_revenue_other
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| other_income_id | bigint | NO | nextval('tbl_revenue_other_other_income_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| other_income_per_unit_monthly | numeric(8,2) | YES | 0 | — |
| parking_income_per_space | numeric(8,2) | YES | 50 | — |
| parking_spaces | integer | YES | — | — |
| pet_fee_per_pet | numeric(8,2) | YES | 35 | — |
| pet_penetration_pct | numeric(5,2) | YES | 0.30 | — |
| laundry_income_per_unit | numeric(8,2) | YES | 15 | — |
| storage_income_per_unit | numeric(8,2) | YES | 10 | — |
| application_fees_annual | numeric(10,2) | YES | 0 | — |
| late_fees_annual | numeric(10,2) | YES | — | — |
| utility_reimbursements_annual | numeric(10,2) | YES | — | — |
| furnished_unit_premium_pct | numeric(5,2) | YES | — | — |
| short_term_rental_income | numeric(10,2) | YES | — | — |
| ancillary_services_income | numeric(10,2) | YES | — | — |
| vending_income | numeric(8,2) | YES | — | — |
| package_locker_fees | numeric(8,2) | YES | — | — |
| reserved_parking_premium | numeric(8,2) | YES | — | — |
| ev_charging_fees | numeric(8,2) | YES | — | — |
| other_miscellaneous | numeric(10,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| income_category | character varying(50) | YES | — | — |

**Indexes:**
- `idx_other_income_project` — `CREATE INDEX idx_other_income_project ON landscape.tbl_revenue_other USING btree (project_id)`
- `tbl_revenue_other_pkey` — `CREATE UNIQUE INDEX tbl_revenue_other_pkey ON landscape.tbl_revenue_other USING btree (other_income_id)`
- `uq_revenue_other_project` — `CREATE UNIQUE INDEX uq_revenue_other_project ON landscape.tbl_revenue_other USING btree (project_id)`

## tbl_revenue_rent
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| rent_id | bigint | NO | nextval('tbl_revenue_rent_rent_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| current_rent_psf | numeric(8,2) | NO | — | — |
| occupancy_pct | numeric(5,2) | NO | 0.95 | — |
| annual_rent_growth_pct | numeric(5,3) | NO | 0.03 | — |
| in_place_rent_psf | numeric(8,2) | YES | — | — |
| market_rent_psf | numeric(8,2) | YES | — | — |
| rent_loss_to_lease_pct | numeric(5,2) | YES | — | — |
| lease_up_months | integer | YES | 12 | — |
| stabilized_occupancy_pct | numeric(5,2) | YES | 0.96 | — |
| rent_growth_years_1_3_pct | numeric(5,3) | YES | 0.04 | — |
| rent_growth_stabilized_pct | numeric(5,3) | YES | 0.025 | — |
| free_rent_months | numeric(4,1) | YES | 0 | — |
| ti_allowance_per_unit | numeric(10,2) | YES | 0 | — |
| renewal_probability_pct | numeric(5,2) | YES | 0.60 | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_rent_project` — `CREATE INDEX idx_rent_project ON landscape.tbl_revenue_rent USING btree (project_id)`
- `tbl_revenue_rent_pkey` — `CREATE UNIQUE INDEX tbl_revenue_rent_pkey ON landscape.tbl_revenue_rent USING btree (rent_id)`

## tbl_revenue_timing
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| revenue_timing_id | bigint | NO | nextval('tbl_revenue_timing_revenue_timing_id_seq'::regclass) | — |
| absorption_id | bigint | NO | — | tbl_absorption_schedule.absorption_id |
| period_id | bigint | NO | — | tbl_calculation_period.period_id |
| units_sold_this_period | numeric(8,2) | YES | 0 | — |
| cumulative_units_sold | numeric(12,2) | YES | 0 | — |
| units_remaining | numeric(12,2) | YES | — | — |
| average_price_this_period | numeric(12,2) | YES | — | — |
| gross_revenue | numeric(15,2) | YES | — | — |
| sales_commission | numeric(15,2) | YES | 0 | — |
| closing_costs | numeric(15,2) | YES | 0 | — |
| net_revenue | numeric(15,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_revenue_timing_absorption` — `CREATE INDEX idx_revenue_timing_absorption ON landscape.tbl_revenue_timing USING btree (absorption_id, period_id)`
- `idx_revenue_timing_period` — `CREATE INDEX idx_revenue_timing_period ON landscape.tbl_revenue_timing USING btree (period_id)`
- `tbl_revenue_timing_pkey` — `CREATE UNIQUE INDEX tbl_revenue_timing_pkey ON landscape.tbl_revenue_timing USING btree (revenue_timing_id)`
- `uq_revenue_timing_period` — `CREATE UNIQUE INDEX uq_revenue_timing_period ON landscape.tbl_revenue_timing USING btree (absorption_id, period_id)`

## tbl_sale_benchmarks
**Row Count (estimated):** 12
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| benchmark_id | integer | NO | nextval('tbl_sale_benchmarks_benchmark_id_seq'::regclass) | — |
| scope_level | character varying(20) | NO | — | — |
| project_id | integer | YES | — | tbl_project.project_id |
| lu_type_code | character varying(20) | YES | — | — |
| product_code | character varying(50) | YES | — | — |
| benchmark_type | character varying(50) | NO | — | — |
| benchmark_name | character varying(100) | YES | — | — |
| rate_pct | numeric(5,4) | YES | — | — |
| amount_per_uom | numeric(12,2) | YES | — | — |
| fixed_amount | numeric(12,2) | YES | — | — |
| uom_code | character varying(10) | YES | — | — |
| description | text | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| created_by | character varying(255) | YES | — | — |
| updated_by | character varying(255) | YES | — | — |
| basis | character varying(50) | YES | — | — |

**Indexes:**
- `idx_sale_benchmarks_product` — `CREATE INDEX idx_sale_benchmarks_product ON landscape.tbl_sale_benchmarks USING btree (project_id, lu_type_code, product_code)`
- `idx_sale_benchmarks_scope` — `CREATE INDEX idx_sale_benchmarks_scope ON landscape.tbl_sale_benchmarks USING btree (scope_level, project_id)`
- `idx_sale_benchmarks_type` — `CREATE INDEX idx_sale_benchmarks_type ON landscape.tbl_sale_benchmarks USING btree (benchmark_type)`
- `tbl_sale_benchmarks_pkey` — `CREATE UNIQUE INDEX tbl_sale_benchmarks_pkey ON landscape.tbl_sale_benchmarks USING btree (benchmark_id)`

**Check Constraints:**
- `CHECK (((scope_level)::text = ANY ((ARRAY['global'::character varying, 'project'::character varying, 'product'::character varying])::text[])))`

## tbl_sale_phases
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| phase_code | character varying(20) | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| phase_name | character varying(100) | YES | — | — |
| default_sale_date | date | NO | — | — |
| default_commission_pct | numeric(5,2) | YES | 3.0 | — |
| default_closing_cost_per_unit | numeric(12,2) | YES | 750.00 | — |
| default_onsite_cost_pct | numeric(5,2) | YES | 6.5 | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_sale_phases_project` — `CREATE INDEX idx_sale_phases_project ON landscape.tbl_sale_phases USING btree (project_id)`
- `tbl_sale_phases_pkey` — `CREATE UNIQUE INDEX tbl_sale_phases_pkey ON landscape.tbl_sale_phases USING btree (phase_code)`

## tbl_sale_settlement
**Row Count (estimated):** 1
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| settlement_id | bigint | NO | nextval('tbl_sale_settlement_settlement_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| container_id | bigint | YES | — | tbl_division.division_id |
| sale_date | date | NO | — | — |
| buyer_name | character varying(200) | YES | — | — |
| buyer_entity | character varying(200) | YES | — | — |
| list_price | numeric(15,2) | YES | — | — |
| allocated_cost_to_complete | numeric(15,2) | YES | 0 | — |
| other_adjustments | numeric(15,2) | YES | 0 | — |
| net_proceeds | numeric(15,2) | YES | — | — |
| settlement_type | character varying(50) | YES | — | — |
| settlement_notes | text | YES | — | — |
| cost_allocation_detail | jsonb | YES | — | — |
| has_participation | boolean | YES | false | — |
| participation_rate | numeric(6,3) | YES | — | — |
| participation_basis | character varying(50) | YES | — | — |
| participation_minimum | numeric(15,2) | YES | — | — |
| participation_target_price | numeric(12,2) | YES | — | — |
| settlement_status | character varying(50) | YES | 'pending'::character varying | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| created_by | character varying(100) | YES | — | — |
| updated_by | character varying(100) | YES | — | — |
| parcel_id | integer | YES | — | — |
| sale_phase_code | character varying(20) | YES | — | — |
| commission_pct | numeric(5,2) | YES | — | — |
| closing_cost_per_unit | numeric(12,2) | YES | — | — |
| onsite_cost_pct | numeric(5,2) | YES | — | — |
| gross_value | numeric(15,2) | YES | — | — |

**Indexes:**
- `idx_sale_settlement_container` — `CREATE INDEX idx_sale_settlement_container ON landscape.tbl_sale_settlement USING btree (container_id)`
- `idx_sale_settlement_parcel` — `CREATE INDEX idx_sale_settlement_parcel ON landscape.tbl_sale_settlement USING btree (parcel_id)`
- `idx_sale_settlement_phase` — `CREATE INDEX idx_sale_settlement_phase ON landscape.tbl_sale_settlement USING btree (sale_phase_code)`
- `idx_settlement_container` — `CREATE INDEX idx_settlement_container ON landscape.tbl_sale_settlement USING btree (container_id)`
- `idx_settlement_date` — `CREATE INDEX idx_settlement_date ON landscape.tbl_sale_settlement USING btree (sale_date)`
- `idx_settlement_project` — `CREATE INDEX idx_settlement_project ON landscape.tbl_sale_settlement USING btree (project_id)`
- `idx_settlement_status` — `CREATE INDEX idx_settlement_status ON landscape.tbl_sale_settlement USING btree (settlement_status)`
- `tbl_sale_settlement_pkey` — `CREATE UNIQUE INDEX tbl_sale_settlement_pkey ON landscape.tbl_sale_settlement USING btree (settlement_id)`

**Check Constraints:**
- `CHECK (((participation_basis IS NULL) OR ((participation_basis)::text = ANY ((ARRAY['gross_home_sales'::character varying, 'net_home_sales'::character varying])::text[]))))`
- `CHECK (((settlement_status)::text = ANY ((ARRAY['pending'::character varying, 'closed'::character varying, 'cancelled'::character varying])::text[])))`
- `CHECK (((settlement_type IS NULL) OR ((settlement_type)::text = ANY ((ARRAY['cash_sale'::character varying, 'seller_note'::character varying, 'earnout'::character varying, 'participation'::character varying])::text[]))))`

## tbl_sales_comp_adjustments
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| adjustment_id | integer | NO | nextval('tbl_sales_comp_adjustments_adjustment_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| adjustment_type | character varying(50) | NO | — | — |
| adjustment_pct | numeric(6,3) | YES | — | — |
| adjustment_amount | numeric(12,2) | YES | — | — |
| justification | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| user_adjustment_pct | numeric(7,4) | YES | — | — |
| ai_accepted | boolean | YES | false | — |
| user_notes | text | YES | — | — |
| last_modified_by | character varying(100) | YES | — | — |
| landscaper_analysis | text | YES | — | — |
| user_override_analysis | text | YES | — | — |
| analysis_inputs | jsonb | YES | — | — |
| confidence_score | numeric(3,2) | YES | — | — |
| created_by | character varying(50) | YES | — | — |
| approved_by | integer | YES | — | — |
| approved_at | timestamp with time zone | YES | — | — |
| subject_value | character varying(255) | YES | — | — |
| comp_value | character varying(255) | YES | — | — |

**Indexes:**
- `idx_sales_comp_adjustments_comparable` — `CREATE INDEX idx_sales_comp_adjustments_comparable ON landscape.tbl_sales_comp_adjustments USING btree (comparable_id)`
- `tbl_sales_comp_adjustments_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_adjustments_pkey ON landscape.tbl_sales_comp_adjustments USING btree (adjustment_id)`

**Check Constraints:**
- `CHECK (((adjustment_type)::text = ANY ((ARRAY['location'::character varying, 'physical_age'::character varying, 'physical_condition'::character varying, 'physical_unit_mix'::character varying, 'physical_size'::character varying, 'physical_building_sf'::character varying, 'physical_stories'::character varying, 'physical_lot_size'::character varying, 'market_conditions'::character varying, 'financing'::character varying, 'sale_conditions'::character varying, 'property_rights'::character varying, 'other'::character varying])::text[])))`

## tbl_sales_comp_contacts
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| contact_id | integer | NO | nextval('tbl_sales_comp_contacts_contact_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| role | character varying(50) | NO | — | — |
| name | character varying(255) | YES | — | — |
| company | character varying(255) | YES | — | — |
| phone | character varying(50) | YES | — | — |
| email | character varying(255) | YES | — | — |
| is_verification_source | boolean | NO | false | — |
| verification_date | date | YES | — | — |
| sort_order | integer | NO | 0 | — |
| created_at | timestamp with time zone | NO | now() | — |
| updated_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `idx_comp_contacts_comparable` — `CREATE INDEX idx_comp_contacts_comparable ON landscape.tbl_sales_comp_contacts USING btree (comparable_id)`
- `tbl_sales_comp_contacts_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_contacts_pkey ON landscape.tbl_sales_comp_contacts USING btree (contact_id)`

## tbl_sales_comp_history
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| history_id | bigint | NO | nextval('tbl_sales_comp_history_history_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| sale_date | date | NO | — | — |
| sale_price | numeric(15,2) | YES | — | — |
| price_per_sf | numeric(10,2) | YES | — | — |
| price_per_unit | numeric(10,2) | YES | — | — |
| buyer_name | character varying(255) | YES | — | — |
| seller_name | character varying(255) | YES | — | — |
| sale_type | character varying(50) | YES | — | — |
| document_number | character varying(50) | YES | — | — |
| is_arms_length | boolean | YES | true | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_history_comparable` — `CREATE INDEX idx_comp_history_comparable ON landscape.tbl_sales_comp_history USING btree (comparable_id)`
- `idx_comp_history_date` — `CREATE INDEX idx_comp_history_date ON landscape.tbl_sales_comp_history USING btree (sale_date DESC)`
- `tbl_sales_comp_history_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_history_pkey ON landscape.tbl_sales_comp_history USING btree (history_id)`

## tbl_sales_comp_hospitality
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| hospitality_id | bigint | NO | nextval('tbl_sales_comp_hospitality_hospitality_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| total_rooms | integer | YES | — | — |
| available_rooms | integer | YES | — | — |
| suites_count | integer | YES | — | — |
| occupancy_rate | numeric(5,2) | YES | — | — |
| adr | numeric(10,2) | YES | — | — |
| revpar | numeric(10,2) | YES | — | — |
| total_revenue | numeric(15,2) | YES | — | — |
| rooms_revenue | numeric(15,2) | YES | — | — |
| fb_revenue | numeric(15,2) | YES | — | — |
| other_revenue | numeric(15,2) | YES | — | — |
| flag_brand | character varying(100) | YES | — | — |
| franchise_company | character varying(255) | YES | — | — |
| management_company | character varying(255) | YES | — | — |
| chain_scale | character varying(50) | YES | — | — |
| meeting_space_sf | numeric(12,2) | YES | — | — |
| restaurant_count | integer | YES | — | — |
| pool | boolean | YES | — | — |
| fitness_center | boolean | YES | — | — |
| spa | boolean | YES | — | — |
| last_renovation_year | integer | YES | — | — |
| last_pia_year | integer | YES | — | — |
| franchise_expiration | date | YES | — | — |
| management_expiration | date | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_hospitality_brand` — `CREATE INDEX idx_comp_hospitality_brand ON landscape.tbl_sales_comp_hospitality USING btree (flag_brand)`
- `idx_comp_hospitality_comparable` — `CREATE INDEX idx_comp_hospitality_comparable ON landscape.tbl_sales_comp_hospitality USING btree (comparable_id)`
- `tbl_sales_comp_hospitality_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_hospitality_pkey ON landscape.tbl_sales_comp_hospitality USING btree (hospitality_id)`
- `uq_comp_hospitality` — `CREATE UNIQUE INDEX uq_comp_hospitality ON landscape.tbl_sales_comp_hospitality USING btree (comparable_id)`

## tbl_sales_comp_industrial
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| industrial_id | bigint | NO | nextval('tbl_sales_comp_industrial_industrial_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| clear_height_min | numeric(6,2) | YES | — | — |
| clear_height_max | numeric(6,2) | YES | — | — |
| column_spacing | character varying(50) | YES | — | — |
| dock_doors_exterior | integer | YES | — | — |
| dock_doors_interior | integer | YES | — | — |
| drive_in_doors | integer | YES | — | — |
| rail_doors | integer | YES | — | — |
| trailer_parking_spaces | integer | YES | — | — |
| auto_parking_spaces | integer | YES | — | — |
| yard_area_sf | numeric(12,2) | YES | — | — |
| fenced_yard | boolean | YES | — | — |
| rail_access | boolean | YES | false | — |
| rail_served | boolean | YES | false | — |
| crane_capacity_tons | numeric(8,2) | YES | — | — |
| crane_count | integer | YES | — | — |
| power_voltage | integer | YES | — | — |
| power_amps | integer | YES | — | — |
| power_phase | integer | YES | — | — |
| office_sf | numeric(12,2) | YES | — | — |
| office_pct | numeric(5,2) | YES | — | — |
| environmental_phase1 | boolean | YES | — | — |
| environmental_phase2 | boolean | YES | — | — |
| environmental_issues | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_industrial_comparable` — `CREATE INDEX idx_comp_industrial_comparable ON landscape.tbl_sales_comp_industrial USING btree (comparable_id)`
- `tbl_sales_comp_industrial_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_industrial_pkey ON landscape.tbl_sales_comp_industrial USING btree (industrial_id)`
- `uq_comp_industrial` — `CREATE UNIQUE INDEX uq_comp_industrial ON landscape.tbl_sales_comp_industrial USING btree (comparable_id)`

## tbl_sales_comp_land
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| land_id | bigint | NO | nextval('tbl_sales_comp_land_land_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| current_zoning | character varying(100) | YES | — | — |
| proposed_zoning | character varying(100) | YES | — | — |
| zoning_description | text | YES | — | — |
| entitled | boolean | YES | false | — |
| entitlement_status | character varying(100) | YES | — | — |
| approved_uses | text | YES | — | — |
| approved_density | numeric(10,2) | YES | — | — |
| approved_units | integer | YES | — | — |
| approved_sf | numeric(15,2) | YES | — | — |
| max_far | numeric(6,2) | YES | — | — |
| max_height_ft | numeric(8,2) | YES | — | — |
| topography | character varying(100) | YES | — | — |
| shape | character varying(50) | YES | — | — |
| frontage_ft | numeric(10,2) | YES | — | — |
| depth_ft | numeric(10,2) | YES | — | — |
| corner_lot | boolean | YES | false | — |
| flood_zone | character varying(50) | YES | — | — |
| wetlands_pct | numeric(5,2) | YES | — | — |
| water_available | boolean | YES | — | — |
| sewer_available | boolean | YES | — | — |
| gas_available | boolean | YES | — | — |
| electric_available | boolean | YES | — | — |
| utility_notes | text | YES | — | — |
| existing_improvements | text | YES | — | — |
| demolition_required | boolean | YES | false | — |
| demolition_cost_estimate | numeric(12,2) | YES | — | — |
| phase1_complete | boolean | YES | — | — |
| phase2_complete | boolean | YES | — | — |
| remediation_required | boolean | YES | false | — |
| remediation_cost_estimate | numeric(12,2) | YES | — | — |
| impact_fees_estimate | numeric(12,2) | YES | — | — |
| offsite_costs_estimate | numeric(12,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_land_comparable` — `CREATE INDEX idx_comp_land_comparable ON landscape.tbl_sales_comp_land USING btree (comparable_id)`
- `idx_comp_land_entitled` — `CREATE INDEX idx_comp_land_entitled ON landscape.tbl_sales_comp_land USING btree (entitled)`
- `tbl_sales_comp_land_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_land_pkey ON landscape.tbl_sales_comp_land USING btree (land_id)`
- `uq_comp_land` — `CREATE UNIQUE INDEX uq_comp_land ON landscape.tbl_sales_comp_land USING btree (comparable_id)`

## tbl_sales_comp_manufactured
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| manufactured_id | bigint | NO | nextval('tbl_sales_comp_manufactured_manufactured_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| total_pads | integer | YES | — | — |
| occupied_pads | integer | YES | — | — |
| vacant_pads | integer | YES | — | — |
| occupancy_rate | numeric(5,2) | YES | — | — |
| park_owned_homes | integer | YES | — | — |
| resident_owned_homes | integer | YES | — | — |
| avg_pad_rent | numeric(10,2) | YES | — | — |
| total_pad_income | numeric(15,2) | YES | — | — |
| home_rental_income | numeric(15,2) | YES | — | — |
| utility_income | numeric(15,2) | YES | — | — |
| other_income | numeric(15,2) | YES | — | — |
| water_sewer_type | character varying(50) | YES | — | — |
| utilities_included | character varying(255) | YES | — | — |
| submetered | boolean | YES | — | — |
| clubhouse | boolean | YES | — | — |
| pool | boolean | YES | — | — |
| laundry_facility | boolean | YES | — | — |
| playground | boolean | YES | — | — |
| all_ages | boolean | YES | true | — |
| senior_community | boolean | YES | false | — |
| min_age | integer | YES | — | — |
| rv_spaces | integer | YES | — | — |
| rv_avg_rent | numeric(10,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_manufactured_comparable` — `CREATE INDEX idx_comp_manufactured_comparable ON landscape.tbl_sales_comp_manufactured USING btree (comparable_id)`
- `tbl_sales_comp_manufactured_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_manufactured_pkey ON landscape.tbl_sales_comp_manufactured USING btree (manufactured_id)`
- `uq_comp_manufactured` — `CREATE UNIQUE INDEX uq_comp_manufactured ON landscape.tbl_sales_comp_manufactured USING btree (comparable_id)`

## tbl_sales_comp_market_conditions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| market_id | bigint | NO | nextval('tbl_sales_comp_market_conditions_market_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| as_of_date | date | YES | — | — |
| submarket_vacancy_rate | numeric(5,2) | YES | — | — |
| submarket_asking_rent | numeric(10,2) | YES | — | — |
| submarket_effective_rent | numeric(10,2) | YES | — | — |
| submarket_absorption_sf | numeric(15,2) | YES | — | — |
| submarket_inventory_sf | numeric(15,2) | YES | — | — |
| metro_vacancy_rate | numeric(5,2) | YES | — | — |
| metro_asking_rent | numeric(10,2) | YES | — | — |
| metro_cap_rate_avg | numeric(6,4) | YES | — | — |
| yoy_rent_growth | numeric(6,2) | YES | — | — |
| yoy_vacancy_change | numeric(6,2) | YES | — | — |
| under_construction_sf | numeric(15,2) | YES | — | — |
| planned_sf | numeric(15,2) | YES | — | — |
| unemployment_rate | numeric(5,2) | YES | — | — |
| job_growth_pct | numeric(6,2) | YES | — | — |
| population_growth_pct | numeric(6,2) | YES | — | — |
| source | character varying(100) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_market_comparable` — `CREATE INDEX idx_comp_market_comparable ON landscape.tbl_sales_comp_market_conditions USING btree (comparable_id)`
- `tbl_sales_comp_market_conditions_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_market_conditions_pkey ON landscape.tbl_sales_comp_market_conditions USING btree (market_id)`
- `uq_comp_market_conditions` — `CREATE UNIQUE INDEX uq_comp_market_conditions ON landscape.tbl_sales_comp_market_conditions USING btree (comparable_id)`

## tbl_sales_comp_office
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| office_id | bigint | NO | nextval('tbl_sales_comp_office_office_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| rentable_sf | numeric(12,2) | YES | — | — |
| usable_sf | numeric(12,2) | YES | — | — |
| loss_factor | numeric(5,2) | YES | — | — |
| floor_plate_sf | numeric(10,2) | YES | — | — |
| avg_base_rent_psf | numeric(10,2) | YES | — | — |
| expense_stop | numeric(10,2) | YES | — | — |
| expense_structure | character varying(50) | YES | — | — |
| avg_ti_psf | numeric(10,2) | YES | — | — |
| avg_free_rent_months | numeric(4,1) | YES | — | — |
| direct_vacancy_pct | numeric(5,2) | YES | — | — |
| sublease_vacancy_pct | numeric(5,2) | YES | — | — |
| total_vacancy_pct | numeric(5,2) | YES | — | — |
| walt_years | numeric(5,2) | YES | — | — |
| hvac_type | character varying(100) | YES | — | — |
| life_safety_system | character varying(100) | YES | — | — |
| backup_power | boolean | YES | — | — |
| fiber_providers | character varying(255) | YES | — | — |
| parking_ratio_per_1000 | numeric(6,2) | YES | — | — |
| reserved_spaces | integer | YES | — | — |
| unreserved_spaces | integer | YES | — | — |
| monthly_parking_rate | numeric(10,2) | YES | — | — |
| leed_certified | boolean | YES | — | — |
| leed_level | character varying(50) | YES | — | — |
| energy_star_score | integer | YES | — | — |
| wired_score | character varying(50) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_office_comparable` — `CREATE INDEX idx_comp_office_comparable ON landscape.tbl_sales_comp_office USING btree (comparable_id)`
- `tbl_sales_comp_office_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_office_pkey ON landscape.tbl_sales_comp_office USING btree (office_id)`
- `uq_comp_office` — `CREATE UNIQUE INDEX uq_comp_office ON landscape.tbl_sales_comp_office USING btree (comparable_id)`

## tbl_sales_comp_retail
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| retail_id | bigint | NO | nextval('tbl_sales_comp_retail_retail_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| center_type | character varying(100) | YES | — | — |
| anchor_tenant | character varying(255) | YES | — | — |
| shadow_anchor | character varying(255) | YES | — | — |
| anchor_sf | numeric(12,2) | YES | — | — |
| junior_anchor_sf | numeric(12,2) | YES | — | — |
| inline_sf | numeric(12,2) | YES | — | — |
| outparcel_count | integer | YES | — | — |
| outparcel_sf | numeric(12,2) | YES | — | — |
| anchor_sales_psf | numeric(10,2) | YES | — | — |
| inline_sales_psf | numeric(10,2) | YES | — | — |
| total_sales_psf | numeric(10,2) | YES | — | — |
| avg_base_rent_psf | numeric(10,2) | YES | — | — |
| avg_cam_psf | numeric(10,2) | YES | — | — |
| avg_all_in_rent_psf | numeric(10,2) | YES | — | — |
| expense_structure | character varying(50) | YES | — | — |
| traffic_count | integer | YES | — | — |
| traffic_count_source | character varying(100) | YES | — | — |
| signage_type | character varying(100) | YES | — | — |
| pylon_sign | boolean | YES | — | — |
| monument_sign | boolean | YES | — | — |
| freeway_visible | boolean | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_retail_center_type` — `CREATE INDEX idx_comp_retail_center_type ON landscape.tbl_sales_comp_retail USING btree (center_type)`
- `idx_comp_retail_comparable` — `CREATE INDEX idx_comp_retail_comparable ON landscape.tbl_sales_comp_retail USING btree (comparable_id)`
- `tbl_sales_comp_retail_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_retail_pkey ON landscape.tbl_sales_comp_retail USING btree (retail_id)`
- `uq_comp_retail` — `CREATE UNIQUE INDEX uq_comp_retail ON landscape.tbl_sales_comp_retail USING btree (comparable_id)`

## tbl_sales_comp_self_storage
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| storage_id | bigint | NO | nextval('tbl_sales_comp_self_storage_storage_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| total_units | integer | YES | — | — |
| climate_controlled_units | integer | YES | — | — |
| non_climate_units | integer | YES | — | — |
| climate_controlled_pct | numeric(5,2) | YES | — | — |
| total_net_rentable_sf | numeric(12,2) | YES | — | — |
| climate_controlled_sf | numeric(12,2) | YES | — | — |
| avg_unit_size_sf | numeric(8,2) | YES | — | — |
| physical_occupancy | numeric(5,2) | YES | — | — |
| economic_occupancy | numeric(5,2) | YES | — | — |
| avg_rent_psf | numeric(8,2) | YES | — | — |
| gross_potential_rent | numeric(15,2) | YES | — | — |
| drive_up_access_pct | numeric(5,2) | YES | — | — |
| elevator_served_pct | numeric(5,2) | YES | — | — |
| rv_boat_parking_spaces | integer | YES | — | — |
| vehicle_storage_spaces | integer | YES | — | — |
| management_type | character varying(50) | YES | — | — |
| brand_flag | character varying(100) | YES | — | — |
| third_party_managed | boolean | YES | — | — |
| expansion_potential | boolean | YES | — | — |
| expansion_units | integer | YES | — | — |
| expansion_sf | numeric(12,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_self_storage_comparable` — `CREATE INDEX idx_comp_self_storage_comparable ON landscape.tbl_sales_comp_self_storage USING btree (comparable_id)`
- `tbl_sales_comp_self_storage_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_self_storage_pkey ON landscape.tbl_sales_comp_self_storage USING btree (storage_id)`
- `uq_comp_self_storage` — `CREATE UNIQUE INDEX uq_comp_self_storage ON landscape.tbl_sales_comp_self_storage USING btree (comparable_id)`

## tbl_sales_comp_specialty_housing
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| specialty_id | bigint | NO | nextval('tbl_sales_comp_specialty_housing_specialty_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| housing_type | character varying(50) | NO | — | — |
| total_beds | integer | YES | — | — |
| total_units | integer | YES | — | — |
| avg_beds_per_unit | numeric(4,2) | YES | — | — |
| independent_living_units | integer | YES | — | — |
| assisted_living_units | integer | YES | — | — |
| memory_care_units | integer | YES | — | — |
| skilled_nursing_beds | integer | YES | — | — |
| license_type | character varying(100) | YES | — | — |
| affiliated_university | character varying(255) | YES | — | — |
| distance_to_campus_miles | numeric(6,2) | YES | — | — |
| by_the_bed_leasing | boolean | YES | — | — |
| furnished | boolean | YES | — | — |
| occupancy_rate | numeric(5,2) | YES | — | — |
| avg_monthly_rent | numeric(10,2) | YES | — | — |
| avg_daily_rate | numeric(10,2) | YES | — | — |
| revenue_per_bed | numeric(10,2) | YES | — | — |
| operator_name | character varying(255) | YES | — | — |
| third_party_managed | boolean | YES | — | — |
| medicaid_certified | boolean | YES | — | — |
| medicare_certified | boolean | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_specialty_comparable` — `CREATE INDEX idx_comp_specialty_comparable ON landscape.tbl_sales_comp_specialty_housing USING btree (comparable_id)`
- `idx_comp_specialty_type` — `CREATE INDEX idx_comp_specialty_type ON landscape.tbl_sales_comp_specialty_housing USING btree (housing_type)`
- `tbl_sales_comp_specialty_housing_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_specialty_housing_pkey ON landscape.tbl_sales_comp_specialty_housing USING btree (specialty_id)`
- `uq_comp_specialty_housing` — `CREATE UNIQUE INDEX uq_comp_specialty_housing ON landscape.tbl_sales_comp_specialty_housing USING btree (comparable_id)`

## tbl_sales_comp_storage_unit_mix
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| unit_mix_id | bigint | NO | nextval('tbl_sales_comp_storage_unit_mix_unit_mix_id_seq'::regclass) | — |
| storage_comp_id | bigint | NO | — | tbl_sales_comp_self_storage.storage_id |
| unit_size_category | character varying(50) | YES | — | — |
| unit_width_ft | numeric(6,2) | YES | — | — |
| unit_depth_ft | numeric(6,2) | YES | — | — |
| unit_sf | numeric(8,2) | YES | — | — |
| unit_count | integer | YES | — | — |
| climate_controlled | boolean | YES | false | — |
| drive_up_access | boolean | YES | false | — |
| asking_rent | numeric(10,2) | YES | — | — |
| effective_rent | numeric(10,2) | YES | — | — |
| occupancy_pct | numeric(5,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_storage_unit_mix_parent` — `CREATE INDEX idx_storage_unit_mix_parent ON landscape.tbl_sales_comp_storage_unit_mix USING btree (storage_comp_id)`
- `tbl_sales_comp_storage_unit_mix_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_storage_unit_mix_pkey ON landscape.tbl_sales_comp_storage_unit_mix USING btree (unit_mix_id)`

## tbl_sales_comp_tenants
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tenant_id | bigint | NO | nextval('tbl_sales_comp_tenants_tenant_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| tenant_name | character varying(255) | NO | — | — |
| tenant_type | character varying(50) | YES | — | — |
| is_anchor | boolean | YES | false | — |
| credit_rating | character varying(20) | YES | — | — |
| leased_sf | numeric(12,2) | YES | — | — |
| floor_number | character varying(50) | YES | — | — |
| suite_number | character varying(50) | YES | — | — |
| pct_of_building | numeric(5,2) | YES | — | — |
| lease_start_date | date | YES | — | — |
| lease_expiration_date | date | YES | — | — |
| lease_term_months | integer | YES | — | — |
| lease_type | character varying(50) | YES | — | — |
| base_rent_psf | numeric(10,2) | YES | — | — |
| base_rent_annual | numeric(15,2) | YES | — | — |
| expense_stop | numeric(10,2) | YES | — | — |
| ti_allowance_psf | numeric(10,2) | YES | — | — |
| free_rent_months | integer | YES | — | — |
| renewal_options | text | YES | — | — |
| expansion_options | text | YES | — | — |
| termination_options | text | YES | — | — |
| sales_psf | numeric(10,2) | YES | — | — |
| pct_rent_breakpoint | numeric(15,2) | YES | — | — |
| pct_rent_rate | numeric(5,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_tenants_anchor` — `CREATE INDEX idx_comp_tenants_anchor ON landscape.tbl_sales_comp_tenants USING btree (is_anchor) WHERE (is_anchor = true)`
- `idx_comp_tenants_comparable` — `CREATE INDEX idx_comp_tenants_comparable ON landscape.tbl_sales_comp_tenants USING btree (comparable_id)`
- `idx_comp_tenants_expiration` — `CREATE INDEX idx_comp_tenants_expiration ON landscape.tbl_sales_comp_tenants USING btree (lease_expiration_date)`
- `tbl_sales_comp_tenants_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_tenants_pkey ON landscape.tbl_sales_comp_tenants USING btree (tenant_id)`

## tbl_sales_comp_unit_mix
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| unit_mix_id | bigint | NO | nextval('tbl_sales_comp_unit_mix_unit_mix_id_seq'::regclass) | — |
| comparable_id | integer | NO | — | tbl_sales_comparables.comparable_id |
| bed_count | integer | YES | — | — |
| bath_count | numeric(3,1) | YES | — | — |
| unit_type | character varying(50) | YES | — | — |
| unit_count | integer | NO | — | — |
| unit_pct | numeric(5,2) | YES | — | — |
| avg_unit_sf | numeric(8,2) | YES | — | — |
| total_sf | numeric(12,2) | YES | — | — |
| asking_rent_min | numeric(10,2) | YES | — | — |
| asking_rent_max | numeric(10,2) | YES | — | — |
| asking_rent_per_sf_min | numeric(8,2) | YES | — | — |
| asking_rent_per_sf_max | numeric(8,2) | YES | — | — |
| effective_rent_min | numeric(10,2) | YES | — | — |
| effective_rent_max | numeric(10,2) | YES | — | — |
| effective_rent_per_sf_min | numeric(8,2) | YES | — | — |
| effective_rent_per_sf_max | numeric(8,2) | YES | — | — |
| vacant_units | integer | YES | 0 | — |
| concession_pct | numeric(5,2) | YES | — | — |
| monthly_discount | numeric(10,2) | YES | — | — |
| one_time_concession | numeric(10,2) | YES | — | — |
| is_rent_regulated | boolean | YES | false | — |
| rent_type | character varying(50) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_comp_unit_mix_beds` — `CREATE INDEX idx_comp_unit_mix_beds ON landscape.tbl_sales_comp_unit_mix USING btree (bed_count)`
- `idx_comp_unit_mix_comparable` — `CREATE INDEX idx_comp_unit_mix_comparable ON landscape.tbl_sales_comp_unit_mix USING btree (comparable_id)`
- `tbl_sales_comp_unit_mix_pkey` — `CREATE UNIQUE INDEX tbl_sales_comp_unit_mix_pkey ON landscape.tbl_sales_comp_unit_mix USING btree (unit_mix_id)`

## tbl_sales_comparables
**Row Count (estimated):** 12
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| comparable_id | integer | NO | nextval('tbl_sales_comparables_comparable_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| comp_number | integer | YES | — | — |
| property_name | character varying(255) | YES | — | — |
| address | character varying(255) | YES | — | — |
| city | character varying(100) | YES | — | — |
| state | character varying(2) | YES | — | — |
| zip | character varying(10) | YES | — | — |
| sale_date | date | YES | — | — |
| sale_price | numeric(15,2) | YES | — | — |
| price_per_unit | numeric(10,2) | YES | — | — |
| price_per_sf | numeric(10,2) | YES | — | — |
| year_built | integer | YES | — | — |
| units | numeric(10,2) | YES | — | — |
| building_sf | character varying(255) | YES | — | — |
| cap_rate | character varying(255) | YES | — | — |
| grm | numeric(6,2) | YES | — | — |
| distance_from_subject | character varying(50) | YES | — | — |
| unit_mix | jsonb | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| latitude | numeric(10,7) | YES | — | — |
| longitude | numeric(10,7) | YES | — | — |
| unit_count | integer | YES | — | — |
| costar_comp_id | character varying(50) | YES | — | — |
| price_status | character varying(50) | YES | — | — |
| comp_status | character varying(50) | YES | — | — |
| sale_type | character varying(50) | YES | — | — |
| sale_conditions | character varying(100) | YES | — | — |
| hold_period_months | integer | YES | — | — |
| days_on_market | integer | YES | — | — |
| asking_price | numeric(15,2) | YES | — | — |
| transfer_tax | numeric(12,2) | YES | — | — |
| document_number | character varying(50) | YES | — | — |
| escrow_length_days | integer | YES | — | — |
| percent_leased_at_sale | numeric(5,2) | YES | — | — |
| actual_cap_rate | numeric(6,4) | YES | — | — |
| pro_forma_cap_rate | numeric(6,4) | YES | — | — |
| gim | numeric(8,2) | YES | — | — |
| noi_at_sale | numeric(15,2) | YES | — | — |
| gross_income_at_sale | numeric(15,2) | YES | — | — |
| financing_type | character varying(50) | YES | — | — |
| financing_lender | character varying(255) | YES | — | — |
| financing_amount | numeric(15,2) | YES | — | — |
| financing_rate | numeric(6,4) | YES | — | — |
| financing_term_months | integer | YES | — | — |
| loan_to_value | numeric(5,2) | YES | — | — |
| assumed_financing | boolean | YES | false | — |
| recorded_buyer | character varying(255) | YES | — | — |
| true_buyer | character varying(255) | YES | — | — |
| buyer_contact | character varying(500) | YES | — | — |
| buyer_type | character varying(50) | YES | — | — |
| recorded_seller | character varying(255) | YES | — | — |
| true_seller | character varying(255) | YES | — | — |
| seller_contact | character varying(500) | YES | — | — |
| seller_type | character varying(50) | YES | — | — |
| buyer_broker_company | character varying(255) | YES | — | — |
| buyer_broker_name | character varying(255) | YES | — | — |
| buyer_broker_phone | character varying(50) | YES | — | — |
| listing_broker_company | character varying(255) | YES | — | — |
| listing_broker_name | character varying(255) | YES | — | — |
| listing_broker_phone | character varying(50) | YES | — | — |
| no_broker_deal | boolean | YES | false | — |
| property_type | character varying(50) | YES | — | — |
| property_subtype | character varying(100) | YES | — | — |
| building_class | character varying(10) | YES | — | — |
| costar_star_rating | numeric(2,1) | YES | — | — |
| location_type | character varying(50) | YES | — | — |
| num_buildings | integer | YES | — | — |
| num_floors | integer | YES | — | — |
| typical_floor_sf | numeric(12,2) | YES | — | — |
| tenancy_type | character varying(50) | YES | — | — |
| owner_occupied | boolean | YES | — | — |
| avg_unit_size_sf | numeric(10,2) | YES | — | — |
| units_per_acre | numeric(8,2) | YES | — | — |
| parking_spaces | integer | YES | — | — |
| parking_ratio | numeric(6,2) | YES | — | — |
| parking_type | character varying(100) | YES | — | — |
| elevators | integer | YES | — | — |
| zoning | character varying(100) | YES | — | — |
| construction_type | character varying(100) | YES | — | — |
| roof_type | character varying(100) | YES | — | — |
| hvac_type | character varying(100) | YES | — | — |
| sprinklered | boolean | YES | — | — |
| land_area_sf | numeric(15,2) | YES | — | — |
| land_area_acres | numeric(12,4) | YES | — | — |
| far_allowed | numeric(6,2) | YES | — | — |
| far_actual | numeric(6,2) | YES | — | — |
| num_parcels | integer | YES | — | — |
| topography | character varying(100) | YES | — | — |
| utilities_available | character varying(255) | YES | — | — |
| entitlements | character varying(500) | YES | — | — |
| environmental_issues | text | YES | — | — |
| total_assessed_value | numeric(15,2) | YES | — | — |
| land_assessed_value | numeric(15,2) | YES | — | — |
| improved_assessed_value | numeric(15,2) | YES | — | — |
| assessment_year | integer | YES | — | — |
| tax_amount | numeric(12,2) | YES | — | — |
| tax_per_unit | numeric(10,2) | YES | — | — |
| percent_improved | numeric(5,2) | YES | — | — |
| metro_market | character varying(100) | YES | — | — |
| submarket | character varying(100) | YES | — | — |
| county | character varying(100) | YES | — | — |
| cbsa | character varying(150) | YES | — | — |
| csa | character varying(150) | YES | — | — |
| dma | character varying(150) | YES | — | — |
| walk_score | integer | YES | — | — |
| transit_score | integer | YES | — | — |
| bike_score | integer | YES | — | — |
| data_source | character varying(50) | YES | — | — |
| verification_status | character varying(50) | YES | — | — |
| verification_source | character varying(255) | YES | — | — |
| verification_date | date | YES | — | — |
| transaction_notes | text | YES | — | — |
| internal_notes | text | YES | — | — |
| is_portfolio_sale | boolean | YES | false | — |
| portfolio_name | character varying(255) | YES | — | — |
| portfolio_property_count | integer | YES | — | — |
| price_allocation_method | character varying(50) | YES | — | — |
| allocated_price | numeric(15,2) | YES | — | — |
| site_amenities | jsonb | YES | — | — |
| extra_data | jsonb | YES | — | — |
| raw_import_data | jsonb | YES | — | — |
| property_rights | character varying(50) | YES | — | — |

**Indexes:**
- `idx_sales_comp_building_class` — `CREATE INDEX idx_sales_comp_building_class ON landscape.tbl_sales_comparables USING btree (building_class)`
- `idx_sales_comp_costar_id` — `CREATE INDEX idx_sales_comp_costar_id ON landscape.tbl_sales_comparables USING btree (costar_comp_id)`
- `idx_sales_comp_location` — `CREATE INDEX idx_sales_comp_location ON landscape.tbl_sales_comparables USING btree (latitude, longitude)`
- `idx_sales_comp_property_type` — `CREATE INDEX idx_sales_comp_property_type ON landscape.tbl_sales_comparables USING btree (property_type)`
- `idx_sales_comp_sale_date` — `CREATE INDEX idx_sales_comp_sale_date ON landscape.tbl_sales_comparables USING btree (sale_date)`
- `idx_sales_comp_submarket` — `CREATE INDEX idx_sales_comp_submarket ON landscape.tbl_sales_comparables USING btree (submarket)`
- `idx_sales_comparables_project` — `CREATE INDEX idx_sales_comparables_project ON landscape.tbl_sales_comparables USING btree (project_id)`
- `idx_sales_comparables_sale_date` — `CREATE INDEX idx_sales_comparables_sale_date ON landscape.tbl_sales_comparables USING btree (sale_date DESC)`
- `tbl_sales_comparables_pkey` — `CREATE UNIQUE INDEX tbl_sales_comparables_pkey ON landscape.tbl_sales_comparables USING btree (comparable_id)`

## tbl_scenario
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| scenario_id | integer | NO | nextval('tbl_scenario_scenario_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| scenario_name | character varying(100) | NO | — | — |
| scenario_type | character varying(20) | NO | 'custom'::character varying | — |
| scenario_code | character varying(50) | YES | — | — |
| is_active | boolean | YES | false | — |
| is_locked | boolean | YES | false | — |
| display_order | integer | YES | 0 | — |
| description | text | YES | — | — |
| color_hex | character varying(7) | YES | '#6B7280'::character varying | — |
| variance_method | character varying(20) | YES | — | — |
| revenue_variance_pct | numeric(5,2) | YES | — | — |
| cost_variance_pct | numeric(5,2) | YES | — | — |
| absorption_variance_pct | numeric(5,2) | YES | — | — |
| start_date_offset_months | integer | YES | 0 | — |
| created_by | integer | YES | — | auth_user.id |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| cloned_from_scenario_id | integer | YES | — | tbl_scenario.scenario_id |

**Indexes:**
- `idx_scenario_active` — `CREATE INDEX idx_scenario_active ON landscape.tbl_scenario USING btree (project_id, is_active) WHERE (is_active = true)`
- `idx_scenario_display_order` — `CREATE INDEX idx_scenario_display_order ON landscape.tbl_scenario USING btree (project_id, display_order)`
- `idx_scenario_project` — `CREATE INDEX idx_scenario_project ON landscape.tbl_scenario USING btree (project_id)`
- `tbl_scenario_pkey` — `CREATE UNIQUE INDEX tbl_scenario_pkey ON landscape.tbl_scenario USING btree (scenario_id)`
- `tbl_scenario_scenario_code_key` — `CREATE UNIQUE INDEX tbl_scenario_scenario_code_key ON landscape.tbl_scenario USING btree (scenario_code)`

**Check Constraints:**
- `CHECK (((scenario_type)::text = ANY ((ARRAY['base'::character varying, 'optimistic'::character varying, 'conservative'::character varying, 'stress'::character varying, 'custom'::character varying])::text[])))`

## tbl_scenario_comparison
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| comparison_id | integer | NO | nextval('tbl_scenario_comparison_comparison_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| comparison_name | character varying(100) | NO | — | — |
| scenario_ids | ARRAY | NO | — | — |
| comparison_type | character varying(20) | YES | 'side_by_side'::character varying | — |
| scenario_probabilities | ARRAY | YES | — | — |
| comparison_results | jsonb | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_scenario_comparison_project` — `CREATE INDEX idx_scenario_comparison_project ON landscape.tbl_scenario_comparison USING btree (project_id)`
- `tbl_scenario_comparison_pkey` — `CREATE UNIQUE INDEX tbl_scenario_comparison_pkey ON landscape.tbl_scenario_comparison USING btree (comparison_id)`

**Check Constraints:**
- `CHECK (((comparison_type)::text = ANY ((ARRAY['side_by_side'::character varying, 'variance_from_base'::character varying, 'probability_weighted'::character varying])::text[])))`

## tbl_scenario_log
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| scenario_log_id | bigint | NO | nextval('tbl_scenario_log_scenario_log_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| thread_id | uuid | YES | — | landscaper_chat_thread.id |
| user_id | integer | YES | — | — |
| scenario_name | character varying(200) | YES | — | — |
| description | text | YES | — | — |
| status | character varying(30) | NO | 'active_shadow'::character varying | — |
| scenario_data | jsonb | NO | '{}'::jsonb | — |
| parent_scenario_id | bigint | YES | — | tbl_scenario_log.scenario_log_id |
| source | character varying(30) | YES | 'landscaper_chat'::character varying | — |
| tags | ARRAY | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |
| updated_at | timestamp with time zone | NO | now() | — |
| committed_at | timestamp with time zone | YES | — | — |
| committed_by | integer | YES | — | — |

**Indexes:**
- `idx_scenario_log_created` — `CREATE INDEX idx_scenario_log_created ON landscape.tbl_scenario_log USING btree (project_id, created_at DESC)`
- `idx_scenario_log_data` — `CREATE INDEX idx_scenario_log_data ON landscape.tbl_scenario_log USING gin (scenario_data)`
- `idx_scenario_log_project` — `CREATE INDEX idx_scenario_log_project ON landscape.tbl_scenario_log USING btree (project_id)`
- `idx_scenario_log_status` — `CREATE INDEX idx_scenario_log_status ON landscape.tbl_scenario_log USING btree (project_id, status)`
- `idx_scenario_log_thread` — `CREATE INDEX idx_scenario_log_thread ON landscape.tbl_scenario_log USING btree (thread_id)`
- `tbl_scenario_log_pkey` — `CREATE UNIQUE INDEX tbl_scenario_log_pkey ON landscape.tbl_scenario_log USING btree (scenario_log_id)`

**Check Constraints:**
- `CHECK (((source)::text = ANY ((ARRAY['landscaper_chat'::character varying, 'user_manual'::character varying, 'auto_commit'::character varying, 'ic_session'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['active_shadow'::character varying, 'explored'::character varying, 'saved'::character varying, 'committed'::character varying, 'undone'::character varying, 'archived'::character varying])::text[])))`

## tbl_security_deposit
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| deposit_id | integer | NO | nextval('tbl_security_deposit_deposit_id_seq'::regclass) | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| deposit_type | character varying(50) | YES | — | — |
| deposit_amount | numeric(12,2) | YES | — | — |
| deposit_months | numeric(4,1) | YES | — | — |
| loc_issuing_bank | character varying(255) | YES | — | — |
| loc_expiration_date | date | YES | — | — |
| loc_auto_renew | boolean | YES | false | — |
| loc_renewal_notice_days | integer | YES | — | — |
| loc_beneficiary | character varying(255) | YES | — | — |
| guarantor_name | character varying(255) | YES | — | — |
| guarantor_relationship | character varying(100) | YES | — | — |
| guarantee_type | character varying(50) | YES | — | — |
| guarantee_cap | numeric(12,2) | YES | — | — |
| guarantee_burn_down | boolean | YES | false | — |
| burn_down_schedule | text | YES | — | — |
| deposit_reduction_allowed | boolean | YES | false | — |
| reduction_trigger | character varying(100) | YES | — | — |
| reduction_schedule | text | YES | — | — |
| interest_bearing | boolean | YES | false | — |
| interest_rate_pct | numeric(5,3) | YES | — | — |
| interest_payment_frequency | character varying(20) | YES | — | — |
| deposit_received | boolean | YES | false | — |
| deposit_received_date | date | YES | — | — |
| deposit_account_number | character varying(100) | YES | — | — |
| current_deposit_balance | numeric(12,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_deposit_lease` — `CREATE INDEX idx_deposit_lease ON landscape.tbl_security_deposit USING btree (lease_id)`
- `idx_deposit_loc_expiry` — `CREATE INDEX idx_deposit_loc_expiry ON landscape.tbl_security_deposit USING btree (loc_expiration_date) WHERE ((deposit_type)::text = 'letter-of-credit'::text)`
- `tbl_security_deposit_pkey` — `CREATE UNIQUE INDEX tbl_security_deposit_pkey ON landscape.tbl_security_deposit USING btree (deposit_id)`

## tbl_space
**Row Count (estimated):** 41
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| space_id | integer | NO | nextval('tbl_space_space_id_seq'::regclass) | — |
| income_property_id | integer | YES | — | tbl_income_property.income_property_id |
| space_number | character varying(50) | YES | — | — |
| floor_number | integer | YES | — | — |
| usable_sf | numeric(10,2) | YES | — | — |
| rentable_sf | numeric(10,2) | YES | — | — |
| space_type | character varying(50) | YES | — | — |
| frontage_ft | numeric(8,2) | YES | — | — |
| ceiling_height_ft | numeric(6,2) | YES | — | — |
| number_of_offices | integer | YES | — | — |
| number_of_conference_rooms | integer | YES | — | — |
| has_kitchenette | boolean | YES | false | — |
| has_private_restroom | boolean | YES | false | — |
| space_status | character varying(50) | YES | — | — |
| available_date | date | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| space_type_code | character varying(10) | YES | 'CRE'::character varying | — |

**Indexes:**
- `idx_cre_space_property_id` — `CREATE INDEX idx_cre_space_property_id ON landscape.tbl_space USING btree (income_property_id)`
- `idx_cre_space_status` — `CREATE INDEX idx_cre_space_status ON landscape.tbl_space USING btree (space_status)`
- `idx_space_income_property` — `CREATE INDEX idx_space_income_property ON landscape.tbl_space USING btree (income_property_id)`
- `tbl_cre_space_pkey` — `CREATE UNIQUE INDEX tbl_cre_space_pkey ON landscape.tbl_space USING btree (space_id)`

## tbl_space_ind_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| space_id | integer | NO | — | tbl_space.space_id |
| warehouse_sf | numeric(12,2) | YES | — | — |
| office_sf | numeric(10,2) | YES | — | — |
| mezzanine_sf | numeric(10,2) | YES | — | — |
| outdoor_storage_sf | numeric(10,2) | YES | — | — |
| office_finish_level | character varying(50) | YES | — | — |
| office_ratio_pct | numeric(5,2) | YES | — | — |
| dedicated_docks | integer | YES | 0 | — |
| shared_dock_access | boolean | YES | false | — |
| dedicated_electrical | boolean | YES | false | — |
| electrical_amps | integer | YES | — | — |
| rack_system | boolean | YES | false | — |
| rack_value | numeric(12,2) | YES | — | — |
| crane_system | boolean | YES | false | — |
| crane_capacity_tons | numeric(8,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_space_ind_warehouse_sf` — `CREATE INDEX idx_space_ind_warehouse_sf ON landscape.tbl_space_ind_ext USING btree (warehouse_sf)`
- `tbl_space_ind_ext_pkey` — `CREATE UNIQUE INDEX tbl_space_ind_ext_pkey ON landscape.tbl_space_ind_ext USING btree (space_id)`

## tbl_space_mf_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| space_id | integer | NO | — | tbl_space.space_id |
| unit_type | character varying(50) | YES | — | — |
| bedrooms | integer | YES | — | — |
| bathrooms | numeric(3,1) | YES | — | — |
| half_baths | integer | YES | 0 | — |
| has_washer_dryer | boolean | YES | false | — |
| washer_dryer_type | character varying(20) | YES | — | — |
| has_dishwasher | boolean | YES | false | — |
| has_fireplace | boolean | YES | false | — |
| has_balcony | boolean | YES | false | — |
| has_patio | boolean | YES | false | — |
| balcony_sf | numeric(8,2) | YES | — | — |
| floor_type | character varying(50) | YES | — | — |
| countertop_type | character varying(50) | YES | — | — |
| cabinet_type | character varying(50) | YES | — | — |
| appliance_package | character varying(50) | YES | — | — |
| view_type | character varying(50) | YES | — | — |
| floor_premium_pct | numeric(5,2) | YES | — | — |
| corner_unit | boolean | YES | false | — |
| market_rent | numeric(10,2) | YES | — | — |
| effective_rent | numeric(10,2) | YES | — | — |
| loss_to_lease | numeric(10,2) | YES | — | — |
| concession_value | numeric(10,2) | YES | — | — |
| renovation_status | character varying(50) | YES | — | — |
| last_renovation_date | date | YES | — | — |
| renovation_cost | numeric(12,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_space_mf_market_rent` — `CREATE INDEX idx_space_mf_market_rent ON landscape.tbl_space_mf_ext USING btree (market_rent)`
- `idx_space_mf_unit_type` — `CREATE INDEX idx_space_mf_unit_type ON landscape.tbl_space_mf_ext USING btree (unit_type)`
- `tbl_space_mf_ext_pkey` — `CREATE UNIQUE INDEX tbl_space_mf_ext_pkey ON landscape.tbl_space_mf_ext USING btree (space_id)`

## tbl_space_ret_ext
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| space_id | integer | NO | — | tbl_space.space_id |
| retail_space_type | character varying(50) | YES | — | — |
| tenant_category | character varying(50) | YES | — | — |
| frontage_ft | numeric(8,2) | YES | — | — |
| depth_ft | numeric(8,2) | YES | — | — |
| storefront_ft | numeric(8,2) | YES | — | — |
| corner_location | boolean | YES | false | — |
| end_cap | boolean | YES | false | — |
| grease_trap | boolean | YES | false | — |
| hood_system | boolean | YES | false | — |
| walk_in_cooler | boolean | YES | false | — |
| drive_thru | boolean | YES | false | — |
| patio_sf | numeric(8,2) | YES | — | — |
| visibility_score | integer | YES | — | — |
| highway_frontage | boolean | YES | false | — |
| main_entrance_proximity | boolean | YES | false | — |
| reported_sales | numeric(14,2) | YES | — | — |
| sales_reporting_date | date | YES | — | — |
| sales_psf | numeric(10,2) | YES | — | — |
| breakpoint_achieved | boolean | YES | false | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_space_ret_type` — `CREATE INDEX idx_space_ret_type ON landscape.tbl_space_ret_ext USING btree (retail_space_type)`
- `tbl_space_ret_ext_pkey` — `CREATE UNIQUE INDEX tbl_space_ret_ext_pkey ON landscape.tbl_space_ret_ext USING btree (space_id)`

## tbl_system_picklist
**Row Count (estimated):** 64
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| picklist_id | bigint | NO | nextval('tbl_system_picklist_picklist_id_seq'::regclass) | — |
| picklist_type | character varying(50) | NO | — | — |
| code | character varying(50) | NO | — | — |
| name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| parent_id | bigint | YES | — | tbl_system_picklist.picklist_id |
| sort_order | integer | YES | 0 | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_picklist_active` — `CREATE INDEX idx_picklist_active ON landscape.tbl_system_picklist USING btree (is_active)`
- `idx_picklist_parent` — `CREATE INDEX idx_picklist_parent ON landscape.tbl_system_picklist USING btree (parent_id)`
- `idx_picklist_type` — `CREATE INDEX idx_picklist_type ON landscape.tbl_system_picklist USING btree (picklist_type)`
- `tbl_system_picklist_picklist_type_code_key` — `CREATE UNIQUE INDEX tbl_system_picklist_picklist_type_code_key ON landscape.tbl_system_picklist USING btree (picklist_type, code)`
- `tbl_system_picklist_pkey` — `CREATE UNIQUE INDEX tbl_system_picklist_pkey ON landscape.tbl_system_picklist USING btree (picklist_id)`

## tbl_template_column_config
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| template_column_id | bigint | NO | nextval('tbl_template_column_config_template_column_id_seq'::regclass) | — |
| template_id | bigint | NO | — | tbl_property_use_template.template_id |
| column_name | character varying(100) | NO | — | — |
| column_label | character varying(100) | NO | — | — |
| column_type | character varying(20) | NO | — | — |
| data_type | character varying(50) | YES | — | — |
| container_level | integer | YES | — | — |
| display_order | integer | NO | 0 | — |
| is_required | boolean | YES | false | — |
| data_source_table | character varying(100) | YES | — | — |
| data_source_value_col | character varying(50) | YES | — | — |
| data_source_label_col | character varying(50) | YES | — | — |
| parent_column_name | character varying(50) | YES | — | — |
| junction_table | character varying(100) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_template_column_template` — `CREATE INDEX idx_template_column_template ON landscape.tbl_template_column_config USING btree (template_id, display_order)`
- `tbl_template_column_config_pkey` — `CREATE UNIQUE INDEX tbl_template_column_config_pkey ON landscape.tbl_template_column_config USING btree (template_column_id)`

**Check Constraints:**
- `CHECK (((column_type)::text = ANY ((ARRAY['hierarchy'::character varying, 'data'::character varying])::text[])))`

## tbl_tenant
**Row Count (estimated):** 39
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tenant_id | integer | NO | nextval('tbl_tenant_tenant_id_seq'::regclass) | — |
| tenant_name | character varying(200) | NO | — | — |
| tenant_legal_name | character varying(200) | YES | — | — |
| dba_name | character varying(200) | YES | — | — |
| industry | character varying(100) | YES | — | — |
| naics_code | character varying(10) | YES | — | — |
| business_type | character varying(50) | YES | — | — |
| credit_rating | character varying(20) | YES | — | — |
| creditworthiness | character varying(50) | YES | — | — |
| dun_bradstreet_number | character varying(20) | YES | — | — |
| annual_revenue | numeric(15,2) | YES | — | — |
| years_in_business | integer | YES | — | — |
| contact_name | character varying(100) | YES | — | — |
| contact_title | character varying(100) | YES | — | — |
| email | character varying(100) | YES | — | — |
| phone | character varying(20) | YES | — | — |
| guarantor_name | character varying(200) | YES | — | — |
| guarantor_type | character varying(50) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_cre_tenant_credit` — `CREATE INDEX idx_cre_tenant_credit ON landscape.tbl_tenant USING btree (creditworthiness)`
- `idx_cre_tenant_name` — `CREATE INDEX idx_cre_tenant_name ON landscape.tbl_tenant USING btree (tenant_name)`
- `tbl_cre_tenant_pkey` — `CREATE UNIQUE INDEX tbl_cre_tenant_pkey ON landscape.tbl_tenant USING btree (tenant_id)`

## tbl_tenant_improvement
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tenant_improvement_id | integer | NO | — | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| allowance_psf | numeric(10,2) | YES | — | — |
| allowance_total | numeric(15,2) | YES | — | — |
| actual_cost | numeric(15,2) | YES | — | — |
| landlord_contribution | numeric(15,2) | YES | — | — |
| reimbursement_structure | character varying(50) | YES | 'Upfront'::character varying | — |
| amortization_months | integer | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_ti_lease` — `CREATE INDEX idx_ti_lease ON landscape.tbl_tenant_improvement USING btree (lease_id)`
- `tbl_tenant_improvement_pkey` — `CREATE UNIQUE INDEX tbl_tenant_improvement_pkey ON landscape.tbl_tenant_improvement USING btree (tenant_improvement_id)`
- `uq_ti_lease` — `CREATE UNIQUE INDEX uq_ti_lease ON landscape.tbl_tenant_improvement USING btree (lease_id)`

## tbl_termination_option
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| termination_option_id | integer | NO | nextval('tbl_termination_option_termination_option_id_seq'::regclass) | — |
| lease_id | integer | NO | — | tbl_lease.lease_id |
| termination_type | character varying(50) | YES | — | — |
| earliest_termination_date | date | YES | — | — |
| termination_window_start | date | YES | — | — |
| termination_window_end | date | YES | — | — |
| notice_period_months | integer | YES | — | — |
| notice_deadline | date | YES | — | — |
| termination_fee_type | character varying(50) | YES | — | — |
| termination_fee_flat | numeric(12,2) | YES | — | — |
| termination_fee_months_rent | integer | YES | — | — |
| unamortized_ti_included | boolean | YES | false | — |
| unamortized_lc_included | boolean | YES | false | — |
| termination_fee_formula | text | YES | — | — |
| estimated_termination_fee | numeric(12,2) | YES | — | — |
| termination_conditions | text | YES | — | — |
| financial_covenant_trigger | boolean | YES | false | — |
| sales_threshold_trigger | numeric(14,2) | YES | — | — |
| termination_exercised | boolean | YES | false | — |
| termination_notice_date | date | YES | — | — |
| actual_termination_date | date | YES | — | — |
| termination_fee_paid | numeric(12,2) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_termination_deadline` — `CREATE INDEX idx_termination_deadline ON landscape.tbl_termination_option USING btree (notice_deadline)`
- `idx_termination_lease` — `CREATE INDEX idx_termination_lease ON landscape.tbl_termination_option USING btree (lease_id)`
- `tbl_termination_option_pkey` — `CREATE UNIQUE INDEX tbl_termination_option_pkey ON landscape.tbl_termination_option USING btree (termination_option_id)`

## tbl_uom_calculation_formulas
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| formula_id | integer | NO | nextval('tbl_uom_calculation_formulas_formula_id_seq'::regclass) | — |
| uom_code | character varying(10) | NO | — | — |
| formula_name | character varying(50) | NO | — | — |
| formula_expression | text | NO | — | — |
| required_fields | ARRAY | NO | — | — |
| description | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_uom_formulas_code` — `CREATE INDEX idx_uom_formulas_code ON landscape.tbl_uom_calculation_formulas USING btree (uom_code)`
- `tbl_uom_calculation_formulas_pkey` — `CREATE UNIQUE INDEX tbl_uom_calculation_formulas_pkey ON landscape.tbl_uom_calculation_formulas USING btree (formula_id)`
- `tbl_uom_calculation_formulas_uom_code_key` — `CREATE UNIQUE INDEX tbl_uom_calculation_formulas_uom_code_key ON landscape.tbl_uom_calculation_formulas USING btree (uom_code)`

## tbl_user_landscaper_profile
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| profile_id | integer | NO | — | — |
| survey_completed_at | timestamp with time zone | YES | — | — |
| role_primary | character varying(50) | YES | — | — |
| role_property_type | character varying(50) | YES | — | — |
| ai_proficiency | character varying(50) | YES | — | — |
| communication_tone | character varying(50) | YES | — | — |
| primary_tool | character varying(50) | YES | — | — |
| markets_text | text | YES | — | — |
| compiled_instructions | text | YES | — | — |
| onboarding_chat_history | jsonb | NO | — | — |
| interaction_insights | jsonb | NO | — | — |
| document_insights | jsonb | NO | — | — |
| tos_accepted_at | timestamp with time zone | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| user_id | bigint | NO | — | auth_user.id |

**Indexes:**
- `tbl_user_landscaper_profile_pkey` — `CREATE UNIQUE INDEX tbl_user_landscaper_profile_pkey ON landscape.tbl_user_landscaper_profile USING btree (profile_id)`
- `tbl_user_landscaper_profile_user_id_key` — `CREATE UNIQUE INDEX tbl_user_landscaper_profile_user_id_key ON landscape.tbl_user_landscaper_profile USING btree (user_id)`

## tbl_user_preference
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| preference_key | character varying(255) | NO | — | — |
| preference_value | jsonb | NO | — | — |
| scope_type | character varying(50) | NO | — | — |
| scope_id | integer | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| last_accessed_at | timestamp with time zone | NO | — | — |
| user_id | bigint | NO | — | auth_user.id |

**Indexes:**
- `tbl_user_pr_prefere_c180c6_idx` — `CREATE INDEX tbl_user_pr_prefere_c180c6_idx ON landscape.tbl_user_preference USING btree (preference_key)`
- `tbl_user_pr_updated_4533b0_idx` — `CREATE INDEX tbl_user_pr_updated_4533b0_idx ON landscape.tbl_user_preference USING btree (updated_at DESC)`
- `tbl_user_pr_user_id_c4e8f5_idx` — `CREATE INDEX tbl_user_pr_user_id_c4e8f5_idx ON landscape.tbl_user_preference USING btree (user_id, scope_type, scope_id)`
- `tbl_user_preference_pkey` — `CREATE UNIQUE INDEX tbl_user_preference_pkey ON landscape.tbl_user_preference USING btree (id)`
- `tbl_user_preference_preference_key_328aa664` — `CREATE INDEX tbl_user_preference_preference_key_328aa664 ON landscape.tbl_user_preference USING btree (preference_key)`
- `tbl_user_preference_preference_key_328aa664_like` — `CREATE INDEX tbl_user_preference_preference_key_328aa664_like ON landscape.tbl_user_preference USING btree (preference_key varchar_pattern_ops)`
- `tbl_user_preference_scope_id_f3ff4922` — `CREATE INDEX tbl_user_preference_scope_id_f3ff4922 ON landscape.tbl_user_preference USING btree (scope_id)`
- `tbl_user_preference_scope_type_8cde7862` — `CREATE INDEX tbl_user_preference_scope_type_8cde7862 ON landscape.tbl_user_preference USING btree (scope_type)`
- `tbl_user_preference_scope_type_8cde7862_like` — `CREATE INDEX tbl_user_preference_scope_type_8cde7862_like ON landscape.tbl_user_preference USING btree (scope_type varchar_pattern_ops)`
- `tbl_user_preference_user_id_f8847056` — `CREATE INDEX tbl_user_preference_user_id_f8847056 ON landscape.tbl_user_preference USING btree (user_id)`
- `tbl_user_preference_user_id_preference_key_s_0f07b87a_uniq` — `CREATE UNIQUE INDEX tbl_user_preference_user_id_preference_key_s_0f07b87a_uniq ON landscape.tbl_user_preference USING btree (user_id, preference_key, scope_type, scope_id)`

## tbl_vacancy_assumption
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| vacancy_id | bigint | NO | nextval('tbl_vacancy_assumption_vacancy_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| vacancy_loss_pct | numeric(5,2) | NO | 0.05 | — |
| collection_loss_pct | numeric(5,2) | NO | 0.02 | — |
| physical_vacancy_pct | numeric(5,2) | YES | 0.03 | — |
| economic_vacancy_pct | numeric(5,2) | YES | 0.02 | — |
| bad_debt_pct | numeric(5,2) | YES | 0.01 | — |
| concession_cost_pct | numeric(5,2) | YES | 0.01 | — |
| turnover_vacancy_days | integer | YES | 14 | — |
| seasonal_vacancy_adjustment | jsonb | YES | — | — |
| lease_up_absorption_curve | jsonb | YES | — | — |
| market_vacancy_rate_pct | numeric(5,2) | YES | — | — |
| submarket_vacancy_rate_pct | numeric(5,2) | YES | — | — |
| competitive_set_vacancy_pct | numeric(5,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_vacancy_project` — `CREATE INDEX idx_vacancy_project ON landscape.tbl_vacancy_assumption USING btree (project_id)`
- `tbl_vacancy_assumption_pkey` — `CREATE UNIQUE INDEX tbl_vacancy_assumption_pkey ON landscape.tbl_vacancy_assumption USING btree (vacancy_id)`

## tbl_valuation_reconciliation
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| reconciliation_id | integer | NO | nextval('tbl_valuation_reconciliation_reconciliation_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| sales_comparison_value | numeric(15,2) | YES | — | — |
| sales_comparison_weight | numeric(4,2) | YES | — | — |
| cost_approach_value | numeric(15,2) | YES | — | — |
| cost_approach_weight | numeric(4,2) | YES | — | — |
| income_approach_value | numeric(15,2) | YES | — | — |
| income_approach_weight | numeric(4,2) | YES | — | — |
| final_reconciled_value | numeric(15,2) | YES | — | — |
| reconciliation_narrative | text | YES | — | — |
| valuation_date | date | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_valuation_reconciliation_project` — `CREATE UNIQUE INDEX idx_valuation_reconciliation_project ON landscape.tbl_valuation_reconciliation USING btree (project_id)`
- `tbl_valuation_reconciliation_pkey` — `CREATE UNIQUE INDEX tbl_valuation_reconciliation_pkey ON landscape.tbl_valuation_reconciliation USING btree (reconciliation_id)`

**Check Constraints:**
- `CHECK ((((COALESCE(sales_comparison_weight, (0)::numeric) + COALESCE(cost_approach_weight, (0)::numeric)) + COALESCE(income_approach_weight, (0)::numeric)) <= 1.01))`

## tbl_value_add_assumptions
**Row Count (estimated):** 6
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| value_add_id | bigint | NO | nextval('tbl_value_add_assumptions_value_add_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| is_enabled | boolean | YES | false | — |
| reno_cost_per_sf | numeric(8,2) | YES | 8.00 | — |
| relocation_incentive | numeric(10,2) | YES | 1500.00 | — |
| renovate_all | boolean | YES | true | — |
| units_to_renovate | integer | YES | — | — |
| reno_starts_per_month | integer | YES | 4 | — |
| reno_start_month | integer | YES | 3 | — |
| rent_premium_pct | numeric(5,4) | YES | 0.15 | — |
| relet_lag_months | integer | YES | 2 | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| reno_cost_basis | character varying(10) | YES | 'sf'::character varying | — |
| months_to_complete | integer | YES | 3 | — |

**Indexes:**
- `tbl_value_add_assumptions_pkey` — `CREATE UNIQUE INDEX tbl_value_add_assumptions_pkey ON landscape.tbl_value_add_assumptions USING btree (value_add_id)`
- `tbl_value_add_assumptions_project_id_key` — `CREATE UNIQUE INDEX tbl_value_add_assumptions_project_id_key ON landscape.tbl_value_add_assumptions USING btree (project_id)`

**Check Constraints:**
- `CHECK (((reno_cost_basis)::text = ANY ((ARRAY['sf'::character varying, 'unit'::character varying])::text[])))`
- `CHECK (((rent_premium_pct >= (0)::numeric) AND (rent_premium_pct <= (1)::numeric)))`
- `CHECK (((units_to_renovate IS NULL) OR (units_to_renovate > 0)))`
- `CHECK ((months_to_complete > 0))`
- `CHECK ((reno_start_month >= 1))`
- `CHECK ((reno_starts_per_month > 0))`

## tbl_waterfall
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| waterfall_id | integer | NO | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| waterfall_name | character varying(255) | NO | — | — |
| tiers | jsonb | NO | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_waterfall_active` — `CREATE INDEX idx_waterfall_active ON landscape.tbl_waterfall USING btree (project_id, is_active)`
- `idx_waterfall_project` — `CREATE INDEX idx_waterfall_project ON landscape.tbl_waterfall USING btree (project_id)`
- `tbl_waterfall_pkey` — `CREATE UNIQUE INDEX tbl_waterfall_pkey ON landscape.tbl_waterfall USING btree (waterfall_id)`

## tbl_waterfall_tier
**Row Count (estimated):** 6
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tier_id | bigint | NO | nextval('tbl_waterfall_tier_tier_id_seq'::regclass) | — |
| equity_structure_id | bigint | NO | — | tbl_equity_structure.equity_structure_id |
| tier_number | integer | NO | — | — |
| tier_description | character varying(200) | YES | — | — |
| hurdle_type | character varying(20) | YES | — | — |
| hurdle_rate | numeric(6,3) | YES | — | — |
| lp_split_pct | numeric(5,2) | YES | — | — |
| gp_split_pct | numeric(5,2) | YES | — | — |
| has_catch_up | boolean | YES | false | — |
| catch_up_pct | numeric(5,2) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| project_id | bigint | YES | — | — |
| tier_name | character varying(200) | YES | — | — |
| irr_threshold_pct | numeric(6,3) | YES | — | — |
| equity_multiple_threshold | numeric(5,2) | YES | — | — |
| is_pari_passu | boolean | YES | false | — |
| is_lookback_tier | boolean | YES | false | — |
| catch_up_to_pct | numeric(5,2) | YES | — | — |
| is_active | boolean | YES | true | — |
| display_order | integer | YES | — | — |

**Indexes:**
- `idx_waterfall_structure` — `CREATE INDEX idx_waterfall_structure ON landscape.tbl_waterfall_tier USING btree (equity_structure_id)`
- `tbl_waterfall_tier_pkey` — `CREATE UNIQUE INDEX tbl_waterfall_tier_pkey ON landscape.tbl_waterfall_tier USING btree (tier_id)`

## tbl_zoning_control
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| zoning_control_id | bigint | NO | nextval('tbl_zoning_control_zoning_control_id_seq'::regclass) | — |
| jurisdiction_id | bigint | YES | — | — |
| zoning_code | character varying(64) | NO | — | — |
| landuse_code | character varying(64) | NO | — | — |
| site_coverage_pct | numeric(5,2) | YES | — | — |
| site_far | numeric(6,3) | YES | — | — |
| max_stories | integer | YES | — | — |
| max_height_ft | numeric(6,2) | YES | — | — |
| parking_ratio_per1000sf | numeric(6,3) | YES | — | — |
| parking_stall_sf | numeric(8,2) | YES | — | — |
| site_common_area_pct | numeric(5,2) | YES | — | — |
| parking_sharing_flag | boolean | YES | — | — |
| parking_structured_flag | boolean | YES | — | — |
| setback_notes | text | YES | — | — |
| scenario_id | character varying(64) | YES | — | — |
| valid_from | date | YES | CURRENT_DATE | — |
| valid_to | date | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_zc_lookup` — `CREATE INDEX idx_zc_lookup ON landscape.tbl_zoning_control USING btree (jurisdiction_id, zoning_code, landuse_code, scenario_id)`
- `idx_zc_validity` — `CREATE INDEX idx_zc_validity ON landscape.tbl_zoning_control USING btree (valid_from, COALESCE(valid_to, '9999-12-31'::date))`
- `tbl_zoning_control_pkey` — `CREATE UNIQUE INDEX tbl_zoning_control_pkey ON landscape.tbl_zoning_control USING btree (zoning_control_id)`
- `uq_zoning_nk` — `CREATE UNIQUE INDEX uq_zoning_nk ON landscape.tbl_zoning_control USING btree (jurisdiction_id, zoning_code, landuse_code, scenario_id, valid_from)`

## Group: core_

## core_category_lifecycle_stages
**Row Count (estimated):** 290
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| category_id | integer | NO | — | core_unit_cost_category.category_id |
| activity | character varying(50) | NO | — | — |
| sort_order | integer | YES | 0 | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_category_lifecycle_stages_pkey` — `CREATE UNIQUE INDEX core_category_lifecycle_stages_pkey ON landscape.core_category_lifecycle_stages USING btree (category_id, activity)`
- `idx_category_lifecycle_category` — `CREATE INDEX idx_category_lifecycle_category ON landscape.core_category_lifecycle_stages USING btree (category_id)`
- `idx_category_lifecycle_sort` — `CREATE INDEX idx_category_lifecycle_sort ON landscape.core_category_lifecycle_stages USING btree (activity, sort_order)`

**Check Constraints:**
- `CHECK (((activity)::text = ANY ((ARRAY['Acquisition'::character varying, 'Planning & Engineering'::character varying, 'Improvements'::character varying, 'Operations'::character varying, 'Disposition'::character varying, 'Financing'::character varying])::text[])))`

## core_category_lifecycle_stages_backup_20260126
**Row Count (estimated):** 94
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| category_id | integer | YES | — | — |
| activity | character varying(50) | YES | — | — |
| sort_order | integer | YES | — | — |
| created_at | timestamp without time zone | YES | — | — |
| updated_at | timestamp without time zone | YES | — | — |

**Indexes:** none

## core_category_tag_library
**Row Count (estimated):** 14
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tag_id | integer | NO | nextval('core_category_tag_library_tag_id_seq'::regclass) | — |
| tag_name | character varying(50) | NO | — | — |
| tag_context | character varying(50) | NO | — | — |
| is_system_default | boolean | YES | true | — |
| description | text | YES | — | — |
| display_order | integer | YES | 999 | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_category_tag_library_pkey` — `CREATE UNIQUE INDEX core_category_tag_library_pkey ON landscape.core_category_tag_library USING btree (tag_id)`
- `core_category_tag_library_tag_name_key` — `CREATE UNIQUE INDEX core_category_tag_library_tag_name_key ON landscape.core_category_tag_library USING btree (tag_name)`
- `idx_tag_library_active` — `CREATE INDEX idx_tag_library_active ON landscape.core_category_tag_library USING btree (is_active) WHERE (is_active = true)`
- `idx_tag_library_context` — `CREATE INDEX idx_tag_library_context ON landscape.core_category_tag_library USING btree (tag_context)`

## core_doc
**Row Count (estimated):** 128
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| doc_id | bigint | NO | nextval('core_doc_doc_id_seq'::regclass) | — |
| project_id | bigint | YES | — | tbl_project.project_id |
| workspace_id | bigint | YES | — | dms_workspaces.workspace_id |
| phase_id | bigint | YES | — | tbl_phase.phase_id |
| parcel_id | bigint | YES | — | tbl_parcel.parcel_id |
| doc_name | character varying(500) | NO | — | — |
| doc_type | character varying(100) | NO | 'general'::character varying | — |
| discipline | character varying(100) | YES | NULL::character varying | — |
| mime_type | character varying(100) | NO | — | — |
| file_size_bytes | bigint | NO | — | — |
| sha256_hash | character varying(64) | NO | — | — |
| storage_uri | text | NO | — | — |
| version_no | integer | YES | 1 | — |
| parent_doc_id | bigint | YES | — | core_doc.doc_id |
| status | character varying(50) | YES | 'draft'::character varying | — |
| profile_json | jsonb | YES | '{}'::jsonb | — |
| doc_date | date | YES | — | — |
| contract_value | numeric(15,2) | YES | NULL::numeric | — |
| priority | character varying(20) | YES | NULL::character varying | — |
| created_by | bigint | YES | — | — |
| updated_by | bigint | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| processing_status | character varying(50) | YES | 'pending'::character varying | — |
| processing_started_at | timestamp without time zone | YES | — | — |
| processing_completed_at | timestamp without time zone | YES | — | — |
| processing_error | text | YES | — | — |
| chunks_count | integer | YES | 0 | — |
| embeddings_count | integer | YES | 0 | — |
| deleted_at | timestamp with time zone | YES | — | — |
| deleted_by | character varying(255) | YES | — | — |
| cabinet_id | bigint | YES | — | tbl_cabinet.cabinet_id |
| media_scan_status | character varying(20) | YES | 'unscanned'::character varying | — |
| media_scan_json | jsonb | YES | — | — |
| table_count | integer | YES | 0 | — |

**Indexes:**
- `core_doc_pkey` — `CREATE UNIQUE INDEX core_doc_pkey ON landscape.core_doc USING btree (doc_id)`
- `idx_core_doc_deleted_at` — `CREATE INDEX idx_core_doc_deleted_at ON landscape.core_doc USING btree (deleted_at) WHERE (deleted_at IS NULL)`
- `idx_core_doc_doc_type` — `CREATE INDEX idx_core_doc_doc_type ON landscape.core_doc USING btree (doc_type)`
- `idx_core_doc_processing_status` — `CREATE INDEX idx_core_doc_processing_status ON landscape.core_doc USING btree (processing_status)`
- `idx_core_doc_profile_json` — `CREATE INDEX idx_core_doc_profile_json ON landscape.core_doc USING gin (profile_json)`
- `idx_core_doc_project_id` — `CREATE INDEX idx_core_doc_project_id ON landscape.core_doc USING btree (project_id)`
- `idx_core_doc_status` — `CREATE INDEX idx_core_doc_status ON landscape.core_doc USING btree (status)`
- `idx_core_doc_workspace_id` — `CREATE INDEX idx_core_doc_workspace_id ON landscape.core_doc USING btree (workspace_id)`
- `idx_doc_cabinet` — `CREATE INDEX idx_doc_cabinet ON landscape.core_doc USING btree (cabinet_id)`
- `idx_doc_media_scan` — `CREATE INDEX idx_doc_media_scan ON landscape.core_doc USING btree (media_scan_status) WHERE ((media_scan_status)::text <> ALL ((ARRAY['complete'::character varying, 'not_applicable'::character varying, 'unscanned'::character varying])::text[]))`

**Check Constraints:**
- `CHECK (((media_scan_status)::text = ANY ((ARRAY['unscanned'::character varying, 'scanning'::character varying, 'scanned'::character varying, 'extracting'::character varying, 'extracted'::character varying, 'classifying'::character varying, 'classified'::character varying, 'complete'::character varying, 'error'::character varying, 'not_applicable'::character varying])::text[])))`
- `CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'queued'::character varying, 'extracting'::character varying, 'chunking'::character varying, 'embedding'::character varying, 'ready'::character varying, 'failed'::character varying, 'skipped'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'processing'::character varying, 'indexed'::character varying, 'failed'::character varying, 'archived'::character varying])::text[])))`

## core_doc_attr_enum
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| attr_id | bigint | NO | — | dms_attributes.attr_id |
| option_code | text | NO | — | — |
| label | text | NO | — | — |
| sort_order | integer | NO | 0 | — |
| is_active | boolean | NO | true | — |

**Indexes:**
- `core_doc_attr_enum_pkey` — `CREATE UNIQUE INDEX core_doc_attr_enum_pkey ON landscape.core_doc_attr_enum USING btree (attr_id, option_code)`

## core_doc_attr_lookup
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| attr_id | bigint | NO | — | dms_attributes.attr_id |
| sql_source | text | NO | — | — |
| cache_ttl | integer | NO | 600 | — |
| display_fmt | text | YES | — | — |

**Indexes:**
- `core_doc_attr_lookup_pkey` — `CREATE UNIQUE INDEX core_doc_attr_lookup_pkey ON landscape.core_doc_attr_lookup USING btree (attr_id)`

## core_doc_folder
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| folder_id | integer | NO | nextval('core_doc_folder_folder_id_seq'::regclass) | — |
| parent_id | integer | YES | — | core_doc_folder.folder_id |
| name | character varying(255) | NO | — | — |
| path | text | NO | — | — |
| sort_order | integer | YES | 0 | — |
| default_profile | jsonb | YES | '{}'::jsonb | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_doc_folder_pkey` — `CREATE UNIQUE INDEX core_doc_folder_pkey ON landscape.core_doc_folder USING btree (folder_id)`
- `idx_folder_parent` — `CREATE INDEX idx_folder_parent ON landscape.core_doc_folder USING btree (parent_id) WHERE (is_active = true)`
- `idx_folder_path` — `CREATE INDEX idx_folder_path ON landscape.core_doc_folder USING btree (path)`
- `unique_folder_path` — `CREATE UNIQUE INDEX unique_folder_path ON landscape.core_doc_folder USING btree (path)`

**Check Constraints:**
- `CHECK ((folder_id <> parent_id))`

## core_doc_folder_link
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| doc_id | integer | NO | — | core_doc.doc_id |
| folder_id | integer | NO | — | core_doc_folder.folder_id |
| linked_at | timestamp without time zone | YES | now() | — |
| inherited | boolean | YES | true | — |

**Indexes:**
- `core_doc_folder_link_pkey` — `CREATE UNIQUE INDEX core_doc_folder_link_pkey ON landscape.core_doc_folder_link USING btree (doc_id)`
- `idx_folder_link_folder` — `CREATE INDEX idx_folder_link_folder ON landscape.core_doc_folder_link USING btree (folder_id)`

## core_doc_media
**Row Count (estimated):** 241
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| media_id | bigint | NO | nextval('core_doc_media_media_id_seq'::regclass) | — |
| doc_id | bigint | NO | — | core_doc.doc_id |
| project_id | bigint | YES | — | tbl_project.project_id |
| workspace_id | bigint | YES | — | dms_workspaces.workspace_id |
| classification_id | integer | YES | — | lu_media_classification.classification_id |
| ai_classification | character varying(50) | YES | — | — |
| ai_confidence | numeric(5,4) | YES | — | — |
| user_override | boolean | NO | false | — |
| source_page | integer | YES | — | — |
| source_region | jsonb | YES | — | — |
| extraction_method | character varying(30) | NO | 'embedded'::character varying | — |
| asset_name | character varying(500) | YES | — | — |
| storage_uri | text | NO | — | — |
| thumbnail_uri | text | YES | — | — |
| mime_type | character varying(100) | NO | 'image/png'::character varying | — |
| file_size_bytes | bigint | YES | — | — |
| width_px | integer | YES | — | — |
| height_px | integer | YES | — | — |
| dpi | integer | YES | — | — |
| caption | text | YES | — | — |
| alt_text | text | YES | — | — |
| tags | ARRAY | YES | — | — |
| ai_description | text | YES | — | — |
| status | character varying(20) | NO | 'extracted'::character varying | — |
| created_at | timestamp with time zone | NO | now() | — |
| updated_at | timestamp with time zone | NO | now() | — |
| created_by | bigint | YES | — | — |
| deleted_at | timestamp with time zone | YES | — | — |
| suggested_action | character varying(20) | YES | — | — |
| user_action | character varying(20) | YES | — | — |
| discard_reason_code | character varying(50) | YES | — | — |
| discard_reason_text | text | YES | — | — |
| discarded_at | timestamp with time zone | YES | — | — |
| image_hash | character varying(64) | YES | — | — |

**Indexes:**
- `core_doc_media_pkey` — `CREATE UNIQUE INDEX core_doc_media_pkey ON landscape.core_doc_media USING btree (media_id)`
- `idx_doc_media_hash` — `CREATE INDEX idx_doc_media_hash ON landscape.core_doc_media USING btree (image_hash)`
- `idx_media_class_id` — `CREATE INDEX idx_media_class_id ON landscape.core_doc_media USING btree (classification_id)`
- `idx_media_deleted` — `CREATE INDEX idx_media_deleted ON landscape.core_doc_media USING btree (deleted_at) WHERE (deleted_at IS NULL)`
- `idx_media_doc_id` — `CREATE INDEX idx_media_doc_id ON landscape.core_doc_media USING btree (doc_id)`
- `idx_media_method` — `CREATE INDEX idx_media_method ON landscape.core_doc_media USING btree (extraction_method)`
- `idx_media_project_id` — `CREATE INDEX idx_media_project_id ON landscape.core_doc_media USING btree (project_id)`
- `idx_media_status` — `CREATE INDEX idx_media_status ON landscape.core_doc_media USING btree (status) WHERE (deleted_at IS NULL)`
- `idx_media_tags` — `CREATE INDEX idx_media_tags ON landscape.core_doc_media USING gin (tags)`

**Check Constraints:**
- `CHECK (((ai_confidence IS NULL) OR ((ai_confidence >= (0)::numeric) AND (ai_confidence <= (1)::numeric))))`
- `CHECK (((extraction_method)::text = ANY ((ARRAY['embedded'::character varying, 'page_capture'::character varying, 'region'::character varying, 'upload'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'extracted'::character varying, 'classified'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[])))`
- `CHECK (((suggested_action IS NULL) OR ((suggested_action)::text = ANY ((ARRAY['save_image'::character varying, 'extract_data'::character varying, 'both'::character varying, 'ignore'::character varying])::text[]))))`
- `CHECK (((user_action IS NULL) OR ((user_action)::text = ANY ((ARRAY['save_image'::character varying, 'extract_data'::character varying, 'both'::character varying, 'ignore'::character varying])::text[]))))`

## core_doc_media_link
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| link_id | bigint | NO | nextval('core_doc_media_link_link_id_seq'::regclass) | — |
| media_id | bigint | NO | — | core_doc_media.media_id |
| entity_type | character varying(50) | NO | — | — |
| entity_id | bigint | NO | — | — |
| link_purpose | character varying(50) | YES | — | — |
| display_order | integer | NO | 0 | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |
| created_by | bigint | YES | — | — |

**Indexes:**
- `core_doc_media_link_pkey` — `CREATE UNIQUE INDEX core_doc_media_link_pkey ON landscape.core_doc_media_link USING btree (link_id)`
- `idx_media_link_entity` — `CREATE INDEX idx_media_link_entity ON landscape.core_doc_media_link USING btree (entity_type, entity_id)`
- `idx_media_link_media` — `CREATE INDEX idx_media_link_media ON landscape.core_doc_media_link USING btree (media_id)`
- `idx_media_link_purpose` — `CREATE INDEX idx_media_link_purpose ON landscape.core_doc_media_link USING btree (link_purpose) WHERE (link_purpose IS NOT NULL)`
- `uq_media_entity_link` — `CREATE UNIQUE INDEX uq_media_entity_link ON landscape.core_doc_media_link USING btree (media_id, entity_type, entity_id)`

## core_doc_smartfilter
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| filter_id | integer | NO | nextval('core_doc_smartfilter_filter_id_seq'::regclass) | — |
| name | character varying(255) | NO | — | — |
| query | jsonb | NO | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_doc_smartfilter_pkey` — `CREATE UNIQUE INDEX core_doc_smartfilter_pkey ON landscape.core_doc_smartfilter USING btree (filter_id)`
- `idx_smartfilter_active` — `CREATE INDEX idx_smartfilter_active ON landscape.core_doc_smartfilter USING btree (is_active) WHERE (is_active = true)`

## core_doc_text
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| doc_id | integer | NO | — | core_doc.doc_id |
| extracted_text | text | YES | — | — |
| word_count | integer | YES | — | — |
| extraction_method | character varying(50) | YES | — | — |
| extracted_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_doc_text_pkey` — `CREATE UNIQUE INDEX core_doc_text_pkey ON landscape.core_doc_text USING btree (doc_id)`
- `idx_doc_text_fts` — `CREATE INDEX idx_doc_text_fts ON landscape.core_doc_text USING gin (to_tsvector('english'::regconfig, extracted_text))`

## core_fin_budget_version
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| budget_id | bigint | NO | nextval('core_fin_budget_version_budget_id_seq'::regclass) | — |
| name | text | NO | — | — |
| as_of | date | NO | — | — |
| status | text | NO | 'draft'::text | — |
| created_at | timestamp with time zone | NO | now() | — |
| project_id | bigint | YES | — | tbl_project.project_id |

**Indexes:**
- `core_fin_budget_version_pkey` — `CREATE UNIQUE INDEX core_fin_budget_version_pkey ON landscape.core_fin_budget_version USING btree (budget_id)`

**Check Constraints:**
- `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])))`

## core_fin_category_uom
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| category_id | bigint | NO | — | — |
| uom_code | text | NO | — | core_fin_uom.uom_code |

**Indexes:**
- `core_fin_category_uom_pkey` — `CREATE UNIQUE INDEX core_fin_category_uom_pkey ON landscape.core_fin_category_uom USING btree (category_id, uom_code)`

## core_fin_confidence_policy
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| confidence_code | text | NO | — | — |
| name | text | NO | — | — |
| default_contingency_pct | numeric(5,2) | NO | 0 | — |
| description | text | YES | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_fin_confidence_policy_pkey` — `CREATE UNIQUE INDEX core_fin_confidence_policy_pkey ON landscape.core_fin_confidence_policy USING btree (confidence_code)`

## core_fin_crosswalk_ad
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| ad_code | text | NO | — | — |
| ad_group | text | YES | — | — |
| category_id | bigint | NO | — | — |

**Indexes:**
- `core_fin_crosswalk_ad_pkey` — `CREATE UNIQUE INDEX core_fin_crosswalk_ad_pkey ON landscape.core_fin_crosswalk_ad USING btree (ad_code, category_id)`

## core_fin_crosswalk_ae
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| ae_coa | text | NO | — | — |
| ae_group | text | YES | — | — |
| category_id | bigint | NO | — | — |

**Indexes:**
- `core_fin_crosswalk_ae_pkey` — `CREATE UNIQUE INDEX core_fin_crosswalk_ae_pkey ON landscape.core_fin_crosswalk_ae USING btree (ae_coa, category_id)`

## core_fin_curve
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| curve_id | bigint | NO | nextval('core_fin_curve_curve_id_seq'::regclass) | — |
| name | text | NO | — | — |
| points_json | jsonb | NO | — | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_fin_curve_name_key` — `CREATE UNIQUE INDEX core_fin_curve_name_key ON landscape.core_fin_curve USING btree (name)`
- `core_fin_curve_pkey` — `CREATE UNIQUE INDEX core_fin_curve_pkey ON landscape.core_fin_curve USING btree (curve_id)`

## core_fin_division_applicability
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| category_id | bigint | NO | — | — |
| tier | integer | NO | — | — |

**Indexes:**
- `core_fin_container_applicability_pkey` — `CREATE UNIQUE INDEX core_fin_container_applicability_pkey ON landscape.core_fin_division_applicability USING btree (category_id, tier)`

**Check Constraints:**
- `CHECK (((tier >= 0) AND (tier <= 3)))`

## core_fin_fact_actual
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| fact_id | bigint | NO | nextval('core_fin_fact_actual_fact_id_seq'::regclass) | — |
| category_id | bigint | NO | — | — |
| uom_code | text | NO | — | core_fin_uom.uom_code |
| qty | numeric(18,6) | YES | 1 | — |
| rate | numeric(18,6) | YES | — | — |
| amount | numeric(18,2) | YES | — | — |
| txn_date | date | NO | — | — |
| source_doc | text | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |
| container_id | bigint | YES | — | tbl_division.division_id |
| project_id | bigint | YES | — | tbl_project.project_id |
| scenario_id | integer | YES | — | tbl_scenario.scenario_id |

**Indexes:**
- `core_fin_fact_actual_pkey` — `CREATE UNIQUE INDEX core_fin_fact_actual_pkey ON landscape.core_fin_fact_actual USING btree (fact_id)`
- `idx_core_fin_fact_actual_container` — `CREATE INDEX idx_core_fin_fact_actual_container ON landscape.core_fin_fact_actual USING btree (container_id)`
- `idx_fact_actual_category` — `CREATE INDEX idx_fact_actual_category ON landscape.core_fin_fact_actual USING btree (category_id)`
- `idx_fact_actual_container` — `CREATE INDEX idx_fact_actual_container ON landscape.core_fin_fact_actual USING btree (container_id, txn_date)`
- `idx_fact_actual_scenario` — `CREATE INDEX idx_fact_actual_scenario ON landscape.core_fin_fact_actual USING btree (scenario_id)`

## core_fin_fact_budget
**Row Count (estimated):** 86
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| fact_id | bigint | NO | nextval('core_fin_fact_budget_fact_id_seq'::regclass) | — |
| budget_id | bigint | NO | — | core_fin_budget_version.budget_id |
| category_id | bigint | YES | — | core_unit_cost_category.category_id |
| funding_id | bigint | YES | — | core_fin_funding_source.funding_id |
| uom_code | text | NO | — | core_fin_uom.uom_code |
| qty | numeric(18,6) | YES | 1 | — |
| rate | numeric(18,6) | YES | — | — |
| amount | numeric(18,2) | YES | — | — |
| start_date | date | YES | — | — |
| end_date | date | YES | — | — |
| curve_id | bigint | YES | — | core_fin_curve.curve_id |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |
| division_id | bigint | YES | — | tbl_division.division_id |
| confidence_level | character varying(20) | YES | — | — |
| vendor_contact_id | integer | YES | — | tbl_contacts_legacy.contact_id |
| escalation_rate | numeric | YES | — | — |
| contingency_pct | numeric | YES | — | — |
| timing_method | character varying(20) | YES | — | — |
| contract_number | character varying(50) | YES | — | — |
| purchase_order | character varying(50) | YES | — | — |
| is_committed | boolean | YES | false | — |
| growth_rate_set_id | integer | YES | — | core_fin_growth_rate_sets.set_id |
| project_id | bigint | YES | — | tbl_project.project_id |
| contingency_mode | text | YES | — | — |
| confidence_code | text | YES | — | — |
| finance_structure_id | bigint | YES | — | tbl_finance_structure.finance_structure_id |
| scenario_id | integer | YES | — | tbl_scenario.scenario_id |
| category_l1_id | bigint | YES | — | — |
| category_l2_id | bigint | YES | — | — |
| category_l3_id | bigint | YES | — | — |
| category_l4_id | bigint | YES | — | — |
| start_period | integer | YES | — | — |
| periods_to_complete | integer | YES | — | — |
| end_period | integer | YES | — | — |
| escalation_method | character varying(20) | YES | — | — |
| curve_profile | character varying(20) | YES | — | — |
| curve_steepness | numeric(5,2) | YES | — | — |
| scope_override | character varying(100) | YES | — | — |
| cost_type | character varying(20) | YES | — | — |
| tax_treatment | character varying(20) | YES | — | — |
| internal_memo | text | YES | — | — |
| vendor_name | character varying(200) | YES | — | — |
| baseline_start_date | date | YES | — | — |
| baseline_end_date | date | YES | — | — |
| actual_start_date | date | YES | — | — |
| actual_end_date | date | YES | — | — |
| percent_complete | numeric(5,2) | YES | — | — |
| status | character varying(20) | YES | — | — |
| is_critical | boolean | YES | false | — |
| float_days | integer | YES | — | — |
| early_start_date | date | YES | — | — |
| late_finish_date | date | YES | — | — |
| milestone_id | bigint | YES | — | — |
| budget_version | character varying(20) | YES | — | — |
| version_as_of_date | date | YES | — | — |
| funding_draw_pct | numeric(5,2) | YES | — | — |
| draw_schedule | character varying(20) | YES | — | — |
| retention_pct | numeric(5,2) | YES | — | — |
| payment_terms | character varying(50) | YES | — | — |
| invoice_frequency | character varying(20) | YES | — | — |
| cost_allocation | character varying(20) | YES | — | — |
| is_reimbursable | boolean | YES | false | — |
| allocation_method | character varying(20) | YES | — | — |
| cf_start_flag | boolean | YES | false | — |
| cf_distribution | character varying(100) | YES | — | — |
| allocated_total | numeric(18,2) | YES | — | — |
| allocation_variance | numeric(18,2) | YES | — | — |
| bid_date | date | YES | — | — |
| bid_amount | numeric(18,2) | YES | — | — |
| bid_variance | numeric(18,2) | YES | — | — |
| change_order_count | integer | YES | 0 | — |
| change_order_total | numeric(18,2) | YES | 0 | — |
| approval_status | character varying(20) | YES | — | — |
| approved_by | bigint | YES | — | — |
| approval_date | date | YES | — | — |
| document_count | integer | YES | 0 | — |
| last_modified_by | bigint | YES | — | — |
| last_modified_date | timestamp without time zone | YES | — | — |
| activity | character varying(50) | YES | — | — |
| new_category_id | bigint | YES | — | — |

**Indexes:**
- `core_fin_fact_budget_pkey` — `CREATE UNIQUE INDEX core_fin_fact_budget_pkey ON landscape.core_fin_fact_budget USING btree (fact_id)`
- `idx_budget_approval_status` — `CREATE INDEX idx_budget_approval_status ON landscape.core_fin_fact_budget USING btree (approval_status)`
- `idx_budget_fact_category_l1` — `CREATE INDEX idx_budget_fact_category_l1 ON landscape.core_fin_fact_budget USING btree (category_l1_id) WHERE (category_l1_id IS NOT NULL)`
- `idx_budget_fact_category_l2` — `CREATE INDEX idx_budget_fact_category_l2 ON landscape.core_fin_fact_budget USING btree (category_l2_id) WHERE (category_l2_id IS NOT NULL)`
- `idx_budget_fact_category_l3` — `CREATE INDEX idx_budget_fact_category_l3 ON landscape.core_fin_fact_budget USING btree (category_l3_id) WHERE (category_l3_id IS NOT NULL)`
- `idx_budget_fact_category_l4` — `CREATE INDEX idx_budget_fact_category_l4 ON landscape.core_fin_fact_budget USING btree (category_l4_id) WHERE (category_l4_id IS NOT NULL)`
- `idx_budget_finance_structure` — `CREATE INDEX idx_budget_finance_structure ON landscape.core_fin_fact_budget USING btree (finance_structure_id)`
- `idx_budget_funding_id` — `CREATE INDEX idx_budget_funding_id ON landscape.core_fin_fact_budget USING btree (funding_id)`
- `idx_budget_is_critical` — `CREATE INDEX idx_budget_is_critical ON landscape.core_fin_fact_budget USING btree (is_critical) WHERE (is_critical = true)`
- `idx_budget_lifecycle_stage` — `CREATE INDEX idx_budget_lifecycle_stage ON landscape.core_fin_fact_budget USING btree (activity)`
- `idx_budget_milestone_id` — `CREATE INDEX idx_budget_milestone_id ON landscape.core_fin_fact_budget USING btree (milestone_id)`
- `idx_budget_status` — `CREATE INDEX idx_budget_status ON landscape.core_fin_fact_budget USING btree (status)`
- `idx_core_fin_fact_budget_confidence` — `CREATE INDEX idx_core_fin_fact_budget_confidence ON landscape.core_fin_fact_budget USING btree (confidence_level)`
- `idx_core_fin_fact_budget_container` — `CREATE INDEX idx_core_fin_fact_budget_container ON landscape.core_fin_fact_budget USING btree (division_id)`
- `idx_core_fin_fact_budget_periods` — `CREATE INDEX idx_core_fin_fact_budget_periods ON landscape.core_fin_fact_budget USING btree (start_period, end_period) WHERE (start_period IS NOT NULL)`
- `idx_core_fin_fact_budget_vendor` — `CREATE INDEX idx_core_fin_fact_budget_vendor ON landscape.core_fin_fact_budget USING btree (vendor_contact_id)`
- `idx_fact_budget_budget_container` — `CREATE INDEX idx_fact_budget_budget_container ON landscape.core_fin_fact_budget USING btree (budget_id, division_id)`
- `idx_fact_budget_category` — `CREATE INDEX idx_fact_budget_category ON landscape.core_fin_fact_budget USING btree (category_id)`
- `idx_fact_budget_dates` — `CREATE INDEX idx_fact_budget_dates ON landscape.core_fin_fact_budget USING btree (start_date, end_date)`
- `idx_fact_budget_division` — `CREATE INDEX idx_fact_budget_division ON landscape.core_fin_fact_budget USING btree (division_id, category_id)`
- `idx_fact_budget_project_level` — `CREATE INDEX idx_fact_budget_project_level ON landscape.core_fin_fact_budget USING btree (project_id, category_id) WHERE (division_id IS NULL)`
- `idx_fact_budget_project_scenario` — `CREATE INDEX idx_fact_budget_project_scenario ON landscape.core_fin_fact_budget USING btree (project_id, scenario_id)`
- `idx_fact_budget_scenario` — `CREATE INDEX idx_fact_budget_scenario ON landscape.core_fin_fact_budget USING btree (scenario_id)`

**Check Constraints:**
- `CHECK (((activity IS NULL) OR ((activity)::text = ANY ((ARRAY['Acquisition'::character varying, 'Planning & Engineering'::character varying, 'Development'::character varying, 'Operations'::character varying, 'Disposition'::character varying, 'Financing'::character varying])::text[]))))`
- `CHECK (((allocation_method)::text = ANY ((ARRAY['even'::character varying, 'curve'::character varying, 'custom'::character varying])::text[])))`
- `CHECK (((approval_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))`
- `CHECK (((budget_version)::text = ANY ((ARRAY['original'::character varying, 'revised'::character varying, 'forecast'::character varying])::text[])))`
- `CHECK (((confidence_level IS NULL) OR ((confidence_level)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying, 'guess'::character varying])::text[]))))`
- `CHECK (((cost_allocation)::text = ANY ((ARRAY['direct'::character varying, 'shared'::character varying, 'pro_rata'::character varying])::text[])))`
- `CHECK (((cost_type)::text = ANY ((ARRAY['direct'::character varying, 'indirect'::character varying, 'soft'::character varying, 'financing'::character varying])::text[])))`
- `CHECK (((curve_profile)::text = ANY ((ARRAY['standard'::character varying, 'front_loaded'::character varying, 'back_loaded'::character varying])::text[])))`
- `CHECK (((curve_steepness >= (0)::numeric) AND (curve_steepness <= (100)::numeric)))`
- `CHECK (((draw_schedule)::text = ANY ((ARRAY['as_incurred'::character varying, 'monthly'::character varying, 'milestone'::character varying])::text[])))`
- `CHECK (((escalation_method)::text = ANY ((ARRAY['to_start'::character varying, 'through_duration'::character varying])::text[])))`
- `CHECK (((funding_draw_pct >= (0)::numeric) AND (funding_draw_pct <= (100)::numeric)))`
- `CHECK (((invoice_frequency)::text = ANY ((ARRAY['monthly'::character varying, 'milestone'::character varying, 'completion'::character varying])::text[])))`
- `CHECK (((percent_complete >= (0)::numeric) AND (percent_complete <= (100)::numeric)))`
- `CHECK (((retention_pct >= (0)::numeric) AND (retention_pct <= (100)::numeric)))`
- `CHECK (((status)::text = ANY ((ARRAY['not_started'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))`
- `CHECK (((tax_treatment)::text = ANY ((ARRAY['capitalizable'::character varying, 'deductible'::character varying, 'non_deductible'::character varying])::text[])))`

## core_fin_fact_tags
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tag_id | bigint | NO | — | — |
| fact_id | bigint | NO | — | — |
| fact_type | character varying(10) | NO | — | — |
| tag_name | character varying(50) | NO | — | — |
| tag_color | character varying(7) | YES | — | — |
| tag_category | character varying(20) | YES | — | — |
| is_compact | boolean | YES | false | — |
| created_by | integer | YES | — | — |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | — |

**Indexes:**
- `core_fin_fact_tags_fact_id_fact_type_tag_name_key` — `CREATE UNIQUE INDEX core_fin_fact_tags_fact_id_fact_type_tag_name_key ON landscape.core_fin_fact_tags USING btree (fact_id, fact_type, tag_name)`
- `core_fin_fact_tags_pkey` — `CREATE UNIQUE INDEX core_fin_fact_tags_pkey ON landscape.core_fin_fact_tags USING btree (tag_id)`
- `idx_fact_tags_category` — `CREATE INDEX idx_fact_tags_category ON landscape.core_fin_fact_tags USING btree (tag_category)`
- `idx_fact_tags_fact` — `CREATE INDEX idx_fact_tags_fact ON landscape.core_fin_fact_tags USING btree (fact_id, fact_type)`
- `idx_fact_tags_name` — `CREATE INDEX idx_fact_tags_name ON landscape.core_fin_fact_tags USING btree (tag_name)`

**Check Constraints:**
- `CHECK (((fact_type)::text = ANY ((ARRAY['budget'::character varying, 'actual'::character varying])::text[])))`

## core_fin_funding_source
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| funding_id | bigint | NO | nextval('core_fin_funding_source_funding_id_seq'::regclass) | — |
| type | text | NO | — | — |
| subclass | text | YES | — | — |
| rank | integer | YES | — | — |
| lender_party | text | YES | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_fin_funding_source_pkey` — `CREATE UNIQUE INDEX core_fin_funding_source_pkey ON landscape.core_fin_funding_source USING btree (funding_id)`

**Check Constraints:**
- `CHECK ((type = ANY (ARRAY['Equity'::text, 'Debt'::text, 'Bond'::text])))`

## core_fin_growth_rate_sets
**Row Count (estimated):** 18
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| set_id | integer | NO | nextval('core_fin_growth_rate_sets_set_id_seq'::regclass) | — |
| project_id | bigint | NO | — | — |
| card_type | character varying(50) | NO | — | — |
| set_name | character varying(100) | NO | 'Custom 1'::character varying | — |
| is_default | boolean | YES | false | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| market_geography | character varying(100) | YES | — | — |
| is_global | boolean | YES | false | — |

**Indexes:**
- `core_fin_growth_rate_sets_pkey` — `CREATE UNIQUE INDEX core_fin_growth_rate_sets_pkey ON landscape.core_fin_growth_rate_sets USING btree (set_id)`
- `core_fin_growth_rate_sets_project_id_card_type_set_name_key` — `CREATE UNIQUE INDEX core_fin_growth_rate_sets_project_id_card_type_set_name_key ON landscape.core_fin_growth_rate_sets USING btree (project_id, card_type, set_name)`
- `idx_growth_rate_benchmark` — `CREATE INDEX idx_growth_rate_benchmark ON landscape.core_fin_growth_rate_sets USING btree (benchmark_id)`
- `idx_growth_rate_geography` — `CREATE INDEX idx_growth_rate_geography ON landscape.core_fin_growth_rate_sets USING btree (market_geography)`
- `idx_growth_rate_sets_project_card` — `CREATE INDEX idx_growth_rate_sets_project_card ON landscape.core_fin_growth_rate_sets USING btree (project_id, card_type)`

## core_fin_growth_rate_steps
**Row Count (estimated):** 9
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| step_id | integer | NO | nextval('core_fin_growth_rate_steps_step_id_seq'::regclass) | — |
| set_id | integer | NO | — | core_fin_growth_rate_sets.set_id |
| step_number | integer | NO | — | — |
| from_period | integer | NO | — | — |
| periods | integer | YES | — | — |
| rate | numeric(5,2) | NO | — | — |
| thru_period | integer | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `core_fin_growth_rate_steps_pkey` — `CREATE UNIQUE INDEX core_fin_growth_rate_steps_pkey ON landscape.core_fin_growth_rate_steps USING btree (step_id)`
- `core_fin_growth_rate_steps_set_id_step_number_key` — `CREATE UNIQUE INDEX core_fin_growth_rate_steps_set_id_step_number_key ON landscape.core_fin_growth_rate_steps USING btree (set_id, step_number)`
- `idx_growth_rate_steps_set` — `CREATE INDEX idx_growth_rate_steps_set ON landscape.core_fin_growth_rate_steps USING btree (set_id, step_number)`

## core_fin_uom
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| uom_code | text | NO | — | — |
| name | text | NO | — | — |
| uom_type | text | NO | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_fin_uom_pkey` — `CREATE UNIQUE INDEX core_fin_uom_pkey ON landscape.core_fin_uom USING btree (uom_code)`

## core_item_benchmark_link
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| link_id | integer | NO | nextval('core_template_benchmark_link_link_id_seq'::regclass) | — |
| item_id | integer | YES | — | core_unit_cost_item.item_id |
| benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| is_primary | boolean | YES | false | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_item_benchmark_link_pkey` — `CREATE UNIQUE INDEX core_item_benchmark_link_pkey ON landscape.core_item_benchmark_link USING btree (link_id)`
- `idx_template_benchmark_benchmark` — `CREATE INDEX idx_template_benchmark_benchmark ON landscape.core_item_benchmark_link USING btree (benchmark_id)`
- `idx_template_benchmark_template` — `CREATE INDEX idx_template_benchmark_template ON landscape.core_item_benchmark_link USING btree (item_id)`

## core_lookup_item
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| item_id | bigint | NO | nextval('core_lookup_item_item_id_seq'::regclass) | — |
| list_key | text | NO | — | core_lookup_list.list_key |
| sort_order | integer | NO | 0 | — |
| code | text | NO | — | — |
| label | text | NO | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_lookup_item_pkey` — `CREATE UNIQUE INDEX core_lookup_item_pkey ON landscape.core_lookup_item USING btree (item_id)`
- `uq_core_lookup_item` — `CREATE UNIQUE INDEX uq_core_lookup_item ON landscape.core_lookup_item USING btree (list_key, code)`

## core_lookup_list
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| list_key | text | NO | — | — |
| name | text | NO | — | — |
| description | text | YES | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_lookup_list_pkey` — `CREATE UNIQUE INDEX core_lookup_list_pkey ON landscape.core_lookup_list USING btree (list_key)`

## core_planning_standards
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| standard_id | integer | NO | nextval('core_planning_standards_standard_id_seq'::regclass) | — |
| standard_name | character varying(100) | NO | — | — |
| default_planning_efficiency | numeric(5,4) | YES | 0.7500 | — |
| default_street_row_pct | numeric(5,4) | YES | — | — |
| default_park_dedication_pct | numeric(5,4) | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `core_planning_standards_pkey` — `CREATE UNIQUE INDEX core_planning_standards_pkey ON landscape.core_planning_standards USING btree (standard_id)`
- `core_planning_standards_unique` — `CREATE UNIQUE INDEX core_planning_standards_unique ON landscape.core_planning_standards USING btree (standard_name)`

## core_unit_cost_category
**Row Count (estimated):** 234
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| category_id | integer | NO | nextval('core_unit_cost_category_category_id_seq'::regclass) | — |
| parent_id | integer | YES | — | core_unit_cost_category.category_id |
| category_name | character varying(100) | NO | — | — |
| sort_order | integer | YES | 0 | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| tags | jsonb | YES | '[]'::jsonb | — |
| account_number | character varying(20) | YES | — | — |
| account_level | smallint | YES | 1 | — |
| is_calculated | boolean | YES | false | — |
| property_types | ARRAY | YES | ARRAY['MF'::text, 'OFF'::text, 'RET'::text, 'IND'::text, 'HTL'::text, 'MXU'::text, 'LAND'::text] | — |

**Indexes:**
- `core_unit_cost_category_account_number_key` — `CREATE UNIQUE INDEX core_unit_cost_category_account_number_key ON landscape.core_unit_cost_category USING btree (account_number)`
- `core_unit_cost_category_pkey` — `CREATE UNIQUE INDEX core_unit_cost_category_pkey ON landscape.core_unit_cost_category USING btree (category_id)`
- `idx_category_account_number` — `CREATE INDEX idx_category_account_number ON landscape.core_unit_cost_category USING btree (account_number) WHERE (account_number IS NOT NULL)`
- `idx_category_is_calculated` — `CREATE INDEX idx_category_is_calculated ON landscape.core_unit_cost_category USING btree (is_calculated) WHERE (is_calculated = true)`
- `idx_category_property_types` — `CREATE INDEX idx_category_property_types ON landscape.core_unit_cost_category USING gin (property_types)`
- `idx_category_tags` — `CREATE INDEX idx_category_tags ON landscape.core_unit_cost_category USING gin (tags)`
- `idx_unit_cost_category_parent` — `CREATE INDEX idx_unit_cost_category_parent ON landscape.core_unit_cost_category USING btree (parent_id)`

**Check Constraints:**
- `CHECK ((jsonb_typeof(tags) = 'array'::text))`

## core_unit_cost_category_backup_20260126
**Row Count (estimated):** 95
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| category_id | integer | YES | — | — |
| parent_id | integer | YES | — | — |
| category_name | character varying(100) | YES | — | — |
| sort_order | integer | YES | — | — |
| is_active | boolean | YES | — | — |
| created_at | timestamp without time zone | YES | — | — |
| updated_at | timestamp without time zone | YES | — | — |
| tags | jsonb | YES | — | — |
| account_number | character varying(20) | YES | — | — |
| account_level | smallint | YES | — | — |
| is_calculated | boolean | YES | — | — |
| property_types | ARRAY | YES | — | — |

**Indexes:** none

## core_unit_cost_item
**Row Count (estimated):** 293
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| item_id | integer | NO | nextval('core_unit_cost_item_item_id_seq'::regclass) | — |
| category_id | integer | YES | — | core_unit_cost_category.category_id |
| item_name | character varying(200) | NO | — | — |
| default_uom_code | character varying(10) | YES | — | tbl_measures.measure_code |
| typical_low_value | numeric(12,2) | YES | — | — |
| typical_mid_value | numeric(12,2) | YES | — | — |
| typical_high_value | numeric(12,2) | YES | — | — |
| market_geography | character varying(100) | YES | — | — |
| project_type_code | character varying(50) | YES | 'LAND'::character varying | — |
| last_used_date | date | YES | — | — |
| usage_count | integer | YES | 0 | — |
| is_active | boolean | YES | true | — |
| created_from_project_id | integer | YES | — | tbl_project.project_id |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |
| created_from_ai | boolean | YES | false | — |
| quantity | numeric(12,2) | YES | — | — |
| source | character varying(200) | YES | — | — |
| as_of_date | date | YES | — | — |

**Indexes:**
- `core_unit_cost_item_pkey` — `CREATE UNIQUE INDEX core_unit_cost_item_pkey ON landscape.core_unit_cost_item USING btree (item_id)`
- `core_unit_cost_template_unique` — `CREATE UNIQUE INDEX core_unit_cost_template_unique ON landscape.core_unit_cost_item USING btree (category_id, item_name, default_uom_code, project_type_code, market_geography)`
- `idx_unit_cost_item_active` — `CREATE INDEX idx_unit_cost_item_active ON landscape.core_unit_cost_item USING btree (is_active)`
- `idx_unit_cost_item_category` — `CREATE INDEX idx_unit_cost_item_category ON landscape.core_unit_cost_item USING btree (category_id)`
- `idx_unit_cost_item_project_type` — `CREATE INDEX idx_unit_cost_item_project_type ON landscape.core_unit_cost_item USING btree (project_type_code)`
- `idx_unit_cost_template_category_active` — `CREATE INDEX idx_unit_cost_template_category_active ON landscape.core_unit_cost_item USING btree (category_id, is_active)`
- `idx_unit_cost_template_geography` — `CREATE INDEX idx_unit_cost_template_geography ON landscape.core_unit_cost_item USING btree (market_geography)`
- `idx_unit_cost_template_name` — `CREATE INDEX idx_unit_cost_template_name ON landscape.core_unit_cost_item USING btree (item_name)`
- `idx_unit_cost_template_search` — `CREATE INDEX idx_unit_cost_template_search ON landscape.core_unit_cost_item USING gin (to_tsvector('simple'::regconfig, (item_name)::text))`

**Check Constraints:**
- `CHECK (((project_type_code)::text = ANY ((ARRAY['DEV'::character varying, 'MF'::character varying, 'OFF'::character varying, 'RET'::character varying, 'IND'::character varying, 'HTL'::character varying, 'MXU'::character varying])::text[])))`

## core_workspace_member
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| workspace_id | bigint | NO | — | dms_workspaces.workspace_id |
| user_id | bigint | NO | — | — |
| role | character varying(50) | NO | — | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `core_workspace_member_pkey` — `CREATE UNIQUE INDEX core_workspace_member_pkey ON landscape.core_workspace_member USING btree (workspace_id, user_id)`
- `idx_workspace_member_user` — `CREATE INDEX idx_workspace_member_user ON landscape.core_workspace_member USING btree (user_id)`

**Check Constraints:**
- `CHECK (((role)::text = ANY ((ARRAY['viewer'::character varying, 'contributor'::character varying, 'manager'::character varying, 'admin'::character varying])::text[])))`

## Group: bmk_

## bmk_absorption_velocity
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| absorption_velocity_id | bigint | NO | nextval('bmk_absorption_velocity_absorption_velocity_id_seq'::regclass) | — |
| benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| velocity_annual | integer | NO | — | — |
| market_geography | character varying(100) | YES | — | — |
| project_scale | character varying(20) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `bmk_absorption_velocity_pkey` — `CREATE UNIQUE INDEX bmk_absorption_velocity_pkey ON landscape.bmk_absorption_velocity USING btree (absorption_velocity_id)`
- `idx_bmk_absorption_benchmark` — `CREATE INDEX idx_bmk_absorption_benchmark ON landscape.bmk_absorption_velocity USING btree (benchmark_id)`
- `idx_bmk_absorption_geography` — `CREATE INDEX idx_bmk_absorption_geography ON landscape.bmk_absorption_velocity USING btree (market_geography)`

## bmk_builder_communities
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('bmk_builder_communities_id_seq'::regclass) | — |
| source | character varying(32) | NO | — | — |
| source_id | character varying(64) | NO | — | — |
| builder_name | character varying(128) | NO | — | — |
| community_name | character varying(256) | NO | — | — |
| market_label | character varying(64) | YES | — | — |
| city | character varying(64) | YES | — | — |
| state | character(2) | YES | — | — |
| zip_code | character varying(10) | YES | — | — |
| lat | numeric(10,7) | YES | — | — |
| lng | numeric(10,7) | YES | — | — |
| price_min | integer | YES | — | — |
| price_max | integer | YES | — | — |
| sqft_min | integer | YES | — | — |
| sqft_max | integer | YES | — | — |
| beds_min | smallint | YES | — | — |
| beds_max | smallint | YES | — | — |
| baths_min | numeric(3,1) | YES | — | — |
| baths_max | numeric(3,1) | YES | — | — |
| hoa_monthly | integer | YES | — | — |
| product_types | character varying(256) | YES | — | — |
| plan_count | smallint | YES | — | — |
| inventory_count | smallint | YES | — | — |
| source_url | text | YES | — | — |
| first_seen_at | timestamp with time zone | NO | now() | — |
| last_seen_at | timestamp with time zone | NO | now() | — |
| ingested_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `bmk_builder_communities_pkey` — `CREATE UNIQUE INDEX bmk_builder_communities_pkey ON landscape.bmk_builder_communities USING btree (id)`
- `bmk_builder_communities_source_source_id_key` — `CREATE UNIQUE INDEX bmk_builder_communities_source_source_id_key ON landscape.bmk_builder_communities USING btree (source, source_id)`
- `idx_bmk_communities_builder` — `CREATE INDEX idx_bmk_communities_builder ON landscape.bmk_builder_communities USING btree (builder_name)`
- `idx_bmk_communities_city_state` — `CREATE INDEX idx_bmk_communities_city_state ON landscape.bmk_builder_communities USING btree (city, state)`
- `idx_bmk_communities_geo` — `CREATE INDEX idx_bmk_communities_geo ON landscape.bmk_builder_communities USING btree (lat, lng) WHERE (lat IS NOT NULL)`
- `idx_bmk_communities_last_seen` — `CREATE INDEX idx_bmk_communities_last_seen ON landscape.bmk_builder_communities USING btree (last_seen_at)`
- `idx_bmk_communities_market` — `CREATE INDEX idx_bmk_communities_market ON landscape.bmk_builder_communities USING btree (market_label)`
- `idx_bmk_communities_price_range` — `CREATE INDEX idx_bmk_communities_price_range ON landscape.bmk_builder_communities USING btree (price_min, price_max) WHERE (price_min IS NOT NULL)`

## bmk_builder_inventory
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('bmk_builder_inventory_id_seq'::regclass) | — |
| source | character varying(32) | NO | — | — |
| source_id | character varying(64) | NO | — | — |
| community_source_id | character varying(64) | YES | — | — |
| plan_source_id | character varying(64) | YES | — | — |
| address_line1 | character varying(256) | YES | — | — |
| city | character varying(64) | YES | — | — |
| state | character(2) | YES | — | — |
| zip_code | character varying(10) | YES | — | — |
| lat | numeric(10,7) | YES | — | — |
| lng | numeric(10,7) | YES | — | — |
| status | character varying(32) | YES | — | — |
| price_current | integer | YES | — | — |
| price_original | integer | YES | — | — |
| sqft_actual | integer | YES | — | — |
| beds_actual | smallint | YES | — | — |
| baths_actual | numeric(3,1) | YES | — | — |
| lot_sqft | integer | YES | — | — |
| move_in_date | date | YES | — | — |
| source_url | text | YES | — | — |
| first_seen_at | timestamp with time zone | NO | now() | — |
| last_seen_at | timestamp with time zone | NO | now() | — |
| ingested_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `bmk_builder_inventory_pkey` — `CREATE UNIQUE INDEX bmk_builder_inventory_pkey ON landscape.bmk_builder_inventory USING btree (id)`
- `bmk_builder_inventory_source_source_id_key` — `CREATE UNIQUE INDEX bmk_builder_inventory_source_source_id_key ON landscape.bmk_builder_inventory USING btree (source, source_id)`
- `idx_bmk_inventory_city_state` — `CREATE INDEX idx_bmk_inventory_city_state ON landscape.bmk_builder_inventory USING btree (city, state)`
- `idx_bmk_inventory_community` — `CREATE INDEX idx_bmk_inventory_community ON landscape.bmk_builder_inventory USING btree (source, community_source_id)`
- `idx_bmk_inventory_geo` — `CREATE INDEX idx_bmk_inventory_geo ON landscape.bmk_builder_inventory USING btree (lat, lng) WHERE (lat IS NOT NULL)`
- `idx_bmk_inventory_last_seen` — `CREATE INDEX idx_bmk_inventory_last_seen ON landscape.bmk_builder_inventory USING btree (last_seen_at)`
- `idx_bmk_inventory_move_in` — `CREATE INDEX idx_bmk_inventory_move_in ON landscape.bmk_builder_inventory USING btree (move_in_date) WHERE (move_in_date IS NOT NULL)`
- `idx_bmk_inventory_price` — `CREATE INDEX idx_bmk_inventory_price ON landscape.bmk_builder_inventory USING btree (price_current) WHERE (price_current IS NOT NULL)`
- `idx_bmk_inventory_status` — `CREATE INDEX idx_bmk_inventory_status ON landscape.bmk_builder_inventory USING btree (status)`

## bmk_builder_plans
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('bmk_builder_plans_id_seq'::regclass) | — |
| source | character varying(32) | NO | — | — |
| source_id | character varying(64) | NO | — | — |
| community_source_id | character varying(64) | NO | — | — |
| plan_name | character varying(128) | NO | — | — |
| series_name | character varying(64) | YES | — | — |
| product_type | character varying(32) | YES | — | — |
| base_price | integer | YES | — | — |
| sqft_min | integer | YES | — | — |
| sqft_max | integer | YES | — | — |
| beds_min | smallint | YES | — | — |
| beds_max | smallint | YES | — | — |
| baths_min | numeric(3,1) | YES | — | — |
| baths_max | numeric(3,1) | YES | — | — |
| garage_spaces | smallint | YES | — | — |
| stories | smallint | YES | — | — |
| source_url | text | YES | — | — |
| first_seen_at | timestamp with time zone | NO | now() | — |
| last_seen_at | timestamp with time zone | NO | now() | — |
| ingested_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `bmk_builder_plans_pkey` — `CREATE UNIQUE INDEX bmk_builder_plans_pkey ON landscape.bmk_builder_plans USING btree (id)`
- `bmk_builder_plans_source_source_id_key` — `CREATE UNIQUE INDEX bmk_builder_plans_source_source_id_key ON landscape.bmk_builder_plans USING btree (source, source_id)`
- `idx_bmk_plans_base_price` — `CREATE INDEX idx_bmk_plans_base_price ON landscape.bmk_builder_plans USING btree (base_price) WHERE (base_price IS NOT NULL)`
- `idx_bmk_plans_community` — `CREATE INDEX idx_bmk_plans_community ON landscape.bmk_builder_plans USING btree (source, community_source_id)`
- `idx_bmk_plans_last_seen` — `CREATE INDEX idx_bmk_plans_last_seen ON landscape.bmk_builder_plans USING btree (last_seen_at)`
- `idx_bmk_plans_product_type` — `CREATE INDEX idx_bmk_plans_product_type ON landscape.bmk_builder_plans USING btree (product_type)`
- `idx_bmk_plans_sqft` — `CREATE INDEX idx_bmk_plans_sqft ON landscape.bmk_builder_plans USING btree (sqft_min, sqft_max) WHERE (sqft_min IS NOT NULL)`

## bmk_resale_closings
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('bmk_resale_closings_id_seq'::regclass) | — |
| source | character varying(32) | NO | — | — |
| source_id | character varying(64) | NO | — | — |
| sale_price | integer | NO | — | — |
| sale_date | date | NO | — | — |
| address_line1 | character varying(256) | YES | — | — |
| city | character varying(64) | YES | — | — |
| state | character(2) | YES | — | — |
| zip_code | character varying(10) | YES | — | — |
| lat | numeric(10,7) | YES | — | — |
| lng | numeric(10,7) | YES | — | — |
| property_type | character varying(32) | YES | — | — |
| list_price | integer | YES | — | — |
| list_date | date | YES | — | — |
| days_on_market | smallint | YES | — | — |
| sqft | integer | YES | — | — |
| lot_sqft | integer | YES | — | — |
| price_per_sqft | integer | YES | — | — |
| year_built | smallint | YES | — | — |
| beds | smallint | YES | — | — |
| baths | numeric(3,1) | YES | — | — |
| builder_name | character varying(128) | YES | — | — |
| subdivision_name | character varying(256) | YES | — | — |
| source_url | text | YES | — | — |
| first_seen_at | timestamp with time zone | NO | now() | — |
| last_seen_at | timestamp with time zone | NO | now() | — |
| ingested_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `bmk_resale_closings_pkey` — `CREATE UNIQUE INDEX bmk_resale_closings_pkey ON landscape.bmk_resale_closings USING btree (id)`
- `bmk_resale_closings_source_source_id_key` — `CREATE UNIQUE INDEX bmk_resale_closings_source_source_id_key ON landscape.bmk_resale_closings USING btree (source, source_id)`
- `idx_bmk_resale_closings_geo` — `CREATE INDEX idx_bmk_resale_closings_geo ON landscape.bmk_resale_closings USING btree (lat, lng)`
- `idx_bmk_resale_closings_location` — `CREATE INDEX idx_bmk_resale_closings_location ON landscape.bmk_resale_closings USING btree (city, state)`
- `idx_bmk_resale_closings_sale_date` — `CREATE INDEX idx_bmk_resale_closings_sale_date ON landscape.bmk_resale_closings USING btree (sale_date DESC)`
- `idx_bmk_resale_closings_source` — `CREATE INDEX idx_bmk_resale_closings_source ON landscape.bmk_resale_closings USING btree (source)`
- `idx_bmk_resale_closings_year_built` — `CREATE INDEX idx_bmk_resale_closings_year_built ON landscape.bmk_resale_closings USING btree (year_built)`

## Group: lu_

## lu_acreage_allocation_type
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| allocation_type_id | integer | NO | nextval('lu_acreage_allocation_type_allocation_type_id_seq'::regclass) | — |
| allocation_type_code | character varying(50) | NO | — | — |
| allocation_type_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| is_developable | boolean | YES | false | — |
| sort_order | integer | YES | 0 | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `lu_acreage_allocation_type_allocation_type_code_key` — `CREATE UNIQUE INDEX lu_acreage_allocation_type_allocation_type_code_key ON landscape.lu_acreage_allocation_type USING btree (allocation_type_code)`
- `lu_acreage_allocation_type_pkey` — `CREATE UNIQUE INDEX lu_acreage_allocation_type_pkey ON landscape.lu_acreage_allocation_type USING btree (allocation_type_id)`

## lu_com_spec
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| com_spec_id | bigint | NO | — | — |
| type_id | bigint | NO | — | lu_type.type_id |
| far_min | numeric(6,2) | YES | — | — |
| far_max | numeric(6,2) | YES | — | — |
| cov_max_pct | numeric(5,2) | YES | — | — |
| pk_per_ksf | numeric(5,2) | YES | — | — |
| hgt_max_ft | numeric(6,2) | YES | — | — |
| sb_front_ft | numeric(6,2) | YES | — | — |
| sb_side_ft | numeric(6,2) | YES | — | — |
| sb_corner_ft | numeric(6,2) | YES | — | — |
| sb_rear_ft | numeric(6,2) | YES | — | — |
| os_min_pct | numeric(5,2) | YES | — | — |
| notes | text | YES | — | — |
| eff_date | date | YES | — | — |
| doc_id | bigint | YES | — | planning_doc.doc_id |

**Indexes:**
- `lu_com_spec_pkey` — `CREATE UNIQUE INDEX lu_com_spec_pkey ON landscape.lu_com_spec USING btree (com_spec_id)`

**Check Constraints:**
- `CHECK (((cov_max_pct >= (0)::numeric) AND (cov_max_pct <= (100)::numeric)))`
- `CHECK (((os_min_pct >= (0)::numeric) AND (os_min_pct <= (100)::numeric)))`

## lu_family
**Row Count (estimated):** 6
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| family_id | bigint | NO | — | — |
| code | text | NO | — | — |
| name | text | NO | — | — |
| active | boolean | NO | true | — |
| notes | text | YES | — | — |

**Indexes:**
- `idx_lu_family_active` — `CREATE INDEX idx_lu_family_active ON landscape.lu_family USING btree (active)`
- `lu_family_code_key` — `CREATE UNIQUE INDEX lu_family_code_key ON landscape.lu_family USING btree (code)`
- `lu_family_pkey` — `CREATE UNIQUE INDEX lu_family_pkey ON landscape.lu_family USING btree (family_id)`

## lu_lease_status
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| status_code | character varying(50) | NO | — | — |
| status_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| affects_occupancy | boolean | YES | true | — |
| display_order | integer | YES | — | — |

**Indexes:**
- `lu_lease_status_pkey` — `CREATE UNIQUE INDEX lu_lease_status_pkey ON landscape.lu_lease_status USING btree (status_code)`

## lu_lease_type
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| type_code | character varying(50) | NO | — | — |
| type_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| display_order | integer | YES | — | — |

**Indexes:**
- `lu_lease_type_pkey` — `CREATE UNIQUE INDEX lu_lease_type_pkey ON landscape.lu_lease_type USING btree (type_code)`

## lu_market
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| market_id | integer | NO | nextval('lu_market_market_id_seq'::regclass) | — |
| market_code | character varying(50) | NO | — | — |
| market_name | character varying(200) | NO | — | — |
| state | character varying(2) | YES | — | — |
| is_active | boolean | YES | true | — |

**Indexes:**
- `lu_market_market_code_key` — `CREATE UNIQUE INDEX lu_market_market_code_key ON landscape.lu_market USING btree (market_code)`
- `lu_market_pkey` — `CREATE UNIQUE INDEX lu_market_pkey ON landscape.lu_market USING btree (market_id)`

## lu_media_classification
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| classification_id | integer | NO | nextval('lu_media_classification_classification_id_seq'::regclass) | — |
| classification_code | character varying(50) | NO | — | — |
| classification_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| badge_color | character varying(20) | NO | — | — |
| badge_icon | character varying(50) | YES | — | — |
| sort_order | integer | NO | 0 | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |
| content_intent | character varying(20) | YES | — | — |
| default_action | character varying(20) | YES | — | — |

**Indexes:**
- `lu_media_classification_classification_code_key` — `CREATE UNIQUE INDEX lu_media_classification_classification_code_key ON landscape.lu_media_classification USING btree (classification_code)`
- `lu_media_classification_pkey` — `CREATE UNIQUE INDEX lu_media_classification_pkey ON landscape.lu_media_classification USING btree (classification_id)`

**Check Constraints:**
- `CHECK (((content_intent)::text = ANY ((ARRAY['visual_asset'::character varying, 'data_source'::character varying, 'hybrid'::character varying, 'decoration'::character varying, 'unknown'::character varying])::text[])))`
- `CHECK (((default_action)::text = ANY ((ARRAY['save_image'::character varying, 'extract_data'::character varying, 'both'::character varying, 'ignore'::character varying])::text[])))`

## lu_picklist_display_config
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| config_id | integer | NO | nextval('lu_picklist_display_config_config_id_seq'::regclass) | — |
| list_code | character varying(50) | NO | — | — |
| context | character varying(50) | NO | — | — |
| display_format | character varying(20) | NO | — | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `lu_picklist_display_config_list_code_context_key` — `CREATE UNIQUE INDEX lu_picklist_display_config_list_code_context_key ON landscape.lu_picklist_display_config USING btree (list_code, context)`
- `lu_picklist_display_config_pkey` — `CREATE UNIQUE INDEX lu_picklist_display_config_pkey ON landscape.lu_picklist_display_config USING btree (config_id)`

## lu_property_subtype
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| subtype_id | integer | NO | nextval('lu_property_subtype_subtype_id_seq'::regclass) | — |
| property_type_code | character varying(10) | NO | — | — |
| subtype_code | character varying(50) | NO | — | — |
| subtype_name | character varying(100) | NO | — | — |
| sort_order | integer | YES | 0 | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `lu_property_subtype_pkey` — `CREATE UNIQUE INDEX lu_property_subtype_pkey ON landscape.lu_property_subtype USING btree (subtype_id)`
- `lu_property_subtype_property_type_code_subtype_code_key` — `CREATE UNIQUE INDEX lu_property_subtype_property_type_code_subtype_code_key ON landscape.lu_property_subtype USING btree (property_type_code, subtype_code)`

## lu_recovery_structure
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| structure_code | character varying(50) | NO | — | — |
| structure_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| display_order | integer | YES | — | — |

**Indexes:**
- `lu_recovery_structure_pkey` — `CREATE UNIQUE INDEX lu_recovery_structure_pkey ON landscape.lu_recovery_structure USING btree (structure_code)`

## lu_res_spec
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| res_spec_id | bigint | NO | — | — |
| type_id | bigint | NO | — | lu_type.type_id |
| dua_min | numeric(6,2) | YES | — | — |
| dua_max | numeric(6,2) | YES | — | — |
| lot_w_min_ft | numeric(6,2) | YES | — | — |
| lot_d_min_ft | numeric(6,2) | YES | — | — |
| lot_area_min_sf | numeric(10,2) | YES | — | — |
| sb_front_ft | numeric(6,2) | YES | — | — |
| sb_side_ft | numeric(6,2) | YES | — | — |
| sb_corner_ft | numeric(6,2) | YES | — | — |
| sb_rear_ft | numeric(6,2) | YES | — | — |
| hgt_max_ft | numeric(6,2) | YES | — | — |
| cov_max_pct | numeric(5,2) | YES | — | — |
| os_min_pct | numeric(5,2) | YES | — | — |
| pk_per_unit | numeric(4,2) | YES | — | — |
| notes | text | YES | — | — |
| eff_date | date | YES | — | — |
| doc_id | bigint | YES | — | planning_doc.doc_id |

**Indexes:**
- `lu_res_spec_pkey` — `CREATE UNIQUE INDEX lu_res_spec_pkey ON landscape.lu_res_spec USING btree (res_spec_id)`

**Check Constraints:**
- `CHECK (((cov_max_pct >= (0)::numeric) AND (cov_max_pct <= (100)::numeric)))`
- `CHECK (((os_min_pct >= (0)::numeric) AND (os_min_pct <= (100)::numeric)))`

## lu_subtype
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| subtype_id | integer | NO | nextval('lu_subtype_subtype_id_seq1'::regclass) | — |
| family_id | integer | YES | — | lu_family.family_id |
| code | character varying(20) | NO | — | — |
| name | character varying(100) | NO | — | — |
| ord | integer | YES | 0 | — |
| active | boolean | YES | true | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `lu_subtype_family_id_code_key` — `CREATE UNIQUE INDEX lu_subtype_family_id_code_key ON landscape.lu_subtype USING btree (family_id, code)`
- `lu_subtype_pkey1` — `CREATE UNIQUE INDEX lu_subtype_pkey1 ON landscape.lu_subtype USING btree (subtype_id)`

## lu_type
**Row Count (estimated):** 34
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| type_id | bigint | NO | — | — |
| family_id | bigint | NO | — | lu_family.family_id |
| code | text | NO | — | — |
| name | text | NO | — | — |
| ord | integer | YES | — | — |
| active | boolean | NO | true | — |
| notes | text | YES | — | — |

**Indexes:**
- `idx_lu_subtype_active` — `CREATE INDEX idx_lu_subtype_active ON landscape.lu_type USING btree (active)`
- `idx_lu_subtype_family` — `CREATE INDEX idx_lu_subtype_family ON landscape.lu_type USING btree (family_id)`
- `lu_subtype_code_key` — `CREATE UNIQUE INDEX lu_subtype_code_key ON landscape.lu_type USING btree (code)`
- `lu_subtype_pkey` — `CREATE UNIQUE INDEX lu_subtype_pkey ON landscape.lu_type USING btree (type_id)`

## Group: dms_

## dms_assertion
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| assertion_id | integer | NO | nextval('dms_assertion_assertion_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| doc_id | text | NO | — | — |
| subject_type | character varying(50) | NO | — | — |
| subject_ref | text | YES | — | — |
| metric_key | text | NO | — | — |
| value_num | numeric(15,4) | YES | — | — |
| value_text | text | YES | — | — |
| units | text | YES | — | — |
| context | character varying(50) | YES | — | — |
| page | integer | YES | — | — |
| bbox | ARRAY | YES | — | — |
| confidence | numeric(3,2) | NO | 0.95 | — |
| source | character varying(50) | YES | — | — |
| as_of_date | date | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `dms_assertion_pkey` — `CREATE UNIQUE INDEX dms_assertion_pkey ON landscape.dms_assertion USING btree (assertion_id)`
- `idx_assertion_as_of_date` — `CREATE INDEX idx_assertion_as_of_date ON landscape.dms_assertion USING btree (as_of_date)`
- `idx_assertion_doc_id` — `CREATE INDEX idx_assertion_doc_id ON landscape.dms_assertion USING btree (doc_id)`
- `idx_assertion_metric_key` — `CREATE INDEX idx_assertion_metric_key ON landscape.dms_assertion USING btree (metric_key)`
- `idx_assertion_project_id` — `CREATE INDEX idx_assertion_project_id ON landscape.dms_assertion USING btree (project_id)`
- `idx_assertion_subject_type` — `CREATE INDEX idx_assertion_subject_type ON landscape.dms_assertion USING btree (subject_type)`

**Check Constraints:**
- `CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))`
- `CHECK (((value_num IS NOT NULL) OR (value_text IS NOT NULL)))`

## dms_attributes
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| attr_id | bigint | NO | nextval('dms_attributes_attr_id_seq'::regclass) | — |
| attr_key | character varying(100) | NO | — | — |
| attr_name | character varying(255) | NO | — | — |
| attr_type | character varying(50) | NO | — | — |
| attr_description | text | YES | — | — |
| is_required | boolean | YES | false | — |
| is_searchable | boolean | YES | true | — |
| validation_rules | jsonb | YES | '{}'::jsonb | — |
| enum_values | jsonb | YES | — | — |
| lookup_table | character varying(100) | YES | NULL::character varying | — |
| display_order | integer | YES | 0 | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `dms_attributes_attr_key_key` — `CREATE UNIQUE INDEX dms_attributes_attr_key_key ON landscape.dms_attributes USING btree (attr_key)`
- `dms_attributes_pkey` — `CREATE UNIQUE INDEX dms_attributes_pkey ON landscape.dms_attributes USING btree (attr_id)`

**Check Constraints:**
- `CHECK (((attr_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'date'::character varying, 'boolean'::character varying, 'currency'::character varying, 'enum'::character varying, 'lookup'::character varying, 'tags'::character varying, 'json'::character varying])::text[])))`

## dms_extract_queue
**Row Count (estimated):** 33
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| queue_id | bigint | NO | nextval('dms_extract_queue_queue_id_seq'::regclass) | — |
| doc_id | bigint | YES | — | core_doc.doc_id |
| extract_type | character varying(50) | NO | 'ocr'::character varying | — |
| priority | integer | YES | 0 | — |
| status | character varying(50) | YES | 'pending'::character varying | — |
| attempts | integer | YES | 0 | — |
| max_attempts | integer | YES | 3 | — |
| error_message | text | YES | — | — |
| extracted_data | jsonb | YES | '{}'::jsonb | — |
| created_at | timestamp with time zone | YES | now() | — |
| processed_at | timestamp with time zone | YES | — | — |
| review_status | character varying(50) | YES | 'pending'::character varying | — |
| overall_confidence | numeric(5,4) | YES | 0.0 | — |
| committed_at | timestamp without time zone | YES | — | — |
| commit_notes | text | YES | — | — |
| extracted_text | text | YES | — | — |

**Indexes:**
- `dms_extract_queue_pkey` — `CREATE UNIQUE INDEX dms_extract_queue_pkey ON landscape.dms_extract_queue USING btree (queue_id)`
- `idx_extract_queue_created_at` — `CREATE INDEX idx_extract_queue_created_at ON landscape.dms_extract_queue USING btree (created_at)`
- `idx_extract_queue_doc_id` — `CREATE INDEX idx_extract_queue_doc_id ON landscape.dms_extract_queue USING btree (doc_id)`
- `idx_extract_queue_status` — `CREATE INDEX idx_extract_queue_status ON landscape.dms_extract_queue USING btree (status)`

**Check Constraints:**
- `CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))`

## dms_profile_audit
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| audit_id | bigint | NO | nextval('dms_profile_audit_audit_id_seq'::regclass) | — |
| doc_id | bigint | YES | — | core_doc.doc_id |
| changed_by | bigint | YES | — | — |
| change_type | character varying(50) | NO | 'profile_update'::character varying | — |
| old_profile_json | jsonb | YES | '{}'::jsonb | — |
| new_profile_json | jsonb | YES | '{}'::jsonb | — |
| changed_fields | ARRAY | YES | '{}'::text[] | — |
| change_reason | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `dms_profile_audit_pkey` — `CREATE UNIQUE INDEX dms_profile_audit_pkey ON landscape.dms_profile_audit USING btree (audit_id)`

## dms_template_attributes
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| template_id | bigint | NO | — | dms_templates.template_id |
| attr_id | bigint | NO | — | dms_attributes.attr_id |
| is_required | boolean | YES | false | — |
| default_value | jsonb | YES | — | — |
| display_order | integer | YES | 0 | — |

**Indexes:**
- `dms_template_attributes_pkey` — `CREATE UNIQUE INDEX dms_template_attributes_pkey ON landscape.dms_template_attributes USING btree (template_id, attr_id)`

## dms_templates
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| template_id | bigint | NO | nextval('dms_templates_template_id_seq'::regclass) | — |
| template_name | character varying(255) | NO | — | — |
| workspace_id | bigint | YES | — | dms_workspaces.workspace_id |
| project_id | bigint | YES | — | tbl_project.project_id |
| doc_type | character varying(100) | YES | — | — |
| is_default | boolean | YES | false | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| doc_type_options | ARRAY | YES | — | — |
| description | text | YES | — | — |

**Indexes:**
- `dms_templates_pkey` — `CREATE UNIQUE INDEX dms_templates_pkey ON landscape.dms_templates USING btree (template_id)`

## dms_unmapped
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| unmapped_id | integer | NO | nextval('dms_unmapped_unmapped_id_seq'::regclass) | — |
| doc_id | text | NO | — | — |
| project_id | integer | YES | — | tbl_project.project_id |
| source_key | text | NO | — | — |
| raw_value | text | YES | — | — |
| candidate_targets | ARRAY | YES | — | — |
| page | integer | YES | — | — |
| bbox | ARRAY | YES | — | — |
| status | character varying(50) | NO | 'new'::character varying | — |
| mapped_to_table | text | YES | — | — |
| mapped_to_column | text | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| reviewed_at | timestamp with time zone | YES | — | — |
| reviewed_by | text | YES | — | — |

**Indexes:**
- `dms_unmapped_pkey` — `CREATE UNIQUE INDEX dms_unmapped_pkey ON landscape.dms_unmapped USING btree (unmapped_id)`
- `idx_unmapped_doc_id` — `CREATE INDEX idx_unmapped_doc_id ON landscape.dms_unmapped USING btree (doc_id)`
- `idx_unmapped_project_id` — `CREATE INDEX idx_unmapped_project_id ON landscape.dms_unmapped USING btree (project_id)`
- `idx_unmapped_source_key` — `CREATE INDEX idx_unmapped_source_key ON landscape.dms_unmapped USING btree (source_key)`
- `idx_unmapped_status` — `CREATE INDEX idx_unmapped_status ON landscape.dms_unmapped USING btree (status)`

## dms_workspaces
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| workspace_id | bigint | NO | nextval('dms_workspaces_workspace_id_seq'::regclass) | — |
| workspace_code | character varying(50) | NO | — | — |
| workspace_name | character varying(255) | NO | — | — |
| description | text | YES | — | — |
| is_default | boolean | YES | false | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `dms_workspaces_pkey` — `CREATE UNIQUE INDEX dms_workspaces_pkey ON landscape.dms_workspaces USING btree (workspace_id)`
- `dms_workspaces_workspace_code_key` — `CREATE UNIQUE INDEX dms_workspaces_workspace_code_key ON landscape.dms_workspaces USING btree (workspace_code)`

## Group: ai_

## ai_correction_log
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('ai_correction_log_id_seq'::regclass) | — |
| queue_id | bigint | NO | — | dms_extract_queue.queue_id |
| field_path | character varying(255) | NO | — | — |
| ai_value | text | YES | — | — |
| user_value | text | YES | — | — |
| ai_confidence | numeric(5,4) | YES | — | — |
| correction_type | character varying(50) | YES | 'value_wrong'::character varying | — |
| page_number | integer | YES | — | — |
| source_quote | text | YES | — | — |
| user_notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `ai_correction_log_pkey` — `CREATE UNIQUE INDEX ai_correction_log_pkey ON landscape.ai_correction_log USING btree (id)`
- `idx_correction_log_correction_type` — `CREATE INDEX idx_correction_log_correction_type ON landscape.ai_correction_log USING btree (correction_type)`
- `idx_correction_log_created_at` — `CREATE INDEX idx_correction_log_created_at ON landscape.ai_correction_log USING btree (created_at)`
- `idx_correction_log_field_path` — `CREATE INDEX idx_correction_log_field_path ON landscape.ai_correction_log USING btree (field_path)`
- `idx_correction_log_queue_id` — `CREATE INDEX idx_correction_log_queue_id ON landscape.ai_correction_log USING btree (queue_id)`

## ai_debug_log
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('ai_debug_log_id_seq'::regclass) | — |
| log_type | character varying(50) | YES | — | — |
| payload | jsonb | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `ai_debug_log_pkey` — `CREATE UNIQUE INDEX ai_debug_log_pkey ON landscape.ai_debug_log USING btree (id)`

## ai_extraction_staging
**Row Count (estimated):** 1164
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| extraction_id | integer | NO | nextval('ai_extraction_staging_extraction_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| doc_id | bigint | YES | — | core_doc.doc_id |
| target_table | character varying(100) | NO | — | — |
| target_field | character varying(100) | YES | — | — |
| extracted_value | jsonb | NO | — | — |
| extraction_type | character varying(50) | NO | — | — |
| source_text | text | YES | — | — |
| confidence_score | numeric(3,2) | YES | — | — |
| status | character varying(20) | YES | 'pending'::character varying | — |
| validated_value | jsonb | YES | — | — |
| validated_by | text | YES | — | — |
| validated_at | timestamp without time zone | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| created_by | text | YES | 'landscaper'::text | — |
| field_key | character varying(100) | YES | — | — |
| property_type | character varying(50) | YES | — | — |
| db_write_type | character varying(50) | YES | — | — |
| selector_json | jsonb | YES | — | — |
| scope | character varying(50) | YES | — | — |
| scope_id | bigint | YES | — | — |
| source_page | integer | YES | — | — |
| source_snippet | text | YES | — | — |
| conflict_with_extraction_id | bigint | YES | — | — |
| rejection_reason | text | YES | — | — |
| scope_label | character varying(100) | YES | — | — |
| array_index | integer | YES | — | — |

**Indexes:**
- `ai_extraction_staging_pkey` — `CREATE UNIQUE INDEX ai_extraction_staging_pkey ON landscape.ai_extraction_staging USING btree (extraction_id)`
- `idx_extraction_staging_doc` — `CREATE INDEX idx_extraction_staging_doc ON landscape.ai_extraction_staging USING btree (doc_id)`
- `idx_extraction_staging_project` — `CREATE INDEX idx_extraction_staging_project ON landscape.ai_extraction_staging USING btree (project_id, status)`
- `idx_staging_field_key` — `CREATE INDEX idx_staging_field_key ON landscape.ai_extraction_staging USING btree (field_key)`
- `idx_staging_property_type` — `CREATE INDEX idx_staging_property_type ON landscape.ai_extraction_staging USING btree (property_type)`
- `idx_staging_scope` — `CREATE INDEX idx_staging_scope ON landscape.ai_extraction_staging USING btree (scope)`
- `idx_staging_unique_pending` — `CREATE UNIQUE INDEX idx_staging_unique_pending ON landscape.ai_extraction_staging USING btree (project_id, field_key, COALESCE(scope_label, ''::character varying), COALESCE(array_index, 0)) WHERE ((status)::text = 'pending'::text)`

## ai_extraction_warnings
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('ai_extraction_warnings_id_seq'::regclass) | — |
| queue_id | bigint | NO | — | dms_extract_queue.queue_id |
| field_path | character varying(255) | NO | — | — |
| warning_type | character varying(50) | NO | — | — |
| severity | character varying(20) | YES | 'warning'::character varying | — |
| message | text | NO | — | — |
| suggested_value | text | YES | — | — |
| user_action | character varying(50) | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `ai_extraction_warnings_pkey` — `CREATE UNIQUE INDEX ai_extraction_warnings_pkey ON landscape.ai_extraction_warnings USING btree (id)`
- `idx_extraction_warnings_created_at` — `CREATE INDEX idx_extraction_warnings_created_at ON landscape.ai_extraction_warnings USING btree (created_at)`
- `idx_extraction_warnings_queue_id` — `CREATE INDEX idx_extraction_warnings_queue_id ON landscape.ai_extraction_warnings USING btree (queue_id)`
- `idx_extraction_warnings_severity` — `CREATE INDEX idx_extraction_warnings_severity ON landscape.ai_extraction_warnings USING btree (severity)`

## ai_ingestion_history
**Row Count (estimated):** 95
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| ingestion_id | integer | NO | nextval('ai_ingestion_history_ingestion_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| package_name | character varying(255) | NO | — | — |
| documents | jsonb | YES | — | — |
| ai_analysis | jsonb | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| created_by | character varying(100) | YES | — | — |

**Indexes:**
- `ai_ingestion_history_pkey` — `CREATE UNIQUE INDEX ai_ingestion_history_pkey ON landscape.ai_ingestion_history USING btree (ingestion_id)`

## ai_review_history
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| review_id | integer | NO | nextval('ai_review_history_review_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| action_type | character varying(50) | NO | — | — |
| field_updates | jsonb | YES | — | — |
| user_feedback | text | YES | — | — |
| ai_confidence | numeric(3,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| created_by | character varying(100) | YES | — | — |

**Indexes:**
- `ai_review_history_pkey` — `CREATE UNIQUE INDEX ai_review_history_pkey ON landscape.ai_review_history USING btree (review_id)`
- `idx_ai_review_history_action_type` — `CREATE INDEX idx_ai_review_history_action_type ON landscape.ai_review_history USING btree (action_type)`
- `idx_ai_review_history_created_at` — `CREATE INDEX idx_ai_review_history_created_at ON landscape.ai_review_history USING btree (created_at)`
- `idx_ai_review_history_project_id` — `CREATE INDEX idx_ai_review_history_project_id ON landscape.ai_review_history USING btree (project_id)`

## Group: knowledge_

## knowledge_embeddings
**Row Count (estimated):** 1408
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| embedding_id | bigint | NO | — | — |
| source_type | character varying(50) | NO | — | — |
| source_id | bigint | NO | — | — |
| content_text | text | NO | — | — |
| embedding | USER-DEFINED | YES | — | — |
| entity_ids | ARRAY | NO | — | — |
| tags | ARRAY | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| source_version | integer | YES | 1 | — |
| superseded_by_version | integer | YES | — | — |

**Indexes:**
- `idx_embedding_vector` — `CREATE INDEX idx_embedding_vector ON landscape.knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists='10')`
- `idx_embeddings_active` — `CREATE INDEX idx_embeddings_active ON landscape.knowledge_embeddings USING btree (source_id, source_type) WHERE (superseded_by_version IS NULL)`
- `knowledge_e_source__f8627b_idx` — `CREATE INDEX knowledge_e_source__f8627b_idx ON landscape.knowledge_embeddings USING btree (source_type, source_id)`
- `knowledge_embeddings_created_at_b0e6da24` — `CREATE INDEX knowledge_embeddings_created_at_b0e6da24 ON landscape.knowledge_embeddings USING btree (created_at)`
- `knowledge_embeddings_pkey` — `CREATE UNIQUE INDEX knowledge_embeddings_pkey ON landscape.knowledge_embeddings USING btree (embedding_id)`
- `knowledge_embeddings_source_id_0d388137` — `CREATE INDEX knowledge_embeddings_source_id_0d388137 ON landscape.knowledge_embeddings USING btree (source_id)`
- `knowledge_embeddings_source_type_acd3fae1` — `CREATE INDEX knowledge_embeddings_source_type_acd3fae1 ON landscape.knowledge_embeddings USING btree (source_type)`
- `knowledge_embeddings_source_type_acd3fae1_like` — `CREATE INDEX knowledge_embeddings_source_type_acd3fae1_like ON landscape.knowledge_embeddings USING btree (source_type varchar_pattern_ops)`

## knowledge_entities
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| entity_id | bigint | NO | — | — |
| entity_type | character varying(50) | NO | — | — |
| entity_subtype | character varying(100) | YES | — | — |
| canonical_name | character varying(500) | NO | — | — |
| metadata | jsonb | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| created_by_id | bigint | YES | — | auth_user.id |

**Indexes:**
- `knowledge_e_canonic_a1a8d9_idx` — `CREATE INDEX knowledge_e_canonic_a1a8d9_idx ON landscape.knowledge_entities USING btree (canonical_name)`
- `knowledge_e_entity__ca2a63_idx` — `CREATE INDEX knowledge_e_entity__ca2a63_idx ON landscape.knowledge_entities USING btree (entity_type, entity_subtype)`
- `knowledge_entities_canonical_name_b5e564cc_like` — `CREATE INDEX knowledge_entities_canonical_name_b5e564cc_like ON landscape.knowledge_entities USING btree (canonical_name varchar_pattern_ops)`
- `knowledge_entities_canonical_name_key` — `CREATE UNIQUE INDEX knowledge_entities_canonical_name_key ON landscape.knowledge_entities USING btree (canonical_name)`
- `knowledge_entities_created_at_4594632c` — `CREATE INDEX knowledge_entities_created_at_4594632c ON landscape.knowledge_entities USING btree (created_at)`
- `knowledge_entities_created_by_id_49f837e1` — `CREATE INDEX knowledge_entities_created_by_id_49f837e1 ON landscape.knowledge_entities USING btree (created_by_id)`
- `knowledge_entities_entity_type_59f385fa` — `CREATE INDEX knowledge_entities_entity_type_59f385fa ON landscape.knowledge_entities USING btree (entity_type)`
- `knowledge_entities_entity_type_59f385fa_like` — `CREATE INDEX knowledge_entities_entity_type_59f385fa_like ON landscape.knowledge_entities USING btree (entity_type varchar_pattern_ops)`
- `knowledge_entities_pkey` — `CREATE UNIQUE INDEX knowledge_entities_pkey ON landscape.knowledge_entities USING btree (entity_id)`

## knowledge_facts
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| fact_id | bigint | NO | — | — |
| predicate | character varying(200) | NO | — | — |
| object_value | text | YES | — | — |
| valid_from | date | YES | — | — |
| valid_to | date | YES | — | — |
| source_type | character varying(50) | NO | — | — |
| source_id | bigint | YES | — | — |
| confidence_score | numeric(3,2) | NO | — | — |
| is_current | boolean | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| created_by_id | bigint | YES | — | auth_user.id |
| object_entity_id | bigint | YES | — | knowledge_entities.entity_id |
| subject_entity_id | bigint | NO | — | knowledge_entities.entity_id |
| superseded_by_id | bigint | YES | — | knowledge_facts.fact_id |

**Indexes:**
- `knowledge_f_is_curr_84f472_idx` — `CREATE INDEX knowledge_f_is_curr_84f472_idx ON landscape.knowledge_facts USING btree (is_current, predicate)`
- `knowledge_f_object__4cb694_idx` — `CREATE INDEX knowledge_f_object__4cb694_idx ON landscape.knowledge_facts USING btree (object_entity_id)`
- `knowledge_f_source__dd8340_idx` — `CREATE INDEX knowledge_f_source__dd8340_idx ON landscape.knowledge_facts USING btree (source_type, source_id)`
- `knowledge_f_subject_0aa246_idx` — `CREATE INDEX knowledge_f_subject_0aa246_idx ON landscape.knowledge_facts USING btree (subject_entity_id, predicate)`
- `knowledge_f_valid_f_f71d25_idx` — `CREATE INDEX knowledge_f_valid_f_f71d25_idx ON landscape.knowledge_facts USING btree (valid_from, valid_to)`
- `knowledge_facts_created_at_9f31ebb7` — `CREATE INDEX knowledge_facts_created_at_9f31ebb7 ON landscape.knowledge_facts USING btree (created_at)`
- `knowledge_facts_created_by_id_a1fa9f24` — `CREATE INDEX knowledge_facts_created_by_id_a1fa9f24 ON landscape.knowledge_facts USING btree (created_by_id)`
- `knowledge_facts_is_current_3cf05c45` — `CREATE INDEX knowledge_facts_is_current_3cf05c45 ON landscape.knowledge_facts USING btree (is_current)`
- `knowledge_facts_object_entity_id_ca9e8ef5` — `CREATE INDEX knowledge_facts_object_entity_id_ca9e8ef5 ON landscape.knowledge_facts USING btree (object_entity_id)`
- `knowledge_facts_pkey` — `CREATE UNIQUE INDEX knowledge_facts_pkey ON landscape.knowledge_facts USING btree (fact_id)`
- `knowledge_facts_predicate_b00107dd` — `CREATE INDEX knowledge_facts_predicate_b00107dd ON landscape.knowledge_facts USING btree (predicate)`
- `knowledge_facts_predicate_b00107dd_like` — `CREATE INDEX knowledge_facts_predicate_b00107dd_like ON landscape.knowledge_facts USING btree (predicate varchar_pattern_ops)`
- `knowledge_facts_source_type_7df43544` — `CREATE INDEX knowledge_facts_source_type_7df43544 ON landscape.knowledge_facts USING btree (source_type)`
- `knowledge_facts_source_type_7df43544_like` — `CREATE INDEX knowledge_facts_source_type_7df43544_like ON landscape.knowledge_facts USING btree (source_type varchar_pattern_ops)`
- `knowledge_facts_subject_entity_id_0c130194` — `CREATE INDEX knowledge_facts_subject_entity_id_0c130194 ON landscape.knowledge_facts USING btree (subject_entity_id)`
- `knowledge_facts_superseded_by_id_eee8e8cb` — `CREATE INDEX knowledge_facts_superseded_by_id_eee8e8cb ON landscape.knowledge_facts USING btree (superseded_by_id)`

## knowledge_insights
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| insight_id | bigint | NO | — | — |
| insight_type | character varying(50) | NO | — | — |
| related_entities | ARRAY | NO | — | — |
| insight_title | character varying(500) | NO | — | — |
| insight_description | text | NO | — | — |
| severity | character varying(20) | NO | — | — |
| supporting_facts | ARRAY | NO | — | — |
| metadata | jsonb | NO | — | — |
| acknowledged | boolean | NO | — | — |
| acknowledged_at | timestamp with time zone | YES | — | — |
| user_action | text | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| acknowledged_by_id | bigint | YES | — | auth_user.id |
| subject_entity_id | bigint | NO | — | knowledge_entities.entity_id |

**Indexes:**
- `knowledge_i_acknowl_7d6024_idx` — `CREATE INDEX knowledge_i_acknowl_7d6024_idx ON landscape.knowledge_insights USING btree (acknowledged, severity)`
- `knowledge_i_insight_965cc4_idx` — `CREATE INDEX knowledge_i_insight_965cc4_idx ON landscape.knowledge_insights USING btree (insight_type, created_at)`
- `knowledge_i_subject_c1bcf7_idx` — `CREATE INDEX knowledge_i_subject_c1bcf7_idx ON landscape.knowledge_insights USING btree (subject_entity_id, insight_type)`
- `knowledge_insights_acknowledged_7eb9491e` — `CREATE INDEX knowledge_insights_acknowledged_7eb9491e ON landscape.knowledge_insights USING btree (acknowledged)`
- `knowledge_insights_acknowledged_by_id_68ba1117` — `CREATE INDEX knowledge_insights_acknowledged_by_id_68ba1117 ON landscape.knowledge_insights USING btree (acknowledged_by_id)`
- `knowledge_insights_created_at_9aeca26f` — `CREATE INDEX knowledge_insights_created_at_9aeca26f ON landscape.knowledge_insights USING btree (created_at)`
- `knowledge_insights_insight_type_4d527f2b` — `CREATE INDEX knowledge_insights_insight_type_4d527f2b ON landscape.knowledge_insights USING btree (insight_type)`
- `knowledge_insights_insight_type_4d527f2b_like` — `CREATE INDEX knowledge_insights_insight_type_4d527f2b_like ON landscape.knowledge_insights USING btree (insight_type varchar_pattern_ops)`
- `knowledge_insights_pkey` — `CREATE UNIQUE INDEX knowledge_insights_pkey ON landscape.knowledge_insights USING btree (insight_id)`
- `knowledge_insights_subject_entity_id_c3b729c9` — `CREATE INDEX knowledge_insights_subject_entity_id_c3b729c9 ON landscape.knowledge_insights USING btree (subject_entity_id)`

## knowledge_interactions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| interaction_id | bigint | NO | — | — |
| user_query | text | NO | — | — |
| query_type | character varying(50) | NO | — | — |
| query_intent | character varying(200) | YES | — | — |
| context_entities | ARRAY | NO | — | — |
| context_facts | ARRAY | NO | — | — |
| ai_response | text | NO | — | — |
| response_type | character varying(50) | NO | — | — |
| confidence_score | numeric(3,2) | YES | — | — |
| input_tokens | integer | NO | — | — |
| output_tokens | integer | NO | — | — |
| user_feedback | character varying(50) | YES | — | — |
| user_correction | text | YES | — | — |
| created_at | timestamp with time zone | NO | — | — |
| session_id | uuid | NO | — | knowledge_sessions.session_id |

**Indexes:**
- `knowledge_i_query_i_cc952f_idx` — `CREATE INDEX knowledge_i_query_i_cc952f_idx ON landscape.knowledge_interactions USING btree (query_intent)`
- `knowledge_i_session_7869de_idx` — `CREATE INDEX knowledge_i_session_7869de_idx ON landscape.knowledge_interactions USING btree (session_id, created_at)`
- `knowledge_i_user_fe_5c8b7f_idx` — `CREATE INDEX knowledge_i_user_fe_5c8b7f_idx ON landscape.knowledge_interactions USING btree (user_feedback)`
- `knowledge_interactions_created_at_7a47ab34` — `CREATE INDEX knowledge_interactions_created_at_7a47ab34 ON landscape.knowledge_interactions USING btree (created_at)`
- `knowledge_interactions_pkey` — `CREATE UNIQUE INDEX knowledge_interactions_pkey ON landscape.knowledge_interactions USING btree (interaction_id)`
- `knowledge_interactions_session_id_7f4000a5` — `CREATE INDEX knowledge_interactions_session_id_7f4000a5 ON landscape.knowledge_interactions USING btree (session_id)`

## knowledge_sessions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| session_id | uuid | NO | — | — |
| workspace_id | integer | YES | — | — |
| project_id | integer | YES | — | — |
| session_start | timestamp with time zone | NO | — | — |
| session_end | timestamp with time zone | YES | — | — |
| loaded_entities | ARRAY | NO | — | — |
| loaded_facts_count | integer | NO | — | — |
| context_token_count | integer | NO | — | — |
| context_summary | text | YES | — | — |
| metadata | jsonb | NO | — | — |
| user_id | bigint | NO | — | auth_user.id |

**Indexes:**
- `idx_active_sessions` — `CREATE INDEX idx_active_sessions ON landscape.knowledge_sessions USING btree (session_end) WHERE (session_end IS NULL)`
- `knowledge_s_session_5b8f09_idx` — `CREATE INDEX knowledge_s_session_5b8f09_idx ON landscape.knowledge_sessions USING btree (session_start)`
- `knowledge_s_user_id_c64165_idx` — `CREATE INDEX knowledge_s_user_id_c64165_idx ON landscape.knowledge_sessions USING btree (user_id, project_id)`
- `knowledge_sessions_pkey` — `CREATE UNIQUE INDEX knowledge_sessions_pkey ON landscape.knowledge_sessions USING btree (session_id)`
- `knowledge_sessions_project_id_5f44cc1b` — `CREATE INDEX knowledge_sessions_project_id_5f44cc1b ON landscape.knowledge_sessions USING btree (project_id)`
- `knowledge_sessions_session_start_740f4f0a` — `CREATE INDEX knowledge_sessions_session_start_740f4f0a ON landscape.knowledge_sessions USING btree (session_start)`
- `knowledge_sessions_user_id_fa891383` — `CREATE INDEX knowledge_sessions_user_id_fa891383 ON landscape.knowledge_sessions USING btree (user_id)`

## Group: other

## _migrations
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| migration_id | integer | NO | nextval('_migrations_migration_id_seq'::regclass) | — |
| migration_file | character varying(255) | NO | — | — |
| applied_at | timestamp with time zone | YES | now() | — |
| checksum | character varying(64) | YES | — | — |

**Indexes:**
- `_migrations_migration_file_key` — `CREATE UNIQUE INDEX _migrations_migration_file_key ON landscape._migrations USING btree (migration_file)`
- `_migrations_pkey` — `CREATE UNIQUE INDEX _migrations_pkey ON landscape._migrations USING btree (migration_id)`

## auth_group
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | — | — |
| name | character varying(150) | NO | — | — |

**Indexes:**
- `auth_group_name_a6ea08ec_like` — `CREATE INDEX auth_group_name_a6ea08ec_like ON landscape.auth_group USING btree (name varchar_pattern_ops)`
- `auth_group_name_key` — `CREATE UNIQUE INDEX auth_group_name_key ON landscape.auth_group USING btree (name)`
- `auth_group_pkey` — `CREATE UNIQUE INDEX auth_group_pkey ON landscape.auth_group USING btree (id)`

## auth_group_permissions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| group_id | integer | NO | — | auth_group.id |
| permission_id | integer | NO | — | auth_permission.id |

**Indexes:**
- `auth_group_permissions_group_id_b120cbf9` — `CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON landscape.auth_group_permissions USING btree (group_id)`
- `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` — `CREATE UNIQUE INDEX auth_group_permissions_group_id_permission_id_0cd325b0_uniq ON landscape.auth_group_permissions USING btree (group_id, permission_id)`
- `auth_group_permissions_permission_id_84c5c92e` — `CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON landscape.auth_group_permissions USING btree (permission_id)`
- `auth_group_permissions_pkey` — `CREATE UNIQUE INDEX auth_group_permissions_pkey ON landscape.auth_group_permissions USING btree (id)`

## auth_permission
**Row Count (estimated):** 460
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | — | — |
| name | character varying(255) | NO | — | — |
| content_type_id | integer | NO | — | django_content_type.id |
| codename | character varying(100) | NO | — | — |

**Indexes:**
- `auth_permission_content_type_id_2f476e4b` — `CREATE INDEX auth_permission_content_type_id_2f476e4b ON landscape.auth_permission USING btree (content_type_id)`
- `auth_permission_content_type_id_codename_01ab375a_uniq` — `CREATE UNIQUE INDEX auth_permission_content_type_id_codename_01ab375a_uniq ON landscape.auth_permission USING btree (content_type_id, codename)`
- `auth_permission_pkey` — `CREATE UNIQUE INDEX auth_permission_pkey ON landscape.auth_permission USING btree (id)`

## auth_user
**Row Count (estimated):** 4
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | — | — |
| password | character varying(128) | NO | — | — |
| last_login | timestamp with time zone | YES | — | — |
| is_superuser | boolean | NO | — | — |
| username | character varying(150) | NO | — | — |
| first_name | character varying(150) | NO | — | — |
| last_name | character varying(150) | NO | — | — |
| email | character varying(254) | NO | — | — |
| is_staff | boolean | NO | — | — |
| is_active | boolean | NO | — | — |
| date_joined | timestamp with time zone | NO | — | — |
| phone | character varying(20) | YES | — | — |
| company | character varying(200) | YES | — | — |
| role | character varying(50) | YES | 'user'::character varying | — |
| is_verified | boolean | YES | false | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| last_login_ip | inet | YES | — | — |
| demo_projects_provisioned | boolean | NO | — | — |

**Indexes:**
- `auth_user_pkey` — `CREATE UNIQUE INDEX auth_user_pkey ON landscape.auth_user USING btree (id)`
- `auth_user_username_6821ab7c_like` — `CREATE INDEX auth_user_username_6821ab7c_like ON landscape.auth_user USING btree (username varchar_pattern_ops)`
- `auth_user_username_key` — `CREATE UNIQUE INDEX auth_user_username_key ON landscape.auth_user USING btree (username)`

## auth_user_groups
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| user_id | integer | NO | — | auth_user.id |
| group_id | integer | NO | — | auth_group.id |

**Indexes:**
- `auth_user_groups_group_id_97559544` — `CREATE INDEX auth_user_groups_group_id_97559544 ON landscape.auth_user_groups USING btree (group_id)`
- `auth_user_groups_pkey` — `CREATE UNIQUE INDEX auth_user_groups_pkey ON landscape.auth_user_groups USING btree (id)`
- `auth_user_groups_user_id_6a12ed8b` — `CREATE INDEX auth_user_groups_user_id_6a12ed8b ON landscape.auth_user_groups USING btree (user_id)`
- `auth_user_groups_user_id_group_id_94350c0c_uniq` — `CREATE UNIQUE INDEX auth_user_groups_user_id_group_id_94350c0c_uniq ON landscape.auth_user_groups USING btree (user_id, group_id)`

## auth_user_user_permissions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| user_id | integer | NO | — | auth_user.id |
| permission_id | integer | NO | — | auth_permission.id |

**Indexes:**
- `auth_user_user_permissions_permission_id_1fbb5f2c` — `CREATE INDEX auth_user_user_permissions_permission_id_1fbb5f2c ON landscape.auth_user_user_permissions USING btree (permission_id)`
- `auth_user_user_permissions_pkey` — `CREATE UNIQUE INDEX auth_user_user_permissions_pkey ON landscape.auth_user_user_permissions USING btree (id)`
- `auth_user_user_permissions_user_id_a95ead1b` — `CREATE INDEX auth_user_user_permissions_user_id_a95ead1b ON landscape.auth_user_user_permissions USING btree (user_id)`
- `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` — `CREATE UNIQUE INDEX auth_user_user_permissions_user_id_permission_id_14a6b632_uniq ON landscape.auth_user_user_permissions USING btree (user_id, permission_id)`

## density_classification
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| density_id | bigint | NO | — | — |
| code | text | NO | — | — |
| name | text | NO | — | — |
| family_category | text | NO | — | — |
| intensity_min | numeric | YES | — | — |
| intensity_max | numeric | YES | — | — |
| intensity_metric | text | YES | — | — |
| description | text | YES | — | — |
| jurisdiction_notes | text | YES | — | — |
| active | boolean | YES | true | — |
| sort_order | integer | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `density_classification_code_key` — `CREATE UNIQUE INDEX density_classification_code_key ON landscape.density_classification USING btree (code)`
- `density_classification_pkey` — `CREATE UNIQUE INDEX density_classification_pkey ON landscape.density_classification USING btree (density_id)`

## developer_fees
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('developer_fees_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| fee_type | character varying(50) | NO | — | — |
| fee_description | character varying(500) | YES | — | — |
| basis_type | character varying(50) | NO | — | — |
| basis_value | numeric(12,4) | YES | — | — |
| calculated_amount | numeric(15,2) | YES | — | — |
| payment_timing | character varying(200) | YES | — | — |
| status | character varying(20) | YES | 'pending'::character varying | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| timing_start_period | integer | YES | 1 | — |
| timing_duration_periods | integer | YES | 1 | — |

**Indexes:**
- `developer_fees_pkey` — `CREATE UNIQUE INDEX developer_fees_pkey ON landscape.developer_fees USING btree (id)`
- `idx_developer_fees_project` — `CREATE INDEX idx_developer_fees_project ON landscape.developer_fees USING btree (project_id)`

## django_admin_log
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | — | — |
| action_time | timestamp with time zone | NO | — | — |
| object_id | text | YES | — | — |
| object_repr | character varying(200) | NO | — | — |
| action_flag | smallint | NO | — | — |
| change_message | text | NO | — | — |
| content_type_id | integer | YES | — | django_content_type.id |
| user_id | integer | NO | — | auth_user.id |

**Indexes:**
- `django_admin_log_content_type_id_c4bce8eb` — `CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON landscape.django_admin_log USING btree (content_type_id)`
- `django_admin_log_pkey` — `CREATE UNIQUE INDEX django_admin_log_pkey ON landscape.django_admin_log USING btree (id)`
- `django_admin_log_user_id_c564eba6` — `CREATE INDEX django_admin_log_user_id_c564eba6 ON landscape.django_admin_log USING btree (user_id)`

**Check Constraints:**
- `CHECK ((action_flag >= 0))`

## django_content_type
**Row Count (estimated):** 119
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | — | — |
| app_label | character varying(100) | NO | — | — |
| model | character varying(100) | NO | — | — |

**Indexes:**
- `django_content_type_app_label_model_76bd3d3b_uniq` — `CREATE UNIQUE INDEX django_content_type_app_label_model_76bd3d3b_uniq ON landscape.django_content_type USING btree (app_label, model)`
- `django_content_type_pkey` — `CREATE UNIQUE INDEX django_content_type_pkey ON landscape.django_content_type USING btree (id)`

## django_migrations
**Row Count (estimated):** 51
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| app | character varying(255) | NO | — | — |
| name | character varying(255) | NO | — | — |
| applied | timestamp with time zone | NO | — | — |

**Indexes:**
- `django_migrations_pkey` — `CREATE UNIQUE INDEX django_migrations_pkey ON landscape.django_migrations USING btree (id)`

## django_session
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| session_key | character varying(40) | NO | — | — |
| session_data | text | NO | — | — |
| expire_date | timestamp with time zone | NO | — | — |

**Indexes:**
- `django_session_expire_date_a5c62663` — `CREATE INDEX django_session_expire_date_a5c62663 ON landscape.django_session USING btree (expire_date)`
- `django_session_pkey` — `CREATE UNIQUE INDEX django_session_pkey ON landscape.django_session USING btree (session_key)`
- `django_session_session_key_c0390e0f_like` — `CREATE INDEX django_session_session_key_c0390e0f_like ON landscape.django_session USING btree (session_key varchar_pattern_ops)`

## doc_extracted_facts
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| fact_id | uuid | NO | gen_random_uuid() | — |
| doc_id | bigint | NO | — | core_doc.doc_id |
| source_version | integer | NO | 1 | — |
| field_name | character varying(100) | NO | — | — |
| field_value | text | YES | — | — |
| confidence | numeric(3,2) | YES | — | — |
| extraction_method | character varying(50) | YES | — | — |
| superseded_at | timestamp with time zone | YES | — | — |
| superseded_by_version | integer | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `doc_extracted_facts_pkey` — `CREATE UNIQUE INDEX doc_extracted_facts_pkey ON landscape.doc_extracted_facts USING btree (fact_id)`
- `idx_doc_facts_active` — `CREATE INDEX idx_doc_facts_active ON landscape.doc_extracted_facts USING btree (doc_id) WHERE (superseded_at IS NULL)`
- `idx_doc_facts_doc_id` — `CREATE INDEX idx_doc_facts_doc_id ON landscape.doc_extracted_facts USING btree (doc_id)`
- `unique_fact_per_version` — `CREATE UNIQUE INDEX unique_fact_per_version ON landscape.doc_extracted_facts USING btree (doc_id, source_version, field_name)`

## doc_processing_queue
**Row Count (estimated):** 1
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| queue_id | integer | NO | nextval('doc_processing_queue_queue_id_seq'::regclass) | — |
| doc_id | bigint | NO | — | core_doc.doc_id |
| project_id | bigint | YES | — | — |
| status | character varying(50) | YES | 'queued'::character varying | — |
| priority | integer | YES | 0 | — |
| attempts | integer | YES | 0 | — |
| max_attempts | integer | YES | 3 | — |
| started_at | timestamp without time zone | YES | — | — |
| completed_at | timestamp without time zone | YES | — | — |
| error_message | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `doc_processing_queue_doc_id_key` — `CREATE UNIQUE INDEX doc_processing_queue_doc_id_key ON landscape.doc_processing_queue USING btree (doc_id)`
- `doc_processing_queue_pkey` — `CREATE UNIQUE INDEX doc_processing_queue_pkey ON landscape.doc_processing_queue USING btree (queue_id)`
- `doc_processing_queue_priority_idx` — `CREATE INDEX doc_processing_queue_priority_idx ON landscape.doc_processing_queue USING btree (priority DESC, created_at)`
- `doc_processing_queue_status_idx` — `CREATE INDEX doc_processing_queue_status_idx ON landscape.doc_processing_queue USING btree (status)`
- `idx_doc_queue_status` — `CREATE INDEX idx_doc_queue_status ON landscape.doc_processing_queue USING btree (status, priority DESC, created_at)`

## document_tables
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| table_id | bigint | NO | nextval('document_tables_table_id_seq'::regclass) | — |
| doc_id | bigint | YES | — | core_doc.doc_id |
| table_order | integer | YES | 0 | — |
| page_number | integer | YES | — | — |
| table_title | character varying(500) | YES | — | — |
| headers | jsonb | YES | — | — |
| rows | jsonb | YES | — | — |
| row_count | integer | YES | 0 | — |
| extraction_source | character varying(50) | YES | 'pdfplumber'::character varying | — |
| accuracy | numeric(5,2) | YES | — | — |
| raw_data | jsonb | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `document_tables_pkey` — `CREATE UNIQUE INDEX document_tables_pkey ON landscape.document_tables USING btree (table_id)`
- `idx_document_tables_doc_id` — `CREATE INDEX idx_document_tables_doc_id ON landscape.document_tables USING btree (doc_id)`

## extraction_commit_snapshot
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| snapshot_id | bigint | NO | — | — |
| scope | character varying(50) | NO | — | — |
| committed_at | timestamp with time zone | NO | — | — |
| snapshot_data | jsonb | NO | — | — |
| changes_applied | jsonb | NO | — | — |
| is_active | boolean | NO | — | — |
| rolled_back_at | timestamp with time zone | YES | — | — |
| committed_by | bigint | YES | — | auth_user.id |
| doc_id | bigint | YES | — | core_doc.doc_id |
| project_id | integer | NO | — | tbl_project.project_id |

**Indexes:**
- `extraction_commit_snapshot_committed_by_id_aba4412e` — `CREATE INDEX extraction_commit_snapshot_committed_by_id_aba4412e ON landscape.extraction_commit_snapshot USING btree (committed_by)`
- `extraction_commit_snapshot_doc_id_7bc0c667` — `CREATE INDEX extraction_commit_snapshot_doc_id_7bc0c667 ON landscape.extraction_commit_snapshot USING btree (doc_id)`
- `extraction_commit_snapshot_pkey` — `CREATE UNIQUE INDEX extraction_commit_snapshot_pkey ON landscape.extraction_commit_snapshot USING btree (snapshot_id)`
- `extraction_commit_snapshot_project_id_4c8d51cf` — `CREATE INDEX extraction_commit_snapshot_project_id_4c8d51cf ON landscape.extraction_commit_snapshot USING btree (project_id)`
- `snapshot_project_scope_idx` — `CREATE INDEX snapshot_project_scope_idx ON landscape.extraction_commit_snapshot USING btree (project_id, scope, is_active)`

## gis_boundary_history
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| boundary_id | integer | NO | nextval('gis_boundary_history_boundary_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| boundary_type | character varying(50) | NO | 'tax_parcel_boundary'::character varying | — |
| parcels_selected | jsonb | NO | — | — |
| total_acres | numeric(10,2) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| action_type | character varying(50) | NO | 'boundary_confirmed'::character varying | — |

**Indexes:**
- `gis_boundary_history_pkey` — `CREATE UNIQUE INDEX gis_boundary_history_pkey ON landscape.gis_boundary_history USING btree (boundary_id)`
- `idx_boundary_history_created_at` — `CREATE INDEX idx_boundary_history_created_at ON landscape.gis_boundary_history USING btree (created_at)`
- `idx_boundary_history_project_id` — `CREATE INDEX idx_boundary_history_project_id ON landscape.gis_boundary_history USING btree (project_id)`

## gis_document_ingestion
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | uuid | NO | gen_random_uuid() | — |
| project_id | integer | NO | — | tbl_project.project_id |
| package_name | text | NO | — | — |
| document_type | text | NO | — | — |
| filename | text | NO | — | — |
| ai_analysis | jsonb | YES | — | — |
| parcels_created | integer | YES | 0 | — |
| geometry_added | integer | YES | 0 | — |
| status | text | YES | 'processing'::text | — |
| error_details | text | YES | — | — |
| processed_at | timestamp with time zone | YES | now() | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `gis_document_ingestion_pkey` — `CREATE UNIQUE INDEX gis_document_ingestion_pkey ON landscape.gis_document_ingestion USING btree (id)`
- `idx_gdi_project_package` — `CREATE INDEX idx_gdi_project_package ON landscape.gis_document_ingestion USING btree (project_id, package_name)`

## gis_mapping_history
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| mapping_id | integer | NO | nextval('gis_mapping_history_mapping_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| mapping_type | character varying(50) | NO | 'assessor_field_mapping'::character varying | — |
| fields_mapped | jsonb | NO | — | — |
| source_data | jsonb | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| action_type | character varying(50) | NO | 'mapping_applied'::character varying | — |

**Indexes:**
- `gis_mapping_history_pkey` — `CREATE UNIQUE INDEX gis_mapping_history_pkey ON landscape.gis_mapping_history USING btree (mapping_id)`
- `idx_mapping_history_created_at` — `CREATE INDEX idx_mapping_history_created_at ON landscape.gis_mapping_history USING btree (created_at)`
- `idx_mapping_history_project_id` — `CREATE INDEX idx_mapping_history_project_id ON landscape.gis_mapping_history USING btree (project_id)`

## gis_plan_parcel
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | uuid | NO | gen_random_uuid() | — |
| project_id | integer | NO | — | tbl_project.project_id |
| parcel_id | integer | NO | — | tbl_parcel.parcel_id |
| geom | USER-DEFINED | NO | — | — |
| source_doc | text | NO | — | — |
| version | integer | NO | 1 | — |
| confidence | numeric(3,2) | YES | 0.95 | — |
| valid_from | timestamp with time zone | NO | now() | — |
| valid_to | timestamp with time zone | YES | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `gis_plan_parcel_pkey` — `CREATE UNIQUE INDEX gis_plan_parcel_pkey ON landscape.gis_plan_parcel USING btree (id)`
- `idx_gpp_confidence` — `CREATE INDEX idx_gpp_confidence ON landscape.gis_plan_parcel USING btree (confidence DESC)`
- `idx_gpp_geom` — `CREATE INDEX idx_gpp_geom ON landscape.gis_plan_parcel USING gist (geom)`
- `ux_gpp_active` — `CREATE UNIQUE INDEX ux_gpp_active ON landscape.gis_plan_parcel USING btree (project_id, parcel_id) WHERE is_active`

## gis_project_boundary
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | uuid | NO | gen_random_uuid() | — |
| project_id | integer | NO | — | tbl_project.project_id |
| geom | USER-DEFINED | NO | — | — |
| source | text | NO | 'user_selection'::text | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `gis_project_boundary_pkey` — `CREATE UNIQUE INDEX gis_project_boundary_pkey ON landscape.gis_project_boundary USING btree (id)`
- `gis_project_boundary_project_id_key` — `CREATE UNIQUE INDEX gis_project_boundary_project_id_key ON landscape.gis_project_boundary USING btree (project_id)`
- `idx_gpb_geom` — `CREATE INDEX idx_gpb_geom ON landscape.gis_project_boundary USING gist (geom)`

## gis_tax_parcel_ref
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| tax_parcel_id | text | NO | — | — |
| geom | USER-DEFINED | NO | — | — |
| assessor_attrs | jsonb | YES | — | — |
| source_updated_at | timestamp with time zone | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |
| source | text | YES | — | — |
| updated_at | timestamp with time zone | YES | — | — |

**Indexes:**
- `gis_tax_parcel_ref_pkey` — `CREATE UNIQUE INDEX gis_tax_parcel_ref_pkey ON landscape.gis_tax_parcel_ref USING btree (tax_parcel_id)`
- `idx_gtpr_geom` — `CREATE INDEX idx_gtpr_geom ON landscape.gis_tax_parcel_ref USING gist (geom)`

## glossary_zoning
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| glossary_id | uuid | NO | gen_random_uuid() | — |
| jurisdiction_city | text | NO | — | — |
| jurisdiction_county | text | YES | — | — |
| jurisdiction_state | character(2) | NO | — | — |
| jurisdiction_display | text | NO | — | — |
| district_code | text | YES | — | — |
| district_name | text | YES | — | — |
| family_name | text | NO | — | — |
| local_code_raw | text | NO | — | — |
| local_code_canonical | text | YES | — | — |
| code_token_kind | USER-DEFINED | NO | — | — |
| code_token_confidence | numeric(3,2) | NO | — | — |
| mapped_use | text | NO | — | — |
| allowance | character(1) | NO | — | — |
| purpose_text | text | YES | — | — |
| intent_text | text | YES | — | — |
| conditions_text | text | YES | — | — |
| development_standards | jsonb | YES | — | — |
| use_standard_refs | jsonb | YES | — | — |
| definitions_refs | jsonb | YES | — | — |
| narrative_section_ref | text | YES | — | — |
| narrative_src_url | text | YES | — | — |
| source_doc_url | text | YES | — | — |
| effective_date | date | YES | — | — |
| amending_ord_list | jsonb | YES | — | — |
| is_active | boolean | NO | true | — |
| created_at | timestamp with time zone | NO | now() | — |
| updated_at | timestamp with time zone | NO | now() | — |
| suggested_family | text | YES | — | — |
| suggested_density_code | text | YES | — | — |
| suggested_type_code | text | YES | — | — |
| ai_confidence | numeric | YES | — | — |
| mapping_status | text | YES | — | — |

**Indexes:**
- `glossary_zoning_pkey` — `CREATE UNIQUE INDEX glossary_zoning_pkey ON landscape.glossary_zoning USING btree (glossary_id)`
- `idx_gz_allowance` — `CREATE INDEX idx_gz_allowance ON landscape.glossary_zoning USING btree (allowance)`
- `idx_gz_district` — `CREATE INDEX idx_gz_district ON landscape.glossary_zoning USING btree (district_code)`
- `idx_gz_fulltext_conditions` — `CREATE INDEX idx_gz_fulltext_conditions ON landscape.glossary_zoning USING gin (to_tsvector('english'::regconfig, COALESCE(conditions_text, ''::text)))`
- `idx_gz_fulltext_purpose` — `CREATE INDEX idx_gz_fulltext_purpose ON landscape.glossary_zoning USING gin (to_tsvector('english'::regconfig, COALESCE(purpose_text, ''::text)))`
- `idx_gz_juris` — `CREATE INDEX idx_gz_juris ON landscape.glossary_zoning USING btree (jurisdiction_state, jurisdiction_city)`
- `idx_gz_mapped_use` — `CREATE INDEX idx_gz_mapped_use ON landscape.glossary_zoning USING btree (mapped_use)`
- `idx_gz_token_kind` — `CREATE INDEX idx_gz_token_kind ON landscape.glossary_zoning USING btree (code_token_kind)`

**Enum Values:**
- code_token_kind: code_token_kind = [published, placeholder, numeric, mixed]

**Check Constraints:**
- `CHECK (((ai_confidence >= (0)::numeric) AND (ai_confidence <= (1)::numeric)))`
- `CHECK (((code_token_confidence >= (0)::numeric) AND (code_token_confidence <= (1)::numeric)))`
- `CHECK ((allowance = ANY (ARRAY['P'::bpchar, 'C'::bpchar, 'X'::bpchar])))`
- `CHECK ((char_length(mapped_use) <= 8))`
- `CHECK ((mapping_status = ANY (ARRAY['auto'::text, 'reviewed'::text, 'custom'::text, 'pending'::text])))`

## land_use_pricing
**Row Count (estimated):** 45
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('land_use_pricing_id_seq'::regclass) | — |
| project_id | integer | NO | — | — |
| lu_type_code | character varying(50) | NO | — | — |
| price_per_unit | numeric(15,2) | YES | — | — |
| unit_of_measure | character varying(20) | YES | — | — |
| inflation_type | character varying(50) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| market_geography | character varying(100) | YES | — | — |
| product_code | character varying(100) | YES | — | — |
| growth_rate | numeric(5,4) | YES | — | — |
| growth_rate_set_id | integer | YES | — | core_fin_growth_rate_sets.set_id |

**Indexes:**
- `idx_land_use_pricing_benchmark` — `CREATE INDEX idx_land_use_pricing_benchmark ON landscape.land_use_pricing USING btree (benchmark_id)`
- `idx_land_use_pricing_geography` — `CREATE INDEX idx_land_use_pricing_geography ON landscape.land_use_pricing USING btree (market_geography)`
- `idx_land_use_pricing_growth_set` — `CREATE INDEX idx_land_use_pricing_growth_set ON landscape.land_use_pricing USING btree (growth_rate_set_id)`
- `idx_land_use_pricing_project` — `CREATE INDEX idx_land_use_pricing_project ON landscape.land_use_pricing USING btree (project_id)`
- `idx_land_use_pricing_project_product` — `CREATE INDEX idx_land_use_pricing_project_product ON landscape.land_use_pricing USING btree (project_id, lu_type_code, product_code)`
- `land_use_pricing_pkey` — `CREATE UNIQUE INDEX land_use_pricing_pkey ON landscape.land_use_pricing USING btree (id)`
- `land_use_pricing_project_lu_product_key` — `CREATE UNIQUE INDEX land_use_pricing_project_lu_product_key ON landscape.land_use_pricing USING btree (project_id, lu_type_code, product_code)`
- `land_use_pricing_project_type_product_key` — `CREATE UNIQUE INDEX land_use_pricing_project_type_product_key ON landscape.land_use_pricing USING btree (project_id, lu_type_code, product_code)`

## landscaper_absorption_detail
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| detail_id | bigint | NO | nextval('landscaper_absorption_detail_detail_id_seq'::regclass) | — |
| benchmark_id | bigint | YES | — | tbl_global_benchmark_registry.benchmark_id |
| data_source_type | character varying(50) | NO | — | — |
| source_document_id | integer | YES | — | — |
| extraction_date | timestamp without time zone | YES | now() | — |
| as_of_period | character varying(20) | YES | — | — |
| subdivision_name | character varying(200) | YES | — | — |
| mpc_name | character varying(200) | YES | — | — |
| city | character varying(100) | YES | — | — |
| state | character varying(2) | YES | — | — |
| market_geography | character varying(100) | YES | — | — |
| annual_sales | integer | YES | — | — |
| monthly_rate | numeric(8,2) | YES | — | — |
| yoy_change_pct | numeric(6,2) | YES | — | — |
| lot_size_sf | integer | YES | — | — |
| price_point_low | numeric(12,2) | YES | — | — |
| price_point_high | numeric(12,2) | YES | — | — |
| builder_name | character varying(100) | YES | — | — |
| active_subdivisions_count | integer | YES | — | — |
| product_mix_json | jsonb | YES | — | — |
| market_tier | character varying(20) | YES | — | — |
| competitive_supply | character varying(20) | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_landscaper_absorption_benchmark` — `CREATE INDEX idx_landscaper_absorption_benchmark ON landscape.landscaper_absorption_detail USING btree (benchmark_id)`
- `idx_landscaper_absorption_geography` — `CREATE INDEX idx_landscaper_absorption_geography ON landscape.landscaper_absorption_detail USING btree (market_geography)`
- `idx_landscaper_absorption_lot_size` — `CREATE INDEX idx_landscaper_absorption_lot_size ON landscape.landscaper_absorption_detail USING btree (lot_size_sf)`
- `idx_landscaper_absorption_period` — `CREATE INDEX idx_landscaper_absorption_period ON landscape.landscaper_absorption_detail USING btree (as_of_period)`
- `idx_landscaper_absorption_source` — `CREATE INDEX idx_landscaper_absorption_source ON landscape.landscaper_absorption_detail USING btree (data_source_type)`
- `landscaper_absorption_detail_pkey` — `CREATE UNIQUE INDEX landscaper_absorption_detail_pkey ON landscape.landscaper_absorption_detail USING btree (detail_id)`

## landscaper_activity
**Row Count (estimated):** 108
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| activity_id | integer | NO | nextval('landscaper_activity_activity_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| activity_type | character varying(20) | NO | — | — |
| title | character varying(100) | NO | — | — |
| summary | text | NO | — | — |
| status | character varying(20) | NO | 'pending'::character varying | — |
| confidence | character varying(20) | YES | — | — |
| link | character varying(255) | YES | — | — |
| blocked_by | text | YES | — | — |
| details | jsonb | YES | — | — |
| highlight_fields | jsonb | YES | — | — |
| is_read | boolean | NO | false | — |
| source_type | character varying(50) | YES | — | — |
| source_id | character varying(100) | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |
| updated_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `idx_landscaper_activity_created` — `CREATE INDEX idx_landscaper_activity_created ON landscape.landscaper_activity USING btree (project_id, created_at DESC)`
- `idx_landscaper_activity_project` — `CREATE INDEX idx_landscaper_activity_project ON landscape.landscaper_activity USING btree (project_id)`
- `idx_landscaper_activity_project_created` — `CREATE INDEX idx_landscaper_activity_project_created ON landscape.landscaper_activity USING btree (project_id, created_at DESC)`
- `idx_landscaper_activity_project_read` — `CREATE INDEX idx_landscaper_activity_project_read ON landscape.landscaper_activity USING btree (project_id, is_read)`
- `idx_landscaper_activity_read` — `CREATE INDEX idx_landscaper_activity_read ON landscape.landscaper_activity USING btree (project_id, is_read)`
- `idx_landscaper_activity_source` — `CREATE INDEX idx_landscaper_activity_source ON landscape.landscaper_activity USING btree (source_type, source_id)`
- `landscaper_activity_pkey` — `CREATE UNIQUE INDEX landscaper_activity_pkey ON landscape.landscaper_activity USING btree (activity_id)`

**Check Constraints:**
- `CHECK ((((confidence)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[])) OR (confidence IS NULL)))`
- `CHECK (((activity_type)::text = ANY ((ARRAY['status'::character varying, 'decision'::character varying, 'update'::character varying, 'alert'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['complete'::character varying, 'partial'::character varying, 'blocked'::character varying, 'pending'::character varying])::text[])))`

## landscaper_advice
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| advice_id | integer | NO | — | — |
| assumption_key | character varying(100) | NO | — | — |
| lifecycle_stage | character varying(50) | NO | — | — |
| suggested_value | numeric(15,4) | NO | — | — |
| confidence_level | character varying(20) | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| notes | text | YES | — | — |
| message_id | character varying(100) | YES | — | landscaper_chat_message.message_id |
| project_id | integer | NO | — | tbl_project.project_id |

**Indexes:**
- `landscaper__created_57ae5a_idx` — `CREATE INDEX landscaper__created_57ae5a_idx ON landscape.landscaper_advice USING btree (created_at)`
- `landscaper__project_948878_idx` — `CREATE INDEX landscaper__project_948878_idx ON landscape.landscaper_advice USING btree (project_id, assumption_key)`
- `landscaper__project_e8f509_idx` — `CREATE INDEX landscaper__project_e8f509_idx ON landscape.landscaper_advice USING btree (project_id, lifecycle_stage)`
- `landscaper_advice_message_id_5653931d` — `CREATE INDEX landscaper_advice_message_id_5653931d ON landscape.landscaper_advice USING btree (message_id)`
- `landscaper_advice_message_id_5653931d_like` — `CREATE INDEX landscaper_advice_message_id_5653931d_like ON landscape.landscaper_advice USING btree (message_id varchar_pattern_ops)`
- `landscaper_advice_pkey` — `CREATE UNIQUE INDEX landscaper_advice_pkey ON landscape.landscaper_advice USING btree (advice_id)`
- `landscaper_advice_project_id_6fb9f5af` — `CREATE INDEX landscaper_advice_project_id_6fb9f5af ON landscape.landscaper_advice USING btree (project_id)`

## landscaper_chat_embedding
**Row Count (estimated):** 52
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | uuid | NO | gen_random_uuid() | — |
| message_id | uuid | NO | — | landscaper_thread_message.id |
| thread_id | uuid | NO | — | landscaper_chat_thread.id |
| project_id | integer | NO | — | — |
| embedding | USER-DEFINED | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_chat_embedding_project` — `CREATE INDEX idx_chat_embedding_project ON landscape.landscaper_chat_embedding USING btree (project_id)`
- `idx_chat_embedding_thread` — `CREATE INDEX idx_chat_embedding_thread ON landscape.landscaper_chat_embedding USING btree (thread_id)`
- `idx_chat_embedding_vector` — `CREATE INDEX idx_chat_embedding_vector ON landscape.landscaper_chat_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists='100')`
- `landscaper_chat_embedding_pkey` — `CREATE UNIQUE INDEX landscaper_chat_embedding_pkey ON landscape.landscaper_chat_embedding USING btree (id)`

## landscaper_chat_message
**Row Count (estimated):** 223
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| message_id | character varying(100) | NO | — | — |
| role | character varying(20) | NO | — | — |
| content | text | NO | — | — |
| timestamp | timestamp with time zone | NO | — | — |
| metadata | jsonb | YES | — | — |
| project_id | integer | NO | — | tbl_project.project_id |
| user_id | bigint | YES | — | auth_user.id |
| active_tab | character varying(20) | YES | 'home'::character varying | — |

**Indexes:**
- `idx_chat_message_project_tab` — `CREATE INDEX idx_chat_message_project_tab ON landscape.landscaper_chat_message USING btree (project_id, active_tab)`
- `landscaper__project_0fbb3d_idx` — `CREATE INDEX landscaper__project_0fbb3d_idx ON landscape.landscaper_chat_message USING btree (project_id, "timestamp")`
- `landscaper__timesta_8945c8_idx` — `CREATE INDEX landscaper__timesta_8945c8_idx ON landscape.landscaper_chat_message USING btree ("timestamp")`
- `landscaper_chat_message_message_id_27da4cf7_like` — `CREATE INDEX landscaper_chat_message_message_id_27da4cf7_like ON landscape.landscaper_chat_message USING btree (message_id varchar_pattern_ops)`
- `landscaper_chat_message_pkey` — `CREATE UNIQUE INDEX landscaper_chat_message_pkey ON landscape.landscaper_chat_message USING btree (message_id)`
- `landscaper_chat_message_project_id_fc77d355` — `CREATE INDEX landscaper_chat_message_project_id_fc77d355 ON landscape.landscaper_chat_message USING btree (project_id)`
- `landscaper_chat_message_user_id_263e4adb` — `CREATE INDEX landscaper_chat_message_user_id_263e4adb ON landscape.landscaper_chat_message USING btree (user_id)`

## landscaper_chat_thread
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | uuid | NO | gen_random_uuid() | — |
| project_id | integer | NO | — | tbl_project.project_id |
| page_context | character varying(50) | NO | — | — |
| subtab_context | character varying(50) | YES | — | — |
| title | character varying(255) | YES | — | — |
| summary | text | YES | — | — |
| is_active | boolean | YES | true | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |
| closed_at | timestamp with time zone | YES | — | — |

**Indexes:**
- `idx_thread_active` — `CREATE INDEX idx_thread_active ON landscape.landscaper_chat_thread USING btree (project_id, is_active) WHERE (is_active = true)`
- `idx_thread_page` — `CREATE INDEX idx_thread_page ON landscape.landscaper_chat_thread USING btree (project_id, page_context)`
- `idx_thread_project` — `CREATE INDEX idx_thread_project ON landscape.landscaper_chat_thread USING btree (project_id)`
- `idx_thread_updated` — `CREATE INDEX idx_thread_updated ON landscape.landscaper_chat_thread USING btree (project_id, updated_at DESC)`
- `landscaper_chat_thread_pkey` — `CREATE UNIQUE INDEX landscaper_chat_thread_pkey ON landscape.landscaper_chat_thread USING btree (id)`

## landscaper_thread_message
**Row Count (estimated):** 169
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | uuid | NO | gen_random_uuid() | — |
| thread_id | uuid | NO | — | landscaper_chat_thread.id |
| role | character varying(20) | NO | — | — |
| content | text | NO | — | — |
| metadata | jsonb | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_message_created` — `CREATE INDEX idx_message_created ON landscape.landscaper_thread_message USING btree (thread_id, created_at)`
- `idx_message_thread` — `CREATE INDEX idx_message_thread ON landscape.landscaper_thread_message USING btree (thread_id)`
- `landscaper_thread_message_pkey` — `CREATE UNIQUE INDEX landscaper_thread_message_pkey ON landscape.landscaper_thread_message USING btree (id)`

**Check Constraints:**
- `CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[])))`

## lkp_building_class
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| code | character varying(10) | NO | — | — |
| display_name | character varying(50) | NO | — | — |
| description | text | YES | — | — |

**Indexes:**
- `lkp_building_class_pkey` — `CREATE UNIQUE INDEX lkp_building_class_pkey ON landscape.lkp_building_class USING btree (code)`

## lkp_buyer_seller_type
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| code | character varying(50) | NO | — | — |
| display_name | character varying(100) | NO | — | — |
| sort_order | integer | YES | — | — |

**Indexes:**
- `lkp_buyer_seller_type_pkey` — `CREATE UNIQUE INDEX lkp_buyer_seller_type_pkey ON landscape.lkp_buyer_seller_type USING btree (code)`

## lkp_price_status
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| code | character varying(50) | NO | — | — |
| display_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| reliability_score | integer | YES | — | — |

**Indexes:**
- `lkp_price_status_pkey` — `CREATE UNIQUE INDEX lkp_price_status_pkey ON landscape.lkp_price_status USING btree (code)`

## lkp_sale_type
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| code | character varying(50) | NO | — | — |
| display_name | character varying(100) | NO | — | — |
| description | text | YES | — | — |
| sort_order | integer | YES | — | — |

**Indexes:**
- `lkp_sale_type_pkey` — `CREATE UNIQUE INDEX lkp_sale_type_pkey ON landscape.lkp_sale_type USING btree (code)`

## management_overhead
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('management_overhead_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| item_name | character varying(255) | NO | — | — |
| amount | numeric(15,2) | NO | — | — |
| frequency | character varying(20) | YES | 'monthly'::character varying | — |
| start_period | integer | YES | 1 | — |
| duration_periods | integer | YES | 1 | — |
| container_level | character varying(20) | YES | — | — |
| container_id | bigint | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_management_overhead_project` — `CREATE INDEX idx_management_overhead_project ON landscape.management_overhead USING btree (project_id)`
- `management_overhead_pkey` — `CREATE UNIQUE INDEX management_overhead_pkey ON landscape.management_overhead USING btree (id)`

## market_activity
**Row Count (estimated):** 9392
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('market_activity_id_seq'::regclass) | — |
| msa_code | character varying(10) | NO | — | — |
| source | character varying(50) | NO | — | — |
| metric_type | character varying(50) | NO | — | — |
| geography_type | character varying(50) | NO | — | — |
| geography_name | character varying(100) | NO | — | — |
| period_type | character varying(20) | NO | — | — |
| period_end_date | date | NO | — | — |
| value | integer | NO | — | — |
| notes | text | YES | — | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_market_activity_geo_type` — `CREATE INDEX idx_market_activity_geo_type ON landscape.market_activity USING btree (msa_code, geography_type)`
- `idx_market_activity_lookup` — `CREATE INDEX idx_market_activity_lookup ON landscape.market_activity USING btree (msa_code, geography_name, period_end_date DESC)`
- `idx_market_activity_period` — `CREATE INDEX idx_market_activity_period ON landscape.market_activity USING btree (period_end_date DESC)`
- `idx_market_activity_source` — `CREATE INDEX idx_market_activity_source ON landscape.market_activity USING btree (source, metric_type)`
- `market_activity_msa_code_source_metric_type_geography_type__key` — `CREATE UNIQUE INDEX market_activity_msa_code_source_metric_type_geography_type__key ON landscape.market_activity USING btree (msa_code, source, metric_type, geography_type, geography_name, period_end_date)`
- `market_activity_pkey` — `CREATE UNIQUE INDEX market_activity_pkey ON landscape.market_activity USING btree (id)`

## market_assumptions
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| project_id | integer | NO | — | — |
| commission_basis | text | YES | — | — |
| demand_unit | text | YES | — | — |
| uom | text | YES | — | — |
| updated_at | timestamp with time zone | NO | now() | — |
| lu_type_code | character varying(50) | YES | — | — |
| price_per_unit | numeric(15,2) | YES | — | — |
| unit_of_measure | character varying(20) | YES | — | — |
| inflation_type | character varying(50) | YES | — | — |
| dvl_per_year | numeric(15,2) | YES | — | — |
| dvl_per_quarter | numeric(15,2) | YES | — | — |
| dvl_per_month | numeric(15,2) | YES | — | — |

**Indexes:**
- `idx_market_assumptions_dvl_timeseries` — `CREATE INDEX idx_market_assumptions_dvl_timeseries ON landscape.market_assumptions USING btree (project_id, dvl_per_year, dvl_per_quarter, dvl_per_month)`
- `idx_market_assumptions_project_lutype` — `CREATE INDEX idx_market_assumptions_project_lutype ON landscape.market_assumptions USING btree (project_id, lu_type_code)`
- `market_assumptions_pkey` — `CREATE UNIQUE INDEX market_assumptions_pkey ON landscape.market_assumptions USING btree (project_id)`

## market_competitive_project_exclusions
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('market_competitive_project_exclusions_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| source_project_id | character varying(100) | NO | — | — |
| excluded_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| excluded_reason | character varying(200) | YES | — | — |

**Indexes:**
- `idx_comp_exclusions_project` — `CREATE INDEX idx_comp_exclusions_project ON landscape.market_competitive_project_exclusions USING btree (project_id)`
- `market_competitive_project_exc_project_id_source_project_id_key` — `CREATE UNIQUE INDEX market_competitive_project_exc_project_id_source_project_id_key ON landscape.market_competitive_project_exclusions USING btree (project_id, source_project_id)`
- `market_competitive_project_exclusions_pkey` — `CREATE UNIQUE INDEX market_competitive_project_exclusions_pkey ON landscape.market_competitive_project_exclusions USING btree (id)`

## market_competitive_project_products
**Row Count (estimated):** 25
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('market_competitive_project_products_id_seq'::regclass) | — |
| competitive_project_id | integer | NO | — | market_competitive_projects.id |
| product_id | integer | YES | — | res_lot_product.product_id |
| lot_width_ft | integer | YES | — | — |
| lot_dimensions | character varying(20) | YES | — | — |
| unit_size_min_sf | integer | YES | — | — |
| unit_size_max_sf | integer | YES | — | — |
| unit_size_avg_sf | integer | YES | — | — |
| price_min | numeric(12,2) | YES | — | — |
| price_max | numeric(12,2) | YES | — | — |
| price_avg | numeric(12,2) | YES | — | — |
| price_per_sf_avg | numeric(8,2) | YES | — | — |
| units_planned | integer | YES | — | — |
| units_sold | integer | YES | — | — |
| units_remaining | integer | YES | — | — |
| qmi_count | integer | YES | — | — |
| sales_rate_monthly | numeric(6,2) | YES | — | — |
| sales_rate_3m_avg | numeric(6,2) | YES | — | — |
| sales_rate_6m_avg | numeric(6,2) | YES | — | — |
| mos_vdl | numeric(6,2) | YES | — | — |
| mos_inventory | numeric(6,2) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_comp_products_competitive_project` — `CREATE INDEX idx_comp_products_competitive_project ON landscape.market_competitive_project_products USING btree (competitive_project_id)`
- `idx_comp_products_lot_width` — `CREATE INDEX idx_comp_products_lot_width ON landscape.market_competitive_project_products USING btree (lot_width_ft)`
- `idx_comp_products_project_product` — `CREATE UNIQUE INDEX idx_comp_products_project_product ON landscape.market_competitive_project_products USING btree (competitive_project_id, product_id) WHERE (product_id IS NOT NULL)`
- `idx_comp_products_project_width` — `CREATE UNIQUE INDEX idx_comp_products_project_width ON landscape.market_competitive_project_products USING btree (competitive_project_id, lot_width_ft) WHERE ((product_id IS NULL) AND (lot_width_ft IS NOT NULL))`
- `market_competitive_project_products_pkey` — `CREATE UNIQUE INDEX market_competitive_project_products_pkey ON landscape.market_competitive_project_products USING btree (id)`

## market_competitive_projects
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('market_competitive_projects_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| master_plan_name | character varying(200) | YES | — | — |
| comp_name | character varying(200) | NO | — | — |
| builder_name | character varying(200) | YES | — | — |
| comp_address | text | YES | — | — |
| latitude | numeric(10,8) | YES | — | — |
| longitude | numeric(11,8) | YES | — | — |
| city | character varying(100) | YES | — | — |
| zip_code | character varying(10) | YES | — | — |
| total_units | integer | YES | — | — |
| price_min | numeric(15,2) | YES | — | — |
| price_max | numeric(15,2) | YES | — | — |
| absorption_rate_monthly | numeric(8,2) | YES | — | — |
| status | character varying(50) | YES | 'selling'::character varying | — |
| data_source | character varying(50) | YES | 'manual'::character varying | — |
| source_url | text | YES | — | — |
| notes | text | YES | — | — |
| source_project_id | character varying(100) | YES | — | — |
| effective_date | date | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_market_comps_project` — `CREATE INDEX idx_market_comps_project ON landscape.market_competitive_projects USING btree (project_id)`
- `idx_market_comps_project_source_unique` — `CREATE UNIQUE INDEX idx_market_comps_project_source_unique ON landscape.market_competitive_projects USING btree (project_id, source_project_id) WHERE (source_project_id IS NOT NULL)`
- `idx_market_comps_source_project` — `CREATE INDEX idx_market_comps_source_project ON landscape.market_competitive_projects USING btree (source_project_id)`
- `market_competitive_projects_pkey` — `CREATE UNIQUE INDEX market_competitive_projects_pkey ON landscape.market_competitive_projects USING btree (id)`

## mkt_data_source_registry
**Row Count (estimated):** 3
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| source_id | integer | NO | — | — |
| source_code | character varying(50) | NO | — | — |
| source_name | character varying(200) | NO | — | — |
| source_type | character varying(50) | NO | — | — |
| collection_method | text | YES | — | — |
| update_frequency | character varying(50) | YES | — | — |
| typical_lag_days | integer | YES | — | — |
| coverage_geography | character varying(200) | YES | — | — |
| coverage_description | text | YES | — | — |
| field_definitions | jsonb | NO | — | — |
| known_limitations | text | YES | — | — |
| caveats | text | YES | — | — |
| is_authoritative_for | jsonb | NO | — | — |
| website_url | text | YES | — | — |
| documentation_url | text | YES | — | — |
| is_active | boolean | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |

**Indexes:**
- `mkt_data_source_registry_pkey` — `CREATE UNIQUE INDEX mkt_data_source_registry_pkey ON landscape.mkt_data_source_registry USING btree (source_id)`
- `mkt_data_source_registry_source_code_609b59ab_like` — `CREATE INDEX mkt_data_source_registry_source_code_609b59ab_like ON landscape.mkt_data_source_registry USING btree (source_code varchar_pattern_ops)`
- `mkt_data_source_registry_source_code_key` — `CREATE UNIQUE INDEX mkt_data_source_registry_source_code_key ON landscape.mkt_data_source_registry USING btree (source_code)`

## mkt_new_home_project
**Row Count (estimated):** 685
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| record_id | bigint | NO | — | — |
| source_project_id | character varying(100) | YES | — | — |
| source_subdivision_id | character varying(100) | YES | — | — |
| effective_date | date | NO | — | — |
| source_file | character varying(200) | YES | — | — |
| survey_period | character varying(20) | YES | — | — |
| project_name | character varying(200) | NO | — | — |
| master_plan_name | character varying(200) | YES | — | — |
| master_plan_id | character varying(50) | YES | — | — |
| master_plan_developer | character varying(200) | YES | — | — |
| builder_name | character varying(200) | YES | — | — |
| parent_builder | character varying(200) | YES | — | — |
| status | character varying(30) | YES | — | — |
| product_type | character varying(50) | YES | — | — |
| product_style | character varying(50) | YES | — | — |
| is_active_adult | boolean | NO | — | — |
| characteristics | text | YES | — | — |
| lot_size_sf | integer | YES | — | — |
| lot_width_ft | integer | YES | — | — |
| lot_depth_ft | integer | YES | — | — |
| lot_dimensions | character varying(20) | YES | — | — |
| unit_size_min_sf | integer | YES | — | — |
| unit_size_max_sf | integer | YES | — | — |
| unit_size_avg_sf | integer | YES | — | — |
| price_min | numeric(12,2) | YES | — | — |
| price_max | numeric(12,2) | YES | — | — |
| price_avg | numeric(12,2) | YES | — | — |
| price_per_sf_avg | numeric(8,2) | YES | — | — |
| price_change_date | date | YES | — | — |
| units_planned | integer | YES | — | — |
| units_sold | integer | YES | — | — |
| units_remaining | integer | YES | — | — |
| qmi_count | integer | YES | — | — |
| open_date | date | YES | — | — |
| sold_out_date | date | YES | — | — |
| sales_rate_monthly | numeric(6,2) | YES | — | — |
| sales_rate_3m_avg | numeric(6,2) | YES | — | — |
| sales_rate_6m_avg | numeric(6,2) | YES | — | — |
| sales_rate_12m_avg | numeric(6,2) | YES | — | — |
| sales_change_date | date | YES | — | — |
| annual_starts | integer | YES | — | — |
| annual_closings | integer | YES | — | — |
| quarterly_starts | integer | YES | — | — |
| quarterly_closings | integer | YES | — | — |
| pipeline_excavation | integer | YES | — | — |
| pipeline_survey_stakes | integer | YES | — | — |
| pipeline_street_paving | integer | YES | — | — |
| pipeline_streets_in | integer | YES | — | — |
| pipeline_vdl | integer | YES | — | — |
| pipeline_vacant_land | integer | YES | — | — |
| pipeline_under_construction | integer | YES | — | — |
| pipeline_finished_vacant | integer | YES | — | — |
| models_count | integer | YES | — | — |
| occupied_count | integer | YES | — | — |
| future_inventory_count | integer | YES | — | — |
| mos_vdl | numeric(6,2) | YES | — | — |
| mos_inventory | numeric(6,2) | YES | — | — |
| mos_finished_vacant | numeric(6,2) | YES | — | — |
| incentive_qmi_pct | numeric(5,2) | YES | — | — |
| incentive_qmi_amt | numeric(12,2) | YES | — | — |
| incentive_qmi_type | character varying(100) | YES | — | — |
| incentive_tbb_pct | numeric(5,2) | YES | — | — |
| incentive_tbb_amt | numeric(12,2) | YES | — | — |
| incentive_tbb_type | character varying(100) | YES | — | — |
| incentive_broker_pct | numeric(5,2) | YES | — | — |
| incentive_broker_amt | numeric(12,2) | YES | — | — |
| incentive_broker_type | character varying(100) | YES | — | — |
| hoa_fee_monthly | numeric(8,2) | YES | — | — |
| hoa_fee_2_monthly | numeric(8,2) | YES | — | — |
| hoa_fee_per_sqft | numeric(6,4) | YES | — | — |
| assessment_rate | numeric(5,3) | YES | — | — |
| assessment_description | text | YES | — | — |
| latitude | numeric(10,6) | YES | — | — |
| longitude | numeric(11,6) | YES | — | — |
| address | character varying(300) | YES | — | — |
| city | character varying(100) | YES | — | — |
| zip_code | character varying(10) | YES | — | — |
| county | character varying(100) | YES | — | — |
| county_fips | integer | YES | — | — |
| cbsa_name | character varying(100) | YES | — | — |
| cbsa_code | integer | YES | — | — |
| state | character varying(2) | YES | — | — |
| boundary_names | text | YES | — | — |
| school_district | character varying(200) | YES | — | — |
| school_elementary | text | YES | — | — |
| school_rating_elementary | character varying(50) | YES | — | — |
| school_middle | text | YES | — | — |
| school_rating_middle | character varying(50) | YES | — | — |
| school_high | text | YES | — | — |
| school_rating_high | character varying(50) | YES | — | — |
| website_url | text | YES | — | — |
| office_phone | character varying(20) | YES | — | — |
| lu_family_id | bigint | YES | — | — |
| lu_density_id | bigint | YES | — | — |
| lu_type_id | bigint | YES | — | — |
| lu_product_id | bigint | YES | — | — |
| lu_linkage_method | character varying(20) | YES | — | — |
| lu_linkage_confidence | numeric(3,2) | YES | — | — |
| ingestion_timestamp | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| source_id | integer | NO | — | mkt_data_source_registry.source_id |

**Indexes:**
- `idx_mkt_nhp_builder` — `CREATE INDEX idx_mkt_nhp_builder ON landscape.mkt_new_home_project USING btree (builder_name)`
- `idx_mkt_nhp_cbsa` — `CREATE INDEX idx_mkt_nhp_cbsa ON landscape.mkt_new_home_project USING btree (cbsa_code)`
- `idx_mkt_nhp_city` — `CREATE INDEX idx_mkt_nhp_city ON landscape.mkt_new_home_project USING btree (city)`
- `idx_mkt_nhp_effective_date` — `CREATE INDEX idx_mkt_nhp_effective_date ON landscape.mkt_new_home_project USING btree (effective_date)`
- `idx_mkt_nhp_location` — `CREATE INDEX idx_mkt_nhp_location ON landscape.mkt_new_home_project USING btree (latitude, longitude)`
- `idx_mkt_nhp_lot_width` — `CREATE INDEX idx_mkt_nhp_lot_width ON landscape.mkt_new_home_project USING btree (lot_width_ft)`
- `idx_mkt_nhp_lu_product` — `CREATE INDEX idx_mkt_nhp_lu_product ON landscape.mkt_new_home_project USING btree (lu_product_id)`
- `idx_mkt_nhp_lu_type` — `CREATE INDEX idx_mkt_nhp_lu_type ON landscape.mkt_new_home_project USING btree (lu_type_id)`
- `idx_mkt_nhp_master_plan` — `CREATE INDEX idx_mkt_nhp_master_plan ON landscape.mkt_new_home_project USING btree (master_plan_name)`
- `idx_mkt_nhp_project_name` — `CREATE INDEX idx_mkt_nhp_project_name ON landscape.mkt_new_home_project USING btree (project_name)`
- `idx_mkt_nhp_source` — `CREATE INDEX idx_mkt_nhp_source ON landscape.mkt_new_home_project USING btree (source_id)`
- `idx_mkt_nhp_status` — `CREATE INDEX idx_mkt_nhp_status ON landscape.mkt_new_home_project USING btree (status)`
- `mkt_new_home_project_pkey` — `CREATE UNIQUE INDEX mkt_new_home_project_pkey ON landscape.mkt_new_home_project USING btree (record_id)`
- `mkt_new_home_project_source_id_cbf21c81` — `CREATE INDEX mkt_new_home_project_source_id_cbf21c81 ON landscape.mkt_new_home_project USING btree (source_id)`
- `uq_mkt_project_source_date` — `CREATE UNIQUE INDEX uq_mkt_project_source_date ON landscape.mkt_new_home_project USING btree (source_id, source_project_id, effective_date)`

## mkt_permit_history
**Row Count (estimated):** 8893
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| record_id | bigint | NO | — | — |
| source_file | character varying(200) | YES | — | — |
| permit_month | date | NO | — | — |
| jurisdiction_name | character varying(100) | NO | — | — |
| jurisdiction_type | character varying(50) | YES | — | — |
| county | character varying(100) | YES | — | — |
| state | character varying(2) | NO | — | — |
| cbsa_code | integer | YES | — | — |
| permits_sf | integer | YES | — | — |
| permits_mf | integer | YES | — | — |
| permits_total | integer | YES | — | — |
| permits_detached | integer | YES | — | — |
| permits_attached | integer | YES | — | — |
| permits_custom | integer | YES | — | — |
| ingestion_timestamp | timestamp with time zone | NO | — | — |
| source_id | integer | NO | — | mkt_data_source_registry.source_id |

**Indexes:**
- `idx_mkt_permit_jurisdiction` — `CREATE INDEX idx_mkt_permit_jurisdiction ON landscape.mkt_permit_history USING btree (jurisdiction_name)`
- `idx_mkt_permit_month` — `CREATE INDEX idx_mkt_permit_month ON landscape.mkt_permit_history USING btree (permit_month)`
- `idx_mkt_permit_source` — `CREATE INDEX idx_mkt_permit_source ON landscape.mkt_permit_history USING btree (source_id)`
- `mkt_permit_history_pkey` — `CREATE UNIQUE INDEX mkt_permit_history_pkey ON landscape.mkt_permit_history USING btree (record_id)`
- `mkt_permit_history_source_id_4d1eb402` — `CREATE INDEX mkt_permit_history_source_id_4d1eb402 ON landscape.mkt_permit_history USING btree (source_id)`
- `uq_mkt_permit_month_jurisdiction` — `CREATE UNIQUE INDEX uq_mkt_permit_month_jurisdiction ON landscape.mkt_permit_history USING btree (source_id, permit_month, jurisdiction_name)`

## mutation_audit_log
**Row Count (estimated):** 55
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| audit_id | integer | NO | nextval('mutation_audit_log_audit_id_seq'::regclass) | — |
| mutation_id | uuid | YES | — | — |
| project_id | integer | NO | — | — |
| mutation_type | character varying(50) | NO | — | — |
| table_name | character varying(100) | NO | — | — |
| field_name | character varying(100) | YES | — | — |
| record_id | character varying(100) | YES | — | — |
| old_value | jsonb | YES | — | — |
| new_value | jsonb | YES | — | — |
| action | character varying(20) | NO | — | — |
| error_message | text | YES | — | — |
| reason | text | YES | — | — |
| source_message_id | character varying(100) | YES | — | — |
| source_documents | jsonb | YES | — | — |
| initiated_by | character varying(50) | YES | 'landscaper_ai'::character varying | — |
| confirmed_by | character varying(255) | YES | — | — |
| created_at | timestamp with time zone | NO | now() | — |

**Indexes:**
- `idx_mutation_audit_mutation_id` — `CREATE INDEX idx_mutation_audit_mutation_id ON landscape.mutation_audit_log USING btree (mutation_id) WHERE (mutation_id IS NOT NULL)`
- `idx_mutation_audit_project_time` — `CREATE INDEX idx_mutation_audit_project_time ON landscape.mutation_audit_log USING btree (project_id, created_at DESC)`
- `idx_mutation_audit_table_record` — `CREATE INDEX idx_mutation_audit_table_record ON landscape.mutation_audit_log USING btree (table_name, record_id) WHERE (record_id IS NOT NULL)`
- `mutation_audit_log_pkey` — `CREATE UNIQUE INDEX mutation_audit_log_pkey ON landscape.mutation_audit_log USING btree (audit_id)`

**Check Constraints:**
- `CHECK (((action)::text = ANY ((ARRAY['proposed'::character varying, 'confirmed'::character varying, 'rejected'::character varying, 'expired'::character varying, 'executed'::character varying, 'failed'::character varying])::text[])))`

## opex_account_migration_map
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| old_account_id | integer | NO | — | — |
| new_category_id | integer | NO | — | — |
| account_number | character varying(20) | YES | — | — |
| account_name | character varying(255) | YES | — | — |
| migrated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `opex_account_migration_map_pkey` — `CREATE UNIQUE INDEX opex_account_migration_map_pkey ON landscape.opex_account_migration_map USING btree (old_account_id)`

## opex_benchmark
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('opex_benchmark_id_seq'::regclass) | — |
| source | character varying(50) | NO | — | — |
| source_year | integer | NO | — | — |
| report_name | character varying(255) | YES | — | — |
| property_type | character varying(50) | NO | — | — |
| property_subtype | character varying(100) | YES | — | — |
| geographic_scope | character varying(50) | NO | — | — |
| geography_name | character varying(100) | YES | — | — |
| expense_category | character varying(100) | NO | — | — |
| expense_subcategory | character varying(100) | YES | — | — |
| per_unit_amount | numeric(12,2) | YES | — | — |
| per_sf_amount | numeric(10,4) | YES | — | — |
| pct_of_egi | numeric(5,2) | YES | — | — |
| pct_of_gpi | numeric(5,2) | YES | — | — |
| sample_size | integer | YES | — | — |
| sample_units | integer | YES | — | — |
| notes | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_opex_benchmark_category` — `CREATE INDEX idx_opex_benchmark_category ON landscape.opex_benchmark USING btree (expense_category, expense_subcategory)`
- `idx_opex_benchmark_geography` — `CREATE INDEX idx_opex_benchmark_geography ON landscape.opex_benchmark USING btree (geographic_scope, geography_name)`
- `idx_opex_benchmark_property` — `CREATE INDEX idx_opex_benchmark_property ON landscape.opex_benchmark USING btree (property_type, property_subtype)`
- `idx_opex_benchmark_source_year` — `CREATE INDEX idx_opex_benchmark_source_year ON landscape.opex_benchmark USING btree (source, source_year)`
- `opex_benchmark_pkey` — `CREATE UNIQUE INDEX opex_benchmark_pkey ON landscape.opex_benchmark USING btree (id)`
- `opex_benchmark_source_source_year_property_type_geographic__key` — `CREATE UNIQUE INDEX opex_benchmark_source_source_year_property_type_geographic__key ON landscape.opex_benchmark USING btree (source, source_year, property_type, geographic_scope, geography_name, expense_category, expense_subcategory)`

## opex_label_mapping
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| mapping_id | integer | NO | nextval('opex_label_mapping_mapping_id_seq'::regclass) | — |
| source_label | character varying(255) | NO | — | — |
| normalized_label | character varying(255) | YES | — | — |
| parent_category | character varying(100) | NO | — | — |
| target_field | character varying(100) | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| created_by | bigint | YES | — | — |
| times_used | integer | YES | 1 | — |

**Indexes:**
- `opex_label_mapping_pkey` — `CREATE UNIQUE INDEX opex_label_mapping_pkey ON landscape.opex_label_mapping USING btree (mapping_id)`
- `opex_label_mapping_source_label_key` — `CREATE UNIQUE INDEX opex_label_mapping_source_label_key ON landscape.opex_label_mapping USING btree (source_label)`

## pending_mutations
**Row Count (estimated):** 24
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| mutation_id | uuid | NO | gen_random_uuid() | — |
| project_id | integer | NO | — | tbl_project.project_id |
| mutation_type | character varying(50) | NO | — | — |
| table_name | character varying(100) | NO | — | — |
| field_name | character varying(100) | YES | — | — |
| record_id | character varying(100) | YES | — | — |
| current_value | jsonb | YES | — | — |
| proposed_value | jsonb | NO | — | — |
| reason | text | NO | — | — |
| source_message_id | character varying(100) | YES | — | — |
| source_documents | jsonb | YES | '[]'::jsonb | — |
| is_high_risk | boolean | NO | false | — |
| status | character varying(20) | NO | 'pending'::character varying | — |
| created_at | timestamp with time zone | NO | now() | — |
| expires_at | timestamp with time zone | NO | (now() + '01:00:00'::interval) | — |
| resolved_at | timestamp with time zone | YES | — | — |
| resolved_by | character varying(255) | YES | — | — |
| batch_id | uuid | YES | — | — |
| sequence_in_batch | integer | YES | 0 | — |

**Indexes:**
- `idx_pending_mutations_batch` — `CREATE INDEX idx_pending_mutations_batch ON landscape.pending_mutations USING btree (batch_id) WHERE (batch_id IS NOT NULL)`
- `idx_pending_mutations_expires` — `CREATE INDEX idx_pending_mutations_expires ON landscape.pending_mutations USING btree (expires_at) WHERE ((status)::text = 'pending'::text)`
- `idx_pending_mutations_message` — `CREATE INDEX idx_pending_mutations_message ON landscape.pending_mutations USING btree (source_message_id) WHERE (source_message_id IS NOT NULL)`
- `idx_pending_mutations_project_status` — `CREATE INDEX idx_pending_mutations_project_status ON landscape.pending_mutations USING btree (project_id, status)`
- `pending_mutations_pkey` — `CREATE UNIQUE INDEX pending_mutations_pkey ON landscape.pending_mutations USING btree (mutation_id)`

**Check Constraints:**
- `CHECK (((mutation_type)::text = ANY ((ARRAY['field_update'::character varying, 'bulk_update'::character varying, 'opex_upsert'::character varying, 'rental_comp_upsert'::character varying, 'assumption_upsert'::character varying, 'rent_roll_batch'::character varying, 'comparable_upsert'::character varying, 'comparable_delete'::character varying, 'capital_stack_upsert'::character varying, 'capital_stack_delete'::character varying, 'budget_upsert'::character varying, 'budget_delete'::character varying])::text[])))`
- `CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'rejected'::character varying, 'expired'::character varying, 'superseded'::character varying])::text[])))`

## planning_doc
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| doc_id | bigint | NO | — | — |
| project_id | bigint | YES | — | — |
| jurisdiction_id | bigint | YES | — | — |
| doc_type | text | NO | — | — |
| title | text | NO | — | — |
| doc_url | text | YES | — | — |
| eff_date | date | YES | — | — |
| section_ref | text | YES | — | — |
| notes | text | YES | — | — |

**Indexes:**
- `planning_doc_pkey` — `CREATE UNIQUE INDEX planning_doc_pkey ON landscape.planning_doc USING btree (doc_id)`

**Check Constraints:**
- `CHECK ((doc_type = ANY (ARRAY['PAD'::text, 'DA'::text, 'CODE'::text, 'OTHER'::text])))`

## project_boundaries
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| boundary_id | integer | NO | nextval('project_boundaries_boundary_id_seq'::regclass) | — |
| project_id | integer | NO | — | tbl_project.project_id |
| parcel_count | integer | NO | — | — |
| total_acres | numeric(10,4) | NO | — | — |
| dissolved_geometry | USER-DEFINED | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_project_boundaries_geometry` — `CREATE INDEX idx_project_boundaries_geometry ON landscape.project_boundaries USING gist (dissolved_geometry)`
- `idx_project_boundaries_project_id` — `CREATE INDEX idx_project_boundaries_project_id ON landscape.project_boundaries USING btree (project_id)`
- `project_boundaries_pkey` — `CREATE UNIQUE INDEX project_boundaries_pkey ON landscape.project_boundaries USING btree (boundary_id)`

## project_jurisdiction_mapping
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| mapping_id | bigint | NO | — | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| glossary_id | uuid | YES | — | glossary_zoning.glossary_id |
| family_name | text | YES | — | — |
| density_code | text | YES | — | density_classification.code |
| type_code | text | YES | — | — |
| user_approved | boolean | YES | false | — |
| notes | text | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `project_jurisdiction_mapping_pkey` — `CREATE UNIQUE INDEX project_jurisdiction_mapping_pkey ON landscape.project_jurisdiction_mapping USING btree (mapping_id)`

## project_parcel_boundaries
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| parcel_boundary_id | integer | NO | nextval('project_parcel_boundaries_parcel_boundary_id_seq'::regclass) | — |
| boundary_id | integer | NO | — | project_boundaries.boundary_id |
| project_id | integer | NO | — | tbl_project.project_id |
| parcel_id | text | NO | — | — |
| geometry | USER-DEFINED | NO | — | — |
| gross_acres | numeric(10,4) | YES | — | — |
| owner_name | text | YES | — | — |
| site_address | text | YES | — | — |
| created_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_project_parcel_boundaries_boundary_id` — `CREATE INDEX idx_project_parcel_boundaries_boundary_id ON landscape.project_parcel_boundaries USING btree (boundary_id)`
- `idx_project_parcel_boundaries_geometry` — `CREATE INDEX idx_project_parcel_boundaries_geometry ON landscape.project_parcel_boundaries USING gist (geometry)`
- `idx_project_parcel_boundaries_parcel_id` — `CREATE INDEX idx_project_parcel_boundaries_parcel_id ON landscape.project_parcel_boundaries USING btree (parcel_id)`
- `idx_project_parcel_boundaries_project_id` — `CREATE INDEX idx_project_parcel_boundaries_project_id ON landscape.project_parcel_boundaries USING btree (project_id)`
- `project_parcel_boundaries_pkey` — `CREATE UNIQUE INDEX project_parcel_boundaries_pkey ON landscape.project_parcel_boundaries USING btree (parcel_boundary_id)`

## report_templates
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| template_name | character varying(200) | NO | — | — |
| description | text | YES | — | — |
| output_format | character varying(20) | NO | — | — |
| assigned_tabs | jsonb | NO | — | — |
| sections | jsonb | NO | — | — |
| is_active | boolean | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| created_by | text | YES | — | — |

**Indexes:**
- `idx_report_active` — `CREATE INDEX idx_report_active ON landscape.report_templates USING btree (is_active)`
- `report_templates_pkey` — `CREATE UNIQUE INDEX report_templates_pkey ON landscape.report_templates USING btree (id)`

## res_lot_product
**Row Count (estimated):** 40
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| product_id | bigint | NO | — | — |
| code | text | NO | — | — |
| lot_w_ft | integer | NO | — | — |
| lot_d_ft | integer | NO | — | — |
| lot_area_sf | integer | YES | — | — |
| type_id | bigint | YES | — | lu_type.type_id |
| is_active | boolean | YES | true | — |
| created_at | timestamp without time zone | YES | now() | — |
| updated_at | timestamp without time zone | YES | now() | — |

**Indexes:**
- `idx_res_lot_product_active` — `CREATE INDEX idx_res_lot_product_active ON landscape.res_lot_product USING btree (is_active)`
- `idx_res_lot_product_type` — `CREATE INDEX idx_res_lot_product_type ON landscape.res_lot_product USING btree (type_id)`
- `res_lot_product_code_key` — `CREATE UNIQUE INDEX res_lot_product_code_key ON landscape.res_lot_product USING btree (code)`
- `res_lot_product_pkey` — `CREATE UNIQUE INDEX res_lot_product_pkey ON landscape.res_lot_product USING btree (product_id)`

## sale_names
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('sale_names_id_seq'::regclass) | — |
| project_id | bigint | NO | — | tbl_project.project_id |
| sale_date | date | NO | — | — |
| sale_name | character varying(200) | YES | — | — |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP | — |

**Indexes:**
- `idx_sale_names_project` — `CREATE INDEX idx_sale_names_project ON landscape.sale_names USING btree (project_id)`
- `sale_names_pkey` — `CREATE UNIQUE INDEX sale_names_pkey ON landscape.sale_names USING btree (id)`
- `sale_names_project_id_sale_date_key` — `CREATE UNIQUE INDEX sale_names_project_id_sale_date_key ON landscape.sale_names USING btree (project_id, sale_date)`

## spatial_ref_sys
**Row Count (estimated):** 8500
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| srid | integer | NO | — | — |
| auth_name | character varying(256) | YES | — | — |
| auth_srid | integer | YES | — | — |
| srtext | character varying(2048) | YES | — | — |
| proj4text | character varying(2048) | YES | — | — |

**Indexes:**
- `spatial_ref_sys_pkey` — `CREATE UNIQUE INDEX spatial_ref_sys_pkey ON landscape.spatial_ref_sys USING btree (srid)`

**Check Constraints:**
- `CHECK (((srid > 0) AND (srid <= 998999)))`

## tester_feedback
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | bigint | NO | — | — |
| page_url | character varying(500) | NO | — | — |
| page_path | character varying(255) | NO | — | — |
| project_id | integer | YES | — | — |
| project_name | character varying(255) | YES | — | — |
| feedback_type | character varying(20) | NO | — | — |
| message | text | NO | — | — |
| admin_notes | text | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |
| user_id | bigint | NO | — | auth_user.id |
| status | character varying(20) | NO | — | — |
| internal_id | uuid | NO | — | — |
| category | character varying(50) | YES | — | — |
| affected_module | character varying(100) | YES | — | — |
| landscaper_summary | text | YES | — | — |
| landscaper_raw_chat | jsonb | NO | — | — |
| browser_context | jsonb | NO | — | — |
| duplicate_of_id | bigint | YES | — | tester_feedback.id |
| report_count | integer | NO | — | — |
| admin_response | text | YES | — | — |
| admin_responded_at | timestamp with time zone | YES | — | — |

**Indexes:**
- `idx_feedback_category` — `CREATE INDEX idx_feedback_category ON landscape.tester_feedback USING btree (category)`
- `idx_feedback_internal_id` — `CREATE INDEX idx_feedback_internal_id ON landscape.tester_feedback USING btree (internal_id)`
- `idx_feedback_status` — `CREATE INDEX idx_feedback_status ON landscape.tester_feedback USING btree (status)`
- `tester_feedback_duplicate_of_id_d09357c7` — `CREATE INDEX tester_feedback_duplicate_of_id_d09357c7 ON landscape.tester_feedback USING btree (duplicate_of_id)`
- `tester_feedback_pkey` — `CREATE UNIQUE INDEX tester_feedback_pkey ON landscape.tester_feedback USING btree (id)`
- `tester_feedback_user_id_70f5a728` — `CREATE INDEX tester_feedback_user_id_70f5a728 ON landscape.tester_feedback USING btree (user_id)`

**Check Constraints:**
- `CHECK ((report_count >= 0))`

## type_lot_product
**Row Count (estimated):** 80
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| type_id | bigint | NO | — | lu_type.type_id |
| product_id | bigint | NO | — | res_lot_product.product_id |

**Indexes:**
- `subtype_lot_product_pkey` — `CREATE UNIQUE INDEX subtype_lot_product_pkey ON landscape.type_lot_product USING btree (type_id, product_id)`

## user_profile
**Row Count (estimated):** 0
**Last Modified Column:** —

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('user_profile_id_seq'::regclass) | — |
| user_id | integer | NO | — | auth_user.id |
| bio | text | YES | — | — |
| avatar_url | character varying(200) | YES | — | — |
| timezone | character varying(50) | YES | 'UTC'::character varying | — |
| preferences | jsonb | YES | '{}'::jsonb | — |

**Indexes:**
- `user_profile_pkey` — `CREATE UNIQUE INDEX user_profile_pkey ON landscape.user_profile USING btree (id)`
- `user_profile_user_id_key` — `CREATE UNIQUE INDEX user_profile_user_id_key ON landscape.user_profile USING btree (user_id)`

## user_settings
**Row Count (estimated):** 0
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| user_id | integer | NO | — | — |
| tier_level | character varying(20) | NO | — | — |
| created_at | timestamp with time zone | NO | — | — |
| updated_at | timestamp with time zone | NO | — | — |

**Indexes:**
- `user_settings_pkey` — `CREATE UNIQUE INDEX user_settings_pkey ON landscape.user_settings USING btree (user_id)`

## zonda_subdivisions
**Row Count (estimated):** 704
**Last Modified Column:** updated_at

| Column | Type | Nullable | Default | FK Reference |
|--------|------|----------|---------|--------------|
| id | integer | NO | nextval('zonda_subdivisions_id_seq'::regclass) | — |
| msa_code | character varying(10) | NO | '38060'::character varying | — |
| project_name | character varying(200) | NO | — | — |
| builder | character varying(200) | YES | — | — |
| mpc | character varying(200) | YES | — | — |
| property_type | character varying(50) | YES | — | — |
| style | character varying(50) | YES | — | — |
| lot_size_sf | integer | YES | — | — |
| lot_width | integer | YES | — | — |
| lot_depth | integer | YES | — | — |
| product_code | character varying(20) | YES | — | — |
| units_sold | integer | YES | — | — |
| units_remaining | integer | YES | — | — |
| size_min_sf | integer | YES | — | — |
| size_max_sf | integer | YES | — | — |
| size_avg_sf | integer | YES | — | — |
| price_min | numeric(12,2) | YES | — | — |
| price_max | numeric(12,2) | YES | — | — |
| price_avg | numeric(12,2) | YES | — | — |
| latitude | numeric(10,6) | YES | — | — |
| longitude | numeric(10,6) | YES | — | — |
| special_features | text | YES | — | — |
| source_file | character varying(200) | YES | — | — |
| source_date | date | YES | — | — |
| created_at | timestamp with time zone | YES | now() | — |
| updated_at | timestamp with time zone | YES | now() | — |

**Indexes:**
- `idx_zonda_builder` — `CREATE INDEX idx_zonda_builder ON landscape.zonda_subdivisions USING btree (builder)`
- `idx_zonda_location` — `CREATE INDEX idx_zonda_location ON landscape.zonda_subdivisions USING btree (latitude, longitude)`
- `idx_zonda_mpc` — `CREATE INDEX idx_zonda_mpc ON landscape.zonda_subdivisions USING btree (mpc)`
- `idx_zonda_msa_lotwidth` — `CREATE INDEX idx_zonda_msa_lotwidth ON landscape.zonda_subdivisions USING btree (msa_code, lot_width)`
- `idx_zonda_price` — `CREATE INDEX idx_zonda_price ON landscape.zonda_subdivisions USING btree (msa_code, price_avg)`
- `zonda_subdivisions_msa_code_project_name_product_code_key` — `CREATE UNIQUE INDEX zonda_subdivisions_msa_code_project_name_product_code_key ON landscape.zonda_subdivisions USING btree (msa_code, project_name, product_code)`
- `zonda_subdivisions_pkey` — `CREATE UNIQUE INDEX zonda_subdivisions_pkey ON landscape.zonda_subdivisions USING btree (id)`

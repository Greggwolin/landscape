# Duplicate Index Audit

Source: landscape_rich_schema_2026-01-06.json

Duplicate groups found: 34
Indexes dropped: 35
Groups with constraint-owned keeper: 23

| Table | Normalized Definition | Keeper | Dropped | Constraint-Owned Keeper | Notes |
| --- | --- | --- | --- | --- | --- |
| core_doc_folder | ON landscape.core_doc_folder USING btree (path) | unique_folder_path | idx_folder_path | yes |  |
| core_fin_growth_rate_steps | ON landscape.core_fin_growth_rate_steps USING btree (set_id, step_number) | core_fin_growth_rate_steps_set_id_step_number_key | idx_growth_rate_steps_set | yes |  |
| knowledge_entities | ON landscape.knowledge_entities USING btree (canonical_name) | knowledge_entities_canonical_name_key | knowledge_e_canonic_a1a8d9_idx | yes |  |
| knowledge_facts | ON landscape.knowledge_facts USING btree (object_entity_id) | knowledge_f_object__4cb694_idx | knowledge_facts_object_entity_id_ca9e8ef5 | no |  |
| knowledge_sessions | ON landscape.knowledge_sessions USING btree (session_start) | knowledge_s_session_5b8f09_idx | knowledge_sessions_session_start_740f4f0a | no |  |
| land_use_pricing | ON landscape.land_use_pricing USING btree (project_id, lu_type_code, product_code) | land_use_pricing_project_lu_product_key | idx_land_use_pricing_project_product, land_use_pricing_project_type_product_key | yes |  |
| landscaper_activity | ON landscape.landscaper_activity USING btree (project_id, created_at DESC) | idx_landscaper_activity_created | idx_landscaper_activity_project_created | no |  |
| landscaper_activity | ON landscape.landscaper_activity USING btree (project_id, is_read) | idx_landscaper_activity_project_read | idx_landscaper_activity_read | no |  |
| mkt_new_home_project | ON landscape.mkt_new_home_project USING btree (source_id) | idx_mkt_nhp_source | mkt_new_home_project_source_id_cbf21c81 | no |  |
| mkt_permit_history | ON landscape.mkt_permit_history USING btree (source_id) | idx_mkt_permit_source | mkt_permit_history_source_id_4d1eb402 | no |  |
| tbl_additional_income | ON landscape.tbl_additional_income USING btree (lease_id) | uq_additional_income_lease | idx_additional_income_lease | yes |  |
| tbl_benchmark_contingency | ON landscape.tbl_benchmark_contingency USING btree (benchmark_id) | tbl_benchmark_contingency_pkey | idx_benchmark_contingency_benchmark_id | yes |  |
| tbl_budget_fact | ON landscape.tbl_budget_fact USING btree (project_id, category_name) | uq_budget_project_category | idx_budget_fact_project_category | yes |  |
| tbl_calculation_period | ON landscape.tbl_calculation_period USING btree (project_id, period_sequence) | uq_calculation_period_sequence | idx_calculation_period_project | yes |  |
| tbl_cashflow_summary | ON landscape.tbl_cashflow_summary USING btree (project_id, period_id) | uq_summary_project_period | idx_summary_project_period | yes |  |
| tbl_closing_event | ON landscape.tbl_closing_event USING btree (sale_event_id, closing_sequence) | tbl_closing_event_sale_event_id_closing_sequence_key | idx_closing_sequence | yes |  |
| tbl_cre_lease | ON landscape.tbl_cre_lease USING btree (tenant_id) | idx_cre_lease_tenant | idx_cre_lease_tenant_id | no |  |
| tbl_cre_space | ON landscape.tbl_cre_space USING btree (cre_property_id) | idx_cre_space_property | idx_cre_space_property_id | no |  |
| tbl_debt_draw_schedule | ON landscape.tbl_debt_draw_schedule USING btree (facility_id, period_id) | uq_debt_draw_facility_period | idx_debt_draw_facility | yes |  |
| tbl_debt_facility | ON landscape.tbl_debt_facility USING btree (project_id) | idx_debt_facility_project | idx_debt_project | no |  |
| tbl_landuse | ON landscape.tbl_landuse USING btree (landuse_code) | tbl_landuse_landuse_code_key | idx_tbl_landuse_code | yes |  |
| tbl_leasing_commission | ON landscape.tbl_leasing_commission USING btree (lease_id) | uq_commission_lease | idx_commission_lease | yes |  |
| tbl_measures | ON landscape.tbl_measures USING btree (measure_code) | tbl_measures_measure_code_key | idx_measures_code | yes |  |
| tbl_multifamily_property | ON landscape.tbl_multifamily_property USING btree (project_id) | tbl_multifamily_property_project_id_key | idx_multifamily_property_project | yes |  |
| tbl_opex_accounts_deprecated | ON landscape.tbl_opex_accounts_deprecated USING btree (account_number) | tbl_opex_accounts_account_number_key | idx_opex_accounts_number | yes |  |
| tbl_parcel_sale_assumptions | ON landscape.tbl_parcel_sale_assumptions USING btree (parcel_id) | tbl_parcel_sale_assumptions_parcel_id_key | idx_parcel_sale_assumptions_parcel | yes |  |
| tbl_project_assumption | ON landscape.tbl_project_assumption USING btree (project_id, assumption_key) | uq_project_assumption | uq_project_assumption_key | yes |  |
| tbl_recovery | ON landscape.tbl_recovery USING btree (lease_id) | uq_recovery_lease | idx_recovery_lease | yes |  |
| tbl_revenue_other | ON landscape.tbl_revenue_other USING btree (project_id) | uq_revenue_other_project | idx_other_income_project | yes |  |
| tbl_revenue_timing | ON landscape.tbl_revenue_timing USING btree (absorption_id, period_id) | uq_revenue_timing_period | idx_revenue_timing_absorption | yes |  |
| tbl_sale_settlement | ON landscape.tbl_sale_settlement USING btree (container_id) | idx_sale_settlement_container | idx_settlement_container | no |  |
| tbl_tenant_improvement | ON landscape.tbl_tenant_improvement USING btree (lease_id) | uq_ti_lease | idx_ti_lease | yes |  |
| tbl_uom_calculation_formulas | ON landscape.tbl_uom_calculation_formulas USING btree (uom_code) | tbl_uom_calculation_formulas_uom_code_key | idx_uom_formulas_code | yes |  |
| tbl_user_preference | ON landscape.tbl_user_preference USING btree (preference_key) | tbl_user_pr_prefere_c180c6_idx | tbl_user_preference_preference_key_328aa664 | no |  |

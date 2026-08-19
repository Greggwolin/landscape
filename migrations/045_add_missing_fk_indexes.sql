-- Migration: add missing FK indexes across landscape schema
-- Date: 2026-01-06
-- Intent: idempotent, non-breaking index additions for FK referencing columns
-- Notes: uses CREATE INDEX IF NOT EXISTS (no CONCURRENTLY)

CREATE INDEX IF NOT EXISTS idx_ai_ingestion_history__project_id ON landscape.ai_ingestion_history (project_id);
CREATE INDEX IF NOT EXISTS idx_core_doc__parcel_id ON landscape.core_doc (parcel_id);
CREATE INDEX IF NOT EXISTS idx_core_doc__parent_doc_id ON landscape.core_doc (parent_doc_id);
CREATE INDEX IF NOT EXISTS idx_core_doc__phase_id ON landscape.core_doc (phase_id);
CREATE INDEX IF NOT EXISTS idx_core_doc_folder__parent_id ON landscape.core_doc_folder (parent_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_budget_version__project_id ON landscape.core_fin_budget_version (project_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_category_uom__uom_code ON landscape.core_fin_category_uom (uom_code);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_actual__project_id ON landscape.core_fin_fact_actual (project_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_actual__uom_code ON landscape.core_fin_fact_actual (uom_code);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget__curve_id ON landscape.core_fin_fact_budget (curve_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget__growth_rate_set_id ON landscape.core_fin_fact_budget (growth_rate_set_id);
CREATE INDEX IF NOT EXISTS idx_core_fin_fact_budget__uom_code ON landscape.core_fin_fact_budget (uom_code);
CREATE INDEX IF NOT EXISTS idx_core_unit_cost_item__created_from_project_id ON landscape.core_unit_cost_item (created_from_project_id);
CREATE INDEX IF NOT EXISTS idx_core_unit_cost_item__default_uom_code ON landscape.core_unit_cost_item (default_uom_code);
CREATE INDEX IF NOT EXISTS idx_dms_profile_audit__doc_id ON landscape.dms_profile_audit (doc_id);
CREATE INDEX IF NOT EXISTS idx_dms_template_attributes__attr_id ON landscape.dms_template_attributes (attr_id);
CREATE INDEX IF NOT EXISTS idx_dms_templates__project_id ON landscape.dms_templates (project_id);
CREATE INDEX IF NOT EXISTS idx_dms_templates__workspace_id ON landscape.dms_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_gis_plan_parcel__parcel_id ON landscape.gis_plan_parcel (parcel_id);
CREATE INDEX IF NOT EXISTS idx_market_competitive_project_products__product_id ON landscape.market_competitive_project_products (product_id);
CREATE INDEX IF NOT EXISTS idx_project_jurisdiction_mapping__density_code ON landscape.project_jurisdiction_mapping (density_code);
CREATE INDEX IF NOT EXISTS idx_project_jurisdiction_mapping__glossary_id ON landscape.project_jurisdiction_mapping (glossary_id);
CREATE INDEX IF NOT EXISTS idx_project_jurisdiction_mapping__project_id ON landscape.project_jurisdiction_mapping (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_absorption_schedule__area_id ON landscape.tbl_absorption_schedule (area_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acquisition__measure_id ON landscape.tbl_acquisition (measure_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__allocation_type_id ON landscape.tbl_acreage_allocation (allocation_type_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__parcel_id ON landscape.tbl_acreage_allocation (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__phase_id ON landscape.tbl_acreage_allocation (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_acreage_allocation__source_doc_id ON landscape.tbl_acreage_allocation (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_approval__project_id ON landscape.tbl_approval (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_benchmark_ai_suggestions__created_benchmark_id ON landscape.tbl_benchmark_ai_suggestions (created_benchmark_id);
CREATE INDEX IF NOT EXISTS idx_tbl_benchmark_ai_suggestions__existing_benchmark_id ON landscape.tbl_benchmark_ai_suggestions (existing_benchmark_id);
CREATE INDEX IF NOT EXISTS idx_tbl_benchmark_ai_suggestions__project_id ON landscape.tbl_benchmark_ai_suggestions (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget__devphase_id ON landscape.tbl_budget (devphase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget__measure_id ON landscape.tbl_budget (measure_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_fact__phase_id ON landscape.tbl_budget_fact (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_fact__source_doc_id ON landscape.tbl_budget_fact (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_items__actual_period_id ON landscape.tbl_budget_items (actual_period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_budget_structure__measure_id ON landscape.tbl_budget_structure (measure_id);
CREATE INDEX IF NOT EXISTS idx_tbl_capital_call__period_id ON landscape.tbl_capital_call (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_capitalization__project_id ON landscape.tbl_capitalization (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cashflow__lot_id ON landscape.tbl_cashflow (lot_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_absorption__cre_property_id ON landscape.tbl_cre_absorption (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_absorption__period_id ON landscape.tbl_cre_absorption (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_cam_charge__cre_property_id ON landscape.tbl_cre_cam_charge (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_cam_charge__period_id ON landscape.tbl_cre_cam_charge (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_cap_rate__cre_property_id ON landscape.tbl_cre_cap_rate (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_capital_reserve__cre_property_id ON landscape.tbl_cre_capital_reserve (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_cash_flow__period_id ON landscape.tbl_cre_cash_flow (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_dcf_analysis__cre_property_id ON landscape.tbl_cre_dcf_analysis (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_expense_recovery__lease_id ON landscape.tbl_cre_expense_recovery (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_expense_reimbursement__lease_id ON landscape.tbl_cre_expense_reimbursement (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_expense_reimbursement__period_id ON landscape.tbl_cre_expense_reimbursement (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_expense_stop__lease_id ON landscape.tbl_cre_expense_stop (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_leasing_commission__lease_id ON landscape.tbl_cre_leasing_commission (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_leasing_legal__lease_id ON landscape.tbl_cre_leasing_legal (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_major_maintenance__cre_property_id ON landscape.tbl_cre_major_maintenance (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_noi__period_id ON landscape.tbl_cre_noi (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_operating_expense__cre_property_id ON landscape.tbl_cre_operating_expense (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_operating_expense__period_id ON landscape.tbl_cre_operating_expense (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_percentage_rent__lease_id ON landscape.tbl_cre_percentage_rent (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_property__parcel_id ON landscape.tbl_cre_property (parcel_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_rent_concession__lease_id ON landscape.tbl_cre_rent_concession (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_rent_escalation__lease_id ON landscape.tbl_cre_rent_escalation (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_stabilization__cre_property_id ON landscape.tbl_cre_stabilization (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_tenant_improvement__lease_id ON landscape.tbl_cre_tenant_improvement (lease_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_vacancy__cre_property_id ON landscape.tbl_cre_vacancy (cre_property_id);
CREATE INDEX IF NOT EXISTS idx_tbl_cre_vacancy__period_id ON landscape.tbl_cre_vacancy (period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_debt_facility__maturity_period_id ON landscape.tbl_debt_facility (maturity_period_id);
CREATE INDEX IF NOT EXISTS idx_tbl_equity_structure__project_id ON landscape.tbl_equity_structure (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_expense_detail__expense_id ON landscape.tbl_expense_detail (expense_id);
CREATE INDEX IF NOT EXISTS idx_tbl_global_benchmark_registry__source_document_id ON landscape.tbl_global_benchmark_registry (source_document_id);
CREATE INDEX IF NOT EXISTS idx_tbl_global_benchmark_registry__source_project_id ON landscape.tbl_global_benchmark_registry (source_project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_inventory_item__type_id ON landscape.tbl_inventory_item (type_id);
CREATE INDEX IF NOT EXISTS idx_tbl_milestone__phase_id ON landscape.tbl_milestone (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_milestone__predecessor_milestone_id ON landscape.tbl_milestone (predecessor_milestone_id);
CREATE INDEX IF NOT EXISTS idx_tbl_milestone__source_doc_id ON landscape.tbl_milestone (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_multifamily_unit_type__container_id ON landscape.tbl_multifamily_unit_type (container_id);
CREATE INDEX IF NOT EXISTS idx_tbl_operations_user_inputs__category_id ON landscape.tbl_operations_user_inputs (category_id);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__area_id ON landscape.tbl_parcel (area_id);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__density_code ON landscape.tbl_parcel (density_code);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__landuse_code ON landscape.tbl_parcel (landuse_code);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__lot_type_id ON landscape.tbl_parcel (lot_type_id);
CREATE INDEX IF NOT EXISTS idx_tbl_parcel__phase_id ON landscape.tbl_parcel (phase_id);
CREATE INDEX IF NOT EXISTS idx_tbl_phase__area_id ON landscape.tbl_phase (area_id);
CREATE INDEX IF NOT EXISTS idx_tbl_project__dms_template_id ON landscape.tbl_project (dms_template_id);
CREATE INDEX IF NOT EXISTS idx_tbl_project_assumption__source_doc_id ON landscape.tbl_project_assumption (source_doc_id);
CREATE INDEX IF NOT EXISTS idx_tbl_rent_roll_unit__project_id ON landscape.tbl_rent_roll_unit (project_id);
CREATE INDEX IF NOT EXISTS idx_tbl_scenario__cloned_from_scenario_id ON landscape.tbl_scenario (cloned_from_scenario_id);
CREATE INDEX IF NOT EXISTS idx_tbl_scenario__created_by ON landscape.tbl_scenario (created_by);
CREATE INDEX IF NOT EXISTS idx_type_lot_product__product_id ON landscape.type_lot_product (product_id);

-- Verification queries
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname='landscape' ORDER BY tablename, indexname;

-- ============================================================
-- VERIFICATION (commented out): FK columns missing leading index
-- ============================================================
-- SELECT
--   src.relname AS table_name,
--   con.conname AS fk_name,
--   pg_get_constraintdef(con.oid) AS fk_definition,
--   CASE
--     WHEN array_length(con.conkey, 1) = 1 THEN
--       'idx_' || src.relname || '__' || att.attname
--     ELSE
--       'idx_' || src.relname || '__' ||
--       (SELECT string_agg(att2.attname, '__' ORDER BY ord)
--        FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
--        JOIN pg_attribute att2 ON att2.attrelid = src.oid AND att2.attnum = k.attnum)
--   END AS suggested_index_name
-- FROM pg_constraint con
-- JOIN pg_class src ON src.oid = con.conrelid
-- JOIN pg_class ref ON ref.oid = con.confrelid
-- JOIN pg_namespace nsp ON nsp.oid = src.relnamespace
-- LEFT JOIN pg_attribute att ON att.attrelid = src.oid AND att.attnum = con.conkey[1]
-- WHERE con.contype = 'f'
--   AND nsp.nspname = 'landscape'
--   AND src.relkind IN ('r', 'p')
--   AND NOT EXISTS (
--     SELECT 1
--     FROM pg_index idx
--     WHERE idx.indrelid = src.oid
--       AND idx.indkey[0:array_length(con.conkey, 1)-1] = con.conkey
--   )
-- ORDER BY src.relname;

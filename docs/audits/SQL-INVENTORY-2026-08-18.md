# SQL File Inventory — 2026-08-18

Session: `LSCMD-BC-SQLRECOVER-0818-BC3`. Every `.sql` file that existed only on this Mac
(290 total), classified by evidence, not filename, before being added to the repository.

**Method:** class A/D assigned by path; class B assigned only where a genuine functional
reference was found (`git grep` for the exact filename across all tracked files, then
discounting nine auto-generated point-in-time snapshot files — `docs/daily-context/**/*SNAPSHOT*`,
`docs/daily-context/**/MIGRATION_STATUS_*.md`, `project-structure.txt` — which mention the whole
repo tree and are not a functional dependency on any one file). Everything not A, B, or under
an `archive/` path segment falls to C by elimination. Dump/export detection: pg_dump header,
bulk `COPY ... FROM stdin` blocks, or >200KB with 50+ `INSERT` statements and zero DDL.

## Totals

| Class | Count | Disposition |
|---|---|---|
| A — live migration | 152 | tracked |
| B — referenced by running code or docs | 52 | tracked |
| C — operational one-off (by elimination) | 49 | tracked |
| D — archive, non-dump | 37 | tracked |
| D-dump — database dump/export | 0 | **excluded, stays ignored** |
| **Total** | **290** | 290 tracked, 0 excluded |

No file matched the dump/export signature. Nothing is excluded from this pass.

## Class A — live migration

Under `migrations/` or `backend/migrations/`. Part of the schema history.

| File | Evidence |
|---|---|
| `backend/migrations/0018_market_competitive_projects.sql` | — |
| `backend/migrations/002_budget_field_expansion.sql` | also referenced: docs/09-session-notes/SESSION_NOTES_2025_11_17_25-11-17.md; docs/09-session-notes/archive/BUDGET_GRANULARITY_SYSTEM.md; docs/09-session-notes/archive/QW82_PHASE1_MIGRATION_COMPLETE.md |
| `backend/migrations/011_create_chadron_units.sql` | also referenced: docs/09-session-notes/examples/chadron-complete-integration-summary.md; docs/09-session-notes/examples/chadron-rent-roll-migration-summary.md |
| `backend/migrations/012_chadron_rentroll_remediation.sql` | also referenced: backend/migrations/generate_chadron_migration.py; docs/09-session-notes/examples/chadron-complete-integration-summary.md; docs/09-session-notes/examples/chadron-rent-roll-migration-summary.md |
| `backend/migrations/012_scenario_management.sql` | also referenced: docs/00-overview/status/SCENARIO_MANAGEMENT_STATUS_25-11-13.md; docs/02-features/dms/DEPLOYMENT_NOTES.md; docs/02-features/dms/Scenario-Management-Implementation-Summary.md |
| `backend/migrations/013_create_chadron_leases.sql` | also referenced: docs/09-session-notes/examples/chadron-complete-integration-summary.md; docs/09-session-notes/examples/chadron-frontend-connection-fix.md |
| `backend/migrations/013_project_contacts_system.sql` | **Secret-scan hard gate hit (Step 3):** the original file seeded real names, emails, and direct/mobile phone numbers for two named brokers on project 17. Halted, reported to Gregg, redacted per his direction (name/email/phone replaced with placeholders, `contact_role`/`title`/`company`/structure unchanged) before tracking. Re-scanned clean with gitleaks + grep after redaction. |
| `backend/migrations/014_project_location_metadata.sql` | also referenced: docs/CAP_RATE_DIAGNOSIS.md |
| `backend/migrations/014_valuation_system.sql` | also referenced: backend/scripts/seed_chadron_valuation.py; docs/09-session-notes/archive/valuation-tab-COMPLETE-implementation.md; docs/09-session-notes/archive/valuation-tab-implementation-summary.md |
| `backend/migrations/015_ai_adjustment_suggestions.sql` | also referenced: docs/09-session-notes/archive/valuation-tab-interactive-adjustments-IMPLEMENTATION-COMPLETE.md; docs/09-session-notes/archive/valuation-tab-interactive-adjustments-SESSION-COMPLETE.md; docs/09-session-notes/archive/valuation-tab-interactive-adjustments-implementation.md |
| `backend/migrations/018_category_completion_tracking.sql` | also referenced: docs/02-features/land-use/CATEGORIZATION_SYSTEMS_REFERENCE.md; docs/09-session-notes/2025-11-10-budget-quick-add-session_25-11-13.md; docs/09-session-notes/archive/BUDGET_QUICK_ADD_CATEGORY_IMPLEMENTATION.md |
| `backend/migrations/026_sale_names.sql` | also referenced: docs/09-session-notes/PHASE_3_SALES_TRANSACTION_DETAILS_COMPLETE.md |
| `backend/migrations/027_market_data_tables.sql` | also referenced: docs/09-session-notes/PHASE_4_FEASIBILITY_VALUATION_COMPLETE.md |
| `backend/migrations/028_sensitivity_scenarios.sql` | also referenced: docs/09-session-notes/PHASE_4_FEASIBILITY_VALUATION_COMPLETE.md |
| `backend/migrations/029_debt_facilities.sql` | also referenced: docs/09-session-notes/PHASE_5_CAPITALIZATION_FOUNDATION_COMPLETE.md |
| `backend/migrations/030_equity_partners.sql` | also referenced: docs/09-session-notes/PHASE_5_CAPITALIZATION_FOUNDATION_COMPLETE.md |
| `backend/migrations/031_waterfall_structure.sql` | also referenced: docs/09-session-notes/PHASE_5_CAPITALIZATION_FOUNDATION_COMPLETE.md |
| `backend/migrations/032_developer_fees.sql` | also referenced: docs/09-session-notes/PHASE_5_CAPITALIZATION_FOUNDATION_COMPLETE.md |
| `backend/migrations/036_rollback_duplicate_debt_equity_tables.sql` | — |
| `backend/migrations/037_primary_measure.sql` | — |
| `backend/migrations/038_parcel_id_standardization.sql` | — |
| `backend/migrations/039_nullable_lease_dates.sql` | — |
| `backend/migrations/040_platform_knowledge.sql` | — |
| `backend/migrations/041_fix_platform_knowledge_jsonb.sql` | — |
| `backend/migrations/042_user_knowledge_layer.sql` | — |
| `backend/migrations/043_consolidate_debt_tables.sql` | — |
| `backend/migrations/044_add_created_by.sql` | — |
| `backend/migrations/add_granularity_settings.sql` | — |
| `migrations/001_financial_engine_schema.sql` | also referenced: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/02-features/financial-engine/FINANCIAL_ENGINE_INDEX.md |
| `migrations/001_phase1_parallel_population.sql` | also referenced: docs/12-migration-plans/PE_LEVEL_DEPRECATION_PLAN.md |
| `migrations/002_dependencies_revenue_finance.sql` | also referenced: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/02-features/financial-engine/FINANCIAL_ENGINE_INDEX.md |
| `migrations/002a_fix_dependency_views.sql` | also referenced: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/02-features/financial-engine/FINANCIAL_ENGINE_INDEX.md |
| `migrations/006_lease_management.sql` | also referenced: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/05-database/MIGRATION-SUMMARY.md |
| `migrations/007_add_budget_timing_columns.sql` | also referenced: docs/05-database/MIGRATION-SUMMARY.md; docs/06-devops/DEVOPS_GUIDE.md; docs/07-testing/VALIDATION_COMPLETE.md |
| `migrations/008_add_multifamily_units.sql` | also referenced: docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/02-features/rent-roll/UNIVERSAL_RENT_ROLL_INTERFACE.md; docs/05-database/MIGRATION-SUMMARY.md |
| `migrations/009_dms_media_assets.sql` | — |
| `migrations/009_phase2_container_queries.sql` | — |
| `migrations/010_media_classification_intent.sql` | — |
| `migrations/010_phase3_container_indexes.sql` | — |
| `migrations/011_phase4_drop_legacy_pe.sql` | — |
| `migrations/012_container_crud_constraints.sql` | — |
| `migrations/013_add_template_id_to_project.sql` | — |
| `migrations/014_unit_costs_and_products.sql` | also referenced: migrations/README.md |
| `migrations/014_unit_costs_and_products_final.sql` | — |
| `migrations/014_unit_costs_and_products_fixed.sql` | — |
| `migrations/015_add_budget_period_fields.sql` | also referenced: docs/09-session-notes/2025-11-07-budget-modal-redesign-implementation_25-11-13.md; docs/09-session-notes/2025-11-07-session-summary_25-11-13.md; docs/09-session-notes/daily-log_25-11-13.md |
| `migrations/015_unit_costs_and_products_api.sql` | — |
| `migrations/016_absorption_velocity_benchmarks.sql` | also referenced: docs/02-features/land-use/CATEGORIZATION_SYSTEMS_REFERENCE.md |
| `migrations/016_cleanup_project7_containers.sql` | — |
| `migrations/016_cleanup_project7_containers_v2.sql` | also referenced: docs/09-session-notes/2025-11-07-budget-modal-container-fixes_25-11-13.md; docs/09-session-notes/2025-11-07-budget-modal-redesign-implementation_25-11-13.md; docs/09-session-notes/2025-11-07-session-summary_25-11-13.md |
| `migrations/017_unit_cost_template_extensions.sql` | — |
| `migrations/018_land_dev_opex_calculations.sql` | also referenced: docs/opex/TableAuthoritativeness_Audit.md |
| `migrations/019_land_dev_opex_accounts.sql` | — |
| `migrations/020_land_dev_opex_calculation_function.sql` | — |
| `migrations/022_fix_budget_grid_view_unit_cost_categories.sql` | also referenced: archive/stale-md-cleanup-2026-03-15/PHASE_4_COMPLETION_REPORT.md; archive/stale-md-cleanup-2026-03-15/PHASE_4_HOTFIX_FINAL_RESOLUTION.md; docs/00-overview/status/COMPLETION_LOG.md |
| `migrations/023_add_activity_and_new_category_columns.sql` | — |
| `migrations/024_rename_lifecycle_stage_to_activity.sql` | — |
| `migrations/025_rename_container_to_division.sql` | also referenced: CLAUDE.md; docs/design-system/land_session_transfer_7-12-26/LANDSCAPE_LAND_SLICE1_DISCOVERY_AUDIT_TECH.md |
| `migrations/026_phase4_category_system_cutover.sql` | also referenced: archive/stale-md-cleanup-2026-03-15/PHASE_4_COMPLETION_REPORT.md; migrations/README.md |
| `migrations/027_add_acquisition_event_fields.sql` | — |
| `migrations/028_uom_usage_contexts.sql` | — |
| `migrations/029_create_system_picklist.sql` | — |
| `migrations/030_add_uom_sort_order.sql` | — |
| `migrations/031_fix_picklist_codes_match_constraints.sql` | — |
| `migrations/032_fix_invalid_project_type_codes.sql` | — |
| `migrations/037_add_landscaper_activity.sql` | also referenced: .claude/settings.local.json; docs/09-session-notes/2025-12-19-landscaper-phase3-wiring.md |
| `migrations/037_research_harvest_tables.sql` | also referenced: docs/daily-context/session-log.md |
| `migrations/039_picklist_display_and_subtypes.sql` | — |
| `migrations/040_multifamily_adapter_tables.sql` | also referenced: migrations/README.md |
| `migrations/041_extraction_mapping_system.sql` | — |
| `migrations/042_cost_category_unification.sql` | also referenced: docs/opex/TableAuthoritativeness_Audit.md |
| `migrations/042_create_project_map_features.sql` | — |
| `migrations/043_create_operations_user_inputs.sql` | — |
| `migrations/044_add_parcel_id_fk_indexes.sql` | — |
| `migrations/045_add_missing_fk_indexes.sql` | — |
| `migrations/045_project_land_use.sql` | — |
| `migrations/046_income_approach_enhancements.sql` | also referenced: backend/apps/financial/models_valuation.py |
| `migrations/047_dms_versioning_and_soft_delete.sql` | — |
| `migrations/048_pending_mutations_and_audit.sql` | — |
| `migrations/050_update_project_contacts_view.sql` | — |
| `migrations/051_remove_county_default.sql` | — |
| `migrations/052_backfill_opex_parent_category.sql` | — |
| `migrations/053_create_cabinet.sql` | — |
| `migrations/054_create_contact_role.sql` | — |
| `migrations/055_create_contact.sql` | — |
| `migrations/056_create_contact_relationship.sql` | — |
| `migrations/057_create_project_contact.sql` | — |
| `migrations/058_alter_project_doc_add_cabinet.sql` | — |
| `migrations/059_migrate_existing_contacts.sql` | — |
| `migrations/060_hbu_analysis_tables.sql` | — |
| `migrations/061_analysis_type_refactor.sql` | also referenced: docs/TAXONOMY_AUDIT_2026-02-12.md; src/types/project-taxonomy.ts |
| `migrations/062_hbu_analysis_tables.sql` | — |
| `migrations/069_narrative_versioning.sql` | — |
| `migrations/070_add_rbac_fields.sql` | — |
| `migrations/071_landscaper_chat_threads.sql` | — |
| `migrations/071_landscaper_chat_threads.up.sql` | — |
| `migrations/072_add_opex_source_column.sql` | — |
| `migrations/073_opex_category_mapping.sql` | — |
| `migrations/074_unified_dcf_analysis.sql` | — |
| `migrations/075_add_value_add_analysis_type.sql` | — |
| `migrations/076_add_acquisition_category_columns.up.sql` | — |
| `migrations/078_acquisition_data_cleanup_and_categories.sql` | — |
| `migrations/079_acquisition_price_summary_view.sql` | — |
| `migrations/080_add_unit_extra_data.sql` | — |
| `migrations/081_media_discard_and_dedup.sql` | — |
| `migrations/082_document_tables.sql` | also referenced: docs/DMS_AUDIT_REPORT.md |
| `migrations/20251203_add_inflation_settings.sql` | — |
| `migrations/20251223_add_statement_discriminator.sql` | also referenced: docs/opex/Project42_ReplayValidation_Report.md |
| `migrations/2026-02-11_extend_sales_comparables_costar_parity.sql` | — |
| `migrations/20260115_add_value_add_assumptions.sql` | also referenced: backend/apps/projects/views.py |
| `migrations/20260116_value_add_v2.sql` | — |
| `migrations/20260126_create_location_intelligence_schema.sql` | also referenced: backend/apps/location_intelligence/management/commands/load_block_groups.py; backend/apps/location_intelligence/models.py; docs/09-session-notes/2026-01-26-location-intelligence-implementation.md |
| `migrations/20260205_fix_mv_doc_search_soft_delete.sql` | — |
| `migrations/20260208_mv_doc_search_media_columns.sql` | — |
| `migrations/20260209_unit_type_cleanup.sql` | — |
| `migrations/20260213_create_doc_geo_tag.sql` | also referenced: docs/09-session-notes/2026-02-13-knowledge-library-integration.md |
| `migrations/20260214_create_scenario_log.sql` | — |
| `migrations/20260215_add_assumption_snapshots.sql` | — |
| `migrations/20260216_add_kpi_definitions_instructions.sql` | — |
| `migrations/20260217_align_extraction_mapping_doc_types.sql` | also referenced: docs/09-session-notes/2026-02-14-dms-extraction-doctype-tags.md |
| `migrations/20260218_subtype_classifier_tag_bridge.sql` | also referenced: docs/09-session-notes/2026-02-14-dms-extraction-doctype-tags.md |
| `migrations/20260219_fix_value_add_defaults_and_constraints.sql` | — |
| `migrations/20260220_create_help_conversation_tables.sql` | also referenced: docs/HELP_LANDSCAPER_VERIFICATION.md |
| `migrations/20260221_create_ic_session_tables.sql` | — |
| `migrations/20260221_seed_ic_benchmarks.sql` | — |
| `migrations/20260223_location_analysis_persistence.sql` | — |
| `migrations/20260224_landscaper_intelligence_v1.sql` | — |
| `migrations/20260226_absorption_schedule_confidence.sql` | — |
| `migrations/20260227_band_of_investment_columns.sql` | — |
| `migrations/20260228_dms_templates_add_columns.sql` | — |
| `migrations/20260301_drop_project_name_unique.sql` | — |
| `migrations/20260301_fix_location_analysis_json.sql` | — |
| `migrations/20260306_create_ingestion_source_authority.sql` | also referenced: migrations/README.md |
| `migrations/20260307_add_tenant_name_to_multifamily_unit.sql` | — |
| `migrations/20260308_add_rent_roll_unit_columns.sql` | — |
| `migrations/20260308_consolidate_rent_comparables.sql` | — |
| `migrations/20260308_drop_contacts_legacy.sql` | — |
| `migrations/20260308_drop_dead_tables.sql` | — |
| `migrations/20260309_add_unit_type_name_column.sql` | — |
| `migrations/20260310_market_intelligence_time_series.sql` | also referenced: migrations/README.md |
| `migrations/20260320_add_micro_geo_level.sql` | — |
| `migrations/20260328_acquisition_add_critical_date.sql` | also referenced: CC_VERIFY_ACQUISITION_PICKLIST.md |
| `migrations/20260328_acquisition_event_type_picklist.sql` | also referenced: CC_VERIFY_ACQUISITION_PICKLIST.md |
| `migrations/20260330_portfolio_tables.sql` | also referenced: migrations/README.md |
| `migrations/20260331_create_project_map_features.sql` | — |
| `migrations/20260401_acquisition_fee_pct.up.sql` | — |
| `migrations/20260402_research_harvest_tables.sql` | also referenced: services/market_agents/CC_PROMPT_research_agents_setup.md; services/market_agents/CC_PROMPT_round2_agents_setup.md |
| `migrations/20260425_excel_audit_tables.up.sql` | — |
| `migrations/20260505_thread_doc_link.down.sql` | — |
| `migrations/20260505_thread_doc_link.up.sql` | also referenced: backend/apps/landscaper/migrations/0005_thread_doc_link.py |
| `migrations/20260706_create_mkt_recorded_sales.down.sql` | — |
| `migrations/20260706_create_mkt_recorded_sales.up.sql` | also referenced: migrations/README.md |

## Class B — referenced by running code or docs

Named or globbed by a path in production code, a script, a workflow, or a doc — evidence is the specific referencing file(s), auto-generated repo-snapshot mentions discounted.

| File | Evidence |
|---|---|
| `archive/docs/gis_foundation_ai_first.sql` | referenced by: docs/02-features/gis/gis_implementation_ai_first.md |
| `archive/docs/load_scottsdale_leases.sql` | referenced by: docs/02-features/cre/CRE_IMPLEMENTATION_SUMMARY.md; docs/02-features/cre/CRE_PROPERTY_ANALYSIS_UPDATE.md |
| `archive/docs/migration_001_add_template_id.sql` | referenced by: archive/docs/HOME_PAGE_PHASE1_IMPLEMENTATION.md |
| `archive/docs/migration_scottsdale_actual_roster_fixed.sql` | referenced by: docs/02-features/cre/CRE_IMPLEMENTATION_SUMMARY.md; docs/02-features/cre/CRE_PROPERTY_ANALYSIS_UPDATE.md |
| `archive/docs/migration_scottsdale_final.sql` | referenced by: docs/02-features/cre/CRE_IMPLEMENTATION_SUMMARY.md; docs/02-features/cre/CRE_PROPERTY_ANALYSIS_UPDATE.md |
| `archive/migrations-legacy/006_create_growth_rate_tables.up.sql` | referenced by: docs/02-features/land-use/CATEGORIZATION_SYSTEMS_REFERENCE.md |
| `archive/migrations-legacy/012_multifamily_assumptions.down.sql` | referenced by: docs/09-session-notes/archive/ASSUMPTIONS_UI_FINAL_STATUS.md; docs/09-session-notes/archive/ASSUMPTIONS_UI_IMPLEMENTATION_SUMMARY.md |
| `archive/migrations-legacy/012_multifamily_assumptions.up.sql` | referenced by: docs/09-session-notes/archive/ASSUMPTIONS_UI_FINAL_STATUS.md; docs/09-session-notes/archive/ASSUMPTIONS_UI_IMPLEMENTATION_SUMMARY.md; docs/09-session-notes/archive/ASSUMPTIONS_UI_QUICKSTART.md; docs/ASSUMPTIONS_UI_GUIDE.md |
| `archive/migrations-legacy/013_project_type_reclassification.sql` | referenced by: docs/08-migration-history/013-project-type-code-standardization.md |
| `archive/migrations-legacy/013_restructure_project_taxonomy.down.sql` | referenced by: docs/02-features/land-use/PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md |
| `archive/migrations-legacy/013_restructure_project_taxonomy.up.sql` | referenced by: docs/02-features/land-use/PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md; src/types/project-taxonomy.ts |
| `archive/migrations-legacy/013_rollback.sql` | referenced by: docs/08-migration-history/013-project-type-code-standardization.md |
| `archive/migrations-legacy/013_verify_taxonomy_migration.sql` | referenced by: docs/02-features/land-use/PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md |
| `archive/migrations-legacy/015_milestone_dependency_system.sql` | referenced by: docs/09-session-notes/2025-11-10-budget-phase-column-fixes_25-11-13.md; docs/09-session-notes/daily-log_25-11-13.md |
| `archive/migrations-legacy/019_user_preferences_system.sql` | referenced by: archive/stale-md-cleanup-2026-03-15/USEPREFERENCE_DEPENDENCY_ANALYSIS.md; docs/02-features/financial-engine/USER_PREFERENCES_PERSISTENCE_PHASE_1.md; docs/09-session-notes/2026-03-07-ingestion-workbench-commit-organization.md |
| `archive/migrations-legacy/20251008_01_market_core.sql` | referenced by: archive/migrations-legacy/README_GEO_SETUP.md; archive/stale-md-cleanup-2026-03-15/QUICK_SETUP_GEO.md; docs/02-features/maricopa-datamining-migration-discovery.md; scripts/verify-market-latest.mjs; services/market_ingest_py/README.md |
| `archive/migrations-legacy/20251008_02_geo_seed.sql` | referenced by: archive/migrations-legacy/README_GEO_SETUP.md; archive/migrations-legacy/run_geo_seeds.sh; archive/stale-md-cleanup-2026-03-15/QUICK_SETUP_GEO.md; docs/09-session-notes/archive/branch_merge_strategy_report.md |
| `archive/migrations-legacy/20251008_03_dev_issue_log.sql` | referenced by: docs/09-session-notes/archive/dev-issue-reporter.md |
| `archive/migrations-legacy/20251029_01_california_geo_seed.sql` | referenced by: archive/migrations-legacy/README_GEO_SETUP.md; archive/migrations-legacy/run_geo_seeds.sh; archive/stale-md-cleanup-2026-03-15/QUICK_SETUP_GEO.md; docs/09-session-notes/archive/branch_merge_strategy_report.md |
| `backend/apps/documents/migrations/020_add_correction_logging.sql` | referenced by: backend/apps/documents/CORRECTION_LOGGING_AND_SECTION_DETECTION_README.md |
| `backend/apps/documents/migrations/021_add_correction_logging_simplified.sql` | referenced by: docs/09-session-notes/2025-10-30-landscaper-training-implementation_25-11-13.md; docs/09-session-notes/daily-log_25-11-13.md |
| `backend/apps/financial/migrations/0014_global_benchmarks_phase1.sql` | referenced by: archive/stale-md-cleanup-2026-03-15/QUICKSTART_BENCHMARKS.md; docs/02-features/land-use/CATEGORIZATION_SYSTEMS_REFERENCE.md |
| `backend/apps/financial/migrations/0015_unit_cost_development_stages.sql` | referenced by: docs/02-features/land-use/CATEGORY_LIFECYCLE_MIGRATION_GUIDE.md; docs/09-session-notes/2025-11-07-unit-cost-development-stages-implementation_25-11-13.md; docs/09-session-notes/2025-11-07-unit-cost-ui-enhancements-implementation_25-11-13.md; docs/09-session-notes/daily-log_25-11-13.md |
| `backend/apps/financial/migrations/0016_category_lifecycle_taxonomy.sql` | referenced by: docs/02-features/land-use/CATEGORIZATION_SYSTEMS_REFERENCE.md; docs/02-features/land-use/CATEGORY_LIFECYCLE_MIGRATION_GUIDE.md; docs/02-features/land-use/CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md |
| `backend/apps/financial/migrations/0018_fix_transaction_cost_value_precision.sql` | referenced by: docs/09-session-notes/SESSION_NOTES_2025_01_14_25-11-14.md |
| `backend/apps/financial/migrations/0019_create_contingency_table.sql` | referenced by: docs/09-session-notes/SESSION_NOTES_2025_01_14_25-11-14.md |
| `backend/db/migrations/014_complete_argus_capitalization_parity_v3.sql` | referenced by: docs/capitalization/FULL_ARGUS_PARITY_IMPLEMENTATION_STATUS.md |
| `backend/db/migrations/015_populate_capitalization_data.sql` | referenced by: docs/capitalization/FULL_ARGUS_PARITY_IMPLEMENTATION_STATUS.md |
| `backend/db/migrations/016_subdivision_underwriting_v1.sql` | referenced by: backend/run_migration.py; docs/daily-context/session-log.md |
| `backend/db/migrations/017_land_use_label_configuration.sql` | referenced by: docs/02-features/land-use/LAND_USE_LABELS_IMPLEMENTATION.md |
| `backend/db/migrations/018_ai_correction_logging_system.sql` | referenced by: backend/apps/documents/AI_CORRECTION_SYSTEM_IMPLEMENTATION.md; backend/apps/documents/QUICK_START_AI_CORRECTION.md |
| `backend/db/migrations/027_create_bmk_resale_closings.sql` | referenced by: docs/09-session-notes/2025-12-02-redfin-ingestion-tool.md |
| `backend/db/migrations/028_create_market_activity.sql` | referenced by: docs/09-session-notes/2025-12-03-market-data-ingestion-tools.md |
| `backend/db/migrations/029_create_zonda_subdivisions.sql` | referenced by: docs/09-session-notes/2025-12-03-market-data-ingestion-tools.md |
| `backend/scripts/archive/sql-iterations/import_chadron_CORRECT.sql` | referenced by: docs/09-session-notes/examples/chadron-unit-numbering-discrepancy.md |
| `backend/scripts/archive/sql-iterations/import_chadron_rent_roll.sql` | referenced by: backend/scripts/README_CHADRON_EXTRACTION.md |
| `backend/sql/create_ai_correction_log.sql` | referenced by: docs/09-session-notes/archive/rent-roll-ingestion-COMPLETE.md; docs/09-session-notes/archive/rent-roll-ingestion-testing-guide.md; docs/RENT_ROLL_INGESTION_GUIDE.md |
| `docs/02-features/financial-engine/budget_grid_queries.sql` | referenced by: docs/03-api-reference/budget_grid_api_spec.md |
| `docs/05-database/sql/CRE_proforma_schema.sql` | referenced by: docs/02-features/cre/CRE_CALCULATION_ENGINE_DOCUMENTATION.md; docs/02-features/cre/CRE_IMPLEMENTATION_SUMMARY.md; docs/02-features/cre/CRE_README.md; docs/process/IMPLEMENTATION_CHECKLIST.md |
| `docs/05-database/sql/universal_container_system.sql` | referenced by: docs/02-features/land-use/universal-container-system.md |
| `scripts/create-project-boundaries-tables.sql` | referenced by: docs/design-system/land_session_transfer_7-12-26/LANDSCAPE_LAND_SLICE1_DISCOVERY_AUDIT_TECH.md |
| `scripts/fix-orphaned-container-ids.sql` | referenced by: scripts/fix-orphaned-containers.ts |
| `scripts/migrate-budget-to-containers.sql` | referenced by: docs/12-migration-plans/BUDGET_CONTAINER_MIGRATION.md |
| `scripts/seed-rizvi-nnn-portfolio.sql` | referenced by: .claude/commands/nnn-slb-wire.md |
| `scripts/setup-database-roles.sql` | referenced by: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/06-devops/DEVOPS_GUIDE.md; docs/06-devops/SYNC_ALL_TO_GIT_PROMPT.md |
| `scripts/setup-monitoring.sql` | referenced by: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/06-devops/DEVOPS_GUIDE.md; docs/06-devops/SYNC_ALL_TO_GIT_PROMPT.md |
| `services/market_agents/market_agents/sql/seed_bps_hud_series.sql` | referenced by: docs/daily-context/session-log.md; services/market_agents/CC_PROMPT_round2_agents_setup.md |
| `src/app/api/dms/folders/schema.sql` | referenced by: backend/README_TESTING.md; backend/apps/location_intelligence/management/commands/load_block_groups.py; backend/apps/location_intelligence/models.py; docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md |
| `src/lib/dms/migrations/001_create_dms_tables.sql` | referenced by: docs/02-features/dms/README_DMS_v1.md; src/lib/dms/migrate.ts |
| `src/lib/dms/migrations/002_schema_fixes.sql` | referenced by: docs/02-features/dms/DMS-Step-3-Complete.md; docs/02-features/dms/README_DMS_v1.md |
| `tests/fixtures/seed-test-data.sql` | referenced by: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/02-features/financial-engine/TEST_FIXTURES.md; docs/07-testing/VALIDATION_SUMMARY.md; scripts/load-fixtures.sh |
| `tests/fixtures/smoke-test-fixtures.sql` | referenced by: docs/00-getting-started/DEVELOPER_GUIDE.md; docs/00-overview/IMPLEMENTATION_STATUS_3-8-26.md; docs/02-features/financial-engine/TEST_FIXTURES.md; scripts/load-fixtures.sh |

## Class C — operational one-off

Not under migrations/, not referenced anywhere found, not under archive/. Point-in-time scripts, seed/reference data, and orphaned copies of app-level Django-style migrations that were never individually cited.

| File | Evidence |
|---|---|
| `backend/apps/financial/migrations/0017_category_lifecycle_pivot.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/apps/financial/migrations/0018_rename_template_to_item.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/apps/financial/migrations/0020_add_planning_engineering_lifecycle_stage.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/apps/financial/migrations/0021_add_lifecycle_stage_to_budget.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/create_market_rates_tables.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/014_capitalization_sample_data.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/014_complete_argus_capitalization_parity.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/014_complete_argus_capitalization_parity_v2.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/019_sales_absorption_minimal.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/020_sale_phases_table.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/021_create_sale_event_tables.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/022_uom_calculation_registry.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/023_sale_calculation_system.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/024_create_bmk_builder_communities.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/025_create_bmk_builder_plans.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/026_create_bmk_builder_inventory.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/db/migrations/030_competitive_projects_products.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/scripts/chadron_import_FINAL.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `backend/seed_budget_sample_data.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `create_market_rates_tables.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `docs/05-database/sql/Land_Dev_MVP_schema.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `docs/05-database/sql/land_use_management.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `docs/05-database/sql/land_use_seed_data.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `docs/05-database/sql/market_assumptions.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `reference/database/neon_landscape_full.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `scripts/add-pricing-columns.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `scripts/add-time-series-dvls.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `scripts/create-ai-review-tables.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `scripts/delete_project_87.sql` | no functional code/doc reference found; not under migrations/ or archive/ |
| `scripts/drop-legacy-budget-tables.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `scripts/migrate-budget-to-containers-simple.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `scripts/reset_reconciliation_p17.sql` | no functional code/doc reference found; not under migrations/ or archive/ |
| `scripts/seed-transaction-cost-defaults.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/001_universal_inventory_schema.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/002_migrate_multifamily_to_inventory.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/003_extend_container_levels.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/004_migrate_parcels_to_inventory.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/005_fix_auto_create_function_for_level1.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/006_fix_mpc_inventory_columns.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/007_refine_mpc_inventory.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/008_connect_inventory_to_land_use.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/009_fix_parcel_hierarchy_identifiers.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/009_fix_parcel_hierarchy_identifiers_v2.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/010_add_project_creation_fields.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/011_create_template_tables.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/012_seed_mpc_templates.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/db-migrations/013_hide_lot_dimension_columns.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `src/app/api/gis/database-setup.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |
| `tests/fixtures/validation-test-peoria.sql` | no functional code/doc reference found; not under migrations/ or archive/ (auto-generated snapshot mentions discounted) |

## Class D — archive, non-dump

Under an archive/ path segment (top-level or nested), not individually referenced elsewhere. Superseded iterations, legacy migration copies, retired one-time loaders.

| File | Evidence |
|---|---|
| `archive/docs/add_scottsdale_data.sql` | path contains an archive/ segment |
| `archive/docs/migration_complete_scottsdale.sql` | path contains an archive/ segment |
| `archive/docs/migration_kitchen_sink_scottsdale.sql` | path contains an archive/ segment |
| `archive/docs/migration_scottsdale_actual_roster.sql` | path contains an archive/ segment |
| `archive/docs/migration_scottsdale_fixed.sql` | path contains an archive/ segment |
| `archive/docs/migration_scottsdale_v2.sql` | path contains an archive/ segment |
| `archive/migrations-legacy/001_create_universal_containers.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/001_create_universal_containers.up.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/002_enhance_core_fin_tables.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/002_enhance_core_fin_tables.up.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/003_create_tagging_system.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/003_create_tagging_system.up.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/004_create_calculation_periods.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/004_create_calculation_periods.up.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/005_create_project_settings.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/005_create_project_settings.up.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/006_create_growth_rate_tables.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/012_create_msa_lookup.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/013_add_parcel_description.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/013_scurve_profiles.sql` | path contains an archive/ segment |
| `archive/migrations-legacy/014_budget_category_system.down.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/014_budget_category_system.up.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/019_sales_absorption_module.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `archive/migrations-legacy/20251103_01_cpi_auto_sync.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/complete_import.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/complete_import_with_data.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/full_import.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/full_import_corrected.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/full_import_final.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/full_import_fixed.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/import_chadron_CLEAN.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/import_chadron_FIXED2.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/import_chadron_FIXED3.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/import_chadron_FIXED4.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/import_chadron_FIXED5.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/inserts_only.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |
| `backend/scripts/archive/sql-iterations/temp_table_inserts.sql` | path contains an archive/ segment (auto-generated snapshot mentions discounted) |

# Migration Status

## Summary
- **Generated:** 2026-02-13 11:45:39 
- **Total SQL Migrations:** 93
- **Latest Migration:** `migrations/20260215_add_assumption_snapshots.sql` (2026-02-13)

## SQL Migrations
| File | Last Modified | Size (bytes) |
|------|---------------|--------------|
| 001_financial_engine_schema.sql | 2025-10-13 | 38994 |
| 001_phase1_parallel_population.sql | 2025-10-15 | 11259 |
| 002_dependencies_revenue_finance.sql | 2025-10-13 | 25796 |
| 002a_fix_dependency_views.sql | 2025-10-13 | 7499 |
| 006_lease_management.sql | 2025-10-13 | 15634 |
| 007_add_budget_timing_columns.sql | 2025-10-14 | 6126 |
| 008_add_multifamily_units.sql | 2025-10-14 | 19395 |
| 009_dms_media_assets.sql | 2026-02-06 | 14344 |
| 009_phase2_container_queries.sql | 2025-10-15 | 12989 |
| 010_media_classification_intent.sql | 2026-02-07 | 6011 |
| 010_phase3_container_indexes.sql | 2025-10-15 | 2279 |
| 011_phase4_drop_legacy_pe.sql | 2025-10-15 | 5227 |
| 012_container_crud_constraints.sql | 2025-10-15 | 9010 |
| 013_add_template_id_to_project.sql | 2025-10-16 | 1027 |
| 014_unit_costs_and_products.sql | 2025-11-04 | 8623 |
| 014_unit_costs_and_products_final.sql | 2025-11-04 | 8511 |
| 014_unit_costs_and_products_fixed.sql | 2025-11-04 | 8374 |
| 015_add_budget_period_fields.sql | 2025-11-07 | 2377 |
| 015_unit_costs_and_products_api.sql | 2025-11-04 | 1460 |
| 016_absorption_velocity_benchmarks.sql | 2025-11-07 | 4696 |
| 016_cleanup_project7_containers.sql | 2025-11-07 | 2426 |
| 016_cleanup_project7_containers_v2.sql | 2025-11-07 | 2954 |
| 017_unit_cost_template_extensions.sql | 2025-11-04 | 295 |
| 018_land_dev_opex_calculations.sql | 2025-11-17 | 1406 |
| 019_land_dev_opex_accounts.sql | 2025-11-17 | 3687 |
| 020_land_dev_opex_calculation_function.sql | 2025-11-17 | 2174 |
| 022_fix_budget_grid_view_unit_cost_categories.sql | 2025-11-19 | 4300 |
| 023_add_activity_and_new_category_columns.sql | 2025-11-19 | 2743 |
| 024_rename_lifecycle_stage_to_activity.sql | 2025-11-19 | 6674 |
| 025_rename_container_to_division.sql | 2025-11-19 | 5008 |
| 026_phase4_category_system_cutover.sql | 2025-11-19 | 9584 |
| 027_add_acquisition_event_fields.sql | 2025-11-22 | 594 |
| 028_uom_usage_contexts.sql | 2025-11-25 | 2159 |
| 029_create_system_picklist.sql | 2025-11-26 | 8224 |
| 030_add_uom_sort_order.sql | 2025-11-26 | 668 |
| 031_fix_picklist_codes_match_constraints.sql | 2025-12-13 | 5135 |
| 032_fix_invalid_project_type_codes.sql | 2025-12-13 | 4514 |
| 037_add_landscaper_activity.sql | 2025-12-19 | 3872 |
| 038_create_field_catalog.sql | 2026-01-11 | 17348 |
| 039_picklist_display_and_subtypes.sql | 2025-12-20 | 5646 |
| 040_multifamily_adapter_tables.sql | 2025-12-20 | 8648 |
| 041_extraction_mapping_system.sql | 2025-12-21 | 6166 |
| 042_cost_category_unification.sql | 2025-12-21 | 17076 |
| 042_create_project_map_features.sql | 2026-01-27 | 4289 |
| 043_create_operations_user_inputs.sql | 2025-12-24 | 6144 |
| 044_add_parcel_id_fk_indexes.sql | 2026-01-06 | 2096 |
| 045_add_missing_fk_indexes.sql | 2026-01-06 | 11874 |
| 046_drop_duplicate_indexes.sql | 2026-01-11 | 9213 |
| 046_income_approach_enhancements.sql | 2026-01-16 | 4580 |
| 047_dms_versioning_and_soft_delete.sql | 2026-01-06 | 3394 |
| 048_pending_mutations_and_audit.sql | 2026-01-08 | 6783 |
| 050_update_project_contacts_view.sql | 2026-01-09 | 2396 |
| 051_remove_county_default.sql | 2026-01-13 | 528 |
| 052_backfill_opex_parent_category.sql | 2026-01-16 | 3340 |
| 053_create_cabinet.sql | 2026-01-20 | 2461 |
| 054_create_contact_role.sql | 2026-01-20 | 6913 |
| 055_create_contact.sql | 2026-01-20 | 6199 |
| 056_create_contact_relationship.sql | 2026-01-20 | 5872 |
| 057_create_project_contact.sql | 2026-01-20 | 6121 |
| 058_alter_project_doc_add_cabinet.sql | 2026-01-20 | 5911 |
| 059_migrate_existing_contacts.sql | 2026-01-20 | 11201 |
| 060_hbu_analysis_tables.sql | 2026-01-20 | 13308 |
| 061_analysis_type_refactor.sql | 2026-01-20 | 16904 |
| 062_hbu_analysis_tables.sql | 2026-01-20 | 11774 |
| 063_property_attributes.sql | 2026-01-20 | 10137 |
| 064_property_attributes_seed.sql | 2026-01-20 | 10643 |
| 069_narrative_versioning.sql | 2026-01-22 | 5348 |
| 070_add_rbac_fields.sql | 2026-01-25 | 2579 |
| 071_landscaper_chat_threads.sql | 2026-01-26 | 7744 |
| 071_landscaper_chat_threads.up.sql | 2026-01-26 | 4477 |
| 072_add_opex_source_column.sql | 2026-01-27 | 1027 |
| 073_opex_category_mapping.sql | 2026-01-27 | 4109 |
| 074_unified_dcf_analysis.sql | 2026-01-28 | 9530 |
| 075_add_value_add_analysis_type.sql | 2026-02-01 | 2152 |
| 076_add_acquisition_category_columns.up.sql | 2026-02-02 | 2055 |
| 078_acquisition_data_cleanup_and_categories.sql | 2026-02-02 | 11418 |
| 079_acquisition_price_summary_view.sql | 2026-02-02 | 5216 |
| 080_add_unit_extra_data.sql | 2026-02-05 | 968 |
| 081_media_discard_and_dedup.sql | 2026-02-11 | 2493 |
| 082_document_tables.sql | 2026-02-12 | 1081 |
| 20251203_add_inflation_settings.sql | 2025-11-26 | 535 |
| 20251223_add_active_opex_discriminator.sql | 2026-01-11 | 471 |
| 20251223_add_statement_discriminator.sql | 2025-12-23 | 861 |
| 20251223_opex_category_restructure.sql | 2026-01-11 | 1777 |
| 2026-02-11_extend_sales_comparables_costar_parity.sql | 2026-02-11 | 31055 |
| 20260115_add_value_add_assumptions.sql | 2026-01-15 | 1596 |
| 20260116_value_add_v2.sql | 2026-01-15 | 2041 |
| 20260126_create_location_intelligence_schema.sql | 2026-01-26 | 14637 |
| 20260205_fix_mv_doc_search_soft_delete.sql | 2026-02-05 | 1660 |
| 20260208_mv_doc_search_media_columns.sql | 2026-02-08 | 1783 |
| 20260209_unit_type_cleanup.sql | 2026-02-09 | 2894 |
| 20260214_create_scenario_log.sql | 2026-02-13 | 3638 |
| 20260215_add_assumption_snapshots.sql | 2026-02-13 | 1448 |

## Django Migrations by App
| App | Migrations | Latest |
|-----|------------|--------|
| acquisition | 2 | 0002_initial |
| documents | 4 | 0004_alter_extractioncommitsnapshot_committed_by |
| dynamic | 1 | 0001_add_dynamic_columns |
| feedback | 2 | 0002_extend_feedback_add_changelog |
| financial | 8 | 0049_expand_adjustment_type_constraint |
| knowledge | 8 | 0007_add_extraction_job |
| landscaper | 1 | 0001_initial |
| market_intel | 1 | 0001_unified_market_intelligence_schema |
| projects | 6 | 0005_taxonomy_perspective_purpose |
| reports | 1 | 0001_initial |
| sales_absorption | 4 | 0004_initial |
| users | 2 | 0002_userlandscaperprofile |
| valuation | 2 | 0002_add_cost_approach_land_metadata |

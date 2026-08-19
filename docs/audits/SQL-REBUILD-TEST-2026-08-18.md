# SQL Rebuild Acceptance Test — 2026-08-18

> **⚠️ CORRECTED 2026-08-19 — see `docs/audits/SCHEMA-RECOVERABILITY-2026-08-19.md`.**
> The 30/365 tables and 2/41 views figure below measures the **SQL patch layer applied alone**,
> against an empty database — not whether the schema is recoverable. It does not include Django's
> own migrations, which this document's own text (below) correctly identifies as the baseline the
> SQL layer assumes but does not itself apply. Session `LSCMD-BC-REBUILDPROOF-0819-BC6` applied
> that Django baseline first, then this same SQL layer on top, and reconstructed 77 objects
> instead of 32. It also answers the question this document could only bound between 0 and 297:
> **176 real, live, code-referenced tables and views have no file anywhere — Django or SQL — in
> the whole repository.** Read the 2026-08-19 document for the number that matters; the text
> below is left exactly as originally written, for the record of what was tested and found on
> 2026-08-18.

Session: `LSCMD-BC-SQLRECOVER-0818-BC3`, Step 6. This is the test that matters — everything
else in this recovery is bookkeeping until a fresh clone proves (or fails to prove) the schema
can be rebuilt from what is now in git.

## Method

1. `git clone --branch chore/sql-recovery-0818` into a clean directory — nothing from this
   Mac's working copy, only what the four tranche commits actually contain.
2. Every tracked `.sql` file under `migrations/` and `backend/migrations/` (227 total, `.down.sql`
   rollback scripts excluded — 195 forward-migration files), applied in filename order, each in
   its own transaction so one failure does not block the rest, to a **throwaway local
   PostgreSQL 14 database** (`bc3_rebuild_test`) created and dropped for this test only. Not the
   live database. Not a Neon branch anything else uses.
3. Compared the resulting `landscape` schema against the live database directly
   (`pg_class`/`pg_namespace`, read-only) by object name and kind.

## Result: partial, and here is exactly how partial

| | Live | Reconstructed from SQL alone |
|---|---|---|
| Tables | 365 | 30 |
| Views | 41 | 2 |

**379 objects present live that this rebuild did not reproduce.** Of the 195 forward-migration
files applied, 171 failed. The overwhelming majority of those failures (181 of 191 in the first,
unfiltered run) were `relation ... does not exist`: these SQL files are not a self-contained
schema history. They are a **patch layer on top of a Django-ORM-managed baseline** — confirmed
directly: `backend/apps/projects/migrations/0001_initial.py` (a Python/Django migration, not a
`.sql` file) creates `tbl_project`, which most of the SQL migrations assume already exists.
Running `manage.py migrate` first would establish that baseline, but no compatible local
Python/Django environment was available on this machine to do that and re-run the comparison —
the same constraint hit elsewhere this session (BC1's backend test suite, BC4's build
verification).

**A second, independent finding, not related to environment limits:** 5 objects exist in the
throwaway rebuild that do **not** exist in the live database at all —
`extraction_mapping_doctype_migration_log`, `mkt_recorded_sales`, `tbl_market_geography`,
`tbl_market_observation`, `tbl_market_series`. These migration files describe a schema state the
live database never reached (later dropped, or never applied there). The recovered `.sql`
history and the live database have themselves diverged in places — worth knowing independent of
anything about this test's environment.

Also present among the 379 missing: `geography_columns`, `geometry_columns`, `spatial_ref_sys` —
PostGIS system views/tables. This local Postgres 14 instance does not have the PostGIS extension
installed (two of the 171 failures were exactly that: `PostGIS extension is not installed`),
which independently accounts for every GIS-prefixed table (`gis_*`) failing to build here even
where a `.sql` file for it exists and is otherwise correct.

## Of the 379 unreconstructed objects, at least 82 have a file behind them — just not a .sql one

Cross-checked each missing name against every `backend/apps/*/migrations/*.py` file in this repo
(Django's own migration history, by name-string match — a reasonable but not perfect proxy;
treat this as approximate, not certified). **82 of 379** are named in at least one such file —
real schema history, just not the history this pass was scoped to recover.

The remaining **297** have no matching Django migration file found by that check either.
Spot-checked, not individually verified for all 297 — three distinct patterns stood out clearly
enough to name:

- **Django's own built-in tables**, created by framework migrations that live inside the
  installed `django` package, not this repo, so no file here could ever name them: `auth_group`,
  `auth_group_permissions`, `auth_permission`, `auth_user`, `auth_user_groups`,
  `auth_user_user_permissions`, `django_admin_log`, `django_content_type`, `django_migrations`,
  `django_session`, `_migrations`. This is the clearest possible case of "created by a framework
  path with no file behind them" this prompt asked to name.
- **Hand-made backup/archive tables** — `bak_costofsale_repop_0724`, `bak_costofsale_sweep_0724`,
  and a family of `tbl_*_archive_20260506` tables (`tbl_commercial_lease_archive_20260506`,
  `tbl_expense_recovery_archive_20260506`, `tbl_lease_archive_20260506`,
  `tbl_percentage_rent_archive_20260506`, `tbl_rent_escalation_archive_20260506`,
  `tbl_rent_schedule_archive_20260506`) plus `tbl_field_catalog_backup_20260324`. The naming —
  a prefix/suffix plus an embedded date — reads as exactly what it looks like: someone
  snapshotted a table by hand, directly against the database, with no migration file ever
  written for any of them.
- **PostGIS-dependent tables**, already covered above (`gis_*` and the three PostGIS system
  objects) — these likely *do* have a `.sql` file behind them (many are class A in the
  inventory) but could not be verified reconstructable in this environment specifically because
  PostGIS isn't installed here.
- **Everything else in this bucket** (`ai_*`, `core_*`, `dms_*`, `knowledge_*`, `landscaper_*`,
  `lu_*`, `market_*`/`mkt_*`, most `tbl_*`, and every `vw_*`/`v_*` view) — not individually
  traced further. Could have a Django migration file this name-match missed (different quoting,
  a `db_table` Meta override, a table created inside a data migration rather than a schema
  migration), could be genuinely undocumented. Distinguishing those precisely for all of them is
  future work, not done here.

## Every missing object, by name

```
_migrations
ai_correction_log
ai_debug_log
ai_extraction_staging
ai_extraction_warnings
ai_ingestion_history
ai_review_history
auth_group
auth_group_permissions
auth_permission
auth_user
auth_user_groups
auth_user_user_permissions
bak_costofsale_repop_0724
bak_costofsale_sweep_0724
bmk_absorption_velocity
bmk_builder_communities
bmk_builder_inventory
bmk_builder_plans
bmk_resale_closings
core_category_lifecycle_stages
core_category_tag_library
core_doc
core_doc_attr_enum
core_doc_attr_lookup
core_doc_folder
core_doc_folder_link
core_doc_media
core_doc_media_link
core_doc_smartfilter
core_doc_text
core_fin_budget_version
core_fin_category_uom
core_fin_confidence_policy
core_fin_crosswalk_ad
core_fin_crosswalk_ae
core_fin_curve
core_fin_division_applicability
core_fin_fact_actual
core_fin_fact_budget
core_fin_fact_tags
core_fin_funding_source
core_fin_growth_rate_sets
core_fin_growth_rate_steps
core_fin_uom
core_item_benchmark_link
core_lookup_item
core_lookup_list
core_lookup_vw
core_planning_standards
core_unit_cost_category
core_unit_cost_item
core_workspace_member
density_classification
developer_fees
django_admin_log
django_content_type
django_migrations
django_session
dms_assertion
dms_attributes
dms_extract_queue
dms_profile_audit
dms_template_attributes
dms_templates
dms_unmapped
dms_workspaces
doc_extracted_facts
doc_geo_tag
doc_processing_queue
document_tables
extraction_commit_snapshot
geography_columns
geometry_columns
gis_boundary_history
gis_document_ingestion
gis_mapping_history
gis_plan_lot
gis_plan_parcel
gis_project_boundary
gis_tax_parcel_ref
glossary_zoning
knowledge_embeddings
knowledge_entities
knowledge_facts
knowledge_insights
knowledge_interactions
knowledge_sessions
land_use_pricing
landscaper_absorption_detail
landscaper_activity
landscaper_advice
landscaper_chat_embedding
landscaper_chat_message
landscaper_chat_thread
landscaper_thread_message
lkp_building_class
lkp_buyer_seller_type
lkp_price_status
lkp_sale_type
lu_acreage_allocation_type
lu_com_spec
lu_family
lu_lease_status
lu_lease_type
lu_recovery_structure
lu_res_spec
lu_subtype
lu_type
management_overhead
market_activity
market_assumptions
market_competitive_project_exclusions
market_competitive_project_products
market_competitive_projects
mkt_data_source_registry
mkt_new_home_project
mkt_permit_history
mutation_audit_log
mv_doc_search
opex_benchmark
opex_label_mapping
pending_mutations
planning_doc
project_boundaries
project_jurisdiction_mapping
project_land_use
project_land_use_product
project_parcel_boundaries
report_templates
res_lot_product
sale_names
spatial_ref_sys
tbl_absorption_schedule
tbl_acquisition
tbl_acreage_allocation
tbl_additional_income
tbl_ai_adjustment_suggestions
tbl_alpha_feedback
tbl_analysis_draft
tbl_analysis_type_config
tbl_approval
tbl_area
tbl_artifact
tbl_artifact_version
tbl_assumption_snapshot
tbl_assumptionrule
tbl_base_rent
tbl_benchmark_ai_suggestions
tbl_benchmark_contingency
tbl_benchmark_transaction_cost
tbl_benchmark_unit_cost
tbl_budget
tbl_budget_fact
tbl_budget_items
tbl_budget_structure
tbl_budget_timing
tbl_calculation_period
tbl_cap_rate_comps
tbl_capex_reserve
tbl_capital_call
tbl_capital_reserves
tbl_capitalization
tbl_cashflow
tbl_cashflow_summary
tbl_changelog
tbl_closing_event
tbl_commercial_lease_archive_20260506
tbl_concept
tbl_concept_category
tbl_concept_field
tbl_cost_allocation
tbl_cost_approach
tbl_cost_approach_depreciation
tbl_dcf_analysis
tbl_debt_draw_schedule
tbl_division
tbl_document_project
tbl_dynamic_column_definition
tbl_dynamic_column_value
tbl_equity
tbl_equity_distribution
tbl_equity_partner
tbl_equity_structure
tbl_escalation
tbl_executive
tbl_executive_compensation_period
tbl_executive_employment_agreement
tbl_executive_incentive_target
tbl_expansion_option
tbl_expense_comparable
tbl_expense_detail
tbl_expense_recovery_archive_20260506
tbl_extraction_job
tbl_field_catalog_backup_20260324
tbl_finance_structure
tbl_global_benchmark_registry
tbl_guarantor_financial_period
tbl_hbu_analysis
tbl_hbu_comparable_use
tbl_hbu_zoning_document
tbl_help_conversation
tbl_help_message
tbl_ic_challenge
tbl_ic_session
tbl_income_approach
tbl_income_property
tbl_income_property_ind_ext
tbl_income_property_mf_ext
tbl_income_property_ret_ext
tbl_intake_session
tbl_inventory_item
tbl_knowledge_source
tbl_land_comp_adjustments
tbl_land_comparables
tbl_landscaper_instructions
tbl_landscaper_kpi_definition
tbl_landuse
tbl_landuse_program
tbl_lease
tbl_lease_archive_20260506
tbl_lease_assumptions
tbl_lease_ind_ext
tbl_lease_mf_ext
tbl_lease_nl_ext
tbl_lease_ret_ext
tbl_lease_revenue_timing
tbl_leasing_commission
tbl_loan
tbl_loan_container
tbl_loan_finance_structure
tbl_lot
tbl_lot_type
tbl_market_rate_analysis
tbl_master_lease
tbl_master_lease_amendment
tbl_master_lease_property
tbl_measures
tbl_milestone
tbl_model_override
tbl_msa
tbl_multifamily_lease
tbl_multifamily_property
tbl_multifamily_turn
tbl_multifamily_unit
tbl_multifamily_unit_type
tbl_narrative_change
tbl_narrative_comment
tbl_narrative_version
tbl_operating_expenses
tbl_operations_user_inputs
tbl_operator
tbl_operator_alias
tbl_operator_concept
tbl_operator_principal
tbl_operator_principal_distribution
tbl_opex_timing
tbl_parcel
tbl_parcel_acquisition_history
tbl_parcel_sale_assumptions
tbl_parcel_sale_event
tbl_participation_payment
tbl_percentage_rent_archive_20260506
tbl_phase
tbl_platform_knowledge
tbl_platform_knowledge_chapters
tbl_platform_knowledge_chunks
tbl_principal_financial_statement
tbl_project
tbl_project_assumption
tbl_project_config
tbl_project_contact
tbl_project_inventory_columns
tbl_project_metrics
tbl_project_overlay
tbl_project_settings
tbl_property_acquisition
tbl_property_apn
tbl_property_attribute_def
tbl_property_type_config
tbl_property_use_template
tbl_recovery
tbl_renewal_option
tbl_rent_concession
tbl_rent_escalation_archive_20260506
tbl_rent_roll
tbl_rent_roll_unit
tbl_rent_schedule_archive_20260506
tbl_rent_step
tbl_rental_comparable
tbl_report_definition
tbl_report_history
tbl_revenue_other
tbl_revenue_rent
tbl_revenue_timing
tbl_sale_benchmarks
tbl_sale_phases
tbl_sale_settlement
tbl_sales_comp_adjustments
tbl_sales_comp_contacts
tbl_sales_comp_history
tbl_sales_comp_hospitality
tbl_sales_comp_industrial
tbl_sales_comp_land
tbl_sales_comp_manufactured
tbl_sales_comp_market_conditions
tbl_sales_comp_office
tbl_sales_comp_retail
tbl_sales_comp_self_storage
tbl_sales_comp_specialty_housing
tbl_sales_comp_storage_unit_mix
tbl_sales_comp_tenants
tbl_sales_comp_unit_mix
tbl_sales_comparables
tbl_scenario
tbl_scenario_comparison
tbl_scenario_log
tbl_security_deposit
tbl_space
tbl_space_ind_ext
tbl_space_mf_ext
tbl_space_ret_ext
tbl_template_column_config
tbl_tenant
tbl_tenant_improvement
tbl_termination_option
tbl_unit_operations
tbl_uom_calculation_formulas
tbl_user_grid_preference
tbl_user_landscaper_profile
tbl_user_preference
tbl_user_report_personal_default
tbl_user_saved_report
tbl_vacancy_assumption
tbl_valuation_reconciliation
tbl_value_add_assumptions
tbl_waterfall
tbl_waterfall_tier
tbl_zoning_control
tester_feedback_deprecated
type_lot_product
user_profile
user_settings
v_ai_review_summary
v_contact_projects
v_lease_summary
v_project_contacts
v_project_contacts_detail
v_rent_roll
v_sales_comparables_full
vw_absorption_with_dependencies
vw_acreage_allocation
vw_budget_grid_items
vw_budget_variance
vw_budget_with_dependencies
vw_category_hierarchy
vw_debt_balance_summary
vw_doc_media_summary
vw_item_dependency_status
vw_lease_expiration_schedule
vw_map_plan_parcels
vw_map_tax_parcels
vw_mkt_absorption_by_lot_width
vw_mkt_absorption_by_lu_product
vw_mkt_current_projects
vw_mkt_landscaper_summary
vw_mkt_pricing_by_city_lotwidth
vw_multifamily_lease_expirations
vw_multifamily_occupancy_summary
vw_multifamily_project_summary
vw_multifamily_turn_metrics
vw_multifamily_unit_status
vw_parcels_with_sales
vw_permit_annual_by_jurisdiction
vw_permit_msa_monthly
vw_project_acquisition_summary
vw_revenue_timeline
vw_zoning_glossary_export
zonda_subdivisions
```

## What this proves and what it does not

**Proves:** the 227 recovered migration files are internally coherent enough that 30 tables and
2 views build cleanly from them alone, in plain filename order, with zero manual intervention.
That is real signal that this is genuine schema history, not noise.

**Does not prove:** that the full 365/41 schema is reconstructable from files in this repo.
Roughly a fifth of the gap (82 of 379) is explained by a Django ORM baseline this test could not
also apply, in this environment. Another identifiable slice is genuinely undocumented hand-made
tables and Django/PostGIS framework internals that no file anywhere could name. The rest is
unclassified — a partial result, reported as one, not hidden inside a rounder-sounding number.

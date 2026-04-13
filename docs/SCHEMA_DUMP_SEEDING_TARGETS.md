# Schema Dump: Seeding Target Tables

**Generated:** 2026-04-12 (read-only — no data modified)
**Database:** land_v2 / schema: landscape

---

## tbl_project

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| project_id | integer | NO | (serial) |
| project_name | character varying | NO | |
| acres_gross | double precision | YES | |
| location_lat | double precision | YES | |
| location_lon | double precision | YES | |
| start_date | date | YES | |
| jurisdiction_city | character varying | YES | |
| jurisdiction_county | character varying | YES | |
| jurisdiction_state | character varying | YES | |
| uses_global_taxonomy | boolean | YES | true |
| taxonomy_customized | boolean | YES | false |
| jurisdiction_integrated | boolean | YES | false |
| gis_metadata | jsonb | YES | '{}'::jsonb |
| location_description | text | YES | |
| target_units | integer | YES | |
| price_range_low | numeric | YES | |
| price_range_high | numeric | YES | |
| ai_last_reviewed | timestamp with time zone | YES | |
| project_address | text | YES | |
| legal_owner | text | YES | |
| county | character varying | YES | |
| existing_land_use | text | YES | |
| assessed_value | numeric | YES | |
| project_type | character varying | YES | 'Land Development' |
| financial_model_type | character varying | YES | 'Development' |
| analysis_start_date | date | YES | |
| analysis_end_date | date | YES | |
| calculation_frequency | character varying | YES | 'Monthly' |
| discount_rate_pct | numeric | YES | 10.00 |
| cost_of_capital_pct | numeric | YES | |
| schema_version | integer | YES | 1 |
| last_calculated_at | timestamp with time zone | YES | |
| description | text | YES | |
| developer_owner | text | YES | |
| is_active | boolean | YES | true |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| template_id | bigint | YES | |
| street_address | character varying | YES | |
| city | character varying | YES | |
| state | character varying | YES | |
| zip_code | character varying | YES | |
| country | character varying | YES | 'United States' |
| market | character varying | YES | |
| submarket | character varying | YES | |
| apn_primary | character varying | YES | |
| apn_secondary | character varying | YES | |
| ownership_type | character varying | YES | |
| property_subtype | character varying | YES | |
| property_class | character varying | YES | |
| lot_size_sf | numeric | YES | |
| lot_size_acres | numeric | YES | |
| gross_sf | numeric | YES | |
| total_units | integer | YES | |
| year_built | integer | YES | |
| stories | integer | YES | |
| asking_price | numeric | YES | |
| price_per_unit | numeric | YES | |
| price_per_sf | numeric | YES | |
| cap_rate_current | numeric | YES | |
| cap_rate_proforma | numeric | YES | |
| current_gpr | numeric | YES | |
| current_other_income | numeric | YES | |
| current_gpi | numeric | YES | |
| current_vacancy_rate | numeric | YES | |
| current_egi | numeric | YES | |
| current_opex | numeric | YES | |
| current_noi | numeric | YES | |
| proforma_gpr | numeric | YES | |
| proforma_other_income | numeric | YES | |
| proforma_gpi | numeric | YES | |
| proforma_vacancy_rate | numeric | YES | |
| proforma_egi | numeric | YES | |
| proforma_opex | numeric | YES | |
| proforma_noi | numeric | YES | |
| listing_brokerage | character varying | YES | |
| job_number | character varying | YES | |
| version_reference | character varying | YES | |
| analysis_type | character varying | YES | |
| project_type_code | character varying | NO | 'LAND' |
| msa_id | integer | YES | |
| planning_efficiency | numeric | YES | |
| market_velocity_annual | integer | YES | |
| velocity_override_reason | text | YES | |
| analysis_mode | character varying | YES | 'napkin' |
| dms_template_id | bigint | YES | |
| topography | character varying | YES | |
| flood_zone | character varying | YES | |
| overlay_zones | jsonb | YES | '[]'::jsonb |
| has_takedown_agreement | boolean | YES | false |
| current_zoning | character varying | YES | |
| proposed_zoning | character varying | YES | |
| general_plan | character varying | YES | |
| acquisition_price | numeric | YES | |
| acquisition_date | date | YES | |
| walk_score | integer | YES | |
| bike_score | integer | YES | |
| transit_score | integer | YES | |
| active_opex_discriminator | character varying | YES | 'default' |
| value_add_enabled | boolean | NO | false |
| primary_count | integer | YES | |
| primary_count_type | character varying | YES | |
| primary_area | numeric | YES | |
| primary_area_type | character varying | YES | |
| cabinet_id | bigint | YES | |
| project_focus | character varying | YES | |
| site_shape | character varying | YES | |
| site_utility_rating | integer | YES | |
| location_rating | integer | YES | |
| access_rating | integer | YES | |
| visibility_rating | integer | YES | |
| building_count | integer | YES | |
| net_rentable_area | numeric | YES | |
| land_to_building_ratio | numeric | YES | |
| construction_class | character varying | YES | |
| construction_type | character varying | YES | |
| condition_rating | integer | YES | |
| quality_rating | integer | YES | |
| parking_spaces | integer | YES | |
| parking_ratio | numeric | YES | |
| parking_type | character varying | YES | |
| effective_age | integer | YES | |
| total_economic_life | integer | YES | |
| remaining_economic_life | integer | YES | |
| site_attributes | jsonb | YES | '{}'::jsonb |
| improvement_attributes | jsonb | YES | '{}'::jsonb |
| created_by_id | integer | YES | |
| collateral_enforcement | character varying | YES | 'STRICT' |
| lotbank_management_fee_pct | numeric | YES | |
| lotbank_default_provision_pct | numeric | YES | |
| lotbank_underwriting_fee | numeric | YES | |
| analysis_perspective | character varying | NO | |
| analysis_purpose | character varying | NO | |
| value_source | character varying | YES | |
| created_by | text | YES | |

> **Note:** `project_type_code`, `analysis_perspective`, and `analysis_purpose` are NOT NULL with no defaults. The seeding script must provide values. `project_type_code` defaults to `'LAND'` at the DB level but `analysis_perspective` and `analysis_purpose` have no DB default — the Django model marks them as non-nullable too.

---

## tbl_multifamily_unit_type

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_type_id | integer | NO | nextval('tbl_multifamily_unit_type_unit_type_id_seq') |
| project_id | bigint | NO | |
| unit_type_code | character varying | YES | |
| bedrooms | numeric | YES | |
| bathrooms | numeric | YES | |
| avg_square_feet | integer | YES | |
| current_market_rent | numeric | YES | |
| total_units | integer | YES | |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| notes | text | YES | |
| other_features | text | YES | |
| floorplan_doc_id | bigint | YES | |
| container_id | bigint | YES | |
| unit_type_name | character varying | YES | |
| unit_count | integer | YES | |
| market_rent | numeric | YES | |
| current_rent_avg | numeric | YES | |
| concessions_avg | numeric | YES | |
| value_source | character varying | YES | |

### Constraints
| Constraint | Type | Column(s) | References |
|-----------|------|-----------|------------|
| tbl_multifamily_unit_type_pkey | PRIMARY KEY | unit_type_id | |
| uq_unit_type_project_code | UNIQUE | (project_id, unit_type_code) | |
| uq_unit_type_project_name | UNIQUE | (project_id, unit_type_name) | |
| tbl_multifamily_unit_type_project_id_fkey | FOREIGN KEY | project_id | tbl_project.project_id |
| tbl_multifamily_unit_type_container_id_fkey | FOREIGN KEY | container_id | tbl_division.division_id |

> **Note:** Two unique constraints — `unit_type_code` and `unit_type_name` must each be unique per project. Only `project_id` is NOT NULL; all other data columns are nullable at the DB level (Django model marks some as required).

---

## tbl_multifamily_unit

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| unit_id | integer | NO | nextval('tbl_multifamily_unit_unit_id_seq') |
| project_id | bigint | NO | |
| unit_number | character varying | NO | |
| building_name | character varying | YES | |
| unit_type | character varying | NO | |
| bedrooms | numeric | YES | |
| bathrooms | numeric | YES | |
| square_feet | integer | NO | |
| market_rent | numeric | YES | |
| renovation_status | character varying | YES | 'ORIGINAL' |
| renovation_date | date | YES | |
| renovation_cost | numeric | YES | |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| other_features | text | YES | |
| is_section8 | boolean | YES | false |
| section8_contract_date | date | YES | |
| section8_contract_rent | numeric | YES | |
| has_balcony | boolean | YES | false |
| has_patio | boolean | YES | false |
| balcony_sf | integer | YES | |
| ceiling_height_ft | numeric | YES | |
| view_type | character varying | YES | |
| is_manager | boolean | YES | false |
| current_rent | numeric | YES | |
| current_rent_psf | numeric | YES | |
| market_rent_psf | numeric | YES | |
| lease_start_date | date | YES | |
| lease_end_date | date | YES | |
| occupancy_status | character varying | YES | |
| floor_number | integer | YES | |
| extra_data | jsonb | YES | |
| unit_category | character varying | YES | |
| unit_designation | character varying | YES | |
| value_source | character varying | YES | |
| tenant_name | character varying | YES | |
| parking_rent | numeric | YES | |
| pet_rent | numeric | YES | |
| past_due_amount | numeric | YES | |
| deposit_amount | numeric | YES | |

### Constraints
| Constraint | Type | Column(s) | References |
|-----------|------|-----------|------------|
| tbl_multifamily_unit_pkey | PRIMARY KEY | unit_id | |
| uq_unit_project_number | UNIQUE | (project_id, unit_number) | |
| tbl_multifamily_unit_project_id_fkey | FOREIGN KEY | project_id | tbl_project.project_id |

> **Note:** Three NOT NULL columns besides PK: `project_id`, `unit_number`, `unit_type`, `square_feet`. Unit number must be unique per project.

---

## tbl_operating_expenses

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| opex_id | bigint | NO | nextval('tbl_operating_expenses_opex_id_seq') |
| project_id | bigint | NO | |
| expense_category | character varying | NO | |
| expense_type | character varying | NO | |
| annual_amount | numeric | NO | |
| amount_per_sf | numeric | YES | |
| is_recoverable | boolean | YES | true |
| recovery_rate | numeric | YES | 1.0 |
| escalation_type | character varying | YES | 'FIXED_PERCENT' |
| escalation_rate | numeric | YES | 0.03 |
| start_period | integer | NO | |
| payment_frequency | character varying | YES | 'MONTHLY' |
| notes | text | YES | |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| account_id | integer | YES | |
| calculation_basis | character varying | YES | 'FIXED_AMOUNT' |
| unit_amount | numeric | YES | |
| is_auto_calculated | boolean | YES | false |
| category_id | integer | YES | |
| statement_discriminator | character varying | YES | 'default' |
| parent_category | character varying | YES | 'unclassified' |
| source | character varying | YES | 'user' |
| value_source | character varying | YES | |

### Constraints
| Constraint | Type | Column(s) | References |
|-----------|------|-----------|------------|
| tbl_operating_expenses_pkey | PRIMARY KEY | opex_id | |
| tbl_operating_expenses_project_id_fkey | FOREIGN KEY | project_id | tbl_project.project_id |
| fk_operating_expenses_category | FOREIGN KEY | category_id | core_unit_cost_category.category_id |

> **Note:** Five NOT NULL columns: `project_id`, `expense_category`, `expense_type`, `annual_amount`, `start_period`. The `start_period` is an integer (period number, not a date).

---

## tbl_sales_comparables

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| comparable_id | integer | NO | nextval('tbl_sales_comparables_comparable_id_seq') |
| project_id | integer | NO | |
| comp_number | integer | YES | |
| property_name | character varying | YES | |
| address | character varying | YES | |
| city | character varying | YES | |
| state | character varying | YES | |
| zip | character varying | YES | |
| sale_date | date | YES | |
| sale_price | numeric | YES | |
| price_per_unit | numeric | YES | |
| price_per_sf | numeric | YES | |
| year_built | integer | YES | |
| units | numeric | YES | |
| building_sf | character varying | YES | |
| cap_rate | character varying | YES | |
| grm | numeric | YES | |
| distance_from_subject | character varying | YES | |
| unit_mix | jsonb | YES | |
| notes | text | YES | |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| latitude | numeric | YES | |
| longitude | numeric | YES | |
| unit_count | integer | YES | |
| costar_comp_id | character varying | YES | |
| price_status | character varying | YES | |
| comp_status | character varying | YES | |
| sale_type | character varying | YES | |
| sale_conditions | character varying | YES | |
| hold_period_months | integer | YES | |
| days_on_market | integer | YES | |
| asking_price | numeric | YES | |
| transfer_tax | numeric | YES | |
| document_number | character varying | YES | |
| escrow_length_days | integer | YES | |
| percent_leased_at_sale | numeric | YES | |
| actual_cap_rate | numeric | YES | |
| pro_forma_cap_rate | numeric | YES | |
| gim | numeric | YES | |
| noi_at_sale | numeric | YES | |
| gross_income_at_sale | numeric | YES | |
| financing_type | character varying | YES | |
| financing_lender | character varying | YES | |
| financing_amount | numeric | YES | |
| financing_rate | numeric | YES | |
| financing_term_months | integer | YES | |
| loan_to_value | numeric | YES | |
| assumed_financing | boolean | YES | false |
| recorded_buyer | character varying | YES | |
| true_buyer | character varying | YES | |
| buyer_contact | character varying | YES | |
| buyer_type | character varying | YES | |
| recorded_seller | character varying | YES | |
| true_seller | character varying | YES | |
| seller_contact | character varying | YES | |
| seller_type | character varying | YES | |
| buyer_broker_company | character varying | YES | |
| buyer_broker_name | character varying | YES | |
| buyer_broker_phone | character varying | YES | |
| listing_broker_company | character varying | YES | |
| listing_broker_name | character varying | YES | |
| listing_broker_phone | character varying | YES | |
| no_broker_deal | boolean | YES | false |
| property_type | character varying | YES | |
| property_subtype | character varying | YES | |
| building_class | character varying | YES | |
| costar_star_rating | numeric | YES | |
| location_type | character varying | YES | |
| num_buildings | integer | YES | |
| num_floors | integer | YES | |
| typical_floor_sf | numeric | YES | |
| tenancy_type | character varying | YES | |
| owner_occupied | boolean | YES | |
| avg_unit_size_sf | numeric | YES | |
| units_per_acre | numeric | YES | |
| parking_spaces | integer | YES | |
| parking_ratio | numeric | YES | |
| parking_type | character varying | YES | |
| elevators | integer | YES | |
| zoning | character varying | YES | |
| construction_type | character varying | YES | |
| roof_type | character varying | YES | |
| hvac_type | character varying | YES | |
| sprinklered | boolean | YES | |
| land_area_sf | numeric | YES | |
| land_area_acres | numeric | YES | |
| far_allowed | numeric | YES | |
| far_actual | numeric | YES | |
| num_parcels | integer | YES | |
| topography | character varying | YES | |
| utilities_available | character varying | YES | |
| entitlements | character varying | YES | |
| environmental_issues | text | YES | |
| total_assessed_value | numeric | YES | |
| land_assessed_value | numeric | YES | |
| improved_assessed_value | numeric | YES | |
| assessment_year | integer | YES | |
| tax_amount | numeric | YES | |
| tax_per_unit | numeric | YES | |
| percent_improved | numeric | YES | |
| metro_market | character varying | YES | |
| submarket | character varying | YES | |
| county | character varying | YES | |
| cbsa | character varying | YES | |
| csa | character varying | YES | |
| dma | character varying | YES | |
| walk_score | integer | YES | |
| transit_score | integer | YES | |
| bike_score | integer | YES | |
| data_source | character varying | YES | |
| verification_status | character varying | YES | |
| verification_source | character varying | YES | |
| verification_date | date | YES | |
| transaction_notes | text | YES | |
| internal_notes | text | YES | |
| is_portfolio_sale | boolean | YES | false |
| portfolio_name | character varying | YES | |
| portfolio_property_count | integer | YES | |
| price_allocation_method | character varying | YES | |
| allocated_price | numeric | YES | |
| site_amenities | jsonb | YES | |
| extra_data | jsonb | YES | |
| raw_import_data | jsonb | YES | |
| property_rights | character varying | YES | |

### Constraints
| Constraint | Type | Column(s) | References |
|-----------|------|-----------|------------|
| tbl_sales_comparables_pkey | PRIMARY KEY | comparable_id | |
| tbl_sales_comparables_project_id_fkey | FOREIGN KEY | project_id | tbl_project.project_id |

> **Note:** Only `project_id` is NOT NULL besides the PK. `cap_rate` and `building_sf` are stored as `character varying` (strings), not numeric — the seeding script must handle this. `units` is `numeric` while `unit_count` is `integer` (appears to be a later addition).

---

## tbl_loan

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| loan_id | bigint | NO | nextval('tbl_loan_loan_id_seq') — sequence exists but not shown in information_schema |
| project_id | bigint | NO | |
| loan_name | character varying | NO | |
| loan_type | character varying | NO | |
| structure_type | character varying | NO | 'TERM' |
| lender_name | character varying | YES | |
| seniority | integer | NO | 1 |
| status | character varying | YES | 'active' |
| commitment_amount | numeric | YES | 0 |
| loan_amount | numeric | YES | |
| loan_to_cost_pct | numeric | YES | |
| loan_to_value_pct | numeric | YES | |
| interest_rate_pct | numeric | YES | |
| interest_rate_decimal | numeric | YES | |
| interest_type | character varying | YES | 'Fixed' |
| interest_index | character varying | YES | |
| interest_spread_bps | integer | YES | |
| rate_floor_pct | numeric | YES | |
| rate_cap_pct | numeric | YES | |
| rate_reset_frequency | character varying | YES | |
| interest_calculation | character varying | YES | 'SIMPLE' |
| interest_payment_method | character varying | YES | 'paid_current' |
| loan_start_date | date | YES | |
| loan_maturity_date | date | YES | |
| maturity_period_id | bigint | YES | |
| loan_term_months | integer | YES | |
| loan_term_years | integer | YES | |
| amortization_months | integer | YES | |
| amortization_years | integer | YES | |
| interest_only_months | integer | YES | 0 |
| payment_frequency | character varying | YES | 'MONTHLY' |
| commitment_date | date | YES | |
| origination_fee_pct | numeric | YES | |
| exit_fee_pct | numeric | YES | |
| unused_fee_pct | numeric | YES | |
| commitment_fee_pct | numeric | YES | |
| extension_fee_bps | integer | YES | |
| extension_fee_amount | numeric | YES | |
| prepayment_penalty_years | integer | YES | |
| interest_reserve_amount | numeric | YES | |
| interest_reserve_funded_upfront | boolean | YES | false |
| reserve_requirements | jsonb | YES | '{}'::jsonb |
| replacement_reserve_per_unit | numeric | YES | |
| tax_insurance_escrow_months | integer | YES | |
| initial_reserve_months | integer | YES | |
| covenants | jsonb | YES | '{}'::jsonb |
| loan_covenant_dscr_min | numeric | YES | |
| loan_covenant_ltv_max | numeric | YES | |
| loan_covenant_occupancy_min | numeric | YES | |
| covenant_test_frequency | character varying | YES | 'Quarterly' |
| guarantee_type | character varying | YES | |
| guarantor_name | character varying | YES | |
| recourse_carveout_provisions | text | YES | |
| extension_options | integer | YES | 0 |
| extension_option_years | integer | YES | |
| draw_trigger_type | character varying | YES | 'COST_INCURRED' |
| commitment_balance | numeric | YES | |
| drawn_to_date | numeric | YES | 0 |
| is_construction_loan | boolean | YES | false |
| release_price_pct | numeric | YES | |
| minimum_release_amount | numeric | YES | |
| takes_out_loan_id | bigint | YES | |
| can_participate_in_profits | boolean | YES | false |
| profit_participation_tier | integer | YES | |
| profit_participation_pct | numeric | YES | |
| monthly_payment | numeric | YES | |
| annual_debt_service | numeric | YES | |
| notes | text | YES | |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| created_by | text | YES | |
| updated_by | text | YES | |
| interest_reserve_inflator | numeric | YES | 1.0 |
| repayment_acceleration | numeric | YES | 1.0 |
| closing_costs_appraisal | numeric | YES | |
| closing_costs_legal | numeric | YES | |
| closing_costs_other | numeric | YES | |
| recourse_type | character varying | YES | 'FULL' |
| collateral_basis_type | character varying | YES | 'PROJECT_COST' |
| commitment_sizing_method | character varying | YES | 'MANUAL' |
| ltv_basis_amount | numeric | YES | |
| ltc_basis_amount | numeric | YES | |
| calculated_commitment_amount | numeric | YES | |
| governing_constraint | character varying | YES | |
| net_loan_proceeds | numeric | YES | |
| index_rate_pct | numeric | YES | |

### Constraints
| Constraint | Type | Column(s) | References |
|-----------|------|-----------|------------|
| tbl_loan_pkey | PRIMARY KEY | loan_id | |
| tbl_loan_project_id_fkey | FOREIGN KEY | project_id | tbl_project.project_id |
| tbl_loan_maturity_period_id_fkey | FOREIGN KEY | maturity_period_id | tbl_calculation_period.period_id |
| tbl_loan_takes_out_loan_id_fkey | FOREIGN KEY | takes_out_loan_id | tbl_loan.loan_id |

> **Note:** `loan_id` has sequence `tbl_loan_loan_id_seq` (current value: 8) — it auto-increments but the default wasn't visible in `information_schema`. Omit `loan_id` in INSERTs and it will auto-assign. Six NOT NULL columns: `loan_id` (auto), `project_id`, `loan_name`, `loan_type`, `structure_type`, `seniority`.

---

## tbl_project_assumption

### Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| assumption_id | integer | NO | nextval('tbl_project_assumption_assumption_id_seq') |
| project_id | bigint | NO | |
| assumption_key | character varying | NO | |
| assumption_value | text | YES | |
| assumption_type | character varying | YES | 'user' |
| scope | character varying | YES | 'project' |
| scope_id | bigint | YES | |
| notes | text | YES | |
| source_doc_id | bigint | YES | |
| confidence_score | numeric | YES | |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| created_by | text | YES | |
| value_source | character varying | YES | |

### Constraints

(Not queried separately — included for completeness from API Discovery Report)

| Constraint | Type | Column(s) | References |
|-----------|------|-----------|------------|
| PK | PRIMARY KEY | assumption_id | |
| FK | FOREIGN KEY | project_id | tbl_project.project_id (ON DELETE CASCADE) |

> **Note:** Three NOT NULL columns: `assumption_id` (auto), `project_id`, `assumption_key`. This table cascades on project delete — no manual cleanup needed.

---

## Quick Reference: NOT NULL Fields per Table

For the seeding script — these fields MUST be provided:

| Table | Required Fields |
|-------|----------------|
| tbl_project | project_name, project_type_code, analysis_perspective, analysis_purpose |
| tbl_multifamily_unit_type | project_id |
| tbl_multifamily_unit | project_id, unit_number, unit_type, square_feet |
| tbl_operating_expenses | project_id, expense_category, expense_type, annual_amount, start_period |
| tbl_sales_comparables | project_id |
| tbl_loan | project_id, loan_name, loan_type, structure_type, seniority (loan_id auto-sequences) |
| tbl_project_assumption | project_id, assumption_key |

## Unique Constraints Summary

| Table | Constraint | Columns |
|-------|-----------|---------|
| tbl_multifamily_unit_type | uq_unit_type_project_code | (project_id, unit_type_code) |
| tbl_multifamily_unit_type | uq_unit_type_project_name | (project_id, unit_type_name) |
| tbl_multifamily_unit | uq_unit_project_number | (project_id, unit_number) |

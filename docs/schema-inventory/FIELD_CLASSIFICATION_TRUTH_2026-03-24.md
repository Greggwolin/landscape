# Field Classification Truth Document

**Date:** 2026-03-24
**Source:** Code-based evidence gathering + live `tbl_field_catalog` query
**Status:** PHASE 2 COMPLETE — Classifications applied to live DB

---

## Executive Summary

`tbl_field_catalog` has **3,664 rows**. After Phase 2 reclassification:

| Classification | Before | After | Change |
|---|---|---|---|
| Input (`is_editable=true, is_calculated=false`) | 2,768 | **2,626** | -142 |
| Calculated (`is_calculated=true, is_editable=false`) | 48 | **191** | +143 |
| Infrastructure (`both false`) | 848 | **847** | -1 |
| Calculated/Overridable (`both true`) | 0 | **0** | deferred |

**Backup table:** `tbl_field_catalog_backup_20260324` (3,664 rows, pre-change snapshot)

**What changed:**
- Batch 1: 18 high-confidence engine outputs (construction loan schedule, project metrics, cost approach) → Calculated
- Batch 2: 125 derived fields (per-unit ratios, totals, implied rates, net proceeds, NOI, cumulative amounts) reclassified using the ALLOWED_UPDATES rule: if field matches calculated pattern AND is NOT in ALLOWED_UPDATES whitelist on same table → Calculated
- Batch 3: Calculated/Overridable deferred — `tbl_model_override` has only 2 inactive test rows; registry CSVs defining `field_role='output'` are runtime data not in repo

**Revised estimate:** ~191 persisted calculated fields (not 400-500). The gap is real and well-explained — most engine outputs are in-memory computations returned via API without DB storage.

---

## Evidence Sources

### 1. Financial Engine Outputs (Code Evidence)

**Source:** `services/financial_engine_py/` + `backend/apps/calculations/` + `backend/apps/financial/`

#### Construction Loan Schedule → `tbl_debt_draw_schedule`
All of these are **engine-computed outputs** written by `construction_loan_service.py`:

| Field | Currently Marked | Should Be |
|---|---|---|
| `draw_amount` | Input | **Calculated** |
| `cumulative_drawn` | Input | **Calculated** |
| `available_remaining` | Input | **Calculated** |
| `beginning_balance` | Input | **Calculated** |
| `ending_balance` | Input | **Calculated** |
| `interest_amount` | Input | **Calculated** |
| `interest_expense` | Input | **Calculated** |
| `interest_paid` | Unclassified | **Calculated** |
| `deferred_interest` | Input | **Calculated** |
| `cumulative_interest` | Input | **Calculated** |
| `principal_payment` | Input | **Calculated** |
| `outstanding_balance` | Input | **Calculated** |

#### Cost Approach → `tbl_cost_approach`
Written by `models_valuation.py` / cost approach service:

| Field | Currently Marked | Should Be |
|---|---|---|
| `total_depreciation` | **Calculated** ✓ | Correct |
| `total_land_value` | **Calculated** ✓ | Correct |
| `total_replacement_cost` | **Calculated** ✓ | Correct |
| `depreciated_improvements` | Input | **Calculated** |

#### Financial Engine Scalar Outputs
IRR, NPV, DSCR, XIRR are computed by `services/financial_engine_py/financial_engine/core/metrics.py` using numpy-financial. These flow into:
- `tbl_project.irr` — Currently Calculated ✓
- `tbl_project.noi` — Currently Calculated ✓
- `tbl_project.equity_multiple` — Currently Calculated ✓
- `tbl_project_metrics.avg_dscr` — Currently Calculated ✓
- `tbl_project_metrics.total_project_cost` — Currently Calculated ✓

#### Waterfall Engine Outputs
Computed by `services/financial_engine_py/financial_engine/waterfall/engine.py`. LP/GP distributions, cumulative IRR, promote thresholds — these are returned to Django views for persistence to equity distribution tables.

---

### 2. ALLOWED_UPDATES Whitelists (Landscaper Input Evidence)

**Source:** `backend/apps/landscaper/tool_executor.py`

These are definitively **user-editable Input fields** — the Landscaper AI tool can write to them on user command:

#### `tbl_project` — 123 whitelisted fields
Core identifiers, location, sizing, pricing, financial assumptions, zoning, site ratings, walkability scores, building details, operating metrics (current & proforma), planning, taxonomy, lotbank.

**Notable ambiguity resolved:** Fields like `current_noi`, `proforma_noi`, `cap_rate_current`, `cap_rate_proforma`, `price_per_unit`, `price_per_sf` are in ALLOWED_UPDATES → they are **user inputs** on `tbl_project` (entered from OMs, not calculated by engine). However, the same field names on other tables (e.g., `tbl_project_metrics`) may be calculated.

#### `tbl_parcel` — 14+ whitelisted fields
`parcel_name`, `parcel_code`, `landuse_code`, `landuse_type`, `acres_gross`, `units_total`, `lot_width`, `lot_depth`, `lot_area`, `lot_product`, `family_name`, `type_code`, `product_code`, `description`

#### `tbl_phase` — 8 whitelisted fields
`phase_name`, `phase_no`, `label`, `phase_start_date`, `phase_completion_date`, `absorption_start_date`, `phase_status`, `description`

#### `tbl_operating_expenses` — 16 whitelisted fields
`expense_category`, `expense_type`, `annual_amount`, `amount_per_sf`, `is_recoverable`, `recovery_rate`, `escalation_type`, `escalation_rate`, `start_period`, `payment_frequency`, `notes`, etc.

#### Multifamily Units — 32 whitelisted fields (VALID_UNIT_FIELDS)
`unit_number`, `unit_type`, `bedrooms`, `bathrooms`, `square_feet`, `current_rent`, `market_rent`, `parking_rent`, `pet_rent`, `occupancy_status`, `renovation_status`, `renovation_cost`, `tenant_name`, `lease_start_date`, `lease_end_date`, etc.

---

### 3. Fields Marked Input That Should Be Calculated

Based on cross-referencing code evidence with the catalog, **~120+ fields currently classified as Input exhibit calculated patterns** and are likely computed by the backend:

#### Per-Unit / Per-SF Ratios (Typically Derived)

| Table | Field | Evidence |
|---|---|---|
| `tbl_budget_fact` | `cost_per_unit`, `cost_per_sf` | Derived from amount/units or amount/sf |
| `tbl_budget_items` | `cost_per_unit` | Same pattern |
| `tbl_cap_rate_comps` | `implied_cap_rate` | NOI/sale_price — definitively calculated |
| `tbl_closing_event` | `inflated_price_per_unit`, `gross_proceeds`, `gross_value`, `net_proceeds` | Derived from base price + inflation + costs |
| `tbl_cre_cam_charge` | `budgeted_cam_psf`, `variance_psf` | Derived from amounts/sf |
| `tbl_cre_cap_rate` | `implied_value`, `noi_amount`, `value_per_sf` | Derived from cap rate math |
| `tbl_cre_cash_flow` | `net_operating_income` | Revenue - OpEx |
| `tbl_cre_dcf_analysis` | `equity_multiple`, `net_reversion`, `terminal_noi` | DCF engine outputs |
| `tbl_cre_expense_stop` | `expense_stop_psf`, `expense_stop_total`, `base_year_amount_psf` | Derived |
| `tbl_cre_noi` | `net_operating_income`, `noi_psf` | Revenue - OpEx |
| `tbl_cre_tenant_improvement` | `landlord_ti_total` | rate × sf |
| `tbl_cashflow_summary` | `gross_revenue`, `net_cash_flow`, `net_operating_income` | Aggregated |
| `tbl_lot` | `price_psf` | price/sf |
| `tbl_multifamily_unit` | `current_rent_psf`, `market_rent_psf` | rent/sf |
| `tbl_multifamily_unit_type` | `concessions_avg`, `current_rent_avg`, `total_units` | Averages/aggregations |
| `tbl_opex_timing` | `net_expense` | Derived |
| `tbl_parcel_sale_assumptions` | `gross_parcel_price`, `gross_sale_proceeds`, `net_sale_proceeds`, `net_proceeds_per_uom`, `inflated_price_per_unit`, `improvement_offset_total` | Derived from base inputs + escalation + costs |
| `tbl_participation_payment` | `gross_home_sales`, `net_participation_payment` | Aggregated/derived |
| `tbl_project_metrics` | `equity_multiple`, `min_dscr`, `residual_land_value_per_acre`, `residual_land_value_per_unit`, `stabilized_noi` | All engine outputs |
| `tbl_property_acquisition` | `depreciation_basis`, `price_per_sf`, `price_per_unit` | Derived from acquisition price |
| `tbl_revenue_timing` | `gross_revenue`, `net_revenue` | Aggregated |
| `tbl_sale_settlement` | `closing_cost_per_unit`, `gross_value`, `net_proceeds` | Derived |
| `tbl_sales_comparables` | `price_per_sf`, `price_per_unit` | sale_price/sf or sale_price/units |
| `tbl_tenant_improvement` | `allowance_total` | rate × sf |

#### Context-Dependent Fields (Input on tbl_project, Calculated Elsewhere)

These fields appear in ALLOWED_UPDATES for `tbl_project` (= user inputs there) but are calculated on other tables:

| Field Name | Input On | Calculated On |
|---|---|---|
| `current_noi` | `tbl_project` | `tbl_cre_noi`, `tbl_cashflow_summary` |
| `proforma_noi` | `tbl_project` | `tbl_cre_noi` |
| `price_per_unit` | `tbl_project` | `tbl_sales_comparables`, `tbl_property_acquisition` |
| `price_per_sf` | `tbl_project` | `tbl_sales_comparables`, `tbl_property_acquisition` |
| `total_units` | `tbl_project` | `tbl_multifamily_unit_type`, `tbl_multifamily_property` |
| `gross_sf` | `tbl_project` | computed from unit mix elsewhere |

---

### 4. Override Mechanism (Calculated/Overridable Evidence)

**Source:** `backend/apps/landscaper/services/override_service.py` + `tbl_model_override`

The platform has a toggle-based override system:
- `tbl_model_override` stores `field_key`, `calculated_value`, `override_value`, `is_active`
- `toggle_override()` creates a PendingMutation (Level 2 autonomy)
- `revert_override()` restores calculated value
- Red dot UI indicator shows overridden fields

**Fields eligible for override** = any field with `field_role='output'` in the field registry. These should be classified as **Calculated/Overridable** (`is_calculated=true, is_editable=true`).

**Provenance tracking:** 7 tables have `value_source` columns with CHECK constraint `IN ('ai_extraction', 'user_manual', 'benchmark', 'import')`:
- `tbl_project`, `core_fin_fact_budget`, `tbl_project_assumption`, `tbl_operating_expenses`, `tbl_multifamily_unit`, `tbl_multifamily_unit_type`, `tbl_acreage_allocation`

---

### 5. Unclassified Fields (848) — Infrastructure Breakdown

The 848 fields with `is_calculated=false, is_editable=false` are overwhelmingly infrastructure:

| Category | Count (approx) | Examples |
|---|---|---|
| Primary keys (`*_id`) | ~250 | `project_id`, `parcel_id`, `fact_id`, `doc_id` |
| Foreign keys (references) | ~200 | `category_id`, `parent_id`, `user_id`, `phase_id` |
| Timestamps (`created_at`, `updated_at`) | ~200 | All tables have these |
| Audit fields (`created_by`, `updated_by`) | ~40 | User tracking |
| System/config IDs | ~100 | `workspace_id`, `template_id`, `scenario_id` |
| Source tracking (`source_id`, `doc_id` refs) | ~50 | Market data, benchmarks |
| Genuine miscategorized | ~8 | `cumulative_participation_paid` (should be Calculated) |

**Recommendation:** Reclassify all 848 as **Infrastructure** (leave `is_calculated=false, is_editable=false`). This is actually the correct classification for infrastructure fields — they are neither user inputs nor calculated outputs. No change needed for this group.

---

## Applied Reclassification Summary

### Batch 1: 18 High-Confidence Engine Outputs → Calculated ✅

| Table | Fields | Evidence |
|---|---|---|
| `tbl_debt_draw_schedule` | 12 fields (draw_amount, cumulative_drawn, balances, interest amounts, principal) | `construction_loan_service.py` computes all |
| `tbl_project_metrics` | 5 fields (equity_multiple, min_dscr, residual_land_value_per_acre/unit, stabilized_noi) | Financial engine scalar outputs |
| `tbl_cost_approach` | 1 field (depreciated_improvements) | Cost approach calculation service |

### Batch 2: 125 Derived Fields → Calculated ✅

**Rule applied:** If field matches calculated pattern (total_*, *_per_unit, *_psf, avg_*, net_*, gross_*, implied_*, cumulative_*) AND is NOT in ALLOWED_UPDATES whitelist for that table → Calculated.

**8 fields kept as Input** (confirmed in ALLOWED_UPDATES on same table):
- `tbl_operating_expenses.amount_per_sf` — user enters this directly
- `tbl_parcel.units_total` — user-entered lot count
- `tbl_project.current_noi`, `proforma_noi`, `gross_sf`, `price_per_sf`, `price_per_unit`, `total_units` — all user inputs from OMs on `tbl_project`

### Batch 3: Calculated/Overridable — Deferred

`tbl_model_override` has only 2 inactive test rows. The field registry CSVs that define `field_role='output'` are runtime deployment data, not in the repo. No active override usage exists to classify from. Will revisit when override system is production-active.

---

## Calculated Fields by Table (Top 20)

| Table | Calculated Fields |
|---|---|
| `tbl_debt_draw_schedule` | 12 |
| `tbl_project_metrics` | 9 |
| `tbl_parcel_sale_assumptions` | 8 |
| `mkt_new_home_project` | 7 |
| `tbl_closing_event` | 6 |
| `tbl_cost_approach` | 6 |
| `tbl_parcel` | 5 |
| `tbl_capex_reserve` | 5 |
| `tbl_project` | 5 |
| `tbl_market_rate_analysis` | 5 |
| `tbl_cashflow_summary` | 5 |
| `tbl_cre_dcf_analysis` | 5 |
| `tbl_multifamily_unit_type` | 4 |
| `tbl_cre_expense_stop` | 4 |
| `tbl_cre_noi` | 4 |
| `tbl_revenue_rent` | 4 |
| `tbl_cre_cam_charge` | 4 |
| `market_competitive_project_products` | 4 |
| `tbl_multifamily_property` | 4 |
| `tbl_participation_payment` | 3 |

---

## Next Steps

1. **Rebuild Field Count Summary (Chapter F PDF)** with accurate 2,626 / 191 / 847 counts
2. **Spreadsheet review surface** — export the 191 Calculated fields for spot-check validation
3. **Calculated/Overridable** — revisit when override system goes production-active
4. **Update CLAUDE.md** calculated field count reference if needed

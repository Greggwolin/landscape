# Landscaper Tool Coverage Audit — Land Development & Multifamily

> **Audit Date:** 2026-02-27
> **Scope:** All 180 registered Landscaper tools, land development tables, multifamily tables, valuation tables
> **Source Files:** `backend/apps/landscaper/tool_schemas.py` (3,163 lines), `backend/apps/landscaper/tool_executor.py` (14,886 lines)
> **Method:** Static analysis — grep of `@register_tool` decorators, `ALLOWED_UPDATES` whitelist, and DB `information_schema` queries
> **Status:** Read-only audit. No code changes.

---

## Table of Contents

1. [Complete Tool Inventory](#1-complete-tool-inventory)
2. [Land Development Coverage](#2-land-development-coverage)
3. [Multifamily Coverage](#3-multifamily-coverage)
4. [Gap Priority List](#4-gap-priority-list)
5. [Recommended New Tools](#5-recommended-new-tools)

---

## 1. Complete Tool Inventory

**Total tools defined in `tool_schemas.py`: 180** (file header says 169 — stale by 11 recent additions)

### 1.1 Tool Categories

| Category | Count | Tables Read | Tables Written |
|----------|-------|-------------|----------------|
| Project CRUD | ~12 | tbl_project | tbl_project |
| Container / Hierarchy | ~8 | tbl_container, tbl_area, tbl_phase | tbl_container, tbl_area, tbl_phase |
| Parcel Management | ~10 | tbl_parcel | tbl_parcel |
| Land Use Taxonomy | ~12 | lu_family, lu_type, lu_res_spec, res_lot_product | lu_family, lu_type, lu_res_spec, res_lot_product |
| Absorption / Sales | ~10 | tbl_absorption_schedule, tbl_parcel_sale_event | tbl_absorption_schedule, tbl_parcel_sale_event |
| Acreage / Land Planning | ~8 | tbl_acreage_allocation, land_use_pricing | tbl_acreage_allocation, land_use_pricing |
| Lot Mix | ~4 | tbl_lot_mix | tbl_lot_mix |
| Budget / Financial | ~15 | core_fin_fact_budget, tbl_budget_category | core_fin_fact_budget, tbl_budget_category |
| Multifamily Units | ~8 | tbl_multifamily_unit, tbl_multifamily_unit_type | tbl_multifamily_unit, tbl_multifamily_unit_type |
| Leasing | ~6 | tbl_multifamily_lease | tbl_multifamily_lease |
| Operating Expenses | ~6 | tbl_operating_expense | tbl_operating_expense |
| Rent Roll | ~4 | tbl_rent_roll_unit | — (read-only) |
| Income Approach | ~3 | tbl_income_approach (SELECT only) | — (read-only calculators) |
| Cashflow | ~4 | tbl_cashflow, tbl_cashflow_summary | tbl_cashflow (via compute) |
| Documents / DMS | ~12 | core_doc, tbl_document_* | core_doc |
| Knowledge / RAG | ~8 | tbl_knowledge_*, embeddings | tbl_knowledge_* |
| Market Intel | ~6 | tbl_market_* | tbl_market_* |
| Landscaper Chat | ~4 | landscaper_chat_thread/message | landscaper_chat_thread/message |
| System / Picklist | ~8 | tbl_system_picklist, lu_property_subtype | tbl_system_picklist |
| Portfolio Intelligence | ~4 | tbl_project (cross-project) | — (read-only) |
| Land Dev Ingestion | ~4 | Various land dev tables | Various land dev tables |
| Utilities / Misc | ~28 | Various | Various |

### 1.2 Full Tool List (180 tools)

<details>
<summary>Click to expand full tool list</summary>

**Project Management:**
1. get_project_summary
2. update_project_field
3. bulk_update_fields
4. search_projects
5. get_project_metadata
6. get_project_financials
7. create_project
8. delete_project
9. duplicate_project
10. get_project_timeline
11. compare_projects
12. get_project_scores

**Container / Hierarchy:**
13. get_containers
14. update_container
15. create_container
16. delete_container
17. get_areas
18. update_area
19. create_area
20. delete_area

**Phase Management:**
21. get_phases
22. update_phase
23. create_phase
24. delete_phase
25. get_phase_summary
26. reorder_phases

**Parcel Management:**
27. get_parcels
28. update_parcel
29. create_parcel
30. delete_parcel
31. get_parcel_details
32. bulk_update_parcels
33. assign_parcels_to_phase
34. get_parcel_financials
35. clone_parcel
36. search_parcels

**Land Use Taxonomy:**
37. get_land_use_families
38. update_land_use_family
39. create_land_use_family
40. delete_land_use_family
41. get_land_use_types
42. update_land_use_type
43. create_land_use_type
44. delete_land_use_type
45. get_residential_products
46. update_residential_product
47. create_residential_product
48. delete_residential_product

**Absorption / Sales:**
49. get_absorption_schedule
50. update_absorption_schedule
51. create_absorption_schedule
52. delete_absorption_schedule
53. get_parcel_sale_events
54. update_parcel_sale_event
55. create_parcel_sale_event
56. delete_parcel_sale_event
57. calculate_absorption_metrics
58. get_sales_velocity

**Acreage Allocation / Land Planning:**
59. get_acreage_allocation
60. update_land_use_budget
61. get_land_planning_summary
62. update_land_planning
63. get_market_assumptions
64. update_market_assumptions
65. calculate_land_residual
66. get_land_development_summary

**Lot Mix:**
67. get_lot_mix
68. update_lot_mix
69. create_lot_mix_entry
70. delete_lot_mix_entry

**Budget / Financial:**
71. get_budget_items
72. update_budget_item
73. create_budget_item
74. delete_budget_item
75. get_budget_categories
76. get_budget_summary
77. get_budget_by_phase
78. get_budget_by_category
79. bulk_create_budget_items
80. import_budget_template
81. get_actual_items
82. create_actual_item
83. get_variance_report
84. calculate_cost_per_unit
85. get_budget_timeline

**Multifamily Units:**
86. get_units
87. update_unit
88. create_unit
89. delete_units
90. get_unit_types
91. update_unit_type
92. create_unit_type
93. delete_unit_type

**Leasing:**
94. get_leases
95. update_lease
96. create_lease
97. delete_lease
98. get_lease_summary
99. calculate_lease_metrics

**Operating Expenses:**
100. get_operating_expenses
101. update_operating_expenses
102. create_operating_expense
103. delete_operating_expense
104. get_expense_categories
105. calculate_expense_ratios

**Rent Roll:**
106. get_rent_roll
107. get_rent_roll_summary
108. analyze_rent_roll
109. get_rent_comparables

**Income Approach (READ-ONLY calculators):**
110. analyze_loss_to_lease
111. calculate_year1_buyer_noi
112. check_income_analysis_availability

**Cashflow:**
113. get_cashflow_results
114. compute_cashflow_expression
115. update_cashflow_assumption
116. get_cashflow_summary

**Documents / DMS:**
117. upload_document
118. get_documents
119. delete_document
120. get_document_metadata
121. extract_document_data
122. get_extraction_results
123. search_documents
124. get_document_types
125. classify_document
126. link_document_to_entity
127. get_document_versions
128. compare_documents

**Knowledge / RAG:**
129. search_knowledge
130. add_knowledge_fact
131. update_knowledge_fact
132. delete_knowledge_fact
133. get_knowledge_entities
134. process_document_knowledge
135. get_knowledge_summary
136. search_similar_facts

**Market Intelligence:**
137. get_market_data
138. search_market_comps
139. get_demographic_data
140. get_market_trends
141. import_market_data
142. get_submarket_analysis

**Landscaper Chat:**
143. get_chat_history
144. create_chat_thread
145. get_thread_messages
146. search_chat_history

**System / Picklist:**
147. get_picklist_options
148. update_picklist_option
149. create_picklist_option
150. get_property_types
151. get_property_subtypes
152. get_analysis_types
153. get_phase_statuses
154. get_ownership_types

**Portfolio Intelligence:**
155. compare_portfolio_projects
156. get_portfolio_summary
157. get_portfolio_metrics
158. rank_projects

**Land Dev Ingestion:**
159. ingest_land_dev_data
160. validate_land_dev_import
161. map_land_dev_fields
162. preview_land_dev_import

**Calculation Utilities:**
163. calculate_irr
164. calculate_npv
165. calculate_dscr
166. calculate_cap_rate
167. calculate_grm
168. calculate_cash_on_cash

**GIS / Map:**
169. get_map_layers
170. geocode_address
171. get_parcel_boundaries
172. calculate_distances

**Scenario Management:**
173. create_scenario
174. compare_scenarios
175. get_scenarios
176. delete_scenario

**Misc Utilities:**
177. format_currency
178. generate_report_data
179. export_to_csv
180. get_system_status

</details>

### 1.3 Mutation Security Model

Tools with `is_mutation=True` follow Level 2 Autonomy:
- Tool proposes mutation with structured payload
- User sees confirmation dialog in chat
- Execution only proceeds after explicit user approval
- All writes are logged to `landscaper_chat_message` with `tool_result` metadata

---

## 2. Land Development Coverage

### 2.1 Tables WITH Tool Coverage

| Table | Columns | Tool(s) | CRUD | Notes |
|-------|---------|---------|------|-------|
| `tbl_project` | 134 | `update_project_field`, `bulk_update_fields` | R/U | ALLOWED_UPDATES covers ~30/134 columns |
| `tbl_area` | 4 | `get_areas`, `update_area`, `create_area`, `delete_area` | Full CRUD | ✅ Complete |
| `tbl_phase` | 11 | `get_phases`, `update_phase`, `create_phase`, `delete_phase` | Full CRUD | ✅ Complete |
| `tbl_parcel` | 45 | `get_parcels`, `update_parcel`, `create_parcel`, `delete_parcel` | Full CRUD | Dedicated tool covers ~30 params |
| `tbl_absorption_schedule` | 25 | `get_absorption_schedule`, `update_absorption_schedule`, etc. | Full CRUD | ✅ Complete |
| `tbl_parcel_sale_event` | 26 | `get_parcel_sale_events`, `update_parcel_sale_event`, etc. | Full CRUD | ✅ Complete |
| `tbl_acreage_allocation` | 16 | `update_land_use_budget`, `get_acreage_allocation` | R/U | Write via `update_land_use_budget` |
| `lu_family` | 5 | `get_land_use_families`, `update_land_use_family`, etc. | Full CRUD | ✅ Complete |
| `lu_type` | 7 | `get_land_use_types`, `update_land_use_type`, etc. | Full CRUD | ✅ Complete |
| `lu_res_spec` | 18 | `get_residential_products`, `update_residential_product` | R/U/C/D | ✅ Complete |
| `res_lot_product` | — | `get_residential_products` | R | Read via join |
| `tbl_lot_mix` | — | `get_lot_mix`, `update_lot_mix`, etc. | Full CRUD | ✅ Complete |
| `land_use_pricing` | 13 | `update_market_assumptions` | R/U | Partial — write via market assumptions tool |
| `core_fin_fact_budget` | — | Budget tools | Full CRUD | ✅ Complete |
| `tbl_cashflow` | 15 | `get_cashflow_results`, `compute_cashflow_expression` | R/Compute | Read + compute, no direct row CRUD |
| `tbl_cashflow_summary` | 21 | `get_cashflow_results` | R | Read-only |

### 2.2 Tables WITHOUT Tool Coverage (Land Dev)

| Table | Columns | Impact | Notes |
|-------|---------|--------|-------|
| **`tbl_parcel_sale_assumptions`** | 31 | 🔴 HIGH | Pricing, escalation, closing costs per parcel — critical for land dev valuation |
| **`tbl_lot`** | 23 | 🟡 MEDIUM | Individual lot tracking within parcels |
| **`tbl_lot_type`** | 4 | 🟡 MEDIUM | Lot type classification |
| **`tbl_sale_phases`** | 9 | 🟡 MEDIUM | Sale phasing schedule |
| **`tbl_land_comparables`** | 20 | 🔴 HIGH | Land comp data for sales comparison approach |
| **`tbl_land_comp_adjustments`** | 7 | 🔴 HIGH | Adjustment factors for land comps |
| **`tbl_sales_comp_land`** | 36 | 🔴 HIGH | Sales comparison approach for land |

### 2.3 `update_project_field` Coverage vs `tbl_project` Schema

**ALLOWED_UPDATES whitelist (30 fields):**

```
project_name, description, project_type, financial_model_type,
project_address, street_address, city, jurisdiction_city,
state, jurisdiction_state, county, jurisdiction_county,
zip_code, location_lat, location_lon, location_description,
market, submarket, market_velocity_annual,
acres_gross, target_units, total_units, gross_sf, lot_size_sf,
lot_size_acres, net_rentable_area, building_count, number_of_stories, year_built,
price_range_low, price_range_high,
discount_rate_pct, cost_of_capital_pct,
analysis_start_date, analysis_end_date, calculation_frequency,
legal_owner, developer_owner, is_active
```

**Notable tbl_project columns NOT in ALLOWED_UPDATES (104 columns excluded):**

| Category | Missing Columns |
|----------|----------------|
| **Financial Summary** | `current_noi`, `proforma_noi`, `stabilized_noi`, `cap_rate_current`, `cap_rate_market`, `cap_rate_stabilized`, `asking_price`, `price_per_unit`, `price_per_sf`, `total_project_cost`, `equity_required` |
| **Property Classification** | `property_subtype`, `property_class`, `msa_id`, `apn_primary`, `ownership_type` |
| **Site Attributes** | `site_area_sf`, `site_area_acres`, `far`, `building_coverage`, `parking_ratio`, `parking_spaces`, `frontage_ft`, `topography`, `utilities_available`, `flood_zone` |
| **Improvement Attributes** | `building_sf`, `rentable_sf`, `common_area_sf`, `construction_type`, `foundation_type`, `roof_type`, `hvac_type`, `elevator_count` |
| **Zoning** | `zoning_code`, `zoning_description`, `entitlements_status`, `entitled_units`, `entitled_density` |
| **Scoring** | `location_score`, `market_score`, `financial_score`, `overall_score` |
| **Lotbank** | `lotbank_total_lots`, `lotbank_remaining_lots`, `lotbank_monthly_takedown`, `lotbank_price_per_lot` |
| **Analysis Config** | `analysis_perspective`, `analysis_purpose`, `value_source`, `effective_date`, `report_date` |
| **Land Dev Specific** | `total_lots_planned`, `total_lots_entitled`, `total_lots_sold`, `total_lots_remaining`, `avg_lot_price`, `avg_lot_size_sf` |

### 2.4 `tbl_parcel` ALLOWED_UPDATES vs Dedicated Tool

The `ALLOWED_UPDATES` whitelist for `tbl_parcel` has **9 fields** (some with incorrect names):

```
parcel_name, parcel_type, lot_count, acres_gross, acres_net,
price_per_lot, total_revenue, status, notes
```

**Issues found:**
- `parcel_type` — not a real column (actual: `land_use_family_id` or no direct type column)
- `lot_count` — not a real column (actual: `total_lots` or `entitled_lots`)

However, the **dedicated `update_parcel` handler** bypasses ALLOWED_UPDATES and accepts ~30 parameters directly, covering most of the 45 columns. The ALLOWED_UPDATES path is a fallback for `bulk_update_fields` — the incorrect field names would silently fail.

### 2.5 `tbl_phase` ALLOWED_UPDATES vs Dedicated Tool

The `ALLOWED_UPDATES` whitelist for `tbl_phase` has **9 fields**:

```
phase_name, phase_number, status, start_date, end_date,
total_lots, budget_amount, notes, is_active
```

**Issues found:**
- `phase_number` — not a real column (actual: `phase_order` or `sort_order`)
- `budget_amount` — not a real column on tbl_phase

The **dedicated `update_phase` handler** covers correctly. These ALLOWED_UPDATES entries would silently no-op.

---

## 3. Multifamily Coverage

### 3.1 Tables WITH Tool Coverage

| Table | Columns | Tool(s) | CRUD | Notes |
|-------|---------|---------|------|-------|
| `tbl_multifamily_unit` | 35 | `get_units`, `update_unit`, `create_unit`, `delete_units` | Full CRUD | ✅ Complete — `VALID_UNIT_FIELDS` whitelist (lines 189-198) |
| `tbl_multifamily_unit_type` | 20 | `get_unit_types`, `update_unit_type`, `create_unit_type`, `delete_unit_type` | Full CRUD | ✅ Complete |
| `tbl_multifamily_lease` | 19 | `get_leases`, `update_lease`, `create_lease`, `delete_lease` | Full CRUD | ✅ Complete |
| `tbl_operating_expense` | 16 | `update_operating_expenses`, `get_operating_expenses` | Full CRUD | ALLOWED_UPDATES covers 18 fields |
| `tbl_rent_roll_unit` | 13 | `get_rent_roll`, `analyze_rent_roll` | R | Read-only — no direct write tools |
| `tbl_cashflow` | 15 | `get_cashflow_results`, `update_cashflow_assumption` | R/U | Read + assumption updates |
| `tbl_cashflow_summary` | 21 | `get_cashflow_results` | R | Read-only aggregation |

### 3.2 Tables WITHOUT Tool Coverage (Multifamily)

| Table | Columns | Impact | Notes |
|-------|---------|--------|-------|
| **`tbl_multifamily_property`** | 59 | 🔴 HIGH | Building-level attributes (year built, construction type, amenities, parking, etc.) — zero CRUD tools |
| **`tbl_multifamily_turn`** | 16 | 🟡 MEDIUM | Unit turnover tracking — only referenced in DELETE cascade from `delete_units` |
| **`tbl_income_property`** | 26 | 🔴 HIGH | Income property master record — zero tool coverage |
| **`tbl_income_property_mf_ext`** | 37 | 🔴 HIGH | MF-specific income extensions (vacancy, concessions, loss-to-lease rates) — zero tool coverage |
| **`tbl_value_add_assumptions`** | 15 | 🟡 MEDIUM | Value-add renovation/repositioning assumptions — zero tool coverage |
| **`tbl_lease_assumptions`** | 17 | 🟡 MEDIUM | Lease assumption parameters (renewal probability, downtime, TI/LC) — zero tool coverage |

### 3.3 Income Approach Tool Scope

The three income approach tools are **READ-ONLY calculators**, not CRUD handlers:

| Tool | What It Does | Tables Read | Tables Written |
|------|-------------|-------------|----------------|
| `analyze_loss_to_lease` | Computes gap between in-place rents vs market | `tbl_multifamily_unit`, `tbl_multifamily_unit_type` | **None** |
| `calculate_year1_buyer_noi` | Builds Year 1 pro forma NOI from current data | Units, leases, operating expenses | **None** |
| `check_income_analysis_availability` | Validates data completeness for income analysis | Multiple MF tables | **None** |

**`tbl_income_approach` reference:** Only 1 occurrence in tool_executor.py (line ~598) — a SELECT for `cap_rate` as fallback value. No INSERT/UPDATE/DELETE.

### 3.4 Valuation Tables — Cross-cutting Gaps

These valuation tables have **ZERO references** in `tool_executor.py`:

| Table | Columns | Approach | Impact |
|-------|---------|----------|--------|
| **`tbl_income_approach`** | 16 | Income | 🔴 HIGH — Cannot persist income approach parameters (cap rates, NOI selections, DCF assumptions) |
| **`tbl_valuation_reconciliation`** | 13 | Reconciliation | 🔴 HIGH — Cannot persist approach weights or final value opinion |
| **`tbl_cost_approach`** | 25 | Cost | 🟡 MEDIUM — Cost approach has frontend CRUD; Landscaper just can't interact |
| **`tbl_land_comparables`** | 20 | Sales Comp | 🔴 HIGH — Cannot manage land comparable data |
| **`tbl_land_comp_adjustments`** | 7 | Sales Comp | 🔴 HIGH — Cannot manage land comp adjustment factors |
| **`tbl_sales_comp_land`** | 36 | Sales Comp | 🔴 HIGH — Cannot manage land sales comparison data |

---

## 4. Gap Priority List

### P1 — Critical Gaps (Block core workflows)

| # | Gap | Table(s) | Why Critical |
|---|-----|----------|-------------|
| P1-1 | **MF Property CRUD** | `tbl_multifamily_property` (59 cols) | Building-level attributes (year built, construction, amenities, parking) have no AI-assisted entry path. Users must use UI only. |
| P1-2 | **Income Approach Persistence** | `tbl_income_approach` (16 cols) | Income approach parameters (cap rates, NOI basis, DCF assumptions) cannot be saved/updated via Landscaper. READ-only calculator tools exist but results aren't persisted. |
| P1-3 | **Parcel Sale Assumptions** | `tbl_parcel_sale_assumptions` (31 cols) | Per-parcel pricing escalation, closing cost assumptions, and revenue projections — core to land dev valuation — have zero tool coverage. |
| P1-4 | **Income Property Record** | `tbl_income_property` (26 cols), `tbl_income_property_mf_ext` (37 cols) | Income property master record and MF extensions (vacancy rates, concessions, loss-to-lease %) have no tool coverage. These feed the income approach calculators. |
| P1-5 | **Valuation Reconciliation** | `tbl_valuation_reconciliation` (13 cols) | Final value opinion, approach weights, and narrative cannot be managed via Landscaper. Backend API exists but no tool wiring. |
| P1-6 | **Land Comparables** | `tbl_land_comparables` (20 cols), `tbl_land_comp_adjustments` (7 cols), `tbl_sales_comp_land` (36 cols) | Entire land sales comparison approach has zero Landscaper coverage — cannot add comps, adjustments, or analysis. |

### P2 — Important Gaps (Degrade experience)

| # | Gap | Table(s) | Why Important |
|---|-----|----------|--------------|
| P2-1 | **Lease Assumptions** | `tbl_lease_assumptions` (17 cols) | Renewal probability, downtime, TI/LC assumptions cannot be set via AI. Affects DCF accuracy. |
| P2-2 | **Value-Add Assumptions** | `tbl_value_add_assumptions` (15 cols) | Renovation/repositioning scenarios — key for MF investment analysis — have no tool coverage. |
| P2-3 | **MF Turn Tracking** | `tbl_multifamily_turn` (16 cols) | Unit turnover costs/timing only referenced in delete cascade. No read or create tools. |
| P2-4 | **Cost Approach Tools** | `tbl_cost_approach` (25 cols) | Frontend has full CRUD, but Landscaper cannot interact with cost approach data. |
| P2-5 | **`update_project_field` coverage** | `tbl_project` | Only 30/134 columns writable. Missing: all financial summary fields, property classification, site attributes, zoning, scoring, lotbank, analysis config. |
| P2-6 | **Lot Management** | `tbl_lot` (23 cols), `tbl_lot_type` (4 cols) | Individual lot tracking within parcels has no tools. |
| P2-7 | **Sale Phases** | `tbl_sale_phases` (9 cols) | Sale phasing schedule has no tools. |

### P3 — Nice-to-Have (Polish & completeness)

| # | Gap | Table(s) | Notes |
|---|-----|----------|-------|
| P3-1 | **Rent Roll Write** | `tbl_rent_roll_unit` (13 cols) | Currently read-only. Direct write could enable rent roll corrections via chat. |
| P3-2 | **ALLOWED_UPDATES field name errors** | `tbl_parcel`, `tbl_phase` | `parcel_type`, `lot_count`, `phase_number`, `budget_amount` are not real columns. Silently no-op on `bulk_update_fields`. |
| P3-3 | **Cashflow Direct CRUD** | `tbl_cashflow` (15 cols) | Currently read + compute only. Direct row manipulation could enable manual overrides. |
| P3-4 | **Stale tool count header** | `tool_schemas.py` line 1 | Says "169 tools" but file contains 180. Update comment. |

---

## 5. Recommended New Tools

### For P1 Gaps

#### P1-1: MF Property CRUD

| Tool Name | Operation | Target Table | Key Parameters |
|-----------|-----------|-------------|----------------|
| `get_multifamily_property` | SELECT | `tbl_multifamily_property` | `project_id` |
| `update_multifamily_property` | UPSERT | `tbl_multifamily_property` | `project_id`, `year_built`, `construction_type`, `total_units`, `total_sf`, `parking_spaces`, `parking_ratio`, `amenities`, `property_condition`, `last_renovation_date`, `elevator_count`, `stories`, `common_area_sf`, `unit_mix_summary` |

**Implementation notes:** Single row per project. UPSERT pattern (INSERT ON CONFLICT UPDATE). Mutation flag required.

#### P1-2: Income Approach Persistence

| Tool Name | Operation | Target Table | Key Parameters |
|-----------|-----------|-------------|----------------|
| `get_income_approach` | SELECT | `tbl_income_approach` | `project_id` |
| `update_income_approach` | UPSERT | `tbl_income_approach` | `project_id`, `noi_basis`, `cap_rate`, `cap_rate_source`, `dcf_discount_rate`, `dcf_terminal_cap`, `dcf_hold_period`, `vacancy_rate`, `credit_loss`, `opex_ratio`, `indicated_value` |

**Implementation notes:** Wrap existing calculator outputs — after `calculate_year1_buyer_noi` runs, persist results to `tbl_income_approach`.

#### P1-3: Parcel Sale Assumptions

| Tool Name | Operation | Target Table | Key Parameters |
|-----------|-----------|-------------|----------------|
| `get_parcel_sale_assumptions` | SELECT | `tbl_parcel_sale_assumptions` | `project_id`, `parcel_id` (optional) |
| `update_parcel_sale_assumptions` | UPSERT | `tbl_parcel_sale_assumptions` | `parcel_id`, `base_price_per_lot`, `price_escalation_pct`, `annual_escalation_rate`, `closing_cost_pct`, `commission_pct`, `absorption_rate_monthly`, `first_sale_date`, `lot_premium_pct`, `bulk_discount_pct` |
| `bulk_update_parcel_sale_assumptions` | Multi-UPSERT | `tbl_parcel_sale_assumptions` | Array of parcel assumption objects |

**Implementation notes:** One row per parcel. Bulk tool needed because land devs often set assumptions across all parcels at once.

#### P1-4: Income Property Record

| Tool Name | Operation | Target Table | Key Parameters |
|-----------|-----------|-------------|----------------|
| `get_income_property` | SELECT | `tbl_income_property` | `project_id` |
| `update_income_property` | UPSERT | `tbl_income_property` | `project_id`, `gross_potential_rent`, `vacancy_rate`, `effective_gross_income`, `total_operating_expenses`, `net_operating_income`, `replacement_reserves` |
| `get_income_property_mf_ext` | SELECT | `tbl_income_property_mf_ext` | `project_id` |
| `update_income_property_mf_ext` | UPSERT | `tbl_income_property_mf_ext` | `project_id`, `loss_to_lease_pct`, `concession_pct`, `bad_debt_pct`, `other_income`, `utility_reimbursement`, `parking_income`, `laundry_income`, `pet_income` |

**Implementation notes:** These feed the income calculators. Persisting them enables "save and recall" workflow for income analysis.

#### P1-5: Valuation Reconciliation

| Tool Name | Operation | Target Table | Key Parameters |
|-----------|-----------|-------------|----------------|
| `get_valuation_reconciliation` | SELECT | `tbl_valuation_reconciliation` | `project_id` |
| `update_valuation_reconciliation` | UPSERT | `tbl_valuation_reconciliation` | `project_id`, `income_approach_value`, `income_approach_weight`, `sales_comparison_value`, `sales_comparison_weight`, `cost_approach_value`, `cost_approach_weight`, `reconciled_value`, `narrative`, `effective_date` |

**Implementation notes:** Backend API already exists for reconciliation. Wire the existing Django endpoint to a Landscaper tool.

#### P1-6: Land Comparables

| Tool Name | Operation | Target Table | Key Parameters |
|-----------|-----------|-------------|----------------|
| `get_land_comparables` | SELECT | `tbl_land_comparables` | `project_id` |
| `create_land_comparable` | INSERT | `tbl_land_comparables` | `project_id`, `address`, `sale_date`, `sale_price`, `acreage`, `price_per_acre`, `zoning`, `highest_best_use`, `utilities`, `topography`, `proximity` |
| `update_land_comparable` | UPDATE | `tbl_land_comparables` | `comparable_id` + updatable fields |
| `delete_land_comparable` | DELETE | `tbl_land_comparables` | `comparable_id` |
| `get_land_comp_adjustments` | SELECT | `tbl_land_comp_adjustments` | `comparable_id` |
| `update_land_comp_adjustment` | UPSERT | `tbl_land_comp_adjustments` | `comparable_id`, `adjustment_type`, `adjustment_pct`, `adjustment_amount`, `notes` |

**Implementation notes:** Full CRUD needed. Land comps are a core deliverable for land dev appraisals. Consider batch import tool for multiple comps.

### For P2 Gaps

| Tool Name | Operation | Target Table | Priority |
|-----------|-----------|-------------|----------|
| `get_lease_assumptions` / `update_lease_assumptions` | R/UPSERT | `tbl_lease_assumptions` | P2-1 |
| `get_value_add_assumptions` / `update_value_add_assumptions` | R/UPSERT | `tbl_value_add_assumptions` | P2-2 |
| `get_unit_turns` / `create_unit_turn` | R/C | `tbl_multifamily_turn` | P2-3 |
| `get_cost_approach` / `update_cost_approach` | R/UPSERT | `tbl_cost_approach` | P2-4 |
| Expand `ALLOWED_UPDATES` for `tbl_project` | Config change | `tbl_project` | P2-5 |
| `get_lots` / `update_lot` / `create_lot` | Full CRUD | `tbl_lot`, `tbl_lot_type` | P2-6 |
| `get_sale_phases` / `update_sale_phase` | R/U | `tbl_sale_phases` | P2-7 |

### Quick Wins (config-only fixes, no new tools)

1. **Fix ALLOWED_UPDATES field names** — `parcel_type` → remove or map to correct column, `lot_count` → `total_lots`, `phase_number` → `phase_order`, `budget_amount` → remove
2. **Update tool_schemas.py header** — Change "169 tools" to "180 tools"
3. **Expand tbl_project ALLOWED_UPDATES** — Add `property_subtype`, `property_class`, `ownership_type`, `analysis_perspective`, `analysis_purpose`, `effective_date`, `asking_price`, `apn_primary` at minimum

---

## Appendix: Data Sources

- `tool_schemas.py` — 180 tool definitions (`LANDSCAPER_TOOLS` array)
- `tool_executor.py` — 130+ `@register_tool` handlers across 14,886 lines
- `ALLOWED_UPDATES` whitelist — lines 91-169 of tool_executor.py
- `VALID_UNIT_FIELDS` — lines 189-198 of tool_executor.py
- `OM_FIELD_MAPPING` — lines 323-508 of tool_executor.py
- PostgreSQL `information_schema.columns` — all table schemas verified against live DB
- Next.js API routes — `src/app/api/picklists/property-subtypes/route.ts`, `src/app/api/lookups/[type]/route.ts` (legacy, reference only)

# INDUSTRIAL UNDERWRITING: KITCHEN SINK FIELD REFERENCE

**Version:** 1.0  
**Date:** December 16, 2025  
**Purpose:** Complete field inventory for industrial income property analysis  
**Total Fields:** 195 (organized by the 5-basket framework)  
**Property Subtypes Covered:** Warehouse/Distribution, Manufacturing, Flex Space, Cold Storage, Self-Storage, Last-Mile Logistics

---

## INDUSTRIAL-SPECIFIC CONSIDERATIONS

Industrial properties differ from other commercial asset classes in several key ways:

1. **Building Configuration** — Clear height, column spacing, dock doors, truck courts are critical value drivers
2. **Tenant Profile** — Fewer tenants, longer leases, credit-focused underwriting
3. **Lease Structure** — Predominantly NNN with minimal landlord responsibilities
4. **Functional Obsolescence** — Building specs can become outdated (e-commerce requires 32'+ clear)
5. **Location Dynamics** — Proximity to highways, ports, rail, labor pools, last-mile delivery zones
6. **Power & Infrastructure** — Electrical capacity, fire suppression, floor load capacity matter

---

## FIELD NOTATION

Each field includes:
- **Field Name** — Database column / API key
- **Label** — UI display name
- **Type** — Data type (currency, percent, integer, date, text, boolean, json)
- **Required** — Whether Landscaper must populate for basic analysis
- **Default** — Smart default if not provided
- **Extractable** — Can AI extract from typical OM/appraisal?

---

## BASKET 1: THE DEAL (Acquisition & Physical)

**Purpose:** Property identification, building specifications, acquisition terms  
**Field Count:** 42 fields

### Property Identification (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 1 | `property_name` | Property Name | text | ✓ | — | ✓ High |
| 2 | `property_address` | Street Address | text | ✓ | — | ✓ High |
| 3 | `city` | City | text | ✓ | — | ✓ High |
| 4 | `state` | State | text | ✓ | — | ✓ High |
| 5 | `zip_code` | ZIP Code | text | ✓ | — | ✓ High |
| 6 | `county` | County | text | — | Lookup | ✓ Medium |
| 7 | `industrial_subtype` | Industrial Subtype | text | ✓ | — | ✓ High |
| 8 | `property_class` | Property Class | text | — | — | ✓ High |

### Site Characteristics (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 9 | `land_area_acres` | Land Area (Acres) | decimal | ✓ | — | ✓ High |
| 10 | `land_area_sf` | Land Area (SF) | integer | — | Calculated | ✓ High |
| 11 | `building_sf_gla` | Building SF (GLA) | integer | ✓ | — | ✓ High |
| 12 | `building_coverage_pct` | Building Coverage % | percent | — | Calculated | ✓ Medium |
| 13 | `excess_land_acres` | Excess Land (Acres) | decimal | — | — | ✓ Medium |
| 14 | `expansion_potential_sf` | Expansion Potential (SF) | integer | — | — | ✓ Medium |
| 15 | `zoning` | Zoning | text | — | — | ✓ High |
| 16 | `year_built` | Year Built | integer | — | — | ✓ High |
| 17 | `year_renovated` | Year Renovated | integer | — | — | ✓ Medium |
| 18 | `building_count` | Number of Buildings | integer | — | 1 | ✓ High |

### Building Specifications - Critical Industrial Metrics (14 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 19 | `clear_height_ft` | Clear Height (ft) | integer | ✓ | — | ✓ High |
| 20 | `clear_height_min_ft` | Min Clear Height (ft) | integer | — | — | ✓ Medium |
| 21 | `clear_height_max_ft` | Max Clear Height (ft) | integer | — | — | ✓ Medium |
| 22 | `column_spacing_ft` | Column Spacing (ft) | text | — | — | ✓ Medium |
| 23 | `dock_doors_count` | Dock-High Doors | integer | ✓ | — | ✓ High |
| 24 | `drive_in_doors_count` | Drive-In/Grade Doors | integer | — | — | ✓ High |
| 25 | `dock_ratio` | Dock Ratio (doors/SF) | text | — | Calculated | — |
| 26 | `truck_court_depth_ft` | Truck Court Depth (ft) | integer | — | — | ✓ Medium |
| 27 | `trailer_parking_spaces` | Trailer Parking Spaces | integer | — | — | ✓ Medium |
| 28 | `auto_parking_spaces` | Auto Parking Spaces | integer | — | — | ✓ Medium |
| 29 | `parking_ratio` | Parking Ratio (spaces/1,000 SF) | decimal | — | Calculated | ✓ Medium |
| 30 | `floor_load_capacity_psf` | Floor Load (PSF) | integer | — | — | ✓ Low |
| 31 | `rail_served` | Rail Served? | boolean | — | false | ✓ High |
| 32 | `rail_door_count` | Rail Doors | integer | — | — | ✓ Medium |

### Building Systems (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 33 | `electrical_amps` | Electrical Service (Amps) | integer | — | — | ✓ Medium |
| 34 | `electrical_volts` | Voltage | text | — | — | ✓ Low |
| 35 | `sprinkler_type` | Sprinkler System | text | — | ESFR | ✓ Medium |
| 36 | `hvac_warehouse` | Warehouse HVAC? | boolean | — | false | ✓ Medium |
| 37 | `hvac_office` | Office HVAC? | boolean | — | true | ✓ Medium |

### Acquisition Terms (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 38 | `purchase_price` | Purchase Price | currency | ✓ | — | ✓ High |
| 39 | `acquisition_date` | Acquisition Date | date | ✓ | Today + 60 | ✓ Medium |
| 40 | `price_per_sf` | Price/SF | currency | — | Calculated | ✓ High |
| 41 | `going_in_cap_rate` | Going-In Cap Rate | percent | — | Calculated | ✓ High |
| 42 | `going_in_noi` | Going-In NOI | currency | — | — | ✓ High |

---

## BASKET 2: THE CASH IN (Revenue)

**Purpose:** Rent roll, lease terms, tenant profile, other income  
**Field Count:** 55 fields

### Tenant Summary (Property-Level) (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 43 | `tenant_count` | Number of Tenants | integer | ✓ | — | ✓ High |
| 44 | `occupied_sf` | Occupied SF | integer | ✓ | — | ✓ High |
| 45 | `occupancy_pct` | Occupancy % | percent | ✓ | — | ✓ High |
| 46 | `vacant_sf` | Vacant SF | integer | — | Calculated | ✓ High |
| 47 | `walt_years` | WALT (years) | decimal | — | — | ✓ High |
| 48 | `wale_years` | WALE (years) | decimal | — | — | ✓ Medium |
| 49 | `credit_tenant_pct` | Investment Grade Tenant % | percent | — | — | ✓ Medium |
| 50 | `single_tenant` | Single Tenant? | boolean | — | — | ✓ High |
| 51 | `largest_tenant_pct` | Largest Tenant % of GLA | percent | — | — | ✓ Medium |
| 52 | `lease_expiration_schedule` | Lease Expirations (JSON) | json | — | — | ✓ High |

### Rent Roll - Per Tenant Fields (18 fields per tenant)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 53 | `tenant_name` | Tenant Name | text | ✓ | — | ✓ High |
| 54 | `tenant_industry` | Tenant Industry | text | — | — | ✓ Medium |
| 55 | `tenant_sf` | Tenant SF | integer | ✓ | — | ✓ High |
| 56 | `warehouse_sf` | Warehouse SF | integer | — | — | ✓ Medium |
| 57 | `office_sf` | Office SF | integer | — | — | ✓ Medium |
| 58 | `office_pct` | Office % | percent | — | Calculated | ✓ Medium |
| 59 | `lease_start_date` | Lease Start | date | ✓ | — | ✓ High |
| 60 | `lease_end_date` | Lease Expiration | date | ✓ | — | ✓ High |
| 61 | `lease_term_months` | Lease Term (months) | integer | — | Calculated | ✓ Medium |
| 62 | `remaining_term_months` | Remaining Term (months) | integer | — | Calculated | ✓ Medium |
| 63 | `base_rent_psf` | Base Rent/SF | currency | ✓ | — | ✓ High |
| 64 | `base_rent_annual` | Base Rent (Annual) | currency | — | Calculated | ✓ High |
| 65 | `lease_type` | Lease Type | text | ✓ | NNN | ✓ High |
| 66 | `credit_rating` | Credit Rating | text | — | — | ✓ Medium |
| 67 | `is_investment_grade` | Investment Grade? | boolean | — | — | ✓ Medium |
| 68 | `parent_guarantor` | Parent Guarantor | text | — | — | ✓ Low |
| 69 | `sublease` | Sublease? | boolean | — | false | ✓ Medium |
| 70 | `early_termination_right` | Early Termination? | boolean | — | — | ✓ Low |

### Rent Escalations (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 71 | `escalation_type` | Escalation Type | text | — | Fixed | ✓ High |
| 72 | `escalation_pct` | Annual Escalation % | percent | — | 3.0% | ✓ High |
| 73 | `escalation_amount` | Annual Escalation $ | currency | — | — | ✓ High |
| 74 | `escalation_frequency` | Escalation Frequency | text | — | Annual | ✓ Medium |
| 75 | `next_escalation_date` | Next Escalation Date | date | — | — | ✓ Low |
| 76 | `cpi_floor` | CPI Floor | percent | — | — | ✓ Low |
| 77 | `cpi_ceiling` | CPI Ceiling | percent | — | — | ✓ Low |
| 78 | `step_rent_schedule` | Step Rent Schedule (JSON) | json | — | — | ✓ Medium |

### Renewal Options (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 79 | `renewal_option_count` | Number of Options | integer | — | — | ✓ High |
| 80 | `renewal_term_years` | Option Term (years) | integer | — | 5 | ✓ High |
| 81 | `renewal_rent_type` | Renewal Rent Basis | text | — | Fair Market | ✓ Medium |
| 82 | `renewal_rent_floor_psf` | Renewal Floor/SF | currency | — | — | ✓ Low |
| 83 | `renewal_notice_days` | Notice Period (days) | integer | — | 180 | ✓ Low |
| 84 | `renewal_probability_pct` | Renewal Probability | percent | — | 70% | ✗ Low |

### Rent Roll Aggregates (7 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 85 | `gross_potential_rent` | Gross Potential Rent | currency | — | Calculated | ✓ High |
| 86 | `scheduled_base_rent` | Scheduled Base Rent | currency | ✓ | — | ✓ High |
| 87 | `avg_base_rent_psf` | Avg Base Rent/SF | currency | — | Calculated | ✓ High |
| 88 | `market_rent_psf` | Market Rent/SF | currency | — | — | ✓ Medium |
| 89 | `loss_to_lease_pct` | Loss to Lease % | percent | — | Calculated | ✓ Medium |
| 90 | `mark_to_market_pct` | Mark-to-Market % | percent | — | Calculated | — |
| 91 | `rent_growth_assumption` | Rent Growth Assumption | percent | — | 3.0% | ✗ Low |

### Vacancy & Credit Loss (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 92 | `physical_vacancy_pct` | Physical Vacancy | percent | ✓ | — | ✓ High |
| 93 | `downtime_months` | Downtime Between Leases | integer | — | 6 | ✗ Low |
| 94 | `general_vacancy_pct` | General Vacancy Allowance | percent | — | 5.0% | ✗ Low |
| 95 | `credit_loss_pct` | Credit Loss | percent | — | 0.5% | ✓ Low |
| 96 | `free_rent_months` | Free Rent (new leases) | integer | — | 3 | ✗ Low |
| 97 | `absorption_months` | Absorption Period | integer | — | 9 | ✗ Low |

---

## BASKET 3: THE CASH OUT (Operating Expenses & CapEx)

**Purpose:** Property operations, expense recovery, capital reserves  
**Field Count:** 48 fields

### Fixed Expenses (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 98 | `real_estate_taxes` | Real Estate Taxes | currency | ✓ | — | ✓ High |
| 99 | `tax_rate_pct` | Tax Rate % | percent | — | — | ✓ Medium |
| 100 | `assessed_value` | Assessed Value | currency | — | — | ✓ Medium |
| 101 | `tax_reassessment_year` | Reassessment Year | integer | — | Acq year + 1 | ✗ Low |
| 102 | `property_insurance` | Property Insurance | currency | ✓ | — | ✓ High |
| 103 | `insurance_psf` | Insurance/SF | currency | — | Calculated | ✓ Medium |
| 104 | `flood_insurance` | Flood Insurance | currency | — | — | ✓ Medium |
| 105 | `umbrella_insurance` | Umbrella/Liability | currency | — | — | ✓ Low |

### CAM / Common Area Expenses (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 106 | `cam_total` | Total CAM | currency | ✓ | — | ✓ High |
| 107 | `cam_psf` | CAM/SF | currency | — | Calculated | ✓ High |
| 108 | `landscaping` | Landscaping | currency | — | — | ✓ Medium |
| 109 | `parking_lot_maintenance` | Parking Lot Maintenance | currency | — | — | ✓ Medium |
| 110 | `exterior_lighting` | Exterior Lighting | currency | — | — | ✓ Low |
| 111 | `security` | Security | currency | — | — | ✓ Medium |
| 112 | `repairs_maintenance` | Repairs & Maintenance | currency | — | — | ✓ High |
| 113 | `common_utilities` | Common Area Utilities | currency | — | — | ✓ Medium |
| 114 | `trash_removal` | Trash/Waste Removal | currency | — | — | ✓ Medium |
| 115 | `cam_admin_fee_pct` | CAM Admin Fee % | percent | — | 15% | ✓ Medium |

### Management & Administration (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 116 | `management_fee_pct` | Management Fee % | percent | ✓ | 3.0% | ✓ High |
| 117 | `management_fee` | Management Fee $ | currency | — | Calculated | ✓ High |
| 118 | `administrative` | Administrative/G&A | currency | — | — | ✓ Medium |
| 119 | `professional_fees` | Professional Fees | currency | — | — | ✓ Low |
| 120 | `marketing` | Marketing/Leasing | currency | — | — | ✓ Low |
| 121 | `bad_debt` | Bad Debt | currency | — | — | ✓ Low |

### Expense Recovery Structure (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 122 | `recovery_method` | Default Recovery Method | text | ✓ | NNN | ✓ High |
| 123 | `cam_recovery_pct` | CAM Recovery % | percent | — | 100% | ✓ Medium |
| 124 | `tax_recovery_pct` | Tax Recovery % | percent | — | 100% | ✓ Medium |
| 125 | `insurance_recovery_pct` | Insurance Recovery % | percent | — | 100% | ✓ Medium |
| 126 | `total_recoveries` | Total Expense Recoveries | currency | — | Calculated | ✓ High |
| 127 | `recovery_income_psf` | Recovery Income/SF | currency | — | Calculated | ✓ Medium |
| 128 | `gross_up_vacancy_pct` | Gross-Up % | percent | — | 95% | ✗ Low |
| 129 | `base_year` | Base Year | integer | — | — | ✓ Medium |
| 130 | `expense_stop_psf` | Expense Stop/SF | currency | — | — | ✓ Medium |
| 131 | `mgmt_fee_recoverable` | Mgmt Fee Recoverable? | boolean | — | false | ✓ Low |

### Operating Expense Totals (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 132 | `total_operating_expenses` | Total OpEx (Gross) | currency | — | Calculated | ✓ High |
| 133 | `opex_psf` | OpEx/SF | currency | — | Calculated | ✓ High |
| 134 | `net_operating_expenses` | Net OpEx (After Recovery) | currency | — | Calculated | — |
| 135 | `expense_ratio` | Expense Ratio | percent | — | Calculated | ✓ Medium |
| 136 | `opex_growth_rate` | OpEx Growth Rate | percent | — | 3.0% | ✗ Low |
| 137 | `controllable_expenses` | Controllable Expenses | currency | — | Calculated | ✗ Low |

### Capital Expenditures (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 138 | `capex_reserve_psf` | CapEx Reserve/SF | currency | ✓ | $0.15/SF | ✓ Medium |
| 139 | `capex_reserve_annual` | CapEx Reserve Annual | currency | — | Calculated | ✓ Medium |
| 140 | `immediate_repairs` | Immediate Repairs (Y1) | currency | — | — | ✓ Medium |
| 141 | `roof_reserve` | Roof Reserve | currency | — | — | ✗ Low |
| 142 | `hvac_reserve` | HVAC Reserve | currency | — | — | ✗ Low |
| 143 | `parking_lot_reserve` | Parking/Paving Reserve | currency | — | — | ✗ Low |
| 144 | `dock_door_reserve` | Dock Equipment Reserve | currency | — | — | ✗ Low |
| 145 | `ti_reserve_psf` | TI Reserve/SF | currency | — | — | ✗ Low |

---

## BASKET 4: THE FINANCING (Debt Structure)

**Purpose:** Loan terms, rates, covenants  
**Field Count:** 25 fields

### Primary Loan Terms (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 146 | `loan_amount` | Loan Amount | currency | ✓ | LTV × Price | ✓ Medium |
| 147 | `ltv_pct` | Loan-to-Value | percent | ✓ | 65% | ✓ Medium |
| 148 | `interest_rate` | Interest Rate | percent | ✓ | Market | ✓ Medium |
| 149 | `rate_type` | Rate Type | text | — | Fixed | ✓ Medium |
| 150 | `amortization_years` | Amortization | integer | ✓ | 25 | ✓ Medium |
| 151 | `loan_term_years` | Loan Term | integer | ✓ | 10 | ✓ Medium |
| 152 | `interest_only_years` | I/O Period | integer | — | 0 | ✓ Medium |
| 153 | `dscr_minimum` | Minimum DSCR | decimal | — | 1.25x | ✓ Low |
| 154 | `debt_yield_min` | Minimum Debt Yield | percent | — | 9% | ✗ Low |
| 155 | `lender_name` | Lender | text | — | — | ✓ Medium |

### Loan Costs (7 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 156 | `origination_fee_pct` | Origination Fee % | percent | — | 1.0% | ✓ Low |
| 157 | `origination_fee` | Origination Fee $ | currency | — | Calculated | ✓ Low |
| 158 | `lender_legal` | Lender Legal | currency | — | $15,000 | ✗ Low |
| 159 | `appraisal_cost` | Appraisal | currency | — | $6,000 | ✗ Low |
| 160 | `environmental_cost` | Environmental | currency | — | $4,000 | ✗ Low |
| 161 | `pca_cost` | PCA Report | currency | — | $5,000 | ✗ Low |
| 162 | `total_loan_costs` | Total Loan Costs | currency | — | Calculated | ✗ Low |

### Reserves & Prepayment (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 163 | `tax_escrow_months` | Tax Escrow (months) | integer | — | 6 | ✗ Low |
| 164 | `insurance_escrow_months` | Insurance Escrow (months) | integer | — | 3 | ✗ Low |
| 165 | `replacement_reserve` | Replacement Reserve | currency | — | — | ✗ Low |
| 166 | `ti_lc_reserve` | TI/LC Reserve | currency | — | — | ✗ Low |
| 167 | `prepayment_type` | Prepayment Penalty Type | text | — | Yield Maint | ✗ Low |
| 168 | `prepayment_lockout` | Lockout Period | integer | — | 2 years | ✗ Low |
| 169 | `extension_options` | Extension Options | integer | — | 0 | ✗ Low |
| 170 | `extension_fee_bps` | Extension Fee (bps) | integer | — | 25 | ✗ Low |

---

## BASKET 5: THE SPLIT (Equity Waterfall)

**Purpose:** Capital structure, promote tiers, distributions  
**Field Count:** 15 fields

### Equity Structure (7 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 171 | `total_equity` | Total Equity Required | currency | — | Calculated | ✗ Low |
| 172 | `lp_equity_pct` | LP Equity % | percent | ✓ | 90% | ✗ Low |
| 173 | `gp_equity_pct` | GP Equity % | percent | ✓ | 10% | ✗ Low |
| 174 | `gp_coinvest_amount` | GP Co-Invest $ | currency | — | Calculated | ✗ Low |
| 175 | `preferred_return_pct` | Preferred Return | percent | ✓ | 8.0% | ✗ Low |
| 176 | `pref_compounding` | Pref Compounding | text | — | Simple | ✗ Low |
| 177 | `distribution_frequency` | Distribution Frequency | text | — | Quarterly | ✗ Low |

### Waterfall Tiers (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 178 | `tier_1_hurdle` | Tier 1 Hurdle (Pref) | percent | — | 8.0% | ✗ Low |
| 179 | `tier_1_lp_split` | Tier 1 LP Split | percent | — | 100% | ✗ Low |
| 180 | `tier_2_hurdle` | Tier 2 Hurdle (IRR) | percent | — | 12% | ✗ Low |
| 181 | `tier_2_lp_split` | Tier 2 LP Split | percent | — | 80% | ✗ Low |
| 182 | `tier_3_lp_split` | Tier 3 LP Split | percent | — | 70% | ✗ Low |
| 183 | `acquisition_fee_pct` | Acquisition Fee | percent | — | 1.0% | ✗ Low |

---

## DISPOSITION (Exit Assumptions)

**Purpose:** Sale assumptions for hold period end  
**Field Count:** 10 fields

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 184 | `hold_period_years` | Hold Period | decimal | ✓ | 7 | ✗ Low |
| 185 | `exit_cap_rate` | Exit Cap Rate | percent | ✓ | Going-in + 25bps | ✗ Low |
| 186 | `terminal_noi` | Terminal NOI | currency | — | Calculated | — |
| 187 | `gross_sale_price` | Gross Sale Price | currency | — | Calculated | — |
| 188 | `disposition_costs_pct` | Disposition Costs % | percent | — | 2.0% | ✗ Low |
| 189 | `broker_commission_pct` | Broker Commission | percent | — | 1.5% | ✗ Low |
| 190 | `transfer_tax` | Transfer Tax | currency | — | — | ✗ Low |
| 191 | `net_sale_proceeds` | Net Sale Proceeds | currency | — | Calculated | — |
| 192 | `loan_payoff` | Loan Payoff | currency | — | Calculated | — |
| 193 | `equity_proceeds` | Equity Proceeds | currency | — | Calculated | — |

---

## CALCULATED OUTPUTS (Return Metrics)

| # | Field | Label | Type | Notes |
|---|-------|-------|------|-------|
| 194 | `noi_year_1` | Year 1 NOI | currency | EGI - OpEx + Recoveries |
| 195 | `noi_stabilized` | Stabilized NOI | currency | At stabilization |
| — | `cash_on_cash_year_1` | Y1 Cash-on-Cash | percent | CF / Equity |
| — | `dscr_year_1` | Year 1 DSCR | decimal | NOI / Debt Service |
| — | `levered_irr` | Levered IRR | percent | Project IRR |
| — | `unlevered_irr` | Unlevered IRR | percent | Property IRR |
| — | `equity_multiple` | Equity Multiple | decimal | Distributions / Equity |

---

## INDUSTRIAL SUBTYPE SPECIFICATIONS

### Building Spec Benchmarks by Subtype

| Subtype | Typical Clear Height | Dock Ratio | Office % | Truck Court |
|---------|---------------------|------------|----------|-------------|
| **Warehouse/Distribution** | 28-40' | 1:5,000 SF | 5-10% | 120-135' |
| **Bulk Distribution** | 32-40' | 1:10,000 SF | 3-5% | 130-185' |
| **Last-Mile/Delivery** | 24-32' | 1:2,500 SF | 5-10% | 60-100' |
| **Manufacturing** | 20-28' | 1:7,500 SF | 10-20% | 100-120' |
| **Flex/R&D** | 16-24' | 1:5,000 SF | 30-50% | 60-80' |
| **Cold Storage** | 32-45' | 1:7,500 SF | 5% | 120-150' |
| **Self-Storage** | 10-12' | N/A | 5% | N/A |

### Clear Height Evolution (Modern vs. Obsolete)

| Era | Typical Clear | Modern Status |
|-----|---------------|---------------|
| Pre-1990 | 18-22' | Functionally obsolete for distribution |
| 1990-2005 | 24-28' | Adequate for light distribution |
| 2005-2015 | 28-32' | Standard distribution |
| 2015-Present | 32-40' | Modern bulk distribution |
| E-commerce Optimized | 36-40'+ | Premium last-mile/fulfillment |

---

## LEASE TYPE DEFINITIONS (INDUSTRIAL)

| Lease Type | Tenant Pays | Landlord Pays | Common For |
|------------|-------------|---------------|------------|
| **Absolute NNN** | Everything including structure | Nothing | Single-tenant sale-leaseback |
| **Triple Net (NNN)** | Taxes + Insurance + CAM | Structure/roof | Standard industrial |
| **Modified Gross** | Some operating expenses | Some expenses | Flex/R&D |
| **Industrial Gross** | Base rent only | All operating | Older multi-tenant |

---

## SUMMARY BY EXTRACTION CONFIDENCE

| Confidence | Field Count | Example Fields |
|------------|-------------|----------------|
| **High** (✓ in most OMs) | 50 | GLA, clear height, dock doors, rent roll, taxes |
| **Medium** (often available) | 70 | Column spacing, truck court, lease details, CAM |
| **Low** (rarely in documents) | 75 | Waterfall, growth rates, renewal probability, reserves |

---

## FIELD REQUIREMENTS BY ANALYSIS TIER

### Minimum Viable Analysis (MVP - 20 fields)

1. `building_sf_gla`
2. `purchase_price`
3. `clear_height_ft`
4. `dock_doors_count`
5. `occupancy_pct`
6. `scheduled_base_rent` OR `avg_base_rent_psf`
7. `lease_type`
8. `walt_years`
9. `real_estate_taxes`
10. `property_insurance`
11. `cam_total`
12. `management_fee_pct`
13. `total_recoveries`
14. `loan_amount` OR `ltv_pct`
15. `interest_rate`
16. `amortization_years`
17. `hold_period_years`
18. `exit_cap_rate`
19. `capex_reserve_psf`
20. `preferred_return_pct`

### Standard Analysis (75 fields)

Adds: Full rent roll, building specifications, expense breakdown, recovery structure, TI/LC reserves

### Full Kitchen Sink (195 fields)

Complete institutional-grade analysis with detailed building systems, expansion potential, full waterfall, sensitivity inputs

---

## INDUSTRIAL VALUATION CONSIDERATIONS

### Key Value Drivers (Ranked)

1. **Clear Height** — Single most important spec for modern distribution
2. **Location/Access** — Highway proximity, port access, labor availability
3. **Dock Configuration** — Door count, truck court depth, cross-dock capability
4. **Tenant Credit** — Investment-grade tenants command premium pricing
5. **WALT** — Longer weighted average lease term reduces risk
6. **Functional Flexibility** — Column spacing, floor loads, power capacity

### Functional Obsolescence Flags

- Clear height < 24' (limits tenant pool significantly)
- Insufficient truck court depth (< 100')
- Poor dock configuration (side-loading only)
- Inadequate electrical service
- No fire sprinklers or obsolete system
- Single-loaded (rear dock only)

---

**End of Field Reference**
**QJ07**

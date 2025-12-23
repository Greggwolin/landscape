# MULTIFAMILY UNDERWRITING: KITCHEN SINK FIELD REFERENCE

**Version:** 1.0  
**Date:** December 16, 2025  
**Purpose:** Complete field inventory for multifamily income property analysis  
**Total Fields:** 183 (organized by the 5-basket framework)

---

## FIELD NOTATION

Each field includes:
- **Field Name** — Database column / API key
- **Label** — UI display name
- **Type** — Data type (currency, percent, integer, date, text, boolean)
- **Required** — Whether Landscaper must populate for basic analysis
- **Default** — Smart default if not provided
- **Extractable** — Can AI extract from typical OM/appraisal?

---

## BASKET 1: THE DEAL (Acquisition & Disposition)

**Purpose:** What you're buying, when you're selling, transaction costs  
**Field Count:** 24 fields

### Property Identification (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 1 | `property_name` | Property Name | text | ✓ | — | ✓ High |
| 2 | `property_address` | Street Address | text | ✓ | — | ✓ High |
| 3 | `city` | City | text | ✓ | — | ✓ High |
| 4 | `state` | State | text | ✓ | — | ✓ High |
| 5 | `zip_code` | ZIP Code | text | ✓ | — | ✓ High |
| 6 | `county` | County | text | — | Lookup | ✓ Medium |

### Physical Characteristics (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 7 | `unit_count` | Total Units | integer | ✓ | — | ✓ High |
| 8 | `rentable_sf` | Rentable SF | integer | ✓ | Calc from units | ✓ High |
| 9 | `year_built` | Year Built | integer | — | — | ✓ High |
| 10 | `year_renovated` | Year Renovated | integer | — | — | ✓ Medium |
| 11 | `lot_size_acres` | Lot Size (Acres) | decimal | — | — | ✓ Medium |
| 12 | `building_count` | Number of Buildings | integer | — | 1 | ✓ Medium |
| 13 | `stories` | Stories | integer | — | — | ✓ Medium |
| 14 | `parking_spaces` | Parking Spaces | integer | — | units × 1.5 | ✓ Medium |

### Acquisition Terms (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 15 | `purchase_price` | Purchase Price | currency | ✓ | — | ✓ High |
| 16 | `acquisition_date` | Acquisition Date | date | ✓ | Today + 60 | ✓ Medium |
| 17 | `price_per_unit` | Price per Unit | currency | — | Calculated | ✓ Medium |
| 18 | `price_per_sf` | Price per SF | currency | — | Calculated | ✓ Medium |
| 19 | `going_in_cap_rate` | Going-In Cap Rate | percent | — | Calculated | ✓ Medium |

### Acquisition Costs (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 20 | `closing_costs_pct` | Closing Costs % | percent | — | 1.50% | ✗ Low |
| 21 | `due_diligence_costs` | Due Diligence Costs | currency | — | $25,000 | ✗ Low |
| 22 | `legal_fees` | Legal Fees | currency | — | $35,000 | ✗ Low |
| 23 | `title_insurance` | Title Insurance | currency | — | 0.25% of price | ✗ Low |
| 24 | `earnest_money` | Earnest Money | currency | — | 2% of price | ✗ Low |

---

## BASKET 2: THE CASH IN (Revenue)

**Purpose:** All income sources  
**Field Count:** 62 fields

### Unit Mix Summary (8 fields per unit type, typically 4-6 types = 32-48 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 25 | `unit_type_name` | Unit Type | text | ✓ | — | ✓ High |
| 26 | `unit_type_count` | Unit Count | integer | ✓ | — | ✓ High |
| 27 | `unit_type_sf` | Avg SF | integer | ✓ | — | ✓ High |
| 28 | `bedrooms` | Bedrooms | integer | ✓ | — | ✓ High |
| 29 | `bathrooms` | Bathrooms | decimal | — | — | ✓ High |
| 30 | `current_rent` | Current Rent | currency | ✓ | — | ✓ High |
| 31 | `market_rent` | Market Rent | currency | ✓ | — | ✓ High |
| 32 | `rent_per_sf` | Rent/SF | currency | — | Calculated | ✓ Medium |

### Rent Roll Aggregates (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 33 | `gross_potential_rent` | Gross Potential Rent | currency | — | Calculated | ✓ High |
| 34 | `in_place_rent_annual` | In-Place Rent (Annual) | currency | ✓ | — | ✓ High |
| 35 | `market_rent_annual` | Market Rent (Annual) | currency | — | — | ✓ Medium |
| 36 | `loss_to_lease_pct` | Loss to Lease % | percent | — | Calculated | ✓ Medium |
| 37 | `loss_to_lease_amount` | Loss to Lease $ | currency | — | Calculated | ✓ Medium |
| 38 | `avg_rent_per_unit` | Avg Rent/Unit | currency | — | Calculated | ✓ Medium |
| 39 | `avg_rent_per_sf` | Avg Rent/SF | currency | — | Calculated | ✓ Medium |
| 40 | `avg_unit_sf` | Avg Unit SF | integer | — | Calculated | ✓ Medium |
| 41 | `weighted_avg_lease_term` | WALT (months) | decimal | — | — | ✓ Low |
| 42 | `lease_expiration_schedule` | Lease Expirations (JSON) | json | — | — | ✓ Medium |

### Vacancy & Credit Loss (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 43 | `physical_vacancy_pct` | Physical Vacancy | percent | ✓ | 5.0% | ✓ High |
| 44 | `economic_vacancy_pct` | Economic Vacancy | percent | — | 2.0% | ✓ Medium |
| 45 | `total_vacancy_pct` | Total Vacancy | percent | — | Calculated | ✓ Medium |
| 46 | `concessions_pct` | Concessions | percent | — | 1.0% | ✓ Medium |
| 47 | `bad_debt_pct` | Bad Debt/Credit Loss | percent | — | 1.0% | ✓ Low |
| 48 | `model_unit_count` | Model Units | integer | — | 0 | ✗ Low |

### Other Income (12 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 49 | `other_income_total` | Total Other Income | currency | — | Calculated | ✓ High |
| 50 | `parking_income` | Parking Income | currency | — | $50/space/mo | ✓ Medium |
| 51 | `laundry_income` | Laundry/Vending | currency | — | $15/unit/mo | ✓ Medium |
| 52 | `pet_income` | Pet Fees/Rent | currency | — | — | ✓ Medium |
| 53 | `storage_income` | Storage Income | currency | — | — | ✓ Medium |
| 54 | `utility_reimbursement` | Utility Reimbursements | currency | — | — | ✓ Medium |
| 55 | `late_fees` | Late Fees | currency | — | — | ✓ Low |
| 56 | `application_fees` | Application Fees | currency | — | — | ✓ Low |
| 57 | `cable_telecom` | Cable/Telecom | currency | — | — | ✓ Low |
| 58 | `commercial_income` | Commercial/Retail Income | currency | — | — | ✓ Medium |
| 59 | `amenity_fees` | Amenity Fees | currency | — | — | ✓ Low |
| 60 | `misc_income` | Miscellaneous Income | currency | — | — | ✓ Low |

### Rent Growth Assumptions (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 61 | `rent_growth_year_1` | Rent Growth Year 1 | percent | — | 3.0% | ✗ Low |
| 62 | `rent_growth_year_2` | Rent Growth Year 2 | percent | — | 3.0% | ✗ Low |
| 63 | `rent_growth_year_3` | Rent Growth Year 3 | percent | — | 3.0% | ✗ Low |
| 64 | `rent_growth_stabilized` | Stabilized Rent Growth | percent | ✓ | 2.5% | ✗ Low |
| 65 | `other_income_growth` | Other Income Growth | percent | — | 2.0% | ✗ Low |
| 66 | `mark_to_market_year` | Mark-to-Market Year | integer | — | 1 | ✗ Low |

---

## BASKET 3: THE CASH OUT (Operating Expenses & CapEx)

**Purpose:** Property operations and capital expenditures  
**Field Count:** 52 fields

### Fixed Expenses (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 67 | `real_estate_taxes` | Real Estate Taxes | currency | ✓ | — | ✓ High |
| 68 | `tax_rate_pct` | Tax Rate % | percent | — | — | ✓ Medium |
| 69 | `assessed_value` | Assessed Value | currency | — | — | ✓ Medium |
| 70 | `tax_reassessment_year` | Reassessment Year | integer | — | Acq year + 1 | ✗ Low |
| 71 | `property_insurance` | Property Insurance | currency | ✓ | — | ✓ High |
| 72 | `insurance_per_unit` | Insurance/Unit | currency | — | Calculated | ✓ Medium |
| 73 | `flood_insurance` | Flood Insurance | currency | — | — | ✓ Medium |
| 74 | `earthquake_insurance` | Earthquake Insurance | currency | — | — | ✓ Low |

### Utilities (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 75 | `utilities_total` | Total Utilities | currency | ✓ | — | ✓ High |
| 76 | `water_sewer` | Water/Sewer | currency | — | — | ✓ High |
| 77 | `trash_removal` | Trash Removal | currency | — | — | ✓ High |
| 78 | `electricity` | Electricity | currency | — | — | ✓ High |
| 79 | `gas` | Gas | currency | — | — | ✓ High |
| 80 | `common_area_electric` | Common Area Electric | currency | — | — | ✓ Medium |
| 81 | `utility_billing_rubs` | RUBS Recovery | currency | — | — | ✓ Low |
| 82 | `utility_recovery_pct` | Utility Recovery % | percent | — | 0% | ✗ Low |

### Repairs & Maintenance (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 83 | `repairs_maintenance` | Repairs & Maintenance | currency | ✓ | — | ✓ High |
| 84 | `rm_per_unit` | R&M per Unit | currency | — | $1,200/unit | ✓ Medium |
| 85 | `unit_turnover_cost` | Unit Turnover Cost | currency | — | $1,500/turn | ✓ Low |
| 86 | `turnover_rate_pct` | Annual Turnover Rate | percent | — | 40% | ✓ Low |
| 87 | `contract_services` | Contract Services | currency | — | — | ✓ Medium |
| 88 | `elevator_maintenance` | Elevator Maintenance | currency | — | — | ✓ Medium |

### Grounds & Exterior (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 89 | `landscaping` | Landscaping | currency | — | — | ✓ High |
| 90 | `pest_control` | Pest Control | currency | — | — | ✓ High |
| 91 | `pool_spa` | Pool/Spa Service | currency | — | — | ✓ Medium |
| 92 | `snow_removal` | Snow Removal | currency | — | — | ✓ Low |
| 93 | `security` | Security Services | currency | — | — | ✓ Medium |
| 94 | `parking_lot_maintenance` | Parking Lot Maint | currency | — | — | ✓ Low |

### Management & Admin (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 95 | `management_fee_pct` | Management Fee % | percent | ✓ | 3.0% | ✓ High |
| 96 | `management_fee` | Management Fee $ | currency | — | Calculated | ✓ High |
| 97 | `onsite_payroll` | On-Site Payroll | currency | — | — | ✓ High |
| 98 | `offsite_payroll` | Off-Site Payroll | currency | — | — | ✓ Medium |
| 99 | `payroll_taxes_benefits` | Payroll Taxes/Benefits | currency | — | 25% of payroll | ✗ Low |
| 100 | `administrative` | Administrative/G&A | currency | — | — | ✓ Medium |
| 101 | `professional_fees` | Professional Fees | currency | — | — | ✓ Low |
| 102 | `marketing_advertising` | Marketing/Advertising | currency | — | — | ✓ High |

### Operating Expense Totals (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 103 | `total_operating_expenses` | Total OpEx | currency | — | Calculated | ✓ High |
| 104 | `opex_per_unit` | OpEx per Unit | currency | — | Calculated | ✓ High |
| 105 | `opex_per_sf` | OpEx per SF | currency | — | Calculated | ✓ Medium |
| 106 | `expense_ratio` | Expense Ratio (% EGI) | percent | — | Calculated | ✓ Medium |
| 107 | `opex_growth_rate` | OpEx Growth Rate | percent | — | 3.0% | ✗ Low |
| 108 | `controllable_expenses` | Controllable Expenses | currency | — | Calculated | ✗ Low |

### Capital Expenditures (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 109 | `capex_reserve_per_unit` | CapEx Reserve/Unit | currency | ✓ | $300/unit | ✓ Medium |
| 110 | `capex_reserve_annual` | CapEx Reserve Annual | currency | — | Calculated | ✓ Medium |
| 111 | `immediate_repairs` | Immediate Repairs (Y1) | currency | — | — | ✓ Medium |
| 112 | `roof_reserve` | Roof Reserve | currency | — | — | ✗ Low |
| 113 | `hvac_reserve` | HVAC Reserve | currency | — | — | ✗ Low |
| 114 | `appliance_reserve` | Appliance Reserve | currency | — | — | ✗ Low |
| 115 | `flooring_reserve` | Flooring Reserve | currency | — | — | ✗ Low |
| 116 | `exterior_reserve` | Exterior/Paint Reserve | currency | — | — | ✗ Low |
| 117 | `parking_reserve` | Parking Lot Reserve | currency | — | — | ✗ Low |
| 118 | `unit_renovation_budget` | Unit Renovation Budget | currency | — | — | ✓ Medium |

---

## BASKET 4: THE FINANCING (Debt Structure)

**Purpose:** Loan terms, rates, covenants  
**Field Count:** 28 fields

### Primary Loan Terms (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 119 | `loan_amount` | Loan Amount | currency | ✓ | LTV × Price | ✓ Medium |
| 120 | `ltv_pct` | Loan-to-Value | percent | ✓ | 65% | ✓ Medium |
| 121 | `interest_rate` | Interest Rate | percent | ✓ | Market | ✓ Medium |
| 122 | `rate_type` | Rate Type | text | — | Fixed | ✓ Medium |
| 123 | `amortization_years` | Amortization | integer | ✓ | 30 | ✓ Medium |
| 124 | `loan_term_years` | Loan Term | integer | ✓ | 10 | ✓ Medium |
| 125 | `interest_only_years` | I/O Period | integer | — | 0 | ✓ Medium |
| 126 | `dscr_minimum` | Minimum DSCR | decimal | — | 1.25x | ✓ Low |
| 127 | `debt_yield_min` | Minimum Debt Yield | percent | — | 8% | ✗ Low |
| 128 | `lender_name` | Lender | text | — | — | ✓ Medium |

### Loan Costs (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 129 | `origination_fee_pct` | Origination Fee % | percent | — | 1.0% | ✓ Low |
| 130 | `origination_fee` | Origination Fee $ | currency | — | Calculated | ✓ Low |
| 131 | `lender_legal` | Lender Legal | currency | — | $15,000 | ✗ Low |
| 132 | `appraisal_cost` | Appraisal | currency | — | $5,000 | ✗ Low |
| 133 | `environmental_cost` | Environmental Report | currency | — | $3,500 | ✗ Low |
| 134 | `pca_cost` | PCA Report | currency | — | $4,000 | ✗ Low |
| 135 | `rate_lock_deposit` | Rate Lock Deposit | currency | — | — | ✗ Low |
| 136 | `total_loan_costs` | Total Loan Costs | currency | — | Calculated | ✗ Low |

### Reserves & Escrows (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 137 | `tax_escrow_months` | Tax Escrow (months) | integer | — | 6 | ✗ Low |
| 138 | `insurance_escrow_months` | Insurance Escrow (months) | integer | — | 3 | ✗ Low |
| 139 | `replacement_reserve` | Replacement Reserve | currency | — | $250/unit | ✗ Low |
| 140 | `operating_reserve` | Operating Reserve | currency | — | 0 | ✗ Low |
| 141 | `capex_reserve_required` | CapEx Reserve Req'd | currency | — | — | ✗ Low |

### Prepayment & Extensions (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 142 | `prepayment_type` | Prepayment Penalty Type | text | — | Yield Maint | ✗ Low |
| 143 | `prepayment_lockout` | Lockout Period | integer | — | 2 years | ✗ Low |
| 144 | `defeasance_permitted` | Defeasance Permitted | boolean | — | Yes | ✗ Low |
| 145 | `extension_options` | Extension Options | integer | — | 0 | ✗ Low |
| 146 | `extension_fee_bps` | Extension Fee (bps) | integer | — | 25 | ✗ Low |

---

## BASKET 5: THE SPLIT (Equity Waterfall)

**Purpose:** Capital structure, promote tiers, distributions  
**Field Count:** 17 fields

### Equity Structure (7 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 147 | `total_equity` | Total Equity Required | currency | — | Calculated | ✗ Low |
| 148 | `lp_equity_pct` | LP Equity % | percent | ✓ | 90% | ✗ Low |
| 149 | `gp_equity_pct` | GP Equity % | percent | ✓ | 10% | ✗ Low |
| 150 | `gp_coinvest_amount` | GP Co-Invest $ | currency | — | Calculated | ✗ Low |
| 151 | `preferred_return_pct` | Preferred Return | percent | ✓ | 8.0% | ✗ Low |
| 152 | `pref_compounding` | Pref Compounding | text | — | Simple | ✗ Low |
| 153 | `distribution_frequency` | Distribution Frequency | text | — | Quarterly | ✗ Low |

### Waterfall Tiers (8 fields for typical 2-3 tier structure)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 154 | `tier_1_hurdle` | Tier 1 Hurdle (Pref) | percent | — | 8.0% | ✗ Low |
| 155 | `tier_1_lp_split` | Tier 1 LP Split | percent | — | 100% | ✗ Low |
| 156 | `tier_1_gp_split` | Tier 1 GP Split | percent | — | 0% | ✗ Low |
| 157 | `tier_2_hurdle` | Tier 2 Hurdle (IRR) | percent | — | 12% | ✗ Low |
| 158 | `tier_2_lp_split` | Tier 2 LP Split | percent | — | 80% | ✗ Low |
| 159 | `tier_2_gp_split` | Tier 2 GP Split | percent | — | 20% | ✗ Low |
| 160 | `tier_3_lp_split` | Tier 3 LP Split | percent | — | 70% | ✗ Low |
| 161 | `tier_3_gp_split` | Tier 3 GP Split | percent | — | 30% | ✗ Low |

### GP Fees (2 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 162 | `acquisition_fee_pct` | Acquisition Fee | percent | — | 1.0% | ✗ Low |
| 163 | `asset_mgmt_fee_pct` | Asset Mgmt Fee | percent | — | 1.5% | ✗ Low |

---

## DISPOSITION (Exit Assumptions)

**Purpose:** Sale assumptions for hold period end  
**Field Count:** 12 fields

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 164 | `hold_period_years` | Hold Period | decimal | ✓ | 5 | ✗ Low |
| 165 | `exit_cap_rate` | Exit Cap Rate | percent | ✓ | Going-in + 25bps | ✗ Low |
| 166 | `terminal_noi` | Terminal Year NOI | currency | — | Calculated | — |
| 167 | `gross_sale_price` | Gross Sale Price | currency | — | Calculated | — |
| 168 | `disposition_costs_pct` | Disposition Costs % | percent | — | 2.0% | ✗ Low |
| 169 | `broker_commission_pct` | Broker Commission | percent | — | 1.5% | ✗ Low |
| 170 | `transfer_tax_pct` | Transfer Tax | percent | — | Varies | ✗ Low |
| 171 | `net_sale_proceeds` | Net Sale Proceeds | currency | — | Calculated | — |
| 172 | `loan_payoff` | Loan Payoff at Sale | currency | — | Calculated | — |
| 173 | `prepayment_penalty` | Prepayment Penalty | currency | — | Calculated | — |
| 174 | `equity_proceeds` | Equity Proceeds | currency | — | Calculated | — |
| 175 | `sale_date` | Projected Sale Date | date | — | Acq + Hold | — |

---

## CALCULATED OUTPUTS (Return Metrics)

**Purpose:** Model outputs, not inputs  
**Field Count:** 8 fields

| # | Field | Label | Type | Notes |
|---|-------|-------|------|-------|
| 176 | `noi_year_1` | Year 1 NOI | currency | EGI - OpEx |
| 177 | `noi_stabilized` | Stabilized NOI | currency | At stabilization |
| 178 | `cash_on_cash_year_1` | Y1 Cash-on-Cash | percent | CF / Equity |
| 179 | `dscr_year_1` | Year 1 DSCR | decimal | NOI / Debt Service |
| 180 | `levered_irr` | Levered IRR | percent | Project IRR |
| 181 | `unlevered_irr` | Unlevered IRR | percent | Property IRR |
| 182 | `equity_multiple` | Equity Multiple | decimal | Distributions / Equity |
| 183 | `net_profit` | Net Profit | currency | Total Returns - Equity |

---

## SUMMARY BY EXTRACTION CONFIDENCE

| Confidence | Field Count | Example Fields |
|------------|-------------|----------------|
| **High** (✓ in most OMs) | 45 | Purchase price, units, rents, OpEx line items |
| **Medium** (often available) | 52 | Unit mix details, utility breakdown, loan terms |
| **Low** (rarely in documents) | 86 | Growth rates, waterfall splits, escrows |

---

## FIELD REQUIREMENTS BY ANALYSIS TIER

### Minimum Viable Analysis (MVP - 18 fields)

These fields produce basic NOI, cap rate, and cash-on-cash:

1. `unit_count`
2. `purchase_price`
3. `in_place_rent_annual` OR `avg_rent_per_unit`
4. `physical_vacancy_pct`
5. `other_income_total` (can default to 0)
6. `real_estate_taxes`
7. `property_insurance`
8. `utilities_total`
9. `repairs_maintenance`
10. `management_fee_pct`
11. `loan_amount` OR `ltv_pct`
12. `interest_rate`
13. `amortization_years`
14. `hold_period_years`
15. `exit_cap_rate`
16. `lp_equity_pct`
17. `gp_equity_pct`
18. `preferred_return_pct`

### Standard Analysis (55 fields)

Adds: Unit mix, detailed OpEx breakdown, other income line items, rent growth, CapEx reserves

### Full Kitchen Sink (183 fields)

Complete institutional-grade analysis with all expense categories, multiple financing scenarios, multi-tier waterfall, detailed reserves, and full sensitivity inputs.

---

**End of Field Reference**
**QJ04**

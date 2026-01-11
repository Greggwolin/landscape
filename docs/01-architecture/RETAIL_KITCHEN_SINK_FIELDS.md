# RETAIL UNDERWRITING: KITCHEN SINK FIELD REFERENCE

**Version:** 1.0  
**Date:** December 16, 2025  
**Purpose:** Complete field inventory for retail income property analysis  
**Total Fields:** 215 (organized by the 5-basket framework)  
**Property Subtypes Covered:** Neighborhood Center, Community Center, Power Center, Lifestyle Center, Strip Center, Regional Mall

---

## RETAIL-SPECIFIC CONSIDERATIONS

Retail properties differ fundamentally from multifamily in several ways:

1. **Lease Structure** — Commercial leases (NNN, Modified Gross, Full Service) vs. residential month-to-month
2. **Expense Recovery** — Tenants reimburse CAM, taxes, insurance via complex recovery structures
3. **Percentage Rent** — Revenue participation based on tenant sales volume
4. **Tenant Mix** — Anchor vs. inline tenant economics differ dramatically
5. **Co-Tenancy** — Lease provisions triggered by anchor tenant status

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

## BASKET 1: THE DEAL (Acquisition & Disposition)

**Purpose:** Property identification, physical characteristics, acquisition terms  
**Field Count:** 28 fields

### Property Identification (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 1 | `property_name` | Property Name | text | ✓ | — | ✓ High |
| 2 | `property_address` | Street Address | text | ✓ | — | ✓ High |
| 3 | `city` | City | text | ✓ | — | ✓ High |
| 4 | `state` | State | text | ✓ | — | ✓ High |
| 5 | `zip_code` | ZIP Code | text | ✓ | — | ✓ High |
| 6 | `county` | County | text | — | Lookup | ✓ Medium |
| 7 | `retail_subtype` | Retail Subtype | text | ✓ | — | ✓ High |
| 8 | `trade_area_type` | Trade Area Type | text | — | — | ✓ Medium |

### Physical Characteristics (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 9 | `gla_sf` | Gross Leasable Area (GLA) | integer | ✓ | — | ✓ High |
| 10 | `building_sf` | Building SF | integer | — | — | ✓ High |
| 11 | `land_area_acres` | Land Area (Acres) | decimal | — | — | ✓ Medium |
| 12 | `land_area_sf` | Land Area (SF) | integer | — | Calculated | ✓ Medium |
| 13 | `floor_area_ratio` | Floor Area Ratio (FAR) | decimal | — | Calculated | ✗ Low |
| 14 | `year_built` | Year Built | integer | — | — | ✓ High |
| 15 | `year_renovated` | Year Renovated | integer | — | — | ✓ Medium |
| 16 | `building_count` | Number of Buildings | integer | — | 1 | ✓ Medium |
| 17 | `parking_spaces` | Parking Spaces | integer | — | — | ✓ Medium |
| 18 | `parking_ratio` | Parking Ratio (spaces/1,000 SF) | decimal | — | 4.0 | ✓ Medium |

### Acquisition Terms (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 19 | `purchase_price` | Purchase Price | currency | ✓ | — | ✓ High |
| 20 | `acquisition_date` | Acquisition Date | date | ✓ | Today + 60 | ✓ Medium |
| 21 | `price_per_sf` | Price per SF | currency | — | Calculated | ✓ Medium |
| 22 | `going_in_cap_rate` | Going-In Cap Rate | percent | — | Calculated | ✓ High |
| 23 | `going_in_noi` | Going-In NOI | currency | — | — | ✓ High |

### Acquisition Costs (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 24 | `closing_costs_pct` | Closing Costs % | percent | — | 1.50% | ✗ Low |
| 25 | `due_diligence_costs` | Due Diligence Costs | currency | — | $35,000 | ✗ Low |
| 26 | `legal_fees` | Legal Fees | currency | — | $50,000 | ✗ Low |
| 27 | `title_insurance` | Title Insurance | currency | — | 0.25% of price | ✗ Low |
| 28 | `earnest_money` | Earnest Money | currency | — | 2% of price | ✗ Low |

---

## BASKET 2: THE CASH IN (Revenue)

**Purpose:** All income sources including base rent, percentage rent, and recoveries  
**Field Count:** 85 fields

### Tenant Summary (Property-Level) (12 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 29 | `tenant_count` | Number of Tenants | integer | ✓ | — | ✓ High |
| 30 | `anchor_count` | Number of Anchors | integer | — | — | ✓ High |
| 31 | `anchor_gla_sf` | Anchor GLA (SF) | integer | — | — | ✓ High |
| 32 | `anchor_gla_pct` | Anchor GLA % | percent | — | Calculated | ✓ Medium |
| 33 | `inline_count` | Number of Inline Tenants | integer | — | Calculated | ✓ Medium |
| 34 | `inline_gla_sf` | Inline GLA (SF) | integer | — | Calculated | ✓ Medium |
| 35 | `occupied_sf` | Occupied SF | integer | ✓ | — | ✓ High |
| 36 | `occupancy_pct` | Occupancy % | percent | ✓ | — | ✓ High |
| 37 | `vacant_sf` | Vacant SF | integer | — | Calculated | ✓ High |
| 38 | `walt_years` | WALT (years) | decimal | — | — | ✓ Medium |
| 39 | `national_credit_pct` | National Credit Tenant % | percent | — | — | ✓ Medium |
| 40 | `local_tenant_pct` | Local Tenant % | percent | — | Calculated | ✓ Medium |

### Rent Roll - Per Tenant Fields (20 fields per tenant)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 41 | `tenant_name` | Tenant Name | text | ✓ | — | ✓ High |
| 42 | `suite_number` | Suite Number | text | — | — | ✓ High |
| 43 | `tenant_sf` | Tenant SF | integer | ✓ | — | ✓ High |
| 44 | `lease_start_date` | Lease Start | date | ✓ | — | ✓ High |
| 45 | `lease_end_date` | Lease Expiration | date | ✓ | — | ✓ High |
| 46 | `lease_term_months` | Lease Term (months) | integer | — | Calculated | ✓ Medium |
| 47 | `remaining_term_months` | Remaining Term (months) | integer | — | Calculated | ✓ Medium |
| 48 | `base_rent_psf` | Base Rent/SF | currency | ✓ | — | ✓ High |
| 49 | `base_rent_annual` | Base Rent (Annual) | currency | — | Calculated | ✓ High |
| 50 | `base_rent_monthly` | Base Rent (Monthly) | currency | — | Calculated | ✓ Medium |
| 51 | `lease_type` | Lease Type | text | ✓ | NNN | ✓ High |
| 52 | `is_anchor` | Anchor Tenant? | boolean | — | SF > 10,000 | ✓ Medium |
| 53 | `tenant_type` | Tenant Type | text | — | — | ✓ Medium |
| 54 | `credit_rating` | Credit Rating | text | — | — | ✓ Low |
| 55 | `is_national_credit` | National Credit? | boolean | — | — | ✓ Medium |
| 56 | `rent_escalation_type` | Escalation Type | text | — | Fixed | ✓ Medium |
| 57 | `rent_escalation_pct` | Escalation % | percent | — | 3.0% | ✓ Medium |
| 58 | `rent_escalation_amount` | Escalation $ | currency | — | — | ✓ Medium |
| 59 | `escalation_frequency` | Escalation Frequency | text | — | Annual | ✓ Medium |
| 60 | `next_escalation_date` | Next Escalation Date | date | — | — | ✓ Low |

### Rent Steps - Per Tenant (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 61 | `step_rent_schedule` | Step Rent Schedule (JSON) | json | — | — | ✓ Medium |
| 62 | `step_year_1_rent_psf` | Year 1 Rent/SF | currency | — | — | ✓ Medium |
| 63 | `step_year_2_rent_psf` | Year 2 Rent/SF | currency | — | — | ✓ Medium |
| 64 | `step_year_3_rent_psf` | Year 3 Rent/SF | currency | — | — | ✓ Medium |
| 65 | `step_year_4_rent_psf` | Year 4 Rent/SF | currency | — | — | ✓ Medium |
| 66 | `step_year_5_rent_psf` | Year 5 Rent/SF | currency | — | — | ✓ Medium |
| 67 | `free_rent_months` | Free Rent (months) | integer | — | 0 | ✓ Medium |
| 68 | `free_rent_remaining` | Free Rent Remaining | integer | — | — | ✓ Low |

### Renewal Options - Per Tenant (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 69 | `renewal_option_count` | Number of Options | integer | — | — | ✓ Medium |
| 70 | `renewal_term_years` | Option Term (years) | integer | — | 5 | ✓ Medium |
| 71 | `renewal_rent_type` | Renewal Rent Basis | text | — | Fair Market | ✓ Medium |
| 72 | `renewal_rent_floor_psf` | Renewal Rent Floor/SF | currency | — | — | ✓ Low |
| 73 | `renewal_notice_days` | Notice Period (days) | integer | — | 180 | ✓ Low |
| 74 | `renewal_probability_pct` | Renewal Probability | percent | — | 65% | ✗ Low |

### Percentage Rent - Per Tenant (12 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 75 | `has_percentage_rent` | Has Percentage Rent? | boolean | — | false | ✓ Medium |
| 76 | `sales_volume_annual` | Annual Sales Volume | currency | — | — | ✓ Medium |
| 77 | `sales_psf` | Sales/SF | currency | — | Calculated | ✓ Medium |
| 78 | `breakpoint_type` | Breakpoint Type | text | — | Natural | ✓ Medium |
| 79 | `breakpoint_amount` | Breakpoint Amount | currency | — | — | ✓ Medium |
| 80 | `natural_breakpoint` | Natural Breakpoint | currency | — | Calculated | — |
| 81 | `percentage_rent_rate` | Percentage Rent % | percent | — | 5.0% | ✓ Medium |
| 82 | `percentage_rent_annual` | Percentage Rent (Annual) | currency | — | Calculated | ✓ Medium |
| 83 | `sales_growth_rate` | Sales Growth Rate | percent | — | 2.0% | ✗ Low |
| 84 | `sales_reporting_frequency` | Sales Reporting | text | — | Monthly | ✓ Low |
| 85 | `audit_rights` | Audit Rights? | boolean | — | true | ✗ Low |
| 86 | `percentage_rent_offset` | Offset Against Base? | boolean | — | false | ✓ Low |

### Co-Tenancy Provisions - Per Tenant (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 87 | `has_cotenancy` | Has Co-Tenancy? | boolean | — | false | ✓ Medium |
| 88 | `cotenancy_anchor_required` | Required Anchor | text | — | — | ✓ Low |
| 89 | `cotenancy_occupancy_min` | Min Occupancy Trigger | percent | — | — | ✓ Low |
| 90 | `cotenancy_rent_reduction` | Rent Reduction if Triggered | percent | — | — | ✓ Low |
| 91 | `cotenancy_termination_right` | Termination Right? | boolean | — | — | ✓ Low |

### Rent Roll Aggregates (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 92 | `gross_potential_rent` | Gross Potential Rent | currency | — | Calculated | ✓ High |
| 93 | `scheduled_base_rent` | Scheduled Base Rent | currency | ✓ | — | ✓ High |
| 94 | `avg_base_rent_psf` | Avg Base Rent/SF | currency | — | Calculated | ✓ High |
| 95 | `anchor_avg_rent_psf` | Anchor Avg Rent/SF | currency | — | Calculated | ✓ Medium |
| 96 | `inline_avg_rent_psf` | Inline Avg Rent/SF | currency | — | Calculated | ✓ Medium |
| 97 | `market_rent_psf` | Market Rent/SF | currency | — | — | ✓ Medium |
| 98 | `loss_to_lease_pct` | Loss to Lease % | percent | — | Calculated | ✓ Medium |
| 99 | `lease_expiration_schedule` | Lease Expirations (JSON) | json | — | — | ✓ High |

### Vacancy & Credit Loss (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 100 | `physical_vacancy_pct` | Physical Vacancy | percent | ✓ | — | ✓ High |
| 101 | `absorption_months` | Absorption Period (months) | integer | — | 12 | ✗ Low |
| 102 | `downtime_months` | Downtime Between Leases | integer | — | 6 | ✗ Low |
| 103 | `general_vacancy_pct` | General Vacancy | percent | — | 5.0% | ✗ Low |
| 104 | `credit_loss_pct` | Credit Loss | percent | — | 1.0% | ✓ Low |
| 105 | `free_rent_concession` | Free Rent Allowance | integer | — | 3 months | ✗ Low |

### Other Income (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 106 | `other_income_total` | Total Other Income | currency | — | Calculated | ✓ High |
| 107 | `specialty_leasing_income` | Specialty Leasing | currency | — | — | ✓ Medium |
| 108 | `temp_tenant_income` | Temporary Tenants | currency | — | — | ✓ Medium |
| 109 | `kiosk_income` | Kiosk Income | currency | — | — | ✓ Medium |
| 110 | `parking_income` | Parking Income | currency | — | — | ✓ Medium |
| 111 | `storage_income` | Storage Income | currency | — | — | ✓ Low |
| 112 | `telecom_income` | Telecom/Antenna | currency | — | — | ✓ Low |
| 113 | `misc_income` | Miscellaneous Income | currency | — | — | ✓ Low |

---

## BASKET 3: THE CASH OUT (Operating Expenses & CapEx)

**Purpose:** Property operations, expense recoveries, capital expenditures  
**Field Count:** 62 fields

### CAM (Common Area Maintenance) Expenses (14 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 114 | `cam_total` | Total CAM | currency | ✓ | — | ✓ High |
| 115 | `cam_psf` | CAM/SF | currency | — | Calculated | ✓ High |
| 116 | `landscaping` | Landscaping | currency | — | — | ✓ High |
| 117 | `parking_lot_maintenance` | Parking Lot Maintenance | currency | — | — | ✓ Medium |
| 118 | `parking_lot_lighting` | Parking Lot Lighting | currency | — | — | ✓ Medium |
| 119 | `snow_removal` | Snow Removal | currency | — | — | ✓ Low |
| 120 | `security` | Security | currency | — | — | ✓ Medium |
| 121 | `janitorial` | Janitorial | currency | — | — | ✓ Medium |
| 122 | `hvac_common` | HVAC - Common Area | currency | — | — | ✓ Medium |
| 123 | `repairs_maintenance` | Repairs & Maintenance | currency | — | — | ✓ High |
| 124 | `common_utilities` | Common Area Utilities | currency | — | — | ✓ Medium |
| 125 | `trash_removal` | Trash Removal | currency | — | — | ✓ High |
| 126 | `pest_control` | Pest Control | currency | — | — | ✓ Medium |
| 127 | `cam_admin_fee_pct` | CAM Admin Fee % | percent | — | 15% | ✓ Medium |

### Fixed Expenses (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 128 | `real_estate_taxes` | Real Estate Taxes | currency | ✓ | — | ✓ High |
| 129 | `tax_rate_pct` | Tax Rate % | percent | — | — | ✓ Medium |
| 130 | `assessed_value` | Assessed Value | currency | — | — | ✓ Medium |
| 131 | `tax_reassessment_year` | Reassessment Year | integer | — | Acq year + 1 | ✗ Low |
| 132 | `property_insurance` | Property Insurance | currency | ✓ | — | ✓ High |
| 133 | `insurance_psf` | Insurance/SF | currency | — | Calculated | ✓ Medium |
| 134 | `flood_insurance` | Flood Insurance | currency | — | — | ✓ Medium |
| 135 | `liability_insurance` | Liability Insurance | currency | — | — | ✓ Low |

### Management & Admin (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 136 | `management_fee_pct` | Management Fee % | percent | ✓ | 3.5% | ✓ High |
| 137 | `management_fee` | Management Fee $ | currency | — | Calculated | ✓ High |
| 138 | `onsite_management` | On-Site Management | currency | — | — | ✓ Medium |
| 139 | `administrative` | Administrative/G&A | currency | — | — | ✓ Medium |
| 140 | `professional_fees` | Professional Fees | currency | — | — | ✓ Low |
| 141 | `marketing_fund` | Marketing Fund | currency | — | — | ✓ Medium |
| 142 | `merchant_association` | Merchant Association | currency | — | — | ✓ Low |
| 143 | `bad_debt_expense` | Bad Debt Expense | currency | — | — | ✓ Low |

### Expense Recovery Structure (14 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 144 | `recovery_method` | Default Recovery Method | text | ✓ | NNN | ✓ High |
| 145 | `cam_recovery_pct` | CAM Recovery % | percent | — | 100% | ✓ Medium |
| 146 | `tax_recovery_pct` | Tax Recovery % | percent | — | 100% | ✓ Medium |
| 147 | `insurance_recovery_pct` | Insurance Recovery % | percent | — | 100% | ✓ Medium |
| 148 | `total_recoveries` | Total Expense Recoveries | currency | — | Calculated | ✓ High |
| 149 | `recovery_income_psf` | Recovery Income/SF | currency | — | Calculated | ✓ Medium |
| 150 | `gross_up_vacancy_pct` | Gross-Up Vacancy % | percent | — | 95% | ✗ Low |
| 151 | `base_year_expenses` | Base Year Expenses | currency | — | — | ✓ Medium |
| 152 | `expense_stop_psf` | Expense Stop/SF | currency | — | — | ✓ Medium |
| 153 | `expense_cap_pct` | Expense Cap % | percent | — | — | ✓ Low |
| 154 | `controllable_cap_pct` | Controllable Cap % | percent | — | 5% | ✓ Low |
| 155 | `anchor_recovery_pct` | Anchor Recovery % | percent | — | — | ✓ Low |
| 156 | `anchor_cam_cap` | Anchor CAM Cap | currency | — | — | ✓ Low |
| 157 | `admin_fee_recoverable` | Admin Fee Recoverable? | boolean | — | true | ✓ Low |

### Operating Expense Totals (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 158 | `total_operating_expenses` | Total OpEx (Gross) | currency | — | Calculated | ✓ High |
| 159 | `opex_psf` | OpEx/SF | currency | — | Calculated | ✓ High |
| 160 | `net_operating_expenses` | Net OpEx (After Recovery) | currency | — | Calculated | — |
| 161 | `expense_ratio` | Expense Ratio (% EGI) | percent | — | Calculated | ✓ Medium |
| 162 | `recovery_ratio` | Recovery Ratio | percent | — | Calculated | ✓ Medium |
| 163 | `opex_growth_rate` | OpEx Growth Rate | percent | — | 3.0% | ✗ Low |
| 164 | `controllable_expenses` | Controllable Expenses | currency | — | Calculated | ✗ Low |
| 165 | `non_controllable_expenses` | Non-Controllable Expenses | currency | — | Calculated | ✗ Low |

### Capital Expenditures (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 166 | `capex_reserve_psf` | CapEx Reserve/SF | currency | ✓ | $0.25/SF | ✓ Medium |
| 167 | `capex_reserve_annual` | CapEx Reserve Annual | currency | — | Calculated | ✓ Medium |
| 168 | `immediate_repairs` | Immediate Repairs (Y1) | currency | — | — | ✓ Medium |
| 169 | `roof_reserve` | Roof Reserve | currency | — | — | ✗ Low |
| 170 | `hvac_reserve` | HVAC Reserve | currency | — | — | ✗ Low |
| 171 | `parking_lot_reserve` | Parking Lot Reserve | currency | — | — | ✗ Low |
| 172 | `facade_reserve` | Facade/Exterior Reserve | currency | — | — | ✗ Low |
| 173 | `signage_reserve` | Signage Reserve | currency | — | — | ✗ Low |
| 174 | `ti_reserve_psf` | TI Reserve/SF | currency | — | — | ✗ Low |
| 175 | `leasing_commission_reserve` | LC Reserve | currency | — | — | ✗ Low |

---

## BASKET 4: THE FINANCING (Debt Structure)

**Purpose:** Loan terms, rates, covenants  
**Field Count:** 25 fields

### Primary Loan Terms (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 176 | `loan_amount` | Loan Amount | currency | ✓ | LTV × Price | ✓ Medium |
| 177 | `ltv_pct` | Loan-to-Value | percent | ✓ | 60% | ✓ Medium |
| 178 | `interest_rate` | Interest Rate | percent | ✓ | Market | ✓ Medium |
| 179 | `rate_type` | Rate Type | text | — | Fixed | ✓ Medium |
| 180 | `amortization_years` | Amortization | integer | ✓ | 25 | ✓ Medium |
| 181 | `loan_term_years` | Loan Term | integer | ✓ | 10 | ✓ Medium |
| 182 | `interest_only_years` | I/O Period | integer | — | 0 | ✓ Medium |
| 183 | `dscr_minimum` | Minimum DSCR | decimal | — | 1.25x | ✓ Low |
| 184 | `debt_yield_min` | Minimum Debt Yield | percent | — | 9% | ✗ Low |
| 185 | `lender_name` | Lender | text | — | — | ✓ Medium |

### Loan Costs (7 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 186 | `origination_fee_pct` | Origination Fee % | percent | — | 1.0% | ✓ Low |
| 187 | `origination_fee` | Origination Fee $ | currency | — | Calculated | ✓ Low |
| 188 | `lender_legal` | Lender Legal | currency | — | $20,000 | ✗ Low |
| 189 | `appraisal_cost` | Appraisal | currency | — | $7,500 | ✗ Low |
| 190 | `environmental_cost` | Environmental Report | currency | — | $5,000 | ✗ Low |
| 191 | `pca_cost` | PCA Report | currency | — | $6,000 | ✗ Low |
| 192 | `total_loan_costs` | Total Loan Costs | currency | — | Calculated | ✗ Low |

### Reserves & Prepayment (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 193 | `tax_escrow_months` | Tax Escrow (months) | integer | — | 6 | ✗ Low |
| 194 | `insurance_escrow_months` | Insurance Escrow (months) | integer | — | 3 | ✗ Low |
| 195 | `ti_lc_reserve` | TI/LC Reserve | currency | — | — | ✗ Low |
| 196 | `rollover_reserve` | Rollover Reserve | currency | — | — | ✗ Low |
| 197 | `prepayment_type` | Prepayment Penalty Type | text | — | Yield Maint | ✗ Low |
| 198 | `prepayment_lockout` | Lockout Period | integer | — | 2 years | ✗ Low |
| 199 | `extension_options` | Extension Options | integer | — | 0 | ✗ Low |
| 200 | `extension_fee_bps` | Extension Fee (bps) | integer | — | 25 | ✗ Low |

---

## BASKET 5: THE SPLIT (Equity Waterfall)

**Purpose:** Capital structure, promote tiers, distributions  
**Field Count:** 15 fields

### Equity Structure (7 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 201 | `total_equity` | Total Equity Required | currency | — | Calculated | ✗ Low |
| 202 | `lp_equity_pct` | LP Equity % | percent | ✓ | 90% | ✗ Low |
| 203 | `gp_equity_pct` | GP Equity % | percent | ✓ | 10% | ✗ Low |
| 204 | `gp_coinvest_amount` | GP Co-Invest $ | currency | — | Calculated | ✗ Low |
| 205 | `preferred_return_pct` | Preferred Return | percent | ✓ | 8.0% | ✗ Low |
| 206 | `pref_compounding` | Pref Compounding | text | — | Simple | ✗ Low |
| 207 | `distribution_frequency` | Distribution Frequency | text | — | Quarterly | ✗ Low |

### Waterfall Tiers (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 208 | `tier_1_hurdle` | Tier 1 Hurdle (Pref) | percent | — | 8.0% | ✗ Low |
| 209 | `tier_1_lp_split` | Tier 1 LP Split | percent | — | 100% | ✗ Low |
| 210 | `tier_2_hurdle` | Tier 2 Hurdle (IRR) | percent | — | 12% | ✗ Low |
| 211 | `tier_2_lp_split` | Tier 2 LP Split | percent | — | 80% | ✗ Low |
| 212 | `tier_3_lp_split` | Tier 3 LP Split | percent | — | 70% | ✗ Low |
| 213 | `acquisition_fee_pct` | Acquisition Fee | percent | — | 1.0% | ✗ Low |

---

## DISPOSITION (Exit Assumptions)

**Purpose:** Sale assumptions for hold period end  
**Field Count:** 10 fields

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 214 | `hold_period_years` | Hold Period | decimal | ✓ | 7 | ✗ Low |
| 215 | `exit_cap_rate` | Exit Cap Rate | percent | ✓ | Going-in + 25bps | ✗ Low |

*(Plus 8 calculated fields: terminal NOI, gross/net sale price, disposition costs, broker commission, loan payoff, equity proceeds, sale date)*

---

## CALCULATED OUTPUTS (Return Metrics)

| # | Field | Label | Type | Notes |
|---|-------|-------|------|-------|
| — | `noi_year_1` | Year 1 NOI | currency | EGI - OpEx + Recoveries |
| — | `noi_stabilized` | Stabilized NOI | currency | At stabilization |
| — | `cash_on_cash_year_1` | Y1 Cash-on-Cash | percent | CF / Equity |
| — | `dscr_year_1` | Year 1 DSCR | decimal | NOI / Debt Service |
| — | `levered_irr` | Levered IRR | percent | Project IRR |
| — | `unlevered_irr` | Unlevered IRR | percent | Property IRR |
| — | `equity_multiple` | Equity Multiple | decimal | Distributions / Equity |

---

## RETAIL-SPECIFIC COMPLEXITY

### Lease Type Definitions

| Lease Type | Tenant Pays | Landlord Pays |
|------------|-------------|---------------|
| **NNN (Triple Net)** | Base rent + taxes + insurance + CAM | Structure only |
| **Modified Gross** | Base rent + some expenses | Some expenses |
| **Full Service Gross** | Base rent only | All expenses |
| **Absolute Net** | Everything including structure | Nothing |
| **Percentage Rent** | Base + % of sales over breakpoint | Varies |

### Anchor vs. Inline Economics

| Metric | Anchor Tenants | Inline Tenants |
|--------|----------------|----------------|
| Typical Size | 10,000+ SF | 1,000-5,000 SF |
| Rent/SF | $8-15/SF | $25-50/SF |
| Lease Term | 10-25 years | 3-10 years |
| TI Allowance | $0-10/SF | $20-50/SF |
| CAM Contribution | Capped, limited | Pro-rata, full |
| Percentage Rent | Rarely | Common |
| Co-Tenancy | Triggers others | Has provisions |

---

## SUMMARY BY EXTRACTION CONFIDENCE

| Confidence | Field Count | Example Fields |
|------------|-------------|----------------|
| **High** (✓ in most OMs) | 55 | GLA, occupancy, rent roll, base rent, CAM, taxes |
| **Medium** (often available) | 75 | Tenant details, lease terms, recovery structure |
| **Low** (rarely in documents) | 85 | Waterfall, growth rates, renewal probability |

---

## FIELD REQUIREMENTS BY ANALYSIS TIER

### Minimum Viable Analysis (MVP - 20 fields)

1. `gla_sf`
2. `purchase_price`
3. `occupancy_pct`
4. `scheduled_base_rent` OR `avg_base_rent_psf`
5. `cam_total`
6. `real_estate_taxes`
7. `property_insurance`
8. `management_fee_pct`
9. `recovery_method`
10. `total_recoveries`
11. `loan_amount` OR `ltv_pct`
12. `interest_rate`
13. `amortization_years`
14. `hold_period_years`
15. `exit_cap_rate`
16. `lp_equity_pct`
17. `gp_equity_pct`
18. `preferred_return_pct`
19. `capex_reserve_psf`
20. `credit_loss_pct`

### Standard Analysis (75 fields)

Adds: Full rent roll with tenant details, percentage rent, CAM breakdown, recovery structure, TI/LC assumptions

### Full Kitchen Sink (215 fields)

Complete institutional-grade analysis with all expense categories, multiple lease types, co-tenancy provisions, detailed waterfall, and full sensitivity inputs.

---

**End of Field Reference**
**QJ05**

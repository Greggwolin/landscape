## INDUSTRIAL Dependency Trace

### Output: `effective_gross_income`

**Direct Dependencies:**
- `scheduled_base_rent` (or rent roll)
- `vacancy`/`credit_loss_pct`
- `total_recoveries`
- `other_income_total` (if any)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| occupancy_pct OR physical_vacancy_pct | Yes | No | — |
| credit_loss_pct | No | Yes | Default 0.5% |
| recovery_method | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| cam_recovery_pct | No | Yes | Default 100% |
| tax_recovery_pct | No | Yes | Default 100% |
| insurance_recovery_pct | No | Yes | Default 100% |
| other_income_total | No | Yes | Defaults/zero |

**OR Conditions:** `scheduled_base_rent` OR rent-roll rollup; `occupancy_pct` OR `physical_vacancy_pct`.

**Minimum Input Count:** 7 fields

---

### Output: `noi_year_1`

**Direct Dependencies:**
- `effective_gross_income`
- `total_operating_expenses` (net of recoveries)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| occupancy_pct OR physical_vacancy_pct | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| management_fee_pct | No | Yes | Default 3.0% |
| recovery_method | Yes | No | — |
| cam_recovery_pct | No | Yes | Default 100% |
| tax_recovery_pct | No | Yes | Default 100% |
| insurance_recovery_pct | No | Yes | Default 100% |

**Minimum Input Count:** 6 fields

---

### Output: `debt_service_annual`

**Direct Dependencies:**
- `loan_amount`
- `interest_rate`
- `amortization_years`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| ltv_pct | No | Yes | Default 65% |
| purchase_price | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 25 |
| interest_only_years | No | Yes | Default 0 |

**OR Conditions:** `loan_amount` OR (`ltv_pct` AND `purchase_price`).

**Minimum Input Count:** 3 fields

---

### Output: `cash_flow_year_1`

**Direct Dependencies:**
- `noi_year_1`
- `debt_service_annual`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| occupancy_pct OR physical_vacancy_pct | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| recovery_method | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |

**Minimum Input Count:** 7 fields

---

### Output: `cash_on_cash_year_1`

**Direct Dependencies:**
- `cash_flow_year_1`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |
| due_diligence_costs | No | Yes | Default $35,000 |
| legal_fees | No | Yes | Default $50,000 |
| title_insurance | No | Yes | Default 0.25% of price |
| total_loan_costs | No | Yes | Calculated from loan costs |

**Minimum Input Count:** 7 fields

---

### Output: `dscr_year_1`

**Direct Dependencies:**
- `noi_year_1`
- `debt_service_annual`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| recovery_method | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |

**Minimum Input Count:** 7 fields

---

### Output: `going_in_cap_rate`

**Direct Dependencies:**
- `noi_year_1` OR `going_in_noi`
- `purchase_price`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| recovery_method | Yes | No | — |
| purchase_price | Yes | No | — |

**Minimum Input Count:** 6 fields

---

### Output: `exit_cap_rate`

**Direct Dependencies:**
- `exit_cap_rate` (input) OR `going_in_cap_rate` + spread

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| exit_cap_rate OR going_in_cap_rate | No | Yes | Default = going-in + 25 bps |
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | No | Yes | Used to derive going-in cap |
| purchase_price | No | Yes | Used to derive going-in cap |

**Minimum Input Count:** 0 fields

---

### Output: `gross_sale_price`

**Direct Dependencies:**
- `terminal_noi`
- `exit_cap_rate`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| opex_growth_rate | No | Yes | Default 3.0% |
| hold_period_years | No | Yes | Default 7 |
| exit_cap_rate | No | Yes | Default = going-in + 25 bps |

**Minimum Input Count:** 4 fields

---

### Output: `net_sale_proceeds`

**Direct Dependencies:**
- `gross_sale_price`
- `disposition_costs_pct`
- `broker_commission_pct`
- `loan_payoff`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR (tenant_sf + base_rent_psf) | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| exit_cap_rate | No | Yes | Default = going-in + 25 bps |
| disposition_costs_pct | No | Yes | Default 2.0% |
| broker_commission_pct | No | Yes | Default 1.5% |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 25 |
| hold_period_years | No | Yes | Default 7 |

**Minimum Input Count:** 6 fields

---

### Output: `levered_irr`

**Direct Dependencies:**
- `cash_flow_year_1` through `cash_flow_year_N`
- `net_sale_proceeds`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR rent-roll rollup | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| opex_growth_rate | No | Yes | Default 3.0% |
| hold_period_years | No | Yes | Default 7 |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 25 |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |
| total_loan_costs | No | Yes | Calculated from loan costs |
| disposition_costs_pct | No | Yes | Default 2.0% |

**Minimum Input Count:** 6 fields

---

### Output: `unlevered_irr`

**Direct Dependencies:**
- `noi_year_1` through `noi_year_N`
- `gross_sale_price`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR rent-roll rollup | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| opex_growth_rate | No | Yes | Default 3.0% |
| hold_period_years | No | Yes | Default 7 |
| exit_cap_rate | No | Yes | Default = going-in + 25 bps |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |

**Minimum Input Count:** 5 fields

---

### Output: `equity_multiple`

**Direct Dependencies:**
- `cash_flow_year_1` through `cash_flow_year_N`
- `net_sale_proceeds`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| scheduled_base_rent OR rent-roll rollup | Yes | No | — |
| cam_total | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| purchase_price | Yes | No | — |
| disposition_costs_pct | No | Yes | Default 2.0% |

**Minimum Input Count:** 7 fields

---

## MVP Field Summary

| # | Field Name | Why Required |
|---|------------|--------------|
| 1 | purchase_price | Basis for equity, loan sizing, cap rate, sale proceeds |
| 2 | scheduled_base_rent | Core income driver for EGI and NOI |
| 3 | cam_total | Required OpEx and recovery base |
| 4 | real_estate_taxes | Required OpEx and recovery base |
| 5 | property_insurance | Required OpEx and recovery base |
| 6 | recovery_method | Determines recovery income logic (NNN vs Gross) |
| 7 | loan_amount | Debt sizing for debt service and levered cash flow |
| 8 | interest_rate | Debt service calculation |

**Total MVP Fields:** 8

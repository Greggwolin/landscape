## MULTIFAMILY Dependency Trace

### Output: `effective_gross_income`

**Direct Dependencies:**
- `gross_potential_rent`
- `total_vacancy_pct` (or components)
- `other_income_total`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| physical_vacancy_pct | No | Yes | Default 5.0% |
| economic_vacancy_pct | No | Yes | Default 2.0% |
| concessions_pct | No | Yes | Default 1.0% |
| bad_debt_pct | No | Yes | Default 1.0% |
| other_income_total OR (parking_income + laundry_income + pet_income + storage_income + utility_reimbursement + late_fees + application_fees + cable_telecom + commercial_income + amenity_fees + misc_income) | No | Yes | Defaults/zero |

**OR Conditions:** `in_place_rent_annual` OR unit-mix rollup; `other_income_total` OR sum of other income line items.

**Minimum Input Count:** 1 field

---

### Output: `noi_year_1`

**Direct Dependencies:**
- `effective_gross_income`
- `total_operating_expenses`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| physical_vacancy_pct | No | Yes | Default 5.0% |
| economic_vacancy_pct | No | Yes | Default 2.0% |
| concessions_pct | No | Yes | Default 1.0% |
| bad_debt_pct | No | Yes | Default 1.0% |
| other_income_total OR other income line items | No | Yes | Defaults/zero |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| management_fee_pct | No | Yes | Default 3.0% |
| onsite_payroll | No | Yes | Default/zero |
| administrative | No | Yes | Default/zero |
| marketing_advertising | No | Yes | Default/zero |

**OR Conditions:** `in_place_rent_annual` OR unit-mix rollup; `other_income_total` OR line-item sum.

**Minimum Input Count:** 5 fields

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
| amortization_years | No | Yes | Default 30 |
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
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| physical_vacancy_pct | No | Yes | Default 5.0% |
| economic_vacancy_pct | No | Yes | Default 2.0% |
| concessions_pct | No | Yes | Default 1.0% |
| bad_debt_pct | No | Yes | Default 1.0% |
| other_income_total OR other income line items | No | Yes | Defaults/zero |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| management_fee_pct | No | Yes | Default 3.0% |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 30 |

**Minimum Input Count:** 7 fields

---

### Output: `cash_on_cash_year_1`

**Direct Dependencies:**
- `cash_flow_year_1`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |
| due_diligence_costs | No | Yes | Default $25,000 |
| legal_fees | No | Yes | Default $35,000 |
| title_insurance | No | Yes | Default 0.25% of price |
| total_loan_costs | No | Yes | Calculated from loan costs |
| immediate_repairs | No | Yes | Default/zero |

**OR Conditions:** `loan_amount` OR (`ltv_pct` AND `purchase_price`).

**Minimum Input Count:** 7 fields

---

### Output: `dscr_year_1`

**Direct Dependencies:**
- `noi_year_1`
- `debt_service_annual`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 30 |

**Minimum Input Count:** 7 fields

---

### Output: `going_in_cap_rate`

**Direct Dependencies:**
- `noi_year_1` OR `going_in_noi`
- `purchase_price`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| purchase_price | Yes | No | — |

**OR Conditions:** `noi_year_1` OR `going_in_noi`.

**Minimum Input Count:** 6 fields

---

### Output: `exit_cap_rate`

**Direct Dependencies:**
- `exit_cap_rate` (input) OR `going_in_cap_rate` + spread

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| exit_cap_rate OR going_in_cap_rate | No | Yes | Default = going-in + 25 bps |
| in_place_rent_annual OR (unit_type_count + current_rent) | No | Yes | Used to derive going-in cap |
| purchase_price | No | Yes | Used to derive going-in cap |

**OR Conditions:** Provided `exit_cap_rate` OR default from `going_in_cap_rate`.

**Minimum Input Count:** 0 fields

---

### Output: `gross_sale_price`

**Direct Dependencies:**
- `terminal_noi`
- `exit_cap_rate`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| rent_growth_stabilized | No | Yes | Default 2.5% |
| other_income_growth | No | Yes | Default 2.0% |
| opex_growth_rate | No | Yes | Default 3.0% |
| hold_period_years | No | Yes | Default 5 |
| exit_cap_rate | No | Yes | Default = going-in + 25 bps |

**Minimum Input Count:** 5 fields

---

### Output: `net_sale_proceeds`

**Direct Dependencies:**
- `gross_sale_price`
- `disposition_costs_pct`
- `broker_commission_pct`
- `transfer_tax_pct`
- `loan_payoff`
- `prepayment_penalty`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR (unit_type_count + current_rent) | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| exit_cap_rate | No | Yes | Default = going-in + 25 bps |
| disposition_costs_pct | No | Yes | Default 2.0% |
| broker_commission_pct | No | Yes | Default 1.5% |
| transfer_tax_pct | No | Yes | Default varies |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 30 |
| hold_period_years | No | Yes | Default 5 |
| prepayment_type | No | Yes | Default Yield Maint |
| prepayment_lockout | No | Yes | Default 2 years |

**Minimum Input Count:** 7 fields

---

### Output: `levered_irr`

**Direct Dependencies:**
- `cash_flow_year_1` through `cash_flow_year_N`
- `net_sale_proceeds`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR unit-mix rollup | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| rent_growth_stabilized | No | Yes | Default 2.5% |
| other_income_growth | No | Yes | Default 2.0% |
| opex_growth_rate | No | Yes | Default 3.0% |
| hold_period_years | No | Yes | Default 5 |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| amortization_years | No | Yes | Default 30 |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |
| total_loan_costs | No | Yes | Calculated from loan costs |
| disposition_costs_pct | No | Yes | Default 2.0% |

**Minimum Input Count:** 7 fields

---

### Output: `unlevered_irr`

**Direct Dependencies:**
- `noi_year_1` through `noi_year_N`
- `gross_sale_price`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR unit-mix rollup | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| rent_growth_stabilized | No | Yes | Default 2.5% |
| opex_growth_rate | No | Yes | Default 3.0% |
| hold_period_years | No | Yes | Default 5 |
| exit_cap_rate | No | Yes | Default = going-in + 25 bps |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |

**Minimum Input Count:** 6 fields

---

### Output: `equity_multiple`

**Direct Dependencies:**
- `cash_flow_year_1` through `cash_flow_year_N`
- `net_sale_proceeds`
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| in_place_rent_annual OR unit-mix rollup | Yes | No | — |
| real_estate_taxes | Yes | No | — |
| property_insurance | Yes | No | — |
| utilities_total | Yes | No | — |
| repairs_maintenance | Yes | No | — |
| loan_amount OR (ltv_pct + purchase_price) | Yes | No | — |
| interest_rate | Yes | No | — |
| purchase_price | Yes | No | — |
| closing_costs_pct | No | Yes | Default 1.50% |
| disposition_costs_pct | No | Yes | Default 2.0% |

**Minimum Input Count:** 8 fields

---

## MVP Field Summary

| # | Field Name | Why Required |
|---|------------|--------------|
| 1 | purchase_price | Basis for equity, loan sizing, cap rate, sale proceeds |
| 2 | in_place_rent_annual | Core revenue driver for EGI and NOI |
| 3 | real_estate_taxes | Required OpEx component |
| 4 | property_insurance | Required OpEx component |
| 5 | utilities_total | Required OpEx component |
| 6 | repairs_maintenance | Required OpEx component |
| 7 | loan_amount | Debt sizing for debt service and levered cash flow |
| 8 | interest_rate | Debt service calculation |

**Total MVP Fields:** 8

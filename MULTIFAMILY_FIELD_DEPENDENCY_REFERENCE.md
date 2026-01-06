# MULTIFAMILY_FIELD_DEPENDENCY_REFERENCE

## Table of Contents

1. Section 1: Output & Derived Metrics
2. Section 2: Field-by-Field Input Documentation
3. Section 3: Dependency Matrix
4. Section 4: Minimum Viable Field Set
5. Section 5: Cross-Field Validation Rules
6. Section 6: Calculation Sequence

---

## SECTION 1: OUTPUT & DERIVED METRICS

### `gross_potential_rent` — Gross Potential Rent

**Formula:**
- Plain English: Sum of annualized rents across the unit mix (or use in-place rent if provided).
- Notation: `gross_potential_rent = SUM(unit_type_count × current_rent × 12) OR in_place_rent_annual`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| unit_type_count | Multiplies rent by unit count |
| current_rent | Annualized to compute rent |
| in_place_rent_annual | Optional direct override |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| unit_type_count | unit mix rollup | gross_potential_rent |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| current_rent | None | High — GPR cannot be computed |
| unit_type_count | None | High — GPR cannot be computed |

**Validation:**
- Output range: must be positive
- Warning triggers: GPR per unit out of market range

---

### `effective_gross_income` — Effective Gross Income

**Formula:**
- Plain English: GPR minus vacancy/credit loss plus other income.
- Notation: `effective_gross_income = gross_potential_rent - vacancy_loss + other_income_total`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| gross_potential_rent | Revenue basis |
| physical_vacancy_pct | Vacancy loss component |
| economic_vacancy_pct | Vacancy loss component |
| concessions_pct | Vacancy loss component |
| bad_debt_pct | Vacancy loss component |
| other_income_total | Added to EGI |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| current_rent | gross_potential_rent | effective_gross_income |
| unit_type_count | gross_potential_rent | effective_gross_income |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| physical_vacancy_pct | 5.0% | Medium — market-dependent |
| economic_vacancy_pct | 2.0% | Medium |
| concessions_pct | 1.0% | Low |
| bad_debt_pct | 1.0% | Low |
| other_income_total | $0 | Low |

**Validation:**
- Output range: must be positive
- Warning triggers: vacancy loss > 25%

---

### `total_operating_expenses` — Total Operating Expenses

**Formula:**
- Plain English: Sum of all operating expense line items and management fee.
- Notation: `total_operating_expenses = taxes + insurance + utilities + repairs + management + payroll + admin + marketing + other_op_ex`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| real_estate_taxes | OpEx line item |
| property_insurance | OpEx line item |
| utilities_total | OpEx line item |
| repairs_maintenance | OpEx line item |
| management_fee_pct | Applied to EGI |
| onsite_payroll | OpEx line item |
| offsite_payroll | OpEx line item |
| administrative | OpEx line item |
| marketing_advertising | OpEx line item |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| effective_gross_income | management_fee | total_operating_expenses |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| management_fee_pct | 3.0% | Medium |
| optional line items | $0 | Low |

**Validation:**
- Output range: must be positive
- Warning triggers: OpEx ratio outside 25%–65%

---

### `noi_year_1` — Year 1 NOI

**Formula:**
- Plain English: EGI minus total operating expenses.
- Notation: `noi_year_1 = effective_gross_income - total_operating_expenses`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| effective_gross_income | Revenue basis |
| total_operating_expenses | Expense total |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| gross_potential_rent | effective_gross_income | noi_year_1 |
| real_estate_taxes | total_operating_expenses | noi_year_1 |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| vacancy inputs | Defaults from kitchen-sink | Medium |
| management_fee_pct | 3.0% | Medium |

**Validation:**
- Output range: must be positive for stabilized assets
- Warning triggers: NOI margin outside 35%–70%

---

### `noi_stabilized` — Stabilized NOI

**Formula:**
- Plain English: NOI adjusted to stabilized rent and expense growth assumptions.
- Notation: `noi_stabilized = noi_year_1 × (1 + rent_growth_stabilized) - op_ex_growth_adjustment`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| noi_year_1 | Base NOI |
| rent_growth_stabilized | Growth assumption |
| opex_growth_rate | Expense growth assumption |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| effective_gross_income | noi_year_1 | noi_stabilized |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| rent_growth_stabilized | 2.5% | Medium |
| opex_growth_rate | 3.0% | Medium |

**Validation:**
- Output range: must be positive
- Warning triggers: stabilized NOI < year 1 NOI for growth assets

---

### `debt_service_annual` — Annual Debt Service

**Formula:**
- Plain English: Annualized mortgage payment for the loan.
- Notation: `debt_service_annual = PMT(interest_rate/12, amortization_years×12, loan_amount) × 12`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| loan_amount | Principal |
| interest_rate | Payment rate |
| amortization_years | Term for PMT |
| interest_only_years | IO adjustment |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| ltv_pct | loan_amount | debt_service_annual |
| purchase_price | loan_amount | debt_service_annual |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| ltv_pct | 65% | Medium |
| amortization_years | 30 | Medium |
| interest_only_years | 0 | Low |

**Validation:**
- Output range: must be positive
- Warning triggers: DSCR < 1.0

---

### `cash_flow_year_1` — Year 1 Cash Flow

**Formula:**
- Plain English: NOI minus debt service and capex reserves.
- Notation: `cash_flow_year_1 = noi_year_1 - debt_service_annual - capex_reserve_annual - immediate_repairs`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| noi_year_1 | Operating profit |
| debt_service_annual | Financing outflow |
| capex_reserve_per_unit | Reserve input |
| immediate_repairs | One-time year 1 cost |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| capex_reserve_per_unit | capex_reserve_annual | cash_flow_year_1 |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| capex_reserve_per_unit | $300/unit | Medium |
| immediate_repairs | $0 | Low |

**Validation:**
- Output range: may be negative for low leverage
- Warning triggers: cash flow < 0 for stabilized assets

---

### `cash_on_cash_year_1` — Year 1 Cash-on-Cash

**Formula:**
- Plain English: Year 1 cash flow divided by total equity.
- Notation: `cash_on_cash_year_1 = cash_flow_year_1 / total_equity`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| cash_flow_year_1 | Numerator |
| total_equity | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| purchase_price | total_equity | cash_on_cash_year_1 |
| loan_amount | total_equity | cash_on_cash_year_1 |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| closing_costs_pct | 1.50% | Low |
| due_diligence_costs | $25,000 | Low |

**Validation:**
- Output range: typically 0%–15%
- Warning triggers: cash-on-cash > 25% or < -5%

---

### `dscr_year_1` — Year 1 DSCR

**Formula:**
- Plain English: NOI divided by annual debt service.
- Notation: `dscr_year_1 = noi_year_1 / debt_service_annual`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| noi_year_1 | Numerator |
| debt_service_annual | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| loan_amount | debt_service_annual | dscr_year_1 |
| interest_rate | debt_service_annual | dscr_year_1 |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| amortization_years | 30 | Medium |

**Validation:**
- Output range: must be positive
- Warning triggers: DSCR < 1.10

---

### `price_per_unit` — Price per Unit

**Formula:**
- Plain English: Purchase price divided by unit count.
- Notation: `price_per_unit = purchase_price / unit_count`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| purchase_price | Numerator |
| unit_count | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| unit_count | per-unit metrics | price_per_unit |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| unit_count | None | High |

**Validation:**
- Output range: must be positive
- Warning triggers: price per unit out of market range

---

### `price_per_sf` — Price per SF

**Formula:**
- Plain English: Purchase price divided by rentable SF.
- Notation: `price_per_sf = purchase_price / rentable_sf`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| purchase_price | Numerator |
| rentable_sf | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| rentable_sf | per-sf metrics | price_per_sf |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| rentable_sf | None | High |

**Validation:**
- Output range: must be positive
- Warning triggers: price per SF out of market range

---

### `opex_per_unit` — OpEx per Unit

**Formula:**
- Plain English: Total operating expenses divided by unit count.
- Notation: `opex_per_unit = total_operating_expenses / unit_count`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| total_operating_expenses | Numerator |
| unit_count | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| real_estate_taxes | total_operating_expenses | opex_per_unit |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| unit_count | None | High |

**Validation:**
- Output range: must be positive
- Warning triggers: OpEx per unit outside market range

---

### `expense_ratio` — Expense Ratio

**Formula:**
- Plain English: Total operating expenses divided by EGI.
- Notation: `expense_ratio = total_operating_expenses / effective_gross_income`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| total_operating_expenses | Numerator |
| effective_gross_income | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| gross_potential_rent | effective_gross_income | expense_ratio |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| management_fee_pct | 3.0% | Medium |

**Validation:**
- Output range: typically 35%–55%
- Warning triggers: expense_ratio < 25% or > 70%

---

### `gross_sale_price` — Gross Sale Price

**Formula:**
- Plain English: Terminal NOI divided by exit cap rate.
- Notation: `gross_sale_price = terminal_noi / exit_cap_rate`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| terminal_noi | Numerator |
| exit_cap_rate | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| noi_year_1 | terminal_noi | gross_sale_price |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| exit_cap_rate | going-in + 25 bps | Medium |
| hold_period_years | 5 | Low |

**Validation:**
- Output range: must be positive
- Warning triggers: exit cap < 3% or > 12%

---

### `net_sale_proceeds` — Net Sale Proceeds

**Formula:**
- Plain English: Gross sale price minus disposition costs and loan payoff.
- Notation: `net_sale_proceeds = gross_sale_price - disposition_costs - loan_payoff - prepayment_penalty`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| gross_sale_price | Starting point |
| disposition_costs_pct | Sale cost deduction |
| broker_commission_pct | Sale cost deduction |
| loan_payoff | Debt payoff |
| prepayment_penalty | Penalty deduction |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| loan_amount | loan_payoff | net_sale_proceeds |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| disposition_costs_pct | 2.0% | Low |
| broker_commission_pct | 1.5% | Low |

**Validation:**
- Output range: must be positive for profitable exits
- Warning triggers: net sale proceeds < 0

---

### `levered_irr` — Levered IRR

**Formula:**
- Plain English: IRR of equity cash flows including net sale proceeds.
- Notation: `levered_irr = IRR([-total_equity, cash_flow_year_1..N, net_sale_proceeds])`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| cash_flow_year_1..N | Cash flow stream |
| net_sale_proceeds | Terminal inflow |
| total_equity | Initial outflow |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| noi_year_1 | cash_flow_year_1 | levered_irr |
| loan_amount | debt_service_annual | levered_irr |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| opex_growth_rate | 3.0% | Medium |
| rent_growth_stabilized | 2.5% | Medium |

**Validation:**
- Output range: typically 0%–25%
- Warning triggers: IRR > 30% or < 0%

---

### `unlevered_irr` — Unlevered IRR

**Formula:**
- Plain English: IRR of property cash flows before debt.
- Notation: `unlevered_irr = IRR([-purchase_price, noi_year_1..N, gross_sale_price])`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| noi_year_1..N | Operating cash flows |
| gross_sale_price | Terminal inflow |
| purchase_price | Initial outflow |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| gross_potential_rent | noi_year_1 | unlevered_irr |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| opex_growth_rate | 3.0% | Medium |
| rent_growth_stabilized | 2.5% | Medium |

**Validation:**
- Output range: typically 3%–15%
- Warning triggers: IRR < 0%

---

### `equity_multiple` — Equity Multiple

**Formula:**
- Plain English: Total equity distributions divided by total equity.
- Notation: `equity_multiple = total_distributions / total_equity`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| cash_flow_year_1..N | Distributions |
| net_sale_proceeds | Terminal distribution |
| total_equity | Denominator |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| noi_year_1 | cash_flow_year_1 | equity_multiple |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| opex_growth_rate | 3.0% | Medium |

**Validation:**
- Output range: typically 1.0x–2.5x
- Warning triggers: equity_multiple < 1.0x

---

### `total_equity` — Total Equity Required

**Formula:**
- Plain English: Total sources minus debt proceeds.
- Notation: `total_equity = purchase_price + closing_costs + total_loan_costs + immediate_repairs - loan_amount`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| purchase_price | Primary basis |
| closing_costs_pct | Acquisition costs |
| total_loan_costs | Financing costs |
| immediate_repairs | Up-front costs |
| loan_amount | Debt proceeds |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| ltv_pct | loan_amount | total_equity |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| closing_costs_pct | 1.50% | Low |
| total_loan_costs | Calculated | Low |

**Validation:**
- Output range: must be positive
- Warning triggers: equity < 0

---

### `loan_amount` — Loan Amount (Derived)

**Formula:**
- Plain English: Loan amount derived from LTV and purchase price when not provided.
- Notation: `loan_amount = purchase_price × ltv_pct`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| purchase_price | Base |
| ltv_pct | Multiplier |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| purchase_price | loan_amount | debt_service_annual |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| ltv_pct | 65% | Medium |

**Validation:**
- Output range: 0%–90% of purchase price
- Warning triggers: LTV > 80%

---

### `net_profit` — Net Profit

**Formula:**
- Plain English: Total distributions minus total equity invested.
- Notation: `net_profit = (SUM(cash_flow_year_1..N) + net_sale_proceeds) - total_equity`

**Direct Dependencies:**
| Field | Role in Calculation |
|-------|---------------------|
| cash_flow_year_1..N | Distributions |
| net_sale_proceeds | Terminal inflow |
| total_equity | Initial outflow |

**Cascade Dependencies:**
| Field | Feeds Into | Which Then Feeds This Output |
|-------|------------|------------------------------|
| noi_year_1 | cash_flow_year_1 | net_profit |

**Default Behavior:**
| Missing Input | Default Applied | Impact on Output Reliability |
|---------------|-----------------|------------------------------|
| opex_growth_rate | 3.0% | Medium |

**Validation:**
- Output range: can be negative
- Warning triggers: net_profit < 0 for stabilized assets

---

## SECTION 2: FIELD-BY-FIELD INPUT DOCUMENTATION

### `property_name` — Property Name

**Classification:**
- Category: Property ID
- Data Type: text
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `property_address` — Street Address

**Classification:**
- Category: Property ID
- Data Type: text
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `city` — City

**Classification:**
- Category: Property ID
- Data Type: text
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `state` — State

**Classification:**
- Category: Property ID
- Data Type: text
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `zip_code` — ZIP Code

**Classification:**
- Category: Property ID
- Data Type: text
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `county` — County

**Classification:**
- Category: Property ID
- Data Type: text
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Lookup
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `unit_count` — Total Units

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `rentable_sf` — Rentable SF

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calc from units
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `year_built` — Year Built

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `year_renovated` — Year Renovated

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `lot_size_acres` — Lot Size (Acres)

**Classification:**
- Category: Property ID
- Data Type: decimal
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `building_count` — Number of Buildings

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 1
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `stories` — Stories

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `parking_spaces` — Parking Spaces

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: units × 1.5
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `purchase_price` — Purchase Price

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| debt_service_annual | Cascade |
| cash_on_cash_year_1 | Cascade |
| going_in_cap_rate | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |
| equity_multiple | Cascade |
| going_in_cap_rate | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `acquisition_date` — Acquisition Date

**Classification:**
- Category: Property ID
- Data Type: date
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Today + 60
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: Valid date
- Format: YYYY-MM-DD
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `price_per_unit` — Price per Unit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `price_per_sf` — Price per SF

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `going_in_cap_rate` — Going-In Cap Rate

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `closing_costs_pct` — Closing Costs %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |
| equity_multiple | Cascade |

**Default Value:**
- Value: 1.50%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `due_diligence_costs` — Due Diligence Costs

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Cascade |

**Default Value:**
- Value: $25,000
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `legal_fees` — Legal Fees

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Cascade |

**Default Value:**
- Value: $35,000
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `title_insurance` — Title Insurance

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Cascade |

**Default Value:**
- Value: 0.25% of price
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `earnest_money` — Earnest Money

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 2% of price
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `unit_type_name` — Unit Type

**Classification:**
- Category: Property ID
- Data Type: text
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `unit_type_count` — Unit Count

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_potential_rent | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `unit_type_sf` — Avg SF

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `bedrooms` — Bedrooms

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `bathrooms` — Bathrooms

**Classification:**
- Category: Property ID
- Data Type: decimal
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `current_rent` — Current Rent

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_potential_rent | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `market_rent` — Market Rent

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `rent_per_sf` — Rent/SF

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `gross_potential_rent` — Gross Potential Rent

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |
| noi_year_1 | Direct |
| cash_flow_year_1 | Direct |
| cash_on_cash_year_1 | Direct |
| dscr_year_1 | Direct |
| levered_irr | Direct |
| unlevered_irr | Direct |
| equity_multiple | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `in_place_rent_annual` — In-Place Rent (Annual)

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_potential_rent | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `market_rent_annual` — Market Rent (Annual)

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `loss_to_lease_pct` — Loss to Lease %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `loss_to_lease_amount` — Loss to Lease $

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `avg_rent_per_unit` — Avg Rent/Unit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `avg_rent_per_sf` — Avg Rent/SF

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `avg_unit_sf` — Avg Unit SF

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `weighted_avg_lease_term` — WALT (months)

**Classification:**
- Category: Property ID
- Data Type: decimal
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `lease_expiration_schedule` — Lease Expirations (JSON)

**Classification:**
- Category: Property ID
- Data Type: json
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `physical_vacancy_pct` — Physical Vacancy

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Cascade |
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| effective_gross_income | Direct |

**Default Value:**
- Value: 5.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `economic_vacancy_pct` — Economic Vacancy

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Cascade |
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| effective_gross_income | Direct |

**Default Value:**
- Value: 2.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `total_vacancy_pct` — Total Vacancy

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `concessions_pct` — Concessions

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Cascade |
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| effective_gross_income | Direct |

**Default Value:**
- Value: 1.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `bad_debt_pct` — Bad Debt/Credit Loss

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Cascade |
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| effective_gross_income | Direct |

**Default Value:**
- Value: 1.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `model_unit_count` — Model Units

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 0
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `other_income_total` — Total Other Income

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| effective_gross_income | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `parking_income` — Parking Income

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: $50/space/mo
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `laundry_income` — Laundry/Vending

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: $15/unit/mo
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `pet_income` — Pet Fees/Rent

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `storage_income` — Storage Income

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `utility_reimbursement` — Utility Reimbursements

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `late_fees` — Late Fees

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `application_fees` — Application Fees

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `cable_telecom` — Cable/Telecom

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `commercial_income` — Commercial/Retail Income

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `amenity_fees` — Amenity Fees

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `misc_income` — Miscellaneous Income

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| effective_gross_income | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `rent_growth_year_1` — Rent Growth Year 1

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 3.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `rent_growth_year_2` — Rent Growth Year 2

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 3.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `rent_growth_year_3` — Rent Growth Year 3

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 3.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `rent_growth_stabilized` — Stabilized Rent Growth

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_sale_price | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |

**Default Value:**
- Value: 2.5%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `other_income_growth` — Other Income Growth

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_sale_price | Cascade |
| levered_irr | Cascade |

**Default Value:**
- Value: 2.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `mark_to_market_year` — Mark-to-Market Year

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 1
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `real_estate_taxes` — Real Estate Taxes

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| cash_on_cash_year_1 | Cascade |
| dscr_year_1 | Cascade |
| going_in_cap_rate | Cascade |
| gross_sale_price | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |
| equity_multiple | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `tax_rate_pct` — Tax Rate %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `assessed_value` — Assessed Value

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `tax_reassessment_year` — Reassessment Year

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Acq year + 1
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `property_insurance` — Property Insurance

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| cash_on_cash_year_1 | Cascade |
| dscr_year_1 | Cascade |
| going_in_cap_rate | Cascade |
| gross_sale_price | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |
| equity_multiple | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `insurance_per_unit` — Insurance/Unit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `flood_insurance` — Flood Insurance

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `earthquake_insurance` — Earthquake Insurance

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `utilities_total` — Total Utilities

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| cash_on_cash_year_1 | Cascade |
| dscr_year_1 | Cascade |
| going_in_cap_rate | Cascade |
| gross_sale_price | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |
| equity_multiple | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `water_sewer` — Water/Sewer

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `trash_removal` — Trash Removal

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `electricity` — Electricity

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `gas` — Gas

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `common_area_electric` — Common Area Electric

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `utility_billing_rubs` — RUBS Recovery

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `utility_recovery_pct` — Utility Recovery %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `repairs_maintenance` — Repairs & Maintenance

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| cash_on_cash_year_1 | Cascade |
| dscr_year_1 | Cascade |
| going_in_cap_rate | Cascade |
| gross_sale_price | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |
| equity_multiple | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Block calculation
- Warning: Yes

### `rm_per_unit` — R&M per Unit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $1,200/unit
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `unit_turnover_cost` — Unit Turnover Cost

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $1,500/turn
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `turnover_rate_pct` — Annual Turnover Rate

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 40%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `contract_services` — Contract Services

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `elevator_maintenance` — Elevator Maintenance

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `landscaping` — Landscaping

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `pest_control` — Pest Control

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `pool_spa` — Pool/Spa Service

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `snow_removal` — Snow Removal

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `security` — Security Services

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `parking_lot_maintenance` — Parking Lot Maint

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `management_fee_pct` — Management Fee %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| cash_flow_year_1 | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: 3.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `management_fee` — Management Fee $

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `onsite_payroll` — On-Site Payroll

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `offsite_payroll` — Off-Site Payroll

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `payroll_taxes_benefits` — Payroll Taxes/Benefits

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 25% of payroll
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `administrative` — Administrative/G&A

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `professional_fees` — Professional Fees

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `marketing_advertising` — Marketing/Advertising

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Cascade |
| noi_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `total_operating_expenses` — Total OpEx

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| noi_year_1 | Direct |
| cash_flow_year_1 | Direct |
| cash_on_cash_year_1 | Direct |
| dscr_year_1 | Direct |
| levered_irr | Direct |
| unlevered_irr | Direct |
| equity_multiple | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `opex_per_unit` — OpEx per Unit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: High
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `opex_per_sf` — OpEx per SF

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `expense_ratio` — Expense Ratio (% EGI)

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `opex_growth_rate` — OpEx Growth Rate

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_sale_price | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |

**Default Value:**
- Value: 3.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `controllable_expenses` — Controllable Expenses

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `capex_reserve_per_unit` — CapEx Reserve/Unit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_flow_year_1 | Direct |

**Default Value:**
- Value: $300/unit
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `capex_reserve_annual` — CapEx Reserve Annual

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `immediate_repairs` — Immediate Repairs (Y1)

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Cascade |
| cash_flow_year_1 | Direct |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `roof_reserve` — Roof Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `hvac_reserve` — HVAC Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `appliance_reserve` — Appliance Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `flooring_reserve` — Flooring Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `exterior_reserve` — Exterior/Paint Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `parking_reserve` — Parking Lot Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `unit_renovation_budget` — Unit Renovation Budget

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `loan_amount` — Loan Amount

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| debt_service_annual | Direct |

**Default Value:**
- Value: LTV × Price
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `ltv_pct` — Loan-to-Value

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| debt_service_annual | Cascade |

**Default Value:**
- Value: 65%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `interest_rate` — Interest Rate

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| debt_service_annual | Cascade |
| cash_flow_year_1 | Cascade |
| cash_on_cash_year_1 | Cascade |
| dscr_year_1 | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| equity_multiple | Cascade |
| debt_service_annual | Direct |

**Default Value:**
- Value: Market
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `rate_type` — Rate Type

**Classification:**
- Category: Property ID
- Data Type: text
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Fixed
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `amortization_years` — Amortization

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| debt_service_annual | Cascade |
| cash_flow_year_1 | Cascade |
| dscr_year_1 | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| debt_service_annual | Direct |

**Default Value:**
- Value: 30
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `loan_term_years` — Loan Term

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 10
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `interest_only_years` — I/O Period

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| debt_service_annual | Cascade |
| debt_service_annual | Direct |

**Default Value:**
- Value: 0
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `dscr_minimum` — Minimum DSCR

**Classification:**
- Category: Property ID
- Data Type: decimal
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 1.25x
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `debt_yield_min` — Minimum Debt Yield

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 8%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `lender_name` — Lender

**Classification:**
- Category: Property ID
- Data Type: text
- Required: No
- Defaultable: No
- Extractable: Medium
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `origination_fee_pct` — Origination Fee %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 1.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `origination_fee` — Origination Fee $

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: Low
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `lender_legal` — Lender Legal

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $15,000
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `appraisal_cost` — Appraisal

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $5,000
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `environmental_cost` — Environmental Report

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $3,500
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `pca_cost` — PCA Report

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $4,000
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `rate_lock_deposit` — Rate Lock Deposit

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `total_loan_costs` — Total Loan Costs

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Cascade |
| levered_irr | Cascade |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `tax_escrow_months` — Tax Escrow (months)

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 6
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `insurance_escrow_months` — Insurance Escrow (months)

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 3
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `replacement_reserve` — Replacement Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: $250/unit
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `operating_reserve` — Operating Reserve

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 0
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `capex_reserve_required` — CapEx Reserve Req'd

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: None
- Source: None
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Zero-fill
- Warning: No

### `prepayment_type` — Prepayment Penalty Type

**Classification:**
- Category: Property ID
- Data Type: text
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| net_sale_proceeds | Cascade |

**Default Value:**
- Value: Yield Maint
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `prepayment_lockout` — Lockout Period

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| net_sale_proceeds | Cascade |

**Default Value:**
- Value: 2 years
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `defeasance_permitted` — Defeasance Permitted

**Classification:**
- Category: Property ID
- Data Type: boolean
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Yes
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `extension_options` — Extension Options

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 0
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `extension_fee_bps` — Extension Fee (bps)

**Classification:**
- Category: Property ID
- Data Type: integer
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 25
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: Whole number
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `total_equity` — Total Equity Required

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_on_cash_year_1 | Direct |
| levered_irr | Direct |
| unlevered_irr | Direct |
| equity_multiple | Direct |
| net_profit | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `lp_equity_pct` — LP Equity %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 90%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `gp_equity_pct` — GP Equity %

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 10%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `gp_coinvest_amount` — GP Co-Invest $

**Classification:**
- Category: Property ID
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: ✗ Low
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `preferred_return_pct` — Preferred Return

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 8.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `pref_compounding` — Pref Compounding

**Classification:**
- Category: Property ID
- Data Type: text
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Simple
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `distribution_frequency` — Distribution Frequency

**Classification:**
- Category: Property ID
- Data Type: text
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Quarterly
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: N/A
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_1_hurdle` — Tier 1 Hurdle (Pref)

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 8.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_1_lp_split` — Tier 1 LP Split

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 100%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_1_gp_split` — Tier 1 GP Split

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_2_hurdle` — Tier 2 Hurdle (IRR)

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 12%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_2_lp_split` — Tier 2 LP Split

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 80%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_2_gp_split` — Tier 2 GP Split

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 20%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_3_lp_split` — Tier 3 LP Split

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 70%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `tier_3_gp_split` — Tier 3 GP Split

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 30%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `acquisition_fee_pct` — Acquisition Fee

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 1.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `asset_mgmt_fee_pct` — Asset Mgmt Fee

**Classification:**
- Category: Property ID
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: 1.5%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `hold_period_years` — Hold Period

**Classification:**
- Category: Disposition
- Data Type: decimal
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_sale_price | Cascade |
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| unlevered_irr | Cascade |

**Default Value:**
- Value: 5
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `exit_cap_rate` — Exit Cap Rate

**Classification:**
- Category: Disposition
- Data Type: percent
- Required: Yes
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| gross_sale_price | Cascade |
| net_sale_proceeds | Cascade |
| unlevered_irr | Cascade |

**Default Value:**
- Value: Going-in + 25bps
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `terminal_noi` — Terminal Year NOI

**Classification:**
- Category: Disposition
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `gross_sale_price` — Gross Sale Price

**Classification:**
- Category: Disposition
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| net_sale_proceeds | Direct |
| levered_irr | Direct |
| unlevered_irr | Direct |
| equity_multiple | Direct |
| net_profit | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `disposition_costs_pct` — Disposition Costs %

**Classification:**
- Category: Disposition
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| net_sale_proceeds | Cascade |
| levered_irr | Cascade |
| equity_multiple | Cascade |

**Default Value:**
- Value: 2.0%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `broker_commission_pct` — Broker Commission

**Classification:**
- Category: Disposition
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| net_sale_proceeds | Cascade |

**Default Value:**
- Value: 1.5%
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `transfer_tax_pct` — Transfer Tax

**Classification:**
- Category: Disposition
- Data Type: percent
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: ✗ Low
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| net_sale_proceeds | Cascade |

**Default Value:**
- Value: Varies
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `net_sale_proceeds` — Net Sale Proceeds

**Classification:**
- Category: Disposition
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| levered_irr | Direct |
| equity_multiple | Direct |
| net_profit | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `loan_payoff` — Loan Payoff at Sale

**Classification:**
- Category: Disposition
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `prepayment_penalty` — Prepayment Penalty

**Classification:**
- Category: Disposition
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `equity_proceeds` — Equity Proceeds

**Classification:**
- Category: Disposition
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `sale_date` — Projected Sale Date

**Classification:**
- Category: Disposition
- Data Type: date
- Required: No
- Defaultable: Yes — Kitchen-sink default
- Extractable: —
- Calculated Field: No

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Acq + Hold
- Source: Kitchen-sink default
- Conditions: Applied if null

**Validation Rules:**
- Range: Valid date
- Format: YYYY-MM-DD
- Cross-field: N/A

**Null Handling:**
- Behavior: Apply default
- Warning: No

### `noi_year_1` — Year 1 NOI

**Classification:**
- Category: Equity
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| cash_flow_year_1 | Direct |
| cash_on_cash_year_1 | Direct |
| dscr_year_1 | Direct |
| going_in_cap_rate | Direct |
| gross_sale_price | Direct |
| net_sale_proceeds | Direct |
| levered_irr | Direct |
| unlevered_irr | Direct |
| equity_multiple | Direct |
| net_profit | Direct |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `noi_stabilized` — Stabilized NOI

**Classification:**
- Category: Equity
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `cash_on_cash_year_1` — Y1 Cash-on-Cash

**Classification:**
- Category: Equity
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `dscr_year_1` — Year 1 DSCR

**Classification:**
- Category: Equity
- Data Type: decimal
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `levered_irr` — Levered IRR

**Classification:**
- Category: Equity
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `unlevered_irr` — Unlevered IRR

**Classification:**
- Category: Equity
- Data Type: percent
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: 0% to 100%
- Format: Percent
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `equity_multiple` — Equity Multiple

**Classification:**
- Category: Equity
- Data Type: decimal
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No

### `net_profit` — Net Profit

**Classification:**
- Category: Equity
- Data Type: currency
- Required: No
- Defaultable: No
- Extractable: —
- Calculated Field: Yes

**Affects Outputs:**
| Output Field | Dependency Type |
|--------------|-----------------|
| None | — |

**Default Value:**
- Value: Calculated
- Source: Calculated from other fields
- Conditions: Applied if null

**Validation Rules:**
- Range: >= 0
- Format: N/A
- Cross-field: N/A

**Null Handling:**
- Behavior: Calculated from other fields
- Warning: No
---

## SECTION 3: DEPENDENCY MATRIX

| Input Field | GPR | EGI | NOI | DS | CF | CoC | DSCR | Cap | IRR | EM |
|-------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| property_name |  |  |  |  |  |  |  |  |  |  |
| property_address |  |  |  |  |  |  |  |  |  |  |
| city |  |  |  |  |  |  |  |  |  |  |
| state |  |  |  |  |  |  |  |  |  |  |
| zip_code |  |  |  |  |  |  |  |  |  |  |
| county |  |  |  |  |  |  |  |  |  |  |
| unit_count |  |  |  |  |  |  |  |  |  |  |
| rentable_sf |  |  |  |  |  |  |  |  |  |  |
| year_built |  |  |  |  |  |  |  |  |  |  |
| year_renovated |  |  |  |  |  |  |  |  |  |  |
| lot_size_acres |  |  |  |  |  |  |  |  |  |  |
| building_count |  |  |  |  |  |  |  |  |  |  |
| stories |  |  |  |  |  |  |  |  |  |  |
| parking_spaces |  |  |  |  |  |  |  |  |  |  |
| purchase_price |  |  |  | ○ |  | ○ |  | ● | ○ | ○ |
| acquisition_date |  |  |  |  |  |  |  |  |  |  |
| closing_costs_pct |  |  |  |  |  | ○ |  |  | ○ | ○ |
| due_diligence_costs |  |  |  |  |  | ○ |  |  |  |  |
| legal_fees |  |  |  |  |  | ○ |  |  |  |  |
| title_insurance |  |  |  |  |  | ○ |  |  |  |  |
| earnest_money |  |  |  |  |  |  |  |  |  |  |
| unit_type_name |  |  |  |  |  |  |  |  |  |  |
| unit_type_count | ● |  |  |  |  |  |  |  |  |  |
| unit_type_sf |  |  |  |  |  |  |  |  |  |  |
| bedrooms |  |  |  |  |  |  |  |  |  |  |
| bathrooms |  |  |  |  |  |  |  |  |  |  |
| current_rent | ● |  |  |  |  |  |  |  |  |  |
| market_rent |  |  |  |  |  |  |  |  |  |  |
| in_place_rent_annual | ● |  |  |  |  |  |  |  |  |  |
| market_rent_annual |  |  |  |  |  |  |  |  |  |  |
| weighted_avg_lease_term |  |  |  |  |  |  |  |  |  |  |
| lease_expiration_schedule |  |  |  |  |  |  |  |  |  |  |
| physical_vacancy_pct |  | ● | ○ |  | ○ |  |  |  |  |  |
| economic_vacancy_pct |  | ● | ○ |  | ○ |  |  |  |  |  |
| concessions_pct |  | ● | ○ |  | ○ |  |  |  |  |  |
| bad_debt_pct |  | ● | ○ |  | ○ |  |  |  |  |  |
| model_unit_count |  |  |  |  |  |  |  |  |  |  |
| parking_income |  | ● |  |  |  |  |  |  |  |  |
| laundry_income |  | ● |  |  |  |  |  |  |  |  |
| pet_income |  | ● |  |  |  |  |  |  |  |  |
| storage_income |  | ● |  |  |  |  |  |  |  |  |
| utility_reimbursement |  | ● |  |  |  |  |  |  |  |  |
| late_fees |  | ● |  |  |  |  |  |  |  |  |
| application_fees |  | ● |  |  |  |  |  |  |  |  |
| cable_telecom |  | ● |  |  |  |  |  |  |  |  |
| commercial_income |  | ● |  |  |  |  |  |  |  |  |
| amenity_fees |  | ● |  |  |  |  |  |  |  |  |
| misc_income |  | ● |  |  |  |  |  |  |  |  |
| rent_growth_year_1 |  |  |  |  |  |  |  |  |  |  |
| rent_growth_year_2 |  |  |  |  |  |  |  |  |  |  |
| rent_growth_year_3 |  |  |  |  |  |  |  |  |  |  |
| rent_growth_stabilized |  |  |  |  |  |  |  |  | ○ |  |
| other_income_growth |  |  |  |  |  |  |  |  | ○ |  |
| mark_to_market_year |  |  |  |  |  |  |  |  |  |  |
| real_estate_taxes |  |  | ● |  | ○ | ○ | ○ | ○ | ○ | ○ |
| tax_rate_pct |  |  |  |  |  |  |  |  |  |  |
| assessed_value |  |  |  |  |  |  |  |  |  |  |
| tax_reassessment_year |  |  |  |  |  |  |  |  |  |  |
| property_insurance |  |  | ● |  | ○ | ○ | ○ | ○ | ○ | ○ |
| flood_insurance |  |  |  |  |  |  |  |  |  |  |
| earthquake_insurance |  |  |  |  |  |  |  |  |  |  |
| utilities_total |  |  | ● |  | ○ | ○ | ○ | ○ | ○ | ○ |
| water_sewer |  |  |  |  |  |  |  |  |  |  |
| trash_removal |  |  |  |  |  |  |  |  |  |  |
| electricity |  |  |  |  |  |  |  |  |  |  |
| gas |  |  |  |  |  |  |  |  |  |  |
| common_area_electric |  |  |  |  |  |  |  |  |  |  |
| utility_billing_rubs |  |  |  |  |  |  |  |  |  |  |
| utility_recovery_pct |  |  |  |  |  |  |  |  |  |  |
| repairs_maintenance |  |  | ● |  | ○ | ○ | ○ | ○ | ○ | ○ |
| rm_per_unit |  |  |  |  |  |  |  |  |  |  |
| unit_turnover_cost |  |  |  |  |  |  |  |  |  |  |
| turnover_rate_pct |  |  |  |  |  |  |  |  |  |  |
| contract_services |  |  | ● |  |  |  |  |  |  |  |
| elevator_maintenance |  |  |  |  |  |  |  |  |  |  |
| landscaping |  |  | ● |  |  |  |  |  |  |  |
| pest_control |  |  | ● |  |  |  |  |  |  |  |
| pool_spa |  |  | ● |  |  |  |  |  |  |  |
| snow_removal |  |  | ● |  |  |  |  |  |  |  |
| security |  |  | ● |  |  |  |  |  |  |  |
| parking_lot_maintenance |  |  | ● |  |  |  |  |  |  |  |
| management_fee_pct |  |  | ● |  | ○ |  |  |  |  |  |
| onsite_payroll |  |  | ● |  |  |  |  |  |  |  |
| offsite_payroll |  |  | ● |  |  |  |  |  |  |  |
| payroll_taxes_benefits |  |  |  |  |  |  |  |  |  |  |
| administrative |  |  | ● |  |  |  |  |  |  |  |
| professional_fees |  |  | ● |  |  |  |  |  |  |  |
| marketing_advertising |  |  | ● |  |  |  |  |  |  |  |
| opex_growth_rate |  |  |  |  |  |  |  |  | ○ |  |
| capex_reserve_per_unit |  |  |  |  | ● |  |  |  |  |  |
| immediate_repairs |  |  |  |  | ● | ○ |  |  |  |  |
| roof_reserve |  |  |  |  |  |  |  |  |  |  |
| hvac_reserve |  |  |  |  |  |  |  |  |  |  |
| appliance_reserve |  |  |  |  |  |  |  |  |  |  |
| flooring_reserve |  |  |  |  |  |  |  |  |  |  |
| exterior_reserve |  |  |  |  |  |  |  |  |  |  |
| parking_reserve |  |  |  |  |  |  |  |  |  |  |
| unit_renovation_budget |  |  |  |  |  |  |  |  |  |  |
| loan_amount |  |  |  | ● |  |  |  |  |  |  |
| ltv_pct |  |  |  | ○ |  |  |  |  |  |  |
| interest_rate |  |  |  | ● | ○ | ○ | ○ |  | ○ | ○ |
| rate_type |  |  |  |  |  |  |  |  |  |  |
| amortization_years |  |  |  | ● | ○ |  | ○ |  | ○ |  |
| loan_term_years |  |  |  |  |  |  |  |  |  |  |
| interest_only_years |  |  |  | ● |  |  |  |  |  |  |
| dscr_minimum |  |  |  |  |  |  |  |  |  |  |
| debt_yield_min |  |  |  |  |  |  |  |  |  |  |
| lender_name |  |  |  |  |  |  |  |  |  |  |
| origination_fee_pct |  |  |  |  |  |  |  |  |  |  |
| lender_legal |  |  |  |  |  |  |  |  |  |  |
| appraisal_cost |  |  |  |  |  |  |  |  |  |  |
| environmental_cost |  |  |  |  |  |  |  |  |  |  |
| pca_cost |  |  |  |  |  |  |  |  |  |  |
| rate_lock_deposit |  |  |  |  |  |  |  |  |  |  |
| tax_escrow_months |  |  |  |  |  |  |  |  |  |  |
| insurance_escrow_months |  |  |  |  |  |  |  |  |  |  |
| replacement_reserve |  |  |  |  |  |  |  |  |  |  |
| operating_reserve |  |  |  |  |  |  |  |  |  |  |
| capex_reserve_required |  |  |  |  |  |  |  |  |  |  |
| prepayment_type |  |  |  |  |  |  |  |  |  |  |
| prepayment_lockout |  |  |  |  |  |  |  |  |  |  |
| defeasance_permitted |  |  |  |  |  |  |  |  |  |  |
| extension_options |  |  |  |  |  |  |  |  |  |  |
| extension_fee_bps |  |  |  |  |  |  |  |  |  |  |
| lp_equity_pct |  |  |  |  |  |  |  |  |  |  |
| gp_equity_pct |  |  |  |  |  |  |  |  |  |  |
| preferred_return_pct |  |  |  |  |  |  |  |  |  |  |
| pref_compounding |  |  |  |  |  |  |  |  |  |  |
| distribution_frequency |  |  |  |  |  |  |  |  |  |  |
| tier_1_hurdle |  |  |  |  |  |  |  |  |  |  |
| tier_1_lp_split |  |  |  |  |  |  |  |  |  |  |
| tier_1_gp_split |  |  |  |  |  |  |  |  |  |  |
| tier_2_hurdle |  |  |  |  |  |  |  |  |  |  |
| tier_2_lp_split |  |  |  |  |  |  |  |  |  |  |
| tier_2_gp_split |  |  |  |  |  |  |  |  |  |  |
| tier_3_lp_split |  |  |  |  |  |  |  |  |  |  |
| tier_3_gp_split |  |  |  |  |  |  |  |  |  |  |
| acquisition_fee_pct |  |  |  |  |  |  |  |  |  |  |
| asset_mgmt_fee_pct |  |  |  |  |  |  |  |  |  |  |
| hold_period_years |  |  |  |  |  |  |  |  | ○ |  |
| exit_cap_rate |  |  |  |  |  |  |  |  |  |  |
| disposition_costs_pct |  |  |  |  |  |  |  |  | ○ | ○ |
| broker_commission_pct |  |  |  |  |  |  |  |  |  |  |
| transfer_tax_pct |  |  |  |  |  |  |  |  |  |  |
| sale_date |  |  |  |  |  |  |  |  |  |  |

---

## SECTION 4: MINIMUM VIABLE FIELD SET

### MVP Field Set

**Purpose:** The minimum fields required to produce all calculated outputs without errors. Fields not in this list can be defaulted or omitted without breaking calculations.

**Required Fields (No Defaults Allowed):**
| # | Field Name | Why Required |
|---|------------|--------------|
| 1 | purchase_price | Basis for equity, cap rate, per-unit metrics |
| 2 | unit_count | Required for per-unit metrics and GPR rollup |
| 3 | in_place_rent_annual | Core revenue driver for GPR/EGI/NOI |
| 4 | real_estate_taxes | Required OpEx component |
| 5 | property_insurance | Required OpEx component |
| 6 | utilities_total | Required OpEx component |
| 7 | repairs_maintenance | Required OpEx component |
| 8 | loan_amount | Debt sizing for debt service and levered cash flow |
| 9 | interest_rate | Debt service calculation |

**Defaultable Fields (Needed for Calcs, But Have Sensible Defaults):**
| # | Field Name | Default Value | Default Source |
|---|------------|---------------|----------------|
| 1 | physical_vacancy_pct | 5.0% | Kitchen-sink default |
| 2 | economic_vacancy_pct | 2.0% | Kitchen-sink default |
| 3 | concessions_pct | 1.0% | Kitchen-sink default |
| 4 | bad_debt_pct | 1.0% | Kitchen-sink default |
| 5 | management_fee_pct | 3.0% | Kitchen-sink default |
| 6 | capex_reserve_per_unit | $300/unit | Kitchen-sink default |
| 7 | hold_period_years | 5 | Kitchen-sink default |
| 8 | exit_cap_rate | going-in + 25 bps | Kitchen-sink default |
| 9 | amortization_years | 30 | Kitchen-sink default |

**Optional Fields (Enhance Analysis But Not Required):**
| # | Field Name | What It Adds |
|---|------------|--------------|
| 1 | year_renovated | CapEx forecasting accuracy |
| 2 | lease_expiration_schedule | Lease risk visibility |
| 3 | unit_renovation_budget | Renovation ROI modeling |


---

## SECTION 5: CROSS-FIELD VALIDATION RULES

### Rule: `loan_amount_ltv_consistency`
**Fields:** loan_amount, ltv_pct, purchase_price
**Logic:** If loan_amount provided, ltv_pct = loan_amount / purchase_price. If ltv_pct provided without loan_amount, loan_amount = ltv_pct × purchase_price.
**Conflict:** If both provided and don't match within 1% tolerance, flag warning.

### Rule: `unit_mix_total_validation`
**Fields:** unit_count, unit_type_count (array)
**Logic:** Sum of unit_type_count must equal unit_count.
**Conflict:** Block calculation if mismatch > 0.

### Rule: `vacancy_ceiling`
**Fields:** physical_vacancy_pct, economic_vacancy_pct, concessions_pct, bad_debt_pct
**Logic:** Total vacancy should not exceed 25%.
**Conflict:** Warning if > 25%; block if > 50%.

### Rule: `expense_ratio_sanity`
**Fields:** total_operating_expenses, effective_gross_income
**Logic:** expense_ratio typically 35%–55% for multifamily.
**Conflict:** Warning if outside range.

### Rule: `dscr_minimum`
**Fields:** dscr_year_1, dscr_minimum
**Logic:** dscr_year_1 should meet or exceed dscr_minimum (typically 1.20–1.25).
**Conflict:** Warning if below threshold.

### Rule: `equity_split_consistency`
**Fields:** lp_equity_pct, gp_equity_pct
**Logic:** LP + GP equity percentages should equal 100%.
**Conflict:** Warning if not within 0.5%.


---

## SECTION 6: CALCULATION SEQUENCE

### Calculation Order

1. **Property Metrics**
   - price_per_unit = purchase_price / unit_count
   - price_per_sf = purchase_price / rentable_sf

2. **Revenue Buildup**
   - gross_potential_rent = Σ(unit_type_count × current_rent × 12) OR in_place_rent_annual
   - total_vacancy_loss = GPR × (physical_vacancy_pct + economic_vacancy_pct + concessions_pct + bad_debt_pct)
   - effective_gross_income = GPR - total_vacancy_loss + other_income_total

3. **Expense Buildup**
   - management_fee = EGI × management_fee_pct (if pct provided) OR management_fee (if $ provided)
   - total_operating_expenses = real_estate_taxes + property_insurance + utilities_total + repairs_maintenance + onsite_payroll + offsite_payroll + management_fee + administrative + marketing_advertising + contract_services + professional_fees + other_expense_lines

4. **NOI**
   - noi_year_1 = effective_gross_income - total_operating_expenses

5. **Debt Service**
   - loan_amount = purchase_price × ltv_pct (if not directly provided)
   - debt_service_annual = PMT(interest_rate/12, amortization_years×12, loan_amount) × 12
   - Adjust for interest_only_years if applicable

6. **Cash Flow**
   - cash_flow_year_1 = noi_year_1 - debt_service_annual - capex_reserve_annual - immediate_repairs

7. **Equity & Returns**
   - total_equity = purchase_price + closing_costs + loan_costs + immediate_repairs - loan_amount
   - cash_on_cash_year_1 = cash_flow_year_1 / total_equity
   - dscr_year_1 = noi_year_1 / debt_service_annual
   - going_in_cap_rate = noi_year_1 / purchase_price

8. **Projection Loop (Years 2-N)**
   - Apply rent_growth_year_N to rental income
   - Apply other_income_growth to other income
   - Apply opex_growth_rate to operating expenses
   - Recalculate NOI, cash flow for each year
   - Track loan balance amortization

9. **Disposition**
   - terminal_noi = noi_year_N × (1 + rent_growth_stabilized)
   - gross_sale_price = terminal_noi / exit_cap_rate
   - net_sale_proceeds = gross_sale_price × (1 - disposition_costs_pct) - loan_payoff - prepayment_penalty

10. **IRR Calculation**
    - unlevered_irr = IRR([-purchase_price - closing_costs], [noi_year_1], ..., [noi_year_N + gross_sale_price])
    - levered_irr = IRR([-total_equity], [cash_flow_year_1], ..., [cash_flow_year_N + net_sale_proceeds])
    - equity_multiple = (Σ cash_flows + net_sale_proceeds) / total_equity

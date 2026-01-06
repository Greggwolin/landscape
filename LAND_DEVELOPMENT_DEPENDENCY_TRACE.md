## LAND_DEVELOPMENT Dependency Trace

### Output: `total_development_cost`

**Direct Dependencies:**
- Land acquisition costs
- Soft costs
- Offsite costs
- Onsite costs
- Impact fees
- Contingency

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total OR (soft_entitlement + soft_planning_fees + soft_environmental + soft_engineering + soft_civil_engineering + soft_surveying + soft_geotechnical + soft_legal + soft_accounting + soft_insurance + soft_marketing) | Yes | No | — |
| offsite_total OR (offsite_roads + offsite_water_main + offsite_sewer_main + offsite_storm_drain + offsite_electric + offsite_gas + offsite_telecom + offsite_traffic_signals + offsite_other) | Yes | No | — |
| onsite_total OR (onsite_grading + onsite_erosion_control + onsite_roads + onsite_curb_gutter + onsite_sidewalks + onsite_water_distribution + onsite_sewer_collection + onsite_storm_drain + onsite_dry_utilities + onsite_street_lights + onsite_landscaping + onsite_irrigation + onsite_signage + onsite_amenities) | Yes | No | — |
| fees_impact_total OR (fees_school + fees_park + fees_traffic + fees_utility_capacity + fees_permit_building) | No | Yes | Defaults/zero |
| contingency_pct OR (contingency_hard + contingency_soft) | No | Yes | Default 5-10% |

**Minimum Input Count:** 4 fields

---

### Output: `cost_per_lot`

**Direct Dependencies:**
- `total_development_cost`
- `total_units_planned` (or total lots)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |
| total_units_planned OR (parcel_lot_count sum) | Yes | No | — |

**OR Conditions:** `total_units_planned` OR sum of parcel/phase lot counts.

**Minimum Input Count:** 5 fields

---

### Output: `gross_lot_revenue`

**Direct Dependencies:**
- Sum of lot counts × lot prices (plus premiums)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| premium_view | No | Yes | Default/zero |
| premium_golf | No | Yes | Default/zero |
| premium_waterfront | No | Yes | Default/zero |
| premium_corner | No | Yes | Default/zero |
| premium_cul_de_sac | No | Yes | Default/zero |
| premium_oversized | No | Yes | Default/zero |
| premium_other | No | Yes | Default/zero |

**Minimum Input Count:** 2 fields

---

### Output: `net_revenue`

**Direct Dependencies:**
- `total_gross_revenue`
- `sales_commission_pct`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| sales_commission_pct | No | Yes | Default 3.0% |
| commercial_revenue | No | Yes | Default/zero |

**Minimum Input Count:** 2 fields

---

### Output: `gross_profit`

**Direct Dependencies:**
- `net_revenue`
- `total_development_cost`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |

**Minimum Input Count:** 6 fields

---

### Output: `gross_margin_pct`

**Direct Dependencies:**
- `gross_profit`
- `net_revenue`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |

**Minimum Input Count:** 6 fields

---

### Output: `residual_land_value`

**Direct Dependencies:**
- Target IRR
- Project cash flows (revenue, costs, timing)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| preferred_return_pct OR tier_1_hurdle | Yes | No | — |
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |
| absorption_rate_monthly | Yes | No | — |
| project_start_date | Yes | No | — |

**OR Conditions:** `preferred_return_pct` OR `tier_1_hurdle` as target IRR.

**Minimum Input Count:** 8 fields

---

### Output: `peak_equity`

**Direct Dependencies:**
- Cumulative project cash flow curve
- Debt funding available

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| absorption_rate_monthly | Yes | No | — |
| loan_commitment OR loan_ltc_pct | Yes | No | — |
| loan_interest_rate | Yes | No | — |

**Minimum Input Count:** 9 fields

---

### Output: `months_to_sellout`

**Direct Dependencies:**
- `total_units_planned`
- `absorption_rate_monthly`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| total_units_planned OR lot_count_this_product | Yes | No | — |
| absorption_rate_monthly | Yes | No | — |

**Minimum Input Count:** 2 fields

---

### Output: `unleveraged_irr`

**Direct Dependencies:**
- Project cash flows (revenue, costs, timing)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |
| absorption_rate_monthly | Yes | No | — |
| project_start_date | Yes | No | — |
| price_escalation_year_1 | No | Yes | Default 3.0% |
| sales_commission_pct | No | Yes | Default 3.0% |

**Minimum Input Count:** 8 fields

---

### Output: `leveraged_irr`

**Direct Dependencies:**
- Equity cash flows (project cash flows + debt)

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |
| absorption_rate_monthly | Yes | No | — |
| project_start_date | Yes | No | — |
| loan_commitment OR loan_ltc_pct | Yes | No | — |
| loan_interest_rate | Yes | No | — |
| loan_term_months | No | Yes | Default 36 |
| loan_origination_fee_pct | No | Yes | Default 1.0% |

**Minimum Input Count:** 10 fields

---

### Output: `equity_multiple`

**Direct Dependencies:**
- Total distributions
- `total_equity`

**Transitive Dependencies (inputs required):**
| Field | Required | Can Default | Default Source |
|-------|----------|-------------|----------------|
| base_lot_price | Yes | No | — |
| lot_count_this_product OR total_units_planned | Yes | No | — |
| acq_land_cost OR land_purchase_price | Yes | No | — |
| soft_total | Yes | No | — |
| offsite_total | Yes | No | — |
| onsite_total | Yes | No | — |
| loan_commitment OR loan_ltc_pct | Yes | No | — |

**Minimum Input Count:** 7 fields

---

## MVP Field Summary

| # | Field Name | Why Required |
|---|------------|--------------|
| 1 | land_purchase_price | Basis for acquisition cost and total development cost |
| 2 | soft_total | Required cost bucket for total development cost |
| 3 | offsite_total | Required cost bucket for total development cost |
| 4 | onsite_total | Required cost bucket for total development cost |
| 5 | base_lot_price | Core revenue driver for lot sales |
| 6 | total_units_planned | Required to scale revenue and sellout timing |
| 7 | absorption_rate_monthly | Drives months to sellout and cash flow timing |
| 8 | loan_commitment | Debt sizing for levered cash flow and peak equity |

**Total MVP Fields:** 8

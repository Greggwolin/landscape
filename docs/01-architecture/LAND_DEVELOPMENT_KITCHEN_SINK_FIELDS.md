# LAND DEVELOPMENT UNDERWRITING: KITCHEN SINK FIELD REFERENCE

**Version:** 1.0  
**Date:** December 16, 2025  
**Purpose:** Complete field inventory for residential land development / master planned community analysis  
**Total Fields:** 248 (organized by development workflow)  
**Property Subtypes Covered:** Master Planned Community, Subdivision, Multifamily Development Site, Commercial Development Site

---

## LAND DEVELOPMENT vs. INCOME PROPERTY

Land development differs fundamentally from income property analysis:

| Aspect | Income Property | Land Development |
|--------|-----------------|------------------|
| **Revenue Source** | Tenant rent (recurring) | Lot sales (one-time) |
| **Value Driver** | NOI ÷ Cap Rate | Residual value (revenue - costs) |
| **Time Horizon** | Hold period with exit | Development timeline to sellout |
| **Cash Flow Pattern** | Positive from Day 1 | Negative then positive |
| **Primary Risk** | Occupancy, rent growth | Absorption pace, entitlement |
| **Hierarchy** | Property → Building → Unit | Project → Area → Phase → Parcel → Lot |

---

## FIELD NOTATION

Each field includes:
- **Field Name** — Database column / API key
- **Label** — UI display name
- **Type** — Data type (currency, percent, integer, date, text, boolean, json)
- **Required** — Whether Landscaper must populate for basic analysis
- **Default** — Smart default if not provided
- **Extractable** — Can AI extract from typical planning documents?

---

## SECTION 1: PROJECT IDENTIFICATION & LAND ACQUISITION

**Purpose:** Property identification, land purchase terms, due diligence  
**Field Count:** 35 fields

### Project Identification (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 1 | `project_name` | Project Name | text | ✓ | — | ✓ High |
| 2 | `project_address` | Address | text | — | — | ✓ High |
| 3 | `city` | City | text | ✓ | — | ✓ High |
| 4 | `county` | County | text | ✓ | — | ✓ High |
| 5 | `state` | State | text | ✓ | — | ✓ High |
| 6 | `zip_code` | ZIP Code | text | — | — | ✓ High |
| 7 | `apn_list` | APN(s) | text | — | — | ✓ High |
| 8 | `development_subtype` | Development Type | text | ✓ | MPC | ✓ Medium |
| 9 | `market_position` | Market Position | text | — | — | ✓ Medium |
| 10 | `project_description` | Description | text | — | — | ✓ Medium |

### Land Area & Configuration (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 11 | `acres_gross` | Gross Acres | decimal | ✓ | — | ✓ High |
| 12 | `acres_net_developable` | Net Developable Acres | decimal | ✓ | — | ✓ High |
| 13 | `efficiency_ratio` | Land Efficiency % | percent | — | Calculated | ✓ Medium |
| 14 | `acres_open_space` | Open Space Acres | decimal | — | — | ✓ Medium |
| 15 | `acres_drainage` | Drainage/Retention Acres | decimal | — | — | ✓ Medium |
| 16 | `acres_roads_row` | Roads/ROW Acres | decimal | — | — | ✓ Medium |
| 17 | `acres_amenity` | Amenity Acres | decimal | — | — | ✓ Medium |
| 18 | `acres_commercial` | Commercial Acres | decimal | — | — | ✓ Medium |
| 19 | `topography` | Topography | text | — | — | ✓ Low |
| 20 | `flood_zone` | Flood Zone | text | — | — | ✓ Medium |

### Land Acquisition Terms (15 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 21 | `land_purchase_price` | Purchase Price | currency | ✓ | — | ✓ High |
| 22 | `price_per_gross_acre` | Price/Gross Acre | currency | — | Calculated | ✓ Medium |
| 23 | `price_per_net_acre` | Price/Net Acre | currency | — | Calculated | — |
| 24 | `price_per_lot` | Price/Entitled Lot | currency | — | Calculated | ✓ Medium |
| 25 | `contract_date` | Contract Date | date | — | — | ✓ Medium |
| 26 | `earnest_money` | Earnest Money | currency | — | 2% of price | ✓ Medium |
| 27 | `due_diligence_period_days` | DD Period (days) | integer | — | 60 | ✓ Medium |
| 28 | `closing_date` | Closing Date | date | ✓ | — | ✓ Medium |
| 29 | `closing_costs` | Closing Costs | currency | — | 1.5% of price | ✗ Low |
| 30 | `title_insurance` | Title Insurance | currency | — | 0.5% of price | ✗ Low |
| 31 | `option_agreement` | Option Agreement? | boolean | — | false | ✓ Medium |
| 32 | `option_fee` | Option Fee | currency | — | — | ✓ Medium |
| 33 | `option_term_months` | Option Term (months) | integer | — | — | ✓ Medium |
| 34 | `seller_financing` | Seller Financing? | boolean | — | false | ✓ Low |
| 35 | `seller_note_amount` | Seller Note Amount | currency | — | — | ✓ Low |

---

## SECTION 2: ENTITLEMENTS & APPROVALS

**Purpose:** Regulatory status, zoning, mapping, development agreements  
**Field Count:** 28 fields

### Zoning & General Plan (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 36 | `current_zoning` | Current Zoning | text | ✓ | — | ✓ High |
| 37 | `proposed_zoning` | Proposed Zoning | text | — | — | ✓ High |
| 38 | `general_plan_designation` | General Plan | text | ✓ | — | ✓ High |
| 39 | `specific_plan_name` | Specific Plan | text | — | — | ✓ High |
| 40 | `overlay_zones` | Overlay Zones | text | — | — | ✓ Medium |
| 41 | `max_density_allowed` | Max Density (DU/AC) | decimal | — | — | ✓ High |
| 42 | `proposed_density` | Proposed Density (DU/AC) | decimal | — | Calculated | ✓ High |
| 43 | `jurisdiction` | Jurisdiction | text | ✓ | — | ✓ High |
| 44 | `school_district` | School District | text | — | — | ✓ Medium |
| 45 | `utility_providers` | Utility Providers (JSON) | json | — | — | ✓ Medium |

### Entitlement Status (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 46 | `entitlement_status` | Entitlement Status | text | ✓ | Pre-Application | ✓ High |
| 47 | `tentative_map_status` | Tentative Map Status | text | — | — | ✓ High |
| 48 | `tentative_map_date` | Tentative Map Date | date | — | — | ✓ High |
| 49 | `tentative_map_expiration` | TM Expiration | date | — | — | ✓ Medium |
| 50 | `final_map_status` | Final Map Status | text | — | — | ✓ High |
| 51 | `final_map_phases` | Final Map Phases | integer | — | — | ✓ Medium |
| 52 | `development_agreement` | Development Agreement? | boolean | — | false | ✓ High |
| 53 | `da_expiration_date` | DA Expiration | date | — | — | ✓ Medium |
| 54 | `ceqa_nepa_status` | CEQA/NEPA Status | text | — | — | ✓ High |
| 55 | `eir_eis_certified_date` | EIR/EIS Certified | date | — | — | ✓ Medium |

### Exactions & Fees (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 56 | `impact_fees_total` | Total Impact Fees | currency | — | — | ✓ Medium |
| 57 | `impact_fee_per_lot` | Impact Fee/Lot | currency | — | Calculated | ✓ Medium |
| 58 | `school_fees` | School Fees | currency | — | — | ✓ Medium |
| 59 | `park_fees` | Park Fees | currency | — | — | ✓ Medium |
| 60 | `traffic_fees` | Traffic Fees | currency | — | — | ✓ Medium |
| 61 | `water_capacity_fees` | Water Capacity Fees | currency | — | — | ✓ Medium |
| 62 | `sewer_capacity_fees` | Sewer Capacity Fees | currency | — | — | ✓ Medium |
| 63 | `other_fees` | Other Municipal Fees | currency | — | — | ✓ Low |

---

## SECTION 3: PLANNING HIERARCHY

**Purpose:** Project → Area → Phase → Parcel → Lot structure  
**Field Count:** 40 fields

### Project-Level Planning (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 64 | `total_units_planned` | Total Units Planned | integer | ✓ | — | ✓ High |
| 65 | `total_lots_sfr` | SFR Lots | integer | — | — | ✓ High |
| 66 | `total_lots_sfa` | SFA/Townhome Lots | integer | — | — | ✓ High |
| 67 | `total_units_mf` | Multifamily Units | integer | — | — | ✓ High |
| 68 | `commercial_sf` | Commercial SF | integer | — | — | ✓ Medium |
| 69 | `area_count` | Number of Plan Areas | integer | — | Calculated | ✓ Medium |
| 70 | `phase_count` | Number of Phases | integer | — | Calculated | ✓ Medium |
| 71 | `parcel_count` | Number of Parcels | integer | — | Calculated | ✓ Medium |

### Area-Level (Plan Area/Village) Fields (8 fields per area)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 72 | `area_name` | Area Name | text | ✓ | — | ✓ High |
| 73 | `area_acres_gross` | Gross Acres | decimal | ✓ | — | ✓ High |
| 74 | `area_acres_net` | Net Acres | decimal | — | Calculated | ✓ High |
| 75 | `area_total_units` | Total Units | integer | ✓ | — | ✓ High |
| 76 | `area_character` | Area Character | text | — | — | ✓ Medium |
| 77 | `area_target_demographic` | Target Demographic | text | — | — | ✗ Low |
| 78 | `area_amenities` | Amenities | text | — | — | ✓ Medium |
| 79 | `area_start_month` | Development Start Month | integer | — | — | ✗ Low |

### Phase-Level Fields (8 fields per phase)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 80 | `phase_name` | Phase Name | text | ✓ | — | ✓ High |
| 81 | `phase_number` | Phase Number | integer | ✓ | — | ✓ High |
| 82 | `phase_total_lots` | Total Lots | integer | ✓ | — | ✓ High |
| 83 | `phase_start_month` | Start Month | integer | ✓ | — | ✓ Medium |
| 84 | `phase_months_to_complete` | Months to Complete | integer | — | 24 | ✗ Low |
| 85 | `phase_status` | Phase Status | text | — | Planning | ✓ Medium |
| 86 | `final_map_recorded` | Final Map Recorded? | boolean | — | false | ✓ Medium |
| 87 | `final_map_date` | Final Map Date | date | — | — | ✓ Medium |

### Parcel-Level Fields (16 fields per parcel)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 88 | `parcel_name` | Parcel Name | text | ✓ | — | ✓ High |
| 89 | `parcel_acres` | Parcel Acres | decimal | ✓ | — | ✓ High |
| 90 | `parcel_lot_count` | Lot Count | integer | ✓ | — | ✓ High |
| 91 | `family_name` | Land Use Family | text | ✓ | Residential | ✓ High |
| 92 | `density_code` | Density Code | text | ✓ | — | ✓ High |
| 93 | `type_code` | Type Code | text | ✓ | — | ✓ High |
| 94 | `product_code` | Product Code | text | — | — | ✓ Medium |
| 95 | `target_density` | Target Density (DU/AC) | decimal | — | — | ✓ High |
| 96 | `lot_width_ft` | Typical Lot Width (ft) | integer | — | — | ✓ Medium |
| 97 | `lot_depth_ft` | Typical Lot Depth (ft) | integer | — | — | ✓ Medium |
| 98 | `lot_sf` | Typical Lot SF | integer | — | Calculated | ✓ Medium |
| 99 | `front_footage_total` | Total Front Feet | integer | — | Calculated | ✗ Low |
| 100 | `builder_assigned` | Builder Assigned | text | — | — | ✓ Low |
| 101 | `takedown_agreement` | Takedown Agreement? | boolean | — | false | ✓ Low |
| 102 | `parcel_status` | Parcel Status | text | — | Planning | ✓ Medium |
| 103 | `parcel_notes` | Notes | text | — | — | ✓ Low |

---

## SECTION 4: DEVELOPMENT BUDGET

**Purpose:** All costs organized by Scope → Category → Detail hierarchy  
**Field Count:** 55 fields

### Budget Scopes & Categories

**SCOPE 1: LAND ACQUISITION** (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 104 | `acq_land_cost` | Land Cost | currency | ✓ | — | ✓ High |
| 105 | `acq_earnest_money` | Earnest Money | currency | — | — | ✓ Medium |
| 106 | `acq_closing_costs` | Closing Costs | currency | — | 1.5% | ✗ Low |
| 107 | `acq_title_insurance` | Title & Insurance | currency | — | — | ✗ Low |
| 108 | `acq_legal_fees` | Legal Fees | currency | — | — | ✗ Low |
| 109 | `acq_due_diligence` | Due Diligence | currency | — | — | ✗ Low |
| 110 | `acq_broker_commission` | Broker Commission | currency | — | — | ✓ Low |
| 111 | `acq_total` | Total Acquisition | currency | — | Calculated | — |

**SCOPE 2: ENTITLEMENTS & SOFT COSTS** (12 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 112 | `soft_entitlement` | Entitlement Costs | currency | — | — | ✓ Medium |
| 113 | `soft_planning_fees` | Planning & Zoning Fees | currency | — | — | ✓ Medium |
| 114 | `soft_environmental` | Environmental Studies | currency | — | — | ✓ Medium |
| 115 | `soft_engineering` | Engineering & Design | currency | — | — | ✓ Medium |
| 116 | `soft_civil_engineering` | Civil Engineering | currency | — | — | ✓ Medium |
| 117 | `soft_surveying` | Surveying | currency | — | — | ✓ Medium |
| 118 | `soft_geotechnical` | Geotechnical | currency | — | — | ✓ Medium |
| 119 | `soft_legal` | Legal | currency | — | — | ✗ Low |
| 120 | `soft_accounting` | Accounting | currency | — | — | ✗ Low |
| 121 | `soft_insurance` | Insurance | currency | — | — | ✗ Low |
| 122 | `soft_marketing` | Marketing & Sales | currency | — | — | ✗ Low |
| 123 | `soft_total` | Total Soft Costs | currency | — | Calculated | — |

**SCOPE 3: HORIZONTAL DEVELOPMENT - OFFSITE** (10 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 124 | `offsite_roads` | Offsite Roads | currency | — | — | ✓ Medium |
| 125 | `offsite_water_main` | Water Main Extension | currency | — | — | ✓ Medium |
| 126 | `offsite_sewer_main` | Sewer Main Extension | currency | — | — | ✓ Medium |
| 127 | `offsite_storm_drain` | Storm Drain | currency | — | — | ✓ Medium |
| 128 | `offsite_electric` | Electric Extension | currency | — | — | ✓ Medium |
| 129 | `offsite_gas` | Gas Extension | currency | — | — | ✓ Medium |
| 130 | `offsite_telecom` | Telecom/Fiber | currency | — | — | ✓ Low |
| 131 | `offsite_traffic_signals` | Traffic Signals | currency | — | — | ✓ Medium |
| 132 | `offsite_other` | Other Offsite | currency | — | — | ✓ Low |
| 133 | `offsite_total` | Total Offsite | currency | — | Calculated | — |

**SCOPE 4: HORIZONTAL DEVELOPMENT - ONSITE** (15 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 134 | `onsite_grading` | Mass Grading | currency | — | — | ✓ Medium |
| 135 | `onsite_erosion_control` | Erosion Control | currency | — | — | ✓ Low |
| 136 | `onsite_roads` | Internal Roads | currency | — | — | ✓ Medium |
| 137 | `onsite_curb_gutter` | Curb & Gutter | currency | — | — | ✓ Medium |
| 138 | `onsite_sidewalks` | Sidewalks | currency | — | — | ✓ Medium |
| 139 | `onsite_water_distribution` | Water Distribution | currency | — | — | ✓ Medium |
| 140 | `onsite_sewer_collection` | Sewer Collection | currency | — | — | ✓ Medium |
| 141 | `onsite_storm_drain` | Storm Drain/Retention | currency | — | — | ✓ Medium |
| 142 | `onsite_dry_utilities` | Dry Utilities | currency | — | — | ✓ Medium |
| 143 | `onsite_street_lights` | Street Lights | currency | — | — | ✓ Low |
| 144 | `onsite_landscaping` | Common Area Landscaping | currency | — | — | ✓ Medium |
| 145 | `onsite_irrigation` | Irrigation | currency | — | — | ✓ Low |
| 146 | `onsite_signage` | Monument Signs/Wayfinding | currency | — | — | ✓ Low |
| 147 | `onsite_amenities` | Amenity Construction | currency | — | — | ✓ Medium |
| 148 | `onsite_total` | Total Onsite | currency | — | Calculated | — |

**SCOPE 5: IMPACT FEES & EXACTIONS** (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 149 | `fees_impact_total` | Total Impact Fees | currency | — | — | ✓ Medium |
| 150 | `fees_school` | School Fees | currency | — | — | ✓ Medium |
| 151 | `fees_park` | Park Fees | currency | — | — | ✓ Medium |
| 152 | `fees_traffic` | Traffic Fees | currency | — | — | ✓ Medium |
| 153 | `fees_utility_capacity` | Utility Capacity Fees | currency | — | — | ✓ Medium |
| 154 | `fees_permit_building` | Building Permits | currency | — | — | ✗ Low |

**SCOPE 6: CONTINGENCY & OTHER** (4 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 155 | `contingency_hard` | Hard Cost Contingency | currency | — | 5% of hard | ✗ Low |
| 156 | `contingency_soft` | Soft Cost Contingency | currency | — | 10% of soft | ✗ Low |
| 157 | `contingency_pct` | Contingency % | percent | — | 5-10% | ✗ Low |
| 158 | `budget_total` | Total Development Budget | currency | — | Calculated | — |

---

## SECTION 5: LOT PRICING & REVENUE

**Purpose:** Pricing by product type, premiums, escalation  
**Field Count:** 30 fields

### Base Pricing by Product (10 fields per product type)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 159 | `product_code` | Product Code | text | ✓ | — | ✓ High |
| 160 | `product_name` | Product Name | text | ✓ | — | ✓ High |
| 161 | `base_lot_price` | Base Lot Price | currency | ✓ | — | ✓ High |
| 162 | `price_per_front_foot` | Price/Front Foot | currency | — | Calculated | ✓ Medium |
| 163 | `price_per_sf` | Price/SF | currency | — | Calculated | ✓ Medium |
| 164 | `lot_count_this_product` | Lot Count | integer | ✓ | — | ✓ High |
| 165 | `total_revenue_this_product` | Total Revenue | currency | — | Calculated | — |
| 166 | `builder_name` | Builder | text | — | — | ✓ Medium |
| 167 | `takedown_schedule` | Takedown Schedule (JSON) | json | — | — | ✓ Low |
| 168 | `volume_discount_pct` | Volume Discount % | percent | — | 0 | ✗ Low |

### Location Premiums (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 169 | `premium_view` | View Premium | currency | — | — | ✗ Low |
| 170 | `premium_golf` | Golf Course Premium | currency | — | — | ✗ Low |
| 171 | `premium_waterfront` | Waterfront Premium | currency | — | — | ✗ Low |
| 172 | `premium_corner` | Corner Lot Premium | currency | — | — | ✗ Low |
| 173 | `premium_cul_de_sac` | Cul-de-Sac Premium | currency | — | — | ✗ Low |
| 174 | `premium_oversized` | Oversized Lot Premium | currency | — | — | ✗ Low |
| 175 | `premium_other` | Other Premium | currency | — | — | ✗ Low |
| 176 | `premium_count_by_type` | Premium Lot Counts (JSON) | json | — | — | ✗ Low |

### Price Escalation (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 177 | `price_escalation_year_1` | Year 1 Escalation | percent | — | 3.0% | ✗ Low |
| 178 | `price_escalation_year_2` | Year 2 Escalation | percent | — | 3.0% | ✗ Low |
| 179 | `price_escalation_year_3` | Year 3 Escalation | percent | — | 2.5% | ✗ Low |
| 180 | `price_escalation_stabilized` | Stabilized Escalation | percent | — | 2.5% | ✗ Low |
| 181 | `escalation_timing` | Escalation Timing | text | — | Annual | ✗ Low |
| 182 | `escalation_method` | Escalation Method | text | — | Compound | ✗ Low |

### Revenue Summary (6 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 183 | `gross_lot_revenue` | Gross Lot Revenue | currency | — | Calculated | — |
| 184 | `premium_revenue` | Premium Revenue | currency | — | Calculated | — |
| 185 | `commercial_revenue` | Commercial Land Revenue | currency | — | — | ✓ Medium |
| 186 | `total_gross_revenue` | Total Gross Revenue | currency | — | Calculated | — |
| 187 | `sales_commission_pct` | Sales Commission % | percent | — | 3.0% | ✗ Low |
| 188 | `net_revenue` | Net Revenue | currency | — | Calculated | — |

---

## SECTION 6: ABSORPTION & TIMING

**Purpose:** Sales pace, distribution curves, development timeline  
**Field Count:** 25 fields

### Absorption Assumptions (12 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 189 | `absorption_rate_monthly` | Monthly Absorption | decimal | ✓ | — | ✓ Medium |
| 190 | `absorption_rate_quarterly` | Quarterly Absorption | decimal | — | Calculated | ✓ Medium |
| 191 | `absorption_rate_annual` | Annual Absorption | integer | — | Calculated | ✓ Medium |
| 192 | `absorption_by_product` | Absorption by Product (JSON) | json | — | — | ✓ Low |
| 193 | `absorption_curve_type` | Curve Type | text | — | S-Curve | ✗ Low |
| 194 | `absorption_ramp_months` | Ramp-Up Months | integer | — | 6 | ✗ Low |
| 195 | `absorption_peak_pct` | Peak Period % | percent | — | 100% | ✗ Low |
| 196 | `absorption_wind_down_months` | Wind-Down Months | integer | — | 6 | ✗ Low |
| 197 | `seasonal_adjustment` | Seasonal Adjustment? | boolean | — | false | ✗ Low |
| 198 | `seasonal_factors` | Seasonal Factors (JSON) | json | — | — | ✗ Low |
| 199 | `presales_count` | Pre-Sales Count | integer | — | 0 | ✓ Low |
| 200 | `presales_deposit_pct` | Pre-Sales Deposit % | percent | — | 5% | ✗ Low |

### Development Timeline (13 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 201 | `project_start_date` | Project Start Date | date | ✓ | — | ✓ Medium |
| 202 | `land_closing_date` | Land Closing | date | ✓ | — | ✓ Medium |
| 203 | `entitlement_months` | Entitlement Duration (mo) | integer | — | 18 | ✓ Low |
| 204 | `first_final_map_date` | First Final Map | date | — | — | ✓ Medium |
| 205 | `first_lot_delivery_date` | First Lot Delivery | date | — | — | ✓ Medium |
| 206 | `first_lot_sale_date` | First Lot Sale | date | — | — | ✓ Low |
| 207 | `construction_start_date` | Construction Start | date | — | — | ✓ Medium |
| 208 | `sellout_date_projected` | Projected Sellout | date | — | Calculated | — |
| 209 | `months_to_sellout` | Months to Sellout | integer | — | Calculated | — |
| 210 | `total_project_duration` | Total Duration (months) | integer | — | Calculated | — |
| 211 | `phases_per_year` | Phases per Year | decimal | — | — | ✗ Low |
| 212 | `lots_per_month_avg` | Avg Lots/Month | decimal | — | Calculated | — |
| 213 | `timeline_milestones` | Key Milestones (JSON) | json | — | — | ✓ Medium |

---

## SECTION 7: FINANCING (Debt & Equity)

**Purpose:** Construction/development loans, equity structure, waterfall  
**Field Count:** 25 fields

### Development Loan (12 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 214 | `loan_commitment` | Loan Commitment | currency | ✓ | — | ✗ Low |
| 215 | `loan_ltc_pct` | Loan-to-Cost % | percent | ✓ | 65% | ✗ Low |
| 216 | `loan_interest_rate` | Interest Rate | percent | ✓ | — | ✗ Low |
| 217 | `loan_term_months` | Loan Term (months) | integer | — | 36 | ✗ Low |
| 218 | `loan_extension_months` | Extension Options (mo) | integer | — | 12 | ✗ Low |
| 219 | `loan_extension_fee_bps` | Extension Fee (bps) | integer | — | 25 | ✗ Low |
| 220 | `loan_origination_fee_pct` | Origination Fee % | percent | — | 1.0% | ✗ Low |
| 221 | `loan_interest_reserve` | Interest Reserve | currency | — | Calculated | ✗ Low |
| 222 | `loan_lender` | Lender | text | — | — | ✗ Low |
| 223 | `loan_recourse` | Recourse Type | text | — | Full Recourse | ✗ Low |
| 224 | `loan_release_price_pct` | Lot Release % | percent | — | 110% | ✗ Low |
| 225 | `loan_minimum_release` | Minimum Release/Lot | currency | — | — | ✗ Low |

### Equity Structure (8 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 226 | `total_equity` | Total Equity Required | currency | — | Calculated | ✗ Low |
| 227 | `lp_equity_pct` | LP Equity % | percent | ✓ | 90% | ✗ Low |
| 228 | `gp_equity_pct` | GP Equity % | percent | ✓ | 10% | ✗ Low |
| 229 | `gp_coinvest` | GP Co-Invest $ | currency | — | Calculated | ✗ Low |
| 230 | `preferred_return_pct` | Preferred Return | percent | ✓ | 10% | ✗ Low |
| 231 | `pref_compounding` | Pref Compounding | text | — | Simple | ✗ Low |
| 232 | `gp_promote_pct` | GP Promote % | percent | — | 20% | ✗ Low |
| 233 | `developer_fee_pct` | Developer Fee % | percent | — | 3% | ✗ Low |

### Waterfall Tiers (5 fields)

| # | Field | Label | Type | Required | Default | Extractable |
|---|-------|-------|------|----------|---------|-------------|
| 234 | `tier_1_hurdle` | Tier 1 Hurdle (Pref) | percent | — | 10% | ✗ Low |
| 235 | `tier_1_split_lp` | Tier 1 LP Split | percent | — | 100% | ✗ Low |
| 236 | `tier_2_hurdle` | Tier 2 Hurdle (IRR) | percent | — | 15% | ✗ Low |
| 237 | `tier_2_split_lp` | Tier 2 LP Split | percent | — | 80% | ✗ Low |
| 238 | `tier_3_split_lp` | Tier 3 LP Split | percent | — | 70% | ✗ Low |

---

## SECTION 8: CALCULATED OUTPUTS (Return Metrics)

**Purpose:** Model outputs, not inputs  
**Field Count:** 10 fields

| # | Field | Label | Type | Notes |
|---|-------|-------|------|-------|
| 239 | `total_development_cost` | Total Development Cost | currency | All budget scopes |
| 240 | `cost_per_lot` | Cost/Lot | currency | Total cost ÷ lots |
| 241 | `cost_per_acre` | Cost/Net Acre | currency | Total cost ÷ net acres |
| 242 | `gross_profit` | Gross Profit | currency | Revenue - Costs |
| 243 | `gross_margin_pct` | Gross Margin % | percent | Profit ÷ Revenue |
| 244 | `residual_land_value` | Residual Land Value | currency | Backsolve from target IRR |
| 245 | `unleveraged_irr` | Unleveraged IRR | percent | Project IRR |
| 246 | `leveraged_irr` | Leveraged IRR | percent | Equity IRR |
| 247 | `equity_multiple` | Equity Multiple | decimal | Distributions ÷ Equity |
| 248 | `peak_equity` | Peak Equity | currency | Maximum equity deployed |

---

## LAND USE TAXONOMY REFERENCE

### Density Classifications

| Code | Name | Lot SF Range | DU/Acre |
|------|------|--------------|---------|
| **VLDR** | Very Low Density | 20,000+ SF | 0-2.0 |
| **LDR** | Low Density | 7,500-19,999 SF | 2.0-6.0 |
| **MDR** | Medium Density | 4,000-7,499 SF | 6.0-12.0 |
| **HDR** | High Density | 0-3,999 SF | 12.0+ |

### Product Type Examples

| Family | Density | Type | Product | Typical Lot |
|--------|---------|------|---------|-------------|
| Residential | VLDR | SFD | Estate 90 | 90' × 140' |
| Residential | LDR | SFD | Standard 65 | 65' × 120' |
| Residential | MDR | SFD | Cottage 50 | 50' × 100' |
| Residential | MDR | SFA | Patio 45 | 45' × 90' |
| Residential | HDR | TH | Townhome | 24' × 80' |
| Residential | HDR | MF | Multifamily | N/A |

---

## SUMMARY BY EXTRACTION CONFIDENCE

| Confidence | Field Count | Example Fields |
|------------|-------------|----------------|
| **High** (✓ in planning docs) | 75 | Acres, units, zoning, parcel counts, tentative map data |
| **Medium** (often available) | 85 | Budget categories, pricing, absorption, entitlement status |
| **Low** (rarely in documents) | 88 | Financing terms, waterfall, escalation, premiums |

---

## FIELD REQUIREMENTS BY ANALYSIS TIER

### Minimum Viable Analysis (MVP - 22 fields)

1. `acres_gross`
2. `acres_net_developable`
3. `total_units_planned`
4. `land_purchase_price`
5. `current_zoning`
6. `entitlement_status`
7. `soft_total` (or top-level soft cost)
8. `offsite_total` (or top-level offsite)
9. `onsite_total` (or top-level onsite)
10. `fees_impact_total`
11. `base_lot_price` (avg across products)
12. `absorption_rate_monthly`
13. `project_start_date`
14. `months_to_sellout`
15. `loan_commitment` OR `loan_ltc_pct`
16. `loan_interest_rate`
17. `lp_equity_pct`
18. `gp_equity_pct`
19. `preferred_return_pct`
20. `contingency_pct`
21. `sales_commission_pct`
22. `price_escalation_year_1`

### Standard Analysis (100 fields)

Adds: Phase/parcel detail, budget breakdown by category, pricing by product, absorption curves

### Full Kitchen Sink (248 fields)

Complete institutional-grade analysis with all cost details, timing granularity, premium structures, seasonal adjustments, and full waterfall.

---

## INFRASTRUCTURE COST ALLOCATION METHODS

When infrastructure serves multiple parcels/phases, costs can be allocated by:

| Method | Description | Use Case |
|--------|-------------|----------|
| **Proportion of Units** | Cost × (parcel units ÷ total units) | Most common |
| **Proportion of Acres** | Cost × (parcel acres ÷ total acres) | Land-intensive infra |
| **Proportion of Revenue** | Cost × (parcel revenue ÷ total revenue) | Value-based allocation |
| **Proportion of Front Feet** | Cost × (parcel FF ÷ total FF) | Street improvements |
| **Fixed Percentage** | Direct assignment | Negotiated splits |
| **Benefit Zone** | By engineering assessment | Complex projects |

---

**End of Field Reference**
**QJ06**

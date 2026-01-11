# Multifamily Field Registry v4

**Version:** 4.0
**Last Updated:** 2025-12-18
**Total Fields:** 224 fields across 13 sections

---

## Overview

The Field Registry is the authoritative contract for AI extraction in Landscape. It defines:
- **What fields** can be extracted from documents
- **Where they go** (target table and column)
- **How they're written** (column update, row upsert, array insert)
- **Validation rules** (auto-write vs. propose for validation)

### Registry Location
```
backend/data/MF_Input_FieldRegistry_v4.csv
```

### Service Implementation
```
backend/apps/knowledge/services/field_registry.py
```

---

## Architecture

### FieldMapping Dataclass

Each field is represented as a `FieldMapping` object with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `field_key` | string | Unique identifier (e.g., `property_name`, `opex_real_estate_taxes`) |
| `label` | string | Human-readable display name |
| `field_type` | string | Data type: `text`, `integer`, `number`, `currency`, `percentage`, `boolean`, `date` |
| `scope` | string | Write scope (see Scopes below) |
| `table_name` | string | Target PostgreSQL table |
| `column_name` | string | Target column |
| `db_write_type` | string | Write strategy: `update`, `upsert`, `insert` |
| `selector_json` | dict | For row-based writes, the matching criteria |
| `evidence_types` | list | Document types that can provide this field |
| `extract_policy` | string | `validate` (propose) or `auto` (auto-write) |

### Scopes

| Scope | Description | Target Tables |
|-------|-------------|---------------|
| `project` | Property-level, single row | `tbl_project` |
| `mf_property` | Multifamily-specific, single row | `tbl_multifamily_property` |
| `acquisition` | Deal terms, single row | `tbl_property_acquisition` |
| `market` | Market data, single row | `tbl_market_rate_analysis` |
| `unit_type` | Unit mix array, multiple rows | `tbl_multifamily_unit_type` |
| `unit` | Rent roll array, multiple rows | `tbl_multifamily_unit` |
| `opex` | Operating expenses, keyed rows | `tbl_operating_expense` |
| `income` | Other income, keyed rows | `tbl_revenue_other` |
| `assumption` | Projections, keyed rows | `tbl_project_assumption` |
| `sales_comp` | Sales comps array | `tbl_sales_comparables` |
| `rent_comp` | Rent comps array | `tbl_rent_comparable` |

### Write Types

| Type | Description | Example |
|------|-------------|---------|
| `update` | Direct column update on existing row | `tbl_project.property_name` |
| `upsert` | Insert or update based on match key | Unit types matched on `unit_type_name` |
| `insert` | Always insert new row | Sales/rent comparables |

---

## Field Sections

### Section 1: Property Identification (15 fields)

Core property identification fields written to `tbl_project`.

| Field Key | Label | Type | Target |
|-----------|-------|------|--------|
| `property_name` | Property Name | text | `tbl_project.project_name` |
| `street_address` | Street Address | text | `tbl_project.street_address` |
| `city` | City | text | `tbl_project.city` |
| `state` | State | text | `tbl_project.state` |
| `zip_code` | ZIP Code | text | `tbl_project.zip_code` |
| `county` | County | text | `tbl_project.county` |
| `submarket` | Submarket | text | `tbl_project.submarket` |
| `market` | Market/MSA | text | `tbl_project.market` |
| `apn_primary` | Primary APN | text | `tbl_project.apn_primary` |
| `listing_brokerage` | Listing Brokerage | text | `tbl_project.listing_brokerage` |
| `property_class` | Property Class | text | `tbl_project.property_class` |
| `property_subtype` | Property Subtype | text | `tbl_project.property_subtype` |
| `location_lat` | Latitude | number | `tbl_project.location_lat` |
| `location_lon` | Longitude | number | `tbl_project.location_lon` |
| `location_description` | Location Description | text | `tbl_project.location_description` |

---

### Section 2: Physical Characteristics (30 fields)

Building and site characteristics across `tbl_project` and `tbl_multifamily_property`.

| Field Key | Label | Type | Target |
|-----------|-------|------|--------|
| `total_units` | Total Units | integer | `tbl_project.total_units` |
| `year_built` | Year Built | integer | `tbl_project.year_built` |
| `year_renovated` | Year Renovated | integer | `tbl_multifamily_property.year_renovated` |
| `stories` | Number of Stories | integer | `tbl_project.stories` |
| `number_of_buildings` | Number of Buildings | integer | `tbl_multifamily_property.number_of_buildings` |
| `total_building_sf` | Total Building SF | number | `tbl_multifamily_property.total_building_sf` |
| `rentable_sf` | Rentable SF | number | `tbl_project.gross_sf` |
| `avg_unit_sf` | Average Unit SF | number | `tbl_multifamily_property.avg_unit_sf` |
| `lot_size_sf` | Lot Size (SF) | number | `tbl_project.lot_size_sf` |
| `lot_size_acres` | Lot Size (Acres) | number | `tbl_project.lot_size_acres` |
| `parking_spaces_total` | Total Parking Spaces | integer | `tbl_multifamily_property.parking_spaces_total` |
| `parking_ratio` | Parking Ratio | number | `tbl_multifamily_property.parking_ratio` |
| `parking_type` | Parking Type | text | `tbl_multifamily_property.parking_type` |
| `surface_spaces` | Surface Parking Spaces | integer | `tbl_multifamily_property.surface_spaces` |
| `garage_spaces` | Garage Spaces | integer | `tbl_multifamily_property.garage_spaces` |
| `covered_spaces` | Covered Spaces | integer | `tbl_multifamily_property.covered_spaces` |
| `ev_charging_spaces` | EV Charging Spaces | integer | `tbl_multifamily_property.ev_charging_spaces` |
| `has_commercial_space` | Has Commercial Space | boolean | `tbl_multifamily_property.has_commercial_space` |
| `commercial_sf` | Commercial SF | number | `tbl_multifamily_property.commercial_sf` |
| `commercial_unit_count` | Commercial Unit Count | integer | `tbl_multifamily_property.commercial_unit_count` |
| `leasing_office_sf` | Leasing Office SF | integer | `tbl_multifamily_property.leasing_office_sf` |
| `has_manager_unit` | Has Manager Unit | boolean | `tbl_multifamily_property.has_manager_unit` |
| `manager_unit_count` | Manager Unit Count | integer | `tbl_multifamily_property.manager_unit_count` |
| `has_solar_panels` | Has Solar Panels | boolean | `tbl_multifamily_property.has_solar_panels` |
| `solar_capacity_kw` | Solar Capacity (kW) | number | `tbl_multifamily_property.solar_capacity_kw` |
| `has_ev_charging` | Has EV Charging | boolean | `tbl_multifamily_property.has_ev_charging` |
| `has_tankless_water_heaters` | Has Tankless Water Heaters | boolean | `tbl_multifamily_property.has_tankless_water_heaters` |
| `electric_metered_individually` | Electric Individually Metered | boolean | `tbl_multifamily_property.electric_metered_individually` |
| `gas_metered_individually` | Gas Individually Metered | boolean | `tbl_multifamily_property.gas_metered_individually` |
| `water_metered_individually` | Water Individually Metered | boolean | `tbl_multifamily_property.water_metered_individually` |
| `energy_star_certified` | Energy Star Certified | boolean | `tbl_multifamily_property.energy_star_certified` |

---

### Section 3: Pricing & Valuation Metrics (20 fields)

Financial metrics for valuation and underwriting.

| Field Key | Label | Type | Target |
|-----------|-------|------|--------|
| `asking_price` | Asking Price | currency | `tbl_project.asking_price` |
| `acquisition_price` | Acquisition/Contract Price | currency | `tbl_project.acquisition_price` |
| `price_per_unit` | Price Per Unit | currency | `tbl_project.price_per_unit` |
| `price_per_sf` | Price Per SF | currency | `tbl_project.price_per_sf` |
| `cap_rate_current` | Current Cap Rate | percentage | `tbl_project.cap_rate_current` |
| `cap_rate_proforma` | Proforma Cap Rate | percentage | `tbl_project.cap_rate_proforma` |
| `grm_current` | Current GRM | number | `tbl_property_acquisition.grm` |
| `grm_proforma` | Proforma GRM | number | `tbl_property_acquisition.grm` |
| `current_gpr` | Current Gross Potential Rent | currency | `tbl_project.current_gpr` |
| `current_egi` | Current Effective Gross Income | currency | `tbl_project.current_egi` |
| `current_opex` | Current Operating Expenses | currency | `tbl_project.current_opex` |
| `current_noi` | Current NOI | currency | `tbl_project.current_noi` |
| `current_vacancy_rate` | Current Vacancy Rate | percentage | `tbl_project.current_vacancy_rate` |
| `proforma_gpr` | Proforma Gross Potential Rent | currency | `tbl_project.proforma_gpr` |
| `proforma_egi` | Proforma Effective Gross Income | currency | `tbl_project.proforma_egi` |
| `proforma_opex` | Proforma Operating Expenses | currency | `tbl_project.proforma_opex` |
| `proforma_noi` | Proforma NOI | currency | `tbl_project.proforma_noi` |
| `proforma_vacancy_rate` | Proforma Vacancy Rate | percentage | `tbl_project.proforma_vacancy_rate` |
| `assessed_value` | Assessed Value | currency | `tbl_multifamily_property.assessed_value` |
| `assessment_year` | Assessment Year | integer | `tbl_multifamily_property.assessment_year` |

---

### Section 4: Unit Mix / Unit Types (12 fields per type)

Array extraction - multiple rows per property in `tbl_multifamily_unit_type`.

**Write Strategy:** `upsert` with match on `unit_type_name`

| Field Key | Label | Type | Target Column |
|-----------|-------|------|---------------|
| `unit_type_name` | Unit Type Name | text | `unit_type_name` |
| `unit_type_code` | Unit Type Code | text | `unit_type_code` |
| `unit_count` | Unit Count by Type | integer | `unit_count` |
| `bedrooms` | Bedrooms | integer | `bedrooms` |
| `bathrooms` | Bathrooms | number | `bathrooms` |
| `avg_square_feet` | Average SF by Type | integer | `avg_square_feet` |
| `market_rent` | Market Rent | currency | `market_rent` |
| `current_rent_avg` | Current Average Rent | currency | `current_rent_avg` |
| `concessions_avg` | Average Concessions | currency | `concessions_avg` |
| `total_units_by_type` | Total Units by Type | integer | `total_units` |
| `notes_unit_type` | Unit Type Notes | text | `notes` |
| `other_features` | Other Features | text | `other_features` |

---

### Section 5: Individual Units / Rent Roll (20 fields per unit)

Array extraction - one row per unit in `tbl_multifamily_unit`.

**Write Strategy:** `upsert` with match on `unit_number`

| Field Key | Label | Type | Target Column |
|-----------|-------|------|---------------|
| `unit_number` | Unit Number | text | `unit_number` |
| `unit_unit_type` | Unit Type | text | `unit_type` |
| `unit_bedrooms` | Bedrooms | integer | `bedrooms` |
| `unit_bathrooms` | Bathrooms | number | `bathrooms` |
| `unit_square_feet` | Square Feet | integer | `square_feet` |
| `unit_current_rent` | Current Rent | currency | `current_rent` |
| `unit_market_rent` | Market Rent | currency | `market_rent` |
| `unit_lease_start` | Lease Start Date | date | `lease_start_date` |
| `unit_lease_end` | Lease End Date | date | `lease_end_date` |
| `unit_occupancy_status` | Occupancy Status | text | `occupancy_status` |
| `unit_building` | Building | text | `building_name` |
| `unit_floor` | Floor | integer | `floor_number` |
| `is_section8` | Is Section 8 | boolean | `is_section8` |
| `section8_contract_rent` | Section 8 Contract Rent | currency | `section8_contract_rent` |
| `is_manager_unit` | Is Manager Unit | boolean | `is_manager` |
| `has_balcony` | Has Balcony | boolean | `has_balcony` |
| `has_patio` | Has Patio | boolean | `has_patio` |
| `view_type` | View Type | text | `view_type` |
| `renovation_status` | Renovation Status | text | `renovation_status` |
| `unit_notes` | Unit Notes | text | `other_features` |

---

### Section 6: Operating Expenses (25 categories)

Row-based extraction to `tbl_operating_expense` with `expense_category` selector.

**Write Strategy:** `upsert` with match on `expense_category`

| Field Key | Label | Category Key |
|-----------|-------|--------------|
| `opex_real_estate_taxes` | Real Estate Taxes | `real_estate_taxes` |
| `opex_direct_assessments` | Direct Assessments | `direct_assessments` |
| `opex_property_insurance` | Property Insurance | `property_insurance` |
| `opex_utilities_water` | Utilities - Water/Sewer | `utilities_water` |
| `opex_utilities_trash` | Utilities - Trash | `utilities_trash` |
| `opex_utilities_electric` | Utilities - Electric | `utilities_electric` |
| `opex_utilities_gas` | Utilities - Gas | `utilities_gas` |
| `opex_repairs_maintenance` | Repairs & Maintenance | `repairs_maintenance` |
| `opex_contract_services` | Contract Services | `contract_services` |
| `opex_turnover_costs` | Turnover/Make-Ready | `turnover_costs` |
| `opex_landscaping` | Landscaping/Grounds | `landscaping` |
| `opex_janitorial` | Janitorial | `janitorial` |
| `opex_pest_control` | Pest Control | `pest_control` |
| `opex_pool_spa` | Pool/Spa Maintenance | `pool_spa` |
| `opex_elevator` | Elevator Maintenance | `elevator` |
| `opex_security` | Security | `security` |
| `opex_management_fee` | Management Fee | `management_fee` |
| `opex_payroll` | On-Site Payroll | `payroll` |
| `opex_manager_rent_credit` | Manager Rent Credit | `manager_rent_credit` |
| `opex_advertising` | Advertising/Marketing | `advertising` |
| `opex_professional_fees` | Professional Fees | `professional_fees` |
| `opex_telephone` | Telephone/Communications | `telephone` |
| `opex_licenses_permits` | Licenses & Permits | `licenses_permits` |
| `opex_miscellaneous` | Miscellaneous | `miscellaneous` |

---

### Section 7: Other Income (12 fields)

Row-based extraction to `tbl_revenue_other` with `income_category` selector.

| Field Key | Label | Category Key |
|-----------|-------|--------------|
| `income_parking` | Parking Income | `parking` |
| `income_laundry` | Laundry/Vending Income | `laundry` |
| `income_pet_fees` | Pet Fees/Rent | `pet_fees` |
| `income_storage` | Storage Income | `storage` |
| `income_utility_reimbursement` | Utility Reimbursements | `utility_reimb` |
| `income_late_fees` | Late Fees | `late_fees` |
| `income_application_fees` | Application Fees | `application_fees` |
| `income_cable_telecom` | Cable/Telecom Income | `cable_telecom` |
| `income_commercial` | Commercial/Retail Income | `commercial` |
| `income_amenity_fees` | Amenity Fees | `amenity_fees` |
| `income_miscellaneous` | Miscellaneous Income | `miscellaneous` |
| `income_total_other` | Total Other Income | (project scope) |

---

### Section 8: Assumptions & Projections (20 fields)

Row-based extraction to `tbl_project_assumption` with `assumption_key` selector.

| Field Key | Label | Assumption Key |
|-----------|-------|----------------|
| `cap_rate_going_in` | Going-In Cap Rate | `cap_rate_going_in` |
| `cap_rate_exit` | Exit Cap Rate | `cap_rate_exit` |
| `physical_vacancy_pct` | Physical Vacancy % | `physical_vacancy_pct` |
| `economic_vacancy_pct` | Economic Vacancy % | `economic_vacancy_pct` |
| `concessions_pct` | Concessions % | `concessions_pct` |
| `bad_debt_pct` | Bad Debt % | `bad_debt_pct` |
| `rent_growth_year_1` | Year 1 Rent Growth | `rent_growth_year_1` |
| `rent_growth_year_2` | Year 2 Rent Growth | `rent_growth_year_2` |
| `rent_growth_stabilized` | Stabilized Rent Growth | `rent_growth_stabilized` |
| `expense_growth_pct` | Expense Growth % | `expense_growth_pct` |
| `hold_period_years` | Hold Period (Years) | `hold_period_years` |
| `discount_rate` | Discount Rate | `discount_rate` |
| `loss_to_lease_pct` | Loss to Lease % | `loss_to_lease_pct` |
| `stabilization_months` | Months to Stabilization | `stabilization_months` |
| `capex_per_unit` | CapEx Reserve Per Unit | `capex_per_unit` |
| `replacement_reserve_pct` | Replacement Reserve % | `replacement_reserve_pct` |
| `tax_reassessment_pct` | Tax Reassessment % | `tax_reassessment_pct` |
| `insurance_growth_pct` | Insurance Growth % | `insurance_growth_pct` |
| `utility_growth_pct` | Utility Growth % | `utility_growth_pct` |
| `payroll_growth_pct` | Payroll Growth % | `payroll_growth_pct` |

---

### Section 9: Rent Control & Regulatory (10 fields)

Regulatory and compliance fields.

| Field Key | Label | Target |
|-----------|-------|--------|
| `rent_control_exempt` | Rent Control Exempt | `tbl_multifamily_property.rent_control_exempt` |
| `exemption_reason` | Exemption Reason | `tbl_multifamily_property.exemption_reason` |
| `rent_control_ordinance` | Rent Control Ordinance | `tbl_multifamily_property.rent_control_ordinance` |
| `max_rent_increase_pct` | Max Rent Increase % | `tbl_project_assumption.max_rent_increase_pct` |
| `has_section8_units` | Has Section 8 Units | `tbl_multifamily_property.has_section8_units` |
| `section8_unit_count` | Section 8 Unit Count | `tbl_multifamily_property.section8_unit_count` |
| `affordable_housing_program` | Affordable Program | `tbl_multifamily_property.affordable_housing_program` |
| `utility_recovery_method` | Utility Recovery Method | `tbl_multifamily_property.utility_recovery_method` |
| `rubs_recovery_pct` | RUBS Recovery % | `tbl_multifamily_property.rubs_recovery_pct` |
| `property_tax_rate` | Property Tax Rate | `tbl_multifamily_property.property_tax_rate` |

---

### Section 10: Sales Comparables (15 fields per comp)

Array extraction - multiple rows per property in `tbl_sales_comparables`.

**Write Strategy:** `insert` (always creates new rows)

| Field Key | Label | Target Column |
|-----------|-------|---------------|
| `sales_comp_name` | Property Name | `property_name` |
| `sales_comp_address` | Address | `address` |
| `sales_comp_city` | City | `city` |
| `sales_comp_state` | State | `state` |
| `sales_comp_sale_date` | Sale Date | `sale_date` |
| `sales_comp_sale_price` | Sale Price | `sale_price` |
| `sales_comp_units` | Units | `units` |
| `sales_comp_year_built` | Year Built | `year_built` |
| `sales_comp_price_per_unit` | Price Per Unit | `price_per_unit` |
| `sales_comp_price_per_sf` | Price Per SF | `price_per_sf` |
| `sales_comp_cap_rate` | Cap Rate | `cap_rate` |
| `sales_comp_grm` | GRM | `grm` |
| `sales_comp_building_sf` | Building SF | `building_sf` |
| `sales_comp_distance` | Distance (miles) | `distance_from_subject` |
| `sales_comp_notes` | Notes | `notes` |

---

### Section 11: Rent Comparables (15 fields per comp)

Array extraction - multiple rows per property in `tbl_rent_comparable`.

**Write Strategy:** `insert` (always creates new rows)

| Field Key | Label | Target Column |
|-----------|-------|---------------|
| `rent_comp_name` | Property Name | `property_name` |
| `rent_comp_address` | Address | `address` |
| `rent_comp_year_built` | Year Built | `year_built` |
| `rent_comp_total_units` | Total Units | `total_units` |
| `rent_comp_unit_type` | Unit Type | `unit_type` |
| `rent_comp_bedrooms` | Bedrooms | `bedrooms` |
| `rent_comp_bathrooms` | Bathrooms | `bathrooms` |
| `rent_comp_avg_sqft` | Average SF | `avg_sqft` |
| `rent_comp_asking_rent` | Asking Rent | `asking_rent` |
| `rent_comp_effective_rent` | Effective Rent | `effective_rent` |
| `rent_comp_concessions` | Concessions | `concessions` |
| `rent_comp_amenities` | Amenities | `amenities` |
| `rent_comp_distance` | Distance (miles) | `distance_miles` |
| `rent_comp_as_of_date` | As Of Date | `as_of_date` |
| `rent_comp_notes` | Notes | `notes` |

---

### Section 12: Acquisition / Deal Terms (15 fields)

Transaction and deal structure fields.

| Field Key | Label | Target |
|-----------|-------|--------|
| `acquisition_date` | Acquisition Date | `tbl_project.acquisition_date` |
| `earnest_money` | Earnest Money | `tbl_property_acquisition.earnest_money` |
| `due_diligence_days` | Due Diligence Period | `tbl_property_acquisition.due_diligence_days` |
| `closing_costs_pct` | Closing Costs % | `tbl_property_acquisition.closing_costs_pct` |
| `broker_commission_pct` | Broker Commission % | `tbl_property_acquisition.broker_commission_pct` |
| `legal_fees` | Legal Fees | `tbl_property_acquisition.legal_fees` |
| `third_party_reports` | Third Party Reports | `tbl_property_acquisition.third_party_reports` |
| `financing_fees` | Financing Fees | `tbl_property_acquisition.financing_fees` |
| `land_pct` | Land Allocation % | `tbl_property_acquisition.land_pct` |
| `improvement_pct` | Improvement Allocation % | `tbl_property_acquisition.improvement_pct` |
| `depreciation_basis` | Depreciation Basis | `tbl_property_acquisition.depreciation_basis` |
| `is_1031_exchange` | Is 1031 Exchange | `tbl_property_acquisition.is_1031_exchange` |
| `exit_cap_rate_acq` | Exit Cap Rate Assumption | `tbl_property_acquisition.exit_cap_rate` |
| `sale_costs_pct` | Disposition Costs % | `tbl_property_acquisition.sale_costs_pct` |
| `acq_hold_period` | Hold Period | `tbl_property_acquisition.hold_period_years` |

---

### Section 13: Market Data (15 fields)

Demographics and market analytics.

| Field Key | Label | Target |
|-----------|-------|--------|
| `walk_score` | Walk Score | `tbl_project.walk_score` |
| `bike_score` | Bike Score | `tbl_project.bike_score` |
| `transit_score` | Transit Score | `tbl_project.transit_score` |
| `population_1mi` | Population (1 mi) | `tbl_market_rate_analysis.population_1mi` |
| `population_3mi` | Population (3 mi) | `tbl_market_rate_analysis.population_3mi` |
| `population_5mi` | Population (5 mi) | `tbl_market_rate_analysis.population_5mi` |
| `median_hh_income_1mi` | Median HH Income (1 mi) | `tbl_market_rate_analysis.median_hh_income_1mi` |
| `median_hh_income_3mi` | Median HH Income (3 mi) | `tbl_market_rate_analysis.median_hh_income_3mi` |
| `avg_hh_income_5mi` | Avg HH Income (5 mi) | `tbl_market_rate_analysis.avg_hh_income_5mi` |
| `employment_5mi` | Employment (5 mi) | `tbl_market_rate_analysis.employment_5mi` |
| `submarket_vacancy` | Submarket Vacancy % | `tbl_market_rate_analysis.submarket_vacancy` |
| `submarket_rent_growth` | Submarket Rent Growth | `tbl_market_rate_analysis.submarket_rent_growth` |
| `submarket_avg_rent` | Submarket Avg Rent | `tbl_market_rate_analysis.submarket_avg_rent` |
| `submarket_occupancy` | Submarket Occupancy % | `tbl_market_rate_analysis.submarket_occupancy` |
| `new_supply_pipeline` | New Supply (units) | `tbl_market_rate_analysis.new_supply_pipeline` |

---

## Extraction Batches

The `BatchedExtractionService` groups fields into batches for efficient AI extraction:

| Batch | Scopes | Fields | Description |
|-------|--------|--------|-------------|
| `core_property` | project, mf_property | ~65 | Property ID, physical, pricing |
| `financials` | opex, income, assumption | ~57 | Operating expenses, income, projections |
| `unit_types` | unit_type | 12 | Unit mix array |
| `comparables` | sales_comp, rent_comp | 30 | Market comparables |
| `deal_market` | acquisition, market | ~30 | Deal terms, demographics |
| `rent_roll` | unit | 20 | Individual units (chunked for 100+) |

---

## API Endpoints

### Extract Document (Batched)
```
POST /api/knowledge/documents/{doc_id}/extract-batched/
{
    "project_id": 17,
    "batches": ["core_property", "financials", "unit_types"]
}
```

### Extract Rent Roll (Chunked)
```
POST /api/knowledge/documents/{doc_id}/extract-rent-roll/
{
    "project_id": 17,
    "property_type": "multifamily"
}
```

### Bulk Validate Extractions
```
POST /api/knowledge/projects/{project_id}/extractions/bulk-validate/
```

---

## Related Files

| File | Purpose |
|------|---------|
| `backend/data/MF_Input_FieldRegistry_v4.csv` | Field definitions |
| `backend/apps/knowledge/services/field_registry.py` | Registry loader service |
| `backend/apps/knowledge/services/extraction_service.py` | Batched/chunked extraction |
| `backend/apps/knowledge/services/extraction_writer.py` | Write extractions to DB |
| `backend/apps/knowledge/views/extraction_views.py` | API endpoints |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v4.0 | 2025-12-18 | Chunked rent roll extraction, unit writer, 224 fields |
| v3.0 | 2025-12-15 | Batched extraction, array scopes, staging table |
| v2.0 | 2025-11-20 | Added opex/income categories, selector_json |
| v1.0 | 2025-10-15 | Initial registry with 180 fields |

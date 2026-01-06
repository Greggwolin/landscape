# Parcel ID Audit

Source: docs/schema/landscape_rich_schema_2026-01-06.json

## Summary

- Total tables with parcel_id: 19
- FK-parcel_id-correct: 12
- FK-parcel_id-type-drift: 6
- APN-misnamed-as-parcel_id: 1

## FK-parcel_id-correct

| Table | Data Type | FK to tbl_parcel | Indexed | Notes |
| --- | --- | --- | --- | --- |
| gis_plan_parcel | integer | yes | no |  |
| tbl_cashflow | integer | yes | no |  |
| tbl_cre_property | integer | yes | no |  |
| tbl_lease | integer | yes | no |  |
| tbl_lot | integer | yes | no |  |
| tbl_multifamily_property | integer | no | no | No FK constraint in schema export. |
| tbl_operating_expense | integer | yes | no |  |
| tbl_parcel | integer | no | no |  |
| tbl_parcel_sale_assumptions | integer | yes | no |  |
| tbl_sale_settlement | integer | no | no | Reference to tbl_parcel for parcel-based workflows No FK constraint in schema export. |
| vw_map_plan_parcels | integer | no | no | No FK constraint in schema export. |
| vw_parcels_with_sales | integer | no | no | No FK constraint in schema export. |

## FK-parcel_id-type-drift

| Table | Data Type | FK to tbl_parcel | Indexed | Notes |
| --- | --- | --- | --- | --- |
| core_doc | bigint | yes | no |  |
| tbl_absorption_schedule | bigint | yes | no |  |
| tbl_acreage_allocation | bigint | yes | no |  |
| tbl_parcel_sale_event | bigint | no | no |  |
| vw_absorption_with_dependencies | bigint | no | no |  |
| vw_acreage_allocation | bigint | no | no |  |

## APN-misnamed-as-parcel_id

| Table | Data Type | FK to tbl_parcel | Indexed | Notes |
| --- | --- | --- | --- | --- |
| project_parcel_boundaries | text | no | no | Pinal County tax parcel identifier |

## Indexes Added

Source: docs/schema/landscape_rich_schema_2026-01-06.json (CSV inputs not present)

| Table | Index Name | FK Exists |
| --- | --- | --- |
| core_doc | idx_core_doc__parcel_id | yes |
| gis_plan_parcel | idx_gis_plan_parcel__parcel_id | yes |
| tbl_acreage_allocation | idx_tbl_acreage_allocation__parcel_id | yes |
| tbl_cre_property | idx_tbl_cre_property__parcel_id | yes |

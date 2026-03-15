# Report 7: Rent Roll

## Overview
- **Property Types:** Multifamily
- **Data Readiness:** READY
- **Primary Data Source(s):** Rent Roll tab (`tbl_unit`, `tbl_lease`, unit grid)
- **ARGUS Equivalent:** Rent Roll Current / Rent Roll Presentation
- **Peoria Lakes Equivalent:** Not applicable (Land Dev)

## Column Layout
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Unit # | Text | tbl_unit.unit_number | Yes |
| 2 | Floor Plan | Text | tbl_unit.plan_name | Yes |
| 3 | Bed | Integer | tbl_unit.bed_count | Yes |
| 4 | Bath | Decimal | tbl_unit.bath_count | Yes |
| 5 | SF | Integer | tbl_unit.square_feet | Yes |
| 6 | Tenant Name | Text | tbl_lease.tenant_name | Yes |
| 7 | Status | Enum | tbl_lease.status (Occupied/Vacant) | Yes |
| 8 | Lease Start | Date | tbl_lease.lease_start_date | Yes |
| 9 | Lease End | Date | tbl_lease.lease_end_date | Yes |
| 10 | Current Rent | Currency | tbl_lease.rent_amount | Yes |
| 11 | Market Rent | Currency | tbl_unit.market_rent | Yes |
| 12 | Loss to Lease | Currency | Market Rent - Current Rent | Calculated |
| 13 | $/SF | Currency | Current Rent / SF | Calculated |

## Row Structure

**Header Row (KPI Summary — fixed at top):**
- Occupancy %: (Occupied Units / Total Units) × 100
- Avg Current Rent: SUM(Current Rent) / Occupied Units
- Avg Market Rent: SUM(Market Rent) / Total Units
- Growth Potential %: (Avg Market Rent - Avg Current Rent) / Avg Current Rent × 100
- Monthly Income: SUM(Current Rent) for Occupied units
- Rent/SF: Monthly Income / SUM(SF)

**Detail Rows (one per unit, sorted by Unit #):**
- All columns as per Column Layout
- Vacant units highlighted in light orange
- Occupied units in default (white)

**Total Row (at bottom):**
- Unit #: "TOTAL"
- Bed: Blank (or sum)
- Bath: Blank (or sum)
- SF: SUM (all units)
- Tenant Name: Blank
- Status: Count of Occupied / Total (e.g., "102/113")
- Lease Start/End: Blank
- Current Rent: SUM (Occupied units only)
- Market Rent: SUM (all units)
- Loss to Lease: SUM
- $/SF: Weighted average (Total Monthly Income / Total SF)

## Section Breakdown

1. **Header Block (above grid):** KPI cards or row (Occupancy, Avg Current Rent, Avg Market Rent, Growth Potential, Monthly Income, Rent/SF)
2. **Rent Roll Grid:** All detail rows + Total row
3. **Footer:** Data as-of date, property name (Chadron Terrace), sample count if applicable

## Formatting Notes
- **Occupancy %:** Bold, green if ≥90%, yellow if 80-89%, red if <80%
- **Currency columns:** Right-aligned, $ symbol, 2 decimals (e.g., $2,200)
- **SF columns:** Right-aligned, no decimals, comma separator
- **Dates:** MM/DD/YYYY format
- **Status:** Occupied = green background, Vacant = orange background
- **Growth Potential:** Green if positive, red if negative
- **Grid:** TanStack Table (preferred), sortable/filterable on all columns
- **Orientation:** Landscape (wide to accommodate 13 columns)
- **Print:** Fit to 1 page if ≤120 units; if larger, use multi-page with header row repeating

## Pending Inputs
- Market rent data (currently 113 units, all populated in discovery)
- Tenant name data validation (some units may have "Vacant" as placeholder)
- Lease start/end dates for all occupied units
- Current rent amounts (reconcile with Operating Statement revenue)

## Sample Layout

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║ CHADRON TERRACE — RENT ROLL SUMMARY (As of 03/14/2026)                           ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║ Occupancy: 90.3% (102/113)  │  Avg Current Rent: $2,200  │  Avg Market Rent: $2,477 ║
║ Growth Potential: +12.6%    │  Monthly Income: $224.4k   │  Rent/SF: $2.09          ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║ Unit # │ Plan      │ Bed │ Bath │   SF │ Tenant         │ Status   │ Lease Start │ Lease End  │ Current Rent │ Market Rent │ Loss to Lease │  $/SF │
╠════════════════════════════════════════════════════════════════════════════════════╣
║ 101    │ 1BR/1BA   │  1  │  1   │ 650  │ Smith, J.      │ Occupied │ 06/01/2024  │ 05/31/2025 │    $1,500    │    $1,650   │     $150      │ $2.31 │
║ 102    │ 1BR/1BA   │  1  │  1   │ 650  │ Vacant         │ Vacant   │             │            │       —      │    $1,650   │    $1,650     │   —   │
║ 201    │ 2BR/2BA   │  2  │  2   │ 1035 │ Johnson, M.    │ Occupied │ 09/15/2023  │ 09/14/2026 │    $2,100    │    $2,350   │     $250      │ $2.03 │
║ ...    │ ...       │ ... │ ...  │ ...  │ ...            │ ...      │ ...         │ ...        │      ...     │     ...     │      ...      │ ...   │
║ 1301   │ 3BR/2BA   │  3  │  2   │ 1289 │ Williams, T.   │ Occupied │ 01/10/2025  │ 01/09/2027 │    $2,700    │    $2,950   │     $250      │ $2.09 │
╠════════════════════════════════════════════════════════════════════════════════════╣
║ TOTAL  │           │     │      │104,655│              │ 102/113  │             │            │ $224,400 (mo)│ $279,481   │   $55,081     │ $2.09 │
╚════════════════════════════════════════════════════════════════════════════════════╝
```

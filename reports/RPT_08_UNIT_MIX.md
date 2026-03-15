# Report 8: Unit Mix Summary

## Overview
- **Property Types:** Multifamily
- **Data Readiness:** READY
- **Primary Data Source(s):** Unit table (`tbl_unit` grouped by plan), Rent Roll tab
- **ARGUS Equivalent:** Unit Occupancy, Unit Audit
- **Peoria Lakes Equivalent:** Not applicable (Land Dev)

## Column Layout
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Floor Plan | Text | tbl_unit.plan_name | Yes |
| 2 | Bed | Integer | tbl_unit.bed_count | Yes |
| 3 | Bath | Decimal | tbl_unit.bath_count | Yes |
| 4 | Avg SF | Integer | AVG(tbl_unit.square_feet) by plan | Yes |
| 5 | # Units | Integer | COUNT(*) by plan | Yes |
| 6 | % of Total | Percent | (Units this plan / Total units) × 100 | Calculated |
| 7 | Avg Current Rent | Currency | AVG(current rent) by plan (occupied only) | Yes |
| 8 | Avg Market Rent | Currency | AVG(market_rent) by plan | Yes |
| 9 | $/SF | Currency | Avg Market Rent / Avg SF | Calculated |
| 10 | Rental Revenue | Currency | (Occupied units × Avg Current Rent × 12) by plan | Calculated |

## Row Structure

**Header Row (property summary):**
- Property Name: Chadron Terrace
- Total Units: 113
- Avg Property $/SF: $2.09 (weighted by unit)

**Detail Rows (one per floor plan, sorted by bed count ascending, then bath ascending):**
- 1BR/1BA
- 2BR/2BA
- 3BR/2BA
- Commercial
- Office

**Subtotal Row (optional, after all residential plans):**
- "Residential (5 plans)" or similar
- Calculations exclude Commercial/Office if reporting separately

**Total Row (at bottom):**
- Floor Plan: "TOTAL"
- Bed/Bath: Blank
- Avg SF: Weighted average across all units
- # Units: SUM (113)
- % of Total: 100%
- Avg Current Rent: Weighted average (all occupied)
- Avg Market Rent: Weighted average (all units)
- $/SF: Weighted average
- Rental Revenue: SUM (annual revenue all plans)

## Section Breakdown

1. **Header Block:** Property name, summary totals (units, occupancy if relevant)
2. **Unit Mix Grid:** One row per floor plan + Totals
3. **Footer:** Data as-of date, assumptions (e.g., "Current Rent from active leases; Market Rent from market study")

## Formatting Notes
- **Bed/Bath:** Right-aligned, integers/decimals as applicable
- **Avg SF:** Right-aligned, no decimals, comma separator (e.g., 1,035)
- **# Units:** Right-aligned, bold if >20% of total
- **% of Total:** Right-aligned, percent format (e.g., 46.9%), bold if >30%
- **Currency columns:** Right-aligned, $ symbol, 2 decimals (e.g., $2,100)
- **Rental Revenue:** Right-aligned, formatted as annual (e.g., $1,292,400)
- **Grid:** TanStack Table, sortable on all columns, no filtering required
- **Orientation:** Portrait (10 columns, compact layout)
- **Print:** Fit to 1 page (5 plans + total row = 6 data rows)

## Pending Inputs
- Commercial unit market rent data (currently $4,397; verify)
- Office unit rent (currently no rent; may be owner-occupied or non-revenue-generating)
- Occupancy rate by plan (discovery provides total 90.3%; break down by plan if available)

## Sample Layout

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                  CHADRON TERRACE — UNIT MIX SUMMARY                                 ║
║                       As of 03/14/2026                                              ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║ Total Units: 113  │  Avg Property $/SF: $2.09  │  Total Annual Revenue: $2,693,258 ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║ Floor Plan    │ Bed │ Bath │ Avg SF │ # Units │ % Total │ Avg Current Rent │ Avg Market Rent │  $/SF  │ Annual Revenue │
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║ 1BR/1BA       │  1  │  1   │  650   │   22    │  19.5%  │     $1,543       │      $1,650     │ $2.54  │   $408,072     │
║ 2BR/2BA       │  2  │  2   │ 1,035  │   53    │  46.9%  │     $2,136       │      $2,350     │ $2.27  │  1,358,496     │
║ 3BR/2BA       │  3  │  2   │ 1,289  │   33    │  29.2%  │     $2,667       │      $2,850     │ $2.21  │  1,058,772     │
║ Commercial    │  —  │  —   │ 1,101  │    4    │   3.5%  │     $4,397       │      $4,500     │ $4.09  │   210,656      │
║ Office        │  —  │  —   │  446   │    1    │   0.9%  │        —         │         —       │   —    │        —       │
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║ TOTAL         │     │      │ 1,000* │  113    │ 100.0%  │     $2,200       │      $2,477     │ $2.09  │  $3,035,996    │
╚═══════════════════════════════════════════════════════════════════════════════════════╝
* Weighted average square feet
```

## Notes
- Office unit (1 unit, 446 SF) is shown for completeness but generates no rental revenue (owner-occupied or common area)
- Commercial rent average ($4,397/month) is significantly higher than residential; may warrant separate reporting if desired
- Annual Revenue calculation assumes 90.3% occupancy applied proportionally across residential plans (or use occupied unit actuals by plan if available)

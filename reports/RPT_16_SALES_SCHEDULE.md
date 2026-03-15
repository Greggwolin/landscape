# Report 16: Sales Schedule

## Overview
- **Property Types:** Land Development
- **Data Readiness:** DESIGN ONLY (pricing and absorption assumptions not yet configured)
- **Primary Data Source(s):** Sales tab (parcel pricing by use type), Containers tab (unit counts), Cash Flow assumptions
- **ARGUS Equivalent:** Income Forecast > Sales / Absorption Schedule
- **Peoria Lakes Equivalent:** r.Sales

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Phase | Text | `tbl_container` (L2, level_label='Phase') | ✅ |
| 2 | Product Type | Text | `lu_type.name` (SFD, MF, MX, RET, PARK, etc.) | ✅ |
| 3 | Units/Parcels | Integer | Count of containers (L3) grouped by Use Type within Phase | ✅ |
| 4 | Gross Acres | Decimal(8,2) | Sum of `tbl_container.metadata.gross_acres` | ✅ |
| 5 | Start Month | Text/Date | `tbl_sale_parcel_pricing.launch_month` (user-configured absorption start) | 🔧 DESIGN |
| 6 | Sales Rate | Decimal(4,2) | `units_sold_per_month` or `acres_sold_per_month` (user-configured) | 🔧 DESIGN |
| 7 | Duration (months) | Integer | `units / sales_rate` (calculated) | 🔧 DESIGN |
| 8 | End Month | Text/Date | `start_month + duration` (calculated) | 🔧 DESIGN |
| 9 | Avg Unit Price | Currency | `tbl_sale_parcel_pricing.avg_price` (per unit or per acre) | 🔧 DESIGN |
| 10 | Gross Revenue | Currency | `units * avg_unit_price` (calculated) | 🔧 DESIGN |
| 11 | Selling Costs (4%) | Currency | `gross_revenue * 0.04` (calculated, configurable %) | 🔧 DESIGN |
| 12 | Net Revenue | Currency | `gross_revenue - selling_costs` (calculated) | 🔧 DESIGN |

## Row Structure

**Hierarchical grouping:** Phase > Product Type (2 levels)

```
PHASE 1.1: Early Infrastructure
├─ SFD (Single Family) — 16 units | 2.5 ac | Start: Month 3 | Rate: 2 units/month | End: Month 11
│  Avg Price: $450K/unit | Gross Revenue: $7.2M | Selling Costs: $288K | Net Revenue: $6.912M
├─ RET (Retail) — 1 parcel | 2.5 ac | Start: Month 6 | Rate: 0.5 units/month | End: Month 8
│  Avg Price: $500K/acre | Gross Revenue: $1.25M | Selling Costs: $50K | Net Revenue: $1.2M
└─ Phase 1.1 Subtotal: 17 units/parcels | 5.0 ac | Total Gross: $8.45M | Total Selling Costs: $338K | Total Net: $8.112M

PHASE 1.2: Mid Development
├─ MX (Mixed Use) — 120 units | 4.2 ac | Start: Month 12 | Rate: 8 units/month | End: Month 27
│  Avg Price: $350K/unit | Gross Revenue: $42M | Selling Costs: $1.68M | Net Revenue: $40.32M
└─ Phase 1.2 Subtotal: 120 units | 4.2 ac | Total Gross: $42M | Total Selling Costs: $1.68M | Total Net: $40.32M

PHASE 2.1: Later Phases
├─ SFD — 18 units | 3.0 ac | Start: Month 24 | Rate: 3 units/month | End: Month 30
│  Avg Price: $475K/unit | Gross Revenue: $8.55M | Selling Costs: $342K | Net Revenue: $8.208M
└─ Phase 2.1 Subtotal: 18 units | 3.0 ac | Total Gross: $8.55M | Total Selling Costs: $342K | Total Net: $8.208M

GRAND TOTAL
├─ Total Units: 1,240 | Total Acres: 185 | Total Gross Revenue: $412.8M | Total Selling Costs: $16.5M | Total Net Revenue: $396.3M
├─ Absorption Period: Month 3 – Month 48 (45 months / 3.75 years)
├─ Avg Monthly Pace: ~27 units/month (variable by phase)
```

## Section Breakdown

1. **Summary Card (above table)**
   - Total Units/Parcels, Total Gross Acres, Total Gross Revenue, Total Net Revenue (after selling costs), Absorption Start Month, Absorption End Month, Total Duration, Avg Monthly Pace

2. **Sales Detail Grid** (main)
   - Grouped by Phase
   - Within each Phase, grouped by Product Type (Use Type)
   - Each product type row shows: Units, Acres, Start/End months, Sales Rate, Unit Price, Revenue

3. **Phase Subtotal Rows** (after each product type group)
   - Sum: Units, Acres, Gross Revenue, Selling Costs, Net Revenue
   - Weighted Avg: Unit Price, Sales Rate

4. **Grand Total Row** (at bottom)
   - Sum: Units, Acres, Gross Revenue, Selling Costs, Net Revenue
   - Duration: Month X to Month Y (absorption period)
   - Avg monthly unit/parcel absorption rate

## Formatting Notes

- **Landscape orientation** (wider columns for timeline and revenue)
- **Currency formatting:** $0M or $0K (millions/thousands notation)
- **Decimal precision:** Currency (2 decimals); Units (0); Rate (2 decimals per period, e.g., "2.5 units/month")
- **Date/Month notation:** "Month 3" or calendar (Jan-26, Feb-26...); allow toggle between month-number and calendar
- **Status badges:** Not Started (gray), In Progress (blue), Complete (green)
- **Absorption curve visualization (optional):** Chart above table showing unit sales ramp over time by product type (stacked area)
- **Sensitivity inputs:** Allow user to adjust Sales Rate, Avg Unit Price by row; cascade to Revenue calculations; show "what-if" scenarios
- **Grouping:** Phase rows bold; Product Type rows normal; Subtotal rows shaded light gray
- **Export:** CSV, Excel (preserves formulas for sensitivity scenarios)

## Pending Inputs

### Critical (Must Configure Before Revenue Appears)

1. **Parcel Pricing by Use Type**
   - Navigate: Sales tab → Land Use Pricing section
   - Input: Avg price per unit (or per acre for land parcels) by Use Family + Type
   - Example: SFD → $450K/unit, RET → $500K/acre, MF Apartments → $350K/unit
   - Status: Currently shows "No parcels configured"

2. **Absorption Schedule (Start Months & Sales Rates)**
   - Navigate: Sales tab → Phase cards (or inline in report)
   - Input per Phase/Product Type:
     - Launch Month (when sales begin)
     - Sales Rate (units/month or acres/month)
   - Example: Phase 1.1 SFD starts Month 3 at 2 units/month
   - Status: Not yet implemented

3. **Selling Costs %**
   - Default: 4% (from cash flow assumptions)
   - Allow override per Phase or Product Type
   - Include: real estate commissions, closing costs, marketing (if applicable to land sales)

### Secondary (Enhancements)

- **Bulk sale option:** ARGUS allows "bulk sale at end" (e.g., unsold parcels sold in Year 15 as lump sum). If applicable, add row: "Remaining inventory — bulk sale Month 180 at 80% of market price"
- **Contingency absorption:** Add user toggle: "Assume 90% absorption" or "Conservative case: 75% absorption"
- **Phase overlap:** Allow start/end month flexibility (e.g., Phase 1.2 can launch before Phase 1.1 completes)

## Sample Layout

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SALES SCHEDULE — Peoria Meadows (Project 9)                                                                    │
│ Summary: 1,240 Units | 185 Acres | $412.8M Gross | $396.3M Net | Absorption: Month 3–48 (3.75 years)         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase   │ Type  │ Units │ Acres │ Start   │ Rate    │ End     │ Avg Price │ Gross Rev  │ Selling Costs │ Net  │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1.1     │ SFD   │ 16    │ 2.50  │ Month 3 │ 2/month │ Month 11│ $450K     │ $7.2M      │ $288K ✅      │$6.9M │
│         │ RET   │ 1     │ 2.50  │ Month 6 │ 0.5/mo  │ Month 8 │ $500K/ac  │ $1.25M     │ $50K ✅       │$1.2M │
│ Phase 1.1 Subtotal                                                        │ $8.45M     │ $338K         │$8.1M │
│         │       │       │       │         │         │         │           │            │               │      │
│ 1.2     │ MX    │ 120   │ 4.20  │ Month 12│ 8/month │ Month 27│ $350K     │ $42M       │ $1.68M ✅     │$40.3M│
│ Phase 1.2 Subtotal                                                        │ $42M       │ $1.68M        │$40.3M│
│         │       │       │       │         │         │         │           │            │               │      │
│ 2.1     │ SFD   │ 18    │ 3.00  │ Month 24│ 3/month │ Month 30│ $475K     │ $8.55M     │ $342K ✅      │$8.2M │
│ Phase 2.1 Subtotal                                                        │ $8.55M     │ $342K         │$8.2M │
│         │       │       │       │         │         │         │           │            │               │      │
│ ...     │ ...   │ ...   │ ...   │ ...     │ ...     │ ...     │ ...       │ ...        │ ...           │ ...  │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ GRAND TOTAL                              │ 1,240   │ 185 ac  │           │ $412.8M    │ $16.5M        │$396.3M
│ Absorption: Month 3 to Month 48 (45 months) | Avg Pace: 27.6 units/month                                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Absorption Curve (Optional Visualization)

```
     Units Sold
     │     
     │      ╱╲   ╱───────────╲      ╱─────────────╲
  120├────╱  ╲ ╱             ╲────╱               ╲──────
     │   ╱    ╲╱              ╲                   
  100├  ╱      SFD  MX        RET   SFD    MX     MX
     │ ╱                                          
   80├╱
     │
   60├
     │
   40├
     │     1.1   1.2        1.3      2.1    2.2   2.3+
   20├
     │
    0└─────────────────────────────────────────────────────
     M1  M6   M12  M18  M24  M30  M36  M42  M48  M54+
     Phase Absorption Timeline (months)
```

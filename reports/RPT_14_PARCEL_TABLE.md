# Report 14: Parcel Table

## Overview
- **Property Types:** Land Development
- **Data Readiness:** READY (parcel inventory complete; pricing columns DESIGN ONLY)
- **Primary Data Source(s):** Containers tab (parcel-level data), Sales tab (pricing when configured)
- **ARGUS Equivalent:** Property Summary > Parcel Inventory
- **Peoria Lakes Equivalent:** r.ParcelTable

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Area (Village) | Text | `tbl_container` (L1, level_label='Area') | ✅ |
| 2 | Phase | Text | `tbl_container` (L2, level_label='Phase') | ✅ |
| 3 | Parcel # | Text | `tbl_container` (L3, level_label='Parcel') | ✅ |
| 4 | Use Family | Text | `lu_family.name` | ✅ |
| 5 | Use Type | Badge | `lu_type.name` (SFD, MF, MX, SFA, BTR, PARK, RET) | ✅ |
| 6 | Product | Text | `lu_product.name` (e.g., "50×125", "APTS") | ✅ |
| 7 | Gross Acres | Decimal(8,2) | `tbl_container.metadata.gross_acres` | ✅ |
| 8 | Net Acres | Decimal(8,2) | `tbl_container.metadata.net_acres` | ✅ |
| 9 | Units | Integer | `tbl_container.metadata.units` | ✅ |
| 10 | DUA | Decimal(4,1) | `units / net_acres` (calculated) | ✅ |
| 11 | FF/Acre | Integer | `tbl_container.metadata.front_footage / gross_acres` (calculated) | ✅ |
| 12 | Lot Width (ft) | Integer | `tbl_container.metadata.lot_width` | ⚠️ Partial |
| 13 | Lot Depth (ft) | Integer | `tbl_container.metadata.lot_depth` | ⚠️ Partial |
| 14 | Avg Price ($/unit or $/acre) | Currency | `tbl_sale_parcel_pricing.avg_price` (filtered by use_type) | 🔧 DESIGN |
| 15 | Total Revenue | Currency | `avg_price * units` or `avg_price * gross_acres` (calculated) | 🔧 DESIGN |

## Row Structure

**Hierarchical grouping:** Area > Phase > Parcel (3 levels)

```
AREA 1: Village North
├─ PHASE 1.1: Early Infrastructure
│  ├─ Parcel 1.1.A | Residential | SFD    | 50×125  | 2.50 ac | 16 units | 6.4 DUA | ...
│  ├─ Parcel 1.1.B | Residential | SFD    | 50×125  | 3.00 ac | 19 units | 6.3 DUA | ...
│  └─ Phase 1.1 Subtotal: [5 parcels | 12.5 ac | 87 units | ... ]
├─ PHASE 1.2: Mid Development
│  ├─ Parcel 1.2.A | Mixed Use   | MX     | APTS+RT | 4.20 ac | 120 units | 28.6 DUA | ...
│  └─ Phase 1.2 Subtotal: [2 parcels | 8.3 ac | 156 units | ... ]
└─ Area 1 Subtotal: [7 parcels | 20.8 ac | 243 units | ... ]

AREA 2: Village Central
├─ PHASE 2.1: ...
...

GRAND TOTAL: [42 parcels | 185 ac | 1,240 units | avg DUA 6.7 | avg FF/Acre 285 ft ]
```

## Section Breakdown

1. **Summary Card (above table)**
   - Total Parcels, Total Gross Acres, Total Net Acres, Total Units, Planning Efficiency (57%), Avg DUA, Avg FF/Acre

2. **Parcel Detail Grid** (main)
   - Grouped by Area > Phase
   - Each group collapsible
   - Row-level actions: View details, Edit use type/product, View sales pricing (when configured)

3. **Subtotal Rows** (after each Phase, each Area)
   - Columns: Parcel # (empty), Use Family/Type (empty), Product (empty), Gross/Net Acres (sum), Units (sum), DUA (avg or total), FF/Acre (avg), Avg Price (avg), Total Revenue (sum)
   - Bold or shaded background

4. **Grand Total Row** (at bottom)
   - Same subtotal format
   - All metrics summed/averaged across entire project

## Formatting Notes

- **Landscape orientation** (wider columns, full-width parcel table)
- **Use Type badges:** Colored pills (SFD=blue, MF=purple, MX=orange, RET=green, PARK=gray)
- **Decimal precision:** Acres (2), DUA (1), FF/Acre (0 integer), Price (0 or 2 decimals per project convention)
- **Grouping:** Collapsed/expanded toggle per Area; individual Phase rows collapsible within each Area
- **Sorting:** Fixed by hierarchy (Area > Phase > Parcel number); allow secondary sort by Use Type or Units
- **Frozen columns:** Area, Phase, Parcel # (left 3 columns sticky on horizontal scroll)
- **Export:** CSV, Excel (with subtotals honored)

## Pending Inputs

- **Sales Pricing:** `tbl_sale_parcel_pricing` empty (configure pricing by Use Type in Sales tab first)
- **Lot dimensions:** `lot_width`, `lot_depth` partially populated (backlog to complete GIS integration)
- **Selling costs:** If pricing configured, apply 4% factor for Net Revenue calculation (per cash flow assumptions)

## Sample Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PARCEL TABLE — Peoria Meadows (Project 9)                                                              │
│ Summary: 42 Parcels | 185 Gross Acres | 157 Net Acres | 1,240 Units | 57% Planning Efficiency         │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Area │ Phase │ Parcel │ Family     │ Type │ Product  │ Gross Ac │ Net Ac │ Units │ DUA │ FF/Ac │...    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ V-N  │ 1.1   │ 1.1.A  │ Residential│ SFD  │ 50×125   │ 2.50     │ 2.25   │ 16    │ 7.1 │ 265   │...    │
│      │       │ 1.1.B  │ Residential│ SFD  │ 50×125   │ 3.00     │ 2.70   │ 19    │ 7.0 │ 280   │...    │
│      │       │ 1.1.C  │ Commercial │ RET  │ 10k SF   │ 2.50     │ 2.50   │ —     │ —   │ 420   │...    │
│      │ 1.1 Subtotal   │            │      │          │ 8.00     │ 7.45   │ 35    │ 4.7 │ 312   │...    │
│      │       │        │            │      │          │          │        │       │     │       │        │
│      │ 1.2   │ 1.2.A  │ Mixed Use  │ MX   │ APTS+RT  │ 4.20     │ 3.90   │ 120   │28.6 │ 385   │...    │
│      │ 1.2 Subtotal   │            │      │          │ 4.20     │ 3.90   │ 120   │28.6 │ 385   │...    │
│ V-N Subtotal          │            │      │          │ 12.20    │ 11.35  │ 155   │ 13.7│ 333   │...    │
│ V-C  │ 2.1   │ ...    │            │      │          │ ...      │ ...    │ ...   │ ... │ ...   │...    │
│ ...  │ ...   │ ...    │            │      │          │ ...      │ ...    │ ...   │ ... │ ...   │...    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ GRAND TOTAL                                          │ 185.00   │ 157.15 │ 1,240 │ 7.9 │ 287   │...    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

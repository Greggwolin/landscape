# Report 11: Sales Comparison Grid

## Overview
- **Property Types:** MF (Multifamily)
- **Data Readiness:** READY
- **Primary Data Source(s):** Sales Comparison tab (Subject property + Comparable properties table)
- **ARGUS Equivalent:** Market Data / Comparable Properties report
- **Peoria Lakes Equivalent:** Not applicable (MF valuation only)

---

## Report Purpose
Displays subject property and three comparable properties side-by-side for market-based valuation analysis. Supports adjustment analysis by category (Transaction, Market Conditions, Location, Physical) leading to indicated value per unit and per square foot.

---

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Property Identifier | Text | Sales Comparison table | ✅ |
| 2 | Location | Text | Comparable address/city | ✅ |
| 3 | Sale Date | Date (MMM-YY) | Transaction date | ✅ |
| 4 | Sale Price ($) | Currency | Sales price total | ✅ |
| 5 | Price/Unit ($) | Currency | Sale Price ÷ Units | ✅ |
| 6 | Price/SF ($) | Currency | Sale Price ÷ Building SF | ✅ |
| 7 | Units | Integer | Unit count | ✅ |
| 8 | Building SF | Integer | Total building square feet | ✅ |
| 9 | Cap Rate (%) | Percentage | Implied cap rate at sale | ✅ |
| 10 | Year Built | Year | Construction year | ✅ |

---

## Row Structure

**Header Row:**
- Subject property name (bold, colored background to distinguish)
- Comparable 1, Comparable 2, Comparable 3

**Core Data Rows (grouped):**
1. Location
2. Sale Date
3. Sale Price
4. Price/Unit
5. Price/SF
6. Units
7. Building SF
8. Cap Rate
9. Year Built

**Adjustment Section (grouped under "Adjustments"):**
10. Transaction Type (e.g., Arm's Length, Distressed)
11. Market Conditions (e.g., Interest Rates, Supply)
12. Location (e.g., Neighborhood, Proximity to Transit)
13. Physical (e.g., Condition, Renovations, Building Age)
14. Operational (e.g., Occupancy, Rent Growth History)
15. Other (custom adjustments)
16. **Net Adjustment %** (sum of all % adjustments)
17. **Adjusted Price/Unit** (Price/Unit × (1 + Net Adjustment %))
18. **Adjusted Price/SF** (Price/SF × (1 + Net Adjustment %))

---

## Section Breakdown

### Section 1: Property Summary
Displays side-by-side columns for Subject and three Comps. Each column shows:
- Property name (header)
- Location
- Sale date
- Core metrics: Price, Units, Building SF, Cap Rate, Year Built

**Example (Chadron Terrace):**
| Metric | Subject (Chadron Terrace) | Comp 1 (Playa Vista) | Comp 2 (Culver City) | Comp 3 (LA) |
|--------|---------------------------|----------------------|----------------------|-------------|
| Location | Hawthorne | Playa Vista | Culver City | Los Angeles |
| Sale Date | Feb-26 | Apr-24 | Feb-24 | Jan-24 |
| Sale Price | TBD | $122.10M | $67.70M | $49.50M |
| Price/Unit | TBD | $571K | $501K | $387K |
| Price/SF | TBD | $554 | $495 | $628 |
| Units | 113 | 214 | 135 | 128 |
| Building SF | 138,504 | — | — | — |
| Cap Rate | — | 4.3% | 5.3% | — |
| Year Built | 2016 | 2003 | 2019 | 2022 |

### Section 2: Adjustment Analysis
Expandable/collapsible subsections for each adjustment category:

**Transaction Adjustments**
- Arm's Length vs. Distressed: [+/- %]
- Time on Market: [+/- %]
- Seller Motivation: [+/- %]

**Market Condition Adjustments**
- Interest Rate Environment: [+/- %]
- Supply/Demand Dynamics: [+/- %]
- Economic Growth (Local): [+/- %]

**Location Adjustments**
- Proximity to CBD: [+/- %]
- Transit Accessibility: [+/- %]
- Neighborhood Desirability: [+/- %]

**Physical Adjustments**
- Building Condition: [+/- %]
- Recent Renovations: [+/- %]
- Age (vs. Subject): [+/- %]

**Operational Adjustments**
- Occupancy Rate: [+/- %]
- Rent Growth History: [+/- %]
- Tenant Quality: [+/- %]

### Section 3: Indicated Values
Summary row showing:
- Net Adjustment % per comparable
- Adjusted Price/Unit per comparable
- Adjusted Price/SF per comparable
- Indicated Value Range (min, max)
- Indicated Value (selected comparable weighting or average)

### Section 4: Map Reference
Embedded map showing Subject and three Comp locations (pins, color-coded for comp 1/2/3). Clickable pins display property name, location, sale price, price/unit.

---

## Formatting Notes

**Layout:** Landscape (11" × 8.5") — allows 4 columns (Subject + 3 Comps) to render without horizontal scroll at standard zoom.

**Column Widths:**
- Metric column (first column): 150px (fixed)
- Subject + Comps columns: equal width, auto-distribute remaining space

**Color Coding:**
- Subject property header: Distinct background (e.g., light gray/tan) with bold text
- Comparable headers: Standard background
- Adjustment rows: Alternating light gray for readability
- Net Adjustment % row: Bolder border, highlighted background
- Adjusted Price/Unit and Adjusted Price/SF rows: Highlighted (yellow/light green) to draw attention to indicated values

**Number Formatting:**
- Currency: $X,XXX,XXX (no cents for large figures); $XXX/unit, $XX/SF (with cents)
- Percentages: X.X% (one decimal)
- Dates: MMM-YY (Feb-26)
- Years: YYYY (2016)

**Grid Lines:** 
- Horizontal lines between metric groups
- No vertical lines between Subject and Comps (whitespace separation only)

---

## Pending Inputs

1. **Subject Sale Price & Terms:** Currently null. Will be populated when Subject comparable data is entered or inferred from valuation workflow.
2. **Adjustment Basis Documentation:** Each adjustment percentage should reference source (appraisal report, market research, Landscaper analysis). Display as tooltip or expandable note.
3. **Comp Source & Confidence Level:** Add optional "Data Source" row (e.g., CBRE, CoStar, MLS) and confidence flag (High/Medium/Low).
4. **Weighting Methodology:** Indicate which comparable(s) are most comparable and how subject value indication is calculated (e.g., weighted average of adjusted prices, or single most comparable).

---

## Sample Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Report 11: Sales Comparison Grid                                               │
│ Property: Chadron Terrace | Project: Hawthorne MF Development | Date: Mar 2026 │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Metric              │ Subject          │ Comp 1           │ Comp 2           │
│                     │ (Chadron Terrace)│ (Playa Vista)    │ (Culver City)    │
├─────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Location            │ Hawthorne, CA    │ Playa Vista, CA  │ Culver City, CA  │
│ Sale Date           │ —                │ Apr-24           │ Feb-24           │
│ Sale Price          │ —                │ $122,100,000     │ $67,700,000      │
│ Price/Unit          │ —                │ $571,000         │ $501,000         │
│ Price/SF            │ —                │ $554             │ $495             │
│ Units               │ 113              │ 214              │ 135              │
│ Building SF         │ 138,504          │ —                │ —                │
│ Cap Rate            │ —                │ 4.3%             │ 5.3%             │
│ Year Built          │ 2016             │ 2003             │ 2019             │
├─────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ ADJUSTMENTS         │                  │                  │                  │
├─────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Transaction Type    │ —                │ +2.5%            │ +1.0%            │
│ Market Conditions   │ —                │ -1.5%            │ +3.0%            │
│ Location            │ —                │ -2.0%            │ +1.5%            │
│ Physical Condition  │ —                │ -4.0%            │ -2.5%            │
│ Operational         │ —                │ +1.0%            │ +0.5%            │
├─────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ NET ADJUSTMENT %    │ —                │ -4.0%            │ +3.5%            │
│ Adj. Price/Unit     │ —                │ $548,000         │ $518,000         │
│ Adj. Price/SF       │ —                │ $531             │ $512             │
└─────────────────────┴──────────────────┴──────────────────┴──────────────────┘

Indicated Value (Subject): $515,000/unit (average of adjusted comps)
Value Range: $509,000 - $521,000/unit

[MAP: Subject pin + 3 Comp pins on interactive map]
```

---

## Data Dependencies

- **Sales Comparison tab:** Comparable CRUD table with transaction details
- **Market Intelligence data:** Cap rates, transaction dates, property attributes
- **Adjustment matrix:** Stored per comparable or project-level adjustment guidelines
- **Geography data:** Latitude/longitude for map rendering

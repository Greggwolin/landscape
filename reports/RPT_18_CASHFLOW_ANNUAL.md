# Report 18: Cash Flow — Annual

## Overview
- **Property Types:** Land Development
- **Data Readiness:** PARTIAL (costs populated, revenue zero pending pricing)
- **Primary Data Source(s):** `core_fin_fact_budget`, `core_fin_fact_actual`, project container hierarchy
- **ARGUS Equivalent:** Development: Cash Flow — Summary (Annual)
- **Peoria Lakes Equivalent:** r.CFa

---

## Purpose

Annual-view development cash flow showing full project lifecycle revenue, costs, and net cash position by fiscal year. Aggregates monthly/quarterly granularity into yearly totals. Used for high-level equity return analysis, debt service scheduling, and bulk-sale scenario modeling.

---

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| Row | Category | TEXT | Budget hierarchy | ✅ |
| C1 | 2026 | CURRENCY | SUM(monthly budget where year=2026) | ✅ |
| C2 | 2027 | CURRENCY | SUM(monthly budget where year=2027) | ✅ |
| C3 | 2028 | CURRENCY | SUM(monthly budget where year=2028) | ✅ |
| C4 | 2029 | CURRENCY | SUM(monthly budget where year=2029) | ✅ |
| C5 | 2030 | CURRENCY | SUM(monthly budget where year=2030) | ✅ |
| C6 | 2031 | CURRENCY | SUM(monthly budget where year=2031) | ✅ |
| C7 | 2032 | CURRENCY | SUM(monthly budget where year=2032) | ✅ |
| C8 | 2033+ | CURRENCY | SUM(monthly budget where year>=2033) | ✅ |
| Total | Total (All Years) | CURRENCY | SUM(C1:C8) | ✅ |

---

## Row Structure

### Revenue Section
```
REVENUE
├── Gross Revenue (bulk sale proceeds, lot sales, etc.)
├── Selling Costs (@ 4% of gross)
└── **Net Revenue** [bold subtotal]
```

### Project Costs Section
```
PROJECT COSTS
├── Land Acquisition (Peoria Meadows land purchase — $104M in 2026)
├── Planning & Entitlements (spreads across years)
│   ├── Legal & Environmental
│   ├── Engineering & Design
│   ├── Approvals & Permitting
│   └── Utility Coordination
├── Development Costs (infrastructure build-out)
│   ├── Site Preparation
│   ├── Utilities (water, sewer, electric, gas)
│   ├── Roads & Circulation
│   ├── Common Areas & Amenities
│   └── General Conditions & Overhead
└── Financing Costs (construction loan related)
    ├── Origination & Closing Costs
    ├── Interest Reserve
    └── Other Lender Fees
```

### Project Totals Section
```
PROJECT TOTALS
├── Total Revenue (gross + adjustments)
├── Total Project Costs (all cost categories)
├── Total Financing Costs
├── Net Cash Flow (Revenue - Costs)
└── **Cumulative Cash Flow** [bold running total, drives waterfall]
```

---

## Section Breakdown

### 1. Revenue
- **Row: Gross Revenue** — Typically zero during development phase; populated when bulk sale occurs (Year 15 per DCF model or user override)
- **Row: Selling Costs** — Calculated as 4% × Gross Revenue (user-adjustable on Project Config tab)
- **Row: Net Revenue** — Subtotal: Gross Revenue - Selling Costs (background: light gray)

### 2. Project Costs (Expanded by Stage & Category)
- **Land Acquisition:** Single line showing $104M in 2026
- **Planning & Entitlements:** Grouped under single expandable header (shows subtotal per year); drills to legal, eng, approvals, utilities
- **Development Costs:** Grouped under single expandable header; drills to site prep, utilities, roads, common areas, G&A
- **Financing Costs:** Grouped; drills to origination, interest reserve, fees

Each category row shows annual breakout. Subtotals appear in bold with light background.

### 3. Project Totals
- **Total Revenue:** SUM(Gross Revenue) - applies to all years where revenue exists
- **Total Project Costs:** SUM(all cost categories)
- **Total Financing Costs:** SUM(financing section)
- **Net Cash Flow:** Total Revenue - Total Project Costs - Total Financing Costs (per year)
- **Cumulative Cash Flow:** Running sum from 2026 through year shown; row background highlights negative cumulative (red tint)

---

## Formatting Notes

1. **Column width:** Year columns auto-size to widest content (typically 6–7 char for formatted currency)
2. **Number format:** Currency with 0 decimals ($1,234,567), thousands separator
3. **Negative values:** Wrapped in parentheses; text color red
4. **Subtotals:** Bold font, light gray background (#f5f5f5 or CoreUI `--cui-light`)
5. **Grand totals:** Bold + slightly darker background (#e8e8e8)
6. **Cumulative row:** Highlight cells with red tint if value is negative
7. **Expandable rows:** Planning/Development/Financing sections collapsible; default: expanded
8. **Header freeze:** Category column (Row) pinned; year columns scroll horizontally
9. **Alignment:** Category names left-aligned; currency values right-aligned

---

## Data Transformation Logic

```
For each Year in [2026..2033+]:
  Gross Revenue = SUM(budget items where category='Revenue' AND year=Year)
  Selling Costs = Gross Revenue × 4%
  Net Revenue = Gross Revenue - Selling Costs
  
  Land Acq = SUM(budget where category='Land Acquisition' AND year=Year)
  P&E = SUM(budget where category='Planning & Entitlements' AND year=Year)
  DevCosts = SUM(budget where category='Development Costs' AND year=Year)
  FinCosts = SUM(budget where category='Financing Costs' AND year=Year)
  
  Total Costs = Land Acq + P&E + DevCosts + FinCosts
  Net CF = Net Revenue - Total Costs
  
  Cumulative CF[Year] = Cumulative CF[Year-1] + Net CF[Year]
```

Apply cost inflation (3% annually) to P&E and DevCosts per project DCF settings.

---

## Pending Inputs

- [ ] Gross Revenue amounts for bulk sale year (Year 15 or per user entry on Valuation > Assumptions)
- [ ] Verification that all 96 planning/entitlements and development cost line items are correctly mapped to phases and years
- [ ] Financing cost detail (loan origination %, interest reserve calculation, other lender fees)
- [ ] Confirmation of selling cost % (assumed 4%, user-configurable?)

---

## Sample Layout

```
PEORIA MEADOWS DEVELOPMENT PROJECT
Cash Flow — Annual Summary
Discount Rate: 20% | Cost Inflation: 3%

                          2026         2027         2028         2029         2030         2031         2032       2033+        TOTAL
REVENUE
Gross Revenue             $0           $0           $0           $0           $0           $0           $0      $85,465,000   $85,465,000
Selling Costs             $0           $0           $0           $0           $0           $0           $0      $(3,418,600)  $(3,418,600)
Net Revenue               $0           $0           $0           $0           $0           $0           $0      $82,046,400   $82,046,400

PROJECT COSTS
Land Acquisition          $104,000,000 $0           $0           $0           $0           $0           $0      $0           $104,000,000
Planning & Entitlements   $286,000     $461,000     $1,800,000   $3,500,000   $277,000     $450,000     $233,000   $655,000     $7,662,000
Development Costs         $381,000     $9,800,000   $8,300,000   $6,600,000   $3,500,000   $2,000,000   $7,300,000 $500,000     $38,381,000

Total Project Costs       $104,667,000 $10,261,000  $10,100,000  $10,100,000  $3,777,000   $2,450,000   $7,533,000 $1,155,000   $150,043,000

NET CASH FLOW             $(104,667,000) $(10,261,000) $(10,100,000) $(10,100,000) $(3,777,000) $(2,450,000) $(7,533,000) $80,891,400

CUMULATIVE CASH FLOW      $(104,667,000) $(114,928,000) $(125,028,000) $(135,128,000) $(138,905,000) $(141,355,000) $(148,888,000) $(68,046,600)
```

---

## UI/UX Notes

- **Time Toggle:** Top-right corner offers Monthly / Quarterly / Annual / Overall buttons (Annual selected by default for this report)
- **Cost View:** Toggle or sidebar showing Summary / By Stage / By Category / By Phase options
- **Drill-down:** Click any annual cell to view month-by-month breakdown in modal/drawer
- **Export:** CSV, PDF, copy-to-clipboard with formatting preserved
- **Comparison:** Optional side-by-side with prior budget revision or forecast scenario

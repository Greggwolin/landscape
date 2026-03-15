# Report 10: Direct Cap Summary

## Overview
- **Property Types:** Multifamily
- **Data Readiness:** READY
- **Primary Data Source(s):** Income Approach tab (`tbl_valuation_noi`, `tbl_cap_rate_analysis`, Financial Engine)
- **ARGUS Equivalent:** Direct Capitalization, Capitalization Rate Analysis
- **Peoria Lakes Equivalent:** Not applicable (Land Dev)

## Column Layout

**Section 1: NOI Summary (3 Bases)**
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | NOI Basis | Text | F-12 Current, F-12 Market, Stabilized (hard-coded) | No |
| 2 | Annual NOI | Currency | from Operating Statement or backend | Yes |
| 3 | $/Unit | Currency | Annual NOI / 113 units | Calculated |
| 4 | $/SF | Currency | Annual NOI / 113,655 SF | Calculated |

**Section 2: Cap Rate Analysis**
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Cap Rate Metric | Text | Going-In Cap, Market Cap, Historic Cap, etc. | No |
| 2 | Rate | Percent | from tbl_cap_rate_analysis or hard-coded | Yes |
| 3 | Basis / Notes | Text | Description (e.g., "from 5-year avg comps") | No |

**Section 3: Value Indication**
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | NOI Basis | Text | Current, Market, Stabilized | No |
| 2 | Going-In Cap | Percent | From Section 2 | Yes |
| 3 | Indicated Value | Currency | NOI / Cap Rate | Calculated |
| 4 | $/Unit | Currency | Indicated Value / 113 units | Calculated |
| 5 | $/SF | Currency | Indicated Value / 113,655 SF | Calculated |

## Row Structure

**Section 1: NOI SUMMARY (3-row comparison)**

| NOI Basis | Annual NOI | $/Unit | $/SF |
|-----------|-----------|--------|------|
| F-12 Current | $1,215,119 | $10,752 | $10.69 |
| F-12 Market | $2,066,136 | $18,283 | $18.18 |
| Stabilized | $2,066,136 | $18,283 | $18.18 |

**Section 2: CAP RATE ANALYSIS (4-6 rows)**

| Cap Rate Metric | Rate | Basis / Notes |
|-----------------|------|---------------|
| Going-In Cap (Current NOI) | 4.0% | Property-specific; from market study |
| Market Cap Rate (Stabilized) | 5.0% | 5-year avg MF comps, 50-100 unit class |
| Historical Cap (Prior Year Avg) | 4.2% | Property trailing 12-month avg |
| Comparable Range (Low) | 3.5% | Market low-range (strong markets) |
| Comparable Range (High) | 5.5% | Market high-range (weaker markets) |

**Section 3: VALUE INDICATION (3-row calculation)**

| NOI Basis | Going-In Cap | Indicated Value | $/Unit | $/SF |
|-----------|--------------|-----------------|--------|------|
| F-12 Current | 4.0% | $30,378,000 | $268,929 | $267.35 |
| F-12 Market | 5.0% | $41,322,720 | $365,766 | $363.54 |
| Stabilized | 4.5% | $45,914,133 | $406,673 | $404.11 |

**Optional: Reconciliation to Total Valuation**
- Sales Comp (35% weight): $47,250,000
- Income Approach (55% weight): $41,323,000 (using F-12 Market / 5% cap)
- **Total Indicated Value (90% reconciliation): $43,815,000**
- $/Unit: $387,743
- $/SF: $385.67

## Section Breakdown

1. **Header Block:** Property name, valuation date, report type ("Direct Capitalization Analysis")
2. **Section 1:** NOI Summary table (3 rows)
   - Shows impact of different revenue/expense assumptions
   - Helpful for sensitivity analysis
3. **Section 2:** Cap Rate Analysis (5-6 rows)
   - Going-In rate (to-be-applied rate)
   - Market/Comparable ranges (context)
   - Historical (trend analysis)
4. **Section 3:** Value Indication (3 rows of NOI ÷ Cap Rate calculations)
   - Primary valuation conclusion
   - Shows value sensitivity to cap rate assumptions
5. **Optional Section 4:** Reconciliation
   - Shows how Direct Cap value aligns with other approaches (Sales Comp, Cost Approach, etc.)
   - Weights and blended conclusion
6. **Footer:** Assumptions, cap rate source, sensitivity note

## Formatting Notes
- **Section headers:** Bold, light gray background
- **Row labels (NOI Basis, Cap Rate Metric):** Left-aligned
- **Numeric columns:** Right-aligned
- **Percent columns (Cap Rate):** Right-aligned, 1-2 decimal places (e.g., 4.50%)
- **Currency columns (NOI, Value):** Right-aligned, $ symbol, 0 decimals for large values (e.g., $41,323,000) or 2 decimals for per-unit/per-SF metrics (e.g., $385.67)
- **Totals/Summary rows:** Bold, box-border or light green background
- **Grid:** Simple HTML table (no sorting needed; calculation sequence is fixed)
- **Orientation:** Portrait (5 columns, compact/professional)
- **Print:** Fit to 1 page (12-15 rows of data total)

## Pending Inputs
- Market cap rate data (currently hard-coded 5.0%; verify against comparable sales study)
- Historical cap rate calculation (if property has prior valuation or operating history)
- Comparable range low/high (currently 3.5% / 5.5%; calibrate to market comps)
- Reconciliation weights (currently Sales 35%, Income 55%, Cost not included; confirm final reconciliation approach)
- Effective cap rate vs. Going-In cap distinction (current assumes both are 4-5%; clarify if different)

## Sample Layout

```
╔═════════════════════════════════════════════════════════════════════════════════════╗
║            CHADRON TERRACE — DIRECT CAPITALIZATION ANALYSIS                        ║
║                    Valuation Date: 03/14/2026                                       ║
╠═════════════════════════════════════════════════════════════════════════════════════╣

SECTION 1: NET OPERATING INCOME SUMMARY (3 Bases)
─────────────────────────────────────────────────────────────────────────────────────
    NOI Basis           Annual NOI          $/Unit         $/SF
─────────────────────────────────────────────────────────────────────────────────────
    F-12 Current        $1,215,119          $10,752        $10.69
    F-12 Market         $2,066,136          $18,283        $18.18
    Stabilized          $2,066,136          $18,283        $18.18
─────────────────────────────────────────────────────────────────────────────────────

SECTION 2: CAPITALIZATION RATE ANALYSIS
─────────────────────────────────────────────────────────────────────────────────────
    Cap Rate Metric                  Rate      Basis / Source
─────────────────────────────────────────────────────────────────────────────────────
    Going-In Cap (Current)           4.00%     Property-specific, market study
    Market Cap Rate (Stabilized)     5.00%     5-yr avg comps, 50-100 unit class
    Historical Cap (Prior Year Avg)  4.25%     Property trailing 12-mo average
    Comparable Range (Low)           3.50%     Market low-range (strong class-A MF)
    Comparable Range (High)          5.50%     Market high-range (class-B/C)
─────────────────────────────────────────────────────────────────────────────────────

SECTION 3: VALUE INDICATION (Direct Capitalization)
─────────────────────────────────────────────────────────────────────────────────────
    NOI Basis       Cap Rate    Indicated Value    $/Unit         $/SF
─────────────────────────────────────────────────────────────────────────────────────
    F-12 Current      4.00%      $30,378,000      $268,929       $267.35
    F-12 Market       5.00%      $41,322,720      $365,766       $363.54
    Stabilized        4.50%      $45,914,133      $406,673       $404.11
─────────────────────────────────────────────────────────────────────────────────────

SECTION 4: APPROACH RECONCILIATION
─────────────────────────────────────────────────────────────────────────────────────
    Approach                Weight    Indicated Value    Weighted Value
─────────────────────────────────────────────────────────────────────────────────────
    Sales Comparison          35%       $47,250,000       $16,537,500
    Income (Market NOI/5%)    55%       $41,322,720       $22,727,496
    Cost Approach           —          Not Concluded     —
─────────────────────────────────────────────────────────────────────────────────────
    FINAL VALUE INDICATION   90%*                        $39,265,000
                                                         $347,389/unit
                                                         $345.60/SF

    * 90% indicates 35% + 55% = 90% reconciliation weight; Cost Approach deferred

Assumptions:
  • Going-In Cap Rate: 4.0% (property-specific, subject to market adjustment)
  • Market Cap Rate: 5.0% (basis: 5-year average multifamily comps, 50-100 unit range)
  • F-12 Market NOI derived from market rents, normalized expenses, 3% market vacancy
  • Stabilized assumes full stabilization within 2-3 years (market rent achievement)
  • $/SF calculations: Indicated Value / 113,655 total SF
  • Weights: Sales Comp 35%, Income 55% (Cost Approach not concluded at this stage)

Data Sources:
  • Operating Statement: Chadron Terrace FY2025 actual + market rent analysis
  • Cap Rate Study: Market comps, appraisal input
  • Comparable Sales: Recent MF transactions, similar size/class

Sensitivity Analysis (Impact on Value):
  • Cap Rate 3.5%: Value = $59.04M (43% higher)
  • Cap Rate 4.5%: Value = $45.91M (17% higher)
  • Cap Rate 5.5%: Value = $37.57M (9% lower)
╚═════════════════════════════════════════════════════════════════════════════════════╝
```

## Notes
- Direct Capitalization uses a single-year NOI capitalized at a market cap rate
- Going-In Cap reflects current property; Market/Stabilized caps show longer-term value
- Sensitivity analysis (bottom of sample) optional but recommended to show cap rate risk
- Reconciliation section shows how this approach (55% weight) blends with Sales Comp (35% weight) for final value conclusion
- Cost Approach deferred (not concluded at alpha stage); weights total to 90%

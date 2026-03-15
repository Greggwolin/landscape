# Report 13: DCF / Returns Summary

## Overview
- **Property Types:** MF (Multifamily)
- **Data Readiness:** PARTIAL
- **Primary Data Source(s):** Income Approach (NOI projection, DCF view), Capitalization sidebar (discount rate, growth rates)
- **ARGUS Equivalent:** IRR Matrix, Present Value report, Sensitivity Analysis
- **Peoria Lakes Equivalent:** Not applicable (MF valuation only)

---

## Report Purpose
Synthesizes unleveraged investment returns via discounted cash flow methodology. Displays:
- **Unleveraged annual NOI projections** over 10-year hold period
- **Terminal value** at exit (based on exit cap rate)
- **Discount rate assumptions** and present value calculations
- **Unleveraged IRR** and implied value indication
- **Sensitivity matrix** showing IRR variance across exit cap and discount rate assumptions
- Comparison to **going-in cap rate** for market validation

Primary use case: Valuation support (validate via income approach) and scenario testing (what-if sensitivity on exit cap / discount rates).

---

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Year | Integer (1–10) | Hold period | ✅ |
| 2 | NOI | Currency | Income Approach projection | ⚠️ PARTIAL |
| 3 | PV Factor (Disc Rate) | Decimal | 1 ÷ (1 + disc_rate)^year | ⚠️ PARTIAL |
| 4 | PV of NOI | Currency | NOI × PV Factor | ⚠️ PARTIAL |
| 5 | Terminal Value (Year 10) | Currency | NOI(Y10) ÷ Exit Cap Rate | ⚠️ PARTIAL |
| 6 | PV of Reversion | Currency | Terminal Value × PV Factor(Y10) | ⚠️ PARTIAL |

---

## Row Structure

**Header Row:**
- Year, NOI, PV Factor, PV of NOI, Terminal Value / PV of Reversion (merged or separate columns)

**Annual Rows (Years 1–9):**
- Standard formatting
- Terminal Value column typically empty (no terminal value until year 10)

**Year 10 Row (Terminal Year):**
- Highlighted background (light gold/yellow)
- NOI shown
- Terminal Value calculated and displayed
- PV of Reversion calculated

**Summary Rows (after Year 10):**
- Blank separator row
- **Sum of PV (NOI, Years 1–10):** Bold
- **PV of Terminal Value / Reversion:** Bold
- **Total Present Value:** Bold, highlighted (Sum of PV NOI + PV Reversion)
- Blank separator row
- **Implied Value Indication:** Total PV ÷ Building SF (value per SF) or Total PV (absolute)
- **Current Market Value (from sales comp approach):** [if available]
- **Variance:** (Implied Value − Market Value) / Market Value (%)

**Assumptions Section (after value indication):**
- Blank separator row
- **Going-In Cap Rate:** [from Income Approach sidebar or user input]
- **Exit Cap Rate:** [editable; default = Going-In Cap]
- **Discount Rate (WACC):** [from Capitalization sidebar]
- **NOI Growth Rate:** [from Income Approach assumptions]
- **Hold Period:** 10 years

**Return Metrics Section:**
- Blank separator row
- **Unleveraged IRR (%):** Calculated IRR of annual NOI + terminal value
- **Going-In Cap vs. Discount Rate:** Spread analysis (Going-In Cap − Discount Rate = "cushion")
- **Implied Capitalization Rate at Exit:** NOI(Y10) ÷ Total PV (reference metric)

---

## Section Breakdown

### Section 1: Unleveraged Annual NOI & Present Value

Tabular display with NOI projection, PV discount factors, and accumulated present value.

**Chadron Terrace Example (PARTIAL DATA):**

| Year | NOI | PV Factor @ 8% | PV of NOI | Terminal Value (Exit Cap 4.5%) | PV of Reversion |
|------|-----|----------------|-----------|-------------------------------|-----------------|
| 1 | $1,214,944 | 0.9259 | $1,125,504 | — | — |
| 2 | $1,238,943 | 0.8573 | $1,062,362 | — | — |
| 3 | $1,263,522 | 0.7938 | $1,003,039 | — | — |
| 4 | $1,288,792 | 0.7350 | $947,342 | — | — |
| 5 | $1,314,768 | 0.6806 | $894,874 | — | — |
| 6 | $1,341,463 | 0.6302 | $845,379 | — | — |
| 7 | $1,368,901 | 0.5835 | $798,561 | — | — |
| 8 | $1,397,099 | 0.5403 | $755,025 | — | — |
| 9 | $1,426,081 | 0.5002 | $713,373 | — | — |
| 10 | $1,435,066 | 0.4632 | $664,935 | $31,890,356 | $14,747,852 |
| | | **TOTAL** | **$9,110,414** | | **$14,747,852** |

**Key Assumptions:**
- NOI Growth: 2.0% annually
- Expense Growth: 3.0% annually
- Discount Rate (WACC): 8.0%
- Exit Cap Rate (Year 10): 4.5%
- Hold Period: 10 years

---

### Section 2: Value Indication via DCF

**Box displaying:**

```
Total PV of 10-Year NOI:         $9,110,414
PV of Terminal Value (Reversion): $14,747,852
──────────────────────────────────────────
TOTAL INDICATED VALUE (DCF):     $23,858,266

Value per Unit:                  $211,133 per unit
Value per SF:                    $172 per SF

Current Market Value (Sales Comp): $[TBD]
Variance from Market:            [TBD]%

Valuation Confidence: [Unleveraged DCF indicates value; reconcile with market approach]
```

---

### Section 3: Return Metrics & Sensitivity

**Unleveraged Returns (Summary Box):**

| Metric | Value | Notes |
|--------|-------|-------|
| **Unleveraged IRR** | [TBD]% | Discount rate that equates PV to market value |
| **Going-In Cap Rate** | 4.0% | NOI(Y1) ÷ Purchase Price |
| **Exit Cap Rate (Year 10)** | 4.5% | Assumed for reversion calc |
| **Discount Rate (WACC)** | 8.0% | Cost of capital; drives PV |
| **Cap Rate / Discount Rate Spread** | -4.0% | (Going-In Cap − Discount Rate) |

**Interpretation:**
- If spread is **negative** (as above): Market cap rate < cost of capital → investment accretive only if value appreciation occurs
- If spread is **positive**: Market cap rate > cost of capital → cash flow distribution alone covers required return

### Section 4: Sensitivity Analysis

**Multi-way sensitivity matrix:** IRR varies by Exit Cap Rate (rows) × Discount Rate (columns).

**Example Grid (5% × 5% matrix):**

```
Unleveraged IRR Sensitivity Matrix

Exit Cap Rate (rows) vs. Discount Rate (columns) [%]

           6.0%    6.5%    7.0%    7.5%    8.0%    8.5%    9.0%
4.0%      12.5%   11.8%   11.2%   10.6%   10.0%    9.5%    9.0%
4.5%      11.2%   10.6%   10.0%    9.5%    8.9%    8.4%    7.9%
5.0%       9.9%    9.4%    8.9%    8.4%    7.9%    7.4%    6.9%
5.5%       8.7%    8.2%    7.7%    7.3%    6.8%    6.3%    5.9%
6.0%       7.6%    7.1%    6.7%    6.2%    5.8%    5.3%    4.9%
```

**Color Coding:**
- Green (IRR > 10%): Strong returns
- Yellow (IRR 8–10%): Market-aligned returns
- Orange (IRR 6–8%): Below-market returns
- Red (IRR < 6%): Weak returns

**Highlighted cells:**
- Current scenario (Exit Cap 4.5%, Discount Rate 8.0%): Outlined box
- Base case range (±0.5% on both axes): Light background

---

## Formatting Notes

**Layout:** Portrait (8.5" × 11") — stacked sections: NOI table, value indication box, return metrics table, sensitivity matrix.

**Table Styling (NOI Projection):**
- Header row: Bold, dark background
- Data rows: Alternating light gray
- Year 10 row: Bolder border, light yellow/gold background
- Summary rows: Bold, dark border

**Color Scheme:**
- Assumptions section: Light gray background, smaller font
- Value indication box: Light blue/cyan border
- Return metrics table: Neutral background
- Sensitivity matrix: Color-graded (green → yellow → orange → red per IRR ranges)

**Number Formatting:**
- Currency: $X,XXX,XXX (no cents for large values)
- Percentages: X.X% (one decimal for rates, X.X% for IRR)
- Factors/multiples: 0.XXXX (4 decimals for PV factors)
- Year: Y1, Y2, … Y10

**Missing Data Handling:**
- Cells with [TBD]: Light red background or gray italics "—"
- Note at bottom: "Some inputs not yet configured. Check Income Approach sidebar for discount rate and growth assumptions."

---

## Pending Inputs

1. **Discount Rate (Critical):**
   - Must be specified in Capitalization sidebar or Income Approach assumptions
   - Typical range: 6–10% depending on market, risk profile, cost of capital
   - Currently: [TBD]

2. **Exit Cap Rate:**
   - Default: Going-In Cap Rate from Income Approach (4.0%)
   - User should adjust based on market expectations at end of hold
   - Recommended: ±0.25–0.50% vs. going-in (e.g., 4.5% for tightening cap environment)
   - Currently: [TBD]

3. **NOI Growth Rate:**
   - Income Approach assumes 2.0% annually (income growth) + 3.0% expense growth
   - Net NOI growth = 2.0% (conservative, 10-year hold typical)
   - Verify alignment across reports

4. **Hold Period:**
   - Default: 10 years
   - Can be adjusted for sensitivity (e.g., 5-year, 7-year, 12-year scenarios)
   - Cascades to terminal value and reversion calculations

5. **Market Value Baseline:**
   - Sales Comparison report provides market-based value indication ($47.25M per Chadron Terrace data)
   - DCF value should reconcile to within ±10–15% of market value
   - Variance >15% signals assumption issues (discount rate too low/high, exit cap misaligned, NOI growth off-base)

6. **Waterfall Calculation:**
   - Backend endpoint needed: `POST /api/calculations/waterfall/` (currently 404)
   - Should accept: NOI array, terminal value, discount rate → returns IRR, PV components
   - Post-alpha priority

---

## Sample Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Report 13: DCF / Returns Summary                                                │
│ Property: Chadron Terrace | Project: Hawthorne MF Development | Date: Mar 2026 │
└────────────────────────────────────────────────────────────────────────────────┘

ASSUMPTIONS
Discount Rate: [TBD]% | Exit Cap: 4.5% | NOI Growth: 2.0% | Expense Growth: 3.0% | Hold: 10 years

┌──────┬──────────────┬────────────┬──────────────┬──────────────┬─────────────┐
│ Year │ NOI          │ PV Factor  │ PV of NOI    │ Terminal Val │ PV Reversion│
│      │              │ (8%)       │              │              │             │
├──────┼──────────────┼────────────┼──────────────┼──────────────┼─────────────┤
│  1   │ $1,214,944   │ 0.9259     │ $1,125,504   │      —       │      —      │
│  2   │ $1,238,943   │ 0.8573     │ $1,062,362   │      —       │      —      │
│  3   │ $1,263,522   │ 0.7938     │ $1,003,039   │      —       │      —      │
│  4   │ $1,288,792   │ 0.7350     │   $947,342   │      —       │      —      │
│  5   │ $1,314,768   │ 0.6806     │   $894,874   │      —       │      —      │
│  6   │ $1,341,463   │ 0.6302     │   $845,379   │      —       │      —      │
│  7   │ $1,368,901   │ 0.5835     │   $798,561   │      —       │      —      │
│  8   │ $1,397,099   │ 0.5403     │   $755,025   │      —       │      —      │
│  9   │ $1,426,081   │ 0.5002     │   $713,373   │      —       │      —      │
│ 10   │ $1,435,066   │ 0.4632     │   $664,935   │ $31,890,356  │ $14,747,852 │
├──────┼──────────────┼────────────┼──────────────┼──────────────┼─────────────┤
│ TOTAL│              │            │ $9,110,414   │              │ $14,747,852 │
└──────┴──────────────┴────────────┴──────────────┴──────────────┴─────────────┘

VALUE INDICATION (DCF METHOD)
┌────────────────────────────────────────────────┐
│ PV of 10-Year NOI:          $9,110,414         │
│ PV of Terminal Value:      $14,747,852         │
│ ────────────────────────────────────────────── │
│ IMPLIED VALUE (DCF):       $23,858,266         │
│ ────────────────────────────────────────────── │
│ Value per Unit:                $211,133        │
│ Value per SF:                     $172         │
│                                                 │
│ Market Value (Sales Comp):      [TBD]          │
│ Variance:                       [TBD]%         │
└────────────────────────────────────────────────┘

UNLEVERAGED RETURNS
┌────────────────────────────────────────────┐
│ Unleveraged IRR:         [TBD]%            │
│ Going-In Cap Rate:       4.0%              │
│ Exit Cap Rate:           4.5%              │
│ Discount Rate (WACC):    8.0%              │
│ Cap/Discount Spread:     -4.0%             │
│                                            │
│ Interpretation: Market cap rate < cost of │
│ capital. Value appreciation required to   │
│ meet return hurdle.                        │
└────────────────────────────────────────────┘

SENSITIVITY ANALYSIS: Unleveraged IRR (%)

Exit Cap (rows) vs. Discount Rate (columns)

           6.0%    6.5%    7.0%    7.5%    8.0%    8.5%    9.0%
4.0%      12.5%   11.8%   11.2%   10.6%   10.0%    9.5%    9.0%
4.5%      11.2%   10.6%   10.0%    9.5%  ⭕8.9%    8.4%    7.9%
5.0%       9.9%    9.4%    8.9%    8.4%    7.9%    7.4%    6.9%
5.5%       8.7%    8.2%    7.7%    7.3%    6.8%    6.3%    5.9%
6.0%       7.6%    7.1%    6.7%    6.2%    5.8%    5.3%    4.9%

⭕ = Current Scenario (Exit Cap 4.5%, Disc Rate 8.0%)

Green (>10%) | Yellow (8–10%) | Orange (6–8%) | Red (<6%)
```

---

## Data Dependencies

- **Income Approach tab:** NOI projection with growth rates, DCF view
- **Capitalization sidebar:** Discount rate (WACC), exit cap rate
- **Sales Comparison report:** Market-based value for reconciliation
- **Financial engine backend:** Waterfall / IRR calculation service (`/api/calculations/waterfall/`)
- **Project summary:** Building SF (for per-SF valuation metrics)

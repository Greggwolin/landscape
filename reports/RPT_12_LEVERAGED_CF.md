# Report 12: Leveraged Cash Flow Projection

## Overview
- **Property Types:** MF (Multifamily)
- **Data Readiness:** DESIGN ONLY
- **Primary Data Source(s):** Income Approach (NOI projection), Capitalization tab (debt structure, loan terms)
- **ARGUS Equivalent:** Unlev CF / Lev CF tabs (proforma with debt schedule)
- **Peoria Lakes Equivalent:** Not applicable (MF valuation only)

---

## Report Purpose
Projects annual cash flows to equity investors over a specified hold period (typically 5–10 years), accounting for:
- Net Operating Income (NOI) growth
- Debt service (principal & interest from loan schedule)
- Capital expenditures (reserves, replacements)
- Reversion proceeds (sale at exit cap rate)
- Tax implications (optional future phase)

Produces leveraged return metrics (IRR, equity multiple, cash-on-cash yield) for decision-making.

---

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Year | Integer (1–10) | Hold period | ✅ |
| 2 | NOI | Currency | Income Approach projection | ⚠️ PARTIAL |
| 3 | Debt Service (P&I) | Currency | Capitalization / Loan Schedule | 🔴 NOT CONFIGURED |
| 4 | Net Cash Flow (Pre-CapEx) | Currency | NOI − Debt Service | ⚠️ PARTIAL |
| 5 | Capital Expenditures | Currency | Reserve/replacement schedule | ⚠️ PARTIAL |
| 6 | Leveraged Cash Flow | Currency | Net CF − CapEx | ⚠️ PARTIAL |
| 7 | Cumulative Cash Flow | Currency | Running total | ⚠️ PARTIAL |

---

## Row Structure

**Header Row:**
- Year, NOI, Debt Service, Net Cash Flow, CapEx, Leveraged CF, Cumulative CF

**Annual Rows (Years 1–10):**
- One row per year in hold period
- Standard formatting for Years 1–9
- **Year 10 Row (Hold Year / Exit Year):** Highlighted background, indicates reversion calculation

**Subtotals/Summary Rows (after Year 10):**
- Blank separator row
- **Total NOI (10-year sum):** Bold
- **Total Debt Service (10-year sum):** Bold
- **Total CapEx (10-year sum):** Bold
- **Total Leveraged Cash Flow (10-year sum):** Bold, highlighted

**Reversion Section (after summary):**
- Blank separator row
- **Sale Price (at Exit Cap Rate):** NOI(Year 10) ÷ Exit Cap Rate
- **Less: Selling Costs (%):** Sale Price × Selling Cost % (typically 1–2%)
- **Less: Loan Payoff:** Remaining loan balance (from debt schedule)
- **Net Reversion Proceeds:** Sale Price − Selling Costs − Loan Payoff
- **Plus: Year 10 Leveraged CF:** From annual cash flow table
- **Total Reversion to Equity:** Net Proceeds + Year 10 CF

**Return Metrics Section (after reversion):**
- Blank separator row
- **Unleveraged IRR (%):** IRR of unleveraged NOI + reversion (reference only)
- **Leveraged IRR (%):** IRR of leveraged annual CFs + reversion proceeds
- **Equity Multiple (times):** (Total Leveraged CF + Reversion) ÷ Initial Equity Investment
- **Cash-on-Cash Yield (Year 1):** Year 1 Leveraged CF ÷ Initial Equity
- **Exit Cap Rate (%):** Assumed at start; may differ from going-in cap

---

## Section Breakdown

### Section 1: Annual Cash Flow Projection (Years 1–10)
Tabular display showing year-by-year NOI, debt service, net cash flow, and distributions to equity.

**Chadron Terrace Example (Partial Data):**

| Year | NOI | Debt Service | Net CF (Pre-CapEx) | CapEx Reserve | Leveraged CF | Cumulative CF |
|------|-----|---------------|--------------------|----------------|---------------|---------------|
| 1 | $1,214,944 | [TBD] | [TBD] | $120,000 | [TBD] | [TBD] |
| 2 | $1,238,943 | [TBD] | [TBD] | $120,000 | [TBD] | [TBD] |
| 3 | $1,263,522 | [TBD] | [TBD] | $120,000 | [TBD] | [TBD] |
| ... | ... | ... | ... | ... | ... | ... |
| 10 | $1,435,066 | [TBD] | [TBD] | $120,000 | [TBD] | [TBD] |

**Assumptions** (displayed above table):
- Hold Period: 10 years
- NOI Growth Rate: 2.0% annually
- Expense Growth Rate: 3.0% annually
- Initial Equity Investment: $[TBD] (based on purchase price − loan amount)
- Loan Amount: [TBD] (not currently configured)
- Loan Term: [TBD] years
- Interest Rate: [TBD]%
- CapEx Reserve: $120K/year (optional; or % of gross revenue)

### Section 2: Exit Year (Year 10) & Reversion Calculation

**Isolated calculation showing:**
- Year 10 NOI
- Assumed Exit Cap Rate (editable; defaults to Going-In Cap from Income Approach)
- Implied Sale Price = NOI(Year 10) ÷ Exit Cap Rate
- Selling costs (typically 1–2% of sale price)
- Remaining loan balance at end of Year 10 (from amortization schedule)
- Net Reversion Proceeds = Sale Price − Selling Costs − Loan Balance

**Example:**
```
Year 10 NOI:                    $1,435,066
Exit Cap Rate:                  4.5%
───────────────────────────────────────
Implied Sale Price:             $31,890,356

Less: Selling Costs (1.5%):    ($478,356)
Less: Loan Payoff:             ($[TBD])
───────────────────────────────────────
Net Reversion to Equity:        $[TBD]
```

### Section 3: Return Metrics Summary

**Key Metrics Display (highlighted box or table):**

| Metric | Value | Notes |
|--------|-------|-------|
| **Leveraged IRR** | [TBD]% | Annual return to equity investor |
| **Equity Multiple** | [TBD]x | Total equity proceeds ÷ initial equity |
| **Cash-on-Cash (Year 1)** | [TBD]% | Year 1 CF ÷ initial equity |
| **Unleveraged IRR** | [TBD]% | For comparison (reference only) |
| **Going-In Cap** | 4.0% | At acquisition |
| **Exit Cap** | 4.5% | At year 10 sale |

**Sensitivity Analysis** (optional, linked to Report 13):
- IRR sensitivity to exit cap rate (±0.5%)
- IRR sensitivity to exit year (hold 5 / 7 / 10 / 12 years)

---

## Formatting Notes

**Layout:** Portrait (8.5" × 11") — single column for annual table, reversion section, and metrics box stacked vertically.

**Table Styling:**
- Header row: Bold, dark background, white text
- Data rows: Alternating light gray for readability every other row
- Subtotal rows (Year 10, totals): Bolder border, light highlight
- Reversion and metrics sections: Boxed with border, light background color

**Number Formatting:**
- Currency: $X,XXX,XXX (no cents for NOI/sale price); $XXX for small items
- Percentages: X.X% (one decimal)
- Years: Y1, Y2, … Y10
- Multiples: X.Xx (one decimal)

**Assumptions Box:**
- Displayed above the annual projection table
- Gray background, non-bold text
- Editable fields highlighted in light yellow (allowing user adjustment without recalculation)
- [TBD] markers for missing data

**Missing Data Handling:**
- Cells with [TBD]: Light red background, centered text "—" or "[TBD]"
- Gray italicized note: "Debt structure not configured. Configure loan in Capitalization tab to populate Debt Service."

---

## Pending Inputs

1. **Debt Structure (Critical Blocker):**
   - Loan amount, term, interest rate
   - Amortization schedule (monthly/annual)
   - Debt service calculations downstream depend on this

2. **Initial Equity Investment:**
   - Calculated as: Purchase Price − Loan Amount
   - Needed for cash-on-cash and equity multiple calculations
   - Current project value: $[estimate from sales comp approach]

3. **CapEx Reserve Schedule:**
   - Annual reserve amount (currently hard-coded $120K/year)
   - Should be % of gross revenue or tiered by asset age
   - Optional; can be zero for speculative scenarios

4. **Exit Cap Rate Assumption:**
   - Default: Going-In Cap from Income Approach (4.0%)
   - User should be able to adjust (e.g., 4.5%, 5.0%) for sensitivity
   - Affects reversion and exit year proceeds

5. **Hold Period:**
   - Default: 10 years
   - User can adjust (e.g., 5-year hold for opportunity fund strategies)
   - Shifts all calculations accordingly

6. **Tax Considerations (Phase 2):**
   - Currently not included (simplified to pre-tax cash flows)
   - Post-alpha: Add depreciation recapture, ordinary income tax on CF, capital gains tax on reversion

---

## Sample Layout

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Report 12: Leveraged Cash Flow Projection                                       │
│ Property: Chadron Terrace | Project: Hawthorne MF Development | Date: Mar 2026 │
└────────────────────────────────────────────────────────────────────────────────┘

ASSUMPTIONS
Hold Period: 10 years | NOI Growth: 2.0% | Expense Growth: 3.0%
Loan: [TBD] | Interest Rate: [TBD]% | Exit Cap: 4.5% | CapEx Reserve: $120K/year
Initial Equity: [TBD] (Purchase Price − Loan)

┌──────┬──────────────┬───────────────┬──────────────┬──────────┬──────────────┬─────────────┐
│ Year │ NOI          │ Debt Service  │ Net CF       │ CapEx    │ Leveraged CF │ Cumulative  │
│      │              │ (P&I)         │ (Pre-CapEx)  │ Reserve  │              │             │
├──────┼──────────────┼───────────────┼──────────────┼──────────┼──────────────┼─────────────┤
│  1   │ $1,214,944   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  2   │ $1,238,943   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  3   │ $1,263,522   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  4   │ $1,288,792   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  5   │ $1,314,768   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  6   │ $1,341,463   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  7   │ $1,368,901   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  8   │ $1,397,099   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│  9   │ $1,426,081   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
│ 10   │ $1,435,066   │ [TBD]         │ [TBD]        │ $120,000 │ [TBD]        │ [TBD]       │
├──────┼──────────────┼───────────────┼──────────────┼──────────┼──────────────┼─────────────┤
│ TOTALS│ [TBD]       │ [TBD]         │ [TBD]        │ $1.2M    │ [TBD]        │ [TBD]       │
└──────┴──────────────┴───────────────┴──────────────┴──────────┴──────────────┴─────────────┘

EXIT YEAR (YEAR 10) & REVERSION
Year 10 NOI:                    $1,435,066
Exit Cap Rate:                  4.5%
─────────────────────────────────────────
Implied Sale Price:             $31,890,356
Less: Selling Costs (1.5%):     ($478,356)
Less: Loan Payoff (balance):    $[TBD]
─────────────────────────────────────────
Net Reversion Proceeds:         $[TBD]
Plus: Year 10 Leveraged CF:     $[TBD]
═════════════════════════════════════════
TOTAL REVERSION TO EQUITY:      $[TBD]

RETURN METRICS
┌────────────────────────────────────────┐
│ Leveraged IRR:            [TBD]%       │
│ Equity Multiple:          [TBD]x       │
│ Cash-on-Cash (Year 1):    [TBD]%       │
│ Unleveraged IRR (ref):    [TBD]%       │
│ Going-In Cap:             4.0%         │
│ Exit Cap:                 4.5%         │
└────────────────────────────────────────┘

⚠️ Debt structure not configured. Configure loan amount, term, and rate in Capitalization tab 
   to populate Debt Service and equity return metrics.
```

---

## Data Dependencies

- **Income Approach tab:** NOI projection with growth rates (2.0% income, 3.0% expense)
- **Capitalization tab:** Loan amount, interest rate, term, amortization schedule
- **Project financial summary:** Purchase price or acquisition cost
- **Assumptions panel:** Hold period, exit cap rate, CapEx reserve amount

# Report 1: Sources & Uses

## Overview
- **Property Types:** Universal (Land Development, Multifamily)
- **Data Readiness:** PARTIAL
- **Primary Data Source(s):** Capitalization tab (Debt, Equity), Acquisition Ledger, Budget (Development/CapEx, P&E)
- **ARGUS Equivalent:** Sources & Uses report
- **Peoria Lakes Equivalent:** r.Costs + loan configuration worksheet

## Column Layout
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Category | Text | Static labels | Yes |
| 2 | Amount | Currency | Capitalization, Budget, Acquisition Ledger | Conditional |
| 3 | % of Total | Percentage | Calculated (Amount / Total Sources or Uses) | Yes |

## Row Structure
Two-section structure:

**SOURCES (top half):**
- Debt (subtotal line)
  - Senior Loan Amount
  - Mezzanine Loan Amount (if applicable)
- Equity (subtotal line)
  - GP Equity
  - LP Equity
- **TOTAL SOURCES** (bold, sum of Debt + Equity)

**USES (bottom half):**
- Land Acquisition / Purchase Price
- Hard Costs (Development Costs for Land Dev; CapEx for MF)
- Soft Costs (P&E, Professional Fees, Permits & Insurance)
- Loan Costs
  - Origination Fee
  - Interest Reserve
  - Title, Legal, Other Closing Costs
- Contingency (Development contingency % or Closing contingency)
- **TOTAL USES** (bold, sum of all use line items)

**Validation row:** SOURCES - USES = Net (should be $0 or show funding gap)

## Section Breakdown

### Section 1: Sources Summary
Header: "SOURCES OF FUNDS"
- Shows all debt and equity sources with % of total sources
- For Land Dev: Debt from Capitalization > Debt tab; Equity from Capitalization > Equity waterfall (GP/LP split)
- For MF: Debt from loan config (none currently); Equity from purchase financing or investor commitments
- Subtotals for Debt and Equity families

### Section 2: Uses Summary
Header: "USES OF FUNDS"
- Organized by type: Acquisition, Construction/Development, Finance Costs, Contingency
- For Land Dev: Hard Costs = Development Costs from Budget; Soft Costs = P&E line items
- For MF: Hard Costs = CapEx from Budget; Soft Costs = Closing Costs, Acquisition Costs
- Shows how much of each use category is funded by debt vs. equity (optional secondary columns)

## Formatting Notes
- **Orientation:** Portrait
- **Currency:** Two decimal places, $ symbol, thousands separator
- **Percentages:** One decimal, % symbol
- **Bold rows:** All subtotals (Debt, Equity, TOTAL SOURCES) and (TOTAL USES)
- **Alignment:** Category column left; Amount column right; Percentage column right
- **Spacing:** Blank row between Sources and Uses sections
- **Alternating row shading:** Light gray on every other line for readability
- **Header emphasis:** Section headers in 12pt bold sans-serif

## Pending Inputs
1. **Debt configuration:** No loans currently configured on either project. Requires: Loan Amount, Rate, Term, Amortization schedule.
2. **Equity detail:** Land Dev (Peoria Meadows) has Capitalization > Equity configured ($149.5M total, 10% GP / 90% LP). MF (Chadron Terrace) has no equity waterfall; requires investor/financing structure.
3. **Contingency %:** Not captured in UI. Requires definition of development contingency (Land Dev) or closing contingency (MF) as % of hard costs or fixed amount.
4. **Origination fee:** Loan costs not yet configured. Requires origination fee % of loan amount and interest reserve calculation.
5. **Project-specific UOM:** Land Dev uses acres/front feet; MF uses unit count. Uses may vary by property type (e.g., $/acre vs. $/unit).

## Sample Layout

```
═══════════════════════════════════════════════════════════════════════════════
                          SOURCES & USES OF FUNDS
                           Peoria Meadows (Land Dev)
═══════════════════════════════════════════════════════════════════════════════

SOURCES OF FUNDS
─────────────────────────────────────────────────────────────────────────────────
Category                                           Amount          % of Total
─────────────────────────────────────────────────────────────────────────────────
Debt Financing                                          $0               0.0%
  Senior Loan                                          $0               0.0%
  Mezzanine Loan                                       $0               0.0%
                                                   ─────────────────────────────
Equity                                          $149,500,000             100.0%
  GP Equity (10%)                                $14,950,000              10.0%
  LP Equity (90%)                               $134,550,000              90.0%
                                                   ─────────────────────────────
TOTAL SOURCES                                   $149,500,000             100.0%

USES OF FUNDS
─────────────────────────────────────────────────────────────────────────────────
Land Acquisition                                 $104,000,000              69.6%
Hard Costs (Development)                          $35,200,000              23.5%
Soft Costs (P&E, Permits)                          $7,500,000               5.0%
Loan Costs
  Origination Fee                                        $0               0.0%
  Interest Reserve                                      $0               0.0%
Contingency (5%)                                   $2,800,000               1.9%
                                                   ─────────────────────────────
TOTAL USES                                      $149,500,000             100.0%

Net Funding (Sources - Uses)                             $0               0.0%
═══════════════════════════════════════════════════════════════════════════════
```

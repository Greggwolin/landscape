# Report 2: Debt Summary / Loan Schedule

## Overview
- **Property Types:** Universal (Land Development, Multifamily)
- **Data Readiness:** DESIGN ONLY
- **Primary Data Source(s):** Capitalization tab (Debt section), Loan Configuration form
- **ARGUS Equivalent:** Loan Amortization report, Debt Schedule
- **Peoria Lakes Equivalent:** r.Debt worksheet

## Column Layout

### Section 1: Loan Summary (Overview Table)
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Loan Name | Text | Loan configuration | No |
| 2 | Lender | Text | Loan configuration | No |
| 3 | Loan Type | Text (Senior/Mezzanine/Bridge) | Loan configuration | No |
| 4 | Loan Amount | Currency | Loan configuration | No |
| 5 | Rate | Percentage | Loan configuration (fixed or variable stub) | No |
| 6 | Term (Years) | Number | Loan configuration | No |
| 7 | Amort (Years) | Number | Loan configuration | No |
| 8 | Monthly Payment | Currency | Calculated (PMT function) | Yes |
| 9 | Maturity Date | Date | Calculated (Close Date + Term) | Yes |
| 10 | LTV | Percentage | Calculated (Loan Amount / Property Value) | Conditional |
| 11 | DSCR | Decimal | Calculated (NOI / Debt Service) | Conditional |

### Section 2: Amortization Schedule (Detail Table)
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Period | Text/Number (Year 1, Year 2, etc.) | Sequential | Yes |
| 2 | Beginning Balance | Currency | Prior row Ending Balance or Loan Amount | Yes |
| 3 | Payment | Currency | Loan summary Monthly Payment × 12 | Yes |
| 4 | Interest Paid | Currency | Beginning Balance × (Annual Rate / 12) × 12 | Yes |
| 5 | Principal Paid | Currency | Payment - Interest Paid | Yes |
| 6 | Ending Balance | Currency | Beginning Balance - Principal Paid | Yes |

## Row Structure

### Section 1: Loan Summary
- One row per loan (Senior, Mezzanine, Bridge, etc.)
- Subtotal row if multiple loans (Total Debt Service, Total Loan Amount)
- For Land Dev: typically Senior + Mezzanine (construction → permanent)
- For MF: typically Senior only (or Senior + Bridge if value-add)
- For each loan row, all 11 columns populated from loan configuration

### Section 2: Amortization Schedule
- Header row with column names
- One row per year (or per period, e.g., quarterly if granular)
- Rows 1 through loan term (e.g., 30 years = 30 rows)
- Final row shows payoff (Ending Balance = $0)
- Optional: Interest subtotal row at bottom (cumulative interest paid over life of loan)

## Section Breakdown

### Section 1: Loan Summary Header
Header: "DEBT SUMMARY"
- Shows all active loans for the project
- Each loan's key metrics (amount, rate, term, payment, maturity, LTV, DSCR)
- Helps answer: "How much debt? At what rate? What's the monthly payment? Is the project solvent (DSCR > 1.0)?"

### Section 2: Amortization Schedule Header
Header: "LOAN AMORTIZATION SCHEDULE"
Subheader: "[Loan Name] – [Lender]"
- Year-by-year breakdown of principal/interest paydown
- Shows how much principal is paid down each year vs. interest
- Final row confirms payoff (Ending Balance = $0)
- Helps answer: "How does debt reduce over time? When is the project debt-free?"

## Formatting Notes
- **Orientation:** Landscape (due to 11 columns in summary table)
- **Currency:** Two decimal places, $ symbol, thousands separator
- **Percentages:** Two decimals (8.25%), % symbol
- **Decimal (DSCR):** Two decimals (1.25x)
- **Dates:** MM/DD/YYYY format
- **Bold rows:** Loan subtotal row (if multiple loans); Final amortization row (payoff confirmation)
- **Alignment:** Text columns left; Amount/Date columns right; Percentage columns right
- **Spacing:** Blank row between Section 1 and Section 2; blank row between amortization rows and interest subtotal
- **Alternating row shading:** Light gray on every other row for readability
- **Header emphasis:** Section headers in 12pt bold sans-serif; loan name in 11pt semi-bold
- **Currency formatting:** If a cell is $0 or $0.00, display as "—" (em-dash) for clarity

## Pending Inputs
1. **Loan configuration:** No loans currently configured on either project. Requires:
   - Loan Name (e.g., "Senior Construction Loan")
   - Lender (e.g., "Wells Fargo")
   - Loan Type (Senior / Mezzanine / Bridge / Permanent)
   - Loan Amount ($)
   - Interest Rate (% annual)
   - Term (years to maturity)
   - Amortization Period (years; may differ from term for interest-only or balloon scenarios)
   - Close Date (to calculate maturity)
2. **Property Value:** Required for LTV calculation. Land Dev: land value + improvements? MF: purchase price + as-is value?
3. **NOI projection:** Required for DSCR calculation. Requires operating statement and NOI projection (annual or stabilized).
4. **Interest-only period:** Construction loans often have I/O period before amortization begins. Requires duration.
5. **Rate type:** Fixed vs. floating (SOFR, Prime + margin, etc.). Currently designed for fixed; variable rate support requires additional columns.
6. **Loan purpose code:** Construction vs. Permanent vs. Refinance. Affects amortization assumption.

## Sample Layout

```
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
                                                                  DEBT SUMMARY
                                                             Peoria Meadows (Land Dev)
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Loan Name    Lender          Loan Type    Loan Amount    Rate    Term    Amort   Monthly Pymt   Maturity    LTV      DSCR
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
[Pending]    [Pending]       [Pending]          —        —%      —       —            —          [Date]      —%       —
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
TOTAL DEBT FINANCING                            —                                     —                       —        —
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

                                                          LOAN AMORTIZATION SCHEDULE
                                                      [Loan Name] – [Lender] – [Loan Amount]

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Year    Beginning Balance    Annual Payment    Interest Paid    Principal Paid    Ending Balance
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
1              —                    —               —                 —                  —
2              —                    —               —                 —                  —
3              —                    —               —                 —                  —
...
30             —                    —               —                 —                  —
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
TOTAL                               —        [Cumulative Int.]  [Cumulative Prin.]           $0.00
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
```

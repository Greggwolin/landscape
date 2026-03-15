# Report 3: Loan Budget (Star Valley Format)

## Overview
- **Property Types:** Universal (Land Development, Multifamily)
- **Data Readiness:** DESIGN ONLY
- **Primary Data Source(s):** Loan Configuration, Budget tab (Hard Costs, Soft Costs), Acquisition Ledger, Capitalization > Debt
- **ARGUS Equivalent:** Loan Budget, Sources & Uses (debt-focused variant)
- **Peoria Lakes Equivalent:** Loan Budget worksheet with three-section format

## Column Layout

### Section 1: Loan Budget Line Items
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Budget Item | Text | Static labels (land, improvements, fees, etc.) | Yes |
| 2 | Borrower Cost | Currency | Budget tab or acquisition ledger | Conditional |
| 3 | Lender Payoff | Currency | Budget tab or acquisition ledger | Conditional |
| 4 | Total | Currency | Borrower Cost + Lender Payoff | Yes |

### Section 2: Summary of Proceeds
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Item | Text | Static labels (loan amount, deductions, net) | Yes |
| 2 | Amount | Currency | Loan config or calculated | Yes |
| 3 | % of Loan | Percentage | Amount / Loan Amount | Yes |

### Section 3: Equity to Close
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Line Item | Text | Static labels (project costs, loan proceeds, etc.) | Yes |
| 2 | Amount | Currency | Calculated from sections above | Yes |

## Row Structure

### Section 1: Loan Budget (Line Item Breakdown)
Header: "SECTION 1: LOAN BUDGET"

Rows (in order):
- Land Acquisition (Land purchase price)
- Improvements & CapEx (Hard costs, construction budget)
- Site Work (Grading, utilities, if separated from improvements)
- Soft Costs & P&E (Professional fees, permits, insurance, legal, etc.)
- Loan Origination Fee (Calculated as % of loan amount or fixed fee)
- Interest Reserve (Months × monthly interest, if applicable)
- Loan Closing Costs (Title, appraisal, underwriting, escrow, etc.)
- Other Costs (Miscellaneous)
- **TOTAL LOAN BUDGET** (bold, sum of all line items)

Each row has two cost columns:
- Borrower Cost: Portion paid by investor/borrower equity
- Lender Payoff: Portion financed by loan
- Total: Borrower + Lender

Subtotal rows (optional):
- Hard Costs Subtotal (land + improvements)
- Soft Costs Subtotal (P&E, fees, reserves)

### Section 2: Summary of Proceeds
Header: "SECTION 2: SUMMARY OF PROCEEDS"

Rows (in order):
- Gross Loan Amount
- Less: Origination Fee (amount, % of loan)
- Less: Interest Reserve (LIP amount, % of loan)
- Less: Other Loan Costs (LIP, if applicable)
- **Net Proceeds / Closing Funds Available** (bold, loan amount minus all deductions)

Shows how much cash is actually available after lender captures fees and reserves upfront.

### Section 3: Equity to Close
Header: "SECTION 3: EQUITY TO CLOSE"

Rows (in order):
- Project Costs at Close (from Section 1 Total Loan Budget)
- Less: Loan Proceeds (from Section 2 Net Proceeds)
- Plus: Transaction Costs (Closing costs, underwriting, title, appraisal)
- Less: Option Deposit / Earnest Money (if applicable)
- **TOTAL EQUITY REQUIRED TO CLOSE** (bold, amount borrower must fund)

Helps investor understand: "How much cash do I need to bring to the closing table?"

## Section Breakdown

**Overall Structure (3 sections, 1 page, portrait):**
1. Loan Budget (top third) — what costs exist?
2. Proceeds (middle third) — what loan am I actually getting?
3. Equity to Close (bottom third) — what do I need to fund?

**Flow logic:**
- Section 1 totals = all costs
- Section 2 net = funds lender provides
- Section 3 equity = costs – loan proceeds = equity requirement
- Validation: Section 1 Total = Section 2 Gross Loan + Section 3 Total Equity (approximately, excluding transaction cost variation)

## Formatting Notes
- **Orientation:** Portrait
- **Currency:** Two decimal places, $ symbol, thousands separator
- **Percentages:** Two decimals (4.50%), % symbol
- **Bold rows:** All subtotal rows (Hard Costs, Soft Costs), TOTAL LOAN BUDGET, Net Proceeds/Closing Funds Available, TOTAL EQUITY REQUIRED TO CLOSE
- **Alignment:** Description column left; Amount/Percentage columns right
- **Spacing:** Blank row between sections; blank rows before subtotals and totals
- **Indentation:** Sub-line items (fee details under "Origination Fee", breakdown under "Less: Origination Fee") indented 0.25"
- **Alternating row shading:** Light gray on every other data row within each section
- **Header emphasis:** Section headers in 12pt bold sans-serif; row labels in 10pt regular
- **Italics:** "(LIP)" abbreviation in gray italic after line-item-payoff amounts (e.g., "Origination Fee (LIP)")
- **Currency formatting:** Negative amounts shown as ($amount) in parentheses; $0.00 shown as "—"
- **Section borders:** Light horizontal line above and below each section header; heavier line above grand totals

## Pending Inputs
1. **Loan configuration:** No loans currently configured. Requires:
   - Gross Loan Amount ($)
   - Origination Fee ($ or % of loan, e.g., 1.0%)
   - Interest Reserve (months and annual rate)
   - Appraisal Fee ($)
   - Underwriting/Processing Fee ($)
   - Title Insurance & Escrow ($)
   - Other closing costs ($)
2. **Budget detail:** Requires breakdown of:
   - Land acquisition cost (separate from improvements if possible)
   - Hard costs (construction, site work, utilities)
   - Soft costs (engineering, permits, legal, insurance, project management)
   - Developer fee (if separate line item)
3. **Borrower vs. Lender split:** For each budget line, which portion is financed (lender payoff) vs. equity (borrower cost)?
   - Example: $10M land purchase → $7M financed (LTV 70%), $3M equity
   - Example: $5M hard costs → $5M financed (100%, in-draws), $0 equity
   - Example: $500K origination fee → $500K financed (LIP), $0 equity
4. **Option deposit / earnest money:** If applicable, amount committed pre-close (to be credited or refunded at closing).
5. **Permanent vs. construction loan:** Different cost structures (construction = interest reserve, permanent = months of PITI if applicable).
6. **Date of close:** Required for interest reserve calculation if not fixed dollar amount.

## Sample Layout

```
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
                                                   LOAN BUDGET
                                             Peoria Meadows (Land Dev)
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

SECTION 1: LOAN BUDGET
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Budget Item                                      Borrower Cost        Lender Payoff              Total
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Land Acquisition                                  $31,200,000          $72,800,000         $104,000,000
Improvements & Development Costs                          —             $35,200,000          $35,200,000
Site Work & Infrastructure                              —              $5,800,000            $5,800,000
                                                  ────────────────────────────────────────────────────────
  Hard Costs Subtotal                             $31,200,000         $113,800,000         $145,000,000

Soft Costs & Professional Fees                    $2,100,000            $5,400,000            $7,500,000
Permits & Insurance                                 $400,000              $600,000            $1,000,000
Loan Origination Fee (LIP)                              —                $1,098,000            $1,098,000
  (1.00% of $109.8M gross loan)
Interest Reserve (LIP)                                  —                 $750,000              $750,000
  (18 months × $41,667/month)
Loan Closing Costs (LIP)                               —                 $175,000              $175,000
  Appraisal                                            —                  $12,000               $12,000
  Title & Escrow                                       —                  $85,000               $85,000
  Underwriting & Processing                           —                  $78,000               $78,000
                                                  ────────────────────────────────────────────────────────
  Soft Costs & Fees Subtotal                      $2,500,000            $7,923,000           $10,423,000

Other Costs / Contingency                                —                $77,000               $77,000
                                                  ═════════════════════════════════════════════════════════════
TOTAL LOAN BUDGET                                $33,700,000         $121,700,000          $155,400,000
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

SECTION 2: SUMMARY OF PROCEEDS
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Item                                                          Amount                    % of Loan
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Gross Loan Amount                                         $109,800,000                   100.00%

Less: Origination Fee                                      ($1,098,000)                   (1.00%)
Less: Interest Reserve                                       ($750,000)                   (0.68%)
Less: Loan Closing Costs                                    ($175,000)                   (0.16%)
                                                          ────────────────────────────────────────
NET PROCEEDS / CLOSING FUNDS AVAILABLE                    $107,777,000                    98.16%
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

SECTION 3: EQUITY TO CLOSE
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Line Item                                                                             Amount
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Project Costs at Close (from Section 1)                                         $155,400,000

Less: Loan Proceeds (from Section 2)                                           ($107,777,000)

Plus: Equity-Funded Transaction Costs                                             $1,200,000
  (Closing costs not included in loan budget, title company fees, due diligence)

Less: Option Deposit / Earnest Money (at Close)                                        —
                                                                                ─────────────────
TOTAL EQUITY REQUIRED TO CLOSE                                                   $48,823,000
════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
```

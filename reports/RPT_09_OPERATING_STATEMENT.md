# Report 9: Operating Statement / P&L

## Overview
- **Property Types:** Multifamily
- **Data Readiness:** READY
- **Primary Data Source(s):** Operations tab (`core_fin_fact_budget`, `core_fin_fact_actual`), Rent Roll, Unit Mix
- **ARGUS Equivalent:** Cash Flow report
- **Peoria Lakes Equivalent:** Not applicable (Land Dev)

## Column Layout

**Main Grid:**
| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Description | Text | Hard-coded P&L line items | No |
| 2 | Annual $ | Currency | Sum/aggregated from fact tables | Yes |
| 3 | $/Unit | Currency | Annual $ / Total Units (113) | Calculated |
| 4 | $/SF | Currency | Annual $ / Total SF (~113,655) | Calculated |
| 5 | % of EGI | Percent | (Amount / EGI) × 100 | Calculated |

**Optional Side-by-Side Mode (3-column comparison):**
| Column | F-12 Current | F-12 Market | Stabilized |
|--------|--------------|-------------|-----------|
| PRI / GPR | $2,693,258 | $3,359,136 | $3,359,136 |
| Vacancy | $(262,000) | $(100,775) | $(100,775) |
| Credit Loss | (13,466) | (16,796) | (16,796) |
| Concessions | (26,933) | (33,591) | (33,591) |
| EGI | $2,390,859 | $3,207,974 | $3,207,974 |
| ... (expenses by both) | ... | ... | ... |
| NOI | $1,214,944 | $2,066,136 | $2,066,136 |

## Row Structure

**Section 1: REVENUE**
- Primary Rental Income (PRI): SUM of rent from all occupied units
  - By unit type (1BR, 2BR, 3BR, Commercial, Office)
  - Subtotal: Total PRI
  - OR if single line: "Gross Potential Revenue (GPR)" using market rent

**Section 2: VACANCY & LOSS DEDUCTIONS**
- Vacancy Loss: (PRI × Vacancy Rate) or (Total Units - Occupied Units) × Avg Rent × 12
- Credit Loss: (PRI × Credit Loss %) = 0.5%
- Concessions: (PRI × Concession %) = 1.0%
- Subtotal: Total V&D deductions

**Section 3: EFFECTIVE GROSS INCOME (EGI)**
- EGI = PRI - V&D

**Section 4: OPERATING EXPENSES**
- Taxes & Insurance: $774,000 (65.8% of EGI)
- Utilities: $109,000
- Repairs & Maintenance: $94,000
- Administrative: $39,000
- Other (Trash, Pest, etc.): $34,000
- Management Fee: (EGI × 3%) or flat amount
- Reserves: ($300/unit × 113 units = $33,900/year)
- Subtotal: Total Operating Expenses

**Section 5: NET OPERATING INCOME (NOI)**
- NOI = EGI - Total OpEx

**Optional Section: Cash Flow (if desired)**
- NOI
- Less: Debt Service (if applicable)
- Less: Capital Expenditures (if applicable)
- Equals: Cash Flow to Equity

## Section Breakdown

1. **Header Block:** Property name, fiscal period (e.g., "Fiscal Year 2025" or "12-Month Average")
2. **Revenue Section:** PRI (by unit type if available) → Gross income
3. **V&D Section:** Vacancy, credit loss, concessions
4. **EGI Summary:** Bold/highlighted
5. **Operating Expense Section:** Grouped by category (Personnel, Real Estate, Utilities, Repairs, Reserves)
6. **NOI Summary:** Bold/highlighted, box border
7. **Footer:** Data source, assumptions (e.g., "Occupancy: 90.3%", "Credit Loss: 0.5%", "Mgmt Fee: 3% of EGI")

## Formatting Notes
- **Section headers:** Bold, light gray background
- **Subtotal rows:** Bold (e.g., "Total Revenue", "Total OpEx")
- **Summary rows (EGI, NOI):** Bold, light green background
- **Currency columns:** Right-aligned, $ symbol, 2 decimals
- **% columns:** Right-aligned, percent format (e.g., 65.8%)
- **Deduction items:** May be shown in parentheses or with negative sign (e.g., $(262,000) or -$262,000)
- **Grid:** TanStack Table or simple HTML table (no sorting needed; sequence is fixed)
- **Orientation:** Portrait (5 columns, professional/formal layout)
- **Print:** Fit to 1 page (18-22 rows of data)

## Pending Inputs
- Monthly expense detail (discovery provides annual; may need to break down further if required for variance)
- Expense allocation by unit type (if applicable; would add columns)
- Current vs. Market vs. Stabilized comparison (backend ready; confirm whether report should show all three or primary only)
- Debt service amount (if property has construction loan or permanent financing)
- Capital expenditure guidance or reserves methodology

## Sample Layout

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║              CHADRON TERRACE — OPERATING STATEMENT (P&L)                             ║
║                    Fiscal Year 2025 (Annualized)                                     ║
╠══════════════════════════════════════════════════════════════════════════════════════╣

REVENUE
  Gross Potential Revenue (GPR)                 $3,359,136        $29,73     100.0%
    Primary Rental Income (Current)             $2,693,258        $23,84      80.2%

VACANCY & LOSS DEDUCTIONS
  Vacancy Loss @ 3%                              $(100,775)        ($0.89)     -3.0%
  Credit Loss @ 0.5%                             $ (16,796)        ($0.15)     -0.5%
  Concessions @ 1.0%                             $ (33,591)        ($0.30)     -1.0%
  ─────────────────────────────────────────────────────────────────────────────────
  Total Vacancy & Loss Deductions                $(151,162)        ($1.34)     -4.5%

EFFECTIVE GROSS INCOME (EGI)                    $3,207,974        $28.39      95.5%

OPERATING EXPENSES
  Real Estate Taxes & Insurance                  $(774,000)       ($6.85)    -22.9%
  Utilities                                      $(109,000)       ($0.96)     -3.2%
  Repairs & Maintenance                          $ (94,000)       ($0.83)     -2.8%
  Administrative                                 $ (39,000)       ($0.35)     -1.2%
  Other Expenses                                 $ (34,000)       ($0.30)     -1.0%
  Management Fee @ 3%                            $ (96,239)       ($0.85)     -2.9%
  Reserves (Replacement Reserve)                 $ (33,900)       ($0.30)     -1.0%
  ─────────────────────────────────────────────────────────────────────────────────
  Total Operating Expenses                     $(1,180,139)      $(10.44)    -35.0%

NET OPERATING INCOME (NOI)                      $2,027,835        $17.95      60.0%

Assumptions: Occupancy 90.3%, Credit Loss 0.5%, Concessions 1.0%, Mgmt Fee 3% of EGI,
Reserves $300/unit. Data source: Operations tab, current lease rates.
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

## Alternative: Three-Way Comparison

If report requires F-12 Current vs. Market vs. Stabilized side-by-side:

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║                   CHADRON TERRACE — NOI COMPARISON                                ║
║                  Current vs. Market vs. Stabilized                                 ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║ Description              │  F-12 Current  │  F-12 Market  │  Stabilized          ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║ Gross Potential Revenue  │  $2,693,258    │  $3,359,136   │  $3,359,136          ║
║ Vacancy Loss (9.7%)      │   $(262,000)   │   $(100,775)  │   $(100,775)         ║
║ Credit Loss (0.5%)       │   $ (13,466)   │   $ (16,796)  │   $ (16,796)         ║
║ Concessions (1.0%)       │   $ (26,933)   │   $ (33,591)  │   $ (33,591)         ║
║ ──────────────────────── │ ──────────────── │ ──────────── │ ──────────────────   ║
║ EGI                      │  $2,390,859    │  $3,207,974   │  $3,207,974          ║
║ Total Operating Expense  │ $(1,175,740)   │ $(1,141,838)  │ $(1,141,838)         ║
║ ══════════════════════════════════════════════════════════════════════════════════ ║
║ NOI                      │  $1,215,119    │  $2,066,136   │  $2,066,136          ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

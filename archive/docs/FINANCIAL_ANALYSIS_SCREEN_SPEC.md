# FINANCIAL ANALYSIS SCREEN SPECIFICATION

**Date:** October 16, 2025  
**Context:** Kitchen Sink implementation - DCF/Cash Flow analysis section  
**Previous Work:** Rent Roll screen (HR14-HR16)  
**Integration:** Uses calculation engine from Claude Code prompt (HR13)

---

## OVERVIEW

The **Financial Analysis** section is where the actual investment analysis happens. While the **Rent Roll** captures lease data (inputs), the **Financial Analysis** section models operating assumptions, financing structure, and computes cash flows/returns.

**Route:** `/financial-analysis` (or `/properties/:id/analysis`)

**Purpose:** 
- Define operating expense assumptions
- Model debt/equity financing structure
- Project period-by-period cash flows
- Calculate investment returns (IRR, NPV, equity multiple, DSCR)
- Run sensitivity analysis

---

## TAB STRUCTURE (4 Tabs)

### Tab 1: Operating Assumptions (Inputs)
### Tab 2: Financing Assumptions (Inputs)
### Tab 3: Cash Flow Projection (Computed)
### Tab 4: Investment Returns (Computed)

---

## TAB 1: OPERATING ASSUMPTIONS

**Purpose:** Define operating expenses, vacancy, capital reserves, TI/leasing costs

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ OPERATING ASSUMPTIONS - Scottsdale Promenade                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Property Operating Expenses (Annual):                               │
│                                                                      │
│ Category              │ Amount      │ PSF      │ Reimbursable │ %   │
│───────────────────────┼─────────────┼──────────┼──────────────┼─────│
│ Property Taxes        │ $520,000    │  $2.85   │     Yes      │100% │
│ Property Insurance    │  $95,000    │  $0.52   │     Yes      │100% │
│ Liability Insurance   │  $35,000    │  $0.19   │     Yes      │100% │
│ Landscaping           │  $48,000    │  $0.26   │     Yes      │100% │
│ Parking Lot Maint     │  $62,000    │  $0.34   │     Yes      │100% │
│ Janitorial (Common)   │  $42,000    │  $0.23   │     Yes      │100% │
│ Security              │  $78,000    │  $0.43   │     Yes      │100% │
│ Signage               │  $12,000    │  $0.07   │     Yes      │100% │
│ Electricity (Common)  │  $85,000    │  $0.47   │     Yes      │100% │
│ Water/Sewer (Common)  │  $38,000    │  $0.21   │     Yes      │100% │
│ Gas (Common)          │  $15,000    │  $0.08   │     Yes      │100% │
│ HVAC Maintenance      │  $45,000    │  $0.25   │     Yes      │100% │
│ Roof Repairs          │  $22,000    │  $0.12   │     Yes      │100% │
│ Parking Lot Repairs   │  $35,000    │  $0.19   │     Yes      │100% │
│ General Repairs       │  $28,000    │  $0.15   │     Yes      │100% │
│ Property Management   │ $185,000    │  $1.02   │     No       │ -- │
│ Legal & Professional  │  $24,000    │  $0.13   │     No       │ -- │
│ Marketing             │  $18,000    │  $0.10   │     No       │ -- │
│                                                                      │
│ Total Opex            │$1,387,000   │  $7.62   │              │     │
│ Reimbursable          │$1,156,000   │  $6.35   │              │     │
│ Non-Reimbursable      │  $227,000   │  $1.25   │              │     │
│                                                                      │
│ [+ Add Expense Category] [Import from Template] [Save]              │
└─────────────────────────────────────────────────────────────────────┘

Expense Growth:
┌─────────────────────────────────────────────────────────────────────┐
│ Property Tax Escalation:     3.0% annually                          │
│ Insurance Escalation:        5.0% annually                          │
│ Other Opex Escalation:       2.5% annually (CPI-based)             │
└─────────────────────────────────────────────────────────────────────┘

Vacancy & Credit Loss:
┌─────────────────────────────────────────────────────────────────────┐
│ Physical Vacancy:            5.0% of gross rent                     │
│ Economic Vacancy:            2.0% (free rent, concessions)          │
│ Credit Loss:                 1.0% (uncollected rent)                │
│ Total Vacancy & Loss:        8.0%                                   │
│                                                                      │
│ Absorption Schedule:                                                │
│   Current: 97.6% occupied                                           │
│   Target stabilization: 95.0%                                       │
│   Lease-up velocity: 2 spaces per quarter                           │
└─────────────────────────────────────────────────────────────────────┘

Capital Reserves:
┌─────────────────────────────────────────────────────────────────────┐
│ Reserve Type           │ Annual Contribution │ PSF      │ Balance  │
│────────────────────────┼─────────────────────┼──────────┼──────────│
│ Roof Replacement       │       $25,000       │  $0.14   │ $125,000 │
│ HVAC Replacement       │       $35,000       │  $0.19   │ $175,000 │
│ Parking Lot Resurface  │       $45,000       │  $0.25   │  $90,000 │
│ General Capital        │       $20,000       │  $0.11   │  $80,000 │
│                                                                      │
│ Total Reserves         │      $125,000       │  $0.69   │ $470,000 │
│                                                                      │
│ [+ Add Reserve Category]                                            │
└─────────────────────────────────────────────────────────────────────┘

Tenant Improvements & Leasing Costs:
┌─────────────────────────────────────────────────────────────────────┐
│ TI Allowance (New Leases):                                          │
│   Anchor tenants:        $20-25 PSF                                 │
│   Inline retail:         $40-50 PSF                                 │
│   Restaurants:           $80-100 PSF                                │
│                                                                      │
│ TI Allowance (Renewals):                                            │
│   Anchor tenants:        $5-10 PSF                                  │
│   Inline retail:         $15-20 PSF                                 │
│   Restaurants:           $30-40 PSF                                 │
│                                                                      │
│ Leasing Commissions:                                                │
│   New leases:            4-6% of total rent (landlord side)         │
│   Renewals:              2-3% of total rent                         │
│   Tenant rep:            2-3% of total rent (if applicable)         │
│                                                                      │
│ Legal Fees:              $5,000 per lease (average)                 │
└─────────────────────────────────────────────────────────────────────┘

Major Maintenance Timeline:
┌─────────────────────────────────────────────────────────────────────┐
│ Year │ Item                    │ Estimated Cost │ Priority          │
│──────┼─────────────────────────┼────────────────┼───────────────────│
│ 2028 │ Parking Lot Resurface   │    $850,000    │ High ⚠           │
│ 2030 │ Roof Replacement - A    │  $1,200,000    │ Medium            │
│ 2032 │ HVAC Replacement        │    $600,000    │ Medium            │
│ 2027 │ Facade Refresh          │    $350,000    │ Low               │
│                                                                      │
│ [+ Add Major Maintenance Item]                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- **Editable expense grid** - Click any amount to edit
- **PSF calculation** - Auto-calculates PSF based on rentable area
- **Reimbursable flag** - Marks which expenses are recovered from tenants
- **Growth rates** - Different escalation for different expense types
- **Capital reserves** - Ongoing contributions + major maintenance timing
- **TI/LC assumptions** - Default allowances by space type

### Data Sources:
- From seed data: `tbl_cre_operating_expense`, `tbl_cre_capital_reserve`, `tbl_cre_major_maintenance`
- User can override defaults

---

## TAB 2: FINANCING ASSUMPTIONS

**Purpose:** Define debt structure, equity structure, exit assumptions

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ FINANCING ASSUMPTIONS - Scottsdale Promenade                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Acquisition / Investment:                                           │
│                                                                      │
│ Acquisition Price:              $42,500,000                         │
│ Closing Costs:                   $1,275,000  (3.0% of price)       │
│ Total Investment:               $43,775,000                         │
│                                                                      │
│ Acquisition Date:                2025-01-15                         │
└─────────────────────────────────────────────────────────────────────┘

Debt Structure:
┌─────────────────────────────────────────────────────────────────────┐
│ Loan Amount:                    $29,750,000  (70% LTV)              │
│ Interest Rate:                         5.75% (fixed)                │
│ Loan Term:                           10 years                       │
│ Amortization Period:                 30 years                       │
│ Interest Only Period:                 0 months                      │
│                                                                      │
│ Monthly Payment:                    $173,594                        │
│ Annual Debt Service:              $2,083,128                        │
│                                                                      │
│ Loan Fee / Points:                   1.00%  ($297,500)             │
│                                                                      │
│ Debt Service Reserve:                6 months  ($1,041,564)        │
│                                                                      │
│ [Advanced: Add Mezzanine Debt]                                      │
└─────────────────────────────────────────────────────────────────────┘

Equity Structure:
┌─────────────────────────────────────────────────────────────────────┐
│ Total Equity Required:          $14,025,000  (30% of investment)    │
│ Closing costs financed:          $1,275,000  (from equity)          │
│ DS reserve financed:             $1,041,564  (from equity)          │
│                                                                      │
│ GP Contribution:                  $1,402,500  (10% of equity)       │
│ LP Contribution:                 $12,622,500  (90% of equity)       │
│                                                                      │
│ Partnership Structure:                                              │
│   Preferred Return (LP):                 8.0% annually              │
│   Cash Flow Split (after pref):   20% GP / 80% LP                  │
│                                                                      │
│ Promote Structure (IRR-based):                                      │
│   0-12% IRR:    10% GP / 90% LP                                     │
│   12-15% IRR:   20% GP / 80% LP                                     │
│   15-18% IRR:   30% GP / 70% LP                                     │
│   18%+ IRR:     40% GP / 60% LP                                     │
│                                                                      │
│ [Advanced: Add Promote Tiers]                                       │
└─────────────────────────────────────────────────────────────────────┘

Exit Assumptions:
┌─────────────────────────────────────────────────────────────────────┐
│ Hold Period:                          10 years                      │
│ Exit Date:                       2035-01-15                         │
│                                                                      │
│ Exit Strategy:                   Sale to investor                   │
│ Exit Cap Rate:                          6.50%                       │
│ Exit NOI (Year 11):              $3,685,000 (projected)            │
│ Projected Exit Value:           $56,692,308                         │
│                                                                      │
│ Disposition Costs:                      2.0% ($1,133,846)          │
│ Net Sale Proceeds:              $55,558,462                         │
│                                                                      │
│ Alternative Exit Scenarios:                                         │
│   ○ Sale to institutional investor (6.5% cap)                      │
│   ○ Sale to REIT (6.0% cap)                                        │
│   ○ Refinance (cash-out, hold long-term)                           │
│   ○ 1031 Exchange into larger asset                                │
└─────────────────────────────────────────────────────────────────────┘

Analysis Period Settings:
┌─────────────────────────────────────────────────────────────────────┐
│ Cash Flow Projection Period:     Monthly (120 months)               │
│ Reporting Period:                 Annual summaries                  │
│ Fiscal Year End:                  December 31                       │
│ Discount Rate (for NPV):          10.0%                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- **LTV calculation** - Auto-calculates loan amount based on percentage
- **Debt service calc** - Monthly/annual payment based on rate/term/amortization
- **Waterfall structure** - Preferred return + promote tiers
- **Exit scenarios** - Multiple exit strategies with different cap rates
- **Sensitivity ready** - Each assumption can be varied for sensitivity analysis

### Data Sources:
- From user input (saved to `tbl_debt_assumption`, `tbl_equity_structure`)
- Exit assumptions from `tbl_cre_exit_assumption`

---

## TAB 3: CASH FLOW PROJECTION

**Purpose:** Period-by-period cash flow projection (computed from all inputs)

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ CASH FLOW PROJECTION - Scottsdale Promenade                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ View: [Annual Summary ▼]  [Monthly Detail] [Quarterly]             │
│ Export: [Excel] [PDF] [CSV]                                         │
│                                                                      │
│ Year │ Base Rent│ % Rent │Recovery│Other│ Gross │Vacancy│  EGI   │ │
│──────┼──────────┼────────┼────────┼─────┼───────┼───────┼────────┤ │
│ 2025 │ $4,186K  │  $125K │ $1,156K│ $50K│$5,517K│ -$441K│$5,076K │ │
│ 2026 │ $4,352K  │  $131K │ $1,191K│ $52K│$5,726K│ -$458K│$5,268K │ │
│ 2027 │ $4,526K  │  $137K │ $1,226K│ $54K│$5,943K│ -$475K│$5,468K │ │
│ 2028 │ $4,707K  │  $143K │ $1,263K│ $56K│$6,169K│ -$494K│$5,675K │ │
│ 2029 │ $4,895K  │  $150K │ $1,301K│ $58K│$6,404K│ -$512K│$5,892K │ │
│ 2030 │ $5,091K  │  $157K │ $1,340K│ $60K│$6,648K│ -$532K│$6,116K │ │
│ ...  │  ...     │  ...   │  ...   │ ... │  ...  │  ...  │  ...   │ │
│ 2034 │ $6,234K  │  $192K │ $1,551K│ $70K│$8,047K│ -$644K│$7,403K │ │
│ Exit │    --    │   --   │   --   │  -- │  --   │  --   │$55,558K│ │
│                                                                      │
│                                                                      │
│ Year │  Opex   │  NOI   │Reserves│  TI  │ Comm │CapEx │ CFBD   │  │
│──────┼─────────┼────────┼────────┼──────┼──────┼──────┼────────┤  │
│ 2025 │-$1,387K │$3,689K │ -$125K │-$450K│-$180K│  $0  │$2,934K │  │
│ 2026 │-$1,425K │$3,843K │ -$129K │-$520K│-$208K│  $0  │$2,986K │  │
│ 2027 │-$1,464K │$4,004K │ -$132K │-$380K│-$152K│-$350K│$2,990K │  │
│ 2028 │-$1,504K │$4,171K │ -$136K │-$680K│-$272K│-$850K│$2,233K │  │
│ 2029 │-$1,545K │$4,347K │ -$140K │-$420K│-$168K│  $0  │$3,619K │  │
│ 2030 │-$1,588K │$4,528K │ -$144K │-$550K│-$220K│-$1.2M│$2,414K │  │
│ ...  │  ...    │  ...   │  ...   │ ...  │ ...  │ ...  │  ...   │  │
│ 2034 │-$1,793K │$5,610K │ -$163K │-$480K│-$192K│  $0  │$4,775K │  │
│ Exit │   --    │  --    │   --   │  --  │  --  │  --  │$55,558K│  │
│                                                                      │
│                                                                      │
│ Year │Debt Svc │  NCF   │ Cum CF │  LP  │  GP  │ LP CF│ GP CF  │  │
│──────┼─────────┼────────┼────────┼──────┼──────┼──────┼────────┤  │
│ 2025 │-$2,083K │  $851K │  $851K │ $681K│$170K │ $681K│  $170K │  │
│ 2026 │-$2,083K │  $903K │$1,754K │ $722K│$181K │$1,403K│  $351K │  │
│ 2027 │-$2,083K │  $907K │$2,661K │ $726K│$181K │$2,129K│  $532K │  │
│ 2028 │-$2,083K │  $150K │$2,811K │ $120K│ $30K │$2,249K│  $562K │  │
│ 2029 │-$2,083K │$1,536K │$4,347K │$1,229K│$307K│$3,478K│  $869K │  │
│ 2030 │-$2,083K │  $331K │$4,678K │ $265K│ $66K │$3,743K│  $935K │  │
│ ...  │  ...    │  ...   │  ...   │ ...  │ ...  │ ...  │  ...   │  │
│ 2034 │-$2,083K │$2,692K │$21,543K│$2,154K│$538K│$18,458K│$4,614K│  │
│ Exit │   --    │$22,992K│$44,535K│  TBD │ TBD  │  TBD │  TBD   │  │
│                                                                      │
│ [Click any cell to drill into monthly detail]                       │
│ [Show full waterfall calculation]                                   │
└─────────────────────────────────────────────────────────────────────┘

Cash Flow Breakdown (Expandable):
┌─────────────────────────────────────────────────────────────────────┐
│ Year 2025 Detail (click to expand monthly):                         │
│                                                                      │
│ REVENUE:                                                            │
│   Base Rent:                 $4,186,000                             │
│   Percentage Rent:             $125,000  (Cooper's Hawk only)       │
│   Expense Recoveries:        $1,156,000  (NNN/Mod Gross)            │
│   Other Income:                 $50,000  (parking, signage)         │
│   ─────────────────────────────────────                             │
│   Gross Revenue:             $5,517,000                             │
│                                                                      │
│ VACANCY & CREDIT LOSS:                                              │
│   Physical Vacancy (5%):      -$259,350                             │
│   Economic Vacancy (2%):      -$110,340                             │
│   Credit Loss (1%):            -$55,170                             │
│   ─────────────────────────────────────                             │
│   Total V&C Loss:             -$424,860                             │
│                                                                      │
│ EFFECTIVE GROSS INCOME:      $5,092,140                             │
│                                                                      │
│ OPERATING EXPENSES:                                                 │
│   Property Taxes:             -$520,000                             │
│   Insurance:                  -$130,000                             │
│   CAM Expenses:               -$327,000                             │
│   Utilities:                  -$138,000                             │
│   Management Fee (3%):        -$152,764                             │
│   R&M:                        -$130,000                             │
│   ─────────────────────────────────────                             │
│   Total Opex:               -$1,397,764                             │
│                                                                      │
│ NET OPERATING INCOME:        $3,694,376                             │
│                                                                      │
│ CAPITAL ITEMS:                                                      │
│   Capital Reserves:           -$125,000                             │
│   TI Allowances:              -$450,000  (3 new leases)            │
│   Leasing Commissions:        -$180,000                             │
│   Major CapEx:                      $0                              │
│   ─────────────────────────────────────                             │
│   Total Capital:              -$755,000                             │
│                                                                      │
│ CASH FLOW BEFORE DEBT:       $2,939,376                             │
│                                                                      │
│ DEBT SERVICE:                -$2,083,128                             │
│                                                                      │
│ NET CASH FLOW:                 $856,248                             │
│                                                                      │
│ DISTRIBUTIONS:                                                      │
│   LP Preferred Return:        -$1,009,800  (8% on $12.6M)          │
│   Remaining for split:         -$153,552  (shortfall)              │
│   ─────────────────────────────────────                             │
│   LP Distribution:              $856,248  (100% until pref met)    │
│   GP Distribution:                   $0   (no promote yet)         │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- **Annual summary view** (default) - 10-15 years in one grid
- **Monthly detail view** - Click any year to expand to 12 months
- **Drill-down capability** - Click any cell to see calculation detail
- **Waterfall calculation** - Shows LP preferred return, promote splits
- **Cumulative tracking** - Running total of cash flows
- **Exit year calculation** - Includes disposition proceeds

### Calculation Logic:
This queries the calculation engine API built by Claude Code (from HR13 prompt):
- `GET /api/properties/:id/cash-flow` - Returns period-by-period array
- Displayed in grid format
- User can switch between annual/quarterly/monthly views

---

## TAB 4: INVESTMENT RETURNS

**Purpose:** Summary return metrics + sensitivity analysis

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ INVESTMENT RETURNS - Scottsdale Promenade                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Key Return Metrics:                                                 │
│                                                                      │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│ │ Levered IRR    │  │ Unlevered IRR  │  │ Equity Multiple│        │
│ │    14.2%       │  │     9.8%       │  │     2.35x      │        │
│ │  ✓ Exceeds     │  │  ✓ Good        │  │  ✓ Strong     │        │
│ │    Target      │  │                │  │                │        │
│ └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│ │ NPV (@10%)     │  │ Cash-on-Cash   │  │ Avg DSCR       │        │
│ │  $8,750,000    │  │     6.1%       │  │     1.85x      │        │
│ │  ✓ Positive    │  │  ✓ Year 1      │  │  ✓ Healthy    │        │
│ └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ LP Returns:                                                     │ │
│ │   IRR: 12.8%  │  Equity Multiple: 2.28x  │  Total Return: $16.2M│ │
│ │                                                                  │ │
│ │ GP Returns:                                                     │ │
│ │   IRR: 24.7%  │  Equity Multiple: 3.12x  │  Total Return: $2.9M│ │
│ └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

Return Details:
┌─────────────────────────────────────────────────────────────────────┐
│ Total Equity Invested:           $14,025,000                        │
│ Cumulative Cash Distributions:   $21,543,000 (10 years)            │
│ Exit Proceeds (after debt):      $22,992,000                       │
│ ───────────────────────────────────────────────                     │
│ Total Return:                    $44,535,000                        │
│ Net Profit:                      $30,510,000                        │
│                                                                      │
│ Breakdown:                                                          │
│   Cash yield:                    $21,543,000  (48% of total)       │
│   Appreciation:                  $22,992,000  (52% of total)       │
└─────────────────────────────────────────────────────────────────────┘

Sensitivity Analysis:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│ Top 5 Assumptions by IRR Impact:                                    │
│                                                                      │
│ Assumption         │Baseline│ -20%  │ -10%  │ +10%  │ +20%  │Δ bps │
│────────────────────┼────────┼───────┼───────┼───────┼───────┼──────│
│ Exit Cap Rate      │  6.50% │ 19.2% │ 16.5% │ 12.3% │ 10.7% │ 850  │
│ Base Rent PSF      │ $23.45 │  7.6% │ 10.9% │ 17.5% │ 20.8% │ 680  │
│ Vacancy %          │  5.0%  │ 17.8% │ 16.0% │ 12.4% │ 10.6% │ 520  │
│ TI Allowance PSF   │ $35.00 │ 16.4% │ 15.3% │ 13.1% │ 12.0% │ 280  │
│ Exit Timing (yrs)  │  10 yrs│ 12.1% │ 13.2% │ 15.3% │ 16.1% │ 240  │
│                                                                      │
│ [Run Full Sensitivity Analysis] [View Tornado Chart]                │
└─────────────────────────────────────────────────────────────────────┘

Scenario Analysis:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│ Scenario            │  IRR  │ Equity Mult │  NPV   │ Likelihood    │
│─────────────────────┼───────┼─────────────┼────────┼───────────────│
│ Base Case           │ 14.2% │    2.35x    │ $8.7M  │ Expected      │
│ Optimistic          │ 18.5% │    2.89x    │$13.2M  │ 25% chance    │
│ Pessimistic         │  9.8% │    1.78x    │ $3.1M  │ 15% chance    │
│ Stress Case         │  4.2% │    1.21x    │-$1.8M  │ 5% chance     │
│                                                                      │
│ Optimistic: Exit cap 6.0%, rent growth +1%, vacancy -2%            │
│ Pessimistic: Exit cap 7.0%, rent growth -1%, vacancy +3%           │
│ Stress: Exit cap 7.5%, rent growth 0%, vacancy +5%, major capex    │
│                                                                      │
│ [Edit Scenarios] [Monte Carlo Simulation]                           │
└─────────────────────────────────────────────────────────────────────┘

Quarterly Performance Tracking:
┌─────────────────────────────────────────────────────────────────────┐
│ Projected vs Actual (tracking once operational):                    │
│                                                                      │
│ Metric              │ Projected │ Actual Q1 │ Variance │ Trend      │
│─────────────────────┼───────────┼───────────┼──────────┼────────────│
│ Occupancy %         │   95.0%   │   97.6%   │  +2.6%   │ ✓ Outperf │
│ Avg Rent PSF        │  $23.45   │  $23.12   │  -$0.33  │ ⚠ Below   │
│ NOI                 │  $920K    │  $935K    │  +$15K   │ ✓ Outperf │
│ Opex PSF            │   $1.91   │   $1.98   │  +$0.07  │ ⚠ Over    │
│ DSCR                │   1.85x   │   1.92x   │  +0.07   │ ✓ Healthy │
│                                                                      │
│ [Update Actuals] [Generate Variance Report]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features:
- **Big number cards** - Key metrics prominently displayed
- **LP vs GP returns** - Separate IRR/multiple for each class
- **Sensitivity table** - Top 5 assumptions by IRR impact
- **Scenario analysis** - Pre-defined scenarios (optimistic, pessimistic, stress)
- **Performance tracking** - Projected vs actual (for operational properties)

### Calculation API:
- `GET /api/properties/:id/investment-metrics` - Returns all metrics
- `POST /api/properties/:id/sensitivity-analysis` - Runs sensitivity
- Results from calculation engine (Claude Code prompt HR13)

---

## INTEGRATION WITH RENT ROLL

### Data Flow

```
Rent Roll (Inputs)
  ├── Lease data (tenants, rents, terms)
  ├── Market assumptions (market rents by type)
  └── Loss-to-lease analysis
         ↓
Financial Analysis (Inputs + Calcs)
  ├── Operating Assumptions (opex, vacancy, reserves)
  ├── Financing Assumptions (debt, equity, exit)
         ↓
  ├── Cash Flow Projection (COMPUTED from all inputs)
  └── Investment Returns (COMPUTED from cash flows)
```

### Navigation Flow

User journey:
1. **Start:** Rent Roll → Enter lease data
2. **Next:** Financial Analysis → Define assumptions
3. **Calculate:** System computes cash flows automatically
4. **Review:** Investment Returns tab shows IRR, NPV, etc.
5. **Refine:** Adjust assumptions, see impact on returns
6. **Sensitivity:** Run scenarios to test robustness

---

## ARGUS ENTERPRISE COMPARISON

### What ARGUS Has:

**Rent Roll Section:**
- ✅ Tenant data grid
- ✅ Lease terms
- ✅ Recoveries

**Assumptions Section:**
- ✅ Operating expenses
- ✅ Capital assumptions
- ✅ Market leasing
- ✅ Exit assumptions

**Cash Flow Section:**
- ✅ Period-by-period projection
- ✅ NOI calculation
- ✅ Debt service

**Reports Section:**
- ✅ IRR/NPV
- ✅ Sensitivity tables
- ✅ Investment summary

### What We're Building (Landscape):

Same structure, better UX:
- ✅ Web-based (not desktop)
- ✅ Real-time calculation (not "recalculate" button)
- ✅ Modern grid (not Office 2007 UI)
- ✅ Integrated with AI (document extraction)
- ✅ Market intelligence (CoStar integration)

---

## RESPONSIVE DESIGN

### Desktop (Primary)
- 4-tab interface
- Full grids visible
- Side-by-side detail panels
- All columns shown

### Tablet
- Same 4 tabs
- Horizontal scroll for wide grids
- Collapsible panels
- Most important columns prioritized

### Mobile
- Tabs become vertical accordion
- Card view instead of grids
- Swipe for details
- Summary metrics only (full detail on desktop)

---

## IMPLEMENTATION FILES

```
/src/app/financial-analysis/
  ├── page.tsx                          # Main page with 4 tabs
  ├── components/
  │   ├── OperatingAssumptions.tsx     # Tab 1: Opex grid
  │   ├── FinancingAssumptions.tsx     # Tab 2: Debt/equity
  │   ├── CashFlowProjection.tsx       # Tab 3: CF grid
  │   ├── InvestmentReturns.tsx        # Tab 4: Metrics + sensitivity
  │   ├── ExpenseGrid.tsx              # Reusable opex grid
  │   ├── DebtCalculator.tsx           # Debt service calculator
  │   ├── WaterfallCalculator.tsx      # LP/GP distribution calc
  │   └── SensitivityChart.tsx         # Tornado chart
  └── types/
      └── financial.types.ts           # TypeScript interfaces
```

**API Routes:**
```
/src/app/api/properties/[id]/
  ├── operating-assumptions/route.ts   # GET/PUT opex assumptions
  ├── financing-assumptions/route.ts   # GET/PUT debt/equity
  ├── cash-flow/route.ts              # GET computed cash flows
  ├── investment-metrics/route.ts      # GET return metrics
  └── sensitivity-analysis/route.ts    # POST run sensitivity
```

---

## VALIDATION CRITERIA

### Tab 1: Operating Assumptions
- [ ] Opex grid displays 18+ expense categories
- [ ] PSF calculation updates automatically
- [ ] Reimbursable flag works (filters for recovery calc)
- [ ] Growth rates apply to future periods
- [ ] Capital reserves show annual contribution + balance
- [ ] Major maintenance timeline editable
- [ ] TI/LC assumptions by space type

### Tab 2: Financing Assumptions
- [ ] LTV calculation updates loan amount
- [ ] Debt service calculated correctly (P+I)
- [ ] Waterfall structure defined (preferred + promote)
- [ ] Exit assumptions complete (cap rate, timing, costs)
- [ ] Multiple exit scenarios available

### Tab 3: Cash Flow Projection
- [ ] Annual view shows 10 years + exit
- [ ] Click year to expand to monthly detail
- [ ] All revenue sources included (rent + recovery + other)
- [ ] Vacancy applied correctly
- [ ] NOI calculation correct
- [ ] Capital items timed properly (TI at lease start)
- [ ] Debt service applied each period
- [ ] Waterfall splits LP/GP correctly

### Tab 4: Investment Returns
- [ ] IRR calculated accurately
- [ ] NPV at specified discount rate
- [ ] Equity multiple correct
- [ ] DSCR calculated per period
- [ ] Sensitivity analysis runs (top 5 assumptions)
- [ ] Scenario analysis shows optimistic/pessimistic/stress
- [ ] LP vs GP returns separated

---

## OPEN QUESTIONS FOR CLAUDE CODE

### Q1: Period Granularity

**Options:**
- A) Monthly projections (120 periods for 10 years)
- B) Quarterly projections (40 periods)
- C) Annual projections (10 periods)
- D) User selectable

**Recommendation:** D - Default to annual, allow monthly for detailed analysis

### Q2: Waterfall Complexity

**How detailed should promote structure be?**
- A) Simple: One preferred return, one split above
- B) Standard: Preferred + 2-3 IRR tiers
- C) Complex: Unlimited tiers, lookback provisions, etc.

**Recommendation:** B for Phase 1, add C later if needed

### Q3: Sensitivity Calculation Speed

**Should sensitivity run:**
- A) Real-time (as user changes inputs)
- B) On-demand (user clicks "Run Sensitivity")
- C) Background (scheduled/cached)

**Recommendation:** B - User-initiated, show progress bar

### Q4: Integration with Rent Roll

**When user edits rent roll, should cash flow auto-update?**
- A) Yes, immediately (real-time)
- B) Yes, but with "recalculate" button
- C) Manual only (user navigates to financial analysis)

**Recommendation:** A - Real-time feels modern, but show "calculating..." indicator

---

## SUCCESS METRICS

User can:
- ✅ Input all operating expense assumptions
- ✅ Define debt and equity structure
- ✅ View 10-year cash flow projection
- ✅ See IRR, NPV, equity multiple calculated
- ✅ Run sensitivity analysis on key assumptions
- ✅ Export to Excel for investor reports
- ✅ Compare projected vs actual (once operational)

**Most important:** IRR matches ARGUS output for same assumptions (within 0.1%)

---

## NEXT STEPS

**After this spec:**
1. Claude Code builds calculation engine (HR13 prompt)
2. Claude Code builds Financial Analysis UI (this spec)
3. Integrate with existing Rent Roll (HR14-15)
4. Test with Scottsdale Promenade seed data
5. Validate IRR calculations against ARGUS

**Then:**
6. Add AI import for opex from T-12s
7. Add AI market intelligence for exit cap rates
8. Build scenario manager
9. Add portfolio aggregation (multiple properties)

---

**This completes the Financial Analysis spec. Ready for Claude Code implementation.**

**HR17**

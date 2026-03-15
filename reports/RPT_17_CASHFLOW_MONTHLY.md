# Report 17: Cash Flow — Monthly

## Overview
- **Property Types:** Land Development
- **Data Readiness:** PARTIAL (project costs flowing; revenue zero until sales pricing configured)
- **Primary Data Source(s):** Budget tab (cost schedule), Sales tab (revenue when configured), Financial assumptions (DCF, inflation)
- **ARGUS Equivalent:** Development Schedule > Quarterly (expanded to monthly)
- **Peoria Lakes Equivalent:** r.CFm

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Line Item | Text | Category name (Revenue, Costs, Net CF, Cumulative) | ✅ |
| 2–97 | Month 1–96 (or Jan-26, Feb-26...) | Currency | Calculated from underlying schedules | ⚠️ Partial |

**Detailed Row Structure (by section):**

### Revenue Section
| Row | Item | Data Source | Calculation | Live? |
|-----|------|-------------|-------------|-------|
| 1 | Gross Revenue (by product type) | `tbl_sale_parcel_pricing` + sales rate schedule | Units sold × avg price × monthly distribution | 🔧 |
| 2 | Total Gross Revenue | Sum of row 1 | Σ Gross Revenue | 🔧 |
| 3 | Selling Costs (%) | Assumption (4% default) | Total Gross × selling cost % | 🔧 |
| 4 | **Net Revenue** | Row 2 − Row 3 | Gross less selling costs | 🔧 |

### Project Costs Section
| Row | Item | Data Source | Calculation | Live? |
|-----|------|-------------|-------------|-------|
| 5 | Land Acquisition | `core_fin_fact_budget` (category=Land) | Monthly draw from project schedule | ✅ |
| 6 | Planning & Entitlements | `core_fin_fact_budget` (category=P&E) | Monthly draw from cost schedule | ✅ |
| 7 | Development Costs (Hard) | `core_fin_fact_budget` (category=Hard Costs) | Monthly draw from phase schedule | ✅ |
| 8 | Financing Costs | `core_fin_fact_budget` (category=Financing) | Interest accrual + principal paydown | ⚠️ Partial |
| 9 | Soft Costs (Permits, Legal, Insurance, Closeout) | `core_fin_fact_budget` (category=Soft) | Monthly allocation or milestone-based | ⚠️ Design |
| 10 | **Total Project Costs** | Rows 5–9 | Σ all cost categories | ✅ |

### Net Cash Flow Section
| Row | Item | Calculation | Live? |
|-----|------|-------------|-------|
| 11 | **Unlevered Net Cash Flow** | Net Revenue − Total Project Costs | ✅ |
| 12 | Financing (Loan Proceeds) | Construction loan draw schedule (phase-based) | ⚠️ Partial |
| 13 | Loan Repayment | Negative: loan principal + interest | ⚠️ Partial |
| 14 | **Levered Net Cash Flow** | Unlevered + Financing − Repayment | ⚠️ Partial |
| 15 | **Cumulative Cash Flow** | Running sum of Unlevered (or Levered) | ✅ |

## Row Structure

```
═════════════════════════════════════════════════════════════════════════════════════════════════════════
CASH FLOW — Peoria Meadows (Project 9) — MONTHLY VIEW
═════════════════════════════════════════════════════════════════════════════════════════════════════════

REVENUE
───────────────────────────────────────────────────────────────────────────────────────────────────────
  Gross Revenue — SFD              M1: $0      M2: $0    ... M3: $450K  M4: $450K  M5: $450K  ...  M96: $0
  Gross Revenue — MX              M1: $0      M2: $0    ... M12: $350K  M13: $350K ...
  Gross Revenue — RET             M1: $0      M2: $0    ... M6: $250K  M7: $250K  M8: $125K  ...
  ─────────────────────────────────────────────────────────────────────────────────────────────────────
  Total Gross Revenue             M1: $0      M2: $0    ... M3: $450K  M4: $900K  M5: $1.35M ...
  
  Selling Costs (4%)              M1: $0      M2: $0    ... M3: -$18K  M4: -$36K  M5: -$54K  ...
  ─────────────────────────────────────────────────────────────────────────────────────────────────────
  NET REVENUE                     M1: $0      M2: $0    ... M3: $432K  M4: $864K  M5: $1.30M ...

═════════════════════════════════════════════════════════════════════════════════════════════════════════

PROJECT COSTS
───────────────────────────────────────────────────────────────────────────────────────────────────────
  Land Acquisition (Phase 1.1)    M1: -$2.6M  M2: -$2.6M M3: -$0    M4: -$0    ...
  Land Acquisition (Phase 1.2)    M1: $0      M2: $0    M3: -$2.4M  M4: -$2.4M M5: -$0    ...
  
  Planning & Entitlements         M1: -$135K  M2: -$145K M3: -$155K  M4: -$155K M5: -$165K ...
  Development Costs (Hard)        M1: -$410K  M2: -$410K M3: -$546K  M4: -$573K M5: -$600K ...
  Financing Costs (Interest)      M1: -$42K   M2: -$54K  M3: -$67K   M4: -$78K  M5: -$91K  ...
  Soft Costs                      M1: -$25K   M2: -$28K  M3: -$32K   M4: -$35K  M5: -$39K  ...
  ─────────────────────────────────────────────────────────────────────────────────────────────────────
  TOTAL PROJECT COSTS             M1: -$3.2M  M2: -$3.2M M3: -$3.8M  M4: -$3.8M M5: -$3.9M ...

═════════════════════════════════════════════════════════════════════════════════════════════════════════

NET CASH FLOW
───────────────────────────────────────────────────────────────────────────────────────────────────────
  UNLEVERED NET CF                M1: -$3.2M  M2: -$3.2M M3: -$3.4M  M4: -$2.9M M5: -$2.6M ...
  
  Loan Proceeds (Draw)            M1: $3.5M   M2: $3.5M  M3: $3.5M   M4: $3.5M  M5: $3.5M  ...
  Loan Repayment                  M1: $0      M2: $0     M3: $0      ... M50: -$8.2M -$8.2M ...
  ─────────────────────────────────────────────────────────────────────────────────────────────────────
  LEVERED NET CF                  M1: $0.3M   M2: $0.3M  M3: $0.1M   M4: $0.6M  M5: $0.9M  ...

  ═════════════════════════════════════════════════════════════════════════════════════════════════════
  CUMULATIVE CASH FLOW (Unlevered)
                                  M1: -$3.2M  M2: -$6.4M M3: -$9.8M  M4: -$12.7M M5: -$15.3M ...
                                  ...
                                  M48: $128.4M (end of absorption)
  ═════════════════════════════════════════════════════════════════════════════════════════════════════
```

## Section Breakdown

1. **Summary Card (above table)**
   - Project Duration (months), Total Gross Revenue, Total Selling Costs, Total Net Revenue, Total Project Costs (by category breakdown), Unlevered Net CF, Loan Amount, Levered Net CF, IRR, NPV (at discount rate)

2. **Time Period Toggle** (above table)
   - Radio buttons: **Monthly** | **Quarterly** | **Annual** | **Overall** (full project summary)
   - When "Monthly" selected: Show M1–M96 (or up to phase completion)
   - When "Quarterly" selected: Aggregate M1–M3 → Q1, M4–M6 → Q2, etc.
   - When "Annual" selected: 2026, 2027, 2028, etc.
   - When "Overall" selected: Single column (entire project totals)

3. **Cost View Toggle** (above table)
   - Radio buttons: **Summary** | **By Stage** | **By Category** | **By Phase**
   - **Summary:** Collapsed (Total Project Costs as single line)
   - **By Stage:** Land Acq, P&E, Development, Financing, Soft Costs (5 lines)
   - **By Category:** Detailed breakdown per Budget category (10+ lines, matching RPT_15)
   - **By Phase:** Phase 1.1, Phase 1.2, Phase 2.1, etc. (cost rollup per phase)

4. **Main Grid** (scrollable, horizontal and vertical)
   - Rows: Revenue (3–4 lines), Costs (4–12 lines depending on toggle), Net CF (2–3 lines), Cumulative (1 line)
   - Columns: Period headers (M1, M2... or Q1 2026, Q2 2026... or 2026, 2027...)
   - All numeric cells colored:
     - Green if positive (revenue, net CF)
     - Red if negative (costs)
     - Bold if section total or cumulative

5. **DCF Summary Box** (right-aligned, sticky during scroll)
   - Discount Rate: [20%] (configurable slider or input)
   - NPV @ [X%]: Calculated
   - IRR: Calculated
   - Payback Period (months): First month where Cumulative CF > 0
   - "Recalculate" button triggers NPV/IRR refresh if assumptions change

## Formatting Notes

- **Landscape orientation** (very wide; 96 months or columns → horizontal scrolling required)
- **Currency formatting:** Negative in parentheses (e.g., "($3.2M)" for costs) or prefix with "−"; Color red
- **Decimal precision:** Currency (0 decimals for millions, e.g., "$3M", "$450K"; 2 decimals for single dollar, e.g., "$42.50K")
- **Thousands separator:** Comma (e.g., "$3,200K") or suppress for brevity (e.g., "$3.2M")
- **Period headers:** "M1, M2, M3..." or calendar ("Jan-26, Feb-26, Mar-26..."); allow user toggle
- **Row styling:**
  - Revenue rows: Light blue background
  - Cost rows: Light red background
  - Section totals (NET REVENUE, TOTAL COSTS, NET CF): Bold + darker shade
  - Cumulative: Bold + light green background
  - Frozen rows: Line Item column (left) sticky on horizontal scroll
  - Frozen columns: Line Item (left sticky)
- **Horizontal scrolling:** Keyboard shortcuts (← → arrow keys), mousewheel scroll, or drag scrollbar
- **Pagination option (for print):** "Fit to width" (columns shrink to fit 1 page), "Standard" (columns full width, multi-page print)
- **Export:** CSV (wide format, easy to paste to Excel), Excel (with formulas for NPV/IRR), PDF (landscape, may paginate monthly columns)

## Pending Inputs

### Critical (Must Configure to See Non-Zero Revenue)

1. **Sales Pricing & Absorption Schedule**
   - Must complete RPT_16 (Sales Schedule) first
   - Once parcel pricing and launch months are configured, revenue columns auto-populate monthly
   - Current state: All revenue months are $0

2. **Cost Schedule (Monthly Distribution)**
   - Budget line items are defined (RPT_15)
   - Allocation logic needed: How to spread Phase costs across months?
     - Option A: Uniform distribution (e.g., $1M cost over 12 months = $83.33K/month)
     - Option B: S-curve ramp (costs accelerate in middle, taper at start/end)
     - Option C: Milestone-based (phase gates trigger cost draws)
   - Current state: Logic not yet implemented; sample data shown above illustrates intent

### Secondary (Enhancements)

1. **Construction Loan Engine**
   - Parameters needed:
     - Loan Amount: [$26M] (typically 25% of total development costs)
     - Interest Rate: [6.5%] (current market estimate)
     - Duration: [60 months] (construction + mini-perm)
     - Draw Schedule: Tied to phase milestones or cost accrual
   - Current state: Placeholder interest calc; loan draw logic stubbed
   - Reference: `services/financial_engine_py/` Phase 6A (draw-repay-redraw model exists, needs integration)

2. **Contingency Burn Tracking**
   - Contingency allocation: [$925K] (5% of hard costs)
   - Burn tracking: Show monthly allocation to variances
   - Remaining reserve: Track to end (full or depleted)
   - Current state: Contingency appears as cost line, no burn tracking

3. **Scenario Sensitivity**
   - Allow user to override assumptions inline:
     - Absorption start month (shift M3 → M6)
     - Sales rate (change 2 units/month → 3 units/month)
     - Unit price (apply ±10% adjustment)
   - Cascade changes to revenue + NPV/IRR
   - Store scenarios (Base Case, Pessimistic, Optimistic)
   - Current state: No scenario UI; single "locked" projection

4. **Bulk Sale Option**
   - Peoria Lakes DCF assumes bulk sale of remaining inventory in Year 15
   - If applicable: Add row after absorption completes: "Remaining Parcels — Bulk Sale Month 180 at [%] of market price"
   - Example: 50 unsold parcels × avg $400K = $20M × 80% (discount) = $16M
   - Trigger: User checkbox "Include bulk sale at end of period"
   - Current state: Not implemented

5. **Sensitivity Tornado Chart**
   - Visual: Ranked bar chart showing which assumptions drive NPV/IRR most
   - Inputs: Absorption rate, unit price, construction costs, interest rate, exit cap rate
   - Current state: Deferred to post-alpha

## Sample Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CASH FLOW — Monthly — Peoria Meadows (Project 9)                                                                                   │
│ Period Toggle: [Monthly] [Quarterly] [Annual] [Overall]  |  Cost View: [Summary] [By Stage] [By Category] [By Phase]             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Line Item                    │  M1  │  M2  │  M3  │  M4  │  M5  │  M6  │  M7  │  M8  │  M9  │  M10 │ ... │  M96 │  TOTAL       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ REVENUE                      │      │      │      │      │      │      │      │      │      │      │     │      │              │
│  Gross Revenue               │  $0  │  $0  │$450K │$900K │$1.35M│$1.35M│$1.35M│$1.25M│$1.1M │$900K │ ... │  $0  │  $412.8M     │
│  Selling Costs (4%)          │  $0  │  $0  │-$18K │-$36K │-$54K │-$54K │-$54K │-$50K │-$44K │-$36K │ ... │  $0  │  -$16.5M     │
│  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    │
│  NET REVENUE                 │  $0  │  $0  │$432K │$864K │$1.3M │$1.3M │$1.3M │$1.2M │$1.1M │$864K │ ... │  $0  │  $396.3M     │
│                              │      │      │      │      │      │      │      │      │      │      │     │      │              │
│ PROJECT COSTS                │      │      │      │      │      │      │      │      │      │      │     │      │              │
│  Land Acquisition            │-$2.6M│-$2.6M│  $0  │  $0  │-$2.4M│-$2.4M│  $0  │  $0  │  $0  │  $0  │ ... │  $0  │  -$104M      │
│  Planning & Entitlements     │-$135K│-$145K│-$155K│-$155K│-$165K│-$165K│-$175K│-$175K│-$175K│-$165K│ ... │-$50K │  -$2.8M      │
│  Development Costs (Hard)    │-$410K│-$410K│-$546K│-$573K│-$600K│-$627K│-$654K│-$681K│-$708K│-$708K│ ... │-$410K│  -$18.5M     │
│  Financing Costs             │-$42K │-$54K │-$67K │-$78K │-$91K │-$104K│-$118K│-$132K│-$147K│-$163K│ ... │-$210K│  -$2.1M      │
│  Soft Costs                  │-$25K │-$28K │-$32K │-$35K │-$39K │-$43K │-$46K │-$50K │-$54K │-$58K │ ... │-$15K │  -$600K      │
│  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    │
│  TOTAL PROJECT COSTS         │-$3.2M│-$3.3M│-$800K│-$841K│-$3.3M│-$3.3M│-$993K│-$1.0M│-$1.1M│-$1.1M│ ... │-$685K│  -$128M      │
│                              │      │      │      │      │      │      │      │      │      │      │     │      │              │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    │
│ UNLEVERED NET CF             │-$3.2M│-$3.3M│-$368K│  $23K│-$2.0M│-$2.0M│  $307K│  $200K│$0    │-$236K│ ... │-$685K│  $268.3M     │
│                              │      │      │      │      │      │      │      │      │      │      │     │      │              │
│ Loan Proceeds (Draw)         │$3.5M │$3.5M │$3.5M │$3.5M │$3.5M │$3.5M │$3.5M │$3.5M │$3.5M │$3.5M │ ... │  $0  │  $168M       │
│ Loan Repayment               │  $0  │  $0  │  $0  │  $0  │  $0  │  $0  │  $0  │  $0  │  $0  │  $0  │ ... │-$3.5M│  -$105M      │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────    │
│ LEVERED NET CF               │$0.3M │$0.2M │$3.1M │$3.5M │$1.5M │$1.5M │$3.8M │$3.7M │$3.5M │$3.3M │ ... │-$3.5M│  $331.3M     │
│ ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│ CUMULATIVE CF (Unlevered)    │-$3.2M│-$6.5M│-$6.9M│-$6.9M│-$8.9M│-$11M │-$10.7M│-$10.5M│-$10.5M│-$10.7M│ ... │$268.3M       │
│ ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ │
│                                                                                                                                      │
│ ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗            │
│ ║ DCF SUMMARY                                    [Discount Rate: 20%] [Recalculate]                              ║            │
│ ║ NPV @ 20%: $18.2M  |  IRR: 24.5%  |  Payback: Month 28  |  Exit Cap Rate: 5.5%                               ║            │
│ ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝            │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Notes

**Monthly cost flows require:** 
- Phased cost schedules from RPT_15 (Budget) — need monthly distribution logic (uniform, S-curve, or milestone-based)
- Loan draw schedule tied to phase milestones
- Interest accrual based on outstanding principal

**Monthly revenue flows require:**
- Sales schedule from RPT_16 (absorption month, sales rate, unit price)

**DCF calculations require:**
- Financial engine (`services/financial_engine_py/irr.py`, `npv.py`)
- Exit assumptions (bulk sale year, selling costs, cap rate for terminal value)

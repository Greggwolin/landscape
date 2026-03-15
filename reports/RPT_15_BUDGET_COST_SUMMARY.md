# Report 15: Budget / Cost Summary

## Overview
- **Property Types:** Land Development
- **Data Readiness:** PARTIAL (budget populated; actuals to-date not yet tracked)
- **Primary Data Source(s):** Budget tab (grid data), Financial Actuals (when implemented)
- **ARGUS Equivalent:** Development Costs > Budget v Actual
- **Peoria Lakes Equivalent:** r.Costs

## Column Layout

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| 1 | Category | Text | `lkp_budget_category.name` (Land Acq, P&E, Hard Costs, Financing, Contingency, Soft Costs) | ✅ |
| 2 | Description | Text | `core_fin_fact_budget.line_description` | ✅ |
| 3 | Budget (Base) | Currency | `core_fin_fact_budget.amount` (unadjusted) | ✅ |
| 4 | Budget (Escalated) | Currency | `core_fin_fact_budget.amount * escalation_factor` (3% annual per assumptions) | ✅ |
| 5 | Actual to Date | Currency | `core_fin_fact_actual.amount` (cumulative) | 🔧 DESIGN |
| 6 | Variance | Currency | `Escalated - Actual` (or `Actual - Budget` per convention) | 🔧 DESIGN |
| 7 | % Complete | Percentage | `Actual / Escalated * 100` | 🔧 DESIGN |
| 8 | Status | Badge | Green (on budget), Yellow (caution ±5%), Red (over 5%+) | ✅ |

## Row Structure

**Hierarchical grouping:** Category > Phase > Line Item (3 levels)

```
LAND ACQUISITION
├─ Phase 1
│  ├─ Land Purchase — Area A (2.50 ac × $350k/ac) | Base: $875K | Esc: $875K | Actual: — | Status: Pending
│  ├─ Land Purchase — Area B (3.00 ac × $350k/ac) | Base: $1.05M | Esc: $1.05M | Actual: — | Status: Pending
│  └─ Phase 1 Subtotal: Base $5.2M, Escalated $5.2M, Variance —
├─ Phase 2
│  └─ Phase 2 Subtotal: Base $4.8M, Escalated $4.8M, Variance —
└─ Category Total: Base $10.0M, Escalated $10.0M

PLANNING & ENTITLEMENTS
├─ Phase 1
│  ├─ Preliminary Site Planning | Base: $161.5K | Esc: $166K | Actual: $158K | Variance: $8K | 95% ✅
│  ├─ Civil Engineering | Base: $565.25K | Esc: $582K | Actual: $475K | Variance: $107K | 82% ✅
│  ├─ Environmental / Surveys | Base: $125K | Esc: $129K | Actual: $120K | Variance: $9K | 93% ✅
│  └─ Phase 1 Subtotal: Base $851.75K, Escalated $877K, Actual $753K
├─ Phase 2
│  └─ Phase 2 Subtotal: ...
└─ Category Total: Base $2.8M, Escalated $2.88M, Actual $2.1M

DEVELOPMENT COSTS (HARD COSTS)
├─ Phase 1
│  ├─ Access Road | Base: $1.64M | Esc: $1.74M | Actual: — | Status: In Progress
│  ├─ Project Onsites | Base: $3.28M | Esc: $3.48M | Actual: — | Status: In Progress
│  └─ Phase 1 Subtotal: Base $4.92M, Escalated $5.22M
└─ Category Total: Base $18.5M, Escalated $19.66M

FINANCING COSTS
├─ Construction Loan Interest | Base: $2.1M | Esc: $2.16M | Actual: $1.2M | Status: Tracking

CONTINGENCY
├─ 5% of Hard Costs | Base: $925K | Esc: $983K | Actual: $0 | Status: Unallocated

GRAND TOTAL
├─ Base: $104.3M | Escalated: $107.8M | Actual to Date: $3.6M | Variance: $104.2M | % Complete: 3%
```

## Section Breakdown

1. **Summary Card (above table)**
   - Total Budget (Base), Total Budget (Escalated), Total Actual to Date, Total Variance, Overall % Complete, Overall Status (On Budget / At Risk / Over Budget)

2. **Budget Detail Grid** (main)
   - Grouped by Category (Land Acq > P&E > Hard Costs > Financing > Contingency > Soft Costs)
   - Within each Category, grouped by Phase
   - Within each Phase, individual line items
   - All groups collapsible

3. **Subtotal Rows** (after each Phase within Category, after each Category)
   - Sum: Base, Escalated, Actual
   - Avg or sum for % Complete
   - Highest variance flagged

4. **Grand Total Row** (at bottom)
   - All metrics summed
   - Project-level status indicator

## Formatting Notes

- **Portrait orientation** (standard report width, narrow columns)
- **Currency formatting:** $0,000 (thousands grouped); use K notation for amounts >$1M (e.g., "$1.64M")
- **Decimal precision:** 2 decimals for currency, 0 decimals for percentage
- **Variance colors:** Green (< 2% variance), Yellow (2–5%), Orange (5–10%), Red (>10%)
- **Status badges:** Pending (gray), In Progress (blue), Complete (green), At Risk (orange), Over Budget (red)
- **Escalation assumption:** 3% annual inflation (configurable); apply year-by-year if project spans multiple years
- **Grouping:** Category rows bold; Phase subtotal rows shaded light gray; Category total rows bold + shaded darker gray
- **Frozen columns:** Category, Description (left 2 sticky on horizontal scroll)
- **Export:** CSV, Excel (with subtotals and formulas intact)

## Pending Inputs

- **Actual Costs:** `core_fin_fact_actual` table structure ready; ingestion pipeline for actuals not yet implemented (design phase)
- **Contingency allocation:** Currently unallocated; when actuals begin, track contingency burn separately
- **Soft Costs:** Soft cost line items (permits, title, insurance, legal, closeout) not yet entered; forecast these before construction begins
- **Financing detail:** Construction loan terms (rate, duration, draw schedule) needed to calculate interest accurately; currently placeholder estimate
- **Escalation rates:** Assume uniform 3% annual; if phased or category-specific inflation needed, update `lkp_budget_escalation_schedule`

## Sample Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BUDGET / COST SUMMARY — Peoria Meadows (Project 9)                                                  │
│ Summary: Base $104.3M | Escalated $107.8M | Actual $3.6M | Variance $104.2M | Complete 3%          │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Category              │ Description              │ Base      │ Escalated │ Actual  │ Variance │ %    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LAND ACQUISITION      │                          │           │           │         │          │      │
│                       │ Phase 1.1 Subtotal       │ $5.2M     │ $5.2M     │ —       │ —        │ 0%   │
│                       │ Phase 1.2 Subtotal       │ $4.8M     │ $4.8M     │ —       │ —        │ 0%   │
│ Land Acquisition Total│                          │ $10.0M    │ $10.0M    │ —       │ —        │ 0%   │
│                       │                          │           │           │         │          │      │
│ PLANNING & ENTITLEMENTS
│                       │ Phase 1 - Site Planning  │ $161.5K   │ $166K     │ $158K   │ $8K ✅   │ 95%  │
│                       │ Phase 1 - Civil Eng      │ $565.25K  │ $582K     │ $475K   │ $107K ✅ │ 82%  │
│                       │ Phase 1.1 Subtotal       │ $726.75K  │ $748K     │ $633K   │ $115K ✅ │ 85%  │
│                       │ Phase 1.2 Subtotal       │ $851.75K  │ $877K     │ $753K   │ $124K ✅ │ 86%  │
│ P&E Total            │                          │ $2.8M     │ $2.88M    │ $2.1M   │ $780K ✅ │ 73%  │
│                       │                          │           │           │         │          │      │
│ DEVELOPMENT COSTS    │                          │           │           │         │          │      │
│                       │ Phase 1.1 - Access Road │ $1.64M    │ $1.74M    │ —       │ —        │ 0%   │
│                       │ Phase 1.1 - Onsites     │ $3.28M    │ $3.48M    │ —       │ —        │ 0%   │
│                       │ Phase 1.1 Subtotal       │ $4.92M    │ $5.22M    │ —       │ —        │ 0%   │
│ Hard Costs Total     │                          │ $18.5M    │ $19.66M   │ $0.8M   │ $18.86M❌│ 4%   │
│                       │                          │           │           │         │          │      │
│ FINANCING COSTS      │ Const Loan Interest      │ $2.1M     │ $2.16M    │ $1.2M   │ $960K ✅ │ 56%  │
│ CONTINGENCY          │ 5% Reserve (unallocated) │ $925K     │ $983K     │ $0      │ $983K    │ 0%   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ GRAND TOTAL          │                          │ $104.3M   │ $107.8M   │ $3.6M   │ $104.2M  │ 3%   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

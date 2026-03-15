# Report 19: Cash Flow by Phase

## Overview
- **Property Types:** Land Development
- **Data Readiness:** PARTIAL (phase structure and costs assigned to phases; revenue pending pricing)
- **Primary Data Source(s):** `tbl_container` (phases), `core_fin_fact_budget`, phase metadata tables
- **ARGUS Equivalent:** Development: Cash Flow by Phase
- **Peoria Lakes Equivalent:** r.CF by Phase

---

## Purpose

Segment cash flow by development phase to isolate value and return by phase, track phasing schedule, and support phase-gated financing or refi scenarios. Each phase block shows its own revenue, costs, net position, and cumulative contribution to project IRR.

---

## Structure Overview

Report is organized as **repeating phase blocks**, each containing:
1. Phase Header (name, dates, units)
2. Revenue Section
3. Costs Section (by stage: Planning & Entitlements, Development)
4. Phase Totals (Net CF, Phase IRR, Contribution to Project IRR)
5. Horizontal divider

All phases roll up to a **Project Summary** section at the end.

---

## Phase Hierarchy (Peoria Meadows)

```
Village 1
├── Phase 1.1 (launch Q1 2026)
└── Phase 1.2 (launch Q3 2027)

Village 2
├── Phase 2.1 (launch Q2 2026)
└── Phase 2.2 (launch Q4 2027)

Village 3
├── Phase 3.1 (launch Q1 2027)
└── Phase 3.2 (launch Q2 2028)

Village 4
├── Phase 4.1 (launch Q3 2027)
└── Phase 4.2 (launch Q1 2028)
```

---

## Column Layout (Per Phase Block)

| Column | Header | Data Type | Source | Live? |
|--------|--------|-----------|--------|-------|
| Row | Category | TEXT | Budget hierarchy | ✅ |
| C1 | 2026 | CURRENCY | Budget items for this phase in 2026 | ✅ |
| C2 | 2027 | CURRENCY | Budget items for this phase in 2027 | ✅ |
| C3 | 2028 | CURRENCY | Budget items for this phase in 2028 | ✅ |
| C4 | 2029 | CURRENCY | Budget items for this phase in 2029 | ✅ |
| C5 | 2030 | CURRENCY | Budget items for this phase in 2030 | ✅ |
| ... | ... | ... | ... | ... |
| CTotal | Total (Phase) | CURRENCY | SUM across all years for this phase | ✅ |

---

## Row Structure per Phase Block

```
PHASE [Number]: [Name] ([Start Date] — [End Date])
Lots: [count] | Acres: [count] | Est. Units/SF: [count]

REVENUE
├── Gross Revenue (phase-specific lot sales, bulk proceeds attributed to phase)
├── Selling Costs (@ 4% of phase gross)
└── Net Revenue [subtotal, bold]

COSTS
├── Planning & Entitlements
│   ├── [subcategories per phase]
│   └── P&E Subtotal
├── Development Costs
│   ├── [subcategories per phase]
│   └── Dev Subtotal
└── Total Phase Costs [bold]

PHASE NET CASH FLOW [bold, highlight]
Phase IRR [metric]
Contribution to Project IRR [metric]

────────────────────────────────────────────
```

---

## Section Breakdown

### Phase Header
- **Phase Name & Number:** e.g., "PHASE 1.1: North Village — Launch Q1 2026, Completion Q4 2026"
- **Meta Row:** Lots: 12 | Acres: 45 | Est. Revenue Potential: $18.5M (when pricing known)
- **Start/End Dates:** Sourced from `tbl_container` phase metadata or user entry on Planning tab

### Revenue Section (Per Phase)
- **Gross Revenue:** SUM of all budget items with category='Revenue' filtered to this phase
- **Selling Costs:** Calculated as Gross Revenue × selling cost % (4% default, user-configurable per project)
- **Net Revenue:** Subtotal in bold, light gray background

### Costs Section (Per Phase, Expanded by Stage)
- **Planning & Entitlements:** Expandable group showing legal, engineering, approvals, utilities costs for this phase
- **Development Costs:** Expandable group showing site prep, utilities, roads, amenities, G&A for this phase
- **Total Phase Costs:** Bold subtotal

### Phase Totals
- **Net Phase Cash Flow:** Net Revenue - Total Phase Costs (bold, highlights if negative with red tint)
- **Phase IRR:** Calculated from phase-level cash flows only (if phase has distinct financing)
- **Contribution to Project IRR:** Shows how much this phase contributed to overall project return (metric, informational)

### Divider
Horizontal line separates each phase block for visual clarity.

---

## Project Summary Section (At End)

After all 8 phases, append:

```
PROJECT SUMMARY (All Phases Combined)

                          2026         2027         2028         2029         2030         2031         2032       2033+        TOTAL
Total Project Revenue     [SUM]        [SUM]        [SUM]        [SUM]        [SUM]        [SUM]        [SUM]      [SUM]        [TOTAL]
Total Project Costs       [SUM]        [SUM]        [SUM]        [SUM]        [SUM]        [SUM]        [SUM]      [SUM]        [TOTAL]
Net Project Cash Flow     [NET]        [NET]        [NET]        [NET]        [NET]        [NET]        [NET]      [NET]        [NET]

Project IRR: [calculated]
Equity Contribution: [GP 10% / LP 90% × total equity needed]
Waterfall Assumptions: Preferred 5% | Hurdle 10%/20% | Residual 45/55
```

---

## Formatting Notes

1. **Phase header:** Bold, all caps, size +1 or light background color to distinguish from cost rows
2. **Year columns:** Same as RPT_18 (right-aligned currency, 0 decimals, thousands separator)
3. **Negative values:** Parentheses + red text
4. **Subtotals:** Bold, `--cui-light` background
5. **Phase totals row:** Bold + `--cui-lighter` (darker than subtotal, lighter than grand total)
6. **Expandable groups:** Planning & Entitlements and Development Costs collapse/expand with +/− toggle
7. **Phase dividers:** Horizontal line, light gray (`--cui-border-color`)
8. **Column pinning:** Phase name pinned left; year columns scroll
9. **Alignment:** Names left; currency right

---

## Data Transformation Logic

```
For each Phase in [1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2]:
  For each Year in [2026..2033+]:
    Phase_Gross_Revenue = SUM(budget where phase_id=Phase AND year=Year)
    Phase_Selling_Costs = Phase_Gross_Revenue × 4%
    Phase_Net_Revenue = Phase_Gross_Revenue - Phase_Selling_Costs
    
    Phase_P&E = SUM(budget where phase_id=Phase AND stage='P&E' AND year=Year)
    Phase_Dev = SUM(budget where phase_id=Phase AND stage='Development' AND year=Year)
    Phase_Total_Costs = Phase_P&E + Phase_Dev
    
    Phase_Net_CF[Year] = Phase_Net_Revenue - Phase_Total_Costs
  
  Phase_Cumulative_CF = SUM(Phase_Net_CF[2026..YearN])
  Phase_IRR = IRR(Phase_Net_CF annual cash flows)
  
Then:
Project_IRR = IRR(SUM all phases' Net CF by year)
```

Apply cost inflation (3% annually) per project DCF settings.

---

## Pending Inputs

- [ ] Confirmation that all budget items in `core_fin_fact_budget` have phase_id populated (currently some may be at container level only)
- [ ] Phase start/end dates from `tbl_container` metadata or `tbl_phase` (legacy) — verify all 8 phases have dates
- [ ] Revenue allocation model: how to attribute bulk sale proceeds to individual phases? (uniform split? by acreage? by phase completion date?)
- [ ] Phase-level financing (e.g., construction loan for Phase 1 only, or single loan for all phases?)
- [ ] IRR calculation assumptions per phase (holding period, discount rate)

---

## Sample Layout (Abbreviated — Two Phases Shown)

```
PEORIA MEADOWS DEVELOPMENT PROJECT
Cash Flow by Phase

═══════════════════════════════════════════════════════════════════════════════

PHASE 1.1: NORTH VILLAGE — Launch Q1 2026, Completion Q4 2026
Lots: 12 | Acres: 45 | Est. Revenue Potential: $18.5M

                          2026         2027         2028         2029       TOTAL
REVENUE
Gross Revenue             $0           $0           $0           $0         $0
Selling Costs             $0           $0           $0           $0         $0
Net Revenue               $0           $0           $0           $0         $0

COSTS
Planning & Entitlements   $86,000      $110,000     $0           $0         $196,000
Development Costs         $191,000     $2,450,000   $1,125,000   $0         $3,766,000
Total Phase Costs         $277,000     $2,560,000   $1,125,000   $0         $3,962,000

PHASE 1.1 NET CASH FLOW   $(277,000)   $(2,560,000) $(1,125,000) $0         $(3,962,000)
Phase IRR: N/A (no revenue)
Contribution to Project IRR: TBD

───────────────────────────────────────────────────────────────────────────────

PHASE 1.2: NORTH VILLAGE EXTENSION — Launch Q3 2027, Completion Q2 2028
Lots: 14 | Acres: 52 | Est. Revenue Potential: $21.3M

                          2026         2027         2028         2029       TOTAL
REVENUE
Gross Revenue             $0           $0           $0           $0         $0
Selling Costs             $0           $0           $0           $0         $0
Net Revenue               $0           $0           $0           $0         $0

COSTS
Planning & Entitlements   $0           $175,000     $291,000     $0         $466,000
Development Costs         $0           $2,875,000   $2,437,500   $1,650,000 $6,962,500
Total Phase Costs         $0           $3,050,000   $2,728,500   $1,650,000 $7,428,500

PHASE 1.2 NET CASH FLOW   $0           $(3,050,000) $(2,728,500) $(1,650,000) $(7,428,500)
Phase IRR: N/A (no revenue)
Contribution to Project IRR: TBD

───────────────────────────────────────────────────────────────────────────────

[... 6 more phases ...]

═══════════════════════════════════════════════════════════════════════════════

PROJECT SUMMARY (All Phases Combined)

                          2026         2027         2028         2029       2030       2031       2032       2033+      TOTAL
Total Project Revenue     $0           $0           $0           $0         $0         $0         $0         $82,046,400 $82,046,400
Total Project Costs       $104,667,000 $10,261,000  $10,100,000  $10,100,000 $3,777,000 $2,450,000 $7,533,000 $1,155,000 $150,043,000
Net Project Cash Flow     $(104,667,000) $(10,261,000) $(10,100,000) $(10,100,000) $(3,777,000) $(2,450,000) $(7,533,000) $80,891,400

Project IRR: TBD (pending pricing & revenue)
Equity Required: $149.5M | Structure: GP 10% / LP 90%
Waterfall: Preferred 5% | Hurdle 10%/20% | Residual 45/55
```

---

## UI/UX Notes

- **Collapse/Expand All:** Top-right toggle to collapse/expand all phase blocks and detail rows
- **Phase Filter:** Optional sidebar to hide phases or jump to phase; useful for 8-phase projects
- **Comparison:** Ability to compare Phase 1.1 vs. Phase 2.1 side-by-side (for similar-sized phases)
- **Time Toggle:** Same as RPT_18 (Monthly / Quarterly / Annual / Overall)
- **Cost View:** Same toggle (Summary / By Stage / By Category / By Phase)
- **Export:** CSV, PDF, Excel with phase grouping preserved
- **Assumptions Panel:** Collapsible info box showing project-level DCF assumptions (discount rate, cost inflation, sell year, etc.)

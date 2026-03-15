# Report 20: Budget vs. Actual / Costs to Complete

## Overview
- **Property Types:** Land Development
- **Data Readiness:** PARTIAL (budget populated, actual and loan cost data pending)
- **Primary Data Source(s):** `core_fin_fact_budget`, `core_fin_fact_actual`, loan/financing metadata, phase containers
- **ARGUS Equivalent:** Development: Budget vs. Actual (By Phase or Summary)
- **Peoria Lakes Equivalent:** TMR Investors reporting format (Land Dev tracking)

---

## Purpose

Track project-to-date spending against approved budget and forecast costs-to-complete. Split actuals into equity vs. debt/lender funded to isolate each stakeholder's spend. Support phase-gated financials for lender/investor reporting and cash management.

---

## Column Layout

| Column | Header | Data Type | Source | Notes |
|--------|--------|-----------|--------|-------|
| Row | Description | TEXT | Budget line item + accounting code | Account mapping |
| C1 | AC (Count) | INTEGER | Phase container count or lot count | Unit measure |
| C2 | Project Budget | CURRENCY | Budget item amount (with inflation applied if >1 year) | Source of truth |
| C3 | Costs Thru Date | CURRENCY | Cumulative actual spend through report date | From actuals table |
| C4a | Actual to Date — Equity | CURRENCY | Portion of C3 paid from equity funds | Financing split |
| C4b | Actual to Date — Debt/Lender | CURRENCY | Portion of C3 paid from construction loan | Financing split |
| C5 | Costs to Complete | CURRENCY | Project Budget (C2) - Costs Thru Date (C3) | Forecast remaining |

---

## Row Structure (Grouped)

### Group 1: Land Acquisitions
```
LAND ACQUISITIONS
├── [Parcel 1 Name] — [acres]        [count] [budget] [actual-to-date] [equity|debt] [to-complete]
├── [Parcel 2 Name] — [acres]        [count] [budget] [actual-to-date] [equity|debt] [to-complete]
├── [Parcel 3 Name] — [acres]        [count] [budget] [actual-to-date] [equity|debt] [to-complete]
└── LAND ACQUISITION SUBTOTAL                        [SUM]    [SUM]       [SUM|SUM]    [SUM]
```

### Group 2: Soft Costs by Phase (Expandable per Phase)
```
SOFT COSTS
├── PHASE 1.1 (North Village)
│   ├── Legal & Environmental Review      [count] [budget] [actual] [equity|debt] [to-complete]
│   ├── Engineering & Design              [count] [budget] [actual] [equity|debt] [to-complete]
│   ├── Permits, Approvals & Fees         [count] [budget] [actual] [equity|debt] [to-complete]
│   ├── Utility Coordination & Offsite     [count] [budget] [actual] [equity|debt] [to-complete]
│   └── PHASE 1.1 SUBTOTAL                        [SUM]    [SUM]    [SUM|SUM]     [SUM]
├── PHASE 1.2 (North Village Ext.)
│   ├── [items as above]
│   └── PHASE 1.2 SUBTOTAL
├── PHASE 2.1 / 2.2 / 3.1 / 3.2 / 4.1 / 4.2 [repeating structure]
└── TOTAL SOFT COSTS (All Phases)                  [SUM]    [SUM]    [SUM|SUM]     [SUM]
```

### Group 3: Capital & Loan Costs
```
CAPITAL COSTS & LOAN CHARGES
├── Loan Origination Fee (@ % of loan amt) [count] [budget] [actual] [equity|debt] [to-complete]
├── Closing & Administrative Costs         [count] [budget] [actual] [equity|debt] [to-complete]
├── Interest Reserve (funded at closing)   [count] [budget] [actual] [equity|debt] [to-complete]
├── Loan Payoff Discount / Fee             [count] [budget] [actual] [equity|debt] [to-complete]
└── LOAN COST SUBTOTAL                             [SUM]    [SUM]    [SUM|SUM]     [SUM]
```

### Totals Section
```
─────────────────────────────────────────────────────────────────────────────
TOTAL ENTITLEMENTS & SOFT COSTS                   [SUM]    [SUM]    [SUM|SUM]     [SUM]
PROJECT TOTAL (Land + Soft + Loan Costs)         [SUM]    [SUM]    [SUM|SUM]     [SUM]
─────────────────────────────────────────────────────────────────────────────

TOTAL LOAN COSTS                                  [SUM]    [SUM]    [LOAN|—]      [SUM]
GRAND TOTAL (Project + Loan)                     [SUM]    [SUM]    [SUM|SUM]     [SUM]
```

---

## Column Definitions

### AC (Unit Count)
- **Land Acquisitions:** Lot count or parcel count (e.g., "12 lots")
- **Soft Costs:** Phase-level count or "per phase" indicator (e.g., "1 phase")
- **Loan Costs:** "1" or blank (non-unit-driven)

### Project Budget
- Original approved budget from `core_fin_fact_budget`
- **If inflation applied:** Show before-inflation budget here, note inflation % in header; or show after-inflation in this column and note in footnote
- Include all cost items through project completion or bulk sale year (Year 15 or user input)
- Lock this column to prevent overwrites during actuals reconciliation

### Costs Thru Date
- Cumulative sum of actual invoices from `core_fin_fact_actual` where status != 'rejected' and invoice_date <= report date
- If no actuals exist: blank or "–"
- **Color code:** Green if under budget variance; red if over budget variance

### Actual to Date — Equity vs. Debt/Lender
- **Equity column:** Sum of actuals where funding_source = 'Equity'
- **Debt column:** Sum of actuals where funding_source = 'Construction Loan' or 'Lender'
- Both columns must sum to Costs Thru Date (C3)
- **Critical for reporting:** Equity sponsors and lenders need separate spend tracking for draws, compliance, KPI monitoring

### Costs to Complete
- Forecast remaining spend: Project Budget (C2) - Costs Thru Date (C3)
- Typically blank until budget revisions; populated during project execution when variance is known
- **Color code:** Negative values (under budget) shown in green; positive (over budget) in red

---

## Section Breakdown

### Land Acquisitions
**Purpose:** Itemize land purchase commitments by parcel, critical for land dev projects.

**Rows:**
- One row per parcel acquired (or planned)
- Name pulled from parcel master or container name (e.g., "Parcel A — North 45 acres")
- Count = lot count within parcel (if applicable) or acreage
- Budget = total acquisition cost per parcel
- Actual = purchase price paid (once closed)
- Costs to Complete = remaining installments if purchase is phased (rare for land acquisition)

**Subtotal:** Bold, light gray background. Shows total land acquisition commitment and spend.

### Soft Costs by Phase
**Purpose:** Break entitlements and infrastructure planning costs by phase so lender/equity can see which phases are permitting-ready.

**Structure per Phase (expandable/collapsible):**
- Phase header: bold, indented
- Legal & Environmental Review — Legal fees, environmental assessment, title work
- Engineering & Design — Site plan, utility master plan, architectural design, geotechnical
- Permits, Approvals & Fees — City/county permits, Planning & Zoning approval, impact fees
- Utility Coordination & Offsite — Utility agreements, offsite infrastructure (water line extension, sewer, electric), easements

**Subtotal per phase:** Bold, slightly darker than main subtotal. Sum for single phase rolled into:

**Total Soft Costs:** Grand subtotal across all phases.

### Capital & Loan Costs
**Purpose:** Separate financing costs (lender-specific) from development costs (equity-driven).

**Rows:**
- Loan Origination Fee — % of construction loan amount (e.g., 2% × $X)
- Closing & Administrative Costs — Title insurance, appraisal, credit report, attorney
- Interest Reserve — Funded at loan closing, covers interest accrual during construction (est. 12 months for phased projects)
- Loan Payoff Discount / Fee — Any costs to retire construction loan (rare in development)

**Subtotal:** Bold. Always appears as debt-funded (Debt/Lender column only).

### Totals
**Total Entitlements & Soft Costs:** SUM of Land Acquisitions + All Soft Costs

**Project Total:** SUM of Land + Soft Costs + Loan Costs (this is the all-in project cost that drives equity waterfall)

**Total Loan Costs:** Separated for lender reporting; shows only in Debt/Lender column

**Grand Total:** Project Total (may include both equity-funded P&E and debt-funded fees)

---

## Formatting Notes

1. **Header Row:** Bold, background color `--cui-darker` (dark gray), text white
2. **Group Headers (Land Acq., Soft Costs, Capital Costs):** Bold, background `--cui-light`, left padding for hierarchy
3. **Phase Sub-headers (PHASE 1.1, etc.):** Bold, indented, background lighter than group header
4. **Line Items:** Normal weight, slight alternating row color for readability (every other row: #fafafa)
5. **Subtotals (per-phase, per-group):** Bold, background `--cui-light`, thin top border
6. **Section Totals (Project Total, Loan Costs, Grand Total):** Bold, background `--cui-lighter` or `--cui-secondary`, thicker top border
7. **Currency Formatting:** 0 decimals, thousands separator (e.g., $1,234,567), right-aligned
8. **Negative values (overage):** Wrapped in parentheses $(123,456), red text
9. **Variance Highlighting:**
   - Actual > Budget: Red tint on entire row or cell background
   - Actual < Budget: Green tint (optional, for favorable variance)
10. **Column pinning:** Description pinned left; AC, Budget, and totals scroll or visible
11. **Row expand/collapse:** Soft Costs by Phase section is collapsible; default expanded; shows only TOTAL SOFT COSTS row when collapsed

---

## Data Transformation Logic

```
Report Date = TODAY() or user-selected date

For each Land Parcel:
  AC = lot_count or acreage from container/parcel master
  Project_Budget = acquisition_cost from budget
  Costs_Thru_Date = SUM(actuals where parcel_id=Parcel AND status!='rejected' AND invoice_date <= Report Date)
  Equity_Portion = SUM(actuals where parcel_id=Parcel AND funding_source='Equity' ...)
  Debt_Portion = SUM(actuals where parcel_id=Parcel AND funding_source='Construction Loan' ...)
  Costs_to_Complete = Project_Budget - Costs_Thru_Date

For each Phase & Soft Cost Category:
  AC = 1 (per phase, non-unit)
  Project_Budget = SUM(budget where phase_id=Phase AND category='P&E' OR 'Soft Costs')
  Costs_Thru_Date = SUM(actuals where phase_id=Phase AND category='P&E' AND invoice_date <= Report Date)
  Equity_Portion = SUM(actuals where phase_id=Phase AND funding_source='Equity' ...)
  Debt_Portion = SUM(actuals where phase_id=Phase AND funding_source='Debt' ...)
  Costs_to_Complete = Project_Budget - Costs_Thru_Date
  
For Loan Costs:
  AC = 1
  Project_Budget = loan_origination_fee + closing_costs + interest_reserve + other loan fees
  Costs_Thru_Date = SUM(actuals where category='Loan Costs' AND invoice_date <= Report Date)
  Equity_Portion = $0 (loan costs are always debt)
  Debt_Portion = Costs_Thru_Date
  Costs_to_Complete = Project_Budget - Costs_Thru_Date

Subtotals = SUM(applicable rows)
```

---

## Pending Inputs

- [ ] `core_fin_fact_actual` records with invoice date, amount, funding source (equity vs. debt), phase/parcel mapping
- [ ] Construction loan details: principal amount, origination fee %, interest rate, anticipated advance schedule
- [ ] Interest reserve calculation: estimated interest expense during construction (months, rate, reserve %)
- [ ] Loan payoff assumptions: any discount or fee to retire loan early (if applicable)
- [ ] Phase-to-parcel mapping: which parcels belong to which phases? (Some parcels may straddle multiple phases)
- [ ] Variance threshold for highlighting: What % over/under budget triggers red/green highlighting?

---

## Sample Layout

```
PEORIA MEADOWS DEVELOPMENT PROJECT
Budget vs. Actual — Costs to Complete
As of March 14, 2026

                                          AC    Project Budget  Costs Thru Date  Actual: Equity  Actual: Debt   Costs to Complete
                                                                                                                             
LAND ACQUISITIONS                                                                                                           
Parcel A (North 45 acres)                45      $52,000,000      $26,000,000     $26,000,000      $0             $26,000,000
Parcel B (East 38 acres)                 38      $38,000,000      $38,000,000     $38,000,000      $0             $0
Parcel C (West 22 acres)                 22      $14,000,000      $12,000,000     $12,000,000      $0             $2,000,000
LAND ACQUISITION SUBTOTAL                        $104,000,000     $76,000,000     $76,000,000      $0             $28,000,000

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

SOFT COSTS

PHASE 1.1 — NORTH VILLAGE
Legal & Environmental Review               1      $75,000          $18,000         $18,000          $0             $57,000
Engineering & Design                       1      $120,000         $45,000         $45,000          $0             $75,000
Permits, Approvals & Fees                  1      $65,000          $22,000         $22,000          $0             $43,000
Utility Coordination & Offsite              1      $26,000          $8,500          $8,500           $0             $17,500
PHASE 1.1 SUBTOTAL                                $286,000         $93,500         $93,500          $0             $192,500

PHASE 1.2 — NORTH VILLAGE EXTENSION
Legal & Environmental Review               1      $85,000          $0              $0               $0             $85,000
Engineering & Design                       1      $150,000         $0              $0               $0             $150,000
Permits, Approvals & Fees                  1      $90,000          $0              $0               $0             $90,000
Utility Coordination & Offsite              1      $136,000         $0              $0               $0             $136,000
PHASE 1.2 SUBTOTAL                                $461,000         $0              $0               $0             $461,000

[PHASE 2.1, 2.2, 3.1, 3.2, 4.1, 4.2 repeating structure...]

TOTAL SOFT COSTS (ALL PHASES)                     $7,662,000       $93,500         $93,500          $0             $7,568,500

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

CAPITAL COSTS & LOAN CHARGES

Loan Origination Fee (2% of $45M)          1      $900,000         $0              $0               $0             $900,000
Closing & Administrative Costs             1      $150,000         $0              $0               $0             $150,000
Interest Reserve (12 months @ 5%)          1      $1,125,000       $0              $0               $0             $1,125,000
LOAN COST SUBTOTAL                                $2,175,000       $0              $0               $0             $2,175,000

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

TOTAL ENTITLEMENTS & SOFT COSTS                   $111,837,000     $93,500         $93,500          $0             $111,743,500
PROJECT TOTAL (Land + Soft + Loan)               $113,562,000     $76,093,500     $76,093,500      $0             $37,468,500

═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

TOTAL LOAN COSTS                                  $2,175,000       $0              $0               $0             $2,175,000
GRAND TOTAL (All Costs)                          $115,737,000     $76,093,500     $76,093,500      $0             $39,643,500
```

---

## UI/UX Notes

- **Report Date Picker:** Top-left dropdown; defaults to TODAY(); allows historical snapshot (e.g., "as of Q1 2026")
- **Expand/Collapse:** Each phase group (Soft Costs) can collapse to show only phase subtotals; button toggles all at once
- **Variance Analysis:** Toggle on/off a "Variance %" column showing (Actual - Budget) / Budget for quick spotting of problem areas
- **Funding Split Visibility:** Option to combine Equity + Debt columns into single "Costs Thru Date" (default: split view)
- **Parcel Map:** Link from parcel name to GIS map view showing parcel boundary and current spend overlay
- **Drill-down:** Click any line item to open invoice list / actual record detail in drawer
- **Export:** CSV, PDF (multi-page, grouped by section), Excel with phase grouping preserved
- **Actuals Feed:** "Recent Actuals" sidebar showing last 5 invoices posted, auto-refresh every 60s
- **Budget Revision History:** Footnote or modal showing "Budget approved XYZ, revised ABC" with version dates

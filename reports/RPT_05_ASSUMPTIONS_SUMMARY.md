# Report 5: Assumptions Summary

## Overview
- **Property Types:** Universal (Land Dev, Multifamily, Mixed Use)
- **Data Readiness:** PARTIAL
- **Primary Data Source(s):** Project Profile tab, Land Use mix, Feasibility sidebar, Income Approach sidebar, Capitalization, DCF parameters
- **ARGUS Equivalent:** Assumptions / Inputs pages (typically r.Assumptions-Summary + r.Assumptions-Detail)
- **Peoria Lakes Equivalent:** r.Assumptions-Static (consolidated reference worksheet)

---

## Column Layout

*No formal columns — sections organized by property type and topic area*

### Section 1: Project Overview (Universal)
| Field | Value |
|-------|-------|
| Project Name | |
| Project Type | Land Dev / MF / Mixed Use |
| Location (Address) | |
| Submarket / County | |
| Analyst Name | |
| Analysis Date | |
| Report Purpose | Feasibility / Valuation / Other |

### Section 2: Land Development Only — Land Use & Product

| Land Use Type | Units / Acres | Unit Product | % of Total |
|---------------|---------------|--------------|-----------|
| Single Family | # units | 50' lot | X% |
| Townhome | # units | 25' lot | X% |
| ... | ... | ... | X% |
| Open Space | X acres | — | X% |
| **TOTAL** | **X units / X acres** | | **100%** |

### Section 3: Land Development Only — Pricing & Growth

| Assumption | Year 1 | Year 2 | Year 3 | Growth Rate |
|------------|--------|--------|--------|-------------|
| Price per Unit (e.g., SF) | $/unit | $/unit | $/unit | X% annual |
| Price per Acre (common land) | $/ac | $/ac | $/ac | X% annual |
| Price Inflation | — | — | — | X% annually |

### Section 4: Land Development Only — Costs

| Cost Item | Year 1 | Year 2 | Year 3 | Total Budget | Notes |
|-----------|--------|--------|--------|--------------|-------|
| Land Acquisition | $ | — | — | $ | |
| Infrastructure | $ | $ | $ | $ | |
| Amenities | $ | $ | $ | $ | |
| Soft Costs (design, permits, etc.) | $ | $ | $ | $ | |
| Contingency | — | — | — | $ | % of hard costs |
| **TOTAL DEVELOPMENT COST** | **$** | **$** | **$** | **$** | |

### Section 5: Land Development Only — DCF Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Discount Rate | X.X% | Used for NPV calculation |
| Holding Period | X years | Project hold / sale year |
| Selling Costs | X% of proceeds | Broker commissions, closing costs |
| Bulk Sale Year | Year X | When property exits (if applicable) |
| Inflation Rate (costs) | X.X% annually | Applied to future-year costs |

### Section 6: Multifamily Only — Unit Mix

| Unit Type | Count | % of Total | Avg SF | Avg Rent (MoM) | Notes |
|-----------|-------|-----------|--------|----------------|-------|
| Studio | # | X% | SF | $ | |
| 1BR | # | X% | SF | $ | |
| 2BR | # | X% | SF | $ | |
| **TOTAL UNITS** | **#** | **100%** | | | |

### Section 7: Multifamily Only — Rent & Revenue Assumptions

| Assumption | Value | Notes |
|------------|-------|-------|
| **Gross Potential Rent (GPR)** | **$X.XXM annually** | |
| Rent per SF (blended) | $/SF/month | |
| Annual Rent Growth | X.X% | |
| Seasonal adjustment | Y/N | |
| **Vacancy & Credit Loss** | | |
| Vacancy Rate | X.X% | % of GPR |
| Credit Loss Rate | X.X% | Bad debt as % of OPR |
| Effective Gross Income (EGI) | $X.XXM | EGI = GPR × (1 - Vacancy) × (1 - Credit Loss) |

### Section 8: Multifamily Only — Operating Expense Assumptions

| Expense Category | Annual $ | % of EGI | Growth Rate |
|------------------|----------|---------|-------------|
| Personnel (mgmt, maintenance) | $ | X% | X% annually |
| Utilities | $ | X% | X% annually |
| Repairs & Maintenance | $ | X% | X% annually |
| Insurance | $ | X% | X% annually |
| Taxes & Licenses | $ | X% | X% annually |
| Office & Administrative | $ | X% | X% annually |
| Reserves | $ | X% ($/unit/month) | — |
| Management Fee (% of EGI) | X% | — | — |
| **TOTAL OPERATING EXPENSES** | **$X.XXM** | **X%** | |
| **NET OPERATING INCOME (NOI)** | **$X.XXM** | **X%** | |

### Section 9: Multifamily Only — Valuation Assumptions

| Metric | Value | Notes |
|--------|-------|-------|
| Capitalization Rate | X.XX% | Used in Direct Cap approach |
| Cap Rate Growth / Decline | ±X% | If cap rate assumed to change over hold period |
| Discount Rate (DCF) | X.X% | Used for NPV of terminal value |
| Terminal Cap Rate | X.XX% | Cap rate assumed at exit/year N |
| Expected Holding Period | X years | Years until assumed disposition |
| Annual NOI Growth (Stabilized) | X.X% | Applied to stabilized year forward |

### Section 10: Financing Assumptions (Universal)

| Item | Value | Notes |
|------|-------|-------|
| **Land Development / Construction Loan** | | |
| Loan Amount | $ | |
| Loan-to-Value (LTV) | X.X% | |
| Interest Rate | X.XX% annually | |
| Draw Schedule | [describe] | Annual / quarterly / per unit |
| Loan Term | X months | Construction period |
| | | |
| **Permanent Loan (if applicable)** | | |
| Loan Amount | $ | Post-delivery |
| LTV | X.X% | Based on value or cost |
| Interest Rate | X.XX% | Fixed / floating |
| Amortization | X years | Full amortization period |
| Maturity | X years | Balloon / full payoff |
| Prepayment Penalty | [Y/N, details] | Lock-out period, yield maintenance, defeasance |

### Section 11: General Assumptions & Macro Parameters

| Assumption | Value | Notes |
|------------|-------|-------|
| Analysis Perspective | Developer / Lender / Investor | Determines risk-adjusted metrics |
| Inflation Rate (general) | X.X% annually | For cost projections not otherwise specified |
| Capitalization Method | Direct Cap / DCF / Both | Used in valuation synthesis |
| Growth Stage Assumed | Development / Lease-up / Stabilized / Mature | When does project reach stabilization? |
| Market Conditions | Tight / Neutral / Soft | Affects rent growth, cap rates, vacancy |
| Risk Adjustment | [describe] | Any adjustments to rates for market/project-specific risk |

---

## Row Structure

**Sections ordered by analytical workflow:**

1. **Project Overview** — Metadata (name, location, date, purpose)
2. **Land Use & Product** (Land Dev only)
3. **Pricing & Growth** (Land Dev only)
4. **Costs** (Land Dev only)
5. **DCF Parameters** (Land Dev only)
6. **Unit Mix** (MF only)
7. **Rent & Revenue** (MF only)
8. **Operating Expenses** (MF only)
9. **Valuation** (MF only)
10. **Financing** (Universal)
11. **General Macro** (Universal)

Each section uses simple two- or three-column tables. Sections separated by light rules.

---

## Section Breakdown

### Section 1: Project Overview
Identify the project and analysis intent. Metadata block only.

### Sections 2–5: Land Development Path (if LAND property type)
- **Land Use & Product:** Mix of uses (SF, townhome, commercial, common areas) with acreage or unit counts
- **Pricing & Growth:** Entry-level price per unit and assumed price appreciation
- **Costs:** Budget by cost category (land, infrastructure, soft costs, contingency) by year and total
- **DCF Parameters:** Discount rate, hold period, selling costs, inflation rates

### Sections 6–9: Multifamily Path (if MF property type)
- **Unit Mix:** Bedroom breakdown with rent levels
- **Rent & Revenue:** GPR, vacancy, credit loss, annual growth
- **Operating Expenses:** All operating costs, reserves, management fee; total OpEx; calculated NOI
- **Valuation:** Cap rates, discount rate, terminal value assumptions, holding period

### Section 10: Financing (Universal)
Two financing scenarios if applicable:
- **Construction/Development Loan** — Term loan for land acquisition and development
- **Permanent Loan** — Long-term mortgage post-delivery (MF) or post-exit (Land Dev)

Include LTV, rate, term, draw schedule, prepayment terms.

### Section 11: General Assumptions
Catch-all for analysis perspective, inflation, growth stage, and market conditions that affect overall feasibility/valuation.

---

## Formatting Notes

- **Orientation:** Portrait
- **Currency:** $X,XXX (comma thousands; no cents unless < $1k)
- **Percentages:** X.X% or X.XX% (one or two decimal places, depending on precision)
- **Capitalization:** Subheading for each section in bold. Column headers bold.
- **Alignment:** Text left, currency/numbers right, percentages right
- **Section breaks:** Light horizontal rule between sections
- **Page breaks:** Insert after Section 6 (after MF Revenue section) to avoid orphans
- **Total rows:** Bold and slightly shaded (light gray background if possible)
- **Notes column:** Right-aligned, italic, gray font (10pt vs. 11pt body)
- **Color:** Use CoreUI CSS vars (`--cui-gray-200` for section backgrounds if multi-page)

---

## Pending Inputs

- [ ] Project Profile completion: Name, address, type, location, analysis date, purpose
- [ ] Land Use configuration (Land Dev): Unit counts, product types, acreage by use
- [ ] Pricing assumptions: Entry price per unit or per acre, annual growth rate
- [ ] Cost budget: Populated in Feasibility sidebar (Land Acq, Infra, Soft, Contingency)
- [ ] DCF parameters: Discount rate, holding period, selling costs, inflation (set in Feasibility)
- [ ] Unit mix (MF): Bedroom counts and distribution; average rent by type
- [ ] Rent roll / Income Approach assumptions: GPR, vacancy, credit loss, expense categories, management fee (set in Income Approach sidebar)
- [ ] Capitalization assumptions: Cap rate, terminal rate, discount rate (set in Capitalization panel)
- [ ] Financing details: Loan amount, LTV, rate, term, prepayment terms (set in Capitalization)
- [ ] Market & macro: General inflation, market stage (tight/neutral/soft), risk adjustments (set in Project Profile / Feasibility)

---

## Sample Layout

```
ASSUMPTIONS SUMMARY
[Project Name] | [Property Type] | [Address]
Analysis Date: [Date] | Analyst: [Name] | Purpose: [Feasibility / Valuation]

─────────────────────────────────────────────────────────────────────────

PROJECT OVERVIEW
Field                      Value
────────────────────────────────────────────────
Project Name               Peoria Meadows MPC
Project Type               Land Development (Mixed Use)
Location                   Peoria, Illinois (Peoria County)
Analysis Date              2026-03-14
Analyst Name               [Analyst]
Report Purpose             Feasibility & Financial Modeling

─────────────────────────────────────────────────────────────────────────

LAND USE & PRODUCT MIX
Land Use Type              Units/Acres    Unit Product         % of Total
──────────────────────────────────────────────────────────────────────
Single Family              1,200 units    50' × 120' lot       35.0%
Townhome                   1,600 units    25' × 120' lot       46.5%
Common Area / Parks        42 acres       —                    18.5%
────────────────────────────────────────────────────────────────────────
TOTAL                      2,800 units    Mixed                100.0%

─────────────────────────────────────────────────────────────────────────

PRICING & GROWTH ASSUMPTIONS
Item                       Year 1         Year 2       Year 3    Growth Rate
──────────────────────────────────────────────────────────────────────────
SF Avg Price               $385,000/unit  $397,050/u   $409,362  3.1% annual
Townhome Avg Price         $298,000/unit  $306,938/u   $316,150  3.0% annual
Price Inflation            —              —            —         3.0% annual

─────────────────────────────────────────────────────────────────────────

COST BUDGET & SCHEDULE
Cost Item                  Year 1         Year 2       Year 3    Total Budget
──────────────────────────────────────────────────────────────────────────
Land Acquisition           $(24.0M)       —            —         $(24.0M)
Hard Costs (Infra, Roads)  $(35.0M)       $(32.0M)     $(28.0M)  $(95.0M)
Soft Costs (Design, Perm)  $(3.5M)        $(2.0M)      $(1.0M)   $(6.5M)
Contingency (10% HC)       $(3.9M)        $(3.2M)      $(2.8M)   $(9.9M)
────────────────────────────────────────────────────────────────────────────
TOTAL DEVELOPMENT COST     $(66.4M)       $(37.2M)     $(31.8M)  $(135.4M)

─────────────────────────────────────────────────────────────────────────

DCF & FINANCIAL PARAMETERS
Parameter                  Value          Notes
────────────────────────────────────────────────
Discount Rate              20.0%          NPV calculations; risk-adjusted for dev stage
Holding Period             30 years       Bulk sale / exit assumed Year 15
Selling Costs              4.0% of proceeds  Broker commissions, closing costs
Bulk Sale Year             Year 15        Phase buildout complete; stabilized exit
Inflation Rate (costs)     2.5% annually  Applied to soft costs, contingency

─────────────────────────────────────────────────────────────────────────

FINANCING ASSUMPTIONS
Loan Type                  Amount         LTV        Rate      Term        Notes
────────────────────────────────────────────────────────────────────────────
Development Loan           $108.3M        80%        6.50%     36 months   Construction period
Interest-Only draws        Variable       —          Monthly   —           Funded per construction schedule
────────────────────────────────────────────────────────────────────────────
Permanent Loan (Post-Exit) $85.0M         60%        5.50%     25 years    Assumed Year 15 exit
Fixed Rate                 —              —          5.50%     —           No rate adjustment
Prepayment                 Y              —          —         Year 5+      1% penalty

─────────────────────────────────────────────────────────────────────────

[If MF Property: Sections 6–9 would follow]

GENERAL ASSUMPTIONS & MACRO PARAMETERS
Assumption                 Value          Notes
────────────────────────────────────────────────
Analysis Perspective       Developer      Developer risk/return view; all-in to exit
Market Conditions          Tight          Limited inventory; strong demand; 3% rent growth
Inflation Rate (General)   2.5% annually  For costs not otherwise specified
Risk Adjustment            +2% to cap rate Project-type risk premium vs. stabilized asset

─────────────────────────────────────────────────────────────────────────
Generated by Landscape | Source: Project Profile, Feasibility, Capitalization panels
Last updated: [timestamp]
```

---

*This report consolidates all key assumptions from across the project into a single reference page for audit, stakeholder review, and sensitivity analysis.*
*Source data updated: Feasibility sidebar, Income Approach (MF), Capitalization (financing, cap rates).*

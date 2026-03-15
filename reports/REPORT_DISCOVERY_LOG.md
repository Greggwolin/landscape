# Report Discovery Log

**Date:** March 14, 2026
**Projects Audited:** Peoria Meadows (project 9, Land Dev) | Chadron Terrace (project 17, Multifamily)
**Auditor:** Cowork session

---

## CORRECTIONS (Post-Discovery)

**1. MF Capitalization folder:** Chadron was audited in Investment/Valuation mode, which hides the Capitalization folder. **MF projects DO have Capitalization (Debt/Equity) when switched to Underwriting perspective.** Report designs RPT_01-04 apply to MF in Underwriting mode. The original discovery section 25 ("Capital > Debt — Chadron: N/A") is incorrect — it was a perspective issue, not a missing feature.

**2. Peoria Meadows data loss (discovered ~Mar 13):** Land use and sales data was broken/wiped the day before this audit. The parcel structure (42 parcels, 4 areas, 8 phases) appeared intact during discovery, but sales pricing per land use type and absorption rates — which previously populated cash flow revenue — were gone. This explains: (a) Revenue = $0 across all cash flow periods, (b) Land Use Pricing section showing "No parcels configured", (c) IRR/EM at 0%/0.00x. **The report designs for RPT_16-19 assume this data will be restored.**

**3. Re-check after UI fix (Mar 14, later session):** CC fixed a UI issue. Re-screenshotted Peoria Meadows. Findings:

- **Land Use tab: RESTORED.** 9 families visible (Residential with 5 types incl. SFD/24 parcels, SFA/3, BTR/1, Condo, MF/2; Commercial 1; Industrial 3; Common Areas 5; Public 3; Other 3; Institutional 5; Mixed Use 0; Open Space 6). Bottom bar: 2 Types Selected, 3 Products Selected, 30/43 Parcels Covered. Product badges: 40x110, 45x110, 50x110.
- **Land Use Pricing: RESTORED.** 15+ product rows with pricing — SFD lots at $2,400/FF, BFR SFD $60K/Unit, APTS $25K/Unit, 6/6Pack & 7/8 Pack $50K/Unit, Commercial & Mixed Use $10/SF, Open Space $0/Acre. Townhomes row present but no UOM/price set.
- **Budget grid: POPULATED.** Phase-by-phase line items with Stage, Category, Description, Units, Acres, FrtFt, UOM, Rate, Amount, Escalated, Var, Start, Duration columns. Multiple phases visible (1.1, 1.2, 2.1, 2.2+).
- **Cash Flow: COSTS FLOWING, REVENUE STILL $0.** Land Acquisition $104M, P&E $6.9M, Development $33.3M. Total Costs $144.24M. But Gross Revenue / Net Revenue = $0 across all 96 periods. IRR 0%, EM 0.00x, NPV(20%) = -$125.8M. Revenue likely requires sales absorption schedule to be configured (separate from pricing).
- **Returns tab: "Coming Soon" placeholder.** IRR/NPV/EM calculations — not implemented.
- **Sensitivity tab: "Coming Soon" placeholder.** Assumption sensitivity analysis — not implemented.
- **Market tab: FULLY POPULATED.** 177 SFD comps, Median $600K / $245/SF. 13 competitive projects with builder/units/pricing/absorption. Landscaper AI insights generated. Map with comp pins.
- **Parcels tab: INTACT.** 4 Areas, 8 Phases, 42 parcels still present.

**4. Nav structure changes (observed Mar 14 re-check):**
- **Acquisition sub-tab REMOVED** from Property folder (was previously present)
- **Capitalization folder REMOVED** from Land Dev nav (was previously: Project | Property | Development | Feasibility | Capitalization | Reports | Documents | Map)
- **Feasibility folder now shows "Valuation" subtitle** (displays as "Feasibility / Valuation")
- **Current Land Dev nav:** Project | Property (Market/Land Use/Parcels) | Development (Budget/Sales) | Feasibility-Valuation (Cash Flow/Returns/Sensitivity) | Reports | Documents | Map
- **Perspective badges:** "Land Developm..." / "Development" / "Valuation" shown below project selector

---

## Navigation Architecture Summary

### Peoria Meadows (Land Dev) — Updated Mar 14
Folders: Project | Property (Market/Land Use/Parcels) | Development (Budget/Sales) | Feasibility-Valuation (Cash Flow/Returns/Sensitivity) | Reports | Documents | Map
*(Note: Acquisition sub-tab removed from Property. Capitalization folder removed from Land Dev. Feasibility now shows "Valuation" subtitle. Returns and Sensitivity are "Coming Soon" stubs.)*

### Chadron Terrace (Multifamily — Valuation Perspective)
Folders: Project | Property (Location/Market/Property Details/Rent Roll) | Operations | Valuation (Sales Comp/Cost/Income/Market Comps/Reconciliation) | Reports | Documents | Map

### Chadron Terrace (Multifamily — Underwriting Perspective)
Folders: Project | Property | Operations | Valuation | **Capitalization (Debt/Equity)** | Reports | Documents | Map

**Key differences:** MF in Valuation mode hides Capitalization folder. MF in Underwriting mode exposes it. Land Dev has no Operations or Valuation folder. Development folder (Land Dev) maps to Budget + Sales sub-tabs. Feasibility (Land Dev) maps to Cash Flow.

---

## 1. Project (Home) — Peoria Meadows

**Populated Data:**
- Property Type: Land Development
- Subtype: Master Planned Community
- Project Name: Peoria Meadows
- Address: 303 and Lake Pleasant Pkwy, Phoenix, Arizona 85383
- Gross Acres: 1,500 ac
- County: Maricopa
- Market: Phoenix-Mesa-Chandler, AZ
- Ownership: Fee Simple
- Perspective: Development
- Purpose: Underwriting
- Analysis Start: Dec 31, 2025
- Map: 3D Oblique View with pin

**Empty / Placeholder:**
- Target Units: "Not specified"
- APN: "Not specified"
- Asking Price: "Not specified"
- Photos: "Add Photo" button only, no photos

**Visual Issues:**
- None

**Report Readiness:** PARTIAL

---

## 2. Project (Home) — Chadron Terrace

**Populated Data:**
- Property Type: Multifamily
- Subtype: Garden-Style Apartment
- Project Name: Chadron Terrace
- Address: 14105 Chadron Avenue, Hawthorne, CA 90250
- Units: 113
- Gross Acres: 3 ac
- County: Los Angeles
- Market: Los Angeles-Long Beach-Anaheim, CA
- APN: 4052-022-015
- Ownership: Fee Simple
- Perspective: Investment
- Purpose: Valuation
- Acquisition Cost: $0
- Analysis Start: Feb 28, 2026
- Photos: Photos (9)
- Map: 3D Oblique View with pin

**Empty / Placeholder:**
- Acquisition Cost shows $0 (likely not entered)

**Visual Issues:**
- None

**Report Readiness:** READY

---

## 3. Property > Acquisition — Peoria Meadows

**Populated Data:**
- Acquisition Ledger table (Date, Action, Category, Subcategory, Description, Amount, Apply)
- One row: 2026-01-01, Deposit, Land Cost, Closing Costs, $104,000,000, Apply = yes

**Empty / Placeholder:**
- Description column shows dash
- Only 1 ledger entry

**Visual Issues:**
- None

**Report Readiness:** PARTIAL
**[SCREEN EXPORT CANDIDATE]** — HTML table

---

## 4. Property > Market — Peoria Meadows

**Populated Data:**
- SFD Pricing panel: Median Price $599,000, Median $/SF $244, 25th-75th Percentile $515,000-$768,000, Avg Year Built 2011
- Search parameters: Radius 3mi, Days 180, 178 comps
- Comp table: Sold date, Address, City, Year, Lot SF, Band (lot width badges), Bd, Ba, SqFt columns — all populated with real sales data
- Landscaper Analysis panel: Market Insights based on 13 competitive projects, price range $505,900-$940,990, avg list $681,810, absorption 3.89 units/month

**Empty / Placeholder:**
- Year Built filter shows "YYYY" placeholder

**Visual Issues:**
- Sq column truncated at right edge of table

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — HTML table (comp sales grid)

---

## 5. Property > Land Use — Peoria Meadows

**Populated Data:**
- 9 Land Use Families: Residential (1 active), Commercial (2), Industrial (3), Common Areas (5), Public (3), Other (3) — plus more below fold
- Residential Types: 5 types shown (Single Family SFD 24 parcels, Single Family Attached SFA 3 parcels, Build-to-Rent BTR 1 parcel, Condo, Multifamily MF 2 parcels)
- Toggle switches for enabling/disabling types
- "Coming Soon" banner about PAD/zoning auto-detection

**Empty / Placeholder:**
- Details panel: "Select a type to view development standards and products"

**Visual Issues:**
- None

**Report Readiness:** READY

---

## 6. Property > Parcels — Peoria Meadows

**Populated Data:**
- Planning Overview header with hierarchy config (Level 1 = Village, Level 2 = Phase, Level 3 = Parcel)
- Planning Efficiency: 57.0%
- Villages section: 4 areas (Area 1: 254 ac/11 parcels/1102 units, Area 2: 383 ac/16 parcels/1757 units, Area 3: 242 ac/5 parcels/0 units, Area 4: 214 ac/11 parcels/548 units)
- Phases table: 8 phases with Land Use tags, Acres, Units, Notes/Filter actions
- Parcel Detail Table: Full grid with Area, Phase, Parcel, Use Family, Use Type, Product, Acres, Units, DUA, FF/Acre — all populated for 42+ parcels
- Export Report button on Planning Overview and Areas/Phases

**Empty / Placeholder:**
- Area 3 shows 0 units (retail-only area)
- Some DUA and FF/Acre fields show dash for non-residential parcels

**Visual Issues:**
- None

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Parcel Detail Table (HTML table), Phases table (HTML table)

---

## 7. Property > Location — Chadron Terrace

**Populated Data:**
- Economic Indicators sidebar: Population at 5 geo levels (US 340.21M, California 39.43M, MSA 12.93M, County 9.76M, City 158.4k) with growth rates
- Employment at 2+ levels (US 158.47M, California 18.02M)
- Location Analysis: "Hawthorne, CA" with 6-section AI-generated analysis
- Section T1: National & State Economy — full narrative text
- "Generated 5:10:29 PM" timestamp

**Empty / Placeholder:**
- "Analysis may be outdated" warning banner

**Visual Issues:**
- None

**Report Readiness:** READY

---

## 8. Property > Market — Chadron Terrace

**Populated Data:**
- MF Rental Market: Supply & Demand Overview
- KPI cards: Avg Market Rent $2,049, Competitive Units 744 (7 properties)
- Competitive Rental Supply table: 7 properties with Property name, Year, Units, Plans, Avg Rent, Occ, Distance
- Competition Map with 7 locations plotted
- Supply Overview section with AI narrative

**Empty / Placeholder:**
- Avg Occupancy: dash (not populated)
- Pipeline: dash (under construction/planned not populated)
- Several comps showing dash for Avg Rent and Occ columns

**Visual Issues:**
- None

**Report Readiness:** PARTIAL (missing occupancy and pipeline data)
**[SCREEN EXPORT CANDIDATE]** — Competitive Rental Supply (HTML table)

---

## 9. Property > Property Details — Chadron Terrace

**Populated Data:**
- Physical Description panel:
  - Property Identification: 10/10 fields (Name, Address, City, State, ZIP, Market MSA, Submarket, County, APN Primary, APN Secondary)
  - Site Characteristics: 2/11 fields (Lot Size 2.75 ac shown)
- Floor Plan Matrix: 5 plans (1BR/1BA: 22 units $1,543, 2BR/2BA: 53 units $2,136, 3BR/2BA: 33 units $2,667, Commercial: 4 units $4,397, Office: 1 unit dash) with Bed, Bath, SF, Units, Current rent
- Property Description: AI narrative about 113-unit property

**Empty / Placeholder:**
- Site Characteristics: 9 of 11 fields not populated
- Office plan: no current rent

**Visual Issues:**
- None

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Floor Plan Matrix (HTML table)

---

## 10. Property > Rent Roll — Chadron Terrace

**Populated Data:**
- KPI cards: Occupancy 90.3% (102/113), Avg Current Rent $2,200/unit/month, Avg Market Rent $2,477/unit/month, Growth Potential +12.6%, Monthly Income $224.4k, Rent/SF $2.09
- Detailed Rent Roll grid: 113 units with Unit, Plan, Bed, Bath, SF, Tenant, Status (Occupied/Vacant badges), Lease Start, Lease End, Current Rent, Market Rent, Tags, Additional Tags, Actions
- "Populates Floor Plans" button, Configure Columns button, + Add Unit

**Empty / Placeholder:**
- Many Vacant units show dash for Lease Start/End/Current Rent
- Tenant names: some show "Current Tenant" placeholder
- Additional Tags: mostly dashes

**Visual Issues:**
- None — grid renders cleanly at 1500px

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Rent Roll grid (HTML table with configurable columns)

---

## 11. Operations — Chadron Terrace

**Populated Data:**
- Operating Statement header: Units 113, SF 138,504
- Revenue table: 5 unit types with Units, Rent/Mo, Annual, $/SF, Loss to Lease
  - 1BR/1BA: 22 units, $1,403/mo, $370,351 annual, $247,949 LTL
  - 2BR/2BA: 53 units, $1,975/mo, $1,256,028 annual, $345,072 LTL
  - 3BR/2BA: 33 units, $2,561/mo, $1,014,119 annual, $13,081 LTL
  - Commercial: 4 units, $1,099/mo, $52,760 annual
  - Office: 1 unit (dash for rent)
  - **Potential Rental Income: $2,693,258**
- Vacancy & Deductions: Physical Vacancy 9.7% ($262,176), Credit Loss 0.5% ($13,466), Concessions 1.0% ($26,933)
- **Effective Gross Income: $2,390,684**
- Expenses by 6 categories: Taxes & Insurance ($774K, 65.8%), Utilities ($109K), Repairs & Maintenance ($94K), Administrative ($39K), Other ($34K), Management & Reserves ($125K)
- **Total Operating Expenses: ($1,175,740)**
- **Net Operating Income: $1,214,944**
- Treemap charts: Income by Floorplan, Expenses by Category

**Empty / Placeholder:**
- Office unit: no rent data
- Expense line item names not visible in screenshot (accessible via read_page)

**Visual Issues:**
- Expense detail section below fold, scroll behavior sticky (content in fixed-height container)

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Operating Statement (HTML table, drag-to-recategorize)

---

## 12. Operations — Peoria Meadows

**Note:** Land Dev projects have NO Operations tab. URL routing falls back to Project tab. This is expected — Land Dev projects don't have traditional P&L/operating statements.

**Report Readiness:** N/A

---

## 13. Development > Budget — Peoria Meadows

**Populated Data:**
- Budget grid with columns: Phase, Stage, Category, Description, Units, Acres, Frt Ft, UOM, Rate, Amount, Escalated, Var
- Villages/Phases collapsible header
- Multiple line items per phase:
  - Phase 1.1: Preliminary site planning ($161.5K), CVL ($565.25K), Access Road ($1.64M → $1.74M escalated), Project Onsites ($3.28M → $3.48M), Contingency ($0)
  - Phase 1.2: EDAW ($197K → $209K), Westwood ($1.38M → $1.46M), Sewer Plant ($2.14M → $2.40M)
- UOM dropdown options: $/FF, $/Unit, $$$
- Columns button, Quick Add Category, + Add Item buttons

**Empty / Placeholder:**
- Category column shows dash for all visible rows
- Var (Variance) column shows dash for all rows
- Contingency row: Amount and Escalated both show dash

**Visual Issues:**
- Stage and Category columns truncate text ("Planning & Engineeri...")

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Budget grid (TanStack Table)

---

## 14. Development > Sales — Peoria Meadows

**Populated Data:**
- Annual Inventory Gauge: "COMING IN BETA" label
- Areas and Phases section with Export Report button
- 4 Village cards: Village 1 (254ac, 2 phases, 10 parcels, 1102 units), Village 2 (383ac, 16 parcels, 1757 units), Village 3 (242ac, 5 parcels), Village 4 (214ac, 11 parcels, 548 units)
- 8 Phase cards: Phase 1.1 (104ac, 310 units) through Phase 4.2 (131ac, 287 units)

**Empty / Placeholder:**
- Land Use Pricing: "No parcels configured — Add parcels to the project first, then pricing will auto-populate"
- Village 3: 0 units (retail only)
- Phases 3.1, 3.2: 0 units

**Visual Issues:**
- None

**Report Readiness:** PARTIAL (no pricing data)

---

## 15. Feasibility > Cash Flow — Peoria Meadows

**Populated Data:**
- Left sidebar:
  - Inflation: Price Growth (Peoria Meadows dropdown), Cost Inflation 3.0%
  - DCF Parameters: Bulk Sale at Year 15, Discount Rate 20.00%, Selling Costs 4.00%
  - Results: Gross Profit -$144.24M, IRR dash, Peak Equity $149.55M, NPV(20%) -$125.80M
- Filter buttons: 4 Villages, 8 Phases (all selectable)
- KPI cards: Gross Revenue $0, Total Costs $144.24M, Gross Profit -$144.24M, IRR 0.0%, Equity Multiple 0.00x (Peak $149.55M)
- Time toggles: Monthly / Quarterly / Annual / Overall
- Cost views: Summary / By Stage / By Category / By Phase
- Cash flow table: Annual columns (2026-2033+) with:
  - REVENUE: Gross Revenue (all dashes), Net Revenue (all dashes)
  - PROJECT COSTS: Land Acquisition ($104M in 2026), Planning & Entitlements (spread across years), Development Costs (spread)
  - PROJECT TOTALS: Total Net Revenue, Total Project Costs, Net Cash Flow, Cumulative
- "Generated in 917ms · 96 periods · 6 sections"
- Export Report dropdown

**Empty / Placeholder:**
- All Revenue rows are zero/dash — no sales pricing configured
- IRR shows dash (can't compute without revenue)

**Visual Issues:**
- None — renders well

**Report Readiness:** PARTIAL (costs flowing, revenue missing — needs sales pricing)
**[SCREEN EXPORT CANDIDATE]** — Cash Flow table (HTML table with time/cost view toggles)

---

## 16. Capitalization > Debt — Peoria Meadows

**Populated Data:**
- KPI cards: Loan Amount $0, Outstanding Balance $0, Monthly Payment $0, Maturity Date dash
- "No loans defined. Click + Add Loan to begin."
- Cash Flow - Leveraged section: Time toggles (Monthly/Quarterly/Annual), Cost views (Summary/By Stage/By Category/By Phase)
  - NOI row showing ($2,400) repeating for Years 1-5
  - Debt Service: "None — Net Cash Flow equals NOI"
  - Net Cash Flow (After Debt) = Total Cash Flow = ($2,400) per year
- + Add Loan button, Export Report button

**Empty / Placeholder:**
- No loans configured
- NOI appears to be placeholder/minimal value

**Visual Issues:**
- None

**Report Readiness:** NOT READY (no loan data)

---

## 17. Capitalization > Equity — Peoria Meadows

**Populated Data:**
- Equity Waterfall configuration:
  - Equity Contributions: GP 10% ($14,954,899) / LP 90% ($134,594,089) / Total 100% ($149,548,988)
  - Waterfall Type toggles: IRR (selected), Equity Mult, IRR + EM
  - IRR Waterfall table: 3 tiers
    - Preferred + Capital: Rate 5%, Promote dash, LP 90%, GP 10%
    - Hurdle 1: Rate 10%, Promote 20%, LP 72%, GP 28%
    - Residual: Rate dash, Promote dash, LP 45%, GP 55%
- Save Waterfall button
- Waterfall Results panel: "Click Run Waterfall to calculate distributions"

**Empty / Placeholder:**
- Waterfall Results not yet calculated

**Visual Issues:**
- None

**Report Readiness:** PARTIAL (structure defined, results not calculated)

---

## 18. Valuation > Sales Comparison — Chadron Terrace

**Populated Data:**
- Subject column: Location Hawthorne, Date Feb-26, Units 113, Building SF 138,504, Year Built 2016
- 3 Comparable Sales:
  - Comp 1: Playa Vista, Apr-24, $122.10M, $571K/unit, $554/SF, 214 units, Cap 4.3%
  - Comp 2: Culver City, Feb-24, $67.70M, $501K/unit, $495/SF, 135 units, Cap 5.3%
  - Comp 3: Los Angeles, Jan-24, $49.50M, $387K/unit, $628/SF, 128 units
- Comparable Locations map with pins
- Adjustments section starting below fold (Transaction adjustments visible)

**Empty / Placeholder:**
- Subject: Sale Price N/A, Price/Unit N/A, Price/SF N/A, Cap Rate N/A
- Comp 3: Cap Rate not shown

**Visual Issues:**
- None

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Sales Comparison grid (HTML table)

---

## 19. Valuation > Cost Approach — Chadron Terrace

**Populated Data:**
- Land Value section: 2 comparable land sales
  - Comp 1: Hawthorne, Dec-24, $5.00M, $1.74M/acre, $40/FF, 3 acres
  - Comp 2: Lawndale, Dec-24, $5.00M, $2.18M/acre, $50/FF, 2 acres
- Subject column with field labels (Location, Date, Sale Price, Price/Acre, Price/Front Foot, Acres, Zoning, Entitlements, Utilities)
- Comparable Locations map panel

**Empty / Placeholder:**
- Subject: all fields show N/A or dash
- Zoning: shows "Building SF" placeholder text (bug)
- Utilities: shows "Year" placeholder text (bug)
- Entitlements: N/A
- Improvements and Depreciation sections not visible (below fold)

**Visual Issues:**
- Placeholder text "Building SF" and "Year" appear in Zoning and Utilities fields — these are input placeholders bleeding through

**Report Readiness:** PARTIAL (land comps exist, placeholders in subject, improvements section not verified)
**[SCREEN EXPORT CANDIDATE]** — Land Value comp grid (HTML table)

---

## 20. Valuation > Income Approach — Chadron Terrace

**Populated Data:**
- Assumptions sidebar:
  - Income: Gross Potential Rent $3,359,136, Vacancy Rate 3.00%, Stabilized Vacancy 3.00%, Credit Loss 0.50%, Other Income $0, Income Growth Rate 2.00%
  - Expenses: Operating Expenses $1,141,838, Management Fee 3.00%, Reserves/Unit/Yr $300, Expense Growth Rate 3.00%
  - Capitalization: Going-In Cap Rate 4.00%
- Year 1 Pro Forma P&L with 3 NOI bases:
  - Column toggles: F-12 Current, F-12 Market, Stabilized
  - Revenue: GPR ($2,693,258 / $3,359,136 / $3,359,136), Less Vacancy, Less Credit Loss
  - EGI: $2,598,994 / $3,241,566 / $3,241,566
  - Operating Expenses by category: Taxes & Insurance (3 items), Utilities, and more below fold
- View toggles: Direct Cap / Cash Flow / Both

**Empty / Placeholder:**
- Other Income: $0

**Visual Issues:**
- None — well structured

**Report Readiness:** READY
**[SCREEN EXPORT CANDIDATE]** — Pro Forma P&L (HTML table)

---

## 21. Valuation > Reconciliation — Chadron Terrace

**Populated Data:**
- 3 Approach cards:
  - Sales Comparison: $47.25M, 35% weight
  - Cost Approach: "Not concluded", 0% weight
  - Income Approach: $35.91M, 55% weight
- Reconciliation of Value table: Approach, Concluded Value, Weight, Weighted Value
  - Sales Comparison: $47.25M, 35%, $16.54M
  - Cost Approach: dash, 0%, dash
  - Income Approach: $35.91M, 55.00000000000001%, $19.75M
  - Total: 90% (orange — doesn't sum to 100%)

**Empty / Placeholder:**
- Cost Approach: "Not concluded"
- Narrative section not visible (may be below fold)

**Visual Issues:**
- **BUG:** Income Approach weight displays as "55.00000000000001%" — floating point precision error
- **BUG:** Total weight 90% (should be 100% or flagged)

**Report Readiness:** PARTIAL (functional but has display bugs, weights don't sum to 100%)

---

## 22. Documents — Chadron Terrace

**Populated Data:**
- Project Documents: 7 items across categories
  - Offering ~1, Property Data ~1, Market Data ~4, Diligence ~1
  - Agreements ~0, Leases ~0, Title & Survey ~0, Operations ~0, Correspondence ~0, Accounting ~0, Misc ~0
- Project Media: 62 items
- Sub-tabs: Documents, Intelligence
- Toolbar: View Trash, Rename, Move/Copy, Email copy, Edit profile, More
- Upload Documents button

**Empty / Placeholder:**
- 7 of 11 document categories have 0 items

**Visual Issues:**
- None

**Report Readiness:** N/A (DMS, not a report source)

---

## 23. Documents — Peoria Meadows

**Populated Data:**
- Project Documents: 3 items across categories
  - Property Data ~2, Market Data ~1
  - Agreements ~0, Diligence ~0, Entitlements ~0, Correspondence ~0
- Project Media: 12 items (Renders category)
- Sub-tabs: Documents, Intelligence

**Empty / Placeholder:**
- 4 of 6 categories have 0 items

**Visual Issues:**
- None

**Report Readiness:** N/A (DMS, not a report source)

---

## 24. Reports — Both Projects

**Populated Data:**
- Audit section:
  - Inflows: "Rent Schedule — Unit-level rent roll with current and market rents, vacancy, and concessions"
- Summaries section (collapsed, expandable)

**Empty / Placeholder:**
- Outflows: "Coming soon"
- No actual report generation or PDF export visible
- Same stub content for both MF and Land Dev projects

**Visual Issues:**
- None

**Report Readiness:** NOT READY (stub only)

---

## 25. Capital > Debt — Chadron Terrace

**CORRECTION:** MF projects DO have Capitalization (Debt/Equity) when the project perspective is set to **Underwriting**. Chadron was audited in Investment/Valuation mode, which hides this folder. The URL fallback to Project tab was a perspective issue, not a missing feature.

**Not audited** — would need to switch Chadron to Underwriting perspective to capture this tab.

**Report Readiness:** NOT AUDITED (available in Underwriting mode)

---

## Summary: Report Readiness Matrix

| # | Tab | Peoria Meadows (Land Dev) | Chadron (MF) |
|---|-----|---------------------------|--------------|
| 1 | Project Home | PARTIAL | READY |
| 2 | Property > Acquisition | REMOVED (Mar 14) | N/A |
| 3 | Property > Market | READY | PARTIAL |
| 4 | Property > Land Use | READY (restored Mar 14) | N/A |
| 5 | Property > Parcels | READY | N/A |
| 6 | Property > Location | N/A | READY |
| 7 | Property > Details | N/A | READY |
| 8 | Property > Rent Roll | N/A | READY |
| 9 | Operations | N/A | READY |
| 10 | Development > Budget | READY | N/A |
| 11 | Development > Sales | READY (pricing restored Mar 14) | N/A |
| 12 | Feasibility > Cash Flow | PARTIAL (costs flow, revenue $0 — needs absorption) | N/A |
| 12a | Feasibility > Returns | NOT READY (Coming Soon stub) | N/A |
| 12b | Feasibility > Sensitivity | NOT READY (Coming Soon stub) | N/A |
| 13 | Capitalization > Debt | REMOVED from Land Dev (Mar 14) | NOT AUDITED (Underwriting mode) |
| 14 | Capitalization > Equity | REMOVED from Land Dev (Mar 14) | NOT AUDITED (Underwriting mode) |
| 15 | Valuation > Sales Comp | N/A | READY |
| 16 | Valuation > Cost Approach | N/A | PARTIAL |
| 17 | Valuation > Income | N/A | READY |
| 18 | Valuation > Reconciliation | N/A | PARTIAL |
| 19 | Reports | NOT READY | NOT READY |
| 20 | Documents | N/A | N/A |

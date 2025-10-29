# Multifamily Prototype - Complete Tab Architecture

**Session ID:** JW22  
**Date:** October 23, 2025  
**Status:** Capitalization Tab Complete

---

## COMPLETE TAB STRUCTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                   MULTIFAMILY ANALYSIS INTERFACE                │
│                         Project 11: Test Property               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Mode Selector:  ○ Basic   ● Standard   ○ Advanced              │
└─────────────────────────────────────────────────────────────────┘

┌──────────┬────────────┬──────────────┬──────────────────────────┐
│ TAB 1    │ TAB 2      │ TAB 3        │ TAB 4 (NEW)             │
│ Rent Roll│ Operating  │ Market Rates │ Capitalization          │
│ & Unit Mix│ Expenses   │              │                         │
└──────────┴────────────┴──────────────┴──────────────────────────┘
```

---

## TAB 1: RENT ROLL & UNIT MIX (Existing)

**Purpose:** Unit-level rental data and floor plan summary

### UI Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ [Import CSV] [Export CSV] [Add Unit] [Field Chooser]           │
└─────────────────────────────────────────────────────────────────┘

Unit List (Spreadsheet-like table):
┌──────┬──────┬───────┬──────┬─────┬──────────┬─────────┬─────────┐
│ Unit │ Beds │ Baths │  SF  │ FP  │  Tenant  │  Rent   │Occupied │
├──────┼──────┼───────┼──────┼─────┼──────────┼─────────┼─────────┤
│ 101  │  1   │   1   │ 750  │ 1B  │ J. Smith │ $1,450  │   Yes   │
│ 102  │  2   │   2   │1100  │ 2B  │ J. Doe   │ $1,800  │   Yes   │
└──────┴──────┴───────┴──────┴─────┴──────────┴─────────┴─────────┘

Floor Plan Summary Cards:
┌───────────────┬───────────────┬───────────────┐
│   1BR/1BA     │   2BR/2BA     │    Studio     │
│   80 units    │   60 units    │   40 units    │
│  $1,438 avg   │  $1,792 avg   │  $1,195 avg   │
└───────────────┴───────────────┴───────────────┘
```

**Complexity Modes:**
- **Basic:** Unit #, beds, baths, rent, occupancy (5 fields)
- **Standard:** + Tenant name, lease dates, square footage (8 fields)
- **Advanced:** + Move-in date, concessions, parking, pets (15 fields)

**Key Feature:** Field Chooser allows users to show/hide columns dynamically

---

## TAB 2: OPERATING EXPENSES (Existing - JW10-JW21)

**Purpose:** Property operating cost structure with nested categories

### UI Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  Summary Metrics:                                               │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │   Total      │  Per Unit    │  Per SF      │  % of EGI    │ │
│  │   OpEx       │   Annual     │   Annual     │              │ │
│  │  $520,000    │   $6,500     │   $4.25      │    35%       │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Nested Tree View:
▼ Property Management ($156,000)
  • On-Site Management: $78,000
  • Leasing Costs: $45,000
  • Administrative: $33,000

▼ Utilities ($104,000)
  • Water & Sewer: $52,000
  • Electricity: $39,000
  • Gas: $13,000

▶ Repairs & Maintenance ($78,000) [collapsed]
▶ Insurance ($39,000) [collapsed]
▶ Real Estate Taxes ($104,000) [collapsed]
```

**Complexity Modes:**
- **Basic:** 5 top-level categories, single annual amount (5 fields)
- **Standard:** 13 categories with nested subcategories (28 fields)
- **Advanced:** Full GL detail, escalation rates, vendor tracking (67 fields)

**Key Feature:** Nested tree view with expand/collapse functionality

---

## TAB 3: MARKET RATES (In Progress - JW20)

**Purpose:** Market assumptions for rent growth, absorption, and inflation

### UI Structure (Planned)
```
┌─────────────────────────────────────────────────────────────────┐
│  Rent Growth Assumptions:                                       │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │   Year 1-3   │   Year 4-7   │   Year 8+    │                │
│  │     3.0%     │     2.5%     │     2.0%     │                │
│  └──────────────┴──────────────┴──────────────┘                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Market Rent Benchmarks (Landscaper AI):                        │
│  • Your 1BR rent: $1,438 vs Market: $1,425 (↑ 0.9%)            │
│  • Your 2BR rent: $1,792 vs Market: $1,875 (↓ 4.4%)            │
│  [⚠️ Warning: 2BR rents below market - opportunity for increase]│
└─────────────────────────────────────────────────────────────────┘

Absorption Schedule:
┌──────────┬────────────┬────────────┬────────────┐
│  Period  │  Turnover  │ Lease-Up   │ Occupancy  │
├──────────┼────────────┼────────────┼────────────┤
│  Month 1 │    2 units │   3 units  │    92%     │
│  Month 2 │    1 unit  │   2 units  │    93%     │
└──────────┴────────────┴────────────┴────────────┘
```

**Complexity Modes:**
- **Basic:** Single rent growth rate, target occupancy (2 fields)
- **Standard:** Multi-year growth rates, absorption timing (8 fields)
- **Advanced:** Market benchmarks, concession modeling, seasonality (25 fields)

**Status:** API endpoints being built, UI mockups complete

---

## TAB 4: CAPITALIZATION (NEW - JW22)

**Purpose:** Debt structure, equity tranches, and distribution waterfalls

### UI Structure
```
┌─────────────────────────────────────────────────────────────────┐
│  Capital Structure Summary:                                     │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │    Total     │    Debt      │   Equity     │  Waterfall   │ │
│  │     Cap      │   Summary    │   Summary    │    Tiers     │ │
│  │  $15.0M      │   $10.5M     │   $4.5M      │   4 Active   │ │
│  │              │   (70% LTV)  │   (30%)      │              │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Sub-Tabs:
┌──────────────┬─────────────────┬─────────────────┬──────────────┐
│ Debt Sources │ Equity Structure│ Waterfall Tiers │Draw Schedule │
└──────────────┴─────────────────┴─────────────────┴──────────────┘

[Debt Sources View]
┌─────────────────────────────────────────────────────────────────┐
│ Construction Loan                              [Edit] [Delete]  │
│                                                                  │
│ Loan Amount:    $10,500,000      Interest Rate:   5.75%         │
│ LTV Ratio:           70%         DSCR:            1.25x         │
│ Term:           10 years         Amortization:    30 years      │
│ Guarantee:      Recourse                                        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Loan Covenants (Advanced Mode):                            │ │
│ │ • Minimum DSCR: 1.20x                                       │ │
│ │ • Maximum LTV: 75%                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

[Equity Structure View]
┌───────────────────────────────┬───────────────────────────────┐
│ Limited Partner (LP)          │ General Partner (GP)          │
│ • Ownership: 90%              │ • Ownership: 10%              │
│ • Capital: $4,500,000         │ • Capital: $0                 │
│ • Pref Return: 8%             │ • Pref Return: 8%             │
│                               │ • Promote: 20%                │
│                               │ • Catch-Up: 50%               │
└───────────────────────────────┴───────────────────────────────┘

[Waterfall Tiers View]
┌──┬────────────────────────────┬──────────┬──────────┬─────────┐
│#│ Tier Name                   │ Threshold│ LP Split │ GP Split│
├──┼────────────────────────────┼──────────┼──────────┼─────────┤
│1│ Return of Capital           │    —     │   90%    │   10%   │
│2│ Preferred Return (8%)       │  8% IRR  │   90%    │   10%   │
│3│ GP Catch-Up                 │ 10% IRR  │   50%    │   50%   │
│4│ Promote (80/20 Split)       │ 15% IRR  │   80%    │   20%   │
└──┴────────────────────────────┴──────────┴──────────┴─────────┘

[Draw Schedule View] (Standard/Advanced modes only)
┌──────────┬──────────────┬──────────────┬──────────────┬──────────┐
│  Period  │ Draw Amount  │   Purpose    │  Draw Date   │Cumulative│
├──────────┼──────────────┼──────────────┼──────────────┼──────────┤
│ Month 1  │  $2,000,000  │ Acquisition  │  2025-01-15  │ $2.0M    │
│ Month 3  │  $1,500,000  │ Renovations  │  2025-03-15  │ $3.5M    │
│ Month 6  │  $1,000,000  │ Lease-up     │  2025-06-15  │ $4.5M    │
└──────────┴──────────────┴──────────────┴──────────────┴──────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Summary:                                                         │
│ Total Commitment: $10.5M | Drawn: $4.5M | Remaining: $6.0M      │
└─────────────────────────────────────────────────────────────────┘
```

**Complexity Modes:**
- **Basic:** Loan amount, rate, LTV, DSCR | LP/GP split, pref return (7 fields)
- **Standard:** + Term, amortization, guarantee | Promote %, waterfall tiers (15 fields)
- **Advanced:** + Covenants, prepayment | IRR targets, catch-up, draw schedule (35 fields)

**Key Features:**
- Four sub-tabs for different aspects of capital structure
- Summary metrics calculated automatically
- Waterfall tier logic with IRR thresholds
- Draw schedule integrated with construction loans
- Mode switching shows/hides complexity appropriately

---

## UNIVERSAL MODE SWITCHING SYSTEM

**Implemented Across All Tabs:**

```typescript
type ComplexityMode = 'basic' | 'standard' | 'advanced';

// Global state (in layout or context)
const [complexityMode, setComplexityMode] = useState<ComplexityMode>('standard');

// Each tab receives mode as prop
<RentRollTab mode={complexityMode} />
<OperatingExpensesTab mode={complexityMode} />
<MarketRatesTab mode={complexityMode} />
<CapitalizationTab mode={complexityMode} /> // NEW
```

**Mode Impact:**
- **Basic Mode (23 fields total):** Napkin-level analysis, <5 min to complete
- **Standard Mode (85 fields total):** Institutional underwriting, 30-60 min
- **Advanced Mode (202 fields total):** Kitchen sink detail, 2-3 hours

**UI Behavior:**
- Fields appear/disappear smoothly with mode changes
- No data loss when switching modes
- Advanced fields collapsed by default in Standard mode
- Mode indicator badge always visible

---

## DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT TABS (User Entry)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────┬──────────────┬──────────────┬──────────────────┐
│  Rent Roll   │   OpEx       │ Market Rates │ Capitalization   │
│  (Revenue)   │  (Expenses)  │ (Growth)     │ (Financing)      │
└──────────────┴──────────────┴──────────────┴──────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CALCULATION ENGINE                            │
│  • Revenue projections (rent growth, turnover, concessions)     │
│  • Expense escalations (by GL category)                         │
│  • Debt service (interest on drawn amounts, amortization)       │
│  • Waterfall distributions (LP/GP splits by tier)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   OUTPUT TABS (Computed Results)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────┬──────────────┬──────────────────────────────────┐
│  Cash Flow   │  Returns     │  Investment Summary              │
│  (Locked)    │  (Locked)    │  (Locked until inputs complete)  │
└──────────────┴──────────────┴──────────────────────────────────┘
```

**Critical Concept:** Inputs unlock outputs. All 4 input tabs must have data before cash flow can be calculated.

---

## COMPARISON TO ARGUS ENTERPRISE

### ARGUS Approach (Fragmented)
```
Multifamily Tab:
• Unit mix (floor plans)
• Market rents
• Lease rollover assumptions
• [BURIED] Concessions mixed with revenue

Rent Roll Tab:
• Individual unit data
• [SEPARATE] Tenant-by-tenant details
• No floor plan summary

Operating Tab:
• Flat list of 40+ expense categories
• No nesting or grouping
• Manual GL entry

Debt Tab:
• Single loan only
• No multi-tranche structure
• Draw schedule separate module

Equity Tab:
• Basic LP/GP split
• No waterfall tiers
• Manual promote calculations
```

### Landscape Approach (Integrated)
```
Tab 1 - Rent Roll & Unit Mix:
✓ Units AND floor plans in ONE place
✓ Spreadsheet-like for familiarity
✓ Auto-generates floor plans from rent roll
✓ Field chooser for workflow flexibility

Tab 2 - Operating Expenses:
✓ Nested tree view (like a folder structure)
✓ Expand/collapse categories
✓ Per unit / per SF metrics calculated
✓ Landscaper AI benchmarks for validation

Tab 3 - Market Rates:
✓ Rent growth by year
✓ AI-powered market comps
✓ Absorption/turnover modeling
✓ Concessions integrated with revenue

Tab 4 - Capitalization:
✓ Multiple debt sources
✓ Multi-tranche equity structure
✓ Waterfall tiers with IRR thresholds
✓ Draw schedule linked to cash flow
```

**Key Difference:** Landscape organizes by USER MENTAL MODEL, not by database schema.

---

## TECHNICAL SPECIFICATIONS

### Component Architecture
```
src/
├── app/
│   └── properties/
│       └── [id]/
│           └── analysis/
│               └── page.tsx (Tab container)
├── components/
│   └── tabs/
│       ├── RentRollTab.tsx (Existing)
│       ├── OperatingExpensesTab.tsx (Existing)
│       ├── MarketRatesTab.tsx (In progress)
│       └── CapitalizationTab.tsx (NEW - JW22)
└── hooks/
    ├── useComplexityMode.ts (Global mode state)
    └── useCapitalization.ts (Data fetching for Tab 4)
```

### Database Tables (Capitalization)
```
tbl_debt_facility (Existing)
├── facility_id (PK)
├── project_id (FK)
├── facility_name
├── loan_amount
├── interest_rate_pct
├── amortization_years
├── loan_term_years
├── ltv_pct
├── dscr
└── [20+ additional fields]

tbl_equity (Existing, aka tbl_equity_partner)
├── partner_id (PK)
├── project_id (FK)
├── tranche_name
├── partner_type (LP/GP)
├── ownership_pct
├── preferred_return_pct
├── capital_contributed
├── promote_pct
└── [10+ additional fields]

tbl_waterfall_tier (NEW - needs creation)
├── tier_id (PK)
├── project_id (FK)
├── tier_number
├── tier_name
├── irr_threshold_pct
├── lp_split_pct
├── gp_split_pct
└── is_active

tbl_debt_draw_schedule (NEW - needs creation)
├── draw_id (PK)
├── debt_facility_id (FK)
├── project_id (FK)
├── period_id (FK)
├── draw_amount
├── draw_date
└── draw_purpose
```

### API Endpoints (Capitalization)
```
GET    /api/capitalization/debt?projectId=11
POST   /api/capitalization/debt
PATCH  /api/capitalization/debt/:facility_id
DELETE /api/capitalization/debt/:facility_id

GET    /api/capitalization/equity?projectId=11
POST   /api/capitalization/equity
PATCH  /api/capitalization/equity/:tranche_id
DELETE /api/capitalization/equity/:tranche_id

GET    /api/capitalization/waterfall?projectId=11
POST   /api/capitalization/waterfall
PATCH  /api/capitalization/waterfall/:tier_id
DELETE /api/capitalization/waterfall/:tier_id

GET    /api/capitalization/draws?projectId=11
POST   /api/capitalization/draws
PATCH  /api/capitalization/draws/:draw_id
DELETE /api/capitalization/draws/:draw_id

GET    /api/capitalization/summary?projectId=11
```

---

## DEPLOYMENT STATUS

### ✅ Complete (Ready for Backend)
1. **React Component:** `CapitalizationTab.tsx` with 4 sub-tabs
2. **API Specification:** 13 endpoints with request/response schemas
3. **Database Schema:** SQL migration script for 2 new tables
4. **Integration Guide:** Complete documentation for adding to prototype
5. **Visual Structure:** This document showing tab architecture

### ⚠️ Needs Implementation
1. **Migration Execution:** Run SQL to create `tbl_waterfall_tier` and `tbl_debt_draw_schedule`
2. **Backend API:** Implement 13 endpoints in Node.js/Express
3. **Data Fetching:** Connect component to APIs via SWR
4. **CRUD Dialogs:** Build modal forms for create/edit operations
5. **Validation:** Add client and server-side validation

### 📋 Future Enhancements (Post-MVP)
1. **Calculation Engine:** Interest calculations from draw schedule
2. **Waterfall Logic:** Automated LP/GP distribution calculations
3. **Landscaper AI:** Document extraction from loan commitments
4. **Benchmark Alerts:** Flag debt terms outside market norms
5. **Sensitivity Analysis:** Show impact of rate/LTV changes
6. **Refinancing Module:** Model permanent loan takeout scenarios

---

## SESSION SUMMARY

**What We Built (JW22):**
- Complete Capitalization tab following Operating Expenses pattern
- Four sub-tabs: Debt Sources, Equity Structure, Waterfall Tiers, Draw Schedule
- Summary cards with calculated metrics (leverage ratio, total cap, etc.)
- Mode switching integration (Basic/Standard/Advanced)
- Dark theme UI consistency
- Comprehensive API specification
- Database migration script
- Integration documentation

**Design Principles Applied:**
1. **Three-Panel Macro-to-Micro:** Summary → Navigation → Details
2. **Progressive Complexity:** Fields appear/disappear based on mode
3. **Familiar Patterns:** Tables for waterfall, cards for facilities
4. **Calculated Metrics:** Real-time summary calculations
5. **Visual Hierarchy:** Color-coded entities (debt=red, equity=green, waterfall=purple)

**Next Steps:**
1. Run migration script
2. Implement backend API endpoints
3. Connect to live data
4. Build edit/create dialogs
5. Add form validation
6. Test with Project 11

**Session ID:** JW22  
**Status:** COMPLETE - Ready for backend handoff

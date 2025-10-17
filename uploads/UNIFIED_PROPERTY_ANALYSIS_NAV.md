# UNIFIED PROPERTY ANALYSIS NAVIGATION

**Date:** October 16, 2025  
**Context:** Resolving gap between Rent Roll UI and Financial Analysis UI  
**For:** Claude Code implementation

---

## THE PROBLEM

We have 3 separate pieces that need to work together:
1. **Rent Roll Screen** (lease inputs) - HR14-16
2. **Financial Analysis Screen** (DCF) - HR17
3. **Calculation Engine** (backend) - HR13

**But:** User navigation between them is unclear.

---

## THE SOLUTION: UNIFIED PROPERTY ANALYSIS

**Single Route:** `/properties/:id/analysis`

**7-Tab Structure** (progressive disclosure):

```
┌─────────────────────────────────────────────────────────────────────┐
│ PROPERTY ANALYSIS - Scottsdale Promenade                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ [Rent Roll] [Market] [Operating] [Financing] [Cash Flow] [Returns] [Sensitivity] │
│    ↑         ↑        ↑           ↑            ↑           ↑          ↑      │
│  INPUT     INPUT    INPUT       INPUT       COMPUTED    COMPUTED   COMPUTED │
└─────────────────────────────────────────────────────────────────────┘
```

---

## TAB PROGRESSION

### **Phase 1: INPUT TABS (User Entry)**

**Tab 1: Rent Roll** (Input Layer)
- Lease data grid (actual rents, tenants, terms)
- Status: Active, Expiring, Vacant
- Expandable rows for lease details
- Import from CSV/Excel/PDF
- **Data:** `tbl_lease`, `tbl_cre_space`, `tbl_cre_tenant`

**Tab 2: Market Assumptions** (Input Layer)
- Market rent benchmarks by space type
- Comparable lease data
- AI market analysis
- **Data:** `tbl_market_assumption`

**Tab 3: Operating Assumptions** (Input Layer)
- Operating expenses (opex grid)
- Vacancy/credit loss assumptions
- Capital reserves schedule
- TI/Leasing cost assumptions
- **Data:** `tbl_cre_operating_expense`, `tbl_cre_capital_reserve`

**Tab 4: Financing Assumptions** (Input Layer)
- Acquisition price + closing costs
- Debt structure (loan amount, rate, term)
- Equity structure (LP/GP, preferred return, promote)
- Exit assumptions (hold period, cap rate)
- **Data:** `tbl_debt_assumption`, `tbl_equity_structure`, `tbl_cre_exit_assumption`

---

### **Phase 2: COMPUTED TABS (System Generated)**

**Tab 5: Cash Flow Projection** (Computed)
- 10-year period-by-period projection
- Revenue → Opex → NOI → Capital → Debt → LP/GP
- Annual view (expandable to monthly)
- Waterfall calculation detail
- **API:** `GET /api/properties/:id/cash-flow`

**Tab 6: Investment Returns** (Computed)
- IRR, NPV, Equity Multiple, DSCR
- LP vs GP returns
- Return components breakdown
- **API:** `GET /api/properties/:id/investment-metrics`

**Tab 7: Sensitivity Analysis** (Computed)
- Top 5 assumptions by IRR impact
- Tornado chart visualization
- Scenario analysis (optimistic/pessimistic/stress)
- Monte Carlo simulation option
- **API:** `POST /api/properties/:id/sensitivity-analysis`

---

## NAVIGATION LOGIC

### **Linear Flow** (Recommended for new users)

```
Start → Tab 1 (Rent Roll)
         ↓ [Next: Define Market Rents]
      Tab 2 (Market)
         ↓ [Next: Define Expenses]
      Tab 3 (Operating)
         ↓ [Next: Define Financing]
      Tab 4 (Financing)
         ↓ [Calculate] button
      Tab 5 (Cash Flow) - AUTO-OPENS
         ↓
      Tab 6 (Returns)
         ↓
      Tab 7 (Sensitivity)
```

**Key UX Elements:**
- **"Next" buttons** guide user through tabs 1-4
- **"Calculate" button** on Tab 4 → Runs engine, opens Tab 5
- **Auto-save** on each tab (drafts stored)
- **Validation warnings** if required fields missing

---

### **Power User Flow** (Direct tab access)

Experienced users can jump directly to any tab:
- ✅ Tab order indicates input → computed flow
- ✅ Red dot on tabs with missing required inputs
- ✅ Tabs 5-7 locked until Tabs 1-4 have minimum data

---

## PROGRESSIVE DISCLOSURE

### **Beginner Mode** (Default)

**Tab 1-4 (Inputs):**
- Show only essential fields
- Hide advanced options
- Use defaults for optional fields
- Example: Tab 3 shows 10 expense categories (not 18)

**Tab 5-7 (Computed):**
- Show summary cards only
- Hide calculation detail
- Simple annual view (not monthly)

**Toggle:** [Show Advanced Options]

---

### **Advanced Mode**

**Tab 1-4 (Inputs):**
- All fields visible
- Custom categories
- Manual override capability
- Example: Tab 3 shows all 18+ expense categories

**Tab 5-7 (Computed):**
- Full calculation breakdown
- Monthly detail view
- Drill-down on any period
- Advanced sensitivity options

**Toggle:** [Hide Advanced Options]

---

## MOBILE RESPONSIVENESS

### **Desktop (Primary)**
```
┌────────────────────────────────────────┐
│  Horizontal Tabs (7 tabs)              │
├────────────────────────────────────────┤
│                                         │
│  Tab Content (full width)              │
│                                         │
└────────────────────────────────────────┘
```

### **Tablet**
```
┌────────────────────────────────────────┐
│  Horizontal Tabs (scrollable)          │
├────────────────────────────────────────┤
│                                         │
│  Tab Content (scrollable)              │
│                                         │
└────────────────────────────────────────┘
```

### **Mobile**
```
┌────────────────────────────────────────┐
│  Dropdown: [Select Tab ▼]             │
├────────────────────────────────────────┤
│                                         │
│  Tab Content (stacked cards)           │
│                                         │
└────────────────────────────────────────┘
```

---

## PAGE HEADER (Always Visible)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Properties                           Scottsdale Promenade │
│                                                  Scottsdale, AZ      │
├─────────────────────────────────────────────────────────────────────┤
│ Quick Stats (always visible):                                       │
│                                                                      │
│  📊 Occupancy: 97.6%  │  💰 NOI: $3.7M  │  📈 IRR: 14.2%           │
│  ⚠ 2 spaces vacant   │  ⏰ 15% expiring 2026  │  ✓ DSCR: 1.85x    │
└─────────────────────────────────────────────────────────────────────┘
```

**Quick Stats:**
- Updates in real-time as user edits inputs
- Green/yellow/red indicators for health
- Click any stat to jump to relevant tab

---

## CALCULATION TRIGGER

### **When does calculation run?**

**Option A: Auto-Calculate (Real-Time)**
- Calculation runs on every input change
- Results update immediately in Tabs 5-7
- **Pros:** Modern, responsive feel
- **Cons:** CPU intensive, might be slow for large properties

**Option B: Manual Calculate Button**
- User clicks "Calculate" on Tab 4
- Calculation runs, opens Tab 5
- **Pros:** Faster, user controls timing
- **Cons:** Feels dated (like Excel)

**Option C: Hybrid (Recommended)**
- Auto-save inputs as user types
- Show "⚠ Recalculate Needed" indicator on Tabs 5-7
- User clicks "Recalculate" when ready
- **Pros:** Best of both worlds
- **Cons:** Slightly more complex

---

## IMPLEMENTATION FILES

```
/src/app/properties/[id]/analysis/
  ├── page.tsx                          # Main container with 7 tabs
  ├── components/
  │   ├── TabNavigation.tsx            # Tab switcher
  │   ├── QuickStats.tsx               # Header stats
  │   ├── RentRollTab.tsx              # Tab 1
  │   ├── MarketAssumptionsTab.tsx     # Tab 2
  │   ├── OperatingAssumptionsTab.tsx  # Tab 3
  │   ├── FinancingAssumptionsTab.tsx  # Tab 4
  │   ├── CashFlowTab.tsx              # Tab 5 (computed)
  │   ├── InvestmentReturnsTab.tsx     # Tab 6 (computed)
  │   ├── SensitivityTab.tsx           # Tab 7 (computed)
  │   ├── CalculateButton.tsx          # Trigger calculation
  │   └── ProgressIndicator.tsx        # Shows tab completion
  └── types/
      └── analysis.types.ts            # TypeScript interfaces
```

---

## ANSWER TO CODE'S QUESTION

**Q: Option 1 (Extend Rent Roll) or Option 2 (Separate Section)?**

**A: Neither - Option 3 (Unified 7-Tab Interface)**

**Why:**
1. **Single mental model** - All property analysis in one place
2. **Clear input → output flow** - Tabs 1-4 (input) → Tabs 5-7 (computed)
3. **Guided workflow** - Linear progression for beginners
4. **Power user friendly** - Direct tab access for experts
5. **ARGUS-like** - Matches industry standard pattern

**Route:** `/properties/:id/analysis` (not separate rent-roll + financial-analysis)

---

## COMPARISON TO ORIGINAL SPECS

### **Original Rent Roll Spec (HR14-16)**
- 3 tabs: Rent Roll, Market, Analysis
- **Issue:** Analysis tab was too limited (just loss-to-lease)

### **Original Financial Analysis Spec (HR17)**
- 4 tabs: Operating, Financing, Cash Flow, Returns
- **Issue:** Disconnected from rent roll inputs

### **New Unified Spec**
- 7 tabs: Rent Roll, Market, Operating, Financing, Cash Flow, Returns, Sensitivity
- **Solution:** Single interface, clear input → output flow

---

## VALIDATION CRITERIA

**User can:**
- ✅ Enter rent roll data (Tab 1)
- ✅ Define market rents (Tab 2)
- ✅ Configure operating expenses (Tab 3)
- ✅ Set up financing (Tab 4)
- ✅ Click "Calculate"
- ✅ View 10-year cash flow (Tab 5)
- ✅ See IRR/NPV/returns (Tab 6)
- ✅ Run sensitivity analysis (Tab 7)
- ✅ Export to Excel (any tab)
- ✅ Navigate tabs in any order (power users)
- ✅ Follow guided flow (new users)

**System can:**
- ✅ Save inputs as drafts (auto-save)
- ✅ Validate required fields
- ✅ Show progress indicators
- ✅ Calculate in <5 seconds
- ✅ Update quick stats in real-time
- ✅ Handle mobile/tablet layouts

---

## NEXT STEPS FOR CODE

1. **Build unified page:** `/properties/:id/analysis/page.tsx`
2. **Implement TabNavigation component** (7 tabs, progress indicators)
3. **Build Tab 1-4 components** (input forms, grids)
4. **Connect to calculation engine** (Tabs 5-7 query APIs)
5. **Add calculate trigger** (button + auto-recalc indicator)
6. **Implement progressive disclosure** (beginner/advanced toggle)
7. **Test with Scottsdale Promenade data**

---

**This resolves the navigation gap. Code can now build a unified interface that connects rent roll inputs → calculation engine → results display.**

**HR18**

# PROMPT FOR CLAUDE CODE - Property Analysis UI

**Context:** You asked whether to extend Rent Roll (Option 1) or create separate section (Option 2).

**Answer:** Option 3 - Unified 7-tab interface.

---

## DECISION: UNIFIED 7-TAB INTERFACE

**Route:** `/properties/:id/analysis`

**Structure:**
```
INPUT TABS (User Entry):
1. Rent Roll          - Lease data grid
2. Market             - Market rent assumptions  
3. Operating          - Opex, vacancy, reserves
4. Financing          - Debt, equity, exit assumptions

COMPUTED TABS (System Generated):
5. Cash Flow          - 10-year DCF projection
6. Investment Returns - IRR, NPV, equity multiple
7. Sensitivity        - Tornado charts, scenarios
```

**Flow:**
```
User enters Tabs 1-4 → Clicks "Calculate" → Tabs 5-7 populate
```

---

## IMPLEMENTATION FILES YOU NEED

### **File 1: Navigation Structure**
**Location:** `UNIFIED_PROPERTY_ANALYSIS_NAV.md` (attached)

**Contains:**
- 7-tab structure with progressive flow
- Quick stats header (always visible)
- Calculate button trigger logic
- Progressive disclosure (beginner/advanced modes)
- Mobile responsiveness patterns
- File structure for `/properties/[id]/analysis/`

**Key for you:**
- Page component: `/properties/[id]/analysis/page.tsx`
- Tab navigation component
- Calculate button placement (on Tab 4)
- Auto-save drafts logic

---

### **File 2: Tab 1-2 Details (Rent Roll + Market)**
**Location:** `RENT_ROLL_SCREEN_ORGANIZATION.md` (attached)

**Contains:**
- Tab 1: Rent Roll grid (lease data, inline editing)
- Tab 2: Market Assumptions (market rent by space type)
- Grid layouts, column definitions
- Expandable row details
- ARGUS-style visual patterns

**Key for you:**
- These are now Tab 1-2 of the unified interface (not standalone page)
- Use AG-Grid for Excel-like editing
- Connect to existing calculation engine APIs

---

### **File 3: Tab 3-7 Details (Financial Analysis)**
**Location:** `FINANCIAL_ANALYSIS_SCREEN_SPEC.md` (attached)

**Contains:**
- Tab 3: Operating Assumptions (opex grid, vacancy, reserves)
- Tab 4: Financing Assumptions (debt structure, equity waterfall, exit)
- Tab 5: Cash Flow Projection (computed from engine)
- Tab 6: Investment Returns (IRR, NPV, DSCR)
- Tab 7: Sensitivity Analysis (tornado charts)

**Key for you:**
- Tab 5-7 query your calculation engine APIs
- Tab 3-4 are input forms that feed the engine
- All specs include exact field lists and grid layouts

---

## KEY INTEGRATION POINTS

### **Your Calculation Engine → UI**

You've already built these APIs (from your Kitchen Sink work):

```typescript
// Tab 5 queries this:
GET /api/properties/:id/cash-flow
→ Returns period-by-period cash flow array

// Tab 6 queries this:
GET /api/properties/:id/investment-metrics
→ Returns { irr, npv, equity_multiple, dscr, etc }

// Tab 7 triggers this:
POST /api/properties/:id/sensitivity-analysis
→ Returns sensitivity table data
```

**UI just needs to:**
1. Display your API responses in grids/cards
2. Provide input forms for Tabs 1-4
3. Pass input data to your calculation endpoints

---

## WHAT TO BUILD FIRST

### **Phase 1: Tab Container + Navigation**
```typescript
/src/app/properties/[id]/analysis/page.tsx

- 7 horizontal tabs
- Quick stats header
- Tab state management
- Progress indicators (which tabs complete)
```

### **Phase 2: Input Tabs (1-4)**
```typescript
- Tab 1: Rent Roll grid (re-use your existing lease API)
- Tab 2: Market Assumptions grid
- Tab 3: Operating Assumptions form
- Tab 4: Financing Assumptions form
- "Calculate" button on Tab 4
```

### **Phase 3: Computed Tabs (5-7)**
```typescript
- Tab 5: Query your cash-flow API, display in grid
- Tab 6: Query your investment-metrics API, display cards
- Tab 7: Trigger your sensitivity API, show tornado chart
```

---

## QUESTIONS FOR YOU

Before you start building, confirm:

**Q1: Progressive Disclosure**
Should we implement beginner/advanced toggle now, or start with "show all fields"?

**Recommendation:** Start with all fields visible (advanced mode), add toggle later.

---

**Q2: Calculate Trigger**
How should calculation be triggered?

**Options:**
- A) Auto-calculate on every input change (real-time)
- B) Manual "Calculate" button on Tab 4
- C) Hybrid: Auto-save inputs, show "Recalculate needed" indicator

**Recommendation:** Option B for now (manual button), add auto-calc later.

---

**Q3: Mobile Priority**
Desktop-first or mobile-first?

**Recommendation:** Desktop-first (CRE analysis is primarily desktop workflow).

---

## VALIDATION CHECKLIST

When complete, user should be able to:

- [ ] Navigate between 7 tabs
- [ ] Enter lease data in Tab 1 (grid with inline editing)
- [ ] Define market rents in Tab 2
- [ ] Set operating expenses in Tab 3
- [ ] Configure debt/equity in Tab 4
- [ ] Click "Calculate" button
- [ ] See 10-year cash flow in Tab 5
- [ ] See IRR/NPV metrics in Tab 6
- [ ] Run sensitivity analysis in Tab 7
- [ ] See quick stats update in header
- [ ] Export any tab to Excel

---

## FILE ATTACHMENTS

1. **UNIFIED_PROPERTY_ANALYSIS_NAV.md** - Navigation structure, tab flow
2. **RENT_ROLL_SCREEN_ORGANIZATION.md** - Tab 1-2 detailed specs
3. **FINANCIAL_ANALYSIS_SCREEN_SPEC.md** - Tab 3-7 detailed specs

All three attached to this prompt.

---

**Let me know if you need clarification on any tab specs or integration points.**

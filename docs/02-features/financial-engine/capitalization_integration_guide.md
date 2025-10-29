# Capitalization Tab Integration Guide

**Session ID:** JW22  
**Date:** October 23, 2025  
**Context:** Multifamily Prototype - 4th Tab Implementation

---

## QUICK INTEGRATION

### Step 1: Add to Multifamily Analysis Page

**File:** `src/app/properties/[id]/analysis/page.tsx` (or equivalent)

```typescript
import CapitalizationTab from '@/components/tabs/CapitalizationTab';

// Add to tabs array
const tabs = [
  { label: 'Rent Roll & Unit Mix', value: 0 },
  { label: 'Operating Expenses', value: 1 },
  { label: 'Market Rates', value: 2 },
  { label: 'Capitalization', value: 3 }, // ← NEW TAB
];

// In render method
{selectedTab === 3 && (
  <CapitalizationTab 
    projectId={projectId} 
    mode={complexityMode}
  />
)}
```

---

## WHAT'S ALREADY BUILT

### ✅ Component Features
- **Four Sub-Tabs**: Debt Sources, Equity Structure, Waterfall Tiers, Draw Schedule
- **Summary Cards**: Total Cap, Debt, Equity, Waterfall Status
- **Mode Switching**: Basic/Standard/Advanced complexity morphing
- **Dark Theme**: Consistent with Operating Expenses tab (`grey.950`, `grey.900`, `grey.800`)
- **Inline Editing**: Edit/Delete buttons on all entities (functionality needs backend)
- **Calculated Metrics**: Leverage ratio, cumulative draws, weighted averages
- **Validation Alerts**: Info/warning messages for user guidance

### ✅ Database Tables (Existing)
- `tbl_debt_facility` - Loan terms, rates, covenants
- `tbl_equity` (aka `tbl_equity_partner`) - LP/GP tranches with ownership %

### ⚠️ Database Tables (Need Creation)
- `tbl_waterfall_tier` - Distribution tiers with IRR thresholds
- `tbl_debt_draw_schedule` - Period-by-period construction draws

Migration script provided in `capitalization_api_spec.md`

---

## DESIGN PATTERN CONSISTENCY

### Three-Panel Macro-to-Micro Flow

**Upper Panel (Summary Cards):**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Total     │    Debt     │   Equity    │  Waterfall  │
│    Cap      │  Summary    │  Summary    │   Status    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Middle Panel (Tabbed Navigation):**
```
[Debt Sources] [Equity Structure] [Waterfall Tiers] [Draw Schedule]
```

**Lower Panel (Detailed Tables/Cards):**
- Expandable cards for debt facilities
- Expandable cards for equity tranches
- Data table for waterfall tiers
- Data table for draw schedule

### Complexity Mode Morphing

**Basic Mode (Napkin-Level):**
- Debt: Loan amount, rate, LTV, DSCR
- Equity: Ownership %, preferred return, capital contributed
- Waterfall: 2 tiers (Return of Capital, Preferred Return)
- Draw Schedule: Hidden

**Standard Mode (Mid-Level):**
- Debt: + Amortization, term, guarantee type
- Equity: + GP promote, catch-up %
- Waterfall: 3-4 tiers (add Promote tier)
- Draw Schedule: Visible with basic fields

**Advanced Mode (Kitchen Sink):**
- Debt: + Loan covenants, prepayment penalties
- Equity: + IRR targets, equity multiple targets
- Waterfall: All tiers + inactive tiers shown
- Draw Schedule: Full CRUD with cumulative tracking

---

## API INTEGRATION PATTERN

### Data Fetching (use SWR or React Query)

```typescript
import useSWR from 'swr';

const CapitalizationTab: React.FC<Props> = ({ projectId, mode }) => {
  // Fetch debt facilities
  const { data: debtData, mutate: mutateDebt } = useSWR(
    `/api/capitalization/debt?projectId=${projectId}`,
    fetcher
  );

  // Fetch equity tranches
  const { data: equityData, mutate: mutateEquity } = useSWR(
    `/api/capitalization/equity?projectId=${projectId}`,
    fetcher
  );

  // Fetch waterfall tiers
  const { data: waterfallData, mutate: mutateWaterfall } = useSWR(
    `/api/capitalization/waterfall?projectId=${projectId}`,
    fetcher
  );

  // Fetch draw schedule (only if mode !== 'basic')
  const { data: drawData, mutate: mutateDraws } = useSWR(
    mode !== 'basic' 
      ? `/api/capitalization/draws?projectId=${projectId}` 
      : null,
    fetcher
  );

  // ... rest of component
};
```

### CRUD Operations

```typescript
// Create new debt facility
const handleAddDebt = async (facilityData) => {
  await fetch('/api/capitalization/debt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(facilityData),
  });
  mutateDebt(); // Refresh data
};

// Update debt facility
const handleUpdateDebt = async (facility_id, updates) => {
  await fetch(`/api/capitalization/debt/${facility_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  mutateDebt();
};

// Delete debt facility
const handleDeleteDebt = async (facility_id) => {
  await fetch(`/api/capitalization/debt/${facility_id}`, {
    method: 'DELETE',
  });
  mutateDebt();
};
```

---

## CALCULATION ENGINE INTEGRATION

### Interest Calculations (Future Phase)

The Capitalization tab provides **inputs** for the cash flow engine:

```typescript
// Interest expense calculated in cash flow engine
const calculateInterestExpense = (period, drawSchedule, interestRate) => {
  // Get outstanding balance at start of period
  const outstandingBalance = drawSchedule
    .filter(draw => draw.draw_date <= period.start_date)
    .reduce((sum, draw) => sum + draw.draw_amount, 0);
  
  // Calculate interest for period
  const monthlyRate = interestRate / 12 / 100;
  const interestExpense = outstandingBalance * monthlyRate;
  
  return interestExpense;
};
```

### Waterfall Distribution Calculations (Future Phase)

```typescript
// Distribution waterfall engine
const calculateDistributions = (
  cashAvailable: number,
  equityTranches: EquityTranche[],
  waterfallTiers: WaterfallTier[]
) => {
  let remainingCash = cashAvailable;
  const distributions = [];

  for (const tier of waterfallTiers.filter(t => t.is_active)) {
    // Calculate distribution for this tier
    const tierDistribution = applyWaterfallTier(
      remainingCash,
      tier,
      equityTranches
    );
    
    distributions.push(tierDistribution);
    remainingCash -= tierDistribution.total;
    
    if (remainingCash <= 0) break;
  }

  return distributions;
};
```

---

## TESTING WORKFLOW

### Phase 1: UI Testing (Current)
1. Component renders with mock data
2. Tabs switch correctly
3. Mode switching shows/hides fields appropriately
4. Cards expand/collapse
5. Summary metrics calculate correctly
6. Dark theme consistent throughout

### Phase 2: API Integration
1. Connect to backend endpoints
2. Test CRUD operations for each entity type
3. Validate error handling
4. Test concurrent edits
5. Verify data persistence

### Phase 3: Calculation Engine
1. Interest calculations based on draw schedule
2. Waterfall distribution logic
3. LP/GP split calculations
4. IRR threshold triggers
5. Preferred return accrual

---

## LANDSCAPER AI INTEGRATION HOOKS

### Document Extraction Points

**Loan Documents:**
```typescript
// Extract from loan commitment letter
const extractDebtTerms = async (documentId: string) => {
  const extracted = await landscaperAI.extract({
    document_id: documentId,
    schema: 'debt_facility',
    fields: [
      'loan_amount',
      'interest_rate_pct',
      'amortization_years',
      'loan_term_years',
      'ltv_pct',
      'dscr',
      'guarantee_type',
    ],
  });
  
  // Pre-fill form with extracted data
  setFormData(extracted);
};
```

**Partnership Agreement:**
```typescript
// Extract from PPM or partnership agreement
const extractEquityStructure = async (documentId: string) => {
  const extracted = await landscaperAI.extract({
    document_id: documentId,
    schema: 'equity_structure',
    fields: [
      'lp_ownership_pct',
      'gp_ownership_pct',
      'preferred_return_pct',
      'promote_pct',
      'catch_up_pct',
      'waterfall_tiers',
    ],
  });
  
  // Create equity tranches and waterfall tiers
  await createEquityStructure(extracted);
};
```

### Benchmark Validation

```typescript
// Compare debt terms to market benchmarks
const validateDebtTerms = async (facilityData) => {
  const benchmark = await landscaperAI.getBenchmark({
    asset_type: 'multifamily',
    location: projectLocation,
    metric: 'debt_terms',
  });
  
  const alerts = [];
  
  if (facilityData.interest_rate_pct > benchmark.median_rate + 0.5) {
    alerts.push({
      severity: 'warning',
      message: `Interest rate ${facilityData.interest_rate_pct}% is above market median of ${benchmark.median_rate}%`,
    });
  }
  
  if (facilityData.ltv_pct > benchmark.typical_ltv_max) {
    alerts.push({
      severity: 'error',
      message: `LTV ${facilityData.ltv_pct}% exceeds typical maximum of ${benchmark.typical_ltv_max}%`,
    });
  }
  
  return alerts;
};
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Run migration script to create `tbl_waterfall_tier` and `tbl_debt_draw_schedule`
- [ ] Implement API endpoints (see `capitalization_api_spec.md`)
- [ ] Add component to multifamily analysis page
- [ ] Connect to mode switching system
- [ ] Add loading states and error boundaries
- [ ] Test with Project 11 (existing multifamily test project)

### Post-Deployment
- [ ] Verify tab appears in multifamily projects
- [ ] Test CRUD operations for all entity types
- [ ] Validate calculation accuracy
- [ ] Document any issues or edge cases
- [ ] Plan Phase 2 features (calculation engine integration)

---

## TECHNICAL DEBT & FUTURE ENHANCEMENTS

### Known Limitations
1. **Mock Data**: Component uses hardcoded mock data. Backend integration needed.
2. **No Form Validation**: Client-side validation needs implementation.
3. **No Edit Dialogs**: Edit/Delete buttons need modal dialogs.
4. **No Landscaper AI**: Document extraction hooks need backend support.
5. **No Calculation Engine**: Waterfall distribution logic needs implementation.

### Phase 2 Features (Post-MVP)
1. **Interest Reserve Calculator**: Auto-calculate interest reserve based on draw schedule
2. **Sensitivity Analysis**: Show impact of rate changes on debt service
3. **Waterfall Visualizer**: Animated waterfall diagram showing distribution flow
4. **Return Projections**: IRR and equity multiple projections over hold period
5. **Comparison Tools**: Compare multiple debt scenarios side-by-side
6. **Refinancing Analysis**: Model permanent loan takeout scenarios
7. **Covenant Tracking**: Alert when approaching covenant thresholds

### Generalization for All Property Types
- Current implementation is multifamily-specific
- Can be generalized by adding `property_type` context
- Different default values for land dev vs CRE vs multifamily
- Terminology adjustments (e.g., "units" vs "lots" vs "spaces")

---

## SUMMARY

**What's Delivered:**
- Complete Capitalization tab React component with 4 sub-tabs
- Dark theme UI matching Operating Expenses pattern
- Progressive complexity disclosure (Basic/Standard/Advanced)
- Summary metrics and calculated fields
- Comprehensive API specification with 13 endpoints
- Database migration script for new tables
- Integration guide and testing checklist

**What's Needed:**
- Run migration to create `tbl_waterfall_tier` and `tbl_debt_draw_schedule`
- Implement backend API endpoints
- Connect component to live data via SWR/React Query
- Build edit/create/delete dialogs for CRUD operations
- Add form validation and error handling

**Session ID:** JW22

**Ready for backend handoff to claude.code or implementation in next session.**

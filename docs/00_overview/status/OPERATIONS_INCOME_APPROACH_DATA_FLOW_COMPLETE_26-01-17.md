# Operations Tab & Income Approach Data Flow Fix

**Status**: ✅ Complete
**Date**: January 17, 2026
**Session**: QK-30

---

## Overview

Fixed the broken data flow between Property → Operations → Income Approach tabs to establish a single source of truth for financial data. This ensures numbers tie correctly across all tabs and removes redundant data entry points.

## Key Changes

### 1. Data Flow Architecture

```
PROPERTY TAB (Source of Truth)
└── tbl_multifamily_unit (current_rent, market_rent, occupancy_status)
           │
           ▼
OPERATIONS TAB (Aggregated View)
├── Rental Income: READ-ONLY (from Property)
├── Physical Vacancy: CALCULATED if rent roll exists, else EDITABLE
├── Credit Loss/Concessions: EDITABLE
└── Operating Expenses: EDITABLE
           │
           ▼
INCOME APPROACH TAB (Valuation)
├── Revenue/Vacancy/OpEx: READ-ONLY (from Operations)
└── Cap Rate/DCF Parameters: EDITABLE
```

### 2. NOI Basis Consolidation (4 → 3)

**Before:**
- `trailing_12` - T-12 (trailing 12 months)
- `forward_12` - Forward 12 months
- `avg_straddle` - Average of T-12 and F-12
- `stabilized` - Stabilized

**After:**
- `f12_current` - Forward 12 using current (in-place) rents
- `f12_market` - Forward 12 using market rents
- `stabilized` - Market rent at stabilized vacancy

### 3. Operations Tab Changes

| Feature | Before | After |
|---------|--------|-------|
| Rental Income | Editable rates | Read-only with lock icon |
| Rent Columns | Single rate column | Current + Market columns |
| Physical Vacancy | Always editable | Calculated if rent roll exists |
| Data Source | Unit type aggregates | Unit-level aggregates |

### 4. Income Approach Changes

| Feature | Before | After |
|---------|--------|-------|
| Value Tiles | 4 tiles | 3 Direct Cap + 1 DCF placeholder |
| P&L Table | Single column | 3-column with visibility toggles |
| Vacancy/Credit Loss | Editable | Read-only (from Operations) |
| Basis Names | Legacy names | F-12 Current/Market/Stabilized |

## Files Modified

### Backend
- `src/app/api/projects/[projectId]/operations/route.ts` - New data source, vacancy calculation
- `backend/apps/financial/views_income_approach.py` - 3-basis calculation

### Frontend - Operations
- `src/components/operations/RentalIncomeSection.tsx` - Read-only, current/market columns
- `src/components/operations/VacancyDeductionsSection.tsx` - Conditional edit
- `src/components/operations/types.ts` - New fields and flags
- `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx` - Prop updates

### Frontend - Income Approach
- `src/types/income-approach.ts` - NOIBasis type, labels, colors
- `src/hooks/useIncomeApproach.ts` - 3-basis recalculation
- `src/components/valuation/income-approach/ValueTiles.tsx` - 3+1 layout
- `src/components/valuation/income-approach/DirectCapView.tsx` - 3-column P&L
- `src/app/projects/[projectId]/valuation/income-approach/page.tsx` - allTiles prop

## UI Features

### Value Tiles (3+1 Layout)
- **F-12 Current** (slate): Current rents, physical vacancy
- **F-12 Market** (teal): Market rents, physical vacancy
- **Stabilized** (emerald): Market rents, stabilized vacancy
- **DCF** (violet): Coming Soon placeholder

### 3-Column P&L Table
- Toggle buttons to show/hide columns
- Color-coded headers matching tile colors
- Selected basis highlighted with bold text
- Integrated valuation section showing value per column
- Price per unit and per SF for each basis

## Backwards Compatibility

Legacy basis names are mapped to new names:
```typescript
const basisMapping = {
  'trailing_12': 'f12_current',
  'forward_12': 'f12_market',
  'avg_straddle': 'f12_market',  // Fallback to market
};
```

## Verification Checklist

- [x] Operations Tab - Rental income is read-only
- [x] Operations Tab - Lock icon appears for rent roll data
- [x] Operations Tab - Physical vacancy calculated when rent roll exists
- [x] Operations Tab - Current and Market rent columns display
- [x] Income Approach - 3 value tiles + DCF placeholder
- [x] Income Approach - Column toggles work correctly
- [x] Income Approach - At least one column always visible
- [x] Income Approach - Selected basis highlighted
- [x] TypeScript compiles without errors
- [ ] End-to-end numbers verification (pending manual test)

## Next Steps

1. Manual verification with real project data
2. DCF implementation (Phase 2)
3. Consider migrating Operations API to Django

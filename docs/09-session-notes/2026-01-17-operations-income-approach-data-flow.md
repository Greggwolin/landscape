# Operations Tab & Income Approach Data Flow Fix

**Date**: January 17, 2026
**Duration**: ~3 hours
**Focus**: Fix broken data flow between Property → Operations → Income Approach tabs

---

## Summary

Major refactoring of the Operations Tab and Income Approach valuation to establish proper data flow with single source of truth. Operations Tab now pulls rental income from Property Tab (read-only), calculates physical vacancy from rent roll when available, and Income Approach pulls from Operations. NOI bases consolidated from 4 to 3 (F-12 Current, F-12 Market, Stabilized).

## Problem Solved

The previous implementation had:
- Operations Tab allowing editing of rents (should be read-only from Property Tab)
- Income Approach calculating GPR independently (should pull from Operations)
- Numbers not tying between tabs
- Multiple sources of truth for the same data
- 4 NOI bases (with redundant "Average" basis)

## Architecture After Fix

```
PROPERTY TAB (Source of Truth)
├── tbl_multifamily_unit (current_rent, market_rent, occupancy_status)
│
└── Physical vacancy = (Vacant units / Total units)
           │
           ▼
OPERATIONS TAB (Aggregated View)
├── Rental Income: READ-ONLY (aggregated from tbl_multifamily_unit)
├── Vacancy: CALCULATED if rent roll exists, else EDITABLE
├── Credit Loss/Concessions: EDITABLE (assumptions)
└── Operating Expenses: EDITABLE
           │
           ▼
INCOME APPROACH TAB (Valuation)
├── Revenue: READ-ONLY (from Operations)
├── Vacancy/Loss: READ-ONLY (from Operations)
├── OpEx: READ-ONLY (from Operations)
└── Cap Rate/DCF: EDITABLE
```

## Major Accomplishments

### 1. Operations Backend - Data Source Update ✅
Updated `src/app/api/projects/[projectId]/operations/route.ts` to:
- Query `tbl_multifamily_unit` instead of `tbl_multifamily_unit_type`
- Add current vs market rent columns
- Calculate physical vacancy from `occupancy_status`
- Add `has_detailed_rent_roll` flag for conditional UI behavior

### 2. Operations Frontend - Read-Only Rental Income ✅
Updated `src/components/operations/RentalIncomeSection.tsx`:
- Made rate column read-only (removed InputCell)
- Added Current Rent and Market Rent columns
- Added lock icon and "from Rent Roll" indicator
- Updated totals calculation for current/market

### 3. Operations Frontend - Conditional Vacancy Edit ✅
Updated `src/components/operations/VacancyDeductionsSection.tsx`:
- Physical vacancy read-only when calculated from rent roll
- Shows lock icon and "Calculated" indicator when read-only
- Falls back to editable when no detailed rent roll exists

### 4. Income Approach - NOI Basis Consolidation (4 → 3) ✅
Updated `src/types/income-approach.ts`:
- Changed `NOIBasis` from `'trailing_12' | 'forward_12' | 'avg_straddle' | 'stabilized'` to `'f12_current' | 'f12_market' | 'stabilized'`
- Added `LegacyNOIBasis` for backwards compatibility
- Updated labels and colors

### 5. Income Approach Backend - 3-Basis Calculation ✅
Updated `backend/apps/financial/views_income_approach.py`:
- Renamed bases: `trailing_12` → `f12_current`, `forward_12` → `f12_market`
- Removed `avg_straddle` calculation
- Added basis mapping for legacy compatibility

### 6. Income Approach Frontend - ValueTiles 3+1 Layout ✅
Updated `src/components/valuation/income-approach/ValueTiles.tsx`:
- 3 Direct Cap tiles (F-12 Current, F-12 Market, Stabilized)
- DCF placeholder tile with "Coming Soon" message
- Color-coded per basis type

### 7. Income Approach Frontend - 3-Column P&L with Toggle ✅
Updated `src/components/valuation/income-approach/DirectCapView.tsx`:
- Added column visibility toggles (F-12 Current, F-12 Market, Stabilized)
- Multi-column P&L table showing all visible basis calculations side-by-side
- Color-coded columns matching ValueTiles
- Selected basis highlighting with bold text
- Integrated valuation section showing NOI → Cap Rate → Indicated Value for each column

## Files Modified

### Backend
| File | Changes |
|------|---------|
| `src/app/api/projects/[projectId]/operations/route.ts` | Query tbl_multifamily_unit, add rent roll check, calculate vacancy |
| `backend/apps/financial/views_income_approach.py` | 3-basis calculation, remove avg, basis mapping |

### Frontend - Operations Tab
| File | Changes |
|------|---------|
| `src/components/operations/RentalIncomeSection.tsx` | Read-only rate column, current/market columns |
| `src/components/operations/VacancyDeductionsSection.tsx` | Conditional vacancy edit |
| `src/components/operations/types.ts` | Add `is_calculated`, `has_detailed_rent_roll`, market fields |
| `src/app/projects/[projectId]/components/tabs/OperationsTab.tsx` | Pass new props |

### Frontend - Income Approach
| File | Changes |
|------|---------|
| `src/types/income-approach.ts` | NOIBasis type (4→3), colors, labels |
| `src/hooks/useIncomeApproach.ts` | 3-basis recalculation, legacy mapping |
| `src/components/valuation/income-approach/ValueTiles.tsx` | 3+1 tile layout |
| `src/components/valuation/income-approach/DirectCapView.tsx` | 3-column P&L with toggles |
| `src/app/projects/[projectId]/valuation/income-approach/page.tsx` | Pass allTiles prop |

## NOI Basis Definitions

| Basis | Label | GPR Source | Vacancy |
|-------|-------|------------|---------|
| `f12_current` | F-12 Current | Current (in-place) rents | Physical vacancy rate |
| `f12_market` | F-12 Market | Market rents | Physical vacancy rate |
| `stabilized` | Stabilized | Market rents | Stabilized vacancy rate |

## Git Activity

### Commit Information
Changes ready to be committed as part of documentation update.

## Next Steps

1. **End-to-end testing** - Verify numbers tie across Property → Operations → Income Approach
2. **DCF Implementation** - Replace placeholder with actual DCF analysis (Phase 2)
3. **Backend Operations endpoint** - Consider migrating to Django for consistency
4. **AssumptionsPanel** - Verify read-only fields have proper lock indicators

## Technical Notes

- TypeScript check passes (only pre-existing errors in `document-analyzer-broken.ts`)
- Legacy basis names (`trailing_12`, `forward_12`, `avg_straddle`) mapped to new names for backwards compatibility
- Multi-column P&L prevents hiding all columns (at least one must be visible)

# Waterfall Napkin Form Redesign

**Date**: December 5, 2025
**Duration**: ~4 hours
**Focus**: Complete redesign of Napkin Mode Waterfall input form, Excel variance fix, hurdle display fix

---

## Summary

Redesigned the NapkinWaterfallForm component to match a new structured mockup with:
- Equity Contributions section (GP/LP/Total)
- Waterfall Type toggle (IRR / Equity Mult / IRR + EM)
- IRR Waterfall table with Rate, Promote, LP/GP columns
- Equity Multiples table with shared splits when in hybrid mode
- Grey background styling for input cells, white for calculated cells

Also fixed the Period-by-Period Distributions table Accrued Pref/Hurdle columns.

**Session 2 (Afternoon):** Fixed $800K variance between Python engine and Excel IRR waterfall calculations, and fixed hurdle column not updating when waterfall type changes.

---

## Major Accomplishments

### 1. NapkinWaterfallForm Complete Redesign ✅

Replaced the horizontal row of 5 inputs with a structured tile:

**Equity Contributions Section:**
- GP Contribution % (editable grey cell)
- LP % auto-calculated (white cell) = 100% - GP%
- Dollar amounts derived from project peak equity

**Waterfall Type Toggle:**
- Three buttons: IRR / Equity Mult / IRR + EM
- Controls which waterfall tables are visible
- IRR + EM shows both tables with shared LP/GP splits

**IRR Waterfall Table:**
- Preferred + Capital: Rate (8%), Promote (—), LP/GP splits
- Hurdle 1: Rate (15%), Promote (20%), LP/GP splits
- Residual: Rate (—), Promote (—), LP/GP splits

**Equity Multiples Table:**
- Same structure but Rate shows multiples (1.00x, 1.50x)
- When IRR + EM mode selected, LP/GP splits show as read-only (shared with IRR table)

### 2. Accrued Pref/Hurdle Columns Fixed ✅

Fixed the Period-by-Period Distributions table to show cumulative accrued values:
- Added `cumulative_accrued_pref` and `cumulative_accrued_hurdle` fields to Python engine
- Pref accrues at 8% annual (~0.667%/month)
- Hurdle accrues at 15% annual (~1.25%/month)
- Both decrease when distributions pay them down
- Values now display correctly: P2 shows ~$615k / ~$1M

### 3. Period Table UI Updates ✅

- Removed LP IRR and GP IRR columns
- Added "Residual to Hurdle" column after Tier 1 GP share
- Added "Residual" column after Tier 2 GP share
- Renamed "Promote" to "Hurdle" in display
- Right-justified all value columns

### 4. $800K Excel Variance Fix ✅

Fixed IRR waterfall calculations to match Excel within $187 (0.00008% variance).

**Problem:** Python engine was calculating LP distributions $801,936 under Excel's values.

**Root Cause:** First period contributions were being processed AFTER accruals, but Excel processes them BEFORE.

**Solution:** In `engine.py`, for period 1 only:
1. Set `prior_date` to start of month (day 1) instead of same-day
2. Process contribution BEFORE calculating accruals
3. Keep subsequent periods unchanged (accrual-before-contribution)

**Results:**
| Partner | Python | Excel | Variance |
|---------|--------|-------|----------|
| LP | $223,787,714 | $223,787,901 | -$187 |
| GP | $71,031,059 | $71,030,872 | +$187 |

### 5. Hurdle Column Display Fix ✅

Fixed hurdle values and labels not updating when switching waterfall type (IRR → EM → IRR+EM).

**Problem:** The API transformation was ignoring the `hurdle_method` query parameter and always preferring EMx values if they existed in the database.

**Solution:**
1. Modified `transformDjangoResponse()` in calculate/route.ts to accept and use `hurdleMethod` parameter
2. Based on mode, display appropriate values:
   - **IRR mode:** hurdleType='IRR', hurdleRate=8%, 15%
   - **EMx mode:** hurdleType='equity_multiple', hurdleRate=1x, 1.5x
   - **IRR+EMx mode:** hurdleType='IRR', hurdleRate=8%, 15% (IRR as primary)
3. Updated WaterfallResults.tsx period table header to use correct suffix (% vs x) based on hurdleType

---

## Files Modified

### New Files Created:
None (redesigned existing component)

### Files Modified:

**Frontend:**
- `src/components/capitalization/NapkinWaterfallForm.tsx` - Complete redesign with structured layout
- `src/components/capitalization/WaterfallResults.tsx` - Period table column updates
- `src/app/api/projects/[projectId]/waterfall/napkin/route.ts` - Extended payload support
- `src/app/api/projects/[projectId]/waterfall/calculate/route.ts` - Cumulative accrued mapping

**Backend (Python):**
- `services/financial_engine_py/financial_engine/waterfall/types.py` - Added cumulative accrued fields
- `services/financial_engine_py/financial_engine/waterfall/engine.py` - Cumulative tracking logic + first period fix
- `backend/apps/calculations/services.py` - Serialization of new fields

---

## Technical Details

### First Period Accrual Fix (engine.py)

```python
for i, cf in enumerate(self.cash_flows):
    if i > 0:
        prior_date = self.cash_flows[i - 1].date
    else:
        # First period: prior_date is START of month (day 1)
        # This matches Excel where initial contribution happens at beginning
        # of period and accrues through the period end date
        prior_date = cf.date.replace(day=1)

# For FIRST period only: process contribution BEFORE accrual
is_first_period = cf.period_id == 1

if is_first_period and cf.amount < ZERO:
    # Process contribution first
    lp_contrib, gp_contrib = allocate_contribution(...)
    self._add_contribution(lp_contrib, gp_contrib, cf.date)

# Calculate accruals for all active tiers
accruals = self._calculate_all_accruals(cf.date, prior_date)

# Process contributions for subsequent periods (after accrual)
if not is_first_period and cf.amount < ZERO:
    # Process contribution after accrual
    ...
```

### NapkinWaterfallForm State Variables

```typescript
// Waterfall type toggle
const [waterfallType, setWaterfallType] = useState<WaterfallType>('IRR');

// Equity Contributions
const [gpContributionPct, setGpContributionPct] = useState<number | ''>(10);

// IRR Waterfall inputs
const [prefRateIrr, setPrefRateIrr] = useState<number | ''>(8);
const [hurdleIrr, setHurdleIrr] = useState<number | ''>(15);

// EM Waterfall inputs
const [prefRateEm, setPrefRateEm] = useState<number | ''>(1.0);
const [hurdleEm, setHurdleEm] = useState<number | ''>(1.5);

// Shared splits (used by both IRR and EM tables)
const [prefLpPct, setPrefLpPct] = useState<number | ''>(90);
const [promotePct, setPromotePct] = useState<number | ''>(20);
const [promoteLpPct, setPromoteLpPct] = useState<number | ''>(72);
const [residualLpPct, setResidualLpPct] = useState<number | ''>(45);
```

### Input Cell Styling

```typescript
const inputCellStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  padding: '4px 8px',
  textAlign: 'center',
  minWidth: '70px',
};

const calcCellStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '4px 8px',
  textAlign: 'center',
  minWidth: '70px',
};
```

### API Payload Extended

The napkin endpoint now accepts additional fields:
- `waterfallType` - 'IRR' | 'EM' | 'IRR_EM'
- `prefLpPct`, `promoteLpPct`, `residualLpPct` - Explicit LP splits per tier
- `prefRateEm`, `hurdleEm` - Equity multiple thresholds

### Database Hurdle Types

Maps to existing database enum values:
- 'IRR' → 'irr'
- 'EM' → 'equity_multiple'
- 'IRR_EM' → 'hybrid'

---

## Git Activity

### Commit Information:
Pending - changes ready for commit

---

## Next Steps

1. Test the new form with actual project data
2. Verify database tier records save correctly with new structure
3. Add validation for split percentages (LP + GP = 100%)
4. Consider adding multi-hurdle support (Hurdle 2, 3, 4)
5. Add Excel export for waterfall configuration

---

## Related Documentation

- [WATERFALL_STATUS.md](../02-features/financial-engine/WATERFALL_STATUS.md) - Engine status
- [CC Prompt for form redesign](internal reference)

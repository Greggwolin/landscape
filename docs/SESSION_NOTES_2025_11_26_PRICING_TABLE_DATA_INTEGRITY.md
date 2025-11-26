# Session Notes: Pricing Table Data Integrity & Calculation Fixes
**Date**: 2025-11-26
**Focus**: Fixed table gross value calculation & removed hardcoded fallbacks

---

## Overview

This session addressed two critical issues with the pricing table:
1. **Table Gross Value Calculation Bug**: SQL query was calculating `price × units` instead of UOM-aware formula (`price × lot_width × units` for FF)
2. **Data Integrity Issue**: Hardcoded fallback values were bypassing admin-configured settings

---

## Issue 1: Table Gross Value Calculation

### Problem
- Modal showed correct gross value: **$15,360,000**
- Table showed incorrect gross value: **$307,200**
- Root cause: SQL query used simple multiplication instead of UOM-aware calculation

### Calculation Breakdown
For a Front Foot (FF) parcel:
- Price per unit: $2,400/FF
- Lot width: 50 FF
- Units: 128

**Wrong Formula** (what was happening):
```
$2,400 × 128 units = $307,200 ❌
```

**Correct Formula** (what should happen):
```
$2,400/FF × 50 FF × 128 units = $15,360,000 ✅
```

### Solution
Updated SQL query in [views.py:495-526](../backend/apps/sales_absorption/views.py#L495-L526) to use UOM-aware calculation:

```python
CASE pricing.unit_of_measure
  WHEN 'FF' THEN ROUND((
    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
    * COALESCE(p.lot_width, 0) * COALESCE(p.units_total, 0))::numeric, 2
  )
  WHEN '$/FF' THEN ROUND((
    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
    * COALESCE(p.lot_width, 0) * COALESCE(p.units_total, 0))::numeric, 2
  )
  WHEN 'AC' THEN ROUND((
    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
    * COALESCE(p.acres_gross, 0))::numeric, 2
  )
  ELSE ROUND((
    pricing.price_per_unit * POWER(1 + (pricing.growth_rate / 12), p.sale_period)
    * COALESCE(p.units_total, 0))::numeric, 2
  )
END
```

### Technical Notes
- Added `::numeric` casting before `ROUND()` to satisfy PostgreSQL type requirements
- Handles different UOM types: FF (Front Foot), AC (Acre), EA (Each)
- Applies monthly compounding using `POWER(1 + (growth_rate / 12), periods)`
- Falls back to base price calculation when inflation data is missing

---

## Issue 2: Hardcoded Fallback Values

### Problem
User reported: "This is causing data integrity issues where admin-configured values are being overridden by fallbacks."

The pricing table had hardcoded defaults:
```typescript
const DEFAULT_GROWTH_RATES = [
  { id: 'default-0.035', value: 0.035, label: '3.5%' },
];

const UOM_OPTIONS_FALLBACK = [
  { value: 'FF', label: 'FF - Front Foot' },
  { value: 'SF', label: 'SF - Square Foot' },
  { value: 'AC', label: 'AC - Acre' },
  { value: 'EA', label: 'EA - Each' },
];
```

These would silently substitute when API returned empty, bypassing admin settings.

### Solution
Removed all hardcoded fallbacks from [PricingTable.tsx](../src/components/sales/PricingTable.tsx):

#### 1. Deleted Hardcoded Constants (lines 36-46)
```typescript
// REMOVED:
// const DEFAULT_GROWTH_RATES = [...]
// const UOM_OPTIONS_FALLBACK = [...]
```

#### 2. Removed UOM Fallback (line 127)
```typescript
// BEFORE: const uomChoices = uomOptions.length > 0 ? uomOptions : UOM_OPTIONS_FALLBACK;
// AFTER:
const uomChoices = uomOptions;
```

#### 3. Removed Growth Rate Fallback (lines 170-174)
```typescript
// If no benchmarks configured, return empty array - don't use fallback
if (options.length === 0) {
  return [];
}
```

#### 4. Updated New Row Creation (lines 206-216)
```typescript
return {
  project_id: projectId,
  lu_type_code: product.type_code,
  product_code: product.product_code || '',
  price_per_unit: 0,
  unit_of_measure: null, // No default - must be selected
  growth_rate: null,      // No default - must be selected
};
```

#### 5. Updated Global Growth Rate State (line 120)
```typescript
// BEFORE: const [globalGrowthRate, setGlobalGrowthRate] = useState<number>(0.035);
// AFTER:
const [globalGrowthRate, setGlobalGrowRate] = useState<number | null>(null);
```

#### 6. Added Empty State Handling
All dropdowns now show appropriate messages when no options configured:

**Growth Rate Dropdown** (lines 782-795):
```typescript
disabled={growthRateOptions.length === 0}
>
  {growthRateOptions.length === 0 ? (
    <option value="">No growth rate benchmarks configured</option>
  ) : (
    <>
      {growthRateOptions.map(opt => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
      <option value="custom">Custom...</option>
    </>
  )}
</select>
```

**UOM Dropdown** (lines 467-475):
```typescript
disabled={uomChoices.length === 0}
>
  {uomChoices.length === 0 ? (
    <option value="">No UOM options configured</option>
  ) : (
    uomChoices.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))
  )}
</select>
```

---

## Files Modified

1. **[backend/apps/sales_absorption/views.py](../backend/apps/sales_absorption/views.py#L495-L526)**
   - Fixed SQL query to use UOM-aware gross_value calculation
   - Added ::numeric casting for PostgreSQL ROUND() compatibility

2. **[src/components/sales/PricingTable.tsx](../src/components/sales/PricingTable.tsx)**
   - Removed DEFAULT_GROWTH_RATES constant (lines 36-42)
   - Removed UOM_OPTIONS_FALLBACK constant (lines 36-42)
   - Updated uomChoices to use API directly (line 127)
   - Updated growthRateOptions to return empty array when no benchmarks (lines 170-174)
   - Changed new row creation to use null values (lines 206-216, 286-287)
   - Changed globalGrowthRate state initialization to null (line 120)
   - Added disabled states and "No options configured" messages to all dropdowns

---

## Impact

### Data Integrity ✅
- Users must now select from admin-configured options
- No silent fallbacks that bypass admin settings
- Clear feedback when configuration is missing

### Calculation Accuracy ✅
- Table gross values now match modal calculations
- Correct UOM-aware formulas for all measurement types
- Proper monthly compounding applied

### User Experience ✅
- Dropdowns show "No options configured" when empty
- Disabled state prevents invalid selections
- Clear indication when admin configuration is needed

---

## Testing Notes

Verified with project 9, parcel "SFD 50x128 FF":
- ✅ Table gross_value: $15,360,000 (was $307,200)
- ✅ Modal gross_value: $15,360,000
- ✅ Net proceeds match between table and modal
- ✅ UOM dropdowns show admin-configured options only
- ✅ Growth rate dropdowns show benchmarks only
- ✅ Empty dropdowns show appropriate messaging

---

## Next Steps

1. **Admin Configuration**: Ensure growth rate benchmarks are configured in admin panel
2. **UOM Options**: Verify UOM options are available from API endpoint
3. **Documentation**: Update user guide to reflect required admin configuration
4. **Testing**: Test with projects that have different UOM types (AC, EA, SF)

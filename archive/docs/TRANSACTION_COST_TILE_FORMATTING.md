# Transaction Cost Tile Formatting - Final Changes

**Date**: 2025-11-04
**Files Modified**:
- `src/components/benchmarks/BenchmarkAccordion.tsx`
- `src/components/benchmarks/AddBenchmarkModal.tsx`

## Summary

Fixed transaction cost tile display formatting, removed geography field from global benchmarks.

---

## Changes Made

### 1. Number Formatting

**Before**: `1.000000% of Gross Sale Price`
**After**: `1% of Gross Sale Price`

**Formatting Rules**:
- **Percentages**: Remove trailing zeros, max 2 decimal places
  - `1.0` → `1%`
  - `1.5` → `1.5%`
  - `1.25` → `1.25%`

- **Currency ($$)**: Comma separators, no decimals for whole numbers
  - `2500` → `$2,500`
  - `2500.50` → `$2,500.50`

- **Per Unit ($/Unit)**: Remove trailing zeros
  - `500.0` → `$500`
  - `499.99` → `$499.99`

### 2. UOM Display

Added UOM indicator in parentheses after the value:

- **Percentage**: `1% of Gross Sale Price` (UOM implicit in "% of")
- **Flat Fee**: `$2,500 ($$)`
- **Per Unit**: `$500 ($/Unit)`

### 3. Removed Geography Field

**Rationale**: Geography is a project-level concern, not a global benchmark attribute.

**Changes**:
- ✅ Removed from transaction cost tile display
- ✅ Removed from all categories in AddBenchmarkModal
- ✅ Geography tracking moved to project-level application

---

## Display Examples

### Transaction Cost Tiles:

```
┌────────────────────────────────────────────┐
│ Closing Costs    1% of Gross Sale Price   │
│ Title Insurance  $2,500 ($$)               │
│ Legal Fees       $350 ($/Unit)             │
└────────────────────────────────────────────┘
```

### Age Display:
- **New benchmarks (0 months)**: No age badge shown
- **Recent (<12 months)**: Green `6mo` badge
- **Aging (12-24 months)**: Gray `18mo` badge
- **Stale (>24 months)**: Red `30mo` badge

---

## Code Implementation

### Number Formatting Logic

```typescript
if (valueType === 'percentage') {
  // Format as percentage with max 2 decimal places, remove trailing zeros
  const formatted = value % 1 === 0
    ? value.toFixed(0)
    : value.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted}% of ${basis}`;

} else if (valueType === 'flat_fee') {
  // Format currency with commas
  const formatted = value % 1 === 0
    ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `$${formatted} ($$)`;

} else if (valueType === 'per_unit') {
  // Format per unit
  const formatted = value % 1 === 0
    ? value.toFixed(0)
    : value.toFixed(2).replace(/\.?0+$/, '');
  return `$${formatted} ($/Unit)`;
}
```

---

## Form Changes

### Transaction Cost Modal

**Removed Fields**:
- ❌ Market Geography (removed entirely)
- ❌ Confidence Level (removed for transaction costs, kept for other categories)

**Final Form Layout**:
```
┌──────────────────────────────────────────────────────┐
│ [Cost Type ▼]  [Value]  [Unit ▼]                    │
│ (Name - only if "Other" selected)                    │
│ (Conditional % of / $/Unit fields)                   │
│ [Description]                                        │
└──────────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [x] Percentage values format correctly (1% not 1.000000%)
- [x] Currency values format with commas ($2,500 not $2500)
- [x] Per unit values format correctly ($500 not 500.00)
- [x] UOM indicators show in parentheses
- [x] Geography removed from tiles
- [x] Geography removed from modal
- [x] Age badge hidden for new benchmarks (0mo)
- [x] Age badge shows for older benchmarks with color coding

---

## Future Considerations

1. **Geography at Project Level**: When benchmarks are applied to projects, geography can be specified at that time
2. **Basis Field**: Currently defaults to "Gross Sale Price" for percentages - implement dropdown when "% of" is selected
3. **Unit Field**: Implement dropdown for "$/Unit" to specify what unit it applies to

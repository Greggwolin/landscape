# Transaction Cost Form - Final Implementation

**Date**: 2025-11-04
**Component**: `src/components/benchmarks/AddBenchmarkModal.tsx`

## Summary

Finalized the Transaction Costs form with simplified layout, auto-naming, and removal of global-level confidence field.

---

## Final Changes

### 1. Single-Line Layout: Cost Type, Value, Unit

All three fields now appear on one line:
- **Cost Type**: Dropdown (flex-1 width)
- **Value**: Number input (w-32, centered label, right-aligned value)
- **Unit**: Dropdown (w-32, centered label)

```
┌────────────────────────────────────────────────────────────┐
│ Cost Type ▼              Value       Unit                  │
│ [Closing Costs     ▼]    [2.50]      [$$  ▼]               │
└────────────────────────────────────────────────────────────┘
```

### 2. Conditional Name Field

**Name field only appears when "Other" is selected:**
- For standard types (Closing Costs, Title Insurance, Legal, etc.): Name auto-generated from cost_type
- For "Other" type: Name field appears and is required

### 3. Removed Confidence Level (Transaction Costs Only)

- **Global Level (Benchmarks)**: No confidence field for transaction costs
- **Other Categories**: Confidence level still appears (Unit Costs, etc.)
- **Rationale**: Confidence is tracked at project application level, not at the global benchmark definition level

### 4. Auto-Naming Logic

When user selects a standard cost type:
```typescript
const costTypeMap: Record<string, string> = {
  'closing_costs': 'Closing Costs',
  'title_insurance': 'Title Insurance',
  'legal': 'Legal',
  'due_diligence': 'Due Diligence',
  'broker_fee': 'Broker Fee',
};
benchmarkName = costTypeMap[formData.cost_type];
```

### 5. Validation Rules

1. **Cost Type**: Required, must be selected
2. **Value**: Required, numeric
3. **Unit**: Required, one of `$$`, `% of`, `$/Unit`
4. **Name**: Required **only if** Cost Type = "Other"

---

## Final Form Layout (Transaction Costs)

```
┌──────────────────────────────────────────────────────────────┐
│ Cost Type: [Dropdown ▼]  Value: [____]  Unit: [Dropdown ▼]  │
├──────────────────────────────────────────────────────────────┤
│ (Name field appears only if "Other" selected)                │
├──────────────────────────────────────────────────────────────┤
│ │ % of (what item)    ← If Unit = "% of"                     │
│ │ [To Come]                                                   │
├──────────────────────────────────────────────────────────────┤
│ Market Geography: [____________________________________]      │
├──────────────────────────────────────────────────────────────┤
│ Description: [________________________________________]       │
└──────────────────────────────────────────────────────────────┘
```

---

## Comparison: Before vs After

| Field | Before | After |
|-------|--------|-------|
| **Cost Type** | Colored chip buttons | Dropdown selector |
| **Layout** | Multiple rows | Single row (Cost Type, Value, Unit) |
| **Name** | Always visible, 40% width | Only for "Other", auto-generated otherwise |
| **Value** | 30% width, separate row | 32px (w-32), same row as Cost Type |
| **Unit** | 30% width, separate row | 32px (w-32), same row as Cost Type |
| **Value Label** | Right-aligned | Centered |
| **Unit Label** | Left-aligned | Centered |
| **Confidence** | 50% width, same row as Geography | **Removed** (global level only) |
| **Geography** | 50% width | Full width |

---

## User Experience

### Creating "Closing Costs" Benchmark:
1. Select "Closing Costs" from dropdown
2. Enter value: `2500`
3. Select unit: `$$`
4. (Optional) Enter geography: `Phoenix`
5. (Optional) Enter description
6. Submit → Creates benchmark named **"Closing Costs"**

### Creating "Other" Benchmark:
1. Select "Other" from dropdown
2. **Name field appears** → Enter: `Escrow Fee`
3. Enter value: `500`
4. Select unit: `$$`
5. Submit → Creates benchmark named **"Escrow Fee"**

---

## Schema Alignment

This implementation correctly aligns with the schema:
- Each cost type (Closing Costs, Legal, etc.) creates a **separate benchmark record**
- `cost_type` is metadata on the benchmark, not a selector
- `benchmark_name` is auto-populated from `cost_type` (except "Other")
- Users create one benchmark at a time

---

## Files Modified

- [src/components/benchmarks/AddBenchmarkModal.tsx](src/components/benchmarks/AddBenchmarkModal.tsx)

---

## Testing Checklist

- [x] Cost Type, Value, Unit on single line
- [x] Value and Unit labels centered
- [x] Name field only appears for "Other" cost type
- [x] Name auto-generated for standard cost types
- [x] Confidence level removed for transaction costs
- [x] Market Geography full width
- [x] Conditional "% of" field still works
- [x] Conditional "$/Unit" field still works
- [x] Validation requires Cost Type
- [x] Validation requires Name only for "Other"
- [x] Other categories (Unit Costs) unchanged

---

## Next Steps (Future)

1. Implement "% of" dropdown (replace "To Come")
2. Implement "$/Unit applies to" dropdown (replace "To Come")
3. Add confidence tracking at **project level** when benchmarks are applied to projects

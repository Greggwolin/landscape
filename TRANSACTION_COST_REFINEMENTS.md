# Transaction Cost Benchmark Refinements

**Date**: 2025-11-04
**Summary**: Enhanced transaction cost tile layout, seeded default records, and improved add/edit workflows.

---

## Changes Made

### 1. Layout: Push Values Far Right

**Before**: Name and value side-by-side with small gap
**After**: Name fixed at 192px (w-48), value positioned far right

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Closing Costs                         $2,500 ($$)    6mo│
│ Title Insurance                       $1,200 ($$)       │
│ Legal                                 $800 ($$)         │
└─────────────────────────────────────────────────────────┘
```

**Implementation**:
```tsx
<span className="text-sm font-medium w-48">{benchmark.benchmark_name}</span>
<div className="flex-1 flex items-center justify-between">
  {valueDisplay && (
    <span className="text-sm text-slate-300">{valueDisplay}</span>
  )}
  {ageMonths > 0 && (
    <span className={`text-xs font-medium ${ageColor} ml-auto`}>
      {ageMonths}mo
    </span>
  )}
</div>
```

---

### 2. Seeded Default Transaction Cost Records

**Created 5 Built-In Records**:
1. **Closing Costs** (`closing_costs`)
2. **Title Insurance** (`title_insurance`)
3. **Legal** (`legal`)
4. **Due Diligence** (`due_diligence`)
5. **Broker Fee** (`broker_fee`)

**Seed Script**: `scripts/seed-transaction-cost-defaults.sql`

**Characteristics**:
- `source_type`: `system_default`
- `value`: `0.0` (placeholder, user edits)
- `value_type`: `flat_fee` (default)
- `is_global`: `true`
- `is_active`: `true`

**Run Command**:
```bash
psql $DATABASE_URL -f scripts/seed-transaction-cost-defaults.sql
```

---

### 3. Name Editing Rules

**Built-In Records (Standard Cost Types)**:
- Names are **read-only** (disabled input field)
- Cannot change name, only edit value, unit, and description
- Identified by `cost_type` in: `['closing_costs', 'title_insurance', 'legal', 'due_diligence', 'broker_fee']`

**Custom Records (cost_type = 'other')**:
- Names are **editable**
- User can change name, value, unit, and description
- Created via "Add New" form

**Visual Indicator**:
- Built-in names: Grayed out (`disabled:opacity-50`)
- Custom names: Normal input field

---

### 4. Add New Form Changes

**Before**: Dropdown selector for cost type
**After**: Text input for custom name

**Old Form**:
```
┌──────────────────────────────────────────┐
│ [Cost Type ▼]  [Value]  [Unit ▼]        │
│ (Name field - only if "Other" selected) │
└──────────────────────────────────────────┘
```

**New Form**:
```
┌────────────────────────────────────────────┐
│ [Custom Name Input]  [Value]  [Unit ▼]    │
│ [Description textarea]                     │
└────────────────────────────────────────────┘
```

**Rationale**:
- Built-ins are pre-seeded, no need to select them
- "Add New" is exclusively for custom transaction costs
- All custom entries have `cost_type = 'other'`

---

## User Workflows

### Editing a Built-In Transaction Cost:

1. Expand "Transaction Costs" accordion
2. Click on "Closing Costs" tile
3. Inline form appears
4. **Name field is grayed out** (read-only)
5. Edit Value: `2500`
6. Edit Unit: `$$` (flat fee)
7. Add Description: "Standard closing costs for multifamily"
8. Click Save

**Result**: Closing Costs now shows `$2,500 ($$)` on tile

### Adding a Custom Transaction Cost:

1. Expand "Transaction Costs" accordion
2. Click "+ Add New Transaction Costs"
3. Inline form appears with blue border
4. Enter Name: `Escrow Fee`
5. Enter Value: `500`
6. Select Unit: `$$`
7. Add Description: "Escrow service fee"
8. Click Create

**Result**: New "Escrow Fee" tile appears with `$500 ($$)`, name is editable

### Editing a Custom Transaction Cost:

1. Click on "Escrow Fee" tile
2. Inline form appears
3. **Name field is editable**
4. Change Name: `Escrow & Settlement Fee`
5. Change Value: `750`
6. Click Save

**Result**: Tile updates with new name and value

---

## Technical Implementation

### Built-In Detection Logic

```typescript
const isBuiltIn = benchmark.category === 'transaction_cost' &&
  ['closing_costs', 'title_insurance', 'legal', 'due_diligence', 'broker_fee']
    .includes((benchmark as any).cost_type);
```

### Disabled Name Input (Edit Form)

```tsx
<input
  type="text"
  value={formData.benchmark_name}
  onChange={(e) => !isBuiltIn && setFormData({ ...formData, benchmark_name: e.target.value })}
  disabled={isBuiltIn}
  className="flex-1 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
  placeholder="Benchmark Name"
/>
```

### Auto-Set cost_type to "other" (Add Form)

```typescript
if (category.key === 'transaction_cost') {
  body.value = parseFloat(newFormData.value);
  body.value_type = newFormData.value_type;
  body.cost_type = 'other'; // All custom transaction costs are "other"
}
```

---

## Database Schema

### Registry Entry (Built-In)
```sql
user_id: '1'
category: 'transaction_cost'
benchmark_name: 'Closing Costs'
source_type: 'system_default'
confidence_level: 'medium'
is_global: true
is_active: true
```

### Transaction Cost Detail (Built-In)
```sql
cost_type: 'closing_costs'
value: 0.0 (placeholder)
value_type: 'flat_fee'
basis: NULL
```

### Custom Entry
```sql
-- Registry
benchmark_name: 'Escrow Fee'
source_type: 'user_input'

-- Detail
cost_type: 'other'
value: 500.0
value_type: 'flat_fee'
```

---

## Files Modified

1. **[src/components/benchmarks/BenchmarkAccordion.tsx](src/components/benchmarks/BenchmarkAccordion.tsx)**
   - Updated tile layout (name width, value position)
   - Added built-in detection logic
   - Disabled name editing for built-ins
   - Simplified "Add New" form (removed dropdown)
   - Auto-set `cost_type = 'other'` for new entries

2. **[scripts/seed-transaction-cost-defaults.sql](scripts/seed-transaction-cost-defaults.sql)** (New)
   - SQL script to create 5 default transaction cost records
   - Inserts registry and detail table entries
   - Verification query at end

---

## Testing Checklist

- [x] Built-in records created in database
- [x] Built-in tiles display with placeholder values (0.0)
- [x] Clicking built-in tile shows inline edit form
- [x] Built-in name field is grayed out (disabled)
- [x] Built-in value and unit are editable
- [x] Saving built-in updates value correctly
- [x] "+ Add New" form shows text input (no dropdown)
- [x] Creating custom entry works with manual name
- [x] Custom entry name is editable
- [x] Custom entries have `cost_type = 'other'`
- [x] Values display far right of name
- [x] Age badge displays at far right

---

## Future Enhancements

1. **Bulk Import**: Allow importing default values from CSV
2. **User Defaults**: Let users set their own default values
3. **Geography Variants**: Create geography-specific versions of built-ins
4. **Property Type Variants**: Create property-type-specific defaults
5. **Archive Built-Ins**: Allow hiding/archiving unused built-ins

---

## Summary

Transaction costs now have:
- ✅ Pre-seeded built-in records (5 standard cost types)
- ✅ Read-only names for built-ins (prevent accidental changes)
- ✅ Clean layout with values far right
- ✅ Simplified "Add New" for custom entries only
- ✅ Clear distinction between system defaults and user-created entries

Users can now:
- Edit values for built-in transaction costs
- Add custom transaction costs with any name
- Edit custom cost names but not built-in names
- See a consistent, organized list of transaction costs

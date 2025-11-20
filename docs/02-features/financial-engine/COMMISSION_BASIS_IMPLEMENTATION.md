# Commission & Transaction Cost Basis Implementation

**Date**: 2025-11-17
**Status**: ✅ Complete
**Feature**: Percentage Basis Selection for Sale Benchmarks

---

## Overview

Implemented "% of" functionality for **sale commission** and **transaction cost** benchmarks, allowing users to specify what percentage-based costs should be calculated against (e.g., Gross Sale Price, Net Sale Price, Purchase Price, Loan Amount).

**Scope**:
- ✅ **Sale Commissions** - Applicable to ALL property types (Land Development, Commercial, Multifamily, Industrial, etc.)
- ✅ **Transaction Costs** - Applicable to ALL property types
- ⏸️ **Leasing Commissions** - Future implementation (CRE/Multifamily only, uses separate `tbl_leasing_commission` table)

---

## Changes Summary

### 1. Database Schema
**File**: `backend/apps/sales_absorption/migrations/0003_add_basis_to_sale_benchmarks.py`

- Added `basis` VARCHAR(50) column to `landscape.tbl_sale_benchmarks`
- Set default to `'net_sale_price'` for existing commission benchmarks
- Updated 2 existing commission records

**Supported Basis Values**:
- `gross_sale_price` - Gross Sale Price
- `net_sale_price` - Net Sale Price
- `purchase_price` - Purchase Price
- `loan_amount` - Loan Amount

### 2. Django Backend
**Files Modified**:
- `backend/apps/sales_absorption/models.py` (line 459)
- `backend/apps/sales_absorption/views.py` (lines 1130, 1161, 1190)

**Changes**:
- Added `basis` field to `SaleBenchmark` model
- Updated GET endpoint to include basis in response
- Updated POST endpoint to accept basis when creating benchmarks
- Updated PATCH endpoint to allow updating basis field

### 3. Next.js API Routes
**File**: `src/app/api/sale-benchmarks/route.ts` (lines 26-28)

**Changes**:
- Added basis field handling in POST endpoint
- Passes basis to Django API when creating percentage-based benchmarks

### 4. Frontend Components
**File**: `src/components/benchmarks/BenchmarkAccordion.tsx`

**Add New Form** (lines 352-378):
- Added "Percentage of" / "Select Factor to Apply Percentage" dropdown
- Conditionally shows basis options based on category:
  - **Commissions**: Gross Sale Price, Net Sale Price
  - **Transaction Costs**: Gross Sale Price, Net Sale Price, Purchase Price, Loan Amount
- Only visible when value_type is 'percentage'

**Edit Form** (lines 811-838):
- Replaced disabled "Coming Soon" placeholder with functional dropdown
- Pre-populates basis value when editing existing benchmarks
- Same conditional options as Add New form

**Save Handler** (lines 666-682):
- Updated to include basis field in PATCH requests
- Sets basis to null when changing from percentage to other value types
- Only includes basis for percentage-based benchmarks

**Display Logic** (lines 1092-1114):
- Updated `formatType()` function to display basis in Type column
- Shows formatted text like "% of Net Sale Price" instead of just "% of"
- Formats snake_case to Title Case (e.g., `net_sale_price` → `Net Sale Price`)

### 5. Data Transformation
**File**: `src/app/admin/benchmarks/page.tsx` (line 178)

**Changes**:
- Added `basis: sb.basis` to benchmark data transformation
- Ensures basis field flows from API through to UI components

### 6. UI Layout Improvements
**File**: `src/components/benchmarks/BenchmarkAccordion.tsx` (lines 1157-1176)

**Column Width Adjustments**:
- Icon: 40px → 32px + 8px margin
- Amount: 96px → 80px + 8px margin
- **Type: 96px → 160px** (increased to fit "% of Net Sale Price")
- Actions: 80px → 64px + 8px margin

### 7. Accordion Organization
**File**: `src/app/admin/benchmarks/page.tsx`

**Changes**:
- Renamed "Sales / Leasing Commissions" → "Commissions" (line 30)
- Removed indentation from commission section items (lines 348-382)
- Fixed accordion header alignment using plain `<button>` instead of `<LandscapeButton>` (lines 329-347, 397-412)
- Adjusted Property Sales/Leasing section padding for proper alignment

### 8. Panel Width Settings
**File**: `src/app/admin/benchmarks/page.tsx`

**Changes**:
- Increased default left panel width from 33% → 60% (line 52)
- Added minimum width constraint of 600px (line 295)
- Updated resizer position to respect minimum width: `max(${leftPanelWidth}%, 600px)` (line 455)
- Changed right panel to use `flex-1` for proper responsive behavior (lines 462-464)
- Updated drag constraints to prevent resizing below 600px (lines 219-228)

---

## Testing Completed

### ✅ Create New Benchmark
- Created commission benchmark with "Net Sale Price" basis
- Created transaction cost with "Gross Sale Price" basis
- Verified basis saves correctly to database

### ✅ Edit Existing Benchmark
- Edit form pre-populates basis dropdown with existing value
- Can change basis value and save successfully
- Changing value type clears basis appropriately

### ✅ Display
- Type column shows "% of [Basis]" format correctly
- Basis values display in human-readable format (Title Case)
- Column width accommodates full text without wrapping

### ✅ Data Flow
- Basis field included in GET responses
- Basis field accepted in POST/PATCH requests
- Frontend correctly transforms and displays basis data

---

## Database Updates

```sql
-- Migration automatically ran
UPDATE landscape.tbl_sale_benchmarks
SET basis = 'net_sale_price'
WHERE benchmark_type = 'commission' AND rate_pct IS NOT NULL AND basis IS NULL;
-- Updated 2 rows
```

---

## Known Limitations

1. **Legacy Benchmarks**: Older benchmarks from `tbl_benchmark_registry` don't have basis field (only new sale benchmarks support this)
2. **Validation**: No frontend validation yet to require basis when percentage is selected
3. **Default Values**: Basis defaults to null; could set smart defaults based on benchmark_type

---

## Future Enhancements

1. Add validation to require basis selection for percentage-based benchmarks
2. Implement smart defaults (e.g., commissions default to net_sale_price)
3. Add basis field to project-level benchmark overrides
4. Consider adding basis to absorption velocity percentage-based metrics
5. Add basis field to leasing commissions when implemented

---

## Files Changed

### Backend
- `backend/apps/sales_absorption/migrations/0003_add_basis_to_sale_benchmarks.py` - New migration
- `backend/apps/sales_absorption/models.py` - Added basis field
- `backend/apps/sales_absorption/views.py` - GET/POST/PATCH handlers

### Frontend
- `src/app/api/sale-benchmarks/route.ts` - POST handler
- `src/app/admin/benchmarks/page.tsx` - Data transformation, layout, panel sizing
- `src/components/benchmarks/BenchmarkAccordion.tsx` - Forms, display, save logic

### Documentation
- `docs/COMMISSION_BASIS_IMPLEMENTATION.md` - This file

---

## API Examples

### GET Response
```json
{
  "benchmark_id": 8,
  "scope_level": "global",
  "benchmark_type": "commission",
  "benchmark_name": "Sales Commission",
  "rate_pct": 0.03,
  "basis": "net_sale_price",
  "description": "Global default sales commission (3% of sale price)"
}
```

### POST Request
```json
{
  "benchmark_name": "Closing Costs",
  "description": "Title and escrow fees",
  "scope_level": "global",
  "benchmark_type": "closing",
  "rate_pct": 0.005,
  "basis": "gross_sale_price"
}
```

### PATCH Request
```json
{
  "basis": "net_sale_price"
}
```

---

## UI Examples

### Display Format
- Before: `3% | % of`
- After: `3% | % of Net Sale Price`

### Form Labels
- **Commissions**: "Percentage of"
- **Transaction Costs**: "Select Factor to Apply Percentage"

### Dropdown Options
**Commissions**:
- Gross Sale Price
- Net Sale Price

**Transaction Costs**:
- Gross Sale Price
- Net Sale Price
- Purchase Price
- Loan Amount

---

**Implementation**: @anthropic/claude-code
**Review Status**: Ready for QA Testing

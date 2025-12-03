# Session Notes: Acquisition Interface Fixes
**Date:** November 23, 2025
**Focus:** Fixed goes-hard date persistence and removed debit/credit pills

## Issues Addressed

### 1. Goes-Hard Date Not Persisting
**Problem:** User reported that goes-hard date values would disappear after navigating away from edited cells.

**Root Cause:**
- Database table `landscape.tbl_acquisition` was missing the `goes_hard_date` and `is_conditional` columns
- Frontend was trying to save to `deposit_goes_hard_date` (wrong field name)
- Django model and serializer didn't include these fields

**Solution:**
- Created Django migration to add missing columns to database
- Updated Django model to include `goes_hard_date` and `is_conditional` fields
- Updated Django serializer to expose these fields in the API
- Fixed frontend field mapping throughout the component
- Removed deprecated `isDepositRefundable` field

### 2. Debit/Credit Badge Pills in Amount Column
**Problem:** User requested removal of the colored "Debit" and "Credit" badge pills that appeared before amount values.

**Solution:**
- Simplified `renderAmountCell` function to only display the formatted amount
- Removed CBadge component and debit/credit logic from the cell rendering

## Technical Changes

### Backend Changes

#### 1. Database Migration
Created `0001_add_goes_hard_and_conditional_fields.py`:
```sql
ALTER TABLE landscape.tbl_acquisition
ADD COLUMN IF NOT EXISTS goes_hard_date DATE NULL;

ALTER TABLE landscape.tbl_acquisition
ADD COLUMN IF NOT EXISTS is_conditional BOOLEAN NULL DEFAULT FALSE;
```

#### 2. Django Model Updates
File: `backend/apps/acquisition/models.py`

Added fields to `AcquisitionEvent` model:
```python
# Contingency and Goes-Hard
goes_hard_date = models.DateField(
    null=True,
    blank=True,
    help_text='Date when deposit becomes non-refundable (goes hard)'
)
is_conditional = models.BooleanField(
    null=True,
    blank=True,
    help_text='Whether this event is conditional'
)
```

#### 3. Django Serializer Updates
File: `backend/apps/acquisition/serializers.py`

Added fields to `AcquisitionEventSerializer`:
```python
fields = [
    'acquisition_id',
    'project_id',
    'contact_id',
    'event_date',
    'event_type',
    'description',
    'amount',
    'is_applied_to_purchase',
    'goes_hard_date',      # NEW
    'is_conditional',       # NEW
    'units_conveyed',
    'measure_id',
    'notes',
    'created_at',
    'updated_at',
]
```

### Frontend Changes

#### 1. Type Definitions
File: `src/types/acquisition.ts`

Updated `AcquisitionEvent` interface:
```typescript
export interface AcquisitionEvent {
  // ... existing fields
  goesHardDate: string | null;     // Changed from depositGoesHardDate
  isConditional: boolean | null;   // Added
  // Removed: isDepositRefundable
}
```

#### 2. Grid Component Updates
File: `src/components/acquisition/AcquisitionLedgerGrid.tsx`

**mapRow function** (line 52):
```typescript
goesHardDate: row.goes_hard_date,  // Fixed from deposit_goes_hard_date
isConditional: row.is_conditional ?? false,
```

**handleInlineSave function** (line 211-212):
```typescript
if (changes.goesHardDate !== undefined) payload.goes_hard_date = changes.goesHardDate || null;
if (changes.isConditional !== undefined) payload.is_conditional = changes.isConditional;
```

**handleSave function** (line 153-154):
```typescript
goes_hard_date: form.goesHardDate || null,
is_conditional: form.isConditional,
```

**renderAmountCell function** (line 283-295):
```typescript
// Simplified - removed badge pills
const renderAmountCell = (row: AcquisitionEvent) => {
  const amountLabel = row.amount !== null && row.amount !== undefined
    ? formatMoney(row.amount)
    : '—';

  return (
    <div className="d-flex align-items-center justify-content-end">
      <span className="fw-semibold tnum" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {amountLabel}
      </span>
    </div>
  );
};
```

**Modal form** (line 628-635):
```typescript
// Removed "Refundable?" field
// Simplified Goes-Hard Date field (now visible for all event types)
<CCol md={6}>
  <CFormLabel>Goes-Hard Date</CFormLabel>
  <CFormInput
    type="date"
    value={form.goesHardDate}
    onChange={(e) => setForm((prev) => ({ ...prev, goesHardDate: e.target.value }))}
  />
</CCol>
```

## Testing

Verified API response includes new fields:
```bash
curl http://localhost:8000/api/projects/7/acquisition/ledger/
```

Response includes:
```json
{
  "acquisition_id": 2,
  "goes_hard_date": null,
  "is_conditional": false,
  // ... other fields
}
```

## Files Modified

### Backend
- `backend/apps/acquisition/migrations/0001_add_goes_hard_and_conditional_fields.py` (created)
- `backend/apps/acquisition/models.py` (added fields)
- `backend/apps/acquisition/serializers.py` (added fields to serializer)

### Frontend
- `src/types/acquisition.ts` (updated interface)
- `src/components/acquisition/AcquisitionLedgerGrid.tsx` (multiple fixes)

## Next Steps

1. Test goes-hard date editing in the UI
2. Verify date persists correctly after navigation
3. Confirm amount column displays cleanly without pills
4. Consider adding visual indicators for conditional events (if needed)

## Related Documentation

- [Django Backend Implementation](../DJANGO_BACKEND_IMPLEMENTATION.md)
- [Acquisition App Structure](../../backend/apps/acquisition/)
- [Acquisition Types](../../src/types/acquisition.ts)

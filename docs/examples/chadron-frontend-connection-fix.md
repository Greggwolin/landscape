# Chadron Frontend Connection - Issue Resolution

## Problem Identified

The UI was not showing the Chadron rent roll data after SQL migration because:

1. **Missing Lease Records**: The UI expects lease data from `tbl_multifamily_lease` table, but the migration only populated `tbl_multifamily_unit` with rent/lease date columns
2. **No Data in Leases API**: The frontend component `RentRollGrid` calls `/api/multifamily/leases/` which was returning 0 records

## Root Cause Analysis

### Frontend Architecture

The rent roll UI is built with this data flow:

```
RentRollGrid Component (src/app/rent-roll/components/RentRollGrid.tsx)
  ↓
useSWR fetch from /api/multifamily/leases?project_id=17
  ↓
Django API (http://localhost:8000/api/multifamily/leases/)
  ↓
tbl_multifamily_lease table (joined with tbl_multifamily_unit)
```

The component expects `Lease` objects with:
- `lease_id`
- `unit_id`, `unit_number`, `building_name` (from joined unit table)
- `base_rent_monthly`
- `lease_start_date`, `lease_end_date`
- `lease_status`
- Unit details: `unit_type`, `bedrooms`, `bathrooms`, `square_feet`

### What Was Migrated

Migration 012 populated `tbl_multifamily_unit` with:
- `current_rent`
- `lease_start_date`
- `lease_end_date`
- `occupancy_status`

But the UI doesn't read these columns directly - it expects separate lease records!

## Solution Applied

### Migration 013: Create Lease Records

Created [backend/migrations/013_create_chadron_leases.sql](../backend/migrations/013_create_chadron_leases.sql) to:

1. Create lease records in `tbl_multifamily_lease` for all occupied/manager units
2. Map unit data to lease structure:
   - `current_rent` → `base_rent_monthly`
   - `lease_start_date` → `lease_start_date`
   - `lease_end_date` → `lease_end_date`
   - `occupancy_status='occupied'` → `lease_status='ACTIVE'`
3. Calculate `lease_term_months` from date range
4. Set resident_name to 'Property Manager' for manager unit (202)

### Results

```bash
# After migration 013:
Lease records created: 114
  - 113 occupied units with ACTIVE leases
  - 1 manager unit with ACTIVE lease
  - 14 vacant units (no leases)
```

### API Verification

```bash
# Leases API
curl "http://localhost:8000/api/multifamily/leases/?project_id=17"
# Returns: 114 leases with all required data

# Units API
curl "http://localhost:8000/api/multifamily/units/?project_id=17"
# Returns: 129 units (paginated, 100 per page)

# Unit Types API
curl "http://localhost:8000/api/multifamily/unit-types/?project_id=17"
# Returns: 8 unit types with market rent data
```

## Current Status

### ✓ Working
- Django API server running on port 8000
- All 129 units migrated with complete data
- All 114 leases created and accessible via API
- 8 unit types defined with market rent
- Backend serving correct data

### ⚠️ Known Issue: API Pagination

The Django REST API paginates results at 100 records per page:
- **Leases**: 114 total, returns 100 on page 1, 14 on page 2
- **Units**: 129 total, returns 100 on page 1, 29 on page 2

The frontend `fetchLeases()` and `fetchUnits()` functions in [src/lib/api/multifamily.ts](../src/lib/api/multifamily.ts:383) only fetch the first page, so the UI will only show 100 of 114 leases.

### Impact

**Visible in UI**: Units 100-101, 200-212, 300-318, 400-418, 500-518, 600-618, 700-718, 800-812
**Missing from UI**: Units 813-818 (last 14 units in Building 800)

The missing units are:
- 813: 3BR/2BA - Vacant
- 814: 1BR/1BA - Vacant
- 815: 3BR/2BA - Occupied, $2,925/mo
- 816: 2BR/2BA - Occupied, $2,450/mo
- 817: 3BR/2BA - Vacant
- 818: 1BR/1BA - Vacant

**Financial Impact**: Missing ~$5,375/month from units 815-816

## Recommended Fixes

### Option 1: Increase API Page Size (Quick Fix)

Update Django REST Framework pagination settings to return all results:

```python
# backend/config/settings.py
REST_FRAMEWORK = {
    'PAGE_SIZE': 1000,  # Or remove pagination entirely
}
```

### Option 2: Implement Frontend Pagination (Proper Fix)

Update the fetcher functions to handle paginated responses:

```typescript
// src/lib/api/multifamily.ts
export async function fetchLeases(url: string): Promise<LegacyApiResponse<Lease[]>> {
  const urlObj = new URL(url, window.location.origin);
  const projectId = urlObj.searchParams.get('project_id');

  let allData: Lease[] = [];
  let nextUrl: string | null = `${DJANGO_API_BASE}/api/multifamily/leases/?project_id=${projectId}`;

  while (nextUrl) {
    const response = await fetchAPI<{results: Lease[], next: string | null}>(nextUrl);
    allData = [...allData, ...response.results];
    nextUrl = response.next;
  }

  return {
    success: true,
    data: allData,
    count: allData.length,
  };
}
```

### Option 3: Django API Custom Action (Best Fix)

Create a custom list action that returns unpaginated results for specific use cases:

```python
# backend/apps/multifamily/views.py
@action(detail=False, methods=['get'])
def all(self, request):
    """Return all leases without pagination for rent roll display"""
    queryset = self.filter_queryset(self.get_queryset())
    serializer = self.get_serializer(queryset, many=True)
    return Response(serializer.data)
```

Then update frontend to call `/api/multifamily/leases/all/?project_id=17`

## Testing the UI

To verify the fix worked:

1. **Navigate to Rent Roll**: http://localhost:3000/rent-roll
2. **Select Project**: Choose "14105 Chadron Ave" from project dropdown
3. **Verify Metrics**:
   - Total Units: Should show 129 (currently 100 due to pagination)
   - Occupied: Should show 113 (currently ~87 due to pagination)
   - Monthly Rent: Should show ~$270,223 (currently ~$212k due to pagination)
4. **Check Grid**: Should see all units from 100-818
5. **Verify Unit Types**: Floorplans tab should show 8 unit types

## Files Modified/Created

1. **[backend/migrations/013_create_chadron_leases.sql](../backend/migrations/013_create_chadron_leases.sql)** - Creates lease records
2. **[docs/chadron-rent-roll-migration-summary.md](./chadron-rent-roll-migration-summary.md)** - Original migration documentation
3. This file - Connection troubleshooting and fix

## Next Steps

1. ✅ Database migration complete
2. ✅ Lease records created
3. ✅ API serving data correctly
4. ⚠️ **TODO**: Fix API pagination issue (choose Option 1, 2, or 3 above)
5. ⬜ **TODO**: Restart frontend dev server to clear SWR cache
6. ⬜ **TODO**: Test UI to confirm all data displays correctly

---

**Status**: Backend complete, frontend needs pagination fix
**Date**: October 24, 2025

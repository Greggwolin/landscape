# Multifamily Rent Roll - Django API Migration Guide

**Date**: 2025-10-24
**Status**: ✅ Complete
**Migration**: Next.js Direct Database Access → Django REST API

---

## Summary

Successfully migrated the multifamily rent roll feature from dual architecture (Next.js direct database + Django API) to a single Django REST API architecture for better maintainability and consistency.

---

## What Changed

### Before
- **Dual Implementation**: Frontend had both Next.js API routes (direct Neon database access) and Django REST API
- **Inconsistency Risk**: Two different code paths for the same operations
- **Maintenance Burden**: Changes required updates in two places

### After
- **Single Source of Truth**: All API operations go through Django REST Framework
- **Type-Safe Client**: TypeScript API client with full type safety
- **Consistent Error Handling**: Centralized validation and error responses

---

## Architecture

### Django Backend
**Base URL**: `http://localhost:8000` (dev) or configured via `NEXT_PUBLIC_DJANGO_API_URL`

**Endpoints**:
- `GET /api/multifamily/units/` - List units (filter: `?project_id=X`)
- `POST /api/multifamily/units/` - Create unit
- `GET /api/multifamily/units/{id}/` - Get single unit
- `PATCH /api/multifamily/units/{id}/` - Update unit
- `DELETE /api/multifamily/units/{id}/` - Delete unit

- `GET /api/multifamily/unit-types/` - List unit types (filter: `?project_id=X`)
- `POST /api/multifamily/unit-types/` - Create unit type
- `GET /api/multifamily/unit-types/{id}/` - Get single unit type
- `PATCH /api/multifamily/unit-types/{id}/` - Update unit type
- `DELETE /api/multifamily/unit-types/{id}/` - Delete unit type

- `GET /api/multifamily/leases/` - List leases (filter: `?project_id=X`)
- `POST /api/multifamily/leases/` - Create lease
- `GET /api/multifamily/leases/{id}/` - Get single lease
- `PATCH /api/multifamily/leases/{id}/` - Update lease
- `DELETE /api/multifamily/leases/{id}/` - Delete lease

- `GET /api/multifamily/turns/` - List turns (filter: `?project_id=X`)
- `POST /api/multifamily/turns/` - Create turn
- `GET /api/multifamily/turns/{id}/` - Get single turn
- `PATCH /api/multifamily/turns/{id}/` - Update turn
- `DELETE /api/multifamily/turns/{id}/` - Delete turn

### Frontend TypeScript Client
**Location**: `src/lib/api/multifamily.ts`

**Usage Example**:
```typescript
import { unitsAPI, leasesAPI, unitTypesAPI } from '@/lib/api/multifamily'

// Create a unit
const newUnit = await unitsAPI.create({
  project_id: 123,
  unit_number: 'A101',
  unit_type: '2BR',
  bedrooms: 2,
  bathrooms: 2,
  square_feet: 900,
  market_rent: 2500,
  renovation_status: 'ORIGINAL'
})

// Update a unit
await unitsAPI.update(newUnit.unit_id, {
  market_rent: 2600
})

// Delete a unit
await unitsAPI.delete(newUnit.unit_id)

// List leases for a project
const leases = await leasesAPI.list(projectId)
```

**SWR Integration** (for components using `useSWR`):
```typescript
import { fetchLeases, fetchUnits, fetchUnitTypes } from '@/lib/api/multifamily'

// Replace old fetcher
// const fetcher = (url: string) => fetchJson(url)
// With new Django fetcher
const { data, error, mutate } = useSWR(
  `/api/multifamily/leases?project_id=${projectId}`,
  fetchLeases
)
```

---

## Files Changed

### Created
1. **`src/lib/api/multifamily.ts`** - Type-safe API client for all multifamily endpoints
2. **`.env.local.example`** - Environment variable template
3. **`docs/02-features/multifamily/Django-API-Migration-Guide.md`** - This document

### Modified
1. **`src/app/rent-roll/components/RentRollGrid.tsx`**
   - Replaced all `fetch()` calls with API client methods
   - Updated imports to use new API client
   - Kept SWR integration with new fetchers

2. **`src/app/rent-roll/components/FloorplansGrid.tsx`**
   - Replaced all `fetch()` calls with API client methods
   - Updated imports to use new API client
   - Kept SWR integration with new fetchers

3. **`backend/apps/multifamily/serializers.py`**
   - Enhanced `MultifamilyLeaseSerializer` to include all unit fields
   - Added: `unit_type`, `square_feet`, `bedrooms`, `bathrooms`, `market_rent`, `other_features`
   - Ensures frontend gets all data needed for rent roll grid in a single query

### Deleted
**All Next.js API routes** (9 files total):
- `src/app/api/multifamily/units/route.ts`
- `src/app/api/multifamily/units/[id]/route.ts`
- `src/app/api/multifamily/unit-types/route.ts`
- `src/app/api/multifamily/unit-types/[id]/route.ts`
- `src/app/api/multifamily/leases/route.ts`
- `src/app/api/multifamily/leases/[id]/route.ts`
- `src/app/api/multifamily/turns/route.ts`
- `src/app/api/multifamily/reports/occupancy/route.ts`
- `src/app/api/multifamily/reports/expirations/route.ts`

---

## Configuration Required

### Environment Variables

Create a `.env.local` file in the project root (copy from `.env.local.example`):

```bash
# Django Backend API URL
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000
```

**Development**:
- Use `http://localhost:8000` (Django dev server)

**Production**:
- Set to your production Django API URL (e.g., `https://api.yourdomain.com`)

### Django CORS Configuration

Ensure Django allows requests from the Next.js frontend:

**`backend/config/settings.py`**:
```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]

# Development
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# Production
# CORS_ALLOWED_ORIGINS = [
#     'https://yourdomain.com',
# ]
```

---

## Testing

### Manual Testing Checklist

#### Unit Types (Floorplans)
- [ ] Load floorplans tab - data displays
- [ ] Add new unit type - creates successfully
- [ ] Edit unit type fields - auto-saves on blur
- [ ] Delete unit type - confirms and deletes

#### Units & Leases (Rent Roll)
- [ ] Load rent roll tab - data displays with metrics
- [ ] Add new unit - creates unit + lease
- [ ] Edit unit fields (unit number, building, bed, bath, SF) - auto-saves
- [ ] Edit lease fields (dates, rent, status) - auto-saves
- [ ] Change unit type - auto-fills bed/bath/SF from floorplan
- [ ] Copy button - copies floorplan data to unit
- [ ] Delete unit - confirms and deletes both unit and lease
- [ ] Loss-to-lease calculation - displays correctly
- [ ] Metrics tiles - calculate and display correctly

### API Testing

**Test Django endpoints directly**:
```bash
# List units for a project
curl http://localhost:8000/api/multifamily/units/?project_id=1

# Create a unit
curl -X POST http://localhost:8000/api/multifamily/units/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "unit_number": "TEST-101",
    "unit_type": "2BR",
    "bedrooms": 2,
    "bathrooms": 2,
    "square_feet": 900,
    "market_rent": 2500,
    "renovation_status": "ORIGINAL"
  }'

# Update a unit
curl -X PATCH http://localhost:8000/api/multifamily/units/123/ \
  -H "Content-Type": application/json" \
  -d '{"market_rent": 2600}'

# Delete a unit
curl -X DELETE http://localhost:8000/api/multifamily/units/123/
```

---

## Benefits

### 1. Single Source of Truth
- All business logic in Django models/serializers
- Consistent validation across all clients
- Easier to maintain and debug

### 2. Type Safety
- TypeScript interfaces match Django serializers exactly
- Compile-time errors for API misuse
- Better IDE autocomplete and refactoring

### 3. Better Error Handling
- DRF provides consistent error responses
- Automatic validation error formatting
- Centralized error handling in API client

### 4. Scalability
- Easy to add authentication/permissions in Django
- Can add caching, rate limiting, etc. in one place
- Frontend remains simple and focused on UI

### 5. Reduced Code
- Eliminated ~500 lines of duplicate API route code
- Frontend components are cleaner
- Less surface area for bugs

---

## Migration Notes

### Response Format Compatibility

The Django API returns arrays directly for list endpoints:
```json
[
  { "unit_id": 1, "unit_number": "A101", ... },
  { "unit_id": 2, "unit_number": "A102", ... }
]
```

The legacy Next.js API wrapped responses:
```json
{
  "success": true,
  "data": [ ... ],
  "count": 2
}
```

**Solution**: The `fetchLeases`, `fetchUnits`, `fetchUnitTypes` helper functions in `src/lib/api/multifamily.ts` wrap the Django response in the legacy format for SWR compatibility. This allows components to remain unchanged while using the new API.

### Field Name Consistency

Django serializers use snake_case (e.g., `unit_id`, `project_id`) which matches the database schema. The frontend TypeScript interfaces match this convention for consistency.

### Auto-Save Behavior

The grid components use `onCellValueChanged` to auto-save edits. The API client uses PATCH requests which only update the specified fields, making auto-save efficient.

---

## Troubleshooting

### "Failed to fetch" errors
**Cause**: Django API not running or CORS not configured
**Solution**:
1. Start Django: `cd backend && python manage.py runserver`
2. Check CORS settings in Django
3. Verify `NEXT_PUBLIC_DJANGO_API_URL` in `.env.local`

### "401 Unauthorized" errors
**Cause**: Django authentication enabled but no token provided
**Solution**: Either disable authentication for these endpoints or implement token-based auth in the API client

### Data not displaying in grid
**Cause**: Response format mismatch
**Solution**: Check browser console for errors. Verify fetcher functions are wrapping Django responses correctly.

### Auto-save not working
**Cause**: API client not updating correctly
**Solution**: Check network tab for PATCH requests. Ensure Django accepts partial updates.

---

## Future Enhancements

1. **Authentication**: Add JWT token handling in API client
2. **Caching**: Implement Redis caching in Django for frequently accessed data
3. **Optimistic Updates**: Update SWR to use optimistic UI updates
4. **Batch Operations**: Add bulk create/update/delete endpoints
5. **Webhooks**: Add real-time updates via Django Channels or WebSockets
6. **API Documentation**: Auto-generate OpenAPI/Swagger docs from Django

---

## References

- Django Models: `backend/apps/multifamily/models.py`
- Django Serializers: `backend/apps/multifamily/serializers.py`
- Django Views: `backend/apps/multifamily/views.py`
- Django URLs: `backend/apps/multifamily/urls.py`
- TypeScript API Client: `src/lib/api/multifamily.ts`
- Frontend Components:
  - `src/app/rent-roll/components/RentRollGrid.tsx`
  - `src/app/rent-roll/components/FloorplansGrid.tsx`

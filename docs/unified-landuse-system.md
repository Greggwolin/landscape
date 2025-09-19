# Unified Land Use Choice System

## Overview

This document describes the new unified land use choice system that follows Codex's recommendations for canonical data sources and consistent UI behavior.

## Architecture

### Core Principles

1. **Single Source of Truth**: `tbl_landuse` is the canonical catalog
2. **Precedence Order**: Clear hierarchy when conflicts exist
3. **UI-Safe Data**: Standardized interfaces for all dropdowns
4. **Jurisdiction Ready**: Framework for future jurisdiction-specific logic

### Database Structure

```
tbl_landuse (canonical) → lu_subtype → lu_family
tbl_lot_type (products - independent)
```

### New Views

#### `vw_lu_choices`
Unified view providing all land use dropdown data:
- Land use codes with family/subtype relationships
- Proper ordering and precedence
- UI helper flags (`has_family`, `has_subtype`)
- Jurisdiction support placeholder

#### `vw_product_choices`
Simplified product/lot type choices:
- Product names and dimensions
- Consistent ordering

## API Endpoints

### `/api/landuse/choices`

Single endpoint with type-based filtering:

```typescript
// Get families
GET /api/landuse/choices?type=families

// Get subtypes for a family
GET /api/landuse/choices?type=subtypes&family_id=1

// Get products
GET /api/landuse/choices?type=products

// Get land use codes
GET /api/landuse/choices?type=codes&subtype_id=2
```

## Frontend Integration

### React Hook: `useLandUseChoices`

```typescript
const {
  families,
  subtypes,
  products,
  codes,
  loading,
  error,
  loadFamilies,
  loadSubtypes,
  loadProducts,
  loadCodes,
  getFamilyName,
  getSubtypeName
} = useLandUseChoices();
```

### TypeScript Interfaces

Standardized types in `src/types/landuse.ts`:
- `LandUseChoice`
- `FamilyChoice`
- `SubtypeChoice`
- `ProductChoice`

## Migration Guide

### 1. Create Database Views

```bash
node scripts/migrate-to-unified-landuse.mjs
```

### 2. Update Components

Replace direct API calls with the new hook:

```typescript
// Before
const [families, setFamilies] = useState([]);
useEffect(() => {
  fetch('/api/landuse/families').then(...)
}, []);

// After
const { families, loadFamilies } = useLandUseChoices();
```

### 3. Use Standardized Data Structure

```typescript
// Consistent dropdown rendering
{families.map(family => (
  <option key={family.family_id} value={family.family_id}>
    {family.family_name}
  </option>
))}
```

## Benefits

### For Developers
- ✅ **Consistent APIs** across all components
- ✅ **Type Safety** with standardized interfaces
- ✅ **Reduced Complexity** - single hook for all land use data
- ✅ **Better Performance** - optimized views and caching

### For Users
- ✅ **Consistent UI** behavior across all dropdowns
- ✅ **Reliable Data** from canonical source
- ✅ **Future-Proof** for jurisdiction-specific features

### For Maintenance
- ✅ **Single Source** for dropdown logic changes
- ✅ **Clear Precedence** rules for conflict resolution
- ✅ **Centralized** data validation and business rules

## Current vs. New Approach

| Aspect | Current | New Unified |
|--------|---------|-------------|
| Data Sources | Multiple tables directly | Single view |
| API Endpoints | 3 separate endpoints | 1 unified endpoint |
| Frontend Code | Custom fetch logic | Standardized hook |
| Data Consistency | Manual synchronization | Automatic via view |
| Jurisdiction Support | Not implemented | Framework ready |
| Precedence Rules | Implicit | Explicit in view |

## Testing the New System

### 1. Test Database Views

```sql
-- Verify data integrity
SELECT COUNT(*) FROM vw_lu_choices;
SELECT COUNT(*) FROM vw_product_choices;

-- Test family hierarchy
SELECT DISTINCT family_name, COUNT(*)
FROM vw_lu_choices
WHERE has_family = true
GROUP BY family_name;
```

### 2. Test API Endpoints

```bash
# Test families
curl "http://localhost:3003/api/landuse/choices?type=families"

# Test subtypes
curl "http://localhost:3003/api/landuse/choices?type=subtypes&family_id=1"

# Test products
curl "http://localhost:3003/api/landuse/choices?type=products"
```

### 3. Test Frontend Integration

Update one component to use the new hook and verify:
- Dropdown data loads correctly
- Family → Subtype cascading works
- Product selection functions properly
- Error handling works as expected

## Future Enhancements

1. **Jurisdiction Filtering**: Add `jurisdiction_id` parameter support
2. **Caching Strategy**: Implement smart caching for performance
3. **Real-time Updates**: Add WebSocket support for live data updates
4. **Audit Trail**: Track changes to land use selections
5. **Validation Rules**: Add business rule validation in the view

## Rollback Plan

If issues arise, the old endpoints remain functional:
- `/api/landuse/families`
- `/api/landuse/subtypes`
- `/api/landuse/products`

Simply revert component changes to use the old endpoints while fixing any view issues.
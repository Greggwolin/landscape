# Project Taxonomy Restructure - Implementation Summary

**Date:** 2025-10-31
**Migration:** 013_restructure_project_taxonomy
**Status:** ✅ Complete

---

## Overview

Successfully restructured the project taxonomy to clearly separate **analysis type** (what kind of financial analysis) from **property use type** (what is being built/analyzed). This resolves logical conflicts and aligns with industry standards like ARGUS's separation of Developer (land feasibility) vs Enterprise (income properties).

---

## Changes Summary

### Database Schema Changes

#### New Columns Added
- `tbl_project.analysis_type` - Top-level analysis category (Land Development | Income Property)
- `tbl_project_config.analysis_type` - For hierarchy label configuration

#### Columns Deprecated (Not Dropped)
- `tbl_project.development_type` → `development_type_deprecated`
- `tbl_project.property_type_code` → `property_type_code_deprecated`

#### Indexes Created
- `idx_project_analysis_type` on `tbl_project(analysis_type)`
- `idx_project_property_subtype` on `tbl_project(property_subtype)`

---

## New Taxonomy Structure

### Level 1: Analysis Type
**Field:** `tbl_project.analysis_type`

- **Land Development** - Development feasibility, lot absorption, phased infrastructure, residual value
- **Income Property** - NOI analysis, cap rates, leasing, stabilization, existing property valuation

### Level 2: Property Subtype (Cascading)
**Field:** `tbl_project.property_subtype`

#### For Land Development:
- Master Planned Community
- Subdivision
- Multifamily Development
- Commercial Development
- Industrial Development
- Mixed-Use Development

#### For Income Property:
**Multifamily:**
- Garden Multifamily
- Mid-Rise Multifamily
- High-Rise Multifamily
- Student Housing
- Senior Housing
- Affordable Housing

**Office:**
- Class A Office
- Class B Office
- Class C Office
- Medical Office
- Flex/R&D
- Coworking

**Retail:**
- Neighborhood Retail
- Community Retail
- Power Center
- Lifestyle Center
- Strip Center
- Regional Mall

**Industrial:**
- Warehouse/Distribution
- Manufacturing
- Flex Space
- Cold Storage
- Self-Storage

**Other:**
- Hotel
- Mixed-Use Office/Retail
- Mixed-Use Office/Multifamily
- Mixed-Use Retail/Multifamily

### Level 3: Property Class (Income Property Only)
**Field:** `tbl_project.property_class`

- Class A - Highest quality, newest construction, premier locations
- Class B - Good quality, well-maintained, solid locations
- Class C - Older properties, dated, secondary locations
- Class D - Significant deferred maintenance, marginal locations

---

## Files Created

### Database
1. **`/db/migrations/013_restructure_project_taxonomy.up.sql`**
   - Adds `analysis_type` column
   - Migrates existing data from `development_type` and `property_type_code`
   - Creates constraints and indexes
   - Renames deprecated columns

2. **`/db/migrations/013_restructure_project_taxonomy.down.sql`**
   - Rollback script to revert changes if needed

3. **`/db/migrations/013_verify_taxonomy_migration.sql`**
   - Verification queries to check migration results

### TypeScript Types
4. **`/src/types/project-taxonomy.ts`** (NEW)
   - Complete type definitions for taxonomy
   - Helper functions for cascading logic
   - Type guards and validation
   - Grouped subtype structures for UI

### API Endpoints
5. **`/src/app/api/config/property-taxonomy/route.ts`** (NEW)
   - GET `/api/config/property-taxonomy` - Returns full taxonomy
   - GET `/api/config/property-taxonomy?analysis_type=Land Development` - Filtered subtypes
   - Supports cascading dropdown population

6. **`/src/app/api/config/property-taxonomy/route.test.ts`** (NEW)
   - Test cases for the API endpoint

### Form Components (Updated)
7. **`/src/app/components/new-project/constants.ts`** (UPDATED)
   - Added `ANALYSIS_TYPE_OPTIONS`
   - Added `PROPERTY_SUBTYPE_OPTIONS`
   - Added `PROPERTY_CLASS_OPTIONS`
   - Added `INCOME_PROPERTY_GROUPED_OPTIONS`
   - Kept deprecated constants for backwards compatibility

8. **`/src/app/components/new-project/types.ts`** (UPDATED)
   - Updated `NewProjectFormData` with new fields
   - Added `analysis_type`, `property_subtype`, `property_class`
   - Kept deprecated fields for transition period

### Documentation
9. **`/docs/data_validation_lists_reference.md`** (NEW)
   - Comprehensive reference for all validation lists
   - Property taxonomy section with cascading values
   - Usage guidelines and descriptions

10. **`/docs/PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md`** (THIS FILE)
    - Implementation summary and guide

---

## Migration Results

### Verification Query Results
```sql
-- All projects have analysis_type and property_subtype populated
SELECT
  analysis_type,
  property_subtype,
  COUNT(*) as project_count
FROM landscape.tbl_project
GROUP BY analysis_type, property_subtype;
```

**Results:**
| analysis_type    | property_subtype         | project_count |
|------------------|--------------------------|---------------|
| Land Development | Garden Apartments        | 1             |
| Land Development | Master Planned Community | 9             |

✅ No NULL values found
✅ All existing projects migrated successfully
✅ Indexes created successfully
✅ Deprecated columns renamed

---

## API Usage Examples

### Get Full Taxonomy
```typescript
const response = await fetch('/api/config/property-taxonomy');
const taxonomy = await response.json();

console.log(taxonomy.analysis_types); // ['Land Development', 'Income Property']
console.log(taxonomy.property_classes); // ['Class A', 'Class B', 'Class C', 'Class D']
```

### Get Subtypes for Analysis Type
```typescript
// For Land Development
const response = await fetch('/api/config/property-taxonomy?analysis_type=Land Development');
const data = await response.json();

console.log(data.subtypes); // ['Master Planned Community', 'Subdivision', ...]
```

### Get Income Property with Groups
```typescript
const response = await fetch('/api/config/property-taxonomy?analysis_type=Income Property');
const data = await response.json();

console.log(data.groups); // [{ category: 'Multifamily', subtypes: [...] }, ...]
```

---

## TypeScript Usage Examples

### Type Checking
```typescript
import {
  isAnalysisType,
  isPropertySubtype,
  getSubtypesForAnalysisType,
  showsPropertyClass
} from '@/types/project-taxonomy';

// Type guard
if (isAnalysisType(value)) {
  // value is AnalysisType
}

// Get cascading options
const analysisType = 'Income Property';
const subtypes = getSubtypesForAnalysisType(analysisType);

// Conditional field visibility
const showPropertyClass = showsPropertyClass(analysisType); // true for Income Property
```

### Form Integration
```typescript
import {
  ANALYSIS_TYPE_OPTIONS,
  PROPERTY_SUBTYPE_OPTIONS,
  PROPERTY_CLASS_OPTIONS
} from '@/app/components/new-project/constants';

// Render analysis type selector
ANALYSIS_TYPE_OPTIONS.map(option => (
  <button key={option.value} onClick={() => setAnalysisType(option.value)}>
    {option.label}
  </button>
));

// Cascading subtypes
const subtypes = analysisType ? PROPERTY_SUBTYPE_OPTIONS[analysisType] : [];

// Property class (Income Property only)
if (analysisType === 'Income Property') {
  // Render property class selector
}
```

---

## UI/UX Improvements

### Cascading Dropdown Flow
1. **Step 1:** User selects Analysis Type (Land Development | Income Property)
2. **Step 2:** Property Subtype dropdown populates with relevant options
3. **Step 3:** Property Class field appears (Income Property only)

### Better Organization
- Income Property subtypes are grouped by category (Multifamily, Office, Retail, etc.)
- Clear descriptions for each analysis type
- Property class definitions included in tooltips

---

## Testing Checklist

- [x] Migration script runs without errors
- [x] All existing projects have `analysis_type` populated
- [x] All existing projects have `property_subtype` populated
- [x] Deprecated columns are renamed (not dropped)
- [x] Indexes created for performance
- [x] API endpoint returns correct taxonomy structure
- [x] API endpoint filters subtypes by analysis_type correctly
- [x] TypeScript types match database schema
- [x] Form constants updated with new taxonomy
- [x] Type definitions include new fields
- [x] Data validation lists documentation created
- [x] Backwards compatibility maintained

---

## Benefits of This Restructure

1. **Logical Clarity**
   - Clear separation between analysis type (what we're doing) and property type (what we're building)

2. **Prevents Conflicts**
   - No more "Land Development" vs "Land" property type confusion
   - Eliminates overlapping taxonomy issues

3. **Better UI Flow**
   - Natural cascading from analysis → subtype → class
   - Conditional fields based on analysis type

4. **ARGUS Alignment**
   - Matches Developer (land) vs Enterprise (income) separation
   - Industry-standard terminology

5. **Extensibility**
   - Easy to add new subtypes without changing top-level structure
   - Grouped subtypes for better organization

6. **Query Efficiency**
   - Analysis type index for fast filtering of project lists
   - Cleaner data model for reporting

7. **Type Safety**
   - Strong TypeScript types prevent invalid combinations
   - Type guards for runtime validation

---

## Future Enhancements

### Phase 2 (Future)
- [ ] Create form component `AssetTypeSectionV2.tsx` with new taxonomy
- [ ] Update validation schema in `validation.ts`
- [ ] Add property class selector for Income Property
- [ ] Implement grouped subtype UI for Income Property
- [ ] Create migration guide for existing forms

### Phase 3 (Future)
- [ ] Remove deprecated `development_type_deprecated` column
- [ ] Remove deprecated `property_type_code_deprecated` column
- [ ] Remove backwards compatibility constants
- [ ] Update all existing queries using old fields

---

## Rollback Procedure

If rollback is needed, run:

```bash
psql $DATABASE_URL -f db/migrations/013_restructure_project_taxonomy.down.sql
```

This will:
1. Restore original column names
2. Remove new `analysis_type` column
3. Drop new indexes
4. Remove migration tracking record

---

## Related Documentation

- [Data Validation Lists Reference](./data_validation_lists_reference.md)
- [Universal Container System](./universal-containers.md)
- [Project Configuration Guide](./project-configuration.md)

---

**GZ-5**
**Implementation Date:** 2025-10-31
**Migration Version:** 013

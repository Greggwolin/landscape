# Project Type Data Consistency Fix

**Date:** November 5, 2025
**Type:** Data Quality Fix
**Impact:** Database consistency, UI alignment
**Status:** ✅ Complete

---

## Overview

Fixed data inconsistency between Dashboard and Project Profile tile displays where `project_type_code` and `analysis_type` fields were misaligned for 2 projects, causing different views to show contradictory project type information.

---

## Problem Statement

### User Report
"The Dashboard shows project 8 as land development but on the project tile, it's income property, class A office"

### Investigation Results
The issue wasn't with project 8 (which was correctly configured), but with projects 18 and 11 which had mismatched data:

| Project ID | Project Name | Issue | Dashboard Showed | Profile Showed |
|------------|-------------|-------|------------------|----------------|
| 18 | Gainey Center II | `project_type_code='LAND'` but `analysis_type='Income Property'` | "Land Development" | "Income Property, Class A Office" |
| 11 | Gern's Crossing Apartments | `project_type_code='MF'` but `analysis_type='Land Development'` | "Multifamily" | "Land Development, Multifamily Development" |

---

## Root Cause Analysis

### Different Data Sources for Different Views

**Dashboard** ([src/app/dashboard/page.tsx:192-194](../../src/app/dashboard/page.tsx#L192-L194)):
```typescript
// Uses project_type_code field
<CBadge color={PROPERTY_TYPE_COLORS[project.project_type_code] || 'secondary'}>
  {PROPERTY_TYPE_LABELS[project.project_type_code] || project.project_type_code}
</CBadge>
```

**Project Profile Tile** ([src/components/project/ProjectProfileTile.tsx:100-106](../../src/components/project/ProjectProfileTile.tsx#L100-L106)):
```typescript
// Uses analysis_type and property_subtype fields from profile API
<ProfileField label="Analysis Type" value={profile.analysis_type} />
<ProfileField label="Property Subtype" value={profile.property_subtype} />
```

### Data Schema Fields

From `landscape.tbl_project`:
- `project_type_code` VARCHAR(10) - Standardized Migration 013 codes (LAND, MF, OFF, RET, IND, HTL, MXU)
- `analysis_type` TEXT - Human-readable analysis category ("Land Development" or "Income Property")
- `property_subtype` TEXT - Detailed property classification
- `property_class` VARCHAR(10) - Additional classification (A, B, C for income properties)

### Why Fields Were Mismatched

These fields serve different purposes and can diverge:
- `project_type_code` - Used for filtering, routing, dashboard stats
- `analysis_type` - Used for project profile display and categorization
- When manually updated separately, they can become inconsistent

---

## Files Analyzed

1. **Dashboard Component**
   - File: [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx)
   - Lines: 192-194 (project type badge rendering)
   - Uses: `project.project_type_code`

2. **Project Profile Tile**
   - File: [src/components/project/ProjectProfileTile.tsx](../../src/components/project/ProjectProfileTile.tsx)
   - Lines: 100-106 (analysis type and subtype display)
   - Uses: `profile.analysis_type`, `profile.property_subtype`

3. **Projects API Endpoint**
   - File: [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
   - Fetches: All project fields from `landscape.tbl_project`

4. **Profile API Endpoint**
   - File: [src/app/api/projects/[projectId]/profile/route.ts](../../src/app/api/projects/[projectId]/profile/route.ts)
   - Fetches: Profile-specific fields with MSA join

---

## Solution Implementation

### Data Corrections Applied

**Project 18 - Gainey Center II** (Income Property):
```sql
UPDATE landscape.tbl_project
SET project_type_code = 'OFF', updated_at = NOW()
WHERE project_id = 18;
-- Changed: LAND → OFF (to match Income Property / Class A Office)
```

**Project 11 - Gern's Crossing Apartments** (Land Development for Multifamily):
```sql
UPDATE landscape.tbl_project
SET project_type_code = 'LAND', updated_at = NOW()
WHERE project_id = 11;
-- Changed: MF → LAND (to match Land Development / Multifamily Development)
```

### Migration 013 Code Mapping

| Code | Label | Use Case |
|------|-------|----------|
| LAND | Land Development | Master planned communities, subdivisions, development projects |
| MF | Multifamily | Income-producing multifamily properties |
| OFF | Office | Office buildings (Class A, B, C) |
| RET | Retail | Retail centers, shopping centers |
| IND | Industrial | Industrial properties, warehouses |
| HTL | Hotel | Hotel and hospitality properties |
| MXU | Mixed-Use | Mixed-use developments |

---

## Verification Results

### Before Fix
```sql
-- Query showed 2 projects with mismatched codes
SELECT project_id, project_name, project_type_code, analysis_type, property_subtype
FROM landscape.tbl_project
WHERE (analysis_type = 'Income Property' AND project_type_code = 'LAND')
   OR (analysis_type = 'Land Development' AND project_type_code != 'LAND');

-- Results:
-- 11 | Gern's Crossing Apartments | MF | Land Development | Multifamily Development
-- 18 | Gainey Center II | LAND | Income Property | Class A Office
```

### After Fix
```sql
-- Consistency check shows all projects aligned
SELECT project_id, project_name, project_type_code, analysis_type, property_subtype,
  CASE
    WHEN analysis_type = 'Land Development' AND project_type_code = 'LAND' THEN '✓ OK'
    WHEN analysis_type = 'Income Property' AND project_type_code IN ('OFF', 'MF', 'RET', 'IND', 'HTL', 'MXU') THEN '✓ OK'
    ELSE '✗ MISMATCH'
  END as status
FROM landscape.tbl_project
ORDER BY project_id;

-- All 10 projects: ✓ OK
```

---

## Impact Analysis

### Affected Projects
- **Project 18 (Gainey Center II)**: Now correctly shows as "Office" in Dashboard
- **Project 11 (Gern's Crossing Apartments)**: Now correctly shows as "Land Development" in Dashboard
- **Project 8 (Red Valley MPC)**: Already correct, no changes needed

### User Experience
- ✅ Dashboard and Project Profile tile now show consistent information
- ✅ Users can trust both views for accurate project type data
- ✅ Fixes potential confusion when navigating between views
- ✅ Aligns with Migration 013 standardized codes

### Technical Benefits
- ✅ Data integrity maintained across all views
- ✅ Validates Migration 013 code standardization
- ✅ No code changes required (data-only fix)
- ✅ No breaking changes to any components

---

## Testing Performed

### Database Queries
1. ✅ Queried projects 8, 11, 17, 18 before and after fixes
2. ✅ Ran consistency check across all 10 projects in database
3. ✅ Verified Migration 013 standard codes are correctly applied

### Expected Browser Behavior
After browser refresh:
- Dashboard table "Type" column matches Profile tile "Analysis Type"
- All project type badges align with detailed profile information
- No UI changes required - automatic update from database

---

## Related Documentation

### Migration 013 References
- [Migration 013 Execution Report](../../MIGRATION_013_EXECUTION_REPORT.md)
- [Migration 013 Backend Updates](../../MIGRATION_013_BACKEND_UPDATES.md)
- [Migration History: 013](../08-migration-history/013-project-type-code-standardization.md)

### Component Documentation
- Dashboard: [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx)
- Project Profile Tile: [src/components/project/ProjectProfileTile.tsx](../../src/components/project/ProjectProfileTile.tsx)

---

## Recommendations

### Preventive Measures

1. **Database Constraint** (Future Enhancement):
   ```sql
   -- Add CHECK constraint to ensure alignment
   ALTER TABLE landscape.tbl_project
   ADD CONSTRAINT chk_project_type_analysis_alignment
   CHECK (
     (analysis_type = 'Land Development' AND project_type_code = 'LAND') OR
     (analysis_type = 'Income Property' AND project_type_code IN ('OFF', 'MF', 'RET', 'IND', 'HTL', 'MXU'))
   );
   ```

2. **Data Validation Script**:
   - Create scheduled job to check for inconsistencies
   - Alert on mismatches before they become user-visible issues

3. **Single Source of Truth**:
   - Consider deriving `analysis_type` from `project_type_code` automatically
   - Or make `project_type_code` the canonical field and deprecate `analysis_type`

4. **Update Procedures**:
   - Document that both fields must be updated together
   - Consider creating a stored procedure or trigger to maintain consistency

---

## Files Modified

### Documentation
- ✅ [docs/session-notes.md](../session-notes.md) - Added today's session entry
- ✅ [docs/11-implementation-status/IMPLEMENTATION_STATUS.md](../11-implementation-status/IMPLEMENTATION_STATUS.md) - Added to recent updates
- ✅ [docs/session-notes/2025-11-05-project-type-data-consistency-fix.md](./2025-11-05-project-type-data-consistency-fix.md) - This file

### Database
- ✅ `landscape.tbl_project` - Updated `project_type_code` for projects 11 and 18

---

## Success Metrics

- ✅ **100% Data Consistency** - All 10 projects have aligned type codes
- ✅ **Zero Code Changes** - Fixed with database updates only
- ✅ **Zero Breaking Changes** - No impact on existing functionality
- ✅ **Immediate Effect** - Users see correct data after browser refresh
- ✅ **Migration 013 Compliance** - All projects use standardized codes

---

## Conclusion

This was a data quality issue rather than a code issue. The fix was straightforward: align the `project_type_code` field with the `analysis_type` and `property_subtype` fields according to Migration 013 standards. All projects now have consistent data, and both the Dashboard and Project Profile views display matching information.

**No code deployment required** - database changes are immediately effective.

**Next refresh** - Users will see consistent project types across all views.

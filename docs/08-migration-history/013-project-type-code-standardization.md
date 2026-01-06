# Migration 013 - Project Type Code Standardization

**Date:** November 2, 2025
**Type:** Schema Change + Data Migration + Frontend Update + Backend Update
**Status:** ✅ Complete
**Impact:** High (affects all project classification logic)

---

## Executive Summary

Migration 013 standardized project type codes across the entire application, replacing legacy codes (MPC, MULTIFAMILY, etc.) with 7 official codes (LAND, MF, OFF, RET, IND, HTL, MXU). This migration touched the database schema, 21 frontend files, Django backend models, and tab routing logic.

---

## Motivation

### Problems Solved
1. **Inconsistent Naming**: Multiple codes for the same project type (MPC vs LAND_DEV vs Master Planned Community)
2. **Unclear Meaning**: Codes like "MPC" not universally understood
3. **Missing Standards**: No CHECK constraint allowing invalid codes
4. **NULL Values**: Some projects had no type code at all
5. **Frontend Confusion**: Tab routing logic didn't recognize new taxonomy codes

### Business Value
- **Clearer UI**: Users see standardized labels (Land Development, Multifamily, etc.)
- **Data Quality**: CHECK constraint prevents invalid codes
- **Better Filtering**: Dashboard and reports can reliably filter by project type
- **API Consistency**: All endpoints return same standardized codes
- **Future-Proof**: Easier to add new project types with established pattern

---

## Technical Changes

### Database Schema

#### Column Rename
```sql
ALTER TABLE landscape.tbl_project
RENAME COLUMN property_type_code TO project_type_code;
```

#### Data Standardization
| Old Code | New Code | Full Name |
|----------|----------|-----------|
| MPC | LAND | Land Development |
| MULTIFAMILY | MF | Multifamily |
| RETAIL | RET | Retail |
| NULL/empty | LAND | Land Development (default) |

#### Constraints Added
```sql
-- CHECK constraint
ALTER TABLE landscape.tbl_project
ADD CONSTRAINT check_project_type_code
CHECK (project_type_code IN ('LAND', 'MF', 'OFF', 'RET', 'IND', 'HTL', 'MXU'));

-- NOT NULL constraint
ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type_code SET NOT NULL;

-- DEFAULT value
ALTER TABLE landscape.tbl_project
ALTER COLUMN project_type_code SET DEFAULT 'LAND';
```

#### Columns Dropped
- `development_type_deprecated`
- `property_type_code_deprecated`

---

### Frontend Changes (21 files)

#### API Routes (3 files)
- `src/app/api/projects/route.ts` - Updated type definitions, normalization function
- `src/app/api/projects/[projectId]/route.ts` - Updated allowed fields
- `src/app/api/projects/minimal/route.ts` - Updated SELECT query

#### Type Definitions (2 files)
- `src/app/components/new-project/types.ts` - Updated interface
- `src/app/components/ProjectProvider.tsx` - Updated type

#### Components (16 files)
- All project tab components (ProjectTab, PropertyTab, OperationsTab, etc.)
- Dashboard page with stats counters
- New project modal
- Project context bar
- And more...

#### Key Pattern
```typescript
// Before
interface Project {
  property_type_code?: string;
}

// After
interface Project {
  project_type_code?: string;
}
```

---

### Backend Changes

#### Django Models
```python
# backend/apps/projects/models.py

class Project(models.Model):
    # Added
    project_type_code = models.CharField(max_length=50, blank=True, null=True)

    # Removed
    # development_type_deprecated = ...
    # property_type_code_deprecated = ...
```

#### Django Serializers
```python
# backend/apps/projects/serializers.py

class ProjectListSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            'project_id',
            'project_name',
            'project_type_code',  # Added
            'project_type',
            # Removed deprecated fields
        ]
```

---

### Tab Routing Fix

#### Problem
Projects with `project_type_code = 'LAND'` were showing Income Property tabs instead of Land Development tabs.

#### Root Cause
```typescript
// src/lib/utils/projectTabs.ts

// Before (didn't recognize 'LAND')
const isLandDev =
  normalized === 'MPC' ||
  normalized === 'LAND DEVELOPMENT';

// After (recognizes 'LAND')
const isLandDev =
  normalized === 'LAND' ||  // ✅ Added
  normalized === 'MPC' ||
  normalized === 'LAND DEVELOPMENT';
```

#### Solution
Updated `getTabsForPropertyType()` to recognize the standardized `'LAND'` code.

---

## Execution Timeline

| Time | Action | Status |
|------|--------|--------|
| 10:04:08 | Created backup timestamp | ✅ |
| 10:04:10 | First migration attempt | ❌ Failed (NULL values) |
| 10:05:15 | Second migration attempt (with NULL handling) | ✅ Success |
| 10:06:30 | Verification complete | ✅ |
| 10:12:00 | Django backend updated | ✅ |
| 10:13:00 | Django server restarted | ✅ |
| 10:17:00 | Tab routing fix applied | ✅ |
| 10:22:00 | Dashboard updated | ✅ |

**Total Duration:** 18 minutes

---

## Migration Statistics

- **Projects Migrated:** 10
- **Database Rows Updated:** 10 (per UPDATE statement, 20 total)
- **Frontend Files Modified:** 21
- **Backend Files Modified:** 2
- **Constraints Added:** 3 (CHECK, NOT NULL, DEFAULT)
- **Columns Dropped:** 2
- **Deprecated Columns Removed:** 2

---

## Verification Results

### Database
✅ All 10 projects have valid `project_type_code` values
✅ CHECK constraint active (7 valid codes)
✅ NOT NULL constraint active
✅ DEFAULT value set to 'LAND'
✅ No deprecated columns remain

### API Endpoints
✅ `/api/projects` returns `project_type_code` field
✅ `/api/projects/7` returns correct data
✅ Django multifamily endpoints work (HTTP 200)
✅ No 500 errors in logs

### Frontend
✅ Project 7 (LAND) shows Land Development tabs
✅ Project 17 (MF) shows Income Property tabs
✅ Dashboard stats count correctly
✅ Project badges display correct labels
✅ No TypeScript errors

---

## Issues Encountered

### Issue 1: NULL Values
**Problem:** Project ID 18 had NULL `property_type_code`
**Fix:** Added NULL handling to migration:
```sql
WHEN project_type_code IS NULL OR project_type_code = ''
  THEN 'LAND'
```

### Issue 2: Deprecated Columns
**Problem:** Django API returned HTTP 500 errors
**Error:** `column tbl_project.development_type_deprecated does not exist`
**Fix:** Removed deprecated field definitions from Django models

### Issue 3: Tab Routing
**Problem:** LAND projects showed wrong tabs
**Fix:** Updated `getTabsForPropertyType()` to recognize 'LAND' code

---

## Rollback Procedure

If rollback is needed:

```bash
# 1. Execute rollback SQL
psql $DATABASE_URL -f db/migrations/013_rollback.sql

# 2. Revert frontend code
git checkout HEAD -- src/

# 3. Revert backend code
git checkout HEAD -- backend/apps/projects/

# 4. Restart servers
pkill -f "next dev"
pkill -f "manage.py runserver"
npm run dev
cd backend && python manage.py runserver 8000
```

**Rollback Script:** `db/migrations/013_rollback.sql`

---

## Testing Checklist

- [x] Database migration runs without errors
- [x] All projects have valid codes
- [x] CHECK constraint works (rejects invalid codes)
- [x] NOT NULL constraint works (rejects NULL values)
- [x] DEFAULT works (new projects get 'LAND')
- [x] API returns `project_type_code` field
- [x] Django backend APIs work
- [x] Frontend TypeScript compiles
- [x] LAND projects show correct tabs
- [x] MF projects show correct tabs
- [x] Dashboard stats accurate
- [x] No console errors

---

## Documentation

### Created
1. [MIGRATION_013_EXECUTION_REPORT.md](../../MIGRATION_013_EXECUTION_REPORT.md) - Detailed execution report
2. [MIGRATION_013_BACKEND_UPDATES.md](../../MIGRATION_013_BACKEND_UPDATES.md) - Backend changes
3. [MIGRATION_013_TAB_ROUTING_FIX.md](../../MIGRATION_013_TAB_ROUTING_FIX.md) - Tab routing fix
4. [CHANGELOG.md](../../CHANGELOG.md) - Version history
5. [migration_013_backup_timestamp.txt](../../migration_013_backup_timestamp.txt) - Backup timestamp

### Updated
1. [README.md](../../README.md) - Main project README
2. [docs/README.md](../README.md) - Documentation index
3. [docs/08-migration-history/](.) - This file

---

## Lessons Learned

1. **Always check for NULL values** before setting NOT NULL constraints
2. **Test with real data** to catch edge cases (like project 18 with NULL)
3. **Update all layers** (database, backend, frontend) in coordinated fashion
4. **Restart services** after model changes for Django to pick up new definitions
5. **Check tab routing** when changing project classification logic
6. **Maintain backwards compatibility** by keeping legacy code mappings

---

## Data Consistency Fix (November 5, 2025)

### Post-Migration Issue Discovered
After Migration 013 deployment, a data consistency issue was identified where some projects had mismatched `project_type_code` and `analysis_type` values, causing different UI views to display contradictory information.

### Projects Affected
1. **Project 18 (Gainey Center II)**:
   - Had: `project_type_code='LAND'`, `analysis_type='Income Property'`, `property_subtype='Class A Office'`
   - Fixed: `project_type_code='OFF'` to match income property classification

2. **Project 11 (Gern's Crossing Apartments)**:
   - Had: `project_type_code='MF'`, `analysis_type='Land Development'`, `property_subtype='Multifamily Development'`
   - Fixed: `project_type_code='LAND'` to match land development classification

### Root Cause
- Dashboard component uses `project_type_code` for display
- Project Profile tile uses `analysis_type` and `property_subtype`
- These fields can diverge when updated separately

### Resolution
```sql
-- Project 18: Income Property correction
UPDATE landscape.tbl_project
SET project_type_code = 'OFF', updated_at = NOW()
WHERE project_id = 18;

-- Project 11: Land Development correction
UPDATE landscape.tbl_project
SET project_type_code = 'LAND', updated_at = NOW()
WHERE project_id = 11;
```

### Verification
All 10 projects now have consistent `project_type_code` aligned with their `analysis_type`:
- ✅ Land Development projects: `project_type_code = 'LAND'`
- ✅ Income Property projects: `project_type_code IN ('OFF', 'MF', 'RET', 'IND', 'HTL', 'MXU')`

**Documentation:** [docs/09_session_notes/2025-11-05-project-type-data-consistency-fix.md](../09_session_notes/2025-11-05-project-type-data-consistency-fix.md)

---

## Future Considerations

1. **Data Validation Constraint**: Add CHECK constraint to ensure `project_type_code` aligns with `analysis_type`
2. **Add More Types**: If needed, add codes like 'HOSP' (Hospitality), 'MED' (Medical), etc.
3. **Migrate Legacy Data**: Eventually remove support for old codes (MPC, MULTIFAMILY)
4. **Audit Existing Code**: Search for any remaining `property_type_code` references
5. **Update Tests**: Ensure test fixtures use standardized codes
6. **Document Taxonomy**: Create comprehensive guide to all 7 project types

---

## Related Migrations

- **Migration 012** (2025-10-30): Document Management System
- **Migration 011** (2025-10-25): PDF Reports & Progressive Assumptions
- **Migration 010** (2025-10-20): Python Financial Engine

---

## References

- [Database Migration File](../../db/migrations/013_project_type_reclassification.sql)
- [Rollback File](../../db/migrations/013_rollback.sql)
- [Tab Routing Utility](../../src/lib/utils/projectTabs.ts)
- [Dashboard Component](../../src/app/dashboard/page.tsx)
- [Django Project Model](../../backend/apps/projects/models.py)

---

**Migration Complete:** November 2, 2025 10:22 MST
**Executed By:** Claude Code (Migration Agent)
**Status:** ✅ Production Ready

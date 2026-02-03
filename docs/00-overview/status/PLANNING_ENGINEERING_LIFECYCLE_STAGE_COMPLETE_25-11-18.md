# Planning & Engineering Lifecycle Stage - Implementation Complete

**Date:** 2025-11-18
**Status:** ✅ Complete
**Migration:** 0020_add_planning_engineering_lifecycle_stage.sql

## Summary

Successfully added a new 6th lifecycle stage called **"Planning & Engineering"** to the Unit Cost Categories system, positioned between Acquisition and Development stages. This stage encompasses pre-development activities including studies, planning, design, permits, and engineering work.

## Changes Made

### 1. Database Migration ✅

**File:** [backend/apps/financial/migrations/0020_add_planning_engineering_lifecycle_stage.sql](../../backend/apps/financial/migrations/0020_add_planning_engineering_lifecycle_stage.sql)

**Changes:**
- Dropped existing CHECK constraint on `landscape.core_category_lifecycle_stages`
- Added new CHECK constraint including 'Planning & Engineering' (6 total stages)
- Reclassified 8 categories to the new stage
- Removed 5 categories entirely from Development (moved to Planning & Engineering only)
- Kept 3 categories multi-stage (appear in both Planning & Engineering and other stages)

### 2. TypeScript Type Updates ✅

**File:** [src/types/benchmarks.ts:143](../../src/types/benchmarks.ts#L143)

**Change:**
```typescript
export type LifecycleStage =
  | 'Acquisition'
  | 'Planning & Engineering'  // NEW
  | 'Development'
  | 'Operations'
  | 'Disposition'
  | 'Financing';
```

### 3. UI Component Updates ✅

**Updated Components:**
1. [src/app/admin/preferences/components/UnitCostCategoryManager.tsx:20](../../src/app/admin/preferences/components/UnitCostCategoryManager.tsx#L20)
   - Added 'Planning & Engineering' to LIFECYCLE_STAGES array
   - Added aliases: planning, engineering, predevelopment

2. [src/app/admin/preferences/components/LifecycleStageFilter.tsx:17](../../src/app/admin/preferences/components/LifecycleStageFilter.tsx#L17)
   - Added description: "Studies, planning, design, permits, engineering"
   - Updated Development description to "Construction, site work, infrastructure"

3. [src/app/admin/preferences/components/lifecycle-icons.ts](../../src/app/admin/preferences/components/lifecycle-icons.ts)
   - Added icon: `cilPencil` for Planning & Engineering stage

4. [src/app/admin/preferences/components/AddCategoryModal.tsx:20](../../src/app/admin/preferences/components/AddCategoryModal.tsx#L20)
   - Added 'Planning & Engineering' to stage options

### 4. API Route Updates ✅

**File:** [src/app/api/unit-costs/categories/route.ts](../../src/app/api/unit-costs/categories/route.ts)

**Changes:**
- Updated `LIFECYCLE_STAGE_ALIASES` to include:
  - planning → 'Planning & Engineering'
  - engineering → 'Planning & Engineering'
  - predevelopment → 'Planning & Engineering' (moved from Development)
- Updated `VALID_LIFECYCLE_STAGES` Set to include 'Planning & Engineering'

### 5. Django Model Updates ✅

**File:** [backend/apps/financial/models_benchmarks.py:132](../../backend/apps/financial/models_benchmarks.py#L132)

**Change:**
```python
LIFECYCLE_CHOICES = [
    ('Acquisition', 'Acquisition'),
    ('Planning & Engineering', 'Planning & Engineering'),  # NEW
    ('Development', 'Development'),
    ('Operations', 'Operations'),
    ('Disposition', 'Disposition'),
    ('Financing', 'Financing'),
]
```

## Categories Reclassified

### Moved Entirely to Planning & Engineering (5 categories)

| ID | Category Name | Previous Stage | New Stage |
|----|---------------|----------------|-----------|
| 31 | Land Planning | Development | Planning & Engineering |
| 32 | Engineering Studies | Development | Planning & Engineering |
| 33 | Environmental Studies | Development | Planning & Engineering |
| 37 | Civil Engineering | Development | Planning & Engineering |
| 38 | Final Studies | Development | Planning & Engineering |

### Multi-Stage Categories (3 categories)

| ID | Category Name | Stages |
|----|---------------|--------|
| 36 | Legal Fees | Acquisition, Planning & Engineering, Development |
| 39 | Submittal Fees | Planning & Engineering, Development |
| 40 | Other Consultants | Planning & Engineering, Development |

## Final Stage Distribution

| Lifecycle Stage | Category Count |
|-----------------|----------------|
| Acquisition | 3 |
| **Planning & Engineering** | **8** |
| Development | 27 |
| Operations | 0 |
| Disposition | 1 |
| Financing | 0 |

**Total:** 39 stage assignments across 34 active categories

## Testing Results

### Database Testing ✅
- ✅ CHECK constraint accepts all 6 stages
- ✅ Planning & Engineering categories assigned correctly (8 categories)
- ✅ No orphaned category assignments
- ✅ Migration ran successfully without errors

### API Testing ✅
- ✅ Endpoint `/api/unit-costs/categories?lifecycle_stage=Planning%20%26%20Engineering` returns 8 categories
- ✅ All reclassified categories appear in response
- ✅ Category counts are accurate

### TypeScript Testing ✅
- ✅ No lifecycle-related TypeScript compilation errors
- ✅ Type safety maintained across all files

### UI Testing (To Be Done by User)
- [ ] Navigate to `/admin/preferences`
- [ ] Verify 6 lifecycle stage tiles display in left column
- [ ] Verify "Planning & Engineering" tile shows count of 8
- [ ] Verify pencil icon displays for new stage
- [ ] Click "Planning & Engineering" tile - verify categories filter correctly
- [ ] Test creating new category - verify "Planning & Engineering" option available

## Implementation Notes

### Icon Choice
Selected `cilPencil` (pencil icon) for Planning & Engineering to represent design and planning work. Alternative options considered:
- `cilClipboard` - Could represent checklists/planning
- `cilChart` - Could represent analysis/studies

### Category Tag System
All Planning & Engineering categories are tagged as "Soft" costs, which means they appear in the "Soft Costs" tab in the Cost Library.

### Multi-Stage Support
The system properly supports categories belonging to multiple lifecycle stages through the pivot table `core_category_lifecycle_stages`. This is leveraged for categories like "Legal Fees" that span multiple stages.

### Duplicate Categories Identified
Found potential duplicate categories:
- **Submittal Fees:** ID 34 (Development only) and ID 39 (Planning & Engineering + Development)
- **Other Consultants:** ID 35 (Development only) and ID 40 (Planning & Engineering + Development)

These may need consolidation in a future cleanup task.

## Files Modified

### Backend (2 files)
1. `backend/apps/financial/migrations/0020_add_planning_engineering_lifecycle_stage.sql` (NEW)
2. `backend/apps/financial/models_benchmarks.py`

### Frontend (6 files)
1. `src/types/benchmarks.ts`
2. `src/app/admin/preferences/components/UnitCostCategoryManager.tsx`
3. `src/app/admin/preferences/components/LifecycleStageFilter.tsx`
4. `src/app/admin/preferences/components/lifecycle-icons.ts`
5. `src/app/admin/preferences/components/AddCategoryModal.tsx`
6. `src/app/api/unit-costs/categories/route.ts`

### Documentation (1 file)
1. `docs/00_overview/status/PLANNING_ENGINEERING_LIFECYCLE_STAGE_COMPLETE.md` (THIS FILE)

## Rollback Instructions

If issues arise, run this SQL to rollback:

```sql
BEGIN;

-- Remove Planning & Engineering assignments
DELETE FROM landscape.core_category_lifecycle_stages
WHERE lifecycle_stage = 'Planning & Engineering';

-- Restore categories to Development
INSERT INTO landscape.core_category_lifecycle_stages (category_id, lifecycle_stage, sort_order)
VALUES
    (31, 'Development', 0),
    (32, 'Development', 0),
    (33, 'Development', 0),
    (37, 'Development', 0),
    (38, 'Development', 0)
ON CONFLICT (category_id, lifecycle_stage) DO NOTHING;

-- Restore old CHECK constraint
ALTER TABLE landscape.core_category_lifecycle_stages
    DROP CONSTRAINT chk_lifecycle_stage_value;

ALTER TABLE landscape.core_category_lifecycle_stages
    ADD CONSTRAINT chk_lifecycle_stage_value
    CHECK (lifecycle_stage IN ('Acquisition', 'Development', 'Operations', 'Disposition', 'Financing'));

COMMIT;
```

Then revert code changes via git.

## Next Steps

1. **User Acceptance Testing:** Test the UI at `/admin/preferences` to verify tile display and filtering
2. **Documentation Updates:** Update [CATEGORIZATION_SYSTEMS_REFERENCE.md](../CATEGORIZATION_SYSTEMS_REFERENCE.md) with new 6-stage system
3. **Category Cleanup (Optional):** Consolidate duplicate Submittal Fees and Other Consultants categories
4. **Cost Library Testing:** Verify categories appear correctly in `/admin/benchmarks/cost-library`

## Related Documentation

- [Category Lifecycle Migration Guide](../CATEGORY_LIFECYCLE_MIGRATION_GUIDE.md)
- [Categorization Systems Reference](../CATEGORIZATION_SYSTEMS_REFERENCE.md)
- [Budget Granularity System](../BUDGET_GRANULARITY_SYSTEM.md)

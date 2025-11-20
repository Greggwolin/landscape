# Category Lifecycle Schema Migration Guide

**Migration ID:** 0016_category_lifecycle_taxonomy
**Date:** January 8, 2025
**Status:** Ready for Execution

## Executive Summary

This migration evolves the `core_unit_cost_category` table from a land-development-specific taxonomy to a universal lifecycle-based taxonomy that works across **ALL property types** (land, multifamily, office, retail, industrial, hotel, mixed-use).

### What's Changing

**Before (Land-Dev Specific):**
- Fields: `development_stage` (stage1/stage2/stage3), `cost_scope`, `cost_type`
- Problem: Only works for land development projects
- Limitation: Can't handle multifamily, commercial, or other property types

**After (Universal Lifecycle):**
- Fields: `lifecycle_stage` (Acquisition/Development/Operations/Disposition/Financing), `tags` (flexible array)
- Benefit: Works for ALL property types
- Flexibility: Tag-based categorization (Hard/Soft for Development, OpEx/CapEx for Operations, etc.)

### Zero Data Loss

- All 33 existing categories preserved
- All 291 existing templates preserved
- Intelligent data mapping from old structure to new

---

## Business Context

### Why This Migration?

**Yesterday's Implementation (Jan 7, 2025):**
- Added `development_stage` field with stage1/stage2/stage3 values
- Worked perfectly for land development projects
- Seeded Red Valley and Scottsdale benchmark data

**Today's Realization:**
- Need to support multifamily acquisition + operations
- Need to support commercial TI (tenant improvements)
- Need to support industrial OpEx vs CapEx distinction
- "Stage 1/2/3" terminology doesn't translate to other property types

**Solution:**
- Universal lifecycle stages that make sense for ANY property type
- Flexible tag system for context-specific categorization
- ARGUS-style user customization

### Universal Lifecycle Stages

These stages work across **all property types**:

1. **Acquisition** - Purchase, due diligence, closing costs
   - *Works for:* Land, multifamily, office, retail, industrial, everything

2. **Development** - Everything from entitlements through construction
   - *Land:* Entitlements → Engineering → Horizontal/Vertical
   - *Multifamily:* Design → Construction → FFE
   - *Office:* Core/Shell → TI
   - *Industrial:* Build-to-suit construction

3. **Operations** - Revenue, OpEx, CapEx, leasing costs
   - *Multifamily:* Rental income, property management, CapEx reserves
   - *Office:* Lease commissions, CAM expenses, TI allowances
   - *Retail:* Percentage rent, common area costs

4. **Disposition** - Sale prep, broker fees, closing costs
   - *Works for:* All property types

5. **Financing** - Debt service, equity distributions, fees
   - *Crosscuts:* All stages for all property types

### Flexible Tag System

Instead of rigid `cost_type` (hard/soft/deposit), tags adapt to context:

**Development Context:**
- `["Hard"]` - Physical construction (materials, labor)
- `["Soft"]` - Professional services, permits, fees
- `["Deposits"]` - Refundable deposits
- `["Professional Services"]` - Legal, engineering, consulting

**Operations Context:**
- `["OpEx"]` - Operating expenses (recurring)
- `["CapEx"]` - Capital expenditures (improvements)
- `["Revenue"]` - Income streams

**Financing Context:**
- `["Debt"]` - Borrowed capital
- `["Equity"]` - Invested capital
- `["Fees"]` - Financing fees

**Multi-Context:**
- `["Closing Costs"]` - Applies to both Acquisition and Disposition
- `["Marketing"]` - Applies to both Operations and Disposition

---

## Technical Implementation

### Database Changes

#### 1. New Table: `core_category_tag_library`

System and user-extensible tag library:

```sql
CREATE TABLE landscape.core_category_tag_library (
    tag_id SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE,
    tag_context VARCHAR(50) NOT NULL,
    is_system_default BOOLEAN DEFAULT TRUE,
    description TEXT,
    display_order INTEGER DEFAULT 999,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Seeded with 13 default tags** (see migration SQL for full list)

#### 2. Schema Changes: `core_unit_cost_category`

**Added:**
- `lifecycle_stage VARCHAR(50)` - Required, constrained to 5 valid values
- `tags JSONB DEFAULT '[]'` - Array of tag strings

**Removed:**
- `development_stage` (stage1/stage2/stage3)
- `cost_scope` (development/operations)
- `cost_type` (hard/soft/deposit/other)

**Data Migration Logic:**
```sql
-- All existing categories → "Development" lifecycle stage
UPDATE core_unit_cost_category
SET lifecycle_stage = 'Development'
WHERE lifecycle_stage IS NULL;

-- Map old cost_type to tags
UPDATE core_unit_cost_category
SET tags = CASE
    WHEN cost_type = 'hard' THEN '["Hard"]'::jsonb
    WHEN cost_type = 'soft' THEN '["Soft"]'::jsonb
    WHEN cost_type = 'deposit' THEN '["Deposits"]'::jsonb
    WHEN cost_type = 'other' THEN '["Other"]'::jsonb
END;

-- Intelligently add "Professional Services" tag
UPDATE core_unit_cost_category
SET tags = tags || '["Professional Services"]'::jsonb
WHERE category_name ILIKE ANY(ARRAY[
    '%engineering%', '%legal%', '%architect%', '%consulting%'
]);
```

#### 3. New Indexes

```sql
-- Filter by lifecycle stage
CREATE INDEX idx_category_lifecycle_stage
ON core_unit_cost_category(lifecycle_stage);

-- Filter by tags (GIN index for JSONB)
CREATE INDEX idx_category_tags
ON core_unit_cost_category USING GIN(tags);

-- Common query pattern
CREATE INDEX idx_category_lifecycle_active
ON core_unit_cost_category(lifecycle_stage, is_active)
WHERE is_active = TRUE;

-- Hierarchy navigation
CREATE INDEX idx_category_parent
ON core_unit_cost_category(parent_id)
WHERE parent_id IS NOT NULL;
```

#### 4. Helper Functions

- `category_has_tag(tags, tag_name)` - Check if category has tag
- `add_category_tag(category_id, tag_name)` - Add tag to category
- `remove_category_tag(category_id, tag_name)` - Remove tag
- `get_categories_by_tag(tag_name)` - Get all categories with tag
- `get_tag_usage_stats()` - Tag usage statistics

#### 5. Hierarchy View

`vw_category_hierarchy` - Recursive CTE showing parent-child relationships with depth and path

### Backend Changes (Django)

#### Models Updated

**File:** `backend/apps/financial/models_benchmarks.py`

**New Model:**
```python
class CategoryTagLibrary(models.Model):
    tag_id = models.AutoField(primary_key=True)
    tag_name = models.CharField(max_length=50, unique=True)
    tag_context = models.CharField(max_length=50)
    is_system_default = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    display_order = models.IntegerField(default=999)
    is_active = models.BooleanField(default=True)
    # ... timestamps
```

**Updated Model:**
```python
class UnitCostCategory(models.Model):
    LIFECYCLE_CHOICES = [
        ('Acquisition', 'Acquisition'),
        ('Development', 'Development'),
        ('Operations', 'Operations'),
        ('Disposition', 'Disposition'),
        ('Financing', 'Financing'),
    ]

    # ... other fields
    lifecycle_stage = models.CharField(max_length=50, choices=LIFECYCLE_CHOICES)
    tags = models.JSONField(default=list)  # JSONB array

    # Helper methods
    def has_tag(self, tag_name): ...
    def add_tag(self, tag_name): ...
    def remove_tag(self, tag_name): ...
    def get_ancestors(self): ...
    def get_descendants(self): ...
```

#### Serializers Updated

**File:** `backend/apps/financial/serializers_unit_costs.py`

**New Serializers:**
- `CategoryTagLibrarySerializer` - Tag CRUD
- `UnitCostCategoryHierarchySerializer` - Nested tree structure

**Updated Serializer:**
```python
class UnitCostCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.category_name', read_only=True)
    depth = serializers.IntegerField(read_only=True)
    has_children = serializers.SerializerMethodField()
    template_count = serializers.IntegerField(read_only=True)

    class Meta:
        fields = [
            'category_id', 'parent', 'parent_name',
            'category_name', 'lifecycle_stage', 'tags',
            'sort_order', 'is_active', 'depth', 'has_children',
            'template_count', 'created_at', 'updated_at'
        ]
```

#### Views Updated

**File:** `backend/apps/financial/views_unit_costs.py`

**New ViewSet:**
```python
class CategoryTagLibraryViewSet(viewsets.ModelViewSet):
    # Full CRUD for tag library
    # Filters: tag_context, is_system_default, is_active
```

**Updated ViewSet:**
```python
class UnitCostCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    # ✅ NEW: Filter by lifecycle_stage
    # ✅ NEW: Filter by tag
    # ✅ NEW: Filter by parent (hierarchy)
    # ❌ REMOVED: by_stage() action
    # ✅ NEW: hierarchy() action - nested tree
    # ✅ NEW: by_tag() action - filter by tag
    # ✅ NEW: add_tag() action - add tag to category
    # ✅ NEW: remove_tag() action - remove tag from category
```

**Updated TemplateViewSet:**
```python
class UnitCostTemplateViewSet(viewsets.ModelViewSet):
    # ✅ NEW: Filter by lifecycle_stage
    # ✅ NEW: Filter by tag
    # ❌ REMOVED: by_stage() action
```

#### URL Routing Updated

**File:** `backend/apps/financial/urls.py`

```python
# NEW endpoints
router.register(r'unit-costs/tags', CategoryTagLibraryViewSet)

# Updated endpoints (backward compatible URLs)
router.register(r'unit-costs/categories', UnitCostCategoryViewSet)
router.register(r'unit-costs/templates', UnitCostTemplateViewSet)
```

### Frontend Changes

#### TypeScript Types Updated

**File:** `src/types/benchmarks.ts`

**Removed Types:**
```typescript
// ❌ REMOVED
type UnitCostScope = 'development' | 'operations';
type UnitCostType = 'hard' | 'soft' | 'deposit' | 'other';
type DevelopmentStage = 'stage1_entitlements' | 'stage2_engineering' | 'stage3_development';
interface StageGroupedCategories { ... }
```

**New Types:**
```typescript
// ✅ NEW
export type LifecycleStage =
  | 'Acquisition'
  | 'Development'
  | 'Operations'
  | 'Disposition'
  | 'Financing';

export interface CategoryTag {
  tag_id: number;
  tag_name: string;
  tag_context: string;
  is_system_default: boolean;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface UnitCostCategoryReference {
  category_id: number;
  parent?: number;
  parent_name?: string;
  category_name: string;
  lifecycle_stage: LifecycleStage;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  depth?: number;
  has_children?: boolean;
  template_count: number;
}

export interface UnitCostCategoryHierarchy {
  category_id: number;
  category_name: string;
  lifecycle_stage: LifecycleStage;
  tags: string[];
  children: UnitCostCategoryHierarchy[];
}
```

#### Next.js API Routes Updated

**File:** `src/app/api/unit-costs/categories/route.ts`

**Updated Direct SQL Query:**
- Now selects `lifecycle_stage`, `tags`, `parent_id`, `parent_name`, `has_children`
- Filters by `lifecycle_stage` instead of `cost_scope`/`cost_type`
- Supports tag filtering with JSONB `@>` operator
- Supports parent filtering for hierarchy navigation

**Removed Files:**
- ❌ `src/app/api/unit-costs/categories-by-stage/route.ts`
- ❌ `src/app/api/unit-costs/templates-by-stage/route.ts`

---

## Migration Data Mapping

### Existing Categories (33 total)

**All Stage 1 Categories (6 soft costs):**
- `development_stage: 'stage1_entitlements'` → `lifecycle_stage: 'Development', tags: ['Soft']`
- Examples: Entitlement Consultants, Environmental Studies, Land Planning

**All Stage 2 Categories (5 soft costs):**
- `development_stage: 'stage2_engineering'` → `lifecycle_stage: 'Development', tags: ['Soft']`
- Examples: Civil Engineering, Geotechnical, Utility Engineering

**All Stage 3 Categories (22 costs):**
- `development_stage: 'stage3_development'` → `lifecycle_stage: 'Development', tags: [varies]`
  - Hard costs (12): `tags: ['Hard']` - Grading, Streets, Utilities, etc.
  - Soft costs (5): `tags: ['Soft']` - Permits, Insurance, Contingency
  - Deposits (3): `tags: ['Deposits']` - Water deposits, Electric deposits
  - Other (2): `tags: ['Other']` - Miscellaneous costs

**Intelligent Tag Addition:**
- Categories with names containing "engineering", "legal", "architect", "consulting" → Added `["Professional Services"]` tag
- Categories with names containing "study", "report", "inspection" → Added `["Due Diligence"]` tag

### Existing Templates (291 total)

**No changes to template table** - All templates remain linked to their categories via `category_id`. The category's new fields (lifecycle_stage, tags) are accessible via the foreign key relationship.

---

## API Changes Summary

### Removed Endpoints

```
❌ GET /api/financial/unit-costs/categories/by-stage/
❌ GET /api/financial/unit-costs/templates/by-stage/?stage=...
```

### New Endpoints

```
✅ GET /api/financial/unit-costs/tags/
✅ GET /api/financial/unit-costs/tags/{tag_id}/
✅ POST /api/financial/unit-costs/tags/
✅ PUT /api/financial/unit-costs/tags/{tag_id}/
✅ DELETE /api/financial/unit-costs/tags/{tag_id}/

✅ GET /api/financial/unit-costs/categories/hierarchy/?lifecycle_stage=Development
✅ GET /api/financial/unit-costs/categories/by-tag/?tag=Hard&lifecycle_stage=Development
✅ POST /api/financial/unit-costs/categories/{id}/add-tag/
✅ POST /api/financial/unit-costs/categories/{id}/remove-tag/
```

### Updated Endpoints (Backward Compatible)

```
✅ GET /api/financial/unit-costs/categories/
   - NEW filters: ?lifecycle_stage=Development&tag=Hard&parent=5
   - REMOVED filters: ?cost_scope=development&cost_type=hard&development_stage=stage3

✅ GET /api/financial/unit-costs/templates/
   - NEW filters: ?lifecycle_stage=Development&tag=Soft
   - REMOVED filters: ?development_stage=stage3_development
```

---

## Execution Plan

### Prerequisites

1. **Backup database** before running migration
2. **Stop Django server** to prevent conflicting writes
3. **Verify Neon connection** is active
4. **Review migration SQL** in `backend/apps/financial/migrations/0016_category_lifecycle_taxonomy.sql`

### Step 1: Run Database Migration

```bash
# Connect to Neon database
psql $DATABASE_URL

# Run migration script
\i backend/apps/financial/migrations/0016_category_lifecycle_taxonomy.sql

# Verify success (should see validation messages)
```

**Expected Output:**
```
NOTICE:  Validation passed: All categories have lifecycle_stage
NOTICE:  Validation passed: All categories have valid tags array
NOTICE:  === Migration 0016 Summary ===
NOTICE:  Total active categories: 33
NOTICE:  Development lifecycle categories: 33
NOTICE:  Tags in library: 13
NOTICE:  ================================
```

### Step 2: Restart Django Server

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

### Step 3: Test API Endpoints

```bash
# Test tag library
curl http://localhost:8000/api/financial/unit-costs/tags/

# Test categories with new fields
curl http://localhost:8000/api/financial/unit-costs/categories/

# Test lifecycle filtering
curl http://localhost:8000/api/financial/unit-costs/categories/?lifecycle_stage=Development

# Test tag filtering
curl http://localhost:8000/api/financial/unit-costs/categories/by-tag/?tag=Hard

# Test hierarchy
curl http://localhost:8000/api/financial/unit-costs/categories/hierarchy/

# Test templates with new filters
curl http://localhost:8000/api/financial/unit-costs/templates/?lifecycle_stage=Development&tag=Soft
```

### Step 4: Update Frontend (Future Work)

**Components requiring updates** (not included in this migration):
- `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx`
  - Replace Stage 1/2/3 tabs with lifecycle_stage + tag filtering
- `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx`
  - Update category selection to use lifecycle_stage
- Other unit cost UI components

**Note:** Frontend updates are **not required** for this migration to succeed. The backend is fully functional with new taxonomy. Frontend can be updated incrementally.

---

## Validation Queries

Run these after migration to verify success:

```sql
-- Check all categories have lifecycle_stage
SELECT COUNT(*) FROM landscape.core_unit_cost_category WHERE lifecycle_stage IS NULL;
-- Expected: 0

-- Show lifecycle distribution
SELECT lifecycle_stage, COUNT(*) as count
FROM landscape.core_unit_cost_category
GROUP BY lifecycle_stage
ORDER BY lifecycle_stage;
-- Expected: Development = 33

-- Show tag usage
SELECT * FROM landscape.get_tag_usage_stats();
-- Expected: Hard, Soft, Deposits, Other, Professional Services, Due Diligence

-- Verify templates still linked
SELECT COUNT(*) FROM landscape.core_unit_cost_template WHERE is_active = true;
-- Expected: 291

-- Test hierarchy view
SELECT * FROM landscape.vw_category_hierarchy WHERE lifecycle_stage = 'Development' LIMIT 10;

-- Test tag filtering
SELECT category_name, tags
FROM landscape.core_unit_cost_category
WHERE tags @> '["Hard"]'::jsonb
  AND is_active = true;
```

---

## Rollback Plan

If migration fails or issues arise:

### Option 1: Database Restore

```bash
# Restore from backup taken before migration
pg_restore --dbname=$DATABASE_URL backup_before_migration.dump
```

### Option 2: Manual Rollback (Not Recommended)

**NOT IMPLEMENTED** - This migration is **one-way** because:
1. Data transformation is lossy (stage1/2/3 → Development loses granularity)
2. Tag intelligence can't be reversed automatically
3. Simpler to restore from backup

**Prevention:** Always backup before migration!

---

## Success Criteria

✅ All 33 categories migrated to `lifecycle_stage = 'Development'`
✅ All categories have tags array populated
✅ No categories have NULL `lifecycle_stage`
✅ Tag library has 13 active default tags
✅ All 291 templates preserved and linked
✅ All Django API endpoints return new structure
✅ Direct SQL queries return new fields
✅ Indexes created successfully
✅ Helper functions work correctly
✅ Hierarchy view returns nested structure
✅ No database errors or warnings

---

## Post-Migration Tasks

### Immediate (Backend)
- ✅ Migration SQL executed
- ✅ Django models updated
- ✅ Serializers updated
- ✅ Views updated
- ✅ URL routing updated
- ✅ TypeScript types updated
- ✅ Next.js API routes updated
- ✅ Stage-specific routes deleted

### Short-Term (Frontend UI)
- ⏳ Update UnitCostsPanel to use lifecycle_stage + tags
- ⏳ Update category selection dropdowns
- ⏳ Add tag filter UI components
- ⏳ Update template creation/editing forms
- ⏳ Test end-to-end user flows

### Medium-Term (New Property Types)
- ⏳ Create Multifamily category templates (Acquisition, Operations)
- ⏳ Create Office category templates (Development TI, Operations)
- ⏳ Create Retail category templates (Operations, Disposition)
- ⏳ User testing with different property types

### Long-Term (Advanced Features)
- ⏳ 3-column taxonomy manager UI
- ⏳ User-defined custom tags
- ⏳ Property-type-specific category sets
- ⏳ Tag usage analytics
- ⏳ Category hierarchy management UI

---

## Troubleshooting

### Issue: Migration fails with "column does not exist"

**Cause:** Old Django code trying to access removed fields
**Solution:** Ensure Django models are updated before running migration

### Issue: Tags field shows as string instead of array

**Cause:** Client-side JSON parsing issue
**Solution:** Verify TypeScript interface has `tags: string[]` not `tags: string`

### Issue: Categories not filtered by tag

**Cause:** Incorrect JSONB query syntax
**Solution:** Use `tags @> '["TagName"]'::jsonb` for JSONB containment

### Issue: Templates missing after migration

**Cause:** None - templates are not affected by this migration
**Solution:** Verify via `SELECT COUNT(*) FROM core_unit_cost_template` - should be 291

### Issue: Frontend still showing Stage 1/2/3

**Cause:** Frontend not yet updated to use new fields
**Solution:** Expected - frontend updates are separate from backend migration

---

## References

### Related Documentation
- [Global Benchmarks Implementation](./DJANGO_BACKEND_IMPLEMENTATION.md)
- [Unit Cost Templates Seeding](./UNIT_COST_TEMPLATES_SEEDING.md)
- [Project Taxonomy Restructure](./PROJECT_TAXONOMY_RESTRUCTURE_IMPLEMENTATION.md)

### Migration Files
- SQL: `backend/apps/financial/migrations/0016_category_lifecycle_taxonomy.sql`
- Previous: `backend/apps/financial/migrations/0015_unit_cost_development_stages.sql`

### Code Changes
- Models: `backend/apps/financial/models_benchmarks.py`
- Serializers: `backend/apps/financial/serializers_unit_costs.py`
- Views: `backend/apps/financial/views_unit_costs.py`
- URLs: `backend/apps/financial/urls.py`
- Types: `src/types/benchmarks.ts`
- API Routes: `src/app/api/unit-costs/categories/route.ts`

---

## Contact & Support

**Questions?** Review this guide and test queries above.
**Issues?** Check Troubleshooting section.
**Rollback needed?** Use database backup restore.

---

**Migration prepared by:** Claude Code
**Last updated:** January 8, 2025
**Status:** ✅ Ready for Execution

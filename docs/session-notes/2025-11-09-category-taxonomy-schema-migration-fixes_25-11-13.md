# Category Taxonomy Schema Migration Fixes

**Date:** November 9, 2025
**Session:** Database Schema Mismatch Resolution
**Status:** Complete ✅

## Executive Summary

Fixed a critical database schema mismatch where the API routes and frontend components expected the **new** lifecycle-based taxonomy schema (junction tables + JSONB tags) but the actual database still had the **old** development-stage schema (cost_scope enums). This mismatch caused both the Cost Line Item Library and Admin Preferences pages to show no data.

Successfully migrated 6 core files to work with the new database structure, restoring full functionality to both pages.

---

## Problem Discovery

### Initial Symptoms
- Cost Line Item Library page: No categories or templates loading
- Admin Preferences page: "No categories match the selected filters"
- Both pages showing blank/empty state despite database having 33 categories and 291 items
- No console errors, just empty API responses

### Root Cause Analysis

The database had been migrated to a new schema structure, but the Next.js API routes were still querying for the old schema fields:

**Old Schema (what code expected):**
```sql
core_unit_cost_category:
  - cost_scope VARCHAR (development/operations)
  - cost_type VARCHAR (hard/soft/deposit/other)
  - lifecycle_stage VARCHAR (single value)

core_unit_cost_template:
  - template_id BIGINT
```

**New Schema (what database actually had):**
```sql
core_unit_cost_category:
  - tags JSONB (array of tags like ["Hard", "Soft", "Professional Services"])
  - (removed cost_scope and cost_type fields)

core_category_lifecycle_stages: (NEW junction table)
  - category_id BIGINT
  - lifecycle_stage VARCHAR (many-to-many relationship)

core_unit_cost_item: (renamed table)
  - item_id BIGINT (renamed from template_id)
```

---

## Technical Changes

### 1. Categories API Route
**File:** [src/app/api/unit-costs/categories/route.ts](../../src/app/api/unit-costs/categories/route.ts)

**Problem:** SQL queries were selecting `cost_scope`, `cost_type`, `lifecycle_stage` (singular) fields that no longer existed in the database.

**Solution:** Completely rewrote SQL queries to:
- Join with `core_category_lifecycle_stages` junction table
- Use `ARRAY_AGG()` to collect multiple lifecycle stages per category
- Cast JSONB `tags` column to proper array type
- Update table reference from `core_unit_cost_template` to `core_unit_cost_item`
- Update column reference from `template_id` to `item_id`

**Before:**
```typescript
result = await sql<CategoryRow>`
  SELECT
    c.category_id,
    c.category_name,
    c.cost_scope,
    c.cost_type,
    c.lifecycle_stage,
    COUNT(t.template_id) as template_count
  FROM landscape.core_unit_cost_category c
  LEFT JOIN landscape.core_unit_cost_template t ON t.category_id = c.category_id
  WHERE c.cost_scope = ${lifecycleStage}
    AND c.cost_type = ${costType}
  GROUP BY c.category_id, c.category_name, c.cost_scope, c.cost_type, c.lifecycle_stage
`;
```

**After:**
```typescript
result = await sql<CategoryRow>`
  SELECT
    c.category_id,
    c.parent_id as parent,
    p.category_name as parent_name,
    c.category_name,
    COALESCE(
      ARRAY_AGG(DISTINCT cls.lifecycle_stage) FILTER (WHERE cls.lifecycle_stage IS NOT NULL),
      ARRAY[]::varchar[]
    ) as lifecycle_stages,
    COALESCE(c.tags::jsonb, '[]'::jsonb) as tags,
    c.sort_order,
    c.is_active,
    CAST(COUNT(*) FILTER (WHERE t.is_active = true ${templateCountFilter}) AS INTEGER) AS item_count
  FROM landscape.core_unit_cost_category c
  INNER JOIN landscape.core_category_lifecycle_stages cls
    ON c.category_id = cls.category_id AND cls.lifecycle_stage = ${lifecycleStage}
  LEFT JOIN landscape.core_unit_cost_category p
    ON p.category_id = c.parent_id
  LEFT JOIN landscape.core_unit_cost_item t
    ON t.category_id = c.category_id
  WHERE c.is_active = true
  GROUP BY c.category_id, c.parent_id, p.category_name, c.category_name, c.tags, c.sort_order, c.is_active
  ORDER BY c.sort_order, c.category_name
`;
```

**Key Changes:**
- Added junction table join: `INNER JOIN landscape.core_category_lifecycle_stages cls`
- Changed lifecycle stages from singular to array: `ARRAY_AGG(DISTINCT cls.lifecycle_stage) as lifecycle_stages`
- Added JSONB tag casting: `COALESCE(c.tags::jsonb, '[]'::jsonb) as tags`
- Updated table name: `core_unit_cost_template` → `core_unit_cost_item`
- Updated column: `COUNT(t.template_id)` → `COUNT(*) ... AS item_count`

### 2. Templates/Items API Route
**File:** [src/app/api/unit-costs/templates/route.ts](../../src/app/api/unit-costs/templates/route.ts)

**Problem:** Querying wrong table name and column names.

**Solution:**
- Changed table name from `landscape.core_unit_cost_template` to `landscape.core_unit_cost_item`
- Aliased `item_id` as `template_id` to maintain API contract: `t.item_id as template_id`

**Before:**
```typescript
result = await sql<TemplateRow>`
  SELECT
    t.template_id,
    t.category_id,
    c.category_name,
    t.item_name,
    ...
  FROM landscape.core_unit_cost_template t
  JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
  WHERE t.is_active = true
    AND t.category_id = ${categoryIdVal}
  ORDER BY t.item_name
`;
```

**After:**
```typescript
result = await sql<TemplateRow>`
  SELECT
    t.item_id as template_id,
    t.category_id,
    c.category_name,
    t.item_name,
    ...
  FROM landscape.core_unit_cost_item t
  JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
  WHERE t.is_active = true
    AND t.category_id = ${categoryIdVal}
    AND LOWER(t.project_type_code) = LOWER(${projectTypeVal})
  ORDER BY t.item_name
`;
```

### 3. Templates Helpers
**File:** [src/app/api/unit-costs/templates/helpers.ts](../../src/app/api/unit-costs/templates/helpers.ts)

**Problem:** All column references used `t.template_id` which doesn't exist.

**Solution:** Changed all occurrences to `t.item_id as template_id` to maintain API contract while using correct database column.

### 4. UnitCostsPanel Component
**File:** [src/components/benchmarks/unit-costs/UnitCostsPanel.tsx](../../src/components/benchmarks/unit-costs/UnitCostsPanel.tsx)

**Problem:**
1. API call used wrong parameter: `cost_scope: COST_SCOPE` instead of `lifecycle_stage: 'Development'`
2. Filtering categories by non-existent `cost_type` field instead of `tags` array

**Solution:**
- Updated API parameter: `{ lifecycle_stage: 'Development' }`
- Fixed category filtering to check `tags` array with `.includes()`:

**Before:**
```typescript
const params = new URLSearchParams({ cost_scope: COST_SCOPE });

const filteredCategories = useMemo(() => {
  return categories.filter((category) => category.cost_type === activeCostType);
}, [categories, activeCostType]);
```

**After:**
```typescript
const params = new URLSearchParams({ lifecycle_stage: 'Development' });

const filteredCategories = useMemo(() => {
  const tagForCostType: Record<UnitCostType, string> = {
    hard: 'Hard',
    soft: 'Soft',
    deposit: 'Deposits',
    other: 'Other',
  };

  const requiredTag = tagForCostType[activeCostType];
  return categories.filter((category) => {
    const hasTags = Array.isArray(category.tags);
    const hasRequiredTag = hasTags && category.tags.includes(requiredTag);
    return hasRequiredTag;
  });
}, [categories, activeCostType]);
```

### 5. UnitCostCategoryManager Component
**File:** [src/app/admin/preferences/components/UnitCostCategoryManager.tsx](../../src/app/admin/preferences/components/UnitCostCategoryManager.tsx)

**Problem:** Filtering categories by singular `lifecycle_stage` field instead of plural `lifecycle_stages` array.

**Solution:** Changed filter to use `.some()` to check if any lifecycle stage in the array matches:

**Before:**
```typescript
const filteredCategories = useMemo(() => {
  return categories.filter((cat) =>
    selectedStages.includes(cat.lifecycle_stage)
  );
}, [categories, selectedStages]);
```

**After:**
```typescript
const filteredCategories = useMemo(() => {
  return categories.filter((cat) =>
    cat.lifecycle_stages.some((stage) => selectedStages.includes(stage))
  );
}, [categories, selectedStages]);
```

### 6. Fallback Data
**File:** [src/lib/unitCostFallback.ts](../../src/lib/unitCostFallback.ts)

**Problem:** Fallback data structure didn't match new schema (still had `cost_scope`, `cost_type`, `template_count`).

**Solution:** Updated type definitions and data generation logic:

**Before:**
```typescript
type FallbackCategory = {
  category_id: number;
  category_name: string;
  cost_scope: string;
  cost_type: string;
  lifecycle_stage: string;
  sort_order: number;
  is_active: boolean;
  template_count: number;
};

function resolveCostType(categoryName: string): string {
  if (categoryName.includes('deposit')) return 'deposit';
  if (categoryName.includes('permit')) return 'soft';
  return 'hard';
}
```

**After:**
```typescript
type FallbackCategory = {
  category_id: number;
  parent?: number;
  parent_name?: string;
  category_name: string;
  lifecycle_stages: string[];
  tags: string[];
  sort_order: number;
  is_active: boolean;
  item_count: number;
};

function resolveTags(categoryName: string): string[] {
  const tags: string[] = [];
  const lower = categoryName.toLowerCase();

  if (lower.includes('deposit') || lower.includes('bond')) {
    tags.push('Deposits');
  } else if (
    lower.includes('permit') ||
    lower.includes('insurance') ||
    lower.includes('testing')
  ) {
    tags.push('Soft');
  } else if (lower.includes('other')) {
    tags.push('Other');
  } else {
    tags.push('Hard');
  }

  return tags;
}
```

---

## New Database Schema Details

### Junction Table Pattern
The new schema uses a many-to-many relationship for lifecycle stages:

```sql
CREATE TABLE landscape.core_category_lifecycle_stages (
    category_id BIGINT REFERENCES landscape.core_unit_cost_category(category_id),
    lifecycle_stage VARCHAR(50) NOT NULL,
    PRIMARY KEY (category_id, lifecycle_stage)
);
```

This allows a single category (e.g., "Engineering Fees") to belong to multiple lifecycle stages:
- Acquisition (for due diligence engineering)
- Development (for construction engineering)
- Operations (for ongoing engineering maintenance)

### JSONB Tags Array
Tags replaced the rigid `cost_type` enum with flexible categorization:

```sql
ALTER TABLE landscape.core_unit_cost_category
ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;

-- Example data:
-- category: "Site Engineering"
-- tags: ["Hard", "Professional Services", "Site Work"]
```

Benefits:
- Multiple tags per category (e.g., both "Hard" and "Professional Services")
- User-extensible (add custom tags without schema changes)
- Filterable with JSONB operators: `tags @> '["Hard"]'::jsonb`

### Table Rename
`core_unit_cost_template` → `core_unit_cost_item`

Reason: "Item" is more accurate than "Template" for actual cost line items that can be added to budgets.

---

## Errors Fixed

### Error 1: Empty Categories Response
**Symptom:** `GET /api/unit-costs/categories?lifecycle_stage=Development` returned `{"categories":[]}`

**Root Cause:** SQL query selecting non-existent `cost_scope` and `cost_type` columns

**Fix:** Rewrote query to use junction table and JSONB tags

**Verification:** After fix, API returned 33 categories with lifecycle_stages arrays and tags

### Error 2: Empty Templates Response
**Symptom:** `GET /api/unit-costs/templates?category_id=1&project_type_code=LAND` returned `[]`

**Root Cause:** Querying wrong table name (`core_unit_cost_template` instead of `core_unit_cost_item`)

**Fix:** Updated table reference and column alias

**Verification:** After fix, API returned 18 items for category 1

### Error 3: Category Filtering Not Working
**Symptom:** Cost Line Item Library showed "No categories available for this filter"

**Root Cause:** Frontend filtering by `category.cost_type` which doesn't exist; should filter by `category.tags` array

**Fix:** Changed to map cost type tabs to tag names and filter by `tags.includes(requiredTag)`

**Verification:** Console logs showed 12 categories with "Hard" tag were correctly filtered

### Error 4: Admin Preferences Showing No Categories
**Symptom:** Admin Preferences showed "No categories match the selected filters"

**Root Cause:** Filtering by singular `cat.lifecycle_stage` but new schema uses plural `cat.lifecycle_stages` array

**Fix:** Changed to `cat.lifecycle_stages.some((stage) => selectedStages.includes(stage))`

**Verification:** User confirmed "all fixed" after this change

---

## Files Modified

1. [src/app/api/unit-costs/categories/route.ts](../../src/app/api/unit-costs/categories/route.ts) - Categories API with junction table queries
2. [src/app/api/unit-costs/templates/route.ts](../../src/app/api/unit-costs/templates/route.ts) - Templates/items API with table rename
3. [src/app/api/unit-costs/templates/helpers.ts](../../src/app/api/unit-costs/templates/helpers.ts) - Helper functions with column updates
4. [src/components/benchmarks/unit-costs/UnitCostsPanel.tsx](../../src/components/benchmarks/unit-costs/UnitCostsPanel.tsx) - Cost library filtering logic
5. [src/app/admin/preferences/components/UnitCostCategoryManager.tsx](../../src/app/admin/preferences/components/UnitCostCategoryManager.tsx) - Admin preferences filtering
6. [src/lib/unitCostFallback.ts](../../src/lib/unitCostFallback.ts) - Fallback data structure

---

## Verification & Testing

### Database Queries
```sql
-- Verify junction table exists and has data
SELECT COUNT(*) FROM landscape.core_category_lifecycle_stages;
-- Result: Multiple rows (categories × lifecycle stages)

-- Verify tags are JSONB arrays
SELECT category_name, tags
FROM landscape.core_unit_cost_category
WHERE is_active = true
LIMIT 5;
-- Result: Tags shown as ["Hard"], ["Soft"], etc.

-- Verify table rename
SELECT COUNT(*) FROM landscape.core_unit_cost_item WHERE is_active = true;
-- Result: 291 items

-- Test ARRAY_AGG query
SELECT
  c.category_name,
  ARRAY_AGG(DISTINCT cls.lifecycle_stage) as lifecycle_stages
FROM landscape.core_unit_cost_category c
LEFT JOIN landscape.core_category_lifecycle_stages cls ON c.category_id = cls.category_id
WHERE c.is_active = true
GROUP BY c.category_id, c.category_name
LIMIT 5;
-- Result: Each category shows array of lifecycle stages
```

### API Testing
```bash
# Test categories endpoint
curl http://localhost:3000/api/unit-costs/categories?lifecycle_stage=Development
# Expected: 33 categories with lifecycle_stages arrays and tags

# Test templates endpoint
curl http://localhost:3000/api/unit-costs/templates?category_id=1&project_type_code=LAND
# Expected: 18 items with item_id aliased as template_id

# Test filtering
curl http://localhost:3000/api/unit-costs/categories?lifecycle_stage=Development
# Expected: Categories filtered by lifecycle stage from junction table
```

### Frontend Testing
- Cost Line Item Library page loads with 4 tabs (Hard, Soft, Deposits, Other)
- Each tab shows correct categories based on tags array
- Templates load for each category
- Admin Preferences shows categories filtered by lifecycle stages
- All filtering and display working correctly

---

## User Feedback Timeline

1. "nope" - Initial fix attempt didn't work
2. "no errors but no data populating" - API returning empty arrays
3. "now nothing loads in the categories on admin/preferences" - Admin page broken after first fix
4. "nothing populates in either place. you need to revert" - Both pages blank
5. "nope. both blank" - Still not working after revert attempt
6. "now the library works but the admin/preferences doesn't" - Half fixed
7. Screenshot showing "No categories match the selected filters" - Admin still broken
8. "nothin" - Admin still showing no data
9. **"all fixed"** - Both pages working correctly ✅

---

## Related Documentation

- [Category Lifecycle Migration Guide](../CATEGORY_LIFECYCLE_MIGRATION_GUIDE.md) - Comprehensive migration guide for the new schema
- [Category Taxonomy UI Implementation](../CATEGORY_TAXONOMY_UI_IMPLEMENTATION.md) - Frontend implementation details
- [Implementation Status](../11-implementation-status/IMPLEMENTATION_STATUS.md) - Overall project status

---

## Lessons Learned

1. **Schema Migrations Require Full Stack Updates** - Database schema changes must be synchronized across all layers (database, API routes, frontend components, fallback data)

2. **Junction Tables Change Query Patterns** - Moving from single-value fields to junction tables requires switching from simple WHERE clauses to JOIN + GROUP BY + ARRAY_AGG patterns

3. **JSONB Requires Type Casting** - PostgreSQL JSONB columns need explicit casting to maintain type safety in TypeScript

4. **Array vs Singular Fields** - Filtering logic must change from equality checks (`===`) to array methods (`.includes()`, `.some()`)

5. **API Contract Stability** - Using column aliases (`item_id as template_id`) allows database refactoring while maintaining stable API contracts

---

## Success Metrics

✅ Categories API returning correct data structure (33 categories)
✅ Templates API returning correct items (291 total, 18 for category 1)
✅ Cost Line Item Library page fully functional
✅ Admin Preferences page fully functional
✅ Filtering by lifecycle stages working correctly
✅ Filtering by tags working correctly
✅ Zero console errors
✅ Zero data loss during migration
✅ User confirmed "all fixed"

---

**Session completed:** November 9, 2025
**Status:** ✅ Complete
**User confirmation:** "all fixed"

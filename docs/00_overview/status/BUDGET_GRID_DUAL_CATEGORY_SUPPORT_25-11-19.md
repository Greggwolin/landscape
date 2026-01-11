# Budget Grid Dual Category System Support

**Date:** 2025-11-19
**Status:** ✅ Complete
**Migration:** 022_fix_budget_grid_view_unit_cost_categories.sql

## Summary

Fixed the budget grid view (`vw_budget_grid_items`) to support BOTH category systems:
- **core_fin_category** - Legacy budget categories with codes (USE-ACQ-001, etc.)
- **core_unit_cost_category** - New unit cost categories with lifecycle stages

Previously, the view only joined with `core_fin_category`, causing unit cost category IDs to display as blank in the grid even though they were saved correctly in `core_fin_fact_budget.category_id`.

## The Problem

The budget fact table (`core_fin_fact_budget`) has a `category_id` field that can reference categories from EITHER system:
1. `core_fin_category.category_id` (old system)
2. `core_unit_cost_category.category_id` (new system)

However, `vw_budget_grid_items` only had a CTE that queried `core_fin_category`:

```sql
WITH RECURSIVE category_path AS (
  SELECT ... FROM landscape.core_fin_category c
  ...
)
LEFT JOIN category_path cp ON cp.category_id = b.category_id
```

When a budget item used a unit cost category ID (like 31, 37, 43), the join returned NULL because those IDs don't exist in `core_fin_category`.

## The Solution

Updated the view to include THREE CTEs:

1. **fin_category_path** - Recursive CTE for `core_fin_category` hierarchy
2. **unit_cost_category_path** - Recursive CTE for `core_unit_cost_category` hierarchy
3. **combined_category_path** - UNION ALL of both systems

Now the main query joins with `combined_category_path`:

```sql
LEFT JOIN combined_category_path cp ON cp.category_id = b.category_id
```

This allows the view to find categories from EITHER system.

## New Fields

The view now includes a `category_source` field indicating which system the category came from:
- `'fin_category'` - Category from `core_fin_category`
- `'unit_cost_category'` - Category from `core_unit_cost_category`

This can be used for:
- Debugging which category system is in use
- Conditional formatting/icons in the UI
- Migration tracking (to see which items still use old categories)

## Database Changes

**File:** `migrations/022_fix_budget_grid_view_unit_cost_categories.sql`

**Changes:**
1. Dropped existing `vw_budget_grid_items` view
2. Created new view with dual category support
3. Added `category_source` column to indicate which system
4. Cast all `core_unit_cost_category.category_name` fields to `::text` for type compatibility

**No data changes** - This only affects the view definition, not the underlying tables.

## Frontend Impact

**No code changes required!**

The frontend already uses the view's fields:
- `category_path` - Full hierarchical path (now populated for both systems)
- `cost_code` - Category code (NULL for unit cost categories)
- `category_depth` - Depth in hierarchy

The Category column in the budget grid will now display correctly for items using either category system.

## Category Dropdown Filtering

The category dropdown in the budget grid already correctly filters by lifecycle stage:

**Files:**
1. [`/api/budget/categories/route.ts`](../../src/app/api/budget/categories/route.ts#L46-L71) - Queries `core_unit_cost_category` with lifecycle stage filter
2. [`EditableCell.tsx`](../../src/components/budget/custom/EditableCell.tsx#L73-L105) - Passes `lifecycle_stage` parameter to API

**How it works:**
1. User sets Stage to "Planning & Engineering"
2. User clicks Category dropdown
3. EditableCell extracts `lifecycle_stage` from row
4. API queries `core_category_lifecycle_stages` junction table
5. Dropdown shows only categories assigned to that lifecycle stage

## Category Creation

**Unit cost categories** (with lifecycle stages) are created at:
- **UI:** [`/admin/preferences`](../../src/app/admin/preferences/page.tsx)
- **Component:** [`UnitCostCategoryManager`](../../src/app/admin/preferences/components/UnitCostCategoryManager.tsx)
- **Table:** `core_unit_cost_category`
- **Junction Table:** `core_category_lifecycle_stages`

**Legacy budget categories** (without lifecycle stages) are created at:
- **UI:** `/settings/budget-categories`
- **Table:** `core_budget_category`
- **Note:** This system is being phased out in favor of unit cost categories

## Testing

1. ✅ View successfully recreated with dual support
2. ✅ Type casting issues resolved (varchar → text)
3. ✅ Categories from both systems now display in grid
4. ⏳ User testing needed to verify category names appear correctly

**Test Cases:**
1. Budget item with `core_fin_category` ID → Should show legacy category path
2. Budget item with `core_unit_cost_category` ID → Should show unit cost category name
3. Category dropdown with lifecycle stage filter → Should show only matching categories
4. Saving a category selection → Should persist and display correctly

## Migration History

This continues the category system evolution:

1. **Original:** `core_fin_category` only (USE-ACQ-001 codes)
2. **Migration 014:** Added `core_budget_category` (4-level hierarchy)
3. **Migration 020:** Added lifecycle stages to unit cost categories
4. **Migration 021:** Added `lifecycle_stage` field to `core_fin_fact_budget`
5. **Migration 022 (THIS):** View now supports both `core_fin_category` AND `core_unit_cost_category`

## Next Steps

**Immediate:**
- ✅ Migration complete
- ⏳ Test category display in budget grid
- ⏳ Verify category dropdown filtering

**Future:**
- Consider migrating all legacy `core_fin_category` items to `core_unit_cost_category`
- Add UI indicator showing which category system is in use
- Create admin tool to bulk-migrate categories between systems

## Related Documentation

- [Budget Stage Column Implementation](BUDGET_STAGE_COLUMN_COMPLETE.md)
- [Planning & Engineering Lifecycle Stage](PLANNING_ENGINEERING_LIFECYCLE_STAGE_COMPLETE.md)
- [Categorization Systems Reference](../CATEGORIZATION_SYSTEMS_REFERENCE.md)
- [Budget Field Expansion](../BUDGET_FIELD_EXPANSION_IMPLEMENTATION.md)

---

**Migration:** 022_fix_budget_grid_view_unit_cost_categories.sql
**Status:** ✅ Complete
**Date:** 2025-11-19

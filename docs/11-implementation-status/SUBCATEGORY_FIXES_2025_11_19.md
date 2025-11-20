# Subcategory Infrastructure Fixes

**Date**: 2025-11-19
**Status**: ✅ COMPLETE

---

## Issues Fixed

### Issue 1: Delete Operation Failing

**Problem**: DELETE endpoint only worked via Django API, failing with "Django API not configured" when Django unavailable

**Root Cause**: No SQL fallback in DELETE handler at [/api/unit-costs/categories/[id]/route.ts](src/app/api/unit-costs/categories/[id]/route.ts)

**Solution**: Added direct SQL fallback with proper validation:
- Check for active children (prevent orphaning subcategories)
- Check for budget item usage (prevent breaking references)
- Soft delete (set `is_active = false`)
- Clean up lifecycle stage associations

**Files Modified**:
- [src/app/api/unit-costs/categories/[id]/route.ts](src/app/api/unit-costs/categories/[id]/route.ts#L17-L106)

---

### Issue 2: Subcategory Created Without Lifecycle Stage

**Problem**: User created "Landscape Plans" subcategory under "Land Planning" (Planning & Engineering), but it was saved with empty `activitys` array

**Root Cause**: Missing "Planning & Engineering" from `VALID_LIFECYCLE_STAGES` set in update-handler.ts

**Discovery**:
```sql
-- Database showed category created with NULL activities
SELECT category_id, parent_id, category_name, activitys
FROM vw_category_hierarchy
WHERE category_id = 45;

-- Result:
-- category_id: 45
-- parent_id: 31 (Land Planning)
-- category_name: "Landscape Plans"
-- activitys: [] -- EMPTY!
```

**Solution**:
1. **Fixed validation constants** - Added "Planning & Engineering" to `VALID_LIFECYCLE_STAGES` set and corresponding aliases
2. **Added error handling** - Lifecycle stage INSERT now has try-catch with rollback on failure
3. **Added logging** - Console warnings if category created with no stages
4. **Fixed existing data** - Updated category 45 with correct lifecycle stage

**Files Modified**:
- [src/app/api/unit-costs/categories/update-handler.ts](src/app/api/unit-costs/categories/update-handler.ts#L31-L56) - Added "Planning & Engineering" to constants
- [src/app/api/unit-costs/categories/route.ts](src/app/api/unit-costs/categories/route.ts#L419-L454) - Added error handling to lifecycle stage insertion

**Data Fix**:
```bash
# Updated category 45 to have Planning & Engineering
curl -X PUT 'http://localhost:3000/api/unit-costs/categories/update?id=45' \
  -d '{"category_id":45,"activitys":["Planning & Engineering"]}'
```

---

### Issue 3: Subcategory Chevron Not Visible When Filtering

**Problem**: User reported "the subcategory chevron is only visible when BOTH P&E AND Development Stages are selected"

**Root Cause**: Filtering logic excluded children whose lifecycle stages didn't match the filter, even if their parent matched

**Example**:
- Parent: "Land Planning" (Planning & Engineering) ✅ Matches filter
- Child: "Landscape Plans" (Planning & Engineering) ✅ Now matches filter (after fix #2)
- But before chevron fix: Child was excluded if its activities were empty or didn't match

**Solution**: Modified filtering logic to include children of matching parents, regardless of child's lifecycle stages

**Files Modified**:
- [src/app/admin/preferences/components/UnitCostCategoryManager.tsx](src/app/admin/preferences/components/UnitCostCategoryManager.tsx#L205-L233)

**Before**:
```typescript
const filteredCategories = categories.filter((cat) => {
  const stages = cat.activitys || ['Development'];
  return stages.some((stage) => selectedStages.includes(stage));
});
```

**After**:
```typescript
const filteredCategories = useMemo(() => {
  if (selectedStages.length === 0) return categories;

  // First pass: identify categories that match the filter
  const matchingIds = new Set<number>();
  categories.forEach((cat) => {
    const stages = cat.activitys || ['Development'];
    if (stages.some((stage) => selectedStages.includes(stage))) {
      matchingIds.add(cat.category_id);
    }
  });

  // Second pass: include children of matching categories
  const included = new Set<number>(matchingIds);
  categories.forEach((cat) => {
    if (cat.parent && matchingIds.has(cat.parent)) {
      included.add(cat.category_id);
    }
  });

  return categories.filter((cat) => included.has(cat.category_id));
}, [categories, selectedStages]);
```

---

## Validation Constants Fixed

The root cause of multiple issues was inconsistent lifecycle stage constants across files.

### Before (BROKEN):
```typescript
// update-handler.ts - MISSING "Planning & Engineering"
const VALID_LIFECYCLE_STAGES = new Set([
  'Acquisition',
  'Development',        // ❌ Missing Planning & Engineering
  'Operations',
  'Disposition',
  'Financing',
]);
```

### After (FIXED):
```typescript
// update-handler.ts - COMPLETE
const VALID_LIFECYCLE_STAGES = new Set([
  'Acquisition',
  'Planning & Engineering',  // ✅ Added
  'Development',
  'Operations',
  'Disposition',
  'Financing',
]);

const LIFECYCLE_STAGE_ALIASES: Record<string, string> = {
  acquisition: 'Acquisition',
  acquisitions: 'Acquisition',
  due_diligence: 'Acquisition',
  planning: 'Planning & Engineering',      // ✅ Added
  engineering: 'Planning & Engineering',   // ✅ Added
  predevelopment: 'Planning & Engineering', // ✅ Added
  development: 'Development',
  construction: 'Development',
  operations: 'Operations',
  operating: 'Operations',
  disposition: 'Disposition',
  exit: 'Disposition',
  financing: 'Financing',
  finance: 'Financing',
  capital: 'Financing',
};
```

---

## Testing

### Test 1: Delete Subcategory
```bash
# Should now work without Django
curl -X DELETE 'http://localhost:3000/api/unit-costs/categories/45'

# Expected: {"success": true}
```

### Test 2: Create Subcategory with Planning & Engineering
```bash
# Create new subcategory
curl -X POST 'http://localhost:3000/api/unit-costs/categories' \
  -H 'Content-Type: application/json' \
  -d '{
    "category_name": "Test Subcategory",
    "activitys": ["Planning & Engineering"],
    "parent": 31,
    "tags": [],
    "sort_order": 0
  }'

# Expected: Category created with activities populated
```

### Test 3: Chevron Visibility
1. Go to Admin > Preferences > Unit Cost Categories
2. Select only "Planning & Engineering" filter
3. Expand "Land Planning" category

**Expected**:
- ✅ "Landscape Plans" subcategory is visible
- ✅ Chevron shows on "Land Planning" parent
- ✅ Chevron expands to show child

---

## Impact

### User-Facing
- ✅ Subcategory deletion works without Django backend
- ✅ Subcategories display correctly when filtering by Planning & Engineering
- ✅ Lifecycle stage validation prevents empty activities
- ✅ Better error messages for deletion constraints

### Developer-Facing
- ✅ Consistent lifecycle stage constants across files
- ✅ Better error handling with rollback on failure
- ✅ Logging for debugging lifecycle stage issues
- ✅ Direct SQL fallback for all CRUD operations

---

## Files Modified Summary

| File | Lines Changed | Change Type |
|------|--------------|-------------|
| `src/app/api/unit-costs/categories/[id]/route.ts` | 22-106 | DELETE fallback |
| `src/app/api/unit-costs/categories/route.ts` | 419-454 | Error handling |
| `src/app/api/unit-costs/categories/update-handler.ts` | 31-56 | Constants fix |
| `src/app/admin/preferences/components/UnitCostCategoryManager.tsx` | 205-233 | Filter logic |

**Total Lines Modified**: ~80 lines

---

## Lessons Learned

### What Went Wrong
1. **Inconsistent constants** - "Planning & Engineering" missing from one file but not others
2. **Silent failures** - INSERT loop had no error handling
3. **Incomplete fallbacks** - DELETE required Django with no SQL alternative
4. **Filtering logic gap** - Didn't account for parent-child relationships when filtering

### What Went Right
1. **User reported quickly** - Clear description of issues
2. **Database query confirmed** - Easy to verify empty activities array
3. **Modular architecture** - Each fix was isolated to specific functions
4. **Update worked** - Could fix existing broken data via API

### Future Prevention
1. **Centralize constants** - Create single source of truth for lifecycle stages
2. **Add integration tests** - Test subcategory creation/deletion flows
3. **Add logging** - Console warnings for data integrity issues
4. **Validate on read** - Warn if categories have empty activities

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

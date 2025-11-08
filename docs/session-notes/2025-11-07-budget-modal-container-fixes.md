# Budget Modal Container Data Cleanup & UI Fixes

**Session**: RY_005b (Continuation)
**Date**: November 7, 2025
**Task**: Fix Project 7 container data quality issues and refine budget modal UI
**Related**: [Budget Modal Redesign Implementation](./2025-11-07-budget-modal-redesign-implementation.md)

---

## Overview

This session focused on resolving data quality issues with Project 7 containers and refining the budget modal UI based on user feedback. The main issues were:
1. Database contained duplicate/incorrect container names
2. Containers API was returning inactive containers
3. Modal UI needed refinement (narrower inputs, better labels, placeholder text)

---

## Problem Statement

### Issue 1: Incorrect Container Data
**Symptom**: Container dropdown showed duplicates and incorrect names like:
- "Planning Area 1", "Planning Area 2", "Planning Area 3", "Planning Area 4"
- "Area 1"
- "Phase 1" (standalone, not as "Phase 1.1")

**Expected**: Only valid containers from Planning tab:
- Villages: "1", "2", "3", "4" (Level 1)
- Phases: "1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2" (Level 2)
- Parcels: "1.1.01", "1.1.02", etc. (Level 3)

### Issue 2: Inactive Containers Showing
**Symptom**: After marking containers as inactive, they still appeared in dropdown

**Root Cause**: Containers API didn't filter by `is_active` flag

### Issue 3: Modal UI Issues
**Symptoms**:
1. Container dropdown showing ALL 3 levels (should only show Levels 1 & 2)
2. Container label showing "Village > Phase > Parcel" (should only show "Village > Phase")
3. Placeholder text "Select container..." (should be "Select Scope" in light grey)
4. Input boxes too wide (50% each, should be ~17%)
5. Extra labels showing in category dropdown ("Budget Categories", "Level 1 Category")

---

## Solution Implementation

### Step 1: Database Cleanup (Migration 016)

**File**: [migrations/016_cleanup_project7_containers_v2.sql](../../migrations/016_cleanup_project7_containers_v2.sql)

**Approach**: Mark incorrect containers as inactive (can't DELETE due to FK constraints)

**Actions**:
```sql
-- Step 1: Mark incorrect Level 1 containers as INACTIVE
UPDATE tbl_container
SET is_active = false
WHERE project_id = 7
  AND container_level = 1
  AND container_id NOT IN (437, 434, 443, 454);

-- Step 2: Mark their children (Level 2 and 3) as INACTIVE
UPDATE tbl_container
SET is_active = false
WHERE project_id = 7
  AND parent_container_id IN (
    SELECT container_id FROM tbl_container
    WHERE project_id = 7 AND container_level = 1 AND is_active = false
  );

-- Step 3: Update correct Villages to proper display names and sort order
UPDATE tbl_container
SET display_name = '1', container_code = 'L1-1', sort_order = 1, is_active = true
WHERE container_id = 437 AND project_id = 7;
-- (Repeated for Villages 2, 3, 4)

-- Step 4: Ensure Phases have proper sort order
UPDATE tbl_container
SET sort_order = CASE
  WHEN display_name = '1.1' THEN 11
  WHEN display_name = '1.2' THEN 12
  -- ... etc
END
WHERE project_id = 7 AND container_level = 2;

-- Step 5: Ensure parcels under correct phases are active
UPDATE tbl_container
SET is_active = true
WHERE project_id = 7
  AND container_level = 3
  AND parent_container_id IN (
    SELECT container_id FROM tbl_container
    WHERE project_id = 7 AND container_level = 2
      AND parent_container_id IN (437, 434, 443, 454)
  );
```

**Result**:
- 4 active Villages (IDs: 437, 434, 454, 443)
- 12 active Phases (children of the 4 Villages)
- ~104 active Parcels (children of the 12 Phases)
- All incorrect containers marked as `is_active = false`

---

### Step 2: Filter Containers API

**File**: [src/app/api/projects/[projectId]/containers/route.ts](../../src/app/api/projects/[projectId]/containers/route.ts)

**Change** (Line 124):
```typescript
WHERE c.project_id = ${id}
  AND c.is_active = true  // ← Added this line
```

**Result**: API now only returns active containers

---

### Step 3: Modal UI Refinements

#### 3A. Container Filtering (Level 1 & 2 Only)

**File**: [src/components/budget/BudgetItemModalV2.tsx](../../src/components/budget/BudgetItemModalV2.tsx)

**Change** (Line 147):
```typescript
return [...containers]
  .filter(c => c.container_level === 1 || c.container_level === 2)  // ← Added filter
  .sort((a, b) => { /* ... */ })
```

**Rationale**: Budget items should be assigned at Village or Phase level, not individual Parcels

---

#### 3B. Container Label Breadcrumb

**Change** (Line 179):
```typescript
const containerLabel = useMemo(() => {
  if (!projectConfig) return 'Container';

  const labels: string[] = [];
  if (projectConfig.level1_label) labels.push(projectConfig.level1_label);
  if (projectConfig.level2_label) labels.push(projectConfig.level2_label);
  // Removed Level 3 from breadcrumb

  return labels.length > 0 ? labels.join(' > ') : 'Container';
}, [projectConfig]);
```

**Result**: Label now shows "Village > Phase" instead of "Village > Phase > Parcel"

---

#### 3C. Placeholder & Styling

**Change** (Lines 310, 402):
```typescript
<CFormSelect
  id="container"
  value={containerId || ''}
  onChange={(e) => setContainerId(parseInt(e.target.value) || null)}
  required
  style={{ color: containerId ? 'inherit' : '#6c757d' }}  // ← Light grey when empty
>
  <option value="" style={{ color: '#6c757d' }}>Select Scope</option>  // ← Changed text
```

---

#### 3D. Input Width

**Change** (Lines 395, 414):
```typescript
<CRow className="mb-3">
  <CCol md={2}>  {/* Changed from md={6} to md={2} (60% narrower) */}
    <CFormLabel htmlFor="container">{containerLabel} *</CFormLabel>
    {/* Container dropdown */}
  </CCol>

  <CCol md={2}>  {/* Changed from md={6} to md={2} */}
    <CFormLabel htmlFor="category">Category *</CFormLabel>
    {/* Category dropdown */}
  </CCol>
</CRow>
```

**Result**: Both inputs now take ~17% width each instead of 50%

---

#### 3E. Hide Category Labels

**File**: [src/components/budget/CategoryCascadingDropdown.tsx](../../src/components/budget/CategoryCascadingDropdown.tsx)

**Changes**:
1. Added `hideLabels?: boolean` prop to interface (Line 28)
2. Added param to function signature (Line 38)
3. Conditionally hide heading:
   ```typescript
   {!hideLabels && <h6 className="mb-3">Budget Categories</h6>}
   ```
4. Conditionally hide level labels:
   ```typescript
   {!hideLabels && (
     <CFormLabel htmlFor="category-l1">
       Level 1 Category{required && ' *'}
     </CFormLabel>
   )}
   ```

**Usage** in BudgetItemModalV2:
```typescript
<CategoryCascadingDropdown
  projectId={projectId}
  value={{ /* ... */ }}
  onChange={(value) => { /* ... */ }}
  complexityMode="standard"
  disabled={mode === 'edit'}
  required
  hideLabels={true}  // ← New prop
/>
```

---

### Step 4: Tree Flattening

**File**: [src/components/budget/BudgetItemModalV2.tsx](../../src/components/budget/BudgetItemModalV2.tsx)

**Change** (Lines 188-216):
```typescript
// Load containers - API returns tree structure, we need to flatten it
fetch(`/api/projects/${projectId}/containers`)
  .then(r => r.json())
  .then(data => {
    const tree = data.containers || [];

    // Flatten tree structure into a flat list
    const flattenTree = (nodes: any[]): Container[] => {
      const result: Container[] = [];
      const traverse = (node: any) => {
        result.push({
          container_id: node.container_id,
          display_name: node.display_name,
          container_level: node.container_level,
          parent_container_id: node.parent_container_id || null,
        });
        if (node.children && node.children.length > 0) {
          node.children.forEach(traverse);
        }
      };
      nodes.forEach(traverse);
      return result;
    };

    const flattened = flattenTree(tree);
    console.log('Flattened containers:', flattened.length, flattened);
    setContainers(flattened);
  })
```

**Rationale**: Containers API returns hierarchical tree, but we need flat array for filtering/sorting

---

## Testing & Verification

### Database Verification
```sql
SELECT container_id, container_level, display_name, parent_container_id, is_active, sort_order
FROM landscape.tbl_container
WHERE project_id = 7 AND is_active = true
ORDER BY container_level, sort_order;
```

**Expected**: 120 rows (4 Villages + 12 Phases + ~104 Parcels)

### API Verification
```bash
curl -s "http://localhost:3000/api/projects/7/containers" | jq '.containers | length'
```

**Expected**: 4 (tree roots = 4 Villages, each with nested children)

### Console Verification
Open browser console → Add Budget Item modal → Check output:
```
Flattened containers: 120 [...]
```

**Visual Verification**:
- Container dropdown shows 16 items (4 Villages + 12 Phases)
- Label shows "Village > Phase"
- Placeholder is "Select Scope" in light grey
- Container and Category inputs are narrow
- No extra category labels

---

## Files Modified

1. [migrations/016_cleanup_project7_containers_v2.sql](../../migrations/016_cleanup_project7_containers_v2.sql) - NEW
2. [src/app/api/projects/[projectId]/containers/route.ts](../../src/app/api/projects/[projectId]/containers/route.ts) - Line 124
3. [src/components/budget/BudgetItemModalV2.tsx](../../src/components/budget/BudgetItemModalV2.tsx) - Multiple changes
4. [src/components/budget/CategoryCascadingDropdown.tsx](../../src/components/budget/CategoryCascadingDropdown.tsx) - Added hideLabels prop

---

## Key Learnings

### Database Constraints
**Issue**: Cannot delete containers due to FK constraints from `tbl_sale_settlement` and other tables

**Solution**: Use `is_active` flag for soft deletes instead of hard DELETE

### API Tree vs Flat List
**Issue**: Containers API returns hierarchical tree structure for rendering tree views

**Solution**: Flatten tree structure in modal for dropdown rendering

### React State Updates
**Issue**: State updates from fetch() don't trigger re-render if object reference doesn't change

**Solution**: Always create new array/object when setting state: `setContainers(flattenTree(tree))`

### CoreUI Styling
**Issue**: `<option>` placeholder styling not working consistently across browsers

**Solution**: Apply color to both `<select>` element and `<option>` elements

---

## Migration Execution

To apply migration 016:
```bash
psql "$DATABASE_URL" -f migrations/016_cleanup_project7_containers_v2.sql
```

**Verification**:
```sql
-- Check inactive count
SELECT COUNT(*) FROM landscape.tbl_container
WHERE project_id = 7 AND is_active = false;
-- Expected: >0 (incorrect containers marked inactive)

-- Check active Villages
SELECT display_name FROM landscape.tbl_container
WHERE project_id = 7 AND container_level = 1 AND is_active = true
ORDER BY sort_order;
-- Expected: 1, 2, 3, 4
```

---

## Success Criteria

- [x] Database migration runs without errors
- [x] Only 4 Villages (1-4) active at Level 1
- [x] Only 12 Phases (1.1-4.2) active at Level 2
- [x] Containers API returns only active containers
- [x] Modal shows ONLY Villages and Phases in dropdown
- [x] Container label shows "Village > Phase" breadcrumb
- [x] Placeholder text is "Select Scope" in light grey
- [x] Container and Category inputs are narrow (~17% width)
- [x] No "Budget Categories" heading shown
- [x] No "Level 1 Category" labels shown
- [x] No TypeScript errors
- [x] No runtime errors

---

## Next Steps

1. **User Acceptance Testing**: Test complete budget item creation workflow
2. **Template Testing**: Verify unit cost template auto-fill works
3. **Remove Debug Logging**: Remove `console.log` from line 207 in BudgetItemModalV2.tsx
4. **Delete Old Modal**: After V2 is proven stable, delete `BudgetItemModal.tsx` (old version)

---

**Session Duration**: ~1.5 hours
**Status**: ✅ Complete
**Ready for**: User acceptance testing

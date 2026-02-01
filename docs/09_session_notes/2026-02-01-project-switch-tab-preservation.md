# Project Switch Tab Preservation

**Date**: February 1, 2026
**Duration**: ~1 hour
**Focus**: Implement tab/page preservation when switching between projects

---

## Summary

Modified project switching behavior to preserve the current tab/page when users switch between projects via the project selector dropdown. Previously, switching projects always navigated to the project's home page. Now the app maintains the user's current tab context.

## Major Accomplishments

### 1. Tab Preservation on Project Switch ✅

**Problem**: When switching projects via the project selector, users were always navigated to the new project's home page, losing their current tab context.

**Solution**: Implemented intelligent URL preservation that:
- Captures the current tab/page from both path-based routes (`/projects/123/budget`) and query-param routes (`/projects/123?folder=budget&tab=budget`)
- Preserves the current tab when navigating to the new project
- Falls back to home page only when necessary (valuation tab → income property)

### 2. Fallback Logic for Incompatible Tabs ✅

**Condition**: If the user is on the Valuation tab AND switches to an income property (non-LAND project), navigate to home instead.

**Rationale**: The Valuation tab has different subtabs for land_dev vs income properties:
- Land Dev: cashflow, returns, sensitivity
- Income: sales-comparison, cost, income

## Files Modified

### New Functions Added:
- `extractCurrentTabFromPath()` - Extracts tab segment from URL path
- `getProjectSwitchUrl()` - Determines navigation URL with tab preservation

### Files Modified:
1. **src/lib/utils/folderTabConfig.ts** (+75 lines)
   - Added `extractCurrentTabFromPath()` function
   - Added `getProjectSwitchUrl()` function with dual URL pattern support

2. **src/components/studio/StudioProjectBar.tsx** (+6 lines)
   - Added `useSearchParams` hook
   - Updated `handleProjectChange` to use `getProjectSwitchUrl()`

3. **src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx** (+6 lines)
   - Added `useSearchParams` hook
   - Updated `handleProjectChange` to use `getProjectSwitchUrl()`

4. **src/app/components/ProjectContextBar.tsx** (+6 lines)
   - Added `useSearchParams` hook
   - Updated `handleProjectChange` to use `getProjectSwitchUrl()`

## Technical Details

### URL Pattern Support

The app uses two navigation patterns:
1. **Path-based**: `/projects/123/budget`
2. **Query-param based**: `/projects/123?folder=budget&tab=budget`

The `getProjectSwitchUrl()` function handles both:

```typescript
export function getProjectSwitchUrl(
  newProjectId: number,
  currentPath: string,
  targetProjectType: string | null | undefined,
  searchParams?: URLSearchParams | null
): string {
  // Check path-based routes
  const pathTab = extractCurrentTabFromPath(currentPath);

  // Check query-param routes
  const folderParam = searchParams?.get('folder') || '';
  const tabParam = searchParams?.get('tab') || '';

  // Apply fallback logic
  const isOnValuationTab = pathTab.startsWith('valuation') || folderParam === 'valuation';
  const targetIsIncomeProperty = isIncomeProperty(targetProjectType);

  if (isOnValuationTab && targetIsIncomeProperty) {
    return `/projects/${newProjectId}`;  // Fallback to home
  }

  // Preserve current tab
  if (pathTab) return `/projects/${newProjectId}/${pathTab}`;
  if (folderParam) return `/projects/${newProjectId}?folder=${folderParam}&tab=${tabParam}`;
  return `/projects/${newProjectId}`;
}
```

## Git Activity

### Commit Information:
- Branch: feature/folder-tabs
- Files changed: 4
- Lines added: ~90

## Next Steps

1. Test tab preservation across all folder tabs
2. Consider adding similar preservation for other navigation contexts (e.g., Dashboard → Project)
3. Add unit tests for `getProjectSwitchUrl()` function

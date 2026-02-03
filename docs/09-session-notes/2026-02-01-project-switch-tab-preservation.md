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

---

## Session 2: Cash Flow & Waterfall Django Consolidation

**Duration**: ~2 hours
**Focus**: Complete Django migration for cash flow and fix waterfall integration

### 3. Rewire Cash Flow Summary to Django ✅

**Problem**: The `/api/projects/{id}/cash-flow/summary` Next.js endpoint was still using the old TypeScript engine.

**Solution**: Updated the Next.js route to proxy to Django's cash flow service:

```typescript
// Now proxies to Django instead of TypeScript engine
const djangoUrl = `${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`;
const djangoResponse = await fetch(djangoUrl, { method: 'GET' });
```

Also added GET method support to Django's `LandDevCashFlowView`.

### 4. Fix Waterfall Cash Flow Section Name Matching ✅

**Problem**: Waterfall schedule wasn't showing period cash flows for LP/GP distributions.

**Root Cause**: Case-sensitive mismatch in section names:
- Django returns: `'DEVELOPMENT COSTS'` (UPPERCASE)
- Waterfall matched: `'Development Costs'` (Mixed case)

**Solution**: Convert to lowercase for matching in `_fetch_cashflows_from_django_service()`:

```python
cost_section_names = {'development costs', 'planning & engineering', 'land acquisition'}
revenue_section_names = {'net revenue'}

for section in sections:
    sname = section.get('sectionName', '').lower()  # Lowercase comparison
    is_cost = sname in cost_section_names
```

### 5. Fix Preferred Return Accrual Timing ✅

**Problem**: Pref was accruing in Period 1 when it shouldn't (capital hasn't been outstanding for a full period).

**Root Cause**: In `waterfall/engine.py`, Period 1's `prior_date` was set to start of month, causing accrual calculation.

**Solution**: Set `prior_date = cf.date` for Period 1 so days_between = 0:

```python
for i, cf in enumerate(self.cash_flows):
    if i > 0:
        prior_date = self.cash_flows[i - 1].date
    else:
        # First period: prior_date equals current date to prevent accrual
        prior_date = cf.date
```

**Result**: Period 1 now shows $0 accrued pref, Period 2 shows correct accrual ($615,957).

## Files Modified (Session 2)

### Files Modified:
1. **src/app/api/projects/[projectId]/cash-flow/summary/route.ts**
   - Updated to proxy to Django instead of TypeScript engine

2. **backend/apps/financial/views_land_dev_cashflow.py**
   - Added GET method handler for summary endpoint

3. **backend/apps/calculations/services.py** (~line 107-120)
   - Fixed case-sensitive section name matching

4. **services/financial_engine_py/financial_engine/waterfall/engine.py** (~line 128-137)
   - Fixed pref accrual timing for Period 1

## Git Activity (Session 2)

### Verification Results:
- Cash flow summary endpoint returns correct data: `peakEquity: $106,028,258.30`, `irr: 32.36%`
- Waterfall now returns 96 periods with cash flows
- Period 1 pref accrual: $0 (correct)
- Period 2 pref accrual: $615,957 (correct)

## Next Steps

1. Test tab preservation across all folder tabs
2. Consider adding similar preservation for other navigation contexts (e.g., Dashboard → Project)
3. Add unit tests for `getProjectSwitchUrl()` function
4. Complete waterfall UI integration testing
5. Verify LP/GP distributions calculate correctly across all 96 periods

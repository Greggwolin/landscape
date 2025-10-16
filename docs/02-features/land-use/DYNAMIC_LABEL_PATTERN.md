# Dynamic Label Pattern - Universal Container System

**Created:** October 15, 2025
**Status:** ✅ Pattern Established - Ready for Implementation

---

## Overview

This document describes the **Dynamic Label Pattern** - the standard approach for building UI components that adapt to different project types by reading hierarchy labels from `tbl_project_config`.

**Key Principle:** NO hardcoded terminology. All labels come from the database configuration.

---

## The Pattern

### 1. Use the `useProjectConfig` Hook

```tsx
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { useProjectContext } from '@/app/components/ProjectProvider'

function MyComponent() {
  const { activeProject } = useProjectContext()
  const { config, labels, containers, isLoading } = useProjectConfig(
    activeProject?.project_id ?? null
  )

  // labels object provides:
  // - level1Label (e.g., "Plan Area" or "Property")
  // - level2Label (e.g., "Phase" or "Building")
  // - level3Label (e.g., "Parcel" or "Unit")
  // - level1LabelPlural, level2LabelPlural, level3LabelPlural
}
```

### 2. Handle Loading State

```tsx
if (isLoading) {
  return <div className="animate-pulse">Loading...</div>
}
```

### 3. Use Labels Instead of Hardcoded Text

**❌ WRONG - Hardcoded:**
```tsx
<h2>Areas</h2>
<button>Add Phase</button>
<span>Parcel Count: {count}</span>
```

**✅ CORRECT - Dynamic:**
```tsx
<h2>{labels.level1LabelPlural}</h2>
<button>Add {labels.level2Label}</button>
<span>{labels.level3Label} Count: {count}</span>
```

---

## Complete Example: DynamicBreadcrumb Component

See implementation at [src/app/components/DynamicBreadcrumb.tsx](../../../src/app/components/DynamicBreadcrumb.tsx)

**Key Features:**
- Reads labels from API via `useProjectConfig()`
- Automatically adapts to project type
- No hardcoded "Area", "Phase", "Parcel" anywhere
- Same component works for Land, Multifamily, Office, etc.

**Usage:**
```tsx
import { DynamicBreadcrumb } from '@/app/components/DynamicBreadcrumb'

<DynamicBreadcrumb
  items={[
    { label: 'Peoria Lakes', href: '/projects/7' },
    { label: 'Plan Area 1', href: '/projects/7/area/1' },
    { label: 'Phase 1.1', href: '/projects/7/phase/5' },
    { label: 'Parcel 42' }
  ]}
/>
```

**Result for Land Development:**
> Peoria Lakes > Plan Area 1 > Phase 1.1 > Parcel 42

**Result for Multifamily (if configured):**
> Riverside Apartments > Property > Building A > Unit 201

---

## API Endpoints

### GET /api/projects/:projectId/config

Returns project configuration and settings:

```json
{
  "config": {
    "project_id": 7,
    "asset_type": "land_development",
    "level1_label": "Plan Area",
    "level2_label": "Phase",
    "level3_label": "Parcel"
  },
  "settings": {
    "project_id": 7,
    "default_currency": "USD",
    "default_period_type": "monthly",
    "global_inflation_rate": 0.03,
    "discount_rate": 0.1
  }
}
```

### GET /api/projects/:projectId/containers

Returns hierarchical container tree with actual data:

```json
{
  "containers": [
    {
      "container_id": 1,
      "project_id": 7,
      "container_level": 1,
      "container_code": "AREA-1",
      "display_name": "Plan Area 1",
      "children": [
        {
          "container_id": 5,
          "container_level": 2,
          "container_code": "PHASE-1-1",
          "display_name": "Phase 1.1",
          "children": [...]
        }
      ]
    }
  ]
}
```

---

## Database Schema

### tbl_project_config

Stores custom labels per project:

```sql
CREATE TABLE landscape.tbl_project_config (
    project_id BIGINT PRIMARY KEY,
    asset_type VARCHAR(50) NOT NULL,
    level1_label VARCHAR(50) NOT NULL DEFAULT 'Area',
    level2_label VARCHAR(50) NOT NULL DEFAULT 'Phase',
    level3_label VARCHAR(50) NOT NULL DEFAULT 'Parcel',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Example Configurations:**

| Project Type | level1_label | level2_label | level3_label |
|--------------|--------------|--------------|--------------|
| Land Development | Plan Area | Phase | Parcel |
| Multifamily | Property | Building | Unit |
| Office | Campus | Building | Suite |
| Retail | Center | Building | Space |
| Industrial | Park | Building | Bay |

---

## Implementation Checklist

When creating or updating a component to use dynamic labels:

- [ ] Import `useProjectConfig` and `useProjectContext` hooks
- [ ] Get project ID from context
- [ ] Call `useProjectConfig(projectId)` to get labels
- [ ] Handle loading state
- [ ] Replace ALL hardcoded "Area", "Phase", "Parcel" with `labels.levelXLabel`
- [ ] Use plural forms where appropriate: `labels.level1LabelPlural`
- [ ] Test with Project 7 (has container data)
- [ ] Verify labels update when project changes

---

## Migration Strategy

### Phase 1: New Components (Current)
✅ **All new components MUST use the dynamic label pattern**

Example: DynamicBreadcrumb (completed)

### Phase 2: Update Existing Components (Next)

**Priority Components to Migrate:**

1. **PlanningWizard** ([src/app/components/PlanningWizard/](../../../src/app/components/PlanningWizard/))
   - Replace hardcoded "Area", "Phase", "Parcel" in UI
   - Update forms to use dynamic labels
   - Migrate from `tbl_area`/`tbl_phase`/`tbl_parcel` to `tbl_container`

2. **HomeOverview** ([src/app/components/Home/HomeOverview.tsx](../../../src/app/components/Home/HomeOverview.tsx))
   - Update metric labels to use `labels.level1LabelPlural` etc.
   - Change queries to use containers instead of legacy tables

3. **Navigation** ([src/app/components/Navigation.tsx](../../../src/app/components/Navigation.tsx))
   - Already uses `level2Label` for one item (Phase Planner)
   - Extend to all planning-related navigation items

4. **Budget Grid** ([src/app/components/Budget/](../../../src/app/components/Budget/))
   - Update column headers to use dynamic labels
   - Support container_id instead of pe_level enum

### Phase 3: Deprecate Legacy Tables

Once all components migrated:
1. Run data migration: Copy all data from `tbl_area`/`tbl_phase`/`tbl_parcel` → `tbl_container`
2. Update all APIs to query containers
3. Mark legacy tables as deprecated
4. Eventually drop legacy tables

---

## Testing the Pattern

### Manual Testing

1. **Navigate to Demo Page:**
   - Run dev server: `npm run dev`
   - Go to: http://localhost:3000/breadcrumb-demo
   - Verify labels match Project 7 configuration

2. **Test Label Changes:**
   - Update `tbl_project_config` labels:
     ```sql
     UPDATE landscape.tbl_project_config
     SET level1_label = 'District',
         level2_label = 'Neighborhood',
         level3_label = 'Lot'
     WHERE project_id = 7;
     ```
   - Refresh page - labels should update automatically

3. **Test with Different Projects:**
   - Create new project config with different asset_type
   - Verify components adapt to new labels

### Automated Testing (Future)

```tsx
import { renderHook } from '@testing-library/react'
import { useProjectConfig } from '@/hooks/useProjectConfig'

test('useProjectConfig returns correct labels for land development', async () => {
  const { result } = renderHook(() => useProjectConfig(7))

  await waitFor(() => {
    expect(result.current.labels.level1Label).toBe('Plan Area')
    expect(result.current.labels.level2Label).toBe('Phase')
    expect(result.current.labels.level3Label).toBe('Parcel')
  })
})
```

---

## Benefits of This Pattern

### 1. **Single Codebase for All Property Types**
- Same React components work for Land, Multifamily, Office, Retail, Industrial
- No separate codebases or forked code
- ARGUS has 3 separate products; Landscape has 1 unified platform

### 2. **User Customization**
- Users can define their own terminology
- "Plan Area" vs "District" vs "Region" - user's choice
- No code changes required for customization

### 3. **Competitive Advantage**
- ARGUS Developer uses hardcoded "Area/Phase/Parcel"
- ARGUS Enterprise uses hardcoded building/suite terminology
- Landscape adapts to ANY hierarchy with ANY labels

### 4. **Easier Maintenance**
- Update label in database, not in 50+ component files
- Consistent terminology across entire application
- Type-safe via TypeScript

---

## Common Pitfalls to Avoid

### ❌ Don't Hardcode Labels
```tsx
// BAD
return <h2>Areas</h2>
```

```tsx
// GOOD
return <h2>{labels.level1LabelPlural}</h2>
```

### ❌ Don't Assume Label Structure
```tsx
// BAD - Assumes "Plan Area" format
const areaName = `Plan Area ${areaNumber}`
```

```tsx
// GOOD - Uses actual display_name from container
const areaName = container.display_name
```

### ❌ Don't Skip Loading State
```tsx
// BAD - labels might be undefined
return <div>{labels.level1Label}</div>
```

```tsx
// GOOD - Handle loading
if (isLoading) return <LoadingSpinner />
return <div>{labels.level1Label}</div>
```

### ❌ Don't Query Legacy Tables Directly
```tsx
// BAD - Hardcoded to legacy structure
const areas = await sql`SELECT * FROM landscape.tbl_area`
```

```tsx
// GOOD - Use container API
const response = await fetch(`/api/projects/${projectId}/containers`)
const { containers } = await response.json()
```

---

## Next Steps

1. ✅ **Pattern Established** - DynamicBreadcrumb component serves as reference
2. 🔄 **Create Container Management UI** - Let users configure labels
3. 🔄 **Migrate PlanningWizard** - Biggest component using legacy structure
4. 🔄 **Update All Reports** - Budget grids, analytics, exports
5. 🔄 **Data Migration Tool** - Move existing data to containers
6. 🔄 **Deprecate Legacy Tables** - Remove `tbl_area`, `tbl_phase`, `tbl_parcel`

---

## Questions?

See implementation examples:
- **Demo Page:** [src/app/breadcrumb-demo/page.tsx](../../../src/app/breadcrumb-demo/page.tsx)
- **Component:** [src/app/components/DynamicBreadcrumb.tsx](../../../src/app/components/DynamicBreadcrumb.tsx)
- **Hook:** [src/hooks/useProjectConfig.ts](../../../src/hooks/useProjectConfig.ts)
- **API:** [src/app/api/projects/[projectId]/config/route.ts](../../../src/app/api/projects/[projectId]/config/route.ts)

---

**Last Updated:** October 15, 2025
**Status:** ✅ Ready for use in all new components
**Pattern Owner:** Universal Container System Initiative

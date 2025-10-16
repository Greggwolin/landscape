# Planning Wizard Container Migration

## Summary

Successfully migrated the Planning Wizard component to use the Universal Container System while maintaining full backward compatibility with legacy data structures.

## Changes Made

### 1. Updated Imports ([PlanningWizard.tsx:13-20](src/app/components/PlanningWizard/PlanningWizard.tsx#L13-L20))

Added container-related imports:
```typescript
import { ContainerNode } from '@/types'
import {
  flattenContainers,
  getContainersByLevel,
  getChildren,
  hasContainerData,
  type FlatContainer,
} from '@/lib/containerHelpers'
```

### 2. Added Container Data Fetching ([PlanningWizard.tsx:135-144](src/app/components/PlanningWizard/PlanningWizard.tsx#L135-L144))

New SWR hook to fetch containers from unified API:
```typescript
const {
  data: containersResponse,
  error: containersError,
  isLoading: containersLoading,
  mutate: mutateContainers,
} = useSWR<{ containers: ContainerNode[] }>(
  projectId ? `/api/projects/${projectId}/containers` : null,
  fetcher
)
```

### 3. Smart Data Source Selection ([PlanningWizard.tsx:146-168](src/app/components/PlanningWizard/PlanningWizard.tsx#L146-L168))

Automatically detects which system to use:
```typescript
const useContainers = useMemo(() => {
  return hasContainerData(containersResponse?.containers)
}, [containersResponse])

// Legacy APIs only called if NOT using containers
const { data: phasesData } = useSWR<ApiPhase[]>(
  projectId && !useContainers ? `/api/phases?project_id=${projectId}` : null,
  fetcher
)
```

### 4. Container Data Transformation ([PlanningWizard.tsx:179-250](src/app/components/PlanningWizard/PlanningWizard.tsx#L179-L250))

New function `areasFromContainers` that:
- Flattens hierarchical container tree using `flattenContainers()`
- Separates containers by level using `getContainersByLevel()`
- Builds Area/Phase/Parcel structure from container hierarchy
- Extracts parcel attributes from `container.attributes` object
- Uses `container_id` as database identifiers

Key mapping:
- Level 1 containers → Areas
- Level 2 containers → Phases
- Level 3 containers → Parcels
- `container.attributes` → Parcel properties (acres, units, usecode, etc.)

### 5. Dual Data Path ([PlanningWizard.tsx:353-354](src/app/components/PlanningWizard/PlanningWizard.tsx#L353-L354))

```typescript
const areas = useContainers ? areasFromContainers : areasFromLegacy
```

The component now has two complete data transformation paths:
- **Container path**: Uses `/api/projects/:id/containers`
- **Legacy path**: Uses `/api/phases` + `/api/parcels` (existing code unchanged)

### 6. Updated Refresh Logic ([PlanningWizard.tsx:382-393](src/app/components/PlanningWizard/PlanningWizard.tsx#L382-L393))

Data refresh handlers now check which system is active:
```typescript
useEffect(() => {
  const handler = () => {
    if (useContainers) {
      mutateContainers()
    } else {
      mutateParcels()
      mutatePhases()
    }
  }
  window.addEventListener('dataChanged', handler as EventListener)
  return () => window.removeEventListener('dataChanged', handler as EventListener)
}, [useContainers, mutateParcels, mutatePhases, mutateContainers])
```

## Backward Compatibility

### Automatic Fallback

The component automatically detects which system to use:

1. **Container data exists** → Use container system
2. **No container data** → Fall back to legacy APIs

This is determined by the `hasContainerData()` helper function.

### Zero Breaking Changes

- Existing projects with legacy data continue to work
- UI/UX remains identical
- All child components (ProjectCanvas, PhaseCanvas) receive the same data structure
- Inline editing and drag-and-drop functionality preserved

## Data Structure Mapping

### Container → Area
```typescript
{
  id: `area-container-${container_id}`,
  name: display_name,
  areaDbId: container_id,
  areaNo: sort_order,
  phases: [...],
}
```

### Container → Phase
```typescript
{
  id: `phase-container-${container_id}`,
  name: display_name,
  phaseDbId: container_id,
  areaId: `area-container-${parent_container_id}`,
  areaNo: parent_sort_order,
  phaseNo: sort_order,
  description: attributes.description,
  parcels: [...],
}
```

### Container → Parcel
```typescript
{
  id: `parcel-container-${container_id}`,
  name: display_name,
  dbId: container_id,
  areaNo: level1_sort_order,
  phaseNo: level2_sort_order,
  // All parcel data extracted from attributes:
  landUse: attributes.usecode,
  acres: attributes.acres,
  units: attributes.units,
  efficiency: attributes.efficiency,
  frontage: attributes.frontfeet,
  product: attributes.product,
  // Taxonomy fields:
  family_name: attributes.family_name,
  density_code: attributes.density_code,
  type_code: attributes.type_code,
  product_code: attributes.product_code,
}
```

## Testing

### Test with Project 7 (Container Data)

Project 7 has 54 containers:
- 4 Level 1 containers (Areas)
- 8 Level 2 containers (Phases)
- 42 Level 3 containers (Parcels)

**Expected behavior:**
1. Navigate to Planning Wizard with Project 7 selected
2. Component should automatically use container API
3. Display 4 areas with phases and parcels
4. All existing features should work (drag-drop, inline edit)

**Verification:**
```typescript
// Check browser console - should see:
// GET /api/projects/7/containers → 200 OK
// NOT seeing /api/phases or /api/parcels calls
```

### Test with Legacy Projects

Any project without container data will automatically fall back to legacy APIs.

**Expected behavior:**
1. Navigate to Planning Wizard with legacy project
2. Component uses `/api/phases` and `/api/parcels`
3. Everything works as before

## Dynamic Labels

The component already uses dynamic labels from `useProjectConfig()`:
- `level1Label` / `level1LabelPlural` (e.g., "Plan Area" / "Plan Areas")
- `level2Label` (e.g., "Phase")
- `level3Label` (e.g., "Parcel")

These labels are applied to both container and legacy data paths, ensuring consistent terminology.

## Performance Considerations

### Container System Benefits

1. **Single API Call**: One request for entire hierarchy vs. two separate requests
2. **Less Data Transfer**: Hierarchical structure already built server-side
3. **Better Caching**: SWR caches entire tree, not separate phase/parcel lists

### Loading States

Loading is complete when:
- Container data is loaded (new system), OR
- Both phases AND parcels are loaded (legacy system)

```typescript
const isLoading = projectLoading || containersLoading || phasesLoading || parcelsLoading
```

## Known Limitations

### Inline Editing

The current implementation displays container data but does NOT yet handle:
- Editing parcel attributes via inline editing
- Saving changes back to `tbl_container.attributes`
- Creating new containers via "Add Area/Phase/Parcel" buttons

**Future work needed:**
- Update inline edit handlers to call container update APIs
- Implement container creation endpoints
- Add validation for container relationships

### Drag and Drop

Drag-and-drop reordering should work for display but may need updates to:
- Save new `sort_order` to containers
- Update `parent_container_id` when moving between phases/areas

## Next Steps

### Phase 2: Container CRUD Operations

1. **Create Containers**
   - POST `/api/projects/:id/containers` endpoint
   - Update "Add Area/Phase/Parcel" handlers
   - Validation: Level 2 requires Level 1 parent, etc.

2. **Update Containers**
   - PUT `/api/projects/:id/containers/:containerId` endpoint
   - Update inline editing to save to container attributes
   - Handle display_name changes

3. **Delete Containers**
   - DELETE endpoint with cascade handling
   - Prevent deletion if children exist
   - Soft delete (is_active = false)

4. **Reorder Containers**
   - Update sort_order values
   - Handle drag-and-drop reparenting
   - Maintain tree integrity

### Phase 3: Remove Legacy Code

Once all projects are migrated to containers:
1. Remove `areasFromLegacy` logic
2. Remove `/api/phases` and `/api/parcels` endpoints
3. Remove `tbl_area`, `tbl_phase`, `tbl_parcel` tables
4. Simplify Planning Wizard to only use container data

## Files Modified

- [src/app/components/PlanningWizard/PlanningWizard.tsx](src/app/components/PlanningWizard/PlanningWizard.tsx)

## Files Referenced

- [src/lib/containerHelpers.ts](src/lib/containerHelpers.ts) - Container utility functions
- [src/app/api/projects/[projectId]/containers/route.ts](src/app/api/projects/[projectId]/containers/route.ts) - Container API
- [src/types/containers.ts](src/types/containers.ts) - Type definitions
- [src/hooks/useProjectConfig.ts](src/hooks/useProjectConfig.ts) - Dynamic labels hook

## Related Documentation

- [DYNAMIC_LABEL_PATTERN.md](docs/02-features/land-use/DYNAMIC_LABEL_PATTERN.md) - Dynamic label implementation guide
- [PROJECT_SETUP_WIZARD.md](PROJECT_SETUP_WIZARD.md) - Creating new projects with containers

# Container System Migration Checklist

**Status**: Planning Wizard ✅ COMPLETE | HomeOverview & ProjectCanvas 🚧 IN PROGRESS

## Overview

This checklist tracks the migration from legacy `tbl_area`, `tbl_phase`, `tbl_parcel` tables to the Universal Container System (`tbl_container`). Each component must be updated to:

1. Use `/api/projects/:projectId/containers` instead of legacy APIs
2. Query containers via `container_level` (1, 2, 3) instead of area/phase/parcel
3. Use dynamic labels from `useProjectConfig()` hook
4. Support any hierarchy (Property/Building/Unit, Plan Area/Phase/Parcel, etc.)

---

## Priority 1: Core UI Components (CRITICAL)

### ✅ PlanningWizard.tsx - COMPLETE
**Status**: Migrated and tested
**Changes Made**:
- Replaced `/api/areas`, `/api/phases`, `/api/parcels` with `/api/projects/:id/containers`
- Uses `useProjectConfig()` for dynamic labels
- Smart fallback to legacy APIs for backward compatibility
- All inline editing, drag-and-drop preserved

**Files**:
- [src/app/components/PlanningWizard/PlanningWizard.tsx](src/app/components/PlanningWizard/PlanningWizard.tsx)

---

### 🚧 HomeOverview.tsx - NEEDS UPDATE
**Status**: Uses legacy APIs and hardcoded labels
**Location**: [src/app/components/Home/HomeOverview.tsx:32-33](src/app/components/Home/HomeOverview.tsx#L32-L33)

**Current Issues**:
```typescript
// Line 32-33: Legacy API calls
const { data: parcelsData } = useSWR<ParcelSummary[]>(
  projectId ? `/api/parcels?project_id=${projectId}` : null, fetcher
)
const { data: phasesData } = useSWR<PhaseSummary[]>(
  projectId ? `/api/phases?project_id=${projectId}` : null, fetcher
)

// Line 126: Hardcoded "Phase Snapshot"
<h2 className="text-lg font-semibold text-white">Phase Snapshot</h2>

// Line 130: Hardcoded "Active Phases"
<SnapshotStat label="Active Phases" value={metrics.activePhases} />
```

**Required Changes**:
1. Replace API calls with `/api/projects/${projectId}/containers`
2. Update metrics calculation to use `container_level` instead of area_no/phase_id
3. Replace "Phase Snapshot" with `${labels.level2Label} Snapshot`
4. Replace "Active Phases" with `Active ${labels.level2LabelPlural}`
5. Update "Top Use Families" section title to use `${labels.level3LabelPlural}`

**Implementation Steps**:
```typescript
// 1. Fetch containers instead of parcels/phases
const { data: containersResponse } = useSWR(
  projectId ? `/api/projects/${projectId}/containers` : null,
  fetcher
)

// 2. Transform container hierarchy
const { level1Containers, level2Containers, level3Containers } = useMemo(() => {
  if (!containersResponse?.containers) return { level1Containers: [], level2Containers: [], level3Containers: [] }
  const flat = flattenContainers(containersResponse.containers)
  return {
    level1Containers: getContainersByLevel(flat, 1),
    level2Containers: getContainersByLevel(flat, 2),
    level3Containers: getContainersByLevel(flat, 3)
  }
}, [containersResponse])

// 3. Update metrics calculation
const metrics = useMemo(() => {
  return {
    areas: level1Containers.length,
    phases: level2Containers.length,
    parcels: level3Containers.length,
    totalUnits: level3Containers.reduce((sum, c) => sum + Number(c.attributes?.units || 0), 0),
    activePhases: level2Containers.filter(c => c.status === 'active').length,
    plannedAcreage: level2Containers.reduce((sum, c) => sum + Number(c.attributes?.acres || 0), 0)
  }
}, [level1Containers, level2Containers, level3Containers])

// 4. Use dynamic labels
<h2 className="text-lg font-semibold text-white">{labels.level2Label} Snapshot</h2>
<SnapshotStat label={`Active ${labels.level2LabelPlural}`} value={metrics.activePhases} />
```

---

### 🚧 ProjectCanvas.tsx - NEEDS UPDATE
**Status**: Uses legacy data structures and hardcoded labels
**Location**: [src/app/components/PlanningWizard/ProjectCanvas.tsx](src/app/components/PlanningWizard/ProjectCanvas.tsx)

**Current Issues**:
```typescript
// Line 12-13: Hardcoded prop names
onAddPhase?: (areaId: string) => void
onAddParcel?: (areaId: string, phaseId: string) => void

// Line 314: Hardcoded "Add Area" button
<button>Add Area</button>

// Line 355: Hardcoded "Add Phase" button
<button>Add Phase</button>

// Line 413, 483, 539: Hardcoded "Parcel" text
<div className="font-semibold text-xs leading-tight mb-0.5">
  Parcel {parcel.name.replace('Parcel: ', '')}
</div>

// Line 616: Hardcoded "Add Parcel" button
<span className="text-sm">+</span>
Add Parcel
```

**Required Changes**:
1. Accept dynamic labels as props OR use `useProjectConfig()` hook
2. Replace "Add Area" with `Add ${labels.level1Label}`
3. Replace "Add Phase" with `Add ${labels.level2Label}`
4. Replace "Parcel" with `${labels.level3Label}`
5. Use containers API for save operations (update `/api/parcels/${id}` to `/api/projects/:projectId/containers/${containerId}`)

**Implementation Steps**:
```typescript
// 1. Add useProjectConfig hook
const { labels } = useProjectConfig(projectIdFromId(project.id))

// 2. Update button labels
<button>Add {labels.level1Label}</button>
<button>Add {labels.level2Label}</button>
<button>Add {labels.level3Label}</button>

// 3. Update parcel display
<div className="font-semibold text-xs">
  {labels.level3Label} {parcel.name.replace(`${labels.level3Label}: `, '')}
</div>

// 4. Update API calls
const res = await fetch(`/api/projects/${projectId}/containers/${containerId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

---

### 🚧 ProjectCanvasInline.tsx - NEEDS UPDATE
**Status**: Uses legacy data structures and hardcoded labels
**Location**: [src/app/components/PlanningWizard/ProjectCanvasInline.tsx](src/app/components/PlanningWizard/ProjectCanvasInline.tsx)

**Current Issues**:
```typescript
// Line 11: Hardcoded prop names
onAddPhase: (areaId: string) => void

// Line 172: Hardcoded "Add Area" button
<button>Add Area</button>

// Line 223: Hardcoded "Add Phase" button
<button>Add Phase</button>

// Line 272: Hardcoded "Open" button (refers to phase)
<button>Open</button>

// Line 285: Hardcoded "No phases yet"
<div>No phases yet. Add one to get started.</div>
```

**Required Changes**:
1. Use `useProjectConfig()` hook for dynamic labels
2. Replace all hardcoded entity names with label variables
3. Update button text dynamically

---

## Priority 2: API Routes (BACKEND)

### 🟡 Legacy API Routes - KEEP FOR BACKWARD COMPATIBILITY
**Status**: Maintain but deprecate
**Reason**: Existing projects may still use legacy tables during transition

**Files to Keep**:
- [src/app/api/areas/route.ts](src/app/api/areas/route.ts)
- [src/app/api/phases/route.ts](src/app/api/phases/route.ts)
- [src/app/api/parcels/route.ts](src/app/api/parcels/route.ts)
- [src/app/api/phases/[id]/route.ts](src/app/api/phases/[id]/route.ts)
- [src/app/api/parcels/[id]/route.ts](src/app/api/parcels/[id]/route.ts)

**Action Required**:
- Add deprecation warnings to API responses
- Document migration path in API comments
- Add `X-Deprecated-API: true` header to responses

---

## Priority 3: Archive Components (LOW PRIORITY)

### 📦 PlanningContentHot.tsx - ARCHIVE COMPONENT
**Status**: Legacy component, low priority
**Location**: [src/app/components/Archive/PlanningContentHot.tsx](src/app/components/Archive/PlanningContentHot.tsx)

**Recommendation**: Update only if component is used in production

---

### 📦 PlanningContentGrid.tsx - ARCHIVE COMPONENT
**Status**: Legacy component, low priority
**Location**: [src/app/components/Archive/PlanningContentGrid.tsx](src/app/components/Archive/PlanningContentGrid.tsx)

**Recommendation**: Update only if component is used in production

---

## Priority 4: GIS Integration

### 🔧 GISMap.tsx - NEEDS REVIEW
**Status**: Uses "Parcel" terminology for GIS features
**Location**: [src/app/components/MapLibre/GISMap.tsx](src/app/components/MapLibre/GISMap.tsx)

**Current Issues**:
- Parcel selection interface may use hardcoded "Parcel" labels
- GIS data model may reference area_id, phase_id, parcel_id

**Required Changes**:
1. Review GIS feature selection interface
2. Update labels to use `useProjectConfig()` if displaying entity names
3. Verify GIS data mapping to containers (check `gis_parcel_id` → `container_id` mappings)

---

## Priority 5: Setup & Documentation

### ✅ ProjectStructureChoice.tsx - INFORMATIONAL ONLY
**Status**: Uses hardcoded examples in documentation
**Location**: [src/app/components/Setup/ProjectStructureChoice.tsx:81-101](src/app/components/Setup/ProjectStructureChoice.tsx#L81-L101)

**Current State**:
```typescript
hierarchy: ['Project', 'Phase (Optional)', 'Parcel'],
hierarchy: ['Project', 'Area', 'Phase', 'Parcel'],
```

**Assessment**: These are **example hierarchies** shown during setup, not actual data. No changes needed - they help users understand the concepts.

---

### ✅ DynamicBreadcrumb.tsx - DOCUMENTATION ONLY
**Status**: Example comments use Area/Phase/Parcel
**Location**: [src/app/components/DynamicBreadcrumb.tsx:30-38](src/app/components/DynamicBreadcrumb.tsx#L30-L38)

**Current State**:
```typescript
/**
 * @example
 * ```tsx
 * <DynamicBreadcrumb
 *   items={[
 *     { label: 'Project Name', href: '/projects/7' },
 *     { label: 'Plan Area 1', href: '/projects/7/area/1' },
 *     { label: 'Phase 1.1', href: '/projects/7/phase/5' },
 *     { label: 'Parcel 42' }
 *   ]}
 * />
 * ```
 */
```

**Assessment**: Documentation example, no code changes needed. Consider adding a second example showing Property/Building/Unit.

---

## Priority 6: Form Components

### 🔧 PhaseCanvasInline.tsx - NEEDS REVIEW
**Status**: Unknown usage of legacy APIs
**Location**: [src/app/components/PlanningWizard/PhaseCanvasInline.tsx](src/app/components/PlanningWizard/PhaseCanvasInline.tsx)

**Action Required**: Read file to check for hardcoded labels and API usage

---

### 🔧 ParcelForm.tsx - NEEDS REVIEW
**Status**: Unknown usage of legacy APIs
**Location**: [src/app/components/PlanningWizard/forms/ParcelForm.tsx](src/app/components/PlanningWizard/forms/ParcelForm.tsx)

**Action Required**: Read file to check for hardcoded "Parcel" labels

---

## Priority 7: Prototypes

### 📦 ParcelGridPrototype.tsx - PROTOTYPE
**Status**: Prototype component, low priority
**Location**: [src/prototypes/glide/ParcelGridPrototype.tsx](src/prototypes/glide/ParcelGridPrototype.tsx)

**Recommendation**: Update only if promoting to production

---

## Migration Order

Execute in this order to minimize disruption:

### Phase 1: Core UI (Current)
1. ✅ PlanningWizard.tsx (COMPLETE)
2. 🚧 HomeOverview.tsx (IN PROGRESS)
3. 🚧 ProjectCanvas.tsx (IN PROGRESS)
4. 🚧 ProjectCanvasInline.tsx (IN PROGRESS)

### Phase 2: Forms & Modals
5. PhaseCanvasInline.tsx
6. ParcelForm.tsx

### Phase 3: GIS Integration
7. GISMap.tsx (review parcel selection)

### Phase 4: Backend Deprecation
8. Add deprecation headers to legacy API routes
9. Document migration path in API docs

### Phase 5: Cleanup (Optional)
10. Archive components (if unused)
11. Prototypes (if not promoted)

---

## Testing Strategy

For each updated component:

### 1. Test with Land Development Project (Project 7)
- Labels: Plan Area, Phase, Parcel
- Verify 4 areas, multiple phases, parcels display correctly

### 2. Test with Multifamily Project (Project 11)
- Labels: Property, Building, Unit
- Verify 1 property, 2 buildings, 8 units display correctly

### 3. Verify Backward Compatibility
- Create test project with legacy tables (no containers)
- Confirm fallback to legacy APIs works

### 4. Verify CRUD Operations
- Create new container at each level
- Update existing container
- Delete container
- Verify parent-child relationships maintained

---

## Success Criteria

Component migration is complete when:

1. ✅ No hardcoded "Area", "Phase", "Parcel" labels in UI text
2. ✅ Uses `/api/projects/:id/containers` instead of legacy APIs
3. ✅ Uses `useProjectConfig()` hook for dynamic labels
4. ✅ Works identically for Land Development and Multifamily projects
5. ✅ Maintains backward compatibility with legacy data
6. ✅ All inline editing, drag-and-drop features preserved
7. ✅ Performance equivalent or better than legacy implementation

---

## Files Summary

**Total Files Found**: 21 files with legacy API/table references

### Critical (Must Update)
- HomeOverview.tsx ⚠️
- ProjectCanvas.tsx ⚠️
- ProjectCanvasInline.tsx ⚠️

### Review Required
- PhaseCanvasInline.tsx
- ParcelForm.tsx
- GISMap.tsx

### Keep (Backward Compatibility)
- /api/areas/route.ts
- /api/phases/route.ts
- /api/phases/[id]/route.ts
- /api/parcels/route.ts
- /api/parcels/[id]/route.ts

### Low Priority (Archive/Prototype)
- PlanningContentHot.tsx
- PlanningContentGrid.tsx
- ParcelGridPrototype.tsx

### Documentation Only (No Changes)
- DynamicBreadcrumb.tsx (example comments)
- ProjectStructureChoice.tsx (setup examples)

---

## Next Steps

1. **Update HomeOverview.tsx** - Replace legacy API calls with container API
2. **Update ProjectCanvas.tsx** - Use dynamic labels throughout
3. **Update ProjectCanvasInline.tsx** - Use dynamic labels throughout
4. **Test all changes** with both Project 7 (land) and Project 11 (multifamily)
5. **Document API deprecation** - Add warnings to legacy routes
6. **Review GIS integration** - Verify parcel selection works with containers

---

Generated: 2025-10-15
Status: Planning Phase Complete, Implementation Phase 1 In Progress

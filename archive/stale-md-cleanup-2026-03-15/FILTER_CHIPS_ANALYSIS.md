# Filter Chips Analysis - Planning and Budget Pages

**Date:** 2025-11-21
**Branch:** `feature/nav-restructure-phase7`
**Status:** Filter components exist but integration varies by page

---

## Executive Summary

✅ **Good News:** Filter components already exist and are working!
⚠️ **Issue:** Not all budget pages use the filter component - integration is inconsistent

---

## Filter Component Inventory

### FiltersAccordion Component
**Location:** `/src/components/budget/FiltersAccordion.tsx`

**Features:**
- ✅ Area/Phase filter tiles
- ✅ Project-level toggle
- ✅ Clear filters button with count badge
- ✅ Container hierarchy support
- ✅ Cost totals display
- ✅ Theme-aware styling (CoreUI)
- ✅ Persistent filter state (localStorage)

**Props Interface:**
```typescript
interface Props {
  projectId: number;
  selectedAreaIds: number[];
  selectedPhaseIds: number[];
  onAreaSelect: (areaId: number | null) => void;
  onPhaseSelect: (phaseId: number | null) => void;
  onClearFilters: () => void;
  includeProjectLevel: boolean;
  projectLevelItemCount: number;
  onProjectLevelToggle: (include: boolean) => void;
}
```

---

## Current Integration Status

### ✅ FULLY INTEGRATED - Planning Land Use (PlanningContent)

**Component:** `/src/app/components/Planning/PlanningContent.tsx`
**Used By:**
- `/projects/[projectId]/project/planning/page.tsx`
- `/projects/[projectId]/components/tabs/PlanningTab.tsx`

**Filter Implementation:**
- **Area Filters:** Clickable planning tiles (lines 630-653)
- **Phase Filters:** Clickable table rows (lines 675-686)
- **Land Use Filter:** State exists (`selectedLandUseFilter`)
- **Clear Filters:** Button with active count (lines 701-710)

**Filter State:**
```typescript
const [selectedAreaFilters, setSelectedAreaFilters] = useState<number[]>([]);
const [selectedPhaseFilters, setSelectedPhaseFilters] = useState<string[]>([]);
const [selectedLandUseFilter, setSelectedLandUseFilter] = useState<string>('');
```

**Filtered Data:**
```typescript
const filteredParcels = useMemo(() => {
  let filtered = parcels;

  // Apply area filters
  if (selectedAreaFilters.length > 0) {
    filtered = filtered.filter(parcel => selectedAreaFilters.includes(parcel.area_no));
  }

  // Apply phase filters
  if (selectedPhaseFilters.length > 0) {
    filtered = filtered.filter(parcel => selectedPhaseFilters.includes(parcel.phase_name));
  }

  // Apply land use filter
  if (selectedLandUseFilter) {
    filtered = filtered.filter(parcel => parcel.type_code === selectedLandUseFilter);
  }

  return filtered;
}, [parcels, selectedAreaFilters, selectedPhaseFilters, selectedLandUseFilter]);
```

**Status:** ✅ **COMPLETE** - Filters working, no changes needed

---

### ✅ FULLY INTEGRATED - Budget Grid Tab

**Component:** `/src/components/budget/BudgetGridTab.tsx`

**Uses FiltersAccordion:**
```typescript
<FiltersAccordion
  projectId={projectId}
  selectedAreaIds={selectedAreaIds}
  selectedPhaseIds={selectedPhaseIds}
  onAreaSelect={handleAreaSelect}
  onPhaseSelect={handlePhaseSelect}
  onClearFilters={handleClearFilters}
  includeProjectLevel={includeProjectLevel}
  projectLevelItemCount={projectLevelCount}
  onProjectLevelToggle={handleProjectLevelToggle}
/>
```

**Filter State:**
- Persisted to localStorage (`budget_filters_${projectId}`)
- Filters budget items by `division_id` (container hierarchy)
- Supports project-level items toggle

**Status:** ✅ **COMPLETE** - FiltersAccordion integrated and working

---

### ⚠️ MISSING FILTERS - Planning Budget Page

**File:** `/src/app/projects/[projectId]/planning/budget/page.tsx`

**Current Implementation:**
- Uses `BudgetGridWithTimeline` component
- **No filter UI** - relies on `scope="Planning & Engineering"` prop
- Shows all P&E costs without area/phase filtering

**Component Structure:**
```typescript
<BudgetGridWithTimeline
  projectId={projectId}
  scope="Planning & Engineering"
  showCostCurves={false}
  showUnitPricing={false}
/>
```

**Missing:**
- Area/Phase filter tiles
- Project-level toggle
- Clear filters button

**Recommendation:** Add FiltersAccordion above BudgetGridWithTimeline

**Status:** ⚠️ **NEEDS INTEGRATION**

---

### ⚠️ MISSING FILTERS - Development Budget Page (if exists)

**File:** `/src/app/projects/[projectId]/development/budget/page.tsx` (assumption)

**Expected Issues:**
- Same as Planning Budget page
- Uses BudgetGridWithTimeline without filters

**Status:** ❓ **NEEDS VERIFICATION** - Does this page exist?

---

### ❓ PLACEHOLDER - Land Use Page

**File:** `/src/app/projects/[projectId]/planning/land-use/page.tsx`

**Current Status:**
```typescript
// Placeholder page with migration notice
// Content says: "Planning page content will be moved here"
```

**Actual Planning Content Location:**
- `/src/app/components/Planning/PlanningContent.tsx` (has filters)
- Used by `/projects/[projectId]/project/planning/page.tsx`

**Recommendation:**
- Migrate PlanningContent to land-use page
- Filters will come with it automatically

**Status:** ❓ **PLACEHOLDER PAGE** - Migration pending

---

## Filter Component Comparison

### Planning Filters (Built-in to PlanningContent)
```
┌─────────────────────────────────────┐
│ Area Tiles                          │
│ ┌───────┐ ┌───────┐ ┌───────┐      │
│ │Area 1 │ │Area 2 │ │Area 3 │      │
│ │30 ac  │ │45 ac  │ │25 ac  │      │
│ └───────┘ └───────┘ └───────┘      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Phase Table (clickable rows)        │
│ Phase │ Land Uses │ Acres │ Units  │
│ ──────┼───────────┼───────┼────────│
│ 1.1   │ RES, COM  │ 15    │ 150    │
│ 1.2   │ RES       │ 15    │ 180    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [Clear Filters (2)] [Import PDF]    │
└─────────────────────────────────────┘
```

### Budget Filters (FiltersAccordion)
```
┌─────────────────────────────────────┐
│ ▼ Areas / Phases    [Clear Filters] │
│ ┌─────────────────────────────────┐ │
│ │ Project Level [10 items]        │ │
│ │                                 │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐        │ │
│ │ │Area1│ │Area2│ │Area3│        │ │
│ │ │30ac │ │45ac │ │25ac │        │ │
│ │ │$2.1M│ │$3.5M│ │$1.8M│        │ │
│ │ └─────┘ └─────┘ └─────┘        │ │
│ │                                 │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐        │ │
│ │ │ 1.1 │ │ 1.2 │ │ 2.1 │        │ │
│ │ │15ac │ │15ac │ │20ac │        │ │
│ │ │$800K│ │$600K│ │$1.2M│        │ │
│ │ └─────┘ └─────┘ └─────┘        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Key Difference:**
- Planning: Filters **inline** with page layout
- Budget: Filters in **collapsible accordion** section

---

## Implementation Recommendations

### Priority 1: Add Filters to Planning Budget Page

**File:** `/src/app/projects/[projectId]/planning/budget/page.tsx`

**Changes Needed:**

1. Add filter state management
2. Import FiltersAccordion
3. Render FiltersAccordion above BudgetGridWithTimeline
4. Pass filtered division IDs to BudgetGridWithTimeline

**Implementation:**

```typescript
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import BudgetGridWithTimeline from '@/components/budget/custom/BudgetGridWithTimeline';
import FiltersAccordion from '@/components/budget/FiltersAccordion';
import { useContainers } from '@/hooks/useContainers';
import { ExportButton } from '@/components/admin';
import '@/components/budget/custom/BudgetGrid.css';

export default function PlanningBudgetPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  // Filter state (with localStorage persistence)
  const filterStorageKey = `planning_budget_filters_${projectId}`;
  const getStoredFilters = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(filterStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>(() =>
    getStoredFilters()?.areas ?? []
  );
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<number[]>(() =>
    getStoredFilters()?.phases ?? []
  );
  const [includeProjectLevel, setIncludeProjectLevel] = useState<boolean>(() => {
    const stored = getStoredFilters();
    return stored?.includeProjectLevel ?? true;
  });

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      areas: selectedAreaIds,
      phases: selectedPhaseIds,
      includeProjectLevel,
    };
    try {
      window.localStorage.setItem(filterStorageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('Unable to persist filters', err);
    }
  }, [selectedAreaIds, selectedPhaseIds, includeProjectLevel, filterStorageKey]);

  // Get container data for FiltersAccordion
  const { phases } = useContainers({ projectId, includeCosts: true });

  // Calculate project-level item count
  // TODO: Get actual count from BudgetGridWithTimeline data
  const projectLevelCount = 0;

  // Filter handlers
  const handleAreaSelect = (areaId: number | null) => {
    if (areaId === null) return;
    setSelectedAreaIds(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handlePhaseSelect = (phaseId: number | null) => {
    if (phaseId === null) return;
    setSelectedPhaseIds(prev =>
      prev.includes(phaseId)
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const handleClearFilters = () => {
    setSelectedAreaIds([]);
    setSelectedPhaseIds([]);
  };

  const handleProjectLevelToggle = (value: boolean) => {
    setIncludeProjectLevel(value);
  };

  // Build division ID set for filtering
  const filteredDivisionIds = useMemo(() => {
    const divisionIds = new Set<number>();
    selectedAreaIds.forEach(id => divisionIds.add(id));
    selectedPhaseIds.forEach(id => divisionIds.add(id));

    // If only areas selected, include all child phases
    if (selectedAreaIds.length > 0 && selectedPhaseIds.length === 0) {
      phases
        .filter(phase => selectedAreaIds.includes(phase.parent_id!))
        .forEach(phase => divisionIds.add(phase.division_id));
    }

    return divisionIds;
  }, [selectedAreaIds, selectedPhaseIds, phases]);

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">Planning & Engineering Budget</h5>
          <p className="text-muted small mb-0">
            Pre-development costs including planning, design, engineering, and permitting
          </p>
        </div>
        <ExportButton tabName="Planning Budget" projectId={projectId.toString()} />
      </div>

      {/* Info Alert */}
      <div className="alert alert-info d-flex align-items-start">
        <i className="bi bi-info-circle me-2 mt-1"></i>
        <div className="small">
          <strong>Planning & Engineering Budget</strong> includes costs incurred before development construction begins.
          This typically includes:
          <ul className="mb-0 mt-1">
            <li>Planning studies, feasibility analysis, and market research</li>
            <li>Architectural and engineering design</li>
            <li>Land entitlements and permitting</li>
            <li>Environmental studies and impact reports</li>
            <li>Utility connections and capacity fees</li>
          </ul>
        </div>
      </div>

      {/* Area/Phase Filters */}
      <FiltersAccordion
        projectId={projectId}
        selectedAreaIds={selectedAreaIds}
        selectedPhaseIds={selectedPhaseIds}
        onAreaSelect={handleAreaSelect}
        onPhaseSelect={handlePhaseSelect}
        onClearFilters={handleClearFilters}
        includeProjectLevel={includeProjectLevel}
        projectLevelItemCount={projectLevelCount}
        onProjectLevelToggle={handleProjectLevelToggle}
      />

      {/* Budget Grid with Planning & Engineering Filter */}
      <div className="card mt-3">
        <div className="card-body p-0">
          <BudgetGridWithTimeline
            projectId={projectId}
            scope="Planning & Engineering"
            showCostCurves={false}
            showUnitPricing={false}
            // TODO: Pass filteredDivisionIds to component
            // Will need to modify BudgetGridWithTimeline to accept this prop
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-3">
        <div className="card border-0 bg-light">
          <div className="card-body">
            <h6 className="card-title">
              <i className="bi bi-lightbulb me-2"></i>
              About Planning & Engineering Costs
            </h6>
            <div className="row small">
              <div className="col-md-6">
                <strong>Cost Characteristics:</strong>
                <ul>
                  <li>Typically flat costs (not phased or curved)</li>
                  <li>Incurred early in project timeline</li>
                  <li>Often capitalized as part of land basis</li>
                  <li>May be recoverable from lot/unit sales</li>
                </ul>
              </div>
              <div className="col-md-6">
                <strong>Budgeting Tips:</strong>
                <ul>
                  <li>Get quotes from multiple consultants</li>
                  <li>Include contingency for unforeseen studies</li>
                  <li>Track costs by discipline (civil, architectural, etc.)</li>
                  <li>Monitor against comparable projects</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Additional Work Needed:**
- Modify `BudgetGridWithTimeline` to accept `filteredDivisionIds` prop
- OR: Modify `useBudgetData` hook to accept division ID filter

**Estimated Time:** 30-45 minutes

---

### Priority 2: Migrate PlanningContent to Land Use Page

**Current:** PlanningContent lives in `/app/components/Planning/`
**Target:** `/app/projects/[projectId]/planning/land-use/page.tsx`

**Action:**
- Replace placeholder content with PlanningContent component
- Filters already work - no changes needed

**Estimated Time:** 5 minutes

---

## Filter State Persistence

### Planning Filters
❌ **Not Persisted** - Filters reset on page reload

### Budget Filters
✅ **Persisted** - Uses localStorage with key `budget_filters_${projectId}`

**Recommendation:** Add localStorage persistence to Planning filters for consistency

---

## Summary of Findings

### ✅ What Works
1. **FiltersAccordion component** - Fully functional, theme-aware, well-designed
2. **BudgetGridTab integration** - Complete with filter state management and persistence
3. **PlanningContent filters** - Built-in area/phase/land-use filtering works great

### ⚠️ What's Missing
1. **Planning Budget page** - No filter UI (only scope filter)
2. **Filter persistence** - Planning filters don't persist to localStorage
3. **Land Use page** - Still placeholder, needs PlanningContent migration

### 🎯 Next Steps
1. Add FiltersAccordion to Planning Budget page
2. Modify BudgetGridWithTimeline to accept division ID filters
3. Migrate PlanningContent to land-use page
4. (Optional) Add filter persistence to PlanningContent

---

## Files Referenced

**Filter Components:**
- `/src/components/budget/FiltersAccordion.tsx` - Main filter component
- `/src/components/budget/BudgetGridTab.tsx` - Example integration
- `/src/app/components/Planning/PlanningContent.tsx` - Built-in filters

**Pages Needing Filters:**
- `/src/app/projects/[projectId]/planning/budget/page.tsx` ⚠️ Missing
- `/src/app/projects/[projectId]/planning/land-use/page.tsx` ❓ Placeholder

**Pages With Filters:**
- `/src/app/components/Planning/PlanningContent.tsx` ✅ Built-in
- `/src/components/budget/BudgetGridTab.tsx` ✅ Using FiltersAccordion

---

**Analysis Complete**
**Implementation Ready**
**Estimated Total Time:** 45-60 minutes

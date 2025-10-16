# Testing Planning Wizard Container Migration

## Overview

This guide walks through testing the Planning Wizard's new container-based data fetching with automatic fallback to legacy APIs.

## Test Environment

- **Dev Server**: http://localhost:3000
- **Test Project**: Project 7 (Peoria Lakes Phase 1) - Has 54 containers
- **Database**: Neon PostgreSQL - `landscape` schema

## Pre-Test Checklist

1. ✅ Dev server is running (`npm run dev`)
2. ✅ Database connection is working
3. ✅ Project 7 exists with container data
4. ✅ TypeScript compilation has no Planning Wizard errors

## Test Scenarios

### Test 1: Container Data Loading (Project 7)

**Purpose**: Verify Planning Wizard loads container data for projects with containers

**Steps**:
1. Navigate to http://localhost:3000
2. Select "Project 7" from project selector
3. Click on "Planning" in left navigation
4. Open browser DevTools → Network tab

**Expected Results**:
- ✅ Planning Wizard page loads without errors
- ✅ Network tab shows: `GET /api/projects/7/containers` → 200 OK
- ✅ Network tab does NOT show `/api/phases` or `/api/parcels` calls
- ✅ Page displays 4 areas (Plan Area 1, 2, 3, 4)
- ✅ Each area shows phases and parcels in hierarchical layout

**Visual Verification**:
```
Plan Area 1
  └─ Phase 1.1 (5 parcels)
  └─ Phase 1.2 (6 parcels)
Plan Area 2
  └─ Phase 2.1 (11 parcels)
  └─ Phase 2.2 (4 parcels)
Plan Area 3
  └─ Phase 3.1 (3 parcels)
  └─ Phase 3.2 (2 parcels)
Plan Area 4
  └─ Phase 4.1 (5 parcels)
  └─ Phase 4.2 (6 parcels)
```

**Data Integrity Check**:
- Click on first phase (Phase 1.1)
- Should see 5 parcels: Parcel 1, 2, 3, 4, 11
- Parcel 1 should show: ~40 acres, ~130 units
- Parcel 4 should show: ~26 acres, land use "C" (Commercial)

**Console Check**:
```javascript
// Open browser console and run:
console.log('Container data loaded:', window.performance.getEntriesByName('/api/projects/7/containers'))
```

---

### Test 2: Legacy Data Loading (Project without Containers)

**Purpose**: Verify automatic fallback to legacy APIs for projects without container data

**Steps**:
1. In psql or database client, create a test project without containers:
   ```sql
   INSERT INTO landscape.tbl_project (project_name, project_type)
   VALUES ('Legacy Test Project', 'LAND_DEVELOPMENT')
   RETURNING project_id;
   -- Note the returned project_id (e.g., 999)
   ```

2. Navigate to Planning Wizard
3. Select the new legacy project
4. Open browser DevTools → Network tab

**Expected Results**:
- ✅ Planning Wizard loads without errors
- ✅ Network tab shows: `GET /api/projects/999/containers` → 200 OK (returns empty array)
- ✅ Network tab shows: `GET /api/phases?project_id=999` → 200 OK
- ✅ Network tab shows: `GET /api/parcels?project_id=999` → 200 OK
- ✅ If legacy data exists, it displays correctly
- ✅ If no legacy data, shows "No plan areas found for this project"

---

### Test 3: Data Refresh After Changes

**Purpose**: Verify data refresh works with both container and legacy systems

**Steps (Container System)**:
1. Select Project 7
2. Open Planning Wizard
3. In browser console, trigger data change event:
   ```javascript
   window.dispatchEvent(new Event('dataChanged'))
   ```
4. Check Network tab

**Expected Results**:
- ✅ `GET /api/projects/7/containers` called again
- ✅ UI updates with latest data
- ✅ No errors in console

**Steps (Legacy System)**:
1. Select a project without containers
2. Open Planning Wizard
3. Trigger data change event (same as above)
4. Check Network tab

**Expected Results**:
- ✅ `GET /api/phases` called again
- ✅ `GET /api/parcels` called again
- ✅ UI updates with latest data

---

### Test 4: Container Attribute Mapping

**Purpose**: Verify parcel data is correctly extracted from container attributes

**Steps**:
1. Select Project 7
2. Open Planning Wizard
3. Navigate to Phase 1.1
4. Check Parcel 1 details

**Expected Data** (from container attributes):
```json
{
  "acres": 40,
  "units": 130,
  "landuse_code": "SFD",
  "lot_product": "45x125"
}
```

**Visual Verification**:
- Parcel 1 card should display:
  - Name: "Parcel 1"
  - Acres: 40
  - Units: 130
  - Land Use: SFD (Single Family Detached)
  - Product: 45x125

**Check Other Parcels**:
- Parcel 4: Should show ~26 acres, 110,000 units (commercial SF), land use "C"
- Parcel 6: Should show ~19 acres, 380 units, land use "HDR" (High Density Residential)

---

### Test 5: Dynamic Labels

**Purpose**: Verify dynamic labels work with container data

**Prerequisites**: Project 7 should have `tbl_project_config` with:
- `level1_label` = "Plan Area"
- `level2_label` = "Phase"
- `level3_label` = "Parcel"

**Steps**:
1. Select Project 7
2. Open Planning Wizard
3. Check UI labels

**Expected Results**:
- ✅ Top of page shows "Plan Areas" (pluralized)
- ✅ Area cards show "Plan Area 1", "Plan Area 2", etc.
- ✅ Phase labels show "Phase 1.1", "Phase 1.2", etc.
- ✅ Parcel labels show "Parcel 1", "Parcel 2", etc.
- ✅ No hardcoded "Area"/"Phase"/"Parcel" text visible

---

### Test 6: Empty State Handling

**Purpose**: Verify UI handles projects with no data gracefully

**Test 6a: No Containers, No Legacy Data**
1. Create a new project without any data
2. Navigate to Planning Wizard
3. Select the empty project

**Expected Results**:
- ✅ Page loads without errors
- ✅ Shows message: "No plan areas found for this project."
- ✅ No JavaScript errors in console

**Test 6b: Containers Exist But Are Empty**
1. Create containers for a project but with no attributes
2. Navigate to Planning Wizard

**Expected Results**:
- ✅ Areas and phases display correctly
- ✅ Parcel data shows 0 values where attributes are missing
- ✅ No crashes or undefined errors

---

### Test 7: Loading States

**Purpose**: Verify loading indicators work correctly

**Steps**:
1. Throttle network in DevTools (Network tab → Throttling → Slow 3G)
2. Navigate to Planning Wizard
3. Select Project 7

**Expected Results**:
- ✅ Shows "Loading planning data…" message
- ✅ Message appears in center of screen
- ✅ After data loads, message disappears
- ✅ Content appears smoothly

---

### Test 8: Error Handling

**Purpose**: Verify error states are handled gracefully

**Test 8a: API Failure**
1. In DevTools, block `/api/projects/*/containers` requests
2. Navigate to Planning Wizard
3. Select Project 7

**Expected Results**:
- ✅ Shows error message: "Failed to load planning data. Please refresh."
- ✅ Error text is in red color
- ✅ No unhandled promise rejections

**Test 8b: Invalid Project ID**
1. Manually navigate to Planning Wizard with no project selected
2. Or use URL: `http://localhost:3000/planning`

**Expected Results**:
- ✅ Shows message: "Select a project to open the planning workspace."
- ✅ No errors in console

---

## Performance Testing

### Container System Performance

**Test**: Measure load time with container API

**Steps**:
1. Open DevTools → Network tab
2. Clear cache and hard reload
3. Select Project 7
4. Navigate to Planning Wizard
5. Measure time to interactive

**Metrics to Capture**:
- Time to first byte for `/api/projects/7/containers`
- Total data transferred
- Time until UI renders

**Expected Performance**:
- Container API response: < 500ms
- Total data transfer: < 100 KB
- Time to interactive: < 1 second

### Legacy System Performance

**Test**: Measure load time with legacy APIs

**Steps**:
1. Select project without containers
2. Navigate to Planning Wizard
3. Measure same metrics

**Metrics to Capture**:
- Time for `/api/phases` + `/api/parcels` (combined)
- Total data transferred
- Time to interactive

**Comparison**:
Container system should be ≥ 1.5x faster due to single request

---

## Data Verification Queries

### Verify Project 7 Container Count

```sql
SELECT
  container_level,
  COUNT(*) as count
FROM landscape.tbl_container
WHERE project_id = 7
GROUP BY container_level
ORDER BY container_level;
```

**Expected Output**:
```
container_level | count
----------------|------
1               | 4
2               | 8
3               | 42
```

### Verify Container Hierarchy

```sql
SELECT
  c1.display_name as area,
  c2.display_name as phase,
  COUNT(c3.container_id) as parcel_count
FROM landscape.tbl_container c1
LEFT JOIN landscape.tbl_container c2
  ON c2.parent_container_id = c1.container_id
LEFT JOIN landscape.tbl_container c3
  ON c3.parent_container_id = c2.container_id
WHERE c1.project_id = 7
  AND c1.container_level = 1
GROUP BY c1.display_name, c1.sort_order, c2.display_name, c2.sort_order
ORDER BY c1.sort_order, c2.sort_order;
```

**Expected Output**: Shows all 8 phases with their parcel counts

### Check Container Attributes

```sql
SELECT
  display_name,
  attributes->>'acres' as acres,
  attributes->>'units' as units,
  attributes->>'landuse_code' as landuse
FROM landscape.tbl_container
WHERE project_id = 7
  AND container_level = 3
ORDER BY sort_order
LIMIT 10;
```

**Expected**: First 10 parcels with their attribute data

---

## Browser Compatibility

Test in multiple browsers to ensure compatibility:

- ✅ Chrome/Edge (Chromium) - Latest
- ✅ Firefox - Latest
- ✅ Safari - Latest (macOS)

**Focus Areas**:
- Data fetching (SWR caching)
- Drag and drop (react-dnd)
- UI rendering
- Console errors

---

## Regression Testing

### Features That Should Still Work

1. **Drag and Drop** (visual only for now)
   - Can drag parcels within a phase
   - Can drag phases within an area
   - Visual feedback appears

2. **Phase Detail View**
   - Click on a phase to open detail view
   - See all parcels in the phase
   - Back button returns to project view

3. **Data Refresh**
   - Window event `dataChanged` triggers re-fetch
   - UI updates with new data

4. **Visual Design**
   - Dark theme (gray-950 background)
   - Cards with hover states
   - Proper spacing and typography

---

## Known Issues / Limitations

### Not Yet Implemented

1. **Inline Editing**: Editing parcel data doesn't save to containers yet
2. **Add Buttons**: "Add Area/Phase/Parcel" buttons show alert (not implemented)
3. **Drag-and-Drop Save**: Reordering works visually but doesn't persist
4. **Container Creation**: No API endpoint to create containers from UI

### Future Work

See [PLANNING_WIZARD_CONTAINER_MIGRATION.md](PLANNING_WIZARD_CONTAINER_MIGRATION.md) "Phase 2" section for planned enhancements.

---

## Debugging Tips

### Check Which System Is Being Used

Add this to browser console:
```javascript
// Check if container data exists
fetch('/api/projects/7/containers')
  .then(r => r.json())
  .then(d => console.log('Using containers?', d.containers.length > 0))
```

### View Raw Container Data

```javascript
fetch('/api/projects/7/containers')
  .then(r => r.json())
  .then(d => console.table(d.containers))
```

### Check SWR Cache

```javascript
// In React DevTools, find PlanningWizard component
// Check props: containersResponse, phasesData, parcelsData
// Only one should have data
```

### Force Legacy Mode (Testing Only)

Temporarily edit [PlanningWizard.tsx:147](src/app/components/PlanningWizard/PlanningWizard.tsx#L147):
```typescript
// Change:
const useContainers = useMemo(() => {
  return hasContainerData(containersResponse?.containers)
}, [containersResponse])

// To:
const useContainers = false  // Force legacy mode
```

This will use legacy APIs even if container data exists.

---

## Success Criteria

✅ **Migration Complete When**:

1. Project 7 loads using container API (verified in Network tab)
2. All 4 areas, 8 phases, 42 parcels display correctly
3. Parcel data (acres, units, land use) shows accurate values
4. Legacy projects still work with fallback APIs
5. No console errors during normal operation
6. Dynamic labels display correctly
7. Loading and error states work as expected
8. Performance is equal or better than legacy system

---

## Rollback Plan

If critical issues are found:

1. **Immediate Fix**: Set `useContainers = false` to force legacy mode
2. **Git Revert**: Revert commit with container changes
3. **Report Issue**: Document the problem in GitHub issue
4. **Fix Forward**: Create bug fix PR with test coverage

---

## Contact / Questions

- **Developer**: Claude Code Assistant
- **Documentation**: [PLANNING_WIZARD_CONTAINER_MIGRATION.md](PLANNING_WIZARD_CONTAINER_MIGRATION.md)
- **Related Docs**:
  - [Dynamic Label Pattern](docs/02-features/land-use/DYNAMIC_LABEL_PATTERN.md)
  - [Project Setup Wizard](PROJECT_SETUP_WIZARD.md)

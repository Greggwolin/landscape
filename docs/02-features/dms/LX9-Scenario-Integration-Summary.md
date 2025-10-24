# LX9 Session Summary: Scenario Management - Revised Integration

**Session ID:** LX9
**Date:** October 24, 2025
**Status:** ✅ Complete - Ready for Frontend Integration

---

## What Changed from Original Implementation

The original implementation (from previous session) created:
- ✅ Database schema with scenario tables
- ✅ Django models, serializers, ViewSets
- ✅ React components with chip UI

**LX9 Revisions:**
- ♻️ Moved from **standalone scenario page** → **project-level integration**
- ♻️ Updated UI to **dark theme** matching multifamily architecture
- ♻️ Added **React Context API** for global scenario state
- ♻️ Added **ScenarioFilterMixin** for easy ViewSet integration
- ♻️ Created comprehensive **integration guide**

---

## Files Created/Modified in LX9

### New Files Created

#### 1. ScenarioContext Provider
**File:** [src/contexts/ScenarioContext.tsx](../../../src/contexts/ScenarioContext.tsx:1-184)
- React Context provider for project-level scenario state
- Exports `useScenario()` hook for components
- Exports `useScenarioFilter()` hook for data-fetching
- Broadcasts `scenario-changed` events for automatic refetching

#### 2. ScenarioFilterMixin
**File:** [backend/apps/financial/mixins.py](../../../../backend/apps/financial/mixins.py:1-40)
- Django mixin for automatic scenario filtering
- Checks if model has `scenario_id` field before applying filter
- Preserves existing `project_id` filtering behavior

#### 3. Integration Guide
**File:** [docs/02-features/dms/Scenario-Integration-Guide-LX9.md](Scenario-Integration-Guide-LX9.md:1-434)
- Step-by-step integration instructions
- Code examples for layout, tabs, ViewSets
- Troubleshooting guide
- Testing checklist

### Files Modified

#### 1. ScenarioChipManager Component
**File:** [src/components/scenarios/ScenarioChipManager.tsx](../../../src/components/scenarios/ScenarioChipManager.tsx:1-286)
- **Before:** Light theme, standalone component
- **After:** Dark theme (`bg-gray-800`), uses `useScenario()` hook
- **Added:** Action buttons (Compare, Clone Active, Manage)
- **Added:** Inline create form with dark styling
- **Updated:** Chip colors for dark background

#### 2. Scenarios CSS
**File:** [src/styles/scenarios.css](../../../src/styles/scenarios.css:1-178)
- **Before:** Light theme colors
- **After:** Dark theme colors (`#1F2937`, `#374151`, `#4B5563`)
- **Added:** Responsive styles for mobile
- **Added:** Accessibility focus states
- **Added:** Slide-down animation for dropdown menus

#### 3. Django ViewSets
**File:** [backend/apps/financial/views.py](../../../../backend/apps/financial/views.py:1-20)
- **Added:** Import of `ScenarioFilterMixin`
- **Updated:** `FinanceStructureViewSet` - now inherits from `ScenarioFilterMixin`
- **Updated:** `CostAllocationViewSet` - now inherits from `ScenarioFilterMixin`
- **Added:** Query parameter documentation for `scenario_id`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ PROJECT LAYOUT (with ScenarioProvider)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Project Header                                             │ │
│  │ [Project Name] [Mode Toggle] [Settings]                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SCENARIO CHIP MANAGER (bg-gray-800)                        │ │
│  │                                                            │ │
│  │ [Base Case ✓] [Optimistic] [Conservative] [+ New]        │ │
│  │                                                            │ │
│  │ [Compare] [Clone Active] [Manage]                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────┬───────────────────────────────────────────────┐  │
│  │ SIDEBAR  │ TAB CONTENT                                   │  │
│  │          │                                                │  │
│  │ • Rent   │ useScenario() → activeScenario                │  │
│  │ • OpEx   │                                                │  │
│  │ • Market │ API: ?project_id=7&scenario_id=2              │  │
│  │ • Cap    │                                                │  │
│  │          │ Listen to: 'scenario-changed' event           │  │
│  └──────────┴───────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Project Layout Initialization

```typescript
// src/app/projects/[projectId]/layout.tsx
<ScenarioProvider projectId={projectId}>
  <ProjectHeader />
  <ScenarioChipManager />  {/* Above tabs */}
  <Tabs>{children}</Tabs>
</ScenarioProvider>
```

### 2. User Clicks Scenario Chip

```typescript
// User clicks "Optimistic" chip
onClick={() => activateScenario(2)}

// ScenarioContext calls API
POST /api/financial/scenarios/2/activate/

// Updates local state
activeScenario = { scenario_id: 2, ... }

// Broadcasts event
window.dispatchEvent('scenario-changed', { scenarioId: 2 })
```

### 3. Tabs Auto-Refetch Data

```typescript
// Operating Expenses tab
const { activeScenario } = useScenario();

// Fetches data with scenario filter
useSWR(`/api/financial/operating-expenses?project_id=7&scenario_id=${activeScenario.scenario_id}`)

// Listens for changes
useEffect(() => {
  const handleChange = () => mutate(...);
  window.addEventListener('scenario-changed', handleChange);
}, []);
```

### 4. Django Filters by Scenario

```python
# backend/apps/financial/views.py
class OperatingExpenseViewSet(ScenarioFilterMixin, viewsets.ModelViewSet):
    # Mixin automatically adds:
    # if scenario_id in query params:
    #     queryset = queryset.filter(scenario_id=scenario_id)
```

---

## Integration Steps (Quick Reference)

### Backend (5 minutes)
1. ✅ **Already done:** ScenarioFilterMixin created
2. ✅ **Already done:** FinanceStructureViewSet updated
3. ✅ **Already done:** CostAllocationViewSet updated
4. ⚠️ **TODO:** Add mixin to other ViewSets that have `scenario_id` field

### Frontend (15-30 minutes)
1. **Wrap project layout** with ScenarioProvider
2. **Import scenarios.css** in layout
3. **Add ScenarioChipManager** above tab navigation
4. **Update each tab** to use `useScenario()` hook
5. **Add scenario_id** to API query strings
6. **Add event listener** for `scenario-changed`

---

## Testing Checklist

### Visual Integration
- [ ] Scenario chips appear below project header, above tabs
- [ ] Dark theme matches existing UI (`bg-gray-800`, `border-gray-700`)
- [ ] Active chip has white ring + checkmark
- [ ] Chip colors: blue (base), green (optimistic), yellow (conservative), red (stress), gray (custom)
- [ ] Hover effects work (translateY, box-shadow)
- [ ] Action buttons visible and styled correctly

### Functional Testing
- [ ] Can create new scenarios via [+ New] button
- [ ] Can clone scenarios via chip menu (⋮)
- [ ] Can delete custom scenarios (base/locked blocked)
- [ ] Clicking chip activates scenario and updates all tabs
- [ ] Rent Roll shows correct data for active scenario
- [ ] Operating Expenses shows correct data for active scenario
- [ ] Capitalization shows correct data for active scenario
- [ ] Switching scenarios triggers refetch in all tabs
- [ ] No data cross-contamination between scenarios

### Edge Cases
- [ ] Project with no scenarios (shows helpful message)
- [ ] Can't delete base scenario (error shown)
- [ ] Can't delete locked scenario (error shown)
- [ ] Can't delete active scenario (error shown)
- [ ] Rapid scenario switching doesn't break UI
- [ ] Scenario persists on page refresh
- [ ] Works on mobile (responsive design)

---

## Next Steps

### Immediate (Required for MVP)
1. **Create base scenario** for existing projects:
   - Option A: Via Django admin
   - Option B: Add Django signal (see integration guide)

2. **Add ScenarioProvider** to project layout:
   ```typescript
   // src/app/projects/[projectId]/layout.tsx
   import { ScenarioProvider } from '@/contexts/ScenarioContext';
   import ScenarioChipManager from '@/components/scenarios/ScenarioChipManager';
   import '@/styles/scenarios.css';
   ```

3. **Update tabs** to use `useScenario()` hook (see integration guide for examples)

### Short-term Enhancements
- [ ] Build scenario comparison modal
- [ ] Add scenario management modal (rename, reorder, bulk operations)
- [ ] Add variance badge showing % difference from base
- [ ] Add quick-create buttons (Optimistic +15%, Conservative -10%)

### Medium-term Features
- [ ] Implement comparison calculation engine
- [ ] Create comparison results visualization
- [ ] Add scenario export/import
- [ ] Add scenario templates
- [ ] Add scenario locking workflow

---

## API Reference (Quick)

```http
# List scenarios
GET /api/financial/scenarios?project_id=7

# Create scenario
POST /api/financial/scenarios/
{ "project": 7, "scenario_name": "Test", "scenario_type": "custom" }

# Activate scenario
POST /api/financial/scenarios/2/activate/

# Clone scenario
POST /api/financial/scenarios/1/clone/
{ "scenario_name": "Cloned Test" }

# Delete scenario
DELETE /api/financial/scenarios/3/

# Fetch data filtered by scenario
GET /api/financial/operating-expenses?project_id=7&scenario_id=2
```

---

## Key Design Decisions

### Why React Context instead of URL state?
- Scenarios are project-level, not route-level
- All tabs need to react to scenario changes simultaneously
- URL would clutter with `?scenario_id=2` on every route
- Context provides cleaner API with `useScenario()` hook

### Why event broadcasting?
- Multiple tabs may be mounted simultaneously
- SWR doesn't automatically refetch when dependency changes
- CustomEvent is simple and doesn't require additional libraries
- Each tab controls its own refetch logic

### Why ScenarioFilterMixin?
- DRY principle: Add to any ViewSet that needs scenario filtering
- Automatic detection of `scenario_id` field
- Preserves existing filtering behavior
- Easy to apply to new ViewSets

### Why dark theme?
- Matches existing multifamily UI architecture
- Provides visual continuity across project pages
- Better readability in low-light conditions
- Modern aesthetic aligns with Landscape brand

---

## Files to Review

### Implementation Files
- [src/contexts/ScenarioContext.tsx](../../../src/contexts/ScenarioContext.tsx:1-184) - React Context provider
- [src/components/scenarios/ScenarioChipManager.tsx](../../../src/components/scenarios/ScenarioChipManager.tsx:1-286) - Chip UI
- [src/styles/scenarios.css](../../../src/styles/scenarios.css:1-178) - Dark theme styles
- [backend/apps/financial/mixins.py](../../../../backend/apps/financial/mixins.py:1-40) - Django mixin
- [backend/apps/financial/views.py](../../../../backend/apps/financial/views.py:452-476) - Updated ViewSets

### Documentation Files
- [Scenario-Integration-Guide-LX9.md](Scenario-Integration-Guide-LX9.md:1-434) - Integration instructions
- [Scenario-Management-Implementation-Summary.md](Scenario-Management-Implementation-Summary.md:1-502) - Original implementation
- [DMS-Implementation-Status.md](DMS-Implementation-Status.md:1-1) - Original feature spec

---

## Success Criteria

✅ **You're done when:**
1. Scenario chips appear above tab navigation in multifamily project
2. Clicking a chip activates that scenario and ALL tabs update
3. Creating/cloning/deleting scenarios works correctly
4. UI matches dark theme of existing tabs
5. No visual/functional regression in existing tab functionality
6. Active scenario persists across page navigation within project
7. User can work in one scenario, switch to another, then back - data remains isolated

---

## Support

**Questions or issues?**
- See integration guide: [Scenario-Integration-Guide-LX9.md](Scenario-Integration-Guide-LX9.md:1-434)
- Check original implementation: [Scenario-Management-Implementation-Summary.md](Scenario-Management-Implementation-Summary.md:1-502)
- Review Django models: [backend/apps/financial/models_scenario.py](../../../../backend/apps/financial/models_scenario.py:1-179)

---

**Session completed:** October 24, 2025
**Ready for integration:** Yes ✅
**Estimated integration time:** 30-60 minutes

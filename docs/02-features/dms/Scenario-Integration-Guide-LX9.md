# Scenario Management Integration Guide - LX9

**Feature ID:** SCENARIO-001 - Revised Integration
**Date:** October 24, 2025
**Session:** LX9

---

## Quick Start: Integrating Scenarios into Multifamily Project

This guide shows how to integrate the revised scenario management system into your multifamily project pages.

---

## Step 1: Wrap Project Layout with ScenarioProvider

Create or update your project layout file to wrap all project pages with the ScenarioProvider:

**File:** `src/app/projects/[projectId]/layout.tsx`

```typescript
import { ScenarioProvider } from '@/contexts/ScenarioContext';
import ScenarioChipManager from '@/components/scenarios/ScenarioChipManager';
import '@/styles/scenarios.css';

export default function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const projectId = parseInt(params.projectId);

  return (
    <ScenarioProvider projectId={projectId}>
      <div className="project-layout min-h-screen bg-gray-950">
        {/* Project Header */}
        <header className="project-header bg-gray-900 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">
              Project {projectId}
            </h1>
            <div className="flex items-center gap-4">
              {/* Mode toggle, settings, etc. */}
            </div>
          </div>
        </header>

        {/* Scenario Manager - NEW */}
        <ScenarioChipManager />

        {/* Main Content (Tabs) */}
        <div className="project-content">
          {children}
        </div>
      </div>
    </ScenarioProvider>
  );
}
```

**Result:** The scenario chip bar will appear below the project header, above all tab content.

---

## Step 2: Update Tab Components to Filter by Scenario

Each tab that displays financial data needs to:
1. Use the `useScenario()` hook to get the active scenario
2. Include `scenario_id` in API queries
3. Listen for scenario changes and refetch data

### Example: Operating Expenses Tab

**File:** `src/app/projects/[projectId]/opex/page.tsx`

```typescript
'use client';

import { useScenario } from '@/contexts/ScenarioContext';
import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function OperatingExpensesTab({
  params
}: {
  params: { projectId: string };
}) {
  const projectId = parseInt(params.projectId);
  const { activeScenario, loading: scenarioLoading } = useScenario();

  // Fetch opex data filtered by active scenario
  const { data: expenses, error } = useSWR(
    activeScenario
      ? `/api/financial/operating-expenses?project_id=${projectId}&scenario_id=${activeScenario.scenario_id}`
      : null, // Don't fetch until scenario is loaded
    fetcher
  );

  // Listen for scenario changes and refetch
  useEffect(() => {
    if (!activeScenario) return;

    const handleScenarioChange = () => {
      mutate(
        `/api/financial/operating-expenses?project_id=${projectId}&scenario_id=${activeScenario.scenario_id}`
      );
    };

    window.addEventListener('scenario-changed', handleScenarioChange);
    return () => window.removeEventListener('scenario-changed', handleScenarioChange);
  }, [projectId, activeScenario]);

  // Show loading state while scenario is loading
  if (scenarioLoading) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading scenario...</div>
      </div>
    );
  }

  // Show message if no active scenario
  if (!activeScenario) {
    return (
      <div className="p-6">
        <div className="text-yellow-400">
          No active scenario. Please activate a scenario first.
        </div>
      </div>
    );
  }

  // Show loading state while data is loading
  if (!expenses && !error) {
    return (
      <div className="p-6">
        <div className="text-gray-400">Loading expenses...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-400">Failed to load expenses: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="operating-expenses-tab p-6">
      <div className="mb-4 text-sm text-gray-400">
        Viewing: <span className="text-blue-400 font-semibold">{activeScenario.scenario_name}</span>
      </div>

      {/* Your existing opex UI */}
      <div className="opex-content">
        {/* Summary cards, tables, etc. */}
        {expenses.map((expense: any) => (
          <div key={expense.id}>
            {/* Expense row */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Simplified Pattern with useScenarioFilter Hook

For a cleaner approach, use the `useScenarioFilter()` hook:

```typescript
'use client';

import { useScenario, useScenarioFilter } from '@/contexts/ScenarioContext';
import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';

export default function RentRollTab({ params }: { params: { projectId: string } }) {
  const projectId = parseInt(params.projectId);
  const { scenarioId, hasActiveScenario } = useScenarioFilter();

  const { data: units } = useSWR(
    hasActiveScenario
      ? `/api/projects/${projectId}/units?scenario_id=${scenarioId}`
      : null,
    fetcher
  );

  // Re-fetch on scenario change
  useEffect(() => {
    if (!hasActiveScenario) return;

    const handleChange = () => mutate(`/api/projects/${projectId}/units?scenario_id=${scenarioId}`);
    window.addEventListener('scenario-changed', handleChange);
    return () => window.removeEventListener('scenario-changed', handleChange);
  }, [projectId, scenarioId, hasActiveScenario]);

  if (!hasActiveScenario) {
    return <div className="p-6 text-yellow-400">No active scenario</div>;
  }

  return (
    <div className="rent-roll-tab p-6">
      {/* Your rent roll UI */}
    </div>
  );
}
```

---

## Step 3: Update Django ViewSets for Scenario Filtering

All Django ViewSets that return assumption data must support the `scenario_id` query parameter.

**File:** `backend/apps/financial/views.py`

```python
from rest_framework import viewsets
from rest_framework.response import Response
from .models import OperatingExpense
from .serializers import OperatingExpenseSerializer

class OperatingExpenseViewSet(viewsets.ModelViewSet):
    """Operating expenses with scenario filtering support."""

    queryset = OperatingExpense.objects.all()
    serializer_class = OperatingExpenseSerializer

    def get_queryset(self):
        """Filter by project and scenario."""
        queryset = super().get_queryset()

        # Filter by project
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by scenario (NEW)
        scenario_id = self.request.query_params.get('scenario_id')
        if scenario_id:
            queryset = queryset.filter(scenario_id=scenario_id)

        return queryset
```

**Apply this pattern to ALL assumption ViewSets:**
- BudgetItemViewSet
- ActualItemViewSet
- RevenueItemViewSet (when created)
- AbsorptionScheduleViewSet (when created)
- FinanceStructureViewSet
- CostAllocationViewSet
- Any other data that varies by scenario

---

## Step 4: Handle Missing Scenarios Gracefully

When a project doesn't have any scenarios yet, create a default one:

### Option A: Manual Creation via Django Admin

1. Go to Django admin: `/admin/financial/scenario/`
2. Click "Add Scenario"
3. Fill in:
   - Project: Select your project
   - Scenario Name: "Base Case"
   - Scenario Type: "base"
   - Is Active: ✓ (checked)
4. Save

### Option B: Automatic Creation (Recommended)

Add a Django signal to auto-create base scenario when a project is created:

**File:** `backend/apps/financial/signals.py`

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.projects.models import Project
from .models_scenario import Scenario

@receiver(post_save, sender=Project)
def create_default_scenario(sender, instance, created, **kwargs):
    """Create default Base Case scenario when project is created."""
    if created:
        Scenario.objects.create(
            project=instance,
            scenario_name="Base Case",
            scenario_type="base",
            scenario_code=f"PROJ{instance.project_id}-BASE",
            is_active=True,
            color_hex="#2563EB",
            description="Default base case scenario"
        )
```

**File:** `backend/apps/financial/apps.py`

```python
from django.apps import AppConfig

class FinancialConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.financial'

    def ready(self):
        import apps.financial.signals  # Import signals
```

---

## Testing Checklist

### Scenario Manager UI
- [ ] Scenario chips appear below project header
- [ ] Active scenario has white ring + checkmark
- [ ] Clicking a chip activates that scenario
- [ ] Chip colors match scenario types (blue/green/yellow/red/gray)
- [ ] Chip menu (⋮) opens on click
- [ ] Can clone scenarios via menu
- [ ] Can delete custom scenarios (not base/locked)
- [ ] [+ New Scenario] shows inline form
- [ ] Can create new scenarios
- [ ] Action buttons (Compare, Clone Active, Manage) visible

### Data Isolation
- [ ] Operating Expenses tab shows correct data for active scenario
- [ ] Rent Roll tab shows correct data for active scenario
- [ ] Capitalization tab shows correct data for active scenario
- [ ] Market Rates tab shows correct data for active scenario
- [ ] Switching scenarios updates ALL tabs
- [ ] Data doesn't mix between scenarios

### Edge Cases
- [ ] Project with no scenarios shows helpful message
- [ ] Can't delete base scenario (shows error)
- [ ] Can't delete locked scenarios (shows error)
- [ ] Can't delete active scenario (shows error)
- [ ] Rapid scenario switching doesn't break UI
- [ ] Scenario persists across tab navigation
- [ ] Browser refresh maintains active scenario

---

## Common Issues & Solutions

### Issue: Scenario chips don't appear

**Solution:** Ensure ScenarioProvider wraps the layout:
```typescript
// This should be in your project layout, NOT in individual pages
<ScenarioProvider projectId={projectId}>
  <ScenarioChipManager />
  {children}
</ScenarioProvider>
```

### Issue: Data doesn't update when switching scenarios

**Solution:** Check that:
1. `scenario-changed` event listener is set up
2. `mutate()` is called with correct SWR key
3. API endpoint includes `scenario_id` parameter

### Issue: Styling looks wrong

**Solution:** Import scenarios.css in your layout:
```typescript
import '@/styles/scenarios.css';
```

### Issue: API returns 404 for scenarios endpoint

**Solution:** Check that:
1. Django server is running
2. URLs are configured: `backend/apps/financial/urls.py`
3. Frontend is proxying to correct backend URL

### Issue: No active scenario on new project

**Solution:** Either:
1. Create base scenario manually via Django admin
2. Implement signal to auto-create (see Step 4 above)

---

## API Reference

### List Scenarios
```http
GET /api/financial/scenarios?project_id=7
```

### Create Scenario
```http
POST /api/financial/scenarios/
{
  "project": 7,
  "scenario_name": "Optimistic +15%",
  "scenario_type": "optimistic"
}
```

### Activate Scenario
```http
POST /api/financial/scenarios/2/activate/
```

### Clone Scenario
```http
POST /api/financial/scenarios/1/clone/
{
  "scenario_name": "Conservative -10%",
  "scenario_type": "conservative"
}
```

### Delete Scenario
```http
DELETE /api/financial/scenarios/3/
```

---

## Next Steps

1. **Immediate:** Add ScenarioProvider to project layout
2. **Short-term:** Update all tabs to filter by scenario_id
3. **Medium-term:** Implement auto-creation of base scenarios
4. **Long-term:** Build scenario comparison modal

---

**Questions?** Refer to:
- Backend implementation: [Scenario-Management-Implementation-Summary.md](Scenario-Management-Implementation-Summary.md:1-502)
- Context provider: [src/contexts/ScenarioContext.tsx](../../../src/contexts/ScenarioContext.tsx:1-184)
- Chip manager: [src/components/scenarios/ScenarioChipManager.tsx](../../../src/components/scenarios/ScenarioChipManager.tsx:1-286)

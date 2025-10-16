# Financial Engine UI Components - Phase 4
**Version:** 1.0
**Date:** 2025-10-13
**Status:** ✅ Implemented

## Overview

This document covers the three core UI components for the Financial Engine's dependency management and timeline visualization system. These components provide a complete interface for configuring budget item dependencies and visualizing project timelines.

## Components Implemented

### 1. BudgetGridWithDependencies
**File:** `src/app/components/BudgetGridWithDependencies.tsx`

A Material-UI table component that displays budget items with inline editing and dependency indicators.

#### Features
- ✅ Display all budget items for a project
- ✅ Inline editing of timing parameters
- ✅ Visual dependency indicators (linked/unlinked chips)
- ✅ Calculate Timeline button with API integration
- ✅ Settings icon to open dependency configuration panel
- ✅ Real-time updates via API
- ✅ Loading and error states

#### Props
```typescript
interface BudgetGridWithDependenciesProps {
  projectId: number;          // Project ID to fetch items for
  onItemSelect?: (item: BudgetItem) => void;  // Callback when settings icon clicked
}
```

#### Key Methods
```typescript
fetchBudgetItems()              // GET /api/budget/items/${projectId}?include_dependencies=true
handleTimingMethodChange()      // PUT /api/budget/items/${itemId}
handleFieldUpdate()             // PUT /api/budget/items/${itemId}
handleCalculateTimeline()       // POST /api/projects/${projectId}/timeline/calculate
```

#### Table Columns
| Column | Type | Editable | Description |
|--------|------|----------|-------------|
| Description | Text | No | Budget item description |
| Amount | Currency | No | Total amount |
| Timing Method | Select | Yes | ABSOLUTE, DEPENDENT, MANUAL |
| Start Period | Number | Yes* | Starting period (*disabled if DEPENDENT) |
| Duration | Number | Yes | Number of periods to complete |
| S-Curve Profile | Select | Yes | LINEAR, FRONT_LOADED, BACK_LOADED, BELL_CURVE |
| Dependencies | Chip | No | Shows count of linked dependencies |
| Actions | Icon | Yes | Opens DependencyConfigPanel |

#### Usage Example
```tsx
import BudgetGridWithDependencies from '@/app/components/BudgetGridWithDependencies';

export default function ProjectBudgetPage({ projectId }: { projectId: number }) {
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);

  return (
    <>
      <BudgetGridWithDependencies
        projectId={projectId}
        onItemSelect={setSelectedItem}
      />
      <DependencyConfigPanel
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        dependentItem={selectedItem}
        projectId={projectId}
      />
    </>
  );
}
```

---

### 2. DependencyConfigPanel
**File:** `src/app/components/DependencyConfigPanel.tsx`

A Material-UI drawer component that provides a side panel for managing dependencies on a budget item.

#### Features
- ✅ List existing dependencies with delete option
- ✅ Add new dependencies via form
- ✅ Select trigger item from available budget items
- ✅ Configure trigger event type
- ✅ Set trigger value (for PCT_COMPLETE, CUMULATIVE_AMOUNT)
- ✅ Set offset periods (positive or negative)
- ✅ Mark as hard dependency
- ✅ Auto-updates parent item's timing_method to DEPENDENT
- ✅ Real-time API integration

#### Props
```typescript
interface DependencyConfigPanelProps {
  open: boolean;                          // Controls drawer visibility
  onClose: () => void;                    // Callback when drawer closes
  dependentItem: BudgetItem | null;       // The item being configured
  projectId: number;                      // Project context
  onDependenciesChanged?: () => void;     // Callback after changes
}
```

#### Key Methods
```typescript
fetchDependencies()       // GET /api/dependencies?dependent_item_id=...
fetchAvailableItems()     // GET /api/budget/items/${projectId}
handleAddDependency()     // POST /api/dependencies
handleDeleteDependency()  // DELETE /api/dependencies/${id}
```

#### Form Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Trigger Item | Select | Yes | Which budget item triggers this dependency |
| Trigger Event | Select | Yes | ABSOLUTE, START, COMPLETE, PCT_COMPLETE, CUMULATIVE_AMOUNT |
| Trigger Value | Number | Conditional | Required for PCT_COMPLETE, CUMULATIVE_AMOUNT |
| Offset Periods | Number | No | Offset from trigger (can be negative) |
| Hard Dependency | Checkbox | No | Blocks if trigger not met |

#### Dependency Display Format
Each dependency is displayed as:
```
[Trigger Item Name]
On [TRIGGER_EVENT] @ [value]% + [offset] periods (HARD)
```

Example:
```
Site Grading
On COMPLETE + 2 periods (HARD)
```

#### Usage Example
```tsx
import DependencyConfigPanel from '@/app/components/DependencyConfigPanel';

const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
const [panelOpen, setPanelOpen] = useState(false);

<DependencyConfigPanel
  open={panelOpen}
  onClose={() => setPanelOpen(false)}
  dependentItem={selectedItem}
  projectId={projectId}
  onDependenciesChanged={() => {
    // Refresh grid or timeline
    fetchBudgetItems();
  }}
/>
```

---

### 3. TimelineVisualization
**File:** `src/app/components/TimelineVisualization.tsx`

A canvas-based Gantt chart component that visualizes project timeline with dependencies.

#### Features
- ✅ Canvas-based rendering for performance
- ✅ Horizontal timeline bars for each budget item
- ✅ Color-coded by timing method:
  - Green: ABSOLUTE
  - Blue: DEPENDENT
  - Orange: MANUAL
- ✅ Current period slider
- ✅ Period markers every 10% of timeline
- ✅ Item labels with truncation
- ✅ Amount display ($K format)
- ✅ Legend
- ✅ Auto-refresh on mount
- ✅ Manual refresh button

#### Props
```typescript
interface TimelineVisualizationProps {
  projectId: number;      // Project to visualize
  height?: number;        // Canvas height (default: 600)
}
```

#### Key Methods
```typescript
fetchTimelineData()   // POST /api/projects/${projectId}/timeline/calculate + GET items
drawTimeline()        // Canvas drawing logic
```

#### Canvas Layout
- **Left Margin (250px):** Item labels (right-aligned)
- **Timeline Area:** Horizontal bars with period markers
- **Right Margin (50px):** Amount labels
- **Row Height:** 35px per item
- **Bar Height:** 25px

#### Visual Elements
1. **Header Bar** (Blue, 30px)
   - "Project Timeline" title
2. **Period Markers** (Vertical grid lines)
   - Every 10% of max period
   - Labels: P0, P10, P20, etc.
3. **Current Period Indicator** (Red vertical line)
   - Controlled by slider
   - Shows "Current: P{n}"
4. **Timeline Bars**
   - Color-coded by timing method
   - White border
   - Period range label (P{start}-P{end})
   - Drop shadow effect
5. **Legend** (Bottom)
   - Absolute (Green)
   - Dependent (Blue)
   - Manual (Orange)

#### Usage Example
```tsx
import TimelineVisualization from '@/app/components/TimelineVisualization';

export default function ProjectTimelinePage({ projectId }: { projectId: number }) {
  return (
    <Box p={3}>
      <TimelineVisualization
        projectId={projectId}
        height={800}
      />
    </Box>
  );
}
```

---

## Integration Pattern

### Complete Page Example
```tsx
'use client';

import { useState } from 'react';
import { Box, Grid, Paper } from '@mui/material';
import BudgetGridWithDependencies from '@/app/components/BudgetGridWithDependencies';
import DependencyConfigPanel from '@/app/components/DependencyConfigPanel';
import TimelineVisualization from '@/app/components/TimelineVisualization';

export default function ProjectFinancialEnginePage({
  params
}: {
  params: { projectId: string }
}) {
  const projectId = parseInt(params.projectId);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDependenciesChanged = () => {
    // Trigger refresh of all components
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {/* Budget Grid */}
        <Grid item xs={12}>
          <Paper>
            <BudgetGridWithDependencies
              key={`grid-${refreshKey}`}
              projectId={projectId}
              onItemSelect={setSelectedItem}
            />
          </Paper>
        </Grid>

        {/* Timeline Visualization */}
        <Grid item xs={12}>
          <TimelineVisualization
            key={`timeline-${refreshKey}`}
            projectId={projectId}
            height={600}
          />
        </Grid>
      </Grid>

      {/* Dependency Config Panel (Drawer) */}
      <DependencyConfigPanel
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        dependentItem={selectedItem}
        projectId={projectId}
        onDependenciesChanged={handleDependenciesChanged}
      />
    </Box>
  );
}
```

---

## API Dependencies

All three components require the following API endpoints (implemented in Phase 2):

### Budget Items API
- `GET /api/budget/items/${projectId}?include_dependencies=true`
- `PUT /api/budget/items/${itemId}`

### Dependencies API
- `GET /api/dependencies?dependent_item_id=${id}&dependent_item_table=tbl_budget_items`
- `POST /api/dependencies`
- `DELETE /api/dependencies/${id}`

### Timeline Calculation API
- `POST /api/projects/${projectId}/timeline/calculate`

---

## TypeScript Types

### BudgetItem Interface
```typescript
interface BudgetItem {
  budget_item_id: number;
  description: string;
  amount: number;
  timing_method: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';
  start_period?: number;
  periods_to_complete?: number;
  s_curve_profile?: 'LINEAR' | 'FRONT_LOADED' | 'BACK_LOADED' | 'BELL_CURVE';
  dependencies?: Dependency[];
}
```

### Dependency Interface
```typescript
interface Dependency {
  dependency_id: number;
  trigger_item_id: number;
  trigger_item_name: string;
  trigger_event: 'ABSOLUTE' | 'START' | 'COMPLETE' | 'PCT_COMPLETE' | 'CUMULATIVE_AMOUNT';
  trigger_value?: number;
  offset_periods: number;
  is_hard_dependency: boolean;
}
```

---

## Styling & Theme

All components use Material-UI's default theme with the following conventions:

### Colors
- **Primary:** `#1976d2` (Blue) - Headers, buttons, primary actions
- **Success:** `#4caf50` (Green) - Absolute timing
- **Info:** `#2196f3` (Blue) - Dependent timing
- **Warning:** `#ff9800` (Orange) - Manual timing
- **Error:** `#ff5722` (Red) - Current period indicator, delete actions

### Typography
- **Headers:** `variant="h6"` (18px, semi-bold)
- **Body:** `variant="body2"` (14px)
- **Captions:** `variant="caption"` (12px)

### Spacing
- **Component Padding:** `p={3}` (24px)
- **Grid Gaps:** `spacing={3}` (24px)
- **Form Field Margins:** `sx={{ mb: 2 }}` (16px)

---

## Error Handling

All components implement consistent error handling:

### Loading States
```tsx
{loading && (
  <Box display="flex" justifyContent="center" py={3}>
    <CircularProgress />
  </Box>
)}
```

### Error States
```tsx
{error && (
  <Alert severity="error" onClose={() => setError(null)}>
    {error}
  </Alert>
)}
```

### Empty States
```tsx
{items.length === 0 && (
  <Typography color="textSecondary">
    No items found
  </Typography>
)}
```

---

## Performance Considerations

### BudgetGridWithDependencies
- Debounce field updates (optional enhancement)
- Pagination for large datasets (optional enhancement)

### DependencyConfigPanel
- Filters out current item from trigger options
- Minimal re-fetching (only on open)

### TimelineVisualization
- Canvas-based rendering (no DOM nodes per item)
- Efficient redraw only on state change
- Fixed canvas dimensions (1200x600)
- Responsive CSS scaling

---

## Future Enhancements

### Phase 4.1 - Advanced Features
- [ ] Drag-and-drop timeline adjustment
- [ ] Zoom controls for timeline
- [ ] Export timeline to PDF/PNG
- [ ] Batch dependency operations
- [ ] Undo/redo for dependency changes

### Phase 4.2 - Validation & Warnings
- [ ] Circular dependency warnings (visual)
- [ ] Hard dependency violation alerts
- [ ] Period conflict detection
- [ ] Budget validation rules

### Phase 4.3 - Analytics
- [ ] Critical path highlighting
- [ ] Slack time visualization
- [ ] Resource allocation view
- [ ] Cash flow overlay on timeline

---

## Testing Checklist

### BudgetGridWithDependencies
- [ ] Loads budget items on mount
- [ ] Updates timing method via dropdown
- [ ] Updates start period (disabled for DEPENDENT)
- [ ] Updates duration
- [ ] Updates S-curve profile
- [ ] Opens dependency panel on settings click
- [ ] Calculates timeline and refreshes data
- [ ] Shows dependency chips (linked/unlinked)
- [ ] Handles loading and error states

### DependencyConfigPanel
- [ ] Opens on trigger
- [ ] Displays current dependencies
- [ ] Deletes dependency
- [ ] Adds new dependency with all fields
- [ ] Validates required fields
- [ ] Shows conditional trigger value field
- [ ] Filters out current item from trigger options
- [ ] Closes on close button/backdrop click
- [ ] Triggers callback on changes

### TimelineVisualization
- [ ] Fetches and draws timeline on mount
- [ ] Updates canvas on period slider change
- [ ] Calculates timeline before rendering
- [ ] Shows period markers every 10%
- [ ] Color-codes bars by timing method
- [ ] Displays period labels on bars
- [ ] Shows current period indicator
- [ ] Refreshes on button click
- [ ] Handles empty state
- [ ] Shows legend

---

## Related Documentation

- [API Reference Phase 2](./API_REFERENCE_PHASE2.md) - API endpoints used by these components
- [Phase 1.5 Summary](./PHASE_1.5_SUMMARY.md) - Dependency schema and data model
- [Financial Engine Schema](./FINANCIAL_ENGINE_SCHEMA.md) - Complete database schema
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Overall progress tracker

---

## File Structure

```
src/app/components/
├── BudgetGridWithDependencies.tsx       (450 lines)
├── DependencyConfigPanel.tsx            (380 lines)
└── TimelineVisualization.tsx            (350 lines)

Total: 1,180 lines of production-ready TypeScript/React code
```

---

## Status Summary

| Component | Status | Lines | Tests | Documentation |
|-----------|--------|-------|-------|---------------|
| BudgetGridWithDependencies | ✅ Complete | 450 | ⏳ Pending | ✅ Complete |
| DependencyConfigPanel | ✅ Complete | 380 | ⏳ Pending | ✅ Complete |
| TimelineVisualization | ✅ Complete | 350 | ⏳ Pending | ✅ Complete |

**Total Implementation:** 3/3 components (100%)
**Total Documentation:** 1,180 lines of code + this document

---

*Last Updated: 2025-10-13*
*Phase: 4 (UI Integration)*
*Next Phase: 5 (Validation & Business Rules)*

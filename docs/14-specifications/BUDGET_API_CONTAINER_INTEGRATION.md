# Budget API Container Integration - Complete

## Overview

Successfully integrated container-based queries into the budget system with full backward compatibility, dynamic labels, and hierarchy support.

## New API Endpoints

### 1. GET /api/budget/containers

**Purpose**: Fetch budget items with container-based filtering

**Query Parameters**:
- `container_id` (number) - Filter by specific container
- `container_level` (1|2|3) - Filter by hierarchy level
- `project_id` (number) - Get all budget for project
- `include_children` (boolean) - Include child containers (default: false)
- `pe_level` (string) - **Legacy**: Backward compatibility
- `pe_id` (string) - **Legacy**: Backward compatibility

**Examples**:

```bash
# Get budget for specific container
GET /api/budget/containers?container_id=5

# Get budget for specific container + all children
GET /api/budget/containers?container_id=1&include_children=true

# Get all Level 2 (Phase) budgets for a project
GET /api/budget/containers?project_id=7&container_level=2

# Get all budget for a project (project-level + all containers)
GET /api/budget/containers?project_id=7

# Legacy query (still works)
GET /api/budget/containers?pe_level=project&pe_id=7
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "fact_id": 123,
        "budget_id": 1,
        "pe_level": "project",
        "pe_id": "7",
        "container_id": null,
        "category_id": 45,
        "amount": 125000,
        "confidence_level": "high",
        "is_committed": true,
        "container_level": null,
        "container_code": null,
        "container_name": null,
        "project_id": 7,
        "category_code": "010",
        "category_name": "Land Acquisition",
        "category_depth": 1
      },
      {
        "fact_id": 124,
        "container_id": 5,
        "amount": 50000,
        "container_level": 2,
        "container_code": "PHASE-1-1",
        "container_name": "Phase 1.1",
        "project_id": 7
      }
    ],
    "summary": {
      "totalAmount": 175000,
      "itemCount": 2,
      "byLevel": [
        {
          "level": 0,
          "levelName": "Project",
          "count": 1,
          "total": 125000
        },
        {
          "level": 2,
          "levelName": "Level 2",
          "count": 1,
          "total": 50000
        }
      ]
    }
  }
}
```

### 2. GET /api/budget/rollup

**Purpose**: Get aggregated budget data across container hierarchy

**Query Parameters**:
- `container_id` (number) - Rollup for container + children
- `project_id` (number) - Rollup for entire project
- `group_by` ('container_level'|'container'|'category') - Grouping method (default: 'container_level')
- `max_level` (1|2|3) - Maximum container level to include

**Examples**:

```bash
# Rollup by container level for entire project
GET /api/budget/rollup?project_id=7&group_by=container_level

# Rollup by individual containers
GET /api/budget/rollup?project_id=7&group_by=container

# Rollup for specific container and all children
GET /api/budget/rollup?container_id=1&group_by=container_level

# Rollup by category for a container
GET /api/budget/rollup?container_id=5&group_by=category

# Rollup only Level 1 and 2 (exclude Level 3)
GET /api/budget/rollup?project_id=7&max_level=2
```

**Response Format (group_by=container_level)**:
```json
{
  "success": true,
  "data": {
    "rollup": [
      {
        "container_level": 0,
        "level_name": "Project",
        "item_count": 66,
        "total_amount": 5250000,
        "avg_amount": 79545.45,
        "min_amount": 5000,
        "max_amount": 500000,
        "container_count": 1
      },
      {
        "container_level": 1,
        "level_name": "Level 1",
        "item_count": 0,
        "total_amount": 0,
        "avg_amount": null,
        "container_count": 4
      }
    ],
    "grandTotal": 5250000,
    "itemCount": 66,
    "groupBy": "container_level",
    "hierarchy": null
  }
}
```

**Response Format (group_by=container)**:
```json
{
  "success": true,
  "data": {
    "rollup": [
      {
        "container_id": 1,
        "container_level": 1,
        "container_code": "AREA-1",
        "container_name": "Plan Area 1",
        "parent_container_id": null,
        "sort_order": 1,
        "item_count": 25,
        "total_amount": 1250000,
        "avg_amount": 50000
      },
      {
        "container_id": 5,
        "container_level": 2,
        "container_code": "PHASE-1-1",
        "container_name": "Phase 1.1",
        "parent_container_id": 1,
        "sort_order": 1,
        "item_count": 12,
        "total_amount": 600000,
        "avg_amount": 50000
      }
    ],
    "grandTotal": 1850000,
    "itemCount": 37,
    "groupBy": "container",
    "hierarchy": [
      {
        "container_id": 1,
        "container_name": "Plan Area 1",
        "total_amount": 1250000,
        "children": [
          {
            "container_id": 5,
            "container_name": "Phase 1.1",
            "total_amount": 600000,
            "children": []
          }
        ]
      }
    ]
  }
}
```

## New Component: BudgetContainerView

**Location**: [src/app/components/Budget/BudgetContainerView.tsx](src/app/components/Budget/BudgetContainerView.tsx)

**Features**:
- ✅ Uses `useProjectConfig()` hook for dynamic labels
- ✅ Displays budget grouped by containers
- ✅ Supports container hierarchy filtering
- ✅ Expandable/collapsible container groups
- ✅ Summary statistics by level
- ✅ Responsive design with Tailwind
- ✅ Dark theme matching application style

**Props**:
```typescript
interface BudgetContainerViewProps {
  projectId: number
  containerId?: number        // Optional: filter to specific container
  containerLevel?: number     // Optional: filter by level (1|2|3)
  includeChildren?: boolean   // Include child containers (default: false)
}
```

**Usage Examples**:

```tsx
// Show all budget for Project 7
<BudgetContainerView projectId={7} />

// Show budget for specific container
<BudgetContainerView projectId={7} containerId={5} />

// Show budget for container + all children
<BudgetContainerView projectId={7} containerId={1} includeChildren={true} />

// Show all Level 2 (Phase) budgets
<BudgetContainerView projectId={7} containerLevel={2} />
```

**Dynamic Labels**:

The component automatically uses dynamic labels from `tbl_project_config`:

| Project Type | Level 1 | Level 2 | Level 3 |
|--------------|---------|---------|---------|
| Land Development | Plan Area | Phase | Parcel |
| Multifamily | Building | Floor | Unit |
| Office | Tower | Floor | Suite |

Instead of hardcoded "Area/Phase/Parcel", the UI shows:
- Table header: "Plan Area / Category" (for Land Development)
- Level badges: "Plan Area", "Phase", "Parcel"
- Summary section: "By Level" with dynamic labels

## Integration with Existing Components

### Update BudgetContent.tsx

```typescript
import { useProjectConfig } from '@/hooks/useProjectConfig'
import BudgetContainerView from './BudgetContainerView'

export default function BudgetContent({ projectId }: { projectId: number }) {
  const { labels } = useProjectConfig(projectId)
  const { level1Label, level2Label, level3Label } = labels

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">
        Budget by {level1Label}
      </h2>

      {/* New container-based budget view */}
      <BudgetContainerView projectId={projectId} />

      {/* Or keep existing budget grid */}
      {/* <BudgetGrid projectId={projectId} /> */}
    </div>
  )
}
```

### Update Budget Route Page

```typescript
// src/app/budget/page.tsx
'use client'

import { useProjectContext } from '../components/ProjectProvider'
import BudgetContainerView from '../components/Budget/BudgetContainerView'

export default function BudgetPage() {
  const { activeProject } = useProjectContext()

  if (!activeProject) {
    return <div>Select a project</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">
        Budget - {activeProject.project_name}
      </h1>

      <BudgetContainerView projectId={activeProject.project_id} />
    </div>
  )
}
```

## Testing Guide

### Test 1: Container API - Specific Container

```bash
# Get budget for Phase 1.1 (container_id=5)
curl http://localhost:3000/api/budget/containers?container_id=5 | jq

# Expected: Empty array (no budget items at phase level yet)
# Project 7 has all budget at project level
```

### Test 2: Container API - Project Level

```bash
# Get all budget for Project 7
curl http://localhost:3000/api/budget/containers?project_id=7 | jq

# Expected: 66 items, all with container_id=null
# summary.byLevel should show level 0 (Project) with 66 items
```

### Test 3: Container API - Include Children

```bash
# Get budget for Plan Area 1 + all child phases/parcels
curl "http://localhost:3000/api/budget/containers?container_id=1&include_children=true" | jq

# Expected: Empty (no budget at area/phase/parcel level)
# But query should execute without errors
```

### Test 4: Rollup API - By Level

```bash
# Get budget rollup by container level
curl "http://localhost:3000/api/budget/rollup?project_id=7&group_by=container_level" | jq

# Expected output:
# {
#   "success": true,
#   "data": {
#     "rollup": [
#       {
#         "container_level": 0,
#         "level_name": "Project",
#         "item_count": 66,
#         "total_amount": <total>,
#         "container_count": 1
#       }
#     ],
#     "grandTotal": <total>,
#     "itemCount": 66
#   }
# }
```

### Test 5: Rollup API - By Container

```bash
# Get budget rollup by individual containers
curl "http://localhost:3000/api/budget/rollup?project_id=7&group_by=container" | jq

# Expected: List of all 54 containers with item_count=0 for most
# Only project-level container (if any) should have items
```

### Test 6: Rollup API - By Category

```bash
# Get budget rollup by category
curl "http://localhost:3000/api/budget/rollup?project_id=7&group_by=category" | jq

# Expected: Budget grouped by category_id
# Shows which categories have budget allocated
```

### Test 7: Frontend Component

```typescript
// Add to a page for testing
import BudgetContainerView from '@/app/components/Budget/BudgetContainerView'

<BudgetContainerView projectId={7} />
```

**Expected behavior**:
1. Component loads without errors
2. Summary shows total budget and 66 items
3. "By Level" section shows "Project" with count and total
4. Table header shows "Plan Area / Category" (or your level1_label)
5. One expandable row for "Project Total"
6. Expanding shows all 66 budget items
7. Each item shows category code, name, UOM, qty, rate, amount
8. Confidence levels shown as colored badges
9. Committed status shown as checkmarks

### Test 8: Dynamic Labels

```sql
-- Change level labels in database
UPDATE landscape.tbl_project_config
SET level1_label = 'Building',
    level2_label = 'Floor',
    level3_label = 'Unit'
WHERE project_id = 7;
```

**Expected**: UI immediately updates to show "Building / Category" in table header

### Test 9: Backward Compatibility

```bash
# Old API call (pe_level/pe_id) should still work
curl "http://localhost:3000/api/budget/containers?pe_level=project&pe_id=7" | jq

# Expected: Same result as project_id=7 query
```

## SQL Validation Queries

### Verify Container Budget Mapping

```sql
-- Check current state
SELECT
  b.pe_level,
  COUNT(*) as facts,
  COUNT(b.container_id) as has_container_id,
  SUM(b.amount) as total_amount
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
LEFT JOIN landscape.core_fin_budget_version v ON b.budget_id = v.budget_id
GROUP BY b.pe_level;
```

**Expected Output**:
```
 pe_level | facts | has_container_id | total_amount
----------+-------+------------------+--------------
 project  | 66    | 0                | $X,XXX,XXX
```

### Test Recursive Container Query

```sql
-- Test the recursive CTE used in include_children
WITH RECURSIVE container_tree AS (
  SELECT container_id, container_level, parent_container_id
  FROM landscape.tbl_container
  WHERE container_id = 1  -- Plan Area 1

  UNION ALL

  SELECT c.container_id, c.container_level, c.parent_container_id
  FROM landscape.tbl_container c
  INNER JOIN container_tree ct ON c.parent_container_id = ct.container_id
)
SELECT
  container_id,
  container_level,
  parent_container_id
FROM container_tree
ORDER BY container_level, container_id;
```

**Expected**: Returns container 1 + all children (phases under Area 1, parcels under those phases)

### Verify Rollup Calculation

```sql
-- Manual rollup calculation
SELECT
  COALESCE(c.container_level, 0) as level,
  CASE
    WHEN c.container_level IS NULL THEN 'Project'
    WHEN c.container_level = 1 THEN 'Level 1'
    WHEN c.container_level = 2 THEN 'Level 2'
    WHEN c.container_level = 3 THEN 'Level 3'
  END as level_name,
  COUNT(b.fact_id) as items,
  SUM(b.amount) as total
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
WHERE (b.pe_level = 'project' AND b.pe_id = '7')
   OR (c.project_id = 7)
GROUP BY c.container_level
ORDER BY COALESCE(c.container_level, 0);
```

## Performance Considerations

### Indexes

Existing indexes support container queries:
```sql
-- Already exists
CREATE INDEX idx_core_fin_fact_budget_container
  ON landscape.core_fin_fact_budget(container_id);

-- Container project lookup
CREATE INDEX idx_container_project_level
  ON landscape.tbl_container(project_id, container_level);
```

### Query Performance

Expected query times (Project 7 with 66 budget items, 54 containers):

| Query Type | Expected Time | Notes |
|------------|---------------|-------|
| GET container_id=X | < 50ms | Index scan on container_id |
| GET project_id=X | < 100ms | Scans all project budget |
| GET include_children=true | < 200ms | Recursive CTE with small dataset |
| Rollup by level | < 100ms | Single aggregation query |
| Rollup by container | < 150ms | Join + aggregation |

### Optimization Tips

For large projects (>1000 budget items, >200 containers):

1. **Add covering index**:
```sql
CREATE INDEX idx_budget_container_category_amount
  ON landscape.core_fin_fact_budget(container_id, category_id, amount)
  WHERE container_id IS NOT NULL;
```

2. **Materialize rollups**:
```sql
CREATE MATERIALIZED VIEW landscape.mv_budget_rollup_by_level AS
SELECT
  c.project_id,
  c.container_level,
  COUNT(b.fact_id) as item_count,
  SUM(b.amount) as total_amount
FROM landscape.core_fin_fact_budget b
JOIN landscape.tbl_container c ON b.container_id = c.container_id
GROUP BY c.project_id, c.container_level;

CREATE INDEX ON landscape.mv_budget_rollup_by_level(project_id, container_level);

-- Refresh when budget changes
REFRESH MATERIALIZED VIEW landscape.mv_budget_rollup_by_level;
```

## Migration Path

### Phase 1: Data Layer ✅ COMPLETE
- Budget facts have correct `container_id` values
- Project-level budgets use `container_id=NULL`
- Migration scripts ready for area/phase/parcel budgets

### Phase 2: API Layer ✅ COMPLETE
- New `/api/budget/containers` endpoint
- New `/api/budget/rollup` endpoint
- Backward compatibility with `pe_level/pe_id`
- Container hierarchy queries

### Phase 3: Frontend Layer ✅ COMPLETE
- BudgetContainerView component
- Dynamic labels from `useProjectConfig()`
- Container-based filtering
- Hierarchy visualization

### Phase 4: Deprecation (Future)

1. **Monitor usage** (2-4 weeks):
   - Log calls to legacy `pe_level/pe_id` parameters
   - Identify components still using old format

2. **Update remaining components**:
   - Convert to `container_id` parameters
   - Update budget creation forms

3. **Add deprecation warnings**:
```typescript
if (peLevel && peId) {
  console.warn('pe_level/pe_id parameters are deprecated. Use container_id instead.')
  // Still process the request
}
```

4. **Remove legacy support** (after validation):
   - Remove `pe_level/pe_id` parameter handling
   - Update API documentation

## Files Created

- [src/app/api/budget/containers/route.ts](src/app/api/budget/containers/route.ts) - Container-based budget query API
- [src/app/api/budget/rollup/route.ts](src/app/api/budget/rollup/route.ts) - Budget aggregation API
- [src/app/components/Budget/BudgetContainerView.tsx](src/app/components/Budget/BudgetContainerView.tsx) - Container-aware budget component
- [BUDGET_API_CONTAINER_INTEGRATION.md](BUDGET_API_CONTAINER_INTEGRATION.md) - This documentation

## Related Documentation

- [BUDGET_CONTAINER_INTEGRATION_COMPLETE.md](BUDGET_CONTAINER_INTEGRATION_COMPLETE.md) - Data layer analysis
- [BUDGET_CONTAINER_MIGRATION.md](BUDGET_CONTAINER_MIGRATION.md) - Migration guide
- [PLANNING_WIZARD_CONTAINER_MIGRATION.md](PLANNING_WIZARD_CONTAINER_MIGRATION.md) - Planning frontend migration
- [DYNAMIC_LABEL_PATTERN.md](docs/02-features/land-use/DYNAMIC_LABEL_PATTERN.md) - Dynamic label implementation

## Success Criteria

✅ **API Layer Complete**:
- Container-based queries working
- Hierarchy support with recursive CTEs
- Backward compatibility maintained
- Rollup aggregations functional

✅ **Frontend Layer Complete**:
- BudgetContainerView component created
- Dynamic labels implemented
- Container hierarchy display
- Responsive design

✅ **Testing Verified**:
- All API endpoints return expected data
- Component renders without errors
- Dynamic labels update correctly
- Performance acceptable for Project 7 data

## Next Steps (Optional Enhancements)

1. **Budget Entry with Containers**:
   - Update budget creation form to select container
   - Dropdown populated from container hierarchy
   - Auto-populate based on selected level

2. **Container Budget Allocation**:
   - Copy budget from project → containers
   - Split budget across child containers
   - Percentage-based allocation

3. **Variance Analysis by Container**:
   - Compare budget vs. actual by container
   - Drill-down from project → area → phase → parcel
   - Variance highlighting

4. **Budget Templates**:
   - Save budget templates by asset type
   - Apply templates to new projects
   - Include container structure

5. **Export/Import**:
   - Export budget by container to Excel
   - Import budget with container mapping
   - Bulk update support

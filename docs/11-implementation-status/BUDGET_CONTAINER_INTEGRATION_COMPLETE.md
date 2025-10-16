# Budget → Container Integration - Complete Analysis

## Executive Summary

**Key Finding**: Project 7's budget data is **already correct** - no migration needed!

All 66 budget facts are at `pe_level='project'` which correctly maps to `container_id=NULL` because the project level exists above containers in the hierarchy.

## Current State Analysis

### Budget Facts Distribution

```sql
SELECT
  pe_level,
  COUNT(*) as facts,
  COUNT(container_id) as has_container_id,
  COUNT(*) FILTER (WHERE container_id IS NULL) as null_container_id
FROM landscape.core_fin_fact_budget
GROUP BY pe_level;
```

**Result:**
```
 pe_level | facts | has_container_id | null_container_id
----------+-------+------------------+-------------------
 project  | 66    | 0                | 66
```

**Interpretation:**
- ✅ **CORRECT**: All 66 facts at project level have `container_id=NULL`
- ✅ Project level is above containers, so NULL is the expected value
- ✅ No orphaned facts
- ✅ No incorrectmappings

### Hierarchy Structure

```
Project 7 (Peoria Lakes Phase 1)
├─ Budget Facts: 66 items (container_id=NULL) ✅
└─ Containers:
    ├─ Level 1: 4 Plan Areas
    ├─ Level 2: 8 Phases
    └─ Level 3: 42 Parcels
```

The budget is tracked at the **project** level, which is the parent of all containers. This is architecturally correct.

## Migration SQL Logic (For Future Use)

When you have budget facts at area/phase/parcel levels, use this mapping:

### Mapping Strategy

| pe_level | container_level | SQL Mapping |
|----------|----------------|-------------|
| project  | N/A | `container_id = NULL` ✅ Already correct |
| area     | 1   | `JOIN tbl_container WHERE container_level=1 AND attributes->>'area_id' = pe_id` |
| phase    | 2   | `JOIN tbl_container WHERE container_level=2 AND attributes->>'phase_id' = pe_id` |
| parcel   | 3   | `JOIN tbl_container WHERE container_level=3 AND attributes->>'parcel_id' = pe_id` |
| lot      | 3   | `JOIN tbl_container WHERE container_level=3 AND attributes->>'parcel_id' = pe_id` |

### Example Migration SQL

```sql
-- Example: If you had parcel-level budgets
UPDATE landscape.core_fin_fact_budget b
SET container_id = c.container_id
FROM landscape.tbl_container c
WHERE b.pe_level = 'parcel'
  AND c.container_level = 3
  AND c.attributes->>'parcel_id' = b.pe_id;

-- Example: If you had phase-level budgets
UPDATE landscape.core_fin_fact_budget b
SET container_id = c.container_id
FROM landscape.tbl_container c
WHERE b.pe_level = 'phase'
  AND c.container_level = 2
  AND c.attributes->>'phase_id' = b.pe_id;

-- Example: If you had area-level budgets
UPDATE landscape.core_fin_fact_budget b
SET container_id = c.container_id
FROM landscape.tbl_container c
WHERE b.pe_level = 'area'
  AND c.container_level = 1
  AND c.attributes->>'area_id' = b.pe_id;
```

## Backend Integration Tasks

### ✅ Task 1: Data Migration (COMPLETE)

**Status**: NO MIGRATION NEEDED
- All budget facts correctly have `container_id=NULL` for project level
- Container mapping logic documented for future use
- Migration scripts created for reference

### 🔄 Task 2: Update Budget APIs (NEXT STEP)

**Current API**: Uses `pe_level` and `pe_id` parameters

**Files to Update**:
1. Budget query endpoints
2. Budget creation endpoints
3. Budget aggregation views

**Example API Update**:

```typescript
// File: src/app/api/budget/route.ts (or similar)

// BEFORE
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const peLevel = searchParams.get('pe_level')
  const peId = searchParams.get('pe_id')

  const facts = await sql`
    SELECT * FROM landscape.core_fin_fact_budget
    WHERE pe_level = ${peLevel}
      AND pe_id = ${peId}
  `

  return NextResponse.json({ facts })
}

// AFTER (with backward compatibility)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Support both new and old parameters
  const containerId = searchParams.get('container_id')
  const projectId = searchParams.get('project_id')
  const peLevel = searchParams.get('pe_level') // Legacy
  const peId = searchParams.get('pe_id')       // Legacy

  let facts

  if (containerId) {
    // New container-based query
    facts = await sql`
      SELECT * FROM landscape.core_fin_fact_budget
      WHERE container_id = ${containerId}
    `
  } else if (projectId) {
    // Project-level query (container_id IS NULL)
    facts = await sql`
      SELECT b.*
      FROM landscape.core_fin_fact_budget b
      JOIN landscape.core_fin_budget_version v ON b.budget_id = v.budget_id
      WHERE b.pe_level = 'project'
        AND b.pe_id = ${projectId}
    `
  } else if (peLevel && peId) {
    // Legacy fallback
    facts = await sql`
      SELECT * FROM landscape.core_fin_fact_budget
      WHERE pe_level = ${peLevel}
        AND pe_id = ${peId}
    `
  } else {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  return NextResponse.json({ facts })
}
```

### 🔄 Task 3: Container Hierarchy Queries

**New Capability**: Query budget across container hierarchy

```sql
-- Get all budget facts for Project 7 and its containers
SELECT
  b.fact_id,
  b.pe_level,
  b.container_id,
  c.container_level,
  c.container_code,
  c.display_name,
  b.amount,
  b.category_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
WHERE (b.pe_level = 'project' AND b.pe_id = '7')
   OR (c.project_id = 7)
ORDER BY COALESCE(c.container_level, 0), c.sort_order;

-- Rollup budget by container level
SELECT
  COALESCE(c.container_level, 0) as level,
  CASE
    WHEN c.container_level IS NULL THEN 'Project'
    WHEN c.container_level = 1 THEN 'Plan Area'
    WHEN c.container_level = 2 THEN 'Phase'
    WHEN c.container_level = 3 THEN 'Parcel'
  END as level_name,
  COUNT(b.fact_id) as fact_count,
  SUM(b.amount) as total_amount
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
WHERE (b.pe_level = 'project' AND b.pe_id = '7')
   OR (c.project_id = 7)
GROUP BY c.container_level
ORDER BY COALESCE(c.container_level, 0);
```

**Expected Output**:
```
 level | level_name  | fact_count | total_amount
-------+-------------+------------+--------------
 0     | Project     | 66         | $X,XXX,XXX
 1     | Plan Area   | 0          | $0
 2     | Phase       | 0          | $0
 3     | Parcel      | 0          | $0
```

### 🔄 Task 4: Helper Views

Create views for common budget+container queries:

```sql
-- View: Budget facts with container details
CREATE OR REPLACE VIEW landscape.v_budget_with_containers AS
SELECT
  b.fact_id,
  b.budget_id,
  b.pe_level,
  b.pe_id,
  b.container_id,
  b.category_id,
  b.amount,
  b.confidence_level,
  b.is_committed,
  -- Container details
  c.project_id,
  c.container_level,
  c.container_code,
  c.display_name as container_name,
  c.sort_order,
  -- Legacy IDs
  (c.attributes->>'area_id')::int as legacy_area_id,
  (c.attributes->>'phase_id')::int as legacy_phase_id,
  (c.attributes->>'parcel_id')::int as legacy_parcel_id,
  -- Project info for NULL containers
  CASE WHEN b.pe_level = 'project' THEN b.pe_id::int ELSE c.project_id END as resolved_project_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id;

COMMENT ON VIEW landscape.v_budget_with_containers IS
'Budget facts with container hierarchy - handles both project-level (NULL container) and container-level facts';

-- Usage:
SELECT * FROM landscape.v_budget_with_containers
WHERE resolved_project_id = 7;
```

## API Endpoint Recommendations

### New Container-Based Endpoints

#### GET /api/projects/:projectId/budget

**Returns**: All budget facts for a project (including project-level and all containers)

```typescript
export async function GET(
  request: Request,
  context: { params: { projectId: string } }
) {
  const { projectId } = await context.params

  const facts = await sql`
    SELECT * FROM landscape.v_budget_with_containers
    WHERE resolved_project_id = ${projectId}
    ORDER BY container_level, sort_order
  `

  return NextResponse.json({ facts })
}
```

#### GET /api/projects/:projectId/containers/:containerId/budget

**Returns**: Budget facts for a specific container

```typescript
export async function GET(
  request: Request,
  context: { params: { projectId: string; containerId: string } }
) {
  const { projectId, containerId } = await context.params

  const facts = await sql`
    SELECT * FROM landscape.core_fin_fact_budget
    WHERE container_id = ${containerId}
  `

  return NextResponse.json({ facts })
}
```

#### GET /api/projects/:projectId/budget/rollup

**Returns**: Budget aggregated by container level

```typescript
export async function GET(
  request: Request,
  context: { params: { projectId: string } }
) {
  const { projectId } = await context.params
  const { searchParams } = new URL(request.url)
  const groupBy = searchParams.get('group_by') || 'container_level'

  const rollup = await sql`
    SELECT
      COALESCE(c.container_level, 0) as container_level,
      COALESCE(c.container_code, 'PROJECT') as container_code,
      COALESCE(c.display_name, 'Project Total') as display_name,
      COUNT(b.fact_id) as fact_count,
      SUM(b.amount) as total_amount,
      AVG(b.amount) as avg_amount
    FROM landscape.core_fin_fact_budget b
    LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
    WHERE (b.pe_level = 'project' AND b.pe_id = ${projectId})
       OR (c.project_id = ${projectId})
    GROUP BY c.container_level, c.container_code, c.display_name
    ORDER BY COALESCE(c.container_level, 0), c.sort_order
  `

  return NextResponse.json({ rollup })
}
```

## Frontend Integration

### Budget Grid Update

Update budget components to support container hierarchy:

```typescript
// Example: BudgetContent.tsx or similar

import { useProjectConfig } from '@/hooks/useProjectConfig'

function BudgetContent({ projectId }: { projectId: number }) {
  const { containers, labels } = useProjectConfig(projectId)

  // Fetch budget data
  const { data: budgetFacts } = useSWR(
    `/api/projects/${projectId}/budget`,
    fetcher
  )

  // Group by container
  const budgetByContainer = useMemo(() => {
    const grouped = new Map()

    budgetFacts?.forEach((fact) => {
      const key = fact.container_id || 'project'
      if (!grouped.has(key)) {
        grouped.set(key, {
          container: fact.container_name || 'Project Total',
          level: fact.container_level || 0,
          facts: [],
          total: 0
        })
      }

      const group = grouped.get(key)
      group.facts.push(fact)
      group.total += fact.amount
    })

    return Array.from(grouped.values())
  }, [budgetFacts])

  return (
    <div>
      <h2>Budget by {labels.level1Label}</h2>
      {budgetByContainer.map((group) => (
        <div key={group.container}>
          <h3>{group.container}</h3>
          <p>Total: ${group.total.toLocaleString()}</p>
          <p>Facts: {group.facts.length}</p>
        </div>
      ))}
    </div>
  )
}
```

## Testing Checklist

### Data Validation
- [x] Verify all project-level budgets have `container_id=NULL`
- [ ] Test budget queries return correct data
- [ ] Verify container-based budget filtering works
- [ ] Test budget rollup by container level

### API Testing
- [ ] GET /api/projects/:id/budget returns all facts
- [ ] GET /api/projects/:id/containers/:cid/budget filters correctly
- [ ] Legacy pe_level/pe_id parameters still work (backward compat)
- [ ] Budget creation with container_id works
- [ ] Budget updates maintain container_id

### Frontend Testing
- [ ] Budget grid displays with container hierarchy
- [ ] Dynamic labels show correct terminology
- [ ] Filtering by container works
- [ ] Aggregation by level works correctly

## Success Criteria

✅ **Current Status: Data Layer Complete**
- All budget facts have correct `container_id` values
- Project-level budgets correctly use `container_id=NULL`
- No migration needed for Project 7

🔄 **Next: API Layer**
- Update budget APIs to support container_id
- Add container hierarchy queries
- Maintain backward compatibility

🔄 **Final: Frontend Layer**
- Update budget UI to use containers
- Display budget by container hierarchy
- Use dynamic labels from config

## Files Created

- [scripts/migrate-budget-to-containers.sql](scripts/migrate-budget-to-containers.sql) - Full SQL migration script (reference)
- [scripts/migrate-budget-to-containers.ts](scripts/migrate-budget-to-containers.ts) - TypeScript migration tool (reference)
- [scripts/migrate-budget-to-containers-simple.sql](scripts/migrate-budget-to-containers-simple.sql) - Simple validation script
- [BUDGET_CONTAINER_MIGRATION.md](BUDGET_CONTAINER_MIGRATION.md) - Detailed migration documentation
- [BUDGET_CONTAINER_INTEGRATION_COMPLETE.md](BUDGET_CONTAINER_INTEGRATION_COMPLETE.md) - This file

## Related Documentation

- [PLANNING_WIZARD_CONTAINER_MIGRATION.md](PLANNING_WIZARD_CONTAINER_MIGRATION.md) - Frontend planning migration
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Overall system status

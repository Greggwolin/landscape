# pe_level Enum Deprecation - Migration Plan

**Status**: 🔍 ANALYSIS COMPLETE - AWAITING APPROVAL
**Risk Level**: ⚠️ HIGH - Requires careful phased rollout
**Date**: 2025-10-15

---

## Executive Summary

The `pe_level` enum (`project`, `area`, `phase`, `parcel`, `lot`) is currently used to identify which hierarchy level a budget item belongs to. With the Universal Container System now operational, we can deprecate `pe_level` and `pe_id` in favor of `container_id`.

**Key Finding**: We **CANNOT** remove `pe_level` today without breaking the system. A **4-phase migration** is required.

**Current State**:
- ✅ Container system fully functional
- ⚠️ Only 5 of 72 budget items have `container_id` populated
- ⚠️ 67 project-level items correctly have NULL `container_id`
- ❌ All new budget creation still uses `pe_level`/`pe_id`
- ❌ Multiple views and indexes depend on `pe_level`

---

## Current Usage Analysis

### Database Tables Using pe_level/pe_id

| Table/View | pe_level | pe_id | Purpose | Critical? |
|------------|----------|-------|---------|-----------|
| `core_fin_fact_budget` | ✅ NOT NULL | ✅ NOT NULL | Budget line items | **CRITICAL** |
| `core_fin_fact_actual` | ✅ NOT NULL | ✅ NOT NULL | Actual transactions | **CRITICAL** |
| `core_fin_pe_applicability` | ✅ PK | N/A | Category-level applicability rules | HIGH |
| `v_budget_facts_with_containers` | ✅ | ✅ | Helper view | LOW |
| `vw_budget_grid_items` | ✅ | ✅ | Budget grid display | MEDIUM |
| `vw_budget_variance` | ✅ | ✅ | Budget vs actuals | MEDIUM |

### Current Data State

```sql
-- Budget facts by pe_level (Project 7 + 11)
 pe_level | count | null_container_count | has_container_count
----------+-------+----------------------+---------------------
 project  |    67 |                   67 |                   0  ✅ CORRECT
 area     |     1 |                    0 |                   1  ✅ MIGRATED
 phase    |     2 |                    0 |                   2  ✅ MIGRATED
 parcel   |     2 |                    0 |                   2  ✅ MIGRATED
```

**Analysis**:
- **Project-level items (67)**: Correctly have NULL `container_id` - project level sits above containers
- **Container-level items (5)**: Already migrated to containers for Project 11 (multifamily test)
- **Migration Coverage**: 7% of non-project items migrated (5 of 5 eligible items)

### Enum Values

```sql
postgres=# SELECT enum_value FROM pg_enum WHERE enumtypid = 'pe_level'::regtype;
 enum_value
------------
 project    -- No container (NULL container_id)
 area       -- Maps to container_level = 1
 phase      -- Maps to container_level = 2
 parcel     -- Maps to container_level = 3
 lot        -- Maps to container_level = 3 (same as parcel)
```

### Database Constraints

**Primary Keys**:
- `core_fin_pe_applicability`: `(category_id, pe_level)` - **BLOCKS REMOVAL**

**Indexes** (will need to be dropped/recreated):
```sql
idx_fact_budget_pe          ON core_fin_fact_budget (pe_level, pe_id, category_id)
idx_fact_budget_budget_pe   ON core_fin_fact_budget (budget_id, pe_level, pe_id)
idx_fact_actual_pe          ON core_fin_fact_actual (pe_level, pe_id, txn_date)
```

**NOT NULL Constraints**:
- `core_fin_fact_budget.pe_level` - NOT NULL
- `core_fin_fact_budget.pe_id` - NOT NULL
- `core_fin_fact_actual.pe_level` - NOT NULL
- `core_fin_fact_actual.pe_id` - NOT NULL

### TypeScript/API Usage

**Files Referencing pe_level**: 50 TypeScript files

**Critical API Routes**:
1. **POST /api/budget/items** - Creates new budget items using `pe_level`/`pe_id`
2. **GET /api/budget/containers** - Supports legacy `pe_level` parameter for backward compatibility
3. **GET /api/budget/rollup** - Queries by container but still returns `pe_level` in results
4. **GET /api/budget/items/[projectId]** - Fetches budget items (view includes `pe_level`)

**Component Usage**:
- `BudgetContainerView.tsx` - Displays `pe_level` in UI
- `BudgetContent.tsx` - Budget grid uses `vw_budget_grid_items` (contains `pe_level`)
- Various land use components - Use `pe_id` for filtering

---

## Why We Can't Remove It Today

### Blocker 1: Active Budget Creation
**Location**: `/api/budget/items/route.ts:32-51`

```typescript
export async function POST(request: Request) {
  const { budgetId, peLevel, peId, categoryId, ... } = body;

  // Validate required fields
  if (!budgetId || !peLevel || !peId || !categoryId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await sql`
    INSERT INTO landscape.core_fin_fact_budget (
      budget_id, pe_level, pe_id, category_id, ...
    ) VALUES (
      ${budgetId}, ${peLevel}, ${peId}, ${categoryId}, ...
    )
  `
}
```

**Impact**: Every new budget item creation requires `pe_level` and `pe_id`. Removing these columns breaks budget creation.

### Blocker 2: Database Constraints

**NOT NULL Constraints**: Cannot drop columns while NOT NULL constraints exist
```sql
ERROR: cannot drop column "pe_level" because other objects depend on it
DETAIL: constraint core_fin_pe_applicability_pkey depends on column "pe_level"
```

**Primary Key Dependency**: `core_fin_pe_applicability` uses `pe_level` as part of its primary key

### Blocker 3: Query Performance

**Current indexes optimized for pe_level**:
```sql
idx_fact_budget_pe ON core_fin_fact_budget (pe_level, pe_id, category_id)
```

Dropping these indexes before creating container-based indexes would cause severe query degradation.

### Blocker 4: View Dependencies

**3 views** reference `pe_level` directly:
- `v_budget_facts_with_containers` - Used by container APIs
- `vw_budget_grid_items` - Used by budget grid UI
- `vw_budget_variance` - Used by budget analysis

Dropping `pe_level` breaks these views, which breaks downstream queries.

### Blocker 5: Backward Compatibility

**Legacy API Support**: `/api/budget/containers` accepts `pe_level` parameter for backward compatibility with older projects that haven't migrated to containers yet.

---

## Migration Strategy: 4-Phase Approach

### Phase 1: Parallel Population (SAFE - Can Start Now)
**Duration**: 2-4 weeks
**Risk**: ⚠️ LOW - Additive only, no breaking changes

**Goal**: Ensure all new and existing budget items have **both** `pe_level`/`pe_id` AND `container_id` populated

**Steps**:

#### 1.1 Update Budget Creation API
**File**: `src/app/api/budget/items/route.ts`

```typescript
export async function POST(request: Request) {
  const { budgetId, peLevel, peId, categoryId, containerId, ... } = body;

  // CHANGE: Make containerId required (except for project level)
  if (!budgetId || !categoryId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (peLevel !== 'project' && !containerId) {
    return NextResponse.json({
      error: 'container_id required for non-project items'
    }, { status: 400 });
  }

  // NEW: Auto-populate pe_level and pe_id from container if not provided
  let finalPeLevel = peLevel;
  let finalPeId = peId;

  if (!finalPeLevel && containerId) {
    // Derive pe_level from container_level
    const containerInfo = await sql`
      SELECT container_level,
             attributes->>'area_id' as area_id,
             attributes->>'phase_id' as phase_id,
             attributes->>'parcel_id' as parcel_id
      FROM landscape.tbl_container
      WHERE container_id = ${containerId}
    `;

    const levelMap = { 1: 'area', 2: 'phase', 3: 'parcel' };
    finalPeLevel = levelMap[containerInfo[0].container_level];
    finalPeId = containerInfo[0][`${finalPeLevel}_id`];
  }

  await sql`
    INSERT INTO landscape.core_fin_fact_budget (
      budget_id, pe_level, pe_id, container_id, category_id, ...
    ) VALUES (
      ${budgetId}, ${finalPeLevel}, ${finalPeId}, ${containerId}, ...
    )
  `;
}
```

**Impact**: ✅ New items get both old and new columns populated

#### 1.2 Backfill Existing Data
**File**: `scripts/backfill-pe-level-from-containers.sql`

```sql
-- For items that have container_id but missing pe_level (shouldn't exist, but safety check)
UPDATE landscape.core_fin_fact_budget b
SET
  pe_level = CASE
    WHEN c.container_level = 1 THEN 'area'::pe_level
    WHEN c.container_level = 2 THEN 'phase'::pe_level
    WHEN c.container_level = 3 THEN 'parcel'::pe_level
  END,
  pe_id = CASE
    WHEN c.container_level = 1 THEN c.attributes->>'area_id'
    WHEN c.container_level = 2 THEN c.attributes->>'phase_id'
    WHEN c.container_level = 3 THEN c.attributes->>'parcel_id'
  END
FROM landscape.tbl_container c
WHERE b.container_id = c.container_id
  AND (b.pe_level IS NULL OR b.pe_id IS NULL);
```

**Impact**: ✅ Ensures data integrity during transition

#### 1.3 Add Database Trigger (Safety Net)
**File**: `scripts/create-pe-level-sync-trigger.sql`

```sql
-- Ensure pe_level stays in sync with container_id during transition
CREATE OR REPLACE FUNCTION sync_pe_level_from_container()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.container_id IS NOT NULL AND NEW.pe_level IS NULL THEN
    SELECT
      CASE
        WHEN container_level = 1 THEN 'area'::pe_level
        WHEN container_level = 2 THEN 'phase'::pe_level
        WHEN container_level = 3 THEN 'parcel'::pe_level
      END,
      CASE
        WHEN container_level = 1 THEN attributes->>'area_id'
        WHEN container_level = 2 THEN attributes->>'phase_id'
        WHEN container_level = 3 THEN attributes->>'parcel_id'
      END
    INTO NEW.pe_level, NEW.pe_id
    FROM landscape.tbl_container
    WHERE container_id = NEW.container_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_pe_level
  BEFORE INSERT OR UPDATE ON landscape.core_fin_fact_budget
  FOR EACH ROW
  EXECUTE FUNCTION sync_pe_level_from_container();
```

**Impact**: ✅ Automatic sync prevents data inconsistency

**Validation Queries**:
```sql
-- Verify all non-project items have container_id
SELECT pe_level, COUNT(*) as missing_container
FROM landscape.core_fin_fact_budget
WHERE pe_level != 'project' AND container_id IS NULL
GROUP BY pe_level;
-- Expected: 0 rows

-- Verify all container items have pe_level
SELECT container_level, COUNT(*) as missing_pe_level
FROM landscape.core_fin_fact_budget b
JOIN landscape.tbl_container c ON b.container_id = c.container_id
WHERE b.pe_level IS NULL
GROUP BY container_level;
-- Expected: 0 rows
```

---

### Phase 2: Migrate Queries (MEDIUM RISK - Requires Testing)
**Duration**: 2-3 weeks
**Risk**: ⚠️ MEDIUM - Changes query behavior, requires thorough testing

**Goal**: Update all queries to use `container_id` instead of `pe_level`/`pe_id`

**Steps**:

#### 2.1 Update Budget APIs

**Before** (`/api/budget/items/[projectId]/route.ts`):
```typescript
const items = await sql`
  SELECT * FROM landscape.vw_budget_grid_items
  WHERE (pe_level = 'project' AND pe_id = ${projectId})
     OR (pe_level = 'area' AND pe_id IN (
       SELECT area_id FROM landscape.tbl_area WHERE project_id = ${projectId}
     ))
  ORDER BY pe_level, pe_id, category_id
`;
```

**After**:
```typescript
const items = await sql`
  SELECT * FROM landscape.vw_budget_grid_items
  WHERE (container_id IS NULL AND pe_id = ${projectId})  -- Project level
     OR (container_id IN (
       SELECT container_id FROM landscape.tbl_container WHERE project_id = ${projectId}
     ))
  ORDER BY container_level, container_id, category_id
`;
```

#### 2.2 Recreate Views

**Drop and recreate with container_id as primary**:
```sql
-- v_budget_facts_with_containers - Already uses container_id (✅ no change needed)

-- vw_budget_grid_items - Update to prioritize container_id
CREATE OR REPLACE VIEW landscape.vw_budget_grid_items AS
SELECT
  b.fact_id,
  b.budget_id,
  b.container_id,
  c.container_level,
  c.display_name as container_name,
  c.project_id,
  -- Legacy columns for backward compatibility (will remove in Phase 4)
  b.pe_level,
  b.pe_id,
  -- ... rest of columns
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id;
```

#### 2.3 Update TypeScript Types

**File**: `src/types/budget.ts` (create if doesn't exist)

```typescript
// NEW: Container-based budget item
export interface BudgetItem {
  fact_id: number;
  budget_id: number;
  container_id: number | null; // NULL for project-level
  category_id: number;
  amount: number;
  // ... other fields

  // DEPRECATED: Will be removed in v2.0
  /** @deprecated Use container_id instead */
  pe_level?: string;
  /** @deprecated Use container_id instead */
  pe_id?: string;
}
```

#### 2.4 Update UI Components

**Before** (`BudgetContainerView.tsx`):
```tsx
const levelLabel = item.pe_level === 'project' ? 'Project'
  : item.pe_level === 'area' ? 'Plan Area'
  : item.pe_level === 'phase' ? 'Phase'
  : 'Parcel';
```

**After**:
```tsx
const levelLabel = item.container_id === null ? 'Project'
  : item.container_level === 1 ? labels.level1Label
  : item.container_level === 2 ? labels.level2Label
  : labels.level3Label;
```

**Validation**:
```bash
# Run all budget tests
npm run test:budget

# Manual testing checklist:
# [ ] Create new budget item at project level
# [ ] Create new budget item at area level
# [ ] Create new budget item at phase level
# [ ] Create new budget item at parcel level
# [ ] View budget rollup by level
# [ ] Filter budget by container
# [ ] Budget variance report displays correctly
```

---

### Phase 3: Drop Constraints and Indexes (HIGH RISK - Requires Downtime)
**Duration**: 1 day (during maintenance window)
**Risk**: 🔴 HIGH - Drops indexes, brief performance impact

**Goal**: Remove database constraints that block column removal

**Steps**:

#### 3.1 Create New Container-Based Indexes

```sql
-- BEFORE dropping old indexes, create new ones
CREATE INDEX idx_fact_budget_container
  ON landscape.core_fin_fact_budget (container_id, category_id);

CREATE INDEX idx_fact_budget_budget_container
  ON landscape.core_fin_fact_budget (budget_id, container_id);

CREATE INDEX idx_fact_actual_container
  ON landscape.core_fin_fact_actual (container_id, txn_date);

-- Add index for project-level queries (where container_id IS NULL)
CREATE INDEX idx_fact_budget_project_level
  ON landscape.core_fin_fact_budget (budget_id, category_id)
  WHERE container_id IS NULL;
```

**Performance Test**:
```sql
-- Test query performance with new indexes
EXPLAIN ANALYZE
SELECT * FROM landscape.core_fin_fact_budget
WHERE container_id = 123 AND category_id = 5;

-- Should use idx_fact_budget_container (Index Scan)
```

#### 3.2 Drop Old Indexes

```sql
-- Only after verifying new indexes work
DROP INDEX landscape.idx_fact_budget_pe;
DROP INDEX landscape.idx_fact_budget_budget_pe;
DROP INDEX landscape.idx_fact_actual_pe;
```

#### 3.3 Refactor core_fin_pe_applicability

**Current Schema**:
```sql
CREATE TABLE landscape.core_fin_pe_applicability (
  category_id BIGINT NOT NULL,
  pe_level pe_level NOT NULL,  -- BLOCKING REMOVAL
  PRIMARY KEY (category_id, pe_level)
);
```

**Problem**: `pe_level` is part of the primary key

**Solution**: Replace with `container_level` (integer)

```sql
-- Create new table with container_level
CREATE TABLE landscape.core_fin_container_applicability (
  category_id BIGINT NOT NULL REFERENCES landscape.core_fin_category(category_id),
  container_level INT NOT NULL CHECK (container_level IN (0, 1, 2, 3)),
  -- 0 = project, 1 = area/property, 2 = phase/building, 3 = parcel/unit
  PRIMARY KEY (category_id, container_level)
);

-- Migrate data
INSERT INTO landscape.core_fin_container_applicability (category_id, container_level)
SELECT
  category_id,
  CASE pe_level
    WHEN 'project' THEN 0
    WHEN 'area' THEN 1
    WHEN 'phase' THEN 2
    WHEN 'parcel' THEN 3
    WHEN 'lot' THEN 3
  END as container_level
FROM landscape.core_fin_pe_applicability;

-- Verify migration
SELECT
  'OLD' as source, pe_level as level, COUNT(*)
FROM landscape.core_fin_pe_applicability
GROUP BY pe_level
UNION ALL
SELECT
  'NEW' as source, container_level::text as level, COUNT(*)
FROM landscape.core_fin_container_applicability
GROUP BY container_level
ORDER BY source, level;

-- Drop old table (after verification)
DROP TABLE landscape.core_fin_pe_applicability;
```

---

### Phase 4: Drop Columns (FINAL - Requires Testing & Rollback Plan)
**Duration**: 1 day
**Risk**: 🔴 HIGH - Irreversible without backup

**Goal**: Remove `pe_level` and `pe_id` columns entirely

**Steps**:

#### 4.1 Final Validation

```sql
-- Ensure NO code still references pe_level
SELECT
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE definition ILIKE '%pe_level%' OR definition ILIKE '%pe_id%'
  AND schemaname = 'landscape';
-- Expected: 0 rows

-- Verify all budget items have container_id (except project level)
SELECT COUNT(*) as orphaned_items
FROM landscape.core_fin_fact_budget
WHERE pe_level NOT IN ('project')
  AND container_id IS NULL;
-- Expected: 0

-- Verify all APIs use container_id
grep -r "pe_level" src/app/api/ --include="*.ts"
-- Expected: Only comments and deprecated warnings
```

#### 4.2 Drop NOT NULL Constraints

```sql
-- Make columns nullable first (safety step)
ALTER TABLE landscape.core_fin_fact_budget
  ALTER COLUMN pe_level DROP NOT NULL;

ALTER TABLE landscape.core_fin_fact_budget
  ALTER COLUMN pe_id DROP NOT NULL;

ALTER TABLE landscape.core_fin_fact_actual
  ALTER COLUMN pe_level DROP NOT NULL;

ALTER TABLE landscape.core_fin_fact_actual
  ALTER COLUMN pe_id DROP NOT NULL;
```

#### 4.3 Drop Columns

```sql
BEGIN;

-- Drop from budget facts
ALTER TABLE landscape.core_fin_fact_budget
  DROP COLUMN pe_level;

ALTER TABLE landscape.core_fin_fact_budget
  DROP COLUMN pe_id;

-- Drop from actual transactions
ALTER TABLE landscape.core_fin_fact_actual
  DROP COLUMN pe_level;

ALTER TABLE landscape.core_fin_fact_actual
  DROP COLUMN pe_id;

COMMIT;
```

#### 4.4 Drop Enum Type

```sql
-- Drop the enum type (if no other tables use it)
DROP TYPE landscape.pe_level;
```

#### 4.5 Update Views (Remove Legacy Columns)

```sql
-- Remove pe_level and pe_id from views
CREATE OR REPLACE VIEW landscape.v_budget_facts_with_containers AS
SELECT
  b.fact_id,
  b.budget_id,
  b.container_id,  -- PRIMARY IDENTIFIER
  c.container_level,
  c.container_code,
  c.display_name as container_name,
  c.project_id,
  b.category_id,
  b.amount,
  b.confidence_level,
  b.is_committed
  -- REMOVED: b.pe_level, b.pe_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id;
```

---

## Risk Assessment

### What Breaks If We Remove It Today?

| Component | Impact | Severity | Recovery Time |
|-----------|--------|----------|---------------|
| Budget Creation API | ❌ FATAL | CRITICAL | Cannot create budgets until code deployed |
| Budget Grid UI | ❌ FATAL | CRITICAL | Grid displays empty/errors |
| Budget Rollup | ⚠️ PARTIAL | HIGH | Aggregations fail for some projects |
| Budget Variance | ⚠️ PARTIAL | HIGH | Reports show incorrect data |
| Legacy Project Support | ❌ FATAL | HIGH | Old projects cannot access budgets |
| Database Constraints | ❌ FATAL | CRITICAL | Migration fails with constraint violations |

### Safe Migration Path

**✅ SAFE** (Phase 1): Populate both columns in parallel
- Risk: LOW
- Impact: None - additive only
- Rollback: Easy - just stop using container_id

**⚠️ MEDIUM** (Phase 2): Migrate queries to container_id
- Risk: MEDIUM
- Impact: Query behavior changes
- Rollback: Medium - revert code, data still intact

**🔴 HIGH** (Phase 3): Drop indexes and constraints
- Risk: HIGH
- Impact: Brief performance degradation, constraint violations
- Rollback: Hard - requires restoring indexes and constraints

**🔴 CRITICAL** (Phase 4): Drop columns
- Risk: CRITICAL
- Impact: Data loss if not backed up
- Rollback: VERY HARD - requires database restore

### Rollback Plans

#### Phase 1 Rollback (Easy)
```sql
-- Just stop using container_id - no harm done
-- pe_level/pe_id still work fine
```

#### Phase 2 Rollback (Medium)
```bash
# Revert code changes
git revert <migration-commit>

# Recreate old views
psql -f scripts/recreate-legacy-views.sql

# Deploy
npm run deploy
```

#### Phase 3 Rollback (Hard)
```sql
-- Recreate old indexes
CREATE INDEX idx_fact_budget_pe
  ON landscape.core_fin_fact_budget (pe_level, pe_id, category_id);

-- Restore pe_applicability table from backup
pg_restore --table=core_fin_pe_applicability backup.dump
```

#### Phase 4 Rollback (Very Hard)
```sql
-- Requires database restore from backup
pg_restore --table=core_fin_fact_budget backup.dump

-- OR add columns back (but loses any new data)
ALTER TABLE landscape.core_fin_fact_budget
  ADD COLUMN pe_level pe_level,
  ADD COLUMN pe_id text;

-- Repopulate from container_id
UPDATE landscape.core_fin_fact_budget ...
```

---

## Feature Flag Strategy

**Recommendation**: Use feature flag for Phase 2 (query migration)

### Implementation

**File**: `src/lib/featureFlags.ts`

```typescript
export const FEATURE_FLAGS = {
  USE_CONTAINER_QUERIES: process.env.NEXT_PUBLIC_USE_CONTAINER_QUERIES === 'true',
  // Add to .env:
  // NEXT_PUBLIC_USE_CONTAINER_QUERIES=false  (Phase 1)
  // NEXT_PUBLIC_USE_CONTAINER_QUERIES=true   (Phase 2+)
};
```

**Usage in API**:

```typescript
import { FEATURE_FLAGS } from '@/lib/featureFlags';

export async function GET(request: Request) {
  if (FEATURE_FLAGS.USE_CONTAINER_QUERIES) {
    // NEW: Query by container_id
    return await sql`
      SELECT * FROM landscape.core_fin_fact_budget
      WHERE container_id IN (SELECT container_id FROM ...)
    `;
  } else {
    // OLD: Query by pe_level/pe_id
    return await sql`
      SELECT * FROM landscape.core_fin_fact_budget
      WHERE pe_level = 'area' AND pe_id IN (...)
    `;
  }
}
```

**Benefits**:
- ✅ Instant rollback by flipping env variable
- ✅ No code deployment needed for rollback
- ✅ Can test in production with small % of traffic
- ✅ Gradual rollout (enable for one project at a time)

---

## Testing Strategy

### Phase 1 Testing (Parallel Population)

**Unit Tests**:
```typescript
// tests/budget-migration.test.ts
describe('Budget Creation with Container', () => {
  it('should populate both pe_level and container_id', async () => {
    const response = await POST('/api/budget/items', {
      budgetId: 1,
      containerId: 123,
      categoryId: 5,
      amount: 1000
    });

    expect(response.data.pe_level).toBe('area');
    expect(response.data.pe_id).toBe('42');
    expect(response.data.container_id).toBe(123);
  });

  it('should handle project-level items with NULL container', async () => {
    const response = await POST('/api/budget/items', {
      budgetId: 1,
      peLevel: 'project',
      peId: '7',
      categoryId: 5,
      amount: 1000
    });

    expect(response.data.container_id).toBeNull();
    expect(response.data.pe_level).toBe('project');
  });
});
```

**Integration Tests**:
```sql
-- tests/budget-migration-integration.sql

-- Test 1: Create budget item with container_id
INSERT INTO landscape.core_fin_fact_budget (
  budget_id, container_id, category_id, amount
) VALUES (1, 123, 5, 1000)
RETURNING *;
-- Expected: pe_level and pe_id auto-populated by trigger

-- Test 2: Verify trigger populates correctly
SELECT
  container_id,
  pe_level,
  pe_id,
  (SELECT container_level FROM landscape.tbl_container WHERE container_id = 123) as expected_level
FROM landscape.core_fin_fact_budget
WHERE fact_id = LAST_INSERT_ID();
-- Expected: pe_level matches container_level mapping
```

### Phase 2 Testing (Query Migration)

**Load Tests**:
```bash
# Before migration
ab -n 1000 -c 10 https://app.landscape.com/api/budget/items/7

# After migration (with new queries)
ab -n 1000 -c 10 https://app.landscape.com/api/budget/items/7

# Compare:
# - Response times should be similar or better
# - Error rate should be 0%
# - Results should match exactly
```

**Regression Tests**:
```typescript
describe('Budget Query Migration', () => {
  it('should return identical results with container queries', async () => {
    // Fetch using old pe_level query
    const oldResults = await fetchBudgetByPeLevel('area', '42');

    // Fetch using new container query
    const newResults = await fetchBudgetByContainer(123);

    expect(newResults).toEqual(oldResults);
  });
});
```

### Phase 3 Testing (Index Performance)

**Before vs After**:
```sql
-- Before dropping old indexes
EXPLAIN ANALYZE
SELECT * FROM landscape.core_fin_fact_budget
WHERE pe_level = 'area' AND pe_id = '42';
-- Capture: Planning time, Execution time, Index used

-- After creating new indexes and dropping old
EXPLAIN ANALYZE
SELECT * FROM landscape.core_fin_fact_budget
WHERE container_id = 123;
-- Compare: Should be similar or faster
```

### Phase 4 Testing (Final Validation)

**Smoke Tests**:
```bash
# All critical user flows
npm run test:e2e:budget-creation
npm run test:e2e:budget-grid
npm run test:e2e:budget-rollup
npm run test:e2e:budget-variance

# Expected: All pass
```

---

## Timeline

### Conservative Timeline (Recommended)

| Phase | Duration | Start | End | Milestone |
|-------|----------|-------|-----|-----------|
| **Phase 1** | 3 weeks | Week 1 | Week 3 | All new items have container_id |
| Testing | 1 week | Week 4 | Week 4 | Validate dual-column approach |
| **Phase 2** | 3 weeks | Week 5 | Week 7 | All queries use container_id |
| Testing | 1 week | Week 8 | Week 8 | Performance validated |
| **Phase 3** | 1 week | Week 9 | Week 9 | Constraints dropped |
| Testing | 1 week | Week 10 | Week 10 | Index performance validated |
| **Phase 4** | 1 day | Week 11 | Week 11 | Columns dropped |
| **Total** | **~11 weeks** | | | **Complete** |

### Aggressive Timeline (Higher Risk)

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| **Phase 1** | 1 week | Week 1 | Week 1 |
| **Phase 2** | 1 week | Week 2 | Week 2 |
| **Phase 3** | 1 day | Week 3 | Week 3 |
| **Phase 4** | 1 day | Week 3 | Week 3 |
| **Total** | **~3 weeks** | | |

**Risk**: ⚠️ Higher chance of production issues, less time for testing

---

## SQL Migration Scripts

### Phase 1 Script

**File**: `migrations/001_phase1_parallel_population.sql`

```sql
-- =====================================================
-- PHASE 1: Parallel Population
-- =====================================================

BEGIN;

-- Step 1: Create trigger to auto-populate pe_level from container_id
CREATE OR REPLACE FUNCTION sync_pe_level_from_container()
RETURNS TRIGGER AS $$
BEGIN
  -- If container_id provided but pe_level missing, derive it
  IF NEW.container_id IS NOT NULL AND NEW.pe_level IS NULL THEN
    SELECT
      CASE container_level
        WHEN 1 THEN 'area'::pe_level
        WHEN 2 THEN 'phase'::pe_level
        WHEN 3 THEN 'parcel'::pe_level
      END,
      CASE container_level
        WHEN 1 THEN attributes->>'area_id'
        WHEN 2 THEN attributes->>'phase_id'
        WHEN 3 THEN attributes->>'parcel_id'
      END
    INTO NEW.pe_level, NEW.pe_id
    FROM landscape.tbl_container
    WHERE container_id = NEW.container_id;
  END IF;

  -- If pe_level provided but container_id missing, derive it
  IF NEW.pe_level IS NOT NULL
     AND NEW.pe_level != 'project'
     AND NEW.container_id IS NULL THEN
    SELECT container_id
    INTO NEW.container_id
    FROM landscape.tbl_container
    WHERE (
      (NEW.pe_level = 'area' AND container_level = 1 AND attributes->>'area_id' = NEW.pe_id) OR
      (NEW.pe_level = 'phase' AND container_level = 2 AND attributes->>'phase_id' = NEW.pe_id) OR
      (NEW.pe_level = 'parcel' AND container_level = 3 AND attributes->>'parcel_id' = NEW.pe_id) OR
      (NEW.pe_level = 'lot' AND container_level = 3 AND attributes->>'parcel_id' = NEW.pe_id)
    )
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_pe_level_budget
  BEFORE INSERT OR UPDATE ON landscape.core_fin_fact_budget
  FOR EACH ROW
  EXECUTE FUNCTION sync_pe_level_from_container();

CREATE TRIGGER trigger_sync_pe_level_actual
  BEFORE INSERT OR UPDATE ON landscape.core_fin_fact_actual
  FOR EACH ROW
  EXECUTE FUNCTION sync_pe_level_from_container();

-- Step 2: Backfill existing data (if any items have only container_id)
UPDATE landscape.core_fin_fact_budget b
SET
  pe_level = CASE c.container_level
    WHEN 1 THEN 'area'::pe_level
    WHEN 2 THEN 'phase'::pe_level
    WHEN 3 THEN 'parcel'::pe_level
  END,
  pe_id = CASE c.container_level
    WHEN 1 THEN c.attributes->>'area_id'
    WHEN 2 THEN c.attributes->>'phase_id'
    WHEN 3 THEN c.attributes->>'parcel_id'
  END
FROM landscape.tbl_container c
WHERE b.container_id = c.container_id
  AND (b.pe_level IS NULL OR b.pe_id IS NULL);

COMMIT;

-- Validation
SELECT 'Phase 1 Complete - Validation' as status;

-- Check trigger works
SELECT
  'Validation: Trigger Created' as test,
  COUNT(*) as trigger_count
FROM pg_trigger
WHERE tgname IN ('trigger_sync_pe_level_budget', 'trigger_sync_pe_level_actual');

-- Check data integrity
SELECT
  'Validation: Data Integrity' as test,
  pe_level,
  COUNT(*) as total,
  COUNT(container_id) as has_container,
  COUNT(*) - COUNT(container_id) as missing_container
FROM landscape.core_fin_fact_budget
GROUP BY pe_level;
```

### Phase 2 Script

**File**: `migrations/002_phase2_migrate_queries.sql`

```sql
-- =====================================================
-- PHASE 2: Migrate Queries - Update Views
-- =====================================================

BEGIN;

-- Update vw_budget_grid_items to prioritize container_id
CREATE OR REPLACE VIEW landscape.vw_budget_grid_items AS
WITH RECURSIVE category_path AS (
  SELECT
    category_id,
    parent_id,
    code,
    detail,
    ARRAY[detail] AS path_array,
    1 AS depth
  FROM landscape.core_fin_category
  WHERE parent_id IS NULL

  UNION ALL

  SELECT
    c.category_id,
    c.parent_id,
    c.code,
    c.detail,
    cp.path_array || c.detail,
    cp.depth + 1
  FROM landscape.core_fin_category c
  INNER JOIN category_path cp ON c.parent_id = cp.category_id
)
SELECT
  b.fact_id,
  b.budget_id,
  b.container_id,
  c.container_level,
  c.container_code,
  c.display_name as container_name,
  c.project_id,
  b.category_id,
  cat.code as category_code,
  cat.detail as category_name,
  cat_path.path_array as category_path,
  b.uom_code,
  b.qty,
  b.rate,
  b.amount,
  b.confidence_level,
  b.is_committed,
  b.notes,
  b.created_at,
  -- DEPRECATED: Legacy columns (will be removed in Phase 4)
  b.pe_level,
  b.pe_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
LEFT JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
LEFT JOIN category_path cat_path ON cat.category_id = cat_path.category_id;

COMMENT ON VIEW landscape.vw_budget_grid_items IS
'Budget grid items view - Uses container_id as primary identifier. pe_level/pe_id are deprecated and will be removed.';

COMMIT;

-- Validation
SELECT 'Phase 2 Complete - Validation' as status;

-- Verify view works
SELECT
  container_level,
  COUNT(*) as item_count,
  SUM(amount) as total_amount
FROM landscape.vw_budget_grid_items
GROUP BY container_level
ORDER BY container_level;
```

### Phase 3 Script

**File**: `migrations/003_phase3_drop_constraints.sql`

```sql
-- =====================================================
-- PHASE 3: Drop Constraints and Indexes
-- =====================================================

BEGIN;

-- Step 1: Create new container-based indexes FIRST
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_budget_container
  ON landscape.core_fin_fact_budget (container_id, category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_budget_budget_container
  ON landscape.core_fin_fact_budget (budget_id, container_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_budget_project_level
  ON landscape.core_fin_fact_budget (budget_id, category_id)
  WHERE container_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_actual_container
  ON landscape.core_fin_fact_actual (container_id, txn_date);

-- Step 2: Verify new indexes work
EXPLAIN ANALYZE
SELECT * FROM landscape.core_fin_fact_budget
WHERE container_id = (SELECT MIN(container_id) FROM landscape.tbl_container)
  AND category_id = 1;
-- Should show: Index Scan using idx_fact_budget_container

-- Step 3: Drop old pe_level indexes
DROP INDEX CONCURRENTLY IF EXISTS landscape.idx_fact_budget_pe;
DROP INDEX CONCURRENTLY IF EXISTS landscape.idx_fact_budget_budget_pe;
DROP INDEX CONCURRENTLY IF EXISTS landscape.idx_fact_actual_pe;

-- Step 4: Migrate core_fin_pe_applicability table
CREATE TABLE IF NOT EXISTS landscape.core_fin_container_applicability (
  category_id BIGINT NOT NULL REFERENCES landscape.core_fin_category(category_id) ON DELETE CASCADE,
  container_level INT NOT NULL CHECK (container_level IN (0, 1, 2, 3)),
  PRIMARY KEY (category_id, container_level)
);

-- Migrate data
INSERT INTO landscape.core_fin_container_applicability (category_id, container_level)
SELECT
  category_id,
  CASE pe_level
    WHEN 'project' THEN 0
    WHEN 'area' THEN 1
    WHEN 'phase' THEN 2
    WHEN 'parcel' THEN 3
    WHEN 'lot' THEN 3
  END as container_level
FROM landscape.core_fin_pe_applicability
ON CONFLICT (category_id, container_level) DO NOTHING;

-- Verify migration
WITH old_counts AS (
  SELECT pe_level::text as level, COUNT(*) as count
  FROM landscape.core_fin_pe_applicability
  GROUP BY pe_level
),
new_counts AS (
  SELECT container_level::text as level, COUNT(*) as count
  FROM landscape.core_fin_container_applicability
  GROUP BY container_level
)
SELECT
  COALESCE(o.level, n.level) as level,
  o.count as old_count,
  n.count as new_count,
  CASE WHEN o.count = n.count THEN '✓ MATCH' ELSE '✗ MISMATCH' END as status
FROM old_counts o
FULL OUTER JOIN new_counts n ON o.level = n.level
ORDER BY level;

-- Only drop old table if validation passes
-- UNCOMMENT AFTER VERIFICATION:
-- DROP TABLE landscape.core_fin_pe_applicability;

COMMIT;

-- Validation
SELECT 'Phase 3 Complete - Validation' as status;

-- Verify new indexes exist
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'landscape'
  AND tablename IN ('core_fin_fact_budget', 'core_fin_fact_actual')
  AND indexname LIKE '%container%';
```

### Phase 4 Script

**File**: `migrations/004_phase4_drop_columns.sql`

```sql
-- =====================================================
-- PHASE 4: Drop pe_level and pe_id Columns
-- =====================================================
-- WARNING: THIS IS IRREVERSIBLE WITHOUT BACKUP
-- ENSURE FULL DATABASE BACKUP BEFORE RUNNING
-- =====================================================

BEGIN;

-- Step 1: Final validation check
DO $$
DECLARE
  orphaned_count INT;
  view_count INT;
BEGIN
  -- Check for orphaned items (should be 0)
  SELECT COUNT(*) INTO orphaned_count
  FROM landscape.core_fin_fact_budget
  WHERE pe_level NOT IN ('project')
    AND container_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop columns: % orphaned items found', orphaned_count;
  END IF;

  -- Check for views still using pe_level (should be 0)
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE schemaname = 'landscape'
    AND (definition LIKE '%pe_level%' OR definition LIKE '%pe_id%');

  IF view_count > 0 THEN
    RAISE WARNING 'Warning: % views still reference pe_level/pe_id', view_count;
  END IF;
END $$;

-- Step 2: Drop triggers first
DROP TRIGGER IF EXISTS trigger_sync_pe_level_budget ON landscape.core_fin_fact_budget;
DROP TRIGGER IF EXISTS trigger_sync_pe_level_actual ON landscape.core_fin_fact_actual;
DROP FUNCTION IF EXISTS sync_pe_level_from_container();

-- Step 3: Remove NOT NULL constraints
ALTER TABLE landscape.core_fin_fact_budget
  ALTER COLUMN pe_level DROP NOT NULL;

ALTER TABLE landscape.core_fin_fact_budget
  ALTER COLUMN pe_id DROP NOT NULL;

ALTER TABLE landscape.core_fin_fact_actual
  ALTER COLUMN pe_level DROP NOT NULL;

ALTER TABLE landscape.core_fin_fact_actual
  ALTER COLUMN pe_id DROP NOT NULL;

-- Step 4: Drop columns
ALTER TABLE landscape.core_fin_fact_budget
  DROP COLUMN IF EXISTS pe_level CASCADE,
  DROP COLUMN IF EXISTS pe_id CASCADE;

ALTER TABLE landscape.core_fin_fact_actual
  DROP COLUMN IF EXISTS pe_level CASCADE,
  DROP COLUMN IF EXISTS pe_id CASCADE;

-- Step 5: Drop enum type
DROP TYPE IF EXISTS landscape.pe_level CASCADE;

-- Step 6: Update views to remove legacy columns
CREATE OR REPLACE VIEW landscape.v_budget_facts_with_containers AS
SELECT
  b.fact_id,
  b.budget_id,
  b.container_id,
  c.container_level,
  c.container_code,
  c.display_name as container_name,
  c.project_id,
  b.category_id,
  b.amount,
  b.confidence_level,
  b.is_committed,
  -- Legacy ID mapping
  (c.attributes->>'area_id')::int as legacy_area_id,
  (c.attributes->>'phase_id')::int as legacy_phase_id,
  (c.attributes->>'parcel_id')::int as legacy_parcel_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id;

COMMIT;

-- Final validation
SELECT 'Phase 4 Complete - Migration Done!' as status;

-- Verify columns dropped
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'landscape'
  AND table_name = 'core_fin_fact_budget'
  AND column_name IN ('pe_level', 'pe_id');
-- Expected: 0 rows

-- Verify enum dropped
SELECT typname
FROM pg_type
WHERE typname = 'pe_level';
-- Expected: 0 rows
```

---

## Recommendation

### ✅ APPROVE Phase 1 - Start Immediately
**Reason**: Low risk, additive only, sets foundation for future phases

**Action Items**:
1. Review and approve Phase 1 SQL script
2. Deploy trigger creation script to production
3. Update budget creation API to require `container_id`
4. Monitor for 2-3 weeks

### ⏸️ HOLD Phase 2-4 - Wait for Phase 1 Completion
**Reason**: Cannot proceed until all data dual-populated

**Prerequisites**:
- All new budget items created with container_id
- All legacy projects migrated to containers (or accepted as legacy-only)
- Feature flag system implemented

---

## Success Criteria

### Phase 1 Complete When:
- [  ] 100% of new budget items have both `pe_level` and `container_id`
- [  ] Trigger successfully auto-populates missing columns
- [  ] No orphaned items (pe_level != 'project' AND container_id IS NULL)
- [  ] All tests passing

### Phase 2 Complete When:
- [  ] All API routes use `container_id` as primary identifier
- [  ] All views updated to prioritize `container_id`
- [  ] Feature flag allows instant rollback
- [  ] Performance tests show no regression

### Phase 3 Complete When:
- [  ] New container-based indexes created and performing well
- [  ] Old pe_level indexes dropped
- [  ] `core_fin_pe_applicability` migrated to `core_fin_container_applicability`
- [  ] No query performance degradation

### Phase 4 Complete When:
- [  ] `pe_level` and `pe_id` columns dropped from all tables
- [  ] `pe_level` enum type dropped
- [  ] All views updated with no legacy column references
- [  ] Full regression test suite passing

---

## Appendix: Current State Snapshot

### Database Statistics (as of 2025-10-15)

```sql
-- Budget facts by pe_level
 pe_level | count | null_container | has_container
----------+-------+----------------+--------------
 project  |    67 |             67 |            0
 area     |     1 |              0 |            1
 phase    |     2 |              0 |            2
 parcel   |     2 |              0 |            2

-- Total budget items: 72
-- Container-populated: 5 (7%)
-- Legacy (pe_level only): 67 (93%)
```

### Code References

**TypeScript Files**: 50 files reference `pe_level` or `pe_id`
**SQL Scripts**: 4 migration scripts already created
**API Routes**: 3 critical routes depend on `pe_level`

### Key Stakeholders

**Engineering**: Migration execution, testing, deployment
**Product**: User acceptance testing, rollback decisions
**DevOps**: Database backups, monitoring, rollback procedures

---

## Questions for Review

1. **Timeline**: Is 11-week conservative timeline acceptable? Or prefer aggressive 3-week timeline with higher risk?

2. **Feature Flag**: Should we implement feature flag system for Phase 2, or proceed with direct deployment?

3. **Rollback Plan**: What is acceptable downtime window for rollback if Phase 4 fails?

4. **Testing**: Do we have capacity for full regression testing between phases?

5. **Legacy Projects**: Do we require backward compatibility for projects that haven't migrated to containers? Or can we force migration?

---

**Status**: 📋 AWAITING APPROVAL - Do not execute until reviewed

**Next Steps**:
1. Review this document
2. Approve Phase 1 script
3. Schedule Phase 1 deployment
4. Begin monitoring dual-column population

---

**Document Version**: 1.0
**Last Updated**: 2025-10-15
**Author**: Claude Code Assistant
**Reviewers**: [To be filled]

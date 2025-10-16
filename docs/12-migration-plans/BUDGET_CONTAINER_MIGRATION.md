# Budget → Container Migration

## Overview

This migration populates `container_id` in financial tables (`core_fin_fact_budget`) based on existing `pe_level` and `pe_id` columns, linking budget items to the Universal Container System.

## Problem Statement

**Current State:**
- All 66 budget items in `core_fin_fact_budget` have `container_id = NULL`
- Budget system uses `pe_level` enum (`project`, `area`, `phase`, `parcel`, `lot`) + `pe_id`
- Frontend Planning Wizard now uses containers
- **Gap**: Budget data not linked to containers

**Goal:**
- Populate `container_id` for all budget facts
- Enable container-based budget queries
- Prepare for `pe_level`/`pe_id` deprecation

## Mapping Logic

### pe_level → container_level Mapping

| pe_level | container_level | Mapping Strategy | Example |
|----------|----------------|------------------|---------|
| `project` | N/A | `container_id = NULL` | Project 7 → NULL |
| `area` | 1 | Match via `attributes->>'area_id'` | area_id=4 → container_id=1 |
| `phase` | 2 | Match via `attributes->>'phase_id'` | phase_id=1 → container_id=5 |
| `parcel` | 3 | Match via `attributes->>'parcel_id'` | parcel_id=1 → container_id=13 |
| `lot` | 3 | Match via `attributes->>'parcel_id'` | Lots stored as Level 3 |

### SQL Mapping Examples

```sql
-- AREA level: pe_id='4' → container_id=1
SELECT c.container_id
FROM landscape.tbl_container c
WHERE c.container_level = 1
  AND c.attributes->>'area_id' = '4'
LIMIT 1;
-- Returns: 1 (Plan Area 1)

-- PHASE level: pe_id='1' → container_id=5
SELECT c.container_id
FROM landscape.tbl_container c
WHERE c.container_level = 2
  AND c.attributes->>'phase_id' = '1'
LIMIT 1;
-- Returns: 5 (Phase 1.1)

-- PARCEL level: pe_id='1' → container_id=13
SELECT c.container_id
FROM landscape.tbl_container c
WHERE c.container_level = 3
  AND c.attributes->>'parcel_id' = '1'
LIMIT 1;
-- Returns: 13 (Parcel 1)
```

## Project 7 Current State

**Budget Facts:**
- Total: 66 facts
- All at `pe_level='project'`, `pe_id='7'`
- All `container_id=NULL` (correct for project level)

**Containers:**
- 4 Level 1 containers (Plan Areas)
- 8 Level 2 containers (Phases)
- 42 Level 3 containers (Parcels)

**Expected Migration Result:**
- All 66 facts remain at `container_id=NULL` (project level has no container)
- If there were area/phase/parcel level budgets, they would map to containers

## Migration Scripts

### SQL Script: `migrate-budget-to-containers.sql`

Located: [scripts/migrate-budget-to-containers.sql](scripts/migrate-budget-to-containers.sql)

**Features:**
- Pre-migration analysis
- Dry-run preview with temp table
- Mapping validation
- Commented-out UPDATE statements (safe by default)
- Post-migration validation
- Helper view creation

**Usage:**
```bash
# Run full analysis (safe - no changes)
psql -f scripts/migrate-budget-to-containers.sql

# Execute migration (uncomment STEP 4 first)
# Edit file and remove '--' from UPDATE statements
psql -f scripts/migrate-budget-to-containers.sql
```

### TypeScript Script: `migrate-budget-to-containers.ts`

Located: [scripts/migrate-budget-to-containers.ts](scripts/migrate-budget-to-containers.ts)

**Features:**
- Complete workflow automation
- Dry-run mode (default)
- Progress reporting with console.table()
- Transaction safety (all-or-nothing)
- Validation with error detection
- TypeScript type safety

**Usage:**
```bash
# Dry run (preview only - no changes)
npx ts-node scripts/migrate-budget-to-containers.ts --dry-run

# Or just (dry-run is default)
npx ts-node scripts/migrate-budget-to-containers.ts

# Execute actual migration
npx ts-node scripts/migrate-budget-to-containers.ts --execute

# Specific project only (when feature added)
npx ts-node scripts/migrate-budget-to-containers.ts --execute --project-id=7
```

**Expected Output:**
```
████████████████████████████████████████████████████████████
Budget → Container Migration
Mode: DRY RUN
████████████████████████████████████████████████████████████

============================================================
STEP 1: Current State Analysis
============================================================

Current Budget Facts by pe_level:
┌─────────┬──────────────┬────────────────────┬─────────────────────┬─────────┐
│ (index) │ pe_level     │ total_facts        │ has_container_id    │ pe_ids  │
├─────────┼──────────────┼────────────────────┼─────────────────────┼─────────┤
│ 0       │ 'project'    │ 66                 │ 0                   │ ['7']   │
└─────────┴──────────────┴────────────────────┴─────────────────────┴─────────┘

============================================================
STEP 2: Validate Container Mapping
============================================================

Mapping Validation:
┌─────────┬──────────────┬───────────────┬──────────┬──────────────┐
│ (index) │ pe_level     │ total_items   │ will_map │ will_be_null │
├─────────┼──────────────┼───────────────┼──────────┼──────────────┤
│ 0       │ 'project'    │ 66            │ 0        │ 66           │
└─────────┴──────────────┴───────────────┴──────────┴──────────────┘

============================================================
STEP 3: Migration Preview
============================================================

Migration Summary:
┌─────────┬──────────────┬───────────────┬──────────────────────┐
│ (index) │ pe_level     │ total_facts   │ will_change          │
├─────────┼──────────────┼───────────────┼──────────────────────┤
│ 0       │ 'project'    │ 66            │ 0                    │
└─────────┴──────────────┴───────────────┴──────────────────────┘

No changes detected - all facts already have correct container_id

============================================================
STEP 4: Execute Migration
============================================================

⚠️  DRY RUN MODE - No changes will be made
   Use --execute flag to perform actual migration

============================================================
STEP 5: Post-Migration Validation
============================================================

✅ Validation passed: No orphaned facts
```

## Migration Workflow

### Step 1: Pre-Migration Analysis

Run the TypeScript script in dry-run mode:
```bash
npx ts-node scripts/migrate-budget-to-containers.ts
```

**Checks:**
- Current `container_id` population rate
- Distribution of `pe_level` values
- Number of facts per `pe_level`

### Step 2: Mapping Validation

Script validates that containers exist for all non-project `pe_id` values:

```sql
-- Example validation query
SELECT
  b.pe_level,
  b.pe_id,
  c.container_id,
  c.display_name
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON (
  (b.pe_level = 'area' AND c.container_level = 1 AND c.attributes->>'area_id' = b.pe_id) OR
  (b.pe_level = 'phase' AND c.container_level = 2 AND c.attributes->>'phase_id' = b.pe_id) OR
  (b.pe_level = 'parcel' AND c.container_level = 3 AND c.attributes->>'parcel_id' = b.pe_id)
)
WHERE b.pe_level != 'project'
  AND c.container_id IS NULL;
-- Should return 0 rows (no orphans)
```

**Expected Result:** All non-project facts have matching containers

### Step 3: Execute Migration

```bash
npx ts-node scripts/migrate-budget-to-containers.ts --execute
```

**Transaction safety:**
- All UPDATEs wrapped in single transaction
- Rollback on any error
- No partial updates

### Step 4: Validation

Script automatically validates:
- No NULL `container_id` for `pe_level` ≠ 'project'
- All mappings are correct
- No orphaned facts

### Step 5: Create Helper Views

```sql
CREATE OR REPLACE VIEW landscape.v_budget_facts_with_containers AS
SELECT
  b.fact_id,
  b.budget_id,
  b.pe_level,
  b.pe_id,
  b.container_id,
  c.container_level,
  c.container_code,
  c.display_name as container_name,
  c.project_id,
  b.category_id,
  b.amount,
  -- Legacy IDs from container attributes
  (c.attributes->>'area_id')::int as legacy_area_id,
  (c.attributes->>'phase_id')::int as legacy_phase_id,
  (c.attributes->>'parcel_id')::int as legacy_parcel_id
FROM landscape.core_fin_fact_budget b
LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id;
```

**Usage:**
```sql
-- Get all budget facts with container hierarchy
SELECT * FROM landscape.v_budget_facts_with_containers
WHERE project_id = 7;

-- Budget rollup by container
SELECT
  container_code,
  container_name,
  container_level,
  SUM(amount) as total_budget
FROM landscape.v_budget_facts_with_containers
WHERE project_id = 7
GROUP BY container_code, container_name, container_level
ORDER BY container_level, container_code;
```

## Post-Migration Tasks

### Update Budget APIs

**Files to modify:**
- `src/app/api/budget/route.ts` - Main budget endpoint
- `src/app/api/projects/[projectId]/budget/route.ts` - Project budget
- Any other budget-related endpoints

**Changes:**
```typescript
// BEFORE: Filter by pe_level and pe_id
const facts = await sql`
  SELECT * FROM landscape.core_fin_fact_budget
  WHERE pe_level = ${level}
    AND pe_id = ${id}
`

// AFTER: Filter by container_id
const facts = await sql`
  SELECT * FROM landscape.core_fin_fact_budget
  WHERE container_id = ${containerId}
`

// Support hierarchy queries
const facts = await sql`
  SELECT b.*
  FROM landscape.core_fin_fact_budget b
  JOIN landscape.tbl_container c ON b.container_id = c.container_id
  WHERE c.project_id = ${projectId}
    AND c.container_level <= ${maxLevel}
`
```

### Maintain Backward Compatibility

During transition, support both approaches:

```typescript
// Dual-mode API endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const containerId = searchParams.get('container_id')
  const peLevel = searchParams.get('pe_level')
  const peId = searchParams.get('pe_id')

  let facts

  if (containerId) {
    // New container-based query
    facts = await sql`
      SELECT * FROM landscape.core_fin_fact_budget
      WHERE container_id = ${containerId}
    `
  } else if (peLevel && peId) {
    // Legacy pe_level/pe_id query
    facts = await sql`
      SELECT * FROM landscape.core_fin_fact_budget
      WHERE pe_level = ${peLevel}
        AND pe_id = ${peId}
    `
  } else {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  return NextResponse.json({ facts })
}
```

### Deprecation Timeline

1. **Phase 1: Migration** (Current)
   - Populate `container_id`
   - Keep `pe_level`/`pe_id` unchanged
   - Both columns exist

2. **Phase 2: Dual Support** (Next 2-4 weeks)
   - APIs accept both `container_id` and `pe_level/pe_id`
   - Frontend gradually migrates to `container_id`
   - Monitor usage logs

3. **Phase 3: Container-Only** (After validation)
   - Remove `pe_level`/`pe_id` from API parameters
   - Update all frontend calls to use `container_id`
   - Add deprecation warnings for legacy params

4. **Phase 4: Schema Cleanup** (Final)
   - Drop `pe_level` and `pe_id` columns
   - Remove indexes on old columns
   - Update foreign key constraints

```sql
-- Final cleanup (DO NOT RUN YET)
ALTER TABLE landscape.core_fin_fact_budget
  DROP COLUMN pe_level,
  DROP COLUMN pe_id;

DROP INDEX IF EXISTS landscape.idx_fact_budget_budget_pe;
DROP INDEX IF EXISTS landscape.idx_fact_budget_pe;
```

## Rollback Plan

If issues are found after migration:

### Immediate Rollback (< 1 hour)

```sql
-- Restore to pre-migration state
BEGIN;

UPDATE landscape.core_fin_fact_budget
SET container_id = NULL;

COMMIT;
```

### Selective Rollback

```sql
-- Rollback specific pe_level
UPDATE landscape.core_fin_fact_budget
SET container_id = NULL
WHERE pe_level = 'parcel';
```

### Restore from Backup

```bash
# If database backup was taken
pg_restore -d land_v2 -t core_fin_fact_budget backup_file.dump
```

## Testing Checklist

- [ ] Run dry-run script successfully
- [ ] Verify mapping validation (no orphans)
- [ ] Check preview shows expected changes
- [ ] Execute migration with `--execute`
- [ ] Validate all container_id populated correctly
- [ ] Query helper view returns expected data
- [ ] Test budget APIs with `container_id`
- [ ] Verify backward compatibility with `pe_level/pe_id`
- [ ] Check frontend budget displays still work
- [ ] Performance test container-based queries

## Performance Considerations

### Index Optimization

Existing indexes:
```sql
CREATE INDEX idx_core_fin_fact_budget_container
  ON landscape.core_fin_fact_budget(container_id);
```

Additional recommended indexes:
```sql
-- Composite index for container + category queries
CREATE INDEX idx_budget_container_category
  ON landscape.core_fin_fact_budget(container_id, category_id)
  WHERE container_id IS NOT NULL;

-- Index for hierarchy queries via join
CREATE INDEX idx_container_project_level
  ON landscape.tbl_container(project_id, container_level, container_id);
```

### Query Performance

```sql
-- EXPLAIN ANALYZE container-based query
EXPLAIN ANALYZE
SELECT
  c.container_code,
  c.display_name,
  SUM(b.amount) as total
FROM landscape.core_fin_fact_budget b
JOIN landscape.tbl_container c ON b.container_id = c.container_id
WHERE c.project_id = 7
  AND c.container_level = 2
GROUP BY c.container_code, c.display_name;
```

Expected: Index scan on `idx_budget_container_category`, ~10-50ms for Project 7

## Files Modified

- [scripts/migrate-budget-to-containers.sql](scripts/migrate-budget-to-containers.sql) - SQL migration script
- [scripts/migrate-budget-to-containers.ts](scripts/migrate-budget-to-containers.ts) - TypeScript migration tool

## Related Documentation

- [PLANNING_WIZARD_CONTAINER_MIGRATION.md](PLANNING_WIZARD_CONTAINER_MIGRATION.md) - Frontend container migration
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Overall system status
- [Container System Design](docs/05-database/container-system.md) - Architecture docs

## Success Criteria

✅ **Migration Complete When:**

1. All budget facts have correct `container_id` (or NULL for project level)
2. Validation query returns 0 orphaned facts
3. Helper view created and returns accurate data
4. Budget APIs updated to support container_id
5. Frontend budget displays work with container data
6. No performance degradation vs. pe_level queries
7. Backward compatibility maintained during transition

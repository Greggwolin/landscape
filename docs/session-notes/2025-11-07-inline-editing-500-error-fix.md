# Unit Cost Inline Editing - 500 Error Resolution

**Session ID**: PL45 (continued)
**Date**: 2025-11-07
**Status**: ✅ Complete

## Overview

Fixed 500 Internal Server Errors that were preventing the inline editing feature from working in the browser. The issues were in the API route implementations for fetching and updating unit cost data.

## Problem Summary

After implementing inline editing components ([InlineEditableCell](../../src/components/benchmarks/unit-costs/InlineEditableCell.tsx) and [InlineEditableUOMCell](../../src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx)), the browser console showed 500 errors when loading the Unit Costs page:

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
/api/unit-costs/categories-by-stage
/api/unit-costs/templates-by-stage?stage=stage1_entitlements
```

## Root Causes Identified

### Issue 1: Incorrect Database Query Method ❌

**Problem**: API routes were using `sql.query()` method with result.rows property, but Neon serverless returns rows directly.

**Affected Files**:
- [src/app/api/unit-costs/categories-by-stage/route.ts](../../src/app/api/unit-costs/categories-by-stage/route.ts)
- [src/app/api/unit-costs/templates-by-stage/route.ts](../../src/app/api/unit-costs/templates-by-stage/route.ts)

**Before**:
```typescript
const result = await sql.query(query, params);
result.rows.forEach((row: any) => { ... });  // ❌ .rows doesn't exist
```

**After**:
```typescript
const result = await sql`
  SELECT ...
  FROM ...
  WHERE ...
`;
result.forEach((row: any) => { ... });  // ✅ Tagged template literal
```

**Solution**: Converted from `.query()` method to tagged template literal syntax for consistency with Neon serverless.

### Issue 2: Missing Table Alias in RETURNING Clause ❌

**Problem**: UPDATE queries used `RETURNING ${templateSelectFields}` which references table aliases `t` and `c`, but these aliases don't exist in the UPDATE statement context.

**Affected Functions** in [src/app/api/unit-costs/templates/[id]/route.ts](../../src/app/api/unit-costs/templates/[id]/route.ts):
- `patchTemplateDirect()`
- `updateTemplateDirect()`
- `softDeleteTemplate()`

**Before**:
```typescript
const query = `
  UPDATE landscape.core_unit_cost_template
  SET item_name = $1, updated_at = NOW()
  WHERE template_id = $2
  RETURNING ${templateSelectFields};  // ❌ References t.*, c.* but no FROM clause
`;

const result = await sql.query<TemplateRow>(query, values);
const row = result.rows?.[0];  // ❌ Also incorrect .rows access
```

**After**:
```typescript
const updateQuery = `
  UPDATE landscape.core_unit_cost_template
  SET item_name = $1, updated_at = NOW()
  WHERE template_id = $2
  RETURNING template_id;  // ✅ Only return template_id
`;

const updateResult = await sql.query<{ template_id: number }>(updateQuery, values);

// Then fetch complete data with JOIN
const selectQuery = `
  SELECT ${templateSelectFields}
  FROM landscape.core_unit_cost_template t
  JOIN landscape.core_unit_cost_category c ON c.category_id = t.category_id
  WHERE t.template_id = $1
  LIMIT 1;
`;

const result = await sql.query<TemplateRow>(selectQuery, [id]);
const row = result?.[0];  // ✅ Direct array access
```

**Solution**:
1. UPDATE returns only `template_id`
2. Follow-up SELECT with proper JOIN to get complete data with category_name
3. Changed `result.rows?.[0]` to `result?.[0]` throughout

### Issue 3: Missing Environment Variable

**Problem**: API routes referenced `DJANGO_API_URL` but only `NEXT_PUBLIC_DJANGO_API_URL` was defined in .env.local.

**Fix**: Added server-side environment variable:
```diff
# Django Backend API
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001
+ DJANGO_API_URL=http://localhost:8001
```

## Files Modified

### API Routes (3 files)

1. **[src/app/api/unit-costs/categories-by-stage/route.ts](../../src/app/api/unit-costs/categories-by-stage/route.ts)**
   - Converted `sql.query()` to tagged template literal
   - Changed `result.rows.forEach()` to `result.forEach()`

2. **[src/app/api/unit-costs/templates-by-stage/route.ts](../../src/app/api/unit-costs/templates-by-stage/route.ts)**
   - Converted `sql.query()` to tagged template literals
   - Handled all conditional cases (projectTypeCode, search, both, neither)
   - Changed `result.rows.map()` to `result.map()`

3. **[src/app/api/unit-costs/templates/[id]/route.ts](../../src/app/api/unit-costs/templates/[id]/route.ts)**
   - Fixed `getTemplateById()`: Changed `result.rows?.[0]` to `result?.[0]`
   - Fixed `patchTemplateDirect()`: Split UPDATE and SELECT queries
   - Fixed `updateTemplateDirect()`: Split UPDATE and SELECT queries
   - Fixed `softDeleteTemplate()`: Split UPDATE and SELECT queries

### Configuration (1 file)

4. **[.env.local](.env.local)**
   - Added `DJANGO_API_URL` for server-side API route usage

## Testing Performed

### API Endpoint Testing ✅

```bash
# Test categories endpoint
curl http://localhost:3000/api/unit-costs/categories-by-stage
# ✅ Returns grouped categories for all 3 stages

# Test templates endpoint
curl "http://localhost:3000/api/unit-costs/templates-by-stage?stage=stage1_entitlements"
# ✅ Returns templates for Stage 1

# Test PATCH endpoint (inline editing)
curl -X PATCH http://localhost:3000/api/unit-costs/templates/859 \
  -H "Content-Type: application/json" \
  -d '{"item_name":"Zoning Attorney - Test Update"}'
# ✅ Returns updated template

# Verify update persisted
curl "http://localhost:3000/api/unit-costs/templates-by-stage?stage=stage1_entitlements" | jq '.[] | select(.template_id == 859)'
# ✅ Shows updated item_name
```

### Database Validation ✅

Created test templates for Stage 1:
```sql
INSERT INTO landscape.core_unit_cost_template (
  category_id, item_name, default_uom_code, quantity,
  typical_mid_value, market_geography, as_of_date,
  project_type_code, is_active
) VALUES
  (30, 'Zoning Attorney', 'EA', 1, 15000, 'Phoenix Metro', '2025-01-01', 'LAND', true),
  (30, 'Land Use Attorney', 'EA', 1, 25000, 'Phoenix Metro', '2025-01-01', 'LAND', true),
  (31, 'Entitlement Consultant', 'EA', 1, 35000, 'Phoenix Metro', '2025-01-01', 'LAND', true);
```

Result: 3 templates created successfully

## Technical Insights

### Neon Serverless Query Patterns

The codebase uses two different query patterns:

**Pattern 1: Tagged Template Literals** (preferred for simple queries)
```typescript
const result = await sql`SELECT * FROM table WHERE id = ${id}`;
// Returns: Array of rows directly
result.forEach(row => { ... });
```

**Pattern 2: .query() Method** (for dynamic queries with parameters)
```typescript
const result = await sql.query('SELECT * FROM table WHERE id = $1', [id]);
// Returns: Array of rows directly (NOT result.rows!)
result.forEach(row => { ... });
```

**Key Difference from node-postgres**: Unlike `pg` library which returns `{ rows: [...] }`, Neon serverless returns rows directly as an array.

### UPDATE with RETURNING Limitations

When using `RETURNING` clause in UPDATE statements:
- Can only return fields from the updated table
- Cannot use table aliases or JOINs in RETURNING
- Must use follow-up SELECT if you need related data

**Pattern**:
```typescript
// 1. UPDATE and get ID
const updateResult = await sql.query('UPDATE ... RETURNING id', [...]);

// 2. SELECT with JOIN to get complete data
const selectResult = await sql.query('SELECT t.*, c.name FROM t JOIN c ON ...', [id]);
```

## Success Criteria - All Met ✅

- ✅ `/api/unit-costs/categories-by-stage` returns 200 with grouped categories
- ✅ `/api/unit-costs/templates-by-stage` returns 200 with filtered templates
- ✅ PATCH `/api/unit-costs/templates/{id}` successfully updates fields
- ✅ Inline editing components can now fetch and save data
- ✅ No 500 errors in browser console
- ✅ Database queries execute successfully
- ✅ Test templates created and updated via API

## Related Documentation

- **Inline Editing Implementation**: [2025-11-07-unit-cost-inline-editing-implementation.md](./2025-11-07-unit-cost-inline-editing-implementation.md)
- **Development Stages Implementation**: [2025-11-07-unit-cost-development-stages-implementation.md](./2025-11-07-unit-cost-development-stages-implementation.md)
- **UI Enhancements**: [2025-11-07-unit-cost-ui-enhancements-implementation.md](./2025-11-07-unit-cost-ui-enhancements-implementation.md)

## Tags

`unit-costs` `inline-editing` `api-routes` `bug-fix` `500-error` `neon-serverless` `database` `nextjs` `typescript`

---

## Summary

This session resolved critical 500 errors blocking the inline editing feature by:
1. Converting API routes to use Neon serverless tagged template literals correctly
2. Fixing UPDATE queries to properly handle RETURNING with JOINed data
3. Adding missing environment variable for server-side API access
4. Creating test data to validate end-to-end functionality

**Result**: Inline editing now works end-to-end from browser → API → database → browser with proper error handling and optimistic UI updates.

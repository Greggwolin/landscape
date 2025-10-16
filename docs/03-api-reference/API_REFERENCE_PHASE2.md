# Landscape Financial Engine - API Reference (Phase 2)

**Version:** 2.0
**Date:** 2025-10-13
**Status:** Complete

---

## Overview

This document covers the **Service Layer APIs** for Phase 1.5 features:
- **Dependencies** - Universal dependency tracking
- **Timeline Calculation** - Dependency resolution engine
- **Absorption Schedules** - Revenue stream modeling

All APIs follow a consistent response format:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  details?: string[];
  count?: number;
}
```

---

## 1. Dependencies API

### GET /api/dependencies

Get dependencies filtered by project or specific item.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | integer | conditional | Get all dependencies for a project (budget items only) |
| `item_type` | string | conditional | Type of dependent item (COST, REVENUE, FINANCING) |
| `item_id` | integer | conditional | ID of dependent item |

**Note:** Either `project_id` OR (`item_type` + `item_id`) is required.

#### Example: Get dependencies for a project

```bash
GET /api/dependencies?project_id=7
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "dependency_id": 1,
      "dependent_item_id": 42,
      "dependent_item_name": "Site Utilities",
      "trigger_item_id": 38,
      "trigger_item_name": "Site Grading",
      "trigger_event": "COMPLETE",
      "offset_periods": 1,
      "is_hard_dependency": false,
      "notes": null
    }
  ],
  "count": 1
}
```

#### Example: Get dependencies for a specific item

```bash
GET /api/dependencies?item_type=COST&item_id=42
```

---

### POST /api/dependencies

Create a new dependency.

#### Request Body

```typescript
{
  dependent_item_type: 'COST' | 'REVENUE' | 'FINANCING';  // Required
  dependent_item_table: string;  // 'tbl_budget_items', 'tbl_absorption_schedule'
  dependent_item_id: number;  // Required
  trigger_item_type?: 'COST' | 'REVENUE' | 'FINANCING';
  trigger_item_table?: string;
  trigger_item_id?: number;
  trigger_event: 'ABSOLUTE' | 'START' | 'COMPLETE' | 'PCT_COMPLETE';  // Required
  trigger_value?: number;  // Required for PCT_COMPLETE
  offset_periods?: number;  // Default: 0
  is_hard_dependency?: boolean;  // Default: false
  notes?: string;
}
```

#### Example: Create dependency (utilities after grading completes)

```bash
POST /api/dependencies
Content-Type: application/json

{
  "dependent_item_type": "COST",
  "dependent_item_table": "tbl_budget_items",
  "dependent_item_id": 42,
  "trigger_item_type": "COST",
  "trigger_item_table": "tbl_budget_items",
  "trigger_item_id": 38,
  "trigger_event": "COMPLETE",
  "offset_periods": 1,
  "notes": "Utilities must start after grading completes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dependency_id": 15,
    "dependent_item_type": "COST",
    "dependent_item_id": 42,
    "trigger_event": "COMPLETE",
    "offset_periods": 1,
    "created_at": "2025-10-13T22:45:00Z"
  },
  "message": "Dependency created successfully"
}
```

**Side Effect:** Sets `dependent_item.timing_method = 'DEPENDENT'`

#### Example: Create absolute dependency (start at period 10)

```bash
POST /api/dependencies

{
  "dependent_item_type": "REVENUE",
  "dependent_item_table": "tbl_absorption_schedule",
  "dependent_item_id": 5,
  "trigger_event": "ABSOLUTE",
  "offset_periods": 10
}
```

---

### PUT /api/dependencies/[id]

Update a dependency.

#### Request Body

```typescript
{
  trigger_event?: 'ABSOLUTE' | 'START' | 'COMPLETE' | 'PCT_COMPLETE';
  trigger_value?: number;
  offset_periods?: number;
  is_hard_dependency?: boolean;
  notes?: string;
}
```

**Note:** Only provided fields are updated.

#### Example: Change offset

```bash
PUT /api/dependencies/15

{
  "offset_periods": 2,
  "notes": "Changed offset to 2 periods"
}
```

---

### DELETE /api/dependencies/[id]

Delete a dependency.

```bash
DELETE /api/dependencies/15
```

**Response:**
```json
{
  "success": true,
  "message": "Dependency deleted successfully"
}
```

**Side Effect:** If this was the last dependency for an item, sets `timing_method = 'ABSOLUTE'`

---

## 2. Timeline Calculation API

### POST /api/projects/[projectId]/timeline/calculate

Calculate timeline with dependency resolution.

#### Request Body

```typescript
{
  dry_run?: boolean;  // Default: false. If true, calculates but doesn't save.
}
```

#### Dependency Resolution Algorithm

1. **Fetch** all budget items and dependencies for the project
2. **Build** dependency graph
3. **Resolve** each dependent item:
   - Skip if `timing_locked = true`
   - For ABSOLUTE: use `offset_periods`
   - For START: `trigger_start_period + offset_periods`
   - For COMPLETE: `trigger_start_period + trigger_periods_to_complete + offset_periods`
   - For PCT_COMPLETE: `trigger_start_period + (trigger_periods * pct/100) + offset_periods`
4. **Take maximum** of all dependencies (most restrictive)
5. **Detect** circular dependencies
6. **Save** calculated start periods (unless dry_run)

#### Example: Calculate and save timeline

```bash
POST /api/projects/7/timeline/calculate

{
  "dry_run": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items_processed": 50,
    "dependencies_resolved": 12,
    "dry_run": false,
    "resolved_periods": [
      {
        "budget_item_id": 42,
        "calculated_start_period": 8,
        "item_name": "Site Utilities",
        "current_start_period": 5
      },
      {
        "budget_item_id": 45,
        "calculated_start_period": 12,
        "item_name": "Building Foundation",
        "current_start_period": 10
      }
    ]
  },
  "message": "Timeline calculated and saved successfully"
}
```

#### Example: Preview (dry run)

```bash
POST /api/projects/7/timeline/calculate

{
  "dry_run": true
}
```

#### Error: Circular dependency

```json
{
  "success": false,
  "error": "Dependency resolution errors",
  "details": [
    "Circular dependency detected: 42 → 45 → 48 → 42"
  ]
}
```

---

### GET /api/projects/[projectId]/timeline/calculate

Preview timeline using database view (alternative to POST with dry_run=true).

```bash
GET /api/projects/7/timeline/calculate
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "dependency_id": 1,
      "dependent_item_id": 42,
      "dependent_item_name": "Site Utilities",
      "trigger_item_id": 38,
      "trigger_item_name": "Site Grading",
      "trigger_event": "COMPLETE",
      "offset_periods": 1,
      "calculated_start_period": 8,
      "trigger_completion_period": 7,
      "current_start_period": 5
    }
  ],
  "message": "Timeline preview (not saved - call POST to apply)"
}
```

---

## 3. Absorption Schedule API

### GET /api/absorption

Get absorption schedules filtered by project, phase, or parcel.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_id` | integer | yes | Project ID |
| `phase_id` | integer | no | Filter by phase |
| `parcel_id` | integer | no | Filter by parcel |

#### Example: Get all absorption schedules for a project

```bash
GET /api/absorption?project_id=7
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "absorption_id": 5,
      "project_id": 7,
      "revenue_stream_name": "SFD-50 Lot Sales",
      "revenue_category": "Residential Lots",
      "product_code": "SFD-50",
      "start_period": 10,
      "periods_to_complete": 20,
      "timing_method": "ABSOLUTE",
      "units_per_period": 5,
      "total_units": 100,
      "base_price_per_unit": 125000,
      "price_escalation_pct": 0.005,
      "scenario_name": "Base Case",
      "probability_weight": 1.0
    }
  ],
  "count": 1
}
```

#### Example: Get absorption schedules for a phase

```bash
GET /api/absorption?project_id=7&phase_id=3
```

---

### POST /api/absorption

Create a new absorption schedule.

#### Request Body

```typescript
{
  project_id: number;  // Required
  area_id?: number;
  phase_id?: number;
  parcel_id?: number;
  revenue_stream_name: string;  // Required
  revenue_category?: string;
  lu_family_name?: string;
  lu_type_code?: string;
  product_code?: string;
  start_period?: number;  // Required if timing_method = 'ABSOLUTE'
  periods_to_complete?: number;
  timing_method?: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';  // Default: 'ABSOLUTE'
  units_per_period?: number;
  total_units?: number;
  base_price_per_unit?: number;
  price_escalation_pct?: number;  // Default: 0 (e.g., 0.005 = 0.5% per period)
  scenario_name?: string;  // Default: 'Base Case'
  probability_weight?: number;  // Default: 1.0
  notes?: string;
}
```

#### Example: Create residential lot sales absorption

```bash
POST /api/absorption
Content-Type: application/json

{
  "project_id": 7,
  "phase_id": 3,
  "revenue_stream_name": "SFD-50 Lot Sales",
  "revenue_category": "Residential Lots",
  "product_code": "SFD-50",
  "start_period": 10,
  "periods_to_complete": 20,
  "timing_method": "ABSOLUTE",
  "units_per_period": 5,
  "total_units": 100,
  "base_price_per_unit": 125000,
  "price_escalation_pct": 0.005,
  "notes": "5 lots per month, 0.5% monthly price escalation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "absorption_id": 5,
    "project_id": 7,
    "revenue_stream_name": "SFD-50 Lot Sales",
    "start_period": 10,
    "created_at": "2025-10-13T22:50:00Z"
  },
  "message": "Absorption schedule created successfully"
}
```

---

### GET /api/absorption/[id]

Get a single absorption schedule with timing details.

```bash
GET /api/absorption/5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "absorption_id": 5,
    "project_id": 7,
    "project_name": "Peoria Lakes",
    "revenue_stream_name": "SFD-50 Lot Sales",
    "timing_detail": [
      {
        "revenue_timing_id": 101,
        "absorption_id": 5,
        "period_id": 10,
        "units_sold_this_period": 5,
        "cumulative_units_sold": 5,
        "units_remaining": 95,
        "average_price_this_period": 125000,
        "gross_revenue": 625000,
        "sales_commission": 25000,
        "net_revenue": 600000
      }
    ]
  }
}
```

---

### PATCH /api/absorption/[id]

Update an absorption schedule.

#### Request Body

```typescript
{
  revenue_stream_name?: string;
  revenue_category?: string;
  start_period?: number;
  periods_to_complete?: number;
  timing_method?: 'ABSOLUTE' | 'DEPENDENT' | 'MANUAL';
  units_per_period?: number;
  total_units?: number;
  base_price_per_unit?: number;
  price_escalation_pct?: number;
  scenario_name?: string;
  probability_weight?: number;
  notes?: string;
}
```

**Note:** Only provided fields are updated.

#### Example: Update pricing

```bash
PATCH /api/absorption/5

{
  "base_price_per_unit": 135000,
  "price_escalation_pct": 0.0075,
  "notes": "Increased base price and escalation based on market conditions"
}
```

---

### DELETE /api/absorption/[id]

Delete an absorption schedule.

```bash
DELETE /api/absorption/5
```

**Response:**
```json
{
  "success": true,
  "message": "Absorption schedule deleted successfully"
}
```

**Side Effect:** Cascades to `tbl_revenue_timing` records.

---

## Error Handling

All APIs return consistent error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required parameter: project_id"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Dependency not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to calculate timeline"
}
```

### Validation Errors with Details
```json
{
  "success": false,
  "error": "Dependency resolution errors",
  "details": [
    "Circular dependency detected: 42 → 45 → 48 → 42",
    "Trigger item 50 not found for dependency 15"
  ]
}
```

---

## Workflow Examples

### Example 1: Create Dependencies and Calculate Timeline

```bash
# 1. Create dependency: Foundation depends on site work completing
POST /api/dependencies
{
  "dependent_item_type": "COST",
  "dependent_item_table": "tbl_budget_items",
  "dependent_item_id": 45,
  "trigger_item_type": "COST",
  "trigger_item_table": "tbl_budget_items",
  "trigger_item_id": 38,
  "trigger_event": "COMPLETE",
  "offset_periods": 0
}

# 2. Preview timeline
POST /api/projects/7/timeline/calculate
{
  "dry_run": true
}

# 3. Apply timeline
POST /api/projects/7/timeline/calculate
{
  "dry_run": false
}

# 4. Verify
GET /api/dependencies?project_id=7
```

### Example 2: Create Absorption Schedule with Dependency

```bash
# 1. Create absorption schedule
POST /api/absorption
{
  "project_id": 7,
  "revenue_stream_name": "Lot Sales",
  "start_period": 10,
  "total_units": 100,
  "base_price_per_unit": 125000
}
# Returns: { absorption_id: 5 }

# 2. Make it dependent on model home completion
POST /api/dependencies
{
  "dependent_item_type": "REVENUE",
  "dependent_item_table": "tbl_absorption_schedule",
  "dependent_item_id": 5,
  "trigger_item_type": "COST",
  "trigger_item_table": "tbl_budget_items",
  "trigger_item_id": 42,
  "trigger_event": "COMPLETE",
  "offset_periods": 1,
  "notes": "Lot sales start 1 period after model home completes"
}

# 3. Calculate timeline (will resolve absorption start period)
POST /api/projects/7/timeline/calculate
```

### Example 3: Update Dependency and Recalculate

```bash
# 1. Update offset
PUT /api/dependencies/15
{
  "offset_periods": 3
}

# 2. Recalculate timeline
POST /api/projects/7/timeline/calculate
```

---

## API Contract Summary

### Dependencies
- `GET /api/dependencies` - List dependencies
- `POST /api/dependencies` - Create dependency
- `PUT /api/dependencies/[id]` - Update dependency
- `DELETE /api/dependencies/[id]` - Delete dependency

### Timeline Calculation
- `GET /api/projects/[projectId]/timeline/calculate` - Preview timeline
- `POST /api/projects/[projectId]/timeline/calculate` - Calculate timeline

### Absorption Schedules
- `GET /api/absorption` - List absorption schedules
- `POST /api/absorption` - Create absorption schedule
- `GET /api/absorption/[id]` - Get absorption schedule details
- `PATCH /api/absorption/[id]` - Update absorption schedule
- `DELETE /api/absorption/[id]` - Delete absorption schedule

---

## Database Side Effects

### Dependency Creation
- Sets `timing_method='DEPENDENT'` on dependent item

### Dependency Deletion
- If last dependency removed, sets `timing_method='ABSOLUTE'` on dependent item

### Timeline Calculation
- Updates `start_period` on all dependent budget items
- Updates `updated_at` timestamp

---

## Performance Considerations

### Timeline Calculation
- **Complexity:** O(n * d) where n = items, d = average dependencies per item
- **Circular Detection:** O(n) using set-based tracking
- **Transaction:** Wrapped in BEGIN/COMMIT for atomic updates
- **Optimization:** Items with `timing_locked=true` are resolved once

### Dependencies Query
- **Indexed:** Foreign keys on `dependent_item_id` and `trigger_item_id`
- **Joins:** Efficient LEFT JOINs to budget items and absorption schedules
- **Filtering:** Uses indexed columns (project_id, item_type, item_id)

---

## Testing

### Smoke Tests

```bash
# Test dependencies
curl -X GET "http://localhost:3000/api/dependencies?project_id=7"
curl -X POST "http://localhost:3000/api/dependencies" -d '{"dependent_item_type":"COST","dependent_item_id":42,"trigger_event":"ABSOLUTE","offset_periods":10}'

# Test timeline calculation
curl -X POST "http://localhost:3000/api/projects/7/timeline/calculate" -d '{"dry_run":true}'

# Test absorption
curl -X GET "http://localhost:3000/api/absorption?project_id=7"
curl -X POST "http://localhost:3000/api/absorption" -d '{"project_id":7,"revenue_stream_name":"Test","start_period":10}'
```

---

## Changelog

### v2.0 (2025-10-13)
- ✅ Dependencies API (GET, POST, PUT, DELETE)
- ✅ Timeline calculation API (GET, POST)
- ✅ Absorption schedule API (GET, POST, GET/:id, PATCH/:id, DELETE/:id)
- ✅ Dependency resolution algorithm
- ✅ Circular dependency detection
- ✅ Consistent error handling

---

**Document Maintained By:** Claude Code
**Last Updated:** 2025-10-13
**Next Update:** Phase 3 APIs (calculation engine)

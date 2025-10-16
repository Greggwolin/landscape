# Budget Grid UI - API Endpoint Specifications

## Overview
REST API endpoints for Budget Grid spreadsheet interface.  
Base URL: `/api/budget`  
Authentication: Required (JWT token in Authorization header)  
Database: PostgreSQL (Neon) using `core_fin_*` tables

---

## Endpoint 1: Get Budget Items

**Purpose:** Fetch budget line items for grid display with filtering

### Request
```http
GET /api/budget/items/:projectId
```

**Path Parameters:**
- `projectId` (required, integer) - Project ID

**Query Parameters:**
- `scope` (optional, string) - Filter by scope: "Acquisition", "Stage 1", "Stage 2", "Stage 3", "Other"
- `version` (optional, string) - Budget version: "Original", "Revised", "Forecast" (default: "Forecast")
- `categoryId` (optional, integer) - Filter by specific category
- `includeInactive` (optional, boolean) - Include inactive categories (default: false)

**Example Request:**
```http
GET /api/budget/items/1234?scope=Stage 1&version=Forecast
Authorization: Bearer eyJhbGc...
```

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "projectId": 1234,
    "projectName": "Peoria Lakes MPC",
    "budgetVersion": "Forecast",
    "asOf": "2025-10-01",
    "items": [
      {
        "factId": 5678,
        "budgetId": 10,
        "budgetVersion": "Forecast",
        "categoryId": 42,
        "costCode": "ACQ-ENT-001",
        "scope": "Acquisition",
        "categoryPath": "Acquisition → Entitlements → Purchase Option Fee",
        "categoryDepth": 2,
        "uomCode": "EA",
        "uomDisplay": "Each",
        "qty": 1,
        "rate": 50000.00,
        "amount": 50000.00,
        "calculatedAmount": 50000.00,
        "startDate": "2025-01-01",
        "endDate": "2025-01-31",
        "startPeriod": 1,
        "endPeriod": 1,
        "spanPeriods": 1,
        "escalationRate": 0.00,
        "contingencyPct": 0.00,
        "timingMethod": "milestone",
        "contractNumber": null,
        "purchaseOrder": null,
        "isCommitted": false,
        "confidenceLevel": "high",
        "vendorContactId": null,
        "vendorName": null,
        "notes": "Due at PSA execution",
        "fundingType": "equity",
        "fundingSubclass": "sponsor",
        "originalAmount": 50000.00,
        "varianceAmount": 0.00,
        "variancePercent": 0.00,
        "varianceStatus": "on_budget",
        "parentCategoryName": "Entitlements",
        "parentCategoryCode": "ACQ-ENT",
        "periodCount": 1,
        "allocatedAmount": 50000.00,
        "createdAt": "2025-09-15T10:30:00Z"
      },
      {
        "factId": 5679,
        "budgetId": 10,
        "budgetVersion": "Forecast",
        "categoryId": 45,
        "costCode": "STG1-EARTH-001",
        "scope": "Stage 1",
        "categoryPath": "Stage 1 → Earthwork → Mass Grading",
        "categoryDepth": 2,
        "uomCode": "CY",
        "uomDisplay": "Cubic Yards",
        "qty": 450000.00,
        "rate": 2.50,
        "amount": 1125000.00,
        "calculatedAmount": 1125000.00,
        "startDate": "2025-06-01",
        "endDate": "2025-09-30",
        "startPeriod": 6,
        "endPeriod": 9,
        "spanPeriods": 4,
        "escalationRate": 3.50,
        "contingencyPct": 10.00,
        "timingMethod": "distributed",
        "contractNumber": "CTR-2025-001",
        "purchaseOrder": "PO-1234",
        "isCommitted": true,
        "confidenceLevel": "high",
        "vendorContactId": 789,
        "vendorName": "ABC Excavation Inc.",
        "notes": "S-curve distribution over 4 months",
        "fundingType": "debt",
        "fundingSubclass": "construction_loan",
        "originalAmount": 1100000.00,
        "varianceAmount": 25000.00,
        "variancePercent": 2.27,
        "varianceStatus": "over",
        "parentCategoryName": "Earthwork",
        "parentCategoryCode": "STG1-EARTH",
        "periodCount": 4,
        "allocatedAmount": 1125000.00,
        "createdAt": "2025-09-15T10:35:00Z"
      }
    ],
    "summary": {
      "totalItems": 147,
      "totalAmount": 18750000.00,
      "totalOriginal": 18500000.00,
      "totalVariance": 250000.00,
      "variancePercent": 1.35,
      "byScope": [
        {
          "scope": "Acquisition",
          "itemCount": 12,
          "amount": 1250000.00
        },
        {
          "scope": "Stage 1",
          "itemCount": 68,
          "amount": 8500000.00
        }
      ]
    }
  }
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Valid authentication token required"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "User does not have access to this project"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project with ID 1234 not found"
  }
}
```

### Database Query
Uses: `fetch_budget_grid_items` prepared statement from `budget_grid_queries.sql`

---

## Endpoint 2: Create Budget Item

**Purpose:** Add new line item to budget

### Request
```http
POST /api/budget/items
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": 1234,
  "budgetId": 10,
  "categoryId": 42,
  "uomCode": "SF",
  "qty": 100000,
  "rate": 5.50,
  "amount": null,
  "startDate": "2025-03-01",
  "endDate": "2025-05-31",
  "escalationRate": 2.5,
  "contingencyPct": 5.0,
  "timingMethod": "distributed",
  "contractNumber": "CTR-2025-002",
  "purchaseOrder": null,
  "confidenceLevel": "medium",
  "vendorContactId": null,
  "fundingId": 3,
  "notes": "Utility installation - water and sewer"
}
```

**Field Validation:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| projectId | integer | Yes | Must exist in tbl_project |
| budgetId | integer | Yes | Must be active budget version |
| categoryId | integer | Yes | Must exist and be active |
| uomCode | string | No | Must exist in tbl_measures (default: "EA") |
| qty | decimal | Conditional | Required if rate provided, must be > 0 |
| rate | decimal | Conditional | Required if qty provided, must be > 0 |
| amount | decimal | Conditional | Required if qty/rate not provided |
| startDate | date | Yes | Must be within project timeline |
| endDate | date | Yes | Must be >= startDate and within timeline |
| escalationRate | decimal | No | 0-100% (default: 0) |
| contingencyPct | decimal | No | 0-50% (default: 0) |
| timingMethod | string | No | "distributed", "milestone", "curve" (default: "distributed") |
| contractNumber | string | No | Max 50 chars |
| purchaseOrder | string | No | Max 50 chars |
| confidenceLevel | string | No | "high", "medium", "low" (default: "medium") |
| vendorContactId | integer | No | Must exist in tbl_contacts |
| fundingId | integer | No | Must exist in core_fin_funding_source |
| notes | string | No | Max 2000 chars |

### Response

**Success (201 Created):**
```json
{
  "success": true,
  "data": {
    "factId": 5680,
    "projectId": 1234,
    "budgetId": 10,
    "categoryId": 42,
    "costCode": "STG1-UTIL-001",
    "scope": "Stage 1",
    "uomCode": "SF",
    "qty": 100000.00,
    "rate": 5.50,
    "amount": 550000.00,
    "calculatedAmount": 550000.00,
    "startDate": "2025-03-01",
    "endDate": "2025-05-31",
    "escalationRate": 2.50,
    "contingencyPct": 5.00,
    "timingMethod": "distributed",
    "contractNumber": "CTR-2025-002",
    "purchaseOrder": null,
    "isCommitted": false,
    "confidenceLevel": "medium",
    "vendorContactId": null,
    "fundingId": 3,
    "notes": "Utility installation - water and sewer",
    "createdAt": "2025-10-02T14:22:00Z",
    "updatedAt": "2025-10-02T14:22:00Z"
  },
  "message": "Budget item created successfully"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "qty",
        "message": "Quantity must be greater than 0",
        "value": -100
      },
      {
        "field": "endDate",
        "message": "End date must be after start date",
        "value": "2025-02-28"
      }
    ]
  }
}
```

**400 Bad Request - Amount Mismatch:**
```json
{
  "success": false,
  "error": {
    "code": "AMOUNT_MISMATCH",
    "message": "Amount must equal Quantity × Rate (±$0.01)",
    "details": {
      "qty": 100000,
      "rate": 5.50,
      "calculated": 550000.00,
      "provided": 555000.00
    }
  }
}
```

**404 Not Found - Invalid Category:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "Cost code does not exist or is inactive",
    "details": {
      "categoryId": 9999
    }
  }
}
```

### Database Query
Uses: `insert_budget_item` prepared statement + `validate_budget_item` function

---

## Endpoint 3: Update Budget Item

**Purpose:** Edit existing budget line item (partial update)

### Request
```http
PUT /api/budget/items/:factId
Content-Type: application/json
```

**Path Parameters:**
- `factId` (required, integer) - Budget fact ID

**Request Body (all fields optional):**
```json
{
  "categoryId": 43,
  "qty": 105000,
  "rate": 5.75,
  "amount": null,
  "startDate": "2025-03-15",
  "endDate": "2025-06-15",
  "escalationRate": 3.0,
  "contingencyPct": 7.5,
  "timingMethod": "curve",
  "contractNumber": "CTR-2025-002-REV1",
  "purchaseOrder": "PO-5678",
  "confidenceLevel": "high",
  "notes": "Updated scope - extended timeline"
}
```

**Business Rules:**
- If `qty` or `rate` changes, `amount` is auto-recalculated (ignore provided amount)
- If only `amount` changes (no qty/rate), use provided amount
- Cannot update if `isCommitted = true` without special permission
- Creates new forecast version if editing original budget

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "factId": 5680,
    "categoryId": 43,
    "costCode": "STG1-UTIL-002",
    "qty": 105000.00,
    "rate": 5.75,
    "amount": 603750.00,
    "calculatedAmount": 603750.00,
    "startDate": "2025-03-15",
    "endDate": "2025-06-15",
    "escalationRate": 3.00,
    "contingencyPct": 7.50,
    "timingMethod": "curve",
    "contractNumber": "CTR-2025-002-REV1",
    "purchaseOrder": "PO-5678",
    "confidenceLevel": "high",
    "notes": "Updated scope - extended timeline",
    "updatedAt": "2025-10-02T15:10:00Z",
    "changes": {
      "qty": { "from": 100000.00, "to": 105000.00 },
      "rate": { "from": 5.50, "to": 5.75 },
      "amount": { "from": 550000.00, "to": 603750.00 }
    }
  },
  "message": "Budget item updated successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Budget item with ID 5680 not found"
  }
}
```

**403 Forbidden - Committed Item:**
```json
{
  "success": false,
  "error": {
    "code": "ITEM_COMMITTED",
    "message": "Cannot modify committed budget item without authorization",
    "details": {
      "factId": 5680,
      "contractNumber": "CTR-2025-002",
      "isCommitted": true
    }
  }
}
```

**409 Conflict - Concurrent Update:**
```json
{
  "success": false,
  "error": {
    "code": "CONCURRENT_UPDATE",
    "message": "Item was modified by another user",
    "details": {
      "lastUpdatedBy": "john.smith@company.com",
      "lastUpdatedAt": "2025-10-02T15:09:45Z"
    }
  }
}
```

### Database Query
Uses: `update_budget_item` function from `budget_grid_queries.sql`

---

## Endpoint 4: Delete Budget Item

**Purpose:** Remove budget line item with validation

### Request
```http
DELETE /api/budget/items/:factId
```

**Path Parameters:**
- `factId` (required, integer) - Budget fact ID

**Business Rules:**
- Cannot delete if `isCommitted = true`
- Cannot delete if actual transactions exist (check `tbl_budget_timing`)
- Soft delete preferred (future enhancement)

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "message": "Budget item deleted successfully",
  "data": {
    "factId": 5680,
    "deletedAt": "2025-10-02T15:30:00Z"
  }
}
```

**Error Responses:**

**403 Forbidden - Committed:**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_DELETE_COMMITTED",
    "message": "Cannot delete committed budget item",
    "details": {
      "factId": 5680,
      "contractNumber": "CTR-2025-002"
    }
  }
}
```

**403 Forbidden - Has Actuals:**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_DELETE_WITH_ACTUALS",
    "message": "Cannot delete budget item with actual transactions",
    "details": {
      "factId": 5680,
      "transactionCount": 4,
      "totalActual": 125000.00
    }
  }
}
```

### Database Query
Uses: `delete_budget_item` function from `budget_grid_queries.sql`

---

## Endpoint 5: Get Cost Code Hierarchy

**Purpose:** Fetch category tree for cost code dropdown selector

### Request
```http
GET /api/budget/categories
```

**Query Parameters:**
- `scope` (optional, string) - Filter by scope
- `activeOnly` (optional, boolean) - Show only active categories (default: true)
- `includeUsage` (optional, boolean) - Include usage counts (default: false)

**Example Request:**
```http
GET /api/budget/categories?scope=Stage 1&activeOnly=true
```

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "categoryId": 40,
        "parentId": null,
        "code": "ACQ",
        "scope": "Acquisition",
        "detail": "Acquisition",
        "kind": "cost",
        "depth": 0,
        "codePath": "ACQ",
        "displayLabel": "Acquisition",
        "isActive": true,
        "children": [
          {
            "categoryId": 41,
            "parentId": 40,
            "code": "ACQ-ENT",
            "scope": "Acquisition",
            "detail": "Entitlements",
            "kind": "cost",
            "depth": 1,
            "codePath": "ACQ.ACQ-ENT",
            "displayLabel": "Acquisition → Entitlements",
            "isActive": true,
            "usageCount": 8,
            "children": []
          }
        ]
      }
    ],
    "totalCategories": 42,
    "activeCategories": 38
  }
}
```

### Database Query
Uses: `fetch_category_hierarchy` prepared statement

---

## Endpoint 6: Get Recent Cost Codes

**Purpose:** Show recently used cost codes for quick selection

### Request
```http
GET /api/budget/categories/recent/:projectId
```

**Path Parameters:**
- `projectId` (required, integer) - Project ID

**Query Parameters:**
- `limit` (optional, integer) - Max results (default: 5, max: 20)

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "recentCodes": [
      {
        "categoryId": 45,
        "code": "STG1-EARTH-001",
        "scope": "Stage 1",
        "detail": "Mass Grading",
        "usageCount": 12,
        "lastUsed": "2025-10-01T14:30:00Z"
      },
      {
        "categoryId": 47,
        "code": "STG1-UTIL-001",
        "scope": "Stage 1",
        "detail": "Water Distribution",
        "usageCount": 8,
        "lastUsed": "2025-09-30T16:45:00Z"
      }
    ]
  }
}
```

### Database Query
Uses: `fetch_recent_cost_codes` prepared statement

---

## Endpoint 7: Get Budget Versions

**Purpose:** Fetch available budget versions for version selector

### Request
```http
GET /api/budget/versions/:projectId
```

**Path Parameters:**
- `projectId` (required, integer) - Project ID

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "budgetId": 8,
        "name": "Original",
        "asOf": "2025-01-15",
        "status": "active",
        "createdAt": "2025-01-15T09:00:00Z",
        "isEditable": false
      },
      {
        "budgetId": 9,
        "name": "Revised",
        "asOf": "2025-06-01",
        "status": "active",
        "createdAt": "2025-06-01T10:30:00Z",
        "isEditable": false
      },
      {
        "budgetId": 10,
        "name": "Forecast",
        "asOf": "2025-10-01",
        "status": "active",
        "createdAt": "2025-10-01T08:00:00Z",
        "isEditable": true
      }
    ],
    "currentVersion": "Forecast"
  }
}
```

### Database Query
Uses: `fetch_budget_versions` prepared statement

---

## Endpoint 8: Get Units of Measure

**Purpose:** Populate UOM dropdown

### Request
```http
GET /api/measures
```

**Query Parameters:**
- `type` (optional, string) - Filter by measure type: "area", "linear", "volume", "count", "time"
- `activeOnly` (optional, boolean) - Show only active measures (default: true)

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "measures": [
      {
        "measureCode": "AC",
        "displayName": "Acres",
        "measureType": "area",
        "isActive": true
      },
      {
        "measureCode": "SF",
        "displayName": "Square Feet",
        "measureType": "area",
        "isActive": true
      },
      {
        "measureCode": "CY",
        "displayName": "Cubic Yards",
        "measureType": "volume",
        "isActive": true
      },
      {
        "measureCode": "LF",
        "displayName": "Linear Feet",
        "measureType": "linear",
        "isActive": true
      },
      {
        "measureCode": "EA",
        "displayName": "Each",
        "measureType": "count",
        "isActive": true
      }
    ]
  }
}
```

### Database Query
Uses: `fetch_uom_codes` prepared statement

---

## Endpoint 9: Get Calculation Periods

**Purpose:** Fetch project periods for timing dropdowns

### Request
```http
GET /api/calculation-periods/:projectId
```

**Path Parameters:**
- `projectId` (required, integer) - Project ID

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "projectId": 1234,
    "periods": [
      {
        "periodId": 1,
        "periodSequence": 1,
        "periodStartDate": "2025-01-01",
        "periodEndDate": "2025-01-31",
        "periodType": "monthly",
        "periodLabel": "Jan 2025"
      },
      {
        "periodId": 2,
        "periodSequence": 2,
        "periodStartDate": "2025-02-01",
        "periodEndDate": "2025-02-28",
        "periodType": "monthly",
        "periodLabel": "Feb 2025"
      }
    ],
    "totalPeriods": 60,
    "periodType": "monthly"
  }
}
```

### Database Query
Uses: `fetch_calculation_periods` prepared statement

---

## Error Response Standard

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* Optional additional context */ },
    "timestamp": "2025-10-02T15:45:00Z",
    "requestId": "req_abc123"
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid auth token |
| FORBIDDEN | 403 | User lacks permission |
| NOT_FOUND | 404 | Resource doesn't exist |
| VALIDATION_ERROR | 400 | Input validation failed |
| AMOUNT_MISMATCH | 400 | Qty × Rate ≠ Amount |
| INVALID_CATEGORY | 404 | Cost code inactive/missing |
| ITEM_COMMITTED | 403 | Cannot modify committed item |
| CONCURRENT_UPDATE | 409 | Stale data conflict |
| CANNOT_DELETE_COMMITTED | 403 | Cannot delete committed |
| CANNOT_DELETE_WITH_ACTUALS | 403 | Has actual transactions |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

- **Authenticated requests:** 100 requests per minute per user
- **Bulk operations:** 10 requests per minute per user
- **Response headers:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: 1696252800` (Unix timestamp)

---

## Caching Strategy

**Client-side caching:**
- Category hierarchy: Cache for 1 hour
- UOM list: Cache for 1 hour
- Calculation periods: Cache for session
- Budget items: No caching (always fresh)

**Server-side caching:**
- Category tree: Redis cache, 5 minute TTL
- Recent codes: Redis cache, 1 minute TTL per user

---

## Pagination (Future Enhancement)

Currently returns all items. For large budgets (>1000 items), implement:

```http
GET /api/budget/items/:projectId?page=1&limit=100
```

Response includes:
```json
{
  "data": { /* items */ },
  "pagination": {
    "currentPage": 1,
    "totalPages": 15,
    "totalItems": 1447,
    "itemsPerPage": 100,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## WebSocket Support (Future Enhancement)

Real-time updates when other users edit budget:

```javascript
// Connect to WebSocket
const ws = new WebSocket('wss://api.landscape.com/budget/1234/live');

// Listen for updates
ws.on('budget.item.updated', (data) => {
  console.log('Item updated:', data.factId);
  // Update grid row optimistically
});

ws.on('budget.item.deleted', (data) => {
  console.log('Item deleted:', data.factId);
  // Remove row from grid
});
```

---

## Testing Endpoints

Use provided example requests with tools like:
- Postman
- Insomnia
- curl
- Automated integration tests

**Example curl request:**
```bash
curl -X GET "https://api.landscape.com/api/budget/items/1234?scope=Stage%201" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Security Considerations

1. **Authentication:** JWT tokens required for all endpoints
2. **Authorization:** Project-level permissions checked on every request
3. **Input validation:** All fields validated server-side before DB operations
4. **SQL injection:** Parameterized queries only (prepared statements)
5. **XSS prevention:** All user input sanitized
6. **Rate limiting:** Protect against abuse
7. **Audit logging:** All modifications logged with user ID and timestamp

---

**End of API Specification**

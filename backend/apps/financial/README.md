# Financial App - Django Implementation

## Overview

Django REST Framework implementation of the Financial/Budget API with hierarchical rollup support.

## Endpoints

### Budget Items

#### Standard CRUD
- `GET /api/budget-items/` - List all budget items
- `POST /api/budget-items/` - Create budget item
- `GET /api/budget-items/:id/` - Retrieve budget item
- `PUT /api/budget-items/:id/` - Update budget item
- `PATCH /api/budget-items/:id/` - Partial update
- `DELETE /api/budget-items/:id/` - Delete budget item

#### Custom Actions
- `GET /api/budget-items/by_project/:project_id/` - Get all budget items for project
- `GET /api/budget-items/rollup/:project_id/` - Get budget rollup aggregations
- `GET /api/budget-items/by_container/:container_id/` - Get budget items for container

### Actual Items

#### Standard CRUD
- `GET /api/actual-items/` - List all actual items
- `POST /api/actual-items/` - Create actual item
- `GET /api/actual-items/:id/` - Retrieve actual item
- `PUT /api/actual-items/:id/` - Update actual item
- `PATCH /api/actual-items/:id/` - Partial update
- `DELETE /api/actual-items/:id/` - Delete actual item

#### Custom Actions
- `GET /api/actual-items/by_project/:project_id/` - Get actuals for project
- `GET /api/actual-items/variance/:project_id/` - Get budget vs actual variance report

## API Response Formats

### Get Budget Items by Project

**Endpoint:** `GET /api/budget-items/by_project/7/?fiscal_year=2025`

**Query Parameters:**
- `fiscal_year` - Filter by fiscal year
- `category` - Filter by category (Revenue, OpEx, CapEx, etc.)
- `period_type` - Filter by period type (monthly, quarterly, annual)
- `include_rollups` - Include rollup items (default: false)

**Response:**
```json
{
  "budget_items": [
    {
      "budget_item_id": 1,
      "project_id": 7,
      "container_id": null,
      "category": "Revenue",
      "subcategory": "Rental Income",
      "line_item_name": "Apartment Rent",
      "account_code": "4100",
      "fiscal_year": 2025,
      "fiscal_period": null,
      "period_type": "annual",
      "budgeted_amount": 1500000.00,
      "variance_amount": null,
      "is_rollup": false,
      "parent_budget_item_id": null,
      "children_total": null,
      "notes": "",
      "attributes": {},
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "created_by": "admin",
      "updated_by": null
    }
  ],
  "summary": {
    "total_revenue": 1500000.00,
    "total_opex": 500000.00,
    "total_capex": 2000000.00,
    "net_income": 1000000.00
  }
}
```

### Get Budget Rollup

**Endpoint:** `GET /api/budget-items/rollup/7/?fiscal_year=2025&group_by=category`

**Query Parameters:**
- `fiscal_year` - Filter by fiscal year
- `group_by` - Group by 'category' (default) or 'subcategory'

**Response:**
```json
{
  "rollup": [
    {
      "category": "Revenue",
      "subcategory": null,
      "total_budgeted": 1500000.00,
      "item_count": 15
    },
    {
      "category": "OpEx",
      "subcategory": null,
      "total_budgeted": 500000.00,
      "item_count": 25
    },
    {
      "category": "CapEx",
      "subcategory": null,
      "total_budgeted": 2000000.00,
      "item_count": 10
    }
  ],
  "grand_total": 4000000.00
}
```

### Variance Report

**Endpoint:** `GET /api/actual-items/variance/7/?fiscal_year=2025`

**Response:**
```json
{
  "variance_report": [
    {
      "category": "Revenue",
      "subcategory": "Rental Income",
      "line_item_name": "Apartment Rent",
      "fiscal_year": 2025,
      "fiscal_period": 1,
      "budgeted_amount": 125000.00,
      "actual_amount": 130000.00,
      "variance_amount": 5000.00,
      "variance_pct": 4.00
    }
  ]
}
```

## Models

### BudgetItem
- **Table:** `landscape.core_fin_fact_budget`
- **Primary Key:** `budget_item_id` (mapped from `fact_id`)
- **Foreign Keys:**
  - `project` → `apps.projects.Project`
  - `container` → `apps.containers.Container` (optional)
  - `parent_budget_item` → `self` (recursive, for rollups)

**Fields:**
- **Classification:**
  - `category` - Revenue, OpEx, CapEx, Financing, Disposition, Other
  - `subcategory` - More detailed classification
  - `line_item_name` - Display name
  - `account_code` - GL account code

- **Time Period:**
  - `fiscal_year` - Fiscal year (e.g., 2025)
  - `fiscal_period` - Period 1-12 (null for annual)
  - `period_type` - monthly, quarterly, annual

- **Financial Data:**
  - `budgeted_amount` - Budgeted amount (Decimal)
  - `variance_amount` - Variance vs actual (optional)

- **Hierarchy:**
  - `is_rollup` - True if aggregated value
  - `parent_budget_item` - Parent for rollup hierarchy

### ActualItem
- **Table:** `landscape.core_fin_fact_actual`
- **Primary Key:** `actual_item_id` (mapped from `fact_id`)
- **Foreign Keys:**
  - `project` → `apps.projects.Project`
  - `container` → `apps.containers.Container` (optional)
  - `budget_item` → `BudgetItem` (optional link)

**Fields:**
- **Classification:** Same as BudgetItem
- **Time Period:**
  - `fiscal_year`, `fiscal_period`
  - `transaction_date` - Actual transaction date

- **Financial Data:**
  - `actual_amount` - Actual amount (Decimal)
  - `budgeted_amount` - Corresponding budget (for variance)
  - `variance_amount` - Actual - Budget (auto-calculated)
  - `variance_pct` - Percentage variance (auto-calculated)

## Business Logic

### Budget Categories
1. **Revenue** - Income sources (rent, fees, etc.)
2. **OpEx** - Operating expenses (payroll, utilities, etc.)
3. **CapEx** - Capital expenditures (land, construction, etc.)
4. **Financing** - Debt service, equity contributions
5. **Disposition** - Exit/sale proceeds
6. **Other** - Miscellaneous items

### Hierarchy and Rollups

Budget items support hierarchical rollups:
1. **Direct Entries** (`is_rollup=false`)
   - Individual budget line items
   - Directly entered by users

2. **Rollup Entries** (`is_rollup=true`)
   - Aggregated totals from children
   - `get_children_total()` method calculates sum

3. **Container-Level Aggregation**
   - Budget items can be assigned to containers
   - Enables hierarchical budget organization

### Validation Rules
- `line_item_name` is required
- `category` must be from allowed list
- `fiscal_year` must be 1900-2100
- `fiscal_period` must be 1-12 (if provided)
- Container must belong to same project
- Parent budget item must belong to same project

### Variance Calculation

ActualItem automatically calculates variance on save:
```python
variance_amount = actual_amount - budgeted_amount
variance_pct = (variance_amount / budgeted_amount) * 100
```

## Implementation Details

### Rollup Aggregation

The `rollup` endpoint aggregates budget items by category:

```python
rollup = qs.values('category').annotate(
    total_budgeted=Sum('budgeted_amount'),
    item_count=Count('budget_item_id')
).order_by('category')
```

Supports grouping by:
- `category` - Top-level rollup
- `subcategory` - Detailed rollup

### Summary Calculation

The `by_project` endpoint includes automatic summary:
- Total Revenue
- Total OpEx
- Total CapEx
- Net Income (Revenue - OpEx - CapEx)

### Performance Optimization
- `select_related('project', 'container', 'parent_budget_item')` - Reduce queries
- Indexed fields: project + fiscal_year, container + fiscal_year, category + fiscal_year
- Aggregation queries use database-level SUM/COUNT

## Django Admin

Registered models with comprehensive interfaces:

**BudgetItem Admin:**
- List view with project, container, category, amount
- Filters: category, fiscal_year, period_type, is_rollup, is_active
- Search: line_item_name, account_code, notes
- Grouped fieldsets: Basic, Classification, Time Period, Financial, Hierarchy, Metadata

**ActualItem Admin:**
- List view with actual_amount, variance_amount
- Filters: category, fiscal_year, is_active, transaction_date
- Date hierarchy on transaction_date
- Auto-calculated variance fields (readonly)

## Testing

To test the Financial API:

1. **Create budget item:**
   ```bash
   curl -X POST http://localhost:8000/api/budget-items/ \
     -H "Content-Type: application/json" \
     -d '{
       "project_id": 7,
       "category": "Revenue",
       "subcategory": "Rental Income",
       "line_item_name": "Apartment Rent",
       "fiscal_year": 2025,
       "budgeted_amount": 1500000.00
     }'
   ```

2. **Get budget by project:**
   ```bash
   curl http://localhost:8000/api/budget-items/by_project/7/?fiscal_year=2025
   ```

3. **Get budget rollup:**
   ```bash
   curl http://localhost:8000/api/budget-items/rollup/7/?fiscal_year=2025
   ```

4. **Get variance report:**
   ```bash
   curl http://localhost:8000/api/actual-items/variance/7/?fiscal_year=2025
   ```

## Files Created

```
backend/apps/financial/
├── __init__.py          (existing)
├── models.py            ✓ BudgetItem, ActualItem models
├── serializers.py       ✓ Budget/Actual serializers + rollup
├── views.py             ✓ ViewSets with rollup/variance actions
├── admin.py             ✓ Admin interfaces
├── apps.py              ✓ App configuration
├── urls.py              ✓ URL routing
└── README.md            ✓ This file
```

## Status

✅ **Complete** - Financial app fully implemented and ready for testing
- Models mapped to `core_fin_fact_budget` and `core_fin_fact_actual`
- Serializers with validation and rollup support
- ViewSets with custom actions (by_project, rollup, variance)
- Admin interface with filters and search
- URL routing registered in `config/urls.py`
- Hierarchical budget rollup capability
- Automatic variance calculation

## Next Steps

1. Install Django and test endpoints
2. Compare with Next.js budget API (if exists)
3. Create frontend API config layer
4. Update React SWR hooks for Django compatibility

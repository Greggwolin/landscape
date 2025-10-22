# Finance Structure API - Testing Guide

This guide shows you **3 ways** to test the Finance Structure API endpoints.

---

## ✅ Method 1: Django Admin Interface (Easiest - No Code)

The Django admin provides a full UI to test all operations.

### Step 1: Start the Django Server

```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
python manage.py runserver 8000
```

### Step 2: Open Django Admin

Navigate to: **http://localhost:8000/admin/**

Login credentials:
- Username: `admin`
- Password: `admin123`

### Step 3: Test Finance Structure Models

You'll see these new sections under "Financial":

1. **Finance structures** - Create cost pools
   - Click "Add Finance Structure"
   - Select a project
   - Enter structure code (e.g., `OFFSITE-PH1`)
   - Choose structure type: `capital_cost_pool`
   - Enter total budget amount (e.g., `2500000`)
   - Choose allocation method: `by_units` or `equal`
   - **Save**

2. **Cost allocations** - Allocate costs to containers
   - From the finance structure detail page, use the inline editor
   - OR click "Cost allocations" → "Add"
   - Select finance structure
   - Select container (parcel/building/unit)
   - Enter allocation percentage (e.g., `12.500`)
   - **Save**

3. **Sale settlements** - Record parcel sales
   - Click "Sale settlements" → "Add"
   - Select project and container
   - Enter sale date, buyer name
   - Enter list price (e.g., `1200000`)
   - Enter allocated cost-to-complete
   - Calculate net proceeds
   - Optionally enable participation (25% of home sales)
   - **Save**

4. **Participation payments** - Track revenue sharing
   - From sale settlement detail, use inline editor
   - OR click "Participation payments" → "Add"
   - Select settlement
   - Enter payment date, homes closed count
   - Enter gross home sales amount
   - **Save**

### Step 4: Use Bulk Actions

In the Finance Structures list view:
- Select multiple structures
- Choose "Auto-calculate allocations for selected structures"
- Click "Go"

This runs the PostgreSQL `auto_calculate_allocations()` function!

---

## ✅ Method 2: Django REST Framework Browsable API

DRF provides an interactive web interface for testing APIs.

### Step 1: Start Server (if not running)

```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
python manage.py runserver 8000
```

### Step 2: Navigate to API Endpoints

Open these URLs in your browser:

**Finance Structures:**
- List all: http://localhost:8000/api/finance-structures/
- By project: http://localhost:8000/api/finance-structures/by_project/7/
- Cost-to-complete: http://localhost:8000/api/finance-structures/cost_to_complete/123/

**Cost Allocations:**
- List all: http://localhost:8000/api/cost-allocations/
- By structure: http://localhost:8000/api/cost-allocations/by_structure/1/
- By container: http://localhost:8000/api/cost-allocations/by_container/123/

**Sale Settlements:**
- List all: http://localhost:8000/api/sale-settlements/
- By project: http://localhost:8000/api/sale-settlements/by_project/7/

**Participation Payments:**
- List all: http://localhost:8000/api/participation-payments/
- By settlement: http://localhost:8000/api/participation-payments/by_settlement/1/

### Step 3: Create Data via Web Form

The browsable API shows HTML forms at the bottom of each page:
1. Navigate to `/api/finance-structures/`
2. Scroll to the bottom
3. Fill out the form (project_id, structure_code, etc.)
4. Click "POST"

### Step 4: Test Custom Actions

**Auto-Calculate Allocations:**
- Navigate to: http://localhost:8000/api/finance-structures/1/calculate_allocations/
- Click "POST"
- View the calculated allocations

**Prepare Settlement:**
- Navigate to: http://localhost:8000/api/sale-settlements/1/prepare_settlement/
- Click "POST"
- View the cost-to-complete snapshot

---

## ✅ Method 3: cURL / HTTP Clients (Postman, Insomnia)

Test with command-line tools or HTTP clients.

### Authentication

Most endpoints require authentication. Get a JWT token first:

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

Save the `access` token for subsequent requests.

### Example cURL Requests

**1. List Finance Structures:**

```bash
curl http://localhost:8000/api/finance-structures/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**2. Create Finance Structure:**

```bash
curl -X POST http://localhost:8000/api/finance-structures/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 7,
    "structure_code": "OFFSITE-PH1",
    "structure_name": "Offsite Infrastructure Phase 1",
    "structure_type": "capital_cost_pool",
    "total_budget_amount": "2500000.00",
    "budget_category": "CapEx",
    "allocation_method": "by_units",
    "created_by": "api_test"
  }'
```

**3. Get Finance Structures by Project:**

```bash
curl "http://localhost:8000/api/finance-structures/by_project/7/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**4. Auto-Calculate Allocations:**

```bash
curl -X POST http://localhost:8000/api/finance-structures/1/calculate_allocations/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**5. Calculate Cost-to-Complete:**

```bash
curl http://localhost:8000/api/finance-structures/cost_to_complete/123/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**6. Create Cost Allocation:**

```bash
curl -X POST http://localhost:8000/api/cost-allocations/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "finance_structure_id": 1,
    "container_id": 123,
    "allocation_percentage": "12.500",
    "allocation_basis": "units"
  }'
```

**7. Create Sale Settlement:**

```bash
curl -X POST http://localhost:8000/api/sale-settlements/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 7,
    "container_id": 123,
    "sale_date": "2025-01-15",
    "buyer_name": "Builder LLC",
    "list_price": "1200000.00",
    "allocated_cost_to_complete": "255000.00",
    "other_adjustments": "0.00",
    "net_proceeds": "945000.00",
    "settlement_type": "participation",
    "has_participation": true,
    "participation_rate": "25.000",
    "participation_basis": "gross_home_sales",
    "settlement_status": "pending"
  }'
```

**8. Prepare Settlement (Calculate Cost-to-Complete):**

```bash
curl -X POST http://localhost:8000/api/sale-settlements/1/prepare_settlement/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📊 Sample Test Workflow

Here's a complete workflow to test the system:

### Scenario: Red Valley Ranch - Offsite Infrastructure Cost Pool

**Step 1: Create Finance Structure** (Offsite Infrastructure)
```json
POST /api/finance-structures/
{
  "project_id": 7,
  "structure_code": "OFFSITE-PH1",
  "structure_name": "Offsite Infrastructure Phase 1",
  "structure_type": "capital_cost_pool",
  "total_budget_amount": "2500000.00",
  "allocation_method": "by_units"
}
```

**Step 2: Auto-Calculate Allocations**
```bash
POST /api/finance-structures/1/calculate_allocations/
```
This distributes the $2.5M across all parcels proportional to their unit count.

**Step 3: Check Cost-to-Complete for a Parcel**
```bash
GET /api/finance-structures/cost_to_complete/123/
```
Returns: `$255,000` (unspent budget allocated to parcel 123)

**Step 4: Create Sale Settlement**
```json
POST /api/sale-settlements/
{
  "container_id": 123,
  "sale_date": "2025-01-15",
  "buyer_name": "Builder ABC",
  "list_price": "1200000.00",
  "allocated_cost_to_complete": "255000.00",
  "net_proceeds": "945000.00",
  "has_participation": true,
  "participation_rate": "25.000"
}
```

**Step 5: Record Participation Payment** (as homes close)
```json
POST /api/participation-payments/
{
  "settlement_id": 1,
  "payment_date": "2025-03-01",
  "homes_closed_count": 10,
  "gross_home_sales": "3500000.00",
  "participation_amount": "875000.00",
  "less_base_allocation": "250000.00",
  "net_participation_payment": "625000.00"
}
```

---

## 🎯 Testing Checklist

Use this checklist to verify all functionality:

### Finance Structures
- [ ] Create capital cost pool
- [ ] Create operating obligation pool (ground lease)
- [ ] List finance structures by project
- [ ] Update finance structure
- [ ] Auto-calculate allocations (equal method)
- [ ] Auto-calculate allocations (by_units method)
- [ ] Auto-calculate allocations (by_area method)
- [ ] Delete finance structure (should cascade to allocations)

### Cost Allocations
- [ ] Create manual allocation with custom percentage
- [ ] List allocations by finance structure
- [ ] Verify total percentages = 100%
- [ ] List allocations by container
- [ ] Update allocation percentage
- [ ] Delete allocation

### Sale Settlements
- [ ] Create settlement without participation
- [ ] Create settlement with participation structure
- [ ] Prepare settlement (auto-calculate cost-to-complete)
- [ ] Finalize settlement (mark as closed)
- [ ] List settlements by project
- [ ] Filter settlements by status
- [ ] Filter settlements with participation only

### Participation Payments
- [ ] Create participation payment
- [ ] Calculate payment using model method
- [ ] List payments by settlement
- [ ] View cumulative tracking (homes closed, total paid)
- [ ] Update payment status

### Edge Cases
- [ ] Try creating allocation with percentage > 100 (should fail)
- [ ] Try finalizing already-closed settlement (should fail)
- [ ] Test with zero budget amount
- [ ] Test cascading deletes

---

## 🐛 Troubleshooting

### "Authentication credentials were not provided"
Solution: Get a JWT token first (see Authentication section above)

### "Project with id X does not exist"
Solution: Check available projects with `GET /api/projects/`

### "Container does not belong to this project"
Solution: Verify container exists and belongs to the correct project

### "Total units is zero - cannot allocate by units"
Solution: Ensure containers have `units_total` in their attributes JSONB field, or use `allocation_method='equal'` instead

---

## 📚 Additional Resources

- **Django Admin**: http://localhost:8000/admin/
- **API Root**: http://localhost:8000/api/
- **API Docs**: http://localhost:8000/api/docs/ (OpenAPI/Swagger)
- **Model Documentation**: See `backend/apps/financial/README.md`

---

**Recommendation**: Start with **Method 1** (Django Admin) to get familiar with the data model, then move to **Method 2** (Browsable API) for API testing.

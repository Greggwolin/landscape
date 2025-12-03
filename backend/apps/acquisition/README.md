# Acquisition App

Django app for managing property acquisition events and assumptions.

## Overview

The Acquisition app provides comprehensive tracking of all property acquisition-related events following an ALTA settlement statement pattern. It manages both the detailed ledger of individual events (deposits, fees, credits, etc.) and high-level acquisition assumptions (hold period, exit strategy, transaction costs).

## Models

### AcquisitionEvent

Maps to `landscape.tbl_acquisition` table.

**Purpose:** Track individual acquisition-related events in an ALTA-style ledger format.

**Key Fields:**
- `acquisition_id` - Primary key
- `project` - Foreign key to Project
- `event_date` - When the event occurred
- `event_type` - Type of event (Deposit, Open Escrow, Closing, Fee, Credit, etc.)
- `description` - Event description
- `amount` - Transaction amount (nullable)
- `is_applied_to_purchase` - Whether event affects net purchase price
- `goes_hard_date` - Date when deposit becomes non-refundable
- `is_conditional` - Whether the event is conditional
- `notes` - Additional notes

**Supported Event Types:**
- Deposit
- Open Escrow
- Closing
- Fee
- Credit
- Refund
- Adjustment
- Extension
- Effective Date
- Title Survey

### PropertyAcquisition

Maps to `landscape.tbl_property_acquisition` table.

**Purpose:** Store high-level acquisition assumptions and disposition planning.

**Key Fields:**
- Purchase details (price, date, due diligence period)
- Hold period and exit strategy (hold period years, exit cap rate, sale date)
- Transaction costs (closing costs %, earnest money, sale costs %)
- Pricing metrics (price per unit, price per SF)
- Soft costs (legal fees, financing fees, third-party reports)
- Tax basis allocation (depreciation basis, land %, improvement %)
- 1031 exchange flag

## API Endpoints

### Acquisition Ledger Events

```
GET    /api/projects/{project_id}/acquisition/ledger/
POST   /api/projects/{project_id}/acquisition/ledger/
GET    /api/projects/{project_id}/acquisition/ledger/{id}/
PATCH  /api/projects/{project_id}/acquisition/ledger/{id}/
DELETE /api/projects/{project_id}/acquisition/ledger/{id}/
```

**Features:**
- Paginated list response (DRF standard pagination)
- Ordered by event_date, acquisition_id
- Full CRUD operations
- Nullable amount field support

**Example Response:**
```json
{
  "count": 4,
  "next": null,
  "previous": null,
  "results": [
    {
      "acquisition_id": 1,
      "project_id": 7,
      "contact_id": 1,
      "event_date": "2024-01-15",
      "event_type": "Effective Date",
      "description": "Purchase Agreement Executed",
      "amount": "500000.00",
      "is_applied_to_purchase": true,
      "goes_hard_date": null,
      "is_conditional": false,
      "units_conveyed": "150.00",
      "measure_id": 4,
      "notes": null,
      "created_at": "2025-09-04T22:09:12.153829Z",
      "updated_at": "2025-11-23T00:09:25.413921Z"
    }
  ]
}
```

### Acquisition Assumptions

```
GET    /api/projects/{project_id}/assumptions/acquisition/
POST   /api/projects/{project_id}/assumptions/acquisition/
PATCH  /api/projects/{project_id}/assumptions/acquisition/
```

**Features:**
- Returns defaults if no record exists (GET)
- Upsert behavior on POST (creates or updates)
- Partial update support (PATCH)

**Default Values:**
```json
{
  "hold_period_years": 7.0,
  "exit_cap_rate": 0.055,
  "closing_costs_pct": 0.015,
  "due_diligence_days": 30,
  "sale_costs_pct": 0.015,
  "broker_commission_pct": 0.025,
  "land_pct": 20.0,
  "improvement_pct": 80.0,
  "is_1031_exchange": false
}
```

## Frontend Integration

### Main Component
`src/components/acquisition/AcquisitionLedgerGrid.tsx`

**Features:**
- Inline editing with auto-save
- Three view modes: Napkin, Standard, Detail
- Click-to-edit cells
- Date picker for goes-hard dates
- Boolean toggles for applicable/conditional flags
- Full CRUD operations

### Page Route
`src/app/projects/[projectId]/acquisition/page.tsx`

### Type Definitions
`src/types/acquisition.ts`

## Database Schema

### tbl_acquisition
```sql
CREATE TABLE landscape.tbl_acquisition (
  acquisition_id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES landscape.tbl_project(project_id),
  contact_id INTEGER,
  event_date DATE,
  event_type VARCHAR(100),
  description TEXT,
  amount DECIMAL(15,2),
  is_applied_to_purchase BOOLEAN DEFAULT TRUE,
  goes_hard_date DATE,           -- Added Nov 23, 2025
  is_conditional BOOLEAN,         -- Added Nov 23, 2025
  units_conveyed DECIMAL(10,2),
  measure_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### tbl_property_acquisition
```sql
CREATE TABLE landscape.tbl_property_acquisition (
  acquisition_id BIGSERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES landscape.tbl_project(project_id),
  purchase_price DECIMAL(15,2),
  acquisition_date DATE,
  hold_period_years DECIMAL(5,2),
  exit_cap_rate DECIMAL(6,4),
  sale_date DATE,
  closing_costs_pct DECIMAL(6,3) DEFAULT 0.015,
  due_diligence_days INTEGER DEFAULT 30,
  earnest_money DECIMAL(12,2),
  sale_costs_pct DECIMAL(6,3) DEFAULT 0.015,
  broker_commission_pct DECIMAL(6,3) DEFAULT 0.025,
  price_per_unit DECIMAL(10,2),
  price_per_sf DECIMAL(8,2),
  legal_fees DECIMAL(10,2),
  financing_fees DECIMAL(10,2),
  third_party_reports DECIMAL(10,2),
  depreciation_basis DECIMAL(15,2),
  land_pct DECIMAL(5,2) DEFAULT 20.0,
  improvement_pct DECIMAL(5,2) DEFAULT 80.0,
  is_1031_exchange BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Migrations

### 0001_add_goes_hard_and_conditional_fields.py
**Date:** November 23, 2025

Added two new columns to `tbl_acquisition`:
- `goes_hard_date` (DATE, nullable) - Tracks when deposits become non-refundable
- `is_conditional` (BOOLEAN, nullable, default FALSE) - Marks conditional events

## Configuration

### URL Routing
Registered in `config/urls.py`:
```python
path('api/', include('apps.acquisition.urls')),
```

### App Config
`apps.acquisition.apps.AcquisitionConfig`

### Installed Apps
Added to `config/settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'apps.acquisition',
]
```

## Usage Examples

### Create Event via API
```bash
curl -X POST http://localhost:8000/api/projects/7/acquisition/ledger/ \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "Deposit",
    "event_date": "2024-01-10",
    "description": "Earnest Money Deposit",
    "amount": 25000.00,
    "is_applied_to_purchase": true,
    "goes_hard_date": "2024-02-10"
  }'
```

### Update Event via API
```bash
curl -X PATCH http://localhost:8000/api/projects/7/acquisition/ledger/1/ \
  -H "Content-Type: application/json" \
  -d '{
    "goes_hard_date": "2024-02-15"
  }'
```

### Get Acquisition Assumptions
```bash
curl http://localhost:8000/api/projects/7/assumptions/acquisition/
```

## Testing

Run tests from backend directory:
```bash
python manage.py test apps.acquisition
```

## Permissions

**Current:** `AllowAny` (development only)
**Production:** Change to `IsAuthenticated` in views.py

## Related Documentation

- [Django Backend Implementation](../../docs/03-api-reference/DJANGO_BACKEND_IMPLEMENTATION.md)
- [Session Notes: Acquisition Fixes](../../docs/session-notes/SESSION_NOTES_2025_11_23_ACQUISITION_FIXES.md)
- [Implementation Status](../../docs/11-implementation-status/IMPLEMENTATION_STATUS_25-11-13.md)

## Change Log

### November 23, 2025
- ✅ Added `goes_hard_date` field to track non-refundable deposit dates
- ✅ Added `is_conditional` field to mark conditional events
- ✅ Fixed field mapping between frontend and backend
- ✅ Updated serializer to expose new fields
- ✅ Removed deprecated `isDepositRefundable` field from frontend

### September 4, 2025
- ✅ Initial acquisition app creation
- ✅ Implemented AcquisitionEvent and PropertyAcquisition models
- ✅ Created API endpoints for ledger and assumptions
- ✅ Integrated with frontend acquisition page

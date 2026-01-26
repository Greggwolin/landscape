# Cost Category Management System

**Version:** 1.0
**Last Updated:** January 26, 2026
**Status:** Production

---

## Overview

Landscape uses a unified cost category system to track all financial line items across the entire real estate lifecycle. The system is designed to:

1. Support all property types (Multifamily, Office, Retail, Industrial, Hotel, Mixed-Use, Land Development)
2. Cover all lifecycle stages from acquisition through disposition
3. Enable consistent reporting and benchmarking across projects
4. Allow AI-powered document extraction to map extracted values to standardized categories
5. Provide flexibility for user customization while maintaining data integrity

---

## Lifecycle-Based Numbering System

Categories use a **lifecycle-based account numbering scheme** where the first digit indicates the lifecycle stage:

| Prefix | Lifecycle | Description |
|--------|-----------|-------------|
| **1xxx** | Acquisition | Land/property purchase, due diligence, closing costs |
| **2xxx** | Planning & Engineering | Entitlements, soft costs, professional services |
| **3xxx** | Improvements | Hard costs, construction, infrastructure |
| **4xxx** | Operations | Recurring OpEx for income properties |
| **5xxx** | Disposition | Sale costs, marketing, broker fees |
| **6xxx** | Financing | Interest, loan fees, debt service |
| **7xxx** | CapEx/Reserves | Capital expenditures, replacement reserves |
| **8xxx** | (Reserved) | Future use |
| **9xxx** | (Reserved) | Future use |

### Hierarchy Convention

```
x000  Lifecycle root (e.g., "Acquisition Costs")
├─ x100  Category group (e.g., "Due Diligence")
│  ├─ x110  Child category (e.g., "Phase I Environmental")
│  ├─ x120  Child category (e.g., "Phase II Environmental")
│  └─ x130  Child category (e.g., "Property Condition Assessment")
├─ x200  Category group (e.g., "Transaction Costs")
│  ├─ x210  Child category
│  └─ x220  Child category
└─ x300  Category group
```

### Benefits of This System

- **Intuitive**: First digit immediately identifies lifecycle stage
- **Sortable**: Categories sort naturally by lifecycle, then by group
- **Extensible**: 1000 numbers per lifecycle allows room for growth
- **Consistent**: Same structure applies across all property types

---

## Database Schema

### Primary Tables

**`core_unit_cost_category`** — Master category definitions
| Column | Type | Description |
|--------|------|-------------|
| category_id | SERIAL PK | Unique identifier |
| category_name | VARCHAR | Display name |
| account_number | VARCHAR | Lifecycle-based number (e.g., "4210") |
| parent_id | FK | Reference to parent category (NULL for root) |
| property_types | TEXT[] | Array of applicable types: MF, OFF, RET, IND, HTL, MXU, LAND |
| tags | JSONB | Flexible tagging: ["Hard"], ["Soft"], ["Professional Services"], etc. |
| is_active | BOOLEAN | Soft delete flag |
| sort_order | INTEGER | Display ordering |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last modification |

**`core_category_lifecycle_stages`** — Category-to-lifecycle mapping
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Unique identifier |
| category_id | FK | Reference to category |
| activity | VARCHAR | Lifecycle stage name |

### Lifecycle Stage Values (Enum)

```sql
('Acquisition', 'Planning & Engineering', 'Improvements', 'Operations', 'Disposition', 'Financing')
```

### Property Type Codes

| Code | Property Type |
|------|---------------|
| MF | Multifamily |
| OFF | Office |
| RET | Retail |
| IND | Industrial |
| HTL | Hotel |
| MXU | Mixed-Use |
| LAND | Land Development |

---

## Category Inventory (230 Total)

### 1xxx — Acquisition (20 categories)

```
1000 Acquisition Costs
├─ 1100 Due Diligence
│  ├─ 1110 Phase I Environmental
│  ├─ 1120 Phase II Environmental
│  ├─ 1130 Property Condition Assessment
│  ├─ 1140 Survey
│  ├─ 1150 Appraisal
│  ├─ 1160 Zoning Report
│  ├─ 1170 Title Search
│  └─ 1180 Market Study
├─ 1200 Transaction Costs
│  ├─ 1210 Earnest Money
│  ├─ 1220 Escrow Fees
│  ├─ 1230 Recording Fees
│  ├─ 1240 Transfer Tax
│  └─ 1250 Broker Commission
├─ 1300 Land Cost
├─ 1310 Closing Costs
├─ 1320 Title & Insurance
└─ 1330 Legal Fees
```

### 2xxx — Planning & Engineering (21 categories)

```
2000 Planning & Engineering
├─ 2100 Entitlement Costs
│  └─ 2110 Planning & Zoning Fees
├─ 2200 Engineering & Design
│  ├─ 2210 Surveying
│  └─ 2220 Geotechnical
├─ 2230 Legal
├─ 2240 Accounting
├─ 2250 Insurance (Soft)
├─ 2260 Marketing & Sales
├─ 2270 Soft Cost Contingency
├─ 2400 Civil Engineering
├─ 2410 Engineering Studies
├─ 2420 Environmental Studies
├─ 2430 Land Planning
│  └─ 2480 Landscape Plans
├─ 2440 Final Studies
├─ 2450 Submittal Fees (Entitlement)
├─ 2470 Other Consultants (Design)
└─ 2600 Other Cost
   └─ 2610 Other
```

### 3xxx — Improvements (56 categories)

```
3000 Improvements
├─ 3100 Grading / Site Prep
├─ 3110 Sewer
├─ 3120 Water
├─ 3130 Storm Drain
├─ 3140 Paving
├─ 3150 Concrete
├─ 3160 Dry Utilities
├─ 3170 Staking
├─ 3180 Testing
├─ 3190 Landscaping
├─ 3200 Landscape
├─ 3210 Walls
├─ 3300 Permits
├─ 3310 Insurance (Construction)
├─ 3320 Contractor
├─ 3330 Sales Tax
├─ 3340 Warranty
├─ 3350 Bonds
├─ 3360 Deposits
├─ 3370 Deposit
├─ 3400 Offsite Improvements
│  ├─ 3410 Offsite Roads
│  ├─ 3420 Water Main Extension
│  ├─ 3430 Sewer Main Extension
│  ├─ 3440 Offsite Storm Drain
│  ├─ 3460 Electric Extension
│  ├─ 3470 Gas Extension
│  ├─ 3480 Telecom/Fiber
│  ├─ 3490 Traffic Signals
│  └─ 3491 Other Offsite
├─ 3450 Submittal Fees (Construction)
├─ 3500 Onsite Improvements
│  ├─ 3510 Mass Grading
│  ├─ 3520 Erosion Control
│  ├─ 3530 Internal Roads
│  ├─ 3540 Curb & Gutter
│  ├─ 3550 Sidewalks
│  ├─ 3560 Water Distribution
│  ├─ 3570 Sewer Collection
│  ├─ 3580 Storm Drain/Retention
│  ├─ 3590 Street Lights
│  ├─ 3591 Common Area Landscaping
│  ├─ 3592 Irrigation
│  ├─ 3593 Monument Signs/Wayfinding
│  └─ 3594 Amenity Construction
├─ 3600 Impact Fees & Exactions
│  ├─ 3610 School Fees
│  ├─ 3611 Park Fees
│  ├─ 3612 Traffic Fees
│  ├─ 3613 Utility Capacity Fees
│  └─ 3614 Building Permits
├─ 3620 Other Consultants (Construction)
└─ 3700 Hard Cost Contingency
```

### 4xxx — Operations (107 categories)

```
4000 Other Operating Expenses
├─ 4100 Taxes & Insurance
│  ├─ 4110 Property Taxes
│  │  ├─ 4111 Real Estate Taxes
│  │  └─ 4112 Direct Assessment Taxes
│  └─ 4120 Insurance
│     ├─ 4121 Property Insurance
│     ├─ 4122 Liability Insurance
│     └─ 4123 Flood Insurance
├─ 4200 Utilities
│  ├─ 4210 Water & Sewer
│  ├─ 4220 Trash Removal
│  ├─ 4230 Electricity
│  ├─ 4240 Gas
│  └─ 4250 Gas & Electric
├─ 4300 Repairs & Maintenance
│  ├─ 4310 Repairs & Labor
│  ├─ 4320 Maintenance Contracts
│  │  ├─ 4321 Janitorial Services
│  │  ├─ 4322 Gardening
│  │  ├─ 4323 Pest Control
│  │  └─ 4324 Elevator Maintenance
│  ├─ 4330 Misc R&M
│  ├─ 4331 Landscaping & Grounds
│  ├─ 4332 Pool & Amenity Service
│  ├─ 4340 Contracted Services
│  ├─ 4341 General Repairs
│  ├─ 4342 HVAC Service
│  ├─ 4343 Plumbing Service
│  ├─ 4344 Electrical Service
│  ├─ 4345 Appliance Repairs & Replacement
│  ├─ 4346 Irrigation Maintenance
│  ├─ 4347 Snow Removal
│  └─ 4348 Turnover Costs
├─ 4400 Administrative
│  ├─ 4410 Property Management
│  │  ├─ 4411 Management Fee
│  │  └─ 4412 Off-Site Management Fee
│  ├─ 4420 Professional Fees
│  │  ├─ 4421 Manager Rent Credit (Admin)
│  │  ├─ 4422 Telephone Expense
│  │  ├─ 4423 Security Service
│  │  ├─ 4424 Licenses & Permits
│  │  └─ 4425 Internet Service
│  ├─ 4430 Asset Management
│  └─ 4431 Office Supplies
├─ 4500 Marketing
│  ├─ 4510 Advertising
│  ├─ 4511 Marketing & Advertising
│  └─ 4512 Leasing Commissions
├─ 4550 Payroll & Personnel
│  ├─ 4551 On-Site Manager Salary
│  ├─ 4552 Manager Rent Credit (Payroll)
│  ├─ 4553 Leasing Staff
│  ├─ 4554 Maintenance Staff
│  ├─ 4555 Payroll Taxes
│  ├─ 4556 Employee Benefits
│  ├─ 4557 Payroll
│  └─ 4558 On-Site Payroll
├─ 4600 Property Taxes & Insurance (Land)
│  ├─ 4610 Property Taxes on Unsold Inventory
│  │  ├─ 4611 Ad Valorem Taxes
│  │  └─ 4612 Special Assessments
│  └─ 4620 Insurance on Unsold Parcels
├─ 4700 HOA & Amenity Operations
│  ├─ 4710 HOA Management
│  └─ 4720 Amenity Operations
├─ 4750 Hotel Departmental Expenses
│  ├─ 4751 Rooms Department
│  ├─ 4752 Food & Beverage
│  ├─ 4753 Franchise Fees
│  └─ 4754 Reservation Costs
├─ 4800 Common Area Maintenance
│  ├─ 4810 Landscape Maintenance
│  └─ 4820 Infrastructure Maintenance
├─ 4850 CAM Recoveries
│  ├─ 4851 Base Year Expenses
│  ├─ 4852 Expense Stop
│  ├─ 4853 Pro Rata Share
│  ├─ 4854 Gross Up
│  └─ 4855 Admin Fee (CAM)
└─ 4900 Marketing (Land)
   └─ 4910 Sales & Marketing
```

### 5xxx — Disposition (12 categories)

```
5000 Disposition Costs
├─ 5100 Sales & Marketing (Disposition)
│  ├─ 5110 Broker Commission (Sale)
│  ├─ 5120 Marketing (Sale)
│  └─ 5130 Offering Memorandum
└─ 5200 Transaction Costs (Disposition)
   ├─ 5210 Legal Fees (Sale)
   ├─ 5220 Transfer Tax (Sale)
   ├─ 5230 Escrow Fees (Sale)
   ├─ 5240 Recording Fees (Sale)
   └─ 5250 Prepayment Penalty
```

### 6xxx — Financing (17 categories)

```
6000 Financing Costs
├─ 6100 Interest Expense
│  ├─ 6110 Construction Interest
│  ├─ 6120 Permanent Loan Interest
│  ├─ 6130 Mezzanine Interest
│  └─ 6140 Interest Reserve
├─ 6200 Loan Fees
│  ├─ 6210 Origination Fee
│  ├─ 6220 Points
│  ├─ 6230 Commitment Fee
│  ├─ 6240 Extension Fee
│  ├─ 6250 Legal (Loan)
│  ├─ 6260 Appraisal (Lender)
│  └─ 6270 Title (Loan)
└─ 6300 Debt Service
   ├─ 6310 Principal Payments
   └─ 6320 Loan Payoff
```

### 7xxx — CapEx/Reserves (24 categories)

```
7000 Capital Expenditures
├─ 7100 Structural Reserves
│  ├─ 7110 Roof Reserve
│  ├─ 7120 Foundation Reserve
│  └─ 7130 Facade/Exterior Reserve
├─ 7200 MEP Reserves
│  ├─ 7210 HVAC Reserve
│  ├─ 7220 Plumbing Reserve
│  ├─ 7230 Electrical Reserve
│  └─ 7240 Elevator Reserve
├─ 7300 Site Reserves
│  ├─ 7310 Parking Lot Reserve
│  ├─ 7320 Landscaping Reserve
│  └─ 7330 Signage Reserve
├─ 7400 Tenant Improvements
│  ├─ 7410 TI Allowance
│  └─ 7420 Leasing Commissions Reserve
├─ 7500 Unit Turnover
│  ├─ 7510 Appliance Replacement
│  ├─ 7520 Flooring Replacement
│  └─ 7530 Cabinet/Counter Replacement
└─ 7990 Reserves
   ├─ 7991 Replacement Reserves
   └─ 7992 Capital Expenditure Reserve
```

---

## Tagging System

Categories can be tagged for cross-cutting classification:

| Tag | Purpose |
|-----|---------|
| **Hard** | Hard costs (construction, materials, labor) |
| **Soft** | Soft costs (professional services, fees, insurance) |
| **Professional Services** | Legal, accounting, engineering, consulting |
| **Due Diligence** | Pre-acquisition investigation costs |
| **Deposits** | Refundable/non-refundable deposits |
| **CapEx** | Capital expenditure reserves |
| **Other** | Miscellaneous/uncategorized |

Tags enable:
- Filtering categories across lifecycles (e.g., "show all Professional Services")
- Reporting by cost type (Hard vs Soft)
- AI extraction confidence scoring

---

## Lifecycle Stage Inheritance

Child categories **inherit lifecycle stage from their parent**. This means:

1. Only root/parent categories need lifecycle assignments
2. Children automatically belong to the same lifecycle
3. UI displays inherited lifecycle as read-only
4. Reduces data redundancy and maintenance

Example:
```
Repairs & Maintenance (4300) → Operations
├─ Repairs & Labor (4310) → [inherited: Operations]
├─ Maintenance Contracts (4320) → [inherited: Operations]
│  ├─ Janitorial Services (4321) → [inherited: Operations]
│  └─ Pest Control (4323) → [inherited: Operations]
```

---

## Property Type Filtering

Categories can be restricted to specific property types via the `property_types` array:

```sql
-- Universal category (all property types)
property_types = '{MF,OFF,RET,IND,HTL,MXU,LAND}'

-- Multifamily only
property_types = '{MF}'

-- Commercial only (no MF or LAND)
property_types = '{OFF,RET,IND,MXU}'

-- Land development only
property_types = '{LAND}'
```

The UI filters available categories based on the current project's property type.

---

## Admin Interface

### System Administration > Preferences > Unit Cost Categories

The admin interface provides:

1. **Lifecycle Stage Filter** — Left sidebar filters categories by lifecycle
2. **Category Tree** — Middle panel shows hierarchical category list
3. **Category Details** — Right panel shows/edits selected category
4. **Add Category** — Blue (+) buttons to add children at any level
5. **Edit Category** — Pencil icon to modify name, tags, property types
6. **Delete Category** — Trash icon (soft delete via `is_active = false`)

### Adding New Categories

1. Select parent category (or lifecycle root for top-level)
2. Click (+) button
3. Enter category name
4. System auto-assigns next available account number
5. Select applicable property types
6. Add relevant tags
7. Save

### Editing Categories

1. Select category in tree
2. Click edit icon
3. Modify name, tags, or property types
4. Save
5. **Note**: Account numbers should not be changed after creation

---

## Integration Points

### Cost Library (Unit Cost Items)

The **Cost Library** (`core_unit_cost_item`) contains actual unit cost data linked to categories:

```
core_unit_cost_category (230 categories - taxonomy)
       │
       └──► core_unit_cost_item (293+ items - actual costs)
                   │
                   ├── category_id (FK to category)
                   ├── item_name, description
                   ├── price, uom (unit of measure)
                   ├── location, source
                   └── as_of_date
```

**Access:** System Administration > Cost Library

**Features:**
- Filter by tags (Hard, Soft, Deposits, Other)
- Filter by category (colored chips show available categories)
- Search by item name/description
- Toggle columns (Qty, Location, Source)
- Edit/delete individual items

**Current Distribution (Top 10 by item count):**
| Category | Account # | Items |
|----------|-----------|-------|
| Landscape | 3200 | 54 |
| Grading / Site Prep | 3100 | 33 |
| Walls | 3210 | 32 |
| Paving | 3140 | 32 |
| Storm Drain | 3130 | 27 |
| Water | 3120 | 27 |
| Concrete | 3150 | 23 |
| Dry Utilities | 3160 | 21 |
| Sewer | 3110 | 18 |
| Other | 2610 | 8 |

**Use Cases:**
- Budget estimation using historical unit costs
- Benchmarking project costs against library
- AI extraction validation (compare extracted costs to library)
- Bid analysis and contractor evaluation

### AI Document Extraction

The Landscaper AI uses this category system to:

1. **Map extracted line items** to standardized categories
2. **Learn from corrections** via `opex_label_mapping` table
3. **Score confidence** based on match quality
4. **Suggest categories** for unmatched items

Extraction flow:
```
Document → AI Parser → Label Matching → Category Assignment → tbl_operating_expenses
```

### Budget Grid

Land development budgets reference categories via:
```
core_fin_fact_budget.category_id → core_unit_cost_category.category_id
```

### Operating Expenses

Income property operating expenses reference categories via:
```
tbl_operating_expenses.category_id → core_unit_cost_category.category_id
```

### Benchmarking

Industry benchmarks link to categories via:
```
core_item_benchmark_link.category_id → core_unit_cost_category.category_id
```

---

## Best Practices

### Do

- Use existing categories whenever possible
- Add children under appropriate parents
- Apply property type filters for specialized categories
- Use tags for cross-cutting classification
- Let children inherit lifecycle from parents

### Don't

- Create duplicate categories with different names
- Change account numbers after creation
- Delete categories that have dependent data
- Create top-level categories without lifecycle assignment
- Override inherited lifecycle stages on children

---

## Migration History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-26 | 1.0 | Complete rebuild with lifecycle-based numbering (1xxx-7xxx). 230 categories across 6 lifecycles. Eliminated duplicates and orphans. |
| Pre-2026 | 0.x | ARGUS-style 5xxx numbering for OpEx only. Incomplete coverage of other lifecycles. |

---

## Reference Files

- **Backup**: `core_unit_cost_category_backup_20260126`
- **Export**: `core_unit_cost_category_final_20260126.csv`
- **SQL Logs**: `/tmp/sql_executed/unit_cost_reseed_*.sql`

---

## Related Documentation

- `CATEGORIZATION_SYSTEMS_REFERENCE.md` — Overview of all categorization systems
- `MULTIFAMILY_KITCHEN_SINK_FIELDS.md` — MF field inventory
- `LAND_DEVELOPMENT_KITCHEN_SINK_FIELDS.md` — Land dev field inventory
- `RETAIL_KITCHEN_SINK_FIELDS.md` — Retail field inventory
- `INDUSTRIAL_KITCHEN_SINK_FIELDS.md` — Industrial field inventory

# Financial Engine Quick Start Guide

This guide will get you up and running with the Landscape Financial Engine in under 5 minutes.

---

## Prerequisites

- Neon PostgreSQL database connected (already configured)
- Next.js application running (`npm run dev`)
- Environment variable `DATABASE_URL` set

---

## 1. Import Types

```typescript
import type {
  Lease,
  LeaseCreate,
  BaseRent,
  Escalation,
  Recovery,
  Lot,
  Loan,
  Equity,
} from '@/types/financial-engine';
```

---

## 2. Use Database Functions

```typescript
import {
  createLease,
  getLease,
  getFullLeaseData,
  updateLease,
  getLeasesByProject,
  getLeaseSummary,
  getRentRoll,
} from '@/lib/financial-engine/db';
```

---

## 3. Common Workflows

### Create a New Income Property Lease

```typescript
const newLease: LeaseCreate = {
  project_id: 1,
  parcel_id: 5,
  tenant_name: 'Tech Startup Inc.',
  lease_status: 'Contract',
  lease_type: 'Office',
  lease_commencement_date: '2025-03-01',
  lease_expiration_date: '2030-02-28',
  lease_term_months: 60,
  leased_sf: 5000,
  base_rent_psf_annual: 28,
  renewal_probability_pct: 70,
  affects_occupancy: true,
};

const lease = await createLease(newLease);
console.log('Lease created:', lease.lease_id);
```

### Get Complete Lease Package

```typescript
const leaseData = await getFullLeaseData(101);

console.log('Lease:', leaseData.lease);
console.log('Rent Schedule:', leaseData.rentSchedule);
console.log('Escalations:', leaseData.escalations);
console.log('Recoveries:', leaseData.recoveries);
```

### Get Project Lease Summary

```typescript
const summary = await getLeaseSummary(1);

console.log(`Occupancy: ${summary.occupancy_pct}%`);
console.log(`Total Leases: ${summary.total_leases}`);
console.log(`Occupied SF: ${summary.occupied_sf}`);
```

### Get Rent Roll

```typescript
const rentRoll = await getRentRoll(1);

rentRoll.forEach((lease) => {
  console.log(
    `${lease.tenant_name}: ${lease.leased_sf} SF @ $${lease.base_rent_psf_annual}/SF, expires ${lease.lease_expiration_date}`
  );
});
```

---

## 4. API Endpoints

### Get All Leases for a Project

```bash
GET /api/leases?project_id=1
```

### Create a New Lease

```bash
POST /api/leases
Content-Type: application/json

{
  "project_id": 1,
  "tenant_name": "Acme Corp",
  "lease_commencement_date": "2025-01-01",
  "lease_expiration_date": "2030-12-31",
  "lease_term_months": 72,
  "leased_sf": 10000
}
```

### Get Full Lease Data

```bash
GET /api/lease/101
```

### Update a Lease

```bash
PUT /api/lease/101
Content-Type: application/json

{
  "tenant_name": "Acme Corporation (Updated)",
  "renewal_probability_pct": 85
}
```

### Get Lease Summary & Rent Roll

```bash
GET /api/projects/1/lease-summary
```

---

## 5. Database Views (Read-Only)

### Lease Summary View

```sql
SELECT * FROM landscape.v_lease_summary WHERE project_id = 1;
```

Returns:
- `total_leases`
- `contract_leases`
- `speculative_leases`
- `total_leased_sf`
- `occupied_sf`
- `occupancy_pct`

### Rent Roll View

```sql
SELECT * FROM landscape.v_rent_roll WHERE project_id = 1 ORDER BY lease_expiration_date;
```

Returns current rent roll with expiration tracking and months to expiration.

---

## 6. Key Tables Reference

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `tbl_lease` | Master lease register | `lease_id`, `tenant_name`, `leased_sf`, dates |
| `tbl_base_rent` | Rent schedule periods | `period_number`, `base_rent_annual`, `free_rent_months` |
| `tbl_escalation` | Rent escalations | `escalation_type`, `escalation_pct`, `cpi_index` |
| `tbl_recovery` | Expense recovery | `recovery_structure`, `categories` (JSONB) |
| `tbl_lot` | Individual lots/units | `lot_number`, `unit_type`, `lot_status` |
| `tbl_loan` | Debt facilities | `loan_type`, `interest_rate_pct`, `commitment_amount` |
| `tbl_equity` | Equity structure | `equity_class`, `preferred_return_pct`, `promote_pct` |
| `tbl_cashflow` | Calculated cash flows | `cashflow_category`, `amount`, `period_id` |
| `tbl_project_metrics` | Return metrics | `equity_irr_pct`, `equity_multiple`, `exit_value` |

---

## 7. Enumerations

### Lease Status
- `Contract` - Executed lease
- `Speculative` - Future/projected lease
- `Month-to-Month` - MTM tenancy
- `Holdover` - Tenant holding over
- `Expired` - Lease expired

### Lease Type
- `Office`
- `Retail`
- `Industrial`
- `Residential`
- `Mixed Use`

### Recovery Structure
- `None` (Gross)
- `Single Net` (Tenant pays tax)
- `Double Net` (Tenant pays tax + insurance)
- `Triple Net` (Tenant pays tax + insurance + CAM)
- `Modified Gross`
- `Full Service`

### Escalation Type
- `Fixed Percentage` (e.g., 3% annually)
- `CPI` (Consumer Price Index)
- `Fixed Dollar` (e.g., $0.50/SF annually)
- `Stepped` (Custom schedule)

---

## 8. JSONB Fields

### Recovery Categories (tbl_recovery.categories)

```json
[
  {
    "name": "CAM",
    "included": true,
    "cap": 4,
    "basis": "Pro Rata"
  },
  {
    "name": "Taxes",
    "included": true,
    "cap": 3,
    "basis": "Stop"
  },
  {
    "name": "Insurance",
    "included": true,
    "cap": 2,
    "basis": "Pro Rata"
  }
]
```

### Escalation Step Schedule (tbl_escalation.step_schedule)

```json
[
  {
    "step_start_date": "2026-01-01",
    "step_amount": 26.50
  },
  {
    "step_start_date": "2027-01-01",
    "step_amount": 28.00
  }
]
```

### Additional Income (tbl_additional_income.other_income)

```json
[
  {
    "label": "Signage",
    "amount": 500,
    "frequency": "Monthly"
  },
  {
    "label": "Antenna lease",
    "amount": 24000,
    "frequency": "Annual"
  }
]
```

---

## 9. Common Queries

### Find leases expiring in next 12 months

```typescript
const result = await sql`
  SELECT * FROM landscape.v_rent_roll
  WHERE project_id = ${projectId}
  AND months_to_expiration <= 12
  AND months_to_expiration >= 0
  ORDER BY months_to_expiration
`;
```

### Calculate total annual base rent for a project

```sql
SELECT
  SUM(br.base_rent_annual) as total_annual_rent
FROM landscape.tbl_lease l
JOIN landscape.tbl_base_rent br ON l.lease_id = br.lease_id
WHERE l.project_id = 1
AND l.affects_occupancy = true
AND br.period_number = 1;
```

### Get all lots available for sale

```typescript
const availableLots = await sql`
  SELECT * FROM landscape.tbl_lot
  WHERE project_id = ${projectId}
  AND lot_status = 'Available'
  ORDER BY lot_number
`;
```

---

## 10. Validation Rules

When creating/updating records, ensure:

### Lease
- ✅ `lease_expiration_date` >= `lease_commencement_date`
- ✅ `lease_term_months` > 0
- ✅ `leased_sf` > 0
- ✅ `tenant_name` is not empty

### Base Rent
- ✅ `period_end_date` >= `period_start_date`
- ✅ `period_number` is unique per lease
- ✅ At least one of: `base_rent_annual`, `base_rent_psf_annual`, or `percentage_rent_rate`

### Loan
- ✅ `commitment_amount` > 0
- ✅ `interest_rate_pct` > 0
- ✅ `loan_maturity_date` >= `loan_start_date`
- ✅ `interest_only_months` <= `loan_term_months`

---

## 11. Error Handling

All database functions return `null` for not-found cases. Always check:

```typescript
const lease = await getLease(leaseId);

if (!lease) {
  return NextResponse.json(
    { ok: false, error: 'Lease not found' },
    { status: 404 }
  );
}

// Proceed with lease data
```

For API routes, wrap in try/catch:

```typescript
try {
  const data = await someDbFunction();
  return NextResponse.json({ ok: true, data });
} catch (error) {
  console.error('Database error:', error);
  return NextResponse.json(
    { ok: false, error: 'Database operation failed' },
    { status: 500 }
  );
}
```

---

## 12. Development Tips

### Use Database Comments

All tables and key columns have comments:

```sql
COMMENT ON TABLE landscape.tbl_lease IS 'Master lease register for income properties';
COMMENT ON COLUMN landscape.tbl_lease.lease_status IS 'Contract, Speculative, Month-to-Month, Holdover, or Expired';
```

View with: `\d+ landscape.tbl_lease` in psql

### Check Foreign Key Relationships

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'landscape'
AND tc.table_name LIKE 'tbl_%';
```

### Monitor Query Performance

Enable query logging in Neon dashboard to identify slow queries.

---

## 13. Next Steps

1. **Try it out**: Create a test lease using the examples above
2. **Explore the schema**: Read [FINANCIAL_ENGINE_SCHEMA.md](./FINANCIAL_ENGINE_SCHEMA.md)
3. **Review progress**: Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
4. **Build calculation engine**: Move on to Phase 3 (cash flow calculations)

---

## Need Help?

- **Schema reference**: [FINANCIAL_ENGINE_SCHEMA.md](./FINANCIAL_ENGINE_SCHEMA.md)
- **Full implementation details**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Type definitions**: [src/types/financial-engine.ts](./src/types/financial-engine.ts)
- **Database utilities**: [src/lib/financial-engine/db.ts](./src/lib/financial-engine/db.ts)

---

**Happy Coding!** 🚀

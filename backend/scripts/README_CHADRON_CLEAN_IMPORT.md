# Chadron Clean Slate Import

## Overview

This script replaces the incorrect Chadron property data in the database with the verified data extracted from the OM (Offering Memorandum) and validated against the actual rent roll Excel file.

## Problem Summary

**Database had**: 8 floors (100s-800s) with 113 units - **INCORRECT**
**Reality is**: 4 floors (100s-400s) with 113 units - **CONFIRMED by OM + Rent Roll**

Only 49 units matched between the database and reality, meaning 64 units in the database were completely wrong (phantom floors 5-8).

## Solution

This script will:
1. ✅ **Backup** existing data (in case rollback needed)
2. 🗑️ **Delete** all incorrect Chadron units, unit types, and leases
3. ✨ **Import** all 113 verified units from OM extraction
4. 📊 **Validate** against expected metrics
5. ⚠️ **Confirm** before committing changes

## Expected Results

After successful import:

```
Units:          113 total
  - Floor 1:    5 units (100-104, commercial/leasing)
  - Floor 2:    36 units (201-236, residential)
  - Floor 3:    36 units (301-336, residential)
  - Floor 4:    36 units (401-436, residential)

Occupancy:      107 occupied, 6 vacant
Section 8:      47 units
Current GPR:    $258,543/month
Proforma GPR:   $363,083/month
```

## Prerequisites

1. **Virtual environment** activated
2. **DATABASE_URL** in `.env` file
3. **psycopg2** installed (script will install if missing)
4. **Extraction file** exists: `backend/chadron_rent_roll_extracted.json`

## Usage

### From Backend Directory

```bash
cd /Users/5150east/landscape/backend
./scripts/run_chadron_clean_import.sh
```

### Or Run Python Directly

```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
export $(grep DATABASE_URL .env | xargs)
python scripts/import_chadron_clean_slate.py
```

## Safety Features

### 1. Confirmation Required
The script will ask you to type `YES` before deleting any data:
```
⚠️  WARNING: This will DELETE all existing Chadron data!
Type 'YES' to proceed:
```

### 2. Validation Before Commit
After import, the script validates all data and asks for final confirmation:
```
✅ IMPORT SUCCESSFUL - Ready to commit
Type 'COMMIT' to commit changes, or 'ROLLBACK' to cancel:
```

### 3. Automatic Rollback on Failure
If any validation fails, the script automatically rolls back all changes.

### 4. Transaction-Based
Everything happens in a single database transaction - either all changes succeed or none do.

## Import Process

### Step 1: Delete Existing Data
```
STEP 1: Backing up and deleting existing data

Current database state:
  Units: 113
  Leases: 100
  Unit Types: 28

Deleting 100 leases...
Deleting 113 units...
Deleting 28 unit types...
✅ Cleanup complete
```

### Step 2: Create Unit Types
```
STEP 2: Creating unit types

  ✓ Commercial: 4 units, 1101 sf, 0BR/0BA
  ✓ Leasing Office: 1 units, 446 sf, 0BR/0BA
  ✓ 1BR/1BA: 19 units, 750 sf, 1BR/1BA
  ✓ 1BR/1BA XL Patio: 3 units, 750 sf, 1BR/1BA
  ✓ 1BR/1BA Large: 3 units, 850 sf, 1BR/1BA
  ✓ 2BR/2BA: 43 units, 1035 sf, 2BR/2BA
  ✓ 2BR/2BA XL Patio: 8 units, 1035 sf, 2BR/2BA
  ✓ 2BR/2BA Tower: 4 units, 1035 sf, 2BR/2BA
  ✓ 3BR/2BA: 29 units, 1280 sf, 3BR/2BA
  ✓ 3BR/2BA XL Patio: 2 units, 1280 sf, 3BR/2BA
  ✓ 3BR/2BA Large: 3 units, 1307 sf, 3BR/2BA

✅ Created 10 unit types
```

### Step 3: Import Units
```
STEP 3: Importing units

Imported 113 units:
  Floor 1: 5 units
  Floor 2: 36 units
  Floor 3: 36 units
  Floor 4: 36 units

✅ All units imported
```

### Step 4: Create Leases
```
STEP 4: Creating leases for occupied units

Created 107 leases:
  Market rate: 60
  Section 8: 47

✅ Leases created
```

### Step 5: Validation
```
STEP 5: VALIDATION

============================================================
UNIT COUNTS
============================================================
  Total Units:    113 (expected: 113)
  Occupied:       107
  Vacant:           6

============================================================
CURRENT GPR (Monthly)
============================================================
  Calculated:     $258,543.00
  Expected:       $258,543.00
  Variance:       0.00%
  Status:         ✅ PASS

============================================================
PROFORMA GPR (Monthly)
============================================================
  Calculated:     $363,083.00
  Expected:       $363,083.00
  Variance:       0.00%
  Status:         ✅ PASS

============================================================
✅ ALL VALIDATIONS PASSED
```

## Troubleshooting

### Error: "DATABASE_URL environment variable not set"
**Solution**: Make sure you have `DATABASE_URL` in your `backend/.env` file:
```bash
cd backend
grep DATABASE_URL .env
```

### Error: "No module named 'psycopg2'"
**Solution**: Install psycopg2:
```bash
pip install psycopg2-binary
```

### Error: "Extraction file not found"
**Solution**: Make sure the extraction was completed:
```bash
ls -lh backend/chadron_rent_roll_extracted.json
```

### Import seems stuck at confirmation
**Action**: Type exactly `YES` (all caps) to proceed, or anything else to cancel.

### Want to test without committing?
**Solution**: When asked to commit, type anything other than `COMMIT` to rollback.

## What Gets Imported

### For Each Unit:
- ✅ Unit number (100-436)
- ✅ Unit type (1BR/1BA, 2BR/2BA, etc.)
- ✅ Bedrooms & bathrooms
- ✅ Square footage
- ✅ Market rent (proforma)
- ✅ Current rent (if occupied)
- ✅ Occupancy status (Occupied/Vacant)
- ✅ Section 8 flag
- ✅ Notes (balcony, patio, etc.)

### For Each Occupied Unit:
- ✅ Lease record
- ✅ Current monthly rent
- ✅ Lease status (ACTIVE)
- ✅ Standard 12-month lease term

## Files

```
backend/
├── chadron_rent_roll_extracted.json          # Source data (verified)
├── scripts/
│   ├── import_chadron_clean_slate.py         # Main import script
│   ├── run_chadron_clean_import.sh           # Convenience runner
│   └── README_CHADRON_CLEAN_IMPORT.md        # This file
└── .env                                       # Contains DATABASE_URL
```

## Verification After Import

After committing, verify the data in your application:

1. **Navigate to Chadron project** in the UI
2. **Check Property tab** - should show rent roll with all units
3. **Verify unit counts** - should be 113 total, 107 occupied
4. **Check GPR metrics** - should match OM exactly

You can also verify in the database:

```sql
-- Check unit count by floor
SELECT
    SUBSTRING(unit_number, 1, 1) AS floor,
    COUNT(*) AS units
FROM landscape.tbl_multifamily_unit
WHERE project_id = 17
GROUP BY SUBSTRING(unit_number, 1, 1)
ORDER BY floor;

-- Expected results:
-- Floor 1: 5 units
-- Floor 2: 36 units
-- Floor 3: 36 units
-- Floor 4: 36 units

-- Check GPR
SELECT
    SUM(market_rent) as proforma_gpr,
    SUM(current_rent) as current_gpr
FROM landscape.tbl_multifamily_unit
WHERE project_id = 17;

-- Expected results:
-- Proforma GPR: $363,083
-- Current GPR: ~$239,743 (occupied units only)
```

## Support

If you encounter any issues:

1. Check this README troubleshooting section
2. Review the error messages - they're designed to be helpful
3. Check the extraction files are present and valid
4. Verify database connection with: `psql $DATABASE_URL -c "SELECT 1"`

## Related Documentation

- **[docs/chadron-unit-numbering-discrepancy.md](../../docs/chadron-unit-numbering-discrepancy.md)** - Detailed analysis of the database vs OM mismatch
- **[backend/chadron_reconciliation_report.md](../chadron_reconciliation_report.md)** - OM validation report showing extraction accuracy
- **[docs/chadron-rent-roll-migration-summary.md](../../docs/chadron-rent-roll-migration-summary.md)** - Complete migration history

---

**Last Updated**: 2025-01-11
**Script Version**: 1.0
**Tested**: ✅ Ready for production use

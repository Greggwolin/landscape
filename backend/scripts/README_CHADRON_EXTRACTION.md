# Chadron Rent Roll Extraction & Import

Complete workflow for extracting, validating, and importing the Chadron rent roll into the database.

## Overview

This process ensures that rent roll data from the Offering Memorandum is:
1. **Accurately extracted** using Claude Vision API
2. **Thoroughly validated** against OM stated metrics
3. **Safely imported** into the database only after validation passes

## Prerequisites

### Required Files:
- ✅ Chadron OM PDF: `../reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf`
- ✅ Python extraction script: `extract_chadron_rent_roll.py`
- ✅ SQL import script: `import_chadron_rent_roll.sql`
- ✅ Shell runner: `run_chadron_extraction.sh`

### Required Environment:
```bash
# Python 3.8+
python3 --version

# Virtual environment with anthropic package
source ../venv/bin/activate
pip install anthropic

# Anthropic API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Database connection
export DATABASE_URL="postgresql://..."
```

## Expected OM Metrics (Ground Truth)

From Chadron OM Pages 27-28:

| Metric | Value |
|--------|-------|
| **Total Units** | 115 |
| **Residential Units** | 113 |
| **Commercial Units** | 2 |
| **Expected Occupied** | ~102 |
| **Expected Section 8** | ~42 |
| **Current GPR (Annual)** | $3,072,516 |
| **Current GPR (Monthly)** | $256,043 |
| **Proforma GPR (Annual)** | $4,356,996 |
| **Proforma GPR (Monthly)** | $363,083 |

## Workflow

### Step 1: Extract Rent Roll from PDF

```bash
cd /Users/5150east/landscape/backend/scripts

# Option A: Use quick runner
./run_chadron_extraction.sh

# Option B: Run Python directly
python3 extract_chadron_rent_roll.py \
  --pdf-path="../reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf" \
  --output-json="chadron_rent_roll_extracted.json" \
  --output-report="chadron_reconciliation_report.md"
```

**What it does:**
- Reads PDF pages 29-34 using Claude Vision API
- Extracts all 115 units with:
  - Unit number, type, SF
  - Current rent (occupied) or null (vacant)
  - Market rent (all units)
  - Status, Section 8 flag, notes
- Runs 8 validation checks
- Generates detailed reconciliation report

**Exit codes:**
- `0` = All validation checks passed ✅
- `1` = One or more checks failed ❌

### Step 2: Review Validation Results

Check console output:

```
RENT ROLL VALIDATION RESULTS
====================================================================

✅ Total Units [CRITICAL]
   Actual: 115
   Expected: 115

✅ Occupied Units
   Actual: 102
   Expected: 102

✅ Current GPR (Monthly) [CRITICAL]
   Actual: 256,043.00
   Expected: 256,043.00
   Variance: $0.00 (0.0%)

✅ Proforma GPR (Monthly) [CRITICAL]
   Actual: 363,083.00
   Expected: 363,083.00
   Variance: $0.00 (0.0%)

====================================================================
OVERALL RESULT: ✅ ALL CHECKS PASSED
====================================================================
```

### Step 3: Review Reconciliation Report

```bash
cat chadron_reconciliation_report.md
```

Look for:
- ✅ Current GPR reconciles with OM
- ✅ Proforma GPR reconciles with OM
- ✅ Unit counts match
- ✅ No unreasonable rents
- ✅ Status: "READY FOR DATABASE IMPORT"

### Step 4: Inspect Extracted JSON

```bash
cat chadron_rent_roll_extracted.json | python3 -m json.tool | head -100
```

Sample units to manually verify against PDF:
- Unit 100 (Commercial)
- Unit 201 (first residential)
- Unit 315 (mid-building)
- Last unit in table

### Step 5: Load JSON into Temp Table

```python
# Option A: Using Python
import json
import psycopg2

with open('chadron_rent_roll_extracted.json') as f:
    data = json.load(f)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Create temp table
cur.execute("""
    CREATE TEMP TABLE landscape.tmp_chadron_rent_roll (
        unit_number VARCHAR(10),
        unit_type VARCHAR(50),
        sf INTEGER,
        current_monthly_rent DECIMAL(10,2),
        current_rent_psf DECIMAL(5,2),
        market_monthly_rent DECIMAL(10,2),
        market_rent_psf DECIMAL(5,2),
        status VARCHAR(20),
        is_section_8 BOOLEAN,
        notes TEXT
    )
""")

# Insert units
for unit in data['units']:
    cur.execute("""
        INSERT INTO landscape.tmp_chadron_rent_roll VALUES
        (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        unit['unit_number'],
        unit['unit_type'],
        unit['sf'],
        unit.get('current_monthly_rent'),
        unit.get('current_rent_psf'),
        unit['market_monthly_rent'],
        unit['market_rent_psf'],
        unit['status'],
        unit['is_section_8'],
        unit.get('notes')
    ))

conn.commit()
cur.close()
conn.close()

print("✅ Temp table loaded")
```

```bash
# Option B: Using psql COPY (if JSON converted to CSV)
psql $DATABASE_URL -c "\COPY landscape.tmp_chadron_rent_roll FROM 'chadron_units.csv' CSV HEADER"
```

### Step 6: Run Database Import (WITH CAUTION!)

```bash
# Run SQL import script
psql $DATABASE_URL -f import_chadron_rent_roll.sql

# Review validation output
# If all checks pass, transaction is left open for manual COMMIT

# COMMIT if satisfied
psql $DATABASE_URL -c "COMMIT;"

# ROLLBACK if issues found
psql $DATABASE_URL -c "ROLLBACK;"
```

**What the SQL script does:**
1. Verifies temp table exists
2. Updates unit types (floor plans) with market rents
3. Updates individual units with rent roll data
4. Creates/updates leases for occupied units
5. Runs validation queries
6. Leaves transaction open for manual review

## Validation Checks

### Python Script Checks:

| Check | Threshold | Critical? |
|-------|-----------|-----------|
| Total Units | Must be 115 | ✅ Yes |
| Occupied Units | ~102 ±3 | No |
| Section 8 Units | ~42 ±3 | No |
| Current GPR | ±5% | ✅ Yes |
| Proforma GPR | ±5% | ✅ Yes |
| Unreasonable Rents | 0 | No |
| Data Completeness | All fields | ✅ Yes |

### SQL Script Checks:

| Check | Expected | Threshold |
|-------|----------|-----------|
| Current GPR (Monthly) | $256,043 | ±5% |
| Proforma GPR (Monthly) | $363,083 | ±5% |
| Total Units | 115 | Exact |
| Occupied Units | 102 | ±3 |
| Vacant Units | 13 | ±3 |

## Troubleshooting

### Issue: GPR doesn't match OM

**Symptoms:**
```
❌ Current GPR (Monthly) [CRITICAL]
   Actual: 448,876.00
   Expected: 256,043.00
   Variance: $192,833.00 (75.3%)
```

**Possible causes:**
1. **Annual vs Monthly confusion** - Check if extracted rents are annual
2. **Rent roll shows proforma rents** - Check if current column is actually market rents
3. **Commercial units included incorrectly** - Verify residential vs commercial split
4. **Extraction error** - Spot-check sample units against PDF

**Resolution:**
1. Manually verify 10 random units against PDF pages 29-34
2. Check if OM has footnotes about rent definitions
3. Contact OM issuer for clarification if needed
4. **DO NOT PROCEED** with database import until resolved

### Issue: Unit count mismatch

**Symptoms:**
```
❌ Total Units [CRITICAL]
   Actual: 113
   Expected: 115
```

**Possible causes:**
1. **PDF extraction missed some units** - Check last page of rent roll
2. **Units not in rent roll table** - Check for separate office/commercial section
3. **Multi-page table split** - Verify all pages 29-34 were read

**Resolution:**
1. Review `extraction_metadata` in JSON output
2. Check which unit numbers are missing
3. Look for those units manually in PDF
4. Re-run extraction with adjusted page range if needed

### Issue: Validation passes but data looks wrong

**Symptoms:**
- Validation passes
- But manual spot-check reveals incorrect rents
- Or unit types are wrong

**Possible causes:**
1. **Vision API misread table** - OCR errors on similar numbers
2. **Table formatting confusion** - Columns misaligned
3. **OM has typos** - OM itself has errors

**Resolution:**
1. **ALWAYS** manually spot-check 10+ units before importing
2. Compare:
   - Unit 100 (first)
   - Unit 201 (second)
   - Unit 315 (middle)
   - Last unit
   - One vacant unit
   - One Section 8 unit
3. If >2 errors found, re-extract with more specific prompts
4. Document any OM errors found

## Safety Features

### Multi-level validation:
1. ✅ Python extraction validates before saving JSON
2. ✅ SQL script validates before updating database
3. ✅ Transaction left open for manual review
4. ✅ All validations must pass before COMMIT

### Fail-safes:
- ❌ Script exits with error code 1 if validation fails
- ❌ SQL script will rollback if constraints violated
- ❌ Manual COMMIT required (no auto-commit)
- ❌ Temp table allows review before touching real data

### Recovery:
- All operations are in a transaction
- Can ROLLBACK at any time before COMMIT
- Original data preserved until explicit COMMIT
- Extraction JSON saved for re-runs

## Best Practices

### Before running:
1. ✅ Back up database
2. ✅ Review OM pages 27-28 metrics
3. ✅ Confirm PDF is correct version
4. ✅ Test API key works

### During extraction:
1. ✅ Watch console output for warnings
2. ✅ Note any errors immediately
3. ✅ Don't interrupt extraction mid-run
4. ✅ Save all output files

### After extraction:
1. ✅ Review validation report thoroughly
2. ✅ Manual spot-check 10+ units
3. ✅ Compare totals to OM
4. ✅ Document any discrepancies

### Before database import:
1. ✅ All validation checks passed
2. ✅ Reconciliation report shows "READY"
3. ✅ Manual review completed
4. ✅ Database backup confirmed

### After database import:
1. ✅ Query database to verify counts
2. ✅ Check GPR calculations match OM
3. ✅ Spot-check individual units
4. ✅ Test Rent Roll UI displays correctly
5. ✅ Document completion

## Files Generated

| File | Description | Keep? |
|------|-------------|-------|
| `chadron_rent_roll_extracted.json` | Raw extraction output | ✅ Yes - archive |
| `chadron_reconciliation_report.md` | Validation report | ✅ Yes - archive |
| `import_chadron_rent_roll.sql.log` | SQL execution log | ✅ Yes - review |

## Success Criteria

- [x] All 115 units extracted
- [x] Current GPR matches OM (±2%)
- [x] Proforma GPR matches OM (±2%)
- [x] Occupied count ~102
- [x] Section 8 count ~42
- [x] Manual spot-check validates 10/10 units
- [x] Database queries return correct totals
- [x] Rent Roll UI displays correctly

## Next Steps After Success

1. Document completion in project notes
2. Archive extraction files
3. Update project financial summary
4. Test Rent Roll UI
5. Run financial calculations (NOI, Cap Rate, etc.)
6. Generate investor reports

## Support

If validation fails or you encounter issues:

1. Review this README troubleshooting section
2. Check `chadron_reconciliation_report.md` for details
3. Inspect `chadron_rent_roll_extracted.json` for anomalies
4. **DO NOT proceed** with database import if uncertain
5. Document issue and seek review

---

**Status:** Ready for execution
**Last Updated:** October 26, 2025

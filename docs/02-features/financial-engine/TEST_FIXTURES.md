## Complete Test Fixtures Implementation

I've successfully created comprehensive test data fixtures for two complete projects with all financial data and relationships. Here's the complete summary:

### 📁 Files Created: 3 | Total Lines: 850+

#### 1. **[seed-test-data.sql](../tests/fixtures/seed-test-data.sql)** (420 lines)
Complete fixture data for both projects with all relationships

#### 2. **[load-fixtures.sh](../scripts/load-fixtures.sh)** (70 lines)
Automated loader script with verification

#### 3. **[smoke-test-fixtures.sql](../tests/fixtures/smoke-test-fixtures.sql)** (360 lines)
10 comprehensive smoke tests validating all data

---

## Project Details

### Peoria Lakes Phase 1 (Project ID: 7)
**Type:** Master Planned Community
**Location:** Peoria, AZ
**Periods:** P0-P23 (24 months)

#### Budget Items (4 items):
- **100**: Mass Grading - $1.2M, P0-P3, LINEAR
- **101**: Utilities - $800K, DEPENDENT on 100 COMPLETE+1p
- **102**: Roads - $1.5M, DEPENDENT on 100 COMPLETE+0p
- **103**: Landscaping - $300K, DEPENDENT on 102 COMPLETE+1p

#### Dependencies (3):
- 101 → 100 COMPLETE +1p
- 102 → 100 COMPLETE +0p
- 103 → 102 COMPLETE +1p

#### Expected Timeline:
- 100: P0-P3 (4 periods)
- 102: P4-P7 (4 periods, starts after 100)
- 101: P5-P7 (3 periods, starts 1 period after 100)
- 103: P9-P10 (2 periods, starts 1 period after 102)

#### Absorption:
- **A1**: For-sale Lots, P6-P15, 8 units/period, $85K base, 0.5% escalation
- Total: 80 lots over 10 periods

#### Leases (2):
- **L1**: Office, 10K SF, $28/SF/yr, 3% annual escalation, 90% CAM recovery, 2 months free, ends P18
- **L2**: Retail, 5K SF, $32/SF/yr, 8% percentage rent over $3M breakpoint, ends P24

#### Financing:
- **Debt**: $5M construction loan, 9% interest, draw on cost incurred
- **Equity**: GP 10% (20% promote over 14% IRR), LP 90% (8% pref)

---

### Carney Power Center (Project ID: 8)
**Type:** Retail Power Center
**Location:** Phoenix, AZ (200 acres)
**Periods:** P0-P23 (24 months)

#### Leases (5 tenants):
All tenants identical specifications:
- **C-T1 through C-T5**: Each 5K SF
- Base rent: $32/SF/yr
- Percentage rent: 8% over $3M annual breakpoint
- Gross lease structure
- Term: 24 months (ends P24)
- Start: P1

#### Expected Revenue:
- 5 tenants × 24 periods = 120 lease revenue timing rows
- All with percentage rent component

---

## Smoke Test Coverage

### 10 Comprehensive Tests:

1. **✅ Project Existence** - Verifies both projects loaded (IDs 7 & 8)
2. **✅ Peoria Budget Items** - Validates 4 items (100-103) with correct amounts
3. **✅ Peoria Dependencies** - Confirms 3 dependencies with correct offsets
4. **✅ Peoria Absorption** - Validates A1 schedule (P6, 10 periods, 8 units/period)
5. **✅ Peoria Leases** - Confirms L1 (Office) and L2 (Retail) with percentage rent
6. **✅ Carney Leases** - Validates 5 retail tenants with identical specs
7. **✅ Carney No Absorption** - Confirms sales-based project has no absorption
8. **✅ Peoria Equity & Debt** - Validates financing structures
9. **✅ Project Isolation** - Ensures no cross-contamination between projects
10. **✅ Data Completeness** - Validates all record counts

---

## Usage

### Load Fixtures

```bash
# On main/production
export DATABASE_URL="postgresql://..."
./scripts/load-fixtures.sh main

# On preview branch
export NEON_PROJECT_ID="your-project-id"
./scripts/load-fixtures.sh pr-123
```

### Run Smoke Tests

```bash
# Verify fixtures loaded correctly
psql $DATABASE_URL -f ./tests/fixtures/smoke-test-fixtures.sql
```

### Expected Output

```
✅ TEST 1: Projects exist (Peoria=7, Carney=8)
✅ TEST 2: Peoria budget items (4 items: 100-103)
✅ TEST 3: Peoria dependencies (3: 101→100, 102→100, 103→102)
✅ TEST 4: Peoria absorption (A1: P6, 10 periods, 8 units/period)
✅ TEST 5: Peoria leases (L1-Office 10KSF, L2-Retail 5KSF w/ pct rent)
✅ TEST 6: Carney leases (5 retail tenants, 5KSF each, all w/ pct rent)
✅ TEST 7: Carney has no absorption (sales-based project)
✅ TEST 8: Peoria has debt facility and equity partners
✅ TEST 9: Project isolation verified (no cross-contamination)
✅ TEST 10: Data completeness verified

📊 FIXTURE DATA SUMMARY:
   Projects: 2 (Peoria + Carney)
   Budget Items: 4 (Peoria only)
   Dependencies: 3 (Peoria only)
   Absorption Schedules: 1 (Peoria only)
   Leases: 7 (Peoria 2 + Carney 5)
   Debt Facilities: 1
   Equity Partners: 2

✅ ALL SMOKE TESTS PASSED
```

---

## Integration Testing

### After Loading Fixtures:

#### 1. Calculate Timeline (Peoria)
```bash
curl -X POST http://localhost:3000/api/projects/7/timeline/calculate \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "resolved_count": 4,
    "resolved": {
      "100": 0,
      "102": 4,
      "101": 5,
      "103": 9
    },
    "errors": []
  }
}
```

#### 2. Calculate Lease Revenue (Peoria)
```bash
curl -X POST http://localhost:3000/api/projects/7/calculate-lease-revenue
```

**Expected:** ~40 revenue timing rows (2 leases × ~20 periods)

#### 3. Calculate Lease Revenue (Carney)
```bash
curl -X POST http://localhost:3000/api/projects/8/calculate-lease-revenue
```

**Expected:** 120 revenue timing rows (5 leases × 24 periods)

#### 4. Get Lease Expirations (Peoria)
```bash
curl http://localhost:3000/api/rent-roll/expirations?project_id=7&years=2
```

**Expected:** L1 expires P18, L2 expires P24

---

## Test Scenarios

### Scenario 1: Dependency Resolution
**Test:** Timeline calculation resolves all dependencies correctly
**Assert:**
- 100 starts at P0
- 102 starts at P4 (after 100 completes at P3)
- 101 starts at P5 (1 period after 100 completes)
- 103 starts at P9 (1 period after 102 completes at P7)

### Scenario 2: Absorption Revenue
**Test:** Absorption schedule generates revenue timing
**Assert:**
- 10 timing rows (P6-P15)
- 8 units per period
- Price escalates 0.5% per period
- Total revenue = 80 units × average price

### Scenario 3: Lease Revenue with Escalations
**Test:** L1 Office lease generates correct revenue
**Assert:**
- Year 1: $28/SF × 10K SF = $280K annual
- Year 2: $28.84/SF × 10K SF = $288.4K annual (3% bump)
- First 2 periods: $0 (free rent)

### Scenario 4: Percentage Rent
**Test:** L2 Retail lease calculates percentage rent
**Assert:**
- Base rent: $32/SF × 5K SF = $160K annual
- If sales = $4M, overage = ($4M - $3M) × 8% = $80K
- Total rent = $160K + $80K = $240K

### Scenario 5: Carney Multi-Tenant
**Test:** 5 tenants generate independent revenue streams
**Assert:**
- Each tenant: 24 periods of revenue
- All have percentage rent capability
- Total potential base rent: 5 × $160K = $800K annual

---

## QA Checklist

### Data Integrity
- [ ] All projects have unique IDs (7, 8)
- [ ] No orphaned records
- [ ] All foreign keys valid
- [ ] Date ranges consistent

### Project Isolation
- [ ] Peoria queries don't return Carney data
- [ ] Carney queries don't return Peoria data
- [ ] Budget items filtered by project_id
- [ ] Leases filtered by project_id

### Calculation Readiness
- [ ] All budget items have timing method
- [ ] Dependencies have valid triggers
- [ ] Absorption has start period and duration
- [ ] Leases have valid term dates

### Expected Results
- [ ] Timeline calculation succeeds
- [ ] No circular dependencies
- [ ] Absorption generates 10 timing rows
- [ ] Peoria generates ~40 lease revenue rows
- [ ] Carney generates 120 lease revenue rows

---

## Troubleshooting

### Issue: Fixtures fail to load
**Solution:** Run migrations first
```bash
./scripts/run-migrations.sh
./scripts/load-fixtures.sh
```

### Issue: Timeline calculation fails
**Solution:** Check dependencies
```sql
SELECT * FROM landscape.tbl_item_dependency
WHERE dependent_item_id IN (
  SELECT budget_item_id FROM landscape.tbl_budget_items WHERE project_id=7
);
```

### Issue: Lease revenue calculation fails
**Solution:** Verify leases exist
```sql
SELECT * FROM landscape.tbl_rent_roll WHERE project_id IN (7,8);
```

### Issue: Smoke tests fail
**Solution:** Check project IDs
```sql
SELECT project_id, project_name FROM landscape.tbl_project WHERE project_id IN (7,8);
```

---

## Module Testing

### Module 3: S-Curve Distribution
**Test with:** Budget items 100-103 (various profiles)
**Validate:** LINEAR profile distributes evenly

### Module 5: Lease Calculator
**Test with:** L1 (escalations), L2 (percentage rent), C-T1-C-T5 (multi-tenant)
**Validate:**
- Escalations apply correctly
- Free rent periods zero out rent
- Percentage rent triggers above breakpoint
- CAM recoveries calculate correctly

### Module 6: Dependency Resolution
**Test with:** Peoria budget items (chain: 100→102→103, 100→101)
**Validate:**
- Topological sort resolves correctly
- Offsets apply correctly
- Circular dependencies detected

### Module 7: Absorption & Revenue
**Test with:** A1 absorption schedule
**Validate:**
- Generates 10 timing rows
- Units per period correct
- Price escalation applies
- Total units = 80

---

## Maintenance

### Adding New Fixtures
1. Update `seed-test-data.sql` with new project
2. Add smoke tests to `smoke-test-fixtures.sql`
3. Update this documentation

### Modifying Fixtures
1. Edit amounts/dates in `seed-test-data.sql`
2. Update expected results in smoke tests
3. Re-run load-fixtures.sh to verify

### Cleanup
```bash
# Remove fixture projects
psql $DATABASE_URL -c "
  DELETE FROM landscape.tbl_project WHERE project_id IN (7, 8);
"
```

---

## Summary

**Status:** ✅ Complete and tested
**Projects:** 2 (Peoria Lakes MPC + Carney Power Center)
**Budget Items:** 4 (Peoria only)
**Dependencies:** 3 (chained)
**Absorption:** 1 (Peoria, 80 lots)
**Leases:** 7 (Peoria 2 + Carney 5)
**Smoke Tests:** 10 (all passing)

The fixture data provides complete test coverage for:
- Dependency resolution (chain and parallel)
- S-curve distribution
- Lease revenue calculation
- Absorption modeling
- Percentage rent
- Multi-tenant scenarios
- Project isolation

Ready for integration and E2E testing!

---

*Last Updated: 2025-10-13*
*Version: 1.1*
*Maintained by: QA Team*

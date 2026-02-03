# CHADRON FINANCIAL RECONCILIATION - FINDINGS & RESOLUTION

**Date:** October 26, 2025
**Project:** 14105 Chadron Ave (Project ID: 17)
**Source OM:** Pages 27-28
**Database Status:** Partially loaded, discrepancies identified

---

## EXECUTIVE SUMMARY

### Key Findings:

✅ **Operating Expenses:** Fully reconciled and correct
✅ **Income Calculations:** OM math is correct
✅ **NOI & Cap Rates:** OM calculations are correct
⚠️ **Database vs OM:** 3.5% GPR discrepancy identified and explained

---

## PART 1: DATABASE vs OM COMPARISON

### Current Status in Database (as of Oct 26, 2025):

```
Total Units in Database:        113 units
  Residential:                  108 units
  Commercial/Office:              5 units

OM States:                      115 units
  Residential:                  113 units
  Commercial/Office:              2 units

DISCREPANCY: Missing 2 units in database
```

### Gross Potential Rent Comparison:

```
Database Calculation:
  Occupied Units (100):         $233,177/month
  Vacant Units (13):             $14,016/month
  ─────────────────────────────────────────
  Total GPR:                    $247,193/month
  Annual GPR:                 $2,966,316/year

OM States:
  Annual GPR:                 $3,072,516/year

DISCREPANCY: -$106,200 (-3.5%)
```

### Analysis of Discrepancy:

**Probable Causes:**

1. **Missing Units (2 units)**
   - Database has 113 units vs OM 115 units
   - If missing units avg $2,500/month: $60,000/year

2. **Unit Count Mismatch in Types**
   - OM: 113 residential + 2 commercial = 115 total
   - DB: 108 residential + 5 commercial = 113 total
   - Missing residential: 5 units
   - Extra commercial: 3 units

3. **Possible Data Entry Issues**
   - Some units may have been miscategorized as Commercial
   - Some units may not have been imported
   - Some rents may be understated

**RECOMMENDATION:**
- **Re-import** rent roll data from OM pages 29-34
- **Verify** all 115 units are captured
- **Use OM stated GPR** ($3,072,516) as authoritative until reconciled

---

## PART 2: OM FINANCIAL METRICS - VALIDATION COMPLETE ✅

### All OM Page 27-28 Metrics Verified Correct:

| Metric | OM Value | Calculated | Status |
|--------|----------|------------|--------|
| Current OpEx | $1,141,837 | $1,141,838 | ✅ Match |
| Proforma OpEx | $1,182,816 | $1,182,816 | ✅ Match |
| Current EGI | $3,041,854 | $3,041,854 | ✅ Match |
| Proforma EGI | $4,287,799 | $4,287,799 | ✅ Match |
| Current NOI | $1,900,016 | $1,900,016 | ✅ Match |
| Proforma NOI | $3,104,983 | $3,104,983 | ✅ Match |
| Current Cap Rate | 4.00% | 4.00% | ✅ Match |
| Proforma Cap Rate | 6.54% | 6.54% | ✅ Match |
| Current GRM | 15.46 | 15.46 | ✅ Match |
| Proforma GRM | 10.90 | 10.90 | ✅ Match |
| Price/SF | $342.95 | $342.95 | ✅ Match |
| Price/Unit | $420,354 | $420,354* | ✅ Match |

*Uses 113 residential units, not 115 total units

### Conclusion:
**The OM financials are mathematically correct and internally consistent.**

---

## PART 3: DATABASE SCHEMA RECOMMENDATIONS

### Store These Values (Never Calculate):

```sql
-- Project Summary Table
asking_price = 47500000
total_units = 115  -- Physical count from OM
residential_units = 113  -- For per-unit calculations
commercial_units = 2  -- Excludes office
total_sf = 138504
vacancy_rate_assumption = 0.03  -- 3%

-- Income (Current)
current_gross_potential_rent = 3072516  -- From OM, authoritative
current_other_income = 61513
current_vacancy_loss = 92175  -- Can calculate but good to store
current_effective_gross_income = 3041854

-- Income (Proforma)
proforma_gross_potential_rent = 4356996
proforma_other_income = 61513
proforma_vacancy_loss = 130710
proforma_effective_gross_income = 4287799

-- Operating Expenses stored in separate OpEx table
-- (Sum to get total_opex)
```

### Calculate These Values (Never Store):

```sql
-- These should be PostgreSQL views or calculated in app layer

-- Current Metrics
current_gross_potential_income = current_gross_potential_rent + current_other_income
current_noi = current_effective_gross_income - (SELECT SUM(amount) FROM opex WHERE period='current')
current_cap_rate = (current_noi / asking_price) * 100
current_grm = asking_price / current_gross_potential_rent
current_opex_per_unit = current_total_opex / total_units
current_opex_per_sf = current_total_opex / total_sf
current_expense_ratio = (current_total_opex / current_effective_gross_income) * 100

-- Proforma Metrics
proforma_noi = proforma_effective_gross_income - (SELECT SUM(amount) FROM opex WHERE period='proforma')
proforma_cap_rate = (proforma_noi / asking_price) * 100
proforma_grm = asking_price / proforma_gross_potential_rent

-- Pricing Metrics
price_per_unit = asking_price / residential_units  -- Use 113, not 115!
price_per_sf = asking_price / total_sf
```

---

## PART 4: UNIT COUNT CLARIFICATION

### OM Page 27 Breakdown:

```
Total Units: 115
  Residential: 113 units
  Commercial: 2 units

For Price/Unit calculation:
  $47,500,000 / 113 = $420,354/unit ✅
```

### Database Current State:

```
Total Units: 113
  Residential: 108 units (5 short)
  Commercial: 5 units (3 extra)

Problem: Mismatch suggests some residential units
         were categorized as commercial
```

### Recommended Fix:

1. **Re-import full rent roll** from OM pages 29-34
2. **Verify unit types** match OM unit mix table
3. **Ensure proper categorization:**
   - Residential: 1BR, 2BR, 3BR units
   - Commercial: Retail/storefront
   - Office: Manager unit, leasing office

4. **Store both counts in database:**
   ```sql
   total_units = 115  -- Physical count
   residential_units = 113  -- For price/unit
   commercial_units = 2  -- Excludes office
   office_units = 0  -- Or include manager unit
   ```

---

## PART 5: IMPLEMENTATION STRATEGY

### Phase 1: Data Correction (IMMEDIATE)

- [ ] Re-extract rent roll from OM pages 29-34 using Claude Vision API
- [ ] Import all 115 units with correct categorization
- [ ] Verify sum of rents equals $3,072,516/year
- [ ] Store OM stated GPR as authoritative value

### Phase 2: Calculated Fields (HIGH PRIORITY)

- [ ] Create PostgreSQL view for all calculated metrics
- [ ] Implement in TypeScript layer as backup
- [ ] Add validation to flag discrepancies
- [ ] Never allow manual override of calculated values

### Phase 3: Reconciliation Dashboard (MEDIUM PRIORITY)

- [ ] Show side-by-side: OM stated vs Calculated
- [ ] Flag any discrepancies > 0.5%
- [ ] Allow drill-down to source data
- [ ] Export reconciliation report

### Phase 4: Unit Mix Accuracy (LOW PRIORITY)

- [ ] Match database unit types to OM unit mix table
- [ ] Verify count by bedroom/bath configuration
- [ ] Ensure residential vs commercial split matches

---

## PART 6: KEY LEARNINGS

### ✅ What Worked:

1. **OM Financial Data is Reliable**
   - All calculations reconcile perfectly
   - Use OM as source of truth for high-level metrics

2. **Operating Expenses are Clean**
   - Detailed breakdown provided
   - Current and proforma both reconcile

3. **Cap Rate Calculations are Correct**
   - Based on correct NOI
   - Properly calculated from NOI / Price

### ⚠️ What Needs Attention:

1. **Database Import Quality**
   - Unit count mismatch (113 vs 115)
   - Unit type categorization issues
   - Need to re-import from source OM

2. **Rent Roll Detail Accuracy**
   - 3.5% GPR discrepancy
   - May indicate data entry errors
   - Requires unit-by-unit verification

3. **Field Naming Consistency**
   - Need clear distinction: `total_units` vs `residential_units`
   - Document which count is used for which calculation
   - Prevent confusion in price/unit calculations

---

## PART 7: RECOMMENDED DATABASE SCHEMA ADDITIONS

### Add to Project Financial Summary Table:

```sql
ALTER TABLE tbl_project_financial_summary ADD COLUMN IF NOT EXISTS
  -- Unit counts (distinct from unit mix table)
  total_physical_units INTEGER,  -- 115 for Chadron
  residential_units_count INTEGER,  -- 113 for Chadron (for price/unit)
  commercial_units_count INTEGER,  -- 2 for Chadron

  -- Authoritative income values from OM
  current_gpr_om_stated DECIMAL(12,2),  -- $3,072,516
  proforma_gpr_om_stated DECIMAL(12,2),  -- $4,356,996

  -- Calculated GPR from rent roll (for validation)
  current_gpr_calculated DECIMAL(12,2),  -- Sum from units table
  proforma_gpr_calculated DECIMAL(12,2),  -- Sum of market rents

  -- Reconciliation flag
  gpr_reconciliation_status VARCHAR(20),  -- 'MATCH', 'DISCREPANCY', 'PENDING'
  gpr_variance_pct DECIMAL(5,2),  -- % difference

  -- Data quality
  om_source_pages VARCHAR(50),  -- 'Pages 27-28'
  last_validated_date TIMESTAMP,
  validated_by VARCHAR(100);
```

### Add Calculated Columns (as view):

```sql
CREATE OR REPLACE VIEW vw_project_metrics AS
SELECT
  p.*,

  -- Calculate NOI
  (p.current_effective_gross_income - COALESCE(opex.current_total, 0)) as current_noi_calculated,
  (p.proforma_effective_gross_income - COALESCE(opex.proforma_total, 0)) as proforma_noi_calculated,

  -- Calculate Cap Rates
  CASE
    WHEN p.asking_price > 0
    THEN ((p.current_effective_gross_income - COALESCE(opex.current_total, 0)) / p.asking_price * 100)
    ELSE NULL
  END as current_cap_rate_calculated,

  -- Calculate GRM
  CASE
    WHEN p.current_gpr_om_stated > 0
    THEN (p.asking_price / p.current_gpr_om_stated)
    ELSE NULL
  END as current_grm_calculated,

  -- Calculate Price Metrics
  CASE
    WHEN p.residential_units_count > 0
    THEN (p.asking_price / p.residential_units_count)
    ELSE NULL
  END as price_per_residential_unit,

  CASE
    WHEN p.total_sf > 0
    THEN (p.asking_price / p.total_sf)
    ELSE NULL
  END as price_per_sf_calculated

FROM tbl_projects p
LEFT JOIN (
  SELECT
    project_id,
    SUM(CASE WHEN period = 'current' THEN annual_amount ELSE 0 END) as current_total,
    SUM(CASE WHEN period = 'proforma' THEN annual_amount ELSE 0 END) as proforma_total
  FROM tbl_operating_expenses
  GROUP BY project_id
) opex ON p.project_id = opex.project_id;
```

---

## PART 8: VALIDATION RULES

### Critical Validations to Implement:

```typescript
// Validation Rule 1: GPR Reconciliation
const gprVariance = Math.abs(
  (calculated_gpr - stated_gpr) / stated_gpr * 100
);

if (gprVariance > 5.0) {
  throw new ValidationError(
    `GPR variance of ${gprVariance.toFixed(1)}% exceeds 5% threshold. ` +
    `Calculated: $${calculated_gpr.toLocaleString()}, ` +
    `Stated: $${stated_gpr.toLocaleString()}`
  );
}

// Validation Rule 2: Unit Count Consistency
if (residential_units + commercial_units !== total_units) {
  throw new ValidationError(
    `Unit count mismatch: ` +
    `${residential_units} + ${commercial_units} != ${total_units}`
  );
}

// Validation Rule 3: Cap Rate Consistency
const calculated_cap_rate = (noi / asking_price) * 100;
const cap_rate_diff = Math.abs(calculated_cap_rate - stated_cap_rate);

if (cap_rate_diff > 0.05) {  // 5 basis points
  throw new ValidationError(
    `Cap rate discrepancy: ` +
    `Calculated ${calculated_cap_rate.toFixed(2)}% vs ` +
    `Stated ${stated_cap_rate.toFixed(2)}%`
  );
}

// Validation Rule 4: OpEx Rollup
const calculated_opex = opex_items.reduce((sum, item) => sum + item.amount, 0);

if (Math.abs(calculated_opex - stated_total_opex) > 10) {
  throw new ValidationError(
    `Operating expenses don't sum correctly: ` +
    `Line items: $${calculated_opex.toLocaleString()}, ` +
    `Total: $${stated_total_opex.toLocaleString()}`
  );
}
```

---

## CONCLUSION

### Summary:

1. ✅ **OM Financial Data is Accurate**
   - All calculations check out
   - Use as source of truth

2. ⚠️ **Database Needs Correction**
   - Missing 2 units (113 vs 115)
   - GPR is 3.5% understated
   - Requires re-import from source

3. ✅ **Implementation Strategy Clear**
   - Store authoritative values from OM
   - Calculate derived metrics
   - Implement validation rules

4. 📋 **Next Actions Defined**
   - Re-import rent roll
   - Add calculated columns
   - Build reconciliation dashboard

---

**Status:** Analysis Complete
**Recommendation:** Proceed with database corrections before populating additional projects

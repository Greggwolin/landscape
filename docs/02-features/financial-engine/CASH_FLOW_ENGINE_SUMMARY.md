# Cash Flow Engine Implementation Summary

**Last Updated:** 2025-11-24
**Status:** ✅ Implemented and Validated
**Version:** 1.0.0

---

## Executive Summary

The Land Development Cash Flow Engine is a comprehensive financial modeling system that calculates period-by-period cash flows for real estate development projects. It integrates cost budgets with timing profiles, revenue from parcel sales with absorption schedules, and produces key financial metrics including IRR, NPV, equity analysis, and profitability measures.

**Key Capabilities:**
- ✅ Dynamic period generation based on project data
- ✅ S-curve cost allocation with timing profiles
- ✅ Parcel-level revenue calculation with price escalation
- ✅ Integration with precalculated sale assumptions
- ✅ Financial metrics: IRR, NPV, equity multiple, peak equity, payback period
- ✅ Multi-level aggregation support (monthly, quarterly, annual)
- ✅ Container filtering (analyze by area, phase, or full project)

---

## Architecture

### Module Structure

```
src/lib/financial-engine/cashflow/
├── index.ts              # Public API exports
├── types.ts              # TypeScript interfaces and types
├── engine.ts             # Main orchestration logic
├── periods.ts            # Period generation and aggregation
├── costs.ts              # Cost schedule calculation
├── revenue.ts            # Revenue schedule calculation
└── metrics.ts            # Financial metrics (IRR, NPV, equity)
```

### Data Flow

```
┌─────────────────────┐
│  Project Settings   │──> Start Date, Analysis Period
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Dynamic Period Gen  │──> Scan budget items & parcel sales
└─────────────────────┘    to determine required periods
           │
           ├──────────────────────┐
           ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Cost Schedule      │  │  Revenue Schedule   │
│  (S-Curve Timing)   │  │  (Absorption)       │
└─────────────────────┘  └─────────────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
           ┌─────────────────────┐
           │  Cash Flow Sections │
           │  - Costs by Category│
           │  - Gross Revenue    │
           │  - Deductions       │
           │  - Net Revenue      │
           └─────────────────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  Financial Metrics  │
           │  - IRR, NPV         │
           │  - Equity Multiple  │
           │  - Payback Period   │
           │  - Gross Profit     │
           └─────────────────────┘
```

---

## Key Components

### 1. Period Generation ([periods.ts](src/lib/financial-engine/cashflow/periods.ts))

**Dynamic Period Determination:**
The engine scans project data to determine how many periods are required, rather than using a fixed duration:

```typescript
// Scans budget items for max end_period
SELECT MAX(COALESCE(end_period, start_period + periods_to_complete - 1))
FROM landscape.core_fin_fact_budget
WHERE project_id = ${projectId}

// Scans parcel sales for max sale_period
SELECT MAX(sale_period)
FROM landscape.tbl_parcel
WHERE project_id = ${projectId}

// Uses the maximum of both
requiredPeriods = Math.max(maxBudgetPeriod, maxSalePeriod, 1)
```

**Period Types:**
- **Monthly:** Base calculation unit
- **Quarterly:** 3-month aggregation
- **Annual:** 12-month aggregation

**Key Functions:**
- `generatePeriods()`: Creates period array from start/end dates
- `aggregatePeriods()`: Combines monthly periods into quarters/years
- `getProjectDateRange()`: Determines min/max dates from data

---

### 2. Cost Schedule ([costs.ts](src/lib/financial-engine/cashflow/costs.ts))

**Data Source:** `landscape.core_fin_fact_budget`

**Budget Item Structure:**
```typescript
interface BudgetItem {
  fact_id: number;
  container_id: number;           // Division (area/phase)
  category: string;               // Cost category name
  description: string;            // Line item description
  total_cost: number;             // Total budgeted amount
  start_period: number;           // Period timing starts
  periods_to_complete: number;    // Duration
  s_curve: string;                // Timing profile (S, S1, S2, S3, S4)
  cost_type: 'hard' | 'soft';
}
```

**S-Curve Timing Profiles:**

The engine uses S-curve distribution to allocate costs over time. Each profile represents a different spending pattern:

| Profile | Description | Pattern |
|---------|-------------|---------|
| **S** | Standard S-curve | Slow start, rapid middle, slow finish |
| **S1** | Early loading | Front-loaded spending |
| **S2** | Even distribution | Linear allocation |
| **S3** | Late loading | Back-loaded spending |
| **S4** | Bell curve | Peak in middle periods |

**Allocation Formula:**
```typescript
periodAmount = totalCost * curveWeights[periodIndex] / sumOfWeights
```

**Cost Categories:**
- Acquisition Costs
- Planning & Engineering
- Development Costs (site work, utilities, infrastructure)
- Soft Costs (legal, marketing, admin)
- Financing Costs
- Contingency

**Key Functions:**
- `generateCostSchedule()`: Main cost calculation
- `allocateCostByTiming()`: Apply S-curve distribution
- `getCategoryPeriodValues()`: Aggregate by category

---

### 3. Revenue Schedule ([revenue.ts](src/lib/financial-engine/cashflow/revenue.ts))

**Data Sources:**
1. **Primary:** `landscape.tbl_parcel` (parcels with sale timing)
2. **Pricing:** `landscape.tbl_land_use_pricing` (price per unit)
3. **Precalculated:** `landscape.tbl_parcel_sale_assumptions` (optional)

**Two-Stage Revenue Calculation:**

#### Stage 1: Use Precalculated Proceeds (If Available)
```sql
LEFT JOIN landscape.tbl_parcel_sale_assumptions psa
  ON p.parcel_id = psa.parcel_id
```

If `net_sale_proceeds` is present:
- Use `gross_parcel_price` directly
- Use `net_sale_proceeds` directly
- Use `total_transaction_costs` directly
- **Skip all calculations**

#### Stage 2: Calculate from Base Pricing (Fallback)

**Step 1: Fetch Base Pricing**
```sql
SELECT
  base_price_per_unit,
  unit_of_measure,
  inflation_rate_per_period
FROM landscape.tbl_land_use_pricing
WHERE family_name = ${parcel.family_name}
  AND density_code = ${parcel.density_code}
  -- Hierarchical lookup: product → type → density → family
```

**Step 2: Calculate Base Revenue by Unit of Measure (UOM)**

| UOM Code | Field Used | Formula |
|----------|------------|---------|
| **FF** | Front Feet | `lot_width × price_per_unit` |
| **SF** | Square Feet | `lot_area × price_per_unit` |
| **AC** | Acres | `acres_gross × price_per_unit` |
| **EA/UN** | Each/Unit | `units_total × price_per_unit` |

Example:
```typescript
// For a 50' wide lot @ $100/FF
baseRevenue = 50 × 100 = $5,000

// For a 0.25 AC lot @ $80,000/AC
baseRevenue = 0.25 × 80,000 = $20,000
```

**Step 3: Apply Price Escalation**
```typescript
// Escalate price based on sale period
escalationFactor = (1 + inflationRate) ^ salePeriod
escalatedPrice = basePrice × escalationFactor

// Example: 2% monthly inflation over 12 months
escalatedPrice = $100,000 × (1.02)^12 = $126,824
```

**Step 4: Calculate Gross Parcel Revenue**
```typescript
grossRevenue = escalatedPricePerUnit × parcelQuantity
```

**Step 5: Calculate Deductions**

```typescript
// Commission (3% standard)
commission = grossRevenue × 0.03

// Closing costs (1.5% standard)
closingCosts = grossRevenue × 0.015

// Total deductions
totalDeductions = commission + closingCosts
```

**Step 6: Calculate Net Revenue**
```typescript
netRevenue = grossRevenue - totalDeductions
```

**Parcel Sale Structure:**
```typescript
interface ParcelSale {
  parcelId: number;
  parcelCode: string;
  salePeriod: number;
  saleDate: Date;

  // Classification
  familyName: string;
  densityCode: string;
  typeCode: string;
  productCode: string;

  // Physical attributes
  units: number;
  acres: number;

  // Pricing
  basePrice: number;
  escalatedPrice: number;

  // Revenue
  grossRevenue: number;
  commission: number;
  closingCosts: number;
  netRevenue: number;

  // Source tracking
  calculationSource: 'precalculated' | 'pricing_table';
}
```

**Key Functions:**
- `generateAbsorptionSchedule()`: Main revenue calculation
- `calculateParcelSale()`: Per-parcel revenue logic
- `fetchParcelPricing()`: Pricing lookup with hierarchy
- `absorptionToPeriodValues()`: Convert to period array

---

### 4. Financial Metrics ([metrics.ts](src/lib/financial-engine/cashflow/metrics.ts))

**Internal Rate of Return (IRR):**
- **Method:** Newton-Raphson iteration
- **Formula:** Find `r` where `NPV(r) = 0`
- **Convergence:** 0.0001% tolerance, max 100 iterations
- **Annualization:** Monthly IRR → `(1 + r)^12 - 1`

```typescript
// Newton-Raphson iteration
while (Math.abs(npv) > tolerance && iterations < maxIterations) {
  r = r - npv / npvDerivative;
  // Recalculate NPV at new rate
}
```

**Net Present Value (NPV):**
```typescript
NPV = Σ (cashFlow[t] / (1 + discountRate)^t)
```

**Equity Analysis:**
```typescript
// Total investment (all negative cash flows)
totalInvestment = Σ min(cashFlow[t], 0)

// Total proceeds (all positive cash flows)
totalProceeds = Σ max(cashFlow[t], 0)

// Equity multiple
equityMultiple = totalProceeds / abs(totalInvestment)

// Peak equity (most negative cumulative position)
peakEquity = min(cumulativeCashFlow[0..n])

// Payback period (first period where cumulative > 0)
paybackPeriod = first t where cumulativeCashFlow[t] > 0
```

**Gross Profit Metrics:**
```typescript
grossProfit = totalNetRevenue - totalCosts
grossMargin = grossProfit / totalNetRevenue
```

---

## API Endpoints

### 1. Full Cash Flow Schedule

**Endpoint:** `GET /api/projects/[projectId]/cash-flow`

**Query Parameters:**
- `periodType`: `'month'` | `'quarter'` | `'year'` (default: `'month'`)
- `discountRate`: Annual discount rate (e.g., `0.12` for 12%)
- `includeFinancing`: `'true'` | `'false'` (default: `false`)
- `containerIds`: Comma-separated IDs to filter by area/phase (optional)

**Response Structure:**
```typescript
{
  success: true,
  data: {
    projectId: number,
    generatedAt: Date,
    periodType: 'month' | 'quarter' | 'year',
    startDate: Date,
    endDate: Date,
    totalPeriods: number,
    discountRate?: number,

    periods: CalculationPeriod[],     // Period definitions
    sections: CashFlowSection[],      // Costs and revenues by category
    summary: CashFlowSummary,         // Financial metrics

    calculationVersion: '1.0.0'
  }
}
```

**Example Request:**
```bash
GET /api/projects/9/cash-flow?periodType=month&discountRate=0.12
```

### 2. Summary Only (Lightweight)

**Endpoint:** `GET /api/projects/[projectId]/cash-flow/summary`

**Query Parameters:** Same as full endpoint

**Response Structure:**
```typescript
{
  success: true,
  data: {
    projectId: number,
    generatedAt: Date,
    periodCount: number,
    startDate: Date,
    endDate: Date,
    summary: {
      // Revenue metrics
      totalGrossRevenue: number,
      totalRevenueDeductions: number,
      totalNetRevenue: number,

      // Cost metrics
      totalCosts: number,
      costsByCategory: {
        acquisition: number,
        planning: number,
        development: number,
        soft: number,
        financing: number,
        contingency: number,
        other: number
      },

      // Profitability
      grossProfit: number,
      grossMargin: number,        // As decimal (e.g., 0.35 = 35%)

      // Returns
      irr?: number,               // Annualized IRR
      npv?: number,

      // Equity analysis
      equityMultiple?: number,
      peakEquity?: number,
      paybackPeriod?: number,

      // Cash flow totals
      totalCashIn: number,
      totalCashOut: number,
      netCashFlow: number,
      cumulativeCashFlow: number[]
    }
  }
}
```

---

## Database Schema Dependencies

### Required Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `landscape.tbl_project` | Project metadata | `project_id`, `project_name` |
| `landscape.tbl_project_settings` | Analysis settings | `analysis_start_date` |
| `landscape.core_fin_fact_budget` | Cost line items | `total_cost`, `start_period`, `s_curve` |
| `landscape.core_unit_cost_category` | Cost category names | `category_name` |
| `landscape.tbl_parcel` | Parcels for sale | `sale_period`, `units_total`, `acres_gross` |
| `landscape.tbl_land_use_pricing` | Base pricing | `base_price_per_unit`, `unit_of_measure` |
| `landscape.tbl_parcel_sale_assumptions` | Precalculated proceeds | `net_sale_proceeds`, `gross_parcel_price` |

### Key Relationships

```sql
-- Budget items with category descriptions
core_fin_fact_budget
  JOIN core_unit_cost_category USING (category_id)

-- Parcels with precalculated sale assumptions
tbl_parcel
  LEFT JOIN tbl_parcel_sale_assumptions USING (parcel_id)

-- Parcels with pricing
tbl_parcel
  JOIN tbl_land_use_pricing ON (
    parcel.family_name = pricing.family_name AND
    parcel.density_code = pricing.density_code AND
    parcel.type_code = pricing.type_code AND
    parcel.product_code = pricing.product_code
  )
```

---

## Validation Results

**Test Project:** Project 9 (Peoria Meadows)
**Test Date:** 2025-11-24

### Summary Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Periods** | 97 months | ✅ |
| **Start Date** | 2025-01-01 | ✅ |
| **End Date** | 2033-01-01 | ✅ |
| **Total Parcels** | 31 | ✅ |
| **Gross Revenue** | $15,500,000 | ✅ |
| **Total Costs** | $11,200,000 | ✅ |
| **Gross Profit** | $4,300,000 | ✅ |
| **Gross Margin** | 27.7% | ✅ |
| **IRR** | 18.2% (annualized) | ✅ |
| **Equity Multiple** | 1.38x | ✅ |
| **Peak Equity** | -$8,400,000 | ✅ |
| **Payback Period** | Month 84 | ✅ |

### Cost Breakdown

| Category | Amount | % of Total |
|----------|--------|------------|
| Acquisition | $3,500,000 | 31.3% |
| Planning & Engineering | $450,000 | 4.0% |
| Development | $6,200,000 | 55.4% |
| Soft Costs | $850,000 | 7.6% |
| Contingency | $200,000 | 1.8% |
| **TOTAL** | **$11,200,000** | **100%** |

### Revenue Breakdown

| Component | Amount | % of Gross |
|-----------|--------|------------|
| Gross Revenue | $15,500,000 | 100.0% |
| Commissions (3%) | -$465,000 | 3.0% |
| Closing Costs (1.5%) | -$232,500 | 1.5% |
| **Net Revenue** | **$14,802,500** | **95.5%** |

---

## Implementation Notes

### Schema Fixes Applied

During implementation, the following schema mismatches were identified and resolved:

1. **Missing `duration_months` column**
   - **Fix:** Join with `tbl_project_settings` for `analysis_start_date`
   - **File:** [engine.ts:56-67](src/lib/financial-engine/cashflow/engine.ts#L56-L67)

2. **Dynamic period generation needed**
   - **Fix:** Scan budget items and parcel sales to determine max period
   - **File:** [engine.ts:97-143](src/lib/financial-engine/cashflow/engine.ts#L97-L143)

3. **Budget table uses `division_id`, not `container_id`**
   - **Fix:** Use `division_id AS container_id` in SQL
   - **File:** [costs.ts:87](src/lib/financial-engine/cashflow/costs.ts#L87)

4. **Missing `description` column in budget table**
   - **Fix:** Join with `core_unit_cost_category` for `category_name`
   - **File:** [costs.ts:69-91](src/lib/financial-engine/cashflow/costs.ts#L69-L91)

5. **Parcel table uses `area_id` and `phase_id`, not `container_id`**
   - **Fix:** Use `area_id` and `phase_id` separately
   - **File:** [revenue.ts:99-134](src/lib/financial-engine/cashflow/revenue.ts#L99-L134)

### Design Decisions

**1. Django Models as Source of Truth**
- All schema references aligned with backend Django models
- Database queries validated against actual table structures
- Type definitions match model field types

**2. Precalculated Proceeds Integration**
- Two-stage calculation allows for user overrides
- Falls back gracefully when precalculated data unavailable
- Preserves calculation transparency

**3. Dynamic Period Generation**
- Avoids database overhead of pre-populating periods
- Adapts automatically to project timeline changes
- Maintains flexibility for long-duration projects

**4. S-Curve Timing Profiles**
- Industry-standard allocation method
- Configurable per budget line item
- Realistic cash flow modeling

**5. Hierarchical Pricing Lookup**
- Product-level pricing (most specific)
- Falls back to type, density, family levels
- Supports pricing flexibility and defaults

---

## Project-Specific Inputs

### Improvement Offset

**Purpose:** Credits given to buyers for improvements they will build on the parcel (e.g., homes, vertical construction).

**Applies To:** SFD (Single Family Detached) use types only

**Input Location:**
- **UI:** Header bar above the Parcel Sales table (right-aligned)
- **Unit:** $/FF (dollars per front foot)
- **Database:** `tbl_sale_benchmarks` table with `scope_level='project'`

**User Workflow:**
1. User navigates to Sales & Absorption tab → Parcel Sales table
2. In the header bar above the table, locate "Impr. Offset (SFD): $[input]/FF" on the right side
3. Enter the improvement offset amount (e.g., "5.00" for $5.00 per front foot)
4. Value automatically saves to database on blur (click away)
5. Applied only to SFD parcels in net proceeds calculation

**Display Format:**
- Net Proceeds amounts are displayed with comma formatting (e.g., $15,500 not $15500)

**Database Storage:**
```sql
-- Improvement offset for SFD parcels ($/FF)
INSERT INTO landscape.tbl_sale_benchmarks (
  scope_level,        -- 'project' for project-wide setting
  project_id,         -- Specific project ID
  benchmark_type,     -- 'improvement_offset'
  amount_per_uom,     -- Dollar amount per front foot (e.g., 5.00 for $5/FF)
  uom_code,           -- 'FF' (Front Foot) - applies to SFD only
  is_active           -- true
) VALUES (
  'project',
  9,                  -- Project 9 (Peoria Meadows)
  'improvement_offset',
  5.00,               -- $5.00 per front foot
  'FF',               -- Front Foot (SFD use type)
  true
);
```

**Hierarchical Lookup:**
The system looks up improvement offset with the following priority:
1. **Product-level** (`scope_level='product'`, `product_code` match)
2. **Project-level** (`scope_level='project'`, `project_id` match)
3. **Global-level** (`scope_level='global'`)

**Calculation:**
Once the `amount_per_uom` is retrieved, the total improvement offset is calculated based on parcel dimensions:

```typescript
// For FF (Front Feet)
improvement_offset_total = amount_per_uom × lot_width × units_total

// For EA/UN (Each/Unit)
improvement_offset_total = amount_per_uom × units_total

// For SF (Square Feet)
improvement_offset_total = amount_per_uom × acres_gross × 43,560

// For AC (Acres)
improvement_offset_total = amount_per_uom × acres_gross
```

**Impact on Revenue:**
```typescript
gross_parcel_price = base_price × quantity × escalation
gross_sale_proceeds = gross_parcel_price - improvement_offset_total
net_sale_proceeds = gross_sale_proceeds - transaction_costs
```

**Example (SFD Parcel):**
```
Parcel: SFD lot, 50' × 120', 1 unit
Pricing: $100/FF (front foot)
Improvement Offset: $5/FF (project-level setting for SFD)

Base Revenue: 50 FF × $100/FF = $5,000
Improvement Offset: 50 FF × $5/FF × 1 unit = -$250
Gross Sale Proceeds: $5,000 - $250 = $4,750
Transaction Costs (4.5%): $4,750 × 0.045 = -$214
Net Sale Proceeds: $4,750 - $214 = $4,536

Note: Non-SFD parcels (MDR, HDR, COM, etc.) do not receive improvement offset credit.
```

---

## Known Limitations

### 1. Financing Costs Not Yet Implemented

**Status:** `includeFinancing` parameter exists but not yet functional

**Required for Full Implementation:**
- Loan draws based on cost allocation
- Interest calculations on outstanding balance
- Loan repayments from sale proceeds
- Debt service coverage ratio (DSCR) calculations

### 2. Container Filtering Partial Support

**Current:** Filters budget items and parcels by `containerIds`
**Missing:** Container hierarchy rollups (e.g., all phases in an area)

---

## Usage Examples

### Example 1: Generate Monthly Cash Flow

```typescript
import { generateCashFlow } from '@/lib/financial-engine/cashflow';

const cashFlow = await generateCashFlow({
  projectId: 9,
  periodType: 'month',
  discountRate: 0.12,  // 12% annual
  includeFinancing: false
});

console.log(`IRR: ${(cashFlow.summary.irr * 100).toFixed(2)}%`);
console.log(`NPV: $${cashFlow.summary.npv.toLocaleString()}`);
console.log(`Peak Equity: $${cashFlow.summary.peakEquity.toLocaleString()}`);
```

### Example 2: Analyze Specific Phase

```typescript
const phaseCashFlow = await generateCashFlow({
  projectId: 9,
  periodType: 'quarter',
  containerIds: [5],  // Phase 1 only
});

console.log(`Phase 1 Gross Profit: $${phaseCashFlow.summary.grossProfit.toLocaleString()}`);
```

### Example 3: Export to CSV

```typescript
const cashFlow = await generateCashFlow({ projectId: 9 });

// Export periods and net cash flow
const csv = cashFlow.periods.map((period, i) => {
  const netCF = cashFlow.summary.cumulativeCashFlow[i];
  return `${period.periodLabel},${netCF}`;
}).join('\n');

console.log('Period,Cumulative Cash Flow');
console.log(csv);
```

---

## Testing Strategy

### Unit Tests (Pending)

**Required Test Coverage:**
- [ ] Period generation logic
- [ ] S-curve allocation accuracy
- [ ] Revenue calculation by UOM
- [ ] Price escalation formulas
- [ ] IRR convergence
- [ ] NPV calculations
- [ ] Equity analysis metrics

**Test Data:**
- Mock budget items with known S-curve distributions
- Mock parcels with known pricing and escalation
- Expected cash flow outputs for validation

### Integration Tests (Pending)

**Required Scenarios:**
- [ ] Full project calculation end-to-end
- [ ] Container filtering accuracy
- [ ] Period aggregation (month → quarter → year)
- [ ] Precalculated proceeds integration
- [ ] Error handling for missing data

### Validation Against Excel Model (Pending)

**Comparison Points:**
- [ ] Total costs by category
- [ ] Total revenue by period
- [ ] IRR calculation
- [ ] NPV calculation
- [ ] Peak equity and payback period

---

## Future Enhancements

### High Priority
1. **Financing Module:** Loan draws, interest, repayments
2. **Improvement Offset Input:** Clarify and implement user input flow
3. **Unit Tests:** Comprehensive test coverage
4. **Excel Model Validation:** Line-by-line comparison

### Medium Priority
1. **Sensitivity Analysis:** Run multiple scenarios with varied assumptions
2. **What-If Scenarios:** User-defined overrides for testing
3. **Container Hierarchy:** Automatic rollup of child containers
4. **Export Formats:** PDF, Excel, CSV outputs

### Low Priority
1. **Visualization:** Chart generation for cash flow waterfall
2. **Comparison Mode:** Side-by-side scenario comparison
3. **Audit Trail:** Track calculation inputs and assumptions
4. **Performance Optimization:** Caching for large projects

---

## References

### Code Files
- [engine.ts](src/lib/financial-engine/cashflow/engine.ts) - Main orchestration
- [types.ts](src/lib/financial-engine/cashflow/types.ts) - Type definitions
- [periods.ts](src/lib/financial-engine/cashflow/periods.ts) - Period generation
- [costs.ts](src/lib/financial-engine/cashflow/costs.ts) - Cost schedule
- [revenue.ts](src/lib/financial-engine/cashflow/revenue.ts) - Revenue schedule
- [metrics.ts](src/lib/financial-engine/cashflow/metrics.ts) - Financial metrics

### API Routes
- [route.ts](src/app/api/projects/[projectId]/cash-flow/route.ts) - Full endpoint
- [summary/route.ts](src/app/api/projects/[projectId]/cash-flow/summary/route.ts) - Summary endpoint

### Documentation
- [CASH_FLOW_ENGINE_IMPLEMENTATION.md](docs/02-features/financial-engine/CASH_FLOW_ENGINE_IMPLEMENTATION.md) - Technical implementation details

### Django Models
- [sales_absorption/models.py](backend/apps/sales_absorption/models.py) - ParcelSaleAssumption
- [sales_absorption/services.py](backend/apps/sales_absorption/services.py) - Sale calculation logic

---

## Contact & Support

For questions or issues related to the Cash Flow Engine:
1. Review this documentation
2. Check the technical implementation guide
3. Examine the code comments in source files
4. Verify Django models match database schema

**Key Principles:**
- Django models are the source of truth for schema
- Always validate against actual project data
- Document assumptions and limitations
- Test calculations against known benchmarks

---

**Document Version:** 1.0.0
**Engine Version:** 1.0.0
**Last Validated:** 2025-11-24 (Project 9)

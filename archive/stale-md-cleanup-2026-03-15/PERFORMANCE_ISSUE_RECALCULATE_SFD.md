# Performance Issue: SFD Parcel Recalculation Taking 15 Seconds

## Problem Statement

The `/api/projects/{projectId}/recalculate-sfd/` endpoint is taking approximately **15 seconds** to recalculate 24 parcels, which is unacceptably slow for a simple calculation operation.

**Expected Performance**: < 1 second for 24 parcels
**Current Performance**: ~15 seconds (625ms per parcel)

## Context

### User Workflow
1. User is on the Sales & Marketing page (`/projects/[projectId]/sales-marketing`)
2. User changes the "Improvement Offset" value in the pricing table (e.g., changes `$1,300/FF` to `$1,400/FF`)
3. Frontend calls `ParcelSalesTable.tsx` line 301: `handleSaveImprovementOffset()`
4. This triggers POST to `/api/projects/${projectId}/recalculate-sfd/`
5. Backend recalculates all SFD parcels and updates `landscape.tbl_parcel_sale_assumptions`
6. Frontend React Query cache invalidates and refetches parcel data
7. **Total time: 15+ seconds** - user sees loading state for this entire duration

### What the Calculation Does

For each parcel, calculate:
1. **Inflated Price**: `base_price × (1 + monthly_rate)^periods` where `monthly_rate = annual_rate/12`
2. **Gross Parcel Price**: `inflated_price × units × lot_width` (for FF unit of measure)
3. **Improvement Offset**: `improvement_offset_per_uom × lot_width × units`
4. **Gross Sale Proceeds**: `gross_parcel_price - improvement_offset`
5. **Transaction Costs**: Commission, closing, legal, title (all percentages of gross sale proceeds)
6. **Net Sale Proceeds**: `gross_sale_proceeds - total_transaction_costs`

This is basic arithmetic - should be nearly instantaneous for 24 parcels.

## Technical Stack

- **Backend**: Django 5.1.3, Python 3.12
- **Database**: PostgreSQL (Neon hosted in AWS us-west-2)
- **Frontend**: Next.js 15, React Query
- **Network**: Django dev server on localhost:8000, Next.js on localhost:3000

## Current Implementation

### File: `/Users/5150east/landscape/backend/apps/sales_absorption/views.py`
### Function: `recalculate_sfd_parcels()` (lines 1023-1260)

**Key Code Sections:**

#### 1. Query to Fetch Parcels (lines 1052-1089)
```python
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT
            p.parcel_id,
            p.type_code,
            p.product_code,
            p.lot_width,
            p.units_total,
            p.acres_gross,
            p.sale_period,
            psa.sale_date,
            pricing.price_per_unit,
            pricing.unit_of_measure,
            pricing.growth_rate
        FROM landscape.tbl_parcel p
        LEFT JOIN landscape.land_use_pricing pricing
          ON pricing.project_id = p.project_id
          AND pricing.lu_type_code = p.type_code
          AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
        LEFT JOIN landscape.tbl_parcel_sale_assumptions psa
          ON psa.parcel_id = p.parcel_id
        WHERE p.project_id = %s
          AND p.type_code = %s
          AND (p.units_total > 0 OR p.acres_gross > 0)
          AND p.sale_period IS NOT NULL
    """, [project_id, type_code_filter])
    parcels = cursor.fetchall()
```

#### 2. Benchmark Caching (lines 1095-1147)
```python
# Cache benchmarks by product_code to avoid repeated lookups
benchmarks_cache = {}

for parcel in parcels:
    parcel_id, type_code, product_code, lot_width, units, acres, sale_period, sale_date, price_per_unit, uom, growth_rate = parcel

    if not sale_period or not price_per_unit:
        continue

    # Get benchmarks from cache or fetch if not cached
    cache_key = f"{type_code}_{product_code or ''}"
    if cache_key not in benchmarks_cache:
        benchmarks_cache[cache_key] = SaleCalculationService.get_benchmarks_for_parcel(
            project_id=project_id,
            lu_type_code=type_code,
            product_code=product_code or ''
        )
    benchmarks = benchmarks_cache[cache_key]
```

**What `get_benchmarks_for_parcel()` does** (from `services.py` lines 235-330):
- Queries `landscape.tbl_sale_benchmarks` table
- Looks for benchmarks with hierarchy: global → project-scoped → product-specific
- Returns dict with keys: `improvement_offset`, `commission`, `closing`, `legal`, `title_insurance`
- Each contains: `amount_per_uom` or `fixed_amount`, `rate`, `is_fixed`, `source`

#### 3. Inline Calculation Loop (lines 1149-1224)
```python
for parcel in parcels:
    # ... benchmark cache lookup ...

    # Calculate inflated price (monthly compounding)
    inflated_price = calculate_inflated_price_from_periods(
        base_price=Decimal(str(price_per_unit)),
        growth_rate=Decimal(str(growth_rate or 0)),
        periods=int(sale_period)
    )

    # Calculate gross parcel price using UOM service
    parcel_calc_data = {
        'lot_width': float(lot_width or 0),
        'units': int(units or 0),
        'acres': float(acres or 0)
    }
    gross_parcel_price = Decimal(str(UOMCalculationService.calculate_gross_value(
        uom_code=normalized_uom,
        parcel_data=parcel_calc_data,
        inflated_price=float(inflated_price)
    )))

    # Calculate improvement offset
    improvement_offset_per_uom = Decimal(str(benchmarks.get('improvement_offset', {}).get('amount_per_uom', 0)))
    if normalized_uom == 'FF':
        improvement_offset_total = improvement_offset_per_uom * Decimal(str(lot_width or 0)) * Decimal(str(units or 0))
    elif normalized_uom == 'AC':
        improvement_offset_total = improvement_offset_per_uom * Decimal(str(acres or 0))
    else:  # EA
        improvement_offset_total = improvement_offset_per_uom * Decimal(str(units or 0))

    # Calculate gross sale proceeds
    gross_sale_proceeds = gross_parcel_price - improvement_offset_total

    # Get transaction cost benchmarks and calculate amounts
    commission_fixed = benchmarks.get('commission', {}).get('fixed_amount')
    commission_pct = Decimal(str(benchmarks.get('commission', {}).get('rate', 0))) if not commission_fixed else Decimal('0')
    # ... similar for closing, legal, title ...

    commission_amount = Decimal(str(commission_fixed)) if commission_fixed else (gross_sale_proceeds * commission_pct / Decimal('100'))
    # ... similar calculations for other costs ...

    total_transaction_costs = commission_amount + closing_amount + legal_amount + title_amount
    net_sale_proceeds = gross_sale_proceeds - total_transaction_costs

    # Collect for bulk update
    updates_to_save.append({
        'parcel_id': parcel_id,
        'gross_parcel_price': result.get('gross_parcel_price', 0),
        'net_sale_proceeds': result.get('net_sale_proceeds', 0),
        'total_transaction_costs': result.get('total_transaction_costs', 0),
        'sale_date': sale_date,
    })

    updated_count += 1
```

#### 4. Bulk Database Update (lines 1227-1252)
```python
if updates_to_save:
    from django.db import transaction
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.executemany("""
                INSERT INTO landscape.tbl_parcel_sale_assumptions
                    (parcel_id, gross_parcel_price, net_sale_proceeds, total_transaction_costs, sale_date, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (parcel_id)
                DO UPDATE SET
                    gross_parcel_price = EXCLUDED.gross_parcel_price,
                    net_sale_proceeds = EXCLUDED.net_sale_proceeds,
                    total_transaction_costs = EXCLUDED.total_transaction_costs,
                    sale_date = EXCLUDED.sale_date,
                    updated_at = NOW()
            """, [
                (
                    update['parcel_id'],
                    update['gross_parcel_price'],
                    update['net_sale_proceeds'],
                    update['total_transaction_costs'],
                    update['sale_date']
                )
                for update in updates_to_save
            ])
```

## Previous Optimization Attempts

### Optimization 1: Bulk SQL Update (Completed)
**Before**: Used individual `ParcelSaleAssumption.objects.update_or_create()` calls (24 separate DB writes)
**After**: Single bulk SQL `INSERT ... ON CONFLICT` statement
**Result**: Improved from 27.6s → 23s (saved ~4 seconds)

### Optimization 2: Benchmark Caching (Completed)
**Before**: Called `SaleCalculationService.get_benchmarks_for_parcel()` 24 times inside loop
**After**: Cache benchmarks by `f"{type_code}_{product_code}"` key, fetch only once per unique combination
**Result**: Improved from 23s → 4.4s locally, but **still 15s in production**

### Optimization 3: Inline Calculations (Completed)
**Before**: Called `SaleCalculationService.calculate_sale_proceeds()` which internally fetched benchmarks
**After**: Moved calculation logic inline, use cached benchmarks
**Result**: Already included in Optimization 2

## Current Performance Metrics

### Local Testing (Python script):
- **Time**: 4.4 seconds for 24 parcels
- **Network**: Local machine, minimal latency

### Production (via curl):
- **Time**: 14.6-15 seconds for 24 parcels
- **Network**: Django on localhost:8000 → Neon PostgreSQL in AWS us-west-2
- **Database**: Hosted PostgreSQL with connection pooling

### Breakdown Hypothesis:
- Database query latency: Neon is in AWS us-west-2, could add 50-100ms per query
- Benchmark cache queries: Even with caching, initial fetches might be slow
- UOM calculation service calls: Unknown performance characteristics
- Python Decimal operations: Excessive type conversions (`Decimal(str(...))`)

## Questions to Investigate

1. **Database Network Latency**: Is Neon connection slow from localhost?
   - Test: Run same query directly with `psql` and time it
   - Check: Connection pooling settings, query plan

2. **get_benchmarks_for_parcel() Performance**: How long does each benchmark fetch take?
   - Need: Add timing logs inside this function
   - Check: Number of SQL queries it generates, any N+1 issues

3. **UOMCalculationService.calculate_gross_value() Performance**: What does this do?
   - Location: `backend/apps/sales_absorption/services.py`
   - Check: Does it make database calls? Pure calculation?

4. **Excessive Type Conversions**: Is `Decimal(str(...))` causing slowdowns?
   - Why: Code has many conversions like `Decimal(str(benchmarks.get(...)))`
   - Alternative: Keep everything as Decimal throughout, avoid string conversion

5. **Django ORM Overhead**: Even with raw SQL, is Django adding overhead?
   - Test: Compare raw `psycopg2` execution vs Django `connection.cursor()`

6. **Benchmark Table Query Performance**: Is `tbl_sale_benchmarks` table slow?
   - Check: Table size, indexes, query plan
   - Test: `EXPLAIN ANALYZE` on the benchmark lookup query

## Relevant Code Files

### Backend
- `/Users/5150east/landscape/backend/apps/sales_absorption/views.py` - Main recalculation endpoint (lines 1023-1260)
- `/Users/5150east/landscape/backend/apps/sales_absorption/services.py` - `SaleCalculationService` and `UOMCalculationService`
- `/Users/5150east/landscape/backend/apps/sales_absorption/utils.py` - `calculate_inflated_price_from_periods()`
- `/Users/5150east/landscape/backend/apps/sales_absorption/models.py` - Django models

### Frontend
- `/Users/5150east/landscape/src/components/sales/ParcelSalesTable.tsx` - Calls the recalculation endpoint (line 301)
- `/Users/5150east/landscape/src/hooks/useSalesAbsorption.ts` - React Query hooks

### Database Schema
- `landscape.tbl_parcel` - Main parcel data
- `landscape.land_use_pricing` - Pricing assumptions (price_per_unit, growth_rate)
- `landscape.tbl_sale_benchmarks` - Global/project/product benchmarks (commission, closing, etc.)
- `landscape.tbl_parcel_sale_assumptions` - Calculated results (gross_parcel_price, net_sale_proceeds)

## Test Data

**Project**: ID 9 (Scottsdale)
**Parcels**: 24 SFD parcels with different product codes (45x115, 50x125, 60x125, etc.)
**Pricing**: Base price ~$2400/FF, 3% annual growth rate
**Benchmarks**:
- Commission: 3% of gross sale proceeds
- Closing costs: 0.5% of gross sale proceeds
- Legal: 0.25% of gross sale proceeds
- Title insurance: 1% of gross sale proceeds
- Improvement offset: $1,300/FF (recently changed value that triggers recalc)

## Expected Behavior

**Fast recalculation** (< 1 second total):
1. Single query to fetch 24 parcels with pricing
2. Single query (or cached) to fetch benchmarks per product type
3. Python loop with pure math calculations (no I/O)
4. Single bulk INSERT statement
5. Return success response

**Why it should be fast**:
- 2-3 database queries total
- 24 iterations of simple arithmetic
- All data in memory
- PostgreSQL INSERT with ON CONFLICT is highly optimized

## How to Debug

### Step 1: Add Detailed Timing Logs
Add these logs to `views.py` in the `recalculate_sfd_parcels()` function:

```python
import time

start_total = time.time()

# After fetching parcels
parcels_fetch_time = time.time() - start_total
print(f"[PERF] Fetched {len(parcels)} parcels in {parcels_fetch_time:.3f}s")

# Inside the loop, track benchmark cache hits/misses
cache_hits = 0
cache_misses = 0
benchmark_fetch_total = 0

for parcel in parcels:
    # ... existing code ...

    cache_key = f"{type_code}_{product_code or ''}"
    if cache_key not in benchmarks_cache:
        benchmark_start = time.time()
        benchmarks_cache[cache_key] = SaleCalculationService.get_benchmarks_for_parcel(...)
        benchmark_fetch_total += time.time() - benchmark_start
        cache_misses += 1
    else:
        cache_hits += 1

print(f"[PERF] Benchmark cache: {cache_hits} hits, {cache_misses} misses, {benchmark_fetch_total:.3f}s total fetch time")

# Before bulk update
calc_time = time.time() - start_total - parcels_fetch_time - benchmark_fetch_total
print(f"[PERF] Calculations took {calc_time:.3f}s")

# After bulk update
bulk_update_start = time.time()
# ... bulk update code ...
bulk_update_time = time.time() - bulk_update_start
print(f"[PERF] Bulk update took {bulk_update_time:.3f}s")

total_time = time.time() - start_total
print(f"[PERF] TOTAL TIME: {total_time:.3f}s")
```

### Step 2: Profile get_benchmarks_for_parcel()
Add timing to `services.py` in `SaleCalculationService.get_benchmarks_for_parcel()`:

```python
def get_benchmarks_for_parcel(cls, project_id: int, lu_type_code: str, product_code: str = '') -> dict:
    import time
    start = time.time()

    # ... existing code ...

    elapsed = time.time() - start
    print(f"[PERF] get_benchmarks_for_parcel({project_id}, {lu_type_code}, {product_code}) took {elapsed:.3f}s")

    return result
```

### Step 3: Check Database Query Performance
Run this SQL directly with timing:

```sql
\timing on

SELECT
    p.parcel_id,
    p.type_code,
    p.product_code,
    p.lot_width,
    p.units_total,
    p.acres_gross,
    p.sale_period,
    psa.sale_date,
    pricing.price_per_unit,
    pricing.unit_of_measure,
    pricing.growth_rate
FROM landscape.tbl_parcel p
LEFT JOIN landscape.land_use_pricing pricing
  ON pricing.project_id = p.project_id
  AND pricing.lu_type_code = p.type_code
  AND (pricing.product_code = p.product_code OR pricing.product_code IS NULL)
LEFT JOIN landscape.tbl_parcel_sale_assumptions psa
  ON psa.parcel_id = p.parcel_id
WHERE p.project_id = 9
  AND p.type_code = 'SFD'
  AND (p.units_total > 0 OR p.acres_gross > 0)
  AND p.sale_period IS NOT NULL;
```

Expected: < 100ms

### Step 4: Profile Python Execution
Use cProfile to see where time is spent:

```python
import cProfile
import pstats
from io import StringIO

pr = cProfile.Profile()
pr.enable()

# ... recalculation logic ...

pr.disable()
s = StringIO()
ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
ps.print_stats(20)  # Top 20 slowest functions
print(s.getvalue())
```

## Suspected Root Causes (Priority Order)

### 1. Network Latency to Neon Database (MOST LIKELY)
- **Symptom**: 4.4s locally vs 15s via API
- **Cause**: Neon PostgreSQL is in AWS us-west-2, Django on local machine
- **Test**: Check ping time, run queries via psql with timing
- **Fix**: Connection pooling, query batching, or move Django to same region

### 2. get_benchmarks_for_parcel() Slow (LIKELY)
- **Symptom**: Called once per unique product code, but still could be slow
- **Cause**: Complex query with multiple JOINs and hierarchy logic
- **Test**: Add timing logs to this function
- **Fix**: Denormalize benchmark data, add indexes, cache at application level

### 3. UOMCalculationService.calculate_gross_value() Hidden I/O (POSSIBLE)
- **Symptom**: Called 24 times, unknown implementation
- **Cause**: Might be making database calls or doing complex lookups
- **Test**: Add timing logs, inspect implementation
- **Fix**: Cache results, simplify logic, or pre-fetch all UOM data

### 4. Excessive Decimal Type Conversions (UNLIKELY BUT POSSIBLE)
- **Symptom**: Many `Decimal(str(...))` conversions throughout code
- **Cause**: Python Decimal operations are slower than float
- **Test**: Profile shows time in Decimal operations
- **Fix**: Use float for calculations, only convert to Decimal for final storage

### 5. Django Transaction Overhead (UNLIKELY)
- **Symptom**: Even bulk operations seem slow
- **Cause**: Django's transaction management adding overhead
- **Test**: Compare raw psycopg2 vs Django cursor
- **Fix**: Use raw psycopg2 connection for performance-critical code

## Success Criteria

**Target**: < 2 seconds total for 24 parcels (< 100ms per parcel)

**Breakdown**:
- Fetch parcels: < 200ms
- Fetch benchmarks (all unique products): < 300ms
- Calculate all parcels: < 100ms (pure Python math)
- Bulk update: < 200ms
- Network/overhead: < 200ms
- **Total**: ~1 second

**Current State**: 15 seconds (15x slower than target)
**Required Improvement**: 93% reduction in execution time

## Commands to Run

### Test endpoint timing:
```bash
time curl -s -X POST "http://localhost:8000/api/projects/9/recalculate-sfd/" -H "Content-Type: application/json"
```

### Test database connection:
```bash
PGPASSWORD=npg_bps3EShU9WFM /opt/homebrew/bin/psql \
  -h ep-spring-mountain-af3hdne2-pooler.c-2.us-west-2.aws.neon.tech \
  -U neondb_owner \
  -d land_v2 \
  -c "\timing on" \
  -c "SELECT COUNT(*) FROM landscape.tbl_parcel WHERE project_id = 9 AND type_code = 'SFD';"
```

### Check Django logs:
```bash
# Run Django with timing logs enabled, then call endpoint
python manage.py runserver
```

### Profile with cProfile:
```python
# Add to views.py temporarily
import cProfile
result = cProfile.run('recalculate_sfd_parcels(...)')
```

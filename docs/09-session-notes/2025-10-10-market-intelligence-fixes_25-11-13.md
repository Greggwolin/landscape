# Market Intelligence Page - Data Ingestion & UI Fixes

**Date**: October 10, 2025
**Duration**: ~3 hours
**Focus**: Market intelligence data population, FIPS code corrections, UI improvements

---

## Problem Summary

Market intelligence page was showing "NAV" (Not Available) for city and county-level economic indicators despite the data existing in external sources (Census Bureau, FRED).

## Root Causes Identified

### 1. Incorrect FIPS Codes in geo_xwalk
- **Peoria, AZ**: Had `place_fips = 57630` (incorrect)
  - Correct value: `54050`
  - Population: 198,753 (well above 65k threshold for ACS 1-year data)
  - Census API was returning 404 for all queries

- **Maricopa, AZ**: Missing all FIPS codes
  - Needed: `state_fips=04`, `county_fips=021`, `place_fips=44410`, `cbsa_code=38060`
  - Population: 71,021

### 2. Series Category Mismatches
ACS series had incorrect categories preventing UI queries from finding them:
```sql
-- Before
ACS_POPULATION: category='CITY' (wrong)
ACS_COUNTY_POPULATION: category='CITY' (wrong)

-- After
ACS_POPULATION: category='DEMOGRAPHICS', subcategory='Population'
ACS_COUNTY_POPULATION: category='DEMOGRAPHICS', subcategory='Population'
ACS_MEDIAN_HH_INC: category='INCOME', subcategory='Household Income'
```

### 3. UI Issues
- TRACT level showing as "TRACT" instead of "Tract"
- Row spacing too wide in data tables
- YoY calculations incorrect for percentage stats (showing % change instead of percentage point change)

---

## Solutions Implemented

### Database Corrections

**geo_xwalk Updates:**
```sql
-- Fix Peoria place_fips
UPDATE public.geo_xwalk
SET place_fips = '54050'
WHERE geo_id = '04-57630';

-- Add Peoria missing codes
UPDATE public.geo_xwalk
SET county_fips = '013', cbsa_code = '38060'
WHERE geo_id = '04-57630';

-- Add Maricopa complete FIPS codes
UPDATE public.geo_xwalk
SET state_fips = '04', county_fips = '021', place_fips = '44410', cbsa_code = '38060'
WHERE geo_id = '04-44410';
```

**market_series Category Fixes:**
```sql
-- Population series
UPDATE public.market_series
SET category = 'DEMOGRAPHICS', subcategory = 'Population'
WHERE series_code IN ('ACS_POPULATION', 'ACS_COUNTY_POPULATION', 'ACS_STATE_POPULATION');

-- Income series
UPDATE public.market_series
SET category = 'INCOME', subcategory = 'Household Income'
WHERE series_code IN ('ACS_MEDIAN_HH_INC', 'ACS_MSA_MEDIAN_HH_INC', 'ACS_TRACT_MEDIAN_HH_INC');

-- Households
UPDATE public.market_series
SET category = 'DEMOGRAPHICS', subcategory = 'Households'
WHERE series_code = 'ACS_HOUSEHOLDS';
```

### Data Ingestion (Python CLI)

Successfully ingested 48 total data points:

**Maricopa city (04-44410)**: 18 data points
```bash
cd services/market_ingest_py
.venv/bin/market-ingest \
  --geo-id 04-44410 \
  --project-id 8 \
  --series ACS_POPULATION ACS_HOUSEHOLDS ACS_MEDIAN_HH_INC \
  --start 2019-01-01 \
  --end 2024-12-31
```
- 6 years × 3 series = 18 rows in market_data

**Peoria city (04-57630)**: 18 data points
```bash
.venv/bin/market-ingest \
  --geo-id 04-57630 \
  --project-id 8 \
  --series ACS_POPULATION ACS_HOUSEHOLDS ACS_MEDIAN_HH_INC \
  --start 2019-01-01 \
  --end 2024-12-31
```
- 6 years × 3 series = 18 rows

**Pinal County (04021)**: 12 data points
```bash
.venv/bin/market-ingest \
  --geo-id 04021 \
  --project-id 8 \
  --series ACS_COUNTY_POPULATION ACS_COUNTY_MEDIAN_HH_INC \
  --start 2019-01-01 \
  --end 2024-12-31
```
- 6 years × 2 series = 12 rows

### Code Changes

**1. src/app/market/page.tsx**

Added county-level series codes to tiles:
```typescript
// Line 435-436: Population tile
<CombinedTile
  title="Population"
  multiGeoKPIs={getMultiGeoKPIData([
    'ACS_POPULATION',
    'ACS_COUNTY_POPULATION',  // Added
    'POP_COUNTY',
    'POP_MSA',
    'POP_STATE',
    'POP_US'
  ], (value) => formatNumber(value, 0))}
  // ...
/>

// Line 456-457: Median Income tile
<CombinedTile
  title="Median Household Income"
  multiGeoKPIs={getMultiGeoKPIData([
    'ACS_MEDIAN_HH_INC',
    'ACS_COUNTY_MEDIAN_HH_INC',  // Added
    'MEHOINUSAZA646N',
    'MEHOINUSA646N'
  ], (value) => `$${formatNumber(value, 0)}`)}
  // ...
/>
```

Fixed TRACT label display (lines 298-305):
```typescript
// Format geoLevel display
let geoLevelDisplay = level;
if (level === 'US') {
  geoLevelDisplay = 'United States';
} else if (level === 'TRACT') {
  geoLevelDisplay = 'Tract';  // Instead of showing "TRACT"
} else if (target?.geo_name) {
  geoLevelDisplay = target.geo_name;
}
```

Fixed YoY calculation for percentage stats (lines 271-324):
```typescript
// For percentage-based series, calculate incremental change (pp) instead of YoY %
const isPercentSeries = serie?.units?.toLowerCase().includes('percent');
let yoy: number | null = null;
if (serie && serie.data.length >= 13) {
  const last = serie.data[serie.data.length - 1];
  const priorIndex = serie.data.findIndex(/* find year-ago data */);
  if (priorIndex !== -1) {
    const current = asNumber(last.value);
    const prior = asNumber(serie.data[priorIndex].value);
    if (current != null && prior != null) {
      if (isPercentSeries) {
        // For percentage series, show incremental change (percentage points)
        yoy = current - prior;
      } else {
        // For non-percentage series, show percentage change
        if (prior !== 0) {
          yoy = ((current - prior) / prior) * 100;
        }
      }
    }
  }
}

// Format label
if (yoy != null) {
  if (isPercentSeries) {
    const sign = yoy >= 0 ? '+' : '';
    changeLabel = `${sign}${yoy.toFixed(1)} pp`;  // percentage points
  } else {
    changeLabel = `${yoy.toFixed(1)}% YoY`;
  }
}
```

**2. src/app/market/components/CombinedTile.tsx**

Tightened row spacing (lines 198-202):
```typescript
// Before: space-y-1, py-1
<div className="mb-4 space-y-0.5">  // Reduced from space-y-1
  {multiGeoKPIs.map((geoKPI, idx) => (
    <div
      className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-gray-800/50"  // py-1 → py-0.5
    >
```

---

## Files Modified

```
M Documentation/App-Development-Status.md
M services/market_ingest_py/README.md
M src/app/market/page.tsx
M src/app/market/components/CombinedTile.tsx
```

Database changes (not tracked in git):
- `public.geo_xwalk`: 2 rows updated (Peoria, Maricopa FIPS codes)
- `public.market_series`: 7 rows updated (ACS category corrections)
- `public.market_data`: 48 rows inserted (ACS data 2019-2024)

---

## Testing & Validation

### Verification Queries
```sql
-- Confirm FIPS codes
SELECT geo_id, geo_name, state_fips, county_fips, place_fips
FROM public.geo_xwalk
WHERE geo_id IN ('04-44410', '04-57630', '04021');

-- Confirm data ingested
SELECT
  gx.geo_id,
  gx.geo_name,
  ms.series_code,
  COUNT(md.date) as data_points,
  MIN(md.date) as earliest,
  MAX(md.date) as latest
FROM public.market_data md
JOIN public.market_series ms ON ms.series_id = md.series_id
JOIN public.geo_xwalk gx ON gx.geo_id = md.geo_id
WHERE gx.geo_id IN ('04-44410', '04-57630', '04021')
  AND ms.series_code LIKE 'ACS%'
GROUP BY gx.geo_id, gx.geo_name, ms.series_code
ORDER BY gx.geo_id, ms.series_code;
```

### UI Testing
- ✅ Red Valley project (Maricopa, AZ) shows city, county, MSA, state, US data
- ✅ Tract label displays as "Tract" not "TRACT"
- ✅ Row spacing tightened appropriately
- ✅ Unemployment rate YoY shows "+1.0 pp" instead of "+20.0% YoY"
- ✅ Population YoY shows "10.0% YoY" correctly

---

## Key Learnings

### 1. FIPS Code Validation is Critical
Always verify FIPS codes before running ingestion to avoid wasted API calls:
```bash
# Test with Census API directly
curl "https://api.census.gov/data/2023/acs/acs1?get=NAME,B01001_001E&for=place:54050&in=state:04&key=..."
```

### 2. geo_id vs FIPS Codes
- `geo_id` (e.g., "04-57630") is an **arbitrary identifier** used internally
- It does NOT have to match `place_fips` (54050)
- What matters: `place_fips` must be correct for Census API queries

### 3. Series Coverage Levels
Each series has a specific `coverage_level`:
- City data: Use `ACS_POPULATION`, `ACS_MEDIAN_HH_INC` (coverage_level='CITY')
- County data: Use `ACS_COUNTY_POPULATION`, `ACS_COUNTY_MEDIAN_HH_INC` (coverage_level='COUNTY')
- Can't mix - need separate series codes per geo level

### 4. Census ACS 1-Year Threshold
ACS 1-year estimates only published for places with population ≥65,000:
- ✅ Peoria (198,753): Has 1-year data
- ✅ Maricopa (71,021): Has 1-year data
- ❌ Smaller cities: Only 5-year estimates available

### 5. Python Integration Architecture
- Market ingestion is a **standalone Python CLI** tool
- **Database-only integration** - no direct API calls from Next.js to Python
- Future enhancements possible: background workers, scheduled jobs, ML/analytics
- Current workflow: Manual CLI runs → Database writes → Next.js reads via SQL

---

## Future Enhancements

### Short-term
1. **Automated worker** to process `market_fetch_job` queue
2. **Scheduled refresh** for stale data (weekly/monthly based on series)
3. **FIPS validation** endpoint to check codes before ingestion

### Medium-term
1. **Tract-level population data** (currently only median income available)
2. **More series coverage** for smaller cities (use 5-year ACS estimates)
3. **Data quality checks** (detect outliers, missing periods)

### Long-term
1. **Predictive analytics** (market trend forecasting)
2. **Automated reporting** (periodic market summaries)
3. **ML-based data enrichment** (fill gaps with predictions)

---

## Status

✅ **Complete** - Market intelligence page now fully functional with city, county, tract, MSA, state, and US-level data for Arizona projects.

# Landscape Database Market Data Audit

**Date:** February 22, 2026  
**Database:** land_v2 (Neon PostgreSQL)  
**Schema:** public (market data), landscape (project data)

---

## Executive Summary

The Landscape database has **7,693 market data points** across **64 active market series** and **17 geographic areas**. Data spans 2010-2024. However, there are critical gaps that limit real-world usability:

1. **Geographic coverage incomplete** — Only 7 cities, 3 counties, 2 MSAs populated (limited to AZ and CA)
2. **Missing series data** — 30+ active series have zero data points (setup but not populated)
3. **Peoria Lakes project mismatch** — Project is in Scottsdale, AZ, but data only exists for Peoria city (different city)
4. **No market_assumptions table** — Intended for storing user-configured assumptions (exists in schema but has 0 rows)

---

## Market Data Inventory

### Overview
| Metric | Count |
|--------|-------|
| Total data points | 7,693 |
| Active series | 64 |
| Series with data | 34 |
| Series without data | 30 |
| Geographic locations | 17 |
| Locations with data | 6 |

### Data Availability by Time Range
| Period | Coverage |
|--------|----------|
| 2010-2019 | Population, permits, MSA data |
| 2020-2024 | Comprehensive (all categories) |
| Latest data | December 2024 (except mortgage data: November 2024) |

---

## Geographic Coverage

### Cities (7 total, 4 with market data)
| City | State | Geo ID | Series | Data Points | Key Data |
|------|-------|--------|--------|-------------|----------|
| **Peoria** | AZ | 04-57630 | 18 | 1,232 | Demographics, housing, income, labor, prices |
| **Phoenix** | AZ | 04-55000 | 17 | 1,169 | Demographics, housing, income, labor, prices |
| **Gilbert** | AZ | 04-27820 | 17 | 1,169 | Demographics, housing, income, labor, prices |
| Maricopa | AZ | 04-44410 | 3 | 18 | Limited (population only) |
| Hawthorne | CA | 06-33000 | 0 | 0 | — |
| Long Beach | CA | 06-43000 | 0 | 0 | — |
| Los Angeles | CA | 06-44000 | 0 | 0 | — |

### Counties (3 total)
| County | State | Geo ID | Series with Data |
|--------|-------|--------|-------------------|
| Maricopa | AZ | 04013 | 3 (population-only) |
| Pinal | AZ | 04021 | 0 |
| Los Angeles | CA | 06037 | 0 |

### Metropolitan Statistical Areas (2 total)
| MSA | Geo ID | Series with Data |
|-----|--------|-------------------|
| Phoenix-Mesa-Chandler | 38060 | 3 (population-only) |
| Los Angeles-Long Beach-Anaheim | 31080 | 0 |

### Census Tracts (2 total)
- FIPS 17.14 (Illinois) — 0 data points
- FIPS 6108 (California) — 0 data points

### Other
- United States (National) — geo_id = US — Covered in some series

---

## Market Series by Category

### 1. Building Permits Survey (BPS) — 3 series
| Code | Name | Data Points | Status |
|------|------|-------------|--------|
| BPS_TOTAL | Total Units | 0 | ❌ No data |
| BPS_FIVEPLUS | 5+ Unit Units | 0 | ❌ No data |
| BPS_ONEUNIT | One-Unit Units | 0 | ❌ No data |

### 2. Demographics — 8 series
| Code | Name | Data Points | Latest | Status |
|------|------|-------------|--------|--------|
| ACS_POPULATION | Total Population | 1,232 | Jan 2024 | ✅ Active (AZ cities) |
| ACS_HOUSEHOLDS | Total Households | 340 | Jan 2024 | ✅ Active (AZ cities) |
| ACS_COUNTY_POPULATION | County Population | 2 | Jan 2024 | ✅ Minimal (Maricopa only) |
| POP_MSA | MSA Population | 15 | 2024 | ✅ Minimal (Phoenix MSA) |
| POP_STATE | State Population | 15 | 2024 | ✅ Arizona only |
| POP_COUNTY | County Population | 15 | 2024 | ✅ Maricopa only |
| POP_US | US Population | 15 | 2024 | ✅ National |
| ACS_STATE_POPULATION | State Population (ACS) | 0 | — | ❌ No data |

### 3. Housing — 26 series
**High-activity series (with data):**
- HSN1F, HSN1FNSA — New one-family houses sold (60 points, 2020-2024)
- FHFA_HPI_US_NSA, FHFA_HPI_US_SA — House price indices (20 points, 2020-2024)
- PERMIT_MSA_1UNIT — MSA permits 1-unit (60 points, 2020-2024)
- SPCS20RNSA, SPCS20RSA — S&P Case-Shiller 20 index (60 points, 2020-2024)
- MSPNHSUS — Median new home sales price (60 points, 2020-2024)

**Zero-data series:**
- EXHOSLUSM495S, EXHOSLUSM495SNSA — Existing home sales (planned but empty)
- FHFA_HPI_MSA_NSA, FHFA_HPI_MSA_SA — MSA HPI (planned but empty)
- FHFA_HPI_STATE_NSA, FHFA_HPI_STATE_SA — State HPI (only STATE_SA has 20 points)
- PERMIT_PLACE_* — Place-level permits (all empty)
- PERMIT_1UNIT, PERMIT_5PLUS, PERMIT_TOTAL — City permits (all empty)
- HOSMEDUSM052N — Median home price (empty)

### 4. Income — 9 series
**With data:**
- ACS_MEDIAN_HH_INC — Median household income (1,232 points)
- ACS_COUNTY_MEDIAN_HH_INC — County median HH income (30 points)
- ACS_MSA_MEDIAN_HH_INC — MSA median HH income (15 points)

**Without data:** 6 other income series

### 5. Labor — 9 series
**With data:**
- PAYEMS — Total nonfarm payroll employment (1,169 points, 2020-2024)

**Without data:** 8 other labor series

### 6. Prices & Rates — 9 series
**With data:**
- CPIAUCNS, CPIAUCSL — Consumer price index (120 points, 2020-2024)
- MORTGAGE30US, MORTGAGE15US — Mortgage rates (514 points, 2020-2024)
- FEDFUNDS — Federal funds rate (60 points, 2020-2024)
- PPIACO — Producer price index (60 points, 2020-2024)

**Without data:** 4 other price series

---

## Critical Issues

### Issue 1: Peoria Lakes Project Geography Mismatch

**Problem:**
- Peoria Lakes project is configured with `jurisdiction_city: "Scottsdale"`, `jurisdiction_state: "AZ"`
- But Scottsdale is NOT in the geo_xwalk table
- Only Peoria city (04-57630) has data

**Impact:** 
- Project cannot automatically match to market data
- "Market" tab would return zero data for Peoria Lakes

**Current Project Locations:**
```
Project ID 77: Peoria Lakes (Demo - admin)
  - City: Scottsdale
  - State: AZ
  - Matching geo: NONE (Scottsdale not in database)
```

**Solution Options:**
1. Update project to use `jurisdiction_city: "Peoria"` (same metro area, has data)
2. Add Scottsdale to geo_xwalk with market data
3. Allow project->county/MSA fallback (use Maricopa County or Phoenix MSA)

### Issue 2: Empty Series

30 out of 64 series have been defined but have zero data points. These are likely placeholders for future data ingestion. Examples:
- All "BPS" (Building Permits Survey) series
- All place-level permit series (PERMIT_PLACE_*)
- Existing home sales (EXHOSLUSM495*)
- Most state/MSA-specific housing indices

**Impact:**  
- UI shows available series even though no data exists
- Users will see "no data available" errors when selecting these series

### Issue 3: market_assumptions Table Empty

The `landscape.market_assumptions` table exists in schema but has 0 rows.

**Purpose:** Store user-configured assumptions (inflation rates, rent growth, etc.)

**Impact:**
- Financial engine cannot use custom market assumptions
- Would need to hardcode assumptions in calculations

### Issue 4: Limited Geographic Coverage

Only 6 of 17 geographic areas have data:
- Peoria, Phoenix, Gilbert cities (Arizona)
- Maricopa city (minimal data)
- Maricopa County (minimal)
- Phoenix MSA (minimal)
- US national data

**Missing:** 
- California cities (despite projects in CA)
- Los Angeles County and MSA (despite projects there)
- Pinal County
- All census tracts

---

## Data Quality Summary

### By Geographic Level
| Level | Coverage | Quality |
|-------|----------|---------|
| CITY | 4/7 with data | Good for AZ, none for CA |
| COUNTY | 1/3 with data | Maricopa only, minimal depth |
| MSA | 1/2 with data | Phoenix-Mesa only, minimal |
| TRACT | 0/2 | Empty |
| STATE | Partial | AZ covered, CA minimal |
| NATIONAL | Good | US data complete for most series |

### By Series Category
| Category | Coverage | Assessment |
|----------|----------|------------|
| DEMOGRAPHICS | 5/8 series | Good for AZ cities |
| HOUSING | 8/26 series | Very incomplete, major gaps |
| INCOME | 3/9 series | Partial, AZ focused |
| LABOR | 1/9 series | Minimal |
| PRICES_RATES | 4/9 series | Adequate for macro indicators |
| BPS | 0/3 series | No data |

---

## Data Freshness

| Series Type | Latest Update |
|-------------|----------------|
| Population (ACS) | January 2024 |
| Housing (new homes) | December 2024 |
| Prices/Rates | December 2024 |
| Mortgages | November 27, 2024 |
| Labor | December 2024 |

**Note:** Most data is current as of late 2024, except older Census data (2010+).

---

## Tables & Schema

### Core Market Tables
| Table | Rows | Purpose |
|-------|------|---------|
| `public.market_data` | 7,693 | Time series data points (series_id, geo_id, date, value) |
| `public.market_series` | 64 | Series definitions (code, name, category, frequency, coverage_level) |
| `public.geo_xwalk` | 17 | Geographic reference table (geo_id → geo_level, name, FIPS, etc.) |
| `public.market_fetch_job` | 50 | History of data ingestion jobs |
| `landscape.market_assumptions` | 0 | User-configured assumptions (EMPTY) |

### Table Relationships
```
market_series (series_id)
    ↓
    ├→ market_data (series_id) ← geo_xwalk (geo_id)
    └→ market_fetch_job (series_id)

tbl_project (jurisdiction_city, jurisdiction_state)
    ↓ (needs matching)
    geo_xwalk (usps_city, usps_state, geo_id)
        ↓ (has)
    market_data
```

---

## Recommendations

### Immediate (for Alpha)
1. **Fix Peoria Lakes geography** — Change to Peoria city or document limitation
2. **Add data fallback** — If city not found, try county → MSA → state → national
3. **Hide empty series** — Don't show 30 series with zero data points in UI

### Short-term (Phase 1)
1. **Ingest missing geographic data** — Add Scottsdale, CA cities to geo_xwalk
2. **Populate empty series** — Run data ingestion for BPS and permit series
3. **Seed market_assumptions** — Load default assumptions (inflation rates, etc.)

### Medium-term (Phase 2)
1. **Expand geographic coverage** — Full US city/county coverage
2. **Add more markets** — Historical data for all project locations
3. **Implement geographic hierarchy** — Auto-fallback when city data unavailable

---

## Appendix: Full Series Inventory

### Series With Data (34)
```
DEMOGRAPHICS (5):
  ✅ ACS_POPULATION (1,232 points)
  ✅ ACS_HOUSEHOLDS (340 points)
  ✅ ACS_COUNTY_POPULATION (2 points)
  ✅ POP_MSA (15 points)
  ✅ POP_STATE (15 points)
  ✅ POP_COUNTY (15 points)
  ✅ POP_US (15 points)
  ❌ ACS_STATE_POPULATION (0 points)

HOUSING (8):
  ✅ HSN1F (60 points)
  ✅ HSN1FNSA (60 points)
  ✅ MSPNHSUS (60 points)
  ✅ SPCS20RNSA (60 points)
  ✅ SPCS20RSA (60 points)
  ✅ FHFA_HPI_US_NSA (20 points)
  ✅ FHFA_HPI_US_SA (20 points)
  ✅ FHFA_HPI_STATE_SA (20 points)
  ✅ HPI_MSA (15 points)
  ✅ PERMIT_MSA_1UNIT (60 points)
  ✅ PERMIT1 (60 points)
  ✅ AZBP1FHSA (60 points)
  [18 more with zero data...]

INCOME (3):
  ✅ ACS_MEDIAN_HH_INC (1,232 points)
  ✅ ACS_COUNTY_MEDIAN_HH_INC (30 points)
  ✅ ACS_MSA_MEDIAN_HH_INC (15 points)

LABOR (1):
  ✅ PAYEMS (1,169 points)

PRICES_RATES (4):
  ✅ CPIAUCNS (60 points)
  ✅ CPIAUCSL (60 points)
  ✅ MORTGAGE30US (257 points)
  ✅ MORTGAGE15US (257 points)
  ✅ FEDFUNDS (60 points)
  ✅ PPIACO (60 points)
```

### Series Without Data (30)
BPS (3), HOUSING (18), INCOME (6), LABOR (8), PRICES_RATES (4)

---

**Database Connection:** Neon PostgreSQL (land_v2)  
**Last Updated:** 2026-02-22  
**Audit Performed By:** Claude Code Agent

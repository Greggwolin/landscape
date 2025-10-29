# Geography Data Setup Guide

## Problem

The Market Intelligence features require geography data in the `public.geo_xwalk` table. If you're setting up the app on a new machine and seeing 404 errors for cities like "Hawthorne, CA", it's because your local database is missing geography records.

## Symptoms

- API returns 404 for `/api/market/geos?city=Hawthorne&state=CA`
- Market data doesn't load for certain locations
- Only a few cities appear in the geography lookup

## Quick Fix: Run Migration Scripts

The migrations in this directory provide geography seed data:

1. **20251008_02_geo_seed.sql** - Arizona geography (Phoenix area)
2. **20251029_01_california_geo_seed.sql** - California geography (including Hawthorne, LA, SF, SD)

### Run on Local/Development Database

```bash
# Set your database URL
export DATABASE_URL="postgresql://username:password@host/database"

# Run the seed scripts
psql $DATABASE_URL -f db/migrations/20251008_02_geo_seed.sql
psql $DATABASE_URL -f db/migrations/20251029_01_california_geo_seed.sql
```

### Run on Neon Database

```bash
# Run Arizona data
psql "postgresql://neondb_owner:npg_XXXXX@ep-XXXXX.us-west-2.aws.neon.tech/neondb?sslmode=require" \
  -f db/migrations/20251008_02_geo_seed.sql

# Run California data
psql "postgresql://neondb_owner:npg_XXXXX@ep-XXXXX.us-west-2.aws.neon.tech/neondb?sslmode=require" \
  -f db/migrations/20251029_01_california_geo_seed.sql
```

## Complete Fix: Import Full Geography Data

If you need comprehensive US geography data (all states, counties, MSAs, cities), you should export it from a working machine:

### On Working Machine (with full geo data)

```bash
# Export the full geo_xwalk table
pg_dump $DATABASE_URL \
  -t public.geo_xwalk \
  --data-only \
  --column-inserts \
  > geo_xwalk_full_export.sql
```

### On New Machine

```bash
# Import the full data
psql $DATABASE_URL < geo_xwalk_full_export.sql
```

## Verify Setup

After running the migrations, verify the data:

```sql
-- Check total records
SELECT COUNT(*) as total_records FROM public.geo_xwalk;

-- Check by level
SELECT geo_level, COUNT(*) as count
FROM public.geo_xwalk
GROUP BY geo_level
ORDER BY count DESC;

-- Verify specific cities
SELECT geo_id, geo_name, usps_city, usps_state
FROM public.geo_xwalk
WHERE geo_level = 'CITY'
  AND usps_state IN ('CA', 'AZ')
ORDER BY usps_state, usps_city;

-- Test Hawthorne lookup
SELECT * FROM public.geo_xwalk
WHERE lower(usps_city) = 'hawthorne'
  AND upper(usps_state) = 'CA';
```

Expected results after running both seed scripts:
- Total records: ~15-20 (minimal seed)
- State records: 2 (Arizona, California)
- City records: ~6-7 (Phoenix, Hawthorne, Los Angeles, San Francisco, San Diego, etc.)

## Geography Data Structure

Each record in `geo_xwalk` represents a geographic entity with:

- **geo_id**: Unique identifier (e.g., `06-33000` for Hawthorne, CA)
- **geo_level**: Type of geography (US, STATE, MSA, COUNTY, CITY)
- **geo_name**: Official name (e.g., "Hawthorne city")
- **state_fips**: 2-digit state FIPS code (e.g., `06` for California)
- **county_fips**: 3-digit county FIPS code (e.g., `037` for Los Angeles County)
- **place_fips**: 5-digit place FIPS code (e.g., `33000` for Hawthorne)
- **cbsa_code**: Core-Based Statistical Area code for MSAs
- **usps_city**: City name as used by USPS (e.g., "Hawthorne")
- **usps_state**: 2-letter state abbreviation (e.g., "CA")
- **parent_geo_id**: Reference to parent geography in the hierarchy

## Hierarchy Structure

The system uses a hierarchical approach:

```
US
└── STATE (e.g., California, Arizona)
    ├── MSA (e.g., Los Angeles-Long Beach-Anaheim MSA)
    ├── COUNTY (e.g., Los Angeles County, Maricopa County)
    └── CITY (e.g., Hawthorne, Phoenix)
```

## Adding New Cities

To add a new city, you need to:

1. Look up the FIPS codes at [Census.gov](https://www.census.gov/library/reference/code-lists/ansi.html)
2. Create an INSERT statement following this pattern:

```sql
-- State (if not already exists)
INSERT INTO public.geo_xwalk (
  geo_id, geo_level, geo_name, state_fips,
  parent_geo_id, usps_state
)
VALUES ('XX', 'STATE', 'State Name', 'XX', 'US', 'XX')
ON CONFLICT (geo_id) DO NOTHING;

-- County (if not already exists)
INSERT INTO public.geo_xwalk (
  geo_id, geo_level, geo_name, state_fips, county_fips,
  parent_geo_id
)
VALUES ('XXYYY', 'COUNTY', 'County Name', 'XX', 'YYY', 'XX')
ON CONFLICT (geo_id) DO NOTHING;

-- City
INSERT INTO public.geo_xwalk (
  geo_id, geo_level, geo_name, state_fips, place_fips,
  parent_geo_id, usps_city, usps_state
)
VALUES (
  'XX-ZZZZZ', 'CITY', 'City Name', 'XX', 'ZZZZZ',
  'XXYYY', 'CityName', 'XX'
)
ON CONFLICT (geo_id) DO UPDATE
SET usps_city = EXCLUDED.usps_city,
    usps_state = EXCLUDED.usps_state;
```

## Related Documentation

- Market Ingestion Engine: [services/market_ingest_py/README.md](../../services/market_ingest_py/README.md)
- Market Core Schema: [20251008_01_market_core.sql](./20251008_01_market_core.sql)

## Troubleshooting

### "City not found in geo_xwalk"

Check if the city has the correct `usps_city` and `usps_state` values:

```sql
SELECT * FROM public.geo_xwalk
WHERE lower(usps_city) LIKE '%yourtown%';
```

### "Missing FIPS codes"

If Census API calls fail, verify FIPS codes:

```sql
SELECT geo_id, geo_name, state_fips, county_fips, place_fips
FROM public.geo_xwalk
WHERE geo_id = 'your-geo-id';
```

Update if needed:

```sql
UPDATE public.geo_xwalk
SET state_fips = 'XX', place_fips = 'YYYYY'
WHERE geo_id = 'your-geo-id';
```

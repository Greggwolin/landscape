# Quick Setup: Fix Missing Geography Data

## The Problem

After syncing the repo to a new machine, Market Intelligence features fail with 404 errors for cities like "Hawthorne, CA". This is because your local database is missing geography reference data.

## The Solution (3 minutes)

### Option 1: Run the Automated Script (Easiest)

```bash
cd /Users/5150east/landscape

# Set your database connection
export DATABASE_URL="postgresql://your_connection_string"

# Run the seed script
./db/migrations/run_geo_seeds.sh
```

This will:
- ✅ Load Arizona geography (Phoenix area)
- ✅ Load California geography (Hawthorne, LA, SF, SD)
- ✅ Show you before/after stats
- ✅ Verify the data loaded correctly

### Option 2: Manual SQL Execution

```bash
# Set your database connection
export DATABASE_URL="postgresql://your_connection_string"

# Run Arizona seed
psql $DATABASE_URL -f db/migrations/20251008_02_geo_seed.sql

# Run California seed
psql $DATABASE_URL -f db/migrations/20251029_01_california_geo_seed.sql
```

### For Neon Database

```bash
export DATABASE_URL="postgresql://neondb_owner:npg_XXXXX@ep-XXXXX.us-west-2.aws.neon.tech/neondb?sslmode=require"

./db/migrations/run_geo_seeds.sh
```

## Verify It Worked

### Test in SQL

```sql
-- Should return Hawthorne, CA
SELECT * FROM public.geo_xwalk
WHERE lower(usps_city) = 'hawthorne' AND upper(usps_state) = 'CA';
```

### Test the API

```bash
# Should return 200 with geo data
curl 'http://localhost:3000/api/market/geos?city=Hawthorne&state=CA'
```

## What This Does

The seed scripts populate the `public.geo_xwalk` table with:

- **US** - United States (national level)
- **2 States** - Arizona, California
- **5 MSAs** - Phoenix, LA, SF, SD metropolitan areas
- **5 Counties** - Maricopa, LA, SF, SD counties
- **6+ Cities** - Phoenix, Hawthorne, Los Angeles, San Francisco, San Diego

Each geography includes:
- FIPS codes (required for Census API calls)
- USPS city/state names (required for city lookups)
- Hierarchical relationships (city → county → state → US)

## Need More Cities?

### Quick Add Pattern

Create a new migration file `db/migrations/20251029_02_add_your_city.sql`:

```sql
-- Your State (if needed)
INSERT INTO public.geo_xwalk (
  geo_id, geo_level, geo_name, state_fips,
  parent_geo_id, usps_state
)
VALUES ('TX', 'STATE', 'Texas', '48', 'US', 'TX')
ON CONFLICT (geo_id) DO NOTHING;

-- Your County (if needed)
INSERT INTO public.geo_xwalk (
  geo_id, geo_level, geo_name, state_fips, county_fips,
  parent_geo_id
)
VALUES ('48201', 'COUNTY', 'Harris County', '48', '201', 'TX')
ON CONFLICT (geo_id) DO NOTHING;

-- Your City
INSERT INTO public.geo_xwalk (
  geo_id, geo_level, geo_name, state_fips, place_fips,
  parent_geo_id, usps_city, usps_state
)
VALUES (
  '48-35000', 'CITY', 'Houston city', '48', '35000',
  '48201', 'Houston', 'TX'
)
ON CONFLICT (geo_id) DO UPDATE
SET usps_city = EXCLUDED.usps_city,
    usps_state = EXCLUDED.usps_state;
```

Look up FIPS codes at: https://www.census.gov/library/reference/code-lists/ansi.html

### Or Export Full Data From Working Machine

```bash
# On machine with full data
pg_dump $DATABASE_URL -t public.geo_xwalk --data-only --column-inserts > geo_full.sql

# On new machine
psql $DATABASE_URL < geo_full.sql
```

## Documentation

Full details: [db/migrations/README_GEO_SETUP.md](db/migrations/README_GEO_SETUP.md)

## Troubleshooting

### "relation 'public.geo_xwalk' does not exist"

Run the core market schema first:

```bash
psql $DATABASE_URL -f db/migrations/20251008_01_market_core.sql
```

### "Still getting 404 errors"

Check the API is looking up the correct city name:

```sql
-- Find similar city names
SELECT usps_city, usps_state, geo_name
FROM public.geo_xwalk
WHERE usps_city ILIKE '%yourtown%';
```

### "Need to reset and start over"

```sql
-- WARNING: This deletes all geo data
TRUNCATE public.geo_xwalk CASCADE;

-- Then re-run the seed scripts
```

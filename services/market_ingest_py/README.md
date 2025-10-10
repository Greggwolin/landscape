# Market Ingestion Engine (v1)

This Poetry project powers the Landscape Market Analysis Engine. It fetches
macro-to-micro economic series (US -> State -> MSA -> County -> City/Place), normalizes
the payloads, and writes results into the `public.market_*` tables added in
`20251008_01_market_core.sql`.

## Project Layout

```
market_ingest/
  config.py        # env loading + bundle definitions
  db.py            # Neon/Postgres upserts + lineage bookkeeping
  fred_client.py   # FRED API integration (used by FRED/SPCS/FHFA series)
  census_client.py # ACS + Building Permits Survey helpers
  bls_client.py    # LAUS (labor statistics)
  fhfa_client.py   # FHFA HPI -> FRED mapping wrapper
  geo.py           # geo_xwalk utilities
  normalize.py     # shared normalization primitives
  runner.py        # CLI entry point (`poetry run market-ingest ...`)
```

## Setup

```bash
cd services/market_ingest_py
poetry install
```

Expected environment variables (12-factor style):

- `NEON_DB_URL` - Postgres/Neon connection string (`postgresql://...`)
- `FRED_API_KEY` - required for all FRED/SPCS/FHFA series
- `CENSUS_API_KEY` - optional, used for ACS/BPS
- `BLS_API_KEY` - optional, enables higher throughput for LAUS calls

You can place them in `.env` before running commands:

```bash
cat > .env <<'ENV'
NEON_DB_URL=postgresql://...
FRED_API_KEY=your_fred_token
CENSUS_API_KEY=optional_census_token
BLS_API_KEY=optional_bls_token
ENV
```

## Usage

Fetch a macro bundle for a project city (auto-expands to County -> MSA -> State -> US):

```bash
poetry run market-ingest \
  --project "Phoenix,AZ" \
  --start 2015-01-01 \
  --end 2024-12-01 \
  --bundle macro_v1 \
  --project-id 7
```

Ad-hoc pull for specific series and explicit geography:

```bash
poetry run market-ingest \
  --geo-level STATE \
  --geo-id 04 \
  --series CPIAUCSL CPIAUCNS FHFA_HPI_STATE_SA FHFA_HPI_STATE_NSA \
  --start 2000-01-01 \
  --end 2024-12-01
```

Add `--dry-run` to inspect fetch counts without writing to the database.

Each successful run:

1. Inserts/updates time series observations in `public.market_data`
2. Ensures `market_series` metadata exists (pre-seeded via `seed/market_series_v1.csv`)
3. Writes a `public.market_fetch_job` row with params, source summary, and stats
4. Records lineage in `landscape.ai_ingestion_history` (`package_name = 'market_ingest_v1'`)

Coverage fallbacks (e.g., CITY metrics unavailable) are duplicated from the nearest
parent level with `coverage_note` annotations for downstream UI display.

## Development Tips

- Run `poetry run market-ingest --help` for the full CLI.
- Logging uses [loguru](https://github.com/Delgan/loguru); set `LOGURU_LEVEL=DEBUG`
  for verbose HTTP traces.
- The ingestion engine assumes the geo spine from `public.geo_xwalk` is populated.
  Use the city resolver (`--project "City,ST"`) to verify the hierarchy and parent links.
- Extend bundles by editing `DEFAULT_BUNDLES` in `config.py`.

## Common Issues & Troubleshooting

### Census API Returns 404

**Symptom**: Warnings like `ACS data missing for series ACS_POPULATION geo 04-57630 year 2023`

**Causes**:
1. **Missing or incorrect FIPS codes** in `geo_xwalk`:
   - City data requires: `state_fips`, `place_fips`
   - County data requires: `state_fips`, `county_fips`
   - Tract data requires: `state_fips`, `county_fips`, `tract_fips` (11-digit)

2. **Population below threshold**: ACS 1-year estimates only available for places with population ≥65,000

**Fix**:
```sql
-- Verify FIPS codes
SELECT geo_id, geo_name, state_fips, county_fips, place_fips, tract_fips
FROM public.geo_xwalk
WHERE geo_id = 'XX-XXXXX';

-- Update missing codes
UPDATE public.geo_xwalk
SET state_fips = '04', place_fips = '54050'
WHERE geo_id = '04-57630';
```

### Series Not Fetching for Certain Geo Levels

**Symptom**: County data not showing up even though series exists

**Cause**: Series `coverage_level` mismatch. Each series has a specific coverage level (CITY, COUNTY, MSA, STATE, TRACT, US).

**Fix**: Use the geo-level specific series codes:
- City: `ACS_POPULATION`, `ACS_MEDIAN_HH_INC`
- County: `ACS_COUNTY_POPULATION`, `ACS_COUNTY_MEDIAN_HH_INC`
- Tract: `ACS_TRACT_MEDIAN_HH_INC`

```bash
# For county-level data
.venv/bin/market-ingest --geo-id 04021 \
  --series ACS_COUNTY_POPULATION ACS_COUNTY_MEDIAN_HH_INC \
  --start 2019-01-01 --end 2024-12-31
```

### Data Ingested But Not Showing in UI

**Cause**: Series category mismatch. The UI queries by category (DEMOGRAPHICS, INCOME, etc.).

**Fix**: Verify series categories match UI expectations:
```sql
SELECT series_code, category, subcategory, coverage_level
FROM public.market_series
WHERE source = 'ACS';

-- Update if needed
UPDATE public.market_series
SET category = 'DEMOGRAPHICS', subcategory = 'Population'
WHERE series_code IN ('ACS_POPULATION', 'ACS_COUNTY_POPULATION');
```

## Session Notes: October 10, 2025

Successfully ingested ACS data for Arizona projects:
- **Maricopa city** (geo_id: 04-44410): 18 data points across 3 series (2019-2024)
- **Peoria city** (geo_id: 04-57630): 18 data points across 3 series (2019-2024)
- **Pinal County** (geo_id: 04021): 12 data points across 2 series (2019-2024)

Key learnings:
1. Peoria had wrong place_fips (57630 vs correct 54050) - Census API was failing silently
2. geo_id format (04-57630) doesn't need to match place_fips - it's an arbitrary identifier
3. Always verify FIPS codes before running ingestion to avoid wasted API calls

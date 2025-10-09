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

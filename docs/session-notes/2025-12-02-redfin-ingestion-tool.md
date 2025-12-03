# Redfin Ingestion Tool Implementation

**Date**: December 2, 2025
**Duration**: ~2 hours
**Focus**: Integrating Redfin sold comps into the unified ingestion architecture

---

## Summary

Implemented a full Python-based Redfin ingestion tool that fetches sold home comparables from Redfin's public Stingray CSV API, normalizes them to `UnifiedResaleClosing` models, and persists them to the `landscape.bmk_resale_closings` table in Neon PostgreSQL. This completes the resale data side of the builder + resale ingestion stack.

## Major Accomplishments

### 1. Redfin Ingestion Tool Created

Created a complete ingestion tool under `backend/tools/redfin_ingest/` following the same patterns as `lennar_offerings`:

- **config.py**: `RedfinConfig` dataclass with search parameters (center lat/lng, radius, sold_within_days, min_year_built, property_type, etc.)
- **schemas.py**: `RedfinComp` raw data type mirroring the TypeScript interface
- **client.py**: Python port of `src/lib/redfinClient.ts` with:
  - Haversine distance calculation
  - Bounding box polygon generation
  - CSV parsing with proper quote handling
  - Redfin date format parsing ("Month-DD-YYYY" to ISO)
- **run_redfin_ingest.py**: CLI entrypoint with `--output-mode` and `--persist` flags

### 2. Redfin Adapter Added

Created `backend/tools/common/adapters/redfin_adapter.py` with:
- `to_unified_resale_closing()` - Transform single RedfinComp
- `to_unified_resale_closings()` - Transform multiple comps

Mapping follows the architecture doc:
- `mlsId` -> `source_id`
- `address` -> `address_line1`
- `salePrice` -> `sale_price`
- `soldDate` -> `sale_date` (ISO format)
- `source` hardcoded as "redfin"

### 3. Database Migration Applied

Created and applied `027_create_bmk_resale_closings.sql`:
- Table with all `UnifiedResaleClosing` fields
- Unique constraint on `(source, source_id)` for upsert
- Indexes on `source`, `sale_date`, `(city, state)`, `(lat, lng)`, `year_built`

### 4. Persistence Layer Extended

Added to `backend/tools/common/persistence.py`:
- `upsert_resale_closings()` - Bulk upsert with ON CONFLICT handling
- `persist_redfin_closings()` - Convenience wrapper with connection management

### 5. Testing Verified

Tested against Phoenix market config:
- Fetched 7 new construction comps (2023+)
- First run: 7 inserted, 0 updated
- Second run: 0 inserted, 7 updated (upsert working correctly)

## Files Modified

### New Files Created:
- `backend/tools/redfin_ingest/__init__.py`
- `backend/tools/redfin_ingest/config.py`
- `backend/tools/redfin_ingest/schemas.py`
- `backend/tools/redfin_ingest/client.py`
- `backend/tools/redfin_ingest/run_redfin_ingest.py`
- `backend/tools/common/adapters/redfin_adapter.py`
- `backend/db/migrations/027_create_bmk_resale_closings.sql`
- `redfin_phx_config.json` (sample config)
- `docs/session-notes/2025-12-02-redfin-ingestion-tool.md`

### Files Modified:
- `backend/tools/common/adapters/__init__.py` - Export redfin adapter functions
- `backend/tools/common/persistence.py` - Add resale closings upsert functions

## Architecture Notes

The Redfin tool follows the same structural pattern as `lennar_offerings`:

```
backend/tools/redfin_ingest/
├── __init__.py
├── config.py        # RedfinConfig dataclass + load_config()
├── schemas.py       # RedfinComp raw data type
├── client.py        # RedfinClient with fetch_comps()
├── run_redfin_ingest.py  # CLI entrypoint
└── logs/
    └── redfin_ingest.log
```

## CLI Usage

```bash
# Source mode (raw RedfinComp JSON)
python -m backend.tools.redfin_ingest.run_redfin_ingest \
  --config-path redfin_phx_config.json \
  --output-mode source

# Unified mode (UnifiedResaleClosing list)
python -m backend.tools.redfin_ingest.run_redfin_ingest \
  --config-path redfin_phx_config.json \
  --output-mode unified

# Persist to Neon
export DATABASE_URL="postgresql://..."
python -m backend.tools.redfin_ingest.run_redfin_ingest \
  --config-path redfin_phx_config.json \
  --persist
```

## Database Queries

```sql
-- Count by source
SELECT source, COUNT(*) FROM landscape.bmk_resale_closings GROUP BY source;

-- Recent closings
SELECT sale_date, sale_price, city, state, sqft, year_built
FROM landscape.bmk_resale_closings
WHERE source = 'redfin'
ORDER BY sale_date DESC
LIMIT 20;
```

## Next Steps

1. Add NHS resale adapter (similar to Redfin)
2. Wire up napkin mode to query `bmk_resale_closings` for pricing benchmarks
3. Add market-level aggregation queries
4. Consider adding `builder_name` detection from Redfin data (subdivision patterns)

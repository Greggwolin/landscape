# Market Data Ingestion Tools - HBACA & Zonda

**Date**: December 3, 2025
**Duration**: ~3 hours
**Focus**: Building market activity and subdivision inventory data pipelines

---

## Summary

Implemented two major data ingestion tools for market intelligence: HBACA permit activity (demand-side) and Zonda subdivisions (supply-side). Also cleaned up ~560k lines of bloat from git tracking (archive directories, .pyc files, virtual environments).

## Major Accomplishments

### 1. Repository Cleanup

Removed tracked bloat from the git repository:

- **Before**: 1,324,010 total lines
- **After**: 764,013 total lines
- **Reduction**: 560,000 lines (42%)

Cleaned:
- `archive/` directory (189,936 lines)
- `backup_phase3e_*/` directories
- `.pyc`, `.pyo`, `.pyd` files
- `services/market_ingest_py/.venv/`

Updated `.gitignore` with patterns for:
- Python cache/bytecode: `__pycache__/`, `*.pyc`, `*.pyo`, `*.pyd`
- Virtual environments: `.venv/`, `venv/`
- Archive directories: `archive/`, `backup_*/`

### 2. HBACA Permit Activity Ingestion Tool

Created `backend/tools/hbaca_ingest/` for ingesting Home Builders Association of Central Arizona permit data:

**Files Created:**
- `__init__.py` - Package exports
- `schemas.py` - `MarketActivityRecord` dataclass
- `parser.py` - Excel parser with month-name detection, jurisdiction mapping, skip row handling
- `run_hbaca_ingest.py` - CLI with `--dry-run` and `--persist` flags

**Database:**
- Migration: `028_create_market_activity.sql`
- Table: `landscape.market_activity`
- Schema: flexible design for permits, closings, starts with multi-geography support

**Results:**
- 9,392 records imported from HBACA permit Excel file
- All Phoenix MSA jurisdictions populated
- Monthly permit counts from 2020-present

### 3. Zonda Subdivision Inventory Ingestion Tool

Created `backend/tools/zonda_ingest/` for ingesting Zonda market research subdivision data:

**Files Created:**
- `__init__.py` - Package exports
- `schemas.py` - `ZondaSubdivision` dataclass
- `parser.py` - Excel parser with product code parsing (45x115 → width/depth)
- `run_zonda_ingest.py` - CLI with deduplication logic, upsert handling

**Database:**
- Migration: `029_create_zonda_subdivisions.sql`
- Table: `landscape.zonda_subdivisions`
- Schema: builder, lot dimensions, inventory, pricing, location

**Results:**
- 704 records imported (deduplicated from 706 in source)
- 691 unique projects, 96 unique builders
- Lot widths: 45ft (127), 50ft (122), 60ft (63)
- Price range: $263,800 - $11,295,000

**Fix Applied:**
- Added deduplication logic before bulk insert to handle duplicate (project_name, product_code) combinations in source data
- Prevents `CardinalityViolation` error from ON CONFLICT clause

## Files Modified

### New Files Created:
- `backend/db/migrations/028_create_market_activity.sql`
- `backend/db/migrations/029_create_zonda_subdivisions.sql`
- `backend/tools/hbaca_ingest/__init__.py`
- `backend/tools/hbaca_ingest/schemas.py`
- `backend/tools/hbaca_ingest/parser.py`
- `backend/tools/hbaca_ingest/run_hbaca_ingest.py`
- `backend/tools/zonda_ingest/__init__.py`
- `backend/tools/zonda_ingest/schemas.py`
- `backend/tools/zonda_ingest/parser.py`
- `backend/tools/zonda_ingest/run_zonda_ingest.py`

### Files Modified:
- `.gitignore` - Added Python cache, venv, and archive patterns

## CLI Usage

### HBACA Permits

```bash
# Dry run - parse only
python -m backend.tools.hbaca_ingest.run_hbaca_ingest \
  --file HBACA-Permits.xlsx \
  --dry-run

# Persist to database
python -m backend.tools.hbaca_ingest.run_hbaca_ingest \
  --file HBACA-Permits.xlsx \
  --persist
```

### Zonda Subdivisions

```bash
# Dry run - parse only
python -m backend.tools.zonda_ingest.run_zonda_ingest \
  --file Zonda-Phx_Nov2025.xlsx \
  --dry-run

# Persist to database
python -m backend.tools.zonda_ingest.run_zonda_ingest \
  --file Zonda-Phx_Nov2025.xlsx \
  --persist
```

## Database Queries

```sql
-- HBACA: Top jurisdictions by permits
SELECT geography_name, SUM(value) AS total_permits
FROM landscape.market_activity
WHERE source = 'HBACA' AND metric_type = 'permits'
GROUP BY geography_name
ORDER BY total_permits DESC
LIMIT 10;

-- Zonda: Lot width distribution with avg prices
SELECT lot_width, COUNT(*) AS count,
       ROUND(AVG(price_avg)::numeric, 0) AS avg_price
FROM landscape.zonda_subdivisions
WHERE lot_width IS NOT NULL
GROUP BY lot_width
ORDER BY lot_width;

-- Zonda: Top builders by remaining inventory
SELECT builder, SUM(units_remaining) AS inventory
FROM landscape.zonda_subdivisions
WHERE builder IS NOT NULL
GROUP BY builder
ORDER BY inventory DESC
LIMIT 10;
```

## Architecture Notes

Both tools follow the same pattern as existing ingestion tools (`lennar_offerings`, `redfin_ingest`):

```
backend/tools/[tool_name]/
├── __init__.py       # Package exports
├── schemas.py        # Dataclass definitions
├── parser.py         # File parsing logic
├── run_[name].py     # CLI entrypoint
└── logs/             # Log files
```

Key patterns:
- Dataclass schemas with optional fields
- Safe type conversion helpers (`safe_int`, `safe_float`, `safe_str`)
- `execute_values` for bulk inserts
- ON CONFLICT upsert for idempotent imports
- Pre-insert deduplication to handle source duplicates

## Next Steps

1. Wire up napkin mode to query market activity for permit trends
2. Add Zonda data to competitive analysis views
3. Create API endpoints for market activity queries
4. Build UI for permit trend visualization

# Landscape Schema Documentation

This directory contains comprehensive schema exports from the Neon PostgreSQL database.

## Quick Start

Run the export script from the project root:

```bash
./scripts/export_schema.sh
```

Or with verbose output:

```bash
./scripts/export_schema.sh --verbose
```

## Output

Each run produces a dated JSON file:

```
landscape_rich_schema_YYYY-MM-DD.json
```

Example: `landscape_rich_schema_2026-02-03.json`

## JSON Structure

```json
{
  "generated_at": "ISO timestamp",
  "database": "neon host (no secrets)",
  "schema": "landscape",
  "tables": [...],
  "views": [...],
  "indexes": [...],
  "constraints": [...],
  "foreign_keys": [...],
  "triggers": [...],
  "routines": [...]
}
```

### Contents

| Section | Description |
|---------|-------------|
| `tables` | All tables with columns, data types, defaults, nullability, comments |
| `views` | View definitions (full SQL) |
| `indexes` | Index definitions |
| `constraints` | Primary keys, unique constraints, check constraints |
| `foreign_keys` | Foreign key relationships with update/delete rules |
| `triggers` | Trigger definitions |
| `routines` | Functions (with source) and aggregates |

## Usage Options

```bash
# Export with verbose output
python manage.py export_rich_schema --verbose

# Export different schema
python manage.py export_rich_schema --schema public

# Custom output directory
python manage.py export_rich_schema --output-dir my/custom/path
```

## Notes

- Filename includes date for versioning
- Output is deterministically sorted for meaningful diffs
- Aggregate functions have `null` for `routine_definition` (PostgreSQL limitation)
- Database host is included for reference; no secrets are exposed

## Regenerating

These files should be regenerated when:
- Database schema changes (new tables, columns, indexes)
- Views or functions are added/modified
- Foreign key relationships change

## Parcel ID Standardization

The schema now separates internal parcel references from assessor parcel numbers (APN).
See `docs/schema/parcel_id_audit.md` for the current parcel_id inventory and
`docs/schema/parcel_id_cast_failures.csv` for cast backfill diagnostics.

## Index Ownership Export (No Secrets)

Generate constraint-owned index metadata using the same DB config as migrations:

```bash
python scripts/export_index_ownership.py
```

This writes `docs/schema/landscape_index_ownership.csv` and does not print secrets.

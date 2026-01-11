# Deprecated Tools

These tools have been superseded by the unified market intelligence schema.

## Replacement

| Old Tool | New Tool |
|----------|----------|
| `zonda_ingest/` | `market_ingest/zonda.py` + `python manage.py ingest_zonda` |
| `hbaca_ingest/` | `market_ingest/hbaca.py` + `python manage.py ingest_hbaca` |

## Migration

Run the migration to create the new unified schema:
```bash
python manage.py migrate market_intel
```

To migrate existing data from old tables:
```bash
python manage.py migrate_market_data
```

## New Usage

```bash
# Zonda ingestion
python manage.py ingest_zonda --file "Zonda Dec2025.xlsx" --dry-run
python manage.py ingest_zonda --file "Zonda Dec2025.xlsx"

# HBACA ingestion
python manage.py ingest_hbaca --file "HBACA_Permits_Master.xlsx" --dry-run
python manage.py ingest_hbaca --file "2025_SF_Permits_-_11_Nov.xlsx"
```

## Removal Timeline

These deprecated tools will be removed after 2025-03-01.

# Project 42 OpEx Discriminator Validation (2025-12-23)

## Migration
- Applied `migrations/20251223_add_statement_discriminator.sql` via psql.
- Result: **SUCCESS** (ALTER TABLE + three indexes created; no errors/warnings).

## Replay Command
- Command: `DATABASE_URL=$(grep '^DATABASE_URL=' backend/.env | cut -d= -f2-) python3 backend/tools/opex/replay_opex_to_plural.py --project-id 42 --statement-discriminator default`
- Result: **SUCCESS** (standalone script using psycopg2-binary; mapping aliases added for Professional Fees and Miscellaneous). Idempotent: before counts `[('default', 15)]`, after counts `[('default', 15)]`.

## SQL Integrity Checks (project_id=42)
```
-- Duplicate check (category_id)
0 rows

-- Duplicate check (account_id)
0 rows

-- Discriminator distribution
statement_discriminator | n
default                 | 15
```

## Operations Endpoint Verification
- Endpoint path (used by Operations tab): `/api/projects/{projectId}/operating-expenses/hierarchy`
- Queried equivalent SQL via `@neondatabase/serverless` script for project 42 (JSON captured).
- Data source: `landscape.tbl_operating_expenses` joined to `core_unit_cost_category` (matches API route).
- Observed statement_discriminator: all returned rows carry `"default"`; no alternate statements present in data.
- Payload excerpt (project_type_code `MF`, real estate taxes example post-replay):
```
{
  "account_id": 78,
  "account_number": "5111",
  "account_name": "Real Estate Taxes",
  "annual_amount": "264373.00",
  "statement_discriminator": "default"
}
```

## Verdict
- **PASS** – Migration applied; standalone replay executed; no duplicate rows; discriminator distribution consistent (`default` only); Operations endpoint continues to read from `tbl_operating_expenses` with updated rows.

## Next Actions (minimal)
1) If multiple statements are expected, rerun replay with `--statement-discriminator` set per scenario.
2) Keep standalone replay tool available for future validations where Django is absent.

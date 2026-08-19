# Raw-SQL migrations

## A migration file is not a table

Nothing applies these automatically.

- **Railway runs only `python manage.py migrate`**, which knows about Django app
  migrations and nothing about this folder.
- **`npm run db:migrate` re-executes every `.up.sql` on every run.** There is no
  tracking table, so "has this one run?" is not a question the tooling can
  answer — which is why the files are written to be idempotent
  (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

The consequence, and the reason this file exists: **a file in this folder is
evidence that someone intended a table, not that the table is there.** Check the
database.

```sql
SELECT to_regclass('landscape.your_table');   -- NULL means it does not exist
```

This has now cost real time twice:

- **Plan Extraction (2026-06-21)** — overlay migrations landed in the repo and
  never reached prod, so the overlay endpoints 500'd.
- **MK34 (2026-08-17)** — the prompt stated "no schema change and no migration:
  `gis_plan_lot` already exists", which was read off the repo. The table was
  absent from the live database. The reader would have parsed a 286-lot plat
  correctly and then thrown at the first write, and the failure would have
  looked like a code bug rather than a missing table.

## Known gap, recorded 2026-08-17

An audit of every `CREATE TABLE` in this folder against the live database found
**175 declared tables, 23 of them absent.** Twelve of those 23 are referenced by
code in `backend/apps/` or `src/`:

| Table | Migration | Referencing files |
|---|---|---|
| `core_fin_category` | `026_phase4_category_system_cutover.sql` | 18 |
| `core_unit_cost_template` | `014_unit_costs_and_products.sql` | 5 |
| `core_template_benchmark_link` | `014_unit_costs_and_products.sql` | 3 |
| `tbl_portfolio*` (4 tables) | `20260330_portfolio_tables.sql` | 3 |
| `tbl_operating_expense` | `001_financial_engine_schema.sql` | 2 |
| `tbl_multifamily_operating_assumptions` | `040_multifamily_adapter_tables.sql` | 2 |
| `tbl_market_series` / `_observation` / `_geography` | `20260310_market_intelligence_time_series.sql` | 1 each |
| `ingestion_source_authority` | `20260306_create_ingestion_source_authority.sql` | 1 |
| `mkt_recorded_sales` | `20260706_create_mkt_recorded_sales.up.sql` | 1 |
| `tbl_debt_facility` | `002_dependencies_revenue_finance.sql` | 1 |

The rest are backup or migration-log tables whose absence is expected.

Two of these are already documented elsewhere as *existing*, and are not:

- `CLAUDE.md` says the `ingestion_source_authority` table exists ("wired at
  schema level ... but logic not implemented"). It does not exist.
- `tbl_portfolio*` is correctly recorded in `CLAUDE.md` as never created (CU5),
  which is why the portfolio routes stay unregistered.

**This list is a finding, not a task.** Creating a table that nothing has needed
for months is not obviously safe — some of this code may be dead, and a table
appearing under it changes behaviour from "fails loudly" to "returns empty".
Decide per table.

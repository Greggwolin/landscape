# SS4 — Cost-of-sale component repopulation (WRITE, net-neutral)

**Session:** LSCMD-SS-COSTOFSALE-REPOP-0724 · **Date:** 2026-07-24 · **Branch:** `fix/costofsale-component-repop`

## Verdict
Project 9's 37 parcel-sale rows now itemize the flat transaction costs (legal $20k · closing $10k · title $20k = **$50,000/parcel × 37 = $1,850,000**) into `legal_amount` / `closing_cost_amount` / `title_insurance_amount`, which were NULL. **Net and the lump did not move** — the components split the value already inside `total_transaction_costs`.

## Part A — backfill (37 rows)
- Command: `python manage.py backfill_costofsale_components --project-id 9 --commit`
- Reads factors from the Benchmarks library at runtime (product > project > global). Per-row equality gate `legal+closing+title == total_transaction_costs − commission_amount`; whole-batch rollback on any failure; only touches the 3 component columns; idempotent.
- All 37 rows passed with Δ $0.00.

### Hard gate (DB-direct, before vs after)
| Metric | Value | Moved? |
|---|--:|:--|
| SUM(net_sale_proceeds) | $378,437,542.29 | **no (drift $0.00)** |
| SUM(total_transaction_costs) | $13,611,470.40 | **no (drift $0.00)** |
| SUM(components) | $1,850,000.00 | 0 → populated |
| rows with net changed | 0 | — |
| rows with lump changed | 0 | — |

### Returns (project-9 cash-flow summary, before → after)
`irr` 0.512374, `npv` 78,950,307.13, `equityMultiple` 2.932, `peakEquity` 106,110,100.04, `paybackPeriod` 47, `totalNetRevenue` 427,870,512.23, `netCashFlow` 278,321,524.73 — **all byte-identical.** Only `totalTransactionCosts` moved 0.0 → 2,122,457.51 (the $1.85M base escalated per-parcel exactly like commissions; the IRR/NPV/EM cash-flow array explicitly excludes the Revenue Deductions section, so returns cannot move).

## Part B — write-path fix
`recalculate_sfd_parcels` (the bulk what-if save in `apps/sales_absorption/views.py`) computed `legal/closing/title` locally but dropped them from the persisted dict, the unnest arrays, the INSERT column list, and the `ON CONFLICT` update — leaving the components NULL on every write (root cause of the gap). Now persists all three. Regression test guards it.

## Tests
`apps/sales_absorption/tests/test_costofsale_components.py` — 3 tests: net-neutral backfill round-trip, idempotency, bulk-save write-path source guard. Green. Landscaper suite: 97 passed / 16 skipped. `npm run build` clean.

## Other-project sweep (READ-ONLY — NOT written)
8 other projects share the identical condition (lump present, components NULL) — all "Peoria Meadows" scenario copies, 37 rows each, $1,850,000 flat portion each:

`152, 153, 154, 155, 156, 157, 158, 159`

Gregg decides on a separate sweep. The same command handles them: `backfill_costofsale_components --project-id <id> --commit`.

## Rollback
- CSV: `_claude/SS4-backup-project9-costofsale-20260724-131922.csv`
- Backup table: `landscape.bak_costofsale_repop_0724` (37 rows, components NULL as originally)
- Reversal (components-only; net/lump never changed):
  `UPDATE landscape.tbl_parcel_sale_assumptions SET legal_amount=NULL, closing_cost_amount=NULL, title_insurance_amount=NULL WHERE parcel_id IN (SELECT parcel_id FROM landscape.bak_costofsale_repop_0724);`
- Drop the backup table once the change is confirmed in production.

# SS5 — Cost-of-sale component sweep, projects 152–159 (data-only, net-neutral)

**Session:** LSCMD-SS-COSTOFSALE-SWEEP-0724 · **Date:** 2026-07-24 · **Type:** data backfill (no source change)

## Summary
Applied the SS4 `backfill_costofsale_components` management command (shipped in PR #205, `88ada2b1`) to the 8 sibling "Peoria Meadows" scenario copies — projects **152, 153, 154, 155, 156, 157, 158, 159**. Each had the flat transaction costs (legal $20k · closing $10k · title $20k = **$50,000/parcel × 37 = $1,850,000**) folded into `total_transaction_costs` with the itemized `legal_amount` / `closing_cost_amount` / `title_insurance_amount` columns NULL. The sweep splits that lump into the component columns so cost-of-sale itemizes in the cash-flow and what-if breakdowns.

**No source code changed.** The command, its per-row equality gate, the write-path fix, and the regression test all shipped in SS4. This session only ran the proven command per project and recorded the result.

## Pre-flight condition (all 8 identical, matched the SS3 finding)
37 rows each · all components NULL · `total_transaction_costs − commission_amount` = **$50,000/parcel** (0 rows off) · net **$264,185,122.29** · lump **$10,077,890.40** · commission **$8,227,890.40**. None skipped.

## Result — per project (DB-direct, before vs after)
| Project | Rows populated | Components | Net drift | Lump drift | Rows changed (net/lump) |
|--------:|:--:|--:|--:|--:|:--:|
| 152 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 153 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 154 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 155 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 156 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 157 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 158 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| 159 | 37/37 | $1,850,000.00 | $0.00 | $0.00 | 0 / 0 |
| **Total** | **296/296** | **$14,800,000.00** | **$0.00** | **$0.00** | **0 / 0** |

**Hard gate held on every project:** `SUM(net_sale_proceeds)` and `SUM(total_transaction_costs)` byte-identical before/after.

## Returns spot-check (project 159, genuine before/after)
Temporarily NULLed 159's components (rollback state), captured returns, then re-applied the backfill:

| Metric | PRE (NULL) | POST (populated) |
|---|--:|--:|
| irr | 8.581819 | 8.581819 |
| npv | 149,431,210.98 | 149,431,210.98 |
| equityMultiple | 6.4576 | 6.4576 |
| netCashFlow | 218,636,134.79 | 218,636,134.79 |
| totalNetRevenue | 264,185,122.29 | 264,185,122.29 |
| totalTransactionCosts | 0.0 | **1,850,000.0** |

Every return metric byte-identical; only `totalTransactionCosts` surfaced (these siblings carry no price escalation, so exactly $1.85M). Structurally guaranteed: the IRR/NPV/EM cash-flow array excludes the Revenue Deductions section (verified in SS4), and net was unchanged.

## Idempotency
Re-run on project 152 → "No candidate rows … Idempotent no-op."

## Rollback (components-only; net/lump never changed)
- CSV: `_claude/SS5-backup-sweep-152-159-20260724-135442.csv` (296 rows)
- Backup table: `landscape.bak_costofsale_sweep_0724` (296 rows, components NULL as originally)
- Reversal:
  `UPDATE landscape.tbl_parcel_sale_assumptions SET legal_amount=NULL, closing_cost_amount=NULL, title_insurance_amount=NULL WHERE parcel_id IN (SELECT parcel_id FROM landscape.bak_costofsale_sweep_0724);`
- Drop `bak_costofsale_sweep_0724` (and SS4's `bak_costofsale_repop_0724`) once confirmed in production.

# CB11 — Sales basis audit (project 9)

**Session:** `LSCMD-CB-SALES-BASIS-AUDIT-0728-CB11` · read-only audit + one residue repair · CB9 (#229) held unmerged.

## Question
CB9 makes a sale date editable and recalculates the row. A CB9 test run moved parcel 161's gross from **$6,481,984 → $7,040,000 (+8.6%)** with no price change, implying the first real edit permanently re-baselines a row and drifts the **$392.0M gross / $378.4M net** headline. Which basis is right — the stored rows, or the recalculated ones?

## Method
All 37 dated project-9 rows were recalculated into memory (replicating the batch-recalc assembly + `SaleCalculationService.calculate_sale_proceeds`) **without persisting**, twice: once as the CB9/batch recalc invokes it (no `sale_period`), once as `recalculate_sfd_parcels` invokes it (with `sale_period`). Nothing was written except the parcel-161 residue repair (§Repair).

## Finding: the stored basis is correct; the recalc is the bug

The only moving part is the **improvement offset**. The project carries a `project`-scoped `improvement_offset` benchmark of **$1,300/FF** (`tbl_sale_benchmarks`). `calculate_sale_proceeds` escalates that offset by the cost-inflation rate (3%) **only when `sale_period` is present** in `parcel_data`.

| Recalc invocation | Passes `sale_period`? | Offset applied | Total gross | vs stored $392.0M |
|---|---|---|---|---|
| `recalculate_sfd_parcels` (produced the stored rows) | **yes** | $1,300/FF escalated per period | — | — (this *is* the stored basis) |
| dry-run **with** `sale_period` | yes | escalated | **$393.9M** | **+0.48%** (32/37 rows exact) |
| `recalculate_one_assumption` / `batch_recalculate_assumptions` (CB9 path) | **no** | flat $1,300/FF | **$416.9M** | **+6.35%** |

The stored per-parcel offsets imply **$1,387–$1,652/FF, rising in discrete phase steps over the takedown horizon** (mean $1,518, stdev $88) — i.e. the $1,300 benchmark cost-inflated to each parcel's sale period. That is the time-value-correct treatment. The CB9/batch recalc drops `sale_period`, so it applies the flat $1,300/FF, **understating the offset and overstating gross by $24.9M (+6.35%) / net by $26.0M** across the deal.

### Driver breakdown
- **36 of 37 rows:** the entire stored-vs-recalc gross delta is explained by the offset swing (stored escalated offset vs flat benchmark). Residential (FF-priced) parcels move +6% to +64% depending on how far out they sell; commercial ('C') and unit ('MU') parcels with no FF offset don't move at all.
- **1 of 37 rows (parcel 161):** a *self-inconsistency*, not an offset swing — see below.

### Consequence for CB9 (#229)
Editing a sale date (or commission) through CB9 runs `recalculate_one_assumption`, which re-derives the row **without** `sale_period` → flattens that row's offset to $1,300/FF → inflates its gross/net. Row by row, the $392.0M headline drifts up toward $416.9M as users touch parcels. **CB9 must not merge until `recalculate_one_assumption` passes `sale_period` into `parcel_data`** (mirroring `recalculate_sfd_parcels` at `views.py:1197`). This is a bigger finding than CB9 itself: the recalc is silently un-escalating a real assumption.

## Parcel 161: confirmed residue (repaired + verified)
161 was the parcel hammered by the CB9 diagnostic runs. It is the **only** row that is self-inconsistent (`gpp − offset ≠ stored gross`) and the **only** row carrying `improvement_offset_per_uom = 1300` / `source = benchmark_project` (all 36 others: `NULL`). Cause: a CB9 diagnostic ran the flat-offset recalc on 161 (writing `gpp = 15,360,000`, `offset = 8,320,000`, `per_uom = 1300`, `source = benchmark_project`) and its restore returned only the money columns — leaving the offset columns at the flat-recalc values while `gross_sale_proceeds` was reverted to `6,481,984`.

**Pre-test value, independently reconstructed (not invented):**
- with-`sale_period` recalc of 161 → `gpp 15,360,000 − offset 8,878,016 = gross 6,481,984` (= the surviving stored gross), and
- `gpp − stored gross = 15,360,000 − 6,481,984 = 8,878,016` ($1,387.19/FF — matching its same-phase neighbours 162/163).

**Repair:** `improvement_offset_total = 8,878,016`, `improvement_offset_per_uom = NULL`, `improvement_offset_source = NULL`, `improvement_offset_override = false`. `gross_parcel_price` (15,360,000), `gross_sale_proceeds` (6,481,984), transaction costs and net are already correct (`net == gross − total` held on all 37 rows). This makes 161 self-consistent again and matches the 36-row pattern; the $392.0M/$378.4M headline is unchanged (161's gross was already correct — only its offset *components* were wrong).

## Recommendations
1. **Hold CB9 (#229).** Before merge, fix `recalculate_one_assumption` to pass `sale_period` (and confirm `batch_recalculate_assumptions` does too) so edits preserve the escalated offset. Re-verify the headline stays $392.0M/$378.4M after a round-trip edit.
2. The stored basis is authoritative; no bulk re-baseline is warranted.
3. Parcel 161 offset components restored to pre-test (**done + verified**: `offset_total 8,320,000 → 8,878,016`, `per_uom`/`source → NULL`; all 37 rows self-consistent; headline unchanged at $392,049,013 / $378,437,542).

# SS3 — Cost-of-sale / transaction-cost factor trace (read-only)

**Session:** LSCMD-SS-COSTOFSALE-TRACE-0724 · **Date:** 2026-07-24 · **Scope:** Peoria Meadows (project 9), 37 dated parcel sales. READ-ONLY audit — no DB writes, no code edits.

## Verdict (one line)

**APPLIED today** — the three Transaction Costs factors ($10K closing + $20K legal + $20K title = **$50,000/parcel × 37 = $1,850,000**) ARE in project 9's stored net (and in the modeled/escalated net). SS2 reported "closing = 0" only because the cash-flow service reports the breakdown from the per-component columns (`legal_amount`/`closing_cost_amount`/`title_insurance_amount`), which are **NULL** on project 9's rows — the $50K lives in `total_transaction_costs` instead. **Not a net-dollar regression; a component-column population gap that makes the cost invisible to component-reading consumers.**

---

## Q1. Where they SHOULD apply — wired, by function

The Transaction Costs library **is** wired into the parcel-sale net calc:

- **`apps/sales_absorption/services.py :: SaleCalculationService.get_benchmarks_for_parcel()`** (line ~109) reads `SaleBenchmark` (the Benchmarks library) with hierarchy **product > project > global** for `legal`, `commission`, `closing`, `title_insurance` (+ `improvement_offset`).
- **`SaleCalculationService.calculate_parcel_net_proceeds()`** then computes (lines 339–350):
  - `legal_amount / closing_amount / title_amount = fixed_amount` when the factor is flat `$$` (else `gross × pct`),
  - `total_transaction_costs = legal + commission + closing + title + custom` (line 347),
  - `net_sale_proceeds = gross_sale_proceeds − total_transaction_costs` (line 350).
- The persister **`apps/sales_absorption/batch_recalc.py`** (lines 179–185) writes `legal_amount`, `closing_cost_amount`, `title_insurance_amount`, `total_transaction_costs`, `net_sale_proceeds` back to `tbl_parcel_sale_assumptions`. `apps/sales_absorption/views.py` (upsert at line ~2176) does the same.

The cash-flow **read** path — **`apps/financial/services/land_dev_cashflow_service.py :: _calculate_parcel_sale()`** — does NOT re-read the library. It reads the stored columns and computes its displayed deduction as `closingCosts = legal_amount + closing_cost_amount + title_insurance_amount` (the per-component columns), while its net = stored `net_sale_proceeds`.

## Q2. Do they apply today on project 9 — exact $13.6M decomposition

Stored gross − stored net = $392,049,012.67 − $378,437,542.29 = **$13,611,470.38**. Exact split from the DB:

| Component | Amount | Source |
|---|--:|---|
| Commission | **$11,761,470.40** | `commission_amount` column (populated) — a 3% factor |
| Transaction costs (closing+legal+title) | **$1,850,000.00** | inside `total_transaction_costs`; = $50,000/parcel × 37 |
| Anything else | **$0.00** | `custom_transaction_costs = '[]'` on every row |
| **Total** | **$13,611,470.40** | = stored gross − net ✓ |

- **In the stored net?** YES — `net_sale_proceeds = gross_sale_proceeds − total_transaction_costs`, and `total_transaction_costs` (13,611,470.40) includes the $1,850,000. ($392,049,012.67 − $13,611,470.40 = $378,437,542.27 ≈ stored net.)
- **In the modeled net?** YES — the cash-flow service sets modeled net = stored `net_sale_proceeds` escalated, so the $1.85M rides along (escalated).
- **In the per-component columns?** NO — `legal_amount`, `closing_cost_amount`, `title_insurance_amount` are **NULL on all 37 rows** (SUM = 0). That is the ONLY place the $50K is absent, and it is exactly what the cash-flow service and the what-if engine read.

SS2's "$13.3M commission" was the *modeled/escalated* commission ($13,298,751); the *stored* commission is $11,761,470.40. Corrected here.

## Q3. Flat-dollar application basis

Flat `$$`, applied **per parcel sale (×37)**, not per deal:
- closing $10,000 + legal $20,000 + title $20,000 = **$50,000 per parcel**.
- `SELECT DISTINCT (total_transaction_costs − commission_amount)` over the 37 rows = a single value **$50,000.00**.
- Total = **$50,000 × 37 = $1,850,000**.

Library confirmation (`tbl_sale_benchmark`, global scope): `closing` fixed $10,000 · `legal` fixed $20,000 · `title_insurance` fixed $20,000 · `commission` rate_pct 3.0% (not fixed). Commission is a percent → it landed in its own `commission_amount` column; the three flat factors reached only `total_transaction_costs`.

## Q4. Regression check — git history

**No commit removed the transaction costs from net.** The money is in net today. Evidence:
- The calc→persist pipeline still applies AND persists all four components: `SaleCalculationService.calculate_parcel_net_proceeds` (services.py 339–350) → `batch_recalc.py` (179–185) / `views.py` upsert (2176–2185). No commit deleted the component writes.
- The what-if engine (`whatif_engine.py` 478–481, 521–523) only **reads** `tbl_parcel_sale_assumptions` (LEFT JOINs; line 806 is an in-memory shadow allowlist, not a DB write) — it did not null the columns.
- The cash-flow service's component read (`land_dev_cashflow_service._calculate_parcel_sale`, `closingCosts = legal+closing+title`) dates to commit **`dc685b3e` (2026-02-01)** — long-standing, not a recent change.
- Project 9's rows were written/updated **2026-07-18 → 2026-07-20** (during the land what-if series `c1a409bb`/`8ddcd12f`/`38f56645`/`e471e58e`) with `commission_amount` + `total_transaction_costs` + `net_sale_proceeds` populated but the three component columns left NULL.

**Conclusion:** the anomaly is not a removed code path but a **component-column population gap** in whatever wrote project 9's current rows — the $50K was folded into `total_transaction_costs`/net but never split back into `legal_amount`/`closing_cost_amount`/`title_insurance_amount`. Because two downstream consumers (the cash-flow deduction breakdown since 2026-02-01, and the what-if transaction-cost read) report from those component columns, the cost reads as $0 there even though it is fully in net. Gregg's memory of "cost-of-sale being applied" is correct — it still is, in net; what changed is that the breakdown columns are now empty for these rows.

## Q5. Commission vs cost-of-sale separation

Both libraries are wired in the calc (`get_benchmarks_for_parcel` reads legal/commission/closing/title together). The asymmetry is in the stored DATA, not the wiring:
- **Commission** (Commissions library, 3% percent factor) → persisted to its own `commission_amount` column → visible everywhere.
- **Transaction Costs** (three flat `$$` factors) → present in `total_transaction_costs`/net but their component columns are NULL → invisible to any consumer that sums the components.

So it is NOT "one library wired, the other not." It is: commission's amount survived in its column; the transaction-cost components did not — which fully explains both SS2's "commissions yes, closing zero" and Gregg's recollection.

---

### Dollar impact on project 9 net
Zero net-dollar impact from the gap itself: the $1,850,000 of transaction costs IS deducted in stored and modeled net. The impact is **reporting only** — any breakdown or what-if that reads the component columns understates transaction costs by **$1,850,000** and shows cost-of-sale as $0, while the headline net remains correct at $378,437,542.29.

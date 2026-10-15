# QX — Show the Working: calculation audit for every computed figure

**Status:** design, 2026-10-14. Not built. Plain-English companion: `QX-Calculation-Audit-Design-2026-10-14.html` (same folder).
**Author:** Cowork, chat QX. **Owner of the decisions in §7:** Gregg.
**Supersedes:** `QX-AUDIT-TRAIL-DESIGN.md` / `QX-Audit-Trail-Design-2026-10-14.html` (the Deal Ledger, same day). That paper designed a change/provenance ledger (who changed what, old → new). Gregg's correction (QX, 2026-10-14 ~16:50): the audit he asked for is of **calculations** — how a value in a schedule was computed. The ledger becomes a later layer beneath this one (§3.6); its schema audit (§2 of that file) remains valid and is not repeated here.

---

## 1. What this is

Every computed figure can return its **working**: a tree whose root is the figure, whose interior nodes are intermediate results with the rule that produced them, and whose leaves are either stored values (`table.record.field`) or named rules/constants. One structure, produced by the engine at compute time, read by three consumers: the schedule derivation panel, the returns tiles, and a Landscaper tool. Landscaper never explains a number from its own reasoning; it reads the working.

Why it is the novelty: a spreadsheet exposes formulas, not reasoning; ARGUS exposes neither; a general assistant produces a figure it cannot prove. See the positioning memo (`docs/assessments/SaaS_Model_and_Landscape_Positioning_2026-10-14.html`) and walk-through item 3 (`Peoria_Demo_Path_Walk_2026-10-14.html`).

## 2. Active-code-path trace (§17.7.6 — read before designing)

Read on the Mac working copy, `main` at `0fa734d1`, 2026-10-14 ~17:05 Phoenix.

| Step | Where | What it does today | What it discards |
|---|---|---|---|
| Cash-flow artifact / Screens cash flow | `backend/apps/landscaper/tools/cashflow_artifact_builder.py:340 fetch_cashflow_schedule_data` → `tool_executor.py:~3020 _fetch_cashflow_schedule` → `apps/financial/services/cashflow_routing.py:58 fetch_cashflow_schedule` | Routes by `project_type_code` to `LandDevCashFlowService.calculate` (land) or `IncomePropertyCashFlowService` | — |
| Cost lines | `land_dev_cashflow_service.py:444 _generate_cost_schedule` → `:759 _distribute_budget_item` → `:837 _calculate_scurve_weights`, `:883 _apply_inflation` | Reads `core_fin_fact_budget` (`fact_id`, amount, activity, start/duration/method), spreads by `lump` / `distributed` / `curve`, inflates per period. Emits per-period `{periodIndex, amount, source:'budget'}` and line `{lineId:'cost-{factId}', factId, sourceType:'budget', total}` | the weight for each period, the inflation factor, the base amount before inflation |
| Revenue lines | `:906 _generate_absorption_schedule` → `:1114 _calculate_parcel_sale` → `:1069 _rollup_revenue_by_family` | Per parcel: `gross_parcel_price`, `net_sale_proceeds`, `commission_amount`, `legal/closing/title_insurance_amount`, `improvement_offset_total` (FF only), `sale_period`, escalation `(1+g)^((sale_period−1)/12)`. Emits `{parcelId, parcelCode, containerId, salePeriod, grossRevenue, netRevenue, commissions, closingCosts, subdivisionCosts}` | the escalation factor, the pre-escalation values, the price × units/acres basis |
| Sections | `:1196 _build_sections` | Aggregates parcels to `revenue-gross-{container}`, `revenue-net-{container}`, `revenue-deduction-*`; cost lines by category; `:1478 _build_financing_section` | which parcels sum into a revenue cell (kept only on the absorption dict, not on the section line) |
| Summary metrics | `:2148 _calculate_summary_metrics` → `:2279 _build_net_cash_flow_array` → `:2300 _calculate_dated_irr` → `financial_engine/waterfall/irr.py calculate_xirr` (fallback `npf.irr` monthly, annualised) | IRR on dated monthly flows (D-2026-10-01), NPV via `npf.npv` at `(1+r)^(1/12)−1`, `equityMultiple = Σ(+) / |Σ(−)|`, `peakEquity = min(cumulative)`, `paybackPeriod = first i with cumulative ≥ 0` | the net cash-flow array itself (only `cumulativeCashFlow` is returned), the dates used, which solver answered, the discount rate used |
| Rendering | `src/components/wrapper/ScheduleArtifact.tsx:85 interface ScheduleDerivation {quantity, uom, rate, total, basis}`, `:1159` aside `styles.detailPanel` on double-click (4d); `CashFlowSummaryMetrics.tsx` tiles | One-layer derivation for budget rows | — |

Plain-English summary: one engine already knows every input to every cell and every intermediate factor at the moment it computes; it keeps only the final amounts. The IRR path already uses a shared dated solver with a documented fallback. The budget schedule already has a one-layer working panel. Nothing needs re-deriving; the design is to stop discarding and to expose.

Data source sentence (§17.7.6): the function on the active path is `LandDevCashFlowService.calculate`; it reads `core_fin_fact_budget` (costs), `tbl_parcel` + pricing/absorption (revenue), `tbl_project` / DCF assumptions (discount rate, growth sets, inflation), and loans for financing.

## 3. Design

### 3.1 The working node

```ts
interface WorkingNode {
  id: string;            // stable within a run: 'cell:cost-123:p14', 'metric:irr', 'leaf:core_fin_fact_budget.123.amount'
  label: string;         // plain words: 'Mass grading, Phase 1, Aug 2026'
  value: number | null;
  unit?: 'usd' | 'pct' | 'x' | 'months' | 'count' | 'factor' | string;
  rule?: string;         // plain-words formula: 'budget line × share this month × inflation'
  kind: 'result' | 'intermediate' | 'stored' | 'rule' | 'series';
  ref?: { table: string; record_id: string; field: string };   // kind = 'stored'
  series?: { dates: string[]; values: number[] };               // kind = 'series'
  inputs?: WorkingNode[];  // children; absent on leaves
  check?: { method: string; value: number };                    // second-method cross-check (IRR)
}
```

Rules are text for humans, not expressions to evaluate; the engine remains the only thing that computes. `kind:'stored'` leaves carry a `ref` so the later change ledger (§3.6) can attach "entered by / when / from document" without changing this structure.

### 3.2 Where the working lives

**Computed with the run, attached to the envelope, not stored.** The run is deterministic for a given database state; re-running on request is cheaper and safer than persisting trees. The envelope gains one optional key:

```
envelope.working: {
  cells:   { [lineId]: { [periodIndex]: WorkingNode } },   // depth 1–2 only; leaves by ref
  lines:   { [lineId]: WorkingNode },                      // the line's own working (budget item, parcel)
  metrics: { irr, npv, equityMultiple, peakEquity, paybackPeriod: WorkingNode }
}
```

Built only when `fetch_cashflow_schedule(..., with_working=True)`; the default path is unchanged so existing consumers see identical bytes. Size guard: cells carry child *ids*, not nested copies; the client resolves ids against `lines` and `metrics`. Target: < 400 KB for Peoria (24 budget lines × 96 periods + parcels).

### 3.3 What each node records (land engine)

| Node | rule (plain words) | inputs |
|---|---|---|
| cost cell `cost-{factId}` @ p | budget line × share this month × inflation | stored `core_fin_fact_budget.{factId}.amount` (with the existing qty × rate basis); intermediate `share` with rule naming the method (`lump` / even over N months / S-curve month k of N, steepness s) and the start period; intermediate `inflation` `(1+i)^years` with stored `i` |
| revenue-gross cell @ p | sum of parcels closing this month | one child per parcel: stored gross price (and its basis: units or acres × price per unit, `price_uom`), intermediate escalation `(1+g)^((sale_period−1)/12)` |
| revenue-net cell @ p | gross − commissions − closing − subdivision | the gross node; stored `commission_amount`, `legal_amount`, `closing_cost_amount`, `title_insurance_amount`, `improvement_offset_total` (FF only), each escalated where the engine escalates them |
| revenue-deduction-* cell | sum over parcels closing this month | parcel children as above |
| financing cell | from `_build_financing_section` | loan stored fields; draw/repay intermediate per period — slice 2b, after costs and revenue |
| subtotal / net cash flow @ p | sum of the section's lines | child ids of the lines summed (never gross and net both: mirror `_build_net_cash_flow_array`) |
| `metric:irr` | annual rate at which the dated monthly net flows sum to zero | `series` node (dates = `periods[i].startDate`, values = net cash flow array, rounded to cents as passed to the solver); `rule` names the solver (`calculate_xirr`, days/365) or the fallback actually used; `check` = the other method's answer on the same series |
| `metric:npv` | present value of the monthly net flows at the discount rate | `series` (same), stored discount rate, intermediate monthly rate `(1+r)^(1/12)−1` |
| `metric:equityMultiple` | cash in ÷ cash out | intermediates Σ positive, Σ negative (from the same series) |
| `metric:peakEquity` | deepest point of the running total | intermediate: the period at which it occurs, the running total series |
| `metric:paybackPeriod` | first month the running total is ≥ 0 | same running-total series |

Income-property engine: same node shape; GPR → vacancy → EGI → OpEx → NOI chain and the DCF exit (`dcf_calculation_service.py:566, :1043` emit `irr`). **Slice 1 is land only**; the income engine is slice 6 and must mirror the parity note in `_calculate_summary_metrics`'s docstring.

### 3.4 Consumers

1. **Schedule derivation panel** (`ScheduleArtifact.tsx` aside, 4d). `ScheduleDerivation` is extended, not replaced: `derivation.working?: WorkingNode`. When present the panel renders the tree (collapsible rows; default depth per decision §7.1). Cell double-click on a cash-flow artifact resolves `working.cells[lineId][periodIndex]`. The existing qty × rate rendering stays for budget rows and becomes the `stored` leaf's basis line.
2. **Returns tiles** (`CashFlowSummaryMetrics.tsx` and the artifact KPI pairs built at `cashflow_artifact_builder.py:540–547`). Each tile becomes clickable and opens the same aside with `working.metrics[key]`. The IRR node shows `check` beside the value.
3. **Landscaper tool** `explain_figure(project_id, target)` where `target ∈ {cell: {lineId, periodIndex}} | {metric: key} | {line: lineId}`. Returns the WorkingNode and a server-rendered plain-words transcript (indent = depth). System-prompt rule: when asked how a figure was computed, call this tool and quote it; do not derive. Tool count in `/landscape/CLAUDE.md` increments (§15.5, §19).
4. **What-if comparison**: both runs carry `working`; the comparison artifact (existing what-if flow, D-2026-09-18-YIELD) shows two `metric:irr` series side by side and lists lines whose cell values differ.
5. **Report appendix** (slice 5; decision §7.3).

### 3.5 Invariants (the §4.10 acceptance tests)

- With `with_working=False` the envelope is byte-identical to today (golden-file test on Peoria, project 9).
- With `with_working=True`, for every cell: `sum(children values) == cell value` to the cent, and `metric.value` equals the existing summary value. A failing invariant is a bug in the working, not a reason to change the figure.
- Every `stored` leaf's `ref` resolves to a real row/column (`describe_table_schema` check in the test).
- IRR `check` within 1e-6 of `value` when both solvers answer; when only one answers, `rule` says which and `check` is null — never a silent fallback (D-2026-10-01 spirit).

### 3.6 Relationship to the Deal Ledger (superseded paper)

The ledger is the layer beneath `stored` leaves: given a `ref`, it answers who set it, when, from which document. Nothing here depends on it. When built, the panel's `stored` row gains a second line ("entered by Gregg · Oct 2 · typed in the parcel table") and nothing else changes. Build order: working first (this paper), ledger second.

## 4. Downstream impact (§17)

**Files modified:** `land_dev_cashflow_service.py` (slice 1 — the engine; high-risk zone "financial engine inputs"); `cashflow_routing.py` (pass-through flag); `cashflow_artifact_builder.py` (attach working to the artifact schema); `ScheduleArtifact.tsx`, `CashFlowSummaryMetrics.tsx`; one new tool in `backend/apps/landscaper/tools/` + `tool_schemas.py`; `/landscape/CLAUDE.md` tool count.
**Known consumers of the engine envelope:** the cash-flow artifact, the Screens cash-flow page (`PanelScreenView` → classic cash-flow component), Landscaper cash-flow tools, the what-if flow, `leveraged_cashflow_summary` in `cashflow_routing.py`, the waterfall (`calculations/services.py:371, 421, 471`) which reads the same service.
**Post-change verification:** golden-file equality on Peoria with the flag off; summary values unchanged with it on; what-if 39.1% → 30.1% reproduces; artifact renders; build passes.

## 5. Build plan

| Slice | Scope | Risk (§4.9) | Gate |
|---|---|---|---|
| 1 | Engine keeps its working (costs, parcel revenue, sections, metrics) behind `with_working`; `working` on the envelope; invariant tests | High (engine) | Golden-file byte equality off; invariants on |
| 2 | Cash-flow cell panel: costs and revenue (2a), financing and subtotals (2b) | Medium | Double-click 5 cells on Peoria, children sum to the cent |
| 3 | Returns tiles open their working; IRR cross-check shown | Medium | Tile values unchanged; series length = periods |
| 4 | `explain_figure` tool + prompt rule | Medium (tool count, §15.2 n/a — read-only) | "How did you get 39.1%?" answered from the tool, transcript matches panel |
| 5 | Budget second layer (quantity basis, rate source) + report appendix | Low–Medium | — |
| 6 | Income-property engine parity | High | Same invariants on an income project |

Every slice ends per §4.10.2: pushed + PR open + CI green + the 2–4 things Gregg looks at. No slice merges itself.

## 6. Case against / what it is not

Slice 1 edits the engine every screen depends on. Mitigation is structural: the working is additive and flag-gated; the first test is byte equality with the flag off. Not a provenance ledger (§3.6), not a formula editor, not editable from the panel.

## 7. Decisions for Gregg (plain-English file carries the wording)

1. Default depth on first open: **1a** one level, expand on click · **1b** whole chain expanded.
2. IRR series display: **2a** by year with months on request · **2b** monthly (the basis it was solved on).
3. Held until slices 1–3 ship: report "Working" appendix offered, and default on/off.

## 8. Logs

Decision, open questions and artifact rows appended to `9Ai-ProjectLogs/projects/Landscape/_project_logs/` on 2026-10-14 (chat QX). The superseded Deal Ledger files carry a banner pointing here.

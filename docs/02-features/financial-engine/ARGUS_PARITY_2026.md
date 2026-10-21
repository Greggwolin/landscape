# ARGUS Parity — Re-Audit 2026-10-21

> **This re-audit supersedes the July figures.** Every verdict below was re-run on `main` at
> `e969b321` (2026-10-21). The July review (chat TB, 2026-07-14) is preserved beside this file as
> `ARGUS_PARITY_2026-07-14.md` with a superseded banner; its section numbering is kept here so the
> two can be read side by side. Where this document says nothing new about a section, the July text
> stands and is marked **[July text, re-verified]** or **[July text, not re-verified]**.

**Session:** Cowork chat PX (Landscape project) · **Decisions:** 1a full re-audit, 2b record-don't-fix
**Baseline moved since July:** 223 commits on `main` since 2026-07-14, 16 of them touching the
engine folders (`backend/apps/financial`, `backend/apps/calculations`, `backend/financial_engine`,
`services/financial_engine_py`, `src/lib/financial-engine`, `src/lib/calculations`). Counted
`git log origin/main --since=2026-07-14` on 2026-10-21. Note: `services/financial_engine_py/financial_engine`
is a **symlink** to `backend/financial_engine` — there is one Python engine, not a twin, and any
"both copies" count double-counts it.
**Method:** code read on `main` for every row; tests run where a pure-function test exists (named per
row); a worked numeric example where a defect's arithmetic can be reproduced without the database.
A separate checking pass (fresh agent, given the claims and the clone, not the reasoning) tried to break
every absence, count and fixed/open claim below; its corrections are folded in and noted where they bit.
No headline percentage — July retired "75%" for having no method behind it, and none is produced here.
**Plain-English companion:** `OD/1Active/_Landscape/_cowork/_specs/ARGUS_PARITY_2026.html`
(regenerated from this file the same day; July copy kept beside it as `ARGUS_PARITY_2026-07-14.html`).
**Source guides:** `reference/docs/` — not opened this pass; no row below needed a claim checked
against the guide text, the calculation surface July extracted was sufficient.

**Two columns, never fused.** Gregg's question (2026-10-21) has two halves: *does the engine compute
it* and *can a user reach it*. §5 carries both as separate columns. An engine capability with no
screen is still parity at the engine; a screen with no engine behind it is not.

---

## 0. What the re-audit found, in order of weight

1. **Of the eight July defects: 1 fixed, 4 still open, 2 moot (code path deleted), 1 still open but
   never reachable** — and the last one corrects a July error. §2.2 was headed "USER-FACING". The
   screen it describes has rendered a *Coming Soon* card since before July; the component that calls
   the defective route has had no importer at any point since it was written (2026-06-16). Same
   error class July named in its own §6 — asserting user impact without tracing the path to a mount.
2. **The duplicated-math finding (§7) has not improved.** IRR solver sites went from 6 (July count)
   to 11 by the same method (8 Python, 3 TypeScript; 12 counting the dated land IRR, which delegates to
   the shared solver but keeps its own fallback). One consolidation seed exists
   (`apps/calculations/series_metrics.py`, 2026-07-14, two callers) and the one new IRR since July
   (dated land IRR, #319) correctly reuses the shared XIRR solver — the direction is right, the count
   is not.
3. **The absent list is largely as July left it.** Nothing on the office/retail/industrial side was
   built. Multifamily gained correctness fixes, not ARGUS capabilities. Land gained a dated IRR and a
   revenue split by land-use family, and July overstated one absence (gross profit and margin were
   already computed).
4. **Both structural gaps (§4) stand unchanged.**

---

## 1. Scope — **[July text, re-verified]**

Two programs, not three: ARGUS Developer is the land benchmark; EstateMaster contributes Monte
Carlo, JV structures, the RLV 2-year doctrine and IRR honesty. Nothing in this pass changes that.

---

## 2. The eight July defects — verdicts on `main` 2026-10-21

| # | July finding | Verdict | Evidence | Reachable by a user? |
|---|---|---|---|---|
| 2.1 | IRR is a monthly rate reported as annual (CRE metrics route) | **MOOT** — the route and both consumers were deleted 2026-07-14 (`dcbae39`, #168). The helper still returns a per-period rate and the annualising helper exists (`src/lib/calculations/metrics.ts:124-139`) but the only remaining caller is the §2.2 route, where the same class recurs (below). | `ls src/app/api/cre` → absent; grep callers of `calculateIRR` → one, the sensitivity route | No path exists |
| 2.2 | Land-value sensitivity does no discounting; absorption slider inert; opex double-counted | **STILL OPEN in code, NEVER USER-FACING — July's "USER-FACING" was wrong.** `src/app/api/projects/[projectId]/sensitivity/calculate/route.ts:78` is still `totalRevenue - totalCosts`. Two things July missed, same route: the IRR at `:90` is a **monthly** rate returned raw, and the NPV at `:93-96` applies the project's discount rate per month — that rate is an annual figure by
every domain convention, though nothing in the schema labels it (the checking pass's caveat). Worked example (100 lots × $400k, 10/mo, $30M cost, $2M opex): IRR reads 4.55% where the annualised figure is 70.5%; NPV reads **−$6.65M** at 10%-per-month versus **+$6.39M** at 10%-per-year converted — the sign flips. The route was edited 2026-09-04 (#269, discount-rate source) without touching the defect. | Route read; example reproduced in Node from the route's own arithmetic | **No.** `FeasibilityTab.tsx:146-168` renders a *Coming Soon* card for the Sensitivity subtab and did so at `b970985` (2026-07-14). `SensitivityAnalysisContent.tsx` — the only caller of the route — has **zero importers** and no page route (`FeasibilitySubNav` points at `/feasibility/sensitivity`, which has no page). |
| 2.3 | `curve_steepness` written 0–100, read as 0–1; a stored 50 collapsed a cost line into one period | **FIXED** — #276 (`9d71763`, 2026-09-09). `_normalize_curve_steepness` in `land_dev_cashflow_service.py:62` is the single scale boundary; DB CHECK `core_fin_fact_budget_curve_steepness_check` enforces 0–100; `artifacts/views.py:895` validates the Landscaper write path. | **Ran** `backend/apps/financial/tests/test_curve_steepness_scale.py` — 20 passed from 14 test functions (2026-10-21, Linux VM, pure functions). Jest twin `src/__tests__/curve-steepness-scale.test.ts` exists, **not run here** (no node_modules in the audit checkout). | Yes — classic Budget tab, Landscaper budget schedule artifact |
| 2.4 | `Math.random()` decides lease renewal | **STILL OPEN, still orphaned.** `src/lib/financial-engine/lease-rollover.ts:83` unchanged; the blended version at `:211` still never called. The file has **zero importers** (the one textual hit is a comment in `lease-calculator.ts:43`). | grep importers of `lease-rollover` → none | No path exists (dormant lease model) |
| 2.5 | DCF double-counts the management fee | **STILL OPEN.** `dcf_calculation_service.py:398-405` sums every `tbl_operating_expenses` row for the active statement — management-category rows included — then `:487` adds `egi × management_fee_pct` on top. `views_income_approach.py:331-333` removes the management category first; the DCF never did. The file was changed five times since July (#178, #244, #245, #246, #275) without touching this. | Code read; both files side by side | **Yes** — classic Valuation → Income → DCF view (`DCFView.tsx`), report RPT_13, `income-approach-data/<id>/dcf/` route |
| 2.6 | Terminal management fee is grown, not recomputed as % of terminal EGI | **STILL OPEN.** Annual path `dcf_calculation_service.py:531`; monthly path `:945`. When income growth ≠ expense growth the terminal fee ≠ pct × terminal EGI, so exit value and roughly half of PV carry the error. | Code read | **Yes** — same surfaces as 2.5 |
| 2.7 | Unlevered IRR passed gross exit value, levered passed net reversion | **MOOT** — the caller was on the deleted CRE route. The two helpers survive with **zero callers** (`src/lib/calculations/metrics.ts:244-272`). The Python engine (`backend/financial_engine/core/metrics.py:380-392`) passes `net_reversion` to both and did in July — consistent. | grep callers → none | No path exists |
| 2.8 | Revolver non-convergence is silent | **STILL OPEN.** `debt_service_engine.py:118` `MAX_ITERATIONS = 15`; loop `:344-369` has no `converged` flag. `iterations_to_converge` is exposed but reads 15 both when it converged on the 15th pass and when it ran out. **Ran it:** on the Star Valley fixture the solve converges in 11 (commitment $24,905,282, reserve $3,477,250). With the cap forced to 1 it returns commitment **$22,806,338** beside a funded reserve of **$5,042,143** — the commitment was built on the *previous* iteration's reserve (zero), the two do not tie, and nothing in the result says so. `test_debt_service_engine.py::test_convergence_iterations` asserts ≤ 12 on the fixture; it does not pin the exhausted path. | `apps/calculations/tests/test_debt_service_engine.py` — 11 pure tests pass (12 need a database, not run); forced-cap run 2026-10-21 | **Yes** — classic Capital → Debt (`useCapitalization.ts` → `loans/<id>/debt-schedule/`), land cash-flow financing section, Landscaper capitalization schedule artifact. The iteration count is **not shown** on any screen. |

**Liveness, the July caveat.** July said §2.2–2.8 were "probably live" and must not be treated as
user-facing until traced to a mount. Traced now: 2.5, 2.6, 2.8 are live on the classic surface and
through Landscaper artifacts; 2.2 and 2.4 are not reachable; 2.1 and 2.7 have no code path.

---

## 3. Genuinely ABSENT — by property type

Search discipline: before any "absent" below, the same grep found `loss_to_lease` in 30 files and
`management_fee` in 61 (positive controls, 2026-10-21). Generated types (`src/types/database.ts`)
and tests were excluded from every count.

### 3.1 Office / Retail / Industrial (lease-level model — still DORMANT)

| ARGUS capability | July | Now | Evidence |
|---|---|---|---|
| General Vacancy gross-up/reduce | ABSENT | **ABSENT** | 0 code files match `general_vacancy / generalVacancy / "general vacancy"` (the only hits are this document and two kitchen-sink field docs) |
| Absorption & Turnover Vacancy | ABSENT | **ABSENT** | the only `downtime` hits are multifamily renovation re-let lag and rent-control, not a lease-level A&T line |
| Fixed / variable expense split | ABSENT | **ABSENT** | hits for `fixed_pct` are the `FIXED_PERCENT` *escalation type*, not a fixed share of an expense |
| Base Year Stop / recovery structures | SCHEMA ONLY (31 columns, zero readers) | **SCHEMA ONLY, unchanged** — plus one orphan. `tbl_lease_ret_ext` has two code references — a comment in `mutation_service.py:261` and the generated types — plus the COMMENT string in its own migration and schema-export docs. The vendored engine does carry recovery arithmetic (`backend/financial_engine/core/cashflow.py:239-296` — NNN / Modified Gross / Gross with a per-SF cap), but `CashFlowEngine` is **imported once and instantiated nowhere** outside its own module. No base-year-stop logic anywhere. | grep `tbl_lease_ret_ext`; grep `CashFlowEngine(` outside the engine → none |
| Resale NOI gross-up (Lag Vacancy) | ABSENT | **ABSENT** | 0 files |
| Straight-line / GAAP rent | ABSENT | **ABSENT** | 1 hit, a config label in `basket1-the-deal.ts` |
| MLA blending across all fields | PARTIAL/WRONG | **unchanged** — see §2.4 | |
| WALE / WALT | ABSENT | **SCHEMA ONLY** — `models_valuation.py:896` `walt_years` is a stored column; nothing computes it | grep `walt` |
| **New since July: NNN single-tenant valuation screens** | — | **UI without an engine.** `ValuationTab.tsx:27-29` mounts `NNNIncomeApproach` / `NNNReconciliation` for NNN subtypes; all six data-rendering components (the reconciliation view and five panels) import `nnnMockData.ts`; no fetch, no calculation; `NNNIncomeApproach.tsx:44` says `// Will be used when wiring to API`. A screen a user can reach that computes nothing. | `src/components/valuation/nnn/` |

### 3.2 Multifamily (unit-level model — LIVE)

| ARGUS capability | July | Now | Evidence |
|---|---|---|---|
| Loss to Lease | PRESENT, better than ARGUS | **[July text, not re-verified at number level]** `loss_to_lease_calculator.py` present | 30 files |
| Potential Market Rent | PRESENT | **PRESENT** as `forward_gpr` at market rents (`views_income_approach.py:127-130`) | code read |
| Economic Occupancy | PRESENT | **[July text, not re-verified]** column + display formatter exist | grep |
| Direct Cap valuation-date anchor | ABSENT — GPR is `SUM(current_rent) × 12`, `valuation_date` stored, never read | **ABSENT, unchanged.** `views_income_approach.py:124` still `SUM(current_rent) * 12`. `valuation_date` is stored (`models_valuation.py`) and writable by a Landscaper tool (`tool_executor.py:2788`); **no calculation reads it** (grep across `apps/financial` services and views → 0). | code read + grep |
| Recoveries | correctly N/A | **unchanged** | |
| **New since July (correctness, not ARGUS capability):** DCF opex filtered to the active statement discriminator; authoritative assumptions hierarchy + canonical unit count (#246); negative terminal NOI floored to no-exit (#245, `test_exit_floor.py` 11 passed 2026-10-21); renovation Cap-X in cash flows (#178); a zeroed renovation premium stays zero (#275). | | | commit log on `dcf_calculation_service.py` |

### 3.3 Land Development

| ARGUS Developer capability | July | Now | Evidence |
|---|---|---|---|
| Residual Land Value solving | ABSENT, worse than absence | **ABSENT, unchanged** — see §4.2 | |
| Profit on Cost / GDV / NDV | "ABSENT — nothing computes them" | **PARTIAL — and July overstated the absence.** `land_dev_cashflow_service.py` computes `totalGrossRevenue` (GDV-equivalent), `totalNetRevenue` (NDV-equivalent), `grossProfit` and `grossMargin` = profit ÷ *net revenue* (`:2209-2210`, `:2266-2267`) — and did at the July commit (`b970985:2087`). Still absent: **profit ÷ cost** as a reported ratio (one division away from numbers the engine already holds), and **development yield**. | code read at both commits |
| Four-window absorption + deposit-date price locking | ABSENT | **ABSENT.** Landscape dates each parcel's bulk sale individually (`custom_sale_date` / sale period) and escalates price from project start (`_calculate_parcel_sale`, `:1114-1196`). That is the right model for Gregg's vocabulary — parcels are one-time bulk sales to builders, not takedowns — so the ARGUS window model is a scope question, not a defect. Option deposits exist for lotbank products (`_build_lotbank_sections`, `:1849`). | code read |
| Infrastructure cost apportionment | ABSENT | **ABSENT** | 0 files match `apportion` |
| Monte Carlo (EstateMaster) | ABSENT, docs advertise it | **ABSENT** — model classes only (`financial_engine/models.py` `VariableDistribution`, `MonteCarloResult`), no function. The engine's own `__init__.py:13`, `config.py:42-44` (10,000 default simulations) and README all reference a `core/monte_carlo.py` / `MonteCarloAnalyzer` that does not exist. | grep `def .*monte` → 0; `find -iname "*monte*"` → nothing |
| Construction interest circularity | PRESENT, better conditioned than ARGUS | **PRESENT** — with §2.8 still attached | §2.8 run |
| **New since July:** land IRR on actual cash-flow dates via the shared XIRR solver (`_calculate_dated_irr`, `:2300`, #319 2026-10-02; falls back to compounded monthly IRR); revenue split by land-use family (`_rollup_revenue_by_family`, #321); the **what-if shadow engine** (`whatif_engine.py`, 1,795 lines — overrides, attribution, `sensitivity_grid`; existed in June, July did not list it) is the nearest thing Landscape has to ARGUS Developer's sensitivity tables. | | | commit log |

---

## 4. The two structural gaps — unchanged

### 4.1 General Vacancy — **[July text, re-verified]**
Landscape still applies a flat rate to in-place GPR (`views_income_approach.py:337`: `vacancy_loss =
gpr * vac_rate`). No potential-rent projection, no A&T line. Building General Vacancy alone would
still produce a number that looks like ARGUS's and means something different.

### 4.2 Residual Land Value — **[July text, re-verified, one addition]**
1. Dead columns: `residual_land_value_per_acre` now has **one** reference, a TypeScript type
   (`src/types/financial-engine.ts:632`). Zero writers.
2. `solve_for_land_value` is still the NPV renamed (`tool_executor.py:19641-19644`, inside
   `_calc_land_development`); still napkin-only. Minor: its monthly discount rate is
   `annual ÷ 12`, not the geometric conversion the TypeScript helper insists on.
3. The Feasibility screen that July said "ships a wrong one" **ships nothing** — see §2.2.
4. **Addition:** the HBU tools store an `economic_residual_land_value` per alternative
   (`hbu_tools.py:151`); it is a number the user or the model supplies, not one the engine derives.
   Nothing root-finds. `scipy` is installed; the objective functions are the missing piece, exactly as
   July said.

---

## 5. One parity table — engine and UI as separate columns

Engine: **present / partial / absent**. UI: **yes / no / partial** (partial = reachable on one surface
only, or the figure is computed but not displayed). Confidence: **verified** = code read on `main`
this pass, test run or calculation reproduced; **inferred** = July verdict carried, file still present,
not re-run.

| ARGUS program | Capability | Engine | UI reachable | Evidence | Confidence |
|---|---|---|---|---|---|
| Enterprise | Monthly DCF with terminal value | present (`dcf_calculation_service.py`) — carries §2.5, §2.6 | yes — classic Valuation→Income→DCF; RPT_13; Landscaper | code read | verified |
| Enterprise | Direct capitalisation, 3 NOI bases | present (`views_income_approach.py`) | yes — classic Valuation→Income | code read | verified |
| Enterprise | Valuation-date anchored GPR | absent | — | `:124` `SUM(current_rent)*12`; `valuation_date` never read | verified |
| Enterprise | General Vacancy (gross-up/reduce) | absent | — | 0 matches, positive control passed | verified |
| Enterprise | Absorption & Turnover Vacancy | absent | — | 0 lease-level matches | verified |
| Enterprise | Fixed/variable expense split | absent | — | hits are escalation type only | verified |
| Enterprise | Expense recoveries (NNN / modified gross / caps) | partial — arithmetic exists in an engine module with no caller (`core/cashflow.py:239`) | no | `CashFlowEngine(` instantiated nowhere | verified |
| Enterprise | Base Year Stop | absent (schema only, 31 columns, 0 readers) | no | `tbl_lease_ret_ext` 0 readers | verified |
| Enterprise | Lag vacancy / resale NOI gross-up | absent | — | 0 matches | verified |
| Enterprise | Straight-line rent | absent | — | 1 label hit | verified |
| Enterprise | MLA / renewal-probability blending | partial — blended function exists, never called; random draw is what runs | no (file has no importer) | `lease-rollover.ts:83`, `:211` | verified |
| Enterprise | WALE / WALT | absent (stored column only) | no | `walt_years` column, no computation | verified |
| Enterprise | Loss to Lease (time-weighted) | present — exceeds ARGUS | yes — MF income approach | July, file present | inferred |
| Enterprise | Management fee as a primitive | present — exceeds ARGUS | yes | 61 files | verified |
| Enterprise | Renovation / value-add schedule | present — no ARGUS analogue | yes — Renovation page, `get_renovation_breakdown` | July, #178 | inferred |
| Enterprise | Rent control | present — no ARGUS analogue | yes | `rent_control_service.py` | inferred |
| Enterprise | Sensitivity matrix (discount × exit cap) | present (`_build_sensitivity_matrix`, `:656`) | yes — DCF view | code read | verified |
| Enterprise | NNN single-tenant valuation | **absent** | **yes — a screen with mock data behind it** | `nnn/*` all import `nnnMockData` | verified |
| Developer | Residual Land Value solve, 7 target types | absent (NPV renamed; dead columns; HBU stores a supplied figure) | partial — napkin tool only | §4.2 | verified |
| Developer | GDV / NDV | partial — gross and net revenue totals computed | yes — Feasibility→Cash Flow, cash-flow artifact | `:2266` | verified |
| Developer | Profit on Cost | partial — profit computed, ratio reported on revenue not cost | yes (margin shown), no (on-cost not shown) | `:2210` | verified |
| Developer | Development Yield | absent | — | 0 matches | verified |
| Developer | Dated IRR (XIRR) on the land cash flow | present — new since July | yes — Feasibility→Cash Flow summary; Landscaper | `_calculate_dated_irr` #319 | verified |
| Developer | Four-window absorption, deposit-date price lock | absent — by scope (bulk parcel sales model) | — | §3.3 | verified |
| Developer | Infrastructure cost apportionment | absent | — | 0 matches | verified |
| Developer | Construction loan / interest-reserve circularity | present — §2.8 attached | yes — Capital→Debt; land financing section; capitalization artifact. Iteration count not displayed | engine run | verified |
| Developer | Phase-by-phase financing | partial — loans attach to divisions (`_fetch_phase_division_mapping`) | partial | code read | inferred |
| Developer | Sensitivity tables / what-if | present — what-if shadow engine, `sensitivity_grid` | partial — Landscaper chat only; no screen | `whatif_engine.py`, tool schemas | verified |
| Developer | Land planning (acres → lot yield) | present — no ARGUS analogue | yes — `land_planning_run` tool | file present | inferred |
| Developer | Lotbank / builder options | present — no ARGUS analogue | yes — cash-flow artifact lotbank sections | `_build_lotbank_sections` | verified |
| Developer | Returns screen (land) | engine present (IRR, NPV, EM, payback, peak equity in `_calculate_summary_metrics`) | **no — Feasibility→Returns is "Coming Soon"**; figures reach the user only via the Cash Flow summary and Landscaper | `FeasibilityTab.tsx:124-144` | verified |
| Developer | Land sensitivity (sliders) | **wrong where it exists** (§2.2) | **no — "Coming Soon"**, component orphaned | §2.2 | verified |
| EstateMaster | Monte Carlo | absent | — | model classes only | verified |
| EstateMaster | JV structures / NPV less land | absent | — | July | inferred |
| EstateMaster | IRR honesty (tolerance, guess ladder, multiple-IRR, explicit N.A.) | partial — dated IRR returns `None` on no sign change; no multiple-IRR detection | n/a | `:2308-2311` | verified |
| Both | Waterfall with combined IRR+EM hurdle | present — exceeds ARGUS | yes — Capital→Equity | July | inferred |

---

## 6. Premises corrected during this review

| Premise | Correction |
|---|---|
| July §2.2: "VERIFIED, USER-FACING" | **Never user-facing.** The subtab was a placeholder at the July commit and the component had no importer. The 2026-09-04 fix to that route (#269) was spent on a screen no user can open. |
| July §3.3: "Profit on Cost / GDV / NDV — nothing computes them" | Gross revenue, net revenue, gross profit and margin were computed at the July commit. The on-cost ratio and development yield are what is absent. |
| July §7: "6 IRR implementations" | **11** solver sites by the same method today (12 with the dated land IRR); the count grew. |
| Start prompt: "main at `86b6960f`, 237 commits, 15 engine" | `86b6960f` was the feature-branch tip; `main` was one merge further (`e969b321`). 223 / 16 by this pass's count and folder set. |

**The pattern, again:** two of the four are the same mistake July named in its own §6 — asserting
reach without tracing to a mount. The rule stands and this pass applied it to every row in §5.

---

## 7. The finding that outranks the gap list — **re-measured, still true**

| Duplicate | July | 2026-10-21 | Method |
|---|---|---|---|
| IRR solver sites | 6 | **11** (12 with the borderline one) — Python: `financial_engine/waterfall/irr.py:24 calculate_xirr` (scipy brentq→newton), `financial_engine/core/metrics.py:47 calculate_irr` + `:98 calculate_xirr` (numpy-financial), `dcf_calculation_service.py:610 _calculate_irr` + `:1163 _calculate_monthly_irr`, `tool_executor.py _simple_irr` (own Newton), `calculations/series_metrics.py:42 irr_from_series` (the declared canonical, 2 callers), `reports/calculators/metrics_calculator.py:102 irr`; TypeScript: `calculations/metrics.ts:71` (Newton), `financial-engine/cashflow/metrics.ts:29` (Newton, multi-guess), `financial-engine/waterfall/irr.ts:25` (XIRR). Borderline: `land_dev_cashflow_service._calculate_dated_irr` (new; delegates to the shared xirr, falls back to its own `npf.irr`). Four distinct solver methods in use. | function definitions named `*irr*` that root-find, wrappers and endpoints excluded; counted twice (audit pass and checking pass) |
| NOI functions | 7 | **11** named functions | same |
| Direct Cap | 2 that do not tie | 2 (`calculate_direct_cap_value`, `useIncomeApproach.calcNOI`) — the "do not tie" claim **not re-verified** | grep |
| July's six orphans | — | `runFullSensitivityAnalysis` gone; `ParcelAbsorptionProfile` / `BenchmarkAbsorptionVelocity` still CRUD-only (no engine reads); `residual_land_value_per_acre` one type reference | grep |

Recommended sequence is unchanged and now has fifteen weeks of evidence behind it: every new
engine commit since July added correctness to an existing copy rather than retiring one.

---

## 8. Deliberate non-goals — **[July text, re-verified]**
UK/AU conventions, hotel, multi-currency, the 56-report catalog. **Add:** ARGUS Developer's four-window
unit absorption — Landscape's parcel bulk-sale model is a deliberate fit to how Gregg's deals work.

---

## 9. What this pass did not check

- **Not run:** anything needing a database — the 12 DB-backed debt-engine tests, the DCF and
  income-approach services end to end, every Landscaper tool. The audit ran on a Linux VM with a
  shallow clone; no Postgres.
- **Not run:** the Jest suites (no `node_modules` in the audit checkout). The TypeScript steepness
  test is cited, not executed.
- **Not opened:** the ARGUS source guides. No row needed a guide check; July's extraction stood.
- **Not re-verified at number level:** rows marked *inferred* in §5 — Loss to Lease, economic
  occupancy, renovation schedule, rent control, waterfall, land planning, JV structures.
- **Not traced:** whether the classic Valuation→Income DCF view and the RPT_13 report show the *same*
  DCF figure (the two-Direct-Cap "do not tie" question, extended to DCF).
- **Seen, not pursued:** 416 `*.bak` files are tracked in git, including `SensitivityAnalysisContent.tsx.bak`
  and `FeasibilityTab.tsx.bak` — repo hygiene, recorded in `next_actions.md`, out of this audit's scope.
- **Not done, by decision 2b:** no fix was made. Every open item is in `next_actions.md` with a
  done-when line.

---

**Maintained by:** Cowork chat PX (2026-10-21), superseding chat TB (2026-07-14).
**Next review:** after the §2 open items land or the IRR consolidation starts — whichever first.
**Do not update the July copy. Update this file.**

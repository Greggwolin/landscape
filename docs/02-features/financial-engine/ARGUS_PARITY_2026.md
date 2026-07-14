# ARGUS Parity — Re-Review 2026-07-14

**Supersedes TWO documents**, both now carrying in-file superseded headers (added 2026-07-14 —
a retired doc with no marker is a trap, which is exactly how the first one misled this session):

1. `docs/02-features/financial-engine/ARGUS_PARITY_CHECKLIST.md` (2025-10-13) — **retired.** See §0.
2. `docs/capitalization/FULL_ARGUS_PARITY_IMPLEMENTATION_STATUS.md` (2025-10-23) — **obsolete.** See §0.1.

**Session:** Cowork chat TB
**Scope:** All three ARGUS programs (1,714 pages) vs. live Landscape code
**Method:** Full text extraction → calculation-surface extraction per program → code mapping →
verification. Every claim below is tagged VERIFIED (code read) / INFERRED / ABSENT.

**This is the canonical ARGUS parity document.** It lives here, in the repo, beside the two files
it retires — deliberately. The originals it replaces pointed nowhere a repo reader could follow;
that is half of why they rotted unchallenged for nine months.

**Plain-English companion for non-technical readers:** `Landscape app/ARGUS_PARITY_2026.html`
(OneDrive workspace folder). Same findings, no jargon, decisions surfaced. Per PROJECT_INSTRUCTIONS
§10.5 — never ship the technical version alone.

**Source guides:** `reference/docs/` — ARGUS Enterprise (5 PDFs, 1,212 pp), ARGUS Developer
(`.docx`, ~116k words), ARGUS EstateMaster (245 pp).

**Supporting extractions (scratch — regenerate rather than trust; not committed):** per-program
calculation-surface extractions and the two code maps (`map_enterprise`, `map_developer`) were
produced in Cowork session TB. They are reproducible from the source guides above by the method in
this document. Their conclusions are folded into this file; the raw extractions were not committed
because they are large, machine-generated, and would themselves rot.

---

## 0. Why the old checklist is retired

| Claim | Reality |
|---|---|
| "Current Parity Status: 75%" | Unfounded. No verification method was recorded. |
| "**full data model parity** with ARGUS Enterprise" | The tables exist. Six of them are read by exactly ONE file (`src/lib/financial-engine/db.ts`). `tbl_waterfall` has **zero** readers. Schema existence was equated with parity. |
| "Schema: 100%" | True but meaningless — a column is not a calculation. |
| "Calculation Engine: 30%" | Nine months stale. Never re-measured. |

**The methodological error worth naming:** the checklist graded *storage*, not *computation*, and
then reported the result as parity. This is the same failure class as a test that asserts response
shape but never the value — see the LSCMD-IRRWIRE-0714-TB defect found the same session.

---

## 0.1 The capitalization status doc is not stale — it's void

`docs/capitalization/FULL_ARGUS_PARITY_IMPLEMENTATION_STATUS.md` (2025-10-23) was **not read
during the main review** — an error, caught by Gregg. Read and verified 2026-07-14. Every premise
in it is dead:

| It says | Verified reality |
|---|---|
| 4 form components + `CapitalizationTab` under `src/app/prototypes/multifam/rent-roll-inputs/` | **All five DELETED** |
| Fields respect **basic/standard/advanced modes** | **Modes removed from the UI entirely** (CLAUDE.md) |
| Phase 4 = expand Next.js `fieldMapping` 8 → 34 fields | **Moot.** The route is now a **thin proxy to Django** spreading `...payload`. No mapping to expand. |
| "40% Complete" | The plan was **abandoned**, not stalled. 40% of a discontinued plan is 0%. |
| Capitalization lives in `/prototypes/` | Rebuilt at `src/components/capitalization/` |

**Why this matters more than the content:** the doc's *problem* was solved by changing the
architecture, not by executing the plan. A reader would have spent days doing Phase 4 work against
routes where field mapping no longer exists. **Obsolete docs don't just misinform — they direct
effort at nothing.**

**One live risk it accidentally surfaced:** the capitalization proxy forwards `...payload` blindly
to Django. Per CLAUDE.md §15.1, tool writes fail **silently** when `ALLOWED_UPDATES` doesn't match
real DB columns — 200 returned, nothing saved. A blind-forwarding proxy inherits that exposure.
Worth a targeted audit of the loan/equity write path. **Logged, not started.**

**Both old docs now carry in-file superseded headers.** They previously carried none — so the next
session opening one would read "75% parity" or "40% complete" and believe it. That is precisely how
this session was misled. Marking them is the cheap fix; deleting them loses the history of *why*
the numbers were wrong, which is the useful part.

---

## 1. Scope correction: it's two programs, not three

**ARGUS Developer and ARGUS EstateMaster overlap ~80–85%** (VERIFIED by grep, not memory).
Altus acquired EstateMaster in 2018; the products were never merged.

**Use ARGUS Developer as the land-dev benchmark.** It has:
- 7 residual-target types vs. EstateMaster's 2
- A stated solver cascade (Newton's → Secant → Interpolation)
- Four-window absorption with deposit-date price locking

EstateMaster has **zero** Monte Carlo… correction: EstateMaster *has* Monte Carlo, **Developer has
zero**. Carry forward only these four EstateMaster-unique items:
1. **Monte Carlo** — and note EM admits "variables are totally independent." Correlated sampling
   is a genuine competitive opening.
2. **JV structures / *NPV less Land Value***
3. **RLV doctrine** (the 2-year rule)
4. **IRR honesty** — 0.00001% tolerance, guess ladder (0%, ±½g, ±2g, ±3g), multiple-IRR detection,
   returns an explicit "N.A." rather than a wrong number.

**EstateMaster's weakest link:** absorption is `quantity ÷ span` — flat, and an *output*. Useless
for master-planned communities. Landscape should not copy it.

---

## 2. DEFECTS FOUND — fix before building any parity feature

> ## ⚠️ CORRECTION 2026-07-14 (post-TB12) — "LIVE" WAS WRONG FOR §2.1, §2.7, AND THE NPV DEFECT
>
> This section was headed "LIVE DEFECTS — wrong numbers reaching users today." **That was wrong
> for the CRE path**, and the error is mine. CC could not run the live check for TB12 because
> `tbl_cre_property` does not exist. Investigating that produced a bigger finding:
>
> **All 13 `tbl_cre_*` tables are PHANTOM — referenced in code, never created in the database,
> and no migration ever created them.** VERIFIED 2026-07-14:
>
> `tbl_cre_property` · `tbl_cre_lease` · `tbl_cre_space` · `tbl_cre_tenant` ·
> `tbl_cre_base_rent` · `tbl_cre_rent_escalation` · `tbl_cre_expense_recovery` ·
> `tbl_cre_percentage_rent` · `tbl_cre_operating_expense` · `tbl_cre_vacancy` ·
> `tbl_cre_noi` · `tbl_cre_capital_reserve` · `tbl_cre_dcf_analysis`
>
> **Both consumers of `calculateInvestmentMetrics` sit on that phantom schema:**
> `/api/cre/properties/[id]/metrics` and `/api/cre/properties/[id]/sensitivity` (via
> `src/lib/calculations/sensitivity.ts`). Both 500 on a missing relation before reaching any math.
>
> **Therefore: nobody ever saw the wrong IRR or the inverted NPV.** The TB12 fix is still correct
> and the tests still pin it — but it was correctness work on an orphaned module, not an emergency.
> The "would tell you to walk away from a good deal" framing was unearned.
>
> ### This also corrects §3 and the architecture call
>
> **There are THREE income-property models, not two.** This document (and the decision recorded
> against it) said two. Actual:
>
> | # | Model | Status |
> |---|---|---|
> | 1 | `tbl_lease` / `tbl_base_rent` / `tbl_escalation` (Oct 2025) | **DORMANT** — schema exists, ~1 reader |
> | 2 | `tbl_multifamily_unit` / `tbl_rent_roll_unit` | **LIVE** |
> | 3 | `tbl_cre_*` (13 tables) | **PHANTOM** — code only, no tables, no migration |
>
> **Models 1 and 3 both target office/retail/industrial.** So that side has *two competing
> half-built models*, and the more complete-looking one has no database behind it at all.
> Gregg's call — "land and apartments bulletproof, office/retail can wait" — is *more* right than
> the evidence I gave him: the commercial side is further from real than this document said.
>
> ### Liveness is now unverified for the rest of §2
>
> §2.2–§2.6 and §2.8 have **not** been re-checked for reachability. They are probably live
> (Python/MF and land paths, not CRE), but after being wrong twice on exactly this,
> **do not treat any of them as user-facing until the path is traced to a real table.**
> That check is a prerequisite for the next fix batch, not an optional extra.

### 2.1 ⚫ IRR is a monthly rate reported as annual — **VERIFIED, but on the PHANTOM CRE path**
**Fixed and merged** — PR #161 (`ae417a50`), session TB12-METRICSPERIOD-0714. Not user-facing (above).
`/api/cre/properties/[property_id]/metrics` feeds a **monthly** cash-flow series into
`src/lib/calculations/metrics.ts:71`, which returns a **per-period** rate. Nothing annualizes it.

**A 9% IRR displays as ~0.72%.** The Python twin annualizes correctly → two endpoints on the same
data diverge by an order of magnitude.

*Most damaging live bug found.* Same root cause as LSCMD-IRRWIRE-0714-TB: duplicated math that drifted.

### 2.2 🔴 Land-value sensitivity does no discounting — **VERIFIED, USER-FACING**
`src/app/api/projects/[projectId]/sensitivity/calculate/route.ts:58`
Comment says `(Revenue − Costs)/(1+r)`. Code is `totalRevenue - totalCosts`. **No discounting.**
Consequences, all provable:
- The **`Absorption Rate (units/mo)` slider cannot move Land Value.** It is inert by construction.
- Opex is double-counted.
- IRR/NPV are computed on a zero land basis, displayed adjacent to the land value.

### 2.3 🔴 `curve_steepness` unit mismatch — silent, LLM-writable — **VERIFIED**
Model documents 0–100. Engine expects ~0.5 (`x *= steepness * 2`).
**A stored `50` saturates the logistic and collapses an entire cost line into one period.**
No validation. Landscaper can write this field.

### 2.4 🟠 `Math.random()` decides renewal probability — **VERIFIED**
`src/lib/financial-engine/lease-rollover.ts:83` resolves renewal by an **unseeded dice roll**.
This is the exact inversion of ARGUS's signature insight (blend, don't sample). The correct
blended implementation exists **130 lines below in the same file** and is never called.
Orphaned today → landmine on activation. Also non-deterministic: same inputs, different answers.

### 2.5 🟠 DCF double-counts the management fee — **VERIFIED**
`dcf_calculation_service.py:309` omits the exclusion that `views_income_approach.py:329` applies.
**The DCF tile and the Direct Cap tile disagree on the same page, for the same property.**

### 2.6 🟠 Terminal management fee is grown, not recomputed — **VERIFIED**
Should be recomputed as % of terminal EGI. Corrupts exit value — i.e. roughly **half of PV**.

### 2.7 🟠 Unlevered/levered IRR inputs inconsistent — **VERIFIED**
Unlevered passes gross `exitValue`; levered passes `netReversion`. Adjacent lines.

### 2.8 🟡 Revolver non-convergence is silent — **VERIFIED**
Returns a commitment one iteration out of sync with the reserve. **No `converged` flag.**
(ARGUS Developer exposes its iteration cap in the UI and admits non-convergence. Landscape hides it.)

---

## 3. Genuinely ABSENT — by property type

### 3.1 Office / Retail / Industrial (lease-level model — DORMANT)

| ARGUS capability | Status | Note |
|---|---|---|
| **General Vacancy gross-up/reduce** | **ABSENT** | See §4 — this is the big one |
| **Absorption & Turnover Vacancy** | **ABSENT** | Prerequisite for the above |
| **Fixed/variable expense split** | **ABSENT** | No `fixed_pct` anywhere; every expense is 100% fixed |
| **Base Year Stop / recovery structures** | **SCHEMA ONLY** | 31 columns in `tbl_lease_ret_ext`, **zero readers/writers**. Largest schema-vs-implementation gap found. |
| **Resale NOI gross-up (Lag Vacancy)** | **ABSENT** | 6-step stated algorithm, none of it built |
| **Straight-line / GAAP rent** | **ABSENT** | |
| **MLA blending across all fields** | **PARTIAL/WRONG** | See §2.4 |
| **WALE / WALT** | **ABSENT** | |

### 3.2 Multifamily (unit-level model — LIVE)

| ARGUS capability | Status |
|---|---|
| Loss to Lease | **PRESENT — and better than ARGUS.** See §5 |
| Potential Market Rent | PRESENT |
| Economic Occupancy | PRESENT |
| **Direct Cap valuation-date anchor** | **ABSENT** — GPR is `SUM(current_rent) × 12`. `valuation_date` is stored (`models_valuation.py:1350`) and **never read**. The bases are *named* `f12_current`/`f12_market` while containing **no forward period**. |
| Recoveries | Correctly N/A — ARGUS disables recoveries for MF too (p406) |

### 3.3 Land Development

| ARGUS Developer capability | Status |
|---|---|
| **Residual Land Value solving** | **ABSENT — and worse than absence.** See §4.2 |
| Profit on Cost / GDV / NDV | **ABSENT** — nothing computes them |
| Development Yield | **ABSENT** |
| Four-window absorption + deposit-date price locking | **ABSENT** |
| Infrastructure cost apportionment | **ABSENT** |
| Monte Carlo (EstateMaster) | **ABSENT** — docs advertise it; grep confirms never built |
| Construction interest circularity | **PRESENT — better conditioned than ARGUS.** See §5 |

---

## 4. The two structural gaps

### 4.1 General Vacancy is not a bolt-on

ARGUS's stated formula (Enterprise p185):
```
[(Method Chosen + Absorption & Turnover Vacancy) × General Vacancy %]
    − Absorption & Turnover Vacancy = General Vacancy
```

This only works because ARGUS **projects revenue at potential (as if fully leased)** and then
deducts A&T Vacancy as an explicit separate line for known downtime. General Vacancy is then a
**top-up to a stabilized floor**, never additive, floored at zero.

**Landscape applies a flat rate to in-place GPR.** There is no A&T line and no potential-rent
projection.

⚠️ **Therefore: building General Vacancy alone produces a number that looks like ARGUS's and means
something different.** The prerequisite is the potential-rent + A&T architecture. Sequence matters.

### 4.2 RLV: three contradictory artifacts, none real — **VERIFIED**

1. `tbl_project_metrics.residual_land_value_per_acre` / `_per_unit` — **dead columns.** Zero
   writers. No Django model.
2. `solve_for_land_value` (`tool_executor.py:18709`) — **a rename of NPV, not a solve.** Correct
   for exactly one target type (land *is* genuinely excluded from the series — VERIFIED), but
   napkin-only and disconnected from the budget/parcel model.
3. The **live Feasibility tab** ships a wrong one (see §2.2).

No root-finder. No target types. No goal seek.
The old checklist was **honest here** — `ARGUS_PARITY_CHECKLIST.md:58` says "⧗ Planned."

**The solver is not the blocker.** Landscape already has `scipy.optimize.brentq`. The blocker is
that **nothing computes Profit on Cost / GDV / NDV**, so 6 of ARGUS's 7 target types have no
objective function to root-find on. Build the metrics first; the solve is then ~a day.

---

## 5. Where Landscape EXCEEDS ARGUS

Do not lose these while chasing parity.

| Capability | Why it beats ARGUS |
|---|---|
| **Time-weighted Loss to Lease** | Discounts each unit's gap over its own remaining lease term. ARGUS states only a simple difference (p539). |
| **Management fee as a first-class primitive** | ARGUS has **no** management-fee primitive — you fake it with `% of Other` (p286). |
| **`land_planning_engine`** | Gross acres → lot yield with conservative/base/optimistic bands. **ARGUS has no equivalent at all.** |
| **`lotbank_engine`** | Builder lot-takedown options. **Absent from ARGUS.** |
| **Interest-reserve solve** | Better *conditioned* than ARGUS's: fee solved analytically → 1-variable fixed point, vs. ARGUS iterating both. (But capped at 15 not 35, and hidden — see §2.8.) |
| **Waterfall `IRR_EMX` combined hurdle** | ARGUS requires separate IRR-Lookback and Equity-Multiple tiers. |
| **Value-add renovation schedule** | Month-by-month, unit-by-unit, with re-let lag. No ARGUS analogue. |
| **Rent-control integration** | No ARGUS analogue. |

---

## 6. Premises corrected during this review

Recorded because three of my own briefing assumptions were wrong, and one prior claim was overcounted.

| Premise | Correction |
|---|---|
| "`scurve.ts` has linear/front/back/bell + steepness" | **Wrong.** `scurve.ts` has **no S-curve and no steepness.** Front-loaded is a two-step function; "bell" is a triangle. |
| "The Python S-curve is its twin" | **Wrong.** The Python logistic in `land_dev_cashflow_service.py` is the **only real S-curve** in the codebase. |
| "~9 absent UK features are gaps" | **Wrong.** Stamp duty, VAT, Zone A etc. are **correct scope calls**, not gaps. |
| "Seven duplicate IRR implementations" | **Six.** One was a wrapper. |
| "The project-metrics tool returns `irr: null` silently" | **Wrong on live data.** A pre-existing schema drift (`BudgetItem.category` vs. live `category_id`) fails the budget query first. **Caught by CC, not by me.** |
| "The CRE metrics IRR/NPV defects are LIVE and user-facing" | **Wrong.** All 13 `tbl_cre_*` tables are **phantom** — code-only, no migration. Both consumers 500 before any math runs. **Caught by CC, not by me.** |
| "There are two income-property models" | **Three.** Dormant lease model, live unit model, and a **phantom CRE model**. Models 1 and 3 both target office/retail — two competing half-built models on that side. |

**The pattern in my own errors, stated plainly:** three of the five above are the same mistake —
**asserting user impact without tracing the code path to a real table.** Twice CC caught it, both
times by attempting the live check I had specified but could not run. That is not a coincidence and
it is not CC being lucky: **the only reliable test of "is this live" is executing it against the
real database.** Static reading cannot distinguish a shipped feature from a phantom one, because
they are byte-identical in source.

**Rule going forward:** never label a defect "live" or "user-facing" until the path has been
executed against the real database, or a real table has been confirmed at the end of it. Reachable
from a route ≠ live. Compiles ≠ live. Has tests ≠ live.

---

## 7. The finding that outranks the gap list

**The failure mode is not missing math. It is duplicated math that drifted.**

VERIFIED counts in live code:
- **7** NOI implementations
- **6** IRR implementations, 3 different solvers, **2 different period conventions**
- **3** recovery implementations
- **2** Direct Cap implementations **that do not tie**

Six orphans found, all *accepted → stored → ignored*: dead RLV columns ·
`runFullSensitivityAnalysis` (never imported; `Base Rent PSF` and `Hold Period` always report
0 bps) · `ParcelAbsorptionProfile` / `BenchmarkAbsorptionVelocity` (CRUD, no engine reads them) ·
`curve_profile` (front/back-loaded accepted, stored, **never selected in the SQL**) · `curve_id` ·
`'lump'`.

⚠️ **Adding parity features before consolidating will multiply the drift.** Every new ARGUS
capability built today gets built into a codebase where the same calculation already exists in
2–7 places. That is how six IRRs happened.

**Recommended sequence:**
1. Fix §2 live defects (wrong numbers reaching users now)
2. Consolidate the duplicates (pick a canonical per calculation; resolve the two cash-flow shapes
   first — see `project_irr_duplication`)
3. Then build parity, in this order: RLV objective functions → potential-rent + A&T architecture →
   General Vacancy → recovery structures

---

## 8. Deliberate non-goals

Confirmed out of scope; do not treat as gaps:
- UK/AU conventions: stamp duty, VAT, Zone A, Traditional Valuation, Capitalization Valuation
- Hotel (ARGUS has a separate subsystem)
- Multi-currency
- ARGUS's 56-report catalog (Landscape's 20 are the right subset)

---

**Maintained by:** Cowork chat TB · **Next review:** after §2 defects land and consolidation completes.
**Do not update the retired checklist. Update this file.**

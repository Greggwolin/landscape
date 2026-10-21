# IRR solver consolidation — plan (#LS-1021-10)

**Written:** 2026-10-21 (chat PX), from the ARGUS parity re-audit of the same day
(`ARGUS_PARITY_2026.md` §7). **Status:** plan only — no code in this document's PR.
**Owner of the go/no-go:** Gregg. **Shape:** four slices, one PR each, each slice
leaves the app working and reviewable (§4.10), none merges unseen.

## 1. The problem, measured

Eleven functions root-find an IRR (twelve with the borderline one), using four
distinct methods, with conventions that differ in ways that change the answer:

| # | Site | Method | Convention | Callers (non-test) |
|---|---|---|---|---|
| 1 | `backend/apps/calculations/series_metrics.py:42 irr_from_series` | numpy-financial `irr` | signed per-period series; returns `None` on NaN; **declared canonical** | 7 (views + services) |
| 2 | `backend/financial_engine/core/metrics.py:47 calculate_irr` | numpy-financial | decomposed (initial, flows, reversion) | `calculations/services.py`, `multifamily_adapter.py`, `series_metrics.py` |
| 3 | `backend/financial_engine/core/metrics.py:98 calculate_xirr` | delegates to #4 | dated | internal |
| 4 | `backend/financial_engine/waterfall/irr.py:24 calculate_xirr` | scipy `brentq` → `newton` fallback | dated, `Decimal`, Actual/365 | `waterfall/engine.py`, `land_dev_cashflow_service.py` |
| 5 | `backend/apps/financial/services/dcf_calculation_service.py:~610 _calculate_irr` (≈656 after PR #331) | numpy-financial | builds `[-PV, NOI…, NOI_N + reversion]` itself | 3 internal |
| 6 | `…/dcf_calculation_service.py _calculate_monthly_irr` | numpy-financial, annualised `(1+r)^12 − 1` | monthly series | internal |
| 7 | `backend/apps/landscaper/tool_executor.py:19927 _simple_irr` | hand-written Newton, no bracketing | per-period; returns `None` when derivative ~0 or after 100 iterations | 3 sites in the same file (draft-analysis tools) |
| 8 | `backend/apps/reports/calculators/metrics_calculator.py:102 irr` | numpy-financial, bare `except:` | per-period | `reports/generators/property_summary.py`, `reports/views.py` |
| 9 | `src/lib/calculations/metrics.ts:71` | Newton | per-period | **none** — dead |
| 10 | `src/lib/financial-engine/cashflow/metrics.ts:29` | Newton, multi-guess | per-period | `cashflow/index.ts`, `cashflow/engine.ts` (own module); nothing imports the module from the app |
| 11 | `src/lib/financial-engine/waterfall/irr.ts:25` | XIRR | dated | none outside its own module |
| b | `land_dev_cashflow_service._calculate_dated_irr` | delegates to #4, falls back to `npf.irr` | dated → periodic fallback | internal |

Why it matters: a Newton solver without a bracket (#7, #9, #10) can converge to a
different root than brentq (#4) on a series with more than one sign change — land
deals with staged parcel sales and a late infrastructure draw have exactly that
shape — and the two will disagree without either reporting a problem. Every
engine commit since July added correctness to one copy; none retired one.

## 2. Target state

One Python module owns the arithmetic; everything else adapts shapes to it.

```
backend/apps/calculations/series_metrics.py        ← stays the canonical home
    irr_from_series(flows)                         ← existing, periodic
    irr_from_dated(dates, flows)                   ← NEW: moves calculate_xirr's brentq core here
    annualize_periodic(rate, periods_per_year)     ← NEW: the one (1+r)^n − 1 formula
    IrrResult(rate, converged, method, sign_changes)  ← NEW: callers can see when the
                                                      answer is suspect instead of a bare float
```

Rules the target enforces (each gets a test in slice 1):

1. **One method per shape.** Periodic → numpy-financial `irr` with a sign-change
   count; if more than one sign change, fall through to a bracketed `brentq` on
   NPV over `(-0.99, 10)` and report `method='brentq'`. Dated → brentq, Actual/365.
   Newton is never the primary method anywhere.
2. **`None` means "no real IRR"**, never "the solver gave up". A give-up is
   `converged=False` with the best rate, so a caller can show "(did not settle)"
   — the same convention PR #332 introduced for the revolver.
3. **Annualising is one function.** `(1+r)^12 − 1` appears in exactly one place.

`financial_engine/waterfall/irr.py` keeps its public name (`calculate_xirr`) as a
thin shim over `irr_from_dated`, because the waterfall package is vendored into
the Railway build and three callers import it by that name.

## 3. Slices

| Slice | Scope | Risk | Test gate |
|---|---|---|---|
| **1 — canonical core** | Add `irr_from_dated`, `annualize_periodic`, `IrrResult`, the sign-change fall-through, to `series_metrics.py`. Move the brentq body out of `waterfall/irr.py` into it; `calculate_xirr` becomes a shim. No caller changes. | Medium (waterfall engine imports) | New `test_series_metrics.py`: Excel-checked fixtures for periodic, dated, monthly-annualised; a two-sign-change series where Newton and brentq differ and the canonical returns the brentq root with `sign_changes=2`; the existing Star Valley waterfall fixture ties to the cent. |
| **2 — backend internal copies** | #5, #6 (DCF) and #8 (reports) call the canonical. #7 (`_simple_irr`) is deleted and its three call sites call the canonical. #2 (`InvestmentMetrics.calculate_irr`) keeps its decomposed signature but builds the series and calls #1. | High — DCF is money math; Landscaper draft tools | Before/after figures on project 9 (Peoria) and project 17 (MF) for: Income Approach DCF IRR, land cash-flow IRR, `property_summary` report IRR, a Landscaper draft-analysis IRR. Each must be unchanged to 1e-6 or the diff explained in the PR body. Database-level check per §15.2 for anything persisted. |
| **3 — TypeScript** | #9 deleted (no importers). #10 and #11 are the TypeScript cash-flow engine's own solvers and that engine has no app importer either (same finding as the lease-rollover module, PR #333): either delete the TS engine's solvers with it or, if a client-side IRR is still wanted (the what-if slider, say), keep one `irr.ts` with brentq-style bisection and the same `IrrResult` shape, ported from slice 1 with the same fixtures. | Medium | jest fixtures shared with slice 1 (same JSON file, checked into `tests/fixtures/irr/`). |
| **4 — guard** | A pytest + jest pair that greps for `npf.irr(`, `brentq(`, `newton(` and any function named `*irr*` outside the canonical module(s) and fails on a new one — the same shape as `test_engine_docs_truthful.py`. | Low | The guard itself. |

Slice 2 is the one that can change a number a user has already seen. It is
split by call site inside the PR body so that each before/after is its own
line, and it does **not** start until Gregg has run slice 1 locally (§4.10).

## 4. Out of scope (deliberately)

- NOI duplication (11 named functions, §7 of the audit) — same disease, separate
  plan; mixing them doubles the blast radius of slice 2.
- Direct Cap tie-out between `calculate_direct_cap_value` and `useIncomeApproach.calcNOI`
  — not re-verified in October; needs its own measurement first.
- Changing *which* IRR a screen shows (levered/unlevered, project/equity) — that
  is a product decision and the audit gap list already carries it.

## 5. What Gregg decides before slice 1 starts

Nothing — slice 1 adds and moves, changes no number. The decision point is
**between slice 1 and slice 2**: whether a disagreement found by the before/after
check should be fixed to the canonical answer (recommended — the canonical is
the bracketed one) or preserved for continuity. That question comes with the
measured deltas, not before.

## 6. Day count and order

Multi-day by design; one slice per sitting, each ending at pushed + PR open +
CI green. Order is 1 → 2 → 3 → 4; slice 4 can ship alongside 3. Nothing in the
other nine audit fixes (PRs #331–#337) depends on this plan, and this plan does
not depend on them except that PR #331 already touched the DCF service's
management-fee rows and slice 2 should rebase on it.

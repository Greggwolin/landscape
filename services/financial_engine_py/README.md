# Financial Calculation Engine (v1.0)

**CRE & land-development return calculations in Python (numpy-financial, pandas, scipy).**

> **Rewritten 2026-10-21** (ARGUS parity re-audit, #LS-1021-07). The previous
> README described a command-line tool, a FastAPI server, a Monte Carlo module, a
> sensitivity module and a TypeScript-parity test suite. None of those exist in
> this repository and most never did; `cli.py` was deleted on 2026-07-14 (CU6).
> Everything below is checked against the files on disk. If you add a module,
> add it here *and* to the docstring in `financial_engine/__init__.py` — a test
> imports every module that docstring names.

---

## Where the code actually lives

`services/financial_engine_py/financial_engine` is a **symlink** to
`backend/financial_engine`. The package is vendored into the Django backend so it
ships in the Railway build context; `backend/config/settings.py` puts the backend
directory on `sys.path`, so `import financial_engine` resolves there. This
folder keeps the Poetry metadata and the engine's own tests.

```
services/financial_engine_py/
├── pyproject.toml                 # Poetry dependencies (no console script)
├── README.md                      # This file
├── financial_engine -> ../../backend/financial_engine   # symlink
└── tests/
    ├── conftest.py
    ├── test_metrics.py
    ├── test_waterfall.py
    ├── test_waterfall_excel.py
    ├── excel_waterfall_utils.py
    └── verify_waterfall_from_excel.py

backend/financial_engine/
├── __init__.py                    # exports InvestmentMetrics, CashFlowEngine
├── config.py                      # pydantic-settings (DATABASE_URL, IRR tolerance, logging)
├── models.py                      # pydantic data models (property, lease, debt, results, waterfall)
├── db.py                          # psycopg2 connection helpers
├── core/
│   ├── metrics.py                 # InvestmentMetrics — IRR, XIRR, NPV, DSCR, equity multiple
│   ├── cashflow.py                # CashFlowEngine — multi-period cash flow (pandas)
│   └── leases.py                  # LeaseCalculator — escalations, recoveries, percentage rent
└── waterfall/
    ├── engine.py                  # WaterfallEngine — multi-tier LP/GP distributions
    ├── formulas.py
    ├── irr.py                     # calculate_xirr and related solvers
    ├── runtime.py                 # build_project_engine (project → waterfall inputs)
    └── types.py
```

## What it does

- **Return metrics** — IRR / XIRR, NPV, DSCR by period, equity multiple, cash-on-cash
  (`core/metrics.py`, numpy-financial).
- **Cash flow projections** — monthly or annual, with lease modelling (`core/cashflow.py`).
- **Lease analytics** — base rent escalations (fixed %, CPI, stepped), percentage rent,
  expense recoveries (gross / NNN / modified gross), free rent and TI (`core/leases.py`).
- **Distribution waterfalls** — multi-tier preferred return / catch-up / residual
  split with hurdles (`waterfall/`).

## What it does not do

- **No Monte Carlo.** Never written. The `MonteCarloResult` / `VariableDistribution`
  models and the `mc_*` settings that implied it were removed 2026-10-21.
- **No sensitivity module.** `models.py` still carries `SensitivityVariable` and
  `TornadoResult` data shapes, but there is no `core/sensitivity.py` to produce them.
  Product-side what-if analysis lives in the Landscaper tools (`backend/apps/landscaper`).
- **No CLI, no FastAPI server.** The engine is called in-process from Django.
- **No TypeScript parity suite.** The TypeScript calculation files this engine
  replaced were deleted (`src/lib/python-calculations.ts`, `src/lib/calculations/sensitivity.ts`,
  2026-07-14).

## How it is called

In-process from the Django backend:

| Caller | Imports |
|---|---|
| `backend/apps/calculations/services.py` | `InvestmentMetrics`, `CashFlowEngine`, `WaterfallEngine`, `build_project_engine` |
| `backend/apps/calculations/adapters/multifamily_adapter.py` | `InvestmentMetrics` |
| `backend/apps/financial/services/land_dev_cashflow_service.py` | `waterfall.irr.calculate_xirr` |

```python
from financial_engine.core.metrics import InvestmentMetrics

metrics = InvestmentMetrics()
irr = metrics.calculate_irr(
    initial_investment=10_000_000,
    cash_flows=[500_000, 500_000, 500_000],
    reversion_value=11_000_000,
)
```

Note that the backend has several other IRR solvers besides this one; the
consolidation plan is tracked under #LS-1021-08 in the ARGUS parity audit
(`docs/02-features/financial-engine/ARGUS_PARITY_2026.md`, §7).

## Setup and tests

```bash
cd services/financial_engine_py
poetry install
poetry run pytest                      # the engine's own tests
poetry run pytest tests/test_metrics.py -v
```

The Django suite also exercises the engine (`backend/apps/calculations/tests/`);
run it from `backend/` with a **local** `DATABASE_URL` — see `CLAUDE.md`, Testing.

Environment: `DATABASE_URL` (PostgreSQL) is the only variable `config.py` requires.

## Development

```bash
poetry run mypy financial_engine/
poetry run black financial_engine/
poetry run ruff check financial_engine/
```

---

**Version:** 1.0.0
**Last Updated:** 2026-10-21

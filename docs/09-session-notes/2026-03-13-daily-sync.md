# Daily Sync — 2026-03-13

**Date**: Friday, March 13, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **LoanCard edit mode expansion** — Added General section (loan name, lender, structure, type selectors) and 5 new interest-detail fields (interest_index, index_rate_pct, interest_spread_bps, interest_calculation, interest_payment_method) to LoanCard edit form and serializer.
- **Phase 0 market intelligence investigation** — Three new backend discovery scripts (`phase0_discovery.py`, `phase0_comps_schema.py`, `phase0_platform_intelligence.py`) and `PHASE0_FINDINGS_MARKET_INTELLIGENCE.md` exploring comparables schema and market data architecture.
- **Loan migration: index_rate_pct** — Migration `0051_add_loan_index_rate_pct.py` added `index_rate_pct` column to the loan model.

### Bugs Fixed
- **Loan serializer null handling** — `commitment_amount` now `allow_null=True, default=0` (was rejecting nulls). `index_rate_pct` added to serializer with `allow_null=True`.
- **Loan sizing error handling** — `views_debt.py` `perform_create` and `perform_update` now wrap `_apply_sizing()` in try/catch so sizing failures don't block loan saves.
- **LoanCard payload sanitization** — Empty strings for integer/decimal fields now coerced to `null` before API submission (DRF rejects `""` for numeric columns). Error logging improved with full payload dump.
- **LeveragedCashFlow origination fee fix** — Removed incorrect origination/fees row from periodic debt service. Origination fees are time-0 closing costs already deducted via `resolveLoanNetProceeds`, not operating expenses.

### Documentation
- **Nightly health check** — `health-2026-03-13_0800.json` generated. Yesterday's session note committed.

## Files Modified

```
PHASE0_FINDINGS_MARKET_INTELLIGENCE.md             (+191)
backend/apps/financial/serializers_debt.py         (+9, -1)
backend/apps/financial/views_debt.py               (+16, -2)
backend/phase0_comps_schema.py                     (+156)
backend/phase0_discovery.py                        (+144)
backend/phase0_platform_intelligence.py            (+101)
backend/apps/financial/migrations/0051_*           (+42)
src/app/projects/[projectId]/capitalization/debt/page.tsx (+69, -45)
src/components/capitalization/LeveragedCashFlow.tsx (+3, -26)
src/components/capitalization/LoanCard.tsx          (+217, -89)
src/types/assumptions.ts                           (+1)
src/types/financial-engine.ts                      (+1)
docs/UX/health-reports/health-2026-03-13_0800.json (+64)
docs/09-session-notes/2026-03-12-daily-sync.md     (committed)
```

## Git Commits

```
c8a99ad deploy: 2026-03-13_1703 - automated deployment (3 hours ago)
b94709f docs: nightly health check 2026-03-13 (12 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Phase 0 discovery scripts (`backend/phase0_*.py`) are investigation artifacts — decide whether to keep, move to `scripts/`, or remove.
- [ ] Market Agents service scaffolded but not yet integrated (carry-forward from 3/12).
- [ ] Waterfall calculate endpoint still returns 404 (alpha blocker #4).

## Alpha Readiness Impact

No alpha blocker status changes. Today's capitalization work is incremental improvement within the existing "PARTIAL" status for Step 12 (Capitalization). The origination fee fix and null-handling improvements strengthen loan CRUD reliability but don't resolve the waterfall calculate endpoint gap.

## Notes for Next Session

- The LeveragedCashFlow origination fee removal is a meaningful accounting fix — origination fees were being double-counted (once in net proceeds at time 0, again as periodic debt service). Verify on production that the cash flow table looks correct.
- LoanCard now has significantly more edit fields exposed. Test the full create/edit/save cycle on production to confirm the serializer accepts all new fields.
- The `phase0_*.py` scripts in `backend/` are exploration artifacts, not production code. They should be moved or cleaned up before they accumulate.
- `project` field added to `read_only_fields` in `LoanCreateUpdateSerializer` — this prevents clients from accidentally overriding the project assignment during loan creation.

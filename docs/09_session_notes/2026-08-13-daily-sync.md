# Daily Sync — 2026-08-13 (Wednesday)

## Activity Summary

**Active development today on `fix/guard-reply-and-cumulative-0813`** — 2 commits, 26 files changed, +835/-84 lines. Work addresses six findings from the PD14 demo report and five analysis inclusion defects. The current checkout (`chore/ci-gate-stacked-prs`) had no commits today.

---

## Commits

### `4ba8e591` — fix(landscaper): preserve guard-blocked replies, fix cumulative total, floor negative exits (PD15)

Session `LSCMD-PD-GUARDFIX-0813-PD15`. 16 files, +705/-24.

Six fixes from the PD14 findings report:

1. **Fabrication guard no longer destroys the reply.** Previously discarded the model's entire answer on a `reply_states_unsourced_financials` hit. Now replaces only the unverified figures in-place with "[figure withheld — not verified against project data]" and appends the guard's question below a separator. `metadata` gains `redacted_figures`.

2. **Consecutive guard fires escalate.** When the immediately prior assistant turn was also blocked, the tail becomes a plain-language explanation instead of repeating the same question.

3. **`get_project_documents` status filter trap fixed.** `status_filter='active'` was applied to `dms_extract_queue.status`, producing zero rows and causing the model to report "no documents on file." Live vocabulary mismatch: `core_doc.status` uses {draft, processing, indexed}, not 'active'. Filter now routes to the column that owns the value; unrecognized values return everything with a `filter_ignored` note.

4. **BASE_INSTRUCTIONS tightened:** never offer an action no registered tool performs; verify document + extraction exist before offering document-derived actions.

5. **Cumulative Cash Flow total fixed.** The Total column summed a running balance (double-counting every earlier period). Now uses the closing balance. Shared renderer covers RPT_12/17/18/19.

6. **Negative terminal NOI floors exit at zero.** All three unguarded exit divisions route through `_exit_value_or_floor`; non-positive terminal NOI yields zero exit value/selling costs/net reversion plus `exit_not_meaningful` with reason. Surfaces in proforma reports, cash-flow artifact, DCF view, and leveraged cash-flow reversion modal.

New test files: `test_fabrication_guard_redaction.py` (+152), `test_proforma_cumulative_total.py` (+128), `test_exit_floor.py` (+84).

### `a06ba29b` — fix(analysis): correct five inclusion defects in analysis read paths (#244)

Session `LSCMD-PD-ANALYSISFIX-0813-PD8`. 12 files, +130/-60.

1. **DCF opex read had no statement selector.** Summed `tbl_operating_expenses` across ALL `statement_discriminator` values. Project 42 base_opex was $2,950,748 instead of the active CURRENT_PRO_FORMA sum of $908,116 (3.25x overstatement). Standardized on `statement_discriminator = %s OR statement_discriminator IS NULL`.

2. **Loans included regardless of status.** Added `DEAD_LOAN_STATUSES` denylist + `exclude_dead_loans()` to `financial.models_debt` (new file `models_debt.py`, +35 lines). Applied to peak-equity, structure_type='TERM' query, and raw-SQL LIMIT 1 pick in `multifamily_adapter`.

3. **Manager units** — not applied. The single manager unit carries $0 rent; filtering at one site would create a fresh inconsistency. Left for single-inclusion-rule work.

4. **Renovation growth lookup broke silently.** Queried non-existent `rate_value`/`period_index` columns, raised `ProgrammingError`, was swallowed by a bare `except`, and a hardcoded 3% always won. Now routed through `GrowthRateService.get_flat_rate()`. Also fixed `to_period` → `thru_period` column references in `GrowthRateService`.

5. **Phantom `is_active` on BudgetItem/ActualItem.** Neither fact table has the column. Fields and bound filters removed. `FinanceStructure.is_active` (real column) untouched.

Verification: project 42 opex $2,950,748 → $908,116; project 17 byte-identical; 611 passed, 31 skipped; tsc clean.

---

## CLAUDE.md

No update. The fix branch is not yet merged to main. When merged, the following should be noted:
- Fabrication guard now uses in-place redaction (not full-reply destruction)
- New `models_debt.py` in `backend/apps/financial/`
- Cumulative total fix in proforma_base.py shared renderer
- Exit-floor logic in `dcf_calculation_service.py` and `income_property_cashflow_service.py`

## IMPLEMENTATION_STATUS

Frozen (historical). No update per its own header.

## Alpha Readiness

Unchanged at ~92%. Sole remaining blocker: scanned-PDF / OCR pipeline.

## Carry-Forward

- **Merge `fix/guard-reply-and-cumulative-0813` to main** — 2 commits, verified (641 passed / 31 skipped, tsc clean). Contains critical fabrication-guard and analysis-path fixes.
- **EB1 view-spec** — PR #241, mentioned yesterday as carry-forward
- **Branch hygiene** — stacked-PR CI gate branch (`chore/ci-gate-stacked-prs`) still checked out; multiple feature branches outstanding
- **Demo project re-clone** — carry-forward from Aug 12
- **PropertyTab double-counting fix verification** — carry-forward from Aug 12

---

*Generated by nightly-landscape-sync scheduled task.*

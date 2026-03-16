# DISCOVERY Loan Sizing Audit Report

Date: 2026-02-09  
Scope: Read-only audit of debt/loan schema, backend services, frontend components, and cash-flow integration points.

## Section 1: Database State

### 1.1 `landscape.tbl_loan` full column inventory (name + type)

```text
loan_id	bigint
project_id	bigint
loan_name	character varying
loan_type	character varying
structure_type	character varying
lender_name	character varying
seniority	integer
status	character varying
commitment_amount	numeric
loan_amount	numeric
loan_to_cost_pct	numeric
loan_to_value_pct	numeric
interest_rate_pct	numeric
interest_rate_decimal	numeric
interest_type	character varying
interest_index	character varying
interest_spread_bps	integer
rate_floor_pct	numeric
rate_cap_pct	numeric
rate_reset_frequency	character varying
interest_calculation	character varying
interest_payment_method	character varying
loan_start_date	date
loan_maturity_date	date
maturity_period_id	bigint
loan_term_months	integer
loan_term_years	integer
amortization_months	integer
amortization_years	integer
interest_only_months	integer
payment_frequency	character varying
commitment_date	date
origination_fee_pct	numeric
exit_fee_pct	numeric
unused_fee_pct	numeric
commitment_fee_pct	numeric
extension_fee_bps	integer
extension_fee_amount	numeric
prepayment_penalty_years	integer
interest_reserve_amount	numeric
interest_reserve_funded_upfront	boolean
reserve_requirements	jsonb
replacement_reserve_per_unit	numeric
tax_insurance_escrow_months	integer
initial_reserve_months	integer
covenants	jsonb
loan_covenant_dscr_min	numeric
loan_covenant_ltv_max	numeric
loan_covenant_occupancy_min	numeric
covenant_test_frequency	character varying
guarantee_type	character varying
guarantor_name	character varying
recourse_carveout_provisions	text
extension_options	integer
extension_option_years	integer
draw_trigger_type	character varying
commitment_balance	numeric
drawn_to_date	numeric
is_construction_loan	boolean
release_price_pct	numeric
minimum_release_amount	numeric
takes_out_loan_id	bigint
can_participate_in_profits	boolean
profit_participation_tier	integer
profit_participation_pct	numeric
monthly_payment	numeric
annual_debt_service	numeric
notes	text
created_at	timestamp with time zone
updated_at	timestamp with time zone
created_by	text
updated_by	text
interest_reserve_inflator	numeric
repayment_acceleration	numeric
closing_costs_appraisal	numeric
closing_costs_legal	numeric
closing_costs_other	numeric
recourse_type	character varying
collateral_basis_type	character varying
```

### 1.2 Current Chadron loan (`loan_id=2`) data dump

```json
{"loan_id":2,"project_id":17,"loan_name":"Senior Loan","loan_type":"PERMANENT","structure_type":"TERM","lender_name":"Pacific Western Bank","seniority":1,"status":"active","commitment_amount":29662500.00,"loan_amount":29662500.00,"loan_to_cost_pct":null,"loan_to_value_pct":null,"interest_rate_pct":6.500,"interest_rate_decimal":0.06500,"interest_type":"Fixed","interest_index":null,"interest_spread_bps":null,"rate_floor_pct":null,"rate_cap_pct":null,"rate_reset_frequency":null,"interest_calculation":"SIMPLE","interest_payment_method":"paid_current","loan_start_date":"2026-03-01","loan_maturity_date":null,"maturity_period_id":null,"loan_term_months":84,"loan_term_years":7,"amortization_months":300,"amortization_years":25,"interest_only_months":12,"payment_frequency":"MONTHLY","commitment_date":null,"origination_fee_pct":1.0000,"exit_fee_pct":null,"unused_fee_pct":null,"commitment_fee_pct":null,"extension_fee_bps":null,"extension_fee_amount":null,"prepayment_penalty_years":null,"interest_reserve_amount":null,"interest_reserve_funded_upfront":false,"reserve_requirements":{},"replacement_reserve_per_unit":null,"tax_insurance_escrow_months":null,"initial_reserve_months":null,"covenants":{},"loan_covenant_dscr_min":null,"loan_covenant_ltv_max":null,"loan_covenant_occupancy_min":null,"covenant_test_frequency":"Quarterly","guarantee_type":null,"guarantor_name":null,"recourse_carveout_provisions":null,"extension_options":0,"extension_option_years":null,"draw_trigger_type":"COST_INCURRED","commitment_balance":null,"drawn_to_date":0.00,"is_construction_loan":false,"release_price_pct":null,"minimum_release_amount":null,"takes_out_loan_id":null,"can_participate_in_profits":false,"profit_participation_tier":null,"profit_participation_pct":null,"monthly_payment":null,"annual_debt_service":null,"notes":"CODEX seed: Chadron Terrace TERM loan validation","created_at":"2026-02-06T21:46:52.646809+00:00","updated_at":"2026-02-09T17:50:20.864249+00:00","created_by":"claude-codex","updated_by":null,"interest_reserve_inflator":1.00,"repayment_acceleration":1.00,"closing_costs_appraisal":null,"closing_costs_legal":null,"closing_costs_other":null,"recourse_type":"FULL","collateral_basis_type":"PROJECT_COST"}
```

### 1.3 Reserve-related columns present on `tbl_loan`
- `interest_reserve_amount`
- `interest_reserve_funded_upfront`
- `reserve_requirements`
- `replacement_reserve_per_unit`
- `initial_reserve_months`
- `interest_reserve_inflator`

### 1.4 Debt facility table check
- Query for `information_schema.columns` on `landscape.tbl_debt_facility` returned 0 rows.
- Table existence audit for names containing loan/debt/facility shows:
  - `tbl_loan`
  - `tbl_loan_container`
  - `tbl_loan_finance_structure`
  - `tbl_debt_draw_schedule`
  - `vw_debt_balance_summary`
- Conclusion: code references `tbl_debt_facility` in prompt context, but that table does not exist in current schema.

### 1.5 Project/acquisition source fields (Chadron project 17)
- `tbl_project` relevant columns: `asking_price`, `acquisition_price`, plus price/value fields.
- Project 17 row (adjusted query):
  - `project_type_code = LAND`
  - `analysis_type = VALUE_ADD`
  - `asking_price = 47500000`
  - `acquisition_price = NULL`
- Note: original query requesting `purchase_price` failed because `tbl_project.purchase_price` does not exist.

### 1.6 DCF/assumption table checks
- `tbl_project_assumption` has no columns matching loan/LTV/LTC/debt/leverage patterns.
- `tbl_dcf_analysis` has cap-related fields (e.g., `going_in_cap_rate`, `exit_cap_rate`) but no explicit value/price carry field for direct LTV sizing input.
- `tbl_cre_dcf_analysis` not present in current schema.

### 1.7 Missing columns needed for planned features (proposed)
Existing columns already cover many debt assumptions (including LTV/LTC and reserve amount fields). Missing for your planned feature set are mainly structured/calculated fields:
- `loan_budget_json` (JSONB): structured budget breakout (acquisition/land, capex, fees, closing costs, reserve, borrower vs lender).
- `commitment_sizing_method` (text/enum): e.g., `MANUAL`, `LTV`, `LTC`, `MIN_OF_LTV_LTC`.
- `ltv_basis_value_amount` (numeric): valuation basis used at sizing time.
- `ltc_basis_cost_amount` (numeric): cost basis used at sizing time.
- `calculated_commitment_amount` (numeric): derived result before any override.
- `net_loan_proceeds_amount` (numeric): computed commitment minus holdbacks.
- `sizing_snapshot_json` (JSONB): optional auditable breakdown for transparency/versioning.

## Section 2: Backend Services

### 2.1 Loan-related endpoints (methods + paths)
Base prefix from Django root routing: `backend/config/urls.py` mounts `apps.financial.urls` under `/api/`.

Loan/debt endpoints in `backend/apps/financial/urls.py`:
- `GET, POST /api/projects/{project_id}/loans/`
- `GET, PUT, PATCH, DELETE /api/projects/{project_id}/loans/{loan_id}/`
- `GET, POST /api/projects/{project_id}/loans/{loan_id}/draws/`
- `GET, PUT, PATCH, DELETE /api/projects/{project_id}/loans/{loan_id}/draws/{draw_id}/`
- `GET, POST /api/projects/{project_id}/loans/{loan_id}/containers/`
- `DELETE /api/projects/{project_id}/loans/{loan_id}/containers/{loan_container_id}/`
- `GET, POST /api/projects/{project_id}/loans/{loan_id}/finance-structures/`
- `DELETE /api/projects/{project_id}/loans/{loan_id}/finance-structures/{loan_fs_id}/`
- `GET /api/projects/{project_id}/loans/{loan_id}/balance-summary/`
- `GET /api/projects/{project_id}/loans/{loan_id}/debt-schedule/`

Related cash-flow endpoint (same file):
- `GET, POST /api/projects/{project_id}/cash-flow/calculate/`

Related acquisition endpoint used by debt cashflow UI:
- `GET /api/projects/{project_id}/acquisition/price-summary/`
- `PATCH /api/projects/{project_id}/acquisition/asking-price/`

`backend/apps/calculations/urls.py` has no loan/debt routes.

### 2.2 Debt service engine capabilities today
File: `backend/apps/calculations/engines/debt_service_engine.py`

- `calculate_revolver(...)`
  - Supports `loan_to_cost_pct` based commitment sizing.
  - Iteratively solves for interest reserve + origination fee convergence (`_iterate_reserve_and_fee`).
  - Computes per-period draws, accrued interest, reserve draws, release payments, ending balances.
- `calculate_term(...)`
  - Supports IO then amortization using `numpy_financial.pmt`.
  - Handles balloon payoff at end of term.
  - Outputs per-period scheduled payment, interest/principal split, ending balance.

Key limits:
- Revolver draw trigger only supports `COST_INCURRED`; others raise `NotImplementedError`.
- No LTV-driven commitment computation path in engine; revolver sizing is LTC-based.

### 2.3 Serializer fields exposed to frontend
File: `backend/apps/financial/serializers_debt.py`

- `LoanListSerializer` returns a limited subset used by list pages:
  - includes: `loan_id`, names/types, `commitment_amount`, `loan_amount`, `interest_rate_pct`, terms, frequency, `origination_fee_pct`, etc.
  - does not include many advanced fields unless detail endpoint is called.
- `LoanDetailSerializer` uses `fields='__all__'` + nested containers/finance structures.
- `LoanCreateUpdateSerializer` uses `fields='__all__'` for writes.

### 2.4 Existing LTV/LTC and interest-reserve logic
- LTV/LTC fields exist on model and API payloads (`loan_to_value_pct`, `loan_to_cost_pct`).
- Engine usage:
  - Revolver uses `loan_to_cost_pct` for sizing.
  - Term uses explicit `loan_amount` or `commitment_amount`, not LTV/LTC sizing.
- Interest reserve logic exists for revolver calculations in engine and debt schedule endpoint output.
- No dedicated backend API endpoint to “auto-calc reserve” for term/income-property debt from projected debt service.

## Section 3: Frontend Components

### 3.1 File inventory and purpose
Main debt/capitalization files under `src/components/capitalization` include:
- `LoanCard.tsx`: current per-loan CCard editor (inline assumptions + inline schedule toggle).
- `LoanScheduleGrid.tsx`: monthly/quarterly/annual debt schedule renderer.
- `LoanScheduleModal.tsx`: modal schedule wrapper (still present).
- `DebtFacilitiesTable.tsx`: legacy table component still present in repo.
- `DebtFacilityModal.tsx`: legacy flyout modal still present in repo.
- `LeveragedCashFlow.tsx`: leveraged CF grid with Time 0 + operating + debt + reversion rows.

Page composition:
- `src/app/projects/[projectId]/capitalization/debt/page.tsx`
  - Uses `LoanCard` list + `+ Add Loan` new card mode.
  - Renders `LeveragedCashFlow` below loans.

### 3.2 Current LoanCard inputs/fields
File: `src/components/capitalization/LoanCard.tsx`

- Uses editable field whitelist (`editableLoanFields`) including:
  - names/type/structure/lender, commitment + `loan_amount`
  - `loan_to_value_pct`, `loan_to_cost_pct`
  - `interest_type`, `interest_index`, `interest_spread_bps`, `interest_rate_pct`
  - term/amortization/IO/frequency/start date
  - fees and revolver-specific assumptions
  - recourse + notes
- Save flow:
  - existing loan: `PATCH /api/projects/{projectId}/loans/{loan_id}/`
  - new loan: `POST /api/projects/{projectId}/loans/`

### 3.3 How LeveragedCashFlow “Initial Capitalization” gets data
File: `src/components/capitalization/LeveragedCashFlow.tsx`

- Acquisition outflow source:
  - Uses `useAcquisitionPriceSummary()` hook (`/api/projects/{projectId}/acquisition/price-summary/`).
  - `effective_acquisition_price` becomes Time 0 outflow (negative).
  - Label is `Asking Price` when `price_source === 'asking'`, else `Acquisition Price (Incl Costs)`.
- Net loan proceeds source:
  - Computed client-side from loaded `loans` array:
    - per loan: `(loan_amount || commitment_amount) - origination_fee`
  - Does not currently subtract interest reserve/closing-cost holdbacks in this UI calc.

### 3.4 Existing modal infrastructure
- `LoanScheduleModal.tsx` exists.
- Legacy `DebtFacilityModal.tsx` exists but debt page now uses inline `LoanCard` editing.
- Reversion details modal exists in `LeveragedCashFlow.tsx`.

## Section 4: Cash Flow Integration

### 4.1 How acquisition price flows into Time 0
- Not from `views_land_dev_cashflow.py` directly.
- Frontend pulls acquisition summary from acquisition app endpoint:
  - `backend/apps/acquisition/views.py` `AcquisitionPriceSummaryView`
  - selects `effective_price = total_acquisition_cost (if closing ledger exists) else asking_price`
- That `effective_acquisition_price` is used by `LeveragedCashFlow.tsx` for Time 0 outflow row.

### 4.2 How net loan proceeds are calculated/injected today
Backend financing cashflow generation:
- Land service (`backend/apps/financial/services/land_dev_cashflow_service.py`):
  - Term: period start inflow = `loan_amount - origination_fee`; then scheduled debt service outflows and balloon.
  - Revolver: uses cost draws, interest, reserve draw mechanics.
- Income-property service (`backend/apps/financial/services/income_property_cashflow_service.py`):
  - Term loans only; period start inflow = `loan_amount - origination_fee`.

Frontend display:
- `LeveragedCashFlow.tsx` separately computes Time 0 `Net Loan Proceeds` from list loans and origination fee only.
- Potential mismatch risk between frontend Time 0 line and backend financing section when additional holdbacks (reserves/closing costs) are introduced.

### 4.3 Where loan sizing hooks should go
Primary hook points:
- Write path: `LoanViewSet` (`perform_create` / `perform_update`) in `backend/apps/financial/views_debt.py`.
- Calculation path:
  - term parameter map in both services (`loan_amount=float(loan.loan_amount or loan.commitment_amount or 0)`).
  - revolver param map uses `loan_to_cost_pct` and iterative reserve in engine.
- Project-type routing already exists in `views_land_dev_cashflow.py`:
  - LAND → `LandDevCashFlowService`
  - non-LAND → `IncomePropertyCashFlowService`

## Section 5: Gap Analysis

### 5.1 Feature: Loan sizing via LTV/LTC
What exists today:
- DB fields for `loan_to_value_pct` and `loan_to_cost_pct`.
- Manual `commitment_amount`/`loan_amount` persisted and consumed.
- Revolver engine can size via LTC mechanics internally.

What is missing:
- No canonical service layer deriving commitment as `min(LTV * value, LTC * cost)` for term/income-property flows.
- No explicit persisted sizing basis snapshot (value/cost inputs and chosen limiting constraint).
- `loan_to_value_pct` currently does not drive any backend commitment computation path.

Suggested approach:
- Add a backend sizing service invoked on loan create/update when sizing mode is non-manual.
- Inputs:
  - value basis (for LTV) from valuation output or explicit project value input.
  - cost basis (for LTC) from acquisition + capex budget basis.
- Persist computed outputs (`calculated_commitment_amount`, sizing snapshot JSON) and expose in serializers.
- Keep manual override option with explicit `commitment_sizing_method`.

### 5.2 Feature: Loan budget modal
What exists today:
- Loan has some cost fields (`closing_costs_appraisal/legal/other`, origination fee pct).
- Acquisition ledger summary endpoint exists (`price-summary`).

What is missing:
- No dedicated loan budget schema (line-item breakdown with borrower/lender columns).
- No endpoint to save/retrieve loan budget assumptions as a coherent object.
- No frontend modal/component wired for loan budget workflow.

Suggested approach:
- Add `loan_budget_json` on `tbl_loan` (or normalized child table if reporting joins are required).
- Add API endpoints under loan resource for budget retrieval/update and derived totals.
- In UI, open modal from LoanCard and compute lender/borrower allocations from budget + sizing outputs.

### 5.3 Feature: Interest reserve auto-calculation
What exists today:
- Revolver reserve math exists in debt engine and schedule output.
- Reserve-related columns exist in schema.

What is missing:
- No “magic wand” API/action for deterministic reserve sizing request from UI.
- No term/income-property reserve auto-calc path based on projected debt service draws.
- No explicit default behavior contract for stabilized acquisitions (`reserve=0` unless overridden).

Suggested approach:
- Add `POST /api/projects/{project_id}/loans/{loan_id}/interest-reserve/autocalc/`.
- For LAND/revolver: reuse engine schedule data.
- For non-LAND term loans: run term schedule and compute reserve policy output.
- Return reserve amount + assumptions + trace; optionally persist to `interest_reserve_amount`.

### 5.4 Feature: Net loan proceeds
What exists today:
- Backend financing sections model debt inflows/outflows.
- Frontend Time 0 net loan proceeds line exists.

What is missing:
- Time 0 net proceeds in frontend currently only subtracts origination fee.
- No unified backend-calculated `net_loan_proceeds_amount` that includes holdbacks (reserve, closing costs, lender-retained fees).
- Possible inconsistency between debt schedule math and displayed Time 0 line.

Suggested approach:
- Compute net proceeds centrally in backend from commitment minus all holdbacks.
- Return as explicit metric in cash-flow payload and loan detail payload.
- Frontend renders returned value rather than re-deriving independently.

---

## Notes / Validation Summary
- SQL and file audits were executed read-only.
- No source files were modified during discovery.
- One output file was created per request: `DISCOVERY_Loan_Sizing_Audit_Report.md`.
- `tbl_debt_facility` and `tbl_cre_dcf_analysis` are not present in the inspected schema, which is relevant for planned implementation assumptions.

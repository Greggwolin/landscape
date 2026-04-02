---
## Acquisition Costs → Cash Flow Fix — Verification & Restart

## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before running commands.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only.

If anything is unclear about:
- Which files were modified and why
- The price summary behavior change
- How to test the Time 0 column in LeveragedCashFlow
- The new acquisition section in cash flow response
...ask first. Do not assume.
---

### OBJECTIVE
Verify and restart after two backend changes that fix acquisition costs not appearing in the MF cash flow analysis (Time 0).

### CONTEXT
**Bug:** In project 17 (MF), adding acquisition costs in the Acquisition Ledger did not flow to the cash flow analysis Time 0 column.

**Root causes (both fixed by Cowork):**

1. `IncomePropertyCashFlowService` had zero references to acquisition data. The `POST /api/projects/{id}/cash-flow/calculate/` endpoint for MF projects returned no acquisition cost section. **Fix:** Added `_build_acquisition_section()` method that queries `tbl_acquisition` and injects an "ACQUISITION COST" section at `periodIndex=0` with `isTime0=true`.

2. `AcquisitionPriceSummaryView` only calculated costs when a CLOSING event existed. Without CLOSING, it fell back to `asking_price` (often null for MF). The `LeveragedCashFlow` component uses this endpoint for its Time 0 column. **Fix:** Removed the CLOSING gate — costs now calculate from all ledger events with `is_applied_to_purchase=true` regardless of whether CLOSING exists.

### FILES MODIFIED

1. `backend/apps/financial/services/income_property_cashflow_service.py`
   - Added `from django.db import connection` import
   - Added `_build_acquisition_section()` method (~60 lines) before FINANCING SECTION
   - Injected call in `calculate()` after income sections, before financing (Step 3b)

2. `backend/apps/acquisition/views.py`
   - `AcquisitionPriceSummaryView.get()` — removed `if has_closing_date:` gate around cost calculation
   - Costs now always calculated from ledger events; `has_closing_date` flag unchanged

### DOWNSTREAM IMPACT

**Files modified:** See above.

**Known consumers of price summary endpoint:**
- `src/components/capitalization/LoanCard.tsx` — uses `effective_acquisition_price` for loan sizing
- `src/components/capitalization/LeveragedCashFlow.tsx` — uses `effective_acquisition_price` for Time 0
- `src/app/projects/[projectId]/valuation/components/IndicatedValueSummary.tsx` — variance calc
- `src/components/project/ProjectProfileTile.tsx` — dashboard display

**Known consumers of cash flow calculate endpoint:**
- `src/components/capitalization/LeveragedCashFlow.tsx` — via `useLeveragedCashFlow` hook
- `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` — land dev only (not affected)

**Response shape:** Unchanged for both endpoints. Same fields, same types.

**Risk areas:**
- Price summary now returns costs even without CLOSING — LoanCard may show acquisition cost where it previously showed nothing. This is correct behavior.
- The new `cost-acquisition` section in cash flow has `isTime0: true`, so `LeveragedCashFlow` filters it from periodic columns (existing logic at line 322). No double-counting.

### IMPLEMENTATION STEPS

#### Step 1: Verify build
```bash
npm run build
```

#### Step 2: Restart servers
```bash
bash restart.sh
```

#### Step 3: Verify price summary endpoint (project 17)
```bash
curl http://localhost:8000/api/projects/17/acquisition/price-summary/ | python3 -m json.tool
```
Expected: `total_acquisition_cost` and `effective_acquisition_price` should reflect ledger event totals (not null), `price_source` should be `'calculated'` if any events with amounts exist.

#### Step 4: Verify cash flow calculate endpoint (project 17)
```bash
curl -X POST http://localhost:8000/api/projects/17/cash-flow/calculate/ \
  -H "Content-Type: application/json" \
  -d '{"includeFinancing": true}' | python3 -m json.tool | head -80
```
Expected: First section should be `"sectionId": "cost-acquisition"` with `"isTime0": true` and negative amount at `periodIndex: 0`.

#### Step 5: Manual smoke test
1. Open project 17 (MF) → Capital tab → Equity sub-tab
2. Verify the LeveragedCashFlow grid shows "Acquisition Price (Incl Costs)" in the Time 0 column with the correct total
3. Add a new acquisition event (e.g., $10,000 Fee) in the Acquisition Ledger
4. Return to Capital tab — verify the Time 0 value updated to include the new fee
5. Verify periodic columns (Year 1, Year 2, etc.) still show NOI/debt service correctly — no double-counted acquisition

### SUCCESS CRITERIA
All must pass:
1. [ ] `npm run build` passes clean
2. [ ] Servers restart without errors
3. [ ] Price summary returns calculated costs for project 17 (not null)
4. [ ] Cash flow endpoint returns `cost-acquisition` section with `isTime0: true`
5. [ ] Time 0 column in LeveragedCashFlow shows acquisition cost
6. [ ] New acquisition events appear in Time 0 after refresh
7. [ ] Periodic columns unaffected (no acquisition in monthly/quarterly/annual)
8. [ ] IndicatedValueSummary still displays correctly
9. [ ] LoanCard loan sizing still works

### SERVER RESTART
After completing this task, restart the servers:
```bash
bash restart.sh
```
---

# Verify Time 0 Cash Flow Before Debt Fix

## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before writing code.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only.

If anything is unclear about:
- What the fix changed and why
- How to verify the DCF grid renders correctly
- How the `prependAcquisitionCost()` function works
- Which downstream consumers might be affected
...ask first. Do not assume.

---

## OBJECTIVE

Verify that the fix to `prependAcquisitionCost()` in `mfCashFlowTransform.ts` builds cleanly and renders correctly. The change ensures the "Cash Flow Before Debt" row at Time 0 shows the negative acquisition price instead of "—".

## CONTEXT

**File changed:** `src/components/valuation/income-approach/mfCashFlowTransform.ts`

**What changed:** In `prependAcquisitionCost()` (~line 826), the Time 0 value for all existing rows was hardcoded to `0`. The fix now checks if `row.id === 'total_cash_flow'` and assigns `-acquisitionPrice` for that row, keeping all other rows at `0`.

**Why:** The Cash Flow Projections grid showed "—" (em-dash) for Cash Flow Before Debt at Time 0, even though the acquisition cost appeared at the top of the column. The bottom-line cash flow at Time 0 should equal the negative acquisition price since that's the only cash event at acquisition.

## DOWNSTREAM IMPACT

**Files/consumers of `prependAcquisitionCost()`:**
- `src/components/valuation/income-approach/DCFView.tsx` — calls this function at ~line 88
- `src/components/analysis/shared/CashFlowGrid.tsx` — renders the grid; `defaultFormatValue()` shows "—" for 0 values, actual currency for non-zero
- `src/components/capitalization/LeveragedCashFlow.tsx` — may also consume the grid data (has `isTime0` filtering logic)

**No backend changes.** This is purely a frontend transform fix.

**Risk assessment:** Low. Only one row ID (`total_cash_flow`) gets a non-zero Time 0 value. All other rows remain zeroed. The value is the same `-acquisitionPrice` already used in the acquisition section row.

## VERIFICATION STEPS

```bash
# 1. Confirm the change is in place
grep -A 5 "total_cash_flow.*acquisitionPrice" src/components/valuation/income-approach/mfCashFlowTransform.ts

# 2. Build — confirm no TypeScript errors
npm run build

# 3. Lint
npm run lint
```

**Manual verification (browser):**
1. Open any MF project with an acquisition price set (e.g., Peoria Lakes or a test MF project)
2. Navigate to Income Approach → Cash Flow tab
3. Confirm Time 0 column shows:
   - Acquisition Price row: `($35,000,000)` (red, negative)
   - Revenue/Expense/NOI rows: `—` (correct, no operations at Time 0)
   - Cash Flow Before Debt row: `($35,000,000)` (should now show the acquisition outflow)
4. Confirm Year 1+ columns are unchanged

## SUCCESS CRITERIA

All must pass:
1. [ ] `npm run build` succeeds with no TypeScript errors
2. [ ] `npm run lint` passes
3. [ ] Cash Flow Before Debt at Time 0 shows negative acquisition price
4. [ ] All other Time 0 rows still show "—"
5. [ ] Year 1+ values are unchanged
6. [ ] LeveragedCashFlow (Capitalization tab) still renders correctly if Time 0 is present

## SERVER RESTART
After completing this task, restart the servers:
```bash
bash restart.sh
```

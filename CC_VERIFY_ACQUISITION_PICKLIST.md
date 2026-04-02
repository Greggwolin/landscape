---
## ACQUISITION EVENT TYPE PICKLIST MIGRATION — Verification & Execution

## ⚠️ BEFORE YOU START
Read this entire prompt thoroughly, then ask any clarifying questions before running commands.

⚠️ DO NOT process, import, or write any data to the database during verification steps. Verification is read-only. Confirm changes by tracing code paths only.

If anything is unclear about:
- Which migration has already been run vs. pending
- The CLOSING reclassification (milestone → financial)
- The CRITICAL_DATE orphan row
- How the lookups endpoint returns data
...ask first. Do not assume.
---

### OBJECTIVE
Complete the acquisition event type picklist migration: run the pending migration, restart servers, and verify the full chain.

### CONTEXT
Cowork wrote all code changes. CC already ran the first migration (`20260328_acquisition_event_type_picklist.sql`) successfully — picklist seeded, existing data migrated, build passes clean.

**What's already done (CC verified):**
- 11 picklist rows seeded (2 group headers + 3 milestones + 6 financial)
- Existing `tbl_acquisition.event_type` values migrated from display names to codes
- `npm run build` passes clean

**What still needs to run:**
- `20260328_acquisition_add_critical_date.sql` — adds CRITICAL_DATE as milestone + moves CLOSING from milestone group to financial group

### FILES MODIFIED (by Cowork)

1. `src/types/acquisition.ts` — Picklist-driven types. `isMilestoneAction()` accepts optional `milestoneCodeSet`. CLOSING is now in the financial group (has Amount field). CRITICAL_DATE added to milestone fallbacks.
2. `src/components/acquisition/AcquisitionLedgerGrid.tsx` — Uses `useAcquisitionEventTypeOptions()` hook. Dropdowns render labels, store codes. Dynamic milestone/financial split via `useMemo`.
3. `src/app/api/lookups/[type]/route.ts` — Added `'acquisition-event-types'` to `TYPE_MAP`.
4. `src/hooks/usePicklistOptions.ts` — Added `useAcquisitionEventTypeOptions()` export.
5. `backend/apps/acquisition/views.py` — All event type strings use codes (`'CLOSING'`, `'DEPOSIT'`, etc.).
6. `migrations/20260328_acquisition_event_type_picklist.sql` — ✅ ALREADY RAN. Seeds picklist + migrates existing data.
7. `migrations/20260328_acquisition_add_critical_date.sql` — ⏳ PENDING. Adds CRITICAL_DATE + moves CLOSING to FINANCIAL_GROUP.

### IMPLEMENTATION STEPS

#### Step 1: Run the pending migration
```bash
psql $DATABASE_URL -f migrations/20260328_acquisition_add_critical_date.sql
```

#### Step 2: Verify CRITICAL_DATE was added and CLOSING moved
```bash
psql $DATABASE_URL -c "
  SELECT p.code, p.name, g.code AS group_code, p.sort_order
  FROM landscape.tbl_system_picklist p
  LEFT JOIN landscape.tbl_system_picklist g ON p.parent_id = g.picklist_id
  WHERE p.picklist_type = 'ACQUISITION_EVENT_TYPE'
    AND p.code NOT IN ('MILESTONE_GROUP', 'FINANCIAL_GROUP')
  ORDER BY g.code, p.sort_order;
"
```
Expected:
- FINANCIAL_GROUP children: CLOSING (5), DEPOSIT (10), FEE (20), CREDIT (30), REFUND (40), ADJUSTMENT (50), CLOSING_COSTS (60)
- MILESTONE_GROUP children: MILESTONE (10), OPEN_ESCROW (20), CRITICAL_DATE (25)

#### Step 3: Restart servers
```bash
bash restart.sh
```

#### Step 4: Verify lookups endpoint
```bash
curl http://localhost:3000/api/lookups/acquisition-event-types | python3 -m json.tool
```
Expected: JSON `options` array with all event type rows (including group headers — the grid filters them client-side).

#### Step 5: Manual smoke test
1. Open any project with an Acquisition tab
2. Open the Acquisition Ledger grid
3. Verify the Action dropdown shows two groups separated by a line:
   - **Milestones:** Milestone, Open Escrow, Critical Date
   - **Financial:** Closing, Deposit, Fee, Credit, Refund, Adjustment, Closing Costs
4. Select "Closing" — verify Amount, Category, Subcategory fields are ENABLED (not grayed out)
5. Select "Milestone" — verify Amount, Category, Subcategory fields are DISABLED
6. Create a new event, confirm it saves with a CODE value (e.g., `DEPOSIT`)
7. Verify existing events display labels (not codes) in the grid

#### Step 6: Verify price summary endpoint
```bash
curl http://localhost:8000/api/projects/{PROJECT_ID}/acquisition/price-summary/ | python3 -m json.tool
```
Confirm `has_closing_date` and cost totals are correct.

### DOWNSTREAM IMPACT
**Files modified:** See list above.

**Known consumers:**
- `AcquisitionLedgerGrid.tsx` — primary UI consumer (updated)
- `backend/apps/acquisition/views.py` — price summary + asking price views (updated)
- `backend/apps/acquisition/serializers.py` — no validation on event_type, no change needed
- No Landscaper tools reference acquisition event type strings directly

**Post-change verification:**
1. Acquisition grid renders with correct grouped dropdowns
2. CLOSING event allows Amount input
3. Price summary calculates correctly
4. `npm run build` still passes

**Risk areas:**
- CLOSING now in financial group — if the second migration doesn't run, the DB still has CLOSING under MILESTONE_GROUP but the frontend code treats it as financial. Run the migration.
- `CRITICAL_DATE` orphan row (acquisition_id=1) will now appear correctly in the grid dropdown.

### SUCCESS CRITERIA
All must pass:
1. [ ] Second migration runs without errors
2. [ ] CLOSING is under FINANCIAL_GROUP in picklist
3. [ ] CRITICAL_DATE is under MILESTONE_GROUP in picklist
4. [ ] Servers restart cleanly
5. [ ] Lookups endpoint returns all event types
6. [ ] Action dropdown shows correct groups with separator
7. [ ] Closing event has Amount/Category fields enabled
8. [ ] New events save with code values
9. [ ] Price summary endpoint returns correct totals
10. [ ] Existing events display labels (not raw codes)

### SERVER RESTART
After completing this task, restart the servers:
```bash
bash restart.sh
```
---

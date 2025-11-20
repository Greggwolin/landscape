# Budget Field Expansion - End-to-End Testing Guide

**Date:** 2025-11-16
**Purpose:** Verify all 49 budget fields work correctly across Napkin/Standard/Detail modes
**Related Docs:**
- [BUDGET_FIELD_EXPANSION_IMPLEMENTATION.md](./BUDGET_FIELD_EXPANSION_IMPLEMENTATION.md)
- [BUDGET_FIELD_API_STATUS.md](./BUDGET_FIELD_API_STATUS.md)

---

## QUICK START

### Prerequisites
1. **Django Running:** `cd backend && python manage.py runserver 8000`
2. **Next.js Running:** `npm run dev`
3. **Browser:** Chrome/Firefox with DevTools open (F12)
4. **Test Project:** Have at least 1 project with budget items

### 30-Second Smoke Test

```javascript
// 1. Go to: http://localhost:3000/projects/1/budget
// 2. Open DevTools Console (F12)
// 3. Find a budget item ID from the page
// 4. Run this:

const factId = 123; // Replace with actual ID from page

// Test Standard field
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ escalation_method: 'through_duration' })
}).then(r => r.json()).then(console.log);

// Test Detail field
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ percent_complete: 45.5 })
}).then(r => r.json()).then(console.log);

// Refresh page - fields should persist ✓
```

---

## COMPREHENSIVE TESTING

### Test 1: Mode Selector Functionality

**What to Test:**
- Mode selector displays 3 buttons with correct field counts
- Clicking each mode changes the grid columns/rows

**Steps:**
1. Navigate to Budget page: `/projects/{projectId}/budget`
2. Locate mode selector at top of page
3. Verify button labels:
   - ✅ "Napkin (9 fields)" - Green
   - ✅ "Standard (28 fields)" - Yellow
   - ✅ "Detail (49 fields)" - Red

**Expected Behavior:**
- Napkin mode: No expandable rows
- Standard mode: Rows have expand arrow (▶)
- Detail mode: Rows have expand arrow (▶)

**Screenshot Checklist:**
- [ ] Mode selector renders
- [ ] All 3 buttons visible
- [ ] Correct field counts shown
- [ ] Active mode highlighted

---

### Test 2: Napkin Mode (9 Core Fields)

**Test Inline Editing:**

| Field | How to Test | Expected Result |
|-------|-------------|-----------------|
| Description | Click cell → Type → Tab | Saves on blur |
| Qty | Click → Type number → Tab | Saves on blur |
| UOM | Click dropdown → Select | Saves immediately |
| Rate | Click → Type number → Tab | Saves on blur |
| Amount | Click → Type number → Tab | Saves on blur |
| Start Period | Click → Type number → Tab | Saves on blur |
| Duration | Click → Type number → Tab | Saves on blur |

**Validation:**
1. Edit a field
2. Tab to next field
3. Check Network tab for PUT request to `/api/budget/item/{factId}`
4. Refresh page
5. Verify value persisted

**Console Test:**
```javascript
// Find row data
const row = document.querySelector('[data-fact-id]');
const factId = row.dataset.factId;

// Update qty
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ qty: 150 })
}).then(r => r.json()).then(console.log);

// Should see: { success: true, data: { item: {...} } }
```

---

### Test 3: Standard Mode - Group 1 (Timing & Escalation)

**Activate Standard Mode:**
1. Click "Standard (28 fields)" button
2. Click expand arrow (▶) on any budget row
3. Verify accordion sections appear

**Group 1 Fields (Yellow badge):**

| Field | Type | Test Value | Validation |
|-------|------|------------|------------|
| Escalation Rate % | percentage | 3.5 | Should show 3.5% |
| Escalation Method | dropdown | "through_duration" | Options: to_start, through_duration |
| Start Date | date | 2025-01-15 | Date picker |
| End Date | date | 2025-06-15 | Date picker |
| Timing Method | dropdown | "curve" | Options: distributed, milestone, curve |
| S-Curve Profile | dropdown | "front_loaded" | Only visible if timing_method = 'curve' |
| Curve Steepness | slider | 75 | Slider 0-100, shows badge with value |

**Test Dependent Field Logic:**
```javascript
// S-Curve Profile should hide when timing_method != 'curve'
const factId = 123;

// Set timing_method to 'distributed'
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ timing_method: 'distributed' })
}).then(r => r.json());

// Refresh page, expand row
// ✓ curve_profile field should NOT be visible

// Set timing_method to 'curve'
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ timing_method: 'curve' })
}).then(r => r.json());

// Refresh page, expand row
// ✓ curve_profile field SHOULD be visible
```

---

### Test 4: Standard Mode - Group 2 (Cost Controls)

**Group 2 Fields (Yellow badge):**

| Field | Type | Test Value | Validation |
|-------|------|------------|------------|
| Contingency % | percentage | 10 | Should show 10% |
| Confidence Level | dropdown | "high" | Options: high, medium, low, conceptual |
| Vendor Name | text | "ACME Construction" | Free text |
| Contract # | text | "CTR-2025-001" | Free text |
| Purchase Order | text | "PO-2025-001" | Free text |
| Committed | checkbox | true | Checkbox, checked = true |

**Test Checkbox:**
```javascript
const factId = 123;

// Set is_committed to true
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ is_committed: true })
}).then(r => r.json());

// Refresh, expand row
// ✓ Checkbox should be checked

// Try to delete item (should fail if committed)
await fetch(`/api/budget/item/${factId}`, {
  method: 'DELETE'
}).then(r => r.json());

// ✓ Should return error: "Cannot delete committed item"
```

---

### Test 5: Standard Mode - Group 3 (Classification)

**Group 3 Fields (Yellow badge):**

| Field | Type | Test Value | Validation |
|-------|------|------------|------------|
| Scope Override | dropdown | (varies by project) | Dropdown of available scopes |
| Cost Type | dropdown | "direct" | Options: direct, indirect, soft, financing |
| Tax Treatment | dropdown | "capitalizable" | Options: capitalizable, deductible, non_deductible |
| Notes | textarea | "Public notes here" | Multi-line text |
| Internal Memo | textarea | "Internal notes" | Multi-line text |

**Test Textarea Fields:**
```javascript
const factId = 123;

// Update both memo fields
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notes: "This is exported to reports",
    internal_memo: "This is NOT exported - internal only"
  })
}).then(r => r.json());

// ✓ Both should save and display in expanded row
```

---

### Test 6: Detail Mode - Group 4 (Advanced Timing/CPM)

**Activate Detail Mode:**
1. Click "Detail (49 fields)" button
2. Click expand arrow (▶)
3. Verify 7 accordion sections (3 yellow + 4 red)

**Group 4 Fields (Red badge):**

| Field | Type | Editable | Test Value |
|-------|------|----------|------------|
| Baseline Start | date | ❌ Read-only | Shows original plan |
| Baseline End | date | ❌ Read-only | Shows original plan |
| Actual Start | date | ✅ | 2025-01-20 |
| Actual End | date | ✅ | 2025-05-30 |
| % Complete | percentage | ✅ | 45.5 |
| Status | dropdown | ✅ | Options: not_started, in_progress, completed, cancelled |
| Critical Path | checkbox | ❌ Computed | Auto-calculated by CPM |
| Float (Days) | number | ❌ Computed | Auto-calculated by CPM |
| Early Start | date | ❌ Computed | From CPM |
| Late Finish | date | ❌ Computed | From CPM |
| Dependencies | link | ❌ | Click to view dependencies |

**Test Read-Only Fields:**
```javascript
// Read-only fields should display as text, not inputs
// ✓ Baseline Start/End: Plain text or dash (-)
// ✓ is_critical: Disabled checkbox
// ✓ float_days: Plain number display
```

**Test Editable Fields:**
```javascript
const factId = 123;

// Update progress fields
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    actual_start_date: '2025-01-20',
    actual_end_date: '2025-05-30',
    percent_complete: 45.5,
    status: 'in_progress'
  })
}).then(r => r.json());

// ✓ All 4 fields should persist
```

---

### Test 7: Detail Mode - Group 5 (Financial Controls)

**Group 5 Fields (Red badge):**

| Field | Type | Test Value | Validation |
|-------|------|------------|------------|
| Budget Version | dropdown | "revised" | Options: original, revised, forecast |
| Version Date | date | 2025-11-16 | Date picker |
| Funding Source | dropdown | (varies) | FK to funding sources |
| Funding % | percentage | 100 | 0-100% |
| Draw Schedule | dropdown | "monthly" | Options: as_incurred, monthly, milestone |
| Retention % | percentage | 10 | 0-100% |
| Payment Terms | dropdown | "net_30" | Options: net_30, net_60, progress, custom |
| Invoice Frequency | dropdown | "monthly" | Options: monthly, milestone, completion |
| Cost Allocation | dropdown | "direct" | Options: direct, shared, pro_rata |
| Reimbursable | checkbox | true | Checkbox |

**Test All Financial Fields:**
```javascript
const factId = 123;

await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    budget_version: 'revised',
    version_as_of_date: '2025-11-16',
    retention_pct: 10,
    payment_terms: 'net_30',
    invoice_frequency: 'monthly',
    cost_allocation: 'direct',
    is_reimbursable: true
  })
}).then(r => r.json()).then(console.log);

// ✓ All 7 fields should save
```

---

### Test 8: Detail Mode - Group 6 (Period Allocation)

**Group 6 Fields (Red badge):**

| Field | Type | Test Value | Notes |
|-------|------|------------|-------|
| Allocation Method | dropdown | "curve" | Options: even, curve, custom |
| CF Start Flag | checkbox | true | Marks beginning of cash flow |
| Allocated Total | currency | Read-only | Sum of period allocations |
| Allocation Variance | currency | Computed | allocated_total - amount |
| Period Preview | mini-grid | UI only | Not implemented yet |

**Test Allocation Fields:**
```javascript
const factId = 123;

await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    allocation_method: 'curve',
    cf_start_flag: true
  })
}).then(r => r.json());

// ✓ Both fields should save
// ⚠️ Period Preview mini-grid may show placeholder
```

---

### Test 9: Detail Mode - Group 7 (Documentation & Audit)

**Group 7 Fields (Red badge):**

| Field | Type | Editable | Test Value |
|-------|------|----------|------------|
| Bid Date | date | ✅ | 2025-01-10 |
| Bid Amount | currency | ✅ | $950.00 |
| Bid Variance | currency | ❌ Computed | amount - bid_amount |
| Change Order Count | number | ❌ Read-only | Count from related table |
| Change Order Total | currency | ❌ Read-only | Sum from related table |
| Approval Status | dropdown | ✅ | Options: pending, approved, rejected |
| Approved By | user | ❌ Read-only | FK to users table |
| Approval Date | date | ❌ Read-only | Auto-set on approval |
| Document Count | number | ❌ Read-only | Count from DMS |
| Modified By | user | ❌ Read-only | Last editor |
| Modified Date | datetime | ❌ Read-only | Auto-updated |

**Test Bid Variance (Computed):**
```javascript
const factId = 123;

// Set amount = $1000, bid_amount = $950
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1000,
    bid_amount: 950,
    bid_date: '2025-01-10'
  })
}).then(r => r.json());

// Refresh, expand row
// ✓ bid_variance should show $50 (1000 - 950)
```

**Test Approval Workflow:**
```javascript
const factId = 123;

await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    approval_status: 'approved'
  })
}).then(r => r.json());

// ✓ approval_status changes to "approved"
// ✓ approved_by should auto-populate (if auth implemented)
// ✓ approval_date should auto-set to today
```

---

## EDGE CASES & ERROR HANDLING

### Test 10: Field Validation

**Invalid Values:**
```javascript
const factId = 123;

// Test 1: Percentage > 100
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ percent_complete: 150 })
}).then(r => r.json());
// ✓ Should reject or clamp to 100

// Test 2: Invalid enum value
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'invalid_status' })
}).then(r => r.json());
// ✓ Should return validation error

// Test 3: Negative currency
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ bid_amount: -500 })
}).then(r => r.json());
// ✓ Should reject or convert to positive
```

### Test 11: Field Dependencies

**Curve Fields (only show when timing_method = 'curve'):**
```javascript
const factId = 123;

// Step 1: Set timing_method to 'distributed'
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ timing_method: 'distributed' })
}).then(r => r.json());

// Refresh page, expand Timing & Escalation group
// ✓ curve_profile should be HIDDEN
// ✓ curve_steepness should be HIDDEN

// Step 2: Set timing_method to 'curve'
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ timing_method: 'curve' })
}).then(r => r.json());

// Refresh page, expand Timing & Escalation group
// ✓ curve_profile should be VISIBLE
// ✓ curve_steepness should be VISIBLE
```

### Test 12: Persistence After Refresh

**Multi-Field Update Test:**
```javascript
const factId = 123;

// Update 10 fields across all modes
await fetch(`/api/budget/item/${factId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Napkin
    qty: 200,
    rate: 50.00,

    // Standard
    escalation_method: 'through_duration',
    vendor_name: 'Test Vendor Inc',
    is_committed: true,

    // Detail
    percent_complete: 75,
    budget_version: 'forecast',
    retention_pct: 15,
    approval_status: 'approved',
    bid_amount: 9500
  })
}).then(r => r.json()).then(console.log);

// Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
// Expand row in Detail mode
// ✓ ALL 10 fields should show updated values
```

---

## AUTOMATION TEST SCRIPT

**Quick Multi-Field Test:**

```javascript
// Paste this into browser console on Budget page

async function testBudgetFields() {
  const factId = prompt('Enter budget item ID to test:');
  if (!factId) return;

  console.log('🧪 Testing all budget field modes...\n');

  // Test 1: Napkin fields
  console.log('📝 Test 1: Napkin fields (qty, rate)');
  let r1 = await fetch(`/api/budget/item/${factId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qty: 100, rate: 25.50 })
  }).then(r => r.json());
  console.log(r1.success ? '✅ PASS' : '❌ FAIL', r1);

  // Test 2: Standard fields
  console.log('\n📝 Test 2: Standard fields (escalation, vendor)');
  let r2 = await fetch(`/api/budget/item/${factId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      escalation_method: 'through_duration',
      curve_profile: 'front_loaded',
      vendor_name: 'ACME Corp',
      confidence_level: 'high'
    })
  }).then(r => r.json());
  console.log(r2.success ? '✅ PASS' : '❌ FAIL', r2);

  // Test 3: Detail fields
  console.log('\n📝 Test 3: Detail fields (progress, budget version)');
  let r3 = await fetch(`/api/budget/item/${factId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      percent_complete: 50,
      status: 'in_progress',
      budget_version: 'revised',
      retention_pct: 10,
      approval_status: 'approved'
    })
  }).then(r => r.json());
  console.log(r3.success ? '✅ PASS' : '❌ FAIL', r3);

  // Verify persistence
  console.log('\n📝 Test 4: Verify all fields persisted');
  let r4 = await fetch(`/api/budget/item/${factId}`).then(r => r.json());

  const checks = [
    r4.data?.item?.qty === 100,
    r4.data?.item?.escalation_method === 'through_duration',
    r4.data?.item?.percent_complete === 50,
    r4.data?.item?.budget_version === 'revised'
  ];

  console.log(checks.every(Boolean) ? '✅ ALL PASS' : '❌ SOME FAILED');
  console.log('Field values:', {
    qty: r4.data?.item?.qty,
    escalation_method: r4.data?.item?.escalation_method,
    percent_complete: r4.data?.item?.percent_complete,
    budget_version: r4.data?.item?.budget_version
  });

  console.log('\n✨ Testing complete! Refresh page to verify UI updates.');
}

// Run the test
testBudgetFields();
```

---

## VISUAL TESTING CHECKLIST

### UI Components

- [ ] **Mode Selector**
  - [ ] 3 buttons render
  - [ ] Correct field counts (9, 28, 49)
  - [ ] Active mode highlighted
  - [ ] Clicking changes mode

- [ ] **Budget Grid (Napkin)**
  - [ ] 9 columns visible
  - [ ] No expand arrows
  - [ ] Inline editing works
  - [ ] No expandable rows

- [ ] **Budget Grid (Standard)**
  - [ ] 10 columns visible (adds Variance)
  - [ ] Expand arrows present
  - [ ] Clicking arrow shows 3 yellow accordion groups
  - [ ] All Standard fields render

- [ ] **Budget Grid (Detail)**
  - [ ] 10 columns visible
  - [ ] Expand arrows present
  - [ ] Clicking arrow shows 7 accordion groups (3 yellow + 4 red)
  - [ ] All Detail fields render

### Accordion Groups

- [ ] **Group Headers**
  - [ ] Color indicator (yellow for Standard, red for Detail)
  - [ ] Chevron (▶/▼) rotates on click
  - [ ] Badge shows field count
  - [ ] Clicking toggles expand/collapse

- [ ] **Group Bodies**
  - [ ] Fields render in 2-column layout
  - [ ] Field labels visible
  - [ ] Read-only badges show for computed fields
  - [ ] Input types match field type (text, dropdown, checkbox, etc.)

### Field Rendering

- [ ] **Text Inputs:** `<input type="text">`
- [ ] **Number Inputs:** `<input type="number">`
- [ ] **Currency Inputs:** `<input type="number">` with $ prefix
- [ ] **Percentage Inputs:** `<input type="number">` with % suffix
- [ ] **Dropdowns:** `<select>` with options
- [ ] **Dates:** `<input type="date">` with date picker
- [ ] **Checkboxes:** `<input type="checkbox">`
- [ ] **Textareas:** `<textarea>` with multiple rows
- [ ] **Sliders:** Range slider with badge showing value
- [ ] **Read-Only:** Plain text or disabled input

---

## KNOWN ISSUES

### ⚠️ Expected Limitations

1. **Period Allocation Mini-Grid:** Not yet implemented (shows placeholder)
2. **CPM Computed Fields:** Always show as read-only (CPM engine not built)
3. **User Lookup Fields:** Show "User #123" instead of name (user API not connected)
4. **Document Count:** Shows 0 (DMS integration not complete)

### ✅ Fixed Issues

1. ~~Next.js API only accepted 13 fields~~ → Fixed (proxies to Django)
2. ~~Mode selector showed wrong field counts~~ → Fixed (9/28/49)

---

## SUCCESS CRITERIA

All tests pass when:

✅ **Mode Selector:** Shows correct field counts (9/28/49)
✅ **Napkin Mode:** 9 inline fields editable, no expandable rows
✅ **Standard Mode:** 10 inline + 18 expandable fields (3 groups)
✅ **Detail Mode:** 10 inline + 39 expandable fields (7 groups)
✅ **Field Persistence:** All fields save on blur and persist after refresh
✅ **Field Dependencies:** Curve fields hide when timing_method ≠ 'curve'
✅ **Read-Only Fields:** Display as text/disabled, cannot edit
✅ **Computed Fields:** Show calculated values (variance, bid_variance)
✅ **Validation:** Invalid values rejected by API

---

## TROUBLESHOOTING

### Issue: Fields don't save

**Check:**
1. Network tab shows PUT request to `/api/budget/item/{factId}`
2. Response status is 200
3. Response body has `success: true`

**Fix:**
- Django must be running on port 8000
- Check `DJANGO_API_URL` environment variable
- Verify budget item exists in database

### Issue: Expandable row doesn't appear

**Check:**
1. Mode is Standard or Detail (not Napkin)
2. Row has expand arrow (▶)
3. `getFieldGroupsByMode()` returns groups

**Fix:**
- Check `fieldGroups.ts` is imported correctly
- Verify `mode` prop passed to `ExpandableDetailsRow`

### Issue: Fields show as read-only

**Check:**
1. Field config has `editable: true`
2. Field does not have `readonly: true` or `computed: true`

**Fix:**
- Update field config in `fieldGroups.ts`
- Remove `readonly` or `computed` flags

---

## REPORTING BUGS

When reporting issues, include:

1. **Mode:** Napkin / Standard / Detail
2. **Field Name:** Which field is affected
3. **Steps to Reproduce:** Exact steps
4. **Expected:** What should happen
5. **Actual:** What actually happened
6. **Console Errors:** Any errors in browser console
7. **Network:** Screenshot of failed API call

**Example:**
```
Mode: Detail
Field: percent_complete
Steps:
  1. Open Detail mode
  2. Expand row
  3. Change percent_complete to 75
  4. Blur field
Expected: Field saves to 75
Actual: Field reverts to 0
Console: "API call failed: 500 Internal Server Error"
Network: PUT /api/budget/item/123 returned 500
```

---

**Last Updated:** 2025-11-16
**Testing Status:** ✅ Framework complete, manual testing recommended
**Next Steps:** Run full regression test on staging environment

# Assumptions UI - Testing Checklist

**Date**: October 17, 2025
**URL**: http://localhost:3000/projects/11/assumptions

Use this checklist to verify all features are working correctly.

---

## Pre-Testing Setup

- [ ] Dev server is running (`npm run dev`)
- [ ] Database has Project 11 data (run `./scripts/verify-assumptions-db.sh`)
- [ ] Browser console is open (to catch any errors)
- [ ] Using Chrome/Firefox (not Safari, for best CSS support)

---

## Test Suite 1: Page Load & Data

- [ ] **1.1** Navigate to `/projects/11/assumptions`
- [ ] **1.2** Loading spinner appears briefly
- [ ] **1.3** Page loads without errors
- [ ] **1.4** All 5 baskets are visible
- [ ] **1.5** Basket 1 has acquisition data from Project 11
- [ ] **1.6** Global mode toggle shows "Napkin" as default (unless you changed it before)
- [ ] **1.7** Field count shows correct number (23 for napkin)

**Expected Data**:
- Purchase Price: $15,000,000
- Acquisition Date: 2025-01-15
- Hold Period: 7.0 years
- Exit Cap Rate: 5.5%

---

## Test Suite 2: Mode Switching

### Napkin Mode
- [ ] **2.1** Click "Napkin" button
- [ ] **2.2** Button shows active state (blue background)
- [ ] **2.3** Basket 1 shows exactly 5 fields
- [ ] **2.4** Field count shows 23 total fields
- [ ] **2.5** All baskets collapsed to napkin view
- [ ] **2.6** No jerky animations

### Mid Mode
- [ ] **2.7** Click "Mid" button
- [ ] **2.8** Smooth 300ms expansion animation
- [ ] **2.9** Basket 1 shows exactly 12 fields
- [ ] **2.10** Field count shows 85 total fields
- [ ] **2.11** Additional field groups appeared
- [ ] **2.12** "Acquisition Details" group visible
- [ ] **2.13** "Validation Metrics" group visible

### Pro Mode
- [ ] **2.14** Click "Kitchen Sink" button
- [ ] **2.15** Smooth 300ms expansion animation
- [ ] **2.16** Basket 1 shows exactly 18 fields
- [ ] **2.17** Field count shows 202 total fields
- [ ] **2.18** "Itemized Costs" group visible
- [ ] **2.19** "Tax Treatment" group visible
- [ ] **2.20** Some groups have collapse toggle buttons

### Mode Switching Performance
- [ ] **2.21** Switching feels instant (<500ms)
- [ ] **2.22** No layout shift/jumping
- [ ] **2.23** No console errors during switch

---

## Test Suite 3: Auto-Calculations

### Setup
- [ ] **3.1** Switch to Napkin mode
- [ ] **3.2** Clear all Basket 1 fields (if needed)

### Test Sale Date Calculation
- [ ] **3.3** Enter Acquisition Date: `2025-01-15`
- [ ] **3.4** Enter Hold Period Years: `7`
- [ ] **3.5** Sale Date auto-fills: `2032-01-15`
- [ ] **3.6** Change Hold Period to `10`
- [ ] **3.7** Sale Date updates to: `2035-01-15`
- [ ] **3.8** Field shows "Auto-calculated" hint

### Test Price Per Unit (Mid Mode)
- [ ] **3.9** Switch to Mid mode
- [ ] **3.10** Enter Purchase Price: `15000000`
- [ ] **3.11** (Note: Price per unit may be null if unit_count not in database)
- [ ] **3.12** If unit_count exists, verify calculation

### Test Depreciation Basis (Pro Mode)
- [ ] **3.13** Switch to Pro mode
- [ ] **3.14** Enter Purchase Price: `15000000`
- [ ] **3.15** Enter Land %: `20`
- [ ] **3.16** Improvement % auto-fills: `80.0`
- [ ] **3.17** Depreciation Basis auto-fills: `12000000`
- [ ] **3.18** Change Land % to `25`
- [ ] **3.19** Improvement % updates to: `75.0`
- [ ] **3.20** Depreciation Basis updates to: `11250000`

---

## Test Suite 4: Help Tooltips

### Napkin Mode Help
- [ ] **4.1** Switch to Napkin mode
- [ ] **4.2** Hover over "?" icon next to "Purchase Price"
- [ ] **4.3** Tooltip appears
- [ ] **4.4** Text is plain English: "How much are you paying..."
- [ ] **4.5** Tooltip disappears on mouse leave

### Mid Mode Help
- [ ] **4.6** Switch to Mid mode
- [ ] **4.7** Hover over same "?" icon
- [ ] **4.8** Tooltip shows different text
- [ ] **4.9** Text is more technical than napkin
- [ ] **4.10** Mentions "excluding buyer-side transaction costs"

### Pro Mode Help
- [ ] **4.11** Switch to Pro mode
- [ ] **4.12** Hover over same "?" icon
- [ ] **4.13** Tooltip shows most technical text
- [ ] **4.14** Mentions "PSA" and "depreciation basis"
- [ ] **4.15** Text is longest of the three tiers

---

## Test Suite 5: Auto-Save

### Setup
- [ ] **5.1** Open browser Network tab
- [ ] **5.2** Filter to show XHR requests only

### Test Save Functionality
- [ ] **5.3** Change Purchase Price to any value
- [ ] **5.4** Wait 1 second
- [ ] **5.5** "Saving..." indicator appears in header
- [ ] **5.6** POST request sent to `/api/projects/11/assumptions/acquisition`
- [ ] **5.7** "Saved [time]" indicator appears
- [ ] **5.8** Time updates to current time
- [ ] **5.9** No console errors

### Test Save Debouncing
- [ ] **5.10** Change Purchase Price rapidly 3 times
- [ ] **5.11** Only ONE request sent after 1 second pause
- [ ] **5.12** Final value is what was saved

### Test Save Persistence
- [ ] **5.13** Change Purchase Price to unique value (e.g., 14500000)
- [ ] **5.14** Wait for "Saved" indicator
- [ ] **5.15** Reload page (Cmd+R / Ctrl+R)
- [ ] **5.16** Page loads
- [ ] **5.17** Purchase Price shows saved value (14500000)

---

## Test Suite 6: Mode Persistence

### Test localStorage
- [ ] **6.1** Switch to Pro mode
- [ ] **6.2** Wait a moment
- [ ] **6.3** Close browser tab
- [ ] **6.4** Open new tab
- [ ] **6.5** Navigate to same URL
- [ ] **6.6** Page loads in Pro mode (not napkin)

### Test Mode Change Persistence
- [ ] **6.7** Switch to Napkin mode
- [ ] **6.8** Reload page
- [ ] **6.9** Page loads in Napkin mode

---

## Test Suite 7: All Baskets Present

### Visual Check
- [ ] **7.1** Scroll to top of page
- [ ] **7.2** See "Basket 1: The Deal" with purple header
- [ ] **7.3** Scroll down to see "Basket 2: The Cash In"
- [ ] **7.4** Scroll down to see "Basket 3: The Cash Out"
- [ ] **7.5** Scroll down to see "Basket 4: The Financing"
- [ ] **7.6** Scroll down to see "Basket 5: The Split"
- [ ] **7.7** Footer visible with field count

### Content Check
- [ ] **7.8** Each basket has visible fields
- [ ] **7.9** Each basket has colored header
- [ ] **7.10** Each basket has description text
- [ ] **7.11** All baskets respond to global mode toggle

---

## Test Suite 8: Field Types

### Text Input
- [ ] **8.1** Find any text field (Basket 5: Guarantor Name in pro mode)
- [ ] **8.2** Type text
- [ ] **8.3** Text appears normally

### Number Input
- [ ] **8.4** Find number field (Hold Period Years)
- [ ] **8.5** Type number
- [ ] **8.6** Decimals accepted
- [ ] **8.7** Up/down arrows work

### Currency Input
- [ ] **8.8** Find currency field (Purchase Price)
- [ ] **8.9** See "$" prefix
- [ ] **8.10** Type number
- [ ] **8.11** Decimals accepted

### Percentage Input
- [ ] **8.12** Find percentage field (Exit Cap Rate)
- [ ] **8.13** See "%" suffix
- [ ] **8.14** Type number
- [ ] **8.15** Accepts decimals

### Date Input
- [ ] **8.16** Find date field (Acquisition Date)
- [ ] **8.17** Click to open date picker
- [ ] **8.18** Select date
- [ ] **8.19** Date appears in YYYY-MM-DD format

### Dropdown Input
- [ ] **8.20** Switch to Pro mode in Basket 4
- [ ] **8.21** Find "Rate Type" dropdown
- [ ] **8.22** Click dropdown
- [ ] **8.23** See options: Fixed, Floating, Hybrid
- [ ] **8.24** Select option
- [ ] **8.25** Option saved

### Toggle Input
- [ ] **8.26** Switch to Pro mode in Basket 1
- [ ] **8.27** Find "1031 Exchange?" toggle
- [ ] **8.28** Click toggle
- [ ] **8.29** Switch animates
- [ ] **8.30** Label changes to "Yes" or "No"

---

## Test Suite 9: Responsive Design

### Mobile View (375px)
- [ ] **9.1** Resize browser to 375px width
- [ ] **9.2** Global toggle buttons stack vertically
- [ ] **9.3** Fields stack vertically (1 column)
- [ ] **9.4** Text remains readable
- [ ] **9.5** No horizontal scrolling
- [ ] **9.6** Mode switching still works

### Tablet View (768px)
- [ ] **9.7** Resize browser to 768px width
- [ ] **9.8** Fields show in 2 columns
- [ ] **9.9** Layout looks good
- [ ] **9.10** No overlapping

### Desktop View (1200px+)
- [ ] **9.11** Resize browser to 1200px+ width
- [ ] **9.12** Fields show in 3+ columns
- [ ] **9.13** Page content doesn't exceed 1200px max-width
- [ ] **9.14** Layout is balanced

---

## Test Suite 10: Error Handling

### Missing Data
- [ ] **10.1** Navigate to `/projects/99/assumptions` (non-existent project)
- [ ] **10.2** Page loads
- [ ] **10.3** No data populated (defaults shown)
- [ ] **10.4** No console errors
- [ ] **10.5** Save functionality still works

### Network Errors
- [ ] **10.6** Open DevTools → Network tab
- [ ] **10.7** Enable "Offline" mode
- [ ] **10.8** Change a field
- [ ] **10.9** Save attempt fails (check console)
- [ ] **10.10** Disable "Offline" mode
- [ ] **10.11** Change field again
- [ ] **10.12** Save succeeds

---

## Test Suite 11: Performance

### Load Time
- [ ] **11.1** Hard reload page (Cmd+Shift+R / Ctrl+Shift+F5)
- [ ] **11.2** Note time to interactive
- [ ] **11.3** Should be < 2 seconds

### Animation Performance
- [ ] **11.4** Rapidly switch modes: Napkin → Mid → Pro → Mid → Napkin
- [ ] **11.5** Animations are smooth (no lag)
- [ ] **11.6** No flickering
- [ ] **11.7** No console warnings

### Memory Usage
- [ ] **11.8** Open DevTools → Performance → Memory
- [ ] **11.9** Take heap snapshot
- [ ] **11.10** Switch modes 10 times
- [ ] **11.11** Take another snapshot
- [ ] **11.12** No significant memory leak (< 10MB growth)

---

## Test Suite 12: Browser Compatibility

### Chrome
- [ ] **12.1** All features work in Chrome
- [ ] **12.2** Animations smooth
- [ ] **12.3** No console errors

### Firefox
- [ ] **12.4** All features work in Firefox
- [ ] **12.5** Animations smooth
- [ ] **12.6** No console errors

### Safari (if available)
- [ ] **12.7** All features work in Safari
- [ ] **12.8** Animations smooth
- [ ] **12.9** No console errors

---

## Summary

**Date Tested**: _______________

**Tested By**: _______________

**Browser**: _______________

**Total Tests**: 139

**Tests Passed**: ______ / 139

**Tests Failed**: ______ / 139

**Critical Issues**: _______________

**Minor Issues**: _______________

**Overall Status**: ⬜ Pass  ⬜ Pass with Issues  ⬜ Fail

---

## Issue Report Template

If you find issues, report them using this format:

```
**Issue #X**: [Short Title]
**Severity**: Critical / Major / Minor
**Test**: [Test number, e.g., 3.5]
**Description**: [What happened]
**Expected**: [What should happen]
**Steps to Reproduce**:
1.
2.
3.
**Screenshot**: [If applicable]
**Browser**: [Chrome/Firefox/Safari]
**Console Errors**: [Copy/paste any errors]
```

---

## Next Steps After Testing

- [ ] Document all issues found
- [ ] Prioritize critical issues
- [ ] Fix critical issues
- [ ] Re-test failed tests
- [ ] Get stakeholder approval for demo
- [ ] Schedule demo session

---

**Ready to test! 🧪**

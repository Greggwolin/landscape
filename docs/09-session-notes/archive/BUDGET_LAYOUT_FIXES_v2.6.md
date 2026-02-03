# Budget Layout Fixes - v2.6 (Balanced Inline)

**Date:** 2025-11-16
**Status:** In Progress

---

## ISSUES ADDRESSED

### 1. ✅ Layout Too Tight (from v2.4)
**Problem:** Single-row layout with `col-auto` was too cramped

**Solution:** Kept single-row inline layout but with improved spacing:
- Increased field widths (Escalation %: 70px → 100px, etc.)
- Increased gap: `g-1` → `g-2` (0.25rem → 0.5rem)
- Increased padding: 0.5rem → 0.75rem
- Kept labels concise but clear

**Result:** All fields on one row with comfortable breathing room

---

### 2. ⚠️ Escalation Timing Dropdown Not Working
**Problem:** User cannot select options in the Escalation Timing dropdown

**Investigation:**
- DropdownInput component (FieldRenderer.tsx:355-380) calls `onChange(e.target.value || null)` on change
- handleFieldChange in ExpandableDetailsRow calls `onInlineCommit`
- Database column `escalation_method` exists and accepts VARCHAR

**Possible Causes:**
1. The dropdown might be disabled (check `field.editable`)
2. The onChange might not be propagating through onInlineCommit
3. Browser event might be blocked

**Next Steps:**
- Add console.log to DropdownInput to verify onChange fires
- Check if onInlineCommit is defined in parent BudgetDataGrid
- Verify API accepts escalation_method field

---

### 3. ✅ Curve Profile/Steepness Labels Visible When Hidden
**Problem:** When Distribution is not "S-Curve", the Curve Profile and Steepness labels were still visible (only inputs were hidden)

**Fix Applied:** [ExpandableDetailsRow.tsx:143-153](../src/components/budget/custom/ExpandableDetailsRow.tsx#L143-L153)
```tsx
// Check if field should be visible based on dependencies
if (field.dependsOn && field.dependsOn.includes('timing_method')) {
  // Curve-specific fields (profile, steepness)
  if ((field.name === 'curve_profile' || field.name === 'curve_steepness')
      && item.timing_method !== 'curve') {
    return null; // Hide entire field div (label + input)
  }
  // Milestone-specific fields (dependency_count)
  if (field.name === 'dependency_count'
      && item.timing_method !== 'milestone') {
    return null;
  }
}
```

**Result:** Entire field (label + input) now hidden when timing_method !== 'curve'

---

### 4. ✅ Milestone Mode - Added Dependencies Link
**Problem:** Selecting "Milestone" distribution didn't show any configuration options

**Solution:** Added `dependency_count` field that shows when timing_method = 'milestone'

**Field Definition:** [fieldGroups.ts:112-126](../src/components/budget/config/fieldGroups.ts#L112-L126)
```tsx
{
  name: 'dependency_count',
  label: 'Dependencies',
  type: 'link',
  mode: 'standard',
  group: 'timing',
  editable: false,
  readonly: true,
  computed: true,
  dependsOn: ['timing_method'],
  width: 110,
  colWidth: 'auto',
  helpText: 'Configure milestone dependencies',
}
```

**Behavior:**
- Fixed Distribution: Shows 5 fields (Start, End, Distribution, Escalation %, Escalation Timing)
- S-Curve Distribution: Shows 7 fields (+ Curve Profile, Steepness)
- Milestone Distribution: Shows 6 fields (+ Dependencies link)

**Next Steps:**
- Implement Dependencies modal/dialog when link is clicked
- Link should open milestone dependency configuration UI

---

## VISUAL LAYOUT

### Balanced Inline Layout (v2.6)

**Fixed Distribution:**
```
[Start] [End] [Distribution] [Escalation %] [Escalation Timing]
```

**S-Curve Distribution:**
```
[Start] [End] [Distribution] [Escalation %] [Escalation Timing] [Curve Profile] [Steepness ──── 50]
```

**Milestone Distribution:**
```
[Start] [End] [Distribution] [Escalation %] [Escalation Timing] [Dependencies (2)]
```

---

## FILES MODIFIED

### 1. Field Group Definitions
**File:** [src/components/budget/config/fieldGroups.ts](../src/components/budget/config/fieldGroups.ts)

**Changes:**
- Kept `colWidth: 'auto'` for inline layout
- Increased field widths for better spacing
- Added `dependency_count` link field for milestone mode
- Field labels remain clear: "Distribution", "Escalation Timing", "Escalation %"

### 2. Expandable Details Row Component
**File:** [src/components/budget/custom/ExpandableDetailsRow.tsx](../src/components/budget/custom/ExpandableDetailsRow.tsx)

**Changes:**
- Version: v2.5 → v2.6
- Increased gap: `g-1` → `g-2`
- Increased padding: 0.5rem → 0.75rem
- Fixed visibility logic: Now checks field name to determine visibility based on timing_method
  - `curve_profile`, `curve_steepness` → Show only when `timing_method === 'curve'`
  - `dependency_count` → Show only when `timing_method === 'milestone'`

---

## TESTING CHECKLIST

### Visual Tests
- [x] **Inline Layout:** All fields appear on single row
- [x] **Adequate Spacing:** Fields not cramped, comfortable to read
- [ ] **Escalation Timing:** Dropdown allows selections
- [x] **Curve Fields Hidden:** Labels + inputs hidden when not S-Curve
- [x] **Milestone Link:** Dependencies link shows when Milestone selected

### Functional Tests
- [ ] **Escalation Timing Dropdown:** User can select "To Start" or "Throughout"
- [ ] **Escalation Timing Saves:** Selection persists after page reload
- [x] **S-Curve Fields:** Curve Profile and Steepness only show when timing_method = 'curve'
- [ ] **Milestone Link:** Clicking Dependencies link opens configuration modal

### Conditional Visibility
- [x] **Fixed Distribution:** Shows 5 fields (no curve, no dependencies)
- [x] **S-Curve Distribution:** Shows 7 fields (includes curve fields)
- [x] **Milestone Distribution:** Shows 6 fields (includes dependencies link)

---

## KNOWN ISSUES

### 🔴 CRITICAL: Escalation Timing Dropdown Not Working
**Symptom:** User cannot select options in Escalation Timing dropdown

**Status:** Under investigation

**Next Steps:**
1. Add debugging to verify onChange event fires
2. Check if onInlineCommit callback is defined
3. Verify API accepts escalation_method updates

---

### ⚠️ TODO: Implement Dependencies Modal
**Current:** Dependencies link shows count but clicking does nothing

**Required:**
1. Create MilestoneDependenciesModal component
2. Add onClick handler to LinkField in FieldRenderer
3. Modal should allow:
   - Add/remove milestone dependencies
   - Set dependency types (FS, FF, SS, SF)
   - Set lag days
   - Save to database

---

## METRICS

### Space Efficiency

| Version | Layout | Timing Fields Height | Spacing Quality |
|---------|--------|---------------------|-----------------|
| v2.3 | 3-column | ~100px | ✅ Good |
| v2.4 | Ultra-compact | ~30px | ❌ Too tight |
| **v2.6** | **Balanced inline** | **~40px** | ✅ **Optimal** |

**Space Savings:** 60% reduction vs v2.3, with much better readability than v2.4

---

## PRODUCTION READINESS

### ⚠️ NOT YET READY

**Blockers:**
- 🔴 Escalation Timing dropdown issue must be resolved
- 🟡 Milestone Dependencies modal needs implementation

**Once Resolved:**
- ✅ Layout is visually balanced
- ✅ Conditional visibility works correctly
- ✅ S-curve error fixed (database trigger)
- ✅ Labels are clear and distinct

---

**Last Updated:** 2025-11-16
**Version:** v2.6 (Balanced Inline)
**Status:** ⚠️ In Progress - Escalation Timing Issue

**Related Documentation:**
- [BUDGET_LAYOUT_FIXES_v2.5.md](./BUDGET_LAYOUT_FIXES_v2.5.md) - Previous iteration
- [BUDGET_FIELD_VERIFICATION_COMPLETE.md](./BUDGET_FIELD_VERIFICATION_COMPLETE.md) - System verification

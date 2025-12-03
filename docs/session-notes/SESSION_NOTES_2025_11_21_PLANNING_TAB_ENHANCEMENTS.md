# Session Notes: Planning Tab Enhancements
**Date:** 2025-11-21
**Branch:** `feature/nav-restructure-phase7`
**Focus:** Planning efficiency fixes, DUA calculation corrections, FF/Acre column, and UX improvements

---

## Summary

Fixed critical bugs and added enhancements to the Planning tab:
1. ✅ Fixed planning efficiency save issue (database column mismatch)
2. ✅ Corrected DUA calculation formula (was backwards)
3. ✅ Added Front Feet per Acre (FF/Acre) calculated column
4. ✅ Implemented auto-save for planning efficiency (no button required)
5. ✅ Made parcel table click-to-edit (removed Edit button)

---

## 1. Planning Efficiency Save Fix

### Problem
Planning efficiency input wasn't saving. Previous fixes had failed.

### Root Cause
**Database column name mismatch:**
- Database: `tier_1_label`, `tier_2_label`, `tier_3_label`
- API code: `level1_label`, `level2_label`, `level3_label`

### Solution
Fixed SQL queries in API routes to use correct column names with aliases:

**Files Modified:**
- `src/app/api/project/granularity-settings/route.ts` - Added `tier_*_label as level*_label`
- `src/app/api/projects/[projectId]/config/route.ts` - Same alias fix
- `src/app/components/Planning/PlanningOverviewControls.tsx` - Removed race condition

### Result
✅ Values now save to `landscape.tbl_project.planning_efficiency`
✅ Persist across reloads
✅ Used in DUA calculations

---

## 2. DUA Formula Correction

### Problem
Formula was **backwards** - reducing density instead of increasing it.

**Wrong:**
```typescript
dua = (units / acres) × planningEfficiency
// 150 units / 30 acres × 0.85 = 4.25 ❌
```

**Correct:**
```typescript
dua = units / (acres × planningEfficiency)
// 150 units / (30 × 0.85) = 150 / 25.5 = 5.88 ✓
```

### Logic
- Planning Efficiency = 85% means **85% of land is developable**
- 30 acres × 0.85 = **25.5 developable acres**
- 150 units / 25.5 acres = **5.88 DUA** (net density on developable land)

### Files Modified
- `src/app/components/Planning/PlanningContent.tsx:1401-1409`
- `src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:298-305`
- `docs/02-features/land-use/PLANNING_EFFICIENCY_REFERENCE.md`

### Result
✅ DUA now shows correct net density on developable land
✅ Lower efficiency = Higher density (as expected)

---

## 3. Front Feet per Acre (FF/Acre) Column

### Formula
```
FF/Acre = (units × lot_width) / acres
```

### Implementation
Added new calculated column after DUA:

**Files Modified:**
- Interface: `PlanningContent.tsx:27` - Added `lot_width?: number`
- Header: `PlanningContent.tsx:769` - Added "FF/Acre" column
- Calculation: `PlanningContent.tsx:1410-1432` - Implemented formula
- API: `src/app/api/parcels/route.ts:50` - Added lot_width to query

### Display Logic
- ✅ Shows for **residential parcels** with valid lot_width
- ➖ Shows "—" for non-residential or missing data
- 📊 Formatted with commas (e.g., "1,234")

### Example
Parcel: 150 units × 60 ft / 30 acres = **300 FF/Acre**

---

## 4. Auto-Save Planning Efficiency

### Enhancement
Planning efficiency now **auto-saves** without requiring "Apply Changes" button.

### Implementation
**File:** `src/app/components/Planning/PlanningOverviewControls.tsx`

- Added `useRef` for debounce timeout (line 44)
- Modified `handleEfficiencyChange` (lines 128-161):
  - Updates local state immediately
  - 800ms debounce before server save
  - Auto-triggers SWR mutation
- Added cleanup effect (lines 53-59)

### User Flow
```
User types "85" → Local updates instantly →
Wait 800ms → Auto-save → DUA recalculates
```

### Result
✅ No button click needed
✅ DUA updates automatically
✅ Debouncing prevents excessive API calls

---

## 5. Click-to-Edit Parcel Table

### Enhancement
Removed "Edit" button - rows now enter edit mode on click.

### Implementation
**File:** `src/app/components/Planning/PlanningContent.tsx`

- Row click handler (lines 1238-1242)
- Blue highlight when editing (line 1236)
- Removed "Edit" button (kept Detail/Delete)
- Added `stopPropagation` to all interactive elements

### User Flow
**Before:** Click Edit → Edit fields → Save/Cancel
**After:** Click row → Edit fields → Save/Cancel

### Visual Feedback
- **View:** Alternating stripes, pointer cursor on hover
- **Edit:** Blue background `rgba(13, 110, 253, 0.08)`

---

## Files Modified Summary

### API Routes (3 files)
1. `src/app/api/project/granularity-settings/route.ts`
2. `src/app/api/projects/[projectId]/config/route.ts`
3. `src/app/api/parcels/route.ts`

### Components (3 files)
4. `src/app/components/Planning/PlanningContent.tsx`
5. `src/app/components/Planning/PlanningOverviewControls.tsx`
6. `src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx`

### Documentation (2 files)
7. `docs/02-features/land-use/PLANNING_EFFICIENCY_REFERENCE.md`
8. `docs/session-notes/SESSION_NOTES_2025_11_21_PLANNING_TAB_ENHANCEMENTS.md`

---

## Testing Performed

✅ Planning efficiency saves correctly
✅ DUA formula produces accurate results
✅ FF/Acre calculations verified
✅ Auto-save debouncing works
✅ Click-to-edit UX smooth
✅ All edge cases handled (missing data, non-residential, etc.)

---

## Database Schema

**landscape.tbl_project:**
- `planning_efficiency` NUMERIC(5,4)

**landscape.tbl_project_config:**
- `tier_1_label`, `tier_2_label`, `tier_3_label` VARCHAR(50)

**landscape.tbl_parcel:**
- `lot_width` DOUBLE PRECISION
- `units_total` INTEGER
- `acres_gross` DOUBLE PRECISION

---

## Key Learnings

1. **Column Name Verification** - Always verify database column names match API expectations
2. **Formula Direction** - Planning efficiency should increase density (units concentrated on less land)
3. **Debouncing** - 800ms is good balance for auto-save features
4. **Event Bubbling** - Use `stopPropagation` when making rows clickable
5. **Local vs Server State** - Update local immediately, debounce server saves

---

## Related Documentation

- [Planning Efficiency Reference](../02-features/land-use/PLANNING_EFFICIENCY_REFERENCE.md)
- [Planning Engineering Lifecycle](../11-implementation-status/PLANNING_ENGINEERING_LIFECYCLE_STAGE_COMPLETE_25-11-18.md)

---

**Session Complete**
**Estimated Time:** 4 hours
**Files Changed:** 8 files (~250 lines)
**Bugs Fixed:** 2 critical
**Features Added:** 2
**UX Improvements:** 1

# Planning Page MVP Fixes - Implementation Status

**Session**: JX83
**Date**: October 31, 2025
**Status**: PHASES 1-2 COMPLETE, PHASES 3-5 PENDING

---

## ✅ COMPLETED PHASES

### Phase 1: Remove Manual Controls ✅

**Removed Elements:**
- ✅ "+ Add Plan Area" button from Plan Areas section header
- ✅ Red × delete buttons from all Plan Area cards
- ✅ "Add Phase: Select Plan Area..." dropdown from Phases Overview header
- ✅ "Filter" buttons from Phases Overview table Actions column
- ✅ "Delete" buttons from Phases Overview table Actions column

**Code Changes:**
- File: `src/app/components/Planning/PlanningContent.tsx`
  - Removed addArea button (lines ~535-543)
  - Removed delete button from Area cards (lines ~562-571)
  - Removed Add Phase dropdown (lines ~625-649)
  - Removed Filter and Delete buttons from PhaseRow Actions column
  - Removed onDelete prop from PhaseRow component call

**Commit**: `247867a` - "feat: remove manual Area/Phase creation controls from Planning page"

---

### Phase 2: Layout & Messaging Updates ✅

**Added:**
- ✅ Planning Overview intro text explaining workflow
- ✅ TODO comments marking where Parcel Detail should be positioned
- ✅ Comments marking Areas/Phases as "Read-only rollups from Parcel Detail"

**Text Added:**
```
"The Parcel Detail table is the source of truth for all planning data.
Enter parcels with their Plan Area and Phase assignments below.
Plan Areas and Phases Overview sections automatically roll up from your parcel entries."
```

**Code Changes:**
- File: `src/app/components/Planning/PlanningContent.tsx`
  - Added intro paragraph to Planning Overview header
  - Added comments for future refactoring

**Commit**: `0b31a7a` - "feat: Planning page fixes - Phase 1 & 2, plus Project Profile updates"

---

### Database Updates ✅

**Migration Created:**
- File: `db/migrations/013_add_parcel_description.sql`
- Added `description TEXT` column to `tbl_parcel`
- Migration executed successfully on Neon database

**SQL:**
```sql
ALTER TABLE landscape.tbl_parcel
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN landscape.tbl_parcel.description
IS 'Parcel description for planning notes';
```

---

### Phase 5: Import PDF Placeholder ✅

**Added:**
- ✅ Blue "Import PDF" button in Parcel Detail section header
- ✅ Modal dialog with "coming soon" message
- ✅ Professional, non-blocking UI

**Button Location:**
- Positioned before "Add Parcel" dropdown
- Uses `var(--cui-info)` for blue color
- Smooth hover transitions

**Modal Content:**
```
Title: "PDF Import - Coming Soon"
Body: "Landscaper AI will soon extract parcel data from PDF tables automatically.
For now, please add parcels manually using the Add Parcel dropdown."
Button: "Got it"
```

**Code Changes:**
- File: `src/app/components/Planning/PlanningContent.tsx`
  - Added showImportPdfModal state
  - Added Import PDF button with onClick handler
  - Added modal component with overlay

**Commit**: `1e99526` - "feat: add Import PDF placeholder button to Planning page"

---

## ⏳ PENDING PHASES

### Phase 3: Auto-Create Logic (NOT STARTED)

**Required Implementation:**

1. **Helper Functions Needed:**
```typescript
async function getOrCreateArea(
  projectId: number,
  areaName: string
): Promise<{ area_id: number; area_no: number }> {
  // Check if area exists by name
  // If not, create new area with next area_no
  // Return area_id and area_no
}

async function getOrCreatePhase(
  projectId: number,
  areaId: number,
  phaseName: string
): Promise<{ phase_id: number; phase_no: number }> {
  // Check if phase exists within area
  // If not, create new phase with next phase_no
  // Return phase_id and phase_no
}
```

2. **API Endpoint Updates:**
- Modify `POST /api/parcels` to accept area_name and phase_name instead of IDs
- Use helper functions to get/create before inserting parcel
- Add toast notifications for auto-created entities

3. **UI Updates:**
- Change Area/Phase dropdowns to allow free-text entry
- Implement combobox pattern (autocomplete + create new)
- Add visual feedback when new Area/Phase is created

**Files to Modify:**
- `src/app/api/parcels/route.ts` (POST endpoint)
- `src/app/components/Planning/PlanningContent.tsx` (UI dropdowns)
- Create: `src/lib/planning-helpers.ts` (helper functions)

---

### Phase 4: Rollup Queries (NOT STARTED)

**Required Endpoints:**

1. **GET /api/projects/[projectId]/planning/areas-summary**
```sql
SELECT
  a.area_id,
  a.area_no,
  a.area_name,
  COUNT(DISTINCT ph.phase_id) as phase_count,
  COUNT(DISTINCT p.parcel_id) as parcel_count,
  SUM(p.acres_gross) as total_acres,
  SUM(p.units_total) as total_units
FROM landscape.tbl_area a
LEFT JOIN landscape.tbl_phase ph ON a.area_id = ph.area_id
LEFT JOIN landscape.tbl_parcel p ON ph.phase_id = p.phase_id
WHERE a.project_id = $1
GROUP BY a.area_id
ORDER BY a.area_no
```

2. **GET /api/projects/[projectId]/planning/phases-summary**
```sql
SELECT
  ph.phase_id,
  CONCAT(a.area_no, ' • Phase ', ph.phase_no) as phase_display,
  STRING_AGG(DISTINCT p.family_name, ', ') as phase_uses,
  ph.description,
  SUM(p.acres_gross) as acres,
  SUM(p.units_total) as units
FROM landscape.tbl_phase ph
JOIN landscape.tbl_area a ON ph.area_id = a.area_id
LEFT JOIN landscape.tbl_parcel p ON ph.phase_id = p.phase_id
WHERE ph.project_id = $1
GROUP BY ph.phase_id, a.area_no, ph.phase_no, ph.description
ORDER BY a.area_no, ph.phase_no
```

**Files to Create:**
- `src/app/api/projects/[projectId]/planning/areas-summary/route.ts`
- `src/app/api/projects/[projectId]/planning/phases-summary/route.ts`

**UI Updates:**
- Modify PlanningContent to use new summary endpoints
- Remove local rollup calculations
- Add SWR for auto-refresh

---

### Parcel Detail Flyout Updates (NOT STARTED)

**Required Field Order:**

Current flyout is in: `src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx`

**New Layout Per Spec:**

**Row 1 (full width):**
- Parcel Name (text input)

**Row 2 (full width):**
- Land Use Family (dropdown from lu_family.name)

**Row 3 (full width):**
- Land Use Type (dropdown from lu_type.name, filtered by Family)

**Row 4 (split 50/50):**
- Acres (number input, NO spinner, 2 decimals)
- Units (number input, NO spinner, integer)

**Row 5 (split 50/50):**
- Product Type (dropdown from res_lot_product.code, filtered by Type)
- Frontage (ft) - **CONDITIONAL DISPLAY**
  - Only show if Product Type is SFD (single-family detached)
  - Formula: `Units × Product.lot_w_ft`
  - Read-only, formatted as `#,###`

**Row 6 (full width):**
- Description (textarea, multiline)

**Frontage Calculation Logic:**
```typescript
function calculateFrontage(
  units: number,
  productCode: string,
  products: Product[]
): number | null {
  const product = products.find(p => p.code === productCode);

  // Only calculate for SFD products (not townhomes)
  if (!product || !product.code.startsWith('SF') || product.code.includes('TH')) {
    return null;
  }

  return units * (product.lot_w_ft || 0);
}

function formatFrontage(feet: number | null): string {
  if (feet === null) return '';
  return feet.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
```

**Changes Needed:**
- Reorganize ParcelDetailCard.tsx layout
- Add conditional frontage field
- Remove Notes field
- Update save handler to use description field

---

## 📊 PROGRESS SUMMARY

| Phase | Status | Commits |
|-------|--------|---------|
| Phase 1: Remove Manual Controls | ✅ Complete | 247867a |
| Phase 2: Layout & Messaging | ✅ Complete | 0b31a7a |
| Database: Add description column | ✅ Complete | N/A (migration) |
| Phase 5: Import PDF Placeholder | ✅ Complete | 1e99526 |
| Phase 3: Auto-Create Logic | ⏳ Pending | - |
| Phase 4: Rollup Queries | ⏳ Pending | - |
| Parcel Flyout Updates | ⏳ Pending | - |

**Overall Progress: 60% Complete**

---

## 🎯 SUCCESS CRITERIA

### ✅ Achieved:
- ✅ Plan Areas section is read-only (no Add/Delete buttons)
- ✅ Phases Overview is read-only (no Add/Delete/Filter buttons)
- ✅ Planning Overview explains Parcel Detail is source of truth
- ✅ Import PDF button exists with "coming soon" modal
- ✅ Database has description column for parcel notes

### ⏳ Remaining:
- ⏳ Areas and Phases auto-create when referenced in Parcel Detail
- ⏳ Plan Areas and Phases sections use rollup API endpoints
- ⏳ Parcel Detail flyout has updated field order
- ⏳ Frontage calculation shows conditionally for SFD products
- ⏳ Page layout physically reordered (Parcel Detail at top)

---

## 🚀 NEXT STEPS

### Priority 1: Test Current Changes
1. Navigate to http://localhost:3000/planning
2. Verify "+ Add Plan Area" button is removed
3. Verify delete buttons are removed from Area cards
4. Verify "Add Phase" dropdown is removed
5. Verify Filter/Delete buttons removed from Phases table
6. Click "Import PDF" button - verify modal appears
7. Verify intro text displays correctly

### Priority 2: Auto-Create Logic
1. Create `src/lib/planning-helpers.ts` with helper functions
2. Update `POST /api/parcels` to use area_name/phase_name
3. Modify UI to allow text input for Area/Phase
4. Add toast notifications for auto-creation

### Priority 3: Rollup Endpoints
1. Create areas-summary API route
2. Create phases-summary API route
3. Update PlanningContent to use new endpoints
4. Test auto-refresh after parcel changes

### Priority 4: Flyout Updates
1. Reorganize ParcelDetailCard field order
2. Add conditional frontage display logic
3. Remove Notes field
4. Test cascading dropdowns

---

## 📝 NOTES

- Migration 013 was executed but file is in .gitignore (not tracked in repo)
- Physical section reordering deferred due to code complexity
- Current layout still has Areas/Phases above Parcel Detail (visual hierarchy not yet optimal)
- Auto-create pattern requires significant UI changes (combobox instead of dropdown)
- ParcelDetailCard is complex wizard component - proceed with caution

---

## 🔗 REFERENCES

**Original Prompt:** `PLANNING_PAGE_FIXES_PROMPT.md`
**Session ID:** JX83
**Branch:** `work`
**Last Push:** 1e99526 (October 31, 2025)

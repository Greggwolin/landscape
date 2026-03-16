# CODEX: DMS Document Type — Verification & Remaining Work

## Session Summary (2026-02-23)

Commit `1fa7915` on `feature/alpha-prep` implements the core fix: doc type filters are now project-owned via `dms_project_doc_types` rather than resolved on-the-fly from templates. Backfill migration has been run against Neon. Commit has NOT been pushed (no GitHub credentials in sandbox).

## What Was Done

### Code Changes (committed, unpushed)

1. **`migrations/20260223_backfill_project_doc_types.sql`** — Seeds all 18 existing projects from their template (or workspace default). Already executed against Neon — 178 rows created.

2. **`src/app/api/projects/minimal/route.ts`** — After project INSERT, copies template's `doc_type_options` into `dms_project_doc_types` with `is_from_template = true`.

3. **`backend/apps/documents/tag_views.py`** — Django `GET /api/dms/projects/{id}/doc-types/` simplified to query ONLY `dms_project_doc_types`. Removed template merge logic.

4. **`src/app/api/projects/[projectId]/dms/doc-types/route.ts`** — Next.js endpoint simplified to query ONLY `dms_project_doc_types`. Removed template lookup via `dms_template_id`.

5. **`src/components/dms/DMSView.tsx`** — Replaced invisible inline "+ Add Type" input with CoreUI `CModal` (text input + Save/Cancel buttons).

### Database State

```sql
-- Verify backfill ran:
SELECT project_id, COUNT(*) as type_count
FROM landscape.dms_project_doc_types
GROUP BY project_id
ORDER BY project_id;
-- Expected: 18 projects, 6 types each for Land Dev, 11 for Commercial/MF
-- Total: 178 rows
```

---

## VERIFICATION CHECKLIST

Run these tests with both Next.js (:3000) and Django (:8000) servers running.

### Test 1: Filters Load on Previously Broken Project

```
Navigate to: /projects/84?folder=documents
Expected: Accordion filters show 11 types (Accounting, Agreements, Correspondence, Diligence, Leases, Market Data, Misc, Offering, Operations, Property Data, Title & Survey)
Previously: Showed nothing or only "general"
```

### Test 2: Edit Document Profile Dropdown

```
1. Open any document's Edit Profile modal on project 84
2. Click the doc_type dropdown
Expected: All 11 types listed, NO "(custom)" warning
Previously: Only "Property Data (custom)" with warning message
```

### Test 3: Add Type Modal

```
1. Navigate to any project DMS
2. Click "+ Add Type" button at bottom of filter list
Expected: CoreUI modal opens with "Add Document Type" title, text input, Cancel and Add Type buttons
3. Type "Test Category" and click "Add Type"
Expected: Modal closes, new filter appears in accordion, "Save to Template" prompt appears
4. Click "Keep Project Only"
5. Verify: SELECT * FROM landscape.dms_project_doc_types WHERE project_id = [ID] AND doc_type_name = 'Test Category';
```

### Test 4: Drop-to-Filter Still Works

```
1. Drag a file onto the "Offering" filter accordion header
Expected: File stages with doc_type = "Offering" pre-selected in staging tray
2. Confirm upload
3. Expand "Offering" filter — document should appear there
```

### Test 5: New Project Creation Seeds Types

```
1. Create a new project via onboarding modal
2. Navigate to its DMS tab
Expected: Filters populate immediately (seeded from workspace default template)
Verify: SELECT * FROM landscape.dms_project_doc_types WHERE project_id = [NEW_ID];
```

### Test 6: Project 17 Still Works (Regression)

```
Navigate to: /projects/17?folder=documents
Expected: Same filters as before, all documents visible in correct categories
```

---

## REMAINING ISSUES (Not Fixed in This Session)

### Issue 1: Case-Sensitive Document Search (MEDIUM)

**File:** `src/app/api/dms/search/route.ts` (line ~30)

The filter count uses case-insensitive matching (via JS Map), but the document search SQL uses exact match:
```sql
WHERE doc_type = 'Appraisal Report'  -- case-sensitive
```

If a document was saved with `doc_type = 'appraisal report'` (lowercase), the filter shows the correct count but clicking to expand returns 0 documents.

**Fix:**
```sql
WHERE LOWER(doc_type) = LOWER(${docType})
```

**File to modify:** `src/app/api/dms/search/route.ts`

### Issue 2: Malformed Template 5 (LOW)

Template 5 ("Valuation") has `doc_type_options` as a single comma-separated string instead of a proper array:
```
["Engagement,Correspondence,Property Data, MarketData,Comparable Sales,..."]
```

This won't affect existing projects (they're seeded now), but any new project explicitly assigned template 5 would get one malformed filter entry instead of individual types.

**Fix:**
```sql
UPDATE landscape.dms_templates
SET doc_type_options = ARRAY[
  'Engagement', 'Correspondence', 'Property Data', 'Market Data',
  'Comparable Sales', 'Comparable Land Sales', 'Comparable Rentals',
  'Operating Expenses', 'Other Budgets'
]
WHERE template_id = 5;
```

### Issue 3: DMSView Legacy Fallback Chain (LOW)

`DMSView.tsx` `loadFilters()` still has a multi-step fallback chain:
1. Try Django API (primary)
2. Fall back to Next.js legacy API
3. Fall back to hardcoded "valuation" template

Now that both Django and Next.js read from `dms_project_doc_types`, the fallback chain is redundant but harmless. Could be simplified later to remove the legacy fallback paths (lines ~156-224 in DMSView.tsx).

### Issue 4: `dms_template_id` Column on `tbl_project` (CLEANUP)

The `dms_template_id` column on `tbl_project` is now only used during project creation to know which template to seed from. It's still being set and stored but is no longer read by any doc-type query endpoint. Consider whether to:
- Keep it as metadata (which template was this project seeded from?)
- Remove it eventually as dead weight

### Issue 5: Delete Protection on Template-Sourced Types

`tag_views.py` line 365 prevents deleting template-sourced types:
```python
WHERE id = %s AND project_id = %s AND is_from_template = FALSE
```

This means users can only delete custom-added types, not the ones seeded from the template. Decide if this is intentional or if users should be able to remove any type from their project workspace.

---

## FILES REFERENCE

| File | Purpose | Status |
|------|---------|--------|
| `migrations/20260223_backfill_project_doc_types.sql` | Backfill existing projects | DONE (executed) |
| `src/app/api/projects/minimal/route.ts` | Seed on project creation | DONE |
| `backend/apps/documents/tag_views.py` | Django GET simplified | DONE |
| `src/app/api/projects/[projectId]/dms/doc-types/route.ts` | Next.js GET simplified | DONE |
| `src/components/dms/DMSView.tsx` | Add Type modal | DONE |
| `src/app/api/dms/search/route.ts` | Case-sensitive search | TODO (Issue 1) |
| `src/components/dms/profile/ProfileForm.tsx` | Edit profile dropdown | NO CHANGE NEEDED |
| `src/components/dms/filters/AccordionFilters.tsx` | Filter rendering | NO CHANGE NEEDED |
| `src/contexts/UploadStagingContext.tsx` | Upload staging | NO CHANGE NEEDED |

---

## PUSH INSTRUCTIONS

Commit `1fa7915` on `feature/alpha-prep` needs to be pushed:
```bash
git push origin feature/alpha-prep
```

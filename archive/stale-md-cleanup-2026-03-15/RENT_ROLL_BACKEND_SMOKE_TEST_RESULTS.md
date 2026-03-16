# Rent Roll Backend Smoke Test Results

**Date:** 2026-02-04
**Branch:** feature/folder-tabs

---

## Migration

- [x] PASS
- Table created: yes (`extraction_commit_snapshot` exists in `landscape` schema)
- Error (if any): None

---

## Test 1: PlaceholderDetector

- [x] PASS
- Test 1a (placeholder detection): PASS - `placeholder_detected: True`, `placeholder_fields: ['lease_start']`
- Test 1b (varied dates): PASS - `placeholder_detected: False`
- Test 1c (null dates): PASS - `lease_start pattern: 'all_null'`

---

## Test 2: Test Data

- Projects with units: [7, 9, 54, 70, 17]
- Projects with staged rent_roll extractions: [] (none)
- Projects with both (ideal for testing): {} (empty set)
- **Fallback:** Project 7 with 4 units

**Note:** No staged `rent_roll` extractions exist in `ai_extraction_staging` table. This means full end-to-end commit testing is not possible without first running extraction.

---

## Test 3/4: Compare Endpoint

- [x] PASS
- HTTP Status: 400 (expected - document_id required)
- Response valid JSON: yes
- Function exists: `compare_rent_roll` at `extraction_views.py:971`
- URL registered: yes (`projects/<int:project_id>/rent-roll/compare/`)
- Error response (expected): `{"success": false, "error": "document_id is required"}`

**Note:** Endpoint correctly validates input. Full functional test blocked by lack of staged rent_roll data.

---

## Test 5: Commit Endpoint

- [ ] **PARTIAL FAIL** - URL not registered
- View function exists: yes (`apply_extractions` at `extraction_views.py:196`)
- Internal function exists: yes (`commit_staging_data_internal` at `documents/views.py:365`)
- Snapshot model exists: yes (`ExtractionCommitSnapshot`)
- Snapshot table fields: `['snapshot_id', 'project', 'document', 'scope', 'committed_at', 'committed_by', 'snapshot_data', 'changes_applied', 'is_active', 'rolled_back_at']`

**ISSUE:** The `apply_extractions` function exists but is **NOT registered** in `apps/knowledge/urls.py`. The expected URL `projects/<int:project_id>/extractions/apply/` is missing.

---

## Test 6: Rollback Endpoint

- [x] PASS
- View function exists: yes (`rollback_rent_roll_commit` at `extraction_views.py:1185`)
- URL registered: yes (`projects/<int:project_id>/rollback/<int:snapshot_id>/`)
- Error (if any): None

---

## Overall Result

- [ ] ALL PASS — Ready for Prompt B (Frontend)
- [x] **SOME FAILURES — Fixes needed before frontend**

---

## Fixes Needed

### 1. Missing URL Registration for Apply Endpoint (BLOCKING)

**Location:** `backend/apps/knowledge/urls.py`

**Fix:** Add the following line after line 22 (bulk-validate):

```python
path('projects/<int:project_id>/extractions/apply/', extraction_views.apply_extractions, name='knowledge-extractions-apply'),
```

**Severity:** BLOCKING - Frontend cannot call `/api/projects/<id>/extractions/apply/` without this URL.

### 2. No Test Data Available (NON-BLOCKING)

No staged `rent_roll` extractions exist in the database. While the endpoints can be verified structurally, full end-to-end testing requires:
- Running document extraction first to populate `ai_extraction_staging`
- Or manually inserting test data

---

## Summary Table

| Component | Status | Notes |
|-----------|--------|-------|
| Migration | PASS | `extraction_commit_snapshot` table created |
| PlaceholderDetector | PASS | All 3 sub-tests pass |
| Compare Endpoint | PASS | Function + URL registered |
| Apply/Commit Endpoint | **FAIL** | Function exists, **URL NOT registered** |
| Rollback Endpoint | PASS | Function + URL registered |
| Internal commit function | PASS | `commit_staging_data_internal` exists |
| Snapshot model | PASS | All fields present |

---

## Recommended Next Steps

1. **Add missing URL registration** (trivial fix - 1 line)
2. Re-run smoke test to verify
3. Then proceed to Prompt B (Frontend)

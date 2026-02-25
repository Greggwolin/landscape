# TEST: Analysis Draft — Schema, Model, and API

**Date:** 2026-02-25
**Prereqs:** Migration applied, Django server running on port 8000

---

## Test 1: Table Exists

```bash
psql $DATABASE_URL -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='landscape' AND table_name='tbl_analysis_draft' ORDER BY ordinal_position;"
```

**Expected:** 20+ columns including draft_id, user_id, draft_name, property_type, perspective, purpose, value_add_enabled, inputs, calc_snapshot, address, city, state, zip_code, latitude, longitude, chat_thread_id, converted_project_id, status, created_at, updated_at.

---

## Test 2: Constraints Exist

```bash
psql $DATABASE_URL -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'landscape.tbl_analysis_draft'::regclass ORDER BY conname;"
```

**Expected:** Constraints for chk_draft_status, chk_draft_perspective, chk_draft_purpose, chk_draft_property_type, plus primary key.

---

## Test 3: Indexes Exist

```bash
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE schemaname='landscape' AND tablename='tbl_analysis_draft' ORDER BY indexname;"
```

**Expected:** idx_draft_user_status, idx_draft_updated, idx_draft_inputs, plus primary key index.

---

## Test 4: Django Model Import

```bash
cd backend && python manage.py shell -c "from apps.projects.models import AnalysisDraft; print(f'Model OK: {AnalysisDraft._meta.db_table}')"
```

**Expected:** `Model OK: tbl_analysis_draft`

---

## Test 5: Django Check

```bash
cd backend && python manage.py check --database default
```

**Expected:** `System check identified no issues.`

---

## Test 6: Create Draft via API

```bash
# Get auth token first (adjust credentials as needed)
TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))")

# Create a draft
curl -s -X POST http://localhost:8000/api/drafts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draft_name": "Test - 8700 E Camelback",
    "property_type": "MF",
    "perspective": "INVESTMENT",
    "purpose": "UNDERWRITING",
    "address": "8700 E. Camelback Road",
    "city": "Scottsdale",
    "state": "AZ",
    "inputs": {
      "unit_count": 100,
      "avg_sf": 1050,
      "avg_monthly_rent": 1500,
      "vacancy_pct": 5.0,
      "going_in_cap": 5.0
    }
  }' | python3 -m json.tool
```

**Expected:** JSON response with draft_id, status "active", all input fields populated.

Save the draft_id for subsequent tests. Example: `DRAFT_ID=1`

---

## Test 7: List Drafts

```bash
curl -s http://localhost:8000/api/drafts/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** Array containing the draft created in Test 6. Only active drafts shown.

---

## Test 8: Get Single Draft

```bash
curl -s http://localhost:8000/api/drafts/$DRAFT_ID/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** Full draft object with all fields.

---

## Test 9: Update Draft (PATCH)

```bash
curl -s -X PATCH http://localhost:8000/api/drafts/$DRAFT_ID/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "unit_count": 100,
      "avg_sf": 1050,
      "avg_monthly_rent": 1500,
      "vacancy_pct": 5.0,
      "going_in_cap": 5.0,
      "ltv": 60,
      "debt_rate": 7.30,
      "loan_term_years": 7,
      "amortization_years": 20
    },
    "calc_snapshot": {
      "pgi": 1800000,
      "egi": 1710000,
      "noi": 965000,
      "value_at_cap": 19300000
    }
  }' | python3 -m json.tool
```

**Expected:** Updated draft with new inputs and calc_snapshot. updated_at should be more recent than created_at.

---

## Test 10: Archive Draft

```bash
curl -s -X POST http://localhost:8000/api/drafts/$DRAFT_ID/archive/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** Draft with status "archived".

---

## Test 11: Archived Draft Not in Default List

```bash
curl -s http://localhost:8000/api/drafts/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** Empty array (or no draft with the archived ID).

---

## Test 12: Can List Archived Drafts

```bash
curl -s "http://localhost:8000/api/drafts/?status=archived" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** Array containing the archived draft.

---

## Test 13: Convert Placeholder

```bash
# Create a fresh active draft for this test
NEW_DRAFT=$(curl -s -X POST http://localhost:8000/api/drafts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft_name": "Convert Test", "property_type": "MF"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('draft_id',''))")

curl -s -X POST http://localhost:8000/api/drafts/$NEW_DRAFT/convert/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** 501 response with message indicating Phase 4 implementation pending.

---

## Test 14: Validation — Bad Perspective

```bash
curl -s -X POST http://localhost:8000/api/drafts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draft_name": "Bad Perspective", "perspective": "INVALID"}' | python3 -m json.tool
```

**Expected:** 400 error with validation message about perspective.

---

## Test 15: Validation — Bad Status via DB

```bash
psql $DATABASE_URL -c "INSERT INTO landscape.tbl_analysis_draft (user_id, status, inputs) VALUES (1, 'bogus', '{}');"
```

**Expected:** CHECK constraint violation on chk_draft_status.

---

## Test 16: Draft Limit Check (informational)

```bash
psql $DATABASE_URL -c "SELECT user_id, COUNT(*) as draft_count FROM landscape.tbl_analysis_draft WHERE status='active' GROUP BY user_id;"
```

**Expected:** Shows count per user. Future enforcement: cap at 10 active drafts per user (application-level, not DB constraint).

---

## Cleanup

```bash
psql $DATABASE_URL -c "DELETE FROM landscape.tbl_analysis_draft WHERE draft_name LIKE 'Test%' OR draft_name LIKE 'Convert%' OR draft_name LIKE 'Bad%';"
```

---

## Summary

| Test | What                            | Pass? |
|------|---------------------------------|-------|
| 1    | Table columns exist             | [ ]   |
| 2    | CHECK constraints               | [ ]   |
| 3    | Indexes                         | [ ]   |
| 4    | Django model import             | [ ]   |
| 5    | Django check                    | [ ]   |
| 6    | Create draft                    | [ ]   |
| 7    | List drafts                     | [ ]   |
| 8    | Get single draft                | [ ]   |
| 9    | Update draft (PATCH)            | [ ]   |
| 10   | Archive draft                   | [ ]   |
| 11   | Archived not in default list    | [ ]   |
| 12   | List archived                   | [ ]   |
| 13   | Convert placeholder (501)       | [ ]   |
| 14   | Bad perspective validation      | [ ]   |
| 15   | Bad status DB constraint        | [ ]   |
| 16   | Draft count per user            | [ ]   |

---

## VERIFICATION (for CC after implementation)

```bash
# Migration applied
cd backend && python manage.py showmigrations projects | tail -5

# Model import
cd backend && python manage.py shell -c "from apps.projects.models import AnalysisDraft; print('OK')"

# Serializer import
cd backend && python manage.py shell -c "from apps.projects.serializers import AnalysisDraftSerializer; print('OK')"

# URL resolution
cd backend && python manage.py shell -c "
from django.urls import reverse
print(reverse('analysis-draft-list'))
print(reverse('analysis-draft-detail', kwargs={'draft_id': 1}))
"

# Table exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM landscape.tbl_analysis_draft;"
```

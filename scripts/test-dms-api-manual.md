# DMS Step 2 API Testing Guide

## Prerequisites

1. Start the dev server:
```bash
cd /Users/5150east/landscape
npm run dev
```

2. Verify server is running at http://localhost:3007

---

## Test 1: Valid Document Creation (201 Created)

### Request:
```bash
curl -X POST http://localhost:3007/api/dms/docs \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "workspace_id": 1,
      "doc_name": "test-contract-001.pdf",
      "doc_type": "contract",
      "discipline": "legal",
      "storage_uri": "https://uploadthing.com/f/test-001.pdf",
      "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "mime_type": "application/pdf",
      "file_size_bytes": 102400,
      "version_no": 1,
      "uploaded_by": 42
    },
    "profile": {
      "description": "Master service agreement",
      "contract_value": 500000,
      "priority": "High"
    },
    "ai": {
      "source": "manual_upload",
      "raw": {
        "extracted_text": "Sample extracted text..."
      }
    }
  }'
```

### Expected Response (201):
```json
{
  "success": true,
  "duplicate": false,
  "doc": {
    "doc_id": 123,
    "version_no": 1,
    "doc_name": "test-contract-001.pdf",
    "status": "draft",
    "created_at": "2025-10-07T..."
  }
}
```

### Verification:
```sql
-- Check core_doc
SELECT doc_id, doc_name, sha256_hash, profile_json
FROM landscape.core_doc
WHERE sha256_hash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

-- Check ai_ingestion_history
SELECT ingestion_id, project_id, package_name, documents, created_at
FROM landscape.ai_ingestion_history
ORDER BY created_at DESC
LIMIT 1;
```

---

## Test 2: Duplicate Detection (200 OK)

### Request (same SHA256 + project_id):
```bash
curl -X POST http://localhost:3007/api/dms/docs \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "workspace_id": 1,
      "doc_name": "test-contract-001-duplicate.pdf",
      "doc_type": "contract",
      "storage_uri": "https://uploadthing.com/f/test-001-dup.pdf",
      "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "mime_type": "application/pdf",
      "file_size_bytes": 102400
    }
  }'
```

### Expected Response (200):
```json
{
  "success": true,
  "duplicate": true,
  "doc": {
    "doc_id": 123,
    "version_no": 1,
    "doc_name": "test-contract-001.pdf",
    "status": "draft",
    "created_at": "2025-10-07T..."
  }
}
```

**Verification:** Same `doc_id` returned as Test 1, no new row created.

---

## Test 3: Validation Error - Missing Required Fields (400)

### Request:
```bash
curl -X POST http://localhost:3007/api/dms/docs \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "doc_name": "invalid-doc.pdf"
    }
  }'
```

### Expected Response (400):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["system", "storage_uri"],
      "message": "Required"
    },
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["system", "sha256"],
      "message": "Required"
    }
  ]
}
```

---

## Test 4: Validation Error - Invalid SHA256 Length (400)

### Request:
```bash
curl -X POST http://localhost:3007/api/dms/docs \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "project_id": 1,
      "workspace_id": 1,
      "doc_name": "invalid-hash.pdf",
      "doc_type": "general",
      "storage_uri": "https://uploadthing.com/f/test.pdf",
      "sha256": "tooshort",
      "mime_type": "application/pdf",
      "file_size_bytes": 1024
    }
  }'
```

### Expected Response (400):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 64,
      "type": "string",
      "inclusive": true,
      "exact": true,
      "message": "String must contain exactly 64 character(s)",
      "path": ["system", "sha256"]
    }
  ]
}
```

---

## Test 5: GET Documents List

### Request:
```bash
curl "http://localhost:3007/api/dms/docs?project_id=1&limit=10"
```

### Expected Response (200):
```json
{
  "success": true,
  "docs": [
    {
      "doc_id": 123,
      "project_id": 1,
      "doc_name": "test-contract-001.pdf",
      "doc_type": "contract",
      "status": "draft",
      "storage_uri": "https://uploadthing.com/f/test-001.pdf",
      "profile_json": {
        "description": "Master service agreement",
        "contract_value": 500000,
        "priority": "High"
      },
      "created_at": "2025-10-07T...",
      "project_name": "Project Name"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 1
  }
}
```

---

## Test 6: UploadThing Integration

### Upload a file via UI:
1. Navigate to http://localhost:3007/dms/upload
2. Drag a PDF file into the dropzone
3. Check browser console for UploadThing response:

```javascript
{
  storage_uri: "https://uploadthing.com/f/abc123.pdf",
  sha256: "abcdef1234567890...",
  doc_name: "myfile.pdf",
  mime_type: "application/pdf",
  file_size_bytes: 204800,
  project_id: 1,
  workspace_id: 1,
  doc_type: "general"
}
```

4. Client should then call `POST /api/dms/docs` with this data

---

## Database Verification Queries

### Check all test documents:
```sql
SELECT
  d.doc_id,
  d.doc_name,
  d.doc_type,
  d.status,
  d.sha256_hash,
  d.profile_json,
  d.created_at
FROM landscape.core_doc d
WHERE d.doc_name LIKE 'test-%'
ORDER BY d.created_at DESC;
```

### Check ingestion history:
```sql
SELECT
  ih.ingestion_id,
  ih.project_id,
  ih.package_name,
  ih.documents,
  ih.ai_analysis,
  ih.created_at
FROM landscape.ai_ingestion_history ih
ORDER BY ih.created_at DESC
LIMIT 5;
```

### Verify no duplicates:
```sql
SELECT
  sha256_hash,
  COUNT(*) as count,
  STRING_AGG(doc_id::text, ', ') as doc_ids
FROM landscape.core_doc
GROUP BY sha256_hash, project_id
HAVING COUNT(*) > 1;
```

Expected: 0 rows (no duplicates)

---

## Success Criteria

✅ Test 1: Document created with `201 Created`, `doc_id` returned
✅ Test 2: Duplicate detected with `200 OK`, same `doc_id` returned
✅ Test 3: Validation error with `400 Bad Request`, details provided
✅ Test 4: SHA256 validation error with `400 Bad Request`
✅ Test 5: Document list returns with filters
✅ Test 6: UploadThing returns `sha256` and `storage_uri`
✅ Database: `core_doc` row created with correct `profile_json`
✅ Database: `ai_ingestion_history` entry created with `doc_ids` array

---

## Cleanup

To remove test data:
```sql
DELETE FROM landscape.ai_ingestion_history
WHERE documents::text LIKE '%test-%';

DELETE FROM landscape.core_doc
WHERE doc_name LIKE 'test-%';
```

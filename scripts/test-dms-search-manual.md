# DMS Step 3 Search API Testing Guide

## Prerequisites

1. Start the dev server:
```bash
cd /Users/5150east/landscape
npm run dev
```

2. Verify server is running at http://localhost:3007

3. Ensure you have test documents in the database (from Step 2)

---

## Part 1: Indexing Operations

### Test 1: Initialize Meilisearch Index

Initialize the Meilisearch index with proper configuration:

```bash
curl -X POST http://localhost:3007/api/dms/index \
  -H "Content-Type: application/json" \
  -d '{"action": "init_index"}'
```

**Expected Response (200):**
```json
{
  "success": true,
  "action": "init_index"
}
```

---

### Test 2: Full Reindex

Sync all documents to Meilisearch and refresh materialized view:

```bash
curl -X POST http://localhost:3007/api/dms/index \
  -H "Content-Type: application/json" \
  -d '{"action": "reindex"}'
```

**Expected Response (200):**
```json
{
  "success": true,
  "action": "reindex",
  "meiliCount": 27
}
```

---

### Test 3: Refresh Materialized View Only

Refresh the `mv_doc_search` materialized view:

```bash
curl -X POST http://localhost:3007/api/dms/index \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh_mv"}'
```

**Expected Response (200):**
```json
{
  "success": true,
  "action": "refresh_mv"
}
```

---

### Test 4: Incremental Sync

Sync only documents updated in the last 24 hours:

```bash
curl -X POST http://localhost:3007/api/dms/index \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sync",
    "filters": {
      "sinceDate": "2025-10-06T00:00:00Z"
    }
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "action": "sync",
  "documentsIndexed": 5
}
```

---

### Test 5: Get Index Statistics

Get Meilisearch health and statistics:

```bash
curl http://localhost:3007/api/dms/index
```

**Expected Response (200):**
```json
{
  "success": true,
  "stats": {
    "health": { "status": "available" },
    "docsIndex": {
      "numberOfDocuments": 27,
      "isIndexing": false
    }
  }
}
```

**Note:** If Meilisearch is not running, you'll get a 503 error. This is expected in database-only mode.

---

## Part 2: Search API (POST)

### Test 6: Empty Search (All Documents)

Retrieve all documents with database fallback:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "hits": [
    {
      "doc_id": 123,
      "doc_name": "test-contract-001.pdf",
      "doc_type": "contract",
      "status": "draft",
      "project_name": "Project Name",
      "searchable_text": "..."
    }
  ],
  "totalHits": 27,
  "facetDistribution": {},
  "source": "database",
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 10,
    "totalHits": 27
  }
}
```

---

### Test 7: Text Search

Search for documents containing "contract":

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "contract",
    "limit": 20,
    "useDatabaseFallback": true
  }'
```

**Expected:** Documents with "contract" in `searchable_text` or `doc_name`

---

### Test 8: Filter by Project

Search documents for a specific project:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "project_id": 1
    },
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected:** Only documents with `project_id = 1`

---

### Test 9: Filter by Document Type

Search for contracts only:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "doc_type": "contract"
    },
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected:** Only documents with `doc_type = 'contract'`

---

### Test 10: Filter by Status

Search for draft documents:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "status": "draft"
    },
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected:** Only documents with `status = 'draft'`

---

### Test 11: Combined Filters

Search with multiple filters:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "agreement",
    "filters": {
      "project_id": 1,
      "doc_type": "contract",
      "status": "draft"
    },
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected:** Documents matching all criteria

---

### Test 12: Search with Facets

Get facet counts for aggregations:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "facets": ["doc_type", "status", "discipline", "project_name"],
    "limit": 5,
    "useDatabaseFallback": true
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "hits": [...],
  "totalHits": 27,
  "facetDistribution": {
    "doc_type": {
      "contract": 15,
      "general": 10,
      "report": 2
    },
    "status": {
      "draft": 20,
      "indexed": 7
    },
    "discipline": {
      "legal": 15,
      "engineering": 5
    },
    "project_name": {
      "Project Alpha": 12,
      "Project Beta": 15
    }
  },
  "source": "database",
  "pagination": {...}
}
```

---

### Test 13: Pagination

Test pagination with offset:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "limit": 5,
    "offset": 5,
    "useDatabaseFallback": true
  }'
```

**Expected:** Documents 6-10 (skipping first 5)

---

### Test 14: Date Range Filter

Filter by document date:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "doc_date_from": "2025-01-01",
      "doc_date_to": "2025-12-31"
    },
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected:** Documents with `profile_json.doc_date` in 2025

---

### Test 15: Contract Value Range

Filter by contract value:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "contract_value_min": 100000,
      "contract_value_max": 1000000
    },
    "limit": 10,
    "useDatabaseFallback": true
  }'
```

**Expected:** Documents with `profile_json.contract_value` between $100k-$1M

---

### Test 16: Validation Error

Test Zod validation with invalid limit:

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 1000
  }'
```

**Expected Response (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_big",
      "maximum": 100,
      "path": ["limit"],
      "message": "Number must be less than or equal to 100"
    }
  ]
}
```

---

## Part 3: Search API (GET - Legacy)

### Test 17: GET Search with Query

Legacy GET endpoint with query string:

```bash
curl "http://localhost:3007/api/dms/search?q=contract&limit=10"
```

**Expected Response (200):**
```json
{
  "success": true,
  "hits": [...],
  "totalHits": 15,
  "source": "database",
  "pagination": {...}
}
```

---

### Test 18: GET Search with Filters

Legacy GET with multiple filters:

```bash
curl "http://localhost:3007/api/dms/search?project_id=1&doc_type=contract&status=draft&limit=10"
```

**Expected:** Filtered results via URL params

---

## Part 4: Cron Job Testing

### Test 19: Get Cron Job Status

Check cron job configuration:

```bash
curl http://localhost:3007/api/cron/dms-sync
```

**Expected Response (200):**
```json
{
  "job": "dms-sync",
  "schedule": "Hourly",
  "description": "Syncs DMS documents to Meilisearch and refreshes materialized view",
  "configured": false
}
```

---

### Test 20: Trigger Cron Sync (Development)

Manually trigger the cron job:

```bash
curl -X POST http://localhost:3007/api/cron/dms-sync
```

**Expected Response (200):**
```json
{
  "success": true,
  "documentsIndexed": 5,
  "durationMs": 234,
  "sinceDate": "2025-10-07T08:00:00Z"
}
```

**Note:** In production, this requires `Authorization: Bearer <CRON_SECRET>` header.

---

## Part 5: Meilisearch Testing (Optional)

If Meilisearch is running, test without `useDatabaseFallback`:

### Test 21: Meilisearch Search

```bash
curl -X POST http://localhost:3007/api/dms/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "contract agreement",
    "filters": {
      "project_id": 1
    },
    "facets": ["doc_type", "status"],
    "limit": 10
  }'
```

**Expected:** Fast search results with relevance ranking from Meilisearch

**Check source:**
```json
{
  "source": "meilisearch",
  "processingTimeMs": 5
}
```

---

## Database Verification

### Check Materialized View

```sql
SELECT COUNT(*)
FROM landscape.mv_doc_search;
```

Expected: Same count as `core_doc` WHERE status != 'archived'

### Check Indexed Documents

```sql
SELECT
  doc_id,
  doc_name,
  doc_type,
  status,
  searchable_text,
  project_name
FROM landscape.mv_doc_search
WHERE searchable_text ILIKE '%contract%'
LIMIT 10;
```

### Check Facet Counts

```sql
SELECT doc_type, COUNT(*) as count
FROM landscape.mv_doc_search
GROUP BY doc_type
ORDER BY count DESC;
```

---

## Success Criteria

✅ All indexing operations complete without errors
✅ Full reindex syncs all documents to Meilisearch
✅ Materialized view refresh succeeds
✅ POST search returns filtered results with facets
✅ GET search (legacy) works with URL params
✅ Validation errors return 400 with details
✅ Database fallback works when Meilisearch unavailable
✅ Pagination returns correct offset results
✅ Facets return accurate counts
✅ Cron job triggers successfully

---

## Cleanup

To remove test data:

```sql
DELETE FROM landscape.core_doc
WHERE doc_name LIKE 'test-%';

REFRESH MATERIALIZED VIEW landscape.mv_doc_search;
```

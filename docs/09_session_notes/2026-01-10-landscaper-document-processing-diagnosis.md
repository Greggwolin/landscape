# Landscaper Document Processing Diagnosis

**Investigated:** 2026-01-10
**Status:** ✅ **FIXED** - Sync processing now triggered on upload
**Chat ID Reference:** QT-02, QT-04

---

## Fix Applied (2026-01-10)

Added automatic sync processing trigger to all document upload paths:

1. **Next.js route** (`src/app/api/dms/docs/route.ts`):
   - Fire-and-forget call to `POST /api/knowledge/documents/{doc_id}/process/`
   - Runs in parallel with response, doesn't block upload

2. **Django upload endpoint** (`backend/apps/documents/views.py:upload_document`):
   - Direct call to `processor.process_document(doc_id)`
   - Synchronous but non-blocking on failure

3. **Django version upload** (`backend/apps/documents/views.py:upload_new_version`):
   - Same sync processing trigger for document updates

4. **Embedding storage fix** (`backend/apps/knowledge/services/embedding_storage.py`):
   - Fixed `store_embedding()` to use raw SQL instead of Django ORM
   - Django model didn't have the pgvector `embedding` field defined
   - Database column exists but ORM can't handle vector types natively

---

## Context

User reports that Landscaper is not processing uploaded documents. A rent roll was uploaded for Vincent Village project, upload succeeded, but content extraction never completes. Landscaper responds with "document is still being processed" indefinitely.

Last known handoff (Dec 15, 2025) noted: "Need to wire upload to call sync processing" — suggesting the processing endpoint exists but wasn't being triggered post-upload.

---

## 1. Current Architecture

### Upload Flow (Working)

```
Frontend (Dropzone.tsx)
    ↓ startUpload() via UploadThing
    ↓
POST /api/dms/docs (Next.js route.ts)
    ↓ Creates core_doc record
    ↓ Creates dms_extract_queue record with status='pending'
    ↓ Returns {doc_id, processing: {status: 'queued', queue_id}}
```

**This part works correctly.** Documents are being uploaded and queued.

### Processing Pipeline (Two Separate Systems)

The codebase has **TWO processing pipelines** that don't communicate:

#### Pipeline A: DMSExtractQueue (Rent Roll Extraction)
- Table: `landscape.dms_extract_queue`
- Worker: `backend/services/extraction/extraction_worker.py`
- Purpose: Extract structured rent roll data → assertions
- **NOT RUNNING** - requires manual execution

#### Pipeline B: doc_processing_queue (RAG Embeddings)
- Table: `landscape.doc_processing_queue`
- Worker: `python manage.py process_documents`
- Purpose: Text extraction → chunking → embeddings for RAG
- **NOT RUNNING** - requires manual execution or cron job

---

## 2. The Gap: No Automatic Processing Trigger

### What SHOULD happen after upload:
```
POST /api/dms/docs completes
    ↓ (missing step)
POST /api/knowledge/documents/{doc_id}/process/  ← NEVER CALLED
```

### What ACTUALLY happens:
1. Upload succeeds ✓
2. Document record created in `core_doc` ✓
3. Queue entry created in `dms_extract_queue` ✓
4. **Nobody processes the queue** ✗

### Evidence from Code:

**backend/apps/knowledge/signals.py** - The auto-queue signal is **commented out**:
```python
# Django signal handler (if you have a CoreDoc Django model)
# Uncomment and adapt if using Django models for core_doc
#
# @receiver(post_save, sender=CoreDoc)
# def on_document_created(sender, instance, created, **kwargs):
#     """Auto-queue newly created documents for processing."""
#     if created and instance.storage_uri:
#         auto_queue_document(instance.doc_id, instance.project_id)
```

**src/app/api/dms/docs/route.ts:151-198** - Queues for extraction but never triggers sync processing:
```typescript
// Queue document for extraction (creates DMSExtractQueue job)
// Background worker will process it and create assertions/embeddings
// ← Comment says "background worker" but no worker is running!
```

### No Background Workers Running:
```bash
ps aux | grep -E "(celery|worker|queue)" | grep -v grep
# Returns: Only VS Code renderer processes (false matches)
```

---

## 3. Available Processing Endpoints

### Sync Processing (READY TO USE)
```
POST /api/knowledge/documents/{doc_id}/process/
```
- Located: `backend/apps/knowledge/views/status_views.py:336-385`
- Action: Synchronous processing - blocks until complete
- Pipeline: extract text → chunk → embed → update status to 'ready'

### Queue Processing (REQUIRES WORKER)
```bash
cd backend
./venv/bin/python manage.py process_documents --continuous
```
- Located: `backend/apps/knowledge/management/commands/process_documents.py`
- Processes `doc_processing_queue` table

### DMSExtractQueue Processing (REQUIRES WORKER)
```python
from backend.services.extraction.extraction_worker import process_extraction_queue
process_extraction_queue()  # Processes 5 items at a time
```

---

## 4. Recommended Fixes

### Fix A: Wire Upload to Sync Processing (Quick Fix)

Modify `src/app/api/dms/docs/route.ts` to call sync processing after creating the document:

```typescript
// After line 149 (after creating doc record and queue entry):

// Trigger synchronous processing immediately
try {
  const processResponse = await fetch(
    `${process.env.DJANGO_API_URL || 'http://localhost:8000'}/api/knowledge/documents/${doc.doc_id}/process/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } }
  );

  if (processResponse.ok) {
    const processResult = await processResponse.json();
    processing.status = processResult.status;
    processing.embeddings_created = processResult.embeddings_created;
  }
} catch (processError) {
  console.warn(`Document processing failed (will retry): ${processError}`);
  // Don't fail the upload - document can be processed later
}
```

### Fix B: Run Background Worker (Production Fix)

Add to systemd or PM2:
```bash
cd /path/to/landscape/backend
./venv/bin/python manage.py process_documents --continuous --interval 10
```

Or cron job:
```bash
* * * * * cd /path/to/backend && ./venv/bin/python manage.py process_documents
```

### Fix C: Enable Django Signal (Cleanest Fix)

In `backend/apps/knowledge/signals.py`, uncomment and wire up the signal to trigger processing.

---

## 5. Quick Workaround: Process Stuck Documents NOW

### Option 1: Process single document via API
```bash
curl -X POST http://localhost:8000/api/knowledge/documents/DOC_ID/process/
```

### Option 2: Process all queued documents
```bash
cd backend
./venv/bin/python manage.py process_documents --batch-size 50
```

### Option 3: Check queue status first
```bash
cd backend
./venv/bin/python manage.py process_documents --stats
```

### Option 4: Reprocess failed documents for a project
```bash
curl -X POST http://localhost:8000/api/knowledge/projects/PROJECT_ID/reprocess-failed/
```

---

## 6. Database Status Columns

**`core_doc` table columns for tracking:**
- `processing_status`: pending|queued|extracting|chunking|embedding|ready|failed|skipped
- `processing_started_at`: timestamp when processing began
- `processing_completed_at`: timestamp when finished
- `processing_error`: error message if failed
- `chunks_count`: number of chunks created
- `embeddings_count`: number of embeddings created

**To check stuck documents:**
```sql
SELECT doc_id, doc_name, processing_status, created_at
FROM landscape.core_doc
WHERE processing_status IN ('pending', 'queued', 'extracting')
ORDER BY created_at DESC;
```

---

## Summary

| Component | Status | Fix Required |
|-----------|--------|--------------|
| Upload (frontend) | ✓ Working | None |
| Document record creation | ✓ Working | None |
| Queue entry creation | ✓ Working | None |
| Sync processing endpoint | ✓ Available | Wire to upload flow |
| Background worker | ✗ Not running | Start worker or use sync |
| Django signal | ✗ Commented out | Uncomment if using Django models |

**Root Cause:** Documents are queued but never processed because no worker is running AND the sync endpoint isn't called automatically after upload.

---

## Key Files Referenced

- `src/components/dms/upload/Dropzone.tsx` - Frontend upload component
- `src/app/api/dms/docs/route.ts` - Document creation API (lines 151-198)
- `backend/apps/knowledge/signals.py` - Commented-out auto-processing signal
- `backend/apps/knowledge/views/status_views.py` - Sync processing endpoint (line 336)
- `backend/apps/knowledge/services/document_processor.py` - Processing pipeline
- `backend/apps/knowledge/management/commands/process_documents.py` - Background worker command
- `backend/services/extraction/extraction_worker.py` - DMSExtractQueue worker

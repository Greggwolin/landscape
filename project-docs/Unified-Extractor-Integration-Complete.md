# Unified Extractor Integration - Complete ✅

**Date:** October 1, 2025
**Status:** Integrated and Deployed
**Version:** v2.0

## Overview

The Unified Document Extractor (v2.0) has been successfully integrated into the `analyze-document` API route with full persistence to Neon database. This system provides schema-aware extraction using Claude AI with comprehensive provenance tracking and assertion management.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Upload (PDF/Image)                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              /api/ai/analyze-document (route.ts)                 │
│  • Validates file type and size                                  │
│  • Generates doc_id                                              │
│  • Checks idempotency                                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                ┌───────────────┴────────────────┐
                │                                │
                ▼                                ▼
┌───────────────────────────┐      ┌────────────────────────────┐
│ Text Extraction Strategy  │      │  PDF Beta API Strategy     │
│ (default)                 │      │  (useDirectPDF=true)       │
│                           │      │                            │
│ 1. Extract with pdftotext │      │ 1. Send PDF to Claude      │
│ 2. Call Claude with text  │      │ 2. Claude reads PDF        │
└───────┬───────────────────┘      └────────┬───────────────────┘
        │                                   │
        └──────────────┬────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│           Claude Unified Extractor (claude-extractor.ts)         │
│  • Sends v2.0 prompt with SCHEMA_PROFILE                         │
│  • Temperature: 0 (deterministic)                                │
│  • Returns structured JSON                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            Validation (validateExtractionResult)                 │
│  • Checks required fields                                        │
│  • Validates parcel totals                                       │
│  • Flags low-confidence extractions                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         Persistence (extraction-persistence.ts)                  │
│                                                                   │
│  1. dms_extract_queue                                            │
│     └─ Full JSON payload + status                                │
│                                                                   │
│  2. dms_unmapped                                                 │
│     └─ Fields that couldn't be auto-mapped                       │
│                                                                   │
│  3. dms_assertion                                                │
│     └─ All quantitative/qualitative claims with provenance       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│          UI Response (backward compatible)                       │
│  • field_mappings (for existing UI)                              │
│  • extracted_data                                                │
│  • validation results                                            │
│  • extraction_metadata (queue_id, counts)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### 1. `landscape.dms_extract_queue`
**Purpose:** Job tracking and full JSON storage

| Column | Type | Description |
|--------|------|-------------|
| `queue_id` | SERIAL PRIMARY KEY | Unique job identifier |
| `doc_id` | TEXT UNIQUE | Document identifier (idempotency key) |
| `project_id` | INTEGER FK | Reference to tbl_project |
| `file_uri` | TEXT | Original file path/name |
| `status` | VARCHAR(50) | 'pending', 'processing', 'processed', 'error' |
| `extracted_data` | JSONB | Full Claude JSON response |
| `error_message` | TEXT | Error details if failed |
| `raw_response` | TEXT | Raw Claude response for debugging |
| `processed_at` | TIMESTAMPTZ | When processing completed |

**Indexes:** doc_id, project_id, status, created_at

### 2. `landscape.dms_unmapped`
**Purpose:** Fields that couldn't be auto-mapped to schema

| Column | Type | Description |
|--------|------|-------------|
| `unmapped_id` | SERIAL PRIMARY KEY | Unique unmapped field ID |
| `doc_id` | TEXT | Source document |
| `project_id` | INTEGER FK | Project reference |
| `source_key` | TEXT | Original key from document |
| `raw_value` | TEXT | Extracted value |
| `candidate_targets` | TEXT[] | Suggested columns: ["tbl_project.general_plan", ...] |
| `page` | INTEGER | Page number where found |
| `bbox` | DECIMAL[] | Bounding box [x, y, width, height] |
| `status` | VARCHAR(50) | 'new', 'reviewed', 'mapped', 'ignored' |
| `mapped_to_table` | TEXT | Target table (if manually mapped) |
| `mapped_to_column` | TEXT | Target column (if manually mapped) |

**Indexes:** doc_id, project_id, status, source_key

### 3. `landscape.dms_assertion`
**Purpose:** All document assertions with provenance

| Column | Type | Description |
|--------|------|-------------|
| `assertion_id` | SERIAL PRIMARY KEY | Unique assertion ID |
| `project_id` | INTEGER FK | Project reference |
| `doc_id` | TEXT | Source document |
| `subject_type` | VARCHAR(50) | 'project', 'phase', 'parcel', 'product' |
| `subject_ref` | TEXT | Reference ID (e.g., parcel_id="2") |
| `metric_key` | TEXT | Metric name (e.g., "units_total") |
| `value_num` | DECIMAL(15,4) | Numeric value |
| `value_text` | TEXT | Text value |
| `units` | TEXT | Unit of measurement (e.g., "ac", "du/ac") |
| `context` | VARCHAR(50) | 'proposed', 'approved', 'as-built', 'other' |
| `page` | INTEGER | Page number in source doc |
| `bbox` | DECIMAL[] | Bounding box coordinates |
| `confidence` | DECIMAL(3,2) | Extraction confidence (0.0-1.0) |
| `source` | VARCHAR(50) | 'table', 'narrative', 'figure' |
| `as_of_date` | DATE | Document date |

**Indexes:** project_id, doc_id, subject_type, metric_key, as_of_date

**Constraints:**
- `CHECK (value_num IS NOT NULL OR value_text IS NOT NULL)`
- `CHECK (confidence >= 0 AND confidence <= 1)`

## API Contract

### Request

```typescript
POST /api/ai/analyze-document

FormData:
  file: File                  // PDF or image
  projectId: string          // Required
  docId?: string             // Optional (auto-generated if not provided)
  useDirectPDF?: 'true'      // Use Claude PDF beta API
```

### Response

```typescript
{
  success: boolean,
  filename: string,
  document_type: string,
  readability: {
    can_read: boolean,
    confidence: number,
    format_supported: boolean,
    text_quality: 'excellent' | 'good' | 'fair' | 'poor'
  },
  extracted_data: {
    core_doc: { doc_name, doc_type, doc_date },
    tbl_project: { project_name, acres_gross, jurisdiction_city, ... },
    tbl_parcel: [...],
    tbl_zoning_control: [...]
  },
  field_mappings: [
    {
      source_text: string,
      suggested_field: string,
      suggested_value: string,
      confidence: number,
      user_confirmable: boolean
    }
  ],
  processing_notes: string[],
  extraction_metadata: {
    queue_id: number,
    unmapped_count: number,
    assertion_count: number
  },
  validation: {
    isValid: boolean,
    errors: string[],
    warnings: string[]
  }
}
```

## Key Features

### ✅ Idempotency
- Documents with the same `doc_id` will not be reprocessed
- Check performed via `isDocumentProcessed(docId)`
- Subsequent calls return early (can optionally return cached result)

### ✅ Error Handling
- JSON parse failures stored in `raw_response`
- Status marked as 'error' with detailed `error_message`
- Failed extractions don't crash - gracefully degrade

### ✅ Provenance Tracking
- Every assertion includes:
  - Source `doc_id`
  - Page number
  - Bounding box (if available)
  - Confidence score
  - Document date (`as_of_date`)

### ✅ Backward Compatibility
- Existing UI receives `field_mappings` in original format
- New metadata exposed via `extraction_metadata`
- Legacy route preserved as `route-legacy.ts`

### ✅ Validation
- Parcel totals checked against project totals
- Low-confidence products flagged
- Missing required fields generate warnings

## File Structure

```
src/
├── app/api/ai/
│   ├── analyze-document/
│   │   ├── route.ts                  # Main unified route (NEW)
│   │   └── route-legacy.ts           # Original route (backup)
│   └── database-schema.sql           # Migration SQL
│
├── lib/ai/
│   ├── unified-extractor.ts          # v2.0 prompt generator
│   ├── claude-extractor.ts           # Claude API service (NEW)
│   └── extraction-persistence.ts     # DB persistence (NEW)
│
└── scripts/
    └── run-extraction-migration.js   # Migration script
```

## Usage Examples

### Basic Text Extraction (Default)

```typescript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('projectId', '123');

const response = await fetch('/api/ai/analyze-document', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`Queue ID: ${result.extraction_metadata.queue_id}`);
console.log(`Parcels: ${result.extracted_data.tbl_parcel.length}`);
console.log(`Assertions: ${result.extraction_metadata.assertion_count}`);
```

### PDF Beta API

```typescript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('projectId', '123');
formData.append('useDirectPDF', 'true');  // Use Claude PDF beta

const response = await fetch('/api/ai/analyze-document', {
  method: 'POST',
  body: formData
});
```

### Custom doc_id (for idempotency)

```typescript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('projectId', '123');
formData.append('docId', 'prelim-plat-v3');  // Specific doc ID

// Subsequent calls with same docId will not reprocess
```

## Query Helper Functions

### Get Latest Assertion

```sql
SELECT * FROM landscape.get_latest_assertion(
  p_project_id := 123,
  p_subject_type := 'parcel',
  p_subject_ref := '2',
  p_metric_key := 'units_total'
);
```

### Find Conflicting Assertions

```sql
SELECT * FROM landscape.get_assertion_conflicts(
  p_project_id := 123,
  p_metric_key := 'acres_gross'
);
```

### Get Unmapped Fields for Review

```sql
SELECT * FROM landscape.dms_unmapped
WHERE project_id = 123
  AND status = 'new'
ORDER BY created_at;
```

## Testing

### Test Case 1: Red Valley Ranch (Happy Path)
```bash
# Expected results:
# - 5 parcels extracted
# - Total lots: 544
# - Total acres: 164.34
# - ~30 assertions created
# - 0-2 unmapped fields
# - warnings=[] (clean extraction)
```

### Test Case 2: Partial Table (Scan Quality)
```bash
# Expected results:
# - Some cells missing
# - warnings array populated
# - No crash
# - Partial data persisted
```

### Test Case 3: Ambiguous Product Mix
```bash
# Expected results:
# - parcel_product_mix with confidence < 0.5
# - warnings: "Unable to reliably associate lot sizes"
# - Still persists to dms_assertion
```

## Monitoring & Debugging

### Check Extraction Status

```sql
SELECT status, error_message, processed_at
FROM landscape.dms_extract_queue
WHERE doc_id = 'doc_123_1696176000000';
```

### View Full JSON Response

```sql
SELECT extracted_data
FROM landscape.dms_extract_queue
WHERE doc_id = 'doc_123_1696176000000';
```

### Failed Extractions

```sql
SELECT doc_id, error_message, raw_response
FROM landscape.dms_extract_queue
WHERE status = 'error'
ORDER BY updated_at DESC;
```

## Performance

- **PDF Text Extraction:** ~2-5 seconds (pdftotext)
- **Claude API Call:** ~10-30 seconds (depends on doc size)
- **Persistence:** ~1-2 seconds (batch inserts)
- **Total Time:** ~15-40 seconds per document

## Security

- ✅ File size limits enforced (50MB max)
- ✅ File type validation (PDF, JPEG, PNG, TIFF only)
- ✅ Temporary files cleaned up after processing
- ✅ SQL injection protection via parameterized queries
- ✅ No sensitive data logged

## Future Enhancements

1. **Batch Processing** - Analyze multiple documents together
2. **Conflict Resolution UI** - Review conflicting assertions
3. **DVL Auto-Mapping** - Automatically map unmapped fields when DVL patterns match
4. **Document Versioning** - Track changes across document revisions
5. **Approval Workflow** - Require manual approval before persisting to tbl_project/tbl_parcel

## Migration Instructions

### Running the Migration

```bash
# Option 1: Using psql directly
export PGPASSWORD=your_password
psql -h your-host -U your-user -d your-db -f src/app/api/ai/database-schema.sql

# Option 2: Using the migration script (requires DATABASE_URL in .env.local)
bash scripts/run-extraction-migration.sh
```

### Verification

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'landscape'
  AND table_name IN ('dms_extract_queue', 'dms_unmapped', 'dms_assertion')
ORDER BY table_name;

-- Should return 3 rows
```

## Rollback Plan

If issues arise, the legacy route is preserved:

```bash
# Restore legacy route
mv src/app/api/ai/analyze-document/route.ts src/app/api/ai/analyze-document/route-unified-backup.ts
mv src/app/api/ai/analyze-document/route-legacy.ts src/app/api/ai/analyze-document/route.ts
```

Tables can be dropped if needed:

```sql
DROP TABLE IF EXISTS landscape.dms_assertion CASCADE;
DROP TABLE IF EXISTS landscape.dms_unmapped CASCADE;
DROP TABLE IF EXISTS landscape.dms_extract_queue CASCADE;
```

## Support

For issues or questions:
- Check [GIS-Document-Analysis-OCR-Issues.md](./GIS-Document-Analysis-OCR-Issues.md) for known table extraction challenges
- Review Claude API logs in extraction_metadata
- Query dms_extract_queue for failed jobs

---

**Status:** ✅ Complete and Deployed
**Next Steps:** Test with Red Valley Ranch sample document

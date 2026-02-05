# Rent Roll Extraction Improvements

**Date**: February 5, 2026
**Duration**: ~4 hours
**Focus**: Field mapping interface, chunked extraction, async processing

---

## Summary

Major improvements to the rent roll extraction pipeline including async background processing, tenant name extraction fixes, field mapping enhancements, and user experience improvements for cancellation and dismissible banners.

## Major Accomplishments

### 1. Async Extraction Processing ✅

Fixed HTTP timeout issues when extracting large rent rolls by running extraction in background threads:
- Extraction now runs asynchronously via `threading.Thread`
- HTTP request returns immediately with job_id for polling
- Added single job status endpoint for targeted polling
- Frontend detects stuck jobs (>3 minutes) and shows error state

**Files:**
- `backend/apps/knowledge/views/extraction_views.py` - Async extraction logic
- `backend/apps/knowledge/urls.py` - New job status endpoint
- `src/app/api/projects/[projectId]/extraction-jobs/[jobId]/route.ts` - Frontend proxy

### 2. Tenant Name Extraction Fix ✅

Fixed issue where tenant names were being replaced with "Current Tenant" placeholder:
- Added explicit instructions to chunked extraction prompts
- Added post-processing cleanup using `extract_tenant_name()` function
- Now correctly extracts all tenant names from rent roll (102/113 units with names)

**Files:**
- `backend/apps/knowledge/services/extraction_service.py` - Prompt and cleanup logic

### 3. Field Mapping Standard Fields ✅

Added missing standard fields to column discovery and dropdown picker:
- `tenant_name` - maps "Tenant", "Resident", "Lessee" columns
- `lease_start` - maps "Lease From", "Lease Start", "Move In" columns
- `lease_end` - maps "Lease To", "Expiration", "Lease End" columns
- `move_in_date` - maps "Move In Date" columns

**Files:**
- `backend/apps/knowledge/services/column_discovery.py` - STANDARD_FIELDS dict
- `src/hooks/useFieldMapping.ts` - Frontend STANDARD_FIELDS array

### 4. Direct Excel File Parsing ✅

Fixed incomplete data extraction by reading Excel files directly instead of embeddings:
- Added `_get_document_content()` method that downloads and parses Excel/CSV
- Uses openpyxl for Excel parsing
- Now extracts all 113 units instead of partial data from embeddings

**Files:**
- `backend/apps/knowledge/services/extraction_service.py` - `_parse_excel_to_text()`, `_parse_csv_to_text()`

### 5. Cancel Extraction Feature ✅

Added ability to cancel running extraction jobs:
- Cancel button in extraction modal during processing
- Backend cleans up staged extractions on cancel
- User can retry later without leftover data

**Files:**
- `src/components/landscaper/FieldMappingInterface.tsx` - Cancel button UI
- `backend/apps/knowledge/views/extraction_views.py` - Enhanced cancel endpoint

### 6. Dismissible Extraction Banner ✅

Fixed persistent "19 changes ready for review" banner:
- Added dismissible state to success banner
- X button allows user to close banner
- Banner reappears for new extractions

**Files:**
- `src/components/landscaper/LandscaperPanel.tsx` - Dismissible alert

## Files Modified

### Backend (Django)
- `backend/apps/knowledge/views/extraction_views.py` - Async extraction, job status endpoint, cancel cleanup
- `backend/apps/knowledge/services/extraction_service.py` - Direct Excel parsing, tenant name fix
- `backend/apps/knowledge/services/column_discovery.py` - Standard fields for tenant/lease dates
- `backend/apps/knowledge/urls.py` - New job status endpoint URL

### Frontend (Next.js)
- `src/components/landscaper/FieldMappingInterface.tsx` - Cancel button, timeout detection
- `src/components/landscaper/LandscaperPanel.tsx` - Dismissible banner
- `src/hooks/useFieldMapping.ts` - Standard fields for dropdown
- `src/app/api/projects/[projectId]/extraction-jobs/[jobId]/route.ts` - New proxy route

## Technical Details

### Chunked Extraction Flow
1. User uploads rent roll Excel file
2. Column discovery parses headers and samples data
3. User maps columns to Landscape fields in modal
4. "Apply Mapping" starts async extraction job
5. Background thread runs chunked extraction (35 units/chunk)
6. Frontend polls job status endpoint every 2 seconds
7. On completion, staged data is ready for review

### Extraction Stats (Chadron Test)
- **Document**: Chadron - Rent Roll & Delinquency 09.30.2025.xlsx
- **Total Units**: 113
- **Chunks**: 4 (35 units each)
- **Processing Time**: ~30 seconds
- **Tenant Names**: 102 (11 vacant units)
- **Data Accuracy**: Exact match with database for occupied units

## Known Issues

- Django dev server auto-reload can kill background threads if files change mid-extraction
- Workaround: Changed to non-daemon thread so it survives restarts

## Next Steps

- Consider migrating to Celery for production task queue
- Add progress percentage to extraction job tracking
- Improve deduplication logic for overlapping chunks

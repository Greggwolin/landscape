# Rent Roll AI Ingestion Guide

**Status:** ✅ Production Ready (Backend + Frontend)  
**Last Updated:** October 24, 2025  
**Sessions:** GR08 + GR09

This master guide consolidates the implementation summary, quick start, testing workflow, and session notes for the AI‑powered rent roll ingestion system.

---

## 1. System Overview

- **Purpose:** Eliminate 2‑4 hours of manual rent roll entry per property by extracting unit, lease, and tenant data from Excel/CSV/PDF files using Claude AI.
- **Coverage:** Excel/CSV parsing, PDF rendering, confidence scoring, validation warnings, staging UI for review, and commit to multifamily tables.
- **Core components:**
  1. **Models:** `DMSAssertion`, `DMSExtractQueue`, `AICorrectionLog` (in `backend/apps/documents/models.py`) to store extraction jobs and learning feedback.
  2. **Extraction Services:** `rent_roll_extractor.py`, `pdf_rent_roll_extractor.py`, `document_classifier.py`, `extraction_worker.py` under `backend/services/extraction/`.
  3. **APIs:**  
     - `POST /api/dms/upload/` – accepts file uploads, queues jobs.  
     - `GET /api/dms/staging/{doc_id}/` – returns extraction status/data.  
     - `POST /api/dms/staging/{doc_id}/commit/` – writes MultifamilyUnitType/Unit/Lease rows and logs corrections.
  4. **Management Command:** `python manage.py process_extractions` for background workers.
  5. **Frontend:** `src/components/extraction/StagingModal.tsx` & `src/app/rent-roll/page.tsx` providing upload button, polling, and review modal with Summary, Unit Types, Units, and Leases tabs.

**Data extracted:**
- Property info (name, address, report date).
- Unit types (bed/bath mix, average SF, market rent).
- Units (unit number, BD/BA, SF, occupancy, Section 8/commercial flags).
- Leases (tenant, rent, dates, Section 8, status).

---

## 2. Architecture & Workflow

```
User Upload (Excel/CSV/PDF)
    ↓ POST /api/dms/upload/ → Document record + extraction queue
Background Worker (process_extractions)
    ↓ DocumentClassifier → Excel vs PDF path
RentRollExtractor / PDFRentRollExtractor
    ↓ Assertions stored in dms_assertion + job status update
Frontend polls GET /api/dms/staging/{doc_id}
    ↓ Status 202 (in progress) / 200 (data ready)
StagingModal renders summary + detailed tabs with confidence badges
    ↓ User reviews alerts and data
POST /api/dms/staging/{doc_id}/commit/
    ↓ MultifamilyUnitType/Unit/Lease rows created + AI correction log updated
Page refresh → rent roll grid populated
```

- Confidence scoring (0‑100%) per record.
- Validation alerts for high rents, missing dates, MTM leases.
- Automatic inference (e.g., missing end dates → month-to-month).
- Section 8 detection, occupancy math verification.

---

## 3. Quick Start (5 Minutes)

1. **Set Claude key**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
   ```
2. **Run services**
   ```bash
   # Terminal 1
   cd backend && python manage.py runserver

   # Terminal 2
   npm run dev
   ```
3. **Upload test file**
   - Browse to `http://localhost:3000/rent-roll`.
   - Click “Upload Rent Roll”.
   - Select `reference/multifam/chadron/Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx`.
   - Wait ~15 s for staging modal to appear.
   - Review data, then click “Approve & Commit”.
4. **Expected metrics (Excel sample):**
   - 115 units, 102 leases, ~88% occupancy, ~$449 k monthly income, 3 unit types.
5. **PDF sample:** `reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf`  
   - 113 units (108 res + 5 commercial), ~105 leases, 13 unit type variants, ~90% confidence, tenant names blank (expected).
6. **Manual worker (if needed):**
   ```bash
   cd backend
   python manage.py process_extractions
   ```

---

## 4. Detailed Testing Guide

### Prerequisites
- Backend dependencies installed (`anthropic`, `openpyxl`, `pypdf`).
- Optional SQL script executed: `backend/sql/create_ai_correction_log.sql`.
- Backend on port 8000; frontend on 3000 (or 3002 for prototype).

### Test Case 1 – Excel Upload (Chadron)
1. Navigate to `/rent-roll`, ensure project context set.
2. Upload Excel file; button shows “Processing…” while polling every 2 s.
3. **Summary tab expectations:** 115 units, 102 occupied, 13 vacant, monthly income ~$448,876, occupancy 88.7%.
4. **Alerts:** outlier rent >$10k, ~18 MTM leases lacking end date.
5. **Unit Types tab:**  
   - 1BR/1BA: 22 units, avg 750 SF, ~$1,624 rent.  
   - 2BR/2BA: 53 units, avg 1,035 SF, ~$2,136 rent.  
   - 3BR/2BA: 33 units, avg 1,280 SF, ~$2,726 rent.
6. **Units tab:** 115 records with status chips, Section 8/commercial flags, ~95% confidence.
7. **Leases tab:** 102 leases with tenant names, rents $1,384–$3,000 (plus flagged outlier), Section 8 badges.
8. Click “Approve & Commit”; verify DB:
   ```sql
   SELECT COUNT(*) FROM landscape.tbl_multifamily_unit WHERE project_id = 11;   -- expect 115
   SELECT COUNT(*) FROM landscape.tbl_multifamily_lease WHERE unit_id IN
     (SELECT unit_id FROM landscape.tbl_multifamily_unit WHERE project_id = 11); -- expect 102
   ```

### Test Case 2 – PDF Upload (Chadron OM)
1. Upload `14105 ... nopics.pdf`.
2. Expect ~20‑40 s processing (Claude handles 5 pages).
3. Summary mirrors Excel data; more granular amenity-based unit types (~13).
4. Tenant names blank (OMs), but square footage + rent ranges filled.

### Commit Workflow Assertions
- `POST /api/dms/upload/` returns `{doc_id, extract_job_id, status:'queued'}`.
- `GET /api/dms/staging/{doc_id}/` returns `202` until job ready → `200` with summary + arrays.
- `POST /api/dms/staging/{doc_id}/commit/` writes multifamily tables and logs corrections (use DB queries above).

---

## 5. Troubleshooting & Known Fixes

- **Header detection failing (Excel)** → `rent_roll_extractor.py` now scans rows 0‑11; ensure newest version deployed.
- **NaN JSON serialization** → `clean_nan()` in `extraction_worker.py` and staging view removes NaNs before writing JSON.
- **Staging API NaN error** → same cleaning applied server-side; confirm environment uses updated code.
- **Model mismatches** (`queued_at`, status mismatch) → ensure migrations applied; fields renamed to `created_at`, `processed_at`, status values `pending|processing|completed`.
- **Missing project IDs** → `_store_assertions` requires `project_id` parameter; confirm upload request passes it.
- **CORS/auth errors** → add front-end origin to `CORS_ALLOWED_ORIGINS` and allow anonymous access via `@permission_classes([AllowAny])`.
- **DRF pagination** → Frontend helpers unwrap `.results` before mapping to arrays.

---

## 6. Session GR09 Highlights

- Resolved two critical blockers:
  1. **Header detection** search expanded to capture Excel tables starting after row 6.
  2. **NaN serialization** cleaned across worker + staging view preventing JSON/DB errors.
- Added additional robustness:
  - Corrected DMS queue statuses/fields, added attempt counters.
  - Set FK relationships for assertions to retain `project_id`.
  - Configured permissions and CORS for local testing.
  - Verified API endpoints manually (upload/staging/commit) with sample responses.

---

## 7. File Map & References

- **Backend:** `backend/services/extraction/*`, `backend/apps/documents/*`, `backend/apps/documents/management/commands/process_extractions.py`, `backend/sql/create_ai_correction_log.sql`.
- **Frontend:** `src/components/extraction/StagingModal.tsx`, `src/app/rent-roll/page.tsx`.
- **Documentation:** this guide supersedes `rent-roll-ingestion-implementation-summary.md`, `rent-roll-ingestion-COMPLETE.md`, `rent-roll-ingestion-testing-guide.md`, `rent-roll-ingestion-quick-start.md`, and `rent-roll-ingestion-session-GR09-complete.md` (archived).

---

## 8. Future Enhancements

- Wire AI correction feedback loop to auto-tune extraction prompts.
- Add UI editing controls in staging modal (per-field overrides before commit).
- Build automated regression tests for uploads, staging API, and commit flows.
- Instrument telemetry for extraction duration, confidence distributions, and error rates.

---

For further assistance, check `reference/multifam/chadron/` sample files or run `python manage.py process_extractions --help` for worker options.

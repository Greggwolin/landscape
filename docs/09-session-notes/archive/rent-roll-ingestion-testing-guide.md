# Rent Roll AI Ingestion System - Testing Guide

**Date:** October 24, 2025
**Status:** Ready for Testing

## Overview

This guide walks through testing the complete Rent Roll AI Ingestion System from file upload to database commit.

## Prerequisites

### 1. Environment Setup

**Backend:**
```bash
# Set Claude API Key
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Ensure dependencies are installed
cd backend
pip list | grep -E "(anthropic|pypdf|openpyxl)"

# Should show:
# anthropic         0.71.0
# openpyxl          3.1.5
# pypdf             6.1.3
```

**Database:**
```bash
# Optional: Create ai_correction_log table
psql $DATABASE_URL -f backend/sql/create_ai_correction_log.sql
```

### 2. Start Services

**Terminal 1 - Django Backend:**
```bash
cd /Users/5150east/landscape/backend
python manage.py runserver
```

**Terminal 2 - Next.js Frontend:**
```bash
cd /Users/5150east/landscape
npm run dev
```

## Test Cases

### Test Case 1: Excel Rent Roll Upload (Chadron Sample)

**File:** `reference/multifam/chadron/Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx`

**Expected Results:**
- 115 units extracted
- 102 leases (occupied units)
- 3 unit types (1BR/1BA, 2BR/2BA, 3BR/2BA)
- ~88% occupancy
- ~$449k monthly income
- 1-2 validation warnings (high rent outlier, missing dates)

**Steps:**

1. **Navigate to Rent Roll Page**
   - Open browser: http://localhost:3000/rent-roll
   - Ensure project is selected (Project ID should be visible)

2. **Upload File**
   - Click "Upload Rent Roll" button in top-right
   - Select the Chadron Excel file
   - Should show "Processing..." button

3. **Wait for Extraction** (~10-30 seconds)
   - Backend runs extraction worker
   - Frontend polls every 2 seconds
   - Staging modal opens automatically when complete

4. **Review Extraction in Staging Modal**

   **Summary Tab:**
   - ✅ Total Units: 115
   - ✅ Occupied: 102 (88.7%)
   - ✅ Vacant: 13
   - ✅ Monthly Income: ~$448,876

   **Needs Review Alerts:**
   - ⚠️ Should flag 1 unit with rent > $10,000 (likely data error)
   - ⚠️ Should flag ~18 leases missing end date (MTM)

   **Unit Types Tab:**
   - ✅ 1BR/1BA: 22 units, avg 750 SF, ~$1,624 rent
   - ✅ 2BR/2BA: 53 units, avg 1,035 SF, ~$2,136 rent
   - ✅ 3BR/2BA: 33 units, avg 1,280 SF, ~$2,726 rent
   - All should have 90-95% confidence (green chips)

   **Individual Units Tab:**
   - ✅ First 50 units displayed (scrollable)
   - ✅ Unit numbers: 100, 101, 102, 103, 104, 201, 202, 203...
   - ✅ Mix of Commercial, 1BR, 2BR, 3BR units
   - ✅ Status chips: Occupied (green) or Vacant (grey)
   - ✅ Confidence: Most 95%+

   **Leases Tab:**
   - ✅ 102 lease records
   - ✅ Tenant names present
   - ✅ Rents: $1,384 - $3,000 (plus 1 outlier)
   - ✅ Some "MTM" for missing end dates
   - ✅ Section 8 chips on ~42 units
   - Edit buttons available (not yet functional)

5. **Commit Data**
   - Click "Approve & Commit to Database"
   - Should show success message
   - Modal closes
   - Page refreshes
   - Check database for new records:
     ```sql
     SELECT COUNT(*) FROM landscape.tbl_multifamily_unit WHERE project_id=11;
     -- Should return 115

     SELECT COUNT(*) FROM landscape.tbl_multifamily_lease WHERE unit_id IN
       (SELECT unit_id FROM landscape.tbl_multifamily_unit WHERE project_id=11);
     -- Should return 102
     ```

### Test Case 2: PDF Rent Roll Upload (Chadron OM)

**File:** `reference/multifam/chadron/14105 Chadron Ave_OM_2025[nopics].pdf`

**Expected Results:**
- 113 units extracted (108 residential + 5 commercial)
- ~105 leases (excludes vacant and manager units)
- 13 unit types (includes amenity variants like "2BR/2BA XL Patio")
- Tenant names will be blank (expected for OMs)
- Quality score: ~90%

**Steps:**

1. **Upload PDF File**
   - Click "Upload Rent Roll"
   - Select the PDF file (no pics version is faster)
   - Processing takes 20-40 seconds (Claude processes 5 pages)

2. **Review PDF Extraction**

   **Summary:**
   - ✅ Total Units: 113
   - ✅ Occupied: ~105
   - ✅ Similar occupancy to Excel

   **Unit Types:**
   - ✅ More unit types (13) due to amenity variants
   - Example: "2 Bed 2 Bath" vs "2 Bed 2 Bath XL Patio"
   - Confidence: 90-92%

   **Units:**
   - ✅ Unit numbers match Excel extraction
   - ✅ Commercial units flagged
   - ✅ Square footage present

   **Leases:**
   - ⚠️ Tenant names blank (expected)
   - ✅ Rents match Excel extraction
   - ✅ Lease dates if available
   - Section 8 detection works

3. **Commit and Verify**
   - Should create similar records to Excel test
   - Can compare against Excel extraction for validation

### Test Case 3: Background Worker (Manual Trigger)

**Purpose:** Test extraction worker independently

**Steps:**

1. **Upload File via API**
   ```bash
   curl -X POST http://localhost:8000/api/dms/upload/ \
     -F "file=@reference/multifam/chadron/Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx" \
     -F "project_id=11" \
     -F "doc_type=rent_roll"
   ```

   Response:
   ```json
   {
     "success": true,
     "doc_id": 123,
     "extract_job_id": 456,
     "status": "queued"
   }
   ```

2. **Check Queue Status**
   ```bash
   curl http://localhost:8000/api/dms/staging/123/
   ```

   Response (before processing):
   ```json
   {
     "status": "queued",
     "message": "Extraction not yet complete"
   }
   ```

3. **Run Worker Manually**
   ```bash
   cd backend
   python manage.py process_extractions
   ```

   Output:
   ```
   Processing extraction queue...
   Queue processing complete
   ```

4. **Check Staging Data Again**
   ```bash
   curl http://localhost:8000/api/dms/staging/123/
   ```

   Response (after processing):
   ```json
   {
     "doc_id": 123,
     "filename": "Chadron - Rent Roll + Tenant Income Info...",
     "summary": {
       "total_units": 115,
       "occupied_units": 102,
       ...
     },
     "unit_types": [...],
     "units": [...],
     "leases": [...]
   }
   ```

## Troubleshooting

### Issue: "Extraction not yet complete" forever

**Cause:** Worker not running or extraction failed

**Fix:**
1. Check Django logs for errors
2. Run worker manually: `python manage.py process_extractions`
3. Check `dms_extract_queue` table for status:
   ```sql
   SELECT * FROM landscape.dms_extract_queue ORDER BY queued_at DESC LIMIT 5;
   ```

### Issue: "Failed to fetch staging data"

**Cause:** CORS or network issue

**Fix:**
1. Check browser console for CORS errors
2. Verify Django server is running on port 8000
3. Ensure `CORS_ALLOWED_ORIGINS` includes localhost:3000

### Issue: High rent outlier ($224k)

**This is expected!** The Chadron sample file has a data error.

**How to handle:**
1. Staging modal will flag it in "Needs Review"
2. User should manually correct before commit
3. In production, implement inline edit feature

### Issue: Missing tenant names in PDF

**This is expected!** Offering Memorandums typically don't include tenant names for privacy.

**This is normal:** System will still extract units and rents correctly.

### Issue: Extraction takes too long (>2 min)

**Causes:**
- Large file (>200 units)
- Complex PDF with many pages
- Claude API rate limits

**Fix:**
1. Increase timeout in frontend (currently 120 seconds)
2. Check Claude API quota
3. For very large files, consider batch processing

## Validation Checklist

After running both test cases, verify:

- [ ] Excel extraction: 115 units, 102 leases
- [ ] PDF extraction: 113 units, ~105 leases
- [ ] Unit types calculated correctly (avg sqft, market rent)
- [ ] Confidence scores displayed (color-coded)
- [ ] Validation warnings shown (high rents, missing dates)
- [ ] Commit creates database records
- [ ] Page refreshes after commit
- [ ] Data appears in rent roll grid after commit

## Database Verification Queries

```sql
-- Check uploaded documents
SELECT doc_id, doc_name, doc_type, status, created_at
FROM landscape.core_doc
WHERE project_id = 11
ORDER BY created_at DESC
LIMIT 5;

-- Check extraction queue
SELECT queue_id, doc_id, extract_type, status,
       queued_at, started_at, completed_at, error_message
FROM landscape.dms_extract_queue
ORDER BY queued_at DESC
LIMIT 5;

-- Check assertions stored
SELECT COUNT(*), metric_key
FROM landscape.dms_assertion
WHERE doc_id = '123'
GROUP BY metric_key
ORDER BY metric_key;

-- Check created unit types
SELECT unit_type_code, bedrooms, bathrooms, total_units,
       current_market_rent, avg_square_feet
FROM landscape.tbl_multifamily_unit_type
WHERE project_id = 11;

-- Check created units
SELECT unit_number, unit_type, bedrooms, bathrooms,
       square_feet, market_rent
FROM landscape.tbl_multifamily_unit
WHERE project_id = 11
ORDER BY unit_number
LIMIT 10;

-- Check created leases
SELECT u.unit_number, l.resident_name, l.base_rent_monthly,
       l.lease_start_date, l.lease_end_date, l.lease_status
FROM landscape.tbl_multifamily_lease l
JOIN landscape.tbl_multifamily_unit u ON l.unit_id = u.unit_id
WHERE u.project_id = 11
ORDER BY u.unit_number
LIMIT 10;
```

## Performance Benchmarks

**Target Performance:**
- Excel extraction: 10-20 seconds (115 units)
- PDF extraction: 20-40 seconds (113 units, 5 pages)
- Polling interval: 2 seconds
- Timeout: 120 seconds
- UI responsiveness: <100ms for modal interactions

**Actual Results (Log Here):**
- Excel extraction: ___ seconds
- PDF extraction: ___ seconds
- Total workflow (upload → commit): ___ minutes
- Time savings vs manual entry: ___% (target: 85-90%)

## Success Criteria

✅ **Backend Functionality:**
- [ ] Upload endpoint accepts Excel, CSV, PDF
- [ ] Extraction worker processes files successfully
- [ ] Staging endpoint returns structured data
- [ ] Commit endpoint creates database records
- [ ] Corrections are logged to ai_correction_log

✅ **Frontend Functionality:**
- [ ] Upload button works with file picker
- [ ] Polling shows extraction progress
- [ ] Staging modal opens automatically
- [ ] All tabs display data correctly
- [ ] Confidence scoring is color-coded
- [ ] Validation alerts appear
- [ ] Commit button works

✅ **Data Quality:**
- [ ] 95%+ accuracy on Excel files
- [ ] 90%+ accuracy on PDF files
- [ ] Unit types calculated correctly
- [ ] Occupancy math is accurate
- [ ] Rent ranges are reasonable

## Next Steps After Testing

1. **Production Deployment:**
   - Set ANTHROPIC_API_KEY in production env
   - Configure blob storage (S3/Azure/GCS)
   - Set up cron job for extraction worker
   - Enable Django logging for debugging

2. **Future Enhancements:**
   - Inline editing in staging modal
   - Celery for background processing
   - Real-time WebSocket updates
   - OCR for scanned PDFs
   - Multi-file delinquency merging
   - Market benchmarking integration

3. **Documentation:**
   - User guide for upload workflow
   - Video tutorial
   - FAQ for common issues
   - API documentation update

## Support

**Issues?**
- Check backend logs: `backend/logs/` (if configured)
- Check browser console for frontend errors
- Review Django debug output in terminal
- Check Claude API status: https://status.anthropic.com/

**Questions?**
- Backend implementation: See `docs/rent-roll-ingestion-implementation-summary.md`
- Original spec: See `docs/09_session_notes/prompts/CLAUDE_CODE_RENT_ROLL_INGESTION_PROMPT.md`

---

**Testing Status:** Ready for Execution
**Last Updated:** October 24, 2025

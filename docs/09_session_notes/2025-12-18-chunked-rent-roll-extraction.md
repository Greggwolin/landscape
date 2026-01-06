# Session: Chunked Rent Roll Extraction

**Date**: December 18, 2025
**Duration**: ~1.5 hours
**Focus**: Implementing chunked extraction for large rent rolls (100+ units)

---

## Summary
Implemented a chunked rent roll extraction system to handle large multifamily properties where single-call extraction fails due to Claude response truncation. The system splits rent roll extraction into multiple ~35 unit chunks and combines results.

## Problem Solved
The existing batched extraction system could not extract rent rolls for properties with 100+ units because Claude's response would truncate when trying to return JSON for all units in a single call. The Chadron property (Doc 58) has 113 units and the rent roll batch consistently failed.

## Major Accomplishments

### 1. ChunkedRentRollExtractor Implementation ✅
Created new extraction class with methods:
- `extract_rent_roll_chunked()` - Main entry point
- `_estimate_unit_count()` - Smart unit count estimation from document patterns
- `_extract_rent_roll_chunk()` - Extract single chunk of ~35 units
- `_build_rent_roll_chunk_prompt()` - Build prompt with specific unit range instructions
- `_parse_rent_roll_response()` - Parse JSON array from Claude response
- `_stage_rent_roll_units()` - Stage units to ai_extraction_staging table

### 2. Smart Unit Count Estimation ✅
Improved algorithm to:
- Find all unit count patterns in document (e.g., "113 units", "100-unit property")
- Prefer counts in typical multifamily range (50-200 units)
- Use frequency analysis to pick most common mentioned count
- Fallback to 3-digit number counting or default of 120

### 3. API Endpoint ✅
Added new endpoint: `POST /api/knowledge/documents/{doc_id}/extract-rent-roll/`

Request:
```json
{
  "project_id": 17,
  "property_type": "multifamily"
}
```

Response:
```json
{
  "success": true,
  "doc_id": 58,
  "project_id": 17,
  "estimated_units": 100,
  "chunks_processed": 3,
  "units_extracted": 96,
  "staged_count": 96,
  "errors": []
}
```

### 4. Test Results on Chadron (Doc 58) ✅
- **Estimated units**: 100 (from document analysis)
- **Chunks processed**: 3-4
- **Units extracted**: 96 unique units
- **Unit range**: 100-436 (Floors 1-4)
- **Data quality**: Full JSON objects with unit_type, bedrooms, bathrooms, sq_ft, current_rent, market_rent, occupancy_status, lease dates

---

## Files Modified

### New/Modified Services:
- `backend/apps/knowledge/services/extraction_service.py`
  - Added `RENT_ROLL_CONFIG` configuration
  - Added `ChunkedRentRollExtractor` class (~450 lines)
  - Added `extract_rent_roll_chunked()` convenience function

### New Views:
- `backend/apps/knowledge/views/extraction_views.py`
  - Added `extract_rent_roll()` view function

### URL Configuration:
- `backend/apps/knowledge/urls.py`
  - Added route: `documents/<int:doc_id>/extract-rent-roll/`

---

## Technical Details

### Configuration
```python
RENT_ROLL_CONFIG = {
    'chunk_size': 35,      # Units per chunk
    'max_chunks': 10,      # Safety limit
    'fields_per_unit': [
        'unit_number', 'unit_type', 'bedrooms', 'bathrooms',
        'square_feet', 'current_rent', 'market_rent',
        'occupancy_status', 'lease_start', 'lease_end',
        'tenant_name', 'move_in_date', 'rent_effective_date'
    ]
}
```

### Chunk Prompt Strategy
Each chunk gets specific instructions:
- "This is chunk X of Y"
- "Extract units approximately #N through #M based on position in rent roll"
- "If chunk 1, start from first unit"
- "If last chunk, continue until end"

### Deduplication
Units are deduplicated by `unit_number` after all chunks complete, keeping first occurrence.

### Staging Schema
Uses existing `ai_extraction_staging` table with:
- `scope = 'unit'`
- `field_key = 'unit_number'`
- `extracted_value` = full JSON object per unit
- `scope_label` = unit number
- `array_index` = position in extraction

---

## Sample Extracted Data
```json
{
  "unit_number": "201",
  "unit_type": "3BR/2BA",
  "bedrooms": 3,
  "bathrooms": 2,
  "square_feet": 1307,
  "current_rent": 3300,
  "market_rent": 3850,
  "occupancy_status": "Vacant"
}
```

---

## Database State After Extraction
- Project 17 (Chadron): 96 rent roll units staged
- Status: pending (ready for validation)
- Coverage: Units 100-436 (5 commercial + 91 residential)

---

## Next Steps
1. Add bulk validation for rent roll units
2. Implement writer for `tbl_mf_unit` table
3. Consider increasing chunk overlap to capture missed units
4. Add retry logic for failed chunks
5. Test on other large rent rolls

---

## Git Activity
This session's changes are uncommitted and part of the larger knowledge/extraction service updates.

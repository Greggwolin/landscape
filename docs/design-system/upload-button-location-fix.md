# Upload Button Location Fix

**Date:** October 24, 2025
**Issue:** Upload button was added to `/rent-roll` but user was looking at `/prototypes/multifam/rent-roll-inputs`

## Solution Applied

### Files Modified

**1. PageHeader Component** (`src/app/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx`)
- Added `onUploadClick` and `uploading` props
- Added Upload Button with MUI Button component
- Button appears next to Mode Toggle in header

**2. Main Page** (`src/app/prototypes/multifam/rent-roll-inputs/page.tsx`)
- Added upload state (stagingDocId, showStaging, uploading, uploadInputKey)
- Added handleUploadClick, handleFileUpload, handleCommit functions
- Updated PageHeader to pass upload props
- Added hidden file input at end of component
- Added StagingModal at end of component
- Imported StagingModal component

## Testing

### Location
- Navigate to: `http://localhost:3002/prototypes/multifam/rent-roll-inputs`
- Should now see "Upload Rent Roll" button in top-right of page header

### Functionality
1. Click "Upload Rent Roll" button
2. Select a file (.xlsx, .xls, .csv, or .pdf)
3. Button changes to "Processing..."
4. System polls backend every 2 seconds
5. Staging modal opens when extraction completes
6. Review data in modal
7. Click "Approve & Commit" to save to database

### Backend Requirements
- Django server must be running on port 8000
- Claude API key must be set: `export ANTHROPIC_API_KEY="sk-ant-..."`
- Extraction worker can be run manually: `python manage.py process_extractions`

## Sample Files

Test with files in `reference/multifam/chadron/`:
- `Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx` (115 units)
- `14105 Chadron Ave_OM_2025[nopics].pdf` (113 units)

## Implementation Notes

- Upload functionality is in the outer `MultiFamRentRollInputsPage` component
- PageHeader receives upload handlers as props
- Hidden file input triggers on button click
- Staging modal reuses the same component as `/rent-roll` page
- Project ID is hardcoded to 11 for prototypes

---

**Status:** ✅ Complete - Upload button now visible on prototypes page

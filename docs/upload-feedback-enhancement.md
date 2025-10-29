# Upload Processing Feedback Enhancement

**Date:** October 24, 2025
**Issue:** User reported "no indication that anything is processing after upload"

## Problem Analysis

The upload processing feedback was already implemented via button state change ("Upload Rent Roll" → "Processing..."), but it may not have been obvious to users because:

1. The button text change happens AFTER the file picker closes
2. No additional visual feedback beyond the button
3. No console feedback for debugging

## Solution Implemented

Added **three layers** of upload feedback:

### 1. Console Logging (for debugging)

Added detailed console logs throughout the upload flow:

```typescript
🚀 Upload started: Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx
✅ Upload state set to true - button should show "Processing..."
📤 Upload response: {success: true, doc_id: 44, ...}
📋 Doc ID: 44 - Starting polling for extraction...
🔄 Polling status: 202
⏳ Still processing (202)...
🔄 Polling status: 200
✅ Extraction complete! Opening staging modal...
```

### 2. Button State (existing - confirmed working)

- **Before upload**: "Upload Rent Roll" (blue, enabled)
- **During processing**: "Processing..." (gray, disabled)
- **After extraction**: Returns to "Upload Rent Roll"

Location: [PageHeader.tsx:47-50](file:///Users/5150east/landscape/src/app/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx#L47-L50)

### 3. Snackbar Notification (NEW - most visible)

Added Material-UI Snackbar that appears in **bottom-right corner**:

- **When upload starts**:
  - Blue info notification
  - "Processing {filename} with AI extraction... This may take 15-30 seconds."

- **When extraction completes**:
  - Green success notification
  - "Successfully extracted {N} units!"

Location: [page.tsx:1471-1485](file:///Users/5150east/landscape/src/app/prototypes/multifam/rent-roll-inputs/page.tsx#L1471-L1485)

## Files Modified

### `/Users/5150east/landscape/src/app/prototypes/multifam/rent-roll-inputs/page.tsx`

**Added imports:**
```typescript
import { Snackbar, Alert } from '@mui/material';
```

**Added state:**
```typescript
const [uploadNotification, setUploadNotification] = useState<{
  open: boolean;
  message: string;
  severity: 'info' | 'success' | 'error'
}>({
  open: false,
  message: '',
  severity: 'info'
});
```

**Added notification triggers:**
- Line 1335-1339: Show "Processing..." when upload starts
- Line 1370-1374: Show "Successfully extracted N units!" when complete
- Line 1471-1485: Snackbar component in JSX

**Added console logging:**
- Line 1333: Upload started
- Line 1343: Upload response received
- Line 1347: Polling started
- Line 1351, 1362: Polling status
- Line 1367: Extraction complete
- Line 1377: Still extracting
- Line 1380: Still processing (202)
- Line 1385: Timeout reached
- Line 1389: Upload failed
- Line 1394: Upload exception

## Testing Instructions

1. Open browser to `http://localhost:3002/prototypes/multifam/rent-roll-inputs`
2. Open browser console (Cmd+Option+J)
3. Click "Upload Rent Roll" button (top-right, blue button)
4. Select file: `reference/multifam/chadron/Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx`
5. **Observe three feedback indicators:**
   - ✅ Button text changes to "Processing..." and becomes disabled
   - ✅ Blue snackbar appears bottom-right: "Processing {filename}..."
   - ✅ Console shows: "🚀 Upload started: ..."
6. Wait 15-20 seconds
7. **Observe completion feedback:**
   - ✅ Button returns to "Upload Rent Roll" (enabled)
   - ✅ Green snackbar appears: "Successfully extracted 115 units!"
   - ✅ Console shows: "✅ Extraction complete! Opening staging modal..."
   - ✅ Staging modal opens automatically

## Expected Console Output

```
🚀 Upload started: Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx
✅ Upload state set to true - button should show "Processing..."
📤 Upload response: {success: true, doc_id: 44, extract_job_id: 8, status: "queued"}
📋 Doc ID: 44 - Starting polling for extraction...
🔄 Polling status: 202
⏳ Still processing (202)...
🔄 Polling status: 202
⏳ Still processing (202)...
... [repeat 5-10 times]
🔄 Polling status: 200
✅ Extraction complete! Opening staging modal...
```

## Troubleshooting

### If you still don't see feedback:

1. **Check browser console for errors** - JavaScript error may prevent state updates
2. **Verify button is clickable** - Make sure you're clicking the blue "Upload Rent Roll" button in the page header (not somewhere else)
3. **Check network tab** - Verify POST to http://localhost:8000/api/dms/upload/ returns 201
4. **Check Django server** - Ensure it's running on port 8000 without errors
5. **Try different file** - Test with a smaller file to rule out timeout issues

### If snackbar doesn't appear:

- **Z-index issue**: Snackbar may be behind other elements
- **Material-UI theme**: Check if Alert component is properly styled
- **State update issue**: Check console for "Upload state set to true" message

### If extraction times out:

- **Run extraction worker manually**: `cd backend && python manage.py process_extractions`
- **Check queue status**: `curl http://localhost:8000/api/dms/staging/{doc_id}/`
- **Increase timeout**: Change 120000ms (2 min) to 300000ms (5 min) at line 1390

## Success Criteria

✅ User sees immediate visual feedback when upload starts
✅ User knows extraction is in progress via persistent notification
✅ User is notified when extraction completes
✅ Developers can debug upload flow via console logs

## Next Steps

- Consider adding progress percentage if possible
- Add WebSocket for real-time updates instead of polling
- Add extraction animation/spinner in snackbar
- Show estimated time remaining based on file size

---

**Status:** ✅ Complete - Ready for user testing

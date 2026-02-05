# DMS Version Control - Collision Detection Fix

**Date**: February 5, 2026
**Focus**: Fixing document version control collision detection in DMS

---

## Summary

Fixed the DMS document version control system where collision detection was not triggering, causing duplicate documents to be uploaded as V1 instead of showing the collision modal and incrementing versions.

## Major Accomplishments

### 1. Collision Detection Fix in AccordionFilters.tsx ✅

The root cause was identified: `AccordionFilters.tsx` had its own upload functionality that completely bypassed the collision detection logic in `Dropzone.tsx`.

**Problems Found:**
- `AccordionFilters.tsx` had a fake `generateSha256` function computing hash from URL + filename + size + timestamp (NOT actual file content)
- Files were uploaded directly via `startUpload` without any collision checking
- `version_no` was always hardcoded to `1`

**Solution Implemented:**
- Added proper `computeFileHash()` function using `crypto.subtle.digest('SHA-256', arrayBuffer)` for real file content hashing
- Added `checkCollision()` function calling `/api/projects/${projectId}/dms/check-collision` before upload
- Added collision modal state management (`showCollisionModal`, `collisionData`, `pendingFiles`, `isCollisionLoading`)
- Added `uploadSingleFile()` for single file uploads with proper hash
- Added `uploadAsNewVersion()` for version uploads
- Added `processFilesWithCollisionCheck()` for sequential collision-aware processing
- Added modal handlers: `handleCollisionCancel`, `handleUploadAsNew`, `handleReplace`
- Imported and rendered `UploadCollisionModal` component

### 2. Two-Step Delete System (Previous Session Continuation) ✅

Extended from previous session work implementing soft delete and permanent delete:
- Soft delete moves documents to trash (`deleted_at` timestamp)
- Permanent delete removes document and associated extracted facts/embeddings
- Trash view for reviewing deleted documents
- Restore functionality to recover trashed documents

## Files Modified

### Modified:
- `src/components/dms/filters/AccordionFilters.tsx` - Major rewrite with collision detection
- `src/components/dms/modals/DeleteConfirmModal.tsx` - Added `isPermanentDelete`, `RestoreConfirmModal`
- `src/components/dms/modals/index.ts` - Export `RestoreConfirmModal`
- `src/app/api/dms/search/route.ts` - Added `searchDeletedDocuments()` and `deleted_only` parameter

### New Files Created:
- `src/app/api/projects/[projectId]/dms/docs/[docId]/restore/route.ts` - Restore proxy
- `src/app/api/projects/[projectId]/dms/docs/[docId]/permanent-delete/route.ts` - Permanent delete proxy

### Backend Modified:
- `backend/apps/documents/views.py` - Added `restore_document`, `permanent_delete_document`
- `backend/apps/documents/urls.py` - Added routes for restore and permanent-delete

## Technical Details

### Collision Detection Flow:
1. User drops file on AccordionFilters row
2. `computeFileHash()` calculates real SHA-256 from file content
3. `checkCollision()` calls backend API with filename and hash
4. If collision detected, `UploadCollisionModal` displays with options:
   - **Cancel** - Skip file
   - **Upload as New Document** - Rename with timestamp
   - **Replace (Add Knowledge)** - Upload as new version (V2, V3, etc.)
5. User choice triggers appropriate action
6. Process continues with remaining files in queue

### Key Interface Changes:
```typescript
interface CollisionData {
  file: File;
  hash: string;
  matchType: 'filename' | 'content' | 'both';
  existingDoc: {
    doc_id: number;
    filename: string;
    version_number: number;
    uploaded_at: string;
    extraction_summary: { facts_extracted: number; embeddings: number; };
  };
}
```

## Testing

- ✅ Build passes (npm run build)
- ✅ Lint passes (npm run lint)
- Collision detection now properly wired in AccordionFilters

## Next Steps

- Test collision detection flow end-to-end with actual file uploads
- Verify version numbering increments correctly when replacing
- Test trash view and restore functionality

---

*Session completed: 2026-02-05*

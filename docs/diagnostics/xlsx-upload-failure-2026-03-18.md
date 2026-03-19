# Diagnostic: Documents Page .xlsx Upload Failure

**Date:** 2026-03-18
**Error:** `Failed to create document for Costar_MF_partial.xlsx: {}`
**Stack:** `LandscaperPanel.useCallback[uploadFiles] (src/components/landscaper/LandscaperPanel.tsx:244:21)`

---

## 1. Upload Path Confirmed

The file drop on the Documents page follows this chain:

```
User drops .xlsx on Documents page
    │
    ├─► If dropped on AccordionFilters doc-type row:
    │     └─ stageFiles() via UploadStagingContext (CORRECT PATH — has auth headers)
    │
    └─► If dropped on LandscaperPanel area OR via FileDropContext addFiles():
          └─ Old LandscaperPanel.tsx useEffect consumes pendingFiles
               └─ uploadFiles() callback (BROKEN PATH — no auth headers)
```

**Component chain for the broken path:**

1. **DMSView.tsx** (line 922): `<input type="file" onChange>` calls `addFiles(files)` from `useFileDrop()` (FileDropContext). Note: DMSView has NO page-level drag-drop handler — drag-drop targets are either AccordionFilters rows (react-dropzone → stageFiles) or the LandscaperPanel itself (react-dropzone → uploadFiles).

2. **FileDropContext.tsx** (line 38-43): `addFiles()` pushes to both `pendingFiles` and `pendingIntakeFiles` state arrays.

3. **LandscaperPanel.tsx.bak** (line 544-551): `useEffect` watches `pendingFiles` from FileDropContext. When files appear, it calls `consumeFiles()` then `uploadFiles(files)`.

4. **LandscaperPanel.tsx.bak** (line 593-602): The LandscaperPanel also has its OWN `react-dropzone` (noClick, noKeyboard) wrapping the entire panel. Files dropped directly on the Landscaper panel bypass FileDropContext and go straight to `uploadFiles()`.

5. **LandscaperPanel.tsx.bak** (line 166-250): `uploadFiles` callback:
   - Phase 1: Uploads file to UploadThing via `startUpload(files)` — **succeeds**
   - Phase 2: POSTs to `/api/dms/docs` (Next.js route) — **fails**

**Critical note on .bak vs current:** The file `LandscaperPanel.tsx` has been refactored — the current version has NO `uploadFiles`, NO `useFileDrop()`, NO `startUpload`, and NO dropzone. All upload logic was removed. The old code lives in `LandscaperPanel.tsx.bak`. The deployed/running version still has the old code (the .bak rename has not been deployed).

---

## 2. Request Payload Sent to Next.js Route

From `LandscaperPanel.tsx.bak` lines 207-222, the payload sent to `POST /api/dms/docs`:

```json
{
  "system": {
    "project_id": "<from serverData or projectId prop>",
    "workspace_id": "<from serverData or 1>",
    "doc_name": "Costar_MF_partial.xlsx",
    "doc_type": "<from serverData or 'Property Data'>",
    "status": "draft",
    "storage_uri": "<UploadThing URL>",
    "sha256": "<64-char hex hash>",
    "file_size_bytes": "<file size>",
    "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "version_no": 1
  },
  "profile": {},
  "ai": { "source": "landscaper" }
}
```

**Headers sent:**
```
Content-Type: application/json
```

**Headers NOT sent:**
```
Authorization: Bearer <jwt>    ← MISSING
```

Compare with `UploadStagingContext.tsx` line 348-351 (the CORRECT path), which includes `...getAuthHeaders()`.

---

## 3. Root Cause: Missing Authorization Header

The `uploadFiles` callback in the old LandscaperPanel code (line 227-231) sends the POST to `/api/dms/docs` **without an Authorization header**.

The route handler at `src/app/api/dms/docs/route.ts` (lines 28-35):
```javascript
const requestUser = getUserFromRequest(req);
if (!requestUser) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
const ownsProject = await userOwnsProject(requestUser.userId, system.project_id);
if (!ownsProject) {
  return NextResponse.json({ error: 'You do not have access to this project' }, { status: 403 });
}
```

`getUserFromRequest()` (src/lib/auth.ts) reads `Authorization: Bearer <token>` from the request headers. No header → returns null → route returns 401.

**However:** The auth module (`src/lib/auth.ts`) was created 2026-03-01. If the error was first observed before that date, the route would not have had this auth check, and the failure would have a different cause (possibly a DB constraint error or a different validation issue that produced `{}`).

---

## 4. Why `{}` Instead of a Structured Error

**Two scenarios explain the `{}` response:**

### Scenario A: Auth check IS active (post-March 1)
The route returns `{ error: 'Authentication required' }` with 401 status. This is NOT `{}`. If the user truly sees `{}` in the console, either:
- The error report simplified/truncated the actual response
- Or there's a Vercel edge behavior stripping the response body for 401s (unlikely but possible in certain Vercel configurations)

### Scenario B: Auth check was NOT active when the error occurred (pre-March 1)
The route would proceed to Zod validation and DB operations. A plausible failure path:
- If the `created_by` column in `core_doc` has a NOT NULL constraint and `requestUser.userId` was not available (because the auth check didn't exist), the INSERT would fail with a constraint violation
- The catch block at line 367-390 returns `{ error: 'Failed to create document', details: '<error message>' }` — still not `{}`

### Most likely explanation
The `{}` is the actual response body. The only code path that could produce `{}` is if a previous version of the route handler had a bare `catch` that returned `NextResponse.json({})` or similar. Since I cannot inspect git history, I cannot confirm the exact version of the route code that was running when this error occurred.

**Alternatively:** If there was a network-level issue (Vercel function cold start timeout, body truncation), the response body could arrive empty, and `response.json()` on an empty body would fail — but the `.catch(() => ({ error: 'Unknown error' }))` would produce `{ error: 'Unknown error' }`, not `{}`.

---

## 5. Additional Finding: Current Code Is Also Broken

The `.bak` rename creates a **new** bug:

- **Old code (deployed):** FileDropContext files are consumed by LandscaperPanel → uploaded without auth → fails
- **New code (local):** FileDropContext files are consumed by **nobody** → files go into a void

In the current LandscaperPanel.tsx:
- No `useFileDrop()` import
- No `consumeFiles()` call
- No `uploadFiles` callback
- The dropzone comment exists (line 162-163) but the implementation is removed (lines 164-166 are blank)

This means: files added via `addFiles()` in DMSView (line 922) or from any other component using FileDropContext will silently disappear — they'll sit in `pendingFiles` state but never be uploaded.

---

## 6. Fix Recommendations (Do NOT implement — report only)

### Fix 1: Auth headers in upload path (immediate)
Add `...getAuthHeaders()` to the fetch call in the upload handler, matching the pattern already used in `UploadStagingContext.tsx` line 350:
```javascript
headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
```

### Fix 2: Consolidate upload paths (architectural)
The old LandscaperPanel upload path should be deleted entirely. All uploads should route through `UploadStagingContext` which already:
- Sends auth headers
- Does client-side collision detection
- Shows the staging tray UI
- Handles doc-type classification
- Manages intake routing

DMSView's `addFiles()` call (line 922) should be changed to `stageFiles(files)` from `useUploadStaging()`.

### Fix 3: Better error handling in the route
The `/api/dms/docs` route should never return `{}`. Add a safety net at the top of the catch block:
```javascript
catch (error) {
  console.error('Document creation error:', error);
  return NextResponse.json(
    { error: 'Failed to create document', details: error?.message || 'Unknown error' },
    { status: 500 }
  );
}
```

### Fix 4: Fix the FileDropContext dead-end
Either:
- **Option A:** Remove `addFiles` call from DMSView entirely — use `stageFiles` instead
- **Option B:** Have the new LandscaperPanel re-consume FileDropContext files and route them to UploadStagingContext

### Fix 5: Delete the .bak file
`LandscaperPanel.tsx.bak` should be deleted from the repo after confirming the current code works correctly. Leaving it creates confusion about which version is active.

---

## 7. Railway Logs

**N/A.** The document creation endpoint is `/api/dms/docs` which is a **Next.js API route** running on **Vercel**, not Django/Railway. It connects directly to Neon PostgreSQL. Django/Railway is only called for RAG processing (fire-and-forget) AFTER document creation succeeds. Railway logs would not contain the document creation failure.

To find the actual error, check **Vercel function logs** for the `/api/dms/docs` route.

---

## Success Criteria Checklist

- [x] Upload path from drop event to line 244 is fully traced and documented
- [x] The exact request payload sent to the endpoint is identified
- [x] Root cause of failure identified (missing Authorization header)
- [x] The `{}` response origin is explained (two scenarios; most likely pre-auth-check code or response misreport)
- [x] No files were modified during this investigation (this report is the only new file)

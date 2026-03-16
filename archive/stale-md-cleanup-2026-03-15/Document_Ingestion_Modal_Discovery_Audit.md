# Document Ingestion Modal — Discovery Audit

**Date:** 2026-02-27
**Branch:** `feature/alpha-prep`
**Scope:** Read-only discovery — no code changes

---

## 1. Upload Entry Points

| # | Component | File Path | Upload Mechanism | Post-Upload Callback | Ingestion UI Shown? |
|---|-----------|-----------|-----------------|---------------------|-------------------|
| 1 | **DMS Dropzone** | `src/components/dms/upload/Dropzone.tsx` | `react-dropzone` → `UploadStagingContext.stageFiles()` | Opens StagingTray for review/confirm; after confirm, creates doc record via `/api/dms/docs` | **StagingTray** (file list with doc type picker, collision badges). Then **IntakeChoiceModal** if route=`extract`. No extraction tiles. |
| 2 | **LandscaperPanel DropZone** | `src/components/landscaper/LandscaperPanel.tsx` | `react-dropzone` → UploadThing `startUpload()` directly (bypasses staging context) | Creates doc record via `/api/dms/docs`, then calls Django `/api/knowledge/documents/{docId}/process/` for sync text+embedding processing, then fires extraction via Django backend | **IntakeChoiceModal** shown with uploaded doc IDs. **ExtractionReviewModal** if extraction returns `field_mappings`. Also has **FieldMappingInterface** for Excel/CSV rent rolls. |
| 3 | **FileDropContext** (global) | `src/contexts/FileDropContext.tsx` | Shared state bus — holds `pendingFiles` array | LandscaperPanel consumes via `useFileDrop().consumeFiles()` and runs its own upload pipeline | None directly — delegates to LandscaperPanel |
| 4 | **Knowledge Library UploadDropZone** | `src/components/admin/knowledge-library/UploadDropZone.tsx` | Direct `FormData` POST to Django `/api/knowledge/library/upload/` | Shows inline classification summary (doc_type, property_type, geo_tags) for ~8 seconds | **Inline text summary** of AI classification results. No modal, no extraction tiles, no Landscaper chat. |
| 5 | **GIS ProjectDocumentUploads** | `src/app/components/GIS/ProjectDocumentUploads.tsx` | UploadThing via `handleUploadComplete` callback | Creates doc record, runs multi-doc analysis via `/api/ai/analyze-multiple-documents` | Shows extracted field values inline in GIS form. Legacy extraction UI — not integrated with staging or intake pipeline. |
| 6 | **UploadThing route** | `src/app/api/uploadthing/route.ts` | Server-side UploadThing config (`documentUploader` endpoint) | Returns `storage_uri`, `sha256`, `doc_name`, `mime_type`, `file_size_bytes` | N/A — server-side only |
| 7 | **DMS Upload API** | `src/app/api/dms/upload/route.ts` | Alternative upload route (legacy) | Direct file storage | N/A — server-side only |

**Key Finding:** There are **3 independent upload pipelines** with different post-upload behavior:

1. **DMS path** (Dropzone → UploadStagingContext → StagingTray → IntakeChoiceModal)
2. **Landscaper path** (DropZone → UploadThing direct → process → extract → ExtractionReviewModal)
3. **Knowledge Library path** (FormData POST → Django → inline classification text)

None of them share a common ingestion modal.

---

## 2. UploadStagingContext Audit

**File:** `src/contexts/UploadStagingContext.tsx`

### Tracked State

| State | Type | Purpose |
|-------|------|---------|
| `stagedFiles` | `StagedFile[]` | Files held in browser memory pre-upload |
| `isTrayOpen` | `boolean` | Whether the bottom slide-up tray is visible |
| `docTypes` | `string[]` | Available doc types for the dropdown |
| `pendingIntakeDocs` | `PendingIntakeDoc[]` | Docs that completed upload on an `extract` route — triggers IntakeChoiceModal |

### Exposed Actions

`stageFiles`, `removeFile`, `clearAll`, `closeTray`, `setFileDocType`, `setFileRoute`, `confirmFile`, `confirmAll`, `setDocTypes`, `clearPendingIntakeDocs`

### Consumers

| Component | How Used |
|-----------|----------|
| `DMSView.tsx` | Wraps children in `UploadStagingProvider`; reads `stageFiles`, `pendingIntakeDocs`, `setDocTypes` |
| `Dropzone.tsx` | Calls `stageFiles()` on drop |
| `StagingTray.tsx` | Full consumer — reads all file state, renders confirm/remove UI |
| `AccordionFilters.tsx` | Reads `stageFiles` to update doc type filter options |

### Analysis Pipeline (runs on stage)

1. Compute SHA-256 hash (client-side `computeFileHash`)
2. Check collision against server (`checkCollision` → `/api/dms/check-collision`)
3. Set status to `ready`

### Post-Upload UI Triggered

**Yes — two layers:**

1. **StagingTray** — bottom slide-up panel showing file list with status badges, doc type dropdowns, route selectors, confirm/remove buttons. Auto-closes 1.5s after all files complete.
2. **IntakeChoiceModal** — fires when `pendingIntakeDocs` has entries (docs uploaded on `extract` route). Offers 3 choices: Structured Ingestion, Global Intelligence, DMS Only.

**What's NOT triggered:** No extraction confidence tiles, no AI doc type display, no Landscaper chat scoped to the document.

---

## 3. DocumentSubtypeClassifier Audit

**File:** `backend/apps/knowledge/services/subtype_classifier.py`

### What It Is

Pattern-matching classifier that determines the **property subtype** (e.g., garden-style MF, student housing, LIHTC) from document text content. Works alongside the main DocumentClassifier which determines doc type.

### When It Fires

Called programmatically — either by doc ID (`classify_document(doc_id)`) or by raw content string (`classify(content)`). **Not triggered automatically on upload.** Must be called explicitly by extraction service or Landscaper tools.

### What It Returns

`SubtypeResult` dataclass:

| Field | Type | Description |
|-------|------|-------------|
| `subtype_code` | `str | None` | e.g., `GARDEN_MF`, `STUDENT_HOUSING` |
| `subtype_name` | `str | None` | Human-readable name |
| `confidence` | `float` | 0.0-1.0 based on pattern match ratio |
| `matched_patterns` | `List[str]` | Which detection patterns hit |
| `priority_fields` | `List[str]` | Fields to prioritize during extraction |
| `special_instructions` | `str | None` | Extraction prompt modifications |

### Data Source

Loads from `ai_document_subtypes` DB table (active records). Patterns stored as JSON arrays in `detection_patterns` column. Uses case-insensitive substring matching with word-boundary enforcement for short patterns.

### Surfaced in UI?

**No.** The subtype classification result is consumed internally by the extraction service to customize extraction prompts. It is not currently returned to or displayed in any frontend component.

---

## 4. Existing Extraction/Ingestion UI

### ExtractionReviewModal

**File:** `src/components/landscaper/ExtractionReviewModal.tsx`

**What it shows:** Per-field extraction results grouped by scope (Property Details, Financial Metrics, Deal & Market, Unit Types, Operating Expenses, Rent Roll). Each field shows source text, suggested value, confidence score, and conflict details. Users can accept/reject individual fields.

**When it fires:** Only from LandscaperPanel after its independent upload → process → extract pipeline returns `field_mappings`. Not accessible from DMS upload path.

**Scope categories (6):** `core_property`, `financials`, `deal_market`, `unit_types`, `operating_expenses`, `rent_roll` — these are the closest thing to "extraction confidence tiles" that exists today.

### IntakeChoiceModal

**File:** `src/components/intelligence/IntakeChoiceModal.tsx`

**What it shows:** 3-button routing decision (Structured Ingestion → MappingScreen, Global Intelligence → fire-and-forget, DMS Only → no action).

**When it fires:** After DMS upload when route=`extract`, or after Landscaper upload. Calls Django `POST /api/intake/start/` with selected intent.

### IntelligenceTab

**File:** `src/components/intelligence/IntelligenceTab.tsx`

**What it shows:** Table of intake sessions with status badges. Drill-down into MappingScreen (field mapping) and ValueValidationScreen (value review + commit).

**When accessible:** Documents folder → Intelligence subtab. Session-based, not triggered by upload.

### FieldMappingInterface

**File:** `src/components/landscaper/FieldMappingInterface.tsx`

**What it shows:** Column-to-field mapping UI for Excel/CSV rent roll imports. Separate from the extraction review flow.

**When it fires:** Only from LandscaperPanel for tabular data uploads.

### What Does NOT Exist

- **Universal ingestion modal** that fires on every upload regardless of entry point
- **Extraction confidence tiles** (6-8 per document) as a standalone component
- **AI-inferred doc type display** mapped to DMS template (client-side `classifyFile` exists but only shows in StagingTray dropdown — no AI confirmation)
- **Scoped Landscaper chat** per-document during ingestion
- **User-verified tile state** with distinct visual outline

---

## 5. Collision Handling

**File:** `src/contexts/LandscaperCollisionContext.tsx`

### What It Handles

Three collision types detected by `checkCollision()`:

| Match Type | Meaning |
|------------|---------|
| `filename` | Same filename, different content |
| `content` | Same SHA-256 hash, different filename |
| `both` | Identical filename AND content |

### How It Currently Surfaces

**Two separate paths exist:**

1. **UploadStagingContext path:** Collision detected during analysis phase. If collision found, `confirmFile()` auto-routes to version upload (`POST /api/projects/{id}/dms/docs/{docId}/version`). User sees collision badge in StagingTray row but has no choice beyond "confirm" (auto-versions) or "remove."

2. **LandscaperCollisionContext path:** Provides `addCollision()`, `resolveCollision()`, and `buildCollisionMessage()` for conversational resolution. Exposes `version`, `rename`, `skip` as resolution actions. Has `onCollisionResolved` callback hook.

### Gap

The LandscaperCollisionContext is **fully wired as infrastructure** but the **Landscaper chat integration is incomplete.** The context stores pending collisions and has a message builder, but there's no evidence of the Landscaper chat actually consuming `pendingCollision` to display the conversational prompt and collect user choice. The staging path auto-versions without asking. The two collision paths don't talk to each other.

---

## 6. Backend Extraction Endpoints

### Knowledge App Endpoints

| Endpoint | Method | Returns | Called from Frontend? |
|----------|--------|---------|---------------------|
| `/api/knowledge/projects/{id}/extract/` | POST | Extraction results with field_mappings, confidence_scores | Yes — from LandscaperPanel after upload |
| `/api/knowledge/projects/{id}/extractions/pending/` | GET | Pending/conflict extractions + summary counts | Yes — via `useExtractionHistory` hook |
| `/api/knowledge/projects/{id}/extractions/` | GET | All extractions (filterable by status) with `confidence_score` per field | Partially — used by admin/extraction views |
| `/api/knowledge/documents/{docId}/process/` | POST | Text chunks + embeddings created count | Yes — from LandscaperPanel |
| `/api/knowledge/library/upload/` | POST | Upload results with `ai_classification` (doc_type, property_type, geo_tags, confidence) | Yes — from Knowledge Library UploadDropZone |

### Landscaper/Intelligence App Endpoints

| Endpoint | Method | Returns | Called from Frontend? |
|----------|--------|---------|---------------------|
| `/api/intake/start/` | POST | `intakeUuid`, status | Yes — from IntakeChoiceModal |
| `/api/intake/{uuid}/mapping_suggestions/` | GET | Field mapping suggestions | Yes — from MappingScreen |
| `/api/intake/{uuid}/lock_mapping/` | POST | Locked mapping state | Yes — from MappingScreen |
| `/api/intake/{uuid}/extracted_values/` | GET | Extracted values for validation | Yes — from ValueValidationScreen |
| `/api/intake/{uuid}/commit_values/` | POST | Commit results | Yes — from ValueValidationScreen |
| `/api/intake/{uuid}/re_extract/` | POST | Re-extraction trigger | Yes — from IntelligenceTab |

### Extraction Mapping Admin Endpoints

| Endpoint | Returns | Called? |
|----------|---------|--------|
| `/api/extraction-mappings/` | CRUD for field mapping configs | Yes — ExtractionMappingAdmin |
| `/api/extraction-mappings/stats/` | Extraction statistics | Yes — ExtractionMappingAdmin |
| `/api/extraction-logs/` | Extraction audit log | Yes — ExtractionMappingAdmin |

### Key Backend Data

`ai_extraction_staging` table stores per-field extractions with `confidence_score` (0-1), `status` (pending/conflict/validated/applied), `source_text`, `scope`, `target_table`, `target_field`. This is the data that would populate the proposed confidence tiles.

---

## 7. Client-Side Classification

**File:** `src/components/dms/staging/classifyFile.ts`

A pure client-side filename pattern matcher — no AI, no server call. Runs instantly on file drop. Returns `docType`, `confidence`, `route` (extract/library/reference), and `fieldTargets`.

**30+ regex rules** covering rent rolls, T-12s, OMs, appraisals, leases, cost data, surveys, legal docs, etc. Falls back to extension-based defaults. This is the **only classification that runs in the DMS upload path** — the AI-powered `DocumentSubtypeClassifier` on Django is never called from the DMS flow.

---

## Summary: What Exists vs. What's Missing

### Already Built (partial infrastructure)

| Component | Status | Reusable? |
|-----------|--------|-----------|
| **UploadStagingContext** | Fully working — stages files, runs collision detection, manages upload lifecycle | Yes — good foundation for universal intake |
| **StagingTray** | Working bottom sheet with file list, doc type picker, confirm/remove | Partially — could evolve into the ingestion modal's file list section |
| **IntakeChoiceModal** | Working 3-choice routing (Structured / Global Intelligence / DMS Only) | Yes — this IS the routing decision, just not wired to all entry points |
| **ExtractionReviewModal** | Working per-field extraction UI with scope categories and confidence | Yes — scope categories (6) map directly to proposed "confidence tiles" |
| **IntelligenceTab + MappingScreen + ValueValidationScreen** | Full intake pipeline with session tracking | Yes — already handles the "structured ingestion" deep path |
| **classifyFile.ts** | Client-side filename classification | Yes — fast pre-classification before AI runs |
| **DocumentSubtypeClassifier** | Backend property subtype detection | Yes — but not wired to any upload flow |
| **LandscaperCollisionContext** | Full collision state management with conversational message builder | Yes — but chat integration incomplete |
| **Backend extraction endpoints** | Full per-field confidence data in `ai_extraction_staging` | Yes — data is there, just not shown as tiles |

### Needs to Be Created from Scratch

| Component | Description |
|-----------|-------------|
| **Universal Ingestion Modal** | A single modal component that fires after EVERY upload regardless of entry point. Must replace/wrap IntakeChoiceModal, ExtractionReviewModal, and StagingTray into one unified flow. |
| **Extraction Confidence Tiles** | 6-8 visual tiles (one per extraction scope) showing per-category confidence with color coding. Data exists in backend (`ai_extraction_staging`), needs a dedicated tile component. |
| **AI Doc Type Display** | Show the AI-inferred document type mapped to the project's DMS template. Currently only client-side filename matching exists in DMS path; backend classifier not wired. |
| **Scoped Landscaper Chat Panel** | Embed a Landscaper chat instance inside the ingestion modal, pre-scoped to the uploaded document. LandscaperPanel exists but is a full sidebar — need an embeddable variant. |
| **User Verification State** | Visual indicator (distinct outline/badge) when user explicitly confirms a tile's extracted values. No concept of this exists today. |
| **Universal Upload Hook** | Single point that intercepts ALL uploads (DMS, Landscaper, Knowledge Library, GIS) and routes through the ingestion modal. Currently 3 independent pipelines. |
| **Collision → Landscaper Wiring** | Connect LandscaperCollisionContext to the scoped chat so collision resolution happens conversationally inside the ingestion modal. |

### Architecture Gap

The fundamental issue is **three parallel upload pipelines** that diverge immediately after file selection. The DMS path goes through staging; the Landscaper path goes through UploadThing directly; the Knowledge Library path POSTs to Django. Unifying these requires either (a) routing all three through UploadStagingContext, or (b) creating a higher-level orchestrator that catches the "upload complete" event from any pipeline and opens the ingestion modal.

Option (b) is more pragmatic — it doesn't require rewriting the Landscaper or Knowledge Library upload mechanics, just hooking into their completion callbacks.

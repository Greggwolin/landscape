# Landscaper User Manual (Consolidated)

This manual consolidates the Landscaper admin configuration and the user-facing workflows for chat, extraction, and activity feeds. It is based on current implementation notes and wiring references in the codebase.

## 1) Access Points

- System Administration modal: "Landscaper" tab (AI Extraction Mappings).
- Project workspace: Landscaper panel in the main project layout.
- Dedicated route: `/projects/[projectId]/landscaper`.
- New Project modal: document extraction dropzone for auto-fill.

## 2) Admin Modal: Landscaper Configuration

### 2.1 Sections

The Landscaper tab is an accordion with multiple sections:

- AI Extraction Mappings: Active configuration panel for document field mappings.
- Model Configuration: Placeholder (disabled, "Coming Soon").
- Extraction History / Logs: Placeholder (disabled, "Coming Soon").
- Training Feedback: Placeholder (disabled, "Coming Soon").

Only AI Extraction Mappings is interactive today.

### 2.2 AI Extraction Mappings

This panel controls how extracted document fields map into database tables.

Filters:

- Search: Filters by Source Pattern, Target Table, Target Field.
- Doc Type: Filters by document category (e.g., OM, RENT_ROLL, T12, APPRAISAL).
- Tables: Filters by target table.
- Confidence: High, Medium, Low.
- Status: Active or Inactive.

Stats toggle:

- Stats button switches to a usage view.
- Adds "Used" (times extracted) and "Write Rate" columns.

Table columns:

- Active: Enable/disable mapping.
- Doc Type: Document type badge.
- Pattern: Source label, aliases shown below.
- Target: `table.field` plus transform rule if configured.
- Type: Data type.
- Confidence: High/Medium/Low badge.
- Actions: Edit or Delete (Delete hidden for system mappings).

Add/Edit modal fields:

- Document Type
- Confidence
- Source Pattern
- Source Aliases
- Target Table
- Target Field
- Data Type (text, integer, decimal, boolean, date, json)
- Transform Rule (strip_currency, percent_to_decimal, parse_date, extract_number)
- Notes
- Auto Write
- Overwrite Existing
- Active

Common admin tasks:

- Add a mapping: fill Pattern + Target Table/Field, choose Doc Type + Data Type.
- Disable a mapping: toggle Active off.
- Review low-confidence mappings: filter by Confidence = Low.

## 3) Project Landscaper Panel

The project layout uses a 30/70 split with the Landscaper panel. It provides chat, extraction review, and activity feed surfaces.

Key behaviors:

- Upload documents from the Landscaper panel (UploadThing path).
- Extraction review modal + validation UI for staging results.
- Activity feed items can navigate to target pages and highlight fields.

## 4) Chat and Advice Panel

The chat interface persists messages and returns assistant responses. A right-side panel displays advice variances when available.

User behaviors:

- Send a message, receive an assistant response.
- Chat history persists and reloads (last 100 messages).
- Advice panel lists variances above a threshold (0-50%).

API behavior:

- Request payload: `{ message }` from the UI, transformed to `{ content }` for Django.
- Response includes `user_message` and `assistant_message` objects.

## 5) Activity Feed

Activity items are created by backend workflows and shown in the Landscaper panel.

- Click an item to navigate and mark it read.
- `?highlight=field1,field2` query supports field highlighting in the UI.
- Automatic refresh runs every 60 seconds.

## 6) New Project Modal: Document Extraction

The New Project modal supports drop/paste document extraction to prefill fields.

- Dropzone supports PDF and images (JPEG, PNG).
- Extracted fields: property name, address, city, state, ZIP, units, square footage, property type.
- Auto-filled fields show a blue ring and "Auto-filled" badge.
- Clear form button resets data and extraction indicators.

Limitations:

- Word/Excel not supported; convert to PDF.
- Partial extraction on financials is expected when fields are missing.

## 7) Data Flow Overview

Document ingestion pipeline:

1. Upload (DMS dropzone or Landscaper panel).
2. `core_doc` record created with `storage_uri`.
3. DMS extraction queue (`dms_extract_queue`) processed by worker.
4. Extraction staging + review UI.
5. Optional knowledge processing: chunking + embeddings.

Chat pipeline:

1. UI sends message to Next proxy.
2. Django processes and persists messages.
3. Assistant response returned and stored.

## 8) Known Gaps and Operational Notes

- RAG search is not project-scoped in the knowledge embeddings path.
- Activity mark-read proxies are missing in Next routes.
- Chat modal and advice panel hardcode localhost URLs.
- UnifiedSidebar import is missing (agent layout instability).
- RAG chat path is separate from the panel chat path.

## 9) Technical Wiring (Reference)

### Frontend (Next.js)

- Admin modal/tab: `src/components/admin/AdminModal.tsx`
- Landscaper admin panel: `src/components/admin/LandscaperAdminPanel.tsx`
- Extraction mappings UI: `src/components/admin/ExtractionMappingAdmin.tsx`
- Project layout: `src/app/projects/[projectId]/ProjectLayoutClient.tsx`
- Landscaper route: `src/app/projects/[projectId]/landscaper/page.tsx`
- Landscaper panel: `src/components/landscaper/LandscaperPanel.tsx`
- Extraction review modal: `src/components/landscaper/ExtractionReviewModal.tsx`
- Activity feed: `src/components/landscaper/ActivityFeed.tsx`
- Chat UI: `src/components/landscaper/ChatInterface.tsx`
- Advice panel: `src/components/landscaper/AdviceAdherencePanel.tsx`
- New project extraction UI: `src/app/components/new-project/LandscaperPanel.tsx`

### Backend (Django)

- Models: `backend/apps/landscaper/models.py`
- Serializers: `backend/apps/landscaper/serializers.py`
- ViewSets: `backend/apps/landscaper/views.py`
- URLs: `backend/apps/landscaper/urls.py`
- AI handler: `backend/apps/landscaper/ai_handler.py`
- Extraction mappings seed: `backend/apps/landscaper/management/commands/seed_extraction_mappings.py`

### Database Tables

- `landscape.tbl_extraction_mapping`
- `landscape.tbl_extraction_log`
- `landscape.landscaper_chat_message`
- `landscape.landscaper_advice`
- `landscape.landscaper_activity`

### Django Endpoints

- `GET/POST /api/landscaper/mappings/`
- `PUT/DELETE /api/landscaper/mappings/{id}/`
- `GET /api/landscaper/mappings/stats/`
- `GET /api/landscaper/mappings/document-types/`
- `GET /api/landscaper/mappings/target-tables/`
- `GET/POST /api/projects/{projectId}/landscaper/chat/`
- `GET /api/projects/{projectId}/landscaper/variances/`
- `GET/POST /api/projects/{projectId}/landscaper/activities/`
- `POST /api/projects/{projectId}/landscaper/activities/{id}/mark-read/`
- `POST /api/projects/{projectId}/landscaper/activities/mark-all-read/`
- `POST /api/landscaper/extract-for-project`

### Runtime Configuration

- `NEXT_PUBLIC_DJANGO_API_URL` (used by the admin mappings UI)

## 10) Source References

- `docs/14-specifications/LANDSCAPER_CURRENT_STATE.md`
- `docs/09_session_notes/2025-12-19-landscaper-phase3-wiring.md`
- `docs/09_session_notes/PHASE_6_LANDSCAPER_CHAT_IMPLEMENTATION_COMPLETE.md`
- `docs/09_session_notes/2026-01-10-document-extraction-integration.md`

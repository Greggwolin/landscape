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

#### What extraction mappings are

An extraction mapping is a single instruction that tells Landscaper: *"When you see this label in this kind of document, pull the value out and file it here."*

Every time a document is uploaded — an offering memo, an appraisal, a rent roll, an operating statement — Landscaper scans it for patterns it recognizes. The list of patterns it recognizes **is** the set of extraction mappings. Each one connects a phrase on the page (like "Year Built" or "Cap Rate") to a specific home in the project's data.

The panel shows every mapping in the workspace and lets you add, adjust, switch off, or remove them. The Add Mapping window is where each individual instruction is written.

#### Why they matter

Mappings are the bridge between unstructured paper and a working model. Without a mapping for a given value, Landscaper has no instruction to capture it, so that value never makes it from the document into the project — even if it is printed in plain sight. With a good mapping, the value lands in the right place automatically and becomes available to every report, calculation, and answer Landscaper produces.

In short: mappings define **what Landscaper notices** in documents and **where it puts what it finds**.

#### Anatomy of a mapping

Each field in the Add Mapping window does a specific job:

- **Document Type** — the kind of document this rule applies to (Offering, Property Data, Operations, and so on). The rule only fires on documents of this type. Document types come from the DMS template setup.
- **Source Pattern** — the exact label Landscaper looks for on the page, e.g. "Year Built." This is the primary phrase. *Required.*
- **Source Aliases** — alternate phrasings that mean the same thing, e.g. "Built," "Construction Year." If documents word the same concept differently, list those variants so the rule still catches them.
- **Target Table / Target Field** — the destination: which record and which field the extracted value is written to. *Required.*
- **Data Type** — what kind of value to expect (Text, Integer, Decimal, Boolean, Date, JSON). The captured text is converted and validated to this type before it is saved.
- **Transform Rule** — an optional clean-up step applied before saving: Strip Currency ("$1,200" → 1200), Percent to Decimal ("9.5%" → 0.095), Parse Date, or Extract Number.
- **Applicable Tags** — optional. When set, the rule only fires for documents carrying a matching tag (like "Appraisal" or "LIHTC"). Left empty, it applies to every document of the chosen type.
- **Notes** — free-text reminder for whoever maintains the mapping. No effect on extraction.

#### Confidence and the write switches

Four controls decide how assertively Landscaper acts on what it finds.

**Confidence** sets how far Landscaper is allowed to go on its own:

- **High** — writes the value automatically, no review step.
- **Medium** — writes the value but flags it for review.
- **Low** — reports the value but does **not** write it; you decide.

**The three toggles:**

- **Auto Write** — when on, extracted values are written automatically. When off, the value is captured but held for manual confirmation rather than saved on its own.
- **Overwrite Existing** — when on, a newly extracted value replaces whatever is already in the field. When off (the default), Landscaper leaves an existing value untouched and won't clobber data already set.
- **Active** — the on/off switch for the whole rule. An inactive mapping is simply skipped during extraction. Turning it off does **not** remove any data already captured.

Rule of thumb: start new mappings at Medium confidence with Overwrite Existing off. Once a rule has captured values correctly a few times, promote it to High for hands-off extraction.

#### How a mapping is used

When a document is uploaded, each mapping goes through this sequence:

1. Landscaper identifies the document's type and any tags it carries.
2. It selects the mappings that apply — matching the document type, and matching tags if the mapping is tag-scoped.
3. It scans the text for each mapping's Source Pattern and its aliases.
4. When it finds a match, it converts the captured text to the mapping's Data Type and applies the Transform Rule if one is set.
5. It then acts according to Confidence and the write switches — auto-writing, flagging for review, or just reporting.

Changes apply going forward. Editing a mapping affects the **next** document Landscaper processes; it does not re-process documents already uploaded, and it does not retroactively change values already captured. To apply a new rule to an old document, re-process that document.

#### Adding, editing, and deleting mappings

- **Add** — creates a new rule. It takes effect the next time a document of its type is processed. Existing documents are not re-scanned automatically.
- **Edit** — changes the rule for future extractions. Previously captured data is left as it is.
- **Deactivate** — a soft off-switch. The rule is preserved but ignored during extraction. Reversible anytime; this is the safe way to stop a rule.
- **Delete** — permanently removes a custom rule. Any data it captured in the past stays in the project. Only mappings you created can be deleted.

**System vs. custom mappings.** Mappings that ship with Landscape are marked as system rules. They can be edited and deactivated but **not deleted**, so the built-in extraction set can't be lost by accident. Rules you add yourself can be deleted freely. To stop a system rule, deactivate it.

#### What happens if a document is deleted

This is the part most people get wrong, so it is worth stating plainly:

**Deleting a document does not undo what it taught Landscaper.** When you delete a document, the file itself is removed and the document record is retired. But any values that document already contributed to the project — the year built it filled in, the cap rate it set, the rents it loaded — **stay in place**. Extracted values become part of the project's data; they are not tethered to the document for automatic removal.

Why it works this way: once a value is in a field, reports and calculations depend on it. Pulling it out the moment a source document is deleted would silently break downstream numbers. So Landscape keeps the value and leaves the decision to remove or change it with you.

In practice:

- Deleting a document is safe — it won't wipe out the work already captured from it.
- If a document was wrong and you want its contributed values gone too, correct or clear those fields yourself; deleting the file alone won't do it.
- If you abandon a document mid-upload (cancel before committing), the in-progress, not-yet-saved extractions are discarded — that's different from deleting a fully processed document.

Two separate kinds of "delete": deleting a **mapping** removes a *rule* for future reading; deleting a **document** removes a *file*. Neither removes values already written into the project — those persist until you change them.

#### Common admin tasks

- Add a mapping: fill Source Pattern + Target Table/Field, choose Document Type + Data Type.
- Disable a mapping: toggle Active off.
- Review low-confidence mappings: filter by Confidence = Low.
- See how often a rule fires: use the Stats view, which adds "Used" (times extracted) and "Write Rate" columns.
- Find a rule fast: use the search box and the type, table, confidence, and status filters.

### 2.3 How extraction feeds Landscaper's knowledge

Mappings and "knowledge" are two different systems, and the distinction is the whole point. **Mappings** are the narrow, precise path — a labeled value on a page goes to one specific field on a project record. **Knowledge** is the broader memory that builds up on its own, as a byproduct, and feeds the project knowledge panel. You are not expected to hand-curate that panel; it fills itself.

#### The two layers of knowledge

- **Facts.** Whenever a mapping captures a meaningful number — cap rate, vacancy, rent, NOI, and the like — Landscape doesn't just file the value. It also records a *fact*: this number, which document it came from, and how confident it is. This is the project knowledge panel filling itself, automatically, every time a document is extracted.
- **Searchable memory.** The full text of every document is broken up and indexed so Landscaper can recall passages by meaning, not just by exact wording. This is what lets it answer "what did the appraisal say about concessions" without you pointing at the file.

#### How data in existing projects contributes

Every extraction does double duty. It writes the value into the project, **and** it seeds both the fact and the searchable memory. It also works across projects: when you ask something that spans deals, Landscaper can pull facts and passages from your other projects, not only the one you are standing in. A rent comp captured in one deal can inform reasoning in another.

#### Documents not tied to a project

Market studies, scholarly articles, and the foundational appraisal texts live in a separate **reference layer**. They get indexed into searchable memory the same way, so Landscaper can lean on them for methodology and market context — but they **never write values into any project**. There is no field for a scholarly article to land in, and mappings don't apply to them. They shape how Landscaper *reasons*, not what gets *recorded*.

The one line to hold onto: project documents add both **records and reasoning**; reference documents add **reasoning only**. Mappings drive the records; knowledge accumulates from both.

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

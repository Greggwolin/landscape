# Unified Document Intake — Design Spec v2

**Date:** 2026-03-17
**Status:** Approved for implementation
**Replaces:** StagingTray + IntakeChoiceModal + LandscaperPanel.uploadFiles

---

## Problem Statement

Document upload has 4 entry points with inconsistent behavior, competing routing logic (Extract/Library/Reference vs structured_ingestion/global_intelligence/dms_only), and missing auth headers on some paths. The Library button is a stub and Reference silently runs RAG without user awareness.

## Design: Single Unified Intake Flow

### Three Intents

| Intent | Button Label | What Happens | Destination |
|---|---|---|---|
| `structured_ingestion` | **Extract Inputs** | Extract fields → Workbench review → commit to project tables | Project DMS + Workbench |
| `project_knowledge` | **Project Knowledge** | Store in project DMS + RAG pipeline (text → chunks → embeddings) | Project DMS + Knowledge Base |
| `platform_knowledge` | **Platform Knowledge** | RAG pipeline only, not stored in any project's DMS | Platform Knowledge Base |

### Flow

```
Any drop/upload (anywhere in project)
  │
  └─ Unified Intake Modal opens (files NOT yet uploaded)
       │
       ├─ Per-file analysis (parallel):
       │    • classifyFile() → doc type + confidence + default intent
       │    • generateSha256() → collision check
       │
       ├─ User reviews/overrides per-file:
       │    • Doc type (from project template)
       │    • Intent (Extract Inputs / Project Knowledge / Platform Knowledge)
       │    • "Set all to" batch shortcut
       │
       ├─ User clicks "Upload N Documents"
       │    • UploadThing upload (silent)
       │    • POST /api/dms/docs with intent + auth headers
       │
       └─ Post-upload dispatch (per file):
            ├─ Extract Inputs → intake/start → extract-batched → Workbench
            ├─ Project Knowledge → Knowledge Metadata Modal → RAG pipeline
            └─ Platform Knowledge → Platform Metadata Modal → RAG pipeline
```

### Knowledge Metadata Modals

After upload completes, files routed to Project Knowledge or Platform Knowledge get a lightweight metadata modal. Landscaper does a quick skim (first 3-5 pages) and pre-populates suggestions.

**Project Knowledge Modal:**
- AI summary of document content (highlighted entities)
- Doc type (from `dms_project_doc_types` for active project) — AI suggested
- Tags — AI suggested from content
- Notes — pre-filled with AI summary, editable
- "What happens next" confirmation

**Platform Knowledge Modal:**
- AI summary of document content
- Knowledge category (Market Research, Cap Rates, Construction Costs, etc.)
- Applicable property types (MF, Office, Retail, etc.) — AI suggested
- Geographic scope + time period — AI suggested
- Tags — AI suggested from content
- Notes — pre-filled, editable
- "What happens next" confirmation + yellow warning "not in project files"

### Two-Line Intent Buttons

Each file row has three toggle buttons:
```
[Extract  ] [Project   ] [Platform  ]
[Inputs   ] [Knowledge ] [Knowledge ]
```
- Indigo (#4f46e5) for Extract Inputs
- Teal (#0891b2) for Project Knowledge
- Purple (#7c3aed) for Platform Knowledge
- Tooltip on hover with full description

### Collision Handling

- SHA256 content match → "Exact duplicate" warning, version save or discard
- Filename match → "V{n} exists, saving as new version" warning
- Intent selector disabled on collision rows

### Batch Controls

- "Set all to" buttons in header bar
- Destination summary pills: "📂 3 → Project" / "🧠 1 → Platform"
- Individual overrides after batch set

## Components to Retire

| Component | File | Action |
|---|---|---|
| StagingTray UI | `UploadStagingContext.tsx` | Remove staging tray rendering |
| StagingRow | `src/components/dms/staging/StagingRow.tsx` | Delete |
| UploadStagingContext | `src/contexts/UploadStagingContext.tsx` | Delete (logic absorbed into useIntakeStaging) |
| Old IntakeChoiceModal | `src/components/intelligence/IntakeChoiceModal.tsx` | Replace with UnifiedIntakeModal |
| LandscaperPanel.uploadFiles | `src/components/landscaper/LandscaperPanel.tsx` | Remove upload logic, UploadThing hook, file drop consumption |
| Extract/Library/Reference buttons | StagingRow.tsx | Deleted with StagingRow |

## Components to Create

| Component | File | Purpose |
|---|---|---|
| UnifiedIntakeModal | `src/components/intake/UnifiedIntakeModal.tsx` | Main modal — file staging + intent selection + upload |
| IntakeFileRow | `src/components/intake/IntakeFileRow.tsx` | Per-file row with intent buttons |
| ProjectKnowledgeModal | `src/components/intake/ProjectKnowledgeModal.tsx` | Post-upload metadata for project knowledge |
| PlatformKnowledgeModal | `src/components/intake/PlatformKnowledgeModal.tsx` | Post-upload metadata for platform knowledge |
| useIntakeStaging | `src/hooks/useIntakeStaging.ts` | SHA256, collision check, classification, upload orchestration |

## Components to Modify

| Component | Change |
|---|---|
| FileDropContext | Route to UnifiedIntakeModal instead of LandscaperPanel |
| DropZoneWrapper | No change — still feeds FileDropContext |
| WorkbenchContext | No change — UnifiedIntakeModal calls openWorkbench() |
| DMSView | "Upload Documents" button opens UnifiedIntakeModal |
| LandscaperPanel | Remove all upload logic; keep chat + activity feed |
| ProjectLayoutClient | Mount UnifiedIntakeModal + knowledge modals at layout level |

## API Contracts (No Changes)

- `POST /api/dms/docs` — create doc record (with auth headers)
- `POST /api/intake/start/` — create intake session
- `POST /api/knowledge/documents/{doc_id}/extract-batched/` — trigger extraction
- UploadThing route at `/api/uploadthing` — file storage

## Key Decisions

1. UploadThing upload happens AFTER user confirms, not before modal opens
2. Per-file intent selection (not batch-only)
3. Batch "Set all to" shortcut for common case
4. Collision detection runs during analysis phase, before upload
5. Workbench opens for first Extract Inputs file; additional files queue
6. Library route removed (was a stub)
7. Knowledge modals get AI-suggested metadata from quick document skim
8. Doc type picklist fed from `dms_project_doc_types` for active project
9. No scope selector — Landscaper determines relevance from content + embeddings

## Success Criteria

1. [ ] Any file drop anywhere on project pages opens UnifiedIntakeModal
2. [ ] DMSView "Upload Documents" button opens UnifiedIntakeModal
3. [ ] Per-file intent selection works (Extract Inputs / Project Knowledge / Platform Knowledge)
4. [ ] Batch "Set all to" shortcut works
5. [ ] SHA256 + filename collision detection works per file
6. [ ] Extract Inputs files open Workbench after upload
7. [ ] Project Knowledge files show metadata modal then trigger RAG
8. [ ] Platform Knowledge files show metadata modal then trigger RAG (no project DMS)
9. [ ] Knowledge modals show AI-suggested tags, doc type, summary
10. [ ] Old components retired (StagingTray, StagingRow, UploadStagingContext, old IntakeChoiceModal)
11. [ ] LandscaperPanel no longer has upload responsibility
12. [ ] Auth headers included on all API calls
13. [ ] No regressions in Workbench field review + commit flow

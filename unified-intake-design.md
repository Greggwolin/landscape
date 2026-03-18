# Unified Document Intake — Design Spec

**Date:** 2026-03-17
**Status:** Draft for review
**Replaces:** StagingTray + IntakeChoiceModal (two separate systems)

---

## Problem Statement

Document upload currently has 4 entry points with inconsistent behavior:

| Entry Point | Pipeline | Intent Routing | Collision Check |
|---|---|---|---|
| Drag anywhere on project page | FileDropContext → LandscaperPanel.uploadFiles → IntakeChoiceModal (sometimes) | Post-upload, batch only | No |
| DMSView "Upload Documents" button | UploadStagingContext → StagingTray → IntakeChoiceModal (Extract only) | Pre-upload via Extract/Library/Reference buttons | Yes (SHA256 + filename) |
| Drop on Landscaper panel | LandscaperPanel.uploadFiles → IntakeChoiceModal (sometimes) | Post-upload, batch only | No |
| StagingTray "Extract" confirm | UploadStagingContext → IntakeChoiceModal → Workbench | Implied by button choice | Already done |

This creates confusion: the same file dropped in different places gets different UI flows, different collision handling, and different intent routing. The Library button is a stub. Reference silently runs RAG without telling the user.

## Design: Single Unified Intake Modal

### Principle

Every upload — regardless of where the file is dropped — goes through one modal that handles staging, collision detection, per-file intent selection, and dispatch.

### Flow

```
Any drop/upload (anywhere in project)
  │
  ├─ Phase 1: UploadThing (file storage — silent, no UI)
  │
  └─ Phase 2: Unified Intake Modal opens
       │
       ├─ File list with per-file:
       │    • Status (analyzing → ready → uploading → complete → error)
       │    • Collision detection (SHA256 + filename)
       │    • Doc type classification + override dropdown
       │    • Intent selector (3 options per file)
       │    • Remove button
       │
       ├─ Batch actions:
       │    • "Set all to [intent]" shortcut
       │    • "Upload All" button
       │    • Cancel
       │
       └─ Post-upload dispatch (per file, based on intent):
            ├─ Structured Ingestion → intake/start → Workbench
            ├─ Knowledge Base → intake/start → RAG pipeline (fire-and-forget)
            └─ DMS Only → doc record created, no processing
```

### What the Modal Absorbs

**From StagingTray / UploadStagingContext:**
- Multi-file list with per-file status state machine (analyzing → ready → uploading → complete → error)
- SHA256 collision detection + filename match
- Doc type auto-classification via `classifyFile()` + confidence badge
- Per-file doc type override dropdown
- Remove/discard per file
- Version save flow for collision matches

**From IntakeChoiceModal:**
- Three intent options: Structured Ingestion, Knowledge Base (was "Global Intelligence"), DMS Only
- Detected doc type badge display
- intake/start API call with intent
- Workbench open trigger for structured ingestion
- Fire-and-forget extraction trigger for knowledge base

### Per-File Intent Selector

Each file row gets an intent selector replacing StagingTray's Extract/Library/Reference buttons:

| Intent | Label | Description | Backend Action |
|---|---|---|---|
| `structured_ingestion` | **Extract** | Extract fields → Workbench review → commit to project | `intake/start` → `extract-batched` → open Workbench |
| `global_intelligence` | **Knowledge** | Broad extraction to knowledge base | `intake/start` → RAG pipeline (fire-and-forget) |
| `dms_only` | **Store** | Save to DMS, no processing | Create `core_doc` record only |

Default intent is auto-assigned based on `classifyFile()`:
- Rent rolls, T-12s, OMs → `structured_ingestion`
- Appraisals, market studies → `global_intelligence`
- Surveys, legal docs, images → `dms_only`

User can override per file before confirming.

### Collision Handling

Stays the same as current StagingTray behavior:
- SHA256 match → "Exact duplicate of V{n}" warning, option to save as new version or discard
- Filename match only → "V{n} already exists — saving as new version" warning
- Intent selector disabled on collision rows (version save only)

### Batch Convenience

When multiple files are staged:
- Header row shows "Set all to: [Extract] [Knowledge] [Store]" quick-set buttons
- Individual per-file overrides still available after batch set
- "Upload All" processes all ready files; skips errored/removed files
- Files that complete with `structured_ingestion` intent queue for Workbench (first one opens immediately, rest queued)

### Modal Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Documents to [Project Name]                     [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Set all to:  [Extract]  [Knowledge]  [Store]               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📊 Costar_MF_partial.xlsx    Property Data  Med         ││
│  │    12.4 KB                   [Extract ▪] [Knowledge] [Store]  [Remove] ││
│  │                                                         ││
│  │ 📄 Chadron_Appraisal.pdf    Appraisal      High        ││
│  │    2.1 MB                   [Extract] [Knowledge ▪] [Store]  [Remove] ││
│  │                                                         ││
│  │ 📄 Title_Report.pdf         Legal           Low         ││
│  │    890 KB                   [Extract] [Knowledge] [Store ▪]  [Remove] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│                              [Cancel]  [Upload 3 Documents] │
└─────────────────────────────────────────────────────────────┘
```

## Components to Retire

| Component | Action |
|---|---|
| `StagingTray` (in UploadStagingContext) | Remove — staging UI moves into Unified Intake Modal |
| `StagingRow` | Remove — row rendering absorbed into new modal |
| `UploadStagingContext` | Remove — state management absorbed into new modal or simplified context |
| Old `IntakeChoiceModal` | Replace with Unified Intake Modal |
| `FileDropContext` | Keep but simplify — routes all drops to Unified Intake Modal instead of LandscaperPanel |
| LandscaperPanel.uploadFiles | Remove upload logic — LandscaperPanel consumes from FileDropContext which now routes to Unified Intake Modal |
| Extract/Library/Reference route buttons | Remove — replaced by per-file intent selector |

## Components to Create/Modify

| Component | Action |
|---|---|
| `UnifiedIntakeModal` | New — replaces both StagingTray and IntakeChoiceModal |
| `IntakeFileRow` | New — replaces StagingRow with intent selector |
| `useIntakeStaging` | New hook — absorbs UploadStagingContext logic (SHA256, collision, classification) |
| `FileDropContext` | Modify — route to UnifiedIntakeModal instead of LandscaperPanel |
| `WorkbenchContext` | Keep as-is — still bridges intake → workbench |
| `DropZoneWrapper` | Keep as-is — still catches drops, feeds FileDropContext |
| `DMSView` | Modify — "Upload Documents" button opens UnifiedIntakeModal directly |
| `LandscaperPanel` | Modify — remove uploadFiles, remove UploadThing hook, remove IntakeChoiceModal rendering |

## Upload Pipeline (Unified)

```
1. File(s) enter system (any entry point)
2. UnifiedIntakeModal opens
3. Per-file analysis runs in parallel:
   a. classifyFile() → doc type + confidence + default intent
   b. generateSha256() → hash
   c. Collision check against existing core_doc records
4. User reviews/overrides doc types and intents
5. User clicks "Upload All"
6. Per file:
   a. Upload to UploadThing (with x-project-id, x-workspace-id headers)
   b. POST /api/dms/docs with intent + auth headers
   c. Dispatch based on intent:
      - structured_ingestion → POST intake/start → POST extract-batched → open Workbench
      - global_intelligence → POST intake/start (fire-and-forget RAG)
      - dms_only → done (doc record already created in step b)
7. Update file row status (complete/error)
8. Auto-close after all complete (1.5s delay)
```

## Key Decisions

1. **UploadThing upload happens AFTER user confirms** — not before the modal opens. This avoids orphaned uploads from cancels.
2. **Per-file intent, not batch** — users can mix extract + knowledge + store in one drop.
3. **Batch shortcut available** — "Set all to X" for the common case where all files have same intent.
4. **Collision detection runs during analysis phase** — before upload, not after.
5. **Workbench opens for first structured_ingestion file** — additional extract files queue (Workbench handles one doc at a time).
6. **Library route removed** — was a stub. Cost library integration can be added as a fourth intent later when backend exists.

## Downstream Impact

| Area | Impact |
|---|---|
| LandscaperPanel | Loses upload responsibility. Becomes chat-only + activity feed. |
| DMSView | "Upload Documents" button triggers UnifiedIntakeModal instead of file input + StagingTray |
| DropZoneWrapper | No change — still catches drops, feeds FileDropContext |
| FileDropContext | Simplified — instead of LandscaperPanel consuming files, UnifiedIntakeModal does |
| WorkbenchContext | No change — UnifiedIntakeModal calls openWorkbench() same as IntakeChoiceModal did |
| Django intake/start endpoint | No change — same API contract |
| UploadThing route handler | No change — same middleware/upload flow |
| core_doc records | No change — same POST /api/dms/docs contract |
| RAG pipeline | No change — same fire-and-forget trigger |
| Landscaper ingestion tools | No change — Workbench flow identical once opened |

## Success Criteria

1. [ ] Any file drop anywhere on project pages opens UnifiedIntakeModal
2. [ ] DMSView "Upload Documents" button opens UnifiedIntakeModal
3. [ ] Per-file intent selection works (Extract / Knowledge / Store)
4. [ ] Batch "Set all to" shortcut works
5. [ ] SHA256 + filename collision detection works per file
6. [ ] Structured Ingestion files open Workbench after upload
7. [ ] Knowledge Base files trigger RAG pipeline without Workbench
8. [ ] DMS Only files create core_doc record with no processing
9. [ ] StagingTray, StagingRow, old IntakeChoiceModal, UploadStagingContext are removed
10. [ ] LandscaperPanel no longer has upload responsibility
11. [ ] No regressions in Workbench field review + commit flow
12. [ ] Auth headers included on all API calls

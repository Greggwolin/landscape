# Nullable FK Hardening Plan (Phase 1: DMS/Core Doc)

Date: 2026-01-06
Source schema: docs/schema/landscape_rich_schema_2026-01-06.json
DB row counts: unavailable in this environment (null_count = unknown)

## Scope
- core_doc
- core_doc_folder_link
- dms_extract_queue
- doc_processing_queue
- ai_ingestion_history
- ai_extraction_staging

## Guiding Principles
- Workspace is the primary permission boundary for DMS records.
- Project/phase/parcel are optional scoping dimensions unless a rule explicitly requires them.
- Do not enforce NOT NULL without a deterministic backfill path.
- Conditional constraints should be enforced at the application/service layer first.

## FK Inventory and Recommendations

### core_doc
| Column | References | Nullable | Null Count | Usage Evidence | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| workspace_id | dms_workspaces.workspace_id | YES | Unknown | src/lib/dms/db.ts, src/lib/dms/indexer.ts, src/app/api/dms/docs/route.ts | NOT NULL (after backfill) | Every document must belong to a workspace boundary. |
| project_id | tbl_project.project_id | YES | Unknown | src/lib/dms/db.ts, src/lib/dms/indexer.ts | Conditional | Required when phase_id or parcel_id is set. Optional for global/non-project docs. |
| phase_id | tbl_phase.phase_id | YES | Unknown | src/lib/dms/db.ts | Conditional | Require project_id if phase_id is set. |
| parcel_id | tbl_parcel.parcel_id | YES | Unknown | src/lib/dms/db.ts | Conditional | Require project_id if parcel_id is set. |
| parent_doc_id | core_doc.doc_id | YES | Unknown | src/lib/dms/db.ts, src/lib/dms/indexer.ts | Legitimately optional | Root documents have no parent. |

### core_doc_folder_link
| Column | References | Nullable | Null Count | Usage Evidence | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| doc_id | core_doc.doc_id | NO | N/A | src/lib/dms/indexer.ts, src/app/api/dms/docs/[id]/move/route.ts | Already enforced | Link rows are meaningless without a document. |
| folder_id | core_doc_folder.folder_id | NO | N/A | src/lib/dms/indexer.ts, src/app/api/dms/docs/[id]/move/route.ts | Already enforced | Link rows are meaningless without a folder. |

### dms_extract_queue
| Column | References | Nullable | Null Count | Usage Evidence | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| doc_id | core_doc.doc_id | YES | Unknown | src/lib/dms/indexing.ts, backend/apps/documents/api/section_detection.py | Conditional | Queue items should reference a document when extract_type requires a doc. Allow NULL only for system/global extract jobs if they exist. |

### doc_processing_queue
| Column | References | Nullable | Null Count | Usage Evidence | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| doc_id | core_doc.doc_id | NO | N/A | backend/apps/documents/api/section_detection.py | Already enforced | Processing is document-scoped. |

### ai_ingestion_history
| Column | References | Nullable | Null Count | Usage Evidence | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| project_id | tbl_project.project_id | NO | N/A | backend/apps/knowledge/services/document_classifier.py | Already enforced | Ingestion history is project-scoped. |

### ai_extraction_staging
| Column | References | Nullable | Null Count | Usage Evidence | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| doc_id | core_doc.doc_id | YES | Unknown | backend/apps/knowledge/services/extraction_service.py | Legitimately optional | Staging can hold extracted data before a doc record exists. |
| project_id | tbl_project.project_id | NO | N/A | backend/apps/knowledge/services/extraction_service.py | Already enforced | Staging rows are project-scoped in current schema. |

## Recommended Hardening Actions

### 1) core_doc.workspace_id → NOT NULL (after backfill)
- **Backfill plan:**
  1. Ensure a default workspace exists (name: "Default Workspace") in `dms_workspaces`.
  2. UPDATE core_doc SET workspace_id = <default_workspace_id> WHERE workspace_id IS NULL;
  3. ALTER TABLE core_doc ALTER COLUMN workspace_id SET NOT NULL;
- **Rollback:**
  - ALTER TABLE core_doc ALTER COLUMN workspace_id DROP NOT NULL;

**Status:** Do not execute without DB counts. Requires safe backfill and confirmation of default workspace semantics.

### 2) Conditional constraints (application/service layer)
- Enforce: if `core_doc.phase_id` OR `core_doc.parcel_id` is set, `core_doc.project_id` must be set.
- Enforce: `dms_extract_queue.doc_id` required for doc-based extract jobs (by extract_type).

## Optional Migration (only if DB access confirms safe backfill)
If null_count for core_doc.workspace_id is known and backfill is deterministic, create:
- `migrations/047_core_doc_workspace_not_null.sql`
  - Create or fetch default workspace
  - Backfill NULL workspace_id
  - ALTER COLUMN SET NOT NULL
  - Commented verification query:
    - SELECT count(*) FROM landscape.core_doc WHERE workspace_id IS NULL;

## Open Questions / Data Checks
- Are there legitimate core_doc records meant to be workspace-less?
- How many NULL workspace_id rows exist today?
- Are there DMS extract queue jobs that do not reference a doc (and if so, by extract_type)?

## Next Steps
1) Run a DB audit to get row_count and null_count for each FK.
2) Confirm default workspace semantics and whether it should be global or per project.
3) Implement conditional checks in service layer before enforcing NOT NULL.

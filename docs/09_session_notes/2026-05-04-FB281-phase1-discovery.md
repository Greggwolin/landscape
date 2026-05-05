# FB-281 — Phase 1 Discovery Audit Report

**Session:** LSCMD-FB281-DISC-0504-Tr1
**Date:** 2026-05-04
**Branch:** `chat-artifacts`
**HEAD at audit time:** `1b87f45` (HEAD shifted twice during the audit from parallel sessions: `9c22396` → `43a9acd` → `1b87f45`. All read-only queries were re-rooted as drift occurred; findings reflect the working-tree state at completion.)
**Working-tree state:** dirty (parallel-session work; non-blocking for read-only audit). Files modified at audit time: `backend/apps/financial/views_operations.py`, `backend/apps/landscaper/ai_handler.py` ⚠️, `backend/apps/landscaper/tool_executor.py`, `backend/apps/landscaper/tools/vocab_tools.py`, `docs/daily-context/session-log.md`, `logs/daily-brief.err`, `src/components/wrapper/ProjectArtifactsPanel.tsx`, `src/components/wrapper/WrapperSidebar.tsx`, `src/styles/wrapper.css`, `tests/agent_framework/manifests/s16_operating_statement.json`, `tests/agent_framework/scenario_s16.py`. Three untracked daily-sync markdown files in `docs/09_session_notes/`. ⚠️ marks files whose audit findings are working-tree-state (see §5).

---

## 1. Regression timeline

**Headline finding: there is no "prior fix" to regress from.** The strict-list-on-upload gate Gregg remembers being "fixed before" was never wired up at upload time. What exists today is a partially-built strict-list **infrastructure** that several commits incrementally improved, paired with a **separate** classification-and-write pipeline that has always carried silent fallbacks.

| Commit | Date | What it shipped | Relationship to FB-281 |
|---|---|---|---|
| `911de74` | 2025-09-19 | Initial Next.js commit | Introduced `src/lib/dms/uploadthing.ts:43` `\|\| "general"` middleware fallback (site #3). Has been there since day 0. |
| `3d65cb1` | 2025-10-22 | Django Phase 3 — Additional Model Definition | Original migration `0001_initial.py:86` introduced `doc_type = models.CharField(default='general', max_length=100)` (site #4). Has been there since the Django model was first defined. |
| `100d599` | 2025-10-29 | DMS-TAG-001 (tag-based DMS, simplified profile schema) | Refactored DMS UI from folder-based to filter-based; introduced `dms_project_doc_types` and `dms_templates` tables, but did NOT enforce strict-list-on-upload. |
| `bfc6da1` | 2026-02-20 | DMS dropzone simplification + `UploadStagingContext` | Created `UploadStagingContext.tsx` with the docstring claiming *"requires explicit user confirmation before any file is written to the server"* but shipped with `staged.userDocType \|\| staged.classifiedDocType \|\| 'General'` at line 276 (site #1). **Conceptual gate, never enforced.** |
| `1fa7915` | 2026-02-23 | Seed doc types on project creation, read from project-owned table | Built the **strict-list infrastructure** (`dms_project_doc_types`) and seeded all 18 then-active projects from `dms_templates`. Resolution rule per migration: `tbl_project.dms_template_id` → `dms_templates.is_default = TRUE` workspace fallback. **Did not wire the resolved list into upload-time enforcement.** |
| `9cb5b7f` | 2026-03-?? | Make DMS doc_type folders permanent via DB auto-registration | (Implied by the commit message and confirmed by code grep — see §6.d.) Added an auto-register-on-upload behavior that INSERTs unknown `doc_type` values back into `dms_project_doc_types` with `is_from_template=false`. **This actively widens the "strict" list whenever an upload bypasses it**, masking the gap. |
| `dfe8587` | 2026-04-03 | DMS improvements — doc type combobox, tag views, ingestion workbench updates | Added the IntakeChoiceModal `<select>` populated from `/api/dms/projects/{id}/doc-types/`. Pre-fills `selectedDocType` from the auto-classified value (line 74), allows non-list selection ("if auto-detected type isn't in project types, show it as an option"), and consume sites at lines 92 / 144 fall back to `selectedDocType \|\| doc.docType`. **Surfaces a strict-list dropdown without enforcing membership.** |
| `0dab080` | 2026-04-08 | Remount UploadStagingProvider on project change (Bug 3 from 2026-04-05 discovery) | Adjacent fix; not the FB-281 gate. Confirms the staging area has been actively iterated on without addressing strict-list-on-upload. |
| `35114d7` | 2026-04-21 | Add 4 DMS management tools to Landscaper (`update_document_profile`, `rename_document`, `move_document_to_folder`, `reprocess_document`) | Post-hoc correction tools — workaround, not a fix. Lets a user/LS turn flip the doc_type after the fact. |

**Narrative.** The strict-list infrastructure (`dms_project_doc_types`) was built over Feb–Apr 2026 and is healthy: 100% of active projects have populated lists (see §4). But upload-time enforcement was never written. `UploadStagingContext` was authored with a comment claiming explicit-confirmation discipline, then shipped with a literal `'General'` fallback. The IntakeChoiceModal `<select>` was added to *expose* the strict list to the user but accepts a non-list value through a fallback chain. The auto-register-on-upload behavior introduced in `9cb5b7f` actively broadens the strict list whenever an upload smuggles in an unknown value, hiding the symptom by making every fabricated value retroactively "valid."

**No regression-relaxing commit exists.** Pickaxe searches on each fallback string (`|| 'General'`, `|| "general"`, `default='general'`, `selectedDocType || doc.docType`, `userDocType || staged.classifiedDocType`) confirmed each silent-fallback string was introduced at the indicated commit and **has never been removed**. There is no single commit that added a gate, no single commit that took it away. The "fix" Gregg remembers is most plausibly his memory of the `dfe8587` dropdown (which *looks* like a gate) or the `1fa7915` strict-list infrastructure (which *feels* like the prerequisite for a gate but stops short).

**Test coverage.** Zero tests exist for upload-time profile gating. Searches under `tests/`, `tests/agent_framework/`, and `backend/apps/*/tests/` for `*upload*`, `*profile*`, `*classify*`, `*intake*`, `*staging*` returned no project-side files (only an unrelated `test_profile.py` inside an IPython venv). Absence of regression tests is itself a Phase 2 deliverable.

---

## 2. Four fallback sites in HEAD

All four sites match the Cowork preflight exactly. No line drift, no code drift.

| # | File | Line(s) | Code | Matches preflight? |
|---|---|---|---|---|
| 1 | `src/contexts/UploadStagingContext.tsx` | 276 | `const effectiveDocType = staged.userDocType \|\| staged.classifiedDocType \|\| 'General';` | ✅ exact |
| 2a | `src/components/intelligence/IntakeChoiceModal.tsx` | 92 | `const docTypeToUse = selectedDocType \|\| doc.docType;` | ✅ exact |
| 2b | `src/components/intelligence/IntakeChoiceModal.tsx` | 144 | `document_type: selectedDocType \|\| doc.docType,` | ✅ exact |
| 3 | `src/lib/dms/uploadthing.ts` | 43 | `const docType = req.headers.get("x-doc-type") \|\| "general";` | ✅ exact |
| 4 | `backend/apps/documents/models.py` | 61 | `doc_type = models.CharField(max_length=100, default='general')` | ✅ exact |

**Important caveat from §6.d below:** there are at least **six additional fabrication sites** Cowork did not flag (see §6.d). The Cowork four-site model is incomplete.

**Important caveat about site #2b:** IntakeChoiceModal does NOT write to `core_doc.doc_type` directly. Lines 92 and 144 send `document_type` as the body of `POST /api/intake/start/` — that field seeds the **extraction/intake staging system**, not `core_doc.doc_type`. The `core_doc.doc_type` value was already set by the prior `POST /api/dms/docs` call (which used `effectiveDocType` from site #1). So the IntakeChoiceModal fallback affects which extraction template runs, not which doc_type lands on the row. Phase 2 must still close it (it's a strict-list bypass for extraction targeting), but the framing matters: it's a parallel discriminator path, not a direct write to core_doc.

---

## 3. Upload-path map

The "when a doc is uploaded" surface area is broader than 4 paths. Below is every distinct path that lands a row in `core_doc`, plus follow-ups that affect the discriminator.

| # | Upload path | Entry-point file | Hits site #1 (`UploadStagingContext`) | Hits site #2 (`IntakeChoiceModal`) | Hits site #3 (`uploadthing.ts:43`) | Hits site #4 (`models.py` default) | Other fabrication site? | Notes |
|---|---|---|---|---|---|---|---|---|
| a | Legacy DMS modal drop on `/projects/[id]` | `src/app/projects/[projectId]/ProjectLayoutClient.tsx` (mount), `src/components/dms/upload/Dropzone.tsx` (drop) | **YES** — `effectiveDocType` (line 276) is the source of `doc_type` written to `core_doc` via `POST /api/dms/docs` | conditionally — only if `route='extract'` causes the modal to open afterwards (modal does not write `core_doc.doc_type`; see §2 caveat) | bypassed — staging context sends header `'staged'`, but client overrides `serverData.doc_type` with `effectiveDocType` in the POST body | bypassed by Next.js INSERT explicitly setting `doc_type` | server-side fallback in `/api/dms/docs:273` uses `${system.doc_type ?? 'general'}` — would fire only if the client payload omits `doc_type`. Today the staging path always includes it. | The dominant DMS upload path. |
| b | Chat-first DMS modal drop on `/w/projects/[projectId]` | `src/app/w/projects/[projectId]/documents/page.tsx` (mount) | YES (same context) | conditionally | bypassed | bypassed | same caveat as (a) | Chat-first equivalent of (a). Same `UploadStagingProvider`, different host. |
| c | Chat-canvas drop on `/w/chat/[threadId]` (project-scoped) | `src/components/wrapper/CenterChatPanel.tsx` (line 316) | bypassed (does not use UploadStagingContext) | bypassed | bypassed (header set to `'Financial Model'`) | bypassed | **YES — hardcoded `'Financial Model'` at line ~320 (header) and in `/api/dms/docs` body**. Project's strict list is not consulted. | Excel-audit drop on chat canvas. Always lands `'Financial Model'` regardless of project strict list. |
| d | Chat-canvas drop on `/w/chat/` (unassigned, no project) | `src/components/wrapper/CenterChatPanel.tsx` (auto-creates thread first via `ensureUnassignedThread`) | bypassed | bypassed | bypassed (header set) | bypassed | **YES — same `'Financial Model'` hardcode**, plus `core_doc.thread_id` is set instead of `project_id`. Strict list is undefined for thread-scoped uploads (see Open Question 3 in §6). | Pre-project Excel drop. |
| e | Legacy LandscaperPanel Excel drop on `/projects/[id]` | `src/components/landscaper/LandscaperPanel.tsx` (line 111) | bypassed | bypassed | bypassed | bypassed | **YES — `'Financial Model'` hardcoded at line 115 + line ~146 in payload to `/api/dms/docs`** | Same as (c) but on the legacy surface. |
| f | "Send" path via `useIntakeStaging` (used by `UnifiedIntakeModal`) | `src/hooks/useIntakeStaging.ts` (line 116) | bypassed | bypassed | bypassed (header set to `'Property Data'`) | bypassed | **YES — `'Property Data'` hardcoded at line 120**. The hook's actual write to `/api/dms/docs` requires further trace; data shows 85 rows with `doc_type='Property Data'` in production, suggesting heavy use. | Independent staging path with its own hardcoded discriminator. |
| g | Direct `/api/dms/upload` (onboarding modal & "other flows") | `src/app/api/dms/upload/route.ts` (line 44 — direct REST, no uploadthing middleware) | n/a | n/a | n/a (different path) | bypassed by direct INSERT setting `doc_type` from form-data | **YES — `(formData.get('doc_type') as string) \|\| 'Misc'` at line 44**. Different default than the others. Production data shows 8 active rows with `'Misc'`. | Onboarding-flow upload. Different fallback string than every other path. |
| h | Legacy GIS project-creation upload | `src/app/components/GIS/ProjectDocumentUploads.tsx` (line ~649) | bypassed | bypassed | bypassed | bypassed | **YES — `doc_type: 'project_document'` hardcoded at line 649** | Active in the legacy GIS flow during project creation. |
| i | IntakeChoiceModal post-upload (NOT an upload path) | `src/components/intelligence/IntakeChoiceModal.tsx` | n/a — operates on already-uploaded doc | n/a (it IS this site) | n/a | n/a | sends `document_type: selectedDocType \|\| doc.docType` to `/api/intake/start/` — affects extraction staging, NOT `core_doc.doc_type` | Follow-up step after (a) or (b) when `route='extract'`. |
| j | Versioning: collision path → `POST /api/projects/[projectId]/dms/docs/[docId]/version` | called from `UploadStagingContext.tsx:293-300` | n/a — staging path triggers it but the version endpoint inherits/owns the discriminator semantics | n/a | n/a | inheritance presumed (route file path resolution failed during audit; not critical for Phase 1) | TBD | Phase 2 should verify version endpoint behavior. |
| k | Backend Django ingestion (`document_ingestion.ingest_document`) | `backend/apps/knowledge/services/document_ingestion.py:35` | n/a — operates on existing `core_doc` rows for chunking/embedding only | n/a | n/a | n/a — does not write `core_doc` | n/a | NOT a fabrication path — read-only chunking pipeline. |
| l | Knowledge library admin upload | `src/components/admin/knowledge-library/UploadDropZone.tsx` | bypassed | bypassed | TBD | TBD | TBD | Admin-scoped; may write to a separate library table rather than `core_doc`. Phase 1 did not deep-trace; Phase 2 should confirm. |

**Net:** at least 8 paths land rows in `core_doc`. Of those, only paths (a) and (b) consult the project's strict list at all (and even then, only as a UI dropdown that doesn't enforce membership). Paths (c), (d), (e), (f), (g), (h) write hardcoded or fallback values without consulting the strict list. Path (g) uses `'Misc'` as the fallback — different from the `'general'` used everywhere else, which is itself a sign of organic, uncoordinated growth.

---

## 4. Strict-list resolution chain

### 4.1 Infrastructure (current schema state)

| Table | Rows | Purpose | Property-type aware? | User-aware? |
|---|---|---|---|---|
| `landscape.dms_workspaces` | 1 (`W1` "Phased Development", `is_default=true`) | Workspace container | n/a | n/a |
| `landscape.dms_templates` | 5 (2 with `is_default=true`, all workspace-scoped, 0 project-scoped) | Template definitions: `template_name`, `workspace_id`, `project_id`, `doc_type`, `is_default`, `doc_type_options` (text[]), `description` | **NO** — there is no `property_type` column | **NO** — there is no `user_id` column |
| `landscape.dms_template_attributes` | (not enumerated; relationship: FK to `dms_templates`) | Template attribute definitions | n/a | n/a |
| `landscape.dms_project_doc_types` | **1309 rows** | Per-project strict list. Columns: `id`, `project_id`, `doc_type_name`, `display_order`, `is_from_template`, `created_at`. Unique on `(project_id, doc_type_name)`. | inherits from project | inherits from project |
| `landscape.tbl_property_use_template` | 3+ rows (`Standard MPC - 3 Level Hierarchy`, etc.) | **HIERARCHY templates** (Area/Phase/Parcel container structure), **NOT** doc-type templates. Has `property_type` column but the column is for hierarchy classification, not doc-type filtering. | yes (for hierarchy purposes) | n/a |
| `landscape.tbl_user_landscaper_profile` | per-user | **PERSONA settings** (role_primary, role_property_type, ai_proficiency, communication_tone, custom_instructions). **NOT** a doc-type template carrier. | n/a | yes (but irrelevant for doc-type templates) |
| `landscape.dms_profile_audit` | (audit log) | Audit trail for `core_doc.profile_json` mutations | n/a | n/a |

**Per-project strict-list distribution** (from `landscape.dms_project_doc_types`):

- 100% of active projects (14 / 14) have a populated strict list.
- Lists range from 6 to 13 entries per project.
- 1293 / 1309 (98.8%) of strict-list entries are `is_from_template=true` (seeded by the Feb-23 backfill or by project creation).
- 16 / 1309 (1.2%) are `is_from_template=false` (custom additions, including via the auto-register-on-upload behavior described in §6.d).

**Distinct values across all strict lists** (top 14 by project coverage):

```
Property Data          (125 projects)
Market Data            (125)
Correspondence         (125)
Agreements             (124)
Diligence              (121)
Misc                   (110)
Accounting             (108)
Leases                 (108)
Offering               (108)
Operations             (108)
Title & Survey         (108)
Entitlements            (16)
General                  (6)
Other                    (3)
Financial Model          (2)
Photos                   (2)
... (long-tail snake-case values like property_flyer, broker_survey on 1-3 projects each)
```

**Sample project strict list (Chadron, 13 entries):** Offering, Property Data, Market Data, Diligence, Agreements, Leases, Title & Survey, Operations, Correspondence, Accounting, Misc (all `is_from_template=true`), General, Financial Model (both `is_from_template=false` — added by the auto-register behavior). The two custom entries on Chadron exactly match the values we see fabricated by paths (e/c/d) (Financial Model) and the staging-context fallback (General/general).

### 4.2 Discriminators on `core_doc`

| Column | Type | Default | Nullable | Purpose | Indexed |
|---|---|---|---|---|---|
| `doc_type` | varchar(100) | `'general'` | NOT NULL | Primary discriminator. Routes extraction templates, surfaces in DMS filter UI, used by Landscaper tools to filter docs. | yes (`idx_core_doc_doc_type`) |
| `discipline` | varchar(100) | NULL | nullable | Secondary classifier (e.g., legal/financial/engineering). Mostly unused in current data. | no |
| `status` | varchar(50) | `'draft'` | nullable | Workflow status. Check constraint: draft/processing/indexed/failed/archived. | yes |
| `processing_status` | varchar(50) | `'pending'` | nullable | Extraction pipeline state. Check constraint: pending/queued/extracting/chunking/embedding/ready/failed/skipped. | yes |
| `media_scan_status` | varchar(20) | `'unscanned'` | nullable | Media-scan pipeline state. Check constraint enumerated. | yes (partial) |
| `priority` | varchar(20) | NULL | nullable | User-set priority. | no |
| `profile_json` | jsonb | `'{}'::jsonb` | nullable | Flexible classifier payload. Production data shows `tags[]`, `parties`, `doc_date`, `doc_type` (redundant duplicate), `description`, `dollar_amount`. | yes (GIN: `idx_core_doc_profile_json`) |
| `property_type` | varchar(10) | NULL | nullable | Property-type tag (e.g., LAND/MF). Likely propagates from project. | no |

**Data-integrity finding worth flagging to Phase 2:** `profile_json` contains its own `doc_type` field separate from the column. Sample row 121 (Chadron rent roll) has `doc_type='Agreements'` (column) but `profile_json.doc_type='Diligence'` (JSON) — the two disagree. `core_doc.doc_type` (column) is the authoritative discriminator (it's indexed and routes downstream); `profile_json.doc_type` is a redundant copy that has drifted out of sync. Phase 2 should either keep them in sync or drop the redundant JSON field.

### 4.3 Resolution-order audit (direct answers)

**a. Where is the per-property-type default profile template defined?**
**NOT IMPLEMENTED.** `dms_templates` has no `property_type` column. `tbl_property_use_template` is a *container hierarchy* template (Area/Phase/Parcel structure), not a doc-type template — different domain entirely. Gregg's described model ("default profile template by property type ... in admin panel") **does not have a corresponding schema construct in the database today.**

**b. Where is the per-user default profile template defined?**
**NOT IMPLEMENTED.** `dms_templates` has no `user_id` column. `tbl_user_landscaper_profile` carries persona settings (role, tone, AI proficiency, custom instructions) but no template reference. Gregg's described model ("user default ... in admin panel") **does not have a corresponding schema construct in the database today.**

**c. Which one wins when both are set? Is the precedence rule encoded in code?**
The precedence Gregg described ("by property type or user default") cannot be encoded today because neither dimension exists. The precedence rule that IS encoded (in the `1fa7915` migration) is:

1. `tbl_project.dms_template_id` (when set on the project) → use it
2. Else `landscape.dms_templates WHERE is_default = TRUE LIMIT 1` (workspace fallback) → use it
3. Else nothing (project has empty strict list)

**This rule is enforced only at project-creation time (and during the one-time backfill).** It does not run on upload.

Note: there are 2 templates flagged `is_default=true` and no uniqueness constraint — `LIMIT 1` resolves nondeterministically.

**d. How does the resolved template populate `dms_project_doc_types`?**
At project creation only (per `1fa7915` and confirmed by code: `src/app/api/projects/minimal/route.ts:232` does the INSERT). After project creation, `dms_project_doc_types` is **also** mutated by an auto-register-on-upload behavior (see §6.d) which inserts unknown `doc_type` values back into the list — silently widening it.

**e. Active-project coverage.**
14 / 14 active projects have a populated strict list. Zero coverage gap. Backfill is unnecessary.

### 4.4 Plain-English schema summary (for Gregg)

> The schema today encodes a strict-list system for doc types via `dms_project_doc_types` (a per-project list of allowed doc-type names) seeded at project creation from `dms_templates`. Templates today are scoped only by workspace, with an `is_default` flag — there is **no** per-property-type and **no** per-user default template anywhere in the schema. Every active project (14/14) has a populated strict list, but **41% of active project-scoped documents (124/304)** currently sit on a `doc_type` value that is NOT on their project's strict list, because every upload path bypasses the list and writes whatever the classifier or hardcoded fallback produced. An auto-register-on-upload behavior then silently adds those off-list values back into `dms_project_doc_types`, masking the gap.

### 4.5 Production violation quantification (the actual regression)

```
Active core_doc rows with project_id:    304
Of those, doc_type NOT on strict list:   124  (40.8%)
```

Breakdown of off-list values (active rows only, by count):

| doc_type | count | source path |
|---|---|---|
| `offering_memo` | 46 | classifier output (`classifyFile.ts`) — snake_case, never on a strict list |
| `broker_package` | 26 | classifier output |
| `market_report` | 19 | classifier output |
| `property_flyer` | 16 | classifier output |
| `Misc` | 5 | path (g) `/api/dms/upload` fallback |
| `broker_survey` | 5 | classifier output |
| `personal_tracker` | 3 | classifier output |
| `Offering` | 3 | likely site #1 path with classified-as `Offering` (case mismatch with strict-list `'Offering'`?) |
| `general` | 1 | site #1 / #3 / #4 / `/api/dms/docs:273` fallback |
| **(soft-deleted only)** `General` | 16 | site #1 fallback (capital G) |
| **(soft-deleted only)** `misc` | 1 | unknown |

Five distinct fabrication signatures match five distinct fabrication sites: classifier free-form (`offering_memo` etc.), `'Misc'`, `'general'`/`'General'`, `'Property Data'` (the most common — 85 rows; from path (f)), `'Financial Model'` (7 active + 1 deleted; from paths (c)/(d)/(e)).

---

## 5. Landscaper firing rules — current state

⚠️ **Dirty-tree caveat: `backend/apps/landscaper/ai_handler.py` was modified in the working tree at audit time** (committed HEAD `1b87f45` plus uncommitted edits from a parallel session — likely the synonym-dictionary work-stream referenced in CLAUDE.md). The findings below reflect the working-tree state, not committed HEAD. After parallel sessions merge, re-verify these conclusions against the post-merge state before Phase 2 implementation begins.

### 5.1 Existing firing-discipline sections in `BASE_INSTRUCTIONS`

Two relevant sections exist:

- **Line 1314 — `NEVER FABRICATE NUMBERS (CRITICAL)`** (the values-side discipline; not profile-related)
- **Line 1641 — `LOCATION BRIEF — STRICT FIRE/OFFER RULES (CRITICAL)`** (the trigger-discipline pattern Phase 2 should mirror)

Per CLAUDE.md, two more were added on 2026-05-01 (commit `13346bf` on the chat DA branch line):
- `OPERATING STATEMENT — DISCRIMINATOR HONESTY`
- `ASSUMPTION CHOICES — SURFACE WITH PROVENANCE`

The `LOCATION BRIEF — STRICT FIRE/OFFER RULES` section (lines 1641–~1690 in working tree) is the canonical pattern — it specifies a verbatim "offer phrase" for the soft-ask case, enumerates negative trigger examples, and forbids supplementary firing alongside other tools. The new `DOCUMENT PROFILE — STRICT NEVER-INVENT RULES` section should follow the same template.

### 5.2 Document-profile-specific firing language in `BASE_INSTRUCTIONS`

**There is currently NO `DOCUMENT PROFILE`-specific firing-discipline section in `BASE_INSTRUCTIONS`.** Grep results for `DOCUMENT PROFILE`, `doc profile`, `document profile`, `update_document_profile`, `profile_template` found only:

- Line 991: `'update_document_profile': 'documents',` — the tool-domain registry mapping (not a behavioral rule)
- Line 2116: in Recipe 8 (DMS ORGANIZATION), the line *"rename_document / update_document_profile / move_document_to_folder as needed"* — meaning LS may invoke profile-mutating tools in response to user organizational requests.

Recipe 8's trigger is *"organize my documents", "rename this file", "move to folder", "reprocess"* — these are explicit user organizational asks, not auto-fired on upload. The recipe does NOT instruct LS to call `update_document_profile` autonomously when a doc lands.

### 5.3 Auto-firing on upload?

**No code path causes Landscaper to autonomously call a profile-mutating tool on upload.** The chat-canvas drop handlers (`LandscaperPanel.tsx:205-220` and `CenterChatPanel.tsx:468`) trigger different flows:

- LandscaperPanel Excel drop → calls `uploadAndAuditExcel` → posts to `/api/dms/docs` with hardcoded `'Financial Model'` → sends a chat prompt asking the model to invoke audit tools (`classify_excel_file`, `run_structural_scan`, `run_formula_integrity`, `extract_assumptions`). None of these are profile-mutating.
- CenterChatPanel chat-canvas drop → attaches the file to the next chat message via `uploadPendingFile`. Does not auto-invoke any profile tool.

So the FB-281 regression is NOT caused by Landscaper auto-firing `update_document_profile` on upload. It's caused by the **upload pipeline itself** writing a fabricated discriminator and then Landscaper happily reading whatever was written.

### 5.4 Profile-mutating tools (registered)

Tools that mutate `core_doc.doc_type` (or related columns on a doc):

| Tool | Defined in | Purpose |
|---|---|---|
| `update_document_profile` | `backend/apps/landscaper/tool_executor.py` (impl), `tool_schemas.py` (schema), `ai_handler.py:991` (registry) | Set doc_type, doc_date, priority, status, discipline, description; merge custom attributes into `profile_json`. |
| `rename_document` | same | Update `doc_name`. Indirectly affects discriminator if classifier re-runs. |
| `move_document_to_folder` | same | Upsert `core_doc_folder_link`; not a discriminator mutation. |
| `reprocess_document` | same | Re-queue extraction; classifier re-evaluates `profile_json` but does NOT update `doc_type` itself. |

`update_document_profile` is the post-hoc-correction tool. It is the right vehicle for after-the-fact profile changes per Phase 2 §2.4, *provided* a guard validates the requested doc_type against the project's strict list.

### 5.5 Recommended placement for the new "DOCUMENT PROFILE — STRICT NEVER-INVENT RULES" section

**Insert immediately after the `LOCATION BRIEF — STRICT FIRE/OFFER RULES` block** (around line 1700 in working tree, before the `EXCEL AUDIT — RESULTS RENDER IN ARTIFACT, NOT IN CHAT` block). Reasons:

1. Same firing-discipline pattern (explicit-trigger + offer-phrase). Locality keeps the "strict trigger" sections together for reviewers.
2. The new section governs `update_document_profile` specifically; the LOCATION BRIEF section governs `generate_location_brief`. Sister sections.
3. Recipe 8 (line 2112) already references `update_document_profile`; the new strict-rules section above Recipe 8 means the recipe naturally inherits the discipline.

Suggested wording follows the LOCATION BRIEF template:
- Open with a sentence stating what the rule governs.
- List the only conditions under which the tool fires (explicit user ask to change a profile).
- List negative triggers (do not fire on upload; do not fire on filename inspection alone; do not fire to "fix" a doc whose profile is on the strict list).
- Specify validation: requested doc_type must be on the project's strict list; if not on the list, ask the user whether to add it via admin (DO NOT silently add — disable the auto-register behavior in §6.d).
- Forbid the literal value `'general'` as ever an acceptable profile value, regardless of source.

---

## 6. Gap analysis

### a. Strict-list chain implementability

**Chain as Gregg described it ("by property type, or user default, both in admin panel") is NOT implementable today.** Two missing schema constructs:

1. **Per-property-type default template:** `dms_templates` has no `property_type` column. Phase 2 must add one (or a separate `dms_default_template_assignment` table).
2. **Per-user default template:** `dms_templates` has no `user_id` column. Same Phase 2 work required.

What IS implementable today:
- Workspace-default fallback (1 workspace, 2 default templates with no uniqueness — Phase 2 should also constrain to 1 default per workspace).
- Per-project explicit assignment via `tbl_project.dms_template_id` (currently unused in production).

**Admin UI status:** unconfirmed by audit. The `/w/admin` route exists but its doc-type-template editor (if any) was not deep-traced. CLAUDE.md mentions `src/app/admin/templates` work in DMS-TAG-001 (commit `100d599`); whether that UI lets a user designate a per-property-type or per-user default is unknown. Phase 2 must verify and, if missing, add admin UI.

**Recommendation:** Phase 2 has two tractable shapes for this:
- **(A) Minimum viable:** ship Phase 2 against the workspace-default-only resolver (which IS implemented). Defer per-property-type and per-user defaults to a follow-up. Document the gap explicitly so Gregg's mental model and code line up.
- **(B) Full strict-list resolver:** add `property_type` and `user_id` columns to `dms_templates` (or a separate assignment table), seed property-type defaults for active property types (LAND, MF, OFF, RET, IND, HTL, MXU per CLAUDE.md), build admin UI. Larger scope.

The fix-policy quote rules out silent fallbacks but does not require all three resolution dimensions to be live on day one — as long as the system asks the user when no list-membership match exists. (A) is sufficient to close FB-281; (B) realizes Gregg's full mental model.

### b. Backfill scope

- **`dms_project_doc_types` coverage:** 14/14 active projects already populated. **No backfill required.**
- **Off-list `core_doc` rows:** 124 active rows have `doc_type` not on their project strict list. Two sub-strategies:
  - **B1 (preserve):** add a `core_doc.profile_resolution_status` column (or repurpose an existing one) with values `'legacy_invalid_profile'` for these 124 rows. Phase 2 leaves the data alone but flags it. Lowest risk.
  - **B2 (remap):** write a curated synonym-map migration that translates classifier output to strict-list entries (`offering_memo`→`Offering`, `broker_package`→`Diligence`, `market_report`→`Market Data`, `property_flyer`→`Market Data`, etc.). Higher value, higher risk (downstream code may depend on the snake_case values).
- **Auto-registered strict-list entries:** the 16 `is_from_template=false` rows in `dms_project_doc_types` were silently added by the auto-register behavior (§6.d). Phase 2 should review each and decide whether to keep, demote (mark for admin review), or remove. Doing this requires disabling the auto-register behavior first so the list doesn't keep growing during Phase 2 work.

### c. Classifier-to-list match logic

**Not implemented.** `src/components/dms/staging/classifyFile.ts` (introduced in commit `bfc6da1`) returns free-form `docType` strings (e.g., `offering_memo`, `broker_package`, `market_report`, `property_flyer`, `broker_survey`) that do not match the strict-list values (`Offering`, `Property Data`, `Market Data`, `Diligence`, etc.). The 124 off-list production rows are direct evidence.

Phase 2 must implement a constrained-match step. Given the universe of strict-list values is small (~20 distinct names across all projects), a **curated synonym map** is sufficient for v1:

```
offering_memo, offering, om, broker_package    → Offering
market_report, market_study, comparable_market → Market Data
property_flyer, om_flyer, broker_survey        → Diligence  (or new strict-list entry)
financial_model, t12, proforma                 → Financial Model  (must be on strict list)
rent_roll, lease_summary                       → Property Data  (or new strict-list entry)
... etc.
```

Lookup runs after the classifier; if no synonym match AND the raw value is not on the project's strict list, the system asks the user. Threshold-based (fuzzy/embedding) matching is overkill for v1.

### d. Other fabrication paths beyond Cowork's four sites

**At least six additional fabrication sites identified in this audit:**

| # | Site | Fabricated value | Cowork-flagged? |
|---|---|---|---|
| 5 | `src/app/api/dms/docs/route.ts:273` | `'general'` (server-side `${system.doc_type ?? 'general'}` in INSERT) | **NO** |
| 6 | `src/app/api/dms/upload/route.ts:44` | `'Misc'` (form-data fallback) | **NO** |
| 7 | `src/components/landscaper/LandscaperPanel.tsx:115 + payload at ~146` | `'Financial Model'` (hardcoded) | **NO** |
| 8 | `src/components/wrapper/CenterChatPanel.tsx:320 + payload` | `'Financial Model'` (hardcoded) | **NO** |
| 9 | `src/hooks/useIntakeStaging.ts:120` | `'Property Data'` (hardcoded) | **NO** |
| 10 | `src/app/components/GIS/ProjectDocumentUploads.tsx:649` | `'project_document'` (hardcoded) | **NO** |
| 11 | **Auto-register-on-upload behavior** (`backend/apps/documents/tag_views.py:280-325`, `src/app/api/dms/docs/route.ts:90,124`, `src/app/api/projects/minimal/route.ts:232`) | INSERTs the fabricated value into `dms_project_doc_types` to "make it valid" — silently widens the strict list whenever a fabricated value lands. | **NO** |

Sites 7, 8, 9, 10 are not "fallback" patterns in the strict sense — they're explicit hardcodes. But under the "never invent" policy, they are equally problematic: each writes a fixed discriminator regardless of the project's strict list.

Site 11 is the single most important addition: it's the *coverup mechanism* that has been masking the regression. Whenever a fabricated value lands, the system retroactively adds it to the strict list with `is_from_template=false`, so subsequent strict-list checks pass. This is why the user's intuition ("this was fixed before") feels true — every fabricated value eventually appears on the project's "strict" list, so the UI looks consistent. **Phase 2 must disable this auto-register behavior** alongside the other site fixes; otherwise enforcement will continue to slowly erode itself.

**Versioning endpoint** (`/api/projects/[projectId]/dms/docs/[docId]/version`): not deep-traced in this audit (file path globbing failed). Phase 2 should verify whether new versions inherit parent doc_type or accept a fresh value, and if the latter, treat it as another fabrication candidate.

### e. Minimum file set for Phase 2

**Frontend (client-side):**
- `src/contexts/UploadStagingContext.tsx` (line 276 — remove `'General'` fallback; replace with strict-list resolver call)
- `src/components/intelligence/IntakeChoiceModal.tsx` (lines 60-78, 92, 144 — populate options from resolver, disable confirm until valid selection)
- `src/components/dms/staging/classifyFile.ts` (add constrained-match step)
- `src/hooks/useIntakeStaging.ts` (line 120 — remove `'Property Data'` hardcode; route through resolver)
- `src/components/landscaper/LandscaperPanel.tsx` (lines 115, ~146 — remove `'Financial Model'` hardcode)
- `src/components/wrapper/CenterChatPanel.tsx` (line 320, payload — same)
- `src/app/components/GIS/ProjectDocumentUploads.tsx` (line 649 — same)

**Frontend (server-side / API routes):**
- `src/lib/dms/uploadthing.ts` (line 43 — reject missing `x-doc-type` instead of falling through to `'general'`)
- `src/app/api/dms/docs/route.ts` (line 273 — remove `?? 'general'`; reject if `system.doc_type` not on strict list. Lines 90, 124 — disable auto-register-on-upload INSERTs.)
- `src/app/api/dms/upload/route.ts` (line 44 — remove `|| 'Misc'`; require explicit `doc_type`.)
- `src/app/api/projects/minimal/route.ts` (line 232 — review the auto-register logic.)

**Backend Django:**
- `backend/apps/documents/models.py` (line 61 — remove `default='general'`; require explicit value)
- `backend/apps/documents/migrations/<new>.py` (model default removal; backfill flag for legacy 124 rows)
- `backend/apps/documents/services/profile_resolver.py` (NEW — single source of truth for strict-list resolution)
- `backend/apps/documents/tag_views.py` (lines 280-325 — disable the auto-register-on-upload behavior; preserve only admin-driven inserts)
- `backend/apps/landscaper/ai_handler.py` (insert new "DOCUMENT PROFILE — STRICT NEVER-INVENT RULES" section after line ~1690, before EXCEL AUDIT block)

**Schema additions (only if Phase 2 implements per-property-type or per-user defaults — option B above):**
- Migration adding `property_type` (varchar, nullable, indexed) and/or `user_id` (bigint, nullable, FK to `auth_user`, indexed) to `dms_templates`. Or a separate `dms_default_template_assignment` table.
- Seed data for property-type defaults across LAND/MF/OFF/RET/IND/HTL/MXU.

**Tests (currently zero):**
- Backend unit test on `profile_resolver`: returns non-empty strict list for every active project; resolution order is deterministic.
- Backend integration test on `POST /api/dms/docs`: rejects payload with `doc_type` not on resolved strict list (422).
- Backend test that the model can't insert a row with `doc_type=NULL` post-migration (CHECK or NOT NULL).
- Frontend test for `IntakeChoiceModal`: confirm-button disabled until selection is a strict-list member.
- Frontend test for `UploadStagingContext.confirmFile`: classifier-low-confidence + no userDocType → file enters `awaiting_profile` status, not written to server.
- LS firing-discipline test (synthetic turn): "doc just uploaded with awaiting_profile" → LS asks rather than calling `update_document_profile` autonomously.

### f. Downstream consumers requiring regression testing

Top consumers of `core_doc.doc_type` by call-site count (grep across `src/`, `backend/apps/`):

| Rank | File | doc_type references |
|---|---|---|
| 1 | `src/components/dms/DMSView.tsx` | 62 |
| 2 | `backend/apps/knowledge/services/document_classifier.py` | 56 |
| 3 | `backend/apps/documents/tag_views.py` | 50 |
| 4 | `backend/apps/landscaper/tool_executor.py` | 41 |
| 5 | `backend/apps/knowledge/services/knowledge_library_service.py` | 41 |
| 6 | `src/components/dms/filters/DocTypeFilters.tsx` | 34 |
| 7 | `backend/apps/artifacts/operating_statement_guard.py` | 32 |
| 8 | `src/app/api/dms/docs/route.ts` | 28 |
| 9 | `src/components/wrapper/documents/DocumentsPanel.tsx` | 27 |
| 10 | `backend/apps/knowledge/services/conflict_resolver.py` | 23 |
| 11 | `src/components/dms/filters/AccordionFilters.tsx` | 22 |
| 12 | `backend/apps/knowledge/views/knowledge_library_views.py` | 18 |
| 13 | `src/app/api/projects/[projectId]/dms/doc-types/route.ts` | 16 |
| 14 | `backend/apps/knowledge/services/extraction_service.py` | 16 |
| 15 | `backend/apps/knowledge/services/auto_classifier.py` | 16 |

Plus 24 FK references from other tables (ai_extraction_staging, doc_extracted_facts, etc. — see `core_doc` referenced-by list in §4.2). Phase 2 should regression-test at minimum: extraction routing (`extraction_service.py`, `costar_extractor.py`, `auto_classifier.py`), DMS list/filter UI (`DMSView.tsx`, `DocumentsPanel.tsx`, `AccordionFilters.tsx`, `DocTypeFilters.tsx`), the operating-statement guard's data-presence check (`operating_statement_guard.py` — it queries `core_doc.doc_type` for OM / financial-model / appraisal / diligence patterns), and Landscaper tool reads (`tool_executor.py`).

---

## 7. Recommendation for Phase 2

### Posture

The fix policy Gregg confirmed on 2026-05-04 is consistent with what the schema can support **today**, with one caveat: per-property-type and per-user defaults do not exist yet. Phase 2 has two tractable shapes:

**Shape A — Minimum viable (recommended for closing FB-281).**
1. Build the strict-list resolver (`profile_resolver.py`) using only what exists today: `tbl_project.dms_template_id` → workspace `is_default=true` template. Document this clearly so Gregg's mental model ("by property type or user default") and the actual implementation are aligned.
2. Wire the resolver into every upload path. Reject any upload whose `doc_type` is not on the resolved list (or, if `effectiveDocType` is unset, mark the file `awaiting_profile` and surface the prompt UI).
3. Remove every silent fallback (sites 1-11 in §6.d).
4. Disable auto-register-on-upload in `tag_views.py` and the three Next.js INSERT sites.
5. Add the "DOCUMENT PROFILE — STRICT NEVER-INVENT RULES" section to `BASE_INSTRUCTIONS`.
6. Backfill flag (B1) the 124 off-list rows with `'legacy_invalid_profile'`.
7. Migration: drop the model default; add NOT NULL constraint (already NOT NULL — confirm).
8. Tests as enumerated in §6.e.

**Shape B — Full strict-list resolver (Gregg's full model).**
Shape A plus:
9. Add `property_type` and `user_id` to `dms_templates` (or a dedicated assignment table).
10. Seed per-property-type defaults for LAND / MF / OFF / RET / IND / HTL / MXU.
11. Add admin UI for managing per-property-type and per-user defaults.

**Recommendation: ship Shape A for FB-281, document Shape B as the follow-on.** Shape A closes the regression and aligns to the never-invent policy. Shape B realizes Gregg's full model but adds schema work, seed work, and admin UI work that is not strictly required to close FB-281. Mixing them in a single PR risks longer review and harder rollback.

### Prerequisite work flagged for Phase 2

1. **Disable auto-register-on-upload FIRST.** Until this is off, every test run of "fabricated value gets rejected" is contaminated by the side-effect of the value being silently added to the strict list. This is the single most important pre-step.
2. **Verify path (j) versioning behavior.** The audit failed to read the version-route file due to glob escaping. Phase 2 must trace `POST /api/projects/[projectId]/dms/docs/[docId]/version` and confirm it inherits parent `doc_type` (safe) or accepts a fresh value (unsafe — needs same gate).
3. **Verify path (l) admin knowledge-library upload.** Audit did not deep-trace this. Phase 2 must confirm whether it writes to `core_doc` (and if so, gate it) or to a separate library table (in which case it's out of scope).
4. **Check `tbl_user_landscaper_profile` surface.** If the admin panel referenced by Gregg uses this table for user defaults today, Phase 2 may need to migrate that field rather than introduce a new column on `dms_templates`. Audit did not find such a column on the user-profile table, but the admin UI was not deep-traced.
5. **Resolve the dirty-tree state on `ai_handler.py` BEFORE Phase 2 begins.** The synonym-dictionary work-stream (per CLAUDE.md commits `9c22396` / `c2afc8c`) is in flight in the same file. Phase 2's `BASE_INSTRUCTIONS` insertion will conflict with or overlap with that work. Coordinate merge order.
6. **Define the synonym map for the constrained-match step.** v1 should be a curated dict; Phase 2 must enumerate the snake_case classifier outputs (today's data shows: `offering_memo`, `broker_package`, `market_report`, `property_flyer`, `broker_survey`, `personal_tracker`, plus historical `general`, `Misc`, `Financial Model`, `Property Data`, `project_document`) and decide each one's canonical strict-list target.

### Open questions for Gregg before Phase 2 implementation begins

1. **Shape A vs Shape B.** Which posture do you want? Shape A is faster and closes FB-281 cleanly; Shape B is the larger build that realizes the full mental model.
2. **Backfill of the 124 off-list rows.** B1 (preserve + flag) or B2 (curated remap)? B1 is safer; B2 is more useful but riskier given the 700+ downstream call-sites.
3. **Strict-list scope for unassigned (thread-only) uploads.** Path (d) lands on a thread, not a project. There is no `dms_thread_doc_types` analog. What strict list applies to pre-project uploads — workspace default? User default (if Shape B)? Always-ask?
4. **Confidence threshold for auto-match (§2.2 of the FIX prompt).** v1 with curated synonym map → boolean (match / no match). Or should the resolver return a confidence score and the threshold live in config? My recommendation: boolean for v1, defer threshold-based matching to v2 if needed.
5. **Re-verify Step 5 against post-merge `ai_handler.py`.** The current findings reflect working-tree state with the synonym-dictionary edits in flight. After the parallel-session merges land, re-confirm the LOCATION BRIEF block line numbers and the recommended insertion point before drafting the new section.

---

## Appendix — Audit verification

```bash
# After audit completion, no code files modified:
git status --short
# (showing the same dirty set as audit-start, plus this file as ?? — confirmed)

# Report file uncommitted:
ls -la docs/09_session_notes/2026-05-04-FB281-phase1-discovery.md
git status docs/09_session_notes/2026-05-04-FB281-phase1-discovery.md
# (showing as untracked)

# No new migrations:
ls -la backend/apps/documents/migrations/ | tail -5
# (unchanged from pre-audit)

# Read-only psql confirmation:
( set -a; source .env.local; psql "$DATABASE_URL" -c "SELECT 1;" )
# returns 1
```

End of Phase 1 discovery report.

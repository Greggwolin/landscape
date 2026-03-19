# Landscape Session Log

> Running log of development sessions. Newest first.
> Trigger: Say **"Document"** in any chat to add an entry.

---

## Intake Modal Fixes + Knowledge Search + Comp Pipeline — 2026-03-18

**What was discussed:**
- Diagnosed .xlsx upload failure (`{}` response from `/api/dms/docs` — missing auth headers in old LandscaperPanel.uploadFiles)
- Discovered previous session had built a full tiered modal system (UnifiedIntakeModal → ProjectKnowledgeModal / PlatformKnowledgeModal) — reverted conflicting UploadStagingProvider lift that would have broken it
- Fixed intake modals closing during form interaction: buttons defaulting to `type="submit"` inside `<CForm>`, missing `onSubmit` prevention, CModal `onClose` firing unexpectedly, modals unmounting during SWR revalidation (moved modal renders before loading guards in ProjectLayoutClient)
- Added `closeButton={false}`, removed `onClose` prop, added `backdrop="static"` + `keyboard={false}` to all three intake modals
- Added Start Over / Cancel buttons to knowledge modals with full upload rollback (DELETE to UploadThing + core_doc soft-delete)
- Fixed extraction queue trash button opening Workbench (missing `e.stopPropagation()` in ExtractionQueueSection.tsx)
- Fixed knowledge intents (`project_knowledge`, `platform_knowledge`) creating extraction queue entries — updated Zod schema, useIntakeStaging hook, and route.ts to skip queue for knowledge intents
- Added `RESPONSE STYLE`, `MANDATORY TOOL USE`, `AVOIDING REDUNDANCY` sections to Landscaper system prompt; updated `DATA LOOKUP PRIORITY` in BASE_INSTRUCTIONS to include `query_platform_knowledge` as step 2
- Added `query_platform_knowledge` to `mf_valuation` and `land_valuation` in PAGE_TOOLS (though actual filtering uses PROPERTY_TYPE_TOOL_MAP where it was already in UNIVERSAL_TOOLS)
- Made `query_platform_knowledge` tool search BOTH `tbl_platform_knowledge_chunks` (reference corpus) AND `knowledge_embeddings` (user-uploaded docs), merging results by similarity
- Fixed cap rate normalization in `update_sales_comparable` tool (values > 1 auto-converted to decimal)
- Manually approved 3 pending mutation proposals and populated missing comp fields from CoStar xlsx
- Added outer try-catch safety net to `/api/dms/docs` POST route

**Files modified (frontend):**
- `src/components/intake/UnifiedIntakeModal.tsx` — closeButton, onClose removal
- `src/components/intake/ProjectKnowledgeModal.tsx` — closeButton, onClose, onSubmit, type="button", Start Over
- `src/components/intake/PlatformKnowledgeModal.tsx` — same as above
- `src/components/landscaper/ExtractionQueueSection.tsx` — stopPropagation on trash button
- `src/hooks/useIntakeStaging.ts` — send intent for all file types
- `src/app/api/dms/docs/route.ts` — skip queue for knowledge intents, outer try-catch
- `src/app/api/dms/docs/schema.ts` — added knowledge intents to Zod enum
- `src/app/projects/[projectId]/ProjectLayoutClient.tsx` — moved intake modals before loading guards
- `src/components/landscaper/LandscaperPanel.tsx` — removed dead dropzone comment

**Files modified (backend):**
- `backend/apps/landscaper/ai_handler.py` — RESPONSE STYLE, MANDATORY TOOL USE, AVOIDING REDUNDANCY, DATA LOOKUP PRIORITY
- `backend/apps/landscaper/tool_executor.py` — dual-source knowledge search, cap rate normalization
- `backend/apps/landscaper/tool_registry.py` — query_platform_knowledge added to mf_valuation/land_valuation PAGE_TOOLS

**Open items:**
- Thread list UI missing from Landscaper panel — no way to browse/switch threads
- Thread auto-selection race condition on mount — new blank threads created before API returns existing threads, causing comp thread to disappear on refresh
- Landscaper response vanishing on refresh — related to thread race condition
- `docs/diagnostics/xlsx-upload-failure-2026-03-18.md` created during diagnostic phase — can be deleted (findings are superseded by this log entry)

---

## DMS Drag-to-Reclassify — 2026-03-11

**What was discussed:**
- Audited the full drag-to-reclassify implementation per the OpenClaw spec. Found the feature is already fully built across three layers:
- **AccordionFilters.tsx**: Drop target handlers (`handleHeaderDragOver/Enter/Leave/Drop`) keyed on `application/x-dms-reclassify` MIME type. Visual states (`isReclassifyDropTarget`, `isDropSuccess`) with CoreUI var inline styles. Document rows set reclassify drag data with multi-select support (drag ghost badge for bulk). Opacity 0.5 on drag, `aria-dropeffect="move"` on active targets.
- **AccordionFilters.module.css**: `.filterRowReclassifyTarget` (primary border-left + subtle bg) and `.filterRowDropSuccess` (success bg flash) classes defined.
- **DMSView.tsx**: `handleDocumentReclassify` callback with per-doc PATCH calls to `/api/dms/documents/{id}/profile`, error handling for 404/409, toast notifications, `loadFilters()` refresh. Prop `onDocumentDrop={handleDocumentReclassify}` already passed to both left/right AccordionFilters instances.
- One minor flag: drag ghost badge (line 375) has hardcoded `#321fdb` fallback alongside `var(--cui-primary)` — acceptable since it's a temporary off-screen element.
- Pre-existing type errors confirmed unrelated (`hideHeader` prop, `deleted_at` on DMSDocument type).

**Open items:**
- None — feature is complete and wired. No code changes were needed.

---

## Loan Scope UI + Cash Flow Stacking — 2026-03-11

**What was discussed:**

- Added container assignment UI to `LoanCard.tsx` — radio for "Entire Project" (default) + area/phase checkboxes
- Wired `container_ids` into save payload via `buildLoanPayload()`, round-trips through `LoanCreateUpdateSerializer._sync_containers()`
- Added scope badge to collapsed loan summary row (shows container name or count)
- CSS styles added for `.loan-scope-picker` and nested phase indentation
- Verified loan stacking: both `land_dev_cashflow_service.py` and `income_property_cashflow_service.py` already iterate loans independently and sum debt service as separate line items
- Land dev cash flow respects container scoping via `_fetch_loans()` filter; unscoped loans always included
- `allocation_pct` on `LoanContainer` exists but is unused in cash flow engine (all-or-nothing inclusion)

**Open items:**

- Haven't tested the full save round-trip in browser (save → reload → verify containerIds populated)
- Income property cash flow doesn't filter loans by container (acceptable for MF but may need attention for mixed-use)
- No lint or build errors, but no E2E test coverage on the new scope picker

---

## Waterfall Fixes — 2026-03-11

**What was discussed:**

- Continued from loan scope/stacking session (context carried over via compaction summary)
- Reviewed all 77+ scripts in `scripts/` — cataloged every documentation-related script (schema export, daily context generators, codebase audit, API audit, migration status, diff context, prototype notes export)
- Created session logging system: `docs/daily-context/session-log.md` as append-only log
- Added "Document" command instructions to `CLAUDE.md` under Common Tasks — any future session picks up the convention automatically
- Seeded first log entry with the loan scope work from earlier in this chat

**Open items:**

- None

---


## Add Parcel Cascading Taxonomy — 2026-03-11

**What was discussed:**
- Fixed runtime error "Failed to add Parcel: (intermediate value).find is not a function" — fallback fetch in `addParcelFromRow` was calling `.find()` on a non-array API response. Rewrote to use `areaOptions` first with guarded `Array.isArray()` fallback.
- Implemented progressive field reveal on Add Parcel inline row — columns 3-7 show "Select Area & Phase first" until both dropdowns have values, then reveal Use Family, Use Type, Product, Acres, Units inputs.
- Restored cascading taxonomy dropdowns (Family → Type → Product) on the Add Parcel row, matching EditableParcelRow pattern: Family loads types via `/api/landuse/types/{familyId}`, Type loads products via `/api/landuse/lot-products/{typeId}` with shared cache.
- All three taxonomy fields (`family_name`, `type_code`, `product_code`) now passed in POST `/api/parcels` body. State fully resets on save and cancel.

**Open items:**
- None

---

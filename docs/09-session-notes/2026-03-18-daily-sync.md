# Daily Sync — 2026-03-18

**Date**: Tuesday, March 18, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added or Progressed
- **Unified Intake Modal system** — Full tiered modal flow committed: `UnifiedIntakeModal` → `ProjectKnowledgeModal` / `PlatformKnowledgeModal` with `IntakeFileRow` component and `useIntakeStaging` hook
- **Landscaper system prompt improvements** (uncommitted) — Added `RESPONSE STYLE`, `MANDATORY TOOL USE`, `AVOIDING REDUNDANCY` sections to `ai_handler.py`; updated `DATA LOOKUP PRIORITY` to include `query_platform_knowledge` as step 2
- **Dual-source knowledge search** (uncommitted) — `query_platform_knowledge` tool now searches BOTH `tbl_platform_knowledge_chunks` (reference corpus) AND `knowledge_embeddings` (user-uploaded docs), merging by similarity
- **Cap rate normalization** (uncommitted) — `update_sales_comparable` tool auto-converts values >1 to decimal (e.g., 6.5 → 0.065)
- **DMS doc type update route** — New `src/app/api/projects/[projectId]/dms/update-doc-type/route.ts`

### Bugs Fixed
- **Intake modals closing during interaction** (uncommitted) — Buttons defaulting to `type="submit"` inside `<CForm>`, missing `onSubmit` prevention, `CModal onClose` firing unexpectedly, modals unmounting during SWR revalidation. Fixed with `closeButton={false}`, `backdrop="static"`, `keyboard={false}`, moved modal renders before loading guards in `ProjectLayoutClient`
- **Extraction queue trash button** (uncommitted) — Was opening Workbench instead of deleting; added `e.stopPropagation()` in `ExtractionQueueSection.tsx`
- **Knowledge intents creating extraction queue entries** (uncommitted) — Updated Zod schema, `useIntakeStaging` hook, and `route.ts` to skip queue for `project_knowledge` / `platform_knowledge` intents
- **DMS route outer try-catch** (uncommitted) — Added safety net to `/api/dms/docs` POST route
- **xlsx upload failure diagnosed** (uncommitted) — `{}` response from `/api/dms/docs` traced to missing auth headers in old `LandscaperPanel.uploadFiles`

### Technical Debt Addressed
- **LandscaperPanel refactor** — Removed ~300 lines of dead code (old upload logic replaced by Unified Intake flow)
- **CSS token cleanup** (uncommitted) — Minor updates to `folder-tabs.css`, `navigation.css`, `resizable-panel.css`, `tokens.css`

### Documentation Updated
- `docs/02-features/dms/USER-GUIDE-DOCUMENT-UPLOAD.md` — New interactive user guide with chapter navigation
- `docs/14-specifications/unified-intake-design.md` — Unified intake design spec
- `docs/daily-context/session-log.md` — Detailed session entry for today's work
- `docs/diagnostics/xlsx-upload-failure-2026-03-18.md` — Diagnostic writeup for xlsx upload issue
- `docs/agents/MARKET_INTELLIGENCE_AGENT_SPEC.md` — New market intelligence agent specification

### Known Issues Introduced or Discovered
- `.xlsx` upload via old LandscaperPanel path returns `{}` (missing auth headers) — mitigated by new Unified Intake flow but legacy path still broken
- `rent_comp_name` field registry bug still present (tenant names misclassified as rent comparable names)

## Files Modified

### Committed (7d4af06)
```
22 files changed, 4481 insertions(+), 308 deletions(-)
Key: UnifiedIntakeModal.tsx, ProjectKnowledgeModal.tsx, PlatformKnowledgeModal.tsx,
     IntakeFileRow.tsx, useIntakeStaging.ts, LandscaperPanel.tsx, FileDropContext.tsx,
     ProjectLayoutClient.tsx, DMSView.tsx, USER-GUIDE-DOCUMENT-UPLOAD.md
```

### Uncommitted (21 modified + 3 untracked)
```
Backend:  ai_handler.py, tool_executor.py, tool_registry.py
Frontend: ProjectLayoutClient.tsx, UnifiedIntakeModal.tsx, ProjectKnowledgeModal.tsx,
          PlatformKnowledgeModal.tsx, ExtractionQueueSection.tsx, LandscaperPanel.tsx,
          useIntakeStaging.ts, route.ts, schema.ts, ActiveProjectBar.tsx,
          TopNavigationBar.tsx, ProjectContextBar.tsx, dashboard/page.tsx
Styles:   folder-tabs.css, navigation.css, resizable-panel.css, tokens.css
Docs:     session-log.md
New:      docs/agents/, docs/diagnostics/, scripts/extract_parcel_boundaries.py
```

## Git Commits
```
7d4af06 docs: nightly health check 2026-03-18 (Gregg Wolin, 8 hours ago)
```

## Active To-Do / Carry-Forward
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Commit uncommitted work (21 modified files + 3 untracked) — significant intake modal fixes, Landscaper improvements, and knowledge search enhancements sitting in working tree
- [ ] `rent_comp_name` field registry bug — tenant names from rent rolls misclassified as rent comparable names
- [ ] Legacy xlsx upload path via LandscaperPanel still broken (missing auth headers)

## Alpha Readiness Impact

No alpha blockers moved today. Work focused on hardening the intake/ingestion flow (already functional) and improving Landscaper intelligence. The Unified Intake Modal system committed today strengthens the Document Upload & Extraction workflow (Step 2 in alpha assessment), but this was already marked ⚠️ PARTIAL and remains so.

## Notes for Next Session
- Large batch of uncommitted work needs review and commit — the intake modal fixes and Landscaper prompt improvements are substantial quality-of-life changes
- The dual-source `query_platform_knowledge` search is a meaningful improvement for Landscaper accuracy on MF valuations
- Cap rate normalization prevents a subtle but important data quality issue in sales comparables
- The `extract_parcel_boundaries.py` script in the untracked files may be a one-off or a new utility — check intent before committing

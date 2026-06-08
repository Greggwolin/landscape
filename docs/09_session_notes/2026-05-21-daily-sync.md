# Daily Sync — 2026-05-21

**Date**: Wednesday, May 21, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Report Modification Spec — Hidden Denylist + Alignment Overrides (1 commit, +167/-19 across 6 files)

- `modification_spec.py` now supports a `hidden` denylist (columns to suppress from artifact rendering) and per-column `alignment` overrides. Tool schema updated in `tool_schemas.py` with expanded `modification_spec` parameter documentation.
- `ReportArtifactView.tsx` consumes hidden columns and alignment overrides from the spec, filtering columns at render time.
- `ArtifactRenderer.tsx` passes alignment metadata through to table cells.
- `useReportLibrary.ts` hook extended to support spec-driven column visibility.
- New types added to `artifact.ts` for the spec shape.

### Document-Profile Invention Guard — Closes FB-281, FB-291 (1 commit, +232/-3 across 8 files)

- **New tools:** `list_project_profiles` and `add_project_profile` registered in tool registry — gives Landscaper a proper write path for document profile metadata instead of fabricating values.
- `document_profile_tools.py` (95 lines) — new tool file with both tools.
- `document_classifier.py` — added validation to block invented profile values.
- `ai_handler.py` — new BASE_INSTRUCTIONS block forbidding profile fabrication, directing Landscaper to use the new tools.
- `mutation_service.py` — guard against profile invention at the mutation layer.
- `tool_executor.py` — additional validation on profile-related tool calls.
- CLAUDE.md updated to reflect +2 tool count and FB-281/FB-291 closure.

### Artifact Visual Fixes (1 commit, +42/-7 across 3 files)

- Three targeted visual fixes for report artifacts: adapter alignment preservation, toolbar CSS cleanup, and artifact renderer border/spacing corrections.

### Backend Schema Validator — Subtitle Variant (1 commit, +86/-2 across 2 files)

- `schema_validation.py` now accepts `subtitle` as a valid variant in the artifact block schema, unblocking report generators that emit subtitle rows.
- Also includes yesterday's nightly sync note (`2026-05-20-daily-sync.md`).

### Feedback Dashboard Endpoint (1 commit, +125/-4 across 5 files — committed late May 20, included here for completeness)

- New `views_dashboard.py` in feedback app — serves aggregated feedback data for the morning-refresh skill.
- Token-based permissions (`permissions.py`) for the dashboard endpoint.
- URL routing updated, `.env.example` updated with new config keys.

---

## Files Modified

```
backend/.env.example                                (dashboard config)
backend/apps/artifacts/schema_validation.py         (subtitle variant)
backend/apps/feedback/permissions.py                (dashboard auth)
backend/apps/feedback/urls.py                       (dashboard routing)
backend/apps/feedback/views_dashboard.py            (NEW — dashboard endpoint)
backend/apps/knowledge/services/document_classifier.py (profile invention guard)
backend/apps/landscaper/ai_handler.py               (profile invention rules)
backend/apps/landscaper/services/mutation_service.py (profile guard)
backend/apps/landscaper/tool_executor.py            (profile validation)
backend/apps/landscaper/tool_registry.py            (+2 tools)
backend/apps/landscaper/tool_schemas.py             (modification_spec + profile tools)
backend/apps/landscaper/tools/document_profile_tools.py (NEW — list/add profile tools)
backend/apps/reports/artifact_adapter.py            (visual fixes)
backend/apps/reports/services/modification_spec.py  (hidden denylist + alignment)
src/components/reports/ReportArtifactView.tsx        (hidden cols + alignment)
src/components/reports/ReportToolbar.module.css      (visual fixes)
src/components/wrapper/ArtifactRenderer.module.css   (visual fixes)
src/components/wrapper/ArtifactRenderer.tsx          (alignment pass-through)
src/hooks/useReportLibrary.ts                        (spec column visibility)
src/types/artifact.ts                                (modification_spec types)
```

## Git Commits

```
0848ed5b feat(reports): modification_spec adds hidden denylist + alignment overrides
5f955448 fix(landscaper): block document-profile invention — closes FB-281, FB-291 (#30)
e3fd061e fix(artifacts): three visual fixes for report artifacts (#29)
f53cdcda Allow 'subtitle' variant in backend schema validator (#28)
b9059f61 feat(feedback): dashboard data endpoint for morning-refresh skill (#27)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — remains the primary alpha blocker (unchanged)
- [ ] BASE_INSTRUCTIONS migration — ~80 lines of superseded T-12 rules could be removed now that the OS guard handles enforcement programmatically
- [ ] `LSCMD-SPEC-EXTEND-0521.md` — untracked file in working tree; appears to be a PR/merge prompt for `feat/spec-hidden-and-header-align` branch. Branch is 1 commit ahead of main (`0848ed5b`).

## Alpha Readiness Impact

No alpha blocker movement today. FB-281 and FB-291 (document-profile invention) are now closed — these were quality/trust issues, not blockers. The modification_spec work advances report artifact flexibility, which is alpha-polish territory. The feedback dashboard endpoint supports the operational tooling layer (morning refresh skill).

## Notes for Next Session

- Currently on branch `feat/spec-hidden-and-header-align` (1 commit ahead of main). The untracked `LSCMD-SPEC-EXTEND-0521.md` file contains a PR/merge prompt — likely next action is to merge this branch into main.
- Landscaper tool count now at **275 registered** (+2 from `list_project_profiles` + `add_project_profile`).
- The `modification_spec` system is now feature-complete for v1: Landscaper can hide columns and override alignment via conversational commands, and the renderer respects these at display time.
- Profile-invention guard is a multi-layer defense: BASE_INSTRUCTIONS rule + tool_executor validation + mutation_service guard + new dedicated tools for the proper write path.

# Daily Sync — 2026-05-19

**Date**: Monday, May 19, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Reports Chat-Forward Phase 3 — Frontend Toolbar + Bridge (Major)

- **Report toolbar + library hook shipped** (`be21ef73`, +1,686 lines across 9 files) — Phase 3 of the reports chat-forward redesign:
  - `ReportToolbar.tsx` (565 lines) — full toolbar component with popover for report actions
  - `ReportArtifactView.tsx` (250 lines) — dedicated artifact view wrapper for reports
  - `useReportLibrary.ts` (352 lines) — hook for report library resolution, personal defaults, saved reports
  - `ReportToolbar.module.css` (368 lines) — dedicated styling
  - Bridge canonicalization + adapter row-id fix in `report_artifact_tools.py`
  - Updated tool schemas in `tool_schemas.py`

- **Registered report guard shipped** (`55e31c90`, +434/-204 lines) — server-side enforcement routing registered reports through the bridge:
  - New `registered_report_guard.py` (193 lines) in `backend/apps/artifacts/`
  - Prompt + tool description updates in `ai_handler.py` (net reduction of ~100 lines via cleanup)
  - Adapter row-id fix in `artifact_adapter.py`

- **Toolbar report_name persistence** (`7f855e73`) — `report_name` now persisted in `params_json` for popover header display.

### Artifact Rendering Overhaul — Claude-Style Panel Takeover

- **Whole-panel takeover behavior** (`5a152b0f`, +182/-87 lines) — artifacts now expand to fill the right panel Claude.ai-style, replacing the old stacked/scrollable layout. Changes to `w/layout.tsx` and `ArtifactWorkspacePanel.tsx`.

- **Project-route takeover + always-light surface** (`bb5b8b51`, +61/-4 lines) — extended takeover behavior to project routes; artifact surface forced to light theme regardless of app dark mode. Updated `ProjectArtifactsPanel.tsx` and `ArtifactWorkspacePanel.tsx`.

- **Light-text invisibility fix** (`9c04eec5`, +40 lines) — CoreUI dark-theme CSS variables (`--cui-body-color`, Wolin design tokens) were making artifact text invisible on the always-light surface. Added scoped overrides in `wrapper.css`.

- **Rent-roll polish** (`631a732a`, +81/-4 lines) — header text improvements, shading, borders, and date formatting in `rpt_07b_rent_roll_detail.py` generator + ArtifactRenderer CSS.

- **Currency formatting + header dark mode** (`99ec47c7`, +90/-5 lines) — `$` currency prefix and 2-decimal `$/SF` formatting in `ArtifactRenderer.tsx`. Main artifact header forced dark to match app chrome. New formatting types in `artifact.ts`.

### Documentation

- **PROJECT_INSTRUCTIONS v4.6.2** (`0a9fe82f`, +79/-6 lines) — three additions:
  - §1.2.1 capability boundary (what Landscaper can/cannot do)
  - §5.7.1 no unsolicited explanations rule
  - §4.8 branch tracking convention

### Also Landed (overnight, technically May 18)

- **DMS auth header fixes** (`97c2587b`, `68783086`) — media-picker and doc-types/tag fetches now include auth headers for Django endpoints.
- **Artifact takeover Phase 3 follow-up** (`f5d3f9d4`, +119/-29 lines) — Claude.ai-style right-panel expand + document styling.
- **Auth fixes** (`7d1b95eb`) — project picker scope + Help-panel chat auth header.
- **Session log update** (`e6b8c3fd`) — 2026-05-16 entries for auth rollout + DMS previewer.

## Files Modified

```
backend/apps/artifacts/registered_report_guard.py           | 193 +++
backend/apps/artifacts/services.py                          |  36 +++
backend/apps/landscaper/ai_handler.py                       | 321 ++-
backend/apps/landscaper/tool_schemas.py                     |  53 ++-
backend/apps/landscaper/tools/report_artifact_tools.py      |  79 ++-
backend/apps/projects/views.py                              |  35 ++-
backend/apps/reports/generators/rpt_07b_rent_roll_detail.py |  18 +-
docs/PROJECT_INSTRUCTIONS.md                                |  85 ++-
docs/daily-context/session-log.md                           |  46 +++
src/app/w/layout.tsx                                        | 128 ++-
src/components/dms/DMSView.tsx                              |  12 +-
src/components/dms/modals/MediaPickerModal.tsx               |   3 +-
src/components/dms/profile/TagInput.tsx                      |   4 +-
src/components/reports/ReportArtifactView.tsx                | 250 +++
src/components/reports/ReportToolbar.module.css              | 368 +++
src/components/reports/ReportToolbar.tsx                     | 565 +++
src/components/wrapper/ArtifactRenderer.module.css          | 166 ++-
src/components/wrapper/ArtifactRenderer.tsx                 |  98 ++-
src/components/wrapper/ArtifactWorkspacePanel.tsx           | 223 ++-
src/components/wrapper/ProjectArtifactsPanel.tsx            |  35 ++-
src/components/wrapper/documents/DocumentsPanel.tsx         |   7 +-
src/contexts/HelpLandscaperContext.tsx                      |   3 +-
src/hooks/useReportLibrary.ts                               | 352 +++
src/styles/wrapper.css                                      |  97 +++
src/types/artifact.ts                                       |  14 +++
```

## Git Commits

```
99ec47c7 feat(artifacts): main header dark; $ currency formatting; $/SF 2-decimal (#18)
631a732a feat(artifacts): rent-roll polish — header text, shading, borders, dates (#17)
9c04eec5 fix(artifacts): light artifact text was invisible — cover Wolin tokens (#16)
bb5b8b51 feat(artifacts): project-route takeover + always-light artifact surface (#15)
5a152b0f feat(artifacts): Claude-style whole-panel takeover behavior (#14)
0a9fe82f docs: PROJECT_INSTRUCTIONS v4.6.2 — §1.2.1 capability boundary + §5.7.1 no unsolicited explanations + §4.8 branch tracking
7f855e73 fix(toolbar): persist report_name in artifact params_json for popover header (#13)
be21ef73 feat(reports): chat-forward toolbar + bridge canonicalization + adapter row-id fix (#10)
55e31c90 fix(landscaper): route registered reports through the bridge — prompt, tool descs, server-side guard, adapter row-id fix (#12)
```

## Active To-Do / Carry-Forward

- [ ] **Reports chat-forward Phase 4** — Landscaper tool wiring (tools to list/apply/save report configurations via chat). Phase 3 frontend is shipped.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned-PDF / OCR pipeline remains unimplemented (alpha blocker #5).
- [ ] Lingering `tbl_container` references (~60 callsites) filed for follow-up.
- [ ] `list_feedback --status in_progress` CLI fix queued.

## Alpha Readiness Impact

No direct movement on the 6 alpha blockers. However, the artifact rendering overhaul (Claude-style takeover, always-light surface, currency formatting) and the reports chat-forward Phase 3 frontend are significant UX improvements that strengthen the alpha experience. The reports system (alpha feature #13) moves from "WORKS" to "WORKS + user-customizable" with the library/toolbar infrastructure.

## Notes for Next Session

- **Artifact surface is now always-light.** Dark-mode users see the app chrome in dark but artifact content in light. The `wrapper.css` overrides scope CSS variables specifically to `.artifact-light-surface` to prevent text invisibility. Any new CSS variables introduced by CoreUI or custom tokens need to be checked against this surface.
- **Registered report guard** is a new server-side enforcement layer — any artifact whose title matches a registered report code gets routed through `report_artifact_tools.py` bridge instead of raw `create_artifact`. This prevents Landscaper from generating ad-hoc report artifacts that bypass the standardized report pipeline.
- **Phase 4 (Landscaper tools)** is the next logical step for reports chat-forward. The backend persistence (Phase 2) and frontend library (Phase 3) are both shipped. Tools needed: list user's report library, apply a saved configuration, save current view as personal default or named report.
- **Currency formatting in ArtifactRenderer** now supports `$` prefix and 2-decimal `$/SF` via new `column_format` types in `artifact.ts`. Report generators can declare these in their column definitions.

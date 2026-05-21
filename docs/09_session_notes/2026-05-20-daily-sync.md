# Daily Sync — 2026-05-20

**Date**: Tuesday, May 20, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Artifact System Polish (Major — 8 commits, +574 lines across 19 files)

**Features added:**
- Pin saves current view state (visible columns, sort) so pinned artifacts remember user preferences (#21)
- Bridge tool now accepts `modification_spec` parameter; clearer toolbar icon (#24)
- Property header + quieter section labels + KPI strip added to artifact renderer (#26)
- Modern report theme — light header, status pills, two-line headers, centered Status column (#25)

**Bugs fixed:**
- Adapter preserves `align` + `format` fields; visible icons; clean pinned label (#23)
- Save-version + toolbar Update both persist view state correctly (#22)
- Subtitle fix for rent roll detail report + Recent Artifacts auto-refresh in center chat panel (#19)

### Security Fix
- Scoped unassigned threads + `/recent/` endpoint to owner — new `created_by` field on ChatThread model with Django migration + raw SQL migration (#20). Prevents cross-user thread leakage.

### Documentation
- Nightly health check note created for 2026-05-19 (from prior night's run)

---

## Files Modified

```
backend/apps/artifacts/serializers.py               (pin view state)
backend/apps/landscaper/migrations/0006_*           (created_by migration)
backend/apps/landscaper/models.py                   (ChatThread.created_by)
backend/apps/landscaper/services/thread_service.py  (owner scoping)
backend/apps/landscaper/tool_schemas.py             (modification_spec)
backend/apps/landscaper/tools/report_artifact_tools.py (bridge tool update)
backend/apps/landscaper/views.py                    (thread security)
backend/apps/reports/artifact_adapter.py            (align/format preservation, property header)
backend/apps/reports/generators/rpt_07_rent_roll.py (subtitle fix)
backend/apps/reports/generators/rpt_07b_rent_roll_detail.py (subtitle fix)
migrations/20260519_add_chatthread_created_by.*     (raw SQL migration)
src/components/reports/ReportArtifactView.tsx        (view state persistence)
src/components/reports/ReportToolbar.tsx             (toolbar update button)
src/components/wrapper/ArtifactRenderer.module.css   (major theme overhaul)
src/components/wrapper/ArtifactRenderer.tsx          (property header, KPI strip, status pills)
src/components/wrapper/ArtifactWorkspacePanel.tsx    (pin + save-version logic)
src/components/wrapper/CenterChatPanel.tsx           (auto-refresh)
src/types/artifact.ts                                (property_header, kpi_strip types)
```

## Git Commits

```
15ddb4dc style(artifacts): property header + quieter section labels + KPI strip (#26)
20a8ebc0 feat(landscaper): bridge tool accepts modification_spec; clearer toolbar icon (#24)
df9c44f7 style(artifacts): modern report theme — light header, status pills, two-line headers, Status centered (#25)
792705df fix(artifacts): adapter preserves align+format; visible icons; clean pinned label (#23)
4e8bf430 fix(artifacts): save-version + toolbar Update both persist view state (#22)
f5a4d65a feat(artifacts): pin saves current view state (visible columns, sort) (#21)
fa65574e fix(security): scope unassigned threads + /recent/ endpoint to owner (#20)
a3eaa2db Pass-2 carryover: subtitle fix + Recent Artifacts auto-refresh (#19)
3d948c23 docs: nightly health check 2026-05-20
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — remains the primary alpha blocker (unchanged)
- [ ] BASE_INSTRUCTIONS migration — ~80 lines of superseded T-12 rules could be removed now that the OS guard handles enforcement programmatically

## Alpha Readiness Impact

No alpha blocker movement today. Work was focused on artifact presentation quality and security hardening — both important for alpha polish but not blocker-level. The thread security fix (#20) is significant for multi-user readiness.

## Notes for Next Session

- Heavy artifact renderer work today — `ArtifactRenderer.tsx` and `.module.css` saw 3+ commits of iterative polish. The renderer now supports `property_header` and `kpi_strip` artifact metadata blocks, plus a modern report theme with status pills and two-line column headers.
- The bridge tool (`report_artifact_tools.py`) now accepts a `modification_spec` parameter, enabling Landscaper to modify report artifacts conversationally.
- Thread security: `ChatThread` now has a `created_by` FK. The `/recent/` endpoint and unassigned thread queries are owner-scoped. This is a breaking change if any client code assumed cross-user thread visibility.
- View state (column visibility, sort) is now persisted through pin and save-version operations. The serializer, workspace panel, and toolbar all participate in this flow.

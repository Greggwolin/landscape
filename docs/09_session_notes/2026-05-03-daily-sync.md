# Daily Sync — 2026-05-03

**Date**: Saturday, May 3, 2026
**Generated**: Nightly automated sync
**Branch**: `chat-artifacts`

---

## Work Completed Today

### Committed
- **fix(artifacts): make full chat-inline tile clickable — closes FB-286** (`13c2310`)
  - Artifact tiles in chat bubbles now respond to clicks anywhere on the tile, not just the small Open button
  - Added hover affordance (border → `--cui-primary`, bg → `--cui-secondary-bg`, 120ms transition)
  - Keyboard accessible (Enter/Space, role=button, aria-label)
  - Single-file change: `ArtifactCardInline.tsx`

### Uncommitted Work (in working tree)
- **Source pointers for operating statements** (`tool_executor.py`, +111 lines) — `_build_operating_statement_source_pointers()` walks the operations payload and produces per-line-item source pointers (rental income → `tbl_multifamily_unit`, vacancy/credit/concessions → `tbl_project`, opex lines → `tbl_operating_expenses`). Enables audit trail in the artifact panel.
- **AI handler source-pointer pass-through rule** (`ai_handler.py`, +11 lines) — BASE_INSTRUCTIONS §7 tells Landscaper to pass `source_pointers` array verbatim into `create_artifact` without modification.
- **Mutation service mirrored-column write-through** (`mutation_service.py`, +108 lines) — `TBL_PROJECT_MIRRORED_COLUMNS` map ensures `city`↔`jurisdiction_city`, `state`↔`jurisdiction_state`, `county`↔`jurisdiction_county` stay in sync on any field_update or bulk_update. Prevents stale/null values when only one side of the pair is written.
- **Project GET endpoint expanded** (`route.ts`, +4 columns) — Added `total_units`, `gross_sf`, `year_built`, `acquisition_date` to the project detail query.
- **Artifact workspace panel rename/delete** (`ArtifactWorkspacePanel.tsx`, +250/-60 lines) — Row-level rename (via prompt) and soft-delete (via `is_archived`) actions on artifacts in the workspace panel. Lucide `Pencil` and `Trash2` icons added.
- **ArtifactRenderer CSS tweak** (`ArtifactRenderer.module.css`, minor)
- **Agent framework S14 scenario** (`tests/agent_framework/`) — New scenario `s14_project_info_input` added to test runner + manifest.

## Files Modified (uncommitted)

| File | Change |
|------|--------|
| `backend/apps/landscaper/tool_executor.py` | +119 (source pointers builder) |
| `backend/apps/landscaper/services/mutation_service.py` | +108 (mirrored column write-through) |
| `backend/apps/landscaper/ai_handler.py` | +11 (source pointer pass-through rule) |
| `src/components/wrapper/ArtifactWorkspacePanel.tsx` | +250/-60 (rename/delete actions) |
| `src/app/api/projects/[projectId]/route.ts` | +4 (extra columns in GET) |
| `src/components/wrapper/ArtifactRenderer.module.css` | +1/-1 |
| `src/styles/wrapper.css` | +2/-1 |
| `tests/agent_framework/run.py` | +6 (S14 scenario) |
| `tests/agent_framework/scenario_s14.py` | new |
| `tests/agent_framework/manifests/s14_project_info_input.json` | new |

## Git Commits (last 3 days)

```
13c2310 fix(artifacts): make full chat-inline tile clickable — closes FB-286 (7 hours ago)
0795767 fix(ui): /w/projects list page no longer inherits last project's chat context (2 days ago)
3f8d31c fix(infra): bump gunicorn worker timeout to 180s (2 days ago)
017d1cc chore: revert overly-broad migrations unignore from .gitignore (2 days ago)
0c8e45a docs: log Phase 1 ship + tool count update (2 days ago)
dea1a68 feat(ui): add Project Documents collapsible section to artifact workspace (2 days ago)
92ee2bb fix(ui): right panel falls back to artifact workspace empty state, not documents list (2 days ago)
13346bf feat(os): discriminator-aware operating statement (Phase 1) (2 days ago)
```

## Active To-Do / Carry-Forward

- [ ] Commit uncommitted work (source pointers, mirrored columns, artifact rename/delete, project GET expansion, S14 test)
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] BASE_INSTRUCTIONS cleanup — ~80 lines of superseded T-12 strict content rules still in `ai_handler.py` (deferred until OS guard observed stable)
- [ ] Phase 5 (Python waterfall replication) — only remaining major Excel audit piece
- [ ] Scanned PDF / OCR pipeline — alpha blocker, not yet implemented

## Alpha Readiness Impact

- FB-286 closed (artifact tile UX fix) — minor polish, no blocker movement
- Source pointers (uncommitted) advance artifact audit trail — quality improvement, not a blocker
- Mirrored column fix prevents data integrity issues on project updates — reliability improvement
- No alpha blocker status changes today

## Notes for Next Session

- Large uncommitted diff (~450 lines across 8 files) — review and commit or split into logical commits
- Source pointers are builder-only; the renderer-side "Source Pointers" panel needs to read and display them (follow-on work)
- Mirrored columns fix is important for Landscaper tool writes — test with `update_project` tool to verify both `city` and `jurisdiction_city` update simultaneously
- S14 test scenario needs validation run

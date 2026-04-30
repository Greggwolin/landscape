# Daily Sync — 2026-04-29

**Date**: Tuesday, April 29, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/unified-ui`

---

## Work Completed Today

### Features Added
- **Artifacts System — Phases 1–4 (committed):** Full generative artifacts pipeline landed in four commits:
  - **Phase 1** (`59a15f1`): Storage tables (`tbl_artifact`, `tbl_artifact_version`, `tbl_artifact_dependency`), 4 Landscaper tools (`create_artifact`, `update_artifact`, `get_artifact`, `list_artifacts`), REST endpoints with versioning
  - **Phase 2** (`17e1655`): `ArtifactRenderer` component (~1029 lines) with v1 block vocabulary (`section`, `table`, `key_value_grid`, `text`), types, `useArtifact` hook, dev test route at `/dev/artifact-renderer`
  - **Phase 3** (`6c39a48`): `ArtifactWorkspacePanel` (~553 lines) for right-panel workspace, state management, auto-open dispatch on artifact creation
  - **Phase 4** (`6c4cb9d`): System prompt firing rules (hard rules in `ai_handler.py`), dependency hooks for cascade invalidation (`cascade.py` ~303 lines), `ArtifactBehaviorSettings` UI, `ArtifactCardInline` chat cards, `CascadeNotification` component, real update path via `useArtifact` hook

### Work In Progress (Uncommitted)
- **Artifact firing discipline hardening (Phase 5-ish):** ~353 lines of uncommitted changes across `ai_handler.py`, `tool_schemas.py`, `tool_executor.py`, `tool_registry.py`:
  - Rewrote `ARTIFACTS — FIRING DISCIPLINE` section from advisory guidance to hard mandatory rules (MUST fire / MAY NOT reply in prose)
  - Added `get_operating_statement` tool — wraps Django Operations view, registered in `INCOME_PROPERTY_TOOLS`
  - Enforced DB-first search order (document search / RAG / benchmarks forbidden as first step)
  - Strengthened `create_artifact` tool description to declare it the REQUIRED output format for tabular financial data

## Files Modified (Committed — last 4 commits)

```
 backend/apps/artifacts/cascade.py                  |  303 +++
 backend/apps/artifacts/views.py                    |   99 +-
 backend/apps/financial/views_operations.py         |   51 +-
 backend/apps/knowledge/views/workbench_views.py    |   31 +
 backend/apps/landscaper/ai_handler.py              |   83 +
 backend/apps/landscaper/tool_executor.py           |    1 +
 backend/apps/landscaper/tool_registry.py           |   13 +
 backend/apps/landscaper/tool_schemas.py            |  115 +
 backend/apps/landscaper/tools/artifact_tools.py    |  260 +++
 backend/apps/projects/models.py                    |   10 +
 backend/apps/projects/serializers.py               |    1 +
 backend/config/settings.py                         |    1 +
 backend/config/urls.py                             |    1 +
 migrations/20260429_create_artifact_tables.up.sql  |  104 +
 migrations/20260429_create_artifact_tables.down.sql|   22 +
 src/app/dev/artifact-renderer/page.tsx             |  455 +++
 src/components/landscaper/ChatMessageBubble.tsx     |   58 +
 src/components/landscaper/LandscaperChatThreaded.tsx|    8 +
 src/components/wrapper/ArtifactBehaviorSettings.tsx|  157 +
 src/components/wrapper/ArtifactCardInline.tsx      |   85 +
 src/components/wrapper/ArtifactRenderer.module.css |  421 +++
 src/components/wrapper/ArtifactRenderer.tsx        | 1029 ++++++
 src/components/wrapper/ArtifactWorkspacePanel.tsx  |  553 +++
 src/components/wrapper/CascadeNotification.tsx     |  304 +++
 src/components/wrapper/CenterChatPanel.tsx         |   21 +-
 src/components/wrapper/PageShell.tsx               |    3 +
 src/components/wrapper/ProjectArtifactsPanel.tsx   |   12 +-
 src/contexts/WrapperUIContext.tsx                  |   55 +
 src/hooks/useArtifact.ts                           |  247 ++
 src/hooks/useExtractionStaging.ts                  |   21 +
 src/hooks/useOperationsData.ts                     |   25 +-
 src/types/artifact.ts                              |  181 +
```

## Files Modified (Uncommitted)

```
 backend/apps/landscaper/ai_handler.py    | 293 +++++++++++-
 backend/apps/landscaper/tool_executor.py |  62 +++
 backend/apps/landscaper/tool_registry.py |   1 +
 backend/apps/landscaper/tool_schemas.py  |  38 +-
```

## Git Commits (Today + Recent 3 Days)

```
6c4cb9d feat(artifacts): Phase 4 - system prompt firing rules + dependency hooks + cascade modes + chat cards + real update path (5 hours ago)
6c39a48 feat(artifacts): Phase 3 — right-panel workspace + state + auto-open dispatch (6 hours ago)
17e1655 feat(artifacts): Phase 2 — ArtifactRenderer component + types + hook + test route (7 hours ago)
59a15f1 feat(artifacts): Phase 1 - storage tables + Landscaper tools + REST endpoints (9 hours ago)
c4f647d docs(claude): track post-alpha entity-creation guard as tech debt (27 hours ago)
e27123e fix(landscaper): block cross-property data fabrication in system prompt (27 hours ago)
6e2c104 perf(landscaper): drop include_closed=true + dedup loadAllThreads on /w/chat (27 hours ago)
43f30a6 perf(landscaper): drop N+1 + duplicate fetch on thread list endpoint (28 hours ago)
3afb67a fix(auth): redirect to /login on 401 + repair logout button discoverability (30 hours ago)
53ac550 fix(chat): kill false 'Request timed out' caused by AbortController race (30 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Commit uncommitted artifact firing discipline changes (ai_handler.py, tool_schemas.py, tool_executor.py, tool_registry.py) — adds `get_operating_statement` tool + hard firing rules
- [ ] Update CLAUDE.md Landscaper tool count after committing (currently 262 registered → 263 with `get_operating_statement`)
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Artifact system Phase 5+: inline editing, version history UI, cascade notification UX polish

## Alpha Readiness Impact

No alpha blocker movement today. The artifacts system is a new feature layer on top of the existing alpha-ready workflow — it enhances Landscaper output quality but doesn't gate any of the 6 original alpha blockers (all previously resolved).

## Notes for Next Session

- The artifact firing discipline rewrite in `ai_handler.py` is substantial (~260 new lines replacing ~40). It introduces mandatory firing (MUST call `create_artifact` for tabular financial requests) and a strict DB-first search order. This is a behavioral change that should be tested against real chat flows.
- `get_operating_statement` is a new read-only tool that wraps the existing Django Operations view. It's registered in `INCOME_PROPERTY_TOOLS` (not land dev). Needs testing on MF projects.
- The `cascade.py` module (Phase 4) implements dependency tracking for artifact invalidation — when underlying data changes, dependent artifacts get flagged stale. This is infrastructure for future cascade notifications.
- 4 new DB tables landed via migration `20260429_create_artifact_tables.up.sql`: `tbl_artifact`, `tbl_artifact_version`, `tbl_artifact_dependency`, `tbl_artifact_cascade_log`. Migration needs to be run if not already applied.

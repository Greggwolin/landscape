# Daily Sync — 2026-08-21 (Thursday)

**Branch:** `feat/budget-2b2-renderer`
**Commits today:** 3

---

## Changes by Category

### Features
- **`006bc981` feat(budget): render every offered budget field as in-place editor** — Extended the budget editing spine so every field the builder offers a `cell_source_ref` for becomes an in-place editor on the schedule artifact. New `budgetCellTarget.ts` resolver maps artifact cell keys to DB columns via `_BUDGET_CELL_TO_COLUMN`. Tests added for both the Python cell mapping (`test_budget_cell_mapping.py`) and TypeScript target resolution (`budgetCellTarget.test.ts`). Files: `budget_artifact_builder.py`, `schedule_view_spec.py`, `ScheduleArtifact.tsx`, `ScheduleArtifact.module.css`, `useStagedEdits.ts` (+231/−19 lines).

### Bug Fixes
- **`573f2f00` fix(budget): picklists empty because panel rendered archived artifact** — `ArtifactWorkspacePanel` was rendering an archived artifact version, causing picklist editors (UOM, lifecycle stage) to show empty option lists. Fixed by filtering to non-archived artifacts in the serializer, updating the view spec to pass valid picklist options through to the renderer, and adding artifact-state awareness to `useArtifact`. Files: `serializers.py`, `schedule_view_spec.py`, `ArtifactWorkspacePanel.tsx`, `ScheduleArtifact.tsx`, `useArtifact.ts` (+121/−35 lines).

### Tech Debt / Infrastructure
- **`1eabb608` fix(tests): remove TEST_DATABASE_URL redirect (#257)** — Removed the unreliable `TEST_DATABASE_URL` env var redirect from `conftest.py`. The safety guard now relies solely on hostname validation (localhost/127.0.0.1/::1/unix socket/docker aliases). Updated CLAUDE.md with comprehensive test safety documentation including the override env var name (`LANDSCAPE_ALLOW_TEST_DB=i-know-this-is-not-production`). PR #257. Files: `CLAUDE.md`, `README.md`, `backend/.env.example`, `backend/conftest.py` (+178/−80 lines).

---

## Summary

Budget artifact editing spine continues to mature. The key advance today is that every field the builder marks as editable now renders as an in-place editor — rate, UOM, start month, duration, and notes cells all edit in place on the schedule artifact. A bug where picklist fields showed empty options (because the panel was rendering an archived artifact snapshot lacking current option sets) was fixed alongside. Separately, the test infrastructure was cleaned up: the confusing `TEST_DATABASE_URL` redirect was removed from `conftest.py`, leaving the hostname-based safety guard as the single mechanism preventing pytest from creating scratch databases on production Neon.

## Open Items
- Slice 1 PR still unmerged to main (now 22 days)
- Dedup fix blast radius not yet traced
- Four of eight view-spec knobs built; filter, window, basis, sort/predicate remain
- Contingency model specified but not yet built
- Orphaned test databases (`test_land_v2`, `test_test_land_v2`) still present in live Neon — safety guard committed but DBs not dropped

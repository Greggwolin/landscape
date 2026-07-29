# Daily Sync — 2026-07-28

**Date**: Monday, July 28, 2026
**Generated**: Nightly automated sync (23:30 MST)

---

## Work Completed July 28

### Features Added

- **Thread destination persistence (TA1, PR #226):** Reopening a chat now returns the user to the same right-panel view they left off on. New `landscaper_thread_last_destination` table (migration `20260728_thread_last_destination`) stores `{destination_type, destination_id}` per thread. Django model, serializer update, new `ThreadDestinationView` (GET/PATCH). Frontend: `useThreadDestination.ts` hook, `threadDestination.ts` pure-logic module with full Jest test suite (224 lines). CenterChatPanel dispatches saved destination on thread switch.

- **Artifact editing spine — slice 1 (CB6, PR #224):** One budget cell is now writable end-to-end. `ArtifactRenderer` gains inline edit mode for editable cells (qty, rate). New `budget_artifact_builder.py` module builds deterministic artifact schemas with cell source refs for optimistic-locking. `views.py` gains `commit_cell_edit` endpoint (single-cell write with captured_value concurrency guard). 178-line pytest suite for the commit path. ArtifactWorkspacePanel refactored for edit state management.

- **Artifact batch commit (CB8, PR #227):** Users can now stage several budget edits and land them as one set. New batch commit endpoint in `views.py`. `ArtifactRenderer` gains staged-edit queue, batch commit UI, and dirty-state indicators. New `useArtifact.ts` hook (81 lines) and `artifact.ts` types (26 lines). 83-line pytest suite for batch commit.

### Bug Fixes

- **Variance empty-path relay (CB3, PR #221):** `tool_executor.py` now returns a structured relay instruction when budget variance data is empty, so Landscaper gives the user a useful "no data yet" message instead of a blank artifact.

- **Artifact-tool empty/degraded relay sweep (CB4, PR #222):** Systematic sweep of artifact-producing tools to ensure every empty or degraded data path returns a relay instruction. 135-line coverage test suite. PROJECT_INSTRUCTIONS.md updated with the relay contract (+44 lines).

- **Fabrication guard vocabulary widened (CB5, PR #223):** Guard now catches income-property and land-sales financial vocabulary (cap rate, NOI, GRM, $/FF, etc.) in addition to the existing budget/returns vocabulary. 60-line pytest expansion.

- **Planning activity log fix (CB7, PR #225):** `_log_planning_activity` was silently dropping every log entry because the `status` field value didn't match the model's `choices` tuple. Fixed to pass a valid status.

- **Map LayerPanel hydration mismatch (#228):** Added stable `DndContext` id to `LayerPanel.tsx` so drag-and-drop layer reordering doesn't produce a React hydration mismatch warning.

- **Thread-aware artifact routing (TA5, 2 commits):** Artifacts from server-rendered schedule tools now open in the right panel and record to thread destination. `threadDestination.ts` broadened to handle artifact payloads from `CenterChatPanel` tool-result handler.

### In-Flight (Uncommitted)

- **UOM picklist editing (CB10):** `budget_artifact_builder.py` extended to make the UOM column editable as a picklist (dropdown) rather than free text — FK-constrained to `core_fin_uom`. `sales_artifact_builder.py` has parallel changes. `tool_executor.py` passes `uom_options` through. Not yet committed.

---

## Files Modified (Committed)

```
backend/apps/artifacts/tests/test_batch_commit.py      (+83)
backend/apps/artifacts/tests/test_commit_cell_edit.py   (+178)
backend/apps/artifacts/views.py                          (heavy — cell edit + batch commit)
backend/apps/landscaper/ai_handler.py                    (+31 fabrication guard)
backend/apps/landscaper/migrations/0007_thread_last_destination.py (+40)
backend/apps/landscaper/models.py                        (+21)
backend/apps/landscaper/serializers.py                   (+9)
backend/apps/landscaper/tests/test_budget_variance.py    (+17)
backend/apps/landscaper/tests/test_fabrication_guard.py  (+60)
backend/apps/landscaper/tests/test_artifact_relay_coverage.py (+135)
backend/apps/landscaper/tests/test_thread_destination.py (+207)
backend/apps/landscaper/tool_executor.py                 (relay + log fix)
backend/apps/landscaper/tools/budget_artifact_builder.py (+128)
backend/apps/landscaper/urls.py                          (+12)
backend/apps/landscaper/views.py                         (+79)
docs/PROJECT_INSTRUCTIONS.md                             (+83)
migrations/20260728_thread_last_destination.up.sql       (+67)
migrations/20260728_thread_last_destination.down.sql     (+14)
src/components/map-tab/LayerPanel.tsx                    (+7)
src/components/wrapper/ArtifactRenderer.tsx               (heavy — edit mode)
src/components/wrapper/ArtifactWorkspacePanel.tsx         (edit state)
src/components/wrapper/CenterChatPanel.tsx                (destination + artifact routing)
src/hooks/useArtifact.ts                                 (+81)
src/hooks/useThreadDestination.ts                        (+158)
src/lib/landscaper/threadDestination.test.ts             (+224 → 290 across commits)
src/lib/landscaper/threadDestination.ts                  (+256 → 324 across commits)
src/types/artifact.ts                                    (+26)
```

## Git Commits (10 today)

```
aa5cd7f0 fix(landscaper): open + record artifacts from server-rendered schedule tools (TA5)
170e896b fix(landscaper): send artifacts somewhere they can actually render (TA5)
4792cef0 fix(map): stable DndContext id stops LayerPanel hydration mismatch (#228)
429836a9 feat(artifacts): batch commit — stage several budget edits, land as one set (CB8) (#227)
d821c6bd feat(landscaper): reopening a chat returns you where it left off (TA1) (#226)
14cbf273 fix(landscaper): _log_planning_activity invalid status dropped every log (CB7) (#225)
9aee5c2f feat(artifacts): editing spine slice 1 — one budget cell writable end to end (CB6) (#224)
3d6ee7fe fix(landscaper): widen fabrication-guard vocabulary — income property + land sales (CB5) (#223)
6bfb626c fix(landscaper): artifact-tool empty/degraded relay sweep (CB4) (#222)
8b5d14b4 fix(landscaper): variance empty-path relay instruction (CB3) (#221)
```

## Active To-Do / Carry-Forward

- [ ] UOM picklist editing (CB10) — uncommitted changes in budget_artifact_builder.py, sales_artifact_builder.py, tool_executor.py
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blockers moved today. The editing spine (CB6/CB8) and thread destination persistence (TA1) are UX quality improvements to the chat-first surface — not blockers. The fabrication guard widening (CB5) and relay sweep (CB4) strengthen the "no fabricated data" guarantee.

## Notes for Next Session

- **Editing spine is live end-to-end:** Budget cells (qty, rate) are writable with optimistic locking. UOM picklist editing (CB10) is next — changes are staged but uncommitted.
- **Batch commit pattern established:** The stage-then-commit-all pattern in ArtifactRenderer is the template for future editable artifacts (sales, cap structure, etc.).
- **Thread destination is persisted:** When a user returns to a chat thread, the right panel restores the last artifact/content view. This is foundation for the "last thing I was looking at" UX.
- **4 uncommitted files** — CLAUDE.md (tool count bump, already done by prior sync), tool_executor.py, budget_artifact_builder.py, sales_artifact_builder.py. All are in-flight CB10 work.

# Daily Sync — 2026-05-02

**Date**: Friday, May 2, 2026
**Generated**: Nightly automated sync
**Branch**: `chat-artifacts`

---

## Work Completed Today

**No commits today** (Saturday). All committed work landed yesterday (May 1). However, the working tree has **7 modified files with +340 / −52 lines** of uncommitted changes representing active in-progress work:

### Uncommitted Changes (In Progress)

**Features progressed:**
- **Source pointers for operating statements** (`tool_executor.py`, +119 lines) — New `_build_operating_statement_source_pointers()` function walks the operations payload and returns a flat list of DB-backed source pointers (table, row_id, column, captured_value) for each line item. Covers rental income (aggregated by unit_type), vacancy/credit/concessions (project-level assumptions), and operating expense lines (from `tbl_operating_expenses`). Computed/subtotal lines intentionally excluded.
- **Source pointer pass-through instruction** (`ai_handler.py`, +11 lines) — New BASE_INSTRUCTIONS rule §7 under "OPERATING STATEMENT — DISCRIMINATOR HONESTY": instructs Landscaper to pass `source_pointers` array verbatim from `get_operating_statement` response into `create_artifact` without modification. Prevents the model from dropping audit trail data.
- **Artifact workspace panel enhancements** (`ArtifactWorkspacePanel.tsx`, +250/−52 lines) — Added rename and delete (soft-delete via `is_archived`) row actions with prompt/confirm dialogs. Queries refetch on success. Background changed from `--cui-body-bg` to `--w-bg-sidebar`. Project Documents section added at top of panel for project-scoped views.
- **CSS tweaks** (`ArtifactRenderer.module.css`, `wrapper.css`) — Minor styling adjustments.
- **Agent test framework** (`tests/agent_framework/run.py`) — Small additions; new `scenario_s14.py` test file (untracked).

### Recent Commits (Last 3 Days — May 1 & Apr 30)

| Hash | Description | Date |
|------|-------------|------|
| `0795767` | fix: /w/projects list no longer inherits last project's chat context | May 1 |
| `3f8d31c` | fix: bump gunicorn worker timeout to 180s | May 1 |
| `017d1cc` | revert overly-broad migrations unignore from .gitignore | May 1 |
| `0c8e45a` | docs: log Phase 1 ship + tool count update | May 1 |
| `dea1a68` | feat: add Project Documents section to artifact workspace | May 1 |
| `92ee2bb` | fix: right panel falls back to artifact workspace empty state | May 1 |
| `13346bf` | **feat: discriminator-aware operating statement (Phase 1)** | May 1 |
| `256743d` | docs: log release cut — Alpha18-UI archive + unified-ui → main | May 1 |
| `d03e1b3` | WIP: F4 carryover (new-thread fix + selectThread refresh) | May 1 |
| `46fec8d` | nightly session-notes sync 2026-04-30 | Apr 30 |
| `f003d76` | docs: schema-audit rule (§17.7) + discriminator high-risk zone (§17.8) | Apr 30 |
| `ad0b7f1` | Revert F-12 proforma server-derivation (not discriminator-aware) | Apr 30 |
| `fae31fe` | feat: F-12 proforma server-derivation (reverted) | Apr 30 |
| Multiple | Artifacts Phase 5: OS guard, tabular formatting, single-table layout | Apr 30 |

## Files Modified (Uncommitted)

```
 backend/apps/landscaper/ai_handler.py              |  11 +
 backend/apps/landscaper/tool_executor.py           | 119 +
 logs/daily-brief.err                               |   3 +
 src/components/wrapper/ArtifactRenderer.module.css |   2 +-
 src/components/wrapper/ArtifactWorkspacePanel.tsx  | 250 ++++/52 ----
 src/styles/wrapper.css                             |   3 +-
 tests/agent_framework/run.py                       |   6 +
```

Untracked: `tests/agent_framework/scenario_s14.py`

## Active To-Do / Carry-Forward

- [ ] **Source pointers (uncommitted)** — `tool_executor.py` and `ai_handler.py` changes need testing and commit. Source Pointers panel on artifact renderer needs wiring to consume this data.
- [ ] **Artifact workspace rename/delete (uncommitted)** — `ArtifactWorkspacePanel.tsx` changes need testing and commit. Verify `patchMutation` endpoint supports `is_archived` and `title` fields.
- [ ] **Re-run demo project clones on host:** `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] **PropertyTab.tsx floor plan double-counting fix** (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] `.gitignore` migrations unignore — reverted in `017d1cc` (too broad). Need a narrower pattern or per-file `git add -f` discipline.
- [ ] `_normalize_phrase` in `vocab_tools.py` doesn't strip stop words — lower vocab-lookup hit rate than design intent.
- [ ] BASE_INSTRUCTIONS T-12 strict content rules (~80 lines) still present but superseded by OS guard — removal deferred until guard is stable in production.
- [ ] Phase 5 (Python waterfall replication) for Excel audit — only remaining major piece.

## Alpha Readiness Impact

No alpha blocker movement today (no commits). Yesterday's commits completed:
- **Discriminator-aware OS Phase 1** — shipped (`13346bf`). Operating statements now respect `statement_discriminator` taxonomy instead of silently mislabeling scenarios.
- **Release cut** — `feature/unified-ui` promoted to `main`, archived as `Alpha18-UI`. Production redeploying on Vercel + Railway.
- **Gunicorn timeout** — bumped to 180s, fixing Railway worker timeouts on heavy Landscaper calls.

Overall alpha readiness remains at **~92%**. Scanned PDF/OCR pipeline is the last true blocker.

## Notes for Next Session

1. **Uncommitted source-pointer work** is substantial (+130 lines across 2 backend files). Test the `_build_operating_statement_source_pointers` function before commit — verify pointer shapes for rental income, vacancy, and opex lines.
2. **ArtifactWorkspacePanel** rename/delete UX is wired but untested. The `patchMutation` needs to handle `is_archived: true` on the Django side — verify the serializer accepts that field.
3. **Branch is `chat-artifacts`** — this is the active working branch post release-cut. `main` was force-pushed from `feature/unified-ui` on May 1.
4. **Agent test framework** has a new scenario file (`scenario_s14.py`) — may be related to OS discriminator testing.

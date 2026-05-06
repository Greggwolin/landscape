# Daily Sync — 2026-05-05

**Date**: Monday, May 5, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added / Progressed

- **Artifact dedup-on-create** (commit `6bd9dcf`) — one canonical artifact per (project, tool, slot) triple. New `dedup_key` concept on `tbl_artifact` with migration + `find_or_create_artifact` service method. Prevents duplicate artifacts when Landscaper re-runs the same tool for the same project context.
- **`get_project_profile` tool** (commit `6ccfe25`) — project metadata rendered as a structured artifact.
- **`update_project_msa` tool** (commit `1658521`) — FK-aware MSA updater for project geo context.
- **Universal archive pattern Phase 1a** (commit `294271e`) — soft-archive for chat threads end-to-end (DELETE defaults to archive, `?force=true` for hard delete, POST `/restore/`, sidebar "Archived" section).
- **Multi-tool turn continuation** (commit `4ec8f4d`) — classifier-driven continuation when tool chains cut off at MAX_TOKENS; prevents the 30-40% S16 failures.
- **Landscape command bus** (commit `4ec8f4d`) — cross-tree event dispatch for chat-driven UI commands (solves modal handoff bug where `open_input_modal` silently dropped when chat panel couldn't reach project-scoped providers).
- **Feedback Log Live Dashboard Phases 1–5** (commits `432204e` → `049000d`) — `working_summary` + `active_chat_slug` columns, `append_feedback_line` + `mark_feedback_addressed` management commands, near-push + hourly poller scheduled tasks, PROJECT_INSTRUCTIONS §21 codified.
- **DMS right-panel toggle + Platform Knowledge promotion** (commit `9e07538`) — documents moved into artifacts panel toggle; Platform Knowledge gets top-level `/w/platform-knowledge` route.
- **Artifact DELETE endpoint** (commit `2d59497`) — soft-archive default, `?force=true` for hard delete.

### Bugs Fixed

- Profile artifact column alignment + field resolution + mutation proposal CCollapse (commit `1f69b0c`)

### Documentation Updated

- CLAUDE.md: session history extracted to `CLAUDE_SESSION_HISTORY.md`, feedback log infra documented, scheduled task cadence notes
- PROJECT_INSTRUCTIONS.md: §21 (append_feedback_line protocol), §21.9 (mark_feedback_addressed)
- Repo review audit HTML generated (`docs/audits/landscape-repo-review-2026-05-05.html`)

### Uncommitted Work In Progress

- **Doc-chat threads** — `ChatThread.doc_id` field (migration `0005_thread_doc_link.py`), `doc_chat_service.py` (seed summary builder), three new ViewSet actions (`by_doc`, `for_docs`, `doc_chat`), URL routes. This is Phase 1 of "chat with this document" persistent threads.
- **Sidebar density improvements** — thread/project caps reduced to 5, "See more" for projects, font size bump 12→13.
- **ArtifactWorkspacePanel + DocumentsPanel** — significant uncommitted changes (~297 lines net).

## Files Modified (Uncommitted)

```
 CLAUDE.md                                          |  15 +-
 backend/apps/landscaper/models.py                  |  14 ++
 backend/apps/landscaper/serializers.py             |   4 +-
 backend/apps/landscaper/urls.py                    |  16 ++
 backend/apps/landscaper/views.py                   | 173 ++++++++++++++
 docs/PROJECT_INSTRUCTIONS.md                       | 127 ++--------
 src/components/landscaper/ThreadList.tsx            |  12 +-
 src/components/wrapper/ArtifactWorkspacePanel.tsx   |  42 ++--
 src/components/wrapper/ProjectArtifactsPanel.tsx    |   2 +-
 src/components/wrapper/WrapperSidebar.tsx           |  43 +++-
 src/components/wrapper/documents/DocumentsPanel.tsx | 255 +++++++++++++++++++-
 src/components/wrapper/documents/MediaPanel.tsx     |   5 +-
 src/styles/wrapper.css                             |  31 ++-
```

New untracked files:
- `backend/apps/landscaper/migrations/0005_thread_doc_link.py`
- `backend/apps/landscaper/services/doc_chat_service.py`
- `docs/CLAUDE_SESSION_HISTORY.md`
- `docs/PROJECT_INSTRUCTIONS_REFERENCE.md`
- `docs/audits/landscape-repo-review-2026-05-05.html`

## Git Commits (Today)

```
6bd9dcf feat(artifacts): dedup-on-create — one canonical artifact per (project, tool, slot)
```

(All other commits from today were pushed during daytime sessions — 12 commits between `432204e` and `1f69b0c`)

## Active To-Do / Carry-Forward

- [ ] **Doc-chat threads** — uncommitted Phase 1 in working tree; needs commit + frontend integration (document detail → "Chat about this doc" button)
- [ ] **Sidebar density** — uncommitted; ready to commit as a style pass
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e) — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll
- [ ] `list_feedback` VALID_STATUSES doesn't include `in_progress` — one-line fix
- [ ] §0.4 mirror of PROJECT_INSTRUCTIONS v4.2+v4.3 to Cowork project settings + Claude project knowledge
- [ ] Scanned PDF/OCR pipeline (alpha blocker)

## Alpha Readiness Impact

No movement on the single remaining alpha blocker (scanned PDF/OCR pipeline). Today's work was infrastructure hardening and UX polish — artifact dedup, multi-tool continuation reliability, archive pattern, feedback tracking automation. These improve stability for the alpha surface but don't unblock any new workflow step.

## Notes for Next Session

- Doc-chat thread work is partially done in the working tree — finish the frontend "Chat about this doc" entry point and commit together
- The `feedback-log-near-push` cadence was dropped from 2→5 min due to Mac sleep skipping runs; the nightly Daily Brief is the safety net
- PROJECT_INSTRUCTIONS.md got significantly shorter in the uncommitted diff (127 lines removed) — verify that's an intentional restructure vs accidental truncation before committing
- Artifact dedup migration (`20260505_artifact_dedup_key.up.sql`) needs to be run on production after deploy

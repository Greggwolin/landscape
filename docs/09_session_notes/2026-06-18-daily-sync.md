# Daily Sync — 2026-06-18

**Date**: Thursday, June 18, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### CI / Preview-DB Pipeline Hardening (#94–#96, #98)

Four commits stabilizing the GitHub Actions CI pipeline and Neon branch lifecycle:

- **#94 (947744d4)**: Repointed 11 files referencing the stale `spring-mountain` Neon branch to the current `ep-tiny-lab` data branch (fixes FB-293/FB-294).
- **#95 (e73084f9)**: Fixed `neonctl delete` invocation so PR preview branches actually get cleaned up on merge (fixes FB-294/FB-293).
- **#96 (81796514)**: Granted cleanup workflow PR-comment permission and made the comment step non-fatal so branch deletion still proceeds even if commenting fails.
- **#98 (9258e028)**: Repaired preview-DB pipeline end-to-end — corrected `neonctl` `--connection-string` flag (was `--conn-string`) and made the frontend build gate hermetic by passing `DATABASE_URL` explicitly rather than relying on ambient env.

### Universal Drag-and-Drop Zone (FB-298)

- **f71fc85b**: Unified the file-drop overlay across both the `/w/` chat-first UI and the legacy `/projects/[id]` Landscaper panel. Extracted shared logic into `useChatAttachment.ts` (+236 lines) and `ChatDragOverlay.tsx` (+61 lines), deleting ~425 lines of duplicated drag-handling code from `CenterChatPanel.tsx` and `LandscaperPanel.tsx`. Both UIs now share identical drop behavior, file-type validation, and visual feedback.

### Feedback & UI Fixes (#92, #93, #97)

- **#92 (187d5207)**: Auth header added to cash-flow POST call (fixes FB-309).
- **#93 (fde67d44)**: Auth header added to `useContainers` hook + project-aware navigation for Reports and Map tabs in the `/w/` shell (fixes FB-310/FB-308).
- **#97 (ea61a121)**: Removed empty "No artifact selected" placeholder block from `ArtifactWorkspacePanel` and ordered project tiles by `updated_at DESC` on the `/w/projects` page (fixes FB-325/FB-324).

### Scoped Nightly Commit Script (FB-304)

- **5a45c2d7**: Created `scripts/nightly/commit-generated-docs.sh` — a version-controlled, allowlist-gated committer that replaces the prior raw `git add -A` approach which swept in-flight backend code into a docs commit on 2026-05-19. The script only stages generated artifacts (session notes, health reports) and has a defense-in-depth guard that aborts if any resolved path matches a source-code pattern.

### Documentation Cleanup (#91)

- **c95116bf**: Committed trailing session notes (2026-06-13 through 2026-06-17) and updated the Landscaper Admin User Manual.

## Files Modified

```
 .github/actions/resolve-neon-db-url/action.yml     |   2 +-
 .github/workflows/cleanup.yml                      |  10 +
 .github/workflows/preview.yml                      |  19 +-
 CLAUDE.md                                          |   4 +-
 README.md                                          |   2 +-
 docs/09_session_notes/2026-06-13-daily-sync.md     |  78 +++
 docs/09_session_notes/2026-06-14-daily-sync.md     |  48 ++
 docs/09_session_notes/2026-06-15-daily-sync.md     |  73 +++
 docs/09_session_notes/2026-06-16-daily-sync.md     |  89 +++
 docs/09_session_notes/2026-06-17-daily-sync.md     |  88 +++
 docs/14-admin/LANDSCAPER_ADMIN_USER_MANUAL.md      | 129 ++-
 scripts/auto-commit.sh                             |  11 +
 scripts/load-fixtures.sh                           |   2 +-
 scripts/neon-branch-create.sh                      |   2 +-
 scripts/neon-branch-delete.sh                      |  10 +-
 scripts/nightly/commit-generated-docs.sh           | 104 +++
 scripts/run-migrations.sh                          |   2 +-
 src/app/w/projects/page.tsx                        |   9 +-
 src/components/landscaper/ChatDragOverlay.tsx       |  61 ++
 src/components/landscaper/LandscaperChatThreaded.tsx|  99 ++
 src/components/landscaper/LandscaperPanel.tsx      | 193 +---
 src/components/landscaper/useChatAttachment.ts     | 236 ++++
 src/components/wrapper/ArtifactWorkspacePanel.tsx  |  17 +-
 src/components/wrapper/CenterChatPanel.tsx         | 306 +----
 src/hooks/useContainers.ts                         |   3 +-
 + 11 docs/schema files repointed from spring-mountain
```

## Git Commits

```
9258e028 fix(ci): repair preview-DB pipeline — neonctl flag + hermetic frontend gate (Parts 1 & 3) (#98)
ea61a121 fix(wrapper): drop empty 'No artifact selected' block + order project tiles by recency (fixes FB-325 fixes FB-324) (#97)
5a45c2d7 fix(scripts): scope nightly auto-commit to generated docs only (fixes FB-304)
f71fc85b feat(landscaper): unify universal drop-zone across both chat UIs (fixes FB-298)
81796514 fix(ci): grant cleanup workflow PR-comment permission + make comment non-fatal (#96)
e73084f9 fix(ci): correct neonctl delete invocation so PR preview branches actually get cleaned up (fixes FB-294 fixes FB-293) (#95)
947744d4 chore(db): repoint stale spring-mountain refs to the ep-tiny-lab data branch (fixes FB-293 fixes FB-294) (#94)
fde67d44 fix(nav,phase): auth header for containers + project-aware Reports/Map nav (fixes FB-310 fixes FB-308) (#93)
187d5207 fix(cashflow): send auth header on cash-flow POST (fixes FB-309) (#92)
c95116bf chore(docs): commit trailing documentation behind merged feedback fixes (#91)
```

## Feedback Items Addressed

| FB | Description | Commit |
|----|-------------|--------|
| FB-293 | Stale Neon branch references | #94, #95 |
| FB-294 | PR preview branches not cleaned up | #94, #95 |
| FB-298 | Drag-drop only works in one chat UI | f71fc85b |
| FB-304 | Nightly commit sweeps source code | 5a45c2d7 |
| FB-308 | Reports/Map nav not project-aware | #93 |
| FB-309 | Cash-flow POST missing auth | #92 |
| FB-310 | Containers hook missing auth header | #93 |
| FB-324 | Project tiles not ordered by recency | #97 |
| FB-325 | Empty "No artifact selected" block | #97 |

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned-PDF / OCR pipeline remains the last alpha blocker.
- [ ] Several stale feature branches remain unmerged on origin (feat/spec-hidden-and-header-align, feature/dms-previewer, etc.) — consider cleanup.
- [ ] Preview-DB pipeline Part 2 (fixture loading) not yet merged — only Parts 1 & 3 shipped in #98.

## Alpha Readiness Impact

No change to overall alpha readiness (~92%). Today's work was CI/DevOps hardening and feedback-driven bug fixes — important for operational stability but not moving any alpha blocker. The scoped commit script (FB-304) prevents a recurrence of the May 19 source-code-in-docs-commit incident.

## Notes for Next Session

- The preview-DB pipeline is now functional for Parts 1 (Neon branch creation) and 3 (hermetic frontend gate). Part 2 (fixture loading against preview branch) may need separate attention.
- 9 feedback items resolved today (FB-293/294/298/304/308/309/310/324/325) — a good cleanup day.
- The universal drag-drop refactor (`useChatAttachment.ts`) is a net code reduction (~45 lines saved) and eliminates the "works in one UI but not the other" class of bugs going forward.
- Working tree is clean on `main`. No uncommitted changes.

# Daily Sync — 2026-05-04

**Date**: Sunday, May 4, 2026
**Generated**: Nightly automated sync
**Branch**: `chat-artifacts`

---

## Work Completed Today

### Features Added / Progressed

- **MARKET_PRO_FORMA canonical scenario discriminator** (`09e0c6d`) — Added new scenario discriminator to `views_operations.py`; extended S16 test scenario to validate market-proforma path through the synonym dictionary
- **Synonym dictionary Phase 1** (`9c22396`) — Operating statement scenario synonyms in `vocab_tools.py` (236+ lines); S16 test validates end-to-end discriminator honesty workflow
- **Media panel per-tile actions + lightbox** (`f31214a`) — Full-featured media gallery with per-tile actions, lightbox viewer, taxonomy refresh; 483 new lines in `MediaPanel.tsx`
- **Artifacts workspace: rename/delete row actions** (`c9914ac`) — Workspace panel polish with inline rename/delete on artifact rows
- **Collapsible Project Documents card** (`c5b3549`) — DocumentsPanel now collapsible
- **Anthropic prompt caching** (`2fd7919`) — Enabled prompt caching on all Landscaper chat call sites (`ai_handler.py`, `help_handler.py`) — performance optimization
- **Operating statement source_pointers** (`4375b5d`) — `get_operating_statement` now emits provenance metadata tracing which DB rows / doc extractions sourced each line item
- **Agent test scenarios S14, S15, S15-LD, S16** (`801d03a`, `f9edd66`, `70e886a`) — Four new integration test scenarios covering project info input, property details (rent roll), property details (parcels/land use), and operating-statement discriminator workflow

### Bugs Fixed

- **FB-282: MediaPanel wired to real project media** (`4309cef`) — Previously rendering placeholder data
- **FB-286: Full chat-inline artifact tile clickable** (`13c2310`) — Click target expanded from icon to full tile
- **FB-290: Visible drag handle on artifacts panel** (`50fcb2a`) — Left-edge drag handle made discoverable on `/w/chat`
- **Vocab stop-word stripping** (`c2afc8c`) — `vocab_tools.py` now strips common stop words before synonym lookup; S16 stderr expansion for debug observability

### Style / Polish

- Sidebar density bump + artifacts panel flex-row wrapper (`1b87f45`)
- Duplicate border removed on artifacts panel left edge (`59d65cb`)
- Drag handles reverted to thin/transparent for visual consistency (`43a9acd`)

### Uncommitted Work (WIP)

- **Platform Knowledge tools** — New `platform_knowledge_tools.py` (untracked) + schema additions in `tool_schemas.py` (+138 lines)
- **Document detail panel enhancement** — `DocumentDetailPanel.tsx` expanded (+145 lines)
- **Layout/context updates** — `layout.tsx`, `WrapperUIContext.tsx`, `ProjectArtifactsPanel.tsx` modified
- **FB-281 Phase 1 discovery audit** — Comprehensive audit report completed (see `2026-05-04-FB281-phase1-discovery.md`)
- **ProjectDocumentsBody.tsx** — New untracked component

## Files Modified (Committed Today)

```
 backend/apps/financial/views_operations.py              |   1+
 backend/apps/landscaper/ai_handler.py                   |  67+
 backend/apps/landscaper/help_handler.py                 |  20+
 backend/apps/landscaper/tool_executor.py                | 129+
 backend/apps/landscaper/tools/vocab_tools.py            | 352+
 backend/apps/landscaper/services/mutation_service.py    | 187+
 backend/apps/landscaper/management/commands/seed_test_opex_fixture.py | 331+
 docs/daily-context/session-log.md                       |  53+
 src/app/api/projects/[projectId]/route.ts               |   4+
 src/app/w/layout.tsx                                    |  15+
 src/app/w/projects/[projectId]/documents/page.tsx       |   2+
 src/components/dms/ProjectMediaGallery.tsx              |  33+
 src/components/wrapper/ArtifactRenderer.module.css      |   2+
 src/components/wrapper/ArtifactWorkspacePanel.tsx       | 250+
 src/components/wrapper/ProjectArtifactsPanel.tsx        |  22+
 src/components/wrapper/WrapperSidebar.tsx               |   6+
 src/components/wrapper/documents/DocumentsPanel.tsx     |  14+
 src/components/wrapper/documents/MediaPanel.tsx         | 605+
 src/lib/dms/classifications.ts                          |  51+
 src/styles/wrapper.css                                  |  56+
 tests/agent_framework/ (multiple new scenarios)         | 3900+
```

## Git Commits (16 today)

```
09e0c6d feat(landscaper): add MARKET_PRO_FORMA canonical scenario discriminator
1b87f45 style(wrapper): sidebar density bump + artifacts panel flex-row wrapper + FB-290 session entry
59d65cb style(artifacts): remove duplicate border on artifacts panel left edge
43a9acd style(artifacts): revert drag handles to thin/transparent for visual consistency
9c22396 feat(landscaper): synonym dictionary Phase 1 — operating statement scenarios
50fcb2a fix(artifacts): visible drag handle on /w/chat artifacts panel — closes FB-290
f31214a feat(media): MediaPanel per-tile actions + lightbox + taxonomy refresh
c2afc8c fix(landscaper,test): vocab stop-word stripping + S16 stderr expansion
70e886a test(agents): add S16 — operating-statement workflow with discriminator honesty
f9edd66 feat(test): S15-LD scenario — property details (parcels / land use)
c9914ac feat(artifacts): rename/delete row actions + workspace panel polish
c5b3549 feat(documents): make Project Documents card collapsible
4309cef fix(media): closes FB-282 — wire MediaPanel to real project media
2fd7919 perf(landscaper): enable Anthropic prompt caching on all chat call sites
4375b5d feat(os): emit source_pointers from get_operating_statement
801d03a fix(landscaper): backend bug fixes + S14/S15 test scenarios
```

## Active To-Do / Carry-Forward

- [ ] **FB-281 Phase 2** — DMS strict-list-on-upload enforcement. Phase 1 discovery audit completed today identifying 4 fallback sites. Phase 2 (actual gate implementation) pending.
- [ ] **Platform Knowledge tools** — New tool file and schemas uncommitted; likely needs completion and testing before commit
- [ ] **DocumentDetailPanel expansion** — Uncommitted changes (+145 lines); likely in-progress feature
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix
- [ ] PropertyTab.tsx floor plan double-counting fix — verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll
- [ ] BASE_INSTRUCTIONS cleanup — ~80 lines of T-12 strict content rules superseded by OS guard; removal deferred until guard observed stable
- [ ] `.gitignore` migrations SQL unignore pattern — broad pattern exposed ~140 untracked files; needs narrower approach

## Alpha Readiness Impact

No alpha blocker movement today. Work was focused on:
- **Discriminator honesty** (Phase 1 OS architecture) — hardening, not net-new alpha capability
- **Agent test framework** — quality/regression infrastructure (S14–S16)
- **UI polish** — media panel, artifacts workspace, sidebar density
- **Performance** — prompt caching (cost reduction, not feature)

Remaining alpha blocker: scanned-PDF / OCR pipeline (unchanged).

## Notes for Next Session

1. **Uncommitted platform_knowledge_tools.py** — appears to be a new Landscaper tool registration. Check if ready to commit or still WIP.
2. **FB-281 Phase 2** is the next logical DMS work item — 4 fallback sites identified, gate implementation needed.
3. **Prompt caching is live** — monitor Anthropic dashboard for cache hit rates and cost reduction.
4. **S16 test scenario** validates the full discriminator-honesty → synonym-dictionary → OS-artifact pipeline. Run it to verify the MARKET_PRO_FORMA path works end-to-end.
5. **13 modified files uncommitted** — several appear to be continuation of document/artifact panel work. Review and commit or stash before next feature branch.

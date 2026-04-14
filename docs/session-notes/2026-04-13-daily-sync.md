# Daily Sync — April 13, 2026

**Date**: Monday, April 13, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Commit: `4219e6f` — "docs: nightly health check 2026-04-13" (08:01 MST)

The only commit today was the automated morning health-check / nightly sync itself (reporting on April 12 activity). All other work today is sitting uncommitted — a substantial Cowork-style "unified wrapper" UI effort plus a new Landscaper modal-opening tool.

### Features Added / Progressed (uncommitted)

**Unified Wrapper UI ("Cowork" shell) — NEW**
- New top-level route tree under `src/app/w/` — `admin/`, `help/`, `landscaper-ai/`, `projects/`, `tools/`, `layout.tsx`, `page.tsx`. This is a parallel shell for the app using a unified wrapper pattern (see `docs/COWORK_UNIFIED_UI_IMPLEMENTATION.md` and `docs/landscape_unified_wrapper_v4.html` prototype).
- New wrapper component library: `src/components/wrapper/` — `PageShell.tsx`, `WrapperHeader.tsx`, `WrapperSidebar.tsx`, `SidebarRecentThreads.tsx`, `ArtifactPanel.tsx`, `ChatTogglePanel.tsx`, `ProjectContentWrapper.tsx`, `ProjectContextShell.tsx`, plus a `modals/` subdirectory.
- New contexts: `WrapperChatContext.tsx`, `WrapperProjectContext.tsx`, `ModalRegistryContext.tsx` — state plumbing for the wrapper shell and its modal registry.
- New hook: `useRecentThreads.ts` — powers the sidebar recent-threads list.
- New stylesheet: `src/styles/wrapper.css`.

**Landscaper: `open_input_modal` tool — NEW (tool count 231 → 232)**
- New file `backend/apps/landscaper/tools/modal_tools.py` registers `open_input_modal`. Non-mutating tool that returns modal metadata the frontend interprets to open one of 15 structured editing modals (operating_statement, rent_roll, property_details, budget, sales_comps, cost_approach, income_approach, loan_inputs, equity_structure, land_use, parcels, sales_absorption, renovation, contacts, project_details).
- Registry wired via `tool_registry.py` / `tool_executor.py` / `tool_schemas.py`.
- CLAUDE.md updated: tool count 232, added `open_input_modal` to Landscaper Architecture bullet.

**Recent Threads API endpoint — NEW**
- `backend/apps/landscaper/views.py` — `ChatThreadViewSet.recent` action returns recent threads across all accessible projects for the current user, sorted by `updated_at` desc, with project name/type, page/subtab context, and message counts. Accepts `limit` and `include_closed` query params.
- `backend/apps/landscaper/urls.py` — `GET /landscaper/threads/recent/` route added.

### Refactors / Tech Debt

**Badge / Chip / Filter consolidation (ongoing design-system pass)**
- `src/components/dms/MediaBadgeChips.tsx` slimmed from 281 lines to a thin shim; logic moved to new `src/components/dms/MediaBadges.tsx`.
- `src/components/ui/landscape/StatusChip.tsx` reduced 163 → ~minimal; logic split into new `src/components/ui/landscape/StatusBadge.tsx`.
- `src/components/reports/ExtractionFilterPills.tsx` trimmed 144 lines; logic extracted to new `ExtractionFilterToggles.tsx`.
- `src/components/ui/landscape/PropertyTypeBadge.tsx` now sources from expanded `src/config/propertyTypeTokens.ts` (+60 lines of tokens).
- Barrel export updated: `src/components/ui/landscape/index.ts`.

**Styling / tokens**
- `src/styles/tokens.css` (+47 lines), plus touch-ups in `coreui-theme.css`, `component-patterns.css`, `folder-tabs.css`, `property-page.css`, `style-catalog.css`.

**Navigation / layout wiring**
- `src/app/components/NavigationLayout.tsx` and `src/app/projects/[projectId]/ProjectLayoutClient.tsx` touched to integrate with the new wrapper contexts.
- Minor touch-ups: `IncomeApproachContent.tsx`, `PropertyTab.tsx`, `ProjectProfileTile.tsx`, `LandscaperChatThreaded.tsx`, `ExtractionHistoryReport.tsx`, `AccordionFilters.tsx`.

### New Skills / Docs

- `skills/excel-model-audit/SKILL.md` — new (untracked).
- `docs/COWORK_UNIFIED_UI_IMPLEMENTATION.md` — new implementation doc for wrapper UI.
- `docs/landscape_unified_wrapper_v4.html` — v4 prototype.

## Files Modified

### Committed today (`4219e6f`)

Nightly sync commit only — reports April 12 work; see `docs/session-notes/2026-04-12-daily-sync.md` for details.

### Uncommitted (modified)

```
 CLAUDE.md                                                  |   4 +-
 backend/apps/landscaper/tool_executor.py                   |   1 +
 backend/apps/landscaper/tool_registry.py                   |   2 +
 backend/apps/landscaper/tool_schemas.py                    |  26 +-
 backend/apps/landscaper/urls.py                            |   7 +
 backend/apps/landscaper/views.py                           |  44 ++
 src/app/components/NavigationLayout.tsx                    |   5 +-
 src/app/projects/[projectId]/ProjectLayoutClient.tsx       |  14 +-
 src/app/projects/[projectId]/components/tabs/IncomeApproachContent.tsx | 4 +-
 src/app/projects/[projectId]/components/tabs/PropertyTab.tsx | 2 +-
 src/components/dms/MediaBadgeChips.tsx                     | 281 +--
 src/components/dms/filters/AccordionFilters.tsx            |   4 +-
 src/components/landscaper/LandscaperChatThreaded.tsx       |  21 +
 src/components/project/ProjectProfileTile.tsx              |   2 +-
 src/components/reports/ExtractionFilterPills.tsx           | 144 +--
 src/components/reports/ExtractionHistoryReport.tsx         |   6 +-
 src/components/ui/landscape/PropertyTypeBadge.tsx          |  13 +-
 src/components/ui/landscape/StatusChip.tsx                 | 163 +--
 src/components/ui/landscape/index.ts                       |   8 +-
 src/config/propertyTypeTokens.ts                           |  60 +
 src/styles/component-patterns.css                          |   2 +-
 src/styles/coreui-theme.css                                |   8 +-
 src/styles/folder-tabs.css                                 |   2 +-
 src/styles/property-page.css                               |   2 +-
 src/styles/style-catalog.css                               |   4 +-
 src/styles/tokens.css                                      |  47 +-
 26 files changed, 253 insertions(+), 623 deletions(-)
```

### Uncommitted (new / untracked)

```
 backend/apps/landscaper/tools/modal_tools.py                  (NEW)
 docs/COWORK_UNIFIED_UI_IMPLEMENTATION.md                       (NEW)
 docs/landscape_unified_wrapper_v4.html                         (NEW)
 skills/excel-model-audit/SKILL.md                              (NEW)
 src/app/w/                                                      (NEW route tree)
 src/components/dms/MediaBadges.tsx                             (NEW)
 src/components/reports/ExtractionFilterToggles.tsx             (NEW)
 src/components/ui/landscape/StatusBadge.tsx                    (NEW)
 src/components/wrapper/                                         (NEW, 9 files + modals/)
 src/contexts/ModalRegistryContext.tsx                          (NEW)
 src/contexts/WrapperChatContext.tsx                            (NEW)
 src/contexts/WrapperProjectContext.tsx                         (NEW)
 src/hooks/useRecentThreads.ts                                  (NEW)
 src/styles/wrapper.css                                         (NEW)
```

### Still-uncommitted carry-over from April 12 (NOT resolved)

The April 12 extraction-pipeline hardening work (`extraction_service.py`, `extraction_writer.py`, `opex_utils.py`, `text_extraction.py`, `extraction_views.py`, `workbench_views.py`, `useExtractionStaging.ts`) was **already committed** as part of the April 13 morning sync's scope — confirmed those files are no longer in `git status`. ✅

## Git Commits

```
4219e6f docs: nightly health check 2026-04-13 (Gregg Wolin, 08:01 MST)
```

## Active To-Do / Carry-Forward

- [ ] **Commit Cowork unified wrapper UI** — Large uncommitted scope spanning `src/app/w/`, `src/components/wrapper/`, 3 new contexts, `useRecentThreads` hook, `wrapper.css`, plus Django `recent` threads endpoint. Break into logical commits (backend endpoint, wrapper shell, contexts, styling) before pushing.
- [ ] **Commit `open_input_modal` tool** — New `modal_tools.py` + registry wiring + CLAUDE.md tool count bump is a coherent single commit.
- [ ] **Commit badge/chip consolidation** — `MediaBadges`, `StatusBadge`, `ExtractionFilterToggles`, `PropertyTypeBadge` refactor with token expansion is a separate logical commit.
- [ ] **Wire frontend `open_input_modal` handler** — Backend tool returns modal metadata; verify `ModalRegistryContext` actually renders the 15 declared modals. Some of those modals (renovation, sales_absorption, contacts) may not yet have UI implementations.
- [ ] **Dead tool refs** — `appraisal_knowledge_tools.py` references `tbl_knowledge_entity` / `tbl_knowledge_fact` which don't exist. Fix or stub (carried from Apr 11/12).
- [ ] **Four-status backend endpoints** — Verify `resolve`, `accept-all-matches`, `accept-all-new` routes work end-to-end (carried from Apr 11).
- [ ] **CoreUI compliance debt** — 6,979 violations. Not blocking alpha but tracking (carried).
- [ ] **`setInputText` wiring** — Imperative handle exists but no conflict-row "discuss" button calls it yet (carried).
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner includes MF units, leases, cost approach but existing clones (projects 125, 126) pre-date the fix.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit `fd54a3e` or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No direct movement on the 6 alpha blockers. The Cowork wrapper UI is a parallel shell and does not replace the existing project routes — it's additive. Once stable, it may simplify Landscaper integration (recent-threads sidebar, modal registry) but that's post-alpha polish, not a blocker resolution.

`open_input_modal` meaningfully expands Landscaper's ability to drop users into structured editing rather than free-text conversation, which supports the valuation workflow but doesn't itself unblock any of the 6 listed blockers.

## Notes for Next Session

1. **Commit strategy** — Today's uncommitted work is three independent threads. Commit in this order to keep history clean: (a) Landscaper `recent` endpoint + `open_input_modal` tool + CLAUDE.md; (b) badge/chip consolidation + token expansion; (c) Cowork wrapper UI (largest scope, do last).
2. **`src/app/w/` — confirm scope** — Is this intended to eventually replace the existing `src/app/projects/` tree, or run in parallel as a Cowork embedding? Affects how aggressively to merge/diverge logic.
3. **Modal coverage audit** — 15 modals declared in `open_input_modal`. Walk through `ModalRegistryContext` and confirm each has a concrete implementation, or stub the missing ones so the tool doesn't return "coming soon" in production.
4. **Wrapper contexts overlap** — `WrapperProjectContext` and `WrapperChatContext` may duplicate state held elsewhere (e.g., existing project context, Landscaper chat state). Check for drift risk before committing.

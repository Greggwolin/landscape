# Daily Sync — March 10, 2026

**Date**: Tuesday, March 10, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added / Progressed

**Operations Tab Enhancements** (`72f62a1`)
- Management fee ingestion override system — `management_fee_source` tracks origin (ingestion/user_modified/user)
- Ingested fees display as read-only $/unit with derived-% badge; user fees show percentage input
- `effectiveMgmtFeePct` ensures post-reno uses correct rate
- Operations API routes expanded (inputs, settings endpoints)
- New operations CSS tokens

**Market Intel Django Models** (`72f62a1`)
- `MarketGeography` model — hierarchical geo dimension (national → state → MSA → county → city → ZIP → submarket → custom)
- Self-referencing parent FK, CBSA/FIPS codes, lat/lng
- Part of three-table normalized market data design

**Help Panel & Landscaper Improvements** (`36d6b32`)
- `HelpLandscaperPanel.tsx` overhauled (+71 lines)
- Landscaper chat threaded component updated
- Help context refinements
- `alpha_views.py` significant rewrite (647 lines changed)
- Landscaper feedback utils and view updates

**Production Data Sync** (`30425fb`)
- `scripts/sync-production-data.sh` updated for alpha prep
- DMS Change Audit PDF generated
- UX health report generated

**Project Cloner Enhancements** (`d93c0ee`, `36d6b32`)
- Clone now includes `dms_project_doc_types`
- Project cloner service expanded (+127 lines)

### Bugs Fixed

**DMS Doc Type Folder Persistence** (`cfde365`, `9cb5b7f`, `7ec6eff`)
- Fixed: DMS filter folders disappeared after bulk document deletion
- Fix: Auto-register doc_types from DB via `tag_views.py` instead of deriving from active documents only
- Includes soft-deleted documents in registration (prevents folder loss)

**PropertyTab Floor Plan Double-Counting** (`36d6b32`)
- PropertyTab.tsx updated (+21 lines) — verify "Units: 113 / 178" no longer appears

### Technical Debt Addressed

**Massive .bak File Cleanup** (`36d6b32`)
- **~12,000 lines deleted** — removed 22 `.bak` files from `src/components/dms/`
- Components cleaned: DMSView, ProjectMediaGallery, AccordionFilters, DocTypeFilters, ProjectSelector, ColumnChooser, DocumentAccordion, DocumentTable, PlatformKnowledgeAccordion, PlatformKnowledgeTable, DeleteConfirmModal, DocumentChatModal, MediaCard, MediaPreviewModal, PlatformKnowledgeChatModal, PlatformKnowledgeModal, UploadCollisionModal, DmsLandscaperPanel, PlatformKnowledgeProfileForm, ProfileForm, TagInput, Facets, ResultsTable, SearchBox, DMSLayout, StagingRow, StagingTray, Dropzone, Queue, DocumentPreviewPanel, DocumentVersionHistory
- DMS codebase now clean of backup artifacts

**UI Cleanup** (`30425fb`)
- TopNavigationBar updated (+49/-lines)
- Layout.tsx streamlined
- ActiveProjectBar minor fix
- ProjectMediaGallery refactored (720 lines → significantly leaner)
- DocumentPreviewPanel updated
- CSS token fix

### Documentation Updated

- `CLAUDE.md` updated with project cloner and help panel context (+84 lines)
- Session note created (this file, initial version from earlier sync)
- DMS Change Audit PDF generated

---

## Files Modified

### Committed (7 commits, 12 files + 22 .bak deletions)

```
30425fb — 12 files changed, 560 insertions(+), 604 deletions(-)
36d6b32 — 48 files changed, 863 insertions(+), 12052 deletions(-)
7ec6eff — 1 file changed, 2 deletions(-)
d93c0ee — 1 file changed, 13 insertions(+)
72f62a1 — 8 files changed, 328 insertions(+), 25 deletions(-)
9cb5b7f — 2 files changed, 27 insertions(+), 10 deletions(-)
cfde365 — 2 files changed, 122 insertions(+), 2 deletions(-)
```

### Uncommitted (12 files, +742 / -64)

```
backend/apps/projects/serializers.py               |  10 +-
backend/apps/projects/services/project_cloner.py   | 243 ++++++++++-
backend/apps/projects/views.py                     |   6 +-
src/app/api/parcels/[id]/route.ts                  |  12 +
src/app/api/projects/[projectId]/waterfall/napkin/route.ts |  14 +-
src/app/api/projects/route.ts                      |   1 +
src/app/components/Planning/PlanningContent.tsx     | 444 +++++++++++++++++-
src/app/components/ProjectProvider.tsx              |   1 +
src/app/dashboard/page.tsx                         |  11 +
src/app/projects/[projectId]/capitalization/equity/page.tsx |  39 +-
src/app/projects/[projectId]/components/ActiveProjectBar.tsx |   5 +-
src/hooks/useLandscaperThreads.ts                  |  20 +-
```

Untracked:
```
src/components/capitalization/WaterfallConfigForm.tsx
```

---

## Git Commits

```
30425fb feat: alpha prep — sync script fix, help panel, DMS cleanup, production data sync (4h ago)
36d6b32 feat: alpha prep — help panel, landscaper, DMS cleanup, project cloner updates (7h ago)
7ec6eff fix: auto-register doc_types from all docs including soft-deleted (9h ago)
d93c0ee fix: clone dms_project_doc_types in ProjectCloner (10h ago)
72f62a1 feat: operations tab enhancements + market intel models (10h ago)
9cb5b7f fix: make DMS doc_type folders permanent via DB auto-registration (10h ago)
cfde365 fix: preserve DMS filter folders after bulk document deletion (10h ago)
```

---

## Active To-Do / Carry-Forward

- [ ] **Commit uncommitted work** — 12 modified files (+742 lines) including significant project cloner expansion (+243), PlanningContent overhaul (+444), WaterfallConfigForm (new), and equity page updates
- [ ] **Re-run demo project clones on host** — `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, cost approach, AND dms_project_doc_types but existing clones (projects 125, 126) were created before these fixes. Need to delete and re-clone.
- [ ] **PropertyTab floor plan double-counting** — commit `36d6b32` includes PropertyTab.tsx fix. Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] **MarketGeography migration** — model added in `72f62a1` but no SQL migration file created yet
- [ ] **Management fee round-trip** — verify `management_fee_source` saves correctly via `inputs/route.ts` and reloading ops tab restores correct state
- [ ] **Operations save migration (Alpha Blocker #2)** — more logic added to legacy Next.js routes today; migration debt growing

---

## Alpha Readiness Impact

Today was primarily a quality/cleanup day. No alpha blockers formally closed, but substantial progress:

| Blocker | Status | Today's Impact |
|---------|--------|---------------|
| #1 Reconciliation frontend | ✅ Done (Feb 21) | — |
| #2 Operations save migration | 🔴 Still legacy | More ops logic added today (mgmt fee override) |
| #3 Reports project scoping | 🔴 No movement | — |
| #4 Waterfall calculate endpoint | 🟡 WIP | WaterfallConfigForm.tsx created (uncommitted) |
| #5 OCR pipeline | 🔴 No movement | — |
| #6 PDF report generation | 🔴 No movement | — |

**Net effect:** ~12K lines of dead .bak code removed, DMS stability improved (doc_type persistence), project cloner more complete, operations tab more capable. Alpha readiness stays ~70% but the codebase is cleaner.

---

## Notes for Next Session

1. **Commit the uncommitted work** — 12 files ready. Especially notable: PlanningContent.tsx (+444 lines), project_cloner.py (+243 lines), WaterfallConfigForm.tsx (new). These are substantial and should be committed with a descriptive message.

2. **WaterfallConfigForm** — new untracked file suggests waterfall endpoint work is actively progressing (Alpha Blocker #4). Check its state and wire to the financial engine if ready.

3. **PlanningContent.tsx** — 444 new lines is a major expansion. Review what was added and ensure it aligns with the progressive complexity approach.

4. **Delete and re-clone demo projects** — the cloner was fixed twice today (doc_types + general expansion). Existing demo clones are stale.

5. **DMS doc_type auto-registration pattern** — new pattern: `tag_views.py` auto-registers doc_types from all documents (including soft-deleted). This replaces the fragile client-side derivation. Other similar patterns (status filters, etc.) might benefit from the same approach.

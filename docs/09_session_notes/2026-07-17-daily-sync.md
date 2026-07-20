# Daily Sync — July 17, 2026

**Date**: Thursday, July 17, 2026
**Generated**: Nightly automated sync (evening update — replaces morning stub)

---

## Work Completed Today

**Major feature day — 4 feature commits + 2 docs commits, +12,146 lines added.**

### 1. Design Shell — `/design/[projectId]` (Stage A restyle of `/studio`)

- `de80f4ee` feat(design): new `/design/[projectId]` route with `DesignShell.tsx` (506 lines) + `DesignSidebar.tsx` (387 lines) + `design.css` (212 lines). PR #170.
- `62343650` fix(design): exempt `/design` routes from legacy NavigationLayout chrome + force dark-only theme via CoreUIThemeProvider; CSS token punch-up for design shell.
- **Uncommitted WIP:** `DesignProjectHome.tsx` (353 lines new file), +224 lines of additional DesignShell/Sidebar/CSS refinements, plus `docs/design-reference/` and `public/design-reference/` directories (reference HTML exports: Artifact Kit, Slice 1 Reference Design, support.js).
- Currently on branch `feature/design-shell`.

### 2. DMS File Previewer — PDF + XLSX inline preview

- `bdad6c4a` feat(dms): file previewer — 8 new components in `src/components/preview/` (+1,368 lines). `DocumentPreviewModal`, `FilePreviewer`, `PdfPreview`, `XlsxPreview`, `PreviewError`, `PreviewLoading`, `UnsupportedPreview`, plus shared types. Integrated into `ArtifactWorkspacePanel` and `DocumentDetailPanel`.
- Squash merge of `feature/dms-previewer` branch (was flagged as 10 weeks stale in carry-forward — now merged).

### 3. Map Sales Layer + Maricopa Sales Importer

- `11e11891` feat(map/sales): matched map sales layer to Market screen styling + new Maricopa County sales data importer. Django management command `ingest_maricopa_sales` (92 lines) + backend ingestion tool `maricopa_sales.py` (412 lines). Minor MapTab and redfinClient adjustments.
- Squash merge of `feature/map-sales-match-market` branch (was flagged as 9 days old in carry-forward — now merged).

### 4. Documentation Sweep (earlier today)

- `862e9b94` docs: swept 35 untracked files from Jul 11–16 (+8,983 lines) — session notes, CC prompts, route inventory, design-system land prototypes.
- `33a1eaab` docs: morning nightly sync note (now superseded by this update).

## Files Modified

```
6 commits today, 60 files changed, +12,146 lines

Feature code:
 src/app/design/[projectId]/layout.tsx            |   91 +++
 src/app/design/[projectId]/page.tsx              |   34 +++
 src/components/design/DesignShell.tsx             |  506 +++++++
 src/components/design/DesignSidebar.tsx           |  387 +++++
 src/styles/design.css                             |  273 ++++
 src/app/components/CoreUIThemeProvider.tsx         |    5 +-
 src/app/components/NavigationLayout.tsx            |    5 +-
 src/components/preview/DocumentPreviewModal.tsx    |  395 +++++
 src/components/preview/FilePreviewer.tsx           |  128 ++
 src/components/preview/PdfPreview.tsx              |  221 +++
 src/components/preview/PreviewError.tsx            |   71 +
 src/components/preview/PreviewLoading.tsx          |   53 +
 src/components/preview/UnsupportedPreview.tsx      |  103 ++
 src/components/preview/XlsxPreview.tsx             |  244 +++
 src/components/preview/types.ts                    |  100 ++
 src/components/wrapper/ArtifactWorkspacePanel.tsx  |   31 +-
 src/components/wrapper/documents/DocumentDetailPanel.tsx | 46 +-
 backend/apps/.../commands/ingest_maricopa_sales.py |   92 +
 backend/tools/market_ingest/maricopa_sales.py      |  412 +++++
 src/components/map-tab/MapTab.tsx                  |    8 +-
 src/components/map-tab/constants.ts                |   11 +-
 src/lib/redfinClient.ts                            |    8 +-

Uncommitted:
 src/components/design/DesignProjectHome.tsx        |  353 (new)
 src/components/design/DesignShell.tsx              |  +27 lines
 src/components/design/DesignSidebar.tsx            |   +8 lines
 src/styles/design.css                              | +249 lines
 docs/design-reference/                             | (new dir)
 public/design-reference/                           | (new dir, ~1MB reference HTML)
```

## Git Commits

```
62343650 fix(design): exempt /design from legacy chrome + dark-only theme; token punch-up
de80f4ee feat(design): /design/[projectId] shell — Stage A restyle of /studio (#170)
11e11891 feat(map/sales): match sales layer to Market screen + Maricopa sales importer
bdad6c4a feat(dms): file previewer — pdf + xlsx in dms + artifacts panel
33a1eaab docs: add nightly sync note 2026-07-17
862e9b94 docs: sweep untracked session notes, CC prompts, route inventory (Jul 11-16)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF seam exists (`auto_classifier.py`) but binaries not provisioned and flag not enabled.
- [x] ~~`feature/dms-previewer` branch stale~~ — **RESOLVED** by `bdad6c4a` squash merge.
- [x] ~~`feature/map-sales-match-market` branch stale~~ — **RESOLVED** by `11e11891` squash merge.
- [ ] 12 remote-only unmerged branches (fix/*, chore/*, docs/*) — likely PR branches that were merged via GitHub but not deleted. Consider pruning with `git remote prune origin`.
- [ ] Verify `tbl_opex_accounts` fix (#169) resolved property-summary/cash-flow 500s on project 17.
- [ ] **NEW:** Uncommitted WIP on `feature/design-shell` — `DesignProjectHome.tsx`, design-reference assets, +284 lines of DesignShell/Sidebar/CSS changes. Commit or stash before switching branches.
- [ ] **NEW:** `public/design-reference/` contains ~1MB of reference HTML exports — confirm these should be in the repo vs. gitignored.

## Alpha Readiness Impact

No direct alpha blocker movement, but two quality-of-life features shipped that support the alpha experience:

- **DMS file previewer** — users can now preview PDF and XLSX files inline in the DMS panel and artifacts workspace without leaving the app. Addresses a usability gap for alpha testers reviewing uploaded documents.
- **Map sales layer alignment** — sales comp dots on the map now match the Market screen's styling, and the Maricopa County sales importer provides a real data pipeline for the Phoenix MSA test market.
- **Design shell** — new `/design/` route is a Stage A restyle of `/studio`, signaling a visual direction shift. Not user-facing for alpha yet but sets up the next UI evolution.

Alpha readiness remains at ~92%.

## Notes for Next Session

- The dry spell is over — 4 feature commits today after 3 quiet days (Jul 15–16). The design shell is the biggest new surface (1,230+ lines committed, 630+ uncommitted WIP).
- Currently on `feature/design-shell` branch with uncommitted work. The DesignProjectHome component and design-reference assets need to be committed or the branch switched back to main.
- Two carry-forward branches resolved by squash merges today (`feature/dms-previewer`, `feature/map-sales-match-market`) — remote branch pruning still pending.
- The Maricopa sales importer (`backend/tools/market_ingest/maricopa_sales.py`) is a significant backend addition (412 lines) — may need documentation in CLAUDE.md under Market/GIS section if it becomes a pattern for other counties.

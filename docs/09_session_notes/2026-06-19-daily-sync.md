# Daily Sync — June 19, 2026

**Date**: 2026-06-19
**Generated**: Nightly automated sync

---

## Work Completed Today

### Features Added
- **User Guide corpus ingestion** (#109) — New Django management command `ingest_guide_corpus` ingests the in-app User Guide into `tbl_platform_knowledge` for RAG-grounded guide chat. Export script (`scripts/guide/export-guide-corpus.ts`) generates `backend/data/guide_corpus.json` (~855 lines). +1,167 lines.
- **User Guide dual-UI chapters** (#101, #102) — Added Underwriting v2 and Comparable Sales v2 chapters with dual-UI switch blocks (Chat vs Classic view instructions). Guide content type extended with `uiVariants` support. +395 lines across guide content + GuideContent component.
- **Classic context-aware guide deep-links** (#106) — `pageChapterMap.ts` maps current page context to the relevant guide chapter so the Help panel can deep-link directly. +80 lines.
- **Guide window header** (#103) — Minimal TopNavigationBar for the standalone guide window + reordered Concepts group out of first slot. +66 lines.
- **Always-visible Chat/Classic view switch** (#111) — New `UiModeSwitch.tsx` component in the chat sidebar provides persistent access to the view toggle regardless of current page. +158 lines.
- **Project tile actions + soft-delete** (#99, fixes FB-318) — Open/Archive/Delete context menu on project tiles. New migration adds `deleted_at` column to `tbl_project` for soft-delete. Django queryset filters out deleted projects. +205 lines.

### Bugs Fixed
- **Classic-view auth headers** (#104) — Authenticated 14 data call paths across variance, incomplete categories, acquisition ledger, cash-flow summary, waterfall, extraction staging, inflation settings, and budget variance. Fixed `fetchJson.ts` to propagate auth headers. Fixed variance calculator service (Django). +86 lines.
- **UI mode toggle bounce-back** (#105) — Made `ClassicViewToggle` write server-authoritative via middleware cookie, eliminating the toggle bounce-back on navigation. +30 lines.
- **SFD Pricing comps auth** (#112) — Two-leg auth fix for sf-comps route (Next.js proxy → Django), completing the classic-view auth sweep. +17 lines.
- **Guide page→chapter off-topic mappings** (#108) — Dropped incorrect page-to-chapter mappings that caused wrong guide sections to surface. -1 line net.
- **CI preview-DB pipeline** (#98, #100) — Fixed neonctl flag and hermetic frontend gate for PR preview databases. Changed to schema-only (no live data) for preview branches. +22 lines across 6 CI/script files.

### Documentation
- **CLAUDE.md update** (#110) — Added User Guide corpus note to RAG/Knowledge section.

## Files Modified (committed)

14 commits touching 44 files, ~2,240 net lines added.

Key areas: `backend/apps/`, `src/app/api/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/data/`, `scripts/`, `.github/`, `migrations/`.

## Uncommitted Changes

6 files with +13/-5 lines — all auth-header propagation fixes for Sales Absorption classic-view paths:
- `src/app/api/projects/[projectId]/benchmarks/route.ts` — auth header forwarding
- `src/app/api/projects/[projectId]/parcel-product-types/route.ts` — auth header forwarding
- `src/app/api/projects/[projectId]/parcels-with-sales/route.ts` — auth header forwarding
- `src/components/sales/ParcelSalesTable.tsx` — `getAuthHeaders()` on benchmark fetch
- `src/components/sales/SaleCalculationModal.tsx` — `getAuthHeaders()` on calculate-sale POST
- `src/hooks/useSalesAbsorption.ts` — `getAuthHeaders()` on parcels-with-sales + parcel-product-types fetches

These complete the classic-view auth sweep for Land Dev sales absorption — likely destined for a `#113` PR.

## Git Commits (14)

| Hash | Description |
|------|-------------|
| `3bd37d2c` | fix(classic-view): authenticate SFD Pricing comps (sf-comps two-leg auth) (#112) |
| `8a7bd78a` | feat(ui): always-visible Chat/Classic view switch in the chat sidebar (#111) |
| `bf73297b` | docs(claude): note the User Guide corpus in the RAG/Knowledge section (#110) |
| `fd2c5554` | feat(guide): ingest user guide into platform-knowledge corpus (#109) |
| `6fdb5f2e` | fix(guide): drop off-topic page→chapter mappings (#108) |
| `6ecd777f` | feat(guide): classic context-aware deep-link to guide chapter (#106) |
| `ccae14ef` | fix(classic-view): authenticate classic-view data calls + fix variance/incomplete proxy paths (#104) |
| `b6cce97b` | fix(classic-view): make ui_mode toggle write server-authoritative (#105) |
| `f930c6fa` | feat(guide): minimal guide-window header (#103) |
| `4635a10d` | feat(guide): Comparable Sales v2 dual-UI chapter (#102) |
| `90466aa7` | feat(guide): dual-UI switch block + Underwriting v2 slice (#101) |
| `fe512d41` | fix(ci): create PR preview databases schema-only (#100) |
| `85ab946c` | feat(projects): tile Open/Archive/Delete actions + soft-delete (#99) |
| `9258e028` | fix(ci): repair preview-DB pipeline — neonctl flag + hermetic frontend gate (#98) |

## Active To-Do / Carry-Forward

- [ ] Commit uncommitted sales absorption auth fixes as PR #113
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline remains the last major alpha blocker

## Alpha Readiness Impact

No alpha blocker movement today. The day's work was focused on two parallel tracks:

1. **Classic-view auth hardening** — PRs #104, #105, #112 + uncommitted sales fixes systematically authenticate every legacy data call path accessed via the `?mode=classic` toggle. This is essential for alpha testers who toggle between Chat and Classic views.

2. **User Guide system** — PRs #101–103, #106, #108–109 build out the in-app guide with dual-UI awareness, context-aware deep-links, and RAG corpus ingestion. This directly supports alpha tester onboarding.

Both tracks improve alpha polish without moving the formal blocker list.

## Notes for Next Session

- The uncommitted sales auth changes are clean and ready for a PR — just need commit + push.
- The User Guide corpus is now in `tbl_platform_knowledge` — test by asking Landscaper guide-related questions to verify RAG retrieval surfaces guide content.
- The `UiModeSwitch` component (#111) in the sidebar gives persistent Chat/Classic access — verify it renders correctly across different panel widths.
- CI preview-DB pipeline should now create schema-only branches — verify on next PR that preview environments spin up correctly.

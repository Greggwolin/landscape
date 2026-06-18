# Daily Sync — 2026-06-17

**Date**: Wednesday, June 17, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Dual-Modality UI — Classic View Auth + Save Paths (#88 / #89 / Phase 2B)

Three commits completing the classic-view dual-modality feature end-to-end:

- **#88 (2006c808)**: Classic-view toggle + legacy backend audit. Cookie-gated `ui_mode` drives bidirectional redirect in `src/middleware.ts`. Static `/projects/:projectId` redirect moved from `next.config.ts` to middleware (config redirects can't read cookies). "Classic view"/"Chat view" toggle in both shell headers. `docs/02-features/classic-view-backend-audit.md` documents per-tab read/save trace — surfaced two RED save paths (equity partners 501, sales phase/override 404).

- **#89 (671bde94)**: Phase 2 Part A — auth header fixes across 13 legacy files. `getAuthHeaders()` attached to legacy `/projects/[id]` data clients that omitted it and 401'd in classic view: multifamily fetchAPI (unit-types/units/leases), PropertyTab dynamic columns, project-profile loaders, map SWR, acquisition price-summary, DMS media links, intake/start, alpha-help, and 4 Operations settings PUTs. Additive only — `getAuthHeaders()` returns `{}` when unauthenticated.

- **Phase 2 Part B (51c37199)**: Equity partner + sales phase/override save paths verified and wired. New API routes: `parcel-sale-phase/route.ts` (+45 lines), `parcel-sales/overrides/route.ts` (+75 lines), `sale-phases/route.ts` (+80 lines). Equity partner modal refactored with `EquityPartnerModal.tsx` (+155 lines). Equity page expanded (+117 lines).

## Files Modified

```
M  src/app/api/capitalization/equity/route.ts                      (+2 — auth header)
A  src/app/api/projects/[projectId]/parcel-sale-phase/route.ts     (+45 — new save route)
A  src/app/api/projects/[projectId]/parcel-sales/overrides/route.ts (+75 — new save route)
A  src/app/api/projects/[projectId]/sale-phases/route.ts           (+80 — new save route)
M  src/app/projects/[projectId]/capitalization/equity/page.tsx     (+117 — equity partner UI)
A  src/app/projects/[projectId]/capitalization/EquityPartnerModal.tsx (+155 — modal component)
M  src/app/projects/[projectId]/ProjectLayoutClient.tsx            (+1/-1 — auth)
M  src/app/projects/[projectId]/components/landscaper/ProjectDetailsContent.tsx (+2/-1)
M  src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx (+2/-1)
M  src/app/projects/[projectId]/components/tabs/OperationsTab.tsx  (+4/-4 — auth headers)
M  src/app/projects/[projectId]/components/tabs/PropertyTab.tsx    (+2/-2 — auth headers)
M  src/app/projects/[projectId]/valuation/components/IndicatedValueSummary.tsx (+2/-1)
M  src/components/help/HelpLandscaperPanel.tsx                     (+2/-1)
M  src/components/project/ProjectPhotosModal.tsx                   (+3 — auth headers)
M  src/components/project/ProjectProfileTile.tsx                   (+4/-2)
M  src/components/shared/EntityMediaDisplay.tsx                    (+3)
M  src/hooks/useDynamicColumns.ts                                  (+1/-1)
M  src/lib/api/multifamily.ts                                      (+3)
M  src/lib/map/hooks.ts                                            (+2/-1)
A  docs/02-features/classic-view-backend-audit.md                  (+100 — audit doc)
M  next.config.ts                                                  (+5/-4 — redirect moved to middleware)
M  src/app/w/projects/[projectId]/components/ActiveProjectBar.tsx  (+16/-4)
M  src/app/w/projects/[projectId]/page.tsx                         (+1/-1)
A  src/components/ui/ClassicViewToggle.tsx                          (+61)
M  src/components/wrapper/ProjectArtifactsPanel.tsx                (+27/-6)
A  src/lib/uiMode.ts                                               (+15)
A  src/middleware.ts                                                (+40)
```

## Git Commits

```
51c37199 Verified + merged Phase 2 Part B save paths (equity partners, sales phase/override) (10 hours ago)
671bde94 fix(ui): authenticate legacy tabbed-UI data calls (Phase 2 Part A) (#89) (12 hours ago)
2006c808 feat(ui): conditional classic-view toggle + legacy backend audit (#88) (13 hours ago)
```

## Uncommitted Changes

```
M  CLAUDE.md                                           — audit date bumped to 2026-06-17
M  docs/14-specifications/LANDSCAPER_ADMIN_USER_MANUAL.md — admin manual updates (prior session carry)
A  docs/09_session_notes/2026-06-16-daily-sync.md      — yesterday's sync (staged)
?? docs/09_session_notes/2026-06-13-daily-sync.md      — untracked prior syncs
?? docs/09_session_notes/2026-06-14-daily-sync.md
?? docs/09_session_notes/2026-06-15-daily-sync.md
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Admin manual (`LANDSCAPER_ADMIN_USER_MANUAL.md`) has uncommitted changes from a prior session — review and commit or discard.
- [ ] Prior daily sync notes (06-13 through 06-15) are untracked — `git add` them in next commit.
- [ ] Site-plan overlay Phase 2 — rubber-sheet warp deferred; current Phase 1 is rectangular-quad drape only.

## Alpha Readiness Impact

No alpha blocker movement. Today's work hardened the legacy classic-view UI path for alpha testers who prefer the folder/tab layout. The equity partner + sales phase save paths that were RED in the audit are now GREEN — all legacy tabs read and save correctly. This is a UX convenience for testers, not an alpha gate change.

## Notes for Next Session

- **All 3 commits on `main` branch** — the classic-view toggle (#88) was merged to main as part of today's work, along with auth fixes (#89) and save path verification.
- **Classic view is feature-flagged**: `NEXT_PUBLIC_ENABLE_CLASSIC_VIEW=true` env var controls visibility of the toggle. Off by default.
- **Admin manual**: `LANDSCAPER_ADMIN_USER_MANUAL.md` still has uncommitted changes — 96 insertions, 33 deletions. Review scope before committing.
- **Untracked sync notes**: Four daily sync files (06-13 through 06-16) need to be added to git tracking.

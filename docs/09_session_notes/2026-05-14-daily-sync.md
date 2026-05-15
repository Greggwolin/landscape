# Daily Sync — 2026-05-14

**Date**: Wednesday, May 14, 2026
**Generated**: Nightly automated sync
**Branch**: `feature/user-dashboard`

---

## Work Completed Today

### Features Added
- **User Dashboard — Phase 1** (`853a6a58`): New `/w/dashboard` route with layout shell, recent chats list (`RecentChatsList.tsx`, `RecentChatTile.tsx`), and `UserDashboard.tsx` component. Added 234 lines of dashboard-specific CSS to `wrapper.css`. Sidebar thread list suppressed on dashboard route.
- **User Dashboard — Phase 2** (`920dc71f`): Home project provisioning system. New `project_kind` column on `tbl_project` (migration `20260514_add_project_kind.up.sql`) distinguishing `real` vs `home` projects. `HomeProjectService` auto-provisions a per-user "home" project. Django signal ensures home project created on user login. `backfill_home_projects` management command for existing users. Made `project_type_code` and analysis fields nullable (migrations `20260514_make_project_type_code_nullable` and `20260514c_make_analysis_fields_nullable`). Project list API filtering by `kind` parameter. Dashboard filtering to show only real projects.

### Bugs Fixed
- **Seed query consumption** (`b8a45be5`, `117b8211`, `062b880e`, `cafbb836`): Four iterations fixing the mechanism for passing a seed query from the dashboard to `/w/chat` via URL query param. Final solution (v3→auto-send restore): populate input field, then auto-send after race condition fix.
- **ActiveThread abort race** (`89e64dee`): Fixed abort race condition in `useLandscaperThreads.ts` when watching active thread changes. Also added user name display in chat header.
- **Sidebar thread suppression** (`c636451e`): Suppressed sidebar thread list when on `/w/dashboard` route to avoid visual clutter.

### Documentation
- Nightly health check (`5f128de3`): Created `2026-05-13-daily-sync.md` and health report JSON.

## Files Modified

```
backend/apps/projects/management/commands/backfill_home_projects.py  (NEW)
backend/apps/projects/models.py
backend/apps/projects/services/home_project.py                      (NEW)
backend/apps/projects/signals.py                                    (NEW)
backend/apps/projects/views.py
migrations/20260514_add_project_kind.down.sql                       (NEW)
migrations/20260514_add_project_kind.up.sql                         (NEW)
migrations/20260514_make_project_type_code_nullable.down.sql        (NEW)
migrations/20260514_make_project_type_code_nullable.up.sql          (NEW)
migrations/20260514c_make_analysis_fields_nullable.down.sql         (NEW)
migrations/20260514c_make_analysis_fields_nullable.up.sql           (NEW)
src/app/api/projects/route.ts
src/app/w/dashboard/page.tsx                                        (NEW)
src/app/w/layout.tsx
src/app/w/page.tsx
src/components/wrapper/CenterChatPanel.tsx
src/components/wrapper/RecentChatTile.tsx                           (NEW)
src/components/wrapper/RecentChatsList.tsx                          (NEW)
src/components/wrapper/UserDashboard.tsx                            (NEW)
src/components/wrapper/WrapperSidebar.tsx
src/hooks/useLandscaperThreads.ts
src/styles/wrapper.css
```

## Git Commits

```
cafbb836 fix(user-dashboard): restore auto-send after race fix
89e64dee fix(landscaper): close activeThread-watch abort race; show user name in chat header
062b880e fix(user-dashboard): seed v3 — populate input only, no auto-send
117b8211 fix(user-dashboard): seed consumption v2 — poll + input fallback
b8a45be5 fix(user-dashboard): consume seed query param on /w/chat
920dc71f feat(user-dashboard): Phase 2 — home project provisioning + filtering
c636451e fix(user-dashboard): suppress sidebar threads on /w/dashboard
853a6a58 feat(user-dashboard): Phase 1 — layout shell + recent chats
5f128de3 docs: nightly health check 2026-05-14
```

## Active To-Do / Carry-Forward

- [ ] `feature/user-dashboard` branch not yet merged to `main` — PR pending
- [ ] Home project backfill command (`backfill_home_projects`) needs to be run on production after deploy
- [ ] Seed query auto-send went through 4 iterations — monitor for edge cases (race conditions with slow thread creation)
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll

## Alpha Readiness Impact

No direct alpha blocker movement. The user dashboard is a UX improvement to the `/w/` chat-first surface — it adds a proper landing page with recent chats and project tiles, replacing the bare redirect. The home project provisioning (project_kind = home) is architectural groundwork for per-user persistent context.

Schema changes (nullable `project_type_code`, `project_kind` column) are additive and backward-compatible — no existing queries should break.

## Notes for Next Session

- The `project_kind` column introduces a real/home distinction. Landscaper tools and project list APIs now need to be aware of this — home projects should be hidden from most project-scoped views.
- The seed query mechanism (dashboard → chat via URL param) settled on populate-then-auto-send. If further issues arise, consider a context-based approach instead of URL params.
- Three new migrations need to be applied to any fresh environment.
- `feature/user-dashboard` is the active branch — check if ready to merge or if more phases are planned.

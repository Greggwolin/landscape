# Daily Sync — 2026-06-29

**Date**: Sunday, June 29, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Security
- **GIS/map endpoint project ownership enforcement** (`#144`, `6d8140c8`): Shared `user_can_access_project` gate added to every project-scoped GIS and map endpoint. Non-owners now get 404 (no existence leak); owners and staff pass through unchanged. `parcel_query` left open (public). New cross-project authorization tests added for both `gis` and `location_intelligence` apps. +624 lines.

### Bug Fixes
- **Project list sort order** (`cbd3e18c`, FB-327): Studio and `/w/` project list now sorted by most recently opened (via `last_opened_at` timestamp tracked in layout), not `updated_at`. Fixes user-reported issue where editing one project pushed it to the top even when the user was working in another.

## Files Modified

```
backend/apps/gis/tests/__init__.py                          (new)
backend/apps/gis/tests/test_project_authorization.py        (+266)
backend/apps/gis/views.py                                   (+13, -1)
backend/apps/gis/views_overlay.py                           (+42)
backend/apps/location_intelligence/tests/__init__.py        (new)
backend/apps/location_intelligence/tests/test_project_authorization.py (+229)
backend/apps/location_intelligence/views.py                 (+44)
backend/apps/projects/permissions.py                        (+30)
src/app/w/layout.tsx                                        (+9, -1)
src/app/w/projects/page.tsx                                 (+11, -4)
```

10 files changed, 644 insertions, 6 deletions.

## Git Commits

```
cbd3e18c fix(studio): sort project list by most recently opened, not last modified — fixes FB-327 [JB81-FB327-AUTOSORT-0629]
6d8140c8 Enforce project ownership on GIS/map endpoints [KP-GISAUTH-0629] (#144)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Uncommitted session notes from prior nights: `2026-06-26-daily-sync.md` and `2026-06-28-daily-sync.md` are untracked — should be committed.

## Alpha Readiness Impact

No movement on alpha blockers. Today's work was security hardening (GIS auth) and UX polish (project sort). Both are quality improvements but don't change the alpha readiness percentage (~92%).

## Notes for Next Session

- The GIS auth gate (`user_can_access_project` in `permissions.py`) is a reusable pattern — any future project-scoped endpoint should use it.
- `last_opened_at` tracking is client-side via `layout.tsx` localStorage — not persisted server-side. If multi-device support matters later, this should move to a DB column.
- Two prior daily-sync files are still untracked (`2026-06-26`, `2026-06-28`) — the commit script should pick them up this run.

# Daily Sync — 2026-05-16

**Date**: Friday, May 16, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Security & Auth Hardening (Major)
- **Full auth + per-resource ownership rollout (Phases 2–4.5)** — massive commit (`3aa74abb`) touching 492 files. Added authentication guards and project-ownership checks across virtually all Next.js API routes and Django viewsets. Created `backend/apps/projects/permissions.py` with reusable permission class.
- **Platform-knowledge endpoint auth gap closed** (`6ab2f63c`) — secured platform-knowledge views that were previously unprotected; also refreshed stale document counts.
- **Project-list data-isolation hole closed** (`b66df36d`) — project list API now scopes to authenticated user's projects only.
- **Forgot-password link hidden** (`abdac040`) — removed UI element referencing a non-existent backing table.

### Schema Cleanup
- **Container → division drift gap closed** (`d3b186c6`) — addressed 6 user-facing callsites still referencing `tbl_container` post-rename. Migration `20260516_rename_fact_actual_container_id_to_division_id.up.sql` renamed `core_fin_fact_actual.container_id` → `division_id`.

### Landscaper Maintenance
- **CRE tools de-registered + broken reports flagged inactive** (`9687aa98`) — removed tools that weren't functional, cleaned tool registry.
- **MUTABLE_FIELDS realigned with net-lease schema** (`ab7c460f`) — field mappings corrected to match current DB column names.

### UI / Wrapper Improvements
- **Home-page dark header** (`49d071dd`, `b72fbffc`) — dark header treatment on UserDashboard, sidebar icon swap, Google hybrid map on ProjectHomepage. Flush header across center column.

### Documentation
- **CLAUDE.md reconciled** (`31d53c4a`) — Universal Container System section updated to reflect current schema state, including lingering drift inventory.
- **Docs drift repaired** (`58445e72`) — fixes surfaced by Codex audit.
- **Nightly health check** (`3d7ed162`) — early-morning automated check.

---

## Files Modified

492 files changed, 8,874 insertions(+), 4,743 deletions(-)

Key areas:
- `backend/apps/*/views*.py` — auth decorators + ownership checks added
- `src/app/api/**/*.ts` — ~170+ Next.js API routes received auth guards
- `backend/apps/projects/permissions.py` — new reusable permission class
- `src/components/wrapper/` — UserDashboard, ProjectHomepage, WrapperSidebar UI updates
- `migrations/` — division_id rename migration
- `CLAUDE.md` — container→division documentation reconciliation

---

## Git Commits (13 today)

```
b72fbffc feat(wrapper): make home-page dark header flush across center column
49d071dd feat(wrapper): home-page dark header + sidebar icon swap + Google hybrid map
6ab2f63c fix(auth): close platform-knowledge endpoint auth gap + refresh stale doc counts
3aa74abb fix(auth): full auth + per-resource ownership rollout (Phases 2–4.5) (#7)
ab7c460f fix(landscaper): realign MUTABLE_FIELDS with net-lease schema design
abdac040 fix(auth): hide forgot-password link — backing table is missing
58445e72 docs: repair drift surfaced by Codex audit
9687aa98 chore(landscaper): de-register CRE tools + flag broken reports inactive (#6)
b66df36d fix(projects-api): close project-list data-isolation hole (#5)
d3b186c6 chore(schema): close container → division drift gap (#4)
22a95217 Merge main into feature/user-dashboard — incorporate post-branch changes
31d53c4a docs(claude-md): reconcile Universal Container System section with current schema
3d7ed162 docs: nightly health check 2026-05-16
```

---

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Broader container→division drift: Container ORM model (`db_table = 'tbl_container'`), 6 report generators, 15+ Next.js API routes still reference old table name (filed in CLAUDE.md for follow-up).
- [ ] Scanned PDF / OCR pipeline remains unimplemented (alpha blocker #5).
- [ ] `list_feedback` CLI doesn't accept `--status in_progress` — one-line fix queued.

---

## Alpha Readiness Impact

Today's work significantly improves **production readiness** without directly moving alpha feature blockers:

- **Auth hardening** is a prerequisite for any external alpha tester access — previously routes were unprotected. This is now resolved across the full API surface.
- **Data isolation** (project-list scoping) prevents cross-user data leakage — critical for multi-tenant alpha.
- **Container→division drift** partially resolved (6 callsites fixed, migration shipped), reducing runtime errors on financial fact queries.
- **Alpha blocker status unchanged**: OCR pipeline (#5) remains the only unresolved blocker.

---

## Notes for Next Session

1. **Auth is now comprehensive** — all routes require authentication. If anything breaks for legitimate users, check `permissions.py` and the per-viewset `permission_classes`.
2. **The big auth commit** (`3aa74abb`) touched 170+ API route files — watch for regressions in any API call that previously worked without auth headers.
3. **Container ORM model is still broken at runtime** — `Container.Meta.db_table = 'tbl_container'` will throw `relation does not exist`. DRF financial serializers calling `Container.objects.get(...)` will fail. The Next.js side routes around this via raw SQL. Full fix is non-trivial (model rename + downstream consumers).
4. **Dark header styling** is in `src/styles/wrapper.css` — uses negative margins to go flush. May need adjustment if PageShell padding changes.

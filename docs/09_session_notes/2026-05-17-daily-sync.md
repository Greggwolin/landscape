# Daily Sync — 2026-05-17

**Date**: Saturday, May 17, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Reports Chat-Forward Persistence Layer (Major — Phase 2)

- **Chat-forward persistence layer shipped** (`d00e2996`) — +1,614 lines across 8 files. Phase 2 of the reports chat-forward redesign, adding:
  - **New tables:** `tbl_user_report_personal_default` (one row per user/report/scope for personal layout overrides on canonical reports) and `tbl_user_saved_report` (named Save-As entries built on canonical bases, soft-deletable via `is_archived`).
  - **CHECK constraints** enforce scope_type/scope_id consistency (global/cross_project → scope_id NULL; project/entity/master_lease → scope_id NOT NULL). FK to `ReportDefinition` via `report_code`.
  - **New services:** `modification_spec.py` (JSON spec validator, applier, human-readable summarizer) and `library_resolver.py` (Phase 1 §5 resolution algorithm: project_personal > entity_personal > global_personal > canonical).
  - **8 new REST endpoints** under `/api/reports/library/` and `/api/reports/saved/`. All `IsAuthenticated`, per-user filtering enforced.
  - Migration `0007_user_report_persistence.py` (hand-authored, `makemigrations --check` silent).
  - No frontend or Landscaper tool changes — those are Phase 3 and Phase 4.

### Documentation

- **Nightly health check** (`5fb2dec8`) — appended nightly sync content to `2026-05-16-daily-sync.md`.

## Files Modified

```
backend/apps/reports/migrations/0007_user_report_persistence.py  | 210 +++
backend/apps/reports/models.py                                   | 170 ++-
backend/apps/reports/serializers.py                              |  79 ++-
backend/apps/reports/services/__init__.py                        |   1 +
backend/apps/reports/services/library_resolver.py                | 221 +++
backend/apps/reports/services/modification_spec.py               | 393 +++
backend/apps/reports/urls.py                                     |  18 +
backend/apps/reports/views_library.py                            | 526 +++
docs/09_session_notes/2026-05-16-daily-sync.md                   |  93 +
```

## Git Commits

```
d00e2996 feat(reports): chat-forward persistence layer — migration + 8 endpoints (Gregg Wolin, ~7h ago)
5fb2dec8 docs: nightly health check 2026-05-17 (Gregg Wolin, ~12h ago)
```

## Active To-Do / Carry-Forward

- [ ] **Reports chat-forward Phase 3** — frontend library UI (browse canonical, personal defaults, saved reports). Backend is ready.
- [ ] **Reports chat-forward Phase 4** — Landscaper tool wiring (tools to list/apply/save report configurations via chat).
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned-PDF / OCR pipeline remains unimplemented (alpha blocker #5).
- [ ] Lingering `tbl_container` references (~60 callsites) filed for follow-up.
- [ ] `list_feedback --status in_progress` CLI fix queued.

## Alpha Readiness Impact

No movement on alpha blockers today. The reports persistence layer is a new capability (user-specific report customization and Save-As) that enhances the reports system but was not on the alpha blocker list.

## Notes for Next Session

- Phase 2 backend is clean — `makemigrations --check` silent, all 8 endpoints authenticated and user-scoped. Phase 3 (frontend library UI) and Phase 4 (Landscaper tools) are the logical next steps.
- The modification_spec service includes a `summarize()` method for generating human-readable descriptions of report customizations — useful for both the library UI and Landscaper tool responses.
- Resolution algorithm in `library_resolver.py` follows a 4-tier cascade: project_personal > entity_personal > global_personal > canonical. Worth reviewing the edge cases before building the frontend.

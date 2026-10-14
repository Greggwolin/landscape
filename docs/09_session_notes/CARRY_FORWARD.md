# Carry-forward — developer

Open technical items for the Landscape codebase. Maintained by the nightly documentation sync.
Moved out of that job's prompt text on 2026-08-25. Tick items when confirmed complete.

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [x] Two untracked migration files (`migrations/20260928_division_trigger_functions_rename.{up,down}.sql`) — confirmed applied on production 2026-10-14 (functions use `tier`; 358 divisions inserted 2026-09-28 after the fix); committed as the record.
- [ ] Verify Sep 30 features: Landscaper direct writes (BM1–BM10), Improvements budget save (HQ112), parcels unsaved-changes guard (BM14).
- [ ] Run land cash flow IRR check notebook on host: `cd backend && bash notebooks/engine_checks/run_land_check.sh` — notebook updated by QV8/QV14 (Oct 2, #319) to use actual dates.
- [ ] Verify QV8/QV14 (Oct 2, #319): land IRR now computed on actual calendar dates; Screens dropdown shows Feasibility/Valuation for land projects.

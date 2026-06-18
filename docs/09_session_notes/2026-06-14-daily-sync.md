# Daily Sync — 2026-06-14

**Date**: Saturday, June 14, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

No commits today (Saturday). One unstaged documentation edit carried forward from a prior session.

### Documentation In Progress
- **LANDSCAPER_ADMIN_USER_MANUAL.md** — substantial rewrite of the AI Extraction Mappings section (§2.2). Changed from terse field-list format to narrative prose explaining what mappings are, why they matter, anatomy of a mapping, confidence levels, and write switches. +96 lines, -33 lines. Not yet committed.

## Files Modified

```
M  docs/14-specifications/LANDSCAPER_ADMIN_USER_MANUAL.md  (+96, -33)
```

## Git Commits

None today.

## Staged from Prior Session (Not Yet Committed)

```
M  CLAUDE.md                                       — audit date bumped to 2026-06-13; tool count footnote updated with geocode_address
A  docs/09_session_notes/2026-06-13-daily-sync.md  — yesterday's comprehensive sync (12 commits)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Site-plan overlay Phase 2 — rubber-sheet warp (non-rectangular distortion) deferred; current Phase 1 is rectangular-quad drape only.
- [ ] Geocoding backfill — run `backfill_geocoding` management command against existing projects to populate lat/lng columns.
- [ ] Scanned PDF / OCR pipeline — still the primary alpha blocker (OCRmyPDF identified, not implemented).
- [ ] Commit staged docs (CLAUDE.md + 2026-06-13 sync + admin manual rewrite).

## Alpha Readiness Impact

No movement today. Sitting at ~92% alpha-ready on the legacy `/projects/[id]` surface. Primary remaining blocker: scanned-PDF/OCR pipeline.

## Notes for Next Session

- Three files ready to commit together: CLAUDE.md audit update, yesterday's daily sync, and the admin manual rewrite.
- Friday's 12-commit burst (#67–#78) was the highest-volume day in recent weeks — mostly map features (overlay, geocoding, auto-fit) and tech debt cleanup (feedback unification).

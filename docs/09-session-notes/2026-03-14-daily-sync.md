# Daily Sync — 2026-03-14

**Date**: Friday, March 14, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Bugs Fixed
- Made changelog read endpoints public (removed auth requirement) in `backend/apps/feedback/views.py`
- Alpha-prep checkpoint: cleaned up 6 Next.js API route files (inventory-gauge, parcel-product-types, parcel-sales, parcels-with-sales, calculate-sale, pricing-assumptions) — minor import/response cleanup

### Technical Debt Addressed
- Updated deploy skill workflow (`.claude/skills/deploy/SKILL.md`) — expanded from ~100 lines, significant additions to deployment automation
- Added `.claude/settings.local.json` (17 lines)

### UI Polish
- Refined `HelpContentPanel.tsx` and `HelpLandscaperPanel.tsx` — reduced code by ~6 lines net, improved layout
- Added styles to `help-landscaper-panel.css`

### Documentation
- Created nightly health check report (`health-2026-03-14_0800.json`)
- Created previous day's session note (`2026-03-13-daily-sync.md`)

## Files Modified

```
.claude/settings.local.json                                    |  17 +++
.claude/skills/deploy/SKILL.md                                 | 103 +++
backend/apps/feedback/views.py                                 |  23 ++-
src/app/api/projects/[projectId]/inventory-gauge/route.ts      |   3 +-
src/app/api/projects/[projectId]/parcel-product-types/route.ts |   3 +-
src/app/api/projects/[projectId]/parcel-sales/route.ts         |   2 +-
src/app/api/projects/[projectId]/parcels-with-sales/route.ts   |   3 +-
src/app/.../parcels/[parcelId]/calculate-sale/route.ts         |   3 +-
src/app/.../pricing-assumptions/[id]/route.ts                  |   3 +-
src/components/alpha/HelpContentPanel.tsx                      |  18 +--
src/components/help/HelpLandscaperPanel.tsx                    |  22 +--
src/components/help/help-landscaper-panel.css                  |   9 +-
docs/09-session-notes/2026-03-13-daily-sync.md                 |  67 +++
docs/UX/health-reports/health-2026-03-14_0800.json             |  64 +++
```

## Git Commits

```
7c0b7b6 fix: make changelog read endpoints public, update deploy skill workflow (Gregg Wolin, 4 hours ago)
d80e0c0 Merge remote-tracking branch 'origin/main' into feature/alpha-prep (Gregg Wolin, 8 hours ago)
a287d8e fix: alpha-prep checkpoint — API route cleanup and help panel polish (Gregg Wolin, 8 hours ago)
3cc6d9d docs: nightly health check 2026-03-14 (Gregg Wolin, 12 hours ago)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Untracked files in working tree: `USER_LOGIN_CREDENTIALS.md`, `USER_LOGIN_CREDENTIALS.txt` — should NOT be committed (sensitive). Consider adding to `.gitignore`.
- [ ] Untracked `reports/` directory — evaluate whether it should be tracked or ignored.

## Alpha Readiness Impact

No direct movement on the 6 alpha blockers today. Work was focused on alpha-prep polish (API route cleanup, help panel UX, changelog endpoint access, deploy workflow). These are alpha-adjacent quality improvements but don't resolve any of the named blockers.

## Notes for Next Session

- The `feature/alpha-prep` branch was merged with `origin/main` today — check for any conflicts in subsequent work.
- Changelog endpoints are now public — verify this is intentional for alpha testers (no auth required to read changelog).
- Deploy skill got a major update — use it for next deployment instead of manual steps.
- Credential files (`USER_LOGIN_CREDENTIALS.*`) sitting in working directory untracked — make sure these don't get committed accidentally.

# Daily Sync — July 15, 2026

**Date**: Tuesday, July 15, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

**No commits today.** Last commit was `32447117` (mutation-guard test rewrite, #166) at ~31 hours ago (Jul 14 afternoon).

No uncommitted changes in the working tree. The repo is clean on `main`.

## Untracked Files (Carried Forward)

The following untracked files remain from prior sessions:

- `docs/09_session_notes/2026-07-14-daily-sync.md` — yesterday's sync (pending commit by this run)
- `docs/ROUTE_INVENTORY.md` — route audit document
- `docs/cc-prompts/LN7-local-branch-cleanup-0711.md`
- `docs/cc-prompts/LN8-retire-dead-budget-category-path-0711.md`
- `docs/cc-prompts/LN9-local-pull-budget-merge-0711.md`
- `docs/cc-prompts/branch-cleanup-0711-recovery.txt`
- `docs/cc-prompts/gis-mvp-architecture-handoff.md`
- `docs/design-system/land_session_transfer_7-12-26/` — design system session transfer

## Open Feature Branches (Not Merged to Main)

- `feature/map-sales-match-market` — 6 days old
- `feature/dms-previewer` — 8 weeks old (stale)

## Git Commits (Last 3 Days)

```
32447117 test(mutation-guard): point phantom-unit guard test at the real code (#166) — Jul 14
109955be chore(wrapper): gut the dead /w/ project map + reports pages to stubs (#165) — Jul 14
d150f32f fix(wrapper): pass projectId as a prop to the documents panel (#164) — Jul 14
aed39a46 fix(nightly): make the scoped doc committer fail loudly instead of silently — Jul 14
e625f2f6 docs: nightly health check 2026-07-14 — Jul 14
fd371e55 docs: reconcile the two instruction copies into one master, v4.7.0 (#163) — Jul 14
fc491e04 fix(api): send auth headers from contacts + user-preferences clients (#162) — Jul 14
2c9b4da1 docs(argus): add 2026 parity re-review; mark two predecessors superseded — Jul 14
ae417a50 fix(metrics): correct three period-convention defects in investment metrics (#161) — Jul 14
e9e8d82e fix(valuation): send auth headers from valuation/comps API clients (#160) — Jul 14
1d303766 fix(calculations): repair mis-wired IRR/NPV engine calls and their silent failure (#159) — Jul 13
a09ffec5 fix(landscaper): gate 13 ungated tools into their property-type gates (#158) — Jul 13
0c548e7e fix(login): remove TOS-accepted-date display on sign-in — Jul 13
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF seam exists (`auto_classifier.py`) but binaries not provisioned and flag not enabled.
- [ ] 7 untracked files in working tree — review and commit or gitignore.
- [ ] `feature/dms-previewer` branch is 8 weeks stale — consider merging or closing.

## Alpha Readiness Impact

No change. Alpha readiness remains at ~92%. Yesterday's 11-commit burst (PRs #158–#166) addressed silent financial-engine failures, auth header gaps, and dead code — all stabilization work. No new features or blockers today.

## Notes for Next Session

- Quiet day — no code changes. Good time to tackle carry-forward items (demo re-clone, untracked file cleanup, stale branch review).
- The hardened nightly committer (`commit-generated-docs.sh`) should be running cleanly now — this is the second night after the TB25 fix. Watch exit code.
- `feature/map-sales-match-market` (6 days old) may have work ready to merge.

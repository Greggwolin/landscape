# Daily Sync — July 14, 2026

**Date**: Monday, July 14, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Bugs Fixed (Major — 5 PRs)

- **IRR/NPV engine calls repaired** (#159) — `calculations/services.py` had mis-wired calls to the Python financial engine that failed silently. New `series_metrics.py` module (+82 lines) and test file `test_calc_engine.py` (+160 lines) for verification. Views simplified.
- **Auth headers missing on 4 API clients** (#160, #162) — `valuation.ts`, `rentComps.ts`, `expenseComps.ts`, `contacts.ts`, `user-preferences.ts` were making unauthenticated API calls. All now send JWT auth headers. `valuation.ts` also refactored (-85 → +65 lines, cleaner).
- **Investment metrics period-convention defects** (#161) — Three bugs in `src/lib/calculations/metrics.ts`: incorrect annualization, period-off-by-one in NPV discounting, and wrong compounding in multi-period IRR approximation. +165-line Playwright test added.
- **ProjectProvider + DocumentsPanel prop wiring** (#164) — `projectId` wasn't being passed as a prop to the documents panel in the wrapper layout; project-list fetch was firing without a valid token. Both fixed.

### Technical Debt / Cleanup (3 commits)

- **Dead /w/ map + reports pages gutted** (#165) — The wrapper map and reports pages under `/w/projects/[projectId]/` were dead code (studio shell is the real surface). Reduced to navigation stubs.
- **Mutation guard test rewrite** (#166) — `test_mutation_guard.py` was testing a mock, not the real `mutation_service.py` code. Rewritten to test actual phantom-unit guard logic (-159/+163 lines).
- **Nightly doc committer hardened** — `commit-generated-docs.sh` now fails loudly on stale `.git/index.lock`, checks postconditions, and returns distinct exit codes. Fixes 19-day silent no-op (TB25).

### Documentation (3 commits)

- **ARGUS Parity 2026 re-review** — New `ARGUS_PARITY_2026.md` (+356 lines) with current-state assessment. Two predecessor docs marked superseded.
- **PROJECT_INSTRUCTIONS.md v4.7.0** (#163) — Reconciled two diverged copies into one canonical master (+84 lines).
- **Nightly health check catch-up** — Committed 14 daily-sync notes (Jun 26 through Jul 13) that had accumulated due to the silent committer failure.

## Files Modified

38 files changed, 2,341 insertions(+), 408 deletions(-)

Key areas touched:
- `backend/apps/calculations/` — Engine repair + new series_metrics module + tests
- `backend/apps/landscaper/services/mutation_service.py` — Guard logic cleaned
- `src/lib/api/` — Auth headers added to 5 API client files
- `src/lib/calculations/metrics.ts` — Period convention fixes
- `src/app/w/projects/` — Dead pages gutted
- `scripts/nightly/` — Committer hardened
- `docs/` — ARGUS parity review, PROJECT_INSTRUCTIONS consolidation

## Git Commits (11 today)

```
32447117 test(mutation-guard): point phantom-unit guard test at the real code (#166)
109955be chore(wrapper): gut the dead /w/ project map + reports pages to stubs (#165)
d150f32f fix(wrapper): pass projectId as a prop to the documents panel; gate project-list fetch on token (#164)
aed39a46 fix(nightly): make the scoped doc committer fail loudly instead of silently
e625f2f6 docs: nightly health check 2026-07-14
fd371e55 docs: reconcile the two instruction copies into one master, v4.7.0 (#163)
fc491e04 fix(api): send auth headers from contacts + user-preferences clients (#162)
2c9b4da1 docs(argus): add 2026 parity re-review; mark two predecessors superseded
ae417a50 fix(metrics): correct three period-convention defects in investment metrics (#161)
e9e8d82e fix(valuation): send auth headers from valuation/comps API clients (#160)
1d303766 fix(calculations): repair mis-wired IRR/NPV engine calls and their silent failure (#159)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF seam exists (`auto_classifier.py`) but binaries not provisioned and flag not enabled.
- [ ] Untracked files in working tree: `docs/ROUTE_INVENTORY.md`, several cc-prompts, `docs/design-system/land_session_transfer_7-12-26/` — review and commit or gitignore.

## Alpha Readiness Impact

No alpha blocker movement today. The IRR/NPV engine repair (#159) and investment metrics fixes (#161) strengthen the financial engine reliability — these were silent-failure bugs that could have produced wrong numbers in alpha demos. Auth header fixes (#160, #162) prevent 401s on the valuation and contacts pages. Overall alpha readiness stays at ~92%.

## Notes for Next Session

- The IRR/NPV engine now has a proper test (`test_calc_engine.py`) — run it after any changes to `services.py` or `series_metrics.py`.
- The nightly committer was silently failing for 19 days due to stale `.git/index.lock`. It's now hardened with explicit exit codes. Watch the first few runs to confirm.
- 7 untracked files in working tree — some are cc-prompt archives, some may be in-progress work. Review before they accumulate further.

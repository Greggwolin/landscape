# Daily Sync — 2026-07-30

**Date**: Wednesday, July 30, 2026
**Generated**: Nightly automated sync
**Branch at scan**: `chore/ci-gate-stacked-prs`

---

## Work Completed Today

### Committed (4 commits on main today)

1. **`cfd10a4c` ci: gate every pull request, including stacked ones (CC15)** — Updated `.github/workflows/cleanup.yml` and `preview.yml` to gate every PR, including stacked ones. +31/-6 lines across 2 CI workflow files.

2. **`b89c8c9e` docs: restore CLAUDE.md audit entries lost from the shared checkout (CC7)** — Restored audit entries that were lost during a shared checkout. +7/-5 lines in CLAUDE.md.

3. **`9047bd89` fix(landscaper): send artifacts somewhere they can actually render (TA5) (#230)** — Fixed artifact routing so artifacts from schedule tools render in the correct panel. Updated `CenterChatPanel.tsx` (+40 lines) and `threadDestination.ts` (+68 lines) with tests. Also committed backlogged nightly sync notes (07-27, 07-28, 07-29) and health reports.

4. **`d600c6fc` feat(artifacts): editing spine slice 3 — sales schedule editable cells (CB9) (#229)** — Sales schedule cells (sale_date, commission) now editable end-to-end. New `commit_sale_cell` endpoint in `views.py` (+212 lines), `sales_artifact_builder.py` expanded (+264 lines), `batch_recalc.py` refactored (+432/-279 lines). Full pytest suite for the write path. Rate-card price stays read-only (trigger deletes parcel sale rows).

### Summary by Category

**Features:** CB9 sales schedule editable cells — the artifact editing spine now covers both budget cells (CB6/CB8) and sales cells.

**Fixes:** TA5 artifact host-route fix ensures schedule-tool artifacts render in the right panel; CC7 CLAUDE.md audit entry restoration.

**CI/DevOps:** CC15 gates stacked PRs in CI workflows — all PRs now run checks, not just those targeting main.

**Documentation:** Backlogged session notes (3 days) committed via TA5 PR.

## Files Modified (Today's Commits)

```
 .github/workflows/cleanup.yml                      |  19 +++--
 .github/workflows/preview.yml                      |  18 +++--
 CLAUDE.md                                          |  12 +++--
 backend/apps/artifacts/tests/test_commit_sale_cell.py | 204 ++++++
 backend/apps/artifacts/views.py                    | 212 ++++++-
 backend/apps/landscaper/tests/test_sales_schedule_tool.py | 2 +-
 backend/apps/landscaper/tool_executor.py           |  91 +---
 backend/apps/landscaper/tools/sales_artifact_builder.py | 264 +++++++-
 backend/apps/sales_absorption/batch_recalc.py      | 432 +++++++-----
 backend/apps/sales_absorption/services.py          |  42 +-
 docs/09_session_notes/2026-07-27-daily-sync.md     |  89 +++
 docs/09_session_notes/2026-07-28-daily-sync.md     | 100 +++
 docs/09_session_notes/2026-07-29-daily-sync.md     |  70 +++
 docs/UX/health-reports/health-2026-07-29_0800.json |  77 +++
 docs/UX/health-reports/health-2026-07-30_0800.json |  77 +++
 src/components/wrapper/CenterChatPanel.tsx          |  40 ++-
 src/lib/landscaper/threadDestination.test.ts       |  66 +++
 src/lib/landscaper/threadDestination.ts            |  68 ++-
```

**Total**: 18 files changed, ~1,584 insertions, ~299 deletions.

## Git Commits (Last 3 Days)

```
cfd10a4c ci: gate every pull request, including stacked ones (CC15) (8h ago)
b89c8c9e docs: restore CLAUDE.md audit entries lost from the shared checkout (CC7) (11h ago)
9047bd89 fix(landscaper): send artifacts somewhere they can actually render (TA5) (#230) (12h ago)
d600c6fc feat(artifacts): editing spine slice 3 — sales schedule editable cells (CB9) (#229) (13h ago)
5e0ab71f feat(artifacts): UOM picklist cell + editable-cell affordance (CB10) (#232) (33h ago)
2c9d2173 fix(sales): batch recalc passes sale_period — stops flattening the offset (CB12) (#231) (33h ago)
0cce5ef8 fix(sales): fixed transaction-cost benchmarks survive an override (CB13) (#233) (33h ago)
475c8057 fix(sales): improvement offset resolves by unit of measure, or refuses (CB14) (#234) (33h ago)
4792cef0 fix(map): stable DndContext id stops LayerPanel hydration mismatch (#228) (2d ago)
429836a9 feat(artifacts): batch commit — stage several budget edits, land as one set (CB8) (#227) (2d ago)
d821c6bd feat(landscaper): reopening a chat returns you where it left off (TA1) (#226) (2d ago)
14cbf273 fix(landscaper): _log_planning_activity invalid status dropped every log (CB7) (#225) (2d ago)
9aee5c2f feat(artifacts): editing spine slice 1 — one budget cell writable end to end (CB6) (#224) (2d ago)
3d6ee7fe fix(landscaper): widen fabrication-guard vocabulary — income property + land sales (CB5) (#223) (2d ago)
6bfb626c fix(landscaper): artifact-tool empty/degraded relay sweep (CB4) (#222) (2d ago)
8b5d14b4 fix(landscaper): variance empty-path relay instruction (CB3) (#221) (3d ago)
```

## Active To-Do / Carry-Forward

- [ ] **CB10 UOM picklist editing** — Committed (#232). Frontend renderer needs dropdown support for UOM column and date picker for sale_date.
- [ ] **Sales recalc fixes** — CB12/CB13/CB14 committed (#231/#233/#234). Verify batch_recalc changes are stable under multi-phase projects.
- [ ] **CI stacked-PR gating** — CC15 committed. Monitor that stacked PRs now properly run checks without false failures.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement. Today's work extends the artifact editing spine (CB9 sales cells, TA5 routing fix) and hardens CI (CC15). Scanned-PDF / OCR remains the only significant alpha gap.

## Notes for Next Session

- The artifact editing spine now covers budget cells (CB6/CB8/CB10) AND sales cells (CB9). The write path for both is end-to-end with backend tests.
- `batch_recalc.py` was significantly refactored in CB9/CB12 — three follow-on fixes (CB12/CB13/CB14) landed yesterday to handle edge cases (sale_period flattening, fixed transaction-cost benchmarks, UOM-aware improvement offset). Worth a smoke test on a multi-phase land dev project.
- Branch `chore/ci-gate-stacked-prs` is the current HEAD — CC15 commit. Likely ready to merge or already merged.
- TA5 artifact host-route fix is important: schedule-tool artifacts (budget, sales, cashflow, cap, rent roll) now route to the correct panel when opened from chat. Prior behavior silently dropped them.

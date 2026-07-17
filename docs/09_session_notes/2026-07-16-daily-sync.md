# Daily Sync — July 16, 2026

**Date**: Wednesday, July 16, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

**No new code commits today.** The only commit was `a01a69ff docs: nightly health check 2026-07-16` — last night's nightly sync committing the Jul 14 and Jul 15 session notes that had accumulated. This confirms the hardened committer (`commit-generated-docs.sh`, TB25 fix) is working correctly after its 19-day silent failure.

The repo is clean on `main` with no uncommitted changes.

## Untracked Files (Carried Forward)

The same 7 untracked files from prior sessions remain:

- `docs/ROUTE_INVENTORY.md` — route audit document
- `docs/cc-prompts/LN7-local-branch-cleanup-0711.md`
- `docs/cc-prompts/LN8-retire-dead-budget-category-path-0711.md`
- `docs/cc-prompts/LN9-local-pull-budget-merge-0711.md`
- `docs/cc-prompts/branch-cleanup-0711-recovery.txt`
- `docs/cc-prompts/gis-mvp-architecture-handoff.md`
- `docs/design-system/land_session_transfer_7-12-26/` — design system session transfer

## Open Feature Branches (Not Merged to Main)

- `feature/map-sales-match-market` — 8 days old (approaching stale)
- `feature/dms-previewer` — 9 weeks old (stale)

## Git Commits (Last 3 Days)

```
a01a69ff docs: nightly health check 2026-07-16 — Jul 16 (today, nightly sync)
b970985a fix(reports): drop phantom tbl_opex_accounts join in MultifamilyCalculator (#169) — Jul 14
dcbae398 chore: delete phantom CRE system + fix 3 report generators it broke (#168) — Jul 14
d2a98abf chore(financial): park portfolio API — unregister routes (tables never created) (#167) — Jul 14
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
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF seam exists (`auto_classifier.py`) but binaries not provisioned and flag not enabled.
- [ ] 7 untracked files in working tree — review and commit or gitignore. Third consecutive day flagged.
- [ ] `feature/dms-previewer` branch is 9 weeks stale — consider merging or closing.
- [ ] `feature/map-sales-match-market` branch is 8 days old — review status before it goes stale.
- [ ] Discovered follow-up from CU6 (Jul 14): `tbl_opex_accounts` is phantom and independently 500s `property-summary.pdf` / `cash-flow.pdf`. **Partially addressed** — `b970985a` (#169) dropped the join from `MultifamilyCalculator`, but the `tbl_opex_accounts` table itself was never created. Verify those two report endpoints now return 200 on project 17.

## Alpha Readiness Impact

No change. Alpha readiness remains at ~92%. The Jul 14 burst (PRs #159–#169, 14 commits) was a major stabilization push — silent financial-engine failures fixed, phantom table joins removed, auth headers added, dead code gutted. Today was a rest day following that effort.

## Notes for Next Session

- Third consecutive quiet day (Jul 15–16 had zero code commits). The stabilization burst on Jul 14 was substantial — good time to tackle carry-forward items.
- The nightly committer is confirmed working: `a01a69ff` successfully committed the two pending sync notes. TB25 fix validated.
- Priority candidates for next work session: (1) verify `tbl_opex_accounts` fix in #169 resolved the property-summary/cash-flow 500s, (2) review `feature/map-sales-match-market` before it ages out, (3) clean up the 7 untracked files.

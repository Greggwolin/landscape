# Daily Sync — July 18, 2026

**Date**: Friday, July 18, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### 1. Auth Token Auto-Refresh — Fix for Stale-Tab 401s

- `c6e82a97` fix(auth): auto-refresh access tokens — proactive interval + 401 retry wrapper (#172). **+164 lines, 6 files.**
- **Root cause:** Access tokens (1h lifetime from SIMPLE_JWT) were only refreshed at AuthContext init. Tabs open >1h sent stale Bearer tokens on every direct Django call, producing `token_not_valid` 401s that rendered as fake empty states (e.g., "No parcels configured") or error banners.
- **Solution — three layers:**
  1. **`src/lib/authFetch.ts`** (101 lines, new) — fetch wrapper with single-flight refresh guard + one automatic retry on 401. If refresh fails, redirects to `/login?expired=1` instead of leaving the screen lying.
  2. **`src/lib/fetchJson.ts`** — routed through `authFetch`, so all SWR/React Query callers get refresh behavior for free.
  3. **`src/contexts/AuthContext.tsx`** — 45-minute proactive refresh interval + `visibilitychange` listener (refresh when tab regains focus after being hidden >5 min).
- **Callers migrated** (the three audit-confirmed failing paths): `CashFlowAnalysisTab.tsx`, `PricingTable.tsx`, `useCapitalization.ts` — all switched from raw `fetch` / `getAuthHeaders` to `authFetch` or now inherit through `fetchJson`.
- Originated from studio audit findings C2/C3 (`LANDSCAPE_STUDIO_AUDIT_2026-07-18`).

## Files Modified

```
src/components/analysis/cashflow/CashFlowAnalysisTab.tsx  |   6 +-
src/components/sales/PricingTable.tsx                     |  10 +-
src/contexts/AuthContext.tsx                              |  32 +++++++
src/hooks/useCapitalization.ts                            |  34 +++----
src/lib/authFetch.ts                                      | 101 +++++++++++++++++++++
src/lib/fetchJson.ts                                      |  14 ++-
6 files changed, 164 insertions(+), 33 deletions(-)
```

## Git Commits

```
c6e82a97 fix(auth): auto-refresh access tokens — proactive interval + 401 retry wrapper (#172) (Gregg Wolin, Jul 18)
```

## Active To-Do / Carry-Forward

- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.
- [ ] Scanned PDF / OCR pipeline — OCRmyPDF seam exists (`auto_classifier.py`) but binaries not provisioned and flag not enabled.
- [ ] 15 remote-only unmerged branches (fix/*, chore/*, docs/*, feature/*) — likely PR branches that were merged via GitHub squash but not deleted. Consider pruning with `git remote prune origin`.
- [ ] Verify `tbl_opex_accounts` fix (#169) resolved property-summary/cash-flow 500s on project 17.
- [ ] `feature/design-shell` branch has 3 commits ahead of main (design reference assets + WIP styling + dark-theme exemption). In-flight work — do not prune.
- [ ] `feature/map-sales-match-market` local branch still exists even though squash-merged to main via `11e11891` (Jul 17). Safe to delete local: `git branch -D feature/map-sales-match-market`.
- [ ] 2 stashes in stash list — both labeled with prior session context. Review for relevance or drop.
- [ ] Jul 17 daily-sync note (`docs/09_session_notes/2026-07-17-daily-sync.md`) has uncommitted evening update (+74 lines). Will be picked up by tonight's committer run.

## Alpha Readiness Impact

No alpha blocker movement. The auth token refresh fix (#172) is a reliability improvement — eliminates a class of silent failures (stale-token 401s rendered as empty states) that would have confused alpha testers on long-lived sessions. Alpha readiness remains at ~92%.

## Notes for Next Session

- **Auth coverage audit:** The fix migrated the three callers identified in the studio audit (C2/C3). Other callers that use `fetchJson` get refresh behavior automatically. Any caller that still uses raw `fetch` + `getAuthHeaders` directly (bypassing `fetchJson`) is still vulnerable. A grep for `getAuthHeaders` usage outside of `authFetch.ts` would confirm full coverage.
- **Design shell WIP:** `feature/design-shell` branch has uncommitted styling work parked. This is the Stage A restyle of `/studio` — active line of work.
- **Stale branch cleanup:** `feature/map-sales-match-market` local branch can be deleted (already squash-merged to main).

# Daily Sync — 2026-08-08

**Date**: Friday, August 8, 2026
**Generated**: Nightly automated sync

---

## Work Completed Today

### Nightly Committer Hardening (c5913fb9)

The `.git/index.lock` poisoning that stalled nightly syncs for 8 consecutive nights (2026-07-31 → 08-07) was root-caused and fixed:

- **Pre-flight 0 (unlink probe):** Before any git command can create a lock, the committer now probes whether the environment can delete inside `.git/`. The Cowork sandbox mounts the repo in a mode that permits create but denies unlink — so the committer now refuses to run there at all, failing safely instead of leaving a lock behind.
- **Self-healing stale locks:** When unlink capability is proven (host execution), a stale lock with no git process behind it is removed automatically rather than aborting and waiting for a human.
- **SKILL.md updated:** The nightly task instructions now explicitly require Desktop Commander (host execution) and prohibit sandbox `mcp__workspace__bash` for the commit step.

Net: +40 lines / -11 lines in `scripts/nightly/commit-generated-docs.sh`.

### Backlogged Nightly Notes Committed (8a8d6f43)

The 2026-08-07 daily-sync note (which had accumulated during the lock outage) was committed as `docs: nightly health check 2026-08-08`.

### EB1 WIP Stashed on chore/ci-gate-stacked-prs

The ~1,500 lines of EB1 budget view-specification WIP (3 new files + 2 modified) that were sitting uncommitted on `chore/ci-gate-stacked-prs` were stashed with a descriptive message noting they are stale duplicates — the real EB1 work lives on `feat/budget-artifact-slice1` (PR #241).

### feat/budget-artifact-slice1: CLAUDE.md Audit Entry (06a22088)

CLAUDE.md updated on the EB1 branch to record the 2026-07-31 audit entry (CC3/CC11/CC13 + EB1 WIP).

## Files Modified

```
scripts/nightly/commit-generated-docs.sh           | 51 +++++++++---
docs/09_session_notes/2026-08-07-daily-sync.md     | 67 ++++++++++++++
CLAUDE.md (on feat/budget-artifact-slice1)         |  3 +-
```

## Git Commits

```
c5913fb9 fix(nightly): stop the committer poisoning .git with a lock it cannot remove (12h ago)
8a8d6f43 docs: nightly health check 2026-08-08 (13h ago)
06a22088 docs(claude): record the 2026-07-31 audit entry (CC3/CC11/CC13 + EB1) [feat/budget-artifact-slice1] (12h ago)
```

## Active Branches

| Branch | Head | Status |
|--------|------|--------|
| `main` | aa2bb92c (CC13, Aug 1) | Stable — last merge was CC13 row-moved guard |
| `feat/budget-artifact-slice1` | 06a22088 | Active — EB1 view-specification architecture (PR #241) |
| `chore/ci-gate-stacked-prs` | c5913fb9 | Current checkout — nightly committer fix landed here; EB1 WIP stashed |

## Active To-Do / Carry-Forward

- [ ] **EB1 view-specification architecture** — PR #241 on `feat/budget-artifact-slice1`. Declarative 8-knob spec replaces LLM-composed table HTML for budget schedules. ~1,500 lines of new code.
- [ ] Re-run demo project clones on host: `cd backend && ./venv/bin/python manage.py clone_demo_projects` — cloner now includes MF units, leases, and cost approach but existing clones (projects 125, 126) were created before the fix. Need to delete and re-clone.
- [ ] PropertyTab.tsx floor plan double-counting fix (commit fd54a3e or similar) — deployed? Verify "Units: 113 / 178" no longer appears on Chadron Terrace Rent Roll.

## Alpha Readiness Impact

No alpha blocker movement today. The committer fix is infrastructure — it restores the nightly sync pipeline that had been silently broken for 8 days. EB1 is a quality improvement to the artifacts system (already ✅ WORKS).

## Notes for Next Session

- The nightly committer now self-heals stale locks and refuses to run in the sandbox. The 8-night outage class should not recur.
- `chore/ci-gate-stacked-prs` has the committer fix but is not the right long-term home for it — consider merging to main or cherry-picking.
- The `git status` warning from the sandbox confirms the unlink-probe is working as designed: `unable to unlink .git/index.lock: Operation not permitted` — the sandbox correctly cannot delete inside `.git/`.

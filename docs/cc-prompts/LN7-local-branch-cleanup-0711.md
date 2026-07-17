# LN7 — Snapshot + delete the 4 local-only leftover branches

**Session ID:** `LSCMD-LOCALBRANCH-0711-LN7`
**Type:** git housekeeping (local-only branch deletion). No app code, no build, no DB, no push.

---
## ⚠️ BEFORE YOU START
Read fully. This deletes LOCAL branches. Snapshot their tip SHAs FIRST (Step 1) so every deletion is recoverable, then delete. These 4 exist only in the local checkout (never pushed to origin), and all are unmerged — Gregg has explicitly approved deleting all four after the snapshot.

---
## STEP 0 — ECHO-BACK + SAFETY
Report: session ID, current branch, `git status --short`.
- Be on `main` before deleting (you can't delete the branch you're standing on). None of the 4 should be the current branch; if one is, `git checkout main` first.
- Shared checkout with the parallel MAP session: do NOT discard any uncommitted map/backend/doc changes in the working tree. Deleting these 4 branch refs does not touch the working tree.

## THE 4 BRANCHES (delete all)
```
fix/location-map-pin-behavior
fix/overlay-durable-storage
fix/source-pointers-hide-empty
wip/property-type-badge-0624
```

## STEP 1 — RECOVERY SNAPSHOT (before any delete)
Append the tip SHA + subject of each to the existing recovery file so they can be recreated with `git branch <name> <sha>`:
```bash
{
  echo ""
  echo "# LN7 local-only branches deleted $(date -u +%FT%TZ)"
  for b in fix/location-map-pin-behavior fix/overlay-durable-storage fix/source-pointers-hide-empty wip/property-type-badge-0624; do
    echo "$b $(git rev-parse "$b") $(git log -1 --format='%s' "$b")"
  done
} >> docs/cc-prompts/branch-cleanup-0711-recovery.txt
```

## STEP 2 — DELETE (local only)
```bash
for b in fix/location-map-pin-behavior fix/overlay-durable-storage fix/source-pointers-hide-empty wip/property-type-badge-0624; do
  git branch -D "$b"
done
```
Do NOT `git push origin --delete` these — they were never on origin.

## SUCCESS CRITERIA
1. [ ] All 4 SHAs appended to `docs/cc-prompts/branch-cleanup-0711-recovery.txt` before deletion.
2. [ ] All 4 local branches deleted; `git branch` no longer lists them.
3. [ ] origin unchanged (still main + the 3 keepers); nothing pushed.
4. [ ] No foreign uncommitted work disturbed.

## REPORT BACK
Plain-English to Gregg: 4 deleted, recovery SHAs saved in the recovery file, origin untouched. No SHAs/branch jargon dumped into chat.

No server restart needed.

---
## STEP 3 (ADDENDUM, LN7b) — finish the 2 worktree-held branches
Context: `fix/location-map-pin-behavior` and `fix/overlay-durable-storage` couldn't be deleted because each is checked out in a leftover worktree. Cowork verified via `git worktree list` that BOTH worktrees are marked **prunable** (git's own stale flag), both are clean (overlay: no changes; locmap: only an untracked regenerable venv), both branch SHAs are already in the recovery snapshot, and the parallel MAP session's branch (`feature/map-sales-match-market`) is a normal branch — NOT in either worktree. Gregg already approved deleting all four. Safe to finish:

```bash
# remove the two stale worktrees (locmap needs --force due to the stray venv dir)
git worktree remove --force ~/landscape-wt-locmap
git worktree remove --force ~/landscape-wt-overlay
git worktree prune

# now delete the two branches (SHAs already captured in Step 1)
git branch -D fix/location-map-pin-behavior
git branch -D fix/overlay-durable-storage
```

Success: `git worktree list` shows only the main checkout; `git branch` no longer lists the two branches; origin still main + the 3 keepers; the MAP session's branch and any uncommitted map work untouched. Report back plain-English: all 4 now deleted, 2 stale worktrees removed.

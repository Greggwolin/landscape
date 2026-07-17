# LN9 — Bring Gregg's local checkout up to the merged main + restart dev

**Session ID:** `LSCMD-LOCALPULL-0711-LN9`
**Type:** git fast-forward + dev-server restart. No code changes, no DB.

## WHY
Gregg's localhost `/studio/9?folder=budget&tab=budget` still shows the (now-removed) empty "Var" column. Cause confirmed: the local `main` checkout is at `5683833e` (#156, media-dedup) and does NOT contain the budget merge `bd8600f2` (#157). The running dev server is serving pre-merge code. Production is already on `bd8600f2` and correct. Active path verified: `BudgetTab → BudgetContainer → BudgetGridTab` renders the grid whose Var column #157 removed, so advancing local to `bd8600f2` resolves it.

## ⚠️ SHARED-CHECKOUT SAFETY
This checkout (`/Users/5150east/landscape`) is shared with the parallel MAP session. Do a FAST-FORWARD only, and do not disturb the map session's untracked docs or any uncommitted work.

## STEP 0 — ECHO-BACK
Report session ID, current branch, `git status --short`. Confirm you're on `main` and the working tree has no uncommitted tracked changes that a pull would clobber (untracked map docs are fine — leave them). If tracked files are dirty, HALT and report rather than force anything.

## STEPS
```bash
git checkout main            # if not already on main
git fetch origin
git merge --ff-only origin/main   # fast-forward local main 5683833e -> bd8600f2
git log --oneline -1              # expect bd8600f2 … (#157)
bash restart.sh                   # restart Next.js + Django so the dev server serves the new code
```
If `--ff-only` refuses (local main diverged), HALT and report — do not merge/rebase blindly on the shared checkout.

## SUCCESS
1. [ ] Local `main` at `bd8600f2` (contains #157).
2. [ ] Dev server restarted; `localhost:3000` serving the merged code.
3. [ ] Map session's untracked/uncommitted work untouched.
4. [ ] Report back plain-English: local is now current; Gregg should hard-refresh the budget screen and the "Var" column will be gone.

## NOTE FOR GREGG (after CC reports)
Hard-refresh `localhost:3000/studio/9?folder=budget&tab=budget` — the empty "Var" column should be gone.

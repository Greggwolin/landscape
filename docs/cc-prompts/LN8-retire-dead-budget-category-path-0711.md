# LN8 — Retire the dead `core_budget_category` path (fresh, on current main)

**Session ID:** `LSCMD-BUDGETDEADPATH-0711-LN8`
**Target branch:** create `fix/retire-budget-deadpath-v2` from current `main`.
**Reference (spec only, do NOT merge/cherry-pick):** the stale branch `fix/retire-budget-category-deadpath` (71 commits behind). Read its diff and commit message for the intended scope, but re-derive every edit against current `main` — the shared budget files have changed since.

---
## ⚠️ BEFORE YOU START
Read fully, then ask questions.

⚠️ HIGH-RISK ZONE — this touches the budget grid (PROJECT_INSTRUCTIONS §17.3). Trace consumers with grep before deleting, and test the chain, not just the build. Read-only DB: **no migrations, no table create/drop** (`core_budget_category` is neither created nor dropped). Verification does not write to the DB.

Apply FRESH against current main. Do not `git cherry-pick` or `git merge` the stale branch — its diff will not line up with today's shared components (GroupRow, ColumnDefinitions, BudgetGridTab).

---
## STEP 0 — ECHO-BACK + SHARED-CHECKOUT
Report session ID, current branch, `git status --short`. Verify source branch is clean before creating the new branch (§22.6). The parallel MAP session shares this checkout — leave its uncommitted map/backend/doc work untouched.

---
## CONTEXT — Cowork audit (2026-07-11), confirmed on current main
- `core_budget_category` is an old category design, superseded by the live `core_unit_cost_category` taxonomy. **The table does not exist on the DB**, so the two remaining pieces that query it 500 at runtime — they are dead.
- Gregg's 2026-06-19 call: budget variance is not wanted yet. Retire the dead pieces rather than rebuild the table.
- **`useEditGuard` has ZERO importers on current main** (only its own definition file) → safe to delete.
- Consumers of the dead pieces are confined to the known budget files (BudgetGridTab, GroupRow, BudgetDataGrid) — no new consumers appeared in the 71 commits since the reference branch.
- The live category system (`core_unit_cost_category`, `vw_category_hierarchy`, `/api/budget/categories/tree`, the budget grid/tree category features) is UNTOUCHED.
- **KEEP the `BudgetCategory` model** — it is a live FK target for `BudgetItem.category_l1..l4`; deleting it breaks model loading and would force a migration. Only the dead `incomplete` action on it is removed.

## SCOPE — remove (all dead)
**Backend (`backend/apps/financial/`):**
- Delete `views_variance.py` and `services/variance_calculator.py`; remove their URL registrations in `urls.py` and the re-export in `services/__init__.py`.
- In `views_budget_categories.py`: remove the `incomplete` @action on `BudgetCategoryViewSet` (the `get_incomplete_categories_for_project` / `core_budget_category` 500 source) and any now-unused serializer import. Keep the rest of the viewset + the `BudgetCategory` model + serializer.

**Frontend (`src/`):**
- Delete `src/hooks/useBudgetVariance.ts` and `src/hooks/useEditGuard.ts`.
- Delete `src/components/budget/IncompleteCategoriesReminder.tsx` and remove its import/usage in `BudgetGridTab.tsx`.
- Delete the dead Next.js proxy routes: `src/app/api/budget/variance/[projectId]/route.ts` and the two `.../category/[categoryId]/route.ts` variance/reconcile routes the reference branch removed (confirm each is dead — no live importers — before deleting).
- Remove the variance column from the grid: the placeholder "Var" column in `ColumnDefinitions.tsx` (static "-") and the computed variance cell/badge/tooltip in `GroupRow.tsx`. **Keep header and group-row column counts aligned** — both must drop the column together.
- Remove any now-dead variance references in `BudgetDataGrid.tsx`.

**Housekeeping:** delete the 4 stray backup files: `src/components/budget/GroupRow.tsx.bak`, `IncompleteCategoriesReminder.tsx.bak`, `BudgetGridTab.tsx.bak`, `BudgetDataGrid.tsx.bak`.

## DOWNSTREAM IMPACT
**Files modified/deleted:** the budget grid components + budget financial views above.
**Known consumers to re-verify after removal:**
- Budget grid renders for Peoria Meadows with correct column alignment (the dropped variance column must not misalign header vs rows).
- Category tree (`/api/budget/categories/tree`) and all live category features still work.
- Income / cash-flow / variance-adjacent screens: confirm nothing imported the removed variance hook/routes (grep first).
- Django: no import errors from the removed views/services/URLs.

## IMPLEMENTATION STEPS
1. Step 0. Create `fix/retire-budget-deadpath-v2` off clean main.
2. `git show fix/retire-budget-category-deadpath` — read the reference diff for intent.
3. Grep current main to confirm each delete target has no live consumers beyond the known budget files (especially the 3 proxy routes and `useEditGuard`).
4. Apply the removals fresh, file by file, keeping the live model/taxonomy intact.
5. Build + test + browser-verify (below).

## SUCCESS CRITERIA
1. [ ] `npm run build` passes — no TypeScript errors, no unresolved imports.
2. [ ] Django starts + `pytest` (financial app) passes — no import errors from removed views/services/URLs.
3. [ ] Budget grid renders for Peoria Meadows; columns aligned (variance column gone from BOTH header and rows).
4. [ ] Category tree + live category features unchanged.
5. [ ] `BudgetCategory` model still loads; no migration created; DB untouched.
6. [ ] 4 `.bak` files gone; ~1,600+ lines of dead code removed.
7. [ ] grep shows no remaining references to `useBudgetVariance`, `useEditGuard`, `IncompleteCategoriesReminder`, `views_variance`, `variance_calculator`, or the `incomplete` action.

## VERIFICATION
```bash
npm run build
cd backend && ./venv/bin/python manage.py check && ./venv/bin/python -m pytest apps/financial -q
# grep the tree is clean of the removed symbols (should return nothing but the migration history)
```
Live: open the budget grid for Peoria Meadows and confirm columns align and category features work.

## SERVER RESTART
```bash
bash restart.sh
```

## AFTER
PR → squash-merge to main on green CI (auto-deploys), session ID in the commit footer. This supersedes the stale `fix/retire-budget-category-deadpath` branch — delete that branch once this merges (its SHA is already in `docs/cc-prompts/branch-cleanup-0711-recovery.txt`).

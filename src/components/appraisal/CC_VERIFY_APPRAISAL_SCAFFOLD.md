# CC: Verify Appraisal Conversational UI Scaffold

---

## BEFORE YOU START
Read this prompt fully. This is a **read-only verification** — no code modifications.

If anything is unclear about:
- Which branch this scaffold lives on
- How `?ui=appraisal` routing works
- What the expected visual layout should look like
- How the existing folder-tab UI should remain unaffected
...ask first. Do not assume.

DO NOT process, import, or write any data to the database during verification steps.

---

## OBJECTIVE

Verify that the 45-file Appraisal Conversational UI scaffold compiles, renders, and does not regress the existing folder-tab project UI.

---

## CONTEXT

- **Branch:** `feature/appraisal-ui` (confirm current branch)
- **New files:** 45 files in `src/components/appraisal/` (types, config, CSS, layout, topbar, left panel, chat panel, right panel, 6 detail panels, 20 approach views, 3 tiles, 1 reports strip, 4 shared components)
- **Modified file:** `src/app/projects/[projectId]/ProjectContentRouter.tsx` — added `useSearchParams` + early return for `?ui=appraisal`
- **No new API endpoints, no database changes, no modifications to existing components**

---

## VERIFICATION STEPS

### Step 1: Build check
```bash
npm run build
```
Must complete with zero TypeScript errors. If there are errors, list them — do NOT fix them yet.

### Step 2: Lint check
```bash
npm run lint
```
Note any warnings/errors in the new `src/components/appraisal/` directory.

### Step 3: Existing UI regression check
1. Start dev server: `npm run dev`
2. Navigate to any project URL without `?ui=appraisal` (e.g., `http://localhost:3000/projects/1`)
3. Confirm the folder-tab UI renders exactly as before
4. Click through at least 3 folders (Home, Property, Valuation) — all should work normally
5. **This is the most important check.** The appraisal scaffold must not break the default UI.

### Step 4: Appraisal UI renders
1. Navigate to `http://localhost:3000/projects/1?ui=appraisal`
2. Confirm three-panel layout appears (left sidebar, center chat, right panel)
3. Confirm approach tabs visible in topbar (Property, Market, Sales, Income, Cost, Reconciliation)
4. Click each approach tab — pills and view area should update
5. In Income approach, double-click a proforma row — detail panel should slide in from right
6. Close detail panel — should slide back out

### Step 5: CSS variable audit
Open browser DevTools on the appraisal UI. Search the computed styles for any hardcoded hex colors (`#` prefix) in elements under `.appraisal-layout`. There should be **none** — all colors should resolve to CoreUI CSS variables.

### Step 6: Collapsible left panel
Click the hamburger icon in the topbar. Left panel should collapse to 64px strip and expand back to 220px.

---

## SUCCESS CRITERIA

All must pass:

1. [ ] `npm run build` — zero errors
2. [ ] `npm run lint` — no new errors in `src/components/appraisal/`
3. [ ] Default folder-tab UI unchanged (3+ folders verified)
4. [ ] Appraisal layout renders at `?ui=appraisal`
5. [ ] All 6 approach tabs switch correctly
6. [ ] Detail panel opens/closes on double-click
7. [ ] No hardcoded hex colors in appraisal CSS
8. [ ] Left panel collapses/expands

---

## DOWNSTREAM IMPACT

**Files modified (existing):**
- `src/app/projects/[projectId]/ProjectContentRouter.tsx` — added early return before switch statement

**Known consumers of ProjectContentRouter:**
- `src/app/projects/[projectId]/page.tsx` — renders ProjectContentRouter
- No other files import ProjectContentRouter directly

**Risk:** Low. The `?ui=appraisal` check is an additive early return. The `useSearchParams()` hook is already available in the Next.js app router context. The existing switch/case logic is completely untouched.

**Post-change verification:**
- Default project URLs must still work (Step 3 above)
- No new API calls, no database reads/writes from the scaffold

---

## SERVER RESTART
After verification, restart the servers:
```bash
bash restart.sh
```

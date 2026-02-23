# NNN SLB — Wire & Seed (Phase 2)

Session QT2 built all NNN SLB components. This command completes the wiring:

## Context
- **Brief:** docs in `.claude/plans/nnn-slb-implementation-plan.md`
- **Components:** `src/components/valuation/nnn/` (13 files, all compiling)
- **Seed script:** `scripts/seed-rizvi-nnn-portfolio.sql`

## Tasks (execute in order)

### 1. Run DB Seed
```bash
psql $DATABASE_URL -f scripts/seed-rizvi-nnn-portfolio.sql
```
Verify: `SELECT project_id, project_name, property_subtype FROM landscape.tbl_project WHERE project_name LIKE 'Rizvi%';`

If `lu_property_subtype` table doesn't exist or seed fails on that insert, skip the subtype seeding — the `tbl_project.property_subtype = 'RETAIL_NNN'` column value is what drives NNN detection.

### 2. Wire NNNCashFlow into ProjectContentRouter
In `src/app/projects/[projectId]/ProjectContentRouter.tsx`, add routing for the Investment perspective `cash-flow` tab:

```typescript
// Inside case 'valuation':
// After the existing market-comps check:
if (currentTab === 'cash-flow') {
  const { isNNNProject } = await import('@/components/valuation/nnn/nnnDetection');
  if (isNNNProject(project)) {
    const NNNCashFlow = (await import('@/components/valuation/nnn/NNNCashFlow')).default;
    return <NNNCashFlow projectId={project.project_id} project={project} />;
  }
}
```

Or simpler — add it as a case in ValuationTab.tsx's normalizeTab function and render conditionally.

### 3. Update folderTabConfig.ts for Investment Perspective
Add `cash-flow` and `comparable-sales` sub-tab entries for INVESTMENT analysis on NNN:

In the valuation folder's subTabs array (around line 326), add:
```typescript
{ id: 'cash-flow', label: 'Cash Flow', analysisTypes: ['INVESTMENT'] as AnalysisTypeCode[] },
{ id: 'comparable-sales', label: 'Comparable Sales', analysisTypes: ['INVESTMENT'] as AnalysisTypeCode[] },
```

### 4. Wire Landscaper Context (3-level)
In `src/contexts/HelpLandscaperContext.tsx`, update `buildCurrentPage()` to accept an optional `subtab` parameter:

```typescript
function buildCurrentPage(pathname, folder, tab, subtab?) {
  if (folder && tab && subtab) return `${folder}_${tab}_${subtab}`;
  // ... existing logic
}
```

Then in NNNIncomeApproach.tsx and NNNCashFlow.tsx, replace the console.log with actual context updates via `useHelpLandscaper()`.

### 5. Verify
- Navigate to the Rizvi Portfolio project in the browser
- Confirm Valuation → Income Approach shows the SubSubTabBar with 4 pill tabs
- Click through all 4 panels — data should render from mock constants
- Confirm Cost Approach shows "Not Applicable" empty state
- Confirm Reconciliation shows NNN-specific layout
- `npm run build` passes (ignore pre-existing legacy route errors)

### 6. Optional: NNNComparableSales
If time permits, create `src/components/valuation/nnn/NNNComparableSales.tsx` — can wrap the existing `SalesComparisonApproach` component with NNN-specific columns from `SALES_COMPS` in nnnMockData.ts.

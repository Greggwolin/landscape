# Archived Routes

These routes were archived on 2026-02-08 during the folder tab consolidation.

They are NOT routable (Next.js ignores `_archive` prefixed directories).

## Why Archived

- **Dead routes:** No navigation links pointed to them
- **Legacy routes:** Superseded by newer implementations
- **Path-based routes:** Replaced by the folder tab query-param system (`?folder=X&tab=Y`)

## Folder Tab System

All project navigation now goes through:
- `src/lib/utils/folderTabConfig.ts` — tab definitions
- `src/hooks/useFolderNavigation.ts` — navigation state
- `src/app/projects/[projectId]/StudioContent.tsx` — content routing

## Archive Contents

| Archive Folder | Original Location | Reason |
|----------------|-------------------|--------|
| `property/` | `src/app/property/` | Dead. 9-tab property analyzer, no inbound links. |
| `parcel-test/` | `src/app/parcel-test/` | Dead. MapLibre GIS demo, test artifact. |
| `properties/` | `src/app/properties/` | Dead. Orphaned `/properties/[id]/analysis` route. |
| `projects-documents-files/` | `.../[projectId]/documents/files/` | Redirect shim to parent `/documents`. |
| `projects-landscaper/` | `.../[projectId]/landscaper/` | Legacy Phase 1 modal. Superseded by embedded panel. |
| `projects-sales-marketing/` | `.../[projectId]/sales-marketing/` | Legacy. Migrated to `/project/sales`. |
| `projects-validation/` | `.../[projectId]/validation/` | Dead. Dev-only debug report. |
| `projects-planning/` | `.../[projectId]/planning/` | Path-based layout+subtabs. Replaced by folder tabs. |
| `projects-development/` | `.../[projectId]/development/` | Path-based layout+subtabs. Replaced by folder tabs. |
| `projects-capitalization/operations/` | `.../[projectId]/capitalization/operations/` | Path-based. Replaced by `?folder=capital&tab=operations`. |
| `projects-capitalization/waterfall/` | `.../[projectId]/capitalization/waterfall/` | Path-based. Replaced by `?folder=capital&tab=waterfall`. |
| `projects-overview/` | `.../[projectId]/overview/` | Path-based. Replaced by `?folder=home`. |
| `projects-opex/` | `.../[projectId]/opex/` | Path-based. Replaced by `?folder=operations`. |
| `projects-opex-accounts/` | `.../[projectId]/opex-accounts/` | Path-based. Internal to Operations tab. |
| `projects-acquisition/` | `.../[projectId]/acquisition/` | Path-based. Replaced by `?folder=property&tab=acquisition`. |
| `projects-results/` | `.../[projectId]/results/` | Path-based. Replaced by `?folder=feasibility`. |
| `projects-analysis/` | `.../[projectId]/analysis/` | Path-based. Replaced by folder tab sub-tabs. |
| `projects-valuation/` | `.../[projectId]/valuation/page.tsx` | Path-based page. Replaced by `?folder=valuation`. |
| `projects-valuation-income-approach/` | `.../[projectId]/valuation/income-approach/` | Path-based. Replaced by `?folder=valuation&tab=income`. |

## NOT Archived (Dependencies)

These files were **not** archived because active components import from them:

| File | Imported By | Import |
|------|------------|--------|
| `.../capitalization/layout.tsx` | `CapitalizationTab.tsx` | `CapitalizationLayout` |
| `.../capitalization/equity/page.tsx` | `CapitalizationTab.tsx` | `EquityPage` |
| `.../capitalization/debt/page.tsx` | `CapitalizationTab.tsx` | `DebtPage` |
| `.../valuation/components/*.tsx` | `MarketDataContent.tsx` | `SalesComparisonApproach` |

These should be refactored in a follow-up to move the shared components to `src/components/`.

## Restoring a Route

To restore any archived route, move it back to its original location under `src/app/`.
Each archive folder name indicates its original path (e.g., `projects-planning` was at
`src/app/projects/[projectId]/planning/`).

# Orphaned Component Audit Results

**Generated:** 2026-02-13T16:43:13Z  
**Scope:** current `src/` codebase snapshot (including uncommitted changes)

## Summary
- Total source files scanned (`src/**/*.{ts,tsx,js,jsx}`): 1276
- Total route pages (`src/app/**/page.tsx`, excluding `_archive`): 56
- Total component files (`.tsx`, excluding route/layout/error files and `_archive`): 479
- Active navigation route patterns tracked: 21
- Orphaned pages (not in tracked active route set): 35
- Orphaned components (zero static imports): 63

## High-Impact Delta Since Prior Audit
- `src/app/components/PlanningWizard/` no longer exists in active source tree.
- 17 PlanningWizard files were moved to `src/app/_archive/components/PlanningWizard/`.
- `PlanningContent` no longer imports `PlanningWizard/cards/ParcelDetailCard`.

## Method Notes
- Import graph uses static resolution of:
  - `from '...'` imports
  - dynamic `import('...')`
  - alias resolution for `@/` to `src/`
  - relative path resolution (`./`, `../`)
- Exclusions:
  - `src/app/_archive/**`
  - route entry files (`page.tsx`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`)
- This is a static audit. Runtime-only references (string-based loaders, registry-based component lookup, CMS-driven wiring) may produce false positives.

## Active Navigation Routes (Tracked)
| Route Pattern |
|---|
| `/` |
| `/dashboard` |
| `/dms` |
| `/reports` |
| `/login` |
| `/register` |
| `/onboarding` |
| `/settings/profile` |
| `/admin/users` |
| `/admin/preferences` |
| `/admin/benchmarks` |
| `/admin/dms/templates` |
| `/projects/setup` |
| `/projects/[param]` |
| `/projects/[param]/project/summary` |
| `/projects/[param]/project/planning` |
| `/projects/[param]/project/budget` |
| `/projects/[param]/project/sales` |
| `/projects/[param]/project/dms` |
| `/projects/[param]/capitalization/equity` |
| `/projects/[param]/capitalization/debt` |

## Orphaned Pages (35)
| Route |
|---|
| `/admin/benchmarks/cost-library` |
| `/admin/changelog` |
| `/admin/feedback` |
| `/ai-document-review` |
| `/breadcrumb-demo` |
| `/budget-grid` |
| `/budget-grid-v2` |
| `/contacts` |
| `/db-schema` |
| `/dev-status` |
| `/documentation` |
| `/documents/review` |
| `/forgot-password` |
| `/gis-simple-test` |
| `/growthratedetail` |
| `/growthrates` |
| `/growthrates-original` |
| `/growthratesmanager` |
| `/inventory` |
| `/map-debug` |
| `/market` |
| `/market-assumptions` |
| `/planning` |
| `/preferences` |
| `/projects/[param]/assumptions` |
| `/projects/[param]/budget` |
| `/projects/[param]/documents` |
| `/projects/[param]/settings` |
| `/prototypes-multifam` |
| `/rent-roll` |
| `/reset-password` |
| `/settings/budget-categories` |
| `/settings/contact-roles` |
| `/settings/taxonomy` |
| `/test-coreui` |

## Zero-Import Components (63)
| File |
|---|
| `src/app/admin/preferences/components/CategoryTreeView.tsx` |
| `src/app/admin/preferences/components/CreateTagModal.tsx` |
| `src/app/components/Admin/CategoryTree.tsx` |
| `src/app/components/GIS/PlanNavigation.tsx` |
| `src/app/components/GIS/ProjectBoundarySetup.tsx` |
| `src/app/components/GIS/ProjectDocumentUploads.tsx` |
| `src/app/components/LandUse/InlineTaxonomySelector.tsx` |
| `src/app/components/LandUse/LandUseCanvas.tsx` |
| `src/app/components/LandUse/LandUseMatchWizard.tsx` |
| `src/app/components/LandUse/SimpleTaxonomySelector.tsx` |
| `src/app/components/LandUse/TaxonomySelector.tsx` |
| `src/app/components/LandscaperChatModal.tsx` |
| `src/app/components/Link.tsx` |
| `src/app/components/MapView.tsx` |
| `src/app/components/Market/MarketAssumptions.tsx` |
| `src/app/components/MarketAssumptionsNative.tsx` |
| `src/app/components/Setup/ProjectStructureChoice.tsx` |
| `src/app/components/layout/shared/Logo.tsx` |
| `src/app/components/layout/shared/ModeDropdown.tsx` |
| `src/app/components/layout/shared/UserDropdown.tsx` |
| `src/app/components/layout/shared/search/index.tsx` |
| `src/app/components/layout/vertical/FooterContent.tsx` |
| `src/app/components/layout/vertical/NavbarContent.tsx` |
| `src/app/components/layout/vertical/Navigation.tsx` |
| `src/app/components/new-project/ProjectSummaryPreview.tsx` |
| `src/app/components/stepper-dot/index.tsx` |
| `src/app/components/upgrade-to-pro-button/index.tsx` |
| `src/app/projects/[projectId]/components/landscaper/AgentContentHeader.tsx` |
| `src/app/projects/[projectId]/components/landscaper/AgentDashboard.tsx` |
| `src/app/projects/[projectId]/components/landscaper/SimpleProjectBar.tsx` |
| `src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx` |
| `src/app/projects/[projectId]/components/tabs/GISTab.tsx` |
| `src/app/projects/[projectId]/components/tabs/SourcesTab.tsx` |
| `src/app/projects/[projectId]/components/tabs/UsesTab.tsx` |
| `src/app/projects/[projectId]/components/tabs/archive/ComparableRentalsMapTemplate.tsx` |
| `src/app/projects/[projectId]/valuation/components/AdjustmentMatrix.tsx` |
| `src/app/projects/[projectId]/valuation/components/ComparableCard.tsx` |
| `src/app/projects/[projectId]/valuation/components/ComparablesGrid.old2.tsx` |
| `src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx` |
| `src/app/projects/[projectId]/valuation/components/SalesComparisonPanel.tsx` |
| `src/app/rent-roll/components/AnalysisDashboard.tsx` |
| `src/app/rent-roll/components/MarketAssumptions.tsx` |
| `src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx` |
| `src/components/benchmarks/unit-costs/InlineEditableCell.tsx` |
| `src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx` |
| `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` |
| `src/components/budget/CategoryCascadingDropdown.tsx` |
| `src/components/budget/CreateTemplateModal.tsx` |
| `src/components/budget/TemplateEditorModal.tsx` |
| `src/components/dms/profile/PlatformKnowledgeProfileForm.tsx` |
| `src/components/dms/search/Facets.tsx` |
| `src/components/dms/search/ResultsTable.tsx` |
| `src/components/dms/search/SearchBox.tsx` |
| `src/components/dms/upload/Queue.tsx` |
| `src/components/feasibility/FeasibilitySubNav.tsx` |
| `src/components/feasibility/MarketDataContent.tsx` |
| `src/components/feasibility/SensitivityAnalysisContent.tsx` |
| `src/components/ui/PageHeader.tsx` |
| `src/components/valuation/PendingRenoOffsetModal.tsx` |
| `src/contexts/ScenarioContext.tsx` |
| `src/hooks/useFieldHighlight.tsx` |
| `src/lib/tiptap/VersionDropdown.tsx` |
| `src/themes/current/index.tsx` |

## PlanningWizard Archive Inventory (17 files)
| Archived File |
|---|
| `src/app/_archive/components/PlanningWizard/AddContainerModal.tsx` |
| `src/app/_archive/components/PlanningWizard/ContainerTreeView.tsx` |
| `src/app/_archive/components/PlanningWizard/DraggableContainerNode.tsx` |
| `src/app/_archive/components/PlanningWizard/DraggableTile.tsx` |
| `src/app/_archive/components/PlanningWizard/DropZone.tsx` |
| `src/app/_archive/components/PlanningWizard/NavigationTiles.tsx` |
| `src/app/_archive/components/PlanningWizard/ParcelTile.tsx` |
| `src/app/_archive/components/PlanningWizard/PhaseCanvas.tsx` |
| `src/app/_archive/components/PlanningWizard/PhaseCanvasInline.tsx` |
| `src/app/_archive/components/PlanningWizard/ProjectCanvas.tsx` |
| `src/app/_archive/components/PlanningWizard/ProjectCanvasInline.tsx` |
| `src/app/_archive/components/PlanningWizard/README.md` |
| `src/app/_archive/components/PlanningWizard/cards/ParcelDetailCard.tsx` |
| `src/app/_archive/components/PlanningWizard/cards/ParcelDetailCard.utils.ts` |
| `src/app/_archive/components/PlanningWizard/forms/AreaForm.tsx` |
| `src/app/_archive/components/PlanningWizard/forms/ParcelForm.tsx` |
| `src/app/_archive/components/PlanningWizard/forms/PhaseForm.tsx` |

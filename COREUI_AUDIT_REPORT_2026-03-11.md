# CoreUI Compliance Audit Report
**Date:** 2026-03-11 16:12:50 
**Audited by:** OpenClaw / Gern
**Mode:** Read-only

---

## Executive Summary
- Total files audited: 449
- Compliant (0 violations): 179
- Medium (1–10): 200
- Low (11–30): 49
- Critical (30+): 21

---

## Top 20 Highest-Violation Files
| Rank | File | Violations | Score | hex | tw | dark | inline | font | modal | lib | cui |
|------|------|------------|-------|-----|----|----- |--------|------|-------|-----|-----|
| 1 | `src/components/admin/UserManagementPanel.tsx` | 122 | CRITICAL | 0 | 8 | 0 | 0 | 1 | 111 | 2 | 54 |
| 2 | `src/app/components/Budget/BudgetGridDark.tsx` | 64 | CRITICAL | 0 | 56 | 0 | 0 | 1 | 7 | 0 | 0 |
| 3 | `src/app/components/Market/MarketAssumptions.tsx` | 58 | CRITICAL | 0 | 47 | 0 | 0 | 0 | 10 | 1 | 0 |
| 4 | `src/app/components/Budget/BudgetGrid.tsx` | 56 | CRITICAL | 0 | 0 | 0 | 0 | 1 | 28 | 27 | 8 |
| 5 | `src/app/components/AI/DocumentReview.tsx` | 53 | CRITICAL | 0 | 49 | 0 | 0 | 4 | 0 | 0 | 0 |
| 6 | `src/components/sales/ParcelSalesTable.tsx` | 51 | CRITICAL | 28 | 0 | 0 | 0 | 0 | 22 | 1 | 52 |
| 7 | `src/app/components/GrowthRates.tsx` | 50 | CRITICAL | 43 | 0 | 0 | 0 | 3 | 0 | 4 | 0 |
| 8 | `src/components/reports/PropertySummaryView.tsx` | 50 | CRITICAL | 0 | 32 | 0 | 0 | 18 | 0 | 0 | 0 |
| 9 | `src/components/projects/onboarding/NewProjectDropZone.tsx` | 41 | CRITICAL | 0 | 36 | 5 | 0 | 0 | 0 | 0 | 1 |
| 10 | `src/app/components/ContainerManagement/ProjectSetupWizard.tsx` | 39 | CRITICAL | 0 | 38 | 0 | 0 | 1 | 0 | 0 | 0 |
| 11 | `src/app/documents/review/page.tsx` | 38 | CRITICAL | 1 | 18 | 6 | 0 | 0 | 4 | 9 | 0 |
| 12 | `src/app/components/DevStatus/DevStatus.tsx` | 38 | CRITICAL | 0 | 35 | 0 | 0 | 0 | 3 | 0 | 0 |
| 13 | `src/app/components/MapLibre/GISMap.tsx` | 38 | CRITICAL | 34 | 4 | 0 | 0 | 0 | 0 | 0 | 1 |
| 14 | `src/app/components/Migration/TaxonomyMigration.tsx` | 38 | CRITICAL | 0 | 37 | 0 | 0 | 1 | 0 | 0 | 0 |
| 15 | `src/app/components/GIS/ProjectDocumentUploads.tsx` | 37 | CRITICAL | 0 | 37 | 0 | 0 | 0 | 0 | 0 | 0 |
| 16 | `src/app/components/OpExHierarchy.tsx` | 37 | CRITICAL | 0 | 36 | 0 | 0 | 1 | 0 | 0 | 0 |
| 17 | `src/components/benchmarks/products/ProductLibraryPanel.tsx` | 37 | CRITICAL | 0 | 13 | 0 | 0 | 0 | 24 | 0 | 24 |
| 18 | `src/components/IssueReporter/IssueReporterDialog.tsx` | 35 | CRITICAL | 0 | 17 | 0 | 0 | 0 | 17 | 1 | 1 |
| 19 | `src/app/components/MarketFactors/index.tsx` | 33 | CRITICAL | 0 | 28 | 0 | 0 | 0 | 4 | 1 | 0 |
| 20 | `src/components/sales/PricingTable.tsx` | 32 | CRITICAL | 28 | 3 | 0 | 0 | 0 | 0 | 1 | 42 |

---

## Remediation Priority

### P1 — Critical (30+ violations)
- `src/components/admin/UserManagementPanel.tsx` — 122 violations — primary: modal (111)
- `src/app/components/Budget/BudgetGridDark.tsx` — 64 violations — primary: tailwind (56)
- `src/app/components/Market/MarketAssumptions.tsx` — 58 violations — primary: tailwind (47)
- `src/app/components/Budget/BudgetGrid.tsx` — 56 violations — primary: modal (28)
- `src/app/components/AI/DocumentReview.tsx` — 53 violations — primary: tailwind (49)
- `src/components/sales/ParcelSalesTable.tsx` — 51 violations — primary: hex (28)
- `src/app/components/GrowthRates.tsx` — 50 violations — primary: hex (43)
- `src/components/reports/PropertySummaryView.tsx` — 50 violations — primary: tailwind (32)
- `src/components/projects/onboarding/NewProjectDropZone.tsx` — 41 violations — primary: tailwind (36)
- `src/app/components/ContainerManagement/ProjectSetupWizard.tsx` — 39 violations — primary: tailwind (38)
- `src/app/documents/review/page.tsx` — 38 violations — primary: tailwind (18)
- `src/app/components/DevStatus/DevStatus.tsx` — 38 violations — primary: tailwind (35)
- `src/app/components/MapLibre/GISMap.tsx` — 38 violations — primary: hex (34)
- `src/app/components/Migration/TaxonomyMigration.tsx` — 38 violations — primary: tailwind (37)
- `src/app/components/GIS/ProjectDocumentUploads.tsx` — 37 violations — primary: tailwind (37)
- `src/app/components/OpExHierarchy.tsx` — 37 violations — primary: tailwind (36)
- `src/components/benchmarks/products/ProductLibraryPanel.tsx` — 37 violations — primary: modal (24)
- `src/components/IssueReporter/IssueReporterDialog.tsx` — 35 violations — primary: tailwind (17)
- `src/app/components/MarketFactors/index.tsx` — 33 violations — primary: tailwind (28)
- `src/components/sales/PricingTable.tsx` — 32 violations — primary: hex (28)
- `src/components/landscaper/LandscaperPanel.tsx` — 31 violations — primary: modal (26)

### P2 — High (11–30 violations)
- `src/app/register/page.tsx` — 29 violations — primary: tailwind (29)
- `src/components/benchmarks/BenchmarkAccordion.tsx` — 29 violations — primary: tailwind (14)
- `src/components/budget/QuickAddCategoryModal.tsx` — 29 violations — primary: modal (23)
- `src/components/documents/CorrectionModal.tsx` — 27 violations — primary: modal (21)
- `src/app/components/Setup/ProjectStructureChoice.tsx` — 26 violations — primary: tailwind (26)
- `src/components/taxonomy/FamilyDetails.tsx` — 26 violations — primary: hex (17)
- `src/components/extraction/StagingModal.tsx` — 25 violations — primary: modal (19)
- `src/components/project/ProjectLandUseLabels.tsx` — 25 violations — primary: tailwind (25)
- `src/components/map-tab/MapTab.tsx` — 24 violations — primary: hex (15)
- `src/components/sales/SaleCalculationModal.tsx` — 24 violations — primary: modal (22)
- `src/app/dashboard/page.tsx` — 23 violations — primary: modal (22)
- `src/components/operations/ExpenseBreakdownChart.tsx` — 23 violations — primary: hex (23)
- `src/app/gis-simple-test/page.tsx` — 22 violations — primary: tailwind (19)
- `src/app/components/Admin/CategoryTree.tsx` — 22 violations — primary: tailwind (20)
- `src/components/project/ProjectProfileTile.tsx` — 22 violations — primary: modal (21)
- `src/app/components/LandUsePricing/index.tsx` — 20 violations — primary: tailwind (20)
- `src/app/components/UniversalInventory/UniversalInventoryTable.tsx` — 20 violations — primary: tailwind (10)
- `src/components/map/ValuationSalesCompMap.tsx` — 20 violations — primary: hex (19)
- `src/components/feasibility/MarketDataContent.tsx` — 19 violations — primary: modal (18)
- `src/app/market/page.tsx` — 18 violations — primary: tailwind (16)
- `src/app/reset-password/page.tsx` — 18 violations — primary: tailwind (18)
- `src/app/components/GrowthRates-Original.tsx` — 18 violations — primary: hex (13)
- `src/app/components/GrowthRatesManager/index.tsx` — 18 violations — primary: library (18)
- `src/components/budget/IncompleteCategoriesReminder.tsx` — 18 violations — primary: dark (7)
- `src/app/components/Documentation/MarkdownViewer.tsx` — 17 violations — primary: tailwind (17)
- `src/components/capitalization/LoanCard.tsx` — 17 violations — primary: modal (9)
- `src/components/projects/onboarding/ModelReadinessDisplay.tsx` — 17 violations — primary: tailwind (17)
- `src/app/forgot-password/page.tsx` — 16 violations — primary: tailwind (16)
- `src/components/operations/NOIWaterfallChart.tsx` — 16 violations — primary: hex (16)
- `src/app/components/Market/MarketMapView.tsx` — 15 violations — primary: hex (14)
- `src/components/map-tab/LeafletGISView.tsx` — 15 violations — primary: tailwind (11)
- `src/components/sales/AnnualInventoryGauge.tsx` — 15 violations — primary: hex (12)
- `src/app/contacts/page.tsx` — 14 violations — primary: modal (12)
- `src/app/components/GrowthRateDetail/index.tsx` — 14 violations — primary: tailwind (14)
- `src/app/components/StyleCatalog/NavTabsSection.tsx` — 14 violations — primary: hex (14)
- `src/components/operations/DraggableOpexSection.tsx` — 14 violations — primary: hex (14)
- `src/components/sales/SaveBenchmarkModal.tsx` — 14 violations — primary: modal (13)
- `src/components/taxonomy/FamilyTree.tsx` — 14 violations — primary: modal (8)
- `src/components/landscaper/ActivityFeedItem.tsx` — 13 violations — primary: dark (12)
- `src/app/components/layout/shared/UserDropdown.tsx` — 12 violations — primary: library (12)
- `src/components/admin/BenchmarksPanel.tsx` — 12 violations — primary: modal (11)
- `src/app/documentation/page.tsx` — 11 violations — primary: tailwind (6)
- `src/app/components/Planning/PlanningContent.tsx` — 11 violations — primary: modal (7)
- `src/app/components/new-project/MapPinSelector.tsx` — 11 violations — primary: tailwind (8)
- `src/components/admin/SystemPicklistsAccordion.tsx` — 11 violations — primary: modal (10)
- `src/components/dms/list/PlatformKnowledgeAccordion.tsx` — 11 violations — primary: tailwind (11)
- `src/components/ic/AggressivenessSlider.tsx` — 11 violations — primary: hex (11)
- `src/components/landscaper/MutationProposalCard.tsx` — 11 violations — primary: hex (11)
- `src/components/operations/ExpenseTreemap.tsx` — 11 violations — primary: hex (11)

### P3 — Medium (1–10 violations)
(200 files total, top 10 shown)

- `src/app/components/LandscaperChatModal.tsx` — 10 violations — primary: modal (5)
- `src/app/components/NewProjectModal.tsx` — 10 violations — primary: modal (9)
- `src/components/benchmarks/AddBenchmarkModal.tsx` — 10 violations — primary: modal (8)
- `src/components/market/CompetitiveProjectsPanel.tsx` — 10 violations — primary: modal (8)
- `src/components/projects/contacts/ContactsSection.tsx` — 10 violations — primary: modal (9)
- `src/app/budget-grid/page.tsx` — 9 violations — primary: library (9)
- `src/app/projects/[projectId]/assumptions/page.tsx` — 9 violations — primary: tailwind (9)
- `src/app/components/GIS/PlanNavigation.tsx` — 9 violations — primary: tailwind (5)
- `src/app/components/LandUse/LandUseCanvas.tsx` — 9 violations — primary: modal (7)
- `src/app/components/NavigationLayout.tsx` — 9 violations — primary: modal (9)

---

## Full File-by-File Results
| Violations | Score | File | hex | tw | dark | inline | font | modal | lib | cui |
|------------|-------|------|-----|----|----- |--------|------|-------|-----|-----|
| 122 | CRITICAL | `src/components/admin/UserManagementPanel.tsx` | 0 | 8 | 0 | 0 | 1 | 111 | 2 | 54 |
| 64 | CRITICAL | `src/app/components/Budget/BudgetGridDark.tsx` | 0 | 56 | 0 | 0 | 1 | 7 | 0 | 0 |
| 58 | CRITICAL | `src/app/components/Market/MarketAssumptions.tsx` | 0 | 47 | 0 | 0 | 0 | 10 | 1 | 0 |
| 56 | CRITICAL | `src/app/components/Budget/BudgetGrid.tsx` | 0 | 0 | 0 | 0 | 1 | 28 | 27 | 8 |
| 53 | CRITICAL | `src/app/components/AI/DocumentReview.tsx` | 0 | 49 | 0 | 0 | 4 | 0 | 0 | 0 |
| 51 | CRITICAL | `src/components/sales/ParcelSalesTable.tsx` | 28 | 0 | 0 | 0 | 0 | 22 | 1 | 52 |
| 50 | CRITICAL | `src/app/components/GrowthRates.tsx` | 43 | 0 | 0 | 0 | 3 | 0 | 4 | 0 |
| 50 | CRITICAL | `src/components/reports/PropertySummaryView.tsx` | 0 | 32 | 0 | 0 | 18 | 0 | 0 | 0 |
| 41 | CRITICAL | `src/components/projects/onboarding/NewProjectDropZone.tsx` | 0 | 36 | 5 | 0 | 0 | 0 | 0 | 1 |
| 39 | CRITICAL | `src/app/components/ContainerManagement/ProjectSetupWizard.tsx` | 0 | 38 | 0 | 0 | 1 | 0 | 0 | 0 |
| 38 | CRITICAL | `src/app/documents/review/page.tsx` | 1 | 18 | 6 | 0 | 0 | 4 | 9 | 0 |
| 38 | CRITICAL | `src/app/components/DevStatus/DevStatus.tsx` | 0 | 35 | 0 | 0 | 0 | 3 | 0 | 0 |
| 38 | CRITICAL | `src/app/components/MapLibre/GISMap.tsx` | 34 | 4 | 0 | 0 | 0 | 0 | 0 | 1 |
| 38 | CRITICAL | `src/app/components/Migration/TaxonomyMigration.tsx` | 0 | 37 | 0 | 0 | 1 | 0 | 0 | 0 |
| 37 | CRITICAL | `src/app/components/GIS/ProjectDocumentUploads.tsx` | 0 | 37 | 0 | 0 | 0 | 0 | 0 | 0 |
| 37 | CRITICAL | `src/app/components/OpExHierarchy.tsx` | 0 | 36 | 0 | 0 | 1 | 0 | 0 | 0 |
| 37 | CRITICAL | `src/components/benchmarks/products/ProductLibraryPanel.tsx` | 0 | 13 | 0 | 0 | 0 | 24 | 0 | 24 |
| 35 | CRITICAL | `src/components/IssueReporter/IssueReporterDialog.tsx` | 0 | 17 | 0 | 0 | 0 | 17 | 1 | 1 |
| 33 | CRITICAL | `src/app/components/MarketFactors/index.tsx` | 0 | 28 | 0 | 0 | 0 | 4 | 1 | 0 |
| 32 | CRITICAL | `src/components/sales/PricingTable.tsx` | 28 | 3 | 0 | 0 | 0 | 0 | 1 | 42 |
| 31 | CRITICAL | `src/components/landscaper/LandscaperPanel.tsx` | 0 | 0 | 0 | 0 | 5 | 26 | 0 | 10 |
| 29 | LOW | `src/app/register/page.tsx` | 0 | 29 | 0 | 0 | 0 | 0 | 0 | 0 |
| 29 | LOW | `src/components/benchmarks/BenchmarkAccordion.tsx` | 3 | 14 | 12 | 0 | 0 | 0 | 0 | 151 |
| 29 | LOW | `src/components/budget/QuickAddCategoryModal.tsx` | 0 | 0 | 0 | 0 | 0 | 23 | 6 | 0 |
| 27 | LOW | `src/components/documents/CorrectionModal.tsx` | 0 | 0 | 0 | 0 | 0 | 21 | 6 | 0 |
| 26 | LOW | `src/app/components/Setup/ProjectStructureChoice.tsx` | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| 26 | LOW | `src/components/taxonomy/FamilyDetails.tsx` | 17 | 0 | 0 | 0 | 0 | 8 | 1 | 22 |
| 25 | LOW | `src/components/extraction/StagingModal.tsx` | 1 | 0 | 0 | 0 | 0 | 19 | 5 | 0 |
| 25 | LOW | `src/components/project/ProjectLandUseLabels.tsx` | 0 | 25 | 0 | 0 | 0 | 0 | 0 | 0 |
| 24 | LOW | `src/components/map-tab/MapTab.tsx` | 15 | 0 | 0 | 8 | 1 | 0 | 0 | 9 |
| 24 | LOW | `src/components/sales/SaleCalculationModal.tsx` | 0 | 0 | 0 | 0 | 0 | 22 | 2 | 40 |
| 23 | LOW | `src/app/dashboard/page.tsx` | 0 | 0 | 0 | 0 | 0 | 22 | 1 | 17 |
| 23 | LOW | `src/components/operations/ExpenseBreakdownChart.tsx` | 23 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 22 | LOW | `src/app/gis-simple-test/page.tsx` | 0 | 19 | 0 | 0 | 3 | 0 | 0 | 0 |
| 22 | LOW | `src/app/components/Admin/CategoryTree.tsx` | 0 | 20 | 0 | 0 | 1 | 0 | 1 | 0 |
| 22 | LOW | `src/components/project/ProjectProfileTile.tsx` | 1 | 0 | 0 | 0 | 0 | 21 | 0 | 1 |
| 20 | LOW | `src/app/components/LandUsePricing/index.tsx` | 0 | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| 20 | LOW | `src/app/components/UniversalInventory/UniversalInventoryTable.tsx` | 0 | 10 | 10 | 0 | 0 | 0 | 0 | 0 |
| 20 | LOW | `src/components/map/ValuationSalesCompMap.tsx` | 19 | 0 | 0 | 0 | 1 | 0 | 0 | 22 |
| 19 | LOW | `src/components/feasibility/MarketDataContent.tsx` | 0 | 0 | 0 | 0 | 0 | 18 | 1 | 1 |
| 18 | LOW | `src/app/market/page.tsx` | 0 | 16 | 0 | 0 | 1 | 0 | 1 | 0 |
| 18 | LOW | `src/app/reset-password/page.tsx` | 0 | 18 | 0 | 0 | 0 | 0 | 0 | 0 |
| 18 | LOW | `src/app/components/GrowthRates-Original.tsx` | 13 | 0 | 0 | 0 | 3 | 0 | 2 | 0 |
| 18 | LOW | `src/app/components/GrowthRatesManager/index.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 18 | 0 |
| 18 | LOW | `src/components/budget/IncompleteCategoriesReminder.tsx` | 0 | 6 | 7 | 0 | 2 | 0 | 3 | 0 |
| 17 | LOW | `src/app/components/Documentation/MarkdownViewer.tsx` | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| 17 | LOW | `src/components/capitalization/LoanCard.tsx` | 0 | 0 | 0 | 0 | 7 | 9 | 1 | 28 |
| 17 | LOW | `src/components/projects/onboarding/ModelReadinessDisplay.tsx` | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 |
| 16 | LOW | `src/app/forgot-password/page.tsx` | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| 16 | LOW | `src/components/operations/NOIWaterfallChart.tsx` | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 15 | LOW | `src/app/components/Market/MarketMapView.tsx` | 14 | 0 | 1 | 0 | 0 | 0 | 0 | 61 |
| 15 | LOW | `src/components/map-tab/LeafletGISView.tsx` | 4 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| 15 | LOW | `src/components/sales/AnnualInventoryGauge.tsx` | 12 | 0 | 0 | 0 | 3 | 0 | 0 | 17 |
| 14 | LOW | `src/app/contacts/page.tsx` | 0 | 0 | 0 | 0 | 0 | 12 | 2 | 0 |
| 14 | LOW | `src/app/components/GrowthRateDetail/index.tsx` | 0 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| 14 | LOW | `src/app/components/StyleCatalog/NavTabsSection.tsx` | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 13 |
| 14 | LOW | `src/components/operations/DraggableOpexSection.tsx` | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 14 | LOW | `src/components/sales/SaveBenchmarkModal.tsx` | 0 | 0 | 0 | 0 | 0 | 13 | 1 | 0 |
| 14 | LOW | `src/components/taxonomy/FamilyTree.tsx` | 5 | 0 | 0 | 0 | 0 | 8 | 1 | 0 |
| 13 | LOW | `src/components/landscaper/ActivityFeedItem.tsx` | 0 | 1 | 12 | 0 | 0 | 0 | 0 | 6 |
| 12 | LOW | `src/app/components/layout/shared/UserDropdown.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 12 | 0 |
| 12 | LOW | `src/components/admin/BenchmarksPanel.tsx` | 1 | 0 | 0 | 0 | 0 | 11 | 0 | 3 |
| 11 | LOW | `src/app/documentation/page.tsx` | 0 | 6 | 0 | 0 | 1 | 4 | 0 | 21 |
| 11 | LOW | `src/app/components/Planning/PlanningContent.tsx` | 0 | 1 | 0 | 0 | 3 | 7 | 0 | 105 |
| 11 | LOW | `src/app/components/new-project/MapPinSelector.tsx` | 3 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | LOW | `src/components/admin/SystemPicklistsAccordion.tsx` | 0 | 0 | 0 | 0 | 0 | 10 | 1 | 0 |
| 11 | LOW | `src/components/dms/list/PlatformKnowledgeAccordion.tsx` | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | LOW | `src/components/ic/AggressivenessSlider.tsx` | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | LOW | `src/components/landscaper/MutationProposalCard.tsx` | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |
| 11 | LOW | `src/components/operations/ExpenseTreemap.tsx` | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 10 | MEDIUM | `src/app/components/LandscaperChatModal.tsx` | 0 | 1 | 0 | 0 | 4 | 5 | 0 | 5 |
| 10 | MEDIUM | `src/app/components/NewProjectModal.tsx` | 1 | 0 | 0 | 0 | 0 | 9 | 0 | 89 |
| 10 | MEDIUM | `src/components/benchmarks/AddBenchmarkModal.tsx` | 0 | 2 | 0 | 0 | 0 | 8 | 0 | 0 |
| 10 | MEDIUM | `src/components/market/CompetitiveProjectsPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 8 | 2 | 0 |
| 10 | MEDIUM | `src/components/projects/contacts/ContactsSection.tsx` | 0 | 1 | 0 | 0 | 0 | 9 | 0 | 0 |
| 9 | MEDIUM | `src/app/budget-grid/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 0 |
| 9 | MEDIUM | `src/app/projects/[projectId]/assumptions/page.tsx` | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| 9 | MEDIUM | `src/app/components/GIS/PlanNavigation.tsx` | 0 | 5 | 0 | 0 | 4 | 0 | 0 | 0 |
| 9 | MEDIUM | `src/app/components/LandUse/LandUseCanvas.tsx` | 0 | 2 | 0 | 0 | 0 | 7 | 0 | 0 |
| 9 | MEDIUM | `src/app/components/NavigationLayout.tsx` | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 0 |
| 9 | MEDIUM | `src/app/components/new-project/LocationSection.tsx` | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| 9 | MEDIUM | `src/app/components/theme/index.tsx` | 0 | 0 | 3 | 0 | 0 | 0 | 6 | 0 |
| 9 | MEDIUM | `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | 0 | 7 | 0 | 0 | 0 | 0 | 2 | 0 |
| 9 | MEDIUM | `src/components/capitalization/LoanScheduleGrid.tsx` | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 9 |
| 9 | MEDIUM | `src/components/dashboard/CompletenessModal.tsx` | 0 | 3 | 0 | 0 | 0 | 6 | 0 | 1 |
| 9 | MEDIUM | `src/components/landscaper/ScenarioHistoryPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 0 |
| 9 | MEDIUM | `src/components/operations/IncomeTreemap.tsx` | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 9 | MEDIUM | `src/components/projects/onboarding/NewProjectChat.tsx` | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| 9 | MEDIUM | `src/components/taxonomy/ProductsList.tsx` | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 26 |
| 8 | MEDIUM | `src/app/inventory/page.tsx` | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | MEDIUM | `src/app/components/DVLTimeSeries.tsx` | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | MEDIUM | `src/app/components/ProjectCosts/index.tsx` | 3 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | MEDIUM | `src/components/changelog/VersionBadge.tsx` | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 5 |
| 8 | MEDIUM | `src/components/dms/ProjectMediaGallery.tsx` | 5 | 0 | 0 | 0 | 3 | 0 | 0 | 28 |
| 8 | MEDIUM | `src/components/dms/modals/PlatformKnowledgeModal.tsx` | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | MEDIUM | `src/components/dms/upload/Queue.tsx` | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | MEDIUM | `src/components/landscaper/UnitMixAccordion.tsx` | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 4 |
| 8 | MEDIUM | `src/components/operations/InventoryStatsPanel.tsx` | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 8 | MEDIUM | `src/components/projects/onboarding/SimplifiedChannelView.tsx` | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | MEDIUM | `src/app/db-schema/page.tsx` | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | MEDIUM | `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | 4 | 0 | 0 | 2 | 1 | 0 | 0 | 22 |
| 7 | MEDIUM | `src/app/components/new-project/LandscaperPanel.tsx` | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 2 |
| 7 | MEDIUM | `src/app/components/upgrade-to-pro-button/index.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 |
| 7 | MEDIUM | `src/components/Onboarding/OnboardingChat.tsx` | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 9 |
| 7 | MEDIUM | `src/components/analysis/SfCompsTile.tsx` | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 17 |
| 7 | MEDIUM | `src/components/budget/CategoryTreeManager.tsx` | 6 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| 7 | MEDIUM | `src/components/budget/custom/TimelineChart.tsx` | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | MEDIUM | `src/components/dms/profile/PlatformKnowledgeProfileForm.tsx` | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | MEDIUM | `src/components/dms/search/Facets.tsx` | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| 7 | MEDIUM | `src/components/location-intelligence/LocationMap.tsx` | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 7 | MEDIUM | `src/components/projects/onboarding/NewProjectOnboardingModal.tsx` | 0 | 2 | 0 | 0 | 0 | 4 | 1 | 0 |
| 6 | MEDIUM | `src/app/budget-grid-v2/page.tsx` | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | MEDIUM | `src/app/components/LandUse/LandUseMatchWizard.tsx` | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | MEDIUM | `src/app/components/MarketAssumptionsNative.tsx` | 0 | 0 | 0 | 0 | 4 | 0 | 2 | 68 |
| 6 | MEDIUM | `src/components/ic/ICResultsTabs.tsx` | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 6 | MEDIUM | `src/components/ingestion/DocumentIngestion.tsx` | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |
| 6 | MEDIUM | `src/components/landscaper/ChatInterface.tsx` | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 4 |
| 6 | MEDIUM | `src/components/landscaper/FieldMappingInterface.tsx` | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 3 |
| 6 | MEDIUM | `src/components/landscaper/LandscaperProgress.tsx` | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 11 |
| 6 | MEDIUM | `src/components/landscaper/SnapshotButton.tsx` | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| 6 | MEDIUM | `src/components/map-tab/FeatureModal.tsx` | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 |
| 6 | MEDIUM | `src/components/map-tab/MapCanvas.tsx` | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 6 | MEDIUM | `src/components/map/MapOblique.tsx` | 5 | 0 | 0 | 0 | 1 | 0 | 0 | 6 |
| 5 | MEDIUM | `src/app/components/TaxonomySelector/TaxonomySelector.tsx` | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | MEDIUM | `src/components/admin/ExportButton.tsx` | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 0 |
| 5 | MEDIUM | `src/components/admin/ReportConfiguratorPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 0 |
| 5 | MEDIUM | `src/components/dms/list/DocumentTable.tsx` | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 1 |
| 5 | MEDIUM | `src/components/dms/staging/StagingRow.tsx` | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 26 |
| 5 | MEDIUM | `src/components/ic/PresentationModeView.tsx` | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 5 | MEDIUM | `src/components/landscaper/DataTableModal.tsx` | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 12 |
| 5 | MEDIUM | `src/components/landscaper/ExtractionFieldRow.tsx` | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 1 |
| 5 | MEDIUM | `src/components/market/AddCompetitorModal.tsx` | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 0 |
| 4 | MEDIUM | `src/app/growthratedetail/page.tsx` | 0 | 2 | 0 | 0 | 0 | 1 | 1 | 0 |
| 4 | MEDIUM | `src/app/components/GIS/ProjectBoundarySetup.tsx` | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/app/components/LandUse/TaxonomySelector.tsx` | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/app/components/new-project/PropertyDataSection.tsx` | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/components/benchmarks/AISuggestionsSection.tsx` | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/components/budget/ColumnDefinitions.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 1 | 3 |
| 4 | MEDIUM | `src/components/dms/modals/DocumentChatModal.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 1 | 0 |
| 4 | MEDIUM | `src/components/dms/search/ResultsTable.tsx` | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/components/phases/PhaseTransition.tsx` | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/components/projects/contacts/AddContactModal.tsx` | 0 | 1 | 0 | 0 | 0 | 3 | 0 | 0 |
| 4 | MEDIUM | `src/components/projects/onboarding/NewProjectFieldTable.tsx` | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 4 | MEDIUM | `src/components/shared/EntityMediaDisplay.tsx` | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |
| 4 | MEDIUM | `src/components/valuation/nnn/panels/TenantCreditPanel.tsx` | 1 | 0 | 0 | 0 | 2 | 1 | 0 | 42 |
| 3 | MEDIUM | `src/app/map-debug/page.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | MEDIUM | `src/app/components/LandUse/SimpleTaxonomySelector.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | MEDIUM | `src/components/IssueReporter/IssueReporterProvider.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| 3 | MEDIUM | `src/components/Onboarding/DocumentUploadModal.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 6 |
| 3 | MEDIUM | `src/components/analysis/validation/ValidationReport.tsx` | 2 | 0 | 0 | 0 | 1 | 0 | 0 | 49 |
| 3 | MEDIUM | `src/components/auth/ProtectedRoute.tsx` | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | MEDIUM | `src/components/benchmarks/GrowthRateCategoryPanel.tsx` | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 2 |
| 3 | MEDIUM | `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 60 |
| 3 | MEDIUM | `src/components/budget/BudgetDataGrid.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 2 |
| 3 | MEDIUM | `src/components/budget/BudgetItemModalV2.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 3 | MEDIUM | `src/components/budget/FiltersAccordion.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 8 |
| 3 | MEDIUM | `src/components/budget/ModeSelector.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 3 | MEDIUM | `src/components/budget/custom/GroupRow.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 5 |
| 3 | MEDIUM | `src/components/contacts/ContactModal.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| 3 | MEDIUM | `src/components/dms/list/DocumentAccordion.tsx` | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 39 |
| 3 | MEDIUM | `src/components/dms/modals/PlatformKnowledgeChatModal.tsx` | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| 3 | MEDIUM | `src/components/dms/panels/DmsLandscaperPanel.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 6 |
| 3 | MEDIUM | `src/components/feasibility/SensitivityAnalysisContent.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 1 | 21 |
| 3 | MEDIUM | `src/components/intelligence/ValueValidationScreen.tsx` | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 7 |
| 3 | MEDIUM | `src/components/operations/ValueAddCard.tsx` | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 3 | MEDIUM | `src/components/projects/onboarding/NewProjectChannelTabs.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 3 | MEDIUM | `src/components/reports/ExtractionFilterPills.tsx` | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 3 | MEDIUM | `src/components/sales/PhaseTiles.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 9 |
| 3 | MEDIUM | `src/components/shared/AreaTiles.tsx` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 13 |
| 3 | MEDIUM | `src/components/valuation/assumptions/DcfParametersSection.tsx` | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 19 |
| 3 | MEDIUM | `src/components/valuation/income-approach/AssumptionsPanel.tsx` | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 39 |
| 2 | MEDIUM | `src/app/login/page.tsx` | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | MEDIUM | `src/app/components/LandUse/LandUseDetails.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| 2 | MEDIUM | `src/app/components/MarketAssumptions.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 7 |
| 2 | MEDIUM | `src/app/components/dashboard/TriageModal.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 41 |
| 2 | MEDIUM | `src/app/components/layout/shared/ModeDropdown.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| 2 | MEDIUM | `src/app/components/layout/vertical/VerticalMenu.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| 2 | MEDIUM | `src/components/benchmarks/LandscaperPanel.tsx` | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | MEDIUM | `src/components/capitalization/LeveragedCashFlow.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 59 |
| 2 | MEDIUM | `src/components/capitalization/WaterfallConfigForm.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 13 |
| 2 | MEDIUM | `src/components/contacts/ContactDetailPanel.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 |
| 2 | MEDIUM | `src/components/dms/staging/StagingTray.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| 2 | MEDIUM | `src/components/dms/upload/Dropzone.tsx` | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | MEDIUM | `src/components/intelligence/IntelligenceTab.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 2 | MEDIUM | `src/components/intelligence/OverrideToggle.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 2 | MEDIUM | `src/components/land-use/LandUsePicker.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |
| 2 | MEDIUM | `src/components/operations/OpExModeSelector.tsx` | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2 | MEDIUM | `src/components/ui/tabs.tsx` | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| 2 | MEDIUM | `src/components/valuation/income-approach/SensitivityMatrix.tsx` | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 26 |
| 1 | MEDIUM | `src/app/growthrates-original/page.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/growthrates/page.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/growthratesmanager/page.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/projects/[projectId]/documents/page.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 1 | MEDIUM | `src/app/projects/[projectId]/page.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/projects/[projectId]/settings/page.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/DynamicBreadcrumb.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/MapView.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| 1 | MEDIUM | `src/app/components/Planning/PlanningOverviewControls.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 28 |
| 1 | MEDIUM | `src/app/components/ProjectContextBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 7 |
| 1 | MEDIUM | `src/app/components/ProjectCreationBanner.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/ProjectProvider.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/StyleCatalog/BadgeIntentsSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 15 |
| 1 | MEDIUM | `src/app/components/StyleCatalog/ButtonIntentsSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 14 |
| 1 | MEDIUM | `src/app/components/StyleCatalog/PropertyTypeTokensSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 7 |
| 1 | MEDIUM | `src/app/components/ThemeRegistry.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/app/components/ThemeToggle.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/TopNavigationBar.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/assumptions/FieldRenderer.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/app/components/layout/shared/search/index.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/app/components/layout/vertical/NavbarContent.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/app/components/layout/vertical/Navigation.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/app/components/stepper-dot/index.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/app/components/theme/ModeChanger.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/acquisition/AcquisitionLedgerGrid.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 19 |
| 1 | MEDIUM | `src/components/admin/AdminModal.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/admin/ExtractionMappingAdmin.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 13 |
| 1 | MEDIUM | `src/components/admin/LandscaperAdminPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 15 |
| 1 | MEDIUM | `src/components/admin/PicklistEditor.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/admin/PicklistItemModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/admin/PreferencesPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 13 |
| 1 | MEDIUM | `src/components/admin/ReportTemplateCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 |
| 1 | MEDIUM | `src/components/admin/ReportTemplateEditorModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/alpha/AlphaLandscaperChat.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/alpha/HelpFeedbackAgent.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 7 |
| 1 | MEDIUM | `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 9 |
| 1 | MEDIUM | `src/components/budget/BudgetGridTab.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| 1 | MEDIUM | `src/components/budget/CategoryTemplateManager.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/budget/CreateTemplateModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/budget/TemplateEditorModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/budget/TimelineTab.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 3 |
| 1 | MEDIUM | `src/components/budget/custom/BudgetGridWithTimeline.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| 1 | MEDIUM | `src/components/budget/custom/CategoryEditorRow.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/budget/custom/EditableCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/budget/fields/FieldRenderer.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/budget/tiles/TimingEscalationTile.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 14 |
| 1 | MEDIUM | `src/components/dms/DMSView.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 60 |
| 1 | MEDIUM | `src/components/dms/MediaBadgeChips.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 7 |
| 1 | MEDIUM | `src/components/dms/filters/ProjectSelector.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/dms/list/ColumnChooser.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/dms/list/PlatformKnowledgeTable.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/dms/modals/DeleteConfirmModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 6 |
| 1 | MEDIUM | `src/components/dms/modals/MediaCard.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 14 |
| 1 | MEDIUM | `src/components/dms/modals/MediaPickerModal.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 15 |
| 1 | MEDIUM | `src/components/dms/modals/RenameModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/dms/modals/UploadCollisionModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/dms/profile/ProfileForm.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 35 |
| 1 | MEDIUM | `src/components/dms/search/SearchBox.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/dms/views/DocumentVersionHistory.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 24 |
| 1 | MEDIUM | `src/components/icons/LandscaperIcon.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/ingestion/RentRollMapper.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 7 |
| 1 | MEDIUM | `src/components/landscaper/AdviceAdherencePanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/landscaper/ExtractionReviewModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 5 |
| 1 | MEDIUM | `src/components/landscaper/MediaSummaryCard.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 3 |
| 1 | MEDIUM | `src/components/location-intelligence/AddPointPopover.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/operations/VacancyDeductionsSection.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | MEDIUM | `src/components/project/ProjectProfileEditModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| 1 | MEDIUM | `src/components/reports/ExtractionHistoryReport.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 1 | MEDIUM | `src/components/sales/CreateSalePhaseModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1 | MEDIUM | `src/components/sales/FilterSidebar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| 1 | MEDIUM | `src/components/sales/SaleTransactionDetails.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 |
| 1 | MEDIUM | `src/components/sales/SalesContent.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 |
| 1 | MEDIUM | `src/components/sales/TransactionColumn.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| 1 | MEDIUM | `src/components/valuation/PendingRenoOffsetModal.tsx` | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| 1 | MEDIUM | `src/components/valuation/income-approach/ValueTiles.tsx` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 10 |
| 1 | MEDIUM | `src/components/valuation/nnn/NNNComparableSales.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 12 |
| 1 | MEDIUM | `src/components/valuation/nnn/NNNReconciliation.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 30 |
| 1 | MEDIUM | `src/components/valuation/nnn/SubSubTabBar.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 6 |
| 1 | MEDIUM | `src/components/valuation/nnn/panels/LeaseTermsPanel.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| 1 | MEDIUM | `src/components/valuation/nnn/panels/ReturnsSummaryPanel.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 21 |
| 1 | MEDIUM | `src/components/valuation/nnn/panels/ValueConclusionPanel.tsx` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 22 |
| 0 | HIGH | `src/app/dev-status/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/market-assumptions/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/onboarding/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/app/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/app/projects/[projectId]/budget/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/[projectId]/capitalization/debt/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/app/projects/[projectId]/capitalization/equity/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/[projectId]/investment-committee/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/[projectId]/project/budget/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/app/projects/[projectId]/project/dms/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/[projectId]/project/planning/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/[projectId]/project/sales/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/[projectId]/project/summary/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/projects/setup/page.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/AdminNavBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 |
| 0 | HIGH | `src/app/components/CoreUIThemeProvider.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/Header.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/LandUse/InlineTaxonomySelector.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/Link.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/Navigation.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/app/components/Planning/CollapsibleSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 0 | HIGH | `src/app/components/PreferencesContextBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/app/components/QueryProvider.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/StyleCatalog/CardHeadersSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/app/components/assumptions/AssumptionBasket.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/assumptions/FieldGroup.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/assumptions/HelpTooltip.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/dashboard/DashboardMap.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| 0 | HIGH | `src/app/components/layout/shared/Logo.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/layout/vertical/FooterContent.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/layout/vertical/NavToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/navigation/UserMenuDropdown.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/app/components/new-project/Badge.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/IssueReporter/IssueReporterContext.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/Onboarding/OnboardingSurvey.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30 |
| 0 | HIGH | `src/components/admin/CostLibraryPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/DMSAdminPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/knowledge-library/CounterBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/knowledge-library/DocClassificationBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/knowledge-library/DocResultCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/knowledge-library/FilterColumns.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/knowledge-library/KnowledgeLibraryPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 0 | HIGH | `src/components/admin/knowledge-library/SourceToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/admin/knowledge-library/UploadDropZone.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/alpha/AlphaAssistantFlyout.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/alpha/FeedbackLog.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |
| 0 | HIGH | `src/components/alpha/HelpContentPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/analysis/cashflow/CashFlowSummaryMetrics.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 22 |
| 0 | HIGH | `src/components/analysis/cashflow/CashFlowTable.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |
| 0 | HIGH | `src/components/analysis/cashflow/CostGranularityToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/analysis/cashflow/TimeScaleSelector.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/analysis/shared/CashFlowGrid.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 26 |
| 0 | HIGH | `src/components/benchmarks/BenchmarksFlyout.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/benchmarks/unit-costs/InlineEditableCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/budget/BudgetContainer.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/budget/CategoryCascadingDropdown.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/budget/custom/ColoredDotIndicator.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 0 | HIGH | `src/components/budget/custom/ColumnChooser.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/budget/custom/DataGrid.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/budget/custom/ExpandableDetailsRow.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| 0 | HIGH | `src/components/budget/custom/PhaseCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/budget/tiles/CostControlsTile.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/capitalization/EquityPartnersTable.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/capitalization/LoanBudgetModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 16 |
| 0 | HIGH | `src/components/capitalization/MetricCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 |
| 0 | HIGH | `src/components/capitalization/PendingRenoOffsetModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 |
| 0 | HIGH | `src/components/capitalization/WaterfallResults.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20 |
| 0 | HIGH | `src/components/changelog/ChangelogModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/common/UOMSelect.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/contacts/ContactTypeahead.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/contacts/RelationshipManager.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/dashboard/CompletenessBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/diligence/DiligenceBlocks.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/dms/filters/AccordionFilters.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 37 |
| 0 | HIGH | `src/components/dms/filters/DocTypeFilters.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 |
| 0 | HIGH | `src/components/dms/profile/TagInput.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 24 |
| 0 | HIGH | `src/components/dms/shared/DMSLayout.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/feasibility/ComparableModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/feasibility/ComparablesTable.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| 0 | HIGH | `src/components/feasibility/FeasibilitySubNav.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/help/HelpLandscaperPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ic/ICPage.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/icons/HelpIcon.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/income-approach/RentScheduleGrid.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 |
| 0 | HIGH | `src/components/ingestion/DocumentCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/ingestion/IngestionChat.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/components/ingestion/MilestoneBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| 0 | HIGH | `src/components/ingestion/PropertyOverview.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 0 | HIGH | `src/components/intelligence/IntakeChoiceModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/land-use/DetailColumn.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/land-use/FamilyColumn.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/land-use/SummaryBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/land-use/TypeColumn.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/landscaper/ActivityFeed.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 |
| 0 | HIGH | `src/components/landscaper/ChatMessageBubble.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 |
| 0 | HIGH | `src/components/landscaper/CollapsedLandscaperStrip.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/landscaper/CreateDynamicColumnModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/landscaper/ExtractionQueueSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/landscaper/KpiDefinitionManager.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/landscaper/LandscaperChat.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 20 |
| 0 | HIGH | `src/components/landscaper/LandscaperChatThreaded.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 34 |
| 0 | HIGH | `src/components/landscaper/LandscaperInstructionsPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/landscaper/ScenarioCompareView.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/landscaper/ScenarioSaveModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/landscaper/ThreadList.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18 |
| 0 | HIGH | `src/components/landscaper/VarianceItem.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/location-intelligence/MapLayerToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/map-tab/DrawToolbar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/map-tab/LayerPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/map/ParcelOverlayLayer.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/map/ProjectTabMap.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 37 |
| 0 | HIGH | `src/components/operations/AddButton.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/DetailSummaryToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/EGISubtotalBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/EvidenceCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/GrowthBadge.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/InputCell.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/ItemNameEditor.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/NOITotalBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/OperatingExpensesSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/OperatingIncomeCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17 |
| 0 | HIGH | `src/components/operations/OperatingStatement.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/operations/OperationsHeader.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/OtherIncomeSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/RentalIncomeSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/SectionCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/SummaryBar.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/ValueAddAccordion.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/operations/ValueAddToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/project/ActivityFeed.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/project/GranularityIndicators.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/project/MetricCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/project/MilestoneTimeline.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | HIGH | `src/components/project/ProfileField.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/project/ProjectDates.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/project/ProjectPhotosModal.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/project/ProjectSubNav.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/projects/DeleteProjectDialog.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/projects/contacts/ContactCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/projects/contacts/ContactRoleCard.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/property/CompetitiveMarketCharts.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 30 |
| 0 | HIGH | `src/components/reports/RentScheduleReport.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/components/sales/TransactionGrid.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/shared/ModeToggle.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/DropZoneWrapper.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/ui/PageHeader.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 0 | HIGH | `src/components/ui/SemanticCategoryChip.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/alert.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/badge.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/button.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/card.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/dialog.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/input.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/label.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/landscape/DataTable.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/landscape/LandscapeButton.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/landscape/PropertyTypeBadge.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/components/ui/landscape/SemanticBadge.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 |
| 0 | HIGH | `src/components/ui/landscape/SemanticButton.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/ui/landscape/SemanticCategoryChip.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/landscape/StatusChip.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/radio-group.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/select.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/textarea.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/ui/toast.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/valuation/UnifiedAssumptionsPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/valuation/assumptions/GrowthRateSelect.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| 0 | HIGH | `src/components/valuation/assumptions/LandDevCostsSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/valuation/assumptions/LandDevInflationSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/valuation/assumptions/LandDevRevenueSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 0 | HIGH | `src/components/valuation/assumptions/ResultsSection.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| 0 | HIGH | `src/components/valuation/income-approach/DCFView.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 71 |
| 0 | HIGH | `src/components/valuation/income-approach/DirectCapView.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 58 |
| 0 | HIGH | `src/components/valuation/nnn/NNNCashFlow.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/valuation/nnn/NNNIncomeApproach.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | HIGH | `src/components/valuation/nnn/panels/UnitEconomicsPanel.tsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |

# Orphaned Component Audit Results

## Summary
- Total pages: 92
- Total components: 514
- Active navigation routes detected: 18
- Orphaned pages (non-excluded): 46
- Orphaned components (zero imports): 186
- Prototype/excluded component files: 29
- Sandbox-excluded page files: 28

## Method Notes
- Read-only audit only (no files deleted or modified under `src/`).
- Exclusions applied: `src/app/prototypes/*`, any path containing `prototype`, sandbox dropdown routes, and `src/app/components/Archive/*`.
- Active routes are constrained to actual `src/app/**/page.tsx` routes to reduce false positives from comments/deprecated code/API strings.
- Component import counts use two heuristics: module-path imports and symbol-name imports; dynamic/indirect runtime references may still require manual review.

## Active Navigation Routes
| Route | Source |
|------|--------|
| `/` | navigation components/constants |
| `/admin/benchmarks` | navigation components/constants |
| `/admin/preferences` | navigation components/constants |
| `/admin/users` | navigation components/constants |
| `/dashboard` | navigation components/constants |
| `/dms` | navigation components/constants |
| `/login` | navigation components/constants |
| `/projects/[param]/capitalization/debt` | navigation components/constants |
| `/projects/[param]/capitalization/equity` | navigation components/constants |
| `/projects/[param]/project/budget` | navigation components/constants |
| `/projects/[param]/project/dms` | navigation components/constants |
| `/projects/[param]/project/planning` | navigation components/constants |
| `/projects/[param]/project/sales` | navigation components/constants |
| `/projects/[param]/project/summary` | navigation components/constants |
| `/register` | navigation components/constants |
| `/rent-roll` | navigation components/constants |
| `/reports` | navigation components/constants |
| `/settings/profile` | navigation components/constants |

## Orphaned Pages (Not in Active Navigation)
| File | Route | Reason |
|------|-------|--------|
| `src/app/_archive/parcel-test/page.tsx` | `/_archive/parcel-test` | Not referenced in active navigation route set |
| `src/app/_archive/projects-acquisition/page.tsx` | `/_archive/projects-acquisition` | Not referenced in active navigation route set |
| `src/app/_archive/projects-analysis/market-data/page.tsx` | `/_archive/projects-analysis/market-data` | Not referenced in active navigation route set |
| `src/app/_archive/projects-analysis/page.tsx` | `/_archive/projects-analysis` | Not referenced in active navigation route set |
| `src/app/_archive/projects-analysis/sensitivity/page.tsx` | `/_archive/projects-analysis/sensitivity` | Not referenced in active navigation route set |
| `src/app/_archive/projects-capitalization/operations/page.tsx` | `/_archive/projects-capitalization/operations` | Not referenced in active navigation route set |
| `src/app/_archive/projects-capitalization/waterfall/page.tsx` | `/_archive/projects-capitalization/waterfall` | Not referenced in active navigation route set |
| `src/app/_archive/projects-development/budget/page.tsx` | `/_archive/projects-development/budget` | Not referenced in active navigation route set |
| `src/app/_archive/projects-development/phasing/page.tsx` | `/_archive/projects-development/phasing` | Not referenced in active navigation route set |
| `src/app/_archive/projects-documents-files/page.tsx` | `/_archive/projects-documents-files` | Not referenced in active navigation route set |
| `src/app/_archive/projects-landscaper/page.tsx` | `/_archive/projects-landscaper` | Not referenced in active navigation route set |
| `src/app/_archive/projects-opex-accounts/page.tsx` | `/_archive/projects-opex-accounts` | Not referenced in active navigation route set |
| `src/app/_archive/projects-opex/page.tsx` | `/_archive/projects-opex` | Not referenced in active navigation route set |
| `src/app/_archive/projects-overview/page.tsx` | `/_archive/projects-overview` | Not referenced in active navigation route set |
| `src/app/_archive/projects-planning/budget/page.tsx` | `/_archive/projects-planning/budget` | Not referenced in active navigation route set |
| `src/app/_archive/projects-planning/land-use/page.tsx` | `/_archive/projects-planning/land-use` | Not referenced in active navigation route set |
| `src/app/_archive/projects-planning/market/page.tsx` | `/_archive/projects-planning/market` | Not referenced in active navigation route set |
| `src/app/_archive/projects-results/page.tsx` | `/_archive/projects-results` | Not referenced in active navigation route set |
| `src/app/_archive/projects-sales-marketing/page.tsx` | `/_archive/projects-sales-marketing` | Not referenced in active navigation route set |
| `src/app/_archive/projects-validation/page.tsx` | `/_archive/projects-validation` | Not referenced in active navigation route set |
| `src/app/_archive/projects-valuation-income-approach/income-approach/page.tsx` | `/_archive/projects-valuation-income-approach/income-approach` | Not referenced in active navigation route set |
| `src/app/_archive/projects-valuation/page.tsx` | `/_archive/projects-valuation` | Not referenced in active navigation route set |
| `src/app/_archive/properties/[id]/analysis/page.tsx` | `/_archive/properties/[param]/analysis` | Not referenced in active navigation route set |
| `src/app/_archive/property/[id]/page.tsx` | `/_archive/property/[param]` | Not referenced in active navigation route set |
| `src/app/admin/benchmarks/cost-library/page.tsx` | `/admin/benchmarks/cost-library` | Not referenced in active navigation route set |
| `src/app/admin/changelog/page.tsx` | `/admin/changelog` | Not referenced in active navigation route set |
| `src/app/admin/feedback/page.tsx` | `/admin/feedback` | Not referenced in active navigation route set |
| `src/app/benchmarks/products/page.tsx` | `/benchmarks/products` | Not referenced in active navigation route set |
| `src/app/benchmarks/unit-costs/page.tsx` | `/benchmarks/unit-costs` | Not referenced in active navigation route set |
| `src/app/contacts/page.tsx` | `/contacts` | Not referenced in active navigation route set |
| `src/app/diligence/page.tsx` | `/diligence` | Not referenced in active navigation route set |
| `src/app/forgot-password/page.tsx` | `/forgot-password` | Not referenced in active navigation route set |
| `src/app/ingestion/page.tsx` | `/ingestion` | Not referenced in active navigation route set |
| `src/app/lease/[id]/page.tsx` | `/lease/[param]` | Not referenced in active navigation route set |
| `src/app/onboarding/page.tsx` | `/onboarding` | Not referenced in active navigation route set |
| `src/app/phases/page.tsx` | `/phases` | Not referenced in active navigation route set |
| `src/app/preferences/page.tsx` | `/preferences` | Not referenced in active navigation route set |
| `src/app/projects/[projectId]/budget/page.tsx` | `/projects/[param]/budget` | Not referenced in active navigation route set |
| `src/app/projects/[projectId]/documents/page.tsx` | `/projects/[param]/documents` | Not referenced in active navigation route set |
| `src/app/projects/[projectId]/napkin/page.tsx` | `/projects/[param]/napkin` | Not referenced in active navigation route set |
| `src/app/projects/[projectId]/napkin/waterfall/page.tsx` | `/projects/[param]/napkin/waterfall` | Not referenced in active navigation route set |
| `src/app/projects/[projectId]/settings/page.tsx` | `/projects/[param]/settings` | Not referenced in active navigation route set |
| `src/app/reset-password/page.tsx` | `/reset-password` | Not referenced in active navigation route set |
| `src/app/settings/budget-categories/page.tsx` | `/settings/budget-categories` | Not referenced in active navigation route set |
| `src/app/settings/contact-roles/page.tsx` | `/settings/contact-roles` | Not referenced in active navigation route set |
| `src/app/settings/taxonomy/page.tsx` | `/settings/taxonomy` | Not referenced in active navigation route set |

## DEFINITELY DELETE
| File | Reason |
|------|--------|
| `src/app/_archive/parcel-test/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-acquisition/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-analysis/market-data/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-analysis/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-analysis/sensitivity/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-capitalization/operations/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-capitalization/waterfall/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-development/budget/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-development/phasing/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-documents-files/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-landscaper/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-opex-accounts/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-opex/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-overview/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-planning/budget/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-planning/land-use/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-planning/market/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-results/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-sales-marketing/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-validation/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-valuation-income-approach/income-approach/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/projects-valuation/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/properties/[id]/analysis/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/_archive/property/[id]/page.tsx` | In Archive folder or legacy _archive path |
| `src/app/components/Archive/PlanningContentGrid.tsx` | In Archive folder or legacy _archive path |
| `src/app/components/Archive/PlanningContentHot.tsx` | In Archive folder or legacy _archive path |

## PROBABLY DELETE
| File | Reason |
|------|--------|
| `src/app/components/Admin/LandUseInputTable.tsx` | Component has zero detected imports |
| `src/app/components/Admin/LandUseInputTableTanStack.tsx` | Component has zero detected imports |
| `src/app/components/Admin/LandUseManagement.tsx` | Component has zero detected imports |
| `src/app/components/Budget/BudgetContainerView.tsx` | Component has zero detected imports |
| `src/app/components/Budget/BudgetContent.tsx` | Component has zero detected imports |
| `src/app/components/Budget/BudgetGridDarkWrapper.tsx` | Component has zero detected imports |
| `src/app/components/Budget/BudgetGridLight.tsx` | Component has zero detected imports |
| `src/app/components/BudgetGridWithDependencies.tsx` | Component has zero detected imports |
| `src/app/components/DependencyConfigPanel.tsx` | Component has zero detected imports |
| `src/app/components/DirectionalIcon.tsx` | Component has zero detected imports |
| `src/app/components/Documents/DocumentManagement.tsx` | Component has zero detected imports |
| `src/app/components/FilterableSelect.tsx` | Component has zero detected imports |
| `src/app/components/Form.tsx` | Component has zero detected imports |
| `src/app/components/GIS/AssessorDataMapping.tsx` | Component has zero detected imports |
| `src/app/components/GIS/GISSetupWorkflow.tsx` | Component has zero detected imports |
| `src/app/components/GIS/PropertyPackageUpload.tsx` | Component has zero detected imports |
| `src/app/components/Glossary/ZoningGlossaryAdmin.tsx` | Component has zero detected imports |
| `src/app/components/GrowthRates-Original.tsx` | Component has zero detected imports |
| `src/app/components/Home/HomeOverview.tsx` | Component has zero detected imports |
| `src/app/components/Home/UnderConstruction.tsx` | Component has zero detected imports |
| `src/app/components/Illustrations.tsx` | Component has zero detected imports |
| `src/app/components/LandUse/LandUseSchema.tsx` | Component has zero detected imports |
| `src/app/components/MarketAssumptionsComparison.tsx` | Component has zero detected imports |
| `src/app/components/MarketAssumptionsMUI.tsx` | Component has zero detected imports |
| `src/app/components/Migration/TaxonomyMigration.tsx` | Component has zero detected imports |
| `src/app/components/NewProject/BasicInfoStep.tsx` | Component has zero detected imports |
| `src/app/components/NewProject/PropertyTypeStep.tsx` | Component has zero detected imports |
| `src/app/components/NewProject/TemplateStep.tsx` | Component has zero detected imports |
| `src/app/components/NewProjectButton.tsx` | Component has zero detected imports |
| `src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx` | Component has zero detected imports |
| `src/app/components/PlanningWizard/PlanningWizard.tsx` | Component has zero detected imports |
| `src/app/components/PlanningWizard/PlanningWizardInline.tsx` | Component has zero detected imports |
| `src/app/components/PlanningWizard/Sidebar.tsx` | Component has zero detected imports |
| `src/app/components/PlanningWizard/cards/AreaDetailCard.tsx` | Component has zero detected imports |
| `src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx` | Component has zero detected imports |
| `src/app/components/Providers.tsx` | Component has zero detected imports |
| `src/app/components/Setup/ProjectTaxonomyWizard.tsx` | Component has zero detected imports |
| `src/app/components/ThemeSwitcher.tsx` | Component has zero detected imports |
| `src/app/components/TimelineVisualization.tsx` | Component has zero detected imports |
| `src/app/components/card-statistics/Vertical.tsx` | Component has zero detected imports |
| `src/app/components/dashboard/UserTile.tsx` | Component has zero detected imports |
| `src/app/components/layout/vertical/Footer.tsx` | Component has zero detected imports |
| `src/app/components/layout/vertical/Navbar.tsx` | Component has zero detected imports |
| `src/app/components/navigation/SandboxDropdown.tsx` | Component has zero detected imports |
| `src/app/components/navigation/SettingsDropdown.tsx` | Component has zero detected imports |
| `src/app/components/new-project/AIDocumentPrompt.tsx` | Component has zero detected imports |
| `src/app/components/new-project/AssetTypeSection.tsx` | Component has zero detected imports |
| `src/app/components/new-project/ConfigureSection.tsx` | Component has zero detected imports |
| `src/app/components/new-project/FloatingLabelInput.tsx` | Component has zero detected imports |
| `src/app/components/new-project/MapPinSelector.tsx` | Component has zero detected imports |
| `src/app/components/new-project/PathCard.tsx` | Component has zero detected imports |
| `src/components/DebugMount.tsx` | Component has zero detected imports |
| `src/components/IssueReporter/IssueReporterButton.tsx` | Component has zero detected imports |
| `src/components/acquisition/AcquisitionAccordion.tsx` | Component has zero detected imports |
| `src/components/acquisition/AcquisitionHeaderCard.tsx` | Component has zero detected imports |
| `src/components/acquisition/AcquisitionReconciliation.tsx` | Component has zero detected imports |
| `src/components/acquisition/NapkinAcquisitionAccordion.tsx` | Component has zero detected imports |
| `src/components/admin/ColorSwatch.tsx` | Component has zero detected imports |
| `src/components/admin/ColorTableRow.tsx` | Component has zero detected imports |
| `src/components/admin/ExtractionMappingAdmin.tsx` | Component has zero detected imports |
| `src/components/admin/SystemPicklistsAccordion.tsx` | Component has zero detected imports |
| `src/components/alpha/AlphaAssistantModal.tsx` | Component has zero detected imports |
| `src/components/alpha/AlphaFeedbackForm.tsx` | Component has zero detected imports |
| `src/components/analysis/cashflow/CashFlowPhaseTable.tsx` | Component has zero detected imports |
| `src/components/benchmarks/BenchmarksFlyout.tsx` | Component has zero detected imports |
| `src/components/benchmarks/GrowthRateStepEditor.tsx` | Component has zero detected imports |
| `src/components/benchmarks/GrowthRateWizard.tsx` | Component has zero detected imports |
| `src/components/budget/BasicBudgetTable.tsx` | Component has zero detected imports |
| `src/components/budget/BudgetGanttGrid.tsx` | Component has zero detected imports |
| `src/components/budget/BudgetHealthWidget.tsx` | Component has zero detected imports |
| `src/components/budget/BudgetItemModal.tsx` | Component has zero detected imports |
| `src/components/budget/BudgetItemModalV2.tsx` | Component has zero detected imports |
| `src/components/budget/ColumnDefinitions.tsx` | Component has zero detected imports |
| `src/components/budget/CostCategoriesTab.tsx` | Component has zero detected imports |
| `src/components/budget/CustomColumns.tsx` | Component has zero detected imports |
| `src/components/budget/EditConfirmationDialog.tsx` | Component has zero detected imports |
| `src/components/budget/GanttChart.tsx` | Component has zero detected imports |
| `src/components/budget/GanttEditModal.tsx` | Component has zero detected imports |
| `src/components/budget/ModeSelector.tsx` | Component has zero detected imports |
| `src/components/budget/ReconciliationModal.tsx` | Component has zero detected imports |
| `src/components/budget/SimpleBudgetGrid.tsx` | Component has zero detected imports |
| `src/components/budget/TimelineChartPeriods.tsx` | Component has zero detected imports |
| `src/components/budget/VarianceAlertModal.tsx` | Component has zero detected imports |
| `src/components/budget/VarianceWarningBadge.tsx` | Component has zero detected imports |
| `src/components/budget/custom/EditableCategoryCell.tsx` | Component has zero detected imports |
| `src/components/capitalization/CapitalizationSubNav.tsx` | Component has zero detected imports |
| `src/components/capitalization/DebtFacilitiesTable.tsx` | Component has zero detected imports |
| `src/components/capitalization/DebtFacilityModal.tsx` | Component has zero detected imports |
| `src/components/capitalization/DeveloperFeeModal.tsx` | Component has zero detected imports |
| `src/components/capitalization/DeveloperFeesTable.tsx` | Component has zero detected imports |
| `src/components/capitalization/DrawScheduleTable.tsx` | Component has zero detected imports |
| `src/components/capitalization/EquityPartnersTable.tsx` | Component has zero detected imports |
| `src/components/capitalization/LoanScheduleModal.tsx` | Component has zero detected imports |
| `src/components/capitalization/ManagementOverheadTable.tsx` | Component has zero detected imports |
| `src/components/capitalization/OverheadItemModal.tsx` | Component has zero detected imports |
| `src/components/capitalization/PartnerSummaryCards.tsx` | Component has zero detected imports |
| `src/components/capitalization/WaterfallDistributionTable.tsx` | Component has zero detected imports |
| `src/components/capitalization/WaterfallResults.tsx` | Component has zero detected imports |
| `src/components/capitalization/WaterfallStructureTable.tsx` | Component has zero detected imports |
| `src/components/contacts/RelationshipManager.tsx` | Component has zero detected imports |
| `src/components/copilot/CopilotProvider.tsx` | Component has zero detected imports |
| `src/components/dashboard/DashboardChat.tsx` | Component has zero detected imports |
| `src/components/dashboard/ProjectTable.tsx` | Component has zero detected imports |
| `src/components/dms/MediaDetailView.tsx` | Component has zero detected imports |
| `src/components/dms/ProcessingStatus.tsx` | Component has zero detected imports |
| `src/components/dms/admin/AttrBuilder.tsx` | Component has zero detected imports |
| `src/components/dms/admin/TemplateDesigner.tsx` | Component has zero detected imports |
| `src/components/dms/filters/AccordionFilters.tsx` | Component has zero detected imports |
| `src/components/dms/filters/SmartFilterBuilder.tsx` | Component has zero detected imports |
| `src/components/dms/folders/FolderEditor.tsx` | Component has zero detected imports |
| `src/components/dms/folders/FolderTree.tsx` | Component has zero detected imports |
| `src/components/dms/modals/MediaCard.tsx` | Component has zero detected imports |
| `src/components/dms/modals/PlatformKnowledgeChatModal.tsx` | Component has zero detected imports |
| `src/components/dms/modals/PlatformKnowledgeModal.tsx` | Component has zero detected imports |
| `src/components/dms/modals/UploadCollisionModal.tsx` | Component has zero detected imports |
| `src/components/dms/preview/DocumentPreview.tsx` | Component has zero detected imports |
| `src/components/dms/preview/PlatformKnowledgePreview.tsx` | Component has zero detected imports |
| `src/components/dms/profile/DocCard.tsx` | Component has zero detected imports |
| `src/components/dms/profile/VersionTimeline.tsx` | Component has zero detected imports |
| `src/components/dms/search/HighlightedText.tsx` | Component has zero detected imports |
| `src/components/dms/views/FilterDetailView.tsx` | Component has zero detected imports |
| `src/components/feasibility/ComparablesTable.tsx` | Component has zero detected imports |
| `src/components/landscaper/AdditionalDataFoundPanel.tsx` | Component has zero detected imports |
| `src/components/landscaper/CalculatedFieldRow.tsx` | Component has zero detected imports |
| `src/components/landscaper/DataTableModal.tsx` | Component has zero detected imports |
| `src/components/landscaper/ExtractionValidation.tsx` | Component has zero detected imports |
| `src/components/landscaper/RentRollUpdateReviewModal.tsx` | Component has zero detected imports |
| `src/components/location-intelligence/AddPointPopover.tsx` | Component has zero detected imports |
| `src/components/location-intelligence/DemographicsPanel.tsx` | Component has zero detected imports |
| `src/components/location-intelligence/LocationMap.tsx` | Component has zero detected imports |
| `src/components/location-intelligence/MapLayerToggle.tsx` | Component has zero detected imports |
| `src/components/map-tab/DrawToolbar.tsx` | Component has zero detected imports |
| `src/components/map-tab/FeatureModal.tsx` | Component has zero detected imports |
| `src/components/map-tab/LayerPanel.tsx` | Component has zero detected imports |
| `src/components/map-tab/MapCanvas.tsx` | Component has zero detected imports |
| `src/components/map/PropertyTabMapWithComps.tsx` | Component has zero detected imports |
| `src/components/market/CompetitiveProjectsPanel.tsx` | Component has zero detected imports |
| `src/components/napkin/SfdPricingPanel.tsx` | Component has zero detected imports |
| `src/components/navigation/ProjectSelectorCard.tsx` | Component has zero detected imports |
| `src/components/operations/DraggableOpexSection.tsx` | Component has zero detected imports |
| `src/components/operations/EGISubtotalBar.tsx` | Component has zero detected imports |
| `src/components/operations/NOITotalBar.tsx` | Component has zero detected imports |
| `src/components/operations/OperatingExpensesSection.tsx` | Component has zero detected imports |
| `src/components/operations/OperatingIncomeCard.tsx` | Component has zero detected imports |
| `src/components/operations/OperatingStatement.tsx` | Component has zero detected imports |
| `src/components/operations/OperationsHeader.tsx` | Component has zero detected imports |
| `src/components/operations/OtherIncomeSection.tsx` | Component has zero detected imports |
| `src/components/operations/SummaryBar.tsx` | Component has zero detected imports |
| `src/components/operations/VacancyDeductionsSection.tsx` | Component has zero detected imports |
| `src/components/operations/ValueAddAccordion.tsx` | Component has zero detected imports |
| `src/components/operations/ValueAddToggle.tsx` | Component has zero detected imports |
| `src/components/projects/InflationRateDisplay.tsx` | Component has zero detected imports |
| `src/components/projects/LifecycleTileNav.tsx` | Component has zero detected imports |
| `src/components/projects/contacts/ProjectContactsSection.tsx` | Component has zero detected imports |
| `src/components/projects/onboarding/NewProjectOnboardingModal.tsx` | Component has zero detected imports |
| `src/components/reports/ExtractionHistoryPanel.tsx` | Component has zero detected imports |
| `src/components/sales/SaleDetailForm.tsx` | Component has zero detected imports |
| `src/components/scenarios/ScenarioChipManager.tsx` | Component has zero detected imports |
| `src/components/scenarios/ScenarioComparison.tsx` | Component has zero detected imports |
| `src/components/shared/AccordionSection.tsx` | Component has zero detected imports |
| `src/components/ui/ModeChip.tsx` | Component has zero detected imports |
| `src/components/ui/alert.tsx` | Component has zero detected imports |
| `src/components/ui/badge.tsx` | Component has zero detected imports |
| `src/components/ui/button.tsx` | Component has zero detected imports |
| `src/components/ui/card.tsx` | Component has zero detected imports |
| `src/components/ui/dialog.tsx` | Component has zero detected imports |
| `src/components/ui/input.tsx` | Component has zero detected imports |
| `src/components/ui/label.tsx` | Component has zero detected imports |
| `src/components/ui/landscape/DataTable.tsx` | Component has zero detected imports |
| `src/components/ui/landscape/StatusChip.tsx` | Component has zero detected imports |
| `src/components/ui/radio-group.tsx` | Component has zero detected imports |
| `src/components/ui/select.tsx` | Component has zero detected imports |
| `src/components/ui/sheet.tsx` | Component has zero detected imports |
| `src/components/ui/table.tsx` | Component has zero detected imports |
| `src/components/ui/tabs.tsx` | Component has zero detected imports |
| `src/components/ui/textarea.tsx` | Component has zero detected imports |
| `src/components/ui/toast.tsx` | Component has zero detected imports |
| `src/components/valuation/DcfSummarySection.tsx` | Component has zero detected imports |
| `src/components/valuation/assumptions/DcfParametersSection.tsx` | Component has zero detected imports |
| `src/components/valuation/assumptions/LandDevCostsSection.tsx` | Component has zero detected imports |
| `src/components/valuation/assumptions/LandDevInflationSection.tsx` | Component has zero detected imports |
| `src/components/valuation/assumptions/LandDevRevenueSection.tsx` | Component has zero detected imports |
| `src/components/valuation/assumptions/ResultsSection.tsx` | Component has zero detected imports |
| `src/components/valuation/income-approach/AssumptionsPanel.tsx` | Component has zero detected imports |
| `src/components/valuation/income-approach/DirectCapView.tsx` | Component has zero detected imports |
| `src/components/valuation/income-approach/ValueTiles.tsx` | Component has zero detected imports |
| `src/app/_archive/parcel-test/page.tsx` | Page route `/_archive/parcel-test` is not in active navigation |
| `src/app/_archive/projects-acquisition/page.tsx` | Page route `/_archive/projects-acquisition` is not in active navigation |
| `src/app/_archive/projects-analysis/market-data/page.tsx` | Page route `/_archive/projects-analysis/market-data` is not in active navigation |
| `src/app/_archive/projects-analysis/page.tsx` | Page route `/_archive/projects-analysis` is not in active navigation |
| `src/app/_archive/projects-analysis/sensitivity/page.tsx` | Page route `/_archive/projects-analysis/sensitivity` is not in active navigation |
| `src/app/_archive/projects-capitalization/operations/page.tsx` | Page route `/_archive/projects-capitalization/operations` is not in active navigation |
| `src/app/_archive/projects-capitalization/waterfall/page.tsx` | Page route `/_archive/projects-capitalization/waterfall` is not in active navigation |
| `src/app/_archive/projects-development/budget/page.tsx` | Page route `/_archive/projects-development/budget` is not in active navigation |
| `src/app/_archive/projects-development/phasing/page.tsx` | Page route `/_archive/projects-development/phasing` is not in active navigation |
| `src/app/_archive/projects-documents-files/page.tsx` | Page route `/_archive/projects-documents-files` is not in active navigation |
| `src/app/_archive/projects-landscaper/page.tsx` | Page route `/_archive/projects-landscaper` is not in active navigation |
| `src/app/_archive/projects-opex-accounts/page.tsx` | Page route `/_archive/projects-opex-accounts` is not in active navigation |
| `src/app/_archive/projects-opex/page.tsx` | Page route `/_archive/projects-opex` is not in active navigation |
| `src/app/_archive/projects-overview/page.tsx` | Page route `/_archive/projects-overview` is not in active navigation |
| `src/app/_archive/projects-planning/budget/page.tsx` | Page route `/_archive/projects-planning/budget` is not in active navigation |
| `src/app/_archive/projects-planning/land-use/page.tsx` | Page route `/_archive/projects-planning/land-use` is not in active navigation |
| `src/app/_archive/projects-planning/market/page.tsx` | Page route `/_archive/projects-planning/market` is not in active navigation |
| `src/app/_archive/projects-results/page.tsx` | Page route `/_archive/projects-results` is not in active navigation |
| `src/app/_archive/projects-sales-marketing/page.tsx` | Page route `/_archive/projects-sales-marketing` is not in active navigation |
| `src/app/_archive/projects-validation/page.tsx` | Page route `/_archive/projects-validation` is not in active navigation |
| `src/app/_archive/projects-valuation-income-approach/income-approach/page.tsx` | Page route `/_archive/projects-valuation-income-approach/income-approach` is not in active navigation |
| `src/app/_archive/projects-valuation/page.tsx` | Page route `/_archive/projects-valuation` is not in active navigation |
| `src/app/_archive/properties/[id]/analysis/page.tsx` | Page route `/_archive/properties/[param]/analysis` is not in active navigation |
| `src/app/_archive/property/[id]/page.tsx` | Page route `/_archive/property/[param]` is not in active navigation |
| `src/app/admin/benchmarks/cost-library/page.tsx` | Page route `/admin/benchmarks/cost-library` is not in active navigation |
| `src/app/admin/changelog/page.tsx` | Page route `/admin/changelog` is not in active navigation |
| `src/app/admin/feedback/page.tsx` | Page route `/admin/feedback` is not in active navigation |
| `src/app/benchmarks/products/page.tsx` | Page route `/benchmarks/products` is not in active navigation |
| `src/app/benchmarks/unit-costs/page.tsx` | Page route `/benchmarks/unit-costs` is not in active navigation |
| `src/app/contacts/page.tsx` | Page route `/contacts` is not in active navigation |
| `src/app/diligence/page.tsx` | Page route `/diligence` is not in active navigation |
| `src/app/forgot-password/page.tsx` | Page route `/forgot-password` is not in active navigation |
| `src/app/ingestion/page.tsx` | Page route `/ingestion` is not in active navigation |
| `src/app/lease/[id]/page.tsx` | Page route `/lease/[param]` is not in active navigation |
| `src/app/onboarding/page.tsx` | Page route `/onboarding` is not in active navigation |
| `src/app/phases/page.tsx` | Page route `/phases` is not in active navigation |
| `src/app/preferences/page.tsx` | Page route `/preferences` is not in active navigation |
| `src/app/projects/[projectId]/budget/page.tsx` | Page route `/projects/[param]/budget` is not in active navigation |
| `src/app/projects/[projectId]/documents/page.tsx` | Page route `/projects/[param]/documents` is not in active navigation |
| `src/app/projects/[projectId]/napkin/page.tsx` | Page route `/projects/[param]/napkin` is not in active navigation |
| `src/app/projects/[projectId]/napkin/waterfall/page.tsx` | Page route `/projects/[param]/napkin/waterfall` is not in active navigation |
| `src/app/projects/[projectId]/settings/page.tsx` | Page route `/projects/[param]/settings` is not in active navigation |
| `src/app/reset-password/page.tsx` | Page route `/reset-password` is not in active navigation |
| `src/app/settings/budget-categories/page.tsx` | Page route `/settings/budget-categories` is not in active navigation |
| `src/app/settings/contact-roles/page.tsx` | Page route `/settings/contact-roles` is not in active navigation |
| `src/app/settings/taxonomy/page.tsx` | Page route `/settings/taxonomy` is not in active navigation |

## ARCHIVE
| File | Reason |
|------|--------|
| `src/components/budget/BudgetItemModalV2.tsx` | Name matches Old/Legacy/Deprecated/V1/V2/Test/Demo pattern |
| `src/components/location-intelligence/DemographicsPanel.tsx` | Name matches Old/Legacy/Deprecated/V1/V2/Test/Demo pattern |

## SKIP (Excluded)
| File / Route | Reason |
|--------------|--------|
| `src/app/components/Archive/PlanningContentGrid.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/components/Archive/PlanningContentHot.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes-multifam/page.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/[prototypeId]/PrototypeNotesClient.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/[prototypeId]/page.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/[prototypeId]/prototype-viewer.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/CategoryCard.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/CategoryPanel.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/DebtFacilityForm.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/DetailedBreakdownTable.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/OperatingExpensesTab.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/TabBar.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/multifam/rent-roll-inputs/page.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/prototypes/page.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/lib/prototypes/loaders.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/prototypes/coreui/LeaseInputPrototype.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/prototypes/coreui/LeaseInputReactPrototype.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/prototypes/remote/CoreUIShellPlaceholder.tsx` | Prototype path or explicitly excluded Archive component area |
| `src/app/admin/dms/templates/page.tsx` (`/admin/dms/templates`) | Listed in Sandbox dropdown exclusion set |
| `src/app/ai-document-review/page.tsx` (`/ai-document-review`) | Listed in Sandbox dropdown exclusion set |
| `src/app/breadcrumb-demo/page.tsx` (`/breadcrumb-demo`) | Listed in Sandbox dropdown exclusion set |
| `src/app/budget-grid-v2/page.tsx` (`/budget-grid-v2`) | Listed in Sandbox dropdown exclusion set |
| `src/app/budget-grid/page.tsx` (`/budget-grid`) | Listed in Sandbox dropdown exclusion set |
| `src/app/db-schema/page.tsx` (`/db-schema`) | Listed in Sandbox dropdown exclusion set |
| `src/app/dev-status/page.tsx` (`/dev-status`) | Listed in Sandbox dropdown exclusion set |
| `src/app/documentation/page.tsx` (`/documentation`) | Listed in Sandbox dropdown exclusion set |
| `src/app/documents/review/page.tsx` (`/documents/review`) | Listed in Sandbox dropdown exclusion set |
| `src/app/gis-simple-test/page.tsx` (`/gis-simple-test`) | Listed in Sandbox dropdown exclusion set |
| `src/app/growthratedetail/page.tsx` (`/growthratedetail`) | Listed in Sandbox dropdown exclusion set |
| `src/app/growthrates-original/page.tsx` (`/growthrates-original`) | Listed in Sandbox dropdown exclusion set |
| `src/app/growthrates/page.tsx` (`/growthrates`) | Listed in Sandbox dropdown exclusion set |
| `src/app/growthratesmanager/page.tsx` (`/growthratesmanager`) | Listed in Sandbox dropdown exclusion set |
| `src/app/inventory/page.tsx` (`/inventory`) | Listed in Sandbox dropdown exclusion set |
| `src/app/map-debug/page.tsx` (`/map-debug`) | Listed in Sandbox dropdown exclusion set |
| `src/app/market-assumptions/page.tsx` (`/market-assumptions`) | Listed in Sandbox dropdown exclusion set |
| `src/app/market/page.tsx` (`/market`) | Listed in Sandbox dropdown exclusion set |
| `src/app/planning/page.tsx` (`/planning`) | Listed in Sandbox dropdown exclusion set |
| `src/app/projects/[projectId]/assumptions/page.tsx` (`/projects/[param]/assumptions`) | Listed in Sandbox dropdown exclusion set |
| `src/app/projects/[projectId]/page.tsx` (`/projects/[param]`) | Listed in Sandbox dropdown exclusion set |
| `src/app/projects/setup/page.tsx` (`/projects/setup`) | Listed in Sandbox dropdown exclusion set |
| `src/app/prototypes-multifam/page.tsx` (`/prototypes-multifam`) | Listed in Sandbox dropdown exclusion set |
| `src/app/prototypes/[prototypeId]/page.tsx` (`/prototypes/[param]`) | Listed in Sandbox dropdown exclusion set |
| `src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx` (`/prototypes/multifam/rent-roll-inputs/content`) | Listed in Sandbox dropdown exclusion set |
| `src/app/prototypes/multifam/rent-roll-inputs/page.tsx` (`/prototypes/multifam/rent-roll-inputs`) | Listed in Sandbox dropdown exclusion set |
| `src/app/prototypes/page.tsx` (`/prototypes`) | Listed in Sandbox dropdown exclusion set |
| `src/app/test-coreui/page.tsx` (`/test-coreui`) | Listed in Sandbox dropdown exclusion set |

## REVIEW
| File | Imported By | Notes |
|------|-------------|-------|
| `src/app/components/AI/DocumentReview.tsx` | `src/app/ai-document-review/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/Admin/CategoryTree.tsx` | `src/app/admin/preferences/components/UnitCostCategoryManager.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/ContainerManagement/ProjectSetupWizard.tsx` | `src/app/projects/setup/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/CoreUIThemeProvider.tsx` | `src/app/layout.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/DVLTimeSeries.tsx` | `src/app/components/MarketAssumptions.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/DevStatus/DevStatus.tsx` | `src/app/dev-status/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/Documentation/MarkdownViewer.tsx` | `src/app/documentation/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/DynamicBreadcrumb.tsx` | `src/app/breadcrumb-demo/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/GIS/PlanNavigation.tsx` | `src/app/components/GIS/GISSetupWorkflow.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/GIS/ProjectBoundarySetup.tsx` | `src/app/components/GIS/GISSetupWorkflow.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/GIS/ProjectDocumentUploads.tsx` | `src/app/components/GIS/GISSetupWorkflow.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/GrowthRates.tsx` | `src/app/growthrates/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/LandUse/InlineTaxonomySelector.tsx` | `src/app/components/PlanningWizard/ProjectCanvas.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/LandUse/LandUseCanvas.tsx` | `src/app/components/LandUse/LandUseSchema.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/LandUse/LandUseDetails.tsx` | `src/app/components/LandUse/LandUseCanvas.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/LandUse/LandUseMatchWizard.tsx` | `src/app/components/LandUse/LandUseSchema.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/LandUse/TaxonomySelector.tsx` | `src/app/components/PlanningWizard/forms/ParcelForm.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/LandscaperChatModal.tsx` | `src/app/_archive/projects-landscaper/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/MapView.tsx` | `src/app/_archive/projects-overview/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/MarketAssumptionsNative.tsx` | `src/app/components/MarketAssumptionsComparison.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/NavigationLayout.tsx` | `src/app/layout.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/Planning/PlanningOverviewControls.tsx` | `src/app/components/Planning/PlanningContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/AddContainerModal.tsx` | `src/app/components/PlanningWizard/ContainerTreeView.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/ContainerTreeView.tsx` | `src/app/components/PlanningWizard/PlanningWizard.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/DraggableContainerNode.tsx` | `src/app/components/PlanningWizard/ContainerTreeView.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/DraggableTile.tsx` | `src/app/components/PlanningWizard/Sidebar.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/ParcelTile.tsx` | `src/app/components/PlanningWizard/PhaseCanvas.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/PhaseCanvas.tsx` | `src/app/components/PlanningWizard/PlanningWizard.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/PhaseCanvasInline.tsx` | `src/app/components/PlanningWizard/PlanningWizardInline.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/ProjectCanvas.tsx` | `src/app/components/PlanningWizard/PlanningWizard.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/ProjectCanvasInline.tsx` | `src/app/components/PlanningWizard/PlanningWizardInline.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/forms/AreaForm.tsx` | `src/app/components/PlanningWizard/PlanningWizardInline.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PlanningWizard/forms/PhaseForm.tsx` | `src/app/components/PlanningWizard/PlanningWizardInline.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/PreferencesContextBar.tsx` | `src/app/preferences/layout.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/ProjectContextBar.tsx` | `src/app/components/Header.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/QueryProvider.tsx` | `src/app/layout.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/Setup/ProjectStructureChoice.tsx` | `src/app/components/GIS/GISSetupWorkflow.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/StyleCatalog/BadgeIntentsSection.tsx` | `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/StyleCatalog/ButtonIntentsSection.tsx` | `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/StyleCatalog/CardHeadersSection.tsx` | `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/StyleCatalog/NavTabsSection.tsx` | `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/StyleCatalog/PropertyTypeTokensSection.tsx` | `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/StyleCatalog/StyleCatalogContent.tsx` | `src/components/admin/PreferencesPanel.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/TaxonomySelector/TaxonomySelector.tsx` | `src/app/components/PlanningWizard/forms/ParcelForm.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/ThemeRegistry.tsx` | `src/app/layout.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/UniversalInventory/UniversalInventoryTable.tsx` | `src/app/inventory/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/assumptions/AssumptionBasket.tsx` | `src/app/projects/[projectId]/assumptions/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/assumptions/HelpTooltip.tsx` | `src/app/components/assumptions/FieldRenderer.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/dashboard/DashboardMap.tsx` | `src/app/dashboard/page.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/shared/Logo.tsx` | `src/app/components/layout/vertical/Navigation.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/shared/ModeDropdown.tsx` | `src/app/components/layout/vertical/NavbarContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/shared/UserDropdown.tsx` | `src/app/components/layout/vertical/NavbarContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/vertical/FooterContent.tsx` | `src/app/components/layout/vertical/Footer.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/vertical/NavToggle.tsx` | `src/app/components/layout/vertical/NavbarContent.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/vertical/NavbarContent.tsx` | `src/app/components/layout/vertical/Navbar.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/layout/vertical/VerticalMenu.tsx` | `src/app/components/layout/vertical/Navigation.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/navigation/UserMenuDropdown.tsx` | `src/app/components/TopNavigationBar.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/new-project/LocationSection.tsx` | `src/app/components/NewProjectModal.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/new-project/ProjectSummaryPreview.tsx` | `src/app/components/new-project/ConfigureSection.tsx` | Single detected import; candidate for consolidation |
| `src/app/components/new-project/PropertyDataSection.tsx` | `src/app/components/NewProjectModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/IssueReporter/IssueReporterContext.tsx` | `src/components/IssueReporter/IssueReporterProvider.tsx` | Single detected import; candidate for consolidation |
| `src/components/IssueReporter/IssueReporterDialog.tsx` | `src/components/IssueReporter/IssueReporterProvider.tsx` | Single detected import; candidate for consolidation |
| `src/components/IssueReporter/IssueReporterProvider.tsx` | `src/app/layout.tsx` | Single detected import; candidate for consolidation |
| `src/components/Onboarding/DocumentUploadModal.tsx` | `src/components/Onboarding/OnboardingChat.tsx` | Single detected import; candidate for consolidation |
| `src/components/Onboarding/OnboardingChat.tsx` | `src/app/onboarding/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/Onboarding/OnboardingSurvey.tsx` | `src/app/onboarding/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/AdminModal.tsx` | `src/app/components/NavigationLayout.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/BenchmarksPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/CostLibraryPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/DMSAdminPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/LandscaperAdminPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/PicklistEditor.tsx` | `src/components/admin/SystemPicklistsAccordion.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/PicklistItemModal.tsx` | `src/components/admin/SystemPicklistsAccordion.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/PreferencesPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/ReportConfiguratorPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/ReportTemplateCard.tsx` | `src/components/admin/ReportConfiguratorPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/admin/UserManagementPanel.tsx` | `src/components/admin/AdminModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/alpha/AlphaAssistantFlyout.tsx` | `src/app/projects/[projectId]/ProjectLayoutClient.tsx` | Single detected import; candidate for consolidation |
| `src/components/alpha/AlphaLandscaperChat.tsx` | `src/components/alpha/AlphaAssistantModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/alpha/FeedbackLog.tsx` | `src/components/alpha/AlphaAssistantFlyout.tsx` | Single detected import; candidate for consolidation |
| `src/components/alpha/HelpContentPanel.tsx` | `src/components/alpha/AlphaAssistantModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/alpha/HelpFeedbackAgent.tsx` | `src/components/alpha/AlphaAssistantFlyout.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/SfCompsTile.tsx` | `src/components/feasibility/MarketDataContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` | `src/app/projects/[projectId]/components/tabs/FeasibilityTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/cashflow/CashFlowSummaryMetrics.tsx` | `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/cashflow/CashFlowTable.tsx` | `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/cashflow/CostGranularityToggle.tsx` | `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/cashflow/TimeScaleSelector.tsx` | `src/components/analysis/cashflow/CashFlowAnalysisTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/shared/CashFlowGrid.tsx` | `src/components/valuation/income-approach/DCFView.tsx` | Single detected import; candidate for consolidation |
| `src/components/analysis/validation/ValidationReport.tsx` | `src/app/_archive/projects-validation/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/AISuggestionsSection.tsx` | `src/components/benchmarks/LandscaperPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx` | `src/app/admin/benchmarks/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/products/ProductLibraryPanel.tsx` | `src/app/benchmarks/products/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx` | `src/app/benchmarks/unit-costs/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/unit-costs/InlineEditableCell.tsx` | `src/app/benchmarks/unit-costs/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx` | `src/app/benchmarks/unit-costs/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx` | `src/app/benchmarks/unit-costs/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | `src/app/admin/benchmarks/cost-library/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/BudgetContainer.tsx` | `src/app/projects/[projectId]/components/tabs/BudgetTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/BudgetDataGrid.tsx` | `src/components/budget/BudgetGridTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/CategoryCascadingDropdown.tsx` | `src/components/budget/BudgetItemModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/CategoryTemplateManager.tsx` | `src/app/settings/budget-categories/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/CreateTemplateModal.tsx` | `src/components/budget/CostCategoriesTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/FiltersAccordion.tsx` | `src/components/budget/BudgetGridTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/IncompleteCategoriesReminder.tsx` | `src/components/budget/BudgetGridTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/QuickAddCategoryModal.tsx` | `src/components/budget/BudgetGridTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/TemplateEditorModal.tsx` | `src/components/budget/CostCategoriesTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/TimelineTab.tsx` | `src/components/budget/BudgetContainer.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/BudgetGridWithTimeline.tsx` | `src/app/projects/[projectId]/project/budget/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/CategoryEditorRow.tsx` | `src/components/budget/BudgetDataGrid.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/ColumnChooser.tsx` | `src/components/budget/custom/BudgetGridWithTimeline.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/EditableCell.tsx` | `src/components/budget/ColumnDefinitions.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/ExpandableDetailsRow.tsx` | `src/components/budget/BudgetDataGrid.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/GroupRow.tsx` | `src/components/budget/BudgetDataGrid.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/PhaseCell.tsx` | `src/components/budget/ColumnDefinitions.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/custom/TimelineChart.tsx` | `src/components/budget/custom/BudgetGridWithTimeline.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/tiles/CostControlsTile.tsx` | `src/components/budget/custom/ExpandableDetailsRow.tsx` | Single detected import; candidate for consolidation |
| `src/components/budget/tiles/TimingEscalationTile.tsx` | `src/components/budget/custom/ExpandableDetailsRow.tsx` | Single detected import; candidate for consolidation |
| `src/components/capitalization/LeveragedCashFlow.tsx` | `src/app/projects/[projectId]/capitalization/debt/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/capitalization/LoanCard.tsx` | `src/app/projects/[projectId]/capitalization/debt/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/capitalization/PendingRenoOffsetModal.tsx` | `src/components/capitalization/LeveragedCashFlow.tsx` | Single detected import; candidate for consolidation |
| `src/components/changelog/ChangelogModal.tsx` | `src/components/changelog/VersionBadge.tsx` | Single detected import; candidate for consolidation |
| `src/components/contacts/ContactDetailPanel.tsx` | `src/app/contacts/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/contacts/ContactModal.tsx` | `src/app/contacts/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dashboard/CompletenessModal.tsx` | `src/components/dashboard/ProjectTable.tsx` | Single detected import; candidate for consolidation |
| `src/components/diligence/DiligenceBlocks.tsx` | `src/app/diligence/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/MediaBadgeChips.tsx` | `src/components/dms/filters/AccordionFilters.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/ProjectMediaGallery.tsx` | `src/app/projects/[projectId]/components/tabs/DocumentsTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/filters/DocTypeFilters.tsx` | `src/app/dms/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/filters/ProjectSelector.tsx` | `src/app/dms/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/list/ColumnChooser.tsx` | `src/components/budget/custom/BudgetGridWithTimeline.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/list/DocumentAccordion.tsx` | `src/components/dms/list/DocumentTable.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/list/DocumentTable.tsx` | `src/app/dms/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/list/PlatformKnowledgeAccordion.tsx` | `src/components/dms/list/PlatformKnowledgeTable.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/list/PlatformKnowledgeTable.tsx` | `src/app/dms/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/panels/DmsLandscaperPanel.tsx` | `src/app/dms/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/profile/PlatformKnowledgeProfileForm.tsx` | `src/components/dms/preview/PlatformKnowledgePreview.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/profile/TagInput.tsx` | `src/components/dms/profile/ProfileForm.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/search/Facets.tsx` | `src/app/components/Documents/DocumentManagement.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/search/ResultsTable.tsx` | `src/app/components/Documents/DocumentManagement.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/search/SearchBox.tsx` | `src/app/components/Documents/DocumentManagement.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/shared/DMSLayout.tsx` | `src/app/dms/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/dms/upload/Queue.tsx` | `src/app/components/Documents/DocumentManagement.tsx` | Single detected import; candidate for consolidation |
| `src/components/documents/CorrectionModal.tsx` | `src/app/documents/review/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/feasibility/ComparableModal.tsx` | `src/components/feasibility/MarketDataContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/feasibility/MarketDataContent.tsx` | `src/app/_archive/projects-analysis/market-data/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/feasibility/SensitivityAnalysisContent.tsx` | `src/app/_archive/projects-analysis/sensitivity/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/ingestion/DocumentCard.tsx` | `src/components/ingestion/DocumentIngestion.tsx` | Single detected import; candidate for consolidation |
| `src/components/ingestion/DocumentIngestion.tsx` | `src/app/ingestion/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/ingestion/IngestionChat.tsx` | `src/components/ingestion/DocumentIngestion.tsx` | Single detected import; candidate for consolidation |
| `src/components/ingestion/MilestoneBar.tsx` | `src/components/ingestion/DocumentIngestion.tsx` | Single detected import; candidate for consolidation |
| `src/components/ingestion/PropertyOverview.tsx` | `src/components/ingestion/DocumentIngestion.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/ActivityFeedItem.tsx` | `src/components/landscaper/ActivityFeed.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/AdviceAdherencePanel.tsx` | `src/app/components/LandscaperChatModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/ChatInterface.tsx` | `src/app/components/LandscaperChatModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/CreateDynamicColumnModal.tsx` | `src/components/landscaper/FieldMappingInterface.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/ExtractionFieldRow.tsx` | `src/components/landscaper/ExtractionReviewModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/ExtractionReviewModal.tsx` | `src/components/landscaper/LandscaperPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/FieldMappingInterface.tsx` | `src/components/landscaper/LandscaperPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/LandscaperChat.tsx` | `src/app/dashboard/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/LandscaperChatThreaded.tsx` | `src/components/landscaper/LandscaperPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/MediaSummaryCard.tsx` | `src/components/landscaper/ChatMessageBubble.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/MutationProposalCard.tsx` | `src/components/landscaper/ChatMessageBubble.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/ThreadList.tsx` | `src/components/landscaper/LandscaperChatThreaded.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/UnitMixAccordion.tsx` | `src/components/landscaper/ExtractionReviewModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/landscaper/VarianceItem.tsx` | `src/components/landscaper/AdviceAdherencePanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/map-tab/LeafletGISView.tsx` | `src/components/map-tab/MapTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/map-tab/MapTab.tsx` | `src/app/projects/[projectId]/ProjectContentRouter.tsx` | Single detected import; candidate for consolidation |
| `src/components/map/ValuationSalesCompMap.tsx` | `src/app/projects/[projectId]/valuation/components/SalesComparisonApproach.tsx` | Single detected import; candidate for consolidation |
| `src/components/market/AddCompetitorModal.tsx` | `src/components/market/CompetitiveProjectsPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/CommercialPanel.tsx` | `src/components/napkin/NapkinAnalysisPage.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/CompDetailsSection.tsx` | `src/components/napkin/NapkinSfdPricing.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/InfrastructurePanel.tsx` | `src/components/napkin/NapkinAnalysisPage.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/MdrPanel.tsx` | `src/components/napkin/NapkinAnalysisPage.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/NapkinAnalysisPage.tsx` | `src/app/projects/[projectId]/napkin/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/NapkinAttachedPricing.tsx` | `src/components/napkin/NapkinAnalysisPage.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/PromoteModal.tsx` | `src/components/napkin/NapkinAnalysisPage.tsx` | Single detected import; candidate for consolidation |
| `src/components/napkin/RlvSummaryCard.tsx` | `src/components/napkin/NapkinAnalysisPage.tsx` | Single detected import; candidate for consolidation |
| `src/components/navigation/FolderTabs.tsx` | `src/app/projects/[projectId]/ProjectLayoutClient.tsx` | Single detected import; candidate for consolidation |
| `src/components/operations/InventoryStatsPanel.tsx` | `src/app/components/OpExHierarchy.tsx` | Single detected import; candidate for consolidation |
| `src/components/operations/ItemNameEditor.tsx` | `src/components/operations/OperatingStatement.tsx` | Single detected import; candidate for consolidation |
| `src/components/operations/OpExModeSelector.tsx` | `src/app/components/OpExHierarchy.tsx` | Single detected import; candidate for consolidation |
| `src/components/operations/RentalIncomeSection.tsx` | `src/app/projects/[projectId]/components/tabs/RenovationSubTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/operations/ValueAddCard.tsx` | `src/app/projects/[projectId]/components/tabs/RenovationSubTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/phases/PhaseTransition.tsx` | `src/app/phases/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/GranularityIndicators.tsx` | `src/app/projects/[projectId]/project/summary/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/MilestoneTimeline.tsx` | `src/app/projects/[projectId]/project/summary/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/ProfileField.tsx` | `src/components/project/ProjectProfileTile.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/ProjectDates.tsx` | `src/app/projects/[projectId]/settings/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/ProjectLandUseLabels.tsx` | `src/app/projects/[projectId]/settings/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/ProjectPhotosModal.tsx` | `src/components/project/ProjectProfileTile.tsx` | Single detected import; candidate for consolidation |
| `src/components/project/ProjectProfileTile.tsx` | `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/contacts/AddContactModal.tsx` | `src/components/projects/contacts/ContactsSection.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/contacts/ContactCard.tsx` | `src/components/projects/contacts/ContactRoleCard.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/contacts/ContactRoleCard.tsx` | `src/components/projects/contacts/ContactsSection.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/contacts/ContactsSection.tsx` | `src/app/projects/[projectId]/components/tabs/ProjectTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/onboarding/ModelReadinessDisplay.tsx` | `src/components/projects/onboarding/NewProjectChannelTabs.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/onboarding/NewProjectChannelTabs.tsx` | `src/components/projects/onboarding/NewProjectOnboardingModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/onboarding/NewProjectChat.tsx` | `src/components/projects/onboarding/NewProjectOnboardingModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/onboarding/NewProjectFieldTable.tsx` | `src/components/projects/onboarding/NewProjectOnboardingModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/projects/onboarding/SimplifiedChannelView.tsx` | `src/components/projects/onboarding/NewProjectChannelTabs.tsx` | Single detected import; candidate for consolidation |
| `src/components/property/CompetitiveMarketCharts.tsx` | `src/app/projects/[projectId]/components/tabs/PropertyTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/reports/ExtractionFilterPills.tsx` | `src/components/reports/ExtractionHistoryReport.tsx` | Single detected import; candidate for consolidation |
| `src/components/reports/ExtractionHistoryReport.tsx` | `src/app/projects/[projectId]/components/tabs/ReportsTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/AnnualInventoryGauge.tsx` | `src/components/sales/SalesContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/CreateSalePhaseModal.tsx` | `src/components/sales/ParcelSalesTable.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/FilterSidebar.tsx` | `src/components/sales/SaleTransactionDetails.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/ParcelSalesTable.tsx` | `src/components/sales/SalesContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/PhaseTiles.tsx` | `src/components/sales/SalesContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/PricingTable.tsx` | `src/components/sales/SalesContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/SaleCalculationModal.tsx` | `src/components/sales/ParcelSalesTable.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/SaleTransactionDetails.tsx` | `src/components/sales/SalesContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/SaveBenchmarkModal.tsx` | `src/components/sales/SaleCalculationModal.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/TransactionColumn.tsx` | `src/components/sales/TransactionGrid.tsx` | Single detected import; candidate for consolidation |
| `src/components/sales/TransactionGrid.tsx` | `src/components/sales/SaleTransactionDetails.tsx` | Single detected import; candidate for consolidation |
| `src/components/shared/AreaTiles.tsx` | `src/components/sales/SalesContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/taxonomy/FamilyDetails.tsx` | `src/app/settings/taxonomy/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/taxonomy/FamilyTree.tsx` | `src/app/settings/taxonomy/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/taxonomy/ProductsList.tsx` | `src/app/settings/taxonomy/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/ui/DropZoneWrapper.tsx` | `src/app/projects/[projectId]/ProjectLayoutClient.tsx` | Single detected import; candidate for consolidation |
| `src/components/ui/PageHeader.tsx` | `src/app/prototypes/multifam/rent-roll-inputs/page.tsx` | Single detected import; candidate for consolidation |
| `src/components/ui/SemanticCategoryChip.tsx` | `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/ui/landscape/SemanticCategoryChip.tsx` | `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx` | Single detected import; candidate for consolidation |
| `src/components/valuation/PendingRenoOffsetModal.tsx` | `src/components/capitalization/LeveragedCashFlow.tsx` | Single detected import; candidate for consolidation |
| `src/components/valuation/UnifiedAssumptionsPanel.tsx` | `src/app/projects/[projectId]/components/tabs/FeasibilityTab.tsx` | Single detected import; candidate for consolidation |
| `src/components/valuation/income-approach/DCFView.tsx` | `src/app/projects/[projectId]/components/tabs/IncomeApproachContent.tsx` | Single detected import; candidate for consolidation |
| `src/components/valuation/income-approach/SensitivityMatrix.tsx` | `src/components/valuation/income-approach/DirectCapView.tsx` | Single detected import; candidate for consolidation |

### Potential Duplicate Families
- Modal variants:
  - `src/app/admin/preferences/components/AddCategoryModal.tsx`
  - `src/app/admin/preferences/components/CreateTagModal.tsx`
  - `src/app/admin/preferences/components/DeleteConfirmationModal.tsx`
  - `src/app/admin/preferences/components/DeleteUOMModal.tsx`
  - `src/app/admin/users/components/UserModals.tsx`
  - `src/app/components/LandscaperChatModal.tsx`
  - `src/app/components/NewProjectModal.tsx`
  - `src/app/components/PlanningWizard/AddContainerModal.tsx`
  - `src/app/components/dashboard/TriageModal.tsx`
  - `src/app/projects/[projectId]/components/landscaper/AgentModal.tsx`
  - `src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx`
  - `src/app/projects/[projectId]/valuation/components/SalesCompDetailModal.tsx`
  - `src/components/Onboarding/DocumentUploadModal.tsx`
  - `src/components/admin/AdminModal.tsx`
  - `src/components/admin/PicklistItemModal.tsx`
  - `src/components/admin/ReportTemplateEditorModal.tsx`
  - `src/components/alpha/AlphaAssistantModal.tsx`
  - `src/components/benchmarks/AddBenchmarkModal.tsx`
  - `src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx`
  - `src/components/budget/BudgetItemModal.tsx`
  - `src/components/budget/BudgetItemModalV2.tsx`
  - `src/components/budget/CreateTemplateModal.tsx`
  - `src/components/budget/GanttEditModal.tsx`
  - `src/components/budget/QuickAddCategoryModal.tsx`
  - `src/components/budget/ReconciliationModal.tsx`
  - `src/components/budget/TemplateEditorModal.tsx`
  - `src/components/budget/VarianceAlertModal.tsx`
  - `src/components/capitalization/DebtFacilityModal.tsx`
  - `src/components/capitalization/DeveloperFeeModal.tsx`
  - `src/components/capitalization/LoanBudgetModal.tsx`
  - `src/components/capitalization/LoanScheduleModal.tsx`
  - `src/components/capitalization/OverheadItemModal.tsx`
  - `src/components/capitalization/PendingRenoOffsetModal.tsx`
  - `src/components/changelog/ChangelogModal.tsx`
  - `src/components/contacts/ContactModal.tsx`
  - `src/components/dashboard/CompletenessModal.tsx`
  - `src/components/dms/modals/DeleteConfirmModal.tsx`
  - `src/components/dms/modals/DocumentChatModal.tsx`
  - `src/components/dms/modals/MediaPickerModal.tsx`
  - `src/components/dms/modals/MediaPreviewModal.tsx`
  - `src/components/dms/modals/PlatformKnowledgeChatModal.tsx`
  - `src/components/dms/modals/PlatformKnowledgeModal.tsx`
  - `src/components/dms/modals/RenameModal.tsx`
  - `src/components/dms/modals/UploadCollisionModal.tsx`
  - `src/components/documents/CorrectionModal.tsx`
  - `src/components/extraction/StagingModal.tsx`
  - `src/components/feasibility/ComparableModal.tsx`
  - `src/components/landscaper/CreateDynamicColumnModal.tsx`
  - `src/components/landscaper/DataTableModal.tsx`
  - `src/components/landscaper/ExtractionReviewModal.tsx`
  - `src/components/landscaper/RentRollUpdateReviewModal.tsx`
  - `src/components/map-tab/FeatureModal.tsx`
  - `src/components/market/AddCompetitorModal.tsx`
  - `src/components/napkin/PromoteModal.tsx`
  - `src/components/project/ProjectPhotosModal.tsx`
  - `src/components/project/ProjectProfileEditModal.tsx`
  - `src/components/projects/contacts/AddContactModal.tsx`
  - `src/components/projects/onboarding/NewProjectOnboardingModal.tsx`
  - `src/components/sales/CreateSalePhaseModal.tsx`
  - `src/components/sales/SaleCalculationModal.tsx`
  - `src/components/sales/SaveBenchmarkModal.tsx`
  - `src/components/valuation/PendingRenoOffsetModal.tsx`
- Panel variants:
  - `src/app/admin/preferences/components/CategoryDetailPanel.tsx`
  - `src/app/components/DependencyConfigPanel.tsx`
  - `src/app/components/new-project/LandscaperPanel.tsx`
  - `src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx`
  - `src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx`
  - `src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx`
  - `src/app/projects/[projectId]/valuation/components/SalesComparisonPanel.tsx`
  - `src/components/admin/BenchmarksPanel.tsx`
  - `src/components/admin/CostLibraryPanel.tsx`
  - `src/components/admin/DMSAdminPanel.tsx`
  - `src/components/admin/LandscaperAdminPanel.tsx`
  - `src/components/admin/PreferencesPanel.tsx`
  - `src/components/admin/ReportConfiguratorPanel.tsx`
  - `src/components/admin/UserManagementPanel.tsx`
  - `src/components/alpha/HelpContentPanel.tsx`
  - `src/components/benchmarks/GrowthRateCategoryPanel.tsx`
  - `src/components/benchmarks/LandscaperPanel.tsx`
  - `src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx`
  - `src/components/benchmarks/products/ProductLibraryPanel.tsx`
  - `src/components/benchmarks/unit-costs/UnitCostsPanel.tsx`
  - `src/components/contacts/ContactDetailPanel.tsx`
  - `src/components/dms/panels/DmsLandscaperPanel.tsx`
  - `src/components/dms/views/DocumentPreviewPanel.tsx`
  - `src/components/landscaper/AdditionalDataFoundPanel.tsx`
  - `src/components/landscaper/AdviceAdherencePanel.tsx`
  - `src/components/landscaper/LandscaperPanel.tsx`
  - `src/components/location-intelligence/DemographicsPanel.tsx`
  - `src/components/map-tab/LayerPanel.tsx`
  - `src/components/market/CompetitiveProjectsPanel.tsx`
  - `src/components/napkin/CommercialPanel.tsx`
  - `src/components/napkin/InfrastructurePanel.tsx`
  - `src/components/napkin/LandscaperPanel.tsx`
  - `src/components/napkin/MdrPanel.tsx`
  - `src/components/napkin/SfdPricingPanel.tsx`
  - `src/components/operations/InventoryStatsPanel.tsx`
  - `src/components/reports/ExtractionHistoryPanel.tsx`
  - `src/components/valuation/UnifiedAssumptionsPanel.tsx`
  - `src/components/valuation/income-approach/AssumptionsPanel.tsx`
- Table variants:
  - `src/app/admin/preferences/components/UOMTable.tsx`
  - `src/app/components/Admin/LandUseInputTable.tsx`
  - `src/app/components/Admin/LandUseInputTableTanStack.tsx`
  - `src/app/components/UniversalInventory/UniversalInventoryTable.tsx`
  - `src/components/admin/ColorTableRow.tsx`
  - `src/components/analysis/cashflow/CashFlowPhaseTable.tsx`
  - `src/components/analysis/cashflow/CashFlowTable.tsx`
  - `src/components/budget/BasicBudgetTable.tsx`
  - `src/components/capitalization/DebtFacilitiesTable.tsx`
  - `src/components/capitalization/DeveloperFeesTable.tsx`
  - `src/components/capitalization/DrawScheduleTable.tsx`
  - `src/components/capitalization/EquityPartnersTable.tsx`
  - `src/components/capitalization/ManagementOverheadTable.tsx`
  - `src/components/capitalization/WaterfallDistributionTable.tsx`
  - `src/components/capitalization/WaterfallStructureTable.tsx`
  - `src/components/dashboard/ProjectTable.tsx`
  - `src/components/dms/list/DocumentTable.tsx`
  - `src/components/dms/list/PlatformKnowledgeTable.tsx`
  - `src/components/dms/search/ResultsTable.tsx`
  - `src/components/feasibility/ComparablesTable.tsx`
  - `src/components/landscaper/DataTableModal.tsx`
  - `src/components/projects/onboarding/NewProjectFieldTable.tsx`
  - `src/components/sales/ParcelSalesTable.tsx`
  - `src/components/sales/PricingTable.tsx`
  - `src/components/ui/landscape/DataTable.tsx`
- Grid variants:
  - `src/app/components/Archive/PlanningContentGrid.tsx`
  - `src/app/components/Budget/BudgetGrid.tsx`
  - `src/app/components/Budget/BudgetGridDark.tsx`
  - `src/app/components/Budget/BudgetGridDarkWrapper.tsx`
  - `src/app/components/Budget/BudgetGridLight.tsx`
  - `src/app/components/BudgetGridWithDependencies.tsx`
  - `src/app/lease/components/MetricsGrid.tsx`
  - `src/app/projects/[projectId]/valuation/components/ComparablesGrid.old2.tsx`
  - `src/app/projects/[projectId]/valuation/components/ComparablesGrid.tsx`
  - `src/app/rent-roll/components/FloorplansGrid.tsx`
  - `src/app/rent-roll/components/RentRollGrid.tsx`
  - `src/components/acquisition/AcquisitionLedgerGrid.tsx`
  - `src/components/analysis/shared/CashFlowGrid.tsx`
  - `src/components/budget/BudgetDataGrid.tsx`
  - `src/components/budget/BudgetGanttGrid.tsx`
  - `src/components/budget/BudgetGridTab.tsx`
  - `src/components/budget/SimpleBudgetGrid.tsx`
  - `src/components/budget/custom/BudgetGridWithTimeline.tsx`
  - `src/components/budget/custom/DataGrid.tsx`
  - `src/components/capitalization/LoanScheduleGrid.tsx`
  - `src/components/sales/TransactionGrid.tsx`
- Card variants:
  - `src/app/components/PlanningWizard/cards/AreaDetailCard.tsx`
  - `src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx`
  - `src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx`
  - `src/app/components/StyleCatalog/CardHeadersSection.tsx`
  - `src/app/components/new-project/PathCard.tsx`
  - `src/app/projects/[projectId]/components/landscaper/Card.tsx`
  - `src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx`
  - `src/app/projects/[projectId]/components/landscaper/StatusCard.tsx`
  - `src/app/projects/[projectId]/components/tabs/LocationIntelligenceCard.tsx`
  - `src/app/projects/[projectId]/valuation/components/ComparableCard.tsx`
  - `src/components/acquisition/AcquisitionHeaderCard.tsx`
  - `src/components/admin/ReportTemplateCard.tsx`
  - `src/components/capitalization/LoanCard.tsx`
  - `src/components/capitalization/MetricCard.tsx`
  - `src/components/capitalization/PartnerSummaryCards.tsx`
  - `src/components/dms/modals/MediaCard.tsx`
  - `src/components/dms/profile/DocCard.tsx`
  - `src/components/ingestion/DocumentCard.tsx`
  - `src/components/landscaper/MediaSummaryCard.tsx`
  - `src/components/landscaper/MutationProposalCard.tsx`
  - `src/components/napkin/RlvSummaryCard.tsx`
  - `src/components/navigation/ProjectSelectorCard.tsx`
  - `src/components/operations/OperatingIncomeCard.tsx`
  - `src/components/operations/SectionCard.tsx`
  - `src/components/operations/ValueAddCard.tsx`
  - `src/components/project/MetricCard.tsx`
  - `src/components/projects/contacts/ContactCard.tsx`
  - `src/components/projects/contacts/ContactRoleCard.tsx`

### High Comment Ratio (>20%)
| File | Ratio | Comment Lines |
|------|-------|---------------|
| `src/components/budget/custom/DataGrid.tsx` | 50% | 1/2 |

## ACTIVE (Migrate to CoreUI)
| File | Import Count |
|------|--------------|
| `src/components/ui/landscape/SemanticButton.tsx` | 61 |
| `src/app/components/Link.tsx` | 26 |
| `src/components/ui/landscape/SemanticBadge.tsx` | 23 |
| `src/components/ui/landscape/LandscapeButton.tsx` | 21 |
| `src/components/admin/ExportButton.tsx` | 12 |
| `src/app/components/Planning/CollapsibleSection.tsx` | 7 |
| `src/components/operations/InputCell.tsx` | 7 |
| `src/components/icons/LandscaperIcon.tsx` | 6 |
| `src/components/map/ProjectTabMap.tsx` | 6 |
| `src/components/operations/DetailSummaryToggle.tsx` | 6 |
| `src/components/operations/SectionCard.tsx` | 6 |
| `src/components/ui/landscape/PropertyTypeBadge.tsx` | 6 |
| `src/app/components/Navigation.tsx` | 5 |
| `src/app/components/ProjectProvider.tsx` | 5 |
| `src/app/components/layout/vertical/Navigation.tsx` | 5 |
| `src/app/components/new-project/Badge.tsx` | 5 |
| `src/components/dms/modals/DeleteConfirmModal.tsx` | 5 |
| `src/components/operations/AddButton.tsx` | 5 |
| `src/components/project/ProjectSubNav.tsx` | 5 |
| `src/app/components/AdminNavBar.tsx` | 4 |
| `src/app/components/MarketAssumptions.tsx` | 4 |
| `src/app/components/NewProjectModal.tsx` | 4 |
| `src/app/components/Planning/PlanningContent.tsx` | 4 |
| `src/app/components/PlanningWizard/DropZone.tsx` | 4 |
| `src/components/auth/ProtectedRoute.tsx` | 4 |
| `src/components/budget/BudgetGridTab.tsx` | 4 |
| `src/components/changelog/VersionBadge.tsx` | 4 |
| `src/components/dms/DMSView.tsx` | 4 |
| `src/components/dms/modals/RenameModal.tsx` | 4 |
| `src/components/landscaper/ChatMessageBubble.tsx` | 4 |
| `src/components/map/MapOblique.tsx` | 4 |
| `src/app/components/Market/MarketAssumptions.tsx` | 3 |
| `src/app/components/new-project/LandscaperPanel.tsx` | 3 |
| `src/components/acquisition/AcquisitionLedgerGrid.tsx` | 3 |
| `src/components/benchmarks/LandscaperPanel.tsx` | 3 |
| `src/components/budget/CategoryTreeManager.tsx` | 3 |
| `src/components/budget/custom/DataGrid.tsx` | 3 |
| `src/components/capitalization/MetricCard.tsx` | 3 |
| `src/components/dms/modals/MediaPickerModal.tsx` | 3 |
| `src/components/dms/profile/ProfileForm.tsx` | 3 |
| `src/components/landscaper/ActivityFeed.tsx` | 3 |
| `src/components/landscaper/LandscaperPanel.tsx` | 3 |
| `src/components/landscaper/LandscaperProgress.tsx` | 3 |
| `src/components/napkin/LandscaperPanel.tsx` | 3 |
| `src/components/napkin/NapkinSfdPricing.tsx` | 3 |
| `src/components/operations/EvidenceCell.tsx` | 3 |
| `src/components/project/ActivityFeed.tsx` | 3 |
| `src/components/project/MetricCard.tsx` | 3 |
| `src/components/project/ProjectProfileEditModal.tsx` | 3 |
| `src/components/sales/SalesContent.tsx` | 3 |
| `src/components/valuation/assumptions/GrowthRateSelect.tsx` | 3 |
| `src/app/components/Budget/BudgetGrid.tsx` | 2 |
| `src/app/components/Budget/BudgetGridDark.tsx` | 2 |
| `src/app/components/Header.tsx` | 2 |
| `src/app/components/LandUse/SimpleTaxonomySelector.tsx` | 2 |
| `src/app/components/MapLibre/GISMap.tsx` | 2 |
| `src/app/components/Market/MarketMapView.tsx` | 2 |
| `src/app/components/OpExHierarchy.tsx` | 2 |
| `src/app/components/PlanningWizard/NavigationTiles.tsx` | 2 |
| `src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx` | 2 |
| `src/app/components/PlanningWizard/forms/ParcelForm.tsx` | 2 |
| `src/app/components/ThemeToggle.tsx` | 2 |
| `src/app/components/TopNavigationBar.tsx` | 2 |
| `src/app/components/assumptions/FieldGroup.tsx` | 2 |
| `src/app/components/assumptions/FieldRenderer.tsx` | 2 |
| `src/app/components/dashboard/TriageModal.tsx` | 2 |
| `src/app/components/theme/ModeChanger.tsx` | 2 |
| `src/components/admin/ReportTemplateEditorModal.tsx` | 2 |
| `src/components/benchmarks/AddBenchmarkModal.tsx` | 2 |
| `src/components/benchmarks/BenchmarkAccordion.tsx` | 2 |
| `src/components/benchmarks/GrowthRateCategoryPanel.tsx` | 2 |
| `src/components/budget/custom/ColoredDotIndicator.tsx` | 2 |
| `src/components/budget/fields/FieldRenderer.tsx` | 2 |
| `src/components/capitalization/LoanBudgetModal.tsx` | 2 |
| `src/components/capitalization/LoanScheduleGrid.tsx` | 2 |
| `src/components/capitalization/NapkinWaterfallForm.tsx` | 2 |
| `src/components/common/UOMSelect.tsx` | 2 |
| `src/components/contacts/ContactTypeahead.tsx` | 2 |
| `src/components/dashboard/CompletenessBar.tsx` | 2 |
| `src/components/dms/modals/DocumentChatModal.tsx` | 2 |
| `src/components/dms/modals/MediaPreviewModal.tsx` | 2 |
| `src/components/dms/upload/Dropzone.tsx` | 2 |
| `src/components/dms/views/DocumentPreviewPanel.tsx` | 2 |
| `src/components/extraction/StagingModal.tsx` | 2 |
| `src/components/feasibility/FeasibilitySubNav.tsx` | 2 |
| `src/components/landscaper/CollapsedLandscaperStrip.tsx` | 2 |
| `src/components/napkin/NapkinCompsMap.tsx` | 2 |
| `src/components/operations/GrowthBadge.tsx` | 2 |
| `src/components/projects/onboarding/NewProjectDropZone.tsx` | 2 |
| `src/components/reports/PropertySummaryView.tsx` | 2 |
| `src/components/shared/EntityMediaDisplay.tsx` | 2 |
| `src/components/shared/ModeToggle.tsx` | 2 |

# Component Styling Audit Results

Generated: Wed Jan 21 10:55:32 MST 2026

## SECTION 1: COMPONENT DISCOVERY

### src/components (main shared components)
src/components/DebugMount.tsx
src/components/IssueReporter/IssueReporterButton.tsx
src/components/IssueReporter/IssueReporterContext.tsx
src/components/IssueReporter/IssueReporterDialog.tsx
src/components/IssueReporter/IssueReporterProvider.tsx
src/components/acquisition/AcquisitionAccordion.tsx
src/components/acquisition/AcquisitionHeaderCard.tsx
src/components/acquisition/AcquisitionLedgerGrid.tsx
src/components/acquisition/AcquisitionReconciliation.tsx
src/components/acquisition/NapkinAcquisitionAccordion.tsx
src/components/admin/AdminModal.tsx
src/components/admin/BenchmarksPanel.tsx
src/components/admin/CostLibraryPanel.tsx
src/components/admin/DMSAdminPanel.tsx
src/components/admin/ExportButton.tsx
src/components/admin/ExtractionMappingAdmin.tsx
src/components/admin/LandscaperAdminPanel.tsx
src/components/admin/PicklistEditor.tsx
src/components/admin/PicklistItemModal.tsx
src/components/admin/PreferencesPanel.tsx
src/components/admin/ReportConfiguratorPanel.tsx
src/components/admin/ReportTemplateCard.tsx
src/components/admin/ReportTemplateEditorModal.tsx
src/components/admin/SystemPicklistsAccordion.tsx
src/components/admin/UserManagementPanel.tsx
src/components/analysis/SfCompsTile.tsx
src/components/analysis/cashflow/CashFlowAnalysisTab.tsx
src/components/analysis/cashflow/CashFlowPhaseTable.tsx
src/components/analysis/cashflow/CashFlowSummaryMetrics.tsx
src/components/analysis/cashflow/CashFlowTable.tsx
src/components/analysis/cashflow/CostGranularityToggle.tsx
src/components/analysis/cashflow/TimeScaleSelector.tsx
src/components/analysis/validation/ValidationReport.tsx
src/components/auth/ProtectedRoute.tsx
src/components/benchmarks/AISuggestionsSection.tsx
src/components/benchmarks/AddBenchmarkModal.tsx
src/components/benchmarks/BenchmarkAccordion.tsx
src/components/benchmarks/BenchmarksFlyout.tsx
src/components/benchmarks/GrowthRateCategoryPanel.tsx
src/components/benchmarks/GrowthRateStepEditor.tsx
src/components/benchmarks/GrowthRateWizard.tsx
src/components/benchmarks/LandscaperPanel.tsx
src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx
src/components/benchmarks/products/ProductLibraryPanel.tsx
src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx
src/components/benchmarks/unit-costs/InlineEditableCell.tsx
src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx
src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx
src/components/benchmarks/unit-costs/UnitCostsPanel.tsx
src/components/budget/BasicBudgetTable.tsx
src/components/budget/BudgetContainer.tsx
src/components/budget/BudgetDataGrid.tsx
src/components/budget/BudgetGanttGrid.tsx
src/components/budget/BudgetGridTab.tsx
src/components/budget/BudgetHealthWidget.tsx
src/components/budget/BudgetItemModal.tsx
src/components/budget/BudgetItemModalV2.tsx
src/components/budget/CategoryCascadingDropdown.tsx
src/components/budget/CategoryTemplateManager.tsx
src/components/budget/CategoryTreeManager.tsx
src/components/budget/ColumnDefinitions.tsx
src/components/budget/CostCategoriesTab.tsx
src/components/budget/CreateTemplateModal.tsx
src/components/budget/CustomColumns.tsx
src/components/budget/EditConfirmationDialog.tsx
src/components/budget/FiltersAccordion.tsx
src/components/budget/GanttChart.tsx
src/components/budget/GanttEditModal.tsx
src/components/budget/IncompleteCategoriesReminder.tsx
src/components/budget/ModeSelector.tsx
src/components/budget/QuickAddCategoryModal.tsx
src/components/budget/ReconciliationModal.tsx
src/components/budget/SimpleBudgetGrid.tsx
src/components/budget/TemplateEditorModal.tsx
src/components/budget/TimelineChartPeriods.tsx
src/components/budget/TimelineTab.tsx
src/components/budget/VarianceAlertModal.tsx
src/components/budget/VarianceWarningBadge.tsx
src/components/budget/custom/BudgetGridWithTimeline.tsx
src/components/budget/custom/CategoryEditorRow.tsx
src/components/budget/custom/ColoredDotIndicator.tsx
src/components/budget/custom/ColumnChooser.tsx
src/components/budget/custom/DataGrid.tsx
src/components/budget/custom/EditableCategoryCell.tsx
src/components/budget/custom/EditableCell.tsx
src/components/budget/custom/ExpandableDetailsRow.tsx
src/components/budget/custom/GroupRow.tsx
src/components/budget/custom/PhaseCell.tsx
src/components/budget/custom/TimelineChart.tsx
src/components/budget/fields/FieldRenderer.tsx
src/components/budget/tiles/CostControlsTile.tsx
src/components/budget/tiles/TimingEscalationTile.tsx
src/components/capitalization/CapitalizationSubNav.tsx
src/components/capitalization/DebtFacilitiesTable.tsx
src/components/capitalization/DebtFacilityModal.tsx
src/components/capitalization/DeveloperFeeModal.tsx
src/components/capitalization/DeveloperFeesTable.tsx
src/components/capitalization/DrawScheduleTable.tsx
src/components/capitalization/EquityPartnersTable.tsx
src/components/capitalization/ManagementOverheadTable.tsx
src/components/capitalization/MetricCard.tsx
src/components/capitalization/NapkinWaterfallForm.tsx
src/components/capitalization/OverheadItemModal.tsx
src/components/capitalization/PartnerSummaryCards.tsx
src/components/capitalization/WaterfallDistributionTable.tsx
src/components/capitalization/WaterfallResults.tsx
src/components/capitalization/WaterfallStructureTable.tsx
src/components/common/UOMSelect.tsx
src/components/contacts/ContactDetailPanel.tsx
src/components/contacts/ContactModal.tsx
src/components/contacts/ContactTypeahead.tsx
src/components/contacts/RelationshipManager.tsx
src/components/copilot/CopilotProvider.tsx
src/components/dashboard/CompletenessBar.tsx
src/components/dashboard/CompletenessModal.tsx
src/components/dashboard/DashboardChat.tsx
src/components/dashboard/ProjectTable.tsx
src/components/diligence/DiligenceBlocks.tsx
src/components/dms/DMSView.tsx
src/components/dms/ProcessingStatus.tsx
src/components/dms/admin/AttrBuilder.tsx
src/components/dms/admin/TemplateDesigner.tsx
src/components/dms/filters/AccordionFilters.tsx
src/components/dms/filters/DocTypeFilters.tsx
src/components/dms/filters/ProjectSelector.tsx
src/components/dms/filters/SmartFilterBuilder.tsx
src/components/dms/folders/FolderEditor.tsx
src/components/dms/folders/FolderTree.tsx
src/components/dms/list/ColumnChooser.tsx
src/components/dms/list/DocumentTable.tsx
src/components/dms/list/PlatformKnowledgeAccordion.tsx
src/components/dms/list/PlatformKnowledgeTable.tsx
src/components/dms/modals/DeleteConfirmModal.tsx
src/components/dms/modals/DocumentChatModal.tsx
src/components/dms/modals/PlatformKnowledgeChatModal.tsx
src/components/dms/modals/PlatformKnowledgeModal.tsx
src/components/dms/modals/RenameModal.tsx
src/components/dms/modals/UploadCollisionModal.tsx
src/components/dms/panels/DmsLandscaperPanel.tsx
src/components/dms/preview/DocumentPreview.tsx
src/components/dms/preview/PlatformKnowledgePreview.tsx
src/components/dms/profile/DocCard.tsx
src/components/dms/profile/PlatformKnowledgeProfileForm.tsx
src/components/dms/profile/ProfileForm.tsx
src/components/dms/profile/TagInput.tsx
src/components/dms/profile/VersionTimeline.tsx
src/components/dms/search/Facets.tsx
src/components/dms/search/HighlightedText.tsx
src/components/dms/search/ResultsTable.tsx
src/components/dms/search/SearchBox.tsx
src/components/dms/shared/DMSLayout.tsx
src/components/dms/upload/Dropzone.tsx
src/components/dms/upload/Queue.tsx
src/components/dms/views/DocumentPreviewPanel.tsx
src/components/dms/views/FilterDetailView.tsx
src/components/documents/CorrectionModal.tsx
src/components/extraction/StagingModal.tsx
src/components/feasibility/ComparableModal.tsx
src/components/feasibility/ComparablesTable.tsx
src/components/feasibility/FeasibilitySubNav.tsx
src/components/feasibility/MarketDataContent.tsx
src/components/feasibility/SensitivityAnalysisContent.tsx
src/components/icons/LandscaperIcon.tsx
src/components/ingestion/DocumentCard.tsx
src/components/ingestion/DocumentIngestion.tsx
src/components/ingestion/IngestionChat.tsx
src/components/ingestion/MilestoneBar.tsx
src/components/ingestion/PropertyOverview.tsx
src/components/landscaper/ActivityFeed.tsx
src/components/landscaper/ActivityFeedItem.tsx
src/components/landscaper/AdviceAdherencePanel.tsx
src/components/landscaper/CalculatedFieldRow.tsx
src/components/landscaper/ChatInterface.tsx
src/components/landscaper/ChatMessageBubble.tsx
src/components/landscaper/DataTableModal.tsx
src/components/landscaper/ExtractionFieldRow.tsx
src/components/landscaper/ExtractionReviewModal.tsx
src/components/landscaper/ExtractionValidation.tsx
src/components/landscaper/LandscaperChat.tsx
src/components/landscaper/LandscaperPanel.tsx
src/components/landscaper/LandscaperProgress.tsx
src/components/landscaper/MutationProposalCard.tsx
src/components/landscaper/UnitMixAccordion.tsx
src/components/landscaper/VarianceItem.tsx
src/components/map/MapOblique.tsx
src/components/map/ProjectTabMap.tsx
src/components/map/PropertyTabMapWithComps.tsx
src/components/map/ValuationSalesCompMap.tsx
src/components/market/AddCompetitorModal.tsx
src/components/market/CompetitiveProjectsPanel.tsx
src/components/napkin/CommercialPanel.tsx
src/components/napkin/CompDetailsSection.tsx
src/components/napkin/InfrastructurePanel.tsx
src/components/napkin/LandscaperPanel.tsx
src/components/napkin/MdrPanel.tsx
src/components/napkin/NapkinAnalysisPage.tsx
src/components/napkin/NapkinAttachedPricing.tsx
src/components/napkin/NapkinCompsMap.tsx
src/components/napkin/NapkinSfdPricing.tsx
src/components/napkin/PromoteModal.tsx
src/components/napkin/RlvSummaryCard.tsx
src/components/napkin/SfdPricingPanel.tsx
src/components/operations/AddButton.tsx
src/components/operations/DetailSummaryToggle.tsx
src/components/operations/DraggableOpexSection.tsx
src/components/operations/EGISubtotalBar.tsx
src/components/operations/EvidenceCell.tsx
src/components/operations/GrowthBadge.tsx
src/components/operations/InputCell.tsx
src/components/operations/InventoryStatsPanel.tsx
src/components/operations/NOITotalBar.tsx
src/components/operations/OpExModeSelector.tsx
src/components/operations/OperatingExpensesSection.tsx
src/components/operations/OperationsHeader.tsx
src/components/operations/OtherIncomeSection.tsx
src/components/operations/RentalIncomeSection.tsx
src/components/operations/SectionCard.tsx
src/components/operations/SummaryBar.tsx
src/components/operations/VacancyDeductionsSection.tsx
src/components/operations/ValueAddAccordion.tsx
src/components/operations/ValueAddCard.tsx
src/components/operations/ValueAddToggle.tsx
src/components/phases/PhaseTransition.tsx
src/components/project/ActivityFeed.tsx
src/components/project/GranularityIndicators.tsx
src/components/project/MetricCard.tsx
src/components/project/MilestoneTimeline.tsx
src/components/project/ProfileField.tsx
src/components/project/ProjectDates.tsx
src/components/project/ProjectLandUseLabels.tsx
src/components/project/ProjectProfileEditModal.tsx
src/components/project/ProjectProfileTile.tsx
src/components/project/ProjectSubNav.tsx
src/components/projects/InflationRateDisplay.tsx
src/components/projects/LifecycleTileNav.tsx
src/components/projects/contacts/AddContactModal.tsx
src/components/projects/contacts/ContactCard.tsx
src/components/projects/contacts/ContactRoleCard.tsx
src/components/projects/contacts/ContactsSection.tsx
src/components/projects/contacts/ProjectContactsSection.tsx
src/components/projects/onboarding/ModelReadinessDisplay.tsx
src/components/projects/onboarding/NewProjectChannelTabs.tsx
src/components/projects/onboarding/NewProjectChat.tsx
src/components/projects/onboarding/NewProjectDropZone.tsx
src/components/projects/onboarding/NewProjectFieldTable.tsx
src/components/projects/onboarding/NewProjectOnboardingModal.tsx
src/components/projects/onboarding/SimplifiedChannelView.tsx
src/components/reports/ExtractionFilterPills.tsx
src/components/reports/ExtractionHistoryPanel.tsx
src/components/reports/ExtractionHistoryReport.tsx
src/components/reports/PropertySummaryView.tsx
src/components/sales/AnnualInventoryGauge.tsx
src/components/sales/CreateSalePhaseModal.tsx
src/components/sales/FilterSidebar.tsx
src/components/sales/ParcelSalesTable.tsx
src/components/sales/PhaseTiles.tsx
src/components/sales/PricingTable.tsx
src/components/sales/SaleCalculationModal.tsx
src/components/sales/SaleDetailForm.tsx
src/components/sales/SaleTransactionDetails.tsx
src/components/sales/SalesContent.tsx
src/components/sales/SaveBenchmarkModal.tsx
src/components/sales/TransactionColumn.tsx
src/components/sales/TransactionGrid.tsx
src/components/scenarios/ScenarioChipManager.tsx
src/components/scenarios/ScenarioComparison.tsx
src/components/shared/AccordionSection.tsx
src/components/shared/AreaTiles.tsx
src/components/shared/ModeToggle.tsx
src/components/studio/LandscaperPanel.tsx
src/components/studio/StudioPanel.tsx
src/components/studio/TileGrid.tsx
src/components/studio/layout/StudioLayout.tsx
src/components/taxonomy/FamilyDetails.tsx
src/components/taxonomy/FamilyTree.tsx
src/components/taxonomy/ProductsList.tsx
src/components/ui/ModeChip.tsx
src/components/ui/PageHeader.tsx
src/components/ui/alert.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/dialog.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/landscape/DataTable.tsx
src/components/ui/landscape/LandscapeButton.tsx
src/components/ui/landscape/StatusChip.tsx
src/components/ui/radio-group.tsx
src/components/ui/select.tsx
src/components/ui/sheet.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/textarea.tsx
src/components/ui/toast.tsx
src/components/valuation/income-approach/AssumptionsPanel.tsx
src/components/valuation/income-approach/DirectCapView.tsx
src/components/valuation/income-approach/SensitivityMatrix.tsx
src/components/valuation/income-approach/ValueTiles.tsx

### src/app/components (app-level shared)
src/app/components/AI/DocumentReview.tsx
src/app/components/Admin/CategoryTree.tsx
src/app/components/Admin/LandUseInputTable.tsx
src/app/components/Admin/LandUseInputTableTanStack.tsx
src/app/components/Admin/LandUseManagement.tsx
src/app/components/AdminNavBar.tsx
src/app/components/Archive/PlanningContentGrid.tsx
src/app/components/Archive/PlanningContentHot.tsx
src/app/components/Budget/BudgetContainerView.tsx
src/app/components/Budget/BudgetContent.tsx
src/app/components/Budget/BudgetGrid.tsx
src/app/components/Budget/BudgetGridDark.tsx
src/app/components/Budget/BudgetGridDarkWrapper.tsx
src/app/components/Budget/BudgetGridLight.tsx
src/app/components/BudgetGridWithDependencies.tsx
src/app/components/ContainerManagement/ProjectSetupWizard.tsx
src/app/components/CoreUIThemeProvider.tsx
src/app/components/DVLTimeSeries.tsx
src/app/components/DependencyConfigPanel.tsx
src/app/components/DevStatus/DevStatus.tsx
src/app/components/DirectionalIcon.tsx
src/app/components/Documentation/MarkdownViewer.tsx
src/app/components/Documents/DocumentManagement.tsx
src/app/components/DynamicBreadcrumb.tsx
src/app/components/FilterableSelect.tsx
src/app/components/Form.tsx
src/app/components/GIS/AssessorDataMapping.tsx
src/app/components/GIS/GISSetupWorkflow.tsx
src/app/components/GIS/PlanNavigation.tsx
src/app/components/GIS/ProjectBoundarySetup.tsx
src/app/components/GIS/ProjectDocumentUploads.tsx
src/app/components/GIS/PropertyPackageUpload.tsx
src/app/components/Glossary/ZoningGlossaryAdmin.tsx
src/app/components/GrowthRateDetail/index.tsx
src/app/components/GrowthRates-Original.tsx
src/app/components/GrowthRates.tsx
src/app/components/GrowthRatesManager/index.tsx
src/app/components/Header.tsx
src/app/components/Home/HomeOverview.tsx
src/app/components/Home/UnderConstruction.tsx
src/app/components/Illustrations.tsx
src/app/components/LandUse/InlineTaxonomySelector.tsx
src/app/components/LandUse/LandUseCanvas.tsx
src/app/components/LandUse/LandUseDetails.tsx
src/app/components/LandUse/LandUseMatchWizard.tsx
src/app/components/LandUse/LandUseSchema.tsx
src/app/components/LandUse/SimpleTaxonomySelector.tsx
src/app/components/LandUse/TaxonomySelector.tsx
src/app/components/LandUsePricing/index.tsx
src/app/components/LandscaperChatModal.tsx
src/app/components/Link.tsx
src/app/components/MapLibre/GISMap.tsx
src/app/components/MapView.tsx
src/app/components/Market/MarketAssumptions.tsx
src/app/components/Market/MarketMapView.tsx
src/app/components/MarketAssumptions.tsx
src/app/components/MarketAssumptionsComparison.tsx
src/app/components/MarketAssumptionsMUI.tsx
src/app/components/MarketAssumptionsNative.tsx
src/app/components/MarketFactors/index.tsx
src/app/components/Migration/TaxonomyMigration.tsx
src/app/components/Navigation.tsx
src/app/components/NavigationLayout.tsx
src/app/components/NewProject/BasicInfoStep.tsx
src/app/components/NewProject/PropertyTypeStep.tsx
src/app/components/NewProject/TemplateStep.tsx
src/app/components/NewProjectButton.tsx
src/app/components/NewProjectModal.tsx
src/app/components/OpExHierarchy.tsx
src/app/components/Planning/CollapsibleSection.tsx
src/app/components/Planning/PlanningContent.tsx
src/app/components/Planning/PlanningOverviewControls.tsx
src/app/components/PlanningWizard/AddContainerModal.tsx
src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx
src/app/components/PlanningWizard/ContainerTreeView.tsx
src/app/components/PlanningWizard/DraggableContainerNode.tsx
src/app/components/PlanningWizard/DraggableTile.tsx
src/app/components/PlanningWizard/DropZone.tsx
src/app/components/PlanningWizard/NavigationTiles.tsx
src/app/components/PlanningWizard/ParcelTile.tsx
src/app/components/PlanningWizard/PhaseCanvas.tsx
src/app/components/PlanningWizard/PhaseCanvasInline.tsx
src/app/components/PlanningWizard/PlanningWizard.tsx
src/app/components/PlanningWizard/PlanningWizardInline.tsx
src/app/components/PlanningWizard/ProjectCanvas.tsx
src/app/components/PlanningWizard/ProjectCanvasInline.tsx
src/app/components/PlanningWizard/Sidebar.tsx
src/app/components/PlanningWizard/cards/AreaDetailCard.tsx
src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx
src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx
src/app/components/PlanningWizard/forms/AreaForm.tsx
src/app/components/PlanningWizard/forms/ParcelForm.tsx
src/app/components/PlanningWizard/forms/PhaseForm.tsx
src/app/components/PreferencesContextBar.tsx
src/app/components/ProjectContextBar.tsx
src/app/components/ProjectCosts/index.tsx
src/app/components/ProjectProvider.tsx
src/app/components/Providers.tsx
src/app/components/QueryProvider.tsx
src/app/components/Setup/ProjectStructureChoice.tsx
src/app/components/Setup/ProjectTaxonomyWizard.tsx
src/app/components/TaxonomySelector/TaxonomySelector.tsx
src/app/components/ThemeRegistry.tsx
src/app/components/ThemeSwitcher.tsx
src/app/components/ThemeToggle.tsx
src/app/components/TimelineVisualization.tsx
src/app/components/TopNavigationBar.tsx
src/app/components/UniversalInventory/UniversalInventoryTable.tsx
src/app/components/assumptions/AssumptionBasket.tsx
src/app/components/assumptions/FieldGroup.tsx
src/app/components/assumptions/FieldRenderer.tsx
src/app/components/assumptions/HelpTooltip.tsx
src/app/components/card-statistics/Vertical.tsx
src/app/components/dashboard/DashboardMap.tsx
src/app/components/dashboard/TriageModal.tsx
src/app/components/dashboard/UserTile.tsx
src/app/components/layout/shared/Logo.tsx
src/app/components/layout/shared/ModeDropdown.tsx
src/app/components/layout/shared/UserDropdown.tsx
src/app/components/layout/shared/search/index.tsx
src/app/components/layout/vertical/Footer.tsx
src/app/components/layout/vertical/FooterContent.tsx
src/app/components/layout/vertical/NavToggle.tsx
src/app/components/layout/vertical/Navbar.tsx
src/app/components/layout/vertical/NavbarContent.tsx
src/app/components/layout/vertical/Navigation.tsx
src/app/components/layout/vertical/VerticalMenu.tsx
src/app/components/navigation/SandboxDropdown.tsx
src/app/components/navigation/SettingsDropdown.tsx
src/app/components/navigation/UserMenuDropdown.tsx
src/app/components/new-project/AIDocumentPrompt.tsx
src/app/components/new-project/AssetTypeSection.tsx
src/app/components/new-project/Badge.tsx
src/app/components/new-project/ConfigureSection.tsx
src/app/components/new-project/FloatingLabelInput.tsx
src/app/components/new-project/LandscaperPanel.tsx
src/app/components/new-project/LocationSection.tsx
src/app/components/new-project/MapPinSelector.tsx
src/app/components/new-project/PathCard.tsx
src/app/components/new-project/ProjectSummaryPreview.tsx
src/app/components/new-project/PropertyDataSection.tsx
src/app/components/stepper-dot/index.tsx
src/app/components/theme/ModeChanger.tsx
src/app/components/theme/index.tsx
src/app/components/upgrade-to-pro-button/index.tsx

### src/components/ui (shadcn/radix primitives)
src/components/ui/ModeChip.tsx
src/components/ui/PageHeader.tsx
src/components/ui/alert.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/dialog.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/landscape/DataTable.tsx
src/components/ui/landscape/LandscapeButton.tsx
src/components/ui/landscape/StatusChip.tsx
src/components/ui/radio-group.tsx
src/components/ui/select.tsx
src/components/ui/sheet.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/textarea.tsx
src/components/ui/toast.tsx

### src/components/dms (Document Management System)
src/components/dms/DMSView.tsx
src/components/dms/ProcessingStatus.tsx
src/components/dms/admin/AttrBuilder.tsx
src/components/dms/admin/TemplateDesigner.tsx
src/components/dms/filters/AccordionFilters.tsx
src/components/dms/filters/DocTypeFilters.tsx
src/components/dms/filters/ProjectSelector.tsx
src/components/dms/filters/SmartFilterBuilder.tsx
src/components/dms/folders/FolderEditor.tsx
src/components/dms/folders/FolderTree.tsx
src/components/dms/list/ColumnChooser.tsx
src/components/dms/list/DocumentTable.tsx
src/components/dms/list/PlatformKnowledgeAccordion.tsx
src/components/dms/list/PlatformKnowledgeTable.tsx
src/components/dms/modals/DeleteConfirmModal.tsx
src/components/dms/modals/DocumentChatModal.tsx
src/components/dms/modals/PlatformKnowledgeChatModal.tsx
src/components/dms/modals/PlatformKnowledgeModal.tsx
src/components/dms/modals/RenameModal.tsx
src/components/dms/modals/UploadCollisionModal.tsx
src/components/dms/panels/DmsLandscaperPanel.tsx
src/components/dms/preview/DocumentPreview.tsx
src/components/dms/preview/PlatformKnowledgePreview.tsx
src/components/dms/profile/DocCard.tsx
src/components/dms/profile/PlatformKnowledgeProfileForm.tsx
src/components/dms/profile/ProfileForm.tsx
src/components/dms/profile/TagInput.tsx
src/components/dms/profile/VersionTimeline.tsx
src/components/dms/search/Facets.tsx
src/components/dms/search/HighlightedText.tsx
src/components/dms/search/ResultsTable.tsx
src/components/dms/search/SearchBox.tsx
src/components/dms/shared/DMSLayout.tsx
src/components/dms/upload/Dropzone.tsx
src/components/dms/upload/Queue.tsx
src/components/dms/views/DocumentPreviewPanel.tsx
src/components/dms/views/FilterDetailView.tsx

### src/components/budget (Budget stack)
src/components/budget/BasicBudgetTable.tsx
src/components/budget/BudgetContainer.tsx
src/components/budget/BudgetDataGrid.tsx
src/components/budget/BudgetGanttGrid.tsx
src/components/budget/BudgetGridTab.tsx
src/components/budget/BudgetHealthWidget.tsx
src/components/budget/BudgetItemModal.tsx
src/components/budget/BudgetItemModalV2.tsx
src/components/budget/CategoryCascadingDropdown.tsx
src/components/budget/CategoryTemplateManager.tsx
src/components/budget/CategoryTreeManager.tsx
src/components/budget/ColumnDefinitions.tsx
src/components/budget/CostCategoriesTab.tsx
src/components/budget/CreateTemplateModal.tsx
src/components/budget/CustomColumns.tsx
src/components/budget/EditConfirmationDialog.tsx
src/components/budget/FiltersAccordion.tsx
src/components/budget/GanttChart.tsx
src/components/budget/GanttEditModal.tsx
src/components/budget/IncompleteCategoriesReminder.tsx
src/components/budget/ModeSelector.tsx
src/components/budget/QuickAddCategoryModal.tsx
src/components/budget/ReconciliationModal.tsx
src/components/budget/SimpleBudgetGrid.tsx
src/components/budget/TemplateEditorModal.tsx
src/components/budget/TimelineChartPeriods.tsx
src/components/budget/TimelineTab.tsx
src/components/budget/VarianceAlertModal.tsx
src/components/budget/VarianceWarningBadge.tsx
src/components/budget/custom/BudgetGridWithTimeline.tsx
src/components/budget/custom/CategoryEditorRow.tsx
src/components/budget/custom/ColoredDotIndicator.tsx
src/components/budget/custom/ColumnChooser.tsx
src/components/budget/custom/DataGrid.tsx
src/components/budget/custom/EditableCategoryCell.tsx
src/components/budget/custom/EditableCell.tsx
src/components/budget/custom/ExpandableDetailsRow.tsx
src/components/budget/custom/GroupRow.tsx
src/components/budget/custom/PhaseCell.tsx
src/components/budget/custom/TimelineChart.tsx
src/components/budget/fields/FieldRenderer.tsx
src/components/budget/tiles/CostControlsTile.tsx
src/components/budget/tiles/TimingEscalationTile.tsx

### src/app/components/navigation (Nav dropdowns)
src/app/components/navigation/SandboxDropdown.tsx
src/app/components/navigation/SettingsDropdown.tsx
src/app/components/navigation/UserMenuDropdown.tsx

### Modals / Dialogs / Flyouts / Drawers
src/app/admin/preferences/components/AddCategoryModal.tsx
src/app/admin/preferences/components/CreateTagModal.tsx
src/app/admin/preferences/components/DeleteConfirmationModal.tsx
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/admin/users/components/UserModals.tsx
src/app/components/LandscaperChatModal.tsx
src/app/components/NewProjectModal.tsx
src/app/components/PlanningWizard/AddContainerModal.tsx
src/app/components/dashboard/TriageModal.tsx
src/app/projects/[projectId]/components/landscaper/AgentModal.tsx
src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx
src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx
src/components/admin/AdminModal.tsx
src/components/admin/PicklistItemModal.tsx
src/components/admin/ReportTemplateEditorModal.tsx
src/components/benchmarks/AddBenchmarkModal.tsx
src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx
src/components/budget/BudgetItemModal.tsx
src/components/budget/BudgetItemModalV2.tsx
src/components/budget/CreateTemplateModal.tsx
src/components/budget/GanttEditModal.tsx
src/components/budget/QuickAddCategoryModal.tsx
src/components/budget/ReconciliationModal.tsx
src/components/budget/TemplateEditorModal.tsx
src/components/budget/VarianceAlertModal.tsx
src/components/capitalization/DebtFacilityModal.tsx
src/components/capitalization/DeveloperFeeModal.tsx
src/components/capitalization/OverheadItemModal.tsx
src/components/contacts/ContactModal.tsx
src/components/dashboard/CompletenessModal.tsx
src/components/dms/modals/DeleteConfirmModal.tsx
src/components/dms/modals/DocumentChatModal.tsx
src/components/dms/modals/PlatformKnowledgeChatModal.tsx
src/components/dms/modals/PlatformKnowledgeModal.tsx
src/components/dms/modals/RenameModal.tsx
src/components/dms/modals/UploadCollisionModal.tsx
src/components/documents/CorrectionModal.tsx
src/components/extraction/StagingModal.tsx
src/components/feasibility/ComparableModal.tsx
src/components/landscaper/DataTableModal.tsx
src/components/landscaper/ExtractionReviewModal.tsx
src/components/market/AddCompetitorModal.tsx
src/components/napkin/PromoteModal.tsx
src/components/project/ProjectProfileEditModal.tsx
src/components/projects/contacts/AddContactModal.tsx
src/components/projects/onboarding/NewProjectOnboardingModal.tsx
src/components/sales/CreateSalePhaseModal.tsx
src/components/sales/SaleCalculationModal.tsx
src/components/sales/SaveBenchmarkModal.tsx
src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx
src/app/rent-roll/components/FloorplanUpdateDialog.tsx
src/components/IssueReporter/IssueReporterDialog.tsx
src/components/budget/EditConfirmationDialog.tsx
src/components/benchmarks/BenchmarksFlyout.tsx

### Panels / Sidebars
src/app/admin/preferences/components/CategoryDetailPanel.tsx
src/app/components/DependencyConfigPanel.tsx
src/app/components/new-project/LandscaperPanel.tsx
src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx
src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/CategoryPanel.tsx
src/components/admin/BenchmarksPanel.tsx
src/components/admin/CostLibraryPanel.tsx
src/components/admin/DMSAdminPanel.tsx
src/components/admin/LandscaperAdminPanel.tsx
src/components/admin/PreferencesPanel.tsx
src/components/admin/ReportConfiguratorPanel.tsx
src/components/admin/UserManagementPanel.tsx
src/components/benchmarks/GrowthRateCategoryPanel.tsx
src/components/benchmarks/LandscaperPanel.tsx
src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx
src/components/benchmarks/products/ProductLibraryPanel.tsx
src/components/benchmarks/unit-costs/UnitCostsPanel.tsx
src/components/contacts/ContactDetailPanel.tsx
src/components/dms/panels/DmsLandscaperPanel.tsx
src/components/dms/views/DocumentPreviewPanel.tsx
src/components/landscaper/AdviceAdherencePanel.tsx
src/components/landscaper/LandscaperPanel.tsx
src/components/market/CompetitiveProjectsPanel.tsx
src/components/napkin/CommercialPanel.tsx
src/components/napkin/InfrastructurePanel.tsx
src/components/napkin/LandscaperPanel.tsx
src/components/napkin/MdrPanel.tsx
src/components/napkin/SfdPricingPanel.tsx
src/components/operations/InventoryStatsPanel.tsx
src/components/reports/ExtractionHistoryPanel.tsx
src/components/studio/LandscaperPanel.tsx
src/components/studio/StudioPanel.tsx
src/components/valuation/income-approach/AssumptionsPanel.tsx
src/app/components/PlanningWizard/Sidebar.tsx
src/app/lease/[id]/components/LeaseSidebar.tsx
src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx
src/app/property/components/PropertySidebar.tsx
src/components/sales/FilterSidebar.tsx

### Preferences / Settings
src/app/admin/preferences/components/ActivityFilter.tsx
src/app/admin/preferences/components/AddCategoryModal.tsx
src/app/admin/preferences/components/AddUOMRow.tsx
src/app/admin/preferences/components/CategoryDetailPanel.tsx
src/app/admin/preferences/components/CategoryTree.tsx
src/app/admin/preferences/components/CategoryTreeItem.tsx
src/app/admin/preferences/components/CategoryTreeView.tsx
src/app/admin/preferences/components/CreateTagModal.tsx
src/app/admin/preferences/components/DeleteConfirmationModal.tsx
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/admin/preferences/components/MobileWarning.tsx
src/app/admin/preferences/components/UOMRow.tsx
src/app/admin/preferences/components/UOMTable.tsx
src/app/admin/preferences/components/UnitCostCategoryManager.tsx
src/app/admin/preferences/components/UnitOfMeasureManager.tsx
src/app/admin/preferences/page.tsx
src/app/preferences/layout.tsx
src/app/preferences/page.tsx
src/app/projects/[projectId]/settings/page.tsx
src/app/settings/budget-categories/page.tsx
src/app/settings/contact-roles/page.tsx
src/app/settings/profile/page.tsx
src/app/settings/taxonomy/page.tsx
src/app/components/PreferencesContextBar.tsx
src/components/admin/PreferencesPanel.tsx

### Admin / Benchmark
src/app/admin/benchmarks/cost-library/page.tsx
src/app/admin/benchmarks/page.tsx
src/app/admin/dms/templates/page.tsx
src/app/admin/preferences/components/ActivityFilter.tsx
src/app/admin/preferences/components/AddCategoryModal.tsx
src/app/admin/preferences/components/AddUOMRow.tsx
src/app/admin/preferences/components/CategoryDetailPanel.tsx
src/app/admin/preferences/components/CategoryTree.tsx
src/app/admin/preferences/components/CategoryTreeItem.tsx
src/app/admin/preferences/components/CategoryTreeView.tsx
src/app/admin/preferences/components/CreateTagModal.tsx
src/app/admin/preferences/components/DeleteConfirmationModal.tsx
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/admin/preferences/components/MobileWarning.tsx
src/app/admin/preferences/components/UOMRow.tsx
src/app/admin/preferences/components/UOMTable.tsx
src/app/admin/preferences/components/UnitCostCategoryManager.tsx
src/app/admin/preferences/components/UnitOfMeasureManager.tsx
src/app/admin/preferences/page.tsx
src/app/admin/users/components/UserModals.tsx
src/app/admin/users/page.tsx
src/components/admin/AdminModal.tsx
src/components/admin/BenchmarksPanel.tsx
src/components/admin/CostLibraryPanel.tsx
src/components/admin/DMSAdminPanel.tsx
src/components/admin/ExportButton.tsx
src/components/admin/ExtractionMappingAdmin.tsx
src/components/admin/LandscaperAdminPanel.tsx
src/components/admin/PicklistEditor.tsx
src/components/admin/PicklistItemModal.tsx
src/components/admin/PreferencesPanel.tsx
src/components/admin/ReportConfiguratorPanel.tsx
src/components/admin/ReportTemplateCard.tsx
src/components/admin/ReportTemplateEditorModal.tsx
src/components/admin/SystemPicklistsAccordion.tsx
src/components/admin/UserManagementPanel.tsx
src/components/dms/admin/AttrBuilder.tsx
src/components/dms/admin/TemplateDesigner.tsx
src/app/components/AdminNavBar.tsx
src/app/components/Glossary/ZoningGlossaryAdmin.tsx
src/components/admin/AdminModal.tsx
src/components/admin/DMSAdminPanel.tsx
src/components/admin/ExtractionMappingAdmin.tsx
src/components/admin/LandscaperAdminPanel.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx
src/components/admin/BenchmarksPanel.tsx
src/components/benchmarks/AddBenchmarkModal.tsx
src/components/benchmarks/BenchmarkAccordion.tsx
src/components/benchmarks/BenchmarksFlyout.tsx
src/components/sales/SaveBenchmarkModal.tsx

### Other component locations
src/app/admin/preferences/components/ActivityFilter.tsx
src/app/admin/preferences/components/AddCategoryModal.tsx
src/app/admin/preferences/components/AddUOMRow.tsx
src/app/admin/preferences/components/CategoryDetailPanel.tsx
src/app/admin/preferences/components/CategoryTree.tsx
src/app/admin/preferences/components/CategoryTreeItem.tsx
src/app/admin/preferences/components/CategoryTreeView.tsx
src/app/admin/preferences/components/CreateTagModal.tsx
src/app/admin/preferences/components/DeleteConfirmationModal.tsx
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/admin/preferences/components/MobileWarning.tsx
src/app/admin/preferences/components/UOMRow.tsx
src/app/admin/preferences/components/UOMTable.tsx
src/app/admin/preferences/components/UnitCostCategoryManager.tsx
src/app/admin/preferences/components/UnitOfMeasureManager.tsx
src/app/admin/users/components/UserModals.tsx
src/app/lease/[id]/components/AdditionalIncome.tsx
src/app/lease/[id]/components/Escalations.tsx
src/app/lease/[id]/components/LeaseHeader.tsx
src/app/lease/[id]/components/LeaseOverview.tsx
src/app/lease/[id]/components/LeaseSidebar.tsx
src/app/lease/[id]/components/LeasingCosts.tsx
src/app/lease/[id]/components/MarketAssumptions.tsx
src/app/lease/[id]/components/Notes.tsx
src/app/lease/[id]/components/Recoveries.tsx
src/app/lease/[id]/components/RentStructure.tsx
src/app/lease/[id]/components/TermsAndDates.tsx
src/app/lease/components/ExpandableSection.tsx
src/app/lease/components/FloatingActions.tsx
src/app/lease/components/MetricsGrid.tsx
src/app/lease/components/ToggleSwitch.tsx
src/app/market/components/CombinedTile.tsx
src/app/market/components/CoverageBadge.tsx
src/app/market/components/GeoToggleChips.tsx
src/app/market/components/KPIStat.tsx
src/app/market/components/MarketChart.tsx
src/app/market/components/YoYBar.tsx
src/app/projects/[projectId]/components/landscaper/AgentChat.tsx
src/app/projects/[projectId]/components/landscaper/AgentContentHeader.tsx
src/app/projects/[projectId]/components/landscaper/AgentDashboard.tsx
src/app/projects/[projectId]/components/landscaper/AgentModal.tsx
src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx
src/app/projects/[projectId]/components/landscaper/AgentWorkspace.tsx
src/app/projects/[projectId]/components/landscaper/COODashboard.tsx
src/app/projects/[projectId]/components/landscaper/Card.tsx
src/app/projects/[projectId]/components/landscaper/CollapsibleChat.tsx
src/app/projects/[projectId]/components/landscaper/CollapsibleContent.tsx
src/app/projects/[projectId]/components/landscaper/ConfidenceIndicator.tsx
src/app/projects/[projectId]/components/landscaper/DecisionPrompt.tsx
src/app/projects/[projectId]/components/landscaper/ProjectDetailsContent.tsx
src/app/projects/[projectId]/components/landscaper/ProjectLayoutClient.tsx
src/app/projects/[projectId]/components/landscaper/ProjectSelector.tsx
src/app/projects/[projectId]/components/landscaper/ProjectSelectorCard.tsx
src/app/projects/[projectId]/components/landscaper/SimpleProjectBar.tsx
src/app/projects/[projectId]/components/landscaper/StatusCard.tsx
src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx
src/app/projects/[projectId]/components/tabs/BudgetTab.tsx
src/app/projects/[projectId]/components/tabs/CapitalizationTab.tsx
src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx
src/app/projects/[projectId]/components/tabs/DocumentsTab.tsx
src/app/projects/[projectId]/components/tabs/FeasibilityTab.tsx
src/app/projects/[projectId]/components/tabs/GISTab.tsx
src/app/projects/[projectId]/components/tabs/OperationsTab.tsx
src/app/projects/[projectId]/components/tabs/PlanningTab.tsx
src/app/projects/[projectId]/components/tabs/ProjectTab.tsx
src/app/projects/[projectId]/components/tabs/PropertyTab.tsx
src/app/projects/[projectId]/components/tabs/ReportsTab.tsx
src/app/projects/[projectId]/components/tabs/SalesTab.tsx
src/app/projects/[projectId]/components/tabs/SourcesTab.tsx
src/app/projects/[projectId]/components/tabs/UsesTab.tsx
src/app/projects/[projectId]/components/tabs/ValuationTab.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentCell.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentMatrix.tsx
src/app/projects/[projectId]/valuation/components/ComparableCard.tsx
src/app/projects/[projectId]/valuation/components/ComparablesGrid.old2.tsx
src/app/projects/[projectId]/valuation/components/ComparablesGrid.tsx
src/app/projects/[projectId]/valuation/components/ComparablesMap.tsx
src/app/projects/[projectId]/valuation/components/IndicatedValueSummary.tsx
src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx
src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
src/app/projects/[projectId]/valuation/components/SalesComparisonApproach.tsx
src/app/properties/[id]/analysis/components/CashFlowTab.tsx
src/app/properties/[id]/analysis/components/FinancingAssumptionsTab.tsx
src/app/properties/[id]/analysis/components/InvestmentReturnsTab.tsx
src/app/properties/[id]/analysis/components/MarketAssumptionsTab.tsx
src/app/properties/[id]/analysis/components/OperatingAssumptionsTab.tsx
src/app/properties/[id]/analysis/components/QuickStats.tsx
src/app/properties/[id]/analysis/components/RentRollTab.tsx
src/app/properties/[id]/analysis/components/SensitivityTab.tsx
src/app/properties/[id]/analysis/components/TabNavigation.tsx
src/app/property/components/Assumptions.tsx
src/app/property/components/Documents.tsx
src/app/property/components/Financial.tsx
src/app/property/components/Market.tsx
src/app/property/components/Operations.tsx
src/app/property/components/PropertyDetails.tsx
src/app/property/components/PropertyHeader.tsx
src/app/property/components/PropertySidebar.tsx
src/app/property/components/Reports.tsx
src/app/property/components/Results.tsx
src/app/property/components/TaxLegal.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/CategoryCard.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/CategoryPanel.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/DebtFacilityForm.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/DetailedBreakdownTable.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/OperatingExpensesTab.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/PageHeader.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/TabBar.tsx
src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx
src/app/rent-roll/components/AnalysisDashboard.tsx
src/app/rent-roll/components/FloorplanUpdateDialog.tsx
src/app/rent-roll/components/FloorplansGrid.tsx
src/app/rent-roll/components/MarketAssumptions.tsx
src/app/rent-roll/components/RentRollGrid.tsx

## SECTION 2: STYLING SYSTEM CLASSIFICATION


FILE: src/app/admin/benchmarks/cost-library/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/benchmarks/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/admin/dms/templates/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 68
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/admin/preferences/components/ActivityFilter.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/AddCategoryModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/AddUOMRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/admin/preferences/components/CategoryDetailPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 15
  Inline styles: 14
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/admin/preferences/components/CategoryTree.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/CategoryTreeItem.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/CategoryTreeView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/CreateTagModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 7
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/admin/preferences/components/DeleteConfirmationModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/DeleteUOMModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/admin/preferences/components/MobileWarning.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/admin/preferences/components/UOMRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 16
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/admin/preferences/components/UOMTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 6
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/admin/preferences/components/UnitCostCategoryManager.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 8
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 7
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/admin/preferences/components/UnitOfMeasureManager.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/admin/preferences/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 18
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 19
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/admin/users/components/UserModals.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 134
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/admin/users/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 42
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/AI/DocumentReview.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 62
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Admin/CategoryTree.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 31
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Admin/LandUseInputTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 159
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Admin/LandUseInputTableTanStack.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 3
  CSS variables: 0
  Tailwind colors: 95
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Admin/LandUseManagement.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 76
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/AdminNavBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/Archive/PlanningContentGrid.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 32
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Archive/PlanningContentHot.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 25
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Budget/BudgetContainerView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 45
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Budget/BudgetContent.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 47
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Budget/BudgetGrid.tsx
  CoreUI imports: 0
  MUI imports: 23
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 8
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Budget/BudgetGridDark.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 99
  Hardcoded hex: 0
  Inline styles: 14
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Budget/BudgetGridDarkWrapper.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Budget/BudgetGridLight.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/BudgetGridWithDependencies.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/ContainerManagement/ProjectSetupWizard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 67
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/CoreUIThemeProvider.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/DVLTimeSeries.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 13
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/DependencyConfigPanel.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/DevStatus/DevStatus.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 193
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/DirectionalIcon.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/Documentation/MarkdownViewer.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 37
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Documents/DocumentManagement.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/DynamicBreadcrumb.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 6
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/FilterableSelect.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 9
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Form.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/GIS/AssessorDataMapping.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 32
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GIS/GISSetupWorkflow.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 21
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GIS/PlanNavigation.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 54
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GIS/ProjectBoundarySetup.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 27
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GIS/ProjectDocumentUploads.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 121
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GIS/PropertyPackageUpload.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 168
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Glossary/ZoningGlossaryAdmin.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 59
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GrowthRateDetail/index.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 22
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GrowthRates-Original.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 13
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GrowthRates.tsx
  CoreUI imports: 0
  MUI imports: 2
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 43
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/GrowthRatesManager/index.tsx
  CoreUI imports: 0
  MUI imports: 18
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/Header.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/Home/HomeOverview.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 75
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Home/UnderConstruction.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 30
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Illustrations.tsx
  CoreUI imports: 0
  MUI imports: 2
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/LandUse/InlineTaxonomySelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 6
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUse/LandUseCanvas.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 45
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUse/LandUseDetails.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 41
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUse/LandUseMatchWizard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 31
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUse/LandUseSchema.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 32
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUse/SimpleTaxonomySelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 17
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUse/TaxonomySelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 30
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandUsePricing/index.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 37
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/LandscaperChatModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 8
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Link.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/MapLibre/GISMap.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 31
  Hardcoded hex: 35
  Inline styles: 5
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/MapView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Market/MarketAssumptions.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 90
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Market/MarketMapView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 12
  Tailwind colors: 0
  Hardcoded hex: 33
  Inline styles: 22
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/MarketAssumptions.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 7
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/MarketAssumptionsComparison.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 3
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/MarketAssumptionsMUI.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 5
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/MarketAssumptionsNative.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 66
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/MarketFactors/index.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 52
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Migration/TaxonomyMigration.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 52
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Navigation.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 14
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/NavigationLayout.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/NewProject/BasicInfoStep.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 60
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/NewProject/PropertyTypeStep.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 21
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/NewProject/TemplateStep.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 41
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/NewProjectButton.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/NewProjectModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 102
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/OpExHierarchy.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 49
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Planning/CollapsibleSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/Planning/PlanningContent.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 86
  Tailwind colors: 26
  Hardcoded hex: 0
  Inline styles: 68
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Planning/PlanningOverviewControls.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 31
  Tailwind colors: 3
  Hardcoded hex: 0
  Inline styles: 25
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/AddContainerModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 32
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 16
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/ContainerTreeView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 12
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/DraggableContainerNode.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 87
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/DraggableTile.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 16
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/DropZone.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 5
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/NavigationTiles.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 20
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/ParcelTile.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 20
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/PhaseCanvas.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 8
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/PhaseCanvasInline.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 31
  Hardcoded hex: 5
  Inline styles: 36
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/PlanningWizard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 34
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/PlanningWizardInline.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/ProjectCanvas.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 65
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/ProjectCanvasInline.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 33
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/Sidebar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/cards/AreaDetailCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 45
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 84
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 35
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/forms/AreaForm.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 35
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/forms/ParcelForm.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 109
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PlanningWizard/forms/PhaseForm.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 35
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/PreferencesContextBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/ProjectContextBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 14
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/ProjectCosts/index.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 9
  Hardcoded hex: 3
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/ProjectProvider.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/Providers.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/QueryProvider.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/Setup/ProjectStructureChoice.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 42
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/Setup/ProjectTaxonomyWizard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 69
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/TaxonomySelector/TaxonomySelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 11
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/ThemeRegistry.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/ThemeSwitcher.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 4
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/ThemeToggle.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 7
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/TimelineVisualization.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 21
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/TopNavigationBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 15
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/UniversalInventory/UniversalInventoryTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 42
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/assumptions/AssumptionBasket.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/assumptions/FieldGroup.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/assumptions/FieldRenderer.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/assumptions/HelpTooltip.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/card-statistics/Vertical.tsx
  CoreUI imports: 0
  MUI imports: 3
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/dashboard/DashboardMap.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 20
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/dashboard/TriageModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 36
  Tailwind colors: 5
  Hardcoded hex: 0
  Inline styles: 29
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/dashboard/UserTile.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 20
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 12
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/components/layout/shared/Logo.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/layout/shared/ModeDropdown.tsx
  CoreUI imports: 0
  MUI imports: 2
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/layout/shared/UserDropdown.tsx
  CoreUI imports: 0
  MUI imports: 12
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/layout/shared/search/index.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/layout/vertical/Footer.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/layout/vertical/FooterContent.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/layout/vertical/NavToggle.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/layout/vertical/Navbar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/components/layout/vertical/NavbarContent.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/layout/vertical/Navigation.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/layout/vertical/VerticalMenu.tsx
  CoreUI imports: 0
  MUI imports: 2
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/navigation/SandboxDropdown.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/navigation/SettingsDropdown.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/components/navigation/UserMenuDropdown.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 18
  Tailwind colors: 3
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/AIDocumentPrompt.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/AssetTypeSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 16
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/Badge.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 12
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/ConfigureSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 28
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/FloatingLabelInput.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 11
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/LandscaperPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 37
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/LocationSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 51
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/MapPinSelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 12
  Hardcoded hex: 3
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/PathCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 13
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/ProjectSummaryPreview.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 5
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/new-project/PropertyDataSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 41
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/components/stepper-dot/index.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/theme/ModeChanger.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/theme/index.tsx
  CoreUI imports: 0
  MUI imports: 4
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/components/upgrade-to-pro-button/index.tsx
  CoreUI imports: 0
  MUI imports: 7
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ MUI (evaluate)

FILE: src/app/lease/[id]/components/LeaseSidebar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/preferences/layout.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/preferences/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/projects/[projectId]/components/landscaper/AgentModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ⚠️ UNKNOWN

FILE: src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 31
  Tailwind colors: 4
  Hardcoded hex: 0
  Inline styles: 22
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 14
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 25
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 20
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/projects/[projectId]/settings/page.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 13
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 16
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 12
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 9
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/property/components/PropertySidebar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 37
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/CategoryPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 6
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 24
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/rent-roll/components/FloorplanUpdateDialog.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 6
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/app/settings/budget-categories/page.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/settings/contact-roles/page.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/app/settings/profile/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 49
  Hardcoded hex: 29
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/app/settings/taxonomy/page.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/DebugMount.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/IssueReporter/IssueReporterButton.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/IssueReporter/IssueReporterContext.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/IssueReporter/IssueReporterDialog.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 35
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/IssueReporter/IssueReporterProvider.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/acquisition/AcquisitionAccordion.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 15
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/acquisition/AcquisitionHeaderCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/acquisition/AcquisitionLedgerGrid.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 12
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/acquisition/AcquisitionReconciliation.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/acquisition/NapkinAcquisitionAccordion.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/AdminModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/BenchmarksPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/admin/CostLibraryPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/admin/DMSAdminPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/admin/ExportButton.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/ExtractionMappingAdmin.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 14
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/LandscaperAdminPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 12
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 13
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/admin/PicklistEditor.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/PicklistItemModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/PreferencesPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 12
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 11
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/admin/ReportConfiguratorPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ⚠️ UNKNOWN

FILE: src/components/admin/ReportTemplateCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 6
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/ReportTemplateEditorModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/SystemPicklistsAccordion.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/admin/UserManagementPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 2
  CSS variables: 25
  Tailwind colors: 114
  Hardcoded hex: 0
  Inline styles: 21
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/analysis/SfCompsTile.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 26
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/analysis/cashflow/CashFlowAnalysisTab.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 19
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 12
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/analysis/cashflow/CashFlowPhaseTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 27
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 33
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/analysis/cashflow/CashFlowSummaryMetrics.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 9
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/analysis/cashflow/CashFlowTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 12
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 12
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/analysis/cashflow/CostGranularityToggle.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/analysis/cashflow/TimeScaleSelector.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/analysis/validation/ValidationReport.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 45
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 42
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/auth/ProtectedRoute.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 1
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/AISuggestionsSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 14
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/AddBenchmarkModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/BenchmarkAccordion.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 91
  Tailwind colors: 26
  Hardcoded hex: 3
  Inline styles: 90
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/BenchmarksFlyout.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/benchmarks/GrowthRateCategoryPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 13
  Hardcoded hex: 2
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/GrowthRateStepEditor.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/GrowthRateWizard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/benchmarks/LandscaperPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/benchmarks/products/ProductLibraryPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 18
  Tailwind colors: 19
  Hardcoded hex: 0
  Inline styles: 16
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/unit-costs/InlineEditableCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 50
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 33
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/benchmarks/unit-costs/UnitCostsPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 22
  Hardcoded hex: 8
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/BasicBudgetTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/BudgetContainer.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/BudgetDataGrid.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 8
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/BudgetGanttGrid.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/BudgetGridTab.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 7
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/BudgetHealthWidget.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/BudgetItemModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/BudgetItemModalV2.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/CategoryCascadingDropdown.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/CategoryTemplateManager.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/CategoryTreeManager.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 6
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/ColumnDefinitions.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 14
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/CostCategoriesTab.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/CreateTemplateModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/CustomColumns.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/EditConfirmationDialog.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/FiltersAccordion.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 3
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/GanttChart.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 28
  Tailwind colors: 0
  Hardcoded hex: 7
  Inline styles: 23
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/GanttEditModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/IncompleteCategoriesReminder.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 3
  CSS variables: 0
  Tailwind colors: 16
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/ModeSelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/QuickAddCategoryModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 6
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/ReconciliationModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/SimpleBudgetGrid.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/TemplateEditorModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/TimelineChartPeriods.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 3
  Hardcoded hex: 14
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/TimelineTab.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/VarianceAlertModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/VarianceWarningBadge.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/custom/BudgetGridWithTimeline.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/custom/CategoryEditorRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/custom/ColoredDotIndicator.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 4
  Inline styles: 8
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/custom/ColumnChooser.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 41
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/custom/DataGrid.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/custom/EditableCategoryCell.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/custom/EditableCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/custom/ExpandableDetailsRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 12
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/custom/GroupRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 8
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/custom/PhaseCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ⚠️ UNKNOWN

FILE: src/components/budget/custom/TimelineChart.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 7
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/budget/fields/FieldRenderer.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 16
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/tiles/CostControlsTile.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 6
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/budget/tiles/TimingEscalationTile.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 12
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 11
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/CapitalizationSubNav.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/DebtFacilitiesTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/DebtFacilityModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/DeveloperFeeModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 95
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/capitalization/DeveloperFeesTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/DrawScheduleTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/EquityPartnersTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/ManagementOverheadTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/MetricCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/NapkinWaterfallForm.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 10
  Inline styles: 21
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/capitalization/OverheadItemModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 32
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/capitalization/PartnerSummaryCards.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/capitalization/WaterfallDistributionTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 48
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 84
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/capitalization/WaterfallResults.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 14
  Tailwind colors: 0
  Hardcoded hex: 6
  Inline styles: 50
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/capitalization/WaterfallStructureTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/common/UOMSelect.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/contacts/ContactDetailPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/contacts/ContactModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/contacts/ContactTypeahead.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/contacts/RelationshipManager.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/copilot/CopilotProvider.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/dashboard/CompletenessBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 6
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dashboard/CompletenessModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 9
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dashboard/DashboardChat.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/dashboard/ProjectTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 30
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/diligence/DiligenceBlocks.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ⚠️ UNKNOWN

FILE: src/components/dms/DMSView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 41
  Tailwind colors: 27
  Hardcoded hex: 0
  Inline styles: 35
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/ProcessingStatus.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 24
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/admin/AttrBuilder.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 96
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/admin/TemplateDesigner.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 107
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/filters/AccordionFilters.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 18
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/dms/filters/DocTypeFilters.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 17
  Hardcoded hex: 4
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/filters/ProjectSelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/filters/SmartFilterBuilder.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 103
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/folders/FolderEditor.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/folders/FolderTree.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 8
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 7
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/list/ColumnChooser.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 26
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/list/DocumentTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 74
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/list/PlatformKnowledgeAccordion.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 81
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/list/PlatformKnowledgeTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 71
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/modals/DeleteConfirmModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/dms/modals/DocumentChatModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/dms/modals/PlatformKnowledgeChatModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/dms/modals/PlatformKnowledgeModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 44
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/modals/RenameModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/dms/modals/UploadCollisionModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/dms/panels/DmsLandscaperPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 33
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/preview/DocumentPreview.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 137
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/preview/PlatformKnowledgePreview.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 114
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/profile/DocCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 108
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/profile/PlatformKnowledgeProfileForm.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 76
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/profile/ProfileForm.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 61
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/profile/TagInput.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 29
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/profile/VersionTimeline.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 52
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/search/Facets.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 53
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/search/HighlightedText.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/search/ResultsTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 171
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/search/SearchBox.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 13
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/shared/DMSLayout.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 7
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/upload/Dropzone.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 45
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/upload/Queue.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 54
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/views/DocumentPreviewPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 121
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/dms/views/FilterDetailView.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 98
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/documents/CorrectionModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 6
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/extraction/StagingModal.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/feasibility/ComparableModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/feasibility/ComparablesTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 7
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/feasibility/FeasibilitySubNav.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/feasibility/MarketDataContent.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/feasibility/SensitivityAnalysisContent.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 16
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 22
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/icons/LandscaperIcon.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/ingestion/DocumentCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/ingestion/DocumentIngestion.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 6
  Inline styles: 12
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/ingestion/IngestionChat.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/ingestion/MilestoneBar.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 8
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/ingestion/PropertyOverview.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 18
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/ActivityFeed.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 5
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/landscaper/ActivityFeedItem.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 30
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/landscaper/AdviceAdherencePanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/CalculatedFieldRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/ChatInterface.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/ChatMessageBubble.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 5
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/landscaper/DataTableModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 11
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/landscaper/ExtractionFieldRow.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 19
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/ExtractionReviewModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/ExtractionValidation.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/LandscaperChat.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 20
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 14
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/landscaper/LandscaperPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 10
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/landscaper/LandscaperProgress.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/landscaper/MutationProposalCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 11
  Inline styles: 7
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/landscaper/UnitMixAccordion.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/landscaper/VarianceItem.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/map/MapOblique.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 8
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/map/ProjectTabMap.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 27
  Tailwind colors: 0
  Hardcoded hex: 9
  Inline styles: 21
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/map/PropertyTabMapWithComps.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 13
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/map/ValuationSalesCompMap.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 19
  Tailwind colors: 0
  Hardcoded hex: 16
  Inline styles: 18
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/market/AddCompetitorModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ⚠️ UNKNOWN

FILE: src/components/market/CompetitiveProjectsPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 11
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/CommercialPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 19
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 21
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/CompDetailsSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 12
  Tailwind colors: 0
  Hardcoded hex: 18
  Inline styles: 20
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/InfrastructurePanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 22
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 48
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/napkin/LandscaperPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 14
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 12
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/MdrPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 22
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 25
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/NapkinAnalysisPage.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 8
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/NapkinAttachedPricing.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 18
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 27
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/NapkinCompsMap.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 20
  Tailwind colors: 0
  Hardcoded hex: 27
  Inline styles: 23
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/NapkinSfdPricing.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 19
  Tailwind colors: 0
  Hardcoded hex: 18
  Inline styles: 29
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/PromoteModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/napkin/RlvSummaryCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 22
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 22
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/napkin/SfdPricingPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 40
  Tailwind colors: 0
  Hardcoded hex: 5
  Inline styles: 46
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/AddButton.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/DetailSummaryToggle.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/DraggableOpexSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 14
  Inline styles: 22
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/EGISubtotalBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 11
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/EvidenceCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/GrowthBadge.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/InputCell.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/InventoryStatsPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 14
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/NOITotalBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/OpExModeSelector.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 2
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/OperatingExpensesSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/OperationsHeader.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/operations/OtherIncomeSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 10
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/RentalIncomeSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 14
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/SectionCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/SummaryBar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/VacancyDeductionsSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 11
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/ValueAddAccordion.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/operations/ValueAddCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 3
  Inline styles: 3
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/operations/ValueAddToggle.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/phases/PhaseTransition.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 4
  Inline styles: 7
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/project/ActivityFeed.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/GranularityIndicators.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/MetricCard.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/MilestoneTimeline.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/ProfileField.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/project/ProjectDates.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/ProjectLandUseLabels.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 39
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/project/ProjectProfileEditModal.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/ProjectProfileTile.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 9
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/project/ProjectSubNav.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/projects/InflationRateDisplay.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/projects/LifecycleTileNav.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 3
  Inline styles: 4
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/contacts/AddContactModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 28
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/contacts/ContactCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 31
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/contacts/ContactRoleCard.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 10
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/projects/contacts/ContactsSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 1
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/contacts/ProjectContactsSection.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/projects/onboarding/ModelReadinessDisplay.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 49
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/onboarding/NewProjectChannelTabs.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 16
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/onboarding/NewProjectChat.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 46
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/onboarding/NewProjectDropZone.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 74
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/onboarding/NewProjectFieldTable.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 19
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/onboarding/NewProjectOnboardingModal.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 22
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/projects/onboarding/SimplifiedChannelView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 17
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/reports/ExtractionFilterPills.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 3
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/reports/ExtractionHistoryPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/reports/ExtractionHistoryReport.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 1
  Inline styles: 5
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/reports/PropertySummaryView.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 34
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/AnnualInventoryGauge.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 11
  Tailwind colors: 0
  Hardcoded hex: 12
  Inline styles: 13
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/CreateSalePhaseModal.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 4
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/FilterSidebar.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 2
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/sales/ParcelSalesTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 47
  Tailwind colors: 0
  Hardcoded hex: 28
  Inline styles: 35
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/PhaseTiles.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 9
  Tailwind colors: 7
  Hardcoded hex: 0
  Inline styles: 9
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/PricingTable.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 46
  Tailwind colors: 3
  Hardcoded hex: 28
  Inline styles: 28
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/SaleCalculationModal.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 44
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 23
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/sales/SaleDetailForm.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 32
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/SaleTransactionDetails.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 2
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/sales/SalesContent.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 4
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/sales/SaveBenchmarkModal.tsx
  CoreUI imports: 0
  MUI imports: 1
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 6
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/sales/TransactionColumn.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 5
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/sales/TransactionGrid.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ⚠️ UNKNOWN

FILE: src/components/scenarios/ScenarioChipManager.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 4
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/scenarios/ScenarioComparison.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 4
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/shared/AccordionSection.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/shared/AreaTiles.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 13
  Tailwind colors: 7
  Hardcoded hex: 0
  Inline styles: 13
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/shared/ModeToggle.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 10
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/studio/LandscaperPanel.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 20
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 15
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/studio/StudioPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/studio/TileGrid.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 4
  Inline styles: 6
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/studio/layout/StudioLayout.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 7
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/taxonomy/FamilyDetails.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 22
  Tailwind colors: 0
  Hardcoded hex: 17
  Inline styles: 20
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/taxonomy/FamilyTree.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 5
  Inline styles: 14
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/taxonomy/ProductsList.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 26
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 23
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/ui/ModeChip.tsx
  CoreUI imports: 1
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/ui/PageHeader.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 3
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 3
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/ui/alert.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/badge.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/button.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/card.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/dialog.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/input.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/label.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/landscape/DataTable.tsx
  CoreUI imports: 2
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 1
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/ui/landscape/LandscapeButton.tsx
  CoreUI imports: 2
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/ui/landscape/StatusChip.tsx
  CoreUI imports: 2
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CoreUI)

FILE: src/components/ui/radio-group.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/select.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 1
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/ui/sheet.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/table.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/tabs.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 1
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/textarea.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 0
  STATUS: ⚠️ UNKNOWN

FILE: src/components/ui/toast.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 0
  Tailwind colors: 0
  Hardcoded hex: 3
  Inline styles: 2
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/valuation/income-approach/AssumptionsPanel.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 31
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 22
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/valuation/income-approach/DirectCapView.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 60
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 56
  STATUS: ✅ COMPLIANT (CSS vars)

FILE: src/components/valuation/income-approach/SensitivityMatrix.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 26
  Tailwind colors: 2
  Hardcoded hex: 0
  Inline styles: 15
  STATUS: ❌ NEEDS MIGRATION

FILE: src/components/valuation/income-approach/ValueTiles.tsx
  CoreUI imports: 0
  MUI imports: 0
  shadcn/radix: 0
  CSS variables: 6
  Tailwind colors: 0
  Hardcoded hex: 0
  Inline styles: 12
  STATUS: ✅ COMPLIANT (CSS vars)

## SECTION 3: DARK MODE SUPPORT CHECK

❌ src/app/admin/benchmarks/cost-library/page.tsx (NO dark mode, has 6 color refs)
❌ src/app/admin/benchmarks/page.tsx (NO dark mode, has 17 color refs)
✅ src/app/admin/dms/templates/page.tsx (dark:22, attr:0, class:0)
❌ src/app/admin/preferences/components/ActivityFilter.tsx (NO dark mode, has 1 color refs)
❌ src/app/admin/preferences/components/AddCategoryModal.tsx (NO dark mode, has 8 color refs)
❌ src/app/admin/preferences/components/AddUOMRow.tsx (NO dark mode, has 2 color refs)
❌ src/app/admin/preferences/components/CategoryDetailPanel.tsx (NO dark mode, has 20 color refs)
❌ src/app/admin/preferences/components/CategoryTree.tsx (NO dark mode, has 1 color refs)
❌ src/app/admin/preferences/components/CategoryTreeView.tsx (NO dark mode, has 1 color refs)
❌ src/app/admin/preferences/components/CreateTagModal.tsx (NO dark mode, has 8 color refs)
❌ src/app/admin/preferences/components/DeleteConfirmationModal.tsx (NO dark mode, has 10 color refs)
❌ src/app/admin/preferences/components/DeleteUOMModal.tsx (NO dark mode, has 1 color refs)
❌ src/app/admin/preferences/components/MobileWarning.tsx (NO dark mode, has 3 color refs)
❌ src/app/admin/preferences/components/UOMRow.tsx (NO dark mode, has 9 color refs)
❌ src/app/admin/preferences/components/UOMTable.tsx (NO dark mode, has 5 color refs)
❌ src/app/admin/preferences/components/UnitCostCategoryManager.tsx (NO dark mode, has 6 color refs)
❌ src/app/admin/preferences/page.tsx (NO dark mode, has 7 color refs)
❌ src/app/admin/users/components/UserModals.tsx (NO dark mode, has 80 color refs)
❌ src/app/admin/users/page.tsx (NO dark mode, has 31 color refs)
❌ src/app/components/AI/DocumentReview.tsx (NO dark mode, has 65 color refs)
❌ src/app/components/Admin/CategoryTree.tsx (NO dark mode, has 24 color refs)
❌ src/app/components/Admin/LandUseInputTable.tsx (NO dark mode, has 99 color refs)
❌ src/app/components/Admin/LandUseInputTableTanStack.tsx (NO dark mode, has 74 color refs)
❌ src/app/components/Admin/LandUseManagement.tsx (NO dark mode, has 62 color refs)
❌ src/app/components/AdminNavBar.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/Archive/PlanningContentGrid.tsx (NO dark mode, has 23 color refs)
❌ src/app/components/Archive/PlanningContentHot.tsx (NO dark mode, has 14 color refs)
❌ src/app/components/Budget/BudgetContainerView.tsx (NO dark mode, has 46 color refs)
❌ src/app/components/Budget/BudgetContent.tsx (NO dark mode, has 48 color refs)
❌ src/app/components/Budget/BudgetGrid.tsx (NO dark mode, has 13 color refs)
❌ src/app/components/Budget/BudgetGridDark.tsx (NO dark mode, has 71 color refs)
❌ src/app/components/Budget/BudgetGridDarkWrapper.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/ContainerManagement/ProjectSetupWizard.tsx (NO dark mode, has 53 color refs)
✅ src/app/components/CoreUIThemeProvider.tsx (dark:0, attr:5, class:0)
❌ src/app/components/DVLTimeSeries.tsx (NO dark mode, has 9 color refs)
❌ src/app/components/DevStatus/DevStatus.tsx (NO dark mode, has 155 color refs)
❌ src/app/components/Documentation/MarkdownViewer.tsx (NO dark mode, has 34 color refs)
❌ src/app/components/Documents/DocumentManagement.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/DynamicBreadcrumb.tsx (NO dark mode, has 6 color refs)
❌ src/app/components/FilterableSelect.tsx (NO dark mode, has 10 color refs)
❌ src/app/components/GIS/AssessorDataMapping.tsx (NO dark mode, has 37 color refs)
❌ src/app/components/GIS/GISSetupWorkflow.tsx (NO dark mode, has 24 color refs)
❌ src/app/components/GIS/PlanNavigation.tsx (NO dark mode, has 58 color refs)
❌ src/app/components/GIS/ProjectBoundarySetup.tsx (NO dark mode, has 33 color refs)
✅ src/app/components/GIS/ProjectDocumentUploads.tsx (dark:3, attr:0, class:0)
❌ src/app/components/GIS/PropertyPackageUpload.tsx (NO dark mode, has 146 color refs)
❌ src/app/components/Glossary/ZoningGlossaryAdmin.tsx (NO dark mode, has 51 color refs)
❌ src/app/components/GrowthRateDetail/index.tsx (NO dark mode, has 17 color refs)
❌ src/app/components/GrowthRates-Original.tsx (NO dark mode, has 11 color refs)
❌ src/app/components/GrowthRates.tsx (NO dark mode, has 34 color refs)
❌ src/app/components/Home/HomeOverview.tsx (NO dark mode, has 68 color refs)
❌ src/app/components/Home/UnderConstruction.tsx (NO dark mode, has 27 color refs)
❌ src/app/components/LandUse/InlineTaxonomySelector.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/LandUse/LandUseCanvas.tsx (NO dark mode, has 31 color refs)
❌ src/app/components/LandUse/LandUseDetails.tsx (NO dark mode, has 61 color refs)
❌ src/app/components/LandUse/LandUseMatchWizard.tsx (NO dark mode, has 42 color refs)
❌ src/app/components/LandUse/LandUseSchema.tsx (NO dark mode, has 25 color refs)
❌ src/app/components/LandUse/SimpleTaxonomySelector.tsx (NO dark mode, has 8 color refs)
❌ src/app/components/LandUse/TaxonomySelector.tsx (NO dark mode, has 17 color refs)
❌ src/app/components/LandUsePricing/index.tsx (NO dark mode, has 27 color refs)
❌ src/app/components/LandscaperChatModal.tsx (NO dark mode, has 6 color refs)
❌ src/app/components/MapLibre/GISMap.tsx (NO dark mode, has 70 color refs)
❌ src/app/components/MapView.tsx (NO dark mode, has 5 color refs)
❌ src/app/components/Market/MarketAssumptions.tsx (NO dark mode, has 71 color refs)
✅ src/app/components/Market/MarketMapView.tsx (dark:1, attr:0, class:0)
❌ src/app/components/MarketAssumptions.tsx (NO dark mode, has 5 color refs)
❌ src/app/components/MarketAssumptionsComparison.tsx (NO dark mode, has 3 color refs)
❌ src/app/components/MarketAssumptionsMUI.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/MarketAssumptionsNative.tsx (NO dark mode, has 58 color refs)
❌ src/app/components/MarketFactors/index.tsx (NO dark mode, has 42 color refs)
❌ src/app/components/Migration/TaxonomyMigration.tsx (NO dark mode, has 37 color refs)
❌ src/app/components/Navigation.tsx (NO dark mode, has 10 color refs)
✅ src/app/components/NewProject/BasicInfoStep.tsx (dark:15, attr:0, class:0)
✅ src/app/components/NewProject/PropertyTypeStep.tsx (dark:7, attr:0, class:0)
✅ src/app/components/NewProject/TemplateStep.tsx (dark:14, attr:0, class:0)
❌ src/app/components/NewProjectModal.tsx (NO dark mode, has 51 color refs)
❌ src/app/components/OpExHierarchy.tsx (NO dark mode, has 53 color refs)
❌ src/app/components/Planning/CollapsibleSection.tsx (NO dark mode, has 3 color refs)
❌ src/app/components/Planning/PlanningContent.tsx (NO dark mode, has 96 color refs)
❌ src/app/components/Planning/PlanningOverviewControls.tsx (NO dark mode, has 30 color refs)
✅ src/app/components/PlanningWizard/AddContainerModal.tsx (dark:11, attr:0, class:0)
❌ src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx (NO dark mode, has 10 color refs)
✅ src/app/components/PlanningWizard/ContainerTreeView.tsx (dark:4, attr:0, class:0)
✅ src/app/components/PlanningWizard/DraggableContainerNode.tsx (dark:26, attr:0, class:0)
❌ src/app/components/PlanningWizard/DraggableTile.tsx (NO dark mode, has 6 color refs)
❌ src/app/components/PlanningWizard/DropZone.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/PlanningWizard/NavigationTiles.tsx (NO dark mode, has 22 color refs)
❌ src/app/components/PlanningWizard/ParcelTile.tsx (NO dark mode, has 37 color refs)
❌ src/app/components/PlanningWizard/PhaseCanvas.tsx (NO dark mode, has 7 color refs)
❌ src/app/components/PlanningWizard/PhaseCanvasInline.tsx (NO dark mode, has 34 color refs)
❌ src/app/components/PlanningWizard/PlanningWizard.tsx (NO dark mode, has 32 color refs)
❌ src/app/components/PlanningWizard/PlanningWizardInline.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/PlanningWizard/ProjectCanvas.tsx (NO dark mode, has 65 color refs)
❌ src/app/components/PlanningWizard/ProjectCanvasInline.tsx (NO dark mode, has 35 color refs)
❌ src/app/components/PlanningWizard/Sidebar.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/PlanningWizard/cards/AreaDetailCard.tsx (NO dark mode, has 24 color refs)
❌ src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx (NO dark mode, has 40 color refs)
❌ src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx (NO dark mode, has 20 color refs)
❌ src/app/components/PlanningWizard/forms/AreaForm.tsx (NO dark mode, has 19 color refs)
❌ src/app/components/PlanningWizard/forms/ParcelForm.tsx (NO dark mode, has 58 color refs)
❌ src/app/components/PlanningWizard/forms/PhaseForm.tsx (NO dark mode, has 19 color refs)
❌ src/app/components/PreferencesContextBar.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/ProjectContextBar.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/ProjectCosts/index.tsx (NO dark mode, has 12 color refs)
❌ src/app/components/Setup/ProjectStructureChoice.tsx (NO dark mode, has 34 color refs)
❌ src/app/components/Setup/ProjectTaxonomyWizard.tsx (NO dark mode, has 56 color refs)
❌ src/app/components/TaxonomySelector/TaxonomySelector.tsx (NO dark mode, has 7 color refs)
✅ src/app/components/ThemeSwitcher.tsx (dark:1, attr:0, class:0)
❌ src/app/components/ThemeToggle.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/TimelineVisualization.tsx (NO dark mode, has 21 color refs)
❌ src/app/components/TopNavigationBar.tsx (NO dark mode, has 6 color refs)
✅ src/app/components/UniversalInventory/UniversalInventoryTable.tsx (dark:5, attr:0, class:0)
❌ src/app/components/assumptions/FieldRenderer.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/card-statistics/Vertical.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/dashboard/DashboardMap.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/dashboard/TriageModal.tsx (NO dark mode, has 30 color refs)
❌ src/app/components/dashboard/UserTile.tsx (NO dark mode, has 13 color refs)
❌ src/app/components/layout/shared/Logo.tsx (NO dark mode, has 3 color refs)
❌ src/app/components/layout/shared/ModeDropdown.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/layout/shared/search/index.tsx (NO dark mode, has 3 color refs)
❌ src/app/components/layout/vertical/FooterContent.tsx (NO dark mode, has 5 color refs)
❌ src/app/components/layout/vertical/NavToggle.tsx (NO dark mode, has 2 color refs)
❌ src/app/components/layout/vertical/NavbarContent.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/layout/vertical/Navigation.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/layout/vertical/VerticalMenu.tsx (NO dark mode, has 8 color refs)
❌ src/app/components/navigation/SandboxDropdown.tsx (NO dark mode, has 5 color refs)
❌ src/app/components/navigation/SettingsDropdown.tsx (NO dark mode, has 2 color refs)
❌ src/app/components/navigation/UserMenuDropdown.tsx (NO dark mode, has 13 color refs)
❌ src/app/components/new-project/AIDocumentPrompt.tsx (NO dark mode, has 1 color refs)
❌ src/app/components/new-project/AssetTypeSection.tsx (NO dark mode, has 10 color refs)
❌ src/app/components/new-project/Badge.tsx (NO dark mode, has 6 color refs)
❌ src/app/components/new-project/ConfigureSection.tsx (NO dark mode, has 14 color refs)
❌ src/app/components/new-project/FloatingLabelInput.tsx (NO dark mode, has 7 color refs)
❌ src/app/components/new-project/LandscaperPanel.tsx (NO dark mode, has 20 color refs)
❌ src/app/components/new-project/LocationSection.tsx (NO dark mode, has 28 color refs)
❌ src/app/components/new-project/MapPinSelector.tsx (NO dark mode, has 14 color refs)
❌ src/app/components/new-project/PathCard.tsx (NO dark mode, has 8 color refs)
❌ src/app/components/new-project/ProjectSummaryPreview.tsx (NO dark mode, has 4 color refs)
❌ src/app/components/new-project/PropertyDataSection.tsx (NO dark mode, has 19 color refs)
❌ src/app/components/stepper-dot/index.tsx (NO dark mode, has 2 color refs)
✅ src/app/components/theme/index.tsx (dark:3, attr:0, class:0)
❌ src/app/preferences/layout.tsx (NO dark mode, has 1 color refs)
❌ src/app/projects/[projectId]/components/landscaper/AgentModal.tsx (NO dark mode, has 13 color refs)
❌ src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx (NO dark mode, has 13 color refs)
❌ src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx (NO dark mode, has 35 color refs)
❌ src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx (NO dark mode, has 13 color refs)
❌ src/app/projects/[projectId]/settings/page.tsx (NO dark mode, has 2 color refs)
❌ src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx (NO dark mode, has 14 color refs)
❌ src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx (NO dark mode, has 17 color refs)
❌ src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx (NO dark mode, has 8 color refs)
❌ src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx (NO dark mode, has 33 color refs)
❌ src/app/prototypes/multifam/rent-roll-inputs/components/CategoryPanel.tsx (NO dark mode, has 5 color refs)
❌ src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx (NO dark mode, has 18 color refs)
❌ src/app/rent-roll/components/FloorplanUpdateDialog.tsx (NO dark mode, has 10 color refs)
❌ src/app/settings/budget-categories/page.tsx (NO dark mode, has 1 color refs)
❌ src/app/settings/contact-roles/page.tsx (NO dark mode, has 15 color refs)
❌ src/app/settings/profile/page.tsx (NO dark mode, has 64 color refs)
❌ src/components/IssueReporter/IssueReporterButton.tsx (NO dark mode, has 2 color refs)
❌ src/components/IssueReporter/IssueReporterDialog.tsx (NO dark mode, has 17 color refs)
❌ src/components/acquisition/AcquisitionAccordion.tsx (NO dark mode, has 19 color refs)
❌ src/components/acquisition/AcquisitionHeaderCard.tsx (NO dark mode, has 3 color refs)
❌ src/components/acquisition/AcquisitionLedgerGrid.tsx (NO dark mode, has 12 color refs)
❌ src/components/acquisition/AcquisitionReconciliation.tsx (NO dark mode, has 4 color refs)
❌ src/components/acquisition/NapkinAcquisitionAccordion.tsx (NO dark mode, has 4 color refs)
❌ src/components/admin/AdminModal.tsx (NO dark mode, has 1 color refs)
❌ src/components/admin/BenchmarksPanel.tsx (NO dark mode, has 3 color refs)
❌ src/components/admin/ExtractionMappingAdmin.tsx (NO dark mode, has 12 color refs)
❌ src/components/admin/LandscaperAdminPanel.tsx (NO dark mode, has 6 color refs)
❌ src/components/admin/PicklistEditor.tsx (NO dark mode, has 10 color refs)
❌ src/components/admin/PreferencesPanel.tsx (NO dark mode, has 5 color refs)
❌ src/components/admin/ReportConfiguratorPanel.tsx (NO dark mode, has 6 color refs)
❌ src/components/admin/ReportTemplateCard.tsx (NO dark mode, has 5 color refs)
❌ src/components/admin/ReportTemplateEditorModal.tsx (NO dark mode, has 6 color refs)
❌ src/components/admin/SystemPicklistsAccordion.tsx (NO dark mode, has 6 color refs)
❌ src/components/admin/UserManagementPanel.tsx (NO dark mode, has 95 color refs)
❌ src/components/analysis/SfCompsTile.tsx (NO dark mode, has 33 color refs)
❌ src/components/analysis/cashflow/CashFlowAnalysisTab.tsx (NO dark mode, has 21 color refs)
❌ src/components/analysis/cashflow/CashFlowPhaseTable.tsx (NO dark mode, has 13 color refs)
❌ src/components/analysis/cashflow/CashFlowSummaryMetrics.tsx (NO dark mode, has 2 color refs)
❌ src/components/analysis/cashflow/CashFlowTable.tsx (NO dark mode, has 9 color refs)
❌ src/components/analysis/validation/ValidationReport.tsx (NO dark mode, has 27 color refs)
❌ src/components/auth/ProtectedRoute.tsx (NO dark mode, has 3 color refs)
❌ src/components/benchmarks/AISuggestionsSection.tsx (NO dark mode, has 24 color refs)
❌ src/components/benchmarks/AddBenchmarkModal.tsx (NO dark mode, has 41 color refs)
✅ src/components/benchmarks/BenchmarkAccordion.tsx (dark:12, attr:0, class:0)
❌ src/components/benchmarks/BenchmarksFlyout.tsx (NO dark mode, has 27 color refs)
❌ src/components/benchmarks/GrowthRateCategoryPanel.tsx (NO dark mode, has 63 color refs)
❌ src/components/benchmarks/GrowthRateStepEditor.tsx (NO dark mode, has 37 color refs)
❌ src/components/benchmarks/GrowthRateWizard.tsx (NO dark mode, has 27 color refs)
❌ src/components/benchmarks/LandscaperPanel.tsx (NO dark mode, has 17 color refs)
❌ src/components/benchmarks/absorption/AbsorptionVelocityPanel.tsx (NO dark mode, has 28 color refs)
❌ src/components/benchmarks/products/ProductLibraryPanel.tsx (NO dark mode, has 68 color refs)
❌ src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx (NO dark mode, has 5 color refs)
❌ src/components/benchmarks/unit-costs/InlineEditableCell.tsx (NO dark mode, has 6 color refs)
❌ src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx (NO dark mode, has 6 color refs)
❌ src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx (NO dark mode, has 39 color refs)
❌ src/components/benchmarks/unit-costs/UnitCostsPanel.tsx (NO dark mode, has 91 color refs)
❌ src/components/budget/BasicBudgetTable.tsx (NO dark mode, has 6 color refs)
❌ src/components/budget/BudgetDataGrid.tsx (NO dark mode, has 1 color refs)
❌ src/components/budget/BudgetGridTab.tsx (NO dark mode, has 5 color refs)
❌ src/components/budget/BudgetHealthWidget.tsx (NO dark mode, has 15 color refs)
❌ src/components/budget/BudgetItemModal.tsx (NO dark mode, has 2 color refs)
❌ src/components/budget/BudgetItemModalV2.tsx (NO dark mode, has 12 color refs)
❌ src/components/budget/CategoryCascadingDropdown.tsx (NO dark mode, has 5 color refs)
❌ src/components/budget/CategoryTemplateManager.tsx (NO dark mode, has 12 color refs)
❌ src/components/budget/CategoryTreeManager.tsx (NO dark mode, has 15 color refs)
❌ src/components/budget/ColumnDefinitions.tsx (NO dark mode, has 30 color refs)
❌ src/components/budget/CostCategoriesTab.tsx (NO dark mode, has 5 color refs)
❌ src/components/budget/CreateTemplateModal.tsx (NO dark mode, has 3 color refs)
❌ src/components/budget/CustomColumns.tsx (NO dark mode, has 2 color refs)
❌ src/components/budget/EditConfirmationDialog.tsx (NO dark mode, has 15 color refs)
❌ src/components/budget/FiltersAccordion.tsx (NO dark mode, has 13 color refs)
❌ src/components/budget/GanttChart.tsx (NO dark mode, has 30 color refs)
❌ src/components/budget/GanttEditModal.tsx (NO dark mode, has 9 color refs)
✅ src/components/budget/IncompleteCategoriesReminder.tsx (dark:5, attr:0, class:0)
❌ src/components/budget/ModeSelector.tsx (NO dark mode, has 1 color refs)
❌ src/components/budget/QuickAddCategoryModal.tsx (NO dark mode, has 5 color refs)
❌ src/components/budget/ReconciliationModal.tsx (NO dark mode, has 25 color refs)
❌ src/components/budget/TemplateEditorModal.tsx (NO dark mode, has 6 color refs)
✅ src/components/budget/TimelineChartPeriods.tsx (dark:1, attr:0, class:0)
❌ src/components/budget/TimelineTab.tsx (NO dark mode, has 2 color refs)
❌ src/components/budget/VarianceAlertModal.tsx (NO dark mode, has 10 color refs)
❌ src/components/budget/custom/CategoryEditorRow.tsx (NO dark mode, has 2 color refs)
❌ src/components/budget/custom/ColoredDotIndicator.tsx (NO dark mode, has 6 color refs)
✅ src/components/budget/custom/ColumnChooser.tsx (dark:14, attr:0, class:0)
❌ src/components/budget/custom/EditableCategoryCell.tsx (NO dark mode, has 3 color refs)
❌ src/components/budget/custom/EditableCell.tsx (NO dark mode, has 14 color refs)
❌ src/components/budget/custom/ExpandableDetailsRow.tsx (NO dark mode, has 3 color refs)
❌ src/components/budget/custom/GroupRow.tsx (NO dark mode, has 12 color refs)
❌ src/components/budget/custom/PhaseCell.tsx (NO dark mode, has 1 color refs)
❌ src/components/budget/custom/TimelineChart.tsx (NO dark mode, has 9 color refs)
❌ src/components/budget/fields/FieldRenderer.tsx (NO dark mode, has 10 color refs)
❌ src/components/budget/tiles/CostControlsTile.tsx (NO dark mode, has 3 color refs)
❌ src/components/budget/tiles/TimingEscalationTile.tsx (NO dark mode, has 15 color refs)
❌ src/components/capitalization/CapitalizationSubNav.tsx (NO dark mode, has 1 color refs)
❌ src/components/capitalization/DebtFacilitiesTable.tsx (NO dark mode, has 1 color refs)
✅ src/components/capitalization/DeveloperFeeModal.tsx (dark:27, attr:0, class:0)
❌ src/components/capitalization/DeveloperFeesTable.tsx (NO dark mode, has 1 color refs)
❌ src/components/capitalization/DrawScheduleTable.tsx (NO dark mode, has 1 color refs)
❌ src/components/capitalization/EquityPartnersTable.tsx (NO dark mode, has 1 color refs)
❌ src/components/capitalization/ManagementOverheadTable.tsx (NO dark mode, has 13 color refs)
❌ src/components/capitalization/MetricCard.tsx (NO dark mode, has 3 color refs)
❌ src/components/capitalization/NapkinWaterfallForm.tsx (NO dark mode, has 10 color refs)
✅ src/components/capitalization/OverheadItemModal.tsx (dark:12, attr:0, class:0)
❌ src/components/capitalization/PartnerSummaryCards.tsx (NO dark mode, has 3 color refs)
❌ src/components/capitalization/WaterfallDistributionTable.tsx (NO dark mode, has 122 color refs)
❌ src/components/capitalization/WaterfallResults.tsx (NO dark mode, has 40 color refs)
❌ src/components/capitalization/WaterfallStructureTable.tsx (NO dark mode, has 2 color refs)
❌ src/components/contacts/ContactDetailPanel.tsx (NO dark mode, has 36 color refs)
❌ src/components/contacts/ContactModal.tsx (NO dark mode, has 6 color refs)
❌ src/components/contacts/ContactTypeahead.tsx (NO dark mode, has 7 color refs)
❌ src/components/contacts/RelationshipManager.tsx (NO dark mode, has 11 color refs)
❌ src/components/dashboard/CompletenessBar.tsx (NO dark mode, has 6 color refs)
❌ src/components/dashboard/CompletenessModal.tsx (NO dark mode, has 22 color refs)
❌ src/components/dashboard/DashboardChat.tsx (NO dark mode, has 7 color refs)
❌ src/components/dashboard/ProjectTable.tsx (NO dark mode, has 35 color refs)
✅ src/components/dms/DMSView.tsx (dark:12, attr:0, class:0)
❌ src/components/dms/ProcessingStatus.tsx (NO dark mode, has 33 color refs)
✅ src/components/dms/admin/AttrBuilder.tsx (dark:30, attr:0, class:0)
✅ src/components/dms/admin/TemplateDesigner.tsx (dark:36, attr:0, class:0)
❌ src/components/dms/filters/AccordionFilters.tsx (NO dark mode, has 14 color refs)
✅ src/components/dms/filters/DocTypeFilters.tsx (dark:8, attr:0, class:0)
✅ src/components/dms/filters/ProjectSelector.tsx (dark:2, attr:0, class:0)
✅ src/components/dms/filters/SmartFilterBuilder.tsx (dark:39, attr:0, class:0)
❌ src/components/dms/folders/FolderEditor.tsx (NO dark mode, has 5 color refs)
❌ src/components/dms/folders/FolderTree.tsx (NO dark mode, has 7 color refs)
✅ src/components/dms/list/ColumnChooser.tsx (dark:8, attr:0, class:0)
✅ src/components/dms/list/DocumentTable.tsx (dark:34, attr:0, class:0)
✅ src/components/dms/list/PlatformKnowledgeAccordion.tsx (dark:17, attr:0, class:0)
✅ src/components/dms/list/PlatformKnowledgeTable.tsx (dark:30, attr:0, class:0)
❌ src/components/dms/modals/DeleteConfirmModal.tsx (NO dark mode, has 4 color refs)
❌ src/components/dms/modals/DocumentChatModal.tsx (NO dark mode, has 9 color refs)
❌ src/components/dms/modals/PlatformKnowledgeChatModal.tsx (NO dark mode, has 10 color refs)
✅ src/components/dms/modals/PlatformKnowledgeModal.tsx (dark:16, attr:0, class:0)
❌ src/components/dms/modals/RenameModal.tsx (NO dark mode, has 1 color refs)
❌ src/components/dms/modals/UploadCollisionModal.tsx (NO dark mode, has 6 color refs)
✅ src/components/dms/panels/DmsLandscaperPanel.tsx (dark:10, attr:0, class:0)
✅ src/components/dms/preview/DocumentPreview.tsx (dark:60, attr:0, class:0)
✅ src/components/dms/preview/PlatformKnowledgePreview.tsx (dark:51, attr:0, class:0)
✅ src/components/dms/profile/DocCard.tsx (dark:39, attr:0, class:0)
✅ src/components/dms/profile/PlatformKnowledgeProfileForm.tsx (dark:25, attr:0, class:0)
✅ src/components/dms/profile/ProfileForm.tsx (dark:21, attr:0, class:0)
✅ src/components/dms/profile/TagInput.tsx (dark:9, attr:0, class:0)
✅ src/components/dms/profile/VersionTimeline.tsx (dark:19, attr:0, class:0)
✅ src/components/dms/search/Facets.tsx (dark:18, attr:0, class:0)
✅ src/components/dms/search/HighlightedText.tsx (dark:1, attr:0, class:0)
✅ src/components/dms/search/ResultsTable.tsx (dark:61, attr:0, class:0)
✅ src/components/dms/search/SearchBox.tsx (dark:3, attr:0, class:0)
✅ src/components/dms/shared/DMSLayout.tsx (dark:3, attr:0, class:0)
✅ src/components/dms/upload/Dropzone.tsx (dark:19, attr:0, class:0)
✅ src/components/dms/upload/Queue.tsx (dark:18, attr:0, class:0)
✅ src/components/dms/views/DocumentPreviewPanel.tsx (dark:53, attr:0, class:0)
✅ src/components/dms/views/FilterDetailView.tsx (dark:40, attr:0, class:0)
❌ src/components/documents/CorrectionModal.tsx (NO dark mode, has 2 color refs)
❌ src/components/extraction/StagingModal.tsx (NO dark mode, has 1 color refs)
❌ src/components/feasibility/ComparablesTable.tsx (NO dark mode, has 3 color refs)
❌ src/components/feasibility/FeasibilitySubNav.tsx (NO dark mode, has 1 color refs)
❌ src/components/feasibility/SensitivityAnalysisContent.tsx (NO dark mode, has 15 color refs)
❌ src/components/icons/LandscaperIcon.tsx (NO dark mode, has 1 color refs)
❌ src/components/ingestion/DocumentCard.tsx (NO dark mode, has 9 color refs)
❌ src/components/ingestion/DocumentIngestion.tsx (NO dark mode, has 14 color refs)
❌ src/components/ingestion/IngestionChat.tsx (NO dark mode, has 2 color refs)
❌ src/components/ingestion/MilestoneBar.tsx (NO dark mode, has 4 color refs)
❌ src/components/ingestion/PropertyOverview.tsx (NO dark mode, has 19 color refs)
✅ src/components/landscaper/ActivityFeed.tsx (dark:1, attr:0, class:0)
✅ src/components/landscaper/ActivityFeedItem.tsx (dark:9, attr:0, class:0)
❌ src/components/landscaper/AdviceAdherencePanel.tsx (NO dark mode, has 8 color refs)
❌ src/components/landscaper/CalculatedFieldRow.tsx (NO dark mode, has 6 color refs)
❌ src/components/landscaper/ChatInterface.tsx (NO dark mode, has 4 color refs)
❌ src/components/landscaper/ChatMessageBubble.tsx (NO dark mode, has 5 color refs)
❌ src/components/landscaper/DataTableModal.tsx (NO dark mode, has 12 color refs)
❌ src/components/landscaper/ExtractionFieldRow.tsx (NO dark mode, has 12 color refs)
❌ src/components/landscaper/ExtractionReviewModal.tsx (NO dark mode, has 10 color refs)
❌ src/components/landscaper/ExtractionValidation.tsx (NO dark mode, has 10 color refs)
✅ src/components/landscaper/LandscaperChat.tsx (dark:1, attr:0, class:0)
❌ src/components/landscaper/LandscaperPanel.tsx (NO dark mode, has 6 color refs)
❌ src/components/landscaper/LandscaperProgress.tsx (NO dark mode, has 6 color refs)
❌ src/components/landscaper/MutationProposalCard.tsx (NO dark mode, has 19 color refs)
❌ src/components/landscaper/UnitMixAccordion.tsx (NO dark mode, has 22 color refs)
❌ src/components/landscaper/VarianceItem.tsx (NO dark mode, has 9 color refs)
❌ src/components/map/MapOblique.tsx (NO dark mode, has 7 color refs)
❌ src/components/map/ProjectTabMap.tsx (NO dark mode, has 36 color refs)
❌ src/components/map/PropertyTabMapWithComps.tsx (NO dark mode, has 22 color refs)
❌ src/components/map/ValuationSalesCompMap.tsx (NO dark mode, has 28 color refs)
❌ src/components/market/AddCompetitorModal.tsx (NO dark mode, has 8 color refs)
❌ src/components/market/CompetitiveProjectsPanel.tsx (NO dark mode, has 45 color refs)
❌ src/components/napkin/CommercialPanel.tsx (NO dark mode, has 15 color refs)
❌ src/components/napkin/CompDetailsSection.tsx (NO dark mode, has 34 color refs)
❌ src/components/napkin/InfrastructurePanel.tsx (NO dark mode, has 15 color refs)
❌ src/components/napkin/LandscaperPanel.tsx (NO dark mode, has 6 color refs)
❌ src/components/napkin/MdrPanel.tsx (NO dark mode, has 17 color refs)
❌ src/components/napkin/NapkinAnalysisPage.tsx (NO dark mode, has 2 color refs)
❌ src/components/napkin/NapkinAttachedPricing.tsx (NO dark mode, has 34 color refs)
❌ src/components/napkin/NapkinCompsMap.tsx (NO dark mode, has 41 color refs)
❌ src/components/napkin/NapkinSfdPricing.tsx (NO dark mode, has 48 color refs)
❌ src/components/napkin/PromoteModal.tsx (NO dark mode, has 1 color refs)
❌ src/components/napkin/RlvSummaryCard.tsx (NO dark mode, has 8 color refs)
❌ src/components/napkin/SfdPricingPanel.tsx (NO dark mode, has 30 color refs)
❌ src/components/operations/DraggableOpexSection.tsx (NO dark mode, has 14 color refs)
❌ src/components/operations/InventoryStatsPanel.tsx (NO dark mode, has 12 color refs)
❌ src/components/operations/OpExModeSelector.tsx (NO dark mode, has 2 color refs)
❌ src/components/operations/RentalIncomeSection.tsx (NO dark mode, has 3 color refs)
❌ src/components/operations/VacancyDeductionsSection.tsx (NO dark mode, has 2 color refs)
❌ src/components/operations/ValueAddCard.tsx (NO dark mode, has 3 color refs)
❌ src/components/phases/PhaseTransition.tsx (NO dark mode, has 3 color refs)
❌ src/components/project/ActivityFeed.tsx (NO dark mode, has 5 color refs)
❌ src/components/project/GranularityIndicators.tsx (NO dark mode, has 3 color refs)
❌ src/components/project/MetricCard.tsx (NO dark mode, has 3 color refs)
❌ src/components/project/MilestoneTimeline.tsx (NO dark mode, has 5 color refs)
❌ src/components/project/ProfileField.tsx (NO dark mode, has 2 color refs)
❌ src/components/project/ProjectDates.tsx (NO dark mode, has 4 color refs)
❌ src/components/project/ProjectLandUseLabels.tsx (NO dark mode, has 29 color refs)
❌ src/components/project/ProjectProfileEditModal.tsx (NO dark mode, has 10 color refs)
❌ src/components/project/ProjectProfileTile.tsx (NO dark mode, has 5 color refs)
❌ src/components/project/ProjectSubNav.tsx (NO dark mode, has 1 color refs)
❌ src/components/projects/InflationRateDisplay.tsx (NO dark mode, has 9 color refs)
✅ src/components/projects/LifecycleTileNav.tsx (dark:0, attr:1, class:0)
❌ src/components/projects/contacts/AddContactModal.tsx (NO dark mode, has 21 color refs)
❌ src/components/projects/contacts/ContactCard.tsx (NO dark mode, has 22 color refs)
❌ src/components/projects/contacts/ContactRoleCard.tsx (NO dark mode, has 4 color refs)
❌ src/components/projects/contacts/ContactsSection.tsx (NO dark mode, has 1 color refs)
❌ src/components/projects/contacts/ProjectContactsSection.tsx (NO dark mode, has 15 color refs)
❌ src/components/projects/onboarding/ModelReadinessDisplay.tsx (NO dark mode, has 31 color refs)
❌ src/components/projects/onboarding/NewProjectChannelTabs.tsx (NO dark mode, has 11 color refs)
❌ src/components/projects/onboarding/NewProjectChat.tsx (NO dark mode, has 27 color refs)
✅ src/components/projects/onboarding/NewProjectDropZone.tsx (dark:5, attr:0, class:0)
❌ src/components/projects/onboarding/NewProjectFieldTable.tsx (NO dark mode, has 21 color refs)
❌ src/components/projects/onboarding/NewProjectOnboardingModal.tsx (NO dark mode, has 14 color refs)
❌ src/components/projects/onboarding/SimplifiedChannelView.tsx (NO dark mode, has 13 color refs)
❌ src/components/reports/ExtractionFilterPills.tsx (NO dark mode, has 8 color refs)
❌ src/components/reports/ExtractionHistoryPanel.tsx (NO dark mode, has 14 color refs)
❌ src/components/reports/ExtractionHistoryReport.tsx (NO dark mode, has 26 color refs)
❌ src/components/reports/PropertySummaryView.tsx (NO dark mode, has 50 color refs)
❌ src/components/sales/AnnualInventoryGauge.tsx (NO dark mode, has 22 color refs)
❌ src/components/sales/CreateSalePhaseModal.tsx (NO dark mode, has 4 color refs)
❌ src/components/sales/FilterSidebar.tsx (NO dark mode, has 6 color refs)
❌ src/components/sales/ParcelSalesTable.tsx (NO dark mode, has 60 color refs)
❌ src/components/sales/PhaseTiles.tsx (NO dark mode, has 7 color refs)
❌ src/components/sales/PricingTable.tsx (NO dark mode, has 56 color refs)
❌ src/components/sales/SaleCalculationModal.tsx (NO dark mode, has 28 color refs)
❌ src/components/sales/SaleDetailForm.tsx (NO dark mode, has 29 color refs)
❌ src/components/sales/SaleTransactionDetails.tsx (NO dark mode, has 3 color refs)
❌ src/components/sales/SalesContent.tsx (NO dark mode, has 2 color refs)
❌ src/components/sales/SaveBenchmarkModal.tsx (NO dark mode, has 5 color refs)
❌ src/components/sales/TransactionColumn.tsx (NO dark mode, has 19 color refs)
❌ src/components/sales/TransactionGrid.tsx (NO dark mode, has 1 color refs)
❌ src/components/scenarios/ScenarioChipManager.tsx (NO dark mode, has 23 color refs)
❌ src/components/scenarios/ScenarioComparison.tsx (NO dark mode, has 6 color refs)
❌ src/components/shared/AccordionSection.tsx (NO dark mode, has 3 color refs)
❌ src/components/shared/AreaTiles.tsx (NO dark mode, has 7 color refs)
❌ src/components/shared/ModeToggle.tsx (NO dark mode, has 10 color refs)
❌ src/components/studio/LandscaperPanel.tsx (NO dark mode, has 17 color refs)
❌ src/components/studio/StudioPanel.tsx (NO dark mode, has 2 color refs)
❌ src/components/studio/TileGrid.tsx (NO dark mode, has 13 color refs)
❌ src/components/studio/layout/StudioLayout.tsx (NO dark mode, has 1 color refs)
❌ src/components/taxonomy/FamilyDetails.tsx (NO dark mode, has 16 color refs)
❌ src/components/taxonomy/FamilyTree.tsx (NO dark mode, has 5 color refs)
❌ src/components/taxonomy/ProductsList.tsx (NO dark mode, has 6 color refs)
❌ src/components/ui/ModeChip.tsx (NO dark mode, has 1 color refs)
❌ src/components/ui/PageHeader.tsx (NO dark mode, has 1 color refs)
✅ src/components/ui/alert.tsx (dark:1, attr:0, class:0)
❌ src/components/ui/badge.tsx (NO dark mode, has 5 color refs)
❌ src/components/ui/button.tsx (NO dark mode, has 8 color refs)
❌ src/components/ui/card.tsx (NO dark mode, has 3 color refs)
❌ src/components/ui/dialog.tsx (NO dark mode, has 6 color refs)
❌ src/components/ui/input.tsx (NO dark mode, has 1 color refs)
❌ src/components/ui/label.tsx (NO dark mode, has 1 color refs)
❌ src/components/ui/landscape/DataTable.tsx (NO dark mode, has 3 color refs)
❌ src/components/ui/radio-group.tsx (NO dark mode, has 2 color refs)
❌ src/components/ui/select.tsx (NO dark mode, has 5 color refs)
❌ src/components/ui/sheet.tsx (NO dark mode, has 10 color refs)
❌ src/components/ui/table.tsx (NO dark mode, has 7 color refs)
❌ src/components/ui/tabs.tsx (NO dark mode, has 2 color refs)
❌ src/components/ui/textarea.tsx (NO dark mode, has 1 color refs)
❌ src/components/ui/toast.tsx (NO dark mode, has 1 color refs)
❌ src/components/valuation/income-approach/AssumptionsPanel.tsx (NO dark mode, has 25 color refs)
❌ src/components/valuation/income-approach/DirectCapView.tsx (NO dark mode, has 68 color refs)
❌ src/components/valuation/income-approach/SensitivityMatrix.tsx (NO dark mode, has 16 color refs)
❌ src/components/valuation/income-approach/ValueTiles.tsx (NO dark mode, has 11 color refs)

## SECTION 4: VIOLATION DETAILS


FILE: src/app/admin/dms/templates/page.tsx
--- Tailwind color classes ---
142:    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
146:            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
149:            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
156:            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
163:          <div className="text-center py-12 text-gray-500">
167:          <div className="text-center py-12 text-gray-500">
175:                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
180:                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
184:                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
190:                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
198:                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
205:                        className="text-sm text-red-600 dark:text-red-400 hover:underline"
217:                      className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
224:                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
234:            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
235:              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
241:                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
250:                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
257:                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
265:                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
--- Hardcoded hex colors ---

FILE: src/app/admin/preferences/components/CategoryDetailPanel.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/admin/preferences/components/CreateTagModal.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/admin/preferences/components/UOMRow.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/admin/users/components/UserModals.tsx
--- Tailwind color classes ---
101:      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
104:          <DialogDescription className="text-gray-400">
110:          <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
119:              <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
125:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
130:              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
136:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
144:            <label className="block text-sm font-medium text-gray-300 mb-1">
145:              Username <span className="text-red-400">*</span>
153:              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
160:            <label className="block text-sm font-medium text-gray-300 mb-1">
161:              Email <span className="text-red-400">*</span>
169:              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
177:              <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
183:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
188:              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
194:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
203:              <label className="block text-sm font-medium text-gray-300 mb-1">
204:                Password <span className="text-red-400">*</span>
213:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
--- Hardcoded hex colors ---

FILE: src/app/admin/users/page.tsx
--- Tailwind color classes ---
165:          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
179:            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition flex items-center gap-2"
186:            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
195:        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
201:      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
204:            <thead className="bg-gray-900">
206:                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
209:                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
212:                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
215:                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
218:                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
221:                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
229:                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
235:                  <tr key={user.id} className="hover:bg-gray-700/50 transition">
238:                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
249:                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-900/50 text-purple-300">
255:                          <div className="text-sm text-gray-400">@{user.username}</div>
262:                        <span className="inline-flex items-center text-xs text-green-400">
275:                      <span className="text-sm text-gray-300">{user.company || '-'}</span>
283:                            ? 'bg-green-900/50 text-green-300 hover:bg-green-900'
--- Hardcoded hex colors ---

FILE: src/app/components/AI/DocumentReview.tsx
--- Tailwind color classes ---
104:    if (confidence >= 0.9) return 'text-green-600'
105:    if (confidence >= 0.7) return 'text-yellow-600'
106:    return 'text-red-600'
181:            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
182:            <span className="text-gray-700">Analyzing project documents...</span>
193:          <div className="text-red-600 mb-4">
228:        <div className="p-6 border-b border-gray-200">
231:              <h2 className="text-xl font-semibold text-gray-900">AI Document Review</h2>
232:              <p className="text-sm text-gray-600 mt-1">
249:        <div className="p-6 bg-blue-50 border-b border-gray-200">
250:          <h3 className="font-medium text-gray-900 mb-2">Review Summary</h3>
251:          <p className="text-gray-700 text-sm leading-relaxed">{reviewData.review_summary}</p>
255:            <span className="text-green-600">✓ {stats.confirmed} confirmed</span>
256:            <span className="text-blue-600">✏ {stats.edited} edited</span>
257:            <span className="text-yellow-600">⏸ {stats.passed} passed</span>
258:            <span className="text-gray-600">⏳ {stats.pending} pending</span>
264:          <h3 className="font-medium text-gray-900 mb-4">Suggested Field Values</h3>
267:            <div className="text-center py-8 text-gray-500">
290:        <div className="p-6 border-t border-gray-200 bg-gray-50">
292:            <div className="text-sm text-gray-600">
--- Hardcoded hex colors ---

FILE: src/app/components/Admin/CategoryTree.tsx
--- Tailwind color classes ---
76:      <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
77:        <div className="bg-gray-900 px-3 py-2 text-sm text-white">Admin · Category Tree</div>
79:          <div className="md:col-span-1 border border-gray-700 rounded p-2 bg-gray-900 max-h-[60vh] overflow-auto">
81:              <button key={c.category_id} className={`w-full text-left px-2 py-1 rounded ${selectedId === c.category_id ? 'bg-blue-900 text-white' : 'text-gray-300 hover:bg-gray-800'}`} onClick={() => setSelectedId(c.category_id)}>
82:                <div className="font-mono text-[11px] text-gray-400">{c.code}</div>
87:              <button className="px-2 py-1 rounded bg-blue-700 text-white" onClick={() => { setSelectedId(null); setForm({ code: '', kind: 'Use', class: '', event: '', is_active: true, uoms: [], tiers: [] }) }}>New Category</button>
90:          <div className="md:col-span-2 border border-gray-700 rounded p-3 bg-gray-900 space-y-3">
92:              <label className="text-gray-300">Code</label>
93:              <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value }))} />
96:                <label className="text-gray-300">Kind</label>
97:                <div className="flex items-center gap-4 text-gray-300">
103:              <label className="text-gray-300">Class</label>
104:              <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" value={form.class} onChange={e => setForm((f: any) => ({ ...f, class: e.target.value }))} />
107:              <label className="text-gray-300">Event</label>
108:              <input className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" value={form.event} onChange={e => setForm((f: any) => ({ ...f, event: e.target.value }))} />
110:            <div className="border-t border-gray-700 pt-2">
111:              <div className="text-gray-300 mb-1">Allowed Units</div>
114:                  <label key={u.uom_code} className="flex items-center gap-2 text-gray-300">
121:            <div className="border-t border-gray-700 pt-2">
122:              <div className="text-gray-300 mb-1">Entity Applicability</div>
--- Hardcoded hex colors ---

FILE: src/app/components/Admin/LandUseInputTable.tsx
--- Tailwind color classes ---
91:              <label className="block text-sm font-medium text-gray-300 mb-2">
99:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
104:              <label className="block text-sm font-medium text-gray-300 mb-2">
110:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
122:              <label className="block text-sm font-medium text-gray-300 mb-2">
129:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
140:              <label className="block text-sm font-medium text-gray-300 mb-2">
148:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
154:              <label className="block text-sm font-medium text-gray-300 mb-2">
162:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
167:              <label className="block text-sm font-medium text-gray-300 mb-2">
173:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
185:              <label className="block text-sm font-medium text-gray-300 mb-2">
192:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
203:              <label className="block text-sm font-medium text-gray-300 mb-2">
211:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
217:              <label className="block text-sm font-medium text-gray-300 mb-2">
225:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
230:              <label className="block text-sm font-medium text-gray-300 mb-2">
237:                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500"
--- Hardcoded hex colors ---

FILE: src/app/components/Admin/LandUseInputTableTanStack.tsx
--- Tailwind color classes ---
81:  'Residential': { bg: 'bg-blue-600', text: 'text-white', dot: 'bg-blue-500' },
82:  'Commercial': { bg: 'bg-red-600', text: 'text-white', dot: 'bg-red-500' },
83:  'Industrial': { bg: 'bg-gray-500', text: 'text-white', dot: 'bg-gray-400' },
84:  'Mixed Use': { bg: 'bg-purple-600', text: 'text-white', dot: 'bg-purple-500' },
85:  'Open Space': { bg: 'bg-green-600', text: 'text-white', dot: 'bg-green-500' },
86:  'Public': { bg: 'bg-orange-600', text: 'text-white', dot: 'bg-orange-500' },
87:  'Transportation': { bg: 'bg-yellow-600', text: 'text-black', dot: 'bg-yellow-500' },
88:  'Utility': { bg: 'bg-cyan-600', text: 'text-white', dot: 'bg-cyan-500' },
141:        className={`w-full border-0 bg-transparent p-0 h-8 text-white hover:bg-gray-700 flex items-center justify-between cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
159:          className="bg-gray-700 border border-gray-600 rounded-md shadow-xl max-h-60 overflow-auto"
164:              className="px-3 py-2 text-white hover:bg-gray-600 cursor-pointer text-sm"
319:            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm"
324:                <option key={subtype.subtype_id} value={subtype.subtype_id} className="text-white bg-gray-700">
347:            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm disabled:opacity-50"
353:              <option key={code.landuse_id} value={code.landuse_id.toString()} className="text-white bg-gray-700">
370:            className="w-full border-0 bg-gray-700 p-1 h-8 text-white focus:bg-gray-600 rounded text-sm"
374:              <option key={uom.uom_code} value={uom.uom_code} className="text-white bg-gray-700">
393:            className="w-full border-0 bg-transparent p-0 h-8 text-right text-white hover:bg-gray-700"
416:                : "bg-gray-600 text-gray-200 hover:bg-gray-500 border border-gray-500"
438:          <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full font-medium">
--- Hardcoded hex colors ---

FILE: src/app/components/Admin/LandUseManagement.tsx
--- Tailwind color classes ---
205:      case 'complete': return 'bg-green-900 text-green-300';
206:      case 'partial': return 'bg-yellow-900 text-yellow-300';
207:      case 'incomplete': return 'bg-red-900 text-red-300';
208:      default: return 'bg-gray-700 text-gray-300';
214:      <div className="bg-gray-800 rounded border border-gray-700 h-96 flex items-center justify-center">
215:        <div className="text-gray-400">Loading land use management...</div>
222:      <div className="bg-gray-800 rounded border border-gray-700">
223:        <div className="px-4 py-3 border-b border-gray-700">
230:          <div className="text-gray-300 mb-4">
233:          <div className="text-sm text-gray-400 mb-6">
240:            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
250:    <div className="bg-gray-800 rounded border border-gray-700">
251:      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
257:          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center">
261:          <button className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-sm hover:bg-gray-700">
269:        <div className="w-[30%] border-r border-gray-700 p-4 overflow-y-auto">
272:            <button className="p-1 hover:bg-gray-700 rounded">
273:              <Plus className="w-4 h-4 text-gray-400" />
281:                  className="flex items-center py-1 px-2 hover:bg-gray-700 rounded cursor-pointer"
285:                    <ChevronDown className="w-4 h-4 text-gray-400 mr-1" /> :
--- Hardcoded hex colors ---

FILE: src/app/components/Archive/PlanningContentGrid.tsx
--- Tailwind color classes ---
144:    if (row.kind !== 'parcel') return <span className="text-gray-400">—</span>
160:          className="w-full bg-gray-700 text-white text-xs border-none outline-none"
174:        className="cursor-pointer hover:bg-gray-600 px-1 rounded"
191:          className="text-gray-200"
207:        : <span className="pl-2 text-gray-200">{row.parcel_display}</span>
215:    { key: 'product', name: 'Product', width: 140, editable: (row) => row.kind === 'parcel', renderCell: ({ row }) => row.kind === 'parcel' ? <span>{row.product}</span> : <span className="text-gray-400">—</span> },
218:    { key: 'efficiency', name: 'Eff.%', width: 90, renderCell: ({ row }) => row.kind === 'parcel' ? <span>{fmtPercent(row.efficiency)}</span> : <span className="text-gray-400">—</span> },
239:      <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white text-sm">
240:        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-red-400">
248:    <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white text-sm">
250:      <div className="bg-gray-800 rounded border border-gray-700 p-3">
254:            <span className="text-sm text-gray-400">View Mode:</span>
257:              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
263:              className="px-3 py-1 rounded text-sm bg-blue-600 text-white border border-blue-500"
269:              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
277:      <div className="bg-gray-800 rounded border border-gray-700">
278:        <div className="px-3 py-2 border-b border-gray-700 text-base flex items-center gap-3">
280:          <div className="text-sm text-gray-300">{saving ? 'Saving…' : ''}</div>
283:          <div className="text-sm text-gray-300 mb-2">Phases: {Array.isArray(phasesData) ? phasesData.length : 0} · Parcels: {Array.isArray(parcelsData) ? parcelsData.length : 0}</div>
284:          <div className="bg-gray-900 border border-gray-700 rounded overflow-visible rdg-dark">
--- Hardcoded hex colors ---

FILE: src/app/components/Archive/PlanningContentHot.tsx
--- Tailwind color classes ---
205:      <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white">
206:        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-red-400">
214:    <div className="p-4 space-y-4 bg-gray-950 min-h-screen text-white">
216:      <div className="bg-gray-800 rounded border border-gray-700 p-3">
220:            <span className="text-sm text-gray-400">View Mode:</span>
223:              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
229:              className="px-3 py-1 rounded text-sm bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500"
235:              className="px-3 py-1 rounded text-sm bg-blue-600 text-white border border-blue-500"
244:        <div className="bg-gray-800 rounded border border-gray-700">
245:          <div className="px-3 py-2 border-b border-gray-700 text-base">Development Phasing (HOT)</div>
251:        <div className="bg-gray-800 rounded border border-gray-700">
252:          <div className="px-3 py-2 border-b border-gray-700 text-base flex items-center gap-3">
254:            <div className="text-sm text-gray-300">{saving ? 'Saving…' : ''}</div>
--- Hardcoded hex colors ---

FILE: src/app/components/Budget/BudgetContainerView.tsx
--- Tailwind color classes ---
171:      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
172:        <div className="text-gray-400">Loading budget data...</div>
179:      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
180:        <div className="text-red-400">
189:      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
190:        <div className="text-gray-400">No budget items found</div>
198:      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
201:            <div className="text-sm text-gray-400">Total Budget</div>
207:            <div className="text-sm text-gray-400">Line Items</div>
213:            <div className="text-sm text-gray-400 mb-2">By Level</div>
218:                  className="bg-gray-700 px-3 py-2 rounded text-sm"
220:                  <div className="text-gray-300 font-medium">
223:                  <div className="text-xs text-gray-400">
235:      <div className="bg-gray-900 rounded-lg border border-gray-800">
238:            <thead className="bg-gray-800 border-b border-gray-700 sticky top-0">
240:                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
243:                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
246:                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
249:                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
252:                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
--- Hardcoded hex colors ---

FILE: src/app/components/Budget/BudgetContent.tsx
--- Tailwind color classes ---
304:    <div className="p-4 flex items-center justify-center"><div className="text-gray-400">Loading budget…</div></div>
308:    <div className="p-4 space-y-4 bg-gray-950">
309:      <div className="bg-gray-800 rounded border border-gray-700 p-3 flex items-center gap-3 text-xs">
310:        <div className="text-gray-300">Budget</div>
311:        <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
319:        <div className="text-gray-300 ml-4">Scope</div>
321:          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white min-w-[14rem]"
335:        <div className="text-gray-300">Total:</div>
340:      <div className="bg-gray-800 rounded border border-gray-700 overflow-hidden">
341:        <div className="bg-gray-900 px-3 py-2 text-xs text-gray-300 flex">
356:            <div className="text-xs text-gray-300 bg-gray-900 border border-gray-700 rounded p-3 flex items-center gap-3">
375:                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
389:                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
399:                  <input className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
405:                  <input className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
413:                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white"
423:                  <select className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white"
434:                  <input className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center" inputMode="decimal"
450:                <div className="w-full bg-gray-900/70 border border-gray-700 rounded p-2 ml-2 mr-2">
451:                  <div className="text-[11px] text-gray-300 mb-1">Sources & Vendors</div>
--- Hardcoded hex colors ---

FILE: src/app/components/Budget/BudgetGrid.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/Budget/BudgetGridDark.tsx
--- Tailwind color classes ---
330:      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
331:        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
332:        <p className="mt-4 text-gray-400">Loading budget items...</p>
339:      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
340:        <div className="text-red-400 text-center">
349:    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
351:      <div className="bg-gray-750 border-b border-gray-700 p-4">
357:              <label className="block text-xs font-medium text-gray-400 mb-1">Budget Version</label>
361:                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
370:              <label className="block text-xs font-medium text-gray-400 mb-1">Geography</label>
374:                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
388:              <label className="block text-xs font-medium text-gray-400 mb-1">Stage</label>
392:                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
401:              <label className="block text-xs font-medium text-gray-400 mb-1">Scope</label>
406:                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
415:              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
420:                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
431:            <div className="text-xs text-gray-400">{summary.itemCount} line items</div>
436:              <div className={`text-sm ${summary.variance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
453:                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/40 border border-blue-700 text-blue-300 rounded text-xs">
--- Hardcoded hex colors ---

FILE: src/app/components/Budget/BudgetGridDarkWrapper.tsx
--- Tailwind color classes ---
11:    <div className="min-h-screen bg-gray-900 p-6">
--- Hardcoded hex colors ---

FILE: src/app/components/ContainerManagement/ProjectSetupWizard.tsx
--- Tailwind color classes ---
152:    <div className="min-h-screen bg-gray-950 p-8">
157:          <p className="text-gray-400">Configure your project hierarchy and labels</p>
168:                      ? 'bg-green-600 text-white'
170:                      ? 'bg-blue-600 text-white'
171:                      : 'bg-gray-700 text-gray-400'
176:                <span className="ml-2 text-sm text-gray-300">
182:              {s < 3 && <ChevronRight className="w-5 h-5 text-gray-600 mx-4" />}
188:        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
194:                <p className="text-gray-400">Choose the type of project you're modeling</p>
207:                          ? 'border-blue-500 bg-blue-950'
208:                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
214:                            isSelected ? 'bg-blue-600' : 'bg-gray-700'
223:                          <p className="text-sm text-gray-400 mb-2">{config.description}</p>
224:                          <p className="text-xs text-gray-500 italic">{config.examples}</p>
239:                <p className="text-gray-400">Set up your project name and hierarchy labels</p>
244:                <label className="block text-sm font-medium text-gray-300 mb-2">
252:                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
259:                  <label className="block text-sm font-medium text-gray-300 mb-3">
269:                            ? 'bg-blue-600 text-white'
270:                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
--- Hardcoded hex colors ---

FILE: src/app/components/DVLTimeSeries.tsx
--- Tailwind color classes ---
56:    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
57:      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
63:            <label className="block text-xs font-medium text-slate-300">$/Year</label>
67:              className="w-full bg-gray-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
74:            <label className="block text-xs font-medium text-slate-300">$/Quarter</label>
78:              className="w-full bg-gray-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
85:            <label className="block text-xs font-medium text-slate-300">$/Month</label>
89:              className="w-full bg-gray-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
--- Hardcoded hex colors ---

FILE: src/app/components/DevStatus/DevStatus.tsx
--- Tailwind color classes ---
166:  bug: 'bg-red-500/10 text-red-300 border border-red-500/30',
167:  feature: 'bg-blue-500/10 text-blue-300 border border-blue-500/30',
168:  feedback: 'bg-purple-500/10 text-purple-300 border border-purple-500/30',
169:  question: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
170:  other: 'bg-gray-500/10 text-gray-300 border border-gray-500/30',
287:        return <Check className="w-4 h-4 text-green-500" />;
289:        return <Clock className="w-4 h-4 text-yellow-500" />;
291:        return <AlertTriangle className="w-4 h-4 text-red-500" />;
293:        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
308:      case 'high': return 'bg-red-100 text-red-800 border-red-200';
309:      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
310:      case 'low': return 'bg-green-100 text-green-800 border-green-200';
311:      default: return 'bg-gray-100 text-gray-800 border-gray-200';
316:    if (completion >= 90) return 'bg-green-500';
317:    if (completion >= 70) return 'bg-yellow-500';
318:    if (completion >= 50) return 'bg-orange-500';
319:    return 'bg-red-500';
625:      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
636:      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
638:          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
--- Hardcoded hex colors ---

FILE: src/app/components/Documentation/MarkdownViewer.tsx
--- Tailwind color classes ---
78:    html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em class="text-blue-300">$1</em></strong>');
80:    html = html.replace(/\*(.*?)\*/gim, '<em class="text-gray-300 italic">$1</em>');
83:    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="bg-gray-900 border border-gray-700 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm text-green-400">$2</code></pre>');
86:    html = html.replace(/`([^`]+)`/gim, '<code class="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm">$1</code>');
89:    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank">$1</a>');
92:    html = html.replace(/^\- (.*$)/gim, '<li class="text-gray-300 ml-6 list-disc">$1</li>');
96:    html = html.replace(/^\d+\. (.*$)/gim, '<li class="text-gray-300 ml-6 list-decimal">$1</li>');
99:    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4">$1</blockquote>');
102:    html = html.replace(/^---$/gim, '<hr class="border-gray-700 my-8" />');
105:    html = html.replace(/\n\n/gim, '</p><p class="text-gray-300 leading-relaxed my-4">');
106:    html = '<p class="text-gray-300 leading-relaxed my-4">' + html + '</p>';
113:      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
115:        <div className="flex items-center justify-between p-6 border-b border-gray-700">
119:              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
122:              <ArrowLeft className="w-5 h-5 text-gray-400" />
129:              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
133:              <Download className="w-5 h-5 text-gray-400" />
137:              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
140:              <ExternalLink className="w-5 h-5 text-gray-400" />
144:              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
--- Hardcoded hex colors ---

FILE: src/app/components/Documents/DocumentManagement.tsx
--- Tailwind color classes ---
178:        <div className="text-gray-400">
191:          <p className="text-gray-400">Upload, search, and manage project documents</p>
--- Hardcoded hex colors ---

FILE: src/app/components/DynamicBreadcrumb.tsx
--- Tailwind color classes ---
48:        <div className="h-4 w-32 bg-gray-700 animate-pulse rounded" />
66:                <ChevronRight className="w-4 h-4 text-gray-500 mx-2" aria-hidden="true" />
71:                  className="text-blue-400 hover:text-blue-300 transition-colors"
76:                <span className={isLast ? 'text-gray-300 font-medium' : 'text-gray-400'}>
--- Hardcoded hex colors ---

FILE: src/app/components/FilterableSelect.tsx
--- Tailwind color classes ---
151:              ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
159:              disabled ? 'text-gray-500' : 'text-white/70'
171:        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-gray-800 border border-white/30 rounded shadow-lg">
173:            <div className="px-3 py-2 text-xs text-gray-400">
183:                    ? 'bg-blue-600 text-white'
185:                    ? 'bg-blue-700/50 text-white'
186:                    : 'text-white hover:bg-gray-700'
--- Hardcoded hex colors ---

FILE: src/app/components/GIS/AssessorDataMapping.tsx
--- Tailwind color classes ---
176:    <div className="w-full h-full flex flex-col bg-gray-900">
178:      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
182:            <p className="text-gray-400 text-sm mt-1">
189:              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
203:            <div className="bg-gray-800 rounded-lg p-6 mb-6">
207:                  <div className="text-gray-400">Parcels Selected</div>
211:                  <div className="text-gray-400">Total Acres</div>
215:                  <div className="text-gray-400">Primary Owner</div>
221:                  <div className="text-gray-400">County</div>
228:            <div className="bg-gray-800 rounded-lg p-6">
230:              <p className="text-gray-400 text-sm mb-6">
236:                  <div key={mapping.field} className="border border-gray-700 rounded-lg p-4">
243:                          className="text-blue-600"
249:                              <span className="text-red-400 ml-1">*</span>
252:                          <div className="text-gray-400 text-xs">
268:                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
272:                            <div className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm flex-1">
277:                              className="text-blue-400 hover:text-blue-300 text-xs"
293:        <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
298:              <span className="text-gray-400">Enabled Fields:</span>
--- Hardcoded hex colors ---

FILE: src/app/components/GIS/GISSetupWorkflow.tsx
--- Tailwind color classes ---
236:        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
246:        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
253:      <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
254:        <span className="text-xs text-gray-300">{steps.findIndex(s => s.id === stepId) + 1}</span>
263:          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
271:    <div className="fixed inset-0 bg-gray-900 z-50">
273:      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
277:            <p className="text-gray-400 text-sm mt-1">
286:                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
295:                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
317:                        getStepStatus(step.id) === 'current' ? 'text-blue-400' :
318:                        getStepStatus(step.id) === 'completed' ? 'text-green-400' :
319:                        'text-gray-400'
323:                      <div className="text-xs text-gray-500">{step.description}</div>
329:                      workflowState.completedSteps.has(step.id) ? 'bg-green-600' : 'bg-gray-600'
342:          <div className="p-4 bg-red-900/50 border-b border-red-700">
343:            <p className="text-red-300 text-sm">{error}</p>
--- Hardcoded hex colors ---

FILE: src/app/components/GIS/PlanNavigation.tsx
--- Tailwind color classes ---
104:    if (confidence >= 0.9) return { label: 'High', color: 'text-green-400', bg: 'bg-green-900/50' }
105:    if (confidence >= 0.7) return { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-900/50' }
106:    return { label: 'Low', color: 'text-red-400', bg: 'bg-red-900/50' }
110:    if (confidence >= 0.9) return 'text-green-400'
111:    if (confidence >= 0.7) return 'text-yellow-400'
112:    return 'text-red-400'
163:        <span className={index === breadcrumbs.length - 1 ? 'text-blue-400 font-medium' : 'text-gray-400'}>
167:          <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
177:      <div className={`flex items-center justify-center bg-gray-800 text-white ${className}`}>
179:          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
188:      <div className={`flex items-center justify-center bg-gray-800 text-white ${className}`}>
190:          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
193:          <p className="text-red-300 mb-2">{error}</p>
196:            className="text-blue-400 hover:text-blue-300 underline"
206:    <div className={`flex h-full bg-gray-900 ${className}`}>
220:            className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-white hover:bg-gray-700 shadow-lg"
232:            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white hover:bg-gray-700 shadow-lg"
243:          <div className="absolute bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
247:              <div className="text-xs text-gray-400 space-y-0.5">
260:        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
--- Hardcoded hex colors ---

FILE: src/app/components/GIS/ProjectBoundarySetup.tsx
--- Tailwind color classes ---
219:    <div className="w-full h-full flex flex-col bg-gray-900">
221:      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
225:            <p className="text-gray-400 text-sm mt-1">
232:              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
260:        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
263:            <div className="p-4 border-b border-gray-700">
268:                    <div className="text-gray-400 mb-1">Project Location:</div>
274:                    <div className="text-gray-400 mb-1">Total Project Area:</div>
280:                    <div className="text-gray-400 mb-1">Plan Parcels Identified:</div>
285:              <div className="mt-3 text-xs text-blue-300">
292:          <div className="p-4 border-b border-gray-700">
296:              <div className="text-gray-400 text-sm">
320:              <div key={parcel.PARCELID || `parcel-${index}`} className="p-3 border-b border-gray-700">
326:                    <div className="text-gray-400 text-xs mt-1">
329:                    <div className="text-gray-300 text-xs mt-1">
333:                      <div className="text-gray-400 text-xs truncate">
340:                    className="ml-2 text-gray-400 hover:text-red-400 text-xs"
350:          <div className="p-4 border-t border-gray-700">
352:              <div className="mb-3 p-2 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
360:              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
--- Hardcoded hex colors ---

FILE: src/app/components/GIS/ProjectDocumentUploads.tsx
--- Tailwind color classes ---
281:    if (conf > 0.9) return 'text-green-400'
282:    if (conf > 0.7) return 'text-yellow-400'
283:    return 'text-red-400'
287:    if (choice === 'ai') return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
288:    if (choice === 'custom') return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
289:    return 'border-gray-500 bg-gray-50 dark:bg-gray-800'
293:    <div className={`border rounded-md p-2 ${isCommitted ? 'bg-green-900/20 border-green-500' : 'bg-gray-800 border-gray-700'}`}>
296:        <div className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 pt-1">
304:            <span className="text-lg font-semibold text-green-400 flex-1">
310:              <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
311:                <div className="animate-spin w-3 h-3 border border-gray-500 border-t-transparent rounded-full"></div>
316:              <span className="px-2 py-1 text-xs bg-green-700 text-green-200 rounded flex items-center gap-1 flex-shrink-0">
324:              <span className="px-2 py-1 text-xs bg-yellow-700 text-yellow-200 rounded flex items-center gap-1 flex-shrink-0">
333:              <span className="text-green-400 font-medium text-sm flex-shrink-0">✓</span>
345:            <div className={`text-xs mb-2 ${dvlValidation.dvlMatch ? 'text-green-400' : 'text-yellow-400'}`}>
352:            <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-700 rounded text-xs">
353:              <div className="text-yellow-300 font-medium mb-1">Suggestions from DVL:</div>
363:                    className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-yellow-100 rounded text-xs"
377:                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
391:                  className="text-purple-500"
--- Hardcoded hex colors ---

FILE: src/app/components/GIS/PropertyPackageUpload.tsx
--- Tailwind color classes ---
100:    if (conf > 0.9) return 'text-green-400'
101:    if (conf > 0.7) return 'text-yellow-400'
102:    return 'text-red-400'
108:    <div className={`border rounded-lg p-3 ${isCommittedState ? 'border-green-500 bg-green-900/10' : 'border-gray-600'}`}>
111:          {label && <div className="text-xs text-gray-400 mb-2">{label}</div>}
116:              <span className="text-green-400">✓</span>
118:              <span className="text-gray-300">{getCurrentValue()}</span>
133:                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
136:                      <div className={`text-sm ${choice === 'ai' ? 'text-green-400 font-medium' : 'text-white'}`}>
145:                          className="text-xs text-blue-400 hover:text-blue-300 ml-2"
162:                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
165:                      <div className="text-sm text-blue-400 mb-1">Enter custom value:</div>
172:                        className={`w-full text-sm bg-gray-700 border border-gray-500 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
187:                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
189:                    <div className="text-sm text-orange-400">
204:                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
207:                      <div className="text-sm text-blue-400 mb-1">Enter manual value:</div>
213:                        className="w-full text-sm bg-gray-700 border border-gray-500 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
225:                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
227:                    <div className="text-sm text-orange-400">
--- Hardcoded hex colors ---

FILE: src/app/components/Glossary/ZoningGlossaryAdmin.tsx
--- Tailwind color classes ---
108:        <label className="block text-xs text-gray-400 mb-1">City</label>
109:        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
114:        <label className="block text-xs text-gray-400 mb-1">County</label>
115:        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
120:        <label className="block text-xs text-gray-400 mb-1">State</label>
121:        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
126:        <label className="block text-xs text-gray-400 mb-1">Display</label>
127:        <input className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
136:      <div className="bg-gray-800 border border-gray-700 rounded p-4">
139:            <div className="text-gray-400 text-sm">Zoning Glossary</div>
142:          <div className="text-gray-300 text-sm">Rows: {loading ? '…' : count}</div>
147:      <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded p-4 space-y-4">
150:            <label className="block text-xs text-gray-400 mb-1">Family</label>
151:            <select className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
159:            <label className="block text-xs text-gray-400 mb-1">Local Code (raw)</label>
160:            <input required className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
165:            <label className="block text-xs text-gray-400 mb-1">Local Code (canonical)</label>
166:            <input required className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
171:            <label className="block text-xs text-gray-400 mb-1">Mapped Use (≤8 chars)</label>
172:            <input required maxLength={8} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
--- Hardcoded hex colors ---

FILE: src/app/components/GrowthRateDetail/index.tsx
--- Tailwind color classes ---
27:      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-2xl mx-4">
28:        <div className="px-4 py-3 border-b border-slate-600 flex justify-between items-center">
30:          <button onClick={onClose} className="text-slate-400 hover:text-white">
36:          <div className="bg-slate-700 rounded p-3">
37:            <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600 mb-2">
51:                    className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
61:                      className="w-full bg-gray-700 border border-slate-500 rounded px-2 py-1 text-white text-sm font-medium text-center"
65:                    <span className="ml-1 text-blue-400 text-sm font-medium">%</span>
71:                    className="w-full bg-gray-700 border border-slate-500 rounded px-2 py-1 text-white text-sm font-medium text-center"
76:                <div className="w-1/6 text-slate-300 text-sm">{step.thruPeriod}</div>
79:            <div className="mt-3 text-xs text-slate-400">E = End of Analysis</div>
83:        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
86:            className="px-4 py-2 border border-slate-500 rounded text-slate-300 hover:bg-slate-700 text-sm"
92:            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
--- Hardcoded hex colors ---

FILE: src/app/components/GrowthRates-Original.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/GrowthRates.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/Home/HomeOverview.tsx
--- Tailwind color classes ---
132:          <p className="text-gray-400 mb-4">No active project selected</p>
150:      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
161:                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-2xl font-bold mb-2"
172:                <span className="text-sm text-gray-400">Type:</span>
177:                    className="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
190:                  <span className="px-3 py-1 bg-blue-900/30 border border-blue-700 rounded text-blue-300 text-sm font-medium">
198:                <span className="text-sm text-gray-400">Complexity:</span>
203:                    className="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
228:                <label className="text-xs text-gray-400">City</label>
234:                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
243:                <label className="text-xs text-gray-400">County</label>
249:                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
258:                <label className="text-xs text-gray-400">State</label>
264:                    className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
275:              <label className="text-xs text-gray-400">Description</label>
280:                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
285:                <p className="text-gray-300 text-sm">
292:              <div className="mt-3 px-3 py-2 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
332:        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
337:              <div className="text-4xl font-bold text-blue-300 mb-1">
--- Hardcoded hex colors ---

FILE: src/app/components/Home/UnderConstruction.tsx
--- Tailwind color classes ---
91:  'in-progress': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
92:  'testing': 'bg-green-500/20 border-green-500/30 text-green-400',
93:  'planned': 'bg-gray-500/20 border-gray-500/30 text-gray-400'
112:    <div className="min-h-screen bg-gray-950 p-6">
119:        <p className="text-gray-400 text-lg">
130:            className="group relative bg-gray-800 border border-gray-700 rounded-lg p-6 text-left transition-all hover:border-gray-600 hover:bg-gray-750 hover:scale-105 active:scale-100"
145:            <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-blue-400 transition-colors">
148:            <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
154:                  <span className="text-gray-500">Progress</span>
155:                  <span className="text-gray-400 font-medium">{feature.progress}%</span>
157:                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
159:                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
170:                  className="w-5 h-5 text-blue-400"
189:      <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
193:            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
194:            <span className="text-gray-400">In Progress - Actively being developed</span>
197:            <div className="w-3 h-3 rounded-full bg-green-500"></div>
198:            <span className="text-gray-400">Testing - Feature complete, undergoing testing</span>
201:            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
202:            <span className="text-gray-400">Planned - Scheduled for future development</span>
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/InlineTaxonomySelector.tsx
--- Tailwind color classes ---
181:              className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
203:                className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
226:                className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs text-white"
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/LandUseCanvas.tsx
--- Tailwind color classes ---
124:    'Residential': { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
125:    'Commercial': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
126:    'Industrial': { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-500' },
127:    'Open Space': { bg: 'bg-green-600', text: 'text-white', border: 'border-green-500' },
128:    'Common Areas': { bg: 'bg-yellow-600', text: 'text-white', border: 'border-yellow-500' },
129:    'Institutional': { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-500' },
130:    'Mixed Use': { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-500' },
131:    'Utilities': { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-500' },
132:    'Transportation': { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-500' }
137:      { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-500' };
169:    if (hasData === undefined) return 'bg-gray-600';
170:    return hasData ? 'bg-green-600' : 'bg-yellow-600';
180:      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
181:        <div className="text-gray-400">Loading land use data...</div>
188:      <div className="flex-1 p-6 bg-gray-950">
189:        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
200:                      className="min-h-full rounded-lg bg-gray-800 cursor-pointer border-2 border-gray-500 border-solid transition-all duration-200 group overflow-hidden"
223:                                <div className="text-xs text-gray-400 mb-2">Direct Land Uses:</div>
227:                                    className="bg-gray-700 rounded p-2 border border-gray-600"
233:                                      <div className="text-xs text-gray-300 mt-1">{landuse.description}</div>
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/LandUseDetails.tsx
--- Tailwind color classes ---
146:      <div className="absolute right-0 top-0 h-full w-2/3 bg-gray-800 border-l border-gray-600 shadow-xl flex flex-col">
148:        <div className="px-6 py-4 border-b border-gray-600 flex items-center justify-between">
153:            <p className="text-sm text-gray-400">Development Standards & Products</p>
165:        <div className="flex border-b border-gray-600">
176:                  ? 'text-blue-400 border-b-2 border-blue-400'
177:                  : 'text-gray-400 hover:text-gray-300'
190:              <div className="text-gray-400">Loading subtype details...</div>
211:                        <div key={spec.res_spec_id} className="bg-gray-700 rounded-lg p-4 mb-4">
214:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Density</h4>
222:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Lot Dimensions</h4>
230:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Building</h4>
238:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Setbacks (ft)</h4>
248:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Requirements</h4>
259:                                    <div className="text-xs text-gray-400">
275:                            <div className="mt-3 pt-3 border-t border-gray-600">
276:                              <p className="text-sm text-gray-300">{spec.notes}</p>
299:                        <div key={spec.com_spec_id} className="bg-gray-700 rounded-lg p-4 mb-4">
302:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Intensity</h4>
310:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Building</h4>
318:                              <h4 className="text-sm font-medium text-gray-300 mb-2">Parking</h4>
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/LandUseMatchWizard.tsx
--- Tailwind color classes ---
159:        <div className="bg-gray-800 rounded-lg p-6 w-96">
162:            <div className="w-full bg-gray-700 rounded-full h-2">
163:              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/2"></div>
174:        <div className="bg-gray-800 rounded-lg p-6 w-96">
176:            <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
194:        <div className="bg-gray-800 rounded-lg p-6 w-96">
196:            <Check className="mx-auto mb-4 text-green-500" size={48} />
198:            <div className="text-sm text-gray-400 mb-4">
216:      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
218:        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
221:            <p className="text-gray-400 text-sm">
235:        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
239:              <div className="text-gray-400">Total Parcel Codes</div>
243:              <div className="text-gray-400">Matched Codes</div>
244:              <div className="text-green-400 font-semibold">{analysis.analysis.matched_codes}</div>
247:              <div className="text-gray-400">Need Mapping</div>
248:              <div className="text-yellow-400 font-semibold">{analysis.analysis.unmatched_parcel_codes}</div>
251:              <div className="text-gray-400">Available in System</div>
252:              <div className="text-blue-400 font-semibold">{analysis.analysis.unused_system_codes}</div>
262:            <div key={unmatchedCode.code} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/LandUseSchema.tsx
--- Tailwind color classes ---
71:    'Residential': { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
72:    'Commercial': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
73:    'Industrial': { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-500' },
74:    'Open Space': { bg: 'bg-green-600', text: 'text-white', border: 'border-green-500' },
75:    'Common Areas': { bg: 'bg-yellow-600', text: 'text-white', border: 'border-yellow-500' },
76:    'Institutional': { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-500' },
77:    'Mixed Use': { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-500' },
78:    'Utilities': { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-500' },
79:    'Transportation': { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-500' }
84:      { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-500' };
121:    <div className="bg-gray-950 min-h-screen">
123:      <div className="bg-gray-800 border-b border-gray-700 p-6">
130:                <p className="text-sm text-gray-400">
138:                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-all duration-200 flex items-center gap-2"
155:                    className={`flex items-center justify-center h-20 w-24 cursor-pointer border-2 border-gray-500 border-solid transition-all duration-200 rounded-lg hover:outline hover:outline-2 ${
158:                        : `bg-gray-700 hover:${colors.bg}`
164:                        isSelected ? colors.text : `text-gray-300 hover:${colors.text}`
173:                <div className="text-gray-400 text-sm">Loading families...</div>
194:          <div className="flex items-center justify-center h-full bg-gray-950">
195:            <div className="text-center text-gray-400">
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/SimpleTaxonomySelector.tsx
--- Tailwind color classes ---
188:        <label className="block text-sm font-medium text-gray-300 mb-1">
195:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
208:        <label className="block text-sm font-medium text-gray-300 mb-1">
215:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
225:          <p className="text-xs text-gray-400 mt-1">Select a family first</p>
231:        <label className="block text-sm font-medium text-gray-300 mb-1">
238:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
251:          <p className="text-xs text-gray-400 mt-1">Select a type first</p>
--- Hardcoded hex colors ---

FILE: src/app/components/LandUse/TaxonomySelector.tsx
--- Tailwind color classes ---
195:        <label className="block text-sm font-medium text-gray-300 mb-1">
202:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
212:          <p className="text-xs text-gray-400 mt-1">Loading families...</p>
218:        <label className="block text-sm font-medium text-gray-300 mb-1">
225:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
238:          <p className="text-xs text-gray-400 mt-1">Loading density classifications...</p>
244:        <label className="block text-sm font-medium text-gray-300 mb-1">
251:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
261:          <p className="text-xs text-gray-400 mt-1">Loading types...</p>
264:          <p className="text-xs text-gray-400 mt-1">Select a family first</p>
270:        <label className="block text-sm font-medium text-gray-300 mb-1">
277:          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
290:          <p className="text-xs text-gray-400 mt-1">Loading products...</p>
293:          <p className="text-xs text-gray-400 mt-1">Select a type first</p>
299:        <div className="bg-gray-700 border border-gray-600 rounded-md p-3 mt-4">
300:          <h4 className="font-medium text-sm text-gray-300 mb-2">Current Selection</h4>
301:          <div className="text-xs text-gray-400 space-y-1">
--- Hardcoded hex colors ---

FILE: src/app/components/LandUsePricing/index.tsx
--- Tailwind color classes ---
130:      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
131:        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
134:        <div className="p-4 text-center text-slate-400">
144:      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
145:        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
149:          <div className="bg-yellow-900 border border-yellow-600 rounded px-3 py-2 mb-3">
150:            <div className="text-yellow-200 text-sm">
156:            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
166:    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
167:      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
173:            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:bg-gray-600"
178:        <div className="flex items-center text-xs space-x-2 text-slate-300">
189:        <div className="bg-red-900 border-b border-red-600 px-3 py-2">
190:          <div className="text-red-200 text-xs">{error}</div>
198:              <div className="w-full bg-blue-900 border border-slate-600 rounded px-2 py-1 text-white text-xs font-medium">
203:              <div className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
208:              <div className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs">
216:                className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
223:                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
234:                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
--- Hardcoded hex colors ---

FILE: src/app/components/LandscaperChatModal.tsx
--- Tailwind color classes ---
42:        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
--- Hardcoded hex colors ---

FILE: src/app/components/MapLibre/GISMap.tsx
--- Tailwind color classes ---
898:      <div className={`flex items-center justify-center bg-gray-800 text-white ${className}`}>
900:          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
903:          <p className="text-red-300">{mapError}</p>
912:        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
914:            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
928:        <div className="absolute top-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
941:                  ? 'bg-blue-600 text-white'
942:                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
962:                  ? 'bg-blue-600 text-white'
963:                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
977:        <div className="absolute top-4 left-4 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg max-w-sm">
980:            <div className="border-b border-gray-600 pb-2">
982:              <p className="text-sm text-gray-300">
990:                <span className="text-sm text-gray-300">Total Area:</span>
1000:                <div key={parcel.PARCELID} className="text-xs bg-gray-700 rounded p-2">
1002:                  <div className="text-gray-300">
1006:                    <div className="text-gray-400 truncate">{parcel.OWNERNME1}</div>
1013:            <div className="pt-2 border-t border-gray-600">
1026:                className="w-full px-3 py-2 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white"
1036:        <div className="absolute bottom-4 left-4 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
--- Hardcoded hex colors ---

FILE: src/app/components/MapView.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/Market/MarketAssumptions.tsx
--- Tailwind color classes ---
144:    <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
145:      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
147:        <div className="flex text-xs text-slate-300 mt-1">
159:                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
168:                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
175:                className="w-full bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
194:    <div className="p-4 space-y-4 bg-slate-900 min-h-screen text-white">
196:      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
197:        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
200:        <div className="bg-slate-700 px-3 py-1 border-b border-slate-600">
201:          <h3 className="text-xs font-medium text-slate-300">Other Market Factors</h3>
211:                  className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-xs text-center"
222:              <div className="w-1/4 text-blue-400">
224:                  <button onClick={() => setShowCommissionDetail(true)} className="text-blue-400 hover:text-blue-300 underline">
231:              <div className="w-1/4 text-slate-400 text-xs">{item.dvl}</div>
236:        <div className="bg-slate-700 px-3 py-1 border-b border-slate-600 border-t">
237:          <h3 className="text-xs font-medium text-slate-300">Growth Rates</h3>
247:                  className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-xs text-center"
262:                  className="text-blue-400 hover:text-blue-300 underline text-xs"
281:      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
--- Hardcoded hex colors ---

FILE: src/app/components/Market/MarketMapView.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/MarketAssumptions.tsx
--- Tailwind color classes ---
182:    <div className="p-4 space-y-4 bg-slate-900 min-h-screen text-white">
184:      <div className="bg-slate-800 rounded border border-slate-600 overflow-hidden">
185:        <div className="bg-gray-900 px-3 py-2 border-b border-slate-600 flex items-center justify-between">
187:          <button onClick={onSave} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs">
--- Hardcoded hex colors ---

FILE: src/app/components/MarketAssumptionsComparison.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/MarketAssumptionsMUI.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/MarketAssumptionsNative.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/MarketFactors/index.tsx
--- Tailwind color classes ---
52:        <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
65:                  className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
74:                  <span className="absolute right-2 text-slate-300">%</span>
81:                  className="bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
94:                    className="text-blue-400 hover:text-blue-300 underline text-xs"
103:                    className="bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
113:                    className="text-blue-400 hover:text-blue-300 underline text-xs"
121:                  className="bg-slate-700 border border-slate-600 rounded px-1 py-1 text-white text-xs"
133:      <div className="bg-slate-700 px-3 py-1 border-b border-slate-600 border-t">
134:        <h3 className="text-xs font-medium text-slate-300">Growth Rates</h3>
144:                className="w-full bg-gray-700 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
154:                className="text-blue-400 hover:text-blue-300 underline text-xs"
185:      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-2xl mx-4">
186:        <div className="px-4 py-3 border-b border-slate-600 flex justify-between items-center">
188:          <button onClick={onClose} className="text-slate-400 hover:text-white">
195:            <div className="flex text-xs text-slate-300 pb-2 border-b border-slate-600">
205:                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
216:                    className="w-full bg-yellow-100 border border-slate-600 rounded px-2 py-1 text-slate-800 text-sm text-center"
225:                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
240:        <div className="px-4 py-3 border-t border-slate-600 flex justify-end space-x-3">
--- Hardcoded hex colors ---

FILE: src/app/components/Migration/TaxonomyMigration.tsx
--- Tailwind color classes ---
118:      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
119:        <div className="border-b border-gray-200 px-6 py-4">
120:          <h2 className="text-lg font-semibold text-gray-900">
123:          <p className="text-sm text-gray-600 mt-1">
131:            <h3 className="text-md font-medium text-gray-900 mb-3">Current Status</h3>
134:                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
135:                  <div className="text-2xl font-bold text-blue-900">{status.total}</div>
136:                  <div className="text-sm text-blue-700">Total Parcels</div>
138:                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
139:                  <div className="text-2xl font-bold text-green-900">{status.migrated}</div>
140:                  <div className="text-sm text-green-700">Migrated</div>
142:                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
143:                  <div className="text-2xl font-bold text-yellow-900">{status.pending}</div>
144:                  <div className="text-sm text-yellow-700">Pending</div>
148:              <div className="text-gray-500">Loading status...</div>
154:            <h3 className="text-md font-medium text-gray-900 mb-3">Actions</h3>
159:                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
167:                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
175:                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
184:            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
--- Hardcoded hex colors ---

FILE: src/app/components/NewProject/BasicInfoStep.tsx
--- Tailwind color classes ---
25:        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
26:          Project Name <span className="text-red-500">*</span>
32:          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
34:              ? 'border-red-500 focus:ring-red-500'
35:              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
40:          <p className="mt-1 text-sm text-red-500">{errors.project_name}</p>
45:        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
51:          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
58:        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
65:          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
72:          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
79:            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
85:          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
92:            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
98:          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
105:            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
113:        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
120:          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
--- Hardcoded hex colors ---

FILE: src/app/components/NewProject/PropertyTypeStep.tsx
--- Tailwind color classes ---
58:        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
59:          Select Property Type <span className="text-red-500">*</span>
63:          <p className="mb-3 text-sm text-red-500">{errors.property_type}</p>
77:                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
78:                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
87:                          ? 'text-blue-700 dark:text-blue-300'
88:                          : 'text-gray-900 dark:text-gray-100'
94:                          className="w-5 h-5 text-blue-500 flex-shrink-0"
108:                        ? 'text-blue-600 dark:text-blue-400'
109:                        : 'text-gray-600 dark:text-gray-400'
--- Hardcoded hex colors ---

FILE: src/app/components/NewProject/TemplateStep.tsx
--- Tailwind color classes ---
60:      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
69:        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
70:        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading templates...</p>
77:      <div className="text-center py-8 text-red-500">
85:      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
95:        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
96:          Select Template <span className="text-red-500">*</span>
100:          <p className="mb-3 text-sm text-red-500">{errors.template}</p>
114:                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
115:                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
123:                          ? 'text-blue-700 dark:text-blue-300'
124:                          : 'text-gray-900 dark:text-gray-100'
131:                            ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
132:                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
142:                          ? 'text-blue-600 dark:text-blue-400'
143:                          : 'text-gray-600 dark:text-gray-400'
152:                          ? 'text-blue-500 dark:text-blue-400'
153:                          : 'text-gray-500 dark:text-gray-500'
162:                      className="w-6 h-6 text-blue-500 flex-shrink-0"
--- Hardcoded hex colors ---

FILE: src/app/components/NewProjectModal.tsx
--- Tailwind color classes ---
879:          isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
885:            isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'
896:              isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
907:            className={`flex-1 overflow-y-auto border-r p-6 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}
913:                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
924:                          ? 'bg-blue-600 text-white'
926:                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
927:                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
936:                  <p className="mt-2 text-xs text-rose-500">{errors.analysis_type.message as string}</p>
942:                <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
951:                        ? 'bg-emerald-600 text-white'
953:                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
954:                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
964:                        ? 'bg-emerald-600 text-white'
966:                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
967:                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
974:                  <p className="mt-2 text-xs text-rose-500">{errors.property_category.message as string}</p>
992:                        className={`peer w-full rounded-md border px-3 pb-1.5 pt-4 text-sm transition appearance-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
993:                          isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'
1006:                            ? 'top-1 text-[10px] text-blue-600'
--- Hardcoded hex colors ---

FILE: src/app/components/OpExHierarchy.tsx
--- Tailwind color classes ---
190:      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
200:          <div className="text-gray-500">Loading operating expenses...</div>
210:          <div className="text-red-600 font-semibold mb-2">Error Loading Data</div>
211:          <div className="text-gray-600 text-sm">{error}</div>
214:            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
226:        <div className="text-center text-gray-500">
258:          className="bg-gray-800 text-white px-3 py-1.5 rounded border border-gray-700"
272:              className="w-32 rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-right text-white"
288:            <div className="font-mono text-gray-400">
294:            <span className="text-gray-400">$</span>
298:              className="w-36 rounded border border-gray-300 px-3 py-1.5 text-right"
337:      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
343:            className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-white"
363:            className="w-20 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-right text-white"
384:            className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-white"
408:        className="mt-2 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
427:        <span className="text-gray-600">$</span>
445:          className="w-40 rounded border border-gray-300 px-3 py-1.5 text-right"
457:    let textColorClass = 'text-gray-900';
461:      bgClass = 'bg-gray-800 text-white';
--- Hardcoded hex colors ---

FILE: src/app/components/Planning/PlanningContent.tsx
--- Tailwind color classes ---
601:        <div className="text-red-400 text-sm">Failed to load planning data. Please refresh or check server logs.</div>
609:        <div className="text-gray-400">Loading planning data...</div>
1347:            parcel.family_name === 'Residential' ? 'bg-blue-900 text-blue-300' :
1348:            parcel.family_name === 'Commercial' ? 'bg-purple-900 text-purple-300' :
1349:            parcel.family_name === 'Industrial' ? 'bg-orange-900 text-orange-300' :
1350:            'bg-indigo-900 text-indigo-300'
1625:                idx % 8 === 0 ? 'bg-blue-900 text-blue-300' :
1626:                idx % 8 === 1 ? 'bg-purple-900 text-purple-300' :
1627:                idx % 8 === 2 ? 'bg-orange-900 text-orange-300' :
1628:                idx % 8 === 3 ? 'bg-green-900 text-green-300' :
1629:                idx % 8 === 4 ? 'bg-red-900 text-red-300' :
1630:                idx % 8 === 5 ? 'bg-yellow-900 text-yellow-300' :
1631:                idx % 8 === 6 ? 'bg-pink-900 text-pink-300' :
1632:                'bg-indigo-900 text-indigo-300'
--- Hardcoded hex colors ---

FILE: src/app/components/Planning/PlanningOverviewControls.tsx
--- Tailwind color classes ---
119:        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity';
177:          indicator.className = 'fixed top-20 right-4 bg-green-500 text-white px-3 py-1.5 rounded shadow-lg z-50 text-sm';
277:                      Level {level}{isLevel3 && <span className="text-[10px] text-slate-400"> (req)</span>}
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/AddContainerModal.tsx
--- Tailwind color classes ---
99:      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
101:        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
102:          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
120:              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
130:              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
133:            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
142:              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
144:              Name <span className="text-red-500">*</span>
153:              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
161:            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
162:              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
167:          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx
--- Tailwind color classes ---
26:      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96 max-w-[90vw]">
27:        <div className="border-b border-gray-700 px-6 py-4">
32:          <div className="text-gray-300 mb-4">
37:            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
38:              <div className="text-red-400 font-medium mb-2">
41:              <ul className="text-red-300 text-sm space-y-1">
52:              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
58:              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/ContainerTreeView.tsx
--- Tailwind color classes ---
219:        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
226:            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
234:          <p className="text-sm text-gray-500 dark:text-gray-400">
264:        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
273:            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/DraggableContainerNode.tsx
--- Tailwind color classes ---
122:        className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-all"
127:            className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
138:              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
149:          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
163:                className="border-b-2 border-blue-500 bg-transparent focus:outline-none w-full text-gray-900 dark:text-gray-100"
169:                className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-gray-100"
182:                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
192:              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
202:                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
214:          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
216:              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Attributes</span>
223:                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
250:                    <label className="text-xs text-gray-600 dark:text-gray-400 w-24 capitalize">
264:                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
267:                      <span className={`flex-1 text-xs ${isReadonly ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}`}>
269:                        {isReadonly && <span className="ml-1 text-gray-500 dark:text-gray-400 text-[10px]">(calculated)</span>}
281:                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
290:                  className="px-3 py-1 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 rounded"
302:        <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
327:          <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/DraggableTile.tsx
--- Tailwind color classes ---
31:        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
33:        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
35:        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
37:        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200'
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/DropZone.tsx
--- Tailwind color classes ---
33:      return 'border-blue-400 bg-blue-50'
36:      return 'border-blue-300 bg-blue-25'
38:    return 'border-gray-300'
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/NavigationTiles.tsx
--- Tailwind color classes ---
35:          className="flex items-center justify-center h-full aspect-square bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors duration-200"
38:            <div className="w-4 h-4 bg-blue-500 rounded mx-auto mb-1"></div>
48:          className="flex items-center justify-center h-full aspect-square bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors duration-200"
51:            <div className="w-4 h-4 bg-slate-400 rounded mx-auto mb-1"></div>
53:            <div className="text-xs text-gray-400">
64:          className="flex items-center justify-center h-full aspect-square bg-purple-700 border border-purple-600 rounded-lg hover:bg-purple-600 transition-colors duration-200"
67:            <div className="w-4 h-4 bg-purple-400 rounded mx-auto mb-1"></div>
69:            <div className="text-xs text-gray-400">
80:          className="flex items-center justify-center h-full aspect-square bg-blue-600 border border-blue-500 rounded-lg hover:bg-blue-700 transition-colors duration-200"
93:          className="flex items-center justify-center h-full aspect-square bg-green-600 border border-green-500 rounded-lg hover:bg-green-700 transition-colors duration-200"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/ParcelTile.tsx
--- Tailwind color classes ---
53:  if (!familyName) return 'bg-slate-600'
55:    case 'Residential': return 'bg-blue-700'
56:    case 'Commercial': return 'bg-purple-700'
57:    case 'Industrial': return 'bg-orange-700'
58:    case 'Institutional': return 'bg-indigo-700'
59:    case 'Common Areas': return 'bg-teal-700'
60:    case 'Open Space': return 'bg-green-700'
61:    case 'Public': return 'bg-cyan-700'
62:    default: return 'bg-slate-600'
67:  if (!familyName) return 'border-slate-500'
69:    case 'Residential': return 'border-blue-500'
70:    case 'Commercial': return 'border-purple-500'
71:    case 'Industrial': return 'border-orange-500'
72:    case 'Institutional': return 'border-indigo-500'
73:    case 'Common Areas': return 'border-teal-500'
74:    case 'Open Space': return 'border-green-500'
75:    case 'Public': return 'border-cyan-500'
76:    default: return 'border-slate-500'
111:          <p className="text-xs text-gray-100 opacity-90 mb-2">{parcel.description}</p>
114:          <p className="text-xs text-gray-200 opacity-80 italic">{parcel.notes}</p>
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/PhaseCanvas.tsx
--- Tailwind color classes ---
81:      <div className="flex-1 p-6 bg-gray-950">
82:        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
84:          <div className="border-b border-gray-700 p-4">
99:          <div className="p-6 h-full bg-gray-900">
104:                <p className="text-sm text-gray-300 mt-1">{(phase as any).description}</p>
111:              className="w-full h-96 bg-gray-700 border-2 border-solid border-gray-600 rounded-lg"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/PhaseCanvasInline.tsx
--- Tailwind color classes ---
220:      case 'LDR': return 'bg-emerald-600'
221:      case 'MDR': return 'bg-green-600'
222:      case 'HDR': return 'bg-teal-600'
223:      case 'MHDR': return 'bg-cyan-600'
224:      case 'C': return 'bg-orange-600'
225:      case 'MU': return 'bg-amber-600'
226:      case 'OS': return 'bg-blue-600'
227:      default: return 'bg-slate-600'
233:      case 'LDR': return 'border-emerald-500'
234:      case 'MDR': return 'border-green-500'
235:      case 'HDR': return 'border-teal-500'
236:      case 'MHDR': return 'border-cyan-500'
237:      case 'C': return 'border-orange-500'
238:      case 'MU': return 'border-amber-500'
239:      case 'OS': return 'border-blue-500'
240:      default: return 'border-slate-500'
256:          className="bg-transparent text-white text-xs px-1 py-0.5 rounded border border-gray-400 w-full font-semibold"
261:            <option key={family.family_id || family.family_name || index} value={family.family_name} className="bg-gray-800">
280:          className="bg-transparent text-white text-xs px-1 py-0.5 rounded border border-gray-400 w-full font-semibold"
286:            <option key={subtype.subtype_id || subtype.subtype_name || index} value={subtype.subtype_name} className="bg-gray-800">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/PlanningWizard.tsx
--- Tailwind color classes ---
413:      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
421:      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-300">
429:      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-red-400">
443:      <div className="min-h-screen flex flex-col bg-gray-950 planning-wizard-content">
445:        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
451:                  ? 'bg-blue-600 text-white'
452:                  : 'text-gray-400 hover:text-gray-200'
461:                  ? 'bg-blue-600 text-white'
462:                  : 'text-gray-400 hover:text-gray-200'
475:              <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
478:                  <h2 className="text-2xl font-bold text-gray-100">
481:                  <p className="text-gray-400 text-lg">
484:                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left space-y-3">
486:                    <ol className="text-gray-300 space-y-2 text-sm">
487:                      <li>1. Import or enter units in the <span className="text-blue-400 font-semibold">Rent Roll</span> tab</li>
488:                      <li>2. Click <span className="text-blue-400 font-semibold">Analyze Rent Roll</span> to group units by characteristics</li>
495:                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
499:                  <p className="text-gray-500 text-sm mt-4">
519:              <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
522:                  <h2 className="text-2xl font-bold text-gray-100">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/PlanningWizardInline.tsx
--- Tailwind color classes ---
707:      <div className="min-h-screen flex flex-col bg-gray-950">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/ProjectCanvas.tsx
--- Tailwind color classes ---
68:    if (!familyName) return 'bg-slate-600'
70:      case 'Residential': return 'bg-blue-700'
71:      case 'Commercial': return 'bg-purple-700'
72:      case 'Industrial': return 'bg-orange-700'
73:      case 'Institutional': return 'bg-indigo-700'
74:      case 'Common Areas': return 'bg-teal-700'
75:      case 'Open Space': return 'bg-green-700'
76:      case 'Public': return 'bg-cyan-700'
77:      default: return 'bg-slate-600'
82:    if (!familyName) return 'border-slate-500'
84:      case 'Residential': return 'border-blue-500'
85:      case 'Commercial': return 'border-purple-500'
86:      case 'Industrial': return 'border-orange-500'
87:      case 'Institutional': return 'border-indigo-500'
88:      case 'Common Areas': return 'border-teal-500'
89:      case 'Open Space': return 'border-green-500'
90:      case 'Public': return 'border-cyan-500'
91:      default: return 'border-slate-500'
304:      <div className="flex-1 p-6 bg-gray-950">
305:        <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/ProjectCanvasInline.tsx
--- Tailwind color classes ---
19:  if (!landUse) return 'bg-slate-600'
24:      return 'bg-emerald-600'
27:      return 'bg-green-600'
30:      return 'bg-teal-600'
34:      return 'bg-orange-600'
36:      return 'bg-amber-600'
38:      return 'bg-blue-600'
40:      return 'bg-slate-600'
45:  if (!landUse) return 'border-slate-500'
50:      return 'border-emerald-500'
53:      return 'border-green-500'
56:      return 'border-teal-500'
60:      return 'border-orange-500'
62:      return 'border-amber-500'
64:      return 'border-blue-500'
66:      return 'border-slate-500'
173:        <div className="text-xs text-gray-200 col-span-2 text-center italic">No {labels.level3LabelPlural.toLowerCase()}</div>
179:    <div className="flex flex-1 flex-col gap-4 p-6 bg-gray-950 min-h-screen">
203:              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
210:                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/Sidebar.tsx
--- Tailwind color classes ---
22:    <div className="w-24 bg-gray-800 border-r border-gray-700 flex flex-col p-2 gap-2">
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/cards/AreaDetailCard.tsx
--- Tailwind color classes ---
115:      <div className={`fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
120:          <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
124:              className="text-white hover:text-purple-200 text-xl"
135:                <label className="block text-sm font-medium text-gray-300 mb-2">
142:                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
149:                <label className="block text-sm font-medium text-gray-300 mb-2">
156:                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
162:              <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
163:                <h4 className="font-medium text-sm text-gray-300 mb-2">Area Summary</h4>
164:                <div className="text-xs text-gray-400 space-y-1">
179:          <div className="border-t border-gray-700 p-4 flex justify-between">
184:                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
193:                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
199:                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
211:          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96">
212:            <div className="border-b border-gray-700 px-6 py-4">
216:              <p className="text-gray-300 mb-4">You have unsaved changes. What would you like to do?</p>
220:                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
229:                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
238:                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx
--- Tailwind color classes ---
439:      <div className={`fixed right-0 top-0 h-full w-[480px] bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
444:          <div className="bg-green-600 text-white p-4 flex justify-between items-center">
447:              <p className="text-sm text-green-100">{area.name} • {phase.name}</p>
451:              className="text-white hover:text-green-200 text-xl"
474:                <label className="block text-sm font-medium text-gray-300 mb-2">
481:                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
488:                <label className="block text-sm font-medium text-gray-300 mb-2">
494:                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
508:                  <label className="block text-sm font-medium text-gray-300 mb-2">
514:                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
529:                  <label className="block text-sm font-medium text-gray-300 mb-2">
535:                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
550:                      className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
560:                  <label className="block text-sm font-medium text-gray-300 mb-2">
569:                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
575:                    <label className="block text-sm font-medium text-gray-300 mb-2">
583:                      className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
586:                      <p className="text-gray-400 text-xs mt-1">
600:                  <label className="block text-sm font-medium text-gray-300 mb-2">
607:                    className="w-full bg-gray-600 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 cursor-default"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx
--- Tailwind color classes ---
67:      <div className={`fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
72:          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
75:              <p className="text-sm text-blue-100">{area.name}</p>
79:              className="text-white hover:text-blue-200 text-xl"
90:                <label className="block text-sm font-medium text-gray-300 mb-2">
97:                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
104:                <label className="block text-sm font-medium text-gray-300 mb-2">
111:                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
117:              <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
118:                <h4 className="font-medium text-sm text-gray-300 mb-2">Phase Summary</h4>
119:                <div className="text-xs text-gray-400 space-y-1">
135:                <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
136:                  <h4 className="font-medium text-sm text-gray-300 mb-2">Land Use Breakdown</h4>
137:                  <div className="text-xs text-gray-400 space-y-1">
156:          <div className="border-t border-gray-700 p-4 flex justify-between">
161:                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
170:                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
176:                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/forms/AreaForm.tsx
--- Tailwind color classes ---
78:      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
79:        <div className="border-b border-gray-700 px-6 py-4">
87:              <label className="block text-sm font-medium text-gray-300 mb-1">
94:                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
95:                  errors.name ? 'border-red-500' : 'border-gray-600'
101:                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
107:              <label className="block text-sm font-medium text-gray-300 mb-1">
114:                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
125:              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
131:              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
142:          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96">
143:            <div className="border-b border-gray-700 px-6 py-4">
147:              <p className="text-gray-300 mb-4">You have unsaved data. What would you like to do?</p>
151:                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
160:                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/forms/ParcelForm.tsx
--- Tailwind color classes ---
309:      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[600px] max-h-[90vh] overflow-y-auto">
310:        <div className="border-b border-gray-700 px-6 py-4">
312:          <p className="text-sm text-gray-400 mt-1">
321:              <h3 className="text-lg font-medium text-gray-300 mb-3">Land Use Classification</h3>
346:                <p className="text-red-400 text-xs mt-1">{errors.taxonomy}</p>
349:                <p className="text-red-400 text-xs mt-1">{errors.density}</p>
355:              <label className="block text-sm font-medium text-gray-300 mb-1">
356:                Legacy Land Use Type <span className="text-xs text-gray-500">(for backward compatibility)</span>
361:                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
373:              <label className="block text-sm font-medium text-gray-300 mb-1">
381:                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
382:                  errors.acres ? 'border-red-500' : 'border-gray-600'
387:                <p className="text-red-400 text-xs mt-1">{errors.acres}</p>
393:              <label className="block text-sm font-medium text-gray-300 mb-1">
400:                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
401:                  errors.units ? 'border-red-500' : 'border-gray-600'
407:                <p className="text-red-400 text-xs mt-1">{errors.units}</p>
410:                <p className="text-gray-400 text-xs mt-1">
421:                  <label className="block text-sm font-medium text-gray-300 mb-1">
429:                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
--- Hardcoded hex colors ---

FILE: src/app/components/PlanningWizard/forms/PhaseForm.tsx
--- Tailwind color classes ---
80:      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[500px] max-h-[90vh] overflow-y-auto">
81:        <div className="border-b border-gray-700 px-6 py-4">
89:              <label className="block text-sm font-medium text-gray-300 mb-1">
96:                className={`w-full bg-gray-700 border rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
97:                  errors.name ? 'border-red-500' : 'border-gray-600'
103:                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
109:              <label className="block text-sm font-medium text-gray-300 mb-1">
116:                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
127:              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
133:              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
144:          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-96">
145:            <div className="border-b border-gray-700 px-6 py-4">
149:              <p className="text-gray-300 mb-4">You have unsaved data. What would you like to do?</p>
153:                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
162:                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
--- Hardcoded hex colors ---

FILE: src/app/components/ProjectCosts/index.tsx
--- Tailwind color classes ---
33:      <div className="bg-slate-700 px-3 py-2 border-b border-slate-600">
35:        <div className="flex text-xs text-gray-300 mt-1">
47:                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
57:                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-center"
64:                className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-white text-xs"
--- Hardcoded hex colors ---

FILE: src/app/components/Setup/ProjectStructureChoice.tsx
--- Tailwind color classes ---
90:        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
109:        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
160:      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
161:        <div className="border-b border-gray-700 px-6 py-4">
163:          <p className="text-gray-400 text-sm mt-1">
170:            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
171:              <p className="text-red-300 text-sm">{error}</p>
177:            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
179:                <div className="text-blue-400 mt-1">
185:                  <div className="text-blue-300 font-medium text-sm mb-1">
188:                  <div className="text-blue-200 text-xs">
215:                    ? 'border-blue-500 bg-blue-900/20'
217:                    ? 'border-green-500 bg-green-900/10'
218:                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
223:                  <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
237:                    <p className="text-gray-300 text-sm mb-4">
242:                      <h4 className="text-sm font-medium text-gray-200 mb-2">Hierarchy:</h4>
243:                      <div className="flex items-center gap-2 text-sm text-gray-400">
246:                            <span className={index === 0 ? 'text-blue-400 font-medium' : ''}>{level}</span>
258:                      <h4 className="text-sm font-medium text-gray-200 mb-2">Benefits:</h4>
--- Hardcoded hex colors ---

FILE: src/app/components/Setup/ProjectTaxonomyWizard.tsx
--- Tailwind color classes ---
140:                <label className="flex items-start space-x-3 p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-blue-500">
151:                    <div className="text-sm text-gray-400">
158:                <label className="flex items-start space-x-3 p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-blue-500">
169:                    <div className="text-sm text-gray-400">
189:                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
190:                  <p className="text-sm text-blue-300">
198:                  <div key={index} className="border border-gray-600 rounded-lg p-4">
202:                          <label className="block text-sm font-medium text-gray-300 mb-1">
209:                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
214:                          <label className="block text-sm font-medium text-gray-300 mb-1">
221:                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
226:                          <label className="block text-sm font-medium text-gray-300 mb-1">
234:                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
238:                          <label className="block text-sm font-medium text-gray-300 mb-1">
246:                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
250:                          <label className="block text-sm font-medium text-gray-300 mb-1">
257:                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
265:                            className="text-red-400 hover:text-red-300 text-sm"
277:                          <div className="text-sm text-gray-400">
281:                            <div className="text-xs text-gray-500 mt-1">
--- Hardcoded hex colors ---

FILE: src/app/components/TaxonomySelector/TaxonomySelector.tsx
--- Tailwind color classes ---
168:    ? "text-xs px-1 py-0.5 border border-gray-300 rounded bg-white text-gray-900"
169:    : "px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
179:        {!compact && <label className="block text-sm font-medium text-gray-700">Family</label>}
197:        {!compact && <label className="block text-sm font-medium text-gray-700">Density</label>}
215:        {!compact && <label className="block text-sm font-medium text-gray-700">Type</label>}
234:          {!compact && <label className="block text-sm font-medium text-gray-700">Product</label>}
252:        <div className="text-sm text-gray-500">
--- Hardcoded hex colors ---

FILE: src/app/components/ThemeSwitcher.tsx
--- Tailwind color classes ---
58:      className="w-full text-left px-6 py-2 text-sm flex items-center space-x-3 hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-300 dark:text-gray-200 hover:text-white"
--- Hardcoded hex colors ---

FILE: src/app/components/ThemeToggle.tsx
--- Tailwind color classes ---
11:      <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
22:            className={theme === 'light' ? 'text-yellow-400' : 'text-gray-500'}
34:          <span className="text-xs text-gray-300 font-medium">
40:          className="px-3 py-1 text-xs font-medium rounded bg-gray-600 hover:bg-gray-500 text-white transition-colors"
--- Hardcoded hex colors ---

FILE: src/app/components/TimelineVisualization.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/TopNavigationBar.tsx
--- Tailwind color classes ---
207:                  className="absolute right-0 top-full mt-2 rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white shadow-lg"
--- Hardcoded hex colors ---

FILE: src/app/components/UniversalInventory/UniversalInventoryTable.tsx
--- Tailwind color classes ---
254:          colDef.cellClass = 'bg-blue-50 dark:bg-blue-900/20 font-semibold'
418:      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
419:        <p className="text-red-800 dark:text-red-200">
428:      <div className="p-6 text-center text-gray-500">
439:      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex-shrink-0">
443:            <span className="text-sm text-gray-400">
451:              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
458:              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
465:              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
472:              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
485:            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-b border-green-200 dark:border-green-800'
486:            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-b border-red-200 dark:border-red-800'
505:          --ag-background-color: rgb(31, 41, 55); /* bg-gray-800 */
506:          --ag-foreground-color: rgb(229, 231, 235); /* text-gray-200 */
507:          --ag-header-background-color: rgb(17, 24, 39); /* bg-gray-900 */
508:          --ag-header-foreground-color: rgb(209, 213, 219); /* text-gray-300 */
509:          --ag-border-color: rgb(55, 65, 81); /* border-gray-700 */
510:          --ag-row-hover-color: rgb(55, 65, 81); /* hover:bg-gray-700 */
517:      <div className="ag-theme-alpine-dark border border-gray-700 rounded-lg overflow-hidden" style={{ height: '600px', width: '100%' }}>
--- Hardcoded hex colors ---

FILE: src/app/components/assumptions/FieldRenderer.tsx
--- Tailwind color classes ---
217:        {isRequired && <span className="text-red-500 ml-1">*</span>}
--- Hardcoded hex colors ---

FILE: src/app/components/dashboard/DashboardMap.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/app/components/dashboard/TriageModal.tsx
--- Tailwind color classes ---
187:          <div className="text-sm text-amber-600 bg-amber-50 rounded p-2">
203:              selectedChoice === 'new' ? 'ring-2 ring-blue-500' : ''
233:              selectedChoice === 'associate' ? 'ring-2 ring-blue-500' : ''
286:              selectedChoice === 'knowledge' ? 'ring-2 ring-blue-500' : ''
--- Hardcoded hex colors ---

FILE: src/app/components/navigation/UserMenuDropdown.tsx
--- Tailwind color classes ---
61:          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
80:              <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full text-blue-500" />
139:                  className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm transition-colors text-red-400"
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/AIDocumentPrompt.tsx
--- Tailwind color classes ---
16:      className={cn('rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 backdrop-blur-sm', className)}
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/AssetTypeSection.tsx
--- Tailwind color classes ---
44:      className={`space-y-5 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
45:        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
49:        <h3 className="text-lg font-semibold text-slate-100">Analysis type</h3>
50:        <p className="text-sm text-slate-400">Choose the type of financial analysis for this project.</p>
63:                  ? 'border-blue-500 bg-blue-900/30 text-blue-100'
64:                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-400 hover:bg-slate-700'
68:              <p className="mt-1 text-xs text-slate-300">{option.description}</p>
74:        <p className="text-xs text-rose-400">{errors.analysis_type.message as string}</p>
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/Badge.tsx
--- Tailwind color classes ---
16:  primary: 'bg-blue-600/80 text-blue-100 border border-blue-500/70',
17:  secondary: 'bg-slate-700 text-slate-100 border border-slate-600',
18:  success: 'bg-emerald-600/80 text-emerald-50 border border-emerald-500',
19:  warning: 'bg-amber-600/80 text-amber-50 border border-amber-500'
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/ConfigureSection.tsx
--- Tailwind color classes ---
40:      className={`flex flex-col gap-6 rounded-xl border bg-slate-900/40 p-5 shadow-sm shadow-slate-950/30 transition-colors ${
41:        hasError ? 'border-rose-600/70 ring-1 ring-rose-500/40' : 'border-slate-800'
46:          <h3 className="text-lg font-semibold text-slate-100">Configure</h3>
47:          <p className="text-sm text-slate-400">
53:          <label className="block text-sm font-semibold text-slate-100">
60:            className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
63:            <p className="mt-2 text-xs text-rose-400">{errors.project_name.message as string}</p>
70:              <label className="block text-sm font-semibold text-slate-100">
77:                  className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
90:                  className="mt-2 border-slate-700 bg-slate-900/40 text-slate-100"
93:              <p className="mt-1 text-xs text-slate-400">
100:                <label className="block text-sm font-semibold text-slate-100">
106:                  className="mt-2 w-full rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
115:                <p className="mt-1 text-xs text-slate-400">
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/FloatingLabelInput.tsx
--- Tailwind color classes ---
34:            'peer w-full rounded-md border bg-slate-800/50 px-3 pb-2 pt-5 text-sm text-slate-100 placeholder-transparent transition',
35:            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
36:            error ? 'border-rose-500' : 'border-slate-700',
44:            'peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-500',
45:            'peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-blue-400',
46:            (isFocused || hasValue) ? 'top-1.5 text-xs text-blue-400' : 'top-3.5 text-sm text-slate-500'
52:          <p className="mt-1 text-xs text-rose-400">{error}</p>
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/LandscaperPanel.tsx
--- Tailwind color classes ---
473:      isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
477:        isDark ? 'border-slate-700' : 'border-slate-200'
479:        <MessageCircle className="h-5 w-5 text-blue-600" />
480:        <span className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Landscaper</span>
481:        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
488:        <div className={`border-b p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
510:                  ? 'bg-blue-600 text-white'
512:                    ? 'bg-slate-700 border border-slate-600 text-slate-200'
513:                    : 'bg-white border border-slate-200 text-slate-700'
536:              isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
548:      <div className={`border-t p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
556:            className={`flex-1 rounded-lg border px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
558:                ? 'border-slate-600 bg-slate-700 text-slate-100'
559:                : 'border-slate-300 bg-white text-slate-900'
565:            className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
574:            className={`mt-2 text-xs transition hover:text-blue-500 ${
575:              isDark ? 'text-slate-400' : 'text-slate-500'
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/LocationSection.tsx
--- Tailwind color classes ---
58:            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
59:            error ? 'border-rose-400' : (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'),
60:            isExtracted && !isDark && 'ring-2 ring-blue-300 bg-blue-50/50',
61:            isExtracted && isDark && 'ring-2 ring-blue-500/50 bg-blue-900/20',
70:              ? 'top-1 text-[10px] text-blue-600'
71:              : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
77:          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
82:          <p className="mt-1 text-xs text-rose-500">{error}</p>
118:            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
119:            error ? 'border-rose-400' : (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'),
120:            isExtracted && !isDark && 'ring-2 ring-blue-300 bg-blue-50/50',
121:            isExtracted && isDark && 'ring-2 ring-blue-500/50 bg-blue-900/20',
133:            hasValue ? 'top-1 text-[10px] text-blue-600' : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
142:          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
147:          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
152:          <p className="mt-1 text-xs text-rose-500">{error}</p>
230:      return <p className="text-xs text-rose-500">{errors.street_address.message as string}</p>
233:      return <p className="text-xs text-rose-500">{errors.cross_streets.message as string}</p>
237:        <p className="text-xs text-rose-500">
267:                  ? 'bg-blue-600 text-white'
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/MapPinSelector.tsx
--- Tailwind color classes ---
256:      className={`relative rounded-lg overflow-hidden border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} ${className}`}
260:          <div className="flex items-center gap-2 text-slate-500">
261:            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
276:            <span className="text-xs font-medium text-slate-600">Click to place pin</span>
283:          <div className="rounded-md bg-blue-50 border border-blue-100 px-2 py-1 shadow-sm">
284:            <span className="text-xs font-medium text-blue-700">Detecting location...</span>
291:          <div className="rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 shadow-sm">
292:            <span className="text-xs font-medium text-emerald-700">Location detected</span>
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/PathCard.tsx
--- Tailwind color classes ---
34:      'bg-slate-800 border-slate-700 hover:border-blue-400 hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
35:      disabled && 'cursor-not-allowed opacity-50 hover:border-slate-700 hover:bg-slate-800',
36:      recommended && !disabled && 'border-blue-500 bg-blue-900/20'
46:      <div className="text-blue-400">{icon}</div>
47:      <h4 className="text-lg font-semibold text-slate-100">{title}</h4>
50:    <p className="mb-4 min-h-[72px] text-sm text-slate-300">{description}</p>
53:      <span className="text-sm font-medium text-blue-400">
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/ProjectSummaryPreview.tsx
--- Tailwind color classes ---
13:const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-400'
14:const valueClass = 'text-sm text-slate-100'
61:    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6">
62:      <h3 className="mb-4 text-lg font-semibold text-slate-100">
--- Hardcoded hex colors ---

FILE: src/app/components/new-project/PropertyDataSection.tsx
--- Tailwind color classes ---
50:            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
51:            error ? 'border-rose-400' : (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-900'),
52:            isExtracted && !isDark && 'ring-2 ring-blue-300 bg-blue-50/50',
53:            isExtracted && isDark && 'ring-2 ring-blue-500/50 bg-blue-900/20',
63:                ? 'top-1 text-[10px] text-blue-600'
64:                : `top-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`
70:            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
76:              'absolute top-1/2 -translate-y-1/2 text-xs text-slate-400',
83:            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600">
89:          <p className="mt-1 text-xs text-rose-500">{error}</p>
145:              ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
146:              : 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
175:              ? 'border-slate-700 bg-slate-900 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
176:              : 'border-slate-300 bg-white text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
212:      <div className={`rounded-lg px-4 py-8 text-center ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-400'}`}>
--- Hardcoded hex colors ---

FILE: src/app/projects/[projectId]/components/landscaper/AgentSidebar.tsx
--- Tailwind color classes ---
83:      case 'complete': return 'bg-green-500';
84:      case 'partial': return 'bg-yellow-500';
85:      case 'blocked': return 'bg-red-500';
86:      default: return 'bg-gray-500';
--- Hardcoded hex colors ---

FILE: src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx
--- Tailwind color classes ---
42:    bgColor: 'bg-blue-50 hover:bg-blue-100',
49:    bgColor: 'bg-green-50 hover:bg-green-100',
56:    bgColor: 'bg-orange-50 hover:bg-orange-100',
63:    bgColor: 'bg-purple-50 hover:bg-purple-100',
70:    bgColor: 'bg-yellow-50 hover:bg-yellow-100',
77:    bgColor: 'bg-pink-50 hover:bg-pink-100',
152:                  <CIcon icon={tile.icon} size="lg" className="text-gray-700" />
153:                  <span className="font-medium text-sm text-gray-800">{tile.label}</span>
--- Hardcoded hex colors ---

FILE: src/app/projects/[projectId]/settings/page.tsx
--- Tailwind color classes ---
17:        <p className="text-gray-600">
--- Hardcoded hex colors ---

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx
--- Tailwind color classes ---
33:    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
35:        <span className="text-purple-400">✨</span>
39:        <span className="text-xs text-gray-400">AI-Powered Insights</span>
46:            <span className="text-gray-300">Your Total OpEx</span>
52:            <span className="text-gray-300">Phoenix Market Median</span>
53:            <span className="text-xl font-bold text-gray-400">
57:          <div className="pt-4 border-t border-gray-700">
59:              <span className={isWithinRange ? 'text-green-400' : 'text-orange-400'}>
62:              <span className="text-sm text-gray-300">
75:            <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
77:                <span className="text-green-400 mt-0.5">✓</span>
79:                  <div className="font-medium text-green-200">All categories within expected range</div>
80:                  <div className="text-xs text-gray-400 mt-1">
92:                    ? 'bg-orange-900/30 border border-orange-700/50'
94:                    ? 'bg-green-900/20 border border-green-700/50'
95:                    : 'bg-blue-900/20 border border-blue-700/50'
102:                        ? 'text-orange-400'
104:                        ? 'text-green-400'
105:                        : 'text-blue-400'
114:                          ? 'text-orange-200'
--- Hardcoded hex colors ---

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/CategoryPanel.tsx
--- Tailwind color classes ---
30:    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
33:        <p className="text-xs text-gray-400 mt-1">
55:        <div className="mt-4 pt-4 border-t border-gray-700">
58:            className="text-sm text-blue-400 hover:text-blue-300"
--- Hardcoded hex colors ---

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx
--- Tailwind color classes ---
40:      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
55:          <p className="text-sm text-gray-300 mb-4">
61:            <h4 className="text-sm font-medium text-gray-300 mb-2">Available in {currentMode} mode:</h4>
65:                className="flex items-start gap-3 p-3 bg-gray-900 rounded hover:bg-gray-850 cursor-pointer transition-colors"
71:                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
76:                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
81:                    <p className="text-xs text-gray-400 mt-1">{col.description}</p>
91:              <h4 className="text-sm font-medium text-gray-400 mb-2">
97:                  className="flex items-start gap-3 p-3 bg-gray-900/50 rounded opacity-50"
102:                    className="mt-1 w-4 h-4 text-gray-600 bg-gray-800 border-gray-700 rounded cursor-not-allowed"
106:                      <span className="text-gray-400 font-medium">{col.label}</span>
107:                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
110:                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
115:                      <p className="text-xs text-gray-500 mt-1">{col.description}</p>
124:        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
--- Hardcoded hex colors ---

FILE: src/app/settings/profile/page.tsx
--- Tailwind color classes ---
138:            ? 'bg-green-900/50 border border-green-500 text-green-200'
139:            : 'bg-red-900/50 border border-red-500 text-red-200'
152:              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white
164:              <label className="block text-sm font-medium text-gray-400 mb-2">
174:                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
183:              <label className="block text-sm font-medium text-gray-400 mb-2">
193:                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
202:              <label className="block text-sm font-medium text-gray-400 mb-2">
212:                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
221:              <label className="block text-sm font-medium text-gray-400 mb-2">
224:              <p className="text-gray-500 py-2">{user.username}</p>
229:              <label className="block text-sm font-medium text-gray-400 mb-2">
239:                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
248:              <label className="block text-sm font-medium text-gray-400 mb-2">
258:                             text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
271:                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800
303:            <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
307:            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
310:                ? 'bg-green-900/50 text-green-300'
311:                : 'bg-red-900/50 text-red-300'
--- Hardcoded hex colors ---

FILE: src/components/IssueReporter/IssueReporterButton.tsx
--- Tailwind color classes ---
52:        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
55:        <span className="hidden rounded bg-indigo-500/40 px-2 py-0.5 text-xs font-medium uppercase tracking-wide sm:inline">
--- Hardcoded hex colors ---

FILE: src/components/IssueReporter/IssueReporterDialog.tsx
--- Tailwind color classes ---
258:          className="fixed inset-0 z-[190] bg-slate-900/50 backdrop-blur-sm data-[state=open]:animate-fade-in"
262:          className="fixed inset-x-4 bottom-12 z-[200] mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl transition data-[state=open]:animate-slide-up sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
264:          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
265:            <Dialog.Title className="text-lg font-semibold text-slate-900">Report an Issue / Idea</Dialog.Title>
266:            <Dialog.Close className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
273:              <label htmlFor="issue-description" className="text-sm font-medium text-slate-700">
274:                Description <span className="text-red-500">*</span>
283:                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
288:              <label htmlFor="issue-component" className="text-sm font-medium text-slate-700">
289:                Component reference <span className="text-slate-400 font-normal">(optional)</span>
297:                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
302:              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
308:              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
314:              <p className="text-xs text-slate-400">
315:                Page: <span className="font-medium text-slate-500">{pathname}</span>
320:                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
328:                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
--- Hardcoded hex colors ---

FILE: src/components/admin/UserManagementPanel.tsx
--- Tailwind color classes ---
179:        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
189:          <Users className="w-6 h-6 text-blue-400" />
214:            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
223:        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
284:                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
295:                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-900/50 text-purple-300">
321:                            ? 'bg-green-900/50 text-green-300 hover:bg-green-900'
322:                            : 'bg-red-900/50 text-red-300 hover:bg-red-900'
352:                          className="p-1.5 rounded-lg transition text-yellow-500 hover:text-yellow-400"
360:                          className="p-1.5 rounded-lg transition text-red-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
504:  const inputClass = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
508:      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
511:          <DialogDescription className="text-gray-400">
517:          <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{error}</div>
523:              <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
527:              <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
533:            <label className="block text-sm font-medium text-gray-300 mb-1">Username <span className="text-red-400">*</span></label>
538:            <label className="block text-sm font-medium text-gray-300 mb-1">Email <span className="text-red-400">*</span></label>
544:              <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
548:              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
--- Hardcoded hex colors ---

FILE: src/components/analysis/cashflow/CashFlowAnalysisTab.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/analysis/validation/ValidationReport.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/auth/ProtectedRoute.tsx
--- Tailwind color classes ---
50:          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
51:          <p className="text-gray-400 text-sm">Loading...</p>
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/AISuggestionsSection.tsx
--- Tailwind color classes ---
64:        <AlertCircle size={16} className="text-blue-400" />
83:          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-surface-card disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
148:    ? 'bg-green-900 text-green-200'
150:    ? 'bg-blue-900 text-blue-200'
151:    : 'bg-yellow-900 text-yellow-200';
182:          className="text-xs text-blue-400 hover:text-blue-300"
196:                  ? 'text-yellow-400'
229:          className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-surface-card rounded text-xs transition-colors"
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/AddBenchmarkModal.tsx
--- Tailwind color classes ---
276:              <div className="w-[40%] ml-0 pl-4 border-l-2 border-blue-500">
287:              <div className="w-[40%] ml-0 pl-4 border-l-2 border-blue-500">
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/BenchmarkAccordion.tsx
--- Tailwind color classes ---
255:        <div className="bg-slate-850 px-4 py-2">
284:            <div className="mt-2 w-full px-3 py-3 rounded  border border-blue-500" style={{ backgroundColor: 'var(--cui-card-bg)' }}>
386:                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
440:                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
528:                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
560:                      className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
578:              className="mt-2 w-full px-3 py-2 border  rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--cui-border-color)' }}
951:                    className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800/80 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
975:                    className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
1078:                className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
1111:                className="px-3 py-1 text-xs  hover:bg-gray-50 dark:hover:bg-gray-800 rounded" style={{ backgroundColor: 'var(--cui-card-bg)' }}
1229:      className="w-full px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
1272:            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
1306:            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/GrowthRateCategoryPanel.tsx
--- Tailwind color classes ---
656:          <div className="text-xs text-amber-200 bg-amber-900/40 border border-amber-500 px-3 py-2 rounded">
848:            ? 'bg-brand-accent/20 text-emerald-200 border-emerald-400'
849:            : 'bg-purple-500/20 text-purple-200 border-purple-400'
851:          ? 'bg-surface-card text-emerald-200/70 border-emerald-500/40 hover:bg-brand-accent/10'
852:          : 'bg-surface-card text-purple-200/70 border-purple-500/40 hover:bg-purple-500/10'
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/GrowthRateStepEditor.tsx
--- Tailwind color classes ---
336:                          className="text-chip-error hover:text-red-300 disabled:text-text-secondary disabled:cursor-not-allowed"
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/products/ProductLibraryPanel.tsx
--- Tailwind color classes ---
288:                    className="h-4 w-4 rounded border focus:ring-emerald-400"
358:                              ? 'bg-brand-accent/20 text-emerald-300'
369:                            className="rounded border border-line-strong px-3 py-1 text-xs font-medium text-text-inverse hover:bg-surface-card focus:outline-none focus:ring-1 focus:ring-emerald-400"
375:                            className="rounded border border-red-500 px-3 py-1 text-xs font-medium text-red-300 hover:bg-chip-error/10 focus:outline-none focus:ring-1 focus:ring-red-400"
397:              <div className="mb-3 rounded border border-red-500 bg-red-900/40 px-3 py-2 text-xs text-red-200">
415:                  className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
430:                  className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
445:                  className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
544:                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
557:                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
575:                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
587:                className="rounded border border-line-strong bg-surface-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
598:                className="h-4 w-4 rounded border-line-strong bg-surface-card text-emerald-500 focus:ring-emerald-400"
612:              className="rounded border border-line-strong px-4 py-2 text-sm text-text-inverse hover:bg-surface-card focus:outline-none focus:ring-1 focus:ring-slate-500"
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx
--- Tailwind color classes ---
120:            ${error ? 'border-red-500' : 'border-blue-500'}
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/unit-costs/InlineEditableCell.tsx
--- Tailwind color classes ---
152:            ${error ? 'border-red-500' : 'border-blue-500'}
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx
--- Tailwind color classes ---
134:            ${error ? 'border-red-500' : 'border-blue-500'}
--- Hardcoded hex colors ---

FILE: src/components/benchmarks/unit-costs/UnitCostsPanel.tsx
--- Tailwind color classes ---
1239:                className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-chip-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
1508:                className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-300 text-chip-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
1573:              className="inline-flex items-center gap-2 rounded border border-blue-500 bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
1603:                  <tr className="hover:bg-blue-50/50">
1613:                        <div className="rounded border border-red-500/50 bg-red-50 px-3 py-2 text-xs text-red-700">
1683:        'h-4 w-4 rounded border border-slate-400 bg-surface-card text-blue-600 focus:ring-brand-primary/40',
1802:            error ? 'border-red-500 focus:ring-red-300' : 'border-blue-500 focus:ring-brand-primary/40'
1826:          {isSaving && <span className="text-xs text-green-600">Saving…</span>}
1933:            error ? 'border-red-500 focus:ring-red-300' : 'border-blue-500 focus:ring-brand-primary/40'
1951:          {isSaving && <span className="text-xs text-green-600">Saving…</span>}
--- Hardcoded hex colors ---

FILE: src/components/budget/BasicBudgetTable.tsx
--- Tailwind color classes ---
121:        <p className="text-sm text-gray-500">
--- Hardcoded hex colors ---

FILE: src/components/budget/BudgetItemModalV2.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/CategoryTreeManager.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/CustomColumns.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/FiltersAccordion.tsx
--- Tailwind color classes ---
121:                <div className="mt-2 pt-2 border-top border-gray-300 text-xs text-primary text-center fw-semibold">
130:                  <div className="h-32 bg-gray-200 rounded border-2"></div>
198:                  <div className="h-32 bg-gray-200 rounded border-2"></div>
--- Hardcoded hex colors ---

FILE: src/components/budget/GanttChart.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/IncompleteCategoriesReminder.tsx
--- Tailwind color classes ---
115:    <Alert className={`border-amber-500 bg-amber-50 dark:bg-amber-950 ${className}`}>
116:      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
122:            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
168:              className="h-6 px-2 text-xs bg-amber-600 hover:bg-amber-700"
202:    <div className="flex items-start justify-between p-3 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-800">
222:          <p className="text-amber-600 dark:text-amber-400">
--- Hardcoded hex colors ---

FILE: src/components/budget/ModeSelector.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/TimelineChartPeriods.tsx
--- Tailwind color classes ---
66:    <div className="timeline-chart-periods bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
--- Hardcoded hex colors ---

FILE: src/components/budget/custom/ColoredDotIndicator.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/custom/ColumnChooser.tsx
--- Tailwind color classes ---
37:        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl"
42:          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
56:        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
64:              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
71:                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700"
77:                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-not-allowed"
81:                        <span className="text-gray-700 dark:text-gray-300 font-medium">
84:                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
89:                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
103:              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
110:                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-850 cursor-pointer transition-colors"
116:                      className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
120:                        <span className="text-gray-900 dark:text-white font-medium">
125:                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
138:        <div className="flex justify-between items-center gap-2 pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
--- Hardcoded hex colors ---

FILE: src/components/budget/custom/GroupRow.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/budget/custom/TimelineChart.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/capitalization/DeveloperFeeModal.tsx
--- Tailwind color classes ---
115:      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
117:        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
118:          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
133:            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded text-sm">
140:            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
146:              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
158:            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
166:              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
172:            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
178:              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
191:              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
205:                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
207:              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
212:              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
226:                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
233:            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
241:              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
248:              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
261:                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
263:              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
--- Hardcoded hex colors ---

FILE: src/components/capitalization/NapkinWaterfallForm.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/capitalization/OverheadItemModal.tsx
--- Tailwind color classes ---
243:  const inputBase = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
244:  const labelBase = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
245:  const labelCentered = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center leading-tight";
249:      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
251:        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
252:          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
267:            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded text-sm">
383:                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
385:                <label htmlFor="throughEndOfAnalysis" className="text-sm text-gray-600 dark:text-gray-400">
418:          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
420:              <span className="text-sm text-gray-600 dark:text-gray-400">Calculated Total:</span>
421:              <span className="font-semibold text-gray-900 dark:text-gray-100">
426:              <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
--- Hardcoded hex colors ---

FILE: src/components/capitalization/WaterfallResults.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/dashboard/CompletenessBar.tsx
--- Tailwind color classes ---
44:      return 'bg-red-100';
46:      return 'bg-yellow-100';
48:      return 'bg-green-100';
88:            pct < 30 ? 'text-red-600' : pct < 70 ? 'text-yellow-600' : 'text-green-600'
--- Hardcoded hex colors ---

FILE: src/components/dashboard/CompletenessModal.tsx
--- Tailwind color classes ---
37:          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
43:          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
49:          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
120:                  ? 'text-red-600'
122:                  ? 'text-yellow-600'
123:                  : 'text-green-600'
--- Hardcoded hex colors ---

FILE: src/components/dashboard/ProjectTable.tsx
--- Tailwind color classes ---
29:  LAND: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Land' },
30:  MPC: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'MPC' },
31:  MF: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Multifam' },
32:  MULTIFAMILY: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Multifam' },
33:  RET: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Retail' },
34:  RETAIL: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Retail' },
35:  COMMERCIAL: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Commercial' },
36:  OFF: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Office' },
37:  OFFICE: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Office' },
38:  IND: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Industrial' },
39:  INDUSTRIAL: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Industrial' },
40:  MXU: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Mixed Use' },
41:  MIXED_USE: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Mixed Use' },
42:  HTL: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Hotel' },
45:const DEFAULT_TYPE = { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Other' };
--- Hardcoded hex colors ---

FILE: src/components/dms/DMSView.tsx
--- Tailwind color classes ---
506:                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
509:                <p className="text-gray-600 dark:text-gray-400">
517:                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
528:                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
529:                      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
542:                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 h-fit sticky top-6 bg-white dark:bg-gray-900">
543:                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
549:                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
550:                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
553:                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
570:                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
572:                        className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
--- Hardcoded hex colors ---

FILE: src/components/dms/ProcessingStatus.tsx
--- Tailwind color classes ---
74:        <span className="w-2 h-2 rounded-full bg-green-500"></span>
85:          <div className="flex items-center gap-1.5 text-blue-400">
86:            <div className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full"></div>
91:          <div className="flex items-center gap-1 text-red-400">
92:            <span className="w-2 h-2 rounded-full bg-red-500"></span>
111:          <div className="text-2xl font-semibold text-green-400">{summary.ready}</div>
115:          <div className="text-2xl font-semibold text-blue-400">
121:          <div className="text-2xl font-semibold text-red-400">{summary.failed}</div>
128:        <div className="flex items-center gap-2 text-blue-400 mb-3 text-sm">
129:          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
149:          className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
161:    ready: { color: 'text-green-400', icon: '✓', bg: 'bg-green-500/10' },
162:    extracting: { color: 'text-blue-400', icon: '⟳', bg: 'bg-blue-500/10' },
163:    chunking: { color: 'text-blue-400', icon: '⟳', bg: 'bg-blue-500/10' },
164:    embedding: { color: 'text-blue-400', icon: '⟳', bg: 'bg-blue-500/10' },
165:    queued: { color: 'text-yellow-400', icon: '◷', bg: 'bg-yellow-500/10' },
167:    failed: { color: 'text-red-400', icon: '✗', bg: 'bg-red-500/10' },
--- Hardcoded hex colors ---

FILE: src/components/dms/admin/AttrBuilder.tsx
--- Tailwind color classes ---
168:    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
170:      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
172:          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
175:          <p className="text-sm text-gray-500 dark:text-gray-400">
211:          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
219:                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
225:                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
236:                  <p className="mt-1 text-xs text-red-600">{errors.attr_name.message}</p>
241:                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
247:                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
251:                  <p className="mt-1 text-xs text-red-600">{errors.attr_key.message}</p>
258:              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
263:                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
275:              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
281:                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
289:                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
304:                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
320:                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
326:                          className="ml-1 hover:text-blue-600"
343:                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
--- Hardcoded hex colors ---

FILE: src/components/dms/admin/TemplateDesigner.tsx
--- Tailwind color classes ---
162:      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
163:        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
168:          <p className="text-gray-500 dark:text-gray-400 text-sm">
175:                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
177:                  {config.is_required && <span className="text-red-500 ml-1">*</span>}
180:                  <p className="text-xs text-gray-500 dark:text-gray-400">
190:                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
198:                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
206:                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
214:                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
216:                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
224:                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
241:    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
243:      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
245:          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
248:          <p className="text-sm text-gray-500 dark:text-gray-400">
299:            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
305:                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
311:                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
315:                  <p className="mt-1 text-xs text-red-600">{errors.template_name.message}</p>
--- Hardcoded hex colors ---

FILE: src/components/dms/filters/DocTypeFilters.tsx
--- Tailwind color classes ---
165:      <div className={`text-sm text-gray-500 dark:text-gray-400 p-4 ${className}`}>
173:      <div className={`text-sm text-gray-500 dark:text-gray-400 p-4 ${className}`}>
187:          <div key={item.doc_type} className="border-b border-gray-200 dark:border-gray-800">
194:                isActive ? 'bg-[#EBF5FF] text-[#1E40AF]' : 'text-gray-800 dark:text-gray-100'
198:                <span className="text-gray-500 dark:text-gray-400">
203:              <span className="text-xs text-gray-500 dark:text-gray-400">{item.count ?? 0}</span>
215:                        sfActive ? 'bg-[#EBF5FF] text-[#1E40AF]' : 'text-gray-700 dark:text-gray-200'
219:                        <span className="text-gray-400">•</span>
222:                      <span className="text-gray-500 dark:text-gray-400">{sf.count ?? 0}</span>
--- Hardcoded hex colors ---

FILE: src/components/dms/filters/ProjectSelector.tsx
--- Tailwind color classes ---
67:        <SelectTrigger className="bg-white dark:bg-gray-900">
70:        <SelectContent className="bg-white dark:bg-gray-900">
--- Hardcoded hex colors ---

FILE: src/components/dms/filters/SmartFilterBuilder.tsx
--- Tailwind color classes ---
137:        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
140:        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
147:        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
148:          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
154:        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
164:          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
165:                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
166:                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
172:      <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
173:        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
179:          <label htmlFor="q" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
187:            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
188:                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
189:                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
196:          <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
204:            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
205:                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
206:                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
213:          <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
221:            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
--- Hardcoded hex colors ---

FILE: src/components/dms/folders/FolderEditor.tsx
--- Tailwind color classes ---
79:              Folder Name <span className="text-red-500">*</span>
--- Hardcoded hex colors ---

FILE: src/components/dms/folders/FolderTree.tsx
--- Tailwind color classes ---
71:            isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
--- Hardcoded hex colors ---

FILE: src/components/dms/list/ColumnChooser.tsx
--- Tailwind color classes ---
88:        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
93:        <span className="text-gray-400 dark:text-gray-500">({visibleCount}/{totalCount})</span>
97:        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
98:          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
104:              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
113:                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
115:              <span className="text-gray-700 dark:text-gray-200">{col.label}</span>
117:                <span className="text-xs text-gray-400 dark:text-gray-500">(required)</span>
--- Hardcoded hex colors ---

FILE: src/components/dms/list/DocumentTable.tsx
--- Tailwind color classes ---
52:        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
53:        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading documents...</span>
60:      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
69:      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
70:        <tr className="border-b border-gray-200 dark:border-gray-700">
74:              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
82:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Name</th>
85:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Project</th>
88:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
91:            <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">Version</th>
94:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Document Date</th>
97:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Parties</th>
100:            <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
103:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Tags</th>
106:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Description</th>
109:            <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Modified</th>
111:          <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
131:                border-b border-gray-100 dark:border-gray-800
132:                hover:bg-gray-50 dark:hover:bg-gray-800
135:                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
--- Hardcoded hex colors ---

FILE: src/components/dms/list/PlatformKnowledgeAccordion.tsx
--- Tailwind color classes ---
75:        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-b border-gray-200 dark:border-gray-700">
79:            <div className="w-[180px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2">
80:              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
89:                  className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
91:                  <CIcon icon={cilLightbulb} className="w-4 h-4 text-amber-500" />
99:                  className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
101:                  <CIcon icon={cilList} className="w-4 h-4 text-emerald-500" />
110:                className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
112:                <CIcon icon={cilBook} className="w-4 h-4 text-blue-500" />
120:                className="flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
122:                <CIcon icon={cilCog} className="w-4 h-4 text-purple-500" />
126:              <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
127:                <div className="text-xs text-gray-400 dark:text-gray-500">
130:                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate" title={documentTitle}>
141:                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
155:                            ? 'bg-blue-600 text-white'
156:                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
162:                            msg.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
175:                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
176:                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
--- Hardcoded hex colors ---

FILE: src/components/dms/list/PlatformKnowledgeTable.tsx
--- Tailwind color classes ---
133:        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
134:        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading knowledge docs...</span>
141:      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
151:      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
152:        <div className="text-sm text-gray-500 dark:text-gray-400">
165:          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
166:            <tr className="border-b border-gray-200 dark:border-gray-700">
168:                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Title</th>
171:                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Domain</th>
174:                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Source</th>
177:                <th className="px-3 py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">Year</th>
180:                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Scope</th>
183:                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
186:                <th className="px-3 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Updated</th>
189:                <th className="px-3 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
202:                    className={`border-b border-gray-100 dark:border-gray-800 ${
206:                        ? 'bg-blue-50 dark:bg-blue-900/30'
208:                        ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
216:                            <span className="text-gray-400 dark:text-gray-500">
224:                            <div className="font-medium text-gray-900 dark:text-gray-100">{doc.title}</div>
--- Hardcoded hex colors ---

FILE: src/components/dms/modals/PlatformKnowledgeModal.tsx
--- Tailwind color classes ---
88:        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-200">
89:          <div className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Landscaper Analysis</div>
93:        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
94:          <div className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Suggested Cataloging</div>
98:              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Knowledge Domain</label>
100:                className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
113:              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Property Types</label>
116:                  <label key={option} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
140:                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Source</label>
142:                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
154:                <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Year</label>
157:                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
171:              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Geographic Scope</label>
173:                className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
186:              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Supersedes (optional)</label>
189:                className="mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
197:        <div className="text-xs text-gray-500 dark:text-gray-400">
205:          className="px-4 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700"
213:          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60"
--- Hardcoded hex colors ---

FILE: src/components/dms/panels/DmsLandscaperPanel.tsx
--- Tailwind color classes ---
483:      className="relative rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3"
502:          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
508:      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
510:          <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Landscaper</div>
511:          <div className="text-xs text-gray-500 dark:text-gray-400">Context: {contextLabel}</div>
514:          <div className="text-xs text-blue-600 dark:text-blue-300">Filtering…</div>
519:        <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
530:                ? 'bg-blue-600 text-white ml-4'
531:                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
552:          className="h-9 flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs text-gray-900 dark:text-gray-100"
558:          className="h-9 w-9 rounded-md bg-blue-600 text-white text-xs disabled:opacity-60"
564:      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
569:          className="text-blue-600 dark:text-blue-300"
--- Hardcoded hex colors ---

FILE: src/components/dms/preview/DocumentPreview.tsx
--- Tailwind color classes ---
158:        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
159:          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
160:            <span className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</span>
163:              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
169:          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
177:      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
178:        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
179:          <span className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</span>
182:            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
205:    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
206:      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
208:          <span className="text-red-600 dark:text-red-400 text-lg">📄</span>
209:          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
212:          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
219:              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
228:            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
237:        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
238:          <div className="aspect-[8.5/11] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
239:            <span className="text-gray-400 dark:text-gray-600 text-6xl">📄</span>
246:              <tr className="border-b border-gray-100 dark:border-gray-800">
--- Hardcoded hex colors ---

FILE: src/components/dms/preview/PlatformKnowledgePreview.tsx
--- Tailwind color classes ---
71:      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
72:        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
73:          <span className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</span>
76:            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
95:    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
96:      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
98:          <CIcon icon={cilBook} className="text-blue-600 dark:text-blue-400 w-5 h-5 flex-shrink-0" />
99:          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
106:                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
108:                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
109:                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
119:              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
128:            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
138:        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
140:            <CIcon icon={cilBook} className="text-blue-400 dark:text-blue-500 w-24 h-24 opacity-50" />
147:            <tr className="border-b border-gray-100 dark:border-gray-800">
148:              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
151:              <td className="py-2 text-gray-900 dark:text-gray-100">{document.title}</td>
154:            <tr className="border-b border-gray-100 dark:border-gray-800">
155:              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
--- Hardcoded hex colors ---

FILE: src/components/dms/profile/DocCard.tsx
--- Tailwind color classes ---
48:      case 'draft': return 'bg-gray-100 text-gray-800';
49:      case 'processing': return 'bg-blue-100 text-blue-800';
50:      case 'indexed': return 'bg-green-100 text-green-800';
51:      case 'failed': return 'bg-red-100 text-red-800';
52:      case 'archived': return 'bg-yellow-100 text-yellow-800';
53:      default: return 'bg-gray-100 text-gray-800';
75:      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
82:              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
85:              <p className="text-xs text-gray-500 dark:text-gray-400">
95:                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
102:                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
115:    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
117:      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
119:          <DocumentIcon className="w-6 h-6 text-gray-400" />
121:            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
124:            <p className="text-sm text-gray-500 dark:text-gray-400">
139:                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
146:                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
154:                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
172:              className="max-w-full h-48 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
--- Hardcoded hex colors ---

FILE: src/components/dms/profile/PlatformKnowledgeProfileForm.tsx
--- Tailwind color classes ---
125:    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
127:      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
129:          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
132:          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
152:              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
154:              Title <span className="text-red-500">*</span>
161:                errors.title ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
162:              } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
166:              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
174:              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
182:              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
185:            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
194:              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
204:              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
207:            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
216:              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
223:              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
232:            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
239:            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
250:                      ? 'bg-blue-600 text-white border-blue-600'
--- Hardcoded hex colors ---

FILE: src/components/dms/profile/ProfileForm.tsx
--- Tailwind color classes ---
135:    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
137:      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
139:          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
142:          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
160:            <label htmlFor="doc_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
161:              Document Type <span className="text-red-500">*</span>
164:              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
165:                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
173:                  errors.doc_type ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
174:                } px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white`}
185:              <p className="mt-1 text-xs text-red-600">{errors.doc_type.message}</p>
191:            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
198:              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
205:            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
219:            <label htmlFor="doc_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
226:              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
228:            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
235:            <label htmlFor="parties" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
242:              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
245:            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
--- Hardcoded hex colors ---

FILE: src/components/dms/profile/TagInput.tsx
--- Tailwind color classes ---
197:            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
204:                className="hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
229:          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
235:            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
243:            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
251:                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
253:                    ? 'bg-blue-50 dark:bg-blue-900/20'
257:                <span className="text-gray-900 dark:text-gray-100">
260:                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
270:      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
--- Hardcoded hex colors ---

FILE: src/components/dms/profile/VersionTimeline.tsx
--- Tailwind color classes ---
116:        return 'bg-green-500 text-white';
118:        return 'bg-blue-500 text-white';
120:        return 'bg-orange-500 text-white';
122:        return 'bg-gray-500 text-white';
128:      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
129:        <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
136:    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
138:      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
139:        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
142:        <p className="text-sm text-gray-500 dark:text-gray-400">
159:                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600"
167:                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${getEventColor(event)}`}>
176:                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
180:                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
186:                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
193:                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Changed fields:</p>
198:                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
213:                                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
221:                                  className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
231:                        <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
--- Hardcoded hex colors ---

FILE: src/components/dms/search/Facets.tsx
--- Tailwind color classes ---
69:        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group"
76:            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded mr-2 flex-shrink-0"
78:          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0" title={value}>
82:        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0 font-medium">
91:      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
92:        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
103:        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
109:            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
118:        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
119:          <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
127:                  className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
132:                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
155:              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
158:              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
162:                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
165:                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
172:                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
193:                    className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-2 text-center font-medium"
--- Hardcoded hex colors ---

FILE: src/components/dms/search/HighlightedText.tsx
--- Tailwind color classes ---
23:  highlightClassName = 'bg-yellow-200 dark:bg-yellow-900 font-semibold',
--- Hardcoded hex colors ---

FILE: src/components/dms/search/ResultsTable.tsx
--- Tailwind color classes ---
146:      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
147:      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
148:      case 'review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
149:      case 'approved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
150:      case 'superseded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
151:      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
152:      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
157:    if (!priority) return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
160:      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
161:      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
162:      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
163:      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
173:      '<span class="bg-yellow-200 dark:bg-yellow-900 font-medium">$1</span>'
179:      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
181:          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
182:          <span className="ml-3 text-gray-600 dark:text-gray-400">Searching documents...</span>
190:      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
191:        <div className="text-gray-500 dark:text-gray-400">
200:      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
201:        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
--- Hardcoded hex colors ---

FILE: src/components/dms/search/SearchBox.tsx
--- Tailwind color classes ---
51:          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
60:          className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
69:              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
79:        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
--- Hardcoded hex colors ---

FILE: src/components/dms/shared/DMSLayout.tsx
--- Tailwind color classes ---
25:            className={`w-[250px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto ${sidebarClassName}`}
30:        <main className="flex-1 min-w-0 overflow-hidden bg-white dark:bg-gray-900">
34:          <aside className="w-full max-w-[350px] h-full border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
--- Hardcoded hex colors ---

FILE: src/components/dms/upload/Dropzone.tsx
--- Tailwind color classes ---
262:    ? 'border-green-400 bg-green-50 dark:bg-green-900/20' 
264:    ? 'border-red-400 bg-red-50 dark:bg-red-900/20' 
266:    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
267:    : 'border-gray-300 dark:border-gray-600';
279:          ${activeUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}
286:            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
288:              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
291:              <p className="text-sm text-gray-600 dark:text-gray-400">
300:                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
304:                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
306:                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
318:            <div className="mx-auto h-12 w-12 text-gray-400">
332:                  <p className="text-lg font-medium text-green-600 dark:text-green-400">
335:                  <p className="text-sm text-gray-600 dark:text-gray-400">
341:                  <p className="text-lg font-medium text-red-600 dark:text-red-400">
344:                  <p className="text-sm text-gray-600 dark:text-gray-400">
351:                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
354:                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
357:                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
376:      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
--- Hardcoded hex colors ---

FILE: src/components/dms/upload/Queue.tsx
--- Tailwind color classes ---
34:          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
35:            <div className="w-3 h-3 rounded-full bg-gray-500" />
42:            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
47:          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
55:          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
76:      case 'pending': return 'text-gray-600 dark:text-gray-400';
77:      case 'uploading': return 'text-blue-600 dark:text-blue-400';
78:      case 'processing': return 'text-yellow-600 dark:text-yellow-400';
79:      case 'completed': return 'text-green-600 dark:text-green-400';
80:      case 'failed': return 'text-red-600 dark:text-red-400';
86:      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
95:        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
101:            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
112:            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
123:                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
131:                      <span className="text-xs text-gray-500 dark:text-gray-400">
138:                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
145:                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
151:                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
154:                          item.status === 'uploading' ? 'bg-blue-600' : 'bg-yellow-500'
--- Hardcoded hex colors ---

FILE: src/components/dms/views/DocumentPreviewPanel.tsx
--- Tailwind color classes ---
151:      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
175:    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
177:      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
179:          <span className="text-red-600 dark:text-red-400 text-lg flex-shrink-0">📄</span>
180:          <span className="font-medium truncate text-gray-900 dark:text-gray-100">
183:          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded flex-shrink-0">
189:            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-1"
197:            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
208:        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
210:            <div className="aspect-[8.5/11] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
218:                  target.parentElement!.innerHTML = '<span class="text-gray-400 dark:text-gray-600 text-6xl">📄</span>';
223:            <div className="aspect-[8.5/11] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
224:              <span className="text-gray-400 dark:text-gray-600 text-6xl">📄</span>
233:            <tr className="border-b border-gray-100 dark:border-gray-800">
234:              <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Type</td>
235:              <td className="py-2 text-gray-900 dark:text-gray-100">{doc.doc_type || 'Not specified'}</td>
239:              <tr className="border-b border-gray-100 dark:border-gray-800">
240:                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Status</td>
241:                <td className="py-2 text-gray-900 dark:text-gray-100 capitalize">{doc.status}</td>
245:            <tr className="border-b border-gray-100 dark:border-gray-800">
--- Hardcoded hex colors ---

FILE: src/components/dms/views/FilterDetailView.tsx
--- Tailwind color classes ---
193:    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
195:      <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
199:            className="text-blue-600 dark:text-blue-400 hover:underline"
203:          <span className="text-gray-400">{'>'}</span>
206:            className="text-blue-600 dark:text-blue-400 hover:underline"
210:          <span className="text-gray-400">{'>'}</span>
211:          <span className="text-gray-900 dark:text-gray-100">{docType}</span>
216:      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
218:          <button className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">
221:          <CIcon icon={cilFilterSquare} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
222:          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{docType}</h1>
224:            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
229:              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
239:      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
241:          <button className="text-blue-600 dark:text-blue-400">🔻</button>
242:          <span className="text-sm text-gray-600 dark:text-gray-400">
250:                  ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
251:                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
264:                  ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
265:                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
--- Hardcoded hex colors ---

FILE: src/components/extraction/StagingModal.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/icons/LandscaperIcon.tsx
--- Tailwind color classes ---
12: * <LandscaperIcon className="w-6 h-6 text-green-500" />
--- Hardcoded hex colors ---

FILE: src/components/ingestion/DocumentIngestion.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/landscaper/ActivityFeed.tsx
--- Tailwind color classes ---
118:            <span className="px-2 py-0.5 text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 rounded-full">
140:            <div className="text-xs text-red-500 p-2">
--- Hardcoded hex colors ---

FILE: src/components/landscaper/ActivityFeedItem.tsx
--- Tailwind color classes ---
26:  complete: { icon: '✓', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
27:  partial: { icon: '⚠', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
28:  blocked: { icon: '✗', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
29:  pending: { icon: '◐', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
30:  'not-started': { icon: '○', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
34:  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
35:  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
36:  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
47:        hover:border-blue-300 dark:hover:border-blue-600
83:        <div className="mt-2 text-xs text-red-500">
--- Hardcoded hex colors ---

FILE: src/components/landscaper/ChatMessageBubble.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/landscaper/LandscaperChat.tsx
--- Tailwind color classes ---
223:            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
--- Hardcoded hex colors ---

FILE: src/components/landscaper/MutationProposalCard.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/map/MapOblique.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/map/ProjectTabMap.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/map/PropertyTabMapWithComps.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/map/ValuationSalesCompMap.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/market/CompetitiveProjectsPanel.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/CommercialPanel.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/CompDetailsSection.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/LandscaperPanel.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/MdrPanel.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/NapkinAnalysisPage.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/NapkinAttachedPricing.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/NapkinCompsMap.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/NapkinSfdPricing.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/RlvSummaryCard.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/napkin/SfdPricingPanel.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/operations/DraggableOpexSection.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/operations/InventoryStatsPanel.tsx
--- Tailwind color classes ---
50:      <div className="rounded border border-red-500 bg-red-900/40 p-3 text-sm text-red-100">
58:      <div className="flex items-center justify-center rounded border border-gray-800 bg-gray-900/40 p-3 text-sm text-gray-300">
65:    <div className="rounded border border-gray-800 bg-gray-900/40 p-4 text-gray-100">
66:      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Unsold Inventory</h3>
70:          <div className="text-xs text-gray-400">of {stats.total_parcels} parcels</div>
74:          <div className="text-xs text-gray-400">of {stats.total_acres.toFixed(1)} acres</div>
78:          <div className="text-xs text-gray-400">unsold</div>
81:      <div className="mt-2 text-xs text-gray-500">
--- Hardcoded hex colors ---

FILE: src/components/operations/OpExModeSelector.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/operations/RentalIncomeSection.tsx
--- Tailwind color classes ---
102:      <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
--- Hardcoded hex colors ---

FILE: src/components/operations/VacancyDeductionsSection.tsx
--- Tailwind color classes ---
130:                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 ml-1">
--- Hardcoded hex colors ---

FILE: src/components/operations/ValueAddCard.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/phases/PhaseTransition.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/project/ProjectLandUseLabels.tsx
--- Tailwind color classes ---
98:        <p className="text-gray-500">Loading...</p>
107:        <p className="text-sm text-gray-600">
117:            <label className="block text-sm font-medium text-gray-700 mb-1">
122:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
127:            <p className="text-xs text-gray-500 mt-1">Top-level classification (e.g., Residential, Commercial)</p>
130:            <label className="block text-sm font-medium text-gray-700 mb-1">
135:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
146:            <label className="block text-sm font-medium text-gray-700 mb-1">
151:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
156:            <p className="text-xs text-gray-500 mt-1">Second-level classification (e.g., Single Family, Townhome)</p>
159:            <label className="block text-sm font-medium text-gray-700 mb-1">
164:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
175:            <label className="block text-sm font-medium text-gray-700 mb-1">
180:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
185:            <p className="text-xs text-gray-500 mt-1">Product-level classification (e.g., 50x100 Standard Lot)</p>
188:            <label className="block text-sm font-medium text-gray-700 mb-1">
193:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
203:      <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
204:        <h4 className="font-medium text-blue-900 mb-2">Common Configurations:</h4>
205:        <ul className="text-sm text-blue-800 space-y-1">
--- Hardcoded hex colors ---

FILE: src/components/projects/LifecycleTileNav.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/projects/contacts/AddContactModal.tsx
--- Tailwind color classes ---
96:        <div className="flex items-center justify-between p-6 border-b border-gray-200">
97:          <h2 className="text-xl font-semibold text-gray-900">Add Contact</h2>
110:            <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
117:            <label className="block text-sm font-medium text-gray-700 mb-1">
125:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
137:            <label className="block text-sm font-medium text-gray-700 mb-1">
146:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
152:            <label className="block text-sm font-medium text-gray-700 mb-1">
160:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
166:            <label className="block text-sm font-medium text-gray-700 mb-1">
174:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
180:            <label className="block text-sm font-medium text-gray-700 mb-1">
188:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
195:              <label className="block text-sm font-medium text-gray-700 mb-1">
205:                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
209:              <label className="block text-sm font-medium text-gray-700 mb-1">
219:                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
226:            <label className="block text-sm font-medium text-gray-700 mb-1">
234:              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
--- Hardcoded hex colors ---

FILE: src/components/projects/contacts/ContactCard.tsx
--- Tailwind color classes ---
71:      <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
78:            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
85:            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
93:          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
100:          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
108:            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
115:            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
123:          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
145:    <div className="border border-gray-200 rounded-lg p-4 space-y-2 bg-white hover:border-gray-300 transition-colors">
150:            <User className="w-4 h-4 text-gray-400" />
151:            <span className="font-medium text-gray-900">{contact.name}</span>
153:              <span className="text-sm text-gray-500">- {contact.title}</span>
177:        <div className="flex items-center gap-2 text-sm text-gray-600">
178:          <Building2 className="w-4 h-4 text-gray-400" />
185:        <div className="flex items-center gap-2 text-sm text-gray-600">
186:          <Mail className="w-4 h-4 text-gray-400" />
189:            className="text-blue-600 hover:underline"
198:        <div className="flex items-center gap-2 text-sm text-gray-600">
199:          <Phone className="w-4 h-4 text-gray-400" />
213:        <div className="flex items-start gap-2 text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
--- Hardcoded hex colors ---

FILE: src/components/projects/contacts/ContactsSection.tsx
--- Tailwind color classes ---
55:    return <div className="text-gray-500">Loading contacts...</div>;
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/ModelReadinessDisplay.tsx
--- Tailwind color classes ---
15:      return 'text-green-600 bg-green-100';
17:      return 'text-amber-600 bg-amber-100';
19:      return 'text-orange-600 bg-orange-100';
21:      return 'text-red-600 bg-red-100';
26:  if (score >= 90) return 'bg-green-500';
27:  if (score >= 70) return 'bg-amber-500';
28:  if (score >= 50) return 'bg-orange-500';
29:  return 'bg-red-500';
42:    <div className={`p-3 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
51:            <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
54:            <div className={`w-20 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
69:            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
71:            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
77:          <ChevronUp className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
79:          <ChevronDown className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
85:        <div className={`mt-3 pt-3 border-t space-y-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
87:          <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
89:              <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>
95:              <span className="text-amber-600">
105:                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/NewProjectChannelTabs.tsx
--- Tailwind color classes ---
65:      <div className={`flex border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
77:                  ? 'text-blue-600'
79:                    ? 'text-slate-400 hover:text-slate-200'
80:                    : 'text-slate-500 hover:text-slate-700'
89:                      ? 'bg-blue-100 text-blue-700'
91:                        ? 'bg-slate-700 text-slate-300'
92:                        : 'bg-slate-200 text-slate-600'
99:                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
119:        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/NewProjectChat.tsx
--- Tailwind color classes ---
82:            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
85:            <p className={`text-sm mb-6 max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
102:              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
111:                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
112:                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
131:                      ? 'bg-blue-600 text-white'
133:                        ? 'bg-slate-800 border border-slate-700 text-slate-200'
134:                        : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
161:                    <div className="mt-2 pt-2 border-t border-slate-200/20">
162:                      <span className={`text-xs ${message.role === 'user' ? 'text-blue-200' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
175:                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
189:      <div className={`border-t p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
200:              className={`w-full resize-none rounded-lg border px-4 py-3 pr-12 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
202:                  ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500'
203:                  : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
212:                  ? 'bg-blue-600 text-white hover:bg-blue-500'
214:                    ? 'bg-slate-700 text-slate-500'
215:                    : 'bg-slate-100 text-slate-400'
222:        <div className={`mt-2 flex items-center justify-between text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
226:            className={`flex items-center gap-1 transition hover:text-blue-500 ${
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/NewProjectDropZone.tsx
--- Tailwind color classes ---
165:    if (isDragAccept) return 'border-green-400 bg-green-50 dark:bg-green-900/20';
166:    if (isDragReject) return 'border-red-400 bg-red-50 dark:bg-red-900/20';
167:    if (isDragActive) return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
168:    if (phase === 'complete') return 'border-green-400 bg-green-50 dark:bg-green-900/20';
169:    if (phase === 'error') return 'border-red-400 bg-red-50 dark:bg-red-900/20';
171:      ? 'border-slate-600 hover:border-slate-500'
172:      : 'border-slate-300 hover:border-slate-400';
183:          transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-400
193:              <Upload className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
194:              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
205:              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
206:              <span className="text-sm text-blue-600">Uploading {fileName}...</span>
212:              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
213:              <span className="text-sm text-amber-600">
221:              <CheckCircle className="h-5 w-5 text-green-500" />
222:              <span className="text-sm text-green-600">
230:              <AlertCircle className="h-5 w-5 text-red-500" />
231:              <span className="text-sm text-red-600">{errorMessage || 'Upload failed'}</span>
246:        transition-colors duration-200 outline-none focus:ring-2 focus:ring-blue-400
256:            isDark ? 'bg-slate-800' : 'bg-slate-100'
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/NewProjectFieldTable.tsx
--- Tailwind color classes ---
85:  if (confidence >= 0.9) return 'text-green-500';
86:  if (confidence >= 0.7) return 'text-amber-500';
87:  return 'text-red-500';
100:        isDark ? 'text-slate-400' : 'text-slate-500'
114:        <thead className={`sticky top-0 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
115:          <tr className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
131:                    ? 'border-slate-800 hover:bg-slate-800/50'
132:                    : 'border-slate-100 hover:bg-slate-50'
135:                <td className={`py-2 px-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
138:                <td className={`py-2 px-3 text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
154:                      isDark ? 'text-slate-500' : 'text-slate-400'
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/NewProjectOnboardingModal.tsx
--- Tailwind color classes ---
351:            ? 'border-slate-800 bg-slate-900 text-slate-100'
352:            : 'border-slate-200 bg-white text-slate-900'
359:              ? 'border-slate-800 bg-slate-900/70'
360:              : 'border-slate-200 bg-slate-50'
368:                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
397:                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
398:                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
408:          <div className="mx-6 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
418:              isDark ? 'border-slate-800' : 'border-slate-200'
--- Hardcoded hex colors ---

FILE: src/components/projects/onboarding/SimplifiedChannelView.tsx
--- Tailwind color classes ---
158:        <span className="flex items-center gap-0.5 text-green-600 text-xs">
165:        <span className="text-amber-500 text-xs" title={`${Math.round(confidence * 100)}% confidence`}>
171:      <span className="flex items-center gap-0.5 text-red-500 text-xs" title="Low confidence">
190:                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
193:                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
197:                  <span className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
211:          <div className={`text-xs font-medium mb-2 px-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
222:                    isDark ? 'text-slate-600' : 'text-slate-300'
231:              <div className={`text-xs px-2 py-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
241:        <div className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
--- Hardcoded hex colors ---

FILE: src/components/reports/ExtractionFilterPills.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/reports/ExtractionHistoryReport.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/reports/PropertySummaryView.tsx
--- Tailwind color classes ---
189:              <tr className="bg-blue-50">
190:                <td colSpan={3} className="px-6 py-2 text-sm font-semibold text-gray-900 uppercase">
194:              <tr className="hover:bg-gray-50">
195:                <td className="px-6 py-3 text-sm text-gray-900">Gross Scheduled Rent</td>
197:                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
201:              <tr className="hover:bg-gray-50">
202:                <td className="px-6 py-3 text-sm text-gray-900 pl-12">Less: Vacancy Loss (3%)</td>
203:                <td className="px-6 py-3 text-sm text-right font-mono text-red-600">
206:                <td className="px-6 py-3 text-sm text-right font-mono text-red-600">
210:              <tr className="bg-gray-50 hover:bg-gray-100">
211:                <td className="px-6 py-3 text-sm font-semibold text-gray-900">Effective Rental Income</td>
215:                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
219:              <tr className="hover:bg-gray-50">
220:                <td className="px-6 py-3 text-sm text-gray-900">Other Income</td>
222:                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
226:              <tr className="bg-blue-100 font-semibold">
227:                <td className="px-6 py-3 text-sm text-gray-900">EFFECTIVE GROSS INCOME</td>
231:                <td className="px-6 py-3 text-sm text-right font-mono text-gray-600">
237:              <tr className="bg-red-50">
238:                <td colSpan={3} className="px-6 py-2 text-sm font-semibold text-gray-900 uppercase">
--- Hardcoded hex colors ---

FILE: src/components/sales/AnnualInventoryGauge.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/sales/CreateSalePhaseModal.tsx
--- Tailwind color classes ---
81:          <p className="text-sm text-gray-600 mb-4">
114:                InputProps={{ endAdornment: <span className="text-gray-500 ml-1">%</span> }}
122:                InputProps={{ endAdornment: <span className="text-gray-500 ml-1">%</span> }}
130:                InputProps={{ startAdornment: <span className="text-gray-500 mr-1">$</span> }}
--- Hardcoded hex colors ---

FILE: src/components/sales/ParcelSalesTable.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/sales/PhaseTiles.tsx
--- Tailwind color classes ---
102:            <div className="h-32 bg-gray-200 rounded border-2"></div>
111:      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
119:      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
--- Hardcoded hex colors ---

FILE: src/components/sales/PricingTable.tsx
--- Tailwind color classes ---
590:                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
722:                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
763:                      className="w-1/2 px-2 py-1 text-sm text-center border rounded focus:ring-2 focus:ring-blue-500"
--- Hardcoded hex colors ---

FILE: src/components/sales/SaleDetailForm.tsx
--- Tailwind color classes ---
28:    <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">{label}</div>
29:    <div className="text-sm text-gray-900 space-y-1">{children}</div>
106:    <div className="rounded-lg border border-blue-200 bg-white shadow-sm">
107:      <div className="border-b border-blue-100 px-4 py-2 text-sm text-blue-900 flex items-center justify-between">
110:          {salePhase?.phase_code && <span className="text-blue-600">• Phase {salePhase.phase_code}</span>}
113:          <span className="font-mono text-xs text-gray-500">{parcel.sale_date}</span>
115:          <span className="text-xs text-red-500">Assign a sale date to enable overrides</span>
123:            <div className="text-xs text-gray-500">Auto-filled from sale phase</div>
127:            <div className="font-mono text-lg text-gray-900">{formatMoney(grossValue)}</div>
128:            <div className="text-xs text-gray-500">{formatNumber(parcel.units)} units</div>
133:              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
161:                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
172:                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
177:            <div className="text-xs text-gray-500">{formatMoney(onsiteCalculated)}</div>
181:            <div className="font-mono text-lg text-gray-900">
184:            <div className="text-xs text-gray-500">Gross - Onsites</div>
189:              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
218:                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
229:                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
234:            <div className="text-xs text-gray-500">{formatMoney(commissionCalculated)}</div>
--- Hardcoded hex colors ---

FILE: src/components/sales/SaveBenchmarkModal.tsx
--- Tailwind color classes ---
111:          <p className="text-sm text-gray-600 mb-4">
158:            <div className="bg-gray-50 p-3 rounded border border-gray-200">
159:              <div className="text-sm font-medium text-gray-700 mb-1">Benchmark Value</div>
160:              <div className="text-lg font-semibold text-gray-900">
166:              <div className="text-xs text-gray-500 mt-1">
--- Hardcoded hex colors ---

FILE: src/components/scenarios/ScenarioComparison.tsx
--- Tailwind color classes ---
99:        <label className="block text-sm font-medium text-gray-700 mb-2">
112:        <label className="block text-sm font-medium text-gray-700 mb-2">
118:            className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
143:        <p className="text-sm text-gray-500 mt-2">
--- Hardcoded hex colors ---

FILE: src/components/shared/AreaTiles.tsx
--- Tailwind color classes ---
86:            <div className="h-36 bg-gray-200 rounded border-2"></div>
95:      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
103:      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
--- Hardcoded hex colors ---

FILE: src/components/shared/ModeToggle.tsx
--- Tailwind color classes ---
53:  const containerClass = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
55:    ? 'bg-gray-900 text-white shadow-lg'
56:    : 'bg-white text-blue-600 shadow-sm';
58:    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
59:    : 'text-gray-600 hover:text-gray-900';
81:                    : 'text-gray-400 cursor-not-allowed'
--- Hardcoded hex colors ---

FILE: src/components/studio/TileGrid.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/taxonomy/FamilyDetails.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/taxonomy/FamilyTree.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/ui/toast.tsx
--- Tailwind color classes ---
--- Hardcoded hex colors ---

FILE: src/components/valuation/income-approach/SensitivityMatrix.tsx
--- Tailwind color classes ---
190:        <span className="text-green-500">Green = higher value</span>
191:        <span className="text-red-500">Red = lower value</span>
--- Hardcoded hex colors ---

## SECTION 5: COREUI WRAPPER COMPONENTS

### Wrapper components
src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx
src/app/components/LandscaperChatModal.tsx
src/app/components/new-project/LandscaperPanel.tsx
src/components/ui/landscape/LandscapeButton.tsx
src/components/landscaper/LandscaperChat.tsx
src/components/landscaper/LandscaperProgress.tsx
src/components/landscaper/LandscaperPanel.tsx
src/components/studio/LandscaperPanel.tsx
src/components/admin/LandscaperAdminPanel.tsx
src/components/napkin/LandscaperPanel.tsx
src/components/benchmarks/LandscaperPanel.tsx
src/components/icons/LandscaperIcon.tsx
src/components/dms/panels/DmsLandscaperPanel.tsx
src/app/components/Budget/BudgetGridDarkWrapper.tsx

### LandscapeButton usage count
     113

### Files using LandscapeButton
src/app/admin/benchmarks/page.tsx
src/app/admin/preferences/page.tsx
src/app/components/LandUse/LandUseDetails.tsx
src/app/components/PlanningWizard/ProjectCanvasInline.tsx
src/app/components/dashboard/TriageModal.tsx
src/app/dashboard/page.tsx
src/app/projects/[projectId]/opex/page.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentCell.tsx
src/app/projects/[projectId]/valuation/components/AdjustmentMatrix.tsx
src/app/projects/[projectId]/valuation/components/ComparableCard.tsx
src/app/projects/[projectId]/valuation/components/ComparablesGrid.tsx
src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx
src/app/projects/[projectId]/valuation/components/SalesComparisonApproach.tsx
src/components/admin/BenchmarksPanel.tsx
src/components/admin/ExportButton.tsx
src/components/admin/LandscaperAdminPanel.tsx
src/components/admin/PreferencesPanel.tsx
src/components/admin/ReportConfiguratorPanel.tsx
src/components/admin/ReportTemplateCard.tsx
src/components/admin/ReportTemplateEditorModal.tsx
src/components/budget/BudgetDataGrid.tsx
src/components/budget/fields/FieldRenderer.tsx
src/components/ui/landscape/LandscapeButton.tsx

### Files using raw CButton (should use wrapper)
src/app/admin/preferences/components/AddUOMRow.tsx
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/admin/preferences/components/UOMRow.tsx
src/app/admin/preferences/components/UOMTable.tsx
src/app/contacts/page.tsx
src/app/growthratedetail/page.tsx
src/app/projects/[projectId]/capitalization/debt/page.tsx
src/app/projects/[projectId]/capitalization/operations/page.tsx
src/app/projects/[projectId]/components/tabs/ProjectTab.tsx
src/app/projects/[projectId]/components/tabs/ReportsTab.tsx
src/app/projects/[projectId]/landscaper/page.tsx
src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
src/app/reports/page.tsx
src/app/settings/budget-categories/page.tsx
src/app/settings/contact-roles/page.tsx
src/app/test-coreui/page.tsx
src/components/acquisition/AcquisitionAccordion.tsx
src/components/acquisition/AcquisitionHeaderCard.tsx
src/components/acquisition/AcquisitionLedgerGrid.tsx
src/components/admin/ExtractionMappingAdmin.tsx
src/components/admin/PicklistEditor.tsx
src/components/admin/PicklistItemModal.tsx
src/components/admin/SystemPicklistsAccordion.tsx
src/components/analysis/cashflow/CostGranularityToggle.tsx
src/components/analysis/cashflow/TimeScaleSelector.tsx
src/components/analysis/validation/ValidationReport.tsx
src/components/budget/BudgetDataGrid.tsx
src/components/budget/BudgetGridTab.tsx
src/components/budget/BudgetHealthWidget.tsx
src/components/budget/BudgetItemModal.tsx
src/components/budget/BudgetItemModalV2.tsx
src/components/budget/CategoryTemplateManager.tsx
src/components/budget/CategoryTreeManager.tsx
src/components/budget/ColumnDefinitions.tsx
src/components/budget/CostCategoriesTab.tsx
src/components/budget/CreateTemplateModal.tsx
src/components/budget/EditConfirmationDialog.tsx
src/components/budget/GanttEditModal.tsx
src/components/budget/ReconciliationModal.tsx
src/components/budget/TemplateEditorModal.tsx
src/components/budget/VarianceAlertModal.tsx
src/components/budget/custom/CategoryEditorRow.tsx
src/components/budget/custom/EditableCategoryCell.tsx
src/components/budget/custom/GroupRow.tsx
src/components/capitalization/DebtFacilitiesTable.tsx
src/components/capitalization/DebtFacilityModal.tsx
src/components/capitalization/DeveloperFeesTable.tsx
src/components/capitalization/DrawScheduleTable.tsx
src/components/capitalization/EquityPartnersTable.tsx
src/components/capitalization/ManagementOverheadTable.tsx
src/components/contacts/ContactDetailPanel.tsx
src/components/contacts/ContactModal.tsx
src/components/contacts/RelationshipManager.tsx
src/components/dms/folders/FolderEditor.tsx
src/components/dms/modals/DeleteConfirmModal.tsx
src/components/dms/modals/DocumentChatModal.tsx
src/components/dms/modals/PlatformKnowledgeChatModal.tsx
src/components/dms/modals/RenameModal.tsx
src/components/dms/modals/UploadCollisionModal.tsx
src/components/feasibility/ComparableModal.tsx
src/components/feasibility/ComparablesTable.tsx
src/components/feasibility/SensitivityAnalysisContent.tsx
src/components/ingestion/DocumentCard.tsx
src/components/ingestion/MilestoneBar.tsx
src/components/landscaper/ChatInterface.tsx
src/components/landscaper/ExtractionReviewModal.tsx
src/components/landscaper/ExtractionValidation.tsx
src/components/landscaper/MutationProposalCard.tsx
src/components/landscaper/UnitMixAccordion.tsx
src/components/napkin/LandscaperPanel.tsx
src/components/napkin/NapkinAnalysisPage.tsx
src/components/napkin/PromoteModal.tsx
src/components/napkin/RlvSummaryCard.tsx
src/components/napkin/SfdPricingPanel.tsx
src/components/project/ProjectDates.tsx
src/components/project/ProjectProfileEditModal.tsx
src/components/project/ProjectProfileTile.tsx
src/components/projects/contacts/ProjectContactsSection.tsx
src/components/reports/ExtractionHistoryReport.tsx
src/components/reports/PropertySummaryView.tsx
src/components/studio/LandscaperPanel.tsx
src/components/ui/landscape/LandscapeButton.tsx

## SECTION 6: IMPORT FREQUENCY ANALYSIS

### CoreUI component usage
  55 CCardBody
  55 CCard
  38 CButton
  37 CCardHeader
  26 CBadge
  14 CSpinner
  11 CTable
  11 CNavLink
  11 CNavItem
  11 CNav
   8 CFormInput
   8 CAlert
   7 CTableRow
   7 CTableHeaderCell
   7 CTableHead
   7 CTableDataCell
   7 CTableBody
   7 CRow
   7 CCol
   6 CFormSelect

### MUI component usage
   7 importTypographyfrom'@mui/material
   6 importCardfrom'@mui/material
   6 importCardContentfrom'@mui/material
   6 importButtonfrom'@mui/material
   5 importBoxfrom'@mui/material
   4 useTheme
   4 importIconButtonfrom'@mui/material
   3 styled
   3 importMenuItemfrom'@mui/material
   3 importChipfrom'@mui/material
   2 useColorScheme
   2 importTooltipfrom'@mui/material
   2 importTextFieldfrom'@mui/material
   2 importTablefrom'@mui/material
   2 importTableRowfrom'@mui/material
   2 importTableHeadfrom'@mui/material
   2 importTableContainerfrom'@mui/material
   2 importTableCellfrom'@mui/material
   2 importTableBodyfrom'@mui/material
   2 importSelectfrom'@mui/material

### shadcn/ui component usage
  23 landscape
  17 toast
   8 button
   6 input
   5 dialog
   4 select
   4 label
   4 alert
   2 textarea
   2 badge
   1 tabs
   1 table
   1 radio-group
   1 card

## SECTION 7: CSS VARIABLE COVERAGE

### Variables defined in studio-theme.css

### Variables defined in coreui-theme.css

### Components using CSS variables (count)
     130

### Variable usage by component (all locations)
91: src/components/benchmarks/BenchmarkAccordion.tsx
86: src/app/components/Planning/PlanningContent.tsx
60: src/components/valuation/income-approach/DirectCapView.tsx
50: src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx
48: src/components/capitalization/WaterfallDistributionTable.tsx
46: src/components/sales/ParcelSalesTable.tsx
45: src/components/sales/PricingTable.tsx
45: src/components/analysis/validation/ValidationReport.tsx
41: src/components/dms/DMSView.tsx
40: src/components/sales/SaleCalculationModal.tsx
38: src/components/napkin/SfdPricingPanel.tsx
36: src/app/components/dashboard/TriageModal.tsx
31: src/components/valuation/income-approach/AssumptionsPanel.tsx
30: src/app/components/Planning/PlanningOverviewControls.tsx
28: src/components/budget/GanttChart.tsx
27: src/components/map/ProjectTabMap.tsx
27: src/components/analysis/cashflow/CashFlowPhaseTable.tsx
26: src/components/valuation/income-approach/SensitivityMatrix.tsx
26: src/components/taxonomy/ProductsList.tsx
25: src/components/admin/UserManagementPanel.tsx
25: src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx
22: src/components/taxonomy/FamilyDetails.tsx
22: src/components/napkin/RlvSummaryCard.tsx
21: src/components/napkin/MdrPanel.tsx
21: src/components/napkin/InfrastructurePanel.tsx
20: src/components/napkin/NapkinCompsMap.tsx
20: src/app/components/dashboard/DashboardMap.tsx
19: src/components/napkin/NapkinSfdPricing.tsx
19: src/components/map/ValuationSalesCompMap.tsx
19: src/components/landscaper/LandscaperChat.tsx
19: src/components/analysis/cashflow/CashFlowAnalysisTab.tsx
19: src/app/components/dashboard/UserTile.tsx
18: src/components/napkin/NapkinAttachedPricing.tsx
18: src/components/napkin/CommercialPanel.tsx
18: src/components/dms/filters/AccordionFilters.tsx
18: src/components/benchmarks/products/ProductLibraryPanel.tsx
18: src/app/admin/preferences/page.tsx
16: src/components/feasibility/SensitivityAnalysisContent.tsx
15: src/app/projects/[projectId]/valuation/components/LandscaperChatPanel.tsx
14: src/components/capitalization/WaterfallResults.tsx
13: src/components/shared/AreaTiles.tsx
13: src/components/napkin/LandscaperPanel.tsx
13: src/app/projects/[projectId]/valuation/components/AdjustmentAnalysisPanel.tsx
12: src/components/napkin/CompDetailsSection.tsx
12: src/components/budget/tiles/TimingEscalationTile.tsx
12: src/components/analysis/cashflow/CashFlowTable.tsx
12: src/components/admin/PreferencesPanel.tsx
12: src/components/admin/LandscaperAdminPanel.tsx
12: src/app/components/Market/MarketMapView.tsx
11: src/components/sales/AnnualInventoryGauge.tsx
11: src/components/landscaper/MutationProposalCard.tsx
11: src/components/landscaper/LandscaperProgress.tsx
11: src/components/landscaper/DataTableModal.tsx
11: src/components/ingestion/DocumentIngestion.tsx
11: src/components/analysis/SfCompsTile.tsx
11: src/app/admin/preferences/components/CategoryDetailPanel.tsx
10: src/components/projects/contacts/ContactRoleCard.tsx
10: src/components/landscaper/LandscaperPanel.tsx
10: src/app/components/navigation/UserMenuDropdown.tsx
9: src/components/sales/PhaseTiles.tsx
9: src/components/analysis/cashflow/CashFlowSummaryMetrics.tsx
9: src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
9: src/app/components/ProjectContextBar.tsx
8: src/components/dms/folders/FolderTree.tsx
8: src/app/admin/preferences/components/UnitCostCategoryManager.tsx
7: src/components/project/ProjectProfileTile.tsx
7: src/components/map/PropertyTabMapWithComps.tsx
7: src/components/capitalization/MetricCard.tsx
7: src/app/components/AdminNavBar.tsx
7: src/app/admin/preferences/components/CreateTagModal.tsx
6: src/components/valuation/income-approach/ValueTiles.tsx
6: src/components/dms/folders/FolderEditor.tsx
6: src/components/benchmarks/unit-costs/InlineEditableUOMCell.tsx
6: src/components/benchmarks/unit-costs/InlineEditableCell.tsx
6: src/components/benchmarks/unit-costs/InlineEditableCategoryCell.tsx
5: src/components/landscaper/ChatMessageBubble.tsx
5: src/components/landscaper/CalculatedFieldRow.tsx
5: src/components/landscaper/ActivityFeedItem.tsx
5: src/components/landscaper/ActivityFeed.tsx
5: src/components/ingestion/MilestoneBar.tsx
5: src/components/feasibility/ComparablesTable.tsx
5: src/components/budget/custom/GroupRow.tsx
5: src/components/budget/TimelineChartPeriods.tsx
5: src/app/components/PreferencesContextBar.tsx
5: src/app/components/MapView.tsx
5: src/app/components/LandscaperChatModal.tsx
5: src/app/admin/preferences/components/UOMRow.tsx
4: src/components/napkin/PromoteModal.tsx
4: src/components/napkin/NapkinAnalysisPage.tsx
4: src/components/landscaper/UnitMixAccordion.tsx
4: src/components/landscaper/ExtractionReviewModal.tsx
4: src/components/landscaper/ChatInterface.tsx
4: src/components/ingestion/PropertyOverview.tsx
4: src/components/budget/custom/ExpandableDetailsRow.tsx
4: src/components/budget/FiltersAccordion.tsx
4: src/app/components/navigation/SandboxDropdown.tsx
4: src/app/components/Planning/CollapsibleSection.tsx
3: src/components/ui/PageHeader.tsx
3: src/components/shared/AccordionSection.tsx
3: src/components/sales/TransactionColumn.tsx
3: src/components/sales/SalesContent.tsx
3: src/components/sales/SaleTransactionDetails.tsx
3: src/components/project/ProfileField.tsx
3: src/components/capitalization/NapkinWaterfallForm.tsx
3: src/components/budget/TimelineTab.tsx
3: src/components/admin/BenchmarksPanel.tsx
3: src/components/acquisition/AcquisitionAccordion.tsx
3: src/app/components/navigation/SettingsDropdown.tsx
2: src/components/sales/FilterSidebar.tsx
2: src/components/reports/ExtractionHistoryReport.tsx
2: src/components/project/ProjectSubNav.tsx
2: src/components/ingestion/IngestionChat.tsx
2: src/components/feasibility/FeasibilitySubNav.tsx
2: src/components/contacts/ContactTypeahead.tsx
2: src/components/capitalization/ManagementOverheadTable.tsx
2: src/components/capitalization/CapitalizationSubNav.tsx
2: src/components/budget/ColumnDefinitions.tsx
2: src/components/budget/CategoryTreeManager.tsx
2: src/components/budget/BudgetGridTab.tsx
2: src/components/budget/BudgetDataGrid.tsx
2: src/components/benchmarks/GrowthRateCategoryPanel.tsx
2: src/components/admin/ReportTemplateCard.tsx
2: src/app/settings/taxonomy/page.tsx
2: src/app/components/Navigation.tsx
1: src/components/reports/ExtractionFilterPills.tsx
1: src/components/projects/InflationRateDisplay.tsx
1: src/components/project/MilestoneTimeline.tsx
1: src/components/operations/DraggableOpexSection.tsx
1: src/components/landscaper/ExtractionFieldRow.tsx
1: src/components/ingestion/DocumentCard.tsx
1: src/components/feasibility/MarketDataContent.tsx
1: src/components/capitalization/WaterfallStructureTable.tsx
1: src/components/capitalization/EquityPartnersTable.tsx
1: src/components/capitalization/DrawScheduleTable.tsx
1: src/components/capitalization/DeveloperFeesTable.tsx
1: src/components/capitalization/DebtFacilitiesTable.tsx
1: src/components/budget/GanttEditModal.tsx
1: src/components/budget/CategoryCascadingDropdown.tsx
1: src/components/budget/BudgetHealthWidget.tsx
1: src/components/acquisition/AcquisitionLedgerGrid.tsx
1: src/app/projects/[projectId]/components/landscaper/StudioPanel.tsx
1: src/app/preferences/page.tsx
1: src/app/preferences/layout.tsx

## SECTION 8: OUTPUT SUMMARY

Total components audited: 485

### By category
Main shared (src/components/): 299
App components (src/app/components/): 145
DMS components: 37
Budget components: 43
Modals: 50
Dialogs: 4
Panels: 36
Flyouts/Drawers: 1
Preferences/Settings: 32
Admin: 38
Benchmarks: 6

### By styling system
Using CoreUI: 131
Using MUI: 29
Using shadcn/radix: 50

### Violations
With Tailwind color violations: 176
With hardcoded hex colors: 69

### Migration priority list
131 violations: src/app/components/DevStatus/DevStatus.tsx (tw:131, hex:0)
115 violations: src/app/components/GIS/PropertyPackageUpload.tsx (tw:115, hex:0)
87 violations: src/app/components/Admin/LandUseInputTable.tsx (tw:87, hex:0)
77 violations: src/app/components/GIS/ProjectDocumentUploads.tsx (tw:77, hex:0)
73 violations: src/app/admin/users/components/UserModals.tsx (tw:73, hex:0)
65 violations: src/components/admin/UserManagementPanel.tsx (tw:65, hex:0)
62 violations: src/components/dms/search/ResultsTable.tsx (tw:62, hex:0)
61 violations: src/components/dms/preview/DocumentPreview.tsx (tw:61, hex:0)
61 violations: src/app/components/Budget/BudgetGridDark.tsx (tw:61, hex:0)
58 violations: src/app/components/MarketAssumptionsNative.tsx (tw:0, hex:58)
57 violations: src/app/components/MapLibre/GISMap.tsx (tw:22, hex:35)
54 violations: src/app/components/PlanningWizard/forms/ParcelForm.tsx (tw:54, hex:0)
53 violations: src/components/dms/views/DocumentPreviewPanel.tsx (tw:53, hex:0)
53 violations: src/app/components/Admin/LandUseInputTableTanStack.tsx (tw:53, hex:0)
52 violations: src/app/components/Home/HomeOverview.tsx (tw:52, hex:0)
52 violations: src/app/components/AI/DocumentReview.tsx (tw:52, hex:0)
50 violations: src/components/dms/preview/PlatformKnowledgePreview.tsx (tw:50, hex:0)
50 violations: src/components/dms/filters/SmartFilterBuilder.tsx (tw:50, hex:0)
50 violations: src/app/settings/profile/page.tsx (tw:35, hex:15)
50 violations: src/app/components/Market/MarketAssumptions.tsx (tw:50, hex:0)
48 violations: src/app/components/Admin/LandUseManagement.tsx (tw:48, hex:0)
47 violations: src/app/components/PlanningWizard/ProjectCanvas.tsx (tw:47, hex:0)
46 violations: src/components/projects/onboarding/NewProjectDropZone.tsx (tw:46, hex:0)
46 violations: src/components/dms/profile/DocCard.tsx (tw:46, hex:0)
44 violations: src/app/components/NewProjectModal.tsx (tw:44, hex:0)
43 violations: src/components/dms/views/FilterDetailView.tsx (tw:43, hex:0)
43 violations: src/app/components/Setup/ProjectTaxonomyWizard.tsx (tw:43, hex:0)
43 violations: src/app/components/ContainerManagement/ProjectSetupWizard.tsx (tw:43, hex:0)
41 violations: src/app/components/GIS/PlanNavigation.tsx (tw:41, hex:0)
40 violations: src/components/dms/admin/TemplateDesigner.tsx (tw:40, hex:0)
40 violations: src/app/components/OpExHierarchy.tsx (tw:40, hex:0)
40 violations: src/app/components/Glossary/ZoningGlossaryAdmin.tsx (tw:40, hex:0)
37 violations: src/app/components/Migration/TaxonomyMigration.tsx (tw:37, hex:0)
37 violations: src/app/components/LandUse/LandUseDetails.tsx (tw:37, hex:0)
37 violations: src/app/components/Budget/BudgetContainerView.tsx (tw:37, hex:0)
36 violations: src/components/dms/list/DocumentTable.tsx (tw:36, hex:0)
36 violations: src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx (tw:36, hex:0)
34 violations: src/app/components/GrowthRates.tsx (tw:0, hex:34)
33 violations: src/components/dms/admin/AttrBuilder.tsx (tw:33, hex:0)
33 violations: src/app/components/PlanningWizard/PhaseCanvasInline.tsx (tw:29, hex:4)
32 violations: src/components/reports/PropertySummaryView.tsx (tw:32, hex:0)
32 violations: src/components/dms/list/PlatformKnowledgeTable.tsx (tw:32, hex:0)
32 violations: src/app/components/Market/MarketMapView.tsx (tw:0, hex:32)
31 violations: src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx (tw:31, hex:0)
30 violations: src/app/components/MarketFactors/index.tsx (tw:30, hex:0)
29 violations: src/components/sales/SaleDetailForm.tsx (tw:29, hex:0)
29 violations: src/app/components/Setup/ProjectStructureChoice.tsx (tw:29, hex:0)
28 violations: src/components/dms/profile/PlatformKnowledgeProfileForm.tsx (tw:28, hex:0)
28 violations: src/app/components/PlanningWizard/DraggableContainerNode.tsx (tw:28, hex:0)
28 violations: src/app/components/Documentation/MarkdownViewer.tsx (tw:28, hex:0)

### Modal-specific audit
CoreUI CModal usage:
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/components/dashboard/TriageModal.tsx
src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
src/app/settings/budget-categories/page.tsx
src/app/settings/contact-roles/page.tsx
src/components/acquisition/AcquisitionLedgerGrid.tsx
src/components/admin/AdminModal.tsx
src/components/admin/ExtractionMappingAdmin.tsx
src/components/admin/PicklistItemModal.tsx
src/components/admin/ReportTemplateEditorModal.tsx
src/components/budget/BudgetGridTab.tsx
src/components/budget/BudgetItemModal.tsx
src/components/budget/BudgetItemModalV2.tsx
src/components/budget/CategoryTemplateManager.tsx
src/components/budget/CategoryTreeManager.tsx
src/components/budget/CreateTemplateModal.tsx
src/components/budget/EditConfirmationDialog.tsx
src/components/budget/GanttEditModal.tsx
src/components/budget/ReconciliationModal.tsx
src/components/budget/TemplateEditorModal.tsx
src/components/budget/VarianceAlertModal.tsx
src/components/capitalization/DebtFacilityModal.tsx
src/components/contacts/ContactModal.tsx
src/components/contacts/RelationshipManager.tsx
src/components/dms/modals/DeleteConfirmModal.tsx
src/components/dms/modals/PlatformKnowledgeModal.tsx
src/components/dms/modals/RenameModal.tsx
src/components/dms/modals/UploadCollisionModal.tsx
src/components/feasibility/ComparableModal.tsx
src/components/landscaper/ExtractionReviewModal.tsx
src/components/landscaper/ExtractionValidation.tsx
src/components/napkin/PromoteModal.tsx
src/components/project/ProjectProfileEditModal.tsx
src/components/projects/contacts/ProjectContactsSection.tsx

Radix Dialog usage:
src/app/admin/users/components/UserModals.tsx
src/app/rent-roll/components/FloorplanUpdateDialog.tsx
src/components/IssueReporter/IssueReporterDialog.tsx
src/components/admin/UserManagementPanel.tsx
src/components/budget/QuickAddCategoryModal.tsx
src/components/documents/CorrectionModal.tsx
src/components/ui/dialog.tsx
src/components/ui/sheet.tsx

Modal styling violations:
✅ src/app/projects/[projectId]/components/tabs/ConfigureColumnsModal.tsx
✅ src/app/projects/[projectId]/components/landscaper/AgentModal.tsx
✅ src/app/projects/[projectId]/valuation/components/SalesComparableModal.tsx
❌ src/app/admin/preferences/components/CreateTagModal.tsx (tw:0, hex:7)
✅ src/app/admin/preferences/components/DeleteUOMModal.tsx
✅ src/app/admin/preferences/components/DeleteConfirmationModal.tsx
✅ src/app/admin/preferences/components/AddCategoryModal.tsx
❌ src/app/admin/users/components/UserModals.tsx (tw:73, hex:0)
❌ src/app/components/NewProjectModal.tsx (tw:10, hex:0)
✅ src/app/components/LandscaperChatModal.tsx
✅ src/app/components/dashboard/TriageModal.tsx
❌ src/app/components/PlanningWizard/AddContainerModal.tsx (tw:12, hex:0)
❌ src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx (tw:15, hex:0)
✅ src/components/landscaper/DataTableModal.tsx
✅ src/components/landscaper/ExtractionReviewModal.tsx
❌ src/components/sales/SaveBenchmarkModal.tsx (tw:5, hex:0)
❌ src/components/sales/CreateSalePhaseModal.tsx (tw:4, hex:0)
✅ src/components/sales/SaleCalculationModal.tsx
❌ src/components/projects/contacts/AddContactModal.tsx (tw:19, hex:0)
❌ src/components/projects/onboarding/NewProjectOnboardingModal.tsx (tw:1, hex:0)
✅ src/components/contacts/ContactModal.tsx
❌ src/components/capitalization/OverheadItemModal.tsx (tw:13, hex:0)
✅ src/components/capitalization/DebtFacilityModal.tsx
❌ src/components/capitalization/DeveloperFeeModal.tsx (tw:27, hex:0)
✅ src/components/admin/AdminModal.tsx
✅ src/components/admin/PicklistItemModal.tsx
✅ src/components/admin/ReportTemplateEditorModal.tsx
✅ src/components/napkin/PromoteModal.tsx
✅ src/components/project/ProjectProfileEditModal.tsx
❌ src/components/dashboard/CompletenessModal.tsx (tw:6, hex:0)
✅ src/components/benchmarks/unit-costs/UnitCostTemplateModal.tsx
❌ src/components/benchmarks/AddBenchmarkModal.tsx (tw:2, hex:0)
✅ src/components/market/AddCompetitorModal.tsx
✅ src/components/feasibility/ComparableModal.tsx
✅ src/components/documents/CorrectionModal.tsx
✅ src/components/dms/modals/PlatformKnowledgeChatModal.tsx
✅ src/components/dms/modals/UploadCollisionModal.tsx
✅ src/components/dms/modals/DeleteConfirmModal.tsx
❌ src/components/dms/modals/PlatformKnowledgeModal.tsx (tw:19, hex:0)
✅ src/components/dms/modals/DocumentChatModal.tsx
✅ src/components/dms/modals/RenameModal.tsx
❌ src/components/extraction/StagingModal.tsx (tw:0, hex:1)
✅ src/components/budget/CreateTemplateModal.tsx
✅ src/components/budget/BudgetItemModal.tsx
✅ src/components/budget/VarianceAlertModal.tsx
✅ src/components/budget/GanttEditModal.tsx
✅ src/components/budget/QuickAddCategoryModal.tsx
✅ src/components/budget/ReconciliationModal.tsx
✅ src/components/budget/TemplateEditorModal.tsx
❌ src/components/budget/BudgetItemModalV2.tsx (tw:0, hex:2)

## SECTION 9: DMS & PREFERENCES DEEP DIVE

### DMS component structure
src/components/dms
src/components/dms/filters
src/components/dms/panels
src/components/dms/admin
src/components/dms/modals
src/components/dms/shared
src/components/dms/search
src/components/dms/profile
src/components/dms/list
src/components/dms/folders
src/components/dms/preview
src/components/dms/views
src/components/dms/upload

### DMS component files with styling analysis

FILE: src/components/dms/DMSView.tsx
  CoreUI: 0 | CSS vars: 41 | TW colors: 27 | Hex: 0 | dark: variants: 12

FILE: src/components/dms/ProcessingStatus.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 24 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/admin/AttrBuilder.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 89 | Hex: 0 | dark: variants: 30

FILE: src/components/dms/admin/TemplateDesigner.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 103 | Hex: 0 | dark: variants: 36

FILE: src/components/dms/filters/AccordionFilters.tsx
  CoreUI: 0 | CSS vars: 18 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/filters/DocTypeFilters.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 17 | Hex: 4 | dark: variants: 8

FILE: src/components/dms/filters/ProjectSelector.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 2 | Hex: 0 | dark: variants: 2

FILE: src/components/dms/filters/SmartFilterBuilder.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 94 | Hex: 0 | dark: variants: 39

FILE: src/components/dms/folders/FolderEditor.tsx
  CoreUI: 1 | CSS vars: 6 | TW colors: 1 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/folders/FolderTree.tsx
  CoreUI: 0 | CSS vars: 8 | TW colors: 2 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/list/ColumnChooser.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 25 | Hex: 0 | dark: variants: 8

FILE: src/components/dms/list/DocumentTable.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 74 | Hex: 0 | dark: variants: 34

FILE: src/components/dms/list/PlatformKnowledgeAccordion.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 77 | Hex: 0 | dark: variants: 17

FILE: src/components/dms/list/PlatformKnowledgeTable.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 71 | Hex: 0 | dark: variants: 30

FILE: src/components/dms/modals/DeleteConfirmModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/modals/DocumentChatModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/modals/PlatformKnowledgeChatModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/modals/PlatformKnowledgeModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 44 | Hex: 0 | dark: variants: 16

FILE: src/components/dms/modals/RenameModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/modals/UploadCollisionModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/panels/DmsLandscaperPanel.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 33 | Hex: 0 | dark: variants: 10

FILE: src/components/dms/preview/DocumentPreview.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 137 | Hex: 0 | dark: variants: 60

FILE: src/components/dms/preview/PlatformKnowledgePreview.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 114 | Hex: 0 | dark: variants: 51

FILE: src/components/dms/profile/DocCard.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 108 | Hex: 0 | dark: variants: 39

FILE: src/components/dms/profile/PlatformKnowledgeProfileForm.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 70 | Hex: 0 | dark: variants: 25

FILE: src/components/dms/profile/ProfileForm.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 56 | Hex: 0 | dark: variants: 21

FILE: src/components/dms/profile/TagInput.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 28 | Hex: 0 | dark: variants: 9

FILE: src/components/dms/profile/VersionTimeline.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 46 | Hex: 0 | dark: variants: 19

FILE: src/components/dms/search/Facets.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 52 | Hex: 0 | dark: variants: 18

FILE: src/components/dms/search/HighlightedText.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 2 | Hex: 0 | dark: variants: 1

FILE: src/components/dms/search/ResultsTable.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 167 | Hex: 0 | dark: variants: 61

FILE: src/components/dms/search/SearchBox.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 12 | Hex: 0 | dark: variants: 3

FILE: src/components/dms/shared/DMSLayout.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 7 | Hex: 0 | dark: variants: 3

FILE: src/components/dms/upload/Dropzone.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 45 | Hex: 0 | dark: variants: 19

FILE: src/components/dms/upload/Queue.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 54 | Hex: 0 | dark: variants: 18

FILE: src/components/dms/views/DocumentPreviewPanel.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 121 | Hex: 0 | dark: variants: 53

FILE: src/components/dms/views/FilterDetailView.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 98 | Hex: 0 | dark: variants: 40

### Preferences page structure
src/app/preferences/layout.tsx
src/app/preferences/page.tsx
src/app/settings/budget-categories/page.tsx
src/app/settings/contact-roles/page.tsx
src/app/settings/profile/page.tsx
src/app/settings/taxonomy/page.tsx

### Preferences components with styling analysis

FILE: src/app/admin/preferences/components/ActivityFilter.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/AddCategoryModal.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/AddUOMRow.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryDetailPanel.tsx
  CoreUI: 0 | CSS vars: 11 | TW colors: 0 | Hex: 15 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryTree.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryTreeItem.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryTreeView.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CreateTagModal.tsx
  CoreUI: 0 | CSS vars: 7 | TW colors: 0 | Hex: 7 | dark: variants: 0

FILE: src/app/admin/preferences/components/DeleteConfirmationModal.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/DeleteUOMModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/MobileWarning.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/UOMRow.tsx
  CoreUI: 1 | CSS vars: 5 | TW colors: 0 | Hex: 2 | dark: variants: 0

FILE: src/app/admin/preferences/components/UOMTable.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/UnitCostCategoryManager.tsx
  CoreUI: 0 | CSS vars: 8 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/UnitOfMeasureManager.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/page.tsx
  CoreUI: 0 | CSS vars: 18 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/preferences/layout.tsx
  CoreUI: 0 | CSS vars: 1 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/preferences/page.tsx
  CoreUI: 0 | CSS vars: 1 | TW colors: 0 | Hex: 0 | dark: variants: 0

### Admin panels
src/app/admin/benchmarks/cost-library/page.tsx
src/app/admin/benchmarks/page.tsx
src/app/admin/dms/templates/page.tsx
src/app/admin/preferences/components/ActivityFilter.tsx
src/app/admin/preferences/components/AddCategoryModal.tsx
src/app/admin/preferences/components/AddUOMRow.tsx
src/app/admin/preferences/components/CategoryDetailPanel.tsx
src/app/admin/preferences/components/CategoryTree.tsx
src/app/admin/preferences/components/CategoryTreeItem.tsx
src/app/admin/preferences/components/CategoryTreeView.tsx
src/app/admin/preferences/components/CreateTagModal.tsx
src/app/admin/preferences/components/DeleteConfirmationModal.tsx
src/app/admin/preferences/components/DeleteUOMModal.tsx
src/app/admin/preferences/components/MobileWarning.tsx
src/app/admin/preferences/components/UOMRow.tsx
src/app/admin/preferences/components/UOMTable.tsx
src/app/admin/preferences/components/UnitCostCategoryManager.tsx
src/app/admin/preferences/components/UnitOfMeasureManager.tsx
src/app/admin/preferences/page.tsx
src/app/admin/users/components/UserModals.tsx
src/app/admin/users/page.tsx

### Admin components with styling analysis

FILE: src/app/admin/benchmarks/cost-library/page.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/benchmarks/page.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/dms/templates/page.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 68 | Hex: 0 | dark: variants: 22

FILE: src/app/admin/preferences/components/ActivityFilter.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/AddCategoryModal.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/AddUOMRow.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryDetailPanel.tsx
  CoreUI: 0 | CSS vars: 11 | TW colors: 0 | Hex: 15 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryTree.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryTreeItem.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CategoryTreeView.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/CreateTagModal.tsx
  CoreUI: 0 | CSS vars: 7 | TW colors: 0 | Hex: 7 | dark: variants: 0

FILE: src/app/admin/preferences/components/DeleteConfirmationModal.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/DeleteUOMModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/MobileWarning.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/UOMRow.tsx
  CoreUI: 1 | CSS vars: 5 | TW colors: 0 | Hex: 2 | dark: variants: 0

FILE: src/app/admin/preferences/components/UOMTable.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/UnitCostCategoryManager.tsx
  CoreUI: 0 | CSS vars: 8 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/components/UnitOfMeasureManager.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/preferences/page.tsx
  CoreUI: 0 | CSS vars: 18 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/users/components/UserModals.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 115 | Hex: 0 | dark: variants: 0

FILE: src/app/admin/users/page.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 40 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/AdminModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/BenchmarksPanel.tsx
  CoreUI: 0 | CSS vars: 3 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/CostLibraryPanel.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/DMSAdminPanel.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/ExportButton.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/ExtractionMappingAdmin.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/LandscaperAdminPanel.tsx
  CoreUI: 0 | CSS vars: 12 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/PicklistEditor.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/PicklistItemModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/PreferencesPanel.tsx
  CoreUI: 0 | CSS vars: 12 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/ReportConfiguratorPanel.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/ReportTemplateCard.tsx
  CoreUI: 1 | CSS vars: 2 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/ReportTemplateEditorModal.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/SystemPicklistsAccordion.tsx
  CoreUI: 1 | CSS vars: 0 | TW colors: 0 | Hex: 0 | dark: variants: 0

FILE: src/components/admin/UserManagementPanel.tsx
  CoreUI: 0 | CSS vars: 25 | TW colors: 109 | Hex: 0 | dark: variants: 0

FILE: src/components/dms/admin/AttrBuilder.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 89 | Hex: 0 | dark: variants: 30

FILE: src/components/dms/admin/TemplateDesigner.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 103 | Hex: 0 | dark: variants: 36

### Benchmark components

FILE: src/app/prototypes/multifam/rent-roll-inputs/components/BenchmarkPanel.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 31 | Hex: 0

FILE: src/components/admin/BenchmarksPanel.tsx
  CoreUI: 0 | CSS vars: 3 | TW colors: 0 | Hex: 0

FILE: src/components/benchmarks/AddBenchmarkModal.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 2 | Hex: 0

FILE: src/components/benchmarks/BenchmarkAccordion.tsx
  CoreUI: 0 | CSS vars: 91 | TW colors: 26 | Hex: 3

FILE: src/components/benchmarks/BenchmarksFlyout.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 0 | Hex: 0

FILE: src/components/sales/SaveBenchmarkModal.tsx
  CoreUI: 0 | CSS vars: 0 | TW colors: 6 | Hex: 0

## SECTION 10: NAVIGATION COMPONENTS

### Navigation dropdown files
src/app/components/navigation/SandboxDropdown.tsx
src/app/components/navigation/SettingsDropdown.tsx
src/app/components/navigation/UserMenuDropdown.tsx

### Navigation styling analysis

FILE: src/app/components/navigation/SandboxDropdown.tsx
  CoreUI: 0 | CSS vars: 4 | TW colors: 0 | Hex: 0 | Z-index refs: 2

FILE: src/app/components/navigation/SettingsDropdown.tsx
  CoreUI: 0 | CSS vars: 3 | TW colors: 0 | Hex: 0 | Z-index refs: 2

FILE: src/app/components/navigation/UserMenuDropdown.tsx
  CoreUI: 0 | CSS vars: 10 | TW colors: 3 | Hex: 0 | Z-index refs: 2

### Specific dropdown implementations
SandboxDropdown:
26:    <div className="relative" ref={dropdownRef}>
30:        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors"
45:        <ChevronDown className="h-4 w-4" />
50:          className="absolute right-0 mt-2 w-72 rounded-md border shadow-lg max-h-96 overflow-y-auto"
57:          <div className="py-2">
64:                    className="my-2 border-t"
78:                  className="block px-4 py-2 text-sm transition-colors"

UserMenuDropdown:
40:    <div className="relative" ref={dropdownRef}>
44:        className="rounded-full border p-2 transition-colors"
61:          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
65:          <UserCircle2 className="h-5 w-5" />
71:          className="absolute right-0 mt-2 w-64 rounded-md border shadow-lg"
79:            <div className="py-4 text-center">
80:              <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full text-blue-500" />
85:              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--cui-border-color)' }}>
86:                <p className="text-sm font-medium" style={{ color: 'var(--cui-body-color)' }}>
91:                <p className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>

SettingsDropdown:
34:    <div className="relative" ref={dropdownRef}>
38:        className="rounded-full border p-2 transition-colors"
54:        <Settings className="h-5 w-5" />
59:          className="absolute right-0 mt-2 w-60 rounded-md border shadow-lg"
66:          <div className="py-2">
72:                className="block w-full px-4 py-2 text-left text-sm transition-colors"

## SECTION 11: RECOMMENDATIONS

- Standardize on CoreUI primitives for shared components (CButton, CModal, CCard, CInput).
- Replace Tailwind color utilities and hex values with --cui-* CSS variables.
- Reserve Tailwind utilities for layout, spacing, and typography only.
- Prefer wrapper components (e.g., LandscapeButton) to enforce consistency.
- Ensure dark mode coverage where color utilities are present.

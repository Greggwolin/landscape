# Landscape UI Color Inventory

**Original Audit**: November 14, 2025 23:36 UTC
**Last Updated**: November 16, 2025
**Related Document**: [CoreUI Theme Migration Status](./COREUI_THEME_MIGRATION_STATUS.md)

---

## Migration Progress Summary

### Overview
This inventory catalogs **3,499 hardcoded color instances** across the codebase that need migration to CoreUI CSS variables for proper light/dark theme support.

### Completed Migrations ✅

#### Pages/Components Fully Migrated
1. **Operating Expenses** (`src/app/projects/[projectId]/opex/page.tsx`)
   - 27 color instances → All using CSS variables
   - Status: ✅ Complete

2. **Admin Preferences - Planning Standards** (`src/app/admin/preferences/page.tsx`)
   - Input backgrounds, headers, tiles → All theme-aware
   - Status: ✅ Complete

3. **Admin Preferences - Unit Cost Categories**
   - `CategoryDetailPanel.tsx`: Removed 3 hardcoded color constants, fixed tag chips
   - `category-taxonomy.css`: Fixed border styling
   - Status: ✅ Complete

4. **Benchmarks** (`src/components/benchmarks/BenchmarkAccordion.tsx`)
   - ~50+ form field instances → All using CSS variables
   - Status: ✅ Complete

5. **Land Use Taxonomy Manager**
   - `taxonomy.css`: Active cards, loading states
   - `FamilyDetails.tsx`: CoreUI icons
   - `ProductsList.tsx`: CoreUI icons
   - Status: ✅ Complete

6. **DMS** (`src/app/dms/page.tsx`)
   - Main sections completed
   - Status: 🟡 Partial (modals remaining)

### In Progress 🟡
- Dashboard components
- DMS modal dialogs

### High Priority Remaining ❌
- **Rent Roll** - 18 instances identified
- **Market** - 14 instances identified
- **Valuation** - Multiple components

### Migration Tracking
For detailed migration status and patterns, see: [COREUI_THEME_MIGRATION_STATUS.md](./COREUI_THEME_MIGRATION_STATUS.md)

---

## Original Inventory (November 14, 2025)

### Total Count: 3,499 hardcoded color instances

## 1. BUTTONS

### Primary Action Buttons

- **Light Mode**: `bg-blue-600 hover:bg-blue-700 text-white`
- **Dark Mode**: Not defined anywhere; elements reuse light tokens even on dark backgrounds. Needs dark variants.
- **Usage**: Save/confirm actions across AI Document Review screens, Land Use editors, GIS uploads, Planning wizard flows, pricing tables, and sales modals.
- **Locations & Variants**:
  - Base CTA buttons:
    - **Pattern**: `bg-blue-600 hover:bg-blue-700 text-white` (67 uses)
      - src/app/ai-document-review/page.tsx:65 – className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      - src/app/components/AI/DocumentReview.tsx:200 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      - src/app/components/AI/DocumentReview.tsx:306 – className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/components/AI/DocumentReview.tsx:513 – className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      - src/app/components/AI/DocumentReview.tsx:625 – className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      - src/app/components/Admin/LandUseInputTable.tsx:286 – className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      - src/app/components/Admin/LandUseInputTable.tsx:451 – className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      - src/app/components/Admin/LandUseInputTable.tsx:671 – className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      - src/app/components/Admin/LandUseInputTable.tsx:991 – className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
      - src/app/components/Admin/LandUseInputTableTanStack.tsx:442 – <Button onClick={addRow} className="bg-blue-600 hover:bg-blue-700 text-white">Add Row</Button>
      - src/app/components/Admin/LandUseManagement.tsx:240 – className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      - src/app/components/Admin/LandUseManagement.tsx:257 – <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center">
      - src/app/components/Budget/BudgetContent.tsx:337 – <button onClick={addLine} disabled={(categories ?? []).length === 0 || !scopeSelection} className="ml-3 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">Add Line</button>
      - src/app/components/DevStatus/DevStatus.tsx:1120 – className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-left transition-colors"
      - src/app/components/Documentation/MarkdownViewer.tsx:183 – className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
      - src/app/components/GIS/ProjectDocumentUploads.tsx:377 – className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
      - src/app/components/GIS/ProjectDocumentUploads.tsx:504 – className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      - src/app/components/GrowthRateDetail/index.tsx:92 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      - src/app/components/Home/HomeOverview.tsx:135 – className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      - src/app/components/Home/HomeOverview.tsx:303 – className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      - src/app/components/Home/HomeOverview.tsx:350 – className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      - src/app/components/LandUse/LandUseCanvas.tsx:312 – className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-all duration-200"
      - src/app/components/LandUse/LandUseDetails.tsx:202 – <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
      - src/app/components/LandUse/LandUseDetails.tsx:287 – <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
      - src/app/components/LandUse/LandUseDetails.tsx:352 – <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
      - src/app/components/LandUse/LandUseDetails.tsx:364 – <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
      - src/app/components/LandUse/LandUseDetails.tsx:400 – <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
      - src/app/components/LandUse/LandUseDetails.tsx:412 – <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
      - src/app/components/LandUse/LandUseDetails.tsx:466 – <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
      - src/app/components/LandUsePricing/index.tsx:160 – className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
      - src/app/components/MapLibre/GISMap.tsx:1124 – className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 shadow-lg"
      - src/app/components/Market/MarketAssumptions.tsx:430 – <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save & Close</button>
      - src/app/components/Market/MarketAssumptions.tsx:513 – <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save / Update</button>
      - src/app/components/MarketAssumptions.tsx:187 – <button onClick={onSave} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs">
      - src/app/components/MarketFactors/index.tsx:243 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      - src/app/components/MarketFactors/index.tsx:302 – <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save & Close</button>
      - src/app/components/NewProjectButton.tsx:13 – className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      - src/app/components/OpExHierarchy.tsx:231 – className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      - src/app/components/PlanningWizard/ContainerTreeView.tsx:226 – className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:281 – className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
      - src/app/components/PlanningWizard/PlanningWizard.tsx:495 – className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      - src/app/components/PlanningWizard/PlanningWizard.tsx:531 – className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      - src/app/components/PlanningWizard/ProjectCanvas.tsx:597 – className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
      - src/app/components/PlanningWizard/ProjectCanvasInline.tsx:183 – className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:444 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      - src/app/components/UniversalInventory/UniversalInventoryTable.tsx:451 – className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
      - src/app/projects/[projectId]/opex/page.tsx:177 – className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors font-medium"
      - src/app/properties/[id]/analysis/components/CashFlowTab.tsx:141 – <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
      - src/app/properties/[id]/analysis/components/InvestmentReturnsTab.tsx:123 – <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
      - src/app/properties/[id]/analysis/components/MarketAssumptionsTab.tsx:85 – <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
      - src/app/properties/[id]/analysis/components/OperatingAssumptionsTab.tsx:82 – <button onClick={onNext} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
      - src/app/properties/[id]/analysis/components/RentRollTab.tsx:143 – className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
      - src/app/properties/[id]/analysis/components/RentRollTab.tsx:304 – <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      - src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx:126 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DebtFacilityForm.tsx:688 – className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx:479 – className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx:598 – className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx:266 – <button className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors">
      - src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx:368 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
      - src/app/prototypes/multifam/rent-roll-inputs/components/OperatingExpensesTab.tsx:398 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
      - src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx:311 – className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/budget/custom/ColumnChooser.tsx:154 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      - src/components/dms/filters/SmartFilterBuilder.tsx:346 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
      - src/components/projects/contacts/AddContactModal.tsx:249 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
      - src/components/projects/contacts/ContactCard.tsx:135 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
      - src/components/sales/ParcelSalesTable.tsx:355 – className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      - src/components/sales/PricingTable.tsx:517 – className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
    - **Pattern**: `bg-blue-600 focus:ring-2 focus:ring-blue-500 hover:bg-blue-700 text-white` (13 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1202 – className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/GIS/PropertyPackageUpload.tsx:287 – className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1506 – className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/Migration/TaxonomyMigration.tsx:159 – className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:176 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:131 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:639 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:133 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:304 – className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/admin/AttrBuilder.tsx:191 – className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/admin/AttrBuilder.tsx:362 – className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/admin/TemplateDesigner.tsx:274 – className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/profile/ProfileForm.tsx:279 – className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    - **Pattern**: `bg-blue-600 disabled:bg-gray-400 hover:bg-blue-700 text-white` (3 uses)
      - src/app/components/PlanningWizard/AddContainerModal.tsx:177 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
      - src/components/project/ProjectLandUseLabels.tsx:244 – className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      - src/components/sales/SaleDetailForm.tsx:310 – className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    - **Pattern**: `bg-blue-600 disabled:bg-gray-600 hover:bg-blue-700 text-white` (2 uses)
      - src/app/components/LandUse/LandUseMatchWizard.tsx:351 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/components/LandUsePricing/index.tsx:177 – className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:bg-gray-600"
    - **Pattern**: `bg-blue-600 border-blue-500 focus:ring-2 focus:ring-blue-500 hover:bg-blue-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:587 – className="w-full px-4 py-3 bg-blue-600 border border-blue-500 rounded-lg text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
    - **Pattern**: `bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-blue-700 text-white` (1 uses)
      - src/components/dms/upload/Dropzone.tsx:238 – className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
  - Focus ring/focus-visible variant:
    - **Pattern**: `bg-blue-600 focus:ring-2 focus:ring-blue-500 hover:bg-blue-700 text-white` (13 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1202 – className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/GIS/PropertyPackageUpload.tsx:287 – className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1506 – className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/Migration/TaxonomyMigration.tsx:159 – className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:176 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:131 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:639 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:133 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:304 – className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/admin/AttrBuilder.tsx:191 – className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/admin/AttrBuilder.tsx:362 – className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/admin/TemplateDesigner.tsx:274 – className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/components/dms/profile/ProfileForm.tsx:279 – className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    - **Pattern**: `bg-blue-600 border-blue-500 focus:ring-2 focus:ring-blue-500 hover:bg-blue-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:587 – className="w-full px-4 py-3 bg-blue-600 border border-blue-500 rounded-lg text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
    - **Pattern**: `bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-blue-700 text-white` (1 uses)
      - src/components/dms/upload/Dropzone.tsx:238 – className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
  - Disabled fallback (light gray):
    - **Pattern**: `bg-blue-600 disabled:bg-gray-400 hover:bg-blue-700 text-white` (3 uses)
      - src/app/components/PlanningWizard/AddContainerModal.tsx:177 – className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
      - src/components/project/ProjectLandUseLabels.tsx:244 – className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      - src/components/sales/SaleDetailForm.tsx:310 – className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
  - Disabled fallback (dark gray):
    - **Pattern**: `bg-blue-600 disabled:bg-gray-600 hover:bg-blue-700 text-white` (2 uses)
      - src/app/components/LandUse/LandUseMatchWizard.tsx:351 – className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/components/LandUsePricing/index.tsx:177 – className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:bg-gray-600"
  - Border-emphasized CTA:
    - **Pattern**: `bg-blue-600 border-blue-500 focus:ring-2 focus:ring-blue-500 hover:bg-blue-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:587 – className="w-full px-4 py-3 bg-blue-600 border border-blue-500 rounded-lg text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
  - Focus ring offset CTA:
    - **Pattern**: `bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-blue-700 text-white` (1 uses)
      - src/components/dms/upload/Dropzone.tsx:238 – className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"


### Primary Action Buttons (Blue 700 base)

- **Light Mode**: `bg-blue-700 hover:bg-blue-600 text-white`
- **Dark Mode**: No dedicated dark tokens; same palette is used in dark contexts.
- **Usage**: Compact property/rent roll actions, proto rent-roll forms, per-row actions.
- **Locations & Variants**:
  - Base blue-700 CTA:
    - **Pattern**: `bg-blue-700 hover:bg-blue-600 text-white` (19 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:718 – className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:858 – <button className="px-3 py-1.5 bg-blue-700 text-white text-sm rounded hover:bg-blue-600 transition-colors">
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:963 – className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:1069 – className="px-4 py-1.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx:591 – className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx:677 – className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx:761 – className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx:868 – className="px-4 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/components/CapitalizationTab.tsx:1043 – className="px-3 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DetailedBreakdownTable.tsx:89 – <button className="px-3 py-1.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors">
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:628 – className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:771 – <button className="px-3 py-1.5 bg-blue-700 text-white text-sm rounded hover:bg-blue-600 transition-colors">
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:876 – className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:982 – className="px-4 py-1.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:712 – className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:853 – <button className="px-3 py-1.5 bg-blue-700 text-white text-sm rounded hover:bg-blue-600 transition-colors">
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:958 – className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1211 – className="px-4 py-1.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1278 – className="px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  - Compact blue CTA:
    - **Pattern**: `bg-blue-600 hover:bg-blue-500 text-white` (5 uses)
      - src/app/components/Budget/BudgetGridDark.tsx:597 – className="inline-flex items-center justify-center w-7 h-6 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
      - src/app/components/ContainerManagement/ProjectSetupWizard.tsx:407 – ? 'bg-blue-600 text-white hover:bg-blue-500'
      - src/app/components/DevStatus/DevStatus.tsx:1011 – className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
      - src/app/components/Glossary/ZoningGlossaryAdmin.tsx:227 – <button disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 rounded">
      - src/app/components/PlanningWizard/ProjectCanvas.tsx:473 – className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
    - **Pattern**: `bg-blue-600 border-blue-500 hover:bg-blue-500 text-white` (3 uses)
      - src/app/components/Budget/BudgetGridDark.tsx:479 – className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded text-sm transition-colors"
      - src/app/rent-roll/components/RentRollGrid.tsx:765 – className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white border border-blue-500 hover:bg-blue-500"
      - src/app/rent-roll/components/RentRollGrid.tsx:864 – : 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-500'
    - **Pattern**: `bg-blue-600 disabled:bg-blue-900 hover:bg-blue-500 text-white` (1 uses)
      - src/app/market/page.tsx:711 – className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
  - Bordered blue CTA:
    - **Pattern**: `bg-blue-600 border-blue-500 hover:bg-blue-500 text-white` (3 uses)
      - src/app/components/Budget/BudgetGridDark.tsx:479 – className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded text-sm transition-colors"
      - src/app/rent-roll/components/RentRollGrid.tsx:765 – className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white border border-blue-500 hover:bg-blue-500"
      - src/app/rent-roll/components/RentRollGrid.tsx:864 – : 'bg-blue-600 text-white border border-blue-500 hover:bg-blue-500'
  - Market macro CTA:
    - **Pattern**: `bg-blue-600 disabled:bg-blue-900 hover:bg-blue-500 text-white` (1 uses)
      - src/app/market/page.tsx:711 – className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"


### Secondary / Neutral Buttons

- **Light Mode**: `bg-gray-700 hover:bg-gray-600 text-gray-300`
- **Dark Mode**: Same palette reused; no `dark:` overrides, so neutral buttons rely on gray-700 tokens on both themes.
- **Usage**: Cancel, close, secondary toggles across Planning wizard, GIS uploads, property tabs, prototypes.
- **Locations & Variants**:
  - Gray solid w/ text-gray-300:
    - **Pattern**: `bg-gray-700 hover:bg-gray-600 text-gray-300` (22 uses)
      - src/app/components/Admin/LandUseManagement.tsx:378 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/DevStatus/DevStatus.tsx:899 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/DevStatus/DevStatus.tsx:910 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/DevStatus/DevStatus.tsx:918 – className="p-1.5 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      - src/app/components/GIS/PlanNavigation.tsx:328 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1053 – className="px-3 py-1 text-xs text-gray-300 bg-gray-700 rounded hover:bg-gray-600"
      - src/app/components/LandUse/LandUseMatchWizard.tsx:273 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/LandUse/LandUseMatchWizard.tsx:283 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/MapLibre/GISMap.tsx:975 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/MapLibre/GISMap.tsx:996 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:732 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:977 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:1063 – className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DetailedBreakdownTable.tsx:86 – <button className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
      - src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx:247 – : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:642 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:890 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:976 – className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:726 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:972 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1205 – className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1262 – className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-2 focus:ring-gray-500 hover:bg-gray-600 text-gray-300` (15 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1189 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1498 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:52 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:193 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:220 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:610 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:637 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:170 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:125 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:151 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:632 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:665 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:127 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:153 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:296 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300` (4 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1010 – : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:424 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:434 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/market/components/CombinedTile.tsx:242 – className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors cursor-pointer inline-block"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300` (1 uses)
      - src/app/components/Home/HomeOverview.tsx:216 – className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm hover:bg-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
  - Gray solid w/ text-white:
    - **Pattern**: `bg-gray-700 hover:bg-gray-600 text-white` (8 uses)
      - src/app/components/Budget/BudgetGridDark.tsx:622 – className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
      - src/app/components/Glossary/ZoningGlossaryAdmin.tsx:230 – <button type="button" className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded"
      - src/app/components/LandUse/LandUseCanvas.tsx:296 – className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-all duration-200"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:851 – className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-1.5"
      - src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx:331 – className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors flex items-center gap-2"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:764 – className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-1.5"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:846 – className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-1.5"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1269 – className="px-4 py-2 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
  - Gray solid + border focus:
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-2 focus:ring-gray-500 hover:bg-gray-600 text-gray-300` (15 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1189 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1498 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:52 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:193 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:220 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:610 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:637 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:170 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:125 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:151 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:632 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:665 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:127 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:153 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:296 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
  - Gray border chip/compact:
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-2 focus:ring-gray-500 hover:bg-gray-600 text-gray-300` (15 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1189 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1498 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:52 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:193 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:220 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:610 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:637 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:170 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:125 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:151 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:632 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:665 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:127 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:153 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:296 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300` (4 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1010 – : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:424 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:434 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/market/components/CombinedTile.tsx:242 – className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors cursor-pointer inline-block"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300` (1 uses)
      - src/app/components/Home/HomeOverview.tsx:216 – className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm hover:bg-gray-600 hover:border-gray-500 transition-colors cursor-pointer"


### Danger/Delete Buttons

- **Light Mode**: `bg-red-600 hover:bg-red-700 text-white`
- **Dark Mode**: No dark overrides; same red is rendered on dark cards.
- **Usage**: Delete/confirm destructive actions inside Planning wizard, admin forms, prototypes.
- **Locations & Variants**:
  - Red CTA with focus ring:
    - **Pattern**: `bg-red-600 focus:ring-2 focus:ring-red-500 hover:bg-red-700 text-white` (9 uses)
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:58 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:184 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:229 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:601 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:646 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:161 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:160 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:674 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:162 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
  - Red CTA (no focus):
    - **Pattern**: `bg-red-600 focus:ring-2 focus:ring-red-500 hover:bg-red-700 text-white` (9 uses)
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:58 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:184 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:229 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:601 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:646 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:161 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:160 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:674 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:162 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
    - **Pattern**: `bg-red-600 border-red-500 hover:bg-red-700 text-white` (1 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1027 – className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 border border-red-500"
    - **Pattern**: `bg-red-600 disabled:bg-gray-400 hover:bg-red-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:364 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
    - **Pattern**: `bg-red-600 hover:bg-red-700 text-white` (1 uses)
      - src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx:269 – <button className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-700 text-white transition-colors">
  - Red border chip:
    - **Pattern**: `bg-red-600 border-red-500 text-white` (2 uses)
      - src/app/components/LandUse/LandUseCanvas.tsx:125 – 'Commercial': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
      - src/app/components/LandUse/LandUseSchema.tsx:72 – 'Commercial': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
    - **Pattern**: `bg-red-600 border-red-500 hover:bg-red-700 text-white` (1 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1027 – className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 border border-red-500"
  - Red CTA w/ disabled gray:
    - **Pattern**: `bg-red-600 disabled:bg-gray-400 hover:bg-red-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:364 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"


### Success / Confirm Buttons

- **Light Mode**: `bg-green-600 hover:bg-green-700 text-white`
- **Dark Mode**: Same palette; no `dark:` adjustments.
- **Usage**: Approve, mark ready, confirm statuses in Document Review, GIS, Setup, and Financing tabs.
- **Locations & Variants**:
  - Green CTA base:
    - **Pattern**: `bg-green-600 hover:bg-green-700 text-white` (9 uses)
      - src/app/components/AI/DocumentReview.tsx:507 – className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
      - src/app/components/AI/DocumentReview.tsx:600 – className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
      - src/app/components/DevStatus/DevStatus.tsx:1132 – className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white text-left transition-colors"
      - src/app/components/GIS/GISSetupWorkflow.tsx:295 – className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
      - src/app/components/GIS/ProjectDocumentUploads.tsx:429 – className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
      - src/app/components/GIS/ProjectDocumentUploads.tsx:513 – className="w-full mt-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
      - src/app/components/Home/HomeOverview.tsx:318 – className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/LandUse/LandUseMatchWizard.tsx:204 – className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:453 – className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
    - **Pattern**: `bg-green-600 focus:ring-2 focus:ring-green-500 hover:bg-green-700 text-white` (4 uses)
      - src/app/components/GIS/PropertyPackageUpload.tsx:239 – className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/Migration/TaxonomyMigration.tsx:167 – className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:616 – className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:657 – className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
    - **Pattern**: `bg-green-600 disabled:bg-gray-400 hover:bg-green-700 text-white` (2 uses)
      - src/app/properties/[id]/analysis/components/FinancingAssumptionsTab.tsx:96 – className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/properties/[id]/analysis/components/FinancingAssumptionsTab.tsx:255 – className="px-8 py-4 text-lg bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg"
    - **Pattern**: `bg-green-600 disabled:bg-gray-600 hover:bg-green-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/ProjectCanvas.tsx:618 – className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center gap-1"
  - Green CTA w/ focus ring:
    - **Pattern**: `bg-green-600 focus:ring-2 focus:ring-green-500 hover:bg-green-700 text-white` (4 uses)
      - src/app/components/GIS/PropertyPackageUpload.tsx:239 – className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/Migration/TaxonomyMigration.tsx:167 – className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:616 – className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:657 – className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
  - Green CTA w/ disabled gray:
    - **Pattern**: `bg-green-600 disabled:bg-gray-400 hover:bg-green-700 text-white` (2 uses)
      - src/app/properties/[id]/analysis/components/FinancingAssumptionsTab.tsx:96 – className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
      - src/app/properties/[id]/analysis/components/FinancingAssumptionsTab.tsx:255 – className="px-8 py-4 text-lg bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg"
  - Green CTA w/ disabled dark gray:
    - **Pattern**: `bg-green-600 disabled:bg-gray-600 hover:bg-green-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/ProjectCanvas.tsx:618 – className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center gap-1"


### Warning / Pending Buttons

- **Light Mode**: `bg-yellow-500 hover:bg-yellow-400 text-white` and `bg-amber-500 hover:bg-amber-400 text-black`
- **Dark Mode**: No dark overrides.
- **Usage**: Pending/attention states inside Document Review, prototypes, and plan markers.
- **Locations & Variants**:
  - Yellow CTA: *pattern not present in repo*
  - Amber CTA: *pattern not present in repo*
## 2. CHIPS / BADGES

### Status Chips – Complete / Active

- **Light Mode**: `bg-green-900 text-green-300` (+ `border-green-700` variants)
- **Dark Mode**: Same tokens reused; no opacity adjustments for dark cards.
- **Usage**: Programming/zoning completion chips, rent roll/Floorplan status, Planning Content statuses.
- **Locations**:
  - Solid green 900 chip:
    - **Pattern**: `bg-green-900 text-green-300` (4 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:836 – complete: { bg: 'bg-green-900', text: 'text-green-300', label: 'Complete' },
      - src/app/components/Admin/LandUseManagement.tsx:205 – case 'complete': return 'bg-green-900 text-green-300';
      - src/app/components/Planning/PlanningContent.tsx:1761 – idx % 8 === 3 ? 'bg-green-900 text-green-300' :
      - src/app/rent-roll/components/RentRollGrid.tsx:120 – ACTIVE: 'bg-green-900 text-green-300',
    - **Pattern**: `bg-gray-700 bg-green-900 bg-red-900 text-gray-300 text-green-300 text-red-300` (3 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:709 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:619 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:703 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
    - **Pattern**: `bg-green-900 border-green-700 text-green-300` (2 uses)
      - src/app/rent-roll/components/FloorplansGrid.tsx:303 – ? 'bg-green-900 border border-green-700 text-green-300'
      - src/app/rent-roll/components/RentRollGrid.tsx:842 – ? 'bg-green-900 border border-green-700 text-green-300'
  - Green 900 chip w/ border:
    - **Pattern**: `bg-green-900 border-green-700 text-green-300` (2 uses)
      - src/app/rent-roll/components/FloorplansGrid.tsx:303 – ? 'bg-green-900 border border-green-700 text-green-300'
      - src/app/rent-roll/components/RentRollGrid.tsx:842 – ? 'bg-green-900 border border-green-700 text-green-300'
  - Tri-state variance chip:
    - **Pattern**: `bg-gray-700 bg-green-900 bg-red-900 text-gray-300 text-green-300 text-red-300` (3 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:709 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:619 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:703 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'


### Status Chips – Partial / Pending

- **Light Mode**: `bg-yellow-900 text-yellow-300`
- **Dark Mode**: Same palette reused in dark context.
- **Usage**: Partial programming/zoning statuses, rent roll partial states.
- **Locations**:
  - Solid yellow 900 chip:
    - **Pattern**: `bg-yellow-900 text-yellow-300` (4 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:837 – partial: { bg: 'bg-yellow-900', text: 'text-yellow-300', label: 'Partial' }
      - src/app/components/Admin/LandUseManagement.tsx:206 – case 'partial': return 'bg-yellow-900 text-yellow-300';
      - src/app/components/Planning/PlanningContent.tsx:1763 – idx % 8 === 5 ? 'bg-yellow-900 text-yellow-300' :
      - src/app/rent-roll/components/RentRollGrid.tsx:121 – NOTICE_GIVEN: 'bg-yellow-900 text-yellow-300',


### Status Chips – Error / Missing

- **Light Mode**: `bg-red-900 text-red-300` (+ `border-red-700` variants)
- **Dark Mode**: Same palette reused; no `dark:` control.
- **Usage**: Missing/overdue statuses inside rent roll, planning property variance, DocumentReview warnings.
- **Locations**:
  - Solid red 900 chip:
    - **Pattern**: `bg-red-900 border-red-700 text-red-300` (5 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:405 – 'Vacant': 'bg-red-900 text-red-300 border-red-700',
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:388 – 'Vacant': 'bg-red-900 text-red-300 border-red-700',
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:449 – 'Vacant': 'bg-red-900 text-red-300 border-red-700',
      - src/app/rent-roll/components/FloorplansGrid.tsx:304 – : 'bg-red-900 border border-red-700 text-red-300'
      - src/app/rent-roll/components/RentRollGrid.tsx:843 – : 'bg-red-900 border border-red-700 text-red-300'
    - **Pattern**: `bg-gray-700 bg-green-900 bg-red-900 text-gray-300 text-green-300 text-red-300` (3 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:709 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:619 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:703 – variance > 0 ? 'bg-green-900 text-green-300' : variance < 0 ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
    - **Pattern**: `bg-red-900 text-red-300` (3 uses)
      - src/app/components/Admin/LandUseManagement.tsx:207 – case 'incomplete': return 'bg-red-900 text-red-300';
      - src/app/components/Planning/PlanningContent.tsx:1762 – idx % 8 === 4 ? 'bg-red-900 text-red-300' :
      - src/app/rent-roll/components/RentRollGrid.tsx:122 – EXPIRED: 'bg-red-900 text-red-300',
  - Bordered red 900:
    - **Pattern**: `bg-red-900 border-red-700 text-red-300` (5 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:405 – 'Vacant': 'bg-red-900 text-red-300 border-red-700',
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:388 – 'Vacant': 'bg-red-900 text-red-300 border-red-700',
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:449 – 'Vacant': 'bg-red-900 text-red-300 border-red-700',
      - src/app/rent-roll/components/FloorplansGrid.tsx:304 – : 'bg-red-900 border border-red-700 text-red-300'
      - src/app/rent-roll/components/RentRollGrid.tsx:843 – : 'bg-red-900 border border-red-700 text-red-300'


### Neutral Chips / Toggles

- **Light Mode**: `bg-gray-700 text-gray-300` (hover to gray-600)
- **Dark Mode**: Relies on same tokens; appears lighter on dark cards.
- **Usage**: Filter pills, plan toggles, GIS nav steps, property toggles.
- **Locations**:
  - Gray hover chip:
    - **Pattern**: `bg-gray-700 hover:bg-gray-600 text-gray-300` (22 uses)
      - src/app/components/Admin/LandUseManagement.tsx:378 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/DevStatus/DevStatus.tsx:899 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/DevStatus/DevStatus.tsx:910 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/DevStatus/DevStatus.tsx:918 – className="p-1.5 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      - src/app/components/GIS/PlanNavigation.tsx:328 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1053 – className="px-3 py-1 text-xs text-gray-300 bg-gray-700 rounded hover:bg-gray-600"
      - src/app/components/LandUse/LandUseMatchWizard.tsx:273 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/LandUse/LandUseMatchWizard.tsx:283 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/MapLibre/GISMap.tsx:975 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/components/MapLibre/GISMap.tsx:996 – : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:732 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:977 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:1063 – className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DetailedBreakdownTable.tsx:86 – <button className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors">
      - src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx:247 – : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:642 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:890 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:976 – className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:726 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:972 – className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1205 – className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1262 – className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-2 focus:ring-gray-500 hover:bg-gray-600 text-gray-300` (15 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1189 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1498 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:52 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:193 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:220 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:610 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:637 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:170 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:125 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:151 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:632 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:665 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:127 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:153 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:296 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300` (4 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1010 – : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:424 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:434 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/market/components/CombinedTile.tsx:242 – className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors cursor-pointer inline-block"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300` (1 uses)
      - src/app/components/Home/HomeOverview.tsx:216 – className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm hover:bg-gray-600 hover:border-gray-500 transition-colors cursor-pointer"
  - Gray chip with border:
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-2 focus:ring-gray-500 hover:bg-gray-600 text-gray-300` (15 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1189 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:1498 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:52 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:193 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:220 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:610 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:637 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:170 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:125 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:151 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:632 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:665 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:127 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:153 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      - src/app/components/Setup/ProjectStructureChoice.tsx:296 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300` (4 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1010 – : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:424 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/components/Setup/ProjectTaxonomyWizard.tsx:434 – className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
      - src/app/market/components/CombinedTile.tsx:242 – className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors cursor-pointer inline-block"
    - **Pattern**: `bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300` (1 uses)
      - src/app/components/Home/HomeOverview.tsx:216 – className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm hover:bg-gray-600 hover:border-gray-500 transition-colors cursor-pointer"


### Priority Chips (Dev Status)

- **Light Mode**: `bg-green-100 text-green-800 border-green-200`, `bg-yellow-100 text-yellow-800 border-yellow-200`, `bg-red-100 text-red-800 border-red-200`, `bg-gray-100 text-gray-800 border-gray-200`
- **Dark Mode**: `dark:` variants missing; entire component remains light-on-dark.
- **Usage**: Priority tags inside DevStatus page, dms search statuses.
- **Locations**:
  - Priority low:
    - **Pattern**: `bg-green-100 border-green-200 text-green-800` (1 uses)
      - src/app/components/DevStatus/DevStatus.tsx:280 – case 'low': return 'bg-green-100 text-green-800 border-green-200';
  - Priority medium:
    - **Pattern**: `bg-yellow-100 border-yellow-200 text-yellow-800` (2 uses)
      - src/app/components/DevStatus/DevStatus.tsx:279 – case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      - src/app/components/DevStatus/DevStatus.tsx:1046 – <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
  - Priority high:
    - **Pattern**: `bg-red-100 border-red-200 text-red-800` (2 uses)
      - src/app/components/DevStatus/DevStatus.tsx:278 – case 'high': return 'bg-red-100 text-red-800 border-red-200';
      - src/app/components/DevStatus/DevStatus.tsx:1059 – <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
  - Priority default:
    - **Pattern**: `bg-gray-100 border-gray-200 text-gray-800` (1 uses)
      - src/app/components/DevStatus/DevStatus.tsx:281 – default: return 'bg-gray-100 text-gray-800 border-gray-200';


### Document Review / QA Chips

- **Light Mode**: Variants: `bg-green-100 text-green-700`, `bg-yellow-50 text-yellow-800`, `bg-blue-50 text-blue-700`, `bg-gray-50 text-gray-600`
- **Dark Mode**: No dark tokens; component uses same backgrounds.
- **Usage**: AI Document Review classification summary chips + callouts.
- **Locations**:
  - Green doc chip:
    - **Pattern**: `bg-green-100 dark:bg-green-900/20 dark:text-green-400 text-green-700` (1 uses)
      - src/components/dms/search/ResultsTable.tsx:162 – case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    - **Pattern**: `bg-green-100 text-green-700` (1 uses)
      - src/app/components/AI/DocumentReview.tsx:593 – <div className="text-xs text-green-700 mb-3 bg-green-100 p-2 rounded">
  - Green doc emphasis:
    - **Pattern**: `bg-green-200 text-green-800` (1 uses)
      - src/app/components/AI/DocumentReview.tsx:573 – <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
  - Blue doc chip:
    - **Pattern**: `bg-blue-50 text-blue-700` (1 uses)
      - src/app/components/AI/DocumentReview.tsx:487 – <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
  - Yellow doc chip:
    - No matches found
  - Gray doc chip:
    - **Pattern**: `bg-gray-50 border-gray-200 text-gray-600` (6 uses)
      - src/components/budget/FiltersAccordion.tsx:225 – <div className="p-4 mt-3 bg-gray-50 border border-gray-200 rounded text-gray-600">
      - src/components/budget/FiltersAccordion.tsx:243 – <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
      - src/components/sales/AnnualInventoryGauge.tsx:44 – <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
      - src/components/sales/ParcelSalesTable.tsx:633 – <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
      - src/components/sales/PhaseTiles.tsx:121 – <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
      - src/components/shared/AreaTiles.tsx:76 – <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">


### Filter / Scope Chips

- **Light Mode**: `bg-blue-600 text-blue-100`, `bg-blue-600/20 text-blue-300 border-blue-500/40`
- **Dark Mode**: No `dark:` overrides.
- **Usage**: Land use filter selections, prototype badges, new project badges.
- **Locations**:
  - Selected scope pill:
    - **Pattern**: `bg-blue-600 text-blue-100` (1 uses)
      - src/app/components/Admin/LandUseInputTableTanStack.tsx:438 – <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full font-medium">
  - Badge chip:
    - **Pattern**: `bg-blue-600/20 border-blue-500/40 text-blue-300` (2 uses)
      - src/app/prototypes/page.tsx:97 – <span className="rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 text-xs font-medium">
      - src/app/prototypes-multifam/page.tsx:119 – <span className="rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 text-xs font-medium">
## 3. STATUS INDICATORS

### Text Colors
- **Success text (green-600 w/ dark override)**:
    - **Pattern**: `dark:text-green-400 text-green-600` (2 uses)
      - src/components/dms/upload/Dropzone.tsx:204 – <p className="text-lg font-medium text-green-600 dark:text-green-400">
      - src/components/dms/upload/Queue.tsx:79 – case 'completed': return 'text-green-600 dark:text-green-400';
    - **Pattern**: `dark:hover:text-green-300 dark:text-green-400 hover:text-green-500 text-green-600` (1 uses)
      - src/components/dms/profile/VersionTimeline.tsx:221 – className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
    - **Pattern**: `dark:hover:text-green-300 dark:text-green-400 hover:text-green-700 text-green-600` (1 uses)
      - src/components/dms/upload/Queue.tsx:182 – className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
- **Success text (green-600 only)**:
    - **Pattern**: `text-green-600` (10 uses)
      - src/app/components/AI/DocumentReview.tsx:104 – if (confidence >= 0.9) return 'text-green-600'
      - src/app/components/AI/DocumentReview.tsx:254 – <span className="text-green-600">✓ {stats.confirmed} confirmed</span>
      - src/app/components/AI/DocumentReview.tsx:424 – case 'confirmed': return <span className="text-green-600">✓</span>
      - src/app/documents/review/page.tsx:293 – if (confidence >= 0.85) return <CheckCircle className="h-5 w-5 text-green-600" />;
      - src/app/documents/review/page.tsx:606 – <span className="text-green-600 font-semibold">
      - src/app/projects/[projectId]/assumptions/page.tsx:230 – <span className="text-green-600">
      - src/app/prototypes/multifam/rent-roll-inputs/components/StepRateTable.tsx:164 – : 'text-green-600'
      - src/components/benchmarks/unit-costs/UnitCostsPanel.tsx:1826 – {isSaving && <span className="text-xs text-green-600">Saving…</span>}
      - src/components/benchmarks/unit-costs/UnitCostsPanel.tsx:1951 – {isSaving && <span className="text-xs text-green-600">Saving…</span>}
      - src/components/project/ProjectLandUseLabels.tsx:227 – <span className="text-green-600 text-sm font-medium">✓ Labels saved successfully</span>
    - **Pattern**: `text-green-600 text-red-100` (4 uses)
      - src/app/properties/[id]/analysis/components/SensitivityTab.tsx:269 – <div className={\`text-xs font-medium ${result.minus_20_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}\`}>
      - src/app/properties/[id]/analysis/components/SensitivityTab.tsx:275 – <div className={\`text-xs font-medium ${result.minus_10_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}\`}>
      - src/app/properties/[id]/analysis/components/SensitivityTab.tsx:281 – <div className={\`text-xs font-medium ${result.plus_10_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}\`}>
      - src/app/properties/[id]/analysis/components/SensitivityTab.tsx:287 – <div className={\`text-xs font-medium ${result.plus_20_impact_bps > 0 ? 'text-green-600' : 'text-red-100'}\`}>
    - **Pattern**: `dark:text-green-400 text-green-600` (2 uses)
      - src/components/dms/upload/Dropzone.tsx:204 – <p className="text-lg font-medium text-green-600 dark:text-green-400">
      - src/components/dms/upload/Queue.tsx:79 – case 'completed': return 'text-green-600 dark:text-green-400';
    - **Pattern**: `dark:hover:text-green-300 dark:text-green-400 hover:text-green-500 text-green-600` (1 uses)
      - src/components/dms/profile/VersionTimeline.tsx:221 – className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300"
    - **Pattern**: `dark:hover:text-green-300 dark:text-green-400 hover:text-green-700 text-green-600` (1 uses)
      - src/components/dms/upload/Queue.tsx:182 – className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
- **Success icons (green-500)**:
    - **Pattern**: `text-green-500` (3 uses)
      - src/app/components/DevStatus/DevStatus.tsx:257 – return <Check className="w-4 h-4 text-green-500" />;
      - src/app/components/LandUse/LandUseMatchWizard.tsx:196 – <Check className="mx-auto mb-4 text-green-500" size={48} />
      - src/app/components/Setup/ProjectStructureChoice.tsx:109 – <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    - **Pattern**: `dark:hover:text-green-300 dark:text-green-400 hover:text-green-700 text-green-500` (1 uses)
      - src/components/dms/admin/TemplateDesigner.tsx:402 – className="p-1 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
- **Warning text (yellow-500)**:
    - **Pattern**: `text-yellow-500` (2 uses)
      - src/app/components/DevStatus/DevStatus.tsx:259 – return <Clock className="w-4 h-4 text-yellow-500" />;
      - src/app/components/LandUse/LandUseMatchWizard.tsx:176 – <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
- **Warning icons (yellow-500 w/ dark hover)**:
    - **Pattern**: `dark:hover:text-yellow-400 hover:text-yellow-500 text-gray-400` (2 uses)
      - src/components/dms/views/FilterDetailView.tsx:105 – <button className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors">
      - src/components/dms/views/FilterDetailView.tsx:220 – className="text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
- **Error text (red-500/600)**:
    - **Pattern**: `text-red-500` (17 uses)
      - src/app/components/DevStatus/DevStatus.tsx:261 – return <AlertTriangle className="w-4 h-4 text-red-500" />;
      - src/app/components/DevStatus/DevStatus.tsx:580 – <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
      - src/app/components/DevStatus/DevStatus.tsx:756 – <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-red-500" />
      - src/app/components/NewProject/BasicInfoStep.tsx:26 – Project Name <span className="text-red-500">*</span>
      - src/app/components/NewProject/BasicInfoStep.tsx:40 – <p className="mt-1 text-sm text-red-500">{errors.project_name}</p>
      - src/app/components/NewProject/PropertyTypeStep.tsx:59 – Select Property Type <span className="text-red-500">*</span>
      - src/app/components/NewProject/PropertyTypeStep.tsx:63 – <p className="mb-3 text-sm text-red-500">{errors.property_type}</p>
      - src/app/components/NewProject/TemplateStep.tsx:77 – <div className="text-center py-8 text-red-500">
      - src/app/components/NewProject/TemplateStep.tsx:96 – Select Template <span className="text-red-500">*</span>
      - src/app/components/NewProject/TemplateStep.tsx:100 – <p className="mb-3 text-sm text-red-500">{errors.template}</p>
      - src/app/components/PlanningWizard/AddContainerModal.tsx:143 – Name <span className="text-red-500">*</span>
      - src/app/components/assumptions/FieldRenderer.tsx:217 – {isRequired && <span className="text-red-500 ml-1">*</span>}
      - src/components/IssueReporter/IssueReporterDialog.tsx:269 – Description <span className="text-red-500">*</span>
      - src/components/dms/admin/TemplateDesigner.tsx:177 – {config.is_required && <span className="text-red-500 ml-1">*</span>}
      - src/components/dms/folders/FolderEditor.tsx:79 – Folder Name <span className="text-red-500">*</span>
      - src/components/dms/profile/ProfileForm.tsx:152 – Document Type <span className="text-red-500">*</span>
      - src/components/sales/SaleDetailForm.tsx:115 – <span className="text-xs text-red-500">Assign a sale date to enable overrides</span>
    - **Pattern**: `dark:hover:text-red-300 dark:text-red-400 hover:text-red-700 text-red-500` (2 uses)
      - src/components/dms/admin/AttrBuilder.tsx:467 – className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
      - src/components/dms/admin/TemplateDesigner.tsx:486 – className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
- **Error text (red-600)**:
    - **Pattern**: `text-red-600` (12 uses)
      - src/app/components/AI/DocumentReview.tsx:106 – return 'text-red-600'
      - src/app/components/AI/DocumentReview.tsx:193 – <div className="text-red-600 mb-4">
      - src/app/components/OpExHierarchy.tsx:227 – <div className="text-red-600 font-semibold mb-2">Error Loading Data</div>
      - src/app/documents/review/page.tsx:295 – return <AlertCircle className="h-5 w-5 text-red-600" />;
      - src/components/dms/admin/AttrBuilder.tsx:236 – <p className="mt-1 text-xs text-red-600">{errors.attr_name.message}</p>
      - src/components/dms/admin/AttrBuilder.tsx:251 – <p className="mt-1 text-xs text-red-600">{errors.attr_key.message}</p>
      - src/components/dms/admin/TemplateDesigner.tsx:315 – <p className="mt-1 text-xs text-red-600">{errors.template_name.message}</p>
      - src/components/dms/profile/ProfileForm.tsx:176 – <p className="mt-1 text-xs text-red-600">{errors.doc_type.message}</p>
      - src/components/project/ProjectLandUseLabels.tsx:230 – <span className="text-red-600 text-sm font-medium">✗ Failed to save labels</span>
      - src/components/reports/PropertySummaryView.tsx:203 – <td className="px-6 py-3 text-sm text-right font-mono text-red-600">
      - src/components/reports/PropertySummaryView.tsx:206 – <td className="px-6 py-3 text-sm text-right font-mono text-red-600">
      - src/components/sales/ParcelSalesTable.tsx:553 – ? 'text-red-600'
    - **Pattern**: `dark:text-red-400 text-red-600` (6 uses)
      - src/app/admin/dms/templates/page.tsx:184 – <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      - src/components/dms/admin/AttrBuilder.tsx:419 – <span className="text-xs text-red-600 dark:text-red-400">Required</span>
      - src/components/dms/upload/Dropzone.tsx:213 – <p className="text-lg font-medium text-red-600 dark:text-red-400">
      - src/components/dms/upload/Queue.tsx:80 – case 'failed': return 'text-red-600 dark:text-red-400';
      - src/components/dms/views/FilterDetailView.tsx:230 – <span className="text-red-600 dark:text-red-400 text-lg">📄</span>
      - src/components/dms/views/FilterDetailView.tsx:266 – <span className="text-red-600 dark:text-red-400 text-lg flex-shrink-0">📄</span>
    - **Pattern**: `bg-red-50 border-red-200 text-red-600` (1 uses)
      - src/components/sales/SaleDetailForm.tsx:318 – <div className="mt-4 p-2 bg-red-50 border border-red-200 text-sm text-red-600 rounded">
    - **Pattern**: `bg-red-50 dark:bg-red-900/20 dark:text-red-400 text-red-600` (1 uses)
      - src/components/dms/upload/Queue.tsx:164 – <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-2">
    - **Pattern**: `bg-red-50 text-red-600` (1 uses)
      - src/components/projects/contacts/AddContactModal.tsx:109 – <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
    - **Pattern**: `dark:hover:bg-gray-800 dark:text-red-400 hover:bg-gray-50 text-red-600` (1 uses)
      - src/components/dms/views/FilterDetailView.tsx:358 – <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors">
    - **Pattern**: `dark:hover:text-red-300 dark:text-red-400 hover:text-red-800 text-red-600` (1 uses)
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:192 – className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
    - **Pattern**: `hover:bg-red-50 hover:text-red-700 text-red-600` (1 uses)
      - src/components/projects/contacts/ContactCard.tsx:167 – className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
- **Info text (blue-500)**:
    - **Pattern**: `text-blue-500` (4 uses)
      - src/app/components/NewProject/PropertyTypeStep.tsx:94 – className="w-5 h-5 text-blue-500 flex-shrink-0"
      - src/app/components/NewProject/TemplateStep.tsx:162 – className="w-6 h-6 text-blue-500 flex-shrink-0"
      - src/app/components/Setup/ProjectStructureChoice.tsx:90 – <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      - src/components/benchmarks/BenchmarkAccordion.tsx:998 – {!isBuiltIn && <span className="ml-2 text-xs text-blue-500 font-semibold">u</span>}
    - **Pattern**: `dark:hover:text-blue-300 dark:text-blue-400 hover:text-blue-700 text-blue-500` (1 uses)
      - src/components/dms/admin/AttrBuilder.tsx:459 – className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    - **Pattern**: `dark:text-blue-400 text-blue-500` (1 uses)
      - src/app/components/NewProject/TemplateStep.tsx:152 – ? 'text-blue-500 dark:text-blue-400'
- **Info text (blue-600)**:
    - **Pattern**: `text-blue-600` (15 uses)
      - src/app/ai-document-review/page.tsx:55 – className="text-blue-600"
      - src/app/components/AI/DocumentReview.tsx:255 – <span className="text-blue-600">✏ {stats.edited} edited</span>
      - src/app/components/AI/DocumentReview.tsx:425 – case 'edited': return <span className="text-blue-600">✏</span>
      - src/app/components/GIS/AssessorDataMapping.tsx:243 – className="text-blue-600"
      - src/app/components/OpExHierarchy.tsx:271 – <div className="text-xl font-semibold text-blue-600">{data.summary.leaf_account_count}</div>
      - src/app/documents/review/page.tsx:886 – <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
      - src/app/projects/[projectId]/assumptions/page.tsx:228 – {isSaving && <span className="text-blue-600">Saving...</span>}
      - src/app/properties/[id]/analysis/components/SensitivityTab.tsx:265 – <div className="text-xs text-blue-600">{result.baseline_irr.toFixed(2)}% IRR</div>
      - src/app/properties/[id]/analysis/components/TabNavigation.tsx:101 – <div className="flex items-center gap-2 text-sm text-blue-600">
      - src/components/dms/DMSView.tsx:307 – <button className="text-blue-600 hover:underline">Home</button>
      - src/components/dms/DMSView.tsx:309 – <button className="text-blue-600 hover:underline">Projects</button>
      - src/components/dms/DMSView.tsx:320 – <button className="text-blue-600">🔻</button>
      - src/components/projects/contacts/ContactCard.tsx:189 – className="text-blue-600 hover:underline"
      - src/components/sales/ParcelSalesTable.tsx:665 – className="text-xs text-blue-600"
      - src/components/sales/SaleDetailForm.tsx:110 – {salePhase?.phase_code && <span className="text-blue-600">• Phase {salePhase.phase_code}</span>}
    - **Pattern**: `dark:text-blue-400 text-blue-600` (12 uses)
      - src/app/components/NewProject/PropertyTypeStep.tsx:108 – ? 'text-blue-600 dark:text-blue-400'
      - src/app/components/NewProject/TemplateStep.tsx:142 – ? 'text-blue-600 dark:text-blue-400'
      - src/app/dms/page.tsx:307 – <button className="text-blue-600 dark:text-blue-400 hover:underline">Home</button>
      - src/app/dms/page.tsx:309 – <button className="text-blue-600 dark:text-blue-400 hover:underline">Projects</button>
      - src/app/dms/page.tsx:320 – <button className="text-blue-600 dark:text-blue-400">🔻</button>
      - src/components/dms/profile/VersionTimeline.tsx:260 – <div className="text-xs text-blue-600 dark:text-blue-400">
      - src/components/dms/upload/Queue.tsx:77 – case 'uploading': return 'text-blue-600 dark:text-blue-400';
      - src/components/dms/views/FilterDetailView.tsx:86 – className="text-blue-600 dark:text-blue-400 hover:underline"
      - src/components/dms/views/FilterDetailView.tsx:93 – className="text-blue-600 dark:text-blue-400 hover:underline"
      - src/components/dms/views/FilterDetailView.tsx:108 – <CIcon icon={cilFilterSquare} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      - src/components/dms/views/FilterDetailView.tsx:128 – <button className="text-blue-600 dark:text-blue-400">🔻</button>
      - src/components/dms/views/FilterDetailView.tsx:133 – <button className="text-blue-600 dark:text-blue-400 hover:underline">
    - **Pattern**: `bg-gray-800 border-gray-600 focus:ring-blue-500 text-blue-600` (10 uses)
      - src/app/prototypes/multifam/rent-roll-inputs/components/DebtFacilityForm.tsx:214 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx:401 – className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/DrawScheduleForm.tsx:414 – className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx:376 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx:522 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx:550 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/EquityPartnerForm.tsx:564 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx:162 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx:222 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
      - src/app/prototypes/multifam/rent-roll-inputs/components/WaterfallTierForm.tsx:238 – className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-800 text-blue-600` (7 uses)
      - src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:1039 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
      - src/app/prototypes/multifam/rent-roll-inputs/content/page.tsx:952 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1038 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1074 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1110 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1146 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
      - src/app/prototypes/multifam/rent-roll-inputs/page.tsx:1182 – className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 flex-shrink-0"
    - **Pattern**: `bg-gray-600 border-gray-500 focus:ring-blue-500 text-blue-600` (5 uses)
      - src/app/components/GIS/PropertyPackageUpload.tsx:132 – className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:161 – className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:186 – className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:203 – className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
      - src/app/components/GIS/PropertyPackageUpload.tsx:224 – className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 focus:ring-blue-500"
    - **Pattern**: `dark:hover:text-blue-300 dark:text-blue-400 hover:text-blue-700 text-blue-600` (5 uses)
      - src/components/dms/search/Facets.tsx:109 – className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
      - src/components/dms/search/Facets.tsx:193 – className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 py-2 text-center font-medium"
      - src/components/dms/search/ResultsTable.tsx:365 – className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      - src/components/dms/upload/Queue.tsx:101 – className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      - src/components/dms/upload/Queue.tsx:174 – className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    - **Pattern**: `bg-blue-100 text-blue-600` (4 uses)
      - src/app/ai-document-review/page.tsx:79 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
      - src/app/ai-document-review/page.tsx:89 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
      - src/app/ai-document-review/page.tsx:99 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
      - src/app/ai-document-review/page.tsx:109 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
    - **Pattern**: `bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 text-blue-600` (3 uses)
      - src/components/dms/admin/AttrBuilder.tsx:415 – <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
      - src/components/dms/admin/TemplateDesigner.tsx:389 – <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
      - src/components/dms/admin/TemplateDesigner.tsx:444 – <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
    - **Pattern**: `border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 text-blue-600` (3 uses)
      - src/components/dms/admin/AttrBuilder.tsx:343 – className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
      - src/components/dms/admin/AttrBuilder.tsx:352 – className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
      - src/components/dms/admin/TemplateDesigner.tsx:354 – className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
    - **Pattern**: `dark:hover:text-blue-300 dark:text-blue-400 hover:text-blue-800 text-blue-600` (3 uses)
      - src/app/components/PlanningWizard/ContainerTreeView.tsx:273 – className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:202 – className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:223 – className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    - **Pattern**: `border-blue-500 dark:text-blue-400 text-blue-600` (2 uses)
      - src/app/dms/page.tsx:268 – ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      - src/app/dms/page.tsx:284 – ? 'border-blue-500 text-blue-600 dark:text-blue-400'
    - **Pattern**: `hover:bg-blue-50 hover:text-blue-700 text-blue-600` (2 uses)
      - src/components/projects/contacts/ContactCard.tsx:160 – className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
      - src/components/sales/PricingTable.tsx:584 – className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-50 flex items-center gap-1"
    - **Pattern**: `bg-blue-50 border-blue-500 border-gray-300 text-blue-600 text-gray-700` (1 uses)
      - src/components/sales/ParcelSalesTable.tsx:576 – hasOverrides ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700'
    - **Pattern**: `bg-blue-900 border-blue-600 text-blue-600` (1 uses)
      - src/app/properties/[id]/analysis/components/TabNavigation.tsx:29 – return \`${baseStyle} border-blue-600 text-blue-600 bg-blue-900\`;
    - **Pattern**: `bg-gray-100 border-gray-300 text-blue-600` (1 uses)
      - src/components/budget/custom/ColumnChooser.tsx:77 – className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded cursor-not-allowed"
    - **Pattern**: `bg-gray-700 border-gray-500 focus:ring-blue-500 text-blue-600` (1 uses)
      - src/app/prototypes/multifam/rent-roll-inputs/components/NestedExpenseTable.tsx:283 – className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"
    - **Pattern**: `bg-gray-700 border-gray-600 focus:ring-blue-500 text-blue-600` (1 uses)
      - src/app/prototypes/multifam/rent-roll-inputs/components/ConfigureColumnsModal.tsx:70 – className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
    - **Pattern**: `bg-gray-700 border-gray-600 text-blue-600` (1 uses)
      - src/app/prototypes/multifam/rent-roll-inputs/components/DetailedBreakdownTable.tsx:173 – className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
    - **Pattern**: `bg-surface-card border-slate-400 focus:ring-brand-primary/40 text-blue-600` (1 uses)
      - src/components/benchmarks/unit-costs/UnitCostsPanel.tsx:1683 – 'h-4 w-4 rounded border border-slate-400 bg-surface-card text-blue-600 focus:ring-brand-primary/40',
    - **Pattern**: `bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 text-blue-600` (1 uses)
      - src/components/budget/custom/ColumnChooser.tsx:116 – className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
    - **Pattern**: `bg-white text-blue-600` (1 uses)
      - src/components/shared/ModeToggle.tsx:56 – : 'bg-white text-blue-600 shadow-sm';
    - **Pattern**: `border-gray-300 dark:border-gray-600 focus:ring-blue-500 text-blue-600` (1 uses)
      - src/components/dms/search/Facets.tsx:76 – className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded mr-2 flex-shrink-0"
    - **Pattern**: `border-gray-300 focus:ring-blue-500 text-blue-600` (1 uses)
      - src/components/dms/admin/TemplateDesigner.tsx:455 – className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
    - **Pattern**: `border-gray-300 text-blue-600` (1 uses)
      - src/components/dms/admin/TemplateDesigner.tsx:214 – className="h-4 w-4 text-blue-600 border-gray-300 rounded"
    - **Pattern**: `dark:hover:text-blue-200 dark:text-blue-400 hover:text-blue-800 text-blue-600` (1 uses)
      - src/components/dms/search/Facets.tsx:132 – className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
    - **Pattern**: `dark:hover:text-blue-300 dark:text-blue-400 hover:text-blue-500 text-blue-600` (1 uses)
      - src/components/dms/profile/VersionTimeline.tsx:213 – className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
    - **Pattern**: `dark:text-blue-400 dark:text-gray-100 text-blue-600 text-gray-900` (1 uses)
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:267 – <span className={\`flex-1 text-xs ${isReadonly ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}\`}>
    - **Pattern**: `hover:text-blue-800 text-blue-600` (1 uses)
      - src/app/properties/[id]/analysis/components/RentRollTab.tsx:288 – className="text-blue-600 hover:text-blue-800"

### Background Colors
- **Success bg (green-100 chip + dark)**:
    - **Pattern**: `bg-green-100 dark:bg-green-900/20 dark:text-green-400 text-green-700` (1 uses)
      - src/components/dms/search/ResultsTable.tsx:162 – case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    - **Pattern**: `bg-green-100 dark:bg-green-900/20 dark:text-green-400 text-green-800` (1 uses)
      - src/components/dms/search/ResultsTable.tsx:146 – case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
- **Success bg (green-50 rows)**:
    - **Pattern**: `bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200 text-green-800` (1 uses)
      - src/app/components/UniversalInventory/UniversalInventoryTable.tsx:485 – ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-b border-green-200 dark:border-green-800'
- **Warning bg (yellow-50)**:
    - No matches found
- **Warning bg (amber-500 progress)**:
    - No matches found
- **Error bg (red-50/100)**:
    - **Pattern**: `bg-red-50 border-red-200 text-red-700` (6 uses)
      - src/components/IssueReporter/IssueReporterDialog.tsx:327 – <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      - src/components/sales/AnnualInventoryGauge.tsx:36 – <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
      - src/components/sales/ParcelSalesTable.tsx:625 – <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
      - src/components/sales/PhaseTiles.tsx:113 – <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
      - src/components/sales/PricingTable.tsx:478 – <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
      - src/components/shared/AreaTiles.tsx:68 – <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
    - **Pattern**: `bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800` (4 uses)
      - src/app/components/PlanningWizard/AddContainerModal.tsx:160 – <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:337 – <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      - src/app/components/UniversalInventory/UniversalInventoryTable.tsx:418 – <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      - src/components/dms/filters/SmartFilterBuilder.tsx:147 – <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    - **Pattern**: `bg-red-50 border-red-200` (3 uses)
      - src/app/components/GIS/ProjectDocumentUploads.tsx:1155 – <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      - src/app/components/Migration/TaxonomyMigration.tsx:184 – <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      - src/app/components/Migration/TaxonomyMigration.tsx:239 – <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    - **Pattern**: `bg-red-50` (1 uses)
      - src/components/reports/PropertySummaryView.tsx:237 – <tr className="bg-red-50">
    - **Pattern**: `bg-red-50 border-red-100 text-red-700` (1 uses)
      - src/components/sales/ParcelSalesTable.tsx:644 – <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">{actionError}</div>
    - **Pattern**: `bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 text-red-800` (1 uses)
      - src/app/components/UniversalInventory/UniversalInventoryTable.tsx:486 – : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-b border-red-200 dark:border-red-800'
    - **Pattern**: `bg-red-50 border-red-200 text-red-600` (1 uses)
      - src/components/sales/SaleDetailForm.tsx:318 – <div className="mt-4 p-2 bg-red-50 border border-red-200 text-sm text-red-600 rounded">
    - **Pattern**: `bg-red-50 border-red-400 dark:bg-red-900/20` (1 uses)
      - src/components/dms/upload/Dropzone.tsx:136 – ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
    - **Pattern**: `bg-red-50 border-red-500/50 text-red-700` (1 uses)
      - src/components/benchmarks/unit-costs/UnitCostsPanel.tsx:1613 – <div className="rounded border border-red-500/50 bg-red-50 px-3 py-2 text-xs text-red-700">
    - **Pattern**: `bg-red-50 dark:bg-red-900/20 dark:text-red-400 text-red-600` (1 uses)
      - src/components/dms/upload/Queue.tsx:164 – <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-2">
    - **Pattern**: `bg-red-50 text-red-600` (1 uses)
      - src/components/projects/contacts/AddContactModal.tsx:109 – <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">
- **Error bg (red-600 solid)**:
    - **Pattern**: `bg-red-600 focus:ring-2 focus:ring-red-500 hover:bg-red-700 text-white` (9 uses)
      - src/app/components/PlanningWizard/ConfirmDeleteDialog.tsx:58 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:184 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:229 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:601 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:646 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/cards/PhaseDetailCard.tsx:161 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/AreaForm.tsx:160 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/ParcelForm.tsx:674 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      - src/app/components/PlanningWizard/forms/PhaseForm.tsx:162 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
    - **Pattern**: `bg-red-500 bg-red-600 text-white` (2 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:922 – 'Commercial': { bg: 'bg-red-600', text: 'text-white', dot: 'bg-red-500' },
      - src/app/components/Admin/LandUseInputTableTanStack.tsx:82 – 'Commercial': { bg: 'bg-red-600', text: 'text-white', dot: 'bg-red-500' },
    - **Pattern**: `bg-red-600 border-red-500 text-white` (2 uses)
      - src/app/components/LandUse/LandUseCanvas.tsx:125 – 'Commercial': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
      - src/app/components/LandUse/LandUseSchema.tsx:72 – 'Commercial': { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
    - **Pattern**: `bg-red-600 hover:bg-red-500 text-white` (2 uses)
      - src/app/components/Budget/BudgetGridDark.tsx:590 – className="inline-flex items-center justify-center w-7 h-6 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
      - src/app/components/Budget/BudgetGridDark.tsx:628 – className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
    - **Pattern**: `bg-red-600 border-red-500 hover:bg-red-700 text-white` (1 uses)
      - src/app/components/Admin/LandUseInputTable.tsx:1027 – className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 border border-red-500"
    - **Pattern**: `bg-red-600 disabled:bg-gray-400 hover:bg-red-700 text-white` (1 uses)
      - src/app/components/PlanningWizard/DraggableContainerNode.tsx:364 – className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
    - **Pattern**: `bg-red-600 hover:bg-red-700 text-white` (1 uses)
      - src/app/prototypes/multifam/rent-roll-inputs/components/MarketRatesTab.tsx:269 – <button className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-700 text-white transition-colors">
- **Info bg (blue-50)**:
    - **Pattern**: `bg-blue-50 text-blue-700` (1 uses)
      - src/app/components/AI/DocumentReview.tsx:487 – <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
- **Info bg (blue-100 tokens)**:
    - **Pattern**: `bg-blue-100 text-blue-600` (4 uses)
      - src/app/ai-document-review/page.tsx:79 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
      - src/app/ai-document-review/page.tsx:89 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
      - src/app/ai-document-review/page.tsx:99 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
      - src/app/ai-document-review/page.tsx:109 – <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
    - **Pattern**: `bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 text-blue-600` (3 uses)
      - src/components/dms/admin/AttrBuilder.tsx:415 – <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
      - src/components/dms/admin/TemplateDesigner.tsx:389 – <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
      - src/components/dms/admin/TemplateDesigner.tsx:444 – <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">

## 4. BORDERS, OUTLINES & RINGS

### Input/Form Borders
- **Default State**
  - Light Mode: `border border-input bg-transparent px-3 py-1 text-sm` from the shared Input component (`src/components/ui/input.tsx:10`) and reused by Select (`src/components/ui/select.tsx:17`) and Textarea (`src/components/ui/textarea.tsx:12`). All rely on Tailwind tokens that resolve to CSS variables (`border-input`, `bg-background`, `ring-ring`).
  - Dark Mode: same tokens pick up `[data-theme='dark']` CSS variables (`tailwind.config.js:5-28`, `src/styles/tokens.css:8-34,48-74`), but no explicit `dark:` classes appear inside the JSX, so overrides depend entirely on the token set.
- **Focus State**
  - Shared inputs use `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` (`src/components/ui/input.tsx:12`) and `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` for textarea/tabs (`src/components/ui/textarea.tsx:13`, `src/components/ui/tabs.tsx:30-47`). 
  - Legacy forms add custom borders such as `focus:outline-none focus:ring-2 focus:ring-blue-500` on Planner fields (`src/app/components/Budget/BudgetGridDark.tsx:361-420`, `src/app/components/PlanningWizard/forms/AreaForm.tsx:95-120`, `src/app/components/PlanningWizard/forms/ParcelForm.tsx:382-405`).
- **Error State**
  - Validation toggles `border-red-500` on planner inputs (`src/app/components/PlanningWizard/forms/AreaForm.tsx:95`, `src/app/components/PlanningWizard/forms/PhaseForm.tsx:97`, `src/app/components/PlanningWizard/forms/ParcelForm.tsx:382,401`) and on benchmark inline editors (`src/components/benchmarks/unit-costs/UnitCostsPanel.tsx:1802,1933`, `InlineEditableCell.tsx:152`).
  - Alerts use `border border-red-500/40 bg-red-500/10` callouts (`src/app/components/DevStatus/DevStatus.tsx:762`, `src/app/components/PlanningWizard/forms/ParcelForm.tsx:621`).
- **Disabled State**
  - Inputs fade via `disabled:bg-gray-100 disabled:cursor-not-allowed` (`src/components/dms/profile/TagInput.tsx:229`), while shadcn primitives only change opacity (`src/components/ui/input.tsx:12`). Planner CTAs mix `disabled:bg-gray-400` (`src/components/project/ProjectLandUseLabels.tsx:244`) and `disabled:bg-gray-600` (`src/app/components/LandUse/LandUsePricing/index.tsx:177`), producing inconsistent affordances.

### Button Borders
- Borderless shadcn buttons rely on `focus-visible:ring-1 focus-visible:ring-ring` (`src/components/ui/button.tsx:7`), but bespoke CTAs add explicit borders such as `border-blue-500` (`src/app/components/PlanningWizard/cards/ParcelDetailCard.tsx:587`) or `border-gray-600` (`src/app/components/Home/HomeOverview.tsx:216`).
- Outline buttons in planners use `border border-gray-600 focus:ring-gray-500` for secondary actions (`src/app/components/PlanningWizard/forms/AreaForm.tsx:125-152`), whereas data-heavy editors still mix `border border-line-strong` tokens (`src/components/benchmarks/AddBenchmarkModal.tsx:153-210`).

### Card/Container Borders
- Dark shells use `bg-gray-800 border border-gray-700 rounded-lg` plus sectional dividers (`src/app/components/PlanningWizard/forms/AreaForm.tsx:78-144`, `ParcelDetailCard.tsx:628-657`, `PhaseCanvas.tsx:82-205`). Each panel duplicates the same border classes instead of consuming a shared token.
- Light surfaces in the Benchmark UI rely on `bg-surface-card border border-line-strong` (`src/components/benchmarks/GrowthRateCategoryPanel.tsx:539`, `AddBenchmarkModal.tsx:124-331`), mixing CSS variables with explicit Tailwind neutrals in adjacent components like `src/app/ai-document-review/page.tsx:19-79` (`bg-white shadow-sm`).

### Dividers
- Tables adopt Tailwind divide utilities (`divide-y divide-gray-200`) in property analysis views (`src/app/properties/[id]/analysis/components/OperatingAssumptionsTab.tsx:123-134`, `CashFlowTab.tsx:180-194`, `SensitivityTab.tsx:244-258`). 
- Dark planners use bespoke borders (`border-t border-gray-700`) instead of `divide` (`src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:179`, `DraggableContainerNode.tsx:214`), so row separators look different between dark vs. light contexts.

### Focus Rings (Accessibility)
- Shared primitives consistently provide `focus-visible:ring` tokens (`src/components/ui/button.tsx:7`, `src/components/ui/tabs.tsx:30`), but legacy buttons (e.g., `src/app/components/LandUse/LandUseDetails.tsx:202-466`) omit any focus styling, breaking keyboard accessibility.
- Planner secondary buttons use `focus:ring-2 focus:ring-blue-500` or `focus:ring-gray-500` depending on the file (`src/app/components/GIS/ProjectDocumentUploads.tsx:1189-1205`, `ConfirmDeleteDialog.tsx:52-60`), yielding inconsistent halo colors.

### Outlines
- Most components rely on ring utilities, but legacy grids still use `focus:outline-none focus:border-blue-500` combos (`src/app/budget-grid-v2/page.tsx:28`, `src/app/components/Budget/BudgetGridDark.tsx:361-420`) that hide focus when borders share the same color as the background.
- The Select trigger keeps `focus:outline-none focus:ring-1 focus:ring-ring` (`src/components/ui/select.tsx:17`), making it the only dropdown with an offset ring; custom dropdowns such as `src/components/dms/admin/AttrBuilder.tsx:310-376` fall back to `focus:outline-none` plus border color tweaks.

### Shadows
- Cards range from `shadow-sm` (Document Review cards `src/app/ai-document-review/page.tsx:19-72`) to `shadow-2xl` drawers (`src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:115`, `ParcelDetailCard.tsx:372`) and `shadow-xl` benchmark dialogs (`src/components/benchmarks/AddBenchmarkModal.tsx:124`). Dark mode toggles also flip between `shadow-sm` and `shadow-lg` (`src/components/shared/ModeToggle.tsx:55-56`).
- Modals consistently add `shadow-lg` via shadcn dialog content (`src/components/ui/dialog.tsx:23-55`), but bespoke overlays (Document Review detail drawer `src/app/components/AI/DocumentReview.tsx:178-227`) use `shadow-2xl` plus inline styles.

## 5. BACKGROUNDS

### Container Backgrounds
- Root tokens live in `src/styles/tokens.css:8-34` (light) and `:48-74` (dark), mapping `--surface-bg`, `--surface-card`, `--surface-tile`, and text/line colors. Tailwind exports them through `tailwind.config.js:5-34` under `bg-surface-bg`, `bg-surface-card`, `bg-surface-tile`, `text-text-primary`, etc.
- Components honoring the design tokens include the Benchmark modal stack (`src/components/benchmarks/AddBenchmarkModal.tsx:124-346`, `GrowthRateCategoryPanel.tsx:66-327`) and Admin cost pages (`src/app/admin/benchmarks/cost-library/page.tsx:25-121`) where `bg-surface-card` + `border-line-strong` keep parity between modes.
- Many feature pages still hardcode neutrals: AI Document Review uses `bg-white shadow-sm` cards (`src/app/ai-document-review/page.tsx:19-119`), property prototypes rely on `bg-gray-900` shells (`src/app/budget-grid-v2/page.tsx:10-40`), and Plan Navigation uses `bg-gray-800 border-gray-700` (`src/app/components/GIS/PlanNavigation.tsx:220-232`), bypassing the shared palette.

### Hover States
- Dark tables lean on opacity overlays like `hover:bg-gray-700/50` (`src/app/components/Budget/BudgetGridDark.tsx:539`), while cards use `hover:bg-surface-card/80` tokens (`src/components/benchmarks/GrowthRateCategoryPanel.tsx:327`). 
- Filter chips reuse `hover:bg-gray-600` (`src/app/projects/[projectId]/components/tabs/PropertyTab.tsx:732-1069`) and `hover:bg-blue-500` (`src/app/components/DevStatus/DevStatus.tsx:1011`), but there is no standard hover palette for neutral vs. semantic chips.

### Modal / Overlay Backgrounds
- shadcn Dialog overlay applies `bg-black/80` (`src/components/ui/dialog.tsx:12-32`), while Document Review overlays mix `bg-black bg-opacity-50` (`src/app/components/AI/DocumentReview.tsx:178-229`) and GIS modals use MUI `<Box>` backgrounds referencing `var(--surface-bg)` (`src/app/components/GIS/ProjectDocumentUploads.tsx:139`).

## 6. SPECIAL COMPONENTS

### Navigation Elements
- GIS plan navigation cards use `bg-gray-800 border border-gray-700 rounded-lg p-2 text-white hover:bg-gray-700 shadow-lg` with no dark tokens (`src/app/components/GIS/PlanNavigation.tsx:220-232`). 
- Market tabs rely on Radix `TabsPrimitive.Trigger` with `bg-gray-800 data-[state=active]:bg-blue-600 data-[state=active]:text-white` but lack matching `dark:` rules (`src/app/market/page.tsx:517-523`).

### Dropdown/Select Elements
- The shared Select trigger uses `border-input bg-transparent focus:ring-ring` (`src/components/ui/select.tsx:14-23`), while menu items highlight via `focus:bg-accent focus:text-accent-foreground` (`src/components/ui/select.tsx:64-90`). No dark overrides exist beyond the CSS token definitions.
- Older dropdowns such as Attribute Builder chips employ manual palettes (`bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`) but still lack consistent hover/focus states (`src/components/dms/admin/AttrBuilder.tsx:310-430`).

### Modal/Dialog Elements
- shadcn dialog overlay/content pattern: `bg-black/80` overlay plus `bg-background` content with `shadow-lg` and focusable close button (`src/components/ui/dialog.tsx:12-55`). 
- Custom drawers (Planning wizard detail panes) use `bg-gray-800 border border-gray-700 shadow-2xl` for containers and add CTA bars with `border-t border-gray-700` (`src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:115-212`, `ParcelDetailCard.tsx:372-629`).
- AI Document Reviewer overlays rely on `fixed inset-0 bg-black bg-opacity-50` + `bg-white rounded-lg shadow-xl` content (`src/app/components/AI/DocumentReview.tsx:178-229`), causing strong contrast differences versus token-based modals.

## 7. INCONSISTENCIES DETECTED

- **Primary button palette drift** – three different disabled treatments (`disabled:bg-gray-400` at `src/components/project/ProjectLandUseLabels.tsx:244`, `disabled:bg-gray-600` at `src/app/components/LandUse/LandUseMatchWizard.tsx:351`, `disabled:bg-blue-900` at `src/app/market/page.tsx:711`) and two hover shades (`hover:bg-blue-700` vs `hover:bg-blue-500`). None of these inject `dark:` variants, so contrast collapses on dark backgrounds (`PlanningWizard` drawers `src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:179`).
- **Secondary buttons use different semantics** – some display `text-gray-300` (GIS uploads `src/app/components/GIS/ProjectDocumentUploads.tsx:1189`) while others flip to `text-white` (Glossary admin `src/app/components/Glossary/ZoningGlossaryAdmin.tsx:230`), so the same gray background conveys different hierarchy cues.
- **Status chips lack dark strategy** – Planner chips rely on `bg-green-900` / `bg-yellow-900` while DevStatus uses pastel `bg-green-100` tokens without `dark:` overrides (`src/app/components/DevStatus/DevStatus.tsx:279-281`). DocumentReview warning chips keep `bg-yellow-50 text-yellow-800` (`src/app/components/AI/DocumentReview.tsx:563-574`), which fail contrast on dark surfaces.
- **Inline hex colors** – Area tiles bake `#0d6efd`, `#424242`, and `color` props directly into inline styles (`src/components/shared/AreaTiles.tsx:84-144`), bypassing tokens and clashing with theme switching.
- **Mixed border vs. ring focus treatment** – Legacy forms rely on `focus:border-blue-500` (`src/app/budget-grid-v2/page.tsx:28`) whereas shadcn primitives standardize on `focus-visible:ring-ring` (`src/components/ui/input.tsx:12`). Users experience different focus affordances between modules.
- **Shadows inconsistent across cards** – Document Review cards use `shadow-sm` (`src/app/ai-document-review/page.tsx:19-79`), Planning drawers use `shadow-2xl` (`src/app/components/PlanningWizard/cards/AreaDetailCard.tsx:115`), and benchmark modals use `shadow-xl` (`src/components/benchmarks/AddBenchmarkModal.tsx:124`). No guidance ties depth to interaction state.
- **Dark mode gaps** – Entire AI Document Review experience is hard-coded to `bg-white`/`text-gray-800` (`src/app/ai-document-review/page.tsx:16-119`) and lacks `dark:` toggles. Primary action buttons, chips, and alerts rarely include `dark:` classes, so switching themes depends solely on CSS variables that many components ignore.
- **Focus indicators missing** – Buttons within `src/app/components/LandUse/LandUseDetails.tsx:202-466` and `src/app/components/sales/ParcelSalesTable.tsx:355` use only hover colors. Keyboard users get no visible focus because no `focus-*` classes exist.

## 8. RECOMMENDATIONS

1. **Consolidate button variants** – Move all primary/secondary/danger CTAs onto the shadcn `buttonVariants` tokens so every usage inherits `focus-visible:ring`, consistent disabled colors, and theme-aware palettes. Create CSS custom properties for `--btn-primary` and port modules like AI Document Review (`src/app/ai-document-review/page.tsx:65`) and Planning Wizard (`src/app/components/PlanningWizard/PlanningWizard.tsx:495`) to them.
2. **Adopt the existing token palette broadly** – Replace hard-coded neutrals (`bg-white`, `bg-gray-900`, inline hexes in `AreaTiles`) with `bg-surface-*`, `text-text-*`, and `border-line-*` utilities defined in `tailwind.config.js`. This keeps light/dark colors in sync with `src/styles/tokens.css`.
3. **Fill missing chip patterns** – Define reusable status chips (complete/partial/error/default) that expose both light and dark palettes, and convert existing implementations (`LandUseInputTable.tsx:836-877`, `DevStatus.tsx:279-281`, `DocumentReview.tsx:563-593`) to use them.
4. **Clarify dark-mode strategy** – The app mixes CSS variables and `dark:` utilities. Document that `[data-theme='dark']` controls global tokens (per `tailwind.config.js:31`), and prohibit standalone `bg-white` usages unless wrapped in a token. Provide lint rules or codemod to replace raw Tailwind neutrals in scoped components.
5. **Prioritize dark coverage gaps** – High-traffic views lacking dark variants: AI Document Review (entire page), Planning Wizard buttons/dividers, DocumentReview chips, and GIS upload cards. Add `dark:` classes or migrate to token utilities to restore contrast.
6. **Address contrast issues** – `bg-yellow-900 text-yellow-300` chips and `bg-blue-600 text-blue-100` pills are marginal on dark surfaces. Validate against WCAG and adjust to higher-luminance combos (e.g., lighten backgrounds, darken text) before shipping the design system.
7. **Standardize border vs. ring usage** – Publish guidance to use `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` for all interactive elements, and reserve `border-*` only for semantic outlines. Update planner forms and budget grids to align.
8. **Shadow hierarchy** – Define depth tokens (e.g., card = `shadow-sm`, modal = `shadow-xl`, drawer = `shadow-2xl`, fab = `shadow-lg`). Update `ModeToggle`, DocumentReview cards, and Planning drawers to reduce arbitrarily large shadows in dark mode.
9. **Priority fixes**
   - *Critical*: Add keyboard focus styles to Land Use / Sales buttons and convert inline hex chips to tokenized colors (`src/components/shared/AreaTiles.tsx:84-144`).
   - *High*: Normalize primary/secondary button palettes (including disabled states) and add dark equivalents.
   - *Medium*: Align chip/background tokens and remove `bg-white` from AI Document Review cards.
   - *Low*: Tune shadow depths and border widths for visual consistency.

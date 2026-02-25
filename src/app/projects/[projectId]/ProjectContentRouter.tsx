/**
 * ProjectContentRouter Component
 *
 * Routes folder/tab combinations to the appropriate content components.
 * Subtab structure matches the INTERNAL navigation of main branch components:
 *
 * Property (Income): design, market, rent-roll → PropertyTab (controlled by activeTab)
 * Operations (Income): Single unified P&L page (no subtabs) → OperationsTab
 * Valuation (Income): sales-comparison, cost, income → ValuationTab (has internal tabs)
 *
 * @version 2.3
 * @created 2026-01-23
 * @updated 2026-02-08 - Renamed from StudioContent to ProjectContentRouter
 */

'use client';

import React, { memo, Suspense } from 'react';

// Import existing tab components
import ProjectTab from './components/tabs/ProjectTab';
import PropertyTab from './components/tabs/PropertyTab';
import PlanningTab from './components/tabs/PlanningTab';
import MarketTab from './components/tabs/MarketTab';
import BudgetTab from './components/tabs/BudgetTab';
import OperationsTab from './components/tabs/OperationsTab';
import SalesTab from './components/tabs/SalesTab';
import FeasibilityTab from './components/tabs/FeasibilityTab';
import ValuationTab from './components/tabs/ValuationTab';
import ReportsTab from './components/tabs/ReportsTab';
import DocumentsTab from './components/tabs/DocumentsTab';
import CapitalizationTab from './components/tabs/CapitalizationTab';
import AcquisitionSubTab from './components/tabs/AcquisitionSubTab';
// RenovationSubTab: removed from Property sub-tabs, will be integrated into Operations (layout TBD)
// import RenovationSubTab from './components/tabs/RenovationSubTab';
import LocationSubTab from './components/tabs/LocationSubTab';
import MarketSupplySubTab from './components/tabs/MarketSupplySubTab';
import { MapTab } from '@/components/map-tab';
import { ICPage } from '@/components/ic/ICPage';
import { isIncomeProperty } from '@/components/projects/tiles/tileConfig';
import IntelligenceTab from '@/components/intelligence/IntelligenceTab';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
  analysis_type?: string;
  value_add_enabled?: boolean;
  [key: string]: unknown;
}

interface ProjectContentRouterProps {
  project: Project;
  currentFolder: string;
  currentTab: string;
  setFolderTab: (folder: string, tab?: string) => void;
}

/**
 * Placeholder component for content not yet implemented
 */
function ComingSoon({
  folder,
  tab,
  icon = '🚧',
}: {
  folder: string;
  tab: string;
  icon?: string;
}) {
  const folderLabel = folder.charAt(0).toUpperCase() + folder.slice(1);
  const tabLabel = tab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="folder-content-placeholder">
      <div className="folder-content-placeholder-icon">{icon}</div>
      <h2>
        {folderLabel}: {tabLabel}
      </h2>
      <p>This section is coming soon.</p>
    </div>
  );
}

/**
 * Loading fallback for Suspense boundaries
 */
function ContentLoading() {
  return (
    <div
      className="text-center py-20"
      style={{ color: 'var(--cui-secondary-color)' }}
    >
      <div
        className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-4"
        style={{ borderColor: 'var(--cui-primary)' }}
      />
      <p>Loading content...</p>
    </div>
  );
}

/**
 * Main content router - maps folder/tab to appropriate component
 * Subtabs MUST match main branch tileConfig.ts EXACTLY
 */
function ProjectContentRouter({
  project,
  currentFolder,
  currentTab,
  setFolderTab,
}: ProjectContentRouterProps) {
  // Route based on folder and tab combination
  const renderContent = () => {
    switch (currentFolder) {
      // ========================================
      // FOLDER 1: HOME (Project Home)
      // Main branch: NO subtabs - just shows ProjectTab
      // ========================================
      case 'home':
        return <ProjectTab project={project} />;

      // ========================================
      // FOLDER 2: PROPERTY
      // Income: location, market-supply, property-details, rent-roll, acquisition
      // Land: market, land-use, parcels, acquisition
      // Funnel: Macro Economy → Local Economy → Property Location → Attributes
      // ========================================
      case 'property': {
        // Determine if this is an income property using the same logic as folderTabConfig
        // project_type_code ('RET', 'MF') is the canonical field for category routing
        const effectiveProjectType = project.project_type_code
          || project.project_type
          || project.property_subtype;
        const isIncome = isIncomeProperty(effectiveProjectType);

        switch (currentTab) {
          // Location sub-tab - economic indicators + AI analysis (income)
          case 'location':
            return <LocationSubTab project={project} />;
          // Market Supply/Demand sub-tab - property-type supply/demand overview (income)
          case 'market-supply':
            return <MarketSupplySubTab project={project} />;
          // Property Details (formerly "details") - income properties
          case 'property-details':
            return <PropertyTab project={project} activeTab="details" />;
          // Rent Roll - income properties
          case 'rent-roll':
            return <PropertyTab project={project} activeTab="rent-roll" />;
          // Acquisition sub-tab - ALL project types
          case 'acquisition':
            return <AcquisitionSubTab project={project} />;
          // Market tab - Land Dev only now (competitive housing research)
          case 'market':
            return <MarketTab project={project} />;
          // Land development subtabs
          case 'land-use':
            return <PlanningTab project={project} />;
          case 'parcels':
            return <ComingSoon folder="property" tab="parcels" icon="🗺️" />;
          default:
            // Default based on project type
            if (!isIncome) {
              return <PlanningTab project={project} />;
            }
            return <LocationSubTab project={project} />;
        }
      }

      // ========================================
      // FOLDER 3a: BUDGET (Land Development)
      // Subtabs: budget, schedule, sales, draws
      // ========================================
      case 'budget':
        switch (currentTab) {
          case 'budget':
            return <BudgetTab project={project} />;
          case 'schedule':
            return <ComingSoon folder="budget" tab="schedule" icon="📅" />;
          case 'sales':
            return <SalesTab project={project} />;
          case 'draws':
            return <ComingSoon folder="budget" tab="draws" icon="💵" />;
          default:
            return <BudgetTab project={project} />;
        }

      // ========================================
      // FOLDER 3b: OPERATIONS (Income Property)
      // Single unified P&L page - no subtabs
      // Shows Operating Income, Expenses, and NOI in one view
      // ========================================
      case 'operations':
        return <OperationsTab project={project} mode="standard" />;

      // ========================================
      // FOLDER 4a: FEASIBILITY (Land Development)
      // Subtabs: feasibility, cashflow, returns, sensitivity
      // ========================================
      case 'feasibility':
        return <FeasibilityTab project={project} activeTab={currentTab} />;

      // ========================================
      // FOLDER 4b: VALUATION (Income Property)
      // Subtabs: sales-comparison, cost, income (matches ValuationTab's internal tabs)
      // ValuationTab has internal tab navigation for the 3 valuation approaches
      // ========================================
      case 'valuation':
        // Market Comps relocated from Property → Valuation/Income Approach
        if (currentTab === 'market-comps') {
          return <PropertyTab project={project} activeTab="market" />;
        }
        // All other subtabs route to ValuationTab - it has internal tab navigation
        return <ValuationTab project={project} activeTab={currentTab} />;

      // ========================================
      // FOLDER 5: CAPITAL (Capitalization)
      // Subtabs: equity, debt
      // ========================================
      case 'capital':
        switch (currentTab) {
          case 'equity':
            return (
              <CapitalizationTab
                project={project}
                activeSubTab={currentTab}
                setFolderTab={setFolderTab}
              />
            );
          case 'debt':
            return (
              <CapitalizationTab
                project={project}
                activeSubTab={currentTab}
                setFolderTab={setFolderTab}
              />
            );
          default:
            return (
              <CapitalizationTab
                project={project}
                activeSubTab={currentTab}
                setFolderTab={setFolderTab}
              />
            );
        }

      // ========================================
      // FOLDER 6: REPORTS
      // Subtabs: summary, export
      // ========================================
      case 'reports':
        switch (currentTab) {
          case 'summary':
            return <ReportsTab project={project} />;
          case 'export':
            return <ComingSoon folder="reports" tab="export" icon="📤" />;
          case 'investment_committee':
            return (
              <ICPage
                projectId={project.project_id}
                projectName={project.project_name}
              />
            );
          default:
            return <ReportsTab project={project} />;
        }

      // ========================================
      // FOLDER 7: DOCUMENTS
      // Subtabs: all, extractions (Intelligence)
      // ========================================
      case 'documents':
        switch (currentTab) {
          case 'all':
            return <DocumentsTab project={project} />;
          case 'extractions':
            return <IntelligenceTab project={project} />;
          default:
            return <DocumentsTab project={project} />;
        }

      // ========================================
      // FOLDER 8: MAP
      // Unified spatial hub - no subtabs
      // ========================================
      case 'map':
        return <MapTab project={project} />;

      // ========================================
      // DEFAULT FALLBACK
      // ========================================
      default:
        return (
          <div className="folder-content-placeholder">
            <div className="folder-content-placeholder-icon">❓</div>
            <h2>Unknown Section</h2>
            <p>
              Folder: {currentFolder}, Tab: {currentTab}
            </p>
          </div>
        );
    }
  };

  return (
    <Suspense fallback={<ContentLoading />}>
      {renderContent()}
    </Suspense>
  );
}

export default memo(ProjectContentRouter);

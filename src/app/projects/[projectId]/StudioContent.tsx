/**
 * StudioContent Component
 *
 * Routes folder/tab combinations to the appropriate content components.
 * Subtab structure matches the INTERNAL navigation of main branch components:
 *
 * Property (Income): design, market, rent-roll → PropertyTab (controlled by activeTab)
 * Operations (Income): Single unified P&L page (no subtabs) → OperationsTab
 * Valuation (Income): sales-comparison, cost, income → ValuationTab (has internal tabs)
 *
 * @version 2.2
 * @created 2026-01-23
 * @updated 2026-01-23 - Fixed to match main branch COMPONENT internal navigation
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
import RenovationSubTab from './components/tabs/RenovationSubTab';
import { MapTab } from '@/components/map-tab';
import { isIncomeProperty } from '@/components/projects/tiles/tileConfig';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  project_type?: string;
  property_subtype?: string;
  analysis_type?: string;
  [key: string]: unknown;
}

interface StudioContentProps {
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
function StudioContent({
  project,
  currentFolder,
  currentTab,
  setFolderTab,
}: StudioContentProps) {
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
      // Land: market, land-use, parcels, acquisition
      // Income: details, acquisition, market, rent-roll, renovation (VALUE_ADD only)
      // PropertyTab has working content with controlled activeTab prop
      // ========================================
      case 'property': {
        // Determine if this is an income property using the same logic as folderTabConfig
        const effectiveProjectType = project.property_subtype
          || project.project_type
          || project.project_type_code;
        const isIncome = isIncomeProperty(effectiveProjectType);

        switch (currentTab) {
          // Acquisition sub-tab - ALL project types
          case 'acquisition':
            return <AcquisitionSubTab project={project} />;
          // Renovation sub-tab - VALUE_ADD analysis type only
          case 'renovation':
            return <RenovationSubTab project={project} />;
          // Market tab - uses MarketTab which handles both project types
          // Land Dev: Competitive housing research (Redfin, Zonda), SFD pricing, market map
          // Income/CRE: Rental comps, floor plans, market assumptions (via PropertyTab)
          case 'market':
            return <MarketTab project={project} />;
          // Income property subtabs - pass activeTab to PropertyTab (controlled component)
          case 'details':
          case 'rent-roll':
            return <PropertyTab project={project} activeTab={currentTab} />;
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
            return <PropertyTab project={project} activeTab="details" />;
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
        // All subtabs route to ValuationTab - it has internal tab navigation
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
          default:
            return <ReportsTab project={project} />;
        }

      // ========================================
      // FOLDER 7: DOCUMENTS
      // Subtabs: all, extractions
      // ========================================
      case 'documents':
        switch (currentTab) {
          case 'all':
            return <DocumentsTab project={project} />;
          case 'extractions':
            return <ComingSoon folder="documents" tab="extractions" icon="📄" />;
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

export default memo(StudioContent);

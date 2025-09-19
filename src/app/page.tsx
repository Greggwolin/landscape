// app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import BudgetContent from './components/Budget/BudgetContent';
import MarketAssumptions from './components/MarketAssumptions';
import PlanningContent from './components/Planning/PlanningContent';
import PlanningContentGrid from './components/Archive/PlanningContentGrid';
import PlanningContentHot from './components/Archive/PlanningContentHot';
import PlanningWizard from './components/PlanningWizard/PlanningWizard';
import CategoryTree from './components/Admin/CategoryTree';
import LandUseSchema from './components/LandUse/LandUseSchema';
import ZoningGlossaryAdmin from './components/Glossary/ZoningGlossaryAdmin';
import DevStatus from './components/DevStatus/DevStatus';
import { ProjectProvider, useProjectContext } from './components/ProjectProvider';
import DocumentManagement from './components/Documents/DocumentManagement';
import HomeOverview from './components/Home/HomeOverview';
import GrowthRatesManager from './components/GrowthRatesManager';

const LandscapeAppInner: React.FC = () => {
  const [activeView, setActiveView] = useState('home');
  const { activeProject, isLoading, error } = useProjectContext();

  // Listen for cross-component navigation requests (e.g., open Planning from Overview)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ view?: string }>
      const v = ce?.detail?.view
      if (typeof v === 'string') setActiveView(v)
    }
    window.addEventListener('navigateToView', handler as EventListener)
    return () => window.removeEventListener('navigateToView', handler as EventListener)
  }, [])

  const renderContent = () => {
    switch (activeView) {
      case 'home':
      case 'dashboard':
        return <DashboardContent />;

      case 'planning-overview':
        return <PlanningContent projectId={activeProject?.project_id ?? null} />;
      case 'planning-overview-grid':
        return <PlanningContentGrid projectId={activeProject?.project_id ?? null} />;
      case 'planning-overview-hot':
        return <PlanningContentHot projectId={activeProject?.project_id ?? null} />;
      case 'planning-inline':
        return <PlanningWizard />;
      case 'planning':
        return <PlanningWizard />;
      case 'land-use':
        return <LandUseSchema />;
      case 'documents':
        return <DocumentManagement projectId={activeProject?.project_id ?? null} />;
      case 'mapping-gis':
        return <ComingSoonContent title="Mapping / GIS" />;

      case 'acquisition':
        return <ComingSoonContent title="Acquisition" />;
      case 'market':
        return <MarketAssumptions projectId={activeProject?.project_id ?? null} />;
      case 'project-costs':
        return <BudgetContent projectId={activeProject?.project_id ?? null} />;
      case 'project-revenues':
        return <ComingSoonContent title="Project Revenues" />;
      case 'growth-rates':
        return <GrowthRatesContent projectId={activeProject?.project_id ?? null} />;

      case 'entitlements':
        return <ComingSoonContent title="Stage 1 - Entitlements" />;
      case 'engineering':
        return <ComingSoonContent title="Stage 2 - Engineering" />;
      case 'development':
        return <ComingSoonContent title="Stage 3 - Development" />;
      case 'disposition':
        return <ComingSoonContent title="Project Disposition" />;

      case 'debt':
        return <ComingSoonContent title="Debt" />;
      case 'equity':
        return <ComingSoonContent title="Equity" />;
      case 'muni-district':
        return <ComingSoonContent title="Muni / District" />;

      case 'settings':
        return <CategoryTree />;
      case 'zoning-glossary':
        return <ZoningGlossaryAdmin />;
      case 'dev-status':
        return <DevStatus />;

      default:
        return <ComingSoonContent title={activeView.charAt(0).toUpperCase() + activeView.slice(1)} />;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">Error loading projects: {error.message}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Navigation activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 overflow-visible bg-gray-950">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const LandscapeApp: React.FC = () => {
  return (
    <ProjectProvider>
      <LandscapeAppInner />
    </ProjectProvider>
  );
};

// Dashboard Content (formerly Overview)
const DashboardContent: React.FC = () => (
  <div className="p-4">
    <HomeOverview />
  </div>
);

// Reusable Coming Soon Component
const ComingSoonContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4">
    <div className="bg-gray-800 rounded border border-gray-700 p-6 text-center">
      <div className="text-gray-400 mb-1 text-sm">Coming Soon</div>
      <div className="text-lg font-medium text-white">{title}</div>
    </div>
  </div>
);

// Growth Rates Content Component
const GrowthRatesContent: React.FC<{ projectId: number | null }> = ({ projectId }) => {
  const handleGrowthRateChange = (setId: number, steps: any[]) => {
    console.log('Growth rate updated:', setId, steps);
    // This would typically update your budget calculations
  };

  if (!projectId) {
    return (
      <div className="p-4">
        <div className="bg-gray-800 rounded border border-gray-700 p-6 text-center">
          <div className="text-gray-400 mb-1 text-sm">No Project Selected</div>
          <div className="text-lg font-medium text-white">Please select a project to manage growth rates.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-backgroundPaper min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textPrimary mb-2">Growth Rates Management</h1>
        <p className="text-textSecondary">
          Configure ARGUS-style step-based growth assumptions for different cost and revenue categories.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Development Costs */}
        <GrowthRatesManager
          projectId={projectId}
          cardType="cost"
          onGrowthRateChange={handleGrowthRateChange}
        />

        {/* Revenue Growth */}
        <GrowthRatesManager
          projectId={projectId}
          cardType="revenue"
          onGrowthRateChange={handleGrowthRateChange}
        />

        {/* Absorption Rates */}
        <GrowthRatesManager
          projectId={projectId}
          cardType="absorption"
          onGrowthRateChange={handleGrowthRateChange}
        />
      </div>

      <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h3 className="font-medium text-primary mb-2">Integration Notes</h3>
        <ul className="text-sm text-textSecondary space-y-1">
          <li>• Growth rates are stored in the database and linked to your budget facts via <code className="bg-primary/10 px-1 rounded text-primary">growth_rate_set_id</code></li>
          <li>• The existing <code className="bg-primary/10 px-1 rounded text-primary">escalation_rate</code> field in <code className="bg-primary/10 px-1 rounded text-primary">core_fin_fact_budget</code> can be used for backwards compatibility</li>
          <li>• Each project can have multiple rate sets for different scenarios (Custom 1, Custom 2, etc.)</li>
          <li>• Step-based rates follow ARGUS conventions with "E" representing end-of-analysis periods</li>
          <li>• Use the <code className="bg-primary/10 px-1 rounded text-primary">onGrowthRateChange</code> callback to trigger budget recalculations when rates change</li>
        </ul>
      </div>
    </div>
  );
};

export default LandscapeApp;

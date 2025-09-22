// app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import BudgetContent from './components/Budget/BudgetContent';
// import MarketAssumptions from './components/MarketAssumptions';
import MarketAssumptionsComparison from './components/MarketAssumptionsComparison';
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
import GrowthRates from './components/GrowthRates';

const LandscapeAppInner: React.FC = () => {
  const [activeView, setActiveView] = useState('home');
  const { activeProject, isLoading, error } = useProjectContext();

  // Listen for cross-component navigation requests (e.g., open Planning from Overview)
  useEffect(() => {
    const handler = (e: CustomEvent<{ view?: string }>) => {
      const view = e.detail?.view;
      if (typeof view === 'string') {
        setActiveView(view);
      }
    };
    window.addEventListener('navigateToView', handler);
    return () => window.removeEventListener('navigateToView', handler);
  }, []);

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
        return <MarketAssumptionsComparison projectId={activeProject?.project_id ?? null} />;
      case 'growth-rates':
        return <GrowthRates projectId={activeProject?.project_id ?? null} />;
      case 'project-costs':
        return <BudgetContent projectId={activeProject?.project_id ?? null} />;
      case 'project-revenues':
        return <ComingSoonContent title="Project Revenues" />;

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


export default LandscapeApp;

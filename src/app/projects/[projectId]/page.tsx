'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import Navigation from '@/app/components/Navigation';
import { CContainer } from '@coreui/react';
import ProjectHeader from './components/ProjectHeader';
import TabNavigation from './components/TabNavigation';
import ProjectTab from './components/tabs/ProjectTab';
import PlanningTab from './components/tabs/PlanningTab';
import BudgetTab from './components/tabs/BudgetTab';
import SalesTab from './components/tabs/SalesTab';
import PropertyTab from './components/tabs/PropertyTab';
import OperationsTab from './components/tabs/OperationsTab';
import ValuationTab from './components/tabs/ValuationTab';
import SourcesTab from './components/tabs/SourcesTab';
import UsesTab from './components/tabs/UsesTab';
import GISTab from './components/tabs/GISTab';
import CapitalizationTab from './components/tabs/CapitalizationTab';
import ReportsTab from './components/tabs/ReportsTab';
import DocumentsTab from './components/tabs/DocumentsTab';
import { useState } from 'react';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const activeTab = searchParams.get('tab') || 'project';
  const { projects } = useProjectContext();
  const [activeView, setActiveView] = useState('project-overview');
  const [complexityMode, setComplexityMode] = useState<ComplexityTier>('standard');

  const project = projects.find(p => p.project_id === projectId);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-gray-600">Project ID {projectId} does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      <Navigation activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Project Header with Selector */}
        <ProjectHeader
          projectId={projectId}
          project={project}
          complexityMode={activeTab === 'operations' ? complexityMode : undefined}
          onComplexityModeChange={activeTab === 'operations' ? setComplexityMode : undefined}
        />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} projectId={projectId} propertyType={project.property_type_code} />

        {/* Tab Content - Only render active tab */}
        <div className="flex-1 overflow-y-auto">
          <CContainer fluid className="p-4">
            {/* Universal tabs */}
            {activeTab === 'project' && <ProjectTab project={project} />}
            {activeTab === 'capitalization' && <CapitalizationTab project={project} />}
            {activeTab === 'reports' && <ReportsTab project={project} />}
            {activeTab === 'documents' && <DocumentsTab project={project} />}

            {/* Land Development specific tabs */}
            {activeTab === 'planning' && <PlanningTab project={project} />}
            {activeTab === 'budget' && <BudgetTab project={project} />}
            {activeTab === 'sales' && <SalesTab project={project} />}

            {/* Income Property specific tabs */}
            {activeTab === 'property' && <PropertyTab project={project} />}
            {activeTab === 'operations' && <OperationsTab project={project} mode={complexityMode} onModeChange={setComplexityMode} />}
            {activeTab === 'valuation' && <ValuationTab project={project} />}

            {/* Legacy tab mappings for backwards compatibility */}
            {activeTab === 'overview' && <ProjectTab project={project} />}
            {activeTab === 'sources' && <SourcesTab project={project} />}
            {activeTab === 'uses' && <UsesTab project={project} />}
            {activeTab === 'gis' && <GISTab project={project} />}
          </CContainer>
        </div>
      </main>
    </div>
  );
}

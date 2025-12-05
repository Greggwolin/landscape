'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { CContainer } from '@coreui/react';
import ProjectTab from './components/tabs/ProjectTab';
import PlanningTab from './components/tabs/PlanningTab';
import BudgetTab from './components/tabs/BudgetTab';
import SalesTab from './components/tabs/SalesTab';
import FeasibilityTab from './components/tabs/FeasibilityTab';
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
  const { projects, isLoading } = useProjectContext();
  const [complexityMode, setComplexityMode] = useState<ComplexityTier>('standard');

  const project = projects.find(p => p.project_id === projectId);

  // Show loading state while projects are being fetched
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-64 bg-gray-100 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only show "not found" after loading completes
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
    <div className="app-content">
      {/* Universal tabs */}
      {activeTab === 'project' && <ProjectTab project={project} />}
      {activeTab === 'capitalization' && <CapitalizationTab project={project} />}
      {activeTab === 'reports' && <ReportsTab project={project} />}
      {activeTab === 'documents' && <DocumentsTab project={project} />}

      {/* Land Development specific tabs */}
      {activeTab === 'planning' && <PlanningTab project={project} />}
      {activeTab === 'budget' && <BudgetTab project={project} />}
      {activeTab === 'sales' && <SalesTab project={project} />}
      {activeTab === 'feasibility' && <FeasibilityTab project={project} />}

      {/* Income Property specific tabs */}
      {activeTab === 'property' && <PropertyTab project={project} />}
      {activeTab === 'operations' && <OperationsTab project={project} mode={complexityMode} onModeChange={setComplexityMode} />}
      {activeTab === 'valuation' && <ValuationTab project={project} />}

      {/* Legacy tab mappings for backwards compatibility */}
      {activeTab === 'overview' && <ProjectTab project={project} />}
      {activeTab === 'sources' && <SourcesTab project={project} />}
      {activeTab === 'uses' && <UsesTab project={project} />}
      {activeTab === 'gis' && <GISTab project={project} />}
    </div>
  );
}

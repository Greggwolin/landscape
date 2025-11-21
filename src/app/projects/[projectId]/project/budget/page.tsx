'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import BudgetGridWithTimeline from '@/components/budget/custom/BudgetGridWithTimeline';
import { CNav, CNavItem, CNavLink } from '@coreui/react';
import { ExportButton } from '@/components/admin';
import '@/components/budget/custom/BudgetGrid.css';

/**
 * Project Budget Page
 *
 * Phase 2: Lifecycle stage subtabs (Acquisition, Planning & Engineering, Development, Project Overhead)
 * Integrates existing budget grid with new navigation structure.
 */
export default function ProjectBudgetPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  // Lifecycle stage filter
  const [activeLifecycleStage, setActiveLifecycleStage] = useState('all');

  // Map lifecycle stages to scope filters
  // Based on industry-standard categorization from Phase 2 planning
  const lifecycleStages = [
    { id: 'all', label: 'All Costs', scope: 'all' },
    { id: 'acquisition', label: 'Acquisition', scope: 'Acquisition' },
    { id: 'planning', label: 'Planning & Engineering', scope: 'Planning & Engineering' },
    { id: 'development', label: 'Development', scope: 'Development' },
    { id: 'overhead', label: 'Project Overhead', scope: 'Project Overhead' },
  ];

  const getCurrentScope = () => {
    const stage = lifecycleStages.find(s => s.id === activeLifecycleStage);
    return stage?.scope || 'all';
  };

  return (
    <>
      <ProjectSubNav projectId={projectId} />
      <div className="container-fluid py-4">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Project Budget</h5>
          <ExportButton tabName="Budget" projectId={projectId.toString()} />
        </div>

        {/* Lifecycle Stage Tabs */}
        <CNav variant="tabs" className="mb-4">
          {lifecycleStages.map((stage) => (
            <CNavItem key={stage.id}>
              <CNavLink
                active={activeLifecycleStage === stage.id}
                onClick={() => setActiveLifecycleStage(stage.id)}
                style={{ cursor: 'pointer' }}
              >
                {stage.label}
              </CNavLink>
            </CNavItem>
          ))}
        </CNav>

        {/* Budget Grid */}
        <div className="budget-grid-wrapper">
          <BudgetGridWithTimeline
            projectId={projectId}
            scope={getCurrentScope()}
            level="project"
            entityId={projectId.toString()}
          />
        </div>
      </div>

      <style jsx>{`
        .budget-grid-wrapper {
          background: var(--cui-card-bg);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

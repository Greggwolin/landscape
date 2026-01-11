'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import PlanningContent from '@/app/components/Planning/PlanningContent';
import { ExportButton } from '@/components/admin';

/**
 * Project Planning Page
 *
 * Phase 2: Integrates existing PlanningContent component
 * Displays parcel management, phasing, land use planning, and unit allocation.
 */
export default function ProjectPlanningPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectSubNav projectId={projectId} />
      <div className="app-content">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Planning</h5>
          <ExportButton tabName="Planning" projectId={projectId.toString()} />
        </div>
        <PlanningContent projectId={projectId} />
      </div>
    </>
  );
}

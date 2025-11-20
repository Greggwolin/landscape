'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import PlanningContent from '@/app/components/Planning/PlanningContent';

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
      <ProjectContextBar projectId={projectId} />
      <ProjectSubNav projectId={projectId} />
      <PlanningContent projectId={projectId} />
    </>
  );
}

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PlanningTab from '../../components/tabs/PlanningTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioPlanningPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <PlanningTab project={project} />}
    </StudioPageFrame>
  );
}

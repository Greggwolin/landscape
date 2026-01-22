'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import FeasibilityTab from '../../components/tabs/FeasibilityTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioFeasibilityPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <FeasibilityTab project={project} />}
    </StudioPageFrame>
  );
}

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectTab from '../components/tabs/ProjectTab';
import StudioPageFrame from './components/StudioPageFrame';

export default function StudioHomePage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <ProjectTab project={project} />}
    </StudioPageFrame>
  );
}

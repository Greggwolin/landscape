'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ReportsTab from '../../components/tabs/ReportsTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioReportsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <ReportsTab project={project} />}
    </StudioPageFrame>
  );
}

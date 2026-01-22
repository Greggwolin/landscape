'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import OperationsTab from '../../components/tabs/OperationsTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioOperationsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <OperationsTab project={project} />}
    </StudioPageFrame>
  );
}

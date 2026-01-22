'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SalesTab from '../../components/tabs/SalesTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioSalesPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <SalesTab project={project} />}
    </StudioPageFrame>
  );
}

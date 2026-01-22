'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PropertyTab from '../../components/tabs/PropertyTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioPropertyPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <PropertyTab project={project} />}
    </StudioPageFrame>
  );
}

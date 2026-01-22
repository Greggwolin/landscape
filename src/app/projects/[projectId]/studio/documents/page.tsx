'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import DocumentsTab from '../../components/tabs/DocumentsTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioDocumentsPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <DocumentsTab project={project} />}
    </StudioPageFrame>
  );
}

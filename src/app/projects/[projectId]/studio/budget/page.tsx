'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import BudgetTab from '../../components/tabs/BudgetTab';
import StudioPageFrame from '../components/StudioPageFrame';

export default function StudioBudgetPage() {
  const params = useParams();
  const projectId = Number(params.projectId);

  return (
    <StudioPageFrame projectId={projectId}>
      {(project) => <BudgetTab project={project} />}
    </StudioPageFrame>
  );
}

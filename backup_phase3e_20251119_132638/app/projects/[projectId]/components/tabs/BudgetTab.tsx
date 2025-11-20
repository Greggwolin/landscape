'use client';

import React from 'react';
import BudgetContainer from '@/components/budget/BudgetContainer';

interface Project {
  project_id: number;
  project_name: string;
}

interface BudgetTabProps {
  project: Project;
}

export default function BudgetTab({ project }: BudgetTabProps) {
  return <BudgetContainer projectId={project.project_id} />;
}

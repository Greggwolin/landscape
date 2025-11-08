'use client';

import React from 'react';
import SalesContent from '@/components/sales/SalesContent';

interface Project {
  project_id: number;
  project_name: string;
}

interface SalesTabProps {
  project: Project;
}

export default function SalesTab({ project }: SalesTabProps) {
  return <SalesContent projectId={project.project_id} />;
}

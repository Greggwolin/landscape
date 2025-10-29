'use client';

import React from 'react';
import PlanningContent from '@/app/components/Planning/PlanningContent';

interface Project {
  project_id: number;
  project_name: string;
}

interface PlanningTabProps {
  project: Project;
}

export default function PlanningTab({ project }: PlanningTabProps) {
  return <PlanningContent projectId={project.project_id} />;
}

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import StudioShell from './components/StudioShell';
import { getStudioTilesForAnalysisType } from '@/lib/utils/studioTiles';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, activeProject, isLoading } = useProjectContext();

  const currentProject =
    projects.find((project) => project.project_id === projectId) || activeProject;

  const analysisType = currentProject?.analysis_type || '';

  const tiles = getStudioTilesForAnalysisType(analysisType);

  if (isLoading) {
    return (
      <div className="studio-loading">Loading...</div>
    );
  }

  return (
    <StudioShell projectId={projectId} tiles={tiles} currentProject={currentProject}>
      {children}
    </StudioShell>
  );
}

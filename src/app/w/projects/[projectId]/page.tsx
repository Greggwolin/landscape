'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ProjectArtifactsPanel } from '@/components/wrapper/ProjectArtifactsPanel';

/**
 * Project root page — renders the artifacts panel in the right content area.
 * Landscaper chat (center panel) shows the ProjectHomepage via CenterChatPanel.
 */
export default function WrapperProjectRootPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  if (isNaN(projectId)) return null;

  return <ProjectArtifactsPanel projectId={projectId} />;
}

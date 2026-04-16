'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectArtifactsPanel } from '@/components/wrapper/ProjectArtifactsPanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

/**
 * Project root page — renders the artifacts panel in the right content area.
 * Landscaper chat (center panel) shows the ProjectHomepage via CenterChatPanel.
 *
 * Opens the chat panel on mount — the project home IS the chat workspace.
 * (Counteracts closeChat from the Projects selector page.)
 * Sets rightPanelNarrow so <main> shrinks to the 320px sidebar width.
 */
export default function WrapperProjectRootPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const { openChat, setRightPanelNarrow } = useWrapperUI();

  // Project home = chat workspace — ensure chat panel is visible + narrow right panel
  useEffect(() => {
    openChat();
    setRightPanelNarrow(true);
    return () => setRightPanelNarrow(false);
  }, [openChat, setRightPanelNarrow]);

  if (isNaN(projectId)) return null;

  return <ProjectArtifactsPanel projectId={projectId} />;
}

'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectArtifactsPanel } from '@/components/wrapper/ProjectArtifactsPanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

/**
 * Project root page — renders the artifacts panel in the right content area.
 * Landscaper chat (center panel) shows the ProjectHomepage via CenterChatPanel.
 *
 * This page IS the chat workspace — chat must always be visible here.
 * Reacts to chatOpen going false (e.g. user clicks "Close" in thread view)
 * and immediately re-opens it, so chat cannot be hidden on the project home.
 * Sets rightPanelNarrow so <main> shrinks to the 320px artifacts width.
 */
export default function WrapperProjectRootPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const { chatOpen, openChat, setRightPanelNarrow } = useWrapperUI();

  // Keep chat open — project home IS the chat workspace, not a closable panel
  useEffect(() => {
    if (!chatOpen) openChat();
  }, [chatOpen, openChat]);

  // Narrow the right panel so main shrinks to 320px artifacts width
  useEffect(() => {
    setRightPanelNarrow(true);
    return () => setRightPanelNarrow(false);
  }, [setRightPanelNarrow]);

  if (isNaN(projectId)) return null;

  return <ProjectArtifactsPanel projectId={projectId} />;
}

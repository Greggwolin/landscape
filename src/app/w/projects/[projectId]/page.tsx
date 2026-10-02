'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectArtifactsPanel } from '@/components/wrapper/ProjectArtifactsPanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

/**
 * Project root page — renders the artifacts panel in the right content area.
 * Landscaper chat (center panel) shows the ProjectHomepage via CenterChatPanel.
 *
 * The chat can fold to a strip here (its ☰, or automatically when too narrow).
 * Sets rightPanelNarrow so <main> shrinks to the 320px artifacts width.
 */
export default function WrapperProjectRootPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const { setRightPanelNarrow, openChat } = useWrapperUI();

  // Entering a project shows the chat, even if another page (Platform
  // Knowledge) had closed it. Once here, a fold stays until reopened.
  useEffect(() => {
    openChat();
  }, [openChat]);

  // (Removed 2026-10-02: this page used to force the chat back open whenever it
  // closed. Gregg asked for the chat to fold to a strip — by its ☰, or on its
  // own when the row is too narrow to read it — so a folded chat now stays
  // folded until he reopens it or the room comes back.)

  // Narrow the right panel so main shrinks to 320px artifacts width
  useEffect(() => {
    setRightPanelNarrow(true);
    return () => setRightPanelNarrow(false);
  }, [setRightPanelNarrow]);

  if (isNaN(projectId)) return null;

  return <ProjectArtifactsPanel projectId={projectId} showViewToggle />;
}

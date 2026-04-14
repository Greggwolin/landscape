'use client';

import React from 'react';
import { LandscaperChatThreaded } from '@/components/landscaper/LandscaperChatThreaded';

interface ChatTogglePanelProps {
  projectId: number;
  isOpen: boolean;
  onToggle: () => void;
  width?: number;
  pageContext?: string;
}

/**
 * Collapsible Landscaper chat panel for content pages
 * (Documents, Reports, Map, Admin).
 * Mounts the real LandscaperChatThreaded component.
 */
export function ChatTogglePanel({
  projectId,
  isOpen,
  onToggle,
  width = 380,
  pageContext,
}: ChatTogglePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="chat-toggle-panel" style={{ width }}>
      <LandscaperChatThreaded
        projectId={projectId}
        pageContext={pageContext || 'general'}
        isExpanded={true}
      />
    </div>
  );
}

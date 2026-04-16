'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { LandscaperChatThreaded } from '@/components/landscaper/LandscaperChatThreaded';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

interface CenterChatPanelProps {
  projectId?: number;
  width?: number;
  /** When provided, mounts the chat with this thread pre-selected (used by /w/chat/[threadId]). */
  initialThreadId?: string;
}

/**
 * Center Landscaper chat panel — three-panel layout middle column.
 * Own dark header: left = page badge, center = "Landscaper" title, right = Close button.
 * Open by default. Fully hidden when closed (not collapsed).
 *
 * Always renders the threaded chat (unassigned/general when no projectId).
 */
export function CenterChatPanel({ projectId, width = 420, initialThreadId }: CenterChatPanelProps) {
  const { chatOpen, closeChat } = useWrapperUI();
  const pathname = usePathname();

  if (!chatOpen) return null;

  const getBadge = () => {
    if (pathname.includes('/documents')) return 'Documents';
    if (pathname.includes('/reports')) return 'Reports';
    if (pathname.includes('/map')) return 'Map';
    if (pathname.includes('/tools')) return 'Tools';
    if (pathname.includes('/admin')) return 'Admin';
    if (pathname.includes('/landscaper-ai')) return 'Landscaper AI';
    if (pathname.includes('/projects')) return 'Projects';
    return 'General';
  };

  const getPageContext = () => {
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/tools')) return 'tools';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/landscaper-ai')) return 'landscaper';
    if (pathname.includes('/projects')) return 'projects';
    return 'general';
  };

  return (
    <div className="wrapper-chat-center" style={{ width }}>
      <div className="wrapper-header">
        <span className="wrapper-chat-badge">{getBadge()}</span>
        <span className="wrapper-header-title">Landscaper</span>
        <div className="wrapper-header-spacer" />
        <button className="wrapper-btn-ghost" onClick={closeChat} title="Close chat panel">
          Close
        </button>
      </div>
      <div className="wrapper-chat-body">
        <LandscaperChatThreaded
          projectId={projectId}
          pageContext={projectId ? getPageContext() : 'general'}
          isExpanded={true}
          hideInternalHeader={true}
          initialThreadId={initialThreadId}
        />
      </div>
    </div>
  );
}

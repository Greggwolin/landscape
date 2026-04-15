'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { LandscaperChatThreaded } from '@/components/landscaper/LandscaperChatThreaded';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

interface CenterChatPanelProps {
  projectId?: number;
  width?: number;
}

/**
 * Center Landscaper chat panel — three-panel layout middle column.
 * Own dark header: left = page badge, center = "Landscaper" title, right = Close button.
 * Open by default. Fully hidden when closed (not collapsed).
 */
export function CenterChatPanel({ projectId, width = 420 }: CenterChatPanelProps) {
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
        {projectId ? (
          <LandscaperChatThreaded
            projectId={projectId}
            pageContext={getPageContext()}
            isExpanded={true}
            hideInternalHeader={true}
          />
        ) : (
          <div className="wrapper-chat-empty">
            <div className="wrapper-chat-empty-icon">📁</div>
            <div>Ask Landscaper about your projects, portfolio, or to create a new project.</div>
          </div>
        )}
      </div>
    </div>
  );
}

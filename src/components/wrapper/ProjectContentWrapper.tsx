'use client';

import React, { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { WrapperHeader } from './WrapperHeader';
import { ChatTogglePanel } from './ChatTogglePanel';

interface ProjectContentWrapperProps {
  children: React.ReactNode;
}

/**
 * Injected at /w/projects/[projectId]/layout.tsx level.
 * Renders the dark #040506 header bar with:
 * - Left: 💬 chat toggle button
 * - Center: page title (derived from route or provided by child via context)
 * - Right: optional action slot
 *
 * Chat panel is HIDDEN by default. Clicking the 💬 icon toggles visibility.
 * Clicking a sidebar thread or "+ New chat" opens the chat workspace instead.
 */
export function ProjectContentWrapper({ children }: ProjectContentWrapperProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = parseInt(params.projectId as string);

  const [chatOpen, setChatOpen] = useState(false);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  // Derive page title from route
  const getPageTitle = () => {
    if (pathname.includes('/documents')) return 'Documents';
    if (pathname.includes('/reports')) return 'Reports';
    if (pathname.includes('/map')) return 'Map';
    return 'Project';
  };

  // Derive page context for chat
  const getPageContext = () => {
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/map')) return 'map';
    return 'default';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* ── Global Header Bar ── */}
      <WrapperHeader>
        <button
          className="wrapper-btn-icon"
          onClick={toggleChat}
          title={chatOpen ? 'Close chat panel' : 'Open chat panel'}
        >
          <MessageSquare size={16} />
        </button>
        <span className="wrapper-header-title">{getPageTitle()}</span>
        <div className="wrapper-header-spacer" />
        <div className="wrapper-header-actions">
          {/* Right slot for page-specific actions (e.g., export, settings) */}
        </div>
      </WrapperHeader>

      {/* ── Content Area with Optional Chat Panel ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {chatOpen && (
          <ChatTogglePanel
            projectId={projectId}
            isOpen={chatOpen}
            onToggle={toggleChat}
            pageContext={getPageContext()}
          />
        )}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

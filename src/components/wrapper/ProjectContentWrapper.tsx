'use client';

import React, { useState, useCallback, useRef } from 'react';
import { MessageSquare, Maximize2 } from 'lucide-react';
import { useParams } from 'next/navigation';
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
  const projectId = parseInt(params.projectId as string);

  const [chatOpen, setChatOpen] = useState(false);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  // Map route segments to human-readable titles
  // This will be enhanced when route context is available
  const getPageTitle = () => {
    // For now, a placeholder. In future, derive from route or context.
    return 'Project Content';
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
            pageContext="default"
          />
        )}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { WrapperHeader } from './WrapperHeader';
import { ChatTogglePanel } from './ChatTogglePanel';

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showChat?: boolean;
  chatPageContext?: string;
  projectId?: number;
  headerActions?: React.ReactNode;
  hideHeader?: boolean;
}

/**
 * Wrapper for all "Full Page" content areas.
 * When hideHeader=true, assumes header is provided by layout (ProjectContentWrapper).
 * When hideHeader=false, renders page-level header with title/subtitle/actions.
 *
 * NOTE: For /w/projects/[projectId] content pages, pass hideHeader={true}
 * since the layout injects the header globally to avoid duplication.
 */
export function PageShell({
  title,
  subtitle,
  children,
  showChat = false,
  chatPageContext,
  projectId,
  headerActions,
  hideHeader = false,
}: PageShellProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const toggleChat = useCallback(() => setChatOpen((v) => !v), []);

  return (
    <div className="page-shell">
      {!hideHeader && (
        <WrapperHeader>
          <span className="wrapper-header-title">{title}</span>
          {subtitle && <span className="wrapper-header-subtitle">{subtitle}</span>}
          <div className="wrapper-header-spacer" />
          <div className="wrapper-header-actions">
            {headerActions}
            {showChat && (
              <button
                className="wrapper-btn-icon"
                onClick={toggleChat}
                title={chatOpen ? 'Close chat' : 'Open Landscaper chat'}
              >
                <MessageSquare size={16} />
              </button>
            )}
          </div>
        </WrapperHeader>
      )}

      <div className="page-shell-body">
        {showChat && projectId && (
          <ChatTogglePanel
            projectId={projectId}
            isOpen={chatOpen}
            onToggle={toggleChat}
            pageContext={chatPageContext}
          />
        )}
        <div className="page-shell-content">{children}</div>
      </div>
    </div>
  );
}

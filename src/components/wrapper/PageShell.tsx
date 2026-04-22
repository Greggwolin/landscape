'use client';

import React, { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { WrapperHeader } from './WrapperHeader';
import { ChatTogglePanel } from './ChatTogglePanel';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

interface PageShellProps {
  /** Page title. Ignored when deriveTitleFromPathname is true. */
  title?: string;
  /** Muted secondary label shown inline after the title. */
  subtitle?: string;
  /** Right-side header slot (action buttons, toggles). */
  headerActions?: React.ReactNode;
  /** When true, title is derived from the pathname (documents / reports / map / project). */
  deriveTitleFromPathname?: boolean;
  /** Render the chat-toggle button in the leading slot (opens/closes chat panel). */
  showChatToggle?: boolean;
  /** Mount the ChatTogglePanel next to content when chat is open. */
  showChat?: boolean;
  /** Override the page context passed to ChatTogglePanel. Defaults: derived from pathname. */
  chatPageContext?: string;
  /** Hide the header entirely (rare — used when the page injects its own). */
  hideHeader?: boolean;
  children: React.ReactNode;
}

const PATHNAME_TITLES: Array<[RegExp, string, string]> = [
  [/\/documents/, 'Documents', 'documents'],
  [/\/reports/,   'Reports',   'reports'],
  [/\/map/,       'Map',       'map'],
];

/**
 * Universal wrapper for all /w/ content areas.
 * Header slot order is locked by WrapperHeader: leading → title → subtitle → spacer → trailing.
 * chat-open state is owned by WrapperUIContext — PageShell never holds its own useState.
 */
export function PageShell({
  title,
  subtitle,
  headerActions,
  deriveTitleFromPathname = false,
  showChatToggle = false,
  showChat = false,
  chatPageContext,
  hideHeader = false,
  children,
}: PageShellProps) {
  const { chatOpen, toggleChat, closeChat } = useWrapperUI();
  const pathname = usePathname();
  const params = useParams();
  const projectId = Number(params?.projectId);

  // Option A: content pages (deriveTitleFromPathname) default to chat-closed,
  // matching ProjectContentWrapper's shipped behavior (useState(false)).
  useEffect(() => {
    if (deriveTitleFromPathname) closeChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let resolvedTitle = title ?? '';
  let resolvedContext = chatPageContext ?? 'default';
  if (deriveTitleFromPathname) {
    const hit = PATHNAME_TITLES.find(([re]) => re.test(pathname ?? ''));
    resolvedTitle = hit?.[1] ?? 'Project';
    if (!chatPageContext) resolvedContext = hit?.[2] ?? 'default';
  }

  const leading = showChatToggle ? (
    <button
      className="w-btn w-btn-icon"
      onClick={toggleChat}
      title={chatOpen ? 'Close chat panel' : 'Open chat panel'}
    >
      <span style={{ fontSize: '18px' }}>☰</span>
    </button>
  ) : undefined;

  return (
    <div className="page-shell">
      {!hideHeader && (
        <WrapperHeader
          leading={leading}
          title={resolvedTitle}
          subtitle={subtitle}
          trailing={headerActions}
        />
      )}
      <div className="page-shell-body">
        {showChat && chatOpen && Number.isFinite(projectId) && (
          <ChatTogglePanel
            projectId={projectId}
            isOpen={chatOpen}
            onToggle={toggleChat}
            pageContext={resolvedContext}
          />
        )}
        <div className="page-shell-content">{children}</div>
      </div>
    </div>
  );
}

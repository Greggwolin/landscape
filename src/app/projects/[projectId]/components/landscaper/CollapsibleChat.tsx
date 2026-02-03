'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import { cilCommentBubble, cilChevronRight } from '@coreui/icons';
import { AgentChat } from './AgentChat';

interface CollapsibleChatProps {
  projectId: string;
  agentId: string;
  agentName: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab?: string;  // Page context for tool filtering
}

export function CollapsibleChat({
  projectId,
  agentId,
  agentName,
  isCollapsed,
  onToggleCollapse,
  activeTab = 'home',
}: CollapsibleChatProps) {
  if (isCollapsed) {
    return (
      <div
        className="h-full flex flex-col items-center py-3 cursor-pointer hover:bg-hover-overlay transition-colors"
        onClick={onToggleCollapse}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderLeft: '1px solid var(--line-soft)',
          width: '48px',
        }}
      >
        <CIcon icon={cilCommentBubble} size="lg" className="text-muted" />
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col shadow-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--cui-card-border-radius)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        flex: 1,
        minWidth: '280px',
      }}
    >
      {/* Header - sticky */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 z-10"
        style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
      >
        <div className="flex items-center gap-2">
          <CIcon icon={cilCommentBubble} size="sm" className="text-muted" />
          <span className="text-sm font-semibold text-foreground">Chat with {agentName}</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-hover-overlay text-muted hover:text-foreground transition-colors"
          aria-label="Collapse chat"
        >
          <CIcon icon={cilChevronRight} size="sm" />
        </button>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        <AgentChat
          projectId={projectId}
          agentId={agentId}
          agentName={agentName}
          placeholder={`Ask ${agentName}...`}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}

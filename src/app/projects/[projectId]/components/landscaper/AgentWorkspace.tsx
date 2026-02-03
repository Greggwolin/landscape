'use client';

import React, { ReactNode } from 'react';
import { AgentChat } from './AgentChat';

interface AgentWorkspaceProps {
  projectId: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  children: ReactNode;  // The agent-specific canvas (map, grid, etc.)
  activeTab?: string;  // Page context for tool filtering (e.g., 'mf_valuation', 'mf_operations')
}

export function AgentWorkspace({
  projectId,
  agentId,
  agentName,
  agentIcon,
  children,
  activeTab = 'home',
}: AgentWorkspaceProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Agent Header */}
      <header className="p-4 border-b border-border flex items-center gap-3">
        <span className="text-2xl">{agentIcon}</span>
        <div>
          <h1 className="text-xl font-bold">{agentName}</h1>
          <p className="text-sm text-muted">Specialized analysis workspace</p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Agent Canvas - unique per agent */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Agent Chat - consistent across agents */}
        <aside className="w-96 border-l border-border bg-surface-elevated">
          <AgentChat
            projectId={projectId}
            agentId={agentId}
            agentName={agentName}
            placeholder={`Ask ${agentName} anything...`}
            activeTab={activeTab}
          />
        </aside>
      </div>
    </div>
  );
}

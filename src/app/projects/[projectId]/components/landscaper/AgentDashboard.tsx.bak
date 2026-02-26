'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { CollapsibleChat } from './CollapsibleChat';
import { CollapsibleContent } from './CollapsibleContent';
import { StudioPanel } from './StudioPanel';

interface AgentDashboardProps {
  projectId: string;
  agentId: string;
  agentName: string;
  children: ReactNode;
  activeTab?: string;  // Page context for tool filtering
}

export function AgentDashboard({ projectId, agentId, agentName, children, activeTab = 'home' }: AgentDashboardProps) {
  const [isChatCollapsed, setChatCollapsed] = useState(false);
  const [isContentCollapsed, setContentCollapsed] = useState(false);
  const [isStudioCollapsed, setStudioCollapsed] = useState(false);

  // Persist collapse states to localStorage
  useEffect(() => {
    const savedChat = localStorage.getItem('landscape-chat-collapsed');
    const savedContent = localStorage.getItem('landscape-content-collapsed');
    const savedStudio = localStorage.getItem('landscape-studio-collapsed');
    if (savedChat) setChatCollapsed(savedChat === 'true');
    if (savedContent) setContentCollapsed(savedContent === 'true');
    if (savedStudio) setStudioCollapsed(savedStudio === 'true');
  }, []);

  const toggleChat = () => {
    const newValue = !isChatCollapsed;
    setChatCollapsed(newValue);
    localStorage.setItem('landscape-chat-collapsed', String(newValue));
  };

  const toggleContent = () => {
    const newValue = !isContentCollapsed;
    setContentCollapsed(newValue);
    localStorage.setItem('landscape-content-collapsed', String(newValue));
  };

  const toggleStudio = () => {
    const newValue = !isStudioCollapsed;
    setStudioCollapsed(newValue);
    localStorage.setItem('landscape-studio-collapsed', String(newValue));
  };

  return (
    <div
      className="h-full"
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
      }}
    >
      {/* Left Content Panel - Collapsible with integrated header */}
      <CollapsibleContent
        projectId={parseInt(projectId)}
        isCollapsed={isContentCollapsed}
        onToggleCollapse={toggleContent}
      >
        {/* Agent-specific content */}
        {children}
      </CollapsibleContent>

      {/* Collapsible Chat Panel */}
      <CollapsibleChat
        projectId={projectId}
        agentId={agentId}
        agentName={agentName}
        isCollapsed={isChatCollapsed}
        onToggleCollapse={toggleChat}
        activeTab={activeTab}
      />

      {/* Studio Panel */}
      <StudioPanel
        projectId={projectId}
        isCollapsed={isStudioCollapsed}
        onToggleCollapse={toggleStudio}
      />
    </div>
  );
}

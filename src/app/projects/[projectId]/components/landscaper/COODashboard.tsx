'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { StatusCard } from './StatusCard';
import { DecisionPrompt } from './DecisionPrompt';
import { CollapsibleChat } from './CollapsibleChat';
import { ProjectDetailsContent } from './ProjectDetailsContent';
import { CollapsibleContent } from './CollapsibleContent';
import { StudioPanel } from './StudioPanel';

interface COODashboardProps {
  projectId: string;
  projectName?: string;
  projectDescription?: string;
}

interface AgentSummary {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'blocked' | 'not-started';
  confidence: 'high' | 'medium' | 'low' | null;
  summary: string;
  details?: string[];
  blockedBy?: string;
}

export function COODashboard({ projectId }: COODashboardProps) {
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

  // This would come from API - stubbed for now
  const [agentSummaries] = useState<AgentSummary[]>([
    {
      id: 'market',
      name: 'Market Analysis',
      status: 'complete',
      confidence: 'high',
      summary: 'Absorption 4.2/mo, pricing $52-58K supported by comps',
      details: [
        'Based on Zonda Nov 2025 data',
        '3 comparable subdivisions analyzed',
        'Demand indicators positive'
      ]
    },
    {
      id: 'budget',
      name: 'Budget',
      status: 'partial',
      confidence: 'medium',
      summary: '$18.2M total development cost',
      details: [
        'Using regional benchmarks for grading',
        'No civil engineer estimate uploaded',
        'Contingency at 5% (typical)'
      ]
    },
    {
      id: 'underwriting',
      name: 'Underwriting',
      status: 'blocked',
      confidence: null,
      summary: 'Cannot complete feasibility analysis',
      blockedBy: 'Need target IRR and hold period'
    },
    {
      id: 'documents',
      name: 'Documents',
      status: 'partial',
      confidence: null,
      summary: '12 files ingested, 3 issues',
      details: [
        '8 fully processed',
        '3 partial extraction (image-heavy)',
        '1 conflict detected (lot count)'
      ]
    }
  ]);

  const pendingDecisions = [
    {
      id: 'irr-target',
      question: "What's your target IRR for this project?",
      context: 'Needed to complete feasibility analysis',
      options: [
        { label: '15%', value: '15' },
        { label: '18%', value: '18' },
        { label: '20%', value: '20' },
        { label: 'Custom', value: 'custom' }
      ],
      agent: 'underwriting'
    },
    {
      id: 'lot-count',
      question: 'OM states 180 lots, but Plat shows 194. Which is correct?',
      context: 'Affects absorption timeline and total revenue',
      options: [
        { label: '180 (per OM)', value: '180' },
        { label: '194 (per Plat)', value: '194' },
        { label: 'Let me check', value: 'defer' }
      ],
      agent: 'documents'
    }
  ];

  return (
    <div
      className="h-full"
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
      }}
    >
      {/* Left Content Panel - Collapsible */}
      <CollapsibleContent
        projectId={parseInt(projectId)}
        isCollapsed={isContentCollapsed}
        onToggleCollapse={toggleContent}
        showHeader={true}
      >
        {/* Project Details (profile fields + map) */}
        <ProjectDetailsContent projectId={parseInt(projectId)} />

        {/* Status Overview */}
        <Card title="Project Status" className="mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agentSummaries.map((agent) => (
              <StatusCard key={agent.id} agent={agent} projectId={projectId} />
            ))}
          </div>
        </Card>

        {/* Pending Decisions */}
        {pendingDecisions.length > 0 && (
          <Card title="Decisions Needed">
            <div className="space-y-3">
              {pendingDecisions.map((decision) => (
                <DecisionPrompt key={decision.id} decision={decision} />
              ))}
            </div>
          </Card>
        )}
      </CollapsibleContent>

      {/* Collapsible Chat Panel */}
      <CollapsibleChat
        projectId={projectId}
        agentId="coo"
        agentName="Landscaper"
        isCollapsed={isChatCollapsed}
        onToggleCollapse={toggleChat}
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

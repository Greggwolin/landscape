'use client';

import React from 'react';
import Link from 'next/link';
import { ConfidenceIndicator } from './ConfidenceIndicator';

interface AgentSummary {
  id: string;
  name: string;
  status: 'complete' | 'partial' | 'blocked' | 'not-started';
  confidence: 'high' | 'medium' | 'low' | null;
  summary: string;
  details?: string[];
  blockedBy?: string;
}

interface StatusCardProps {
  agent: AgentSummary;
  projectId: string;
}

export function StatusCard({ agent, projectId }: StatusCardProps) {
  const statusConfig = {
    'complete': { icon: '✓', color: 'text-green-500', bg: 'bg-green-500/10' },
    'partial': { icon: '⚠', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    'blocked': { icon: '✗', color: 'text-red-500', bg: 'bg-red-500/10' },
    'not-started': { icon: '○', color: 'text-gray-500', bg: 'bg-gray-500/10' }
  };

  const config = statusConfig[agent.status];

  return (
    <Link
      href={`/projects/${projectId}/${agent.id}`}
      className={`
        block p-4 rounded-lg border border-border
        hover:border-primary/50 transition-colors
        ${config.bg}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${config.color}`}>{config.icon}</span>
          <h3 className="font-semibold">{agent.name}</h3>
        </div>
        {agent.confidence && (
          <ConfidenceIndicator level={agent.confidence} />
        )}
      </div>

      <p className="text-sm text-foreground mb-2">{agent.summary}</p>

      {agent.details && (
        <ul className="text-xs text-muted space-y-1">
          {agent.details.map((detail, idx) => (
            <li key={idx}>• {detail}</li>
          ))}
        </ul>
      )}

      {agent.blockedBy && (
        <div className="mt-2 text-xs text-red-400">
          Blocked: {agent.blockedBy}
        </div>
      )}
    </Link>
  );
}

'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft } from '@coreui/icons';

interface AgentContentHeaderProps {
  title: string;
  subtitle?: string;
  onToggleCollapse?: () => void;
  actions?: React.ReactNode;
}

export function AgentContentHeader({
  title,
  subtitle,
  onToggleCollapse,
  actions,
}: AgentContentHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 sticky top-0 z-10"
      style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {title}
        </span>
        {subtitle && (
          <span className="text-xs text-muted">{subtitle}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-hover-overlay text-muted hover:text-foreground transition-colors"
            aria-label="Collapse content panel"
          >
            <CIcon icon={cilChevronLeft} size="sm" />
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { LandscaperIcon } from '@/components/icons/LandscaperIcon';

interface RightContentPanelProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Right content panel for the /w/ three-panel layout.
 * Owns the page's dark #040506 header with:
 *   left  = 💬 toggle (opens/closes center chat)
 *   center = title + optional subtitle
 *   right = actions slot (page-specific)
 * Content mounts below the header.
 */
export function RightContentPanel({ title, subtitle, actions, children }: RightContentPanelProps) {
  const { chatOpen, toggleChat } = useWrapperUI();

  return (
    <div className="wrapper-right-panel">
      <div className="wrapper-header">
        <button
          className="wrapper-btn-icon"
          onClick={toggleChat}
          title={chatOpen ? 'Close Landscaper chat' : 'Open Landscaper chat'}
        >
          <LandscaperIcon style={{ width: 16, height: 16 }} />
        </button>
        <span className="wrapper-header-title">{title}</span>
        {subtitle && <span className="wrapper-header-subtitle">{subtitle}</span>}
        <div className="wrapper-header-spacer" />
        {actions && <div className="wrapper-header-actions">{actions}</div>}
      </div>
      <div className="wrapper-right-body">{children}</div>
    </div>
  );
}

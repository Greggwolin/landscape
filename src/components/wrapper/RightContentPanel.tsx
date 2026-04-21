'use client';

import React from 'react';
import { WrapperHeader, ChatToggleButton } from './WrapperHeader';

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
  return (
    <div className="wrapper-right-panel">
      <WrapperHeader
        leading={<ChatToggleButton />}
        title={title}
        subtitle={subtitle}
        trailing={actions}
      />
      <div className="wrapper-right-body">{children}</div>
    </div>
  );
}

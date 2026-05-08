'use client';

import React from 'react';
import { useWrapperUI } from '@/contexts/WrapperUIContext';

interface WrapperHeaderProps {
  /** Optional element before the title (toggle button, back arrow, icon). */
  leading?: React.ReactNode;
  /** Page title. String or ReactNode for custom compositions. */
  title?: React.ReactNode;
  /** Muted secondary label shown inline after the title. */
  subtitle?: React.ReactNode;
  /** Inline elements that follow title+subtitle but sit before the spacer (badges, location). */
  titleSuffix?: React.ReactNode;
  /** Action buttons / toggles rendered on the right side. */
  trailing?: React.ReactNode;
  /** Escape hatch — when provided, slots are ignored. Prefer slots. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Universal dark header bar used by every panel in the /w/ shell.
 * Background: #08090A, height: 42px (pinned in wrapper.css).
 * Slot order (locked):
 *   leading → title → subtitle → titleSuffix → [spacer] → trailing
 */
export function WrapperHeader({
  leading, title, subtitle, titleSuffix, trailing, children, className,
}: WrapperHeaderProps) {
  if (children !== undefined) {
    return <div className={`wrapper-header${className ? ` ${className}` : ''}`}>{children}</div>;
  }
  return (
    <div className={`wrapper-header${className ? ` ${className}` : ''}`}>
      {leading}
      {title !== undefined && title !== null && title !== '' && (
        typeof title === 'string'
          ? <span className="wrapper-header-title">{title}</span>
          : title
      )}
      {subtitle && <span className="wrapper-header-subtitle">{subtitle}</span>}
      {titleSuffix}
      <div className="wrapper-header-spacer" />
      {trailing && <div className="wrapper-header-actions">{trailing}</div>}
    </div>
  );
}

/**
 * Standard chat-panel toggle button. Reads open state from WrapperUIContext.
 * Use as the `leading` slot on panels that open/close the center chat.
 */
export function ChatToggleButton() {
  const { chatOpen, toggleChat } = useWrapperUI();
  return (
    <button
      className="w-btn w-btn-icon"
      onClick={toggleChat}
      title={chatOpen ? 'Close Landscaper chat' : 'Open Landscaper chat'}
    >
      <span style={{ fontSize: '18px' }}>☰</span>
    </button>
  );
}

'use client';

/**
 * LandscaperPanel - AI assistant panel with activity feed and chat
 *
 * STYLING RULES:
 * - All colors use CSS variables from studio-theme.css
 * - No Tailwind color classes (bg-*, text-*, border-* with colors)
 * - Tailwind layout utilities (flex, grid, gap, p-*, m-*) are allowed
 * - CoreUI components for interactive elements
 *
 * @version 1.0
 * @created 2026-01-20
 */

import React, { useState } from 'react';
import { CFormInput, CButton } from '@coreui/react';

export interface ActivityItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  icon: string;
  text: string;
  highlight?: string;
  time: string;
}

export interface LandscaperPanelProps {
  projectId: number;
  activities?: ActivityItem[];
  onSendMessage?: (message: string) => void;
  contextLabel?: string;
  /** Placeholder text for the chat input */
  placeholder?: string;
  /** Whether Landscaper is currently processing */
  isProcessing?: boolean;
}

// Default activities for demo
const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'success',
    icon: '✓',
    text: 'Sales Comparison',
    highlight: 'complete. 3 comps with adjustments.',
    time: '5 min ago',
  },
  {
    id: '2',
    type: 'success',
    icon: '✓',
    text: 'Income Approach',
    highlight: 'DCF analysis complete. 10-year projection.',
    time: '3 min ago',
  },
  {
    id: '3',
    type: 'warning',
    icon: '⚠',
    text: 'H&BU:',
    highlight: 'Economic feasibility pending valuation completion.',
    time: '2 min ago',
  },
  {
    id: '4',
    type: 'info',
    icon: '🔍',
    text: 'Value spread:',
    highlight: '$38.9M - $41.3M. Reconciliation ready.',
    time: '1 min ago',
  },
];

/**
 * Get the CSS variable for a status type
 */
function getStatusColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'success':
      return 'var(--studio-status-ready)';
    case 'warning':
      return 'var(--studio-status-review)';
    case 'error':
      return 'var(--studio-status-error)';
    default:
      return 'var(--studio-primary)';
  }
}

/**
 * LandscaperPanel - AI assistant panel with activity feed and chat
 *
 * Displays:
 * - Header with Landscaper branding and status
 * - Activity feed showing recent AI actions
 * - Chat input for user queries
 */
export function LandscaperPanel({
  projectId: _projectId, // Reserved for future API integration
  activities = DEFAULT_ACTIVITIES,
  onSendMessage,
  contextLabel = 'Project Overview',
  placeholder = 'Ask about valuation approaches...',
  isProcessing = false,
}: LandscaperPanelProps): JSX.Element {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--studio-border-soft)' }}
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{
            background: `linear-gradient(135deg, var(--studio-landscaper-avatar-from), var(--studio-landscaper-avatar-to))`,
          }}
        >
          🌿
        </div>

        {/* Info */}
        <div className="flex-1">
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--studio-text-primary)' }}
          >
            Landscaper
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--studio-landscaper-status)' }}
          >
            {isProcessing ? '◌ Processing...' : '● Ready'}
          </div>
        </div>

        {/* Context label */}
        <span
          className="text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--studio-surface-sunken)',
            color: 'var(--studio-text-secondary)',
          }}
        >
          {contextLabel}
        </span>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex gap-3 py-3"
            style={{
              borderBottom:
                index < activities.length - 1
                  ? '1px solid var(--studio-border-soft)'
                  : 'none',
            }}
          >
            {/* Icon */}
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${getStatusColor(activity.type)} 20%, transparent)`,
                color: getStatusColor(activity.type),
              }}
            >
              {activity.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ color: 'var(--studio-text-secondary)' }}>
                <strong style={{ color: 'var(--studio-text-primary)' }}>
                  {activity.text}
                </strong>
                {activity.highlight && ` ${activity.highlight}`}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {activity.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--studio-border-soft)' }}
      >
        <div className="flex gap-2">
          <CFormInput
            type="text"
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isProcessing}
            style={{
              backgroundColor: 'var(--studio-surface-sunken)',
              borderColor: 'var(--studio-border-soft)',
              color: 'var(--studio-text-primary)',
              fontSize: '13px',
            }}
          />
          <CButton
            color="primary"
            onClick={handleSend}
            disabled={!message.trim() || isProcessing}
            style={{
              backgroundColor: 'var(--studio-primary)',
              borderColor: 'var(--studio-primary)',
              padding: '0 12px',
            }}
          >
            →
          </CButton>
        </div>
      </div>
    </div>
  );
}

export default LandscaperPanel;

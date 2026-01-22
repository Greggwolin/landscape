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
 * @version 1.1
 * @created 2026-01-20
 * @updated 2026-01-21 - Connected to useLandscaper hook, added landscaper-icon.svg
 */

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { CFormInput, CButton } from '@coreui/react';
import { useLandscaper, ChatMessage } from '@/hooks/useLandscaper';
import { sanitizeLandscaperResponse } from '@/utils/formatLandscaperResponse';

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
  /** Toggle activity feed visibility when an external feed is used */
  showActivity?: boolean;
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
  projectId,
  activities = DEFAULT_ACTIVITIES,
  onSendMessage,
  contextLabel = 'Project Overview',
  placeholder = 'Ask about valuation approaches...',
  isProcessing: externalIsProcessing,
  showActivity = true,
}: LandscaperPanelProps): JSX.Element {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to the real Landscaper API
  const { messages, sendMessage: apiSendMessage, isLoading, error } = useLandscaper({
    projectId: projectId.toString(),
    activeTab: 'studio',
  });

  const isProcessing = externalIsProcessing || isLoading;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    // If external handler provided, use it; otherwise use the API
    if (onSendMessage) {
      onSendMessage(message);
    } else {
      apiSendMessage(message);
    }
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="landscaper-panel flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Header */}
      <div
        className="landscaper-header flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--studio-border-soft)' }}
      >
        {/* Icon */}
        <img
          src="/landscaper-icon.svg"
          alt="Landscaper"
          width={36}
          height={36}
          className="landscaper-icon"
        />

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

      </div>

      {/* Chat Messages Area */}
      <div
        className="landscaper-messages flex-1 overflow-y-auto px-4 py-3"
        style={{ minHeight: '120px' }}
      >
        {messages.length === 0 ? (
          <div
            className="text-center py-4 text-xs"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            Ask Landscaper anything about this project...
          </div>
        ) : (
          messages.map((msg: ChatMessage) => (
            <div
              key={msg.messageId}
              className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className="inline-block px-2 py-1.5 rounded-lg text-sm max-w-[90%]"
                style={{
                  backgroundColor:
                    msg.role === 'user'
                      ? 'var(--studio-primary)'
                      : 'var(--studio-surface-sunken)',
                  color:
                    msg.role === 'user'
                      ? '#fff'
                      : 'var(--studio-text-primary)',
                  textAlign: 'left',
                }}
              >
                {msg.role === 'assistant'
                  ? sanitizeLandscaperResponse(msg.content)
                  : msg.content}
              </div>
            </div>
          ))
        )}
        {error && (
          <div
            className="text-xs px-3 py-2 rounded mb-2"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--cui-danger) 15%, transparent)',
              color: 'var(--cui-danger)',
            }}
          >
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Activity Feed (legacy) */}
      {showActivity ? (
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
      ) : null}

      {/* Chat Input - flex-shrink-0 ensures it's always visible */}
      <div
        className="landscaper-chat-input px-4 py-3 flex-shrink-0"
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

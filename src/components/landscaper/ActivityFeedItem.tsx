'use client';

import React from 'react';

export interface ActivityItem {
  id: string;
  type: 'status' | 'decision' | 'update' | 'alert';
  title: string;
  summary: string;
  status?: 'complete' | 'partial' | 'blocked' | 'pending' | 'not-started';
  confidence?: 'high' | 'medium' | 'low' | null;
  timestamp: string;
  read: boolean;
  link?: string;
  details?: string[];
  blockedBy?: string;
  highlightFields?: string[];
}

interface ActivityFeedItemProps {
  item: ActivityItem;
  projectId: number;
}

const statusConfig = {
  complete: { icon: '✓', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  partial: { icon: '⚠', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  blocked: { icon: '✗', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  pending: { icon: '◐', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  'not-started': { icon: '○', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
};

const confidenceColors = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ActivityFeedItem({ item, projectId }: ActivityFeedItemProps) {
  const config = item.status ? statusConfig[item.status] : statusConfig['not-started'];

  const content = (
    <div
      className={`
        p-3 rounded-lg border transition-colors cursor-pointer
        hover:border-blue-300 dark:hover:border-blue-600
        ${!item.read ? 'border-l-4 border-l-teal-500' : ''}
        ${config.bg}
      `}
      style={{ borderColor: 'var(--cui-border-color)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${config.color}`}>{config.icon}</span>
          <h4 className="font-medium text-sm" style={{ color: 'var(--cui-body-color)' }}>
            {item.title}
          </h4>
        </div>
        {item.confidence && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${confidenceColors[item.confidence]}`}>
            {item.confidence}
          </span>
        )}
      </div>

      <p className="text-xs mb-1" style={{ color: 'var(--cui-body-color)' }}>
        {item.summary}
      </p>

      {item.details && item.details.length > 0 && (
        <ul className="text-xs space-y-0.5 mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
          {item.details.slice(0, 2).map((detail, idx) => (
            <li key={idx}>• {detail}</li>
          ))}
          {item.details.length > 2 && (
            <li>+{item.details.length - 2} more</li>
          )}
        </ul>
      )}

      {item.blockedBy && (
        <div className="mt-2 text-xs text-red-500">
          Blocked: {item.blockedBy}
        </div>
      )}

      <div className="mt-2 text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
        {new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  );

  // Navigation is now handled by parent component
  return content;
}

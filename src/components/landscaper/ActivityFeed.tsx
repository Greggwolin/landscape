'use client';

import React from 'react';
import { ActivityFeedItem, ActivityItem } from './ActivityFeedItem';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronTop } from '@coreui/icons';

interface ActivityFeedProps {
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

// Mock data for Phase 1 - will be replaced with real API data in Phase 3
function useMockActivityData(projectId: number): ActivityItem[] {
  return [
    {
      id: '1',
      type: 'status',
      title: 'Market Analysis',
      summary: 'Absorption 4.2/mo, pricing $52-58K supported by comps',
      status: 'complete',
      confidence: 'high',
      timestamp: new Date().toISOString(),
      read: false,
      link: `/projects/${projectId}/market`,
      details: ['Based on Zonda Nov 2025 data', '3 comparable subdivisions analyzed'],
    },
    {
      id: '2',
      type: 'status',
      title: 'Budget',
      summary: '$18.2M total development cost',
      status: 'partial',
      confidence: 'medium',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false,
      link: `/projects/${projectId}/budget`,
      details: ['Using regional benchmarks for grading', 'No civil engineer estimate uploaded'],
    },
    {
      id: '3',
      type: 'decision',
      title: 'Underwriting',
      summary: 'Cannot complete feasibility analysis',
      status: 'blocked',
      confidence: null,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      read: true,
      blockedBy: 'Need target IRR and hold period',
    },
    {
      id: '4',
      type: 'update',
      title: 'Documents',
      summary: '12 files ingested, 3 issues',
      status: 'partial',
      confidence: null,
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      read: true,
      link: `/projects/${projectId}/documents`,
      details: ['8 fully processed', '3 partial extraction', '1 conflict detected'],
    },
  ];
}

export function ActivityFeed({ projectId, isExpanded, onToggle }: ActivityFeedProps) {
  const activities = useMockActivityData(projectId);
  const unreadCount = activities.filter((a) => !a.read).length;

  return (
    <div
      className={`border-t flex flex-col ${isExpanded ? 'flex-1 min-h-[200px]' : 'flex-none'}`}
      style={{ borderColor: 'var(--cui-border-color)' }}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between transition-colors"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          color: 'var(--cui-body-color)',
        }}
      >
        <div className="flex items-center gap-2">
          <CIcon
            icon={isExpanded ? cilChevronBottom : cilChevronTop}
            size="sm"
            className="transition-transform"
          />
          <span className="font-medium text-sm">Activity Feed</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
          {activities.length} items
        </span>
      </button>

      {/* Content - only when expanded */}
      {isExpanded && (
        <div
          className="flex-1 overflow-y-auto px-3 pb-3 space-y-2"
          style={{ backgroundColor: 'var(--cui-body-bg)' }}
        >
          {activities.map((item) => (
            <ActivityFeedItem key={item.id} item={item} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}

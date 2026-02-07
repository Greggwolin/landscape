'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ActivityFeedItem, ActivityItem } from './ActivityFeedItem';
import { useActivityFeed, useMarkActivityRead } from '@/hooks/useActivityFeed';
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilChevronTop } from '@coreui/icons';

interface ActivityFeedProps {
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

// Fallback mock data when API is unavailable
function getMockActivityData(projectId: number): ActivityItem[] {
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
      link: `/projects/${projectId}/planning/market`,
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
  const router = useRouter();
  const { data, isLoading, error } = useActivityFeed(projectId);
  const { mutate: markRead } = useMarkActivityRead(projectId);

  // Use API data if available, otherwise fall back to mock data
  const activities = data?.activities ?? getMockActivityData(projectId);
  const unreadCount = data?.unread_count ?? activities.filter((a) => !a.read).length;

  // Handle activity item click - navigate and mark as read
  const handleActivityClick = (item: ActivityItem) => {
    // Mark as read if not already
    if (!item.read) {
      markRead(item.id);
    }

    // Navigate to the linked page with optional field highlighting
    if (item.link) {
      const basePath = `/projects/${projectId}${item.link}`;
      const highlightParams = item.highlightFields?.length
        ? `?highlight=${item.highlightFields.join(',')}`
        : '';
      router.push(`${basePath}${highlightParams}`);
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${isExpanded ? 'flex-1' : 'flex-none'}`}
    >
      {/* Header - always visible, styled like card header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between transition-colors border-b"
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--cui-card-header-bg)',
          borderColor: 'var(--cui-card-border-color)',
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
          {isLoading && (
            <span className="text-xs" style={{ color: 'var(--cui-secondary-color)' }}>
              Loading...
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
          className="flex-1 overflow-y-auto px-3 pb-3 pt-2 space-y-2"
          style={{ backgroundColor: 'var(--cui-body-bg)' }}
        >
          {error && (
            <div className="text-xs text-red-500 p-2">
              Using cached data - API unavailable
            </div>
          )}
          {activities.map((item) => (
            <div key={item.id} onClick={() => handleActivityClick(item)}>
              <ActivityFeedItem item={item} projectId={projectId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

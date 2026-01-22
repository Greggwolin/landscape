'use client';

import React, { useState } from 'react';
import CIcon from '@coreui/icons-react';
import { cilChevronTop, cilChevronBottom } from '@coreui/icons';
import { useFlyout } from './FlyoutContext';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'partial' | 'blocked' | 'pending';
  flyoutId: string;
  route: string;
  tab?: string;
  timestamp: string;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    title: 'Sales Comparison',
    description: '3 comps extracted, needs adjustment review',
    status: 'partial',
    flyoutId: 'sales-comparison',
    route: 'valuation',
    tab: 'sales',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    title: 'Property Data',
    description: 'Rent roll imported, 113 units',
    status: 'complete',
    flyoutId: 'property',
    route: 'property',
    timestamp: '3 hours ago',
  },
  {
    id: '3',
    title: 'Income Approach',
    description: 'Awaiting cap rate selection',
    status: 'blocked',
    flyoutId: 'income-approach',
    route: 'valuation',
    tab: 'income',
    timestamp: '1 day ago',
  },
];

export default function ActivityFeed({ projectId: _projectId }: { projectId: number }) {
  const { openFlyout } = useFlyout();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleItemClick = (item: ActivityItem) => {
    openFlyout(item.flyoutId, item.route, item.tab);
  };

  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'partial':
        return '◐';
      case 'blocked':
        return '⚠';
      case 'pending':
        return '○';
    }
  };

  const getStatusClass = (status: ActivityItem['status']) => {
    switch (status) {
      case 'complete':
        return 'activity-status-complete';
      case 'partial':
        return 'activity-status-partial';
      case 'blocked':
        return 'activity-status-blocked';
      case 'pending':
        return 'activity-status-pending';
    }
  };

  return (
    <div className={`activity-feed ${isExpanded ? 'activity-feed-expanded' : 'activity-feed-collapsed'}`}>
      <button
        type="button"
        className="activity-feed-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
      >
        <span className="activity-feed-title">Activity</span>
        <CIcon
          icon={isExpanded ? cilChevronBottom : cilChevronTop}
          size="sm"
          style={{ color: 'var(--cui-secondary-color)' }}
        />
      </button>
      {isExpanded && (
        <div className="activity-feed-list">
          {MOCK_ACTIVITIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="activity-item"
              onClick={() => handleItemClick(item)}
            >
              <span className={`activity-status ${getStatusClass(item.status)}`}>
                {getStatusIcon(item.status)}
              </span>
              <div className="activity-content">
                <div className="activity-title">{item.title}</div>
                <div className="activity-desc">{item.description}</div>
              </div>
              <span className="activity-time">{item.timestamp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { CCard, CCardBody, CListGroup, CListGroupItem, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilDollar,
  cilCalendar,
  cilChart,
  cilPencil,
  cilUser,
} from '@coreui/icons';

interface ActivityItem {
  id: string;
  type: 'budget' | 'schedule' | 'milestone' | 'edit' | 'user';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
}

/**
 * ActivityFeed Component
 *
 * Displays recent project activity.
 * Phase 2: Uses placeholder/mock data for UI structure.
 * Future phases will integrate with actual activity tracking.
 */
export default function ActivityFeed({
  activities,
  isLoading = false,
}: ActivityFeedProps) {
  // Placeholder data for Phase 2
  const mockActivities: ActivityItem[] = activities || [
    {
      id: '1',
      type: 'budget',
      title: 'Budget Updated',
      description: 'Development costs increased by 5%',
      timestamp: '2 hours ago',
      user: 'John Doe',
    },
    {
      id: '2',
      type: 'milestone',
      title: 'Milestone Completed',
      description: 'Site preparation phase completed',
      timestamp: '5 hours ago',
      user: 'Jane Smith',
    },
    {
      id: '3',
      type: 'schedule',
      title: 'Schedule Adjusted',
      description: 'Development timeline extended by 2 weeks',
      timestamp: '1 day ago',
      user: 'Mike Johnson',
    },
    {
      id: '4',
      type: 'edit',
      title: 'Project Details Modified',
      description: 'Updated project description and market assumptions',
      timestamp: '2 days ago',
      user: 'Sarah Williams',
    },
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'budget':
        return cilDollar;
      case 'schedule':
        return cilCalendar;
      case 'milestone':
        return cilChart;
      case 'edit':
        return cilPencil;
      case 'user':
        return cilUser;
      default:
        return cilChart;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'budget':
        return 'success';
      case 'schedule':
        return 'warning';
      case 'milestone':
        return 'info';
      case 'edit':
        return 'secondary';
      case 'user':
        return 'primary';
      default:
        return 'light';
    }
  };

  if (isLoading) {
    return (
      <CCard className="activity-feed">
        <CCardBody>
          <h6 className="mb-3">Recent Activity</h6>
          <div className="text-muted">Loading...</div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard className="activity-feed">
      <CCardBody>
        <h6 className="mb-3">Recent Activity</h6>
        <CListGroup flush>
          {mockActivities.map((activity) => (
            <CListGroupItem key={activity.id} className="px-0 border-bottom">
              <div className="d-flex align-items-start">
                <div className="me-3 mt-1">
                  <CBadge color={getActivityColor(activity.type)} shape="rounded-pill" className="p-2">
                    <CIcon icon={getActivityIcon(activity.type)} size="sm" />
                  </CBadge>
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-semibold mb-1">{activity.title}</div>
                      <div className="text-muted small">{activity.description}</div>
                    </div>
                    <div className="text-muted small text-nowrap ms-3">
                      {activity.timestamp}
                    </div>
                  </div>
                  {activity.user && (
                    <div className="text-muted small mt-1">
                      by {activity.user}
                    </div>
                  )}
                </div>
              </div>
            </CListGroupItem>
          ))}
        </CListGroup>
      </CCardBody>
    </CCard>
  );
}

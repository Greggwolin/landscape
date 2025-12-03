'use client';

import React from 'react';
import { CCard, CCardBody, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilCircle, cilClock } from '@coreui/icons';

interface Milestone {
  id: number;
  name: string;
  target_date: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  description?: string;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  isLoading?: boolean;
}

/**
 * MilestoneTimeline Component
 *
 * Displays project milestones in a vertical timeline.
 * Integrates with existing milestones API.
 *
 * Phase 2: Integrated into Project Summary dashboard
 */
export default function MilestoneTimeline({
  milestones,
  isLoading = false,
}: MilestoneTimelineProps) {
  const getMilestoneIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return cilCheckCircle;
      case 'in-progress':
        return cilClock;
      case 'upcoming':
        return cilCircle;
      default:
        return cilCircle;
    }
  };

  const getMilestoneColor = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'primary';
      case 'upcoming':
        return 'secondary';
      default:
        return 'light';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <CCard className="milestone-timeline">
        <CCardBody>
          <h6 className="mb-3">Project Milestones</h6>
          <div className="text-muted">Loading...</div>
        </CCardBody>
      </CCard>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <CCard className="milestone-timeline">
        <CCardBody>
          <h6 className="mb-3">Project Milestones</h6>
          <div className="text-muted">No milestones defined for this project.</div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard className="milestone-timeline">
      <CCardBody>
        <h6 className="mb-3">Project Milestones</h6>
        <div className="timeline">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`timeline-item ${index !== milestones.length - 1 ? 'mb-3' : ''}`}
              style={{
                position: 'relative',
                paddingLeft: '2.5rem',
              }}
            >
              {/* Timeline connector line */}
              {index !== milestones.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '2rem',
                    bottom: '-0.75rem',
                    width: '2px',
                    backgroundColor: 'var(--cui-border-color)',
                  }}
                />
              )}

              {/* Timeline icon */}
              <div
                style={{
                  position: 'absolute',
                  left: '0',
                  top: '0.25rem',
                }}
              >
                <CBadge
                  color={getMilestoneColor(milestone.status)}
                  shape="rounded-pill"
                  className="p-2"
                >
                  <CIcon icon={getMilestoneIcon(milestone.status)} size="sm" />
                </CBadge>
              </div>

              {/* Milestone content */}
              <div>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="fw-semibold">{milestone.name}</div>
                  <CBadge color={getMilestoneColor(milestone.status)} className="ms-2">
                    {milestone.status.replace('-', ' ')}
                  </CBadge>
                </div>
                <div className="text-muted small mb-1">
                  {formatDate(milestone.target_date)}
                </div>
                {milestone.description && (
                  <div className="text-muted small">
                    {milestone.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  );
}

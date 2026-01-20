'use client';

import React from 'react';
import { CButton, CProgress } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCheckCircle, cilWarning, cilCircle, cilArrowRight } from '@coreui/icons';
import type { MilestoneItem } from './types';

interface MilestoneBarProps {
  milestones: MilestoneItem[];
  onReadyClick?: () => void;
  isReady?: boolean;
}

export function MilestoneBar({ milestones, onReadyClick, isReady = false }: MilestoneBarProps) {
  // Calculate progress
  const complete = milestones.filter(m => m.status === 'complete').length;
  const partial = milestones.filter(m => m.status === 'partial').length;
  const total = milestones.length;

  // Progress percentages
  const completePercent = total > 0 ? (complete / total) * 100 : 0;
  const partialPercent = total > 0 ? (partial / total) * 100 : 0;

  const getIcon = (status: MilestoneItem['status']) => {
    switch (status) {
      case 'complete':
        return cilCheckCircle;
      case 'partial':
        return cilWarning;
      default:
        return cilCircle;
    }
  };

  return (
    <div
      className="d-flex align-items-center gap-4 px-4 py-3"
      style={{
        background: 'var(--cui-body-bg)',
        borderTop: '1px solid var(--cui-border-color)',
      }}
    >
      {/* Progress section */}
      <div className="flex-grow-1">
        <div
          className="text-uppercase text-body-secondary mb-2"
          style={{ fontSize: '11px', letterSpacing: '0.5px' }}
        >
          Diligence Completeness
        </div>
        <CProgress className="mb-0" style={{ height: '8px' }}>
          <CProgress
            color="success"
            value={completePercent}
            style={{ transition: 'width 0.3s ease' }}
          />
          <CProgress
            color="warning"
            value={partialPercent}
            style={{ transition: 'width 0.3s ease' }}
          />
        </CProgress>
      </div>

      {/* Milestone items */}
      <div className="d-flex gap-4">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="d-flex align-items-center gap-2"
            style={{ fontSize: '12px' }}
          >
            <span
              className={`d-inline-flex align-items-center justify-content-center rounded-circle text-white`}
              style={{
                width: '20px',
                height: '20px',
                fontSize: '10px',
                background:
                  milestone.status === 'complete'
                    ? 'var(--cui-success)'
                    : milestone.status === 'partial'
                    ? 'var(--cui-warning)'
                    : 'var(--cui-secondary)',
              }}
            >
              <CIcon icon={getIcon(milestone.status)} size="sm" />
            </span>
            <span className="text-body-secondary">{milestone.label}</span>
          </div>
        ))}
      </div>

      {/* Ready button */}
      <CButton
        color={isReady ? 'success' : 'secondary'}
        disabled={!isReady}
        onClick={onReadyClick}
        className="d-flex align-items-center gap-2"
        style={{
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5,
        }}
      >
        Ready for Analysis
        <CIcon icon={cilArrowRight} />
      </CButton>
    </div>
  );
}

export default MilestoneBar;

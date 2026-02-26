/**
 * CollapsedLandscaperStrip Component
 *
 * Minimal vertical strip shown when Landscaper panel is collapsed.
 * Displays a Landscaper icon + expand chevron that can be clicked to expand.
 *
 * @version 1.1
 * @created 2026-01-28
 * @updated 2026-02-09 - Icon row aligned to nav height, chevron moved beside icon
 */

'use client';

import React from 'react';
import { CCard } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronRight } from '@coreui/icons';
import { LandscaperIcon } from '@/components/icons/LandscaperIcon';

interface CollapsedLandscaperStripProps {
  onExpand: () => void;
}

export function CollapsedLandscaperStrip({ onExpand }: CollapsedLandscaperStripProps) {
  return (
    <CCard
      className="collapsed-landscaper-strip shadow-lg"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--surface-card-header)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: '56px',
          padding: '0 0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.75)',
        }}
      >
        <button
          onClick={onExpand}
          title="Expand Landscaper"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: 0,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--landscaper-icon-color)',
            cursor: 'pointer',
            transition: 'background-color 0.15s, transform 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <LandscaperIcon
            style={{
              width: '32px',
              height: '32px',
            }}
          />
        </button>

        <button
          onClick={onExpand}
          aria-label="Expand Landscaper panel"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--cui-body-color)',
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
        >
          <CIcon icon={cilChevronRight} style={{ fontSize: '0.7rem' }} />
        </button>
      </div>
    </CCard>
  );
}

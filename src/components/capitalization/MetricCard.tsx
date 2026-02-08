'use client';

import React from 'react';
import { CCard, CCardBody } from '@coreui/react';

interface MetricCardProps {
  label: string;
  value: string | number;
  status?: 'primary' | 'success' | 'info' | 'warning' | 'danger';
  subtitle?: string;
}

/**
 * MetricCard Component
 *
 * Displays a single metric with label and value.
 * Used across all capitalization pages for key metrics.
 */
export default function MetricCard({ label, value, status = 'info', subtitle }: MetricCardProps) {
  const getStatusColor = () => {
    const colors: Record<string, string> = {
      primary: 'var(--cui-primary)',
      success: 'var(--cui-success)',
      info: 'var(--cui-info)',
      warning: 'var(--cui-warning)',
      danger: 'var(--cui-danger)',
    };
    return colors[status] || colors.info;
  };

  return (
    <CCard>
      <CCardBody>
        <div className="small mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
          {label}
        </div>
        <div
          className="fw-bold mb-1"
          style={{ color: getStatusColor(), fontSize: '1.5rem' }}
        >
          {value}
        </div>
        {subtitle && (
          <div className="small" style={{ color: 'var(--cui-secondary-color)', fontSize: '0.75rem' }}>
            {subtitle}
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}

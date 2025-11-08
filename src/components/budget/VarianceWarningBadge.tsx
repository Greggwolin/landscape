// Variance Warning Badge - Visual indicator for variance-prone fields
// v1.0 · 2025-11-03

'use client';

import React from 'react';
import { CBadge } from '@coreui/react';

interface VarianceWarningBadgeProps {
  show: boolean;
  level?: 'low' | 'medium' | 'high';
  tooltip?: string;
}

export default function VarianceWarningBadge({
  show,
  level = 'medium',
  tooltip,
}: VarianceWarningBadgeProps) {
  if (!show) return null;

  const colorMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
  };

  const iconMap = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨',
  };

  return (
    <CBadge
      color={colorMap[level]}
      className="ms-1"
      style={{
        fontSize: '0.65rem',
        padding: '2px 4px',
        cursor: 'help',
      }}
      title={tooltip || 'This field affects a parent category with children'}
    >
      {iconMap[level]}
    </CBadge>
  );
}

'use client';

import React from 'react';
import { CCard, CCardBody } from '@coreui/react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  format?: 'currency' | 'percentage' | 'number';
}

/**
 * MetricCard Component
 *
 * Displays a single metric with optional trend indicator.
 * Used in the Project Summary dashboard.
 *
 * @param label - The metric label (e.g., "Land Value", "IRR")
 * @param value - The metric value (formatted by parent or raw)
 * @param subtitle - Optional subtitle text
 * @param trend - Optional trend data with value and direction
 * @param format - Optional format hint for styling
 */
export default function MetricCard({
  label,
  value,
  subtitle,
  trend,
  format = 'number',
}: MetricCardProps) {
  const getTrendColor = () => {
    if (!trend) return '';
    return trend.direction === 'up' ? 'text-success' : 'text-danger';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend.direction === 'up' ? '↑' : '↓';
  };

  return (
    <CCard className="metric-card h-100">
      <CCardBody>
        <div className="d-flex flex-column h-100">
          {/* Label */}
          <div className="text-muted small text-uppercase mb-2" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {label}
          </div>

          {/* Value */}
          <div className="metric-value mb-2" style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </div>

          {/* Subtitle or Trend */}
          {(subtitle || trend) && (
            <div className="mt-auto">
              {subtitle && (
                <div className="text-muted small">
                  {subtitle}
                </div>
              )}
              {trend && (
                <div className={`small ${getTrendColor()}`}>
                  {getTrendIcon()} {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  );
}

'use client';

import React from 'react';
import { CCard, CCardBody, CProgress } from '@coreui/react';

interface GranularityData {
  budget_completeness: number;
  sales_completeness: number;
  planning_completeness: number;
  overall_score: number;
}

interface GranularityIndicatorsProps {
  data: GranularityData;
  isLoading?: boolean;
}

/**
 * GranularityIndicators Component
 *
 * Displays project data granularity/completeness indicators.
 * Shows progress bars for different areas of the project.
 *
 * Phase 2: Integrated into Project Summary dashboard
 */
export default function GranularityIndicators({
  data,
  isLoading = false,
}: GranularityIndicatorsProps) {
  const getProgressColor = (value: number): string => {
    if (value >= 80) return 'success';
    if (value >= 50) return 'warning';
    return 'danger';
  };

  const indicators = [
    { label: 'Budget Detail', value: data.budget_completeness, key: 'budget' },
    { label: 'Sales Planning', value: data.sales_completeness, key: 'sales' },
    { label: 'Project Planning', value: data.planning_completeness, key: 'planning' },
  ];

  if (isLoading) {
    return (
      <CCard className="granularity-indicators">
        <CCardBody>
          <h6 className="mb-3">Data Granularity</h6>
          <div className="text-muted">Loading...</div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <CCard className="granularity-indicators">
      <CCardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Data Granularity</h6>
          <div className="text-muted small">
            Overall: <strong>{data.overall_score}%</strong>
          </div>
        </div>

        <div className="granularity-list">
          {indicators.map((indicator) => (
            <div key={indicator.key} className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small text-muted">{indicator.label}</span>
                <span className="small fw-semibold">{indicator.value}%</span>
              </div>
              <CProgress
                height={6}
                color={getProgressColor(indicator.value)}
                value={indicator.value}
              />
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  );
}

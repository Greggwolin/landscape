/**
 * Cash Flow Analysis Tab
 * Main container for DCF analysis with time scale and granularity controls
 */

'use client';

import React, { useState, useMemo } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CAlert, CFormSwitch } from '@coreui/react';
import useSWR from 'swr';
import TimeScaleSelector from './TimeScaleSelector';
import CostGranularityToggle from './CostGranularityToggle';
import CashFlowTable from './CashFlowTable';
import CashFlowSummaryMetrics from './CashFlowSummaryMetrics';
import {
  transformCashFlow,
  type TimeScale,
  type CostGranularity,
  type AggregatedSchedule,
} from '@/lib/financial-engine/cashflow/aggregation';
import type { CashFlowSchedule } from '@/lib/financial-engine/cashflow/types';

interface Props {
  projectId: number;
}

interface CashFlowResponse {
  success: boolean;
  data: CashFlowSchedule;
  meta?: {
    generationTime: number;
    periodCount: number;
    sectionCount: number;
  };
  error?: string;
}

async function fetchCashFlow(url: string): Promise<CashFlowResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      periodType: 'month',
      includeFinancing: false,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate cash flow');
  }

  return res.json();
}

export default function CashFlowAnalysisTab({ projectId }: Props) {
  // Controls state - defaults: Overall time, By Phase grouping, details hidden
  const [timeScale, setTimeScale] = useState<TimeScale>('overall');
  const [costGranularity, setCostGranularity] = useState<CostGranularity>('by_phase');
  const [showLineItems, setShowLineItems] = useState(false);

  // Fetch cash flow data
  const { data, error, isLoading } = useSWR<CashFlowResponse>(
    `/api/projects/${projectId}/cash-flow/generate`,
    fetchCashFlow,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Transform data based on selected options
  const transformedSchedule: AggregatedSchedule | null = useMemo(() => {
    if (!data?.data) return null;
    return transformCashFlow(data.data, timeScale, costGranularity);
  }, [data?.data, timeScale, costGranularity]);

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <CSpinner color="primary" className="mb-3" />
        <p style={{ color: 'var(--cui-secondary-color)' }}>Generating cash flow analysis...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error generating cash flow:</strong> {error.message}
      </CAlert>
    );
  }

  // No data state
  if (!data?.data || !transformedSchedule) {
    return (
      <div
        className="text-center py-20 rounded-lg border"
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold mb-2">No Cash Flow Data</h3>
        <p style={{ color: 'var(--cui-secondary-color)' }}>
          Configure budget items and sales absorption to generate cash flow projections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <CashFlowSummaryMetrics summary={data.data.summary} />

      {/* Controls */}
      <CCard
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <CCardHeader className="d-flex flex-wrap align-items-center gap-4 py-3">
          <div className="d-flex align-items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--cui-secondary-color)' }}
            >
              Time:
            </span>
            <TimeScaleSelector value={timeScale} onChange={setTimeScale} />
          </div>

          <div className="d-flex align-items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--cui-secondary-color)' }}
            >
              Costs:
            </span>
            <CostGranularityToggle value={costGranularity} onChange={setCostGranularity} />
          </div>

          <div className="ms-auto">
            <CFormSwitch
              id="showLineItems"
              label="Show details"
              checked={showLineItems}
              onChange={(e) => setShowLineItems(e.target.checked)}
            />
          </div>
        </CCardHeader>
        <CCardBody className="p-0">
          <CashFlowTable schedule={transformedSchedule} showLineItems={showLineItems} />
        </CCardBody>
      </CCard>

      {/* Generation metadata */}
      {data.meta && (
        <div
          className="text-xs text-right"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Generated in {data.meta.generationTime}ms • {data.meta.periodCount} periods •{' '}
          {data.meta.sectionCount} sections
        </div>
      )}
    </div>
  );
}

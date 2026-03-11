/**
 * Cash Flow Analysis Tab
 * Main container for time-period based cash flow analysis
 * Columns: Time periods (years/quarters/months)
 * Rows: Revenue and Cost categories
 * Filter: Affects which phases' data is aggregated into totals
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CAlert, CBadge, CButton } from '@coreui/react';
import useSWR from 'swr';
import TimeScaleSelector from './TimeScaleSelector';
import CostGranularityToggle from './CostGranularityToggle';
import CashFlowTable from './CashFlowTable';
import CashFlowSummaryMetrics from './CashFlowSummaryMetrics';
import CollapsibleSection from '@/app/components/Planning/CollapsibleSection';
import { useContainers } from '@/hooks/useContainers';
import { useProjectConfig } from '@/hooks/useProjectConfig';
import {
  transformCashFlow,
  type TimeScale,
  type CostGranularity,
  type AggregatedSchedule,
} from '@/lib/financial-engine/cashflow/aggregation';
import type { CashFlowSchedule } from '@/lib/financial-engine/cashflow/types';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// Area/Village color palette for filter buttons — CoreUI color names for dark mode compatibility
const AREA_COLORS: Array<'primary' | 'success' | 'warning' | 'danger' | 'info' | 'dark' | 'secondary'> = [
  'primary',
  'success',
  'warning',
  'danger',
  'info',
  'dark',
  'secondary',
];

function getAreaColor(index: number) {
  return AREA_COLORS[index % AREA_COLORS.length];
}

interface CashFlowSummaryData {
  summary: CashFlowSchedule['summary'];
  discountRate?: number;
}

interface Props {
  projectId: number;
  /** Optional export button to render in controls row */
  exportButton?: React.ReactNode;
  /** Callback when cash flow summary is available */
  onSummaryChange?: (data: CashFlowSummaryData | null) => void;
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

interface FetchOptions {
  containerIds?: number[];
}

async function fetchCashFlow(url: string, options: FetchOptions = {}): Promise<CashFlowResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      periodType: 'month',
      includeFinancing: false,
      containerIds: options.containerIds,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate cash flow');
  }

  return res.json();
}

export default function CashFlowAnalysisTab({ projectId, exportButton, onSummaryChange }: Props) {
  // Controls state - defaults: Annual time, Summary grouping
  const [timeScale, setTimeScale] = useState<TimeScale>('annual');
  const [costGranularity, setCostGranularity] = useState<CostGranularity>('summary');

  // Filter state - track which items are EXCLUDED (deselected)
  // Empty arrays mean "all selected" (default state)
  const [excludedAreaIds, setExcludedAreaIds] = useState<number[]>([]);
  const [excludedPhaseIds, setExcludedPhaseIds] = useState<number[]>([]);

  // Fetch containers (areas/phases) for filter
  const { areas, phases: containerPhases, isLoading: containersLoading } = useContainers({ projectId });
  const { labels } = useProjectConfig(projectId);

  // Filter handlers - toggle exclusion
  const handleAreaSelect = useCallback((areaId: number) => {
    setExcludedAreaIds(prev => {
      const isCurrentlyExcluded = prev.includes(areaId);
      if (isCurrentlyExcluded) {
        // Re-select: remove from exclusions, also re-select all phases in this area
        const phasesInArea = containerPhases.filter(p => p.parent_id === areaId).map(p => p.division_id);
        setExcludedPhaseIds(prevPhases => prevPhases.filter(id => !phasesInArea.includes(id)));
        return prev.filter(id => id !== areaId);
      } else {
        // Deselect: add to exclusions, also exclude all phases in this area
        const phasesInArea = containerPhases.filter(p => p.parent_id === areaId).map(p => p.division_id);
        setExcludedPhaseIds(prevPhases => [...new Set([...prevPhases, ...phasesInArea])]);
        return [...prev, areaId];
      }
    });
  }, [containerPhases]);

  const handlePhaseSelect = useCallback((phaseId: number) => {
    setExcludedPhaseIds(prev => {
      if (prev.includes(phaseId)) {
        // Re-select: remove from exclusions
        return prev.filter(id => id !== phaseId);
      }
      // Deselect: add to exclusions
      return [...prev, phaseId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    // Select all = clear all exclusions
    setExcludedAreaIds([]);
    setExcludedPhaseIds([]);
  }, []);

  // Filter phases shown in tiles - show all phases, not filtered by area selection
  const filteredContainerPhases = containerPhases;

  // Check if any filters are applied (anything is deselected)
  const hasFilters = excludedAreaIds.length > 0 || excludedPhaseIds.length > 0;

  // Determine which container IDs to pass to the API
  // This controls which phases' data is aggregated into the totals
  const containerIdsForApi = useMemo(() => {
    // Get phases that are NOT excluded
    const activePhaseIds = containerPhases
      .filter(p => !excludedPhaseIds.includes(p.division_id) && !excludedAreaIds.includes(p.parent_id!))
      .map(p => p.division_id);

    // If all phases are selected, return undefined (fetch all)
    if (activePhaseIds.length === containerPhases.length) {
      return undefined;
    }

    // Return only selected phase IDs
    return activePhaseIds.length > 0 ? activePhaseIds : undefined;
  }, [excludedPhaseIds, excludedAreaIds, containerPhases]);

  // Fetch cash flow data from Django backend with container filter
  const { data, error, isLoading } = useSWR<CashFlowResponse>(
    // Include containerIds in the cache key so data refetches when filter changes
    containerIdsForApi
      ? [`${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`, containerIdsForApi]
      : `${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`,
    () => fetchCashFlow(`${DJANGO_API_URL}/api/projects/${projectId}/cash-flow/calculate/`, { containerIds: containerIdsForApi }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  // Transform data based on selected time scale and cost granularity
  const transformedSchedule: AggregatedSchedule | null = useMemo(() => {
    if (!data?.data) return null;
    return transformCashFlow(data.data, timeScale, costGranularity);
  }, [data?.data, timeScale, costGranularity]);

  // Report summary to parent when it changes
  useEffect(() => {
    if (onSummaryChange) {
      if (data?.data?.summary) {
        onSummaryChange({
          summary: data.data.summary,
          discountRate: data.data.discountRate,
        });
      } else {
        onSummaryChange(null);
      }
    }
  }, [data?.data?.summary, data?.data?.discountRate, onSummaryChange]);

  // Loading state
  if (isLoading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" className="mb-3" />
          <p style={{ color: 'var(--cui-secondary-color)' }}>Generating cash flow analysis...</p>
        </CCardBody>
      </CCard>
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
      <CCard>
        <CCardBody className="text-center py-5">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h5 className="mb-2">No Cash Flow Data</h5>
          <p className="mb-0" style={{ color: 'var(--cui-secondary-color)' }}>
            Configure budget items and sales absorption to generate cash flow projections.
          </p>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Filter Header - Villages/Phases */}
      <CollapsibleSection
        title={`${labels.level1LabelPlural} / ${labels.level2LabelPlural}`}
        itemCount={1}
        defaultExpanded={true}
        headerActions={
          hasFilters && (
            <CBadge
              color="secondary"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
            >
              Select All
            </CBadge>
          )
        }
      >
        <div className="p-3">
          {/* Areas (Level 1) */}
          <div className="mb-3">
            <h6 className="mb-2 fw-semibold" style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}>
              {labels.level1LabelPlural}
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {containersLoading ? (
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>Loading...</span>
              ) : areas.length === 0 ? (
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>No {labels.level1LabelPlural.toLowerCase()} defined</span>
              ) : (
                areas.map((area, index) => {
                  const isSelected = !excludedAreaIds.includes(area.division_id);
                  const cleanName = area.name.replace(/\bArea\b/gi, '').replace(/\s{2,}/g, ' ').trim();
                  const areaColor = getAreaColor(index);
                  return (
                    <CButton
                      key={area.division_id}
                      size="sm"
                      color={areaColor}
                      variant="outline"
                      style={{ opacity: isSelected ? 1 : 0.4 }}
                      onClick={() => handleAreaSelect(area.division_id)}
                    >
                      {labels.level1Label} {cleanName}
                    </CButton>
                  );
                })
              )}
            </div>
          </div>

          {/* Phases (Level 2) */}
          <div>
            <h6 className="mb-2 fw-semibold" style={{ fontSize: '0.8125rem', color: 'var(--cui-secondary-color)' }}>
              {labels.level2LabelPlural}
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {containersLoading ? (
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>Loading...</span>
              ) : filteredContainerPhases.length === 0 ? (
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  No {labels.level2LabelPlural.toLowerCase()} defined
                </span>
              ) : (
                filteredContainerPhases.map(phase => {
                  // Phase is selected if neither the phase nor its parent area is excluded
                  const isSelected = !excludedPhaseIds.includes(phase.division_id) && !excludedAreaIds.includes(phase.parent_id!);
                  // Find the parent area's index to get matching color
                  const parentIndex = areas.findIndex(a => a.division_id === phase.parent_id);
                  const phaseColor = getAreaColor(parentIndex >= 0 ? parentIndex : 0);
                  return (
                    <CButton
                      key={phase.division_id}
                      size="sm"
                      color={phaseColor}
                      variant="outline"
                      style={{ opacity: isSelected ? 1 : 0.4 }}
                      onClick={() => handlePhaseSelect(phase.division_id)}
                    >
                      {labels.level2Label} {phase.name}
                    </CButton>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Summary Metrics */}
      <div className="mt-3">
        <CashFlowSummaryMetrics summary={data.data.summary} />
      </div>

      {/* Controls */}
      <CCard
        className="mt-3"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-4 py-3">
          <div className="d-flex flex-wrap align-items-center gap-4">
            <div className="d-flex align-items-center gap-2">
              <span
                className="fw-medium"
                style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}
              >
                Time:
              </span>
              <TimeScaleSelector value={timeScale} onChange={setTimeScale} />
            </div>

            <div className="d-flex align-items-center gap-2">
              <span
                className="fw-medium"
                style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}
              >
                Costs:
              </span>
              <CostGranularityToggle value={costGranularity} onChange={setCostGranularity} />
            </div>
          </div>

          {/* Export button - right aligned */}
          {exportButton && (
            <div className="d-flex align-items-center">
              {exportButton}
            </div>
          )}
        </CCardHeader>
        <CCardBody className="p-0">
          <CashFlowTable schedule={transformedSchedule} />
        </CCardBody>
      </CCard>

      {/* Generation metadata */}
      {data.meta && (
        <div
          className="text-end mt-3"
          style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}
        >
          Generated in {data.meta.generationTime}ms • {data.meta.periodCount} periods •{' '}
          {data.meta.sectionCount} sections
        </div>
      )}
    </div>
  );
}

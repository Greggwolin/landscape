/**
 * Cash Flow Analysis Tab
 * Main container for time-period based cash flow analysis
 * Columns: Time periods (years/quarters/months)
 * Rows: Revenue and Cost categories
 * Filter: Affects which phases' data is aggregated into totals
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CAlert, CBadge } from '@coreui/react';
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

// Area/Village color palette for filter buttons
const AREA_COLORS = [
  { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }, // Blue
  { bg: '#22c55e', border: '#16a34a', text: '#ffffff' }, // Green
  { bg: '#f97316', border: '#ea580c', text: '#ffffff' }, // Orange
  { bg: '#a855f7', border: '#9333ea', text: '#ffffff' }, // Purple
  { bg: '#ec4899', border: '#db2777', text: '#ffffff' }, // Pink
  { bg: '#14b8a6', border: '#0d9488', text: '#ffffff' }, // Teal
  { bg: '#eab308', border: '#ca8a04', text: '#000000' }, // Yellow
  { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' }, // Indigo
];

function getAreaColor(index: number) {
  return AREA_COLORS[index % AREA_COLORS.length];
}

interface Props {
  projectId: number;
  /** Optional export button to render in controls row */
  exportButton?: React.ReactNode;
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

export default function CashFlowAnalysisTab({ projectId, exportButton }: Props) {
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

  // Fetch cash flow data with container filter
  const { data, error, isLoading } = useSWR<CashFlowResponse>(
    // Include containerIds in the cache key so data refetches when filter changes
    containerIdsForApi
      ? [`/api/projects/${projectId}/cash-flow/generate`, containerIdsForApi]
      : `/api/projects/${projectId}/cash-flow/generate`,
    () => fetchCashFlow(`/api/projects/${projectId}/cash-flow/generate`, { containerIds: containerIdsForApi }),
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
            <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
              {labels.level1LabelPlural}
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {containersLoading ? (
                <div className="text-muted text-sm">Loading...</div>
              ) : areas.length === 0 ? (
                <div className="text-muted text-sm">No {labels.level1LabelPlural.toLowerCase()} defined</div>
              ) : (
                areas.map((area, index) => {
                  const isSelected = !excludedAreaIds.includes(area.division_id);
                  const cleanName = area.name.replace(/\bArea\b/gi, '').replace(/\s{2,}/g, ' ').trim();
                  const areaColor = getAreaColor(index);
                  return (
                    <button
                      key={area.division_id}
                      onClick={() => handleAreaSelect(area.division_id)}
                      className="px-3 py-2 rounded text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? areaColor.bg : 'transparent',
                        color: isSelected ? areaColor.text : areaColor.bg,
                        border: `2px solid ${areaColor.border}`,
                        cursor: 'pointer',
                      }}
                    >
                      {labels.level1Label} {cleanName}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Phases (Level 2) */}
          <div>
            <h6 className="text-sm font-semibold mb-2" style={{ color: 'var(--cui-secondary-color)' }}>
              {labels.level2LabelPlural}
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {containersLoading ? (
                <div className="text-muted text-sm">Loading...</div>
              ) : filteredContainerPhases.length === 0 ? (
                <div className="text-muted text-sm">
                  No {labels.level2LabelPlural.toLowerCase()} defined
                </div>
              ) : (
                filteredContainerPhases.map(phase => {
                  // Phase is selected if neither the phase nor its parent area is excluded
                  const isSelected = !excludedPhaseIds.includes(phase.division_id) && !excludedAreaIds.includes(phase.parent_id!);
                  // Find the parent area's index to get matching color
                  const parentIndex = areas.findIndex(a => a.division_id === phase.parent_id);
                  const phaseColor = getAreaColor(parentIndex >= 0 ? parentIndex : 0);
                  return (
                    <button
                      key={phase.division_id}
                      onClick={() => handlePhaseSelect(phase.division_id)}
                      className="px-3 py-2 rounded text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? phaseColor.bg : 'transparent',
                        color: isSelected ? phaseColor.text : phaseColor.bg,
                        border: `2px solid ${phaseColor.border}`,
                        cursor: 'pointer',
                        opacity: isSelected ? 1 : 0.8,
                      }}
                    >
                      {labels.level2Label} {phase.name}
                    </button>
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
          className="text-xs text-right mt-3"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Generated in {data.meta.generationTime}ms • {data.meta.periodCount} periods •{' '}
          {data.meta.sectionCount} sections
        </div>
      )}
    </div>
  );
}

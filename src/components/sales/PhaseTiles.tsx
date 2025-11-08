/**
 * Phase Tiles
 * Display phase summary cards for filtering the parcel table
 */

'use client';

import React, { useMemo } from 'react';
import { usePhaseStats, useParcelsWithSales } from '@/hooks/useSalesAbsorption';
import { useContainers } from '@/hooks/useContainers';

interface Props {
  projectId: number;
  selectedPhaseIds: number[];
  selectedAreaIds?: number[];
  onPhaseSelect: (phaseId: number | null) => void;
  showCosts?: boolean;
}

interface Phase {
  phase_id: number;
  phase_name: string;
  phase_no: number;
  phase_code: string;
  label?: string;
  gross_acres: number;
  units_total: string | number;
  parcel_count?: number; // Will be calculated
}

const PHASE_COLORS = [
  '#3F51B5', // Indigo
  '#009688', // Teal
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#FF9800', // Orange
];

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value === 0) return '$0'
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${Math.round(value).toLocaleString()}`
}

export default function PhaseTiles({
  projectId,
  selectedPhaseIds,
  selectedAreaIds = [],
  onPhaseSelect,
  showCosts = false
}: Props) {
  const { data: phases, isLoading, error } = usePhaseStats(projectId);
  const { data: parcels } = useParcelsWithSales(projectId, null);
  const { phases: containerPhases } = useContainers({ projectId, includeCosts: showCosts });

  // Calculate parcel counts per phase and merge with container data
  const phasesWithCounts = useMemo(() => {
    if (!phases || !parcels) return phases;

    return phases.map((phase: Phase) => {
      const parcelCount = parcels.filter(p => p.phase_id === phase.phase_id).length;

      // Find matching container phase for cost data
      const containerPhase = containerPhases.find(cp => cp.container_id === phase.phase_id);

      return {
        ...phase,
        parcel_count: parcelCount,
        total_cost: containerPhase?.totalCost || 0
      };
    });
  }, [phases, parcels, containerPhases]);

  // Filter phases by selected areas
  const filteredPhases = useMemo(() => {
    if (!phasesWithCounts) return [];
    if (selectedAreaIds.length === 0) return phasesWithCounts;

    return phasesWithCounts.filter((phase: Phase) => {
      // Find matching container phase to get parent area
      const containerPhase = containerPhases.find(cp => cp.container_id === phase.phase_id);
      return containerPhase && selectedAreaIds.includes(containerPhase.parent_id!);
    });
  }, [phasesWithCounts, selectedAreaIds, containerPhases]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded border-2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        <p>Failed to load phase data</p>
      </div>
    );
  }

  if (!filteredPhases || filteredPhases.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600">
        <p>No phases {selectedAreaIds.length > 0 ? 'in selected areas' : 'defined for this project'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {filteredPhases.map((phase: Phase & { total_cost?: number }, index: number) => {
        const color = PHASE_COLORS[index % PHASE_COLORS.length];
        const isSelected = selectedPhaseIds.includes(phase.phase_id);

        // Check if parent area is selected (for highlighting)
        const containerPhase = containerPhases.find(cp => cp.container_id === phase.phase_id);
        const isHighlighted = !isSelected && containerPhase && selectedAreaIds.includes(containerPhase.parent_id!);

        return (
          <div
            key={phase.phase_id}
            className={`rounded p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'shadow-lg' : ''
            }`}
            style={{
              borderColor: isSelected ? '#212121' : isHighlighted ? '#ffc107' : '#E0E0E0',
              backgroundColor: isSelected ? `${color}40` : `${color}20`,
              opacity: isHighlighted ? 0.85 : 1
            }}
            onClick={() => onPhaseSelect(phase.phase_id)}
          >
            <div className="text-center">
              <div
                className="text-lg font-bold mb-1"
                style={{ color: isSelected ? color : '#424242' }}
              >
                Phase {phase.phase_name}
              </div>

              <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                {Math.round(phase.gross_acres).toLocaleString()} acres
              </div>

              {phase.parcel_count !== undefined && (
                <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                  {phase.parcel_count.toLocaleString()} {phase.parcel_count === 1 ? 'Parcel' : 'Parcels'}
                </div>
              )}

              <div className="text-sm" style={{ color: 'var(--cui-body-color)' }}>
                {(typeof phase.units_total === 'string' ? parseInt(phase.units_total) : phase.units_total).toLocaleString()} units
              </div>

              {showCosts && phase.total_cost !== undefined && (
                <div className="text-sm mt-1" style={{ color: 'var(--cui-body-color)' }}>
                  {formatCurrency(phase.total_cost)}
                </div>
              )}
            </div>

            {isSelected && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs font-medium" style={{ color }}>
                  ✓ Selected
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

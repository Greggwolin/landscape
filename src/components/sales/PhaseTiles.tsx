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
  const { data: parcelDataset } = useParcelsWithSales(projectId, null);
  const { phases: containerPhases } = useContainers({ projectId, includeCosts: showCosts });

  // Calculate parcel counts per phase and merge with container data
  const phasesWithCounts = useMemo(() => {
    if (!phases || !parcelDataset) return phases;

    const parcels = parcelDataset.parcels || [];

    return phases.map((phase: Phase) => {
      const phaseParcels = parcels.filter(p => p.phase_id === phase.phase_id);
      const parcelCount = phaseParcels.length;

      // Calculate total net proceeds for parcels in this phase
      const netProceeds = phaseParcels.reduce((sum, p) => {
        return sum + (p.net_proceeds || 0);
      }, 0);

      // Find matching container phase for cost data by NAME (not ID)
      const containerPhase = containerPhases.find(cp => cp.name === phase.phase_name);

      return {
        ...phase,
        parcel_count: parcelCount,
        total_cost: containerPhase?.totalCost || 0,
        net_proceeds: netProceeds
      };
    });
  }, [phases, parcelDataset, containerPhases]);

  // Filter phases by selected areas
  const filteredPhases = useMemo(() => {
    if (!phasesWithCounts) return [];
    if (selectedAreaIds.length === 0) return phasesWithCounts;

    // Find matching container phase by NAME (not ID, since phase_id !== division_id)
    return phasesWithCounts.filter((phase: Phase) => {
      const containerPhase = containerPhases.find(cp => cp.name === phase.phase_name);
      return containerPhase && selectedAreaIds.includes(containerPhase.parent_id!);
    });
  }, [phasesWithCounts, selectedAreaIds, containerPhases]);

  const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';

  if (isLoading) {
    return (
      <div className={gridClass}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-36 bg-gray-200 rounded border-2"></div>
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
    <div className={gridClass}>
      {filteredPhases.map((phase: Phase & { total_cost?: number; net_proceeds?: number }) => {
        const isSelected = selectedPhaseIds.includes(phase.phase_id);

        // Check if parent area is selected (for highlighting) - match by NAME
        const containerPhase = containerPhases.find(cp => cp.name === phase.phase_name);
        const isHighlighted = !isSelected && containerPhase && selectedAreaIds.includes(containerPhase.parent_id!);

        // Build className dynamically
        let tileClassName = 'planning-tile text-center';
        if (isSelected) tileClassName += ' planning-tile-active';
        if (isHighlighted) tileClassName += ' planning-tile-highlighted';

        return (
          <div
            key={phase.phase_id}
            className={tileClassName}
            onClick={() => onPhaseSelect(phase.phase_id)}
          >
            <div className="planning-tile-header mb-3 truncate whitespace-nowrap">
              Phase {phase.phase_name}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--cui-body-color)' }}>Acres:</span>
                <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  {Math.round(phase.gross_acres).toLocaleString()}
                </span>
              </div>

              {phase.parcel_count !== undefined && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--cui-body-color)' }}>Parcels:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                    {phase.parcel_count.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span style={{ color: 'var(--cui-body-color)' }}>Units:</span>
                <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  {(typeof phase.units_total === 'string' ? parseInt(phase.units_total) : phase.units_total).toLocaleString()}
                </span>
              </div>

              {phase.net_proceeds !== undefined && phase.net_proceeds > 0 && (
                <div className="flex justify-between mt-1">
                  <span style={{ color: 'var(--cui-body-color)' }}>Net $$:</span>
                  <span className="font-semibold" style={{ color: 'var(--cui-success)' }}>
                    {formatCurrency(phase.net_proceeds)}
                  </span>
                </div>
              )}
            </div>

            {isSelected && (
              <div className="mt-3 pt-3 border-t border-subtle">
                <div className="text-xs font-medium" style={{ color: 'var(--cui-primary)' }}>
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

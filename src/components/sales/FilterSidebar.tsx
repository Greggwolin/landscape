'use client';

import React, { useMemo } from 'react';
import type { SaleTransaction } from '@/utils/sales/salesAggregation';

interface FilterSidebarProps {
  sales: SaleTransaction[];
  activeFilter: 'all' | 'phase' | 'use';
  selectedPhase: string | null;
  selectedUseType: string | null;
  onFilterChange: (filter: 'all' | 'phase' | 'use') => void;
  onPhaseSelect: (phase: string | null) => void;
  onUseTypeSelect: (useType: string | null) => void;
}

export default function FilterSidebar({
  sales,
  activeFilter,
  selectedPhase,
  selectedUseType,
  onFilterChange,
  onPhaseSelect,
  onUseTypeSelect,
}: FilterSidebarProps) {
  // Calculate counts by phase
  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.parcels.forEach(parcel => {
        const phaseName = parcel.phase_name || 'Unassigned';
        counts[phaseName] = (counts[phaseName] || 0) + 1;
      });
    });
    return counts;
  }, [sales]);

  // Calculate counts by use type
  const useTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.parcels.forEach(parcel => {
        const useType = parcel.type_code || 'Unknown';
        counts[useType] = (counts[useType] || 0) + 1;
      });
    });
    return counts;
  }, [sales]);

  return (
    <div
      className="filter-sidebar"
      style={{
        width: '20%',
        minWidth: '180px',
        background: 'var(--cui-card-bg)',
        padding: '1rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      {/* All Sales */}
      <button
        className={`btn w-100 text-start mb-2 ${
          activeFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => {
          onFilterChange('all');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Show all sales"
      >
        📊 All Sales
      </button>

      {/* By Phase */}
      <button
        className={`btn w-100 text-start mb-1 ${
          activeFilter === 'phase' && !selectedPhase ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => {
          onFilterChange('phase');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Filter by phase"
      >
        📍 By Phase
      </button>
      {activeFilter === 'phase' && Object.keys(phaseCounts).length > 0 && (
        <div className="ps-3 mb-2">
          {Object.entries(phaseCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([phase, count]) => (
              <button
                key={phase}
                className={`btn btn-sm w-100 text-start mb-1 ${
                  selectedPhase === phase ? 'btn-primary' : 'btn-ghost-secondary'
                }`}
                onClick={() => onPhaseSelect(phase)}
                aria-label={`Filter to ${phase}`}
              >
                {phase} ({count})
              </button>
            ))}
        </div>
      )}

      {/* By Use Type */}
      <button
        className={`btn w-100 text-start mb-1 ${
          activeFilter === 'use' && !selectedUseType ? 'btn-primary' : 'btn-outline-secondary'
        }`}
        onClick={() => {
          onFilterChange('use');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Filter by use type"
      >
        🏘️ By Use Type
      </button>
      {activeFilter === 'use' && Object.keys(useTypeCounts).length > 0 && (
        <div className="ps-3">
          {Object.entries(useTypeCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([useType, count]) => (
              <button
                key={useType}
                className={`btn btn-sm w-100 text-start mb-1 ${
                  selectedUseType === useType ? 'btn-primary' : 'btn-ghost-secondary'
                }`}
                onClick={() => onUseTypeSelect(useType)}
                aria-label={`Filter to ${useType} parcels`}
              >
                {useType} ({count})
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

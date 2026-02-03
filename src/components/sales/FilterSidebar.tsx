'use client';

import React, { useMemo } from 'react';
import type { SaleTransaction } from '@/utils/sales/salesAggregation';
import { SemanticButton } from '@/components/ui/landscape';
import './FilterSidebar.css';

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
      <SemanticButton
        intent="secondary-action"
        className={`filter-btn ${activeFilter === 'all' ? 'filter-btn--active' : ''}`}
        onClick={() => {
          onFilterChange('all');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Show all sales"
        variant="ghost"
      >
        📊 All Sales
      </SemanticButton>

      {/* By Phase */}
      <SemanticButton
        intent="secondary-action"
        className={`filter-btn ${activeFilter === 'phase' && !selectedPhase ? 'filter-btn--active' : ''}`}
        onClick={() => {
          onFilterChange('phase');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Filter by phase"
        variant="ghost"
      >
        📍 By Phase
      </SemanticButton>
      {activeFilter === 'phase' && Object.keys(phaseCounts).length > 0 && (
        <div className="ps-3 mb-2">
          {Object.entries(phaseCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([phase, count]) => (
                <SemanticButton
                  key={phase}
                  intent="tertiary-action"
                  size="sm"
                  className={`filter-btn filter-btn--nested ${selectedPhase === phase ? 'filter-btn--active' : ''}`}
                  onClick={() => onPhaseSelect(phase)}
                  aria-label={`Filter to ${phase}`}
                  variant="ghost"
                >
                  {phase} ({count})
                </SemanticButton>
            ))}
        </div>
      )}

      {/* By Use Type */}
      <SemanticButton
        intent="secondary-action"
        className={`filter-btn ${activeFilter === 'use' && !selectedUseType ? 'filter-btn--active' : ''}`}
        onClick={() => {
          onFilterChange('use');
          onPhaseSelect(null);
          onUseTypeSelect(null);
        }}
        aria-label="Filter by use type"
        variant="ghost"
      >
        🏘️ By Use Type
      </SemanticButton>
      {activeFilter === 'use' && Object.keys(useTypeCounts).length > 0 && (
        <div className="ps-3">
          {Object.entries(useTypeCounts)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([useType, count]) => (
              <SemanticButton
                key={useType}
                intent="tertiary-action"
                size="sm"
                className={`filter-btn filter-btn--nested ${selectedUseType === useType ? 'filter-btn--active' : ''}`}
                onClick={() => onUseTypeSelect(useType)}
                aria-label={`Filter to ${useType} parcels`}
                variant="ghost"
              >
                {useType} ({count})
              </SemanticButton>
            ))}
        </div>
      )}
    </div>
  );
}

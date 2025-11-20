'use client';

import React from 'react';
import CIcon from '@coreui/icons-react';
import type { LifecycleStage } from '@/types/benchmarks';
import { LIFECYCLE_STAGE_ICONS } from './lifecycle-icons';

interface LifecycleStageFilterProps {
  stages: LifecycleStage[];
  selectedStages: LifecycleStage[];
  stageCounts: Record<LifecycleStage, number>;
  onToggleStage: (stage: LifecycleStage) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const STAGE_DESCRIPTIONS: Record<LifecycleStage, string> = {
  Acquisition: 'Purchase, closing costs, due diligence',
  'Planning & Engineering': 'Studies, planning, design, permits, engineering',
  Development: 'Construction, site work, infrastructure',
  Operations: 'OpEx, CapEx, revenue, property management',
  Disposition: 'Sale costs, marketing, broker fees',
  Financing: 'Debt, equity, refinancing costs',
};

export default function LifecycleStageFilter({
  stages,
  selectedStages,
  stageCounts,
  onToggleStage,
  onSelectAll,
  onDeselectAll,
}: LifecycleStageFilterProps) {
  const allSelected = selectedStages.length === stages.length;
  const noneSelected = selectedStages.length === 0;

  return (
    <div className="lifecycle-stage-filter">
      <div className="filter-header">
        <h5>Lifecycle Stages</h5>
        <div className="filter-actions">
          <button
            className="btn-link btn-sm"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            Select All
          </button>
          <span className="mx-1">•</span>
          <button
            className="btn-link btn-sm"
            onClick={onDeselectAll}
            disabled={noneSelected}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="filter-list">
        {stages.map((stage) => {
          const isSelected = selectedStages.includes(stage);
          const count = stageCounts[stage] || 0;

          return (
            <div
              key={stage}
              className={`filter-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleStage(stage)}
            >
              <div className="filter-item-content">
                <div className="filter-item-header">
                  <span className="stage-icon">
                    <CIcon icon={LIFECYCLE_STAGE_ICONS[stage]} size="lg" />
                  </span>
                  <span className="stage-name">{stage}</span>
                  <span className="stage-count">{count}</span>
                </div>
                <div className="filter-item-description">
                  {STAGE_DESCRIPTIONS[stage]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="filter-summary">
        <span className="text-muted">
          {selectedStages.length} of {stages.length} stages selected
        </span>
      </div>
    </div>
  );
}

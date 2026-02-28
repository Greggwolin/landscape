'use client';

import React from 'react';
import { CBadge, CButton, CButtonGroup, CCard, CCardBody, CCardHeader } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import type { Activity } from '@/types/benchmarks';
import { LIFECYCLE_STAGE_ICONS } from './lifecycle-icons';

interface ActivityFilterProps {
  stages: Activity[];
  selectedStages: Activity[];
  stageCounts: Record<Activity, number>;
  onToggleStage: (stage: Activity) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const STAGE_DESCRIPTIONS: Record<Activity, string> = {
  Acquisition: 'Purchase, closing costs, due diligence',
  'Planning & Engineering': 'Studies, planning, design, permits, engineering',
  Improvements: 'Construction, site work, infrastructure',
  Operations: 'OpEx, CapEx, revenue, property management',
  Disposition: 'Sale costs, marketing, broker fees',
  Financing: 'Debt, equity, refinancing costs',
};

const STAGE_COLORS: Record<Activity, 'success' | 'info' | 'primary' | 'warning' | 'danger'> = {
  Acquisition: 'success',
  'Planning & Engineering': 'info',
  Improvements: 'primary',
  Operations: 'info',
  Disposition: 'warning',
  Financing: 'danger',
};

export default function ActivityFilter({
  stages,
  selectedStages,
  stageCounts,
  onToggleStage,
  onSelectAll,
  onDeselectAll,
}: ActivityFilterProps) {
  const allSelected = selectedStages.length === stages.length;
  const noneSelected = selectedStages.length === 0;

  return (
    <CCard className="h-100">
      <CCardHeader
        className="d-flex align-items-start justify-content-between gap-2"
        style={{ backgroundColor: 'var(--surface-card-header)' }}
      >
        <div>
          <h6 className="mb-1">Lifecycle Stages</h6>
          <small className="text-medium-emphasis">
            Filter categories by stage assignment
          </small>
        </div>
        <CButtonGroup size="sm" role="group" aria-label="Lifecycle filter actions">
          <CButton color="secondary" variant="ghost" onClick={onSelectAll} disabled={allSelected}>
            All
          </CButton>
          <CButton color="secondary" variant="ghost" onClick={onDeselectAll} disabled={noneSelected}>
            Clear
          </CButton>
        </CButtonGroup>
      </CCardHeader>
      <CCardBody className="p-2 overflow-auto">
        {stages.map((stage) => {
          const isSelected = selectedStages.includes(stage);
          const count = stageCounts[stage] || 0;
          const stageColor = STAGE_COLORS[stage];
          const tone = `var(--cui-${stageColor})`;

          return (
            <button
              key={stage}
              type="button"
              className="w-100 text-start border rounded p-2 mb-2"
              style={{
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${tone} 16%, var(--cui-body-bg))`
                  : `color-mix(in srgb, ${tone} 6%, var(--cui-body-bg))`,
                borderColor: isSelected ? tone : 'var(--cui-border-color)',
                color: 'var(--cui-body-color)',
              }}
              onClick={() => onToggleStage(stage)}
            >
              <div className="d-flex align-items-center gap-2 mb-1">
                <span
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{ color: tone }}
                >
                    <CIcon icon={LIFECYCLE_STAGE_ICONS[stage]} size="lg" />
                </span>
                <span className="fw-semibold">{stage}</span>
                <CBadge color={stageColor} className="ms-auto">
                  {count}
                </CBadge>
              </div>
              <small className="text-medium-emphasis">{STAGE_DESCRIPTIONS[stage]}</small>
            </button>
          );
        })}
      </CCardBody>
      <div className="px-3 py-2 border-top">
        <small className="text-medium-emphasis">
          {selectedStages.length} of {stages.length} stages selected
        </small>
      </div>
    </CCard>
  );
}

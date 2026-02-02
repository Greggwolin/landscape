'use client';

/**
 * RenovationSubTab Component
 *
 * Displays renovation assumptions for VALUE_ADD analysis type projects.
 * Uses the existing ValueAddCard component with the useValueAddAssumptions hook.
 *
 * This component is only visible when analysis_type === 'VALUE_ADD'.
 *
 * @version 1.0
 * @created 2026-02-01
 */

import React, { useMemo } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react';
import { ValueAddCard } from '@/components/operations/ValueAddCard';
import { useValueAddAssumptions, type ValueAddStats } from '@/hooks/useValueAddAssumptions';
import { useOperationsData } from '@/hooks/useOperationsData';
import type { LineItemRow } from '@/components/operations/types';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  analysis_type?: string;
}

interface RenovationSubTabProps {
  project: Project;
}

export default function RenovationSubTab({ project }: RenovationSubTabProps) {
  const projectId = project.project_id;

  // Get operations data to extract unit mix stats
  const {
    propertySummary,
    rentalIncome,
    isLoading: opsLoading,
    error: opsError,
  } = useOperationsData(projectId);

  // Calculate unit mix stats from operations data
  const rentalRows: LineItemRow[] = rentalIncome?.rows || [];
  const unitCount = propertySummary?.unit_count || 0;
  const totalSF = propertySummary?.total_sf || 0;

  const unitMixStats = useMemo<ValueAddStats>(() => {
    const totalUnitsFromRows = rentalRows.reduce((sum, row) => sum + (row.as_is.count || 0), 0);
    const weightedRent = rentalRows.reduce(
      (sum, row) => sum + (row.as_is.rate || 0) * (row.as_is.count || 0),
      0
    );
    const avgCurrentRent = totalUnitsFromRows > 0 ? weightedRent / totalUnitsFromRows : 0;
    const avgUnitSf = propertySummary?.avg_unit_sf || (unitCount > 0 ? totalSF / unitCount : 0);

    return {
      totalUnits: unitCount || totalUnitsFromRows,
      avgUnitSf,
      avgCurrentRent,
    };
  }, [rentalRows, propertySummary?.avg_unit_sf, totalSF, unitCount]);

  // Use value-add assumptions hook
  const {
    state: valueAddState,
    calculated: valueAddCalculated,
    updateField: updateValueAddField,
    isLoading: isValueAddLoading,
    isSaving: isValueAddSaving,
    error: valueAddError,
  } = useValueAddAssumptions(projectId, unitMixStats);

  // Handle toggle (for the enable/disable toggle in ValueAddCard)
  const handleToggle = () => {
    updateValueAddField('isEnabled', !valueAddState.isEnabled);
  };

  // Handle field updates
  const handleUpdate = <K extends keyof typeof valueAddState>(
    key: K,
    value: (typeof valueAddState)[K]
  ) => {
    updateValueAddField(key, value);
  };

  // Loading state
  if (opsLoading || isValueAddLoading) {
    return (
      <CCard>
        <CCardBody className="d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
          <div className="text-center">
            <CSpinner size="sm" className="me-2" />
            <span style={{ color: 'var(--cui-secondary-color)' }}>
              Loading renovation assumptions...
            </span>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  // Error state
  if (opsError || valueAddError) {
    return (
      <CCard>
        <CCardBody>
          <div
            className="rounded-lg px-4 py-3 border"
            style={{
              backgroundColor: 'var(--cui-danger-bg)',
              borderColor: 'var(--cui-danger)',
            }}
          >
            <p className="mb-0" style={{ color: 'var(--cui-danger)' }}>
              {opsError || valueAddError}
            </p>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  // Check if we have the minimum data needed
  if (unitMixStats.totalUnits === 0) {
    return (
      <CCard>
        <CCardHeader>
          <h5 className="mb-0">Renovation Assumptions</h5>
        </CCardHeader>
        <CCardBody>
          <div
            className="rounded-lg px-4 py-6 text-center"
            style={{
              backgroundColor: 'var(--cui-tertiary-bg)',
            }}
          >
            <div className="text-4xl mb-3">🏠</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--cui-body-color)' }}>
              No Unit Data Available
            </h3>
            <p style={{ color: 'var(--cui-secondary-color)' }}>
              To configure renovation assumptions, first add unit types in the Rent Roll or Operations tab.
            </p>
          </div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div
        className="rounded-lg px-4 py-3 border"
        style={{
          backgroundColor: 'var(--cui-info-bg)',
          borderColor: 'var(--cui-info)',
        }}
      >
        <p className="text-sm mb-0" style={{ color: 'var(--cui-info)' }}>
          <strong>Value-Add Analysis:</strong> Configure renovation scope, costs, and timing.
          These assumptions drive the Post-Rehab column in the Operations tab.
        </p>
      </div>

      {/* Value Add Card */}
      <ValueAddCard
        isEnabled={valueAddState.isEnabled}
        state={valueAddState}
        calculated={valueAddCalculated}
        stats={unitMixStats}
        onToggle={handleToggle}
        onUpdate={handleUpdate}
        isLoading={isValueAddLoading}
        isSaving={isValueAddSaving}
      />

      {/* Save Status Indicator */}
      {isValueAddSaving && (
        <div className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          <CSpinner size="sm" className="me-2" />
          Saving changes...
        </div>
      )}
    </div>
  );
}

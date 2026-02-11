'use client';

/**
 * RenovationSubTab Component
 *
 * Displays renovation assumptions for VALUE_ADD analysis type projects.
 * Uses the existing ValueAddCard component with the useValueAddAssumptions hook.
 * Shows the Rental Income section below for real-time revenue preview.
 *
 * This component is only visible when analysis_type === 'VALUE_ADD'.
 *
 * @version 1.1
 * @created 2026-02-01
 * @updated 2026-02-03 - Added RentalIncomeSection for real-time preview
 */

import React, { useMemo } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react';
import { ValueAddCard } from '@/components/operations/ValueAddCard';
import { RentalIncomeSection } from '@/components/operations/RentalIncomeSection';
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
            style={{
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              border: '1px solid var(--cui-danger)',
              backgroundColor: 'var(--cui-danger-bg)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--cui-danger)' }}>
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
          <h5 style={{ margin: 0 }}>Renovation Assumptions</h5>
        </CCardHeader>
        <CCardBody>
          <div
            style={{
              borderRadius: '0.5rem',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              backgroundColor: 'var(--cui-tertiary-bg)',
            }}
          >
            <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>🏠</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--cui-body-color)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Value Add Card */}
      <ValueAddCard
        state={valueAddState}
        calculated={valueAddCalculated}
        stats={unitMixStats}
        onUpdate={handleUpdate}
        isLoading={isValueAddLoading}
        isSaving={isValueAddSaving}
      />

      {/* Save Status Indicator */}
      {isValueAddSaving && (
        <div style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}>
          <CSpinner size="sm" className="me-2" />
          Saving changes...
        </div>
      )}

      {/* Rental Income Preview - shows real-time impact of value-add assumptions */}
      {rentalRows.length > 0 && (
        <RentalIncomeSection
          rows={rentalRows}
          unitCount={unitMixStats.totalUnits}
          availableScenarios={['as_is', 'post_reno']}
          preferredScenario="as_is"
          valueAddEnabled={true}
          rentPremiumPct={valueAddState.rentPremiumPct}
          hasDetailedRentRoll={false}
          onUpdateRow={() => {}}
        />
      )}
    </div>
  );
}

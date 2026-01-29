'use client';

/**
 * Unified Assumptions Panel
 *
 * Wrapper component that renders appropriate assumptions sections
 * based on property type.
 *
 * CRE Projects:
 * - Delegates to existing AssumptionsPanel for Income/Expenses/Capitalization
 * - Uses shared DcfParametersSection backed by tbl_dcf_analysis
 *
 * Land Dev Projects:
 * - Revenue section (price growth rate set)
 * - Costs section (cost inflation rate set)
 * - Shared DcfParametersSection
 *
 * Session: QK-28
 */

import React from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import type { PropertyType } from '@/types/dcf-analysis';
import { useDcfAnalysisWithAutoSave } from '@/hooks/useDcfAnalysis';
import {
  DcfParametersSection,
  LandDevRevenueSection,
  LandDevCostsSection,
} from './assumptions';

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedAssumptionsPanelProps {
  projectId: number;
  propertyType: PropertyType;

  // For CRE: Pass through to existing sections
  // (These are optional - only used when CRE delegates to existing panel)
  creAssumptions?: Record<string, unknown>;
  creRentRoll?: { forward_gpr: number };
  creOperatingExpenses?: { total: number };
  onCreAssumptionChange?: (field: string, value: number | string) => void;
  isCreSaving?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UnifiedAssumptionsPanel({
  projectId,
  propertyType,
}: UnifiedAssumptionsPanelProps) {
  // DCF analysis data from tbl_dcf_analysis
  const {
    data: dcfData,
    isLoading: isDcfLoading,
    isSaving: isDcfSaving,
    updateField: updateDcfField,
  } = useDcfAnalysisWithAutoSave(projectId);

  const isLandDev = propertyType === 'land_dev';

  return (
    <CCard
      className="h-full overflow-y-auto"
      style={{ background: 'var(--cui-card-bg)', border: 'none', borderRadius: 0 }}
    >
      <CCardHeader
        className="d-flex justify-content-between align-items-center"
        style={{
          background: 'var(--cui-tertiary-bg)',
          borderBottom: '1px solid var(--cui-border-color)',
          padding: '0.375rem 0.75rem',
          fontWeight: 600,
        }}
      >
        <span className="fw-semibold">Assumptions</span>
        {isDcfSaving && (
          <div
            className="text-xs flex items-center gap-2"
            style={{ color: 'var(--cui-primary)' }}
          >
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Saving...
          </div>
        )}
      </CCardHeader>
      <CCardBody style={{ padding: 0 }}>
        {isDcfLoading ? (
          <div className="p-3" style={{ color: 'var(--cui-secondary-color)' }}>
            Loading...
          </div>
        ) : isLandDev ? (
          // Land Development Sections
          <>
            <LandDevRevenueSection
              data={dcfData}
              onChange={updateDcfField}
              projectId={projectId}
              defaultOpen={true}
            />
            <LandDevCostsSection
              data={dcfData}
              onChange={updateDcfField}
              projectId={projectId}
              defaultOpen={true}
            />
            <DcfParametersSection
              data={dcfData}
              onChange={updateDcfField}
              propertyType={propertyType}
              defaultOpen={true}
            />
          </>
        ) : (
          // CRE: Only show DCF Parameters section here
          // Income/Expenses/Capitalization are handled by existing AssumptionsPanel
          <DcfParametersSection
            data={dcfData}
            onChange={updateDcfField}
            propertyType={propertyType}
            defaultOpen={true}
          />
        )}
      </CCardBody>
    </CCard>
  );
}

/**
 * Land Development Assumptions Panel
 *
 * Standalone panel for Land Dev projects.
 * Full implementation with all sections.
 */
export function LandDevAssumptionsPanel({ projectId }: { projectId: number }) {
  return <UnifiedAssumptionsPanel projectId={projectId} propertyType="land_dev" />;
}

/**
 * CRE DCF Parameters Panel
 *
 * Just the DCF Parameters section for CRE projects.
 * Use this alongside the existing AssumptionsPanel.
 */
export function CreDcfParametersPanel({ projectId }: { projectId: number }) {
  const {
    data: dcfData,
    isLoading,
    updateField,
  } = useDcfAnalysisWithAutoSave(projectId);

  if (isLoading) {
    return <div className="p-2" style={{ color: 'var(--cui-secondary-color)' }}>Loading...</div>;
  }

  return (
    <DcfParametersSection
      data={dcfData}
      onChange={updateField}
      propertyType="cre"
      defaultOpen={false}
    />
  );
}

export default UnifiedAssumptionsPanel;

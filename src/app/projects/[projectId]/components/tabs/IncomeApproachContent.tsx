'use client';

/**
 * IncomeApproachContent Component
 *
 * Wrapper component that uses the useIncomeApproach hook and renders
 * the Income Approach UI components. Separated from ValuationTab to
 * allow proper hook usage (hooks can't be called conditionally).
 *
 * Now supports both Direct Cap and DCF valuation methods.
 *
 * @created 2026-01-25
 * @updated DCF Implementation
 */

import { CCard, CCardBody } from '@coreui/react';
import { useIncomeApproach } from '@/hooks/useIncomeApproach';
import {
  AssumptionsPanel,
  DirectCapView,
} from '@/components/valuation/income-approach';
import { DCFView } from '@/components/valuation/income-approach/DCFView';

interface IncomeApproachContentProps {
  projectId: number;
}

export function IncomeApproachContent({ projectId }: IncomeApproachContentProps) {
  const {
    data,
    isLoading,
    isSaving,
    error,
    selectedBasis,
    setSelectedBasis,
    updateAssumption,
    reload,
    // DCF
    dcfData,
    isDCFLoading,
    activeMethod,
    setActiveMethod,
    fetchDCF,
    // Monthly DCF (for CashFlowGrid with time scale toggle)
    monthlyDcfData,
    isMonthlyDCFLoading,
  } = useIncomeApproach(projectId);

  // Get selected tile's calculation
  const selectedTile = data?.value_tiles.find((t) => t.id === selectedBasis);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--cui-secondary-color)' }}
      >
        <div
          style={{
            display: 'inline-block',
            width: '3rem',
            height: '3rem',
            borderRadius: '9999px',
            borderBottom: '2px solid var(--cui-primary)',
            marginBottom: '1rem',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: '1rem' }}>Loading Income Approach data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <CCard style={{ borderColor: 'var(--cui-danger)' }}>
        <CCardBody
          style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3
            style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}
          >
            Error Loading Income Approach Data
          </h3>
          <p style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={reload}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 500,
              borderRadius: '0.25rem',
              fontSize: '0.9375rem',
              backgroundColor: 'var(--cui-danger)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </CCardBody>
      </CCard>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="folder-content-placeholder">
        <div className="folder-content-placeholder-icon">💰</div>
        <h2>No Income Approach Data</h2>
        <p>No income approach data is available for this project.</p>
      </div>
    );
  }

  return (
    <div className="income-approach-content">
      {/* Saving indicator */}
      {isSaving && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 50,
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
          }}
        >
          <div
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '9999px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.875rem' }}>Saving...</span>
        </div>
      )}

      {/* Two-Panel Layout: 30/70 Split */}
      <div className="d-flex" style={{ gap: '1.5rem', minHeight: '600px' }}>
        {/* Left Panel - Assumptions */}
        <div
          style={{
            width: '26%',
            minWidth: '280px',
            maxWidth: '340px',
            flexShrink: 0,
            borderRadius: '0.5rem',
            overflow: 'hidden',
            backgroundColor: 'var(--cui-card-bg)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          <AssumptionsPanel
            assumptions={data.assumptions}
            rentRoll={data.rent_roll}
            operatingExpenses={data.operating_expenses}
            onAssumptionChange={updateAssumption}
            isLoading={isLoading}
            isSaving={isSaving}
            activeMethod={activeMethod}
            onMethodChange={setActiveMethod}
          />
        </div>

        {/* Right Panel - Results (70%) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeMethod === 'direct_cap' && selectedTile && (
            <DirectCapView
              calculation={selectedTile.calculation}
              value={selectedTile.value}
              capRate={selectedTile.cap_rate}
              propertySummary={data.property_summary}
              rentRollItems={data.rent_roll.items}
              opexItems={data.operating_expenses.items}
              sensitivityMatrix={data.sensitivity_matrix}
              keyMetrics={data.key_metrics}
              selectedBasis={selectedBasis}
              allTiles={data.value_tiles}
              onMethodChange={setActiveMethod}
            />
          )}
          {activeMethod === 'dcf' && (
            <DCFView
              data={dcfData!}
              propertySummary={data.property_summary}
              isLoading={isDCFLoading || isMonthlyDCFLoading}
              onMethodChange={setActiveMethod}
              monthlyData={monthlyDcfData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default IncomeApproachContent;

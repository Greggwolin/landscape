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
  ValueTiles,
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
        className="text-center py-20"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        <div
          className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
          style={{ borderColor: 'var(--cui-primary)' }}
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
          className="p-6 text-center"
          style={{ backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}
        >
          <div className="text-5xl mb-4">⚠️</div>
          <h3
            className="font-bold mb-2"
            style={{ fontSize: '1.25rem' }}
          >
            Error Loading Income Approach Data
          </h3>
          <p style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={reload}
            className="px-4 py-2 font-medium rounded"
            style={{
              fontSize: '0.9375rem',
              backgroundColor: 'var(--cui-danger)',
              color: 'white',
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
          className="fixed top-4 right-4 z-50 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{
            backgroundColor: 'var(--cui-primary)',
            color: 'white',
          }}
        >
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}

      {/* Value Tiles - Including DCF */}
      <ValueTiles
        tiles={data.value_tiles}
        selectedBasis={selectedBasis}
        onSelectBasis={setSelectedBasis}
        unitCount={data.property_summary.unit_count}
        dcfData={dcfData}
        isDCFLoading={isDCFLoading}
        activeMethod={activeMethod}
        onMethodChange={setActiveMethod}
      />

      {/* Two-Panel Layout: 30/70 Split */}
      <div className="flex gap-6 mt-6" style={{ minHeight: '600px' }}>
        {/* Left Panel - Assumptions (24% - reduced from 30%) */}
        <div
          className="flex-shrink-0 rounded-lg overflow-hidden"
          style={{
            width: '24%',
            minWidth: '260px',
            maxWidth: '320px',
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
          />
        </div>

        {/* Right Panel - Results (70%) */}
        <div className="flex-1 min-w-0">
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

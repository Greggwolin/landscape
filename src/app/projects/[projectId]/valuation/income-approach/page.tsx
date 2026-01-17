'use client';

/**
 * Income Approach Valuation Page
 *
 * Standalone route for comprehensive Income Approach valuation analysis.
 * Displays four simultaneous NOI valuations with detailed P&L breakdown.
 *
 * Route: /projects/[projectId]/valuation/income-approach
 * Session: QK-11
 */

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CCard, CCardBody } from '@coreui/react';

import { useIncomeApproach } from '@/hooks/useIncomeApproach';
import {
  ValueTiles,
  AssumptionsPanel,
  DirectCapView,
} from '@/components/valuation/income-approach';

export default function IncomeApproachPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  const {
    data,
    isLoading,
    isSaving,
    error,
    selectedBasis,
    setSelectedBasis,
    updateAssumption,
    reload,
  } = useIncomeApproach(projectId);

  // Get selected tile's calculation
  const selectedTile = data?.value_tiles.find((t) => t.id === selectedBasis);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <div className="text-center">
          <div
            className="inline-block w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: 'var(--cui-primary)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--cui-secondary-color)' }}>Loading Income Approach data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <CCard style={{ maxWidth: '400px' }}>
          <CCardBody className="text-center p-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cui-danger)' }}>
              Error Loading Data
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
              {error}
            </p>
            <button
              onClick={reload}
              className="px-4 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--cui-primary)', color: 'white' }}
            >
              Try Again
            </button>
          </CCardBody>
        </CCard>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
      {/* Header */}
      <header
        className="px-6 py-4 border-b sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/projects/${projectId}/valuation`)}
              className="p-2 rounded hover:bg-opacity-10"
              style={{ color: 'var(--cui-secondary-color)' }}
              title="Back to Valuation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: 'var(--cui-body-color)' }}
              >
                Income Approach
              </h1>
              <p
                className="text-sm"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                {data.project_name} • {data.property_summary.unit_count} units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Saving indicator */}
            {isSaving && (
              <span
                className="text-xs flex items-center gap-1"
                style={{ color: 'var(--cui-primary)' }}
              >
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            )}

            {/* Refresh button */}
            <button
              onClick={reload}
              className="px-3 py-1.5 text-sm rounded flex items-center gap-2"
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                border: '1px solid var(--cui-border-color)',
                color: 'var(--cui-body-color)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>

            {/* Help button */}
            <button
              className="p-2 rounded"
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                border: '1px solid var(--cui-border-color)',
                color: 'var(--cui-secondary-color)',
              }}
              title="Help"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Value Tiles */}
        <ValueTiles
          tiles={data.value_tiles}
          selectedBasis={selectedBasis}
          onSelectBasis={setSelectedBasis}
          unitCount={data.property_summary.unit_count}
        />

        {/* Two-Panel Layout */}
        <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {/* Left Panel - Assumptions (30%) */}
          <div
            className="flex-shrink-0 rounded-lg overflow-hidden"
            style={{
              width: '30%',
              minWidth: '320px',
              maxWidth: '400px',
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
            {selectedTile && (
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
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

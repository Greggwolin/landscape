/**
 * ValuationTab Component
 *
 * Displays the three approaches to value: Sales Comparison, Cost, Income.
 * Fully controlled component - activeTab is managed by parent via URL params.
 *
 * @version 2.1
 * @created 2026-01-23
 * @updated 2026-01-25 - Wired up Income Approach with actual components
 */

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import { getValuationSummary } from '@/lib/api/valuation';
import type { ValuationSummary } from '@/types/valuation';
import { SalesComparisonApproach } from '../../valuation/components/SalesComparisonApproach';
import { CostApproachTab } from '../../valuation/components/CostApproach/CostApproachTab';
import { IncomeApproachContent } from './IncomeApproachContent';
import { ReconciliationPanel } from '../../valuation/components/ReconciliationPanel';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';

interface ValuationTabProps {
  project: any;
  /** Active sub-tab ID - controlled by parent (URL params) */
  activeTab?: string;
}

/**
 * Normalize tab ID to internal format
 * Maps folder tab IDs to component-expected values
 */
function normalizeTab(tab?: string): 'sales-comparison' | 'cost' | 'income' | 'reconciliation' {
  switch (tab) {
    case 'sales':
    case 'sales-comparison':
      return 'sales-comparison';
    case 'cost':
      return 'cost';
    case 'income':
      return 'income';
    case 'reconciliation':
      return 'reconciliation';
    default:
      return 'sales-comparison';
  }
}

function ValuationTab({ project, activeTab = 'sales' }: ValuationTabProps) {
  const projectId = project.project_id;
  const [valuationData, setValuationData] = useState<ValuationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize the activeTab from URL
  const normalizedTab = normalizeTab(activeTab);

  // Fetch valuation data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getValuationSummary(projectId);
      setValuationData(data);
    } catch (err) {
      console.error('Error fetching valuation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load valuation data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, fetchData]);

  // Auto-refresh when Landscaper mutates relevant data
  useLandscaperRefresh(
    projectId,
    ['units', 'leases', 'unit_types', 'operating_expenses', 'dcf_analysis', 'cashflow', 'rental_comps', 'sales_comps', 'project'],
    fetchData
  );

  // Loading state
  if (loading) {
    return (
      <div
        className="text-center py-20"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        <div
          className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
          style={{ borderColor: 'var(--cui-primary)' }}
        />
        <p style={{ fontSize: '1rem' }}>Loading valuation data...</p>
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
            Error Loading Valuation Data
          </h3>
          <p style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={fetchData}
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
  if (!valuationData) {
    return (
      <div className="folder-content-placeholder">
        <div className="folder-content-placeholder-icon">📊</div>
        <h2>No Valuation Data</h2>
        <p>No valuation data is available for this project.</p>
      </div>
    );
  }

  // Render content based on active tab
  return (
    <>
      {normalizedTab === 'sales-comparison' && (
        <SalesComparisonApproach
          projectId={projectId}
          comparables={valuationData.sales_comparables}
          reconciliation={valuationData.reconciliation}
          onRefresh={fetchData}
        />
      )}

      {normalizedTab === 'cost' && (
        <CostApproachTab projectId={projectId} />
      )}

      {normalizedTab === 'income' && (
        <IncomeApproachContent projectId={projectId} />
      )}

      {normalizedTab === 'reconciliation' && (
        <ReconciliationPanel
          projectId={projectId}
          valuationData={valuationData}
          onRefresh={fetchData}
        />
      )}
    </>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(ValuationTab);

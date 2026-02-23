/**
 * ValuationTab Component
 *
 * Displays the three approaches to value: Sales Comparison, Cost, Income.
 * Fully controlled component - activeTab is managed by parent via URL params.
 *
 * For NNN SLB projects (detected via property_subtype), the Income Approach
 * tab renders NNNIncomeApproach with Level 3 sub-sub tabs, and Reconciliation
 * renders NNNReconciliation. Cost Approach shows "Not Applicable" empty state.
 *
 * @version 2.2
 * @created 2026-01-23
 * @updated 2026-02-23 - Added NNN SLB Income Approach + Reconciliation routing
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
import { isNNNProject } from '@/components/valuation/nnn/nnnDetection';
import NNNIncomeApproach from '@/components/valuation/nnn/NNNIncomeApproach';
import NNNReconciliation from '@/components/valuation/nnn/NNNReconciliation';
import NNNCashFlow from '@/components/valuation/nnn/NNNCashFlow';
import NNNComparableSales from '@/components/valuation/nnn/NNNComparableSales';

/**
 * NNN Cost Approach empty state — "Not Applicable" for NNN SLB
 */
function NNNCostApproachEmpty() {
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1060 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cui-body-color)', marginBottom: 18 }}>
        Cost Approach
      </div>
      <div style={{
        backgroundColor: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: 7,
        textAlign: 'center',
        padding: '52px 20px',
        color: 'var(--cui-secondary-color)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.2 }}>⊘</div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--cui-body-color)' }}>
          Cost Approach Not Applicable
        </div>
        <div style={{ fontSize: 12, maxWidth: 380, margin: '0 auto', lineHeight: 1.65 }}>
          NNN SLB value is a function of the rent stream and tenant credit quality — not replacement cost.
          Excluded from reconciliation with 0% weight.
        </div>
      </div>
    </div>
  );
}

interface ValuationTabProps {
  project: any;
  /** Active sub-tab ID - controlled by parent (URL params) */
  activeTab?: string;
}

/**
 * Normalize tab ID to internal format
 * Maps folder tab IDs to component-expected values
 */
function normalizeTab(tab?: string): 'sales-comparison' | 'cost' | 'income' | 'reconciliation' | 'cash-flow' | 'comparable-sales' {
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
    case 'cash-flow':
      return 'cash-flow';
    case 'comparable-sales':
      return 'comparable-sales';
    default:
      return 'sales-comparison';
  }
}

function ValuationTab({ project, activeTab = 'sales' }: ValuationTabProps) {
  const projectId = project.project_id;
  const isNNN = isNNNProject(project);
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
        isNNN ? (
          <NNNCostApproachEmpty />
        ) : (
          <CostApproachTab projectId={projectId} />
        )
      )}

      {normalizedTab === 'income' && (
        isNNN ? (
          <NNNIncomeApproach projectId={projectId} project={project} />
        ) : (
          <IncomeApproachContent projectId={projectId} />
        )
      )}

      {normalizedTab === 'reconciliation' && (
        isNNN ? (
          <NNNReconciliation />
        ) : (
          <ReconciliationPanel
            projectId={projectId}
            valuationData={valuationData}
            onRefresh={fetchData}
          />
        )
      )}

      {normalizedTab === 'cash-flow' && isNNN && (
        <NNNCashFlow projectId={projectId} project={project} />
      )}

      {normalizedTab === 'comparable-sales' && (
        isNNN ? (
          <NNNComparableSales />
        ) : (
          <SalesComparisonApproach
            projectId={projectId}
            comparables={valuationData.sales_comparables}
            reconciliation={valuationData.reconciliation}
            onRefresh={fetchData}
          />
        )
      )}
    </>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(ValuationTab);

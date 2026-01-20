/**
 * ValuationTab Component
 *
 * Wrapper for the Valuation feature to integrate within the Project page tabs.
 * Displays the three approaches to value: Sales Comparison, Cost, Income.
 */

'use client';

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { CCard, CCardBody } from '@coreui/react';
import { getValuationSummary } from '@/lib/api/valuation';
import type { ValuationSummary } from '@/types/valuation';
import { SalesComparisonApproach } from '../../valuation/components/SalesComparisonApproach';

type Tab = 'sales-comparison' | 'cost' | 'income';

interface TabConfig {
  id: Tab;
  label: string;
  enabled: boolean;
  isLink?: boolean;
}

interface ValuationTabProps {
  project: any;
}

function ValuationTab({ project }: ValuationTabProps) {
  const router = useRouter();
  const projectId = project.project_id;
  const [activeTab, setActiveTab] = useState<Tab>('sales-comparison');
  const [valuationData, setValuationData] = useState<ValuationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch valuation data
  const fetchData = async () => {
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
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const tabs: TabConfig[] = [
    { id: 'sales-comparison', label: 'Sales Comparison', enabled: true },
    { id: 'cost', label: 'Cost Approach', enabled: false },
    { id: 'income', label: 'Income Approach', enabled: true, isLink: true }
  ];

  // Handle tab click - navigate to standalone page if isLink
  const handleTabClick = (tab: TabConfig) => {
    if (!tab.enabled) return;

    if (tab.isLink) {
      // Navigate to standalone page
      router.push(`/projects/${projectId}/valuation/${tab.id === 'income' ? 'income-approach' : tab.id}`);
    } else {
      setActiveTab(tab.id);
    }
  };

  return (
    <div>
      {/* Sub-Tab Bar for Valuation Approaches */}
      <div
        className="border-b mb-6"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              disabled={!tab.enabled}
              className="px-4 py-3 text-sm font-medium transition-colors relative"
              style={{
                color: activeTab === tab.id
                  ? 'var(--cui-primary)'
                  : tab.enabled
                  ? 'var(--cui-body-color)'
                  : 'var(--cui-secondary-color)',
                opacity: tab.enabled ? 1 : 0.5,
                cursor: tab.enabled ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => {
                if (tab.enabled && activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--cui-primary)';
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                if (tab.enabled && activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--cui-body-color)';
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              {tab.label}
              {!tab.enabled && (
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--cui-warning-bg)',
                    color: 'var(--cui-warning)'
                  }}
                >
                  Coming Soon
                </span>
              )}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--cui-primary)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div
          className="text-center py-20"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--cui-primary)' }} />
          <p className="text-lg">Loading valuation data...</p>
        </div>
      )}

      {error && !loading && (
        <CCard style={{ borderColor: 'var(--cui-danger)' }}>
          <CCardBody className="p-6 text-center" style={{ backgroundColor: 'var(--cui-danger-bg)', color: 'var(--cui-danger)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold mb-2">Error Loading Valuation Data</h3>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm font-medium rounded"
              style={{
                backgroundColor: 'var(--cui-danger)',
                color: 'white'
              }}
            >
              Try Again
            </button>
          </CCardBody>
        </CCard>
      )}

      {!loading && !error && valuationData && (
        <>
          {activeTab === 'sales-comparison' && (
            <SalesComparisonApproach
              projectId={projectId}
              comparables={valuationData.sales_comparables}
              reconciliation={valuationData.reconciliation}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'cost' && (
            <CCard>
              <CCardBody className="text-center py-20">
                <div className="text-6xl mb-4">🏗️</div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: 'var(--cui-body-color)' }}
                >
                  Cost Approach
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--cui-secondary-color)' }}
                >
                  Coming in Phase 2
                </p>
              </CCardBody>
            </CCard>
          )}

          {activeTab === 'income' && (
            <CCard>
              <CCardBody className="text-center py-20">
                <div className="text-6xl mb-4">💰</div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: 'var(--cui-body-color)' }}
                >
                  Income Approach
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--cui-secondary-color)' }}
                >
                  Coming in Phase 2
                </p>
              </CCardBody>
            </CCard>
          )}
        </>
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(ValuationTab);

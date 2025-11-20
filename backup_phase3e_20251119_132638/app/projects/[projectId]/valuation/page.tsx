/**
 * Valuation Page
 *
 * Main page for property valuation using three approaches to value:
 * - Sales Comparison Approach (MVP - Phase 1)
 * - Cost Approach (Phase 2)
 * - Income Approach (Phase 2)
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import { getValuationSummary } from '@/lib/api/valuation';
import type { ValuationSummary } from '@/types/valuation';
import { SalesComparisonApproach } from './components/SalesComparisonApproach';

type Tab = 'sales-comparison' | 'cost' | 'income';

export default function ValuationPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const [activeView, setActiveView] = useState('project-overview');
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

  const tabs: { id: Tab; label: string; enabled: boolean }[] = [
    { id: 'sales-comparison', label: 'Sales Comparison', enabled: true },
    { id: 'cost', label: 'Cost Approach', enabled: false },
    { id: 'income', label: 'Income Approach', enabled: false }
  ];

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
    >
      <Navigation activeView={activeView} setActiveView={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Project Header */}
        <div
          className="px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--cui-body-color)' }}
              >
                Property Valuation
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Project #{projectId} - Three Approaches to Value
              </p>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm font-medium rounded transition-colors flex items-center gap-2"
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                borderColor: 'var(--cui-border-color)',
                border: '1px solid',
                color: 'var(--cui-body-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cui-tertiary-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cui-card-bg)';
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Loading...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div
          className="border-b"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="px-6 flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.enabled && setActiveTab(tab.id)}
                disabled={!tab.enabled}
                className="px-5 py-3 text-sm font-medium transition-colors relative rounded-t-lg"
                style={{
                  color: activeTab === tab.id
                    ? 'var(--cui-primary)'
                    : tab.enabled
                    ? 'var(--cui-secondary-color)'
                    : 'var(--cui-secondary-color)',
                  backgroundColor: activeTab === tab.id
                    ? 'var(--cui-tertiary-bg)'
                    : 'transparent',
                  borderBottom: activeTab === tab.id
                    ? '3px solid var(--cui-primary)'
                    : '3px solid transparent',
                  opacity: tab.enabled ? 1 : 0.5,
                  cursor: tab.enabled ? 'pointer' : 'not-allowed',
                  marginBottom: '-1px'
                }}
                onMouseEnter={(e) => {
                  if (tab.enabled && activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'var(--hover-overlay)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tab.enabled && activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
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
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Loading State */}
            {loading && (
              <div
                className="text-center py-20"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: 'var(--cui-primary)' }} />
                <p className="text-lg">Loading valuation data...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div
                className="rounded-lg p-6 border text-center"
                style={{
                  backgroundColor: 'var(--cui-danger-bg)',
                  borderColor: 'var(--cui-danger)',
                  color: 'var(--cui-danger)'
                }}
              >
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
              </div>
            )}

            {/* Content */}
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
                  <div
                    className="text-center py-20 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--cui-card-bg)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
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
                  </div>
                )}

                {activeTab === 'income' && (
                  <div
                    className="text-center py-20 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--cui-card-bg)',
                      borderColor: 'var(--cui-border-color)'
                    }}
                  >
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
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FeasibilityTab Component
 *
 * Wrapper for the Feasibility analysis feature for Land Development projects.
 * Displays three analysis approaches: Sales Comparison, Residual Land Value, and Cash Flow (DCF).
 */

'use client';

import { useState, memo } from 'react';

type Tab = 'sales-comparison' | 'residual' | 'cash-flow';

interface FeasibilityTabProps {
  project: any;
}

function FeasibilityTab({ project }: FeasibilityTabProps) {
  const projectId = project.project_id;
  const [activeTab, setActiveTab] = useState<Tab>('sales-comparison');

  const tabs: { id: Tab; label: string; enabled: boolean }[] = [
    { id: 'sales-comparison', label: 'Sales Comparison', enabled: false },
    { id: 'residual', label: 'Residual Land Value', enabled: false },
    { id: 'cash-flow', label: 'Cash Flow Analysis', enabled: false }
  ];

  return (
    <div>
      {/* Sub-Tab Bar for Feasibility Approaches */}
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
              onClick={() => tab.enabled && setActiveTab(tab.id)}
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
      {activeTab === 'sales-comparison' && (
        <div
          className="text-center py-20 rounded-lg border"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="text-6xl mb-4">🏘️</div>
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Sales Comparison Approach
          </h3>
          <p
            className="text-sm mb-2"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Analyze comparable land sales and finished lot values
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Coming Soon
          </p>
        </div>
      )}

      {activeTab === 'residual' && (
        <div
          className="text-center py-20 rounded-lg border"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="text-6xl mb-4">🧮</div>
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Residual Land Value
          </h3>
          <p
            className="text-sm mb-2"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Calculate land value by deducting development costs from finished product value
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Coming Soon
          </p>
        </div>
      )}

      {activeTab === 'cash-flow' && (
        <div
          className="text-center py-20 rounded-lg border"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="text-6xl mb-4">📊</div>
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--cui-body-color)' }}
          >
            Cash Flow Analysis (DCF)
          </h3>
          <p
            className="text-sm mb-2"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Discounted cash flow analysis with phased revenue and cost projections
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--cui-secondary-color)' }}
          >
            Coming Soon
          </p>
        </div>
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(FeasibilityTab);

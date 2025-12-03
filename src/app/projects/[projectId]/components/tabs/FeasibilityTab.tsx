/**
 * FeasibilityTab Component
 *
 * Wrapper for the Feasibility analysis feature for Land Development projects.
 * Displays four analysis approaches: Validation Report, Cash Flow (DCF), Sales Comparison, and Residual Land Value.
 */

'use client';

import { useState, memo } from 'react';
import { ExportButton } from '@/components/admin';
import MarketDataContent from '@/components/feasibility/MarketDataContent';
import { CashFlowAnalysisTab } from '@/components/analysis/cashflow';
import ValidationReport from '@/components/analysis/validation/ValidationReport';

type Tab = 'validation' | 'cash-flow' | 'sales-comparison' | 'residual';

interface FeasibilityTabProps {
  project: any;
}

function FeasibilityTab({ project }: FeasibilityTabProps) {
  const projectId = project.project_id;
  const isLandDevelopment = project.project_type_code === 'LAND';
  const [activeTab, setActiveTab] = useState<Tab>('validation');

  const tabs: { id: Tab; label: string; enabled: boolean }[] = [
    { id: 'validation', label: 'Validation Report', enabled: true },
    { id: 'cash-flow', label: 'Cash Flow Analysis', enabled: true },
    { id: 'sales-comparison', label: 'Sales Comparison', enabled: true },
    { id: 'residual', label: 'Residual Land Value', enabled: false }
  ];

  // Show message for non-land development projects
  if (!isLandDevelopment) {
    const projectTypeLabels: Record<string, string> = {
      'MF': 'Multifamily',
      'OFF': 'Office',
      'RET': 'Retail',
      'IND': 'Industrial',
      'MXD': 'Mixed-Use',
      'HOT': 'Hospitality'
    };

    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-2xl mx-auto text-center p-8">
          <div
            className="rounded-lg border p-12"
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              borderColor: 'var(--cui-border-color)'
            }}
          >
            <div className="text-6xl mb-6">🏗️</div>
            <h2
              className="text-2xl font-semibold mb-3"
              style={{ color: 'var(--cui-body-color)' }}
            >
              {projectTypeLabels[project.project_type_code] || 'Commercial'} Feasibility Tab Not Available
            </h2>
            <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
              This project is a <strong>{projectTypeLabels[project.project_type_code] || project.project_type_code}</strong> asset type.
            </p>
            <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
              The Feasibility tab is specifically designed for <strong>Land Development</strong> projects only.
              It includes Sales Comparison, Residual Land Value, and Cash Flow (DCF) analysis for raw land and finished lots.
            </p>
            <div
              className="p-4 rounded text-left"
              style={{
                backgroundColor: 'var(--cui-info-bg)',
                borderLeft: '4px solid var(--cui-info)'
              }}
            >
              <p
                className="text-sm mb-2"
                style={{ color: 'var(--cui-info)' }}
              >
                <strong>For {projectTypeLabels[project.project_type_code]?.toLowerCase() || 'this asset type'} properties, use:</strong>
              </p>
              <ul
                className="text-sm ml-4"
                style={{
                  color: 'var(--cui-body-color)',
                  listStyleType: 'disc'
                }}
              >
                <li>Valuation tab for property appraisal</li>
                <li>Budget tab for development cost planning</li>
                <li>Financial Analysis for cash flow modeling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Export Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Feasibility Analysis</h2>
        <ExportButton tabName="Feasibility" projectId={projectId.toString()} />
      </div>

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
      {activeTab === 'validation' && (
        <ValidationReport projectId={projectId} />
      )}

      {activeTab === 'cash-flow' && (
        <CashFlowAnalysisTab projectId={projectId} />
      )}

      {activeTab === 'sales-comparison' && (
        <MarketDataContent projectId={projectId} />
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
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export default memo(FeasibilityTab);

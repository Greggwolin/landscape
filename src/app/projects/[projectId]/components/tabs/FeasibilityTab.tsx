/**
 * FeasibilityTab Component
 *
 * Controlled component for Feasibility analysis (Land Development projects).
 * Renders content based on activeTab prop - navigation is handled by folder tabs.
 *
 * Subtabs (controlled by folder tabs Row 2):
 * - cashflow: Cash Flow / DCF Analysis
 * - returns: Returns Analysis (Coming Soon)
 * - sensitivity: Sensitivity Analysis (Coming Soon)
 *
 * @version 2.0
 * @updated 2026-01-23 - Converted to controlled component
 */

'use client';

import { memo } from 'react';
import { ExportButton } from '@/components/admin';
import { CashFlowAnalysisTab } from '@/components/analysis/cashflow';
import { UnifiedAssumptionsPanel } from '@/components/valuation/UnifiedAssumptionsPanel';

interface FeasibilityTabProps {
  project: {
    project_id: number;
    project_name?: string;
    project_type_code?: string;
    [key: string]: unknown;
  };
  /** Active subtab - controlled by folder tabs */
  activeTab?: string;
}

function FeasibilityTab({ project, activeTab = 'cashflow' }: FeasibilityTabProps) {
  const projectId = project.project_id;
  const isLandDevelopment = project.project_type_code === 'LAND';

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
              {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Feasibility Tab Not Available
            </h2>
            <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
              This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
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
                <strong>For {projectTypeLabels[project.project_type_code || '']?.toLowerCase() || 'this asset type'} properties, use:</strong>
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

  // Render content based on activeTab prop (controlled by folder tabs)
  const renderContent = () => {
    switch (activeTab) {
      case 'cashflow':
        return (
          <div className="d-flex" style={{ gap: '1rem' }}>
            {/* Left: Assumptions Panel */}
            <div style={{ width: '280px', flexShrink: 0 }}>
              <UnifiedAssumptionsPanel
                projectId={projectId}
                propertyType="land_dev"
              />
            </div>
            {/* Right: Cash Flow Analysis - title removed, export button moved inside */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <CashFlowAnalysisTab
                projectId={projectId}
                exportButton={<ExportButton tabName="Feasibility-CashFlow" projectId={projectId.toString()} />}
              />
            </div>
          </div>
        );

      case 'returns':
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">Returns Analysis</h2>
              <ExportButton tabName="Feasibility-Returns" projectId={projectId.toString()} />
            </div>
            <div
              className="text-center py-20 rounded-lg border"
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                borderColor: 'var(--cui-border-color)'
              }}
            >
              <div className="text-6xl mb-4">📈</div>
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--cui-body-color)' }}
              >
                Returns Analysis
              </h3>
              <p
                className="text-sm mb-2"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                IRR, NPV, and equity multiple calculations
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Coming Soon
              </p>
            </div>
          </div>
        );

      case 'sensitivity':
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">Sensitivity Analysis</h2>
              <ExportButton tabName="Feasibility-Sensitivity" projectId={projectId.toString()} />
            </div>
            <div
              className="text-center py-20 rounded-lg border"
              style={{
                backgroundColor: 'var(--cui-card-bg)',
                borderColor: 'var(--cui-border-color)'
              }}
            >
              <div className="text-6xl mb-4">📐</div>
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--cui-body-color)' }}
              >
                Sensitivity Analysis
              </h3>
              <p
                className="text-sm mb-2"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Analyze how changes in key assumptions affect project returns
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Coming Soon
              </p>
            </div>
          </div>
        );

      default:
        // Default to cashflow
        return (
          <div className="d-flex" style={{ gap: '1rem' }}>
            {/* Left: Assumptions Panel */}
            <div style={{ width: '280px', flexShrink: 0 }}>
              <UnifiedAssumptionsPanel
                projectId={projectId}
                propertyType="land_dev"
              />
            </div>
            {/* Right: Cash Flow Analysis - title removed, export button moved inside */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <CashFlowAnalysisTab
                projectId={projectId}
                exportButton={<ExportButton tabName="Feasibility-CashFlow" projectId={projectId.toString()} />}
              />
            </div>
          </div>
        );
    }
  };

  return renderContent();
}

// Export memoized version to prevent unnecessary re-renders
export default memo(FeasibilityTab);

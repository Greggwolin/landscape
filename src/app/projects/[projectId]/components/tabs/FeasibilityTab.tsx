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

import { memo, useState, useCallback } from 'react';
import { CAlert, CCard, CCardBody, CContainer } from '@coreui/react';
import { ExportButton } from '@/components/admin';
import { CashFlowAnalysisTab } from '@/components/analysis/cashflow';
import { UnifiedAssumptionsPanel } from '@/components/valuation/UnifiedAssumptionsPanel';
import type { CashFlowSummary } from '@/components/valuation/assumptions';

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

  // Cash flow summary state for Results section in Assumptions panel
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary | null>(null);

  const handleSummaryChange = useCallback((data: { summary: any; discountRate?: number } | null) => {
    if (data?.summary) {
      setCashFlowSummary({
        grossProfit: data.summary.grossProfit,
        irr: data.summary.irr,
        peakEquity: data.summary.peakEquity,
        npv: data.summary.npv,
        discountRate: data.discountRate,
      });
    } else {
      setCashFlowSummary(null);
    }
  }, []);

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
      <CContainer className="py-5 d-flex justify-content-center">
        <div style={{ maxWidth: '640px', width: '100%' }}>
          <CCard>
            <CCardBody style={{ padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🏗️</div>
              <h4 className="mb-3">
                {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Feasibility Tab Not Available
              </h4>
              <p className="mb-2">
                This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
              </p>
              <p className="mb-4" style={{ color: 'var(--cui-secondary-color)' }}>
                The Feasibility tab is specifically designed for <strong>Land Development</strong> projects only.
                It includes Sales Comparison, Residual Land Value, and Cash Flow (DCF) analysis for raw land and finished lots.
              </p>
              <CAlert color="info" className="text-start mb-0">
                <strong>For {projectTypeLabels[project.project_type_code || '']?.toLowerCase() || 'this asset type'} properties, use:</strong>
                <ul className="mb-0 mt-2 ps-3">
                  <li>Valuation tab for property appraisal</li>
                  <li>Budget tab for development cost planning</li>
                  <li>Financial Analysis for cash flow modeling</li>
                </ul>
              </CAlert>
            </CCardBody>
          </CCard>
        </div>
      </CContainer>
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
                cashFlowSummary={cashFlowSummary ?? undefined}
              />
            </div>
            {/* Right: Cash Flow Analysis - title removed, export button moved inside */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <CashFlowAnalysisTab
                projectId={projectId}
                exportButton={<ExportButton tabName="Feasibility-CashFlow" projectId={projectId.toString()} />}
                onSummaryChange={handleSummaryChange}
              />
            </div>
          </div>
        );

      case 'returns':
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="mb-0">Returns Analysis</h4>
              <ExportButton tabName="Feasibility-Returns" projectId={projectId.toString()} />
            </div>
            <CCard>
              <CCardBody style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                <h5 className="mb-2">Returns Analysis</h5>
                <p className="mb-1" style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}>
                  IRR, NPV, and equity multiple calculations
                </p>
                <p className="mb-0" style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  Coming Soon
                </p>
              </CCardBody>
            </CCard>
          </div>
        );

      case 'sensitivity':
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="mb-0">Sensitivity Analysis</h4>
              <ExportButton tabName="Feasibility-Sensitivity" projectId={projectId.toString()} />
            </div>
            <CCard>
              <CCardBody style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📐</div>
                <h5 className="mb-2">Sensitivity Analysis</h5>
                <p className="mb-1" style={{ fontSize: '0.875rem', color: 'var(--cui-secondary-color)' }}>
                  Analyze how changes in key assumptions affect project returns
                </p>
                <p className="mb-0" style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  Coming Soon
                </p>
              </CCardBody>
            </CCard>
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
                cashFlowSummary={cashFlowSummary ?? undefined}
              />
            </div>
            {/* Right: Cash Flow Analysis - title removed, export button moved inside */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <CashFlowAnalysisTab
                projectId={projectId}
                exportButton={<ExportButton tabName="Feasibility-CashFlow" projectId={projectId.toString()} />}
                onSummaryChange={handleSummaryChange}
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

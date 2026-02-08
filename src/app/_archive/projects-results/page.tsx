'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { SalesComparisonApproach } from '../valuation/components/SalesComparisonApproach';

/**
 * Project Results Page
 *
 * Combines land sales comparison analysis, feasibility metrics, and valuation summary.
 * This page provides the culmination of project analysis and value conclusions.
 */
export default function ProjectResultsPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const [activeSection, setActiveSection] = useState<'sales-comp' | 'feasibility' | 'valuation'>('sales-comp');

  return (
    <div className="app-content">
      {/* Page Header */}
      <div className="mb-4">
        <h4 className="mb-1">Project Results</h4>
        <p className="text-muted mb-0">
          Land valuation, feasibility analysis, and project performance metrics
        </p>
      </div>

      {/* Section Tabs */}
      <ul
        className="nav nav-tabs sticky border-bottom"
        style={{
          top: '163px',
          zIndex: 30,
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)'
        }}
      >
        <li className="nav-item">
          <button
            className={`nav-link ${activeSection === 'sales-comp' ? 'active' : ''}`}
            onClick={() => setActiveSection('sales-comp')}
          >
            <i className="bi bi-graph-up me-2"></i>
            Sales Comparison
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeSection === 'feasibility' ? 'active' : ''}`}
            onClick={() => setActiveSection('feasibility')}
          >
            <i className="bi bi-calculator me-2"></i>
            Feasibility Analysis
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeSection === 'valuation' ? 'active' : ''}`}
            onClick={() => setActiveSection('valuation')}
          >
            <i className="bi bi-currency-dollar me-2"></i>
            Valuation Summary
          </button>
        </li>
      </ul>

      {/* Section 1: Sales Comparison Analysis */}
      {activeSection === 'sales-comp' && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Land Sales Comparison Analysis</h5>
            <p className="text-muted small mb-0 mt-1">
              Compare subject property to recent land sales with adjustments for differences
            </p>
          </div>
          <div className="card-body">
            <SalesComparisonApproach
              projectId={projectId}
              comparables={[]}
              reconciliation={null}
              mode="land"
            />
          </div>
        </div>
      )}

      {/* Section 2: Feasibility Analysis (Placeholder) */}
      {activeSection === 'feasibility' && (
        <div>
          <div className="alert alert-info">
            <h5><i className="bi bi-info-circle me-2"></i>Feasibility Analysis - Coming Soon</h5>
            <p className="mb-0">This section will display comprehensive feasibility metrics:</p>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-calendar-range me-2"></i>
                    Project Timeline
                  </h6>
                  <ul className="small mb-0">
                    <li>Total project duration</li>
                    <li>Phase timing and sequencing</li>
                    <li>Critical milestones</li>
                    <li>Completion forecast</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-cash-stack me-2"></i>
                    Financial Metrics
                  </h6>
                  <ul className="small mb-0">
                    <li>Total development cost</li>
                    <li>Total revenue potential</li>
                    <li>Gross profit margin</li>
                    <li>Return on cost (ROC)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-percent me-2"></i>
                    Investment Returns
                  </h6>
                  <ul className="small mb-0">
                    <li>Internal Rate of Return (IRR)</li>
                    <li>Equity multiple</li>
                    <li>Profit per unit/lot</li>
                    <li>Cash-on-cash return</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-speedometer me-2"></i>
                    Risk Analysis
                  </h6>
                  <ul className="small mb-0">
                    <li>Break-even analysis</li>
                    <li>Sensitivity testing</li>
                    <li>Market risk assessment</li>
                    <li>Contingency requirements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-graph-up-arrow" style={{ fontSize: '4rem', color: '#ccc' }}></i>
              <h4 className="mt-3 text-muted">Feasibility Dashboard Coming Soon</h4>
              <p className="text-muted">
                Interactive feasibility metrics and scenario analysis will be displayed here
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Valuation Summary (Placeholder) */}
      {activeSection === 'valuation' && (
        <div>
          <div className="alert alert-info">
            <h5><i className="bi bi-info-circle me-2"></i>Valuation Summary - Coming Soon</h5>
            <p className="mb-0">This section will display comprehensive valuation analysis:</p>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <div className="card border-primary">
                <div className="card-header bg-primary text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-graph-up me-2"></i>
                    Sales Comparison Approach
                  </h6>
                </div>
                <div className="card-body">
                  <div className="display-6 text-primary mb-2">$0</div>
                  <p className="small text-muted mb-0">Based on comparable land sales</p>
                  <hr />
                  <div className="small">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Per Acre:</span>
                      <strong>$0</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Per Unit:</span>
                      <strong>$0</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-3">
              <div className="card border-success">
                <div className="card-header bg-success text-white">
                  <h6 className="mb-0">
                    <i className="bi bi-calculator me-2"></i>
                    Income Approach
                  </h6>
                </div>
                <div className="card-body">
                  <div className="display-6 text-success mb-2">$0</div>
                  <p className="small text-muted mb-0">Residual land value calculation</p>
                  <hr />
                  <div className="small">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Gross Revenue:</span>
                      <strong>$0</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Less: Dev Costs:</span>
                      <strong>$0</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-3">
              <div className="card border-warning">
                <div className="card-header bg-warning">
                  <h6 className="mb-0">
                    <i className="bi bi-hammer me-2"></i>
                    Cost Approach
                  </h6>
                </div>
                <div className="card-body">
                  <div className="display-6 text-warning mb-2">$0</div>
                  <p className="small text-muted mb-0">Replacement cost less depreciation</p>
                  <hr />
                  <div className="small">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Land Value:</span>
                      <strong>$0</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Improvements:</span>
                      <strong>$0</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Final Value Conclusion</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h3 className="mb-3">Indicated Value: <span className="text-primary">$0</span></h3>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Sales Comparison Weight:</td>
                        <td className="text-end">0%</td>
                        <td className="text-end">$0</td>
                      </tr>
                      <tr>
                        <td>Income Approach Weight:</td>
                        <td className="text-end">0%</td>
                        <td className="text-end">$0</td>
                      </tr>
                      <tr>
                        <td>Cost Approach Weight:</td>
                        <td className="text-end">0%</td>
                        <td className="text-end">$0</td>
                      </tr>
                      <tr className="fw-bold">
                        <td>Weighted Average:</td>
                        <td className="text-end">100%</td>
                        <td className="text-end">$0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6>Valuation Notes:</h6>
                  <div className="alert alert-secondary small">
                    <p className="mb-2">Placeholder for appraiser notes and reconciliation commentary:</p>
                    <ul className="mb-0">
                      <li>Approach weighting rationale</li>
                      <li>Market conditions</li>
                      <li>Key value drivers</li>
                      <li>Limiting conditions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

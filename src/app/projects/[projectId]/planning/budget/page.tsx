'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import BudgetGridWithTimeline from '@/components/budget/custom/BudgetGridWithTimeline';
import { ExportButton } from '@/components/admin';
import '@/components/budget/custom/BudgetGrid.css';

/**
 * Planning & Engineering Budget Page
 *
 * Simplified budget view filtered to show only Planning & Engineering costs.
 * Reuses the existing BudgetGridWithTimeline component with scope filtering.
 */
export default function PlanningBudgetPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">Planning & Engineering Budget</h5>
          <p className="text-muted small mb-0">
            Pre-development costs including planning, design, engineering, and permitting
          </p>
        </div>
        <ExportButton tabName="Planning Budget" projectId={projectId.toString()} />
      </div>

      {/* Info Alert */}
      <div className="alert alert-info d-flex align-items-start">
        <i className="bi bi-info-circle me-2 mt-1"></i>
        <div className="small">
          <strong>Planning & Engineering Budget</strong> includes costs incurred before development construction begins.
          This typically includes:
          <ul className="mb-0 mt-1">
            <li>Planning studies, feasibility analysis, and market research</li>
            <li>Architectural and engineering design</li>
            <li>Land entitlements and permitting</li>
            <li>Environmental studies and impact reports</li>
            <li>Utility connections and capacity fees</li>
          </ul>
        </div>
      </div>

      {/* Budget Grid with Planning & Engineering Filter */}
      <div className="card">
        <div className="card-body p-0">
          <BudgetGridWithTimeline
            projectId={projectId}
            scope="Planning & Engineering"
            showCostCurves={false}
            showUnitPricing={false}
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-3">
        <div className="card border-0 bg-light">
          <div className="card-body">
            <h6 className="card-title">
              <i className="bi bi-lightbulb me-2"></i>
              About Planning & Engineering Costs
            </h6>
            <div className="row small">
              <div className="col-md-6">
                <strong>Cost Characteristics:</strong>
                <ul>
                  <li>Typically flat costs (not phased or curved)</li>
                  <li>Incurred early in project timeline</li>
                  <li>Often capitalized as part of land basis</li>
                  <li>May be recoverable from lot/unit sales</li>
                </ul>
              </div>
              <div className="col-md-6">
                <strong>Budgeting Tips:</strong>
                <ul>
                  <li>Get quotes from multiple consultants</li>
                  <li>Include contingency for unforeseen studies</li>
                  <li>Track costs by discipline (civil, architectural, etc.)</li>
                  <li>Monitor against comparable projects</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

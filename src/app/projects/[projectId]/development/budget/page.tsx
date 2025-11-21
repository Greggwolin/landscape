'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import BudgetGridWithTimeline from '@/components/budget/custom/BudgetGridWithTimeline';
import { ExportButton } from '@/components/admin';
import '@/components/budget/custom/BudgetGrid.css';

/**
 * Development Budget Page
 *
 * Full-complexity development budget with unit pricing, cost curves, and phasing.
 * This is the primary budget interface for development construction costs.
 */
export default function DevelopmentBudgetPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">Development Budget</h5>
          <p className="text-muted small mb-0">
            Construction and development costs with phasing, cost curves, and unit pricing
          </p>
        </div>
        <ExportButton tabName="Development Budget" projectId={projectId.toString()} />
      </div>

      {/* Info Alert */}
      <div className="alert alert-info d-flex align-items-start">
        <i className="bi bi-info-circle me-2 mt-1"></i>
        <div className="small">
          <strong>Development Budget</strong> includes all construction and improvement costs.
          This typically includes:
          <ul className="mb-0 mt-1">
            <li>Site work, grading, and earthwork</li>
            <li>Infrastructure (streets, utilities, drainage)</li>
            <li>Vertical construction (buildings, amenities)</li>
            <li>Landscaping and common area improvements</li>
            <li>Phased across development timeline with cost distribution curves</li>
          </ul>
        </div>
      </div>

      {/* Budget Grid with Development Filter */}
      <div className="card">
        <div className="card-body p-0">
          <BudgetGridWithTimeline
            projectId={projectId}
            scope="Development"
            showCostCurves={true}
            showUnitPricing={true}
          />
        </div>
      </div>
    </div>
  );
}

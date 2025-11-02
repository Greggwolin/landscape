'use client';

import { CAlert, CButton } from '@coreui/react';

interface BudgetGridTabProps {
  projectId: number;
}

export default function BudgetGridTab({ projectId }: BudgetGridTabProps) {
  return (
    <div>
      {/* Info alert */}
      <CAlert color="info" className="mb-4">
        <h4 className="alert-heading">Budget Grid Implementation - Next Phase</h4>
        <p>TanStack Table v8 budget grid will be implemented here per QZ_042 handoff.</p>
        <hr />
        <p className="mb-2">
          <strong>Features coming:</strong>
        </p>
        <ul className="mb-3">
          <li>Progressive complexity modes (Napkin/Standard/Detail)</li>
          <li>Hybrid entry system (inline for Napkin, modal for Standard/Detail)</li>
          <li>Custom SVG timeline with synchronized selection</li>
          <li>Column resizing, sorting, virtual scrolling</li>
        </ul>
        <p className="mb-0 text-muted" style={{ fontSize: '0.875rem' }}>
          <strong>Reference:</strong> See <code>budget_hybrid_approach_demo.html</code> for UI mockup
        </p>
      </CAlert>

      {/* Mode selector placeholder */}
      <div className="d-flex gap-2 mb-4">
        <CButton color="success" size="sm">
          Napkin (7 fields)
        </CButton>
        <CButton color="warning" size="sm">
          Standard (11 fields)
        </CButton>
        <CButton color="danger" size="sm">
          Detail (15 fields)
        </CButton>
      </div>

      {/* Grid and timeline placeholders */}
      <div className="row g-3">
        {/* Grid placeholder (60% width = 3 cols out of 5) */}
        <div className="col-lg-7">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              height: '400px',
              border: '2px dashed var(--cui-border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--cui-tertiary-bg)'
            }}
          >
            <div className="text-center" style={{ color: 'var(--cui-secondary-color)' }}>
              <p className="h5 mb-2">TanStack Table Grid Area</p>
              <p className="small">(60% width)</p>
            </div>
          </div>
        </div>

        {/* Timeline placeholder (40% width = 2 cols out of 5) */}
        <div className="col-lg-5">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              height: '400px',
              border: '2px dashed var(--cui-border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--cui-tertiary-bg)'
            }}
          >
            <div className="text-center" style={{ color: 'var(--cui-secondary-color)' }}>
              <p className="h5 mb-2">Custom SVG Timeline</p>
              <p className="small">(40% width)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

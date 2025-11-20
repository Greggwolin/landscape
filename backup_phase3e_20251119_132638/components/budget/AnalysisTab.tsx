'use client';

import { CAlert } from '@coreui/react';

interface AnalysisTabProps {
  projectId: number;
}

export default function AnalysisTab({ projectId }: AnalysisTabProps) {
  return (
    <div>
      {/* Info alert */}
      <CAlert color="info" className="mb-4">
        <h4 className="alert-heading">Budget Analysis & Reports</h4>
        <p className="mb-2">Future analysis views:</p>
        <ul className="mb-0">
          <li>Cost variance reports (Original vs Current vs Forecast)</li>
          <li>Budget rollups by scope and category</li>
          <li>Burn rate charts</li>
          <li>Commitment tracking</li>
        </ul>
      </CAlert>

      {/* Placeholder content */}
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
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📈</div>
          <p className="h5">Budget Analysis & Reports</p>
          <p className="small">Coming in future phase</p>
        </div>
      </div>
    </div>
  );
}

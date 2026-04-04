'use client';

import React from 'react';

const REPORT_ROWS = [
  { label: 'Sales comparison', dot: 'green' as const },
  { label: 'Income approach', dot: 'green' as const },
  { label: 'Cost approach', dot: 'yellow' as const },
  { label: 'Reconciliation', dot: 'empty' as const },
];

export function ReportsStrip() {
  return (
    <div>
      <div className="appraisal-rs-title">Reports</div>
      {REPORT_ROWS.map((row) => (
        <div key={row.label} className="appraisal-rs-row">
          <div className={`appraisal-rs-dot ${row.dot}`} />
          <div className="appraisal-rs-label">{row.label}</div>
          <div className="appraisal-rs-action">
            {row.dot === 'green' ? 'Preview' : row.dot === 'yellow' ? 'In progress' : 'Not started'}
          </div>
        </div>
      ))}
    </div>
  );
}

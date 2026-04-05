'use client';

import React from 'react';

interface Props {
  onClose: () => void;
}

export function DetailOpEx({ onClose }: Props) {
  return (
    <>
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Operating Expenses</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Income approach · Proforma line item</div>
        <div className="dp-hdr-source user">● User-entered (ratio)</div>
      </div>
      <div className="dp-body">
        <div className="dp-current">
          <div className="dp-current-label">Current value</div>
          <div className="dp-current-val">$400,518</div>
          <div className="dp-current-basis">40% of EGI ($1,001,294) · $6,258/unit</div>
        </div>

        <div className="dp-section-title">Input method</div>
        <div className="opex-toggle-row">
          {['% of EGI', '$/unit', 'Total $', 'Line items'].map((method, i) => (
            <button
              key={method}
              className={`appraisal-toggle-btn square${i === 0 ? ' active' : ''}`}
            >
              {method}
            </button>
          ))}
        </div>

        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Expense ratio</div><div className="dp-sub-input">40%</div><div className="dp-sub-val">$400,518</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot hidden" /><div className="dp-sub-label">Per unit</div><div className="dp-sub-input" /><div className="dp-sub-val">$6,258</div></div>

        <div className="dp-section-title">Comparable benchmarks</div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Platform avg (garden MF)</div><div className="dp-sub-input" /><div className="dp-sub-val">38%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Subject T-12 actual ratio</div><div className="dp-sub-input" /><div className="dp-sub-val">42%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Subject T-12 $/unit</div><div className="dp-sub-input" /><div className="dp-sub-val">$6,540</div></div>

        <div className="dp-chat-hint">
          <strong>Chat-enabled:</strong> &quot;Switch to line item detail&quot; or &quot;Use T-12 actuals&quot; or &quot;Break out by category from the OM.&quot; Switching to &quot;Line items&quot; mode will create individual expense rows (taxes, insurance, mgmt, etc.).
        </div>
      </div>
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

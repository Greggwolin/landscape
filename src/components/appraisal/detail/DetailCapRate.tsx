'use client';

import React from 'react';

interface Props {
  onClose: () => void;
}

export function DetailCapRate({ onClose }: Props) {
  return (
    <>
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Going-in Cap Rate</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Income approach · Capitalization</div>
        <div className="dp-hdr-source user">● User-entered</div>
      </div>
      <div className="dp-body">
        <div className="dp-current">
          <div className="dp-current-label">Current value</div>
          <div className="dp-current-val">5.25%</div>
          <div className="dp-current-basis">NOI $600,776 ÷ 5.25% = $11,443,000</div>
        </div>

        <div className="dp-section-title">Market support</div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">CBRE Q4 2025 range</div><div className="dp-sub-input" /><div className="dp-sub-val">4.75–5.50%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">1990s vintage upper end</div><div className="dp-sub-input" /><div className="dp-sub-val">~5.25%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Sales comp implied range</div><div className="dp-sub-input" /><div className="dp-sub-val">4.9–5.6%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Band of investment</div><div className="dp-sub-input" /><div className="dp-sub-val">5.18%</div></div>

        <div className="dp-section-title">Sensitivity</div>
        {[
          { rate: '5.00%', val: '$12,016,000', selected: false },
          { rate: '5.25%', val: '$11,443,000', selected: true },
          { rate: '5.50%', val: '$10,923,000', selected: false },
          { rate: '5.75%', val: '$10,448,000', selected: false },
        ].map((row) => (
          <div key={row.rate} className="dp-sub-row">
            <div className="dp-sub-dot hidden" />
            <div className="dp-sub-label">At {row.rate}</div>
            <div className="dp-sub-input" style={row.selected ? { color: 'var(--cui-primary)', fontWeight: 500 } : {}}>
              {row.selected ? 'selected' : ''}
            </div>
            <div className="dp-sub-val" style={row.selected ? { fontWeight: 600 } : {}}>
              {row.val}
            </div>
          </div>
        ))}

        <div className="dp-chat-hint">
          <strong>Chat-enabled:</strong> &quot;Run a band of investment analysis&quot; or &quot;Show me the cap rate from each sales comp&quot; or &quot;Use 5.50% — this asset has more risk.&quot;
        </div>
      </div>
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

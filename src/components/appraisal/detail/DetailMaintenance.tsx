'use client';

import React from 'react';

interface Props {
  onClose: () => void;
}

const SUB_ITEMS = [
  { label: 'Plumbing', input: '$225/unit', val: '$14,400' },
  { label: 'Electrical', input: '$150/unit', val: '$9,600' },
  { label: 'HVAC', input: '$312/unit', val: '$19,968' },
  { label: 'Grounds / exterior', input: '$275/unit', val: '$17,600' },
  { label: 'General / turnover', input: '$238/unit', val: '$15,232' },
];

export function DetailMaintenance({ onClose }: Props) {
  return (
    <>
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Maintenance &amp; Repairs</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Income approach · Operating expense line item</div>
        <div className="dp-hdr-source calculated">● Calculated from 5 sub-items</div>
      </div>
      <div className="dp-body">
        <div className="dp-current">
          <div className="dp-current-label">Current value (sum of children)</div>
          <div className="dp-current-val">$76,800</div>
          <div className="dp-current-basis">$1,200/unit · 19% of total OpEx</div>
        </div>

        <div className="dp-section-title">Sub-categories</div>
        {SUB_ITEMS.map((item) => (
          <div key={item.label} className="dp-sub-row">
            <div className="dp-sub-dot green" />
            <div className="dp-sub-label">{item.label}</div>
            <div className="dp-sub-input">{item.input}</div>
            <div className="dp-sub-val">{item.val}</div>
          </div>
        ))}
        <div className="dp-sub-row dp-sub-total">
          <div className="dp-sub-dot hidden" />
          <div className="dp-sub-label">Total</div>
          <div className="dp-sub-input" />
          <div className="dp-sub-val">$76,800</div>
        </div>
        <button className="dp-add-row">+ Add sub-category</button>

        <div className="dp-section-title">Comparable benchmarks</div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Platform avg (garden MF)</div><div className="dp-sub-input" /><div className="dp-sub-val">$1,150/unit</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Subject T-12 actual</div><div className="dp-sub-input" /><div className="dp-sub-val">$1,340/unit</div></div>

        <div className="dp-chat-hint">
          <strong>Chat-enabled:</strong> &quot;Add a line item for appliance replacement&quot; or &quot;Use T-12 actuals for all maintenance categories&quot; or &quot;Increase HVAC by 10% — older units.&quot;
        </div>
      </div>
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

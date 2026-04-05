'use client';

import React from 'react';

interface Props {
  onClose: () => void;
}

export function DetailVacancy({ onClose }: Props) {
  return (
    <>
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Vacancy</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Income approach · Proforma line item</div>
        <div className="dp-hdr-source user">● User-entered</div>
      </div>
      <div className="dp-body">
        <div className="dp-current">
          <div className="dp-current-label">Current value</div>
          <div className="dp-current-val">5.0%</div>
          <div className="dp-current-basis">Applied to PGI of $1,064,640 = ($53,232)</div>
        </div>

        <div className="dp-section-title">Breakdown (optional)</div>
        <div className="dv-meta">
          Split vacancy into sub-categories. If added, the parent value becomes calculated from these.
        </div>
        <div className="dp-sub-row"><div className="dp-sub-dot empty" /><div className="dp-sub-label">Physical vacancy</div><div className="dp-sub-input">—</div><div className="dp-sub-val">—</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot empty" /><div className="dp-sub-label">Economic vacancy</div><div className="dp-sub-input">—</div><div className="dp-sub-val">—</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot empty" /><div className="dp-sub-label">Concessions</div><div className="dp-sub-input">—</div><div className="dp-sub-val">—</div></div>
        <button className="dp-add-row">+ Add sub-category</button>

        <div className="dp-section-title">Market context</div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Submarket avg vacancy</div><div className="dp-sub-input" /><div className="dp-sub-val">5.2%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Subject historical (T-12)</div><div className="dp-sub-input" /><div className="dp-sub-val">6.0%</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Comp avg vacancy</div><div className="dp-sub-input" /><div className="dp-sub-val">4.8%</div></div>

        <div className="dp-chat-hint">
          <strong>Chat-enabled:</strong> Tell Landscaper to adjust this value, split into sub-categories, or pull additional market data. Example: &quot;Split vacancy into physical and economic&quot; or &quot;Use the T-12 vacancy rate instead.&quot;
        </div>
      </div>
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

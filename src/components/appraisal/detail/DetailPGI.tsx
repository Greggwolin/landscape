'use client';

import React from 'react';

interface Props {
  onClose: () => void;
}

export function DetailPGI({ onClose }: Props) {
  return (
    <>
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Potential Gross Income</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Income approach · Revenue line item</div>
        <div className="dp-hdr-source user">● User-entered (blended rate)</div>
      </div>
      <div className="dp-body">
        <div className="dp-current">
          <div className="dp-current-label">Current value</div>
          <div className="dp-current-val">$1,064,640</div>
          <div className="dp-current-basis">64 units × $1,385/mo × 12 (blended rate)</div>
        </div>

        <div className="dp-section-title">PGI source</div>
        <div className="pgi-options">
          {/* Active source */}
          <div className="pgi-option active">
            <div className="pgi-radio active">
              <div className="pgi-radio-dot" />
            </div>
            <div className="appraisal-flex-spacer">
              <div className="pgi-label active">Blended rate</div>
              <div className="pgi-sublabel">Single avg rent × total units</div>
            </div>
            <div className="pgi-value success">Active</div>
          </div>
          {/* Other sources */}
          <div className="pgi-option">
            <div className="pgi-radio" />
            <div className="appraisal-flex-spacer">
              <div className="pgi-label">Unit mix / floor plan matrix</div>
              <div className="pgi-sublabel">Per-type rent × unit count. Supersedes blended rate.</div>
            </div>
            <div className="pgi-value">4 types entered</div>
          </div>
          <div className="pgi-option">
            <div className="pgi-radio" />
            <div className="appraisal-flex-spacer">
              <div className="pgi-label">Rent roll</div>
              <div className="pgi-sublabel">Actual unit-level rents. Supersedes unit mix and blended.</div>
            </div>
            <div className="pgi-value">Not uploaded</div>
          </div>
        </div>

        <div className="dp-section-title">Basis (blended rate)</div>
        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Total units</div><div className="dp-sub-input" /><div className="dp-sub-val">64</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Blended rent/unit</div><div className="dp-sub-input">$1,385</div><div className="dp-sub-val">—</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Annual factor</div><div className="dp-sub-input">× 12</div><div className="dp-sub-val">—</div></div>

        <div className="dp-section-title">Market context</div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">CoStar submarket avg</div><div className="dp-sub-input" /><div className="dp-sub-val">$1,340/mo</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Submarket range</div><div className="dp-sub-input" /><div className="dp-sub-val">$1,180–$1,510</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Subject vs. market</div><div className="dp-sub-input" /><div className="dp-sub-val pgi-value success">+3.4%</div></div>

        <div className="dp-chat-hint">
          <strong>Chat-enabled:</strong> &quot;Switch to unit mix&quot; · &quot;Upload the rent roll&quot; · &quot;Break this out by unit type&quot; · &quot;Use CoStar rents as market&quot; · &quot;Add a studio type at $950&quot;
        </div>
      </div>
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {/* Active source */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
            border: '1px solid color-mix(in srgb, var(--cui-primary) 30%, transparent)',
            borderRadius: 6, background: 'color-mix(in srgb, var(--cui-primary) 6%, transparent)',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--cui-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--cui-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--cui-body-color)' }}>Blended rate</div>
              <div style={{ fontSize: 8, color: 'var(--cui-tertiary-color)' }}>Single avg rent × total units</div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--cui-success)' }}>Active</div>
          </div>
          {/* Other sources */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
            border: '1px solid var(--cui-border-color)', borderRadius: 6, cursor: 'pointer',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--cui-tertiary-color)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--cui-secondary-color)' }}>Unit mix / floor plan matrix</div>
              <div style={{ fontSize: 8, color: 'var(--cui-tertiary-color)' }}>Per-type rent × unit count. Supersedes blended rate.</div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)' }}>4 types entered</div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
            border: '1px solid var(--cui-border-color)', borderRadius: 6, cursor: 'pointer',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--cui-tertiary-color)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--cui-secondary-color)' }}>Rent roll</div>
              <div style={{ fontSize: 8, color: 'var(--cui-tertiary-color)' }}>Actual unit-level rents. Supersedes unit mix and blended.</div>
            </div>
            <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)' }}>Not uploaded</div>
          </div>
        </div>

        <div className="dp-section-title">Basis (blended rate)</div>
        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Total units</div><div className="dp-sub-input" /><div className="dp-sub-val">64</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Blended rent/unit</div><div className="dp-sub-input">$1,385</div><div className="dp-sub-val">—</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot green" /><div className="dp-sub-label">Annual factor</div><div className="dp-sub-input">× 12</div><div className="dp-sub-val">—</div></div>

        <div className="dp-section-title">Market context</div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">CoStar submarket avg</div><div className="dp-sub-input" /><div className="dp-sub-val">$1,340/mo</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Submarket range</div><div className="dp-sub-input" /><div className="dp-sub-val">$1,180–$1,510</div></div>
        <div className="dp-sub-row"><div className="dp-sub-dot blue" /><div className="dp-sub-label">Subject vs. market</div><div className="dp-sub-input" /><div className="dp-sub-val" style={{ color: 'var(--cui-success)' }}>+3.4%</div></div>

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

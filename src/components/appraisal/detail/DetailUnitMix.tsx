/**
 * DetailUnitMix
 *
 * Unit mix detail panel — physical floor plan matrix only (no rents).
 * Triggered by double-clicking "Total Units" in Property Details.
 *
 * Future: if rent roll exists, double-click should open rent roll instead.
 *
 * @version 1.0
 * @created 2026-04-05
 */

'use client';

import React from 'react';

interface Props {
  onClose: () => void;
}

const UNIT_TYPES = [
  { type: '1BR/1BA', bd: 1, ba: 1, units: 28, sf: 650 },
  { type: '2BR/1BA', bd: 2, ba: 1, units: 16, sf: 880 },
  { type: '2BR/2BA', bd: 2, ba: 2, units: 8, sf: 950 },
  { type: '3BR/2BA', bd: 3, ba: 2, units: 12, sf: 1120 },
];

const TOTAL_UNITS = UNIT_TYPES.reduce((sum, u) => sum + u.units, 0);

export function DetailUnitMix({ onClose }: Props) {
  return (
    <>
      {/* Header */}
      <div className="dp-hdr">
        <div className="dp-hdr-top">
          <div className="dp-hdr-title">Unit Mix — Floor Plan Matrix</div>
          <button className="dp-hdr-close" onClick={onClose}>✕</button>
        </div>
        <div className="dp-hdr-meta">Property · Physical description</div>
        <div className="dp-hdr-source user">
          <span className="um-source-dot">●</span>
          Manual entry (no rent roll)
        </div>
      </div>

      {/* Body */}
      <div className="dp-body">
        {/* Grid header */}
        <div className="um-row header">
          <span className="um-type">Type</span>
          <span className="um-beds">Bd</span>
          <span className="um-baths">Ba</span>
          <span className="um-units">Units</span>
          <span className="um-sf">SF</span>
        </div>

        {/* Unit rows */}
        {UNIT_TYPES.map((u) => (
          <div key={u.type} className="um-row">
            <span className="um-type strong">{u.type}</span>
            <span className="um-beds">{u.bd}</span>
            <span className="um-baths">{u.ba}</span>
            <span className="um-units">{u.units}</span>
            <span className="um-sf">{u.sf.toLocaleString()}</span>
          </div>
        ))}

        {/* Total */}
        <div className="um-row total-row">
          <span className="um-type strong">Total</span>
          <span className="um-beds" />
          <span className="um-baths" />
          <span className="um-units strong">{TOTAL_UNITS}</span>
          <span className="um-sf" />
        </div>

        {/* Add link */}
        <button className="um-add-row">
          <span>+</span> Add unit type
        </button>

        {/* File drop zone */}
        <div className="um-drop">
          <div className="um-drop-icon">📐</div>
          <div className="um-drop-text">Drop file to import unit mix</div>
          <div className="um-drop-types">floor plan matrix · OM</div>
        </div>

        {/* Chat hint */}
        <div className="dp-chat-hint">
          <strong>Try:</strong> &ldquo;Add a studio unit type&rdquo; · &ldquo;Change 1BR count to 32&rdquo;
        </div>
      </div>

      {/* Footer */}
      <div className="dp-footer">
        <button className="dp-btn primary">Save</button>
        <button className="dp-btn secondary" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

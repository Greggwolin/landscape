/**
 * IncomeRentRoll
 *
 * Rent Roll pill view under the Income tab.
 * Shows unit-level grid with contract vs market rent,
 * loss-to-lease callout, and upload drop zone.
 *
 * @version 1.1
 * @created 2026-04-05
 * @updated 2026-04-05 — Inline styles → CSS classes
 */

'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const SAMPLE_UNITS = [
  { unit: 'Unit 101', bd: 1, ba: 1, sf: 650, contract: '$1,175', market: '$1,200' },
  { unit: 'Unit 102', bd: 1, ba: 1, sf: 650, contract: '$1,210', market: '$1,200' },
  { unit: 'Unit 103', bd: 2, ba: 1, sf: 880, contract: '$1,380', market: '$1,400' },
  { unit: 'Unit 104', bd: 2, ba: 2, sf: 950, contract: '$1,490', market: '$1,525' },
];

export function IncomeRentRoll({ onOpenDetail }: Props) {
  return (
    <>
      {/* Source indicator */}
      <div className="um-source rentroll">
        <span className="um-source-dot">●</span>
        Source: rent roll (uploaded)
      </div>

      {/* Summary grid */}
      <div className="um-row header">
        <span className="um-type">Unit</span>
        <span className="um-beds">Bd</span>
        <span className="um-baths">Ba</span>
        <span className="um-sf">SF</span>
        <span className="um-rent">Contract</span>
        <span className="um-rent">Market</span>
      </div>

      {SAMPLE_UNITS.map((u) => (
        <div key={u.unit} className="um-row">
          <span className="um-type strong">{u.unit}</span>
          <span className="um-beds">{u.bd}</span>
          <span className="um-baths">{u.ba}</span>
          <span className="um-sf">{u.sf.toLocaleString()}</span>
          <span className="um-rent">{u.contract}</span>
          <span className="um-rent market">{u.market}</span>
        </div>
      ))}

      {/* Truncation row */}
      <div className="um-row truncation">
        <span>...60 more</span>
      </div>

      {/* Total row */}
      <div className="um-row total-row">
        <span className="um-type strong">Total</span>
        <span className="um-beds" />
        <span className="um-baths" />
        <span className="um-sf" />
        <span className="um-rent strong">$88,640</span>
        <span className="um-rent strong market">$90,120</span>
      </div>

      {/* Toggle buttons */}
      <div className="appraisal-toggle-row">
        <button className="appraisal-toggle-btn active">Summary</button>
        <button className="appraisal-toggle-btn">Full rent roll ↗</button>
      </div>

      {/* Loss-to-lease callout */}
      <div className="appraisal-callout success">
        <div className="appraisal-callout-title">Loss-to-Lease</div>
        <div className="appraisal-callout-value">$1,480/mo ($17,760/yr) · 1.6% of PGI</div>
        <div className="appraisal-callout-meta">Occupancy: 62/64 units (96.9%) · 2 vacant</div>
      </div>

      {/* Upload drop zone */}
      <div className="um-drop">
        <div className="um-drop-icon">📄</div>
        <div className="um-drop-text">Drop file to update rent roll</div>
        <div className="um-drop-types">rent roll · operating statement · OM</div>
      </div>
    </>
  );
}

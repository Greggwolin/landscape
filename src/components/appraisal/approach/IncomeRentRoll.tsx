/**
 * IncomeRentRoll
 *
 * Rent Roll pill view under the Income tab.
 * Shows unit-level grid with contract vs market rent,
 * loss-to-lease callout, and upload drop zone.
 *
 * @version 1.0
 * @created 2026-04-05
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
        <span style={{ fontSize: 7 }}>●</span>
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
          <span className="um-type" style={{ color: 'var(--cui-body-color)' }}>{u.unit}</span>
          <span className="um-beds">{u.bd}</span>
          <span className="um-baths">{u.ba}</span>
          <span className="um-sf">{u.sf.toLocaleString()}</span>
          <span className="um-rent">{u.contract}</span>
          <span className="um-rent" style={{ color: 'var(--cui-success)' }}>{u.market}</span>
        </div>
      ))}

      {/* Truncation row */}
      <div
        className="um-row"
        style={{ justifyContent: 'center', opacity: 0.5, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 10, color: 'var(--cui-tertiary-color)' }}>...60 more</span>
      </div>

      {/* Total row */}
      <div className="um-row" style={{ borderTop: '1px solid var(--cui-border-color)', paddingTop: 6, marginTop: 2 }}>
        <span className="um-type" style={{ fontWeight: 600, color: 'var(--cui-body-color)' }}>Total</span>
        <span className="um-beds" />
        <span className="um-baths" />
        <span className="um-sf" />
        <span className="um-rent" style={{ fontWeight: 600 }}>$88,640</span>
        <span className="um-rent" style={{ fontWeight: 600, color: 'var(--cui-success)' }}>$90,120</span>
      </div>

      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <button
          style={{
            fontSize: 9,
            padding: '4px 10px',
            borderRadius: 12,
            border: '1px solid color-mix(in srgb, var(--cui-primary) 30%, transparent)',
            background: 'color-mix(in srgb, var(--cui-primary) 15%, transparent)',
            color: 'var(--cui-primary)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Summary
        </button>
        <button
          style={{
            fontSize: 9,
            padding: '4px 10px',
            borderRadius: 12,
            border: '1px dashed var(--cui-border-color)',
            background: 'transparent',
            color: 'var(--cui-tertiary-color)',
            cursor: 'pointer',
          }}
        >
          Full rent roll ↗
        </button>
      </div>

      {/* Loss-to-lease callout */}
      <div
        style={{
          marginTop: 10,
          padding: '10px 12px',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--cui-success) 6%, transparent)',
          border: '1px solid color-mix(in srgb, var(--cui-success) 15%, transparent)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cui-body-color)', marginBottom: 2 }}>
          Loss-to-Lease
        </div>
        <div style={{ fontSize: 10, color: 'var(--cui-secondary-color)' }}>
          $1,480/mo ($17,760/yr) · 1.6% of PGI
        </div>
        <div style={{ fontSize: 10, color: 'var(--cui-tertiary-color)', marginTop: 3 }}>
          Occupancy: 62/64 units (96.9%) · 2 vacant
        </div>
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

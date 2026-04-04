'use client';

import React from 'react';
import type { DetailId } from '../appraisal.types';

interface Props {
  onOpenDetail: (id: DetailId | string, label?: string) => void;
}

const UNIT_DATA = [
  { type: '1BR/1BA', bd: '1', ba: '1', units: '28', sf: '650', rent: '$1,200', annual: '$403,200' },
  { type: '2BR/1BA', bd: '2', ba: '1', units: '16', sf: '880', rent: '$1,400', annual: '$268,800' },
  { type: '2BR/2BA', bd: '2', ba: '2', units: '8', sf: '950', rent: '$1,525', annual: '$146,400' },
  { type: '3BR/2BA', bd: '3', ba: '2', units: '12', sf: '1,120', rent: '$1,690', annual: '$243,360' },
];

export function IncomeUnitMix({ onOpenDetail }: Props) {
  return (
    <>
      {/* Source indicator */}
      <div className="um-source manual">● Source: manual entry (no rent roll)</div>

      {/* Header */}
      <div className="um-row header">
        <span className="um-type">Type</span>
        <span className="um-beds">Bd</span>
        <span className="um-baths">Ba</span>
        <span className="um-units">Units</span>
        <span className="um-sf">SF</span>
        <span className="um-rent">Rent</span>
        <span className="um-total">Annual</span>
      </div>

      {/* Data rows */}
      {UNIT_DATA.map((row) => (
        <div
          key={row.type}
          className="um-row"
          onDoubleClick={() => onOpenDetail('generic', `${row.type} Unit Type`)}
        >
          <span className="um-type">{row.type}</span>
          <span className="um-beds">{row.bd}</span>
          <span className="um-baths">{row.ba}</span>
          <span className="um-units">{row.units}</span>
          <span className="um-sf">{row.sf}</span>
          <span className="um-rent">{row.rent}</span>
          <span className="um-total">{row.annual}</span>
        </div>
      ))}

      {/* Total */}
      <div className="um-row subtotal" style={{ borderTop: '1px solid var(--cui-border-color)', marginTop: 2, paddingTop: 6 }}>
        <span className="um-type" style={{ fontWeight: 600 }}>Total</span>
        <span className="um-beds">—</span>
        <span className="um-baths">—</span>
        <span className="um-units" style={{ fontWeight: 600 }}>64</span>
        <span className="um-sf">—</span>
        <span className="um-rent" style={{ color: 'var(--cui-tertiary-color)' }}>$1,385</span>
        <span className="um-total" style={{ fontWeight: 600 }}>$1,061,760</span>
      </div>

      <button className="um-add-row">+ Add unit type</button>

      {/* Upload zone */}
      <div className="um-drop">
        <div className="um-drop-icon">↑</div>
        <div className="um-drop-text">Drop file to import</div>
        <div className="um-drop-types">floor plan matrix · rent roll · OM · operating statement</div>
      </div>

      <div style={{ fontSize: 9, color: 'var(--cui-tertiary-color)', opacity: 0.5, marginTop: 6, lineHeight: 1.4 }}>
        Chat: &quot;Add a studio unit type&quot; · &quot;Change 1BR rent to $1,250&quot; · &quot;Delete the 3BR&quot; · &quot;Import the rent roll from the OM&quot;
      </div>
    </>
  );
}

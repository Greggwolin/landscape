/**
 * EconIndicators
 *
 * Reusable economic indicators group component.
 * Shows geographic hierarchy rows with YoY change arrows.
 *
 * @version 1.0
 * @created 2026-04-05
 */

'use client';

import React from 'react';

interface EconRow {
  geo: string;
  value: string;
  change: string;
  direction: 'pos' | 'neg' | 'flat';
}

interface EconIndicatorsProps {
  title: string;
  rows: EconRow[];
}

export function EconIndicators({ title, rows }: EconIndicatorsProps) {
  return (
    <div className="econ-group">
      <div className="econ-group-title">{title}</div>
      {rows.map((row) => (
        <div key={row.geo} className="econ-row">
          <span className="econ-geo">{row.geo}</span>
          <span className="econ-val">{row.value}</span>
          <span className={`econ-chg ${row.direction}`}>
            {row.direction === 'pos' && '▲'}
            {row.direction === 'neg' && '▼'}
            {row.direction === 'flat' && '—'}
            {' '}{row.change}
          </span>
        </div>
      ))}
    </div>
  );
}

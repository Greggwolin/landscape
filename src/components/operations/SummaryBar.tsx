'use client';

import React from 'react';
import { formatCurrency, formatPercent } from './types';

interface SummaryBarProps {
  asIsNOI: number;
  postRenoNOI: number;
  noiUplift: number;
  noiUpliftPercent: number;
  valueAddEnabled: boolean;
}

/**
 * SummaryBar - Sticky footer showing NOI comparison
 *
 * Displays As-Is NOI, Post-Reno NOI, and the uplift (difference and percentage).
 * Sticks to the bottom of the viewport for always-visible reference.
 */
export function SummaryBar({
  asIsNOI,
  postRenoNOI,
  noiUplift,
  noiUpliftPercent,
  valueAddEnabled
}: SummaryBarProps) {
  // Only show full comparison if Value-Add mode is enabled
  if (!valueAddEnabled) {
    return (
      <div className="ops-summary-bar">
        <div className="ops-summary-item">
          <div className="ops-summary-label">NOI</div>
          <div className="ops-summary-value">{formatCurrency(asIsNOI)}</div>
        </div>
      </div>
    );
  }

  const isPositiveUplift = noiUplift > 0;
  const formattedUplift = isPositiveUplift
    ? `+${formatCurrency(noiUplift)}`
    : formatCurrency(noiUplift);
  const formattedUpliftPercent = isPositiveUplift
    ? `+${(noiUpliftPercent * 100).toFixed(1)}%`
    : `${(noiUpliftPercent * 100).toFixed(1)}%`;

  return (
    <div className="ops-summary-bar">
      <div className="ops-summary-item">
        <div className="ops-summary-label">As-Is NOI</div>
        <div className="ops-summary-value">{formatCurrency(asIsNOI)}</div>
      </div>
      <div className="ops-summary-item">
        <div className="ops-summary-label">Post-Reno NOI</div>
        <div className={`ops-summary-value ${isPositiveUplift ? 'positive' : ''}`}>
          {formatCurrency(postRenoNOI)}
        </div>
      </div>
      <div className="ops-summary-item">
        <div className="ops-summary-label">NOI Uplift</div>
        <div className={`ops-summary-value ${isPositiveUplift ? 'positive' : ''}`}>
          {formattedUplift}
        </div>
        <div className={`ops-summary-delta ${isPositiveUplift ? '' : 'ops-negative'}`}>
          {formattedUpliftPercent}
        </div>
      </div>
    </div>
  );
}

export default SummaryBar;

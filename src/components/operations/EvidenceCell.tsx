'use client';

import React from 'react';

export type EvidenceCellFormat = 'currency' | 'percent' | 'number' | 'per_unit';

interface EvidenceCellProps {
  value: number | string | null | undefined;
  format?: EvidenceCellFormat;
  className?: string;
  showPlaceholder?: boolean;
}

/**
 * EvidenceCell - Read-only display for evidence values (ghost styled)
 *
 * Displays ingested values from T-12, Current PF, Broker PF, etc.
 * Uses faded "ghost" styling to distinguish from user inputs.
 */
export function EvidenceCell({
  value,
  format = 'currency',
  className = '',
  showPlaceholder = true
}: EvidenceCellProps) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return (
      <span className={`ops-evidence-value ${className}`}>
        {showPlaceholder ? '—' : ''}
      </span>
    );
  }

  // Handle string values (already formatted)
  if (typeof value === 'string') {
    return (
      <span className={`ops-evidence-value ${className}`}>
        {value}
      </span>
    );
  }

  // Format numeric value
  let displayValue: string;

  switch (format) {
    case 'currency':
      displayValue = `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
      break;

    case 'percent':
      // Assume value is already in percentage form (e.g., 3.5 for 3.5%)
      displayValue = `${value.toFixed(1)}%`;
      break;

    case 'per_unit':
      displayValue = `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
      break;

    case 'number':
    default:
      displayValue = value.toLocaleString('en-US');
      break;
  }

  return (
    <span className={`ops-evidence-value ${className}`}>
      {displayValue}
    </span>
  );
}

export default EvidenceCell;

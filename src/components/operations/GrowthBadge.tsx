'use client';

import React from 'react';

export type GrowthBadgeType = 'global' | 'custom' | 'fee';

interface GrowthBadgeProps {
  value: number | null | undefined;
  type?: GrowthBadgeType;
  label?: string;
  className?: string;
}

/**
 * GrowthBadge - Displays growth/escalation rate with visual type indicator
 *
 * Types:
 * - 'global': Uses project-wide default rate (gray badge)
 * - 'custom': Custom override rate (yellow/warn badge)
 * - 'fee': Fee-based calculation like % of EGI (green badge)
 */
export function GrowthBadge({
  value,
  type = 'global',
  label,
  className = ''
}: GrowthBadgeProps) {
  // Handle null/undefined - return empty
  if (value === null || value === undefined) {
    return null;
  }

  // Format the display value
  // If label is provided, use it; otherwise format the value
  const displayLabel = label || `${(value * 100).toFixed(1)}%`;

  return (
    <span className={`ops-badge ${type} ${className}`}>
      {displayLabel}
    </span>
  );
}

/**
 * Convenience component for fee-based items (like management fee % of EGI)
 */
export function FeeBadge({
  label = '% of EGI',
  className = ''
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span className={`ops-badge fee ${className}`}>
      {label}
    </span>
  );
}

export default GrowthBadge;

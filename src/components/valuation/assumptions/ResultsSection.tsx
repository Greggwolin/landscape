'use client';

/**
 * Results Section
 *
 * Displays key financial metrics at the bottom of the Assumptions panel.
 * Shows: Gross Profit, IRR, Peak Equity, NPV
 *
 * Session: QK-28
 */

import React, { useState } from 'react';

// ============================================================================
// CHEVRON ICON
// ============================================================================

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ============================================================================
// TYPES
// ============================================================================

export interface CashFlowSummary {
  grossProfit?: number | null;
  irr?: number | null;
  peakEquity?: number | null;
  npv?: number | null;
  discountRate?: number | null;
}

interface ResultsSectionProps {
  summary?: CashFlowSummary;
  defaultOpen?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResultsSection({
  summary,
  defaultOpen = true,
}: ResultsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const discountRateLabel = summary?.discountRate
    ? `NPV (${(summary.discountRate * 100).toFixed(0)}%)`
    : 'NPV';

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full d-flex justify-content-between align-items-center text-left"
        style={{
          background: 'var(--cui-tertiary-bg)',
          padding: '0.5rem 0.75rem',
          borderRadius: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Results
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="pt-2 px-3 pb-2 space-y-2">
          {/* Gross Profit */}
          <ResultRow
            label="Gross Profit"
            value={formatCurrency(summary?.grossProfit)}
            isNegative={summary?.grossProfit !== null && summary?.grossProfit !== undefined && summary.grossProfit < 0}
          />

          {/* IRR */}
          <ResultRow
            label="IRR"
            value={formatPercent(summary?.irr)}
            highlight
          />

          {/* Peak Equity */}
          <ResultRow
            label="Peak Equity"
            value={formatCurrency(summary?.peakEquity)}
            isNegative={summary?.peakEquity !== null && summary?.peakEquity !== undefined && summary.peakEquity < 0}
          />

          {/* NPV */}
          <ResultRow
            label={discountRateLabel}
            value={formatCurrency(summary?.npv)}
            isNegative={summary?.npv !== null && summary?.npv !== undefined && summary.npv < 0}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RESULT ROW COMPONENT
// ============================================================================

interface ResultRowProps {
  label: string;
  value: string;
  isNegative?: boolean;
  highlight?: boolean;
}

function ResultRow({ label, value, isNegative, highlight }: ResultRowProps) {
  const valueColor = isNegative
    ? 'var(--cui-danger)'
    : highlight
    ? 'var(--cui-success)'
    : 'var(--cui-body-color)';

  return (
    <div className="flex items-center justify-between">
      <span
        className="text-xs"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        {label}
      </span>
      <span
        className="text-xs font-medium"
        style={{ color: valueColor }}
      >
        {value}
      </span>
    </div>
  );
}

export default ResultsSection;

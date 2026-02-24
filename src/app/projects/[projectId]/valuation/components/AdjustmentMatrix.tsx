/**
 * AdjustmentMatrix Component
 *
 * Displays a collapsible table showing all adjustments applied to comparables
 */

'use client';

import { useState } from 'react';
import type { SalesComparable } from '@/types/valuation';
import { LandscapeButton } from '@/components/ui/landscape';

/* ── Shared cell styles ────────────────────────────────── */
const cellBase: React.CSSProperties = {
  padding: '0.75rem',
  color: 'var(--cui-body-color)',
};
const cellCenter: React.CSSProperties = { ...cellBase, textAlign: 'center' };
const cellSemibold: React.CSSProperties = { ...cellBase, fontWeight: 600 };
const cellCenterSemibold: React.CSSProperties = { ...cellCenter, fontWeight: 600 };
const cellCenterBold: React.CSSProperties = { ...cellCenter, fontWeight: 700 };
const cellBold: React.CSSProperties = { ...cellBase, fontWeight: 700 };
const cellCenterMuted: React.CSSProperties = { ...cellCenter, color: 'var(--cui-secondary-color)' };
const rowBorder: React.CSSProperties = { borderBottom: '1px solid var(--cui-border-color)' };
const rowBorderBg: React.CSSProperties = {
  ...rowBorder,
  backgroundColor: 'var(--cui-tertiary-bg)',
};

interface AdjustmentMatrixProps {
  comparables: SalesComparable[];
}

export function AdjustmentMatrix({ comparables }: AdjustmentMatrixProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatPercent = (value: number | null | undefined) => {
    if (!value) return '0.0%';
    const pct = Number(value) * 100;
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Number(value).toLocaleString()}`;
  };

  // Get all unique adjustment types across all comparables
  const adjustmentTypes = new Set<string>();
  comparables.forEach(comp => {
    comp.adjustments?.forEach(adj => {
      adjustmentTypes.add(adj.adjustment_type_display);
    });
  });

  const adjustmentTypesList = Array.from(adjustmentTypes);

  return (
    <div
      className="card"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <LandscapeButton
        variant="ghost"
        color="secondary"
        onClick={() => setIsExpanded(!isExpanded)}
        className="d-flex align-items-center justify-content-between w-100"
        style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--surface-card-header)',
        }}
      >
        <div className="d-flex align-items-center" style={{ gap: '0.75rem' }}>
          <span
            style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--cui-body-color)' }}
          >
            Adjustment Matrix
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              borderRadius: 'var(--cui-border-radius)',
              backgroundColor: 'var(--cui-card-bg)',
              color: 'var(--cui-secondary-color)',
            }}
          >
            {adjustmentTypesList.length} adjustment types
          </span>
        </div>
        <svg
          style={{
            transition: 'transform 0.2s ease-in-out',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            fill: 'var(--cui-body-color)',
          }}
          width="20"
          height="20"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </LandscapeButton>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '1.25rem' }}>
          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={rowBorder}>
                  <th style={{ ...cellSemibold, textAlign: 'left' }}>
                    Adjustment Type
                  </th>
                  {comparables.map((comp) => (
                    <th key={comp.comparable_id} style={cellCenterSemibold}>
                      Comp #{comp.comp_number}
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          marginTop: '0.25rem',
                          color: 'var(--cui-secondary-color)',
                        }}
                      >
                        {comp.property_name}
                      </div>
                    </th>
                  ))}
                  <th style={cellCenterSemibold}>
                    Subject
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Base Price/Unit Row */}
                <tr style={rowBorderBg}>
                  <td style={{ ...cellBase, fontWeight: 500 }}>
                    Base Price/Unit
                  </td>
                  {comparables.map((comp) => (
                    <td key={comp.comparable_id} style={cellCenter}>
                      {formatCurrency(comp.price_per_unit ? Number(comp.price_per_unit) : null)}
                    </td>
                  ))}
                  <td style={cellCenterMuted}>-</td>
                </tr>

                {/* Adjustment Rows */}
                {adjustmentTypesList.map((adjustmentType) => (
                  <tr key={adjustmentType} style={rowBorder}>
                    <td style={cellBase}>
                      {adjustmentType}
                    </td>
                    {comparables.map((comp) => {
                      const adjustment = comp.adjustments?.find(
                        (adj) => adj.adjustment_type_display === adjustmentType
                      );
                      return (
                        <td
                          key={comp.comparable_id}
                          style={{
                            ...cellCenter,
                            color: adjustment
                              ? Number(adjustment.adjustment_pct) < 0
                                ? 'var(--cui-danger)'
                                : 'var(--cui-success)'
                              : 'var(--cui-secondary-color)',
                          }}
                        >
                          {adjustment
                            ? formatPercent(adjustment.adjustment_pct ? Number(adjustment.adjustment_pct) : null)
                            : '-'}
                          {adjustment && adjustment.justification && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                marginTop: '0.25rem',
                                color: 'var(--cui-secondary-color)',
                              }}
                              title={adjustment.justification}
                            >
                              {adjustment.justification.substring(0, 30)}
                              {adjustment.justification.length > 30 ? '...' : ''}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={cellCenterMuted}>-</td>
                  </tr>
                ))}

                {/* Total Adjustments Row */}
                <tr style={rowBorderBg}>
                  <td style={cellSemibold}>
                    Total Adjustments
                  </td>
                  {comparables.map((comp) => (
                    <td
                      key={comp.comparable_id}
                      style={{
                        ...cellCenterSemibold,
                        color:
                          comp.total_adjustment_pct < 0
                            ? 'var(--cui-danger)'
                            : comp.total_adjustment_pct > 0
                            ? 'var(--cui-success)'
                            : 'var(--cui-body-color)',
                      }}
                    >
                      {formatPercent(comp.total_adjustment_pct)}
                    </td>
                  ))}
                  <td style={cellCenterMuted}>-</td>
                </tr>

                {/* Adjusted Price/Unit Row */}
                <tr style={{ backgroundColor: 'var(--cui-success-bg)' }}>
                  <td style={cellBold}>
                    Adjusted Price/Unit
                  </td>
                  {comparables.map((comp) => (
                    <td key={comp.comparable_id} style={cellCenterBold}>
                      {formatCurrency(comp.adjusted_price_per_unit ? Number(comp.adjusted_price_per_unit) : null)}
                    </td>
                  ))}
                  <td style={cellCenterMuted}>-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: 'var(--cui-border-radius)',
              fontSize: '0.75rem',
              backgroundColor: 'var(--cui-tertiary-bg)',
              color: 'var(--cui-secondary-color)',
            }}
          >
            <strong style={{ color: 'var(--cui-body-color)' }}>Note:</strong> Negative
            adjustments (red) indicate the comparable is superior to the subject in that category.
            Positive adjustments (green) indicate the comparable is inferior.
          </div>
        </div>
      )}
    </div>
  );
}

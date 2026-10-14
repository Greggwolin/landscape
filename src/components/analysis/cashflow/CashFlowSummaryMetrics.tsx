/**
 * Cash Flow Summary Metrics
 * Displays key financial metrics: IRR, NPV, Equity Multiple, Payback Period, etc.
 */

'use client';

import React from 'react';
import { CCard, CCardBody } from '@coreui/react';
import type { CashFlowSummary } from '@/lib/financial-engine/cashflow/types';

interface Props {
  summary: CashFlowSummary;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value === 0) return '$0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(0)}K`;
  }

  return `${sign}$${Math.round(absValue).toLocaleString()}`;
}

/**
 * Format percentage
 */
function formatPercent(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format multiplier
 */
function formatMultiple(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(2)}x`;
}

/**
 * Metric card component
 */
function MetricCard({
  label,
  value,
  valueColor,
  sublabel,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sublabel?: string;
}) {
  return (
    <CCard
      className="h-100"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <CCardBody style={{ padding: '8px' }}>
        <div
          className="mb-1"
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'var(--cui-secondary-color)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: valueColor || 'var(--cui-body-color)',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </div>
        {sublabel && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--cui-secondary-color)',
              marginTop: '2px',
            }}
          >
            {sublabel}
          </div>
        )}
      </CCardBody>
    </CCard>
  );
}

export default function CashFlowSummaryMetrics({ summary }: Props) {
  const profitColor =
    summary.grossProfit > 0 ? 'var(--cui-success)' : summary.grossProfit < 0 ? 'var(--cui-danger)' : undefined;

  // QX (2026-10-14): lay the tiles out by the width of the panel they sit in,
  // not the browser window. CoreUI's xs/md/lg columns key off the viewport, so
  // inside the ~330px chat-first right panel a 1440px window still forced five
  // tiles across and every figure wrapped one character per line.
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
      }}
    >
      {/* Revenue Breakdown Card */}
      <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
        <CCard
          className="h-100"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)',
          }}
        >
          <CCardBody style={{ padding: '8px' }}>
            {/* Gross Revenue */}
            <div className="d-flex justify-content-between mb-2">
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: 'var(--cui-secondary-color)',
                }}
              >
                Gross Revenue
              </span>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--cui-body-color)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(summary.totalGrossRevenue)}
              </span>
            </div>

            {/* Less: Subdivision Costs */}
            {summary.totalSubdivisionCosts > 0 && (
              <div className="d-flex justify-content-between mb-1" style={{ paddingLeft: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  Less: Subdivision Costs
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--cui-danger)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ({formatCurrency(summary.totalSubdivisionCosts)})
                </span>
              </div>
            )}

            {/* Less: Commissions */}
            {summary.totalCommissions > 0 && (
              <div className="d-flex justify-content-between mb-1" style={{ paddingLeft: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  Less: Commissions
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--cui-danger)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ({formatCurrency(summary.totalCommissions)})
                </span>
              </div>
            )}

            {/* Less: Transaction Costs */}
            {summary.totalTransactionCosts > 0 && (
              <div className="d-flex justify-content-between mb-2" style={{ paddingLeft: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}>
                  Less: Transaction Costs
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--cui-danger)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ({formatCurrency(summary.totalTransactionCosts)})
                </span>
              </div>
            )}

            {/* Net Revenue */}
            <div
              className="d-flex justify-content-between pt-2"
              style={{ borderTop: '1px solid var(--cui-border-color)' }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: 'var(--cui-secondary-color)',
                }}
              >
                Net Revenue
              </span>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--cui-success)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCurrency(summary.totalNetRevenue)}
              </span>
            </div>
          </CCardBody>
        </CCard>
      </div>
      <div style={{ minWidth: 0 }}>
        <MetricCard
          label="Total Costs"
          value={formatCurrency(summary.totalCosts)}
          valueColor="var(--cui-danger)"
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <MetricCard
          label="Gross Profit"
          value={formatCurrency(summary.grossProfit)}
          valueColor={profitColor}
          sublabel={`Margin: ${formatPercent(summary.grossMargin)}`}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <MetricCard
          label="IRR"
          value={formatPercent(summary.irr)}
          valueColor={summary.irr && summary.irr > 0.1 ? 'var(--cui-success)' : undefined}
          sublabel="Annualized"
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <MetricCard
          label="Equity Multiple"
          value={formatMultiple(summary.equityMultiple)}
          sublabel={summary.peakEquity ? `Peak: ${formatCurrency(summary.peakEquity)}` : undefined}
        />
      </div>
    </div>
  );
}

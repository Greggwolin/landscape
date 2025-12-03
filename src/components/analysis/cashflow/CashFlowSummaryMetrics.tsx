/**
 * Cash Flow Summary Metrics
 * Displays key financial metrics: IRR, NPV, Equity Multiple, Payback Period, etc.
 */

'use client';

import React from 'react';
import { CCard, CCardBody, CRow, CCol } from '@coreui/react';
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
function formatMultiple(value: number | undefined): string {
  if (value === undefined || isNaN(value)) return '—';
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
      <CCardBody className="p-3">
        <div
          className="text-uppercase mb-1"
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

  return (
    <CRow className="g-3">
      <CCol xs={6} md={4} lg={2}>
        <MetricCard
          label="Gross Revenue"
          value={formatCurrency(summary.totalGrossRevenue)}
          sublabel="Before deductions"
        />
      </CCol>
      <CCol xs={6} md={4} lg={2}>
        <MetricCard
          label="Net Revenue"
          value={formatCurrency(summary.totalNetRevenue)}
          valueColor="var(--cui-success)"
          sublabel={`Less ${formatCurrency(summary.totalRevenueDeductions)}`}
        />
      </CCol>
      <CCol xs={6} md={4} lg={2}>
        <MetricCard
          label="Total Costs"
          value={formatCurrency(summary.totalCosts)}
          valueColor="var(--cui-danger)"
        />
      </CCol>
      <CCol xs={6} md={4} lg={2}>
        <MetricCard
          label="Gross Profit"
          value={formatCurrency(summary.grossProfit)}
          valueColor={profitColor}
          sublabel={`Margin: ${formatPercent(summary.grossMargin)}`}
        />
      </CCol>
      <CCol xs={6} md={4} lg={2}>
        <MetricCard
          label="IRR"
          value={formatPercent(summary.irr)}
          valueColor={summary.irr && summary.irr > 0.1 ? 'var(--cui-success)' : undefined}
          sublabel="Annualized"
        />
      </CCol>
      <CCol xs={6} md={4} lg={2}>
        <MetricCard
          label="Equity Multiple"
          value={formatMultiple(summary.equityMultiple)}
          sublabel={summary.peakEquity ? `Peak: ${formatCurrency(summary.peakEquity)}` : undefined}
        />
      </CCol>
    </CRow>
  );
}

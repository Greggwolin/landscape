'use client';

/**
 * DCF Summary Section
 *
 * Displays Exit Analysis and DCF Valuation summary boxes below the cash flow grid.
 * - Exit Analysis: Shows bulk sale calculations (only when bulk_sale_enabled)
 * - DCF Valuation: Shows Present Value, IRR, Equity Multiple, price metrics
 *
 * Session: QK-28
 */

import React from 'react';
import { CCard, CCardBody, CCardHeader, CRow, CCol, CSpinner } from '@coreui/react';
import type { DcfAnalysis } from '@/types/dcf-analysis';
import type { CashFlowSummary } from '@/lib/financial-engine/cashflow/types';

// ============================================================================
// TYPES
// ============================================================================

interface DcfSummarySectionProps {
  dcfData?: DcfAnalysis;
  cashFlowSummary?: CashFlowSummary;
  isLoading?: boolean;
}

interface ExitAnalysisBoxProps {
  dcfData: DcfAnalysis;
  cashFlowSummary?: CashFlowSummary;
}

interface DcfValuationBoxProps {
  dcfData: DcfAnalysis;
  cashFlowSummary?: CashFlowSummary;
  isLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '$0';
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

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—';
  // Handle values that are already decimals (0.10 = 10%) vs percentages (10 = 10%)
  const displayValue = value < 1 ? value * 100 : value;
  return `${displayValue.toFixed(2)}%`;
}

function formatMultiple(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '—';
  return `${value.toFixed(2)}x`;
}

// ============================================================================
// EXIT ANALYSIS BOX
// ============================================================================

function ExitAnalysisBox({ dcfData, cashFlowSummary }: ExitAnalysisBoxProps) {
  const bulkSalePeriod = dcfData.bulk_sale_period || 0;
  const discountPct = Number(dcfData.bulk_sale_discount_pct) || 0.15;
  const sellingCostsPct = Number(dcfData.selling_costs_pct) || 0.02;

  // Calculate exit analysis values from cash flow summary
  // In a real implementation, remaining inventory would come from the backend
  const remainingInventoryValue = cashFlowSummary?.totalGrossRevenue
    ? cashFlowSummary.totalGrossRevenue * 0.2 // Placeholder: 20% remaining
    : 0;

  const bulkDiscount = remainingInventoryValue * discountPct;
  const grossExitValue = remainingInventoryValue - bulkDiscount;
  const sellingCosts = grossExitValue * sellingCostsPct;
  const netReversion = grossExitValue - sellingCosts;

  return (
    <CCard
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <CCardHeader
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderBottom: '1px solid var(--cui-border-color)',
          padding: '0.75rem 1rem',
        }}
      >
        <strong style={{ color: 'var(--cui-body-color)' }}>Exit Analysis</strong>
        <span
          className="ms-2"
          style={{ fontSize: '0.75rem', color: 'var(--cui-secondary-color)' }}
        >
          (Bulk Sale Year {bulkSalePeriod})
        </span>
      </CCardHeader>
      <CCardBody style={{ padding: '1rem' }}>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>
            Remaining Inventory Value
          </span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(remainingInventoryValue)}
          </span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>
            Bulk Sale Discount ({formatPercent(discountPct)})
          </span>
          <span style={{ color: 'var(--cui-danger)', fontVariantNumeric: 'tabular-nums' }}>
            ({formatCurrency(bulkDiscount)})
          </span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>Gross Exit Value</span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(grossExitValue)}
          </span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>
            Less: Selling Costs ({formatPercent(sellingCostsPct)})
          </span>
          <span style={{ color: 'var(--cui-danger)', fontVariantNumeric: 'tabular-nums' }}>
            ({formatCurrency(sellingCosts)})
          </span>
        </div>
        <hr style={{ borderColor: 'var(--cui-border-color)', margin: '0.75rem 0' }} />
        <div className="d-flex justify-content-between fw-bold">
          <span style={{ color: 'var(--cui-body-color)' }}>Net Reversion</span>
          <span style={{ color: 'var(--cui-success)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(netReversion)}
          </span>
        </div>
      </CCardBody>
    </CCard>
  );
}

// ============================================================================
// DCF VALUATION BOX
// ============================================================================

function DcfValuationBox({ dcfData, cashFlowSummary, isLoading }: DcfValuationBoxProps) {
  if (isLoading) {
    return (
      <CCard
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          borderColor: 'var(--cui-border-color)',
        }}
      >
        <CCardBody className="text-center py-4">
          <CSpinner size="sm" color="primary" />
          <span className="ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
            Calculating...
          </span>
        </CCardBody>
      </CCard>
    );
  }

  const discountRate = Number(dcfData.discount_rate) || 0;
  const holdPeriod = dcfData.hold_period_years || 0;

  // Use values from cash flow summary if available
  const irr = cashFlowSummary?.irr;
  const equityMultiple = cashFlowSummary?.equityMultiple;
  const peakEquity = cashFlowSummary?.peakEquity;
  const npv = cashFlowSummary?.npv;

  // Calculate price metrics from summary if available
  const totalLots = 42; // Would come from project data
  const totalAcres = 1200; // Would come from project data
  const pricePerLot = npv && totalLots ? npv / totalLots : undefined;
  const pricePerAcre = npv && totalAcres ? npv / totalAcres : undefined;

  return (
    <CCard
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      <CCardHeader
        style={{
          backgroundColor: 'var(--cui-tertiary-bg)',
          borderBottom: '1px solid var(--cui-border-color)',
          padding: '0.75rem 1rem',
        }}
      >
        <strong style={{ color: 'var(--cui-body-color)' }}>DCF Valuation</strong>
      </CCardHeader>
      <CCardBody style={{ padding: '1rem' }}>
        {/* Assumptions */}
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>Discount Rate</span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {formatPercent(discountRate)}
          </span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>Hold Period</span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {holdPeriod} years
          </span>
        </div>

        <hr style={{ borderColor: 'var(--cui-border-color)', margin: '0.75rem 0' }} />

        {/* Results */}
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-body-color)', fontWeight: 600 }}>Present Value</span>
          <span
            style={{
              color: 'var(--cui-success)',
              fontWeight: 700,
              fontSize: '1.1rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCurrency(npv)}
          </span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>IRR</span>
          <span
            style={{
              color: irr && irr > 0.1 ? 'var(--cui-success)' : 'var(--cui-body-color)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatPercent(irr)}
          </span>
        </div>
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>Equity Multiple</span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {formatMultiple(equityMultiple)}
          </span>
        </div>
        {peakEquity && (
          <div className="d-flex justify-content-between mb-2">
            <span style={{ color: 'var(--cui-secondary-color)' }}>Peak Equity</span>
            <span style={{ color: 'var(--cui-danger)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(peakEquity)}
            </span>
          </div>
        )}

        <hr style={{ borderColor: 'var(--cui-border-color)', margin: '0.75rem 0' }} />

        {/* Price Metrics */}
        <div className="d-flex justify-content-between mb-2">
          <span style={{ color: 'var(--cui-secondary-color)' }}>Price per Lot</span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {pricePerLot ? formatCurrency(pricePerLot) : '—'}
          </span>
        </div>
        <div className="d-flex justify-content-between">
          <span style={{ color: 'var(--cui-secondary-color)' }}>Price per Acre</span>
          <span style={{ color: 'var(--cui-body-color)', fontVariantNumeric: 'tabular-nums' }}>
            {pricePerAcre ? formatCurrency(pricePerAcre) : '—'}
          </span>
        </div>
      </CCardBody>
    </CCard>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DcfSummarySection({
  dcfData,
  cashFlowSummary,
  isLoading,
}: DcfSummarySectionProps) {
  // Don't render if no DCF data
  if (!dcfData) {
    return null;
  }

  // Check if discount rate is set
  const hasDiscountRate = dcfData.discount_rate && Number(dcfData.discount_rate) > 0;

  // Show placeholder if no discount rate
  if (!hasDiscountRate) {
    return (
      <CRow className="mt-4">
        <CCol>
          <CCard
            style={{
              backgroundColor: 'var(--cui-card-bg)',
              borderColor: 'var(--cui-border-color)',
            }}
          >
            <CCardHeader
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                borderBottom: '1px solid var(--cui-border-color)',
                padding: '0.75rem 1rem',
              }}
            >
              <strong style={{ color: 'var(--cui-body-color)' }}>DCF Valuation</strong>
            </CCardHeader>
            <CCardBody
              className="text-center py-4"
              style={{ color: 'var(--cui-secondary-color)' }}
            >
              Set a discount rate in the Assumptions panel to see DCF metrics.
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    );
  }

  const showExitAnalysis = dcfData.bulk_sale_enabled && dcfData.bulk_sale_period;

  return (
    <CRow className="mt-4 g-3">
      {/* Exit Analysis - only if bulk sale enabled */}
      {showExitAnalysis && (
        <CCol md={6}>
          <ExitAnalysisBox dcfData={dcfData} cashFlowSummary={cashFlowSummary} />
        </CCol>
      )}

      {/* DCF Valuation - always show when discount rate is set */}
      <CCol md={showExitAnalysis ? 6 : 12}>
        <DcfValuationBox
          dcfData={dcfData}
          cashFlowSummary={cashFlowSummary}
          isLoading={isLoading}
        />
      </CCol>
    </CRow>
  );
}

export default DcfSummarySection;

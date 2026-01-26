'use client';

/**
 * DCFView Component
 *
 * Displays DCF (Discounted Cash Flow) analysis results including:
 * - Cash flow projection table (year-by-year)
 * - Exit analysis summary
 * - Valuation metrics (PV, IRR)
 * - 2D sensitivity matrix (discount rate × exit cap rate)
 *
 * Session: DCF Implementation
 */

import React, { useState } from 'react';
import type {
  DCFViewProps,
  DCFCashFlowPeriod,
  DCFSensitivityRow,
} from '@/types/income-approach';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatPerUnit,
  formatPerSF,
  DCF_TILE_COLOR,
} from '@/types/income-approach';

interface ExtendedDCFViewProps extends DCFViewProps {
  onMethodChange?: (method: 'direct_cap' | 'dcf') => void;
}

export function DCFView({ data, propertySummary, isLoading, onMethodChange }: ExtendedDCFViewProps) {
  const [showAllYears, setShowAllYears] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2" />
          <p style={{ color: 'var(--cui-secondary-color)' }}>Calculating DCF...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--cui-secondary-color)' }}>
        No DCF data available
      </div>
    );
  }

  const { projections, exit_analysis, metrics, sensitivity_matrix, assumptions } = data;

  // Show first 3, last 2, or all years
  const displayedProjections = showAllYears
    ? projections
    : projections.length <= 5
      ? projections
      : [...projections.slice(0, 3), null, ...projections.slice(-2)];

  return (
    <div className="space-y-6">
      {/* Method Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMethodChange?.('direct_cap')}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            color: 'var(--cui-secondary-color)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          Direct Capitalization
        </button>
        <button
          className="px-4 py-2 text-sm font-medium rounded-lg"
          style={{
            backgroundColor: DCF_TILE_COLOR.border,
            color: 'white',
          }}
        >
          DCF Analysis
        </button>
        <span
          className="ml-2 text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: DCF_TILE_COLOR.bg,
            color: DCF_TILE_COLOR.text,
          }}
        >
          {assumptions.hold_period_years}-Year Hold
        </span>
      </div>

      {/* Cash Flow Projection Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--cui-card-bg)',
          border: '1px solid var(--cui-border-color)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--cui-border-color)' }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
            Cash Flow Projections
          </h3>
          {projections.length > 5 && (
            <button
              onClick={() => setShowAllYears(!showAllYears)}
              className="text-sm px-2 py-1 rounded"
              style={{
                color: DCF_TILE_COLOR.text,
                backgroundColor: DCF_TILE_COLOR.bg,
              }}
            >
              {showAllYears ? 'Show Summary' : `Show All ${projections.length} Years`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
                <th className="px-3 py-2 text-left" style={{ color: 'var(--cui-secondary-color)' }}>Year</th>
                <th className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>GPR</th>
                <th className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>Vacancy</th>
                <th className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>EGI</th>
                <th className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>OpEx</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--cui-body-color)' }}>NOI</th>
                <th className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>PV Factor</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: DCF_TILE_COLOR.text }}>PV of NOI</th>
              </tr>
            </thead>
            <tbody>
              {displayedProjections.map((period, idx) => {
                if (period === null) {
                  return (
                    <tr key="ellipsis" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                      <td colSpan={8} className="px-3 py-2 text-center" style={{ color: 'var(--cui-secondary-color)' }}>
                        ...
                      </td>
                    </tr>
                  );
                }
                return (
                  <CashFlowRow key={period.year} period={period} isLast={period.year === projections.length} />
                );
              })}
              {/* Exit row */}
              <tr
                style={{
                  borderTop: '2px solid var(--cui-border-color)',
                  backgroundColor: 'var(--cui-tertiary-bg)',
                }}
              >
                <td className="px-3 py-2 font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  Exit (Yr {projections.length})
                </td>
                <td colSpan={4} className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>
                  Terminal NOI: {formatCurrencyCompact(exit_analysis.terminal_noi)}
                </td>
                <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--cui-body-color)' }}>
                  {formatCurrencyCompact(exit_analysis.net_reversion)}
                </td>
                <td className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>
                  {(1 / Math.pow(1 + assumptions.discount_rate, projections.length)).toFixed(4)}
                </td>
                <td className="px-3 py-2 text-right font-semibold" style={{ color: DCF_TILE_COLOR.text }}>
                  {formatCurrencyCompact(exit_analysis.pv_reversion)}
                </td>
              </tr>
              {/* Total row */}
              <tr
                style={{
                  borderTop: '2px solid var(--cui-border-color)',
                  backgroundColor: DCF_TILE_COLOR.bg,
                }}
              >
                <td colSpan={7} className="px-3 py-3 font-bold text-right" style={{ color: 'var(--cui-body-color)' }}>
                  PRESENT VALUE
                </td>
                <td className="px-3 py-3 text-right font-bold text-lg" style={{ color: DCF_TILE_COLOR.text }}>
                  {formatCurrency(metrics.present_value)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Exit Analysis + Valuation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exit Analysis Card */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--cui-card-bg)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          <h4 className="font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
            Exit Analysis
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Terminal NOI (Yr {projections.length + 1})</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(exit_analysis.terminal_noi)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Exit Cap Rate</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatPercent(assumptions.terminal_cap_rate)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Gross Exit Value</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(exit_analysis.exit_value)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Less: Selling Costs ({formatPercent(assumptions.selling_costs_pct)})</span>
              <span style={{ color: 'var(--cui-danger)' }}>({formatCurrency(exit_analysis.selling_costs)})</span>
            </div>
            <div
              className="flex justify-between pt-2 border-t font-semibold"
              style={{ borderColor: 'var(--cui-border-color)' }}
            >
              <span style={{ color: 'var(--cui-body-color)' }}>Net Reversion</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(exit_analysis.net_reversion)}</span>
            </div>
          </div>
        </div>

        {/* Valuation Summary Card */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: DCF_TILE_COLOR.bg,
            border: `1px solid ${DCF_TILE_COLOR.border}`,
          }}
        >
          <h4 className="font-semibold mb-3" style={{ color: 'var(--cui-body-color)' }}>
            DCF Valuation
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Discount Rate</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatPercent(assumptions.discount_rate)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Hold Period</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{assumptions.hold_period_years} years</span>
            </div>
            <div
              className="flex justify-between pt-2 border-t"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>Present Value</span>
              <span className="font-bold text-lg" style={{ color: DCF_TILE_COLOR.text }}>
                {formatCurrency(metrics.present_value)}
              </span>
            </div>
            {metrics.irr !== null && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--cui-secondary-color)' }}>IRR</span>
                <span className="font-semibold" style={{ color: DCF_TILE_COLOR.text }}>
                  {formatPercent(metrics.irr)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Price per Unit</span>
              <span style={{ color: 'var(--cui-body-color)' }}>
                {metrics.price_per_unit ? formatPerUnit(metrics.price_per_unit) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--cui-secondary-color)' }}>Price per SF</span>
              <span style={{ color: 'var(--cui-body-color)' }}>
                {metrics.price_per_sf ? formatPerSF(metrics.price_per_sf) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2D Sensitivity Matrix */}
      <DCFSensitivityMatrix
        data={sensitivity_matrix}
        selectedDiscountRate={assumptions.discount_rate}
        selectedExitCapRate={assumptions.terminal_cap_rate}
        unitCount={propertySummary.unit_count}
      />
    </div>
  );
}

/**
 * Cash flow row component
 */
function CashFlowRow({ period, isLast }: { period: DCFCashFlowPeriod; isLast: boolean }) {
  return (
    <tr
      style={{
        borderBottom: '1px solid var(--cui-border-color)',
        backgroundColor: isLast ? 'var(--cui-tertiary-bg)' : undefined,
      }}
    >
      <td className="px-3 py-2 font-medium" style={{ color: 'var(--cui-body-color)' }}>
        {period.year}
      </td>
      <td className="px-3 py-2 text-right" style={{ color: 'var(--cui-body-color)' }}>
        {formatCurrencyCompact(period.gpr)}
      </td>
      <td className="px-3 py-2 text-right" style={{ color: 'var(--cui-danger)' }}>
        ({formatCurrencyCompact(period.vacancy_loss)})
      </td>
      <td className="px-3 py-2 text-right" style={{ color: 'var(--cui-body-color)' }}>
        {formatCurrencyCompact(period.egi)}
      </td>
      <td className="px-3 py-2 text-right" style={{ color: 'var(--cui-danger)' }}>
        ({formatCurrencyCompact(period.total_opex)})
      </td>
      <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--cui-body-color)' }}>
        {formatCurrencyCompact(period.noi)}
      </td>
      <td className="px-3 py-2 text-right" style={{ color: 'var(--cui-secondary-color)' }}>
        {period.pv_factor.toFixed(4)}
      </td>
      <td className="px-3 py-2 text-right font-semibold" style={{ color: DCF_TILE_COLOR.text }}>
        {formatCurrencyCompact(period.pv_noi)}
      </td>
    </tr>
  );
}

/**
 * 2D Sensitivity Matrix Component
 */
function DCFSensitivityMatrix({
  data,
  selectedDiscountRate,
  selectedExitCapRate,
}: {
  data: DCFSensitivityRow[];
  selectedDiscountRate: number;
  selectedExitCapRate: number;
  unitCount: number;
}) {
  if (!data || data.length === 0) {
    return null;
  }

  // Get exit cap rates from first row (all rows have same columns)
  const exitCapRates = data[0]?.exit_cap_rates || [];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--cui-border-color)' }}
      >
        <h3 className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>
          Sensitivity Analysis
        </h3>
        <p className="text-xs mt-1" style={{ color: 'var(--cui-secondary-color)' }}>
          Present Value at different Discount Rates (rows) and Exit Cap Rates (columns)
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <th
                className="px-3 py-2 text-left"
                style={{ color: 'var(--cui-secondary-color)' }}
              >
                Discount ↓ / Exit Cap →
              </th>
              {exitCapRates.map((cap) => {
                const isSelectedCap = Math.abs(cap - selectedExitCapRate) < 0.0001;
                return (
                  <th
                    key={cap}
                    className="px-3 py-2 text-right"
                    style={{
                      color: isSelectedCap ? DCF_TILE_COLOR.text : 'var(--cui-secondary-color)',
                      fontWeight: isSelectedCap ? 'bold' : 'normal',
                    }}
                  >
                    {formatPercent(cap, 2)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isSelectedRow = row.is_base_discount;
              return (
                <tr
                  key={row.discount_rate}
                  style={{
                    borderBottom: '1px solid var(--cui-border-color)',
                    backgroundColor: isSelectedRow ? DCF_TILE_COLOR.bg : undefined,
                  }}
                >
                  <td
                    className="px-3 py-2 font-medium"
                    style={{
                      color: isSelectedRow ? DCF_TILE_COLOR.text : 'var(--cui-body-color)',
                    }}
                  >
                    {formatPercent(row.discount_rate, 2)}
                  </td>
                  {row.values.map((value, colIdx) => {
                    const isSelectedCol = Math.abs(exitCapRates[colIdx] - selectedExitCapRate) < 0.0001;
                    const isSelectedCell = isSelectedRow && isSelectedCol;
                    return (
                      <td
                        key={colIdx}
                        className="px-3 py-2 text-right"
                        style={{
                          color: isSelectedCell ? DCF_TILE_COLOR.text : 'var(--cui-body-color)',
                          fontWeight: isSelectedCell ? 'bold' : 'normal',
                          backgroundColor: isSelectedCell ? DCF_TILE_COLOR.border + '40' : undefined,
                        }}
                      >
                        {formatCurrencyCompact(value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DCFView;

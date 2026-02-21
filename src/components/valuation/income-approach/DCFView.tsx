'use client';

/**
 * DCFView Component
 *
 * Displays DCF (Discounted Cash Flow) analysis results using the shared CashFlowGrid.
 * Supports monthly/quarterly/annual/overall time scale toggle.
 *
 * Features:
 * - Cash flow projection grid with time scale selector
 * - Exit analysis summary
 * - Valuation metrics (PV, IRR)
 * - 2D sensitivity matrix (discount rate × exit cap rate)
 *
 * Session: DCF Implementation / MF DCF Unification
 */

import React, { useState, useMemo } from 'react';
import { CashFlowGrid, TimeScale } from '@/components/analysis/shared';
import type {
  DCFViewProps,
  DCFSensitivityRow,
} from '@/types/income-approach';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatPerUnit,
  formatPerSF,
  getDCFTileColor,
} from '@/types/income-approach';
import {
  aggregateMFCashFlow,
  formatMFDcfValue,
  type MFDcfMonthlyApiResponse,
} from './mfCashFlowTransform';
import { useTheme } from '@/app/components/CoreUIThemeProvider';

interface ExtendedDCFViewProps extends DCFViewProps {
  onMethodChange?: (method: 'direct_cap' | 'dcf') => void;
  monthlyData?: MFDcfMonthlyApiResponse | null;
}

export function DCFView({
  data,
  propertySummary,
  isLoading,
  onMethodChange,
  monthlyData,
}: ExtendedDCFViewProps) {
  const { theme } = useTheme();
  const dcfColors = getDCFTileColor(theme);
  const [timeScale, setTimeScale] = useState<TimeScale>('annual');

  // Transform monthly data for grid display
  const gridData = useMemo(() => {
    if (!monthlyData) return null;
    return aggregateMFCashFlow(monthlyData, timeScale);
  }, [monthlyData, timeScale]);

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

  const {
    projections,
    exit_analysis: annualExitAnalysis,
    metrics: annualMetrics,
    sensitivity_matrix: annualSensitivityMatrix,
    assumptions,
  } = data;

  // Prefer monthly data sources (corrected terminal NOI, PV including reversion)
  // over annual data when monthly data is available.
  const exit_analysis = monthlyData?.exit_analysis ?? annualExitAnalysis;
  const metrics = monthlyData?.metrics ?? annualMetrics;
  const sensitivity_matrix = monthlyData?.sensitivity_matrix ?? annualSensitivityMatrix;

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
            backgroundColor: dcfColors.border,
            color: 'white',
          }}
        >
          DCF Analysis
        </button>
        <span
          className="ml-2 text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: dcfColors.bg,
            color: dcfColors.text,
          }}
        >
          {assumptions.hold_period_years}-Year Hold
        </span>
      </div>

      {/* Cash Flow Grid (if monthly data available) OR Legacy Table */}
      {gridData ? (
        <CashFlowGrid
          periods={gridData.periods}
          sections={gridData.sections}
          timeScale={timeScale}
          onTimeScaleChange={setTimeScale}
          showTimeScaleToggle={true}
          formatValue={formatMFDcfValue}
          title="Cash Flow Projections"
          labelColumnHeader="Period [Fiscal]"
        />
      ) : (
        <LegacyCashFlowTable
          projections={projections}
          exit_analysis={exit_analysis}
          assumptions={assumptions}
          metrics={metrics}
          theme={theme}
        />
      )}

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
              <span style={{ color: 'var(--cui-secondary-color)' }}>Terminal NOI (Yr {assumptions.hold_period_years + 1})</span>
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
            backgroundColor: dcfColors.bg,
            border: `1px solid ${dcfColors.border}`,
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
              style={{ borderColor: 'var(--cui-border-color)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--cui-body-color)' }}>Present Value</span>
              <span className="font-bold text-lg" style={{ color: dcfColors.text }}>
                {formatCurrency(metrics.present_value)}
              </span>
            </div>
            {metrics.irr !== null && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--cui-secondary-color)' }}>IRR</span>
                <span className="font-semibold" style={{ color: dcfColors.text }}>
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
        theme={theme}
      />
    </div>
  );
}

/**
 * Legacy cash flow table (used when monthly data not available)
 */
function LegacyCashFlowTable({
  projections,
  exit_analysis,
  assumptions,
  metrics,
  theme,
}: {
  projections: any[];
  exit_analysis: any;
  assumptions: any;
  metrics: any;
  theme: 'light' | 'dark';
}) {
  const dcfColors = getDCFTileColor(theme);
  const [showAllYears, setShowAllYears] = useState(false);

  // Show first 3, last 2, or all years
  const displayedProjections = showAllYears
    ? projections
    : projections.length <= 5
      ? projections
      : [...projections.slice(0, 3), null, ...projections.slice(-2)];

  return (
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
              color: dcfColors.text,
              backgroundColor: dcfColors.bg,
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
              <th className="px-3 py-2 text-right font-semibold" style={{ color: dcfColors.text }}>PV of NOI</th>
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
                <LegacyCashFlowRow key={period.year} period={period} isLast={period.year === projections.length} theme={theme} />
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
              <td className="px-3 py-2 text-right font-semibold" style={{ color: dcfColors.text }}>
                {formatCurrencyCompact(exit_analysis.pv_reversion)}
              </td>
            </tr>
            {/* Total row */}
            <tr
              style={{
                borderTop: '2px solid var(--cui-border-color)',
                backgroundColor: dcfColors.bg,
              }}
            >
              <td colSpan={7} className="px-3 py-3 font-bold text-right" style={{ color: 'var(--cui-body-color)' }}>
                PRESENT VALUE
              </td>
              <td className="px-3 py-3 text-right font-bold text-lg" style={{ color: dcfColors.text }}>
                {formatCurrency(metrics.present_value)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Legacy cash flow row component
 */
function LegacyCashFlowRow({ period, isLast, theme }: { period: any; isLast: boolean; theme: 'light' | 'dark' }) {
  const dcfColors = getDCFTileColor(theme);
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
      <td className="px-3 py-2 text-right font-semibold" style={{ color: dcfColors.text }}>
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
  theme,
}: {
  data: DCFSensitivityRow[];
  selectedDiscountRate: number;
  selectedExitCapRate: number;
  unitCount: number;
  theme: 'light' | 'dark';
}) {
  const dcfColors = getDCFTileColor(theme);
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
                      color: isSelectedCap ? dcfColors.text : 'var(--cui-secondary-color)',
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
                    backgroundColor: isSelectedRow ? dcfColors.bg : undefined,
                  }}
                >
                  <td
                    className="px-3 py-2 font-medium"
                    style={{
                      color: isSelectedRow ? dcfColors.text : 'var(--cui-body-color)',
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
                          color: isSelectedCell ? dcfColors.text : 'var(--cui-body-color)',
                          fontWeight: isSelectedCell ? 'bold' : 'normal',
                          backgroundColor: isSelectedCell ? dcfColors.border + '40' : undefined,
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

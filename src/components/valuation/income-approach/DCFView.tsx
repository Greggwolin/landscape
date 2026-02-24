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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              margin: '0 auto 0.5rem',
              borderRadius: '9999px',
              borderBottom: '2px solid var(--cui-primary)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: 'var(--cui-secondary-color)' }}>Calculating DCF...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--cui-secondary-color)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {/* Exit Analysis Card */}
        <div
          style={{
            borderRadius: '0.5rem',
            padding: '1rem',
            backgroundColor: 'var(--cui-card-bg)',
            border: '1px solid var(--cui-border-color)',
          }}
        >
          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--cui-body-color)' }}>
            Exit Analysis
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Terminal NOI (Yr {assumptions.hold_period_years + 1})</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(exit_analysis.terminal_noi)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Exit Cap Rate</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatPercent(assumptions.terminal_cap_rate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Gross Exit Value</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(exit_analysis.exit_value)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Less: Selling Costs ({formatPercent(assumptions.selling_costs_pct)})</span>
              <span style={{ color: 'var(--cui-danger)' }}>({formatCurrency(exit_analysis.selling_costs)})</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--cui-border-color)',
                fontWeight: 600,
              }}
            >
              <span style={{ color: 'var(--cui-body-color)' }}>Net Reversion</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatCurrency(exit_analysis.net_reversion)}</span>
            </div>
          </div>
        </div>

        {/* Valuation Summary Card */}
        <div
          style={{
            borderRadius: '0.5rem',
            padding: '1rem',
            backgroundColor: dcfColors.bg,
            border: `1px solid ${dcfColors.border}`,
          }}
        >
          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--cui-body-color)' }}>
            DCF Valuation
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Discount Rate</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{formatPercent(assumptions.discount_rate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Hold Period</span>
              <span style={{ color: 'var(--cui-body-color)' }}>{assumptions.hold_period_years} years</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid var(--cui-border-color)',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--cui-body-color)' }}>Present Value</span>
              <span style={{ fontWeight: 700, fontSize: '1.125rem', color: dcfColors.text }}>
                {formatCurrency(metrics.present_value)}
              </span>
            </div>
            {metrics.irr !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cui-secondary-color)' }}>IRR</span>
                <span style={{ fontWeight: 600, color: dcfColors.text }}>
                  {formatPercent(metrics.irr)}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>Price per Unit</span>
              <span style={{ color: 'var(--cui-body-color)' }}>
                {metrics.price_per_unit ? formatPerUnit(metrics.price_per_unit) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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

  const cellPad: React.CSSProperties = { padding: '0.5rem 0.75rem' };
  const cellRight: React.CSSProperties = { ...cellPad, textAlign: 'right' };
  const cellLeft: React.CSSProperties = { ...cellPad, textAlign: 'left' };

  return (
    <div
      style={{
        borderRadius: '0.5rem',
        overflow: 'hidden',
        backgroundColor: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--cui-border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Cash Flow Projections
        </h3>
        {projections.length > 5 && (
          <button
            onClick={() => setShowAllYears(!showAllYears)}
            style={{
              fontSize: '0.875rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              color: dcfColors.text,
              backgroundColor: dcfColors.bg,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {showAllYears ? 'Show Summary' : `Show All ${projections.length} Years`}
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <th style={{ ...cellLeft, color: 'var(--cui-secondary-color)' }}>Year</th>
              <th style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>GPR</th>
              <th style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>Vacancy</th>
              <th style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>EGI</th>
              <th style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>OpEx</th>
              <th style={{ ...cellRight, color: 'var(--cui-body-color)', fontWeight: 600 }}>NOI</th>
              <th style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>PV Factor</th>
              <th style={{ ...cellRight, color: dcfColors.text, fontWeight: 600 }}>PV of NOI</th>
            </tr>
          </thead>
          <tbody>
            {displayedProjections.map((period, idx) => {
              if (period === null) {
                return (
                  <tr key="ellipsis" style={{ borderBottom: '1px solid var(--cui-border-color)' }}>
                    <td colSpan={8} style={{ ...cellPad, textAlign: 'center', color: 'var(--cui-secondary-color)' }}>
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
              <td style={{ ...cellPad, fontWeight: 600, color: 'var(--cui-body-color)' }}>
                Exit (Yr {projections.length})
              </td>
              <td colSpan={4} style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>
                Terminal NOI: {formatCurrencyCompact(exit_analysis.terminal_noi)}
              </td>
              <td style={{ ...cellRight, fontWeight: 600, color: 'var(--cui-body-color)' }}>
                {formatCurrencyCompact(exit_analysis.net_reversion)}
              </td>
              <td style={{ ...cellRight, color: 'var(--cui-secondary-color)' }}>
                {(1 / Math.pow(1 + assumptions.discount_rate, projections.length)).toFixed(4)}
              </td>
              <td style={{ ...cellRight, fontWeight: 600, color: dcfColors.text }}>
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
              <td colSpan={7} style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--cui-body-color)' }}>
                Present Value
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1.125rem', color: dcfColors.text }}>
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
  const cp: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'right' };
  return (
    <tr
      style={{
        borderBottom: '1px solid var(--cui-border-color)',
        backgroundColor: isLast ? 'var(--cui-tertiary-bg)' : undefined,
      }}
    >
      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'var(--cui-body-color)' }}>
        {period.year}
      </td>
      <td style={{ ...cp, color: 'var(--cui-body-color)' }}>
        {formatCurrencyCompact(period.gpr)}
      </td>
      <td style={{ ...cp, color: 'var(--cui-danger)' }}>
        ({formatCurrencyCompact(period.vacancy_loss)})
      </td>
      <td style={{ ...cp, color: 'var(--cui-body-color)' }}>
        {formatCurrencyCompact(period.egi)}
      </td>
      <td style={{ ...cp, color: 'var(--cui-danger)' }}>
        ({formatCurrencyCompact(period.total_opex)})
      </td>
      <td style={{ ...cp, fontWeight: 600, color: 'var(--cui-body-color)' }}>
        {formatCurrencyCompact(period.noi)}
      </td>
      <td style={{ ...cp, color: 'var(--cui-secondary-color)' }}>
        {period.pv_factor.toFixed(4)}
      </td>
      <td style={{ ...cp, fontWeight: 600, color: dcfColors.text }}>
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

  const sPad: React.CSSProperties = { padding: '0.5rem 0.75rem' };
  const sRight: React.CSSProperties = { ...sPad, textAlign: 'right' };

  return (
    <div
      style={{
        borderRadius: '0.5rem',
        overflow: 'hidden',
        backgroundColor: 'var(--cui-card-bg)',
        border: '1px solid var(--cui-border-color)',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--cui-border-color)',
        }}
      >
        <h3 style={{ fontWeight: 600, color: 'var(--cui-body-color)' }}>
          Sensitivity Analysis
        </h3>
        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--cui-secondary-color)' }}>
          Present Value at different Discount Rates (rows) and Exit Cap Rates (columns)
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
              <th
                style={{ ...sPad, textAlign: 'left', color: 'var(--cui-secondary-color)' }}
              >
                Discount ↓ / Exit Cap →
              </th>
              {exitCapRates.map((cap) => {
                const isSelectedCap = Math.abs(cap - selectedExitCapRate) < 0.0001;
                return (
                  <th
                    key={cap}
                    style={{
                      ...sRight,
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
                    style={{
                      ...sPad,
                      fontWeight: 500,
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
                        style={{
                          ...sRight,
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

'use client';

import React, { useMemo, useState } from 'react';
import { CSpinner } from '@coreui/react';
import { useLeveragedCashFlow, useLoanSchedule } from '@/hooks/useCapitalization';
import type { Loan } from '@/types/assumptions';

/* ---------- Types ---------- */

type PeriodView = 'monthly' | 'quarterly' | 'annual';

interface CashFlowPeriodLabel {
  periodIndex: number;
  startDate: string;
  endDate: string;
  label: string;
}

interface CashFlowSection {
  sectionId: string;
  sectionName: string;
  lineItems: CashFlowLineItem[];
  subtotals: CashFlowSubtotal[];
  sectionTotal: number;
  sortOrder: number;
}

interface CashFlowLineItem {
  lineId: string;
  category: string;
  subcategory: string;
  description: string;
  periods: CashFlowSubtotal[];
  total: number;
  sourceType: string;
}

interface CashFlowSubtotal {
  periodIndex: number;
  periodSequence: number;
  amount: number;
  source: string;
}

interface DebtSchedulePeriod {
  period_index: number;
  interest_component: number;
  principal_component: number;
  scheduled_payment: number;
  is_io_period: boolean;
  is_balloon: boolean;
  balloon_amount: number;
  beginning_balance: number;
  ending_balance: number;
}

interface CashFlowResponse {
  success: boolean;
  data: {
    projectId: number;
    periodType: string;
    startDate: string;
    endDate: string;
    totalPeriods: number;
    periods: CashFlowPeriodLabel[];
    sections: CashFlowSection[];
    summary: Record<string, unknown>;
  };
}

/* Row model for display */
interface DisplayRow {
  label: string;
  rowType: 'section-header' | 'indent' | 'subtotal' | 'noi' | 'divider' | 'net-cf' | 'grand-total' | 'info';
  values: number[]; // one per aggregated period
  showSign?: boolean;
}

/* ---------- Props ---------- */

interface LeveragedCashFlowProps {
  projectId: string;
  loans?: Loan[];
}

/* ---------- Helpers ---------- */

function formatLCFCurrency(value: number): string {
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: abs >= 100000 ? 0 : 2,
    maximumFractionDigits: abs >= 100000 ? 0 : 2,
  };
  const formatted = new Intl.NumberFormat('en-US', opts).format(abs);
  if (value < 0) return `(${formatted})`;
  return formatted;
}

function aggregatePeriods(
  values: number[],
  view: PeriodView
): number[] {
  if (view === 'monthly') return values;

  const groupSize = view === 'quarterly' ? 3 : 12;
  const result: number[] = [];
  for (let i = 0; i < values.length; i += groupSize) {
    const chunk = values.slice(i, i + groupSize);
    result.push(chunk.reduce((s, v) => s + v, 0));
  }
  return result;
}

function buildPeriodHeaders(
  periodLabels: CashFlowPeriodLabel[],
  view: PeriodView,
  startDate?: string
): string[] {
  if (view === 'monthly') {
    return periodLabels.map((p) => {
      const d = new Date(p.startDate);
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
  }

  const groupSize = view === 'quarterly' ? 3 : 12;
  const headers: string[] = [];
  for (let i = 0; i < periodLabels.length; i += groupSize) {
    if (view === 'quarterly') {
      const qIdx = Math.floor(i / 3);
      const d = new Date(periodLabels[i].startDate);
      headers.push(`Q${(qIdx % 4) + 1} ${d.getFullYear().toString().slice(-2)}`);
    } else {
      headers.push(`Year ${Math.floor(i / 12) + 1}`);
    }
  }
  return headers;
}

/* ---------- Component ---------- */

export default function LeveragedCashFlow({
  projectId,
  loans = [],
}: LeveragedCashFlowProps) {
  const [periodView, setPeriodView] = useState<PeriodView>('monthly');

  const { data: cfResponse, isLoading: cfLoading, error: cfError } = useLeveragedCashFlow(projectId);

  // Get first loan's debt schedule for interest/principal breakdown
  const firstLoanId = loans.length > 0 ? loans[0].loan_id : null;
  const { data: scheduleData } = useLoanSchedule(projectId, firstLoanId);

  const cfData = (cfResponse as CashFlowResponse)?.data;
  const sections = cfData?.sections || [];
  const periodLabels = cfData?.periods || [];

  /* Determine what data is available */
  const revenueSection = sections.find((s) => s.sectionId === 'revenue-gross');
  const deductionsSection = sections.find((s) => s.sectionId === 'revenue-deductions');
  const netRevenueSection = sections.find((s) => s.sectionId === 'revenue-net');
  const financingSection = sections.find((s) => s.sectionId === 'financing');

  const hasIncomeData =
    (revenueSection && revenueSection.sectionTotal !== 0) ||
    (netRevenueSection && netRevenueSection.sectionTotal !== 0);
  const hasDebtData =
    financingSection && (financingSection.lineItems.length > 0 || financingSection.subtotals.length > 0);

  /* Debt schedule breakdown */
  const debtSchedulePeriods = (scheduleData as { periods?: DebtSchedulePeriod[] })?.periods || [];

  /* Build the display data */
  const { rows, headers } = useMemo(() => {
    if (!cfData || periodLabels.length === 0) {
      return { rows: [] as DisplayRow[], headers: [] as string[] };
    }

    const totalPeriods = periodLabels.length;
    const hdrs = buildPeriodHeaders(periodLabels, periodView);
    const displayRows: DisplayRow[] = [];

    /* Zero-filled arrays for empty data */
    const zeroes = new Array(totalPeriods).fill(0);

    /* ---- NOI Section ---- */
    if (hasIncomeData) {
      // GPI row
      const gpiPeriodValues = zeroes.map((_, i) => {
        const sub = revenueSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });
      displayRows.push({
        label: 'Gross Potential Income',
        rowType: 'section-header',
        values: aggregatePeriods(gpiPeriodValues, periodView),
      });

      // Vacancy/deductions
      const deductionValues = zeroes.map((_, i) => {
        const sub = deductionsSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });
      displayRows.push({
        label: 'Less: Vacancy & Credit Loss',
        rowType: 'indent',
        values: aggregatePeriods(deductionValues, periodView),
      });

      // EGI = GPI - deductions
      const egiValues = gpiPeriodValues.map((gpi, i) => gpi + deductionValues[i]);
      displayRows.push({
        label: 'Effective Gross Income',
        rowType: 'subtotal',
        values: aggregatePeriods(egiValues, periodView),
      });

      // TODO: Operating Expenses (need opex section)
      // For now skip if not available

      // NOI row
      const noiValues = zeroes.map((_, i) => {
        const sub = netRevenueSection?.subtotals.find((s) => s.periodIndex === i);
        return sub ? sub.amount : 0;
      });
      displayRows.push({
        label: 'Net Operating Income (NOI)',
        rowType: 'noi',
        values: aggregatePeriods(noiValues, periodView),
      });
    } else {
      // Scenario B: no income data — show placeholder NOI row
      displayRows.push({
        label: 'Net Operating Income (NOI)',
        rowType: 'noi',
        values: [],
      });
    }

    // Divider
    displayRows.push({
      label: '',
      rowType: 'divider',
      values: [],
    });

    /* ---- Debt Service Section ---- */
    if (hasDebtData) {
      displayRows.push({
        label: 'Debt Service',
        rowType: 'section-header',
        values: [],
      });

      // Use debt schedule for interest/principal breakdown
      if (debtSchedulePeriods.length > 0) {
        // Interest Expense row
        const interestValues = zeroes.map((_, i) => {
          const dp = debtSchedulePeriods.find((p) => p.period_index === i);
          return dp ? -dp.interest_component : 0;
        });
        displayRows.push({
          label: 'Interest Expense',
          rowType: 'indent',
          values: aggregatePeriods(interestValues, periodView),
        });

        // Principal Payment row
        const principalValues = zeroes.map((_, i) => {
          const dp = debtSchedulePeriods.find((p) => p.period_index === i);
          // Include balloon in principal for the balloon period
          const princ = dp ? dp.principal_component : 0;
          const balloon = dp && dp.is_balloon ? dp.balloon_amount : 0;
          return -(princ + balloon);
        });
        displayRows.push({
          label: 'Principal Payment',
          rowType: 'indent',
          values: aggregatePeriods(principalValues, periodView),
        });

        // Origination/Fees — period 0 only (from cash flow api: period 0 amount includes draw + origination)
        // The net financing period 0 = draw - origination fee = 29205203.125
        // Draw = loan amount = 29662500, so origination = 29662500 - 29205203.125 = 457296.875
        // Actually let's check: net_financing[0] - (-debt_service[0]) = initial_draw_net
        // We can compute: origination = loan_amount * origination_fee_pct
        const originationFees = zeroes.map(() => 0);
        if (loans.length > 0) {
          const loan = loans[0];
          const feePct = loan.origination_fee_pct ?? 0;
          const feeAmount = (loan.commitment_amount || 0) * (typeof feePct === 'number' ? feePct : parseFloat(String(feePct)) || 0) / 100;
          if (feeAmount > 0) {
            originationFees[0] = -feeAmount;
          }
        }
        const hasOrigFees = originationFees.some((v) => v !== 0);
        if (hasOrigFees) {
          displayRows.push({
            label: 'Origination/Fees',
            rowType: 'indent',
            values: aggregatePeriods(originationFees, periodView),
          });
        }

        // Total Debt Service = interest + principal + fees
        const totalDebtService = zeroes.map(
          (_, i) =>
            (interestValues[i] || 0) + (principalValues[i] || 0) + (originationFees[i] || 0)
        );
        displayRows.push({
          label: 'Total Debt Service',
          rowType: 'subtotal',
          values: aggregatePeriods(totalDebtService, periodView),
        });
      } else {
        // Fallback: use financing subtotals from cash flow API (net amounts only)
        const financingValues = zeroes.map((_, i) => {
          const sub = financingSection?.subtotals.find((s) => s.periodIndex === i);
          return sub ? sub.amount : 0;
        });
        // Period 0 is typically a net draw (positive), subsequent periods are debt service (negative)
        // For total debt service, exclude the initial draw
        const debtServiceValues = financingValues.map((v, i) => (i === 0 ? 0 : v));
        displayRows.push({
          label: 'Total Debt Service',
          rowType: 'subtotal',
          values: aggregatePeriods(debtServiceValues, periodView),
        });
      }
    } else {
      // Scenario C: no debt
      displayRows.push({
        label: 'Debt Service',
        rowType: 'info',
        values: [],
      });
    }

    // Divider
    displayRows.push({
      label: '',
      rowType: 'divider',
      values: [],
    });

    /* ---- Net Cash Flow ---- */
    if (hasIncomeData && hasDebtData) {
      // Net CF = NOI + total debt service (debt service is negative)
      const noiRow = displayRows.find((r) => r.rowType === 'noi');
      const debtRow = displayRows.find((r) => r.label === 'Total Debt Service');
      if (noiRow && debtRow && noiRow.values.length > 0 && debtRow.values.length > 0) {
        const netCF = noiRow.values.map((noi, i) => noi + (debtRow.values[i] || 0));
        displayRows.push({
          label: 'Net Cash Flow (After Debt)',
          rowType: 'net-cf',
          values: netCF,
          showSign: true,
        });
      }
    } else if (hasIncomeData && !hasDebtData) {
      // Net CF = NOI (no debt)
      const noiRow = displayRows.find((r) => r.rowType === 'noi');
      if (noiRow && noiRow.values.length > 0) {
        displayRows.push({
          label: 'Net Cash Flow (After Debt)',
          rowType: 'net-cf',
          values: [...noiRow.values],
          showSign: true,
        });
      }
    } else {
      // Scenario B: debt only, no income — show dashes
      const debtRow = displayRows.find((r) => r.label === 'Total Debt Service');
      const emptyValues = debtRow ? debtRow.values.map(() => 0) : [];
      displayRows.push({
        label: 'Net Cash Flow (After Debt)',
        rowType: 'net-cf',
        values: emptyValues,
        showSign: true,
      });
    }

    return { rows: displayRows, headers: hdrs };
  }, [
    cfData,
    periodLabels,
    periodView,
    hasIncomeData,
    hasDebtData,
    debtSchedulePeriods,
    sections,
    revenueSection,
    deductionsSection,
    netRevenueSection,
    financingSection,
    loans,
  ]);

  /* ---------- Render ---------- */

  if (cfLoading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" style={{ color: 'var(--cui-primary)' }} />
        <span className="ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
          Loading cash flow...
        </span>
      </div>
    );
  }

  if (cfError) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--cui-danger)' }}>
        Failed to load cash flow data.
      </div>
    );
  }

  if (!cfData || periodLabels.length === 0) {
    return (
      <div
        className="text-center py-5"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        No cash flow data available.
      </div>
    );
  }

  return (
    <div>
      {/* Header controls */}
      <div
        className="d-flex justify-content-between align-items-center flex-wrap gap-2"
        style={{ marginBottom: '12px' }}
      >
        <span
          className="fw-semibold"
          style={{ fontSize: '0.875rem', color: 'var(--cui-body-color)' }}
        >
          Leveraged Cash Flow
        </span>

        <div className="btn-group btn-group-sm" role="group" aria-label="Period view">
          {(['monthly', 'quarterly', 'annual'] as PeriodView[]).map((view) => (
            <button
              key={view}
              type="button"
              className={`btn ${periodView === view ? 'btn-primary' : 'btn-ghost-secondary'}`}
              onClick={() => setPeriodView(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="leveraged-cf-container">
        <table className="leveraged-cf-grid">
          <thead>
            <tr>
              <th>Line Item</th>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              /* Divider row */
              if (row.rowType === 'divider') {
                return (
                  <tr key={rowIdx} className="divider">
                    <td colSpan={headers.length + 1} />
                  </tr>
                );
              }

              /* Info row (no debt scenario) */
              if (row.rowType === 'info') {
                return (
                  <tr key={rowIdx} className="section-header">
                    <td>{row.label}</td>
                    <td
                      colSpan={headers.length}
                      style={{
                        textAlign: 'center',
                        color: 'var(--cui-text-muted)',
                        fontWeight: 400,
                        fontStyle: 'italic',
                      }}
                    >
                      None — Net Cash Flow equals NOI
                    </td>
                  </tr>
                );
              }

              /* NOI row with no income data placeholder */
              if (row.rowType === 'noi' && row.values.length === 0) {
                return (
                  <tr key={rowIdx} className="noi-row">
                    <td>{row.label}</td>
                    <td
                      colSpan={headers.length}
                      style={{
                        textAlign: 'center',
                        color: 'var(--cui-text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      No income data available
                    </td>
                  </tr>
                );
              }

              /* Section header with no values */
              if (row.rowType === 'section-header' && row.values.length === 0) {
                return (
                  <tr key={rowIdx} className="section-header">
                    <td>{row.label}</td>
                    {headers.map((_, i) => (
                      <td key={i} />
                    ))}
                  </tr>
                );
              }

              /* Standard data rows */
              const rowClass = row.rowType === 'noi'
                ? 'noi-row'
                : row.rowType === 'net-cf'
                  ? 'net-cf-row'
                  : row.rowType === 'grand-total'
                    ? 'grand-total'
                    : row.rowType === 'subtotal'
                      ? 'subtotal'
                      : row.rowType === 'section-header'
                        ? 'section-header'
                        : row.rowType === 'indent'
                          ? 'indent'
                          : '';

              return (
                <tr key={rowIdx} className={rowClass}>
                  <td>{row.label}</td>
                  {row.values.map((val, colIdx) => {
                    const signClass =
                      row.showSign && val !== 0
                        ? val > 0
                          ? 'positive'
                          : 'negative'
                        : '';
                    return (
                      <td key={colIdx} className={signClass}>
                        {val === 0 && row.rowType === 'net-cf' && !hasIncomeData
                          ? '—'
                          : formatLCFCurrency(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info message for missing income data */}
      {!hasIncomeData && hasDebtData && (
        <div
          className="d-flex align-items-center gap-2 mt-2"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--cui-info)',
            padding: '8px 12px',
            background: 'rgba(var(--cui-info-rgb), 0.06)',
            borderRadius: 'var(--cui-border-radius)',
          }}
        >
          <span>ℹ️</span>
          <span>
            Add income assumptions in the Operations tab to see the full leveraged cash flow.
          </span>
        </div>
      )}
    </div>
  );
}

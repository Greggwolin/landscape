'use client';

import React, { useMemo, useState } from 'react';
import { CBadge, CSpinner } from '@coreui/react';
import { useLoanSchedule } from '@/hooks/useCapitalization';
import type { Loan } from '@/types/assumptions';

/* ---------- Types ---------- */

type PeriodView = 'monthly' | 'quarterly' | 'annual';

interface TermPeriod {
  period_index: number;
  date: string;
  beginning_balance: number;
  scheduled_payment: number;
  interest_component: number;
  principal_component: number;
  ending_balance: number;
  is_io_period: boolean;
  is_balloon: boolean;
  balloon_amount: number;
}

interface RevolverPeriod {
  period_index: number;
  date: string;
  beginning_balance: number;
  cost_draw: number;
  accrued_interest: number;
  interest_reserve_draw: number;
  interest_reserve_balance: number;
  origination_cost: number;
  release_payments: number;
  ending_balance: number;
  loan_activity: number;
}

interface DebtScheduleResponse {
  loan_id: number;
  loan_name: string;
  structure_type: 'TERM' | 'REVOLVER';
  calculation_summary: Record<string, number>;
  periods: (TermPeriod | RevolverPeriod)[];
}

/* Aggregated period for display */
interface DisplayPeriod {
  label: string;
  dateLabel: string;
  beginningBalance: number;
  endingBalance: number;
  /* TERM fields */
  payment?: number;
  interest?: number;
  principal?: number;
  paymentType?: string;
  isBalloon?: boolean;
  balloonAmount?: number;
  /* REVOLVER fields */
  draws?: number;
  releases?: number;
  fees?: number;
}

/* ---------- Props ---------- */

interface LoanScheduleGridProps {
  projectId: string;
  loans: Loan[];
  /** When true, don't constrain height (for modal use) */
  fullHeight?: boolean;
  /** Controlled period view from parent */
  periodView?: PeriodView;
  /** Controlled loan ID from parent */
  selectedLoanId?: number | null;
  /** Hide the header controls (loan selector, period toggle, export) */
  hideControls?: boolean;
}

/* ---------- Helpers ---------- */

function formatScheduleCurrency(value: number): string {
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

function getPaymentType(period: TermPeriod): string {
  if (period.is_balloon) return 'BALLOON';
  if (period.is_io_period) return 'IO';
  if (period.scheduled_payment > 0) return 'P&I';
  return '';
}

function getPaymentTypeBadgeColor(type: string): string {
  switch (type) {
    case 'IO':
      return 'info';
    case 'P&I':
      return 'primary';
    case 'BALLOON':
      return 'warning';
    case 'MIXED':
      return 'secondary';
    default:
      return 'light';
  }
}

/* Generate period date label from analysis start date + period index */
function periodDateLabel(periodIndex: number, startDate?: string): string {
  if (startDate) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + periodIndex);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return `Mo ${periodIndex + 1}`;
}

/* ---------- Aggregation ---------- */

function aggregateTermPeriods(
  periods: TermPeriod[],
  view: PeriodView,
  startDate?: string
): DisplayPeriod[] {
  // Filter out trailing zero-balance periods with no activity
  const activePeriods = periods.filter(
    (p) => p.beginning_balance > 0 || p.scheduled_payment > 0 || p.is_balloon
  );

  if (view === 'monthly') {
    return activePeriods.map((p) => ({
      label: `${p.period_index + 1}`,
      dateLabel: periodDateLabel(p.period_index, startDate),
      beginningBalance: p.beginning_balance,
      endingBalance: p.ending_balance,
      payment: p.scheduled_payment,
      interest: p.interest_component,
      principal: p.principal_component,
      paymentType: getPaymentType(p),
      isBalloon: p.is_balloon,
      balloonAmount: p.balloon_amount,
    }));
  }

  const groupSize = view === 'quarterly' ? 3 : 12;
  const groups: Map<number, TermPeriod[]> = new Map();

  for (const p of activePeriods) {
    const groupIndex = Math.floor(p.period_index / groupSize);
    if (!groups.has(groupIndex)) groups.set(groupIndex, []);
    groups.get(groupIndex)!.push(p);
  }

  const result: DisplayPeriod[] = [];
  for (const [groupIndex, group] of Array.from(groups.entries()).sort(
    (a, b) => a[0] - b[0]
  )) {
    const first = group[0];
    const last = group[group.length - 1];

    const totalPayment = group.reduce((s, p) => s + p.scheduled_payment, 0);
    const totalInterest = group.reduce((s, p) => s + p.interest_component, 0);
    const totalPrincipal = group.reduce((s, p) => s + p.principal_component, 0);
    const hasBalloon = group.some((p) => p.is_balloon);
    const balloonAmount = group.reduce((s, p) => s + p.balloon_amount, 0);

    // Determine dominant type
    const types = new Set(group.map(getPaymentType).filter(Boolean));
    let paymentType = 'MIXED';
    if (types.size === 1) paymentType = Array.from(types)[0];
    if (hasBalloon) paymentType = 'BALLOON';

    let dateLabel: string;
    if (view === 'quarterly') {
      const qNum = groupIndex + 1;
      const yearOffset = Math.floor(first.period_index / 12);
      dateLabel = `Q${((groupIndex % 4) + 1)} ${startDate ? new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + groupIndex * 3)).getFullYear() : `Yr ${yearOffset + 1}`}`;
    } else {
      dateLabel = `Year ${groupIndex + 1}`;
    }

    result.push({
      label: view === 'quarterly' ? `Q${groupIndex + 1}` : `Yr ${groupIndex + 1}`,
      dateLabel,
      beginningBalance: first.beginning_balance,
      endingBalance: last.ending_balance,
      payment: totalPayment,
      interest: totalInterest,
      principal: totalPrincipal,
      paymentType,
      isBalloon: hasBalloon,
      balloonAmount,
    });
  }

  return result;
}

function aggregateRevolverPeriods(
  periods: RevolverPeriod[],
  view: PeriodView,
  startDate?: string
): DisplayPeriod[] {
  const activePeriods = periods.filter(
    (p) =>
      p.beginning_balance > 0 ||
      p.cost_draw > 0 ||
      p.origination_cost > 0 ||
      p.release_payments > 0
  );

  if (view === 'monthly') {
    return activePeriods.map((p) => ({
      label: `${p.period_index + 1}`,
      dateLabel: periodDateLabel(p.period_index, startDate),
      beginningBalance: p.beginning_balance,
      endingBalance: p.ending_balance,
      draws: p.cost_draw,
      interest: p.accrued_interest,
      releases: p.release_payments,
      fees: p.origination_cost,
    }));
  }

  const groupSize = view === 'quarterly' ? 3 : 12;
  const groups: Map<number, RevolverPeriod[]> = new Map();

  for (const p of activePeriods) {
    const groupIndex = Math.floor(p.period_index / groupSize);
    if (!groups.has(groupIndex)) groups.set(groupIndex, []);
    groups.get(groupIndex)!.push(p);
  }

  const result: DisplayPeriod[] = [];
  for (const [groupIndex, group] of Array.from(groups.entries()).sort(
    (a, b) => a[0] - b[0]
  )) {
    const first = group[0];
    const last = group[group.length - 1];

    result.push({
      label: view === 'quarterly' ? `Q${groupIndex + 1}` : `Yr ${groupIndex + 1}`,
      dateLabel:
        view === 'quarterly'
          ? `Q${((groupIndex % 4) + 1)} ${startDate ? new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + groupIndex * 3)).getFullYear() : ''}`
          : `Year ${groupIndex + 1}`,
      beginningBalance: first.beginning_balance,
      endingBalance: last.ending_balance,
      draws: group.reduce((s, p) => s + p.cost_draw, 0),
      interest: group.reduce((s, p) => s + p.accrued_interest, 0),
      releases: group.reduce((s, p) => s + p.release_payments, 0),
      fees: group.reduce((s, p) => s + p.origination_cost, 0),
    });
  }

  return result;
}

/* ---------- Component ---------- */

export default function LoanScheduleGrid({
  projectId,
  loans,
  fullHeight = false,
  periodView: controlledPeriodView,
  selectedLoanId: controlledLoanId,
  hideControls = false,
}: LoanScheduleGridProps) {
  const [internalLoanId, setInternalLoanId] = useState<number | null>(
    loans.length > 0 ? loans[0].loan_id : null
  );
  const [internalPeriodView, setInternalPeriodView] = useState<PeriodView>('monthly');

  const activeLoanId = controlledLoanId ?? internalLoanId;
  const periodView = controlledPeriodView ?? internalPeriodView;

  // Update internal loan ID when loans change
  React.useEffect(() => {
    if (!controlledLoanId && !internalLoanId && loans.length > 0) {
      setInternalLoanId(loans[0].loan_id);
    }
  }, [loans, controlledLoanId, internalLoanId]);

  const { data: scheduleData, isLoading, error } = useLoanSchedule(projectId, activeLoanId);

  const schedule = scheduleData as DebtScheduleResponse | undefined;
  const structureType = schedule?.structure_type;

  // Get project analysis_start_date from the loan start date context
  // The API doesn't return dates in periods currently, so we use project context
  const startDate = '2026-03-01'; // TODO: derive from project config

  const displayPeriods = useMemo(() => {
    if (!schedule?.periods || schedule.periods.length === 0) return [];

    if (structureType === 'TERM') {
      return aggregateTermPeriods(
        schedule.periods as TermPeriod[],
        periodView,
        startDate
      );
    }
    return aggregateRevolverPeriods(
      schedule.periods as RevolverPeriod[],
      periodView,
      startDate
    );
  }, [schedule, periodView, structureType, startDate]);

  /* Summary row totals */
  const summaryRow = useMemo(() => {
    if (displayPeriods.length === 0) return null;

    if (structureType === 'TERM') {
      return {
        payment: displayPeriods.reduce((s, p) => s + (p.payment ?? 0), 0),
        interest: displayPeriods.reduce((s, p) => s + (p.interest ?? 0), 0),
        principal: displayPeriods.reduce((s, p) => s + (p.principal ?? 0), 0),
      };
    }
    return {
      draws: displayPeriods.reduce((s, p) => s + (p.draws ?? 0), 0),
      interest: displayPeriods.reduce((s, p) => s + (p.interest ?? 0), 0),
      releases: displayPeriods.reduce((s, p) => s + (p.releases ?? 0), 0),
      fees: displayPeriods.reduce((s, p) => s + (p.fees ?? 0), 0),
    };
  }, [displayPeriods, structureType]);

  const selectedLoan = loans.find((l) => l.loan_id === activeLoanId);

  /* ---------- Render ---------- */

  if (loans.length === 0) {
    return (
      <div
        className="text-center py-5"
        style={{ color: 'var(--cui-secondary-color)' }}
      >
        No loans defined. Add a loan to view the schedule.
      </div>
    );
  }

  return (
    <div>
      {/* Header controls */}
      {!hideControls && (
        <div
          className="d-flex justify-content-between align-items-center flex-wrap gap-2"
          style={{ marginBottom: '12px' }}
        >
          {/* Loan selector */}
          <div className="d-flex align-items-center gap-2">
            {loans.length > 1 ? (
              <select
                className="form-select form-select-sm"
                style={{
                  width: 'auto',
                  minWidth: '200px',
                  backgroundColor: 'var(--cui-body-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                }}
                value={activeLoanId ?? ''}
                onChange={(e) => setInternalLoanId(Number(e.target.value))}
              >
                {loans.map((l) => (
                  <option key={l.loan_id} value={l.loan_id}>
                    {l.loan_name}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="fw-semibold"
                style={{ fontSize: '0.875rem', color: 'var(--cui-body-color)' }}
              >
                {selectedLoan?.loan_name ?? ''}
              </span>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Period toggle */}
            <div className="btn-group btn-group-sm" role="group" aria-label="Period view">
              {(['monthly', 'quarterly', 'annual'] as PeriodView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`btn ${periodView === view ? 'btn-primary' : 'btn-ghost-secondary'}`}
                  onClick={() => setInternalPeriodView(view)}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            {/* Export dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary btn-sm dropdown-toggle"
                type="button"
                data-coreui-toggle="dropdown"
                aria-expanded="false"
              >
                Export
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => console.log('Export PDF', activeLoanId)}
                  >
                    Export as PDF
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => console.log('Export Excel', activeLoanId)}
                  >
                    Export as Excel
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-4">
          <CSpinner size="sm" style={{ color: 'var(--cui-primary)' }} />
          <span className="ms-2" style={{ color: 'var(--cui-secondary-color)' }}>
            Loading schedule...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="text-center py-4"
          style={{ color: 'var(--cui-danger)' }}
        >
          Failed to load loan schedule.
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && displayPeriods.length > 0 && (
        <div
          className={fullHeight ? 'loan-schedule-container-full' : 'loan-schedule-container'}
        >
          <table className="loan-schedule-grid">
            <thead>
              {structureType === 'TERM' ? (
                <tr>
                  <th style={{ textAlign: 'center' }}>Period</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Beg Balance</th>
                  <th style={{ textAlign: 'right' }}>Payment</th>
                  <th style={{ textAlign: 'right' }}>Interest</th>
                  <th style={{ textAlign: 'right' }}>Principal</th>
                  <th style={{ textAlign: 'right' }}>End Balance</th>
                  <th style={{ textAlign: 'center' }}>Type</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ textAlign: 'center' }}>Period</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Beg Balance</th>
                  <th style={{ textAlign: 'right' }}>Draws</th>
                  <th style={{ textAlign: 'right' }}>Interest</th>
                  <th style={{ textAlign: 'right' }}>Releases</th>
                  <th style={{ textAlign: 'right' }}>Fees</th>
                  <th style={{ textAlign: 'right' }}>End Balance</th>
                </tr>
              )}
            </thead>
            <tbody>
              {displayPeriods.map((period, idx) => {
                const isBalloonRow = period.isBalloon === true;

                if (structureType === 'TERM') {
                  return (
                    <tr
                      key={idx}
                      className={isBalloonRow ? 'balloon-row' : ''}
                    >
                      <td style={{ textAlign: 'center' }}>{period.label}</td>
                      <td>{period.dateLabel}</td>
                      <td className="currency">
                        {formatScheduleCurrency(period.beginningBalance)}
                      </td>
                      <td className="currency">
                        {formatScheduleCurrency(period.payment ?? 0)}
                      </td>
                      <td className="currency">
                        {formatScheduleCurrency(-(period.interest ?? 0))}
                      </td>
                      <td className="currency">
                        {formatScheduleCurrency(period.principal ?? 0)}
                      </td>
                      <td className="currency">
                        {formatScheduleCurrency(period.endingBalance)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {period.paymentType && (
                          <CBadge
                            color={getPaymentTypeBadgeColor(period.paymentType)}
                            style={{ fontSize: '0.6875rem' }}
                          >
                            {period.paymentType}
                          </CBadge>
                        )}
                      </td>
                    </tr>
                  );
                }

                /* REVOLVER row */
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{period.label}</td>
                    <td>{period.dateLabel}</td>
                    <td className="currency">
                      {formatScheduleCurrency(period.beginningBalance)}
                    </td>
                    <td className="currency">
                      {formatScheduleCurrency(period.draws ?? 0)}
                    </td>
                    <td className="currency">
                      {formatScheduleCurrency(-(period.interest ?? 0))}
                    </td>
                    <td className="currency">
                      {formatScheduleCurrency(-(period.releases ?? 0))}
                    </td>
                    <td className="currency">
                      {formatScheduleCurrency(-(period.fees ?? 0))}
                    </td>
                    <td className="currency">
                      {formatScheduleCurrency(period.endingBalance)}
                    </td>
                  </tr>
                );
              })}

              {/* Summary row */}
              {summaryRow && (
                <tr className="summary-row">
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>Total</td>
                  <td>{'\u2014'}</td>
                  <td>{'\u2014'}</td>
                  {structureType === 'TERM' ? (
                    <>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency((summaryRow as { payment: number }).payment)}
                      </td>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency(-(summaryRow.interest ?? 0))}
                      </td>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency(
                          (summaryRow as { principal: number }).principal
                        )}
                      </td>
                      <td>{'\u2014'}</td>
                      <td>{'\u2014'}</td>
                    </>
                  ) : (
                    <>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency(
                          (summaryRow as { draws: number }).draws ?? 0
                        )}
                      </td>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency(-(summaryRow.interest ?? 0))}
                      </td>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency(
                          -((summaryRow as { releases: number }).releases ?? 0)
                        )}
                      </td>
                      <td className="currency" style={{ fontWeight: 700 }}>
                        {formatScheduleCurrency(
                          -((summaryRow as { fees: number }).fees ?? 0)
                        )}
                      </td>
                      <td>{'\u2014'}</td>
                    </>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state when schedule loads but has no data */}
      {!isLoading && !error && displayPeriods.length === 0 && activeLoanId && (
        <div
          className="text-center py-4"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          No schedule data available for this loan.
        </div>
      )}
    </div>
  );
}

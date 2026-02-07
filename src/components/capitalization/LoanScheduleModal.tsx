'use client';

import React, { useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CCloseButton,
} from '@coreui/react';
import LoanScheduleGrid from './LoanScheduleGrid';
import { useLoanSchedule } from '@/hooks/useCapitalization';
import type { Loan } from '@/types/assumptions';

type PeriodView = 'monthly' | 'quarterly' | 'annual';

interface LoanScheduleModalProps {
  projectId: string;
  loanId: number;
  loan?: Loan;
  onClose: () => void;
}

function formatModalCurrency(value: number): string {
  const abs = Math.abs(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: abs >= 100000 ? 0 : 2,
    maximumFractionDigits: abs >= 100000 ? 0 : 2,
  }).format(value);
}

export default function LoanScheduleModal({
  projectId,
  loanId,
  loan,
  onClose,
}: LoanScheduleModalProps) {
  const [periodView, setPeriodView] = useState<PeriodView>('monthly');
  const { data: scheduleData } = useLoanSchedule(projectId, loanId);

  const schedule = scheduleData as {
    loan_name?: string;
    structure_type?: string;
    calculation_summary?: Record<string, number>;
  } | undefined;

  const summary = schedule?.calculation_summary;
  const loanName = schedule?.loan_name ?? loan?.loan_name ?? 'Loan Schedule';

  return (
    <CModal visible size="xl" onClose={onClose} alignment="center" scrollable>
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1rem', fontWeight: 600 }}>
          Loan Schedule: {loanName}
        </CModalTitle>
        <div className="d-flex align-items-center gap-2 ms-auto me-2">
          {/* Period toggle */}
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
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => console.log('Export PDF', loanId)}
                >
                  Export as PDF
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => console.log('Export Excel', loanId)}
                >
                  Export as Excel
                </button>
              </li>
            </ul>
          </div>
        </div>
        <CCloseButton onClick={onClose} />
      </CModalHeader>

      <CModalBody style={{ padding: '16px 24px' }}>
        {/* Summary strip */}
        {summary && (
          <div className="schedule-summary-strip">
            {summary.loan_amount != null && (
              <div>
                <span className="metric-label">Loan Amount: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.loan_amount)}
                </span>
              </div>
            )}
            {loan?.interest_rate_pct != null && (
              <div>
                <span className="metric-label">Rate: </span>
                <span className="metric-value">{loan.interest_rate_pct.toFixed(3)}%</span>
              </div>
            )}
            {summary.monthly_payment_io != null && (
              <div>
                <span className="metric-label">IO Payment: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.monthly_payment_io)}/mo
                </span>
              </div>
            )}
            {summary.monthly_payment_amort != null && (
              <div>
                <span className="metric-label">P&I Payment: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.monthly_payment_amort)}/mo
                </span>
              </div>
            )}
            {summary.total_interest != null && (
              <div>
                <span className="metric-label">Total Interest: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.total_interest)}
                </span>
              </div>
            )}
            {summary.balloon_amount != null && summary.balloon_amount > 0 && (
              <div>
                <span className="metric-label">Balloon: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.balloon_amount)}
                </span>
              </div>
            )}
            {/* Revolver-specific */}
            {summary.commitment_amount != null && (
              <div>
                <span className="metric-label">Commitment: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.commitment_amount)}
                </span>
              </div>
            )}
            {summary.peak_balance != null && (
              <div>
                <span className="metric-label">Peak Balance: </span>
                <span className="metric-value">
                  {formatModalCurrency(summary.peak_balance)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Grid — full height, no scroll constraint */}
        <LoanScheduleGrid
          projectId={projectId}
          loans={loan ? [loan] : []}
          fullHeight
          periodView={periodView}
          selectedLoanId={loanId}
          hideControls
        />
      </CModalBody>
    </CModal>
  );
}

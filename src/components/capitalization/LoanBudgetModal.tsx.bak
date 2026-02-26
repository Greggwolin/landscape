'use client';

import React from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CSpinner,
} from '@coreui/react';
import {
  useLoanBudgetSummary,
  type LoanBudgetSummaryResponse,
} from '@/hooks/useCapitalization';

interface LoanBudgetModalProps {
  projectId: string;
  loanId: number | null;
  loanName?: string;
  visible: boolean;
  onClose: () => void;
}

function formatCurrency(value: number): string {
  if (Math.abs(value || 0) < 0.005) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPct(value: number | null): string {
  if (value == null) return '';
  if (Math.abs(value) < 0.0001) return '-';
  return `${value.toFixed(2)}%`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      className="fw-semibold loan-budget-section-header"
      style={{
        fontSize: '0.8125rem',
        color: 'var(--cui-body-color)',
        background: 'var(--cui-body-bg)',
        border: '1px solid var(--cui-border-color)',
        borderBottom: '0',
        padding: '8px 10px',
      }}
    >
      {title}
    </div>
  );
}

function SummaryTable({
  data,
}: {
  data: LoanBudgetSummaryResponse;
}) {
  return (
    <>
      <SectionHeader title="Loan Budget" />
      <table className="table table-sm mb-3" style={{ border: '1px solid var(--cui-border-color)' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: 'var(--cui-tertiary-bg)' }}>Line Item</th>
            <th className="text-end" style={{ background: 'var(--cui-tertiary-bg)' }}>Total</th>
            <th className="text-end" style={{ background: 'var(--cui-tertiary-bg)' }}>Borrower</th>
            <th className="text-end" style={{ background: 'var(--cui-tertiary-bg)' }}>Lender</th>
          </tr>
        </thead>
        <tbody>
          {data.loan_budget.rows.map((row) => (
            <tr key={row.label} className="loan-budget-line-item-row">
              <td className="loan-budget-line-item-label">{row.label}</td>
              <td className="text-end">{formatCurrency(row.total)}</td>
              <td className="text-end">{formatCurrency(row.total - row.lender)}</td>
              <td className="text-end">{formatCurrency(row.lender)}</td>
            </tr>
          ))}
          <tr className="fw-semibold loan-budget-total-row">
            <td>Total Budget</td>
            <td className="text-end">{formatCurrency(data.loan_budget.totals.total_budget)}</td>
            <td className="text-end">{formatCurrency(data.loan_budget.totals.total_budget - data.loan_budget.totals.lender_total)}</td>
            <td className="text-end">{formatCurrency(data.loan_budget.totals.lender_total)}</td>
          </tr>
        </tbody>
      </table>

      <SectionHeader title="Summary of Proceeds" />
      <table className="table table-sm mb-3" style={{ border: '1px solid var(--cui-border-color)' }}>
        <colgroup>
          <col style={{ width: '56%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '26%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: 'var(--cui-tertiary-bg)' }}>Line Item</th>
            <th className="text-end" style={{ background: 'var(--cui-tertiary-bg)' }}>% of Loan</th>
            <th className="text-end" style={{ background: 'var(--cui-tertiary-bg)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.summary_of_proceeds.map((row) => (
            <tr
              key={row.label}
              className={row.label === 'Closing Funds Available' ? 'loan-budget-subtotal-row' : 'loan-budget-line-item-row'}
            >
              <td className="loan-budget-line-item-label">{row.label}</td>
              <td className="text-end">{formatPct(row.pct_of_loan)}</td>
              <td className="text-end">{formatCurrency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionHeader title="Equity to Close" />
      <table className="table table-sm mb-0" style={{ border: '1px solid var(--cui-border-color)' }}>
        <colgroup>
          <col style={{ width: '58%' }} />
          <col style={{ width: '42%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ background: 'var(--cui-tertiary-bg)' }}>Line Item</th>
            <th className="text-end" style={{ background: 'var(--cui-tertiary-bg)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.equity_to_close.map((row) => (
            <tr
              key={row.label}
              className={
                row.label === 'Total Equity to Close'
                  ? 'fw-semibold loan-budget-subtotal-row'
                  : 'loan-budget-line-item-row'
              }
            >
              <td className="loan-budget-line-item-label">{row.label}</td>
              <td className="text-end">{formatCurrency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function LoanBudgetModal({
  projectId,
  loanId,
  loanName,
  visible,
  onClose,
}: LoanBudgetModalProps) {
  const { data, isLoading, error } = useLoanBudgetSummary(projectId, loanId, visible);

  return (
    <CModal visible={visible} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle style={{ fontSize: '0.9375rem' }}>
          {loanName ? `${loanName} - Loan Budget` : 'Loan Budget'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isLoading && (
          <div className="text-center py-4">
            <CSpinner size="sm" />
            <span className="ms-2">Loading budget summary...</span>
          </div>
        )}
        {!isLoading && error && (
          <div className="text-danger">Failed to load loan budget summary.</div>
        )}
        {!isLoading && !error && data && <SummaryTable data={data} />}
      </CModalBody>

      <style jsx>{`
        .loan-budget-line-item-label {
          padding-left: 1rem;
        }

        .loan-budget-total-row td,
        .loan-budget-subtotal-row td {
          border-top: 2px solid var(--cui-border-color);
        }
      `}</style>
    </CModal>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import {
  CBadge,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCalendar, cilPencil, cilTrash } from '@coreui/icons';
import type { Loan } from '@/types/assumptions';

export type DebtFacility = Loan;

interface ActiveLoansTableProps {
  loans: Loan[];
  onEdit: (loan: Loan) => void;
  onDelete: (id: number) => void;
  onViewSchedule: (id: number) => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number | null | undefined, decimals = 3): string => {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
};

const addMonths = (dateStr: string, months: number): Date => {
  const date = new Date(dateStr);
  const targetMonth = date.getMonth() + months;
  const result = new Date(date);
  result.setMonth(targetMonth);
  return result;
};

const formatMonthYear = (date: Date | null): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatTerm = (months: number | null | undefined): string => {
  if (!months) return '—';
  if (months % 12 === 0) return `${months / 12} yr`;
  return `${months} mo`;
};

const formatDuration = (months: number | null | undefined, suffix: string): string => {
  if (!months) return `— ${suffix}`;
  if (months % 12 === 0) return `${months / 12}yr ${suffix}`;
  return `${months}mo ${suffix}`;
};

const getFacilityStructure = (loan: Loan): string => {
  return loan.facility_structure || loan.structure_type || '';
};

const getOutstandingBalance = (loan: Loan): number => {
  const facilityStructure = getFacilityStructure(loan);
  if (loan.loan_amount != null) return loan.loan_amount;
  if (facilityStructure === 'TERM') return loan.commitment_amount || 0;
  return 0;
};

const calculateMonthlyPayment = (loan: Loan): number | null => {
  const balance = getOutstandingBalance(loan);
  const ratePct = loan.interest_rate_pct ?? null;
  if (!balance || ratePct == null) return null;

  const monthlyRate = ratePct / 100 / 12;
  if (!monthlyRate) return null;

  if (loan.interest_only_months && loan.interest_only_months > 0) {
    return balance * monthlyRate;
  }

  const amortMonths = loan.amortization_months || loan.loan_term_months;
  if (!amortMonths || amortMonths <= 0) return balance * monthlyRate;

  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortMonths));
};

export function ActiveLoansTable({ loans, onEdit, onDelete, onViewSchedule }: ActiveLoansTableProps) {
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);

  const loanRows = useMemo(() => loans || [], [loans]);

  if (loanRows.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
        No loans defined. Click &ldquo;Add Loan&rdquo; to begin.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <CTable className="active-loans-table" hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Loan Name</CTableHeaderCell>
            <CTableHeaderCell>Lender</CTableHeaderCell>
            <CTableHeaderCell>Type</CTableHeaderCell>
            <CTableHeaderCell>Commitment</CTableHeaderCell>
            <CTableHeaderCell>Rate</CTableHeaderCell>
            <CTableHeaderCell>Term</CTableHeaderCell>
            <CTableHeaderCell>IO Period</CTableHeaderCell>
            <CTableHeaderCell>Maturity</CTableHeaderCell>
            <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {loanRows.map((loan) => {
            const facilityStructure = getFacilityStructure(loan);
            const maturityDate =
              loan.loan_start_date && loan.loan_term_months
                ? addMonths(loan.loan_start_date, Math.max(loan.loan_term_months - 1, 0))
                : null;
            const isExpanded = expandedLoanId === loan.loan_id;
            const balance = getOutstandingBalance(loan);
            const payment = calculateMonthlyPayment(loan);
            const amortText = formatDuration(loan.amortization_months, 'Amort');
            const ioText = loan.interest_only_months
              ? `${loan.interest_only_months}mo IO`
              : 'No IO';
            const termText = loan.loan_term_months
              ? formatDuration(loan.loan_term_months, 'Term')
              : '— Term';
            const hasBalloon =
              loan.amortization_months != null &&
              loan.loan_term_months != null &&
              loan.amortization_months > loan.loan_term_months;
            const balloonText = hasBalloon ? 'Balloon at Maturity' : 'Fully Amortizing';

            return (
              <React.Fragment key={loan.loan_id}>
                <CTableRow
                  onClick={() => setExpandedLoanId(isExpanded ? null : loan.loan_id)}
                >
                  <CTableDataCell className="fw-semibold">
                    {loan.loan_name}
                  </CTableDataCell>
                  <CTableDataCell>{loan.lender_name || '—'}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={facilityStructure === 'REVOLVER' ? 'success' : 'primary'}>
                      {facilityStructure || '—'}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>{formatCurrency(loan.commitment_amount)}</CTableDataCell>
                  <CTableDataCell>{formatPercent(loan.interest_rate_pct)}</CTableDataCell>
                  <CTableDataCell>{formatTerm(loan.loan_term_months)}</CTableDataCell>
                  <CTableDataCell>
                    {loan.interest_only_months ? `${loan.interest_only_months} mo` : '—'}
                  </CTableDataCell>
                  <CTableDataCell>{formatMonthYear(maturityDate)}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost-secondary btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(loan);
                        }}
                        aria-label="Edit loan"
                      >
                        <CIcon icon={cilPencil} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(loan.loan_id);
                        }}
                        aria-label="Delete loan"
                      >
                        <CIcon icon={cilTrash} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost-secondary btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onViewSchedule(loan.loan_id);
                        }}
                        aria-label="View schedule"
                      >
                        <CIcon icon={cilCalendar} />
                      </button>
                    </div>
                  </CTableDataCell>
                </CTableRow>
                {isExpanded && (
                  <CTableRow className="active-loans-summary">
                    <CTableDataCell colSpan={9}>
                      <div className="d-flex flex-wrap gap-3 mb-2">
                        <span>
                          {formatPercent(loan.interest_rate_pct)} {loan.interest_type || 'Fixed'}
                        </span>
                        <span>{amortText}</span>
                        <span>{ioText}</span>
                        <span>{termText}</span>
                        <span>{balloonText}</span>
                      </div>
                      <div className="d-flex flex-wrap gap-3">
                        <span>Current Balance: {formatCurrency(balance)}</span>
                        <span>
                          Next Payment: {payment != null ? formatCurrency(payment) : '—'}{' '}
                          {loan.interest_only_months ? '(IO)' : '(P&I)'}
                        </span>
                        <span>
                          Remaining: {loan.loan_term_months ?? '—'} months
                        </span>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                )}
              </React.Fragment>
            );
          })}
        </CTableBody>
      </CTable>
      <style jsx global>{`
        .active-loans-table {
          font-size: 0.875rem;
        }
        .active-loans-table th {
          background: var(--cui-tertiary-bg);
          font-weight: 600;
          padding: 6px 10px;
          border-bottom: 2px solid var(--cui-border-color);
        }
        .active-loans-table td {
          padding: 6px 10px;
          vertical-align: middle;
        }
        .active-loans-table tr:hover {
          background: rgba(var(--cui-primary-rgb), 0.04);
          cursor: pointer;
        }
        .active-loans-summary {
          background: rgba(var(--cui-primary-rgb), 0.04);
          cursor: default;
        }
        .active-loans-summary:hover {
          background: rgba(var(--cui-primary-rgb), 0.04);
          cursor: default;
        }
      `}</style>
    </div>
  );
}

export default ActiveLoansTable;
export const DebtFacilitiesTable = ActiveLoansTable;

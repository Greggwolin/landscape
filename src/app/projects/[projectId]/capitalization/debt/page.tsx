'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react';
import LoanCard from '@/components/capitalization/LoanCard';
import LeveragedCashFlow from '@/components/capitalization/LeveragedCashFlow';
import type { Loan } from '@/types/assumptions';
import { useLoans } from '@/hooks/useCapitalization';
import { ExportButton } from '@/components/admin';

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number | null | undefined, decimals = 3): string => {
  if (value == null || Number.isNaN(value)) return '0.000%';
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

const getFacilityStructure = (loan: Loan): string => {
  return loan.facility_structure || loan.structure_type || '';
};

const getOutstandingBalance = (loan: Loan): number => {
  const facilityStructure = getFacilityStructure(loan);
  if (loan.loan_amount != null) return loan.loan_amount;
  if (facilityStructure === 'TERM') return loan.commitment_amount || 0;
  return 0;
};

const calculateMonthlyPayment = (loan: Loan): number => {
  const balance = getOutstandingBalance(loan);
  const ratePct = loan.interest_rate_pct ?? null;
  if (!balance || ratePct == null) return 0;

  const monthlyRate = ratePct / 100 / 12;
  if (!monthlyRate) return 0;

  if (loan.interest_only_months && loan.interest_only_months > 0) {
    return balance * monthlyRate;
  }

  const amortMonths = loan.amortization_months || loan.loan_term_months;
  if (!amortMonths || amortMonths <= 0) return balance * monthlyRate;

  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortMonths));
};

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <CCard style={{ background: 'var(--cui-card-bg)' }}>
    <CCardBody>
      <div className="small" style={{ color: 'var(--cui-body-color)' }}>
        {label}
      </div>
      <div className="fs-4 fw-semibold" style={{ color: 'var(--cui-primary)' }}>
        {value}
      </div>
    </CCardBody>
  </CCard>
);

const LoanSummaryCards = ({ loans }: { loans: Loan[] }) => {
  const loanTypes = loans.map((loan) => getFacilityStructure(loan));
  const hasRevolver = loanTypes.includes('REVOLVER');
  const hasTerm = loanTypes.includes('TERM');

  const totalCommitment = loans.reduce((sum, loan) => sum + (loan.commitment_amount || 0), 0);
  const totalOutstanding = loans.reduce((sum, loan) => sum + getOutstandingBalance(loan), 0);

  const weightedAvgRate = () => {
    if (!totalOutstanding) return 0;
    const weightedSum = loans.reduce((sum, loan) => {
      const balance = getOutstandingBalance(loan);
      return sum + balance * (loan.interest_rate_pct || 0);
    }, 0);
    return weightedSum / totalOutstanding;
  };

  const earliestMaturity = () => {
    const dates = loans
      .map((loan) => {
        if (!loan.loan_start_date || !loan.loan_term_months) return null;
        return addMonths(loan.loan_start_date, Math.max(loan.loan_term_months - 1, 0));
      })
      .filter((date): date is Date => Boolean(date));

    if (dates.length === 0) return null;
    return dates.sort((a, b) => a.getTime() - b.getTime())[0];
  };

  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + calculateMonthlyPayment(loan), 0);

  const cards = (() => {
    if (loans.length === 0) {
      return [
        { label: 'Loan Amount', value: formatCurrency(0) },
        { label: 'Outstanding Balance', value: formatCurrency(0) },
        { label: 'Monthly Payment', value: formatCurrency(0) },
        { label: 'Maturity Date', value: '—' },
      ];
    }

    if (hasTerm && !hasRevolver) {
      return [
        { label: 'Loan Amount', value: formatCurrency(totalCommitment) },
        { label: 'Outstanding Balance', value: formatCurrency(totalOutstanding) },
        { label: 'Monthly Payment', value: formatCurrency(totalMonthlyPayment) },
        { label: 'Maturity Date', value: formatMonthYear(earliestMaturity()) },
      ];
    }

    if (hasRevolver && !hasTerm) {
      return [
        { label: 'Total Debt Capacity', value: formatCurrency(totalCommitment) },
        { label: 'Outstanding Balance', value: formatCurrency(totalOutstanding) },
        { label: 'Available to Draw', value: formatCurrency(totalCommitment - totalOutstanding) },
        { label: 'Weighted Avg Rate', value: formatPercent(weightedAvgRate()) },
      ];
    }

    return [
      { label: 'Total Commitment', value: formatCurrency(totalCommitment) },
      { label: 'Outstanding Balance', value: formatCurrency(totalOutstanding) },
      { label: 'Wtd Avg Rate', value: formatPercent(weightedAvgRate()) },
      { label: 'Next Maturity', value: formatMonthYear(earliestMaturity()) },
    ];
  })();

  return (
    <CRow className="g-3 mb-4">
      {cards.map((card) => (
        <CCol key={card.label} xs={12} md={3}>
          <SummaryCard label={card.label} value={card.value} />
        </CCol>
      ))}
    </CRow>
  );
};

export default function DebtPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [newLoanMode, setNewLoanMode] = useState(false);

  const { data: loansData = [], refetch: refetchLoans } = useLoans(projectId);

  const loans = useMemo<Loan[]>(() => {
    if (Array.isArray(loansData)) return loansData;
    if (loansData?.results) return loansData.results as Loan[];
    if (loansData?.loans) return loansData.loans as Loan[];
    if (loansData?.facilities) return loansData.facilities as Loan[];
    if (loansData?.data) return loansData.data as Loan[];
    return [];
  }, [loansData]);

  return (
    <div className="debt-page">
      <LoanSummaryCards loans={loans} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Loans</h5>
        <div className="d-flex gap-2">
          <ExportButton tabName="Capitalization" projectId={projectId} />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setNewLoanMode(true)}
            disabled={newLoanMode}
          >
            + Add Loan
          </button>
        </div>
      </div>

      {loans.map((loan) => (
        <LoanCard
          key={loan.loan_id}
          loan={loan}
          projectId={projectId}
          onSave={() => {
            void refetchLoans();
          }}
          onDelete={() => {
            void refetchLoans();
          }}
        />
      ))}

      {newLoanMode && (
        <LoanCard
          loan={null}
          projectId={projectId}
          onSave={() => {
            setNewLoanMode(false);
            void refetchLoans();
          }}
          onDelete={() => {}}
          onCancel={() => setNewLoanMode(false)}
          defaultExpanded
        />
      )}

      {(!loans || loans.length === 0) && !newLoanMode && (
        <CCard className="mb-3">
          <CCardBody className="text-center py-5 text-muted">
            No loans defined. Click &ldquo;+ Add Loan&rdquo; to begin.
          </CCardBody>
        </CCard>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          <h5 className="mb-0">Cash Flow</h5>
        </CCardHeader>
        <CCardBody>
          <LeveragedCashFlow projectId={projectId} loans={loans} />
        </CCardBody>
      </CCard>
    </div>
  );
}

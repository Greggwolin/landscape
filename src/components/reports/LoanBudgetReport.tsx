'use client';

/**
 * LoanBudgetReport
 *
 * Renders a single loan's budget summary as three tables:
 *   1. Loan Budget (Total / Borrower / Lender)
 *   2. Summary of Proceeds (% of Loan / Total)
 *   3. Equity to Close (Total)
 *
 * Supports export to Excel (client-side) and PDF (backend endpoint).
 */

import React, { useCallback } from 'react';
import { CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload, cilFile } from '@coreui/icons';
import type { LoanBudgetSummary } from '@/hooks/useLoanBudgetSummary';
import { exportLoanBudgetExcel } from '@/lib/exports/loanBudgetExcel';

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtCurrency(value: number): string {
  if (value === 0) return '\u2013'; // em dash
  const abs = Math.abs(value);
  const formatted = `$${Math.round(abs).toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined) return '\u2013';
  if (value === 0) return '\u2013';
  return `${value.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Shared table styles
// ---------------------------------------------------------------------------

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--cui-body-color)',
  padding: '6px 12px',
  backgroundColor: 'var(--cui-tertiary-bg)',
  borderBottom: '1px solid var(--cui-border-color)',
};

const headerCellStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  padding: '4px 8px',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--cui-border-color)',
};

const dataCellStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  padding: '3px 8px',
  borderBottom: '1px solid var(--cui-border-color)',
};

const totalRowStyle: React.CSSProperties = {
  ...dataCellStyle,
  fontWeight: 700,
  borderTop: '2px solid var(--cui-border-color)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoanBudgetReportProps {
  projectId: number;
  projectName: string;
  summary: LoanBudgetSummary;
}

export function LoanBudgetReport({ projectId, projectName, summary }: LoanBudgetReportProps) {
  const { loan_budget, summary_of_proceeds, equity_to_close } = summary;

  const handleExcelExport = useCallback(() => {
    exportLoanBudgetExcel(summary, projectName);
  }, [summary, projectName]);

  const handlePdfExport = useCallback(() => {
    window.open(
      `${DJANGO_API_URL}/api/reports/${projectId}/loans/${summary.loan_id}/loan-budget.pdf/`,
      '_blank'
    );
  }, [projectId, summary.loan_id]);

  return (
    <div className="d-flex flex-column gap-3">
      {/* ── Export buttons ── */}
      <div className="d-flex justify-content-end gap-2">
        <button
          className="btn btn-ghost-secondary btn-sm d-flex align-items-center gap-1"
          onClick={handleExcelExport}
          title="Export to Excel"
        >
          <CIcon icon={cilCloudDownload} size="sm" />
          <span style={{ fontSize: '0.78rem' }}>Excel</span>
        </button>
        <button
          className="btn btn-ghost-secondary btn-sm d-flex align-items-center gap-1"
          onClick={handlePdfExport}
          title="Export to PDF"
        >
          <CIcon icon={cilFile} size="sm" />
          <span style={{ fontSize: '0.78rem' }}>PDF</span>
        </button>
      </div>

      {/* ── Table 1: Loan Budget ── */}
      <div style={{ border: '1px solid var(--cui-border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={sectionLabelStyle}>Loan Budget</div>
        <CTable small borderless className="mb-0" style={{ tableLayout: 'auto' }}>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'left' }}>Line Item</CTableHeaderCell>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'right' }}>Total</CTableHeaderCell>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'right' }}>Borrower</CTableHeaderCell>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'right' }}>Lender</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {loan_budget.rows.map((row) => (
              <CTableRow key={row.label}>
                <CTableDataCell style={dataCellStyle}>{row.label}</CTableDataCell>
                <CTableDataCell style={{ ...dataCellStyle, textAlign: 'right' }}>{fmtCurrency(row.total)}</CTableDataCell>
                <CTableDataCell style={{ ...dataCellStyle, textAlign: 'right' }}>{fmtCurrency(row.borrower)}</CTableDataCell>
                <CTableDataCell style={{ ...dataCellStyle, textAlign: 'right' }}>{fmtCurrency(row.lender)}</CTableDataCell>
              </CTableRow>
            ))}
            {/* Totals row */}
            <CTableRow>
              <CTableDataCell style={totalRowStyle}>Total Budget</CTableDataCell>
              <CTableDataCell style={{ ...totalRowStyle, textAlign: 'right' }}>{fmtCurrency(loan_budget.totals.total_budget)}</CTableDataCell>
              <CTableDataCell style={{ ...totalRowStyle, textAlign: 'right' }}>{fmtCurrency(loan_budget.totals.borrower_total)}</CTableDataCell>
              <CTableDataCell style={{ ...totalRowStyle, textAlign: 'right' }}>{fmtCurrency(loan_budget.totals.lender_total)}</CTableDataCell>
            </CTableRow>
          </CTableBody>
        </CTable>
      </div>

      {/* ── Table 2: Summary of Proceeds ── */}
      <div style={{ border: '1px solid var(--cui-border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={sectionLabelStyle}>Summary of Proceeds</div>
        <CTable small borderless className="mb-0" style={{ tableLayout: 'auto' }}>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'left' }}>Line Item</CTableHeaderCell>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'right' }}>% of Loan</CTableHeaderCell>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'right' }}>Total</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {summary_of_proceeds.map((row, idx) => {
              const isLast = idx === summary_of_proceeds.length - 1;
              const style = isLast ? totalRowStyle : dataCellStyle;
              return (
                <CTableRow key={row.label}>
                  <CTableDataCell style={style}>{row.label}</CTableDataCell>
                  <CTableDataCell style={{ ...style, textAlign: 'right' }}>{fmtPct(row.pct_of_loan)}</CTableDataCell>
                  <CTableDataCell style={{ ...style, textAlign: 'right' }}>{fmtCurrency(row.total)}</CTableDataCell>
                </CTableRow>
              );
            })}
          </CTableBody>
        </CTable>
      </div>

      {/* ── Table 3: Equity to Close ── */}
      <div style={{ border: '1px solid var(--cui-border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={sectionLabelStyle}>Equity to Close</div>
        <CTable small borderless className="mb-0" style={{ tableLayout: 'auto' }}>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'left' }}>Line Item</CTableHeaderCell>
              <CTableHeaderCell style={{ ...headerCellStyle, textAlign: 'right' }}>Total</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {equity_to_close.map((row, idx) => {
              const isLast = idx === equity_to_close.length - 1;
              const style = isLast ? totalRowStyle : dataCellStyle;
              return (
                <CTableRow key={row.label}>
                  <CTableDataCell style={style}>{row.label}</CTableDataCell>
                  <CTableDataCell style={{ ...style, textAlign: 'right' }}>{fmtCurrency(row.total)}</CTableDataCell>
                </CTableRow>
              );
            })}
          </CTableBody>
        </CTable>
      </div>
    </div>
  );
}

/**
 * Loan Budget Report Excel Export
 *
 * Generates an Excel (.xlsx) file for a single loan's budget summary.
 * Three sections: Loan Budget, Summary of Proceeds, Equity to Close.
 */

import ExcelJS from 'exceljs';
import type { LoanBudgetSummary } from '@/hooks/useLoanBudgetSummary';

// ---------------------------------------------------------------------------
// Styling constants
// ---------------------------------------------------------------------------

const FONT_NAME = 'Helvetica';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF3B82F6' },
};

const THIN_BORDER: ExcelJS.Border = { style: 'thin', color: { argb: 'FFE2E8F0' } };
const BORDERS: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

const CURRENCY_FORMAT = '$#,##0;-$#,##0;"\u2013"';
const PCT_FORMAT = '0.00%;;\u2013';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headerFont(bold = true): Partial<ExcelJS.Font> {
  return { name: FONT_NAME, size: 9, bold, color: { argb: 'FF1E293B' } };
}

function bodyFont(bold = false): Partial<ExcelJS.Font> {
  return { name: FONT_NAME, size: 9, bold, color: { argb: 'FF334155' } };
}

function addSectionHeader(ws: ExcelJS.Worksheet, row: number, title: string, colSpan: number): number {
  const r = ws.getRow(row);
  const cell = r.getCell(1);
  cell.value = title;
  cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = SECTION_FILL;
  cell.alignment = { vertical: 'middle' };
  // Merge across columns
  ws.mergeCells(row, 1, row, colSpan);
  r.height = 22;
  return row + 1;
}

function addHeaderRow(ws: ExcelJS.Worksheet, row: number, labels: string[], alignments: Array<'left' | 'right'>): number {
  const r = ws.getRow(row);
  labels.forEach((label, i) => {
    const cell = r.getCell(i + 1);
    cell.value = label;
    cell.font = headerFont();
    cell.fill = HEADER_FILL;
    cell.border = BORDERS;
    cell.alignment = { horizontal: alignments[i], vertical: 'middle' };
  });
  r.height = 18;
  return row + 1;
}

function addDataRow(
  ws: ExcelJS.Worksheet,
  row: number,
  values: (string | number | null)[],
  formats: (string | null)[],
  alignments: Array<'left' | 'right'>,
  bold = false,
  topBorder = false,
): number {
  const r = ws.getRow(row);
  values.forEach((val, i) => {
    const cell = r.getCell(i + 1);
    cell.value = val === 0 ? null : val;
    cell.font = bodyFont(bold);
    cell.border = topBorder
      ? { ...BORDERS, top: { style: 'medium', color: { argb: 'FF1E293B' } } }
      : BORDERS;
    cell.alignment = { horizontal: alignments[i], vertical: 'middle' };
    if (formats[i]) cell.numFmt = formats[i]!;
  });
  return row + 1;
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export async function exportLoanBudgetExcel(
  summary: LoanBudgetSummary,
  projectName: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Landscape Platform';
  wb.created = new Date();

  const loanName = summary.loan_name || 'Loan';
  const sheetName = `${loanName} \u2013 Loan Budget`.slice(0, 31);
  const ws = wb.addWorksheet(sheetName);

  // Column widths
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 18;

  let row = 1;

  // ── Section 1: Loan Budget ──
  row = addSectionHeader(ws, row, 'Loan Budget', 4);
  row = addHeaderRow(ws, row, ['Line Item', 'Total', 'Borrower', 'Lender'], ['left', 'right', 'right', 'right']);

  const budgetAlignments: Array<'left' | 'right'> = ['left', 'right', 'right', 'right'];
  const budgetFormats = [null, CURRENCY_FORMAT, CURRENCY_FORMAT, CURRENCY_FORMAT];

  for (const r of summary.loan_budget.rows) {
    row = addDataRow(ws, row, [r.label, r.total, r.borrower, r.lender], budgetFormats, budgetAlignments);
  }
  // Totals
  const t = summary.loan_budget.totals;
  row = addDataRow(ws, row, ['Total Budget', t.total_budget, t.borrower_total, t.lender_total], budgetFormats, budgetAlignments, true, true);

  row += 2; // Spacer

  // ── Section 2: Summary of Proceeds ──
  row = addSectionHeader(ws, row, 'Summary of Proceeds', 3);
  row = addHeaderRow(ws, row, ['Line Item', '% of Loan', 'Total'], ['left', 'right', 'right']);

  const procAlignments: Array<'left' | 'right'> = ['left', 'right', 'right'];
  for (let i = 0; i < summary.summary_of_proceeds.length; i++) {
    const r = summary.summary_of_proceeds[i];
    const isLast = i === summary.summary_of_proceeds.length - 1;
    const pct = r.pct_of_loan !== null ? r.pct_of_loan / 100 : null;
    row = addDataRow(
      ws, row,
      [r.label, pct, r.total],
      [null, PCT_FORMAT, CURRENCY_FORMAT],
      procAlignments,
      isLast, isLast,
    );
  }

  row += 2; // Spacer

  // ── Section 3: Equity to Close ──
  row = addSectionHeader(ws, row, 'Equity to Close', 2);
  row = addHeaderRow(ws, row, ['Line Item', 'Total'], ['left', 'right']);

  const eqAlignments: Array<'left' | 'right'> = ['left', 'right'];
  for (let i = 0; i < summary.equity_to_close.length; i++) {
    const r = summary.equity_to_close[i];
    const isLast = i === summary.equity_to_close.length - 1;
    row = addDataRow(
      ws, row,
      [r.label, r.total],
      [null, CURRENCY_FORMAT],
      eqAlignments,
      isLast, isLast,
    );
  }

  // ── Trigger download ──
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeLoanName = loanName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `${safeProjectName}_${safeLoanName}_LoanBudget_${date}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

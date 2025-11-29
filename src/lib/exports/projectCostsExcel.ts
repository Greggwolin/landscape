/**
 * Project Costs Report Excel Export
 *
 * Generates an Excel (.xlsx) file matching the on-screen Project Costs Report layout.
 * Uses SheetJS (xlsx) library for Excel generation.
 *
 * Note: The free version of xlsx doesn't support cell styling (colors, bold, borders).
 * We focus on proper number formatting which IS supported via the `z` property.
 */

import * as XLSX from 'xlsx';
import type { PhaseData, OtherLandByType } from '@/types/validation-report';

// ============================================================================
// TYPES
// ============================================================================

interface ExportOptions {
  projectName: string;
  generatedAt: string;
  phases: PhaseData[];
  totals: PhaseData;
  level2Label: string;
}

interface RowData {
  label: string;
  getValue: (phase: PhaseData) => number;
  format: 'currency' | 'number' | 'percent';
  isHeader?: boolean;
  indent?: number; // 0 = none, 1 = line item, 2 = total
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format currency value as string with parentheses for negatives
 * Matching the on-screen format: $1,234 or ($1,234) or -
 */
function formatCurrency(value: number): string {
  if (value === 0) return '-';
  const absValue = Math.abs(value);
  const formatted = `$${Math.round(absValue).toLocaleString()}`;
  return value < 0 ? `(${formatted})` : formatted;
}

/**
 * Format number value with parentheses for negatives
 * e.g., 1,234 or (1,234) or -
 */
function formatNumber(value: number): string {
  if (value === 0) return '-';
  const absValue = Math.abs(value);
  const formatted = Math.round(absValue).toLocaleString();
  return value < 0 ? `(${formatted})` : formatted;
}

/**
 * Format percent value
 * e.g., 0.268 → 27%
 */
function formatPercent(value: number): string {
  if (value === 0) return '-';
  return `${Math.round(value * 100)}%`;
}

/**
 * Format a value based on its format type
 */
function formatValue(value: number, format: 'currency' | 'number' | 'percent'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
    default:
      return formatNumber(value);
  }
}

// ============================================================================
// ROW DEFINITIONS
// ============================================================================

function getPhysicalMetricsRows(typeCodes: string[], totals: PhaseData): RowData[] {
  const rows: RowData[] = [
    { label: 'PHYSICAL METRICS', getValue: () => 0, format: 'number', isHeader: true },
    { label: 'SFD Acres', getValue: (p) => p.acres, format: 'number', indent: 1 },
    { label: 'SFD Lots', getValue: (p) => p.lots, format: 'number', indent: 1 },
    { label: 'SFD Front Feet', getValue: (p) => p.frontFeet, format: 'number', indent: 1 },
  ];

  // Add Other Land types
  typeCodes.forEach((typeCode) => {
    const typeTotal = totals.otherLandByType?.find((t: OtherLandByType) => t.typeCode === typeCode);
    const hasUnits = typeTotal && typeTotal.units > 0;

    rows.push({
      label: `${typeCode} Acres`,
      getValue: (p) => p.otherLandByType?.find((t: OtherLandByType) => t.typeCode === typeCode)?.acres || 0,
      format: 'number',
      indent: 1,
    });

    if (hasUnits) {
      rows.push({
        label: `${typeCode} Units`,
        getValue: (p) => p.otherLandByType?.find((t: OtherLandByType) => t.typeCode === typeCode)?.units || 0,
        format: 'number',
        indent: 1,
      });
    }
  });

  return rows;
}

function getRevenueRows(typeCodesWithRevenue: string[]): RowData[] {
  const rows: RowData[] = [
    { label: 'REVENUE', getValue: () => 0, format: 'currency', isHeader: true },
    { label: 'SFD $/FF', getValue: (p) => p.pricePerFrontFoot, format: 'currency', indent: 1 },
    { label: 'SFD $/Lot', getValue: (p) => p.grossRevenuePerLot, format: 'currency', indent: 1 },
    { label: '** SFD Gross Revenue', getValue: (p) => p.grossRevenue, format: 'currency', indent: 2 },
  ];

  // Add Other Land revenue by type
  typeCodesWithRevenue.forEach((typeCode) => {
    rows.push({
      label: `${typeCode} $/Unit`,
      getValue: (p) => p.otherLandByType?.find((t: OtherLandByType) => t.typeCode === typeCode)?.pricePerUnit || 0,
      format: 'currency',
      indent: 1,
    });
    rows.push({
      label: `** ${typeCode} Gross Revenue`,
      getValue: (p) => p.otherLandByType?.find((t: OtherLandByType) => t.typeCode === typeCode)?.grossRevenue || 0,
      format: 'currency',
      indent: 2,
    });
  });

  return rows;
}

function getCombinedRevenueRows(): RowData[] {
  return [
    { label: 'COMBINED REVENUE', getValue: () => 0, format: 'currency', isHeader: true },
    { label: '** Total Gross Revenue', getValue: (p) => p.totalGrossRevenue, format: 'currency' },
    { label: '** Total Net Revenue', getValue: (p) => p.totalNetRevenue, format: 'currency' },
  ];
}

function getDeductionsRows(): RowData[] {
  return [
    { label: 'DEDUCTIONS', getValue: () => 0, format: 'currency', isHeader: true },
    { label: 'Commissions', getValue: (p) => p.commissions, format: 'currency', indent: 1 },
    { label: 'Closing Costs Total', getValue: (p) => p.closingCostsTotal, format: 'currency', indent: 1 },
    { label: '** Net Revenue (SFD)', getValue: (p) => p.netRevenue, format: 'currency' },
    { label: 'Net Revenue per Lot', getValue: (p) => p.netRevenuePerLot, format: 'currency' },
  ];
}

function getScheduleRows(): RowData[] {
  return [
    { label: 'SCHEDULE', getValue: () => 0, format: 'number', isHeader: true },
    { label: 'Months to First Sale', getValue: (p) => p.monthsToFirstSale, format: 'number' },
    { label: 'Total Months to Sell', getValue: (p) => p.totalMonthsToSell, format: 'number' },
  ];
}

function getBudgetRows(): RowData[] {
  return [
    { label: 'BUDGET BY CATEGORY', getValue: () => 0, format: 'currency', isHeader: true },
    { label: 'Acquisition', getValue: (p) => p.acquisition, format: 'currency', indent: 1 },
    { label: 'Planning & Engineering', getValue: (p) => p.planningEngineering, format: 'currency', indent: 1 },
    { label: 'Development', getValue: (p) => p.development, format: 'currency', indent: 1 },
    { label: 'Operations', getValue: (p) => p.operations, format: 'currency', indent: 1 },
    { label: 'Contingency', getValue: (p) => p.contingency, format: 'currency', indent: 1 },
    { label: 'Financing', getValue: (p) => p.financing, format: 'currency', indent: 1 },
  ];
}

function getCostTotalsRows(): RowData[] {
  return [
    { label: 'COST TOTALS', getValue: () => 0, format: 'currency', isHeader: true },
    { label: '** Total Costs', getValue: (p) => p.totalCosts, format: 'currency' },
    { label: 'Cost per Unit', getValue: (p) => p.costPerLot, format: 'currency' },
  ];
}

function getProfitRows(): RowData[] {
  return [
    { label: 'PROFIT METRICS', getValue: () => 0, format: 'currency', isHeader: true },
    { label: '** Gross Profit', getValue: (p) => p.grossProfit, format: 'currency' },
    { label: 'Profit Margin', getValue: (p) => p.profitMargin, format: 'percent' },
  ];
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function exportProjectCostsToExcel({
  projectName,
  generatedAt,
  phases,
  totals,
  level2Label,
}: ExportOptions): void {
  // Get unique land use type codes
  const allTypeCodes = new Set<string>();
  phases.forEach((p) => p.otherLandByType?.forEach((t: OtherLandByType) => allTypeCodes.add(t.typeCode)));
  totals.otherLandByType?.forEach((t: OtherLandByType) => allTypeCodes.add(t.typeCode));
  const typeCodes = Array.from(allTypeCodes).sort();

  // Filter types with revenue
  const typeCodesWithRevenue = typeCodes.filter((tc) => {
    const typeTotal = totals.otherLandByType?.find((t: OtherLandByType) => t.typeCode === tc);
    return typeTotal && typeTotal.grossRevenue > 0;
  });

  // Build all row definitions
  const allRows: RowData[] = [
    ...getPhysicalMetricsRows(typeCodes, totals),
    ...getRevenueRows(typeCodesWithRevenue),
    ...getCombinedRevenueRows(),
    ...getDeductionsRows(),
    ...getScheduleRows(),
    ...getBudgetRows(),
    ...getCostTotalsRows(),
    ...getProfitRows(),
  ];

  // Create worksheet data as string array (pre-formatted)
  const wsData: string[][] = [];

  // Title row
  wsData.push([`${projectName} - Project Costs Summary`]);
  wsData.push([`Generated: ${new Date(generatedAt).toLocaleString()}`]);
  wsData.push([]); // Empty row

  // Header row
  const headerRow = [`${level2Label} ID`, ...phases.map((p) => `${level2Label} ${p.phaseName}`), 'TOTAL'];
  wsData.push(headerRow);

  // Data rows
  allRows.forEach((row) => {
    if (row.isHeader) {
      // Section header - label in first column, rest empty
      const dataRow: string[] = [row.label];
      for (let i = 0; i < phases.length + 1; i++) {
        dataRow.push('');
      }
      wsData.push(dataRow);
    } else {
      // Data row with indentation
      const indent = row.indent ? '  '.repeat(row.indent) : '';
      const dataRow: string[] = [`${indent}${row.label}`];

      // Phase values
      phases.forEach((phase) => {
        const value = row.getValue(phase);
        dataRow.push(formatValue(value, row.format));
      });

      // Total value
      const totalValue = row.getValue(totals);
      dataRow.push(formatValue(totalValue, row.format));

      wsData.push(dataRow);
    }
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths: XLSX.ColInfo[] = [
    { wch: 30 }, // Label column
    ...phases.map(() => ({ wch: 15 })), // Phase columns
    { wch: 15 }, // Total column
  ];
  ws['!cols'] = colWidths;

  // Merge title cell across all columns
  const lastCol = phases.length + 1;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, // Title row
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }, // Generated row
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Project Costs');

  // Generate filename: {ProjectName}_ProjectCosts_{YYYY-MM-DD}.xlsx
  const dateStr = new Date(generatedAt).toISOString().split('T')[0];
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedName}_ProjectCosts_${dateStr}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, filename);
}

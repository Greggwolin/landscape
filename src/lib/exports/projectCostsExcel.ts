/**
 * Project Costs Report Excel Export
 *
 * Generates an Excel (.xlsx) file matching the on-screen Project Costs Report layout.
 * Uses ExcelJS library for Excel generation with full styling support.
 */

import ExcelJS from 'exceljs';
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
  showUnitCols?: boolean; // Whether to show $/Unit, $/FrFt, $/SF, $/Acre columns
  underline?: boolean; // Whether to underline the values in this row
}

// Acres to square feet conversion
const SQFT_PER_ACRE = 43560;

// Font configuration - Univers
const FONT_NAME = 'Univers';

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

/**
 * Format a per-unit value ($/Unit, $/FrFt, $/Acre)
 * Returns '-' if divisor is 0 to avoid divide-by-zero
 */
function formatUnitValue(value: number, divisor: number): string {
  if (divisor === 0 || value === 0) return '-';
  return formatCurrency(value / divisor);
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
    // SFD Gross Revenue - unit columns show $/Unit, $/FrFt, $/Acre
    { label: 'SFD Gross Revenue', getValue: (p) => p.grossRevenue, format: 'currency', indent: 1, showUnitCols: true },
  ];

  // Add Other Land revenue by type - unit columns show $/Unit, $/FrFt, $/Acre
  typeCodesWithRevenue.forEach((typeCode) => {
    rows.push({
      label: `${typeCode} Gross Revenue`,
      getValue: (p) => p.otherLandByType?.find((t: OtherLandByType) => t.typeCode === typeCode)?.grossRevenue || 0,
      format: 'currency',
      indent: 1,
      showUnitCols: true,
    });
  });

  return rows;
}

function getCombinedRevenueRows(): RowData[] {
  // No section header - rows displayed directly after Revenue section
  return [
    { label: 'Less: Subdivision Cost', getValue: (p) => -p.subdivisionCost, format: 'currency', indent: 2, showUnitCols: true, underline: true },
    { label: 'Gross Sale Proceeds', getValue: (p) => p.grossSaleProceeds, format: 'currency', showUnitCols: true },
    { label: 'Commissions', getValue: (p) => -p.commissions, format: 'currency', indent: 1, showUnitCols: true },
    { label: 'Closing Costs Total', getValue: (p) => -p.closingCostsTotal, format: 'currency', indent: 1, showUnitCols: true, underline: true },
    { label: 'Net Revenue', getValue: (p) => p.totalNetRevenue, format: 'currency', showUnitCols: true },
  ];
}

function getScheduleRows(): RowData[] {
  return [
    { label: 'SCHEDULE', getValue: () => 0, format: 'number', isHeader: true },
    { label: 'Months to First Sale', getValue: (p) => p.monthsToFirstSale, format: 'number', indent: 1 },
    { label: 'Total Months to Sell', getValue: (p) => p.totalMonthsToSell, format: 'number', indent: 1 },
  ];
}

function getBudgetRows(): RowData[] {
  return [
    { label: 'BUDGET BY CATEGORY', getValue: () => 0, format: 'currency', isHeader: true },
    { label: 'Acquisition', getValue: (p) => p.acquisition, format: 'currency', indent: 1, showUnitCols: true },
    { label: 'Planning & Engineering', getValue: (p) => p.planningEngineering, format: 'currency', indent: 1, showUnitCols: true },
    { label: 'Development', getValue: (p) => p.development, format: 'currency', indent: 1, showUnitCols: true },
    { label: 'Operations', getValue: (p) => p.operations, format: 'currency', indent: 1, showUnitCols: true },
    { label: 'Contingency', getValue: (p) => p.contingency, format: 'currency', indent: 1, showUnitCols: true },
    { label: 'Financing', getValue: (p) => p.financing, format: 'currency', indent: 1, showUnitCols: true },
  ];
}

function getCostTotalsRows(): RowData[] {
  return [
    { label: 'COST TOTALS', getValue: () => 0, format: 'currency', isHeader: true },
    { label: 'Total Costs', getValue: (p) => p.totalCosts, format: 'currency', showUnitCols: true },
  ];
}

function getProfitRows(): RowData[] {
  return [
    { label: 'PROFIT METRICS', getValue: () => 0, format: 'currency', isHeader: true },
    { label: 'Gross Profit', getValue: (p) => p.grossProfit, format: 'currency', showUnitCols: true },
    { label: 'Profit Margin', getValue: (p) => p.profitMargin, format: 'percent', showUnitCols: true },
  ];
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function exportProjectCostsToExcel({
  projectName,
  generatedAt,
  phases,
  totals,
  level2Label,
}: ExportOptions): Promise<void> {
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
    ...getScheduleRows(),
    ...getRevenueRows(typeCodesWithRevenue),
    ...getCombinedRevenueRows(),
    ...getBudgetRows(),
    ...getCostTotalsRows(),
    ...getProfitRows(),
  ];

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Project Costs');

  // Calculate total columns: 1 label + (phases * 5) + 5 for total
  const totalCols = 1 + phases.length * 5 + 5;

  // Base font style
  const baseFont: Partial<ExcelJS.Font> = {
    name: FONT_NAME,
    size: 10,
  };

  // Smaller font for unit columns
  const unitFont: Partial<ExcelJS.Font> = {
    name: FONT_NAME,
    size: 9,
    color: { argb: 'FF666666' },
  };

  // Header font
  const headerFont: Partial<ExcelJS.Font> = {
    name: FONT_NAME,
    size: 10,
    bold: true,
  };

  // Section header font
  const sectionHeaderFont: Partial<ExcelJS.Font> = {
    name: FONT_NAME,
    size: 10,
    bold: true,
  };

  // Title row
  const titleRow = worksheet.addRow([`${projectName} - Project Costs Summary`]);
  titleRow.font = { name: FONT_NAME, size: 14, bold: true };
  worksheet.mergeCells(1, 1, 1, totalCols);

  // Generated date row
  const dateRow = worksheet.addRow([`Generated: ${new Date(generatedAt).toLocaleString()}`]);
  dateRow.font = { name: FONT_NAME, size: 10, italic: true };
  worksheet.mergeCells(2, 1, 2, totalCols);

  // Empty row
  worksheet.addRow([]);

  // Build header row
  const headerValues: string[] = [`${level2Label} ID`];
  phases.forEach((p) => {
    headerValues.push(`${level2Label} ${p.phaseName}`);
    headerValues.push('$/Unit');
    headerValues.push('$/FrFt');
    headerValues.push('$/SF');
    headerValues.push('$/Acre');
  });
  headerValues.push('TOTAL');
  headerValues.push('$/Unit');
  headerValues.push('$/FrFt');
  headerValues.push('$/SF');
  headerValues.push('$/Acre');

  const headerRow = worksheet.addRow(headerValues);
  headerRow.eachCell((cell, colNumber) => {
    cell.font = headerFont;
    cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
    };
  });

  // Set column widths and track unit column indices for grouping
  const unitColIndices: number[] = [];
  worksheet.getColumn(1).width = 30; // Label column

  let colIdx = 2;
  phases.forEach(() => {
    worksheet.getColumn(colIdx).width = 14; // Phase value
    colIdx++;
    // Unit columns (grouped)
    for (let i = 0; i < 4; i++) {
      worksheet.getColumn(colIdx).width = 10;
      unitColIndices.push(colIdx);
      colIdx++;
    }
  });

  // Total column
  worksheet.getColumn(colIdx).width = 14;
  colIdx++;
  // Total unit columns (grouped)
  for (let i = 0; i < 4; i++) {
    worksheet.getColumn(colIdx).width = 10;
    unitColIndices.push(colIdx);
    colIdx++;
  }

  // Data rows
  allRows.forEach((row) => {
    if (row.isHeader) {
      // Section header row
      const values: string[] = [row.label];
      for (let i = 1; i < totalCols; i++) {
        values.push('');
      }
      const excelRow = worksheet.addRow(values);
      excelRow.getCell(1).font = sectionHeaderFont;
      excelRow.getCell(1).alignment = { horizontal: 'left' };
    } else {
      // Data row
      const indent = row.indent ? '  '.repeat(row.indent) : '';
      const values: (string | number)[] = [`${indent}${row.label}`];

      // Phase values with unit columns
      phases.forEach((phase) => {
        const value = row.getValue(phase);
        values.push(formatValue(value, row.format));

        // Unit columns
        if (row.showUnitCols && row.format !== 'percent') {
          const totalUnits = phase.lots + phase.otherLandUnits;
          const totalAcres = phase.acres + phase.otherLandAcres;
          const totalSF = totalAcres * SQFT_PER_ACRE;
          values.push(formatUnitValue(value, totalUnits));
          values.push(formatUnitValue(value, phase.frontFeet));
          values.push(formatUnitValue(value, totalSF));
          values.push(formatUnitValue(value, totalAcres));
        } else {
          values.push('-');
          values.push('-');
          values.push('-');
          values.push('-');
        }
      });

      // Total value with unit columns
      const totalValue = row.getValue(totals);
      values.push(formatValue(totalValue, row.format));

      if (row.showUnitCols && row.format !== 'percent') {
        const totalUnits = totals.lots + totals.otherLandUnits;
        const totalAcres = totals.acres + totals.otherLandAcres;
        const totalSF = totalAcres * SQFT_PER_ACRE;
        values.push(formatUnitValue(totalValue, totalUnits));
        values.push(formatUnitValue(totalValue, totals.frontFeet));
        values.push(formatUnitValue(totalValue, totalSF));
        values.push(formatUnitValue(totalValue, totalAcres));
      } else {
        values.push('-');
        values.push('-');
        values.push('-');
        values.push('-');
      }

      const excelRow = worksheet.addRow(values);

      // Apply styling to each cell
      excelRow.eachCell((cell, colNumber) => {
        // Add underline to font if this row should be underlined (for value columns only)
        const shouldUnderline = row.underline && colNumber > 1;

        if (colNumber === 1) {
          // Label column - left aligned
          cell.font = baseFont;
          cell.alignment = { horizontal: 'left' };
        } else if (unitColIndices.includes(colNumber)) {
          // Unit column - right aligned, smaller font
          cell.font = shouldUnderline ? { ...unitFont, underline: true } : unitFont;
          cell.alignment = { horizontal: 'right' };
        } else {
          // Value column - right aligned
          cell.font = shouldUnderline ? { ...baseFont, underline: true } : baseFont;
          cell.alignment = { horizontal: 'right' };
        }
      });
    }
  });

  // Set up column outline grouping for unit columns
  // Group unit columns under each phase (columns can be collapsed)
  let groupStartCol = 3; // First unit column after first phase value
  phases.forEach(() => {
    // Group the 4 unit columns after each phase value
    for (let i = 0; i < 4; i++) {
      const col = worksheet.getColumn(groupStartCol + i);
      col.outlineLevel = 1;
      col.hidden = false; // Start expanded
    }
    groupStartCol += 5; // Move to next phase's unit columns
  });

  // Group total's unit columns
  for (let i = 0; i < 4; i++) {
    const col = worksheet.getColumn(groupStartCol + i);
    col.outlineLevel = 1;
    col.hidden = false;
  }

  // Set outline properties - allow collapsing groups
  worksheet.properties.outlineLevelCol = 1;

  // Generate filename
  const dateStr = new Date(generatedAt).toISOString().split('T')[0];
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedName}_ProjectCosts_${dateStr}.xlsx`;

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

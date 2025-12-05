/**
 * Period generation and management utilities for cash flow calculations
 *
 * Handles fetching calculation periods from database and generating
 * period metadata for cash flow schedules.
 */

import { sql } from '@/lib/db';
import type { CalculationPeriod, PeriodType } from './types';

// ============================================================================
// DATABASE QUERIES
// ============================================================================

interface PeriodRow {
  period_id: number;
  period_sequence: number;
  period_start_date: string;
  period_end_date: string;
  period_type: string;
  period_label?: string;
  fiscal_year?: number;
  fiscal_quarter?: number;
}

/**
 * Fetch calculation periods for a project from database
 */
export async function fetchProjectPeriods(
  projectId: number,
  startSequence?: number,
  endSequence?: number
): Promise<CalculationPeriod[]> {
  let query;

  if (startSequence !== undefined && endSequence !== undefined) {
    query = sql<PeriodRow>`
      SELECT
        period_id,
        period_sequence,
        period_start_date,
        period_end_date,
        period_type,
        period_label,
        fiscal_year,
        fiscal_quarter
      FROM landscape.tbl_calculation_period
      WHERE project_id = ${projectId}
        AND period_sequence >= ${startSequence}
        AND period_sequence <= ${endSequence}
      ORDER BY period_sequence ASC
    `;
  } else {
    query = sql<PeriodRow>`
      SELECT
        period_id,
        period_sequence,
        period_start_date,
        period_end_date,
        period_type,
        period_label,
        fiscal_year,
        fiscal_quarter
      FROM landscape.tbl_calculation_period
      WHERE project_id = ${projectId}
      ORDER BY period_sequence ASC
    `;
  }

  const rows = await query;

  if (rows.length === 0) {
    throw new Error(
      `No calculation periods found for project ${projectId}. ` +
      `Periods must be created before generating cash flow.`
    );
  }

  return rows.map((row, index) => ({
    periodId: row.period_id,
    periodIndex: index, // 0-based for array indexing
    periodSequence: row.period_sequence,
    periodType: normalizePeriodType(row.period_type),
    startDate: new Date(row.period_start_date),
    endDate: new Date(row.period_end_date),
    label: row.period_label || generatePeriodLabel(row, index),
    fiscalYear: row.fiscal_year,
    fiscalQuarter: row.fiscal_quarter,
  }));
}

/**
 * Get period count for a project
 */
export async function getProjectPeriodCount(projectId: number): Promise<number> {
  const result = await sql<{ count: number }>`
    SELECT COUNT(*) as count
    FROM landscape.tbl_calculation_period
    WHERE project_id = ${projectId}
  `;

  return result[0]?.count || 0;
}

/**
 * Get project date range from periods
 */
export async function getProjectDateRange(projectId: number): Promise<{
  startDate: Date;
  endDate: Date;
  periodCount: number;
}> {
  const result = await sql<{
    start_date: string;
    end_date: string;
    period_count: number;
  }>`
    SELECT
      MIN(period_start_date) as start_date,
      MAX(period_end_date) as end_date,
      COUNT(*) as period_count
    FROM landscape.tbl_calculation_period
    WHERE project_id = ${projectId}
  `;

  if (!result[0] || !result[0].start_date) {
    throw new Error(`No periods found for project ${projectId}`);
  }

  return {
    startDate: new Date(result[0].start_date),
    endDate: new Date(result[0].end_date),
    periodCount: result[0].period_count,
  };
}

// ============================================================================
// PERIOD GENERATION (For projects without periods in database)
// ============================================================================

/**
 * Generate period definitions for a date range
 * Note: This generates in-memory periods, not database records
 */
export function generatePeriods(
  startDate: Date,
  endDate: Date,
  periodType: PeriodType = 'month'
): CalculationPeriod[] {
  const periods: CalculationPeriod[] = [];
  // Normalize to first of month at noon local time to avoid timezone issues
  let currentDate = normalizeToFirstOfMonth(startDate);
  let sequence = 1;

  while (currentDate <= endDate) {
    const periodStart = new Date(currentDate);
    const periodEnd = calculatePeriodEnd(currentDate, periodType);

    // Don't go past end date
    if (periodEnd > endDate) {
      break;
    }

    periods.push({
      periodId: sequence, // Temporary ID for generated periods
      periodIndex: sequence - 1,
      periodSequence: sequence,
      periodType,
      startDate: periodStart,
      endDate: periodEnd,
      label: generatePeriodLabelFromDate(periodStart, periodType, sequence),
    });

    currentDate = addPeriod(currentDate, periodType);
    sequence++;
  }

  return periods;
}

/**
 * Normalize a date to the first of its month at noon local time
 * This prevents timezone issues where midnight UTC becomes previous day in local time
 */
function normalizeToFirstOfMonth(date: Date): Date {
  const normalized = new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  return normalized;
}

/**
 * Calculate the end date of a period based on start date and type
 */
function calculatePeriodEnd(startDate: Date, periodType: PeriodType): Date {
  const endDate = new Date(startDate);

  switch (periodType) {
    case 'month':
      // Last day of the month
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // 0 = last day of previous month
      break;

    case 'quarter':
      // Last day of the quarter (3 months)
      endDate.setMonth(endDate.getMonth() + 3);
      endDate.setDate(0);
      break;

    case 'year':
      // Last day of the year
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setMonth(0);
      endDate.setDate(0);
      break;
  }

  return endDate;
}

/**
 * Add one period to a date
 */
function addPeriod(date: Date, periodType: PeriodType): Date {
  const newDate = new Date(date);

  switch (periodType) {
    case 'month':
      newDate.setMonth(newDate.getMonth() + 1);
      break;

    case 'quarter':
      newDate.setMonth(newDate.getMonth() + 3);
      break;

    case 'year':
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
  }

  return newDate;
}

// ============================================================================
// PERIOD AGGREGATION
// ============================================================================

/**
 * Aggregate monthly periods into quarterly or annual
 */
export function aggregatePeriods(
  monthlyPeriods: CalculationPeriod[],
  targetType: 'quarter' | 'year'
): CalculationPeriod[] {
  if (monthlyPeriods.length === 0) {
    return [];
  }

  const aggregated: CalculationPeriod[] = [];
  const periodsPerGroup = targetType === 'quarter' ? 3 : 12;

  for (let i = 0; i < monthlyPeriods.length; i += periodsPerGroup) {
    const groupPeriods = monthlyPeriods.slice(i, i + periodsPerGroup);

    if (groupPeriods.length === 0) break;

    const firstPeriod = groupPeriods[0];
    const lastPeriod = groupPeriods[groupPeriods.length - 1];

    aggregated.push({
      periodId: firstPeriod.periodId,
      periodIndex: Math.floor(i / periodsPerGroup),
      periodSequence: Math.floor(i / periodsPerGroup) + 1,
      periodType: targetType,
      startDate: firstPeriod.startDate,
      endDate: lastPeriod.endDate,
      label: generatePeriodLabelFromDate(
        firstPeriod.startDate,
        targetType,
        Math.floor(i / periodsPerGroup) + 1
      ),
      fiscalYear: firstPeriod.fiscalYear,
      fiscalQuarter:
        targetType === 'quarter' ? Math.floor(i / 3) + 1 : undefined,
    });
  }

  return aggregated;
}

// ============================================================================
// LABEL GENERATION
// ============================================================================

/**
 * Generate period label from database row
 */
function generatePeriodLabel(row: PeriodRow, index: number): string {
  const date = new Date(row.period_start_date);
  const type = normalizePeriodType(row.period_type);
  return generatePeriodLabelFromDate(date, type, row.period_sequence);
}

/**
 * Generate period label from date and type
 */
function generatePeriodLabelFromDate(
  date: Date,
  periodType: PeriodType,
  sequence: number
): string {
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  switch (periodType) {
    case 'month':
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;

    case 'year':
      return `${date.getFullYear()}`;

    default:
      return `Period ${sequence}`;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize period type string from database
 */
function normalizePeriodType(type: string): PeriodType {
  const normalized = type.toLowerCase().trim();

  if (normalized.includes('month')) return 'month';
  if (normalized.includes('quarter')) return 'quarter';
  if (normalized.includes('year') || normalized.includes('annual'))
    return 'year';

  // Default to month if unclear
  return 'month';
}

/**
 * Convert period sequence to index (1-based to 0-based)
 */
export function sequenceToIndex(sequence: number): number {
  return sequence - 1;
}

/**
 * Convert period index to sequence (0-based to 1-based)
 */
export function indexToSequence(index: number): number {
  return index + 1;
}

/**
 * Find period by sequence number
 */
export function findPeriodBySequence(
  periods: CalculationPeriod[],
  sequence: number
): CalculationPeriod | undefined {
  return periods.find((p) => p.periodSequence === sequence);
}

/**
 * Find period by index
 */
export function findPeriodByIndex(
  periods: CalculationPeriod[],
  index: number
): CalculationPeriod | undefined {
  return periods.find((p) => p.periodIndex === index);
}

/**
 * Get period range
 */
export function getPeriodRange(
  periods: CalculationPeriod[]
): { first: number; last: number; count: number } {
  if (periods.length === 0) {
    return { first: 0, last: 0, count: 0 };
  }

  return {
    first: periods[0].periodSequence,
    last: periods[periods.length - 1].periodSequence,
    count: periods.length,
  };
}

/**
 * Validate period sequence is within range
 */
export function validatePeriodSequence(
  sequence: number,
  periods: CalculationPeriod[]
): boolean {
  const range = getPeriodRange(periods);
  return sequence >= range.first && sequence <= range.last;
}

/**
 * Calculate months between two dates
 */
export function monthsBetween(startDate: Date, endDate: Date): number {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  return Math.max(0, months);
}

/**
 * Calculate years between two dates (decimal)
 */
export function yearsBetween(startDate: Date, endDate: Date): number {
  const months = monthsBetween(startDate, endDate);
  return months / 12;
}

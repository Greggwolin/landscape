import { sql } from '@/lib/db';

export interface PeriodRange {
  startPeriod: number;
  duration: number;
}

export interface PeriodMetadata {
  periodId: number;
  periodSequence: number;
  periodStartDate: string;
  periodEndDate: string;
  periodLabel: string;
}

type PeriodRow = {
  periodId: number;
  periodSequence: number;
  periodStartDate: string;
  periodEndDate: string;
  periodLabel: string;
};

function normalizeDateInput(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export async function derivePeriodRangeFromDates(
  projectId: number | null | undefined,
  startDate: string | null,
  endDate: string | null
): Promise<PeriodRange | null> {
  if (!projectId || !startDate || !endDate) {
    return null;
  }

  const normalizedStart = normalizeDateInput(startDate);
  const normalizedEnd = normalizeDateInput(endDate);
  if (!normalizedStart || !normalizedEnd) {
    return null;
  }

  const rows = await sql<{ periodSequence: number }>`
    SELECT period_sequence AS "periodSequence"
    FROM landscape.tbl_calculation_period
    WHERE project_id = ${projectId}
      AND period_end_date >= ${normalizedStart}
      AND period_start_date <= ${normalizedEnd}
    ORDER BY period_sequence
  `;

  if (rows.length === 0) {
    return null;
  }

  return {
    startPeriod: Number(rows[0].periodSequence),
    duration: rows.length
  };
}

function mapPeriodRow(row: PeriodRow): PeriodMetadata {
  return {
    periodId: Number(row.periodId),
    periodSequence: Number(row.periodSequence),
    periodStartDate: row.periodStartDate,
    periodEndDate: row.periodEndDate,
    periodLabel: row.periodLabel
  };
}

export async function fetchPeriodsBySequences(
  projectId: number,
  sequences: number[]
): Promise<PeriodMetadata[]> {
  if (!projectId || sequences.length === 0) {
    return [];
  }

  const uniqueSequences = Array.from(new Set(sequences)).sort((a, b) => a - b);
  const rows = await sql<PeriodRow>`
    SELECT
      period_id AS "periodId",
      period_sequence AS "periodSequence",
      period_start_date::text AS "periodStartDate",
      period_end_date::text AS "periodEndDate",
      TO_CHAR(period_start_date, 'Mon YYYY') AS "periodLabel"
    FROM landscape.tbl_calculation_period
    WHERE project_id = ${projectId}
      AND period_sequence = ANY(${uniqueSequences})
    ORDER BY period_sequence
  `;

  return rows.map(mapPeriodRow);
}

export async function fetchPeriodRangeMetadata(
  projectId: number,
  startPeriod: number,
  duration: number
): Promise<PeriodMetadata[]> {
  if (!projectId || !Number.isFinite(startPeriod) || !Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const endPeriod = startPeriod + duration - 1;
  const rows = await sql<PeriodRow>`
    SELECT
      period_id AS "periodId",
      period_sequence AS "periodSequence",
      period_start_date::text AS "periodStartDate",
      period_end_date::text AS "periodEndDate",
      TO_CHAR(period_start_date, 'Mon YYYY') AS "periodLabel"
    FROM landscape.tbl_calculation_period
    WHERE project_id = ${projectId}
      AND period_sequence BETWEEN ${startPeriod} AND ${endPeriod}
    ORDER BY period_sequence
  `;

  return rows.map(mapPeriodRow);
}

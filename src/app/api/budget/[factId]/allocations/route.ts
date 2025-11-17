/**
 * GET /api/budget/[factId]/allocations
 *
 * Retrieve period-by-period allocations for a budget item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  derivePeriodRangeFromDates,
  fetchPeriodRangeMetadata
} from '@/lib/financial-engine/period-utils';
import { fetchCurveProfileSummary } from '@/lib/financial-engine/curve-profiles';

type BudgetInfoRow = {
  factId: number;
  projectId: number | null;
  detail: string | null;
  amount: string | number | null;
  qty: string | number | null;
  rate: string | number | null;
  timingMethod: string | null;
  curveId: number | null;
  curveSteepness: string | number | null;
  startPeriod: number | null;
  periods: number | null;
  periodsToComplete: number | null;
  startDate: string | null;
  endDate: string | null;
  curveCode: string | null;
  curveName: string | null;
};

type AllocationRow = {
  timingId: number | null;
  amount: string | number;
  timingMethod: string | null;
  periodId: number;
  periodSequence: number;
  periodStartDate: string;
  periodEndDate: string;
  periodLabel: string;
};

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function formatItemName(row: BudgetInfoRow, factId: number): string {
  return row.detail && row.detail.trim() !== '' ? row.detail : `Budget Item ${factId}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ factId: string }> }
) {
  try {
    const { factId } = await params;
    const numericFactId = Number(factId);

    if (!Number.isFinite(numericFactId)) {
      return NextResponse.json(
        { error: 'Invalid factId' },
        { status: 400 }
      );
    }

    const includeZeroPeriods = parseBoolean(
      request.nextUrl.searchParams.get('includeZeroPeriods')
    );

    const budgetRows = await sql<BudgetInfoRow>`
      SELECT
        fb.fact_id AS "factId",
        fb.project_id AS "projectId",
        fb.detail,
        fb.amount,
        fb.qty,
        fb.rate,
        fb.timing_method AS "timingMethod",
        fb.curve_id AS "curveId",
        fb.curve_steepness AS "curveSteepness",
        fb.start_period AS "startPeriod",
        fb.periods AS "periods",
        fb.periods_to_complete AS "periodsToComplete",
        fb.start_date AS "startDate",
        fb.end_date AS "endDate",
        cp.curve_code AS "curveCode",
        cp.curve_name AS "curveName"
      FROM landscape.core_fin_fact_budget fb
      LEFT JOIN landscape.core_fin_curve_profile cp ON fb.curve_id = cp.curve_id
      WHERE fb.fact_id = ${numericFactId}
      LIMIT 1
    `;

    const budget = budgetRows[0];
    if (!budget) {
      return NextResponse.json(
        { error: 'Budget item not found' },
        { status: 404 }
      );
    }

    const allocationRows = await sql<AllocationRow>`
      SELECT
        bt.timing_id AS "timingId",
        bt.amount,
        bt.timing_method AS "timingMethod",
        cp.period_id AS "periodId",
        cp.period_sequence AS "periodSequence",
        cp.period_start_date AS "periodStartDate",
        cp.period_end_date AS "periodEndDate",
        TO_CHAR(cp.period_start_date, 'Mon YYYY') AS "periodLabel"
      FROM landscape.tbl_budget_timing bt
      INNER JOIN landscape.tbl_calculation_period cp ON bt.period_id = cp.period_id
      WHERE bt.fact_id = ${numericFactId}
      ORDER BY cp.period_sequence
    `;

    let allocationData = allocationRows.map(row => ({
      periodSequence: Number(row.periodSequence),
      periodId: Number(row.periodId),
      periodStartDate: row.periodStartDate,
      periodEndDate: row.periodEndDate,
      periodLabel: row.periodLabel,
      amount: Number(row.amount),
      timingId: row.timingId,
      timingMethod: row.timingMethod
    }));

    if (includeZeroPeriods && budget.projectId) {
      let rangeStart =
        allocationData[0]?.periodSequence ??
        (budget.startPeriod != null ? Number(budget.startPeriod) : null);
      let rangeDuration =
        allocationData.length ||
        (budget.periodsToComplete != null
          ? Number(budget.periodsToComplete)
          : budget.periods != null
            ? Number(budget.periods)
            : null);

      if ((!rangeStart || !rangeDuration) && (budget.startDate || budget.endDate)) {
        const derivedRange = await derivePeriodRangeFromDates(
          Number(budget.projectId),
          budget.startDate,
          budget.endDate
        );
        if (derivedRange) {
          rangeStart = derivedRange.startPeriod;
          rangeDuration = derivedRange.duration;
        }
      }

      if (rangeStart && rangeDuration) {
        const rangeMetadata = await fetchPeriodRangeMetadata(
          Number(budget.projectId),
          rangeStart,
          rangeDuration
        );
        if (rangeMetadata.length > 0) {
          const existingBySequence = new Map(
            allocationData.map(entry => [entry.periodSequence, entry])
          );
          allocationData = rangeMetadata.map(meta => {
            const existing = existingBySequence.get(meta.periodSequence);
            return {
              periodSequence: meta.periodSequence,
              periodId: meta.periodId,
              periodStartDate: meta.periodStartDate,
              periodEndDate: meta.periodEndDate,
              periodLabel: meta.periodLabel,
              amount: existing ? existing.amount : 0,
              timingId: existing?.timingId ?? null,
              timingMethod: existing?.timingMethod ?? budget.timingMethod
            };
          });
        }
      }
    }

    const totalAllocated = allocationData.reduce((sum, entry) => sum + entry.amount, 0);
    let cumulativeAmount = 0;
    const allocations = allocationData.map(entry => {
      cumulativeAmount += entry.amount;
      return {
        periodSequence: entry.periodSequence,
        periodId: entry.periodId,
        periodStartDate: entry.periodStartDate,
        periodEndDate: entry.periodEndDate,
        periodLabel: entry.periodLabel,
        amount: entry.amount,
        cumulativeAmount,
        cumulativePercent: totalAllocated > 0 ? (cumulativeAmount / totalAllocated) * 100 : 0
      };
    });

    const avgPerPeriod =
      allocationData.length > 0 ? totalAllocated / allocationData.length : 0;
    const peakAllocation =
      allocationData.length > 0
        ? allocationData.reduce((max, entry) => (entry.amount > max.amount ? entry : max), allocationData[0])
        : null;

    const numericSteepness =
      budget.curveSteepness != null ? Number(budget.curveSteepness) : 50;
    let curveSummary = null;
    if (budget.curveId) {
      curveSummary = await fetchCurveProfileSummary({ curveId: Number(budget.curveId) });
    } else if (budget.curveCode) {
      curveSummary = await fetchCurveProfileSummary({ curveCode: budget.curveCode });
    } else {
      curveSummary = await fetchCurveProfileSummary({ curveCode: 'S' });
    }

    return NextResponse.json({
      success: true,
      factId: numericFactId,
      itemName: formatItemName(budget, numericFactId),
      timingMethod: budget.timingMethod ?? null,
      curveProfile: {
        curveId: curveSummary?.curveId ?? (budget.curveId ? Number(budget.curveId) : null),
        curveCode: curveSummary?.curveCode ?? (budget.curveCode ? budget.curveCode.toUpperCase() : 'S'),
        curveName: curveSummary?.curveName ?? (budget.curveName ?? 'Standard S-Curve'),
        description: curveSummary?.description ?? null,
        steepness: numericSteepness
      },
      allocations,
      summary: {
        totalAllocated,
        periodCount: allocationData.length,
        avgPerPeriod,
        peakPeriod: peakAllocation?.periodSequence ?? null,
        peakAmount: peakAllocation?.amount ?? 0,
        firstPeriod: allocationData[0]?.periodSequence ?? null,
        lastPeriod: allocationData[allocationData.length - 1]?.periodSequence ?? null
      }
    });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allocations' },
      { status: 500 }
    );
  }
}

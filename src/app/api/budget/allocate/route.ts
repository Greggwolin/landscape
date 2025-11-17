/**
 * POST /api/budget/allocate
 *
 * Allocate a budget item across periods using S-curve distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { allocateBudgetItem } from '@/lib/financial-engine/scurve-allocation';
import { sql } from '@/lib/db';
import { derivePeriodRangeFromDates } from '@/lib/financial-engine/period-utils';
import { fetchCurveProfileSummary } from '@/lib/financial-engine/curve-profiles';

interface BudgetRow {
  fact_id: number;
  project_id: number | null;
  amount: string | number | null;
  qty: string | number | null;
  rate: string | number | null;
  start_date: string | null;
  end_date: string | null;
  start_period: number | null;
  periods: number | null;
  periods_to_complete: number | null;
  timing_method: string | null;
  curve_id: number | null;
  curve_steepness: string | number | null;
  curveCode: string | null;
  curveName: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      factId,
      projectId: bodyProjectId,
      curveProfile,
      curveId,
      steepness
    } = body;

    if (!factId) {
      return NextResponse.json(
        { error: 'factId is required' },
        { status: 400 }
      );
    }

    const rows = await sql<BudgetRow>`
      SELECT
        fb.fact_id,
        fb.project_id,
        fb.amount,
        fb.qty,
        fb.rate,
        fb.start_date,
        fb.end_date,
        fb.start_period,
        fb.periods,
        fb.periods_to_complete,
        fb.timing_method,
        fb.curve_id,
        fb.curve_steepness,
        cp.curve_code AS "curveCode",
        cp.curve_name AS "curveName"
      FROM landscape.core_fin_fact_budget fb
      LEFT JOIN landscape.core_fin_curve_profile cp ON fb.curve_id = cp.curve_id
      WHERE fb.fact_id = ${factId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Budget item not found' },
        { status: 404 }
      );
    }

    const budgetItem = rows[0];
    const resolvedProjectId =
      bodyProjectId != null
        ? Number(bodyProjectId)
        : budgetItem.project_id != null
          ? Number(budgetItem.project_id)
          : null;

    if (!resolvedProjectId || !Number.isFinite(resolvedProjectId)) {
      return NextResponse.json(
        { error: 'Project ID is required for allocation' },
        { status: 400 }
      );
    }

    if ((budgetItem.timing_method ?? '').toLowerCase() !== 'curve') {
      return NextResponse.json(
        {
          error: `Budget item timing_method is '${budgetItem.timing_method}', must be 'curve'`
        },
        { status: 400 }
      );
    }

    const numericAmount = budgetItem.amount != null ? Number(budgetItem.amount) : null;
    const totalAmount =
      numericAmount ??
      (budgetItem.qty != null && budgetItem.rate != null
        ? Number(budgetItem.qty) * Number(budgetItem.rate)
        : null);

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Budget item has no amount or amount is zero' },
        { status: 400 }
      );
    }

    let startPeriod =
      budgetItem.start_period != null ? Number(budgetItem.start_period) : null;
    let duration =
      budgetItem.periods_to_complete != null
        ? Number(budgetItem.periods_to_complete)
        : budgetItem.periods != null
          ? Number(budgetItem.periods)
          : null;

    if (startPeriod == null || duration == null) {
      const derived = await derivePeriodRangeFromDates(
        resolvedProjectId,
        budgetItem.start_date,
        budgetItem.end_date
      );
      if (!derived) {
        return NextResponse.json(
          { error: 'Could not determine period range from dates or stored timing' },
          { status: 400 }
        );
      }
      startPeriod = derived.startPeriod;
      duration = derived.duration;
    }

    if (
      startPeriod == null ||
      !Number.isFinite(startPeriod) ||
      !duration ||
      duration <= 0
    ) {
      return NextResponse.json(
        { error: 'Valid start period and duration are required for allocation' },
        { status: 400 }
      );
    }

    const numericSteepness =
      typeof steepness === 'number'
        ? steepness
        : budgetItem.curve_steepness != null
          ? Number(budgetItem.curve_steepness)
          : 50;

    const resolvedCurveId =
      curveId != null
        ? Number(curveId)
        : budgetItem.curve_id != null
          ? Number(budgetItem.curve_id)
          : null;

    const requestedCurveCode =
      typeof curveProfile === 'string' && curveProfile.trim() !== ''
        ? curveProfile.trim().toUpperCase()
        : null;

    let curveSummary = null;
    if (requestedCurveCode) {
      curveSummary = await fetchCurveProfileSummary({ curveCode: requestedCurveCode });
    } else if (resolvedCurveId) {
      curveSummary = await fetchCurveProfileSummary({ curveId: resolvedCurveId });
    } else if (budgetItem.curveCode) {
      curveSummary = await fetchCurveProfileSummary({ curveCode: budgetItem.curveCode });
    }

    const effectiveCurveCode =
      curveSummary?.curveCode ??
      requestedCurveCode ??
      (budgetItem.curveCode ? budgetItem.curveCode.toUpperCase() : 'S');

    const result = await allocateBudgetItem(resolvedProjectId, {
      factId,
      totalAmount,
      startPeriod,
      duration,
      curveProfile: requestedCurveCode ?? undefined,
      curveId: !requestedCurveCode && resolvedCurveId ? resolvedCurveId : undefined,
      steepness: numericSteepness
    });

    const periods = result.allocations.map(allocation => ({
      periodSequence: allocation.periodSequence,
      periodId: allocation.periodId ?? null,
      periodLabel: allocation.periodLabel ?? `Period ${allocation.periodSequence}`,
      periodStartDate: allocation.periodStartDate ?? null,
      periodEndDate: allocation.periodEndDate ?? null,
      amount: allocation.amount,
      cumulativeAmount: allocation.cumulativeAmount,
      cumulativePercent: allocation.cumulativePercent
    }));

    return NextResponse.json({
      success: true,
      factId,
      allocation: {
        totalAmount,
        allocatedAmount: result.summary.allocatedAmount,
        periodCount: result.summary.periodCount,
        avgPerPeriod: result.summary.avgPerPeriod,
        peakPeriod: result.summary.peakPeriod,
        peakAmount: result.summary.peakAmount,
        curveProfile: effectiveCurveCode,
        curveName: curveSummary?.curveName ?? effectiveCurveCode,
        steepness: numericSteepness
      },
      periods
    });
  } catch (error) {
    console.error('Allocation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

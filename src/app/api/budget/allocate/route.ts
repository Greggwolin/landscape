/**
 * POST /api/budget/allocate
 *
 * Allocate a budget item across periods using S-curve distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { allocateBudgetItem } from '@/lib/financial-engine/scurve-allocation';
import { sql } from '@/lib/db';

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
}

async function deriveTimingFromDates(projectId: number, startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return null;

  const periods = await sql<{ periodSequence: string | number }>`
    SELECT period_sequence AS "periodSequence"
    FROM landscape.tbl_calculation_period
    WHERE project_id = ${projectId}
      AND period_end_date >= ${startDate}
      AND period_start_date <= ${endDate}
    ORDER BY period_sequence
  `;

  if (periods.length === 0) {
    return null;
  }

  return {
    startPeriod: Number(periods[0].periodSequence),
    duration: periods.length
  };
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
        fact_id,
        project_id,
        amount,
        qty,
        rate,
        start_date,
        end_date,
        start_period,
        periods,
        periods_to_complete,
        timing_method,
        curve_id,
        curve_steepness
      FROM landscape.core_fin_fact_budget
      WHERE fact_id = ${factId}
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
      const derived = await deriveTimingFromDates(
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
          : undefined;

    const result = await allocateBudgetItem(resolvedProjectId, {
      factId,
      totalAmount,
      startPeriod,
      duration,
      curveProfile,
      curveId: resolvedCurveId,
      steepness: numericSteepness
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Allocation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

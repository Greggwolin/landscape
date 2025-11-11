/**
 * GET /api/budget/[factId]/allocations
 *
 * Retrieve period-by-period allocations for a budget item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: NextRequest,
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

    const rows = await sql<{
      timingId: number;
      factId: number;
      amount: string | number;
      timingMethod: string | null;
      periodId: number;
      periodSequence: number;
      periodStartDate: string;
      periodEndDate: string;
      periodLabel: string;
      cumulativeAmount: string | number;
    }>`
      SELECT
        bt.timing_id AS "timingId",
        bt.fact_id AS "factId",
        bt.amount,
        bt.timing_method AS "timingMethod",
        cp.period_id AS "periodId",
        cp.period_sequence AS "periodSequence",
        cp.period_start_date AS "periodStartDate",
        cp.period_end_date AS "periodEndDate",
        TO_CHAR(cp.period_start_date, 'Mon YYYY') AS "periodLabel",
        SUM(bt.amount) OVER (ORDER BY cp.period_sequence) AS "cumulativeAmount"
      FROM landscape.tbl_budget_timing bt
      INNER JOIN landscape.tbl_calculation_period cp ON bt.period_id = cp.period_id
      WHERE bt.fact_id = ${numericFactId}
      ORDER BY cp.period_sequence
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No allocations found for this budget item' },
        { status: 404 }
      );
    }

    const allocations = rows.map(row => ({
      ...row,
      amount: Number(row.amount),
      cumulativeAmount: Number(row.cumulativeAmount)
    }));

    const totalAllocated =
      allocations[allocations.length - 1].cumulativeAmount;
    const avgPerPeriod = totalAllocated / allocations.length;
    const peakAllocation = allocations.reduce(
      (max, allocation) =>
        allocation.amount > max.amount ? allocation : max,
      allocations[0]
    );

    return NextResponse.json({
      success: true,
      factId: numericFactId,
      allocations,
      summary: {
        totalAllocated,
        periodCount: allocations.length,
        avgPerPeriod,
        peakPeriod: peakAllocation.periodSequence,
        peakAmount: peakAllocation.amount,
        firstPeriod: allocations[0].periodSequence,
        lastPeriod: allocations[allocations.length - 1].periodSequence
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

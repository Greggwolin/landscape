/**
 * Benchmarks Growth Rates API - Single Set Route
 * PUT: Update growth rate set
 * DELETE: Delete growth rate set
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { CreateGrowthRateSet } from '@/types/benchmarks';

// PUT /api/benchmarks/growth-rates/[setId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  console.log('PUT /api/benchmarks/growth-rates/[setId] - Starting');
  try {
    const { setId: setIdParam } = await params;
    const setId = parseInt(setIdParam, 10);
    if (Number.isNaN(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const body: CreateGrowthRateSet = await request.json();
    console.log('PUT /api/benchmarks/growth-rates/[setId] - Body received:', body);

    // Validate required fields
    if (!body.name || !body.steps || body.steps.length === 0) {
      console.log('PUT /api/benchmarks/growth-rates/[setId] - Validation failed');
      return NextResponse.json(
        { error: 'name and steps are required' },
        { status: 400 }
      );
    }

    // Validate steps are contiguous
    for (let i = 1; i < body.steps.length; i++) {
      const prevThru = body.steps[i - 1].thru_period;
      const currFrom = body.steps[i].from_period;
      if (prevThru === 'E') {
        return NextResponse.json(
          { error: `Cannot have steps after step ${i} which ends at "E"` },
          { status: 400 }
        );
      }
      if (currFrom !== prevThru + 1) {
        return NextResponse.json(
          { error: `Steps must be contiguous. Gap between step ${i} and ${i + 1}` },
          { status: 400 }
        );
      }
    }

    await sql`BEGIN`;

    try {
      // Update growth rate set name
      console.log('PUT /api/benchmarks/growth-rates/[setId] - Updating set name');
      await sql`
        UPDATE landscape.core_fin_growth_rate_sets
        SET set_name = ${body.name}, updated_at = NOW()
        WHERE set_id = ${setId}
      `;

      // Delete existing steps
      console.log('PUT /api/benchmarks/growth-rates/[setId] - Deleting old steps');
      await sql`
        DELETE FROM landscape.core_fin_growth_rate_steps
        WHERE set_id = ${setId}
      `;

      // Insert new steps
      console.log('PUT /api/benchmarks/growth-rates/[setId] - Inserting new steps');
      for (let i = 0; i < body.steps.length; i++) {
        const step = body.steps[i];
        const rawRate = typeof step.rate === 'number' ? step.rate : Number(step.rate);
        const normalizedRate = Number.isFinite(rawRate) ? rawRate / 100 : 0;

        await sql`
          INSERT INTO landscape.core_fin_growth_rate_steps (
            set_id,
            step_number,
            from_period,
            periods,
            rate,
            thru_period,
            created_at
          ) VALUES (
            ${setId},
            ${i + 1},
            ${step.from_period},
            ${step.periods === 'E' ? null : step.periods},
            ${normalizedRate},
            ${step.thru_period === 'E' ? null : step.thru_period},
            NOW()
          )
        `;
      }

      console.log('PUT /api/benchmarks/growth-rates/[setId] - Committing');
      await sql`COMMIT`;

      return NextResponse.json({
        set_id: setId,
        message: 'Growth rate set updated successfully'
      });

    } catch (error) {
      console.error('PUT /api/benchmarks/growth-rates/[setId] - Transaction error:', error);
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('PUT /api/benchmarks/growth-rates/[setId] - Top-level error:', error);
    const details = error instanceof Error ? error.message : 'Failed to update growth rate set';
    return NextResponse.json(
      { error: 'Failed to update growth rate set', details },
      { status: 500 }
    );
  }
}

// DELETE /api/benchmarks/growth-rates/[setId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  console.log('DELETE /api/benchmarks/growth-rates/[setId] - Starting');
  try {
    const { setId: setIdParam } = await params;
    const setId = parseInt(setIdParam, 10);
    if (Number.isNaN(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    console.log('DELETE /api/benchmarks/growth-rates/[setId] - Deleting set:', setId);

    await sql`BEGIN`;

    try {
      // Delete steps first (foreign key constraint)
      console.log('DELETE /api/benchmarks/growth-rates/[setId] - Deleting steps');
      await sql`
        DELETE FROM landscape.core_fin_growth_rate_steps
        WHERE set_id = ${setId}
      `;

      // Delete the growth rate set
      console.log('DELETE /api/benchmarks/growth-rates/[setId] - Deleting set');
      const result = await sql`
        DELETE FROM landscape.core_fin_growth_rate_sets
        WHERE set_id = ${setId}
        RETURNING set_id
      `;

      if (result.length === 0) {
        await sql`ROLLBACK`;
        return NextResponse.json(
          { error: 'Growth rate set not found' },
          { status: 404 }
        );
      }

      console.log('DELETE /api/benchmarks/growth-rates/[setId] - Committing');
      await sql`COMMIT`;

      return NextResponse.json({
        message: 'Growth rate set deleted successfully'
      });

    } catch (error) {
      console.error('DELETE /api/benchmarks/growth-rates/[setId] - Transaction error:', error);
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('DELETE /api/benchmarks/growth-rates/[setId] - Top-level error:', error);
    const details = error instanceof Error ? error.message : 'Failed to delete growth rate set';
    return NextResponse.json(
      { error: 'Failed to delete growth rate set', details },
      { status: 500 }
    );
  }
}

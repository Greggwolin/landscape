import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { recalculateProjectTimeline } from '@/lib/timeline-engine/cpm-calculator';

async function resetTimingIfNoDependencies(
  type: 'budget' | 'milestone',
  itemId: number,
  projectId: number
) {
  const [{ count }] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM landscape.tbl_dependency
    WHERE successor_type = ${type}
      AND successor_id = ${itemId}
      AND is_active = TRUE
  `) as { count: number }[];

  if (count > 0) {
    return;
  }

  if (type === 'budget') {
    await sql`
      UPDATE landscape.core_fin_fact_budget
      SET
        timing_method = 'distributed',
        start_date = COALESCE(baseline_start_date, start_date),
        end_date = COALESCE(baseline_end_date, end_date),
        early_start_date = NULL,
        early_finish_date = NULL,
        late_start_date = NULL,
        late_finish_date = NULL,
        float_days = NULL,
        is_critical = FALSE
      WHERE fact_id = ${itemId}
        AND project_id = ${projectId}
    `;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { dependencyId: string } }
) {
  try {
    const dependencyId = Number(params.dependencyId);
    if (!dependencyId) {
      return NextResponse.json(
        { success: false, error: 'Invalid dependencyId' },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE landscape.tbl_dependency
      SET is_active = FALSE
      WHERE dependency_id = ${dependencyId}
      RETURNING *
    `;

    const dependency = rows[0];
    if (!dependency) {
      return NextResponse.json(
        { success: false, error: 'Dependency not found' },
        { status: 404 }
      );
    }

    await resetTimingIfNoDependencies(
      dependency.successor_type,
      Number(dependency.successor_id),
      Number(dependency.project_id)
    );

    const recalculation = await recalculateProjectTimeline(Number(dependency.project_id), {
      triggerEvent: 'dependency_delete'
    });

    return NextResponse.json({
      success: true,
      dependencyId,
      recalculation
    });
  } catch (error: any) {
    console.error('Dependency delete error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete dependency' },
      { status: 500 }
    );
  }
}

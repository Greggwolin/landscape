import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { recalculateProjectTimeline } from '@/lib/timeline-engine/cpm-calculator';
import {
  getTimelineItemSummary,
  TimelineItemType
} from '@/lib/timeline-engine/item-service';

const ITEM_TYPES: TimelineItemType[] = ['budget', 'milestone'];
const DEPENDENCY_TYPES = new Set(['FS', 'SS', 'FF', 'SF']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      predecessorType,
      predecessorId,
      successorType,
      successorId,
      dependencyType,
      lagDays = 0,
      isHardConstraint = true,
      notes,
      userId
    } = body;

    if (
      !projectId ||
      !predecessorType ||
      !predecessorId ||
      !successorType ||
      !successorId ||
      !dependencyType
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ITEM_TYPES.includes(predecessorType) || !ITEM_TYPES.includes(successorType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid predecessor or successor type' },
        { status: 400 }
      );
    }

    if (!DEPENDENCY_TYPES.has(dependencyType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid dependency type' },
        { status: 400 }
      );
    }

    if (
      predecessorType === successorType &&
      Number(predecessorId) === Number(successorId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Cannot create self-referencing dependency' },
        { status: 400 }
      );
    }

    const predecessor = await getTimelineItemSummary(predecessorType, Number(predecessorId));
    const successor = await getTimelineItemSummary(successorType, Number(successorId));

    if (!predecessor || !successor) {
      return NextResponse.json(
        { success: false, error: 'Predecessor or successor not found' },
        { status: 404 }
      );
    }

    if (
      predecessor.projectId !== successor.projectId ||
      predecessor.projectId !== Number(projectId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Dependencies must belong to the same project' },
        { status: 400 }
      );
    }

    try {
      const inserted = await sql`
        INSERT INTO landscape.tbl_dependency (
          project_id,
          predecessor_type,
          predecessor_id,
          successor_type,
          successor_id,
          dependency_type,
          lag_days,
          is_hard_constraint,
          notes,
          created_by
        ) VALUES (
          ${Number(projectId)},
          ${predecessorType},
          ${Number(predecessorId)},
          ${successorType},
          ${Number(successorId)},
          ${dependencyType},
          ${Number(lagDays) || 0},
          ${Boolean(isHardConstraint)},
          ${notes || null},
          ${userId ?? null}
        )
        RETURNING *
      `;

      if (successorType === 'budget') {
        await sql`
          UPDATE landscape.core_fin_fact_budget
          SET
            timing_method = 'milestone',
            start_date = NULL,
            end_date = NULL,
            early_start_date = NULL,
            early_finish_date = NULL,
            late_start_date = NULL,
            late_finish_date = NULL,
            float_days = NULL,
            is_critical = FALSE
          WHERE fact_id = ${Number(successorId)}
        `;
      }

      const recalculation = await recalculateProjectTimeline(Number(projectId), {
        triggerEvent: 'dependency_create',
        userId: typeof userId === 'number' ? userId : undefined
      });

      return NextResponse.json({
        success: true,
        dependencyId: inserted[0]?.dependency_id,
        dependency: inserted[0],
        recalculation
      });
    } catch (error: any) {
      const message = error?.message || '';
      if (message.toLowerCase().includes('circular dependency')) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Dependency creation error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create dependency' },
      { status: 500 }
    );
  }
}

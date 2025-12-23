import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { recalculateProjectTimeline } from '@/lib/timeline-engine/cpm-calculator';

const VALID_TRANSITIONS: Record<string, string[]> = {
  not_started: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

type Params = { params: Promise<{ milestoneId: string }> };

export async function PATCH(
  request: NextRequest,
  context: Params
) {
  try {
    const { milestoneId: msId } = await context.params;
    const milestoneId = Number(msId);
    if (!milestoneId) {
      return NextResponse.json(
        { success: false, error: 'Invalid milestoneId' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, actualDate, percentComplete, notes, currentDate, userId } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT milestone_id, project_id, status, actual_date, percent_complete
      FROM landscape.tbl_project_milestone
      WHERE milestone_id = ${milestoneId}
    `;

    const milestone = rows[0];
    if (!milestone) {
      return NextResponse.json(
        { success: false, error: 'Milestone not found' },
        { status: 404 }
      );
    }

    if (status !== milestone.status) {
      const allowed = VALID_TRANSITIONS[milestone.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status transition from ${milestone.status} to ${status}` },
          { status: 400 }
        );
      }
    }

    let actualDateToUse = milestone.actual_date;
    if (status === 'completed') {
      actualDateToUse = actualDate || new Date().toISOString().slice(0, 10);
    } else if (status === 'cancelled') {
      actualDateToUse = actualDate || milestone.actual_date;
    }

    if (status === 'completed' && !actualDateToUse) {
      return NextResponse.json(
        { success: false, error: 'actualDate is required when marking milestone as completed' },
        { status: 400 }
      );
    }

    const pct =
      typeof percentComplete === 'number'
        ? Math.min(Math.max(percentComplete, 0), 100)
        : status === 'completed'
        ? 100
        : milestone.percent_complete ?? 0;

    const updated = await sql`
      UPDATE landscape.tbl_project_milestone
      SET
        status = ${status},
        actual_date = ${actualDateToUse || null},
        percent_complete = ${pct},
        current_date = COALESCE(${currentDate || null}, current_date),
        notes = COALESCE(${notes || null}, notes),
        updated_at = NOW()
      WHERE milestone_id = ${milestoneId}
      RETURNING *
    `;

    const recalculation = await recalculateProjectTimeline(Number(milestone.project_id), {
      triggerEvent: `milestone_${status}`,
      userId: typeof userId === 'number' ? userId : undefined
    });

    return NextResponse.json({
      success: true,
      milestone: updated[0],
      recalculation
    });
  } catch (error: any) {
    console.error('Update milestone status error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update milestone status' },
      { status: 500 }
    );
  }
}

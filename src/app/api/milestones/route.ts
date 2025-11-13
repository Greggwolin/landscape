import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      milestoneName,
      milestoneCode,
      milestoneType,
      description,
      plannedDate,
      baselineDate,
      currentDate,
      containerId,
      notes,
      createdBy
    } = body;

    if (!projectId || !milestoneName || !milestoneCode || !milestoneType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const planDate = plannedDate || baselineDate || currentDate || null;
    const baseline = baselineDate || planDate;
    const current = currentDate || planDate;

    try {
      const rows = await sql`
        INSERT INTO landscape.tbl_project_milestone (
          project_id,
          milestone_name,
          milestone_code,
          milestone_type,
          description,
          planned_date,
          baseline_date,
          current_date,
          status,
          percent_complete,
          container_id,
          notes,
          created_by
        ) VALUES (
          ${Number(projectId)},
          ${milestoneName},
          ${milestoneCode},
          ${milestoneType},
          ${description || null},
          ${planDate || null},
          ${baseline || null},
          ${current || null},
          'not_started',
          0,
          ${containerId || null},
          ${notes || null},
          ${createdBy ?? null}
        )
        RETURNING milestone_id, milestone_name, current_date, status
      `;

      return NextResponse.json({
        success: true,
        milestone: rows[0]
      });
    } catch (error: any) {
      if ((error?.message || '').includes('uq_project_milestone_code')) {
        return NextResponse.json(
          { success: false, error: 'Milestone code must be unique per project' },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Create milestone error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create milestone' },
      { status: 500 }
    );
  }
}

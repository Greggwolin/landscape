import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/debt/draw-events
 *
 * Fetch all draw events for a project's debt facilities
 * Uses existing tbl_debt_draw_schedule table
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const drawEvents = await sql`
      SELECT
        dds.draw_schedule_id as id,
        dds.facility_id AS "facilityId",
        dds.period_start_date AS "drawDate",
        dds.draw_amount AS "drawAmount",
        dds.notes as description,
        df.facility_name AS "facilityName"
      FROM landscape.tbl_debt_draw_schedule dds
      JOIN landscape.tbl_debt_facility df ON dds.facility_id = df.facility_id
      WHERE df.project_id = ${id}
        AND dds.draw_amount > 0
      ORDER BY dds.period_start_date DESC
    `;

    return NextResponse.json({ drawEvents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch draw events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draw events', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/debt/draw-events
 *
 * Create a new draw event for a debt facility
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params;
  const id = Number(projectId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Note: tbl_debt_draw_schedule requires period_id from tbl_calculation_period
    // For now, create a simplified draw without period linkage
    const result = await sql`
      INSERT INTO landscape.tbl_debt_draw_schedule (
        facility_id,
        period_start_date,
        period_end_date,
        draw_amount,
        notes
      )
      VALUES (
        ${body.facilityId},
        ${body.drawDate},
        ${body.drawDate},
        ${body.drawAmount},
        ${body.description}
      )
      RETURNING
        draw_schedule_id as id,
        facility_id AS "facilityId",
        period_start_date AS "drawDate",
        draw_amount AS "drawAmount",
        notes as description
    `;

    return NextResponse.json({ success: true, drawEvent: result[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create draw event:', error);
    return NextResponse.json(
      { error: 'Failed to create draw event', details: message },
      { status: 500 }
    );
  }
}

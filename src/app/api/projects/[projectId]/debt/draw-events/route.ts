import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/debt/draw-events
 *
 * Fetch all draw events for a project's debt facilities
 *
 * Note: Requires debt_draw_events table (migration not yet created)
 * Table schema suggestion:
 * - id SERIAL PRIMARY KEY
 * - facility_id INT REFERENCES debt_facilities(id)
 * - draw_date DATE
 * - draw_amount NUMERIC(15,2)
 * - description TEXT
 * - created_at TIMESTAMP
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
    // TODO: Uncomment when debt_draw_events table is created
    /*
    const drawEvents = await sql`
      SELECT
        de.id,
        de.facility_id AS "facilityId",
        de.draw_date AS "drawDate",
        de.draw_amount AS "drawAmount",
        de.description,
        df.facility_name AS "facilityName"
      FROM landscape.debt_draw_events de
      JOIN landscape.debt_facilities df ON de.facility_id = df.id
      WHERE df.project_id = ${id}
      ORDER BY de.draw_date DESC
    `;

    return NextResponse.json({ drawEvents });
    */

    // Temporary: Return empty array until table is created
    return NextResponse.json({ drawEvents: [] });
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

    // TODO: Uncomment when debt_draw_events table is created
    /*
    const result = await sql`
      INSERT INTO landscape.debt_draw_events (
        facility_id,
        draw_date,
        draw_amount,
        description
      )
      VALUES (
        ${body.facilityId},
        ${body.drawDate},
        ${body.drawAmount},
        ${body.description}
      )
      RETURNING
        id,
        facility_id AS "facilityId",
        draw_date AS "drawDate",
        draw_amount AS "drawAmount",
        description
    `;

    return NextResponse.json({ success: true, drawEvent: result[0] });
    */

    // Temporary: Return mock success until table is created
    return NextResponse.json({
      success: true,
      message: 'Draw events table not yet created. Migration needed.'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create draw event:', error);
    return NextResponse.json(
      { error: 'Failed to create draw event', details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = {
  projectId: string;
};

/**
 * GET /api/projects/[projectId]/scenarios
 *
 * Fetch all saved scenarios for a project.
 * Per user clarification: Scenarios are per-project (Option B), all users see same scenarios.
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
    const scenarios = await sql<any[]>`
      SELECT
        scenario_id AS id,
        scenario_name AS name,
        assumptions,
        metrics,
        created_at
      FROM landscape.sensitivity_scenarios
      WHERE project_id = ${id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ scenarios });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/scenarios
 *
 * Save a new scenario.
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
    const { name, assumptions, metrics } = body;

    if (!name || !assumptions || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: name, assumptions, metrics' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO landscape.sensitivity_scenarios (
        project_id,
        scenario_name,
        assumptions,
        metrics
      )
      VALUES (
        ${id},
        ${name},
        ${JSON.stringify(assumptions)},
        ${JSON.stringify(metrics)}
      )
      RETURNING scenario_id AS id, scenario_name AS name, assumptions, metrics, created_at
    `;

    return NextResponse.json({
      success: true,
      scenario: result[0],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to save scenario:', error);
    return NextResponse.json(
      { error: 'Failed to save scenario', details: message },
      { status: 500 }
    );
  }
}

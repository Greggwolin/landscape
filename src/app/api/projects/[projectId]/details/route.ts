import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/[projectId]/details
 * Returns full project details with all fields for Project tab display
 */
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId: projectIdParam } = await context.params;
    const projectId = parseInt(projectIdParam);

    const rows = await sql`
      SELECT
        p.*,
        ia.selected_cap_rate AS income_selected_cap_rate,
        ia.terminal_cap_rate AS income_terminal_cap_rate
      FROM landscape.tbl_project p
      LEFT JOIN LATERAL (
        SELECT selected_cap_rate, terminal_cap_rate
        FROM landscape.tbl_income_approach
        WHERE project_id = p.project_id
        ORDER BY updated_at DESC NULLS LAST, income_approach_id DESC
        LIMIT 1
      ) ia ON true
      WHERE p.project_id = ${projectId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const row = rows[0];
    const response = {
      ...row,
      cap_rate_current: row.income_selected_cap_rate ?? null,
      cap_rate_proforma: row.income_terminal_cap_rate ?? null,
    };
    delete response.income_selected_cap_rate;
    delete response.income_terminal_cap_rate;

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching project details:', error);
    console.error('Error details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[projectId]/details
 * Updates project details with partial data
 */
export async function PATCH(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId: projectIdParam } = await context.params;
    const projectId = parseInt(projectIdParam);
    const updates = await request.json();

    // Build dynamic update query
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'project_id') // Don't allow updating project_id
      .map((key, index) => `${key} = $${index + 2}`) // $1 is reserved for project_id
      .join(', ');

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const values = Object.keys(updates)
      .filter(key => key !== 'project_id')
      .map(key => updates[key]);

    // Execute update using raw SQL for dynamic fields
    const query = `
      UPDATE landscape.tbl_project
      SET ${updateFields}
      WHERE project_id = $1
      RETURNING *
    `;

    const result = await sql.query(query, [projectId, ...values]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating project details:', error);
    return NextResponse.json(
      { error: 'Failed to update project details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

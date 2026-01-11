import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

type ExclusionRow = {
  id: number;
  project_id: number;
  source_project_id: string;
  excluded_at: string;
  excluded_reason: string | null;
};

/**
 * GET /api/projects/[projectId]/market/competitors/exclusions
 *
 * List all exclusions for this project
 */
export async function GET(_req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const exclusions = await sql<ExclusionRow>`
      SELECT id, project_id, source_project_id, excluded_at::text, excluded_reason
      FROM landscape.market_competitive_project_exclusions
      WHERE project_id = ${projectId}::integer
      ORDER BY excluded_at DESC
    `;

    return NextResponse.json(exclusions);
  } catch (error) {
    console.error('market/competitors/exclusions GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch exclusions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/market/competitors/exclusions
 *
 * Add a Zonda project to the exclusion list
 */
export async function POST(req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const body = await req.json();
    const { source_project_id, excluded_reason } = body;

    if (!source_project_id) {
      return NextResponse.json(
        { error: 'source_project_id is required' },
        { status: 400 }
      );
    }

    // Check if already excluded
    const existing = await sql`
      SELECT id FROM landscape.market_competitive_project_exclusions
      WHERE project_id = ${projectId}::integer
        AND source_project_id = ${source_project_id}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'This project is already excluded' },
        { status: 409 }
      );
    }

    // Add exclusion
    const rows = await sql<ExclusionRow>`
      INSERT INTO landscape.market_competitive_project_exclusions (
        project_id, source_project_id, excluded_reason
      ) VALUES (
        ${projectId}::integer,
        ${source_project_id},
        ${excluded_reason || null}
      )
      RETURNING id, project_id, source_project_id, excluded_at::text, excluded_reason
    `;

    // Also delete any existing competitor with this source_project_id
    await sql`
      DELETE FROM landscape.market_competitive_projects
      WHERE project_id = ${projectId}::integer
        AND source_project_id = ${source_project_id}
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('market/competitors/exclusions POST error', error);
    return NextResponse.json(
      { error: 'Failed to add exclusion' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/market/competitors/exclusions
 *
 * Remove a Zonda project from the exclusion list
 * Body: { source_project_id: string }
 */
export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const body = await req.json();
    const { source_project_id } = body;

    if (!source_project_id) {
      return NextResponse.json(
        { error: 'source_project_id is required' },
        { status: 400 }
      );
    }

    const rows = await sql`
      DELETE FROM landscape.market_competitive_project_exclusions
      WHERE project_id = ${projectId}::integer
        AND source_project_id = ${source_project_id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Exclusion not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_id: rows[0].id });
  } catch (error) {
    console.error('market/competitors/exclusions DELETE error', error);
    return NextResponse.json(
      { error: 'Failed to remove exclusion' },
      { status: 500 }
    );
  }
}

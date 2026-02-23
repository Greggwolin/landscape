/**
 * GET /api/projects/[projectId]/dms/doc-types
 *
 * Returns project-owned doc type list from dms_project_doc_types.
 * These are seeded from the workspace template at project creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  _request: NextRequest,
  context: Params
) {
  try {
    const { projectId: projectIdStr } = await context.params;
    const projectId = parseInt(projectIdStr, 10);

    if (!Number.isFinite(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Read from project-owned doc types (seeded at project creation from template)
    const docTypes = await sql<{ doc_type_name: string }[]>`
      SELECT doc_type_name
      FROM landscape.dms_project_doc_types
      WHERE project_id = ${projectId}
      ORDER BY display_order, doc_type_name
    `;

    return NextResponse.json({
      success: true,
      doc_type_options: docTypes.map(r => r.doc_type_name),
    });
  } catch (error) {
    console.error('Error fetching project doc types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch doc type options', details: errorMessage },
      { status: 500 }
    );
  }
}

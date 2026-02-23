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
    let docTypes = await sql<{ doc_type_name: string }[]>`
      SELECT doc_type_name
      FROM landscape.dms_project_doc_types
      WHERE project_id = ${projectId}
      ORDER BY display_order, doc_type_name
    `;

    // Backfill any doc_types already in use on documents but missing from the project list
    const existingSet = new Set(docTypes.map(row => row.doc_type_name.toLowerCase()));
    const docTypeRows = await sql<{ doc_type: string | null }[]>`
      SELECT DISTINCT doc_type
      FROM landscape.core_doc
      WHERE project_id = ${projectId}
        AND deleted_at IS NULL
        AND doc_type IS NOT NULL
    `;
    const missingDocTypes = docTypeRows
      .map(row => row.doc_type)
      .filter((docType): docType is string => Boolean(docType))
      .filter(docType => !existingSet.has(docType.toLowerCase()));

    if (missingDocTypes.length > 0) {
      for (const missing of missingDocTypes) {
        await sql`
          INSERT INTO landscape.dms_project_doc_types (project_id, doc_type_name, display_order, is_from_template)
          VALUES (
            ${projectId},
            ${missing},
            (SELECT COALESCE(MAX(display_order), 0) + 1 FROM landscape.dms_project_doc_types WHERE project_id = ${projectId}),
            FALSE
          )
          ON CONFLICT (project_id, doc_type_name) DO NOTHING
        `;
      }
      docTypes = await sql<{ doc_type_name: string }[]>`
        SELECT doc_type_name
        FROM landscape.dms_project_doc_types
        WHERE project_id = ${projectId}
        ORDER BY display_order, doc_type_name
      `;
    }

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

/**
 * GET /api/projects/[projectId]/dms/doc-types
 *
 * Returns the merged, deduplicated list of doc type options for a project:
 *   1. Template doc_type_options from the project's assigned dms_template
 *   2. Project-level custom additions from dms_project_doc_types
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

    // 1. Look up the project's dms_template_id
    const project = await sql<{ dms_template_id: number | null }[]>`
      SELECT dms_template_id
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `;

    if (project.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const templateId = project[0].dms_template_id;

    // 2. Fetch template doc_type_options
    let templateDocTypes: string[] = [];
    let templateName: string | null = null;

    if (templateId) {
      const template = await sql<{ template_name: string; doc_type_options: string[] | null }[]>`
        SELECT template_name, doc_type_options
        FROM landscape.dms_templates
        WHERE template_id = ${templateId}
      `;

      if (template.length > 0) {
        templateName = template[0].template_name;
        templateDocTypes = template[0].doc_type_options || [];
      }
    }

    // 3. Fetch project-level custom doc types
    const customTypes = await sql<{ doc_type_name: string }[]>`
      SELECT doc_type_name
      FROM landscape.dms_project_doc_types
      WHERE project_id = ${projectId}
      ORDER BY display_order ASC
    `;

    // 4. Merge and deduplicate (case-insensitive)
    const seen = new Set<string>();
    const merged: string[] = [];

    for (const dt of templateDocTypes) {
      const lower = dt.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(dt);
      }
    }

    for (const row of customTypes) {
      const lower = row.doc_type_name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        merged.push(row.doc_type_name);
      }
    }

    // Sort alphabetically
    merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return NextResponse.json({
      success: true,
      doc_type_options: merged,
      template_id: templateId,
      template_name: templateName,
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

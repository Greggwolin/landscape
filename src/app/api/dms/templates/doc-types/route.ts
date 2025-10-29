/**
 * GET /api/dms/templates/doc-types
 * Fetch doc_type options from default template
 * Query params: ?project_id=123&workspace_id=456
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function normalize(str: string | null) {
  return str ? str.trim().toLowerCase() : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const workspaceId = searchParams.get('workspace_id');
    const projectType = searchParams.get('project_type');

    if (!projectId && !workspaceId && !projectType) {
      return NextResponse.json(
        { error: 'project_id, workspace_id, or project_type is required' },
        { status: 400 }
      );
    }

    // Helper to read doc_type_options from template result
    const getDocTypes = (rows: Array<{ doc_type_options: string[] | null }>) =>
      rows.length > 0 && rows[0].doc_type_options && rows[0].doc_type_options.length > 0
        ? rows[0].doc_type_options
        : null;

    let docTypes: string[] | null = null;

    // 1. Project-specific template takes precedence
    if (!docTypes && projectId) {
      const template = await sql`
        SELECT doc_type_options
        FROM landscape.dms_templates
        WHERE project_id = ${parseInt(projectId)}
        ORDER BY is_default DESC, updated_at DESC
        LIMIT 1
      `;
      docTypes = getDocTypes(template);
    }

    // 2. Match templates by project_type (case-insensitive on template_name)
    if (!docTypes && projectType) {
      const normalizedProjectType = normalize(projectType);
      if (normalizedProjectType) {
        const template = await sql`
          SELECT doc_type_options
          FROM landscape.dms_templates
          WHERE LOWER(template_name) = ${normalizedProjectType}
          ORDER BY is_default DESC, updated_at DESC
          LIMIT 1
        `;
        docTypes = getDocTypes(template);
      }
    }

    // 3. Workspace default template
    if (!docTypes && workspaceId) {
      const template = await sql`
        SELECT doc_type_options
        FROM landscape.dms_templates
        WHERE workspace_id = ${parseInt(workspaceId)}
        ORDER BY is_default DESC, updated_at DESC
        LIMIT 1
      `;
      docTypes = getDocTypes(template);
    }

    if (!docTypes) {
      // Return default doc types if no template found
      return NextResponse.json({
        success: true,
        doc_type_options: [
          'general',
          'contract',
          'invoice',
          'report',
          'drawing',
          'permit',
          'correspondence',
          'proposal',
          'budget',
          'schedule'
        ].map(option => option),
        source: 'default'
      });
    }

    return NextResponse.json({
      success: true,
      doc_type_options: docTypes,
      source: projectType ? 'project_type' : projectId ? 'project' : 'workspace'
    });
  } catch (error) {
    console.error('Error fetching doc type options:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch doc type options',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

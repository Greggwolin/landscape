import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';
import type { DMSTemplate } from '@/lib/dms/db';

// GET /api/dms/templates - List templates for workspace
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const projectId = searchParams.get('projectId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    let query;
    if (projectId) {
      query = sql<(DMSTemplate & { attribute_count: number })[]>`
        SELECT t.*, 
               COALESCE(attr_count.count, 0) as attribute_count
        FROM landscape.dms_templates t
        LEFT JOIN (
          SELECT template_id, COUNT(*) as count
          FROM landscape.dms_template_attributes
          GROUP BY template_id
        ) attr_count ON t.template_id = attr_count.template_id
        WHERE t.workspace_id = ${parseInt(workspaceId)}
          AND (t.project_id IS NULL OR t.project_id = ${parseInt(projectId)})
        ORDER BY t.is_default DESC, t.template_name
      `;
    } else {
      query = sql<(DMSTemplate & { attribute_count: number })[]>`
        SELECT t.*, 
               COALESCE(attr_count.count, 0) as attribute_count
        FROM landscape.dms_templates t
        LEFT JOIN (
          SELECT template_id, COUNT(*) as count
          FROM landscape.dms_template_attributes
          GROUP BY template_id
        ) attr_count ON t.template_id = attr_count.template_id
        WHERE t.workspace_id = ${parseInt(workspaceId)}
          AND t.project_id IS NULL
        ORDER BY t.is_default DESC, t.template_name
      `;
    }

    const templates = await query;

    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/dms/templates - Create template with attributes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, attributeConfigs } = body;

    if (!template || !template.template_name || !template.workspace_id) {
      return NextResponse.json(
        { error: 'Template name and workspace ID are required' },
        { status: 400 }
      );
    }

    // If this is being set as default, unset other defaults
    if (template.is_default) {
      await sql`
        UPDATE landscape.dms_templates 
        SET is_default = false
        WHERE workspace_id = ${template.workspace_id}
          AND (project_id IS NULL OR project_id = ${template.project_id || null})
          AND (doc_type IS NULL OR doc_type = ${template.doc_type || null})
      `;
    }

    // Create the template
    const createdTemplate = await sql<DMSTemplate[]>`
      INSERT INTO landscape.dms_templates (
        template_name, workspace_id, project_id, doc_type, is_default
      )
      VALUES (
        ${template.template_name}, ${template.workspace_id}, 
        ${template.project_id || null}, ${template.doc_type || null}, 
        ${template.is_default || false}
      )
      RETURNING *
    `;

    const newTemplate = createdTemplate[0];

    // Add attribute configurations if provided
    if (attributeConfigs && Array.isArray(attributeConfigs) && attributeConfigs.length > 0) {
      for (const config of attributeConfigs) {
        await sql`
          INSERT INTO landscape.dms_template_attributes (
            template_id, attr_id, is_required, display_order
          )
          VALUES (
            ${newTemplate.template_id}, ${config.attr_id}, 
            ${config.is_required || false}, ${config.display_order || 0}
          )
        `;
      }
    }

    return NextResponse.json({
      success: true,
      template: newTemplate
    });

  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
/**
 * DMS Templates API
 * Simplified template management - just doc_type_options array
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const CreateTemplateSchema = z.object({
  template_name: z.string().min(1).max(100),
  workspace_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
  description: z.string().optional(),
  doc_type_options: z.array(z.string()).min(1),
  is_default: z.boolean().optional().default(false),
});

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const projectId = searchParams.get('project_id');

    if (!workspaceId && !projectId) {
      return NextResponse.json(
        { error: 'Either workspace_id or project_id is required' },
        { status: 400 }
      );
    }

    const templates = await sql`
      SELECT
        template_id,
        template_name,
        description,
        doc_type_options,
        is_default,
        workspace_id,
        project_id,
        created_at,
        updated_at
      FROM landscape.dms_templates
      WHERE (
        ${workspaceId ? sql`workspace_id = ${parseInt(workspaceId)}` : sql`1=0`}
        OR ${projectId ? sql`project_id = ${parseInt(projectId)}` : sql`1=0`}
      )
      ORDER BY is_default DESC, template_name ASC
    `;

    return NextResponse.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateTemplateSchema.parse(body);

    // If setting as default, unset other defaults first
    if (validated.is_default) {
      if (validated.workspace_id) {
        await sql`
          UPDATE landscape.dms_templates
          SET is_default = false
          WHERE workspace_id = ${validated.workspace_id}
        `;
      } else if (validated.project_id) {
        await sql`
          UPDATE landscape.dms_templates
          SET is_default = false
          WHERE project_id = ${validated.project_id}
        `;
      }
    }

    const result = await sql`
      INSERT INTO landscape.dms_templates (
        template_name,
        workspace_id,
        project_id,
        description,
        doc_type_options,
        is_default
      ) VALUES (
        ${validated.template_name},
        ${validated.workspace_id || null},
        ${validated.project_id || null},
        ${validated.description || null},
        ${validated.doc_type_options},
        ${validated.is_default}
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      template: result[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

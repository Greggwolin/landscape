import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
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
        created_at,
        updated_at
      FROM landscape.dms_templates
      WHERE workspace_id = ${workspaceId}
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.template_name || !body.workspace_id || !body.doc_type_options) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO landscape.dms_templates (
        template_name,
        workspace_id,
        description,
        doc_type_options,
        is_default
      ) VALUES (
        ${body.template_name},
        ${body.workspace_id},
        ${body.description || null},
        ${body.doc_type_options},
        ${body.is_default || false}
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      template: result[0]
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

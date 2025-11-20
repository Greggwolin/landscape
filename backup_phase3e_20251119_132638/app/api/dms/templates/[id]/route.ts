/**
 * DMS Template API - Single template operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const UpdateTemplateSchema = z.object({
  template_name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  doc_type_options: z.array(z.string()).min(1).optional(),
  is_default: z.boolean().optional(),
});

// PATCH - Update template
export async function PATCH(
  request: NextRequest,
  context: Params
) {
  try {
    const body = await request.json();
    const validated = UpdateTemplateSchema.parse(body);
    const templateId = parseInt((await context.params).id);

    // If setting as default, need to get workspace/project and unset others
    if (validated.is_default) {
      const current = await sql`
        SELECT workspace_id, project_id
        FROM landscape.dms_templates
        WHERE template_id = ${templateId}
      `;

      if (current.length > 0) {
        const { workspace_id, project_id } = current[0];

        if (workspace_id) {
          await sql`
            UPDATE landscape.dms_templates
            SET is_default = false
            WHERE workspace_id = ${workspace_id}
              AND template_id != ${templateId}
          `;
        } else if (project_id) {
          await sql`
            UPDATE landscape.dms_templates
            SET is_default = false
            WHERE project_id = ${project_id}
              AND template_id != ${templateId}
          `;
        }
      }
    }

    const result = await sql`
      UPDATE landscape.dms_templates
      SET
        template_name = COALESCE(${validated.template_name || null}, template_name),
        description = COALESCE(${validated.description || null}, description),
        doc_type_options = COALESCE(${validated.doc_type_options || null}, doc_type_options),
        is_default = COALESCE(${validated.is_default !== undefined ? validated.is_default : null}, is_default),
        updated_at = NOW()
      WHERE template_id = ${templateId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: result[0]
    });
  } catch (error) {
    console.error('Error updating template:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(
  request: NextRequest,
  context: Params
) {
  try {
    const templateId = parseInt((await context.params).id);

    // Don't allow deleting default templates
    const result = await sql`
      DELETE FROM landscape.dms_templates
      WHERE template_id = ${templateId}
        AND is_default = false
      RETURNING template_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Cannot delete default template or template not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

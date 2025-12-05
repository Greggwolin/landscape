import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const templateId = parseInt(params.id);

    const result = await sql`
      UPDATE landscape.dms_templates
      SET
        template_name = COALESCE(${body.template_name}, template_name),
        description = COALESCE(${body.description}, description),
        doc_type_options = COALESCE(${body.doc_type_options}, doc_type_options),
        is_default = COALESCE(${body.is_default}, is_default),
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
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = parseInt(params.id);

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

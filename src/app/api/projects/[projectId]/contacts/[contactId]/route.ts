import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * PATCH /api/projects/[projectId]/contacts/[contactId]
 * Update existing contact
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; contactId: string } }
) {
  try {
    const contactId = parseInt(params.contactId);
    const body = await request.json();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (body.name !== undefined) {
      updates.push(`contact_name = $${paramCount++}`);
      values.push(body.name);
    }
    if (body.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(body.title);
    }
    if (body.company !== undefined) {
      updates.push(`company = $${paramCount++}`);
      values.push(body.company);
    }
    if (body.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(body.email);
    }
    if (body.phone_direct !== undefined) {
      updates.push(`phone_direct = $${paramCount++}`);
      values.push(body.phone_direct);
    }
    if (body.phone_mobile !== undefined) {
      updates.push(`phone_mobile = $${paramCount++}`);
      values.push(body.phone_mobile);
    }
    if (body.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(body.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(contactId);
    const query = `
      UPDATE landscape.tbl_contacts
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE contact_id = $${paramCount}
      RETURNING contact_id, contact_name
    `;

    const { rows } = await sql.query(query, values);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/contacts/[contactId]
 * Delete contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; contactId: string } }
) {
  try {
    const contactId = parseInt(params.contactId);

    const { rowCount } = await sql`
      DELETE FROM landscape.tbl_contacts
      WHERE contact_id = ${contactId}
    `;

    if (rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

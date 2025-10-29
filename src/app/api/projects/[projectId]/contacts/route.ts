import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/projects/[projectId]/contacts
 * Returns contacts grouped by role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);

    // Fetch all contacts for this project
    const result = await sql`
      SELECT
        contact_id,
        contact_role,
        role_display_name,
        contact_name,
        title,
        company,
        email,
        phone_direct,
        phone_mobile,
        notes,
        sort_order
      FROM landscape.v_project_contacts
      WHERE project_id = ${projectId}
      ORDER BY role_display_order, sort_order, contact_id
    `;

    // Neon returns rows directly, not wrapped in { rows }
    const rows = Array.isArray(result) ? result : (result as any).rows || [];

    // Return empty array if no contacts
    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Group contacts by role
    const grouped = rows.reduce((acc, contact) => {
      const role = contact.contact_role;
      if (!acc[role]) {
        acc[role] = {
          role_key: role,
          role_label: contact.role_display_name,
          contacts: []
        };
      }
      acc[role].contacts.push({
        contact_id: contact.contact_id,
        name: contact.contact_name,
        title: contact.title,
        company: contact.company,
        email: contact.email,
        phone_direct: contact.phone_direct,
        phone_mobile: contact.phone_mobile,
        notes: contact.notes,
        sort_order: contact.sort_order
      });
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: Object.values(grouped)
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/contacts
 * Create new contact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId);
    const body = await request.json();

    const { rows } = await sql`
      INSERT INTO landscape.tbl_contacts (
        project_id, contact_role, contact_name, title, company,
        email, phone_direct, phone_mobile, notes, sort_order
      )
      VALUES (
        ${projectId}, ${body.contact_role}, ${body.name}, ${body.title || null},
        ${body.company || null}, ${body.email || null}, ${body.phone_direct || null},
        ${body.phone_mobile || null}, ${body.notes || null}, ${body.sort_order || 0}
      )
      RETURNING contact_id, contact_name, contact_role
    `;

    return NextResponse.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}

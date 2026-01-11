// API Route: PATCH /api/projects/[id]
// Purpose: Update project fields (location, type, template, etc.)
// Usage: Project edit functionality from Home page

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    const updates = await request.json();

    // Build dynamic UPDATE query based on provided fields
    const allowedFields = [
      'project_name',
      'description',
      'location_description',
      'jurisdiction_city',
      'jurisdiction_county',
      'jurisdiction_state',
      'developer_owner',
      'acres_gross',
      'start_date',
      'property_type_code',
      'project_type',
      'template_id'
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    // Filter and build UPDATE SET clause
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);

    // Add project_id as last parameter
    values.push(projectId);

    const query = `
      UPDATE landscape.tbl_project
      SET ${updateFields.join(', ')}
      WHERE project_id = $${valueIndex}
      RETURNING *
    `;

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

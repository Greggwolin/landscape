import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * DELETE /api/multifamily/units/[id]
 * Delete a unit (will cascade delete associated leases if foreign key is set up)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const unitId = parseInt(id, 10);

    if (isNaN(unitId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid unit ID' },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM landscape.tbl_multifamily_unit
      WHERE unit_id = $1
      RETURNING unit_id
    `;

    const result = await client.query(query, [unitId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Unit deleted successfully',
      data: { unit_id: unitId }
    });
  } catch (error: any) {
    console.error('Error deleting multifamily unit:', error);

    // Handle foreign key constraint violation
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete unit: associated leases exist. Delete leases first.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete unit' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/multifamily/units/[id]
 * Update a unit
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const unitId = parseInt(id, 10);
    const body = await request.json();

    if (isNaN(unitId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid unit ID' },
        { status: 400 }
      );
    }

    // Dynamic update based on provided fields
    const allowedFields = [
      'unit_number',
      'building_name',
      'unit_type',
      'bedrooms',
      'bathrooms',
      'square_feet',
      'market_rent',
      'renovation_status',
      'renovation_date',
      'renovation_cost',
      'other_features'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(body[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    values.push(unitId);
    const query = `
      UPDATE landscape.tbl_multifamily_unit
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE unit_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    // Convert BIGINT fields
    const unit = {
      ...result.rows[0],
      unit_id: Number(result.rows[0].unit_id),
      project_id: Number(result.rows[0].project_id),
    };

    return NextResponse.json({
      success: true,
      data: unit
    });
  } catch (error: any) {
    console.error('Error updating multifamily unit:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Unit number already exists for this project' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update unit' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

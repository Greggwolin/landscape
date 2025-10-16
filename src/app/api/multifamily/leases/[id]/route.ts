import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * PATCH /api/multifamily/leases/[id]
 * Update a lease by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const leaseId = parseInt(id, 10);

    if (isNaN(leaseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lease ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Build dynamic UPDATE query based on provided fields
    const allowedFields = [
      'unit_id',
      'resident_name',
      'lease_start_date',
      'lease_end_date',
      'lease_term_months',
      'base_rent_monthly',
      'effective_rent_monthly',
      'months_free_rent',
      'concession_amount',
      'security_deposit',
      'pet_rent_monthly',
      'parking_rent_monthly',
      'lease_status',
      'notice_date',
      'notice_to_vacate_days',
      'is_renewal',
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(body[key]);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add lease_id as last parameter
    paramCount++;
    values.push(leaseId);

    const query = `
      UPDATE landscape.tbl_multifamily_lease
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE lease_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating lease:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/multifamily/leases/[id]
 * Delete a lease by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const leaseId = parseInt(id, 10);

    if (isNaN(leaseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid lease ID' },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM landscape.tbl_multifamily_lease
      WHERE lease_id = $1
      RETURNING lease_id
    `;

    const result = await client.query(query, [leaseId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lease deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting lease:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

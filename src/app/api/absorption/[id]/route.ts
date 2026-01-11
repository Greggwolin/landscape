/**
 * Absorption Schedule API - Get, Update, Delete by ID
 * GET /api/absorption/[id]
 * PATCH /api/absorption/[id]
 * DELETE /api/absorption/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/absorption/[id]
 * Get a single absorption schedule with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      SELECT
        ab.*,
        p.project_name,
        ph.phase_name,
        pa.parcel_code,
        a.area_alias
      FROM landscape.tbl_absorption_schedule ab
      LEFT JOIN landscape.tbl_project p ON ab.project_id = p.project_id
      LEFT JOIN landscape.tbl_phase ph ON ab.phase_id = ph.phase_id
      LEFT JOIN landscape.tbl_parcel pa ON ab.parcel_id = pa.parcel_id
      LEFT JOIN landscape.tbl_area a ON ab.area_id = a.area_id
      WHERE ab.absorption_id=${id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Absorption schedule not found',
        },
        { status: 404 }
      );
    }

    // Get revenue timing details if they exist
    const timing = await sql`
      SELECT *
      FROM landscape.tbl_revenue_timing
      WHERE absorption_id=${id}
      ORDER BY period_id
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...result[0],
        timing_detail: timing,
      },
    });
  } catch (error: unknown) {
    console.error('Absorption GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch absorption schedule',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/absorption/[id]
 * Update an absorption schedule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    const allowedFields = [
      'revenue_stream_name',
      'revenue_category',
      'lu_family_name',
      'lu_type_code',
      'product_code',
      'start_period',
      'periods_to_complete',
      'timing_method',
      'units_per_period',
      'total_units',
      'base_price_per_unit',
      'price_escalation_pct',
      'scenario_name',
      'probability_weight',
      'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update',
        },
        { status: 400 }
      );
    }

    // Always update updated_at
    updates.push('updated_at = NOW()');

    // Add absorption_id to values
    values.push(id);

    const query = `
      UPDATE landscape.tbl_absorption_schedule
      SET ${updates.join(', ')}
      WHERE absorption_id = $${paramCount}
      RETURNING *
    `;

    const result = await sql.query(query, values);

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Absorption schedule not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Absorption schedule updated successfully',
    });
  } catch (error: unknown) {
    console.error('Absorption PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update absorption schedule',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/absorption/[id]
 * Delete an absorption schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if exists
    const check = await sql`
      SELECT absorption_id
      FROM landscape.tbl_absorption_schedule
      WHERE absorption_id=${id}
    `;

    if (check.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Absorption schedule not found',
        },
        { status: 404 }
      );
    }

    // Delete (will cascade to revenue_timing)
    await sql`
      DELETE FROM landscape.tbl_absorption_schedule
      WHERE absorption_id=${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Absorption schedule deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Absorption DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete absorption schedule',
      },
      { status: 500 }
    );
  }
}

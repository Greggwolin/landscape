/**
 * Dependencies API - Update & Delete by ID
 * PUT /api/dependencies/[id]
 * DELETE /api/dependencies/[id]
 */

import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

/**
 * PUT /api/dependencies/[id]
 * Update a dependency
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      trigger_event,
      trigger_value,
      offset_periods,
      is_hard_dependency,
      notes,
    } = body;

    // Build dynamic update (only update provided fields)
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (trigger_event !== undefined) {
      updates.push(`trigger_event = $${paramCount++}`);
      values.push(trigger_event);
    }
    if (trigger_value !== undefined) {
      updates.push(`trigger_value = $${paramCount++}`);
      values.push(trigger_value);
    }
    if (offset_periods !== undefined) {
      updates.push(`offset_periods = $${paramCount++}`);
      values.push(offset_periods);
    }
    if (is_hard_dependency !== undefined) {
      updates.push(`is_hard_dependency = $${paramCount++}`);
      values.push(is_hard_dependency);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
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

    // Add dependency_id to values
    values.push(id);

    const query = `
      UPDATE landscape.tbl_item_dependency
      SET ${updates.join(', ')}
      WHERE dependency_id = $${paramCount}
      RETURNING *
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dependency not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Dependency updated successfully',
    });
  } catch (error: any) {
    console.error('Dependencies PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update dependency',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dependencies/[id]
 * Delete a dependency
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get dependency info before deleting
    const info = await sql`
      SELECT dependent_item_table, dependent_item_id
      FROM landscape.tbl_item_dependency
      WHERE dependency_id=${id}
    `;

    if (info.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dependency not found',
        },
        { status: 404 }
      );
    }

    const { dependent_item_table, dependent_item_id } = info[0];

    // Delete the dependency
    await sql`
      DELETE FROM landscape.tbl_item_dependency
      WHERE dependency_id=${id}
    `;

    // Check if there are any remaining dependencies for this item
    const remaining = await sql`
      SELECT COUNT(*) AS count
      FROM landscape.tbl_item_dependency
      WHERE dependent_item_table=${dependent_item_table}
      AND dependent_item_id=${dependent_item_id}
    `;

    const remainingCount = parseInt(remaining[0].count as string, 10);

    // If no more dependencies, reset timing method to ABSOLUTE
    if (remainingCount === 0) {
      if (dependent_item_table === 'tbl_budget_items') {
        await sql`
          UPDATE landscape.tbl_budget_items
          SET timing_method='ABSOLUTE'
          WHERE budget_item_id=${dependent_item_id}
        `;
      } else if (dependent_item_table === 'tbl_absorption_schedule') {
        await sql`
          UPDATE landscape.tbl_absorption_schedule
          SET timing_method='ABSOLUTE'
          WHERE absorption_id=${dependent_item_id}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dependency deleted successfully',
    });
  } catch (error: any) {
    console.error('Dependencies DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete dependency',
      },
      { status: 500 }
    );
  }
}

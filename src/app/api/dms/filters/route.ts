import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { CreateSmartFilterZ, UpdateSmartFilterZ } from './schema';
import { z } from 'zod';

/**
 * GET /api/dms/filters
 * List all smart filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const whereClause = includeInactive ? '' : 'WHERE is_active = true';

    const result = await sql.query(
      `SELECT
        filter_id,
        name,
        query,
        is_active,
        created_at,
        updated_at
       FROM landscape.core_doc_smartfilter
       ${whereClause}
       ORDER BY name`
    );

    const filters = result.rows.map(row => ({
      ...row,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      filters,
      totalFilters: filters.length,
    });

  } catch (error) {
    console.error('Error fetching smart filters:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch smart filters',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dms/filters
 * Create a new smart filter
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateSmartFilterZ.parse(body);

    const result = await sql`
      INSERT INTO landscape.core_doc_smartfilter (
        name,
        query
      ) VALUES (
        ${data.name},
        ${JSON.stringify(data.query)}
      )
      RETURNING
        filter_id,
        name,
        query,
        is_active,
        created_at,
        updated_at
    `;

    const filter = result.rows[0];

    return NextResponse.json({
      success: true,
      filter: {
        ...filter,
        created_at: filter.created_at.toISOString(),
        updated_at: filter.updated_at.toISOString(),
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating smart filter:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create smart filter',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dms/filters
 * Update an existing smart filter
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = UpdateSmartFilterZ.parse(body);

    // Check filter exists
    const filterCheck = await sql`
      SELECT filter_id FROM landscape.core_doc_smartfilter
      WHERE filter_id = ${data.filter_id}
    `;

    if (filterCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Smart filter not found' },
        { status: 404 }
      );
    }

    // Build UPDATE query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.query !== undefined) {
      updates.push(`query = $${paramIndex++}`);
      values.push(JSON.stringify(data.query));
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add filter_id to values
    values.push(data.filter_id);

    const result = await sql.query(
      `UPDATE landscape.core_doc_smartfilter
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE filter_id = $${paramIndex}
       RETURNING
         filter_id,
         name,
         query,
         is_active,
         created_at,
         updated_at`,
      values
    );

    const filter = result.rows[0];

    return NextResponse.json({
      success: true,
      filter: {
        ...filter,
        created_at: filter.created_at.toISOString(),
        updated_at: filter.updated_at.toISOString(),
      },
    });

  } catch (error) {
    console.error('Error updating smart filter:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update smart filter',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dms/filters
 * Soft delete a smart filter
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterId = searchParams.get('filter_id');

    if (!filterId) {
      return NextResponse.json(
        { success: false, error: 'filter_id is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE landscape.core_doc_smartfilter
      SET is_active = false, updated_at = NOW()
      WHERE filter_id = ${filterId}
      RETURNING filter_id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Smart filter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      filter_id: parseInt(filterId),
    });

  } catch (error) {
    console.error('Error deleting smart filter:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete smart filter',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/dms/db';
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

    const filters = includeInactive
      ? await sql`
          SELECT
            filter_id,
            name,
            query,
            is_active,
            created_at,
            updated_at
          FROM landscape.core_doc_smartfilter
          ORDER BY name
        `
      : await sql`
          SELECT
            filter_id,
            name,
            query,
            is_active,
            created_at,
            updated_at
          FROM landscape.core_doc_smartfilter
          WHERE is_active = true
          ORDER BY name
        `;

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

    const filters = await sql`
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

    const filter = filters[0];

    return NextResponse.json({
      success: true,
      filter,
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

    if (filterCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Smart filter not found' },
        { status: 404 }
      );
    }

    // Build field list for validation
    const hasUpdates = data.name !== undefined || data.query !== undefined || data.is_active !== undefined;

    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Execute update with conditional fragments
    const filters = await sql`
      UPDATE landscape.core_doc_smartfilter
      SET
        ${data.name !== undefined ? sql`name = ${data.name},` : sql``}
        ${data.query !== undefined ? sql`query = ${JSON.stringify(data.query)},` : sql``}
        ${data.is_active !== undefined ? sql`is_active = ${data.is_active},` : sql``}
        updated_at = NOW()
      WHERE filter_id = ${data.filter_id}
      RETURNING
        filter_id,
        name,
        query,
        is_active,
        created_at,
        updated_at
    `;

    const filter = filters[0];

    return NextResponse.json({
      success: true,
      filter,
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

    if (result.length === 0) {
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

/**
 * OpEx Bulk Delete API
 *
 * DELETE /api/opex/bulk-delete
 * Deletes multiple operating expense rows by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface BulkDeleteRequest {
  ids: number[];
}

export async function DELETE(request: NextRequest) {
  try {
    const body: BulkDeleteRequest = await request.json();
    const { ids } = body;

    // Validate inputs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all IDs are numbers
    const validIds = ids.filter(id => typeof id === 'number' && Number.isFinite(id));
    if (validIds.length !== ids.length) {
      return NextResponse.json(
        { error: 'All ids must be valid numbers' },
        { status: 400 }
      );
    }

    // Delete the expense rows
    const deleteResult = await sql`
      DELETE FROM tbl_operating_expenses
      WHERE opex_id = ANY(${validIds}::int[])
      RETURNING opex_id, expense_category, expense_type
    `;

    if (deleteResult.length === 0) {
      return NextResponse.json(
        { error: 'No matching expense items found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.length} expense item(s)`,
      deleted_count: deleteResult.length,
      deleted_ids: deleteResult.map(r => r.opex_id)
    });

  } catch (error) {
    console.error('Error deleting expenses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete expenses', details: errorMessage },
      { status: 500 }
    );
  }
}

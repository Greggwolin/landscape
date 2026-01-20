/**
 * OpEx Category Update API
 *
 * POST /api/opex/categorize
 * Updates an expense's parent_category and saves the mapping for future use
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface CategorizeRequest {
  opex_id: number;
  new_category: string;
  label: string;
}

// Valid parent categories
const VALID_CATEGORIES = [
  'taxes_insurance',
  'utilities',
  'repairs_maintenance',
  'payroll_personnel',
  'administrative',
  'management',
  'other',
  'unclassified'
];

export async function POST(request: NextRequest) {
  try {
    const body: CategorizeRequest = await request.json();
    const { opex_id, new_category, label } = body;

    // Validate inputs
    if (!opex_id || typeof opex_id !== 'number') {
      return NextResponse.json(
        { error: 'opex_id is required and must be a number' },
        { status: 400 }
      );
    }

    if (!new_category || !VALID_CATEGORIES.includes(new_category)) {
      return NextResponse.json(
        { error: `new_category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!label || typeof label !== 'string') {
      return NextResponse.json(
        { error: 'label is required' },
        { status: 400 }
      );
    }

    // Normalize the label for consistent lookups
    const normalizedLabel = label.trim().toLowerCase();

    // 1. Update the expense record's parent_category
    const updateResult = await sql`
      UPDATE tbl_operating_expenses
      SET parent_category = ${new_category},
          updated_at = NOW()
      WHERE opex_id = ${opex_id}
      RETURNING opex_id, expense_category, expense_type, parent_category
    `;

    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // 2. Save/update the learned mapping for future extractions
    // Use UPSERT to handle both new and existing mappings
    await sql`
      INSERT INTO opex_label_mapping (
        source_label,
        normalized_label,
        parent_category,
        target_field,
        times_used
      ) VALUES (
        ${label},
        ${normalizedLabel},
        ${new_category},
        NULL,
        1
      )
      ON CONFLICT (source_label)
      DO UPDATE SET
        parent_category = ${new_category},
        times_used = opex_label_mapping.times_used + 1
    `;

    // 3. Get updated expense info
    const updatedExpense = updateResult[0];

    return NextResponse.json({
      success: true,
      message: `Expense "${label}" categorized as "${new_category}"`,
      expense: {
        opex_id: updatedExpense.opex_id,
        expense_category: updatedExpense.expense_category,
        expense_type: updatedExpense.expense_type,
        parent_category: updatedExpense.parent_category
      },
      mapping_saved: true
    });

  } catch (error) {
    console.error('Error categorizing expense:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to categorize expense', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/opex/categorize
 * Returns all learned category mappings
 */
export async function GET() {
  try {
    const mappings = await sql`
      SELECT
        mapping_id,
        source_label,
        normalized_label,
        parent_category,
        target_field,
        times_used,
        created_at
      FROM opex_label_mapping
      ORDER BY times_used DESC, source_label ASC
    `;

    return NextResponse.json({
      success: true,
      count: mappings.length,
      mappings
    });

  } catch (error) {
    console.error('Error fetching mappings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch mappings', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/opex/categorize?mapping_id=123
 * Deletes a learned mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mapping_id');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'mapping_id query parameter is required' },
        { status: 400 }
      );
    }

    const deleteResult = await sql`
      DELETE FROM opex_label_mapping
      WHERE mapping_id = ${parseInt(mappingId, 10)}
      RETURNING mapping_id, source_label
    `;

    if (deleteResult.length === 0) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Mapping "${deleteResult[0].source_label}" deleted`,
      deleted: deleteResult[0]
    });

  } catch (error) {
    console.error('Error deleting mapping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete mapping', details: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string; opexId: string }> };

/**
 * PATCH /api/projects/{projectId}/opex/{opexId}
 *
 * Update a single operating expense row.
 * Supports partial updates for:
 * - category_id: Change the expense category (FK to core_unit_cost_category)
 * - unit_amount: Update the per-unit amount
 * - annual_amount: Update the annual total
 * - expense_category: Update the display name (legacy field)
 * - parent_category: Update the parent category grouping
 * - source: Track data origin (user, ingestion, user_modified)
 */
export async function PATCH(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId, opexId } = await context.params;
    const projectIdNum = parseInt(projectId);
    const opexIdNum = parseInt(opexId);

    if (isNaN(projectIdNum) || isNaN(opexIdNum)) {
      return NextResponse.json(
        { error: 'Invalid project or opex ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verify the expense belongs to this project
    const existing = await sql`
      SELECT opex_id, project_id, source
      FROM landscape.tbl_operating_expenses
      WHERE opex_id = ${opexIdNum}
        AND project_id = ${projectIdNum}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Operating expense not found' },
        { status: 404 }
      );
    }

    // Build dynamic update based on provided fields
    const updates: Record<string, unknown> = {};
    const allowedFields = [
      'category_id',
      'unit_amount',
      'annual_amount',
      'amount_per_sf',
      'expense_category',
      'parent_category',
      'source',
      'escalation_rate',
      'notes'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // If this was an ingested record and user is modifying it, update source
    const currentSource = existing[0].source;
    if (currentSource === 'ingestion' && !updates.source) {
      updates.source = 'user_modified';
    }

    // If category_id is being updated, also update expense_category for display
    if (updates.category_id) {
      const category = await sql`
        SELECT category_name
        FROM landscape.core_unit_cost_category
        WHERE category_id = ${updates.category_id}
      `;
      if (category.length > 0) {
        updates.expense_category = category[0].category_name;
      }
    }

    // Execute update with dynamic fields
    // Using tagged template literal with dynamic fields requires careful construction
    const result = await sql`
      UPDATE landscape.tbl_operating_expenses
      SET
        category_id = COALESCE(${updates.category_id ?? null}::integer, category_id),
        unit_amount = COALESCE(${updates.unit_amount ?? null}::numeric, unit_amount),
        annual_amount = COALESCE(${updates.annual_amount ?? null}::numeric, annual_amount),
        amount_per_sf = COALESCE(${updates.amount_per_sf ?? null}::numeric, amount_per_sf),
        expense_category = COALESCE(${updates.expense_category ?? null}::varchar, expense_category),
        parent_category = COALESCE(${updates.parent_category ?? null}::varchar, parent_category),
        source = COALESCE(${updates.source ?? null}::varchar, source),
        escalation_rate = COALESCE(${updates.escalation_rate ?? null}::numeric, escalation_rate),
        notes = COALESCE(${updates.notes ?? null}::text, notes),
        updated_at = NOW()
      WHERE opex_id = ${opexIdNum}
        AND project_id = ${projectIdNum}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Update failed' },
        { status: 500 }
      );
    }

    // Fetch the updated row with category details
    const updated = await sql`
      SELECT
        oe.*,
        c.category_name,
        c.account_number,
        c.parent_id as category_parent_id,
        pc.category_name as parent_category_name
      FROM landscape.tbl_operating_expenses oe
      LEFT JOIN landscape.core_unit_cost_category c ON oe.category_id = c.category_id
      LEFT JOIN landscape.core_unit_cost_category pc ON c.parent_id = pc.category_id
      WHERE oe.opex_id = ${opexIdNum}
    `;

    return NextResponse.json({
      success: true,
      expense: updated[0]
    });

  } catch (error) {
    console.error('Error updating operating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update operating expense' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/{projectId}/opex/{opexId}
 *
 * Get a single operating expense with category details.
 */
export async function GET(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId, opexId } = await context.params;
    const projectIdNum = parseInt(projectId);
    const opexIdNum = parseInt(opexId);

    const expense = await sql`
      SELECT
        oe.*,
        c.category_name,
        c.account_number,
        c.parent_id as category_parent_id,
        pc.category_name as parent_category_name
      FROM landscape.tbl_operating_expenses oe
      LEFT JOIN landscape.core_unit_cost_category c ON oe.category_id = c.category_id
      LEFT JOIN landscape.core_unit_cost_category pc ON c.parent_id = pc.category_id
      WHERE oe.opex_id = ${opexIdNum}
        AND oe.project_id = ${projectIdNum}
    `;

    if (expense.length === 0) {
      return NextResponse.json(
        { error: 'Operating expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense: expense[0] });

  } catch (error) {
    console.error('Error fetching operating expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operating expense' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/{projectId}/opex/{opexId}
 *
 * Delete a single operating expense.
 */
export async function DELETE(
  request: NextRequest,
  context: Params
) {
  try {
    const { projectId, opexId } = await context.params;
    const projectIdNum = parseInt(projectId);
    const opexIdNum = parseInt(opexId);

    const result = await sql`
      DELETE FROM landscape.tbl_operating_expenses
      WHERE opex_id = ${opexIdNum}
        AND project_id = ${projectIdNum}
      RETURNING opex_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Operating expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: opexIdNum });

  } catch (error) {
    console.error('Error deleting operating expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete operating expense' },
      { status: 500 }
    );
  }
}

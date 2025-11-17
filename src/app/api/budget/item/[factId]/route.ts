import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/budget/items/:factId
 *
 * Update an existing budget line item (partial update)
 * Automatically recalculates amount if qty or rate is changed
 *
 * Request Body: (all fields optional)
 * {
 *   categoryId?: number,
 *   qty?: number,
 *   rate?: number,
 *   amount?: number,
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   escalationRate?: number,
 *   contingencyPct?: number,
 *   timingMethod?: string,
 *   contractNumber?: string,
 *   purchaseOrder?: string,
 *   confidenceLevel?: string,
 *   notes?: string
 * }
 *
 * Returns:
 * - item: BudgetGridItem - The updated budget item
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ factId: string }> }
) {
  try {
    const { factId } = await params;
    const body = await request.json();

    // Try Django API first (supports all 49 fields)
    const DJANGO_API_URL = process.env.DJANGO_API_URL || 'http://localhost:8000';

    try {
      const djangoResponse = await fetch(`${DJANGO_API_URL}/api/budget-items/${factId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body), // Pass all fields through
      });

      if (djangoResponse.ok) {
        const data = await djangoResponse.json();
        return NextResponse.json({
          success: true,
          data: { item: data }
        });
      }
    } catch (djangoError) {
      console.warn('Django API unavailable, falling back to SQL:', djangoError);
    }

    // Fallback to SQL (legacy - supports limited fields)
    const {
      categoryId,
      qty,
      rate,
      amount,
      startDate,
      endDate,
      escalationRate,
      contingencyPct,
      timingMethod,
      contractNumber,
      purchaseOrder,
      confidenceLevel,
      notes
    } = body;

    // Call the database function for partial update
    const result = await sql`
      SELECT *
      FROM landscape.update_budget_item(
        ${parseInt(factId)},
        ${categoryId || null},
        ${qty !== undefined ? qty : null},
        ${rate !== undefined ? rate : null},
        ${amount !== undefined ? amount : null},
        ${startDate || null},
        ${endDate || null},
        ${escalationRate !== undefined ? escalationRate : null},
        ${contingencyPct !== undefined ? contingencyPct : null},
        ${timingMethod || null},
        ${contractNumber || null},
        ${purchaseOrder || null},
        ${confidenceLevel || null},
        ${notes || null}
      )
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Budget item not found',
          details: `No item found with fact_id: ${factId}`
        },
        { status: 404 }
      );
    }

    // Fetch the complete updated item with category hierarchy
    const enrichedItem = await sql`
      SELECT
        vbgi.*,
        vbv.original_amount,
        vbv.variance_amount,
        vbv.variance_percent,
        vbv.variance_status,
        parent_cat.detail as parent_category_name,
        parent_cat.code as parent_category_code
      FROM landscape.vw_budget_grid_items vbgi
      LEFT JOIN landscape.vw_budget_variance vbv ON vbgi.fact_id = vbv.fact_id
      LEFT JOIN landscape.core_fin_category parent_cat ON parent_cat.category_id = (
        SELECT parent_id FROM landscape.core_fin_category WHERE category_id = vbgi.category_id
      )
      WHERE vbgi.fact_id = ${parseInt(factId)}
    `;

    return NextResponse.json({
      success: true,
      data: {
        item: enrichedItem[0]
      }
    });

  } catch (error) {
    console.error('Error updating budget item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update budget item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget/items/:factId
 *
 * Delete a budget line item (with business rule validation)
 * Cannot delete committed items or items with actual transactions
 *
 * Returns:
 * - success: boolean
 * - message: string
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ factId: string }> }
) {
  try {
    const { factId } = await params;

    // Call the database function for safe delete
    const result = await sql`
      SELECT *
      FROM landscape.delete_budget_item(${parseInt(factId)})
    `;

    const deleteResult = result[0];

    if (!deleteResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: deleteResult.message,
          details: 'Business rule validation failed'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: deleteResult.message
    });

  } catch (error) {
    console.error('Error deleting budget item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete budget item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

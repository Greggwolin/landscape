import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/budget/items
 *
 * Create a new budget line item
 *
 * Request Body:
 * {
 *   budgetId: number,
 *   peLevel: string (e.g., "project"),
 *   peId: string (e.g., "7"),
 *   categoryId: number,
 *   uomCode?: string (default: "EA"),
 *   qty?: number,
 *   rate?: number,
 *   amount?: number (auto-calculated from qty * rate if not provided),
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   escalationRate?: number,
 *   contingencyPct?: number,
 *   timingMethod?: string (default: "distributed"),
 *   notes?: string
 * }
 *
 * Returns:
 * - item: BudgetGridItem - The newly created budget item with all calculated fields
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      budgetId,
      peLevel,
      peId,
      categoryId,
      uomCode = 'EA',
      qty,
      rate,
      amount,
      startDate,
      endDate,
      escalationRate = 0,
      contingencyPct = 0,
      timingMethod = 'distributed',
      notes = ''
    } = body;

    // Validate required fields
    if (!budgetId || !peLevel || !peId || !categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'budgetId, peLevel, peId, and categoryId are required'
        },
        { status: 400 }
      );
    }

    // Validate amount OR (qty + rate)
    if (!amount && (!qty || !rate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: 'Must provide either amount OR both qty and rate'
        },
        { status: 400 }
      );
    }

    // Calculate amount if not provided
    const finalAmount = amount || (qty * rate);

    // Insert the new budget item
    const result = await sql`
      INSERT INTO landscape.core_fin_fact_budget (
        budget_id,
        pe_level,
        pe_id,
        category_id,
        uom_code,
        qty,
        rate,
        amount,
        start_date,
        end_date,
        escalation_rate,
        contingency_pct,
        timing_method,
        notes,
        created_at
      ) VALUES (
        ${budgetId},
        ${peLevel},
        ${peId},
        ${categoryId},
        ${uomCode},
        ${qty || null},
        ${rate || null},
        ${finalAmount},
        ${startDate || null},
        ${endDate || null},
        ${escalationRate},
        ${contingencyPct},
        ${timingMethod},
        ${notes},
        NOW()
      )
      RETURNING *
    `;

    const newItem = result[0];

    // Fetch the complete item with category hierarchy
    const enrichedItem = await sql`
      SELECT
        vbgi.*,
        parent_cat.detail as parent_category_name,
        parent_cat.code as parent_category_code
      FROM landscape.vw_budget_grid_items vbgi
      LEFT JOIN landscape.core_fin_category parent_cat ON parent_cat.category_id = (
        SELECT parent_id FROM landscape.core_fin_category WHERE category_id = vbgi.category_id
      )
      WHERE vbgi.fact_id = ${newItem.fact_id}
    `;

    return NextResponse.json({
      success: true,
      data: {
        item: enrichedItem[0]
      }
    });

  } catch (error) {
    console.error('Error creating budget item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create budget item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

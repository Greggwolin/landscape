// app/api/budget-structure/route.ts
// UPDATED VERSION - Uses core_fin_* tables instead of legacy tbl_budget_*
import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    // Updated to use core_fin_category and core_fin_fact_budget
    const result = await sql`
      SELECT
        fc.category_id,
        fc.code,
        fc.class as scope,
        fc.scope as category,
        fc.detail,
        fc.kind,
        -- Budget fact data (if exists for this project)
        fb.fact_id as budget_item_id,
        fb.amount,
        fb.qty as quantity,
        fb.rate as cost_per_unit,
        fb.notes,
        fb.uom_code,
        fb.confidence_level
      FROM landscape.core_fin_category fc
      LEFT JOIN landscape.core_fin_fact_budget fb
        ON fc.category_id = fb.category_id
        AND fb.project_id = 7
        AND fb.division_id IS NULL
        AND fb.budget_id = (
          SELECT budget_id
          FROM landscape.core_fin_budget_version
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        )
      WHERE fc.kind = 'Use'  -- Only expense categories
        AND fc.is_active = true
      ORDER BY fc.class, fc.scope, fc.detail
    `;

    return NextResponse.json(result || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Budget structure API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch budget structure',
      details: message
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'structure') {
      // Add new budget category
      // Generate code from scope/category/detail
      const code = `USE-${data.scope.substring(0, 3).toUpperCase()}-${data.category.substring(0, 3).toUpperCase()}-${data.detail.split(' ')[0].substring(0, 3).toUpperCase()}`;

      const result = await sql`
        INSERT INTO landscape.core_fin_category (
          code, kind, class, scope, detail, is_active
        ) VALUES (
          ${code},
          'Use',
          ${data.scope},
          ${data.category},
          ${data.detail},
          true
        )
        RETURNING category_id
      `;
      return NextResponse.json({ success: true, category_id: result[0].category_id });
    }

    if (type === 'item') {
      // Get active budget version
      const budgetVersion = await sql`
        SELECT budget_id
        FROM landscape.core_fin_budget_version
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (budgetVersion.length === 0) {
        return NextResponse.json({
          error: 'No active budget version found. Create one first.'
        }, { status: 400 });
      }

      const budgetId = budgetVersion[0].budget_id;

      // Get default UOM
      const defaultUom = await sql`
        SELECT uom_code FROM landscape.core_fin_uom ORDER BY uom_code LIMIT 1
      `;

      // Add/update budget fact
      const result = await sql`
        INSERT INTO landscape.core_fin_fact_budget (
          budget_id,
          project_id,
          division_id,
          category_id,
          uom_code,
          qty,
          rate,
          amount,
          notes,
          confidence_level,
          is_committed
        ) VALUES (
          ${budgetId},
          ${data.project_id || 7},
          NULL,
          ${data.category_id},
          ${defaultUom[0]?.uom_code || 'EA'},
          ${data.quantity || 1},
          ${data.cost_per_unit},
          ${data.amount},
          ${data.notes || ''},
          'medium',
          false
        )
        RETURNING fact_id as budget_item_id
      `;

      return NextResponse.json({
        success: true,
        budget_item_id: result[0].budget_item_id
      });
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Budget structure POST error:', error);
    return NextResponse.json({
      error: 'Failed to create budget item',
      details: message
    }, { status: 500 });
  }
}

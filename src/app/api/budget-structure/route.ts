// app/api/budget-structure/route.ts
import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        bs.structure_id,
        bs.scope,
        bs.category,
        bs.detail,
        bs.cost_method,
        bs.sort_order,
        bs.start_period,
        bs.periods_to_complete,
        m.measure_code,
        m.measure_name,
        bi.budget_item_id,
        bi.amount,
        bi.quantity,
        bi.cost_per_unit,
        bi.notes
      FROM landscape.tbl_budget_structure bs
      LEFT JOIN landscape.tbl_measures m ON bs.measure_id = m.measure_id
      LEFT JOIN landscape.tbl_budget_items bi ON bs.structure_id = bi.structure_id 
        AND bi.project_id = 7
      ORDER BY bs.sort_order, bs.scope, bs.category, bs.detail
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
      // Add new budget structure item
      const result = await sql`
        INSERT INTO landscape.tbl_budget_structure (
          scope, category, detail, cost_method, measure_id, is_system, created_by, sort_order
        ) VALUES (
          ${data.scope}, ${data.category}, ${data.detail}, ${data.cost_method}, 
          ${data.measure_id}, false, ${data.created_by}, ${data.sort_order}
        )
        RETURNING structure_id
      `;
      return NextResponse.json({ success: true, structure_id: result[0].structure_id });
    } 
    
    if (type === 'item') {
      // Add/update budget item
      const result = await sql`
        INSERT INTO landscape.tbl_budget_items (
          project_id, structure_id, amount, quantity, cost_per_unit, notes
        ) VALUES (
          ${data.project_id || 7}, ${data.structure_id}, ${data.amount}, 
          ${data.quantity}, ${data.cost_per_unit}, ${data.notes}
        )
        ON CONFLICT (project_id, structure_id) 
        DO UPDATE SET 
          amount = EXCLUDED.amount,
          quantity = EXCLUDED.quantity,
          cost_per_unit = EXCLUDED.cost_per_unit,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP
        RETURNING budget_item_id
      `;
      return NextResponse.json({ success: true, budget_item_id: result[0].budget_item_id });
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
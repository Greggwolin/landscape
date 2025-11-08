/**
 * POST /api/budget/gantt/items
 *
 * Creates a new budget item
 */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const item = await request.json();

    if (!item.project_id || (!item.category_id && !item.category_l1_id)) {
      return NextResponse.json(
        { error: 'project_id and either category_id or category_l1_id are required' },
        { status: 400 }
      );
    }

    const budgetRows = await sql`
      SELECT budget_id
      FROM core_fin_budget_version
      WHERE project_id = ${item.project_id}
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (budgetRows.length === 0) {
      return NextResponse.json(
        { error: 'No active budget found for this project' },
        { status: 404 }
      );
    }

    const qty = item.qty !== undefined && item.qty !== null ? Number(item.qty) : 0;
    const rate = item.rate !== undefined && item.rate !== null ? Number(item.rate) : 0;
    const amount =
      item.amount !== undefined && item.amount !== null ? Number(item.amount) : qty * rate;

    const peLevel = item.container_id ? 'container' : 'project';
    const peId = item.container_id ?? item.project_id;

    const query = `
      INSERT INTO core_fin_fact_budget (
        budget_id,
        project_id,
        container_id,
        pe_level,
        pe_id,
        category_id,
        category_l1_id,
        category_l2_id,
        category_l3_id,
        category_l4_id,
        qty,
        rate,
        amount,
        start_date,
        end_date,
        start_period,
        periods,
        vendor_name,
        notes,
        uom_code,
        escalation_rate,
        contingency_pct,
        timing_method,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, NOW(), NOW()
      )
      RETURNING *
    `;

    const params = [
      budgetRows[0].budget_id,
      item.project_id,
      item.container_id ?? null,
      peLevel,
      peId,
      item.category_id ?? null,
      item.category_l1_id ?? null,
      item.category_l2_id ?? null,
      item.category_l3_id ?? null,
      item.category_l4_id ?? null,
      qty,
      rate,
      amount,
      item.start_date ?? null,
      item.end_date ?? null,
      item.start_period ?? null,
      item.periods ?? null,
      item.vendor_name ?? null,
      item.notes ?? null,
      item.uom_code ?? null,
      item.escalation_rate ?? null,
      item.contingency_pct ?? null,
      item.timing_method ?? null,
    ];

    const result = await sql.query(query, params);
    const inserted = result.rows[0];

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('Error creating budget item:', error);
    return NextResponse.json(
      { error: 'Failed to create budget item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

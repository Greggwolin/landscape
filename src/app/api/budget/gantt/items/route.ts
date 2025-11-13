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

    console.log('=== Budget Item POST Request ===');
    console.log('Received item:', JSON.stringify(item, null, 2));

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

    // Use tagged template for Neon SQL
    const budgetId = budgetRows[0].budget_id;
    const categoryId = item.category_id ?? 4; // Default to USE-PRJ-MGMT (legacy financial category required)
    const containerId = item.container_id ?? null;
    const categoryL1Id = item.category_l1_id ?? null;
    const categoryL2Id = item.category_l2_id ?? null;
    const categoryL3Id = item.category_l3_id ?? null;
    const categoryL4Id = item.category_l4_id ?? null;
    const startDate = item.start_date ?? null;
    const endDate = item.end_date ?? null;
    const startPeriod = item.start_period ?? null;
    const periods = item.periods ?? null;
    const notes = item.notes ?? null;
    const uomCode = item.uom_code ?? 'EA';
    const escalationRate = item.escalation_rate ?? null;
    const contingencyPct = item.contingency_pct ?? null;
    const timingMethod = item.timing_method ?? null;
    const fundingId = item.funding_id ?? null;
    const curveId = item.curve_id ?? null;

    const result = await sql`
      INSERT INTO core_fin_fact_budget (
        budget_id,
        project_id,
        container_id,
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
        notes,
        uom_code,
        escalation_rate,
        contingency_pct,
        timing_method,
        funding_id,
        curve_id
      ) VALUES (
        ${budgetId},
        ${item.project_id},
        ${containerId},
        ${categoryId},
        ${categoryL1Id},
        ${categoryL2Id},
        ${categoryL3Id},
        ${categoryL4Id},
        ${qty},
        ${rate},
        ${amount},
        ${startDate},
        ${endDate},
        ${startPeriod},
        ${periods},
        ${notes},
        ${uomCode},
        ${escalationRate},
        ${contingencyPct},
        ${timingMethod},
        ${fundingId},
        ${curveId}
      )
      RETURNING *
    `;

    const inserted = result[0];

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('Error creating budget item:', error);
    return NextResponse.json(
      { error: 'Failed to create budget item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

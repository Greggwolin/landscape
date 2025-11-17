/**
 * PUT /api/budget/gantt/items/[factId]
 * DELETE /api/budget/gantt/items/[factId]
 *
 * Updates or deletes a single budget item
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ factId: string }> }
) {
  try {
    const { factId } = await params;
    const updates = await request.json();

    if (!factId) {
      return NextResponse.json(
        { error: 'factId is required' },
        { status: 400 }
      );
    }

    // Track if any updates were made
    let hasUpdates = false;

    // Execute separate UPDATE for each field (following codebase pattern from parcels API)
    if ('qty' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET qty = ${updates.qty} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('rate' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET rate = ${updates.rate} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('amount' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET amount = ${updates.amount} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('start_date' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET start_date = ${updates.start_date} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('end_date' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET end_date = ${updates.end_date} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('uom_code' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET uom_code = ${updates.uom_code} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('notes' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET notes = ${updates.notes} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('escalation_rate' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET escalation_rate = ${updates.escalation_rate} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('escalation_method' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET escalation_method = ${updates.escalation_method} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('contingency_pct' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET contingency_pct = ${updates.contingency_pct} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('timing_method' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET timing_method = ${updates.timing_method} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('curve_profile' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET curve_profile = ${updates.curve_profile} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('curve_steepness' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET curve_steepness = ${updates.curve_steepness} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('category_l1_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET category_l1_id = ${updates.category_l1_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('category_l2_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET category_l2_id = ${updates.category_l2_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('category_l3_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET category_l3_id = ${updates.category_l3_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('category_l4_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET category_l4_id = ${updates.category_l4_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('container_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET container_id = ${updates.container_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('start_period' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET start_period = ${updates.start_period} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('periods_to_complete' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET periods_to_complete = ${updates.periods_to_complete} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('vendor_name' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET vendor_name = ${updates.vendor_name} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('funding_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET funding_id = ${updates.funding_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('curve_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET curve_id = ${updates.curve_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('milestone_id' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET milestone_id = ${updates.milestone_id} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }
    if ('cf_start_flag' in updates) {
      await sql`UPDATE landscape.core_fin_fact_budget SET cf_start_flag = ${updates.cf_start_flag} WHERE fact_id = ${factId}`;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Fetch and return the updated record with category names
    const result = await sql`
      SELECT
        fb.*,
        c1.name AS category_l1_name,
        c2.name AS category_l2_name,
        c3.name AS category_l3_name,
        c4.name AS category_l4_name
      FROM landscape.core_fin_fact_budget fb
      LEFT JOIN landscape.core_budget_category c1 ON fb.category_l1_id = c1.category_id
      LEFT JOIN landscape.core_budget_category c2 ON fb.category_l2_id = c2.category_id
      LEFT JOIN landscape.core_budget_category c3 ON fb.category_l3_id = c3.category_id
      LEFT JOIN landscape.core_budget_category c4 ON fb.category_l4_id = c4.category_id
      WHERE fb.fact_id = ${factId}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Budget item not found after update' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating budget item:', error);
    return NextResponse.json(
      { error: 'Failed to update budget item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ factId: string }> }
) {
  try {
    const { factId } = await params;

    if (!factId) {
      return NextResponse.json(
        { error: 'factId is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM landscape.core_fin_fact_budget
      WHERE fact_id = ${factId}
      RETURNING fact_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Budget item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, fact_id: result[0].fact_id });
  } catch (error) {
    console.error('Error deleting budget item:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

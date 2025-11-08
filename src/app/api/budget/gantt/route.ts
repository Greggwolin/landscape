/**
 * GET /api/budget/gantt
 *
 * Fetches budget items formatted for Gantt chart display.
 * Query params: projectId, scope, level, entityId
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const scope = searchParams.get('scope');
    const level = searchParams.get('level');
    const entityId = searchParams.get('entityId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Build dynamic WHERE clause - use actual schema columns
    const whereConditions = ['fb.project_id = $1'];
    const params: any[] = [projectId];
    let paramIndex = 2;

    if (scope && scope !== 'all') {
      whereConditions.push(`fc.scope = $${paramIndex}`);
      params.push(scope);
      paramIndex++;
    }

    // Note: container_id filtering can be added later if needed
    // For now, just filter by project_id

    const result = await sql`
      SELECT
        fb.fact_id::integer as fact_id,
        fb.project_id::integer as project_id,
        fb.container_id,
        fb.category_id::integer as category_id,
        fb.qty,
        fb.rate,
        fb.amount,
        fb.uom_code,
        fb.start_date,
        fb.end_date,
        fb.notes,
        fb.escalation_rate,
        fb.contingency_pct,
        fb.timing_method,
        -- Legacy category fields
        fc.parent_id::integer AS parent_category_id,
        fc.code AS category_code,
        fc.detail AS category_detail,
        fc.scope,
        -- New category hierarchy fields
        fb.category_l1_id,
        fb.category_l2_id,
        fb.category_l3_id,
        fb.category_l4_id,
        -- Join to get category names
        c1.name AS category_l1_name,
        c2.name AS category_l2_name,
        c3.name AS category_l3_name,
        c4.name AS category_l4_name
      FROM landscape.core_fin_fact_budget fb
      JOIN landscape.core_fin_category fc ON fb.category_id = fc.category_id
      LEFT JOIN landscape.core_budget_category c1 ON fb.category_l1_id = c1.category_id
      LEFT JOIN landscape.core_budget_category c2 ON fb.category_l2_id = c2.category_id
      LEFT JOIN landscape.core_budget_category c3 ON fb.category_l3_id = c3.category_id
      LEFT JOIN landscape.core_budget_category c4 ON fb.category_l4_id = c4.category_id
      WHERE fb.project_id = ${projectId}
      ${scope && scope !== 'all' ? sql`AND fc.scope = ${scope}` : sql``}
      ORDER BY fc.scope NULLS LAST, fc.parent_id NULLS FIRST, fc.category_id
    `;

    // Neon returns array directly
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching budget gantt data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

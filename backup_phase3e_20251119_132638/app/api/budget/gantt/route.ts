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

    // Note: division_id filtering can be added later if needed
    // For now, just filter by project_id

    const result = await sql`
      SELECT
        fb.fact_id::integer as fact_id,
        fb.project_id::integer as project_id,
        fb.division_id,
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
        fb.activity,
        -- Category fields from core_unit_cost_category
        uc.parent_id::integer AS parent_category_id,
        uc.category_name AS category_name
      FROM landscape.core_fin_fact_budget fb
      LEFT JOIN landscape.core_unit_cost_category uc ON fb.category_id = uc.category_id
      WHERE fb.project_id = ${projectId}
      ORDER BY fb.division_id NULLS LAST, fb.fact_id
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

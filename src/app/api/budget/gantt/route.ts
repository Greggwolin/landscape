/**
 * GET /api/budget/gantt
 *
 * Fetches budget items formatted for Gantt chart display.
 * Query params: projectId, scope, level, entityId
 *
 * Response includes phase measurements (units, acres, front_feet) aggregated
 * from parcel data for auto-populating Qty based on UOM selection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getPhaseMeasurements } from '@/lib/budget/phaseMeasurements';

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
        fb.start_period,
        fb.periods_to_complete,
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

    // Fetch phase measurements (units, acres, front_feet) aggregated from parcels
    const phaseMeasurements = await getPhaseMeasurements(Number(projectId));

    // Enrich budget items with phase measurements for UOM auto-population
    const enrichedItems = result.map((item: any) => {
      const measurements = item.division_id
        ? phaseMeasurements.get(Number(item.division_id))
        : null;
      return {
        ...item,
        phase_units: measurements?.total_units ?? null,
        phase_acres: measurements?.total_acres ?? null,
        phase_front_feet: measurements?.total_front_feet ?? null,
      };
    });

    // Check if any items have front feet data (for conditional column visibility)
    const hasFrontFeet = enrichedItems.some(
      (item: any) => item.phase_front_feet && item.phase_front_feet > 0
    );

    return NextResponse.json({
      items: enrichedItems,
      hasFrontFeet,
    });
  } catch (error) {
    console.error('Error fetching budget gantt data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

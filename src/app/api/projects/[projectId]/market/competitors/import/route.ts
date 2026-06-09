import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireProjectAccess } from '@/lib/api/requireAuth';
type Params = { params: Promise<{ projectId: string }> };

/**
 * POST /api/projects/[projectId]/market/competitors/import
 *
 * Import a single Zonda new-home project (by source_project_id) as a
 * competitive project for this project. Used by the "Add Competitor" modal
 * when a user picks a specific project from the Zonda search dropdown.
 *
 * Body params:
 *   - source_project_id: string (required)
 *
 * Mirrors the create branch of sync-radius for a single record. Idempotent:
 * if the project was already imported, returns the existing competitor with
 * action 'skipped' instead of creating a duplicate.
 */
export async function POST(req: NextRequest, context: Params) {
  const { projectId: __projectIdParam } = await context.params;
  const __auth = await requireProjectAccess(req, __projectIdParam);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const sourceProjectId: string | undefined =
      body.source_project_id ?? body.sourceProjectId;

    if (!sourceProjectId) {
      return NextResponse.json(
        { error: 'source_project_id is required' },
        { status: 400 }
      );
    }

    // Look up the Zonda source record
    const zondaRows = await sql`
      SELECT
        record_id,
        source_project_id,
        project_name,
        master_plan_name,
        builder_name,
        address,
        latitude,
        longitude,
        city,
        zip_code,
        units_planned,
        units_remaining,
        price_min,
        price_max,
        sales_rate_monthly,
        status,
        effective_date::text,
        product_type,
        unit_size_min_sf,
        unit_size_max_sf,
        price_per_sf_avg,
        lot_width_ft,
        lot_dimensions
      FROM landscape.mkt_new_home_project
      WHERE source_project_id = ${sourceProjectId}
      LIMIT 1
    `;

    if (zondaRows.length === 0) {
      return NextResponse.json(
        { error: 'Zonda project not found for the given source_project_id' },
        { status: 404 }
      );
    }

    const zp = zondaRows[0];

    // Idempotency: skip if already imported for this project
    const existing = await sql`
      SELECT id
      FROM landscape.market_competitive_projects
      WHERE project_id = ${projectId}::integer
        AND data_source = 'zonda'
        AND source_project_id = ${sourceProjectId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        action: 'skipped',
        id: existing[0].id,
        comp_name: zp.project_name,
        source_project_id: sourceProjectId,
      });
    }

    // Create the competitor
    const rows = await sql`
      INSERT INTO landscape.market_competitive_projects (
        project_id, comp_name, master_plan_name, builder_name,
        comp_address, latitude, longitude, city, zip_code,
        total_units, price_min, price_max, absorption_rate_monthly,
        status, data_source, source_project_id, effective_date
      ) VALUES (
        ${projectId}::integer,
        ${zp.project_name},
        ${zp.master_plan_name},
        ${zp.builder_name},
        ${zp.address},
        ${zp.latitude},
        ${zp.longitude},
        ${zp.city},
        ${zp.zip_code},
        ${zp.units_planned},
        ${zp.price_min},
        ${zp.price_max},
        ${zp.sales_rate_monthly},
        ${zp.status || 'selling'},
        'zonda',
        ${sourceProjectId},
        ${zp.effective_date}::date
      )
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create competitor' },
        { status: 500 }
      );
    }

    const competitorId = rows[0].id;

    // Create a product entry if we have product data
    if (zp.product_type || zp.unit_size_min_sf || zp.price_per_sf_avg || zp.lot_width_ft) {
      await sql`
        INSERT INTO landscape.market_competitive_project_products (
          competitive_project_id, lot_width_ft, lot_dimensions,
          unit_size_min_sf, unit_size_max_sf,
          price_min, price_max, price_per_sf_avg, sales_rate_monthly, units_remaining
        ) VALUES (
          ${competitorId},
          ${zp.lot_width_ft},
          ${zp.lot_dimensions},
          ${zp.unit_size_min_sf},
          ${zp.unit_size_max_sf},
          ${zp.price_min},
          ${zp.price_max},
          ${zp.price_per_sf_avg},
          ${zp.sales_rate_monthly},
          ${zp.units_remaining}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      id: competitorId,
      comp_name: zp.project_name,
      source_project_id: sourceProjectId,
    });
  } catch (error) {
    console.error('market/competitors/import POST error', error);
    return NextResponse.json(
      { error: 'Failed to import Zonda project' },
      { status: 500 }
    );
  }
}

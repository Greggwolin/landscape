import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string; competitorId: string }> };

type CompetitorRow = {
  id: number;
  project_id: number;
  master_plan_name: string | null;
  comp_name: string;
  builder_name: string | null;
  comp_address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  zip_code: string | null;
  total_units: number | null;
  price_min: number | null;
  price_max: number | null;
  absorption_rate_monthly: number | null;
  status: string | null;
  data_source: string | null;
  source_url: string | null;
  notes: string | null;
  source_project_id: string | null;
  effective_date: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * GET /api/projects/[projectId]/market/competitors/[competitorId]
 *
 * Get a single competitor with its products
 */
export async function GET(_req: NextRequest, context: Params) {
  try {
    const { projectId, competitorId } = await context.params;
    if (!projectId || !competitorId) {
      return NextResponse.json({ error: 'project id and competitor id required' }, { status: 400 });
    }

    const competitors = await sql<CompetitorRow>`
      SELECT
        id, project_id, master_plan_name, comp_name, builder_name,
        comp_address, latitude, longitude, city, zip_code,
        total_units, price_min, price_max, absorption_rate_monthly,
        status, data_source, source_url, notes, source_project_id,
        effective_date::text, created_at::text, updated_at::text
      FROM landscape.market_competitive_projects
      WHERE id = ${competitorId}::integer
        AND project_id = ${projectId}::integer
    `;

    if (competitors.length === 0) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Get products for this competitor
    const products = await sql`
      SELECT
        id,
        competitive_project_id,
        product_id,
        lot_width_ft,
        lot_dimensions,
        lot_width_ft AS "lotWidthFt",
        lot_dimensions AS "lotDimensions",
        unit_size_min_sf,
        unit_size_max_sf,
        unit_size_avg_sf,
        price_min,
        price_max,
        price_avg,
        price_per_sf_avg,
        units_planned,
        units_sold,
        units_remaining,
        qmi_count,
        sales_rate_monthly,
        sales_rate_3m_avg,
        sales_rate_6m_avg,
        mos_vdl,
        mos_inventory,
        created_at::text,
        updated_at::text
      FROM landscape.market_competitive_project_products
      WHERE competitive_project_id = ${competitorId}::integer
      ORDER BY lot_width_ft
    `;

    return NextResponse.json({
      ...competitors[0],
      products
    });
  } catch (error) {
    console.error('market/competitors/[id] GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[projectId]/market/competitors/[competitorId]
 *
 * Update a competitor
 */
export async function PATCH(req: NextRequest, context: Params) {
  try {
    const { projectId, competitorId } = await context.params;
    if (!projectId || !competitorId) {
      return NextResponse.json({ error: 'project id and competitor id required' }, { status: 400 });
    }

    const updates = await req.json();

    const allowedFields = [
      'comp_name', 'master_plan_name', 'builder_name', 'comp_address',
      'latitude', 'longitude', 'city', 'zip_code', 'total_units',
      'price_min', 'price_max', 'absorption_rate_monthly', 'status',
      'notes', 'source_url'
    ];

    const validUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        validUpdates[key] = value;
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Build dynamic UPDATE query
    const setParts: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(validUpdates)) {
      setParts.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    setParts.push('updated_at = NOW()');
    values.push(competitorId);
    values.push(projectId);

    const queryText = `
      UPDATE landscape.market_competitive_projects
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}::integer
        AND project_id = $${paramIndex + 1}::integer
      RETURNING
        id, project_id, master_plan_name, comp_name, builder_name,
        comp_address, latitude, longitude, city, zip_code,
        total_units, price_min, price_max, absorption_rate_monthly,
        status, data_source, source_url, notes, source_project_id,
        effective_date::text, created_at::text, updated_at::text
    `;

    const rows = await sql.query(queryText, values);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('market/competitors/[id] PATCH error', error);
    return NextResponse.json(
      { error: 'Failed to update competitor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/market/competitors/[competitorId]
 *
 * Delete a competitor (cascades to products)
 */
export async function DELETE(_req: NextRequest, context: Params) {
  try {
    const { projectId, competitorId } = await context.params;
    if (!projectId || !competitorId) {
      return NextResponse.json({ error: 'project id and competitor id required' }, { status: 400 });
    }

    const rows = await sql`
      DELETE FROM landscape.market_competitive_projects
      WHERE id = ${competitorId}::integer
        AND project_id = ${projectId}::integer
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_id: rows[0].id });
  } catch (error) {
    console.error('market/competitors/[id] DELETE error', error);
    return NextResponse.json(
      { error: 'Failed to delete competitor' },
      { status: 500 }
    );
  }
}

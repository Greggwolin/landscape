import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

// Types for database rows
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

type ProductRow = {
  id: number;
  competitive_project_id: number;
  product_id: number | null;
  lot_width_ft: number | null;
  lotWidthFt?: number | null;
  lot_dimensions: string | null;
  lotDimensions?: string | null;
  unit_size_min_sf: number | null;
  unit_size_max_sf: number | null;
  unit_size_avg_sf: number | null;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  price_per_sf_avg: number | null;
  units_planned: number | null;
  units_sold: number | null;
  units_remaining: number | null;
  sales_rate_monthly: number | null;
  sales_rate_3m_avg: number | null;
  sales_rate_6m_avg: number | null;
  qmi_count: number | null;
  mos_vdl: number | null;
  mos_inventory: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * GET /api/projects/[projectId]/market/competitors
 *
 * List all competitive projects for the given project
 */
export async function GET(_req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    // Get all competitors for this project
    const competitors = await sql<CompetitorRow>`
      SELECT
        id, project_id, master_plan_name, comp_name, builder_name,
        comp_address, latitude, longitude, city, zip_code,
        total_units, price_min, price_max, absorption_rate_monthly,
        status, data_source, source_url, notes, source_project_id,
        effective_date::text, created_at::text, updated_at::text
      FROM landscape.market_competitive_projects
      WHERE project_id = ${projectId}::integer
      ORDER BY comp_name
    `;

    // Get products for all competitors in one query
    const competitorIds = competitors.map(c => c.id);
    let products: ProductRow[] = [];

    if (competitorIds.length > 0) {
      products = await sql<ProductRow>`
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
        WHERE competitive_project_id = ANY(${competitorIds}::integer[])
        ORDER BY lot_width_ft
      `;
    }

    // Group products by competitive_project_id
    const productsByCompetitor: Record<number, ProductRow[]> = {};
    for (const product of products) {
      if (!productsByCompetitor[product.competitive_project_id]) {
        productsByCompetitor[product.competitive_project_id] = [];
      }
      productsByCompetitor[product.competitive_project_id].push(product);
    }

    // Build response with products nested
    const result = competitors.map(comp => ({
      ...comp,
      products: productsByCompetitor[comp.id] || []
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('market/competitors GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/market/competitors
 *
 * Create a new competitor manually
 */
export async function POST(req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      comp_name,
      master_plan_name,
      builder_name,
      comp_address,
      latitude,
      longitude,
      city,
      zip_code,
      total_units,
      price_min,
      price_max,
      absorption_rate_monthly,
      status,
      notes,
      source_url
    } = body;

    if (!comp_name) {
      return NextResponse.json(
        { error: 'comp_name is required' },
        { status: 400 }
      );
    }

    const rows = await sql<CompetitorRow>`
      INSERT INTO landscape.market_competitive_projects (
        project_id, comp_name, master_plan_name, builder_name,
        comp_address, latitude, longitude, city, zip_code,
        total_units, price_min, price_max, absorption_rate_monthly,
        status, notes, source_url, data_source
      ) VALUES (
        ${projectId}::integer,
        ${comp_name},
        ${master_plan_name || null},
        ${builder_name || null},
        ${comp_address || null},
        ${latitude || null},
        ${longitude || null},
        ${city || null},
        ${zip_code || null},
        ${total_units || null},
        ${price_min || null},
        ${price_max || null},
        ${absorption_rate_monthly || null},
        ${status || 'selling'},
        ${notes || null},
        ${source_url || null},
        'manual'
      )
      RETURNING
        id, project_id, master_plan_name, comp_name, builder_name,
        comp_address, latitude, longitude, city, zip_code,
        total_units, price_min, price_max, absorption_rate_monthly,
        status, data_source, source_url, notes, source_project_id,
        effective_date::text, created_at::text, updated_at::text
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('market/competitors POST error', error);
    return NextResponse.json(
      { error: 'Failed to create competitor' },
      { status: 500 }
    );
  }
}

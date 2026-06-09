import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

import { requireProjectAccess } from '@/lib/api/requireAuth';
type Params = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/[projectId]/market/competitors/search
 *
 * Text search across Zonda new-home projects (landscape.mkt_new_home_project)
 * by project name, builder, or master plan. Used by the "Add Competitor"
 * modal's Zonda search box.
 *
 * Query params:
 *   - q: string  search term (min 2 chars)
 *   - limit: number (default 20, max 50)
 *
 * Returns: { count, results: ZondaProject[] } — same row shape as
 * the radius "nearby" endpoint so the frontend can share a single type.
 */
export async function GET(req: NextRequest, context: Params) {
  const { projectId: __projectIdParam } = await context.params;
  const __auth = await requireProjectAccess(req, __projectIdParam);
  if (__auth instanceof NextResponse) return __auth;

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);

    if (q.length < 2) {
      return NextResponse.json({ count: 0, results: [] });
    }

    const pattern = `%${q}%`;

    const results = await sql`
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
      WHERE project_name ILIKE ${pattern}
        OR builder_name ILIKE ${pattern}
        OR master_plan_name ILIKE ${pattern}
      ORDER BY project_name
      LIMIT ${limit}
    `;

    return NextResponse.json({ count: results.length, results });
  } catch (error) {
    console.error('market/competitors/search GET error', error);
    return NextResponse.json(
      { error: 'Failed to search Zonda projects' },
      { status: 500 }
    );
  }
}

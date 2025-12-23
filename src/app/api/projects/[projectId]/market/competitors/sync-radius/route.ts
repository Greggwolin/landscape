import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Params = { params: Promise<{ projectId: string }> };

/**
 * Haversine formula to calculate distance between two points in miles
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type ZondaProject = {
  record_id: number;
  source_project_id: string;
  project_name: string;
  master_plan_name: string | null;
  builder_name: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  zip_code: string | null;
  units_planned: number | null;
  units_remaining: number | null;
  price_min: number | null;
  price_max: number | null;
  sales_rate_monthly: number | null;
  status: string | null;
  effective_date: string | null;
  product_type: string | null;
  unit_size_min_sf: number | null;
  unit_size_max_sf: number | null;
  price_per_sf_avg: number | null;
  lot_width_ft: number | null;
  lot_dimensions: string | null;
};

type ProjectRow = {
  project_id: number;
  location_lat: number | null;
  location_lon: number | null;
};

type ExclusionRow = {
  source_project_id: string;
};

type CompetitorResult = {
  id: number;
  comp_name: string;
  source_project_id: string;
  action: 'created' | 'updated' | 'skipped';
};

/**
 * POST /api/projects/[projectId]/market/competitors/sync-radius
 *
 * Auto-populate competitors from Zonda data within a radius of the project
 *
 * Body params:
 *   - radius_miles: number (default: 5)
 *   - update_existing: boolean (default: false) - whether to update existing Zonda-sourced competitors
 */
export async function POST(req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const radiusMiles = body.radius_miles || 5;
    const updateExisting = body.update_existing || false;

    // Get project location
    const projects = await sql<ProjectRow>`
      SELECT project_id, location_lat, location_lon
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}::integer
    `;

    if (projects.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projects[0];
    if (!project.location_lat || !project.location_lon) {
      return NextResponse.json(
        { error: 'Project does not have location coordinates set' },
        { status: 400 }
      );
    }

    const projectLat = Number(project.location_lat);
    const projectLon = Number(project.location_lon);

    // Get excluded source_project_ids
    const exclusions = await sql<ExclusionRow>`
      SELECT source_project_id
      FROM landscape.market_competitive_project_exclusions
      WHERE project_id = ${projectId}::integer
    `;
    const excludedIds = new Set(exclusions.map(e => e.source_project_id));

    // Calculate bounding box for initial filter (rough approximation)
    // 1 degree latitude ~ 69 miles, 1 degree longitude varies but ~55 miles at 33deg lat
    const latDelta = radiusMiles / 69;
    const lonDelta = radiusMiles / 55;

    // Get Zonda projects within bounding box
    const zondaProjects = await sql<ZondaProject>`
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
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude BETWEEN ${projectLat - latDelta} AND ${projectLat + latDelta}
        AND longitude BETWEEN ${projectLon - lonDelta} AND ${projectLon + lonDelta}
      ORDER BY project_name
    `;

    // Filter by actual distance and exclusions
    const nearbyProjects = zondaProjects.filter(zp => {
      if (excludedIds.has(zp.source_project_id)) return false;
      const distance = haversineDistance(
        projectLat,
        projectLon,
        Number(zp.latitude),
        Number(zp.longitude)
      );
      return distance <= radiusMiles;
    });

    // Get existing Zonda-sourced competitors for this project
    const existingCompetitors = await sql<{ id: number; source_project_id: string }>`
      SELECT id, source_project_id
      FROM landscape.market_competitive_projects
      WHERE project_id = ${projectId}::integer
        AND data_source = 'zonda'
        AND source_project_id IS NOT NULL
    `;
    const existingBySourceId = new Map(
      existingCompetitors.map(c => [c.source_project_id, c.id])
    );

    const results: CompetitorResult[] = [];

    for (const zp of nearbyProjects) {
      const existingId = existingBySourceId.get(zp.source_project_id);

      if (existingId && !updateExisting) {
        results.push({
          id: existingId,
          comp_name: zp.project_name,
          source_project_id: zp.source_project_id,
          action: 'skipped'
        });
        continue;
      }

      if (existingId && updateExisting) {
        // Update existing competitor
        await sql`
          UPDATE landscape.market_competitive_projects
          SET
            comp_name = ${zp.project_name},
            master_plan_name = ${zp.master_plan_name},
            builder_name = ${zp.builder_name},
            comp_address = ${zp.address},
            latitude = ${zp.latitude},
            longitude = ${zp.longitude},
            city = ${zp.city},
            zip_code = ${zp.zip_code},
            total_units = ${zp.units_planned},
            price_min = ${zp.price_min},
            price_max = ${zp.price_max},
            absorption_rate_monthly = ${zp.sales_rate_monthly},
            status = ${zp.status || 'selling'},
            effective_date = ${zp.effective_date}::date,
            updated_at = NOW()
          WHERE id = ${existingId}::integer
        `;

        results.push({
          id: existingId,
          comp_name: zp.project_name,
          source_project_id: zp.source_project_id,
          action: 'updated'
        });
      } else {
        // Create new competitor
        const rows = await sql<{ id: number }>`
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
            ${zp.source_project_id},
            ${zp.effective_date}::date
          )
          RETURNING id
        `;

        if (rows.length > 0) {
          results.push({
            id: rows[0].id,
            comp_name: zp.project_name,
            source_project_id: zp.source_project_id,
            action: 'created'
          });

          // Also create a product entry for this competitor if we have product data
          if (zp.product_type || zp.unit_size_min_sf || zp.price_per_sf_avg || zp.lot_width_ft) {
            await sql`
              INSERT INTO landscape.market_competitive_project_products (
                competitive_project_id, lot_width_ft, lot_dimensions,
                unit_size_min_sf, unit_size_max_sf,
                price_min, price_max, price_per_sf_avg, sales_rate_monthly, units_remaining
              ) VALUES (
                ${rows[0].id},
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
        }
      }
    }

    const created = results.filter(r => r.action === 'created').length;
    const updated = results.filter(r => r.action === 'updated').length;
    const skipped = results.filter(r => r.action === 'skipped').length;

    return NextResponse.json({
      success: true,
      imported_count: created,
      radius_miles: radiusMiles,
      summary: {
        total_found: nearbyProjects.length,
        created,
        updated,
        skipped,
        excluded: zondaProjects.length - nearbyProjects.length
      },
      competitors: results
    });
  } catch (error) {
    console.error('market/competitors/sync-radius POST error', error);
    return NextResponse.json(
      { error: 'Failed to sync competitors from Zonda' },
      { status: 500 }
    );
  }
}

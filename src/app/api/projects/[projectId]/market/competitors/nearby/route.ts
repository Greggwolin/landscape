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
  price_min: number | null;
  price_max: number | null;
  sales_rate_monthly: number | null;
  status: string | null;
  effective_date: string | null;
  product_type: string | null;
};

type ProjectRow = {
  project_id: number;
  location_lat: number | null;
  location_lon: number | null;
};

type ExclusionRow = {
  source_project_id: string;
};

type ExistingCompetitor = {
  source_project_id: string;
};

/**
 * GET /api/projects/[projectId]/market/competitors/nearby
 *
 * List available Zonda projects near the project that haven't been imported yet
 *
 * Query params:
 *   - radius_miles: number (default: 5)
 *   - include_imported: boolean (default: false) - include already imported projects
 */
export async function GET(req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json({ error: 'project id required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const radiusMiles = parseFloat(searchParams.get('radius_miles') || '5');
    const includeImported = searchParams.get('include_imported') === 'true';

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

    // Get already imported source_project_ids
    const existingCompetitors = await sql<ExistingCompetitor>`
      SELECT source_project_id
      FROM landscape.market_competitive_projects
      WHERE project_id = ${projectId}::integer
        AND data_source = 'zonda'
        AND source_project_id IS NOT NULL
    `;
    const importedIds = new Set(existingCompetitors.map(c => c.source_project_id));

    // Calculate bounding box
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
        price_min,
        price_max,
        sales_rate_monthly,
        status,
        effective_date::text,
        product_type
      FROM landscape.mkt_new_home_project
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude BETWEEN ${projectLat - latDelta} AND ${projectLat + latDelta}
        AND longitude BETWEEN ${projectLon - lonDelta} AND ${projectLon + lonDelta}
      ORDER BY project_name
    `;

    // Filter by actual distance and calculate distance for each
    const nearbyProjects = zondaProjects
      .map(zp => {
        const distance = haversineDistance(
          projectLat,
          projectLon,
          Number(zp.latitude),
          Number(zp.longitude)
        );
        return {
          ...zp,
          distance_miles: Math.round(distance * 100) / 100,
          is_excluded: excludedIds.has(zp.source_project_id),
          is_imported: importedIds.has(zp.source_project_id)
        };
      })
      .filter(zp => {
        if (zp.distance_miles > radiusMiles) return false;
        if (zp.is_excluded) return false;
        if (!includeImported && zp.is_imported) return false;
        return true;
      })
      .sort((a, b) => a.distance_miles - b.distance_miles);

    return NextResponse.json({
      count: nearbyProjects.length,
      radius_miles: radiusMiles,
      subject_lat: projectLat,
      subject_lon: projectLon,
      results: nearbyProjects
    });
  } catch (error) {
    console.error('market/competitors/nearby GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby Zonda projects' },
      { status: 500 }
    );
  }
}

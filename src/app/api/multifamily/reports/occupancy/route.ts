import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 */
function convertBigIntFields(row: any) {
  return {
    ...row,
    project_id: Number(row.project_id),
    total_units: Number(row.total_units),
    occupied_units: Number(row.occupied_units),
    vacant_units: Number(row.vacant_units),
    renovated_units: Number(row.renovated_units),
    renewal_leases: Number(row.renewal_leases),
  };
}

/**
 * GET /api/multifamily/reports/occupancy
 * Query vw_multifamily_occupancy_summary filtered by project_id (required)
 * Returns occupancy data grouped by unit type plus project-level totals
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Get occupancy by unit type
    const byUnitTypeQuery = `
      SELECT
        project_id,
        project_name,
        unit_type,
        total_units,
        occupied_units,
        vacant_units,
        physical_occupancy_pct,
        total_market_rent,
        total_actual_rent,
        economic_occupancy_pct,
        total_loss_to_lease,
        avg_market_rent,
        avg_actual_rent,
        renovated_units,
        renewal_leases,
        renewal_rate_pct
      FROM landscape.vw_multifamily_occupancy_summary
      WHERE project_id = $1
      ORDER BY unit_type
    `;

    const byUnitTypeResult = await client.query(byUnitTypeQuery, [projectId]);
    const byUnitType = byUnitTypeResult.rows.map(convertBigIntFields);

    // Calculate project totals
    const projectTotals = {
      project_id: Number(projectId),
      project_name: byUnitType[0]?.project_name || null,
      total_units: byUnitType.reduce((sum, row) => sum + Number(row.total_units), 0),
      occupied_units: byUnitType.reduce((sum, row) => sum + Number(row.occupied_units), 0),
      vacant_units: byUnitType.reduce((sum, row) => sum + Number(row.vacant_units), 0),
      total_market_rent: byUnitType.reduce((sum, row) => sum + Number(row.total_market_rent || 0), 0),
      total_actual_rent: byUnitType.reduce((sum, row) => sum + Number(row.total_actual_rent || 0), 0),
      total_loss_to_lease: byUnitType.reduce((sum, row) => sum + Number(row.total_loss_to_lease || 0), 0),
      renovated_units: byUnitType.reduce((sum, row) => sum + Number(row.renovated_units), 0),
      renewal_leases: byUnitType.reduce((sum, row) => sum + Number(row.renewal_leases), 0),
    };

    // Calculate weighted averages for project level
    if (projectTotals.total_units > 0) {
      projectTotals.physical_occupancy_pct = Number(
        ((projectTotals.occupied_units / projectTotals.total_units) * 100).toFixed(2)
      );
    } else {
      projectTotals.physical_occupancy_pct = 0;
    }

    if (projectTotals.total_market_rent > 0) {
      projectTotals.economic_occupancy_pct = Number(
        ((projectTotals.total_actual_rent / projectTotals.total_market_rent) * 100).toFixed(2)
      );
    } else {
      projectTotals.economic_occupancy_pct = 0;
    }

    if (projectTotals.occupied_units > 0) {
      projectTotals.renewal_rate_pct = Number(
        ((projectTotals.renewal_leases / projectTotals.occupied_units) * 100).toFixed(2)
      );
    } else {
      projectTotals.renewal_rate_pct = 0;
    }

    if (byUnitType.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No occupancy data found for this project' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        by_unit_type: byUnitType,
        project_totals: projectTotals,
      },
    });
  } catch (error) {
    console.error('Error fetching occupancy report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch occupancy report' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

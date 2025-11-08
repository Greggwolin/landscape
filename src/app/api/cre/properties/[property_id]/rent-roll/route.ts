import { NextResponse } from 'next/server';
import { Pool } from 'pg';

type Params = { params: Promise<{ property_id: string }> };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  context: Params
) {
  try {
    const propertyId = parseInt((await context.params).property_id);

    if (isNaN(propertyId)) {
      return NextResponse.json(
        { error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    // Query to get rent roll with joined data
    const rentRollQuery = `
      SELECT
        s.space_id,
        s.space_number as suite_number,
        t.tenant_name,
        s.rentable_sf,
        COALESCE(l.lease_status, 'Vacant') as lease_status,
        l.lease_commencement_date as lease_start_date,
        l.lease_expiration_date as lease_end_date,
        COALESCE(b.base_rent_annual / 12, 0) as monthly_base_rent,
        COALESCE(b.base_rent_psf_annual, 0) as rent_psf_annual,
        CASE
          WHEN l.lease_status = 'Active' THEN 'Occupied'
          WHEN s.space_status = 'Available' THEN 'Vacant'
          ELSE 'Occupied'
        END as occupancy_status,
        COALESCE(l.lease_type, NULL) as lease_type,
        false as has_percentage_rent,
        COALESCE(l.lease_type, NULL) as recovery_structure
      FROM landscape.tbl_cre_space s
      LEFT JOIN landscape.tbl_cre_lease l ON s.space_id = l.space_id AND l.cre_property_id = $1
      LEFT JOIN landscape.tbl_cre_tenant t ON l.tenant_id = t.tenant_id
      LEFT JOIN landscape.tbl_cre_base_rent b ON l.lease_id = b.lease_id
      WHERE s.cre_property_id = $1
      ORDER BY s.rentable_sf DESC
    `;

    const result = await pool.query(rentRollQuery, [propertyId]);
    const spaces = result.rows;

    // Calculate summary stats
    const total_spaces = spaces.length;
    const occupied_spaces = spaces.filter(s => s.occupancy_status === 'Occupied').length;
    const vacant_spaces = total_spaces - occupied_spaces;

    const total_sf = spaces.reduce((sum, s) => sum + parseFloat(s.rentable_sf || 0), 0);
    const occupied_sf = spaces
      .filter(s => s.occupancy_status === 'Occupied')
      .reduce((sum, s) => sum + parseFloat(s.rentable_sf || 0), 0);

    const occupancy_pct = total_sf > 0 ? (occupied_sf / total_sf) * 100 : 0;

    const total_monthly_rent = spaces.reduce((sum, s) => sum + parseFloat(s.monthly_base_rent || 0), 0);
    const avg_rent_psf = occupied_sf > 0 ? (total_monthly_rent * 12) / occupied_sf : 0;

    // Count expiring within 12 months
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const expiring_within_12mo = spaces.filter(s => {
      if (!s.lease_end_date) return false;
      const expDate = new Date(s.lease_end_date);
      return expDate <= oneYearFromNow && expDate >= new Date();
    }).length;

    const summary = {
      total_spaces,
      occupied_spaces,
      vacant_spaces,
      total_sf,
      occupied_sf,
      occupancy_pct: Math.round(occupancy_pct * 10) / 10,
      total_monthly_rent,
      avg_rent_psf: Math.round(avg_rent_psf * 100) / 100,
      expiring_within_12mo,
    };

    return NextResponse.json({
      spaces,
      summary,
    });
  } catch (error) {
    console.error('Error fetching rent roll:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rent roll data' },
      { status: 500 }
    );
  }
}

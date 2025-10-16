import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 */
function convertBigIntFields(lease: any) {
  return {
    ...lease,
    lease_id: Number(lease.lease_id),
    unit_id: Number(lease.unit_id),
  };
}

/**
 * GET /api/multifamily/leases
 * List leases filtered by project_id or unit_id, optional status filter
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const unitId = searchParams.get('unit_id');
    const status = searchParams.get('status');

    if (!projectId && !unitId) {
      return NextResponse.json(
        { success: false, error: 'Either project_id or unit_id is required' },
        { status: 400 }
      );
    }

    let query = `
      SELECT
        l.lease_id,
        l.unit_id,
        l.resident_name,
        l.lease_start_date,
        l.lease_end_date,
        l.lease_term_months,
        l.base_rent_monthly,
        l.effective_rent_monthly,
        l.months_free_rent,
        l.concession_amount,
        l.security_deposit,
        l.pet_rent_monthly,
        l.parking_rent_monthly,
        l.lease_status,
        l.notice_date,
        l.notice_to_vacate_days,
        l.is_renewal,
        l.created_at,
        l.updated_at,
        u.unit_number,
        u.building_name,
        u.unit_type,
        u.square_feet,
        u.bedrooms,
        u.bathrooms,
        u.market_rent,
        u.other_features,
        u.project_id
      FROM landscape.tbl_multifamily_lease l
      JOIN landscape.tbl_multifamily_unit u ON l.unit_id = u.unit_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (projectId) {
      paramCount++;
      query += ` AND u.project_id = $${paramCount}`;
      params.push(projectId);
    }

    if (unitId) {
      paramCount++;
      query += ` AND l.unit_id = $${paramCount}`;
      params.push(unitId);
    }

    if (status) {
      paramCount++;
      query += ` AND l.lease_status = $${paramCount}`;
      params.push(status);
    }

    query += ' ORDER BY l.lease_start_date DESC';

    const result = await client.query(query, params);
    const leases = result.rows.map((row) => ({
      ...convertBigIntFields(row),
      project_id: Number(row.project_id),
    }));

    return NextResponse.json({
      success: true,
      data: leases,
      count: leases.length,
    });
  } catch (error) {
    console.error('Error fetching multifamily leases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leases' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * POST /api/multifamily/leases
 * Create new lease with automatic effective rent calculation
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      unit_id,
      resident_name,
      lease_start_date,
      lease_end_date,
      lease_term_months,
      base_rent_monthly,
      months_free_rent = 0,
      concession_amount = 0,
      security_deposit = 0,
      pet_rent_monthly = 0,
      parking_rent_monthly = 0,
      lease_status = 'ACTIVE',
      is_renewal = false,
    } = body;

    // Validate required fields (allow 0 for base_rent_monthly)
    if (!unit_id || !lease_start_date || !lease_end_date || !lease_term_months || base_rent_monthly === undefined || base_rent_monthly === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: unit_id, lease_start_date, lease_end_date, lease_term_months, base_rent_monthly',
        },
        { status: 400 }
      );
    }

    // Calculate effective rent: (base_rent * lease_term - concessions - (free_months * base_rent)) / lease_term
    const totalRent = base_rent_monthly * lease_term_months;
    const freeRentAmount = months_free_rent * base_rent_monthly;
    const totalDeductions = concession_amount + freeRentAmount;
    const effective_rent_monthly = (totalRent - totalDeductions) / lease_term_months;

    const query = `
      INSERT INTO landscape.tbl_multifamily_lease (
        unit_id,
        resident_name,
        lease_start_date,
        lease_end_date,
        lease_term_months,
        base_rent_monthly,
        effective_rent_monthly,
        months_free_rent,
        concession_amount,
        security_deposit,
        pet_rent_monthly,
        parking_rent_monthly,
        lease_status,
        is_renewal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const params = [
      unit_id,
      resident_name,
      lease_start_date,
      lease_end_date,
      lease_term_months,
      base_rent_monthly,
      effective_rent_monthly,
      months_free_rent,
      concession_amount,
      security_deposit,
      pet_rent_monthly,
      parking_rent_monthly,
      lease_status,
      is_renewal,
    ];

    const result = await client.query(query, params);
    const lease = convertBigIntFields(result.rows[0]);

    return NextResponse.json({
      success: true,
      data: lease,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating multifamily lease:', error);

    // Handle foreign key constraint violation
    if (error.code === '23503') {
      return NextResponse.json(
        { success: false, error: 'Invalid unit_id: unit does not exist' },
        { status: 404 }
      );
    }

    // Handle check constraint violation
    if (error.code === '23514') {
      return NextResponse.json(
        { success: false, error: 'Invalid lease data: check constraint violation' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create lease' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

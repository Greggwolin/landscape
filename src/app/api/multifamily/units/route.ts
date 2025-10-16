import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 */
function convertBigIntFields(unit: any) {
  return {
    ...unit,
    unit_id: Number(unit.unit_id),
    project_id: Number(unit.project_id),
  };
}

/**
 * GET /api/multifamily/units
 * List units filtered by project_id (required), status, unit_type
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const unitType = searchParams.get('unit_type');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id is required' },
        { status: 400 }
      );
    }

    let query = `
      SELECT
        unit_id,
        project_id,
        unit_number,
        building_name,
        unit_type,
        bedrooms,
        bathrooms,
        square_feet,
        market_rent,
        renovation_status,
        renovation_date,
        renovation_cost,
        created_at,
        updated_at
      FROM landscape.tbl_multifamily_unit
      WHERE project_id = $1
    `;

    const params: any[] = [projectId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND renovation_status = $${paramCount}`;
      params.push(status);
    }

    if (unitType) {
      paramCount++;
      query += ` AND unit_type = $${paramCount}`;
      params.push(unitType);
    }

    query += ' ORDER BY unit_number ASC';

    const result = await client.query(query, params);
    const units = result.rows.map(convertBigIntFields);

    return NextResponse.json({
      success: true,
      data: units,
      count: units.length,
    });
  } catch (error) {
    console.error('Error fetching multifamily units:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch units' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * POST /api/multifamily/units
 * Create new unit
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      project_id,
      unit_number,
      unit_type,
      square_feet,
      market_rent,
      building_name,
      bedrooms,
      bathrooms,
      renovation_status = 'ORIGINAL',
      renovation_date,
      renovation_cost,
    } = body;

    // Validate required fields
    if (!project_id || !unit_number || !unit_type || !square_feet) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: project_id, unit_number, unit_type, square_feet' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO landscape.tbl_multifamily_unit (
        project_id,
        unit_number,
        building_name,
        unit_type,
        bedrooms,
        bathrooms,
        square_feet,
        market_rent,
        renovation_status,
        renovation_date,
        renovation_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const params = [
      project_id,
      unit_number,
      building_name,
      unit_type,
      bedrooms,
      bathrooms,
      square_feet,
      market_rent,
      renovation_status,
      renovation_date,
      renovation_cost,
    ];

    const result = await client.query(query, params);
    const unit = convertBigIntFields(result.rows[0]);

    return NextResponse.json({
      success: true,
      data: unit,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating multifamily unit:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Unit number already exists for this project' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create unit' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

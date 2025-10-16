import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 * Also convert numeric fields from strings to numbers for AG-Grid compatibility
 */
function convertBigIntFields(unitType: any) {
  return {
    ...unitType,
    unit_type_id: Number(unitType.unit_type_id),
    project_id: Number(unitType.project_id),
    bedrooms: parseFloat(unitType.bedrooms),
    bathrooms: parseFloat(unitType.bathrooms),
    avg_square_feet: parseInt(unitType.avg_square_feet),
    current_market_rent: parseFloat(unitType.current_market_rent),
    total_units: parseInt(unitType.total_units || 0),
    floorplan_doc_id: unitType.floorplan_doc_id ? Number(unitType.floorplan_doc_id) : null,
  }
}

/**
 * GET /api/multifamily/unit-types
 * List unit types filtered by project_id
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect()

  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id is required' },
        { status: 400 }
      )
    }

    const query = `
      SELECT
        unit_type_id,
        project_id,
        unit_type_code,
        bedrooms,
        bathrooms,
        avg_square_feet,
        current_market_rent,
        total_units,
        notes,
        other_features,
        floorplan_doc_id,
        created_at,
        updated_at
      FROM landscape.tbl_multifamily_unit_type
      WHERE project_id = $1
      ORDER BY unit_type_code
    `

    const result = await client.query(query, [projectId])
    const unitTypes = result.rows.map(convertBigIntFields)

    return NextResponse.json({
      success: true,
      data: unitTypes,
      count: unitTypes.length,
    })
  } catch (error: any) {
    console.error('Error fetching unit types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unit types' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

/**
 * POST /api/multifamily/unit-types
 * Create a new unit type
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect()

  try {
    const body = await request.json()
    const {
      project_id,
      unit_type_code,
      bedrooms,
      bathrooms,
      avg_square_feet,
      current_market_rent,
      total_units,
      notes,
      other_features,
    } = body

    if (!project_id || !unit_type_code) {
      return NextResponse.json(
        { success: false, error: 'project_id and unit_type_code are required' },
        { status: 400 }
      )
    }

    const query = `
      INSERT INTO landscape.tbl_multifamily_unit_type (
        project_id,
        unit_type_code,
        bedrooms,
        bathrooms,
        avg_square_feet,
        current_market_rent,
        total_units,
        notes,
        other_features
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const params = [
      project_id,
      unit_type_code,
      bedrooms || 1,
      bathrooms || 1,
      avg_square_feet || 650,
      current_market_rent || 0,
      total_units || 0,
      notes || null,
      other_features || null,
    ]

    const result = await client.query(query, params)
    const unitType = convertBigIntFields(result.rows[0])

    return NextResponse.json(
      {
        success: true,
        data: unitType,
        message: 'Unit type created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating unit type:', error)

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'A unit type with this code already exists for this project' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create unit type' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

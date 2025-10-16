import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

/**
 * Convert BIGINT fields to numbers to prevent Neon string serialization issues
 */
function convertBigIntFields(unitType: any) {
  return {
    ...unitType,
    unit_type_id: Number(unitType.unit_type_id),
    project_id: Number(unitType.project_id),
    floorplan_doc_id: unitType.floorplan_doc_id ? Number(unitType.floorplan_doc_id) : null,
  }
}

/**
 * PATCH /api/multifamily/unit-types/[id]
 * Update a unit type
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect()

  try {
    const { id } = await params
    const unitTypeId = parseInt(id, 10)
    const body = await request.json()

    // Build dynamic UPDATE query
    const allowedFields = [
      'unit_type_code',
      'bedrooms',
      'bathrooms',
      'avg_square_feet',
      'current_market_rent',
      'total_units',
      'notes',
      'other_features',
      'floorplan_doc_id',
    ]

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`)
        values.push(body[key])
        paramCount++
      }
    })

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    values.push(unitTypeId)

    const query = `
      UPDATE landscape.tbl_multifamily_unit_type
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE unit_type_id = $${paramCount}
      RETURNING *
    `

    const result = await client.query(query, values)

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Unit type not found' },
        { status: 404 }
      )
    }

    const unitType = convertBigIntFields(result.rows[0])

    return NextResponse.json({
      success: true,
      data: unitType,
      message: 'Unit type updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating unit type:', error)

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'A unit type with this code already exists for this project' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update unit type' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/multifamily/unit-types/[id]
 * Delete a unit type
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect()

  try {
    const { id } = await params
    const unitTypeId = parseInt(id, 10)

    const query = `
      DELETE FROM landscape.tbl_multifamily_unit_type
      WHERE unit_type_id = $1
      RETURNING unit_type_id
    `

    const result = await client.query(query, [unitTypeId])

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Unit type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Unit type deleted successfully',
      data: { unit_type_id: unitTypeId },
    })
  } catch (error: any) {
    console.error('Error deleting unit type:', error)

    // Handle foreign key constraint violation
    if (error.code === '23503') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete unit type: it is being used by existing units',
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete unit type' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

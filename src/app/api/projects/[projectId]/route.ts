// /app/api/projects/[projectId]/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = { params: Promise<{ projectId: string }> }

export async function PATCH(req: Request, context: Params) {
  try {
    const { projectId } = await context.params
    if (!projectId) return NextResponse.json({ error: 'project id required' }, { status: 400 })

    const updates = await req.json()

    // Allowed fields for update
    const allowedFields = [
      'project_name',
      'description',
      'location_description',
      'jurisdiction_city',
      'jurisdiction_county',
      'jurisdiction_state',
      'developer_owner',
      'acres_gross',
      'start_date',
      'location_lat',
      'location_lon',
      'project_type_code',
      'project_type',
      'template_id'
    ]

    // Build SET clause dynamically
    const validUpdates: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        validUpdates[key] = value
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Build dynamic UPDATE query with parameterized values
    // Column names are safe because validated against allowedFields whitelist
    const setParts: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(validUpdates)) {
      setParts.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }

    setParts.push('updated_at = NOW()')

    // Add projectId as the last parameter
    values.push(projectId)

    const queryText = `
      UPDATE landscape.tbl_project
      SET ${setParts.join(', ')}
      WHERE project_id = $${paramIndex}::bigint
      RETURNING *
    `

    // Use sql.query() for parameterized queries with placeholders
    const rows = await sql.query(queryText, values)

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project: rows[0]
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Project PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update project', details: message },
      { status: 500 }
    )
  }
}

export async function GET(_req: Request, context: Params) {
  try {
    const { projectId } = await context.params
    if (!projectId) return NextResponse.json({ error: 'project id required' }, { status: 400 })

    // Select all relevant fields including new template_id
    const rows = await sql`
      SELECT
        project_id,
        project_name,
        description,
        location_description,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state,
        developer_owner,
        acres_gross,
        location_lat,
        location_lon,
        start_date,
        project_type_code,
        project_type,
        template_id,
        is_active,
        created_at,
        updated_at
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}::bigint
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Project GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project', details: message },
      { status: 500 }
    )
  }
}

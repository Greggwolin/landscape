// /app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = { params: Promise<{ projectId: string }> }

export async function PATCH(req: NextRequest, context: Params) {
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
      'analysis_start_date',
      'analysis_end_date',
      'analysis_type',
      'location_lat',
      'location_lon',
    'project_type_code',
    'project_type',
    'template_id',
    'planning_efficiency'
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

export async function GET(_req: NextRequest, context: Params) {
  try {
    const { projectId } = await context.params
    if (!projectId) return NextResponse.json({ error: 'project id required' }, { status: 400 })

    // Select all relevant fields including tile visibility config
    const rows = await sql`
      SELECT
        p.project_id,
        p.project_name,
        p.description,
        p.location_description,
        p.jurisdiction_city,
        p.jurisdiction_county,
        p.jurisdiction_state,
        p.developer_owner,
        p.acres_gross,
        p.location_lat,
        p.location_lon,
        p.start_date,
        p.analysis_start_date,
        p.analysis_end_date,
        p.analysis_type,
        p.project_type_code,
        p.project_type,
        p.template_id,
        p.planning_efficiency,
        CASE
          WHEN c.analysis_type IS NULL THEN NULL
          ELSE json_build_object(
            'analysis_type', c.analysis_type,
            'tile_hbu', c.tile_hbu,
            'tile_valuation', c.tile_valuation,
            'tile_capitalization', c.tile_capitalization,
            'tile_returns', c.tile_returns,
            'tile_development_budget', c.tile_development_budget
          )
        END AS tile_config,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM landscape.tbl_project p
      LEFT JOIN landscape.tbl_analysis_type_config c
        ON c.analysis_type = p.analysis_type
      WHERE p.project_id = ${projectId}::bigint
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

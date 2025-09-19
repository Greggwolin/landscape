// API: Growth Rate Sets - GET all sets for a project and card type
import { NextResponse } from 'next/server'
import { sql } from '../../../../../../lib/db'

interface RouteParams {
  params: {
    projectId: string
    cardType: string
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, cardType } = await params

    if (!projectId || !cardType) {
      return NextResponse.json({ error: 'Missing projectId or cardType' }, { status: 400 })
    }

    const rows = await sql`
      SELECT set_id, project_id, card_type, set_name, is_default,
             created_at, updated_at
      FROM landscape.core_fin_growth_rate_sets
      WHERE project_id = ${projectId}::bigint AND card_type = ${cardType}
      ORDER BY is_default DESC, set_name ASC
    `

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching growth rate sets:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to fetch growth rate sets', details: message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId, cardType } = await params
    const body = await request.json()
    const { set_name, is_default } = body

    if (!projectId || !cardType || !set_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If this is marked as default, unset other defaults for this project/card_type
    if (is_default) {
      await sql`
        UPDATE landscape.core_fin_growth_rate_sets
        SET is_default = FALSE
        WHERE project_id = ${projectId}::bigint AND card_type = ${cardType}
      `
    }

    const result = await sql`
      INSERT INTO landscape.core_fin_growth_rate_sets
      (project_id, card_type, set_name, is_default)
      VALUES (${projectId}::bigint, ${cardType}, ${set_name}, ${is_default || false})
      RETURNING set_id, project_id, card_type, set_name, is_default, created_at, updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error creating growth rate set:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create growth rate set', details: message }, { status: 500 })
  }
}
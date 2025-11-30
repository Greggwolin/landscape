import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

interface SetupProjectRequest {
  projectName: string
  assetType: string
  hierarchyLevels: 2 | 3 | 4
  level1Label: string
  level2Label: string
  level3Label: string
  level4Label?: string
  // Optional project details
  acresGross?: number
  locationLat?: number
  locationLon?: number
  startDate?: string
  jurisdictionCity?: string
  jurisdictionCounty?: string
  jurisdictionState?: string
}

export async function POST(request: Request) {
  try {
    const body: SetupProjectRequest = await request.json()

    // Validate required fields
    if (!body.projectName || !body.assetType || !body.level1Label || !body.level2Label) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Start transaction
    // 1. Create project
    const projectResult = await sql<Array<{ project_id: number }>>`
      INSERT INTO landscape.tbl_project (
        project_name,
        acres_gross,
        location_lat,
        location_lon,
        start_date,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state
      )
      VALUES (
        ${body.projectName},
        ${body.acresGross ?? null},
        ${body.locationLat ?? null},
        ${body.locationLon ?? null},
        ${body.startDate ?? null},
        ${body.jurisdictionCity ?? null},
        ${body.jurisdictionCounty ?? null},
        ${body.jurisdictionState ?? null}
      )
      RETURNING project_id
    `

    const projectId = projectResult[0].project_id

    // 2. Create project configuration
    await sql`
      INSERT INTO landscape.tbl_project_config (
        project_id,
        asset_type,
        level1_label,
        level2_label,
        level3_label
      )
      VALUES (
        ${projectId},
        ${body.assetType},
        ${body.level1Label},
        ${body.level2Label},
        ${body.level3Label}
      )
    `

    // 3. Create project settings with defaults
    await sql`
      INSERT INTO landscape.tbl_project_settings (
        project_id,
        default_currency,
        default_period_type,
        global_inflation_rate,
        cost_inflation_set_id,
        price_inflation_set_id,
        analysis_start_date,
        analysis_end_date,
        discount_rate
      )
      VALUES (
        ${projectId},
        'USD',
        'monthly',
        0.03,
        NULL,
        NULL,
        ${body.startDate ?? null},
        NULL,
        0.10
      )
    `

    return NextResponse.json({
      success: true,
      projectId,
      message: 'Project created successfully'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to create project:', error)

    // Check for unique constraint violation
    if (message.includes('tbl_project_project_name_key')) {
      return NextResponse.json(
        { error: 'A project with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create project', details: message },
      { status: 500 }
    )
  }
}

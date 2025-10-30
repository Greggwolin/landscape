import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { ProjectConfig, ProjectSettings } from '@/types'

type Params = {
  projectId: string
}

type ConfigRow = ProjectConfig

type SettingsRow = ProjectSettings

const DEFAULT_CONFIG: ProjectConfig = {
  project_id: 0,
  asset_type: 'land_development',
  level1_label: 'Area',
  level2_label: 'Phase',
  level3_label: 'Parcel',
}

const DEFAULT_SETTINGS: ProjectSettings = {
  project_id: 0,
  default_currency: 'USD',
  default_period_type: 'monthly',
  global_inflation_rate: 0.03,
  analysis_start_date: null,
  analysis_end_date: null,
  discount_rate: 0.1,
}

export async function GET(_request: Request, context: { params: Params }) {
  const { projectId } = await context.params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const [configRow, settingsRow] = await Promise.all([
      sql<ConfigRow[]>`
        SELECT project_id, asset_type, level1_label, level2_label, level3_label,
               land_use_level1_label, land_use_level1_label_plural,
               land_use_level2_label, land_use_level2_label_plural,
               land_use_level3_label, land_use_level3_label_plural,
               created_at, updated_at
        FROM landscape.tbl_project_config
        WHERE project_id = ${id}
      `,
      sql<SettingsRow[]>`
        SELECT project_id, default_currency, default_period_type, global_inflation_rate,
               analysis_start_date, analysis_end_date, discount_rate,
               created_at, updated_at
        FROM landscape.tbl_project_settings
        WHERE project_id = ${id}
      `,
    ])

    const config = configRow[0]
      ? {
          ...configRow[0],
          created_at: configRow[0].created_at ?? undefined,
          updated_at: configRow[0].updated_at ?? undefined,
        }
      : { ...DEFAULT_CONFIG, project_id: id }
    const settings = settingsRow[0]
      ? {
          ...settingsRow[0],
          created_at: settingsRow[0].created_at ?? undefined,
          updated_at: settingsRow[0].updated_at ?? undefined,
        }
      : { ...DEFAULT_SETTINGS, project_id: id }

    return NextResponse.json({ config, settings })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to load project configuration', error)
    return NextResponse.json(
      { error: 'Failed to load project configuration', details: message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, context: { params: Params }) {
  const { projectId } = await context.params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const body = await request.json()

    // Extract land use label fields if present
    const {
      land_use_level1_label,
      land_use_level1_label_plural,
      land_use_level2_label,
      land_use_level2_label_plural,
      land_use_level3_label,
      land_use_level3_label_plural
    } = body

    // Build dynamic update query based on what fields are provided
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (land_use_level1_label !== undefined) {
      updates.push(`land_use_level1_label = $${paramIndex++}`)
      values.push(land_use_level1_label)
    }
    if (land_use_level1_label_plural !== undefined) {
      updates.push(`land_use_level1_label_plural = $${paramIndex++}`)
      values.push(land_use_level1_label_plural)
    }
    if (land_use_level2_label !== undefined) {
      updates.push(`land_use_level2_label = $${paramIndex++}`)
      values.push(land_use_level2_label)
    }
    if (land_use_level2_label_plural !== undefined) {
      updates.push(`land_use_level2_label_plural = $${paramIndex++}`)
      values.push(land_use_level2_label_plural)
    }
    if (land_use_level3_label !== undefined) {
      updates.push(`land_use_level3_label = $${paramIndex++}`)
      values.push(land_use_level3_label)
    }
    if (land_use_level3_label_plural !== undefined) {
      updates.push(`land_use_level3_label_plural = $${paramIndex++}`)
      values.push(land_use_level3_label_plural)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Execute update
    const updateQuery = `
      UPDATE landscape.tbl_project_config
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE project_id = $1
      RETURNING *
    `

    const result = await sql.unsafe(updateQuery, values)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Project config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0])

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to update project configuration', error)
    return NextResponse.json(
      { error: 'Failed to update project configuration', details: message },
      { status: 500 }
    )
  }
}

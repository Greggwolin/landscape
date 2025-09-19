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

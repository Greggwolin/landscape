// /app/api/projects/route.ts
//
// This route proxies to Django for authenticated project listing,
// falling back to direct DB query for unauthenticated requests.
// Django implements role-based filtering (alpha_testers see only their projects).
//
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { deriveDimensionsFromAnalysisType } from '@/types/project-taxonomy'

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000'

type RawProjectRow = {
  project_id: number
  project_name: string
  acres_gross: number | null
  acreage: number | null
  location_lat: number | null
  location_lon: number | null
  latitude: number | null
  longitude: number | null
  start_date: string | null
  jurisdiction_city: string | null
  jurisdiction_county: string | null
  jurisdiction_state: string | null
  location_description: string | null
  location: string | null
  project_type_code?: string | null
  project_type: string | null
  is_active?: boolean | null
  analysis_type?: string | null
  analysis_perspective?: string | null
  analysis_purpose?: string | null
  value_add_enabled?: boolean
  property_subtype?: string | null
  property_class?: string | null
  analysis_mode?: string | null
  tile_config?: AnalysisTypeTileConfig | null
  total_residential_units?: number | null
  total_commercial_sqft?: number | null
  gross_sf?: number | null
  primary_count?: number | null
  primary_count_type?: string | null
  primary_area?: number | null
  primary_area_type?: string | null
  updated_at?: string | null
}

type FallbackProjectRow = Omit<RawProjectRow, 'project_type_code' | 'is_active'>

type PostgresError = Error & { code?: string }
type AnalysisTypeConfigRow = {
  analysis_type: string
  analysis_perspective: string
  analysis_purpose: string
  tile_valuation: boolean
  tile_capitalization: boolean
  tile_returns: boolean
  tile_development_budget: boolean
}

type AnalysisTypeTileConfig = {
  analysis_type: string
  analysis_perspective: string
  analysis_purpose: string
  tile_valuation: boolean
  tile_capitalization: boolean
  tile_returns: boolean
  tile_development_budget: boolean
}

const PROPERTY_TYPE_FALLBACKS: Array<[RegExp, string]> = [
  [/retail/i, 'COMMERCIAL'],
  [/office/i, 'OFFICE'],
  [/multifamily|multi-family/i, 'MULTIFAMILY'],
  [/mixed/i, 'MIXED_USE'],
  [/master\s+planned/i, 'MPC'],
]

const CARNEY_PROJECT_ID = 8
const CARNEY_FALLBACK_PROJECT: RawProjectRow = {
  project_id: CARNEY_PROJECT_ID,
  project_name: 'Carney Power Center',
  acres_gross: 200,
  acreage: 200,
  location_lat: null,
  location_lon: null,
  latitude: null,
  longitude: null,
  start_date: '2025-01-01',
  jurisdiction_city: 'Phoenix',
  jurisdiction_county: 'Maricopa County',
  jurisdiction_state: 'AZ',
  location_description: 'Phoenix, AZ',
  location: 'Phoenix, AZ',
  project_type_code: 'COMMERCIAL',
  project_type: 'Retail Power Center',
  is_active: true,
  analysis_type: null,
  analysis_perspective: 'INVESTMENT',
  analysis_purpose: 'UNDERWRITING',
  value_add_enabled: false,
  property_subtype: null,
  property_class: null,
  analysis_mode: 'napkin',
  total_residential_units: null,
  total_commercial_sqft: null,
  updated_at: new Date().toISOString()
}

function normalizeProjectTypeCode(projectTypeCode: string | null, projectType: string | null): string | null {
  if (projectTypeCode && projectTypeCode.trim().length > 0) {
    return projectTypeCode.toUpperCase()
  }
  if (!projectType) return null
  const match = PROPERTY_TYPE_FALLBACKS.find(([pattern]) => pattern.test(projectType))
  return match ? match[1] : null
}

const PRIMARY_COUNT_TYPES = new Set(['units', 'lots', 'suites', 'keys', 'pads', 'rooms', 'other'])

function applyPrimaryMeasureFallbacks(project: RawProjectRow): RawProjectRow {
  const primaryAreaType = project.primary_area_type?.toLowerCase() ?? ''
  const primaryCountType = project.primary_count_type?.toLowerCase() ?? ''
  const primaryArea =
    typeof project.primary_area === 'number'
      ? project.primary_area
      : project.primary_area
        ? Number(project.primary_area)
        : null
  const primaryAreaValue = Number.isFinite(primaryArea ?? NaN) ? primaryArea : null
  const primaryCount =
    typeof project.primary_count === 'number'
      ? project.primary_count
      : project.primary_count
        ? Number(project.primary_count)
        : null
  const primaryCountValue = Number.isFinite(primaryCount ?? NaN) ? primaryCount : null
  const countFallback = PRIMARY_COUNT_TYPES.has(primaryCountType) ? primaryCountValue : null
  const projectTypeCode = project.project_type_code?.toUpperCase() ?? ''
  const isMultifamily = projectTypeCode === 'MF' || projectTypeCode === 'MULTIFAMILY'
  const multifamilyFallback = isMultifamily ? primaryCountValue : null

  return {
    ...project,
    total_residential_units:
      project.total_residential_units ?? countFallback ?? multifamilyFallback ?? null,
    total_commercial_sqft:
      project.total_commercial_sqft ??
      (primaryAreaType.includes('sf') ? primaryAreaValue : null),
  }
}

function getConfigKey(
  analysisPerspective?: string | null,
  analysisPurpose?: string | null
): string {
  const perspective = analysisPerspective?.toUpperCase().trim()
  const purpose = analysisPurpose?.toUpperCase().trim()
  if (!perspective || !purpose) return ''
  return `${perspective}__${purpose}`
}

async function queryAnalysisTypeConfigs(): Promise<Map<string, AnalysisTypeTileConfig>> {
  try {
    const rows = await sql<AnalysisTypeConfigRow[]>`
      SELECT
        analysis_type,
        analysis_perspective,
        analysis_purpose,
        tile_valuation,
        tile_capitalization,
        tile_returns,
        tile_development_budget
      FROM landscape.tbl_analysis_type_config
      WHERE analysis_perspective IS NOT NULL
        AND analysis_purpose IS NOT NULL
    `

    return new Map(
      rows.map((row) => [
        getConfigKey(row.analysis_perspective, row.analysis_purpose),
        {
          analysis_type: row.analysis_type?.toUpperCase() ?? '',
          analysis_perspective: row.analysis_perspective?.toUpperCase() ?? '',
          analysis_purpose: row.analysis_purpose?.toUpperCase() ?? '',
          tile_valuation: Boolean(row.tile_valuation),
          tile_capitalization: Boolean(row.tile_capitalization),
          tile_returns: Boolean(row.tile_returns),
          tile_development_budget: Boolean(row.tile_development_budget),
        },
      ])
    )
  } catch (error) {
    console.warn('Failed to query analysis type configs:', error)
    return new Map()
  }
}

function attachTileConfigToProjects(
  projects: RawProjectRow[],
  analysisTypeConfigs: Map<string, AnalysisTypeTileConfig>
): RawProjectRow[] {
  return projects.map((project) => {
    const derived = deriveDimensionsFromAnalysisType(project.analysis_type)
    const analysisPerspective = project.analysis_perspective ?? derived.analysis_perspective
    const analysisPurpose = project.analysis_purpose ?? derived.analysis_purpose
    const key = getConfigKey(analysisPerspective, analysisPurpose)
    return {
      ...project,
      analysis_perspective: analysisPerspective,
      analysis_purpose: analysisPurpose,
      value_add_enabled: project.value_add_enabled ?? derived.value_add_enabled,
      tile_config: key ? analysisTypeConfigs.get(key) ?? null : null,
    }
  })
}

async function queryProjects(includeInactive: boolean): Promise<RawProjectRow[]> {
  try {
    return await sql<RawProjectRow[]>`
      SELECT
        project_id,
        project_name,
        acres_gross,
        acres_gross AS acreage,
        location_lat,
        location_lon,
        location_lat AS latitude,
        location_lon AS longitude,
        start_date,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state,
        location_description,
        location_description AS location,
        project_type_code,
        project_type,
        is_active,
        analysis_type,
        analysis_perspective,
        analysis_purpose,
        value_add_enabled,
        property_subtype,
        property_class,
        COALESCE(analysis_mode, 'napkin') AS analysis_mode,
        -- Phase 5 fields (nullable in legacy DB)
        COALESCE(total_units, target_units)::numeric AS total_residential_units,
        NULL::numeric AS total_commercial_sqft,
        gross_sf,
        primary_count,
        primary_count_type,
        primary_area,
        primary_area_type,
        updated_at
      FROM landscape.tbl_project
      WHERE 1 = 1
        ${includeInactive ? sql`` : sql`AND COALESCE(is_active, true)`}
      ORDER BY updated_at DESC NULLS LAST, project_name
    `
  } catch (error: unknown) {
    const pgError = error as PostgresError
    if (pgError?.code !== '42703') throw error

    const fallbackRows = await sql<FallbackProjectRow[]>`
      SELECT 
        project_id, 
        project_name, 
        acres_gross, 
        acres_gross AS acreage,
        location_lat,
        location_lon,
        location_lat AS latitude,
        location_lon AS longitude,
        start_date,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state,
        project_type,
        location_description,
        location_description AS location,
        analysis_type,
        analysis_perspective,
        analysis_purpose,
        value_add_enabled,
        NULL::numeric AS total_residential_units,
        NULL::numeric AS total_commercial_sqft,
        NULL::numeric AS gross_sf,
        NULL::int AS primary_count,
        NULL::text AS primary_count_type,
        NULL::numeric AS primary_area,
        NULL::text AS primary_area_type,
        updated_at
      FROM landscape.tbl_project
      ORDER BY updated_at DESC NULLS LAST, project_name
    `

    return fallbackRows.map((row) => ({
      ...row,
      project_type_code: null,
      is_active: true,
      analysis_type: row.analysis_type ?? null,
      analysis_perspective: row.analysis_perspective ?? null,
      analysis_purpose: row.analysis_purpose ?? null,
      value_add_enabled: row.value_add_enabled ?? false,
      property_subtype: null,
      property_class: null,
      analysis_mode: 'napkin'
    }))
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const propertyTypeFilter = searchParams.get('property_type')
  const includeInactiveParam = searchParams.get('include_inactive')
  const includeInactive = includeInactiveParam === null || includeInactiveParam === 'true'
  const analysisTypeConfigs = await queryAnalysisTypeConfigs()

  // Check for Authorization header - if present, proxy to Django for user-scoped filtering
  const authHeader = request.headers.get('Authorization')

  if (authHeader) {
    // Proxy to Django backend for authenticated, role-based filtering
    try {
      console.log('Proxying to Django with auth...')
      const djangoResponse = await fetch(`${DJANGO_API_BASE}/api/projects/`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
      })

      if (!djangoResponse.ok) {
        console.error('Django returned error:', djangoResponse.status)
        // Fall through to direct DB query on Django error
      } else {
        const djangoData = await djangoResponse.json()

        // Django returns { results: [...] } or just [...]
        const projects = Array.isArray(djangoData) ? djangoData : (djangoData.results || [])

        // Normalize and filter
        const normalized = projects.map((project: RawProjectRow) =>
          applyPrimaryMeasureFallbacks({
            ...deriveDimensionsFromAnalysisType(project.analysis_type),
            ...project,
            project_type_code: normalizeProjectTypeCode(project.project_type_code ?? null, project.project_type ?? null),
            is_active: project.is_active ?? true,
            analysis_mode: project.analysis_mode ?? 'napkin',
            analysis_perspective: project.analysis_perspective ?? deriveDimensionsFromAnalysisType(project.analysis_type).analysis_perspective,
            analysis_purpose: project.analysis_purpose ?? deriveDimensionsFromAnalysisType(project.analysis_type).analysis_purpose,
            value_add_enabled: project.value_add_enabled ?? deriveDimensionsFromAnalysisType(project.analysis_type).value_add_enabled,
          })
        )
        const withTileConfig = attachTileConfigToProjects(normalized, analysisTypeConfigs)

        const filtered = propertyTypeFilter
          ? withTileConfig.filter((project: RawProjectRow) => project.project_type_code === propertyTypeFilter.toUpperCase())
          : withTileConfig

        console.log(`Django returned ${filtered.length} projects for authenticated user`)
        return NextResponse.json(filtered)
      }
    } catch (djangoError) {
      console.error('Django proxy error:', djangoError)
      // Fall through to direct DB query
    }
  }

  // Unauthenticated fallback: direct DB query (returns all projects)
  let rows: RawProjectRow[]

  try {
    console.log('Querying landscape.tbl_project directly (no auth)...')
    rows = await queryProjects(includeInactive)

    const hasCarney = rows.some(
      (project) =>
        project.project_id === CARNEY_PROJECT_ID ||
        project.project_name?.toLowerCase().includes('carney')
    )

    if (!hasCarney && includeInactive) {
      console.log('Carney project missing; injecting fallback entry')
      rows = [...rows, CARNEY_FALLBACK_PROJECT]
    }

    const normalized = rows.map((project) =>
      applyPrimaryMeasureFallbacks({
        ...deriveDimensionsFromAnalysisType(project.analysis_type),
        ...project,
        project_type_code: normalizeProjectTypeCode(project.project_type_code, project.project_type),
        is_active: project.is_active ?? true,
        analysis_mode: project.analysis_mode ?? 'napkin',
        analysis_perspective: project.analysis_perspective ?? deriveDimensionsFromAnalysisType(project.analysis_type).analysis_perspective,
        analysis_purpose: project.analysis_purpose ?? deriveDimensionsFromAnalysisType(project.analysis_type).analysis_purpose,
        value_add_enabled: project.value_add_enabled ?? deriveDimensionsFromAnalysisType(project.analysis_type).value_add_enabled,
      })
    )
    const withTileConfig = attachTileConfigToProjects(normalized, analysisTypeConfigs)

    const filtered = propertyTypeFilter
      ? withTileConfig.filter((project) => project.project_type_code === propertyTypeFilter.toUpperCase())
      : withTileConfig

    console.log('Found projects:', filtered.length)
    return NextResponse.json(filtered)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Database error details:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        details: message,
      },
      { status: 500 }
    )
  }
}

type CreateProjectRequest = {
  project_name: string
  project_type_code: string
  template_id: number
  description?: string
  location_description?: string
  jurisdiction_city?: string
  jurisdiction_county?: string
  jurisdiction_state?: string
  developer_owner?: string
}

type TemplateColumnConfig = {
  template_column_id: number
  column_name: string
  column_label: string
  column_type: 'hierarchy' | 'data'
  data_type: string | null
  tier: number | null
  display_order: number
  is_required: boolean
  data_source_table: string | null
  data_source_value_col: string | null
  data_source_label_col: string | null
  parent_column_name: string | null
  junction_table: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateProjectRequest

    // Validate required fields
    if (!body.project_name || !body.project_type_code || !body.template_id) {
      return NextResponse.json(
        { error: 'Missing required fields: project_name, project_type_code, template_id' },
        { status: 400 }
      )
    }

    console.log('Creating project:', body)

    // 1. Create the project
    const projectRows = await sql<{ project_id: number }[]>`
      INSERT INTO landscape.tbl_project (
        project_name,
        project_type_code,
        analysis_type,
        analysis_perspective,
        analysis_purpose,
        value_add_enabled,
        description,
        location_description,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state,
        developer_owner,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${body.project_name},
        ${body.project_type_code},
        'INVESTMENT',
        'INVESTMENT',
        'UNDERWRITING',
        false,
        ${body.description || null},
        ${body.location_description || null},
        ${body.jurisdiction_city || null},
        ${body.jurisdiction_county || null},
        ${body.jurisdiction_state || null},
        ${body.developer_owner || null},
        true,
        NOW(),
        NOW()
      )
      RETURNING project_id
    `

    const projectId = projectRows[0].project_id
    console.log('Created project with ID:', projectId)

    // 2. Get template column configurations
    const templateColumns = await sql<TemplateColumnConfig[]>`
      SELECT
        template_column_id,
        column_name,
        column_label,
        column_type,
        data_type,
        tier,
        display_order,
        is_required,
        data_source_table,
        data_source_value_col,
        data_source_label_col,
        parent_column_name,
        junction_table
      FROM landscape.tbl_template_column_config
      WHERE template_id = ${body.template_id}
      ORDER BY display_order
    `

    console.log(`Found ${templateColumns.length} template columns`)

    // 3. Create project inventory columns based on template
    for (const col of templateColumns) {
      // Auto-hide columns that are calculated from product selection
      const isVisible = !['lot_w_ft', 'lot_d_ft'].includes(col.column_name)

      await sql`
        INSERT INTO landscape.tbl_project_inventory_columns (
          project_id,
          column_name,
          column_label,
          column_type,
          data_type,
          tier,
          display_order,
          is_required,
          is_visible,
          data_source_table,
          data_source_value_col,
          data_source_label_col,
          parent_column_name,
          junction_table
        ) VALUES (
          ${projectId},
          ${col.column_name},
          ${col.column_label},
          ${col.column_type},
          ${col.data_type},
          ${col.tier},
          ${col.display_order},
          ${col.is_required},
          ${isVisible},
          ${col.data_source_table},
          ${col.data_source_value_col},
          ${col.data_source_label_col},
          ${col.parent_column_name},
          ${col.junction_table}
        )
      `
    }

    console.log(`Created ${templateColumns.length} inventory columns for project ${projectId}`)

    // 4. Create project config based on property type
    // For MPC, use default Area/Phase/Parcel labels
    const level1Label = 'Area'
    const level2Label = 'Phase'
    const level3Label = 'Parcel'

    // Default land use labels for land development projects
    const landUseLevel1 = 'Family'
    const landUseLevel1Plural = 'Families'
    const landUseLevel2 = 'Type'
    const landUseLevel2Plural = 'Types'
    const landUseLevel3 = 'Product'
    const landUseLevel3Plural = 'Products'

    await sql`
      INSERT INTO landscape.tbl_project_config (
        project_id,
        asset_type,
        level1_label,
        level2_label,
        level3_label,
        land_use_level1_label,
        land_use_level1_label_plural,
        land_use_level2_label,
        land_use_level2_label_plural,
        land_use_level3_label,
        land_use_level3_label_plural
      ) VALUES (
        ${projectId},
        ${body.project_type_code},
        ${level1Label},
        ${level2Label},
        ${level3Label},
        ${landUseLevel1},
        ${landUseLevel1Plural},
        ${landUseLevel2},
        ${landUseLevel2Plural},
        ${landUseLevel3},
        ${landUseLevel3Plural}
      )
    `

    console.log('Created project config')

    // Return the created project
    const createdProject = await sql<RawProjectRow[]>`
      SELECT
        project_id,
        project_name,
        acres_gross,
        location_lat,
        location_lon,
        start_date,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state,
        project_type_code,
        project_type,
        is_active
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `

    return NextResponse.json({
      success: true,
      project: createdProject[0],
      columns_created: templateColumns.length
    }, { status: 201 })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error creating project:', error)
    return NextResponse.json(
      {
        error: 'Failed to create project',
        details: message,
      },
      { status: 500 }
    )
  }
}

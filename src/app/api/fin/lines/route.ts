// API: Budget Lines - GET list, POST create
import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

const parseId = (input: string | null | undefined): number | null => {
  if (input === null || input === undefined) return null
  const value = Number(input)
  return Number.isFinite(value) ? value : null
}

const peLevelToContainerLevel = (peLevel: string): number | null => {
  switch (peLevel) {
    case 'project':
      return 0
    case 'area':
      return 1
    case 'phase':
      return 2
    case 'parcel':
    case 'lot':
      return 3
    default:
      return null
  }
}

async function resolveContainerFromLegacy(peLevel: string, peId: string) {
  const level = peLevelToContainerLevel(peLevel)
  if (level === null || level === 0) return null
  const column =
    level === 1 ? 'area_id' : level === 2 ? 'phase_id' : 'parcel_id'
  const [row] = await sql`
    SELECT container_id, project_id
    FROM landscape.tbl_container
    WHERE container_level = ${level}
      AND attributes->>${column} = ${peId}
    LIMIT 1
  `
  if (!row) return null
  return {
    containerId: Number(row.container_id),
    projectId: row.project_id != null ? Number(row.project_id) : null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const budgetId = parseId(searchParams.get('budget_id'))
    let containerId = parseId(searchParams.get('container_id'))
    let projectId = parseId(searchParams.get('project_id'))
    const peLevel = searchParams.get('pe_level')
    const peId = searchParams.get('pe_id')

    if (!budgetId) {
      return NextResponse.json(
        { error: 'Missing budget_id' },
        { status: 400 }
      )
    }

    if (!containerId && peLevel && peId && peLevel !== 'project') {
      const resolved = await resolveContainerFromLegacy(peLevel, peId)
      if (resolved) {
        containerId = resolved.containerId
        projectId = projectId ?? resolved.projectId
      }
    }

    if (projectId == null && peLevel === 'project' && peId) {
      const numericPe = Number(peId)
      if (Number.isFinite(numericPe)) {
        projectId = numericPe
      }
    }

    if (containerId != null && projectId == null) {
      const [row] = await sql`
        SELECT project_id FROM landscape.tbl_container WHERE container_id = ${containerId}
      `
      if (row?.project_id != null) {
        projectId = Number(row.project_id)
      }
    }

    if (containerId == null && projectId == null) {
      return NextResponse.json(
        {
          error: 'Missing hierarchy information',
          details: 'Provide container_id or project_id (or legacy pe_level + pe_id)'
        },
        { status: 400 }
      )
    }

    const filterForView =
      containerId != null
        ? sql`AND v.container_id = ${containerId}`
        : sql`AND v.container_id IS NULL AND v.project_id = ${projectId}`

    const filterForBase =
      containerId != null
        ? sql`AND f.container_id = ${containerId}`
        : sql`AND f.project_id = ${projectId} AND f.container_id IS NULL`

    let rows:
      | {
          fact_id: number
          budget_id: number
          category_id: number
          category_code: string
          uom_code: string
          uom_name: string
          qty: number | null
          rate: number | null
          amount?: number | null
          amount_base?: number | null
          contingency_mode: string | null
          confidence_code: string | null
          line_contingency_pct: number | null
          effective_contingency_pct?: number | null
          amount_with_contingency?: number | null
        }[] = []

    try {
      rows = (await sql`
        SELECT v.fact_id, v.budget_id,
               v.category_id, c.code AS category_code,
               v.uom_code, u.name AS uom_name,
               v.qty, v.rate, v.amount, v.amount_base,
               v.contingency_mode::text AS contingency_mode,
               v.confidence_code,
               v.contingency_pct AS line_contingency_pct,
               v.effective_contingency_pct,
               v.amount_with_contingency
        FROM landscape.vw_fin_budget_effective v
        JOIN landscape.core_fin_category c ON c.category_id = v.category_id
        JOIN landscape.core_fin_uom u ON u.uom_code = v.uom_code
        WHERE v.budget_id = ${budgetId}::bigint
          ${filterForView}
        ORDER BY v.fact_id DESC
      `) as unknown as typeof rows
    } catch {
      rows = (await sql`
        SELECT f.fact_id, f.budget_id,
               f.category_id, c.code AS category_code,
               f.uom_code, u.name AS uom_name,
               f.qty, f.rate, f.amount,
               f.contingency_mode::text AS contingency_mode,
               f.confidence_code,
               f.contingency_pct AS line_contingency_pct
        FROM landscape.core_fin_fact_budget f
        JOIN landscape.core_fin_category c ON c.category_id = f.category_id
        JOIN landscape.core_fin_uom u ON u.uom_code = f.uom_code
        WHERE f.budget_id = ${budgetId}::bigint
          ${filterForBase}
        ORDER BY f.fact_id DESC
      `) as unknown as typeof rows
    }

    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Lines GET error:', e)
    return NextResponse.json({ error: 'Failed to load lines', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      budget_id,
      container_id,
      project_id: projectIdInput,
      pe_level,
      pe_id,
      category_id,
      uom_code,
      qty,
      rate,
      amount,
      notes
    } = body ?? {}

    if (!budget_id || !category_id || !uom_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let projectId =
      typeof projectIdInput === 'number' && Number.isFinite(projectIdInput)
        ? projectIdInput
        : null
    let resolvedContainerId =
      typeof container_id === 'number' && Number.isFinite(container_id)
        ? container_id
        : null

    if (!resolvedContainerId && pe_level && pe_id && pe_level !== 'project') {
      const resolved = await resolveContainerFromLegacy(pe_level, pe_id)
      if (resolved) {
        resolvedContainerId = resolved.containerId
        projectId = projectId ?? resolved.projectId
      }
    }

    if (resolvedContainerId != null && projectId == null) {
      const [row] = await sql`
        SELECT project_id FROM landscape.tbl_container WHERE container_id = ${resolvedContainerId}
      `
      if (row?.project_id != null) {
        projectId = Number(row.project_id)
      }
    }

    if (projectId == null && pe_level === 'project' && pe_id) {
      const numericPe = Number(pe_id)
      if (Number.isFinite(numericPe)) {
        projectId = numericPe
      }
    }

    if (projectId == null) {
      return NextResponse.json(
        { error: 'Missing project context', details: 'project_id is required' },
        { status: 400 }
      )
    }

    const rows = await sql`
      INSERT INTO landscape.core_fin_fact_budget
        (budget_id, container_id, project_id, category_id, uom_code, qty, rate, amount, notes)
      VALUES
        (${budget_id}::bigint, ${resolvedContainerId}, ${projectId}, ${category_id}::bigint, ${uom_code}, ${qty ?? 1}, ${rate ?? null}, ${amount ?? null}, ${notes ?? null})
      RETURNING fact_id
    `
    return NextResponse.json({ fact_id: rows?.[0]?.fact_id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Lines POST error:', e)
    return NextResponse.json({ error: 'Failed to create line', details: msg }, { status: 500 })
  }
}

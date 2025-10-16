import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

type RawBudgetItem = {
  fact_id: number
  budget_id: number
  project_id: number | null
  container_id: number | null
  category_id: number
  uom_code: string
  qty: number | null
  rate: number | null
  amount: string | number | null
  confidence_level: string | null
  is_committed: boolean | null
  container_level: number | null
  container_code: string | null
  container_name: string | null
  parent_container_id: number | null
  project_ref: number | null
  container_sort_order: number | null
  category_code: string | null
  category_name: string | null
  category_scope: string | null
}

const parseId = (input: string | null): number | null => {
  if (!input) return null
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
  const containerLevel = peLevelToContainerLevel(peLevel)
  if (containerLevel === null || containerLevel === 0) return null

  const column =
    containerLevel === 1
      ? 'area_id'
      : containerLevel === 2
        ? 'phase_id'
        : 'parcel_id'

  const [row] = await sql`
    SELECT container_id, project_id
    FROM landscape.tbl_container
    WHERE container_level = ${containerLevel}
      AND attributes->>${column} = ${peId}
    LIMIT 1
  `

  if (!row) return null
  return {
    containerId: Number(row.container_id),
    projectId: row.project_id != null ? Number(row.project_id) : null,
    containerLevel
  }
}

function normalizeItems(rows: RawBudgetItem[]) {
  return rows.map((item) => ({
    ...item,
    amount: item.amount != null ? Number(item.amount) : null,
    project_id: item.project_id ?? item.project_ref ?? null
  }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeChildren = searchParams.get('include_children') === 'true'
    const containerLevelParam = searchParams.get('container_level')
    const containerIdParam = searchParams.get('container_id')
    const projectParam = searchParams.get('project_id')
    const peLevel = searchParams.get('pe_level')
    const peId = searchParams.get('pe_id')

    const containerLevel = parseId(containerLevelParam)
    let containerId = parseId(containerIdParam)
    let projectId = parseId(projectParam)

    // Container-first path (Phase 2)
    if (!containerId && peLevel && peId) {
      if (peLevel === 'project') {
        projectId = projectId ?? parseId(peId)
      } else {
        const resolved = await resolveContainerFromLegacy(peLevel, peId)
        if (resolved) {
          containerId = resolved.containerId
          projectId = projectId ?? resolved.projectId
        } else {
          console.warn(
            'Unable to resolve container for pe_level=%s pe_id=%s',
            peLevel,
            peId
          )
        }
      }
    }

    if (!projectId && containerId) {
      const [row] = await sql`
        SELECT project_id, container_level
        FROM landscape.tbl_container
        WHERE container_id = ${containerId}
      `
      if (row?.project_id != null) {
        projectId = Number(row.project_id)
      }
    }

    if (!containerId && !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          details:
            'Provide container_id or project_id (legacy pe_level/pe_id can be used for fallback resolution)'
        },
        { status: 400 }
      )
    }

    let items: RawBudgetItem[] = []

    if (containerId && includeChildren) {
      items = (await sql`
        WITH RECURSIVE container_tree AS (
          SELECT container_id, container_level, project_id, parent_container_id, container_code, display_name, sort_order
          FROM landscape.tbl_container
          WHERE container_id = ${containerId}

          UNION ALL

          SELECT c.container_id, c.container_level, c.project_id, c.parent_container_id, c.container_code, c.display_name, c.sort_order
          FROM landscape.tbl_container c
          INNER JOIN container_tree ct ON c.parent_container_id = ct.container_id
        )
        SELECT
          b.fact_id,
          b.budget_id,
          b.project_id,
          b.container_id,
          b.category_id,
          b.uom_code,
          b.qty,
          b.rate,
          b.amount,
          b.confidence_level,
          b.is_committed,
          ct.container_level,
          ct.container_code,
          ct.display_name AS container_name,
          ct.parent_container_id,
          ct.project_id AS project_ref,
          ct.sort_order AS container_sort_order,
          cat.code AS category_code,
          cat.detail AS category_name,
          cat.scope AS category_scope
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN container_tree ct ON b.container_id = ct.container_id
        LEFT JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
        WHERE b.container_id IN (SELECT container_id FROM container_tree)
        ORDER BY ct.container_level, ct.sort_order, cat.scope, cat.code
      `) as RawBudgetItem[]
    } else if (containerId) {
      items = (await sql`
        SELECT
          b.fact_id,
          b.budget_id,
          b.project_id,
          b.container_id,
          b.category_id,
          b.uom_code,
          b.qty,
          b.rate,
          b.amount,
          b.confidence_level,
          b.is_committed,
          c.container_level,
          c.container_code,
          c.display_name AS container_name,
          c.parent_container_id,
          c.project_id AS project_ref,
          c.sort_order AS container_sort_order,
          cat.code AS category_code,
          cat.detail AS category_name,
          cat.scope AS category_scope
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
        LEFT JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
        WHERE b.container_id = ${containerId}
        ORDER BY cat.scope, cat.code
      `) as RawBudgetItem[]
    } else if (projectId != null && containerLevel != null) {
      items = (await sql`
        SELECT
          b.fact_id,
          b.budget_id,
          b.project_id,
          b.container_id,
          b.category_id,
          b.uom_code,
          b.qty,
          b.rate,
          b.amount,
          b.confidence_level,
          b.is_committed,
          c.container_level,
          c.container_code,
          c.display_name AS container_name,
          c.parent_container_id,
          c.project_id AS project_ref,
          c.sort_order AS container_sort_order,
          cat.code AS category_code,
          cat.detail AS category_name,
          cat.scope AS category_scope
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
        LEFT JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
        WHERE b.project_id = ${projectId}
          ${containerLevel === 0
            ? sql`AND b.container_id IS NULL`
            : sql`AND c.container_level = ${containerLevel}`
          }
        ORDER BY c.sort_order, cat.scope, cat.code
      `) as RawBudgetItem[]
    } else if (projectId) {
      items = (await sql`
        SELECT
          b.fact_id,
          b.budget_id,
          b.project_id,
          b.container_id,
          b.category_id,
          b.uom_code,
          b.qty,
          b.rate,
          b.amount,
          b.confidence_level,
          b.is_committed,
          c.container_level,
          c.container_code,
          c.display_name AS container_name,
          c.parent_container_id,
          c.project_id AS project_ref,
          c.sort_order AS container_sort_order,
          cat.code AS category_code,
          cat.detail AS category_name,
          cat.scope AS category_scope
        FROM landscape.core_fin_fact_budget b
        LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
        LEFT JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
        WHERE b.project_id = ${projectId}
        ORDER BY
          COALESCE(c.container_level, 0),
          c.sort_order,
          cat.scope,
          cat.code
      `) as RawBudgetItem[]
    }

    const normalized = normalizeItems(items)

    const totalAmount = normalized.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    )

    const byLevel = normalized.reduce((groups: Record<string, any>, item) => {
      const level = item.container_level ?? 0
      if (!groups[level]) {
        groups[level] = {
          level,
          levelName:
            level === 0
              ? 'Project'
              : level === 1
                ? 'Level 1'
                : level === 2
                  ? 'Level 2'
                  : 'Level 3',
          count: 0,
          total: 0
        }
      }
      groups[level].count++
      groups[level].total += Number(item.amount) || 0
      return groups
    }, {})

    const summary = {
      totalAmount,
      itemCount: normalized.length,
      byLevel: Object.values(byLevel)
    }

    return NextResponse.json({
      success: true,
      data: {
        items: normalized,
        summary
      }
    })
  } catch (error) {
    console.error('Error fetching container budget items:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch budget items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

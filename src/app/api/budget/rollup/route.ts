import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const groupBy = searchParams.get('group_by') || 'container_level'
    const maxLevel = parseId(searchParams.get('max_level'))
    const peLevel = searchParams.get('pe_level')
    const peId = searchParams.get('pe_id')

    let containerId = parseId(searchParams.get('container_id'))
    let projectId = parseId(searchParams.get('project_id'))

    if (!containerId && peLevel && peId && peLevel !== 'project') {
      const resolved = await resolveContainerFromLegacy(peLevel, peId)
      if (resolved) {
        containerId = resolved.containerId
        projectId = projectId ?? resolved.projectId
      }
    }

    if (!projectId && peLevel === 'project' && peId) {
      projectId = parseId(peId)
    }

    if (!projectId && containerId) {
      const [row] = await sql`
        SELECT project_id
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
          details: 'Provide either container_id or project_id'
        },
        { status: 400 }
      )
    }

    let rollup: any[] = []

    if (groupBy === 'container_level') {
      if (containerId) {
        rollup = (await sql`
          WITH RECURSIVE container_tree AS (
            SELECT container_id, container_level, project_id, parent_container_id
            FROM landscape.tbl_container
            WHERE container_id = ${containerId}

            UNION ALL

            SELECT c.container_id, c.container_level, c.project_id, c.parent_container_id
            FROM landscape.tbl_container c
            INNER JOIN container_tree ct ON c.parent_container_id = ct.container_id
          )
          SELECT
            COALESCE(c.container_level, 0) AS container_level,
            CASE
              WHEN c.container_level IS NULL THEN 'Project'
              WHEN c.container_level = 1 THEN 'Level 1'
              WHEN c.container_level = 2 THEN 'Level 2'
              WHEN c.container_level = 3 THEN 'Level 3'
            END AS level_name,
            COUNT(b.fact_id)::INT AS item_count,
            SUM(b.amount) AS total_amount,
            AVG(b.amount) AS avg_amount,
            MIN(b.amount) AS min_amount,
            MAX(b.amount) AS max_amount,
            COUNT(DISTINCT b.container_id) AS container_count
          FROM landscape.core_fin_fact_budget b
          LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
          WHERE b.container_id IN (SELECT container_id FROM container_tree)
            ${maxLevel ? sql`AND c.container_level <= ${maxLevel}` : sql``}
          GROUP BY c.container_level
          ORDER BY COALESCE(c.container_level, 0)
        `) as any[]
      } else if (projectId != null) {
        rollup = (await sql`
          SELECT
            COALESCE(c.container_level, 0) AS container_level,
            CASE
              WHEN c.container_level IS NULL THEN 'Project'
              WHEN c.container_level = 1 THEN 'Level 1'
              WHEN c.container_level = 2 THEN 'Level 2'
              WHEN c.container_level = 3 THEN 'Level 3'
            END AS level_name,
            COUNT(b.fact_id)::INT AS item_count,
            SUM(b.amount) AS total_amount,
            AVG(b.amount) AS avg_amount,
            MIN(b.amount) AS min_amount,
            MAX(b.amount) AS max_amount,
            COUNT(DISTINCT b.container_id) AS container_count
          FROM landscape.core_fin_fact_budget b
          LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
          WHERE b.project_id = ${projectId}
            ${maxLevel ? sql`AND (c.container_level IS NULL OR c.container_level <= ${maxLevel})` : sql``}
          GROUP BY c.container_level
          ORDER BY COALESCE(c.container_level, 0)
        `) as any[]
      }
    } else if (groupBy === 'container') {
      if (containerId) {
        rollup = (await sql`
          WITH RECURSIVE container_tree AS (
            SELECT container_id, container_level, project_id, parent_container_id,
                   container_code, display_name, sort_order
            FROM landscape.tbl_container
            WHERE container_id = ${containerId}

            UNION ALL

            SELECT c.container_id, c.container_level, c.project_id, c.parent_container_id,
                   c.container_code, c.display_name, c.sort_order
            FROM landscape.tbl_container c
            INNER JOIN container_tree ct ON c.parent_container_id = ct.container_id
          )
          SELECT
            c.container_id,
            c.container_level,
            c.container_code,
            c.display_name AS container_name,
            c.parent_container_id,
            c.sort_order,
            COUNT(b.fact_id)::INT AS item_count,
            SUM(b.amount) AS total_amount,
            AVG(b.amount) AS avg_amount
          FROM container_tree c
          LEFT JOIN landscape.core_fin_fact_budget b ON b.container_id = c.container_id
          ${maxLevel ? sql`WHERE c.container_level <= ${maxLevel}` : sql``}
          GROUP BY c.container_id, c.container_level, c.container_code,
                   c.display_name, c.parent_container_id, c.sort_order
          ORDER BY c.container_level, c.sort_order
        `) as any[]
      } else if (projectId != null) {
        rollup = (await sql`
          SELECT
            c.container_id,
            c.container_level,
            c.container_code,
            c.display_name AS container_name,
            c.parent_container_id,
            c.sort_order,
            COUNT(b.fact_id)::INT AS item_count,
            SUM(b.amount) AS total_amount,
            AVG(b.amount) AS avg_amount
          FROM landscape.tbl_container c
          LEFT JOIN landscape.core_fin_fact_budget b ON b.container_id = c.container_id
          WHERE c.project_id = ${projectId}
            ${maxLevel ? sql`AND c.container_level <= ${maxLevel}` : sql``}
          GROUP BY c.container_id, c.container_level, c.container_code,
                   c.display_name, c.parent_container_id, c.sort_order
          ORDER BY c.container_level, c.sort_order
        `) as any[]
      }
    } else if (groupBy === 'category') {
      if (containerId) {
        rollup = (await sql`
          WITH RECURSIVE container_tree AS (
            SELECT container_id
            FROM landscape.tbl_container
            WHERE container_id = ${containerId}

            UNION ALL

            SELECT c.container_id
            FROM landscape.tbl_container c
            INNER JOIN container_tree ct ON c.parent_container_id = ct.container_id
          )
          SELECT
            cat.category_id,
            cat.code AS category_code,
            cat.detail AS category_name,
            cat.scope AS category_scope,
            COUNT(b.fact_id)::INT AS item_count,
            SUM(b.amount) AS total_amount,
            AVG(b.amount) AS avg_amount
          FROM landscape.core_fin_fact_budget b
          INNER JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
          WHERE b.container_id IN (SELECT container_id FROM container_tree)
          GROUP BY cat.category_id, cat.code, cat.detail, cat.scope
          ORDER BY cat.scope, cat.code
        `) as any[]
      } else if (projectId != null) {
        rollup = (await sql`
          SELECT
            cat.category_id,
            cat.code AS category_code,
            cat.detail AS category_name,
            cat.scope AS category_scope,
            COUNT(b.fact_id)::INT AS item_count,
            SUM(b.amount) AS total_amount,
            AVG(b.amount) AS avg_amount
          FROM landscape.core_fin_fact_budget b
          INNER JOIN landscape.core_fin_category cat ON b.category_id = cat.category_id
          LEFT JOIN landscape.tbl_container c ON b.container_id = c.container_id
          WHERE b.project_id = ${projectId}
          GROUP BY cat.category_id, cat.code, cat.detail, cat.scope
          ORDER BY cat.scope, cat.code
        `) as any[]
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid group_by parameter',
          details: "Must be one of: 'container_level', 'container', 'category'"
        },
        { status: 400 }
      )
    }

    const grandTotal = rollup.reduce(
      (sum: number, row: any) => sum + (Number(row.total_amount) || 0),
      0
    )

    const itemCount = rollup.reduce(
      (sum: number, row: any) => sum + (Number(row.item_count) || 0),
      0
    )

    let hierarchy = null
    if (groupBy === 'container') {
      const nodeMap = new Map<number, any>()
      for (const row of rollup) {
        nodeMap.set(row.container_id, { ...row, children: [] })
      }
      const roots: any[] = []
      for (const node of nodeMap.values()) {
        if (node.parent_container_id && nodeMap.has(node.parent_container_id)) {
          nodeMap.get(node.parent_container_id).children.push(node)
        } else {
          roots.push(node)
        }
      }
      hierarchy = roots
    }

    return NextResponse.json({
      success: true,
      data: {
        rollup,
        grandTotal,
        itemCount,
        groupBy,
        hierarchy
      }
    })
  } catch (error) {
    console.error('Error calculating budget rollup:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate budget rollup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  projectId: string
}

type ContainerTotal = {
  container_id: number
  container_level: number
  container_code: string
  display_name: string
  total_amount: string | null
}

type PeriodTotal = {
  period_id: number
  period_sequence: number
  amount: string | null
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params
  const id = Number(projectId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const [projectExists] = await sql<{ project_id: number }[]>`
      SELECT project_id
      FROM landscape.tbl_project
      WHERE project_id = ${id}
      LIMIT 1
    `

    if (!projectExists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const [containerTotals, periodTotals] = await Promise.all([
      sql<ContainerTotal[]>`
        SELECT
          c.container_id,
          c.container_level,
          c.container_code,
          c.display_name,
          SUM(b.amount)::text AS total_amount
        FROM landscape.core_fin_fact_budget b
        JOIN landscape.tbl_container c ON c.container_id = b.container_id
        WHERE c.project_id = ${id}
        GROUP BY c.container_id, c.container_level, c.container_code, c.display_name
        ORDER BY c.container_level, c.sort_order NULLS LAST, c.container_id
      `,
      sql<PeriodTotal[]>`
        SELECT
          p.period_id,
          p.period_sequence,
          SUM(bt.amount)::text AS amount
        FROM landscape.tbl_calculation_period p
        LEFT JOIN landscape.tbl_budget_timing bt ON bt.period_id = p.period_id
        LEFT JOIN landscape.core_fin_fact_budget b ON b.fact_id = bt.fact_id
        WHERE p.project_id = ${id}
        GROUP BY p.period_id, p.period_sequence
        ORDER BY p.period_sequence
      `,
    ])

    return NextResponse.json({
      status: 'calculated',
      projectId: id,
      generatedAt: new Date().toISOString(),
      totals: {
        containers: containerTotals.map((row) => ({
          container_id: row.container_id,
          container_level: row.container_level,
          container_code: row.container_code,
          display_name: row.display_name,
          total_amount: row.total_amount ? Number(row.total_amount) : 0,
        })),
        periods: periodTotals.map((row) => ({
          period_id: row.period_id,
          period_sequence: row.period_sequence,
          amount: row.amount ? Number(row.amount) : 0,
        })),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to run project calculation', error)
    return NextResponse.json(
      { error: 'Failed to run project calculation', details: message },
      { status: 500 }
    )
  }
}

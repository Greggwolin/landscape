import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  projectId: string
}

type CashFlowRow = {
  period_id: number
  period_sequence: number
  period_start_date: string
  period_end_date: string
  budget_amount: string | null
}

export async function GET(_request: Request, context: { params: Params }) {
  const id = Number(context.params.projectId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const rows = await sql<CashFlowRow[]>`
      SELECT
        p.period_id,
        p.period_sequence,
        p.period_start_date,
        p.period_end_date,
        COALESCE(SUM(bt.amount), 0)::text AS budget_amount
      FROM landscape.tbl_calculation_period p
      LEFT JOIN landscape.tbl_budget_timing bt ON bt.period_id = p.period_id
      WHERE p.project_id = ${id}
      GROUP BY p.period_id, p.period_sequence, p.period_start_date, p.period_end_date
      ORDER BY p.period_sequence
    `

    const cashFlow = rows.map((row) => ({
      period_id: row.period_id,
      period_sequence: row.period_sequence,
      period_start_date: row.period_start_date,
      period_end_date: row.period_end_date,
      budget_amount: row.budget_amount ? Number(row.budget_amount) : 0,
    }))

    return NextResponse.json({ cashFlow })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to build cash flow', error)
    return NextResponse.json(
      { error: 'Failed to build cash flow', details: message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { CalculationPeriod } from '@/types'

type Params = {
  projectId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params
  const id = Number(projectId)

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }

  try {
    const periods = await sql<CalculationPeriod[]>`
      SELECT
        period_id,
        project_id,
        period_start_date,
        period_end_date,
        period_type,
        period_sequence,
        created_at
      FROM landscape.tbl_calculation_period
      WHERE project_id = ${id}
      ORDER BY period_sequence
    `

    return NextResponse.json({ periods })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to load calculation periods', error)
    return NextResponse.json(
      { error: 'Failed to load calculation periods', details: message },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { BudgetTag } from '@/types'

type Params = {
  factId: string
  tagId: string
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { factId: factIdParam, tagId: tagIdParam } = await params
  const factId = Number(factIdParam)
  const tagId = Number(tagIdParam)

  if (!Number.isFinite(factId) || !Number.isFinite(tagId)) {
    return NextResponse.json({ error: 'Invalid fact or tag id' }, { status: 400 })
  }

  try {
    const rows = await sql<BudgetTag[]>`
      UPDATE landscape.core_fin_fact_tags
      SET is_compact = NOT COALESCE(is_compact, FALSE)
      WHERE tag_id = ${tagId} AND fact_id = ${factId}
      RETURNING tag_id, fact_id, fact_type, tag_name, tag_color, tag_category, is_compact, created_by, created_at
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json({ tag: rows[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to toggle tag state', error)
    return NextResponse.json(
      { error: 'Failed to toggle tag state', details: message },
      { status: 500 }
    )
  }
}

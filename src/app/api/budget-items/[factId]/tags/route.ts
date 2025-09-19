import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { BudgetTag, FactType } from '@/types'

type Params = {
  factId: string
}

type TagRow = BudgetTag

type PostBody = {
  factType: FactType
  tagName: string
  tagColor?: string
  tagCategory?: string
  isCompact?: boolean
  action?: 'add' | 'remove'
}

export async function GET(_request: Request, context: { params: Params }) {
  const factId = Number(context.params.factId)
  if (!Number.isFinite(factId)) {
    return NextResponse.json({ error: 'Invalid fact id' }, { status: 400 })
  }

  try {
    const tags = await sql<TagRow[]>`
      SELECT tag_id, fact_id, fact_type, tag_name, tag_color, tag_category, is_compact, created_by, created_at
      FROM landscape.core_fin_fact_tags
      WHERE fact_id = ${factId}
      ORDER BY tag_name
    `

    return NextResponse.json({ tags })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to load fact tags', error)
    return NextResponse.json(
      { error: 'Failed to load fact tags', details: message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, context: { params: Params }) {
  const factId = Number(context.params.factId)
  if (!Number.isFinite(factId)) {
    return NextResponse.json({ error: 'Invalid fact id' }, { status: 400 })
  }

  let body: PostBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { factType, tagName, tagColor, tagCategory, isCompact, action } = body

  if (!factType || !['budget', 'actual'].includes(factType)) {
    return NextResponse.json({ error: 'factType must be "budget" or "actual"' }, { status: 400 })
  }
  if (!tagName || typeof tagName !== 'string') {
    return NextResponse.json({ error: 'tagName is required' }, { status: 400 })
  }

  try {
    if (action === 'remove') {
      const deleted = await sql<TagRow[]>`
        DELETE FROM landscape.core_fin_fact_tags
        WHERE fact_id = ${factId}
          AND fact_type = ${factType}
          AND tag_name = ${tagName}
        RETURNING tag_id, fact_id, fact_type, tag_name, tag_color, tag_category, is_compact, created_by, created_at
      `
      return NextResponse.json({ removed: deleted.length > 0, tag: deleted[0] ?? null })
    }

    const rows = await sql<TagRow[]>`
      INSERT INTO landscape.core_fin_fact_tags (
        fact_id, fact_type, tag_name, tag_color, tag_category, is_compact
      ) VALUES (
        ${factId}, ${factType}, ${tagName}, ${tagColor ?? null}, ${tagCategory ?? null}, ${isCompact ?? false}
      )
      ON CONFLICT (fact_id, fact_type, tag_name)
      DO UPDATE SET
        tag_color = EXCLUDED.tag_color,
        tag_category = EXCLUDED.tag_category,
        is_compact = EXCLUDED.is_compact
      RETURNING tag_id, fact_id, fact_type, tag_name, tag_color, tag_category, is_compact, created_by, created_at
    `

    return NextResponse.json({ tag: rows[0] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to upsert fact tag', error)
    return NextResponse.json(
      { error: 'Failed to upsert fact tag', details: message },
      { status: 500 }
    )
  }
}

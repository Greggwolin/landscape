import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { FactType } from '@/types'

type SearchRow = {
  fact_id: number
  fact_type: FactType
  tags: string[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tagsParam = searchParams.get('tags')
  const factTypeParam = searchParams.get('factType') as FactType | null

  const tags = tagsParam
    ? tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  if (!tags.length) {
    return NextResponse.json({ results: [] })
  }

  if (factTypeParam && !['budget', 'actual'].includes(factTypeParam)) {
    return NextResponse.json({ error: 'factType must be "budget" or "actual"' }, { status: 400 })
  }

  try {
    const rows = await sql<SearchRow[]>`
      WITH filtered AS (
        SELECT fact_id, fact_type
        FROM landscape.core_fin_fact_tags
        WHERE tag_name = ANY(${tags}::text[])
          AND (${factTypeParam}::text IS NULL OR fact_type = ${factTypeParam})
        GROUP BY fact_id, fact_type
        HAVING COUNT(DISTINCT tag_name) >= ${tags.length}
      )
      SELECT f.fact_id,
             f.fact_type,
             ARRAY_AGG(f.tag_name ORDER BY f.tag_name) AS tags
      FROM landscape.core_fin_fact_tags f
      JOIN filtered fl USING (fact_id, fact_type)
      GROUP BY f.fact_id, f.fact_type
      ORDER BY f.fact_id
    `

    return NextResponse.json({ results: rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to search tags', error)
    return NextResponse.json(
      { error: 'Failed to search tags', details: message },
      { status: 500 }
    )
  }
}

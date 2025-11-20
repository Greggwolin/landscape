import { NextResponse } from 'next/server'
import { sql } from '../../../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get('fact_ids') ?? '').split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return NextResponse.json([])
    const rows = await sql`
      SELECT fact_id, notes, docs, chip_state
      FROM landscape.vw_fin_fact_source_badges
      WHERE fact_id = ANY(${ids.map(x => Number(x))})
    `
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Line sources GET error:', e)
    return NextResponse.json({ error: 'Failed to load source badges', details: msg }, { status: 500 })
  }
}

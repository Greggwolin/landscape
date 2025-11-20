import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT confidence_code, name, default_contingency_pct FROM landscape.core_fin_confidence_policy ORDER BY confidence_code`
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Confidence GET error:', e)
    return NextResponse.json({ error: 'Failed to load policies', details: msg }, { status: 500 })
  }
}

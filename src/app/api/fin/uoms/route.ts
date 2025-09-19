import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT uom_code, name, uom_type FROM landscape.core_fin_uom WHERE is_active = true ORDER BY uom_code`
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('UOMs GET error:', e)
    return NextResponse.json({ error: 'Failed to load UOMs', details: msg }, { status: 500 })
  }
}

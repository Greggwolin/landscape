import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET() {
  try {
    // tbl_measures is THE unit list (Gregg, 2026-09-14); core_fin_uom is the
    // older price-prefixed list it supersedes. The response KEEPS its shape —
    // uom_code / name / uom_type — so every caller is unchanged and only the
    // source moves.
    const rows = await sql`SELECT measure_code AS uom_code, measure_name AS name, measure_category AS uom_type FROM landscape.tbl_measures ORDER BY sort_order NULLS LAST, measure_code`
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('UOMs GET error:', e)
    return NextResponse.json({ error: 'Failed to load UOMs', details: msg }, { status: 500 })
  }
}

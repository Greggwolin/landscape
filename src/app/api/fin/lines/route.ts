// API: Budget Lines - GET list, POST create
import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('budget_id')
    const peLevel = searchParams.get('pe_level')
    const peId = searchParams.get('pe_id')
    if (!budgetId || !peLevel || !peId) {
      return NextResponse.json({ error: 'Missing budget_id, pe_level, or pe_id' }, { status: 400 })
    }

    // Prefer effective view if present; fallback to base facts
    let rows:
      | {
          fact_id: number
          budget_id: number
          pe_level: string
          pe_id: number
          category_id: number
          category_code: string
          uom_code: string
          uom_name: string
          qty: number | null
          rate: number | null
          amount?: number | null
          amount_base?: number | null
          contingency_mode: string | null
          confidence_code: string | null
          line_contingency_pct: number | null
          effective_contingency_pct?: number | null
          amount_with_contingency?: number | null
        }[] = []
    try {
      rows = (await sql`
        SELECT v.fact_id, v.budget_id, v.pe_level::text AS pe_level, v.pe_id,
               v.category_id, c.code AS category_code,
               v.uom_code, u.name AS uom_name,
               v.qty, v.rate, v.amount, v.amount_base,
               v.contingency_mode::text AS contingency_mode,
               v.confidence_code,
               v.contingency_pct AS line_contingency_pct,
               v.effective_contingency_pct,
               v.amount_with_contingency
        FROM landscape.vw_fin_budget_effective v
        JOIN landscape.core_fin_category c ON c.category_id = v.category_id
        JOIN landscape.core_fin_uom u ON u.uom_code = v.uom_code
        WHERE v.budget_id = ${budgetId}::bigint
          AND v.pe_level = ${peLevel}::landscape.pe_level
          AND v.pe_id = ${peId}
        ORDER BY v.fact_id DESC
      `) as unknown as typeof rows
    } catch {
      rows = (await sql`
        SELECT f.fact_id, f.budget_id, f.pe_level::text AS pe_level, f.pe_id,
               f.category_id, c.code AS category_code,
               f.uom_code, u.name AS uom_name,
               f.qty, f.rate, f.amount,
               f.contingency_mode::text AS contingency_mode,
               f.confidence_code,
               f.contingency_pct AS line_contingency_pct
        FROM landscape.core_fin_fact_budget f
        JOIN landscape.core_fin_category c ON c.category_id = f.category_id
        JOIN landscape.core_fin_uom u ON u.uom_code = f.uom_code
        WHERE f.budget_id = ${budgetId}::bigint
          AND f.pe_level = ${peLevel}::landscape.pe_level
          AND f.pe_id = ${peId}
        ORDER BY f.fact_id DESC
      `) as unknown as typeof rows
    }
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Lines GET error:', e)
    return NextResponse.json({ error: 'Failed to load lines', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { budget_id, pe_level, pe_id, category_id, uom_code, qty, rate, amount, notes } = body ?? {}
    if (!budget_id || !pe_level || !pe_id || !category_id || !uom_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const rows = await sql`
      INSERT INTO landscape.core_fin_fact_budget
        (budget_id, pe_level, pe_id, category_id, uom_code, qty, rate, amount, notes)
      VALUES
        (${budget_id}::bigint, ${pe_level}::landscape.pe_level, ${pe_id}, ${category_id}::bigint, ${uom_code}, ${qty ?? 1}, ${rate ?? null}, ${amount ?? null}, ${notes ?? null})
      RETURNING fact_id
    `
    return NextResponse.json({ fact_id: rows?.[0]?.fact_id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Lines POST error:', e)
    return NextResponse.json({ error: 'Failed to create line', details: msg }, { status: 500 })
  }
}

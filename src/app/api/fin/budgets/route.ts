// API: GET list budgets, POST create budget (if needed)
import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT budget_id, name, as_of, status FROM landscape.core_fin_budget_version ORDER BY created_at DESC`;
    if (!rows || rows.length === 0) {
      // Create a default budget version
      const created = await sql`
        INSERT INTO landscape.core_fin_budget_version (name, as_of, status)
        VALUES ('Baseline', CURRENT_DATE, 'draft')
        RETURNING budget_id, name, as_of, status
      `;
      return NextResponse.json(created);
    }
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Budgets GET error:', e);
    return NextResponse.json({ error: 'Failed to load budgets', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = body?.name ?? 'Budget'
    const as_of = body?.as_of ?? null
    const status = body?.status ?? 'draft'
    const created = await sql`
      INSERT INTO landscape.core_fin_budget_version (name, as_of, status)
      VALUES (${name}, COALESCE(${as_of}::date, CURRENT_DATE), ${status})
      RETURNING budget_id, name, as_of, status
    `
    return NextResponse.json(created)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Budgets POST error:', e)
    return NextResponse.json({ error: 'Failed to create budget', details: msg }, { status: 500 })
  }
}

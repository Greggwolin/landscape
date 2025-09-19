// API: Budget Lines - PATCH update, DELETE remove
import { NextResponse, NextRequest } from 'next/server'
import { sql } from '../../../../../lib/db'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await _req.json().catch(() => ({}))

    const category_id = body.category_id ?? null
    const uom_code = body.uom_code ?? null
    const qty = body.qty ?? null
    const rate = body.rate ?? null
    const amount = body.amount ?? null
    const notes = body.notes ?? null
    const confidence_code = body.confidence_code ?? null
    const contingency_mode = body.contingency_mode ?? null
    const contingency_pct = body.contingency_pct ?? null

    await sql`
      UPDATE landscape.core_fin_fact_budget SET
        category_id = COALESCE(${category_id}::bigint, category_id),
        uom_code = COALESCE(${uom_code}::text, uom_code),
        qty = COALESCE(${qty}::numeric, qty),
        rate = COALESCE(${rate}::numeric, rate),
        amount = COALESCE(${amount}::numeric, amount),
        notes = COALESCE(${notes}::text, notes),
        confidence_code = COALESCE(${confidence_code}::text, confidence_code),
        contingency_mode = COALESCE(${contingency_mode}::landscape.contingency_mode, contingency_mode),
        contingency_pct = COALESCE(${contingency_pct}::numeric, contingency_pct)
      WHERE fact_id = ${id}::bigint
    `

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Lines PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update line', details: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM landscape.core_fin_fact_budget WHERE fact_id = ${id}::bigint`
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Lines DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete line', details: msg }, { status: 500 })
  }
}

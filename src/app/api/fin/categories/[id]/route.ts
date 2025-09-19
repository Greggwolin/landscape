import { NextResponse, NextRequest } from 'next/server'
import { sql } from '../../../../../lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { code, kind, class: cls, event, scope, detail, is_active, uoms, pe_levels } = body

    await sql`
      UPDATE landscape.core_fin_category SET
        code = COALESCE(${code}, code),
        kind = COALESCE(${kind}, kind),
        class = COALESCE(${cls}, class),
        event = COALESCE(${event}, event),
        scope = COALESCE(${scope}, scope),
        detail = COALESCE(${detail}, detail),
        is_active = COALESCE(${is_active}, is_active)
      WHERE category_id = ${id}::bigint
    `

    if (Array.isArray(uoms)) {
      await sql`DELETE FROM landscape.core_fin_category_uom WHERE category_id = ${id}::bigint`
      for (const u of uoms) await sql`INSERT INTO landscape.core_fin_category_uom (category_id, uom_code) VALUES (${id}::bigint, ${u})`
    }
    if (Array.isArray(pe_levels)) {
      await sql`DELETE FROM landscape.core_fin_pe_applicability WHERE category_id = ${id}::bigint`
      for (const p of pe_levels) await sql`INSERT INTO landscape.core_fin_pe_applicability (category_id, pe_level) VALUES (${id}::bigint, ${p}::landscape.pe_level)`
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Category PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update category', details: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    try {
      await sql`DELETE FROM landscape.core_fin_category WHERE category_id = ${id}::bigint`
      return NextResponse.json({ ok: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: 'Delete failed (in use?)', details: msg }, { status: 409 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Category DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete category', details: msg }, { status: 500 })
  }
}

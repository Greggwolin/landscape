import { NextResponse, NextRequest } from 'next/server'
import { sql } from '../../../../../../lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT fv.party_id, p.name, fv.role, fv.note_id, n.body AS note
      FROM landscape.core_fin_fact_vendor fv
      JOIN landscape.core_party p ON p.party_id = fv.party_id
      LEFT JOIN landscape.core_note n ON n.note_id = fv.note_id
      WHERE fv.fact_id = ${id}::bigint
      ORDER BY p.name
    `
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Line vendors GET error:', e)
    return NextResponse.json({ error: 'Failed to load line vendors', details: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    let party_id = body?.party_id ?? null
    const vendor_name = body?.vendor_name ?? null
    const role = body?.role ?? null
    const note = body?.note ?? null

    if (!party_id && vendor_name) {
      const v = await sql`INSERT INTO landscape.core_party (name, type) VALUES (${vendor_name}, 'vendor') RETURNING party_id`
      party_id = v?.[0]?.party_id
    }
    if (!party_id) return NextResponse.json({ error: 'party_id or vendor_name required' }, { status: 400 })

    let note_id: number | null = null
    if (note && String(note).trim().length > 0) {
      const n = await sql`INSERT INTO landscape.core_note (author_user, body) VALUES ('system', ${note}) RETURNING note_id`
      note_id = n?.[0]?.note_id ?? null
    }

    await sql`INSERT INTO landscape.core_fin_fact_vendor (fact_id, party_id, role, note_id) VALUES (${id}::bigint, ${party_id}::bigint, ${role}, ${note_id}) ON CONFLICT DO NOTHING`

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Line vendors POST error:', e)
    return NextResponse.json({ error: 'Failed to add vendor to line', details: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const partyId = searchParams.get('party_id')
    if (!partyId) return NextResponse.json({ error: 'party_id required' }, { status: 400 })
    await sql`DELETE FROM landscape.core_fin_fact_vendor WHERE fact_id = ${id}::bigint AND party_id = ${partyId}::bigint`
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Line vendors DELETE error:', e)
    return NextResponse.json({ error: 'Failed to remove vendor from line', details: msg }, { status: 500 })
  }
}

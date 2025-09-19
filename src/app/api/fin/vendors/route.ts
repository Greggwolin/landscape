import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const rows = q && q.length > 0
      ? await sql`SELECT party_id, name, type FROM landscape.core_party WHERE is_active = true AND name ILIKE ${'%' + q + '%'} ORDER BY name LIMIT 50`
      : await sql`SELECT party_id, name, type FROM landscape.core_party WHERE is_active = true ORDER BY name LIMIT 50`
    return NextResponse.json(rows)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Vendors GET error:', e)
    return NextResponse.json({ error: 'Failed to load vendors', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = body?.name
    const type = body?.type ?? 'vendor'
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const rows = await sql`INSERT INTO landscape.core_party (name, type) VALUES (${name}, ${type}) RETURNING party_id, name, type`
    return NextResponse.json(rows?.[0] ?? null)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Vendors POST error:', e)
    return NextResponse.json({ error: 'Failed to create vendor', details: msg }, { status: 500 })
  }
}

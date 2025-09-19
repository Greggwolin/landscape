import { NextResponse, NextRequest } from 'next/server'
import { sql } from '@/lib/db'

// PATCH /api/phases/[id]
// Allows updating optional descriptive fields for a phase.
// If columns don't exist (older DB), create them idempotently.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const label = body.label ?? null
    const description = body.description ?? null

    // Ensure columns exist (no-op if already present)
    try {
      await sql`ALTER TABLE landscape.tbl_phase ADD COLUMN IF NOT EXISTS label text`;
    } catch {}
    try {
      await sql`ALTER TABLE landscape.tbl_phase ADD COLUMN IF NOT EXISTS description text`;
    } catch {}

    await sql`
      UPDATE landscape.tbl_phase SET
        label = COALESCE(${label}::text, label),
        description = COALESCE(${description}::text, description)
      WHERE phase_id = ${id}::bigint
    `
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Phase PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update phase', details: msg }, { status: 500 })
  }
}

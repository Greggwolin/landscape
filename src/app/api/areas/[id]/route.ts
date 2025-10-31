import { NextResponse, NextRequest } from 'next/server'
import { sql } from '@/lib/db'

// PATCH /api/areas/[id]
// Allows updating area name, label, and description
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const area_name = body.area_name ?? null
    const label = body.label ?? null
    const description = body.description ?? null

    // Ensure columns exist (no-op if already present)
    try {
      await sql`ALTER TABLE landscape.tbl_area ADD COLUMN IF NOT EXISTS label text`;
    } catch {}
    try {
      await sql`ALTER TABLE landscape.tbl_area ADD COLUMN IF NOT EXISTS description text`;
    } catch {}

    await sql`
      UPDATE landscape.tbl_area SET
        area_name = COALESCE(${area_name}::text, area_name),
        label = COALESCE(${label}::text, label),
        description = COALESCE(${description}::text, description)
      WHERE area_id = ${id}::bigint
    `
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Area PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update area', details: msg }, { status: 500 })
  }
}

// DELETE /api/areas/[id]
// Deletes an area by ID. Will fail if the area has phases or parcels associated with it.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if area exists
    const areaCheck = await sql`
      SELECT area_id FROM landscape.tbl_area WHERE area_id = ${id}::bigint
    `

    if (areaCheck.length === 0) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Check if area has phases
    const phaseCheck = await sql`
      SELECT COUNT(*) as count FROM landscape.tbl_phase WHERE area_id = ${id}::bigint
    `

    if (phaseCheck[0].count > 0) {
      return NextResponse.json({
        error: 'Cannot delete area with phases. Please delete all phases first.',
        details: `Area has ${phaseCheck[0].count} phase(s)`
      }, { status: 400 })
    }

    // Check if area has parcels (double-check)
    const parcelCheck = await sql`
      SELECT COUNT(*) as count FROM landscape.tbl_parcel WHERE area_id = ${id}::bigint
    `

    if (parcelCheck[0].count > 0) {
      return NextResponse.json({
        error: 'Cannot delete area with parcels. Please delete all parcels first.',
        details: `Area has ${parcelCheck[0].count} parcel(s)`
      }, { status: 400 })
    }

    // Delete the area
    await sql`DELETE FROM landscape.tbl_area WHERE area_id = ${id}::bigint`

    return NextResponse.json({ ok: true, message: 'Area deleted successfully' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Area DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete area', details: msg }, { status: 500 })
  }
}

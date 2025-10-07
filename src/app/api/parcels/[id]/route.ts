import { NextResponse, NextRequest } from 'next/server'
import { sql } from '@/lib/db'

// PATCH /api/parcels/[id]
// Accepts either UI field names (acres, units, efficiency, product, usecode, frontfeet)
// or DB column names (acres_gross, units_total, plan_efficiency, lot_product, landuse_code, lots_frontfeet)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Handle each field update separately to properly support null values
    let hasUpdates = false

    // Skip landuse_code updates entirely to avoid foreign key constraints
    // We now use the new taxonomy fields instead

    // Handle lot_product (allow null to clear the field)
    if (body.lot_product !== undefined || body.product !== undefined) {
      const lot_product = body.lot_product ?? body.product
      await sql`UPDATE landscape.tbl_parcel SET lot_product = ${lot_product} WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    // Handle other numeric fields (only if not null)
    if (body.acres_gross !== undefined || body.acres !== undefined) {
      const acres_gross = body.acres_gross ?? body.acres
      if (acres_gross !== null) {
        await sql`UPDATE landscape.tbl_parcel SET acres_gross = ${acres_gross}::numeric WHERE parcel_id = ${id}::bigint`
        hasUpdates = true
      }
    }

    if (body.units_total !== undefined || body.units !== undefined) {
      const units_total = body.units_total ?? body.units
      if (units_total !== null) {
        await sql`UPDATE landscape.tbl_parcel SET units_total = ${units_total}::integer WHERE parcel_id = ${id}::bigint`
        hasUpdates = true
      }
    }

    if (body.plan_efficiency !== undefined || body.efficiency !== undefined) {
      const plan_efficiency = body.plan_efficiency ?? body.efficiency
      if (plan_efficiency !== null) {
        await sql`UPDATE landscape.tbl_parcel SET plan_efficiency = ${plan_efficiency}::numeric WHERE parcel_id = ${id}::bigint`
        hasUpdates = true
      }
    }

    if (body.lots_frontfeet !== undefined || body.frontfeet !== undefined) {
      const lots_frontfeet = body.lots_frontfeet ?? body.frontfeet
      if (lots_frontfeet !== null) {
        await sql`UPDATE landscape.tbl_parcel SET lots_frontfeet = ${lots_frontfeet}::numeric WHERE parcel_id = ${id}::bigint`
        hasUpdates = true
      }
    }

    if (body.lot_width !== undefined && body.lot_width !== null) {
      await sql`UPDATE landscape.tbl_parcel SET lot_width = ${body.lot_width}::numeric WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    if (body.lot_depth !== undefined && body.lot_depth !== null) {
      await sql`UPDATE landscape.tbl_parcel SET lot_depth = ${body.lot_depth}::numeric WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    // Handle taxonomy fields
    if (body.family_name !== undefined) {
      await sql`UPDATE landscape.tbl_parcel SET family_name = ${body.family_name} WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    if (body.density_code !== undefined) {
      await sql`UPDATE landscape.tbl_parcel SET density_code = ${body.density_code} WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    if (body.type_code !== undefined) {
      await sql`UPDATE landscape.tbl_parcel SET type_code = ${body.type_code} WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    if (body.product_code !== undefined) {
      await sql`UPDATE landscape.tbl_parcel SET product_code = ${body.product_code} WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    if (body.subtype_id !== undefined) {
      await sql`UPDATE landscape.tbl_parcel SET subtype_id = ${body.subtype_id}::bigint WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    // Accept type_id as well (from lu_type table) - maps to same subtype_id column
    if (body.type_id !== undefined) {
      await sql`UPDATE landscape.tbl_parcel SET subtype_id = ${body.type_id}::bigint WHERE parcel_id = ${id}::bigint`
      hasUpdates = true
    }

    if (!hasUpdates) {
      return NextResponse.json({ ok: true, message: 'No fields to update' })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Parcels PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update parcel', details: msg }, { status: 500 })
  }
}

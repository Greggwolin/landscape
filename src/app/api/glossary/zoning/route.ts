import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type ZoningRow = {
  family_name?: string | null
  jurisdiction_city: string
  jurisdiction_county?: string | null
  jurisdiction_state: string
  jurisdiction_display: string
  local_code_raw: string
  local_code_canonical: string
  code_token_kind: 'published' | 'placeholder' | 'numeric' | 'mixed'
  code_token_confidence: number | string
  mapped_use: string
  allowance: 'P' | 'C' | 'X'
  purpose_text: string
  intent_text: string
  is_active?: boolean
}

// GET /api/glossary/zoning
// Optional query params: jurisdiction_display, city, county, state, family, code, metrics=count
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const metrics = searchParams.get('metrics')
    const jurisdiction_display = searchParams.get('jurisdiction_display')
    const city = searchParams.get('city')
    const county = searchParams.get('county')
    const state = searchParams.get('state')
    const family = searchParams.get('family')
    const code = searchParams.get('code')

    if (metrics === 'count') {
      // Use simple conditional queries for count
      let rows
      if (city) {
        rows = await sql`
          SELECT jurisdiction_display, COUNT(*)::int AS count
          FROM land_v2.glossary_zoning
          WHERE jurisdiction_city = ${city}
          GROUP BY jurisdiction_display
          ORDER BY jurisdiction_display
        `
      } else if (jurisdiction_display) {
        rows = await sql`
          SELECT jurisdiction_display, COUNT(*)::int AS count
          FROM land_v2.glossary_zoning  
          WHERE jurisdiction_display = ${jurisdiction_display}
          GROUP BY jurisdiction_display
          ORDER BY jurisdiction_display
        `
      } else {
        rows = await sql`
          SELECT jurisdiction_display, COUNT(*)::int AS count
          FROM land_v2.glossary_zoning
          GROUP BY jurisdiction_display
          ORDER BY jurisdiction_display
        `
      }
      return NextResponse.json({ rows })
    }

    // Use conditional queries for main query
    let rows
    
    if (city) {
      rows = await sql`
        SELECT *
        FROM land_v2.glossary_zoning
        WHERE jurisdiction_city = ${city}
        ORDER BY jurisdiction_display, local_code_raw
      `
    } else if (jurisdiction_display) {
      rows = await sql`
        SELECT *
        FROM land_v2.glossary_zoning
        WHERE jurisdiction_display = ${jurisdiction_display}
        ORDER BY jurisdiction_display, local_code_raw
      `
    } else if (state) {
      rows = await sql`
        SELECT *
        FROM land_v2.glossary_zoning
        WHERE jurisdiction_state = ${state}
        ORDER BY jurisdiction_display, local_code_raw
      `
    } else if (family) {
      rows = await sql`
        SELECT *
        FROM land_v2.glossary_zoning
        WHERE family_name = ${family}
        ORDER BY jurisdiction_display, local_code_raw
      `
    } else {
      rows = await sql`
        SELECT *
        FROM land_v2.glossary_zoning
        ORDER BY jurisdiction_display, local_code_raw
      `
    }
    return NextResponse.json(rows)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('GET glossary/zoning error:', error)
    return NextResponse.json({ error: 'Failed to fetch zoning glossary', details: message }, { status: 500 })
  }
}

// POST /api/glossary/zoning
// Body: ZoningRow | ZoningRow[]
// Performs idempotent upsert on (jurisdiction_display, local_code_raw)
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Writes disabled in production' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Missing JSON body' }, { status: 400 })
    const rows: ZoningRow[] = Array.isArray(body) ? body : [body]

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0, updated: 0, skipped: 0 })
    }

    // Quick client-side validation for required fields
    for (const [i, r] of rows.entries()) {
      const missing = [] as string[]
      if (!r.jurisdiction_display) missing.push('jurisdiction_display')
      if (!r.jurisdiction_city) missing.push('jurisdiction_city')
      if (!r.jurisdiction_state) missing.push('jurisdiction_state')
      if (!r.local_code_raw) missing.push('local_code_raw')
      if (!r.local_code_canonical) missing.push('local_code_canonical')
      if (r.code_token_kind == null) missing.push('code_token_kind')
      if (r.code_token_confidence == null) missing.push('code_token_confidence')
      if (!r.mapped_use) missing.push('mapped_use')
      if (!r.allowance) missing.push('allowance')
      if (!r.purpose_text) missing.push('purpose_text')
      if (!r.intent_text) missing.push('intent_text')
      if (missing.length) {
        return NextResponse.json({ error: `Row ${i} missing: ${missing.join(', ')}` }, { status: 400 })
      }
    }

    // Normalize mapped_use to uppercase
    const payload = rows.map(r => ({ ...r, mapped_use: r.mapped_use?.toUpperCase?.() }))

    // Use jsonb_to_recordset for safe bulk upsert. If payload is empty, we already returned above.
    const insertedOrUpdated = await sql`
      WITH data AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS (
          family_name TEXT,
          jurisdiction_city TEXT,
          jurisdiction_county TEXT,
          jurisdiction_state TEXT,
          jurisdiction_display TEXT,
          local_code_raw TEXT,
          local_code_canonical TEXT,
          code_token_kind land_v2.code_token_kind,
          code_token_confidence NUMERIC,
          mapped_use TEXT,
          allowance CHAR(1),
          purpose_text TEXT,
          intent_text TEXT,
          is_active BOOLEAN
        )
      ), upsert AS (
        INSERT INTO land_v2.glossary_zoning AS g (
          family_name, jurisdiction_city, jurisdiction_county, jurisdiction_state, jurisdiction_display,
          local_code_raw, local_code_canonical, code_token_kind, code_token_confidence, mapped_use,
          allowance, purpose_text, intent_text, is_active
        )
        SELECT 
          d.family_name,
          d.jurisdiction_city,
          d.jurisdiction_county,
          d.jurisdiction_state,
          d.jurisdiction_display,
          d.local_code_raw,
          d.local_code_canonical,
          d.code_token_kind,
          d.code_token_confidence,
          UPPER(d.mapped_use),
          d.allowance,
          d.purpose_text,
          d.intent_text,
          COALESCE(d.is_active, TRUE)
        FROM data d
        ON CONFLICT (jurisdiction_display, local_code_raw)
        DO UPDATE SET
          family_name = EXCLUDED.family_name,
          jurisdiction_city = EXCLUDED.jurisdiction_city,
          jurisdiction_county = EXCLUDED.jurisdiction_county,
          jurisdiction_state = EXCLUDED.jurisdiction_state,
          local_code_canonical = EXCLUDED.local_code_canonical,
          code_token_kind = EXCLUDED.code_token_kind,
          code_token_confidence = EXCLUDED.code_token_confidence,
          mapped_use = EXCLUDED.mapped_use,
          allowance = EXCLUDED.allowance,
          purpose_text = EXCLUDED.purpose_text,
          intent_text = EXCLUDED.intent_text,
          is_active = EXCLUDED.is_active
        RETURNING (xmax = 0) AS inserted
      )
      SELECT 
        SUM(CASE WHEN inserted THEN 1 ELSE 0 END)::int AS inserted,
        SUM(CASE WHEN inserted THEN 0 ELSE 1 END)::int AS updated
      FROM upsert
    `

    const summary = insertedOrUpdated[0] ?? { inserted: 0, updated: 0 }
    return NextResponse.json({ ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('POST glossary/zoning error:', error)
    return NextResponse.json({ error: 'Failed to upsert zoning glossary', details: message }, { status: 500 })
  }
}

// DELETE /api/glossary/zoning?jurisdiction_display=...&code=...
export async function DELETE(request: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_ACCESS !== 'true') {
    return NextResponse.json({ error: 'Writes disabled in production' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const jurisdiction_display = searchParams.get('jurisdiction_display')
    const code = searchParams.get('code')
    if (!jurisdiction_display || !code) {
      return NextResponse.json({ error: 'jurisdiction_display and code are required' }, { status: 400 })
    }
    const res = await sql`DELETE FROM land_v2.glossary_zoning WHERE jurisdiction_display = ${jurisdiction_display} AND local_code_raw = ${code} RETURNING 1 as one`
    return NextResponse.json({ deleted: (res as unknown[]).length ?? 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('DELETE glossary/zoning error:', error)
    return NextResponse.json({ error: 'Failed to delete zoning glossary row', details: message }, { status: 500 })
  }
}

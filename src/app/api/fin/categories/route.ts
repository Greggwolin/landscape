// API: GET categories, with optional pe_level filter; returns allowed UoMs per category
import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const peLevelParam = (searchParams.get('pe_level') ?? '').toLowerCase()
    const tierParam = searchParams.get('tier')
    const tier = tierParam != null ? Number(tierParam) : null

    const effectivePeLevel =
      tier != null
        ? tier === 0
          ? 'project'
          : tier === 1
            ? 'area'
            : tier === 2
              ? 'phase'
              : 'parcel'
        : peLevelParam

    const levelFilter =
      tier != null
        ? tier
        : effectivePeLevel
          ? effectivePeLevel === 'project'
            ? 0
            : effectivePeLevel === 'area'
              ? 1
              : effectivePeLevel === 'phase'
                ? 2
                : ['parcel', 'lot'].includes(effectivePeLevel)
                  ? 3
                  : null
          : null

    // Base category list (active only)
    // Optionally filter by PE applicability if pe_level is provided and valid
    const categories = await sql`
      WITH base AS (
        SELECT c.category_id, c.code, c.kind, c.class, c.event, c.scope, c.detail
        FROM landscape.core_fin_category c
        WHERE c.is_active = true
      ), ca AS (
        SELECT category_id, tier FROM landscape.core_fin_container_applicability
      )
      SELECT b.*, 
             array_agg(u.uom_code ORDER BY u.uom_code) FILTER (WHERE u.uom_code IS NOT NULL) AS uom_codes,
             array_agg(DISTINCT ca.tier) FILTER (WHERE ca.tier IS NOT NULL) AS tiers
      FROM base b
      LEFT JOIN landscape.core_fin_category_uom u ON u.category_id = b.category_id
      LEFT JOIN ca ON ca.category_id = b.category_id
      ${levelFilter != null ? sql`WHERE ca.tier = ${levelFilter}` : sql``}
      GROUP BY b.category_id, b.code, b.kind, b.class, b.event, b.scope, b.detail
      ORDER BY b.kind, b.class NULLS LAST, b.event NULLS LAST, b.scope NULLS LAST, b.detail NULLS LAST
    `

    // Expand UoM names
    const distinctUoms = Array.from(new Set(categories.flatMap(r => r.uom_codes ?? [])))
    const uomRows = distinctUoms.length > 0 ? await sql`
      SELECT uom_code, name FROM landscape.core_fin_uom WHERE uom_code = ANY(${distinctUoms})
    ` : []
    const uomMap = new Map<string, string>((uomRows as unknown as { uom_code: string; name: string }[]).map((r) => [r.uom_code, r.name]))

    const result = (categories as unknown as {
      category_id: number
      code: string
      kind: string
      class: string | null
      event: string | null
      scope: string | null
      detail: string | null
      uom_codes: string[] | null
      tiers: number[] | null
    }[]).map(r => ({
      category_id: r.category_id,
      code: r.code,
      kind: r.kind,
      class: r.class,
      event: r.event,
      scope: r.scope,
      detail: r.detail,
      uoms: (r.uom_codes ?? []).map((c) => ({ code: c, label: uomMap.get(c) ?? c })),
      pe_levels: (r.tiers ?? []).map((level) =>
        level === 0
          ? 'project'
          : level === 1
            ? 'area'
            : level === 2
              ? 'phase'
              : 'parcel'
      ),
      tiers: r.tiers ?? []
    }))

    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Categories GET error:', e)
    return NextResponse.json({ error: 'Failed to load categories', details: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      code,
      kind,
      class: cls,
      event,
      scope,
      detail,
      parent_id,
      is_active = true,
      uoms = [],
      pe_levels = [],
      tiers = []
    } = body
    if (!code || !kind) return NextResponse.json({ error: 'code and kind required' }, { status: 400 })
    const inserted = await sql`
      INSERT INTO landscape.core_fin_category (parent_id, code, kind, class, event, scope, detail, is_active)
      VALUES (${parent_id ?? null}, ${code}, ${kind}, ${cls ?? null}, ${event ?? null}, ${scope ?? null}, ${detail ?? null}, ${!!is_active})
      RETURNING category_id
    `
    const id = inserted?.[0]?.category_id
    if (id) {
      if (Array.isArray(uoms) && uoms.length > 0) {
        for (const u of uoms) await sql`INSERT INTO landscape.core_fin_category_uom (category_id, uom_code) VALUES (${id}, ${u}) ON CONFLICT DO NOTHING`
      }
      const normalizedLevels =
        Array.isArray(tiers) && tiers.length > 0
          ? tiers
          : Array.isArray(pe_levels) && pe_levels.length > 0
            ? pe_levels.map((lvl: string) =>
                lvl === 'project'
                  ? 0
                  : lvl === 'area'
                    ? 1
                    : lvl === 'phase'
                      ? 2
                      : 3
              )
            : []
      if (normalizedLevels.length > 0) {
        for (const level of normalizedLevels) {
          await sql`INSERT INTO landscape.core_fin_container_applicability (category_id, tier) VALUES (${id}, ${level}) ON CONFLICT DO NOTHING`
        }
      }
    }
    return NextResponse.json({ category_id: id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Categories POST error:', e)
    return NextResponse.json({ error: 'Failed to create category', details: msg }, { status: 500 })
  }
}

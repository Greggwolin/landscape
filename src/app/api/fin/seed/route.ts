import { NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

export async function POST() {
  // Environment guard - prevent seeding in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed endpoints disabled in production' }, { status: 403 });
  }

  try {
    // Seed UOMs (idempotent)
    const uoms = [
      ['$$$', 'Currency amount', 'currency'],
      ['% of', 'Percent of base', 'percent'],
      ['$/Acre', 'Dollars per Acre', 'area'],
      ['$/Lot', 'Dollars per Lot', 'count'],
      ['$/FF', 'Dollars per Front Foot', 'linear'],
      ['$/SF', 'Dollars per Square Foot', 'area']
    ] as const
    for (const [code, name, type] of uoms) {
      await sql`INSERT INTO landscape.core_fin_uom (uom_code, name, uom_type) VALUES (${code}, ${name}, ${type}) ON CONFLICT (uom_code) DO UPDATE SET name = EXCLUDED.name, uom_type = EXCLUDED.uom_type`
    }

    // Minimal starter categories (subset of your CSV)
    const starters = [
      { code: 'USE-ACQ-PUR', kind: 'Use', class: 'Acquisition', event: 'Purchase', uoms: ['$/Acre'], entities: ['project','parcel'] },
      { code: 'USE-STG3-OFF', kind: 'Use', class: 'Stage 3', event: 'Offsites', uoms: ['$$$','$/FF','$/Acre'], entities: ['project','area','phase','parcel','lot'] },
      { code: 'USE-STG3-ONS', kind: 'Use', class: 'Stage 3', event: 'Onsites', uoms: ['$$$','$/FF','$/Acre'], entities: ['project','area','phase','parcel','lot'] },
      { code: 'USE-PRJ-MGMT', kind: 'Use', class: 'Project', event: 'Management Fees', uoms: ['% of','$$$'], entities: ['project'] },
      { code: 'SRC-REV-SAL-PARC', kind: 'Source', class: 'Revenue', event: 'Sale Parcels', uoms: ['$/Acre'], entities: ['project','area','phase','parcel'] }
    ]

    let created = 0
    for (const s of starters) {
      const cat = await sql`INSERT INTO landscape.core_fin_category (code, kind, class, event, is_active) VALUES (${s.code}, ${s.kind}, ${s.class}, ${s.event}, true)
                            ON CONFLICT (code) DO UPDATE SET kind = EXCLUDED.kind RETURNING category_id` 
      const id = cat?.[0]?.category_id
      if (!id) continue
      created++
      await sql`DELETE FROM landscape.core_fin_category_uom WHERE category_id = ${id}`
      for (const u of s.uoms) await sql`INSERT INTO landscape.core_fin_category_uom (category_id, uom_code) VALUES (${id}, ${u}) ON CONFLICT DO NOTHING`
      await sql`DELETE FROM landscape.core_fin_pe_applicability WHERE category_id = ${id}`
      for (const p of s.entities) await sql`INSERT INTO landscape.core_fin_pe_applicability (category_id, pe_level) VALUES (${id}, ${p}::landscape.pe_level) ON CONFLICT DO NOTHING`
    }

    return NextResponse.json({ ok: true, uoms: uoms.length, categories: created })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Seed error:', e)
    return NextResponse.json({ error: 'Seed failed', details: msg }, { status: 500 })
  }
}

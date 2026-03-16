import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    console.log('🏛️ Adding missing Institutional land use codes...')

    const institutionalCodes = [
      { code: 'SCHOOL-HE', type: 'Higher Education', name: 'Higher Education', desc: 'Colleges and universities', subtypeId: 28 },
      { code: 'GOV', type: 'Government', name: 'Government', desc: 'Government institutional facilities', subtypeId: 29 },
      { code: 'CIVIC', type: 'Civic', name: 'Civic', desc: 'Civic and community facilities', subtypeId: 30 },
      { code: 'RELIGIOUS', type: 'Religious', name: 'Religious', desc: 'Religious institutions', subtypeId: 31 },
      { code: 'SCHOOL-K12', type: 'K-12 School', name: 'K-12 School', desc: 'Elementary and secondary schools', subtypeId: 32 }
    ]

    const results = []

    for (const landuse of institutionalCodes) {
      try {
        const result = await sql`
          INSERT INTO landscape.tbl_landuse (landuse_code, landuse_type, name, description, active, subtype_id)
          VALUES (${landuse.code}, ${landuse.type}, ${landuse.name}, ${landuse.desc}, true, ${landuse.subtypeId})
          ON CONFLICT (landuse_code) DO UPDATE SET
            landuse_type = EXCLUDED.landuse_type,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            subtype_id = EXCLUDED.subtype_id
          RETURNING landuse_id, landuse_code, name
        `
        results.push({ code: landuse.code, status: 'success', data: result[0] })
        console.log(`✅ Added/Updated: ${landuse.code} - ${landuse.name}`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ code: landuse.code, status: 'error', error: message })
        console.error(`❌ Failed to add ${landuse.code}:`, message)
      }
    }

    return NextResponse.json({
      message: 'Institutional land use codes processed',
      results
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('❌ API failed:', message)
    return NextResponse.json({
      error: 'Failed to add Institutional codes',
      details: message
    }, { status: 500 })
  }
}
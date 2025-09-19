import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    console.log('🏭 Adding missing Industrial land use codes...')

    const industrialCodes = [
      { code: 'WHS', type: 'Warehouse', name: 'Warehouse', desc: 'Warehouse and logistics facilities', subtypeId: 8 },
      { code: 'MFG', type: 'Manufacturing', name: 'Manufacturing', desc: 'Manufacturing and production facilities', subtypeId: 9 },
      { code: 'DIST', type: 'Distribution', name: 'Distribution', desc: 'Distribution and fulfillment centers', subtypeId: 10 }
    ]

    const results = []

    for (const landuse of industrialCodes) {
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
      } catch (error) {
        results.push({ code: landuse.code, status: 'error', error: error.message })
        console.error(`❌ Failed to add ${landuse.code}:`, error.message)
      }
    }

    return NextResponse.json({
      message: 'Industrial land use codes processed',
      results
    })

  } catch (error) {
    console.error('❌ API failed:', error)
    return NextResponse.json({
      error: 'Failed to add Industrial codes',
      details: error.message
    }, { status: 500 })
  }
}
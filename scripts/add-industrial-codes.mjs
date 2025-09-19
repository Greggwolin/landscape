#!/usr/bin/env node

// Script to add missing Industrial land use codes to the database
import { sql } from '../src/lib/db.ts'

async function addIndustrialCodes() {
  try {
    console.log('🏭 Adding missing Industrial land use codes...')

    const industrialCodes = [
      { code: 'WHS', type: 'Warehouse', name: 'Warehouse', desc: 'Warehouse and logistics facilities', subtypeId: 8 },
      { code: 'MFG', type: 'Manufacturing', name: 'Manufacturing', desc: 'Manufacturing and production facilities', subtypeId: 9 },
      { code: 'DIST', type: 'Distribution', name: 'Distribution', desc: 'Distribution and fulfillment centers', subtypeId: 10 }
    ]

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
        console.log(`✅ Added/Updated: ${landuse.code} - ${landuse.name}`)
        console.log(`   Result:`, result[0])
      } catch (error) {
        console.error(`❌ Failed to add ${landuse.code}:`, error.message)
      }
    }

    console.log('\n🎉 Industrial land use codes have been added to the database!')
    console.log('You can now save parcels with Industrial family selections.')

  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

addIndustrialCodes()
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST() {
  try {
    console.log('🔧 Adding all missing land use codes...')

    const missingCodes = [
      // Residential (Family 1)
      { code: 'BTR', type: 'Build-to-Rent', name: 'Build-to-Rent', desc: 'Build-to-rent single family homes', subtypeId: 2 },
      { code: 'SFA', type: 'Single Family Attached', name: 'Single Family Attached', desc: 'Single family attached homes', subtypeId: 3 },
      { code: 'CONDO', type: 'Condominium', name: 'Condominium', desc: 'Condominium units', subtypeId: 4 },

      // Common Areas (Family 4)
      { code: 'PARK', type: 'Parks', name: 'Parks', desc: 'Parks and recreational areas', subtypeId: 11 },
      { code: 'CLUB', type: 'Clubhouse', name: 'Clubhouse', desc: 'Community clubhouse facilities', subtypeId: 12 },
      { code: 'LAND', type: 'Landscape', name: 'Landscape', desc: 'Landscaped common areas', subtypeId: 13 },
      { code: 'TRACT', type: 'Common Tract', name: 'Common Tract', desc: 'Common tract areas', subtypeId: 14 },
      { code: 'DRAIN', type: 'Drainage', name: 'Drainage', desc: 'Drainage and stormwater facilities', subtypeId: 15 },

      // Public (Family 5)
      { code: 'SCHOOL', type: 'School', name: 'School', desc: 'Public school facilities', subtypeId: 16 },
      { code: 'GOVT', type: 'Government', name: 'Government', desc: 'Government facilities', subtypeId: 17 },
      { code: 'REC', type: 'Recreation', name: 'Recreation', desc: 'Public recreation facilities', subtypeId: 18 },
      { code: 'UTIL', type: 'Utilities', name: 'Utilities', desc: 'Public utility facilities', subtypeId: 19 },

      // Other (Family 6)
      { code: 'MIX', type: 'Mixed', name: 'Mixed', desc: 'Mixed use development', subtypeId: 20 },
      { code: 'DC', type: 'Data Center', name: 'Data Center', desc: 'Data center facilities', subtypeId: 21 },
      { code: 'SOLAR', type: 'Solar', name: 'Solar', desc: 'Solar energy facilities', subtypeId: 22 },

      // Institutional (Family 8)
      { code: 'SCHOOL-HE', type: 'Higher Education', name: 'Higher Education', desc: 'Colleges and universities', subtypeId: 23 },
      { code: 'GOV', type: 'Government', name: 'Government', desc: 'Government institutional facilities', subtypeId: 24 },
      { code: 'CIVIC', type: 'Civic', name: 'Civic', desc: 'Civic and community facilities', subtypeId: 25 },
      { code: 'RELIGIOUS', type: 'Religious', name: 'Religious', desc: 'Religious institutions', subtypeId: 26 },
      { code: 'SCHOOL-K12', type: 'K-12 School', name: 'K-12 School', desc: 'Elementary and secondary schools', subtypeId: 27 },
      { code: 'HEALTHCARE', type: 'Healthcare', name: 'Healthcare', desc: 'Healthcare facilities', subtypeId: 28 }
    ]

    const results = []

    for (const landuse of missingCodes) {
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
      message: 'Missing land use codes processed',
      total: missingCodes.length,
      results
    })

  } catch (error) {
    console.error('❌ API failed:', error)
    return NextResponse.json({
      error: 'Failed to add missing codes',
      details: error.message
    }, { status: 500 })
  }
}
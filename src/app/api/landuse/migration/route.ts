// api/landuse/migration/route.ts
// Data migration tool for converting existing landuse_code data to four-field taxonomy

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

interface MigrationReport {
  totalParcels: number
  migratedParcels: number
  unmappedCodes: string[]
  errors: string[]
  mappings: { [key: string]: TaxonomyMapping }
}

interface ParcelRecord {
  parcel_id: number
  landuse_code: string
  project_id: number | string | null
}

interface TaxonomyIds {
  family_id: number
  density_id: number
  type_id: number
}

interface TaxonomyMapping {
  family_name: string
  density_code: string
  type_code: string
  product_code?: string
  legacy_landuse_code: string
}

// Default mapping rules for common land use codes
const DEFAULT_MAPPINGS: { [key: string]: TaxonomyMapping } = {
  'LDR': {
    family_name: 'Residential',
    density_code: 'Low',
    type_code: 'Single Family',
    legacy_landuse_code: 'LDR'
  },
  'MDR': {
    family_name: 'Residential',
    density_code: 'Medium',
    type_code: 'Single Family',
    legacy_landuse_code: 'MDR'
  },
  'HDR': {
    family_name: 'Residential',
    density_code: 'High',
    type_code: 'Multi Family',
    legacy_landuse_code: 'HDR'
  },
  'MHDR': {
    family_name: 'Residential',
    density_code: 'Very High',
    type_code: 'Multi Family',
    legacy_landuse_code: 'MHDR'
  },
  'C': {
    family_name: 'Commercial',
    density_code: 'Standard',
    type_code: 'Retail',
    legacy_landuse_code: 'C'
  },
  'MU': {
    family_name: 'Mixed Use',
    density_code: 'Medium',
    type_code: 'Residential Commercial',
    legacy_landuse_code: 'MU'
  },
  'OS': {
    family_name: 'Open Space',
    density_code: 'N/A',
    type_code: 'Park',
    legacy_landuse_code: 'OS'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dryRun = false, projectId } = await request.json()

    const report: MigrationReport = {
      totalParcels: 0,
      migratedParcels: 0,
      unmappedCodes: [],
      errors: [],
      mappings: {}
    }

    // Get all parcels that need migration
    const parcelsQuery = `
      SELECT p.parcel_id, p.landuse_code, p.project_id
      FROM landscape.tbl_parcel p
      WHERE p.landuse_code IS NOT NULL
      ${projectId ? 'AND p.project_id = $1' : ''}
      ORDER BY p.parcel_id
    `

    const parcelsResult = projectId
      ? await pool.query<ParcelRecord>(parcelsQuery, [projectId])
      : await pool.query<ParcelRecord>(parcelsQuery)

    report.totalParcels = parcelsResult.rows.length

    if (report.totalParcels === 0) {
      return NextResponse.json({
        ...report,
        message: 'No parcels found that need migration'
      })
    }

    // Group parcels by landuse_code to create mappings
    const codeGroups: Record<string, ParcelRecord[]> = {}
    parcelsResult.rows.forEach(parcel => {
      const code = parcel.landuse_code
      if (!codeGroups[code]) {
        codeGroups[code] = []
      }
      codeGroups[code].push(parcel)
    })

    // Create or validate mappings for each land use code
    for (const code of Object.keys(codeGroups)) {
      if (DEFAULT_MAPPINGS[code]) {
        report.mappings[code] = DEFAULT_MAPPINGS[code]
      } else {
        // Try to find existing taxonomy mapping
        const existingMapping = await findExistingTaxonomyMapping(code)
        if (existingMapping) {
          report.mappings[code] = existingMapping
        } else {
          report.unmappedCodes.push(code)
          report.mappings[code] = {
            family_name: 'Unknown',
            density_code: 'Unknown',
            type_code: code,
            legacy_landuse_code: code
          }
        }
      }
    }

    if (!dryRun) {
      // Perform actual migration
      for (const [code, parcels] of Object.entries(codeGroups)) {
        const mapping = report.mappings[code]

        try {
          // Find or create taxonomy IDs
          const taxonomyIds = await ensureTaxonomyEntries(mapping)

          // Update parcels with new taxonomy fields
          for (const parcel of parcels) {
            await updateParcelTaxonomy(parcel.parcel_id, taxonomyIds, mapping)
            report.migratedParcels++
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          report.errors.push(`Failed to migrate code ${code}: ${errorMsg}`)
        }
      }
    }

    return NextResponse.json({
      ...report,
      message: dryRun
        ? 'Migration analysis complete (dry run)'
        : `Migration complete. ${report.migratedParcels}/${report.totalParcels} parcels migrated.`
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

async function findExistingTaxonomyMapping(code: string): Promise<TaxonomyMapping | null> {
  try {
    // Look for existing land use code in tbl_landuse with taxonomy relationships
    const query = `
      SELECT
        l.landuse_code,
        f.name as family_name,
        s.code as density_code,
        l.name as type_name
      FROM landscape.tbl_landuse l
      LEFT JOIN landscape.lu_subtype s ON l.subtype_id = s.subtype_id
      LEFT JOIN landscape.lu_family f ON s.family_id = f.family_id
      WHERE l.landuse_code = $1 AND l.active = true
      LIMIT 1
    `

    const result = await pool.query(query, [code])

    if (result.rows.length > 0) {
      const row = result.rows[0]
      return {
        family_name: row.family_name || 'Unknown',
        density_code: row.density_code || 'Unknown',
        type_code: row.type_name || code,
        legacy_landuse_code: code
      }
    }

    return null
  } catch (error) {
    console.error('Error finding existing mapping:', error)
    return null
  }
}

async function ensureTaxonomyEntries(mapping: TaxonomyMapping): Promise<TaxonomyIds> {
  // Find or create family
  const familyResult = await pool.query(
    'SELECT family_id FROM landscape.lu_family WHERE name = $1',
    [mapping.family_name]
  )

  let familyId: number
  if (familyResult.rows.length === 0) {
    const insertFamily = await pool.query(
      'INSERT INTO landscape.lu_family (code, name, active) VALUES ($1, $2, true) RETURNING family_id',
      [mapping.family_name.substring(0, 3).toUpperCase(), mapping.family_name]
    )
    familyId = insertFamily.rows[0].family_id
  } else {
    familyId = familyResult.rows[0].family_id
  }

  // Find or create density (using subtype table)
  const densityResult = await pool.query(
    'SELECT subtype_id FROM landscape.lu_subtype WHERE family_id = $1 AND name = $2',
    [familyId, mapping.density_code]
  )

  let densityId: number
  if (densityResult.rows.length === 0) {
    const insertDensity = await pool.query(
      'INSERT INTO landscape.lu_subtype (family_id, code, name, ord, active) VALUES ($1, $2, $3, 1, true) RETURNING subtype_id',
      [familyId, mapping.density_code.substring(0, 3).toUpperCase(), mapping.density_code]
    )
    densityId = insertDensity.rows[0].subtype_id
  } else {
    densityId = densityResult.rows[0].subtype_id
  }

  // Find or create type (using tbl_landuse)
  const typeResult = await pool.query(
    'SELECT landuse_id FROM landscape.tbl_landuse WHERE subtype_id = $1 AND name = $2',
    [densityId, mapping.type_code]
  )

  let typeId: number
  if (typeResult.rows.length === 0) {
    const insertType = await pool.query(
      'INSERT INTO landscape.tbl_landuse (landuse_code, subtype_id, name, active) VALUES ($1, $2, $3, true) RETURNING landuse_id',
      [mapping.legacy_landuse_code, densityId, mapping.type_code]
    )
    typeId = insertType.rows[0].landuse_id
  } else {
    typeId = typeResult.rows[0].landuse_id
  }

  return {
    family_id: familyId,
    density_id: densityId,
    type_id: typeId
  }
}

async function updateParcelTaxonomy(parcelId: number, taxonomyIds: TaxonomyIds, mapping: TaxonomyMapping) {
  // For now, we'll add the taxonomy data as JSON in a notes field or similar
  // In a full implementation, you'd add proper taxonomy fields to tbl_parcel

  const taxonomyData = {
    family_name: mapping.family_name,
    density_code: mapping.density_code,
    type_code: mapping.type_code,
    product_code: mapping.product_code,
    legacy_landuse_code: mapping.legacy_landuse_code,
    taxonomy_ids: taxonomyIds
  }

  // Update parcel with taxonomy metadata (this is a simplified approach)
  await pool.query(
    `UPDATE landscape.tbl_parcel
     SET landuse_type = $1
     WHERE parcel_id = $2`,
    [JSON.stringify(taxonomyData), parcelId]
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'status') {
      // Return migration status
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM landscape.tbl_parcel
        WHERE landuse_code IS NOT NULL
      `

      const migratedQuery = `
        SELECT COUNT(*) as migrated
        FROM landscape.tbl_parcel
        WHERE landuse_type IS NOT NULL
        AND landuse_type::text LIKE '%taxonomy_ids%'
      `

      const totalResult = await pool.query(totalQuery)
      const migratedResult = await pool.query(migratedQuery)

      return NextResponse.json({
        total: parseInt(totalResult.rows[0].total),
        migrated: parseInt(migratedResult.rows[0].migrated),
        pending: parseInt(totalResult.rows[0].total) - parseInt(migratedResult.rows[0].migrated)
      })
    }

    if (action === 'mappings') {
      // Return current mapping configuration
      return NextResponse.json({
        defaultMappings: DEFAULT_MAPPINGS,
        message: 'Default taxonomy mappings for migration'
      })
    }

    return NextResponse.json({
      error: 'Invalid action. Use ?action=status or ?action=mappings'
    }, { status: 400 })

  } catch (error) {
    console.error('Migration status error:', error)
    return NextResponse.json({
      error: 'Failed to get migration status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface ParcelBoundary {
  parcelId: string
  geometry: GeoJSON.Geometry
  grossAcres: number
  ownerName?: string
  siteAddress?: string
}

interface RequestBody {
  parcels: ParcelBoundary[]
  dissolvedBoundary?: GeoJSON.Geometry
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body: RequestBody = await request.json()
    const { parcels, dissolvedBoundary } = body

    if (!parcels || !Array.isArray(parcels) || parcels.length === 0) {
      return NextResponse.json({ error: 'No parcels provided' }, { status: 400 })
    }

    console.log(`Saving ${parcels.length} parcel boundaries for project ${projectId}`)

    // Calculate total acres
    const totalAcres = parcels.reduce((sum, parcel) => sum + parcel.grossAcres, 0)

    // Start transaction
    await query('BEGIN')

    try {
      // Clear existing project boundaries
      await query(
        'DELETE FROM landscape.project_boundaries WHERE project_id = $1',
        [projectId]
      )

      // Insert project summary record
      const projectBoundaryResult = await query(
        `INSERT INTO landscape.project_boundaries
         (project_id, parcel_count, total_acres, dissolved_geometry, created_at)
         VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), NOW())
         RETURNING boundary_id`,
        [projectId, parcels.length, totalAcres, JSON.stringify(dissolvedBoundary)]
      )

      const boundaryId = projectBoundaryResult.rows[0].boundary_id

      // Insert individual parcel records
      for (const parcel of parcels) {
        await query(
          `INSERT INTO landscape.project_parcel_boundaries
           (boundary_id, project_id, parcel_id, geometry, gross_acres, owner_name, site_address, created_at)
           VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), $5, $6, $7, NOW())`,
          [
            boundaryId,
            projectId,
            parcel.parcelId,
            JSON.stringify(parcel.geometry),
            parcel.grossAcres,
            parcel.ownerName,
            parcel.siteAddress
          ]
        )
      }

      // Update project total acres
      await query(
        'UPDATE landscape.tbl_project SET acres_gross = $1 WHERE project_id = $2',
        [totalAcres, projectId]
      )

      await query('COMMIT')

      console.log(`Successfully saved ${parcels.length} parcels (${totalAcres.toFixed(2)} acres) for project ${projectId}`)

      return NextResponse.json({
        success: true,
        boundaryId,
        parcelCount: parcels.length,
        totalAcres,
        message: `Project boundaries saved successfully`
      })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error saving project boundaries:', error)
    return NextResponse.json(
      { error: 'Failed to save project boundaries', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get project boundaries
    const boundariesResult = await query(
      `SELECT pb.*,
              ST_AsGeoJSON(pb.dissolved_geometry) as dissolved_geojson,
              pb.created_at
       FROM landscape.project_boundaries pb
       WHERE pb.project_id = $1
       ORDER BY pb.created_at DESC
       LIMIT 1`,
      [projectId]
    )

    if (boundariesResult.rows.length === 0) {
      return NextResponse.json({
        boundaries: null,
        parcels: [],
        message: 'No boundaries defined for this project'
      })
    }

    const boundary = boundariesResult.rows[0]

    // Get individual parcels
    const parcelsResult = await query(
      `SELECT ppb.*,
              ST_AsGeoJSON(ppb.geometry) as geojson
       FROM landscape.project_parcel_boundaries ppb
       WHERE ppb.boundary_id = $1
       ORDER BY ppb.parcel_id`,
      [boundary.boundary_id]
    )

    const parcels = parcelsResult.rows.map(row => ({
      parcelId: row.parcel_id,
      geometry: JSON.parse(row.geojson),
      grossAcres: parseFloat(row.gross_acres),
      ownerName: row.owner_name,
      siteAddress: row.site_address
    }))

    return NextResponse.json({
      boundaries: {
        boundaryId: boundary.boundary_id,
        parcelCount: boundary.parcel_count,
        totalAcres: parseFloat(boundary.total_acres),
        dissolvedGeometry: boundary.dissolved_geojson ? JSON.parse(boundary.dissolved_geojson) : null,
        createdAt: boundary.created_at
      },
      parcels
    })

  } catch (error) {
    console.error('Error fetching project boundaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project boundaries' },
      { status: 500 }
    )
  }
}
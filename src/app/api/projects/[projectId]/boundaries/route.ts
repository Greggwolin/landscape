import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

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
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = parseInt(resolvedParams.projectId)
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
    await sql`BEGIN`

    try {
      // Clear existing project boundaries
      await sql`DELETE FROM landscape.project_boundaries WHERE project_id = ${projectId}`

      // Insert project summary record
      const projectBoundaryResult = await sql`
        INSERT INTO landscape.project_boundaries
         (project_id, parcel_count, total_acres, dissolved_geometry, created_at)
         VALUES (${projectId}, ${parcels.length}, ${totalAcres}, ST_GeomFromGeoJSON(${JSON.stringify(dissolvedBoundary)}), NOW())
         RETURNING boundary_id`

      const boundaryId = projectBoundaryResult[0].boundary_id

      // Insert individual parcel records
      for (const parcel of parcels) {
        await sql`
          INSERT INTO landscape.project_parcel_boundaries
           (boundary_id, project_id, parcel_id, geometry, gross_acres, owner_name, site_address, created_at)
           VALUES (${boundaryId}, ${projectId}, ${parcel.parcelId}, ST_GeomFromGeoJSON(${JSON.stringify(parcel.geometry)}), ${parcel.grossAcres}, ${parcel.ownerName}, ${parcel.siteAddress}, NOW())`
      }

      // Update project total acres
      await sql`UPDATE landscape.tbl_project SET acres_gross = ${totalAcres} WHERE project_id = ${projectId}`

      await sql`COMMIT`

      console.log(`Successfully saved ${parcels.length} parcels (${totalAcres.toFixed(2)} acres) for project ${projectId}`)

      return NextResponse.json({
        success: true,
        boundaryId,
        parcelCount: parcels.length,
        totalAcres,
        message: `Project boundaries saved successfully`
      })

    } catch (error) {
      await sql`ROLLBACK`
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
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params
    const projectId = parseInt(resolvedParams.projectId)
    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get project boundaries
    const boundariesResult = await sql`
      SELECT pb.*,
              ST_AsGeoJSON(pb.dissolved_geometry) as dissolved_geojson,
              pb.created_at
       FROM landscape.project_boundaries pb
       WHERE pb.project_id = ${projectId}
       ORDER BY pb.created_at DESC
       LIMIT 1`

    if (boundariesResult.length === 0) {
      return NextResponse.json({
        boundaries: null,
        parcels: [],
        message: 'No boundaries defined for this project'
      })
    }

    const boundary = boundariesResult[0]

    // Get individual parcels
    const parcelsResult = await sql`
      SELECT ppb.*,
              ST_AsGeoJSON(ppb.geometry) as geojson
       FROM landscape.project_parcel_boundaries ppb
       WHERE ppb.boundary_id = ${boundary.boundary_id}
       ORDER BY ppb.parcel_id`

    const parcels = parcelsResult.map(row => ({
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
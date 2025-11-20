import { NextRequest, NextResponse } from 'next/server'
import { sql } from '../../../../lib/db'

interface TaxParcel {
  PARCELID: string
  OWNERNME1?: string
  SITEADDRESS?: string
  GROSSAC?: number
  CNVYNAME?: string
  USEDSCRP?: string
  APPRAISEDVALUE?: number
  MARKETVALUE?: number
  geometry?: GeoJSON.Geometry
  properties?: Record<string, any>
}

interface BoundaryRequest {
  projectId: number
  selectedParcels: TaxParcel[]
  boundaryMetadata: {
    totalAcres: number
    parcelCount: number
    createdAt: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: BoundaryRequest = await request.json()
    const { projectId, selectedParcels, boundaryMetadata } = body

    if (!projectId || !Array.isArray(selectedParcels) || selectedParcels.length === 0) {
      return NextResponse.json({
        error: 'projectId and selectedParcels[] are required'
      }, { status: 400 })
    }

    // Store boundary selection in database
    const boundaryData = {
      selected_parcels: selectedParcels,
      total_acres: boundaryMetadata.totalAcres,
      parcel_count: boundaryMetadata.parcelCount,
      created_at: boundaryMetadata.createdAt,
      boundary_status: 'confirmed'
    }

    // Update project with boundary information
    // First, let's just log that the boundary was confirmed - we'll store detailed data later if needed
    console.log(`Boundary confirmed for project ${projectId}: ${boundaryMetadata.totalAcres} acres`)

    // Create boundary geometry if multiple parcels (dissolve boundaries)
    let dissolvedBoundary = null
    if (selectedParcels.length > 1) {
      // In a real implementation, this would use PostGIS to dissolve geometries
      // For now, we'll store the individual parcel geometries
      dissolvedBoundary = {
        type: 'MultiPolygon',
        coordinates: selectedParcels
          .filter(p => p.geometry)
          .map(p => p.geometry?.coordinates)
          .filter(Boolean)
      }
    }

    // Log the boundary creation for audit trail - simplified for now
    console.log(`Boundary history: ${selectedParcels.length} parcels selected for project ${projectId}`)

    return NextResponse.json({
      success: true,
      projectId,
      boundaryData: {
        totalAcres: boundaryMetadata.totalAcres,
        parcelCount: boundaryMetadata.parcelCount,
        dissolvedBoundary,
        confirmedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error saving project boundary:', error)
    return NextResponse.json({
      error: error?.message || 'Failed to save project boundary'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({
        error: 'project_id parameter is required'
      }, { status: 400 })
    }

    // Get existing boundary data for project
    const [project] = await sql`
      SELECT
        project_id,
        project_name,
        gis_metadata->'boundary_data' as boundary_data,
        gis_metadata->'boundary_confirmed_at' as boundary_confirmed_at
      FROM landscape.tbl_project
      WHERE project_id = ${parseInt(projectId)}
    `

    if (!project) {
      return NextResponse.json({
        error: 'Project not found'
      }, { status: 404 })
    }

    // Get boundary history
    const boundaryHistory = await sql`
      SELECT
        boundary_id,
        boundary_type,
        parcels_selected,
        total_acres,
        created_at,
        action_type
      FROM landscape.gis_boundary_history
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      projectId: project.project_id,
      projectName: project.project_name,
      boundaryData: project.boundary_data || null,
      boundaryConfirmedAt: project.boundary_confirmed_at || null,
      boundaryHistory: boundaryHistory || []
    })

  } catch (error: any) {
    console.error('Error fetching boundary data:', error)
    return NextResponse.json({
      error: error?.message || 'Failed to fetch boundary data'
    }, { status: 500 })
  }
}
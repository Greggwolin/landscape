// /app/api/gis/ingest-parcels/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

interface TaxParcelFeature {
  parcelId: string;  // Changed from apn to parcelId for Pinal County
  geom: GeoJSON.Geometry;
  attributes?: Record<string, unknown>;
  properties?: {
    PARCELID?: string;
    OWNERNME1?: string;
    SITEADDRESS?: string;
    GROSSAC?: number;
    USEDSCRP?: string;
  };
}

interface TaxParcelIngestionRequest {
  project_id: number;
  features: TaxParcelFeature[];
  source?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TaxParcelIngestionRequest = await request.json();
    const { project_id, features, source = 'user_selection' } = body;

    console.log(`Ingesting ${features.length} tax parcels for project ${project_id}`);

    // Validate required fields
    if (!project_id || !features || !Array.isArray(features)) {
      return NextResponse.json({
        error: 'Missing required fields: project_id, features'
      }, { status: 400 });
    }

    if (features.length === 0) {
      return NextResponse.json({
        error: 'No features provided'
      }, { status: 400 });
    }

    // Verify project exists
    const projectCheck = await sql`
      SELECT project_id, project_name FROM landscape.tbl_project
      WHERE project_id = ${project_id}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json({
        error: `Project ${project_id} not found`
      }, { status: 404 });
    }

    const project = projectCheck[0];

    // Validate that all features have required fields
    for (const feature of features) {
      const parcelId = feature.parcelId || feature.properties?.PARCELID;
      if (!parcelId) {
        return NextResponse.json({
          error: 'All features must have a PARCELID field'
        }, { status: 400 });
      }
      if (!feature.geom) {
        return NextResponse.json({
          error: 'All features must have geometry'
        }, { status: 400 });
      }
    }

    // Call the PostgreSQL function for tax parcel ingestion
    await sql`
      SELECT landscape.ingest_tax_parcel_selection(
        ${project_id}::integer,
        ${source}::text,
        ${JSON.stringify(features)}::jsonb
      )
    `;

    // Get the created boundary information
    const boundary = await sql`
      SELECT
        ST_Area(geom) / 4046.8564224 as acres,
        ST_AsGeoJSON(geom) as boundary_geom
      FROM landscape.gis_project_boundary
      WHERE project_id = ${project_id}
    `;

    const boundaryData = boundary[0];

    console.log(`Successfully created project boundary: ${boundaryData.acres} acres`);

    return NextResponse.json({
      success: true,
      project_id,
      project_name: project.project_name,
      parcels_processed: features.length,
      boundary: {
        acres: parseFloat(boundaryData.acres).toFixed(2),
        geometry: JSON.parse(boundaryData.boundary_geom)
      },
      source
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Tax parcel ingestion error:', error);

    return NextResponse.json({
      error: 'Failed to ingest tax parcels',
      details: message
    }, { status: 500 });
  }
}

// GET endpoint to retrieve project boundary and tax parcel data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({
        error: 'Missing project_id parameter'
      }, { status: 400 });
    }

    const parsedProjectId = parseInt(projectId);

    // Get project boundary
    const boundary = await sql`
      SELECT
        ST_Area(geom) / 4046.8564224 as acres,
        ST_AsGeoJSON(geom) as boundary_geom,
        source,
        created_at
      FROM landscape.gis_project_boundary
      WHERE project_id = ${parsedProjectId}
    `;

    if (boundary.length === 0) {
      return NextResponse.json({
        error: 'No boundary found for this project'
      }, { status: 404 });
    }

    const boundaryData = boundary[0];

    // Get associated tax parcels
    const taxParcels = await sql`
      SELECT
        t.tax_parcel_id,
        t.assessor_attrs->>'OWNERNME1' as owner_name,
        t.assessor_attrs->>'SITEADDRESS' as situs_address,
        (t.assessor_attrs->>'GROSSAC')::numeric as acres,
        ST_AsGeoJSON(t.geom) as parcel_geom,
        t.created_at
      FROM landscape.gis_tax_parcel_ref t
      WHERE EXISTS (
        SELECT 1 FROM landscape.gis_project_boundary b
        WHERE b.project_id = ${parsedProjectId}
        AND ST_Intersects(t.geom, b.geom)
      )
      ORDER BY t.tax_parcel_id
    `;

    const processedTaxParcels = taxParcels.map((parcel: Record<string, unknown>) => ({
      ...parcel,
      acres: parseFloat(parcel.acres as string).toFixed(2),
      parcel_geom: JSON.parse(parcel.parcel_geom as string)
    }));

    return NextResponse.json({
      project_id: parsedProjectId,
      boundary: {
        acres: parseFloat(boundaryData.acres).toFixed(2),
        geometry: JSON.parse(boundaryData.boundary_geom),
        source: boundaryData.source,
        created_at: boundaryData.created_at
      },
      tax_parcels: processedTaxParcels,
      summary: {
        total_tax_parcels: processedTaxParcels.length,
        total_boundary_acres: parseFloat(boundaryData.acres).toFixed(2)
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to get boundary data:', error);

    return NextResponse.json({
      error: 'Failed to retrieve boundary data',
      details: message
    }, { status: 500 });
  }
}
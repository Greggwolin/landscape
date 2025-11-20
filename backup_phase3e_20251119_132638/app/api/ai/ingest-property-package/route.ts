// /app/api/ai/ingest-property-package/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

interface PropertyPackageDocument {
  filename: string;
  type: 'site_plan' | 'pricing_sheet' | 'regulation_summary';
  ai_analysis: {
    parcels: Array<{
      parcel_code: string;
      land_use: string;
      acres: number;
      units?: number;
      confidence?: number;
      geom?: GeoJSON.Geometry;
    }>;
    confidence_overall?: number;
    processing_notes?: string;
  };
}

interface PropertyPackageRequest {
  project_id: number;
  package_name: string;
  documents: PropertyPackageDocument[];
  user_choice: 'simple' | 'master_plan';
}

export async function POST(request: NextRequest) {
  try {
    const body: PropertyPackageRequest = await request.json();
    const { project_id, package_name, documents, user_choice } = body;

    console.log(`Processing property package "${package_name}" for project ${project_id} with ${user_choice} structure`);

    // Validate required fields
    if (!project_id || !package_name || !documents || !Array.isArray(documents)) {
      return NextResponse.json({
        error: 'Missing required fields: project_id, package_name, documents'
      }, { status: 400 });
    }

    // Verify project exists
    const projectCheck = await sql`
      SELECT project_id FROM landscape.tbl_project WHERE project_id = ${project_id}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json({
        error: `Project ${project_id} not found`
      }, { status: 404 });
    }

    // Call the PostgreSQL function for AI property package ingestion
    const results = await sql`
      SELECT landscape.ingest_ai_property_package(
        ${project_id}::integer,
        ${package_name}::text,
        ${JSON.stringify(documents)}::jsonb,
        ${user_choice}::text
      ) as results
    `;

    const ingestionResults = results[0].results;

    console.log('Ingestion completed:', ingestionResults);

    // Return the results with creation statistics
    return NextResponse.json({
      success: true,
      project_id,
      package_name,
      user_choice,
      results: {
        parcels_created: ingestionResults.parcels_created,
        geometry_added: ingestionResults.geometry_added,
        areas_created: ingestionResults.areas_created || 0,
        phases_created: ingestionResults.phases_created || 0,
        errors: ingestionResults.errors || []
      },
      documents_processed: documents.length
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('AI property package ingestion error:', error);

    return NextResponse.json({
      error: 'Failed to process property package',
      details: message
    }, { status: 500 });
  }
}

// GET endpoint to retrieve ingestion history for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({
        error: 'Missing project_id parameter'
      }, { status: 400 });
    }

    const history = await sql`
      SELECT
        id,
        package_name,
        document_type,
        filename,
        parcels_created,
        geometry_added,
        status,
        error_details,
        processed_at,
        created_at
      FROM landscape.gis_document_ingestion
      WHERE project_id = ${parseInt(projectId)}
      ORDER BY processed_at DESC, created_at DESC
    `;

    return NextResponse.json({
      project_id: parseInt(projectId),
      ingestion_history: history
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch ingestion history:', error);

    return NextResponse.json({
      error: 'Failed to fetch ingestion history',
      details: message
    }, { status: 500 });
  }
}
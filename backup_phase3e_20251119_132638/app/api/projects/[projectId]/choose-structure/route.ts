// /app/api/projects/[id]/choose-structure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

interface ProjectStructureRequest {
  structure_type: 'simple' | 'master_plan';
  metadata?: {
    reason?: string;
    notes?: string;
  };
}

interface ProjectStructureParams {
  params: Promise<{
    projectId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: ProjectStructureParams) {
  try {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const body: ProjectStructureRequest = await request.json();
    const { structure_type, metadata = {} } = body;

    console.log(`Setting project ${projectId} structure to: ${structure_type}`);

    // Validate structure type
    if (!structure_type || !['simple', 'master_plan'].includes(structure_type)) {
      return NextResponse.json({
        error: 'Invalid structure_type. Must be "simple" or "master_plan"'
      }, { status: 400 });
    }

    // Verify project exists
    const projectCheck = await sql`
      SELECT project_id, project_name FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json({
        error: `Project ${projectId} not found`
      }, { status: 404 });
    }

    const project = projectCheck[0];

    // Check if project already has parcels - warn if changing structure
    const existingParcels = await sql`
      SELECT COUNT(*) as count FROM landscape.tbl_parcel
      WHERE project_id = ${projectId}
    `;

    const hasExistingData = existingParcels[0].count > 0;

    // Update project with structure choice and metadata
    const structureMetadata = {
      structure_type,
      chosen_at: new Date().toISOString(),
      has_existing_data: hasExistingData,
      ...metadata
    };

    await sql`
      UPDATE landscape.tbl_project
      SET gis_metadata = COALESCE(gis_metadata, '{}'::jsonb) || ${JSON.stringify(structureMetadata)}::jsonb
      WHERE project_id = ${projectId}
    `;

    console.log(`Project ${projectId} structure set to ${structure_type}`);

    return NextResponse.json({
      success: true,
      project_id: projectId,
      project_name: project.project_name,
      structure_type,
      has_existing_data: hasExistingData,
      warning: hasExistingData ?
        'Project already has parcel data. Structure change may affect existing organization.' :
        null,
      metadata: structureMetadata
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Project structure choice error:', error);

    return NextResponse.json({
      error: 'Failed to set project structure',
      details: message
    }, { status: 500 });
  }
}

// GET endpoint to retrieve current structure choice
export async function GET(request: NextRequest, { params }: ProjectStructureParams) {
  try {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);

    const project = await sql`
      SELECT
        project_id,
        project_name,
        gis_metadata
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `;

    if (project.length === 0) {
      return NextResponse.json({
        error: `Project ${projectId} not found`
      }, { status: 404 });
    }

    const projectData = project[0];
    const gisMetadata = (projectData.gis_metadata as Record<string, unknown>) || {};

    // Check current parcel count and structure
    const parcelStats = await sql`
      SELECT
        COUNT(*) as total_parcels,
        COUNT(DISTINCT area_id) as areas,
        COUNT(DISTINCT phase_id) as phases
      FROM landscape.tbl_parcel
      WHERE project_id = ${projectId}
    `;

    const stats = parcelStats[0];

    return NextResponse.json({
      project_id: projectId,
      project_name: projectData.project_name,
      structure_type: gisMetadata.structure_type || null,
      chosen_at: gisMetadata.chosen_at || null,
      metadata: gisMetadata,
      current_stats: {
        total_parcels: parseInt(stats.total_parcels),
        areas: parseInt(stats.areas),
        phases: parseInt(stats.phases)
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to get project structure:', error);

    return NextResponse.json({
      error: 'Failed to retrieve project structure',
      details: message
    }, { status: 500 });
  }
}
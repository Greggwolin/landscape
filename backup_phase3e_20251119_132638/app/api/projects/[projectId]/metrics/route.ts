// API: Project Metrics - GET project-level metrics and KPIs
import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  request: Request,
  context: Params
) {
  try {
    const projectId = parseInt((await context.params).projectId);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Get project summary metrics
    const [project] = await sql`
      SELECT
        project_id,
        project_name,
        project_type,
        development_type,
        acres_gross,
        target_units,
        is_active,
        created_at,
        updated_at,
        location_description,
        jurisdiction_city,
        jurisdiction_county,
        jurisdiction_state
      FROM landscape.tbl_project
      WHERE project_id = ${projectId}
    `;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get parcel counts and breakdown
    const parcelMetrics = await sql`
      SELECT
        COUNT(*) as total_parcels,
        SUM(COALESCE(acres_gross, 0))::float as total_acres,
        SUM(COALESCE(units_total, 0))::float as total_units,
        COUNT(DISTINCT type_code) as land_use_types
      FROM landscape.tbl_parcel
      WHERE project_id = ${projectId}
    `;

    // Get budget summary if available
    const budgetMetrics = await sql`
      SELECT
        COUNT(DISTINCT b.budget_id) as budget_count,
        SUM(COALESCE(f.amount, 0))::float as total_budget_amount
      FROM landscape.core_fin_budget_version b
      LEFT JOIN landscape.core_fin_fact_budget f ON f.budget_id = b.budget_id
      WHERE b.project_id = ${projectId}
      AND b.status = 'active'
    `;

    // Get container count
    const containerMetrics = await sql`
      SELECT
        COUNT(*) as total_containers,
        COUNT(*) FILTER (WHERE container_level = 1) as areas,
        COUNT(*) FILTER (WHERE container_level = 2) as phases,
        COUNT(*) FILTER (WHERE container_level = 3) as parcels
      FROM landscape.tbl_container
      WHERE project_id = ${projectId}
    `;

    const metrics = {
      project: {
        project_id: project.project_id,
        project_name: project.project_name,
        project_type: project.project_type,
        development_type: project.development_type,
        is_active: project.is_active,
        acres_gross: Number(project.acres_gross) || 0,
        target_units: Number(project.target_units) || 0,
        location_description: project.location_description,
        jurisdiction_city: project.jurisdiction_city,
        jurisdiction_county: project.jurisdiction_county,
        jurisdiction_state: project.jurisdiction_state,
        created_at: project.created_at,
        updated_at: project.updated_at
      },
      parcels: {
        total_parcels: Number(parcelMetrics[0]?.total_parcels) || 0,
        total_acres: Number(parcelMetrics[0]?.total_acres) || 0,
        total_units: Number(parcelMetrics[0]?.total_units) || 0,
        land_use_types: Number(parcelMetrics[0]?.land_use_types) || 0
      },
      budget: {
        budget_count: Number(budgetMetrics[0]?.budget_count) || 0,
        total_budget_amount: Number(budgetMetrics[0]?.total_budget_amount) || 0
      },
      containers: {
        total_containers: Number(containerMetrics[0]?.total_containers) || 0,
        areas: Number(containerMetrics[0]?.areas) || 0,
        phases: Number(containerMetrics[0]?.phases) || 0,
        parcels: Number(containerMetrics[0]?.parcels) || 0
      }
    };

    return NextResponse.json(metrics);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Project metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project metrics', details: message },
      { status: 500 }
    );
  }
}

import { NextResponse, NextRequest } from 'next/server';
import { sql } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = Number(searchParams.get('project_id'));

    if (!projectId || isNaN(projectId)) {
      return NextResponse.json({
        error: 'Valid project_id parameter required'
      }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        a.area_id,
        a.project_id,
        a.area_no,
        a.area_name,
        a.label,
        a.description,
        COALESCE(COUNT(DISTINCT ph.phase_id), 0) AS phase_count,
        COALESCE(COUNT(DISTINCT p.parcel_id), 0) AS parcel_count,
        COALESCE(SUM(p.units_total), 0) AS total_units,
        COALESCE(SUM(CAST(p.acres_gross AS FLOAT)), 0) AS total_acres
      FROM landscape.tbl_area a
      LEFT JOIN landscape.tbl_phase ph ON ph.area_id = a.area_id
      LEFT JOIN landscape.tbl_parcel p ON p.area_id = a.area_id
      WHERE a.project_id = ${projectId}
      GROUP BY a.area_id, a.project_id, a.area_no, a.area_name, a.label, a.description
      ORDER BY a.area_no;
    `;

    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Database error (areas):', error);
    return NextResponse.json({
      error: 'Failed to fetch areas',
      details: message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, area_name, label, description } = body;

    if (!project_id) {
      return NextResponse.json({
        error: 'project_id is required'
      }, { status: 400 });
    }

    // Find the next area number for this project
    const areaResult = await sql`
      SELECT COALESCE(MAX(area_no), 0) + 1 as next_area_no
      FROM landscape.tbl_area
      WHERE project_id = ${project_id}
    `;

    const area_no = areaResult[0].next_area_no;
    const finalAreaName = area_name || `Area ${area_no}`;

    // Insert the new area
    const insertResult = await sql`
      INSERT INTO landscape.tbl_area (project_id, area_no, area_name, label, description)
      VALUES (${project_id}, ${area_no}, ${finalAreaName}, ${label || null}, ${description || null})
      RETURNING area_id, area_no, area_name, label, description
    `;

    return NextResponse.json({
      area_id: insertResult[0].area_id,
      area_no: insertResult[0].area_no,
      area_name: insertResult[0].area_name,
      label: insertResult[0].label,
      description: insertResult[0].description
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Database error (create area):', error);
    return NextResponse.json({
      error: 'Failed to create area',
      details: message
    }, { status: 500 });
  }
}

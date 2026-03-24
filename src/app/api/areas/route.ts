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
        a.area_alias AS area_name,
        COALESCE(COUNT(DISTINCT ph.phase_id), 0) AS phase_count,
        COALESCE(COUNT(DISTINCT p.parcel_id), 0) AS parcel_count,
        COALESCE(SUM(p.units_total), 0) AS total_units,
        COALESCE(SUM(CAST(p.acres_gross AS FLOAT)), 0) AS total_acres
      FROM landscape.tbl_area a
      LEFT JOIN landscape.tbl_phase ph ON ph.area_id = a.area_id
      LEFT JOIN landscape.tbl_parcel p ON p.area_id = a.area_id
      WHERE a.project_id = ${projectId}
      GROUP BY a.area_id, a.project_id, a.area_no, a.area_alias
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
    const { project_id, area_name } = body;

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
    const finalAreaAlias = area_name || `Area ${area_no}`;

    // Insert the new area
    const insertResult = await sql`
      INSERT INTO landscape.tbl_area (project_id, area_no, area_alias)
      VALUES (${project_id}, ${area_no}, ${finalAreaAlias})
      RETURNING area_id, area_no, area_alias AS area_name
    `;

    return NextResponse.json({
      area_id: insertResult[0].area_id,
      area_no: insertResult[0].area_no,
      area_name: insertResult[0].area_name
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const areaId = Number(searchParams.get('area_id'));

    if (!areaId || isNaN(areaId)) {
      return NextResponse.json({ error: 'Valid area_id parameter required' }, { status: 400 });
    }

    // Orphan children: set area_id = NULL on phases and parcels so they remain but lose the L1 association
    await sql`UPDATE landscape.tbl_parcel SET area_id = NULL WHERE area_id = ${areaId}`;
    await sql`UPDATE landscape.tbl_phase SET area_id = NULL WHERE area_id = ${areaId}`;

    // Now delete the area itself
    await sql`DELETE FROM landscape.tbl_area WHERE area_id = ${areaId}`;

    return NextResponse.json({ success: true, deleted_area_id: areaId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Database error (delete area):', error);
    return NextResponse.json({ error: 'Failed to delete area', details: message }, { status: 500 });
  }
}

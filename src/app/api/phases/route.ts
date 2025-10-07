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
        p.project_id,
        p.phase_id,
        p.area_id,
        a.area_no,
        p.phase_no,
        CONCAT(a.area_no::text, '.', p.phase_no::text) AS phase_name,
        CONCAT(a.area_no::text, '.', p.phase_no::text) AS phase_code,
        COALESCE(SUM(par.units_total), 0) AS units_total,
        COALESCE(SUM(CAST(par.acres_gross AS FLOAT)), 0) AS gross_acres,
        0 AS net_acres,
        NULL AS start_date,
        'Active' AS status,
        p.description,
        p.label
      FROM landscape.tbl_phase p
      JOIN landscape.tbl_area a ON a.area_id = p.area_id
      LEFT JOIN landscape.tbl_parcel par ON par.phase_id = p.phase_id
      WHERE p.project_id = ${projectId}
      GROUP BY p.project_id, p.phase_id, p.area_id, a.area_no, p.phase_no, p.description, p.label
      ORDER BY a.area_no, p.phase_no;
    `;

    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Database error (phases):', error);
    return NextResponse.json({
      error: 'Failed to fetch phases',
      details: message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, area_no } = body;

    if (!project_id || !area_no) {
      return NextResponse.json({
        error: 'project_id and area_no are required'
      }, { status: 400 });
    }

    // Find the area_id for this area_no
    const areaResult = await sql`
      SELECT area_id FROM landscape.tbl_area
      WHERE area_no = ${area_no} AND project_id = ${project_id}
      LIMIT 1
    `;

    if (areaResult.length === 0) {
      return NextResponse.json({
        error: 'Area not found'
      }, { status: 404 });
    }

    const area_id = areaResult[0].area_id;

    // Find the next phase number for this area
    const phaseResult = await sql`
      SELECT COALESCE(MAX(phase_no), 0) + 1 as next_phase_no
      FROM landscape.tbl_phase
      WHERE area_id = ${area_id}
    `;

    const phase_no = phaseResult[0].next_phase_no;
    const phase_name = `${area_no}.${phase_no}`;

    // Insert the new phase
    const insertResult = await sql`
      INSERT INTO landscape.tbl_phase (project_id, area_id, phase_no, phase_name)
      VALUES (${project_id}, ${area_id}, ${phase_no}, ${phase_name})
      RETURNING phase_id, phase_no, phase_name
    `;

    return NextResponse.json({
      phase_id: insertResult[0].phase_id,
      phase_no: insertResult[0].phase_no,
      phase_name: insertResult[0].phase_name,
      area_no
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Database error (create phase):', error);
    return NextResponse.json({
      error: 'Failed to create phase',
      details: message
    }, { status: 500 });
  }
}
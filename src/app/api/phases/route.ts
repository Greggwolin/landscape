import { NextResponse } from 'next/server';
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
        CONCAT(a.area_no::text, '.', p.phase_no::text) AS description
      FROM landscape.tbl_phase p
      JOIN landscape.tbl_area a ON a.area_id = p.area_id
      LEFT JOIN landscape.tbl_parcel par ON par.phase_id = p.phase_id
      WHERE p.project_id = ${projectId}
      GROUP BY p.project_id, p.phase_id, p.area_id, a.area_no, p.phase_no
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
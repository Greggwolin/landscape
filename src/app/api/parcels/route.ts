// app/api/parcels/route.ts
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
    
    const result = await sql`
      SELECT
        p.parcel_id,
        p.project_id,
        p.area_id,
        p.phase_id,
        a.area_no AS area_no,
        ph.phase_no AS phase_no,
        CONCAT(a.area_no::text, '.', ph.phase_no::text) AS phase_name,
        CONCAT(
          a.area_no::text,
          '.',
          ph.phase_no::text,
          LPAD(
            ROW_NUMBER() OVER (PARTITION BY a.area_no, ph.phase_no ORDER BY p.parcel_id)::text,
            2,
            '0'
          )
        ) AS parcel_name,
        COALESCE(p.landuse_code, '') as usecode,
        COALESCE(CAST(p.acres_gross AS FLOAT), 0) as acres,
        COALESCE(p.lot_product, '') as product,
        COALESCE(p.units_total, 0) as units,
        COALESCE(CAST(p.plan_efficiency AS FLOAT), 0) as efficiency,
        COALESCE(CAST(p.lots_frontfeet AS FLOAT), 0) as frontfeet,
        COALESCE(f.name, '') as family_name,
        COALESCE(st.name, '') as subtype_name,
        COALESCE(lu.name, p.landuse_code) as landuse_name
      FROM landscape.tbl_parcel p
      JOIN landscape.tbl_area a ON a.area_id = p.area_id
      JOIN landscape.tbl_phase ph ON ph.phase_id = p.phase_id
      LEFT JOIN landscape.tbl_landuse lu ON lu.landuse_code = p.landuse_code
      LEFT JOIN landscape.lu_subtype st ON st.subtype_id = lu.subtype_id
      LEFT JOIN landscape.lu_family f ON f.family_id = st.family_id
      WHERE p.project_id = ${projectId}
      ORDER BY a.area_no, ph.phase_no, p.parcel_id;
    `;

    return NextResponse.json(result || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Parcels API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch parcels',
      details: message 
    }, { status: 500 });
  }
}
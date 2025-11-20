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
        CASE
          WHEN a.area_no IS NOT NULL AND ph.phase_no IS NOT NULL
          THEN CONCAT(a.area_no::text, '.', ph.phase_no::text)
          ELSE COALESCE(p.parcel_code, 'Unassigned')
        END AS phase_name,
        CASE
          WHEN a.area_no IS NOT NULL AND ph.phase_no IS NOT NULL
          THEN CONCAT(
            a.area_no::text,
            '.',
            ph.phase_no::text,
            '.',
            LPAD(
              ROW_NUMBER() OVER (PARTITION BY a.area_no, ph.phase_no ORDER BY p.parcel_id)::text,
              2,
              '0'
            )
          )
          ELSE COALESCE(p.parcel_code, CONCAT('Parcel-', p.parcel_id::text))
        END AS parcel_name,
        COALESCE(p.landuse_code, '') as usecode,
        COALESCE(CAST(p.acres_gross AS FLOAT), 0) as acres,
        COALESCE(p.lot_product, '') as product,
        COALESCE(p.units_total, 0) as units,
        COALESCE(CAST(p.plan_efficiency AS FLOAT), 0) as efficiency,
        COALESCE(CAST(p.lots_frontfeet AS FLOAT), 0) as frontfeet,
        COALESCE(CAST(p.lot_width AS FLOAT), 0) as lot_width,
        COALESCE(p.family_name, '') as family_name,
        COALESCE(p.density_code, '') as density_code,
        COALESCE(p.type_code, '') as type_code,
        COALESCE(p.product_code, '') as product_code,
        COALESCE('', '') as subtype_name,
        COALESCE(lu.name, p.landuse_code) as landuse_name
      FROM landscape.tbl_parcel p
      LEFT JOIN landscape.tbl_area a ON a.area_id = p.area_id
      LEFT JOIN landscape.tbl_phase ph ON ph.phase_id = p.phase_id
      LEFT JOIN landscape.tbl_landuse lu ON lu.landuse_code = p.landuse_code
      WHERE p.project_id = ${projectId}
      ORDER BY
        CASE WHEN a.area_no IS NULL THEN 999999 ELSE a.area_no END,
        CASE WHEN ph.phase_no IS NULL THEN 999999 ELSE ph.phase_no END,
        p.parcel_id;
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      project_id,
      area_id,
      phase_id,
      landuse_code,
      acres_gross,
      units_total,
      lot_product,
      plan_efficiency,
      lots_frontfeet,
      description,
      notes,
      // New taxonomy fields
      family_name,
      density_code,
      type_code,
      product_code,
      // New non-residential fields
      building_sf,
      site_coverage_pct,
      setback_front_ft,
      setback_side_ft,
      setback_rear_ft
    } = body;

    // Validate required fields
    if (!project_id || !area_id || !phase_id) {
      return NextResponse.json({
        error: 'Missing required fields: project_id, area_id, phase_id'
      }, { status: 400 });
    }

    // Insert the new parcel with taxonomy fields (building_sf and setback fields not yet available)
    const result = await sql`
      INSERT INTO landscape.tbl_parcel (
        project_id,
        area_id,
        phase_id,
        landuse_code,
        acres_gross,
        units_total,
        lot_product,
        plan_efficiency,
        lots_frontfeet,
        family_name,
        density_code,
        type_code,
        product_code
      ) VALUES (
        ${project_id},
        ${area_id},
        ${phase_id},
        ${landuse_code || null},
        ${acres_gross || null},
        ${units_total || null},
        ${lot_product || null},
        ${plan_efficiency || null},
        ${lots_frontfeet || null},
        ${family_name || null},
        ${density_code || null},
        ${type_code || null},
        ${product_code || null}
      )
      RETURNING parcel_id;
    `;

    const newParcel = result[0];

    // Return the newly created parcel with full details
    const fullParcel = await sql`
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
        COALESCE(p.family_name, '') as family_name,
        COALESCE(p.density_code, '') as density_code,
        COALESCE(p.type_code, '') as type_code,
        COALESCE(p.product_code, '') as product_code,
        COALESCE(lu.name, p.landuse_code) as landuse_name
      FROM landscape.tbl_parcel p
      JOIN landscape.tbl_area a ON a.area_id = p.area_id
      JOIN landscape.tbl_phase ph ON ph.phase_id = p.phase_id
      LEFT JOIN landscape.tbl_landuse lu ON lu.landuse_code = p.landuse_code
      WHERE p.parcel_id = ${newParcel.parcel_id};
    `;

    return NextResponse.json(fullParcel[0], { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Create parcel error:', error);

    if (message.includes('foreign key')) {
      return NextResponse.json({
        error: 'Invalid project_id, area_id, or phase_id'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to create parcel',
      details: message
    }, { status: 500 });
  }
}
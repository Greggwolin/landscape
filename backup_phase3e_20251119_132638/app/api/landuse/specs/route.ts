import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Get development specifications for land use subtypes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subtypeId = searchParams.get('subtype_id');
    const familyId = searchParams.get('family_id');

    let resSpecs = [];
    let comSpecs = [];

    // Get residential specifications
    try {
      if (subtypeId) {
        resSpecs = await sql`
          SELECT 
            res_spec_id,
            subtype_id,
            dua_min,
            dua_max,
            lot_w_min_ft,
            lot_d_min_ft,
            lot_area_min_sf,
            sb_front_ft,
            sb_side_ft,
            sb_corner_ft,
            sb_rear_ft,
            hgt_max_ft,
            cov_max_pct,
            os_min_pct,
            pk_per_unit,
            notes,
            eff_date,
            doc_id
          FROM landscape.lu_res_spec 
          WHERE subtype_id = ${subtypeId}
          ORDER BY eff_date DESC
        `;
      } else if (familyId) {
        resSpecs = await sql`
          SELECT 
            r.res_spec_id,
            r.subtype_id,
            s.name as subtype_name,
            s.code as subtype_code,
            r.dua_min,
            r.dua_max,
            r.lot_w_min_ft,
            r.lot_d_min_ft,
            r.lot_area_min_sf,
            r.sb_front_ft,
            r.sb_side_ft,
            r.sb_corner_ft,
            r.sb_rear_ft,
            r.hgt_max_ft,
            r.cov_max_pct,
            r.os_min_pct,
            r.pk_per_unit,
            r.notes,
            r.eff_date,
            r.doc_id
          FROM landscape.lu_res_spec r
          JOIN landscape.lu_subtype s ON s.subtype_id = r.subtype_id
          WHERE s.family_id = ${familyId} AND s.active = true
          ORDER BY s.ord, r.eff_date DESC
        `;
      } else {
        resSpecs = await sql`
          SELECT 
            r.res_spec_id,
            r.subtype_id,
            s.name as subtype_name,
            s.code as subtype_code,
            f.name as family_name,
            r.dua_min,
            r.dua_max,
            r.lot_w_min_ft,
            r.lot_d_min_ft,
            r.lot_area_min_sf,
            r.sb_front_ft,
            r.sb_side_ft,
            r.sb_corner_ft,
            r.sb_rear_ft,
            r.hgt_max_ft,
            r.cov_max_pct,
            r.os_min_pct,
            r.pk_per_unit,
            r.notes,
            r.eff_date,
            r.doc_id
          FROM landscape.lu_res_spec r
          JOIN landscape.lu_subtype s ON s.subtype_id = r.subtype_id
          JOIN landscape.lu_family f ON f.family_id = s.family_id
          WHERE s.active = true AND f.active = true
          ORDER BY f.name, s.ord, r.eff_date DESC
        `;
      }
    } catch (error) {
      console.warn('Error fetching residential specs:', error);
    }

    // Get commercial specifications
    try {
      if (subtypeId) {
        comSpecs = await sql`
          SELECT 
            com_spec_id,
            subtype_id,
            far_min,
            far_max,
            cov_max_pct,
            pk_per_ksf,
            hgt_max_ft,
            sb_front_ft,
            sb_side_ft,
            sb_corner_ft,
            sb_rear_ft,
            os_min_pct,
            notes,
            eff_date,
            doc_id
          FROM landscape.lu_com_spec 
          WHERE subtype_id = ${subtypeId}
          ORDER BY eff_date DESC
        `;
      } else if (familyId) {
        comSpecs = await sql`
          SELECT 
            c.com_spec_id,
            c.subtype_id,
            s.name as subtype_name,
            s.code as subtype_code,
            c.far_min,
            c.far_max,
            c.cov_max_pct,
            c.pk_per_ksf,
            c.hgt_max_ft,
            c.sb_front_ft,
            c.sb_side_ft,
            c.sb_corner_ft,
            c.sb_rear_ft,
            c.os_min_pct,
            c.notes,
            c.eff_date,
            c.doc_id
          FROM landscape.lu_com_spec c
          JOIN landscape.lu_subtype s ON s.subtype_id = c.subtype_id
          WHERE s.family_id = ${familyId} AND s.active = true
          ORDER BY s.ord, c.eff_date DESC
        `;
      } else {
        comSpecs = await sql`
          SELECT 
            c.com_spec_id,
            c.subtype_id,
            s.name as subtype_name,
            s.code as subtype_code,
            f.name as family_name,
            c.far_min,
            c.far_max,
            c.cov_max_pct,
            c.pk_per_ksf,
            c.hgt_max_ft,
            c.sb_front_ft,
            c.sb_side_ft,
            c.sb_corner_ft,
            c.sb_rear_ft,
            c.os_min_pct,
            c.notes,
            c.eff_date,
            c.doc_id
          FROM landscape.lu_com_spec c
          JOIN landscape.lu_subtype s ON s.subtype_id = c.subtype_id
          JOIN landscape.lu_family f ON f.family_id = s.family_id
          WHERE s.active = true AND f.active = true
          ORDER BY f.name, s.ord, c.eff_date DESC
        `;
      }
    } catch (error) {
      console.warn('Error fetching commercial specs:', error);
    }

    return NextResponse.json({
      residential: resSpecs,
      commercial: comSpecs,
      total: resSpecs.length + comSpecs.length
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching development specs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch development specifications', details: msg },
      { status: 500 }
    );
  }
}
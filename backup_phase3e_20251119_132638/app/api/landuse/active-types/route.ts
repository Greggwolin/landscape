// app/api/landuse/active-types/route.ts
// API endpoint for land use types that are actively used in parcels

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({
        error: 'project_id parameter required'
      }, { status: 400 });
    }

    // Get land use types that are actively used in parcels
    try {
      // First get the unique type codes from parcels with counts
      const parcelTypes = await sql`
        SELECT
          type_code,
          family_name,
          COUNT(*) as parcel_count,
          SUM(COALESCE(acres_gross, 0))::float AS total_acres,
          SUM(COALESCE(units_total, 0))::float AS total_units
        FROM landscape.tbl_parcel
        WHERE project_id = ${projectId}
        AND type_code IS NOT NULL
        AND type_code != ''
        GROUP BY type_code, family_name
        ORDER BY COUNT(*) DESC, family_name, type_code
      `;

      // Code mapping for better descriptions
      const codeMapping: Record<string, string> = {
        'SFD': 'Single Family Detached',
        'SFA': 'Single Family Attached',
        'MF': 'Multi-Family',
        'TH': 'Townhomes',
        'CONDO': 'Condominiums',
        'APT': 'Apartments',
        'RET': 'Retail',
        'RETAIL': 'Retail',
        'MFG': 'Manufacturing',
        'WHS': 'Warehouse',
        'OFFICE': 'Office',
        'HOTEL': 'Hotel',
        'MU': 'Mixed Use',
        'PARK': 'Parks',
        'OS': 'Open Space'
      };

      // Family mapping for land use codes
      const familyMapping: Record<string, string> = {
        'SFD': 'Residential',
        'SFA': 'Residential',
        'MF': 'Residential',
        'TH': 'Residential',
        'CONDO': 'Residential',
        'APT': 'Residential',
        'RET': 'Commercial',
        'RETAIL': 'Commercial',
        'OFFICE': 'Commercial',
        'HOTEL': 'Commercial',
        'MFG': 'Industrial',
        'WHS': 'Industrial',
        'MU': 'Mixed Use',
        'PARK': 'Open Space',
        'OS': 'Open Space'
      };

      // Then for each type, try to find the proper name in lu_subtype or use mapping
      const activeTypes = [];
      for (const parcel of parcelTypes) {
        // Try to find matching subtype
        const subtype = await sql`
          SELECT lst.name, lf.name as family_name
          FROM landscape.lu_subtype lst
          LEFT JOIN landscape.lu_family lf ON lf.family_id = lst.family_id
          WHERE lst.code = ${parcel.type_code}
          AND lst.active = true
          LIMIT 1
        `;

        // Use lu_subtype name, then mapping, then fallback to code
        const displayName = subtype[0]?.name || codeMapping[parcel.type_code] || parcel.type_code;

        // Use lu_subtype family, then parcel family, then family mapping, then fallback to 'Unknown'
        const familyName = subtype[0]?.family_name || parcel.family_name || familyMapping[parcel.type_code] || 'Unknown';

        activeTypes.push({
          code: parcel.type_code,
          name: displayName,
          family_name: familyName,
          parcel_count: parcel.parcel_count,
          total_acres: Number(parcel.total_acres) || 0,
          total_units: Number(parcel.total_units) || 0
        });
      }

      return NextResponse.json(activeTypes);
    } catch (dbError) {
      console.warn('Failed to fetch active types from database:', dbError);
      return NextResponse.json([]);
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Active land use types API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch active land use types',
      details: message
    }, { status: 500 });
  }
}

// app/api/landuse/types/[familyId]/route.ts
// API endpoint for land use types filtered by family

import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

export async function GET(
  request: Request,
  { params }: { params: { familyId: string } }
) {
  try {
    const { familyId: familyIdStr } = await params;
    const familyId = parseInt(familyIdStr);

    if (!familyId || isNaN(familyId)) {
      return NextResponse.json({
        error: 'Valid family_id parameter required'
      }, { status: 400 });
    }

    // First try to fetch from database (using lu_type as authoritative source)
    try {
      const types = await sql`
        SELECT
          type_id,
          code as type_code,
          code,
          name as type_name,
          name,
          COALESCE(ord, 1) as type_order,
          active as type_active,
          family_id
        FROM landscape.lu_type
        WHERE family_id = ${familyId}
        AND active = true
        ORDER BY COALESCE(ord, type_id)
      `;

      if (types && types.length > 0) {
        return NextResponse.json(types);
      }
    } catch (dbError) {
      console.warn('Failed to fetch types from database, falling back to defaults:', dbError);
    }

    // Fallback to hardcoded types if database query fails
    const defaultTypes = [
      // Residential types (family_id: 1)
      { type_id: 1, code: 'SFD', type_code: 'SFD', name: 'Single Family Detached', type_name: 'Single Family Detached', type_order: 1, type_active: true, family_id: 1 },
      { type_id: 2, code: 'SFA', type_code: 'SFA', name: 'Single Family Attached', type_name: 'Single Family Attached', type_order: 2, type_active: true, family_id: 1 },
      { type_id: 3, code: 'TH', type_code: 'TH', name: 'Townhomes', type_name: 'Townhomes', type_order: 3, type_active: true, family_id: 1 },
      { type_id: 4, code: 'CONDO', type_code: 'CONDO', name: 'Condominiums', type_name: 'Condominiums', type_order: 4, type_active: true, family_id: 1 },
      { type_id: 5, code: 'APT', type_code: 'APT', name: 'Apartments', type_name: 'Apartments', type_order: 5, type_active: true, family_id: 1 },

      // Commercial types (family_id: 2)
      { type_id: 6, code: 'RETAIL', type_code: 'RETAIL', name: 'Retail', type_name: 'Retail', type_order: 1, type_active: true, family_id: 2 },
      { type_id: 7, code: 'OFFICE', type_code: 'OFFICE', name: 'Office', type_name: 'Office', type_order: 2, type_active: true, family_id: 2 },
      { type_id: 8, code: 'HOTEL', type_code: 'HOTEL', name: 'Hotel', type_name: 'Hotel', type_order: 3, type_active: true, family_id: 2 },

      // Mixed Use types (family_id: 9)
      { type_id: 9, code: 'MU-LOW', type_code: 'MU-LOW', name: 'Mixed Use Low Intensity', type_name: 'Mixed Use Low Intensity', type_order: 1, type_active: true, family_id: 9 },
      { type_id: 10, code: 'MU-HIGH', type_code: 'MU-HIGH', name: 'Mixed Use High Intensity', type_name: 'Mixed Use High Intensity', type_order: 2, type_active: true, family_id: 9 },

      // Open Space types (family_id: 10)
      { type_id: 11, code: 'PARK', type_code: 'PARK', name: 'Parks', type_name: 'Parks', type_order: 1, type_active: true, family_id: 10 },
      { type_id: 12, code: 'TRAIL', type_code: 'TRAIL', name: 'Trails', type_name: 'Trails', type_order: 2, type_active: true, family_id: 10 }
    ];

    const filteredTypes = defaultTypes.filter(type => type.family_id === familyId);

    return NextResponse.json(filteredTypes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Land use types API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch land use types',
      details: message
    }, { status: 500 });
  }
}